// 별빛 운영본부 API — /api/admin/hq/*
//
// admin.js 디스패처가 authorizeAdminRequest 를 통과시킨 뒤에만 들어온다(비GET 은 감사 로그가 남는다).
// 🔴 요청 본문의 XP·금액·레벨은 어디서도 받지 않는다. 화면이 보내는 것은 "무엇을 했는가"(상태·증빙)뿐이고
//    점수는 서버가 원천에서 다시 계산한다.
// 🔴 Threads 는 상태를 읽기만 한다 — /sns-daily-post/run 을 부르는 경로가 없다.
// admin.js 는 이미 5천 줄이라 admin-orders.js 선례대로 별도 모듈로 둔다.

import { createHttpError, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { openOpsCollections } from "../ops-hq/db.js";
import { addDaysKey, kstDateKey, kstDateTime, weekStartKey } from "../ops-hq/time.js";
import { describeLevel, LEVEL_TITLES, levelStartXp, RANK_TIERS, xpToNextLevel } from "../ops-hq/levels.js";
import {
  acknowledgeLevel,
  allocateTaskXp,
  listLedger,
  MASTERY_LABELS,
  readBucketTotal,
  readXpState,
  recomputeXpState,
  syncTaskXp,
  XP_RULES,
} from "../ops-hq/xp.js";
import {
  addEvidence,
  CHANNELS,
  createCustomQuest,
  EVIDENCE_TYPES,
  presentQuest,
  QUEST_KINDS,
  setQuestTarget,
  SOURCE_STATUS_LABELS,
  STAGE_LABELS,
  STATUS_LABELS,
  suggestWorkBundles,
  syncPlanQuests,
  transitionQuest,
} from "../ops-hq/quests.js";
import { readThreadsStatus } from "../ops-hq/threads-status.js";
import {
  EXCLUDE_REASON_LABELS,
  HOLD_REASON_LABELS,
  previewRevenueBackfill,
  REVENUE_BUCKET,
  revenueSummary,
  syncRevenueFacts,
} from "../ops-hq/revenue-facts.js";
import { readTraffic } from "../ops-hq/traffic.js";
import { ga4Readiness } from "../ops-hq/ga4-connector.js";
import { readAchievements } from "../ops-hq/achievements.js";
import { buildSuggestions } from "../ops-hq/suggestions.js";
import { readSettings, setRevenueSince, updateSettings } from "../ops-hq/settings.js";
import { CAMPAIGN_PLAN, readConnections, runOpsHqSync } from "../ops-hq/sync.js";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const OBJECT_ID = /^[a-f0-9]{24}$/i;
const QUEST_ID = /^q_[a-f0-9]{24}$/;
const OPEN = new Set(["scheduled", "in_progress", "review"]);
const MAX_RANGE_DAYS = 120;

export const GA4_SETUP_STEPS = Object.freeze([
  "Google Cloud 에서 서비스 계정을 만들고 JSON 키를 내려받습니다(Analytics Data API 사용 설정).",
  "GA4 관리 → 속성 액세스 관리에서 그 서비스 계정 이메일을 '뷰어'로 추가합니다.",
  "GA4 관리 → 속성 세부정보의 보고 시간대가 '대한민국 시간'인지 확인합니다(KST 날짜와 맞추기 위해).",
  "GA4 관리 → 데이터 필터에서 내부 트래픽 필터를 '활성'으로 둡니다(운영자 방문 제외).",
  "worker 폴더에서 `npx wrangler secret put GA4_SERVICE_ACCOUNT_JSON` · `npx wrangler secret put GA4_PROPERTY_ID` 를 스테이징·프로덕션 환경별로 등록합니다([vars] 가 아니라 secret 입니다).",
  "연결 상태 화면에서 '재집계'를 누르면 첫 집계가 돌고, 이후 6시간마다 최근 3일을 다시 가져옵니다.",
]);

function actorOf(adminContext) {
  return `admin:${String(adminContext?.userId || "unknown").slice(0, 80)}`;
}

function cleanDate(value) {
  const text = String(value || "").trim();
  return DATE_KEY.test(text) ? text : null;
}

function daysBetween(fromDate, toDate) {
  return Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86_400_000) + 1;
}

/** range=today|7d|28d|week|campaign 또는 from/to. 이전 기간(같은 길이)도 함께 낸다. */
export function resolveRange(url, now = new Date()) {
  const today = kstDateKey(now);
  const range = url.searchParams.get("range") || "7d";
  let fromDate = cleanDate(url.searchParams.get("from"));
  let toDate = cleanDate(url.searchParams.get("to"));
  let label;
  if (fromDate && toDate) {
    if (fromDate > toDate) throw createHttpError(400, "기간의 시작이 끝보다 늦습니다.", { code: "RANGE_INVALID" });
    if (daysBetween(fromDate, toDate) > MAX_RANGE_DAYS) throw createHttpError(400, `기간은 최대 ${MAX_RANGE_DAYS}일입니다.`, { code: "RANGE_TOO_LONG" });
    label = `${fromDate} ~ ${toDate}`;
  } else if (range === "today") {
    fromDate = today; toDate = today; label = "오늘";
  } else if (range === "28d") {
    fromDate = addDaysKey(today, -27); toDate = today; label = "최근 28일";
  } else if (range === "week") {
    fromDate = weekStartKey(today); toDate = today; label = "이번 주";
  } else if (range === "campaign") {
    fromDate = CAMPAIGN_PLAN.period.start; toDate = CAMPAIGN_PLAN.period.end; label = "4주 캠페인";
  } else {
    fromDate = addDaysKey(today, -6); toDate = today; label = "최근 7일";
  }
  const length = daysBetween(fromDate, toDate);
  return { range, label, fromDate, toDate, prevFrom: addDaysKey(fromDate, -length), prevTo: addDaysKey(fromDate, -1), today, timeZone: "Asia/Seoul" };
}

async function loadPresentedQuests(cols, now, filter = {}) {
  const [quests, done] = await Promise.all([
    cols.quests.find({ status: { $ne: "archived" }, ...filter }).limit(1500).toArray(),
    cols.quests.find({ xpVerifiedAt: { $ne: null }, $or: [{ status: "done" }, { status: "archived", archivedFromStatus: "done" }] }, { projection: { kind: 1, xpVerifiedAt: 1 } }).toArray(),
  ]);
  const { perQuest } = allocateTaskXp(done);
  return { presented: quests.map((quest) => presentQuest(quest, now, perQuest)), perQuest };
}

function sortForToday(a, b) {
  return (Number(b.overdue) - Number(a.overdue))
    || String(a.dueAt || "").localeCompare(String(b.dueAt || ""))
    || a.id.localeCompare(b.id);
}

function questMeta() {
  return {
    statuses: STATUS_LABELS,
    stages: STAGE_LABELS,
    kinds: Object.fromEntries(Object.entries(QUEST_KINDS).map(([key, value]) => [key, { ...value, xp: XP_RULES.task[key] || 0 }])),
    channels: Object.fromEntries(Object.entries(CHANNELS).map(([key, value]) => [key, value.label])),
    evidenceTypes: EVIDENCE_TYPES,
    sourceStatuses: SOURCE_STATUS_LABELS,
    campaign: { id: CAMPAIGN_PLAN.campaignId, title: CAMPAIGN_PLAN.title, period: CAMPAIGN_PLAN.period, planVersion: CAMPAIGN_PLAN.planVersion },
  };
}

async function heldFactSummary(cols) {
  const rows = await cols.revenueFacts.find(
    { $or: [{ xpState: "held" }, { fulfillmentAlertCount: { $gt: 0 }, "delivery.state": { $ne: "delivered" } }] },
    { projection: { holdReason: 1, amountKRW: 1, xpState: 1, fulfillmentAlertCount: 1, delivery: 1 } },
  ).limit(1000).toArray();
  const held = {};
  let heldKRW = 0;
  let recoveryAlerts = 0;
  for (const row of rows) {
    if (row.xpState === "held") {
      held[row.holdReason] = (held[row.holdReason] || 0) + 1;
      heldKRW += Number(row.amountKRW) || 0;
    }
    if (row.fulfillmentAlertCount > 0 && row.delivery?.state !== "delivered") recoveryAlerts += 1;
  }
  return { held, heldKRW, recoveryAlerts };
}

async function readFunnel(env, fromDate, toDate) {
  const { CheckoutFunnelEvent } = await import("../lib/models.js");
  const { withMongoRetry } = await import("../lib/db.js");
  const rows = await withMongoRetry(env, () => CheckoutFunnelEvent.aggregate([
    { $match: { createdAt: { $gte: kstDateTime(fromDate, "00:00"), $lt: kstDateTime(addDaysKey(toDate, 1), "00:00") } } },
    { $group: { _id: "$name", count: { $sum: 1 } } },
  ]), { retries: 1 });
  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
}

async function handleSummary(request, env, cols) {
  const now = new Date();
  const url = new URL(request.url);
  const period = resolveRange(url, now);
  const [xp, settings, { presented }, revenue, previous, held, traffic, achievements, connections, ledger] = await Promise.all([
    readXpState(cols),
    readSettings(cols),
    loadPresentedQuests(cols, now),
    revenueSummary(cols, period),
    revenueSummary(cols, { fromDate: period.prevFrom, toDate: period.prevTo }),
    heldFactSummary(cols),
    readTraffic(env, cols, period),
    readAchievements(cols),
    readConnections(cols, { now }),
    cols.ledger.find({ occurredAt: { $gte: kstDateTime(period.fromDate, "00:00"), $lt: kstDateTime(addDaysKey(period.toDate, 1), "00:00") } }, { projection: { delta: 1, sourceType: 1, occurredAt: 1 } }).toArray(),
  ]);
  let threadsToday = null;
  let threadsError = null;
  try {
    threadsToday = (await readThreadsStatus(env, [period.today], { now }))[period.today] || null;
  } catch (error) {
    threadsError = String(error?.message || error).slice(0, 160);
  }
  let funnel = null;
  try { funnel = await readFunnel(env, period.fromDate, period.toDate); } catch { funnel = null; }

  const manual = presented.filter((quest) => quest.kind !== "auto_publish_check");
  const open = manual.filter((quest) => OPEN.has(quest.status));
  const todayQuests = open.filter((quest) => quest.overdue || quest.dueDate <= period.today).sort(sortForToday);
  const upcoming = open.filter((quest) => !quest.overdue && quest.dueDate > period.today && quest.dueDate <= addDaysKey(period.today, 3)).sort(sortForToday);
  const focus = [...todayQuests, ...upcoming].slice(0, 3);

  const trend = {};
  for (let date = period.fromDate; date <= period.toDate; date = addDaysKey(date, 1)) {
    trend[date] = { date, netKRW: revenue.byDate[date]?.netKRW || 0, orders: revenue.byDate[date]?.orders || 0, xp: 0, questsDone: 0, engagedSessions: null };
  }
  for (const row of ledger) {
    const date = kstDateKey(row.occurredAt);
    if (trend[date]) trend[date].xp += Number(row.delta) || 0;
  }
  for (const quest of manual) {
    const date = quest.xpVerifiedAt ? kstDateKey(quest.xpVerifiedAt) : null;
    if (quest.status === "done" && trend[date]) trend[date].questsDone += 1;
  }
  for (const row of traffic.rows) if (trend[row.date]) trend[row.date].engagedSessions = row.engagedSessions;

  const todayXp = ledger.filter((row) => kstDateKey(row.occurredAt) === period.today).reduce((sum, row) => sum + (Number(row.delta) || 0), 0);
  const campaignQuests = presented.filter((quest) => quest.campaignId === CAMPAIGN_PLAN.campaignId);
  const awaitingDelivery = (revenue.held.delivery_pending || 0) + (revenue.held.delivery_unknown || 0);
  const deliveryCounts = { orders: revenue.orders, awaitingDelivery, delivered: revenue.orders - awaitingDelivery, held: revenue.held };

  const revenueForSuggestions = { held: held.held, period: `${period.fromDate}~${period.toDate}` };
  const suggestions = buildSuggestions({
    today: period.today,
    revenue: revenueForSuggestions,
    quests: presented,
    threadsToday,
    traffic,
    syncStates: connections.map((row) => ({ _id: row.id, label: row.label, lastError: row.lastError, status: row.status })),
  });

  const alerts = [];
  const undelivered = (held.held.delivery_pending || 0) + (held.held.delivery_unknown || 0);
  if (undelivered) alerts.push({ id: "undelivered", tone: "err", label: "결제 후 미제공", count: undelivered, href: "/admin/orders/?queue=undelivered" });
  if (held.recoveryAlerts) alerts.push({ id: "recovery", tone: "err", label: "복구 대기(미제공 알림 발송됨)", count: held.recoveryAlerts, href: "/admin/orders/?queue=undelivered" });
  if (held.held.refund_unknown) alerts.push({ id: "refund_check", tone: "warn", label: "확인할 환불", count: held.held.refund_unknown, href: "/admin/orders/?queue=refund_check" });
  const broken = connections.filter((row) => row.status === "error");
  if (broken.length) alerts.push({ id: "sync_error", tone: "warn", label: "연동 장애", count: broken.length, href: "/admin/connections/" });
  if (threadsToday?.attention) alerts.push({ id: "threads", tone: "warn", label: "Threads 자동 발행 확인 필요", count: threadsToday.jobs.filter((job) => ["needs_check", "failed", "missed"].includes(job.state)).length, href: "/admin/quests/?channel=threads_existing_worker" });

  const lastSync = connections.map((row) => row.lastSuccessAt).filter(Boolean).sort().at(-1) || null;
  return json({
    ok: true,
    generatedAt: now,
    period,
    xp: { ...xp, todayXp },
    alerts,
    focus,
    upcoming: upcoming.slice(0, 6),
    bundles: suggestWorkBundles(manual, now),
    metrics: {
      revenue: { ...revenue, byDate: undefined },
      previous: { grossKRW: previous.grossKRW, refundedKRW: previous.refundedKRW, netKRW: previous.netKRW, orders: previous.orders },
      delivery: deliveryCounts,
      traffic: { status: traffic.status, statusLabel: traffic.statusLabel, engagedSessions: traffic.rows.length ? traffic.rows.reduce((sum, row) => sum + row.engagedSessions, 0) : null },
      funnel,
    },
    trend: Object.values(trend),
    campaign: {
      ...questMeta().campaign,
      total: campaignQuests.filter((quest) => quest.kind !== "auto_publish_check").length,
      done: campaignQuests.filter((quest) => quest.kind !== "auto_publish_check" && quest.status === "done").length,
      autoConfirmed: campaignQuests.filter((quest) => quest.kind === "auto_publish_check" && quest.status === "done").length,
      autoTotal: campaignQuests.filter((quest) => quest.kind === "auto_publish_check").length,
    },
    threadsToday,
    threadsError,
    recentXp: (await listLedger(cols, { limit: 8 })).map(presentLedgerRow),
    achievements,
    suggestions,
    goals: settings.goals,
    lastSync,
  });
}

function presentLedgerRow(row) {
  return {
    id: row._id,
    bucket: row.bucket,
    delta: row.delta,
    target: row.target,
    sourceType: row.sourceType,
    sourceLabel: { task: "퀘스트", revenue: "인정 매출", traffic: "유효 참여 세션" }[row.sourceType] || row.sourceType,
    mastery: row.mastery,
    masteryLabel: row.mastery ? MASTERY_LABELS[row.mastery] : null,
    sourceIds: (row.sourceIds || []).slice(0, 20),
    stage: row.stage,
    reason: row.reason,
    correction: row.delta < 0,
    ruleVersion: row.ruleVersion,
    occurredAt: row.occurredAt,
    processedAt: row.processedAt,
    actor: row.actor,
  };
}

async function handleQuestList(request, cols) {
  const now = new Date();
  const url = new URL(request.url);
  const filter = {};
  const from = cleanDate(url.searchParams.get("from"));
  const to = cleanDate(url.searchParams.get("to"));
  if (from || to) filter.plannedDate = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  for (const key of ["channel", "language", "kind", "campaignId"]) {
    const value = String(url.searchParams.get(key) || "").trim();
    if (value) filter[key] = value.slice(0, 60);
  }
  const { presented } = await loadPresentedQuests(cols, now, filter);
  const archived = url.searchParams.get("includeArchived") === "1"
    ? (await cols.quests.find({ status: "archived", ...filter }).limit(300).toArray()).map((quest) => presentQuest(quest, now))
    : [];
  const items = [...presented, ...archived].sort((a, b) => String(a.dueAt || "").localeCompare(String(b.dueAt || "")) || a.id.localeCompare(b.id));
  return json({ ok: true, items, bundles: suggestWorkBundles(presented, now), meta: questMeta(), today: kstDateKey(now) });
}

async function handleQuestDetail(questId, cols) {
  const now = new Date();
  const quest = await cols.quests.findOne({ _id: questId });
  if (!quest) throw createHttpError(404, "퀘스트를 찾을 수 없습니다.", { code: "QUEST_NOT_FOUND" });
  const [{ perQuest }, evidence, related] = await Promise.all([
    loadPresentedQuests(cols, now, { _id: questId }),
    cols.evidence.find({ questId }).sort({ createdAt: 1 }).limit(100).toArray(),
    cols.quests.find({ $or: [{ parentId: questId }, ...(quest.parentId ? [{ _id: quest.parentId }] : [])] }).limit(20).toArray(),
  ]);
  return json({
    ok: true,
    quest: presentQuest(quest, now, perQuest),
    evidence: evidence.map((row) => ({ id: row._id, type: row.type, label: row.label, verification: row.verification, verificationLabel: row.verification === "auto" ? "자동 확인" : "수동 확인", value: row.value, source: row.source, actor: row.actor, createdAt: row.createdAt })),
    history: quest.history || [],
    sourceHistory: quest.sourceHistory || [],
    automationStatus: quest.automationStatus || null,
    note: quest.note || null,
    owner: quest.owner || null,
    parent: related.filter((row) => row._id === quest.parentId).map((row) => presentQuest(row, now, perQuest))[0] || null,
    children: related.filter((row) => row.parentId === questId).map((row) => presentQuest(row, now, perQuest)),
    meta: questMeta(),
  });
}

async function refreshTaskXp(cols, actor, now) {
  await syncTaskXp(cols, { now, actor, reason: "quest_transition" });
  return recomputeXpState(cols, { now });
}

async function handleTransition(questId, request, cols, actor) {
  const now = new Date();
  const body = await readJson(request);
  const result = await transitionQuest(cols, { questId, to: body.to, expectedVersion: body.expectedVersion, reason: body.reason, actor, now });
  const xp = result.affectsXp ? await refreshTaskXp(cols, actor, now) : await readXpState(cols);
  const { perQuest } = await loadPresentedQuests(cols, now, { _id: questId });
  return json({ ok: true, changed: result.changed, quest: presentQuest(result.quest, now, perQuest), xp });
}

async function handleEvidence(questId, request, cols, actor) {
  const now = new Date();
  const body = await readJson(request);
  const result = await addEvidence(cols, { questId, body, actor, now });
  const quest = await cols.quests.findOne({ _id: questId });
  return json({ ok: true, created: result.created, evidence: result.evidence, quest: presentQuest(quest, now) }, { status: result.created ? 201 : 200 });
}

async function handleTarget(questId, request, cols, actor) {
  const now = new Date();
  const body = await readJson(request);
  const quest = await setQuestTarget(cols, { questId, targetAt: body.targetAt, expectedVersion: body.expectedVersion, actor, now });
  return json({ ok: true, quest: presentQuest(quest, now) });
}

async function handleXp(request, cols) {
  const url = new URL(request.url);
  const sourceType = ["task", "revenue", "traffic"].includes(url.searchParams.get("source")) ? url.searchParams.get("source") : null;
  const limit = Number(url.searchParams.get("limit")) || 50;
  const [state, ledger, revenueXp] = await Promise.all([readXpState(cols), listLedger(cols, { limit, sourceType }), readBucketTotal(cols, REVENUE_BUCKET)]);
  const levels = Array.from({ length: 40 }, (_, index) => {
    const level = index + 1;
    return { level, startXp: levelStartXp(level), toNext: xpToNextLevel(level), title: describeLevel(levelStartXp(level)).title };
  });
  return json({
    ok: true,
    state,
    ledger: ledger.map(presentLedgerRow),
    revenueXp,
    rules: XP_RULES,
    masteryLabels: MASTERY_LABELS,
    titles: LEVEL_TITLES,
    rankTiers: RANK_TIERS,
    levels,
    formula: { toNext: "100 + 40 × (L − 1)", start: "T(L) = 100(L − 1) + 20(L − 1)(L − 2)" },
  });
}

async function handleBackfill(request, env, cols, actor) {
  const now = new Date();
  const body = await readJson(request);
  const since = cleanDate(body.since);
  const today = kstDateKey(now);
  if (!since || since < "2024-01-01" || since > today) throw createHttpError(400, "시작 날짜(YYYY-MM-DD)를 확인해 주세요.", { code: "BACKFILL_SINCE_INVALID" });
  const settings = await readSettings(cols);
  const currentXp = await readBucketTotal(cols, REVENUE_BUCKET);
  if (body.dryRun !== false) {
    const preview = await previewRevenueBackfill(env, cols, { since, settings });
    return json({ ok: true, dryRun: true, currentSince: settings.revenueSince, currentRevenueXp: currentXp, preview, deltaXp: preview.targetXp - currentXp, holdLabels: HOLD_REASON_LABELS });
  }
  if (body.confirm !== true) throw createHttpError(400, "미리보기를 확인한 뒤 confirm:true 로 적용해 주세요.", { code: "BACKFILL_CONFIRM_REQUIRED" });
  await setRevenueSince(cols, since, { actor, now });
  const fresh = await readSettings(cols);
  // 한 번에 400건씩 — 남은 주문이 있으면 이어서 돈다(최대 10회). 끝나지 않으면 크론이 이어 간다.
  let rounds = 0;
  let result = await syncRevenueFacts(env, cols, { settings: fresh, now, full: true, actor });
  while (result.more && rounds < 10) {
    rounds += 1;
    result = await syncRevenueFacts(env, cols, { settings: fresh, now: new Date(), actor });
  }
  await recomputeXpState(cols, { now });
  // 과거 매출로 오른 레벨은 이미 본 것으로 둔다 — 레벨업 연출을 다시 틀지 않는다.
  const xp = await acknowledgeLevel(cols, { now });
  return json({ ok: true, dryRun: false, since, rounds: rounds + 1, complete: !result.more, revenueXp: await readBucketTotal(cols, REVENUE_BUCKET), xp });
}

/** 한국어 SNS 초안: 문장 끝 마침표를 뗀다(숫자·URL 안의 점은 그대로). */
export function stripKoreanSentencePeriods(text) {
  return String(text || "").replace(/([가-힣)~!?”’"'])\.(?=\s|$)/g, "$1");
}

async function handleDraft(request, cols) {
  const body = await readJson(request);
  const date = cleanDate(body.date);
  if (!date) throw createHttpError(400, "날짜(YYYY-MM-DD)를 적어 주세요.", { code: "DRAFT_DATE_INVALID" });
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.time || "")) ? body.time : null;
  const channel = CHANNELS[body.channel] ? body.channel : null;
  if (!channel || ["production", "internal_review"].includes(channel)) throw createHttpError(400, "채널을 확인해 주세요.", { code: "DRAFT_CHANNEL_INVALID" });
  const language = ["ko", "en", "ja"].includes(body.language) ? body.language : "ko";
  const sameDay = await cols.quests.find({ plannedDate: date, status: { $ne: "archived" } }).limit(200).toArray();
  const conflicts = sameDay
    .filter((quest) => quest.channel === channel || (channel === "threads_existing_worker" && quest.kind === "auto_publish_check"))
    .map((quest) => {
      const at = quest.targetAt || quest.plannedAt;
      const gapMinutes = time && at ? Math.round(Math.abs(kstDateTime(date, time).getTime() - new Date(at).getTime()) / 60000) : null;
      return { id: quest._id, title: quest.title, plannedTime: quest.plannedTime, gapMinutes, severity: gapMinutes !== null && gapMinutes < 90 ? "same_slot" : "same_day" };
    });
  const text = String(body.text || "").slice(0, 4000);
  const normalizedText = language === "ko" && !["naver_blog"].includes(channel) ? stripKoreanSentencePeriods(text) : text;
  return json({
    ok: true,
    saved: false,
    draft: { date, time: time || "18:00", channel, channelLabel: CHANNELS[channel].label, language, topic: String(body.topic || "").slice(0, 200), text: normalizedText },
    conflicts,
    notes: [
      "초안은 저장되지 않았습니다. 일정으로 남기려면 '퀘스트로 추가'를 누르세요.",
      channel === "threads_existing_worker" ? "Threads 는 기존 자동화가 발행합니다. 여기서는 발행하지 않습니다." : null,
      normalizedText !== text ? "한국어 SNS 규칙에 따라 문장 끝 마침표를 뗐습니다." : null,
    ].filter(Boolean),
  });
}

async function handleOrderFacts(request, cols) {
  const url = new URL(request.url);
  const ids = String(url.searchParams.get("ids") || "").split(",").map((id) => id.trim()).filter((id) => OBJECT_ID.test(id)).slice(0, 100);
  const facts = ids.length ? await cols.revenueFacts.find({ _id: { $in: ids } }).toArray() : [];
  return json({ ok: true, facts: Object.fromEntries(facts.map((fact) => [fact._id, presentFact(fact)])) });
}

function presentFact(fact) {
  return {
    id: fact._id,
    merchantUid: fact.merchantUid,
    paidAt: fact.paidAt,
    currency: fact.currency,
    amountOriginal: fact.amountOriginal,
    amountKRW: fact.amountKRW,
    fxBasis: fact.fxBasis || null,
    refundedKRW: fact.refundedKRW,
    refundState: fact.refundState,
    refundCount: (fact.refunds || []).length,
    netKRW: fact.netKRW,
    delivery: fact.delivery || null,
    deliveryLabel: fact.delivery?.state === "delivered" ? "제공 완료" : fact.delivery?.state === "pending" ? "제공 대기" : fact.delivery ? "판정 불가" : null,
    xpState: fact.xpState,
    xpStateLabel: { counted: "XP 반영", held: "XP 보류", excluded: "XP 제외" }[fact.xpState],
    holdReason: fact.holdReason,
    holdLabel: fact.holdReason ? HOLD_REASON_LABELS[fact.holdReason] : null,
    excludeReason: fact.excludeReason,
    excludeLabel: fact.excludeReason ? EXCLUDE_REASON_LABELS[fact.excludeReason] : null,
    fulfillmentAlertCount: fact.fulfillmentAlertCount || 0,
    productId: fact.productId,
    featureKey: fact.featureKey,
    updatedAt: fact.updatedAt,
  };
}

async function handleOrderQueue(request, cols) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "undelivered";
  const filters = {
    undelivered: { xpState: "held", holdReason: { $in: ["delivery_pending", "delivery_unknown"] } },
    refund_check: { xpState: "held", holdReason: "refund_unknown" },
    held: { xpState: "held" },
    alerts: { fulfillmentAlertCount: { $gt: 0 }, "delivery.state": { $ne: "delivered" } },
  };
  if (!filters[type]) throw createHttpError(400, "큐 종류를 확인해 주세요.", { code: "QUEUE_INVALID" });
  const facts = await cols.revenueFacts.find(filters[type]).sort({ paidAt: -1 }).limit(100).toArray();
  return json({ ok: true, type, items: facts.map(presentFact) });
}

async function handleConnections(env, cols) {
  const now = new Date();
  const readiness = ga4Readiness(env);
  const { getThreadsPostMode } = await import("../lib/sns-daily-post-task.js");
  return json({
    ok: true,
    sources: await readConnections(cols, { now }),
    ga4: { ready: readiness.ready, missing: readiness.missing, steps: GA4_SETUP_STEPS },
    threads: { mode: getThreadsPostMode(env), readOnly: true, note: "자동 발행 기록(idempotency_keys)만 읽습니다. 발행 실행은 하지 않습니다." },
    plan: { campaignId: CAMPAIGN_PLAN.campaignId, planVersion: CAMPAIGN_PLAN.planVersion, rows: CAMPAIGN_PLAN.rows.length, sources: CAMPAIGN_PLAN.sources },
    cron: { schedule: "*/10 * * * *", note: "스테이징은 크론이 비어 있어 '재집계' 버튼으로 실행합니다." },
  });
}

export async function handleAdminHqRoutes(path, request, env, adminContext) {
  const method = request.method.toUpperCase();
  try {
    const actor = actorOf(adminContext);

    if (path === "/ui-mode") {
      if (method !== "GET") return methodNotAllowed();
      try {
        const cols = await openOpsCollections(env);
        const settings = await readSettings(cols);
        return json({ ok: true, uiEnabled: settings.uiEnabled });
      } catch {
        // 플래그를 못 읽어도 관리자 화면 전체가 막히면 안 된다 — 기본값(새 화면)으로 둔다.
        return json({ ok: true, uiEnabled: true, degraded: true });
      }
    }

    const cols = await openOpsCollections(env);

    if (path === "/summary") return method === "GET" ? await handleSummary(request, env, cols) : methodNotAllowed();

    if (path === "/quests") {
      if (method === "GET") return await handleQuestList(request, cols);
      if (method === "POST") {
        const result = await createCustomQuest(cols, { body: await readJson(request), actor, now: new Date() });
        return json({ ok: true, created: result.created, quest: presentQuest(result.quest, new Date()) }, { status: result.created ? 201 : 200 });
      }
      return methodNotAllowed();
    }
    if (path === "/quests/sync") {
      if (method !== "POST") return methodNotAllowed();
      const now = new Date();
      const counts = await syncPlanQuests(cols, CAMPAIGN_PLAN, { now, actor });
      const xp = await refreshTaskXp(cols, actor, now);
      return json({ ok: true, counts, planVersion: CAMPAIGN_PLAN.planVersion, xp });
    }
    const questMatch = /^\/quests\/(q_[a-f0-9]{24})(\/transition|\/evidence|\/target)?$/.exec(path);
    if (questMatch && QUEST_ID.test(questMatch[1])) {
      const [, questId, action] = questMatch;
      if (!action) return method === "GET" ? await handleQuestDetail(questId, cols) : methodNotAllowed();
      if (action === "/transition") return method === "POST" ? await handleTransition(questId, request, cols, actor) : methodNotAllowed();
      if (action === "/evidence") return method === "POST" ? await handleEvidence(questId, request, cols, actor) : methodNotAllowed();
      if (action === "/target") return method === "PATCH" ? await handleTarget(questId, request, cols, actor) : methodNotAllowed();
    }

    if (path === "/xp") return method === "GET" ? await handleXp(request, cols) : methodNotAllowed();
    if (path === "/xp/ack") return method === "POST" ? json({ ok: true, xp: await acknowledgeLevel(cols) }) : methodNotAllowed();
    if (path === "/xp/backfill") return method === "POST" ? await handleBackfill(request, env, cols, actor) : methodNotAllowed();

    if (path === "/settings") {
      if (method === "GET") {
        const settings = await readSettings(cols);
        return json({ ok: true, settings: { uiEnabled: settings.uiEnabled, revenueSince: settings.revenueSince, excludedUserIds: settings.excludedUserIds, goals: settings.goals }, rules: XP_RULES, holdLabels: HOLD_REASON_LABELS, excludeLabels: EXCLUDE_REASON_LABELS });
      }
      if (method === "PATCH") {
        const settings = await updateSettings(cols, await readJson(request), { actor });
        return json({ ok: true, settings: { uiEnabled: settings.uiEnabled, revenueSince: settings.revenueSince, excludedUserIds: settings.excludedUserIds, goals: settings.goals } });
      }
      return methodNotAllowed();
    }

    if (path === "/connections") return method === "GET" ? await handleConnections(env, cols) : methodNotAllowed();
    if (path === "/sync") {
      if (method !== "POST") return methodNotAllowed();
      const body = await readJson(request);
      const result = await runOpsHqSync(env, { cols, force: true, full: body.full === true, actor });
      if (result.busy) throw createHttpError(409, "다른 집계가 진행 중입니다. 잠시 뒤 다시 시도해 주세요.", { code: "OPS_SYNC_BUSY" });
      return json({ ok: true, steps: result.steps, xp: await readXpState(cols) });
    }
    if (path === "/traffic") {
      if (method !== "GET") return methodNotAllowed();
      const period = resolveRange(new URL(request.url));
      return json({ ok: true, period, traffic: await readTraffic(env, cols, period), setup: GA4_SETUP_STEPS });
    }
    if (path === "/achievements") return method === "GET" ? json({ ok: true, items: await readAchievements(cols) }) : methodNotAllowed();
    if (path === "/draft") return method === "POST" ? await handleDraft(request, cols) : methodNotAllowed();
    if (path === "/orders/facts") return method === "GET" ? await handleOrderFacts(request, cols) : methodNotAllowed();
    if (path === "/orders/queue") return method === "GET" ? await handleOrderQueue(request, cols) : methodNotAllowed();

    return notFound();
  } catch (error) {
    return handleRouteError(error, { request, env, trace: { route: "api/admin/hq", method } });
  }
}

export const __adminHqTestUtils = { resolveRange, stripKoreanSentencePeriods, presentFact };

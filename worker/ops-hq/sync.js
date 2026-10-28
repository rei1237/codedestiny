// 운영본부 동기화 — 10분 크론(worker/index.js) 과 "재집계" 버튼이 같은 함수를 쓴다.
//
// 순서: 계획 수입 → Threads 자동 확인 → 작업 XP → 매출 사실 → 트래픽 → XP 상태 → 업적.
// 단계마다 실패를 격리하고 ops_sync_state 에 남긴다(한 원천 장애가 다른 원천 집계를 막지 않는다).
// 🔴 결제 경로와 무관하다 — 여기서 throw 해도 결제·제공에는 영향이 없다(크론은 별도 waitUntil·catch).
// 🔴 Threads 는 기록을 읽기만 한다. 발행 API(/sns-daily-post/run)·runThreadsDailyJobs 는 부르지 않는다.

import plan from "./generated/growth-20261012.js";
import { isDuplicateKeyError, openOpsCollections } from "./db.js";
import { addSystemEvidence, syncPlanQuests, transitionQuest } from "./quests.js";
import { readThreadsStatus } from "./threads-status.js";
import { recomputeXpState, syncTaskXp } from "./xp.js";
import { syncRevenueFacts } from "./revenue-facts.js";
import { syncTraffic } from "./traffic.js";
import { syncAchievements } from "./achievements.js";
import { readSettings } from "./settings.js";
import { kstDateKey } from "./time.js";

export const CAMPAIGN_PLAN = plan;
const LEASE_ID = "lease:run";
const LEASE_MS = 4 * 60 * 1000;
const MAX_THREADS_DATES = 40;

export const SYNC_SOURCES = Object.freeze({
  [`plan:${plan.campaignId}`]: { label: "캠페인 계획", game: "별자리 지도", detail: "marketing/campaigns/2026-10-12-growth (빌드 시 변환)" },
  threads: { label: "Threads 자동 발행 기록", game: "자동 전령 기록", detail: "idempotency_keys 읽기 전용" },
  task_xp: { label: "작업 XP", game: "퀘스트 보상", detail: "완료 검증된 퀘스트" },
  revenue: { label: "결제·환불·제공", game: "별빛 금고", detail: "payments + 제공 원천 + PortOne 환불 조회" },
  traffic: { label: "GA4 유효 참여 세션", game: "별빛 관측", detail: "GA4 Data API" },
  xp_state: { label: "XP 집계", game: "성장 기록", detail: "ops_xp_ledger 합계" },
  achievements: { label: "업적", game: "별의 훈장", detail: "실제 기록의 최초 시각" },
});

async function acquireLease(cols, now, holder) {
  try {
    await cols.syncState.updateOne(
      { _id: LEASE_ID, $or: [{ until: { $lt: now } }, { until: null }] },
      { $set: { until: new Date(now.getTime() + LEASE_MS), holder, at: now } },
      { upsert: true },
    );
    return true;
  } catch (error) {
    if (isDuplicateKeyError(error)) return false; // 다른 실행이 잡고 있다.
    throw error;
  }
}

async function releaseLease(cols, holder) {
  await cols.syncState.updateOne({ _id: LEASE_ID, holder }, { $set: { until: new Date(0) } }).catch(() => {});
}

async function recordStepError(cols, id, error, now) {
  await cols.syncState.updateOne(
    { _id: id },
    { $set: { lastRunAt: now, lastError: { code: error?.code || null, message: String(error?.message || error).slice(0, 240), at: now } }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  ).catch(() => {});
}

async function recordStepSuccess(cols, id, now, counts) {
  await cols.syncState.updateOne(
    { _id: id },
    { $set: { lastRunAt: now, lastSuccessAt: now, lastError: null, counts }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
}

/** Threads 자동 발행 확인 퀘스트 — 그 날 기대한 Job 이 모두 성공 기록을 남겼으면 자동 증빙 + 완료(0 XP). */
export async function syncThreadsQuests(env, cols, { now = new Date(), readStatus = readThreadsStatus } = {}) {
  const today = kstDateKey(now);
  const open = await cols.quests.find({
    kind: "auto_publish_check",
    status: { $in: ["scheduled", "in_progress", "review"] },
    plannedDate: { $lte: today },
  }).sort({ plannedDate: -1 }).limit(MAX_THREADS_DATES).toArray();
  if (!open.length) return { checked: 0, confirmed: 0 };
  const statuses = await readStatus(env, [...new Set(open.map((quest) => quest.plannedDate))], { now });
  let confirmed = 0;
  for (const quest of open) {
    const status = statuses[quest.plannedDate];
    if (!status) continue;
    await cols.quests.updateOne({ _id: quest._id }, {
      $set: {
        automationStatus: {
          checkedAt: now,
          mode: status.mode,
          allConfirmed: status.allConfirmed,
          attention: status.attention,
          jobs: status.jobs.map(({ type, label, time, state, stateLabel, note }) => ({ type, label, time, state, stateLabel, note })),
        },
      },
    });
    if (!status.allConfirmed) continue;
    const postIds = status.jobs.flatMap((job) => job.postIds || []).slice(0, 20);
    await addSystemEvidence(cols, quest, { type: "auto_threads", value: { key: quest.plannedDate, postIds, note: "기존 자동화의 성공 기록" }, source: "idempotency_keys", now });
    const fresh = await cols.quests.findOne({ _id: quest._id });
    try {
      await transitionQuest(cols, { questId: quest._id, to: "done", expectedVersion: fresh.version, reason: "자동 발행 기록 확인", actor: "system:threads", now });
      confirmed += 1;
    } catch (error) {
      if (error?.status !== 409) throw error; // 같은 순간 화면에서 바뀌었다 — 다음 실행에서 다시 본다.
    }
  }
  return { checked: open.length, confirmed };
}

/**
 * @param {object} options
 *   cols     테스트용 컬렉션 묶음(없으면 연결해서 연다)
 *   force    트래픽 6시간 간격 무시, 매출 전체 재계산(full)
 *   deps     { revenue, traffic, readThreadsStatus } 테스트 주입
 */
export async function runOpsHqSync(env, { now = new Date(), force = false, full = false, actor = "system:cron", cols = null, deps = {} } = {}) {
  const collections = cols || await openOpsCollections(env);
  const holder = `${actor}:${now.getTime()}:${Math.random().toString(36).slice(2, 8)}`;
  if (!(await acquireLease(collections, now, holder))) return { busy: true };
  const steps = {};
  const step = async (id, fn) => {
    try {
      steps[id] = { ok: true, result: await fn() };
    } catch (error) {
      steps[id] = { ok: false, error: String(error?.message || error).slice(0, 240) };
      await recordStepError(collections, id, error, now);
      console.error(`[ops-hq] ${id} failed:`, error?.message || error);
    }
  };
  try {
    const settings = await readSettings(collections);
    const planStateId = `plan:${plan.campaignId}`;
    await step(planStateId, async () => {
      const state = await collections.syncState.findOne({ _id: planStateId });
      if (!force && state?.planVersion === plan.planVersion && !state?.lastError) return { skipped: true };
      return syncPlanQuests(collections, plan, { now, actor });
    });
    await step("threads", async () => {
      const result = await syncThreadsQuests(env, collections, { now, readStatus: deps.readThreadsStatus });
      await recordStepSuccess(collections, "threads", now, result);
      return result;
    });
    await step("task_xp", async () => {
      const { changes } = await syncTaskXp(collections, { now, actor, reason: "task_sync" });
      await recordStepSuccess(collections, "task_xp", now, { changes: changes.length });
      return { changes: changes.length };
    });
    await step("revenue", () => syncRevenueFacts(env, collections, { settings, now, full: full || force, actor, ...(deps.revenue ? { deps: deps.revenue } : {}) }));
    await step("traffic", () => syncTraffic(env, collections, { settings, now, force, actor, ...(deps.trafficFetcher ? { fetcher: deps.trafficFetcher } : {}) }));
    await step("xp_state", async () => {
      const state = await recomputeXpState(collections, { now });
      await recordStepSuccess(collections, "xp_state", now, { total: state.totalXp, level: state.level });
      return { total: state.totalXp, level: state.level };
    });
    await step("achievements", async () => {
      const result = await syncAchievements(collections, { now });
      await recordStepSuccess(collections, "achievements", now, result);
      return result;
    });
  } finally {
    await releaseLease(collections, holder);
  }
  return { busy: false, steps };
}

/** 연결 상태 화면 — 원천별 마지막 성공·오류·기간. */
export async function readConnections(cols, { now = new Date() } = {}) {
  const rows = await cols.syncState.find({ _id: { $in: Object.keys(SYNC_SOURCES) } }).toArray();
  const by = new Map(rows.map((row) => [row._id, row]));
  return Object.entries(SYNC_SOURCES).map(([id, meta]) => {
    const row = by.get(id) || null;
    const lastSuccessAt = row?.lastSuccessAt || null;
    const lagMinutes = lastSuccessAt ? Math.round((now.getTime() - new Date(lastSuccessAt).getTime()) / 60000) : null;
    let status = "never";
    if (row?.status === "integration_pending") status = "integration_pending";
    else if (row?.lastError) status = "error";
    else if (lastSuccessAt) status = lagMinutes > 60 * 12 ? "stale" : "ok";
    return {
      id,
      ...meta,
      status,
      statusLabel: { never: "아직 실행 안 됨", integration_pending: "연동 대기", error: "오류", stale: "지연", ok: "정상" }[status],
      lastRunAt: row?.lastRunAt || null,
      lastSuccessAt,
      lagMinutes,
      lastError: row?.lastError || null,
      window: row?.window || null,
      counts: row?.counts || null,
      missing: row?.missing || [],
      planVersion: row?.planVersion || null,
    };
  });
}

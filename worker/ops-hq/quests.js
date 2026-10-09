// 별빛 퀘스트 — 마케팅 캠페인 일정을 운영 작업으로 바꾸고, 상태·증빙을 관리한다.
//
// 퀘스트 구조
//   부모(원본 제작): contentId 하나당 하나. B·X 는 원고 작성(copy), V 는 영상 제작(production).
//   자식(채널 발행): CSV 한 행 = 하나(publish). V01 처럼 TikTok·Shorts 에 같이 나가면 원본 1 + 발행 2.
//   Threads 행: 기존 자동화 확인(auto_publish_check, XP 0) — 사람이 하는 일이 아니다.
//   R01~R04: 주간 결산(analysis).
//
// 🔴 퀘스트 _id 는 회차 키(campaign|contentId|channel|language)의 해시다. 날짜가 바뀌어도 같은 퀘스트라
//    증빙·진행 상태·XP 가 이어진다. 원본 필드만 갱신하고 차이는 sourceHistory 에 남긴다.
// 🔴 원본에서 사라진 행은 지우지 않고 archived 로 보관한다. 증빙은 append-only — 덮어쓰지 않는다.
// 🔴 "작업 목표 시각"(targetAt)은 이 화면의 메모일 뿐 외부 예약 시스템에 쓰지 않는다.
// 🔴 이 모듈은 어떤 경로로도 공개 발행(/run)을 부르지 않는다. Threads 는 threads-status.js 가 읽기만 한다.

import { createHash } from "node:crypto";

import { createHttpError } from "../lib/http.js";
import { BUSINESS_ID, isDuplicateKeyError } from "./db.js";
import { addDaysKey, kstDateKey, kstDateTime } from "./time.js";
import { XP_RULES } from "./xp.js";

const sha = (text) => createHash("sha256").update(String(text)).digest("hex");

export function questIdFor(occurrenceKey) {
  return `q_${sha(occurrenceKey).slice(0, 24)}`;
}

export const CHANNELS = Object.freeze({
  naver_blog: { label: "네이버 블로그", domains: ["blog.naver.com"] },
  tiktok: { label: "TikTok", domains: ["tiktok.com"] },
  youtube_shorts: { label: "YouTube Shorts", domains: ["youtube.com", "youtu.be"] },
  x: { label: "X", domains: ["x.com", "twitter.com"] },
  threads_existing_worker: { label: "Threads 자동 발행", domains: ["threads.net", "threads.com"] },
  internal_review: { label: "주간 결산", domains: [] },
  production: { label: "원본 제작", domains: [] },
  custom: { label: "직접 추가", domains: [] },
});

export const SOURCE_STATUS_LABELS = Object.freeze({
  copy_ready: "원고 준비됨",
  script_ready_video_pending: "대본 준비 · 영상 대기",
  planned: "계획",
  existing_automation_unverified_live: "기존 자동화 · 실발행 미확인",
});

export const QUEST_KINDS = Object.freeze({
  copy: { label: "원고 작성", game: "주문서 필사", required: ["copy_ready"], minutes: 30 },
  production: { label: "원본 제작", game: "별빛 제련", required: ["asset_file"], minutes: 60 },
  publish: { label: "채널 발행", game: "전령 파견", required: ["public_url"], minutes: 15 },
  analysis: { label: "캠페인 분석", game: "별자리 판독", required: ["report"], minutes: 30 },
  improvement: { label: "개선 · 문제 해결", game: "결계 보수", required: ["report"], minutes: 45 },
  auto_publish_check: { label: "자동 발행 확인", game: "자동 전령 점검", required: ["auto_threads"], minutes: 5 },
});

export const STATUS_LABELS = Object.freeze({
  scheduled: "예정",
  in_progress: "진행 중",
  review: "검토 대기",
  done: "완료",
  on_hold: "보류",
  cancelled: "취소",
  archived: "원본에서 제외",
});

export const STAGES = Object.freeze(["copy", "asset", "scheduled", "published", "observed"]);
export const STAGE_LABELS = Object.freeze({ copy: "원고", asset: "에셋", scheduled: "예약", published: "공개", observed: "성과 관측" });

export const EVIDENCE_TYPES = Object.freeze({
  copy_ready: { label: "원고 준비", stage: "copy", manual: true },
  asset_file: { label: "에셋 파일", stage: "asset", manual: true },
  reservation: { label: "예약 완료", stage: "scheduled", manual: true },
  public_url: { label: "공개 URL", stage: "published", manual: true },
  auto_threads: { label: "자동 발행 확인", stage: "published", manual: false },
  metrics: { label: "성과 지표", stage: "observed", manual: true },
  report: { label: "결산 보고", stage: "observed", manual: true },
});

const TRANSITIONS = Object.freeze({
  scheduled: ["in_progress", "review", "done", "on_hold", "cancelled"],
  in_progress: ["scheduled", "review", "done", "on_hold", "cancelled"],
  review: ["in_progress", "done", "on_hold"],
  on_hold: ["scheduled", "in_progress", "cancelled"],
  cancelled: ["scheduled"],
  done: ["in_progress"],
  archived: [],
});

const OPEN_STATUSES = new Set(["scheduled", "in_progress", "review"]);
const MAX_HISTORY = 100;

/** "W02-V1" → "V", "B01" → "B", "W01-T3" → "T", "R01" → "R". */
export function contentLetter(contentId) {
  const match = /^(?:W\d{2}-)?([A-Z])/.exec(String(contentId || ""));
  return match ? match[1] : "";
}

function kindForRow(row) {
  if (row.channel === "threads_existing_worker") return "auto_publish_check";
  if (row.channel === "internal_review") return "analysis";
  return "publish";
}

function parentKindFor(contentId) {
  return contentLetter(contentId) === "V" ? "production" : "copy";
}

function channelLabel(channel) {
  return CHANNELS[channel]?.label || channel;
}

function rowSummary(row) {
  return {
    date: row.date, time: row.time, channel: row.channel, language: row.language, topic: row.topic,
    sourceStatus: row.sourceStatus, owner: row.owner, note: row.note,
  };
}

/** Threads 행의 "08:30/12:00/20:30" → 자동 Job 목록(시각만; 유형 매핑은 threads-status.js). */
function automationFor(row) {
  if (row.channel !== "threads_existing_worker") return null;
  const times = String(row.time || "").split("/").map((value) => value.trim()).filter(Boolean);
  return { kind: "threads", dateKey: row.date, times };
}

/**
 * 계획 모듈 → 원하는 퀘스트 문서들(원본이 정하는 필드만). 순수 함수 — 같은 계획이면 같은 결과.
 */
export function buildQuestsFromPlan(plan) {
  const campaignId = plan.campaignId;
  const quests = [];
  const parents = new Map();

  for (const row of plan.rows) {
    const kind = kindForRow(row);
    let parentId = null;
    if (kind === "publish") {
      const parentKey = `${campaignId}|${row.contentId}|production`;
      parentId = questIdFor(parentKey);
      const group = parents.get(parentKey) || { key: parentKey, contentId: row.contentId, rows: [] };
      group.rows.push(row);
      parents.set(parentKey, group);
    }
    const title = kind === "auto_publish_check"
      ? `${row.date.slice(5).replace("-", "/")} Threads 자동 발행 확인`
      : kind === "analysis"
        ? row.topic
        : `${row.contentId} ${channelLabel(row.channel)} 발행`;
    quests.push({
      _id: questIdFor(row.occurrenceKey),
      origin: "plan",
      campaignId,
      occurrenceKey: row.occurrenceKey,
      parentId,
      kind,
      contentId: row.contentId,
      channel: row.channel,
      language: row.language,
      title,
      topic: row.topic,
      plannedDate: row.date,
      plannedTime: row.time,
      plannedAt: kstDateTime(row.date, row.time),
      sourceStatus: row.sourceStatus,
      source: row.source,
      owner: row.owner,
      note: row.note,
      scriptRef: row.scriptRef || null,
      automation: automationFor(row),
      requiredEvidence: QUEST_KINDS[kind].required,
      sourceRowHash: row.rowHash,
      sourceSnapshot: rowSummary(row),
    });
  }

  for (const group of parents.values()) {
    const rows = [...group.rows].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const first = rows[0];
    const kind = parentKindFor(group.contentId);
    const statuses = [...new Set(rows.map((row) => row.sourceStatus))];
    const hash = sha(rows.map((row) => `${row.occurrenceKey}|${row.date}|${row.time}|${row.topic}|${row.sourceStatus}`).join("\n")).slice(0, 24);
    quests.push({
      _id: questIdFor(group.key),
      origin: "plan",
      campaignId,
      occurrenceKey: group.key,
      parentId: null,
      kind,
      contentId: group.contentId,
      channel: "production",
      language: first.language,
      title: `${group.contentId} ${kind === "production" ? "영상 제작" : "원고 작성"}`,
      topic: first.topic,
      plannedDate: first.date,
      plannedTime: first.time,
      // 원본은 첫 발행 전에 끝나야 한다 — 목표 시각은 첫 발행 시각.
      plannedAt: kstDateTime(first.date, first.time),
      sourceStatus: statuses.includes("copy_ready") ? "copy_ready" : statuses[0],
      source: first.source,
      owner: first.owner,
      note: first.note,
      scriptRef: rows.find((row) => row.scriptRef)?.scriptRef || null,
      automation: null,
      requiredEvidence: QUEST_KINDS[kind].required,
      sourceRowHash: hash,
      sourceSnapshot: { channels: rows.map((row) => row.channel), firstDate: first.date, statuses },
      childKeys: rows.map((row) => row.occurrenceKey),
    });
  }

  return quests.sort((a, b) => a._id.localeCompare(b._id));
}

/** 수입 시점에 원본이 이미 보증하는 증빙. 자동(verification:auto)이고 XP 는 완료 전이 때만 생긴다. */
function initialEvidenceFor(quest) {
  const ready = quest.sourceStatus === "copy_ready"
    || (quest.kind === "production" && quest.sourceSnapshot?.statuses?.includes("script_ready_video_pending"));
  if (!ready || !["copy", "production"].includes(quest.kind)) return [];
  return [{
    type: "copy_ready",
    verification: "auto",
    value: { note: `캠페인 원본 상태: ${SOURCE_STATUS_LABELS[quest.sourceStatus] || quest.sourceStatus}`, ref: quest.scriptRef?.file || null, heading: quest.scriptRef?.heading || null },
    source: "calendar.csv",
  }];
}

const SOURCE_FIELDS = [
  "campaignId", "occurrenceKey", "parentId", "kind", "contentId", "channel", "language", "title", "topic",
  "plannedDate", "plannedTime", "plannedAt", "sourceStatus", "source", "owner", "note", "scriptRef",
  "automation", "requiredEvidence", "sourceRowHash", "sourceSnapshot", "childKeys",
];

function pickSource(quest) {
  const out = {};
  for (const key of SOURCE_FIELDS) if (quest[key] !== undefined) out[key] = quest[key];
  return out;
}

function diffSource(before, after) {
  const changes = {};
  for (const key of ["plannedDate", "plannedTime", "topic", "sourceStatus", "owner", "note", "title", "parentId", "kind"]) {
    const from = before?.[key] ?? null;
    const to = after?.[key] ?? null;
    if (JSON.stringify(from) !== JSON.stringify(to)) changes[key] = { from, to };
  }
  return changes;
}

function stageFor(types) {
  let index = -1;
  for (const type of types || []) index = Math.max(index, STAGES.indexOf(EVIDENCE_TYPES[type]?.stage));
  return index >= 0 ? STAGES[index] : null;
}

/**
 * 계획을 ops_quests 로 반영한다. 몇 번을 돌려도 같은 결과(멱등).
 * @returns {{created:number, updated:number, archived:number, restored:number, unchanged:number}}
 */
export async function syncPlanQuests(cols, plan, { now = new Date(), actor = "system" } = {}) {
  const desired = buildQuestsFromPlan(plan);
  const desiredIds = new Set(desired.map((quest) => quest._id));
  const existingList = await cols.quests.find({ campaignId: plan.campaignId, origin: "plan" }).toArray();
  const existing = new Map(existingList.map((quest) => [quest._id, quest]));
  const counts = { created: 0, updated: 0, archived: 0, restored: 0, unchanged: 0 };

  for (const quest of desired) {
    const current = existing.get(quest._id);
    if (!current) {
      const evidence = initialEvidenceFor(quest);
      const types = evidence.map((row) => row.type);
      const doc = {
        ...quest,
        businessId: BUSINESS_ID,
        status: "scheduled",
        stage: stageFor(types),
        evidenceTypes: types,
        evidenceCount: 0, // insertEvidence 가 증빙마다 올린다.
        targetAt: null,
        xpVerifiedAt: null,
        doneAt: null,
        sourcePlanVersion: plan.planVersion,
        sourceHistory: [{ at: now, planVersion: plan.planVersion, kind: "created", toHash: quest.sourceRowHash }],
        history: [],
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      try {
        await cols.quests.insertOne(doc);
        counts.created += 1;
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
        counts.unchanged += 1; // 동시에 돈 다른 수입이 먼저 만들었다.
        continue;
      }
      for (const row of evidence) await insertEvidence(cols, doc, { ...row, actor, now });
      continue;
    }

    const changed = current.sourceRowHash !== quest.sourceRowHash;
    const restore = current.status === "archived";
    if (!changed && !restore) { counts.unchanged += 1; continue; }

    const set = { ...pickSource(quest), sourcePlanVersion: plan.planVersion, updatedAt: now };
    const push = {};
    if (changed) {
      push.sourceHistory = { at: now, planVersion: plan.planVersion, kind: "changed", fromHash: current.sourceRowHash, toHash: quest.sourceRowHash, changes: diffSource(current, quest) };
    }
    if (restore) {
      set.status = current.archivedFromStatus || "scheduled";
      push.history = { $each: [{ at: now, actor, from: "archived", to: set.status, reason: "원본에 다시 나타남" }], $slice: -MAX_HISTORY };
      if (!changed) push.sourceHistory = { at: now, planVersion: plan.planVersion, kind: "restored" };
    }
    const result = await cols.quests.updateOne(
      { _id: current._id, version: current.version },
      { $set: set, $push: push, $inc: { version: 1 }, ...(restore ? { $unset: { archivedFromStatus: "", archivedAt: "" } } : {}) },
    );
    if (result.matchedCount) {
      if (changed) counts.updated += 1;
      if (restore) counts.restored += 1;
    }
  }

  for (const current of existingList) {
    if (desiredIds.has(current._id) || current.status === "archived") continue;
    const result = await cols.quests.updateOne(
      { _id: current._id, version: current.version },
      {
        $set: { status: "archived", archivedFromStatus: current.status, archivedAt: now, updatedAt: now },
        $push: {
          sourceHistory: { at: now, planVersion: plan.planVersion, kind: "removed", fromHash: current.sourceRowHash },
          history: { $each: [{ at: now, actor, from: current.status, to: "archived", reason: "원본 일정에서 빠짐" }], $slice: -MAX_HISTORY },
        },
        $inc: { version: 1 },
      },
    );
    if (result.matchedCount) counts.archived += 1;
  }

  await cols.syncState.updateOne(
    { _id: `plan:${plan.campaignId}` },
    {
      $set: { source: "plan", campaignId: plan.campaignId, planVersion: plan.planVersion, lastSuccessAt: now, lastRunAt: now, lastError: null, counts, rows: plan.rows.length, sources: plan.sources },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  return counts;
}

function normalizeUrl(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  let url;
  try { url = new URL(text); } catch { return null; }
  if (url.protocol !== "https:") return null;
  url.hash = "";
  return url;
}

function hostMatches(hostname, domains) {
  const host = hostname.toLowerCase();
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function cleanText(value, max) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

/** 수동 증빙 입력 정규화. public_url 은 채널 도메인과 맞아야 한다. */
export function normalizeEvidenceInput(quest, body = {}) {
  const type = String(body.type || "");
  const spec = EVIDENCE_TYPES[type];
  if (!spec) throw createHttpError(400, "증빙 종류를 확인해 주세요.", { code: "EVIDENCE_TYPE_INVALID" });
  if (!spec.manual) throw createHttpError(400, "자동 확인 증빙은 직접 등록할 수 없습니다.", { code: "EVIDENCE_AUTO_ONLY" });
  if (quest.kind === "auto_publish_check") {
    throw createHttpError(400, "자동 발행 확인 퀘스트는 기존 자동화 기록으로만 확인합니다.", { code: "EVIDENCE_AUTO_ONLY" });
  }
  const note = cleanText(body.note, 500);
  const ref = cleanText(body.ref, 300);
  let url = null;
  if (body.url) {
    const parsed = normalizeUrl(body.url);
    if (!parsed) throw createHttpError(400, "https 로 시작하는 주소를 넣어 주세요.", { code: "EVIDENCE_URL_INVALID" });
    url = parsed.toString();
    if (type === "public_url") {
      const domains = CHANNELS[quest.channel]?.domains || [];
      if (!domains.length || !hostMatches(parsed.hostname, domains)) {
        throw createHttpError(400, `${channelLabel(quest.channel)} 공개 주소가 아닙니다.`, { code: "EVIDENCE_URL_DOMAIN", allowed: domains });
      }
    }
  }
  if (type === "public_url" && !url) throw createHttpError(400, "공개 URL 이 필요합니다.", { code: "EVIDENCE_URL_REQUIRED" });
  if (!url && !note && !ref) throw createHttpError(400, "주소·파일 위치·메모 중 하나는 적어 주세요.", { code: "EVIDENCE_EMPTY" });
  return { type, verification: "manual", value: { url, note: note || null, ref: ref || null }, source: "admin" };
}

async function insertEvidence(cols, quest, { type, verification, value, source, actor, now }) {
  const fingerprint = sha(JSON.stringify({ url: value?.url || null, ref: value?.ref || null, note: value?.note || null, extra: value?.key || null })).slice(0, 16);
  const doc = {
    _id: `${quest._id}:${type}:${fingerprint}`,
    businessId: BUSINESS_ID,
    questId: quest._id,
    type,
    label: EVIDENCE_TYPES[type].label,
    verification,
    value,
    source,
    actor,
    createdAt: now,
  };
  try {
    await cols.evidence.insertOne(doc);
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    return { created: false, evidence: await cols.evidence.findOne({ _id: doc._id }) };
  }
  const types = [...new Set([...(quest.evidenceTypes || []), type])];
  await cols.quests.updateOne(
    { _id: quest._id },
    { $addToSet: { evidenceTypes: type }, $inc: { evidenceCount: 1 }, $set: { stage: stageFor(types), updatedAt: now } },
  );
  return { created: true, evidence: doc };
}

export async function addEvidence(cols, { questId, body, actor, now = new Date() }) {
  const quest = await cols.quests.findOne({ _id: questId });
  if (!quest) throw createHttpError(404, "퀘스트를 찾을 수 없습니다.", { code: "QUEST_NOT_FOUND" });
  if (quest.status === "archived") throw createHttpError(409, "원본에서 제외된 퀘스트입니다.", { code: "QUEST_ARCHIVED" });
  const input = normalizeEvidenceInput(quest, body);
  return insertEvidence(cols, quest, { ...input, actor, now });
}

/** 시스템(자동 확인) 증빙 — threads-status 동기화 전용. */
export async function addSystemEvidence(cols, quest, { type, value, source, now = new Date() }) {
  return insertEvidence(cols, quest, { type, verification: "auto", value, source, actor: "system", now });
}

export function missingEvidence(quest) {
  const have = new Set(quest.evidenceTypes || []);
  return (quest.requiredEvidence || QUEST_KINDS[quest.kind]?.required || []).filter((type) => !have.has(type));
}

/**
 * 상태 전이. expectedVersion 이 다르면 409(다른 화면이 먼저 바꿨다).
 * 완료는 필수 증빙이 모두 있어야 한다. xpVerifiedAt 은 처음 완료될 때 한 번만 찍힌다.
 */
export async function transitionQuest(cols, { questId, to, expectedVersion, reason, actor, now = new Date() }) {
  const quest = await cols.quests.findOne({ _id: questId });
  if (!quest) throw createHttpError(404, "퀘스트를 찾을 수 없습니다.", { code: "QUEST_NOT_FOUND" });
  if (expectedVersion != null && Number(expectedVersion) !== quest.version) {
    throw createHttpError(409, "다른 곳에서 먼저 바뀌었습니다. 새로고침 후 다시 시도해 주세요.", { code: "QUEST_VERSION_CONFLICT", version: quest.version });
  }
  const target = String(to || "");
  if (!STATUS_LABELS[target] || target === "archived") throw createHttpError(400, "이동할 상태를 확인해 주세요.", { code: "QUEST_STATUS_INVALID" });
  if (target === quest.status) return { quest, changed: false };
  if (!(TRANSITIONS[quest.status] || []).includes(target)) {
    throw createHttpError(409, `${STATUS_LABELS[quest.status]}에서 ${STATUS_LABELS[target]}(으)로 바로 옮길 수 없습니다.`, { code: "QUEST_TRANSITION_INVALID" });
  }
  const note = cleanText(reason, 300);
  if (quest.status === "done" && !note) throw createHttpError(400, "완료를 되돌리는 이유를 적어 주세요.", { code: "QUEST_REOPEN_REASON_REQUIRED" });
  if (target === "done") {
    const missing = missingEvidence(quest);
    if (missing.length) {
      throw createHttpError(409, `완료하려면 증빙이 필요합니다: ${missing.map((type) => EVIDENCE_TYPES[type]?.label || type).join(", ")}`, { code: "QUEST_EVIDENCE_REQUIRED", missing });
    }
  }
  const set = { status: target, updatedAt: now };
  if (target === "done") {
    set.doneAt = now;
    if (!quest.xpVerifiedAt) set.xpVerifiedAt = now;
  }
  if (quest.status === "done") set.reopenedAt = now;
  const result = await cols.quests.updateOne(
    { _id: quest._id, version: quest.version, status: quest.status },
    {
      $set: set,
      $inc: { version: 1 },
      $push: { history: { $each: [{ at: now, actor, from: quest.status, to: target, reason: note || null }], $slice: -MAX_HISTORY } },
    },
  );
  if (!result.matchedCount) {
    throw createHttpError(409, "다른 곳에서 먼저 바뀌었습니다. 새로고침 후 다시 시도해 주세요.", { code: "QUEST_VERSION_CONFLICT" });
  }
  return { quest: await cols.quests.findOne({ _id: quest._id }), changed: true, affectsXp: target === "done" || quest.status === "done" };
}

/** 작업 목표 시각 — 화면 안의 메모. null 이면 원본 계획 시각으로 되돌린다. */
export async function setQuestTarget(cols, { questId, targetAt, expectedVersion, actor, now = new Date() }) {
  const quest = await cols.quests.findOne({ _id: questId });
  if (!quest) throw createHttpError(404, "퀘스트를 찾을 수 없습니다.", { code: "QUEST_NOT_FOUND" });
  if (expectedVersion != null && Number(expectedVersion) !== quest.version) {
    throw createHttpError(409, "다른 곳에서 먼저 바뀌었습니다. 새로고침 후 다시 시도해 주세요.", { code: "QUEST_VERSION_CONFLICT", version: quest.version });
  }
  let next = null;
  if (targetAt !== null && targetAt !== undefined && targetAt !== "") {
    next = new Date(targetAt);
    if (!Number.isFinite(next.getTime())) throw createHttpError(400, "작업 목표 시각을 확인해 주세요.", { code: "QUEST_TARGET_INVALID" });
    const planned = quest.plannedAt ? new Date(quest.plannedAt).getTime() : now.getTime();
    if (Math.abs(next.getTime() - planned) > 60 * 86_400_000) throw createHttpError(400, "계획 시각에서 60일 넘게 옮길 수 없습니다.", { code: "QUEST_TARGET_RANGE" });
  }
  const result = await cols.quests.updateOne(
    { _id: quest._id, version: quest.version },
    {
      $set: { targetAt: next, updatedAt: now },
      $inc: { version: 1 },
      $push: { history: { $each: [{ at: now, actor, kind: "target", from: quest.targetAt || null, to: next }], $slice: -MAX_HISTORY } },
    },
  );
  if (!result.matchedCount) throw createHttpError(409, "다른 곳에서 먼저 바뀌었습니다.", { code: "QUEST_VERSION_CONFLICT" });
  return cols.quests.findOne({ _id: quest._id });
}

/** 직접 추가하는 개선·분석 퀘스트(초안). 같은 날 같은 제목은 하나만 생긴다. */
export async function createCustomQuest(cols, { body, actor, now = new Date() }) {
  const kind = ["improvement", "analysis", "copy", "production"].includes(body?.kind) ? body.kind : "improvement";
  const title = cleanText(body?.title, 120);
  if (!title) throw createHttpError(400, "퀘스트 제목을 적어 주세요.", { code: "QUEST_TITLE_REQUIRED" });
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body?.date || "")) ? body.date : kstDateKey(now);
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(body?.time || "")) ? body.time : "18:00";
  const occurrenceKey = `custom|${date}|${sha(title).slice(0, 12)}`;
  const doc = {
    _id: questIdFor(occurrenceKey),
    businessId: BUSINESS_ID,
    origin: "custom",
    campaignId: cleanText(body?.campaignId, 60) || null,
    occurrenceKey,
    parentId: null,
    kind,
    contentId: null,
    channel: "custom",
    language: "ko",
    title,
    topic: cleanText(body?.note, 300) || title,
    plannedDate: date,
    plannedTime: time,
    plannedAt: kstDateTime(date, time),
    sourceStatus: "planned",
    requiredEvidence: QUEST_KINDS[kind].required,
    status: "scheduled",
    stage: null,
    evidenceTypes: [],
    evidenceCount: 0,
    targetAt: null,
    xpVerifiedAt: null,
    history: [{ at: now, actor, from: null, to: "scheduled", reason: "직접 추가" }],
    sourceHistory: [],
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await cols.quests.insertOne(doc);
    return { created: true, quest: doc };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    return { created: false, quest: await cols.quests.findOne({ _id: doc._id }) };
  }
}

/** 화면용 파생 필드 — 저장하지 않는다. 기한 경과는 표시일 뿐 XP 감점이 없다. */
export function presentQuest(quest, now = new Date(), allocation = null) {
  const dueAt = quest.targetAt || quest.plannedAt || null;
  const overdue = OPEN_STATUSES.has(quest.status) && dueAt && new Date(dueAt).getTime() < now.getTime();
  const kind = QUEST_KINDS[quest.kind] || {};
  const xp = allocation?.get?.(String(quest._id)) || null;
  return {
    id: quest._id,
    origin: quest.origin,
    campaignId: quest.campaignId,
    parentId: quest.parentId || null,
    kind: quest.kind,
    kindLabel: kind.label,
    kindGame: kind.game,
    estimatedMinutes: kind.minutes || 30,
    contentId: quest.contentId,
    channel: quest.channel,
    channelLabel: channelLabel(quest.channel),
    language: quest.language,
    title: quest.title,
    topic: quest.topic,
    plannedDate: quest.plannedDate,
    plannedTime: quest.plannedTime,
    plannedAt: quest.plannedAt,
    targetAt: quest.targetAt || null,
    dueAt,
    dueDate: dueAt ? kstDateKey(dueAt) : quest.plannedDate,
    status: quest.status,
    statusLabel: STATUS_LABELS[quest.status] || quest.status,
    overdue: Boolean(overdue),
    stage: quest.stage || null,
    stageLabel: quest.stage ? STAGE_LABELS[quest.stage] : "시작 전",
    sourceStatus: quest.sourceStatus,
    sourceStatusLabel: SOURCE_STATUS_LABELS[quest.sourceStatus] || quest.sourceStatus,
    scriptRef: quest.scriptRef || null,
    requiredEvidence: quest.requiredEvidence || kind.required || [],
    evidenceTypes: quest.evidenceTypes || [],
    missingEvidence: missingEvidence(quest),
    automation: quest.automation || null,
    baseXp: XP_RULES.task[quest.kind] || 0,
    xp: xp ? { date: xp.date, awarded: xp.awarded, capped: xp.capped } : null,
    xpVerifiedAt: quest.xpVerifiedAt || null,
    doneAt: quest.doneAt || null,
    version: quest.version,
    sourceChanged: (quest.sourceHistory || []).some((entry) => entry.kind === "changed"),
    updatedAt: quest.updatedAt,
  };
}

/**
 * 30·60·90분 업무 묶음. 기한 경과 → 오늘 → 가까운 순으로, 정해진 시간 안에 들어가는 만큼 담는다.
 * 출석·연속 기록 같은 압박 요소는 없다 — 남은 일을 시간 단위로 나눠 보여 줄 뿐이다.
 */
export function suggestWorkBundles(presented, now = new Date()) {
  const today = kstDateKey(now);
  const open = presented
    .filter((quest) => OPEN_STATUSES.has(quest.status) && quest.kind !== "auto_publish_check")
    .sort((a, b) => (Number(b.overdue) - Number(a.overdue))
      || String(a.dueAt || "").localeCompare(String(b.dueAt || ""))
      || a.id.localeCompare(b.id))
    .filter((quest) => quest.overdue || quest.dueDate <= today || quest.dueDate <= addDaysKey(today, 3));
  return [30, 60, 90].map((budget) => {
    const picked = [];
    let used = 0;
    for (const quest of open) {
      if (used + quest.estimatedMinutes > budget) continue;
      picked.push({ id: quest.id, title: quest.title, minutes: quest.estimatedMinutes, kindLabel: quest.kindLabel, overdue: quest.overdue });
      used += quest.estimatedMinutes;
    }
    return { minutes: budget, used, quests: picked, xp: picked.reduce((sum, row) => sum + (XP_RULES.task[open.find((q) => q.id === row.id)?.kind] || 0), 0) };
  });
}

// 운영 XP 원장 — append-only, 버킷 목표 대비 차이만 기록한다.
//
// 버킷: task:<KST날짜>:<숙련도> · revenue:cumulative · traffic:<원천>:<KST날짜>
// 원장 행 _id = "<버킷>#r<6자리 revision>". 같은 revision 을 두 요청이 동시에 쓰면 _id 고유 인덱스가
// E11000 으로 하나만 통과시킨다 — 진 쪽은 다시 읽고 다시 계산한다. 그래서 새 인덱스 없이도 중복 보상이
// 생기지 않는다. 같은 원천을 몇 번 다시 계산해도 목표가 같으면 delta 0 이라 아무것도 쓰지 않는다.
//
// 🔴 XP·금액·레벨은 서버가 원천에서 다시 계산한 값만 쓴다. 요청 본문에서 받는 경로는 없다.
// 🔴 원장 행은 수정·삭제하지 않는다. 정정은 음수 delta 의 새 행이다(correctsEntryId 로 이전 행을 가리킨다).

import { BUSINESS_ID, isDuplicateKeyError } from "./db.js";
import { levelForXp, describeLevel } from "./levels.js";
import { kstDateKey } from "./time.js";

export const XP_RULES = Object.freeze({
  version: "ops-xp-v1",
  task: Object.freeze({ copy: 30, production: 60, publish: 20, analysis: 30, improvement: 60, auto_publish_check: 0 }),
  mastery: Object.freeze({ copy: "content", production: "production", publish: "publishing", analysis: "analysis", improvement: "improvement" }),
  dailyTaskCap: 200,
  revenue: Object.freeze({ krwPerStep: 1000, xpPerStep: 5 }),
  traffic: Object.freeze({ sessionsPerXp: 10, dailyCap: 50 }),
});

export const MASTERY_LABELS = Object.freeze({
  content: "콘텐츠",
  production: "제작",
  publishing: "발행",
  analysis: "분석",
  improvement: "개선",
});

const MAX_WRITE_ATTEMPTS = 4;

export function revenueXpTarget(netKRW) {
  const { krwPerStep, xpPerStep } = XP_RULES.revenue;
  return Math.floor(Math.max(0, Number(netKRW) || 0) / krwPerStep) * xpPerStep;
}

export function trafficXpTarget(engagedSessions) {
  const { sessionsPerXp, dailyCap } = XP_RULES.traffic;
  return Math.min(dailyCap, Math.floor(Math.max(0, Number(engagedSessions) || 0) / sessionsPerXp));
}

/**
 * 완료된 퀘스트 → 일 상한(200)을 적용한 숙련도 버킷 목표.
 * 순서는 (xpVerifiedAt, _id) — 같은 입력이면 언제 다시 계산해도 같은 배분이 나온다.
 * 날짜는 서버가 처음 완료를 검증한 시각의 KST 날짜로 고정이라, 하위 작업 분할·날짜 변경으로 상한을 넘을 수 없다.
 */
export function allocateTaskXp(doneQuests, { cap = XP_RULES.dailyTaskCap } = {}) {
  const rows = doneQuests
    .filter((quest) => quest?.xpVerifiedAt && (XP_RULES.task[quest.kind] || 0) > 0)
    .map((quest) => ({ id: String(quest._id), kind: quest.kind, at: new Date(quest.xpVerifiedAt) }))
    .sort((a, b) => (a.at - b.at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const usedByDate = new Map();
  const buckets = new Map();
  const perQuest = new Map();
  for (const row of rows) {
    const date = kstDateKey(row.at);
    const base = XP_RULES.task[row.kind];
    const used = usedByDate.get(date) || 0;
    const awarded = Math.max(0, Math.min(base, cap - used));
    usedByDate.set(date, used + awarded);
    perQuest.set(row.id, { date, base, awarded, capped: awarded < base });
    const mastery = XP_RULES.mastery[row.kind];
    const key = `task:${date}:${mastery}`;
    const bucket = buckets.get(key) || { bucket: key, date, mastery, target: 0, sourceIds: [] };
    bucket.target += awarded;
    if (awarded > 0) bucket.sourceIds.push(row.id);
    buckets.set(key, bucket);
  }
  return { buckets, perQuest, usedByDate };
}

function revisionOf(id) {
  const match = /#r(\d{6})$/.exec(String(id));
  return match ? Number(match[1]) : 0;
}

function entryId(bucket, revision) {
  return `${bucket}#r${String(revision).padStart(6, "0")}`;
}

/** 버킷 접두어 범위 — _id 인덱스만 탄다. "task:" → "task;" 처럼 마지막 글자를 하나 올린다. */
export function prefixRange(prefix) {
  const last = prefix.charCodeAt(prefix.length - 1);
  return { $gte: prefix, $lt: prefix.slice(0, -1) + String.fromCharCode(last + 1) };
}

function summarizeRows(rows) {
  const byBucket = new Map();
  for (const row of rows) {
    const bucket = row.bucket || String(row._id).replace(/#r\d{6}$/, "");
    const current = byBucket.get(bucket) || { total: 0, lastRevision: 0 };
    current.total += Number(row.delta) || 0;
    current.lastRevision = Math.max(current.lastRevision, revisionOf(row._id));
    byBucket.set(bucket, current);
  }
  return byBucket;
}

async function readBucket(ledger, bucket) {
  const rows = await ledger.find({ _id: prefixRange(`${bucket}#r`) }, { projection: { delta: 1, bucket: 1 } }).toArray();
  return summarizeRows(rows).get(bucket) || { total: 0, lastRevision: 0 };
}

export async function readBucketTotal(cols, bucket) {
  return (await readBucket(cols.ledger, bucket)).total;
}

/**
 * 버킷을 목표값에 맞춘다. 현재 합계와 같으면 아무것도 쓰지 않는다.
 * @returns {Promise<{bucket:string, delta:number, entry?:object}>}
 */
export async function applyBucketTarget(cols, spec, { known } = {}) {
  const { bucket, target, now = new Date() } = spec;
  const goal = Math.round(Number(target) || 0);
  let state = known || null;
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
    if (!state) state = await readBucket(cols.ledger, bucket);
    const delta = goal - state.total;
    if (delta === 0) return { bucket, delta: 0 };
    const revision = state.lastRevision + 1;
    const entry = {
      _id: entryId(bucket, revision),
      businessId: BUSINESS_ID,
      bucket,
      revision,
      delta,
      target: goal,
      previousTotal: state.total,
      sourceType: spec.sourceType,
      sourceIds: (spec.sourceIds || []).slice(0, 200).map(String),
      stage: spec.stage || null,
      mastery: spec.mastery || null,
      ruleVersion: spec.ruleVersion || XP_RULES.version,
      occurredAt: spec.occurredAt || now,
      processedAt: now,
      correctsEntryId: state.lastRevision > 0 ? entryId(bucket, state.lastRevision) : null,
      reason: spec.reason || null,
      actor: spec.actor || "system",
    };
    try {
      await cols.ledger.insertOne(entry);
      return { bucket, delta, entry };
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      state = null; // 다른 요청이 같은 revision 을 먼저 썼다 — 다시 읽는다.
    }
  }
  const error = new Error(`ops_xp_ledger_conflict:${bucket}`);
  error.code = "OPS_XP_CONFLICT";
  throw error;
}

/** 작업 XP 전체를 다시 계산해 차이만 기록한다. 완료가 취소된 퀘스트의 버킷은 목표 0 으로 내려간다. */
export async function syncTaskXp(cols, { now = new Date(), actor = "system", reason = "task_sync" } = {}) {
  // 완료 후 원본 일정에서 빠져 보관된 퀘스트도 이미 한 일이므로 보상을 유지한다.
  const done = await cols.quests.find(
    { xpVerifiedAt: { $ne: null }, $or: [{ status: "done" }, { status: "archived", archivedFromStatus: "done" }] },
    { projection: { kind: 1, xpVerifiedAt: 1 } },
  ).toArray();
  const { buckets, perQuest } = allocateTaskXp(done);
  const existingRows = await cols.ledger.find({ _id: prefixRange("task:") }, { projection: { delta: 1, bucket: 1 } }).toArray();
  const existing = summarizeRows(existingRows);
  for (const key of existing.keys()) {
    if (!buckets.has(key)) {
      const [, date, mastery] = key.split(":");
      buckets.set(key, { bucket: key, date, mastery, target: 0, sourceIds: [] });
    }
  }
  const changes = [];
  for (const bucket of [...buckets.values()].sort((a, b) => a.bucket.localeCompare(b.bucket))) {
    const known = existing.get(bucket.bucket) || { total: 0, lastRevision: 0 };
    if (known.total === bucket.target) continue;
    const result = await applyBucketTarget(cols, {
      bucket: bucket.bucket,
      target: bucket.target,
      sourceType: "task",
      sourceIds: bucket.sourceIds,
      mastery: bucket.mastery,
      stage: "done",
      occurredAt: new Date(`${bucket.date}T12:00:00+09:00`),
      reason,
      actor,
      now,
    }, { known });
    if (result.delta) changes.push(result);
  }
  return { changes, perQuest };
}

/** 원장 합계 → ops_xp_state 캐시. 최고 레벨은 $max 로만 올라가고 환불로 내려가지 않는다. */
export async function recomputeXpState(cols, { now = new Date() } = {}) {
  const rows = await cols.ledger.find({}, { projection: { delta: 1, sourceType: 1, mastery: 1 } }).toArray();
  let total = 0;
  const bySource = { task: 0, revenue: 0, traffic: 0 };
  const byMastery = Object.fromEntries(Object.keys(MASTERY_LABELS).map((key) => [key, 0]));
  for (const row of rows) {
    const delta = Number(row.delta) || 0;
    total += delta;
    bySource[row.sourceType] = (bySource[row.sourceType] || 0) + delta;
    if (row.mastery) byMastery[row.mastery] = (byMastery[row.mastery] || 0) + delta;
  }
  total = Math.max(0, total);
  const level = levelForXp(total);
  await cols.xpState.updateOne(
    { _id: BUSINESS_ID },
    {
      $set: { total, bySource, byMastery, level, ruleVersion: XP_RULES.version, updatedAt: now, entryCount: rows.length },
      $max: { peakLevel: level, peakXp: total },
      // 처음 만들 때는 지금 레벨을 이미 본 것으로 둔다 — 첫 화면에서 레벨업 연출이 터지지 않게.
      $setOnInsert: { ackLevel: level, createdAt: now },
    },
    { upsert: true },
  );
  return readXpState(cols);
}

export async function readXpState(cols) {
  const state = await cols.xpState.findOne({ _id: BUSINESS_ID });
  const total = Number(state?.total) || 0;
  const level = describeLevel(total);
  const peakLevel = Math.max(Number(state?.peakLevel) || 1, level.level);
  const ackLevel = Number(state?.ackLevel) || level.level;
  return {
    ...level,
    peakLevel,
    peakXp: Math.max(Number(state?.peakXp) || 0, total),
    ackLevel,
    pendingLevelUp: level.level > ackLevel ? { from: ackLevel, to: level.level } : null,
    bySource: state?.bySource || { task: 0, revenue: 0, traffic: 0 },
    byMastery: state?.byMastery || {},
    ruleVersion: XP_RULES.version,
    updatedAt: state?.updatedAt || null,
  };
}

/** 레벨업 연출을 봤다고 기록한다. $max 라 레벨이 내려갔다 다시 올라도 같은 레벨을 두 번 축하하지 않는다. */
export async function acknowledgeLevel(cols, { now = new Date() } = {}) {
  const state = await readXpState(cols);
  await cols.xpState.updateOne({ _id: BUSINESS_ID }, { $max: { ackLevel: state.level }, $set: { ackedAt: now } }, { upsert: true });
  return readXpState(cols);
}

export async function listLedger(cols, { limit = 50, sourceType = null } = {}) {
  const filter = sourceType ? { sourceType } : {};
  return cols.ledger.find(filter).sort({ processedAt: -1, _id: -1 }).limit(Math.min(200, Math.max(1, limit))).toArray();
}

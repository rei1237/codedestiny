// 트래픽 스냅샷(ops_traffic_snapshots) → 트래픽 XP 일 버킷.
//
// 대표 원천은 GA4 하나(유효 참여 세션). 스냅샷 _id = "ga4:<속성>:<날짜>".
// 값이 바뀌면 revision 을 올리고 이전 값을 history 에 남긴다. 하향 정정도 그대로 반영되어
// 버킷 목표가 내려가면 원장에 음수 delta 가 생긴다.
// 상태 구분: integration_pending(연동 대기 — XP 0, 값 없음) / error(조회 실패 — 직전 값 유지) /
//           provisional(최근 3일, 다시 조회함) / final(확정). 실제 0 세션은 final·provisional 에 value 0 으로 남는다.

import { applyBucketTarget, trafficXpTarget, XP_RULES } from "./xp.js";
import { addDaysKey, kstDateKey } from "./time.js";
import { GA4_METRIC_DEF, fetchGa4DailyEngagement, ga4Readiness } from "./ga4-connector.js";

export const TRAFFIC_SOURCE = "ga4";
const PROVISIONAL_DAYS = 3;
const MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 120;

export const TRAFFIC_STATE_LABELS = Object.freeze({
  integration_pending: "연동 대기",
  error: "조회 실패",
  provisional: "잠정(최근 3일 재조회)",
  final: "확정",
});

export function snapshotId(propertyId, date) {
  return `${TRAFFIC_SOURCE}:${propertyId}:${date}`;
}

export function trafficBucket(date) {
  return `traffic:${TRAFFIC_SOURCE}:${date}`;
}

/** 조회 결과 한 행 → 스냅샷 상태. 순수 함수. */
export function snapshotStatusFor(date, today) {
  return date > addDaysKey(today, -PROVISIONAL_DAYS) ? "provisional" : "final";
}

/** 다시 조회해야 하는 첫 날짜 — 확정되지 않은 가장 이른 날(최근 3일은 항상 포함). */
export function firstDateToFetch(since, today, finalDates) {
  const floor = addDaysKey(today, -MAX_RANGE_DAYS);
  let date = since > floor ? since : floor;
  while (date <= today && finalDates.has(date)) date = addDaysKey(date, 1);
  const recent = addDaysKey(today, -PROVISIONAL_DAYS);
  return date < recent ? date : recent < since ? since : recent;
}

/**
 * GA4 일별 값을 스냅샷과 XP 버킷에 반영한다.
 * force 가 아니면 6시간에 한 번만 외부 API 를 부른다(10분 크론 대응).
 */
export async function syncTraffic(env, cols, { settings, now = new Date(), force = false, fetcher = fetchGa4DailyEngagement, actor = "system" } = {}) {
  const readiness = ga4Readiness(env);
  const state = await cols.syncState.findOne({ _id: "traffic" });
  if (!readiness.ready) {
    await cols.syncState.updateOne(
      { _id: "traffic" },
      { $set: { source: TRAFFIC_SOURCE, status: "integration_pending", missing: readiness.missing, lastRunAt: now, lastError: null }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
    return { status: "integration_pending", missing: readiness.missing };
  }
  if (!force && state?.lastSuccessAt && now.getTime() - new Date(state.lastSuccessAt).getTime() < MIN_INTERVAL_MS) {
    return { status: "skipped", reason: "recent" };
  }

  const today = kstDateKey(now);
  const since = settings.revenueSince;
  const finals = await cols.traffic.find({ source: TRAFFIC_SOURCE, propertyId: readiness.propertyId, status: "final" }, { projection: { date: 1 } }).toArray();
  const startDate = firstDateToFetch(since, today, new Set(finals.map((row) => row.date)));
  if (startDate > today) return { status: "skipped", reason: "before_start" };

  let report;
  try {
    report = await fetcher(env, { startDate, endDate: today });
  } catch (error) {
    await cols.syncState.updateOne(
      { _id: "traffic" },
      { $set: { source: TRAFFIC_SOURCE, status: "error", lastRunAt: now, lastError: { code: error?.code || "GA4_ERROR", message: String(error?.message || "").slice(0, 200), at: now } }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
    return { status: "error", code: error?.code || "GA4_ERROR" };
  }

  const changes = [];
  for (const row of report.rows) {
    if (row.date < since || row.date > today) continue;
    const _id = snapshotId(report.propertyId, row.date);
    const status = snapshotStatusFor(row.date, today);
    const existing = await cols.traffic.findOne({ _id });
    const same = existing && existing.value === row.engagedSessions && existing.status === status;
    if (!same) {
      await cols.traffic.updateOne(
        { _id },
        {
          $set: {
            source: TRAFFIC_SOURCE,
            propertyId: report.propertyId,
            date: row.date,
            timeZone: report.timeZone,
            metricDef: GA4_METRIC_DEF,
            filters: { note: "GA4 속성의 내부 트래픽 필터를 따른다(이 쪽에서 추가 필터 없음)" },
            value: row.engagedSessions,
            sessions: row.sessions,
            status,
            fetchedAt: now,
            updatedAt: now,
          },
          $inc: { revision: 1 },
          $setOnInsert: { createdAt: now },
          ...(existing ? { $push: { history: { $each: [{ at: now, value: existing.value, status: existing.status, revision: existing.revision }], $slice: -30 } } } : {}),
        },
        { upsert: true },
      );
    }
    const result = await applyBucketTarget(cols, {
      bucket: trafficBucket(row.date),
      target: trafficXpTarget(row.engagedSessions),
      sourceType: "traffic",
      sourceIds: [_id],
      stage: status,
      reason: existing && existing.value !== row.engagedSessions ? "traffic_correction" : "traffic_sync",
      occurredAt: new Date(`${row.date}T12:00:00+09:00`),
      actor,
      now,
    });
    if (result.delta) changes.push(result);
  }

  await cols.syncState.updateOne(
    { _id: "traffic" },
    {
      $set: {
        source: TRAFFIC_SOURCE,
        status: "connected",
        missing: [],
        propertyId: report.propertyId,
        timeZone: report.timeZone,
        timeZoneMismatch: Boolean(report.timeZone && report.timeZone !== "Asia/Seoul"),
        lastRunAt: now,
        lastSuccessAt: now,
        lastError: null,
        window: { since: startDate, until: today },
        counts: { rows: report.rows.length, ledgerChanges: changes.length },
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  return { status: "connected", rows: report.rows.length, changes: changes.length };
}

/** 화면용 — 기간 스냅샷과 연동 상태. 연동 대기면 rows 가 비고 status 로 구분한다. */
export async function readTraffic(env, cols, { fromDate, toDate }) {
  const readiness = ga4Readiness(env);
  const state = await cols.syncState.findOne({ _id: "traffic" });
  const rows = readiness.ready
    ? await cols.traffic.find({ source: TRAFFIC_SOURCE, propertyId: readiness.propertyId, date: { $gte: fromDate, $lte: toDate } }).sort({ date: 1 }).toArray()
    : [];
  const status = !readiness.ready ? "integration_pending" : state?.status === "error" ? "error" : state?.lastSuccessAt ? "connected" : "waiting_first_sync";
  return {
    source: TRAFFIC_SOURCE,
    status,
    statusLabel: { integration_pending: "연동 대기", error: "조회 실패", connected: "연결됨", waiting_first_sync: "첫 집계 대기" }[status],
    missing: readiness.missing,
    metric: GA4_METRIC_DEF,
    rule: { sessionsPerXp: XP_RULES.traffic.sessionsPerXp, dailyCap: XP_RULES.traffic.dailyCap },
    lastSuccessAt: state?.lastSuccessAt || null,
    lastError: state?.lastError || null,
    timeZoneMismatch: Boolean(state?.timeZoneMismatch),
    rows: rows.map((row) => ({
      date: row.date,
      engagedSessions: row.value,
      sessions: row.sessions ?? null,
      status: row.status,
      statusLabel: TRAFFIC_STATE_LABELS[row.status],
      revision: row.revision || 1,
      corrected: (row.history || []).length > 0,
      xp: trafficXpTarget(row.value),
    })),
    attribution: { label: "귀속 미확인", note: "캠페인별 귀속은 growth-20261012-v2 UTM 이 붙은 방문부터 집계됩니다." },
  };
}

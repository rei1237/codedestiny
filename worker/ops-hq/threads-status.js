// Threads 자동 발행 → 퀘스트 "자동 발행 확인". 🔴 읽기 전용.
//
// 기존 자동화(worker/lib/threads-daily-jobs.js)가 남기는 idempotency_keys 만 읽는다.
//   split 모드: endpoint cron:sns-threads-daily, keyHash YYYY-MM-DD:threads:<type>
//   chain 모드: endpoint cron:sns-daily-post,   keyHash YYYY-MM-DD:threads (07:00 일괄)
// 🔴 /api/admin/sns-daily-post/run 이나 runThreadsDailyJobs 를 부르지 않는다 — 확인이 발행을 일으키면 안 된다.
// 🔴 대체 편성(수요일 12:00 브랜드 홍보, 일요일 신년 예약)은 기존 함수로 판정해 표시에만 반영한다.

import { withMongoRetry } from "../lib/db.js";
import { IdempotencyKey } from "../lib/models.js";
import {
  THREADS_DAILY_JOBS,
  THREADS_JOB_ENDPOINT,
  isEditorialSlotReserved,
  isJobEnabled,
  resolveJobSchedule,
} from "../lib/threads-daily-jobs.js";
import { getWeeklyThreadsBrandPromo } from "../lib/threads-daily-providers/brand-promo.js";
import { getThreadsPostMode } from "../lib/sns-daily-post-task.js";
import { kstDateTime } from "./time.js";

const CHAIN_ENDPOINT = "cron:sns-daily-post";
const WINDOW_MS = 60 * 60 * 1000;

const TYPE_LABELS = Object.freeze({
  zodiac: "띠별 운세",
  saju: "사주",
  karma: "카르마 마음 노트",
  ziwei: "자미두수",
  vedic: "베다",
  numerology: "수비학",
  chain: "일괄 발행",
});

export const THREADS_STATE_LABELS = Object.freeze({
  confirmed: "자동 확인",
  needs_check: "확인 필요",
  running: "진행 중",
  retrying: "재시도 대기",
  failed: "실패",
  waiting: "발행 전",
  missed: "기록 없음",
  reserved: "별도 편성으로 대체",
  disabled: "자동화 꺼짐",
});

/** 한 Job 의 기록 → 표시 상태. 순수 함수. */
export function classifyThreadsJob(doc, { startAt, now = new Date(), reserved = false, disabled = false }) {
  if (disabled) return "disabled";
  if (reserved) return "reserved";
  const closed = startAt ? now.getTime() >= startAt.getTime() + WINDOW_MS : true;
  if (!doc) return closed ? "missed" : "waiting";
  if (doc.status === "success") {
    const ref = doc.responseRef || {};
    const ids = Array.isArray(ref.ids) ? ref.ids.filter(Boolean) : ref.postId ? [ref.postId] : [];
    return ids.length && !ref.publishUncertain ? "confirmed" : "needs_check";
  }
  if (doc.status === "failed") return closed ? "failed" : "retrying";
  return "running";
}

/** 그 날짜에 기대되는 자동 Job 목록(설정값 기준). */
export function expectedThreadsJobs(env, dateKey) {
  const mode = getThreadsPostMode(env);
  if (mode === "chain") {
    return { mode, jobs: [{ type: "chain", label: TYPE_LABELS.chain, time: "07:00", endpoint: CHAIN_ENDPOINT, keyHash: `${dateKey}:threads`, reserved: false, note: null }] };
  }
  const jobs = THREADS_DAILY_JOBS.filter((job) => isJobEnabled(env, job)).map((job) => {
    const schedule = resolveJobSchedule(env, job);
    const promo = job.type === "saju" ? getWeeklyThreadsBrandPromo(dateKey) : null;
    const reserved = isEditorialSlotReserved(job.type, dateKey);
    return {
      type: job.type,
      label: TYPE_LABELS[job.type] || job.type,
      time: schedule.invalid ? null : schedule.value,
      endpoint: THREADS_JOB_ENDPOINT,
      keyHash: `${dateKey}:threads:${job.type}`,
      reserved,
      note: reserved ? "기존 별도 편성이 이 슬롯을 대신합니다" : promo ? "수요일 서비스 홍보가 이 슬롯으로 나갑니다" : null,
    };
  });
  return { mode, jobs };
}

/** 여러 날짜의 자동 발행 상태. idempotency_keys 를 keyHash 로만 조회한다(읽기). */
export async function readThreadsStatus(env, dateKeys, { now = new Date() } = {}) {
  const plans = new Map(dateKeys.map((dateKey) => [dateKey, expectedThreadsJobs(env, dateKey)]));
  const wanted = [];
  for (const { jobs } of plans.values()) for (const job of jobs) wanted.push(job);
  const byEndpoint = new Map();
  for (const job of wanted) {
    const keys = byEndpoint.get(job.endpoint) || [];
    keys.push(job.keyHash);
    byEndpoint.set(job.endpoint, keys);
  }
  const docs = new Map();
  for (const [endpoint, keys] of byEndpoint) {
    if (!keys.length) continue;
    const rows = await withMongoRetry(env, () => IdempotencyKey.find({ userId: null, endpoint, keyHash: { $in: keys } })
      .select({ keyHash: 1, status: 1, responseRef: 1, updatedAt: 1 })
      .lean());
    for (const row of rows) docs.set(`${endpoint}|${row.keyHash}`, row);
  }
  const result = {};
  for (const [dateKey, { mode, jobs }] of plans) {
    const presented = jobs.map((job) => {
      const doc = docs.get(`${job.endpoint}|${job.keyHash}`) || null;
      const state = classifyThreadsJob(doc, {
        startAt: job.time ? kstDateTime(dateKey, job.time) : null,
        now,
        reserved: job.reserved,
        disabled: mode === "off",
      });
      const ref = doc?.responseRef || {};
      return {
        type: job.type,
        label: job.label,
        time: job.time,
        note: job.note,
        state,
        stateLabel: THREADS_STATE_LABELS[state],
        postIds: Array.isArray(ref.ids) ? ref.ids.slice(0, 20) : [],
        error: doc?.status === "failed" ? String(ref.error || ref.code || "failed").slice(0, 160) : null,
        updatedAt: doc?.updatedAt || null,
      };
    });
    const counted = presented.filter((job) => job.state !== "reserved");
    result[dateKey] = {
      mode,
      jobs: presented,
      allConfirmed: mode !== "off" && counted.length > 0 && counted.every((job) => job.state === "confirmed"),
      attention: presented.some((job) => ["needs_check", "failed", "missed"].includes(job.state)),
    };
  }
  return result;
}

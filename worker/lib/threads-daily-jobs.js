// Threads 유형별 일일 발행 Job — 사주 08:30 / 자미두수 12:00 / 베다 16:00 / 수비학 20:30 KST.
//
// 매 10분 크론(worker/index.js 의 PAYMENT_RECONCILE_CRON 분기)이 부른다. 워커 크론 구조는 그대로 두고
// Job 마다 [설정 시각, +60분) 발행 창을 연다 — 창 안의 틱(최대 6회)이 곧 자동 재시도다.
//
// 🔴 잠금·재시도는 새로 만들지 않는다. sns-daily-post-task.js 의 runChannel(선점 → 표식 → send → 기록)을
//    엔드포인트만 바꿔 그대로 쓴다: `cron:sns-threads-daily` + `YYYY-MM-DD:threads:<type>`.
//    같은 날·같은 type 이 성공했으면 unique 인덱스에 걸려 already_posted, 실패+발행 0건만 다음 틱에 재선점.
// 🔴 Job 끼리는 Promise.allSettled 로 격리한다 — 사주가 죽어도 자미두수는 제 시각에 나간다.
// 🔴 창 밖 틱은 DB 도 네트워크도 타지 않는다(하루 144회 중 대부분이 무비용).
// 🔴 SNS_THREADS_POST_ENABLED 가 "split" 이 아니면 아무것도 안 한다 — "1" 이면 07:00 체인(sns-daily-post)이 발행한다.
//    "split" 이면 그 체인의 Threads 채널이 threads_split_active 로 빠지고 이 모듈이 넘겨받는다. 텔레그램은 무관하다.

import { connectDb } from "./db.js";
import { getEnv } from "./env.js";
import { notifyCronTaskFailures } from "./cron-failure-alert.js";
import { getKstDateKey, getSiteBaseUrl } from "./daily-fortune-task.js";
import { getThreadsPostMode, getThreadsSkipReason, isSwitchOn, runChannel } from "./sns-daily-post-task.js";
import { postThreadsChain } from "./threads.js";
import { buildUtmUrl } from "./threads-daily-providers/shared.js";
import * as sajuProvider from "./threads-daily-providers/saju.js";
import * as ziweiProvider from "./threads-daily-providers/ziwei.js";
import * as vedicProvider from "./threads-daily-providers/vedic.js";
import * as numerologyProvider from "./threads-daily-providers/numerology.js";

export const THREADS_JOB_ENDPOINT = "cron:sns-threads-daily";

const KST_OFFSET_MINUTES = 9 * 60;
const WINDOW_MINUTES = 60;
// 창이 KST 자정을 넘으면 뒤쪽 틱이 다음 날 dateKey 로 한 번 더 발행한다 — 23:00 이후 설정은 거부한다.
const LATEST_START_MINUTES = 23 * 60;
const MIN_GAP_MINUTES = 120;
// 10분 크론의 마지막 창 안 틱. 알림은 이 틱에서만 — 앞의 5번은 재시도 기회라 울릴 이유가 없다.
const LAST_TICK_OFFSET_MINUTES = WINDOW_MINUTES - 10;

export const THREADS_DAILY_JOBS = Object.freeze([
  { type: "saju", name: "daily-saju", timeVar: "THREADS_SAJU_TIME", defaultTime: "08:30" },
  { type: "ziwei", name: "daily-ziwei", timeVar: "THREADS_ZIWEI_TIME", defaultTime: "12:00" },
  { type: "vedic", name: "daily-vedic", timeVar: "THREADS_VEDIC_TIME", defaultTime: "16:00" },
  // 수비학은 기본으로 켜진다. 워커 바인딩 예산(126/128) 때문에 켜는 var 를 두지 않고, 급할 때만
  // THREADS_NUMEROLOGY_ENABLED="0" 을 넣어 이 Job 하나를 끈다(값이 비어 있으면 defaultEnabled).
  { type: "numerology", name: "daily-tarot-or-numerology", timeVar: "THREADS_NUMEROLOGY_TIME", defaultTime: "20:30", enableVar: "THREADS_NUMEROLOGY_ENABLED", defaultEnabled: true },
]);

export const DEFAULT_PROVIDERS = Object.freeze({
  saju: sajuProvider,
  ziwei: ziweiProvider,
  vedic: vedicProvider,
  numerology: numerologyProvider,
});

/** enableVar 가 없으면 켜짐. 값이 비어 있으면 defaultEnabled, 값이 있으면 1/true/on/yes 만 켜짐. */
export function isJobEnabled(env, job) {
  if (!job.enableVar) return true;
  if (!String(getEnv(env, job.enableVar) ?? "").trim()) return Boolean(job.defaultEnabled);
  return isSwitchOn(env, job.enableVar);
}

/** "HH:MM" → KST 자정 기준 분. 형식이 틀리거나 23:00 이후면 null(해당 Job 만 건너뛴다). */
export function parseJobTime(raw) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(raw ?? "").trim());
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes > LATEST_START_MINUTES ? null : minutes;
}

export function kstMinuteOfDay(now) {
  const date = new Date(now);
  return (date.getUTCHours() * 60 + date.getUTCMinutes() + KST_OFFSET_MINUTES) % (24 * 60);
}

/** 설정값 해석. 비어 있으면 기본 시각, 값이 있는데 틀리면 invalid(기본값으로 조용히 돌리지 않는다). */
export function resolveJobSchedule(env, job) {
  const raw = String(getEnv(env, job.timeVar) || "").trim();
  const value = raw || job.defaultTime;
  const start = parseJobTime(value);
  return { value, start, invalid: start === null };
}

/** 인접 Job 간격이 2시간 미만이면 경고 문구 목록. 발행은 막지 않는다(로그만). */
export function findCrowdedJobs(schedules) {
  const valid = schedules.filter((row) => !row.invalid).sort((a, b) => a.start - b.start);
  const warnings = [];
  for (let i = 1; i < valid.length; i += 1) {
    const gap = valid[i].start - valid[i - 1].start;
    if (gap < MIN_GAP_MINUTES) warnings.push(`${valid[i - 1].type}→${valid[i].type} ${gap}분`);
  }
  return warnings;
}

function errorMessage(error) {
  return String(error?.message || error || "unknown");
}

/**
 * 한 유형의 발행 실행부 — runChannel 의 send 계약({ok, status, error?, permanent?, ref})을 지키고 던지지 않는다.
 * 순서: 정본 엔진 facts → 문안(LLM 은 문장만, 검증·폴백) → formatter → Threads 1건.
 */
export async function publishThreadsJob(env, { type, provider, now, fetchImpl, generateImpl, sky }) {
  const base = { date: getKstDateKey(now), platform: "threads", account: "codedestiny_official", type, posts: 1 };
  let facts;
  try {
    facts = await provider.buildFacts(env, now, { sky, requestUrl: getSiteBaseUrl(env) });
  } catch (error) {
    return { ok: false, status: 0, error: `facts_threw: ${errorMessage(error)}`, ref: { ...base, ids: [] } };
  }
  if (!facts) return { ok: false, status: 0, error: "facts_unavailable", ref: { ...base, ids: [] } };

  let text;
  let written;
  try {
    written = await provider.writeCopy(env, facts, { generateImpl });
    text = provider.format(facts, written.copy, buildUtmUrl(getSiteBaseUrl(env), provider.PATH, type));
  } catch (error) {
    return { ok: false, status: 0, error: `format_threw: ${errorMessage(error)}`, ref: { ...base, ids: [] } };
  }

  const result = await postThreadsChain(env, { texts: [text], fetchImpl });
  const ids = Array.isArray(result.ids) ? result.ids : [];
  const ref = { ...base, ids, postId: ids[0] || null, aiModel: written.model || null, rejected: written.rejected || [] };
  if (!result.ok) {
    return {
      ok: false,
      status: result.status ?? 0,
      error: result.error || "threads_failed",
      permanent: Boolean(result.permanent),
      code: result.code ?? null,
      endpoint: result.endpoint || null,
      ref: { ...ref, failedAt: result.failedAt ?? null, endpoint: result.endpoint || null, code: result.code ?? null, errorType: result.type || null, subcode: result.subcode ?? null },
    };
  }
  return { ok: true, status: result.status ?? 200, ref };
}

/**
 * @param {Object} env
 * @param {Object} [options]
 * @param {number} [options.now] epoch ms
 * @param {string} [options.only] 이 type 만. 관리자 수동 실행용.
 * @param {boolean} [options.force] 발행 창을 무시한다(관리자 수동 실행). 잠금·스위치·토큰 검사는 그대로다.
 * @param {Function} [options.fetchImpl] Threads·알림 fetch 주입구
 * @param {Function} [options.generateImpl] LLM 주입구
 * @param {Function} [options.runLocked] runChannel 대체(검증용)
 * @param {Function} [options.connect] connectDb 대체(검증용)
 * @param {Object} [options.providers] type → provider
 * @param {Function} [options.notify] notifyCronTaskFailures 대체(검증용)
 * @param {Object} [options.sky] 베다 하늘 값 주입(검증용)
 */
export async function runThreadsDailyJobs(env, options = {}) {
  const now = typeof options.now === "number" ? options.now : Date.now();
  const only = options.only ? String(options.only) : "";
  const force = Boolean(options.force);
  const providers = options.providers || DEFAULT_PROVIDERS;
  const runLocked = options.runLocked || runChannel;
  const connect = options.connect || connectDb;
  const notify = options.notify || notifyCronTaskFailures;

  if (getThreadsPostMode(env) !== "split") return { ok: true, skipped: "split_disabled" };
  const skipReason = getThreadsSkipReason(env);
  if (skipReason) return { ok: true, skipped: skipReason };

  const nowMinute = kstMinuteOfDay(now);
  const dateKey = getKstDateKey(now);
  const jobs = {};
  const due = [];
  const schedules = [];

  for (const job of THREADS_DAILY_JOBS) {
    if (only && job.type !== only) continue;
    const schedule = { type: job.type, ...resolveJobSchedule(env, job) };
    schedules.push(schedule);
    if (!isJobEnabled(env, job)) {
      jobs[job.type] = { ok: true, skipped: "job_disabled" };
      continue;
    }
    if (schedule.invalid) {
      console.error(`[CRON] Threads ${job.name}: ${job.timeVar}="${schedule.value}" 는 HH:MM(00:00~23:00)이 아니다 — 이 Job 만 건너뛴다.`);
      jobs[job.type] = { ok: true, skipped: "invalid_time", value: schedule.value };
      continue;
    }
    const offset = nowMinute - schedule.start;
    if (!force && (offset < 0 || offset >= WINDOW_MINUTES)) {
      jobs[job.type] = { ok: true, skipped: "outside_window" };
      continue;
    }
    if (!providers[job.type]) {
      jobs[job.type] = { ok: true, skipped: "provider_missing" };
      continue;
    }
    due.push({ job, offset });
  }

  if (!only) {
    const crowded = findCrowdedJobs(schedules);
    if (crowded.length && due.length) console.warn(`[CRON] Threads daily: 발행 간격이 2시간 미만이다 — ${crowded.join(", ")}`);
  }
  if (due.length === 0) return { ok: true, dateKey, jobs };

  try {
    await connect(env);
  } catch (error) {
    const message = `stage=connect_db ${errorMessage(error)}`;
    for (const { job } of due) jobs[job.type] = { ok: false, stage: "connect_db", error: message };
  }

  const pending = due.filter(({ job }) => !jobs[job.type]);
  const settled = await Promise.allSettled(pending.map(({ job }) => runLocked({
    env,
    now,
    endpoint: THREADS_JOB_ENDPOINT,
    keyHash: `${dateKey}:threads:${job.type}`,
    send: () => publishThreadsJob(env, {
      type: job.type,
      provider: providers[job.type],
      now,
      fetchImpl: options.fetchImpl,
      generateImpl: options.generateImpl,
      sky: options.sky,
    }),
  })));
  settled.forEach((outcome, index) => {
    const { job } = pending[index];
    jobs[job.type] = outcome.status === "fulfilled"
      ? outcome.value
      : { ok: false, stage: "lock", error: errorMessage(outcome.reason) };
  });

  const failures = [];
  for (const { job, offset } of due) {
    const result = jobs[job.type];
    if (result.ok) continue;
    console.error(`[CRON] Threads ${job.name} 실패(${dateKey}) stage=${result.stage || "send"} — ${result.error}`);
    // 🔴 알림은 Job 당 하루 1통 — 창의 마지막 틱에서도 실패일 때만. 앞 틱의 실패는 다음 틱이 재시도한다.
    // 수동 실행(force)은 응답으로 바로 보이므로 알리지 않는다.
    if (!force && offset >= LAST_TICK_OFFSET_MINUTES) {
      failures.push({
        name: `threads:${job.name}`,
        message: `${dateKey} stage=${result.stage || "send"} ${result.error}${result.code == null ? "" : ` [code=${result.code}${result.endpoint ? ` @${result.endpoint}` : ""}]`}${result.permanent ? " [토큰 회전 필요]" : ""}`,
      });
    }
  }
  if (failures.length) await notify(env, failures, { fetchImpl: options.fetchImpl });

  return { ok: due.every(({ job }) => jobs[job.type].ok), dateKey, jobs };
}

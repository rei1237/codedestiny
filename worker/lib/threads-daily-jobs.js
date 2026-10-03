// Threads 유형별 일일 발행 Job — 띠별 08:30 / 사주 12:00 / 카르마 20:30 KST(2026-10-02 개편).
// 자미두수·베다·수비학은 용어가 읽히지 않아 조회수가 없어 기본으로 끈다 — 코드는 보존, enableVar 로 재가동.
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

import { connectDb, withMongoRetry } from "./db.js";
import { IdempotencyKey } from "./models.js";
import { getEnv } from "./env.js";
import { notifyCronTaskFailures } from "./cron-failure-alert.js";
import { getKstDateKey, getSiteBaseUrl } from "./daily-fortune-task.js";
import { getThreadsPostMode, getThreadsSkipReason, isSwitchOn, runChannel } from "./sns-daily-post-task.js";
import { postThreadsChain } from "./threads.js";
import { buildUtmUrl, PROMPT_VERSION, repeatsRecent } from "./threads-daily-providers/shared.js";
import * as zodiacProvider from "./threads-daily-providers/zodiac.js";
import * as karmaProvider from "./threads-daily-providers/karma.js";
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
  { type: "zodiac", name: "daily-zodiac", timeVar: "THREADS_ZODIAC_TIME", defaultTime: "08:30" },
  { type: "saju", name: "daily-saju", timeVar: "THREADS_SAJU_TIME", defaultTime: "12:00" },
  { type: "karma", name: "daily-karma", timeVar: "THREADS_KARMA_TIME", defaultTime: "20:30" },
  // 아래 셋은 기본 꺼짐(값이 비어 있으면 defaultEnabled). 워커 바인딩 예산(126/128) 때문에 wrangler 에 var 를
  // 미리 두지 않는다 — 다시 켜려면 해당 *_ENABLED="1" 을 넣는다. 시각은 켜진 Job 과 2시간 이상 떨어뜨려 둔다.
  { type: "ziwei", name: "daily-ziwei", timeVar: "THREADS_ZIWEI_TIME", defaultTime: "14:00", enableVar: "THREADS_ZIWEI_ENABLED", defaultEnabled: false },
  { type: "vedic", name: "daily-vedic", timeVar: "THREADS_VEDIC_TIME", defaultTime: "16:00", enableVar: "THREADS_VEDIC_ENABLED", defaultEnabled: false },
  { type: "numerology", name: "daily-tarot-or-numerology", timeVar: "THREADS_NUMEROLOGY_TIME", defaultTime: "18:00", enableVar: "THREADS_NUMEROLOGY_ENABLED", defaultEnabled: false },
]);

export const DEFAULT_PROVIDERS = Object.freeze({
  zodiac: zodiacProvider,
  saju: sajuProvider,
  karma: karmaProvider,
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

/** 기존 별도 캠페인이 정규 슬롯을 대체한다. 새 발행이나 잠금/재시도 경로를 만들지 않는다. */
export function isEditorialSlotReserved(type, dateKey) {
  if (type === "saju" && dateKey === "2026-10-05") return true;
  // 기존 일요일 21:10 신년 예약: 그날의 20:30 마음 노트 대신 한 편만 발행한다.
  return type === "karma" && dateKey >= "2026-11-01" && dateKey <= "2027-01-03"
    && new Date(`${dateKey}T12:00:00+09:00`).getUTCDay() === 0;
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
export async function readRecentThreadsPosts(env) {
  const rows = await withMongoRetry(env, () => IdempotencyKey.find({userId:null, endpoint:THREADS_JOB_ENDPOINT, status:"success"})
    .sort({updatedAt:-1}).limit(30).select({responseRef:1}).lean());
  return rows.map(row => row.responseRef).filter(row => row?.hook && row?.body);
}

export async function publishThreadsJob(env, { type, provider, now, fetchImpl, generateImpl, sky, recent = [] }) {
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
  const destinationUrl = buildUtmUrl(getSiteBaseUrl(env), provider.PATH, type, base.date);
  try {
    written = await provider.writeCopy(env, facts, { generateImpl, recent });
    if (repeatsRecent(written.copy, recent)) {
      // A reviewed deterministic replacement costs no second model call.
      written = await provider.writeCopy({...env, SNS_THREADS_AI_ENABLED:"0"}, facts, { recent });
      written.rejected = [...written.rejected, "recent_duplicate"];
    }
    text = provider.format(facts, written.copy, destinationUrl);
  } catch (error) {
    return { ok: false, status: 0, error: `format_threw: ${errorMessage(error)}`, ref: { ...base, ids: [] } };
  }

  const editorial = {promptVersion:PROMPT_VERSION, locale:"ko", topic:type, contentType:type === "karma" ? "conversation" : "daily_reflection",
    hook:written.copy.hook, body:written.copy.body, text, destinationUrl,
    campaignId:new URL(destinationUrl).searchParams.get("utm_campaign"),
    sourceBasis:type === "karma" ? `editorial_theme:${facts.themeId}` : `canonical_engine:${type}:${base.date}:Asia/Seoul`, recentCompared:recent.length};
  if (repeatsRecent(written.copy, recent)) return {ok:false,status:0,error:"editorial_review_required",
    ref:{...base,...editorial,ids:[],reviewRequired:true}};
  // provider 가 [본 글, 답글…] 을 돌려주면 체인으로 낸다(띠별: 티저 + 12띠 답글). 링크·CTA 는 본 글에 있다.
  const texts = Array.isArray(text) ? text : [text];
  editorial.text = texts[0];
  if (texts.length > 1) editorial.replies = texts.slice(1);
  base.posts = texts.length;
  const result = await postThreadsChain(env, { texts, fetchImpl });
  const ids = Array.isArray(result.ids) ? result.ids : [];
  const ref = { ...base, ...editorial, publishUncertain: Boolean(result.publishUncertain), containerId: result.containerId || null, ids, postId: ids[0] || null, aiModel: written.model || null, rejected: written.rejected || [] };
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
    if (!isJobEnabled(env, job)) {
      jobs[job.type] = { ok: true, skipped: "job_disabled" };
      continue;
    }
    if (isEditorialSlotReserved(job.type, dateKey)) {
      jobs[job.type] = { ok: true, skipped: "editorial_slot_reserved" };
      continue;
    }
    // 간격 경고는 켜진 Job 끼리만 본다 — 꺼진 Job 의 기본 시각이 헛경고를 내지 않게.
    const schedule = { type: job.type, ...resolveJobSchedule(env, job) };
    schedules.push(schedule);
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

  let recent = [];
  if (due.some(({job}) => !jobs[job.type])) {
    try { recent = await (options.readRecent || readRecentThreadsPosts)(env); }
    catch (error) { for (const {job} of due) if (!jobs[job.type]) jobs[job.type] = {ok:false,stage:"history",error:errorMessage(error)}; }
  }
  const pending = due.filter(({ job }) => !jobs[job.type]);
  const settled = await Promise.allSettled(pending.map(({ job }) => runLocked({
    env,
    now,
    endpoint: THREADS_JOB_ENDPOINT,
    keyHash: `${dateKey}:threads:${job.type}`,
    send: () => publishThreadsJob(env, {
      recent,
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

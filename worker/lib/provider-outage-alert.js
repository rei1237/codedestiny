import { getEnv } from './env.js';
import { GEMINI_OUTAGE_CODES } from '../../lib/gemini-provider-errors.mjs';

// Gemini spend-cap/billing outages reject every call until an operator acts.
// 2026-10-17: two paid orders were refunded and no operator alert went out.
// The request path records the outage and sends one alert; the ten-minute cron
// resends an undelivered alert and announces recovery. Neither path retries a
// generation, holds an order or changes the refund timing.

const PROVIDER_ID = 'gemini';
const REPORT_THROTTLE_MS = 60_000;
// Caller-side bound: a generation request never waits longer than this.
const REPORT_WAIT_MS = 3_000;
const ALERT_TIMEOUT_MS = 5_000;
// A still-failing outage is announced again at most hourly.
const ALERT_REPEAT_MS = 60 * 60_000;
// A claim left by a request cut off mid-send expires so the cron can resend.
const CLAIM_LEASE_MS = 2 * 60_000;
const RECOVERY_QUIET_MS = 20 * 60_000;

const OUTAGE_LABEL = {
  GEMINI_SPEND_CAP: '월 지출 한도 도달',
  GEMINI_BILLING_DISABLED: '결제 계정 비활성',
};

let lastReportAt = 0;

function hasMongoUri(env) {
  return ['MONGO_URI', 'MONGODB_URI', 'MONGO_URL', 'DATABASE_URL'].some(key => getEnv(env, key));
}

function kst(date) {
  return `${new Date(new Date(date).getTime() + 9 * 3600_000).toISOString().slice(0, 16).replace('T', ' ')} KST`;
}

// Codes and times only: no customer, order or prompt data.
export function outageAlertMessage(code, now) {
  return { subject: `[긴급] Gemini ${OUTAGE_LABEL[code] || code} — 유료 생성 중단`, text: [
    `원인 코드: ${code}`,
    `감지 시각: ${kst(now)}`,
    code === 'GEMINI_BILLING_DISABLED'
      ? 'Google Cloud Billing에서 Gemini API 키의 결제 계정 상태를 확인하세요.'
      : 'Google AI Studio / Cloud Billing에서 월 지출 한도를 올리세요.',
    '조치 전까지 Gemini 생성 요청은 모두 거절됩니다.',
    '영냥이 결제 주문은 생성 실패 후 약 20분 뒤 자동 환불됩니다.',
    '최근 20분간 같은 오류가 없으면 복구 추정 알림을 보냅니다.',
  ].join('\n') };
}

export function recoveryAlertMessage(row, now) {
  return { subject: '[복구 추정] Gemini 한도 오류가 최근 20분간 없음', text: [
    `원인 코드: ${row.code || '-'}`,
    `마지막 오류: ${kst(row.lastSeenAt)}`,
    `확인 시각: ${kst(now)}`,
    '최근 20분간 같은 오류가 기록되지 않았습니다. 유료 상담이 정상 생성되는지 확인하세요.',
  ].join('\n') };
}

async function notifyOperatorsLazily(env, message) {
  const { notifyOperators } = await import('./feedback-notify.js');
  return notifyOperators(env, message);
}

// Same contract as the yeongnyangi hold alert: bounded, and delivered only when
// at least one configured channel accepted it.
async function sendAlert(env, send, message) {
  let timer;
  try {
    const outcome = await Promise.race([Promise.resolve().then(() => send(env, message)),
      new Promise((_resolve, reject) => { timer = setTimeout(() => reject(new Error('alert_timeout')), ALERT_TIMEOUT_MS); })]);
    return Array.isArray(outcome?.results) && outcome.results.some(entry => entry?.ok === true && !entry?.skipped);
  } catch { return false; }
  finally { clearTimeout(timer); }
}

async function resolveDeps(options) {
  const db = options.connectDb && options.withMongoRetry ? {} : await import('./db.js');
  return {
    connect: options.connectDb || db.connectDb,
    retry: options.withMongoRetry || db.withMongoRetry,
    model: options.model || (await import('./provider-health-model.js')).ProviderHealth,
    notify: options.notify || notifyOperatorsLazily,
    now: options.now ? new Date(options.now) : new Date(),
  };
}

function openClaimFilter(now) {
  return { $or: [{ alertClaimedAt: null }, { alertClaimedAt: { $lte: new Date(now.getTime() - CLAIM_LEASE_MS) } }] };
}

async function claimAndSendOutageAlert(env, deps, code) {
  const { model, retry, notify, now } = deps;
  const claimed = await retry(env, () => model.findOneAndUpdate({
    _id: PROVIDER_ID,
    lastSeenAt: { $gt: new Date(now.getTime() - RECOVERY_QUIET_MS) },
    $and: [
      { $or: [{ alertedAt: null }, { alertedAt: { $lte: new Date(now.getTime() - ALERT_REPEAT_MS) } }] },
      openClaimFilter(now),
    ],
  }, { $set: { alertClaimedAt: now } }).lean());
  if (!claimed) return false;
  const delivered = await sendAlert(env, notify, outageAlertMessage(claimed.code || code, now));
  await retry(env, () => model.updateOne({ _id: PROVIDER_ID, alertClaimedAt: now }, delivered
    ? { $set: { alertClaimedAt: null, alertedAt: now, recoveredAt: null } }
    : { $set: { alertClaimedAt: null } }));
  return delivered;
}

async function recordOutage(env, code, options) {
  const deps = await resolveDeps(options);
  await deps.connect(env);
  const seen = () => deps.retry(env, () => deps.model.updateOne({ _id: PROVIDER_ID },
    { $set: { code, lastSeenAt: deps.now } }, { upsert: true }));
  // Two isolates creating the document at once: the loser updates the winner's row.
  await seen().catch(error => { if (error?.code === 11000) return seen(); throw error; });
  return { recorded: true, alerted: await claimAndSendOutageAlert(env, deps, code) };
}

/**
 * Called from the Gemini failure path. Never throws and never waits longer
 * than REPORT_WAIT_MS; a send cut off there is resent by checkProviderRecovery.
 */
export async function reportProviderOutage(env, code, options = {}) {
  if (!GEMINI_OUTAGE_CODES.includes(code)) return { skipped: 'unknown_code' };
  if (!options.model && !hasMongoUri(env)) return { skipped: 'no_db' };
  const nowMs = options.now ? new Date(options.now).getTime() : Date.now();
  if (nowMs - lastReportAt < REPORT_THROTTLE_MS) return { skipped: 'throttled' };
  lastReportAt = nowMs;
  let timer;
  try {
    return await Promise.race([recordOutage(env, code, options),
      new Promise(resolve => { timer = setTimeout(() => resolve({ skipped: 'timeout' }), options.waitMs ?? REPORT_WAIT_MS); })]);
  } catch (error) {
    console.warn('[provider-outage] report failed', String(error?.message || error).slice(0, 200));
    return { skipped: 'error' };
  } finally { clearTimeout(timer); }
}

// Ten-minute cron: resend an outage alert the request path could not deliver,
// then announce recovery once no outage was seen for RECOVERY_QUIET_MS.
export async function checkProviderRecovery(env, options = {}) {
  const deps = await resolveDeps(options);
  await deps.connect(env);
  const { model, retry, notify, now } = deps;
  const row = await retry(env, () => model.findById(PROVIDER_ID).lean());
  if (!row?.lastSeenAt) return { state: 'none' };
  if (new Date(row.lastSeenAt).getTime() > now.getTime() - RECOVERY_QUIET_MS) {
    return { state: 'outage', alerted: await claimAndSendOutageAlert(env, deps, row.code) };
  }
  if (!row.alertedAt) return { state: 'idle' };
  const claimed = await retry(env, () => model.updateOne({
    _id: PROVIDER_ID, alertedAt: row.alertedAt,
    lastSeenAt: { $lte: new Date(now.getTime() - RECOVERY_QUIET_MS) }, ...openClaimFilter(now),
  }, { $set: { alertedAt: null, recoveredAt: now } }));
  if (claimed.modifiedCount !== 1) return { state: 'idle' };
  const delivered = await sendAlert(env, notify, recoveryAlertMessage(row, now));
  // Undelivered: restore the alert marker so the next tick tries again.
  if (!delivered) {
    await retry(env, () => model.updateOne({ _id: PROVIDER_ID, alertedAt: null, recoveredAt: now },
      { $set: { alertedAt: row.alertedAt, recoveredAt: row.recoveredAt ?? null } }));
  }
  return { state: 'recovered', alerted: delivered };
}

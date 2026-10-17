import { getEnv } from './env.js';

// Shared plumbing for the provider-outage and LLM-budget operator alerts.

const ALERT_TIMEOUT_MS = 5_000;

export function hasMongoUri(env) {
  return ['MONGO_URI', 'MONGODB_URI', 'MONGO_URL', 'DATABASE_URL'].some(key => getEnv(env, key));
}

export function kstMinute(date) {
  return `${new Date(new Date(date).getTime() + 9 * 3600_000).toISOString().slice(0, 16).replace('T', ' ')} KST`;
}

async function notifyOperatorsLazily(env, message) {
  const { notifyOperators } = await import('./feedback-notify.js');
  return notifyOperators(env, message);
}

// Same contract as the yeongnyangi hold alert: bounded, and delivered only when
// at least one configured channel accepted it.
export async function sendOperatorAlert(env, send, message) {
  let timer;
  try {
    const outcome = await Promise.race([Promise.resolve().then(() => send(env, message)),
      new Promise((_resolve, reject) => { timer = setTimeout(() => reject(new Error('alert_timeout')), ALERT_TIMEOUT_MS); })]);
    return Array.isArray(outcome?.results) && outcome.results.some(entry => entry?.ok === true && !entry?.skipped);
  } catch { return false; }
  finally { clearTimeout(timer); }
}

// Request-path callers: never throw, never wait longer than waitMs. A write cut
// off by the timer keeps running; its late rejection is handled by the race.
export async function settleWithin(label, work, waitMs) {
  let timer;
  try {
    return await Promise.race([work(),
      new Promise(resolve => { timer = setTimeout(() => resolve({ skipped: 'timeout' }), waitMs); })]);
  } catch (error) {
    console.warn(`[${label}] failed`, String(error?.message || error).slice(0, 200));
    return { skipped: 'error' };
  } finally { clearTimeout(timer); }
}

// Tests inject connectDb/withMongoRetry/model/notify/now; production loads them lazily.
export async function resolveOpsDeps(options, loadModel) {
  const db = options.connectDb && options.withMongoRetry ? {} : await import('./db.js');
  return {
    connect: options.connectDb || db.connectDb,
    retry: options.withMongoRetry || db.withMongoRetry,
    model: options.model || await loadModel(),
    notify: options.notify || notifyOperatorsLazily,
    now: options.now ? new Date(options.now) : new Date(),
  };
}

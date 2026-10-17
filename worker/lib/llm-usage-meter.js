import { getEnv } from './env.js';
import { geminiCallCostUsd, normalizeGeminiModel } from '../../lib/gemini-tariffs.mjs';
import { hasMongoUri, kstMinute, resolveOpsDeps, sendOperatorAlert, settleWithin } from './ops-alert.js';

// Estimated Gemini spend, so the monthly cap is seen coming. 2026-10-17 the cap
// was reached with no warning and two paid orders were refunded. Every Gemini
// response adds its tokens and estimated USD; the ten-minute cron compares the
// month total with GEMINI_MONTHLY_BUDGET_USD and alerts once per threshold.
// Estimates only (KST month, reviewed list prices, no explicit-cache storage):
// the AI Studio Spend page stays the billing source of truth.

// Caller-side bound: a generation never waits longer than this for the meter.
const RECORD_WAIT_MS = 1_500;
const BUDGET_THRESHOLDS = [50, 80, 95];
const TOP_SERVICES = 5;
const DAY_MS = 86_400_000;

const loadModel = async () => (await import('./llm-usage-model.js')).LlmUsage;

function kstDay(now) {
  const iso = new Date(now.getTime() + 9 * 3600_000).toISOString();
  return { date: iso.slice(0, 10), month: iso.slice(0, 7) };
}

const tokens = value => (Number.isFinite(Number(value)) && Number(value) > 0 ? Math.round(Number(value)) : 0);

async function writeUsage(env, entry, options) {
  const deps = await resolveOpsDeps(options, loadModel);
  await deps.connect(env);
  const { date, month } = kstDay(deps.now);
  const model = normalizeGeminiModel(entry.model) || 'unknown';
  const service = String(entry.service || '').replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 80) || 'unknown';
  const usd = geminiCallCostUsd(model, entry.usage);
  const usdMicros = usd === null ? 0 : Math.round(usd * 1_000_000);
  const unpricedCalls = usd === null ? 1 : 0;
  const usage = entry.usage;
  // One round trip, no retry: a retried $inc could count the call twice.
  await deps.retry(env, () => deps.model.bulkWrite([
    { updateOne: { filter: { _id: `d|${date}|${model}|${service}` }, upsert: true, update: {
      $setOnInsert: { kind: 'day', date, month, model, service },
      $inc: { calls: 1, inputTokens: tokens(usage.inputTokens), cachedInputTokens: tokens(usage.cachedInputTokens),
        outputTokens: tokens(usage.outputTokens), thinkingTokens: tokens(usage.thinkingTokens), usdMicros, unpricedCalls },
    } } },
    { updateOne: { filter: { _id: `m|${month}` }, upsert: true, update: {
      $setOnInsert: { kind: 'month', month }, $inc: { calls: 1, usdMicros, unpricedCalls },
    } } },
  ], { ordered: false }), { retries: 0 });
  return { recorded: true, usdMicros };
}

/** Called after every Gemini response. Never throws and never waits longer than RECORD_WAIT_MS. */
export async function recordGeminiUsage(env, entry, options = {}) {
  if (!entry?.usage) return { skipped: 'no_usage' };
  if (!options.model && !hasMongoUri(env)) return { skipped: 'no_db' };
  return settleWithin('llm-usage record', () => writeUsage(env, entry, options), options.waitMs ?? RECORD_WAIT_MS);
}

function monthEndProjection(spentUsd, now) {
  const kst = new Date(now.getTime() + 9 * 3600_000);
  const start = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 1);
  const end = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() + 1, 1);
  const elapsed = kst.getTime() - start;
  return elapsed >= DAY_MS ? spentUsd * (end - start) / elapsed : null;
}

// Feature names, totals and times only: no customer, order or prompt data.
export function budgetAlertMessage({ month, budgetUsd, spentUsd, threshold, services = [], unpricedCalls = 0, now }) {
  const usd = value => `$${value.toFixed(2)}`;
  const projected = monthEndProjection(spentUsd, now);
  return { subject: `[예산 ${threshold}%] Gemini 이번 달 추정 지출 ${usd(spentUsd)} / ${usd(budgetUsd)}`, text: [
    `집계 월: ${month} (KST) · 확인 시각: ${kstMinute(now)}`,
    `추정 지출: ${usd(spentUsd)} — 예산 ${usd(budgetUsd)}의 ${(spentUsd / budgetUsd * 100).toFixed(1)}%`,
    ...(projected === null ? [] : [`이 속도면 월말 추정: ${usd(projected)}`]),
    '지출 상위 기능:',
    ...services.map((row, index) => `  ${index + 1}. ${row._id || 'unknown'} ${usd((Number(row.usdMicros) || 0) / 1_000_000)} (${Number(row.calls) || 0}회)`),
    ...(unpricedCalls ? [`단가 미등록 모델 호출 ${unpricedCalls}회는 금액에 빠져 있습니다.`] : []),
    '공개 단가로 계산한 추정치입니다(명시 캐시 저장료 제외). 정확한 금액은 AI Studio Spend 페이지에서 확인하세요.',
    '한도에 닿으면 Gemini 호출이 모두 거절되고, 영냥이 결제 주문은 생성 실패 후 약 20분 뒤 자동 환불됩니다.',
    '프로젝트 월 지출 한도와 결제 계정 등급 한도(Tier)를 미리 올리세요.',
  ].join('\n') };
}

// Ten-minute cron. Announces the highest newly crossed threshold once; lower
// thresholds crossed in the same tick are marked with it so they never follow.
export async function checkLlmBudget(env, options = {}) {
  const budgetUsd = Number(getEnv(env, 'GEMINI_MONTHLY_BUDGET_USD'));
  if (!(budgetUsd > 0)) return { state: 'no_budget' };
  const deps = await resolveOpsDeps(options, loadModel);
  await deps.connect(env);
  const { model, retry, notify, now } = deps;
  const { month } = kstDay(now);
  const id = `m|${month}`;
  const row = await retry(env, () => model.findById(id).lean());
  const spentUsd = (Number(row?.usdMicros) || 0) / 1_000_000;
  const percent = spentUsd / budgetUsd * 100;
  const due = BUDGET_THRESHOLDS.filter(threshold => percent >= threshold && !(row?.alertedThresholds || []).includes(threshold));
  if (!due.length) return { state: 'ok' };
  const claimed = await retry(env, () => model.updateOne({ _id: id, alertedThresholds: { $nin: due } },
    { $addToSet: { alertedThresholds: { $each: due } } }));
  if (claimed.modifiedCount !== 1) return { state: 'ok' };
  const services = await retry(env, () => model.aggregate([
    { $match: { kind: 'day', month } },
    { $group: { _id: '$service', usdMicros: { $sum: '$usdMicros' }, calls: { $sum: '$calls' } } },
    { $sort: { usdMicros: -1 } },
    { $limit: TOP_SERVICES },
  ])).catch(() => []);
  const threshold = Math.max(...due);
  const delivered = await sendOperatorAlert(env, notify, budgetAlertMessage({
    month, budgetUsd, spentUsd, threshold, services, unpricedCalls: Number(row?.unpricedCalls) || 0, now }));
  // Undelivered: release the thresholds so the next tick tries again.
  if (!delivered) await retry(env, () => model.updateOne({ _id: id }, { $pull: { alertedThresholds: { $in: due } } }));
  return { state: 'alert', threshold, alerted: delivered };
}

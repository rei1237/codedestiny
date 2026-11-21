/**
 * Read-only paid-orphan audit (trait-first Phase 4). Finds paid, unrefunded per-use orders whose
 * delivery evidence cannot be located, and execution ledgers stuck before delivery.
 * "Evidence not found" is a lead for manual review, not proof that a customer went unserved.
 * No writes, no HTTP, no customer text or e-mail in the output: rows carry hashed references only.
 */
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { PER_USE_PAID_FEATURE_KEYS } from '../worker/lib/paid-feature-registry.js';

export const RESULT_COLLECTIONS = Object.freeze([
  'newYearAiConsultations', 'sajuCompatPremiumConsultations', 'karmaDestinyAiConsultations', 'ziweiAiConsultations',
  'destinyCompassReports', 'ziweiDeepReports', 'loveSecretAiConsultations', 'masterLoveCodexSessions',
  'lifeBookAiConsultations', 'sukuyoCompatibilityAiConsultations', 'vedicAiConsultations', 'astrologyAiConsultations',
  'neoOperationRoomConsultations', 'nakshatraAiConsultations', 'humanDesignReports', 'fusionFortuneConsultations',
  'fortune_tea_house_results',
]);
const PAID = ['paid', 'success', 'fulfilled'];
const DONE_RESULT = new Set(['completed', 'complete', 'delivered', 'ready']);
const DONE_EXECUTION = new Set(['completed']);
const DONE_TRANSACTION = new Set(['delivered']);
const PALM = 'palm-reading-general';
const ref = value => createHash('sha256').update(String(value)).digest('hex').slice(0, 12);
const id = value => (value == null ? '' : String(value));

function refunded(order) {
  return Boolean(order.refundLock || order.metadata?.refundStatus || order.metadata?.unlockRevoked);
}

/** Pure join. Every match requires the same owner; a token match from another account never counts. */
export function classifyPaidOrphans({ payments = [], executions = [], transactions = [], results = [],
  tossPurchases = [], tossConsultations = [], now = new Date(), minAgeHours = 24 } = {}) {
  const cutoff = now.getTime() - minAgeHours * 3600000;
  const old = row => new Date(row.paidAt || row.createdAt || now).getTime() <= cutoff;
  const orders = [];
  for (const order of payments) {
    if (!PAID.includes(order.status) || refunded(order) || !old(order)) continue;
    const owner = id(order.userId), key = order.requestId || order.idempotencyKey || '';
    const tokens = new Set([order.merchantUid, id(order._id), order.impUid].filter(Boolean));
    const mine = row => id(row.userId) === owner;
    const exec = executions.filter(row => mine(row) && (tokens.has(row.orderId) || tokens.has(row.paymentId)));
    const tx = transactions.filter(row => mine(row) && [row.merchantUid, row.orderId, row.paymentId, row.paymentRef?.merchantUid]
      .some(value => value && tokens.has(value)));
    const resultTokens = new Set([...tokens, ...exec.flatMap(row => [id(row._id), row.resultId]),
      ...tx.flatMap(row => [id(row._id), row.reportId, row.sessionId])].filter(Boolean));
    const docs = results.filter(row => mine(row) && ((key && row.idempotencyKey === key)
      || resultTokens.has(row.paymentId) || resultTokens.has(id(row._id)) || resultTokens.has(row.id)));
    const delivered = docs.some(row => DONE_RESULT.has(row.status)) || exec.some(row => DONE_EXECUTION.has(row.status))
      || tx.some(row => DONE_TRANSACTION.has(row.deliveryStatus));
    const state = delivered ? 'delivered' : (docs.length || exec.length || tx.length) ? 'undelivered' : 'evidenceNotFound';
    orders.push({ ref: ref(order._id), featureKey: order.featureKey, paidAt: order.paidAt || order.createdAt, state,
      resultStatuses: docs.map(row => row.status), executionStatuses: exec.map(row => row.status),
      deliveryStatuses: tx.map(row => row.deliveryStatus), palm: order.featureKey === PALM });
  }
  const stuckExecutions = executions.filter(row => row.status === 'paid_pending_generation' && old(row))
    .map(row => ({ ref: ref(row._id), featureId: row.featureId, accessMethod: row.accessMethod, createdAt: row.createdAt }));
  const stuckTransactions = transactions.filter(row => row.status === 'pending' && old(row)
    && !['delivered', 'refunded'].includes(row.deliveryStatus))
    .map(row => ({ ref: ref(row._id), featureKey: row.featureKey, deliveryStatus: row.deliveryStatus,
      reasonCode: row.reasonCode || '', retryCount: row.retryCount || 0, createdAt: row.createdAt }));
  const tossOrphans = tossPurchases.filter(row => row.status === 'PURCHASED' && old({ createdAt: row.verifiedAt }))
    .filter(row => !tossConsultations.some(doc => id(doc.ownerId) === id(row.ownerId)
      && (doc.orderId === row._id || (row.requestId && doc.requestId === row.requestId)) && doc.savedResult))
    .filter(row => !row.executionId || !executions.some(doc => id(doc._id) === row.executionId && DONE_EXECUTION.has(doc.status)))
    .map(row => ({ ref: ref(row._id), sku: row.sku, nativeService: row.nativeService, serviceId: row.serviceId,
      environment: row.environment, verifiedAt: row.verifiedAt }));
  const byFeature = {};
  for (const row of orders) {
    const bucket = byFeature[row.featureKey] ||= { delivered: 0, undelivered: 0, evidenceNotFound: 0 };
    bucket[row.state] += 1;
  }
  return {
    byFeature,
    leads: orders.filter(row => row.state !== 'delivered'),
    palmOrders: orders.filter(row => row.palm).map(row => ({ ref: row.ref, state: row.state })),
    stuckExecutions, stuckTransactions, tossOrphans,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : '';
  const database = option('--db'), days = Number(option('--days') || 90), minAgeHours = Number(option('--min-age-hours') || 24);
  if (!['code_destiny', 'code_destiny_staging'].includes(database) || !Number.isInteger(days) || days < 1 || days > 365
      || !(minAgeHours >= 0) || args.some(arg => arg.startsWith('--') && !['--db', '--days', '--min-age-hours'].includes(arg))) {
    throw Error('Required: --db code_destiny[_staging]; optional --days 1..365, --min-age-hours N. Read-only only.');
  }
  const { config } = await import('dotenv');
  config({ path: '.env.local', quiet: true });
  globalThis.fetch = () => { throw Error('HTTP is forbidden in this read-only audit'); };
  const { connectDb, mongoose } = await import('../worker/lib/db.js');
  const since = new Date(Date.now() - days * 86400000), cap = 2000, opts = { maxTimeMS: 20000 };
  const read = async (name, filter, projection) => {
    const rows = await mongoose.connection.db.collection(name).find(filter, { ...opts, projection }).limit(cap + 1).toArray();
    if (rows.length > cap) throw Error(`${name}: audit cap reached; narrow --days instead of reporting partial totals`);
    return rows;
  };
  try {
    await connectDb({ ...process.env, MONGO_DB_NAME: database, MONGODB_DB_NAME: database, MONGO_MAX_POOL_SIZE: '3' });
    if (mongoose.connection.name !== database) throw Error('Database mismatch');
    const recent = { createdAt: { $gte: since } };
    const payments = await read('payments', { ...recent, status: { $in: PAID }, featureKey: { $in: PER_USE_PAID_FEATURE_KEYS } },
      { userId: 1, status: 1, featureKey: 1, merchantUid: 1, impUid: 1, requestId: 1, idempotencyKey: 1, paidAt: 1, createdAt: 1,
        refundLock: 1, 'metadata.refundStatus': 1, 'metadata.unlockRevoked': 1 });
    const executions = await read('paid_execution_records', recent,
      { userId: 1, status: 1, featureId: 1, accessMethod: 1, orderId: 1, paymentId: 1, resultId: 1, createdAt: 1 });
    const transactions = await read('serviceexecutiontransactions', recent,
      { userId: 1, status: 1, deliveryStatus: 1, featureKey: 1, merchantUid: 1, orderId: 1, paymentId: 1, 'paymentRef.merchantUid': 1,
        reportId: 1, sessionId: 1, reasonCode: 1, retryCount: 1, createdAt: 1 });
    const results = [];
    for (const name of RESULT_COLLECTIONS) {
      results.push(...await read(name, recent, { userId: 1, status: 1, paymentId: 1, idempotencyKey: 1, id: 1 }));
    }
    const tossPurchases = await read('toss_purchases', { verifiedAt: { $gte: since } },
      { ownerId: 1, status: 1, sku: 1, nativeService: 1, serviceId: 1, environment: 1, requestId: 1, executionId: 1, verifiedAt: 1 });
    const tossConsultations = (await read('toss_native_consultations', recent,
      { ownerId: 1, orderId: 1, requestId: 1, savedResult: 1 })).map(row => ({ ...row, savedResult: Boolean(row.savedResult) }));
    const report = classifyPaidOrphans({ payments, executions, transactions, results, tossPurchases, tossConsultations, minAgeHours });
    console.log(JSON.stringify({ database, readOnly: true, days, minAgeHours, evidenceNotFoundIsNotProof: true,
      scanned: { payments: payments.length, executions: executions.length, transactions: transactions.length,
        results: results.length, tossPurchases: tossPurchases.length }, ...report }, null, 2));
  } finally { await mongoose.disconnect(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

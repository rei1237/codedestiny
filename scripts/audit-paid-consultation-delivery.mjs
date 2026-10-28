/** Read-only order/result audit. A stored result is not proof that its owner opened it. */
import { pathToFileURL } from 'node:url';
import { config } from 'dotenv';
import { connectDb, mongoose } from '../worker/lib/db.js';
import { buildMongoEnv, requireMongoUri } from './lib/migration-before-image.mjs';
import { SUPPORT_SERVICES } from './lib/paid-consultation-support.mjs';

export function joinPaidConsultationOrders(orders, docs, executions) {
  return orders.map(order => {
    const owner = String(order.userId), key = order.requestId || order.idempotencyKey;
    const evidence = executions.filter(row => String(row.userId) === owner
      && row.featureId === order.featureKey && (row.orderId === order.merchantUid || row.paymentId === order.merchantUid));
    const tokens = [order.merchantUid, String(order._id), ...evidence.flatMap(row => [String(row._id), row.resultId])].filter(Boolean);
    const results = docs.filter(row => String(row.userId) === owner && (Boolean(key) && row.idempotencyKey === key || tokens.includes(row.paymentId) || tokens.includes(row.id)));
    return { orderId: order.merchantUid, featureKey: order.featureKey, amount: order.paymentAmount, paymentStatus: order.status,
      paidAt: order.paidAt || order.createdAt, executionStatuses: evidence.map(row => row.status),
      results: results.map(row => ({ resultId: row.id, status: row.status, bodyParts: row.bodyParts, savedParts: row.savedParts,
        assistantChars: row.assistantChars, refundStatus: row.llmMeta?.deliveryRefund?.status || '',
        failureCode: row.generationError?.code || '', usageApplied: Boolean(row.usageAppliedAt) })) };
  });
}

async function main() {
  config({ path: '.env.local', quiet: true }); config({ path: '.env', quiet: true });
  const at = process.argv.indexOf('--db'), database = at >= 0 ? process.argv[at + 1] : '';
  if (!['code_destiny', 'code_destiny_staging'].includes(database)) throw Error('--db is required');
  globalThis.fetch = () => { throw Error('HTTP forbidden in read-only delivery audit'); };
  const env = { ...buildMongoEnv(), MONGO_DB_NAME: database, MONGODB_DB_NAME: database };
  requireMongoUri(env);
  try {
    await connectDb(env);
    if (mongoose.connection.name !== database) throw Error('Database mismatch');
    const db = mongoose.connection.db, summaries = [];
    for (const [featureKey, spec] of Object.entries(SUPPORT_SERVICES)) {
      const orders = await db.collection('payments').find({ featureKey, status: { $in: ['paid', 'success', 'fulfilled', 'refunded', 'cancelled'] } }, { maxTimeMS: 15000 }).limit(501).toArray();
      const docs = await db.collection(spec.collection).find({}, { maxTimeMS: 15000 }).limit(501).toArray();
      if (orders.length > 500 || docs.length > 500) throw Error('Audit cap reached; paginate instead of reporting partial totals');
      const executions = await db.collection('paid_execution_records').find({ featureId: featureKey }, { maxTimeMS: 15000 }).limit(501).toArray();
      if (executions.length > 500) throw Error('Execution audit cap reached');
      for (const doc of docs) {
        doc.assistantChars = (doc.messages || []).filter(row => row.role === 'assistant').reduce((n, row) => n + (row.content?.length || 0), 0);
        doc.bodyParts = spec.service === 'new-year-ai'
          ? (doc.llmMeta?.sections || []).filter(row => row.text?.trim()).length
          : (doc.llmMeta?.reportJson?.chapters || []).filter(row => row.content?.trim()).length;
        doc.savedParts = spec.service === 'new-year-ai'
          ? (doc.llmMeta?.savedSections || []).filter(row => row.ok && row.text?.trim()).length
          : Object.values(doc.llmMeta?.sections || {}).filter(row => row.ok && row.body).length;
      }
      const rows = joinPaidConsultationOrders(orders, docs, executions);
      const sessions = docs.reduce((acc, row) => {
        const label = `${row.accessType}:${row.status}`; acc[label] = (acc[label] || 0) + 1; return acc;
      }, {});
      summaries.push({ service: spec.service, orders: rows, sessions,
        unlinkedPaidOrders: rows.filter(row => ['paid', 'success', 'fulfilled'].includes(row.paymentStatus) && !row.results.length).length,
        completeBodyMissing: docs.filter(row => row.status === 'completed' && !row.bodyParts && !row.assistantChars).length });
    }
    console.log(JSON.stringify({ database, readOnly: true, actualCustomerViewingVerified: false,
      coverage: Object.keys(SUPPORT_SERVICES), summaries }, null, 2));
  } finally { await mongoose.disconnect(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

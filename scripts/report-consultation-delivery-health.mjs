// Read-only audit of the product stores omitted by report-paid-delivery-health.
// No providers, payment operations, migrations, customer text or email output.
import { config } from 'dotenv';
import { createHash } from 'node:crypto';
import { connectDb, mongoose } from '../worker/lib/db.js';
import * as models from '../worker/lib/models.js';
import { CONSULTATION_RECOVERY_ADAPTERS } from '../worker/lib/consultation-recovery-registry.js';

const args = process.argv.slice(2);
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : '';
const database = option('--db'), days = Number(option('--days') || 90);
if (!['code_destiny', 'code_destiny_staging'].includes(database) || !Number.isInteger(days) || days < 1 || days > 365
    || args.some(arg => arg.startsWith('--') && !['--db', '--days'].includes(arg))) {
  throw Error('Required: --db code_destiny[_staging]; optional --days 1..365. Read-only only.');
}
config({ path: '.env.local', quiet: true });
globalThis.fetch = () => { throw Error('HTTP is forbidden in this read-only audit'); };
const ref = value => createHash('sha256').update(String(value)).digest('hex').slice(0, 12);
const pending = ['pending', 'paid_pending_generation', 'generating', 'partial', 'delivery_pending', 'generation_failed', 'failed'];
const now = new Date(), since = new Date(now.getTime() - days * 86400000);
try {
  await connectDb({ ...process.env, MONGO_DB_NAME: database, MONGODB_DB_NAME: database, MONGO_MAX_POOL_SIZE: '3' });
  if (mongoose.connection.name !== database) throw Error('Database mismatch');
  // Operator-owned accounts are supplied via the environment, never hardcoded or printed.
  const emails = String(process.env.PAID_DELIVERY_AUDIT_OWNER_EMAILS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  const owners = emails.length ? await models.User.collection.find({ email: { $in: emails } }, { projection: { _id: 1 }, maxTimeMS: 10000 }).toArray() : [];
  const excluded = new Set(owners.map(user => String(user._id)));
  const names = [...new Set([...CONSULTATION_RECOVERY_ADAPTERS.map(row => row[1]).filter(Boolean),
    'MasterLoveCodexSession', 'FusionFortuneConsultation', 'ZiweiDeepReport'])];
  const stores = names.map(name => ({ name, collection: models[name].collection }));
  stores.push({ name: 'FortuneTeaHouseResult', collection: mongoose.connection.db.collection('fortune_tea_house_results') });
  const summaries = [];
  for (const { name, collection } of stores) {
    const states = await collection.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ], { maxTimeMS: 15000 }).toArray();
    const rows = await collection.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $in: pending } } },
      { $project: { userId: 1, status: 1, featureId: 1, featureKey: 1, serviceType: 1, paymentId: 1, createdAt: 1, updatedAt: 1,
        'generationError.code': 1, hasResumeInput: { $or: [
          { $ne: [{ $ifNull: ['$generationCheckpoint.requestBody', null] }, null] },
          { $ne: [{ $ifNull: ['$llmMeta.resumeBody', null] }, null] },
          { $ne: [{ $ifNull: ['$llmMeta.delivery.resumeBody', null] }, null] },
        ] } } },
    ], { maxTimeMS: 15000 }).toArray();
    const unresolved = [];
    let ownerTestsExcluded = 0;
    for (const row of rows) {
      if (excluded.has(String(row.userId))) { ownerTestsExcluded++; continue; }
      // Only the declared payment document reference is resolved; absence is unknown, not unpaid.
      const payment = mongoose.Types.ObjectId.isValid(String(row.paymentId || ''))
        ? await models.Payment.collection.findOne({ _id: new mongoose.Types.ObjectId(String(row.paymentId)) }, {
          projection: { userId: 1, status: 1, 'metadata.unlockRevoked': 1 }, maxTimeMS: 10000,
        }) : null;
      unresolved.push({ ref: ref(row._id), status: row.status, feature: row.featureId || row.featureKey || row.serviceType || null,
        createdAt: row.createdAt, updatedAt: row.updatedAt, errorCode: row.generationError?.code || null,
        hasResumeInput: row.hasResumeInput,
        paymentStatus: payment?.status || null, paymentOwnerMatches: payment ? String(payment.userId) === String(row.userId) : null,
        revoked: payment?.metadata?.unlockRevoked === true || row.generationError?.code === 'PURCHASE_REFUNDED',
      });
    }
    summaries.push({ store: name, states, ownerTestsExcluded, unresolved });
  }
  console.log(JSON.stringify({ database, since, until: now, days, stores: summaries, limitations: [
    'Stored status is not semantic completeness or actual customer-screen proof.',
    'Missing payment linkage is unknown; pass/monthly-credit proofs need their original ledgers.',
    'No generation, recovery, refund or production write was performed. No personal fields are printed.',
  ] }, null, 2));
} finally { await mongoose.disconnect(); }

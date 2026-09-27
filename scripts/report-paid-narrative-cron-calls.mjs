// Read-only report: bounds paid-narrative provider calls (browser + cron) from the
// per-part attempts every call increments. No PG, provider, DB writes or HTTP;
// prints only feature keys, statuses, counts and timestamps (no bodies or users).
import { config } from 'dotenv';
import { connectDb, mongoose } from '../worker/lib/db.js';
import { ServiceExecutionTransaction } from '../worker/lib/models.js';
const args = process.argv.slice(2), arg = name => args.includes(name) ? args[args.indexOf(name) + 1] : '';
const database = arg('--db'), since = new Date(arg('--since') || '2026-09-27T05:06:19Z');
if (!['code_destiny', 'code_destiny_staging'].includes(database) || Number.isNaN(since.getTime()))
  throw Error('Required: --db code_destiny[_staging]; optional --since <ISO> (default: 9d2b30b8c promotion) --env-file <path>');
config({ path: arg('--env-file') || '.env.local', quiet: true });
globalThis.fetch = () => { throw Error('HTTP is forbidden in this read-only report'); };
try {
  await connectDb({ ...process.env, MONGO_DB_NAME: database, MONGODB_DB_NAME: database });
  if (mongoose.connection.name !== database) throw Error('Database mismatch');
  const col = ServiceExecutionTransaction.collection;
  const executions = await col.aggregate([
    { $match: { 'metadata.paidNarrative': { $exists: true }, $or: [{ createdAt: { $gte: since } }, { updatedAt: { $gte: since } }] } },
    { $project: { _id: 0, featureKey: 1, status: 1, createdAt: 1, updatedAt: 1,
      calls: { $sum: { $map: { input: { $objectToArray: { $ifNull: ['$metadata.paidNarrative.attempts', {}] } }, in: '$$this.v' } } },
      parts: { $size: { $objectToArray: { $ifNull: ['$metadata.paidNarrative.parts', {}] } } },
      tasks: { $size: { $ifNull: ['$metadata.paidNarrative.tasks', []] } },
      cronProven: { $ne: [{ $type: '$metadata.paidNarrativeProof' }, 'missing'] },
      recoveryCode: { $ifNull: ['$metadata.paidNarrativeRecovery.code', null] },
      reviewRequired: { $ifNull: ['$metadata.paidNarrativeRecovery.reviewRequired', false] } } },
    { $sort: { createdAt: 1 } },
  ], { maxTimeMS: 20000 }).toArray();
  const intents = await col.aggregate([
    { $match: { status: 'awaiting_payment' } },
    { $group: { _id: '$featureKey', count: { $sum: 1 }, reviewRequired: { $sum: { $cond: ['$metadata.paidIntent.reviewRequired', 1, 0] } },
      oldest: { $min: '$createdAt' }, newest: { $max: '$createdAt' } } },
  ], { maxTimeMS: 20000 }).toArray();
  console.log(JSON.stringify({ database, since: since.toISOString(), until: new Date().toISOString(),
    totals: { executions: executions.length, callsUpperBound: executions.reduce((sum, row) => sum + row.calls, 0),
      cronProvenExecutions: executions.filter(row => row.cronProven).length },
    executions, intents,
    limitations: ['calls = stored attempts: browser and cron calls together; split them with server_* token logs (f0182a579).',
      'Rows updated before --since are excluded. Tokens and cost are not stored in the DB.'],
  }, null, 2));
} finally { await mongoose.disconnect(); }

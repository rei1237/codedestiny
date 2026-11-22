// No dotenv loading: invocation must explicitly choose a database. Default is read-only.
import mongoose from 'mongoose';

const uri = process.env.YEONGNYANGI_INDEX_MONGODB_URI;
if (!uri) throw new Error('Set YEONGNYANGI_INDEX_MONGODB_URI explicitly; no default production database.');
const apply = process.argv.includes('--apply');

await mongoose.connect(uri, { autoIndex: false, serverSelectionTimeoutMS: 5000 });
try {
  const { YeongnyangiRequest } = await import('../worker/lib/yeongnyangi-models.js');
  // createIndexes() only builds declared indexes that are missing; it never drops existing ones.
  if (apply) await YeongnyangiRequest.createIndexes();
  const indexes = await YeongnyangiRequest.collection.listIndexes().toArray();
  const missing = YeongnyangiRequest.schema.indexes().filter(([key]) => !indexes.some(i => JSON.stringify(i.key) === JSON.stringify(key)));
  for (const [key] of missing) console.log(`missing: ${JSON.stringify(key)}`);
  console.log(`YeongnyangiRequest: ${missing.length ? 'MISSING' : 'OK'}${apply ? ' (after apply)' : ' (read-only)'}`);
  if (missing.length) process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

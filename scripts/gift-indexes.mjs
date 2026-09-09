// No dotenv loading: invocation must explicitly choose a database. Default is read-only.
import mongoose from 'mongoose';
const uri = process.env.GIFT_INDEX_MONGODB_URI;
if (!uri) throw new Error('Set GIFT_INDEX_MONGODB_URI explicitly; no default production database.');
const apply = process.argv.includes('--apply');
await mongoose.connect(uri, { autoIndex: false, serverSelectionTimeoutMS: 5000 });
try {
  const { Gift, GiftGrant, GiftClaimContext } = await import('../worker/lib/gift-models.js');
  for (const model of [Gift, GiftGrant, GiftClaimContext]) {
    if (apply) await model.createIndexes();
    const indexes = await model.collection.listIndexes().toArray();
    const missing = model.schema.indexes().filter(([key, options]) => !indexes.some(i => JSON.stringify(i.key) === JSON.stringify(key) && Boolean(i.unique) === Boolean(options.unique)));
    console.log(`${model.modelName}: ${missing.length ? 'MISSING' : 'OK'}`);
    if (missing.length) process.exitCode = 1;
  }
} finally { await mongoose.disconnect(); }

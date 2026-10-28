// Explicit operation only: no automatic index sync, document deletion, or balance writes.
import { pathToFileURL } from 'node:url';

export async function migrateRepeatReviewIndex(collection, { apply = false } = {}) {
  const indexes = await collection.indexes();
  const legacy = indexes.find((index) => index.name === 'user_product_unique_nonadmin');
  if (!legacy) return { changed: false, legacyIndexPresent: false };
  if (legacy.unique !== true || legacy.key?.userId !== 1 || legacy.key?.productId !== 1 || Object.keys(legacy.key).length !== 2) throw new Error('Unexpected legacy index definition; inspect manually.');
  if (!apply) return { changed: false, legacyIndexPresent: true, action: 'Create author history index, then drop only user_product_unique_nonadmin.' };
  await collection.createIndex({ userId: 1, createdAt: -1 });
  await collection.dropIndex('user_product_unique_nonadmin');
  return { changed: true, legacyIndexPresent: false };
}

async function main() {
  const args = process.argv.slice(2);
  const dbName = args.find((arg) => arg.startsWith('--db='))?.slice(5);
  if (!dbName) throw new Error('Explicit --db=<database> required. Defaults to read-only; --apply changes only the named index.');
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('Set MONGO_URI locally. This script never prints credentials.');
  const { MongoClient } = await import('mongodb');
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    console.log(JSON.stringify(await migrateRepeatReviewIndex(client.db(dbName).collection('reviews'), { apply: args.includes('--apply') })));
  } finally { await client.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error('Review index migration failed. Inspect access and index definitions without printing connection secrets.'); process.exitCode = 1; });
}

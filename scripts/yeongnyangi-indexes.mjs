// No dotenv loading: invocation must explicitly choose a database. Default is read-only.
// Both the URI and the database name are required: the production URI carries no database path, so a URI-only
// connection lands on the driver default `test`, not `code_destiny` (2026-11-24 read-only check).
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';

const DB_NAME_PATTERN = /^[A-Za-z0-9_-]{1,63}$/;

// Driver errors can quote the connection string; never let it reach the terminal.
export function maskSecrets(text) {
  return String(text ?? '').replace(/mongodb(\+srv)?:\/\/\S+/gi, '<masked-uri>');
}

export function resolveIndexTarget({ argv = [], env = {} } = {}) {
  const uri = env.YEONGNYANGI_INDEX_MONGODB_URI;
  if (!uri) throw new Error('Set YEONGNYANGI_INDEX_MONGODB_URI explicitly; no default production database.');
  const flag = argv.find((arg) => arg.startsWith('--db='));
  const fromFlag = flag ? flag.slice('--db='.length) : '';
  const fromEnv = env.YEONGNYANGI_INDEX_DB_NAME || '';
  if (fromFlag && fromEnv && fromFlag !== fromEnv) {
    throw new Error(`--db=${fromFlag} and YEONGNYANGI_INDEX_DB_NAME=${fromEnv} disagree.`);
  }
  const dbName = fromFlag || fromEnv;
  if (!dbName) throw new Error('Set YEONGNYANGI_INDEX_DB_NAME or --db=<name> explicitly; there is no default database.');
  if (!DB_NAME_PATTERN.test(dbName)) throw new Error(`Invalid database name: ${dbName}`);
  return { uri, dbName, apply: argv.includes('--apply') };
}

export async function runYeongnyangiIndexes({
  argv = process.argv.slice(2),
  env = process.env,
  db = mongoose,
  loadModel = async () => (await import('../worker/lib/yeongnyangi-models.js')).YeongnyangiRequest,
  log = console.log,
} = {}) {
  const { uri, dbName, apply } = resolveIndexTarget({ argv, env });
  await db.connect(uri, { dbName, autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 5000 });
  try {
    const connected = db.connection?.db?.databaseName;
    if (connected !== dbName) throw new Error(`Connected to database ${connected}, expected ${dbName}; nothing written.`);
    const Model = await loadModel();
    const collectionName = Model.collection.collectionName;
    log(`target: ${connected}.${collectionName}${apply ? ' (apply)' : ' (read-only)'}`);
    const existing = await db.connection.db.listCollections({ name: collectionName }, { nameOnly: true }).toArray();
    if (!existing.length) throw new Error(`Collection ${connected}.${collectionName} does not exist; nothing written.`);
    // createIndexes() only builds declared indexes that are missing; it never drops existing ones.
    if (apply) await Model.createIndexes();
    const indexes = await Model.collection.listIndexes().toArray();
    const missing = Model.schema.indexes().filter(([key]) => !indexes.some((i) => JSON.stringify(i.key) === JSON.stringify(key)));
    for (const [key, options] of missing) log(`missing: ${options?.name ? `${options.name} ` : ''}${JSON.stringify(key)}`);
    for (const i of indexes) log(`index: ${i.name} ${JSON.stringify(i.key)}`);
    log(`YeongnyangiRequest: ${missing.length ? 'MISSING' : 'OK'}${apply ? ' (after apply)' : ' (read-only)'}`);
    return { missing: missing.length };
  } finally {
    await db.disconnect();
  }
}

// No top-level await: the tests import this module.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runYeongnyangiIndexes().then(({ missing }) => {
    if (missing) process.exitCode = 1;
  }, (error) => {
    console.error(`yeongnyangi-indexes: ${maskSecrets(error?.message || error)}`);
    process.exitCode = 1;
  });
}

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire, isBuiltin, registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const textHash = file => hash(fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n'));
const fail = code => { throw Object.assign(new Error(code), { code }); };
const localRequire = createRequire(path.join(ROOT, 'package.json'));
function packageRoot(name, from) {
  const require = createRequire(from);
  try { return path.dirname(require.resolve(`${name}/package.json`)); } catch { /* exports may hide package.json */ }
  let directory = path.dirname(require.resolve(name));
  while (!fs.existsSync(path.join(directory, 'package.json'))) directory = path.dirname(directory);
  return directory;
}
export async function execute(args, env = process.env) {
  if (typeof registerHooks !== 'function') fail('AUDIT_NODE_VERSION_UNSUPPORTED');
  const pins = JSON.parse(fs.readFileSync(path.join(HERE, 'pins.json'), 'utf8'));
  const allowed = new Map(), loaded = new Set(), packageDirs = new Map();
  for (const [relative, expected] of Object.entries(pins.sources)) {
    const file = fs.realpathSync(path.resolve(ROOT, relative));
    if (textHash(file) !== expected) fail('AUDIT_SOURCE_CHANGED');
    allowed.set(file, { expected, relative, kind: 'source' });
  }
  for (const item of pins.packages) {
    const parent = item.parent ? path.join(packageDirs.get(item.parent), 'package.json') : path.join(ROOT, 'package.json');
    const directory = fs.realpathSync(packageRoot(item.name, parent)); packageDirs.set(item.key, directory);
    const metadata = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
    if (metadata.version !== item.version || metadata.license !== item.license) fail('AUDIT_DEPENDENCY_CHANGED');
    for (const [relative, expected] of Object.entries(item.files)) {
      const file = fs.realpathSync(path.join(directory, relative));
      if (hash(fs.readFileSync(file)) !== expected) fail('AUDIT_DEPENDENCY_CHANGED');
      allowed.set(file, { expected, relative: `${item.key}/${relative}`, kind: 'dependency' });
    }
  }
  const sourceDigest = hash(JSON.stringify(pins));
  let driverAllowed = false;
  registerHooks({ resolve(specifier, context, nextResolve) {
    if (/swiss|sweph|ephemeris|portone|inicis|dotenv/i.test(specifier)) fail('AUDIT_IMPORT_BLOCKED');
    if (isBuiltin(specifier)) {
      if (/^(?:node:)?(?:child_process|worker_threads|vm|inspector)/.test(specifier)) fail('AUDIT_IMPORT_BLOCKED');
      return nextResolve(specifier, context);
    }
    const result = nextResolve(specifier, context);
    if (!result.url.startsWith('file:')) fail('AUDIT_IMPORT_BLOCKED');
    const file = fs.realpathSync(fileURLToPath(result.url)), rule = allowed.get(file);
    if (!rule || (rule.kind === 'dependency' && !driverAllowed)) fail('AUDIT_IMPORT_BLOCKED');
    if ((rule.kind === 'source' ? textHash(file) : hash(fs.readFileSync(file))) !== rule.expected) fail('AUDIT_SOURCE_CHANGED');
    loaded.add(rule.relative); return result;
  } });
  const { guardNetwork } = await import('./network.mjs');
  const network = guardNetwork();
  const { parseArgs, validateApproval, createCases, LIMITS, COLLECTIONS } = await import('./config.mjs');
  const options = parseArgs(args), fixture = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures.json'), 'utf8'));
  const cases = createCases(options.runId, fixture);
  const plan = { mode: options.mode, runId: options.runId, sourceDigest, calendarAuthorityV2: false,
    limits: LIMITS, collections: COLLECTIONS, database: `cd_engine_audit_cr006_${options.runId}`, cleanupSupported: false };
  if (options.mode === 'plan') return { ...plan, databaseConnected: false, importedFiles: [...loaded].sort() };
  let target;
  if (options.mode === 'db') {
    const approval = JSON.parse(fs.readFileSync(options.approval, 'utf8'));
    target = validateApproval(approval, options.runId, sourceDigest, () => env.ENGINE_AUDIT_TEST_MONGO_URI);
  }
  const { resolveZiweiPreparation } = await import('../../../worker/lib/ziwei-calculation-preparation.js');
  const { memoryBackend, mongoBackend } = await import('./storage.mjs');
  const { runScenario } = await import('./scenario.mjs');
  let driver;
  if (target || options.mode === 'check-driver') { driverAllowed = true; driver = localRequire('mongodb'); }
  if (target) network.allowMongo(target);
  const backend = target ? await mongoBackend(target, driver.MongoClient)
    : memoryBackend(driver ? value => driver.BSON.deserialize(driver.BSON.serialize(value)) : structuredClone);
  try {
    const result = await runScenario(backend, cases, fixture, resolveZiweiPreparation);
    return { ...plan, ...result, databaseConnected: Boolean(target), storage: target ? 'isolated-mongodb' : driver ? 'memory-bson-roundtrip' : 'memory', importedFiles: [...loaded].sort() };
  } finally { await backend.close(); }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try { console.log(JSON.stringify(await execute(process.argv.slice(2)), null, 2)); }
  catch (error) {
    // Never print driver errors, connection URIs, credentials, record contents or stacks.
    const code = /^AUDIT_[A-Z_]+$/.test(error?.code || '') ? error.code : 'AUDIT_RUN_FAILED';
    console.error(JSON.stringify({ ok: false, code })); process.exitCode = 1;
  }
}

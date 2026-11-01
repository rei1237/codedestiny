import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createCases, validateApproval, parseArgs, LIMITS, COLLECTIONS, FEATURE } from '../../tools/oracle/isolated-db/config.mjs';
import { boundedStore, memoryBackend, mongoBackend } from '../../tools/oracle/isolated-db/storage.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const runner = 'tools/oracle/isolated-db/run.mjs';
const fixture = JSON.parse(fs.readFileSync(new URL('../../tools/oracle/isolated-db/fixtures.json', import.meta.url)));
const cases = createCases('syntheticlocal01', fixture);
function child(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024 });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return result;
}
function script(source) {
  const result = child(['--input-type=module', '-e', source]);
  assert.equal(result.status, 0, result.stderr);
  return result;
}
const now = Date.parse('2026-11-01T00:00:00Z');
function approval() {
  return { approved: true, scope: 'isolated-db-write-cr006', runId: 'syntheticlocal01', sourceDigest: 'test-source-digest',
    expiresAt: new Date(now + 60000).toISOString(), dedicatedDisposableInstance: true, allowCreateCollections: true,
    target: { host: '127.0.0.1', port: 27017, database: 'cd_engine_audit_cr006_syntheticlocal01' }, limits: { ...LIMITS } };
}
const uri = 'mongodb://127.0.0.1:27017/cd_engine_audit_cr006_syntheticlocal01';
const validate = (value, readUri = () => uri) => validateApproval(value, 'syntheticlocal01', 'test-source-digest', readUri, now);

test('mock and BSON roundtrip keep concurrency, resume and saved results identical without DB', () => {
  const outputs = ['mock', 'check-driver'].map(mode => {
    const result = child([runner, '--mode', mode]);
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  });
  for (const result of outputs) {
    assert.equal(result.databaseConnected, false);
    assert.equal(result.calendarAuthorityV2, false);
    assert.equal(result.paymentCalls, 0);
    assert.equal(result.llmCalls, 0);
    assert.equal(result.completed.length, 7);
    assert.deepEqual(result.counts, { reads: 57, insertAttempts: 25, preparationRows: 4, consultationRows: 2 });
    assert.ok(result.importedFiles.every(file => !/swiss|sweph|portone|inicis|worker\/routes|worker\/lib\/(?:db|models)\./i.test(file)));
  }
  assert.equal(outputs[0].chartDigest, outputs[1].chartDigest);
  assert.equal(outputs[0].savedResultsDigest, outputs[1].savedResultsDigest);
  assert.equal(outputs[1].storage, 'memory-bson-roundtrip');
  assert.ok(outputs[1].importedFiles.includes('mongodb@7.1.0/lib/index.js'));
});

test('plan and offline execution never read URI environment; unapproved DB fails before environment access', () => {
  for (const mode of ['plan', 'mock', 'check-driver', 'db']) script(`
    import assert from 'node:assert/strict';
    import { execute } from './${runner}';
    const env = new Proxy({}, { get() { throw new Error('ENV_MUST_NOT_BE_READ'); } });
    const args = ${JSON.stringify(mode === 'db' ? ['--mode', 'db', '--run-id', 'syntheticlocal01', '--approval', 'tools/oracle/isolated-db/approval.example.json'] : ['--mode', mode])};
    ${mode === 'db' ? "await assert.rejects(execute(args, env), { code: 'AUDIT_APPROVAL_REQUIRED' });" : 'assert.equal((await execute(args, env)).databaseConnected, false);'}
  `);
});

test('argument parser cannot enable a feature flag, override limits, or implicitly connect', () => {
  assert.equal(parseArgs([]).mode, 'mock');
  for (const args of [ ['--flag', 'on'], ['--mode', 'db'], ['--mode', 'mock', '--mode', 'db'], ['--mode'],
    ['--mode', 'live'], ['--run-id', '../production'], ['--limit', '100'], ['--approval', 'unused'] ]) {
    assert.throws(() => parseArgs(args), { code: /^AUDIT_/ });
  }
});

test('approval validation binds exact source, scope, run, lifetime, limits and disposable target before URI access', () => {
  const edits = [ a => { a.approved = false; }, a => { a.sourceDigest = 'old'; }, a => { a.runId = 'another'; },
    a => { a.scope = 'production'; }, a => { a.expiresAt = new Date(now).toISOString(); },
    a => { a.expiresAt = new Date(now + 3600001).toISOString(); }, a => { a.limits.preparations++; },
    a => { a.dedicatedDisposableInstance = false; }, a => { a.allowCreateCollections = false; },
    a => { a.target.host = 'production.example'; }, a => { a.target.host = 'localhost'; },
    a => { a.target.database = 'production'; }, a => { a.target.port = 80; } ];
  for (const edit of edits) {
    const value = approval(); edit(value);
    let reads = 0;
    assert.throws(() => validate(value, () => { reads++; return uri; }), { code: /^AUDIT_/ });
    assert.equal(reads, 0);
  }
  assert.equal(validate(approval()).uri, uri); // Parsing only; no driver or connection.
});

test('URI validation rejects SRV, remote hosts, wrong database, extra hosts and connection options', () => {
  for (const value of [undefined, 'not-a-uri', uri.replace('mongodb:', 'mongodb+srv:'), uri.replace('127.0.0.1', '8.8.8.8'),
    uri.replace('27017', '27018'), uri.replace('syntheticlocal01', 'another'), `${uri}?authSource=admin`, `${uri}#fragment`,
    uri.replace('127.0.0.1', '127.0.0.1,production.example'), 'mongodb://%2Ftmp%2Fmongodb.sock/test']) {
    assert.throws(() => validate(approval(), () => value), { code: 'AUDIT_TARGET_INVALID' });
  }
});

test('CLI default-deny error contains no connection value or secret', () => {
  const result = child([runner, '--mode', 'db', '--run-id', 'syntheticlocal01', '--approval', 'tools/oracle/isolated-db/approval.example.json']);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.deepEqual(JSON.parse(result.stderr), { ok: false, code: 'AUDIT_APPROVAL_REQUIRED' });
});

test('offline guard blocks local TCP, TLS, DNS, HTTP, UDP and WebSocket before any connection', () => {
  script(`
    import assert from 'node:assert/strict';
    import { execute } from './${runner}';
    await execute(['--mode', 'plan']);
    const net = await import('node:net'), tls = await import('node:tls'), dns = await import('node:dns');
    const http = await import('node:http'), https = await import('node:https'), dgram = await import('node:dgram');
    for (const action of [() => net.connect({ host: '127.0.0.1', port: 27017 }),
      () => new net.Socket().connect(27017, '127.0.0.1'), () => tls.connect(27017, '127.0.0.1'),
      () => dns.lookup('localhost', () => {}), () => dns.promises.resolveSrv('_mongodb._tcp.invalid'),
      () => http.get('http://127.0.0.1'), () => https.request('https://invalid'),
      () => dgram.createSocket('udp4'), () => fetch('https://invalid'), () => new WebSocket('ws://127.0.0.1')]) {
      assert.throws(action, { code: 'AUDIT_NETWORK_DISABLED' });
    }
  `);
});

test('resolver blocks Swiss, full routes, production DB modules and unapproved packages before evaluation', () => {
  script(`
    import assert from 'node:assert/strict';
    import { createRequire } from 'node:module';
    import { execute } from './${runner}';
    const require = createRequire(import.meta.url);
    await execute(['--mode', 'plan']);
    for (const name of ['sweph-wasm', 'dotenv', './worker/lib/db.js', './worker/lib/models.js', './worker/routes/ziwei-ai.js', 'mongodb']) {
      await assert.rejects(import(name), { code: 'AUDIT_IMPORT_BLOCKED' });
      assert.throws(() => require(name), { code: 'AUDIT_IMPORT_BLOCKED' });
    }
  `);
});

test('source drift is rejected before service import without changing any source file', () => {
  script(`
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import { execute } from './${runner}';
    const read = fs.readFileSync;
    fs.readFileSync = function(file, ...args) {
      const value = read.call(this, file, ...args);
      return String(file).replaceAll('\\\\', '/').endsWith('/worker/lib/ziwei-calculation-preparation.js') ? value + '\\n// synthetic drift' : value;
    };
    await assert.rejects(execute(['--mode', 'plan']), { code: 'AUDIT_SOURCE_CHANGED' });
  `);
});

test('dependency drift is rejected before driver import without changing installed packages', () => {
  script(`
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import { execute } from './${runner}';
    const read = fs.readFileSync;
    fs.readFileSync = function(file, ...args) {
      const value = read.call(this, file, ...args);
      return String(file).replaceAll('\\\\', '/').endsWith('/mongodb/lib/index.js') ? Buffer.from('synthetic drift') : value;
    };
    await assert.rejects(execute(['--mode', 'check-driver']), { code: 'AUDIT_DEPENDENCY_CHANGED' });
  `);
});

test('approved-target transport rule forwards only its exact TCP destination to an injected socket', () => {
  script(`
    import assert from 'node:assert/strict';
    import net from 'node:net';
    import { guardNetwork } from './tools/oracle/isolated-db/network.mjs';
    let forwarded = 0;
    net.Socket.prototype.connect = function() { forwarded++; return this; }; // No real socket connection.
    const guard = guardNetwork();
    guard.allowMongo({ host: '127.0.0.1', port: 27017 });
    new net.Socket().connect({ host: '127.0.0.1', port: 27017 });
    new net.Socket().connect(27017, '127.0.0.1');
    for (const options of [{ host: '127.0.0.1', port: 27018 }, { host: '8.8.8.8', port: 27017 },
      { host: 'localhost', port: 27017 }, { host: '127.0.0.1', port: 27017, path: '/tmp/socket' }]) {
      assert.throws(() => new net.Socket().connect(options), { code: 'AUDIT_NETWORK_DISABLED' });
    }
    assert.equal(forwarded, 2);
    assert.throws(() => fetch('http://127.0.0.1:27017'), { code: 'AUDIT_NETWORK_DISABLED' });
  `);
});

test('bounded storage denies foreign owners, authority v2, unknown IDs and writes to missing-record case', async () => {
  const backend = memoryBackend(), store = boundedStore(backend, cases);
  const valid = { _id: cases.ids.main, featureKey: FEATURE, authorityVersion: 'legacy', ...cases.entries.main };
  for (const record of [{ ...valid, userId: 'customer' }, { ...valid, authorityVersion: 'calendar-authority-v2' },
    { ...valid, _id: 'existing-paid' }, { ...valid, _id: cases.ids.missing }, { ...valid, inputHash: 'other' }]) {
    await assert.rejects(store.models[0].create(record), { code: 'AUDIT_RECORD_OUT_OF_SCOPE' });
  }
  await assert.rejects(store.models[0].findById('existing-paid').lean(), { code: 'AUDIT_RECORD_OUT_OF_SCOPE' });
  await assert.rejects(store.saveConsultation({ _id: cases.consultationIds[0], userId: 'customer' }), { code: 'AUDIT_RECORD_OUT_OF_SCOPE' });
  assert.deepEqual(store.count, { reads: 0, insertAttempts: 0, preparationRows: 0, consultationRows: 0 });
  assert.deepEqual(Object.keys(store.models[0]).sort(), ['create', 'findById']);
});

test('read and insert budgets stop backend calls even on repeated duplicate attempts', async () => {
  let writes = 0, reads = 0;
  const collection = { async findOne() { reads++; return null; }, async insertOne() { writes++; throw Object.assign(new Error('duplicate'), { code: 11000 }); } };
  const store = boundedStore({ preparations: [collection, collection], consultations: collection }, cases);
  for (let i = 0; i < LIMITS.reads; i++) await store.models[0].findById(cases.ids.main).lean();
  await assert.rejects(store.models[1].findById(cases.ids.main).lean(), { code: 'AUDIT_READ_LIMIT' });
  const record = { _id: cases.ids.main, featureKey: FEATURE, authorityVersion: 'legacy', ...cases.entries.main };
  for (let i = 0; i < LIMITS.insertAttempts; i++) await assert.rejects(store.models[i % 2].create(record), { code: 11000 });
  await assert.rejects(store.models[0].create(record), { code: 'AUDIT_WRITE_LIMIT' });
  assert.equal(writes, LIMITS.insertAttempts); assert.equal(reads, LIMITS.reads);
});

function fakeDriver({ existing = [], failConnect = false } = {}) {
  const clients = [], collections = [];
  class FakeMongoClient {
    constructor(uri, options) { this.uri = uri; this.options = options; this.closed = false; clients.push(this); }
    async connect() { if (failConnect && clients.indexOf(this) === 1) throw new Error('synthetic connection error'); }
    db(name) {
      this.database = name;
      return { listCollections: () => ({ toArray: async () => existing }), collection: name => { collections.push(name); return {}; } };
    }
    async close() { this.closed = true; }
  }
  return { FakeMongoClient, clients, collections };
}

test('injected DB facade uses two narrow clients and only approved collections; no actual driver connects', async () => {
  const fake = fakeDriver(), target = validate(approval());
  const backend = await mongoBackend(target, fake.FakeMongoClient);
  assert.equal(fake.clients.length, 2);
  for (const client of fake.clients) {
    assert.equal(client.database, target.database);
    assert.equal(client.options.directConnection, true);
    assert.equal(client.options.retryWrites, false);
    assert.equal(client.options.maxPoolSize, 1);
  }
  assert.deepEqual(fake.collections, [COLLECTIONS.preparations, COLLECTIONS.preparations, COLLECTIONS.consultations]);
  await backend.close(); assert.ok(fake.clients.every(client => client.closed));
});

test('nonempty DB and failed connection close both injected clients without obtaining write handles', async () => {
  for (const setup of [{ existing: [{ name: 'customer-data' }] }, { failConnect: true }]) {
    const fake = fakeDriver(setup);
    await assert.rejects(mongoBackend(validate(approval()), fake.FakeMongoClient), { code: setup.failConnect ? 'AUDIT_CONNECTION_FAILED' : 'AUDIT_DATABASE_NOT_EMPTY' });
    assert.ok(fake.clients.every(client => client.closed)); assert.deepEqual(fake.collections, []);
  }
});

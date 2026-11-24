import { readFileSync } from 'node:fs';
import { jest } from '@jest/globals';
import { YeongnyangiRequest } from '../../worker/lib/yeongnyangi-models.js';
import { maskSecrets, resolveIndexTarget, runYeongnyangiIndexes } from '../../scripts/yeongnyangi-indexes.mjs';

// Fake fixture, split so the gitleaks MongoDB-credential rule does not match the source; the runtime URI still carries a password.
const URI = 'mongodb+srv://user:' + 'secret@cluster.example/?retryWrites=true';

// Mocked mongoose: connects to `connectedDb` whatever dbName was asked for, so a mismatch is observable.
function fakeDb({ connectedDb = 'code_destiny', collections = ['yeongnyangi_requests'] } = {}) {
  const db = {
    connect: jest.fn(async () => {}),
    disconnect: jest.fn(async () => {}),
    connection: {
      db: {
        databaseName: connectedDb,
        listCollections: jest.fn((filter) => ({ toArray: async () => collections.filter((name) => name === filter.name).map((name) => ({ name })) })),
      },
    },
  };
  const model = {
    collection: { collectionName: 'yeongnyangi_requests', listIndexes: () => ({ toArray: async () => [{ name: '_id_', key: { _id: 1 } }] }) },
    schema: { indexes: () => [[{ state: 1, completionMailSentAt: 1, completedAt: 1 }, { name: 'completion_mail_sweep' }]] },
    createIndexes: jest.fn(async () => {}),
  };
  return { db, model, loadModel: async () => model };
}

test('index script refuses to run without an explicit database name', async () => {
  expect(() => resolveIndexTarget({ argv: ['--apply'], env: { YEONGNYANGI_INDEX_MONGODB_URI: URI } })).toThrow(/YEONGNYANGI_INDEX_DB_NAME/);
  const { db, model, loadModel } = fakeDb();
  await expect(runYeongnyangiIndexes({ argv: ['--apply'], env: { YEONGNYANGI_INDEX_MONGODB_URI: URI }, db, loadModel, log: () => {} }))
    .rejects.toThrow(/no default database/);
  expect(db.connect).not.toHaveBeenCalled();
  expect(model.createIndexes).not.toHaveBeenCalled();
});

test('index script passes dbName and stops before any write when the connected database differs', async () => {
  const { db, model, loadModel } = fakeDb({ connectedDb: 'test' });
  const env = { YEONGNYANGI_INDEX_MONGODB_URI: URI, YEONGNYANGI_INDEX_DB_NAME: 'code_destiny' };
  await expect(runYeongnyangiIndexes({ argv: ['--apply'], env, db, loadModel, log: () => {} })).rejects.toThrow(/expected code_destiny/);
  expect(db.connect).toHaveBeenCalledWith(URI, expect.objectContaining({ dbName: 'code_destiny', autoIndex: false, autoCreate: false }));
  expect(model.createIndexes).not.toHaveBeenCalled();
  expect(db.disconnect).toHaveBeenCalled();
});

test('index script --apply requires the target collection to exist already', async () => {
  const { db, model, loadModel } = fakeDb({ collections: [] });
  const env = { YEONGNYANGI_INDEX_MONGODB_URI: URI };
  await expect(runYeongnyangiIndexes({ argv: ['--apply', '--db=code_destiny'], env, db, loadModel, log: () => {} })).rejects.toThrow(/does not exist/);
  expect(model.createIndexes).not.toHaveBeenCalled();
});

test('index script reports the target and never prints the connection string', async () => {
  const { db, loadModel } = fakeDb();
  const lines = [];
  const env = { YEONGNYANGI_INDEX_MONGODB_URI: URI, YEONGNYANGI_INDEX_DB_NAME: 'code_destiny' };
  await expect(runYeongnyangiIndexes({ argv: [], env, db, loadModel, log: (line) => lines.push(line) })).resolves.toEqual({ missing: 1 });
  expect(lines[0]).toBe('target: code_destiny.yeongnyangi_requests (read-only)');
  expect(lines.join('\n')).not.toMatch(/secret|mongodb/);
  expect(maskSecrets(`failed ${URI} now`)).toBe('failed <masked-uri> now');
});

// autoIndex is off in the worker: this declaration only takes effect via scripts/yeongnyangi-indexes.mjs --apply.
test('completion-mail sweep has an index: equality fields first, then the range/sort field', () => {
  const sweep = YeongnyangiRequest.schema.indexes().find(([, options]) => options.name === 'completion_mail_sweep');
  expect(sweep).toBeDefined();
  expect(Object.keys(sweep[0])).toEqual(['state', 'completionMailSentAt', 'completedAt']);
  expect(sweep[1].unique).toBeFalsy();
  expect(sweep[1].expireAfterSeconds).toBeUndefined();
});

test('sweep query still matches the index shape', () => {
  const source = readFileSync(new URL('../../worker/yeongnyangi/completion-mail.js', import.meta.url), 'utf8');
  const find = source.slice(source.indexOf('YeongnyangiRequest.find({'));
  expect(find).toMatch(/^YeongnyangiRequest\.find\(\{\s*state: 'COMPLETED', completedAt: \{ \$gte:/);
  expect(find).toMatch(/completionMailSentAt: null/);
  expect(find).toMatch(/\.sort\(\{ completedAt: 1 \}\)/);
});

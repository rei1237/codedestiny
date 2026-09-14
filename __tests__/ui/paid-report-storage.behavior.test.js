const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(context, file, names) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  for (const name of names) {
    const node = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.ok(node, name);
    vm.runInContext(node.getText(ast).replace(/^export\s+/, ''), context);
  }
}

function fixture(mode, initialStatus = 'partial') {
  const chapter = { id: 'overview', order: 0, title: '요약', body: '보존된 해설', chars: 6, provider: 'mock', ok: true };
  let doc = { id: 'report', userId: 'owner', idempotencyKey: 'paid-key', status: initialStatus, chapters: [chapter], updatedAt: new Date(0) };
  let writes = 0;
  const ctx = vm.createContext({
    console: { warn() {} }, Date, JSON, Map,
    clean: v => String(v || '').trim(), connectDb: async () => {},
    fetch: async () => { throw new Error('EXTERNAL_FETCH_BLOCKED'); },
    ZiweiDeepReport: {
      findOne: filter => ({ lean: async () => mode === 'read-null' ? null : (filter.userId === doc.userId ? structuredClone(doc) : null) }),
      findOneAndUpdate: (_filter, update) => {
        const run = async () => {
          writes++;
          if (mode === 'throw') throw new Error('mock write failure');
          if (mode === 'null') return null;
          doc = { ...doc, ...structuredClone(update.$set) };
          return structuredClone(doc);
        };
        return { then: (a,b) => run().then(a,b), lean: run };
      },
    },
  });
  load(ctx, 'worker/lib/result-storage.js', ['resultStorageUnavailable']);
  load(ctx, 'worker/routes/ziwei-deep-report.js', ['chaptersForDb', 'loadStoredReport', 'mergeChapters', 'persistFirstBatch', 'persistNextBatch']);
  return { ctx, chapter, get doc() { return doc; }, get writes() { return writes; } };
}

for (const mode of ['throw', 'null', 'read-null']) {
  for (const batch of ['first', 'next']) {
    test(`자미두수 ${batch} 저장 ${mode}는 완료 대신 저장 장애`, async () => {
      const f = fixture(mode);
      const action = batch === 'first'
        ? f.ctx.persistFirstBatch({}, 'owner', { idempotencyKey: 'paid-key' }, 'report', {}, [f.chapter], 'pass')
        : f.ctx.persistNextBatch({}, 'owner', 'report', [f.chapter], true);
      await assert.rejects(action, error => error.code === 'RESULT_STORAGE_UNAVAILABLE' && error.status === 503 && error.resultId === 'report');
    });
  }
}
test('자미두수 재시도는 장을 중복하지 않고 완료본은 덮어쓰지 않는다', async () => {
  const f = fixture('success');
  await f.ctx.persistNextBatch({}, 'owner', 'report', [f.chapter], true);
  assert.equal(f.doc.chapters.length, 1);
  assert.equal(f.doc.status, 'completed');
  await f.ctx.persistNextBatch({}, 'owner', 'report', [{ ...f.chapter, body: '훼손' }], false);
  assert.equal(f.doc.chapters[0].body, '보존된 해설');
  assert.equal(f.writes, 1);
});
test('자미두수 다른 계정은 저장된 결과를 수정할 수 없다', async () => {
  const f = fixture('success');
  await assert.rejects(f.ctx.persistNextBatch({}, 'other', 'report', [f.chapter], true), { code: 'RESULT_STORAGE_UNAVAILABLE' });
  assert.equal(f.writes, 0);
});

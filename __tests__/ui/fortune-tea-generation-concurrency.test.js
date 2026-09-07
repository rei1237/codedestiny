const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the production claim, with only the DB/formatting boundaries faked.
// No route imports, network, credentials, PG or LLM are available in this VM.
const source = fs.readFileSync(path.resolve(__dirname, '../../worker/routes/fortune-tea-house.js'), 'utf8');
const ast = ts.createSourceFile('tea.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'beginFortuneTeaHouseGeneration');
assert.ok(declaration);

function fixture(seed = null) {
  let row = seed && structuredClone(seed);
  let readers = 0;
  let release;
  const bothRead = new Promise(resolve => { release = resolve; });
  const writes = [];
  const results = {
    async findOne() {
      const snapshot = row && structuredClone(row);
      if (++readers === 2) release();
      await bothRead;
      return snapshot;
    },
    async updateOne(filter, update, options) {
      writes.push(filter);
      const matches = row && Object.entries(filter).every(([key, expected]) => {
        if (expected && typeof expected === 'object' && '$exists' in expected) return (row[key] !== undefined) === expected.$exists;
        if (expected === null) return row[key] == null;
        return String(row[key]) === String(expected);
      });
      if (matches) {
        Object.assign(row, structuredClone(update.$set));
        return { matchedCount: 1, modifiedCount: 1 };
      }
      if (!options.upsert) return { matchedCount: 0, modifiedCount: 0 };
      if (row) throw Object.assign(new Error('duplicate _id'), { code: 11000 });
      row = structuredClone({ ...update.$setOnInsert, ...update.$set });
      return { upsertedCount: 1, upsertedId: row._id };
    },
  };
  const context = vm.createContext({
    honeyCollections: () => ({ results }),
    cleanText: value => String(value || ''),
    normalizeConsultationMode: value => value,
    buildFortuneTeaResultStorageId: (user, result) => `${user}:${result}`,
    FORTUNE_TEA_HOUSE_SCOPE: 'fortune-tea-house',
    publicFortuneTeaStoredResult: doc => doc.result || null,
    isFreshFortuneTeaGeneration: doc => doc?.status === 'generating' && Date.now() - new Date(doc.updatedAt).getTime() < 10000,
  });
  vm.runInContext(declaration.getText(ast) + '\nthis.begin = beginFortuneTeaHouseGeneration;', context);
  const input = { auth: { userId: 'buyer' }, resultId: 'attempt', requestId: 'attempt', featureKey: 'tea', consultRequest: { consultationMode: 'tarot' } };
  return { run: () => context.begin(input), row: () => row, writes };
}

test('two callbacks reading no result claim exactly one generation', async () => {
  const f = fixture();
  const outcomes = await Promise.all([f.run(), f.run()]);
  assert.equal(outcomes.filter(result => result.ok).length, 1);
  assert.equal(outcomes.filter(result => result.inProgress).length, 1);
});

for (const status of ['generation_failed', 'generating']) {
  test(`two retries of ${status} claim exactly one generation`, async () => {
    const f = fixture({ _id: 'buyer:attempt', userId: 'buyer', resultId: 'attempt', status, updatedAt: new Date(0) });
    const outcomes = await Promise.all([f.run(), f.run()]);
    assert.equal(outcomes.filter(result => result.ok).length, 1);
    assert.equal(outcomes.filter(result => result.inProgress).length, 1);
  });
}

test('completed result is replayed without a generation write', async () => {
  const f = fixture({ userId: 'buyer', resultId: 'attempt', status: 'completed', result: { text: 'paid result' } });
  const outcomes = await Promise.all([f.run(), f.run()]);
  assert.equal(outcomes.every(result => result.completed && result.result.text === 'paid result'), true);
  assert.equal(f.writes.length, 0);
});

test('fresh running result is not reclaimed', async () => {
  const f = fixture({ userId: 'buyer', resultId: 'attempt', status: 'generating', updatedAt: new Date() });
  const outcomes = await Promise.all([f.run(), f.run()]);
  assert.equal(outcomes.every(result => result.inProgress), true);
  assert.equal(f.writes.length, 0);
});

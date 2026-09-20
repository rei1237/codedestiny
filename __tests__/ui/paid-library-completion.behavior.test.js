const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const sift = require('sift').default;

function load(ctx, file, name) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const node = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.ok(node, `${file}: ${name}`);
  vm.runInContext(node.getText(ast).replace(/^export\s+/, ''), ctx);
}

const routes = [
  ['worker/routes/destiny-compass-ai.js', 'DestinyCompassReport', 'handleResult', 'reports'],
  ['worker/routes/ziwei-deep-report.js', 'ZiweiDeepReport', 'handleResult', 'reports'],
  ['worker/routes/human-design-report.js', 'HumanDesignReport', 'handleResult', 'reports'],
  ['worker/lib/fusion-fortune-consultation.js', 'FusionFortuneConsultation', 'listFusionFortuneConsultations', null],
];
for (const [file, model, handler, key] of routes) {
  test(`${model}: archive excludes incomplete, failed and other owners before pagination`, async () => {
    const rows = [
      ...Array.from({ length: 25 }, (_, i) => ({ id: `partial-${i}`, userId: 'owner', status: 'partial' })),
      ...['generating', 'delivery_pending', 'generation_failed', 'refunded', 'unknown'].map(status => ({ id: status, userId: 'owner', status })),
      { id: 'other', userId: 'other', status: 'completed' },
      { id: 'finished', userId: 'owner', status: 'completed' },
    ];
    let selected, filter;
    const query = { sort() { return this; }, select() { return this; }, limit(n) { selected = selected.slice(0, n); return this; }, lean: async () => selected };
    const ctx = vm.createContext({ URL, Request, console,
      [model]: { find(value) { filter = value; selected = rows.filter(sift(value)); return query; } },
      getOptionalUserFromRequest: async () => ({ userId: 'owner' }), requireAuth: async () => ({ userId: 'owner' }),
      connectDb: async () => {}, withMongoRetry: async (_env, fn) => fn(),
      clean: value => String(value || ''), text: value => String(value || ''), HD_REPORT_LOCALES: ['ko'], noStore: {},
      json: value => value, isTransientMongoError: () => false,
    });
    load(ctx, file, handler);
    const data = key ? await ctx[handler](new Request('https://mock.test/result'), {}) : await ctx[handler]({ userId: 'owner' });
    const result = key ? data[key] : data;
    assert.equal(filter.status, 'completed');
    assert.equal(result.length, 1);
    assert.equal(result[0].id || result[0].reportId, 'finished');
    if (file.includes('destiny-compass') || file.includes('ziwei-deep')) {
      const pending = await ctx[handler](new Request('https://mock.test/result?pending=1'), {});
      assert.ok(pending[key].length > 0);
      assert.ok(pending[key].every(row => row.status === 'partial'));
    }
  });
}

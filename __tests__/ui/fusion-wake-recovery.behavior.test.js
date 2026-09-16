const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('document closure immediately after the paid gate retains the prepared input as well as its request ID', async () => {
  const ast = ts.createSourceFile('FusionFortuneClient.tsx', fs.readFileSync('app/fusion-fortune/FusionFortuneClient.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let submit, remember;
  function findSubmit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'submit') submit = node.initializer; ts.forEachChild(node, findSubmit); }
  findSubmit(ast); assert.ok(submit);
  function findRemember(node) { if (ts.isCallExpression(node) && node.expression.getText(ast) === 'rememberPaidRequest' && node.arguments[0]?.getText(ast) === 'requestId') remember = node.getText(ast); ts.forEachChild(node, findRemember); }
  findRemember(submit); assert.ok(remember);
  const values = new Map(), local = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const { writeFusionPaidRequest, readFusionPaidRequest } = await import('../../lib/fusion-paid-request-store.js');
  const formRequestBody = { birthDate: '1995-04-18', birthTime: '08:30', locale: 'ko', concern: 'original paid question', birthPlace: { city: '서울' } };
  vm.runInNewContext(remember, { requestId: 'original-paid-request', formRequestBody,
    rememberPaidRequest: (requestId, body) => writeFusionPaidRequest({ requestId, body }, { local, ownerId: 'original-owner' }),
  }); // Execution ends here: no stream request or later write survives the closed document.
  const restored = readFusionPaidRequest({ local, ownerId: 'original-owner' });
  assert.equal(restored.requestId, 'original-paid-request'); assert.deepEqual(restored.body, formRequestBody);
});

test('blocked receipt storage still resumes the owner-scoped original purchase held by the actual client', async () => {
  const ast = ts.createSourceFile('FusionFortuneClient.tsx', fs.readFileSync('app/fusion-fortune/FusionFortuneClient.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let effect;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0]?.getText(ast).includes('if (!pendingPaidRequest || loading')) effect = node.arguments[0].getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.ok(effect);
  const body = { birthDate: '1995-04-18', locale: 'ko', concern: 'original private question' }, calls = [];
  const context = { pendingPaidRequest: true, loading: false, autoResumeRef: { current: false }, document: { visibilityState: 'visible' }, navigator: { onLine: true },
    readFusionPaidRequest: () => null, currentFusionOwner: () => 'original-owner', paidRequestIdRef: { current: 'original-paid-run' }, paidRequestBodyRef: { current: body },
    recoverPaidResult: async () => 'partial', recoveredStageRef: { current: 2 }, runGenerationRef: { current: async (...args) => calls.push(args) },
  };
  vm.runInNewContext('(' + effect + ')()', context);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.length, 1); assert.equal(calls[0][0], 'original-paid-run'); assert.equal(calls[0][1], body); assert.equal(calls[0][2], 2);
});

test('actual fusion wake effect resumes the same purchase on every foreground event and cleans up', () => {
  const source = fs.readFileSync('app/fusion-fortune/FusionFortuneClient.tsx', 'utf8');
  const ast = ts.createSourceFile('FusionFortuneClient.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let effect;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0]?.getText(ast).includes('setResumeEpoch(value => value + 1)')) effect = node.arguments[0].getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.ok(effect);
  const handlers = new Map(), surface = name => ({
    addEventListener: (event, run) => handlers.set(name + event, run),
    removeEventListener: event => handlers.delete(name + event),
  });
  let epoch = 0;
  const context = { window: surface('window:'), document: { ...surface('document:'), visibilityState: 'visible' }, navigator: { onLine: true },
    requestAbortRef: { current: null }, autoResumeRef: { current: true }, setResumeEpoch: update => { epoch = update(epoch); } };
  const cleanup = vm.runInNewContext('(' + effect + ')()', context);
  for (const key of ['window:pageshow', 'window:focus', 'window:online', 'document:visibilitychange']) {
    assert.equal(typeof handlers.get(key), 'function', key);
    context.autoResumeRef.current = true; handlers.get(key)(); assert.equal(context.autoResumeRef.current, false);
  }
  assert.equal(epoch, 4);
  context.requestAbortRef.current = {}; handlers.get('window:focus')(); assert.equal(epoch, 4);
  context.requestAbortRef.current = null; context.document.visibilityState = 'hidden'; handlers.get('window:pageshow')(); assert.equal(epoch, 4);
  context.document.visibilityState = 'visible'; context.navigator.onLine = false; handlers.get('window:online')(); assert.equal(epoch, 4);
  cleanup(); assert.equal(handlers.size, 0);
});

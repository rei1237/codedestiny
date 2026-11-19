const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function extractEffect(file, match) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let effect;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0]?.getText(ast).includes(match)) effect = node.arguments[0].getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(effect, `effect containing "${match}" not found in ${file}`);
  return effect;
}

test('actual neo result recover effect resumes polling on every foreground event and cleans up', () => {
  const effect = extractEffect('src/features/neo-war-room/NeoOperationRoomResultPage.tsx', 'setRecoveryEpoch(value => value + 1)');
  const handlers = new Map(), surface = name => ({
    addEventListener: (event, run) => handlers.set(name + event, run),
    removeEventListener: event => handlers.delete(name + event),
  });
  let epoch = 0;
  const context = {
    window: surface('window:'), document: { ...surface('document:'), visibilityState: 'visible' }, navigator: { onLine: true },
    paymentSurface: 'web', localPreviewMode: '',
    setRecoveryEpoch: update => { epoch = update(epoch); },
  };
  const cleanup = vm.runInNewContext('(' + effect + ')()', context);
  for (const key of ['window:pageshow', 'window:focus', 'window:online', 'document:visibilitychange']) {
    assert.equal(typeof handlers.get(key), 'function', key);
    handlers.get(key)();
  }
  assert.equal(epoch, 4);
  context.document.visibilityState = 'hidden'; epoch = 0; handlers.get('window:pageshow')(); assert.equal(epoch, 0);
  context.navigator.onLine = false; context.document.visibilityState = 'visible'; handlers.get('window:online')(); assert.equal(epoch, 0);
  cleanup(); assert.equal(handlers.size, 0);
});

test('neo Toss foreground recheck hides the previous result and invalidates pending responses', () => {
  const effect = extractEffect('src/features/neo-war-room/NeoOperationRoomResultPage.tsx', 'setRecoveryEpoch(value => value + 1)');
  const handlers = new Map(), surface = name => ({
    addEventListener: (event, run) => handlers.set(name + event, run),
    removeEventListener: event => handlers.delete(name + event),
  });
  const shown = [], loading = [], accessEpoch = { current: 0 };
  const context = {
    window: surface('window:'), document: { ...surface('document:'), visibilityState: 'visible' }, navigator: { onLine: true },
    paymentSurface: 'toss', localPreviewMode: '', accessEpoch,
    setSession: value => shown.push(value), setLoading: value => loading.push(value),
    setPdfLoading: () => {}, setExportExpand: () => {}, setRefining: () => {}, setRecoveryEpoch: () => {},
  };
  const cleanup = vm.runInNewContext('(' + effect + ')()', context);
  handlers.get('window:focus')();
  assert.equal(accessEpoch.current, 1);
  assert.deepEqual(shown, [null]);
  assert.deepEqual(loading, [true]);
  cleanup(); assert.equal(handlers.size, 0);
});

test('actual neo input-page recover effect redirects an abandoned pending session to the result page on every foreground event and cleans up', async () => {
  const effect = extractEffect('src/features/neo-war-room/NeoOperationRoomPage.tsx', '/api/neo-operation-room/result").catch');
  const handlers = new Map(), surface = name => ({
    addEventListener: (event, run) => handlers.set(name + event, run),
    removeEventListener: event => handlers.delete(name + event),
  });
  const assigned = [];
  const context = {
    window: { ...surface('window:'), location: { replace: url => assigned.push(url) } },
    document: { ...surface('document:'), visibilityState: 'visible' },
    navigator: { onLine: true },
    captureOwner: () => () => true,
    authFetch: async () => ({ status: 202, json: async () => ({ sessionId: 'abandoned-neo-session' }) }),
    encodeURIComponent,
  };
  const cleanup = vm.runInNewContext('(' + effect + ')()', context);
  await new Promise(resolve => setImmediate(resolve));
  for (const key of ['window:pageshow', 'window:focus', 'window:online', 'document:visibilitychange']) {
    assert.equal(typeof handlers.get(key), 'function', key);
    await handlers.get(key)();
  }
  assert.equal(assigned.length, 5);
  assert.ok(assigned.every(url => url === '/neo-operation-room/result?attemptId=abandoned-neo-session'));
  cleanup(); assert.equal(handlers.size, 0);
});

// 2026-11-18 S3-H: 1차 브리핑 생성이 서버에서 실패로 종결되면(자동 환불) '오래 걸린다' 대신 실패·환불 안내를 띄우고
// 부분 본문을 거둔다. 아직 진행 중(GENERATION_PENDING)·2차 점검 실패·토스 표면은 기존 안내를 유지한다.
function resultLoadHarness(script, surface = 'web') {
  const effect = extractEffect('src/features/neo-war-room/NeoOperationRoomResultPage.tsx', 'receiveNeoBriefing<NeoResultSession>(attemptId');
  const errors = [], sessions = [];
  let call = 0;
  const context = {
    availability: null, localPreviewMode: '', paymentSurface: surface, attemptId: 'neo-1', accessEpoch: { current: 0 },
    captureAccess: () => () => true,
    receiveNeoBriefing: async (_id, onProgress) => { const step = script[call++]; onProgress(step.progress); if (step.fail) throw new (vm.runInContext('Error', context))(step.fail); return step.result; },
    neoTossAccessError: () => '',
    getNeoBookCopy: () => ({ unavailable: 'toss-unavailable' }),
    getNeoErrorCopy: code => `error:${code}`,
    resultCopy: { loginRequiredError: 'login', pollTimeoutError: 'pending-delay', generationFailedRefundError: 'failed-refund' },
    dialogueLocale: 'ko',
    window: { history: { replaceState() {} } },
    setError: value => errors.push(value), setSession: value => sessions.push(value), setLoading: () => {},
    setSelectedChecks() {}, setFreeform() {}, setShowRealityForm() {}, setRetryOffer() {}, setRefining() {}, setPdfLoading() {}, setExportExpand() {},
  };
  const transpiled = ts.transpileModule('(' + effect + ')()', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(transpiled, context);
  return { errors: () => errors.filter(Boolean), sessions, settle: async () => { for (let i = 0; i < 10; i++) await new Promise(resolve => setImmediate(resolve)); } };
}
const partial = { ok: true, sessionId: 'neo-1', status: 'partial', initialBriefing: { operationTitle: '부분' } };
for (const code of ['LLM_ERROR', 'CALCULATION_ERROR']) test(`neo result page shows the failure and automatic refund notice when the initial briefing ends ${code}, and withdraws the partial`, async () => {
  const h = resultLoadHarness([{ progress: partial, fail: code }]);
  await h.settle();
  assert.deepEqual(h.errors(), ['failed-refund']);
  assert.equal(h.sessions.at(-1), null);
});
test('neo result page keeps the partial and the delay notice while the server is still generating', async () => {
  const h = resultLoadHarness([{ progress: partial, fail: 'GENERATION_PENDING' }]);
  await h.settle();
  assert.deepEqual(h.errors(), ['pending-delay']);
  assert.equal(h.sessions.at(-1), partial);
});
test('neo reality-check failure never withdraws the delivered briefing or promises a refund', async () => {
  const delivered = { ok: true, sessionId: 'neo-1', status: 'completed', refinementStatus: 'generating', initialBriefing: { operationTitle: '완료' } };
  const h = resultLoadHarness([{ progress: delivered, result: delivered }, { progress: delivered, fail: 'LLM_ERROR' }]);
  await h.settle();
  // 2026-11-19 다시 시도 우선: '오래 걸린다' 페이지 오류 대신 첫 브리핑을 그대로 두고 수정 라운드만 실패로 표시해
  // '같은 답변으로 다시 시도' 안내를 띄운다(neo-refinement-retry.behavior.test.js).
  assert.deepEqual(h.errors(), []);
  const last = h.sessions.at(-1);
  assert.equal(typeof last, 'function');
  const marked = last(delivered);
  assert.equal(marked.refinementStatus, 'generation_failed');
  assert.equal(marked.initialBriefing, delivered.initialBriefing);
});
test('neo Toss surface does not promise the web refund on a failed briefing', async () => {
  const h = resultLoadHarness([{ progress: partial, fail: 'LLM_ERROR' }], 'toss');
  await h.settle();
  assert.equal(h.errors().includes('failed-refund'), false);
});

// 2026-11-19 S16 "전체 완료 후 한 번에": 화면은 completed 전에는 브리핑을 그리지 않고, 작성 중인 수정본(pendingRefinedOrder)도 쓰지 않는다.
test('neo result page renders the briefing only once the session is completed and never a pending refinement', () => {
  const source = fs.readFileSync('src/features/neo-war-room/NeoOperationRoomResultPage.tsx', 'utf8');
  const briefing = source.match(/const briefing = (session\?\.status[^;]+);/)?.[1] || '';
  const run = session => vm.runInNewContext(briefing, { session });
  assert.equal(run({ status: 'generating', initialBriefing: { title: 'x' } }), null);
  assert.equal(run({ status: 'delivery_pending', initialBriefing: { title: 'x' } }), null);
  assert.deepEqual(run({ status: 'completed', initialBriefing: { title: 'x' } }), { title: 'x' });
  assert.equal(/session\??\.pendingRefinedOrder/.test(source), false);
});

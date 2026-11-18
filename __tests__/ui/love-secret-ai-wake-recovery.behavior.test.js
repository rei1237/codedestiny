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

test('actual love-secret-ai start-screen discovery effect re-checks the resumable session on every foreground event, respects the hidden guard, and cleans up', () => {
  const effect = extractEffect('app/love-secret-ai/LoveSecretAiClient.tsx', 'setDiscoveryEpoch(value => value + 1)');
  const handlers = new Map(), surface = name => ({
    addEventListener: (event, run) => handlers.set(name + event, run),
    removeEventListener: event => handlers.delete(name + event),
  });
  const epochCalls = [];
  const context = {
    window: surface('window:'),
    document: { ...surface('document:'), hidden: false },
    setDiscoveryEpoch: (updater) => epochCalls.push(updater),
  };
  const transpiled = ts.transpileModule('(' + effect + ')()', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const cleanup = vm.runInNewContext(transpiled, context);

  const foregroundEvents = ['window:pageshow', 'window:focus', 'window:online', 'document:visibilitychange'];
  for (const key of foregroundEvents) assert.equal(typeof handlers.get(key), 'function', `${key} handler must be registered`);

  foregroundEvents.forEach((key, index) => {
    handlers.get(key)();
    assert.equal(epochCalls.length, index + 1, `${key} should bump discoveryEpoch`);
  });

  context.document.hidden = true;
  handlers.get('window:pageshow')();
  assert.equal(epochCalls.length, foregroundEvents.length, 'a hidden document must not bump discoveryEpoch');

  cleanup();
  assert.equal(handlers.size, 0, 'cleanup must remove every listener');
});

test('actual love-secret-ai result-screen polling effect re-fetches on every foreground event, respects the hidden/alive/ownership guards, and cleans up', async () => {
  const effect = extractEffect('app/love-secret-ai/result/LoveSecretAiResultClient.tsx', 'setReloadEpoch(value => value + 1)');
  const handlers = new Map(), surface = name => ({
    addEventListener: (event, run) => handlers.set(name + event, run),
    removeEventListener: event => handlers.delete(name + event),
  });
  const fetchCalls = [];
  const epochCalls = [];
  let currentOwner = true;
  const context = {
    paymentSurface: undefined,
    authorityRevisionRef: { current: 0 },
    window: { ...surface('window:'), setTimeout: () => 1, clearTimeout: () => {} },
    document: { ...surface('document:'), hidden: false },
    captureDeliveryScope: () => () => currentOwner,
    authFetch: async (url) => { fetchCalls.push(url); return { ok: true, status: 200, json: async () => ({ status: 'completed', ok: true }) }; },
    readDevPreviewState: () => '',
    buildDevPreviewResponse: () => ({ ok: true, status: 200, json: async () => ({}) }),
    buildLoveSecretPreviewPayload: () => ({}),
    buildResultEndpoint: () => '/api/love-secret-ai/result',
    isRetriableResultPollFailure: () => false,
    toText: (value) => (value == null ? '' : String(value)),
    friendlyErrorMessage: (_err, fallback) => fallback,
    copy: { loadResultFailedError: 'load-failed', genResultTimeoutError: 'timeout' },
    setError: () => {},
    setPending: () => {},
    setLoading: () => {},
    setConsultation: () => {},
    setReloadEpoch: (updater) => epochCalls.push(updater),
  };
  const transpiled = ts.transpileModule('(' + effect + ')()', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const cleanup = vm.runInNewContext(transpiled, context);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fetchCalls.length, 1, 'mount should fetch the result once');

  const foregroundEvents = ['window:pageshow', 'window:focus', 'document:visibilitychange'];
  for (const key of foregroundEvents) assert.equal(typeof handlers.get(key), 'function', `${key} handler must be registered`);

  foregroundEvents.forEach((key, index) => {
    handlers.get(key)();
    assert.equal(epochCalls.length, index + 1, `${key} should bump reloadEpoch`);
  });

  context.document.hidden = true;
  handlers.get('window:pageshow')();
  assert.equal(epochCalls.length, foregroundEvents.length, 'a hidden document must not bump reloadEpoch');

  context.document.hidden = false;
  currentOwner = false;
  handlers.get('window:focus')();
  assert.equal(epochCalls.length, foregroundEvents.length, 'a stale owner must not bump reloadEpoch');

  currentOwner = true;
  const focusHandler = handlers.get('window:focus');
  cleanup();
  assert.equal(handlers.size, 0, 'cleanup must remove every listener');
  focusHandler();
  assert.equal(epochCalls.length, foregroundEvents.length, 'a cleaned-up effect must not bump reloadEpoch after unmount');
});

// 2026-11-18 S3-F: 서버가 그룹 시도를 다 쓰면 축소 전달·환불로 끝내므로, 결과 화면은 그때까지 생성 중을 유지하고
// 생성 실패 종결(generation_failed)은 지연 안내가 아니라 실패·자동 복구 안내로 바로 보여 준다.
function resultEffectHarness(reply) {
  const effect = extractEffect('app/love-secret-ai/result/LoveSecretAiResultClient.tsx', 'setReloadEpoch(value => value + 1)');
  const timers = [], gets = [], posts = [], errors = [], pending = [], consultations = [];
  const respond = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
  const context = {
    paymentSurface: undefined,
    authorityRevisionRef: { current: 0 },
    window: { addEventListener() {}, removeEventListener() {}, setTimeout: (run) => { timers.push(run); return timers.length; }, clearTimeout: () => {} },
    document: { addEventListener() {}, removeEventListener() {}, hidden: false },
    captureDeliveryScope: () => () => true,
    authFetch: async (url, init) => {
      if (init?.method === 'POST') { posts.push(JSON.parse(init.body)); return respond(...reply('POST', posts.length)); }
      gets.push(url); return respond(...reply('GET', gets.length));
    },
    readDevPreviewState: () => '',
    buildDevPreviewResponse: () => respond(200, {}),
    buildLoveSecretPreviewPayload: () => ({}),
    buildResultEndpoint: () => '/api/love-secret-ai/result',
    isRetriableResultPollFailure: (status, payload) => status === 503 || payload?.retryable === true,
    toText: (value) => (value == null ? '' : String(value)),
    friendlyErrorMessage: (err, fallback) => err?.message || fallback,
    copy: { loadResultFailedError: 'load-failed', genResultTimeoutError: 'timeout', genFailedRefundError: '생성 실패·자동 복구 안내' },
    setError: (value) => errors.push(value),
    setPending: (value) => pending.push(value),
    setLoading: () => {},
    setConsultation: (value) => consultations.push(value),
    setReloadEpoch: () => {},
  };
  const transpiled = ts.transpileModule('(' + effect + ')()', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(transpiled, context);
  const settle = async () => { for (let i = 0; i < 20; i += 1) await new Promise(resolve => setImmediate(resolve)); };
  const drain = async (limit = 60) => { await settle(); for (let i = 0; i < limit && timers.length; i += 1) { timers.shift()(); await settle(); } };
  return { timers, gets, posts, errors: () => errors.filter(Boolean), pending, consultations, drain };
}
const failedBody = { ok: false, sessionId: 's1', status: 'generation_failed', reason: 'LLM_ERROR', message: '서버 문구' };
const partialBody = (n) => ({ ok: true, sessionId: 's1', status: 'partial', saved: false, completedGroups: Array(Math.min(n, 7)).fill('g'), totalGroups: 7 });

test('연애 결과 화면은 생성 실패 종결(generation_failed 503)을 재폴링하지 않고 실패·자동 복구 안내로 보여 준다', async () => {
  const h = resultEffectHarness(() => [503, failedBody]);
  await h.drain();
  assert.equal(h.gets.length, 1, 'generation_failed 는 일시 장애가 아니므로 다시 부르지 않는다');
  assert.deepEqual(h.errors(), ['생성 실패·자동 복구 안내']);
  assert.equal(h.pending.at(-1), false);
});
test('연애 결과 화면은 이어 쓰기 응답이 생성 실패 종결이면 부분 본문을 거두고 실패·자동 복구 안내를 보여 준다', async () => {
  const h = resultEffectHarness((method) => (method === 'GET' ? [202, partialBody(3)] : [503, failedBody]));
  await h.drain();
  assert.equal(h.posts.length, 1);
  assert.deepEqual(h.errors(), ['생성 실패·자동 복구 안내']);
  assert.equal(h.consultations.at(-1), null);
  assert.equal(h.pending.at(-1), false);
});
test('연애 결과 화면은 이어 쓰기가 8번을 넘어도 서버가 진행하는 동안 계속 이어 받아 완료를 보여 준다', async () => {
  const h = resultEffectHarness((method, n) => (method === 'GET' ? [202, partialBody(1)]
    : n < 12 ? [202, partialBody(n + 1)] : [200, { ok: true, sessionId: 's1', status: 'completed', saved: true }]));
  await h.drain();
  assert.equal(h.posts.length, 12);
  assert.equal(h.consultations.at(-1).status, 'completed');
  assert.equal(h.pending.at(-1), false);
  assert.deepEqual(h.errors(), []);
});

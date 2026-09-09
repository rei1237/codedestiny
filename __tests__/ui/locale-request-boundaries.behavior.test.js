const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// 실제 renderer/hook 함수를 실행한다. 모든 I/O는 deferred fixture이며 외부 fallback은 없다.
function declaration(file, name) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.resolve(__dirname, '../..', file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(node) {
    if (!found && (ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) && node.name?.getText(source) === name) found = node;
    if (!found) ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(found, `${file}: ${name}`);
  return ts.isVariableDeclaration(found) ? `const ${found.getText(source)};` : found.getText(source).replace(/^export (default )?/, '');
}
function load(ctx, file, names) {
  const code = names.map(name => declaration(file, name)).join('\n');
  vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, ctx);
}
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

function fixture(extra = {}) {
  const target = new EventTarget();
  const timers = new Map();
  const effects = [];
  const changes = [];
  let timerId = 0;
  const ctx = vm.createContext({
    console, Promise, AbortController, Date, Error, exports: {}, locale: 'ko',
    useRef: value => ({ current: value }), useCallback: fn => fn,
    useEffect: fn => effects.push(fn),
    useState: initial => { let value = initial; return [value, next => { value = typeof next === 'function' ? next(value) : next; changes.push(value); }]; },
    toAiLocale: value => value,
    window: {
      addEventListener: target.addEventListener.bind(target), removeEventListener: target.removeEventListener.bind(target),
      setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id),
    },
    ...extra,
  });
  ctx.detectLocale = () => ctx.locale;
  load(ctx, 'app/hooks/useLocaleRequestScope.ts', ['useLocaleRequestScope']);
  return {
    ctx, changes, timers,
    mount: () => effects.splice(0).map(fn => fn()),
    change: locale => { ctx.locale = locale; target.dispatchEvent(new Event('languagechange')); target.dispatchEvent(new Event('cd:locale-ready')); },
    tick: async () => { const batch = [...timers.values()]; timers.clear(); batch.forEach(fn => fn()); await flush(); },
  };
}

test('scope ignores duplicate locale events, rejects ABA and unmounted replies for all 12 locales', () => {
  for (const locale of ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'vi', 'hi', 'es', 'fr', 'de', 'nl', 'ms']) {
    const f = fixture(); f.ctx.locale = locale;
    const capture = f.ctx.useLocaleRequestScope(() => {});
    const cleanups = f.mount(); const first = capture();
    f.change(locale); assert.equal(first.isCurrent(), true);
    f.change(locale === 'ko' ? 'en' : 'ko'); f.change(locale);
    assert.equal(first.isCurrent(), false);
    const next = capture(); assert.equal(next.isCurrent(), true);
    cleanups.forEach(fn => fn?.()); assert.equal(next.isCurrent(), false);
  }
});

const fusionFile = 'app/fusion-fortune/FusionFortuneClient.tsx';
function fusionFixture() {
  const applied = [], receipts = [], loading = [];
  const f = fixture({
    apiBase: '', copy: {}, initialStageStates: () => ({}),
    requestAbortRef: { current: null }, capAbortedRef: { current: false }, autoResumeRef: { current: false },
    lastEventAtRef: { current: 0 }, startedAtRef: { current: 0 }, paidRequestIdRef: { current: 'paid-1' },
    setResult: value => applied.push(value), setResultState: () => {},
    setLoading: value => loading.push(value), rememberPaidRequest: (...args) => receipts.push(args),
    setStageTwoFailed() {}, setStageStates() {}, setComposeProgress() {}, setOpenedConsultationId() {},
    setStatus() {}, setNotice() {}, setFailure() {}, setQualityNotice() {}, setReopeningId() {},
    readFusionPaidRequest: () => ({ requestId: 'paid-1' }), loadRecentList() {}, rememberConsultationUrl() {},
    applyOpenedConsultation: value => applied.push(value.result), parseJson: async response => response,
  });
  load(f.ctx, fusionFile, ['captureLocaleScope', 'recoverPaidResult', 'runGeneration']);
  f.mount();
  f.run = (...args) => vm.runInContext('runGeneration', f.ctx)(...args);
  return { ...f, applied, receipts, loading };
}
test('fusion drops late stage completion and preserves the paid request', async () => {
  const f = fusionFixture(), stage = deferred();
  let calls = 0;
  f.ctx.runStage = () => { calls++; return stage.promise; };
  const pending = f.run('paid-1', { birthDate: '2000-01-01' }, 1, '');
  f.change('en'); stage.resolve({ result: { text: 'old' }, status: 'partial' });
  assert.equal(await pending, false, 'discarded reading must not complete paid resume');
  assert.equal(calls, 1); assert.equal(f.applied.length, 0);
  assert.equal(f.receipts.some(([id]) => id === ''), false);
});
test('fusion drops recovery result after a locale switch and does not clear receipt', async () => {
  const f = fusionFixture(), recovery = deferred();
  f.ctx.runStage = async () => { throw new Error('stream disconnected'); };
  f.ctx.authFetch = () => recovery.promise;
  const pending = f.run('paid-1', {}, 1, ''); await flush();
  f.change('en'); recovery.resolve({ ok: true, consultation: { result: { text: 'old' }, status: 'completed' } }); await pending;
  assert.equal(f.applied.length, 0); assert.equal(f.receipts.some(([id]) => id === ''), false);
});
test('fusion old finally cannot unlock a newer generation', async () => {
  const f = fusionFixture(), old = deferred(), current = deferred();
  let calls = 0; f.ctx.runStage = () => (++calls === 1 ? old.promise : current.promise);
  const a = f.run('paid-1', {}, 2, ''); const b = f.run('paid-1', {}, 2, '');
  old.resolve({ result: { text: 'old' }, fusionStatus: {} }); await a;
  assert.equal(f.loading.at(-1), true); assert.equal(f.applied.length, 0);
  current.resolve({ result: { text: 'new' }, fusionStatus: {} }); await b;
  assert.equal(f.applied[0].text, 'new'); assert.equal(f.loading.at(-1), false);
});
test('fusion old recovery cannot overwrite a newer generation in the same locale', async () => {
  const f = fusionFixture(), recovery = deferred(), current = deferred();
  let calls = 0;
  f.ctx.runStage = () => ++calls === 1 ? Promise.reject(new Error('disconnected')) : current.promise;
  f.ctx.authFetch = () => recovery.promise;
  const old = f.run('paid-1', {}, 2, ''); await flush();
  const next = f.run('paid-1', {}, 2, '');
  recovery.resolve({ ok: true, consultation: { result: { text: 'old' }, status: 'completed' } }); await old;
  assert.equal(f.applied.length, 0); assert.equal(f.loading.at(-1), true);
  current.resolve({ result: { text: 'new' }, fusionStatus: {} }); await next;
  assert.equal(f.applied[0].text, 'new');
});
test('fusion suppresses late SSE progress and chat append', async () => {
  const f = fixture({ apiBase: '', copy: {}, AI_LOCALE_HEADER: 'x-code-destiny-locale', lastEventAtRef: { current: 0 } });
  const capture = f.ctx.useLocaleRequestScope(() => {}); f.mount(); const scope = capture();
  let onEvent, updates = 0;
  f.ctx.authFetch = async () => ({});
  f.ctx.consumeFusionStream = async (_response, _copy, callback) => { onEvent = callback; };
  f.ctx.setComposeProgress = () => { updates++; };
  f.ctx.setStageStates = () => { updates++; };
  load(f.ctx, fusionFile, ['runStage']);
  await vm.runInContext('runStage', f.ctx)(1, 'paid-1', {}, new AbortController(), 'session', scope);
  f.change('en'); onEvent('stage', { stage: 'compose', completedGroups: 1 });
  assert.equal(updates, 0);
});
test('fusion retains the first generation locale when resuming the same paid body', async () => {
  const f = fusionFixture(), first = deferred(), bodies = [];
  f.ctx.runStage = (_stage, _id, body) => { bodies.push(body); return bodies.length === 1 ? first.promise : Promise.resolve({ result: { text: 'same report' }, fusionStatus: {} }); };
  const pending = f.run('paid-1', { birthDate: '2000-01-01' }, 1, '');
  f.change('en'); first.resolve({ result: { text: 'partial' }, status: 'partial' }); await pending;
  const storedBody = f.receipts[0][1]; assert.equal(storedBody.locale, 'ko');
  await f.run('paid-1', storedBody, 2, '');
  assert.deepEqual(bodies.map(body => body.locale), ['ko', 'ko']);
  assert.equal(f.receipts[1][0], 'paid-1');
});
test('fusion stage transport uses the saved language when viewer language differs', async () => {
  let headers;
  const f = fixture({ apiBase: '', copy: {}, AI_LOCALE_HEADER: 'x-code-destiny-locale',
    authFetch: async (_path, init) => { headers = init.headers; return {}; }, consumeFusionStream: async () => ({}) });
  load(f.ctx, fusionFile, ['runStage']);
  await vm.runInContext('runStage', f.ctx)(2, 'paid-1', { locale: 'ko' }, new AbortController(), '', { locale: 'en', isCurrent: () => true });
  assert.equal(headers['x-code-destiny-locale'], 'ko'); assert.equal(headers['Idempotency-Key'], 'paid-1');
});

const astroFile = 'app/astrology-ai/AstrologyAiClient.tsx';
for (const when of ['sleep', 'fetch', 'body']) {
  test(`astrology stops stale polling during ${when}`, async () => {
    const f = fixture(), response = deferred(), body = deferred();
    const capture = f.ctx.useLocaleRequestScope(() => {}); f.mount(); const scope = capture();
    let calls = 0; f.ctx.authFetch = () => { calls++; return response.promise; };
    load(f.ctx, astroFile, ['sleep', 'RESULT_POLL_BACKOFF_MS', 'RESULT_POLL_MAX_ATTEMPTS', 'pollAstrologyResult']);
    const pending = vm.runInContext('pollAstrologyResult', f.ctx)('session', scope);
    if (when === 'sleep') f.change('en');
    await f.tick();
    if (when === 'fetch') f.change('en');
    response.resolve({ status: 200, ok: true, json: () => body.promise }); await flush();
    if (when === 'body') f.change('en');
    body.resolve({ sessionId: 'session', messages: [] });
    assert.equal(await pending, null); assert.equal(calls, when === 'sleep' ? 0 : 1);
  });
}
test('astrology does not retry or open an old generation after locale change', async () => {
  const first = deferred(); let requests = 0, opened = 0;
  const f = fixture({ setPhase() {}, releasePaidFeatureGate() {}, setProgressIndex() {}, scheduleReadingProgress() {},
    API_ENDPOINTS: { start: '/start' }, buildPayload: () => ({}),
    postJson: () => { requests++; return first.promise; }, openResultPage: () => { opened++; },
  });
  f.ctx.captureLocaleScope = f.ctx.useLocaleRequestScope(() => {}); f.mount();
  load(f.ctx, astroFile, ['startConsultation']);
  const pending = f.ctx.startConsultation('original-key', {});
  f.change('en'); first.reject(new Error('disconnected'));
  assert.equal(await pending, false, 'discarded reading must not complete paid resume');
  assert.equal(requests, 1); assert.equal(opened, 0);
});

const compassFile = 'app/destiny-compass/_hooks/useCompassReport.ts';
test('compass pins both waves and cache to original locale without updating switched UI', async () => {
  const a = deferred(), b = deferred(), requests = [], cache = new Map();
  const f = fixture({
    sessionStorage: { getItem: key => cache.get(key), setItem: (key, value) => cache.set(key, value) },
    AI_LOCALE_HEADER: 'x-code-destiny-locale',
    useCoinGate: () => ({ ensurePaidAccess: async () => ({ ok: true, transactionId: 'paid-1' }), isPaying: false }),
    useDestinyCompassCopy: () => ({}), makeGateRequestId: () => 'unchanged-key', collectDeepEvidence: () => ({}),
    fetch: (_path, init) => { requests.push(init); return requests.length === 1 ? a.promise : b.promise; },
  });
  load(f.ctx, compassFile, ['FEATURE_KEY', 'COIN_PRICE', 'AMOUNT_KRW', 'WAVE_A_TIMEOUT_MS', 'WAVE_B_TIMEOUT_MS', 'INITIAL',
    'sessionKeyFor', 'readCache', 'writeCache', 'postJson', 'mergeSections', 'useCompassReport']);
  const field = { seed: 1, sources: [], directions: [], primary: {}, strongArea: {}, blockedArea: {} };
  const hook = f.ctx.useCompassReport({ emotion: 'calm' }, field, 'question'); f.mount();
  const pending = hook.unlock(); await flush();
  f.change('en'); const count = f.changes.length;
  a.resolve({ status: 200, json: async () => ({ ok: true, reportId: 'report', sections: [{ key: 'a', body: '한국어 A' }], continuation: { token: 'token' } }) });
  await flush();
  assert.equal(requests.length, 2);
  b.resolve({ status: 200, json: async () => ({ sections: [{ key: 'b', body: '한국어 B' }] }) }); await pending;
  assert.equal(f.changes.length, count);
  assert.deepEqual(requests.map(request => request.headers['x-code-destiny-locale']), ['ko', 'ko']);
  assert.equal(JSON.parse(requests[1].body).idempotencyKey, 'unchanged-key');
  assert.equal([...cache.keys()].every(key => key.endsWith(':ko')), true);
  const stored = JSON.parse([...cache.values()][0]); assert.equal(stored.sections.b.body, '한국어 B');
});
test('compass legacy cache is preserved as historical content without guessing its locale', () => {
  const cache = new Map([['key', JSON.stringify({ sections: { a: { body: '한국어' } } })]]);
  const f = fixture({ sessionStorage: { getItem: key => cache.get(key) } });
  load(f.ctx, compassFile, ['readCache']);
  assert.equal(f.ctx.readCache('key:en'), null);
  assert.equal(f.ctx.readCache('key:ko'), null);
  assert.equal(f.ctx.readCache('key:en', true).sections.a.body, '한국어'); assert.equal(cache.size, 1);
});

function sajuFixture() {
  const events = [], timers = new Map(); let id = 0;
  const ctx = vm.createContext({
    locale: 'ko', localeEpoch: 0, pollingEpoch: 0, rootEl: { isConnected: true },
    pollTimer: null, pollAttempts: 0, pollErrorStreak: 0, pollNotFoundStreak: 0, POLL_MAX_ATTEMPTS: 120,
    activePendingJob: null, requestLocale: 'ko', requestInFlight: false, resumeBtn: null,
    setTimeout: fn => { timers.set(++id, fn); return id; }, clearTimeout: key => timers.delete(key),
    stopProgress() {}, setLoading() {}, setProgress() {},
    rememberPendingJob: job => { ctx.activePendingJob = job; },
    handleCompletedPayload: payload => { events.push(payload); return true; },
    markFailedForRetry: () => events.push('failed'),
  });
  ctx._sajuEngineCurrentLang = () => ctx.locale;
  load(ctx, 'js/saju-engine.js', ['captureLocaleScope', 'discardForLocaleChange', 'stopPolling', 'pollPendingJob']);
  return { ctx, events, tick: async () => { const batch = [...timers.values()]; timers.clear(); batch.forEach(fn => fn()); await flush(); } };
}
for (const boundary of ['status', 'result', 'old-cycle']) {
  test(`saju drops stale ${boundary} response without clearing paid job`, async () => {
    const f = sajuFixture(), status = deferred(), result = deferred();
    f.ctx._sajuPromptFetchStatus = () => status.promise;
    f.ctx._sajuPromptFetchResult = () => result.promise;
    f.ctx.pollPendingJob({ requestId: 'paid-1', paidEvidence: { id: 'receipt' } }, true); await f.tick();
    if (boundary === 'status') { f.ctx.locale = 'en'; f.ctx.discardForLocaleChange(); }
    status.resolve({ payload: { status: 'completed' } }); await flush();
    if (boundary === 'result') { f.ctx.locale = 'en'; f.ctx.discardForLocaleChange(); }
    if (boundary === 'old-cycle') f.ctx.pollPendingJob({ requestId: 'paid-2' }, true);
    result.resolve({ payload: { resultText: 'old' } }); await flush();
    assert.equal(f.events.length, 0);
    assert.equal(f.ctx.activePendingJob.requestId, boundary === 'old-cycle' ? 'paid-2' : 'paid-1');
  });
}
test('saju still delivers the current paid result without a locale change', async () => {
  const f = sajuFixture();
  f.ctx._sajuPromptFetchStatus = async () => ({ payload: { status: 'completed' } });
  f.ctx._sajuPromptFetchResult = async () => ({ payload: { resultText: 'current' } });
  f.ctx.pollPendingJob({ requestId: 'paid-1' }, true); await f.tick();
  assert.equal(f.events[0].resultText, 'current');
});
for (const file of [fusionFile, astroFile]) {
  test(`${file}: paid resume completes only after actual delivery`, async () => {
    for (const delivered of [false, true]) {
      const f = fixture({
        PAID_FEATURE_KEY: 'feature', FEATURE_KEY: 'feature',
        usePaidResume: (_feature, callback) => callback,
        unpackPaidResumeArg: value => value,
        runGenerationRef: { current: async () => delivered }, autoResumeRef: { current: false },
        rememberPaidRequest() {}, restoreFormFromBody() {},
        lockRef: { current: false }, idempotencyKeyRef: { current: '' },
        setError() {}, setNotice() {}, startConsultation: async () => delivered,
        extractPaymentContext: value => value,
      });
      load(f.ctx, file, ['buildResume']);
      const callback = vm.runInContext('buildResume', f.ctx);
      assert.equal(await callback({ requestId: 'paid-1', body: { birthDate: '2000-01-01' }, idempotencyKey: 'paid-1', payload: {} }, {}), delivered);
    }
  });
}

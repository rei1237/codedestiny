const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const get = (value, key) => key.split('.').reduce((at, part) => at?.[part], value);
function set(value, key, data) {
  const parts = key.split('.'); const last = parts.pop();
  for (const part of parts) value = value[part] ||= {};
  value[last] = clone(data);
}
function matches(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some(row => matches(doc, row));
    if (key === '$and') return value.every(row => matches(doc, row));
    const actual = get(doc, key);
    if (value && typeof value === 'object' && '$in' in value) return value.$in.includes(actual);
    if (value && typeof value === 'object' && '$lt' in value) return actual < value.$lt;
    if (value && typeof value === 'object' && '$exists' in value) return (actual !== undefined) === value.$exists;
    if (value === null) return actual == null;
    return String(actual) === String(value);
  });
}
function load(ctx, file, names) {
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  for (const name of names) {
    const fn = ast.statements.find(row => ts.isFunctionDeclaration(row) && row.name?.text === name);
    assert.ok(fn, name); vm.runInContext(fn.getText(ast).replace(/^export /, ''), ctx);
  }
}


function fixture(accessType = 'pass') {
  let doc = null, calls = 0, charges = 0, refunds = 0, fault = null, lostApply = false, owner = 'owner', permitted = true, tick = 0;
  const chain = value => ({ lean: async () => clone(value), sort: () => chain(value), select: () => chain(value) });
  const model = {
    findOne: filter => chain(doc && matches(doc, filter) ? doc : null),
    create: async seed => { if (doc) throw Object.assign(new Error('duplicate'), { code: 11000 }); doc = clone(seed); },
    findOneAndUpdate: (filter, update) => ({ lean: async () => {
      const tag = update.$set?.status || (update.$set?.['llmMeta.savedSections'] ? 'checkpoint' : 'attempt');
      if (fault === tag) { fault = null; return null; }
      if (!doc || !matches(doc, filter)) return null;
      for (const [key, value] of Object.entries(update.$set || {})) set(doc, key, value);
      return clone(doc);
    } }),
    updateOne: async (filter, update) => { if (doc && matches(doc, filter)) for (const [key, value] of Object.entries(update.$set || {})) set(doc, key, value); },
  };
  const plan = ['overview', 'wealth', 'romance', 'monthly', 'health'].map(key => ({ key, label: key, minChars: 4000, maxChars: 5000 }));
  const ctx = vm.createContext({ Request, Response, Headers, Date, JSON, Map, crypto: webcrypto, console: { error() {} },
    fetch: async () => { throw new Error('EXTERNAL_FETCH_BLOCKED'); },
    clean: (v, max = 100000) => String(v || '').trim().slice(0, max), cleanForbiddenResult: v => v,
    randomToken: () => String(++tick), readJson: request => request.json(), json: (body, init) => new Response(JSON.stringify(body), init),
    getRoutePath: request => new URL(request.url).pathname.replace('/api/new-year-ai', ''),
    logNewYearAi() {}, safeLogPayload: () => ({}), getPricing: () => ({}),
    getOptionalUserFromRequest: async () => ({ userId: owner }), connectDb: async () => {}, BILLING_SNAPSHOT_USER_PROJECTION: {},
    readIdempotencyKey: (request, body) => body.idempotencyKey || request.headers.get('idempotency-key'),
    normalizeConsultationInput: body => ({ ok: true, inputHash: body.inputHash || 'same-input', input: { birthInfo: {}, year: 2026, topic: '신년' } }),
    resolveStartAccess: async () => ({ ok: permitted, accessType, deferredUsage: true, paymentId: 'original-receipt' }),
    calculateNewYearFortuneData: () => ({ year: 2026 }),
    loginRequired: () => new Response('', { status: 401 }), notFound: () => new Response('', { status: 404 }), invalidInput: (_message, status = 422) => new Response('', { status }),
    paymentVerifyFailed: () => new Response('', { status: 402 }), serverError: () => new Response('server', { status: 500 }),
    NEW_YEAR_AI_GENERATING_FRESH_MS: 120000, NEW_YEAR_AI_LLM_BUDGET_MS: 82000, NEW_YEAR_AI_SECTION_TIMEOUT_MS: 52000,
    NEW_YEAR_AI_REPAIR_MIN_REMAINING_MS: 18000, NEW_YEAR_AI_MIN_TOTAL_CHARS: 20000, NEW_YEAR_AI_MAX_TOTAL_CHARS: 26000,
    NEW_YEAR_AI_SECTIONS: plan, LLM_ERROR_MESSAGE: 'generation failed', SERVER_ERROR_MESSAGE: 'server error',
    publicSession: row => ({ ok: true, sessionId: row.id, status: row.status, saved: row.status === 'completed', messages: row.messages }),
    callDeferredUsageRoute: async ({ path, idempotencyKey }) => {
      assert.equal(idempotencyKey, 'original-paid-request');
      if (path === 'cancel') { refunds++; return; }
      assert.equal(doc.status, 'delivery_pending');
      if (!doc.usageAppliedAt) { charges++; doc.usageAppliedAt = 'applied'; }
      if (lostApply) { lostApply = false; throw new Error('apply reply lost'); }
    },
    NewYearAiConsultation: model,
    validateConsultationQuality: text => ({ ok: true, text, issues: [], totalChars: text.length }),
    mapIssuesToSections: () => new Map(), buildSectionRepairLines: () => [],
    generateConsultationSection: async (_env, { section }) => {
      calls++;
      const text = Array.from({ length: 80 }, (_, i) => `${section.key}${i}번째 상황에서는 계산된 근거를 따라 선택의 속도를 점검하고 삶에서 실천할 수 있는 방향을 구체적으로 정리합니다.`).join('\n');
      return { key: section.key, section, text, ok: true, truncated: false, provider: 'mock', model: 'mock' };
    },
  });
  load(ctx, 'worker/lib/result-storage.js', ['resultStorageUnavailable', 'resultStorageFailurePayload']);
  load(ctx, 'worker/lib/paid-report-quality.js', ['paidReportBody', 'countPaidReportBodyChars', 'reportSentenceKey', 'hasRepeatedReportPassage']);
  load(ctx, 'worker/routes/new-year-ai.js', ['handleNewYearAiRoutes', 'handleStart', 'generateNewYearWave', 'assembleConsultationSections', 'saveNewYearState', 'finishNewYearDelivery']);
  ctx.generateConsultationText = ctx.generateNewYearWave;
  const post = (body = {}) => ctx.handleNewYearAiRoutes(new Request('https://mock.test/api/new-year-ai/start', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'idempotency-key': 'original-paid-request' }, body: JSON.stringify(body),
  }), {});
  return { ctx, post, get doc() { return doc; }, get calls() { return calls; }, get charges() { return charges; }, get refunds() { return refunds; },
    fault: value => { fault = value; }, permitted: value => { permitted = value; }, owner: value => { owner = value; }, loseApply: () => { lostApply = true; } };
}
for (const accessType of ['pass', 'subscription', 'paid']) {
  test(`${accessType}: 다섯 요청이 한 분야씩 보존하며 완료 저장 후 전달한다`, async () => {
    const f = fixture(accessType);
    for (let i = 0; i < 5; i++) {
      const response = await f.post(i ? { resumeSessionId: f.doc.id } : {});
      assert.equal(response.status, i === 4 ? 200 : 202, await response.text());
      assert.equal(f.calls, i + 1); assert.equal(f.charges, i === 4 ? 1 : 0);
    }
    assert.equal(f.refunds, 0); assert.equal((await f.post()).status, 200); assert.equal(f.calls, 5);
  });
  test(`${accessType}: 완료 저장 null은 503으로 보존되고 재시도에 추가 차감하지 않는다`, async () => {
    const f = fixture(accessType); for (let i = 0; i < 4; i++) await f.post(); f.fault('completed');
    const failed = await f.post(); assert.equal(failed.status, 503); assert.equal((await failed.json()).reason, 'RESULT_STORAGE_UNAVAILABLE');
    assert.equal(f.doc.status, 'delivery_pending'); assert.equal(f.refunds, 0);
    assert.equal((await f.post()).status, 200); assert.equal(f.charges, 1); assert.equal(f.calls, 5);
  });
}
test('apply 응답 유실 후 원래 요청과 보존된 본문으로 완료한다', async () => {
  const f = fixture(); for (let i = 0; i < 4; i++) await f.post(); f.loseApply();
  const response = await f.post(); assert.equal(response.status, 503); assert.equal((await response.json()).reason, 'RESULT_DELIVERY_PENDING');
  assert.equal((await f.post()).status, 200); assert.equal(f.charges, 1); assert.equal(f.calls, 5); assert.equal(f.refunds, 0);
});
test('분야 저장이 실패해도 이전 분야를 지우거나 환불하지 않는다', async () => {
  const f = fixture(); await f.post(); f.fault('checkpoint'); assert.equal((await f.post()).status, 503);
  assert.equal(f.doc.llmMeta.savedSections.filter(row => row.ok).length, 1); assert.equal(f.refunds, 0);
  await f.post(); assert.equal(f.doc.llmMeta.savedSections.filter(row => row.ok).length, 2);
});
test('원래 입력·소유권·취소 증빙을 확인하고 동시 요청은 한 분야만 생성한다', async () => {
  const f = fixture(); await f.post();
  assert.equal((await f.post({ inputHash: 'changed' })).status, 409);
  f.owner('other'); assert.equal((await f.post({ resumeSessionId: f.doc.id })).status, 404);
  f.owner('owner'); f.permitted(false); assert.equal((await f.post()).status, 402); f.permitted(true);
  const responses = await Promise.all([f.post(), f.post()]); assert.ok(responses.every(row => row.status === 202)); assert.equal(f.calls, 2);
});
test('400자·누락 분야는 완료나 차감으로 넘어가지 않는다', async () => {
  const f = fixture(); f.ctx.generateConsultationSection = async (_env, { section }) => ({ key: section.key, section, text: '짧은해설'.repeat(80), ok: true });
  for (let i = 0; i < 5; i++) assert.equal((await f.post()).status, 202);
  assert.equal(f.doc.status, 'partial'); assert.equal(f.charges, 0);
});

test('새 상세 본문의 19,999자/20,000자 완료 경계를 지킨다', async () => {
  const f = fixture();
  const sections = f.ctx.NEW_YEAR_AI_SECTIONS.map((section, i) => ({ key: section.key, section, ok: true, text: String.fromCharCode(44032 + i).repeat(i === 4 ? 3999 : 4000) }));
  const options = { savedSections: sections, attempts: {}, deadlineAt: Date.now(), onReserve: async () => { throw new Error('NO_PROVIDER_CALL'); }, onCheckpoint: async () => {} };
  const low = await f.ctx.generateNewYearWave({}, {}, {}, options); assert.equal(low.complete, false); assert.equal(low.quality.totalChars, 19999);
  sections[4].text += String.fromCharCode(44036);
  const enough = await f.ctx.generateNewYearWave({}, {}, {}, options); assert.equal(enough.complete, true); assert.equal(enough.quality.totalChars, 20000);
});
for (const revokedIndex of [0, 1, 2]) test(`신년 실제 증빙 판정: 취소·환불 저장소 ${revokedIndex + 1}은 유효 토큰으로 우회하지 못한다`, async () => {
  const f = fixture(), ctx = f.ctx;
  Object.assign(ctx, {
    FEATURE_KEY: 'new-year-ai-consultation',
    verifyAccessToken: async () => ({ userId: 'owner', idempotencyKey: 'original-paid-request', inputHash: 'same-input', paymentId: 'receipt' }),
    collectBillingTokens: () => ['original-paid-request'],
    deferredTokenClauses: ids => ids.map(id => ({ requestId: id })), paymentTokenClauses: ids => ids.map(id => ({ requestId: id })), pointHistoryTokenClauses: ids => ids.map(id => ({ 'metadata.requestId': id })),
    loadBillingUser: async () => { throw new Error('REVOKED_EVIDENCE_MUST_STOP'); },
  });
  ['PaidExecutionRecord', 'Payment', 'PointHistory'].forEach((name, i) => { ctx[name] = { findOne: () => ({ lean: async () => i === revokedIndex ? { id: 'revoked' } : null }) }; });
  load(ctx, 'worker/routes/new-year-ai.js', ['resolveStartAccess']);
  const outcome = await ctx.resolveStartAccess({ request: new Request('https://mock.test'), env: {}, auth: { userId: 'owner' }, body: { accessToken: 'old-token' },
    normalized: { inputHash: 'same-input', input: {} }, idempotencyKey: 'original-paid-request' });
  assert.equal(outcome.ok, false);
});
test('실제 신년 화면은 부분 결과를 완료로 오인하지 않고 결제창 없이 같은 상담을 이어간다', async () => {
  const file = 'app/new-year-ai-consultation/NewYearAiClient.tsx';
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'startConsultation') callback = node.initializer.arguments[0]; ts.forEachChild(node, visit); }
  visit(ast); assert.ok(callback);
  const requests = [], states = [], pendingGenerationRef = { current: null };
  const ctx = vm.createContext({ document: { hidden: false }, captureDeliveryScope: () => () => true,
    setStatus() {}, setNotice() {}, pendingGenerationRef, applyResult: result => states.push(result.status),
    postJson: async (_path, payload, key) => {
      requests.push({ payload, key });
      return { response: { status: requests.length === 5 ? 200 : 202, ok: true }, payload: {
        ok: true, status: requests.length === 5 ? 'completed' : 'partial', saved: requests.length === 5, sessionId: 'server-session', messages: [{ role: 'assistant', content: '부분 본문' }],
      } };
    },
  });
  vm.runInContext(ts.transpileModule(`globalThis.run = ${callback.getText(ast)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
  assert.equal(await ctx.run({ birth: 'original' }, 'original-paid-request', { receipt: 'paid' }), true);
  assert.deepEqual(states, ['partial', 'partial', 'partial', 'partial', 'completed']);
  for (const row of requests.slice(1)) { assert.equal(row.payload.resumeSessionId, 'server-session'); assert.equal(row.key, 'original-paid-request'); assert.equal(row.payload.receipt, undefined); }
  assert.equal(pendingGenerationRef.current, null);
});

test('긴 신년 결과는 애니메이션·화면 진입 조건 없이 처음부터 노출된다', () => {
  const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
  const file = 'app/new-year-ai-consultation/NewYearAiClient.tsx';
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'RevealBlock');
  assert.ok(fn); const ctx = vm.createContext({ React });
  vm.runInContext(ts.transpileModule(fn.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, ctx);
  const content = '긴유료상담본문'.repeat(3000);
  const html = renderToStaticMarkup(ctx.RevealBlock({ children: content }));
  assert.ok(html.includes(content)); assert.doesNotMatch(html, /opacity|visibility|display:none|transform/);
});

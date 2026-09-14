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
  let doc = null, calls = 0, starts = 0, refunds = 0, fault = '', permitted = true, owner = 'owner', tick = 0;
  const chain = value => ({ lean: async () => clone(value) });
  const model = {
    findOne: filter => chain(doc && matches(doc, filter) ? doc : null),
    create: async value => { if (doc) throw Object.assign(new Error('duplicate'), { code: 11000 }); doc = clone(value); },
    findOneAndUpdate: (filter, update) => ({ lean: async () => {
      const tag = update.$set.status || (Object.keys(update.$set).some(k => k.startsWith('llmMeta.checkpoints.')) ? 'checkpoint' : 'attempt');
      if (fault === tag) { fault = ''; return null; }
      if (!doc || !matches(doc, filter)) return null;
      for (const [key, value] of Object.entries(update.$set)) set(doc, key, value);
      return clone(doc);
    } }),
    updateOne: async (filter, update) => { if (doc && matches(doc, filter)) for (const [key, value] of Object.entries(update.$set)) set(doc, key, value); },
  };
  const definitions = Array.from({ length: 15 }, (_, i) => ({ id: `chapter${i}`, title: `${i + 1}장`, minChars: 2200 }));
  const ctx = vm.createContext({ Request, Response, Headers, Date, JSON, Map, Math, crypto: webcrypto, console,
    fetch: async () => { throw new Error('EXTERNAL_FETCH_BLOCKED'); },
    clean: (v, max = 100000) => String(v || '').trim().slice(0, max),
    readJson: request => request.json(), json: (body, init) => new Response(JSON.stringify(body), init),
    getRoutePath: request => new URL(request.url).pathname.replace('/api/ziwei-deep-report', ''),
    getOptionalUserFromRequest: async () => ({ userId: owner }), connectDb: async () => {}, PAID_FEATURE_ACCESS_USER_PROJECTION: {},
    resolveAiLocaleFromRequest: () => 'ko', sha256: () => `hash${++tick}`, getPricing: () => ({}),
    normalizeInput: body => ({ ok: true, inputHash: body.inputHash || 'original', birthInfo: {}, consultation: {}, input: {} }),
    resolveGenerateAccess: async () => ({ ok: permitted, accessType }), calculateZiweiAiChart: () => ({ lifePalace: 'fixed' }),
    loginRequired: () => new Response('', { status: 401 }), notFound: () => new Response('', { status: 404 }),
    invalidInput: (_message, status = 422) => new Response('', { status }), paymentVerifyFailed: () => new Response('', { status: 402 }), serverError: () => new Response('', { status: 500 }),
    GENERATING_FRESHNESS_MS: 150000, CHAPTER_BATCH_SIZE: 4, CHAPTER_CONCURRENCY: 4, MIN_DELIVERABLE_CHARS: 20000, MIN_DELIVERABLE_CHAPTERS: 15,
    ZIWEI_DEEP_CHAPTERS: definitions, ZIWEI_DEEP_PDF_META: { minTotalChars: 34000 }, FEATURE_KEY: 'ziwei-deep-pdf', TITLE: '심화', MESSAGES: {},
    ZiweiDeepReport: model, resolveSourceTransactionId: () => 'original-receipt',
    startRefundableExecution: async (_env, _owner, receipt, key) => { assert.equal(receipt, 'original-receipt'); assert.equal(key, 'original-paid-key'); starts++; },
    completeRefundableExecution: async () => { assert.equal(doc.status, 'completed'); }, refundExecution: async () => { refunds++; return true; },
    generateChapter: async (_env, chart, _birth, definition) => {
      calls++; assert.equal(chart.lifePalace, 'fixed');
      const body = Array.from({ length: 70 }, (_, i) => `${definition.id}의 ${i}번째 흐름은 계산한 명반의 조건을 바탕으로 현실에서 선택할 수 있는 행동을 구체적으로 설명합니다.`).join('\n');
      return { id: definition.id, title: definition.title, body, chars: body.length, provider: 'fixture', ok: true };
    },
  });
  load(ctx, 'worker/lib/result-storage.js', ['resultStorageUnavailable', 'resultStorageFailurePayload']);
  load(ctx, 'worker/lib/paid-report-quality.js', ['paidReportBody', 'countPaidReportBodyChars', 'hasRepeatedReportPassage']);
  load(ctx, 'worker/routes/ziwei-deep-report.js', ['handleZiweiDeepReportRoutes', 'handleGenerate', 'handleResult', 'loadStoredReport', 'buildReportId', 'chaptersForDb', 'mergeChapters', 'publicStoredReport', 'accumulatedFromStored', 'reusableDeepChapters', 'isDeepChapterComplete', 'saveDeepCheckpoint', 'finishDeepDelivery', 'runWithConcurrency', 'judgeDeliverable']);
  const post = body => ctx.handleZiweiDeepReportRoutes(new Request('https://mock.test/api/ziwei-deep-report/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idempotencyKey: 'original-paid-key', ...body }) }), {});
  return { ctx, post, get doc() { return doc; }, get calls() { return calls; }, get starts() { return starts; }, get refunds() { return refunds; }, fault: value => { fault = value; }, owner: value => { owner = value; }, permitted: value => { permitted = value; } };
}
for (const access of ['pass', 'subscription', 'paid']) {
  test(`${access}: 서버 체크포인트로 15장을 완성하고 원래 결제를 한 번만 사용한다`, async () => {
    const f = fixture(access);
    for (let i = 0; i < 4; i++) {
      const response = await f.post(i ? { resumeReportId: f.doc.id, startIndex: 999 } : { startIndex: 999 });
      assert.equal(response.status, i === 3 ? 200 : 202, await response.text());
      assert.equal(f.calls, Math.min(15, (i + 1) * 4));
    }
    assert.equal(f.starts, 1); assert.equal(f.refunds, 0);
    assert.equal((await f.post()).status, 200); assert.equal(f.calls, 15);
  });
  test(`${access}: 완료 저장 null은 환불 없이 보존하고 재생성 없이 전달한다`, async () => {
    const f = fixture(access); for (let i = 0; i < 3; i++) await f.post();
    f.fault('completed'); const response = await f.post();
    assert.equal(response.status, 503); assert.equal((await response.json()).reason, 'RESULT_STORAGE_UNAVAILABLE');
    assert.equal(f.doc.status, 'delivery_pending'); assert.equal(f.refunds, 0);
    assert.equal((await f.post({ resumeReportId: f.doc.id })).status, 200); assert.equal(f.calls, 15); assert.equal(f.starts, 1);
  });
}
test('한 챕터 저장 실패에도 같은 병렬 묶음의 정상 챕터를 보존한다', async () => {
  const f = fixture(); f.fault('checkpoint'); assert.equal((await f.post()).status, 503);
  assert.equal(Object.keys(f.doc.llmMeta.checkpoints).length, 3); assert.equal(f.refunds, 0);
  assert.equal((await f.post()).status, 202); assert.equal(Object.keys(f.doc.llmMeta.checkpoints).length, 7);
});
test('동시 요청, 소유권 변경, 입력 변경, 취소 증빙을 차단한다', async () => {
  const f = fixture(); await f.post();
  const responses = await Promise.all([f.post(), f.post()]); assert.ok(responses.every(r => r.status === 202)); assert.equal(f.calls, 8);
  assert.equal((await f.post({ inputHash: 'other' })).status, 409);
  f.owner('other'); assert.equal((await f.post({ resumeReportId: f.doc.id })).status, 404);
  f.owner('owner'); f.permitted(false); assert.equal((await f.post()).status, 402); assert.equal(f.calls, 8);
});
test('짧은 챕터는 완료하지 않고 저장된 호출 한도로 멈춘다', async () => {
  const f = fixture(); f.ctx.generateChapter = async (_e, _c, _b, definition) => ({ ...definition, body: '짧은 본문', ok: true });
  for (let i = 0; i < 3; i++) assert.equal((await f.post()).status, 202);
  assert.equal((await f.post()).status, 503); assert.equal(f.doc.status, 'generation_failed'); assert.equal(f.refunds, 1);
});
test('기존 완료 구매본은 새 분량 기준으로 차단하지 않는다', async () => {
  const f = fixture(); await f.post(); f.doc.status = 'completed'; f.doc.chapters = [{ id: 'old', body: '과거 본문' }]; f.doc.llmMeta.checkpoints = {};
  f.permitted(false); const response = await f.post(); assert.equal(response.status, 200); assert.equal((await response.json()).done, true);
});
for (const blockedAt of [0, 1, 2, 3]) test(`실제 접근 판정은 취소·환불 저장소 ${blockedAt + 1}을 재확인한다`, async () => {
  const f = fixture(); const ctx = f.ctx;
  Object.assign(ctx, { asObject: v => v || {}, verifyAccessToken: async () => ({ userId: 'owner', idempotencyKey: 'original-paid-key', inputHash: 'original' }), isAdmin: () => false,
    findMoonstoneSpendEvidence: async () => { throw new Error('revoked must stop'); }, canAccessPaidFeature: async () => { throw new Error('revoked must stop'); } });
  ['PaidExecutionRecord', 'Payment', 'PointHistory', 'MonthlyCreditLedger'].forEach((name, i) => { ctx[name] = { findOne: () => ({ lean: async () => i === blockedAt ? { id: 'revoked' } : null }) }; });
  load(ctx, 'worker/routes/ziwei-deep-report.js', ['resolveGenerateAccess']);
  assert.equal((await ctx.resolveGenerateAccess(new Request('https://mock.test'), {}, { userId: 'owner' }, { accessToken: 'token' }, { inputHash: 'original' }, 'original-paid-key')).ok, false);
});
test('월정석은 차감된 원래 원장으로 확인하며 잔액을 다시 요구하지 않는다', async () => {
  const ctx = fixture().ctx;
  Object.assign(ctx, { asObject: v => v || {}, isAdmin: () => false, findMoonstoneSpendEvidence: async (_env, options) => { assert.ok(options.tokens.includes('original-paid-key')); return { ledgerId: 'receipt' }; }, canAccessPaidFeature: async () => { throw new Error('must use spent evidence'); } });
  ['PaidExecutionRecord', 'Payment', 'PointHistory', 'MonthlyCreditLedger'].forEach(name => { ctx[name] = { findOne: () => ({ lean: async () => null }) }; });
  load(ctx, 'worker/routes/ziwei-deep-report.js', ['resolveGenerateAccess']);
  assert.equal((await ctx.resolveGenerateAccess(new Request('https://mock.test'), {}, { userId: 'owner' }, {}, { inputHash: 'original' }, 'original-paid-key')).accessType, 'subscription');
});
test('실제 챕터 생성은 짧거나 잘린 본문을 완료하지 않고 보완 요청은 캐시를 재사용하지 않는다', async () => {
  const ctx = fixture().ctx; const observed = [];
  Object.assign(ctx, { buildZiweiDeepChapterPrompt: () => 'fixed facts', createLlmCacheStore: () => ({}), callGeminiText: async (_env, _prompt, options) => { observed.push(options); return { ok: true, text: '가'.repeat(2400), truncated: true }; } });
  load(ctx, 'worker/routes/ziwei-deep-report.js', ['generateChapter']);
  const definition = ctx.ZIWEI_DEEP_CHAPTERS[0];
  assert.equal((await ctx.generateChapter({}, {}, {}, definition, {}, 'ko', 1)).ok, false);
  ctx.callGeminiText = async (_e, _p, options) => { observed.push(options); return { ok: true, text: '가'.repeat(2400) }; };
  assert.equal((await ctx.generateChapter({}, {}, {}, definition, {}, 'ko', 2)).ok, true);
  assert.ok(observed[0].cache); assert.equal(observed[1].cache, undefined); assert.equal(observed[1].maxOutputTokens, 9000);
});
test('실제 심화 화면은 저장된 챕터를 보여주고 같은 결과 ID로 이어간다', async () => {
  const file = 'app/components/ziwei/ZiweiDeepPdfPanel.tsx';
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let fn; function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'generate') fn = node; ts.forEachChild(node, visit); } visit(ast); assert.ok(fn);
  const requests = [], states = [], pendingGenerationRef = { current: null };
  const ctx = vm.createContext({ document: { hidden: false }, captureDeliveryScope: () => () => true, payload: {}, pendingGenerationRef,
    setPhase() {}, setGenProgress() {}, cycleSteps: () => () => {}, TOTAL_CHAPTERS: 15, MAX_BATCHES: 20,
    applyReport: (_chapters, _meta, _restored, complete) => states.push(complete), mapError: () => 'error',
    postJson: async (_path, body, key) => { requests.push({ body, key }); const done = requests.length === 4; return { status: done ? 200 : 202, data: { ok: true, status: done ? 'completed' : 'partial', done, saved: done, reportId: 'original-result', chapters: [{ id: 'saved', body: '저장 본문', ok: true }] } }; },
  });
  vm.runInContext(ts.transpileModule(fn.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
  assert.equal(await ctx.generate('original-paid-key', { receipt: 'original-proof' }), true);
  assert.deepEqual(states, [false, false, false, true]); assert.equal(pendingGenerationRef.current, null);
  assert.equal(requests[0].body.receipt, 'original-proof');
  requests.slice(1).forEach(row => { assert.equal(row.body.resumeReportId, 'original-result'); assert.equal(row.key, 'original-paid-key'); });
});
test('숙요의 긴 결과 카드도 화면 진입 비율 없이 본문을 표시한다', () => {
  const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
  const file = 'app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx';
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'SukuyoReveal'); assert.ok(fn);
  const ctx = vm.createContext({ React });
  vm.runInContext(ts.transpileModule(fn.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, ctx);
  const content = '긴숙요결과본문'.repeat(3000); const html = renderToStaticMarkup(ctx.SukuyoReveal({ children: content }));
  assert.ok(html.includes(content)); assert.doesNotMatch(html, /opacity|visibility|display:none|transform/);
});

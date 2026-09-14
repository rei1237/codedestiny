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
  let doc = null, calls = [], fault = null, owner = 'owner', permitted = true, applyLost = false, charges = 0, refunds = 0;
  let tick = 0;
  const chain = value => ({ lean: async () => clone(value), select: () => chain(value), sort: () => chain(value) });
  const model = {
    findOne: filter => chain(doc && matches(doc, filter) ? doc : null),
    create: async seed => { if (doc) throw Object.assign(new Error('duplicate'), { code: 11000 }); doc = clone(seed); return clone(doc); },
    findOneAndUpdate: (filter, update) => ({ lean: async () => {
      const tag = update.$set?.status || (Object.keys(update.$set || {}).some(key => key.startsWith('llmMeta.sections.')) ? 'checkpoint' : 'lease');
      if (fault === tag) { fault = null; return null; }
      if (!doc || !matches(doc, filter)) return null;
      for (const [key, value] of Object.entries(update.$inc || {})) set(doc, key, (get(doc, key) || 0) + value);
      for (const [key, value] of Object.entries(update.$set || {})) set(doc, key, value);
      return clone(doc);
    } }),
    updateOne: async (filter, update) => { if (!doc || !matches(doc, filter)) return; for (const [key, value] of Object.entries(update.$set || {})) set(doc, key, value); },
  };
  const plan = Array.from({ length: 15 }, (_, i) => ({ id: `section${i}`, kind: 'chapter', evidenceRefs: [], targetChars: 2600 }));
  const ctx = vm.createContext({ Request, Response, Headers, Date, JSON, Map, crypto: webcrypto,
    fetch: async () => { throw new Error('EXTERNAL_FETCH_BLOCKED'); },
    clean: (v, max = 100000) => String(v || '').trim().slice(0, max), randomToken: () => String(++tick),
    readJson: request => request.json(), json: (body, init) => new Response(JSON.stringify(body), init),
    logLifeBookAi() {}, logLifeBookAction() {}, safeLogPayload: () => ({}), buildProviderLogContext: () => ({}),
    getPricing: () => ({}), getConsultationOrderName: () => '인생의 책', getConsultationFeatureKey: () => 'life-book-ai',
    getOptionalUserFromRequest: async () => ({ userId: owner }), connectDb: async () => {},
    PAID_FEATURE_ACCESS_USER_PROJECTION: {}, BILLING_SNAPSHOT_USER_PROJECTION: {},
    readIdempotencyKey: (request, body) => body.idempotencyKey || request.headers.get('idempotency-key'),
    normalizeConsultationInput: body => ({ ok: true, inputHash: body.inputHash || 'same-input', input: { birthInfo: { name: 'mock' }, consultationType: 'lifeBook', topic: '일생' } }),
    resolveStartAccess: async () => ({ ok: permitted, accessType, paymentId: 'original-receipt' }),
    calculateLifeBookAiSaju: () => ({ dayMaster: '壬' }), isLifeFortuneInput: () => false,
    loginRequired: () => new Response('', { status: 401 }), invalidInput: (_message, status = 422) => new Response('', { status }),
    paymentVerifyFailed: () => new Response('', { status: 402 }), serverError: () => new Response('server', { status: 500 }),
    MESSAGES: { llmFailed: 'failed' }, startLocks: new Map(), SECTION_LOCK_TTL_MS: 90000,
    MAX_GENERATION_WAVES: 8, SECTION_BATCH_SIZE: 4, SECTION_CONCURRENCY: 4, LIFE_BOOK_MAX_SECTION_ATTEMPTS: 3,
    publicSession: row => ({ ok: true, sessionId: row.id, status: row.status, saved: row.status === 'completed', messages: row.messages }),
    restoreAccessBeforeGenerationFailure: async () => { refunds++; return true; },
    applyUsageOnce: async ({ idempotencyKey }) => {
      assert.equal(doc.status, 'delivery_pending'); assert.equal(idempotencyKey, 'original-paid-request');
      assert.equal(Object.keys(doc.llmMeta.sections).length, 15);
      if (!doc.usageAppliedAt) { charges++; doc.usageAppliedAt = 'applied'; }
      if (applyLost) { applyLost = false; throw new Error('lost apply reply'); }
    },
    LifeBookAiConsultation: model,
    buildSectionPlan: () => plan, buildSectionDigest: () => '', buildSectionPrompt: () => 'mock', pickSajuSlice: v => v,
    createLlmCacheStore: () => null,
    generateSectionOnce: async (_env, section) => {
      calls.push(section.id);
      return { ok: true, body: { content: `${section.id} 저장된 해설` }, chars: 2600, provider: 'mock', model: 'mock', error: '' };
    },
    assembleReport: (_input, _plan, sections) => ({ chapters: Object.values(sections).map(row => row.body) }),
    getLifeBookReportQualityIssues: () => [], mapIssuesToSections: () => ({ targets: [] }),
    reportTotalContentChars: () => 25000, extractTitle: () => 'mock report', extractKeywords: () => [],
  });
  load(ctx, 'worker/lib/result-storage.js', ['resultStorageUnavailable', 'resultStorageFailurePayload']);
  load(ctx, 'worker/routes/life-book-ai.js', ['handleStart', 'runWithConcurrency', 'reserveProviderCallOnce', 'releaseSectionLock', 'saveLifeBookState', 'finishLifeBookDelivery']);
  const post = (body = {}) => ctx.handleStart(new Request('https://mock.test/api/life-book-ai/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'idempotency-key': 'original-paid-request' }, body: JSON.stringify(body),
  }), {});
  return { ctx, post, get doc() { return doc; }, get calls() { return calls; }, get charges() { return charges; }, get refunds() { return refunds; },
    fault: value => { fault = value; }, permitted: value => { permitted = value; }, owner: value => { owner = value; }, loseApply: () => { applyLost = true; } };
}
for (const accessType of ['pass', 'subscription', 'paid']) {
  test(`${accessType}: 다음 웨이브가 저장된 네 장을 재생성하지 않고 15섹션을 완료한다`, async () => {
    const f = fixture(accessType);
    for (let i = 0; i < 4; i++) {
      const response = await f.post(i ? { resumeSessionId: f.doc.id } : {});
      assert.equal(response.status, i === 3 ? 200 : 202, await response.text());
      assert.equal(f.calls.length, Math.min(15, (i + 1) * 4));
      assert.equal(f.charges, i === 3 ? 1 : 0);
    }
    assert.equal(new Set(f.calls).size, 15); assert.equal(f.refunds, 0);
    assert.equal((await f.post()).status, 200); assert.equal(f.charges, 1);
  });
  test(`${accessType}: 최종 저장 null 후 저장된 결과 재사용·추가 차감 없음`, async () => {
    const f = fixture(accessType); for (let i = 0; i < 3; i++) await f.post();
    f.fault('completed'); const failed = await f.post();
    assert.equal(failed.status, 503); assert.equal((await failed.json()).reason, 'RESULT_STORAGE_UNAVAILABLE');
    assert.equal(f.doc.status, 'delivery_pending'); assert.equal(f.refunds, 0);
    assert.equal((await f.post({ resumeSessionId: f.doc.id })).status, 200);
    assert.equal(f.calls.length, 15); assert.equal(f.charges, 1);
  });
}
test('차감 응답 유실은 저장된 본문을 유지하고 같은 멱등키로 확인한다', async () => {
  const f = fixture(); for (let i = 0; i < 3; i++) await f.post(); f.loseApply();
  assert.equal((await f.post()).status, 503); assert.equal(f.doc.status, 'delivery_pending');
  assert.equal((await f.post()).status, 200); assert.equal(f.charges, 1); assert.equal(f.calls.length, 15); assert.equal(f.refunds, 0);
});
test('체크포인트 저장 null은 실패 환불 없이 503, 성공한 다른 섹션은 보존한다', async () => {
  const f = fixture(); f.fault('checkpoint');
  const response = await f.post(); assert.equal(response.status, 503);
  assert.equal((await response.json()).reason, 'RESULT_STORAGE_UNAVAILABLE');
  assert.equal(f.refunds, 0); assert.equal(f.calls.length, 3);
  await f.post(); assert.equal(new Set(f.calls).size, f.calls.length);
});
test('서로 다른 아이솔레이트의 중복 요청도 DB 잠금으로 네 섹션만 생성한다', async () => {
  const f = fixture(); await f.post(); f.calls.length = 0;
  const first = f.post(); f.ctx.startLocks = new Map(); const second = f.post();
  const responses = await Promise.all([first, second]);
  assert.ok(responses.every(row => [202, 409].includes(row.status))); assert.equal(f.calls.length, 4);
});
test('원래 요청 변경·계정 변경·취소된 증빙은 재생성 없이 거부한다', async () => {
  const f = fixture(); await f.post();
  assert.equal((await f.post({ inputHash: 'changed' })).status, 409);
  f.owner('other'); assert.equal((await f.post({ resumeSessionId: f.doc.id })).status, 404);
  f.owner('owner'); f.permitted(false); assert.equal((await f.post({ resumeSessionId: f.doc.id })).status, 402);
  assert.equal(f.calls.length, 4);
});

for (const revokedIndex of [0, 1, 2]) test(`실제 증빙 판정: 취소/환불 저장소 ${revokedIndex + 1}은 토큰이나 이용권으로 우회할 수 없다`, async () => {
  const f = fixture(); const ctx = f.ctx;
  Object.assign(ctx, {
    verifyAccessToken: async () => ({ userId: 'owner', idempotencyKey: 'original-paid-request', inputHash: 'same-input', featureKey: 'life-book-ai' }),
    getAcceptedFeatureKeys: () => ['life-book-ai'], LEGACY_LIFE_FORTUNE_FEATURE_KEY: 'legacy',
    collectBillingEvidenceIds: () => ['receipt'], objectIdLike: () => false,
    paymentEvidenceClauses: ids => ids.map(id => ({ requestId: id })), pointHistoryEvidenceClauses: ids => ids.map(id => ({ 'metadata.requestId': id })),
    resolveBillingGateAccess: async () => { throw new Error('REVOKED_EVIDENCE_MUST_STOP'); },
    loadBillingUser: async () => { throw new Error('REVOKED_EVIDENCE_MUST_STOP'); },
  });
  ['PaidExecutionRecord', 'Payment', 'PointHistory'].forEach((name, i) => { ctx[name] = { findOne: () => ({ lean: async () => i === revokedIndex ? { id: 'revoked' } : null }) }; });
  load(ctx, 'worker/routes/life-book-ai.js', ['resolveStartAccess']);
  const outcome = await ctx.resolveStartAccess({ request: new Request('https://mock.test'), env: {}, auth: { userId: 'owner' }, body: { accessToken: 'old-token' },
    normalized: { inputHash: 'same-input', input: {} }, idempotencyKey: 'original-paid-request' });
  assert.equal(outcome.ok, false);
});
test('요청 사이 실행 제한으로 중단된 경우 완료 섹션은 그대로 다음 요청에서 진행한다', async () => {
  const f = fixture(); await f.post();
  f.doc.status = 'generating'; f.doc.llmMeta.lockedAt = new Date(Date.now() - 100000).toISOString(); f.doc.llmMeta.lockToken = 'lost-isolate';
  assert.equal((await f.post({ resumeSessionId: f.doc.id })).status, 202);
  assert.equal(f.calls.length, 8); assert.equal(new Set(f.calls).size, 8); assert.equal(f.refunds, 0);
});
test('실제 클라이언트 생성 루프는 재개 ID를 재사용하고 완료 전 결제 복구 정보를 지우지 않는다', async () => {
  const file = 'app/life-book-ai/LifeBookAiClient.tsx';
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'runGeneration') callback = node.initializer.arguments[0]; ts.forEachChild(node, visit); }
  visit(ast); assert.ok(callback);
  const requests = [], moves = [], retryRef = { current: { receipt: 'saved' } };
  const ctx = vm.createContext({ document: { hidden: false }, captureDeliveryScope: () => () => true,
    MAX_GENERATE_WAVES: 12, setStatus() {}, releasePaidFeatureGate() {}, setNotice() {}, setError() {}, setWaveProgress() {},
    retryRef, goToResult: id => moves.push(id), FAILURE_COPY: {},
    runGenerateWave: async (payload, key, access) => {
      assert.ok(retryRef.current);
      requests.push({ payload, key, access });
      return { status: requests.length === 4 ? 'completed' : 'generating', httpStatus: requests.length === 4 ? 200 : 202, data: { sessionId: 'server-session' } };
    },
  });
  vm.runInContext(ts.transpileModule(`globalThis.run = ${callback.getText(ast)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
  assert.equal(await ctx.run({ birth: 'original' }, 'original-paid-request', { receipt: 'paid' }), true);
  assert.equal(requests.length, 4);
  for (const row of requests.slice(1)) { assert.equal(row.payload.resumeSessionId, 'server-session'); assert.equal(row.key, 'original-paid-request'); assert.deepEqual(Object.keys(row.access), []); }
  assert.equal(retryRef.current, null); assert.deepEqual(moves, ['original-paid-request']);
});

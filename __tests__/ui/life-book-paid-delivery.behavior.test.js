const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');
const { supportRecoveryGenerationOptions, assertSupportRecoveryPreserved, supportRecoveryPartHash } = require('../../worker/lib/support-recovery-budget.js');
const { consultationRefundResponse } = require('../../worker/lib/consultation-refund-state.js');
const { runWithAiLocale, getAmbientAiLocale, storedAiLocale } = require('../../worker/lib/ai-locale-context.js');
const { toAiLocale, AI_OUTPUT_LOCALES } = require('../../lib/i18n/ai-locale.js');
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
  const ctx = vm.createContext({ runWithAiLocale, getAmbientAiLocale, storedAiLocale, toAiLocale, URL, Request, Response, Headers, Date, JSON, Map, crypto: webcrypto,
    fetch: async () => { throw new Error('EXTERNAL_FETCH_BLOCKED'); },
    clean: (v, max = 100000) => String(v || '').trim().slice(0, max), randomToken: () => String(++tick),
    readJson: request => request.json(), json: (body, init) => new Response(JSON.stringify(body), init),
    logLifeBookAi() {}, logLifeBookAction() {}, safeLogPayload: () => ({}), buildProviderLogContext: () => ({}),
    safeGeminiFailure: error => ({ status: error.status || null, providerCode: error.providerCode || '', retryable: error.retryable !== false, message: 'Provider request failed.' }),
    getPricing: () => ({}), getConsultationOrderName: () => '인생의 책', getConsultationFeatureKey: () => 'life-book-ai',
    getOptionalUserFromRequest: async () => ({ userId: owner }), connectDb: async () => {},
    PAID_FEATURE_ACCESS_USER_PROJECTION: {}, BILLING_SNAPSHOT_USER_PROJECTION: {},
    readIdempotencyKey: (request, body) => body.idempotencyKey || request.headers.get('idempotency-key'),
    // 증빙 claim 은 billing-evidence-claim.test.js 가 따로 검증한다 — 여기서는 통과로 둔다.
    claimRequestBillingEvidence: async () => ({ ok: true, skipped: true }), releaseRequestBillingEvidence: async () => ({ released: 0 }), evidenceClaimErrorBody: result => result,
    reserveSupportRecoveryAttempt: async () => {},
    supportRecoveryGenerationOptions, assertSupportRecoveryPreserved,
    consultationRefundResponse,
    isStoredPaidResultRevoked: async () => false,
    settleLifeBookFailureRefund: async () => { assert.equal(doc.status, 'generation_failed'); assert.equal(doc.llmMeta.lockedAt, null); refunds++; return { ok: true, refundStatus: 'refunded' }; },
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
    nativeTossContext: () => null, bindNativeTossRequest: () => {},
    nativeLifeBookStoredState: async () => clone(doc),
    LifeBookAiConsultation: model,
    buildSectionPlan: () => plan, buildSectionDigest: () => '', buildSectionPrompt: () => 'mock', pickSajuSlice: v => v,
    createLlmCacheStore: () => null,
    lifeBookSectionValid: () => true, hasRepeatedReportPassage: () => false,
    sectionBodyChars: (_section, body) => body?.content?.replace(/\s/g, '').length || 0,
    generateSectionOnce: async (_env, section) => {
      calls.push(section.id);
      return { ok: true, body: { content: `${section.id} 저장된 해설` }, chars: 2600, provider: 'mock', model: 'mock', error: '' };
    },
    assembleReport: (_input, _plan, sections) => ({ chapters: Object.values(sections).map(row => row.body) }),
    getLifeBookReportQualityIssues: () => [], mapIssuesToSections: () => ({ targets: [] }),
    reportTotalContentChars: () => 25000, extractTitle: () => 'mock report', extractKeywords: () => [],
  });
  load(ctx, 'worker/lib/result-storage.js', ['resultStorageUnavailable', 'resultStorageFailurePayload']);
  load(ctx, 'worker/routes/life-book-ai.js', ['handleStart', 'runWithConcurrency', 'reserveProviderCallOnce', 'releaseSectionLock', 'saveLifeBookState', 'finishLifeBookDelivery', 'lifeBookLengthOptions']);
  const post = (body = {}) => ctx.handleStart(new Request('https://mock.test/api/life-book-ai/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'idempotency-key': 'original-paid-request' }, body: JSON.stringify(body),
  }), {});
  return { ctx, post, get doc() { return doc; }, get calls() { return calls; }, get charges() { return charges; }, get refunds() { return refunds; },
    fault: value => { fault = value; }, permitted: value => { permitted = value; }, owner: value => { owner = value; }, loseApply: () => { applyLost = true; } };
}
for (const accessType of ['pass', 'subscription', 'paid']) test(`${accessType}: 브라우저 종료 뒤 서버가 저장된 상담만 이어 완성하고 재열람은 재생성·중복 차감하지 않는다`, async () => {
  const f = fixture(accessType);
  await f.post();
  load(f.ctx, 'worker/routes/life-book-ai.js', ['resumeConsultationOnServer']);
  for (let wave = 0; wave < 20 && f.doc.status !== 'completed'; wave++) {
    const response = await f.ctx.resumeConsultationOnServer({}, { id: f.doc.id, userId: f.doc.userId });
    assert.ok([200, 202].includes(response.status), await response.text());
  }
  assert.equal(f.doc.status, 'completed');
  const calls = f.calls;
  const consumed = f.charges;
  assert.equal(consumed, 1);
  const again = await f.ctx.resumeConsultationOnServer({}, { id: f.doc.id, userId: f.doc.userId });
  assert.equal(again.status, 200);
  assert.equal(f.calls, calls);
  assert.equal(f.charges, consumed);
  assert.equal(f.refunds, 0);
});

test('life book deterministic provider rejection stops before generating other chapters', async () => {
  const f = fixture(); let calls = 0;
  f.ctx.SECTION_BATCH_SIZE = 1; f.ctx.SECTION_CONCURRENCY = 1;
  f.ctx.generateSectionOnce = async () => { calls++; return { ok: false, body: null, error: 'LLM_INPUT_TOKEN_COUNT_UNAVAILABLE',
    failure: { code: 'LLM_INPUT_TOKEN_COUNT_UNAVAILABLE', status: 400, providerCode: 'GEMINI_API_KEY_INVALID', retryable: false, message: 'Provider request failed.' } }; };
  assert.equal((await f.post()).status, 503);
  assert.equal(f.doc.status, 'generation_failed');
  assert.equal(f.doc.generationError.providerCode, 'GEMINI_API_KEY_INVALID');
  assert.equal(Object.keys(f.doc.llmMeta.sections).length, 1);
  assert.equal(calls, 1);
});

test('life book transient provider failure keeps the same chapter within its existing retry limit', async () => {
  const f = fixture(); let calls = 0;
  f.ctx.SECTION_BATCH_SIZE = 1; f.ctx.SECTION_CONCURRENCY = 1; f.ctx.LIFE_BOOK_MAX_SECTION_ATTEMPTS = 2;
  f.ctx.generateSectionOnce = async () => { calls++; return { ok: false, body: null, error: 'LLM_INPUT_TOKEN_COUNT_UNAVAILABLE',
    failure: { code: 'LLM_INPUT_TOKEN_COUNT_UNAVAILABLE', status: 503, providerCode: 'GEMINI_UNAVAILABLE', retryable: true, message: 'Provider request failed.' } }; };
  assert.equal((await f.post()).status, 503); assert.equal(f.doc.status, 'partial');
  assert.equal((await f.post()).status, 503); assert.equal(f.doc.status, 'generation_failed');
  assert.equal(Object.keys(f.doc.llmMeta.sections).length, 1);
  assert.equal(calls, 2); assert.equal(f.refunds, 1);
});

const approvedSupportRecovery = () => ({ active: true, approvedProvider: 'gemini', approvedModel: 'gemini-2.5-flash', maxOutputTokens: 12000 });

test('life book support recovery passes only approved provider options and caps output before calling the wrapper', async () => {
  const f = fixture(); let options;
  Object.assign(f.ctx, {
    appendExpertPersona: async () => '', buildSystemPrompt: () => '', jsonSchemaFromExample: () => ({}), buildSectionSchema: () => ({}),
    tokensRequiredForChars: () => 18000, resolveSectionTimeoutMs: () => 52000, isStagingLlmMockEnabled: () => false,
    callGeminiText: async (_env, _prompt, supplied) => { options = supplied; return { ok: false, error: 'LLM_PROVIDER_UNAVAILABLE', retryable: false }; },
  });
  load(f.ctx, 'worker/routes/life-book-ai.js', ['generateSectionOnce']);
  await f.ctx.generateSectionOnce({}, { kind: 'chapter', targetChars: 2600, maxOutputTokens: 7000, minChars: 2000 }, 'fixture', { supportRecovery: approvedSupportRecovery() });
  assert.equal(options.model, 'gemini-2.5-flash');
  assert.equal(options.maxOutputTokens, 12000);
  assert.equal(options.maxProviderAttempts, 1);
  assert.equal(options.fallbackToWorkersAI, false);
  options = null;
  await assert.rejects(f.ctx.generateSectionOnce({}, {}, 'fixture', { supportRecovery: { ...approvedSupportRecovery(), approvedModel: 'gemini-2.5-pro' } }), error => error.code === 'SUPPORT_RECOVERY_SCOPE_INVALID');
  assert.equal(options, null);
});

test('life book support recovery excludes preserved chapters from pending and repair targets', async () => {
  const f = fixture(); await f.post();
  const original = clone(f.doc.llmMeta.sections.section0.body);
  f.doc.llmMeta.supportRecovery = { ...approvedSupportRecovery(), preserved: { section0: supportRecoveryPartHash(original) } };
  f.doc.llmMeta.sections.section0.needsRepair = true;
  f.calls.length = 0;
  f.ctx.getLifeBookReportQualityIssues = () => ['chapter_count_mismatch'];
  f.ctx.mapIssuesToSections = () => ({ targets: ['section0'] });
  await f.post();
  assert.ok(!f.calls.includes('section0'));
  assert.equal(supportRecoveryPartHash(f.doc.llmMeta.sections.section0.body), supportRecoveryPartHash(original));
});

for (const state of ['pending', 'refunded', 'manual_review']) test(`life book ${state} refund blocks resume and result delivery`, async () => {
  const f = fixture(); await f.post(); const calls = f.calls.length;
  f.doc.status = 'completed'; f.doc.llmMeta.deliveryRefund = { status: state };
  assert.equal((await f.post({ resumeSessionId: f.doc.id })).status, state === 'refunded' ? 403 : 409);
  load(f.ctx, 'worker/routes/life-book-ai.js', ['handleResult']);
  const result = await f.ctx.handleResult(new Request(`https://fixture.invalid/api/life-book-ai/result?sessionId=${f.doc.id}`), {});
  assert.equal(result.status, state === 'refunded' ? 403 : 409);
  assert.equal((await result.json()).refundStatus, state);
  assert.equal(f.calls.length, calls);
});

test('life book terminal support failure closes its approved job before settlement and keeps cleanup retryable', async () => {
  const f = fixture(); await f.post(); let settled = 0;
  f.doc.llmMeta.supportRecovery = { ...approvedSupportRecovery(), refundApproved: false };
  f.ctx.generateSectionOnce = async () => ({ ok: false, body: null, failure: { status: 400, retryable: false, message: 'Provider rejected.' } });
  f.ctx.settleLifeBookFailureRefund = async () => {
    settled++;
    assert.equal(f.doc.status, 'generation_failed'); assert.equal(f.doc.llmMeta.lockedAt, null);
    assert.ok(f.doc.llmMeta.refundEligibleAt);
    assert.equal(f.doc.llmMeta.supportRecovery.active, false);
    assert.ok(f.doc.llmMeta.supportRecovery.finishedAt);
    return { ok: false, refundStatus: '', reason: 'REFUND_NOT_AUTHORIZED', retryable: false };
  };
  assert.equal((await f.post()).status, 503); assert.equal(settled, 1);
  assert.equal(f.refunds, 0);
});

test('a completed life book remains readable after its support job closes', async () => {
  const f = fixture(); await f.post();
  while (f.doc.status !== 'completed') await f.post({ resumeSessionId: f.doc.id });
  const calls = f.calls.length;
  f.doc.llmMeta.supportRecovery = { active: false, finishedAt: new Date().toISOString() };
  assert.equal((await f.post({ resumeSessionId: f.doc.id })).status, 200);
  load(f.ctx, 'worker/routes/life-book-ai.js', ['handleResult']);
  assert.equal((await f.ctx.handleResult(new Request(`https://fixture.invalid/api/life-book-ai/result?sessionId=${f.doc.id}`), {})).status, 200);
  assert.equal(f.calls.length, calls);
});

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

// 8행(인생 총운) 고유 분기: 위 테스트들은 전부 isLifeFortuneInput 을 false 로 고정 스텁해 이 게이트를 한 번도 타지 않는다.
// 총운은 사주 결과가 구조적으로 불완전하면(대운·용신 등 근거 부족) LLM 생성 전에 결제를 되돌려야 한다(REASON_COPY.SAJU_CALCULATION_FAILED).
function completeLifeFortuneSaju() {
  return {
    yearPillar: '갑자', monthPillar: '을축', dayPillar: '병인', hourPillar: '정묘', dayMaster: '丙',
    pillarDetails: { year: {}, month: {}, day: {} }, fiveElements: {}, tenGods: {},
    tenGodsByPillar: { month: { stemTenGod: '정관' } }, seasonalBalance: { monthBranch: '축' },
    natalInteractions: {}, relationSummary: { mainPattern: 'mock' }, fortuneFacts: { readingBase: { dayMaster: '丙' } },
    interpretationPlan: Array.from({ length: 10 }, (_, i) => ({ title: `chapter${i}` })),
    majorLuck: { available: true, cycles: Array.from({ length: 10 }, (_, i) => ({ index: i })) },
    yearlyLuck: Array.from({ length: 5 }, (_, i) => ({ year: 2026 + i })),
    calculationMeta: { available: true },
  };
}
test('총운: 사주 결과가 구조적으로 불완전하면 생성 전에 환불하고, 완전하면 생성에 들어간다', async () => {
  const f = fixture();
  Object.assign(f.ctx, {
    normalizeConsultationInput: body => ({ ok: true, inputHash: body.inputHash || 'same-input',
      input: { birthInfo: { name: 'mock', birthTimeUnknown: false }, consultationType: 'lifeFortune', topic: '총운' } }),
  });
  load(f.ctx, 'worker/routes/life-book-ai.js', ['isLifeFortuneInput', 'hasRequiredLifeFortuneSaju']);

  f.ctx.calculateLifeBookAiSaju = () => ({ ...completeLifeFortuneSaju(), majorLuck: { available: true, cycles: [] } });
  const blocked = await f.post();
  const blockedBody = await blocked.json();
  assert.equal(blocked.status, 422, JSON.stringify(blockedBody));
  assert.equal(blockedBody.reason, 'SAJU_CALCULATION_FAILED');
  assert.equal(f.refunds, 1);
  assert.equal(f.calls.length, 0, '생성 전 차단이므로 LLM 섹션 호출이 없어야 한다');
  assert.equal(f.doc, null, '실패한 시도는 문서를 남기지 않는다(재시도가 새 시도로 취급됨)');

  f.ctx.calculateLifeBookAiSaju = () => completeLifeFortuneSaju();
  const passed = await f.post();
  assert.equal(passed.status, 202, await passed.text());
  assert.equal(f.calls.length, 4);
  assert.equal(f.refunds, 1, '완전한 사주는 추가 환불을 유발하지 않는다');
});

for (const repair of ['shorter', 'invalid']) test(`life book ${repair} length repair keeps the saved draft`, async () => {
  const f = fixture(); await f.post();
  const prior = clone(f.doc.llmMeta.sections.section0);
  f.doc.llmMeta.sections.section0.needsRepair = true;
  f.doc.llmMeta.sections.section0.repairKind = 'length';
  const base = f.ctx.generateSectionOnce;
  f.ctx.generateSectionOnce = async (...args) => args[1].id === 'section0'
    ? { ok: repair !== 'invalid', body: { content: '짧음' }, chars: 2, error: 'fixture' } : base(...args);
  await f.post();
  assert.equal(f.doc.llmMeta.sections.section0.body.content, prior.body.content);
  assert.equal(f.doc.llmMeta.sections.section0.needsRepair, false);
  assert.equal(f.doc.llmMeta.sections.section0.attempts, 1);
  for (let i = 0; i < 5 && f.doc.status !== 'completed'; i++) await f.post();
  assert.equal(f.doc.status, 'completed'); assert.equal(f.refunds, 0);
});

test('a failed repair keeps a structurally valid saved chapter when another chapter has a repetition issue', async () => {
  const f = fixture(); await f.post();
  const prior = clone(f.doc.llmMeta.sections.section0);
  f.doc.llmMeta.sections.section0.needsRepair = true;
  f.ctx.hasRepeatedReportPassage = () => true;
  f.ctx.generateSectionOnce = async () => ({ ok: false, body: null, chars: 0, error: 'fixture unavailable' });
  await f.post();
  assert.equal(f.doc.llmMeta.sections.section0.body.content, prior.body.content);
  assert.equal(f.doc.llmMeta.sections.section0.ok, true);
});
test('life book reserved length repair resumes without calling that section again', async () => {
  const f = fixture(); await f.post();
  Object.assign(f.doc.llmMeta.sections.section0, { needsRepair: true, repairKind: 'length', lengthRepair: true, attempts: 2 });
  f.calls.length = 0;
  for (let i = 0; i < 5 && f.doc.status !== 'completed'; i++) await f.post();
  assert.equal(f.doc.status, 'completed'); assert.ok(!f.calls.includes('section0'));
  assert.equal(f.doc.llmMeta.sections.section0.attempts, 2);
});

for (const locale of AI_OUTPUT_LOCALES) test(`${locale}: resumes in the purchased language after the UI changes`, async () => {
  const f = fixture();
  const languages = [];
  const original = f.ctx.generateSectionOnce;
  f.ctx.generateSectionOnce = (...args) => { languages.push(getAmbientAiLocale()); return original(...args); };
  await runWithAiLocale(locale, () => f.post({ locale }));
  for (let wave = 0; wave < 20 && f.doc.status !== 'completed'; wave++) {
    await runWithAiLocale(locale === 'en' ? 'ja' : 'en', () => f.post({ locale: 'en' }));
  }
  assert.equal(f.doc.status, 'completed');
  assert.ok(languages.length > 0);
  assert.ok(languages.every(value => value === locale), languages.join(','));
  const count = languages.length;
  await runWithAiLocale('ko', () => f.post());
  assert.equal(languages.length, count);
});

test('Toss original life-book waves use one bound order, saved chapters, recovery and revocation checks', async () => {
  const { build } = require('esbuild');
  const path = require('node:path'), Module = require('node:module');
  const f = fixture('paid');
  const auth = {_id:'identity',ownerId:'owner',userId:'owner',revision:1,userKey:'123',environment:'SANDBOX'};
  const product = {approved:true,nativeService:'life-book',sku:'offline-life',featureKey:'life-book-ai-consultation',productId:'native:life-book:life-book-ai-consultation',approvedPriceKRW:6000,priceEvidence:'offline fixture'};
  const input = {idempotencyKey:'original-paid-request',inputHash:'same-input',topic:'일생'};
  const order = {orderId:'01900000-1111-7111-8111-000000000042',sku:product.sku,status:'PURCHASED'};
  const state = {rows:[],purchases:[],catalog:[product],order,identity:true};
  const chain = value => ({lean:async()=>value,sort(){return this;},limit(){return this;}});
  state.models = {
    TossNativeConsultation:{findOne:q=>chain(state.rows.find(r=>matches(r,q))||null),find:q=>chain(state.rows.filter(r=>matches(r,q))),
      findOneAndUpdate:(q,u)=>{let row=state.rows.find(r=>matches(r,q));if(!row){row={...q,...u.$setOnInsert,createdAt:new Date(Date.now()-600000)};state.rows.push(row);}return chain(row);},
      updateOne:async(q,u)=>{const row=state.rows.find(r=>matches(r,q));if(row)Object.assign(row,u.$set);}},
    TossPurchase:{findOne:q=>chain(state.purchases.find(r=>matches(r,q))||null)},
    TossIdentity:{findOne:()=>chain(state.identity?auth:null)},
  };
  state.transaction=async fn=>fn({assertIdentity:async()=>assert.ok(state.identity),purchase:async id=>state.purchases.find(r=>r._id===id),insertPurchase:async r=>state.purchases.push(r),nativeIntent:async id=>state.rows.find(r=>r._id===id),fundNativeIntent:async(id,owner,orderId)=>Object.assign(state.rows.find(r=>r._id===id),{orderId,status:'paid'}),assignPurchase:async(id,requestId)=>Object.assign(state.purchases.find(r=>r._id===id),{requestId})});
  state.stored=async(_env,userId,id)=>f.doc&&f.doc.userId===userId&&[f.doc.id,f.doc.idempotencyKey].includes(id)?clone(f.doc):null;
  state.handle=async(request,env)=>{
    assert.equal(request.headers.get('Authorization'),null);assert.equal(request.headers.get('Cookie'),null);
    if(state.stopBeforeCheckpoint){state.bootstrapInput=await request.json();return Response.json({ok:false},{status:503});}
    try{return new URL(request.url).pathname.endsWith('/result')?await f.ctx.handleResult(request,env):await f.ctx.handleStart(request,env);}
    catch(error){return Response.json({reason:error.code},{status:error.status||500});}
  };
  globalThis.__lifeNative = state;
  const root = process.cwd();
  const stubs={
    'worker/lib/db.js':'export const withMongoRetry=async(e,f)=>f();',
    'worker/toss/models.js':'export const {TossNativeConsultation,TossPurchase,TossIdentity}=globalThis.__lifeNative.models;',
    'worker/toss/catalog.js':'export const APPROVED_TOSS_NATIVE_PRODUCTS=globalThis.__lifeNative.catalog;',
    'worker/toss/partner.js':'export const lookupOrder=async()=>globalThis.__lifeNative.order;',
    'worker/toss/purchases.js':'export const purchaseStore={transaction:globalThis.__lifeNative.transaction};export const recordTossRefund=async()=>{};',
    'worker/toss/crypto.js':`import {createHash} from 'node:crypto';export const hash=async x=>createHash('sha256').update(x).digest('hex');export const unseal=async()=> '123';`,
    'worker/lib/billing-feature-registry.js':'export const getBillingFeaturePricing=()=>({pricing:{amountKRW:6000}});',
    'worker/routes/fortune-tea-house.js':'export const nativeTeaContract=()=>{};export const nativeTeaStoredState=()=>{};export const handleFortuneTeaHouseRoutes=()=>{};',
    'worker/toss/native-fusion.js':'export const nativeFusionLibraryItem=()=>{};',
    'worker/toss/native-love-secret.js':'export const nativeLoveSecretLibraryItem=()=>{};',
    'worker/toss/native-neo.js':'export const nativeNeoLibraryItem=()=>{};',
    'worker/routes/life-book-ai.js':`const s=globalThis.__lifeNative;
      export const nativeLifeBookContract=input=>({requestId:input.idempotencyKey,resultId:input.idempotencyKey,featureKey:'life-book-ai-consultation',inputHash:input.inputHash,pricing:{amountKRW:6000}});
      export const nativeLifeBookStoredState=s.stored,handleLifeBookAiRoutes=s.handle;`,
  };
  const bundle=await build({stdin:{contents:"export * from './worker/toss/native-life-book.js';export * from './worker/toss/native-context.js';export * from './worker/toss/native-consultation.js';",resolveDir:root},bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'offline',setup(b){b.onLoad({filter:/\.js$/},args=>{const contents=stubs[path.relative(root,args.path).replaceAll('\\','/')];if(contents)return {contents,loader:'js'};});}}]});
  const loaded=new Module(path.join(root,'native-life-book-test.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,loaded.id);const api=loaded.exports;
  f.ctx.nativeTossContext=api.nativeTossContext;f.ctx.bindNativeTossRequest=api.bindNativeTossRequest;
  f.ctx.getOptionalUserFromRequest=async request=>{const native=api.nativeTossContext(request);assert.ok(native,'no web auth fallback');return native.auth;};
  f.ctx.getConsultationFeatureKey=()=>product.featureKey;
  f.ctx.readIdempotencyKey=(_r,body)=>body.idempotencyKey||body.requestId;
  f.ctx.withMongoRetry=async(_e,fn)=>fn();
  f.ctx.Payment={updateOne:()=>{throw Error('WEB_PAYMENT_FORBIDDEN');}};
  f.ctx.normalizeConsultAccessType=x=>x;
  f.ctx.claimRequestBillingEvidence=()=>{throw Error('WEB_CLAIM_FORBIDDEN');};
  f.ctx.releaseRequestBillingEvidence=()=>{throw Error('WEB_RELEASE_FORBIDDEN');};
  f.ctx.isStoredPaidResultRevoked=()=>{throw Error('WEB_REVOCATION_FORBIDDEN');};
  load(f.ctx,'worker/routes/life-book-ai.js',['resolveStartAccess','applyUsageOnce','handleResult']);
  const call=(suffix,body,who=auth)=>api.handleNativeLifeBook(new Request('https://example.invalid'+suffix,{method:body?'POST':'GET',headers:{Authorization:'forbidden',Cookie:'forbidden'},...(body?{body:JSON.stringify(body)}:{})}),{},who,suffix.split('?')[0]);
  const prepared=await api.prepareNativeLifeBook({},auth,input);
  assert.equal((await call('/generate',input)).status,402);
  await assert.rejects(api.prepareNativeLifeBook({},auth,{...input,inputHash:'changed'}),/REQUEST_INPUT_MISMATCH/);
  const args={store:{transaction:state.transaction},auth,order,product,requestId:prepared.id};
  await api.grantNativeOrder(args);await api.grantNativeOrder(args);assert.equal(state.purchases.length,1);
  state.catalog.length=0;
  state.stopBeforeCheckpoint=true;
  const boot=await api.bootstrapNativeLifeBookOrders({TOSS_RELEASE_READY:'true'},{now:Date.now(),deadline:Date.now()+240000});
  assert.equal(boot[0].status,503);assert.deepEqual(state.bootstrapInput,input);assert.equal(f.doc,null);
  assert.ok(state.rows[0].recoveryNextAt);state.stopBeforeCheckpoint=false;
  const first=await call('/result');assert.equal(first.status,202);const virtual=(await first.json()).sessionId;
  assert.equal((await call('/generate',{resumeSessionId:virtual,inputHash:'ignored'})).status,202);
  assert.equal(f.doc.accessSource,'toss');assert.equal(f.doc.paymentId,order.orderId);
  for(let i=0;i<10&&f.doc.status!=='completed';i++)assert.ok([200,202].includes((await call('/generate',{resumeSessionId:f.doc.id})).status));
  assert.equal(f.doc.status,'completed');assert.equal(f.calls.length,15);assert.equal(f.charges,0);assert.equal(f.refunds,0);
  assert.ok(f.doc.usageAppliedAt);const saved=clone(f.doc.messages);
  assert.equal((await call('/generate',input)).status,200);
  assert.deepEqual((await (await call('/result?attemptId='+virtual)).json()).messages,saved);assert.equal(f.calls.length,15);
  assert.equal((await call('/generate',{...input,inputHash:'tampered'})).status,409);
  for(const who of [{...auth,ownerId:'other',userId:'other'},{...auth,environment:'DEFAULT'}])assert.notEqual((await call('/result?attemptId='+f.doc.id,null,who)).status,200);
  const recovery=new Request('https://internal.invalid');
  assert.equal(await api.bindNativeLifeBookRecovery(recovery,{TOSS_RELEASE_READY:'true'},f.doc),true);
  state.order={...order,status:'REFUNDED'};
  assert.equal((await call('/result?attemptId='+f.doc.id)).status,409);
  assert.equal((await call('/generate',{resumeSessionId:f.doc.id})).status,409);
  state.order=order;state.identity=false;assert.equal((await call('/result?attemptId='+f.doc.id)).status,401);
  assert.equal(f.calls.length,15);
  delete globalThis.__lifeNative;
});

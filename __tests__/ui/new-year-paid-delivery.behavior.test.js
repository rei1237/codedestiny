const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');
const { supportRecoveryGenerationOptions, assertSupportRecoveryPreserved } = require('../../worker/lib/support-recovery-budget.js');
const { consultationRefundResponse, consultationRefundState } = require('../../worker/lib/consultation-refund-state.js');
const { runWithAiLocale, getAmbientAiLocale, storedAiLocale } = require('../../worker/lib/ai-locale-context.js');
const { toAiLocale, AI_OUTPUT_LOCALES } = require('../../lib/i18n/ai-locale.js');
const { retryableFailureMeta, publicRetryState, reopenRetryableConsultation, markRetryableRefundDue } = require('../../worker/lib/paid-delivery-stuck.js');
// 2026-11-19 다시 시도 우선(R4): 종결 실패는 즉시 환불하지 않고 생성 + 7일 무료 다시 시도를 연다(환불 0회, refundEligibleAt 없음).
const retryOpen = doc => doc?.status === 'generation_failed' && Boolean(doc.llmMeta?.retryable?.refundAt) && doc.llmMeta?.refundEligibleAt === undefined;
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


function fixture(accessType = 'pass', currentSections = null) {
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
    updateOne: async (filter, update) => {
      if (!doc || !matches(doc, filter)) return { modifiedCount: 0 };
      for (const [key, value] of Object.entries(update.$set || {})) set(doc, key, value);
      return { modifiedCount: 1 };
    },
  };
  const plan = currentSections || ['overview', 'wealth', 'romance', 'monthly', 'health'].map(key => ({ key, label: key, minChars: 4000, maxChars: 5000 }));
  const ctx = vm.createContext({ ...require('../../worker/lib/consultation-answer-contract.js'), ...require('../../worker/lib/trait-profile/index.js'), ...require('../../worker/lib/engine-rollout.js'), buildShinsalFactsBlock: require('../../lib/saju/shinsal-facts-block.mjs').buildShinsalFactsBlock, computeRemedyCases: require('../../lib/saju/remedy/index.mjs').computeRemedyCases, serializeRemedyForPrompt: require('../../lib/saju/remedy/index.mjs').serializeRemedyForPrompt, NEW_YEAR_REMEDY_MAX_CHARS: 600, nativeTossContext: () => null, nativeNewYearStoredState: async () => clone(doc), sajuAuthorityOn: () => false, runWithAiLocale, getAmbientAiLocale, storedAiLocale, toAiLocale, URL, Request, Response, Headers, Date, JSON, Map, crypto: webcrypto, console: { error() {}, warn() {} }, normalizeConsultAccessType: value => value,
    PASS_SETTLEMENT_DENIAL_CODES: new Set(['MONTHLY_PASS_LIMIT_EXCEEDED', 'PAYMENT_REQUIRED', 'PRICE_EXCEEDS_PASS_LIMIT']),
    // 증빙 claim 은 billing-evidence-claim.test.js 가 따로 검증한다 — 여기서는 통과로 둔다.
    claimRequestBillingEvidence: async () => ({ ok: true, skipped: true }), releaseRequestBillingEvidence: async () => ({ released: 0 }), evidenceClaimErrorBody: result => result, FEATURE_KEY: 'new-year-ai-consultation',
    reserveSupportRecoveryAttempt: async () => {},
    supportRecoveryGenerationOptions, assertSupportRecoveryPreserved,
    consultationRefundResponse, consultationRefundState, User: {}, Payment: {}, PaidExecutionRecord: {}, PointHistory: {},
    retryableFailureMeta, publicRetryState, reopenRetryableConsultation, markRetryableRefundDue,
    isStoredPaidResultRevoked: async () => false,
    settleNewYearFailureRefund: async () => { assert.equal(doc.status, 'generation_failed'); assert.equal(doc.llmMeta.lockedAt, null); return { ok: true, refundStatus: 'refunded' }; },
    fetch: async () => { throw new Error('EXTERNAL_FETCH_BLOCKED'); },
    clean: (v, max = 100000) => String(v || '').trim().slice(0, max), cleanForbiddenResult: v => v,
    randomToken: () => String(++tick), readJson: request => request.json(), json: (body, init) => new Response(JSON.stringify(body), init),
    getRoutePath: request => new URL(request.url).pathname.replace('/api/new-year-ai', ''),
    logNewYearAi() {}, safeLogPayload: () => ({}), getPricing: () => ({}),
    safeGeminiFailure: error => ({ status: error.status || null, providerCode: error.providerCode || '', retryable: error.retryable !== false, message: 'Provider request failed.' }),
    getOptionalUserFromRequest: async () => ({ userId: owner }), connectDb: async () => {}, BILLING_SNAPSHOT_USER_PROJECTION: {},
    readIdempotencyKey: (request, body) => body.idempotencyKey || request.headers.get('idempotency-key'),
    normalizeConsultationInput: body => ({ ok: true, inputHash: body.inputHash || 'same-input', input: { birthInfo: {}, year: 2026, topic: '신년' } }),
    resolveStartAccess: async () => ({ ok: permitted, accessType, deferredUsage: true, paymentId: 'original-receipt' }),
    calculateNewYearFortuneData: () => ({ year: 2026 }),
    loginRequired: () => new Response('', { status: 401 }), notFound: () => new Response('', { status: 404 }), invalidInput: (_message, status = 422) => new Response('', { status }),
    paymentVerifyFailed: () => new Response('', { status: 402 }), serverError: () => new Response('server', { status: 500 }),
    NEW_YEAR_AI_GENERATING_FRESH_MS: 120000, NEW_YEAR_AI_LLM_BUDGET_MS: 82000, NEW_YEAR_AI_SECTION_TIMEOUT_MS: 52000,
    NEW_YEAR_AI_REPAIR_MIN_REMAINING_MS: 18000, NEW_YEAR_AI_SECTION_MAX_ATTEMPTS: 2, NEW_YEAR_AI_LENGTH_REPAIR_MAX: 2, NEW_YEAR_AI_LENGTH_REPAIR_SECTION_RATIO: 0.6, NEW_YEAR_AI_SECTION_MIN_LENGTH: 300, NEW_YEAR_AI_MIN_TOTAL_CHARS: 20000, NEW_YEAR_AI_MAX_TOTAL_CHARS: currentSections ? 33000 : 26000,
    NEW_YEAR_AI_SECTIONS: plan, NEW_YEAR_AI_SECTIONS_V1: plan, NEW_YEAR_AI_SECTIONS_V2: plan, NEW_YEAR_AI_SECTION_PLAN_VERSION: 2,
    NEW_YEAR_AI_V2_MAX_TOTAL_CHARS: currentSections ? 40000 : 26000, LLM_ERROR_MESSAGE: 'generation failed', SERVER_ERROR_MESSAGE: 'server error',
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
  load(ctx, 'worker/lib/representative-consumer-facts.js', ['connectNewYearTiming', 'readRepresentativeFacts']);
  load(ctx, 'worker/lib/result-storage.js', ['resultStorageUnavailable', 'resultStorageFailurePayload']);
  load(ctx, 'worker/lib/late-usage-settlement.js', ['lateUsageSettlementFailure', 'usageSettlementSetFields', 'lateAccessDenialSettlement']);
  load(ctx, 'worker/lib/paid-report-quality.js', ['paidReportBody', 'countPaidReportBodyChars', 'reportSentenceKey', 'hasRepeatedReportPassage']);
  load(ctx, 'worker/lib/master-love-codex-quality.js', ['dedupeCodexBody']);
  load(ctx, 'worker/lib/paid-report-length.js', ['trimPaidReportText', 'lastSentenceBoundary']);
  load(ctx, 'worker/routes/new-year-ai.js', ['handleNewYearAiRoutes', 'handleStart', 'resolveNewYearRequestAccess', 'generateNewYearWave', 'assembleConsultationSections', 'trimToLastCompleteSentence', 'saveNewYearState', 'finishNewYearDelivery', 'startEvidenceIds', 'newYearSectionsForPlan', 'ownsQuestion', 'planMaxTotalChars', 'newYearRetryMeta', 'newYearHeldBillingFields', 'releaseNewYearHeldBilling', 'newYearRetryPayload', 'newYearRetryReset', 'handleRetry', 'handleRefundRequest', 'newYearShinsalBlock', 'newYearRemedyCases', 'newYearRemedyBlock']);
  ctx.generateConsultationText = ctx.generateNewYearWave;
  const post = (body = {}, env = {}) => ctx.handleNewYearAiRoutes(new Request('https://mock.test/api/new-year-ai/start', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'idempotency-key': 'original-paid-request' }, body: JSON.stringify(body),
  }), env);
  return { ctx, post, get doc() { return doc; }, get calls() { return calls; }, get charges() { return charges; }, get refunds() { return refunds; },
    fault: value => { fault = value; }, permitted: value => { permitted = value; }, owner: value => { owner = value; }, loseApply: () => { lostApply = true; } };
}

test('deterministic provider rejection stops after one reserved section and preserves its cause', async () => {
  const f = fixture('paid'); let calls = 0;
  f.ctx.generateConsultationSection = async (_env, { section }) => { calls++; return { key: section.key, ok: false, text: '',
    reason: 'LLM_INPUT_TOKEN_COUNT_UNAVAILABLE', failure: { code: 'LLM_INPUT_TOKEN_COUNT_UNAVAILABLE', status: 400, providerCode: 'GEMINI_API_KEY_INVALID', retryable: false, message: 'Provider request failed.' } }; };
  assert.equal((await f.post()).status, 503);
  assert.equal(f.doc.status, 'generation_failed');
  assert.equal(calls, 1);
  assert.deepEqual(f.doc.llmMeta.attempts, { overview: 1 });
  assert.equal(f.doc.llmMeta.savedSections[0].reason, 'LLM_INPUT_TOKEN_COUNT_UNAVAILABLE');
  assert.equal(f.doc.generationError.providerCode, 'GEMINI_API_KEY_INVALID');
  assert.equal((await f.post()).status, 409);
  assert.equal(calls, 1);
});

test('temporary provider failure resumes the same section with a bounded saved budget', async () => {
  const f = fixture('paid'); let calls = 0;
  f.ctx.generateConsultationSection = async (_env, { section }) => { calls++; return { key: section.key, ok: false, text: '',
    reason: 'LLM_INPUT_TOKEN_COUNT_UNAVAILABLE', failure: { code: 'LLM_INPUT_TOKEN_COUNT_UNAVAILABLE', status: 503, providerCode: 'GEMINI_UNAVAILABLE', retryable: true, message: 'Provider request failed.' } }; };
  for (let i = 1; i <= 3; i++) {
    const response = await f.post(i > 1 ? { resumeSessionId: f.doc.id } : {});
    assert.equal(response.status, 503);
    assert.equal(f.doc.status, i < 3 ? 'partial' : 'generation_failed');
    assert.deepEqual(f.doc.llmMeta.attempts, { overview: i });
  }
  assert.equal(calls, 3);
  const again = await f.post();
  assert.equal(again.status, 409); assert.equal((await again.json()).retry?.available, true);
  assert.equal(f.refunds, 0); assert.ok(retryOpen(f.doc));
});

test('a provider failure in the next section does not erase an accepted chapter', async () => {
  const f = fixture('paid'); await f.post();
  const preserved = f.doc.llmMeta.savedSections[0].text;
  f.ctx.generateConsultationSection = async () => ({ ok: false, failure: { code: 'LLM_PROVIDER_UNAVAILABLE', status: 400, retryable: false, message: 'Provider request failed.' } });
  await f.post({ resumeSessionId: f.doc.id });
  assert.equal(f.doc.llmMeta.savedSections[0].text, preserved);
  assert.equal(f.doc.llmMeta.savedSections[0].ok, true);
});

test('a support-recovery budget refusal happens before the next provider call', async () => {
  const f = fixture('paid'); let reservations = 0;
  f.ctx.reserveSupportRecoveryAttempt = async () => { if (++reservations > 1) throw Object.assign(new Error('support limit'), { code: 'SUPPORT_RECOVERY_BUDGET_EXHAUSTED' }); };
  await f.post(); const prior = f.doc.llmMeta.savedSections[0].text;
  assert.equal((await f.post({ resumeSessionId: f.doc.id })).status, 503);
  assert.equal(f.calls, 1);
  assert.equal(f.doc.llmMeta.savedSections[0].text, prior);
  assert.equal(f.doc.generationError.code, 'SUPPORT_RECOVERY_BUDGET_EXHAUSTED');
});

for (const state of ['pending', 'refunded', 'manual_review']) test(`new year ${state} refund blocks resume and result delivery`, async () => {
  const f = fixture('paid'); await f.post(); const calls = f.calls;
  f.doc.status = 'completed'; f.doc.llmMeta.deliveryRefund = { status: state };
  const started = await f.post({ resumeSessionId: f.doc.id });
  assert.equal(started.status, state === 'refunded' ? 403 : 409);
  load(f.ctx, 'worker/routes/new-year-ai.js', ['handleResult']);
  const result = await f.ctx.handleResult(new Request(`https://fixture.invalid/api/new-year-ai/result?sessionId=${f.doc.id}`), {});
  assert.equal(result.status, state === 'refunded' ? 403 : 409);
  assert.equal((await result.json()).refundStatus, state);
  assert.equal(f.calls, calls);
});

test('new year terminal failure opens a free retry window instead of refunding', async () => {
  const f = fixture('paid'); let settled = 0;
  f.ctx.generateConsultationSection = async () => ({ ok: false, failure: { status: 400, retryable: false, message: 'Provider rejected.' } });
  f.ctx.settleNewYearFailureRefund = async () => { settled++; return { ok: true, refundStatus: 'refunded' }; };
  const failed = await f.post();
  assert.equal(failed.status, 503); assert.equal(settled, 0); assert.equal(f.refunds, 0);
  const body = await failed.json();
  assert.equal(body.reason, 'LLM_ERROR'); assert.equal(body.refunded, false); assert.equal(body.retryable, undefined);
  assert.equal(body.retry.available, true); assert.equal(body.retry.sessionId, f.doc.id); assert.ok(body.retry.refundAt);
  assert.ok(retryOpen(f.doc)); assert.equal(f.doc.llmMeta.lockedAt, null);
  load(f.ctx, 'worker/routes/new-year-ai.js', ['handleResult']);
  const result = await f.ctx.handleResult(new Request(`https://fixture.invalid/api/new-year-ai/result?sessionId=${f.doc.id}`), {});
  assert.equal(result.status, 409); assert.equal((await result.json()).retry?.available, true);
});

test('R4: Toss native, support recovery and deferred apply failures keep the immediate refund', () => {
  const f = fixture('paid'); const request = new Request('https://mock.test/api/new-year-ai/start');
  const doc = { id: 'nyai_1', createdAt: new Date().toISOString(), llmMeta: {} };
  assert.ok(f.ctx.newYearRetryMeta(request, { userId: 'owner' }, doc, 'LLM_ERROR')?.refundAt);
  assert.equal(f.ctx.newYearRetryMeta(request, { userId: 'owner', tossNative: true }, doc, 'LLM_ERROR'), null);
  assert.equal(f.ctx.newYearRetryMeta(request, { userId: 'owner' }, { ...doc, accessSource: 'toss' }, 'LLM_ERROR'), null);
  assert.equal(f.ctx.newYearRetryMeta(request, { userId: 'owner' }, { ...doc, llmMeta: { supportRecovery: { by: 'ops' } } }, 'LLM_ERROR'), null);
  assert.equal(f.ctx.newYearRetryMeta(request, { userId: 'owner' }, doc, 'DEFERRED_USAGE_APPLY_FAILED'), null);
  assert.equal(f.ctx.newYearRetryMeta(request, { userId: 'owner' }, { ...doc, llmMeta: { refundEligibleAt: new Date().toISOString() } }, 'LLM_ERROR'), null);
  // 창이 지난 건(생성 + 7일 경과)은 다시 시도 대신 즉시 환불로 간다.
  assert.equal(f.ctx.newYearRetryMeta(request, { userId: 'owner' }, { ...doc, createdAt: new Date(Date.now() - 8 * 86400000).toISOString() }, 'LLM_ERROR'), null);
});

// R4 다시 시도: 같은 소유자는 무료로 빠진 분야만 다시 쓰고 완성, 차감은 전달 때 1회뿐이다.
test('R4: retry reopens a failed reading, regenerates only the missing field, completes with one charge and no refund', async () => {
  const f = fixture('pass'); const base = f.ctx.generateConsultationSection; let broken = true; const keys = [];
  f.ctx.generateConsultationSection = async (env, args) => { keys.push(args.section.key);
    return args.section.key === 'romance' && broken ? { key: 'romance', ok: false, text: '', failure: { status: 400, retryable: false, message: 'Provider rejected.' } } : base(env, args); };
  for (let i = 0; i < 12 && f.doc?.status !== 'generation_failed'; i++) await f.post(f.doc ? { resumeSessionId: f.doc.id } : {});
  assert.ok(retryOpen(f.doc)); assert.equal(f.charges, 0);
  const kept = f.doc.llmMeta.savedSections.filter(row => row.ok).map(row => row.key);
  assert.ok(kept.length >= 1); assert.ok(!kept.includes('romance'));
  broken = false; keys.length = 0;
  const retried = await f.ctx.handleRetry(new Request('https://mock.test/api/new-year-ai/retry', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: f.doc.id }) }), {});
  assert.ok([200, 202].includes(retried.status), await retried.text());
  assert.equal(f.doc.llmMeta.retryable.reopens, 1);
  for (let i = 0; i < 12 && f.doc.status !== 'completed'; i++) await f.post({ resumeSessionId: f.doc.id });
  assert.equal(f.doc.status, 'completed'); assert.equal(f.charges, 1); assert.equal(f.refunds, 0);
  assert.ok(keys.includes('romance')); assert.ok(kept.every(key => !keys.includes(key)));
});

test('R4: retry is refused for another user and after the retry window, without reopening or refunding', async () => {
  const f = fixture('paid');
  f.ctx.generateConsultationSection = async () => ({ ok: false, failure: { status: 400, retryable: false, message: 'Provider rejected.' } });
  await f.post(); assert.ok(retryOpen(f.doc));
  const retry = () => f.ctx.handleRetry(new Request('https://mock.test/api/new-year-ai/retry', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: f.doc.id }) }), {});
  f.owner('stranger');
  assert.equal((await retry()).status, 404); assert.equal(f.doc.status, 'generation_failed');
  f.owner('owner');
  f.doc.llmMeta.retryable.refundAt = new Date(Date.now() - 1000).toISOString();
  const expired = await retry();
  assert.equal(expired.status, 409); assert.equal((await expired.json()).reason, 'RETRY_WINDOW_EXPIRED');
  assert.equal(f.doc.status, 'generation_failed'); assert.equal(f.refunds, 0);
});

test('R4: a customer refund request marks the retryable reading due and settles it', async () => {
  const f = fixture('paid'); let settled = 0;
  f.ctx.generateConsultationSection = async () => ({ ok: false, failure: { status: 400, retryable: false, message: 'Provider rejected.' } });
  f.ctx.settleNewYearFailureRefund = async () => { settled++; assert.ok(f.doc.llmMeta.refundEligibleAt); return { ok: true, refundStatus: 'refunded' }; };
  await f.post(); assert.ok(retryOpen(f.doc));
  const ask = () => f.ctx.handleRefundRequest(new Request('https://mock.test/api/new-year-ai/refund-request', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: f.doc.id }) }), {});
  const first = await ask();
  assert.equal(first.status, 200); const body = await first.json();
  assert.equal(body.ok, true); assert.equal(body.refundStatus, 'refunded'); assert.equal(settled, 1);
  assert.equal(f.doc.llmMeta.retryable.refundReason, 'CUSTOMER_REQUEST');
  // 환불이 시작되면 다시 시도는 닫힌다.
  const retried = await f.ctx.handleRetry(new Request('https://mock.test/api/new-year-ai/retry', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: f.doc.id }) }), {});
  assert.equal(retried.status, 409); assert.equal(f.doc.status, 'generation_failed');
});

test('R4: the held claim and deferred usage stay through the retry window and are released on a refund request', async () => {
  const f = fixture('pass'); const released = [];
  f.ctx.releaseRequestBillingEvidence = async (_env, args) => { released.push(args); return { released: args.evidenceIds.length }; };
  f.ctx.generateConsultationSection = async () => ({ ok: false, failure: { status: 400, retryable: false, message: 'Provider rejected.' } });
  await f.post(); assert.ok(retryOpen(f.doc));
  assert.equal(released.length, 0); assert.equal(f.refunds, 0);
  assert.deepEqual([...f.doc.llmMeta.claimEvidenceIds], ['original-receipt']); assert.equal(f.doc.llmMeta.deferredUsage, true);
  const res = await f.ctx.handleRefundRequest(new Request('https://mock.test/api/new-year-ai/refund-request', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: f.doc.id }) }), {});
  assert.equal(res.status, 200);
  assert.equal(released.length, 1); assert.deepEqual([...released[0].evidenceIds], ['original-receipt']);
  assert.equal(released[0].requestId, 'original-paid-request'); assert.equal(f.refunds, 1);
});

test('a completed new year report remains readable after its support job closes', async () => {
  const f = fixture('paid'); await f.post(); const calls = f.calls;
  f.doc.status = 'completed'; f.doc.llmMeta.supportRecovery = { active: false, finishedAt: new Date().toISOString() };
  assert.equal((await f.post({ resumeSessionId: f.doc.id })).status, 200);
  load(f.ctx, 'worker/routes/new-year-ai.js', ['handleResult']);
  assert.equal((await f.ctx.handleResult(new Request(`https://fixture.invalid/api/new-year-ai/result?sessionId=${f.doc.id}`), {})).status, 200);
  assert.equal(f.calls, calls);
});
for (const accessType of ['pass', 'subscription', 'paid']) test(`${accessType}: 브라우저 종료 뒤 서버가 저장된 상담만 이어 완성하고 재열람은 재생성·중복 차감하지 않는다`, async () => {
  const f = fixture(accessType);
  await f.post();
  load(f.ctx, 'worker/routes/new-year-ai.js', ['resumeConsultationOnServer']);
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
test('늦은 이용권 차감이 한도로 거절돼도 보존된 본문을 완료로 전달하고 미차감을 표시한다', async () => {
  const f = fixture('pass'); let applied = 0;
  f.ctx.resolveStartAccess = async () => ({ ok: true, accessType: 'pass', paymentId: '', usageAlreadyApplied: false });
  f.ctx.applyUsageOnce = async () => {
    applied++;
    throw applied === 1 ? new Error('db timeout') : Object.assign(new Error('limit'), { code: 'MONTHLY_PASS_LIMIT_EXCEEDED' });
  };
  for (let i = 0; i < 4; i++) assert.equal((await f.post()).status, 202);
  const pending = await f.post(); assert.equal(pending.status, 503); assert.equal((await pending.json()).reason, 'RESULT_DELIVERY_PENDING');
  assert.equal(f.doc.status, 'delivery_pending');
  const response = await f.post(); assert.equal(response.status, 200, await response.text());
  assert.equal(f.doc.status, 'completed'); assert.equal(f.doc.llmMeta.usageSettlement, 'failed');
  assert.equal(f.doc.llmMeta.usageSettlementReason, 'MONTHLY_PASS_LIMIT_EXCEEDED');
  assert.equal(applied, 2); assert.equal(f.charges, 0); assert.equal(f.calls, 5); assert.equal(f.refunds, 0);
});
// 실제 resolveStartAccess·resolveServerAccess 를 싣고 이용권 한도만 소진시킨다 — 라우트가 진짜 402(PAYMENT_REQUIRED)를 낸다.
function denyPassByLimit(f, { refundedPass = null, withdrawn = false, revokedEvidence = false } = {}) {
  Object.assign(f.ctx, {
    collectBillingTokens: (_body, key) => [key], deferredTokenClauses: ids => ids.map(id => ({ requestId: id })), paymentTokenClauses: ids => ids.map(id => ({ merchantUid: id })),
    pointHistoryTokenClauses: ids => ids.map(id => ({ 'metadata.requestId': id })), withMongoRetry: (_env, run) => run(), isAdmin: () => false,
    loadBillingUser: async () => ({ _id: 'owner', role: 'user' }), resolveBillingGateAccess: async () => ({ ok: false }),
    resolveFeatureAccessPolicy: () => ({ allowed: false, reason: 'MONTHLY_PASS_LIMIT_EXCEEDED' }), getPricing: () => ({ coinPrice: 300 }),
    PaidExecutionRecord: { findOne: () => ({ lean: async () => null }) },
    PointHistory: { findOne: () => ({ lean: async () => (revokedEvidence ? { id: 'refunded-use' } : null) }) },
    Payment: { findOne: filter => ({ lean: async () => (filter.paymentType === 'membership_pass' ? refundedPass : null) }) },
    User: { findOne: () => ({ select: () => ({ lean: async () => ({ _id: 'owner', status: withdrawn ? 'withdrawn' : 'active' }) }) }) },
  });
  load(f.ctx, 'worker/routes/new-year-ai.js', ['resolveStartAccess', 'resolveServerAccess']);
}
test('본문 완성 직후 재확인이 이용권 한도 소진으로 402 여도 완료로 전달하고 미정산을 표시한다', async () => {
  const f = fixture('pass'); for (let i = 0; i < 4; i++) assert.equal((await f.post()).status, 202);
  const allowed = f.ctx.resolveStartAccess; denyPassByLimit(f); const denied = f.ctx.resolveStartAccess; let checks = 0;
  f.ctx.resolveStartAccess = async args => (++checks === 1 ? allowed(args) : denied(args));
  const response = await f.post(); assert.equal(response.status, 200, await response.text()); assert.equal(checks, 2);
  assert.equal(f.doc.status, 'completed'); assert.equal(f.doc.llmMeta.usageSettlement, 'failed'); assert.equal(f.doc.llmMeta.usageSettlementReason, 'PAYMENT_REQUIRED');
  assert.equal(f.charges, 0); assert.equal(f.refunds, 0); assert.equal(f.calls, 5);
});
test('전달 대기 상담을 이어받을 때 이용권 한도가 소진돼 402 여도 보존된 본문을 완료로 전달한다', async () => {
  const f = fixture('pass'); for (let i = 0; i < 4; i++) await f.post(); f.fault('completed');
  assert.equal((await f.post()).status, 503); assert.equal(f.doc.status, 'delivery_pending');
  denyPassByLimit(f); const response = await f.post(); assert.equal(response.status, 200, await response.text());
  assert.equal(f.doc.status, 'completed'); assert.equal(f.doc.llmMeta.usageSettlement, 'failed'); assert.equal(f.calls, 5); assert.equal(f.refunds, 0);
});
for (const [label, opts] of [['이용권 주문 환불', { refundedPass: { status: 'refunded' } }], ['회원 탈퇴', { withdrawn: true }], ['이용권 사용 환불 증빙', { revokedEvidence: true }]]) {
  test(`${label}이면 한도 거절 재확인을 전달로 바꾸지 않는다`, async () => {
    const f = fixture('pass'); for (let i = 0; i < 4; i++) await f.post(); f.fault('completed');
    assert.equal((await f.post()).status, 503);
    denyPassByLimit(f, opts); assert.equal((await f.post()).status, 402);
    assert.equal(f.doc.status, 'delivery_pending'); assert.equal(f.doc.llmMeta.usageSettlement, undefined);
  });
}
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
test('짧은 본문도 모든 분야를 저장한 뒤 한 번만 전달한다', async () => {
  const f = fixture(); f.ctx.generateConsultationSection = async (_env, { section }) => ({ key: section.key, section, text: p3Body(section.key, 400), ok: true });
  for (let i = 0; i < 4; i++) assert.equal((await f.post()).status, 202);
  assert.equal((await f.post()).status, 200);
  assert.equal(f.doc.status, 'completed'); assert.equal(f.charges, 1);
});

test('새 상세 본문의 19,999자/20,000자 완료 경계를 지킨다', async () => {
  const f = fixture();
  const sections = f.ctx.NEW_YEAR_AI_SECTIONS.map((section, i) => ({ key: section.key, section, ok: true, text: String.fromCharCode(44032 + i).repeat(i === 4 ? 3999 : 4000) }));
  const options = { savedSections: sections, attempts: {}, deadlineAt: Date.now(), onReserve: async () => { throw new Error('NO_PROVIDER_CALL'); }, onCheckpoint: async () => {} };
  const low = await f.ctx.generateNewYearWave({}, {}, {}, options); assert.equal(low.complete, true); assert.equal(low.quality.totalChars, 19999);
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
  const ctx = vm.createContext({ document: { hidden: false }, captureDeliveryScope: () => () => true, READING_SECTION_TOTAL: 6,
    setStatus() {}, setNotice() {}, setError() {}, pendingGenerationRef, applyResult: result => states.push(result.status),
    window: { clearTimeout() {} }, autoResumeRef: { current: { timer: 0, rounds: 0, best: 0 } }, rememberNewYearSession() {},
    isRetriableResultPollFailure: () => false, scheduleAutoResume: () => false, newYearRefundNotice: () => '', newYearRetryOffer: () => '', setRetryOffer() {},
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

test('P2 initial and repair calls retain expanded token budget and timeout', async () => {
  const file = 'worker/routes/new-year-ai.js';
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const calls = [];
  const ctx = vm.createContext({ console, Math, supportRecoveryGenerationOptions,
    clean: value => String(value || '').trim(), isStagingLlmMockEnabled: () => false,
    buildSectionPrompt: () => 'mock prompt', buildSystemPrompt: () => 'mock system', appendExpertPersona: async (_env, _key, base) => base,
    callGeminiText: async (_env, _prompt, options) => { calls.push(options); return { ok: true, provider: 'gemini', text: '본문'.repeat(300) }; },
  });
  for (const name of ['NEW_YEAR_AI_SECTIONS_V1', 'NEW_YEAR_AI_SECTIONS_V2', 'NEW_YEAR_AI_SECTION_MAX_OUTPUT_TOKENS', 'NEW_YEAR_AI_V2_SECTION_MAX_OUTPUT_TOKENS', 'NEW_YEAR_AI_SECTION_MIN_LENGTH', 'NEW_YEAR_AI_SECTION_TIMEOUT_MS']) {
    const declaration = ast.statements.filter(ts.isVariableStatement).flatMap(row => [...row.declarationList.declarations]).find(row => row.name.getText(ast) === name);
    assert.ok(declaration, name);
    vm.runInContext(`var ${declaration.getText(ast)};`, ctx);
  }
  load(ctx, file, ['generateConsultationSection', 'sectionMaxOutputTokens', 'newYearSectionPromptWithinBudget']);
  ctx.NEW_YEAR_AI_SECTIONS = [...ctx.NEW_YEAR_AI_SECTIONS_V1, ...ctx.NEW_YEAR_AI_SECTIONS_V2];
  for (const section of ctx.NEW_YEAR_AI_SECTIONS) for (const repairLines of [[], ['내용 보강']]) {
    const result = await ctx.generateConsultationSection({}, { section, repairLines, timeoutMs: ctx.NEW_YEAR_AI_SECTION_TIMEOUT_MS });
    assert.equal(result.ok, true);
    const options = calls.at(-1);
    assert.ok(options.maxOutputTokens >= Math.ceil((section.maxChars + 1500) * 1.5) + 1500);
    assert.equal(options.timeoutMs, 52000);
    assert.ok(options.fallbackMinChars >= 300 && options.fallbackMinChars <= section.minChars * 0.8);
  }
  assert.equal(calls.length, ctx.NEW_YEAR_AI_SECTIONS.length * 2);
});
function p3Body(key, size) { return key + Array.from({ length: size - key.length }, (_, i) => String.fromCharCode(0xac00 + i % 11172)).join(''); }
for (const repair of ['shorter', 'empty', 'truncated', 'repeat']) test(`P3 short draft survives ${repair} reinforcement and completes above total floor`, async () => {
  const f = fixture(), ctx = f.ctx;
  await f.post();
  const saved = ctx.NEW_YEAR_AI_SECTIONS.map((section, i) => ({ key: section.key, section, ok: true, text: p3Body(section.key, i === 0 ? 1000 : 5000) }));
  f.doc.llmMeta.savedSections = clone(saved); f.doc.llmMeta.attempts = { overview: 1 };
  ctx.generateConsultationSection = async (_env, { section }) => ({ key: section.key, section, ok: repair !== 'empty', truncated: repair === 'truncated',
    text: repair === 'empty' ? '' : repair === 'repeat' ? saved[1].text : p3Body(section.key, 900) });
  const response = await f.post(); assert.equal(response.status, 200, await response.text());
  assert.equal(f.doc.llmMeta.savedSections[0].text, saved[0].text);
  assert.equal(f.doc.llmMeta.attempts.overview, 1); assert.equal(f.doc.llmMeta.attempts['overview:lengthRepair'], undefined);
  assert.equal(f.charges, 1); assert.equal(f.refunds, 0);
});
test('P3 last short attempt is accepted without another provider call', async () => {
  const f = fixture();
  const savedSections = f.ctx.NEW_YEAR_AI_SECTIONS.map((section, i) => ({ key: section.key, section, ok: true, text: p3Body(section.key, i ? 5000 : 1000) }));
  const result = await f.ctx.generateNewYearWave({}, {}, {}, { savedSections, attempts: { overview: 3 }, deadlineAt: Date.now(), onReserve: () => assert.fail('extra call') });
  assert.equal(result.complete, true);
});
test('P3 total under 20,000 stays partial after every section exhausts its budget', async () => {
  const f = fixture(); await f.post();
  f.doc.llmMeta.savedSections = f.ctx.NEW_YEAR_AI_SECTIONS.map(section => ({ key: section.key, section, ok: true, text: p3Body(section.key, 3999) }));
  f.doc.llmMeta.attempts = Object.fromEntries(f.ctx.NEW_YEAR_AI_SECTIONS.map(section => [section.key, 3]));
  const response = await f.post(); assert.equal(response.status, 200);
  assert.equal(f.calls, 1); assert.equal(f.charges, 1); assert.equal(f.refunds, 0);
});
test('P3 lost repair checkpoint does not spend another attempt when the preserved total is enough', async () => {
  const f = fixture(); await f.post();
  f.doc.llmMeta.savedSections = f.ctx.NEW_YEAR_AI_SECTIONS.map((section, i) => ({ key: section.key, section, ok: true, text: p3Body(section.key, i ? 5000 : 1000) }));
  f.doc.llmMeta.attempts = { overview: 1 }; f.fault('completed');
  assert.equal((await f.post()).status, 503); const calls = f.calls;
  assert.equal(f.doc.llmMeta.attempts.overview, 1);
  assert.equal((await f.post()).status, 200); assert.equal(f.calls, calls); assert.equal(f.refunds, 0);
});

// F17 분량 보강(V2): 짧아도 통과한 장은 배달하고, 보강은 가장 짧은 장부터 세션 2회까지만 한다.
function v2PlanFromSource() {
  const ast = ts.createSourceFile('new-year-ai.js', fs.readFileSync('worker/routes/new-year-ai.js', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const declaration = ast.statements.filter(ts.isVariableStatement).flatMap(row => [...row.declarationList.declarations])
    .find(row => row.name.getText(ast) === 'NEW_YEAR_AI_SECTIONS_V2');
  return vm.runInNewContext(declaration.initializer.getText(ast));
}
async function v2ShortFixture(sizes, generate) {
  const sections = v2PlanFromSource();
  const f = fixture('paid', sections); await f.post();
  f.doc.llmMeta.savedSections = sections.map((section, i) => ({ key: section.key, section, ok: true, text: p3Body(section.key, sizes[i]) }));
  f.doc.llmMeta.attempts = {};
  let boosts = 0;
  f.ctx.generateConsultationSection = async (_env, options) => { boosts++; return generate(options); };
  return { f, sections, get boosts() { return boosts; } };
}
test('F17 V2 short sections get at most two length boosts, shortest first, then deliver', async () => {
  const sizes = [5000, 5000, 1200, 1500, 1800, 5000, 5000];
  const run = await v2ShortFixture(sizes, ({ section, repairLines }) => {
    assert.match(repairLines.join('\n'), /최소 6,000자 이상/);
    return { key: section.key, section, ok: true, truncated: false, text: p3Body(section.key, 6000) };
  });
  assert.equal((await run.f.post()).status, 202);
  assert.equal(run.f.doc.status, 'partial');
  const response = await run.f.post(); assert.equal(response.status, 200, await response.text());
  assert.equal(run.boosts, 2);
  assert.equal(run.f.doc.status, 'completed');
  assert.equal(run.f.doc.llmMeta.attempts['money:lengthBoost'], 1);
  assert.equal(run.f.doc.llmMeta.attempts['career:lengthBoost'], 1);
  assert.equal(run.f.doc.llmMeta.attempts['romance:lengthBoost'], undefined);
  const chars = key => run.f.doc.llmMeta.savedSections.find(row => row.key === key).text.length;
  assert.equal(chars('money'), 6000); assert.equal(chars('career'), 6000); assert.equal(chars('romance'), 1800);
  assert.equal((await run.f.post()).status, 200); assert.equal(run.boosts, 2);
  assert.equal(run.f.charges, 1); assert.equal(run.f.refunds, 0);
});
for (const outcome of ['shorter', 'provider-failure']) test(`F17 V2 length boost ${outcome} keeps the accepted draft and still delivers`, async () => {
  const run = await v2ShortFixture([5000, 5000, 1200, 5000, 5000, 5000, 5000], ({ section }) => outcome === 'shorter'
    ? { key: section.key, section, ok: true, text: p3Body(section.key, 900) }
    : { key: section.key, section, ok: false, text: '', failure: { code: 'LLM_PROVIDER_UNAVAILABLE', status: 503, retryable: true, message: 'Provider request failed.' } });
  const response = await run.f.post(); assert.equal(response.status, 200, await response.text());
  assert.equal(run.boosts, 1);
  assert.equal(run.f.doc.llmMeta.savedSections.find(row => row.key === 'money').text.length, 1200);
  assert.equal(run.f.charges, 1); assert.equal(run.f.refunds, 0);
});
test('F17 V1 plans never take a length boost and deliver short sections as they are', async () => {
  const f = fixture(); await f.post();
  f.doc.llmMeta.savedSections = f.ctx.NEW_YEAR_AI_SECTIONS.map(section => ({ key: section.key, section, ok: true, text: p3Body(section.key, 1500) }));
  f.doc.llmMeta.attempts = {};
  f.ctx.generateConsultationSection = async () => assert.fail('no boost on V1');
  const response = await f.post(); assert.equal(response.status, 200, await response.text());
  assert.equal(f.charges, 1);
});

for (const accessType of ['pass', 'subscription', 'paid']) test(accessType + ': 현재 6개 분야를 원래 요청으로 생성·저장하고 재열람은 추가 차감하지 않는다', async () => {
  const source = fs.readFileSync('worker/routes/new-year-ai.js', 'utf8');
  const ast = ts.createSourceFile('new-year-ai.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let declaration;
  for (const statement of ast.statements) if (ts.isVariableStatement(statement)) {
    declaration ||= statement.declarationList.declarations.find(row => row.name.getText(ast) === 'NEW_YEAR_AI_SECTIONS_V2');
  }
  assert.ok(declaration);
  const sections = vm.runInNewContext(declaration.initializer.getText(ast));
  assert.equal(sections.length, 7);
  assert.equal(sections[0].key, 'nature');
  const f = fixture(accessType, sections);
  for (let i = 0; i < sections.length; i++) {
    const response = await f.post(i ? { resumeSessionId: f.doc.id } : {});
    assert.equal(response.status, i === sections.length - 1 ? 200 : 202, await response.text());
    assert.equal(f.calls, i + 1);
    assert.equal(f.charges, i === sections.length - 1 ? 1 : 0);
  }
  assert.deepEqual(Array.from(f.doc.llmMeta.sections, row => row.key), Array.from(sections, row => row.key));
  assert.equal(f.doc.llmMeta.sectionPlanVersion, 2);
  assert.equal(f.doc.idempotencyKey, 'original-paid-request');
  assert.equal((await f.post()).status, 200);
  assert.equal(f.calls, 7);
  assert.equal(f.charges, 1);
  assert.equal(f.refunds, 0);
});

test('대기 화면 진행 단계는 서버 생성 섹션과 같은 순서·같은 수다', () => {
  const declarations = (file, kind, names) => {
    const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, kind);
    return names.map(name => {
      const row = ast.statements.filter(ts.isVariableStatement).flatMap(statement => [...statement.declarationList.declarations]).find(node => node.name.getText(ast) === name);
      assert.ok(row, name);
      return `var ${row.getText(ast)};`;
    }).join('\n');
  };
  const ctx = vm.createContext({});
  vm.runInContext(ts.transpileModule(declarations('app/new-year-ai-consultation/_lib/answer-sections.ts', ts.ScriptKind.TS, ['DOMAIN_CARDS', 'MONTHLY_CHAPTER', 'READING_STEP_KEYS', 'READING_STEPS', 'READING_SECTION_TOTAL']), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
  vm.runInContext(declarations('worker/routes/new-year-ai.js', ts.ScriptKind.JS, ['NEW_YEAR_AI_SECTIONS_V2']), ctx);
  assert.deepEqual(ctx.READING_STEPS.map(step => step.key), ctx.NEW_YEAR_AI_SECTIONS_V2.map(section => section.key));
  assert.equal(ctx.READING_SECTION_TOTAL, ctx.NEW_YEAR_AI_SECTIONS_V2.length);
  const source = fs.readFileSync('app/new-year-ai-consultation/NewYearAiClient.tsx', 'utf8');
  assert.doesNotMatch(source, /progress\?\.total \|\| \d/);
  assert.doesNotMatch(source, /DOMAIN_CARDS\.length\}개 분야/);
});

for (const locale of AI_OUTPUT_LOCALES) test(`${locale}: resumes in the purchased language after the UI changes`, async () => {
  const f = fixture();
  const languages = [];
  const original = f.ctx.generateConsultationText;
  f.ctx.generateConsultationText = (...args) => { languages.push(getAmbientAiLocale()); return original(...args); };
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

test('new-year actual major luck survives mock partial persistence and OFF resume', async () => {
 const f=fixture('paid');const helper=await import('../../worker/lib/representative-consumer-facts.js');Object.assign(f.ctx,helper);
 const {calculateLifeBookAiSaju}=await import('../../worker/lib/life-book-ai-saju.js');
 const birth={birthDate:'2000-05-15',birthTime:'08:30',calendarType:'solar',gender:'male'};const actual=calculateLifeBookAiSaju(birth,{year:2026});
 f.ctx.normalizeConsultationInput=()=>({ok:true,inputHash:'same-input',input:{birthInfo:birth,year:2026,topic:'신년'}});
 f.ctx.calculateNewYearFortuneData=()=>({targetYear:{year:2026},saju:actual,calculationMeta:actual.calculationMeta,advancedSajuSummary:{daewoonSewoon:{}}});
 await f.post({}, {SAJU_CONSUMER_FACTS_V1:'true'});assert.ok(f.doc.llmMeta.fortuneData.consumerFactIdentity);
 const saved=clone(f.doc.llmMeta.fortuneData);assert.deepEqual(saved.majorLuck,clone(actual.majorLuck));f.ctx.calculateNewYearFortuneData=()=>{throw Error('RECALC_BLOCKED')};
 for(let i=0;i<20&&f.doc.status!=='completed';i++)await f.post({resumeSessionId:f.doc.id});
 assert.equal(f.doc.status,'completed');assert.deepEqual(f.doc.llmMeta.fortuneData,saved);assert.equal(f.charges,1);
});

// 2026-11 장애: Mongo 는 undefined 필드를 null 로 저장해 이어쓰기마다 사실 고정 불일치 500 이 났다(1장만 전달).
test('new-year resume survives Mongo null storage for v2 pins and recomputed legacy v1 pins', async () => {
 const helper=await import('../../worker/lib/representative-consumer-facts.js');const {engineFactDigest}=await import('../../worker/lib/engine-fact-snapshot.js');
 const {calculateLifeBookAiSaju}=await import('../../worker/lib/life-book-ai-saju.js');
 const birth={birthDate:'2000-05-15',birthTime:'08:30',calendarType:'solar',gender:'male'};const actual=calculateLifeBookAiSaju(birth,{year:2026});
 const mongo=value=>JSON.parse(JSON.stringify(value,(_k,v)=>v===undefined?null:v));
 const facts=()=>({targetYear:{year:2026},saju:actual,calculationMeta:actual.calculationMeta,advancedSajuSummary:{daewoonSewoon:{}},prevention:{candidates:[{period:{start:undefined,end:undefined}}]}});
 for(const legacy of [false,true]){
  const f=fixture('paid');Object.assign(f.ctx,helper);
  f.ctx.normalizeConsultationInput=()=>({ok:true,inputHash:'same-input',input:{birthInfo:birth,year:2026,topic:'신년'}});
  f.ctx.calculateNewYearFortuneData=facts;
  await f.post({}, {SAJU_CONSUMER_FACTS_V1:'true'});
  if(legacy){const {consumerFactIdentity:_p,...raw}=f.doc.llmMeta.fortuneData;f.doc.llmMeta.fortuneData={...raw,consumerFactIdentity:{version:'representative-facts-v1',kind:'new-year',digest:engineFactDigest(raw)}};}
  f.doc.llmMeta.fortuneData=mongo(f.doc.llmMeta.fortuneData);
  const first=(await f.post({resumeSessionId:f.doc.id})).status;assert.notEqual(first,500,'legacy='+legacy);
  for(let i=0;i<20&&f.doc.status!=='completed';i++)await f.post({resumeSessionId:f.doc.id});
  assert.equal(f.doc.status,'completed','legacy='+legacy);assert.equal(f.charges,1);
 }
});

// 신살 블록(SAJU_SHINSAL_FACTS_V1 'new-year'): 새 기록만 llmMeta.shinsalFacts 로 고정하고, 핀과 플래그가 모두 맞을 때만 생성에 넘긴다.
// 블록은 fortuneData 밖에서 계산하므로 이어쓰기·플래그 전환에도 사실 고정(REPRESENTATIVE_FACTS_MISMATCH)이 어긋나지 않는다.
test('new-year shinsal block pins only new records and keeps the fact pin through resume', async () => {
 const helper=await import('../../worker/lib/representative-consumer-facts.js');const {calculateLifeBookAiSaju}=await import('../../worker/lib/life-book-ai-saju.js');
 const birth={birthDate:'2000-05-15',birthTime:'08:30',calendarType:'solar',gender:'male'};const actual=calculateLifeBookAiSaju(birth,{year:2026});
 const ON={SAJU_CONSUMER_FACTS_V1:'true',SAJU_SHINSAL_FACTS_V1:'new-year'},OFF={SAJU_CONSUMER_FACTS_V1:'true'};
 const run=async(createEnv,resumeEnv)=>{
  const f=fixture('paid');Object.assign(f.ctx,helper);const seen=[];const generate=f.ctx.generateConsultationSection;
  f.ctx.generateConsultationSection=async(env,options)=>{seen.push(options.shinsalFacts);return generate(env,options);};
  f.ctx.normalizeConsultationInput=()=>({ok:true,inputHash:'same-input',input:{birthInfo:birth,year:2026,topic:'신년'}});
  f.ctx.calculateNewYearFortuneData=()=>({targetYear:{year:2026,pillar:'병오'},saju:actual,calculationMeta:actual.calculationMeta,advancedSajuSummary:{daewoonSewoon:{}}});
  await f.post({},createEnv);const created=seen.length;const saved=clone(f.doc.llmMeta.fortuneData);
  for(let i=0;i<20&&f.doc.status!=='completed';i++)assert.notEqual((await f.post({resumeSessionId:f.doc.id},resumeEnv)).status,500);
  assert.equal(f.doc.status,'completed');assert.deepEqual(f.doc.llmMeta.fortuneData,saved);assert.equal(f.charges,1);
  return {pin:f.doc.llmMeta.shinsalFacts,seen,created,block:f.ctx.newYearShinsalBlock(saved)};
 };
 const pinned=await run(ON,ON);
 assert.equal(pinned.pin,'shinsal-facts-v1');assert.match(pinned.block,/^\[신살 계산값 — 서버 계산/);assert.ok(pinned.seen.length>pinned.created);
 for(const value of pinned.seen)assert.equal(value,pinned.block);
 const legacy=await run(OFF,ON);
 assert.equal(legacy.pin,undefined);for(const value of legacy.seen)assert.equal(value,'');
 const killed=await run(ON,OFF);
 assert.equal(killed.pin,'shinsal-facts-v1');assert.deepEqual(killed.seen.slice(0,killed.created).map(Boolean),Array(killed.created).fill(true));
 for(const value of killed.seen.slice(killed.created))assert.equal(value,'');
});

// 액땜(SAJU_REMEDY_FACTS_V1 'new-year'): 새 기록만 llmMeta.remedyFacts 로 고정하고 카드(remedyCases)는 생성 시작 때 한 번 저장한다.
// 블록은 fortuneData 밖에서 다시 계산하므로 이어쓰기·다시 시도·플래그 전환에도 409·REPRESENTATIVE_FACTS_MISMATCH 가 나지 않는다.
test('new-year remedy block pins only new records, stores cards once, and survives resume, retry and the kill switch', async () => {
 const helper=await import('../../worker/lib/representative-consumer-facts.js');const {calculateLifeBookAiSaju}=await import('../../worker/lib/life-book-ai-saju.js');
 const birth={birthDate:'2000-05-15',birthTime:'08:30',calendarType:'solar',gender:'male'};const actual=calculateLifeBookAiSaju(birth,{year:2026});
 const ON={SAJU_CONSUMER_FACTS_V1:'true',SAJU_REMEDY_FACTS_V1:'new-year'},OFF={SAJU_CONSUMER_FACTS_V1:'true'};
 const run=async(createEnv,resumeEnv,{retry=false}={})=>{
  const f=fixture(retry?'pass':'paid');Object.assign(f.ctx,helper);const seen=[],statuses=[];const generate=f.ctx.generateConsultationSection;let broken=retry;
  f.ctx.generateConsultationSection=async(env,options)=>{seen.push(options.remedyFacts);
   return options.section.key==='romance'&&broken?{key:'romance',ok:false,text:'',failure:{status:400,retryable:false,message:'Provider rejected.'}}:generate(env,options);};
  f.ctx.normalizeConsultationInput=()=>({ok:true,inputHash:'same-input',input:{birthInfo:birth,year:2026,topic:'신년'}});
  f.ctx.calculateNewYearFortuneData=()=>({targetYear:{year:2026,pillar:'병오'},saju:actual,calculationMeta:actual.calculationMeta,advancedSajuSummary:{daewoonSewoon:{}}});
  statuses.push((await f.post({},createEnv)).status);const created=seen.length;const saved=clone(f.doc.llmMeta.fortuneData);const cards=clone(f.doc.remedyCases);
  if(retry){
   for(let i=0;i<12&&f.doc.status!=='generation_failed';i++)statuses.push((await f.post({resumeSessionId:f.doc.id},resumeEnv)).status);
   assert.ok(retryOpen(f.doc));broken=false;
   const retried=await f.ctx.handleRetry(new Request('https://mock.test/api/new-year-ai/retry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:f.doc.id})}),resumeEnv);
   assert.ok([200,202].includes(retried.status),await retried.text());
  }
  for(let i=0;i<20&&f.doc.status!=='completed';i++)statuses.push((await f.post({resumeSessionId:f.doc.id},resumeEnv)).status);
  for(const status of statuses)assert.ok(![409,500].includes(status),'status '+status);
  assert.equal(f.doc.status,'completed');assert.deepEqual(f.doc.llmMeta.fortuneData,saved);assert.equal(f.charges,1);assert.equal(f.refunds,0);
  assert.notEqual(f.doc.generationError?.code,'REPRESENTATIVE_FACTS_MISMATCH');
  assert.deepEqual(f.doc.remedyCases,cards);
  return {pin:f.doc.llmMeta.remedyFacts,seen,created,cards,block:f.ctx.newYearRemedyBlock(saved),expected:f.ctx.newYearRemedyCases(saved)};
 };
 const pinned=await run(ON,ON);
 assert.equal(pinned.pin,'remedy-facts-v1');assert.ok(pinned.block.startsWith('[액땜 방법 — 서버 계산'));assert.ok(pinned.block.length<=600);
 assert.equal(pinned.cards?.valid,true);assert.deepEqual(pinned.cards,pinned.expected);assert.ok(pinned.seen.length>pinned.created);
 for(const value of pinned.seen)assert.equal(value,pinned.block);
 const legacy=await run(OFF,ON);
 assert.equal(legacy.pin,undefined);assert.equal(legacy.cards,undefined);for(const value of legacy.seen)assert.equal(value,'');
 const killed=await run(ON,OFF);
 assert.equal(killed.pin,'remedy-facts-v1');assert.deepEqual(killed.cards,pinned.cards);
 assert.deepEqual(killed.seen.slice(0,killed.created).map(Boolean),Array(killed.created).fill(true));
 for(const value of killed.seen.slice(killed.created))assert.equal(value,'');
 const emptied=await run({...ON,SAJU_REMEDY_FACTS_V1:''},ON);
 assert.equal(emptied.pin,undefined);assert.equal(emptied.cards,undefined);for(const value of emptied.seen)assert.equal(value,'');
 const retried=await run(ON,ON,{retry:true});
 assert.equal(retried.pin,'remedy-facts-v1');assert.deepEqual(retried.cards,pinned.cards);for(const value of retried.seen)assert.equal(value,pinned.block);
});

// ── 결제 뒤 신년 생성 화면: 일시 장애·숨은 탭·긴 생성에서 멈추지 않고, 종결 실패면 환불 안내 ──
const NY_CLIENT = 'app/new-year-ai-consultation/NewYearAiClient.tsx';
// 파일에서 이름으로 최상위 함수·상수와 컴포넌트 안 useCallback 본문을 꺼내 `var 이름 = …` 으로 싣는다.
function newYearSource(file, names) {
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found = new Map();
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name && names.includes(node.name.text) && !found.has(node.name.text)) found.set(node.name.text, node.getText(ast).replace(/^export\s+/, ''));
    else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && names.includes(node.name.text) && node.initializer && !found.has(node.name.text)) {
      const init = node.initializer;
      const body = ts.isCallExpression(init) && init.expression.getText(ast) === 'useCallback' ? init.arguments[0] : init;
      found.set(node.name.text, `var ${node.name.text} = ${body.getText(ast)};`);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  for (const name of names) assert.ok(found.has(name), name);
  return ts.transpileModule(names.map(name => found.get(name)).join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}
const POLLING_SOURCE = () => newYearSource('app/_lib/consultationResultPolling.ts', ['RETRYABLE_POLL_REASONS', 'isRetriableResultPollFailure']);
const NY_COPY = ['SERVER_ERROR_MESSAGE', 'LLM_ERROR_MESSAGE', 'NEW_YEAR_PAUSED_NOTICE', 'NEW_YEAR_SLOW_NOTICE', 'NEW_YEAR_STALLED_MESSAGE', 'NEW_YEAR_REFUND_NOTICE', 'NEW_YEAR_PAID_NOTICE', 'newYearRefundNotice',
  'NEW_YEAR_RETRY_MESSAGE', 'NEW_YEAR_RETRY_STARTED_NOTICE', 'NEW_YEAR_RETRY_FAILED_MESSAGE', 'NEW_YEAR_REFUND_REQUESTED_MESSAGE', 'NEW_YEAR_REFUNDED_MESSAGE', 'NEW_YEAR_REFUND_REQUEST_FAILED_MESSAGE', 'newYearRetryOffer'];
const friendly = (caught, fallback) => caught && /[가-힣]/.test(caught.message || '') ? caught.message : fallback;
function trail() {
  const log = { status: [], notice: [], error: [], retryOffer: [], events: [], requests: [], scheduled: 0, remembered: [] };
  const last = key => log[key][log[key].length - 1];
  const setter = key => value => { const next = typeof value === 'function' ? value(last(key)) : value; log[key].push(next); log.events.push(`${key}:${next}`); };
  return { log, last, setStatus: setter('status'), setNotice: setter('notice'), setError: setter('error'), setRetryOffer: setter('retryOffer') };
}
function newYearStart({ responses, hidden = () => false, poll } = {}) {
  const t = trail(), pendingGenerationRef = { current: null };
  const ctx = vm.createContext({
    document: { get hidden() { return hidden(t.log); } },
    captureDeliveryScope: () => () => true, READING_SECTION_TOTAL: 6, pendingGenerationRef,
    autoResumeRef: { current: { timer: 0, rounds: 0, best: 0 } }, window: { clearTimeout() {} },
    setStatus: t.setStatus, setNotice: t.setNotice, setError: t.setError, setRetryOffer: t.setRetryOffer,
    applyResult: result => { t.setNotice(''); t.setError(''); t.setStatus(result.status && result.status !== 'completed' ? 'reading' : 'ready'); },
    sleep: async () => {}, rememberNewYearSession: id => t.log.remembered.push(id),
    scheduleAutoResume: () => { t.log.scheduled += 1; t.setStatus('reading'); return false; },
    pollNewYearResult: poll || (async () => { throw new Error('unexpected poll'); }),
    postJson: async (path, payload, key) => {
      t.log.requests.push({ path, payload, key }); t.log.events.push('post');
      const next = responses.shift(); assert.ok(next, 'unexpected request');
      if (next instanceof Error) throw next;
      return { response: { status: next.status, ok: next.status >= 200 && next.status < 300 }, payload: next.body };
    },
  });
  vm.runInContext(POLLING_SOURCE() + newYearSource(NY_CLIENT, [...NY_COPY, 'startConsultation']), ctx);
  return { ctx, ...t, pendingGenerationRef, run: () => ctx.startConsultation({ birth: 'original' }, 'paid-request', { billingGate: { receipt: 'paid' } }) };
}
const partial = (completed = 1) => ({ status: 202, body: { ok: true, status: 'partial', sessionId: 'ny-1', progress: { completed, total: 6 } } });
const completedResult = { status: 200, body: { ok: true, status: 'completed', saved: true, sessionId: 'ny-1' } };

test('신년 결제 뒤 18번을 넘겨도 생성 화면을 멈추지 않고 같은 상담 자동 이어쓰기로 넘긴다', async () => {
  const h = newYearStart({ responses: Array.from({ length: 18 }, (_, i) => partial(Math.min(i, 5))) });
  assert.equal(await h.run(), false);
  assert.equal(h.log.scheduled, 1);
  assert.ok(!h.log.status.includes('ready'));
  assert.equal(h.last('status'), 'reading');
  assert.equal(h.pendingGenerationRef.current.payload.resumeSessionId, 'ny-1');
  assert.equal(h.pendingGenerationRef.current.key, 'paid-request');
});
test('신년 결제 뒤 일시 503 이 이어져도 오류로 끝내지 않고 저장된 상담을 자동으로 이어 간다', async () => {
  const busy = { status: 503, body: { ok: false, reason: 'LLM_PROVIDER_UNAVAILABLE', retryable: true, sessionId: 'ny-1' } };
  const h = newYearStart({ responses: [busy, busy, busy] });
  assert.equal(await h.run(), false);
  assert.equal(h.log.requests.length, 3);
  assert.equal(h.log.scheduled, 1);
  assert.ok(!h.log.status.includes('error'));
  assert.deepEqual([...new Set(h.log.remembered)], ['ny-1']);
  assert.equal(h.pendingGenerationRef.current.payload.resumeSessionId, 'ny-1');
});
test('신년 결제 뒤 네트워크가 연달아 끊겨도 예외로 끝내지 않고 자동 이어쓰기를 건다', async () => {
  const h = newYearStart({ responses: [new Error('Failed to fetch'), new Error('Failed to fetch'), new Error('Failed to fetch')] });
  assert.equal(await h.run(), false);
  assert.equal(h.log.scheduled, 1);
  assert.equal(h.pendingGenerationRef.current.access.billingGate.receipt, 'paid');
});
test('신년 생성 중 탭이 숨으면 생성 화면을 유지한 채 멈추고 복귀 때 이어 쓸 상담을 주소에 남긴다', async () => {
  const h = newYearStart({ responses: [partial(2)], hidden: log => log.requests.length >= 1 });
  assert.equal(await h.run(), false);
  assert.equal(h.log.requests.length, 1);
  assert.ok(!h.log.status.includes('ready'));
  assert.equal(h.last('status'), 'reading');
  assert.equal(h.last('notice'), vm.runInContext('NEW_YEAR_PAUSED_NOTICE', h.ctx));
  assert.ok(h.log.remembered.includes('ny-1'));
});
test('신년 결제 직후 상담이 아직 없으면 탭이 숨어 있어도 시작 요청은 보낸다', async () => {
  const h = newYearStart({ responses: [completedResult], hidden: () => true });
  assert.equal(await h.run(), true);
  assert.equal(h.log.requests.length, 1);
});
test('신년 생성 대기 조회가 실패해도 같은 상담 시작을 다시 불러 서버 상태를 이어받는다', async () => {
  const h = newYearStart({ responses: [{ status: 202, body: { ok: true, status: 'generating', sessionId: 'ny-1' } }, completedResult], poll: async () => { throw new Error('상담 생성이 평소보다 오래 걸리고 있어요'); } });
  assert.equal(await h.run(), true);
  assert.equal(h.log.requests.length, 2);
  assert.equal(h.log.requests[1].payload.resumeSessionId, 'ny-1');
  assert.equal(h.pendingGenerationRef.current, null);
});

function newYearScheduler() {
  const t = trail(), timers = [];
  let fired = 0;
  const ctx = vm.createContext({
    autoResumeRef: { current: { timer: 0, rounds: 0, best: 0 } }, resumeGenerationRef: { current: () => { fired += 1; } },
    window: { setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearTimeout() {} },
    setStatus: t.setStatus, setNotice: t.setNotice, setError: t.setError,
  });
  vm.runInContext(newYearSource(NY_CLIENT, [...NY_COPY, 'NEW_YEAR_AUTO_RESUME_ROUNDS', 'NEW_YEAR_AUTO_RESUME_DELAY_MS', 'scheduleAutoResume']), ctx);
  return { ctx, ...t, timers, fired: () => fired };
}
test('신년 자동 이어쓰기는 간격을 늘려 몇 번 더 잇고, 한도를 넘으면 저장 보존 안내와 다시 시도 버튼으로 바꾼다', () => {
  const h = newYearScheduler();
  const rounds = vm.runInContext('NEW_YEAR_AUTO_RESUME_ROUNDS', h.ctx);
  for (let i = 0; i < rounds; i += 1) { assert.equal(h.ctx.scheduleAutoResume(), false); assert.equal(h.last('status'), 'reading'); }
  assert.equal(h.timers.length, rounds);
  assert.ok(h.timers.every((row, i) => i === 0 || row.ms > h.timers[i - 1].ms));
  assert.equal(h.last('notice'), vm.runInContext('NEW_YEAR_SLOW_NOTICE', h.ctx));
  h.timers[0].fn(); assert.equal(h.fired(), 1);
  assert.equal(h.ctx.scheduleAutoResume(), false);
  assert.equal(h.timers.length, rounds);
  assert.equal(h.last('status'), 'error');
  assert.equal(h.last('error'), vm.runInContext('NEW_YEAR_STALLED_MESSAGE', h.ctx));
  assert.match(h.last('error'), /다시 결제되지 않/);
});

function newYearLoad({ status, body, pending = null, before = 'reading' }) {
  const t = trail(), starts = [];
  t.setStatus(before);
  const ctx = vm.createContext({
    startLockRef: { current: false }, resultLoadScopeRef: { current: null }, captureDeliveryScope: () => () => true,
    idempotencyKeyRef: { current: 'paid-request' }, pendingGenerationRef: { current: pending },
    authFetch: async () => ({ status, ok: status >= 200 && status < 300, json: async () => body }),
    applyResult: () => {}, startConsultation: async (...args) => { starts.push(args); return true; },
    setStatus: t.setStatus, setNotice: t.setNotice, setError: t.setError, setRetryOffer: t.setRetryOffer, friendlyErrorMessage: friendly,
    scheduleAutoResume: () => { t.log.scheduled += 1; return false; },
  });
  vm.runInContext(POLLING_SOURCE() + newYearSource(NY_CLIENT, [...NY_COPY, 'loadSession']), ctx);
  return { ctx, ...t, starts, run: () => ctx.loadSession('ny-1') };
}
test('신년 생성 상태 조회가 일시 장애면 진행 중 상담을 자동 이어쓰기로 넘긴다', async () => {
  const h = newYearLoad({ status: 503, body: { ok: false, reason: 'DB_DEGRADED', retryable: true }, pending: { payload: { resumeSessionId: 'ny-1' }, key: 'paid-request', access: {} } });
  assert.equal(await h.run(), false);
  assert.equal(h.log.scheduled, 1);
  assert.ok(!h.log.status.includes('error'));
});
test('신년 생성 상태 조회가 확정 실패하면 생성 중 스피너에 묶어 두지 않는다', async () => {
  const h = newYearLoad({ status: 404, body: { ok: false, reason: 'NOT_FOUND', message: '상담을 찾지 못했어요.' } });
  assert.equal(await h.run(), false);
  assert.equal(h.last('status'), 'error');
  assert.equal(h.last('error'), '상담을 찾지 못했어요.');
  assert.equal(h.log.scheduled, 0);
});

// 종결 실패(생성 실패로 닫힘·환불 진행·환불 완료)는 자동 이어쓰기 대신 자동 환불 안내로 끝낸다.
const terminalCases = [
  ['생성 실패(LLM_ERROR 503)', { status: 503, body: { ok: false, reason: 'LLM_ERROR', message: '권한은 보존되었으니 다시 시도해 주세요.' } }, 'notice'],
  ['이미 실패로 닫힌 상담(GENERATION_FAILED 409)', { status: 409, body: { ok: false, reason: 'GENERATION_FAILED', message: '권한은 보존되었으니 다시 시도해 주세요.' } }, 'notice'],
  ['환불 진행(REFUND_PENDING 409)', { status: 409, body: { ok: false, reason: 'REFUND_PENDING', refundStatus: 'pending', retryable: true, message: '환불을 진행하고 있어요.' } }, '환불을 진행하고 있어요.'],
  ['환불 완료(PAYMENT_REFUNDED 403)', { status: 403, body: { ok: false, reason: 'PAYMENT_REFUNDED', refundStatus: 'refunded', retryable: false, message: '결제가 환불됐어요.' } }, '결제가 환불됐어요.'],
];
for (const [label, response, expected] of terminalCases) {
  test(`신년 결제 생성이 종결 실패면 자동 환불 안내로 끝낸다: ${label}`, async () => {
    const h = newYearStart({ responses: [response] });
    assert.equal(await h.run(), false);
    assert.equal(h.log.requests.length, 1);
    assert.equal(h.log.scheduled, 0);
    assert.equal(h.last('status'), 'error');
    assert.equal(h.last('error'), expected === 'notice' ? vm.runInContext('NEW_YEAR_REFUND_NOTICE', h.ctx) : expected);
    assert.equal(h.pendingGenerationRef.current, null);
  });
  test(`신년 상담을 다시 열었을 때 종결 실패면 이어 쓰지 않고 환불 안내를 보인다: ${label}`, async () => {
    const h = newYearLoad({ status: response.status, body: response.body, pending: { payload: { resumeSessionId: 'ny-1' }, key: 'paid-request', access: {} } });
    assert.equal(await h.run(), false);
    assert.equal(h.starts.length, 0);
    assert.equal(h.log.scheduled, 0);
    assert.equal(h.last('status'), 'error');
    assert.equal(h.last('error'), expected === 'notice' ? vm.runInContext('NEW_YEAR_REFUND_NOTICE', h.ctx) : expected);
    assert.equal(h.ctx.pendingGenerationRef.current, null);
  });
}
// 2026-11-19 다시 시도 우선(R4): 서버가 무료 다시 시도를 열면 환불 안내 대신 다시 시도 안내와 버튼(retryOffer)을 보인다.
const retryFailure = { status: 503, body: { ok: false, reason: 'LLM_ERROR', message: '권한은 보존되었으니 다시 시도해 주세요.', sessionId: 'ny-1', refunded: false, retry: { available: true, refundAt: '2026-11-26T00:00:00.000Z', sessionId: 'ny-1' } } };
test('R4: 신년 결제 생성이 다시 시도 가능 실패면 환불 안내 대신 무료 다시 시도를 연다', async () => {
  const h = newYearStart({ responses: [retryFailure] });
  assert.equal(await h.run(), false);
  assert.equal(h.log.requests.length, 1); assert.equal(h.log.scheduled, 0);
  assert.equal(h.last('status'), 'error');
  assert.equal(h.last('error'), vm.runInContext('NEW_YEAR_RETRY_MESSAGE', h.ctx));
  assert.match(h.last('error'), /추가 결제·차감은 없어요/);
  assert.equal(h.last('retryOffer'), 'ny-1'); assert.equal(h.pendingGenerationRef.current, null);
});
test('R4: 신년 상담을 다시 열었을 때 다시 시도 가능 실패면 다시 시도 버튼을 연다', async () => {
  const h = newYearLoad({ status: 409, body: { ...retryFailure.body, reason: 'GENERATION_FAILED' } });
  assert.equal(await h.run(), false);
  assert.equal(h.starts.length, 0);
  assert.equal(h.last('error'), vm.runInContext('NEW_YEAR_RETRY_MESSAGE', h.ctx));
  assert.equal(h.last('retryOffer'), 'ny-1');
});
function newYearRetryHandlers(responses, offer = 'ny-1') {
  const t = trail(), starts = [], busy = [], refundNotice = [];
  const ctx = vm.createContext({
    retryOffer: offer, retryBusy: false, startLockRef: { current: false }, idempotencyKeyRef: { current: 'paid-request' },
    captureDeliveryScope: () => () => true, friendlyErrorMessage: friendly,
    setStatus: t.setStatus, setNotice: t.setNotice, setError: t.setError, setRetryOffer: t.setRetryOffer,
    setRetryBusy: value => busy.push(value), setRefundRequestNotice: value => refundNotice.push(value),
    startConsultation: async (...args) => { starts.push(args); return true; },
    postJson: async (path, payload, key) => {
      t.log.requests.push({ path, payload, key });
      const next = responses.shift(); assert.ok(next, 'unexpected request');
      return { response: { status: next.status, ok: next.status >= 200 && next.status < 300 }, payload: next.body };
    },
  });
  vm.runInContext(newYearSource(NY_CLIENT, [...NY_COPY, 'handleFreeRetry', 'handleNewYearRefundRequest']), ctx);
  return { ctx, ...t, starts, busy, refundNotice };
}
test('R4: 무료 다시 시도는 /retry 로 같은 상담을 다시 연 뒤 같은 상담 이어쓰기로 마저 완성한다(새 결제 없음)', async () => {
  const h = newYearRetryHandlers([partial(3)]);
  assert.equal(await h.ctx.handleFreeRetry(), true);
  assert.deepEqual(h.log.requests.map(row => row.path), ['/api/new-year-ai/retry']);
  assert.deepEqual(JSON.parse(JSON.stringify(h.log.requests[0].payload)), { sessionId: 'ny-1' });
  assert.equal(h.starts.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(h.starts[0].slice(0, 3))), [{ resumeSessionId: 'ny-1' }, 'paid-request', {}]);
  assert.equal(h.last('retryOffer'), '');
  assert.equal(h.ctx.startLockRef.current, false);
});
test('R4: 다시 시도가 또 실패하면 버튼을 그대로 두고, 기간이 지났으면 환불 안내로 닫는다', async () => {
  const again = newYearRetryHandlers([retryFailure]);
  assert.equal(await again.ctx.handleFreeRetry(), false);
  assert.equal(again.starts.length, 0); assert.equal(again.last('retryOffer'), 'ny-1');
  assert.equal(again.last('error'), vm.runInContext('NEW_YEAR_RETRY_MESSAGE', again.ctx));
  const expired = newYearRetryHandlers([{ status: 409, body: { ok: false, reason: 'RETRY_WINDOW_EXPIRED' } }]);
  assert.equal(await expired.ctx.handleFreeRetry(), false);
  assert.equal(expired.starts.length, 0); assert.equal(expired.last('retryOffer'), '');
  assert.equal(expired.last('error'), vm.runInContext('NEW_YEAR_REFUND_NOTICE', expired.ctx));
});
test('R4: 다시 시도 대신 환불 요청은 /refund-request 로 보내고 접수 안내로 바꾼다', async () => {
  const h = newYearRetryHandlers([{ status: 200, body: { ok: true, sessionId: 'ny-1', refunded: false, refundStatus: 'pending' } }]);
  await h.ctx.handleNewYearRefundRequest();
  assert.deepEqual(h.log.requests.map(row => row.path), ['/api/new-year-ai/refund-request']);
  assert.equal(h.last('retryOffer'), '');
  assert.equal(h.last('error'), vm.runInContext('NEW_YEAR_REFUND_REQUESTED_MESSAGE', h.ctx));
  const failed = newYearRetryHandlers([{ status: 409, body: { ok: false, reason: 'NOT_RETRYABLE' } }]);
  await failed.ctx.handleNewYearRefundRequest();
  assert.equal(failed.refundNotice.at(-1), vm.runInContext('NEW_YEAR_REFUND_REQUEST_FAILED_MESSAGE', failed.ctx));
});
test('R4: 신년 생성 오류 문구는 서버가 하지 않는 자동 이어쓰기를 약속하지 않는다', () => {
  const ctx = vm.createContext({});
  vm.runInContext(newYearSource(NY_CLIENT, NY_COPY), ctx);
  assert.doesNotMatch(ctx.LLM_ERROR_MESSAGE, /다시 이어집니다|이어집니다/);
  assert.match(ctx.LLM_ERROR_MESSAGE, /기록 보관함|결제 내역/);
  assert.equal(ctx.newYearRetryOffer({ ok: false, reason: 'LLM_ERROR' }), '');
  assert.equal(ctx.newYearRetryOffer({ ok: false, retry: { available: true, sessionId: 'ny-9' } }), 'ny-9');
});

test('신년 환불 안내는 결제·이용권 자동 환불과 확인 위치를 알린다', () => {
  const ctx = vm.createContext({});
  vm.runInContext(newYearSource(NY_CLIENT, NY_COPY), ctx);
  assert.match(ctx.NEW_YEAR_REFUND_NOTICE, /자동으로 되돌/);
  assert.match(ctx.NEW_YEAR_REFUND_NOTICE, /기록 보관함|결제 내역/);
  assert.equal(ctx.newYearRefundNotice({ ok: false, reason: 'DB_DEGRADED', retryable: true }), '');
  assert.equal(ctx.newYearRefundNotice({ ok: true, status: 'partial' }), '');
});

// 결제 완료 직후: 결제 안내를 지우고 생성 화면으로 바로 넘어간다.
test('신년 결제가 확인되면 첫 생성 요청 전에 결제 안내를 생성 시작 안내로 바꾼다', async () => {
  const h = newYearStart({ responses: [completedResult] });
  assert.equal(await h.run(), true);
  const post = h.log.events.indexOf('post');
  const before = h.log.events.slice(0, post);
  assert.ok(before.includes('error:'));
  assert.ok(before.includes(`notice:${vm.runInContext('NEW_YEAR_PAID_NOTICE', h.ctx)}`));
  assert.ok(before.includes('status:reading'));
  assert.match(vm.runInContext('NEW_YEAR_PAID_NOTICE', h.ctx), /확인이 끝났어요/);
});
test('신년 같은 상담 이어쓰기는 결제 확인 안내를 다시 띄우지 않는다', async () => {
  const h = newYearStart({ responses: [completedResult] });
  assert.equal(await h.ctx.startConsultation({ resumeSessionId: 'ny-1' }, 'paid-request', {}), true);
  const before = h.log.events.slice(0, h.log.events.indexOf('post'));
  assert.ok(before.includes('notice:'));
  assert.ok(!before.includes(`notice:${vm.runInContext('NEW_YEAR_PAID_NOTICE', h.ctx)}`));
});
test('신년 화면은 생성이 시작되면 생성 중 패널로, 생성이 오류로 닫히면 안내·버튼으로 화면을 옮긴다', () => {
  const ctx = vm.createContext({});
  vm.runInContext(newYearSource(NY_CLIENT, ['newYearScrollTarget']), ctx);
  assert.equal(ctx.newYearScrollTarget('payment', 'reading', 'web'), 'chat');
  assert.equal(ctx.newYearScrollTarget('preparing', 'reading', 'web'), 'chat');
  assert.equal(ctx.newYearScrollTarget('idle', 'reading', 'web'), 'chat');
  assert.equal(ctx.newYearScrollTarget('reading', 'reading', 'web'), '');
  assert.equal(ctx.newYearScrollTarget('reading', 'error', 'web'), 'error');
  assert.equal(ctx.newYearScrollTarget('reading', 'ready', 'web'), '');
  assert.equal(ctx.newYearScrollTarget('idle', 'error', 'web'), '');
  assert.equal(ctx.newYearScrollTarget('payment', 'reading', 'toss'), '');
  const source = fs.readFileSync(NY_CLIENT, 'utf8');
  assert.match(source, /<section ref=\{chatRef\} className="nyai-chat nyai-panel"/);
  assert.match(source, /<p ref=\{errorRef\} role="alert" className="nyai-error">/);
  assert.match(source, /newYearScrollTarget\(shownStatusRef\.current, status, paymentSurface\)/);
});

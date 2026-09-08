const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// 실제 fortune.js의 공통 권한 판정을 실행한다. DB는 메모리 fixture,
// PG·LLM은 접근할 수 없다. 정적 사주/궁성/점성술이 모두 이 판정을 사용한다.
const source = fs.readFileSync(path.resolve(__dirname, '../../worker/routes/fortune.js'), 'utf8');
const ast = ts.createSourceFile('fortune.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functions = ['isAIPromptPassAccessPayload', 'findAIPromptPaidAccessEvidence'].map(name => {
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration, name);
  return declaration.getText(ast);
}).join('\n');
const modules = Promise.all([
  import('../../worker/lib/profile-limits.js'),
  import('../../worker/lib/entitlement-policy.js'),
  import('../../worker/lib/pass-consumption.js'),
  import('../../__tests__/fixtures/fake-payment-db.mjs'),
]);
const USER = '64b000000000000000000001';

for (const [name, core] of [
  ['Saju', '_sajuAiPromptResumeCore'],
  ['Astro', '_astroAiPromptResumeCore'],
  ['Ziwei', '_zwAiPromptResumeCore'],
]) {
  test(`${name} static resume waits for result and retains failed work`, async () => {
    const raw = fs.readFileSync(path.resolve(__dirname, '../../js/saju-engine.js'), 'utf8');
    const tree = ts.createSourceFile('saju-engine.js', raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const declaration = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === `_seRun${name}AiPromptResume`);
    for (const result of [true, false, undefined]) {
      let finish;
      let completed = false;
      const sandbox = vm.createContext({ Promise, window: { [core]: () => new Promise(resolve => { finish = resolve; }) },
        _seResumeEvidence: grant => grant, _SE_RESUME_WAIT_MS: 1, _seWaitForResumeTarget: async ready => ready() });
      vm.runInContext(declaration.getText(tree), sandbox);
      const pending = sandbox[`_seRun${name}AiPromptResume`]({ args: { question: '상담 질문입니다' } }, { freeBySubscription: true })
        .then(value => { completed = true; return value; });
      await Promise.resolve();
      await Promise.resolve();
      assert.equal(completed, false, 'opening the UI must not complete paid resume');
      finish(result);
      assert.equal(await pending, result === true);
    }
  });
}

async function fixture({ spent = 0, tier = 'vvip' } = {}) {
  const [policy, entitlement, pass, { makeFakePaymentDb }] = await modules;
  const db = makeFakePaymentDb();
  const expiresAt = new Date(Date.now() + 86400000);
  db.rows.push({ _id: USER, points: 0, recentConsumeRequestIds: [], profileSubscription: {
    tier, passTier: tier, isActive: true, expiresAt,
    premiumUseCycleKey: expiresAt.toISOString(), monthlySpendCoin: spent,
  } });
  let paymentLookups = 0;
  const context = vm.createContext({
    normalizeHoneyPassEntitlement: policy.normalizeHoneyPassEntitlement,
    canUseByPass: policy.canUseByPass,
    resolvePremiumQuota: policy.resolvePremiumQuota,
    resolveMonthlySpendQuota: policy.resolveMonthlySpendQuota,
    resolveCanonicalEntitlement: entitlement.resolveCanonicalEntitlement,
    hasConsumedPassFeature: pass.hasConsumedPassFeature,
    passDenialCode: pass.passDenialCode,
    consumePassForFeature: input => pass.consumePassForFeature({ ...input, db }),
    connectDb: async () => {},
    User: { findById: userId => ({ select: () => ({ lean: async () => {
      assert.equal(String(userId), USER);
      return structuredClone(db.rows[0]);
    } }) }) },
    findAIPromptPaymentEvidence: async () => { paymentLookups += 1; return null; },
    isAIPromptDirectAccessPayload: () => false,
    hasAIPromptDirectPaymentEvidenceToken: () => false,
    findAIPromptMonthlyCreditEvidence: async () => null,
  });
  vm.runInContext(functions, context);
  return { db, policy, context, paymentLookups: () => paymentLookups, run: context.findAIPromptPaidAccessEvidence };
}

for (const featureKey of ['saju_ai_prompt_generator', 'ziwei_ai_prompt_generator', 'astrology_ai_prompt_generator']) {
  test(`${featureKey}: 이용권만으로 선검사와 생성 권한 획득, 추가 PG 증빙 없음`, async () => {
    const f = await fixture();
    const input = { auth: { userId: USER }, featureKey, requestId: 'original-input', cost: 200,
      body: { freeBySubscription: true }, env: {} };
    assert.equal((await f.run(input)).source, 'pass_payload');
    assert.equal(f.db.rows[0].profileSubscription.monthlySpendCoin, 0);
    assert.equal((await f.run({ ...input, consume: true })).source, 'pass_payload');
    assert.equal((await f.run({ ...input, consume: true })).source, 'pass_payload');
    assert.equal(f.db.rows[0].profileSubscription.monthlySpendCoin, 200);
    assert.equal(f.paymentLookups(), 0);
  });

  test(`${featureKey}: 마지막 한도 사용 뒤 결과 재시도는 같은 요청으로 통과`, async () => {
    const f = await fixture({ spent: 1800 });
    const input = { auth: { userId: USER }, featureKey, requestId: 'last-covered', cost: 200,
      body: { freeBySubscription: true }, env: {} };
    assert.equal((await f.run({ ...input, consume: true })).source, 'pass_payload');
    assert.equal(f.db.rows[0].profileSubscription.tier, 'vvip');
    assert.equal(f.db.rows[0].profileSubscription.passTier, 'vvip');
    assert.equal(f.db.rows[0].profileSubscription.isActive, true);
    assert.equal((await f.run(input)).source, 'pass_payload');
    assert.equal((await f.run({ ...input, consume: true })).source, 'pass_payload');
    assert.equal(f.paymentLookups(), 0);
    assert.equal(f.db.rows[0].profileSubscription.monthlySpendCoin, 2000);
    assert.equal(await f.run({ ...input, requestId: 'different-input' }), null);
  });
}

test('다른 기능의 소비 마커는 만료된 이용권에 새 기능 권한을 부여하지 않는다', async () => {
  const f = await fixture({ spent: 1800 });
  const input = { auth: { userId: USER }, featureKey: 'saju_ai_prompt_generator', requestId: 'same-id', cost: 200,
    body: { freeBySubscription: true }, env: {} };
  await f.run({ ...input, consume: true });
  assert.equal(await f.run({ ...input, featureKey: 'ziwei_ai_prompt_generator' }), null);
});

for (const tier of ['standard', 'premium', 'vvip', 'family']) {
  test(`${tier}: 정본 커버 범위 안에서만 추가 PG 증빙 없이 AI 실행`, async () => {
    const f = await fixture({ tier });
    const cost = 200;
    const coveredByPolicy = f.policy.canUseByPass(f.policy.normalizeHoneyPassEntitlement(f.db.rows[0]), cost);
    const input = { auth: { userId: USER }, featureKey: 'ziwei_ai_prompt_generator', requestId: 'tier-coverage', cost,
      body: { freeBySubscription: true }, env: {} };
    const evidence = await f.run({ ...input, consume: true });
    assert.equal(evidence?.source === 'pass_payload', coveredByPolicy);
    if (coveredByPolicy) {
      assert.equal(f.paymentLookups(), 0);
      assert.equal(f.db.rows[0].profileSubscription.monthlySpendCoin, cost);
      assert.equal((await f.run({ ...input, consume: true })).source, 'pass_payload');
      assert.equal(f.db.rows[0].profileSubscription.monthlySpendCoin, cost);
    } else {
      assert.equal(f.db.rows[0].profileSubscription.monthlySpendCoin, 0);
    }
  });
}

async function routeFixture(name) {
  const f = await fixture({ spent: 1800 });
  const featureKey = name === 'handleSajuAIPrompt' ? 'saju_ai_prompt_generator' : 'ziwei_ai_prompt_generator';
  const input = { auth: { userId: USER }, featureKey, requestId: 'route-resume', cost: 200,
    body: { freeBySubscription: true }, env: {} };
  // PG 증빙 없이 이용권으로 이미 커버한 실행. 마지막 소비 후 이용권은 끝난 상태다.
  await f.run({ ...input, consume: true });
  let generated = 0;
  const fakePrompt = () => ({ generatedPrompt: 'fixture prompt '.repeat(20), digestSource: 'fixture-digest', promptVersion: 'fixture' });
  const json = (body, init) => new Response(JSON.stringify(body), init);
  const fail = (code, message, status) => json({ ok: false, code, message }, { status });
  Object.assign(f.context, {
    Request, Response, Headers, console: { info() {}, warn() {}, error() {} },
    json, readJson: request => request.json(),
    withMongoRetry: async (_env, action) => action(),
    primePromptTemplateOverrides: async () => {},
    buildSajuAIPrompt: fakePrompt, buildZiweiAIPrompt: fakePrompt,
    buildSajuAIPromptError: fail, buildZiweiAIPromptError: fail,
    buildSajuAIPromptPaymentRequiredError: () => fail('PAYMENT_REQUIRED', '', 402),
    calculateKrwAmountFromCoins: cost => cost * 100,
    SAJU_AI_PROMPT_FEATURE_KEY: 'saju_ai_prompt_generator', SAJU_AI_PROMPT_PRICE: 200,
    ZIWEI_AI_PROMPT_FEATURE_KEY: 'ziwei_ai_prompt_generator', ZIWEI_AI_PROMPT_PRICE: 200,
    SAJU_AI_PROMPT_VERSION: 'fixture', FEATURE_AI_LLM_BUDGET_MS: 60000,
    sha256Hex: async () => 'fixture-hash', readAIPromptRequestId: body => body.requestId,
    resolveSajuAIProfileIdForConsultation: () => 'fixture-profile',
    buildSajuAIResultId: () => 'fixture-result',
    readSajuAIPromptPaymentIdentity: () => ({ paymentId: '', orderId: input.requestId }),
    buildSajuAIPromptExecutionId: () => 'fixture-execution',
    findSajuAIExecutionForRead: async () => ({ status: 'completed' }),
    normalizeSajuAIStoredResult: () => ({ ok: true, resultText: 'stored saju result' }),
    handlePigCoinConsume: async request => {
      const body = await request.json();
      const evidence = await f.run({ ...input, body, requestId: body.requestId, consume: true });
      return evidence ? json({ ok: true, chargedCoins: 0 }) : fail('PAYMENT_REQUIRED', '', 402);
    },
    readSajuAIPromptPointRefundContext: () => ({ isPointSpend: false, isCardSpend: false }),
    runFeatureAiConsultation: async () => { generated += 1; return { ok: true, text: 'generated ziwei result', provider: 'mock' }; },
  });
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration);
  vm.runInContext(declaration.getText(ast), f.context);
  const request = new Request('https://code-destiny.test/api/fortune/fixture', { method: 'POST', body: JSON.stringify({
    ...input.body, requestId: input.requestId, question: '이직을 준비하려면 어떻게 할까요?', sajuResult: {}, chartResult: {},
  }) });
  const response = await f.context[name](request, input.auth, {});
  return { response, f, generated };
}

test('궁성 맞춤 AI 실제 라우트: 이용권 재개 → mock 생성 → resultText 응답', async () => {
  const { response, f, generated } = await routeFixture('handleZiweiAIPrompt');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).resultText, 'generated ziwei result');
  assert.equal(generated, 1);
  assert.equal(f.paymentLookups(), 0);
});

test('명식 사주 AI 실제 라우트: 이용권 재개 → 저장된 결과 응답, LLM 재호출 없음', async () => {
  const { response, f, generated } = await routeFixture('handleSajuAIPrompt');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).resultText, 'stored saju result');
  assert.equal(generated, 0);
  assert.equal(f.paymentLookups(), 0);
});

for (const priorStatus of [null, 'generation_failed', 'generating']) {
  test(`사주 생성 시작 CAS: ${priorStatus || '최초'} 동시 요청 중 1건만 생성 소유권 획득`, async () => {
    const [, , , { makeFakePaymentDb }] = await modules;
    const db = makeFakePaymentDb({ uniqueKeys: [['executionId']] });
    const existing = priorStatus ? { userId: USER, featureId: 'saju_ai_prompt_generator', profileId: 'profile', requestId: 'req',
      executionId: 'execution', status: priorStatus, updatedAt: new Date(0) } : null;
    if (existing) db.rows.push(structuredClone(existing));
    const context = vm.createContext({
      console, SAJU_AI_PROMPT_FEATURE_KEY: 'saju_ai_prompt_generator', SAJU_AI_PROMPT_ACCESS_MODE: 'per_use',
      normalizeSajuAIPromptAccessMethod: () => 'pass', buildSajuAIPromptExecutionId: () => 'execution',
      buildSajuAIProgress: () => ({ status: 'generating' }),
      withMongoRetry: async (_env, action) => action(),
      PaidExecutionRecord: { findOneAndUpdate: (filter, update, options) => db.findOneAndUpdate({}, filter,
        { ...update, $set: { ...update.$set, updatedAt: new Date() } }, { ...options, returnDocument: 'after' }) },
    });
    const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'beginSajuAIConsultationGeneratingRecord');
    assert.ok(declaration);
    vm.runInContext(declaration.getText(ast), context);
    const input = { auth: { userId: USER }, body: {}, profileId: 'profile', requestId: 'req', resultId: 'result', existingExecution: existing };
    const claims = await Promise.all([context.beginSajuAIConsultationGeneratingRecord(input), context.beginSajuAIConsultationGeneratingRecord(input)]);
    assert.equal(claims.filter(Boolean).length, 1);
    assert.equal(db.rows.length, 1);
  });
}

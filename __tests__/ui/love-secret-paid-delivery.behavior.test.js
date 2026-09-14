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
    const actual = get(doc, key);
    if (value && typeof value === 'object' && '$in' in value) return value.$in.includes(actual);
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
  let doc = null, providerCalls = 0, refunds = 0, usage = 0, fault = null, permitted = true, owner = 'owner';
  const chain = value => ({ lean: async () => clone(value), select: () => chain(value) });
  const ctx = vm.createContext({ Request, Response, Headers, Date, JSON, Map, crypto: webcrypto,
    console: { warn() {}, error() {} },
    fetch: async () => { throw new Error('EXTERNAL_FETCH_BLOCKED'); },
    clean: (v, max = 100000) => String(v || '').trim().slice(0, max), objectOf: v => v || {}, randomToken: () => 'fixture',
    readJson: request => request.json(), json: (body, init) => new Response(JSON.stringify(body), init),
    logLoveSecretAi() {}, safeLogPayload: () => ({}), getPricing: () => ({}),
    getOptionalUserFromRequest: async () => ({ userId: owner }), connectDb: async () => {}, withMongoRetry: async (_env, fn) => fn(),
    readIdempotencyKey: (request, body) => body.idempotencyKey || request.headers.get('idempotency-key'),
    normalizeRequestBody: body => ({ ok: true, inputHash: body.inputHash || 'same-input', input: { myInfo: {}, relationshipStatus: 'single', topic: '관계', userQuestion: '질문' } }),
    resolveStartAccess: async () => ({ ok: permitted, accessType }),
    calculateLoveSecretAiSaju: () => ({ dayMaster: '壬' }), buildLoveSecretGroundingFacts: () => ({}),
    loginRequired: () => new Response('', { status: 401 }), invalidInput: (_message, status = 422) => new Response('', { status }),
    paymentVerifyFailed: () => new Response('', { status: 402 }), calculationFailed: () => new Response('', { status: 422 }),
    LOVE_SECRET_AI_GENERATING_FRESH_MS: 120000, LOVE_SECRET_AI_LLM_DEADLINE_MS: 86000, LLM_ERROR_MESSAGE: 'mock generation failed',
    publicSession: row => ({ ok: true, sessionId: row.id, status: row.status, saved: row.status === 'completed', messages: row.messages }),
    restoreBillingGateAccessOnFailure: async () => { refunds++; return { restored: true }; },
    applyUsageOnce: async () => { usage++; assert.equal(doc.status, 'completed'); },
    LoveSecretAiConsultation: {
      findOne: filter => chain(doc && matches(doc, filter) ? doc : null),
      create: async seed => { if (doc) throw Object.assign(new Error('duplicate'), { code: 11000 }); doc = { ...clone(seed), updatedAt: new Date().toISOString() }; return clone(doc); },
      findOneAndUpdate: (filter, update) => ({ lean: async () => {
        if (fault && (fault === update.$set?.status || fault === 'checkpoint' && update.$set?.['llmMeta.delivery'])) { fault = null; return null; }
        if (!doc || !matches(doc, filter)) return null;
        for (const [key, value] of Object.entries(update.$set || {})) set(doc, key, value);
        doc.updatedAt = new Date().toISOString(); return clone(doc);
      } }),
      updateOne: async (filter, update) => { if (doc && matches(doc, filter)) Object.assign(doc, clone(update.$set)); },
    },
    generateFirstConsultation: async (_env, _input, _saju, _log, options) => {
      const groups = clone(options.savedGroups);
      const key = ['core', 'pattern', 'partner', 'timing', 'action', 'closing'].find(k => !groups.some(row => row.key === k));
      if (key) {
        await options.onReserve(key); providerCalls++;
        const row = { key, ok: true, sections: [{ body: `${key} 저장된 해설` }] };
        await options.onCheckpoint(row); groups.push(row);
      }
      return { complete: groups.length === 6, answer: groups.map(row => row.sections[0].body).join('\n'), sections: groups.flatMap(row => row.sections), provider: 'mock', model: 'mock', keywords: [], strategy: '', savedGroups: groups };
    },
  });
  load(ctx, 'worker/lib/result-storage.js', ['resultStorageUnavailable', 'resultStorageFailurePayload']);
  load(ctx, 'worker/routes/love-secret-ai.js', ['handleStart', 'saveLoveSecretCheckpoint', 'confirmLoveSecretDelivery']);
  const post = (body = {}) => ctx.handleStart(new Request('https://mock.test/api/love-secret-ai/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'idempotency-key': 'original-paid-request' }, body: JSON.stringify(body),
  }), {});
  return { ctx, post, get doc() { return doc; }, get calls() { return providerCalls; }, get refunds() { return refunds; }, get usage() { return usage; },
    fault: value => { fault = value; }, permitted: value => { permitted = value; }, owner: value => { owner = value; } };
}

for (const accessType of ['pass', 'subscription', 'paid']) {
  test(`${accessType}: 여섯 묶음 저장·같은 요청 재개·완료 뒤 사용 기록`, async () => {
    const f = fixture(accessType);
    for (let index = 0; index < 6; index++) {
      const response = await f.post(index ? { resumeSessionId: f.doc.id } : {});
      assert.equal(response.status, index === 5 ? 200 : 202);
      assert.equal(f.calls, index + 1); assert.equal(f.usage, index === 5 ? 1 : 0);
    }
    assert.equal(f.doc.idempotencyKey, 'original-paid-request');
    assert.equal((await f.post()).status, 200); assert.equal(f.calls, 6); assert.equal(f.refunds, 0);
  });
  test(`${accessType}: 최종 저장 null은 환불 없이 503, 보존된 본문 재사용`, async () => {
    const f = fixture(accessType);
    for (let index = 0; index < 5; index++) await f.post();
    f.fault('completed');
    const failed = await f.post();
    assert.equal(failed.status, 503);
    assert.equal((await failed.json()).reason, 'RESULT_STORAGE_UNAVAILABLE');
    assert.equal(f.doc.status, 'delivery_pending'); assert.equal(f.refunds, 0); assert.equal(f.usage, 0);
    assert.equal((await f.post()).status, 200); assert.equal(f.calls, 6);
  });
}
test('체크포인트 저장 실패는 LLM 호출 전에 중단하며 환불로 흐르지 않는다', async () => {
  const f = fixture(); f.fault('checkpoint');
  assert.equal((await f.post()).status, 503); assert.equal(f.calls, 0); assert.equal(f.refunds, 0);
});
test('재개는 계정 소유권과 현재 결제 권한을 다시 확인한다', async () => {
  const f = fixture(); await f.post(); const id = f.doc.id;
  f.owner('other'); assert.equal((await f.post({ resumeSessionId: id })).status, 404);
  f.owner('owner'); f.permitted(false); assert.equal((await f.post({ resumeSessionId: id })).status, 402); assert.equal(f.calls, 1);
});
test('같은 키의 입력 변경은 409로 거부한다', async () => {
  const f = fixture(); await f.post(); assert.equal((await f.post({ inputHash: 'changed' })).status, 409); assert.equal(f.calls, 1);
});
test('동시 요청은 같은 문서를 잠그고 한 묶음만 생성한다', async () => {
  const f = fixture();
  const responses = await Promise.all([f.post(), f.post()]);
  assert.deepEqual(responses.map(response => response.status), [202, 202]);
  assert.equal(f.calls, 1); assert.equal(f.refunds, 0);
});

function clientFixture({ storageFailure = false, switchAccount = false } = {}) {
  const ast = ts.createSourceFile('client.tsx', fs.readFileSync('app/love-secret-ai/LoveSecretAiClient.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let fn;
  function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'startConsultation') fn = node; ts.forEachChild(node, visit); }
  visit(ast); assert.ok(fn);
  const calls = []; let completed = 0, current = true;
  const pendingGenerationRef = { current: null };
  const ctx = vm.createContext({ document: { hidden: false },
    captureDeliveryScope: () => () => current, pendingGenerationRef,
    setPhase() {}, releasePaidFeatureGate() {}, setProgressIndex() {}, markPaidAttemptGenerationStarted() {},
    activeAttemptId: () => 'paid-attempt', pollResult: async () => { throw new Error('UNEXPECTED_POLL'); },
    setProgress() {}, setResultUrl() {}, setNotice() {}, setError() {}, moveResultWindow() {},
    buildResultUrl: ({ sessionId }) => `/result/${sessionId}`,
    markPaidAttemptGenerationCompleted: () => { completed++; },
    copy: { errorMessages: { serverError: '서버 오류', llmError: '생성 오류', paymentVerifyFailed: '증빙 오류' } },
    postJson: async (path, body, key) => {
      calls.push({ path, body, key });
      if (switchAccount) current = false;
      return { payload: storageFailure ? { ok: false, reason: 'RESULT_STORAGE_UNAVAILABLE' } : {
        ok: true, sessionId: 'stored-session', status: calls.length === 6 ? 'completed' : 'partial', saved: calls.length === 6,
        messages: [{ role: 'assistant', content: '부분 본문' }], completedGroups: Array(calls.length).fill('group'),
      } };
    },
  });
  vm.runInContext(ts.transpileModule(fn.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
  return { ctx, calls, pendingGenerationRef, get completed() { return completed; } };
}
test('연애 화면은 부분 본문을 완료 처리하지 않고 결제 없이 같은 상담을 이어받는다', async () => {
  const f = clientFixture();
  assert.equal(await f.ctx.startConsultation({ question: 'original' }, 'paid-request', { transactionId: 'receipt' }), true);
  assert.equal(f.calls.length, 6); assert.equal(f.completed, 1);
  for (const request of f.calls.slice(1)) {
    assert.equal(request.body.resumeSessionId, 'stored-session'); assert.equal(request.key, 'paid-request');
  }
  assert.equal(f.pendingGenerationRef.current, null);
});
test('연애 화면 저장 실패는 원래 증빙을 보존한다', async () => {
  const f = clientFixture({ storageFailure: true });
  await assert.rejects(f.ctx.startConsultation({ question: 'original' }, 'paid-request', { transactionId: 'receipt' }));
  assert.equal(f.completed, 0); assert.equal(f.pendingGenerationRef.current.access.transactionId, 'receipt');
});
test('다른 계정으로 전환한 뒤 도착한 응답은 완료·추가 생성에 사용하지 않는다', async () => {
  const f = clientFixture({ switchAccount: true });
  assert.equal(await f.ctx.startConsultation({}, 'paid-request', {}), false);
  assert.equal(f.calls.length, 1); assert.equal(f.completed, 0);
});

for (const failed of [false, true]) {
  test(`실제 연애 생성기는 저장한 그룹을 재사용하고 요청당 호출을 제한한다 (${failed})`, async () => {
    const groups = ['a','b','c','d','e','f'].map(key => ({ key }));
    const calls = []; let reserved = 0;
    const ctx = vm.createContext({ Date, Promise, Map,
      LOVE_SECRET_AI_GROUPS: groups, LOVE_SECRET_AI_GROUP_TIMEOUT_MS: 54000, LOVE_SECRET_AI_REPAIR_TIMEOUT_MS: 24000,
      LOVE_SECRET_AI_LLM_DEADLINE_MS: 86000, LOVE_SECRET_AI_REPAIR_MIN_REMAINING_MS: 22000,
      LOVE_SECRET_AI_MIN_USABLE_GROUPS: 6, LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS: 20000,
      createLlmCacheStore: () => null, cmsPromptText: async () => '', LOVE_SECRET_AI_SYSTEM_PROMPT: '',
      buildLoveSecretGroundingTerms: () => [], logLoveSecretAi() {}, clean: value => String(value || ''),
      assembleLoveSecretConsultation: rows => ({ answer: '가'.repeat(21000), rows }),
      validateLoveSecretConsultation: value => ({ issues: value.rows.filter(row => !row.ok).map(row => `SECTION_EMPTY:${row.key}`) }),
      mapLoveSecretIssuesToGroups: (_quality, rows) => new Map(rows.filter(row => !row.ok).map(row => [row.key, ['repair']])),
      countLoveSecretConsultationBodyChars: value => value.rows.filter(row => row.ok).length * 4000,
      generateLoveSecretGroup: async (_env, options) => { calls.push(options.group.key); return { key: options.group.key, ok: !failed, sections: [], provider: 'mock' }; },
    });
    load(ctx, 'worker/routes/love-secret-ai.js', ['generateFirstConsultation']);
    const savedGroups = groups.slice(0, 3).map(group => ({ key: group.key, ok: true, sections: [] }));
    const result = await ctx.generateFirstConsultation({}, {}, {}, {}, {
      savedGroups, onReserve: async () => { reserved++; }, onCheckpoint: async () => {},
    });
    assert.equal(reserved, 1);
    assert.deepEqual(calls, failed ? ['d','d'] : ['d']);
    assert.equal(result.complete, false);
    assert.deepEqual(Array.from(result.savedGroups.slice(0,3), row => row.key), ['a','b','c']);
  });
}

for (const revoked of ['execution', 'payment', 'points']) {
  test(`취소·환불 ${revoked} 증빙은 유효한 토큰/현재 이용권으로 우회하지 않는다`, async () => {
    let fallback = 0;
    const ctx = vm.createContext({ Promise,
      clean: value => String(value || ''), FEATURE_KEY: 'love-secret-ai-consultation',
      verifyAccessToken: async () => ({ userId: 'owner', idempotencyKey: 'original', inputHash: 'hash', paymentId: 'payment' }),
      collectBillingEvidenceIds: () => ['original', 'payment'],
      buildPaidExecutionEvidenceQuery: () => [{ requestId: 'original' }], buildPaymentEvidenceQuery: () => [{ merchantUid: 'payment' }], buildPointHistoryEvidenceQuery: () => [{ 'metadata.requestId': 'original' }],
      PaidExecutionRecord: { findOne: () => ({ lean: async () => revoked === 'execution' ? { status: 'refunded' } : null }) },
      Payment: { findOne: () => ({ lean: async () => revoked === 'payment' ? { status: 'cancelled' } : null }) },
      PointHistory: { findOne: () => ({ lean: async () => revoked === 'points' ? { metadata: { monthlyCreditRefundedForLoveSecretAiFailure: true } } : null }) },
      withMongoRetry: async (_env, fn) => fn(), resolveBillingUsageEvidence: async () => { fallback++; return { ok: true }; },
    });
    load(ctx, 'worker/routes/love-secret-ai.js', ['resolveStartAccess']);
    const access = await ctx.resolveStartAccess({ request: { headers: { get: () => '' } }, env: {}, auth: { userId: 'owner' },
      body: { accessToken: 'valid-token' }, normalized: { inputHash: 'hash' }, idempotencyKey: 'original', pricing: {} });
    assert.equal(access.ok, false); assert.equal(fallback, 0);
  });
}

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');
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
    const actual = get(doc, key);
    if (value && typeof value === 'object' && '$lt' in value) return actual < value.$lt;
    if (value === null) return actual == null;
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
  const chain = value => ({ lean: async () => clone(value), select: () => chain(value), sort:()=>chain(value) });
  const ctx = vm.createContext({ nativeTossContext:()=>null, runWithAiLocale, getAmbientAiLocale, storedAiLocale, toAiLocale, Request, Response, Headers, URL, Date, JSON, Map, crypto: webcrypto,
    // 증빙 claim 은 billing-evidence-claim.test.js 가 따로 검증한다 — 여기서는 통과로 둔다.
    claimRequestBillingEvidence: async () => ({ ok: true, skipped: true }), releaseRequestBillingEvidence: async () => ({ released: 0 }), evidenceClaimErrorBody: result => result, FEATURE_KEY: 'love-secret-ai-consultation',
    console: { warn() {}, error() {} }, nativeTossContext:()=>null, nativeLoveSecretStoredState:async()=>null,
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
    applyUsageOnce: async () => {
      assert.equal(doc.status, 'delivery_pending');
      if (fault === 'usage') { fault = null; throw new Error('USAGE_UNAVAILABLE'); }
      if (!doc.usageAppliedAt) { usage++; doc.usageAppliedAt = new Date().toISOString(); }
    },
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

for (const accessType of ['pass', 'subscription', 'paid']) test(`${accessType}: 브라우저 종료 뒤 서버가 저장된 상담만 이어 완성하고 재열람은 재생성·중복 차감하지 않는다`, async () => {
  const f = fixture(accessType);
  await f.post();
  load(f.ctx, 'worker/routes/love-secret-ai.js', ['resumeConsultationOnServer']);
  for (let wave = 0; wave < 20 && f.doc.status !== 'completed'; wave++) {
    const response = await f.ctx.resumeConsultationOnServer({}, { id: f.doc.id, userId: f.doc.userId });
    assert.ok([200, 202].includes(response.status), await response.text());
  }
  assert.equal(f.doc.status, 'completed');
  const calls = f.calls;
  const consumed = f.usage;
  assert.equal(consumed, 1);
  const again = await f.ctx.resumeConsultationOnServer({}, { id: f.doc.id, userId: f.doc.userId });
  assert.equal(again.status, 200);
  assert.equal(f.calls, calls);
  assert.equal(f.usage, consumed);
  assert.equal(f.refunds, 0);
});

for (const accessType of ['pass', 'subscription', 'paid']) {
  test(`${accessType}: 여섯 묶음 저장·같은 요청 재개·사용 확정 뒤 완료`, async () => {
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
    assert.equal(f.doc.status, 'delivery_pending'); assert.equal(f.refunds, 0); assert.equal(f.usage, 1);
    assert.equal((await f.post()).status, 200); assert.equal(f.calls, 6); assert.equal(f.usage, 1);
  });
}
test('이용 확정 실패는 완료로 표시하지 않고 저장한 여섯 묶음으로 다시 시도한다', async () => {
  const f = fixture();
  for (let index = 0; index < 5; index++) await f.post();
  f.fault('usage');
  assert.equal((await f.post()).status, 503);
  assert.equal(f.doc.status, 'delivery_pending'); assert.equal(f.usage, 0); assert.equal(f.calls, 6);
  assert.equal((await f.post()).status, 200); assert.equal(f.usage, 1); assert.equal(f.calls, 6);
});
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
  const ctx = vm.createContext({ nativeTossContext:()=>null, document: { hidden: false },
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
    const ctx = vm.createContext({ nativeTossContext:()=>null, Date, Promise, Map,
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
    assert.deepEqual(calls, ['d']);
    assert.equal(result.complete, false);
    assert.deepEqual(Array.from(result.savedGroups.slice(0,3), row => row.key), ['a','b','c']);
  });
}

for (const revoked of ['execution', 'payment', 'points']) {
  test(`취소·환불 ${revoked} 증빙은 유효한 토큰/현재 이용권으로 우회하지 않는다`, async () => {
    let fallback = 0;
    const ctx = vm.createContext({ nativeTossContext:()=>null, Promise,
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

for (const locale of AI_OUTPUT_LOCALES) test(`${locale}: resumes in the purchased language after the UI changes`, async () => {
  const f = fixture();
  const languages = [];
  const original = f.ctx.generateFirstConsultation;
  f.ctx.generateFirstConsultation = (...args) => { languages.push(getAmbientAiLocale()); return original(...args); };
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

test('Toss original love-secret waves use one bound order, saved chapters, recovery and revocation checks', async () => {
  const { build } = require('esbuild');
  const path = require('node:path'), Module = require('node:module');
  const f = fixture('paid');
  const auth = {_id:'identity',ownerId:'owner',userId:'owner',revision:1,userKey:'123',environment:'SANDBOX'};
  const product = {approved:true,nativeService:'love-secret',sku:'offline-love',featureKey:'love-secret-ai-consultation',productId:'native:love-secret:love-secret-ai-consultation',approvedPriceKRW:6000,priceEvidence:'offline fixture'};
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
  globalThis.__loveNative = state;
  const root = process.cwd();
  const stubs={
    'worker/lib/db.js':'export const withMongoRetry=async(e,f)=>f();',
    'worker/toss/models.js':'export const {TossNativeConsultation,TossPurchase,TossIdentity}=globalThis.__loveNative.models;',
    'worker/toss/catalog.js':'export const APPROVED_TOSS_NATIVE_PRODUCTS=globalThis.__loveNative.catalog;',
    'worker/toss/partner.js':'export const lookupOrder=async()=>globalThis.__loveNative.order;',
    'worker/toss/purchases.js':'export const purchaseStore={transaction:globalThis.__loveNative.transaction};export const recordTossRefund=async()=>{};',
    'worker/toss/crypto.js':`import {createHash} from 'node:crypto';export const hash=async x=>createHash('sha256').update(x).digest('hex');export const unseal=async()=> '123';`,
    'worker/lib/billing-feature-registry.js':'export const getBillingFeaturePricing=()=>({pricing:{amountKRW:6000}});',
    'worker/routes/fortune-tea-house.js':'export const nativeTeaContract=()=>{};export const nativeTeaStoredState=()=>{};export const handleFortuneTeaHouseRoutes=()=>{};',
    'worker/toss/native-fusion.js':'export const nativeFusionLibraryItem=()=>{};',
    'worker/toss/native-life-book.js':'export const nativeLifeBookLibraryItem=()=>{};',
    'worker/toss/native-neo.js':'export const nativeNeoLibraryItem=()=>{};',
    'worker/routes/love-secret-ai.js':`const s=globalThis.__loveNative;
      export const nativeLoveSecretContract=input=>({requestId:input.idempotencyKey,resultId:input.idempotencyKey,featureKey:'love-secret-ai-consultation',inputHash:input.inputHash,pricing:{amountKRW:6000}});
      export const nativeLoveSecretStoredState=s.stored,handleLoveSecretAiRoutes=s.handle;`,
  };
  const bundle=await build({stdin:{contents:"export * from './worker/toss/native-love-secret.js';export * from './worker/toss/native-context.js';export * from './worker/toss/native-consultation.js';",resolveDir:root},bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'offline',setup(b){b.onLoad({filter:/\.js$/},args=>{const contents=stubs[path.relative(root,args.path).replaceAll('\\','/')];if(contents)return {contents,loader:'js'};});}}]});
  const loaded=new Module(path.join(root,'native-love-secret-test.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,loaded.id);const api=loaded.exports;
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
  load(f.ctx,'worker/routes/love-secret-ai.js',['resolveStartAccess','applyUsageOnce','handleResult']);
  const call=(suffix,body,who=auth)=>api.handleNativeLoveSecret(new Request('https://example.invalid'+suffix,{method:body?'POST':'GET',headers:{Authorization:'forbidden',Cookie:'forbidden'},...(body?{body:JSON.stringify(body)}:{})}),{},who,suffix.split('?')[0]);
  const prepared=await api.prepareNativeLoveSecret({},auth,input);
  assert.equal((await call('/generate',input)).status,402);
  await assert.rejects(api.prepareNativeLoveSecret({},auth,{...input,inputHash:'changed'}),/REQUEST_INPUT_MISMATCH/);
  const args={store:{transaction:state.transaction},auth,order,product,requestId:prepared.id};
  await api.grantNativeOrder(args);await api.grantNativeOrder(args);assert.equal(state.purchases.length,1);
  state.catalog.length=0;
  state.stopBeforeCheckpoint=true;
  const boot=await api.bootstrapNativeLoveSecretOrders({TOSS_RELEASE_READY:'true'},{now:Date.now(),deadline:Date.now()+240000});
  assert.equal(boot[0].status,503);assert.deepEqual(state.bootstrapInput,input);assert.equal(f.doc,null);
  assert.ok(state.rows[0].recoveryNextAt);state.stopBeforeCheckpoint=false;
  const first=await call('/result');assert.equal(first.status,202);const virtual=(await first.json()).sessionId;
  assert.equal((await call('/generate',{resumeSessionId:virtual,inputHash:'ignored'})).status,202);
  assert.equal(f.doc.paymentId,order.orderId);
  const resumedRequest=new Request('https://internal.invalid/api/love-secret-ai/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({resumeSessionId:f.doc.id})});
  assert.equal(await api.bindNativeLoveSecretRecovery(resumedRequest,{TOSS_RELEASE_READY:'true'},f.doc),true);
  assert.equal((await f.ctx.handleStart(resumedRequest,{})).status,202);
  await assert.rejects(call('/message',{sessionId:f.doc.id,message:'question'}),/TOSS_FEATURE_NOT_AVAILABLE/);
  for(let i=0;i<10&&f.doc.status!=='completed';i++)assert.ok([200,202].includes((await call('/generate',{resumeSessionId:f.doc.id})).status));
  assert.equal(f.doc.status,'completed');
  const library=await api.nativeLoveSecretLibraryItem({},auth,state.purchases[0]);
  assert.equal(library.state,'COMPLETED');assert.ok(library.href.startsWith('/love-secret-ai/result/'));
  assert.equal(f.calls,6);assert.equal(f.usage,0);assert.equal(f.refunds,0);
  assert.ok(f.doc.usageAppliedAt);const saved=clone(f.doc.messages);
  assert.equal((await call('/generate',input)).status,200);
  assert.deepEqual((await (await call('/result?attemptId='+virtual)).json()).messages,saved);assert.equal(f.calls,6);
  assert.equal((await call('/generate',{...input,inputHash:'tampered'})).status,409);
  for(const who of [{...auth,ownerId:'other',userId:'other'},{...auth,environment:'DEFAULT'}])assert.notEqual((await call('/result?attemptId='+f.doc.id,null,who)).status,200);
  const recovery=new Request('https://internal.invalid');
  assert.equal(await api.bindNativeLoveSecretRecovery(recovery,{TOSS_RELEASE_READY:'true'},f.doc),true);
  state.order={...order,status:'REFUNDED'};
  assert.equal((await call('/result?attemptId='+f.doc.id)).status,409);
  assert.equal((await call('/generate',{resumeSessionId:f.doc.id})).status,409);
  state.order=order;state.identity=false;assert.equal((await call('/result?attemptId='+f.doc.id)).status,401);
  assert.equal(f.calls,6);
  delete globalThis.__loveNative;
});

test('Toss generation failure never releases or refunds web payment evidence',async()=>{
 const f=fixture('paid');
 f.ctx.resolveStartAccess=async()=>({ok:true,accessType:'paid',accessSource:'toss'});
 f.ctx.calculateLoveSecretAiSaju=()=>{throw Error('mock calculation failure');};
 f.ctx.releaseRequestBillingEvidence=()=>{throw Error('WEB_REFUND_FORBIDDEN');};
 load(f.ctx,'worker/routes/love-secret-ai.js',['restoreBillingGateAccessOnFailure']);
 assert.equal((await f.post()).status,422);assert.equal(f.calls,0);assert.equal(f.refunds,0);
});

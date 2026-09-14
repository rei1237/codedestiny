const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.join(__dirname, "../..");
const page = fs.readFileSync(path.join(root, "src/features/fortune-tea-house/FortuneTeaHousePage.tsx"), "utf8");
const ast = ts.createSourceFile("page.tsx", page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function functionSource(name) {
  let result;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) result = node.getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(result, name);
  return ts.transpileModule(result, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}
function store() {
  const values = new Map();
  return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
function recoveryApi(window) {
  const exports = {};
  const source = fs.readFileSync(path.join(root, "src/features/fortune-tea-house/lib/consultRecovery.ts"), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(js, { exports, window, Date });
  return exports;
}
const input = { consultationMode: "saju", question: "원래 상담 질문", profileId: "profile-a" };
const cup = { id: "cup-a", name: "찻잔", topic: "진로" };
function harness({ window = { localStorage: store(), sessionStorage: store() }, failureStatus = 503, paid = true, saved = null, owner = "user-a" } = {}) {
  const api = recoveryApi(window);
  const posts = [];
  let gateCalls = 0;
  let ensureCalls = 0;
  let serial = 0;
  let succeed = false;
  const state = {
    ...api, Error, AbortController, console, isSubmitting: false,
    submitLockRef: { current: false }, submitSucceededRef: { current: false },
    consultRunRef: { current: 0 }, unusedPaidAttemptRef: { current: saved },
    selectedCup: cup, getAuthState: () => ({ user: { id: owner } }),
    toText: value => String(value || ""), asRecord: value => value || {},
    resolveFortuneTeaFeatureKey: () => "fortune-tea-house-saju-consultation",
    canUseLocalConsultPreview: () => true,
    logSubmitStep() {}, startGenerationProgress() {}, clearGenerationProgressTimer() {}, setQuestionInput(value) { state.input = value; },
    setConsultResult(value) { state.result = value; }, setSubmitError(value) { state.error = value; },
    setIsSubmitting() {}, setGenerationProgress() {}, setNotice() {}, setHoneyDrops() {},
    setHoneyRewardMessage() {}, setHoneyRewardBurstKey() {}, setPartialSections(value) { state.partial = value; },
    authFetch: async () => ({ ok: false }),
    markGenerationComplete() { state.completed = true; }, markGenerationError() {},
    goToStage(value) { state.stage = value; },
    buildFortuneTeaHouseConsultResult: () => ({ body: "LOCAL_PREVIEW" }),
    createFortuneTeaAttemptId: () => `attempt-${++serial}`,
    beginFortuneTeaAccessGate: async () => {}, completeFortuneTeaAccessGate: async () => {},
    releaseFortuneTeaAccessGate: async () => {}, failFortuneTeaAccessGate: async () => {},
    ensureFortuneTeaAuthReady: async () => {},
    runAccessCheckWithTransientRetry: fn => fn(),
    postFortuneTeaEnsureAccessRequest: async () => { ensureCalls++; return { response: { ok: !paid, status: paid ? 402 : 200 }, payload: { ok: !paid, paymentRequired: paid } }; },
    isRetriableResultPollFailure: () => false, buildResume: value => value, packPaidResumeArg: JSON.stringify,
    runFortuneTeaBillingGate: async () => { gateCalls++; return { featureKey: "fortune-tea-house-saju-consultation", data: { paymentId: "original-payment" } }; },
    buildFortuneTeaBillingEvidenceBody: (body, draft, featureKey, billingGate) => ({ ...body, draftResult: draft, featureKey, billingGate }),
    postFortuneTeaConsultRequest: async body => {
      posts.push(JSON.parse(JSON.stringify(body)));
      if (!succeed && failureStatus === 0) throw new Error("MOCK_RESPONSE_LOST");
      return succeed ? { response: { ok: true, status: 200 }, payload: { ok: true, result: { resultId: body.attemptId, body: "SAVED_RESULT" } } }
        : { response: { ok: false, status: failureStatus }, payload: { ok: false, reason: "RESULT_STORAGE_UNAVAILABLE", message: "저장 확인 실패" } };
    },
    isFortuneTeaGenerationPending: () => false, normalizeHoneyDropsState: () => null,
    Date: { now: (() => { let n = 0; return () => (n += 2000); })() },
    window: { ...window, setTimeout: fn => { fn(); return 1; }, clearTimeout() {} },
  };
  vm.createContext(state);
  vm.runInContext(functionSource("submitQuestion"), state);
  return { state, posts, api, window, submit: value => state.submitQuestion(value || input),
    succeed: () => { succeed = true; }, gateCalls: () => gateCalls, ensureCalls: () => ensureCalls };
}

for (const paid of [true, false]) {
  for (const failureStatus of [503, 409, 402, 0]) {
    test(`${paid ? "paid" : "pass"} ${failureStatus}: refresh retains original request and never reopens gate`, async () => {
      const first = harness({ paid, failureStatus });
      await first.submit();
      assert.equal(first.state.completed, undefined);
      assert.equal(first.state.submitSucceededRef.current, false);
      assert.equal(first.state.stage, "questionInput");
      const saved = first.api.readFortuneTeaRecovery("user-a");
      assert.ok(saved);
      const refreshed = harness({ paid, window: first.window, saved });
      refreshed.succeed();
      await refreshed.submit({ ...input, question: "수정된 질문" });
      assert.deepEqual(refreshed.posts[0], first.posts[0]);
      assert.equal(refreshed.gateCalls(), 0);
      assert.equal(refreshed.ensureCalls(), 0);
      assert.equal(refreshed.state.submitSucceededRef.current, true);
      assert.equal(refreshed.api.readFortuneTeaRecovery("user-a"), null);
    });
  }
}

test("blocked storage retains in-page request; API failure cannot become local preview success", async () => {
  const blocked = {};
  for (const key of ["localStorage", "sessionStorage"]) Object.defineProperty(blocked, key, { get() { throw new Error("blocked"); } });
  const h = harness({ window: blocked });
  await h.submit();
  assert.ok(h.state.unusedPaidAttemptRef.current);
  assert.equal(h.state.completed, undefined);
  h.succeed();
  await h.submit();
  assert.equal(h.gateCalls(), 1);
  assert.deepEqual(h.posts[0], h.posts[1]);
});

test("owner scoping, corrupted records and stale completions cannot expose or erase another attempt", async () => {
  const h = harness();
  await h.submit();
  assert.equal(h.api.readFortuneTeaRecovery("user-b"), null);
  const saved = h.api.readFortuneTeaRecovery("user-a");
  const next = { ...saved, attemptId: "new", requestPayload: { ...saved.requestPayload, attemptId: "new", requestId: "new", idempotencyKey: "new" } };
  h.api.saveFortuneTeaRecovery(next);
  h.api.clearFortuneTeaRecovery("user-a", saved.attemptId);
  assert.equal(h.api.readFortuneTeaRecovery("user-a").attemptId, "new");
  h.window.localStorage.setItem("cd_tea_consult_recovery:user-a", "broken");
  assert.equal(h.api.readFortuneTeaRecovery("user-a"), null);
});


test("actual recovery effect restores after login and clears visible state on account switch", async () => {
  const h = harness();
  await h.submit();
  let effect;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === "useEffect"
      && node.arguments[1]?.getText(ast) === "[recoveryOwner]") effect = node.arguments[0].getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(effect);
  Object.assign(h.state, {
    recoveryOwnerRef: { current: "" }, recoveryOwner: "user-a",
    setSelectedCup: value => { h.state.cup = value; },
    setStage: value => { h.state.stage = value; },
  });
  const run = () => vm.runInContext(ts.transpileModule(`(${effect})();`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, h.state);
  run();
  assert.equal(h.state.stage, "questionInput");
  assert.equal(h.state.input.question, input.question);
  h.state.recoveryOwner = "user-b";
  run();
  assert.equal(h.state.unusedPaidAttemptRef.current, null);
  assert.equal(h.state.cup, null);
  assert.equal(h.state.stage, "landing");
  h.state.recoveryOwner = "user-a";
  run();
  assert.equal(h.state.unusedPaidAttemptRef.current.attemptId, h.posts[0].attemptId);
  assert.equal(h.state.stage, "questionInput");
});


test('actual poll shows each saved wave and keeps the same request until completed', async () => {
  const body = {attemptId: 'original', requestId:'original', billingGate:{paymentId:'paid'}};
  const posted = [], progress = [];
  const state = {
    FORTUNE_TEA_POLL_BACKOFFS_MS: [0,0,0], window:{setTimeout:fn=>fn()},
    postFortuneTeaConsultRequest: async value => {
      posted.push(value);
      return posted.length < 3 ? {response:{status:202},payload:{ok:true,status:'generating',retryable:true,completedSections:[{key:'part-'+posted.length,body:'saved'}]}} : {response:{status:200},payload:{ok:true,result:{resultId:'saved'}}};
    },
    isFortuneTeaGenerationPending: response => response.status===202,
    buildFortuneTeaGenerationPendingError: message=>new Error(message),
  };
  vm.createContext(state);vm.runInContext(functionSource('pollFortuneTeaConsultResult'),state);
  const result = await state.pollFortuneTeaConsultResult(body,()=>false,value=>progress.push(value));
  assert.equal(result.response.status,200);assert.equal(progress.length,2);
  assert.ok(posted.every(value=>value===body));
  state.postFortuneTeaConsultRequest=async()=>({response:{status:202},payload:{retryable:false,completedSections:[]}});
  await assert.rejects(state.pollFortuneTeaConsultResult(body,()=>false),/생성 한도/);
});

test('actual owner effect restores a server checkpoint without local storage or a payment gate', async () => {
  const h = harness();let effect;
  function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.arguments[1]?.getText(ast)==='[recoveryOwner]')effect=node.arguments[0].getText(ast);ts.forEachChild(node,visit);}
  visit(ast);
  const body={...input,attemptId:'original',requestId:'original',idempotencyKey:'original',featureKey:'fortune-tea-house-saju-consultation',selectedTeaCupId:cup.id,billingGate:{paymentId:'paid'}};
  Object.assign(h.state,{
    recoveryOwnerRef:{current:''},recoveryOwner:'user-a',
    setSelectedCup:value=>{h.state.cup=value;},setStage:value=>{h.state.stage=value;},
    getTeaHouseCupById:()=>cup,
    authFetch:async()=>({status:202,json:async()=>({requestPayload:body,completedSections:[{key:'part',title:'저장한 장',body:'saved narrative'}]})}),
  });
  vm.runInContext(functionSource('buildFortuneTeaQuestionInputFromRequestPayload'),h.state);
  vm.runInContext(ts.transpileModule(`(${effect})();`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,h.state);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.state.stage,'questionInput');assert.equal(h.state.partial[0].body,'saved narrative');
  assert.equal(h.state.unusedPaidAttemptRef.current.attemptId,'original');
  assert.deepEqual(h.state.unusedPaidAttemptRef.current.requestPayload,body);
  assert.equal(h.gateCalls(),0);assert.equal(h.posts.length,0);
});

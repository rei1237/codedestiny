const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = readFileSync(resolve(__dirname, "../../src/features/master-love-codex/MasterLoveCodexPage.tsx"), "utf8");
const ast = ts.createSourceFile("page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function executable(name) {
  let found;
  function walk(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) found = node.initializer;
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
    ts.forEachChild(node, walk);
  }
  walk(ast);
  assert.ok(found, `${name} exists`);
  return ts.transpileModule(`globalThis.run = ${found.getText(ast)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}
const purchase = { orderId: "paid-order", featureKey: "master-love-codex", requestId: "paid-run", status: "PAID" };
function fixture({ ready = true, expired = false } = {}) {
  const events = [];
  const state = {
    captureOwner: () => () => true,
    busyRef: { current: false }, chargedRef: { current: false }, idempotencyRef: { current: "" }, recoveredPurchaseRef: { current: null },
    setRecovering() {}, setError(value) { if (value) events.push(["error", value]); },
    setPhase(value) { events.push(["phase", value]); }, setBirth() {}, EMPTY_CODEX_PARTNER: {},
    errorText: { SERVER_ERROR: "server failure", INVALID_INPUT: "invalid input" }, copy: { gateAlreadyPaidMessage: "recovering purchase" },
    asRecord: value => value && typeof value === "object" ? value : {}, toText: value => String(value || ""),
    unpackPaidResumeArg: value => value ? JSON.parse(value) : null, mapError: () => "server failure",
    authFetch: async url => ({ ok: true, json: async () => url.endsWith("/status")
      ? { verified: ready, serviceReady: ready }
      : { context: expired ? null : { resume: { args: { payload: JSON.stringify({ birthInfo: { birthDate: "1993-05-14" } }) } } } } }),
    postJson: async (url, body, key) => {
      events.push(["post", url, body, key]);
      return { status: 200, data: { ok: true, sessionId: "owned-book", accessToken: "mock-access" } };
    },
    runBatches: async id => events.push(["generate", id]),
  };
  const context = vm.createContext(state);
  vm.runInContext(executable("recoverStoredPurchase"), context);
  return { context, state, events };
}

test("redirect start failure retries the same paid run without a session or a second checkout", async () => {
  const { state, events } = fixture();
  let attempt = 0;
  Object.assign(state, {
    useCallback: fn => fn,
    pendingResumeRef: { current: null }, sessionIdRef: { current: "" },
    lastTokenRef: { current: "" }, lastSessionRef: { current: {} },
    handedOffRef: { current: false },
    setGenerationError: message => events.push(["generationError", message]),
    setChapters() {},
    setBirth: update => events.push(["birth", update({ name: "", partner: null })]),
    extractPayment: (grant, key) => ({ paymentId: grant.paymentId, requestId: key }),
    postJson: async (url, body, key) => {
      events.push(["post", url, body, key]);
      if (++attempt === 1) return { status: 503, data: { ok: false } };
      return { status: 200, data: { ok: true, sessionId: "owned-book", accessToken: "mock-access" } };
    },
  });
  const context = vm.createContext(state);
  vm.runInContext(executable("resumePaidCodex"), context);
  context.resumePaidCodex = context.run;
  const args = { idempotencyKey: "paid-run", payload: JSON.stringify({ birthInfo: { name: "owner", birthDate: "1993-05-14" }, partnerInfo: { name: "partner", birthDate: "1992-01-01" } }) };
  assert.equal(await context.resumePaidCodex(args, { paymentId: "paid-order" }), false);
  assert.equal(state.sessionIdRef.current, "");
  assert.equal(state.pendingResumeRef.current.args, args);
  vm.runInContext(executable("retryGeneration"), context);
  context.run();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(state.sessionIdRef.current, "owned-book");
  assert.equal(state.pendingResumeRef.current, null);
  const posts = events.filter(row => row[0] === "post");
  assert.deepEqual(posts.map(row => [row[1], row[2].paymentId, row[3]]), [
    ["/api/master-love-codex/start", "paid-order", "paid-run"],
    ["/api/master-love-codex/start", "paid-order", "paid-run"],
  ]);
  assert.equal(events.find(row => row[0] === "birth")[1].partner.name, "partner");
  assert.equal(events.filter(row => row[0] === "generate").length, 1);
});

test("저장된 세션은 첫 LLM 응답을 기다리지 않고 결과 화면으로 이동한다", async () => {
  const { state, events } = fixture();
  Object.assign(state, { useCallback: fn => fn, setGenerationError() {}, setChapters() {},
    generationStartedRef: { current: false }, sessionIdRef: { current: "" },
    lastTokenRef: { current: "" }, lastSessionRef: { current: {} }, handedOffRef: { current: false },
    router: { replace: url => events.push(["navigate", url]) },
    runCodexBatches: async options => { assert.equal(options.shouldStop(), true); },
  });
  const context = vm.createContext(state);
  vm.runInContext(executable("runBatches"), context);
  await context.run("owned-book", "token", { status: "generating", chapters: [] });
  assert.deepEqual(events.filter(row => row[0] === "navigate"), [["navigate", "/master-love-codex/result?sessionId=owned-book"]]);
});
test("closed browser recovery uses owned server input and starts without checkout", async () => {
  const { context, events } = fixture();
  await context.run(purchase);
  assert.deepEqual(events.filter(row => row[0] === "post").map(row => row[1]), ["/api/payments/confirm", "/api/master-love-codex/start"]);
  assert.ok(events.some(row => row[0] === "generate"));
});
test("unverified order never reaches generation or a new payment request", async () => {
  const { context, events } = fixture({ ready: false });
  await context.run(purchase);
  assert.equal(events.filter(row => row[0] === "post").length, 1);
  assert.equal(events.some(row => row[0] === "generate"), false);
});
test("expired input retains the purchased order and new input bypasses payment gates", async () => {
  const { context, state, events } = fixture({ expired: true });
  await context.run(purchase);
  assert.equal(state.recoveredPurchaseRef.current.orderId, purchase.orderId);
  assert.ok(events.some(row => row[0] === "phase" && row[1] === "birth"));
  Object.assign(state, {
    birth: { gender: "female", birthDate: "1993-05-14", birthTime: "07:20", calendarType: "solar" },
    locale: "ko", prologueChoice: "", masterLoveCodexBilling: () => ({ featureKey: purchase.featureKey }),
    beginPaidFeatureGateCheck: () => { throw new Error("a purchased run must not enter a payment gate"); },
  });
  vm.runInContext(executable("startCodex"), context);
  await context.run();
  assert.equal(events.filter(row => row[0] === "post").at(-1)[1], "/api/master-love-codex/start");
  assert.ok(events.some(row => row[0] === "generate"));
});

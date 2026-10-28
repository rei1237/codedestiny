/** @jest-environment node */
// 2026-10-16 찻집 사건: 이용권 허용 판정(읽기 전용)만으로 10,000원 상담이 차감 없이 열렸다.
// 생성 claim 직후 정산하고, 거부면 claim 을 되돌리고, 최종 실패면 차감을 환불하는지 실제 함수 본문으로 검증한다.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../../worker/routes/fortune-tea-house.js"), "utf8");
const ast = ts.createSourceFile("fortune-tea-house.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functions = ["fortuneTeaCoinPrice", "settleFortuneTeaHouseGeneration", "refundFortuneTeaHousePassSettlement"].map((name) => {
  const node = ast.statements.find((item) => ts.isFunctionDeclaration(item) && item.name?.text === name);
  if (!node) throw new Error(name);
  return node.getText(ast);
}).join("\n");

const RESULT_ID = "fortune-tea-house:attempt-1";
const LOCK = "lock-1";

function boot({ settled = { allowed: true, source: "pass", passRefund: { cycleKey: "cycle-1", cost: 100 } }, doc = null } = {}) {
  const calls = { settle: [], deleteOne: [], updateOne: [], release: [], refund: [] };
  let stored = doc;
  const results = {
    deleteOne: async (filter) => { calls.deleteOne.push(filter); return { deletedCount: 1 }; },
    updateOne: async (filter, update) => { calls.updateOne.push({ filter, update }); stored = { ...stored, ...update.$set }; return { matchedCount: 1 }; },
    findOne: async () => stored,
  };
  const state = {
    Date,
    cleanText: (value) => String(value ?? "").trim(),
    honeyCollections: () => ({ results }),
    loadPerUsePaidAccess: async () => ({
      settlePerUseAccessDecision: async (_env, args) => { calls.settle.push(args); return settled; },
    }),
    loadPassConsumption: async () => ({
      refundPassCoverage: async (args) => { calls.refund.push(args); return { refunded: true }; },
    }),
    releaseFortuneTeaDelivery: async (args) => { calls.release.push(args); },
    buildFortuneTeaAccessDegradedResponse: () => ({ status: 503 }),
    buildFortuneTeaPaymentRequiredResponse: (args) => ({ status: args.status, reason: args.accessDecision.reason }),
  };
  vm.createContext(state);
  vm.runInContext(functions, state);
  const access = {
    auth: { userId: "user-1" },
    featureKey: "fortune-tea-house-saju-consultation",
    pricing: { coinPrice: 100 },
    accessDecision: { allowed: true, accessSource: "license_pass" },
  };
  return { state, calls, access, stored: () => stored };
}

test("이용권 허용은 resultId 로 100코인을 정산하고 환불 정보를 결과 문서에 남긴다", async () => {
  const { state, calls, access, stored } = boot();
  const outcome = await state.settleFortuneTeaHouseGeneration({ env: {}, access, resultId: RESULT_ID,
    generation: { created: true, lockToken: LOCK }, consultRequest: { profileId: "card-a" } });
  expect(outcome).toEqual({ ok: true });
  // requestId 가 아니라 resultId 로 묶어야 requestId 를 고정한 채 resultId 만 바꾼 새 상담이 다시 차감된다.
  expect(calls.settle).toEqual([expect.objectContaining({ requestId: RESULT_ID, coinPrice: 100, userId: "user-1", profileId: "card-a" })]);
  expect(stored().passSettlement).toMatchObject({ source: "pass", cycleKey: "cycle-1", cost: 100 });
});

test("정산이 거부되면 이번 요청이 만든 문서를 지우고 402 를 준다", async () => {
  const { state, calls, access } = boot({ settled: { allowed: false, reason: "PRICE_EXCEEDS_PASS_LIMIT" } });
  const outcome = await state.settleFortuneTeaHouseGeneration({ env: {}, access, resultId: RESULT_ID,
    generation: { created: true, lockToken: LOCK }, consultRequest: {} });
  expect(outcome.ok).toBe(false);
  expect(outcome.response).toEqual({ status: 402, reason: "PRICE_EXCEEDS_PASS_LIMIT" });
  expect(calls.deleteOne).toEqual([expect.objectContaining({ resultId: RESULT_ID, status: "generating", "generationLock.token": LOCK })]);
  expect(calls.release).toEqual([]);
});

test("기존 문서에서 거부되면 문서를 지우지 않고 잠금만 푼다", async () => {
  const { state, calls, access } = boot({ settled: { allowed: false, reason: "PAYMENT_REQUIRED" } });
  await state.settleFortuneTeaHouseGeneration({ env: {}, access, resultId: RESULT_ID,
    generation: { created: false, lockToken: LOCK }, consultRequest: {} });
  expect(calls.deleteOne).toEqual([]);
  expect(calls.release).toEqual([expect.objectContaining({ resultId: RESULT_ID, lockToken: LOCK })]);
});

test("DB 일시 장애는 402 가 아니라 503 이다", async () => {
  const { state, access } = boot({ settled: { allowed: null, reason: "DB_DEGRADED" } });
  const outcome = await state.settleFortuneTeaHouseGeneration({ env: {}, access, resultId: RESULT_ID,
    generation: { created: true, lockToken: LOCK }, consultRequest: {} });
  expect(outcome.response).toEqual({ status: 503 });
});

test("최종 실패는 차감을 한 번만 환불하고 refundedAt 을 남긴다", async () => {
  const { state, calls, stored } = boot({ doc: { passSettlement: { cycleKey: "cycle-1", cost: 100 } } });
  await state.refundFortuneTeaHousePassSettlement({ auth: { userId: "user-1" }, resultId: RESULT_ID });
  await state.refundFortuneTeaHousePassSettlement({ auth: { userId: "user-1" }, resultId: RESULT_ID });
  expect(calls.refund).toEqual([{ userId: "user-1", cycleKey: "cycle-1", cost: 100, refundId: RESULT_ID }]);
  expect(stored().passRefund.refundedAt).toBeInstanceOf(Date);
});

test("환불된 결과는 같은 요청으로 다시 생성하지 못한다(차감 마커가 남아 무료가 되므로)", () => {
  expect(source).toMatch(/passRefundedAt: existing\?\.passRefund\?\.refundedAt/);
  expect(source).toMatch(/if \(generation\.passRefundedAt\)[\s\S]{0,400}status: 409/);
  // 정산은 생성 claim 뒤, LLM 호출(runGeneration) 전이다.
  const settleAt = source.indexOf("await settleFortuneTeaHouseGeneration(");
  expect(settleAt).toBeGreaterThan(source.indexOf("generation = await beginFortuneTeaHouseGeneration({"));
  expect(settleAt).toBeLessThan(source.indexOf("const runGeneration = async () => {"));
});

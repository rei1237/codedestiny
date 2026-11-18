/** @jest-environment node */
// 2026-10-16 찻집 사건: 이용권 허용 판정(읽기 전용)만으로 10,000원 상담이 차감 없이 열렸다.
// 생성 claim 직후 정산하고, 거부면 claim 을 되돌리고, 최종 실패면 차감을 환불하는지 실제 함수 본문으로 검증한다.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../../worker/routes/fortune-tea-house.js"), "utf8");
const ast = ts.createSourceFile("fortune-tea-house.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functions = ["fortuneTeaCoinPrice", "settleFortuneTeaHouseGeneration", "refundFortuneTeaHousePassSettlement", "retryPendingFortuneTeaHousePassRefunds"].map((name) => {
  const node = ast.statements.find((item) => ts.isFunctionDeclaration(item) && item.name?.text === name);
  if (!node) throw new Error(name);
  return node.getText(ast).replace(/^export /, "");
}).join("\n");

const RESULT_ID = "fortune-tea-house:attempt-1";
const LOCK = "lock-1";

function boot({ settled = { allowed: true, source: "pass", passRefund: { cycleKey: "cycle-1", cost: 100 } }, doc = null, refundResult = { refunded: true } } = {}) {
  const calls = { settle: [], deleteOne: [], updateOne: [], release: [], refund: [] };
  let stored = doc;
  const results = {
    deleteOne: async (filter) => { calls.deleteOne.push(filter); return { deletedCount: 1 }; },
    updateOne: async (filter, update) => { calls.updateOne.push({ filter, update }); stored = { ...stored, ...update.$set }; return { matchedCount: 1 }; },
    findOne: async () => stored,
    find: (filter) => { calls.find = filter; return { sort: () => ({ limit: () => ({ project: () => ({ toArray: async () => (stored ? [{ userId: "user-1", resultId: RESULT_ID }] : []) }) }) }) }; },
  };
  const state = {
    Date,
    cleanText: (value) => String(value ?? "").trim(),
    withMongoRetry: async (_env, fn) => fn(),
    FORTUNE_TEA_HOUSE_SCOPE: "FORTUNE_TEA_HOUSE",
    honeyCollections: () => ({ results }),
    loadPerUsePaidAccess: async () => ({
      settlePerUseAccessDecision: async (_env, args) => { calls.settle.push(args); return settled; },
    }),
    loadPassConsumption: async () => ({
      refundPassCoverage: async (args) => { calls.refund.push(args); return refundResult; },
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
  expect(stored().passSettlement).toMatchObject({ source: "pass", featureKey: "fortune-tea-house-saju-consultation", cycleKey: "cycle-1", cost: 100 });
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

test("기능 키를 남긴 정산의 환불은 같은 사용 증빙을 표시한다(중복 환불 방지)", async () => {
  const { state, calls } = boot({ doc: { passSettlement: { featureKey: "fortune-tea-house-saju-consultation", cycleKey: "cycle-1", cost: 100 } } });
  await state.refundFortuneTeaHousePassSettlement({ auth: { userId: "user-1" }, resultId: RESULT_ID });
  expect(calls.refund).toEqual([{ userId: "user-1", cycleKey: "cycle-1", cost: 100, refundId: RESULT_ID,
    sourceFeatureKey: "fortune-tea-house-saju-consultation", sourceRequestId: RESULT_ID }]);
});

test("환불된 결과는 같은 요청으로 다시 생성하지 못한다(차감 마커가 남아 무료가 되므로)", () => {
  expect(source).toMatch(/passRefundedAt: existing\?\.passRefund\?\.refundedAt/);
  expect(source).toMatch(/if \(generation\.passRefundedAt\)[\s\S]{0,400}status: 409/);
  // 정산은 생성 claim 뒤, LLM 호출(runGeneration) 전이다.
  const settleAt = source.indexOf("await settleFortuneTeaHouseGeneration(");
  expect(settleAt).toBeGreaterThan(source.indexOf("generation = await beginFortuneTeaHouseGeneration({"));
  expect(settleAt).toBeLessThan(source.indexOf("const runGeneration = async () => {"));
});

// 2026-11-18 S3-M: 종결 표식(refundedAt)은 무료 재생성을 막으려 늘 남기지만, 실제로 돌려준 것이 없으면 '돌려드렸어요'라고 알리지 않는다.
test("돌려줄 차감이 없던 최종 실패는 종결만 표시하고 환불로 기록하지 않는다", async () => {
  const { state, stored } = boot({ doc: { passSettlement: { cycleKey: "cycle-1", cost: 100 } }, refundResult: { refunded: false, skipped: true, reason: "PASS_BUDGET_EXEMPT" } });
  await state.refundFortuneTeaHousePassSettlement({ auth: { userId: "user-1" }, resultId: RESULT_ID });
  expect(stored().passRefund).toMatchObject({ refunded: false, reason: "PASS_BUDGET_EXEMPT" });
  expect(stored().passRefund.refundedAt).toBeInstanceOf(Date);
});

test("다른 복구 경로가 이미 같은 증빙을 돌려줬으면 환불된 것으로 기록한다", async () => {
  const { state, stored } = boot({ doc: { passSettlement: { featureKey: "fortune-tea-house-saju-consultation", cycleKey: "cycle-1", cost: 100 } },
    refundResult: { refunded: false, skipped: true, reason: "PASS_EVIDENCE_ALREADY_REFUNDED" } });
  await state.refundFortuneTeaHousePassSettlement({ auth: { userId: "user-1" }, resultId: RESULT_ID });
  expect(stored().passRefund.refunded).toBe(true);
});

test("종결된 요청의 409 는 실제 환불이 기록된 때만 refunded 와 '돌려드렸어요' 안내를 싣는다", () => {
  expect(source).toMatch(/passRefunded: existing\.passRefund\.refunded === true/);
  const block = source.slice(source.indexOf("if (generation.passRefundedAt)"), source.indexOf("if (generation.passRefundedAt)") + 600);
  expect(block).toMatch(/reason: "PASS_ALREADY_REFUNDED"/);
  expect(block).toMatch(/refunded: generation\.passRefunded === true/);
  expect(block).toMatch(/generation\.passRefunded === true\s*\?\s*"이 상담은 생성에 실패해 이용권 한도를 돌려드렸어요/);
});

// S5: 환불 호출이 던지면 종결 표식이 없어 같은 결과가 다시 생성되거나 환불이 영영 안 됐다. 대기 표식을 남기고 다음 claim 이 생성 대신 환불을 다시 시도한다.
test("S5: 환불이 실패하면 대기 표식을 남기고 다음 claim 은 생성하지 않고 환불을 다시 시도한다", async () => {
  const { state, calls, stored } = boot({ doc: { passSettlement: { cycleKey: "cycle-1", cost: 100 } } });
  state.loadPassConsumption = async () => ({ refundPassCoverage: async () => { throw new Error("MONGO_DOWN"); } });
  await expect(state.refundFortuneTeaHousePassSettlement({ auth: { userId: "user-1" }, resultId: RESULT_ID })).rejects.toThrow("MONGO_DOWN");
  expect(calls.updateOne.at(-1).update.$set["passRefund.pendingAt"]).toBeInstanceOf(Date);
  expect(stored().passRefund?.refundedAt).toBeUndefined();
  const block = source.slice(source.indexOf("async function beginFortuneTeaHouseGeneration"), source.indexOf("const pending = existing?.status === \"delivery_pending\""));
  expect(block).toMatch(/existing\?\.passRefund\?\.pendingAt && !existing\.passRefund\.refundedAt[\s\S]{0,300}refundFortuneTeaHousePassSettlement\(/);
  expect(block.indexOf("passRefund?.pendingAt")).toBeLessThan(block.indexOf("isFreshFortuneTeaGeneration(existing)"));
});

// S13-L2: 대기 표식은 같은 결과의 다음 claim 에서만 재시도됐다 — 사용자가 돌아오지 않으면 이용권 한도가 영영 묶였다.
test("S13: 환불 크론은 대기 중인 이용권 환불을 같은 멱등 함수로 마저 돌려주고 종결 표식을 남긴다", async () => {
  const { state, calls, stored } = boot({ doc: { passSettlement: { cycleKey: "cycle-1", cost: 100 }, passRefund: { pendingAt: new Date(0), lastError: "MONGO_DOWN" } } });
  const outcomes = await state.retryPendingFortuneTeaHousePassRefunds({});
  expect(calls.find).toMatchObject({ serviceScope: "FORTUNE_TEA_HOUSE", "passRefund.pendingAt": { $exists: true }, "passRefund.refundedAt": { $exists: false } });
  expect(calls.refund).toEqual([{ userId: "user-1", cycleKey: "cycle-1", cost: 100, refundId: RESULT_ID }]);
  expect(stored().passRefund.refundedAt).toBeInstanceOf(Date);
  expect(outcomes).toEqual([{ service: "fortune-tea-house", refundStatus: "refunded" }]);
});

test("S13: 크론 재시도도 실패하면 대기로 남기고 다음 주기로 넘긴다", async () => {
  const { state, stored } = boot({ doc: { passSettlement: { cycleKey: "cycle-1", cost: 100 }, passRefund: { pendingAt: new Date(0) } } });
  state.loadPassConsumption = async () => ({ refundPassCoverage: async () => { throw new Error("MONGO_DOWN"); } });
  expect(await state.retryPendingFortuneTeaHousePassRefunds({})).toEqual([{ service: "fortune-tea-house", refundStatus: "pending" }]);
  expect(stored().passRefund?.refundedAt).toBeUndefined();
});

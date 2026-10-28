/** @jest-environment node */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// 실제 billing apply/완료 함수 본문을 실행한다. DB와 최하위 소비 함수만 메모리로 대체한다.
const source = fs.readFileSync(path.join(__dirname, "../../worker/routes/billing.js"), "utf8");
const ast = ts.createSourceFile("billing.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functions = ["handleDeferredUsageApply", "completeDeferredUsageRecord"].map(name => {
  const node = ast.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
  if (!node) throw new Error(name);
  return node.getText(ast);
}).join("\n");

test.each(["MEMBERSHIP_PASS", "MOONLIGHT_STONE", "DIRECT_KRW"])("%s apply response loss reuses completed record without consuming again", async (paymentMethod) => {
  let record = { _id: "record", userId: "owner", featureId: "fortune-tea-house-saju-consultation",
    requestId: "original-request", executionId: "execution", status: "paid_pending_generation",
    result: { deferredUsage: { paymentMethod } } };
  const consume = jest.fn(async (_request, _env, body) => {
    expect(body.requestId).toBe("original-request");
    expect(body.idempotencyKey).toBe("original-request");
    return { ok: true, data: { consumed: true } };
  });
  const state = {
    Date, readJson: async request => request.body,
    resolvePricingFromBody: () => ({ ok: true, pricing: { featureKey: record.featureId } }),
    requireBillingAuth: async () => ({ ok: true, auth: { userId: "owner" } }),
    resolveRequestId: (_request, body) => body.requestId,
    findDeferredUsageRecord: async () => record,
    deferredUsageSnapshot: value => value.result.deferredUsage,
    normalizeDeferredPaymentMethod: value => value,
    applyPaymentModeForDeferred: value => value,
    processCoinGateFromPricing: consume, readPayloadSafe: async value => value,
    markDeferredPaymentFulfilled: async () => {},
    success: data => ({ ok: true, data }), failure: (...args) => { throw new Error(JSON.stringify(args)); },
    PaidExecutionRecord: { findOneAndUpdate: (_filter, update) => ({ lean: async () => {
      record = { ...record, ...update.$set };
      return record;
    } }) },
  };
  vm.createContext(state);
  vm.runInContext(functions, state);
  const request = { body: { featureKey: record.featureId, requestId: "original-request", idempotencyKey: "original-request", resultId: "same-result" } };
  // 첫 결과를 호출자에게 전달하지 않아 응답 유실을 주입한다.
  await state.handleDeferredUsageApply(request, {});
  const recovered = await state.handleDeferredUsageApply(request, {});
  expect(recovered.ok).toBe(true);
  expect(recovered.data.status).toBe("completed");
  expect(record.resultId).toBe("same-result");
  expect(consume).toHaveBeenCalledTimes(1);
});


test("legacy joint recovery uses only the server-owned result product", async () => {
  const teaSource = fs.readFileSync(path.join(__dirname, "../../worker/routes/fortune-tea-house.js"), "utf8");
  const tree = ts.createSourceFile("tea.js", teaSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const names = ["expectedFortuneTeaHouseFeatureKey", "resolveFortuneTeaHouseFeatureKey", "verifyFortuneTeaHouseConsultAccess", "resumeConsultationOnServer"];
  const code = names.map(name => tree.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name).getText(tree).replace(/^export /, "")).join("\n");
  const oldKey = "fortune-tea-house-saju-consultation";
  const stored = { userId: "owner", featureKey: oldKey, generationCheckpoint: { requestBody: { featureKey: oldKey } } };
  let filter;
  const prices = [];
  const context = {
    Request, String, cleanText: value => String(value || "").trim(), FORTUNE_TEA_HOUSE_SCOPE: "FORTUNE_TEA_HOUSE",
    FORTUNE_TEA_HOUSE_FEATURE_KEYS: { saju: oldKey, sajuJoint: "fortune-tea-house-saju-joint-consultation" },
    FORTUNE_TEA_HOUSE_ALLOWED_FEATURE_KEYS: new Set([oldKey, "fortune-tea-house-saju-joint-consultation"]),
    getBillingFeaturePricing: ({ featureKey }) => { prices.push(featureKey); return { ok: false }; },
    json: (body, init) => ({ body, status: init?.status }),
    withMongoRetry: async (_env, fn) => fn(),
    honeyCollections: () => ({ results: { findOne: async query => { filter = query; return stored; } } }),
    handleConsult: async (_request, _env, _ctx, auth) => auth,
  };
  vm.createContext(context); vm.runInContext(code, context);
  const input = { consultationMode: "saju", sajuReportVersion: "saju-specialist-v2" };
  const forged = await context.verifyFortuneTeaHouseConsultAccess({}, {}, { featureKey: oldKey, legacyFeatureKey: oldKey }, input);
  expect(forged.response.status).toBe(400);
  expect(prices).toEqual([]);
  const auth = await context.resumeConsultationOnServer({}, { userId: "owner", resultId: "original" });
  expect(filter).toEqual({ userId: "owner", resultId: "original", serviceScope: "FORTUNE_TEA_HOUSE" });
  await context.verifyFortuneTeaHouseConsultAccess({}, {}, { featureKey: oldKey }, input, auth);
  expect(prices).toEqual([oldKey]);
});

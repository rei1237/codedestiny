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

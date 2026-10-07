/** @jest-environment node */
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import mongoose from "mongoose";
import { NewYearAiConsultation, LoveSecretAiConsultation, LifeBookAiConsultation } from "../../worker/lib/models.js";
import { normalizeConsultAccessType, resolveCanonicalEntitlement, resolveFeatureAccessPolicy } from "../../worker/lib/entitlement-policy.js";
import { consumePassForFeature, passDenialCode } from "../../worker/lib/pass-consumption.js";
import { getBillingFeaturePricing } from "../../worker/lib/billing-feature-registry.js";
import { makeFakePaymentDb, matches } from "../fixtures/fake-payment-db.mjs";

const USER = "64b000000000000000000001";
const services = [
  ["new-year-ai", "new-year-ai-consultation", NewYearAiConsultation],
  ["love-secret-ai", "love-secret-ai-consultation", LoveSecretAiConsultation],
  ["life-book-ai", "life-book-ai-consultation", LifeBookAiConsultation],
  ["life-book-ai", "life-fortune-ai-consultation", LifeBookAiConsultation],
];
const chain = value => ({ select: () => chain(value), sort: () => chain(value), lean: async () => value });
function load(route, name, context) {
  const file = `worker/routes/${route}.js`;
  const ast = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  if (!fn) throw new Error(`Missing ${name}`);
  vm.runInContext(fn.getText(ast), context);
  return context[name];
}
function fixture(route, featureKey, version = "flower-20260930", spent = 0) {
  const db = makeFakePaymentDb();
  const at = new Date(Date.now() + 86400000);
  const user = { _id: USER, profileSubscription: { tier: "family", passTier: "family", passPolicyVersion: version,
    expiresAt: at, premiumUseCycleKey: at.toISOString(), monthlySpendCoin: spent }, recentConsumeRequestIds: [] };
  db.rows.push(user);
  const cost = getBillingFeaturePricing({ featureKey }).pricing.cost;
  const pricing = { featureKey, coinPrice: cost };
  const saved = { id: "session", userId: USER, idempotencyKey: "original-consultation-request", accessType: "pass", usageAppliedAt: null };
  const model = { findOne: () => chain(saved), updateOne: async () => { saved.usageAppliedAt = new Date(); } };
  const context = vm.createContext({ Date, FEATURE_KEY: featureKey, ORDER_NAME: "상담", MESSAGES: {},
    clean: value => String(value || "").trim(), isAdmin: () => false,
    normalizeConsultAccessType, resolveCanonicalEntitlement, resolveFeatureAccessPolicy, passDenialCode,
    getPricing: () => pricing, getConsultationOrderName: () => "상담", getConsultationFeatureKey: () => featureKey,
    getAcceptedFeatureKeys: () => [featureKey], billingFeatureKeyOf: () => featureKey,
    withMongoRetry: async (_env, run) => run(), findPaidPayment: async () => null,
    resolveBillingGateAccess: async () => null, canAccessPaidFeature: async () => ({ allowed: false }),
    User: { findById: () => chain(db.rows[0]) },
    NewYearAiConsultation: { ...model, findOne: () => chain(null) }, LoveSecretAiConsultation: model, LifeBookAiConsultation: model,
    consumePassForFeature: input => consumePassForFeature({ ...input, db }),
  });
  return { db, user, context, pricing, saved, model, cost,
    resolve: load(route, "resolveServerAccess", context),
    apply: load(route, "applyUsageOnce", context),
  };
}

describe.each(services)("%s / %s Family 이용권", (route, featureKey, Model) => {
  test("실제 정책 판정은 상담 저장 스키마가 허용하는 pass를 반환한다", async () => {
    const f = fixture(route, featureKey);
    const access = await f.resolve({ env: {}, auth: { userId: USER }, user: f.user, pricing: f.pricing,
      idempotencyKey: f.saved.idempotencyKey, inputHash: "input", input: {}, body: {} });
    expect(access.ok).toBe(true);
    expect(access.accessType).toBe("pass");
    expect(new Model({ accessType: access.accessType }).validateSync(["accessType"])).toBeUndefined();
    expect(f.db.rows[0].profileSubscription.monthlySpendCoin).toBe(0);
  });

  test.each([["flower-20260930", 3500], ["flower-cost-20260921", 5000], ["legacy", 5000]])(
    "%s: 마지막 잔여 금액을 정확히 차감하고 응답 유실 재시도는 중복 차감하지 않는다", async (version, budget) => {
      const f = fixture(route, featureKey, version);
      f.db.rows[0].profileSubscription.monthlySpendCoin = budget - f.cost;
      f.context.NewYearAiConsultation = f.model;
      const input = { userId: USER, sessionId: f.saved.id, accessType: "pass", access: { accessType: "pass", accessSource: "license_pass" },
        pricing: f.pricing, idempotencyKey: f.saved.idempotencyKey, requestId: f.saved.idempotencyKey };
      await f.apply(input);
      expect(f.db.rows[0].profileSubscription.monthlySpendCoin).toBe(budget);
      f.saved.usageAppliedAt = null; // consumption committed, result marker response lost
      await f.apply(input);
      expect(f.db.rows[0].profileSubscription.monthlySpendCoin).toBe(budget);
      expect(f.db.rows[0].recentConsumeRequestIds).toEqual([`tier-pass:${featureKey}:${f.saved.idempotencyKey}`]);
    });

  test("잔여 한도가 부족하면 차감과 완료 표시를 모두 거절한다", async () => {
    const f = fixture(route, featureKey, "flower-20260930", 3500);
    f.context.NewYearAiConsultation = f.model;
    await expect(f.apply({ userId: USER, sessionId: f.saved.id, accessType: "pass", access: { accessType: "pass", accessSource: "license_pass" },
      pricing: f.pricing, idempotencyKey: f.saved.idempotencyKey, requestId: f.saved.idempotencyKey })).rejects.toMatchObject({ code: "MONTHLY_PASS_LIMIT_EXCEEDED" });
    expect(f.saved.usageAppliedAt).toBeNull();
    expect(f.db.rows[0].profileSubscription.monthlySpendCoin).toBe(3500);
  });
});

const evidenceHelpers = {
  "new-year-ai": ["asObject", "uniq", "objectIdLike", "readBillingContext", "collectBillingTokens", "readBillingAccessSignal", "pointHistoryTokenClauses", "deferredTokenClauses", "paymentTokenClauses", "normalizeBillingAccessType", "resolveBillingGateAccess"],
  "love-secret-ai": ["collectBillingEvidenceIds", "buildPaidExecutionEvidenceQuery", "buildPointHistoryEvidenceQuery", "buildPaymentEvidenceQuery", "mapBillingEvidenceAccessType", "resolveBillingUsageEvidence"],
  "life-book-ai": ["objectValue", "billingGateSource", "collectBillingObjects", "billingFeatureMatches", "addEvidenceId", "collectBillingEvidenceIds", "collectBillingContractValues", "billingContractMatches", "objectIdLike", "pointHistoryEvidenceClauses", "paymentEvidenceClauses", "billingContractEvidenceClauses", "mapBillingGateAccessType", "resolveBillingGateAccess"],
};
test.each(services)("%s / %s: 소진 뒤 실제 서버 증빙 조회로 같은 상담만 복구한다", async (route, featureKey) => {
  const f = fixture(route, featureKey);
  f.db.rows[0].profileSubscription.monthlySpendCoin = 3500 - f.cost;
  await consumePassForFeature({ db: f.db, user: f.user, entitlement: resolveCanonicalEntitlement(f.user),
    userId: USER, featureKey, requestId: f.saved.idempotencyKey, coinCost: f.cost });
  expect(resolveCanonicalEntitlement(f.db.rows[0]).isActive).toBe(false);
  const query = filter => chain(f.db.rows.find(row => matches(row, filter)) || null);
  Object.assign(f.context, { mongoose, SERVICE_KEY: route, objectOf: value => value || {},
    isObjectIdLike: value => mongoose.Types.ObjectId.isValid(value), normalizeConsultationType: value => value,
    connectDb: async () => {}, findMoonstoneSpendEvidence: async () => null,
    PointHistory: { findOne: query }, Payment: { findOne: () => chain(null) }, PaidExecutionRecord: { findOne: () => chain(null) },
  });
  for (const name of evidenceHelpers[route]) load(route, name, f.context);
  const run = (userId, requestId) => {
    const body = { serviceType: featureKey, requestId, idempotencyKey: requestId };
    return route === "love-secret-ai"
      ? f.context.resolveBillingUsageEvidence({}, { userId }, body)
      : f.context.resolveBillingGateAccess({ env: {}, auth: { userId }, user: f.db.rows[0], body,
        pricing: f.pricing, idempotencyKey: requestId, acceptedFeatureKeys: [featureKey] });
  };
  expect(await run(USER, f.saved.idempotencyKey)).toMatchObject({ ok: true, accessType: "pass" });
  expect(await run(USER, "different-request")).toBeNull();
  expect(await run("64b000000000000000000099", f.saved.idempotencyKey)).toBeNull();
  expect(f.db.rows[0].profileSubscription.monthlySpendCoin).toBe(3500);
});

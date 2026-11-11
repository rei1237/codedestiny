import { isFreeFortuneFeatureKey } from '../../lib/payment/free-fortune-policy.mjs';
/**
 * @jest-environment node
 *
 * 사주 영구 묶음(29,000원) 도입 뒤 포함 키의 개별 신규 판매는 닫힌다.
 * 닫는 것은 "새로 사는 일"뿐이다: 이미 산 키·묶음 보유 프로필·확정·환불·구매 증빙은 그대로다.
 * 이 파일은 코인 게이트·단건 시작·꿀방울·앱 결제·이용권 경로를 본다. 결제창(v2 주문) 쪽은
 * saju-bundle-sale-closed-v2.test.js 가 본다.
 */
import { jest } from "@jest/globals";
import { TEST_USER_ID, profileCardModel, testCard } from "../fixtures/profile-card-model.mjs";
import { SAJU_BUNDLE_ALIAS_MEMBER_KEYS, SAJU_BUNDLE_FEATURE_KEY, SAJU_BUNDLE_SALE_CLOSED_KEYS, isSajuBundleSaleClosed } from "../../worker/lib/saju-bundle-policy.js";

const rows = [];
const cards = [];
const userUpdateOne = jest.fn();
const authUserDoc = { _id: TEST_USER_ID, unlockedFeatures: [], paidFeatures: [], points: 0 };

function matchesFilter(doc, filter) {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === "$and") return condition.every((clause) => matchesFilter(doc, clause));
    if (key === "$or") return condition.some((clause) => matchesFilter(doc, clause));
    const value = doc[key];
    if (condition === null) return value === null || value === undefined;
    if (condition instanceof Date || typeof condition !== "object") return value === condition;
    if ("$in" in condition) return condition.$in.includes(value);
    if ("$gt" in condition) return value != null && value > condition.$gt;
    if ("$exists" in condition) return (value !== undefined) === condition.$exists;
    if ("$size" in condition) return Array.isArray(value) && value.length === condition.$size;
    throw new Error(`테스트 매처가 모르는 조건: ${key} ${JSON.stringify(condition)}`);
  });
}

const entitlementModel = {
  findOne(filter) {
    const query = {
      select: () => query,
      session: () => query,
      lean: async () => rows.find((row) => matchesFilter(row, filter)) || null,
    };
    return query;
  },
  find(filter) {
    const query = {
      select: () => query,
      lean: async () => rows.filter((row) => matchesFilter(row, filter)),
    };
    return query;
  },
  findOneAndUpdate(identity, update) {
    const run = async () => {
      let row = rows.find((candidate) => matchesFilter(candidate, identity));
      if (!row) {
        row = { ...identity, ...update.$setOnInsert };
        rows.push(row);
      }
      Object.assign(row, update.$set);
      return row;
    };
    const query = { session: () => query, lean: run, then: (resolve, reject) => run().then(resolve, reject) };
    return query;
  },
  updateMany(filter, update) {
    const run = async () => {
      const matched = rows.filter((row) => matchesFilter(row, filter));
      matched.forEach((row) => Object.assign(row, update.$set));
      return { matchedCount: matched.length, modifiedCount: matched.length };
    };
    const query = { session: () => query, then: (resolve, reject) => run().then(resolve, reject) };
    return query;
  },
};

let billingRoutes;
let billingUtils;
let grantPermanentUnlock;
let paymentsUtils;
let Payment;
let PointHistory;
let paymentCreate;
let pointHistoryCreate;

beforeAll(async () => {
  const actualModels = await import("../../worker/lib/models.js");
  const actualDb = await import("../../worker/lib/db.js");
  const actualAuth = await import("../../worker/lib/auth.js");
  const actualSecurity = await import("../../worker/lib/security/index.js");
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    ...actualDb,
    connectDb: async () => undefined,
    withMongoRetry: async (_env, callback) => callback(),
  }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    ...actualModels,
    ContentEntitlement: entitlementModel,
    ProfileCard: profileCardModel(cards),
    User: {
      updateOne: userUpdateOne,
      // 이미 가진 사용자 범위 권리를 응답에 싣는 읽기성 갱신. 차감이 아니므로 userUpdateOne과 분리한다.
      findByIdAndUpdate() {
        const query = { lean: async () => ({ unlockedFeatures: [] }) };
        return query;
      },
      findById() {
        const query = { select: () => query, lean: async () => ({ name: "테스트" }) };
        return query;
      },
    },
  }));
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    ...actualAuth,
    getOptionalUserFromRequest: async () => ({ userId: TEST_USER_ID, authUserDoc }),
    requireUserFromRequest: async () => ({ userId: TEST_USER_ID }),
  }));
  // 보안 단계(속도 제한·CSRF)는 이 파일의 관심사가 아니다.
  jest.unstable_mockModule("../../worker/lib/security/index.js", () => ({
    ...actualSecurity,
    enforceSensitiveEndpointSecurity: async () => ({ ok: true }),
  }));

  ({ grantPermanentUnlock } = await import("../../worker/lib/content-unlocks.js"));
  ({ handleBillingRoutes: billingRoutes, __billingTestUtils: billingUtils } = await import("../../worker/routes/billing.js"));
  ({ __paymentsTestUtils: paymentsUtils } = await import("../../worker/routes/payments.js"));
  ({ PointHistory, Payment } = await import("../../worker/lib/models.js"));
});

beforeEach(() => {
  rows.length = 0;
  cards.length = 0;
  cards.push(testCard("profile-1"), testCard("profile-2", { day: 18 }));
  userUpdateOne.mockReset();
  userUpdateOne.mockImplementation(() => {
    const query = { session: () => query, then: (resolve) => Promise.resolve({ modifiedCount: 0 }).then(resolve) };
    return query;
  });
  globalThis.__paidAccessDecisionCache?.entries?.clear?.();
  globalThis.__codeDestinyAccessUnlocksCache?.entries?.clear?.();
  const noPaidOrder = () => {
    const query = { sort: () => query, lean: async () => null };
    return query;
  };
  jest.spyOn(Payment, "findOne").mockImplementation(noPaidOrder);
  paymentCreate = jest.spyOn(Payment, "create").mockResolvedValue({});
  pointHistoryCreate = jest.spyOn(PointHistory, "create").mockResolvedValue({});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const grant = (featureKey, orderId, profileId = "profile-1") => grantPermanentUnlock({
  userId: TEST_USER_ID,
  profileId,
  featureKey,
  source: "PAYMENT",
  orderId,
});

async function coinGate(featureKey, extra = {}) {
  const response = await billingRoutes(new Request("https://example.test/api/billing/coin-gate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ featureKey, profileId: "profile-1", ...extra }),
  }), {}, {});
  return { status: response.status, payload: await response.json() };
}

const TEST_ENV = {
  PORTONE_STORE_ID: "test-store",
  PORTONE_CHANNEL_KEY: "test-channel",
  PORTONE_API_SECRET: "test-secret",
  MID: "test-mid",
  INIsignkey: "test-sign",
  INIAPIKEY: "test-api-key",
  INIAPI_IV: "test-api-iv",
};

async function singleStart(featureKey) {
  const response = await paymentsUtils.handleSinglePaymentStart(new Request("https://example.test/api/payments/single/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ profileId: "profile-1", featureKey }),
  }), TEST_ENV, { userId: TEST_USER_ID });
  return { status: response.status, payload: await response.json() };
}

const noSideEffects = () => {
  expect(paymentCreate).not.toHaveBeenCalled();
  expect(pointHistoryCreate).not.toHaveBeenCalled();
  expect(userUpdateOne).not.toHaveBeenCalled();
  expect(rows).toHaveLength(0);
};

test("판매 종료 키의 신규 코인 결제는 409이고 차감이 없다", async () => {
  for (const paymentMode of ["", "DIRECT_KRW", "coin"]) {
    const { status, payload } = await coinGate("section_daewun", paymentMode ? { paymentMode } : {});
    expect({ paymentMode, status, code: payload.code }).toEqual({ paymentMode, status: 409, code: "PRODUCT_SALE_ENDED" });
    expect(payload.bundleFeatureKey).toBe(SAJU_BUNDLE_FEATURE_KEY);
  }
  noSideEffects();
  // 프로필이 없어도(저장 전) 새로 사는 시도는 같은 안내를 받는다. 묶음도 프로필이 필요하니 안내가 먼저다.
  const withoutProfile = await coinGate("section_daewun", { profileId: "" });
  expect(withoutProfile).toMatchObject({ status: 409, payload: { code: "PRODUCT_SALE_ENDED", bundleFeatureKey: SAJU_BUNDLE_FEATURE_KEY } });
  // 묶음 자체는 닫히지 않는다.
  const bundle = await coinGate(SAJU_BUNDLE_FEATURE_KEY, { paymentMode: "DIRECT_KRW" });
  expect(bundle.payload.code).not.toBe("PRODUCT_SALE_ENDED");
});

test("판매 종료 키 18개 전부 코인 게이트에서 닫힌다", async () => {
  for (const key of SAJU_BUNDLE_SALE_CLOSED_KEYS) {
    const { status, payload } = await coinGate(key, { paymentMode: "DIRECT_KRW" });
    expect({ key, status, code: payload.code }).toEqual({ key, status: 409, code: isFreeFortuneFeatureKey(key) ? "FEATURE_NOW_FREE" : "PRODUCT_SALE_ENDED" });
  }
  noSideEffects();
});

test("이미 산 키는 already_unlocked로 그대로 열린다", async () => {
  await grant("section_daewun", "order-daewun");

  // 보유 판정이 판매 종료 판정보다 먼저다. 결제수단 필드가 무엇이든 산 것은 열린다.
  for (const paymentMode of ["", "DIRECT_KRW", "membership_pass", "coin"]) {
    const { status, payload } = await coinGate("section_daewun", paymentMode ? { paymentMode } : {});
    expect({ paymentMode, status, code: payload.code }).toEqual({ paymentMode, status: 200, code: undefined });
    expect(payload.data?.alreadyUnlocked).toBe(true);
  }
  expect(paymentCreate).not.toHaveBeenCalled();
});

test("묶음을 가진 프로필의 포함 키 요청은 already_unlocked다", async () => {
  await grant(SAJU_BUNDLE_FEATURE_KEY, "order-bundle");

  for (const key of SAJU_BUNDLE_ALIAS_MEMBER_KEYS) {
    const { status, payload } = await coinGate(key, { paymentMode: "DIRECT_KRW" });
    if (isFreeFortuneFeatureKey(key)) {
      expect(status).toBe(409); expect(payload.code).toBe("FEATURE_NOW_FREE");
      expect(payload.data?.alreadyUnlocked).not.toBe(true);
    } else expect({ key, status, alreadyUnlocked: payload.data?.alreadyUnlocked }).toEqual({ key, status: 200, alreadyUnlocked: true });
  }
  // 묶음에 들지 않은 판매 종료 키는 보유로 열리지 않으니 닫힌 채로 있다.
  const outside = await coinGate("tetogen_deep_report", { paymentMode: "DIRECT_KRW" });
  expect(outside).toMatchObject({ status: 409, payload: { code: "FEATURE_NOW_FREE" } });
  // 다른 출생 정보의 프로필은 묶음으로 열리지 않고 새로 사는 시도는 닫힌다.
  const other = await coinGate("section_daewun", { paymentMode: "DIRECT_KRW", profileId: "profile-2" });
  expect(other).toMatchObject({ status: 409, payload: { code: "PRODUCT_SALE_ENDED" } });
});

test("단건 시작도 닫힌 키는 409이고 보유·묶음 보유는 already_unlocked다", async () => {
  const closed = await singleStart("section_daewun");
  expect(closed).toMatchObject({ status: 409, payload: { code: "PRODUCT_SALE_ENDED", bundleFeatureKey: SAJU_BUNDLE_FEATURE_KEY } });
  expect(paymentCreate).not.toHaveBeenCalled();

  // 묶음은 계속 팔린다.
  const bundle = await singleStart(SAJU_BUNDLE_FEATURE_KEY);
  expect(bundle.status).toBe(201);
  expect(paymentCreate).toHaveBeenCalledTimes(1);
  expect(paymentCreate.mock.calls[0][0]).toMatchObject({ featureKey: SAJU_BUNDLE_FEATURE_KEY, paymentAmount: 29000 });
  paymentCreate.mockClear();

  await grant("section_daewun", "order-daewun");
  expect(await singleStart("section_daewun")).toMatchObject({ status: 200, payload: { alreadyUnlocked: true } });

  await grant(SAJU_BUNDLE_FEATURE_KEY, "order-bundle");
  expect(await singleStart("rpt_quantumCard")).toMatchObject({ status: 409, payload: { code: "FEATURE_NOW_FREE" } });
  expect(paymentCreate).not.toHaveBeenCalled();
});

test("꿀방울 카탈로그와 앱 티어에 포함 키 신규 판매가 없다", async () => {
  const { HONEY_UNLOCK_PRODUCTS, getHoneyUnlockProduct, isHoneySpendProduct } = await import("../../worker/lib/honey-unlock-catalog.js");
  const { unlockHoneyContent } = await import("../../worker/lib/honey-unlocks.js");

  expect(HONEY_UNLOCK_PRODUCTS.filter((product) => isSajuBundleSaleClosed(product.featureKey))).toEqual([]);
  for (const key of SAJU_BUNDLE_SALE_CLOSED_KEYS) {
    expect({ key, product: getHoneyUnlockProduct(key), spend: isHoneySpendProduct(key) }).toEqual({ key, product: null, spend: false });
  }
  // 점성·자미두수·숙요·베다 상품과 회당 상품은 남는다.
  for (const key of ["astro_basic_deep_pack", "ziwei_twelve_palaces", "sukuyo-nature-deep-dive", "vedic_basic_reading"]) {
    expect(getHoneyUnlockProduct(key)).toMatchObject({ featureKey: key });
  }

  // 꿀방울로 닫힌 키를 새로 열려는 요청은 지갑·원장·권한을 건드리기 전에 409다.
  const store = {
    transaction: async (run) => run({}),
    findProfile: async () => testCard("profile-1"),
    findUnlock: async () => null,
    grant: jest.fn(),
    ledgers: { findOne: jest.fn(async () => null), insertOne: jest.fn() },
    wallets: { updateOne: jest.fn() },
  };
  await expect(unlockHoneyContent({ userId: TEST_USER_ID, productId: "section_daewun", profileId: "profile-1", requestId: "honey-req-0001" }, store))
    .rejects.toMatchObject({ status: 409, payload: { code: "PRODUCT_SALE_ENDED", bundleFeatureKey: SAJU_BUNDLE_FEATURE_KEY } });
  expect(store.ledgers.insertOne).not.toHaveBeenCalled();
  expect(store.wallets.updateOne).not.toHaveBeenCalled();
  expect(store.grant).not.toHaveBeenCalled();

  // 이미 가진 것은 재요청이 그대로 열린다(0원 재생).
  store.findUnlock = async () => ({ evidenceId: "ev-1" });
  await expect(unlockHoneyContent({ userId: TEST_USER_ID, productId: "section_daewun", profileId: "profile-1", requestId: "honey-req-0002" }, store))
    .resolves.toMatchObject({ unlocked: true, spent: 0 });
});

test("앱 결제 의도도 닫힌 키는 409이고 묶음 티어는 그대로다", async () => {
  const { resolveAppContentTier } = await import("../../worker/lib/app-store-pricing.js");
  // 묶음 가격대(290코인)는 신규 티어 하나로 열려 있다.
  expect(resolveAppContentTier(290)).toMatchObject({ productId: "cd_content_tier_19", amountKRW: 29000 });
  const { appStoreSaleClosedFailure } = (await import("../../worker/routes/app-store.js")).__appStoreTestUtils;
  for (const key of SAJU_BUNDLE_SALE_CLOSED_KEYS) {
    expect({ key, closed: Boolean(appStoreSaleClosedFailure(key)) }).toEqual({ key, closed: true });
  }
  expect(appStoreSaleClosedFailure(SAJU_BUNDLE_FEATURE_KEY)).toBeNull();
  expect(appStoreSaleClosedFailure("astro_basic_deep_pack")).toBeNull();
});

test("활성 이용권은 묶음과 판매 종료 키를 공짜로 열지 않는다", async () => {
  const { getPaidFeaturePaymentPolicy } = await import("../../worker/lib/paid-feature-registry.js");
  const { listPassCostProducts } = await import("../../worker/lib/pass-cost-catalog.js");
  const { currentPassPlan } = await import("../../lib/payment/pass-policy.js");
  const plan = currentPassPlan("vvip");
  const covered = listPassCostProducts({ ...plan, tier: "family" }).map((product) => String(product.featureKey).split("::")[0]);
  const entitlement = { isActive: true, tier: "vvip", passTier: "vvip", maxCoveredCoin: 1000, passLimit: 1000 };
  const pricingFor = (featureKey, cost) => ({ featureKey, coinPrice: cost, cost });

  for (const [featureKey, cost] of [[SAJU_BUNDLE_FEATURE_KEY, 290], ...SAJU_BUNDLE_SALE_CLOSED_KEYS.map((key) => [key, 50])]) {
    expect({ featureKey, covered: covered.includes(featureKey) }).toEqual({ featureKey, covered: false });
    expect(getPaidFeaturePaymentPolicy(featureKey)).toMatchObject({ directOnly: true, monthlyExcluded: true, allowedPaymentMethods: ["DIRECT_KRW"] });
    expect(billingUtils.isPassExcludedPricing(pricingFor(featureKey, cost))).toBe(true);
    expect(billingUtils.buildPassPaymentDecision(entitlement, pricingFor(featureKey, cost), null)).toMatchObject({ canUseByPass: false });
  }

  // 같은 판정으로 실제 접근 결정도 이용권으로 열지 않는다(차감 없음).
  const decision = await billingUtils.resolvePaidContentAccess({}, {
    userId: TEST_USER_ID,
    profileId: "profile-1",
    pricing: pricingFor("section_daewun", 200),
    subscriptionPass: { isActive: true, tier: "vvip", passTier: "vvip", freeLimit: 1000, maxCoveredCoin: 1000, profileSubscription: null, entitlement },
    accountUnlockedFeatures: [],
    allowPassAutoUnlock: true,
  });
  expect(decision).toMatchObject({ accessGranted: false });
  expect(decision.reason).not.toBe("pass_covered");
  expect(userUpdateOne).not.toHaveBeenCalled();
  expect(rows).toHaveLength(0);
});

test("회당 키와 타로·숙요·베다·점성은 영향이 없다", async () => {
  const { getPaidFeaturePaymentPolicy } = await import("../../worker/lib/paid-feature-registry.js");
  const { resolveProduct } = await import("../../worker/payments/catalog.js");
  const representatives = [
    "fortune-chat-consultation", // 회당 상담
    "tarot-myeongri-three-card",
    "sukuyo-nature-deep-dive",
    "vedic_basic_reading",
    "astro_basic_deep_pack",
  ];
  for (const key of representatives) {
    expect({ key, closed: isSajuBundleSaleClosed(key) }).toEqual({ key, closed: false });
    expect(getPaidFeaturePaymentPolicy(key)).toMatchObject({ directOnly: false, allowedPaymentMethods: ["PASS", "DIRECT_KRW"] });
    expect(resolveProduct({ featureKey: key })).toMatchObject({ passExcluded: false, directOnly: false });
  }
  // 코인 게이트는 닫힌 키가 아닌 상품을 종전처럼 통과시킨다(판매 종료 응답이 아니다).
  const astro = await coinGate("astro_basic_deep_pack", { paymentMode: "DIRECT_KRW" });
  expect(astro.payload.code).not.toBe("PRODUCT_SALE_ENDED");
  expect((await singleStart("astro_basic_deep_pack")).payload.code).not.toBe("PRODUCT_SALE_ENDED");
});

/**
 * @jest-environment node
 *
 * 모든 유료 상품 × 4등급(v5): 클라 스냅샷 판정(resolveVerdict)과 서버 커버 판정(evaluatePassCoverage)이
 * 같은 답을 내야 한다. 둘이 어긋나면 "이용권으로 열린다"고 보여 놓고 결제창으로 튕기거나 그 반대가 된다.
 * 이용권 제외·판매 종료·패밀리 전용은 서버 pass-check 가 단건으로 돌린다(index.js 의 pass-check 분기 순서).
 */
import { createRequire } from "node:module";
import { listProducts } from "../../worker/payments/catalog.js";
import { evaluatePassCoverage } from "../../worker/payments/passes.js";
import { resolveCanonicalEntitlement } from "../../worker/lib/entitlement-policy.js";
import { isSajuBundleSaleClosed } from "../../worker/lib/saju-bundle-policy.js";
import { CURRENT_PASS_POLICY_VERSION, currentPassPlan } from "../../lib/payment/pass-policy.js";

const passVerdict = createRequire(import.meta.url)("../../js/core/pass-verdict.js");
const TIERS = ["standard", "premium", "vvip", "family"];
const EXPIRY = "2126-01-01T00:00:00.000Z";
const PRODUCTS = listProducts();

function holder(tier, spentCoin = 0) {
  const user = { _id: "64b000000000000000000009", profileSubscription: {
    tier, passTier: tier, passPolicyVersion: CURRENT_PASS_POLICY_VERSION, isActive: true,
    expiresAt: EXPIRY, premiumUseCycleKey: EXPIRY, monthlySpendCoin: spentCoin } };
  const snapshot = passVerdict.buildSnapshotFromStatus("u1", { tier, isActive: true, expiresAt: EXPIRY,
    passPolicyVersion: CURRENT_PASS_POLICY_VERSION, monthlySpendRemaining: currentPassPlan(tier).monthlyLimitCoin - spentCoin }, "test");
  return { user, entitlement: resolveCanonicalEntitlement(user), snapshot };
}
// 서버 pass-check 의 판정 순서: 이용권 제외 → 판매 종료(보유자 아님) → 패밀리 전용 → 커버 판정.
function serverCovers(product, { user, entitlement }, tier) {
  if (product.passExcluded || isSajuBundleSaleClosed(product.featureKey)) return false;
  if (product.familyPassOnly && tier !== "family") return false;
  return evaluatePassCoverage({ user, entitlement, coinCost: product.priceCoins, lightFortune: product.lightFortune }).covered;
}
const clientCovers = (product, { snapshot }) => passVerdict.resolveVerdict(snapshot, product.priceCoins, product.featureKey).coversNow;
const shared = PRODUCTS.filter((p) => !p.passExcluded && !p.familyPassOnly && !isSajuBundleSaleClosed(p.featureKey));

test.each(TIERS)("%s: client verdict matches server coverage for every pass-eligible product", (tier) => {
  const pass = holder(tier);
  const mismatched = shared.filter((p) => clientCovers(p, pass) !== serverCovers(p, pass, tier)).map((p) => p.featureKey);
  expect(shared.length).toBeGreaterThan(100);
  expect(mismatched).toEqual([]);
});

test("every pass-eligible product up to 10,000원 opens from the 중간 꿀단지 up, and to 5,000원 from the 작은 꿀단지", () => {
  const upTo10k = shared.filter((p) => p.priceKRW <= 10000);
  for (const tier of ["premium", "vvip", "family"]) expect(upTo10k.filter((p) => !serverCovers(p, holder(tier), tier)).map((p) => p.featureKey)).toEqual([]);
  expect(upTo10k.filter((p) => serverCovers(p, holder("standard"), "standard") !== (p.priceCoins <= 50)).map((p) => p.featureKey)).toEqual([]);
  expect(upTo10k.map((p) => p.featureKey)).toEqual(expect.arrayContaining(["fortune-tea-house-saju-consultation", "yeongnyangi-saju-mackerel"]));
});

test("excluded, sale-closed and Family-only products go to direct payment on non-Family passes", () => {
  const exclusive = PRODUCTS.filter((p) => !shared.includes(p));
  expect(exclusive.map((p) => p.featureKey)).toEqual(expect.arrayContaining(["profile-card-manage", "yeongnyangi-fusion-all"]));
  for (const tier of ["standard", "premium", "vvip"]) expect(exclusive.filter((p) => serverCovers(p, holder(tier), tier)).map((p) => p.featureKey)).toEqual([]);
});

test.each(TIERS)("%s: an exhausted budget or a remainder below the price sends both sides to direct payment", (tier) => {
  const budget = currentPassPlan(tier).monthlyLimitCoin;
  const product = shared.find((p) => !p.lightFortune && p.priceCoins === 50);
  for (const spent of [budget, budget - 40]) {
    const pass = holder(tier, spent);
    expect(serverCovers(product, pass, tier)).toBe(false);
    expect(clientCovers(product, pass)).toBe(false);
  }
  expect(serverCovers(product, holder(tier, budget - 50), tier)).toBe(true);
  expect(clientCovers(product, holder(tier, budget - 50))).toBe(true);
});

describe("server enforces passExcluded outside the pass-check route", () => {
  const excluded = PRODUCTS.filter((p) => p.passExcluded && !isSajuBundleSaleClosed(p.featureKey));
  const allowed = shared.find((p) => !p.lightFortune && p.priceCoins === 50);

  test.each(TIERS)("%s: evaluatePassCoverage refuses passExcluded with pass_excluded", (tier) => {
    const pass = holder(tier);
    expect(excluded.length).toBeGreaterThan(0);
    for (const p of excluded) {
      expect(evaluatePassCoverage({ ...pass, coinCost: p.priceCoins, passExcluded: true })).toMatchObject({ covered: false, reason: "pass_excluded" });
    }
  });

  test("consumePassForFeature does not debit a Family pass for excluded keys, still covers allowed keys and replays", async () => {
    const { consumePassForFeature } = await import("../../worker/lib/pass-consumption.js");
    const { buildPassConsumeMarker } = await import("../../worker/payments/passes.js");
    const { makeFakePaymentDb } = await import("../fixtures/fake-payment-db.mjs");
    const run = async (product, markers = []) => {
      const db = makeFakePaymentDb();
      const { user, entitlement } = holder("family");
      user.recentConsumeRequestIds = markers;
      db.rows.push(user);
      const result = await consumePassForFeature({ db, user, entitlement, userId: user._id,
        featureKey: product.featureKey, requestId: "excl-1", coinCost: product.priceCoins });
      return { result, spent: db.rows[0].profileSubscription.monthlySpendCoin };
    };
    for (const key of ["profile-card-manage", "neo-email-consultation"]) {
      const { result, spent } = await run(excluded.find((p) => p.featureKey === key));
      expect(result).toMatchObject({ covered: false, reason: "pass_excluded" });
      expect(spent).toBe(0);
    }
    const ok = await run(allowed);
    expect(ok.result.covered).toBe(true);
    expect(ok.spent).toBe(50);
    const replayed = await run(excluded.find((p) => p.featureKey === "profile-card-manage"),
      [buildPassConsumeMarker("profile-card-manage", "excl-1")]);
    expect(replayed.result).toMatchObject({ covered: true, replayed: true });
  });
});

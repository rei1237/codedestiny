import {
  SAJU_BUNDLE_FEATURE_KEY,
  SAJU_BUNDLE_ALIAS_MEMBER_KEYS,
  SAJU_BUNDLE_SALE_CLOSED_KEYS,
  isSajuBundleAliasMember,
  isSajuBundleSaleClosed,
} from "../../worker/lib/saju-bundle-policy.js";
import {
  UNLOCK_PRODUCT_BY_FEATURE_KEY,
  isBirthScopedUnlockFeatureKey,
  getPaidFeatureBillingType,
  findUnlockScopeClassificationProblems,
} from "../../worker/lib/paid-feature-registry.js";
import { resolveAppContentTier } from "../../worker/lib/app-store-pricing.js";

test("묶음 상품 가격과 범위", () => {
  expect(SAJU_BUNDLE_FEATURE_KEY).toBe("saju_lifetime_bundle");
  const spec = UNLOCK_PRODUCT_BY_FEATURE_KEY.saju_lifetime_bundle;
  expect(spec.cost).toBe(290);
  expect(spec.amountKRW).toBe(29000);
  expect(isBirthScopedUnlockFeatureKey("saju_lifetime_bundle")).toBe(true);
  expect(resolveAppContentTier(290)?.productId).toBe("cd_content_tier_19");
  expect(getPaidFeatureBillingType("saju_lifetime_bundle")).toBe("unlock");
  expect(findUnlockScopeClassificationProblems()).toEqual([]);
});

test("회당 상담은 묶음 대상이 아니다", () => {
  for (const key of ["saju_ai_question_prompt", "love-code", "compat-saju-compatibility", "life-book-ai-consultation"]) {
    expect(isSajuBundleAliasMember(key)).toBe(false);
    expect(isSajuBundleSaleClosed(key)).toBe(false);
  }
});

test("묶음 키 자체는 별칭 포함 키도 판매 종료 키도 아니다", () => {
  expect(isSajuBundleAliasMember(SAJU_BUNDLE_FEATURE_KEY)).toBe(false);
  expect(isSajuBundleSaleClosed(SAJU_BUNDLE_FEATURE_KEY)).toBe(false);
});

test("별칭 포함 키는 전부 출생 기반 영구 해금이다", () => {
  expect(SAJU_BUNDLE_ALIAS_MEMBER_KEYS).toHaveLength(12);
  for (const key of SAJU_BUNDLE_ALIAS_MEMBER_KEYS) {
    expect(isBirthScopedUnlockFeatureKey(key)).toBe(true);
    expect(isSajuBundleAliasMember(key)).toBe(true);
    expect(isSajuBundleSaleClosed(key)).toBe(true);
  }
});

test("판매 종료 키는 포함 키를 모두 담고 묶음 별칭 밖의 키 6개를 더한다", () => {
  const closed = new Set(SAJU_BUNDLE_SALE_CLOSED_KEYS);
  for (const key of SAJU_BUNDLE_ALIAS_MEMBER_KEYS) expect(closed.has(key)).toBe(true);
  for (const key of ["tetogen_deep_report", "fun.quantumLotto.ritualReport", "travelDestiny", "healthReport", "rpgCharacter", "secretHouseEpisodes"]) {
    expect(closed.has(key)).toBe(true);
    expect(isSajuBundleSaleClosed(key)).toBe(true);
  }
  expect(closed.size).toBe(18);
});

test("판정은 키 별칭을 정규화한 뒤 본다", () => {
  expect(isSajuBundleAliasMember(" section_summary ")).toBe(true);
  expect(isSajuBundleSaleClosed("tetogenDeepReport")).toBe(true);
  expect(isSajuBundleSaleClosed("openTetogenDeepReport")).toBe(true);
  expect(isSajuBundleAliasMember("tetogenDeepReport")).toBe(false);
  expect(isSajuBundleAliasMember("")).toBe(false);
  expect(isSajuBundleAliasMember(undefined)).toBe(false);
  expect(isSajuBundleSaleClosed(null)).toBe(false);
});

test("묶음 정책 모듈은 레지스트리만 가져온다", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(new URL("../../worker/lib/saju-bundle-policy.js", import.meta.url), "utf8");
  const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
  expect(imports).toEqual(["./paid-feature-registry.js"]);
});

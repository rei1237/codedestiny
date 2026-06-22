import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FEATURE_KEY_PRICE_TABLE,
  PAID_FEATURE_BILLING_TYPES,
  getPaidFeatureBillingType,
  isPerUsePaidFeatureKey,
  isUnlockPaidFeatureKey,
  UNLOCK_PRODUCT_BY_FEATURE_KEY,
} from "../worker/lib/paid-feature-registry.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(resolve(root, path), "utf8");

const destinyProfileSource = source("js/destiny-profile.js");
const physiognomySource = source("PhysiognomyUI.js");
const sajuEngineSource = source("js/saju-engine.js");
const sukuyoEngineSource = source("js/saju-engine-tarot-sukuyo-quantum.js");
const indexRuntimeSource = source("js/core/index-inline-runtime.js");
const billingSource = source("worker/routes/billing.js");
const workerAccessSource = source("worker/lib/access-control.js");
const premiumRouteAccessSource = source("app/_lib/premium-route-access.ts");
const kemetSource = source("js/oracle-kcg.js");
const tarotYearSource = source("js/tarot-year-fortune-experience.js");
const tarotLoveSource = source("js/tarot-love-experience.js");
const tarotReunionSource = source("js/tarot-reunion-experience.js");

const expectedCosts = {
  "tarot-year-fortune": 30,
  "tarot-love-relationship": 50,
  "tarot-reunion-reading": 50,
  openJuyukModal: 30,
  openKemetModal: 30,
  "animal-totem-basic": 30,
  "animal-totem-deep": 60,
  "flower-studio-per-use": 50,
  "sukuyo-symbolic-comparison": 50,
  "compat-astro-synastry": 50,
  "compat-astro-direct-synastry": 50,
  "compat-ziwei-compatibility": 50,
  "compat-saju-compatibility": 50,
  "compat-sukuyo-compatibility": 100,
  "premium-sukuyo-compat-extra": 120,
  "physiognomy-compatibility": 50,
  "physiognomy-pastlife-compatibility": 50,
  "profile-card-manage": 50,
};

for (const [featureKey, cost] of Object.entries(expectedCosts)) {
  assert.equal(FEATURE_KEY_PRICE_TABLE[featureKey]?.cost, cost, `${featureKey} must be priced by server registry`);
}

for (const featureKey of [
  "tarot-year-fortune",
  "tarot-love-relationship",
  "tarot-reunion-reading",
  "openJuyukModal",
  "openKemetModal",
  "animal-totem-basic",
  "animal-totem-deep",
  "compat-astro-synastry",
  "compat-astro-direct-synastry",
  "compat-ziwei-compatibility",
  "compat-saju-compatibility",
  "compat-sukuyo-compatibility",
  "profile-card-manage",
]) {
  assert.match(destinyProfileSource, new RegExp(featureKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${featureKey} must be resolved by common paid gate`);
}

assert.match(destinyProfileSource, /_dpResolvePaidGateReasonFeatureKey/, "common paid gate must resolve legacy paid reasons");
assert.match(physiognomySource, /featureKey:\s*['"]physiognomy-compatibility['"]/, "physiognomy compatibility must pass its canonical featureKey into billing gate");
assert.match(physiognomySource, /featureKey:\s*['"]physiognomy-pastlife-compatibility['"]/, "past-life physiognomy compatibility must pass its canonical featureKey into billing gate");
assert.match(destinyProfileSource, /PROFILE_CARD_MANAGE_FEATURE_KEY = 'profile-card-manage'/, "profile cards must use canonical billing key");
assert.match(destinyProfileSource, /featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY/, "profile card actions must pass featureKey into billing gate");
assert.match(destinyProfileSource, /\/api\/billing\/coin-gate/, "common paid gate must use worker billing coin-gate");

for (const [featureKey, entry] of Object.entries(FEATURE_KEY_PRICE_TABLE)) {
  if (Number(entry?.cost) <= 0) {
    assert.equal(getPaidFeatureBillingType(featureKey), "", `${featureKey} must not be classified as paid when priced free`);
    continue;
  }
  assert.ok(getPaidFeatureBillingType(featureKey), `${featureKey} must have a billing type`);
}

for (const featureKey of [
  "compat-astro-synastry",
  "compat-astro-direct-synastry",
  "compat-ziwei-compatibility",
  "compat-saju-compatibility",
  "compat-sukuyo-compatibility",
  "sukuyo-symbolic-comparison",
  "vedic-compatibility-per-use",
  "physiognomy-compatibility",
  "physiognomy-pastlife-compatibility",
  "tarot-prompt-maker",
  "saju_ai_prompt_generator",
  "ziwei_ai_prompt_generator",
  "astrology_ai_prompt_generator",
  "vedic_ai_prompt_generator",
  "profile-card-manage",
  "premium-sukuyo-compat-extra",
]) {
  assert.equal(UNLOCK_PRODUCT_BY_FEATURE_KEY[featureKey], undefined, `${featureKey} must not be an unlock product`);
  assert.equal(getPaidFeatureBillingType(featureKey), PAID_FEATURE_BILLING_TYPES.PER_USE, `${featureKey} must be per-use paid`);
  assert.equal(isPerUsePaidFeatureKey(featureKey), true, `${featureKey} must be per-use paid`);
  assert.equal(isUnlockPaidFeatureKey(featureKey), false, `${featureKey} must not persist unlock entitlement`);
}

assert.equal(FEATURE_KEY_PRICE_TABLE.sukuyo_ai_prompt_generator, undefined, "sukuyo_ai_prompt_generator must stay outside the paid registry");
assert.equal(getPaidFeatureBillingType("sukuyo_ai_prompt_generator"), "", "sukuyo_ai_prompt_generator must not be billed as paid");
assert.equal(isPerUsePaidFeatureKey("sukuyo_ai_prompt_generator"), false, "sukuyo_ai_prompt_generator must not be per-use paid");
assert.equal(isUnlockPaidFeatureKey("sukuyo_ai_prompt_generator"), false, "sukuyo_ai_prompt_generator must not persist unlock entitlement");

for (const featureKey of [
  "section_daewun",
  "section_summary",
  "section_compat",
  "flower-fc",
  "olympus-fc",
  "animal-destiny-unlock",
  "rpt_specialCharmCard",
  "fun.quantumLotto.ritualReport",
]) {
  assert.equal(getPaidFeatureBillingType(featureKey), PAID_FEATURE_BILLING_TYPES.UNLOCK, `${featureKey} must be an unlock feature`);
  assert.equal(isUnlockPaidFeatureKey(featureKey), true, `${featureKey} must persist unlock entitlement`);
}

assert.match(billingSource, /isUnlockPaidFeatureKey/, "worker billing must use registry unlock classification");
assert.doesNotMatch(billingSource, /PER_USE_PAID_FEATURE_KEYS = new Set/, "worker billing must not keep a local per-use list");
assert.match(billingSource, /persistProfileUnlockEntitlement && !profileId/, "profile-scoped unlocks must validate profile before payment");

const registrySource = source("worker/lib/paid-feature-registry.js");
for (const alias of [
  "openDestinyFlowerStudio",
  "openAstrologyFlowerStudio",
  "openJamidusuFlowerStudio",
  "openSukuyoFlowerStudio",
  "openOlympusOracleModal",
  "navigateToZiweiChart",
]) {
  assert.match(registrySource, new RegExp(`${alias}:`), `${alias} must resolve to a server priced feature`);
}
assert.doesNotMatch(registrySource, /openSibylModal:\s*"premium-sibyl-dominator"/, "free Sibyl entry must not be gated as paid");

for (const text of ["점성술 셜럭 시나스트리 궁합", "점성술 직접 입력 시나스트리 궁합", "자미두수 궁합 분석", "사주 궁합 분석"]) {
  assert.match(sajuEngineSource, new RegExp(text), `${text} must still call the common paid gate`);
}

assert.match(sukuyoEngineSource, /SY_PAID_FEATURES/, "Sukuyo runtime must centralize paid feature metadata");
assert.match(sukuyoEngineSource, /sukuyo-symbolic-comparison/, "Sukuyo symbolic comparison must use its canonical featureKey");
assert.match(sukuyoEngineSource, /compat-sukuyo-compatibility/, "Sukuyo base compatibility must use its 100-coin featureKey");
assert.match(sukuyoEngineSource, /premium-sukuyo-compat-extra/, "Sukuyo precision compatibility must use its 120-coin featureKey");
assert.match(sukuyoEngineSource, /syRequirePaidSukuyoFeature/, "Sukuyo paid extensions must pass through the paid gate");
assert.doesNotMatch(workerAccessSource, /featureKey:\s*["']premium-sukuyo-compat-extra["']/, "120-coin Sukuyo precision add-on must not authorize premium PDF access");
assert.doesNotMatch(premiumRouteAccessSource, /featureKey:\s*["']premium-sukuyo-compat-extra["']/, "Next PDF route access must not accept the 120-coin Sukuyo precision add-on");

assert.match(indexRuntimeSource, /애니멀 토템 리딩/, "animal totem runtime must still call common paid gate");
assert.match(kemetSource, /_cdCoinGatePerUse/, "Kemet oracle must still call common paid gate");
assert.match(tarotYearSource, /_cdCoinGatePerUse/, "year tarot must still call common paid gate");
assert.match(tarotLoveSource, /_cdCoinGatePerUse/, "love tarot must still call common paid gate");
assert.match(tarotReunionSource, /_cdCoinGatePerUse/, "reunion tarot must still call common paid gate");

console.log("[verify-paid-feature-billing-policy] PASS");

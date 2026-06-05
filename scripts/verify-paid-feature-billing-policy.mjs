import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FEATURE_KEY_PRICE_TABLE,
  UNLOCK_PRODUCT_BY_FEATURE_KEY,
} from "../worker/lib/paid-feature-registry.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(resolve(root, path), "utf8");

const destinyProfileSource = source("js/destiny-profile.js");
const sajuEngineSource = source("js/saju-engine.js");
const sukuyoEngineSource = source("js/saju-engine-tarot-sukuyo-quantum.js");
const indexRuntimeSource = source("js/core/index-inline-runtime.js");
const billingSource = source("worker/routes/billing.js");
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
  "compat-astro-synastry": 50,
  "compat-astro-direct-synastry": 50,
  "compat-ziwei-compatibility": 50,
  "compat-saju-compatibility": 50,
  "compat-sukuyo-compatibility": 50,
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
assert.match(destinyProfileSource, /PROFILE_CARD_MANAGE_FEATURE_KEY = 'profile-card-manage'/, "profile cards must use canonical billing key");
assert.match(destinyProfileSource, /featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY/, "profile card actions must pass featureKey into billing gate");
assert.match(destinyProfileSource, /\/api\/billing\/coin-gate/, "common paid gate must use worker billing coin-gate");

assert.equal(UNLOCK_PRODUCT_BY_FEATURE_KEY["compat-sukuyo-compatibility"], undefined, "sukuyo compatibility must not be an unlock product");
assert.match(billingSource, /PER_USE_PAID_FEATURE_KEYS = new Set/, "worker billing must explicitly separate per-use paid features");
assert.match(billingSource, /"compat-sukuyo-compatibility"/, "sukuyo compatibility must be classified as per-use paid");
assert.match(billingSource, /PER_USE_PAID_FEATURE_KEYS\.has\(key\)\) return false/, "per-use paid features must not persist profile unlock entitlements");
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

for (const text of ["숙요점 유명인 궁합", "숙요점 궁합 분석"]) {
  assert.match(sukuyoEngineSource, new RegExp(text), `${text} must still call the common paid gate`);
}

assert.match(indexRuntimeSource, /애니멀 토템 리딩/, "animal totem runtime must still call common paid gate");
assert.match(kemetSource, /_cdCoinGatePerUse/, "Kemet oracle must still call common paid gate");
assert.match(tarotYearSource, /_cdCoinGatePerUse/, "year tarot must still call common paid gate");
assert.match(tarotLoveSource, /_cdCoinGatePerUse/, "love tarot must still call common paid gate");
assert.match(tarotReunionSource, /_cdCoinGatePerUse/, "reunion tarot must still call common paid gate");

console.log("[verify-paid-feature-billing-policy] PASS");

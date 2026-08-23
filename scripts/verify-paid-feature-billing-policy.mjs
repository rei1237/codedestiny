import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
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
// 전생 관상은 2026-08 에 관상에서 분리된 독립 모달이다. 전생 궁합(회당 5,000원) 게이트도
// 함께 이 파일로 옮겨왔으므로, 결제 배선 단언은 이쪽을 봐야 한다.
const pastLifeFaceSource = source("PastLifeFaceUI.js");
const sajuEngineSource = source("js/saju-engine.js");
const sukuyoEngineSource = source("js/saju-engine-tarot-sukuyo-quantum.js");
const indexRuntimeSource = source("js/core/index-inline-runtime.js");
const billingSource = source("worker/routes/billing.js");
const workerAccessSource = source("worker/lib/access-control.js");
const kemetSource = source("js/oracle-kcg.js");
const tarotYearSource = source("js/tarot-year-fortune-experience.js");
const tarotLoveSource = source("js/tarot-love-experience.js");
const tarotReunionSource = source("js/tarot-reunion-experience.js");

const expectedCosts = {
  "tarot-year-fortune": 100,
  "tarot-love-relationship": 50,
  "tarot-reunion-reading": 50,
  openJuyukModal: 30,
  openKemetModal: 30,
  "animal-totem-basic": 30,
  "animal-totem-deep": 50,
  "sukuyo-symbolic-comparison": 50,
  "compat-astro-synastry": 50,
  "compat-astro-direct-synastry": 50,
  "compat-ziwei-compatibility": 50,
  "compat-saju-compatibility": 50,
  "compat-sukuyo-compatibility": 50,
  "premium-sukuyo-compat-extra": 100,
  "sukuyo-relationship-encyclopedia": 50,
  "physiognomy-compatibility": 50,
  "physiognomy-pastlife-compatibility": 50,
  "profile-card-manage": 50,
  // 작명(훈민정음 작명소) — 300코인 = 30,000원. 워커 라우트(worker/routes/naming-prompt.js)와
  // 프론트(app/naming-ai/NamingAiClient.tsx)가 이 값을 상수로 들고 있어 정본과 어긋나면
  // verifyPaymentShape 의 금액 대조가 400 으로 결제를 되돌린다.
  "premium-naming-prompt": 300,
};

for (const [featureKey, cost] of Object.entries(expectedCosts)) {
  assert.equal(FEATURE_KEY_PRICE_TABLE[featureKey]?.cost, cost, `${featureKey} must be priced by server registry`);
}

assert.equal(FEATURE_KEY_PRICE_TABLE["tarot-year-fortune"]?.amountKRW, 10000, "tarot-year-fortune must use KRW 10,000 for new purchases");

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
assert.match(pastLifeFaceSource, /featureKey:\s*['"]physiognomy-pastlife-compatibility['"]/, "past-life physiognomy compatibility must pass its canonical featureKey into billing gate");
assert.doesNotMatch(physiognomySource, /physiognomy-pastlife-compatibility/, "past-life compatibility gate must live in PastLifeFaceUI.js only (no duplicate gate left in PhysiognomyUI.js)");
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
  "saju_ai_prompt_generator",
  "ziwei_ai_prompt_generator",
  "astrology_ai_prompt_generator",
  "vedic_ai_prompt_generator",
  "sukuyo_ai_prompt_generator",
  "profile-card-manage",
  "premium-sukuyo-compat-extra",
]) {
  assert.equal(UNLOCK_PRODUCT_BY_FEATURE_KEY[featureKey], undefined, `${featureKey} must not be an unlock product`);
  assert.equal(getPaidFeatureBillingType(featureKey), PAID_FEATURE_BILLING_TYPES.PER_USE, `${featureKey} must be per-use paid`);
  assert.equal(isPerUsePaidFeatureKey(featureKey), true, `${featureKey} must be per-use paid`);
  assert.equal(isUnlockPaidFeatureKey(featureKey), false, `${featureKey} must not persist unlock entitlement`);
}

// 숙요 AI 상담은 2026-06-22에 무료로 뺐다가 2026-07-16 "숙요 유료화"로 되돌렸다(c0c46eb5).
// 그때 이 가드를 함께 갱신하지 않아 정책이 두 곳에서 서로 반대로 고정돼 있었다.
// 이제 형제 4종과 같은 per-use 목록에서 검사하므로 한쪽만 어긋날 수 없다. 가격 정본은 레지스트리다.

for (const featureKey of [
  "section_daewun",
  "section_summary",
  "section_compat",
  "flower-fc",
  "olympus-fc",
  "animal-destiny-unlock",
  "rpt_specialCharmCard",
  "fun.quantumLotto.ritualReport",
  "sukuyo-relationship-encyclopedia",
  "premium-fpti-report",
]) {
  assert.equal(getPaidFeatureBillingType(featureKey), PAID_FEATURE_BILLING_TYPES.UNLOCK, `${featureKey} must be an unlock feature`);
  assert.equal(isUnlockPaidFeatureKey(featureKey), true, `${featureKey} must persist unlock entitlement`);
}

// 타로 오라클 상담(구 "타로 프롬프트 라이브러리"): 1회 ₩10,000 영구 해금 → 회당 ₩5,000으로 다시 전환.
// 실제 Gemini 상담 생성이 붙어 매번 새로 만들어지는 개인화 콘텐츠가 됐으므로(B유형),
// 한계비용 0을 전제로 한 예전 영구 해금 판단이 더 이상 성립하지 않는다.
assert.equal(isPerUsePaidFeatureKey("tarot-prompt-maker"), true, "tarot-prompt-maker must be per-use, not a locked unlock");
assert.equal(isUnlockPaidFeatureKey("tarot-prompt-maker"), false, "tarot-prompt-maker must not persist unlock entitlement");

// FPTI 프리미엄 리포트: PDF 회당 과금 → 생년월일 시그니처 스코프 영구 잠금으로 전환됨.
assert.equal(isPerUsePaidFeatureKey("premium-fpti-report"), false, "premium-fpti-report must be a locked unlock, not per-use/pdf");

// 숙요 인연 도감은 잠금(영구 해금), 나머지 숙요 관계 3종은 회당 결제로 유지되어야 한다.
assert.equal(isPerUsePaidFeatureKey("sukuyo-relationship-encyclopedia"), false, "sukuyo relationship encyclopedia must be a locked unlock, not per-use");
for (const perUseKey of ["sukuyo-symbolic-comparison", "sukuyo-past-life-reading", "compat-sukuyo-compatibility"]) {
  assert.equal(isPerUsePaidFeatureKey(perUseKey), true, `${perUseKey} must stay per-use paid`);
  assert.equal(isUnlockPaidFeatureKey(perUseKey), false, `${perUseKey} must not persist unlock entitlement`);
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
assert.match(sukuyoEngineSource, /compat-sukuyo-compatibility/, "Sukuyo base compatibility must use its 50-coin featureKey");
assert.match(sukuyoEngineSource, /premium-sukuyo-compat-extra/, "Sukuyo precision compatibility must use its 100-coin featureKey");
assert.match(sukuyoEngineSource, /syRequirePaidSukuyoFeature/, "Sukuyo paid extensions must pass through the paid gate");
assert.doesNotMatch(workerAccessSource, /featureKey:\s*["']premium-sukuyo-compat-extra["']/, "100-coin Sukuyo precision add-on must not authorize premium PDF access");

assert.match(indexRuntimeSource, /애니멀 토템 리딩/, "animal totem runtime must still call common paid gate");
assert.match(kemetSource, /_cdCoinGatePerUse/, "Kemet oracle must still call common paid gate");
assert.match(tarotYearSource, /_cdCoinGatePerUse/, "year tarot must still call common paid gate");
assert.match(tarotLoveSource, /_cdCoinGatePerUse/, "love tarot must still call common paid gate");
assert.match(tarotReunionSource, /_cdCoinGatePerUse/, "reunion tarot must still call common paid gate");

// ── forceDeduct: false 는 '접근 확인'에만 허용한다 ────────────────────────────
//
// 🔴 실사고(2026-08-01): 마스터 인연의 서(300/500코인)와 자미두수 심층 PDF(300코인)가
//    결제 게이트 입력에 forceDeduct:false 를 넣고 있었다. 이 값은 공용 게이트에서
//    결제창을 여는 분기를 **전부** 끈다(app/_lib/billing-client.ts —
//    runPaidServiceRuntimePayment 즉시 null · shouldShowPayment · 선제 오픈 ·
//    402 후 폴백 오픈). 그래서 이용권 미보유 사용자는 결제창을 한 번도 못 보고
//    PAYMENT_VERIFY_FAILED 만 받았다 = 상품을 살 방법이 아예 없었다.
//
// 정당한 사용은 '차감 없는 접근 확인'뿐이고, 그 호출은 paymentMode 를 함께 명시한다
// (예: app/saju-guardian — paymentMode:"MEMBERSHIP_PASS" + forceDeduct:false).
// paymentMode 없이 forceDeduct:false 만 있으면 그건 결제창을 끈 체크아웃 경로다.
{
  const uiRoots = ["app", "src", "components"];
  const offenders = [];
  for (const uiRoot of uiRoots) {
    let entries = [];
    try {
      entries = readdirSync(resolve(root, uiRoot), { recursive: true, encoding: "utf8" });
    } catch {
      continue; // 디렉터리가 없으면 건너뛴다
    }
    for (const entry of entries) {
      const relativePath = `${uiRoot}/${String(entry).replace(/\\/g, "/")}`;
      if (!/\.(tsx?|jsx?)$/.test(relativePath)) continue;
      if (relativePath === "app/_lib/billing-client.ts") continue; // 게이트 구현 자체(정본)
      let text = "";
      try {
        text = source(relativePath);
      } catch {
        continue; // 디렉터리 엔트리 등
      }
      if (!/forceDeduct:\s*false/.test(text)) continue;
      const lines = text.split("\n");
      lines.forEach((line, index) => {
        if (!/forceDeduct:\s*false/.test(line)) return;
        // 같은 게이트 입력 객체 안에 paymentMode 가 있는지 본다(휴리스틱: ±20줄 창).
        const window = lines.slice(Math.max(0, index - 20), index + 21).join("\n");
        if (/paymentMode:\s*["']/.test(window)) return;
        offenders.push(`${relativePath}:${index + 1}`);
      });
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `결제 게이트 입력의 forceDeduct:false 는 결제창을 통째로 막습니다(상품을 살 수 없게 됩니다). `
    + `차감 없는 접근 확인이라면 paymentMode 를 함께 명시하세요. 위반: ${offenders.join(", ")}`,
  );
}

console.log("[verify-paid-feature-billing-policy] PASS");

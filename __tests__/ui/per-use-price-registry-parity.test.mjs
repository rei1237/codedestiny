// 2026-10-12 재가격 후속: 서버는 featureKey 로 레지스트리 가격을 차감한다(클라이언트 cost 는 무시).
// 화면 상수·게이트 인자가 레지스트리와 어긋나면 "3,000원" 보고 5,000원이 빠져나가므로 둘을 묶어 둔다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FEATURE_KEY_PRICE_TABLE } from "../../worker/lib/paid-feature-registry.js";

const QUANTUM = "js/saju-engine-tarot-sukuyo-quantum.js";
const sy = (key) => new RegExp(`key: '${key}', cost: (\\d+)`, "g");
const lock = (key) => new RegExp(`lockKey: '${key}',\\s*coinCost: (\\d+)`, "g");

// [featureKey, file, pattern, unit] — unit "coin" 은 cost, "krw" 는 amountKRW 와 비교한다.
const ROWS = [
  ["tetogen_deep_report", "js/entertain-engine.js", /TETOGEN_DEEP_REPORT_COST = (\d+);/g],
  ["tetogen_deep_report", "js/entertain-engine.js", /TETOGEN_DEEP_REPORT_KRW = (\d+);/g, "krw"],
  ["openJuyukModal", "js/iching-engine.js", /var _TC_COIN_COST = (\d+);/g],
  ["openKemetModal", "js/oracle-kcg.js", /var COST = (\d+);/g],
  ["royal-tea-oracle", "royal-tea-oracle.html", /var COST = (\d+);/g],
  ["ifa-oracle", "ifa_oracle_v2_full.html", /const IFA_COIN_COST=(\d+);/g],
  ["tarot-myeongri-three-card", QUANTUM, /MYEONGRI_TAROT_THREE_CARD_COST = (\d+);/g],
  ["tarot-myeongri-three-card", QUANTUM, /MYEONGRI_TAROT_THREE_CARD_AMOUNT_KRW = (\d+);/g, "krw"],
  ["sukuyo-symbolic-comparison", QUANTUM, sy("sukuyo-symbolic-comparison")],
  ["sukuyo-extreme-t-relationship", QUANTUM, sy("sukuyo-extreme-t-relationship")],
  ["sukuyo-relationship-encyclopedia", QUANTUM, sy("sukuyo-relationship-encyclopedia")],
  ["sukuyo-nature-deep-dive", QUANTUM, sy("sukuyo-nature-deep-dive")],
  ["sukuyo-past-life-reading", QUANTUM, sy("sukuyo-past-life-reading")],
  ["sukuyo-monthly-fortune", QUANTUM, sy("sukuyo-monthly-fortune")],
  ["compat-sukuyo-compatibility", QUANTUM, sy("compat-sukuyo-compatibility")],
  ["premium-sukuyo-compat-extra", QUANTUM, sy("premium-sukuyo-compat-extra")],
  ["sukyo_yearly_fortune_unlock", QUANTUM, /targetYear: targetYear,\s*coinPrice: (\d+),/g],
  ["sukyo_yearly_fortune_unlock", QUANTUM, /targetYear: targetYear,\s*coinPrice: \d+,\s*cost: \d+,\s*amountKrw: (\d+),/g, "krw"],
  ["sukuyo_ai_prompt_generator", QUANTUM, /featureKey: 'sukuyo_ai_prompt_generator',\s*reason: '[^']*',\s*cost: (\d+),/g],
  ["tarot-love-relationship", "js/tarot-love-experience.js", /LOVE_COIN_COST = (\d+);/g],
  ["tarot-year-fortune", "js/tarot-year-fortune-experience.js", /YEAR_COIN_COST = (\d+);/g],
  ["tarot-reunion-reading", "js/tarot-reunion-experience.js", /REUNION_COIN_COST = (\d+);/g],
  ["astrology_ai_prompt_generator", "js/saju-engine.js", /var ASTROLOGY_AI_PROMPT_COST = (\d+);/g],
  ["compat-ziwei-compatibility", "js/saju-engine.js", /var ZW_COMPAT_COST = (\d+);/g],
  ["ziwei_ai_prompt_generator", "js/saju-engine.js", /var _ZW_AI_PROMPT_COST = (\d+);/g],
  ["compat-saju-compatibility", "js/saju-engine.js", /var _SE_SAJU_COMPAT_COIN_COST = (\d+);/g],
  ["compat-astro-synastry", "js/saju-engine.js", /_cdCoinGatePerUse\((\d+), '점성술 셜럭 시나스트리 궁합'/g],
  ["compat-astro-direct-synastry", "js/saju-engine.js", /_cdCoinGatePerUse\((\d+), '점성술 직접 입력 시나스트리 궁합'/g],
  ["animal-totem-basic", "js/animal-totem-experience.js", /featureKey: "animal-totem-[a-z]+",\s*cost: (\d+),/g],
  ["animal-destiny-unlock", "js/core/saju/reportDashboard.js", lock("animal-destiny-unlock")],
  ["destiny_meeting_place", "js/core/saju/reportDashboard.js", lock("destiny_meeting_place")],
  ["love-code", "js/core/saju/reportDashboard.js", lock("love-code")],
  ["vedic_ai_prompt_generator", "vedic-astrology.html", /const VEDIC_AI_PROMPT_COST=(\d+);/g],
  ["vedic_ai_prompt_generator", "vedic-astrology.html", /const VEDIC_AI_PROMPT_AMOUNT_KRW=(\d+);/g, "krw"],
  ["vedic_prashna_prompt", "vedic-astrology.html", /const VEDIC_PRASHNA_PRICE=(\d+);/g],
  ["vedic_prashna_prompt", "vedic-astrology.html", /const VEDIC_PRASHNA_AMOUNT_KRW=(\d+);/g, "krw"],
  ["vedic-compatibility-per-use", "vedic-astrology.html", /const VEDIC_COMPAT_COST=(\d+);/g],
  ["vedic_basic_reading", "vedic-astrology.html", /var VEDIC_BASIC_COST=(\d+);/g],
  ["vedic_basic_reading", "vedic-astrology.html", /var VEDIC_BASIC_AMOUNT_KRW=(\d+);/g, "krw"],
  ["tarot-celestial-harmony", "celestial-harmony.html", /var COIN_COST=(\d+);/g],
  ["openGeomancyOracle", "geomancy-oracle-v4.html", /const GEOMANCY_COIN_COST = (\d+);/g],
  ["tarot-ijik", "tarot-ijik.html", /const IJIK_COIN_COST = (\d+);/g],
  ["neville-meditation", "neville-meditation.html", /var cost = (\d+);\s*\/\/[^\n]*\n\s*var paid = await _consumeMeditationCoin/g],
  ["yoga-guru-per-use", "yoga-guru.html", /const sessionCost = (\d+);/g],
  ["maya-prompt-generator", "index.html", /data-cd-price-key="maya-prompt-generator"[^>]*>1회 ([\d,]+)원/g, "krw"],
  ["ziwei_decade_luck", "js/saju-engine.js", /zwBasicPaidGateHtml\('ziwei_decade_luck', (\d+),/g],
  ["ziwei_love_deep", "js/saju-engine.js", /zwBasicPaidGateHtml\('ziwei_love_deep', (\d+),/g],
  ["ziwei_twelve_palaces", "js/saju-engine.js", /zwBasicPaidGateHtml\('ziwei_twelve_palaces', (\d+),/g],
  ["ziwei_symbolic_layer", "js/saju-engine.js", /zwBasicPaidGateHtml\('ziwei_symbolic_layer', (\d+),/g],
  ["ziwei_life_yearly_flow", "js/saju-engine.js", /zwBasicPaidGateHtml\('ziwei_life_yearly_flow', (\d+),/g],
  ["ziwei_decade_luck", "js/saju-engine.js", /data-unlock-key="ziwei_decade_luck"[^>]*data-unlock-cost="(\d+)"/g],
  ...["astro_career_talent_deep", "astro_talent_attraction_deep", "astro_relationship_deep", "astro_growth_shadow_deep",
    "astro_stellar_career_room", "astro_stellar_talent_room", "astro_stellar_relationship_room", "astro_stellar_growth_room",
    "astro_yearly_transit"].map((key) => [key, "js/saju-engine.js", new RegExp(`_astroCounselPaidGate\\('${key}', (\\d+),`, "g")]),
  ["physiognomy-compatibility", "PhysiognomyUI.js", /_cdCoinGatePerUse\((\d+), '관상 궁합 분석'/g],
  ["physiognomy-ogwan-mole-deep", "PhysiognomyUI.js", /_cdCoinGatePerUse\((\d+), '오관·점 정밀 분석'/g],
  ["physiognomy-ogwan-mole-deep", "PhysiognomyUI.js", /정밀 분석을 ([\d,]+)원에 열람/g, "krw"],
  ["physiognomy-pastlife-compatibility", "PastLifeFaceUI.js", /PLF_COMPAT_COIN_COST = (\d+);/g],
  ["physiognomy-pastlife-compatibility", "PastLifeFaceUI.js", /mode: 'compat',[^}]*price: '([\d,]+)원'/g, "krw"],
  ["compat-astro-synastry", "app/_lib/serviceFeatureRegistry.ts", /"기본 차트 무료", "궁합 ([\d,]+)원"/g, "krw"],
  ["tarot-prompt-maker", "app/_lib/serviceFeatureRegistry.ts", /"priceLabel": "([\d,]+)원~[\d,]+원",\s*"seo": \{\s*"title": "타로 오라클 상담/g, "krw"],
  ["tarot-prompt-maker-master", "app/_lib/serviceFeatureRegistry.ts", /"priceLabel": "[\d,]+원~([\d,]+)원",\s*"seo": \{\s*"title": "타로 오라클 상담/g, "krw"],
  ["animal-totem-basic", "app/_lib/serviceFeatureRegistry.ts", /"priceLabel": "([\d,]+)원",\s*"seo": \{\s*"title": "애니멀 토템 소개/g, "krw"],
];

test("per-use screen prices match the server registry", () => {
  const cache = new Map();
  for (const [featureKey, file, pattern, unit = "coin"] of ROWS) {
    const entry = FEATURE_KEY_PRICE_TABLE[featureKey];
    assert.ok(entry, `${featureKey} missing from registry`);
    if (!cache.has(file)) cache.set(file, readFileSync(file, "utf8"));
    const found = [...cache.get(file).matchAll(pattern)].map((m) => Number(m[1].replace(/,/g, "")));
    assert.ok(found.length > 0, `${featureKey}: pattern ${pattern} not found in ${file}`);
    const expected = unit === "krw" ? entry.amountKRW : entry.cost;
    for (const value of found) assert.equal(value, expected, `${featureKey} (${unit}) in ${file}`);
  }
});

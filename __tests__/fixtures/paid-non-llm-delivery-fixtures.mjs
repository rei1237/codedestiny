const sameSurface = (featureKey, billingType, file, ctaMarker, consumerMarker) => ({
  featureKey,
  billingType,
  cta: { file, marker: ctaMarker },
  consumer: { file, marker: consumerMarker },
});

const ASTROLOGY_STATIC_UNLOCKS = [
  "astro_career_talent_deep",
  "astro_talent_attraction_deep",
  "astro_relationship_deep",
  "astro_growth_shadow_deep",
  "astro_stellar_career_room",
  "astro_stellar_talent_room",
  "astro_stellar_relationship_room",
  "astro_stellar_growth_room",
].map((featureKey) => sameSurface(
  featureKey,
  "unlock",
  "js/saju-engine.js",
  `_astroCounselPaidGate('${featureKey}'`,
  "_astroCounselSection(",
));

const SUKUYO_STATIC_PRODUCTS = [
  ["sukuyo-extreme-t-relationship", "unlock", "SY_PAID_FEATURES.extremeTRelationshipCircuit"],
  ["sukuyo-relationship-encyclopedia", "unlock", "SY_PAID_FEATURES.relationshipEncyclopedia"],
  ["sukuyo-nature-deep-dive", "unlock", "SY_PAID_FEATURES.natureDeepDive"],
  ["sukuyo-past-life-reading", "per_use", "SY_PAID_FEATURES.pastLifeReading"],
  ["premium-sukuyo-compat-extra", "per_use", "SY_PAID_FEATURES.compatibilityPrecision"],
].map(([featureKey, billingType, ctaMarker]) => sameSurface(
  featureKey,
  billingType,
  "js/saju-engine-tarot-sukuyo-quantum.js",
  ctaMarker,
  "syRequirePaidSukuyoFeature(",
));

export const PAID_NON_LLM_DELIVERY_FIXTURES = Object.freeze([
  sameSurface(
    "love-code",
    "unlock",
    "app/saju/love-simulation/_components/LoveSimulationEngine.tsx",
    "runPaidAccessGate({",
    "startSimulationScene(",
  ),
  sameSurface(
    "ziwei-island-deep-report",
    "unlock",
    "app/island-consult/IslandConsultClient.tsx",
    "featureKey: REPORT_FEATURE_KEY",
    "setReport(data.report)",
  ),
  {
    featureKey: "vedic_basic_reading",
    billingType: "unlock",
    cta: { file: "vedic-astrology.html", marker: "window._cdOpenPaidServiceGate({" },
    consumer: { file: "vedic-astrology.html", marker: "else if(id==='personality')html=renderPersonality" },
  },
  {
    featureKey: "premium-sibyl-dominator",
    billingType: "unlock",
    cta: { file: "js/sibyl-system.js", marker: "window._cdOpenPaidServiceGate({" },
    consumer: { file: "worker/routes/sibyl.js", marker: "mapToSibylChapters" },
  },
  ...ASTROLOGY_STATIC_UNLOCKS,
  ...SUKUYO_STATIC_PRODUCTS,
  {
    featureKey: "sukyo_yearly_fortune_unlock",
    billingType: "unlock",
    cta: { file: "js/saju-engine-tarot-sukuyo-quantum.js", marker: "featureKey: 'sukyo_yearly_fortune_unlock'" },
    consumer: { file: "worker/routes/sukuyo.js", marker: "sukyo_yearly_fortune_unlock" },
  },
  sameSurface(
    "compat-astro-synastry",
    "per_use",
    "js/saju-engine.js",
    "featureKey: 'compat-astro-synastry'",
    "_astroPickCelebCore",
  ),
  sameSurface(
    "compat-astro-direct-synastry",
    "per_use",
    "js/saju-engine.js",
    "featureKey: 'compat-astro-direct-synastry'",
    "_astroDirectSynastryCore",
  ),
  sameSurface(
    "compat-ziwei-compatibility",
    "per_use",
    "js/saju-engine.js",
    "featureKey: 'compat-ziwei-compatibility'",
    "_runZwCompatibilityCore",
  ),
  sameSurface(
    "compat-saju-compatibility",
    "per_use",
    "js/saju-engine.js",
    "featureKey: 'compat-saju-compatibility'",
    "runCompatCore",
  ),
  sameSurface(
    "compat-sukuyo-compatibility",
    "per_use",
    "js/saju-engine-tarot-sukuyo-quantum.js",
    "SY_PAID_FEATURES.compatibility",
    "_triggerSynergyCheckCore",
  ),
  sameSurface(
    "vedic-compatibility-per-use",
    "per_use",
    "vedic-astrology.html",
    "featureKey:'vedic-compatibility-per-use'",
    "doCompatCalcCore",
  ),
  {
    featureKey: "tarot-year-fortune",
    billingType: "per_use",
    cta: { file: "index.html", marker: 'data-action="openTarotYearFortuneModal"' },
    consumer: { file: "worker/routes/tarot.js", marker: 'YEAR_TAROT_FEATURE_KEY = "tarot-year-fortune"' },
  },
  {
    featureKey: "tarot-crystal-soul-reading",
    billingType: "per_use",
    cta: { file: "js/core/index-inline-runtime.js", marker: "function startCrystalSoulTarot()" },
    consumer: { file: "worker/routes/tarot.js", marker: 'CRYSTAL_SOUL_FEATURE_KEY = "tarot-crystal-soul-reading"' },
  },
  {
    featureKey: "tarot-numerology-reading",
    billingType: "per_use",
    cta: { file: "app/tarot/numerology/NumerologyTarotClient.tsx", marker: 'FEATURE_KEY = "tarot-numerology-reading"' },
    consumer: { file: "worker/routes/tarot.js", marker: 'NUMEROLOGY_TAROT_READING_FEATURE_KEY = "tarot-numerology-reading"' },
  },
  {
    featureKey: "tarot-ijik",
    billingType: "per_use",
    cta: { file: "index.html", marker: 'data-action="startIjikTarot"' },
    consumer: { file: "worker/routes/tarot.js", marker: "buildIjikReading(cards)" },
  },
  sameSurface(
    "openJuyukModal",
    "per_use",
    "js/iching-engine.js",
    "featureKey: _TC_FEATURE_KEY",
    "function _renderResult(",
  ),
  sameSurface(
    "openKemetModal",
    "per_use",
    "js/oracle-kcg.js",
    "featureKey: 'openKemetModal'",
    "showKemetSpread",
  ),
  sameSurface(
    "stonehenge-runes-triad",
    "per_use",
    "StonehengeRune.jsx",
    "ensurePaidAccess({",
    "drawRunes",
  ),
  {
    featureKey: "maya-prompt-generator",
    billingType: "per_use",
    cta: { file: "src/components/maya/MayaPromptGeneratorCard.tsx", marker: "runBillingCoinGate({" },
    consumer: { file: "src/lib/maya-prompt-generator.ts", marker: "generateMayaReadingPrompt" },
  },
  sameSurface(
    "royal-tea-oracle",
    "per_use",
    "royal-tea-oracle.html",
    "runRoyalTeaGate",
    "buildCupMap",
  ),
  sameSurface(
    "ifa-oracle",
    "per_use",
    "ifa_oracle_v2_full.html",
    "ensureIfaCoinGate",
    "buildPatternDisplay",
  ),
]);

export const HISTORICAL_PAID_FEATURE_FIXTURES = Object.freeze([
  {
    featureKey: "palm-reading-ai-consult",
    billingType: "per_use",
    retained: { file: "worker/lib/billing-feature-registry.js", marker: "aiConsult: Object.freeze" },
    replacement: { file: "worker/routes/palm.js", marker: "구 palm-reading-ai-consult(별도 5,000원 과금)가 하던 일을 기본 분석에 통합했다" },
  },
  {
    featureKey: "human-design-chart",
    billingType: "per_use",
    retained: { file: "worker/routes/human-design.js", marker: 'ARCHIVE_ID_PREFIX = "human-design-chart"' },
    replacement: { file: "js/core/service-registry.js", marker: 'price: "무료 시작"' },
  },
  {
    featureKey: "sukuyo-symbolic-comparison",
    billingType: "per_use",
    retained: { file: "js/saju-engine-tarot-sukuyo-quantum.js", marker: "과거 결제 이력과 서버 레지스트리 정합성을 위해 키 정의만 남긴다(UI 미사용)" },
    replacement: { file: "js/saju-engine-tarot-sukuyo-quantum.js", marker: "pastLifeReading: { key: 'sukuyo-past-life-reading'" },
  },
]);

export const REGISTRY_ONLY_NON_LLM_KEYS = Object.freeze([
  "astro_basic_deep_pack",
  "astro_monthly_transit",
  "astro_yearly_transit",
  "turtleIChing",
  "egyptOracle",
  "egyptian_oracle_ai_prompt",
  "stonehengeRunes",
  "stonehenge-runes-ai-prompt",
  "sukuyo-monthly-fortune",
]);

export const ACTIVE_NON_LLM_ALIAS_FIXTURES = Object.freeze([
  { alias: "openLoveSimulation", canonical: "love-code", file: "index.html" },
  { alias: "openTarotYearFortuneModal", canonical: "tarot-year-fortune", file: "index.html" },
  { alias: "startCrystalSoulTarot", canonical: "tarot-crystal-soul-reading", file: "js/core/index-inline-runtime.js" },
  { alias: "startIjikTarot", canonical: "tarot-ijik", file: "js/core/index-inline-runtime.js" },
  { alias: "openRuneOracle", canonical: "stonehengeRunes", file: "index.html" },
  { alias: "openRoyalTeaOracle", canonical: "royal-tea-oracle", file: "royal-tea-oracle.html" },
  { alias: "openIfaOracle", canonical: "ifa-oracle", file: "ifa_oracle_v2_full.html" },
]);

export const ACTIVE_NON_LLM_FEATURE_KEYS = Object.freeze(
  PAID_NON_LLM_DELIVERY_FIXTURES.map(({ featureKey }) => featureKey),
);

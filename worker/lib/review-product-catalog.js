// 리뷰 대상 "상품" 카탈로그.
//
// paid-feature-registry의 featureKey는 150개가 넘는다(tarot-celestial-harmony,
// astro_stellar_career_room …). 그 단위로 리뷰를 모으면 상품당 리뷰 1~2개로 흩어져
// 평점이 무의미해지므로, 사용자가 실제로 인식하는 상품 그룹으로 묶는다.
//
// 프론트는 이 파일을 직접 import하지 않고 GET /api/reviews/products로 받는다
// (worker(.js) ↔ Next(.ts) 빌드 결합을 만들지 않기 위해서 — /api/billing/features와 같은 방식).

import { normalizePaidFeatureKey } from "./paid-feature-registry.js";

// featureKeys는 normalizePaidFeatureKey를 통과한 정본 키만 적는다.
// 별칭(gotoZiweiPremium 등)은 조회 시점에 정규화되므로 여기 나열하지 않는다.
export const REVIEW_PRODUCTS = Object.freeze([
  {
    productId: "saju-ai",
    name: "AI 사주 분석",
    summary: "사주팔자 여덟 글자로 타고난 기질과 지금의 흐름을 읽는 전문가 상담",
    href: "/saju",
    featureKeys: Object.freeze([
      "saju_ai_question_prompt",
      "saju-guardian-unlock",
      "animal-destiny-unlock",
      "destiny_meeting_place",
      "loveSimulation",
      "section_daewun",
      "section_summary",
      "allPaidSaju",
      "healthReport",
      "travelDestiny",
      "rpt_quantumCard",
      "rpt_healthReportCard",
      "rpt_skillTreeCard",
      "rpt_energyCoordCard",
      "rpt_villainCard",
      "rpt_specialCharmCard",
      "rpt_secretHouseEntryCard",
      "secretHouseEpisodes",
      "section_compat",
      "rpgCharacter",
      "fun.quantumLotto.ritualReport",
    ]),
  },
  {
    productId: "tarot",
    name: "타로 상담",
    summary: "카드가 짚어주는 지금의 상황과 다음 한 걸음",
    href: "/tarot",
    featureKeys: Object.freeze([
      "tarot-year-fortune",
      "tarot-love-relationship",
      "tarot-reunion-reading",
      "tarot-myeongri-three-card",
      "tarot-mindscan",
      "tarot-celestial-harmony",
      "tarot-crystal-soul-reading",
      "tarot-numerology-reading",
      "tarot-prompt-maker",
      "tarot-ijik",
      "premiumTarot",
    ]),
  },
  {
    productId: "ziwei",
    name: "자미두수 분석",
    summary: "12궁 명반과 사화의 흐름으로 삶의 영역별 운을 나눠 읽는 상담",
    href: "/ziwei-ai",
    featureKeys: Object.freeze([
      "ziwei-ai-consultation",
      "ziwei-deep-pdf",
      "ziwei_ai_prompt_generator",
      "ziwei_decade_luck",
      "ziwei_love_deep",
      "ziwei_twelve_palaces",
      "ziwei_symbolic_layer",
      "ziwei_life_yearly_flow",
      "premium-ziwei",
      "compat-ziwei-compatibility",
    ]),
  },
  {
    productId: "destiny-island",
    name: "운명의 섬",
    summary: "자미두수 12궁을 섬 지도로 펼쳐 보는 심층 상담",
    href: "/ziwei/island",
    featureKeys: Object.freeze([
      "ziwei-island-palace-consult",
      "ziwei-island-deep-report",
    ]),
  },
  {
    productId: "love-coach",
    name: "AI 연애 코치",
    summary: "연애 비책과 궁합 분석으로 관계의 결을 짚어주는 상담",
    href: "/love-secret-ai",
    featureKeys: Object.freeze([
      "love-secret-ai-consultation",
      "compat-saju-compatibility",
      "compat-astro-synastry",
      "compat-astro-direct-synastry",
      "compat-sukuyo-compatibility",
      "vedic-compatibility-per-use",
      "fortune-tea-house-saju-compatibility-consultation",
      "fortune-tea-house-sukuyo-compatibility-consultation",
      "physiognomy-compatibility",
      "physiognomy-pastlife-compatibility",
      "premium-veda-compatibility-addon",
      "premium-sukuyo-compat-extra",
    ]),
  },
  {
    productId: "astrology",
    name: "점성술 전문가 상담",
    summary: "출생 차트의 행성 배치와 트랜짓으로 읽는 서양 점성술 상담",
    href: "/astrology-ai",
    featureKeys: Object.freeze([
      "astrology-ai-consultation",
      "astrology_ai_prompt_generator",
      "astro_career_talent_deep",
      "astro_talent_attraction_deep",
      "astro_relationship_deep",
      "astro_growth_shadow_deep",
      "astro_basic_deep_pack",
      "astro_stellar_career_room",
      "astro_stellar_talent_room",
      "astro_stellar_relationship_room",
      "astro_stellar_growth_room",
      "astro_monthly_transit",
      "astro_yearly_transit",
      "premium-astrology",
    ]),
  },
  {
    productId: "vedic",
    name: "베다 점성술",
    summary: "인도 전통 베다 점성술로 보는 다샤와 인생의 큰 흐름",
    href: "/vedic-ai",
    featureKeys: Object.freeze([
      "vedic-ai-consultation",
      "vedic_ai_prompt_generator",
      "vedic_prashna_prompt",
      "premium-veda",
    ]),
  },
  {
    productId: "nakshatra",
    name: "나크샤트라 리딩",
    summary: "27개 별자리로 읽는 기질·궁합·택일",
    href: "/nakshatra",
    featureKeys: Object.freeze([
      "nakshatra-ai-consultation",
      "nakshatra-compat",
      "nakshatra-compat-ai",
      "nakshatra-muhurta",
      "nakshatra-vvip-codex",
      "nakshatra-lord-report",
      "nakshatra-dasha-map",
    ]),
  },
  {
    productId: "sukuyo",
    name: "숙요점 상담",
    summary: "달의 27수로 보는 인연과 관계의 결",
    href: "/sukuyo-compatibility-ai",
    featureKeys: Object.freeze([
      "sukuyo-compatibility-ai",
      "sukuyo_ai_prompt_generator",
      "sukuyo-symbolic-comparison",
      "sukuyo-extreme-t-relationship",
      "sukuyo-relationship-encyclopedia",
      "sukuyo-past-life-reading",
      "sukuyo-nature-deep-dive",
      "sukuyo-monthly-fortune",
      "sukyo_yearly_fortune_unlock",
      "premium-sukuyo",
    ]),
  },
  {
    productId: "karma-destiny",
    name: "운명의 업",
    summary: "전생의 업과 이번 생의 과제를 겹쳐 읽는 심층 상담",
    href: "/karma-destiny-ai",
    featureKeys: Object.freeze([
      "karma-destiny-ai-consultation",
    ]),
  },
  {
    productId: "life-book",
    name: "인생의 책",
    summary: "한 권의 리포트로 정리되는 인생 전체 흐름 PDF",
    href: "/life-book-ai",
    featureKeys: Object.freeze([
      "life-book-ai-consultation",
      "life-fortune-ai-consultation",
    ]),
  },
  {
    productId: "new-year",
    name: "신년운세",
    summary: "다가오는 한 해의 흐름과 달별 포인트",
    href: "/new-year-ai-consultation",
    featureKeys: Object.freeze([
      "new-year-ai-consultation",
    ]),
  },
  {
    productId: "neo-operation-room",
    name: "네오의 팩폭 작전실",
    summary: "돌려 말하지 않는 직설 전략 상담",
    href: "/neo-operation-room",
    featureKeys: Object.freeze([
      "neo-operation-room-consultation",
    ]),
  },
  {
    productId: "physiognomy",
    name: "관상 분석",
    summary: "얼굴의 오관과 점으로 읽는 기질과 흐름",
    href: "/physiognomy",
    featureKeys: Object.freeze([
      "physiognomy-ogwan-mole-deep",
    ]),
  },
  {
    productId: "palm-reading",
    name: "손금 분석",
    summary: "손금 사진으로 읽는 전체운과 전문가 해설",
    href: "/palm-reading",
    featureKeys: Object.freeze([
      "palm-reading-general",
      "palm-reading-ai-consult",
    ]),
  },
  {
    productId: "naming",
    name: "사주 맞춤 작명",
    summary: "사주에 맞춘 이름 후보와 풀이",
    href: "/naming-ai",
    featureKeys: Object.freeze([
      "premium-naming-prompt",
      "premium-naming",
    ]),
  },
  {
    productId: "fortune-tea-house",
    name: "운명 찻집",
    summary: "찻집에 앉아 나누는 사주·타로 상담",
    href: "/fortune-tea-house",
    featureKeys: Object.freeze([
      "fortune-tea-house-tarot-consultation",
      "fortune-tea-house-tarot-five-consultation",
      "fortune-tea-house-saju-consultation",
      "royal-tea-oracle",
    ]),
  },
  {
    productId: "oracle",
    name: "오라클·룬 리딩",
    summary: "주역·이집트 신탁·룬·지오맨시 등 고전 점술 리딩",
    href: "/oracle",
    featureKeys: Object.freeze([
      "openJuyukModal",
      "openKemetModal",
      "openGeomancyOracle",
      "turtleIChing",
      "egyptOracle",
      "egyptian_oracle_ai_prompt",
      "geomancy",
      "stonehengeRunes",
      "stonehenge-runes-single",
      "stonehenge-runes-triad",
      "stonehenge-runes-deep",
      "stonehenge-runes-yearly",
      "stonehenge-runes-ai-prompt",
      "ifa-oracle",
      "maya-prompt-generator",
      "animal-totem-basic",
      "animal-totem-deep",
      "olympus-fc",
      "premiumDivinationPack",
    ]),
  },
  {
    productId: "personality-report",
    name: "성향 리포트",
    summary: "FPTI·테토에겐·시빌라 등 성향 정밀 리포트",
    href: "/fpti",
    featureKeys: Object.freeze([
      "premium-fpti-report",
      "tetogen_deep_report",
      "premium-sibyl-dominator",
    ]),
  },
  {
    productId: "meditation",
    name: "명상·힐링",
    summary: "네빌·코스믹 소울 명상과 요가 구루 코스",
    href: "/meditation",
    featureKeys: Object.freeze([
      "neville-meditation",
      "cosmic-soul-meditation",
      "yoga-guru-per-use",
      "dream-psycho-analysis",
    ]),
  },
  {
    productId: "destiny-flower",
    name: "운명의 꽃 스튜디오",
    summary: "사주·별자리를 꽃으로 그려내는 스튜디오",
    href: "/flower",
    featureKeys: Object.freeze([
      "flower-studio-per-use",
      "flower-fc",
    ]),
  },
  {
    productId: "destiny-bias",
    name: "최애운명",
    summary: "최애와 나의 운명을 겹쳐 보는 심화 분석",
    href: "/destiny-bias",
    featureKeys: Object.freeze([
      "destiny-bias-analyze",
      "destiny-bias-theme-premium",
      "destiny-bias-collection-save",
      "destiny-bias-deep-profile",
    ]),
  },
  {
    productId: "destiny-compass",
    name: "운명의 나침반",
    summary: "갈림길 비교와 삶의 항로 안내",
    href: "/destiny-compass",
    featureKeys: Object.freeze([
      "destiny-compass-crossroads",
      "destiny-compass-life-voyage",
      "destiny-compass-future-sim",
      "destiny-compass-deep-report",
    ]),
  },
  {
    productId: "fusion-fortune",
    name: "초융합 운세",
    summary: "여섯 체계를 한 번에 엮어 읽는 심층 통합 리딩",
    href: "/fusion-fortune",
    featureKeys: Object.freeze([
      "fusion-fortune-consultation",
    ]),
  },
  {
    productId: "master-love-codex",
    name: "마스터 인연의 서",
    summary: "인연의 흐름과 궁합을 엮어 읽는 프리미엄 상담",
    href: "/master-love-codex",
    featureKeys: Object.freeze([
      "master-love-codex",
      "master-love-codex-compat",
    ]),
  },
  {
    productId: "fortune-chat",
    name: "연이 운명 상담",
    summary: "연이와 나누는 실시간 대화형 운세 상담",
    href: "/fortune-chat",
    featureKeys: Object.freeze([
      "fortune-chat-consultation",
    ]),
  },
  {
    productId: "pet-saju",
    name: "반려동물 사주",
    summary: "반려동물의 사주와 궁합을 읽는 AI 상담",
    href: "/pet-saju.html",
    featureKeys: Object.freeze([
      "pet-saju-ai-consultation",
      "pet-compatibility-ai",
    ]),
  },
]);

// 레지스트리에는 있지만 리뷰 상품으로 다루지 않는 featureKey. 정방향 커버리지
// 테스트(__tests__/worker/review-catalog-moderation.test.js)가 "미분류"를 잡아내므로,
// 의도적으로 뺀 키는 반드시 여기에 사유와 함께 등록한다.
export const REVIEW_EXCLUDED_FEATURE_KEYS = Object.freeze([
  // 레거시 호환 전용 — Fortune Planner가 이 키를 읽거나 과금하지 않는다(paid-feature-registry.js 주석).
  "sajuDiary",
  // 프로필 카드 추가/수정/삭제라는 UI 조작 과금이라 "상담·리포트 후기" 성격과 맞지 않는다.
  "profile-card-manage",
]);

const PRODUCT_BY_ID = Object.freeze(
  REVIEW_PRODUCTS.reduce((acc, product) => {
    acc[product.productId] = product;
    return acc;
  }, Object.create(null)),
);

// featureKey → product 역인덱스. 한 featureKey는 한 그룹에만 속한다(중복 선언 시 먼저
// 선언된 그룹이 이기지만, 카탈로그는 중복 없이 유지한다 — scripts로 검증 가능).
const PRODUCT_BY_FEATURE_KEY = Object.freeze(
  REVIEW_PRODUCTS.reduce((acc, product) => {
    for (const rawKey of product.featureKeys) {
      const key = normalizePaidFeatureKey(rawKey);
      if (key && !acc[key]) acc[key] = product;
    }
    return acc;
  }, Object.create(null)),
);

export function getReviewProduct(productId) {
  const id = String(productId || "").trim();
  if (!id) return null;
  return PRODUCT_BY_ID[id] || null;
}

export function isReviewProductId(productId) {
  return Boolean(getReviewProduct(productId));
}

export function resolveReviewProductByFeatureKey(featureKey) {
  const key = normalizePaidFeatureKey(featureKey);
  if (!key) return null;
  return PRODUCT_BY_FEATURE_KEY[key] || null;
}

// ContentEntitlement는 featureKey가 아니라 contentKey/serviceKey로 남는다
// (saju.daeunAnalysis, ziwei.decadeLuck …). 접두사로 상품 그룹을 되짚는다.
const SERVICE_KEY_PRODUCT_MAP = Object.freeze({
  saju: "saju-ai",
  ziwei: "ziwei",
  tarot: "tarot",
  astro: "astrology",
  astrology: "astrology",
  vedic: "vedic",
  veda: "vedic",
  sukuyo: "sukuyo",
  nakshatra: "nakshatra",
  fpti: "personality-report",
  tetogen: "personality-report",
  sibyl: "personality-report",
  palm: "palm-reading",
  physiognomy: "physiognomy",
  naming: "naming",
  flower: "destiny-flower",
  compass: "destiny-compass",
  bias: "destiny-bias",
});

export function resolveReviewProductByContentKey(contentKey, serviceKey) {
  const direct = resolveReviewProductByFeatureKey(contentKey);
  if (direct) return direct;

  const namespace = String(serviceKey || contentKey || "").trim().split(".")[0].toLowerCase();
  const productId = SERVICE_KEY_PRODUCT_MAP[namespace];
  return productId ? getReviewProduct(productId) : null;
}

export function listReviewProductSummaries() {
  return REVIEW_PRODUCTS.map((product) => ({
    productId: product.productId,
    name: product.name,
    summary: product.summary,
    href: product.href,
  }));
}

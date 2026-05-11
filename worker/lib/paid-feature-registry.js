const INTERNAL_FRONTEND_FEATURE_KEYS = [
  "coin-gate-per-use",
  "openGeomancyOracle",
  "openJuyukModal",
  "openKemetModal",
  "loveSimulation",
  "turtleIChing",
  "egyptOracle",
  "geomancy",
  "stonehengeRunes",
  "premiumTarot",
  "tarot-year-fortune",
  "tarot-love-relationship",
  "tarot-reunion-reading",
  "tarot-mindscan",
  "tarot-celestial-harmony",
  "tarot-crystal-soul-reading",
  "tarot-ijik",
  "fortune-fish-gacha",
  "royal-tea-oracle",
  "yoga-guru-per-use",
  "vedic-compatibility-per-use",
  "palm-reading-general",
  "palm-reading-love",
  "palm-reading-wealth",
  "palm-reading-career",
  "palm-reading-personality",
  "palm-reading-relationship",
  "premium-love-secret-solo",
  "premium-love-secret-couple",
  "premium-sukuyo-compat-extra",
  "premium-veda-compatibility-addon",
];

export const COIN_GATE_PER_USE_REASON_COSTS = Object.freeze({
  "애니멀 토템 리딩": 30,
  "인생의 책 생성 (13챕터)": 490,
  "시빌라 도미네이터 리포트": 100,
  "점성술 셜럭 시나스트리 궁합": 50,
  "점성술 직접 입력 시나스트리 궁합": 50,
  "자미두수 궁합 분석": 50,
  "사주 궁합 분석": 50,
  "숙요점 유명인 궁합": 50,
  "숙요점 궁합 분석": 50,
});

export const FEATURE_KEY_REASON_COSTS = Object.freeze({
  "yoga-guru-per-use": Object.freeze({
    "openYogaGuru 30분 코스": 30,
    "openYogaGuru 60분 코스": 50,
  }),
});

export const FEATURE_KEY_PRICE_TABLE = Object.freeze({
  "tarot-year-fortune": { cost: 30, reason: "십이지신 천운 타로" },
  "tarot-love-relationship": { cost: 50, reason: "우리는 무슨 사이? 타로 리딩" },
  "tarot-reunion-reading": { cost: 50, reason: "재회운 타로 리딩" },
  "tarot-mindscan": { cost: 50, reason: "마인드 스캔 타로 리딩" },
  "tarot-celestial-harmony": { cost: 100, reason: "셀레스티얼 하모니 타로 리딩" },
  "tarot-crystal-soul-reading": { cost: 50, reason: "크리스탈 소울 타로 리딩" },
  "tarot-ijik": { cost: 50, reason: "이직 타로 리딩" },
  "fortune-fish-gacha": { cost: 5, reason: "포춘텔러 피쉬 행운 가챠" },
  "royal-tea-oracle": { cost: 30, reason: "영국 홍차점 리딩" },
  "yoga-guru-per-use": { cost: 30, reason: "요가 구루 30분 코스" },
  "vedic-compatibility-per-use": { cost: 50, reason: "베다점 궁합 분석" },
  openJuyukModal: { cost: 30, reason: "주역 거북점 리딩" },
  openKemetModal: { cost: 30, reason: "이집트 신탁 리딩" },
  openGeomancyOracle: { cost: 50, reason: "지오맨시 오라클 리딩" },
  loveSimulation: { cost: 100, reason: "LOVE CODE 사주 연애 시뮬레이션" },
  turtleIChing: { cost: 30, reason: "주역 거북점 리딩" },
  egyptOracle: { cost: 30, reason: "이집트 신탁 리딩" },
  geomancy: { cost: 50, reason: "지오맨시 오라클 리딩" },
  stonehengeRunes: { cost: 50, reason: "스톤헨지 룬 리딩" },
  premiumTarot: { cost: 100, reason: "프리미엄 타로 리딩" },
  "palm-reading-general": { cost: 50, reason: "손금 전체운 분석" },
  "palm-reading-love": { cost: 30, reason: "손금 연애운 분석" },
  "palm-reading-wealth": { cost: 30, reason: "손금 재물운 분석" },
  "palm-reading-career": { cost: 30, reason: "손금 직업운 분석" },
  "palm-reading-personality": { cost: 30, reason: "손금 성격 분석" },
  "palm-reading-relationship": { cost: 30, reason: "손금 관계 패턴 분석" },
  "premium-love-secret-solo": { cost: 300, reason: "사주 프리미엄 연애운 리포트 생성" },
  "premium-love-secret-couple": { cost: 500, reason: "사주 프리미엄 궁합 리포트 생성" },
  "premium-sukuyo-compat-extra": { cost: 300, reason: "숙요점 궁합 확장 분석 추가" },
  "premium-veda-compatibility-addon": { cost: 300, reason: "프리미엄 베다점 궁합 확장 분석 추가" },
});

export const PIG_COIN_UNLOCK_PRODUCTS = Object.freeze({
  "unlock.section_daewun": { featureKey: "section_daewun", cost: 50, reason: "Section daewun unlock", forceDeduct: true },
  "unlock.section_summary": { featureKey: "section_summary", cost: 50, reason: "Section summary unlock", forceDeduct: true },
  "unlock.section_compat": { featureKey: "section_compat", cost: 50, reason: "Section compat unlock", forceDeduct: true },
  "unlock.flower_fc": { featureKey: "flower-fc", cost: 200, reason: "Destiny flower atelier full unlock", forceDeduct: true },
  "unlock.olympus_fc": { featureKey: "olympus-fc", cost: 100, reason: "Olympus profile unlock", forceDeduct: true },
  "unlock.all_paid_saju": { featureKey: "allPaidSaju", cost: 700, reason: "All paid saju unlock", forceDeduct: true },
  "unlock.rpg_character": { featureKey: "rpgCharacter", cost: 50, reason: "RPG character unlock", forceDeduct: true },
  "unlock.travel_destiny": { featureKey: "travelDestiny", cost: 100, reason: "Travel destiny unlock", forceDeduct: true },
  "unlock.health_report": { featureKey: "healthReport", cost: 100, reason: "Health report unlock", forceDeduct: true },
  "unlock.saju_diary": { featureKey: "sajuDiary", cost: 200, reason: "Saju diary unlock", forceDeduct: true },
  "unlock.secret_house_episodes": { featureKey: "secretHouseEpisodes", cost: 100, reason: "Secret house episodes unlock", forceDeduct: true },
  "unlock.premium_divination_pack": { featureKey: "premiumDivinationPack", cost: 300, reason: "Premium divination pack unlock", forceDeduct: true },
  "unlock.premium_ziwei": { featureKey: "premium-ziwei", cost: 500, reason: "Premium ziwei unlock", forceDeduct: true },
  "unlock.premium_astrology": { featureKey: "premium-astrology", cost: 390, reason: "Premium astrology unlock", forceDeduct: true },
  "unlock.premium_sukuyo": { featureKey: "premium-sukuyo", cost: 390, reason: "Premium sukuyo unlock", forceDeduct: true },
  "unlock.premium_veda": { featureKey: "premium-veda", cost: 390, reason: "Premium veda unlock", forceDeduct: true },
  "unlock.premium_naming": { featureKey: "premium-naming", cost: 700, reason: "Premium naming unlock", forceDeduct: true },
});

export const UNLOCK_PRODUCT_BY_FEATURE_KEY = Object.freeze(
  Object.values(PIG_COIN_UNLOCK_PRODUCTS).reduce((acc, spec) => {
    const key = String(spec?.featureKey || "").trim();
    if (key && !acc[key]) acc[key] = spec;
    return acc;
  }, Object.create(null)),
);

export function resolveFeatureReasonCost(featureKey, reason) {
  const key = String(featureKey || "").trim();
  const reasonText = String(reason || "").trim();
  if (!key || !reasonText) return null;

  const table = FEATURE_KEY_REASON_COSTS[key] || null;
  if (!table) return null;

  const matched = Number(table[reasonText]);
  if (!Number.isFinite(matched) || matched <= 0) return null;
  return matched;
}

export function listServerPricedFeatureKeys() {
  const keys = new Set([
    "coin-gate-per-use",
    ...Object.keys(FEATURE_KEY_PRICE_TABLE),
    ...Object.keys(UNLOCK_PRODUCT_BY_FEATURE_KEY),
  ]);
  return Array.from(keys).sort();
}

export const FRONTEND_PAID_FEATURE_KEYS = Object.freeze(
  Array.from(new Set(INTERNAL_FRONTEND_FEATURE_KEYS)).sort(),
);

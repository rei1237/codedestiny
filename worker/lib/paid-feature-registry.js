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
  "tarot-numerology-reading",
  "tarot-prompt-maker",
  "tarot-ijik",
  "fortune-fish-gacha",
  "royal-tea-oracle",
  "ifa-oracle",
  "neville-meditation",
  "cosmic-soul-meditation",
  "yoga-guru-per-use",
  "vedic-compatibility-per-use",
  "stonehenge-runes-single",
  "stonehenge-runes-triad",
  "stonehenge-runes-deep",
  "stonehenge-runes-yearly",
  "animal-totem-basic",
  "animal-totem-deep",
  "animal-destiny-unlock",
  "destiny_meeting_place",
  "palm-reading-general",
  "palm-reading-love",
  "palm-reading-wealth",
  "palm-reading-career",
  "palm-reading-personality",
  "palm-reading-relationship",
  "premium-love-secret-solo",
  "premium-love-secret-couple",
  "saju_life_book_pdf",
  "premium-lifebook-report",
  "premium_pdf_saju_life_book",
  "saju_new_year_pdf",
  "premium-saju-newyear-report",
  "premium_pdf_saju_new_year",
  "premium-sibyl-dominator",
  "premium-ziwei-report",
  "premium-ziwei-report-compat",
  "premium_pdf_ziwei",
  "premium_pdf_ziwei_compat",
  "premium-astrology-report",
  "premium-astrology-report-compat",
  "premium_pdf_western_astrology",
  "premium_pdf_western_astrology_compat",
  "premium-sukuyo-report",
  "premium-sukuyo-report-compat",
  "premium_pdf_sukyo",
  "premium_pdf_sukyo_compat",
  "premium-vedic-report",
  "premium-vedic-report-compat",
  "premium_pdf_vedic",
  "premium_pdf_vedic_compat",
  "premium_pdf_soul_origin",
  "premium-soul-origin-report",
  "premium-fpti-report",
  "premium_pdf_saju_love_secret",
  "premium_pdf_saju_love_secret_compat",
  "premium-naming-report",
  "premium-sukuyo-compat-extra",
  "premium-veda-compatibility-addon",
  "destiny-bias-analyze",
  "destiny-bias-theme-premium",
  "destiny-bias-collection-save",
  "destiny-bias-deep-profile",
  "profile-card-manage",
  "rpt_specialCharmCard",
  "rpt_quantumCard",
  "rpt_healthReportCard",
  "rpt_skillTreeCard",
  "rpt_energyCoordCard",
  "rpt_villainCard",
  "rpt_luckSyncDiaryEntryCard",
  "rpt_secretHouseEntryCard",
  "fun.quantumLotto.ritualReport",
];

export const COIN_GATE_PER_USE_REASON_COSTS = Object.freeze({
  "애니멀 토템 리딩": 30,
  "십이운성 동물점 해금": 100,
  "사주 인생의 책 PDF 생성": 500,
  "인생의 책 생성 (12챕터)": 500,
  "인생의 책 생성 (13챕터)": 500,
  "시빌라 도미네이터 리포트": 100,
  "점성술 셜럭 시나스트리 궁합": 50,
  "점성술 직접 입력 시나스트리 궁합": 50,
  "자미두수 궁합 분석": 50,
  "사주 궁합 분석": 50,
  "숙요점 유명인 궁합": 50,
  "숙요점 궁합 분석": 50,
  "사주 신년운세 PDF 리포트 생성": 300,
  "운명의 기원서 생성": 690,
});

export const FEATURE_KEY_REASON_COSTS = Object.freeze({
  "neville-meditation": Object.freeze({
    "openNevilleMeditationPage 30분 코스": 30,
    "openNevilleMeditationPage 60분 코스": 50,
  }),
  "cosmic-soul-meditation": Object.freeze({
    "openCosmicSoulMeditation 30분 코스": 50,
    "openCosmicSoulMeditation 60분 코스": 100,
  }),
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
  "tarot-numerology-reading": { cost: 30, reason: "수비학 타로 리딩" },
  "tarot-prompt-maker": { cost: 50, reason: "타로 프롬프트 라이브러리" },
  "tarot-ijik": { cost: 50, reason: "이직 타로 리딩" },
  "fortune-fish-gacha": { cost: 5, reason: "포춘텔러 피쉬 행운 가챠" },
  "royal-tea-oracle": { cost: 30, reason: "영국 홍차점 리딩" },
  "ifa-oracle": { cost: 30, reason: "IFÀ 오라클 리딩" },
  "neville-meditation": { cost: 30, reason: "네빌 명상 실습" },
  "cosmic-soul-meditation": { cost: 200, reason: "코스믹 소울 명상" },
  "yoga-guru-per-use": { cost: 30, reason: "요가 구루 30분 코스" },
  "compat-astro-synastry": { cost: 50, reason: "점성술 셜럭 시나스트리 궁합" },
  "compat-astro-direct-synastry": { cost: 50, reason: "점성술 직접 입력 시나스트리 궁합" },
  "compat-ziwei-compatibility": { cost: 50, reason: "자미두수 궁합 분석" },
  "compat-saju-compatibility": { cost: 50, reason: "사주 궁합 분석" },
  "vedic-compatibility-per-use": { cost: 50, reason: "베다점 궁합 분석" },
  openJuyukModal: { cost: 30, reason: "주역 거북점 리딩" },
  openKemetModal: { cost: 30, reason: "이집트 신탁 리딩" },
  openGeomancyOracle: { cost: 50, reason: "지오맨시 오라클 리딩" },
  loveSimulation: { cost: 100, reason: "LOVE CODE 사주 연애 시뮬레이션" },
  turtleIChing: { cost: 30, reason: "주역 거북점 리딩" },
  egyptOracle: { cost: 30, reason: "이집트 신탁 리딩" },
  geomancy: { cost: 50, reason: "지오맨시 오라클 리딩" },
  stonehengeRunes: { cost: 50, reason: "스톤헨지 룬 리딩" },
  "stonehenge-runes-single": { cost: 30, reason: "스톤헨지 룬 1-룬 리딩" },
  "stonehenge-runes-triad": { cost: 50, reason: "스톤헨지 룬 3-룬 리딩" },
  "stonehenge-runes-deep": { cost: 70, reason: "스톤헨지 룬 5-룬 리딩" },
  "stonehenge-runes-yearly": { cost: 120, reason: "스톤헨지 룬 12-룬 리딩" },
  "animal-totem-basic": { cost: 30, reason: "애니멀 토템 리딩" },
  "animal-totem-deep": { cost: 60, reason: "애니멀 토템 심화 리딩" },
  "animal-destiny-unlock": { cost: 100, reason: "십이운성 동물점 해금" },
  destiny_meeting_place: { cost: 100, reason: "사주로 보는 인연의 장소 1회 분석" },
  premiumTarot: { cost: 100, reason: "프리미엄 타로 리딩" },
  "palm-reading-general": { cost: 50, reason: "손금 전체운 분석" },
  "palm-reading-love": { cost: 30, reason: "손금 연애운 분석" },
  "palm-reading-wealth": { cost: 30, reason: "손금 재물운 분석" },
  "palm-reading-career": { cost: 30, reason: "손금 직업운 분석" },
  "palm-reading-personality": { cost: 30, reason: "손금 성격 분석" },
  "palm-reading-relationship": { cost: 30, reason: "손금 관계 패턴 분석" },
  "premium-love-secret-solo": { cost: 300, reason: "사주 프리미엄 연애운 리포트 생성" },
  "premium-love-secret-couple": { cost: 400, reason: "사주 프리미엄 궁합 리포트 생성" },
  "saju_love_book_pdf": { cost: 300, reason: "사주 프리미엄 연애운 리포트 생성" },
  "saju_life_book_pdf": { cost: 500, reason: "사주 인생의 책 PDF 생성" },
  "saju_ai_prompt_generator": { cost: 100, reason: "사주 AI 질문 프롬프트 생성" },
  "ziwei_ai_prompt_generator": { cost: 100, reason: "자미두수 AI 질문 프롬프트 생성" },
  "sukuyo_ai_prompt_generator": { cost: 100, reason: "숙요점 AI 질문 프롬프트 생성" },
  "astrology_ai_prompt_generator": { cost: 100, reason: "점성술 AI 질문 프롬프트 생성" },
  "vedic_ai_prompt_generator": { cost: 100, reason: "베다 점성술 AI 질문 프롬프트 생성" },
  "premium-lifebook-report": { cost: 500, reason: "인생의 책 생성 (13챕터)" },
  "premium_pdf_saju_life_book": { cost: 500, reason: "인생의 책 생성 (13챕터)" },
  "saju_new_year_pdf": { cost: 300, reason: "사주 신년운세 PDF 리포트 생성" },
  "premium-saju-newyear-report": { cost: 300, reason: "사주 신년운세 PDF 리포트 생성" },
  "premium_pdf_saju_new_year": { cost: 300, reason: "사주 신년운세 PDF 리포트 생성" },
  "premium_pdf_saju_yearly": { cost: 300, reason: "사주 신년운세 PDF 리포트 생성" },
  "premium_pdf_saju_love_secret": { cost: 300, reason: "사주 프리미엄 연애운 리포트 생성" },
  "premium_pdf_saju_love_secret_compat": { cost: 400, reason: "사주 프리미엄 궁합 리포트 생성" },
  "premium-sibyl-dominator": { cost: 100, reason: "시빌라 도미네이터 리포트" },
  "premium-ziwei-report": { cost: 590, reason: "자미두수 프리미엄 PDF 리포트 생성" },
  "premium-ziwei-report-compat": { cost: 690, reason: "자미두수 프리미엄 PDF 궁합 리포트 생성" },
  "premium_pdf_ziwei": { cost: 590, reason: "자미두수 프리미엄 PDF 리포트 생성" },
  "premium_pdf_ziwei_compat": { cost: 690, reason: "자미두수 프리미엄 PDF 궁합 리포트 생성" },
  "premium-astrology-report": { cost: 390, reason: "점성술 프리미엄 PDF 리포트 생성" },
  "premium-astrology-report-compat": { cost: 490, reason: "점성술 프리미엄 PDF 궁합 리포트 생성" },
  "premium_pdf_western_astrology": { cost: 390, reason: "점성술 프리미엄 PDF 리포트 생성" },
  "premium_pdf_western_astrology_compat": { cost: 490, reason: "점성술 프리미엄 PDF 궁합 리포트 생성" },
  "premium-sukuyo-report": { cost: 390, reason: "숙요점 프리미엄 PDF 리포트 생성" },
  "premium-sukuyo-report-compat": { cost: 490, reason: "숙요점 프리미엄 PDF 궁합 리포트 생성" },
  "premium_pdf_sukyo": { cost: 390, reason: "숙요점 프리미엄 PDF 리포트 생성" },
  "premium_pdf_sukyo_compat": { cost: 490, reason: "숙요점 프리미엄 PDF 궁합 리포트 생성" },
  "premium-vedic-report": { cost: 390, reason: "베다 점성술 프리미엄 PDF 리포트 생성" },
  "premium-vedic-report-compat": { cost: 490, reason: "베다 점성술 프리미엄 PDF 궁합 리포트 생성" },
  "premium_pdf_vedic": { cost: 390, reason: "베다 점성술 프리미엄 PDF 리포트 생성" },
  "premium_pdf_vedic_compat": { cost: 490, reason: "베다 점성술 프리미엄 PDF 궁합 리포트 생성" },
  "premium_pdf_soul_origin": { cost: 690, reason: "운명의 기원서 생성" },
  "premium-soul-origin-report": { cost: 690, reason: "운명의 기원서 생성" },
  "premium-fpti-report": { cost: 200, reason: "FPTI 프리미엄 리포트 생성" },
  "premium-naming-report": { cost: 700, reason: "명운 프리미엄 작명 리포트 생성" },
  "premium-sukuyo-compat-extra": { cost: 300, reason: "숙요점 궁합 확장 분석 추가" },
  "premium-veda-compatibility-addon": { cost: 300, reason: "프리미엄 베다점 궁합 확장 분석 추가" },
  "destiny-bias-analyze": { cost: 50, reason: "최애운명 심화 분석" },
  "destiny-bias-theme-premium": { cost: 120, reason: "최애운명 프리미엄 테마 해금" },
  "destiny-bias-collection-save": { cost: 150, reason: "최애운명 컬렉션 저장 확장" },
  "destiny-bias-deep-profile": { cost: 90, reason: "최애운명 심층 프로필 확장" },
  "profile-card-manage": { cost: 50, reason: "프로필 카드 추가/삭제", forceDeduct: true },
  rpt_specialCharmCard: { cost: 30, reason: "나의 매력 클래스 영구 해금" },
  rpt_quantumCard: { cost: 50, reason: "퀀텀 명리 엔진 영구 해금" },
  rpt_healthReportCard: { cost: 50, reason: "명리 헬스 리포트 영구 해금" },
  rpt_skillTreeCard: { cost: 30, reason: "인생 스킬 트리 영구 해금" },
  rpt_energyCoordCard: { cost: 50, reason: "사주로 보는 여행지 영구 해금" },
  rpt_villainCard: { cost: 50, reason: "빌런 블랙리스트 영구 해금" },
  rpt_luckSyncDiaryEntryCard: { cost: 100, reason: "사주 다이어리 영구 해금" },
  rpt_secretHouseEntryCard: { cost: 50, reason: "시크릿 하우스 영구 해금" },
  "fun.quantumLotto.ritualReport": { cost: 50, reason: "달빛 럭키 리추얼 리포트" },
});

export const PIG_COIN_UNLOCK_PRODUCTS = Object.freeze({
  "unlock.section_daewun": { featureKey: "section_daewun", cost: 50, reason: "Section daewun unlock", forceDeduct: true },
  "unlock.section_summary": { featureKey: "section_summary", cost: 50, reason: "Section summary unlock", forceDeduct: true },
  "unlock.section_compat": { featureKey: "section_compat", cost: 50, reason: "Section compat unlock", forceDeduct: true },
  "unlock.flower_fc": { featureKey: "flower-fc", cost: 200, reason: "Destiny flower atelier full unlock", forceDeduct: true },
  "unlock.olympus_fc": { featureKey: "olympus-fc", cost: 100, reason: "Olympus profile unlock", forceDeduct: true },
  "unlock.all_paid_saju": { featureKey: "allPaidSaju", cost: 700, reason: "All paid saju unlock", forceDeduct: true },
  "unlock.rpg_character": { featureKey: "rpgCharacter", cost: 30, reason: "RPG character unlock", forceDeduct: true },
  "unlock.travel_destiny": { featureKey: "travelDestiny", cost: 50, reason: "Travel destiny unlock", forceDeduct: true },
  "unlock.health_report": { featureKey: "healthReport", cost: 50, reason: "Health report unlock", forceDeduct: true },
  "unlock.saju_diary": { featureKey: "sajuDiary", cost: 100, reason: "Saju diary unlock", forceDeduct: true },
  "unlock.secret_house_episodes": { featureKey: "secretHouseEpisodes", cost: 50, reason: "Secret house episodes unlock", forceDeduct: true },
  "unlock.premium_divination_pack": { featureKey: "premiumDivinationPack", cost: 300, reason: "Premium divination pack unlock", forceDeduct: true },
  "unlock.premium_ziwei": { featureKey: "premium-ziwei", cost: 500, reason: "Premium ziwei unlock", forceDeduct: true },
  "unlock.premium_astrology": { featureKey: "premium-astrology", cost: 390, reason: "Premium astrology unlock", forceDeduct: true },
  "unlock.premium_sukuyo": { featureKey: "premium-sukuyo", cost: 390, reason: "Premium sukuyo unlock", forceDeduct: true },
  "unlock.premium_veda": { featureKey: "premium-veda", cost: 390, reason: "Premium veda unlock", forceDeduct: true },
  "unlock.premium_naming": { featureKey: "premium-naming", cost: 700, reason: "Premium naming unlock", forceDeduct: true },
  "unlock.destiny_bias_theme_premium": { featureKey: "destiny-bias-theme-premium", cost: 120, reason: "Destiny bias premium theme unlock", forceDeduct: true },
  "unlock.destiny_bias_collection_save": { featureKey: "destiny-bias-collection-save", cost: 150, reason: "Destiny bias collection save unlock", forceDeduct: true },
  "unlock.destiny_bias_deep_profile": { featureKey: "destiny-bias-deep-profile", cost: 90, reason: "Destiny bias deep profile unlock", forceDeduct: true },
});

const LEGACY_UNLOCK_PRODUCTS_65DE451 = Object.freeze({
  "unlock.section_daewun": { featureKey: "section_daewun", cost: 50, reason: "Section daewun unlock", forceDeduct: true },
  "unlock.section_summary": { featureKey: "section_summary", cost: 50, reason: "Section summary unlock", forceDeduct: true },
  "unlock.section_compat": { featureKey: "section_compat", cost: 50, reason: "Section compat unlock", forceDeduct: true },
  "unlock.flower_fc": { featureKey: "flower-fc", cost: 200, reason: "Destiny flower atelier full unlock", forceDeduct: true },
  "unlock.olympus_fc": { featureKey: "olympus-fc", cost: 100, reason: "Olympus profile unlock", forceDeduct: true },
  "unlock.all_paid_saju": { featureKey: "allPaidSaju", cost: 700, reason: "All paid saju unlock", forceDeduct: true },
  "unlock.rpg_character": { featureKey: "rpgCharacter", cost: 30, reason: "RPG character unlock", forceDeduct: true },
  "unlock.travel_destiny": { featureKey: "travelDestiny", cost: 50, reason: "Travel destiny unlock", forceDeduct: true },
  "unlock.health_report": { featureKey: "healthReport", cost: 50, reason: "Health report unlock", forceDeduct: true },
  "unlock.saju_diary": { featureKey: "sajuDiary", cost: 100, reason: "Saju diary unlock", forceDeduct: true },
  "unlock.secret_house_episodes": { featureKey: "secretHouseEpisodes", cost: 50, reason: "Secret house episodes unlock", forceDeduct: true },
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

export const PAID_FEATURE_KEY_ALIASES = Object.freeze({
  "premium-sukyo": "premium-sukuyo",
  "openjuyuk": "openJuyukModal",
  "openkemet": "openKemetModal",
  "opengeomancy": "openGeomancyOracle",
  "turtle-iching": "turtleIChing",
  "egypt-oracle": "egyptOracle",
  openRuneOracle: "stonehengeRunes",
  openAnimalTotemModal: "animal-totem-basic",
  openTarotLoveModal: "tarot-love-relationship",
  openTarotReunionModal: "tarot-reunion-reading",
  openTarotYearFortuneModal: "tarot-year-fortune",
  startMindScanTarot: "tarot-mindscan",
  openMindScanTarot: "tarot-mindscan",
  openTarotMindScanModal: "tarot-mindscan",
  openCelestialHarmony: "tarot-celestial-harmony",
  openLoveSimulation: "loveSimulation",
  startCrystalSoulTarot: "tarot-crystal-soul-reading",
  openCrystalSoulTarot: "tarot-crystal-soul-reading",
  openTarotCrystalSoulModal: "tarot-crystal-soul-reading",
  startIjikTarot: "tarot-ijik",
  openIjikTarot: "tarot-ijik",
  openRoyalTeaOracle: "royal-tea-oracle",
  openIfaOracle: "ifa-oracle",
  openNevilleMeditationPage: "neville-meditation",
  openCosmicSoulMeditation: "cosmic-soul-meditation",
  openYogaGuru: "yoga-guru-per-use",
  generateLifeBook: "premium-lifebook-report",
  openSajuLifeBookBuilder: "saju_life_book_pdf",
  saju_life_book_pdf: "saju_life_book_pdf",
  saju_lifebook_pdf: "saju_life_book_pdf",
  openSajuNewYearModal: "saju_new_year_pdf",
  generateSajuNewYear: "saju_new_year_pdf",
  generateSibylDominatorReport: "premium-sibyl-dominator",
  openSibylDominator: "premium-sibyl-dominator",
  "sibyl-dominator": "premium-sibyl-dominator",
  "sibyl-dominator-report": "premium-sibyl-dominator",
  "premium-sibyl-dominator-report": "premium-sibyl-dominator",
  gotoZiweiPremium: "premium-ziwei-report",
  premium_pdf_ziwei: "premium-ziwei-report",
  premium_pdf_ziwei_compat: "premium-ziwei-report-compat",
  "premium-pdf-ziwei": "premium-ziwei-report",
  premiumZiweiPdf: "premium-ziwei-report",
  premium_pdf_saju_life_book: "premium-lifebook-report",
  "premium-lifebook-report": "saju_life_book_pdf",
  "premium-saju-newyear-report": "saju_new_year_pdf",
  premium_pdf_saju_new_year: "saju_new_year_pdf",
  premium_pdf_saju_yearly: "saju_new_year_pdf",
  premium_pdf_saju_love_secret: "premium-love-secret-solo",
  premium_pdf_saju_love_secret_compat: "premium-love-secret-couple",
  "saju-love-book": "saju_love_book_pdf",
  sajulovebookpdf: "saju_love_book_pdf",
  sajuLoveBookPdf: "saju_love_book_pdf",
  premium_pdf_western_astrology: "premium-astrology-report",
  premium_pdf_western_astrology_compat: "premium-astrology-report-compat",
  premium_pdf_sukyo: "premium-sukuyo-report",
  premium_pdf_sukyo_compat: "premium-sukuyo-report-compat",
  premium_pdf_vedic: "premium-vedic-report",
  premium_pdf_vedic_compat: "premium-vedic-report",
  premium_pdf_soul_origin: "premium_pdf_soul_origin",
  "premium-soul-origin-report": "premium_pdf_soul_origin",
  openSoulOriginModal: "premium_pdf_soul_origin",
  gotoSoulOriginPremium: "premium_pdf_soul_origin",
  soul_origin_book: "premium_pdf_soul_origin",
  destiny_prayer_book: "premium_pdf_soul_origin",
  premium_fpti_report: "premium-fpti-report",
  generateFptiDeepReport: "premium-fpti-report",
  openFptiDeepReport: "premium-fpti-report",
  gotoAstrologyPremium: "premium-astrology-report",
  gotoSukuyoPremium: "premium-sukuyo-report",
  gotoVedicPremium: "premium-vedic-report",
  gotoNamingPremium: "premium-naming-report",
});

const PAID_FEATURE_KEY_ALIAS_LOOKUP = Object.freeze(
  Object.entries(PAID_FEATURE_KEY_ALIASES).reduce((acc, [alias, canonical]) => {
    const direct = String(alias || "").trim();
    const target = String(canonical || "").trim();
    if (direct && target) {
      acc[direct] = target;
      acc[direct.toLowerCase()] = target;
    }
    return acc;
  }, Object.create(null)),
);

export function normalizePaidFeatureKey(rawKey) {
  const key = String(rawKey || "").trim();
  if (!key) return "";

  return PAID_FEATURE_KEY_ALIAS_LOOKUP[key] || PAID_FEATURE_KEY_ALIAS_LOOKUP[key.toLowerCase()] || key;
}

export function resolveFeatureReasonCost(featureKey, reason) {
  const key = normalizePaidFeatureKey(featureKey);
  const reasonText = String(reason || "").trim();
  if (!key || !reasonText) return null;

  const table = FEATURE_KEY_REASON_COSTS[key] || null;
  if (!table) return null;

  const matched = Number(table[reasonText]);
  if (!Number.isFinite(matched) || matched <= 0) return null;
  return matched;
}

export function listLegacyUnlockBaselineMismatches() {
  return Object.entries(LEGACY_UNLOCK_PRODUCTS_65DE451)
    .map(([productId, expected]) => {
      const actual = PIG_COIN_UNLOCK_PRODUCTS[productId] || null;
      if (!actual) {
        return {
          productId,
          issue: "missing",
          expected,
        };
      }

      const expectedCost = Number(expected.cost);
      const actualCost = Number(actual.cost);
      const expectedForceDeduct = Boolean(expected.forceDeduct);
      const actualForceDeduct = Boolean(actual.forceDeduct);
      const expectedFeatureKey = String(expected.featureKey || "").trim();
      const actualFeatureKey = String(actual.featureKey || "").trim();
      const expectedReason = String(expected.reason || "").trim();
      const actualReason = String(actual.reason || "").trim();

      const isDifferent = (
        expectedCost !== actualCost
        || expectedForceDeduct !== actualForceDeduct
        || expectedFeatureKey !== actualFeatureKey
        || expectedReason !== actualReason
      );

      if (!isDifferent) return null;

      return {
        productId,
        issue: "changed",
        expected,
        actual: {
          featureKey: actualFeatureKey,
          cost: actualCost,
          reason: actualReason,
          forceDeduct: actualForceDeduct,
        },
      };
    })
    .filter(Boolean);
}

export function listServerPricedFeatureKeys() {
  const keys = new Set([
    "coin-gate-per-use",
    ...Object.keys(FEATURE_KEY_PRICE_TABLE),
    ...Object.keys(UNLOCK_PRODUCT_BY_FEATURE_KEY),
    ...Object.keys(PAID_FEATURE_KEY_ALIASES),
  ]);
  return Array.from(keys).sort();
}

export const FRONTEND_PAID_FEATURE_KEYS = Object.freeze(
  Array.from(new Set(INTERNAL_FRONTEND_FEATURE_KEYS)).sort(),
);

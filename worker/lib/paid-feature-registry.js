import { normalizePaidFeaturePricingShape } from "./billing-policy.js";
import { isMusicTrackFeatureKey } from "../../lib/music-access-policy.js";

function normalizeRegistryPricingEntry(entry = {}, fallbackAccessModel = "per_use") {
  const normalized = normalizePaidFeaturePricingShape(entry);
  const { forceDeduct: _legacyForceDeduct, ...policy } = normalized;
  return Object.freeze({
    ...policy,
    accessModel: String(policy.accessModel || fallbackAccessModel).trim() || fallbackAccessModel,
  });
}

function normalizeRegistryPricingTable(table = {}) {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(table).map(([key, entry]) => [
        key,
        normalizeRegistryPricingEntry(entry, String(key).startsWith("unlock.") ? "unlock" : "per_use"),
      ]),
    ),
  );
}

function normalizeRegistryReasonCostTable(table = {}) {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(table).map(([reason, value]) => {
        const entry = value && typeof value === "object"
          ? { ...value, reason: value.reason || reason }
          : { cost: value, reason };
        return [reason, normalizeRegistryPricingEntry(entry)];
      }),
    ),
  );
}

const INTERNAL_FRONTEND_FEATURE_KEYS = [
  "coin-gate-per-use",
  "openGeomancyOracle",
  "openJuyukModal",
  "openKemetModal",
  "loveSimulation",
  "turtleIChing",
  "egyptOracle",
  "egyptian_oracle_ai_prompt",
  "geomancy",
  "stonehengeRunes",
  "premiumTarot",
  "tarot-year-fortune",
  "tarot-love-relationship",
  "tarot-reunion-reading",
  "tarot-myeongri-three-card",
  "tarot-mindscan",
  "tarot-celestial-harmony",
  "tarot-crystal-soul-reading",
  "tarot-numerology-reading",
  "tarot-prompt-maker",
  "maya-prompt-generator",
  "tarot-ijik",
  "royal-tea-oracle",
  "ifa-oracle",
  "neville-meditation",
  "cosmic-soul-meditation",
  "dream-psycho-analysis",
  "yoga-guru-per-use",
  "flower-studio-per-use",
  "sukuyo-symbolic-comparison",
  "sukuyo-extreme-t-relationship",
  "sukuyo-relationship-encyclopedia",
  "sukuyo-nature-deep-dive",
  "sukuyo-past-life-reading",
  "sukuyo-monthly-fortune",
  "sukuyo-compatibility-ai",
  "astrology-ai-consultation",
  "neo-operation-room-consultation",
  "sukyo_yearly_fortune_unlock",
  "compat-sukuyo-compatibility",
  "vedic-compatibility-per-use",
  "stonehenge-runes-single",
  "stonehenge-runes-triad",
  "stonehenge-runes-deep",
  "stonehenge-runes-yearly",
  "stonehenge-runes-ai-prompt",
  "animal-totem-basic",
  "animal-totem-deep",
  "animal-destiny-unlock",
  "saju-guardian-unlock",
  "destiny_meeting_place",
  "palm-reading-general",
  "palm-reading-ai-consult",
  "life-book-ai-consultation",
  "life-fortune-ai-consultation",
  "new-year-ai-consultation",
  "vedic-ai-consultation",
  "love-secret-ai-consultation",
  "master-love-codex",
  "master-love-codex-compat",
  "karma-destiny-ai-consultation",
  "premium-sibyl-dominator",
  "ziwei-ai-consultation",
  "ziwei-island-deep-report",
  "ziwei-island-palace-consult",
  "ziwei_decade_luck",
  "ziwei_love_deep",
  "ziwei_twelve_palaces",
  "ziwei_symbolic_layer",
  "ziwei_life_yearly_flow",
  "premium-fpti-report",
  "premium-naming-prompt",
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
  "rpt_secretHouseEntryCard",
  "fun.quantumLotto.ritualReport",
  "pet-saju-ai-consultation",
  "pet-compatibility-ai",
];

export const COIN_GATE_PER_USE_REASON_COSTS = Object.freeze({
  "애니멀 토템 리딩": 30,
  "십이운성 동물점 해금": 100,
  "사주 가디언 소환진 해금": 100,
  "사주 인생의 책 PDF 생성": 300,
  "인생의 책 생성 (12챕터)": 300,
  "인생의 책 생성 (13챕터)": 300,
  "시빌라 도미네이터 리포트": 100,
  "점성술 셜럭 시나스트리 궁합": 50,
  "점성술 직접 입력 시나스트리 궁합": 50,
  "자미두수 궁합 분석": 50,
  "사주 궁합 분석": 50,
  "숙요점 유명인 궁합": 100,
  "숙요점 궁합 분석": 50,
  "사주 신년운세 PDF 리포트 생성": 300,
  "사주 신년운세 AI 상담": 300,
  "운명의 업 생성": 300,
});

const RAW_FEATURE_KEY_REASON_COSTS = Object.freeze({
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
  "stonehenge-runes-ai-prompt": Object.freeze({
    "스톤헨지 룬 AI 질문문 생성": 30,
  }),
});

export const FEATURE_KEY_REASON_COSTS = Object.freeze(
  Object.fromEntries(
    Object.entries(RAW_FEATURE_KEY_REASON_COSTS).map(([featureKey, table]) => [
      featureKey,
      normalizeRegistryReasonCostTable(table),
    ]),
  ),
);

const RAW_FEATURE_KEY_PRICE_TABLE = Object.freeze({
  "vedic-ai-consultation": { cost: 300, amountKRW: 30000, reason: "베다점 전문가 상담" },
  "physiognomy-compatibility": { cost: 50, reason: "관상 궁합 분석" },
  "physiognomy-pastlife-compatibility": { cost: 50, reason: "전생 관상 궁합 분석" },
  "physiognomy-ogwan-mole-deep": { cost: 50, reason: "오관·점 정밀 분석" },
  "tarot-year-fortune": { cost: 100, amountKRW: 10000, reason: "십이지신 천운 타로" },
  "tarot-love-relationship": { cost: 50, reason: "우리는 무슨 사이? 타로 리딩" },
  "tarot-reunion-reading": { cost: 50, reason: "재회운 타로 리딩" },
  "tarot-myeongri-three-card": { cost: 50, reason: "명리학 타로 3장 스프레드" },
  "tarot-mindscan": { cost: 50, reason: "마인드 스캔 타로 리딩" },
  "tarot-celestial-harmony": { cost: 100, reason: "셀레스티얼 하모니 타로 리딩" },
  "tarot-crystal-soul-reading": { cost: 50, reason: "크리스탈 소울 타로 리딩" },
  "tarot-numerology-reading": { cost: 30, reason: "수비학 타로 리딩" },
  "tarot-prompt-maker": { cost: 50, reason: "타로 프롬프트 라이브러리" },
  "maya-prompt-generator": { cost: 30, reason: "마야점 상담 프롬프트 생성" },
  "tarot-ijik": { cost: 50, reason: "이직 타로 리딩" },
  "royal-tea-oracle": { cost: 50, reason: "영국 홍차점 리딩" },
  "ifa-oracle": { cost: 30, reason: "IFÀ 오라클 리딩" },
  "neville-meditation": { cost: 30, reason: "네빌 명상 실습" },
  "cosmic-soul-meditation": { cost: 200, reason: "코스믹 소울 명상" },
  "dream-psycho-analysis": { cost: 30, amountKRW: 3000, reason: "정신분석 해몽" },
  "yoga-guru-per-use": { cost: 30, reason: "요가 구루 30분 코스" },
  "flower-studio-per-use": { cost: 50, reason: "운명의 꽃 스튜디오 1회 이용" },
  "fortune-tea-house-tarot-consultation": { cost: 50, amountKRW: 5000, reason: "운명 찻집 타로 상담 (3카드)" },
  "fortune-tea-house-tarot-five-consultation": { cost: 100, amountKRW: 10000, reason: "운명 찻집 타로 프리미엄 상담 (5카드)" },
  "fortune-tea-house-saju-consultation": { cost: 100, amountKRW: 10000, reason: "운명 찻집 사주 상담" },
  "fortune-tea-house-saju-compatibility-consultation": { cost: 200, amountKRW: 20000, reason: "운명 찻집 사주 궁합 상담" },
  "fortune-tea-house-sukuyo-compatibility-consultation": { cost: 200, amountKRW: 20000, reason: "운명 찻집 숙요점 궁합 상담" },
  "sukuyo-symbolic-comparison": { cost: 50, reason: "숙요 인연 레이더" },
  "sukuyo-extreme-t-relationship": { cost: 50, reason: "극T 관계 회로 확장" },
  "sukuyo-relationship-encyclopedia": { cost: 50, reason: "숙요 인연 도감" },
  "sukuyo-nature-deep-dive": { cost: 50, reason: "본성 심화 해석" },
  "sukuyo-past-life-reading": { cost: 100, reason: "숙요 전생 인연 리딩" },
  "sukuyo-monthly-fortune": { cost: 30, reason: "월별 숙요 운세 확장" },
  "sukuyo-compatibility-ai": { cost: 300, amountKRW: 30000, reason: "숙요점 궁합 전문가 상담" },
  "sukyo_yearly_fortune_unlock": { cost: 100, reason: "숙요점 1년운 전체 해석 잠금 해제" },
  "compat-astro-synastry": { cost: 50, reason: "점성술 셜럭 시나스트리 궁합" },
  "compat-astro-direct-synastry": { cost: 50, reason: "점성술 직접 입력 시나스트리 궁합" },
  "compat-ziwei-compatibility": { cost: 50, reason: "자미두수 궁합 분석" },
  "compat-saju-compatibility": { cost: 50, reason: "사주 궁합 분석" },
  "compat-sukuyo-compatibility": { cost: 50, reason: "숙요점 궁합 분석" },
  "vedic-compatibility-per-use": { cost: 50, reason: "베다점 궁합 분석" },
  "nakshatra-compat": { cost: 100, amountKRW: 10000, reason: "나크샤트라 동서 통합 궁합" },
  "nakshatra-compat-ai": { cost: 300, amountKRW: 30000, reason: "나크샤트라 통합 궁합 전문가 상담" },
  "nakshatra-ai-consultation": { cost: 300, amountKRW: 30000, reason: "나크샤트라 결정판 전문가 심화 상담" },
  "nakshatra-muhurta": { cost: 50, amountKRW: 5000, reason: "나크샤트라 택일(무후르타)" },
  "nakshatra-vvip-codex": { cost: 300, amountKRW: 30000, reason: "나크샤트라 결정판 VVIP 통합서" },
  "destiny-compass-crossroads": { cost: 100, amountKRW: 10000, reason: "운명의 갈림길 기운 비교" },
  "destiny-compass-life-voyage": { cost: 100, amountKRW: 10000, reason: "삶의 항로 안내" },
  "destiny-compass-future-sim": { cost: 100, amountKRW: 10000, reason: "미래 시뮬레이션 안내" },
  "destiny-compass-deep-report": { cost: 100, amountKRW: 10000, reason: "운명의 지도 심층 리포트" },
  "pet-saju-ai-consultation": { cost: 50, amountKRW: 5000, reason: "반려동물 사주 AI 심층 리포트" },
  "pet-compatibility-ai": { cost: 50, amountKRW: 5000, reason: "반려동물 궁합 분석" },
  openJuyukModal: { cost: 30, reason: "주역 거북점 리딩" },
  openKemetModal: { cost: 30, reason: "이집트 신탁 리딩" },
  openGeomancyOracle: { cost: 50, reason: "지오맨시 오라클 리딩" },
  loveSimulation: { cost: 100, reason: "LOVE CODE 사주 연애 시뮬레이션" },
  turtleIChing: { cost: 30, reason: "주역 거북점 리딩" },
  egyptOracle: { cost: 30, reason: "이집트 신탁 리딩" },
  "egyptian_oracle_ai_prompt": { cost: 30, reason: "이집트 신탁 AI 질문 프롬프트 생성" },
  geomancy: { cost: 50, reason: "지오맨시 오라클 리딩" },
  stonehengeRunes: { cost: 50, reason: "스톤헨지 룬 리딩" },
  "stonehenge-runes-single": { cost: 30, reason: "스톤헨지 룬 1-룬 리딩" },
  "stonehenge-runes-triad": { cost: 50, reason: "스톤헨지 룬 3-룬 리딩" },
  "stonehenge-runes-deep": { cost: 100, reason: "스톤헨지 룬 5-룬 리딩" },
  "stonehenge-runes-yearly": { cost: 100, reason: "스톤헨지 룬 12-룬 리딩" },
  "stonehenge-runes-ai-prompt": { cost: 30, reason: "스톤헨지 룬 AI 질문문 생성" },
  "animal-totem-basic": { cost: 30, reason: "애니멀 토템 리딩" },
  "animal-totem-deep": { cost: 50, reason: "애니멀 토템 심화 리딩" },
  "animal-destiny-unlock": { cost: 100, reason: "십이운성 동물점 해금" },
  "saju-guardian-unlock": { cost: 100, reason: "사주 가디언 소환진 해금" },
  destiny_meeting_place: { cost: 100, reason: "사주로 보는 인연의 장소 1회 분석" },
  premiumTarot: { cost: 100, reason: "프리미엄 타로 리딩" },
  // 손금은 Gemini Vision 판독(손당 1회) + 심층 해석까지 한 번에 제공하는 단일 상품이다.
  // 구 palm-reading-ai-consult(별도 5,000원)는 기본 분석에 통합돼 더 이상 호출되지 않지만,
  // 과거 주문·환불 이력이 참조하므로 키와 가격은 그대로 남긴다.
  "palm-reading-general": { cost: 100, reason: "손금 정밀 판독 + 심층 해석" },
  "palm-reading-ai-consult": { cost: 50, reason: "손금 전문가 상담 생성" },
  "life-book-ai-consultation": { cost: 200, amountKRW: 20000, reason: "인생의 책 전문가 상담" },
  // 인생 총운은 분량이 3배(30,000자 vs 10,000자)라 2026-08-01 부터 별도 SKU 로 분리했다.
  "life-fortune-ai-consultation": { cost: 300, amountKRW: 30000, reason: "인생 총운 전문가 상담" },
  "astrology-ai-consultation": { cost: 300, amountKRW: 30000, reason: "점성술 전문가 상담" },
  "neo-operation-room-consultation": { cost: 300, amountKRW: 30000, reason: "네오의 팩폭 작전실" },
  "saju_ai_question_prompt": { cost: 200, reason: "사주 전문가 상담 결과 생성" },
  "ziwei_ai_prompt_generator": { cost: 100, reason: "자미두수 AI 질문 프롬프트 생성" },
  "astrology_ai_prompt_generator": { cost: 100, reason: "점성술 AI 질문 프롬프트 생성" },
  "vedic_ai_prompt_generator": { cost: 100, reason: "베다 점성술 AI 질문 프롬프트 생성" },
  "sukuyo_ai_prompt_generator": { cost: 100, reason: "숙요점 전문가 상담" },
  "vedic_prashna_prompt": { cost: 50, reason: "프라슈나 프롬프트" },
  "astro_career_talent_deep": { cost: 50, reason: "점성술 커리어·재능 정밀 분석" },
  "astro_talent_attraction_deep": { cost: 50, reason: "점성술 재능과 끌림 심화 분석" },
  "astro_relationship_deep": { cost: 50, reason: "점성술 관계·끌림 심화 분석" },
  "astro_growth_shadow_deep": { cost: 50, reason: "점성술 과제와 변화 심화 리딩" },
  "astro_basic_deep_pack": { cost: 50, reason: "점성술 기본 차트 심층 패키지" },
  "astro_stellar_career_room": { cost: 50, reason: "점성술 봉인된 별의 방 일과 역할" },
  "astro_stellar_talent_room": { cost: 50, reason: "점성술 봉인된 별의 방 재능과 끌림" },
  "astro_stellar_relationship_room": { cost: 50, reason: "점성술 봉인된 별의 방 관계의 문" },
  "astro_stellar_growth_room": { cost: 50, reason: "점성술 봉인된 별의 방 과제와 변화" },
  "astro_monthly_transit": { cost: 50, reason: "점성술 월간 트랜짓 운세" },
  "astro_yearly_transit": { cost: 50, reason: "점성술 연간 트랜짓 운세" },
  "new-year-ai-consultation": { cost: 300, amountKRW: 30000, reason: "신년운세 전문가 상담" },
  "love-secret-ai-consultation": { cost: 300, amountKRW: 30000, reason: "연애 비책 전문가 상담" },
  // 마스터 인연의 서 (MASTER_LOVE_CODEX) — 사주×자미두수 융합 20챕터 5만자 전자책. 연애 비책과 달리
  // 사주 단독이 아니라 명식+명반을 함께 근거로 삼는다. 개인/궁합 두 SKU 로 나뉘며 궁합은 상대 명식·명반까지
  // 4개 차트를 프롬프트에 담아 입력 비용이 대략 2배다.
  "master-love-codex": { cost: 200, amountKRW: 20000, reason: "마스터 인연의 서" },
  "master-love-codex-compat": { cost: 300, amountKRW: 30000, reason: "마스터 인연의 서 · 궁합" },
  "ziwei-ai-consultation": { cost: 300, amountKRW: 30000, reason: "자미두수 전문가 상담" },
  "ziwei-island-palace-consult": { cost: 200, amountKRW: 20000, reason: "운명의 섬 12궁 심층 상담" },
  // 운명의 섬 정적 심층 리포트 — LLM 미사용, 1회 결제 후 계정 단위 영구 해금(UNLOCK)
  "ziwei-island-deep-report": { cost: 50, amountKRW: 5000, reason: "운명의 섬 12궁 심층 리포트 해금" },
  // 심화 자미두수 PDF (ZIWEI_DEEP_PDF) — 회당 결제 LLM 15챕터 심층 PDF 리포트
  "ziwei-deep-pdf": { cost: 300, amountKRW: 30000, reason: "심화 자미두수 PDF 심층 리포트 생성" },
  "karma-destiny-ai-consultation": { cost: 300, amountKRW: 30000, reason: "운명의 업 전문가 상담" },
  // 연이 운명 상담 — 무료 횟수(비회원 1회 + 계정 3회)를 모두 쓴 뒤부터 회당 결제.
  // 전용 "대화권" 재화를 폐지하고 표준 회당 결제로 옮긴 자리다(2026-08-07).
  "fortune-chat-consultation": { cost: 50, amountKRW: 5000, reason: "연이 운명 상담 1회" },
  // 초융합 운세 — 여섯 체계를 한 번에 엮는 2만자 이상 리딩. 300코인이라 이용권 커버는
  // family 등급만 통과하고, FAMILY_PREMIUM_MIN_COIN_COST(300)에 걸려 이용권 기간당 10회로 제한된다.
  "fusion-fortune-consultation": { cost: 300, amountKRW: 30000, reason: "초융합 운세 상담 1회" },
  "premium-sibyl-dominator": { cost: 100, reason: "시빌라 도미네이터 리포트" },
  "ziwei_decade_luck": { cost: 100, reason: "자미두수 대한 흐름 해금" },
  "ziwei_love_deep": { cost: 100, reason: "자미두수 부부궁 심화 상담 해금" },
  "ziwei_twelve_palaces": { cost: 100, reason: "자미두수 12궁 정밀 해설 해금" },
  "ziwei_symbolic_layer": { cost: 100, reason: "자미두수 상징 보조층 해금" },
  "ziwei_life_yearly_flow": { cost: 100, reason: "자미두수 생애 총론과 연간 흐름 해금" },
  "premium-fpti-report": { cost: 200, reason: "FPTI 프리미엄 리포트 생성" },
  tetogen_deep_report: { cost: 100, reason: "테토 에겐 상세 리포트 해금" },
  "premium-naming-prompt": { cost: 300, amountKRW: 30000, reason: "사주 맞춤 작명 프롬프트 생성" },
  "premium-sukuyo-compat-extra": { cost: 100, reason: "숙요점 정밀 궁합 확장 분석" },
  "premium-veda-compatibility-addon": { cost: 300, reason: "프리미엄 베다점 궁합 확장 분석 추가" },
  "destiny-bias-analyze": { cost: 50, reason: "최애운명 심화 분석" },
  "destiny-bias-theme-premium": { cost: 100, reason: "최애운명 프리미엄 테마 해금" },
  "destiny-bias-collection-save": { cost: 100, reason: "최애운명 컬렉션 저장 확장" },
  "destiny-bias-deep-profile": { cost: 100, reason: "최애운명 심층 프로필 확장" },
  "profile-card-manage": { cost: 50, reason: "프로필 카드 추가/수정/삭제" },
  rpt_specialCharmCard: { cost: 30, reason: "나의 매력 클래스 영구 해금" },
  rpt_quantumCard: { cost: 100, reason: "퀀텀 명리 엔진 영구 해금" },
  rpt_healthReportCard: { cost: 100, reason: "명리 헬스 리포트 영구 해금" },
  rpt_skillTreeCard: { cost: 30, reason: "인생 스킬 트리 영구 해금" },
  rpt_energyCoordCard: { cost: 50, reason: "사주로 보는 여행지 영구 해금" },
  rpt_villainCard: { cost: 50, reason: "빌런 블랙리스트 영구 해금" },
  rpt_secretHouseEntryCard: { cost: 50, reason: "시크릿 하우스 영구 해금" },
  "fun.quantumLotto.ritualReport": { cost: 50, reason: "달빛 럭키 리추얼 리포트" },
});

export const FEATURE_KEY_PRICE_TABLE = normalizeRegistryPricingTable(RAW_FEATURE_KEY_PRICE_TABLE);

const RAW_PIG_COIN_UNLOCK_PRODUCTS = Object.freeze({
  "unlock.section_daewun": { featureKey: "section_daewun", cost: 50, reason: "Section daewun unlock" },
  "unlock.section_summary": { featureKey: "section_summary", cost: 50, reason: "Section summary unlock" },
  "unlock.section_compat": { featureKey: "section_compat", cost: 50, reason: "Section compat unlock" },
  "unlock.flower_fc": { featureKey: "flower-fc", cost: 200, reason: "Destiny flower atelier full unlock" },
  "unlock.olympus_fc": { featureKey: "olympus-fc", cost: 100, reason: "Olympus profile unlock" },
  "unlock.all_paid_saju": { featureKey: "allPaidSaju", cost: 700, reason: "All paid saju unlock" },
  "unlock.rpg_character": { featureKey: "rpgCharacter", cost: 30, reason: "RPG character unlock" },
  "unlock.travel_destiny": { featureKey: "travelDestiny", cost: 50, reason: "Travel destiny unlock" },
  "unlock.health_report": { featureKey: "healthReport", cost: 50, reason: "Health report unlock" },
  // Legacy compatibility only. The standalone Fortune Planner never reads or charges this entry.
  "unlock.saju_diary": { featureKey: "sajuDiary", cost: 100, reason: "Saju diary unlock" },
  "unlock.saju_guardian": { featureKey: "saju-guardian-unlock", cost: 100, reason: "사주 가디언 소환진 해금" },
  "unlock.tetogen_deep_report": { featureKey: "tetogen_deep_report", cost: 100, reason: "테토 에겐 상세 리포트 해금" },
  "unlock.secret_house_episodes": { featureKey: "secretHouseEpisodes", cost: 50, reason: "Secret house episodes unlock" },
  "unlock.premium_divination_pack": { featureKey: "premiumDivinationPack", cost: 300, reason: "Premium divination pack unlock" },
  "unlock.premium_ziwei": { featureKey: "premium-ziwei", cost: 200, reason: "Premium ziwei unlock" },
  "unlock.ziwei_decade_luck": { featureKey: "ziwei_decade_luck", cost: 100, reason: "자미두수 대한 흐름 해금" },
  "unlock.ziwei_love_deep": { featureKey: "ziwei_love_deep", cost: 100, reason: "자미두수 부부궁 심화 상담 해금" },
  "unlock.ziwei_twelve_palaces": { featureKey: "ziwei_twelve_palaces", cost: 100, reason: "자미두수 12궁 정밀 해설 해금" },
  "unlock.ziwei_symbolic_layer": { featureKey: "ziwei_symbolic_layer", cost: 100, reason: "자미두수 상징 보조층 해금" },
  "unlock.ziwei_life_yearly_flow": { featureKey: "ziwei_life_yearly_flow", cost: 100, reason: "자미두수 생애 총론과 연간 흐름 해금" },
  "unlock.premium_astrology": { featureKey: "premium-astrology", cost: 390, reason: "Premium astrology unlock" },
  "unlock.premium_sukuyo": { featureKey: "premium-sukuyo", cost: 390, reason: "Premium sukuyo unlock" },
  "unlock.premium_veda": { featureKey: "premium-veda", cost: 390, reason: "Premium veda unlock" },
  "unlock.premium_naming": { featureKey: "premium-naming", cost: 700, reason: "Premium naming unlock" },
  "unlock.destiny_bias_theme_premium": { featureKey: "destiny-bias-theme-premium", cost: 100, reason: "Destiny bias theme premium unlock" },
  "unlock.destiny_bias_collection_save": { featureKey: "destiny-bias-collection-save", cost: 100, reason: "Destiny bias collection save unlock" },
  "unlock.destiny_bias_deep_profile": { featureKey: "destiny-bias-deep-profile", cost: 100, reason: "Destiny bias deep profile unlock" },
  "unlock.nakshatra_lord_report": { featureKey: "nakshatra-lord-report", cost: 100, reason: "나크샤트라 지배성 심화 리포트 해금" },
  "unlock.nakshatra_dasha_map": { featureKey: "nakshatra-dasha-map", cost: 100, reason: "나크샤트라 다샤 인생지도 해금" },
});

export const PIG_COIN_UNLOCK_PRODUCTS = normalizeRegistryPricingTable(RAW_PIG_COIN_UNLOCK_PRODUCTS);

const LEGACY_UNLOCK_PRODUCTS_65DE451 = Object.freeze({
  "unlock.section_daewun": { featureKey: "section_daewun", cost: 50, reason: "Section daewun unlock" },
  "unlock.section_summary": { featureKey: "section_summary", cost: 50, reason: "Section summary unlock" },
  "unlock.section_compat": { featureKey: "section_compat", cost: 50, reason: "Section compat unlock" },
  "unlock.flower_fc": { featureKey: "flower-fc", cost: 200, reason: "Destiny flower atelier full unlock" },
  "unlock.olympus_fc": { featureKey: "olympus-fc", cost: 100, reason: "Olympus profile unlock" },
  "unlock.all_paid_saju": { featureKey: "allPaidSaju", cost: 700, reason: "All paid saju unlock" },
  "unlock.rpg_character": { featureKey: "rpgCharacter", cost: 30, reason: "RPG character unlock" },
  "unlock.travel_destiny": { featureKey: "travelDestiny", cost: 50, reason: "Travel destiny unlock" },
  "unlock.health_report": { featureKey: "healthReport", cost: 50, reason: "Health report unlock" },
  "unlock.secret_house_episodes": { featureKey: "secretHouseEpisodes", cost: 50, reason: "Secret house episodes unlock" },
  "unlock.premium_divination_pack": { featureKey: "premiumDivinationPack", cost: 300, reason: "Premium divination pack unlock" },
  "unlock.premium_ziwei": { featureKey: "premium-ziwei", cost: 200, reason: "Premium ziwei unlock" },
  "unlock.premium_astrology": { featureKey: "premium-astrology", cost: 390, reason: "Premium astrology unlock" },
  "unlock.premium_sukuyo": { featureKey: "premium-sukuyo", cost: 390, reason: "Premium sukuyo unlock" },
  "unlock.premium_veda": { featureKey: "premium-veda", cost: 390, reason: "Premium veda unlock" },
  "unlock.premium_naming": { featureKey: "premium-naming", cost: 700, reason: "Premium naming unlock" },
});

export const UNLOCK_PRODUCT_BY_FEATURE_KEY = Object.freeze(
  Object.values(PIG_COIN_UNLOCK_PRODUCTS).reduce((acc, spec) => {
    const key = String(spec?.featureKey || "").trim();
    if (key && !acc[key]) acc[key] = spec;
    return acc;
  }, Object.create(null)),
);

export const PAID_FEATURE_BILLING_TYPES = Object.freeze({
  PER_USE: "per_use",
  UNLOCK: "unlock",
  PDF: "pdf",
});

const PER_USE_PAID_FEATURE_KEY_LIST = Object.freeze([
  "physiognomy-compatibility",
  "physiognomy-pastlife-compatibility",
  "physiognomy-ogwan-mole-deep",
  "tarot-year-fortune",
  "tarot-love-relationship",
  "tarot-reunion-reading",
  "tarot-myeongri-three-card",
  "tarot-mindscan",
  "tarot-celestial-harmony",
  "tarot-crystal-soul-reading",
  "tarot-numerology-reading",
  "tarot-prompt-maker",
  "maya-prompt-generator",
  "tarot-ijik",
  "royal-tea-oracle",
  "ifa-oracle",
  "neville-meditation",
  "cosmic-soul-meditation",
  "dream-psycho-analysis",
  "yoga-guru-per-use",
  "flower-studio-per-use",
  "fortune-tea-house-tarot-consultation",
  "fortune-tea-house-tarot-five-consultation",
  "fortune-tea-house-saju-consultation",
  "fortune-tea-house-saju-compatibility-consultation",
  "fortune-tea-house-sukuyo-compatibility-consultation",
  "sukuyo-symbolic-comparison",
  "sukuyo-past-life-reading",
  "sukuyo-monthly-fortune",
  "sukuyo-compatibility-ai",
  "astrology-ai-consultation",
  "neo-operation-room-consultation",
  "compat-astro-synastry",
  "compat-astro-direct-synastry",
  "compat-ziwei-compatibility",
  "compat-saju-compatibility",
  "compat-sukuyo-compatibility",
  "vedic-compatibility-per-use",
  "nakshatra-compat",
  "nakshatra-compat-ai",
  "nakshatra-ai-consultation",
  "nakshatra-muhurta",
  "nakshatra-vvip-codex",
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
  "animal-totem-basic",
  "animal-totem-deep",
  "destiny_meeting_place",
  "premiumTarot",
  "palm-reading-general",
  "palm-reading-ai-consult",
  "saju_ai_question_prompt",
  "new-year-ai-consultation",
  "vedic-ai-consultation",
  "love-secret-ai-consultation",
  "master-love-codex",
  "master-love-codex-compat",
  "life-book-ai-consultation",
  "life-fortune-ai-consultation",
  "karma-destiny-ai-consultation",
  "fortune-chat-consultation",
  "fusion-fortune-consultation",
  "ziwei-ai-consultation",
  "ziwei-island-palace-consult",
  "premium-naming-prompt",
  "ziwei-deep-pdf",
  "ziwei_ai_prompt_generator",
  "astrology_ai_prompt_generator",
  "vedic_ai_prompt_generator",
  "sukuyo_ai_prompt_generator",
  "vedic_prashna_prompt",
  "astro_monthly_transit",
  "astro_yearly_transit",
  "premium-sukuyo-compat-extra",
  "premium-veda-compatibility-addon",
  "destiny-bias-analyze",
  "destiny-compass-crossroads",
  "destiny-compass-life-voyage",
  "destiny-compass-future-sim",
  // 매번 새로 생성되는 개인화 리포트 → 회당 결제(영구 잠금해제 아님).
  "destiny-compass-deep-report",
  "pet-saju-ai-consultation",
  "pet-compatibility-ai",
  "profile-card-manage",
]);

const PDF_PAID_FEATURE_KEY_LIST = Object.freeze([]);

const EXTRA_UNLOCK_PAID_FEATURE_KEY_LIST = Object.freeze([
  "premium-sibyl-dominator",
  "section_daewun",
  "section_summary",
  "section_compat",
  "animal-destiny-unlock",
  "saju-guardian-unlock",
  "loveSimulation",
  "destiny-bias-theme-premium",
  "destiny-bias-collection-save",
  "destiny-bias-deep-profile",
  "nakshatra-lord-report",
  "nakshatra-dasha-map",
  "ziwei-island-deep-report",
  "rpt_specialCharmCard",
  "rpt_quantumCard",
  "rpt_healthReportCard",
  "rpt_skillTreeCard",
  "rpt_energyCoordCard",
  "rpt_villainCard",
  "rpt_secretHouseEntryCard",
  "astro_career_talent_deep",
  "astro_talent_attraction_deep",
  "astro_relationship_deep",
  "astro_growth_shadow_deep",
  "astro_basic_deep_pack",
  "astro_stellar_career_room",
  "astro_stellar_talent_room",
  "astro_stellar_relationship_room",
  "astro_stellar_growth_room",
  "fun.quantumLotto.ritualReport",
  "sukyo_yearly_fortune_unlock",
  "sukuyo-relationship-encyclopedia",
  "sukuyo-nature-deep-dive",
  // 극T 관계 회로 확장 — 사주에서 결정론으로 산출되는 고정 콘텐츠(LLM 미사용)라 재열람이 전제.
  // 회당 결제로 등록돼 있었으나 클라는 영구 해금으로 동작해 양쪽이 어긋나 있었고, 그 탓에
  // 서버가 unlockedFeatures 를 기록하지 않아 새로고침하면 결제한 잠금이 다시 닫혔다.
  // 인연 도감·운명의 섬 심층 리포트와 같은 A유형으로 맞춘다.
  "sukuyo-extreme-t-relationship",
  "premium-fpti-report",
]);

export const PER_USE_PAID_FEATURE_KEYS = Object.freeze([...PER_USE_PAID_FEATURE_KEY_LIST].sort());
export const PDF_PAID_FEATURE_KEYS = Object.freeze([...PDF_PAID_FEATURE_KEY_LIST].sort());
export const UNLOCK_PAID_FEATURE_KEYS = Object.freeze(
  Array.from(new Set([
    ...Object.keys(UNLOCK_PRODUCT_BY_FEATURE_KEY),
    ...EXTRA_UNLOCK_PAID_FEATURE_KEY_LIST,
  ])).sort(),
);

const PER_USE_PAID_FEATURE_KEY_SET = new Set(PER_USE_PAID_FEATURE_KEYS);
const PDF_PAID_FEATURE_KEY_SET = new Set(PDF_PAID_FEATURE_KEYS);
const UNLOCK_PAID_FEATURE_KEY_SET = new Set(UNLOCK_PAID_FEATURE_KEYS);

export function getPaidFeatureBillingType(featureKey) {
  const key = normalizePaidFeatureKey(featureKey);
  if (!key) return "";
  if (isMusicTrackFeatureKey(key)) return PAID_FEATURE_BILLING_TYPES.UNLOCK;
  if (UNLOCK_PAID_FEATURE_KEY_SET.has(key)) return PAID_FEATURE_BILLING_TYPES.UNLOCK;
  if (PDF_PAID_FEATURE_KEY_SET.has(key)) return PAID_FEATURE_BILLING_TYPES.PDF;
  if (PER_USE_PAID_FEATURE_KEY_SET.has(key)) return PAID_FEATURE_BILLING_TYPES.PER_USE;
  const registryPrice = Number(FEATURE_KEY_PRICE_TABLE[key]?.cost);
  return Number.isFinite(registryPrice) && registryPrice > 0 ? PAID_FEATURE_BILLING_TYPES.PER_USE : "";
}

export function isPerUsePaidFeatureKey(featureKey) {
  return getPaidFeatureBillingType(featureKey) === PAID_FEATURE_BILLING_TYPES.PER_USE;
}

export function isUnlockPaidFeatureKey(featureKey) {
  return getPaidFeatureBillingType(featureKey) === PAID_FEATURE_BILLING_TYPES.UNLOCK;
}

export const PAID_FEATURE_KEY_ALIASES = Object.freeze({
  "saju_ai_prompt_generator": "saju_ai_question_prompt",
  "premium-sukyo": "premium-sukuyo",
  "openjuyuk": "openJuyukModal",
  "openkemet": "openKemetModal",
  "opengeomancy": "openGeomancyOracle",
  "turtle-iching": "turtleIChing",
  "egypt-oracle": "egyptOracle",
  "egypt-oracle-ai-prompt": "egyptian_oracle_ai_prompt",
  "kemet-ai-prompt": "egyptian_oracle_ai_prompt",
  openRuneOracle: "stonehengeRunes",
  openAnimalTotemModal: "animal-totem-basic",
  openSajuGuardianPage: "saju-guardian-unlock",
  openSajuAnimalPage: "saju-guardian-unlock",
  openTarotLoveModal: "tarot-love-relationship",
  openTarotReunionModal: "tarot-reunion-reading",
  openTarotYearFortuneModal: "tarot-year-fortune",
  showTarotFinalInterpretation: "tarot-myeongri-three-card",
  startMindScanTarot: "tarot-mindscan",
  openMindScanTarot: "tarot-mindscan",
  openTarotMindScanModal: "tarot-mindscan",
  openCelestialHarmony: "tarot-celestial-harmony",
  openLoveSimulation: "loveSimulation",
  openDestinyFlowerStudio: "flower-studio-per-use",
  openAstrologyFlowerStudio: "flower-studio-per-use",
  openJamidusuFlowerStudio: "flower-studio-per-use",
  openSukuyoFlowerStudio: "flower-studio-per-use",
  openOlympusOracleModal: "olympus-fc",
  navigateToZiweiChart: "premium-ziwei",
  startCrystalSoulTarot: "tarot-crystal-soul-reading",
  openCrystalSoulTarot: "tarot-crystal-soul-reading",
  openTarotCrystalSoulModal: "tarot-crystal-soul-reading",
  startIjikTarot: "tarot-ijik",
  openIjikTarot: "tarot-ijik",
  openRoyalTeaOracle: "royal-tea-oracle",
  openIfaOracle: "ifa-oracle",
  openNevilleMeditationPage: "neville-meditation",
  openCosmicSoulMeditation: "cosmic-soul-meditation",
  openPsychoDreamModal: "dream-psycho-analysis",
  psychoDreamStartAnalysis: "dream-psycho-analysis",
  openYogaGuru: "yoga-guru-per-use",
  generateSibylDominatorReport: "premium-sibyl-dominator",
  openSibylDominator: "premium-sibyl-dominator",
  "sibyl-dominator": "premium-sibyl-dominator",
  "sibyl-dominator-report": "premium-sibyl-dominator",
  "premium-sibyl-dominator-report": "premium-sibyl-dominator",
  gotoZiweiPremium: "ziwei-ai-consultation",
  "ziwei-ai-prompt": "ziwei_ai_prompt_generator",
  "karma-destiny-ai": "karma-destiny-ai-consultation",
  "karma-destiny-ai-consultation": "karma-destiny-ai-consultation",
  openKarmaDestinyAi: "karma-destiny-ai-consultation",
  premium_fpti_report: "premium-fpti-report",
  generateFptiDeepReport: "premium-fpti-report",
  openFptiDeepReport: "premium-fpti-report",
  "tetogen-deep-report": "tetogen_deep_report",
  tetogenDeepReport: "tetogen_deep_report",
  openTetogenDeepReport: "tetogen_deep_report",
  gotoAstrologyPremium: "astrology-ai-consultation",
  gotoNeoOperationRoom: "neo-operation-room-consultation",
  "neo-operation-room": "neo-operation-room-consultation",
  "neo-operation-room-consultation": "neo-operation-room-consultation",
  gotoSukuyoPremium: "sukuyo-compatibility-ai",
  "extreme-t-relationship-circuit": "sukuyo-extreme-t-relationship",
  gotoVedicPremium: "vedic-ai-consultation",
  "vedic-ai-consultation": "vedic-ai-consultation",
  vedicAiConsultation: "vedic-ai-consultation",
  gotoNamingPremium: "premium-naming-prompt",
  openNamingPromptModal: "premium-naming-prompt",
  naming_prompt: "premium-naming-prompt",
  namingPrompt: "premium-naming-prompt",
  premiumNamingPrompt: "premium-naming-prompt",
  premium_naming_prompt: "premium-naming-prompt",
  premium_naming_report: "premium-naming-prompt",
  "premium-naming-report": "premium-naming-prompt",
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

  const matched = normalizePaidFeaturePricingShape(table[reasonText] || {});
  if (!Number.isFinite(matched.cost) || matched.cost <= 0) return null;
  return matched.cost;
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
      const expectedFeatureKey = String(expected.featureKey || "").trim();
      const actualFeatureKey = String(actual.featureKey || "").trim();
      const expectedReason = String(expected.reason || "").trim();
      const actualReason = String(actual.reason || "").trim();

      const isDifferent = (
        expectedCost !== actualCost
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
          accessModel: String(actual.accessModel || "per_use"),
        },
      };
    })
    .filter(Boolean);
}

export function listServerPricedFeatureKeys() {
  const pricedRegistryKeys = Object.entries(FEATURE_KEY_PRICE_TABLE)
    .filter(([, entry]) => Number(entry?.cost) > 0)
    .map(([key]) => key);
  const keys = new Set([
    "coin-gate-per-use",
    ...pricedRegistryKeys,
    ...Object.keys(UNLOCK_PRODUCT_BY_FEATURE_KEY),
    ...Object.keys(PAID_FEATURE_KEY_ALIASES),
  ]);
  return Array.from(keys).sort();
}

export const FRONTEND_PAID_FEATURE_KEYS = Object.freeze(
  Array.from(new Set(INTERNAL_FRONTEND_FEATURE_KEYS)).sort(),
);

const makeChapter = (id, title, minChars, targetChars, requiredDataKeys = []) => ({
  id,
  title,
  minChars,
  targetChars,
  requiredDataKeys,
});

const buildIndexedChapters = (prefix, titles, minChars, targetChars) =>
  titles.map((title, idx) => makeChapter(`${prefix}_${String(idx + 1).padStart(2, "0")}`, title, minChars, targetChars));

const LIFE_BOOK_TITLES = [
  "핵심 정체성",
  "타고난 성향",
  "인생의 소명",
  "직업과 사회적 방향",
  "재물 흐름",
  "관계와 사랑",
  "건강과 에너지",
  "인생 전환점",
  "반복 신호",
  "충돌 신호",
  "종합 인생 전략",
  "인생 실행 전략",
  "최종 마스터 플랜",
];

const LOVE_SOLO_TITLES = [
  "본연의 연애 자아",
  "치명적 매력과 페로몬",
  "시기별 연애운 흐름",
  "연애의 어두운 면과 위기 관리",
  "현대적 상황별 연애 비책",
];

const LOVE_COMPATIBILITY_TITLES = [
  "두 사람의 연애 자아",
  "상호 매력과 페로몬",
  "운명의 상대 일치도",
  "관계 운영 커뮤니케이션",
  "시기별 궁합 흐름",
  "갈등 패턴과 위기 관리",
  "두 사람의 궁합 심층 진단",
  "육체적 궁합과 매력 온도",
  "결혼 시기와 장기 정착",
  "속궁합과 친밀 리듬",
  "공동 개운 처방전",
];

const ZIWEI_TITLES = [
  "명궁 완전 해석",
  "신궁 통합 해석",
  "복덕궁",
  "천이궁",
  "관록궁",
  "재백궁",
  "부처궁",
  "교우궁",
  "전택궁",
  "질액궁",
  "대운/대한 흐름",
  "유년/유월 흐름",
  "마스터플랜 총결론",
];

const SUKYO_TITLES = [
  "본명숙 원형 해독",
  "달의 주기와 정서 리듬",
  "페르소나와 첫인상",
  "자산 감각과 생활 기반",
  "협업과 조직 적응",
  "관계 감지력",
  "위기와 전환",
  "가족과 뿌리",
  "욕망과 추진력",
  "내면 회복과 영성",
];

const VEDIC_TITLES = [
  "카르마 블루프린트 소개",
  "라그나와 영혼의 목적",
  "문 나크샤트라",
  "다샤 흐름",
  "부와 번영의 정렬",
  "카르마와 천직",
  "나밤샤 성숙도",
  "관계 궁합 구조",
  "인연의 깊이",
  "생명력과 정화",
  "요가 분석",
  "우파야 실천",
  "고차라 연간 전략",
  "마스터플랜 결론",
];

const ASTRO_TITLES = [
  "ASC/Chart Ruler",
  "Sun 구조",
  "Moon 구조",
  "Mercury 사고/언어",
  "Venus 가치/사랑",
  "Mars 추진력",
  "Jupiter 확장",
  "Saturn 장기성취",
  "외행성 변곡점",
  "노드 성장축",
  "차트 밸런스",
  "트랜짓/프로그레션",
  "마스터플랜",
];

export const PREMIUM_PDF_SPECS = {
  saju_life_book: {
    title: "사주 인생의 책",
    featureType: "saju_life_book",
    minTotalChars: 78000,
    targetTotalChars: 86000,
    chapters: buildIndexedChapters("life_ch", LIFE_BOOK_TITLES, 6000, 6600),
    legacyReportType: "lifeBook",
  },
  saju_love_secret: {
    title: "사주 연애 비책",
    featureType: "saju_love_secret",
    supportedModes: ["solo", "compatibility"],
    minTotalChars: 22000,
    targetTotalChars: 28000,
    chaptersByMode: {
      solo: [
        makeChapter("love_solo_01", LOVE_SOLO_TITLES[0], 4200, 4800),
        makeChapter("love_solo_02", LOVE_SOLO_TITLES[1], 4200, 4800),
        makeChapter("love_solo_03", LOVE_SOLO_TITLES[2], 4600, 5200),
        makeChapter("love_solo_04", LOVE_SOLO_TITLES[3], 4200, 4800),
        makeChapter("love_solo_05", LOVE_SOLO_TITLES[4], 4200, 4800),
      ],
      compatibility: [
        makeChapter("love_comp_01", LOVE_COMPATIBILITY_TITLES[0], 6000, 6800),
        makeChapter("love_comp_02", LOVE_COMPATIBILITY_TITLES[1], 6000, 6800),
        makeChapter("love_comp_03", LOVE_COMPATIBILITY_TITLES[2], 6500, 7200),
        makeChapter("love_comp_04", LOVE_COMPATIBILITY_TITLES[3], 5500, 6200),
        makeChapter("love_comp_05", LOVE_COMPATIBILITY_TITLES[4], 6500, 7200),
        makeChapter("love_comp_06", LOVE_COMPATIBILITY_TITLES[5], 5500, 6200),
        makeChapter("love_comp_07", LOVE_COMPATIBILITY_TITLES[6], 6000, 6800),
        makeChapter("love_comp_08", LOVE_COMPATIBILITY_TITLES[7], 6200, 7000),
        makeChapter("love_comp_09", LOVE_COMPATIBILITY_TITLES[8], 6500, 7200),
        makeChapter("love_comp_10", LOVE_COMPATIBILITY_TITLES[9], 6200, 7000),
        makeChapter("love_comp_11", LOVE_COMPATIBILITY_TITLES[10], 6000, 6800),
      ],
    },
    legacyReportType: "loveSecret",
  },
  jamidusu_premium: {
    title: "프리미엄 자미두수",
    featureType: "jamidusu_premium",
    minTotalChars: 67600,
    targetTotalChars: 76000,
    chapters: buildIndexedChapters("ziwei_ch", ZIWEI_TITLES, 5200, 5800),
    legacyReportType: "ziweiPremium",
  },
  sookyo_premium: {
    title: "프리미엄 숙요점",
    featureType: "sookyo_premium",
    minTotalChars: 24000,
    targetTotalChars: 36000,
    chapters: buildIndexedChapters("sukyo_ch", SUKYO_TITLES, 2200, 3200),
    legacyReportType: "sookyoPremium",
  },
  vedic_premium: {
    title: "프리미엄 베다점",
    featureType: "vedic_premium",
    minTotalChars: 56000,
    targetTotalChars: 63000,
    chapters: buildIndexedChapters("vedic_ch", VEDIC_TITLES, 4000, 4500),
    legacyReportType: "vedicPremium",
  },
  astrology_premium: {
    title: "프리미엄 점성술",
    featureType: "astrology_premium",
    minTotalChars: 45500,
    targetTotalChars: 52000,
    chapters: buildIndexedChapters("astro_ch", ASTRO_TITLES, 3500, 4000),
    legacyReportType: "westernAstrologyPremium",
  },
};

export const FEATURE_TYPE_TO_REPORT_TYPE = {
  saju_life_book: "lifeBook",
  saju_love_secret: "loveSecret",
  jamidusu_premium: "ziweiPremium",
  sookyo_premium: "sookyoPremium",
  vedic_premium: "vedicPremium",
  astrology_premium: "westernAstrologyPremium",
};

export const REPORT_TYPE_TO_FEATURE_TYPE = Object.fromEntries(
  Object.entries(FEATURE_TYPE_TO_REPORT_TYPE).map(([featureType, reportType]) => [reportType, featureType]),
);

export function getPremiumSpecByFeatureType(featureType, mode = "") {
  const normalized = String(featureType || "").trim();
  const spec = PREMIUM_PDF_SPECS[normalized];
  if (!spec) return null;

  if (normalized !== "saju_love_secret") {
    return {
      ...spec,
      chapters: Array.isArray(spec.chapters) ? spec.chapters : [],
      chapterCount: Array.isArray(spec.chapters) ? spec.chapters.length : 0,
    };
  }

  const rawMode = String(mode || "").trim().toLowerCase();
  const normalizedMode = (rawMode === "compatibility" || rawMode === "couple" || rawMode === "compat")
    ? "compatibility"
    : "solo";
  const chapters = spec.chaptersByMode?.[normalizedMode] || spec.chaptersByMode?.solo || [];
  const minTotalChars = normalizedMode === "compatibility" ? 68000 : 22000;
  const targetTotalChars = normalizedMode === "compatibility" ? 76000 : 28000;

  return {
    ...spec,
    mode: normalizedMode,
    minTotalChars,
    targetTotalChars,
    chapters,
    chapterCount: chapters.length,
  };
}

export function getPremiumSpecByReportType(reportType, mode = "") {
  const featureType = REPORT_TYPE_TO_FEATURE_TYPE[String(reportType || "").trim()] || "";
  if (!featureType) return null;
  return getPremiumSpecByFeatureType(featureType, mode);
}

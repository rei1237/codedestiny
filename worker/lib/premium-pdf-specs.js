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
  "운명의 상대방 리포트",
  "실전 연애 전략 및 스킬",
  "시기별 연애운 흐름",
  "연애의 어두운 면과 위기 관리",
  "친밀감과 감정 리듬",
  "현대적 상황별 연애 비책",
  "결혼과 정착",
  "맞춤형 연애 개운 처방전",
  "재회·이별·회복 시나리오",
  "장기 관계 운영 매뉴얼",
  "최종 사랑 마스터플랜",
];

const LOVE_COMPATIBILITY_TITLES = [
  "두 사람의 연애 자아",
  "상호 매력과 페로몬",
  "운명의 상대 일치도",
  "관계 운영 커뮤니케이션",
  "시기별 궁합 흐름",
  "갈등 패턴과 위기 관리",
  "친밀감과 감정 리듬",
  "현대적 상황별 커뮤니케이션",
  "결혼 시기와 장기 정착",
  "공동 개운 처방전",
  "재회·이별·회복 시나리오",
  "장기 관계 운영 매뉴얼",
  "두 사람의 최종 마스터플랜",
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

const SUKYO_PERSONAL_TITLES = [
  "영혼의 원형",
  "감정의 조수간만",
  "페르소나와 브랜딩",
  "자산의 중력",
  "보이지 않는 톱니바퀴",
  "관계의 정밀 레이더",
  "파괴적 혁신",
  "조화로운 성장",
  "정서적 유대",
  "운명적 거리",
  "달의 주기",
  "영혼의 마스터플랜",
];

const SUKYO_COMPAT_TITLES = [
  "두 사람의 원형 좌표",
  "관계 거리와 역할",
  "첫 끌림과 정서 파동",
  "갈등 트리거와 그림자",
  "신뢰와 안정성",
  "친밀감과 사랑 언어",
  "대화 구조와 오해 해소",
  "협업·재정·생활 궁합",
  "위기 대응과 회복",
  "관계 유형 심층 리딩",
  "30일 관계 실행 플랜",
  "최종 궁합 총평",
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

const ASTRO_PERSONAL_TITLES = [
  "기본 차트 요약",
  "자아와 정체성",
  "감정과 무의식",
  "사고/소통 스타일",
  "사랑/관계 스타일",
  "행동/에너지 패턴",
  "확장/행운 포인트",
  "책임/성취 구조",
  "변화/성장 트리거",
  "영혼 과제/노드 축",
  "커리어/사회적 포지션",
  "연간 흐름/실행 로드맵",
];

const ASTRO_COMPATIBILITY_TITLES = [
  "두 사람의 관계 총론",
  "태양/달 페어링",
  "금성/화성 케미",
  "수성/소통 호환",
  "갈등 트리거/힐링",
  "장기 안정성",
  "친밀도/성적 리듬",
  "결혼/동거 현실성",
  "재정/커리어 합",
  "자녀/가정 운영",
  "위기 시나리오",
  "관계 운영 마스터 플랜",
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
    minTotalChars: 52000,
    targetTotalChars: 60000,
    chaptersByMode: {
      solo: LOVE_SOLO_TITLES.map((title, idx) => {
        const chapter = idx + 1;
        const minChars = chapter === 3 || chapter === 5 || chapter === 9 ? 4300 : 3900;
        return makeChapter(`love_solo_${String(chapter).padStart(2, "0")}`, title, minChars, minChars + 500);
      }),
      compatibility: LOVE_COMPATIBILITY_TITLES.map((title, idx) => {
        const chapter = idx + 1;
        const minChars = chapter === 3 || chapter === 5 || chapter === 9 ? 5600 : 5200;
        return makeChapter(`love_comp_${String(chapter).padStart(2, "0")}`, title, minChars, minChars + 700);
      }),
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
    supportedModes: ["personal", "compatibility"],
    minTotalChars: 32000,
    targetTotalChars: 42000,
    chaptersByMode: {
      personal: buildIndexedChapters("sukyo_p", SUKYO_PERSONAL_TITLES, 2400, 3200),
      compatibility: buildIndexedChapters("sukyo_c", SUKYO_COMPAT_TITLES, 2600, 3400),
    },
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
    supportedModes: ["personal", "compatibility"],
    minTotalChars: 42000,
    targetTotalChars: 52000,
    chaptersByMode: {
      personal: buildIndexedChapters("astro_p", ASTRO_PERSONAL_TITLES, 3200, 3900),
      compatibility: buildIndexedChapters("astro_c", ASTRO_COMPATIBILITY_TITLES, 3200, 3900),
    },
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

  if (!spec.chaptersByMode) {
    return {
      ...spec,
      chapters: Array.isArray(spec.chapters) ? spec.chapters : [],
      chapterCount: Array.isArray(spec.chapters) ? spec.chapters.length : 0,
    };
  }

  const rawMode = String(mode || "").trim().toLowerCase();
  let normalizedMode = "default";
  if (normalized === "saju_love_secret") {
    normalizedMode = (rawMode === "compatibility" || rawMode === "couple" || rawMode === "compat")
      ? "compatibility"
      : "solo";
  } else if (normalized === "sookyo_premium") {
    normalizedMode = (rawMode === "compatibility" || rawMode === "couple" || rawMode === "compat")
      ? "compatibility"
      : "personal";
  } else if (normalized === "astrology_premium") {
    normalizedMode = (rawMode === "compatibility" || rawMode === "couple" || rawMode === "compat")
      ? "compatibility"
      : "personal";
  }

  const fallbackMode = Object.keys(spec.chaptersByMode || {})[0] || "";
  const chapters = spec.chaptersByMode?.[normalizedMode] || spec.chaptersByMode?.[fallbackMode] || [];
  let minTotalChars = Number(spec.minTotalChars || 0);
  let targetTotalChars = Number(spec.targetTotalChars || 0);

  if (normalized === "saju_love_secret") {
    minTotalChars = normalizedMode === "compatibility" ? 70000 : 52000;
    targetTotalChars = normalizedMode === "compatibility" ? 82000 : 60000;
  }

  if (normalized === "sookyo_premium") {
    minTotalChars = normalizedMode === "compatibility" ? 34000 : 32000;
    targetTotalChars = normalizedMode === "compatibility" ? 44000 : 42000;
  }

  if (normalized === "astrology_premium") {
    minTotalChars = normalizedMode === "compatibility" ? 42000 : 38000;
    targetTotalChars = normalizedMode === "compatibility" ? 52000 : 47000;
  }

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

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

const SAJU_NEW_YEAR_TITLES = [
  "연간 파동 총론 - 올해의 기본 기조",
  "커리어 전략 - 성과가 나는 월/주의 월",
  "재물 흐름 - 수익/지출 관리 타이밍",
  "관계·인맥 - 협업과 거리두기 전략",
  "연애·가정 - 감정 파동 관리법",
  "건강·에너지 - 번아웃 방지 설계",
  "분기별 핵심 의사결정 포인트",
  "리스크 시나리오와 대응 플랜",
  "12개월 Go/Stop 월별 테이블",
  "최종 실행 로드맵 - 연말 회수 전략",
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
  "나의 별이 말하는 운명의 본질",
  "타고난 성격과 내면의 결",
  "재능과 성공 가능성",
  "일과 사회적 운명",
  "돈과 현실 감각",
  "사랑과 인연의 방식",
  "인간관계와 귀인운",
  "감정의 그림자와 마음의 회복",
  "인생의 전환점과 운의 흐름",
  "건강한 생활 리듬과 에너지 관리",
  "올해와 가까운 미래의 운용 전략",
  "숙요점 인생 마스터플랜",
];

const SUKYO_COMPAT_TITLES = [
  "두 별의 본질과 관계의 시작",
  "감정 온도차와 대화 방식",
  "사랑의 역할과 관계 균형",
  "현실 궁합",
  "주변 사람과 생활 리듬",
  "갈등과 이별 위기",
  "결혼과 장기 파트너 가능성",
  "올해 흐름과 최종 궁합 봉서",
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
  "나의 우주적 정체성 — 태양·달·상승궁의 핵심 구조",
  "에너지 밸런스 — 원소와 모드로 보는 삶의 리듬",
  "인생의 네 기둥 — ASC·IC·DSC·MC 완전 해석",
  "마음과 사고방식 — 달·수성으로 보는 내면과 언어",
  "사랑과 욕망 — 금성·화성으로 보는 관계와 끌림",
  "성장과 확장 — 목성·토성으로 보는 기회와 과제",
  "깊은 변화의 서사 — 천왕성·해왕성·명왕성의 인생 테마",
  "하우스별 인생 지도 — 삶의 12영역 해석",
  "애스펙트와 내면 패턴 — 재능, 갈등, 반복되는 운명",
  "직업·돈·사회적 성공 — 현실에서 빛나는 방식",
  "올해와 가까운 미래의 운세 로드맵",
  "점성술 인생 마스터플랜",
];

const ASTRO_COMPATIBILITY_TITLES = [
  "두 사람의 우주적 첫인상 — 관계가 시작된 이유",
  "태양과 달의 궁합 — 자아와 감정의 조화",
  "금성과 화성의 끌림 — 사랑, 욕망, 애정 표현",
  "수성과 대화 궁합 — 말, 생각, 오해의 구조",
  "7하우스와 파트너십 — 연애·결혼 관계의 핵심",
  "갈등과 상처 패턴 — 충돌 애스펙트와 감정의 그림자",
  "현실 궁합 — 돈, 일, 생활 리듬의 조화",
  "장기 인연과 성장 가능성 — 토성·목성의 관계 과제",
  "올해 두 사람의 관계 흐름",
  "최종 궁합 봉서 — 사랑, 성장, 동반자 가능성",
];

export const PREMIUM_PDF_SPECS = {
  saju_new_year_pdf: {
    title: "사주 신년운세 PDF",
    featureType: "saju_new_year_pdf",
    minTotalChars: 30000,
    targetTotalChars: 36000,
    chapters: SAJU_NEW_YEAR_TITLES.map((title, idx) => {
      const chapter = idx + 1;
      const minChars = chapter === 9 ? 3200 : 2600;
      return makeChapter(`newyear_ch_${String(chapter).padStart(2, "0")}`, title, minChars, minChars + 500);
    }),
    legacyReportType: "sajuNewYear",
  },
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
    minTotalChars: 38000,
    targetTotalChars: 47000,
    chaptersByMode: {
      personal: buildIndexedChapters("astro_p", ASTRO_PERSONAL_TITLES, 3200, 3900),
      compatibility: buildIndexedChapters("astro_c", ASTRO_COMPATIBILITY_TITLES, 3200, 3900),
    },
    legacyReportType: "westernAstrologyPremium",
  },
};

export const FEATURE_TYPE_TO_REPORT_TYPE = {
  saju_new_year_pdf: "sajuNewYear",
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
    minTotalChars = normalizedMode === "compatibility" ? 34000 : 38000;
    targetTotalChars = normalizedMode === "compatibility" ? 42000 : 47000;
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

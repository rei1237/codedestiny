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
  "나의 숙명 총론 — 27숙이 말하는 인생의 첫인상",
  "성격과 내면 구조 — 내가 나를 이해하는 법",
  "인간관계와 인연의 결 — 누구와 가까워지고 멀어지는가",
  "사랑의 방식 — 나는 어떻게 사랑하는가",
  "운명의 상대상 — 어떤 사람과 깊어지는가",
  "일과 재능 — 내 숙이 빛나는 자리",
  "재물과 현실 감각 — 돈이 모이고 새는 방식",
  "가족과 뿌리 — 오래된 감정의 원형",
  "위기와 전환점 — 무너질 때 다시 서는 법",
  "운의 흐름과 기회 — 내 숙이 살아나는 타이밍",
  "실전 생활 전략 — 숙명을 매일의 선택으로 바꾸는 법",
  "최종 숙명 선언문 — 내 삶을 다시 쓰는 문장",
];

const SUKYO_COMPAT_TITLES = [
  "두 사람의 숙요 궁합 총론 — 왜 끌렸고 왜 흔들리는가",
  "숙요 관계 유형 분석 — 명·업태·영친·우쇠·안괴·위성·성위의 의미",
  "거리감 분석 — 근거리·중거리·원거리의 실제 체감",
  "감정 궁합 — 마음이 통하는 지점과 막히는 지점",
  "연애 궁합 — 설렘, 집착, 안정감의 균형",
  "결혼과 장기 관계 — 함께 살아갈 수 있는가",
  "갈등 구조 — 반복되는 싸움의 진짜 원인",
  "이별과 재회 가능성 — 다시 이어질 수 있는 인연인가",
  "운명적 인연성 — 깊은 인연인가, 지나가는 인연인가",
  "현실 문제 궁합 — 돈, 일, 가족, 생활 리듬",
  "관계 운영 전략 — 이 관계를 살리는 구체적 방법",
  "최종 궁합 선언문 — 두 사람이 선택해야 할 방향",
];

const SUKYO_PERSONAL_TARGETS = [4500, 4200, 4200, 4500, 4000, 4300, 3800, 3800, 4000, 4100, 4000, 4600];
const SUKYO_COMPAT_TARGETS = [4600, 4800, 3800, 4300, 4300, 4200, 4300, 4000, 3800, 4000, 4100, 4100];

const VEDIC_SOLO_TITLES = [
  "베다 차트 총론 — 영혼이 선택한 삶의 지도",
  "라그나 완전 해석 — 세상에 태어난 방식",
  "달과 나크샤트라 — 마음, 기억, 감정의 별자리",
  "태양과 아트마카라카 — 영혼의 자존감과 사명",
  "행성 배치 해석 — 내 안의 아홉 가지 힘",
  "12하우스 인생 분석 — 삶이 펼쳐지는 무대",
  "사랑과 결혼 — 금성, 7하우스, 다라카라카의 비밀",
  "직업과 재물 — 2·6·10·11하우스의 성공 전략",
  "가족·상처·카르마 — 4·8·12하우스의 깊은 이야기",
  "요가와 도샤 — 차트에 숨은 특별한 패턴",
  "다샤 흐름 — 인생의 시기와 전환점",
  "최종 베다 인생 전략 — 내 차트를 현실로 살아내는 법",
];

const VEDIC_COMPAT_TITLES = [
  "두 사람의 베다 궁합 총론 — 왜 끌리고 왜 흔들리는가",
  "아쉬타쿠타 궁합 — 구나 밀란이 보여주는 기본 궁합",
  "나크샤트라 궁합 — 감정과 본능의 끌림",
  "라그나 궁합 — 삶의 방향과 생활 리듬",
  "금성·화성 궁합 — 설렘, 욕망, 애정 표현",
  "7하우스와 결혼 가능성 — 관계가 오래 갈 수 있는가",
  "나바암샤 궁합 — 결혼 이후의 진짜 모습",
  "망갈릭·도샤 궁합 — 갈등과 충돌의 위험도",
  "다샤 궁합 — 두 사람의 타이밍이 맞는가",
  "이별과 재회 가능성 — 다시 이어질 수 있는 인연인가",
  "현실 문제 궁합 — 돈, 일, 가족, 생활 방식",
  "최종 베다 궁합 전략 — 두 사람이 선택해야 할 방향",
];

const VEDIC_SOLO_TARGETS = [4500, 4300, 4300, 4000, 4600, 4800, 4400, 4500, 3900, 3900, 4200, 4600];
const VEDIC_COMPAT_TARGETS = [4600, 4800, 4200, 4200, 4300, 4500, 4100, 3900, 4000, 4000, 4100, 4300];

const ASTRO_PERSONAL_TITLES = [
  "출생차트 총론 — 하늘이 남긴 첫 설계도",
  "태양·달·상승궁 — 자아, 감정, 페르소나의 삼각형",
  "행성 배치 완전 해석 — 내 안의 열 가지 목소리",
  "12하우스 분석 — 삶이 펼쳐지는 무대",
  "주요 각도 분석 — 재능과 긴장의 숨은 회로",
  "원소·모드·극성 — 기질의 밸런스 지도",
  "사랑과 관계 — 금성, 화성, 7하우스가 말하는 애정 방식",
  "직업·재물·사회적 성공 — MC와 2·6·10하우스의 전략",
  "가족·상처·무의식 — 달, IC, 4·8·12하우스의 깊은 이야기",
  "성장·철학·영성 — 목성, 토성이 이끄는 길",
  "시기운과 변화의 흐름 — 지금부터 열리는 하늘의 리듬",
  "최종 인생 전략 — 내 별자리를 현실로 살아내는 법",
];

const ASTRO_PERSONAL_TARGETS = [4500, 4500, 4300, 4800, 4500, 4000, 4200, 4500, 3800, 3600, 4100, 4300];

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
    minTotalChars: 48000,
    targetTotalChars: 52000,
    chapters: SAJU_NEW_YEAR_TITLES.map((title, idx) => {
      const chapter = idx + 1;
      const chapterTargets = [4800, 5200, 4800, 4400, 4800, 4200, 5200, 5200, 6200, 5200];
      const targetChars = Number(chapterTargets[idx] || 5000);
      const minChars = Math.max(3200, Math.floor(targetChars * 0.85));
      return makeChapter(`newyear_ch_${String(chapter).padStart(2, "0")}`, title, minChars, targetChars);
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
    minTotalChars: 48000,
    targetTotalChars: 52000,
    chaptersByMode: {
      personal: SUKYO_PERSONAL_TITLES.map((title, idx) => {
        const chapter = idx + 1;
        const targetChars = Number(SUKYO_PERSONAL_TARGETS[idx] || 4200);
        const minChars = Math.max(3200, Math.floor(targetChars * 0.85));
        return makeChapter(`sukyo_p_${String(chapter).padStart(2, "0")}`, title, minChars, targetChars);
      }),
      compatibility: SUKYO_COMPAT_TITLES.map((title, idx) => {
        const chapter = idx + 1;
        const targetChars = Number(SUKYO_COMPAT_TARGETS[idx] || 4200);
        const minChars = Math.max(3200, Math.floor(targetChars * 0.85));
        return makeChapter(`sukyo_c_${String(chapter).padStart(2, "0")}`, title, minChars, targetChars);
      }),
    },
    legacyReportType: "sookyoPremium",
  },
  vedic_premium: {
    title: "프리미엄 베다점",
    featureType: "vedic_premium",
    supportedModes: ["solo", "single", "personal", "compatibility"],
    minTotalChars: 48000,
    targetTotalChars: 52000,
    chaptersByMode: {
      solo: VEDIC_SOLO_TITLES.map((title, idx) => {
        const chapter = idx + 1;
        const targetChars = Number(VEDIC_SOLO_TARGETS[idx] || 4200);
        const minChars = Math.max(3200, Math.floor(targetChars * 0.85));
        return makeChapter(`vedic_s_${String(chapter).padStart(2, "0")}`, title, minChars, targetChars);
      }),
      compatibility: VEDIC_COMPAT_TITLES.map((title, idx) => {
        const chapter = idx + 1;
        const targetChars = Number(VEDIC_COMPAT_TARGETS[idx] || 4200);
        const minChars = Math.max(3200, Math.floor(targetChars * 0.85));
        return makeChapter(`vedic_c_${String(chapter).padStart(2, "0")}`, title, minChars, targetChars);
      }),
    },
    legacyReportType: "vedicPremium",
  },
  astrology_premium: {
    title: "프리미엄 점성술",
    featureType: "astrology_premium",
    supportedModes: ["personal", "compatibility"],
    minTotalChars: 48000,
    targetTotalChars: 52000,
    chaptersByMode: {
      personal: ASTRO_PERSONAL_TITLES.map((title, idx) => {
        const targetChars = Number(ASTRO_PERSONAL_TARGETS[idx] || 4200);
        const minChars = Math.max(3000, Math.floor(targetChars * 0.85));
        return makeChapter(`astro_p_${String(idx + 1).padStart(2, "0")}`, title, minChars, targetChars);
      }),
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
  } else if (normalized === "vedic_premium") {
    normalizedMode = (rawMode === "compatibility" || rawMode === "couple" || rawMode === "compat")
      ? "compatibility"
      : "solo";
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
    minTotalChars = 48000;
    targetTotalChars = 52000;
  }

  if (normalized === "astrology_premium") {
    minTotalChars = normalizedMode === "compatibility" ? 34000 : 48000;
    targetTotalChars = normalizedMode === "compatibility" ? 42000 : 52000;
  }

  if (normalized === "vedic_premium") {
    minTotalChars = 48000;
    targetTotalChars = normalizedMode === "compatibility" ? 52000 : 50000;
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

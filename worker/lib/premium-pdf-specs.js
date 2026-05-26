import { buildLifeBookChapterPlan } from "./saju/life-book/chapterConfig.js";
import {
  LOVE_SECRET_MODE_CONFIG,
  SAJU_NEW_YEAR_CHAPTERS,
  SAJU_NEW_YEAR_CHAPTER_TARGETS,
} from "./saju-premium-chapters.js";
import { getSukyoPdfChapters } from "./sukyo-pdf.js";

const makeChapter = (id, title, minChars, targetChars, requiredDataKeys = []) => ({
  id,
  title,
  minChars,
  targetChars,
  requiredDataKeys,
});

const buildIndexedChapters = (prefix, titles, minChars, targetChars) =>
  titles.map((title, idx) => makeChapter(`${prefix}_${String(idx + 1).padStart(2, "0")}`, title, minChars, targetChars));

const LIFE_BOOK_TITLES = buildLifeBookChapterPlan().map((chapter) => String(chapter?.title || "").trim()).filter(Boolean);

const SAJU_NEW_YEAR_TITLES = SAJU_NEW_YEAR_CHAPTERS.map((chapter) => String(chapter?.title || "").trim()).filter(Boolean);

const LOVE_SOLO_TITLES = LOVE_SECRET_MODE_CONFIG.solo.chapters.map((chapter) => String(chapter?.title || "").trim()).filter(Boolean);

const LOVE_COMPATIBILITY_TITLES = LOVE_SECRET_MODE_CONFIG.couple.chapters.map((chapter) => String(chapter?.title || "").trim()).filter(Boolean);

const ZIWEI_TITLES = [
  "Ch.1 명궁 완전 해독 — 타고난 인생 설계도",
  "Ch.2 신궁 심층 분석 — 후천적으로 완성되는 나",
  "Ch.3 형제궁과 인간관계의 거리감",
  "Ch.4 부부궁 연애와 결혼",
  "Ch.5 자녀궁과 창조성",
  "Ch.6 재백궁 재물 흐름",
  "Ch.7 질액궁 건강과 에너지",
  "Ch.8 천이궁 이동·변화·확장 운",
  "Ch.9 노복궁 네트워크와 귀인운",
  "Ch.10 관록궁 커리어·직업·사회적 성취",
  "Ch.11 전택궁 자산·주거·안정 기반",
  "Ch.12 복덕궁 마음의 복과 인생 운영 전략",
];

const buildSukyoSpecChapters = (mode) => getSukyoPdfChapters(mode).map((chapter, idx) => {
  const chapterNo = idx + 1;
  const targetChars = Number(chapter?.targetChars || 4200);
  const minChars = Number(chapter?.minChars || Math.max(3200, Math.floor(targetChars * 0.85)));
  const prefix = mode === "compatibility" ? "sukyo_c" : "sukyo_p";
  return makeChapter(
    `${prefix}_${String(chapterNo).padStart(2, "0")}`,
    String(chapter?.title || `Chapter ${chapterNo}`),
    minChars,
    targetChars,
  );
});

const VEDIC_SOLO_TITLES = [
  "I. 베다 차트 총론 — 나의 카르마 설계도",
  "II. 라그나 분석 — 이번 생의 출발점과 인생 방향",
  "III. 달 차트 분석 — 마음, 감정, 무의식의 흐름",
  "IV. 태양 분석 — 자아, 명예, 삶의 중심성",
  "V. 9행성 완전 해석 — 운명을 움직이는 행성의 힘",
  "VI. 12하우스 분석 — 인생 영역별 카르마 지도",
  "VII. 나크샤트라 분석 — 영혼의 성향과 본능",
  "VIII. 요가 분석 — 성공, 재물, 명예의 특수 구조",
  "IX. 도샤와 리스크 분석 — 막힘과 반복되는 시련",
  "X. 직업·재물·성공운 — 현실 성취의 구조",
  "XI. 연애·결혼·배우자운 — 인연과 파트너십 분석",
  "XII. 건강·심리·생활운 — 몸과 마음의 균형",
  "XIII. 다샤 분석 — 인생 시기별 운의 흐름",
  "XIV. 고차원 차트 분석 — 세부 운명 보정",
  "XV. 트랜짓 분석 — 현재 하늘이 여는 운의 변화",
  "XVI. 최종 종합 리포트 — 나의 카르마 사용법",
];

const VEDIC_SOLO_TARGETS = [4500, 4300, 4300, 4000, 4600, 4800, 4400, 4500, 3900, 3900, 4200, 4100, 4200, 4100, 4000, 4600];

const ASTRO_PERSONAL_TITLES = [
  "Ch.1 점성술 차트 핵심 총론 — 나라는 우주의 기본 설계",
  "Ch.2 태양과 삶의 방향 — 내가 되어야 할 중심",
  "Ch.3 달과 감정 구조 — 마음이 반응하는 방식",
  "Ch.4 상승궁과 1하우스 — 세상에 드러나는 나",
  "Ch.5 수성·금성·화성 — 생각, 사랑, 행동의 방식",
  "Ch.6 커리어와 사회적 역할 — MC와 10하우스",
  "Ch.7 사랑과 관계 — 5하우스, 7하우스, 금성의 신호",
  "Ch.8 돈과 재능 — 2하우스, 6하우스, 11하우스",
  "Ch.9 위기와 변형 — 8하우스, 12하우스, 명왕성",
  "Ch.10 최종 인생 전략 — 차트 종합 로드맵",
];

const ASTRO_PERSONAL_TARGETS = [4500, 4500, 4300, 4300, 4200, 4200, 4300, 4300, 4200, 4600];

const REPORT_SUBTITLE_BY_FEATURE_TYPE = {
  saju_life_book: "사주의 뼈대부터 대운 전략까지, 실행 가능한 장기 로드맵",
  saju_love_secret: "연애 패턴과 관계 전략을 실전 중심으로 정리한 프리미엄 리포트",
  saju_new_year_pdf: "올해 12개월 Go/Stop 타이밍을 포함한 연간 전략 리포트",
  jamidusu_premium: "12궁과 주요 별 흐름을 중심으로 구성한 자미두수 전략서",
  sookyo_premium: "두 사람의 관계 구조와 운영 전략을 정리한 숙요 궁합 리포트",
  vedic_premium: "라그나/달/다샤를 연결해 인생 방향을 설계하는 베다 리포트",
  astrology_premium: "태양·달·상승궁과 하우스 흐름으로 읽는 코즈믹 인생 설계도",
};

const REPORT_MARKETING_BULLETS_BY_FEATURE_TYPE = {
  saju_life_book: [
    "원국·오행·십성·격국을 하나의 전략으로 통합",
    "대운 흐름 기반의 시기별 선택 기준 제공",
    "관계/재물/건강까지 실행 루틴 중심 제안",
  ],
  saju_love_secret: [
    "끌림과 갈등의 반복 구조를 사주 신호로 해석",
    "솔로/궁합 모드별 관계 운영 전략 제공",
    "장기 관계를 위한 대화·경계·회복 루틴 제안",
  ],
  saju_new_year_pdf: [
    "연간 기조부터 월별 흐름까지 단계별 안내",
    "Ch.9에서 1월~12월 월운 테이블 제공",
    "올해의 Go/Stop 실행 기준을 명확히 제시",
  ],
  jamidusu_premium: [
    "명궁/신궁/12궁 핵심 구조를 일관된 체계로 정리",
    "관계·커리어·재물·건강의 장단점을 균형 있게 분석",
    "챕터별 실전 적용 전략으로 마무리",
  ],
  sookyo_premium: [
    "본명숙 기반 관계 패턴과 거리감 구조 분석",
    "궁합 모드 중심의 갈등/회복 시나리오 제안",
    "현실적인 관계 운영 규칙과 90일 실행안 제공",
  ],
  vedic_premium: [
    "라그나·나크샤트라·다샤를 연결한 입체 분석",
    "커리어/재물/관계/건강 우선순위 정리",
    "현재 시기 과제를 실행 가능한 전략으로 제시",
  ],
  astrology_premium: [
    "태양·달·상승궁의 핵심 구조를 직관적으로 해석",
    "하우스/각도 신호를 실전 의사결정 기준으로 변환",
    "관계와 커리어 전략을 하나의 로드맵으로 통합",
  ],
};

const REPORT_GENERATION_MESSAGES = {
  saju_life_book: [
    "원국의 뼈대를 정리하고 있습니다.",
    "오행의 균형과 삶의 방향을 연결하고 있습니다.",
    "십성과 대운의 흐름을 인생 로드맵으로 엮고 있습니다.",
    "당신의 강점과 반복 패턴을 챕터별로 정리하고 있습니다.",
  ],
  saju_love_secret_solo: [
    "사랑에서 반복되는 패턴을 읽고 있습니다.",
    "배우자성과 일지를 통해 끌림의 구조를 분석하고 있습니다.",
    "도화·홍염·화개의 매력 신호를 정리하고 있습니다.",
    "오래 가는 사랑을 위한 실전 조언을 구성하고 있습니다.",
  ],
  saju_love_secret_compatibility: [
    "두 사람의 원국을 각각 분석하고 있습니다.",
    "일간과 일지의 상호작용을 비교하고 있습니다.",
    "끌림과 갈등의 반복 구조를 정리하고 있습니다.",
    "관계를 오래 유지하기 위한 전략을 구성하고 있습니다.",
  ],
  saju_new_year_pdf: [
    "원국과 현재 대운을 연결하고 있습니다.",
    "올해 세운이 만드는 변화를 분석하고 있습니다.",
    "12개월 월운 흐름을 정리하고 있습니다.",
    "올해의 Go/Stop 타이밍을 구성하고 있습니다.",
  ],
  jamidusu_premium: [
    "12궁의 별과 강도를 정리하고 있습니다.",
    "명궁과 신궁의 흐름을 연결하고 있습니다.",
    "사화가 만드는 기회와 과제를 분석하고 있습니다.",
    "인생 전략을 챕터별로 구성하고 있습니다.",
  ],
  sookyo_premium: [
    "두 사람의 본명숙을 확인하고 있습니다.",
    "관계 유형과 거리감을 분석하고 있습니다.",
    "끌림과 갈등의 숙요 구조를 정리하고 있습니다.",
    "현실적인 관계 운영 전략을 구성하고 있습니다.",
  ],
  vedic_premium: [
    "라그나와 달의 구조를 분석하고 있습니다.",
    "나크샤트라와 아트마카라카를 연결하고 있습니다.",
    "현재 다샤의 과제를 정리하고 있습니다.",
    "베다 차트의 인생 전략을 구성하고 있습니다.",
  ],
  astrology_premium: [
    "태양·달·상승궁의 핵심 구조를 분석하고 있습니다.",
    "하우스와 각도의 흐름을 연결하고 있습니다.",
    "커리어와 관계의 차트 신호를 정리하고 있습니다.",
    "당신의 우주 설계도를 프리미엄 리포트로 구성하고 있습니다.",
  ],
};

const MONTHLY_SECTION_TITLES = [
  "1월 월운", "2월 월운", "3월 월운", "4월 월운", "5월 월운", "6월 월운",
  "7월 월운", "8월 월운", "9월 월운", "10월 월운", "11월 월운", "12월 월운",
];

function pickGenerationMessages(featureType, mode = "") {
  const normalizedFeatureType = String(featureType || "").trim();
  const normalizedMode = String(mode || "").trim().toLowerCase();
  if (normalizedFeatureType === "saju_love_secret") {
    const key = (normalizedMode === "compatibility" || normalizedMode === "couple" || normalizedMode === "compat")
      ? "saju_love_secret_compatibility"
      : "saju_love_secret_solo";
    return Array.isArray(REPORT_GENERATION_MESSAGES[key]) ? REPORT_GENERATION_MESSAGES[key].slice() : [];
  }
  return Array.isArray(REPORT_GENERATION_MESSAGES[normalizedFeatureType])
    ? REPORT_GENERATION_MESSAGES[normalizedFeatureType].slice()
    : [];
}

function toShortTitle(title = "") {
  const cleaned = String(title || "").replace(/^Ch\.\d+\s*/i, "").trim();
  const splitters = [" — ", " - ", " : ", "|", "·"];
  for (const splitter of splitters) {
    if (cleaned.includes(splitter)) {
      return String(cleaned.split(splitter)[0] || cleaned).trim();
    }
  }
  return cleaned;
}

function buildChapterSections(featureType, chapterIndex, chapterTitle = "") {
  const feature = String(featureType || "").trim();
  if (feature === "saju_new_year_pdf" && chapterIndex === 9) {
    return MONTHLY_SECTION_TITLES.map((title, idx) => ({
      id: `ch09-sec${String(idx + 1).padStart(2, "0")}`,
      title,
      teaser: `${title}의 핵심 기회와 리스크를 정리합니다.`,
    }));
  }
  const base = toShortTitle(chapterTitle) || `Ch.${chapterIndex}`;
  return [
    { id: `ch${String(chapterIndex).padStart(2, "0")}-sec01`, title: "핵심 진단", teaser: `${base}의 핵심 신호를 요약합니다.` },
    { id: `ch${String(chapterIndex).padStart(2, "0")}-sec02`, title: "실전 전략", teaser: `${base}를 현실 선택으로 연결합니다.` },
  ];
}

function buildUiChapterDefinition(featureType, chapter, chapterIndex) {
  const title = String(chapter?.title || `Ch.${chapterIndex}`).trim();
  const shortTitle = toShortTitle(title);
  return {
    id: String(chapter?.id || `ch${String(chapterIndex).padStart(2, "0")}`),
    title,
    shortTitle,
    marketingLabel: `${shortTitle} 프리미엄 분석`,
    teaser: `${shortTitle}을 중심으로 핵심 신호와 실전 전략을 정리합니다.`,
    sections: buildChapterSections(featureType, chapterIndex, title),
  };
}

export const PREMIUM_PDF_SPECS = {
  saju_new_year_pdf: {
    title: "사주 신년운세 PDF",
    featureType: "saju_new_year_pdf",
    minTotalChars: 48000,
    targetTotalChars: 52000,
    chapters: SAJU_NEW_YEAR_TITLES.map((title, idx) => {
      const chapter = idx + 1;
      const targetChars = Number(SAJU_NEW_YEAR_CHAPTER_TARGETS[idx] || 5000);
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
        const targetChars = Number(LOVE_SECRET_MODE_CONFIG.solo.chapterTargetByIndex[chapter] || 4000);
        const minChars = Number(LOVE_SECRET_MODE_CONFIG.solo.chapterMinByIndex[chapter] || Math.max(3200, Math.floor(targetChars * 0.85)));
        return makeChapter(`love_solo_${String(chapter).padStart(2, "0")}`, title, minChars, targetChars);
      }),
      compatibility: LOVE_COMPATIBILITY_TITLES.map((title, idx) => {
        const chapter = idx + 1;
        const targetChars = Number(LOVE_SECRET_MODE_CONFIG.couple.chapterTargetByIndex[chapter] || 4000);
        const minChars = Number(LOVE_SECRET_MODE_CONFIG.couple.chapterMinByIndex[chapter] || Math.max(3200, Math.floor(targetChars * 0.85)));
        return makeChapter(`love_comp_${String(chapter).padStart(2, "0")}`, title, minChars, targetChars);
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
      personal: buildSukyoSpecChapters("personal"),
      compatibility: buildSukyoSpecChapters("compatibility"),
    },
    legacyReportType: "sookyoPremium",
  },
  vedic_premium: {
    title: "프리미엄 베다점",
    featureType: "vedic_premium",
    supportedModes: ["personal"],
    minTotalChars: 48000,
    targetTotalChars: 52000,
    chaptersByMode: {
      personal: VEDIC_SOLO_TITLES.map((title, idx) => {
        const chapter = idx + 1;
        const targetChars = Number(VEDIC_SOLO_TARGETS[idx] || 4200);
        const minChars = Math.max(3200, Math.floor(targetChars * 0.85));
        return makeChapter(`vedic_p_${String(chapter).padStart(2, "0")}`, title, minChars, targetChars);
      }),
    },
    legacyReportType: "vedicPremium",
  },
  astrology_premium: {
    title: "프리미엄 점성술",
    featureType: "astrology_premium",
    supportedModes: ["personal"],
    minTotalChars: 48000,
    targetTotalChars: 52000,
    chaptersByMode: {
      personal: ASTRO_PERSONAL_TITLES.map((title, idx) => {
        const targetChars = Number(ASTRO_PERSONAL_TARGETS[idx] || 4200);
        const minChars = Math.max(3000, Math.floor(targetChars * 0.85));
        return makeChapter(`astro_p_${String(idx + 1).padStart(2, "0")}`, title, minChars, targetChars);
      }),
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
    const chapters = Array.isArray(spec.chapters) ? spec.chapters : [];
    const chapterDefinitions = chapters.map((chapter, idx) => buildUiChapterDefinition(normalized, chapter, idx + 1));
    const generationMessages = pickGenerationMessages(normalized, mode);
    return {
      ...spec,
      subtitle: REPORT_SUBTITLE_BY_FEATURE_TYPE[normalized] || "프리미엄 분석 리포트를 생성합니다.",
      estimatedDepthLabel: "심층 분석",
      marketingBullets: REPORT_MARKETING_BULLETS_BY_FEATURE_TYPE[normalized] || [],
      generationMessages,
      chapters,
      chapterDefinitions,
      chapterCount: chapters.length,
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
    normalizedMode = "personal";
  } else if (normalized === "vedic_premium") {
    normalizedMode = "personal";
  }

  const fallbackMode = Object.keys(spec.chaptersByMode || {})[0] || "";
  const chapters = spec.chaptersByMode?.[normalizedMode] || spec.chaptersByMode?.[fallbackMode] || [];
  const chapterDefinitions = chapters.map((chapter, idx) => buildUiChapterDefinition(normalized, chapter, idx + 1));
  const generationMessages = pickGenerationMessages(normalized, normalizedMode);
  let minTotalChars = Number(spec.minTotalChars || 0);
  let targetTotalChars = Number(spec.targetTotalChars || 0);

  if (normalized === "saju_love_secret") {
    minTotalChars = normalizedMode === "compatibility" ? 70000 : 52000;
    targetTotalChars = normalizedMode === "compatibility" ? 82000 : 60000;
  }

  if (normalized === "sookyo_premium") {
    minTotalChars = normalizedMode === "compatibility" ? 48000 : 42000;
    targetTotalChars = normalizedMode === "compatibility" ? 52000 : 48000;
  }

  if (normalized === "astrology_premium") {
    minTotalChars = 48000;
    targetTotalChars = 52000;
  }

  if (normalized === "vedic_premium") {
    minTotalChars = 48000;
    targetTotalChars = 52000;
  }

  return {
    ...spec,
    subtitle: REPORT_SUBTITLE_BY_FEATURE_TYPE[normalized] || "프리미엄 분석 리포트를 생성합니다.",
    estimatedDepthLabel: "심층 분석",
    marketingBullets: REPORT_MARKETING_BULLETS_BY_FEATURE_TYPE[normalized] || [],
    generationMessages,
    mode: normalizedMode,
    minTotalChars,
    targetTotalChars,
    chapters,
    chapterDefinitions,
    chapterCount: chapters.length,
  };
}

export function getPremiumSpecByReportType(reportType, mode = "") {
  const featureType = REPORT_TYPE_TO_FEATURE_TYPE[String(reportType || "").trim()] || "";
  if (!featureType) return null;
  return getPremiumSpecByFeatureType(featureType, mode);
}

export function getPremiumReportDefinitionByFeatureType(featureType, mode = "") {
  const spec = getPremiumSpecByFeatureType(featureType, mode);
  if (!spec) return null;
  const chapters = Array.isArray(spec.chapterDefinitions) ? spec.chapterDefinitions : [];
  const totalChapters = Number(spec.chapterCount || chapters.length || 0);
  if (chapters.length !== totalChapters) {
    throw new Error(`PREMIUM_REPORT_DEFINITION_CHAPTER_MISMATCH:${String(featureType)}:${String(mode)}:${chapters.length}:${totalChapters}`);
  }
  const sectionCount = chapters.reduce((sum, chapter) => {
    const items = Array.isArray(chapter?.sections) ? chapter.sections.length : 0;
    return sum + items;
  }, 0);
  return {
    reportType: FEATURE_TYPE_TO_REPORT_TYPE[String(featureType || "").trim()] || "",
    featureType: String(featureType || "").trim(),
    title: String(spec.title || "프리미엄 리포트"),
    subtitle: String(spec.subtitle || "프리미엄 분석 리포트를 생성합니다."),
    mode: String(spec.mode || mode || "").trim() || undefined,
    totalChapters,
    totalSections: sectionCount,
    estimatedDepthLabel: String(spec.estimatedDepthLabel || "심층 분석"),
    marketingBullets: Array.isArray(spec.marketingBullets) ? spec.marketingBullets : [],
    generationMessages: Array.isArray(spec.generationMessages) ? spec.generationMessages : [],
    chapters,
  };
}

export function getPremiumReportDefinitionByReportType(reportType, mode = "") {
  const featureType = REPORT_TYPE_TO_FEATURE_TYPE[String(reportType || "").trim()] || "";
  if (!featureType) return null;
  return getPremiumReportDefinitionByFeatureType(featureType, mode);
}

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
  "I. 자미두수 명반 총론 — 내 운명의 기본 설계도",
  "II. 명궁 완전 해석 — 타고난 성격과 인생의 중심축",
  "III. 신궁 심층 분석 — 후천적 삶의 방향과 진짜 욕망",
  "IV. 12궁 완전 해석 — 인생 영역별 운명 지도",
  "V. 사화 분석 — 운명을 움직이는 변화의 버튼",
  "VI. 재물·직업·성공운 — 현실 성취와 돈의 흐름",
  "VII. 연애·결혼·인연운 — 사랑과 관계의 구조",
  "VIII. 인간관계·귀인·사회운 — 사람을 통해 열리는 운",
  "IX. 건강·심리·복덕운 — 마음과 몸의 균형",
  "X. 대운 분석 — 10년 단위 인생 흐름",
  "XI. 세운·유년운 분석 — 올해와 가까운 미래의 흐름",
  "XII. 최종 종합 리포트 — 나의 운명 사용법",
  "XIII. 연간 운세 로드맵 — 올해와 가까운 미래의 흐름",
  "XIV. 생애 마스터플랜 — 시간의 축으로 보는 운명 지도",
  "XV. 자미 거장의 최종 전략 제언 — 나의 명반 사용 설명서",
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
    normalizedMode = "personal";
  } else if (normalized === "vedic_premium") {
    normalizedMode = "personal";
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

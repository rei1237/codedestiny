import { ZIWEI_PDF_CHAPTERS } from "../ziwei-pdf-knowledge-base.js";
import { SUKUYO_PERSONAL_CHAPTER_META } from "../sukuyo-premium.js";
import { buildLifeBookChapterPlan } from "../saju/life-book/chapterConfig.js";
import { LOVE_SECRET_MODE_CONFIG, SAJU_NEW_YEAR_CHAPTERS } from "../saju-premium-chapters.js";
import {
  VEDIC_PERSONAL_CHAPTER_META,
  VEDIC_COMPAT_CHAPTER_META,
  VEDIC_SOLO_TARGET_CHARS,
  VEDIC_COMPAT_TARGET_CHARS,
} from "../vedic-premium-chapters.js";

const LIFEBOOK_TITLES = buildLifeBookChapterPlan().map((chapter) => String(chapter?.title || "").trim()).filter(Boolean);

const LOVE_SOLO_TITLES = LOVE_SECRET_MODE_CONFIG.solo.chapters.map((chapter) => String(chapter?.title || "").trim()).filter(Boolean);

const LOVE_COMPAT_TITLES = LOVE_SECRET_MODE_CONFIG.couple.chapters.map((chapter) => String(chapter?.title || "").trim()).filter(Boolean);

const ZIWEI_TITLES = ZIWEI_PDF_CHAPTERS.map((chapter) => String(chapter?.title || "").trim()).filter(Boolean);

const SUKUYO_TITLES = SUKUYO_PERSONAL_CHAPTER_META.map((meta) => String(meta?.title || "").trim()).filter(Boolean);

const VEDIC_SOLO_TITLES = VEDIC_PERSONAL_CHAPTER_META.map((meta) => String(meta?.title || "").trim()).filter(Boolean);

const VEDIC_COMPAT_TITLES = VEDIC_COMPAT_CHAPTER_META.map((meta) => String(meta?.title || "").trim()).filter(Boolean);

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
  "90일 현실 전환 플랜 — 관계·커리어·재정 실천 설계",
];

const ASTRO_PERSONAL_TARGETS = [4500, 4500, 4300, 4800, 4500, 4000, 4200, 4500, 3800, 3600, 4100, 4300];

const ASTRO_COMPAT_TITLES = [
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

const NEW_YEAR_TITLES = SAJU_NEW_YEAR_CHAPTERS.map((chapter) => String(chapter?.title || "").trim()).filter(Boolean);

function chapter(order, prefix, title, minChars, maxChars, requiredFields) {
  const index = String(order).padStart(2, "0");
  return {
    order,
    chapterId: `${prefix}-${index}`,
    title,
    minChars,
    maxChars,
    requiredFields: Array.isArray(requiredFields) ? requiredFields : [],
    promptTemplateId: `${prefix}-${index}`,
  };
}

function normalizePdfType(value) {
  const raw = String(value || "").trim();
  const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (compact === "lifebook" || compact === "sajulifebook") return "lifeBook";
  if (compact === "lovesecret" || compact === "sajulovesecret") return "loveSecret";
  if (compact === "ziweipremium" || compact === "jamidusupremium") return "ziweiPremium";
  if (compact === "sookyopremium" || compact === "sukuyopremium") return "sookyoPremium";
  if (compact === "vedicpremium") return "vedicPremium";
  if (compact === "westernastrologypremium" || compact === "astrologypremium") return "westernAstrologyPremium";
  if (compact === "sajunewyear" || compact === "sajunewyearpdf") return "sajuNewYear";
  return raw || "";
}

function normalizeMode(mode) {
  const raw = String(mode || "").trim().toLowerCase();
  if (!raw) return "default";
  if (raw === "compat" || raw === "couple") return "compatibility";
  return raw;
}

function buildLifeBookPlan() {
  return LIFEBOOK_TITLES.map((title, i) => chapter(
    i + 1,
    "life-ch",
    title,
    6000,
    6600,
    [
      "chart.dayMaster",
      "chart.tenGods",
      "elements.scores",
      "luckCycles.daewoon",
    ],
  ));
}

function buildLoveSecretPlan(mode) {
  const titles = mode === "compatibility" ? LOVE_COMPAT_TITLES : LOVE_SOLO_TITLES;
  return titles.map((title, i) => {
    const required = ["chart.dayMaster", "chart.spousePalace", "chart.tenGods"];
    if (i === 1) {
      required.push("chart.peachBlossom", "chart.hongyeom", "chart.hwagae");
    }
    if (mode === "compatibility") {
      required.push("compatibility");
    }
    return chapter(i + 1, mode === "compatibility" ? "love-comp" : "love-solo", title, 5000, 5600, required);
  });
}

function buildZiweiPlan() {
  return ZIWEI_TITLES.map((title, i) => chapter(
    i + 1,
    "ziwei-ch",
    title,
    5200,
    5800,
    [
      "chart.mingGong",
      "chart.shenGong",
      "palaces[].branch",
      "palaces[].mainStars",
      "palaces[].minorStars",
      "palaces[].mainStars[].strengthSymbol",
      "fourTransformations",
    ],
  ));
}

function buildSookyoPlan() {
  return SUKUYO_TITLES.map((title, i) => chapter(
    i + 1,
    "sookyo-ch",
    title,
    2400,
    3200,
    [
      "宿曜.birthMansion",
      "宿曜.coreNature",
      "fortuneCycles.monthly",
    ],
  ));
}

function buildVedicPlan(mode = "personal") {
  const isCompatibility = mode === "compatibility";
  const titles = isCompatibility ? VEDIC_COMPAT_TITLES : VEDIC_SOLO_TITLES;
  const targets = isCompatibility ? VEDIC_COMPAT_TARGET_CHARS : VEDIC_SOLO_TARGET_CHARS;
  const prefix = isCompatibility ? "vedic-comp" : "vedic-solo";
  return titles.map((title, i) => {
    const target = Number(targets[i] || 4200);
    const min = Math.max(3200, Math.floor(target * 0.85));
    return chapter(
      i + 1,
      prefix,
      title,
      min,
      target,
      [
        "chart.lagna",
        "chart.planets",
        "chart.houses",
        "dasha.timeline",
      ],
    );
  });
}

function buildAstroRequiredFields(order, mode = "personal") {
  const common = [
    "natalChart.sunSign",
    "natalChart.moonSign",
    "natalChart.ascendant",
    "natalChart.planets",
    "natalChart.houses",
    "natalChart.aspects",
    "profile.birthDate",
  ];

  if (mode === "compatibility") {
    const byChapter = {
      1: ["relationshipData.synastry", "relationshipData.composite"],
      2: ["relationshipData.synastry.sunMoonAspects"],
      3: ["relationshipData.synastry.venusMarsAspects"],
      4: ["relationshipData.synastry.aspects"],
      5: ["relationshipData.synastry.house7Overlays"],
      6: ["relationshipData.synastry.saturnHardAspects", "relationshipData.synastry.plutoHardAspects"],
      7: ["relationshipData.reality", "careerData"],
      8: ["relationshipData.synastry.saturnHardAspects", "relationshipData.synastry.nodeContacts"],
      9: ["timingData", "relationshipData.transitFlow"],
      10: ["relationshipData.summary", "relationshipData.advice"],
    };
    return [...common, ...(byChapter[order] || [])];
  }

  const byChapter = {
    1: ["natalChart.sunSign", "natalChart.moonSign", "natalChart.ascendant"],
    2: ["elementBalance", "modalityBalance"],
    3: ["angles.ascendant", "angles.midheaven"],
    4: ["planets.moon", "planets.mercury"],
    5: ["planets.venus", "planets.mars"],
    6: ["planets.jupiter", "planets.saturn"],
    7: ["planets.uranus", "planets.neptune", "planets.pluto"],
    8: ["natalChart.houses"],
    9: ["natalChart.aspects"],
    10: ["careerData", "natalChart.houses"],
    11: ["timingData"],
    12: ["natalChart.planets", "timingData", "careerData"],
  };
  return [...common, ...(byChapter[order] || [])];
}

function buildAstroPlan(mode = "personal") {
  const normalizedMode = mode === "compatibility" ? "compatibility" : "personal";
  const titles = normalizedMode === "compatibility" ? ASTRO_COMPAT_TITLES : ASTRO_PERSONAL_TITLES;
  const prefix = normalizedMode === "compatibility" ? "astro-comp" : "astro-pers";
  return titles.map((title, i) => chapter(
    i + 1,
    prefix,
    title,
    normalizedMode === "compatibility"
      ? 3200
      : Math.max(3000, Math.floor(Number(ASTRO_PERSONAL_TARGETS[i] || 4200) * 0.85)),
    normalizedMode === "compatibility"
      ? 3900
      : Number(ASTRO_PERSONAL_TARGETS[i] || 4200),
    buildAstroRequiredFields(i + 1, normalizedMode),
  ));
}

function buildNewYearPlan() {
  return NEW_YEAR_TITLES.map((title, i) => chapter(
    i + 1,
    "newyear-ch",
    title,
    i === 8 ? 3200 : 2600,
    i === 8 ? 3700 : 3100,
    [
      "profile.birthDate",
      "chart.dayMaster",
      "yearlySummary",
      "monthlyLuck",
    ],
  ));
}

export function getPremiumPdfV2ChapterPlan(pdfType, mode = "default") {
  const type = normalizePdfType(pdfType);
  const normalizedMode = normalizeMode(mode);

  if (type === "lifeBook") return buildLifeBookPlan();
  if (type === "loveSecret") return buildLoveSecretPlan(normalizedMode);
  if (type === "ziweiPremium") return buildZiweiPlan();
  if (type === "sookyoPremium") return buildSookyoPlan();
  if (type === "vedicPremium") return buildVedicPlan(normalizedMode);
  if (type === "westernAstrologyPremium") return buildAstroPlan(normalizedMode);
  if (type === "sajuNewYear") return buildNewYearPlan();
  return [];
}

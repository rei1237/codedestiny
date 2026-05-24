import { __ziweiTestUtils } from "../worker/routes/premium.js";
import {
  ZIWEI_PDF_CHAPTERS,
  buildZiweiPdfContext,
  ensureZiweiChapterMarkdownLength,
  validateNoZiweiDuplicateText,
  validateZiweiEngineToPdfMapping,
  validateZiweiFullReport,
} from "../worker/lib/ziwei-pdf-pipeline.js";

const PAGE_MIN = 80;
const PAGE_MAX = 100;
const CHARS_PER_PAGE = 1700;

const PALACES = [
  "명궁",
  "형제궁",
  "부부궁",
  "자녀궁",
  "재백궁",
  "질액궁",
  "천이궁",
  "교우궁",
  "관록궁",
  "전택궁",
  "복덕궁",
  "부모궁",
];

const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const ROLE_ORDER = [
  "life",
  "siblings",
  "spouse",
  "children",
  "wealth",
  "health",
  "travel",
  "friends",
  "career",
  "property",
  "fortune",
  "parents",
];

function makeStructuredPayload() {
  return {
    yearGan: "갑자",
    meng: "자",
    shen: "오",
    juInfo: "화6국",
    sihuaData: {
      자미: { type: "화록", palaceName: "명궁" },
      무곡: { type: "화권", palaceName: "관록궁" },
      태음: { type: "화과", palaceName: "재백궁" },
      거문: { type: "화기", palaceName: "복덕궁" },
    },
    palaceStarData: PALACES.map((palace, idx) => ({
      palace,
      branch: BRANCHES[idx],
      dahan: `${idx * 10}-${idx * 10 + 9}`,
      stars: [{ name: idx % 2 === 0 ? "자미" : "무곡", strength: idx % 2 === 0 ? "묘" : "왕", symbol: idx % 2 === 0 ? "◎" : "O" }],
      auxStars: [{ name: "문창", strength: "리", symbol: "▲" }],
      badStars: [{ name: "경양", strength: "함", symbol: "X" }],
    })),
    annualLuck: { year: 2026, palace: "명궁" },
    monthlyLuck: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, palace: PALACES[i] })),
  };
}

function makeBody() {
  return {
    name: "샘플 사용자",
    gender: "F",
    targetYear: 2026,
    year: 1992,
    month: 6,
    day: 15,
    hour: 12,
    minute: 30,
    timezone: "Asia/Seoul",
  };
}

function makeInput() {
  return {
    name: "샘플 사용자",
    gender: "F",
    year: 1992,
    month: 6,
    day: 15,
    hour: 12,
    minute: 30,
    timezone: "Asia/Seoul",
  };
}

function makeDataQuality() {
  return {
    missingFields: [],
    supplementedFields: [],
    warnings: [],
    canonicalSummary: null,
  };
}

function countChars(text) {
  return String(text || "").length;
}

function estimatePages(charLength) {
  return Math.max(0, Math.ceil(Number(charLength || 0) / CHARS_PER_PAGE));
}

function trimToChars(text, target) {
  const source = String(text || "").trim();
  const safe = Math.max(3200, Number(target || 0));
  if (!source || countChars(source) <= safe) return source;
  const blocks = source
    .split(/\n\s*\n+/)
    .map((row) => row.trim())
    .filter(Boolean);
  const kept = [];
  let len = 0;
  for (const block of blocks) {
    const next = len + countChars(block);
    if (next > safe) break;
    kept.push(block);
    len = next;
  }
  if (!kept.length) return source.slice(0, safe);
  return kept.join("\n\n");
}

function buildSeedChapter(spec, idx) {
  const sectionRows = Array.isArray(spec?.sections) ? spec.sections : [];
  const sectionText = sectionRows
    .map((heading, sectionIndex) => [
      `## ${heading}`,
      `${spec.title}의 ${heading} 파트 ${sectionIndex + 1}입니다. ${idx + 1}장 전용 근거(명궁-신궁-삼방사정-사화)를 사용해 실행 기준을 설계합니다.`,
      `${idx + 1}장에서는 궁의 상호작용을 통해 우선 순위를 좁히고, ${sectionIndex + 1}번 카테고리에서 장점 증폭과 손실 제한의 균형점을 도출합니다.`,
      `${heading} 분석 결론(${idx + 1}-${sectionIndex + 1}): 단기 반응보다 중기 운영 원칙을 먼저 고정하고, 월별 루틴을 구체화하면 변동성이 큰 구간에서도 실행 품질을 지킬 수 있습니다.`,
    ].join("\n\n"))
    .join("\n\n");

  return [
    `# ${spec.title}`,
    "## 0. 챕터 목적",
    `${idx + 1}장 핵심 목표를 요약하고, 12궁과 대한/유년 데이터에서 우선순위를 추출합니다.`,
    sectionText,
    `## 최종 실행 정리 ${idx + 1}`,
    `${idx + 1}장 핵심 행동 3가지를 주간 루틴으로 고정하고, 관계/재정/커리어 충돌 포인트(${idx + 1})를 사전 차단합니다.`,
  ].join("\n\n");
}

function run() {
  const quality = makeDataQuality();
  const canonical = __ziweiTestUtils.buildCanonicalZiweiChart(
    makeBody(),
    makeInput(),
    makeStructuredPayload(),
    "personal",
    "",
    quality,
  );

  const ctx = buildZiweiPdfContext({
    userProfile: {
      name: "샘플 사용자",
      gender: "F",
      birthDate: "1992-06-15",
      birthTime: "12:30",
      calendarType: "solar",
    },
    rawChart: canonical,
  });

  const chapters = ZIWEI_PDF_CHAPTERS.map((spec, idx) => {
    const source = buildSeedChapter(spec, idx);
    const target = Math.max(9000, Number(spec?.targetChars || 9000));
    const min = Math.max(8500, Math.floor(target * 0.9));
    return ensureZiweiChapterMarkdownLength(source, ctx, min, target + 900);
  });

  let fullText = chapters.join("\n\n");
  let totalChars = countChars(fullText);
  let pages = estimatePages(totalChars);
  let loop = 0;

  while (pages < PAGE_MIN && loop < 5) {
    const last = chapters.length - 1;
    const deficit = PAGE_MIN * CHARS_PER_PAGE - totalChars;
    const current = countChars(chapters[last]);
    chapters[last] = ensureZiweiChapterMarkdownLength(chapters[last], ctx, current + deficit + 900, current + deficit + 1600);
    fullText = chapters.join("\n\n");
    totalChars = countChars(fullText);
    pages = estimatePages(totalChars);
    loop += 1;
  }

  loop = 0;
  while (pages > PAGE_MAX && loop < 5) {
    const last = chapters.length - 1;
    const overflow = totalChars - PAGE_MAX * CHARS_PER_PAGE;
    const target = countChars(chapters[last]) - overflow - 600;
    chapters[last] = trimToChars(chapters[last], target);
    fullText = chapters.join("\n\n");
    totalChars = countChars(fullText);
    pages = estimatePages(totalChars);
    loop += 1;
  }

  const duplicateValidation = validateNoZiweiDuplicateText(fullText);
  const fullReportValidation = validateZiweiFullReport(fullText);
  const mappingChartPalaces = Array.isArray(canonical.palaces)
    ? canonical.palaces.map((palace, idx) => {
      const stars = [];
      (Array.isArray(palace?.mainStars) ? palace.mainStars : []).forEach((star) => {
        stars.push({
          displayName: String(star?.nameKo || star?.name || "").trim(),
          brightness: String(star?.brightnessKo || star?.brightness || "평").trim() || "평",
          strengthSymbol: String(star?.symbol || "△").trim() || "△",
        });
      });
      (Array.isArray(palace?.auxStars) ? palace.auxStars : []).forEach((star) => {
        stars.push({
          displayName: String(star?.nameKo || star?.name || "").trim(),
          brightness: String(star?.brightnessKo || star?.brightness || "평").trim() || "평",
          strengthSymbol: String(star?.symbol || "△").trim() || "△",
        });
      });
      (Array.isArray(palace?.minorStars) ? palace.minorStars : []).forEach((star) => {
        stars.push({
          displayName: String(star?.nameKo || star?.name || "").trim(),
          brightness: String(star?.brightnessKo || star?.brightness || "평").trim() || "평",
          strengthSymbol: String(star?.symbol || "△").trim() || "△",
        });
      });
      return {
        role: ROLE_ORDER[idx] || "",
        displayName: String(palace?.nameKo || palace?.name || "").trim(),
        allStars: stars,
      };
    })
    : [];

  const mappingPdfPalaces = Array.isArray(canonical.palaces)
    ? canonical.palaces.map((palace) => ({
      name: String(palace?.nameKo || palace?.name || "").trim(),
      mainStars: Array.isArray(palace?.mainStars)
        ? palace.mainStars.map((star) => ({ name: String(star?.nameKo || star?.name || "").trim() }))
        : [],
      auxiliaryStars: Array.isArray(palace?.auxStars)
        ? palace.auxStars.map((star) => ({ name: String(star?.nameKo || star?.name || "").trim() }))
        : [],
      minorStars: Array.isArray(palace?.minorStars)
        ? palace.minorStars.map((star) => ({ name: String(star?.nameKo || star?.name || "").trim() }))
        : [],
    }))
    : [];
  const mappingValidation = validateZiweiEngineToPdfMapping({ palaces: mappingChartPalaces }, { palaces: mappingPdfPalaces });

  const output = {
    ok: duplicateValidation.ok && fullReportValidation.ok && mappingValidation.ok && pages >= PAGE_MIN && pages <= PAGE_MAX,
    chapters: chapters.length,
    totalChars,
    estimatedPages: pages,
    pageWindow: { min: PAGE_MIN, max: PAGE_MAX, charsPerPage: CHARS_PER_PAGE },
    duplicateValidation: {
      ok: duplicateValidation.ok,
      forbiddenMatches: duplicateValidation.forbiddenMatches,
      duplicatedSentenceCount: duplicateValidation.duplicatedSentences.length,
      duplicatedParagraphCount: duplicateValidation.duplicatedParagraphs.length,
    },
    fullReportValidation,
    mappingValidation: {
      ok: mappingValidation.ok,
      failureCount: mappingValidation.failures.length,
      failures: mappingValidation.failures.slice(0, 12),
    },
  };

  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) {
    process.exitCode = 1;
  }
}

run();

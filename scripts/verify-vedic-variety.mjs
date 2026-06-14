#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { generateVedicPremiumReport } from "../worker/lib/vedic-premium-generator.js";

const planetNames = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"];

const births = [
  { name: "A", gender: "female", birthDate: "1977-03-12", birthYear: 1977, birthMonth: 3, birthDay: 12, birthTime: "05:20", birthHour: 5, birthMinute: 20, timezone: "Asia/Seoul", birthPlace: "Seoul", latitude: 37.5665, longitude: 126.978 },
  { name: "B", gender: "male", birthDate: "1985-11-28", birthYear: 1985, birthMonth: 11, birthDay: 28, birthTime: "22:45", birthHour: 22, birthMinute: 45, timezone: "Asia/Seoul", birthPlace: "Busan", latitude: 35.1796, longitude: 129.0756 },
  { name: "C", gender: "female", birthDate: "1991-02-20", birthYear: 1991, birthMonth: 2, birthDay: 20, birthTime: "07:00", birthHour: 7, birthMinute: 0, timezone: "Asia/Seoul", birthPlace: "Seoul", latitude: 37.5665, longitude: 126.978 },
  { name: "D", gender: "male", birthDate: "1999-08-03", birthYear: 1999, birthMonth: 8, birthDay: 3, birthTime: "13:30", birthHour: 13, birthMinute: 30, timezone: "Asia/Seoul", birthPlace: "Daegu", latitude: 35.8714, longitude: 128.6014 },
  { name: "E", gender: "female", birthDate: "2006-05-17", birthYear: 2006, birthMonth: 5, birthDay: 17, birthTime: "16:10", birthHour: 16, birthMinute: 10, timezone: "Asia/Seoul", birthPlace: "Incheon", latitude: 37.4563, longitude: 126.7052 },
  { name: "F", gender: "male", birthDate: "2015-12-01", birthYear: 2015, birthMonth: 12, birthDay: 1, birthTime: "01:05", birthHour: 1, birthMinute: 5, timezone: "Asia/Seoul", birthPlace: "Jeju", latitude: 33.4996, longitude: 126.5312 },
];

function seedOf(birth) {
  return Number(birth.birthYear) * 372
    + Number(birth.birthMonth) * 31
    + Number(birth.birthDay)
    + Number(birth.birthHour || 0) * 13
    + Number(birth.birthMinute || 0);
}

function chartFor(birth) {
  const seed = seedOf(birth);
  const planets = {};
  planetNames.forEach((name, index) => {
    planets[name] = (seed * (index + 3) + index * 47 + Number(birth.longitude || 0) * 10) % 360;
  });
  planets.Ketu = (planets.Rahu + 180) % 360;
  return {
    source: `variety-chart-${birth.birthDate}`,
    ayanamsaName: "Lahiri",
    ayanamsa: 24.18,
    ascendantSidereal: (seed * 7 + Number(birth.latitude || 0) * 10) % 360,
    planets,
    retrograde: Object.fromEntries(planetNames.map((name, index) => [name, (seed + index) % 4 === 0])),
  };
}

function sentences(text) {
  return String(text || "")
    .split(".")
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length > 24);
}

function jaccard(left, right) {
  const a = new Set(left);
  const b = new Set(right);
  const intersection = [...a].filter((item) => b.has(item)).length;
  const union = new Set([...a, ...b]).size || 1;
  return intersection / union;
}

function countOccurrences(text, pattern) {
  return (String(text || "").match(pattern) || []).length;
}

function repeatedNgrams(text, size = 6, minCount = 90) {
  const words = String(text || "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  const counts = new Map();
  for (let index = 0; index <= words.length - size; index += 1) {
    const phrase = words.slice(index, index + size).join(" ");
    counts.set(phrase, (counts.get(phrase) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= minCount)
    .sort((left, right) => right[1] - left[1]);
}

function badJosaExamples(text) {
  const finalConsonantTerms = ["태양", "달", "수성", "금성", "화성", "목성", "토성", "업의 축", "중심축", "한 줄", "방식"];
  const noFinalTerms = ["라후", "케투", "양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리", "단서"];
  const bad = [];
  for (const term of finalConsonantTerms) {
    for (const particle of ["가", "를", "는"]) {
      const value = `${term}${particle}`;
      if (String(text || "").includes(value)) bad.push(value);
    }
  }
  for (const term of noFinalTerms) {
    for (const particle of ["이", "을", "은"]) {
      const value = `${term}${particle}`;
      if (String(text || "").includes(value)) bad.push(value);
    }
  }
  return [...new Set(bad)];
}

const fixedTemplatePhrases = [
  "의 해석은 계산된 표식의 범위 안에서 읽습니다",
  "해석 경계는 분명합니다",
  "오늘 안에",
  "실제 생활에서 자주 드러나는 흐름을 하나 고릅니다",
  "에 가장 가까운 행동 하나를 고르고",
];

async function buildReport(birthInput) {
  const chart = chartFor(birthInput);
  const generated = await generateVedicPremiumReport({}, {
    ...birthInput,
    isTimeUnknown: false,
    sessionId: `verify-variety-${birthInput.birthDate}`,
    reportId: `verify_variety_${birthInput.birthDate.replace(/-/g, "")}`,
    birthInput,
    vedicBase: { birthInput, chart },
    chart,
    vedicClientEvidenceJson: {
      schemaVersion: "vedic-premium-client-evidence.v1",
      source: "verify-variety",
      chartAvailable: true,
      evidenceCount: 14,
      hasBirthInput: true,
      hasPlanets: true,
      hasAscendant: true,
    },
  }, {
    requestId: `verify-variety-${birthInput.birthDate}`,
    log: () => {},
  });
  const allText = generated.chapterDrafts
    .flatMap((chapter) => chapter.sections.map((section) => String(section.body || "")))
    .join("\n");
  const sections = generated.chapterDrafts.flatMap((chapter) => chapter.sections);
  return {
    birthDate: birthInput.birthDate,
    lagna: generated.localVedicChartJson.chart.lagnaSign,
    moon: generated.localVedicChartJson.chart.moonSign,
    dasha: generated.localVedicChartJson.chart.dashas.currentMahaDasha,
    calculationMode: generated.localVedicChartJson.calculationMode,
    chartSourceQualityOk: generated.quality.chartSourceQualityOk === true,
    chartSourceQualityIssues: generated.quality.chartSourceQuality?.issues || [],
    duplicateRate: Number(generated.quality.duplicateRate || 0),
    evidenceAuditOk: generated.quality.evidenceAuditOk === true,
    unsupportedClaimCount: Number(generated.quality.evidenceUnsupportedClaimCount || 0),
    chapterAccuracyMissingCount: Number(generated.quality.evidenceMissingChapterAccuracyCount || 0),
    sentenceSet: sentences(allText),
    allText,
    html: String(generated.pdfReady?.html || ""),
    sectionCount: sections.length,
    flowHeadingCount: sections.filter((section) => /(?:선언|문|방향|무대)$/.test(String(section.body || "").split("\n\n")[0] || "")).length,
    symbolicHeadingCount: sections.filter((section) => String(section.body || "").split("\n\n").some((block) => block.endsWith("상징"))).length,
  };
}

const reports = [];
for (const birth of births) {
  reports.push(await buildReport(birth));
}

const pairSimilarities = [];
for (let i = 0; i < reports.length; i += 1) {
  for (let j = i + 1; j < reports.length; j += 1) {
    pairSimilarities.push(jaccard(reports[i].sentenceSet, reports[j].sentenceSet));
  }
}

const sentenceCounts = new Map();
reports.flatMap((report) => report.sentenceSet).forEach((sentence) => {
  sentenceCounts.set(sentence, (sentenceCounts.get(sentence) || 0) + 1);
});

const maxPairSimilarity = Math.max(...pairSimilarities);
const avgPairSimilarity = pairSimilarities.reduce((sum, value) => sum + value, 0) / pairSimilarities.length;
const commonAtLeast4Reports = [...sentenceCounts.values()].filter((count) => count >= 4).length;
const maxDuplicateRate = Math.max(...reports.map((report) => report.duplicateRate));
const mergedText = reports.map((report) => report.allText).join("\n");
const fixedTemplatePhraseHits = fixedTemplatePhrases.reduce((sum, phrase) => {
  return sum + countOccurrences(mergedText, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"));
}, 0);
const repeatedPhraseBlocks = repeatedNgrams(mergedText, 6, 90)
  .filter(([phrase]) => !/제 \d장|베다점|하우스/.test(phrase))
  .slice(0, 20);
const awkwardPhraseHits = countOccurrences(mergedText, /달의 자리과|첫 문을 첫 문|다음 빛|상담의 방향이 흐려지지 않습니다|두 번째 문은/g);
const counselTermCounts = {
  선택: countOccurrences(mergedText, /선택/g),
  흐름: countOccurrences(mergedText, /흐름/g),
  확인: countOccurrences(mergedText, /확인/g),
  반복: countOccurrences(mergedText, /반복/g),
  기준: countOccurrences(mergedText, /기준/g),
};
const signalTermCount = countOccurrences(mergedText, /표식/g);
const supportSignalTermCount = countOccurrences(mergedText, /보조 표식/g);
const maxH4Count = Math.max(...reports.map((report) => countOccurrences(report.html, /<h4>/g)));
const minSectionSummaryCount = Math.min(...reports.map((report) => countOccurrences(report.html, /data-vedic-pdf-section-summary/g)));
const minSectionLabelCount = Math.min(...reports.map((report) => countOccurrences(report.html, /data-vedic-pdf-section-label/g)));
const minChapterGuideCount = Math.min(...reports.map((report) => countOccurrences(report.html, /data-vedic-pdf-chapter-guide/g)));
const minEvidenceLabelCount = Math.min(...reports.map((report) => countOccurrences(report.html, /data-vedic-pdf-evidence-title/g)));
const minVisualBarCount = Math.min(...reports.map((report) => countOccurrences(report.html, /class="vd-pdf-bar/g)));
const minDashaStepCount = Math.min(...reports.map((report) => countOccurrences(report.html, /class="dasha-step/g)));
const badJosa = badJosaExamples(mergedText);
const abstractTermCount = countOccurrences(mergedText, /핵심 단서|중심축|보조선|첫 기준|다음 확인선|상담의 울타리|해당 행성|해당 하우스/g);
const minFlowHeadingCount = Math.min(...reports.map((report) => report.flowHeadingCount));
const minSymbolicHeadingCount = Math.min(...reports.map((report) => report.symbolicHeadingCount));
const maxChapterAccuracyMissingCount = Math.max(...reports.map((report) => report.chapterAccuracyMissingCount));
const maxChartSourceQualityIssueCount = Math.max(...reports.map((report) => report.chartSourceQualityIssues.length));
const routeSource = readFileSync(new URL("../worker/routes/astro.js", import.meta.url), "utf8");
const localPdfSource = readFileSync(new URL("../worker/pdf-v2/vedic-local-pdf.js", import.meta.url), "utf8");
const generatorSource = readFileSync(new URL("../worker/lib/vedic-premium-generator.js", import.meta.url), "utf8");
const browserSource = readFileSync(new URL("../js/vedic-book.js", import.meta.url), "utf8");
const swissCallIndex = routeSource.indexOf("const calculated = await getSwissVedicPlanets");
const providedLookupIndex = routeSource.indexOf("const provided = extractProvidedVedicBase");
const htmlText = reports.map((report) => report.html).join("\n");
const uiTrustCopyHits = ["정밀 계산 기반", "장별 차트 근거", "상담 근거 일치"].filter((phrase) => htmlText.includes(phrase)).length;
const legacyUiCopyHits = countOccurrences(htmlText, /로컬 계산 차트|모순 검증|Chapter\s+\d+/g);
const pdfLayoutGuardHits = ["@media print", "overflow-wrap:break-word", "break-inside:avoid", "word-break:keep-all"].filter((phrase) => htmlText.includes(phrase)).length;
const serviceFlowChecks = {
  browserPrepareApi: browserSource.includes("var VEDIC_PREPARE_API = '/api/vedic/premium/prepare';"),
  browserStatusApi: browserSource.includes("var VEDIC_STATUS_API = '/api/vedic/premium/status';"),
  browserFeatureKey: browserSource.includes("var VEDIC_FEATURE_KEY = 'premium_pdf_vedic';"),
  routePrepareHandler: routeSource.includes("async function handleVedicPremiumPrepare"),
  routeStatusHandler: routeSource.includes("async function handleVedicPremiumStatus"),
  paymentGraceCode: routeSource.includes("PAYMENT_CONFIRMED_BUT_ACCESS_MISSING"),
  rendererSingleEntry: generatorSource.includes("return renderEnhancedVedicPremiumPdf(chapters, payload);")
    && !generatorSource.includes("return renderEnhancedVedicPremiumPdf(chapters, payload);\n  const safeName"),
  strictRuntimeManuscriptValidation: !generatorSource.includes("allowFallback: true"),
  premiumSwissChartFirst: swissCallIndex >= 0 && providedLookupIndex > swissCallIndex,
  providedChartEnvGate: routeSource.includes("allowProvidedVedicPremiumChartSource")
    && routeSource.includes("VEDIC_PREMIUM_ALLOW_PROVIDED_CHART"),
  trustedChartQualityGuard: routeSource.includes("validateVedicPremiumChartSourceQuality")
    && routeSource.includes("chartSourceQualityOk"),
  completionChartQualityGuard: generatorSource.includes("chart_source.")
    && generatorSource.includes("chartSourceQualityOk"),
  routeDownloadUrlContract: routeSource.includes("requireDownloadUrl: true"),
  statusNotFoundStopsPolling: routeSource.includes("code: \"VEDIC_RESULT_NOT_FOUND\"")
    && routeSource.includes("status: \"not_found\""),
  failedStatusDetailsRedacted: !routeSource.includes("details: lock?.error?.details"),
  pdfDbStart: routeSource.includes("startPremiumPdfExecution(pdfDbEnv"),
  pdfDbComplete: routeSource.includes("completePremiumPdfExecution(pdfDbEnv"),
  pdfDbFail: routeSource.includes("failPremiumPdfExecution(\n        pdfDbEnv"),
  statusProgress: routeSource.includes("buildVedicStatusPayload") && routeSource.includes("updateVedicSessionProgress"),
  statusDb: routeSource.includes("connectDb(withPdfFastDbEnv(env))"),
  archivePdfContract: localPdfSource.includes("archive_pdf_url") && generatorSource.includes("download_url.archive_pdf_format"),
  archiveHtmlContract: localPdfSource.includes("archive_html_url") && generatorSource.includes("html_url.archive_html_format"),
  canDownloadContract: localPdfSource.includes("can_download") && generatorSource.includes("pdf_ready.can_download"),
  writingPipelineContract: localPdfSource.includes("writing_pipeline") && localPdfSource.includes("local-calculation-to-local-assembled-pdf"),
};

assert.equal(reports.every((report) => report.evidenceAuditOk), true, "evidence audit must pass for every variety sample");
assert.equal(reports.every((report) => report.unsupportedClaimCount === 0), true, "unsupported claims must be zero");
assert.equal(reports.every((report) => report.chapterAccuracyMissingCount === 0), true, "chapter accuracy matrix must pass");
assert.equal(reports.every((report) => report.calculationMode === "full"), true, "premium chart calculation mode must be full");
assert.equal(reports.every((report) => report.chartSourceQualityOk), true, "premium chart source quality must pass");
assert.equal(reports.every((report) => report.sectionCount === 60), true, "every report must keep 60 category sections");
assert.ok(new Set(reports.map((report) => report.lagna)).size >= 4, "lagna variety");
assert.ok(new Set(reports.map((report) => report.moon)).size >= 4, "moon variety");
assert.ok(new Set(reports.map((report) => report.dasha)).size >= 4, "dasha variety");
assert.ok(maxPairSimilarity <= 0.65, `sentence variety max pair similarity too high: ${maxPairSimilarity}`);
assert.ok(avgPairSimilarity <= 0.58, `sentence variety average similarity too high: ${avgPairSimilarity}`);
assert.ok(commonAtLeast4Reports <= 950, `too many common sentences across samples: ${commonAtLeast4Reports}`);
assert.ok(maxDuplicateRate <= 0.2, `duplicate rate too high: ${maxDuplicateRate}`);
assert.equal(fixedTemplatePhraseHits, 0, `fixed template phrases detected: ${fixedTemplatePhraseHits}`);
assert.equal(awkwardPhraseHits, 0, `awkward repeated counseling phrases detected: ${awkwardPhraseHits}`);
assert.deepEqual(repeatedPhraseBlocks, [], `repeated counseling blocks detected: ${JSON.stringify(repeatedPhraseBlocks.slice(0, 5))}`);
assert.ok(counselTermCounts["선택"] <= 220, `choice term overused: ${counselTermCounts["선택"]}`);
assert.ok(counselTermCounts["흐름"] <= 650, `flow term overused: ${counselTermCounts["흐름"]}`);
assert.ok(counselTermCounts["확인"] <= 500, `confirmation term overused: ${counselTermCounts["확인"]}`);
assert.ok(counselTermCounts["반복"] <= 700, `repetition term overused: ${counselTermCounts["반복"]}`);
assert.ok(counselTermCounts["기준"] <= 180, `standard term overused: ${counselTermCounts["기준"]}`);
assert.equal(supportSignalTermCount, 0, `legacy support signal term detected: ${supportSignalTermCount}`);
assert.ok(signalTermCount <= 600, `signal term overused: ${signalTermCount}`);
assert.ok(maxH4Count <= 80, `too many repeated h4 headings: ${maxH4Count}`);
assert.ok(minSectionSummaryCount >= 60, `section summaries missing: ${minSectionSummaryCount}`);
assert.ok(minSectionLabelCount >= 200, `section labels missing: ${minSectionLabelCount}`);
assert.ok(minChapterGuideCount >= 12, `chapter guides missing: ${minChapterGuideCount}`);
assert.ok(minEvidenceLabelCount >= 60, `evidence labels missing: ${minEvidenceLabelCount}`);
assert.ok(minVisualBarCount >= 10, `visual chart bars missing: ${minVisualBarCount}`);
assert.ok(minDashaStepCount >= 3, `dasha timeline missing: ${minDashaStepCount}`);
assert.deepEqual(badJosa, [], `bad Korean josa detected: ${badJosa.join(", ")}`);
assert.ok(abstractTermCount <= 540, `abstract counseling terms overused: ${abstractTermCount}`);
assert.ok(minFlowHeadingCount >= 60, `category flow headings missing: ${minFlowHeadingCount}`);
assert.ok(minSymbolicHeadingCount >= 60, `category symbolic headings missing: ${minSymbolicHeadingCount}`);
assert.equal(uiTrustCopyHits, 3, "premium trust copy missing");
assert.equal(legacyUiCopyHits, 0, `legacy UI copy detected: ${legacyUiCopyHits}`);
assert.equal(pdfLayoutGuardHits, 4, "PDF layout guard CSS missing");
assert.deepEqual(Object.entries(serviceFlowChecks).filter(([, ok]) => !ok), [], "vedic service flow guard missing");

console.log(JSON.stringify({
  ok: true,
  sampleCount: reports.length,
  maxPairSimilarity: Number(maxPairSimilarity.toFixed(3)),
  avgPairSimilarity: Number(avgPairSimilarity.toFixed(3)),
  commonAtLeast4Reports,
  maxDuplicateRate: Number(maxDuplicateRate.toFixed(3)),
  fixedTemplatePhraseHits,
  repeatedPhraseBlocks,
  awkwardPhraseHits,
  counselTermCounts,
  maxChapterAccuracyMissingCount,
  maxChartSourceQualityIssueCount,
  signalTermCount,
  supportSignalTermCount,
  maxH4Count,
  minSectionSummaryCount,
  minSectionLabelCount,
  minChapterGuideCount,
  minEvidenceLabelCount,
  minVisualBarCount,
  minDashaStepCount,
  badJosa,
  abstractTermCount,
  minFlowHeadingCount,
  minSymbolicHeadingCount,
  uiTrustCopyHits,
  legacyUiCopyHits,
  pdfLayoutGuardHits,
  serviceFlowChecks,
  uniqueLagna: new Set(reports.map((report) => report.lagna)).size,
  uniqueMoon: new Set(reports.map((report) => report.moon)).size,
  uniqueDasha: new Set(reports.map((report) => report.dasha)).size,
}, null, 2));
console.log("VERIFY_VEDIC_VARIETY=ok");

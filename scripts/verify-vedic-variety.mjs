#!/usr/bin/env node

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { buildVedicLocalChartJson } from "../worker/lib/vedic-premium-generator.js";
import { generateVedicPremiumReport } from "../worker/lib/pdf-v2/vedic/generate-vedic-premium-report.js";
import { vedicPremiumChapterPlanV2 } from "../worker/lib/pdf-v2/vedic/vedic-premium.chapter-plan.js";

const planetNames = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"];

const births = [
  { name: "A", gender: "female", birthDate: "1977-03-12", birthYear: 1977, birthMonth: 3, birthDay: 12, birthTime: "05:20", birthHour: 5, birthMinute: 20, timezone: "Asia/Seoul", birthPlace: "Seoul", latitude: 37.5665, longitude: 126.978 },
  { name: "B", gender: "male", birthDate: "1985-11-28", birthYear: 1985, birthMonth: 11, birthDay: 28, birthTime: "22:45", birthHour: 22, birthMinute: 45, timezone: "Asia/Seoul", birthPlace: "Busan", latitude: 35.1796, longitude: 129.0756 },
  { name: "C", gender: "female", birthDate: "1991-02-20", birthYear: 1991, birthMonth: 2, birthDay: 20, birthTime: "07:00", birthHour: 7, birthMinute: 0, timezone: "Asia/Seoul", birthPlace: "Seoul", latitude: 37.5665, longitude: 126.978 },
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

function extractPromptValue(prompt, label) {
  const match = String(prompt || "").match(new RegExp(`${label}:\\s*([^\\n]+)`));
  return match ? match[1].trim() : "";
}

function fakeChapterHtml(prompt) {
  const id = extractPromptValue(prompt, "ID") || "vedic_soul_map";
  const title = extractPromptValue(prompt, "제목") || "베다점 프리미엄 리포트";
  const sectionLine = extractPromptValue(prompt, "필수 소제목");
  const sections = sectionLine.split("/").map((item) => item.trim()).filter(Boolean).slice(0, 5);
  const body = sections.map((section, sectionIndex) => {
    const paragraphs = Array.from({ length: 4 }).map((_, paragraphIndex) => {
      return `<p>${section}의 흐름은 베다점 계산 결과 안에서 라그나와 문사인, 그라하의 배치를 함께 살필 때 또렷해집니다. ${sectionIndex + 1}-${paragraphIndex + 1}번째 상담 문장은 조티쉬의 라시 차트와 다샤가 비추는 삶의 방향을 차분히 풀어내며, 제공되지 않은 정보는 단정하지 않습니다. 사용자는 이 대목을 통해 관계, 일, 재물, 내면의 리듬을 현실적인 선택으로 옮길 수 있습니다.</p>`;
    }).join("");
    return `<section><h2>${section}</h2>${paragraphs}</section>`;
  }).join("");
  return `<article data-chapter-id="${id}"><h1>${title}</h1>${body}</article>`;
}

function fakeVedicChapterHtmlV2(prompt) {
  const id = extractPromptValue(prompt, "ID") || "vedic_soul_map";
  const chapter = vedicPremiumChapterPlanV2.chapters.find((item) => item.id === id) || vedicPremiumChapterPlanV2.chapters[0];
  const tones = ["차분한 통찰", "깊은 상담", "현실적인 조언", "내면의 정리", "카르마적 맥락", "다르마의 방향"];
  const body = chapter.sections.map((section, sectionIndex) => {
    const paragraphs = Array.from({ length: 4 }).map((_, paragraphIndex) => {
      const tone = tones[(sectionIndex + paragraphIndex) % tones.length];
      return `<p>${chapter.title}의 ${section} 대목은 ${tone}을 바탕으로 라그나 라시 차트 나바암샤 나크샤트라 다샤 그라하와 하우스 신호를 함께 살핍니다 ${chapter.id} ${sectionIndex + 1} ${paragraphIndex + 1}번째 문단은 제공된 계산 결과 안에서만 해석하며 확인되지 않은 행성 하우스 다샤 요가 나크샤트라를 덧붙이지 않습니다 이 흐름은 사용자의 반복되는 선택 습관 관계의 온도 일의 리듬 회복 방식과 자기이해의 방향을 차분하게 비추며 유료 리포트에 어울리는 밀도로 정리됩니다</p>`;
    }).join("");
    return `<section><h2>${section}</h2>${paragraphs}</section>`;
  }).join("");
  return `<article data-chapter-id="${chapter.id}"><h1>${chapter.title}</h1>${body}</article>`;
}

function buildFakeEnv() {
  return {
    VEDIC_PREMIUM_LLM_PROVIDERS: "workers-ai",
    VEDIC_PREMIUM_LLM_REPAIR_LIMIT: "1",
    VEDIC_PREMIUM_WORKERS_AI_MODEL: "@test/vedic-variety",
    AI: {
      async run(_model, payload) {
        const prompt = payload?.messages?.find((message) => message.role === "user")?.content || "";
        return { response: fakeVedicChapterHtmlV2(prompt), usage: { inputTokens: 10, outputTokens: 1000 } };
      },
    },
  };
}

async function buildReport(birthInput) {
  const chart = chartFor(birthInput);
  const rawInput = {
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
  };
  const local = buildVedicLocalChartJson(rawInput, { strictPremium: true });
  const generated = await generateVedicPremiumReport({
    userId: "verify-user",
    input: rawInput,
    env: buildFakeEnv(),
    jobId: rawInput.reportId,
  });
  return {
    birthDate: birthInput.birthDate,
    lagna: local.chart.lagnaSign,
    moon: local.chart.moonSign,
    dasha: local.chart.dashas.currentMahaDasha,
    calculationMode: local.calculationMode,
    chartSourceQualityOk: local.chartSourceQuality?.ok === true || generated.localVedicChartJson.chartSourceQuality?.ok === true,
    chapterCount: generated.chapters.length,
    sectionCount: generated.chapters.flatMap((chapter) => chapter.sections).length,
    llmAssembly: generated.llmAssembly,
    allText: generated.chapters.flatMap((chapter) => chapter.sections.map((section) => section.body)).join("\n"),
  };
}

const reports = [];
for (const birth of births) {
  reports.push(await buildReport(birth));
}

const routeSource = readFileSync(new URL("../worker/routes/astro.js", import.meta.url), "utf8");
const localPdfPath = new URL("../worker/pdf-v2/vedic-local-pdf.js", import.meta.url);
const generatorSource = readFileSync(new URL("../worker/lib/vedic-premium-generator.js", import.meta.url), "utf8");
const browserSource = readFileSync(new URL("../js/vedic-book.js", import.meta.url), "utf8");
const newEngineSource = readFileSync(new URL("../worker/lib/pdf-v2/vedic/create-vedic-premium-pdf-job.js", import.meta.url), "utf8");
const swissCallIndex = routeSource.indexOf("const calculated = await getSwissVedicPlanets");
const providedLookupIndex = routeSource.indexOf("const provided = extractProvidedVedicBase");
const legacyLocalPdfEntrypoints = [
  "renderVedic" + "PremiumPdf",
  "generateVedic" + "LocalPdf",
  "buildVedic" + "Local" + "PremiumManuscript",
  "expandVedic" + "LocalManuscript",
];

const serviceFlowChecks = {
  browserPrepareApi: browserSource.includes("var VEDIC_PREPARE_API = '/api/vedic/premium/prepare';"),
  browserStatusApi: browserSource.includes("var VEDIC_STATUS_API = '/api/vedic/premium/status';"),
  browserFeatureKey: browserSource.includes("var VEDIC_FEATURE_KEY = 'premium_pdf_vedic';"),
  browserLlmContract: browserSource.includes("llmAssembly") && browserSource.includes("VEDIC_LLM_MANUSCRIPT_SOURCE"),
  routePrepareHandler: routeSource.includes("async function handleVedicPremiumPrepare"),
  routeStatusHandler: routeSource.includes("async function handleVedicPremiumStatus"),
  routeUsesNewEngine: routeSource.includes("generateVedicPremiumPdfV2("),
  premiumSwissChartFirst: swissCallIndex >= 0 && providedLookupIndex > swissCallIndex,
  providedChartEnvGate: routeSource.includes("allowProvidedVedicPremiumChartSource") && routeSource.includes("VEDIC_PREMIUM_ALLOW_PROVIDED_CHART"),
  trustedChartQualityGuard: routeSource.includes("validateVedicPremiumChartSourceQuality"),
  pdfDbStart: routeSource.includes("startPremiumPdfExecution(pdfDbEnv"),
  pdfDbComplete: newEngineSource.includes("completePremiumPdfExecution("),
  pdfDbFail: routeSource.includes("failPremiumPdfExecution("),
  statusProgress: routeSource.includes("buildVedicStatusPayload") && routeSource.includes("updateVedicSessionProgress"),
  localPdfDeleted: !existsSync(localPdfPath),
  oldLocalRenderNotUsed: !legacyLocalPdfEntrypoints.slice(0, 2).some((name) => routeSource.includes(`${name}(`)),
  llmOnlyConfig: generatorSource.includes('generationMode: "vedic-premium-llm-only"'),
  legacyEntrypointsDeleted: !legacyLocalPdfEntrypoints.some((name) => generatorSource.includes(`${name}(`)),
  noLocalPipelineContract: !newEngineSource.includes("local-calculation-to-local-assembled-pdf"),
};

assert.equal(reports.every((report) => report.calculationMode === "full"), true, "premium chart calculation mode must be full");
assert.equal(reports.every((report) => report.chartSourceQualityOk), true, "premium chart source quality must pass");
assert.equal(reports.every((report) => report.chapterCount === vedicPremiumChapterPlanV2.chapters.length), true, "every report must keep all configured chapters");
assert.equal(reports.every((report) => report.sectionCount === 60), true, "every report must keep 60 sections");
assert.equal(reports.every((report) => report.llmAssembly.enabled === true), true, "llm assembly enabled");
assert.equal(reports.every((report) => report.llmAssembly.externalGeneration === true), true, "external generation enabled");
assert.equal(reports.every((report) => report.llmAssembly.fallbackUsed === false), true, "no fallback");
assert.ok(new Set(reports.map((report) => report.lagna)).size >= 2, "lagna variety");
assert.ok(new Set(reports.map((report) => report.moon)).size >= 2, "moon variety");
assert.equal(/\b(?:undefined|null|NaN)\b|\[object Object\]|```|schema/i.test(reports.map((report) => report.allText).join("\n")), false, "no raw leaks");

for (const [name, ok] of Object.entries(serviceFlowChecks)) {
  assert.equal(ok, true, `service flow check failed: ${name}`);
}

console.log("VERIFY_VEDIC_LLM_ONLY_VARIETY=ok");

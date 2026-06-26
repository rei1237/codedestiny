#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  VEDIC_ASTROLOGY_ASSEMBLY_VERSION,
  VEDIC_PDF_CONFIG,
  buildVedicAstrologyFacts,
  buildVedicLocalChartJson,
  buildVedicMasterJson,
  validateVedicMasterJson,
} from "../worker/lib/vedic-premium-generator.js";
import { generateVedicPremiumReport } from "../worker/lib/pdf-v2/vedic/generate-vedic-premium-report.js";
import { generateVedicPremiumPdfV2 } from "../worker/lib/pdf-v2/vedic/create-vedic-premium-pdf-job.js";
import {
  validateVedicFinalReportHtml,
  validateVedicPdfCompletionPayload,
  validateVedicPremiumChapterHtml,
} from "../worker/lib/pdf-v2/vedic/vedic-premium.validator.js";
import { vedicPremiumChapterPlanV2 } from "../worker/lib/pdf-v2/vedic/vedic-premium.chapter-plan.js";
import { VEDIC_PREMIUM_PROMPT_VERSION } from "../worker/lib/pdf-v2/vedic/vedic-premium.prompt-pack.js";

function buildBirthInput() {
  return {
    name: "Vedic Premium QA",
    gender: "female",
    birthDate: "1991-02-20",
    birthYear: 1991,
    birthMonth: 2,
    birthDay: 20,
    birthTime: "07:00",
    birthHour: 7,
    birthMinute: 0,
    timezone: "Asia/Seoul",
    birthPlace: "Seoul",
    latitude: 37.5665,
    longitude: 126.978,
    isTimeUnknown: false,
  };
}

function buildVedicChartSource() {
  return {
    source: "smoke-vedic-chart",
    ayanamsaName: "Lahiri",
    ayanamsa: 24.18,
    ascendantSidereal: 352.4,
    planets: {
      Sun: 306.4,
      Moon: 41.7,
      Mercury: 289.2,
      Venus: 272.8,
      Mars: 58.9,
      Jupiter: 130.6,
      Saturn: 276.3,
      Rahu: 285.1,
      Ketu: 105.1,
    },
    retrograde: {
      Mercury: false,
      Venus: false,
      Mars: false,
      Jupiter: true,
      Saturn: false,
      Rahu: true,
      Ketu: true,
    },
  };
}

function extractPromptValue(prompt, label) {
  const match = String(prompt || "").match(new RegExp(`${label}:\\s*([^\\n]+)`));
  return match ? match[1].trim() : "";
}

function fakeChapterHtml(prompt) {
  const id = extractPromptValue(prompt, "ID") || "vedic_soul_map";
  const title = extractPromptValue(prompt, "제목") || "베다점 프리미엄 리포트";
  const paragraphs = Array.from({ length: 5 }).map((_, paragraphIndex) => (
    `<p>${title}의 ${paragraphIndex + 1}번째 문단은 베다점 계산 결과에 드러난 라그나, 라시 차트, 그라하, 하우스, 나크샤트라, 다샤의 흐름만 바탕으로 상담합니다. 확인되지 않은 행성 위치나 하우스는 덧붙이지 않고, 삶의 태도와 관계의 리듬과 현실 조언을 차분히 비춥니다.</p>`
  )).join("");
  return `<section class="vedic-chapter" data-chapter-id="${id}"><h2>${title}</h2><div class="chapter-summary"><p>라그나와 달의 흐름이 삶의 큰 결을 비춥니다. 제공된 차트 안에서만 다샤와 그라하의 방향을 읽습니다. 지금은 선택의 기준을 선명히 하는 시간이 강하게 떠오릅니다.</p></div><div class="chapter-body">${paragraphs}</div><div class="chapter-advice"><h3>베다 처방</h3><ul><li>하루의 우선순위를 하나로 줄이세요.</li><li>관계에서는 속도보다 리듬을 살피세요.</li><li>돈과 일은 기록으로 흐름을 붙잡으세요.</li></ul></div></section>`;
}

function fakeVedicChapterHtmlV2(prompt) {
  const id = extractPromptValue(prompt, "ID") || "vedic_soul_map";
  const chapter = vedicPremiumChapterPlanV2.chapters.find((item) => item.id === id) || vedicPremiumChapterPlanV2.chapters[0];
  const tones = ["차분한 통찰", "깊은 상담", "현실적인 조언", "내면의 정리", "카르마적 맥락", "다르마의 방향"];
  const body = Array.from({ length: 5 }).map((_, paragraphIndex) => {
    const tone = tones[paragraphIndex % tones.length];
    return `<p>${chapter.title}의 ${paragraphIndex + 1}번째 흐름은 ${tone}을 바탕으로 라그나 라시 차트 나바암샤 나크샤트라 다샤 그라하와 하우스 신호를 함께 살핍니다 ${chapter.id} ${paragraphIndex + 1}번째 문단은 제공된 계산 결과 안에서만 해석하며 확인되지 않은 행성 하우스 다샤 요가 나크샤트라를 덧붙이지 않습니다 이 흐름은 사용자의 반복되는 선택 습관 관계의 온도 일의 리듬 회복 방식과 자기이해의 방향을 차분하게 비추며 유료 리포트에 어울리는 밀도로 정리됩니다</p>`;
  }).join("");
  return `<section class="vedic-chapter" data-chapter-id="${chapter.id}"><h2>${chapter.title}</h2><div class="chapter-summary"><p>${chapter.category}의 핵심은 라그나와 달, 태양, 그라하의 분포를 함께 보며 삶의 방향을 읽는 데 있습니다. 제공된 나크샤트라와 다샤가 지금의 심리 리듬을 비춥니다. 이 장은 추측 없이 계산된 차트 안에서만 조언을 엮습니다.</p></div><div class="chapter-body">${body}</div><div class="chapter-advice"><h3>베다 처방</h3><ul><li>차트가 강하게 비추는 선택을 하루의 실천으로 낮추세요.</li><li>반복되는 감정 반응은 기록한 뒤 다음 다샤의 리듬과 비교하세요.</li><li>관계와 일의 결정은 서두르지 말고 기준을 먼저 세우세요.</li></ul></div></section>`;
}

function buildFakeEnv() {
  return {
    VEDIC_PREMIUM_LLM_REPAIR_LIMIT: "1",
    VEDIC_PREMIUM_LLM_PROVIDERS: "workers-ai",
    VEDIC_PREMIUM_WORKERS_AI_MODEL: "@test/vedic",
    AI: {
      async run(_model, payload) {
        const prompt = payload?.messages?.find((message) => message.role === "user")?.content || "";
        return { response: fakeVedicChapterHtmlV2(prompt), usage: { inputTokens: 10, outputTokens: 1000 } };
      },
    },
  };
}

const birthInput = buildBirthInput();
const chart = buildVedicChartSource();
const rawInput = {
  ...birthInput,
  sessionId: "smoke-vedic-premium",
  reportId: "smoke_vedic_premium_report",
  birthInput,
  vedicBase: { birthInput, chart },
  chart,
  vedicClientEvidenceJson: {
    schemaVersion: "vedic-premium-client-evidence.v1",
    source: "smoke",
    chartAvailable: true,
    evidenceCount: 14,
    hasBirthInput: true,
    hasPlanets: true,
    hasAscendant: true,
  },
};

const localVedicChartJson = buildVedicLocalChartJson(rawInput, { strictPremium: true });
assert.equal(localVedicChartJson.calculationMode, "full", "calculation mode");
assert.equal(localVedicChartJson.chart.planets.length, 9, "planet count");
assert.equal(localVedicChartJson.chart.houses.length, 12, "house count");

const vedicMasterJson = buildVedicMasterJson(localVedicChartJson, rawInput);
const masterValidation = validateVedicMasterJson(vedicMasterJson);
assert.equal(vedicMasterJson.schemaVersion, "vedic-premium-master-json.v1", "master schema");
assert.equal(masterValidation.ok, true, `master validation: ${masterValidation.missing.join(",")}`);

const facts = buildVedicAstrologyFacts(localVedicChartJson, rawInput);
assert.equal(facts.productId, "vedic_astrology", "facts product");
assert.equal(facts.mode, "personal", "facts mode");
assert.equal(facts.calculationBasis.zodiacType, "sidereal", "zodiac basis");
assert.equal(facts.calculationBasis.ayanamsa, "Lahiri", "ayanamsa basis");
assert.equal(facts.calculationBasis.houseSystem, "whole-sign", "house basis");
assert.equal(facts.calculationBasis.dashaSystem, "vimshottari", "dasha basis");
assert.equal(VEDIC_ASTROLOGY_ASSEMBLY_VERSION, VEDIC_PDF_CONFIG.templateVersion, "assembly version");
assert.equal(VEDIC_PDF_CONFIG.generationMode, "vedic-premium-llm-only", "llm generation mode");

const env = buildFakeEnv();
const report = await generateVedicPremiumReport({
  userId: "smoke-user",
  input: rawInput,
  env,
  jobId: "smoke-vedic-premium",
});
assert.equal(report.chapters.length, vedicPremiumChapterPlanV2.chapters.length, "llm chapter count");
assert.equal(report.llmAssembly.enabled, true, "llm assembly enabled");
assert.equal(report.llmAssembly.externalGeneration, true, "external generation enabled");
assert.equal(report.llmAssembly.fallbackUsed, false, "fallback not used");
assert.equal(report.promptVersion, VEDIC_PREMIUM_PROMPT_VERSION, "prompt version");
assert.equal(report.chapters.every((chapter) => chapter.sections.length === 3), true, "all section blocks generated");
vedicPremiumChapterPlanV2.chapters.forEach((plan, index) => {
  const chapter = report.chapters[index];
  assert.equal(chapter.id, plan.id, `chapter id ${plan.id}`);
  assert.equal(chapter.title, plan.title, `chapter title ${plan.id}`);
  assert.equal(chapter.category, plan.category, `chapter category ${plan.id}`);
  assert.equal(chapter.bodyParagraphs.length >= 5, true, `chapter body paragraphs ${plan.id}`);
  assert.equal(chapter.adviceItems.length >= 3, true, `chapter advice ${plan.id}`);
  assert.equal(/[가-힣]/.test(chapter.html), true, `chapter Korean body ${plan.id}`);
});

const completed = await generateVedicPremiumPdfV2({
  userId: "smoke-user",
  input: rawInput,
  paymentContext: { reportId: "smoke_vedic_premium_report", sessionId: "smoke-vedic-premium", featureKey: "premium_pdf_vedic" },
  env,
  requestUrl: "https://example.test/api/vedic/premium/prepare",
  reportId: "smoke_vedic_premium_report",
  sessionId: "smoke-vedic-premium",
});
assert.equal(completed.ok, true, "pdf job completed");
assert.equal(completed.status, "completed", "status completed");
assert.ok(String(completed.downloadUrl || "").includes("/api/premium/pdf-archive/"), "download archive URL");
assert.ok(String(completed.downloadUrl || "").includes("format=pdf"), "download pdf format");
assert.ok(String(completed.htmlUrl || "").includes("format=html"), "html format");
assert.equal(completed.pdfReady.mimeType, "application/pdf", "mime type");
assert.equal(completed.pdfReady.renderFormat, "pdf-archive", "render format");
assert.equal(completed.pdfReady.llmAssembly.fallbackUsed, false, "pdfReady no fallback");
assert.equal(validateVedicPdfCompletionPayload({
  pdfReady: completed.pdfReady,
  chapters: completed.chapters,
  requireDownloadUrl: true,
}).ok, true, "pdf completion validation");
assert.equal(/\b(?:undefined|null|NaN)\b|\[object Object\]|```|schema/i.test(String(completed.pdfReady.html || "")), false, "no raw leaks");
const completedHtml = String(completed.pdfReady.html || "");
for (const marker of ["summary-table", "chart-dashboard", "rashi-house-grid", "planet-density-bars", "dasha-table", "yoga-table", "chapter-plan-table"]) {
  assert.ok(completedHtml.includes(`data-vedic-visual="${marker}"`), `visual marker ${marker}`);
}
assert.equal((completedHtml.match(/data-house="/g) || []).length, 12, "rashi grid has 12 houses");
assert.equal((completedHtml.match(/class="bar-row"/g) || []).length, 12, "planet density has 12 bars");
assert.equal((completedHtml.match(/class="bar-fill"/g) || []).length, 12, "planet density bar fills");
assert.ok((completedHtml.match(/<table\b/g) || []).length >= 4, "visual tables rendered");
assert.ok((completedHtml.match(/<tr>/g) || []).length >= vedicPremiumChapterPlanV2.chapters.length + 10, "visual table rows rendered");
assert.ok(completedHtml.includes(".visual-grid") && completedHtml.includes(".rashi-grid") && completedHtml.includes(".bar-track"), "visual CSS included");
assert.ok(completedHtml.includes("차트 시각 요약") && completedHtml.includes("라시 하우스 배열") && completedHtml.includes("하우스별 그라하 밀도"), "visual headings included");
assert.equal(/�|踰|李|怨|瑜|異|臾|洹|援|媛|醫/.test(completedHtml), false, "no mojibake in final html");

const firstPlan = vedicPremiumChapterPlanV2.chapters[0];
const longEnglishParagraph = "This paid report paragraph intentionally stays in English and repeats technical consultation language so the Korean-only validator can reject it before the result is cached or rendered into the final premium PDF output";
const englishOnlyChapter = `<section class="vedic-chapter" data-chapter-id="${firstPlan.id}"><h2>${firstPlan.title}</h2><div class="chapter-summary"><p>${longEnglishParagraph}</p></div><div class="chapter-body">${Array.from({ length: 5 }).map(() => `<p>${longEnglishParagraph}</p>`).join("")}</div><div class="chapter-advice"><h3>베다 처방</h3><ul><li>${longEnglishParagraph}</li><li>${longEnglishParagraph}</li><li>${longEnglishParagraph}</li></ul></div></section>`;
assert.equal(validateVedicPremiumChapterHtml(englishOnlyChapter, firstPlan).issues.includes("body.korean_required"), true, "English-heavy chapter rejected");

const missingSectionChapter = `<section class="vedic-chapter" data-chapter-id="${firstPlan.id}"><h2>${firstPlan.title}</h2><div class="chapter-summary"><p>라그나와 나크샤트라의 흐름을 계산 결과 안에서만 비춥니다.</p></div><div class="chapter-body"><p>라그나 라시 차트 나바암샤 나크샤트라 다샤와 그라하의 흐름을 계산 결과 안에서만 조심스럽게 비춥니다.</p></div></section>`;
assert.equal(validateVedicPremiumChapterHtml(missingSectionChapter, firstPlan).issues.includes("chapter-advice.missing"), true, "missing advice rejected");

const swappedChapters = completed.chapters.slice();
[swappedChapters[0], swappedChapters[1]] = [swappedChapters[1], swappedChapters[0]];
assert.equal(validateVedicFinalReportHtml(completedHtml, swappedChapters).issues.includes("VEDIC_CHAPTER_PLAN_COVERAGE_MISMATCH"), true, "chapter order mismatch rejected");
assert.equal(validateVedicFinalReportHtml(completedHtml.replace('data-vedic-visual="chart-dashboard"', ""), completed.chapters).issues.includes("VEDIC_PDF_VISUAL_MISSING"), true, "visual dashboard missing rejected");

console.log("SMOKE_VEDIC_PREMIUM_LLM_ONLY=ok");

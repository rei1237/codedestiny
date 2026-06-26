import assert from "node:assert/strict";
import { handleSajuNewYearRoutes, __sajuNewYearTestUtils } from "../worker/routes/saju-new-year.js";
import { NEW_YEAR_CHAPTERS } from "../worker/lib/saju-new-year-constants.js";
import { normalizeChapterPlan, toLegacyChapterSpec } from "../worker/lib/pdf-v2/saju-new-year/new-year-chapters.js";
import { generateSajuNewYearPremiumReport } from "../worker/lib/pdf-v2/saju-new-year/generate-saju-new-year-premium-report.js";

const targetYear = 2031;

function buildNormalizedInput(year) {
  const plan = normalizeChapterPlan(NEW_YEAR_CHAPTERS, { targetYear: year });
  return {
    targetYear: year,
    expectedChapters: plan.chapters.map(toLegacyChapterSpec),
    chapterConfigSource: plan.source,
    chapterConfigVersion: plan.chapterConfigVersion,
    seed: {
      targetYear: year,
      birthProfile: {
        name: "검증사용자",
        gender: "female",
        birthDate: "1990-05-17",
        birthTime: "",
        calendarType: "solar",
      },
    },
    masterJson: { targetYear: year },
    masterJsonValidation: { ok: true },
    normalizedData: {
      profile: {
        name: "검증사용자",
        gender: "female",
      },
    },
    monthlyFortuneSections: [],
  };
}

async function jsonBody(response) {
  return await response.json();
}

const invalidInput = __sajuNewYearTestUtils.normalizeInput({ birthDate: "1990-05-17" });
assert.equal(invalidInput.ok, false);
assert.equal(invalidInput.code, "INVALID_INPUT");

const unauthResponse = await handleSajuNewYearRoutes(new Request("https://verify.local/api/saju-new-year/prepare", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ service: "new-year", birthDate: "1990-05-17", targetYear }),
}), {});
const unauthBody = await jsonBody(unauthResponse);
assert.equal(unauthResponse.status, 401);
assert.equal(unauthBody.code, "AUTH_REQUIRED");

const normalized = buildNormalizedInput(targetYear);
const progressEvents = [];
const env = {
  NODE_ENV: "development",
  PDF_LLM_PROVIDER: "mock",
  PDF_DEBUG_MODE: "true",
  LLM_DRY_RUN: "true",
  GEMINI_CALL_ENABLED: "false",
  WORKERS_AI_ENABLED: "false",
  PDF_LLM_MAX_CALLS_PER_JOB: "0",
  PDF_LLM_MAX_RETRIES: "0",
  SAJU_NEW_YEAR_LLM_REPAIR_LIMIT: "0",
};

const result = await generateSajuNewYearPremiumReport({
  env,
  normalized,
  userId: "verify-user",
  jobId: "verify-saju-new-year-json-mock",
  onProgress(event) {
    progressEvents.push(event);
  },
});

assert.equal(result.provider, "mock");
assert.equal(result.isMock, true);
assert.equal(result.tokensUsed, 0);
assert.equal(result.cost, 0);
assert.equal(result.externalCallsAllowed, false);
assert.equal(result.validation.ok, true);
assert.equal(result.chapters.length, normalized.expectedChapters.length);
assert.equal(result.monthlyFortunes.length, 12);
assert.ok(result.finalAdvice.body.length >= 350);
assert.ok(progressEvents.some((event) => event.stage === "saju-new-year-llm"));

const failNormalized = buildNormalizedInput(targetYear + 1);
await assert.rejects(
  () => generateSajuNewYearPremiumReport({
    env: {
      ...env,
      PDF_MOCK_FAIL_CHAPTER_ID: failNormalized.expectedChapters[2].id,
    },
    normalized: failNormalized,
    userId: "verify-user",
    jobId: "verify-saju-new-year-json-mock-fail",
  }),
  (error) => {
    assert.equal(error.code, "SAJU_NEW_YEAR_LLM_CHAPTER_GENERATION_FAILED");
    assert.deepEqual(error.issues, ["chapter_3"]);
    return true;
  },
);

const routeChapters = __sajuNewYearTestUtils.buildSajuNewYearChapterSpecs(targetYear);
const introChapter = routeChapters[0];
const secondChapter = routeChapters[1];
let workersAiCalls = 0;
const mixedProviderEnv = {
  NODE_ENV: "production",
  PDF_LLM_PROVIDER: "workers-ai",
  PDF_DEBUG_MODE: "false",
  LLM_DRY_RUN: "false",
  WORKERS_AI_ENABLED: "true",
  PDF_REAL_LLM_CHAPTER_IDS: "intro",
  PDF_LLM_MAX_CALLS_PER_JOB: "1",
  AI: {
    async run() {
      workersAiCalls += 1;
      return {
        response: "# 1. 새해의 문\n\n올해의 흐름은 차분히 열리고, 중요한 선택은 마음의 중심을 따라 정리됩니다.",
      };
    },
  },
};
const routeInput = {
  name: "검증사용자",
  gender: "female",
  birthDate: "1990-05-17",
  birthTime: "",
  targetYear,
};
const introResult = await __sajuNewYearTestUtils.generateNewYearPdfChapterContent({
  jobId: "verify-new-year-mixed-provider",
  chapterId: introChapter.id,
  chapterTitle: introChapter.title,
  chapterOrder: Number(introChapter.no || introChapter.order || 1),
  totalChapters: routeChapters.length,
  input: routeInput,
  context: {},
  realLlmCallsUsed: 0,
}, mixedProviderEnv);
assert.equal(workersAiCalls, 1);
assert.equal(introResult.chapterId, introChapter.id);
assert.equal(introResult.title, introChapter.title);
assert.equal(introResult.isMock, false);
assert.equal(introResult.provider, "workers-ai");
assert.equal(introResult.providerReason, "real_llm_success");
assert.ok(introResult.content.length > 0);

const secondResult = await __sajuNewYearTestUtils.generateNewYearPdfChapterContent({
  jobId: "verify-new-year-mixed-provider",
  chapterId: secondChapter.id,
  chapterTitle: secondChapter.title,
  chapterOrder: Number(secondChapter.no || secondChapter.order || 2),
  totalChapters: routeChapters.length,
  input: routeInput,
  context: {},
  realLlmCallsUsed: 1,
}, mixedProviderEnv);
assert.equal(workersAiCalls, 1);
assert.equal(secondResult.chapterId, secondChapter.id);
assert.equal(secondResult.title, secondChapter.title);
assert.equal(secondResult.isMock, true);
assert.equal(secondResult.provider, "mock");
assert.equal(secondResult.providerReason, "chapter_not_allowlisted");
assert.ok(secondResult.content.includes(`Chapter ID: ${secondChapter.id}`));

const maxCallsPlan = __sajuNewYearTestUtils.resolveNewYearChapterProviderPlan({
  chapterId: secondChapter.id,
  chapterOrder: Number(secondChapter.no || secondChapter.order || 2),
  realLlmCallsUsed: 1,
}, {
  ...mixedProviderEnv,
  PDF_REAL_LLM_CHAPTER_IDS: "all",
});
assert.equal(maxCallsPlan.allowActual, false);
assert.equal(maxCallsPlan.reason, "max_calls_exceeded");

const maxCallsResult = await __sajuNewYearTestUtils.generateNewYearPdfChapterContent({
  jobId: "verify-new-year-mixed-provider",
  chapterId: secondChapter.id,
  chapterTitle: secondChapter.title,
  chapterOrder: Number(secondChapter.no || secondChapter.order || 2),
  totalChapters: routeChapters.length,
  input: routeInput,
  context: {},
  realLlmCallsUsed: 1,
}, {
  ...mixedProviderEnv,
  PDF_REAL_LLM_CHAPTER_IDS: "all",
});
assert.equal(workersAiCalls, 1);
assert.equal(maxCallsResult.isMock, true);
assert.equal(maxCallsResult.provider, "mock");
assert.equal(maxCallsResult.providerReason, "max_calls_exceeded");

const archiveChapters = __sajuNewYearTestUtils.buildNewYearMockArchiveChapters({
  id: "verify-new-year-mixed-provider",
  totalChapters: routeChapters.length,
  inputSnapshot: routeInput,
  contextSnapshot: {},
  chapters: [
    {
      id: introChapter.id,
      chapterId: introResult.chapterId,
      title: introResult.title,
      order: Number(introChapter.no || introChapter.order || 1),
      status: "completed",
      ...introResult,
    },
    {
      id: secondChapter.id,
      chapterId: secondResult.chapterId,
      title: secondResult.title,
      order: Number(secondChapter.no || secondChapter.order || 2),
      status: "completed",
      ...secondResult,
    },
  ],
});
assert.equal(archiveChapters.length, 2);
assert.equal(archiveChapters[0].chapterId, introChapter.id);
assert.equal(archiveChapters[1].providerReason, "chapter_not_allowlisted");
assert.ok(archiveChapters.every((chapter) => chapter.content && chapter.title && typeof chapter.isMock === "boolean"));

console.log("verify:saju-new-year-llm ok", {
  provider: result.provider,
  chapters: result.chapters.length,
  tokensUsed: result.tokensUsed,
  cost: result.cost,
  externalCallsAllowed: result.externalCallsAllowed,
});

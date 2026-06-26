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
const normalizedPlan = normalizeChapterPlan(NEW_YEAR_CHAPTERS, { targetYear });
assert.equal(normalizedPlan.source, "existing-config");
assert.equal(normalizedPlan.expectedChapterCount, 10);
assert.notEqual(normalizedPlan.chapterConfigVersion, "missing-config");
assert.equal(normalized.expectedChapters.length, 10);
assert.equal(normalized.expectedChapters[8].categories.length, 5);
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
assert.equal(result.actualChapterCount, 0);
assert.equal(result.actualCallAttemptCount, 0);
assert.equal(result.mockChapterCount, normalized.expectedChapters.length);
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
assert.equal(routeChapters.length, 10);
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

function buildLlmJsonChapter(spec, year) {
  const chapterNo = Number(spec.no || spec.order || 1);
  const sections = spec.categories.map((title, index) => {
    const body = Array.from({ length: 7 }, (_, paragraphIndex) => {
      const monthA = ((chapterNo + index + paragraphIndex) % 12) + 1;
      const monthB = ((chapterNo + index + paragraphIndex + 4) % 12) + 1;
      return `${title}에서는 ${year}년의 원국, 세운, 월운, 오행, 십성 흐름이 서로 맞물리며 선택의 기준이 차분히 드러납니다. ${monthA}월에는 준비한 일을 작게 열고, ${monthB}월에는 관계와 재물, 몸의 리듬을 함께 점검하는 편이 좋습니다. 일간이 받아들이는 기운과 대운이 밀어 주는 방향을 나누어 보면 성급한 결론보다 반복되는 생활 신호가 더 중요하게 떠오릅니다. 이 흐름은 실제 상담처럼 사용자의 현실 안에서 조용히 움직이며, 무엇을 밀어붙이고 무엇을 정리해야 하는지 부드럽게 가리킵니다.`;
    }).join("\n\n");
    return {
      title,
      body,
      sajuEvidence: ["원국과 세운의 관계", "월운과 오행의 흐름"],
      keyPoints: [`${title}의 핵심은 실행과 점검의 균형입니다.`],
      actionGuide: ["좋은 달에는 제안과 실행을 앞에 둡니다."],
      checklist: ["월말마다 관계, 돈, 몸의 리듬을 확인합니다."],
      caution: ["충의 신호가 강한 달에는 결론을 서두르지 않습니다."],
    };
  });
  return JSON.stringify({
    schemaVersion: "saju-new-year-llm-json.v1",
    targetYear: year,
    chapterNo,
    title: spec.title,
    focus: `${spec.title}의 핵심 흐름`,
    sections,
  });
}

let jsonWorkersAiCalls = 0;
const mixedJsonNormalized = buildNormalizedInput(targetYear + 2);
const mixedJsonEnv = {
  ...mixedProviderEnv,
  AI: {
    async run(_model, payload) {
      jsonWorkersAiCalls += 1;
      const prompt = payload?.messages?.find((item) => item.role === "user")?.content || "";
      assert.ok(prompt.includes("JSON"));
      return { response: buildLlmJsonChapter(mixedJsonNormalized.expectedChapters[0], targetYear + 2) };
    },
  },
};
const mixedJsonResult = await generateSajuNewYearPremiumReport({
  env: mixedJsonEnv,
  normalized: mixedJsonNormalized,
  userId: "verify-user",
  jobId: "verify-saju-new-year-json-one-real",
});
assert.equal(jsonWorkersAiCalls, 1);
assert.equal(mixedJsonResult.provider, "workers-ai-mock");
assert.equal(mixedJsonResult.isMock, false);
assert.equal(mixedJsonResult.externalCallsAllowed, true);
assert.equal(mixedJsonResult.actualChapterCount, 1);
assert.equal(mixedJsonResult.actualCallAttemptCount, 1);
assert.equal(mixedJsonResult.mockChapterCount, mixedJsonNormalized.expectedChapters.length - 1);
assert.equal(mixedJsonResult.chapters.length, 10);
assert.equal(mixedJsonResult.monthlyFortunes.length, 12);
assert.ok(mixedJsonResult.finalAdvice.body.length >= 350);

let textFallbackWorkersAiCalls = 0;
const textFallbackNormalized = buildNormalizedInput(targetYear + 3);
const textFallbackEnv = {
  ...mixedProviderEnv,
  AI: {
    async run() {
      textFallbackWorkersAiCalls += 1;
      return {
        response: "첫 흐름은 총운과 세운이 조용히 맞물리는 자리에서 시작됩니다. 원국의 오행은 급한 결정보다 차분한 정리를 먼저 권하고, 대운의 바탕 위에 들어오는 월운은 마음의 기준을 다시 세우게 합니다.",
      };
    },
  },
};
const textFallbackResult = await generateSajuNewYearPremiumReport({
  env: textFallbackEnv,
  normalized: textFallbackNormalized,
  userId: "verify-user",
  jobId: "verify-saju-new-year-json-text-fallback",
});
assert.equal(textFallbackWorkersAiCalls, 1);
assert.equal(textFallbackResult.provider, "workers-ai-mock");
assert.equal(textFallbackResult.isMock, false);
assert.equal(textFallbackResult.externalCallsAllowed, true);
assert.equal(textFallbackResult.actualChapterCount, 1);
assert.equal(textFallbackResult.actualCallAttemptCount, 1);
assert.equal(textFallbackResult.mockChapterCount, textFallbackNormalized.expectedChapters.length - 1);
assert.equal(textFallbackResult.chapters.length, 10);
assert.equal(textFallbackResult.chapters[0].metadata.providerReason, "real_llm_text_fallback");
assert.equal(textFallbackResult.chapters[0].metadata.isMock, false);
assert.equal(textFallbackResult.validation.ok, true);

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

let failedWorkersAiCalls = 0;
const failedAiResult = await __sajuNewYearTestUtils.generateNewYearPdfChapterContent({
  jobId: "verify-new-year-workers-ai-failed",
  chapterId: introChapter.id,
  chapterTitle: introChapter.title,
  chapterOrder: Number(introChapter.no || introChapter.order || 1),
  totalChapters: routeChapters.length,
  input: routeInput,
  context: {},
  realLlmCallsUsed: 0,
}, {
  ...mixedProviderEnv,
  AI: {
    async run() {
      failedWorkersAiCalls += 1;
      throw new Error("workers ai test failure");
    },
  },
});
assert.equal(failedWorkersAiCalls, 1);
assert.equal(failedAiResult.chapterId, introChapter.id);
assert.equal(failedAiResult.isMock, true);
assert.equal(failedAiResult.provider, "mock");
assert.equal(failedAiResult.providerReason, "workers_ai_run_failed");
assert.ok(failedAiResult.errorSummary.includes("workers ai test failure"));

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

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { __sajuNewYearTestUtils } from "../worker/routes/saju-new-year.js";

const targetYear = 2031;
const chapters = __sajuNewYearTestUtils.buildSajuNewYearChapterSpecs(targetYear);
assert.equal(chapters.length, 10);

const intro = chapters[0];
const second = chapters[1];
const baseEnv = {
  NODE_ENV: "production",
  PDF_DEBUG_MODE: "true",
  LLM_DRY_RUN: "false",
  PDF_LLM_PROVIDER: "workers-ai",
  WORKERS_AI_ENABLED: "true",
  PDF_REAL_LLM_CHAPTER_IDS: "intro",
  PDF_LLM_MAX_CALLS_PER_JOB: "1",
};

const missingBindingPlan = __sajuNewYearTestUtils.resolveNewYearChapterProviderPlan({
  chapterId: intro.id,
  chapterOrder: Number(intro.order || intro.no || 1),
  realLlmCallsUsed: 0,
}, baseEnv);
assert.equal(missingBindingPlan.allowActual, false);
assert.equal(missingBindingPlan.reason, "missing_ai_binding");

const dryRunPlan = __sajuNewYearTestUtils.resolveNewYearChapterProviderPlan({
  chapterId: intro.id,
  chapterOrder: Number(intro.order || intro.no || 1),
  realLlmCallsUsed: 0,
}, {
  ...baseEnv,
  LLM_DRY_RUN: "true",
  AI: { async run() {} },
});
assert.equal(dryRunPlan.reason, "dry_run");

const disabledPlan = __sajuNewYearTestUtils.resolveNewYearChapterProviderPlan({
  chapterId: intro.id,
  chapterOrder: Number(intro.order || intro.no || 1),
  realLlmCallsUsed: 0,
}, {
  ...baseEnv,
  WORKERS_AI_ENABLED: "false",
  AI: { async run() {} },
});
assert.equal(disabledPlan.reason, "workers_ai_disabled");

const providerPlan = __sajuNewYearTestUtils.resolveNewYearChapterProviderPlan({
  chapterId: intro.id,
  chapterOrder: Number(intro.order || intro.no || 1),
  realLlmCallsUsed: 0,
}, {
  ...baseEnv,
  PDF_LLM_PROVIDER: "mock",
  AI: { async run() {} },
});
assert.equal(providerPlan.reason, "provider_not_workers_ai");

const maxZeroPlan = __sajuNewYearTestUtils.resolveNewYearChapterProviderPlan({
  chapterId: intro.id,
  chapterOrder: Number(intro.order || intro.no || 1),
  realLlmCallsUsed: 0,
}, {
  ...baseEnv,
  PDF_LLM_MAX_CALLS_PER_JOB: "0",
  AI: { async run() {} },
});
assert.equal(maxZeroPlan.reason, "max_calls_zero");

const realPlan = __sajuNewYearTestUtils.resolveNewYearChapterProviderPlan({
  chapterId: intro.id,
  chapterOrder: Number(intro.order || intro.no || 1),
  realLlmCallsUsed: 0,
}, {
  ...baseEnv,
  AI: { async run() {} },
});
assert.equal(realPlan.allowActual, true);
assert.equal(realPlan.reason, "real_llm_allowed");

const notAllowlistedPlan = __sajuNewYearTestUtils.resolveNewYearChapterProviderPlan({
  chapterId: second.id,
  chapterOrder: Number(second.order || second.no || 2),
  realLlmCallsUsed: 1,
}, {
  ...baseEnv,
  AI: { async run() {} },
});
assert.equal(notAllowlistedPlan.allowActual, false);
assert.equal(notAllowlistedPlan.reason, "chapter_not_allowlisted");

let aiRunCalls = 0;
const runtimeEnv = {
  ...baseEnv,
  AI: {
    async run() {
      aiRunCalls += 1;
      return {
        response: "# Intro\n\n총운과 세운이 만나는 첫 장의 흐름이 차분히 열립니다.",
      };
    },
  },
};
const input = {
  name: "flow-user",
  gender: "female",
  birthDate: "1990-05-17",
  birthTime: "",
  targetYear,
};
const chapterResults = [];
for (const chapter of chapters) {
  const realLlmCallsUsed = chapterResults.filter((item) => item.isMock === false).length;
  const result = await __sajuNewYearTestUtils.generateNewYearPdfChapterContent({
    jobId: "verify-saju-new-year-flow",
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    chapterOrder: Number(chapter.order || chapter.no || chapterResults.length + 1),
    totalChapters: chapters.length,
    input,
    context: {},
    realLlmCallsUsed,
  }, runtimeEnv);
  chapterResults.push({
    id: chapter.id,
    order: Number(chapter.order || chapter.no || chapterResults.length + 1),
    status: "completed",
    ...result,
  });
}

assert.equal(aiRunCalls, 1);
assert.equal(chapterResults.length, chapters.length);
assert.equal(chapterResults[0].isMock, false);
assert.equal(chapterResults[0].provider, "workers-ai");
assert.equal(chapterResults[0].providerReason, "real_llm_success");
assert.ok(chapterResults[0].tokensUsed > 0);
assert.ok(chapterResults.slice(1).every((chapter) => chapter.isMock === true));
assert.ok(chapterResults.slice(1).every((chapter) => chapter.provider === "mock"));
assert.ok(chapterResults.slice(1).every((chapter) => ["chapter_not_allowlisted", "max_calls_exceeded"].includes(chapter.providerReason)));

const archiveChapters = __sajuNewYearTestUtils.buildNewYearMockArchiveChapters({
  id: "verify-saju-new-year-flow",
  totalChapters: chapters.length,
  inputSnapshot: input,
  contextSnapshot: {},
  chapters: chapterResults,
});
const pdfReady = {
  status: "completed",
  pdfReady: true,
  chapters: archiveChapters,
};
assert.equal(archiveChapters.length, chapters.length);
assert.equal(pdfReady.status, "completed");
assert.equal(pdfReady.pdfReady, true);
assert.ok(archiveChapters.every((chapter) => chapter.content && chapter.title && typeof chapter.isMock === "boolean"));

const frontendSource = await readFile("js/saju-new-year.js", "utf8");
const verifyIndex = frontendSource.indexOf("VERIFY_ACCESS_API");
const createIndex = frontendSource.indexOf("CREATE_JOB_API");
const generateIndex = frontendSource.indexOf("GENERATE_MOCK_API");
const pollIndex = frontendSource.indexOf("_pollJobStatus");
assert.ok(verifyIndex > -1);
assert.ok(createIndex > verifyIndex);
assert.ok(generateIndex > createIndex);
assert.ok(pollIndex > generateIndex);

console.log("verify:saju-new-year-flow ok", {
  aiRunCalls,
  chapterResults: chapterResults.length,
  introProvider: chapterResults[0].provider,
  introReason: chapterResults[0].providerReason,
  pdfReady: pdfReady.pdfReady,
});

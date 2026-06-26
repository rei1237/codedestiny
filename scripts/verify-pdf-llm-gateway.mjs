import assert from "node:assert/strict";
import {
  generatePdfChapterContent,
  generatePdfChapterTextResult,
} from "../worker/lib/pdf-v2/pdf-llm-gateway.js";

const input = {
  serviceKey: "saju-new-year",
  serviceType: "new_year_pdf",
  jobId: "verify-pdf-llm-gateway",
  chapterId: "newyear-01",
  chapterTitle: "Intro",
  chapterOrder: 1,
  totalChapters: 10,
  input: {
    name: "gateway-user",
    gender: "female",
    birthDate: "1990-05-17",
    birthTime: "",
    targetYear: 2031,
  },
  context: {
    serviceKey: "saju-new-year",
    provider: "workers-ai",
    allowActual: true,
    format: "markdown",
    callIndex: 1,
  },
};

const env = {
  NODE_ENV: "production",
  PDF_DEBUG_MODE: "true",
  LLM_DRY_RUN: "false",
  PDF_LLM_PROVIDER: "workers-ai",
  WORKERS_AI_ENABLED: "true",
  PDF_LLM_MAX_CALLS_PER_JOB: "1",
  AI: {
    async run() {
      aiRunCalls += 1;
      return {
        response: "첫 장의 흐름은 총운과 세운이 만나는 곳에서 조용히 열립니다.",
      };
    },
  },
};

let aiRunCalls = 0;
const markdownResult = await generatePdfChapterContent(input, env);
assert.equal(aiRunCalls, 1);
assert.equal(markdownResult.isMock, false);
assert.equal(markdownResult.provider, "workers-ai");
assert.equal(markdownResult.providerReason, "real_llm_success");
assert.ok(markdownResult.modelName);
assert.ok(markdownResult.tokensUsed > 0);
assert.ok(markdownResult.content.length > 0);

const jsonTextResult = await generatePdfChapterTextResult({
  ...input,
  serviceType: "saju-new-year-json",
  prompt: "Return one valid chapter manuscript.",
  systemPrompt: "Write in Korean.",
  context: {
    ...input.context,
    format: "saju-new-year-json",
  },
}, env);
assert.equal(aiRunCalls, 2);
assert.equal(jsonTextResult.ok, true);
assert.equal(jsonTextResult.provider, "workers-ai");
assert.equal(jsonTextResult.providerReason, "real_llm_success");
assert.ok(jsonTextResult.tokensUsed > 0);

let failedCalls = 0;
const failedResult = await generatePdfChapterTextResult(input, {
  ...env,
  AI: {
    async run() {
      failedCalls += 1;
      throw new Error("gateway failure");
    },
  },
});
assert.equal(failedCalls, 1);
assert.equal(failedResult.ok, false);
assert.equal(failedResult.errorCode, "workers_ai_run_failed");
assert.equal(failedResult.providerReason, "workers_ai_run_failed");
assert.ok(failedResult.errorSummary.includes("gateway failure"));

const missingBindingResult = await generatePdfChapterTextResult(input, {
  ...env,
  AI: undefined,
});
assert.equal(missingBindingResult.ok, false);
assert.equal(missingBindingResult.errorCode, "missing_ai_binding");
assert.equal(missingBindingResult.providerReason, "missing_ai_binding");

const dryRunResult = await generatePdfChapterContent(input, {
  ...env,
  LLM_DRY_RUN: "true",
});
assert.equal(dryRunResult.isMock, true);
assert.equal(dryRunResult.provider, "mock");
assert.equal(aiRunCalls, 2);

console.log("verify:pdf-llm-gateway ok", {
  aiRunCalls,
  markdownProvider: markdownResult.provider,
  failedReason: failedResult.providerReason,
  missingReason: missingBindingResult.providerReason,
});

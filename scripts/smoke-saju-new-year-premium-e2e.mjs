import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { __sajuNewYearTestUtils as newYear } from "../worker/routes/saju-new-year.js";

const routeSource = readFileSync(new URL("../worker/routes/saju-new-year.js", import.meta.url), "utf8");
const handlePrepareSource = routeSource.slice(routeSource.indexOf("async function handlePrepare"));

const profile = {
  name: "테스트",
  gender: "F",
  calendarType: "solar",
  birth: {
    year: 1994,
    month: 8,
    day: 16,
    hour: 9,
    minute: 0,
    calendarType: "solar",
    timezone: "Asia/Seoul",
    birthPlace: "서울",
    latitude: 37.5665,
    longitude: 126.978,
    unknownTime: false,
  },
};

const seed = newYear.buildPdfSeed(profile, 2026, {
  quantumMyeongriJson: { schemaVersion: "smoke-client-evidence.v1" },
});
const masterJson = newYear.buildNewYearMasterJson(seed, {
  quantumMyeongriJson: { schemaVersion: "smoke-client-evidence.v1" },
});
const masterValidation = newYear.validateNewYearMasterJson(masterJson);
assert.equal(masterValidation.ok, true, `master json validation ${JSON.stringify(masterValidation)}`);
assert.equal(masterJson.schemaVersion, "saju-new-year-master-json.v1");
assert.equal(masterJson.monthlyFlow.length, 12);

const specs = newYear.buildSajuNewYearChapterSpecs(2026);
assert.equal(specs.length, 10);

const paymentCheckIndex = handlePrepareSource.indexOf("const premiumAccessToken = clean");
const requireAccessIndex = handlePrepareSource.indexOf("await requirePremiumReportAccess", paymentCheckIndex);
const cacheLookupIndex = handlePrepareSource.indexOf("const cachedPdfExecution = await findNewYearReusableExecution");
const startExecutionIndex = handlePrepareSource.indexOf("await startPremiumPdfExecution");
const generatePdfIndex = handlePrepareSource.indexOf("const pipelineResult = await generateSajuNewYearPremiumReport");
const completeExecutionIndex = handlePrepareSource.indexOf("await completePremiumPdfExecution");
assert.ok(paymentCheckIndex > -1, "premium access check exists");
assert.ok(requireAccessIndex > paymentCheckIndex, "premium report access resolver exists after token read");
assert.ok(cacheLookupIndex > paymentCheckIndex, "cache lookup happens after payment access");
assert.ok(startExecutionIndex > cacheLookupIndex, "premium execution starts after cache lookup");
assert.ok(generatePdfIndex > startExecutionIndex, "LLM generation starts after payment execution start");
assert.ok(completeExecutionIndex > generatePdfIndex, "premium execution completes after LLM generation");
assert.equal(handlePrepareSource.slice(0, paymentCheckIndex).includes("generateSajuNewYearPremiumReport("), false, "no LLM generation before payment access");
assert.equal(newYear.YEARLY_SAJU_PDF_CONFIG.generationMode, "pdf-v3-llm-only");
assert.equal(newYear.YEARLY_SAJU_PDF_CONFIG.provider, "saju-new-year-llm");

function longConsultation(chapterNo, sectionTitle, sectionIndex) {
  const lead = `${sectionTitle}에서는 원국, 세운, 월운, 오행, 십성, 합, 충, 용신, 희신의 흐름을 함께 보며 2026년의 선택 기준을 세웁니다.`;
  const paragraphs = Array.from({ length: 5 }, (_, idx) => {
    const monthA = ((chapterNo + sectionIndex + idx) % 12) + 1;
    const monthB = ((chapterNo + sectionIndex + idx + 5) % 12) + 1;
    return `${lead} ${monthA}월에는 실행과 기록을 앞에 두면 흐름이 안정되고, ${monthB}월에는 관계와 지출, 건강 리듬을 차분히 점검하는 편이 좋습니다. ${sectionTitle}의 결은 단순한 길흉보다 어떤 문을 열고 어떤 문을 천천히 닫을지 알려 주며, 세운의 십성은 삶의 방향을 현실적인 태도로 옮기라고 가리킵니다. 원국의 오행 균형이 살아나는 때에는 제안과 만남을 피하지 말고, 충의 신호가 강한 때에는 말의 온도와 약속의 범위를 먼저 정리하십시오.`;
  });
  return paragraphs.join("\n\n");
}

function makeChapterJson(chapterNo) {
  const spec = specs[chapterNo - 1];
  const chapter = {
    schemaVersion: "saju-new-year-llm-json.v1",
    targetYear: 2026,
    chapterNo,
    title: spec.title,
    focus: `${spec.title}의 핵심 흐름`,
    sections: spec.categories.map((title, index) => ({
      title,
      body: longConsultation(chapterNo, title, index),
      sajuEvidence: ["원국과 세운의 관계", "월운과 오행의 흐름"],
      keyPoints: [`${title}의 핵심은 실행과 점검의 균형입니다.`],
      actionGuide: ["좋은 달에는 제안과 실행을 앞에 둡니다."],
      checklist: ["월말마다 관계, 돈, 몸의 리듬을 확인합니다."],
      caution: ["충의 신호가 강한 달에는 결론을 서두르지 않습니다."],
    })),
  };
  if (chapterNo === 9) {
    chapter.monthlyFortunes = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      title: `${index + 1}월의 실행과 정비를 여는 상담 흐름`,
      flow: `${index + 1}월은 원국과 세운, 월운이 만나는 결을 차분히 살피며 실행과 정비를 나누는 달입니다.`,
      advice: "준비된 일은 작게 열고, 결과는 기록으로 남기십시오.",
      caution: "감정적인 약속과 충동적인 지출은 한 번 더 확인하십시오.",
      action: "이번 달 가장 중요한 일정 하나를 먼저 정리하십시오.",
      luckyRoutine: "아침마다 오늘의 선택 기준을 한 줄로 적으십시오.",
    }));
  }
  if (chapterNo === 10) {
    chapter.finalAdvice = {
      title: "마지막 조언",
      body: Array.from({ length: 4 }, () => "2026년의 흐름은 원국과 세운, 월운의 결을 매달의 선택으로 옮길 때 가장 맑게 열립니다. 좋은 달에는 준비한 것을 밖으로 내고, 점검의 달에는 관계와 돈, 몸의 리듬을 차분히 다듬으십시오. 올해의 운은 한 번의 결론보다 반복되는 기준 속에서 깊어집니다.").join("\n\n"),
    };
  }
  return chapter;
}

function chapterNoFromPrompt(prompt) {
  const match = String(prompt || "").match(/(?:이번에 작성할 챕터|작성 대상):\s*\n\s*(\d+)\./);
  return Number(match?.[1] || 1);
}

let firstCall = true;
let aiCallCount = 0;
const env = {
  SAJU_NEW_YEAR_LLM_PROVIDERS: "workers-ai",
  SAJU_NEW_YEAR_LLM_REPAIR_LIMIT: "1",
  AI: {
    async run(_model, payload) {
      aiCallCount += 1;
      const prompt = payload?.messages?.find((item) => item.role === "user")?.content || "";
      if (firstCall) {
        firstCall = false;
        return { response: "{}" };
      }
      return { response: JSON.stringify(makeChapterJson(chapterNoFromPrompt(prompt))) };
    },
  },
};

const normalized = newYear.normalizeYearlySajuInput({
  profile,
  targetYear: 2026,
  body: { quantumMyeongriJson: { schemaVersion: "smoke-client-evidence.v1" } },
});
assert.equal(normalized.normalizedData.service, "yearly-saju");
assert.equal(normalized.normalizedData.targetYear, 2026);
assert.equal(normalized.normalizedData.monthly.length, 12);
assert.equal(normalized.monthlyFortuneSections.length, 12);

const cacheKeyA = newYear.buildYearlySajuPdfCacheKey(normalized);
const cacheKeyB = newYear.buildYearlySajuPdfCacheKey(newYear.normalizeYearlySajuInput({
  profile,
  targetYear: 2026,
  body: { quantumMyeongriJson: { schemaVersion: "smoke-client-evidence.v1" } },
}));
const cacheKeyNextYear = newYear.buildYearlySajuPdfCacheKey(newYear.normalizeYearlySajuInput({
  profile,
  targetYear: 2027,
  body: { quantumMyeongriJson: { schemaVersion: "smoke-client-evidence.v1" } },
}));
assert.match(cacheKeyA, /^saju-new-year-llm-cache:/);
assert.equal(cacheKeyA, cacheKeyB);
assert.notEqual(cacheKeyA, cacheKeyNextYear);
const cacheCtx = newYear.buildYearlySajuPdfCacheExecutionContext({ executionKey: "session-key", idempotencyKey: "session-key", metadata: {} }, cacheKeyA);
assert.equal(cacheCtx.metadata.cacheKind, "saju-new-year-llm-pdf");
assert.equal(cacheCtx.metadata.promptVersion, "saju-new-year-llm-prompt.v1");
assert.equal(cacheCtx.metadata.schemaVersion, "saju-new-year-llm-json.v1");

const pipelineResult = await newYear.generateSajuNewYearPremiumReport({
  env,
  normalized,
  userId: "smoke-user",
  jobId: "smoke-new-year-llm",
});
assert.equal(aiCallCount, 11, "first invalid call is repaired, then 10 valid chapter calls complete");
assert.equal(pipelineResult.manuscriptSource, "saju-new-year-llm-only");
assert.equal(pipelineResult.llmAssemblyOnly, true);
assert.equal(pipelineResult.fallbackUsed, false);
assert.equal(pipelineResult.externalCallsAllowed, true);
assert.equal(pipelineResult.generationMode, "pdf-v3-llm-only");
assert.equal(pipelineResult.promptVersion, "saju-new-year-llm-prompt.v1");
assert.equal(pipelineResult.schemaVersion, "saju-new-year-llm-json.v1");
assert.equal(pipelineResult.chapters.length, 10);
assert.equal(pipelineResult.monthlyFortunes.length, 12);
assert.equal(pipelineResult.validation.ok, true, `LLM report validation ${JSON.stringify(pipelineResult.validation)}`);
assert.equal(JSON.stringify(pipelineResult.chapters).includes("local-rule-completed"), false);

const archiveUrls = newYear.buildNewYearArchiveUrls("https://example.test", "new-year-smoke");
const pdfReady = newYear.buildPdfReadyPayload(seed, pipelineResult.chapters, {
  manuscriptSource: pipelineResult.manuscriptSource,
  llmAssembly: pipelineResult.llmAssembly,
  llmAssemblyOnly: true,
  fallbackUsed: false,
  externalCallsAllowed: true,
  generationMode: pipelineResult.generationMode,
  provider: pipelineResult.provider,
  promptVersion: pipelineResult.promptVersion,
  schemaVersion: pipelineResult.schemaVersion,
  qualityVersion: pipelineResult.qualityVersion,
  finalAdvice: pipelineResult.finalAdvice,
  monthlyFortunes: pipelineResult.monthlyFortunes,
  qualityStatus: "passed",
});
pdfReady.pdfUrl = archiveUrls.pdfUrl;
pdfReady.downloadUrl = archiveUrls.pdfUrl;
pdfReady.htmlUrl = archiveUrls.htmlUrl;
pdfReady.mimeType = "application/pdf";
pdfReady.contentType = "application/pdf";
assert.ok(String(pdfReady.html || "").includes("<div class=\"brand\">Code Destiny</div>"));
assert.ok(String(pdfReady.html || "").includes("<h1>2026년 신년운세</h1>"));
assert.ok(String(pdfReady.html || "").includes("운의 시각 지도"));
assert.ok(String(pdfReady.html || "").includes("월별 운세 리듬 그래프"));
assert.ok(String(pdfReady.html || "").includes("오행 균형 그래프"));
assert.ok(String(pdfReady.html || "").includes("monthly-score-chart"));
assert.ok(String(pdfReady.html || "").includes("element-balance-chart"));
assert.ok(String(pdfReady.html || "").includes("<th>점수</th>"));
assert.ok(String(pdfReady.html || "").includes("마지막 조언"));
assert.equal(/\b(?:undefined|null|NaN)\b|\[object Object\]|local-rule-completed/i.test(String(pdfReady.html || "")), false);
const completionValidation = newYear.validateSajuNewYearPdfCompletionPayload({
  pdfReady,
  chapters: pipelineResult.chapters,
  requireDownloadUrl: true,
});
assert.equal(completionValidation.ok, true, `completion validation ${JSON.stringify(completionValidation)}`);

const reusableCached = newYear.buildNewYearReusableExecutionResponse({
  status: "success",
  premiumStatus: "completed",
  reportId: "cached-report",
  sessionId: "cached-session",
  featureKey: "sajuNewYear",
  metadata: {
    cacheKey: cacheKeyA,
    manuscriptSource: pipelineResult.manuscriptSource,
    llmAssembly: pipelineResult.llmAssembly,
    llmAssemblyOnly: true,
    promptVersion: pipelineResult.promptVersion,
    schemaVersion: pipelineResult.schemaVersion,
    archive: {
      reportId: "cached-report",
      targetYear: 2026,
      chapterCount: pipelineResult.chapters.length,
      manuscriptSource: pipelineResult.manuscriptSource,
      llmAssembly: pipelineResult.llmAssembly,
      llmAssemblyOnly: true,
      promptVersion: pipelineResult.promptVersion,
      schemaVersion: pipelineResult.schemaVersion,
      chapters: pipelineResult.chapters,
      normalizedData: pipelineResult.normalizedData,
      monthlyFortuneSections: pipelineResult.monthlyFortuneSections,
      monthlyFortunes: pipelineResult.monthlyFortunes,
      finalAdvice: pipelineResult.finalAdvice,
      clientSummary: pipelineResult.clientSummary,
      pdfReady: {
        ...pdfReady,
        pdfUrl: "https://example.test/api/premium/pdf-archive/cached-report?format=pdf",
        downloadUrl: "https://example.test/api/premium/pdf-archive/cached-report?format=pdf",
        htmlUrl: "https://example.test/api/premium/pdf-archive/cached-report?format=html",
      },
    },
  },
}, { cacheKey: cacheKeyA, targetYear: 2026 });
assert.equal(reusableCached.status, 200);
assert.equal(reusableCached.payload.data.cacheHit, true);
assert.equal(reusableCached.payload.data.llmAssemblyOnly, true);
assert.equal(reusableCached.payload.data.fallbackUsed, false);

const rejectedLocalCache = newYear.buildNewYearReusableExecutionResponse({
  status: "success",
  premiumStatus: "completed",
  reportId: "old-local-cache",
  metadata: {
    archive: {
      manuscriptSource: "high-quality-consultation",
      pdfReady: { downloadUrl: "https://example.test/old.pdf", html: pdfReady.html },
      chapters: pipelineResult.chapters,
      clientSummary: pipelineResult.clientSummary,
    },
  },
}, {});
assert.equal(rejectedLocalCache, null);

const rejectedProviderFailure = await newYear.generateSajuNewYearPremiumReport({
  env: {
    SAJU_NEW_YEAR_LLM_PROVIDERS: "workers-ai",
    SAJU_NEW_YEAR_LLM_REPAIR_LIMIT: "0",
    SAJU_NEW_YEAR_WORKERS_AI_MODEL: "failure-model",
    AI: { async run() { return { response: "{}" }; } },
  },
  normalized,
  userId: "smoke-user",
  jobId: "smoke-new-year-llm-fail",
}).then(
  () => null,
  (error) => error,
);
assert.equal(rejectedProviderFailure?.code, "SAJU_NEW_YEAR_LLM_CHAPTER_GENERATION_FAILED");

console.log("[smoke-saju-new-year-premium-e2e] ok");

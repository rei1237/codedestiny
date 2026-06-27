import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { __sajuNewYearTestUtils } from "../worker/routes/saju-new-year.js";

const targetYear = 2031;
const input = {
  name: "flow-user",
  gender: "female",
  birthDate: "1990-05-17",
  birthTime: "",
  targetYear,
  question: "How should I handle career and income flow this year?",
  category: "career",
};

const normalized = __sajuNewYearTestUtils.normalizeInput(input);
assert.equal(normalized.ok, true);

const yearlyNormalized = __sajuNewYearTestUtils.normalizeYearlySajuInput({
  profile: normalized.profile,
  targetYear,
  body: input,
});
assert.equal(yearlyNormalized.targetYear, targetYear);
assert.ok(yearlyNormalized.natalCalculation);
assert.ok(yearlyNormalized.yearlyCalculation);
assert.ok(Array.isArray(yearlyNormalized.monthlyCalculation));

const aiPrompt = __sajuNewYearTestUtils.buildNewYearAIConsultationPrompt({
  normalized,
  yearlyNormalized,
  body: input,
  question: input.question,
  category: input.category,
});
assert.ok(aiPrompt.includes("question"));
assert.ok(aiPrompt.includes("category"));
assert.ok(aiPrompt.includes("chapterConsultations"));
assert.ok(aiPrompt.includes("summary"));
assert.ok(aiPrompt.includes("topicAnswer"));
assert.ok(aiPrompt.includes(String(targetYear)));

const parsedAi = __sajuNewYearTestUtils.normalizeNewYearAIResult(JSON.stringify({
  summary: "The year asks for steady judgment and clear execution.",
  yearlyFlow: "The yearly flow highlights responsibility, evaluation, and practical choices.",
  topicAnswer: "Career and income improve when proposals are verified and results are documented.",
  chapterConsultations: Array.from({ length: 6 }, (_, index) => ({
    no: index + 1,
    title: `Chapter ${index + 1}`,
    overview: "The year's energy opens through practical preparation.",
    sections: [{ title: "Core flow", body: "Choose verified opportunities over rushed expansion." }],
    keyTakeaways: ["Keep the pace measured."],
    actionItems: ["Record important decisions."],
  })),
  timing: {
    goodPeriods: ["spring"],
    cautionPeriods: ["late summer"],
    monthlyNotes: [{ month: "March", note: "Good for reviewing proposals." }],
  },
  actionGuide: ["Check contracts in writing."],
  closingMessage: "The year favors those who move with quiet precision.",
  followUpQuestions: ["Which month is best for a job move?"],
}));
assert.equal(parsedAi.timing.monthlyNotes[0].month, "March");
assert.equal(parsedAi.followUpQuestions.length, 1);
assert.equal(parsedAi.chapterConsultations.length, 6);
assert.equal(parsedAi.chapterConsultations[0].sections[0].title, "Core flow");

const rawFallback = __sajuNewYearTestUtils.normalizeNewYearAIResult(
  "This year favors calm preparation, careful contracts, and practical proof of your strengths.",
  targetYear,
);
assert.ok(rawFallback.rawText.includes("calm preparation"));

const frontendSource = await readFile("js/saju-new-year.js", "utf8");
const indexSource = await readFile("index.html", "utf8");
const routeSource = await readFile("worker/routes/saju-new-year.js", "utf8");
const runtimeSource = await readFile("js/core/index-inline-runtime.js", "utf8");
const billingSource = await readFile("worker/routes/billing.js", "utf8");
const runBillingBlock = frontendSource.match(/function _runBillingAndGeneration[\s\S]*?function _bindQuestionControls/);
const runBillingSource = runBillingBlock?.[0] || "";
const startAuthBlock = routeSource.match(/async function resolveNewYearAIStartAuth[\s\S]*?async function verifyNewYearAIConsultationAccessToken/);
const startAuthSource = startAuthBlock?.[0] || "";
const paidGateIndex = runBillingSource.indexOf("_runPaidGate");
const consultationPostIndex = runBillingSource.indexOf("_postConsultation(payload)");
const loadingScreenIndex = runBillingSource.indexOf("_showScreen('nyLoadingScreen')");

assert.ok(routeSource.includes('path === "/ai-consultation"'));
assert.ok(routeSource.includes("async function handleNewYearAIConsultation(request, env)"));
assert.ok(routeSource.includes("handleNewYearAIConsultationDeprecatedPhase"));
assert.ok(routeSource.includes("NEW_YEAR_AI_PHASE_DEPRECATED"));
assert.ok(!routeSource.includes("NEW_YEAR_AI_PHASE_REQUIRED"));
assert.ok(routeSource.includes("[NewYearAI Consultation]"));
assert.ok(routeSource.includes("fallbackToWorkersAI: false"));
assert.ok(routeSource.includes('provider: "gemini"'));
assert.ok(routeSource.includes('providerName: "gemini"'));
assert.ok(routeSource.includes("NEW_YEAR_AI_CHAPTER_COUNT = 6"));
assert.ok(routeSource.includes("maxOutputTokens: 6144"));
assert.ok(routeSource.includes("readNewYearAIPremiumAccessToken"));
assert.ok(routeSource.includes("resolveNewYearAIStartAuth"));
assert.ok(routeSource.includes("getOptionalUserFromRequest"));
assert.ok(routeSource.includes("function hasNewYearAIPassEvidence"));
assert.ok(routeSource.includes("NEW_YEAR_AI_PAYMENT_TOKEN_MISSING"));
assert.ok(routeSource.includes("NEW_YEAR_AI_AUTH_SERVICE_ERROR"));
assert.ok(routeSource.includes('authSource: "premiumAccessToken"'));
assert.ok(startAuthBlock);
assert.ok(startAuthSource.indexOf("verifyPremiumAccessToken(premiumAccessToken") >= 0);
assert.ok(startAuthSource.indexOf("getOptionalUserFromRequest") > startAuthSource.indexOf("verifyPremiumAccessToken(premiumAccessToken"));
assert.ok(!routeSource.includes("maxOutputTokens: 8192"));

assert.ok(frontendSource.includes("AI_CONSULTATION_API = '/api/saju-new-year/ai-consultation'"));
assert.ok(!frontendSource.includes("AI_READY_API"));
assert.ok(!frontendSource.includes("AI_START_API"));
assert.ok(!frontendSource.includes("AI_CHAPTER_API"));
assert.ok(!frontendSource.includes("AI_FOCUS_API"));
assert.ok(!frontendSource.includes("AI_FINALIZE_API"));
assert.ok(!frontendSource.includes("VERIFY_ACCESS_API"));
assert.ok(!frontendSource.includes("CREATE_JOB_API"));
assert.ok(!frontendSource.includes("GENERATE_MOCK_API"));
assert.ok(!frontendSource.includes("STATUS_API"));
assert.ok(!frontendSource.includes("RESULT_API"));
assert.ok(!frontendSource.includes("JOB_STORAGE_KEY"));
assert.ok(!frontendSource.includes("consultationAccessToken"));
assert.ok(!frontendSource.includes("x-new-year-ai-access-token"));
assert.ok(!frontendSource.includes("downloadSajuNewYearPdf"));
assert.ok(!frontendSource.includes("_runAfterBillingMock"));
assert.ok(!frontendSource.includes("_runAIChapterWithRetry"));
assert.ok(!frontendSource.includes("_runAIFocusWithRetry"));
assert.ok(!frontendSource.includes("retrySajuNewYearAIChapter"));
assert.ok(!frontendSource.includes("/ai-consultation/start"));
assert.ok(!frontendSource.includes("/ai-consultation/focus"));
assert.ok(!frontendSource.includes("/ai-consultation/chapter"));
assert.ok(!frontendSource.includes("/ai-consultation/finalize"));
assert.ok(!frontendSource.includes("/verify-access"));
assert.ok(!frontendSource.includes("/create-job"));
assert.ok(!frontendSource.includes("/generate-mock"));
assert.ok(!frontendSource.includes("/status"));
assert.ok(!frontendSource.includes("/result"));
assert.ok(frontendSource.includes("function _buildPaidEvidence"));
assert.ok(frontendSource.includes("function _isPassAccessPayload"));
assert.ok(frontendSource.includes("'rawPayload'"));
assert.ok(frontendSource.includes("source.access && source.access.rawPayload"));
assert.ok(frontendSource.includes("premiumAccessToken: paymentToken || undefined"));
assert.ok(frontendSource.includes("payload._premiumAccessToken = paymentToken"));
assert.ok(frontendSource.includes("payload.accessGrant = Object.assign({}, payload.accessGrant || {}, { premiumAccessToken: paymentToken })"));
assert.ok(frontendSource.includes("onGranted: function (transactionId, payload, access)"));
assert.ok(frontendSource.includes("NEW_YEAR_AI_PAYMENT_TOKEN_MISSING"));
assert.ok(frontendSource.includes("WORKER_UNHANDLED_EXCEPTION"));
assert.ok(frontendSource.includes("Authentication service error"));
assert.ok(frontendSource.includes("payload.code || payload.error"));
assert.ok(frontendSource.includes("function _bindGenerateButton"));
assert.ok(frontendSource.includes("premiumAccessToken: premiumAccessToken || undefined"));
assert.ok(frontendSource.includes("function _chapterConsultationsHtml"));
assert.ok(frontendSource.includes("paymentPurpose: 'ai_consultation'"));
assert.ok(frontendSource.includes("NetworkRequestStart"));
assert.ok(frontendSource.includes("NetworkRequestEnd"));
assert.ok(frontendSource.includes("forcePassFirst: true"));
assert.ok(frontendSource.includes("reportType: 'sajuNewYear'"));
assert.ok(frontendSource.includes("allowedPaymentModes: ['direct', 'monthly', 'membership_pass', 'pass']"));
assert.ok(frontendSource.includes("forceDeduct: false"));
assert.ok(frontendSource.includes("membership_pass|family|family_pass"));
assert.ok(frontendSource.includes("passTier === 'family'"));

assert.ok(runBillingBlock);
assert.ok(runBillingSource.includes("_runPaidGate"));
assert.ok(runBillingSource.includes("_postConsultation(payload)"));
assert.ok(paidGateIndex >= 0);
assert.ok(consultationPostIndex > paidGateIndex);
assert.ok(loadingScreenIndex > paidGateIndex);
assert.ok(!runBillingSource.includes("_runAfterBillingMock"));
assert.ok(!runBillingSource.includes("_postJson"));

assert.ok(billingSource.includes('accessType === "family"'));
assert.ok(billingSource.includes('accessType === "family_pass"'));
assert.ok(billingSource.includes('transactionType === "family_pass"'));
assert.ok(billingSource.includes('accessMethod === "family"'));

assert.ok(routeSource.includes("buildNewYearAIJsonRepairPrompt"));
assert.ok(routeSource.includes("newYearAIRawTextMeta"));
assert.ok(routeSource.includes("parseFallback"));
assert.ok(routeSource.includes("rawTextHash"));

assert.ok(indexSource.includes('data-cd-marker="new-year-ai-consultation-v20260627"'));
assert.ok(!indexSource.includes('id="nyInsightPanel"'));
assert.ok(!indexSource.includes('id="nyChapterContent"'));
assert.ok(!indexSource.includes('id="nyPrevChapterBtn"'));
assert.ok(!indexSource.includes('data-action="downloadSajuNewYearPdf"'));
assert.ok(indexSource.includes("function _cdBuildPassBypassPayload"));
assert.ok(indexSource.includes("access.rawPayload"));
assert.ok(indexSource.includes("payload.premiumAccessToken = payload.premiumAccessToken || token"));
assert.ok(indexSource.includes("merged.premiumAccessToken = merged.premiumAccessToken || dataToken"));
assert.ok(indexSource.includes("nyQuestion"));
assert.ok(indexSource.includes("nyConsultationResultCards"));
assert.ok(runtimeSource.includes("/js/saju-new-year.js?v=build-"));

console.log("verify:saju-new-year-flow ok", {
  targetYear,
  route: "/api/saju-new-year/ai-consultation",
  aiConsultationRoute: true,
  singleApiFlow: true,
  geminiOnly: true,
  legacyPdfFlowDetached: true,
});

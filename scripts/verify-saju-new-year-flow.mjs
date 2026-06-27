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
  question: "올해 직업운과 수입 흐름은 어떻게 될까요?",
  category: "직업/이직",
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
assert.ok(aiPrompt.includes("명식/대운/세운/월운 context"));
assert.ok(aiPrompt.includes("직업/이직"));
assert.ok(aiPrompt.includes("올해 직업운과 수입 흐름"));
assert.ok(aiPrompt.includes("1장씩 순차 작성"));
assert.ok(aiPrompt.includes("6장 상담 설계도"));
assert.ok(aiPrompt.includes("제 1장. 2031년 올해의 큰 기운과 상담 요약"));
assert.ok(aiPrompt.includes("제 6장. 2031년 좋은 시기와 행동 로드맵"));

const chapterPrompt = __sajuNewYearTestUtils.buildNewYearAIChapterPrompt({
  normalized,
  yearlyNormalized,
  body: input,
  question: input.question,
  category: input.category,
  chapterNo: 2,
});
assert.ok(chapterPrompt.includes("제 2장만 작성"));
assert.ok(chapterPrompt.includes("전체 6장을 한 번에 쓰지 말고"));
assert.ok(chapterPrompt.includes("chapter, resultPatch"));
assert.ok(chapterPrompt.includes("fallbackToWorkersAI") === false);

const focusPrompt = __sajuNewYearTestUtils.buildNewYearAIFocusPrompt({
  normalized,
  yearlyNormalized,
  body: input,
  question: input.question,
  category: input.category,
});
assert.ok(focusPrompt.includes("신년운세 집중 상담"));
assert.ok(focusPrompt.includes("사용자가 실제로 물은 주제를 가장 깊게"));
assert.ok(focusPrompt.includes("topicAnswer"));

const parsedAi = __sajuNewYearTestUtils.normalizeNewYearAIResult(JSON.stringify({
  summary: "올해는 방향을 좁히고 실행 기준을 세우는 흐름입니다. 무리한 확장보다 준비한 일을 밖으로 꺼내는 흐름이 강합니다.",
  yearlyFlow: "세운과 원국의 균형을 살피면 현실 감각과 책임의 기운이 중요하게 떠오릅니다.",
  topicAnswer: "직업운은 제안과 검증을 함께 보는 방식이 좋습니다.",
  chapterConsultations: Array.from({ length: 6 }, (_, index) => ({
    no: index + 1,
    title: `${index + 1}장 신년운세 상담`,
    overview: "원국과 세운의 흐름을 함께 살피면 올해의 선택 기준이 차분히 드러납니다.",
    sections: [{ title: "핵심 흐름", body: "계산된 흐름을 바탕으로 무리한 단정보다 현실적인 선택 기준을 세웁니다." }],
    keyTakeaways: ["흐름을 좁혀 판단합니다."],
    actionItems: ["중요한 결정은 기록으로 남깁니다."],
  })),
  timing: {
    goodPeriods: ["봄"],
    cautionPeriods: ["늦가을"],
    monthlyNotes: [{ month: "3월", note: "작은 제안을 열어 보기 좋습니다." }],
  },
  actionGuide: ["계약은 문서로 확인합니다."],
  closingMessage: "새해의 문은 서두름보다 분명한 기준 앞에서 넓어집니다.",
  followUpQuestions: ["올해 이직 시기를 더 자세히 봐주세요."],
}));
assert.equal(parsedAi.timing.monthlyNotes[0].month, "3월");
assert.equal(parsedAi.followUpQuestions.length, 1);
assert.equal(parsedAi.chapterConsultations.length, 6);
assert.equal(parsedAi.chapterConsultations[0].sections[0].title, "핵심 흐름");

const parsedChapter = __sajuNewYearTestUtils.normalizeNewYearAIChapterResponse(JSON.stringify({
  chapter: {
    no: 2,
    title: "제 2장. 커리어와 일의 흐름",
    overview: "올해 일의 흐름은 역할을 좁히고 성과의 증거를 남기는 방향으로 드러납니다.",
    sections: [{ title: "직업운", body: "세운의 기운은 맡은 일을 넓히기보다 책임의 기준을 세우게 합니다." }],
    keyTakeaways: ["성과 증거를 남깁니다."],
    actionItems: ["제안은 문서로 정리합니다."],
  },
  resultPatch: {
    topicAnswer: "직업운은 제안과 검증을 함께 보는 방식이 좋습니다.",
  },
}), targetYear, 2);
assert.equal(parsedChapter.chapter.no, 2);
assert.ok(parsedChapter.resultPatch.topicAnswer.includes("직업운"));

const parsedFocus = __sajuNewYearTestUtils.normalizeNewYearAIFocusResponse(JSON.stringify({
  topicAnswer: "질문하신 직업운과 수입 흐름은 세운이 책임과 평가를 건드리는 방식으로 열립니다. 무리한 확장보다 지금 가진 역량을 증명하는 흐름이 중요합니다.",
  actionGuide: ["성과 기록을 남깁니다."],
  followUpQuestions: ["올해 이직 시기를 더 자세히 봐주세요."],
}));
assert.ok(parsedFocus.resultPatch.topicAnswer.includes("직업운"));

const rawChapterFallback = __sajuNewYearTestUtils.normalizeNewYearAIChapterResponse(
  "올해의 일 흐름은 서두른 확장보다 맡은 자리의 책임을 단단히 증명하는 쪽으로 드러납니다. 제안은 들어오더라도 조건을 문서로 확인하고, 성급한 약속보다 준비된 성과를 보여 주는 편이 좋습니다.",
  targetYear,
  2,
);
assert.equal(rawChapterFallback.chapter.no, 2);
assert.equal(rawChapterFallback.parseFallback, true);
assert.ok(rawChapterFallback.chapter.sections[0].body.includes("책임"));

const rawFocusFallback = __sajuNewYearTestUtils.normalizeNewYearAIFocusResponse(
  "질문하신 직업운과 수입 흐름은 올해 역할과 평가의 자리가 함께 열리는 모습입니다. 단번에 크게 바꾸기보다 지금 가진 전문성을 증명하고, 제안이 들어올 때 조건을 차분히 확인하는 흐름이 좋습니다.",
);
assert.equal(rawFocusFallback.parseFallback, true);
assert.ok(rawFocusFallback.resultPatch.topicAnswer.includes("직업운"));

const frontendSource = await readFile("js/saju-new-year.js", "utf8");
const indexSource = await readFile("index.html", "utf8");
const routeSource = await readFile("worker/routes/saju-new-year.js", "utf8");
const runtimeSource = await readFile("js/core/index-inline-runtime.js", "utf8");
const billingSource = await readFile("worker/routes/billing.js", "utf8");
const runBillingBlock = frontendSource.match(/function _runBillingAndGeneration[\s\S]*?function _restoreCurrentNewYearJob/);
const runBillingSource = runBillingBlock?.[0] || "";
const runCoinGateIndex = runBillingSource.indexOf("_runCoinGate");
const loadingScreenIndex = runBillingSource.indexOf("_showScreen('nyLoadingScreen')");

assert.ok(routeSource.includes('path === "/ai-consultation/ready"'));
assert.ok(routeSource.includes('path === "/ai-consultation/start"'));
assert.ok(routeSource.includes('path === "/ai-consultation/chapter"'));
assert.ok(routeSource.includes('path === "/ai-consultation/focus"'));
assert.ok(routeSource.includes('path === "/ai-consultation/finalize"'));
assert.ok(routeSource.includes("[NewYearAI Consultation]"));
assert.ok(routeSource.includes("fallbackToWorkersAI: false"));
assert.ok(routeSource.includes('provider: "gemini"'));
assert.ok(routeSource.includes("NEW_YEAR_AI_CHAPTER_COUNT = 6"));
assert.ok(routeSource.includes("consultationAccessToken"));
assert.ok(routeSource.includes('request.headers.get("x-new-year-ai-access-token")'));
assert.ok(routeSource.includes("verifyNewYearAIConsultationAccessToken"));
assert.ok(routeSource.includes("buildNewYearAIAuthFromConsultationToken"));
assert.ok(routeSource.includes("readNewYearAIPremiumAccessToken"));
assert.ok(routeSource.includes("resolveNewYearAIStartAuth"));
assert.ok(routeSource.includes("function hasNewYearAIPassEvidence"));
assert.ok(routeSource.includes("NEW_YEAR_AI_PAYMENT_TOKEN_MISSING"));
assert.ok(routeSource.includes('authSource: "premiumAccessToken"'));
assert.ok(routeSource.includes("authSource = \"consultationAccessToken\""));
assert.ok(routeSource.includes("createPremiumAccessToken"));
assert.ok(!routeSource.includes("maxOutputTokens: 8192"));
assert.ok(frontendSource.includes("AI_CONSULTATION_API = '/api/saju-new-year/ai-consultation'"));
assert.ok(frontendSource.includes("AI_READY_API = AI_CONSULTATION_API + '/ready'"));
assert.ok(frontendSource.includes("AI_START_API = AI_CONSULTATION_API + '/start'"));
assert.ok(frontendSource.includes("AI_CHAPTER_API = AI_CONSULTATION_API + '/chapter'"));
assert.ok(frontendSource.includes("AI_FOCUS_API = AI_CONSULTATION_API + '/focus'"));
assert.ok(frontendSource.includes("AI_FINALIZE_API = AI_CONSULTATION_API + '/finalize'"));
assert.ok(frontendSource.includes("function _runAfterBillingAI"));
assert.ok(frontendSource.includes("function _runAIChapterWithRetry"));
assert.ok(frontendSource.includes("function _runAIFocusWithRetry"));
assert.ok(frontendSource.includes("function _buildPaidEvidence"));
assert.ok(frontendSource.includes("function _isPassAccessPayload"));
assert.ok(frontendSource.includes("'rawPayload'"));
assert.ok(frontendSource.includes("source.access && source.access.rawPayload"));
assert.ok(frontendSource.includes("evidence && (evidence.premiumAccessToken || evidence._premiumAccessToken)"));
assert.ok(frontendSource.includes("payload.premiumAccessToken = paymentToken"));
assert.ok(frontendSource.includes("onGranted: function(transactionId, payload, access)"));
assert.ok(frontendSource.includes("NEW_YEAR_AI_PAYMENT_TOKEN_MISSING"));
assert.ok(frontendSource.includes("function _bindGenerateButton"));
assert.ok(frontendSource.includes("var _aiConsultationState"));
assert.ok(frontendSource.includes("function _setAIResultMode"));
assert.ok(frontendSource.includes("function _continueAIConsultationChapters"));
assert.ok(frontendSource.includes("window.retrySajuNewYearAIChapter"));
assert.ok(frontendSource.includes("TOTAL_CHAPTERS = 6"));
assert.ok(frontendSource.includes("consultationAccessToken"));
assert.ok(frontendSource.includes("headers['x-new-year-ai-access-token']"));
assert.ok(frontendSource.includes("premiumAccessToken: premiumAccessToken || undefined"));
assert.ok(frontendSource.includes("function _chapterConsultationsHtml"));
assert.ok(frontendSource.includes("신년운세 전체 상담"));
assert.ok(frontendSource.includes("data-action=\"retrySajuNewYearAIChapter\""));
assert.ok(frontendSource.includes("nyInsightPanel"));
assert.ok(frontendSource.includes("#nyResultScreen .lb-toc"));
assert.ok(frontendSource.includes("받은 질문을 중심으로 깊은 상담을 정리하고 있어요."));
assert.ok(frontendSource.includes("paymentPurpose: 'ai_consultation'"));
assert.ok(frontendSource.includes("NetworkRequestStart"));
assert.ok(frontendSource.includes("NetworkRequestEnd"));
assert.ok(frontendSource.includes("forcePassFirst: true"));
assert.ok(frontendSource.includes("reportType: 'sajuNewYear'"));
assert.ok(frontendSource.includes("paymentMode: 'MEMBERSHIP_PASS'"));
assert.ok(frontendSource.includes("forceDeduct: false"));
assert.ok(frontendSource.includes("membership_pass|family|family_pass"));
assert.ok(frontendSource.includes("passTier === 'family'"));
assert.ok(billingSource.includes('accessType === "family"'));
assert.ok(billingSource.includes('accessType === "family_pass"'));
assert.ok(billingSource.includes('transactionType === "family_pass"'));
assert.ok(billingSource.includes('accessMethod === "family"'));
assert.ok(routeSource.includes("buildNewYearAIJsonRepairPrompt"));
assert.ok(routeSource.includes("buildNewYearAIRawChapterFallback"));
assert.ok(routeSource.includes("buildNewYearAIRawFocusFallback"));
assert.ok(routeSource.includes("newYearAIRawTextMeta"));
assert.ok(routeSource.includes("parseFallback"));
assert.ok(routeSource.includes("rawTextHash"));
assert.ok(runBillingBlock && !runBillingBlock[0].includes("_checkNewYearAIGeminiReady"));
assert.ok(runBillingBlock && !runBillingBlock[0].includes("_hasReusableAccessFor(pending)"));
assert.ok(runCoinGateIndex >= 0);
assert.ok(loadingScreenIndex > runCoinGateIndex);
assert.ok(runBillingSource.includes("결제 권한이 확인되었습니다. 명식과 올해의 세운을 읽고 있어요."));
assert.ok(runBillingSource.indexOf("_runCoinGate") < runBillingSource.indexOf("_runAfterBillingAI(pending, gate.accessGrant"));
assert.ok(runBillingSource.includes("_runAfterBillingAI"));
assert.ok(!runBillingSource.includes("_runAfterBillingMock"));
assert.ok(!runBillingSource.includes("_postJson(AI_CONSULTATION_API"));
assert.ok(indexSource.includes('data-cd-marker="new-year-ai-consultation-v20260627"'));
assert.ok(indexSource.includes("function _cdBuildPassBypassPayload"));
assert.ok(indexSource.includes("access.rawPayload"));
assert.ok(indexSource.includes("payload.premiumAccessToken = payload.premiumAccessToken || token"));
assert.ok(indexSource.includes("merged.premiumAccessToken = merged.premiumAccessToken || dataToken"));
assert.ok(indexSource.includes("신년운세 AI 상담 받기"));
assert.ok(indexSource.includes("nyQuestion"));
assert.ok(indexSource.includes("nyConsultationResultCards"));
assert.ok(runtimeSource.includes("/js/saju-new-year.js?v=build-"));

console.log("verify:saju-new-year-flow ok", {
  targetYear,
  route: "/api/saju-new-year/ai-consultation/{ready,start,chapter,focus,finalize}",
  aiConsultationRoute: true,
  geminiOnly: true,
  oneChapterAtATime: true,
  focusedQuestionPhase: true,
});

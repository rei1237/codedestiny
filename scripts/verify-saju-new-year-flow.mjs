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
assert.ok(aiPrompt.includes("10장 상담 설계도"));
assert.ok(aiPrompt.includes("제 1장. 2031년 총운과 세운의 문"));
assert.ok(aiPrompt.includes("제 10장. 2031년 최종 신년 로드맵"));

const chapterPrompt = __sajuNewYearTestUtils.buildNewYearAIChapterPrompt({
  normalized,
  yearlyNormalized,
  body: input,
  question: input.question,
  category: input.category,
  chapterNo: 2,
});
assert.ok(chapterPrompt.includes("제 2장만 작성"));
assert.ok(chapterPrompt.includes("전체 10장을 한 번에 쓰지 말고"));
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
  chapterConsultations: Array.from({ length: 10 }, (_, index) => ({
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
assert.equal(parsedAi.chapterConsultations.length, 10);
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

const frontendSource = await readFile("js/saju-new-year.js", "utf8");
const indexSource = await readFile("index.html", "utf8");
const routeSource = await readFile("worker/routes/saju-new-year.js", "utf8");
const runtimeSource = await readFile("js/core/index-inline-runtime.js", "utf8");
const runBillingBlock = frontendSource.match(/function _runBillingAndGeneration[\s\S]*?function _restoreCurrentNewYearJob/);

assert.ok(routeSource.includes('path === "/ai-consultation/ready"'));
assert.ok(routeSource.includes('path === "/ai-consultation/start"'));
assert.ok(routeSource.includes('path === "/ai-consultation/chapter"'));
assert.ok(routeSource.includes('path === "/ai-consultation/focus"'));
assert.ok(routeSource.includes('path === "/ai-consultation/finalize"'));
assert.ok(routeSource.includes("[NewYearAI Consultation]"));
assert.ok(routeSource.includes("fallbackToWorkersAI: false"));
assert.ok(routeSource.includes('provider: "gemini"'));
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
assert.ok(frontendSource.includes("function _chapterConsultationsHtml"));
assert.ok(frontendSource.includes("신년운세 전체 상담"));
assert.ok(frontendSource.includes("받은 질문을 중심으로 깊은 상담을 정리하고 있어요."));
assert.ok(frontendSource.includes("paymentPurpose: 'ai_consultation'"));
assert.ok(runBillingBlock && runBillingBlock[0].includes("_checkNewYearAIGeminiReady"));
assert.ok(runBillingBlock && runBillingBlock[0].includes("_runAfterBillingAI"));
assert.ok(runBillingBlock && !runBillingBlock[0].includes("_runAfterBillingMock"));
assert.ok(!runBillingBlock[0].includes("_postJson(AI_CONSULTATION_API"));
assert.ok(indexSource.includes('data-cd-marker="new-year-ai-consultation-v20260627"'));
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

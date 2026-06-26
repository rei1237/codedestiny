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
assert.ok(aiPrompt.includes("JSON 객체 하나로만 답한다"));
assert.ok(aiPrompt.includes("10장 상담 설계도"));
assert.ok(aiPrompt.includes("chapterConsultations"));
assert.ok(aiPrompt.includes("제 1장. 2031년 총운과 세운의 문"));
assert.ok(aiPrompt.includes("제 10장. 2031년 최종 신년 로드맵"));

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

const frontendSource = await readFile("js/saju-new-year.js", "utf8");
const indexSource = await readFile("index.html", "utf8");
const routeSource = await readFile("worker/routes/saju-new-year.js", "utf8");
const runtimeSource = await readFile("js/core/index-inline-runtime.js", "utf8");
const runBillingBlock = frontendSource.match(/function _runBillingAndGeneration[\s\S]*?function _restoreCurrentNewYearJob/);

assert.ok(routeSource.includes('path === "/ai-consultation"'));
assert.ok(routeSource.includes("[NewYearAI Consultation]"));
assert.ok(routeSource.includes("callGeminiText(env, prompt"));
assert.ok(routeSource.includes("maxOutputTokens: 8192"));
assert.ok(frontendSource.includes("AI_CONSULTATION_API = '/api/saju-new-year/ai-consultation'"));
assert.ok(frontendSource.includes("function _runAfterBillingAI"));
assert.ok(frontendSource.includes("function _chapterConsultationsHtml"));
assert.ok(frontendSource.includes("신년운세 전체 상담"));
assert.ok(frontendSource.includes("paymentPurpose: 'ai_consultation'"));
assert.ok(runBillingBlock && runBillingBlock[0].includes("_runAfterBillingAI"));
assert.ok(runBillingBlock && !runBillingBlock[0].includes("_runAfterBillingMock"));
assert.ok(indexSource.includes('data-cd-marker="new-year-ai-consultation-v20260627"'));
assert.ok(indexSource.includes("신년운세 AI 상담 받기"));
assert.ok(indexSource.includes("nyQuestion"));
assert.ok(indexSource.includes("nyConsultationResultCards"));
assert.ok(runtimeSource.includes("/js/saju-new-year.js?v=build-"));

console.log("verify:saju-new-year-flow ok", {
  targetYear,
  route: "/api/saju-new-year/ai-consultation",
  aiConsultationRoute: true,
});

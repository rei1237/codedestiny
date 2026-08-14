#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function assert(condition, message) {
  if (!condition) {
    console.error(`[verify-new-year-ai-flow] FAIL: ${message}`);
    process.exitCode = 1;
  }
}

function assertIncludes(file, text, message = `${file} should include ${text}`) {
  assert(read(file).includes(text), message);
}

function assertExcludes(file, text, message = `${file} should not include ${text}`) {
  assert(!read(file).includes(text), message);
}

const pageSourcePath = exists("app/new-year-ai-consultation/NewYearAiClient.tsx")
  ? "app/new-year-ai-consultation/NewYearAiClient.tsx"
  : "app/new-year-ai-consultation/page.tsx";

const oldAccessRetryCopy = Buffer.from(
  "6rKw7KCcIOq2jO2VnCDtmZXsnbgg7KSRIOusuOygnOqwgCDrsJzsg53tlojsirXri4jri6QuIOyLoOuFhOyatOyEuCBBSSDsg4Hri7Qg67Cb6riw66W8IOuLpOyLnCDriIzrn6wg6raM7ZWc7J2EIO2ZleyduO2VtCDso7zshLjsmpQu",
  "base64",
).toString("utf8");

const deletedPaths = [
  "app/pdf/new-year/page.js",
  "app/components/saju-new-year-pdf/NewYearCh1_Overview.tsx",
  "worker/lib/pdf-v2/saju-new-year/generate-saju-new-year-premium-report.js",
  "worker/lib/saju-new-year-constants.js",
  "scripts/verify-saju-new-year-flow.mjs",
  "__tests__/worker/saju-new-year.pipeline.test.js",
];

for (const relPath of deletedPaths) {
  assert(!exists(relPath), `${relPath} should be removed`);
}

assertIncludes("index.html", 'href="/new-year-ai-consultation"', "main new-year card should link to the consultation page");
assertIncludes("index.html", 'data-cd-marker="new-year-ai-card-v20260627"', "main new-year card marker should exist");
assertExcludes("index.html", 'data-action="openSajuNewYearModal"', "main shell should not open the old modal action");
assertExcludes("index.html", "/js/saju-new-year.js?v=", "main shell should not preload the old new-year client");
assertExcludes("index.html", "sajuNewYearModal", "old new-year modal should be removed from the main shell");
assertExcludes("index.html", oldAccessRetryCopy, "old access retry copy should be removed");

assertIncludes(pageSourcePath, "/api/new-year-ai/ensure-access");
assertIncludes(pageSourcePath, "/api/new-year-ai/start");
assertIncludes(pageSourcePath, "runBillingCoinGate");
assertIncludes(pageSourcePath, "deferUsage: true", "new-year client should defer usage until generation succeeds");
assertIncludes(pageSourcePath, 'usagePolicy: "apply_after_success"', "new-year client should apply billing after success");
assertIncludes(pageSourcePath, "상담을 준비하고 있습니다");
assertIncludes(pageSourcePath, "결제창을 확인해 주세요");
assertIncludes(pageSourcePath, "새해의 기운을 읽는 중...");
assertIncludes(pageSourcePath, "targetYear");
assertIncludes(pageSourcePath, "focusArea");
assertIncludes(pageSourcePath, "더 깊게 보고 싶은 흐름");
assertIncludes(pageSourcePath, "nyai-category-chip");
assertIncludes(pageSourcePath, "nyai-consult-card");
assertIncludes(pageSourcePath, "handleDownloadPdf");
assertIncludes(pageSourcePath, "exportResultPdf");
assertIncludes(pageSourcePath, "PDF 저장");
assertIncludes(pageSourcePath, "data-pdf-section");
assertIncludes(pageSourcePath, "SajuProfilePanel");
assertIncludes(pageSourcePath, "기본 사주 명식");
assertIncludes(pageSourcePath, "sajuProfile");
assertIncludes(pageSourcePath, "captureTargets:");
assertIncludes(pageSourcePath, "backgroundColor:");
assertIncludes(pageSourcePath, "fileName:");
assertExcludes(pageSourcePath, "/api/new-year-ai/message");
assertExcludes(pageSourcePath, "handleFollowUp");
assertExcludes(pageSourcePath, "nyai-follow");
assertExcludes(pageSourcePath, "followUp");
assertExcludes(pageSourcePath, "/api/saju-new-year");
assertExcludes(pageSourcePath, "create-job");
assertExcludes(pageSourcePath, "verify-access");
assertExcludes(pageSourcePath, "requestPortOnePayment");

assertIncludes("worker/index.js", '"/api/new-year-ai"');
assertIncludes("worker/routes/new-year-ai.js", "handleEnsureAccess");
assertIncludes("worker/routes/new-year-ai.js", "handleStart");
assertIncludes("worker/routes/new-year-ai.js", "handleMessage");
assertIncludes("worker/routes/new-year-ai.js", "new-year-ai-consultation");
assertIncludes("worker/routes/new-year-ai.js", "PointHistory");
assertIncludes("worker/routes/new-year-ai.js", "PaidExecutionRecord");
assertIncludes("worker/routes/new-year-ai.js", "Payment");
assertIncludes("worker/routes/new-year-ai.js", "handleBillingRoutes");
assertIncludes("worker/routes/new-year-ai.js", "billingMode: \"coin-gate\"");
assertIncludes("worker/routes/new-year-ai.js", "runtimeGate");
assertIncludes("worker/routes/new-year-ai.js", "paymentAmount");
assertIncludes("worker/routes/new-year-ai.js", "calculateNewYearFortuneData");
assertIncludes("worker/routes/new-year-ai.js", "advancedSajuSummary");
assertIncludes("worker/routes/new-year-ai.js", "gyeokguk");
assertIncludes("worker/routes/new-year-ai.js", "yongshin");
assertIncludes("worker/routes/new-year-ai.js", "johu");
assertIncludes("worker/routes/new-year-ai.js", "daewoonSewoon");
assertIncludes("worker/routes/new-year-ai.js", "annualInteractions");
assertIncludes("worker/routes/new-year-ai.js", "NEW_YEAR_AI_MIN_TOTAL_CHARS = 15000");
assertIncludes("worker/routes/new-year-ai.js", "NEW_YEAR_AI_MAX_TOTAL_CHARS = 24000");
assertIncludes("worker/routes/new-year-ai.js", "validateConsultationQuality");
assertIncludes("worker/routes/new-year-ai.js", "buildMockConsultationText");
assertIncludes("worker/routes/new-year-ai.js", "buildConsultationCompressionPrompt");
assertIncludes("worker/routes/new-year-ai.js", "buildBasicSajuProfile");
assertIncludes("worker/routes/new-year-ai.js", "sajuProfile");
assertIncludes("worker/routes/new-year-ai.js", "path: \"apply\"");
assertIncludes("worker/routes/new-year-ai.js", "path: \"cancel\"");
assertIncludes("worker/routes/new-year-ai.js", "logNewYearAi(\"Prepare Start\"");
assertIncludes("worker/routes/new-year-ai.js", "logNewYearAi(\"Generate Success\"");
assertIncludes("worker/routes/new-year-ai.js", "providerReason");
assertIncludes("worker/routes/new-year-ai.js", "FOLLOW_UP_DISABLED");
assertExcludes("worker/routes/new-year-ai.js", "buildFollowUpPrompt");
assertExcludes("worker/routes/new-year-ai.js", "fetchPortOnePayment");
assertExcludes("worker/routes/new-year-ai.js", "getPortOnePublicConfig");
assertIncludes("worker/lib/models.js", "newYearAiConsultations");
assertIncludes("worker/lib/paid-feature-registry.js", '"new-year-ai-consultation"');
assertIncludes("worker/routes/saju-new-year.js", "NEW_YEAR_AI_REPLACED");
assertExcludes("js/saju-new-year.js", "/api/saju-new-year", "legacy client stub should not call old API");
assertExcludes("js/saju-new-year.js", oldAccessRetryCopy, "legacy client stub should not contain old retry copy");

const routeUrl = pathToFileURL(path.join(root, "worker/routes/new-year-ai.js")).href;
const oldRouteUrl = pathToFileURL(path.join(root, "worker/routes/saju-new-year.js")).href;
const route = await import(routeUrl);
const oldRoute = await import(oldRouteUrl);

const workerSource = read("worker/routes/new-year-ai.js");
const ensureAccessSource = workerSource.slice(workerSource.indexOf("async function handleEnsureAccess"), workerSource.indexOf("async function resolveStartAccess"));
assert(!ensureAccessSource.includes("calculateNewYearFortuneData"), "ensure-access should not calculate fortune data before auth/payment checks");

const validInput = {
  serviceType: "new-year-ai-consultation",
  consultationType: "newYearFortune",
  userName: "테스트",
  gender: "female",
  birthDate: "1992-01-10",
  birthTime: "09:30",
  calendarType: "solar",
  targetYear: 2026,
  focusArea: "overall",
  question: "",
  locale: "ko",
  idempotencyKey: "nyai-test-key-20260627",
};

const normalized = route.__newYearAiTestUtils.normalizeConsultationInput(validInput);
assert(normalized.ok === true, "new-year-ai input should normalize successfully");
assert(normalized.input.targetYear === 2026, "new-year-ai targetYear should normalize successfully");
assert(normalized.input.focusArea === "overall", "new-year-ai focusArea should normalize successfully");
const fortuneData = route.__newYearAiTestUtils.calculateNewYearFortuneData(normalized.input);
assert(fortuneData?.saju?.dayMaster, "new-year-ai fortune data should include day master");
assert(fortuneData?.targetYear?.pillar, "new-year-ai fortune data should include target-year pillar");
assert(fortuneData?.advancedSajuSummary?.gyeokguk, "new-year-ai fortune data should include gyeokguk summary");
assert(fortuneData?.advancedSajuSummary?.yongshin, "new-year-ai fortune data should include yongshin summary");
assert(fortuneData?.advancedSajuSummary?.johu, "new-year-ai fortune data should include johu summary");
assert(fortuneData?.advancedSajuSummary?.daewoonSewoon, "new-year-ai fortune data should include daewoon-sewoon summary");
assert(Array.isArray(fortuneData?.advancedSajuSummary?.annualInteractions), "new-year-ai fortune data should include annual interactions");
assert(fortuneData?.monthlyFlow?.some((row) => row.timing === "기회" || row.timing === "주의"), "new-year-ai monthly flow should include timing labels");
assert(fortuneData?.advancedSajuSummary?.domainSignals?.relationship, "new-year-ai domain signals should include relationship sentence");
assert(fortuneData?.advancedSajuSummary?.domainSignals?.study, "new-year-ai domain signals should include study sentence");
const firstPrompt = route.__newYearAiTestUtils.buildFirstPrompt(normalized.input, fortuneData);
assert(firstPrompt.includes("[계산된 사주와 세운 데이터]"), "new-year-ai first prompt should include computed fortune data");
assert(firstPrompt.includes("처음 입력한 더 깊게 보고 싶은 흐름"), "new-year-ai first prompt should use the initial deep-flow question");
assert(firstPrompt.includes("새해 전체 운의 핵심 결론"), "new-year-ai first prompt should request consultation sections");
assert(firstPrompt.includes("격국, 용신·기신, 조후, 대운-세운 관계"), "new-year-ai first prompt should request advanced saju synthesis");
assert(firstPrompt.includes("전체 본문 합계는 공백을 제외하고 15,000자 이상 24,000자 이하"), "new-year-ai prompt should require 15k-24k total content chars");
assert(firstPrompt.includes("권장 분량은 17,000~22,000자"), "new-year-ai prompt should guide the rough expected length");
assert(firstPrompt.includes("각 항목마다 15,000자를 쓰지 말고"), "new-year-ai prompt should not require the whole target per section");
assert(firstPrompt.includes("단순히 문장을 길게 늘이지 말고"), "new-year-ai prompt should require expert additions instead of filler");
assert(firstPrompt.includes("[카테고리별 참고 신호"), "new-year-ai prompt should surface per-category domain signals");
assert(firstPrompt.includes("**연애·재회**, **재물·수입**, **직업·이직**, **건강·멘탈**, **가족·관계**, **학업·성장**"), "new-year-ai prompt should require the 6 category subsections");
// 분야별 5섹션 병렬 생성 — 섹션 축이 결과 화면의 네 장 카드(+월별)와 1:1로 맞아야 한다.
const sections = route.__newYearAiTestUtils.NEW_YEAR_AI_SECTIONS;
assert(
  sections.map((section) => section.key).join(",") === "overview,wealth,romance,monthly,health",
  `new-year-ai sections should split by consultation domain, got: ${sections.map((s) => s.key).join(",")}`,
);
const sectionMinSum = sections.reduce((sum, section) => sum + section.minChars, 0);
const sectionMaxSum = sections.reduce((sum, section) => sum + section.maxChars, 0);
assert(sectionMinSum >= 15000, `section minChars sum should reach the 15k floor, got ${sectionMinSum}`);
assert(sectionMaxSum <= 24000, `section maxChars sum should stay under the 24k ceiling, got ${sectionMaxSum}`);
// 6개 카테고리 소제목은 빠짐없이 어느 한 분야 섹션이 책임져야 한다. 비면 그 이슈는 영원히 해소되지 않는다.
const categorySectionKey = route.__newYearAiTestUtils.NEW_YEAR_AI_CATEGORY_SECTION_KEY;
for (const category of ["love", "money", "career", "health", "relationship", "study"]) {
  assert(categorySectionKey[category], `category "${category}" should be owned by a section`);
}
// 각 분야 섹션 프롬프트가 그 분야의 명리 근거를 실제로 요구하는지.
const sectionPromptExpectations = {
  overview: ["조후", "억부", "**올해의 총운**"],
  wealth: ["재성", "관성", "**재물과 직업**", "**재물·수입**", "**직업·이직**"],
  romance: ["식상", "비겁", "인성", "**애정과 대인관계**", "**연애·재회**", "**가족·관계**"],
  monthly: ["1월부터 12월까지", "월주 간지"],
  health: ["오행", "개운법", "**건강과 개운법**", "**건강·멘탈**"],
};
for (const section of sections) {
  const sectionPrompt = route.__newYearAiTestUtils.buildFirstPrompt(normalized.input, fortuneData, section);
  for (const expected of sectionPromptExpectations[section.key] || []) {
    assert(sectionPrompt.includes(expected), `section "${section.key}" prompt should require "${expected}"`);
  }
}
// 사용자 질문에 대한 답변 소제목은 총운 하나만 쓴다(다섯 번 반복되면 분야 카드마다 같은 답이 붙는다).
const customQuestionInput = route.__newYearAiTestUtils.normalizeConsultationInput({
  ...validInput,
  focusArea: "custom",
  question: "이직해도 될까요?",
  hasCustomQuestion: true,
});
assert(customQuestionInput.ok === true, "custom question input should normalize");
const questionAnswerOwners = sections.filter((section) => route.__newYearAiTestUtils
  .buildFirstPrompt(customQuestionInput.input, fortuneData, section)
  .includes("반드시 소제목 **질문에 대한 답변**"));
assert(
  questionAnswerOwners.length === 1 && questionAnswerOwners[0].key === "overview",
  `only the overview section should own the question answer, got: ${questionAnswerOwners.map((s) => s.key).join(",")}`,
);

// 클라이언트: 분야별 구조화 응답을 쓰되 구버전 세션용 폴백 파서를 유지해야 한다.
assertIncludes(pageSourcePath, "serverSections", "client should consume the server section payload");
assertIncludes(pageSourcePath, "groupSectionsByDomain", "client should keep the legacy assembled-text fallback parser");
assertIncludes(pageSourcePath, "DOMAIN_CARDS", "client should render the domain consultation cards");
assertIncludes(pageSourcePath, "ReadingProgressPanel", "client should show generation progress");
assertIncludes(pageSourcePath, 'data-pdf-section={`domain-${card.key}`}', "domain cards should stay in the PDF capture set");
assertIncludes(pageSourcePath, "is-exporting", "client should force-reveal off-screen cards before PDF capture");
assertIncludes("worker/routes/new-year-ai.js", "publicSections", "result payload should expose per-domain sections");
assertIncludes("worker/routes/new-year-ai.js", "sections: generated.sections", "completed session should persist per-domain sections");

const systemPrompt = route.__newYearAiTestUtils.buildSystemPrompt();
assert(systemPrompt.includes("최고 수준의 명리학자"), "new-year-ai system prompt should strengthen expert saju voice");
assert(systemPrompt.includes("격국과 용신·기신, 조후, 대운의 배경"), "new-year-ai system prompt should include advanced saju lenses");
assert(systemPrompt.includes("완성 상담문 전체 본문은 공백을 제외하고 15,000자 이상 24,000자 이하"), "new-year-ai system prompt should require 15k-24k total chars");
assert(systemPrompt.includes("명리 전문가로서 격국·월령"), "new-year-ai system prompt should require expert part additions");

const mockConsultationText = route.__newYearAiTestUtils.buildMockConsultationText();
const mockQuality = route.__newYearAiTestUtils.validateConsultationQuality(mockConsultationText);
assert(mockQuality.ok === true, `mock consultation should pass quality gate: ${mockQuality.issues.join(", ")}`);
assert(mockQuality.totalChars >= 15000, "mock consultation should be at least 15k total chars");
assert(mockQuality.totalChars <= 24000, "mock consultation should stay under 24k total chars");
assert(mockQuality.sectionCount >= 6, "mock consultation should include enough substantial sections");
assert(mockQuality.missingTopics.length === 0, "mock consultation should cover all required expert topics");

const categoryCoveredText = `${mockConsultationText}\n\n**연애·재회**\n연애 재회 문단.\n\n**재물·수입**\n재물 수입 문단.\n\n**직업·이직**\n직업 이직 문단.\n\n**건강·멘탈**\n건강 멘탈 문단.\n\n**가족·관계**\n가족 관계 문단.\n\n**학업·성장**\n학업 성장 문단.`;
const categoryCoveredQuality = route.__newYearAiTestUtils.validateFortuneDataConsistency(categoryCoveredText, fortuneData);
assert(!categoryCoveredQuality.some((issue) => issue.startsWith("MISSING_CATEGORIES")), `text covering all 6 categories should not raise MISSING_CATEGORIES: ${categoryCoveredQuality.join(", ")}`);
const categoryMissingQuality = route.__newYearAiTestUtils.validateFortuneDataConsistency(mockConsultationText, fortuneData);
assert(categoryMissingQuality.some((issue) => issue.startsWith("MISSING_CATEGORIES")), "text missing category subsections should raise MISSING_CATEGORIES");

const mockSajuProfile = route.__newYearAiTestUtils.buildBasicSajuProfile({
  id: "nyai-test-session",
  accessType: "admin",
  status: "completed",
  year: normalized.input.targetYear,
  birthInfo: normalized.input.birthInfo,
  llmMeta: { fortuneData },
});
assert(mockSajuProfile?.pillars?.length === 4, "new-year-ai PDF saju profile should include four pillars");
assert(mockSajuProfile?.dayMaster, "new-year-ai PDF saju profile should include day master");
assert(mockSajuProfile?.targetYear?.pillar, "new-year-ai PDF saju profile should include target-year pillar");
assert(mockSajuProfile?.yongshin?.core, "new-year-ai PDF saju profile should include yongshin summary");

const messageHandlerSource = workerSource.slice(workerSource.indexOf("async function handleMessage"), workerSource.indexOf("export async function handleNewYearAiRoutes"));
assert(!messageHandlerSource.includes("generateConsultationText"), "new-year-ai message route should not generate follow-up LLM text");
assert(!messageHandlerSource.includes("callGeminiText"), "new-year-ai message route should not call the LLM gateway");

const missingYear = route.__newYearAiTestUtils.normalizeConsultationInput({ ...validInput, targetYear: "" });
assert(missingYear.ok === false && missingYear.message === "상담할 연도를 선택해 주세요.", "new-year-ai should reject missing targetYear");

const missingBirth = route.__newYearAiTestUtils.normalizeConsultationInput({ ...validInput, birthDate: "" });
assert(missingBirth.ok === false && missingBirth.message.includes("생년월일, 성별, 달력 기준"), "new-year-ai should reject missing birthDate before payment");

const customWithoutQuestion = route.__newYearAiTestUtils.normalizeConsultationInput({ ...validInput, focusArea: "custom", question: "" });
assert(customWithoutQuestion.ok === false && customWithoutQuestion.message.includes("직접 질문"), "new-year-ai should require question for custom focus");

const ensureResponse = await route.handleNewYearAiRoutes(new Request("https://code-destiny.test/api/new-year-ai/ensure-access", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Idempotency-Key": validInput.idempotencyKey,
  },
  body: JSON.stringify(validInput),
}), {});
const ensureBody = await ensureResponse.json();
assert(ensureResponse.status === 401, "ensure-access should require login without auth");
assert(ensureBody.reason === "LOGIN_REQUIRED", "ensure-access should return LOGIN_REQUIRED");
assert(ensureBody.message === "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.", "ensure-access should return the new login message");

const invalidResponse = await route.handleNewYearAiRoutes(new Request("https://code-destiny.test/api/new-year-ai/ensure-access", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Idempotency-Key": validInput.idempotencyKey,
  },
  body: JSON.stringify({ ...validInput, birthDate: "" }),
}), {});
const invalidBody = await invalidResponse.json();
assert(invalidResponse.status === 422, "ensure-access should reject invalid input before login/payment");
assert(invalidBody.reason === "INVALID_INPUT", "invalid ensure-access should return INVALID_INPUT");

const disabledMessageResponse = await route.handleNewYearAiRoutes(new Request("https://code-destiny.test/api/new-year-ai/message", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ sessionId: "nyai-test-session", message: "추가 질문 테스트" }),
}), {});
const disabledMessageBody = await disabledMessageResponse.json();
assert(disabledMessageResponse.status === 410, "message route should be disabled");
assert(disabledMessageBody.reason === "FOLLOW_UP_DISABLED", "message route should return FOLLOW_UP_DISABLED");

const oldResponse = await oldRoute.handleSajuNewYearRoutes(new Request("https://code-destiny.test/api/saju-new-year/create-job", {
  method: "POST",
}));
const oldBody = await oldResponse.json();
assert(oldResponse.status === 410, "old saju-new-year route should be replaced");
assert(oldBody.code === "NEW_YEAR_AI_REPLACED", "old saju-new-year route should not create jobs");

if (!process.exitCode) {
  console.log("[verify-new-year-ai-flow] ok");
}

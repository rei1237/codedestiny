#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function rel(file) {
  return path.join(root, file);
}

function read(file) {
  const full = rel(file);
  if (!fs.existsSync(full)) {
    failures.push(`missing file: ${file}`);
    return "";
  }
  return fs.readFileSync(full, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertIncludes(file, text, marker) {
  assert(text.includes(marker), `${file} missing marker: ${marker}`);
}

function assertNotIncludes(file, text, marker) {
  assert(!text.includes(marker), `${file} contains retired marker: ${marker}`);
}

const LIFE_BOOK_EXPECTED_CHAPTER_COUNT = 10;
const LIFE_BOOK_MIN_CHAPTER_CONTENT_CHARS = 700;
const LIFE_BOOK_MIN_TOTAL_CONTENT_CHARS = 10000;
const LIFE_BOOK_MAX_TOTAL_CONTENT_CHARS = 20000;

function mockChapterContent(chapterNumber, minLength) {
  const base = [
    `제${chapterNumber}장은 명식의 결이 삶에서 어떻게 드러나는지 차분히 비추는 상담문입니다.`,
    "일간의 기질과 계절의 온도, 오행의 균형, 십성의 움직임을 함께 살피며 지금 붙잡을 수 있는 선택을 풀어냅니다.",
    "말은 단정으로 기울지 않고, 사용자가 오늘의 생활에서 조정할 수 있는 리듬과 관계의 방향을 자연스럽게 짚습니다.",
  ].join(" ");
  return base.repeat(Math.ceil(minLength / base.length) + 1).slice(0, minLength);
}

function mockExpertContent(readingNumber, minLength) {
  const base = [
    `깊은 판독 ${readingNumber}은 일간과 월지, 오행과 조후, 십성의 움직임을 서로 엮어 삶의 결을 더 세밀하게 비춥니다.`,
    "부족한 기운을 억지로 채우기보다 생활 리듬과 선택의 순서를 조정하며, 대운과 세운이 열어 주는 때를 차분히 짚습니다.",
  ].join(" ");
  return base.repeat(Math.ceil(minLength / base.length) + 1).slice(0, minLength);
}

function buildMockLifeBookReport({ chapterLength = 850, expertLength = 500, chapterCount = LIFE_BOOK_EXPECTED_CHAPTER_COUNT, omitAdvice = false, omitExpertReadings = false } = {}) {
  return JSON.stringify({
    title: "인생의 책",
    subtitle: "타고난 사주와 시간의 흐름으로 읽는 삶의 장면",
    coreSummary: {
      oneLine: "삶의 중심 문장이 차분히 드러납니다.",
      lifeTheme: "균형과 선택의 흐름",
      strongestElement: "계산 기반",
      neededBalance: "생활 리듬",
    },
    chapters: Array.from({ length: chapterCount }, (_, index) => ({
      chapterNumber: index + 1,
      title: `인생의 장 ${index + 1}`,
      summary: `제${index + 1}장의 핵심이 한 문장으로 흐릅니다.`,
      content: mockChapterContent(index + 1, chapterLength),
      advice: omitAdvice ? [] : ["오늘의 선택을 작게 정리하세요.", "관계와 생활의 리듬을 무리 없이 조정하세요."],
    })),
    expertReadings: omitExpertReadings ? [] : Array.from({ length: 4 }, (_, index) => ({
      title: ["일간과 월지가 여는 중심 기질", "오행과 조후가 청하는 보완", "십성으로 읽는 관계와 일의 방식", "대운과 세운이 비추는 선택의 시기"][index],
      content: mockExpertContent(index + 1, expertLength),
      guidance: ["강한 기운은 쓰임을 분명히 하세요.", "부족한 기운은 생활의 순서로 보완하세요."],
    })),
    finalMessage: "당신의 다음 장은 조용하지만 분명하게 열립니다.",
  });
}

function getMockLifeBookQualityIssues(content) {
  const issues = [];
  let report = null;
  try {
    report = JSON.parse(content);
  } catch {
    return ["report_json_missing"];
  }
  const chapters = Array.isArray(report?.chapters) ? report.chapters : [];
  if (chapters.length !== LIFE_BOOK_EXPECTED_CHAPTER_COUNT) issues.push("chapter_count_mismatch");
  let totalContentLength = 0;
  chapters.forEach((chapter, index) => {
    const chapterNumber = index + 1;
    const summary = String(chapter?.summary || "").trim();
    const chapterContent = String(chapter?.content || "").trim();
    const advice = Array.isArray(chapter?.advice) ? chapter.advice.map((item) => String(item || "").trim()).filter(Boolean) : [];
    totalContentLength += chapterContent.length;
    if (!summary) issues.push(`chapter_${chapterNumber}_summary_missing`);
    if (!chapterContent) issues.push(`chapter_${chapterNumber}_content_missing`);
    if (chapterContent && chapterContent.length < LIFE_BOOK_MIN_CHAPTER_CONTENT_CHARS) issues.push(`chapter_${chapterNumber}_content_too_short`);
    if (!advice.length) issues.push(`chapter_${chapterNumber}_advice_missing`);
  });
  const expertReadings = Array.isArray(report?.expertReadings) ? report.expertReadings : [];
  expertReadings.forEach((reading, index) => {
    const readingNumber = index + 1;
    const title = String(reading?.title || "").trim();
    const readingContent = String(reading?.content || "").trim();
    const guidance = Array.isArray(reading?.guidance) ? reading.guidance.map((item) => String(item || "").trim()).filter(Boolean) : [];
    totalContentLength += readingContent.length;
    if (!title) issues.push(`expert_reading_${readingNumber}_title_missing`);
    if (!readingContent) issues.push(`expert_reading_${readingNumber}_content_missing`);
    if (readingContent && readingContent.length < 350) issues.push(`expert_reading_${readingNumber}_content_too_short`);
    if (readingContent && !guidance.length) issues.push(`expert_reading_${readingNumber}_guidance_missing`);
  });
  if (totalContentLength < LIFE_BOOK_MIN_TOTAL_CONTENT_CHARS) issues.push("total_content_too_short");
  if (totalContentLength > LIFE_BOOK_MAX_TOTAL_CONTENT_CHARS) issues.push("total_content_too_long");
  return issues;
}

const passingMockIssues = getMockLifeBookQualityIssues(buildMockLifeBookReport({ chapterLength: 850, expertLength: 500 }));
assert(passingMockIssues.length === 0, `life-book-ai mock quality should pass: ${passingMockIssues.join(", ")}`);

const passingMockReport = JSON.parse(buildMockLifeBookReport({ chapterLength: 850, expertLength: 500 }));
const passingMockLength = [
  ...passingMockReport.chapters.map((chapter) => chapter.content),
  ...passingMockReport.expertReadings.map((reading) => reading.content),
].join("").length;
assert(passingMockLength >= LIFE_BOOK_MIN_TOTAL_CONTENT_CHARS, "life-book-ai mock quality should be at least 10000 chars");
assert(passingMockLength <= LIFE_BOOK_MAX_TOTAL_CONTENT_CHARS, "life-book-ai mock quality should stay within 20000 chars");

const shortMockIssues = getMockLifeBookQualityIssues(buildMockLifeBookReport({ chapterLength: 650, omitExpertReadings: true }));
assert(shortMockIssues.includes("total_content_too_short"), "life-book-ai mock quality should block total content under 10000 chars");
assert(shortMockIssues.includes("chapter_1_content_too_short"), "life-book-ai mock quality should block shallow chapter content");

const longMockIssues = getMockLifeBookQualityIssues(buildMockLifeBookReport({ chapterLength: 2000, expertLength: 500 }));
assert(longMockIssues.includes("total_content_too_long"), "life-book-ai mock quality should block total content over 20000 chars");

const indexHtml = read("index.html");
const client = read("app/life-book-ai/LifeBookAiClient.tsx");
const resultPage = read("app/life-book-ai/result/page.tsx");
const route = read("worker/routes/life-book-ai.js");
const workerIndex = read("worker/index.js");
const models = read("worker/lib/models.js");
const saju = read("worker/lib/life-book-ai-saju.js");

assertIncludes("index.html", indexHtml, 'href="/life-book-ai"');
assertIncludes("index.html", indexHtml, "cd-preparing-badge");
assertNotIncludes("index.html", indexHtml, 'data-action="openLifeBookModal"');
assertNotIncludes("index.html", indexHtml, 'id="lifeBookModal"');
assertNotIncludes("index.html", indexHtml, "/js/life-book.js");

for (const marker of [
  "/api/life-book-ai/prepare",
  "/api/life-book-ai/generate",
  'serviceType: FEATURE_KEY',
  'consultationType: "lifeBook"',
  "focusArea",
  "runBillingCoinGate",
  "deferUsage: true",
  "usagePolicy: \"apply_after_success\"",
  "buildResultUrl",
  "window.open(pendingUrl, \"_blank\")",
  "인생의 책 생성하기",
  "완성된 인생의 책 열기",
  "[LifeBook AI Page Enter]",
  "[LifeBook AI Initial Render Success]",
  "[LifeBook AI Submit Start]",
  "[LifeBook AI Payment Success]",
]) {
  assertIncludes("app/life-book-ai/LifeBookAiClient.tsx", client, marker);
}

for (const marker of [
  "/api/premium/saju-lifebook",
  "/api/lifebook/prepare",
  "create-job",
  "generate-mock",
  "lbProgress",
  "lbChapterContent",
  "requestPayment",
  "portone_redirect",
  "/api/life-book-ai/start\"",
  "/api/life-book-ai/ensure-access\"",
  "/api/life-book-ai/message",
  "openPaidFeatureGate",
  "paymentMode: \"pass\"",
  "sendFollowUp",
  "splitLifeBookSections",
  "question",
  "상담 주제",
  "자유 질문",
  "직접 질문",
]) {
  assertNotIncludes("app/life-book-ai/LifeBookAiClient.tsx", client, marker);
}

for (const marker of [
  "useSearchParams",
  "authFetch(`/api/life-book-ai/result?attemptId=",
  "pending",
  "html2canvas",
  "jspdf",
  "[data-life-book-pdf-page]",
  "empty_pdf_capture",
  "expertReadings",
  "명식의 깊은 판독",
  "기본 명식",
  "life-book-reading-",
  "CANONICAL_TEN_GODS",
  "PDF로 저장하기",
  "새로운 인생의 책 만들기",
]) {
  assertIncludes("app/life-book-ai/result/page.tsx", resultPage, marker);
}

assertIncludes("worker/index.js", workerIndex, '"/api/life-book-ai"');
assertIncludes("worker/index.js", workerIndex, "handleLifeBookAiRoutes");
assertNotIncludes("worker/index.js", workerIndex, "handleSajuLifebookRoutes");
assertNotIncludes("worker/index.js", workerIndex, "routes/saju-lifebook.js");

for (const marker of [
  "handleEnsureAccess",
  "handleStart",
  "handleResult",
  "path === \"/prepare\"",
  "path === \"/generate\"",
  "path === \"/ensure-access\"",
  "path === \"/start\"",
  "path === \"/result\"",
  "path.startsWith(\"/result/\")",
  "serviceType",
  "consultationType",
  "focusArea",
  "calculateLifeBookAiSaju",
  "callGeminiText",
  "extractReportJson",
  "reportJson",
  "CANONICAL_TEN_GODS",
  "const LIFE_BOOK_MIN_CHAPTER_CONTENT_CHARS = 700;",
  "const LIFE_BOOK_MIN_TOTAL_CONTENT_CHARS = 10000;",
  "const LIFE_BOOK_MAX_TOTAL_CONTENT_CHARS = 20000;",
  "MOCK_PROVIDER_BLOCKED",
  "LIFE_BOOK_MIN_TOTAL_CONTENT_CHARS",
  "LIFE_BOOK_MAX_TOTAL_CONTENT_CHARS",
  "expertReadings",
  "10,000자 이상 20,000자 이하",
  "리포트 강조 영역",
  "finalizeDeferredBillingUsage",
  "cancelDeferredBillingUsage",
  "restoreBillingGateAccessOnFailure",
  "applyUsageOnce",
  "PAYMENT_REQUIRED",
  "LOGIN_REQUIRED",
  "INVALID_INPUT",
  "[LifeBook AI ${marker}]",
  'logLifeBookAi("LLM Prepare Start"',
  'logLifeBookAi("LLM Payload Received"',
  'logLifeBookAi("LLM Payload Validated"',
  'logLifeBookAi("LLM Access Check Start"',
  'logLifeBookAi("LLM Access Check Success"',
  'logLifeBookAi("Payment Required"',
  'logLifeBookAi("LLM Generate Start"',
  'logLifeBookAi("LLM Provider Selected"',
  'logLifeBookAi("LLM Generate Success"',
  'logLifeBookAi("LLM Error"',
  'logLifeBookAi("Refund Or Restore"',
  'logLifeBookAi("Pass Consumed"',
]) {
  assertIncludes("worker/routes/life-book-ai.js", route, marker);
}

for (const marker of [
  "/api/premium/saju-lifebook",
  "/api/lifebook/prepare",
  "create-job",
  "generate-mock",
  "fetchPortOnePayment",
  "getPortOnePublicConfig",
  "requestPayment",
  "portone_redirect",
  "/api/life-book-ai/message",
  "handleMessage",
  "buildFollowUpPrompt",
  "question",
  "customQuestionRequired",
  "직접 질문",
]) {
  assertNotIncludes("worker/routes/life-book-ai.js", route, marker);
}

assertIncludes("worker/lib/models.js", models, "lifeBookAiConsultationSchema");
assertIncludes("worker/lib/models.js", models, 'collection: "lifeBookAiConsultations"');
assertIncludes("worker/lib/life-book-ai-saju.js", saju, "yearPillar");
assertIncludes("worker/lib/life-book-ai-saju.js", saju, "fiveElements");
assertIncludes("worker/lib/life-book-ai-saju.js", saju, "tenGods");
assertIncludes("worker/lib/life-book-ai-saju.js", saju, "majorLuck");

if (failures.length) {
  console.error("[verify-life-book-ai-flow] FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("[verify-life-book-ai-flow] PASS");

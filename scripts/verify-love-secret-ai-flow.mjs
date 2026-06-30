#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";

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

async function importLocalEsm(file) {
  const source = read(file);
  const encoded = Buffer.from(source, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

function textLength(value) {
  return String(value || "").trim().length;
}

function sectionBodyLength(sections = []) {
  return sections.reduce((sum, section) => sum + textLength(section?.body), 0);
}

const qualitySectionTitles = [
  "현재 관계의 자리와 질문의 핵심",
  "나의 명식이 사랑에서 반복하는 방식",
  "상대의 기운과 감정 거리감",
  "두 사람 사이 끌림이 살아나는 조건",
  "오행과 조후로 보는 감정의 온도",
  "십성으로 보는 애착과 표현 방식",
  "속궁합과 친밀감 리듬",
  "갈등의 뿌리와 회복 방식",
  "연락/고백/재회/관계 진전 타이밍",
  "관계 단계별 실행 비책",
  "상대에게 다가가는 대화 문장",
  "피해야 할 선택과 자기 보호",
  "7일 실천 가이드",
  "30일 관계 흐름 처방",
  "마지막 상담사의 한마디",
];

function buildQualityBody(title, index) {
  const tones = ["천천히", "분명하게", "부드럽게", "깊게", "현실적으로", "따뜻하게"];
  return Array.from({ length: 3 }, (_, paragraphIndex) => {
    const tone = tones[(index + paragraphIndex) % tones.length];
    return `${title}에서는 ${tone} 드러나는 마음의 결을 먼저 살핍니다. 사용자의 질문은 관계가 어디에서 멈추고 어디에서 다시 열리는지를 묻고 있으므로, 이 대목은 감정의 속도와 실제 행동 사이의 간격을 함께 비춥니다. 명식의 기운은 사랑에서 표현 방식, 기다리는 힘, 가까워지는 리듬으로 나타나며, 지금은 서두른 결론보다 서로의 반응을 안정적으로 확인하는 태도가 더 크게 살아납니다. 상대의 마음은 단정하기보다 말투, 약속을 지키는 정도, 갈등 뒤의 회복 속도에서 읽어야 하고, 사용자는 자신의 불안을 곧바로 행동으로 옮기기보다 하루 정도 눌러 둔 뒤 차분한 문장으로 전하는 편이 좋습니다.`;
  }).join("\n\n");
}

function buildQualityFixture() {
  const sections = qualitySectionTitles.map((title, index) => ({
    title,
    body: buildQualityBody(title, index),
  }));
  return {
    keywords: ["마음의 온도", "관계 리듬", "사랑의 선택"],
    strategy: "지금은 불안을 앞세우기보다 관계의 반응을 차분히 확인하며 대화의 온도를 낮추는 흐름이 좋습니다.",
    summaryTitle: "마음의 결을 다시 맞추는 사랑의 흐름",
    oneLineDiagnosis: "이 관계는 끌림보다 속도 조율이 더 중요한 시기에 머물러 있습니다.",
    relationshipTemperature: "감정은 살아 있지만 표현의 속도가 서로 다르게 흐릅니다.",
    relationshipCore: sections[0].body,
    userLovePattern: sections[1].body,
    partnerLovePattern: sections[2].body,
    attractionCondition: sections[3].body,
    compatibilityFlow: sections[3].body,
    fiveElementsInsight: sections[4].body,
    tenGodsAttachmentPattern: sections[5].body,
    johuIntimacyRhythm: sections[6].body,
    conflictPattern: sections[7].body,
    timingAdvice: sections[8].body,
    stageActionSecrets: sections[9].body,
    communicationAdvice: sections[10].body,
    selfProtectionBoundary: sections[11].body,
    actionSecrets: [
      "오늘은 답을 재촉하지 말고 질문을 하나만 남깁니다.",
      "감정이 올라오는 시간에는 바로 연락하지 않고 문장을 한 번 다듬습니다.",
      "상대의 반응보다 내가 지킬 태도를 먼저 정합니다.",
      "관계의 온도가 낮아질 때는 설명보다 안정된 반복을 보여 줍니다.",
      "고백이나 재회 이야기는 서로의 생활 리듬이 맞을 때 꺼냅니다.",
    ],
    sevenDayGuide: [
      "첫날은 마음의 불안을 적고 보내지 않을 말을 덜어냅니다.",
      "둘째 날은 상대가 편히 답할 수 있는 짧은 안부를 고릅니다.",
      "셋째 날은 관계에서 반복된 오해의 지점을 한 가지로 좁힙니다.",
      "넷째 날은 상대의 반응을 해석하기보다 있는 그대로 둡니다.",
      "다섯째 날은 내 생활 리듬을 회복하는 약속을 하나 지킵니다.",
      "여섯째 날은 다음 대화에서 피해야 할 표현을 정리합니다.",
      "일곱째 날은 관계를 이어 갈 기준과 멈출 기준을 나란히 세웁니다.",
    ],
    thirtyDayFlow: sections[13].body,
    sections,
    pdfSections: sections,
    finalMessage: "사랑은 급히 붙잡을수록 흐려지고, 정직하게 바라볼수록 다시 길을 드러냅니다.",
    finalLine: "오늘은 마음의 결론보다 말의 온도를 먼저 고르세요.",
    answer: sections.map((section) => `${section.title}\n${section.body}`).join("\n\n"),
  };
}

const legacyLoveSecretSlug = ["love", "secret"].join("-");

for (const file of [
  `js/${legacyLoveSecretSlug}-v2.js`,
  `js/${legacyLoveSecretSlug}-service.js`,
  `app/_lib/${legacyLoveSecretSlug}/report-types.ts`,
  `worker/routes/saju-${legacyLoveSecretSlug}.js`,
  `worker/lib/pdf-v2/${legacyLoveSecretSlug}/create-${legacyLoveSecretSlug}-premium-pdf-job.js`,
  `worker/lib/pdf-v2/${legacyLoveSecretSlug}/generate-${legacyLoveSecretSlug}-premium-report.js`,
  `worker/lib/pdf-v2/${legacyLoveSecretSlug}/${legacyLoveSecretSlug}-premium.chapter-plan.js`,
  `worker/lib/pdf-v2/${legacyLoveSecretSlug}/${legacyLoveSecretSlug}-premium.prompt-pack.js`,
  `worker/lib/pdf-v2/${legacyLoveSecretSlug}/${legacyLoveSecretSlug}-premium.validator.js`,
  `scripts/verify-${legacyLoveSecretSlug}-llm-engine.mjs`,
]) {
  assert(!fs.existsSync(rel(file)), `retired file still exists: ${file}`);
}

const indexHtml = read("index.html");
const pageSourcePath = fs.existsSync(rel("app/love-secret-ai/LoveSecretAiClient.tsx"))
  ? "app/love-secret-ai/LoveSecretAiClient.tsx"
  : "app/love-secret-ai/page.tsx";
const page = read(pageSourcePath);
const resultPage = read("app/love-secret-ai/result/page.tsx");
const route = read("worker/routes/love-secret-ai.js");
const workerIndex = read("worker/index.js");
const models = read("worker/lib/models.js");
const registry = read("worker/lib/paid-feature-registry.js");
const calc = read("worker/lib/love-secret-ai-calculation.js");
const prompt = read("worker/lib/love-secret-ai-prompt.js");
const appChrome = read("app/components/AppChrome.tsx");

assertIncludes("index.html", indexHtml, 'data-cd-marker="love-secret-ai-entry-v20260627"');
assertIncludes("index.html", indexHtml, 'data-action="goLoveSecretAi"');
assertIncludes("index.html", indexHtml, 'data-service-detail-href="/love-secret-ai"');
assertNotIncludes("index.html", indexHtml, `/js/${legacyLoveSecretSlug}-v2.js`);
assertNotIncludes("index.html", indexHtml, 'id="loveSecretModal"');
assertNotIncludes("index.html", indexHtml, "love-secret-pdf");

for (const marker of [
  "/api/love-secret-ai/prepare",
  "/api/love-secret-ai/generate",
  "runBillingCoinGate",
  "LoveSecretGeneratingCard",
  "연애 비책 상담 시작하기",
  "/love-secret-ai/result",
]) {
  assertIncludes(pageSourcePath, page, marker);
}
for (const marker of [
  "requestPortOnePayment",
  "loadPaidServiceRuntimeGate",
  "_cdChooseServicePaymentMode",
  "/api/love-secret/prepare",
  "create-job",
  "chapter",
]) {
  assertNotIncludes(pageSourcePath, page, marker);
}
for (const marker of [
  "/api/love-secret-ai/result",
  "PDF로 저장하기",
  "love-secret-reading-",
  "LoveSecretResultSection",
  "LoveSecretSajuSummary",
  "연애 명식 기초",
  "html2canvas",
  "jspdf",
  "consultation?.pdfSections?.length ? consultation.pdfSections : consultation?.sections",
]) {
  assertIncludes("app/love-secret-ai/result/page.tsx", resultPage, marker);
}

for (const marker of [
  "handleEnsureAccess",
  "handleStart",
  "handleResult",
  "handleMessage",
  'path === "/result"',
  'path.startsWith("/result/")',
  'path === "/prepare"',
  'path === "/generate"',
  'path === "/ensure-access"',
  'path === "/start"',
  "resolveBillingUsageEvidence",
  "refundBillingGateMonthlyCredit",
  "restoreBillingGateAccessOnFailure",
  "love-secret-ai-consultation",
  "attemptId",
]) {
  assertIncludes("worker/routes/love-secret-ai.js", route, marker);
}
for (const marker of [
  "generateLoveSecretPremiumPdfV2",
  "pdf-v2/love-secret",
  "/api/love-secret/prepare",
  "create-job",
]) {
  assertNotIncludes("worker/routes/love-secret-ai.js", route, marker);
}

assertIncludes("worker/index.js", workerIndex, '"/api/love-secret-ai"');
assertIncludes("worker/index.js", workerIndex, "handleLoveSecretAiRoutes");
assertNotIncludes("worker/index.js", workerIndex, "handleSajuLoveSecretRoutes");
assertNotIncludes("worker/index.js", workerIndex, "routes/saju-love-secret.js");

assertIncludes("worker/lib/models.js", models, "loveSecretAiConsultationSchema");
assertIncludes("worker/lib/models.js", models, 'collection: "loveSecretAiConsultations"');
assertIncludes("worker/lib/paid-feature-registry.js", registry, '"love-secret-ai-consultation"');
assertIncludes("worker/lib/love-secret-ai-calculation.js", calc, "buildSajuProfile");
assertIncludes("worker/lib/love-secret-ai-calculation.js", calc, "calculateLoveSecretAiSaju");
assertIncludes("worker/lib/love-secret-ai-calculation.js", calc, "속궁합과 친밀감 리듬");
assertNotIncludes("worker/lib/love-secret-ai-calculation.js", calc, "pdf-v2");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "LOVE_SECRET_AI_SYSTEM_PROMPT");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "parseFirstConsultationResponse");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "johuIntimacyRhythm");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "pdfSections");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "전체 상담 본문은 sections의 모든 body를 합산해 10,000~20,000자 사이");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "나의 명식이 사랑에서 반복하는 방식");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "십성으로 보는 애착과 표현 방식");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "30일 관계 흐름 처방");
assertIncludes("worker/routes/love-secret-ai.js", route, "maxOutputTokens: 14000");
assertIncludes("worker/routes/love-secret-ai.js", route, "sajuSummary: publicSajuSummary");
assertIncludes("worker/routes/love-secret-ai.js", route, "publicChartSummary");
assertIncludes("app/components/AppChrome.tsx", appChrome, '"/love-secret-ai"');

const promptModule = await importLocalEsm("worker/lib/love-secret-ai-prompt.js");
const qualityFixture = buildQualityFixture();
const parsedQualityResult = promptModule.parseFirstConsultationResponse(JSON.stringify(qualityFixture));
const parsedPdfBodyChars = sectionBodyLength(parsedQualityResult.pdfSections);
const parsedTitles = new Set(parsedQualityResult.pdfSections.map((section) => section.title));
assert(parsedQualityResult.sections.length >= 12, "mock quality result must preserve expert section count");
for (const title of ["나의 명식이 사랑에서 반복하는 방식", "십성으로 보는 애착과 표현 방식", "피해야 할 선택과 자기 보호", "30일 관계 흐름 처방"]) {
  assert(parsedTitles.has(title), `mock quality result missing expert section: ${title}`);
}
assert(parsedPdfBodyChars >= promptModule.LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS, `mock quality result body too short: ${parsedPdfBodyChars}`);
assert(parsedPdfBodyChars <= promptModule.LOVE_SECRET_AI_MAX_TOTAL_BODY_CHARS, `mock quality result body too long: ${parsedPdfBodyChars}`);
assert(
  promptModule.countLoveSecretConsultationBodyChars(parsedQualityResult) >= promptModule.LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS,
  "mock quality result total body length must be at least 10000 chars",
);
assert(
  !promptModule.__loveSecretAiPromptTestUtils.hasForbiddenResultText(qualityFixture.answer),
  "mock quality result contains forbidden product/system wording",
);
assert(
  !promptModule.__loveSecretAiPromptTestUtils.hasUnsafeAdvice(qualityFixture.answer),
  "mock quality result contains unsafe relationship advice",
);
try {
  promptModule.parseFirstConsultationResponse(JSON.stringify({
    ...qualityFixture,
    sections: qualityFixture.sections.slice(0, 8).map((section) => ({ ...section, body: section.body.slice(0, 120) })),
    pdfSections: qualityFixture.pdfSections.slice(0, 8).map((section) => ({ ...section, body: section.body.slice(0, 120) })),
    answer: "마음의 온도를 차분히 확인하세요.",
  }));
  assert(false, "short mock quality result should be rejected");
} catch (error) {
  assert(error?.code === "INCOMPLETE_LLM_RESPONSE", `short mock quality result rejected with unexpected code: ${error?.code || error}`);
}
try {
  const longSections = qualityFixture.sections.map((section) => ({ ...section, body: `${section.body}\n\n${section.body}` }));
  promptModule.parseFirstConsultationResponse(JSON.stringify({
    ...qualityFixture,
    sections: longSections,
    pdfSections: longSections,
    answer: longSections.map((section) => `${section.title}\n${section.body}`).join("\n\n"),
  }));
  assert(false, "overlong mock quality result should be rejected");
} catch (error) {
  assert(error?.code === "INCOMPLETE_LLM_RESPONSE", `overlong mock quality result rejected with unexpected code: ${error?.code || error}`);
}

if (failures.length) {
  console.error("[verify-love-secret-ai-flow] FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`[verify-love-secret-ai-flow] mock body chars: ${parsedPdfBodyChars}`);
console.log("[verify-love-secret-ai-flow] PASS");

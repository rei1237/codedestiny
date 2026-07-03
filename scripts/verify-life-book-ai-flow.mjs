#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const failures = [];

const LIFE_FORTUNE_CHAPTER_TITLES = [
  "타고난 명식의 중심",
  "성격과 마음의 결",
  "재능과 일의 방향",
  "재물과 생활 기반",
  "사랑과 인연의 흐름",
  "관계와 가족의 장",
  "건강과 생활 리듬",
  "대운으로 보는 큰 전환",
  "가까운 세운의 흐름",
  "앞으로 열릴 선택",
];
const LIFE_FORTUNE_MIN_CHAPTER_CONTENT_CHARS = 2400;
const LIFE_FORTUNE_MIN_EXPERT_READING_CONTENT_CHARS = 1200;
const LIFE_FORTUNE_MIN_TOTAL_CONTENT_CHARS = 30000;
const LIFE_FORTUNE_MAX_TOTAL_CONTENT_CHARS = 60000;
const LIFE_FORTUNE_EVIDENCE_REF_ROOTS = [
  "yearPillar",
  "monthPillar",
  "dayPillar",
  "hourPillar",
  "dayMaster",
  "pillarDetails",
  "fiveElements",
  "tenGods",
  "tenGodsByPillar",
  "seasonalBalance",
  "natalInteractions",
  "relationSummary",
  "majorLuck",
  "yearlyLuck",
  "fortuneFacts",
  "interpretationPlan",
  "usefulGod",
  "strength",
];
const CHAPTER_EVIDENCE_REFS = [
  ["dayMaster", "monthPillar", "seasonalBalance"],
  ["dayMaster", "tenGodsByPillar.day", "tenGods"],
  ["tenGods", "tenGodsByPillar.month", "fortuneFacts.strongestTenGods"],
  ["tenGods", "fiveElements", "usefulGod"],
  ["pillarDetails.day", "natalInteractions", "tenGodsByPillar"],
  ["pillarDetails.year", "pillarDetails.month", "relationSummary"],
  ["seasonalBalance", "fiveElements", "strength"],
  ["majorLuck.currentCycle", "majorLuck.cycles", "majorLuck.direction"],
  ["yearlyLuck", "majorLuck.currentCycle", "yearlyLuck.natalInteractions"],
  ["fortuneFacts", "interpretationPlan", "usefulGod"],
];

function read(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    failures.push(`missing file: ${file}`);
    return "";
  }
  return fs.readFileSync(full, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function includes(file, text, marker) {
  assert(text.includes(marker), `${file} missing marker: ${marker}`);
}

function excludes(file, text, marker) {
  assert(!text.includes(marker), `${file} contains retired marker: ${marker}`);
}

function repeatedText(seed, minLength) {
  const text = [
    seed,
    "일간과 월지, 오행과 조후, 십성의 작동을 함께 살피며 삶에서 드러나는 선택의 리듬을 차분히 짚습니다.",
    "대운과 세운이 열어 주는 때를 근거로 삼고, 관계와 일과 재물의 흐름을 무리 없이 조정할 방향을 남깁니다.",
  ].join(" ");
  return text.repeat(Math.ceil(minLength / text.length) + 1).slice(0, minLength);
}

function buildMockLifeFortuneReport({ chapterLength = 2550, expertLength = 1300, title = "인생 총운", chapterCount = 10 } = {}) {
  return JSON.stringify({
    title,
    subtitle: "타고난 명식과 시간의 흐름으로 읽는 삶의 큰 방향",
    coreSummary: {
      oneLine: "삶의 큰 줄기가 조용히 드러납니다.",
      lifeTheme: "균형과 전환",
      strongestElement: "계산 기반",
      neededBalance: "생활 리듬",
    },
    chapters: Array.from({ length: chapterCount }, (_, index) => ({
      chapterNumber: index + 1,
      title: LIFE_FORTUNE_CHAPTER_TITLES[index] || `인생 총운 ${index + 1}`,
      summary: `${index + 1}장의 핵심 흐름이 한 문장으로 머무릅니다.`,
      content: repeatedText(`${index + 1}장은 ${LIFE_FORTUNE_CHAPTER_TITLES[index] || "삶의 흐름"}을 깊게 비춥니다.`, chapterLength),
      advice: ["오늘 붙잡을 선택을 작게 정리하세요.", "관계와 생활의 리듬을 서두르지 말고 조정하세요.", "대운과 세운의 흐름에 맞춰 우선순위를 다시 세우세요."],
      evidenceRefs: CHAPTER_EVIDENCE_REFS[index] || ["fortuneFacts", "interpretationPlan", "usefulGod"],
    })),
    expertReadings: Array.from({ length: 4 }, (_, index) => ({
      title: ["일간과 월지가 여는 중심 기질", "오행과 조후가 청하는 보완", "십성으로 읽는 관계와 일의 방식", "대운과 세운이 비추는 선택의 시기"][index],
      content: repeatedText(`깊은 판독 ${index + 1}은 계산된 명식의 근거를 더 세밀하게 펼칩니다.`, expertLength),
      guidance: ["강한 기운은 쓰임을 분명히 하세요.", "부족한 기운은 생활의 순서로 보완하세요."],
      evidenceRefs: [["dayMaster", "seasonalBalance"], ["fiveElements", "usefulGod"], ["tenGods", "tenGodsByPillar"], ["majorLuck", "yearlyLuck"]][index],
    })),
    finalMessage: "당신의 다음 장은 조용하지만 분명하게 열립니다.",
  });
}

function lifeFortuneQualityIssues(content) {
  const issues = [];
  let report = null;
  try {
    report = JSON.parse(content);
  } catch {
    return ["report_json_missing"];
  }
  if (!String(report?.title || "").includes("인생 총운")) issues.push("life_fortune_title_missing");

  const chapters = Array.isArray(report?.chapters) ? report.chapters : [];
  if (chapters.length !== 10) issues.push("chapter_count_mismatch");

  let total = 0;
  chapters.forEach((chapter, index) => {
    const number = index + 1;
    const title = String(chapter?.title || "");
    const summary = String(chapter?.summary || "").trim();
    const body = String(chapter?.content || "").trim();
    const advice = Array.isArray(chapter?.advice) ? chapter.advice.filter(Boolean) : [];
    total += body.length;
    if (!title.includes(LIFE_FORTUNE_CHAPTER_TITLES[index] || "")) issues.push(`chapter_${number}_title_mismatch`);
    if (!hasValidEvidenceRefs(chapter?.evidenceRefs, 3)) issues.push(`chapter_${number}_evidence_refs_missing`);
    if (!summary) issues.push(`chapter_${number}_summary_missing`);
    if (body.length < LIFE_FORTUNE_MIN_CHAPTER_CONTENT_CHARS) issues.push(`chapter_${number}_content_too_short`);
    if (advice.length < 3) issues.push(`chapter_${number}_advice_missing`);
  });

  const expertReadings = Array.isArray(report?.expertReadings) ? report.expertReadings : [];
  if (expertReadings.length < 4) issues.push("expert_reading_count_too_short");
  expertReadings.forEach((reading, index) => {
    const number = index + 1;
    const title = String(reading?.title || "").trim();
    const body = String(reading?.content || "").trim();
    total += body.length;
    if (!hasValidEvidenceRefs(reading?.evidenceRefs, 2)) issues.push(`expert_reading_${number}_evidence_refs_missing`);
    if (!title) issues.push(`expert_reading_${number}_title_missing`);
    if (body.length < LIFE_FORTUNE_MIN_EXPERT_READING_CONTENT_CHARS) issues.push(`expert_reading_${number}_content_too_short`);
  });

  if (total < LIFE_FORTUNE_MIN_TOTAL_CONTENT_CHARS) issues.push("total_content_too_short");
  if (total > LIFE_FORTUNE_MAX_TOTAL_CONTENT_CHARS) issues.push("total_content_too_long");
  return issues;
}

function hasValidEvidenceRefs(refs, minCount) {
  const list = Array.isArray(refs) ? refs.map((item) => String(item || "").trim()).filter(Boolean) : [];
  if (list.length < minCount) return false;
  return list.every((ref) => LIFE_FORTUNE_EVIDENCE_REF_ROOTS.includes(ref.split(".")[0]));
}

const indexHtml = read("index.html");
const premiumClient = read("app/premium-unlock/PremiumSalesContent.tsx");
const premiumPage = read("app/premium-unlock/page.tsx");
const route = read("worker/routes/life-book-ai.js");
const workerIndex = read("worker/index.js");
const models = read("worker/lib/models.js");
const saju = read("worker/lib/life-book-ai-saju.js");
const { calculateLifeBookAiSaju } = await import(pathToFileURL(path.join(root, "worker/lib/life-book-ai-saju.js")).href);

const passingMock = buildMockLifeFortuneReport();
const passingIssues = lifeFortuneQualityIssues(passingMock);
assert(passingIssues.length === 0, `lifeFortune 30000+ mock should pass: ${passingIssues.join(", ")}`);
assert(lifeFortuneQualityIssues(buildMockLifeFortuneReport({ chapterLength: 2200 })).includes("chapter_1_content_too_short"), "lifeFortune should block shallow chapters");
assert(lifeFortuneQualityIssues(buildMockLifeFortuneReport({ chapterLength: 2200, expertLength: 800 })).includes("total_content_too_short"), "lifeFortune should block reports under 30000 chars");
assert(lifeFortuneQualityIssues(buildMockLifeFortuneReport({ chapterLength: 6200, expertLength: 1300 })).includes("total_content_too_long"), "lifeFortune should block reports over 60000 chars");
assert(lifeFortuneQualityIssues(buildMockLifeFortuneReport({ title: "인생의 책" })).includes("life_fortune_title_missing"), "lifeFortune should require title with 인생 총운");
const missingEvidenceMock = JSON.parse(buildMockLifeFortuneReport());
missingEvidenceMock.chapters[0].evidenceRefs = [];
assert(lifeFortuneQualityIssues(JSON.stringify(missingEvidenceMock)).includes("chapter_1_evidence_refs_missing"), "lifeFortune should block chapters without evidenceRefs");
const invalidEvidenceMock = JSON.parse(buildMockLifeFortuneReport());
invalidEvidenceMock.expertReadings[0].evidenceRefs = ["invented.path", "dayMaster"];
assert(lifeFortuneQualityIssues(JSON.stringify(invalidEvidenceMock)).includes("expert_reading_1_evidence_refs_missing"), "lifeFortune should block invented evidenceRefs");

const mockSaju = calculateLifeBookAiSaju({
  name: "테스트",
  gender: "male",
  birthDate: "1990-05-15",
  birthTime: "08:30",
  birthTimeUnknown: false,
  calendarType: "solar",
});
for (const marker of ["yearPillar", "monthPillar", "dayPillar", "hourPillar", "dayMaster"]) {
  assert(Boolean(mockSaju?.[marker]), `lifeFortune saju mock missing ${marker}`);
}
assert(Boolean(mockSaju?.seasonalBalance?.monthBranch), "lifeFortune saju mock must include seasonalBalance");
assert(Boolean(mockSaju?.tenGodsByPillar?.month?.stemTenGod), "lifeFortune saju mock must include positional ten gods");
assert(Boolean(mockSaju?.natalInteractions?.branchClashes), "lifeFortune saju mock must include natal interactions");
assert(Boolean(mockSaju?.relationSummary?.mainPattern), "lifeFortune saju mock must include relation summary");
assert(Boolean(mockSaju?.fortuneFacts?.readingBase?.dayMaster), "lifeFortune saju mock must include fortuneFacts");
assert(Array.isArray(mockSaju?.interpretationPlan) && mockSaju.interpretationPlan.length === 10, "lifeFortune saju mock must include chapter interpretation plan");
assert(mockSaju?.majorLuck?.available === true && Array.isArray(mockSaju.majorLuck.cycles) && mockSaju.majorLuck.cycles.length >= 10, "lifeFortune saju mock must include major luck cycles");
assert(Array.isArray(mockSaju?.yearlyLuck) && mockSaju.yearlyLuck.length >= 5, "lifeFortune saju mock must include yearly luck");

includes("index.html", indexHtml, 'href="/premium-unlock"');
includes("index.html", indexHtml, "life-fortune-ai-vvip-card-v20260701");
includes("index.html", indexHtml, 'data-pvw-bypass="1"');
includes("index.html", indexHtml, "AI 상담 · 입력 후 이용권 확인");
const lifeFortuneCardStart = indexHtml.indexOf("tarot-tile--life-fortune-ai");
const lifeFortuneCardEnd = indexHtml.indexOf("</a>", lifeFortuneCardStart);
const lifeFortuneCard = lifeFortuneCardStart >= 0 && lifeFortuneCardEnd > lifeFortuneCardStart
  ? indexHtml.slice(lifeFortuneCardStart, lifeFortuneCardEnd)
  : "";
assert(lifeFortuneCard && !lifeFortuneCard.includes('data-coin-cost="300"'), "life fortune card must not hardcode coin cost");
assert(lifeFortuneCard && !lifeFortuneCard.includes("AI 상담 · 30,000원"), "life fortune card must not hardcode KRW price");

for (const marker of [
  'const CONSULTATION_TYPE = "lifeFortune"',
  'const MAX_POLL_DURATION_MS = 8 * 60 * 1000',
  'const startLockRef = useRef(false);',
  'function postPrepare',
  'function postGenerate',
  '"/api/life-book-ai/prepare"',
  '"/api/life-book-ai/generate"',
  'consultationType: CONSULTATION_TYPE',
  'focusArea: "overall"',
  'topic: TOPIC',
  'inputHash',
  'deferUsage: true',
  'forceDeduct: true',
  'min={MIN_BIRTH_DATE}',
  'max={MAX_BIRTH_DATE}',
  'html2canvas',
  'jspdf',
  'PDF 저장',
  'https://assets.code-destiny.com/%EC%9D%B8%EC%83%9D%20%EC%B4%9D%EB%9E%8C.webp',
]) {
  includes("app/premium-unlock/PremiumSalesContent.tsx", premiumClient, marker);
}

for (const marker of ["49,000원", "해금"]) {
  excludes("app/premium-unlock/page.tsx", premiumPage, marker);
}

for (const marker of [
  "lifeFortune",
  "인생 총운 AI 상담",
  "const LIFE_FORTUNE_MIN_TOTAL_CONTENT_CHARS = 30000;",
  "const LIFE_FORTUNE_MAX_TOTAL_CONTENT_CHARS = 60000;",
  "const LIFE_BOOK_GENERATING_REUSE_MS = 8 * 60 * 1000;",
  "const LIFE_BOOK_GENERATING_STALE_MS = 45 * 60 * 1000;",
  "const LIFE_BOOK_MAX_PROVIDER_CALLS_PER_GENERATION = 1;",
  "buildBillingGatePayload(pricing, idempotencyKey, input = {}, inputHash = \"\")",
  "deferUsage: true",
  "forceDeduct: true",
  "billingContractMatches",
  "billingContractEvidenceClauses",
  "resolveBillingGateAccess({ env, auth, body, idempotencyKey = \"\", inputHash = \"\", consultationType = \"\" })",
  "hasRequiredLifeFortuneSaju",
  "SAJU_CALCULATION_FAILED",
  "restoreAccessBeforeGenerationFailure",
  "getLifeBookReportQualityIssues(generated.text, normalized.input)",
  "LIFE_FORTUNE_REPORT_INVALID",
  "LIFE_FORTUNE_EVIDENCE_REF_ROOTS",
  "hasValidEvidenceRefs",
  "evidenceRefs",
  "finalizeDeferredBillingUsage({ request, env, access, idempotencyKey, sessionId, orderName = ORDER_NAME })",
  "cancelDeferredBillingUsage({ request, env, access, idempotencyKey, sessionId, error, orderName = ORDER_NAME })",
  "applyUsageOnce({ request, env, userId, sessionId, access, idempotencyKey, pricing, orderName = ORDER_NAME })",
  "reserveProviderCallOnce",
  "providerCallCount",
  "PROVIDER_DUPLICATE_BLOCKED",
  "GENERATION_STALLED",
  "generate_reused",
  "generate_blocked_duplicate",
  "status_check",
  "result_fetch",
  "maxProviderCalls: LIFE_BOOK_MAX_PROVIDER_CALLS_PER_GENERATION",
  "fallbackToWorkersAI: diagnostics.hasGeminiKey ? false : undefined",
]) {
  includes("worker/routes/life-book-ai.js", route, marker);
}

const llmClient = read("lib/llm-client.ts");
for (const marker of [
  "action: \"provider_call\"",
  "emitProviderCallLog(\"gemini\"",
  "emitProviderCallLog(\"cloudflare\"",
  "idempotencyKeyHash",
]) {
  includes("lib/llm-client.ts", llmClient, marker);
}

for (const marker of [
  "/api/premium/saju-lifebook",
  "/api/lifebook/prepare",
  "create-job",
  "generate-mock",
  "/api/life-book-ai/message",
  "handleMessage",
  "buildFollowUpPrompt",
]) {
  excludes("worker/routes/life-book-ai.js", route, marker);
}

includes("worker/index.js", workerIndex, '"/api/life-book-ai"');
includes("worker/index.js", workerIndex, "handleLifeBookAiRoutes");
includes("worker/lib/models.js", models, "lifeBookAiConsultationSchema");
includes("worker/lib/life-book-ai-saju.js", saju, "yearPillar");
includes("worker/lib/life-book-ai-saju.js", saju, "monthPillar");
includes("worker/lib/life-book-ai-saju.js", saju, "dayPillar");
includes("worker/lib/life-book-ai-saju.js", saju, "hourPillar");
includes("worker/lib/life-book-ai-saju.js", saju, "pillarDetails");
includes("worker/lib/life-book-ai-saju.js", saju, "tenGods");
includes("worker/lib/life-book-ai-saju.js", saju, "tenGodsByPillar");
includes("worker/lib/life-book-ai-saju.js", saju, "seasonalBalance");
includes("worker/lib/life-book-ai-saju.js", saju, "natalInteractions");
includes("worker/lib/life-book-ai-saju.js", saju, "relationSummary");
includes("worker/lib/life-book-ai-saju.js", saju, "fortuneFacts");
includes("worker/lib/life-book-ai-saju.js", saju, "interpretationPlan");
includes("worker/lib/life-book-ai-saju.js", saju, "majorLuck");
includes("worker/lib/life-book-ai-saju.js", saju, "yearlyLuck");
includes("worker/lib/life-book-ai-saju.js", saju, "getYun");

if (failures.length) {
  console.error("[verify-life-book-ai-flow] FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("[verify-life-book-ai-flow] PASS");

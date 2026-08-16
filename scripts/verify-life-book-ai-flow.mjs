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

/**
 * 구조분해 인자를 받는 함수가 '필요한 키를 실제로 받는지'만 본다.
 *
 * 예전에는 서명을 문자열 통째로 고정했다. 그래서 c4fada81c 가 성능 개선으로 auth 를 하나
 * 끼워 넣자 코드는 멀쩡한데 게이트만 깨졌고, 로컬 배포 경로에는 이 검사가 없어 CI 에서야
 * 드러났다(2026-08-10). 지켜야 할 것은 서명의 글자 모양이 아니라 idempotencyKey·sessionId
 * 같은 키가 청구 경로까지 전달되는가다 — 키 순서는 구조분해라 의미가 없고, 키가 늘어나는
 * 것은 깨뜨릴 이유가 없다.
 *
 * 🔴 위치 인자 함수에는 쓰지 말 것 — 그쪽은 순서가 곧 의미라 문자열 고정이 맞다.
 */
function declaresParams(file, text, fnName, requiredKeys) {
  const declaration = new RegExp(`function\\s+${fnName}\\s*\\(\\s*\\{([^}]*)\\}`).exec(text);
  if (!declaration) {
    assert(false, `${file} missing destructured declaration: ${fnName}({ ... })`);
    return;
  }
  const declared = new Set(
    declaration[1].split(",").map((part) => part.split("=")[0].trim()).filter(Boolean),
  );
  for (const key of requiredKeys) {
    assert(declared.has(key), `${file} ${fnName}({ ... }) must still receive: ${key}`);
  }
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

// 🔴 셸은 6개(루트 + public + public/{static,en,ja,zh})가 모두 같은 카드를 들고 있다.
// 하나만 검사하면 미러 누락이 그대로 프로덕션 가격 불일치가 된다(verify:payment-choice-parity 는 CSS 만 본다).
const SHELL_FILES = [
  "index.html",
  "public/index.html",
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
];
for (const shellFile of SHELL_FILES) {
  const shell = shellFile === "index.html" ? indexHtml : read(shellFile);
  if (!shell) continue;
  includes(shellFile, shell, 'href="/premium-unlock/"');
  includes(shellFile, shell, "life-fortune-ai-vvip-card-v20260701");
  includes(shellFile, shell, 'data-pvw-bypass="1"');
  const cardStart = shell.indexOf("tarot-tile--life-fortune-ai");
  const cardEnd = shell.indexOf("</a>", cardStart);
  const card = cardStart >= 0 && cardEnd > cardStart ? shell.slice(cardStart, cardEnd) : "";
  // 인생 총운은 인생의 책과 별도 SKU(300코인=30,000원) — 분량이 3배라 2026-08-01 분리.
  assert(card && card.includes('data-feature-key="life-fortune-ai-consultation"'), `${shellFile}: life fortune card must carry the dedicated SKU`);
  assert(card && card.includes('data-coin-cost="300"'), `${shellFile}: life fortune card must carry coin cost data attribute`);
  assert(card && card.includes("전문가 상담 · 30,000원"), `${shellFile}: life fortune card must show the KRW price`);
}

for (const marker of [
  'const CONSULTATION_TYPE = "lifeFortune"',
  'const FEATURE_KEY = "life-fortune-ai-consultation"',
  // 워커가 한 요청에 한 웨이브만 돌리므로 클라가 반복 호출해야 생성이 끝까지 간다.
  "runGenerateWave",
  "MAX_GENERATE_WAVES",
  'const MAX_POLL_DURATION_MS = 8 * 60 * 1000',
  'const startLockRef = useRef(false);',
  'function postPrepare',
  '"/api/life-book-ai/prepare"',
  'consultationType: CONSULTATION_TYPE',
  'focusArea: "overall"',
  'topic: TOPIC',
  'inputHash',
  'deferUsage: true',
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
  "인생 총운 전문가 상담",
  "const LIFE_FORTUNE_MIN_TOTAL_CONTENT_CHARS = 30000;",
  "const LIFE_FORTUNE_MAX_TOTAL_CONTENT_CHARS = 60000;",
  // 🔴 stale 창은 클라 폴링 예산(≈400초) 안이어야 GENERATION_STALLED 가 사용자에게 도달한다.
  //    하한은 락 TTL 90s + 웨이브 최악 42s = 132s 이므로 180s 밑으로 내리지 말 것.
  "const SECTION_LOCK_TTL_MS = 90 * 1000;",
  "const LIFE_BOOK_GENERATING_STALE_MS = 3 * 60 * 1000;",
  "const LIFE_BOOK_MAX_SECTION_ATTEMPTS = 3;",
  "const SECTION_CONCURRENCY = 4;",
  "const MAX_GENERATION_WAVES = 8;",
  // 🔴 엣지 100초를 넘길 수 없으므로 동기 상한을 공용 헬퍼로 clamp 한다(0/음수 하한 가드 포함).
  "clampSyncLlmTimeoutMs",
  "Math.max(15000, requested)",
  // 신규 SKU + 구 SKU 하위호환
  'const LIFE_FORTUNE_FEATURE_KEY = "life-fortune-ai-consultation";',
  "const LEGACY_LIFE_FORTUNE_FEATURE_KEY = FEATURE_KEY;",
  "getAcceptedFeatureKeys",
  "billingFeatureKeyOf",
  // 섹션 병렬 엔진
  "buildSectionPlan",
  "buildSectionPrompt",
  "pickSajuSlice",
  "assembleReport",
  "mapIssuesToSections",
  "runWithConcurrency",
  "generateSectionOnce",
  "releaseSectionLock",
  "buildBillingGatePayload(pricing, idempotencyKey, input = {}, inputHash = \"\")",
  "deferUsage: true",
  "billingContractMatches",
  "billingContractEvidenceClauses",
  "hasRequiredLifeFortuneSaju",
  "SAJU_CALCULATION_FAILED",
  "restoreAccessBeforeGenerationFailure",
  // 품질 검사는 조립본에 하고, 결손은 책임 섹션에만 매핑한다(전체 재생성 금지).
  "getLifeBookReportQualityIssues(assembledText, normalized.input)",
  "getLifeBookReportQualityIssues(finalText, normalized.input)",
  "LIFE_FORTUNE_REPORT_INVALID",
  "LIFE_FORTUNE_EVIDENCE_REF_ROOTS",
  "hasValidEvidenceRefs",
  "evidenceRefs",
  "reserveProviderCallOnce",
  "providerCallCount",
  "PROVIDER_DUPLICATE_BLOCKED",
  "GENERATION_STALLED",
  "generate_reused",
  "generate_blocked_duplicate",
  "status_check",
  "result_fetch",
  // 섹션 단위에서는 Workers AI 폴백이 실제 안전망이 된다(70B 실측 정지점 ≈1,700자 > 총운 장 문턱 960자).
  // 단일 3만자 호출에서는 40% 문턱을 물리적으로 못 넘어 무용지물이었다.
  "fallbackMinChars: Math.round(section.minChars * 0.4)",
]) {
  includes("worker/routes/life-book-ai.js", route, marker);
}

// 청구 경로 함수는 서명 글자가 아니라 '필요한 키를 받는가'로 고정한다(declaresParams 주석 참고).
// 여기 나열된 키가 빠지면 중복 청구·미차감·주문명 유실이 조용히 지나간다.
for (const [fnName, requiredKeys] of [
  ["resolveBillingGateAccess", ["env", "auth", "body", "idempotencyKey", "inputHash", "consultationType", "acceptedFeatureKeys"]],
  ["finalizeDeferredBillingUsage", ["request", "env", "access", "idempotencyKey", "sessionId", "orderName"]],
  ["cancelDeferredBillingUsage", ["request", "env", "access", "idempotencyKey", "sessionId", "error", "orderName"]],
  ["applyUsageOnce", ["request", "env", "userId", "sessionId", "access", "idempotencyKey", "pricing", "orderName"]],
]) {
  declaresParams("worker/routes/life-book-ai.js", route, fnName, requiredKeys);
}

excludes("app/premium-unlock/PremiumSalesContent.tsx", premiumClient, "forceDeduct");
excludes("worker/routes/life-book-ai.js", route, "forceDeduct");

const llmClient = read("lib/llm-client.ts");
for (const marker of [
  "action: \"provider_call\"",
  "emitProviderCallLog(\"gemini\"",
  "emitProviderCallLog(\"cloudflare\"",
  "idempotencyKeyHash",
]) {
  includes("lib/llm-client.ts", llmClient, marker);
}

// 🔴 waitUntil 백그라운드 생성은 이 레포에서 금지다(요청 간 I/O 격리로 결과 고착 + 예외 소실).
excludes("worker/routes/life-book-ai.js", route, "ctx.waitUntil");
excludes("worker/routes/life-book-ai.js", route, "LIFE_FORTUNE_TIMEOUT_MS");

// TDZ 재발 차단. 2026-07-30~08-01 사이 선언이 사용보다 뒤에 놓여 생성이 100% 실패했다.
// 섹션 생성기는 바깥 스코프의 lifeFortune 바인딩에 의존하지 않아야 한다(section 인자만 쓴다).
{
  const fnStart = route.indexOf("async function generateSectionOnce");
  const fnEnd = route.indexOf(String.fromCharCode(10) + "function toStringList", fnStart);
  const body = fnStart >= 0 && fnEnd > fnStart ? route.slice(fnStart, fnEnd) : "";
  assert(body.length > 0, "generateSectionOnce not found");
  assert(!/[^A-Za-z]lifeFortune[^A-Za-z]/.test(body), "generateSectionOnce must not depend on an outer lifeFortune binding");
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

// 두 상품의 가격 정본은 레지스트리 하나다. 셸 표기와 어긋나면 위 셸 단언이 먼저 걸린다.
{
  const { FEATURE_KEY_PRICE_TABLE, isPerUsePaidFeatureKey, FRONTEND_PAID_FEATURE_KEYS } = await import(pathToFileURL(path.join(root, "worker/lib/paid-feature-registry.js")).href);
  const lifeBook = FEATURE_KEY_PRICE_TABLE["life-book-ai-consultation"];
  const lifeFortune = FEATURE_KEY_PRICE_TABLE["life-fortune-ai-consultation"];
  assert(FRONTEND_PAID_FEATURE_KEYS.includes("life-fortune-ai-consultation"), "life-fortune-ai-consultation must be exposed to the frontend gate");
  assert(lifeBook?.cost === 200 && lifeBook?.amountKRW === 20000, "life-book-ai-consultation must stay at 200 coins / 20,000 KRW");
  assert(lifeFortune?.cost === 300 && lifeFortune?.amountKRW === 30000, "life-fortune-ai-consultation must be 300 coins / 30,000 KRW");
  assert(isPerUsePaidFeatureKey("life-fortune-ai-consultation") === true, "life-fortune-ai-consultation must be registered as a per-use paid feature");
}

if (failures.length) {
  console.error("[verify-life-book-ai-flow] FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("[verify-life-book-ai-flow] PASS");

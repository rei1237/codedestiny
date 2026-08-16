#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

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

// 실제 파일 경로로 import 한다. data: URL 로 감싸면 모듈 안의 상대 import 를 해석하지 못한다.
async function importLocalEsm(file) {
  read(file);
  return import(pathToFileURL(rel(file)).href);
}

function textLength(value) {
  return String(value || "").trim().length;
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
const resultClient = read("app/love-secret-ai/result/LoveSecretAiResultClient.tsx");
const resultSource = `${resultPage}\n${resultClient}`;
const route = read("worker/routes/love-secret-ai.js");
const workerIndex = read("worker/index.js");
const models = read("worker/lib/models.js");
const registry = read("worker/lib/paid-feature-registry.js");
const calc = read("worker/lib/love-secret-ai-calculation.js");
const prompt = read("worker/lib/love-secret-ai-prompt.js");
const appChrome = read("app/components/AppChrome.tsx");

assertIncludes("index.html", indexHtml, 'data-cd-marker="love-secret-ai-entry-v20260627"');
assertIncludes("index.html", indexHtml, 'data-action="goLoveSecretAi"');
assertIncludes("index.html", indexHtml, 'data-service-detail-href="/love-secret-ai/"');
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
  "exportResultPdf",
  "consultation?.pdfSections?.length ? consultation.pdfSections : consultation?.sections",
]) {
  assertIncludes("app/love-secret-ai/result/page.tsx", resultSource, marker);
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
assertIncludes("worker/lib/love-secret-ai-calculation.js", calc, "calculateLifeBookAiSaju");
assertIncludes("worker/lib/love-secret-ai-calculation.js", calc, "buildLoveShinsal");
assertIncludes("worker/lib/love-secret-ai-calculation.js", calc, "buildLoveDayCalendar");
assertIncludes("worker/lib/love-secret-ai-calculation.js", calc, "calculateLoveSecretAiSaju");
assertIncludes("worker/lib/love-secret-ai-calculation.js", calc, "속궁합과 친밀감 리듬");
assertNotIncludes("worker/lib/love-secret-ai-calculation.js", calc, "pdf-v2");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "LOVE_SECRET_AI_SYSTEM_PROMPT");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "parseLoveSecretGroupResponse");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "assembleLoveSecretConsultation");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "LOVE_SECRET_AI_GROUPS");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "johuIntimacyRhythm");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "pdfSections");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "이 부분의 sections body 합계는");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "계산 확정값 — 본문에서 이 값과 다르게 서술하는 것을 금지");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "나의 명식이 사랑에서 반복하는 방식");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "십성으로 보는 애착과 표현 방식");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "30일 관계 흐름 처방");
assertIncludes("worker/routes/love-secret-ai.js", route, "callGeminiJsonWithRetry");
assertIncludes("worker/routes/love-secret-ai.js", route, "LOVE_SECRET_AI_GROUP_MAX_OUTPUT_TOKENS");
assertIncludes("worker/routes/love-secret-ai.js", route, "generateLoveSecretGroup");
assertIncludes("worker/routes/love-secret-ai.js", route, "LOVE_SECRET_AI_GENERATING_FRESH_MS");
assertIncludes("worker/routes/love-secret-ai.js", route, "sajuSummary: publicSajuSummary");
assertIncludes("worker/routes/love-secret-ai.js", route, "publicChartSummary");
assertIncludes("app/components/AppChrome.tsx", appChrome, '"/love-secret-ai"');

const promptModule = await importLocalEsm("worker/lib/love-secret-ai-prompt.js");
const calendarModule = await importLocalEsm("worker/lib/love-secret-ai-calendar.js");

// ── 섹션 그룹 계약 ────────────────────────────────────────────────────────
const groups = promptModule.LOVE_SECRET_AI_GROUPS;
assert(groups.length === 6, `expected 6 section groups, got ${groups.length}`);
assert(
  groups.reduce((sum, group) => sum + group.sections.length, 0) === promptModule.LOVE_SECRET_AI_SECTION_TITLES.length,
  "section titles must be derived from the group table",
);
assert(
  groups.length * promptModule.LOVE_SECRET_AI_GROUP_MIN_CHARS >= promptModule.LOVE_SECRET_AI_TARGET_MIN_TOTAL_BODY_CHARS,
  "group minimums must be able to reach the target body length",
);
// degrade 바닥(사용 가능 4그룹)이 하드 하한 위에 있어야 결제 후 하드 실패로 뒤집히지 않는다.
assert(
  4 * promptModule.LOVE_SECRET_AI_GROUP_MIN_CHARS >= promptModule.LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS,
  "degrade floor must clear the hard minimum body length",
);
for (const title of ["나의 명식이 사랑에서 반복하는 방식", "십성으로 보는 애착과 표현 방식", "피해야 할 선택과 자기 보호", "30일 관계 흐름 처방"]) {
  assert(promptModule.LOVE_SECRET_AI_SECTION_TITLES.includes(title), `group table missing expert section: ${title}`);
}
const emitted = new Set(groups.flatMap((group) => group.emits));
for (const emit of ["header", "timing", "actions", "closing"]) {
  assert(emitted.has(emit), `no group emits ${emit}`);
}

// ── 일진 캘린더 결정성 ─────────────────────────────────────────────────────
const calendarArgs = {
  dayStem: "壬", dayBranch: "辰", natalBranches: ["酉", "戌", "辰", "午"],
  yongshinElement: "wood", gisinElement: "water",
  dohwaBranches: ["酉"], hongyeomBranch: "子", gongmangBranches: ["申", "酉"],
  startDateKst: "2026-08-01", days: 90,
};
const calendarA = calendarModule.buildLoveDayCalendar(calendarArgs);
const calendarB = calendarModule.buildLoveDayCalendar(calendarArgs);
assert(calendarA.available && calendarA.days.length === 90, "calendar must produce 90 scored days");
assert(JSON.stringify(calendarA) === JSON.stringify(calendarB), "calendar must be deterministic for the same input");
assert(!calendarModule.buildLoveDayCalendar({}).available, "calendar without a start date must report unavailable");

// ── 그룹 파싱 → 조립 → 검증 ────────────────────────────────────────────────
const fixtureSajuResult = {
  consultationMode: "solo",
  myChart: {
    dayMaster: "壬",
    reference: { dayMasterLabel: "임(壬)", dominantTenGod: "비견", yongshinElementLabel: "목", dayElementLabel: "수" },
    lovePattern: "지적 자극과 자유를 중시합니다.",
    loveReference: { strengthTip: "신강 구조라 상대가 주도할 공간을 남겨두는 운영이 중요합니다." },
  },
  calendar: calendarA,
};
const groundingParagraph = "일간 임수의 결로 보면 지금 관계는 확인보다 유지가 먼저입니다. 십성 비견이 두터워 스스로 결론을 내려는 습관이 강하고, 용신 목이 닿는 자리에서 관계가 부드러워집니다. 대운의 흐름이 표현을 밖으로 밀어 주고, 세운이 겹치는 구간에서는 속도를 늦추는 편이 낫습니다. 신살 도화가 시선을 모으므로 관심과 애정을 구분해야 합니다. ";
const groupBody = (chars) => groundingParagraph.repeat(Math.ceil(chars / groundingParagraph.length)).slice(0, chars);

function buildGroupPayload(group, { short = false } = {}) {
  const perSection = Math.floor((short ? 600 : 5400) / group.sections.length);
  const payload = { sections: group.sections.map((section) => ({ title: section.title, body: groupBody(perSection) })) };
  if (group.emits.includes("header")) {
    Object.assign(payload, {
      keywords: ["확인 대신 유지", "먼저 건네는 말", "속도 조절"],
      strategy: "지금은 확인을 미루고 먼저 말을 건네는 편이 낫습니다.",
      summaryTitle: "임수의 연애 비책",
      oneLineDiagnosis: "마음은 이미 기울었고 남은 것은 속도입니다.",
      relationshipTemperature: "따뜻하지만 아직 확신 전입니다.",
    });
  }
  if (group.emits.includes("timing")) {
    Object.assign(payload, {
      monthlyHighlights: { best: ["9월 — 용신 목이 닿는 달"], caution: ["8월 — 공망이 겹치는 달"] },
      luckyDates: calendarA.best.slice(0, 4).map((day) => ({ date: day.date, ganji: day.ganji, why: "용신 기운이 닿는 날" })),
    });
  }
  if (group.emits.includes("actions")) {
    Object.assign(payload, {
      actionSecrets: [
        "[쉬움·오늘] 안부를 먼저 보내세요 (근거: 대운이 표현을 밀어 준다)",
        "[보통·이번 주] 만남을 낮 시간으로 잡으세요 (근거: 용신 목)",
        "[도전·이번 달] 관계 정의를 먼저 물어보세요 (근거: 십성 비견)",
      ],
      sevenDayGuide: Array.from({ length: 7 }, (_, index) => `${index + 1}일차 안부 한 줄 (근거: 일간 임수)`),
    });
  }
  if (group.emits.includes("closing")) {
    Object.assign(payload, { finalMessage: "오늘은 확인 대신 온기를 하나 남기세요.", finalLine: "오늘은 확인 대신 온기를 하나 남기세요." });
  }
  return payload;
}

const parsedGroups = groups.map((group) => ({
  ...promptModule.parseLoveSecretGroupResponse(JSON.stringify(buildGroupPayload(group)), group),
  key: group.key,
}));
assert(parsedGroups.every((result) => result.ok), "every mock group payload must parse");

const assembled = promptModule.assembleLoveSecretConsultation(parsedGroups, { input: {}, sajuResult: fixtureSajuResult });
const assembledChars = promptModule.countLoveSecretConsultationBodyChars(assembled);
assert(assembled.sections.length === promptModule.LOVE_SECRET_AI_SECTION_TITLES.length, "assembled consultation must keep every section");
assert(assembled.keywords.length === 3, "assembled consultation must carry exactly 3 keywords");
assert(assembledChars >= promptModule.LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS, `assembled body too short: ${assembledChars}`);
assert(assembledChars <= promptModule.LOVE_SECRET_AI_MAX_TOTAL_BODY_CHARS, `assembled body too long: ${assembledChars}`);
assert(!assembled.degraded, "all-groups-ok assembly must not be flagged degraded");

const quality = promptModule.validateLoveSecretConsultation(assembled, {
  sajuResult: fixtureSajuResult,
  groundingTerms: promptModule.buildLoveSecretGroundingTerms(fixtureSajuResult),
});
assert(quality.issues.length === 0, `clean mock consultation reported issues: ${quality.issues.join(", ")}`);
assert(
  !promptModule.__loveSecretAiPromptTestUtils.hasForbiddenResultText(assembled.answer),
  "mock quality result contains forbidden product/system wording",
);
assert(
  !promptModule.__loveSecretAiPromptTestUtils.hasUnsafeAdvice(assembled.answer),
  "mock quality result contains unsafe relationship advice",
);

// 그룹 2개가 죽어도 헤더 불변조건이 지켜지고 degraded 로 표시돼야 한다.
const partialGroups = parsedGroups.map((result, index) => (
  index === 1 || index === 3
    ? { key: result.key, ok: false, sections: [], extras: {}, chars: 0, reason: "TIMEOUT" }
    : result
));
const partial = promptModule.assembleLoveSecretConsultation(partialGroups, { input: {}, sajuResult: fixtureSajuResult });
assert(partial.keywords.length === 3, "degraded assembly must still carry 3 keywords");
assert(partial.degraded, "degraded assembly must be flagged");
const partialQuality = promptModule.validateLoveSecretConsultation(partial, { sajuResult: fixtureSajuResult, groundingTerms: [] });
const partialTargets = promptModule.mapLoveSecretIssuesToGroups(partialQuality, partialGroups);
assert(partialTargets.size > 0 && partialTargets.size < groups.length, "repair must target the failing groups, not everything");

// core 그룹이 죽어도 계산값에서 헤더를 복구한다.
const withoutCore = parsedGroups.map((result, index) => (
  index === 0 ? { key: result.key, ok: false, sections: [], extras: {}, chars: 0 } : result
));
const coreless = promptModule.assembleLoveSecretConsultation(withoutCore, { input: { relationshipStatus: "썸" }, sajuResult: fixtureSajuResult });
assert(coreless.keywords.length === 3, "core failure must fall back to computed keywords");
assert(textLength(coreless.strategy) >= 8, "core failure must fall back to a computed strategy");

// 계산되지 않은 날짜는 반려된다.
const inventedDate = promptModule.validateLoveSecretConsultation(
  { ...assembled, answer: `${assembled.answer}\n2099-01-01에 고백하세요.` },
  { sajuResult: fixtureSajuResult, groundingTerms: [] },
);
assert(
  inventedDate.issues.some((issue) => issue.startsWith("INVENTED_DATE")),
  "dates outside the computed calendar must be rejected",
);

// 분량 미달은 목표 미달 이슈로 잡힌다.
const shortGroups = groups.map((group) => ({
  ...promptModule.parseLoveSecretGroupResponse(JSON.stringify(buildGroupPayload(group, { short: true })), group),
  key: group.key,
}));
const shortAssembled = promptModule.assembleLoveSecretConsultation(shortGroups, { input: {}, sajuResult: fixtureSajuResult });
const shortQuality = promptModule.validateLoveSecretConsultation(shortAssembled, { sajuResult: fixtureSajuResult, groundingTerms: [] });
assert(
  shortQuality.issues.some((issue) => issue.startsWith("TOTAL_BELOW_TARGET")),
  "short consultation must raise TOTAL_BELOW_TARGET",
);

if (failures.length) {
  console.error("[verify-love-secret-ai-flow] FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`[verify-love-secret-ai-flow] groups=${groups.length} sections=${assembled.sections.length} body chars=${assembledChars}`);
console.log("[verify-love-secret-ai-flow] PASS");

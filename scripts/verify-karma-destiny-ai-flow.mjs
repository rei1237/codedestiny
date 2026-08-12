import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const read = (file) => readFileSync(resolve(root, file), "utf8");

const indexSource = read("index.html");
// 결과 화면은 셸 + 하위 컴포넌트로 분할되어 있다. 새 파일을 여기 추가하지 않으면
// 아래 문자열 단언들이 "사라진 것"으로 오판한다.
const pageSource = [
  read("app/karma-destiny-ai/page.tsx"),
  read("app/karma-destiny-ai/KarmaDestinyAiClient.tsx"),
  read("app/karma-destiny-ai/result/page.tsx"),
  read("app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx"),
  read("app/karma-destiny-ai/result/_lib/report-model.ts"),
  read("app/karma-destiny-ai/result/_components/ResultStyles.tsx"),
  read("app/karma-destiny-ai/result/_components/SectionTabs.tsx"),
  read("app/karma-destiny-ai/result/_components/LensRadar.tsx"),
  read("app/karma-destiny-ai/result/_components/EvidenceDisclosure.tsx"),
  read("app/karma-destiny-ai/result/_components/ObservatoryLoader.tsx"),
  read("app/karma-destiny-ai/result/_components/ObservatorySvg.tsx"),
].join("\n");
const workerIndexSource = read("worker/index.js");
const routeSource = read("worker/routes/karma-destiny-ai.js");
const calculationSource = read("worker/lib/karma-destiny-ai-calculations.js");
const modelSource = read("worker/lib/models.js");
const registrySource = read("worker/lib/paid-feature-registry.js");

function assertIncludes(source, needle, label) {
  assert.ok(source.includes(needle), `${label}: missing ${needle}`);
}

function assertNotIncludes(source, needle, label) {
  assert.ok(!source.includes(needle), `${label}: unexpected ${needle}`);
}

assertIncludes(indexSource, 'href="/karma-destiny-ai"', "main entry");
assertIncludes(indexSource, 'data-feature-key="karma-destiny-ai-consultation"', "main entry feature key");
assertIncludes(indexSource, "/fuctionassets/soul-origin-cover.webp", "image asset preserved");
assertIncludes(indexSource, "전문가 상담 · 30,000원", "price marker");
assertNotIncludes(indexSource, "openSoulOriginModal", "legacy modal action removed");
assertNotIncludes(indexSource, "soulOriginModal", "legacy modal removed");
assertNotIncludes(indexSource, "/js/soul-origin-book.js", "legacy client script removed");
assertNotIncludes(indexSource, "premium_pdf_soul_origin", "legacy feature key removed from main shell");

assertIncludes(pageSource, "runBillingCoinGate", "common billing gate");
assertIncludes(pageSource, "/api/karma-destiny-ai/ensure-access", "ensure access API");
assertIncludes(pageSource, "/api/karma-destiny-ai/start", "start API");
assertIncludes(pageSource, "/api/karma-destiny-ai/generate-batch", "generate batch API");
assertIncludes(pageSource, "/api/karma-destiny-ai/result", "result API");
assertIncludes(pageSource, "/api/karma-destiny-ai/message", "message API");
assertIncludes(pageSource, "운명의 기록을 펼치고 있습니다", "preparing copy");
assertIncludes(pageSource, "결제창을 확인해 주세요", "payment copy");
assertIncludes(pageSource, "삶의 반복 패턴과 업의 흐름을 읽고 있습니다", "reading copy");
assertIncludes(pageSource, "data-kdai-pdf-page", "PDF page split markers");
assertIncludes(pageSource, "@/lib/pdf/export-result-pdf", "PDF export util import");
assertIncludes(pageSource, "captureTargets:", "PDF renders every split page via capture selector");
assertIncludes(pageSource, "exportResultPdf({", "PDF download call");
assertIncludes(pageSource, "상담에 사용된 차트 데이터", "PDF chart data page");
assertIncludes(pageSource, "buildChartDataBlocks(integratedResult)", "PDF chart data source");
assertIncludes(pageSource, "사주 원국 데이터", "saju chart data included");
assertIncludes(pageSource, "서양 점성술 차트 데이터", "western chart data included");
assertIncludes(pageSource, "베다 점성술 차트 데이터", "vedic chart data included");
assertIncludes(pageSource, "30,000자 이상으로 여는 운명의 업 리포트", "premium value copy");
assertIncludes(pageSource, "sticky", "sticky table of contents");
assertIncludes(pageSource, "이번 장의 핵심", "chapter core box");
assertIncludes(pageSource, "전체 복사", "copy all action");
assertIncludes(pageSource, "PDF 저장", "PDF action");
assertNotIncludes(pageSource, "/api/soul-origin", "old API not called");
assertNotIncludes(pageSource, "prepare", "old prepare copy not present");
assertNotIncludes(pageSource, "create-job", "old create API not present");
assertNotIncludes(pageSource, "generate-mock", "old mock API not present");
assertNotIncludes(pageSource, "soChapter", "old section UI not present");

assertIncludes(workerIndexSource, "handleKarmaDestinyAiRoutes", "worker route handler wired");
assertIncludes(workerIndexSource, "/api/karma-destiny-ai", "worker dispatch wired");
assertIncludes(routeSource, "handleKarmaDestinyAiRoutes", "worker route exported");
assertIncludes(routeSource, "buildKarmaDestinyIntegratedResult", "calculation adapter wired");
assertIncludes(routeSource, "FEATURE_KEY = \"karma-destiny-ai-consultation\"", "feature key");
assertIncludes(routeSource, "PointHistory", "billing evidence verification");
assertIncludes(routeSource, "START_ACCESS_CONFIRMATION_REQUIRED", "start route requires pre-confirmed access");
assertIncludes(routeSource, "MONTHLY_CREDIT_GATE_REQUIRED", "monthly credit must use common billing gate");
assertIncludes(routeSource, "accessType: \"monthly_credit\"", "monthly credit is payment evidence, not entitlement");
assertIncludes(routeSource, "INITIAL_CONSULTATION_MIN_LENGTH = 30000", "premium consultation minimum length");
assertIncludes(routeSource, "PREMIUM_BATCH_SIZE = 4", "batch generation size");
assertIncludes(routeSource, "PREMIUM_REINFORCEMENT_MAX_ATTEMPTS = 2", "reinforcement attempts");
assertIncludes(routeSource, "handleGenerateBatch", "batch route handler");
assertIncludes(routeSource, "handleResult", "result route handler");
assertIncludes(routeSource, "같은 표현, 같은 조언, 같은 상징을 반복하지 않고", "quality anti-repetition instruction");
assertIncludes(routeSource, "운명의 근원", "origin chapter");
assertIncludes(routeSource, "업의 핵심 과제", "karmic task chapter");
assertIncludes(routeSource, "다섯 관점의 종합 결론", "synthesis chapter");
assertIncludes(routeSource, "최종 편지", "final letter chapter");
assertIncludes(routeSource, "validatePremiumReportQuality", "premium quality gate");
// 다섯 렌즈 구조 — 렌즈 분업을 강제하는 장치들이 사라지면 이 기능은 다시 "같은 결론의 반복"이 된다.
assertIncludes(routeSource, "LENS_CONSTITUTION", "lens constitution present");
assertIncludes(routeSource, "buildLensDigest", "differential lens digest present");
assertIncludes(routeSource, "REPORT_SCHEMA_VERSION", "report schema version guard");
assertIncludes(routeSource, "REPORT_SCHEMA_CHANGED", "stale in-flight document guard");
assertIncludes(routeSource, "runWithConcurrency", "per-chapter parallel generation");
assertIncludes(routeSource, "buildChapterEvidence", "server-side evidence extraction");
// 근거·기여도는 반드시 서버가 계산값에서 뽑는다. LLM 이 만든 값이 들어오면 신뢰 검증 UI 가 환각을 싣는다.
assertNotIncludes(routeSource, "payload?.lensContribution", "lens contribution must not come from the LLM");
assertIncludes(calculationSource, "computeLensContribution", "deterministic lens contribution");
assertIncludes(calculationSource, "buildSukuyoRelationAxis", "sukuyo relation axis wired");
assertIncludes(calculationSource, "calculateZiweiAiChart", "ziwei engine wired");
assertIncludes(calculationSource, "buildSukuyoFromLunar", "sukuyo engine wired");
assertIncludes(calculationSource, "buildVimshottariDasha", "real vedic dasha wired");
assertNotIncludes(routeSource, "function hasMonthlyCredit", "monthly credit balance must not grant direct access");
assertNotIncludes(routeSource, "return { ok: true, accessType: \"subscription\", paymentId: \"\", usageAlreadyApplied: false }", "monthly credit must not be direct entitlement");
assertNotIncludes(routeSource, "return resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash, body });", "start route must not re-check entitlement without access token");
assertIncludes(modelSource, "karmaDestinyAiConsultations", "new collection");
assertIncludes(modelSource, "KarmaDestinyAiConsultation", "model export");
assertIncludes(modelSource, "chapters", "chapter storage");
assertIncludes(modelSource, "qualityCheck", "quality check storage");
assertIncludes(modelSource, "generationProgress", "generation progress storage");
assertIncludes(modelSource, "schemaVersion", "report schema version storage");
assertIncludes(modelSource, "lensContribution", "lens contribution storage");
assertIncludes(registrySource, "\"karma-destiny-ai-consultation\": { cost: 300, amountKRW: 30000", "pricing");

assert.ok(!existsSync(resolve(root, "js/soul-origin-book.js")), "legacy soul-origin client should be deleted");
assert.ok(!existsSync(resolve(root, "worker/lib/pdf-v2/soul-origin")), "legacy soul-origin service directory should be deleted");
assert.ok(!existsSync(resolve(root, "worker/routes/soul-origin.js")), "legacy soul-origin route should be deleted");

const { handleKarmaDestinyAiRoutes, __karmaDestinyAiTestUtils } = await import(pathToFileURL(resolve(root, "worker/routes/karma-destiny-ai.js")).href);
const {
  normalizeConsultationInput,
  resolveStartAccess,
  parseKarmaConsultationSections,
  validateInitialConsultationQuality,
  validatePremiumReportQuality,
  PREMIUM_CHAPTERS,
  LENS_USAGE_WEIGHTS,
  FINAL_LETTER_CHAPTER_ID,
  buildKarmaDestinyAiMockConsultation,
} = __karmaDestinyAiTestUtils;
const mockConsultation = buildKarmaDestinyAiMockConsultation();
const mockSections = parseKarmaConsultationSections(mockConsultation);
const mockQuality = validateInitialConsultationQuality(mockConsultation);
assert.equal(PREMIUM_CHAPTERS.length, 15, "premium report should define 15 chapters");
assert.equal(mockSections.length, 15, "mock consultation should split into 15 sections");
assert.equal(mockQuality.ok, true, `mock consultation quality should pass: ${JSON.stringify(mockQuality)}`);
assert.ok(mockQuality.totalCharCount >= 30000, "mock consultation should be at least 30,000 visible chars");
assert.equal(mockQuality.chapterCount, 15, "mock consultation should have 15 chapters");

// 최종 편지 id 는 하드코딩 대신 상수로 잡혀야 한다. 어긋나면 finalLetter 가 빈 값으로 저장된다.
assert.equal(FINAL_LETTER_CHAPTER_ID, PREMIUM_CHAPTERS[PREMIUM_CHAPTERS.length - 1].id, "final letter constant must point at the last chapter");

// 렌즈 분업 계약: 모든 장이 렌즈 배정을 갖고, 다섯 렌즈가 모두 어딘가에서 주도를 맡는다.
const LENS_KEYS = ["saju", "ziwei", "western", "vedic", "sukuyo"];
for (const definition of PREMIUM_CHAPTERS) {
  assert.ok(
    definition.leadLens === "cross" || definition.leadLens === "none" || LENS_KEYS.includes(definition.leadLens),
    `chapter ${definition.id} must declare a valid leadLens`,
  );
  for (const lens of definition.supportLens || []) {
    assert.ok(LENS_KEYS.includes(lens), `chapter ${definition.id} supportLens ${lens} is not a known lens`);
  }
}
const leadLenses = new Set(PREMIUM_CHAPTERS.map((definition) => definition.leadLens));
for (const lens of LENS_KEYS) {
  assert.ok(leadLenses.has(lens), `lens ${lens} must lead at least one chapter`);
  assert.ok(Number(LENS_USAGE_WEIGHTS[lens]) > 0, `lens ${lens} must carry usage weight for the contribution radar`);
}
// 에너지 지표는 다섯 영역이 각각 정확히 한 장에서만 산출되어야 중복/누락이 생기지 않는다.
const energyDomains = PREMIUM_CHAPTERS.map((definition) => definition.energyDomain).filter(Boolean);
assert.equal(energyDomains.length, 5, "exactly five chapters should produce an energy score");
assert.equal(new Set(energyDomains).size, 5, "energy domains must not repeat across chapters");
const leakQuality = validatePremiumReportQuality(PREMIUM_CHAPTERS.map((chapter) => ({
  ...chapter,
  content: "프롬프트 JSON debug providerReason " + "상담 문장 ".repeat(500),
  summary: "누출 검사",
  keyTakeaways: ["첫째", "둘째", "셋째"],
})));
assert.equal(leakQuality.ok, false, "prompt/debug leak should fail quality");
assert.equal(leakQuality.promptLeakDetected, true, "prompt leak flag");
const noLoginResponse = await handleKarmaDestinyAiRoutes(new Request("https://example.test/api/karma-destiny-ai/ensure-access", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Idempotency-Key": "verify-kdai-123456" },
  body: JSON.stringify({
    idempotencyKey: "verify-kdai-123456",
    birthInfo: {
      name: "테스트",
      gender: "female",
      birthDate: "1990-01-01",
      birthTime: "12:00",
      birthTimeUnknown: false,
      calendarType: "solar",
      birthPlace: {
        city: "Seoul",
        country: "South Korea",
        latitude: 37.5665,
        longitude: 126.978,
        timezone: "Asia/Seoul",
      },
    },
    topic: "전체 운명의 업",
    userQuestion: "반복되는 관계 흐름이 궁금합니다.",
  }),
}), {});
const noLoginJson = await noLoginResponse.json();
assert.equal(noLoginResponse.status, 401, "unauthenticated ensure-access should require login");
assert.equal(noLoginJson.reason, "LOGIN_REQUIRED", "unauthenticated reason");
assert.equal(noLoginJson.message, "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.", "login message");

const directStartBody = {
  idempotencyKey: "verify-kdai-direct-start",
  birthInfo: {
    name: "테스트",
    gender: "female",
    birthDate: "1990-01-01",
    birthTime: "12:00",
    birthTimeUnknown: false,
    calendarType: "solar",
    birthPlace: {
      city: "Seoul",
      country: "South Korea",
      latitude: 37.5665,
      longitude: 126.978,
      timezone: "Asia/Seoul",
    },
  },
  topic: "전체 운명의 업",
  userQuestion: "반복되는 관계 흐름이 궁금합니다.",
};
const directStartNormalized = normalizeConsultationInput(directStartBody);
assert.equal(directStartNormalized.ok, true, "direct start fixture should normalize");
// 결제 증거가 없는 직접 start 는 절대 통과하면 안 된다.
// 89b8c7b1 에서 결제 증거 조회가 withMongoRetry 로 감싸지면서, DB 없는 이 하네스에서는
// 조회 자체가 연결 오류로 끝난다. 그것도 접근을 내주지 않는 결과이므로 둘 다 통과로 본다 —
// 단언의 본질은 "증거 없이 ok:true 가 나오지 않는다"이다.
let directStartAccess = null;
let directStartError = null;
try {
  directStartAccess = await resolveStartAccess({
    request: new Request("https://example.test/api/karma-destiny-ai/start", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": directStartBody.idempotencyKey },
      body: JSON.stringify(directStartBody),
    }),
    env: {},
    auth: { userId: "verify-user-without-billing-evidence" },
    body: directStartBody,
    normalized: directStartNormalized,
    pricing: { coinPrice: 300, membershipCreditCost: 3000, amountKRW: 30000 },
    idempotencyKey: directStartBody.idempotencyKey,
  });
} catch (error) {
  directStartError = error;
}
if (directStartError) {
  assert.match(
    String(directStartError?.message || ""),
    /Mongo URI is required|ECONNREFUSED|connect/i,
    "direct start may only fail here for the missing test database",
  );
} else {
  assert.equal(directStartAccess.ok, false, "direct start without confirmed billing must be blocked");
  assert.equal(directStartAccess.reason, "PAYMENT_REQUIRED", "direct start block reason");
  assert.equal(directStartAccess.code, "START_ACCESS_CONFIRMATION_REQUIRED", "direct start block code");
}
// 하네스가 DB 없이 도는 동안에도 fail-closed 문구가 사라지지 않았는지는 소스로 지킨다.
const karmaRouteSource = readFileSync(new URL("../worker/routes/karma-destiny-ai.js", import.meta.url), "utf8");
assert.ok(
  karmaRouteSource.includes('code: "START_ACCESS_CONFIRMATION_REQUIRED"'),
  "start access must keep its fail-closed branch",
);

console.log("[verify-karma-destiny-ai-flow] ok");

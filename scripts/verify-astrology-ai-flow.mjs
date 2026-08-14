#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(`[verify:astrology-ai-flow] ${message}`);
}

function assertMissing(source, patterns, label) {
  for (const pattern of patterns) {
    assert(!source.includes(pattern), `${label} still contains ${pattern}`);
  }
}

function countMeaningfulChars(value) {
  return String(value || "").replace(/\s+/g, "").length;
}

const shortMockConsultation = "태양과 달의 흐름이 지금의 질문을 비춥니다.".repeat(120);
const completeMockConsultation = [
  "태양과 달과 상승궁의 중심축이 지금의 질문을 차분히 비춥니다.",
  "수성과 금성과 화성은 말, 애정, 행동 방식이 생활 안에서 드러나는 결을 보여 줍니다.",
  "목성과 토성은 성장의 문과 책임의 기준을 함께 세웁니다.",
  "주요 각도와 원소와 모드 균형은 반복되는 선택 패턴을 더 선명하게 드러냅니다.",
  "하우스와 현재 트랜짓의 시기감은 이번 달의 타이밍을 부드럽게 가리킵니다.",
  "상담 주제별 선택 기준과 실천 루틴은 2주 안에 점검할 작은 행동으로 이어집니다.",
].join(" ").repeat(80);
const expertMockMarkers = ["상승궁", "수성", "금성", "화성", "목성", "토성", "주요 각도", "원소", "모드", "하우스", "트랜짓", "선택 기준", "실천 루틴"];
assert(countMeaningfulChars(shortMockConsultation) < 10000, "short mock consultation must fail the total-length quality gate");
assert(countMeaningfulChars(completeMockConsultation) >= 10000, "complete mock consultation must pass the total-length quality gate");
assert(countMeaningfulChars(completeMockConsultation) <= 20000, "complete mock consultation must stay within the upper-length quality gate");
for (const marker of expertMockMarkers) {
  assert(completeMockConsultation.includes(marker), `complete mock consultation missing expert marker: ${marker}`);
}

const retiredRuntimeTerms = [
  "/js/astro-book.js",
  "astroBookModal",
  "abProgress",
  "abProgressBar",
  "abChapterContent",
  "copyAstroConsultationResult",
];

const retiredApiTerms = [
  "/api/astrology/prepare",
  "/api/astrology/create-job",
  "/api/astrology/generate",
  "/api/astrology/chapter",
  "/api/astrology/verify-access",
  "createAstrologyPremiumPdf",
  "create-astrology-premium-pdf-job",
  "astrology-premium.chapter-plan",
];

assert(existsSync("worker/routes/astrology-ai.js"), "worker/routes/astrology-ai.js missing");
assert(existsSync("app/astrology-ai/page.tsx"), "app/astrology-ai/page.tsx missing");
assert(existsSync("app/astrology-ai/AstrologyAiClient.tsx"), "AstrologyAiClient.tsx missing");
assert(existsSync("app/astrology-ai/result/page.tsx"), "Astrology AI result page missing");
assert(!existsSync("js/astro-book.js"), "retired js/astro-book.js still exists");

const route = read("worker/routes/astrology-ai.js");
assert(route.includes('FEATURE_KEY = "astrology-ai-consultation"'), "feature key missing");
assert(route.includes('/ensure-access') && route.includes('/start') && route.includes('/message'), "API handlers missing");
assert(route.includes("canAccessPaidFeature"), "server access check missing");
assert(route.includes("getSwissWesternChart"), "Swiss western chart calculator missing");
assert(route.includes("callGeminiText"), "LLM generation missing");
assert(route.includes("applyUsageOnce"), "usage finalization missing");
assert(route.includes("idempotencyKey"), "idempotency handling missing");
assert(route.includes("ASTROLOGY_AI_MIN_RESULT_CHARS = 15000"), "minimum total result character gate missing");
assert(route.includes("ASTROLOGY_AI_MAX_RESULT_CHARS = 26000"), "maximum total result character gate missing");
assert(route.includes("countConsultationChars"), "result character counter missing");
assert(route.includes("buildConsultationExpansionPrompt"), "short result expansion prompt missing");
assert(route.includes("buildConsultationCondensePrompt"), "long result condense prompt missing");
assert(route.includes("getConsultationQualityIssues"), "quality issue checker missing");
assert(route.includes("MOCK_PROVIDER_BLOCKED"), "mock provider block missing");
assert(route.includes("ASTROLOGY_EXPERT_PARTS"), "expert part coverage rules missing");
assert(route.includes("MISSING_EXPERT_PARTS"), "expert part quality issue missing");
assert(route.includes("MAX_TOTAL_CHARS"), "upper-length quality issue missing");
assert(route.includes("requireExpertParts: true"), "first consultation must require expert part coverage");
assert(route.includes("분량만 늘리지 말고"), "expansion prompt must reject quantity-only padding");
assertMissing(route, retiredApiTerms, "worker route");

const models = read("worker/lib/models.js");
assert(models.includes("astrologyAiConsultationSchema"), "astrologyAiConsultationSchema missing");
assert(models.includes("astrologyAiConsultations"), "astrologyAiConsultations collection missing");

const registry = read("worker/lib/paid-feature-registry.js");
assert(registry.includes('"astrology-ai-consultation": { cost: 300, amountKRW: 30000'), "registry pricing missing");
assert(registry.includes('gotoAstrologyPremium: "astrology-ai-consultation"'), "registry action alias must use new key");

const billingClient = read("app/_lib/billing-client.ts");
assert(billingClient.includes('gotoastrologypremium: "astrology-ai-consultation"'), "React billing alias missing");

const workerIndex = read("worker/index.js");
assert(workerIndex.includes("handleAstrologyAiRoutes"), "worker lazy route missing");
assert(workerIndex.includes('url.pathname === "/api/astrology-ai"'), "worker route condition missing");

const page = read("app/astrology-ai/AstrologyAiClient.tsx");
assert(page.includes("runBillingCoinGate"), "page must use runBillingCoinGate");
assert(!page.includes("loadPaidServiceRuntimeGate"), "page must not call loadPaidServiceRuntimeGate directly");
assert(!page.includes("DIRECT_KRW"), "page must not force DIRECT_KRW");
assert(page.includes("/api/astrology-ai/ensure-access"), "ensure-access call missing");
assert(page.includes("/api/astrology-ai/start"), "start call missing");
assert(page.includes("/api/astrology-ai/message"), "message call missing");
assert(page.includes("idempotencyKey"), "frontend idempotency key missing");
assert(page.includes("별자리 차트를 펼치고 있습니다"), "chart loading copy missing");
assert(page.includes("결제창을 확인해 주세요"), "payment copy missing");
assert(page.includes("행성과 별자리의 흐름을 읽고 있습니다"), "LLM loading copy missing");
assertMissing(page, ["/api/astrology/prepare", "/api/astrology/create-job", "/api/astrology/generate", "/api/astrology/chapter"], "page");

const resultSource = [
  read("app/astrology-ai/result/page.tsx"),
  read("app/astrology-ai/result/AstrologyAiResultClient.tsx"),
].join("\n");
assert(resultSource.includes('document.getElementById("astrology-ai-result-document")'), "PDF result document lookup missing");
assert(resultSource.includes('querySelectorAll("details")'), "PDF must expand collapsed result sections before capture");
assert(resultSource.includes("exportResultPdf("), "PDF export util call missing");
assert(resultSource.includes("fileName: `code-destiny-astrology-ai-"), "PDF save missing");
assert(resultSource.includes("previousDetailOpenStates"), "PDF detail state restore missing");
assert(resultSource.includes("기본 차트 데이터"), "basic chart data section missing from PDF document");
assert(resultSource.includes("행성 위치") && resultSource.includes("하우스") && resultSource.includes("주요 각도") && resultSource.includes("현재 트랜짓"), "basic chart data groups missing");

const appChrome = read("app/components/AppChrome.tsx");
assert(appChrome.includes('"/astrology-ai"'), "chromeless route missing");

const html = read("index.html");
assert(html.includes('data-action="gotoAstrologyPremium"'), "main astrology action missing");
assert(html.includes('data-service-detail-href="/astrology-ai"'), "main card route missing");
assert(html.includes("/fuctionassets/premiumstar.webp"), "representative image asset missing");
assert(html.includes("astrology-ai-consultation-v20260627"), "main card marker missing");
assertMissing(html, retiredRuntimeTerms, "index.html");

const bindings = read("js/core/uiBindings.js");
const runtime = read("js/core/index-inline-runtime.js");
assert(bindings.includes("window.location.assign('/astrology-ai')"), "uiBindings navigation missing");
assert(runtime.includes("window.location.assign('/astrology-ai')"), "runtime navigation missing");
assertMissing(bindings, ["/js/astro-book.js"], "uiBindings");
assertMissing(runtime, ["/js/astro-book.js"], "index-inline-runtime");

const sync = read("scripts/sync-legacy-static-to-public.mjs");
assert(sync.includes('"js/astro-book.js"'), "sync stale removal for astro-book missing");

console.log("[verify:astrology-ai-flow] ok");

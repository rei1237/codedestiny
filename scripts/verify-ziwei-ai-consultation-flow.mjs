import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(`[verify:ziwei-ai-consultation-flow] ${message}`);
}

function assertMissing(source, patterns, label) {
  for (const pattern of patterns) {
    assert(!source.includes(pattern), `${label} still contains ${pattern}`);
  }
}

function totalStructuredBodyChars(result) {
  return Object.values(result.sections || {}).reduce((sum, section) => {
    return sum + String(section?.body || "").trim().length;
  }, 0);
}

const retiredTerms = [
  "/api/ziwei-book",
  "handleZiweiBookRoutes",
  "/js/ziwei-book.js",
  "ziweiBookModal",
  "generateZiweiBook",
  "downloadZiweiBookPdf",
  "openZiweiBookModal",
  "zbProgressBar",
  "zbChDot",
  "premium-ziwei-report",
  "premium_pdf_ziwei",
];

assert(existsSync("worker/routes/ziwei-ai.js"), "worker/routes/ziwei-ai.js missing");
assert(existsSync("worker/lib/ziwei-ai-chart.js"), "worker/lib/ziwei-ai-chart.js missing");
assert(existsSync("app/ziwei-ai/page.tsx"), "app/ziwei-ai/page.tsx missing");
assert(!existsSync("worker/routes/ziwei-book.js"), "retired worker/routes/ziwei-book.js still exists");
assert(!existsSync("js/ziwei-book.js"), "retired js/ziwei-book.js still exists");
assert(!existsSync("worker/lib/ziwei-premium-pdf-v3.js"), "retired ziwei premium renderer still exists");

const route = read("worker/routes/ziwei-ai.js");
assert(route.includes("FEATURE_KEY = \"ziwei-ai-consultation\""), "feature key missing");
assert(route.includes("const AMOUNT_KRW = 30000"), "30,000 KRW constant missing");
assert(route.includes("MIN_INITIAL_CONSULTATION_BODY_CHARS = 20700"), "initial consultation 20,700 char guard missing");
assert(route.includes("MAX_INITIAL_CONSULTATION_BODY_CHARS = 30000"), "initial consultation 30,000 char cap missing");
assert(route.includes("countStructuredConsultationBodyChars"), "structured body char counter missing");
assert(route.includes("minBodyChars: MIN_INITIAL_CONSULTATION_BODY_CHARS"), "initial generation min body guard missing");
assert(route.includes("maxBodyChars: MAX_INITIAL_CONSULTATION_BODY_CHARS"), "initial generation max body guard missing");
// 토큰 상한은 요구 분량 상한 + 완충을 담을 수 있어야 한다. 특정 숫자를 고정하면 예산을 올릴 때마다
// 이 가드가 먼저 깨져 낡은 값으로 되돌리게 만든다 — 최소 기준으로 단언한다(정본은 verify:llm-generation-resilience).
const ziweiTokenBudget = Number(/INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS = (\d+)/.exec(route)?.[1] || 0);
assert(ziweiTokenBudget >= 47250, `initial generation token budget too small: ${ziweiTokenBudget} (need >= 47250 for 30,000 chars + headroom)`);
assert(route.includes("triad_axis") && route.includes("twelve_palaces") && route.includes("timing_strategy") && route.includes("core_answer"), "expert expansion sections missing");
assert(route.includes("문장만 늘리지 말고") && route.includes("자미두수 전문가가 실제로 더 살필 파트"), "quality expansion guard missing");
assert(route.includes("POST") && route.includes("/prepare") && route.includes("/generate") && route.includes("/ensure-access") && route.includes("/start") && route.includes("/message"), "API handlers missing");
assert(route.includes("calculateZiweiAiChart"), "chart calculator not connected");
assert(route.includes("resolveBillingGateAccess"), "runBillingCoinGate evidence verifier missing");
assert(route.includes("applyUsageOnce"), "usage finalization missing");
assert(route.includes("readBillingContext(body)"), "billing evidence context bug fix missing");
assert(route.includes("[Ziwei AI LLM ${marker}]"), "Ziwei AI LLM log marker missing");
assert(route.includes("Provider Selected") && route.includes("Payment Guard Passed") && route.includes("Refund Or Restore"), "LLM diagnostic markers missing");
assert(route.includes("hasEnvAI") && route.includes("willUseRealLLM") && route.includes("providerReason"), "provider diagnostics missing");

const chart = read("worker/lib/ziwei-ai-chart.js");
assert(chart.includes("lifePalace") && chart.includes("bodyPalace") && chart.includes("fourTransformations"), "chart structure fields missing");
assert(chart.includes("명궁") && chart.includes("신궁") && chart.includes("사화"), "core ziwei chart labels missing");

const models = read("worker/lib/models.js");
assert(models.includes("ziweiAiConsultationSchema"), "ziweiAiConsultationSchema missing");
assert(models.includes("ziweiAiConsultations"), "ziweiAiConsultations collection missing");

const workerIndex = read("worker/index.js");
assert(workerIndex.includes("/api/ziwei-ai"), "worker index does not route /api/ziwei-ai");
assertMissing(workerIndex, ["/api/ziwei-book", "handleZiweiBookRoutes"], "worker index");

const registry = read("worker/lib/paid-feature-registry.js");
assert(registry.includes("\"ziwei-ai-consultation\": { cost: 300, amountKRW: 30000"), "registry price must be 300 / 30,000 KRW");
assert(registry.includes("gotoZiweiPremium: \"ziwei-ai-consultation\""), "registry goto alias missing");
assertMissing(registry, ["premium-ziwei-report", "premium_pdf_ziwei"], "paid registry");

const billingClient = read("app/_lib/billing-client.ts");
assert(billingClient.includes("gotoziweipremium: \"ziwei-ai-consultation\""), "React billing alias missing");
assertMissing(billingClient, ["premium-ziwei-report", "premium_pdf_ziwei"], "billing client");

const page = [
  read("app/ziwei-ai/page.tsx"),
  read("app/ziwei-ai/ZiweiAiClient.tsx"),
].join("\n");
assert(page.includes("runBillingCoinGate"), "page must use runBillingCoinGate");
assert(page.includes("/api/ziwei-ai/prepare") && page.includes("/api/ziwei-ai/generate") && page.includes("/api/ziwei-ai/message"), "page API calls missing");
assert(!/fuctionassets|\.webp|<img|backgroundImage|url\(/.test(page), "/ziwei-ai page must not depend on image files");
assert(page.includes("별궁을 열기 위한 정보를 확인하고 있습니다"), "loading copy missing");
assert(page.includes("결제창을 확인해 주세요"), "payment copy missing");
assert(page.includes("명궁과 신궁의 흐름을 맞춰보는 중"), "LLM loading copy missing");
assert(page.includes("palaceSigil") && page.includes("heroBackdropText"), "star palace UI missing");
assert(page.includes("명궁") && page.includes("신궁") && page.includes("상담 키워드"), "result summary cards missing");
assert(page.includes("data-ziwei-complete-result=\"ziwei-ai-complete-result-v20260630\""), "complete result pdf root marker missing");
assert(page.includes("data-ziwei-pdf-download=\"complete-result-v20260630\""), "pdf download marker missing");
assert(page.includes("data-ziwei-pdf-section"), "pdf section markers missing");
assert(page.includes("data-ziwei-chart-data=\"basic-chart-v20260630\""), "basic chart data pdf marker missing");
assert(page.includes("화록") && page.includes("화권") && page.includes("화과") && page.includes("화기"), "four transformation chart data missing");
assert(page.includes("exportResultPdf"), "pdf renderer imports missing");
assert(page.includes("PDF 다운로드"), "pdf download button copy missing");
assert(page.includes("\"triad_axis\"") && page.includes("\"twelve_palaces\"") && page.includes("\"timing_strategy\"") && page.includes("\"core_answer\""), "expert sections not rendered by page");

const mockSectionBody = [
  "명궁의 별빛은 선택의 중심을 조용히 드러냅니다.",
  "주성의 강약과 사화의 흐름은 지금 붙잡아야 할 방향을 비춥니다.",
  "대운의 물길은 서두를 자리와 기다릴 자리를 나누어 줍니다.",
  "현실의 조언은 관계와 일상에서 반복되는 리듬을 차분히 정돈합니다.",
].join(" ").repeat(16);
const mockConsultation = {
  sections: Object.fromEntries([
  "essence",
  "flow",
  "triad_axis",
  "twelve_palaces",
  "career",
  "wealth",
  "relationship",
  "dayun_now",
  "timing_strategy",
  "caution",
  "core_answer",
  "prescription",
].map((key) => [key, { title: key, body: mockSectionBody }])),
};
const mockBodyChars = totalStructuredBodyChars(mockConsultation);
assert(mockBodyChars >= 20000 && mockBodyChars <= 30000, "mock consultation body must be 20,000-30,000 chars total");
assert(!/\bAI\b|PDF|챕터|chapter|\bjob\b|\bprogress\b|프롬프트|시스템/i.test(JSON.stringify(mockConsultation.sections)), "mock consultation contains forbidden mechanical terms");

const appChrome = read("app/components/AppChrome.tsx");
assert(appChrome.includes("\"/ziwei-ai\""), "chromeless /ziwei-ai route missing");

const serviceRegistry = read("app/_lib/serviceFeatureRegistry.ts");
assert(serviceRegistry.includes("launchRoute: \"/ziwei-ai\""), "service registry launch route missing");
assert(serviceRegistry.includes("featureKey: \"ziwei-ai-consultation\""), "service registry feature key missing");

const html = read("index.html");
assert(html.includes("data-ziwei-premium-card=\"ziwei-ai-consultation-v20260627\""), "main card marker missing");
assert(html.includes("data-href=\"/ziwei-ai\""), "main card route missing");
assert(html.includes("/fuctionassets/jamipremiun.webp"), "representative image asset missing");
// 라벨은 f728f7bf3 에서 'AI 상담' → '전문가 상담' 으로 바뀌었다(프론트 일관성).
// 가드가 안 따라가 오래 빨간불이었다 — 문구를 바꾸려면 여기도 같이 고친다.
assert(html.includes("전문가 상담 · 30,000원"), "main card price missing");
assertMissing(html, retiredTerms.filter((term) => term !== "premium-ziwei-report" && term !== "premium_pdf_ziwei"), "index.html");

const bindings = read("js/core/uiBindings.js");
const runtime = read("js/core/index-inline-runtime.js");
// 후행 슬래시 유무를 고정하지 않는다 — 지켜야 할 것은 "그 라우트로 간다"이지 표기가 아니다.
// (next.config 의 trailingSlash:true 에 맞춰 슬래시를 붙이자 이 가드가 뒤집혔다, 2026-09-03)
const ZIWEI_AI_NAV = /window\.location\.assign\('\/ziwei-ai\/?'\)/;
assert(ZIWEI_AI_NAV.test(bindings), "uiBindings navigation missing");
assert(ZIWEI_AI_NAV.test(runtime), "runtime navigation missing");
assertMissing(bindings, retiredTerms, "uiBindings");
assertMissing(runtime, retiredTerms, "index-inline-runtime");

const sync = read("scripts/sync-legacy-static-to-public.mjs");
assert(sync.includes("\"js/ziwei-book.js\""), "sync stale removal for ziwei-book missing");
assertMissing(sync, ["ZIWEI_AI_CONSULTATION_CACHE_KEY"], "sync script");

console.log("[verify:ziwei-ai-consultation-flow] ok");

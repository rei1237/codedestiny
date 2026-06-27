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
assert(route.includes("POST") && route.includes("/ensure-access") && route.includes("/start") && route.includes("/message"), "API handlers missing");
assert(route.includes("calculateZiweiAiChart"), "chart calculator not connected");
assert(route.includes("resolveBillingGateAccess"), "runBillingCoinGate evidence verifier missing");
assert(route.includes("applyUsageOnce"), "usage finalization missing");

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

const page = read("app/ziwei-ai/page.tsx");
assert(page.includes("runBillingCoinGate"), "page must use runBillingCoinGate");
assert(page.includes("/api/ziwei-ai/start") && page.includes("/api/ziwei-ai/message"), "page API calls missing");
assert(page.includes("자미두수 명반을 펼치고 있습니다"), "loading copy missing");
assert(page.includes("결제창을 확인해 주세요"), "payment copy missing");
assert(page.includes("별궁의 흐름을 읽고 있습니다"), "LLM loading copy missing");
assert(page.includes("명궁") && page.includes("신궁") && page.includes("상담 키워드"), "result summary cards missing");

const appChrome = read("app/components/AppChrome.tsx");
assert(appChrome.includes("\"/ziwei-ai\""), "chromeless /ziwei-ai route missing");

const serviceRegistry = read("app/_lib/serviceFeatureRegistry.ts");
assert(serviceRegistry.includes("launchRoute: \"/ziwei-ai\""), "service registry launch route missing");
assert(serviceRegistry.includes("featureKey: \"ziwei-ai-consultation\""), "service registry feature key missing");

const html = read("index.html");
assert(html.includes("data-ziwei-premium-card=\"ziwei-ai-consultation-v20260627\""), "main card marker missing");
assert(html.includes("data-href=\"/ziwei-ai\""), "main card route missing");
assert(html.includes("/fuctionassets/jamipremiun.webp"), "representative image asset missing");
assert(html.includes("AI 상담 · 30,000원"), "main card price missing");
assertMissing(html, retiredTerms.filter((term) => term !== "premium-ziwei-report" && term !== "premium_pdf_ziwei"), "index.html");

const bindings = read("js/core/uiBindings.js");
const runtime = read("js/core/index-inline-runtime.js");
assert(bindings.includes("window.location.assign('/ziwei-ai')"), "uiBindings navigation missing");
assert(runtime.includes("window.location.assign('/ziwei-ai')"), "runtime navigation missing");
assertMissing(bindings, retiredTerms, "uiBindings");
assertMissing(runtime, retiredTerms, "index-inline-runtime");

const sync = read("scripts/sync-legacy-static-to-public.mjs");
assert(sync.includes("\"js/ziwei-book.js\""), "sync stale removal for ziwei-book missing");
assertMissing(sync, ["ZIWEI_AI_CONSULTATION_CACHE_KEY"], "sync script");

console.log("[verify:ziwei-ai-consultation-flow] ok");

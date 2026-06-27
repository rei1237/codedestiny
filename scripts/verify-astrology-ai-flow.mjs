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
assert(!existsSync("js/astro-book.js"), "retired js/astro-book.js still exists");

const route = read("worker/routes/astrology-ai.js");
assert(route.includes('FEATURE_KEY = "astrology-ai-consultation"'), "feature key missing");
assert(route.includes('/ensure-access') && route.includes('/start') && route.includes('/message'), "API handlers missing");
assert(route.includes("canAccessPaidFeature"), "server access check missing");
assert(route.includes("getSwissWesternChart"), "Swiss western chart calculator missing");
assert(route.includes("callGeminiText"), "LLM generation missing");
assert(route.includes("applyUsageOnce"), "usage finalization missing");
assert(route.includes("idempotencyKey"), "idempotency handling missing");
assertMissing(route, retiredApiTerms, "worker route");

const models = read("worker/lib/models.js");
assert(models.includes("astrologyAiConsultationSchema"), "astrologyAiConsultationSchema missing");
assert(models.includes("astrologyAiConsultations"), "astrologyAiConsultations collection missing");

const registry = read("worker/lib/paid-feature-registry.js");
assert(registry.includes('"astrology-ai-consultation": { cost: 390, amountKRW: 39000'), "registry pricing missing");
assert(registry.includes('gotoAstrologyPremium: "astrology-ai-consultation"'), "registry action alias must use new key");
assert(registry.includes('premium_pdf_western_astrology: "premium-astrology-report"'), "old PDF key alias should remain separate");

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

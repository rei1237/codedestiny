const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const billingSource = fs.readFileSync(path.join(root, "app/_lib/billing-client.ts"), "utf8");
const providerSource = fs.readFileSync(path.join(root, "app/components/PaymentProcessingContext.tsx"), "utf8");
const warmupStart = providerSource.indexOf("const warmIfAuthenticated");
const warmupEnd = providerSource.indexOf("// First-paint resources take priority", warmupStart);
const warmupSection = providerSource.slice(warmupStart, warmupEnd);

test("entry billing warmup applies failure cooldown and Retry-After", () => {
  assert.match(billingSource, /const SUBSCRIPTION_WARM_FAILURE_COOLDOWN_MS = 60_000;/);
  assert.match(billingSource, /if \(subscriptionWarmBlockedUserKey === warmUserKey && Date\.now\(\) < subscriptionWarmBlockedUntil\) return;/);
  assert.match(billingSource, /result\.status === 503 \|\| result\.status === 504/);
  assert.match(billingSource, /Number\(result\.retryAfterMs\) \|\| 0/);
  assert.match(billingSource, /response\.headers\.get\("Retry-After"\)/);
});

test("entry billing warmup no longer retries on pointer or visibility events", () => {
  assert.doesNotMatch(warmupSection, /addEventListener\(["']pointerdown/);
  assert.doesNotMatch(warmupSection, /addEventListener\(["']visibilitychange/);
  assert.doesNotMatch(warmupSection, /removeEventListener\(["']pointerdown/);
  assert.doesNotMatch(warmupSection, /removeEventListener\(["']visibilitychange/);
});

// D-4: useCoinGate 를 쓰지 않는 화면(AI 상담류 등)도 클릭 전에 결제 런타임(destiny-profile.js)이
// 받아지도록, 앱 전역 Provider 한 곳에서 실제 조작 의도에만 프리페치한다.
const prewarmStart = providerSource.indexOf("const prewarmPaidRuntimeGate");
const prewarmEnd = providerSource.indexOf("const setPaymentLoadingVariant", prewarmStart);
const prewarmSection = providerSource.slice(prewarmStart, prewarmEnd);

test("payment runtime gate is prewarmed from the app-wide provider (covers screens that skip useCoinGate)", () => {
  assert.ok(prewarmStart >= 0, "prewarmPaidRuntimeGate helper not found");
  assert.match(prewarmSection, /import\("\.\.\/_lib\/billing-client"\)/);
  assert.match(prewarmSection, /prefetchPaidServiceRuntimeGate/);
  assert.doesNotMatch(prewarmSection, /loadPaidServiceRuntimeGate/);
  assert.match(prewarmSection, /pointerover/);
  assert.match(prewarmSection, /focusin/);
  assert.doesNotMatch(prewarmSection, /requestIdleCallback|setTimeout/);
});

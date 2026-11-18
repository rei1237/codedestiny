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

// S6(2026-11-18 실측): 모바일 PG 는 결제를 시작한 React 화면 URL 로 되돌아오는데, 런타임이 클릭 때만
// 실행돼 /life-book-ai/ 복귀 문서에서 destiny-profile.js 요청이 0건이었다 — 주문 확정·결과 재개가 멈춘다.
const returnEffectStart = providerSource.indexOf("if (!isPaymentReturnDocument()) return;");
const returnEffect = providerSource.slice(returnEffectStart, providerSource.indexOf("}, [profileOnly]);", returnEffectStart));

function memoryStorage(entries = {}) {
  return { getItem: key => (Object.hasOwn(entries, key) ? entries[key] : null) };
}

test("the app-wide provider executes the payment runtime on PG return documents", () => {
  assert.ok(returnEffectStart >= 0, "payment-return runtime loader not found");
  assert.match(providerSource, /import \{ isPaymentReturnDocument \} from "\.\.\/_lib\/payment-return-document";/);
  assert.match(returnEffect, /loadPaidServiceRuntimeGate\(\)/);
});

test("payment return detection: query or live direct ticket, never ordinary visits or /points", async () => {
  const { isPaymentReturnDocument } = await import("../../app/_lib/payment-return-document.ts");
  const run = (pathname, search, session = {}) => {
    globalThis.window = { location: { pathname, search }, sessionStorage: memoryStorage(session), localStorage: memoryStorage() };
    try { return isPaymentReturnDocument(); } finally { delete globalThis.window; }
  };
  const ticket = at => ({ cd_direct_payment_resume: JSON.stringify({ merchantUid: "m-1", confirmBody: {}, at }) });
  assert.equal(run("/life-book-ai/", "?portone_redirect=1&paymentId=a"), true);
  assert.equal(run("/yeongnyangi/", "?x=1&imp_uid=b"), true);
  assert.equal(run("/neo-operation-room/", "?paid_pass_resume=1"), true);
  assert.equal(run("/life-book-ai/", "", ticket(Date.now() - 5 * 60 * 1000)), true);
  assert.equal(run("/life-book-ai/", "", ticket(Date.now() - 31 * 60 * 1000)), false);
  assert.equal(run("/life-book-ai/", "?utm_source=x&attemptId=abc"), false);
  assert.equal(run("/points/", "?portone_redirect=1&paymentId=a"), false);
});

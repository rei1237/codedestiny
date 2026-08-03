const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const billingSource = fs.readFileSync(path.join(root, "app/_lib/billing-client.ts"), "utf8");
const providerSource = fs.readFileSync(path.join(root, "app/components/PaymentProcessingContext.tsx"), "utf8");
const warmupStart = providerSource.indexOf("const warmIfAuthenticated");
const warmupEnd = providerSource.indexOf("const setPaymentLoadingVariant", warmupStart);
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

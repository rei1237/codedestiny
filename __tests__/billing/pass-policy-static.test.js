/**
 * @jest-environment node
 *
 * Static regression checks for route boundaries and shop request fan-out.
 * These checks do not import payment providers or call external services.
 */

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("all direct pass checks are routed through feature access policy", () => {
  const targets = [
    "worker/lib/paid-feature-access.js",
    "worker/lib/nakshatra-paid-access.js",
    "worker/routes/fortune.js",
    "worker/routes/karma-destiny-ai.js",
    "worker/routes/life-book-ai.js",
    "worker/routes/love-secret-ai.js",
    "worker/routes/master-love-codex.js",
    "worker/routes/new-year-ai.js",
    "worker/routes/vedic-ai.js",
    "worker/routes/ziwei-ai.js",
    "worker/routes/ziwei-island-ai.js",
  ];
  for (const target of targets) {
    const source = read(target);
    expect(source).toContain("resolveFeatureAccessPolicy");
    expect(source).not.toMatch(/canUseByPass\s*\(/);
  }
});

test("Google Play pass channel is blocked before verification and restore", () => {
  const source = read("worker/routes/app-store.js");
  expect(source).toContain("PASS_PURCHASE_CHANNEL_DISABLED");
  expect(source).toContain("if (product.kind === \"pass\") return rejectGooglePlayPassPurchase");
  expect(source).toContain("Google Play pass restore is disabled");
  expect(source).toContain('row.paymentType !== "membership_pass"');
  expect(source).toContain('payment.paymentType === "membership_pass"');
});

test("shop entry does not issue a normal-user subscription status request", () => {
  const points = read("app/points/PointsClient.tsx");
  expect(points).toContain("/api/payments/me");
  expect(points).toContain("if (!isAdminSession) return;");

  const history = read("app/points/history/PointHistoryClient.tsx");
  expect(history).toContain("fetchPaymentsMe()");
  expect(history).toContain("fetchPointsSection(),\n      fetchPaymentsSection(),");
  expect(history).not.toContain("fetchSubscriptionSection(),");
});

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("all browser runtimes use the shared Payment Service boundary", () => {
  const service = read("js/core/payment-service.js");
  const billingClient = read("app/_lib/billing-client.ts");
  const shell = read("index.html");
  const standalone = read("js/destiny-profile.js");

  for (const field of [
    "operationId", "requestId", "productId", "featureKey", "profileId",
    "method", "accessGrant", "unlockMap", "monthlyBalance", "snapshotPatch", "completedAt",
  ]) assert.match(service, new RegExp(`${field}:`));

  assert.match(billingClient, /paymentService\.executePayment/);
  assert.match(shell, /CodeDestinyPaymentService/);
  assert.match(standalone, /CodeDestinyPaymentService/);
  assert.doesNotMatch(billingClient, /COIN_GATE_TRANSIENT_MAX_RETRIES/);
  assert.doesNotMatch(standalone, /resolveRetryDelay/);
});

test("standalone HTML loads Payment Service before destiny-profile", () => {
  const files = [
    "celestial-harmony.html", "cosmic-soul-meditation.html", "fortune-teller-fish.html",
    "geomancy-oracle-v4.html", "ifa_oracle_v2_full.html", "neville-meditation.html",
    "pet-saju.html", "royal-tea-oracle.html", "tarot-ijik.html", "vedic-astrology.html", "yoga-guru.html",
  ];
  for (const file of files) {
    const source = read(file);
    const serviceAt = source.indexOf("/js/core/payment-service.js");
    const profileAt = source.indexOf("/js/destiny-profile.js");
    assert.ok(serviceAt >= 0 && profileAt > serviceAt, `${file} must load Payment Service first`);
  }
});

test("payment success is applied before background entitlement synchronization", () => {
  const shell = read("index.html");
  const start = shell.indexOf("async function _cdConfirmSajuEntitlementAfterPayment(");
  const end = shell.indexOf("function _cdBuildUnlockMapFromServerPayload(", start);
  const section = shell.slice(start, end);
  assert.ok(section.indexOf("return { confirmed: true, latest: null, optimistic: true }") >= 0);
  assert.doesNotMatch(section, /_cdFetchSajuAnalysisEntitlements\(\{ force: true/);
  assert.doesNotMatch(section, /setTimeout|retry-/);
});

test("card confirmation failure preserves a recovery state", () => {
  const billing = read("worker/routes/billing.js");
  assert.match(billing, /CARD_CONFIRM_PENDING/);
  assert.match(billing, /code: "PENDING_CONFIRMATION"/);
  assert.match(billing, /recoveryRequired: true/);
  assert.match(billing, /retryable: false/);
});

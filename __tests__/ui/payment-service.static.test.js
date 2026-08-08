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

// 🔴 #326 회귀 방지. React 공용 게이트(runBillingCoinGate)가 paymentService.executePayment 로 경계를
// 연 채 런타임 게이트(_cdOpenPaidServiceGate)를 부르는데, 런타임 래퍼가 **같은 commandKey** 로 경계를
// 한 번 더 열면 안쪽이 바깥쪽 프로미스를 그대로 되돌려받아 순환 대기가 된다. 타임아웃이 없어
// 결제수단 선택창이 영영 안 뜨고 "결제 진행 중"에서 멈춘다(수비학 타로 3,000원 심층 상담에서 발견).
test("nested boundary entry with the same command key self-joins (why the React path must opt out)", async () => {
  const service = require(path.join(root, "js/core/payment-service.js"));

  const command = {
    method: "PAYMENT_GATE",
    requestId: "tarot-numerology-reading:req:nt_test",
    productId: "",
    featureKey: "tarot-numerology-reading",
    profileId: "",
  };

  let inner = null;
  let innerExecutorRan = false;
  const outer = service.executePayment(command, () => {
    // 바깥 executor 안에서 같은 커맨드로 다시 진입 = 런타임 래퍼가 하던 일.
    inner = service.executePayment(command, () => {
      innerExecutorRan = true;
      return Promise.resolve("inner");
    });
    return Promise.resolve("outer");
  });

  assert.equal(await outer, "outer");
  // 안쪽이 받은 것은 새 실행이 아니라 **바깥 자신의 프로미스**다. 바깥이 이것을 await 하면 교착이다.
  assert.equal(inner, outer, "nested same-key executePayment must be recognised as self-joining");
  assert.equal(innerExecutorRan, false, "the nested executor never runs — it only joins the outer command");
});

test("React gate opts out of the runtime payment-service boundary", () => {
  const billingClient = read("app/_lib/billing-client.ts");
  const standalone = read("js/destiny-profile.js");
  const standaloneMirror = read("public/js/destiny-profile.js");

  // billing-client 는 런타임 게이트에 "경계 이미 진입함"을 알린다.
  assert.match(
    billingClient,
    /__cdPaymentCommandActive:\s*true/,
    "runPaidServiceRuntimePayment must tell the runtime gate the boundary is already held",
  );

  // 런타임 래퍼는 그 신호를 보면 executePayment 를 다시 부르지 않는다.
  const wrapperAt = standalone.indexOf("_dpOpenPaidServiceGateGuarded = function");
  assert.ok(wrapperAt > 0, "paid service gate wrapper not found");
  const wrapper = standalone.slice(wrapperAt, standalone.indexOf("__cdSinglePaymentGuard = true", wrapperAt));
  const optOutAt = wrapper.indexOf("__cdPaymentCommandActive");
  const executeAt = wrapper.indexOf("service.executePayment");
  assert.ok(optOutAt > 0, "runtime gate wrapper must honour __cdPaymentCommandActive");
  assert.ok(optOutAt < executeAt, "the opt-out must be checked before the boundary is re-entered");

  // 정적 사본은 심링크가 아니다 — 어긋나면 프로덕션에서 한쪽만 고쳐진다.
  assert.equal(standalone, standaloneMirror, "public/js/destiny-profile.js must mirror js/destiny-profile.js");
});

test("card confirmation failure preserves a recovery state", () => {
  const billing = read("worker/routes/billing.js");
  assert.match(billing, /CARD_CONFIRM_PENDING/);
  assert.match(billing, /code: "PENDING_CONFIRMATION"/);
  assert.match(billing, /recoveryRequired: true/);
  assert.match(billing, /retryable: false/);
});

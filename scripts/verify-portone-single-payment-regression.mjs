import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const paymentsRouteSource = readFileSync(resolve(root, "worker/routes/payments.js"), "utf8");
const portoneSource = readFileSync(resolve(root, "worker/lib/portone.js"), "utf8");
const modelsSource = readFileSync(resolve(root, "worker/lib/models.js"), "utf8");
const indexSource = readFileSync(resolve(root, "index.html"), "utf8");
const destinyProfileSource = readFileSync(resolve(root, "js/destiny-profile.js"), "utf8");
const clientPaymentSource = `${indexSource}\n${destinyProfileSource}`;

const paymentsMod = await import("../worker/routes/payments.js");
const portoneMod = await import("../worker/lib/portone.js");
const modelsMod = await import("../worker/lib/models.js");

const {
  handleSinglePaymentStart,
  handleSinglePaymentComplete,
  handleWebhook,
  signStandardWebhookPayload,
} = paymentsMod.__paymentsTestUtils;

const {
  ContentEntitlement,
  Payment,
  ProfileCard,
  User,
} = modelsMod;

const AUTH = { userId: "64f0a1b2c3d4e5f678901234", role: "user" };
const ENV = {
  PORTONE_API_Secret: "sk_test_secret_should_never_leave_server",
  PORTONE_webhook: "whsec_d2ViaG9vay11bml0LXNlY3JldA==",
  PORTONE_channel: "channel_test_123",
  PORTONE_Store: "store_test_123",
  SITE_BASE_URL: "https://code-destiny.test",
};

const originals = {
  fetch: globalThis.fetch,
  contentFindOne: ContentEntitlement.findOne,
  contentFindOneAndUpdate: ContentEntitlement.findOneAndUpdate,
  paymentCreate: Payment.create,
  paymentFindOne: Payment.findOne,
  paymentFindOneAndUpdate: Payment.findOneAndUpdate,
  paymentFindById: Payment.findById,
  paymentFindByIdAndUpdate: Payment.findByIdAndUpdate,
  profileFindOne: ProfileCard.findOne,
  userFindById: User.findById,
};

function query(value) {
  return {
    select() { return this; },
    sort() { return this; },
    session() { return this; },
    lean: async () => value,
    catch: async () => value,
  };
}

function assertContains(source, marker, label = marker) {
  assert.ok(source.includes(marker), `${label}: missing marker`);
}

function assertBefore(source, first, second, label) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  assert.ok(firstIndex >= 0, `${label}: missing first marker`);
  assert.ok(secondIndex >= 0, `${label}: missing second marker`);
  assert.ok(firstIndex < secondIndex, `${label}: order mismatch`);
}

function readPaymentId(payload) {
  return String(payload?.order?.paymentId || payload?.order?.merchantUid || payload?.payment?.merchantUid || "").trim();
}

function makePayment(overrides = {}) {
  return {
    _id: "pay_1",
    userId: AUTH.userId,
    merchantUid: "cd-single-test-1710000000000-abcd1234",
    impUid: "",
    idempotencyKey: "",
    paymentAmount: 5000,
    expectedChargedPoints: 50,
    chargedPoints: 0,
    featureKey: "section_summary",
    productId: "code-destiny",
    coinPrice: 50,
    membershipCreditCost: 50,
    accessType: "single_purchase",
    pricingSnapshot: {
      profileId: "profile-a",
      selectedProfileId: "profile-a",
      serviceId: "code-destiny",
      contentId: "section_summary",
      contentType: "saju",
      amountKRW: 5000,
    },
    paymentMethod: "CARD",
    status: "pending",
    orderState: "PENDING",
    source: "prepare",
    paymentType: "digital_content",
    subscriptionTier: "",
    ...overrides,
  };
}

function makePortOnePayment(overrides = {}) {
  return {
    paymentId: "cd-single-test-1710000000000-abcd1234",
    id: "cd-single-test-1710000000000-abcd1234",
    status: "PAID",
    storeId: ENV.PORTONE_Store,
    amount: { total: 5000, paid: 5000, currency: "KRW" },
    currency: "KRW",
    paidAt: "2026-06-04T00:00:00.000Z",
    method: { type: "CARD" },
    ...overrides,
  };
}

let state;

function resetState() {
  state = {
    createdPayments: [],
    entitlementByKey: new Map(),
    preUnlocked: false,
    payment: makePayment(),
    portonePayment: makePortOnePayment(),
  };

  ProfileCard.findOne = () => query({ _id: "profile_doc_1", profileId: "profile-a" });
  User.findById = () => query({
    _id: AUTH.userId,
    name: "Tester",
    email: "tester@example.com",
    phoneNumber: "01012345678",
  });
  ContentEntitlement.findOne = (criteria = {}) => {
    if (state.preUnlocked) return query({ _id: "entitlement_existing", ...criteria, unlockedAt: new Date() });
    const key = [
      criteria.userId,
      criteria.profileId,
      criteria.serviceKey,
      criteria.contentKey,
      criteria.scope,
    ].join("|");
    return query(state.entitlementByKey.get(key) || null);
  };
  ContentEntitlement.findOneAndUpdate = (criteria = {}, update = {}) => {
    const key = [
      criteria.userId,
      criteria.profileId,
      criteria.serviceKey,
      criteria.contentKey,
      criteria.scope,
    ].join("|");
    const existing = state.entitlementByKey.get(key);
    const doc = existing || {
      _id: `entitlement_${state.entitlementByKey.size + 1}`,
      ...criteria,
      ...(update.$setOnInsert || {}),
    };
    Object.assign(doc, update.$set || {});
    state.entitlementByKey.set(key, doc);
    return query(doc);
  };
  Payment.create = async (doc) => {
    const created = { _id: `pay_created_${state.createdPayments.length + 1}`, ...doc };
    state.createdPayments.push(created);
    state.payment = { ...state.payment, ...created };
    return created;
  };
  Payment.findOne = (criteria = {}) => {
    if (criteria.merchantUid && criteria.merchantUid !== state.payment.merchantUid) return query(null);
    if (criteria.idempotencyKey) return query(null);
    if (criteria.status?.$in && !criteria.status.$in.includes(state.payment.status)) return query(null);
    return query(state.payment);
  };
  Payment.findById = () => query(state.payment);
  Payment.findOneAndUpdate = (_criteria, update = {}) => {
    if (Array.isArray(_criteria?.status?.$nin) && _criteria.status.$nin.includes(state.payment.status)) {
      return query(null);
    }
    state.payment = {
      ...state.payment,
      ...(update.$set || {}),
    };
    if (update.$inc?.confirmAttempts) {
      state.payment.confirmAttempts = Number(state.payment.confirmAttempts || 0) + Number(update.$inc.confirmAttempts || 0);
    }
    return query(state.payment);
  };
  Payment.findByIdAndUpdate = (_id, update = {}) => {
    state.payment = {
      ...state.payment,
      ...(update.$set || {}),
    };
    if (update.$inc?.confirmAttempts) {
      state.payment.confirmAttempts = Number(state.payment.confirmAttempts || 0) + Number(update.$inc.confirmAttempts || 0);
    }
    return query(state.payment);
  };
  globalThis.fetch = async (url) => {
    assert.ok(String(url).includes(`/payments/${encodeURIComponent(state.payment.merchantUid)}`), "PortOne lookup URL should include paymentId");
    return new Response(JSON.stringify({ payment: state.portonePayment }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

function restoreMocks() {
  globalThis.fetch = originals.fetch;
  ContentEntitlement.findOne = originals.contentFindOne;
  ContentEntitlement.findOneAndUpdate = originals.contentFindOneAndUpdate;
  Payment.create = originals.paymentCreate;
  Payment.findOne = originals.paymentFindOne;
  Payment.findOneAndUpdate = originals.paymentFindOneAndUpdate;
  Payment.findById = originals.paymentFindById;
  Payment.findByIdAndUpdate = originals.paymentFindByIdAndUpdate;
  ProfileCard.findOne = originals.profileFindOne;
  User.findById = originals.userFindById;
}

async function jsonResponse(response) {
  const payload = await response.json();
  return { status: response.status, payload };
}

function startRequest(body) {
  return new Request("https://code-destiny.test/api/payments/single/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function completeRequest(paymentId) {
  return new Request("https://code-destiny.test/api/payments/single/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ paymentId }),
  });
}

async function signedWebhookRequest(body) {
  const rawBody = JSON.stringify(body);
  const webhookId = `msg_${Math.random().toString(36).slice(2)}`;
  const timestamp = "1710000000";
  const signature = await signStandardWebhookPayload(ENV.PORTONE_webhook, webhookId, timestamp, rawBody);
  return new Request("https://code-destiny.test/api/payments/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "webhook-id": webhookId,
      "webhook-timestamp": timestamp,
      "webhook-signature": `v1,${signature}`,
    },
    body: rawBody,
  });
}

async function runServerTests() {
  const missingConfig = portoneMod.getPortOnePublicConfig({});
  assert.equal(missingConfig.configured, false, "env missing should fail safely");
  assert.equal("portoneApiSecret" in missingConfig, false, "public config should not expose API secret key");

  resetState();
  state.preUnlocked = true;
  let response = await handleSinglePaymentStart(startRequest({
    profileId: "profile-a",
    contentId: "section_summary",
    contentType: "saju",
    productName: "Code Destiny 운세",
    coinPrice: 50,
  }), ENV, AUTH);
  let result = await jsonResponse(response);
  assert.equal(result.status, 200, "already unlocked start should succeed");
  assert.equal(result.payload.alreadyUnlocked, true, "already unlocked should be reported");
  assert.equal(readPaymentId(result.payload), "", "already unlocked should not create paymentId");
  assert.equal(state.createdPayments.length, 0, "already unlocked should not create order");

  resetState();
  response = await handleSinglePaymentStart(startRequest({
    profileId: "profile-a",
    contentId: "section_summary",
    contentType: "saju",
    productName: "Code Destiny 운세",
    coinPrice: 50,
    amount: 1,
  }), ENV, AUTH);
  result = await jsonResponse(response);
  assert.equal(result.status, 201, "single start should create order");
  assert.equal(result.payload.order.totalAmount, 5000, "50 coins should become 5000 KRW");
  assert.equal(state.createdPayments[0].paymentAmount, 5000, "server amount should ignore client amount");
  assert.equal(JSON.stringify(result.payload).includes(ENV.PORTONE_API_Secret), false, "client response should not include API secret");

  resetState();
  response = await handleSinglePaymentStart(startRequest({
    profileId: "profile-a",
    contentId: "section_summary",
    contentType: "saju",
    coinPrice: 999,
  }), ENV, AUTH);
  result = await jsonResponse(response);
  assert.equal(result.status, 400, "tampered coinPrice should be rejected");
  assert.equal(result.payload.code, "CLIENT_COIN_PRICE_MISMATCH");

  resetState();
  state.portonePayment = makePortOnePayment({ status: "READY" });
  response = await handleSinglePaymentComplete(completeRequest(state.payment.merchantUid), ENV, AUTH);
  result = await jsonResponse(response);
  assert.equal(result.status, 202, "non-PAID status should stay pending");
  assert.equal(state.entitlementByKey.size, 0, "non-PAID status should not unlock");

  resetState();
  state.portonePayment = makePortOnePayment({ amount: { total: 4900, paid: 4900, currency: "KRW" } });
  response = await handleSinglePaymentComplete(completeRequest(state.payment.merchantUid), ENV, AUTH);
  result = await jsonResponse(response);
  assert.equal(result.status, 400, "amount mismatch should fail");
  assert.equal(result.payload.code, "AMOUNT_MISMATCH");
  assert.equal(state.payment.orderState, "VERIFY_FAILED");
  assert.equal(state.entitlementByKey.size, 0, "amount mismatch should not unlock");

  resetState();
  state.portonePayment = makePortOnePayment({ storeId: "wrong_store" });
  response = await handleSinglePaymentComplete(completeRequest(state.payment.merchantUid), ENV, AUTH);
  result = await jsonResponse(response);
  assert.equal(result.status, 400, "storeId mismatch should fail");
  assert.equal(result.payload.code, "STORE_ID_MISMATCH");
  assert.equal(state.payment.orderState, "VERIFY_FAILED");
  assert.equal(state.entitlementByKey.size, 0, "storeId mismatch should not unlock");

  resetState();
  response = await handleSinglePaymentComplete(completeRequest(state.payment.merchantUid), ENV, AUTH);
  result = await jsonResponse(response);
  assert.equal(result.status, 200, "PAID complete should succeed");
  assert.equal(result.payload.status, "UNLOCKED");
  response = await handleSinglePaymentComplete(completeRequest(state.payment.merchantUid), ENV, AUTH);
  result = await jsonResponse(response);
  assert.equal(result.status, 200, "same paymentId complete should be idempotent");
  assert.equal(state.entitlementByKey.size, 1, "same paymentId should keep one unlock record");

  resetState();
  let webhook = await signedWebhookRequest({ type: "Transaction.Paid", data: { paymentId: state.payment.merchantUid } });
  response = await handleWebhook(webhook, ENV);
  result = await jsonResponse(response);
  assert.equal(result.status, 200, "Transaction.Paid webhook should succeed");
  webhook = await signedWebhookRequest({ type: "Transaction.Paid", data: { paymentId: state.payment.merchantUid } });
  response = await handleWebhook(webhook, ENV);
  result = await jsonResponse(response);
  assert.equal(result.status, 200, "duplicate Transaction.Paid webhook should succeed");
  assert.equal(state.entitlementByKey.size, 1, "duplicate Transaction.Paid webhook should not duplicate unlock");

  resetState();
  state.payment = makePayment({ status: "success", orderState: "UNLOCKED", paidAt: new Date() });
  webhook = await signedWebhookRequest({ type: "Transaction.Failed", data: { paymentId: state.payment.merchantUid } });
  response = await handleWebhook(webhook, ENV);
  result = await jsonResponse(response);
  assert.equal(result.status, 200, "Transaction.Failed webhook should be idempotent");
  assert.equal(state.payment.orderState, "UNLOCKED", "Transaction.Failed should not overwrite UNLOCKED order");

  resetState();
  webhook = await signedWebhookRequest({ type: "Transaction.VirtualAccountIssued", data: { paymentId: state.payment.merchantUid } });
  response = await handleWebhook(webhook, ENV);
  result = await jsonResponse(response);
  assert.equal(result.status, 200, "VirtualAccountIssued webhook should succeed");
  assert.equal(state.payment.orderState, "VIRTUAL_ACCOUNT_ISSUED");
  assert.equal(state.entitlementByKey.size, 0, "VirtualAccountIssued should not unlock");
}

function runClientStaticTests() {
  assertContains(clientPaymentSource, "window._cdCoinGatePerUseInFlight", "duplicate click guard");
  assertContains(clientPaymentSource, "window.PortOne.requestPayment(requestData)", "PortOne payment window call");
  assertContains(clientPaymentSource, "if (!rsp || rsp.code || !paymentId)", "PortOne response.code failure handling");
  assertContains(clientPaymentSource, "paymentFailed", "failure UI state");
  assertContains(clientPaymentSource, "paymentSuccess", "success UI state");
  assertContains(indexSource, "checkingEntitlement: ['결제/이용권 확인'", "checking entitlement UI state");
  assertContains(indexSource, "readyToPay: ['결제 가능'", "ready-to-pay UI state");
  assertContains(indexSource, "paymentProcessing: ['결제 확인 중'", "payment processing UI state");
  assertContains(indexSource, "savingUnlock: ['잠금 해제 저장 중'", "unlock saving UI state");
  assertContains(indexSource, "redirectUrl.searchParams.set('portone_redirect', '1')", "mobile redirect marker");
  assertContains(paymentsRouteSource, 'redirectUrl.searchParams.set("payment_id", paymentId)', "redirectUrl carries paymentId");
  assertBefore(indexSource, "_cdHasVerifiedServerAccess(confirmRes.payload", "return confirmRes.payload", "server complete failure must block unlock success");
  assertBefore(indexSource, "if (!order.merchantUid && checkoutData.accessGrant", "await _cdLoadPortOneV2Sdk()", "already unlocked/pass branch should not open payment modal");
  assertContains(indexSource, "alreadyUnlocked", "already unlocked branch");
}

function runE2EStaticTests() {
  assertBefore(indexSource, "await _cdChooseServicePaymentMode({", "var directPayload = await _cdRunDirectKrwCheckout({", "paid content click should choose before direct PortOne checkout");
  assertBefore(indexSource, "window.PortOne.requestPayment(requestData)", "_cdHasVerifiedServerAccess(confirmRes.payload", "payment should verify server before unlock");
  assertContains(paymentsRouteSource, "upsertSinglePaymentUnlockRecord", "server unlock persistence");
  assertContains(paymentsRouteSource, "profileId,", "profile-scoped unlock");
  assertContains(paymentsRouteSource, "contentId,", "content-scoped unlock");
  assertContains(paymentsRouteSource, "accessType: \"single_purchase\"", "single purchase branch");
  assertContains(paymentsRouteSource, "PAYMENT_NOT_PAID", "failed payment should not open content");
  assertContains(paymentsRouteSource, "alreadyUnlocked: true", "same profile/content avoids payment");
  assertContains(modelsSource, "contentEntitlementSchema.index(", "unlock unique index");
  assertContains(modelsSource, "{ userId: 1, profileId: 1, serviceKey: 1, contentKey: 1, scope: 1 }", "profile-specific unique unlock");
}

try {
  await runServerTests();
  runClientStaticTests();
  runE2EStaticTests();
  assertContains(portoneSource, "Authorization: `PortOne ${apiSecret}`", "PortOne REST authorization header");
  console.log("[verify-portone-single-payment-regression] PASS");
} finally {
  restoreMocks();
}

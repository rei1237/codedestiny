import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const paymentsRouteSource = readFileSync(resolve(root, "worker/routes/payments.js"), "utf8");
const portoneSource = readFileSync(resolve(root, "worker/lib/portone.js"), "utf8");
const modelsSource = readFileSync(resolve(root, "worker/lib/models.js"), "utf8");
const indexSource = readFileSync(resolve(root, "index.html"), "utf8");
const destinyProfileSource = readFileSync(resolve(root, "js/destiny-profile.js"), "utf8");
const pointsPageSourcePath = existsSync(resolve(root, "app/points/PointsClient.tsx"))
  ? "app/points/PointsClient.tsx"
  : "app/points/page.tsx";
const pointsPageSource = readFileSync(resolve(root, pointsPageSourcePath), "utf8");
const mePageSourcePath = existsSync(resolve(root, "app/me/MeClient.tsx"))
  ? "app/me/MeClient.tsx"
  : "app/me/page.tsx";
const mePageSource = readFileSync(resolve(root, mePageSourcePath), "utf8");
const pagesHeadersSource = readFileSync(resolve(root, "public/_headers"), "utf8");
const clientPaymentSource = `${indexSource}\n${destinyProfileSource}`;
const portoneAliasGroups = [
  ["PORTONE_API_SECRET", "PORTONE_API_Secret", "PORTONE_API_SECRET_KEY", "PORTONE_V2_API_SECRET", "PORTONE_API_SECRET_V2", "PORTONE_SECRET"],
  ["PORTONE_CHANNEL_KEY", "PORTONE_channel", "PORTONE_CHANNEL", "PORTONE_CHANNELKEY", "PORTONE_V2_CHANNEL_KEY"],
  ["PORTONE_STORE_ID", "PORTONE_Store", "PORTONE_STORE", "PORTONE_STOREID", "PORTONE_V2_STORE_ID"],
  ["PORTONE_WEBHOOK_SECRET", "PORTONE_webhook", "PORTONE_WEBHOOK", "PORTONE_WEBHOOK_SECRET_KEY", "PORTONE_WEBHOOK_TOKEN", "PORTONE_webhook_Secret", "PORTONE_V2_WEBHOOK_SECRET"],
  ["PORTONE_WEBHOOK_URL", "PORTONE_webhook_URL", "PORTONE_webhookurl", "PORTONE_WEBHOOKURL"],
  ["MID", "INICISMID", "INIstoreId", "INI_STORE_ID", "INICIS_MID", "INICIS_STORE_ID"],
  ["INIsignkey", "INISIGNKEY", "INI_SIGNKEY", "INICIS_SIGNKEY", "INICIS_WEB_SIGNKEY"],
  ["INIAPIKEY", "INI_API_KEY", "INICIS_API_KEY"],
  ["INIAPI_IV", "INI_API_IV", "INICIS_API_IV"],
];
const localPortOneEnv = buildLocalPortOneEnv();

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
  PaymentWebhookEvent,
  ProfileCard,
  User,
} = modelsMod;

const AUTH = { userId: "64f0a1b2c3d4e5f678901234", role: "user" };
const ENV = {
  PORTONE_API_SECRET: "sk_test_secret_should_never_leave_server",
  PORTONE_WEBHOOK_SECRET: "whsec_d2ViaG9vay11bml0LXNlY3JldA==",
  PORTONE_CHANNEL_KEY: "channel_test_123",
  PORTONE_STORE_ID: "store_test_123",
  MID: "INIpayTest",
  INIsignkey: "signkey_test_should_never_leave_server",
  INIAPIKEY: "inicis_api_key_should_never_leave_server",
  INIAPI_IV: "inicis_api_iv_should_never_leave_server",
  SITE_BASE_URL: "https://code-destiny.test",
};
const ENV_CORE = {
  PORTONE_API_SECRET: ENV.PORTONE_API_SECRET,
  PORTONE_CHANNEL_KEY: ENV.PORTONE_CHANNEL_KEY,
  PORTONE_STORE_ID: ENV.PORTONE_STORE_ID,
  SITE_BASE_URL: ENV.SITE_BASE_URL,
};

const originals = {
  fetch: globalThis.fetch,
  contentFindOne: ContentEntitlement.findOne,
  contentFindOneAndUpdate: ContentEntitlement.findOneAndUpdate,
  contentUpdateMany: ContentEntitlement.updateMany,
  paymentCreate: Payment.create,
  paymentFindOne: Payment.findOne,
  paymentFindOneAndUpdate: Payment.findOneAndUpdate,
  paymentFindById: Payment.findById,
  paymentFindByIdAndUpdate: Payment.findByIdAndUpdate,
  paymentWebhookCreate: PaymentWebhookEvent.create,
  paymentWebhookFindOne: PaymentWebhookEvent.findOne,
  paymentWebhookFindOneAndUpdate: PaymentWebhookEvent.findOneAndUpdate,
  paymentWebhookFindByIdAndUpdate: PaymentWebhookEvent.findByIdAndUpdate,
  profileFindOne: ProfileCard.findOne,
  userFindById: User.findById,
  userUpdateOne: User.updateOne,
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

function assertNotContains(source, marker, label = marker) {
  assert.ok(!source.includes(marker), `${label}: forbidden marker present`);
}

// 🔴 PG 결제창 미노출 회귀 가드 (2026-07)
// PR #104 가 requestPayment 요청에 windowType 을 새로 넣고 redirectUrl 을 서버 생성값 우선으로
// 바꾼 뒤, 단건결제 클릭 시 PG 결제창이 아예 뜨지 않는 회귀가 발생했다. windowType 은 이 레포에서
// 그 두 곳에만 있었고, 정상 동작하는 결제 경로(lib/payment/portone.ts, /points 이용권 결제)는
// windowType 을 보내지 않으며 redirectUrl 을 클라이언트에서 페이지 origin 기준으로 만든다.
// 두 클라이언트(정적 셸 / destiny-profile)를 정상 경로와 같은 형태로 고정한다.
function runPortOneRequestShapeTests() {
  for (const [label, source] of [["index.html", indexSource], ["js/destiny-profile.js", destinyProfileSource]]) {
    // 코드 형태(속성 대입 / 실제 참조)로만 판정한다 — 설명 주석의 단어까지 잡으면 오탐이 된다.
    assertNotContains(source, "windowType:", `${label}: PortOne requestPayment must not send windowType (PR #104 PG-window regression)`);
    assertNotContains(source, "order.redirectUrl ||", `${label}: redirectUrl must be built from the page URL, not the server order`);
    assertContains(source, "new URL(window.location.href)", `${label}: redirectUrl is derived from the current page URL`);
    assertContains(source, "requestData.noticeUrls = [config.noticeUrl]", `${label}: noticeUrls stays in parity with lib/payment/portone.ts`);
  }
  // 정상 동작하는 참조 구현도 함께 고정한다 — 이쪽이 바뀌면 위 동등성 근거가 사라진다.
  const portoneClientSource = readFileSync(resolve(root, "lib/payment/portone.ts"), "utf8");
  assertNotContains(portoneClientSource, "windowType", "lib/payment/portone.ts must stay the windowType-free reference shape");
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

function parseEnvText(text) {
  const parsed = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*[=:]\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[match[1]] = value.replace(/\\n/g, "\n");
  }
  return parsed;
}

function buildLocalPortOneEnv() {
  const env = {};
  for (const fileName of [".env.local", ".env.cloudflare.local", ".env"]) {
    const filePath = resolve(root, fileName);
    if (!existsSync(filePath)) continue;
    const parsed = parseEnvText(readFileSync(filePath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (env[key]) continue;
      env[key] = value;
    }
  }
  for (const group of portoneAliasGroups) {
    const primary = group[0];
    if (env[primary]) continue;
    for (const key of group.slice(1)) {
      const value = String(env[key] || "").trim();
      if (!value) continue;
      env[primary] = value;
      break;
    }
  }
  return env;
}

function withoutConsoleError(callback) {
  const original = console.error;
  console.error = () => {};
  try {
    return callback();
  } finally {
    console.error = original;
  }
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
    storeId: ENV.PORTONE_STORE_ID,
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
    userFeaturePulls: [],
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
  User.updateOne = async (_criteria = {}, update = {}) => {
    if (update.$pull) state.userFeaturePulls.push(update.$pull);
    return { acknowledged: true, modifiedCount: 1 };
  };
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
  ContentEntitlement.updateMany = async (_criteria = {}, update = {}) => {
    let matchedCount = 0;
    let modifiedCount = 0;
    for (const doc of state.entitlementByKey.values()) {
      const userMatches = !_criteria.userId || String(doc.userId) === String(_criteria.userId);
      const statusMatches = !_criteria.status || String(doc.status) === String(_criteria.status);
      const sourceMatches = !_criteria.source || String(doc.source) === String(_criteria.source);
      const clauseMatches = !Array.isArray(_criteria.$or) || _criteria.$or.some((clause) => {
        if (clause.paymentId?.$in?.includes(doc.paymentId)) return true;
        if (clause.orderId?.$in?.includes(doc.orderId)) return true;
        if (clause.serviceKey && clause.serviceKey !== doc.serviceKey) return false;
        if (clause.profileId && clause.profileId !== doc.profileId) return false;
        if (clause.contentKey?.$in) return clause.contentKey.$in.includes(doc.contentKey);
        return false;
      });
      if (!userMatches || !statusMatches || !sourceMatches || !clauseMatches) continue;
      matchedCount += 1;
      Object.assign(doc, update.$set || {});
      modifiedCount += 1;
    }
    return { acknowledged: true, matchedCount, modifiedCount };
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
  const webhookEvents = new Map();
  PaymentWebhookEvent.create = async (doc) => {
    const key = `${doc.provider}:${doc.eventId}`;
    if (webhookEvents.has(key)) {
      const error = new Error("duplicate webhook event");
      error.code = 11000;
      throw error;
    }
    const created = { _id: `webhook_${webhookEvents.size + 1}`, ...doc };
    webhookEvents.set(key, created);
    return created;
  };
  PaymentWebhookEvent.findOne = (criteria = {}) => {
    const key = `${criteria.provider}:${criteria.eventId}`;
    return query(webhookEvents.get(key) || null);
  };
  PaymentWebhookEvent.findOneAndUpdate = (criteria = {}, update = {}) => {
    const key = `${criteria.provider}:${criteria.eventId}`;
    const existing = webhookEvents.get(key);
    if (!existing || (criteria.status && existing.status !== criteria.status)) return query(null);
    Object.assign(existing, update.$set || {});
    if (update.$inc?.attempts) existing.attempts = Number(existing.attempts || 0) + Number(update.$inc.attempts || 0);
    return query(existing);
  };
  PaymentWebhookEvent.findByIdAndUpdate = (id, update = {}) => {
    for (const event of webhookEvents.values()) {
      if (event._id !== id) continue;
      Object.assign(event, update.$set || {});
      return query(event);
    }
    return query(null);
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
  ContentEntitlement.updateMany = originals.contentUpdateMany;
  Payment.create = originals.paymentCreate;
  Payment.findOne = originals.paymentFindOne;
  Payment.findOneAndUpdate = originals.paymentFindOneAndUpdate;
  Payment.findById = originals.paymentFindById;
  Payment.findByIdAndUpdate = originals.paymentFindByIdAndUpdate;
  PaymentWebhookEvent.create = originals.paymentWebhookCreate;
  PaymentWebhookEvent.findOne = originals.paymentWebhookFindOne;
  PaymentWebhookEvent.findOneAndUpdate = originals.paymentWebhookFindOneAndUpdate;
  PaymentWebhookEvent.findByIdAndUpdate = originals.paymentWebhookFindByIdAndUpdate;
  ProfileCard.findOne = originals.profileFindOne;
  User.findById = originals.userFindById;
  User.updateOne = originals.userUpdateOne;
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
  const signature = await signStandardWebhookPayload(ENV.PORTONE_WEBHOOK_SECRET, webhookId, timestamp, rawBody);
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
  const missingConfig = withoutConsoleError(() => portoneMod.getPortOnePublicConfig({}));
  assert.equal(missingConfig.configured, false, "env missing should fail safely");
  assert.equal("portoneApiSecret" in missingConfig, false, "public config should not expose API secret key");
  if (localPortOneEnv.PORTONE_API_SECRET || localPortOneEnv.PORTONE_CHANNEL_KEY || localPortOneEnv.PORTONE_STORE_ID) {
    const localConfig = portoneMod.getPortOnePublicConfig(localPortOneEnv);
    assert.equal(localConfig.configured, true, ".env.local PortOne core env should configure payments");
    assert.equal(localConfig.serverVerificationConfigured, true, ".env.local PortOne API secret should configure server verification");
    assert.equal(localConfig.storeId, localPortOneEnv.PORTONE_STORE_ID, ".env.local PortOne store id should be reflected");
    assert.equal(localConfig.channelKey, localPortOneEnv.PORTONE_CHANNEL_KEY, ".env.local PortOne channel key should be reflected");
  }
  const fullConfig = portoneMod.getPortOnePublicConfig(ENV);
  assert.equal(fullConfig.configured, true, "PortOne core env should configure payments");
  assert.equal(fullConfig.inicisConfigured, true, "Inicis MID/signkey/API key/IV should be reported when present");
  assert.equal(fullConfig.webhookSecretConfigured, true, "webhook secret should be reported when present");
  assert.equal(JSON.stringify(fullConfig).includes(ENV.INIAPIKEY), false, "public config should not expose Inicis API key");
  const coreConfig = portoneMod.getPortOnePublicConfig(ENV_CORE);
  assert.equal(coreConfig.configured, true, "PortOne API secret/store/channel should be enough to open checkout");
  assert.equal(coreConfig.inicisConfigured, false, "missing Inicis API key should not block checkout config");
  assert.equal(coreConfig.webhookSecretConfigured, false, "missing webhook secret should not block checkout config");
  assert.equal(coreConfig.noticeUrl, "", "missing webhook secret should not expose per-payment notice URL");
  assert.equal(coreConfig.missing.length, 0, "core config should not report required env missing");
  assert.ok(coreConfig.missingOptional.includes("PORTONE_WEBHOOK_SECRET"), "webhook secret should be optional diagnostics");
  assert.ok(coreConfig.missingOptional.includes("INIAPIKEY"), "Inicis API key should be optional diagnostics");
  assert.equal(portoneMod.getPortOnePublicConfig({ ...ENV, INIAPIKEY: "" }).configured, true, "missing Inicis API key should not block checkout config");
  const aliasConfig = portoneMod.getPortOnePublicConfig({
    portone_api_secret_key: ENV.PORTONE_API_SECRET,
    "portone-channelkey": ENV.PORTONE_CHANNEL_KEY,
    portone_storeid: ENV.PORTONE_STORE_ID,
  });
  assert.equal(aliasConfig.configured, true, "normalized PortOne env aliases should configure payments");

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
  assert.equal(JSON.stringify(result.payload).includes(ENV.PORTONE_API_SECRET), false, "client response should not include API secret");
  assert.equal(JSON.stringify(result.payload).includes(ENV.INIsignkey), false, "client response should not include Inicis signkey");

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
  let webhook = await signedWebhookRequest({ type: "Transaction.Cancelled", data: { paymentId: state.payment.merchantUid } });
  response = await handleWebhook(webhook, ENV);
  result = await jsonResponse(response);
  assert.equal(result.status, 200, "Transaction.Cancelled webhook should succeed");
  assert.equal(result.payload.unlockRevoked, true, "full cancellation webhook should revoke unlock");
  const revokedEntitlement = Array.from(state.entitlementByKey.values())[0];
  assert.equal(revokedEntitlement.status, "CANCELLED", "full cancellation should close entitlement");
  assert.ok(state.userFeaturePulls.some((entry) => entry?.paidFeatures?.$in?.includes("section_summary")), "full cancellation should pull paid feature");

  resetState();
  webhook = await signedWebhookRequest({ type: "Transaction.Paid", data: { paymentId: state.payment.merchantUid } });
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
  assertContains(indexSource, "__cdDirectKrwCheckoutInFlight", "main shell direct checkout single-flight guard");
  assertContains(indexSource, "__cdPaidServiceGateInFlight", "main shell paid service gate single-flight guard");
  assertContains(indexSource, "window.__cdDirectPaymentChoiceActive", "main shell payment choice modal lock");
  assertContains(indexSource, "_cdHasActivePaidServiceSingleFlight('__cdPaidServiceGateInFlight'", "main shell global paid gate duplicate lock");
  assertContains(destinyProfileSource, "__cdDirectKrwCheckoutInFlight", "runtime direct checkout single-flight guard");
  assertContains(destinyProfileSource, "_dpHasActivePaidServiceSingleFlight('__cdPaidServiceGateInFlight'", "runtime global paid gate duplicate lock");
  assertContains(destinyProfileSource, "__cdSinglePaymentGuard", "runtime payment guard marker");
  assertContains(clientPaymentSource, "window.PortOne.requestPayment(requestData)", "PortOne payment window call");
  assertContains(indexSource, "function _cdNormalizeKoreanPhoneNumber", "Inicis checkout phone normalizer");
  assertContains(indexSource, "_cdPromptDirectCheckoutPhoneNumber", "Inicis checkout phone prompt");
  assertContains(indexSource, "phoneNumber: customerPhone", "PortOne V2 customer phoneNumber");
  assertContains(indexSource, "hasBuyerPhoneNumber: Boolean(customerPhone)", "direct checkout safe phone presence log");
  assertContains(destinyProfileSource, "async function _dpEnsurePaymentPhoneNumber()", "runtime Inicis phone prompt");
  assertContains(destinyProfileSource, "customerPhone = await _dpEnsurePaymentPhoneNumber()", "runtime direct checkout phone fallback");
  assertContains(destinyProfileSource, "phoneNumber: customerPhone", "runtime PortOne V2 customer phoneNumber");
  assertBefore(destinyProfileSource, "customerPhone = await _dpEnsurePaymentPhoneNumber()", "window.PortOne.requestPayment(requestData)", "runtime phone fallback must run before PortOne window opens");
  // 두 결제 경로 모두 모달 오픈 시 프리페치해 둔 번호 조회 결과를 재사용해야 한다(왕복 1회 절감).
  // 예전에는 포인트 패키지 경로만 프리페치 없이 호출해 클릭 후 번호 조회 왕복이 한 번 더 있었다.
  assertContains(pointsPageSource, "ensurePaymentPhoneNumber(apiBase, authUser, paymentPhonePrefetchRef.current)", "points page reuses the prefetched payment phone lookup");
  assertContains(pointsPageSource, "phoneNumber: resolvedPhoneNumber", "points page PortOne phoneNumber");
  assertContains(mePageSource, "ensurePaymentPhoneNumber(apiBase, user)", "profile action phone fallback");
  assertContains(mePageSource, "phoneNumber: normalizePaymentPhoneNumber", "profile action PortOne phoneNumber");
  assertContains(clientPaymentSource, "if (!rsp || rsp.code || !paymentId)", "PortOne response.code failure handling");
  assertContains(clientPaymentSource, "paymentFailed", "failure UI state");
  assertContains(clientPaymentSource, "paymentSuccess", "success UI state");
  assertContains(indexSource, "if (status === 'checkingEntitlement') {", "checking entitlement UI state");
  assertContains(indexSource, "if (status === 'readyToPay' || status === 'noEntitlement')", "ready-to-pay UI state");
  assertContains(indexSource, "status === 'opening' || status === 'loadingProducts' || status === 'generationPreparing'", "pre-payment UI state");
  assertContains(indexSource, "if (status === 'paymentProcessing')", "payment processing UI state");
  assertContains(indexSource, "if (status === 'savingUnlock') return { title:", "unlock saving UI state");
  assertContains(indexSource, "redirectUrl.searchParams.set('portone_redirect', '1')", "mobile redirect marker");
  assertContains(paymentsRouteSource, 'redirectUrl.searchParams.set("payment_id", paymentId)', "redirectUrl carries paymentId");
  assertBefore(indexSource, "_cdHasVerifiedServerAccess(confirmRes.payload", "return confirmRes.payload", "server complete failure must block unlock success");
  assertBefore(indexSource, "if (!order.merchantUid && _cdIsCheckoutAccessBypass", "await _cdLoadPortOneV2Sdk()", "already unlocked/pass branch should not open payment modal");
  assertContains(indexSource, "alreadyUnlocked", "already unlocked branch");
  assertContains(pagesHeadersSource, "connect-src 'self'", "Cloudflare Pages CSP connect-src");
  assertContains(pagesHeadersSource, "connect-src 'self' https://code-destiny.com https://www.code-destiny.com https://code-destiny-web.bulegyung.workers.dev https://cdn.portone.io https://checkout-service.prod.iamport.co", "PortOne checkout prepare API must be allowed by connect-src");
  assertContains(pagesHeadersSource, "https://tx-gateway-service.prod.iamport.co", "KG Inicis virtual-account notification gateway must be allowed by CSP");
  assertContains(pagesHeadersSource, "frame-src 'self' https://checkout-service.prod.iamport.co", "PortOne checkout frame must be allowed by frame-src");
  assertContains(pagesHeadersSource, "form-action 'self' https://tx-gateway-service.prod.iamport.co", "KG Inicis virtual-account gateway form action must be allowed");
}

function runE2EStaticTests() {
  assertBefore(indexSource, "await _cdChooseServicePaymentMode({", "var directPayload = await (window._cdRunDirectKrwCheckout || _cdRunDirectKrwCheckout)({", "paid content click should choose before direct PortOne checkout");
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
  runPortOneRequestShapeTests();
  runE2EStaticTests();
  assertContains(portoneSource, "Authorization: `PortOne ${apiSecret}`", "PortOne REST authorization header");
  assertContains(portoneSource, "noticeUrl,", "PortOne public config should expose webhook notice URL");
  assert.equal(portoneMod.getPortOnePublicConfig(ENV).noticeUrl, "https://code-destiny.test/api/webhooks/portone", "PortOne public config should derive a default notice URL from SITE_BASE_URL");
  assertContains(paymentsRouteSource, "noticeUrl: config.noticeUrl", "payment config API should return PortOne notice URL");
  console.log("[verify-portone-single-payment-regression] PASS");
} finally {
  restoreMocks();
}

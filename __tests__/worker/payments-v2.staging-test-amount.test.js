/**
 * @jest-environment node
 *
 * 스테이징 전용 1,000원 테스트 결제 모드.
 *
 * 실결제 테스트가 불가능해 PG 결제창 → 승인 → 검증 → 웹훅 → 지급의 실제 왕복이 한 번도 실행되지
 * 않는다. 스테이징에서만 청구가를 1,000원으로 낮춰 그 왕복을 끝까지 돌려 보기 위한 오버라이드가
 * 있고, 이 파일이 지키는 것은 **그 오버라이드가 프로덕션에 절대 닿지 않는다**는 쪽이다.
 *
 * 판정 재료는 서버 env 두 개(APP_ENV·PAYMENT_TEST_AMOUNT_KRW)뿐이며 요청 본문·헤더·쿼리를 보지
 * 않는다 — 클라이언트가 `staging=true` 류 값을 보내 프로덕션에서 1,000원을 만들 수 없다. 두 조건
 * 중 하나라도 없으면 정가이고, 프로덕션에는 APP_ENV 자체가 없다(worker/wrangler.staging.toml 에만
 * 있다. 프로덕션 toml 에 새어 들어가는 것은 verify:worker-config-parity 의 STAGING_ONLY_KEYS 가 막는다).
 *
 * 🔴 지급은 금액을 읽지 않는다 — 청구가를 낮춰도 featureKey·subscriptionTier·기간이 그대로여야
 * 한다. 아래 "지급 불변" 단언이 그 축이다. PG·DB 는 전부 가짜 — 실결제·실 DB 없음.
 */
import { handlePaymentsContext } from "../../worker/payments/index.js";
import { resolveChargeAmountKRW, resolveTestChargeAmountKRW } from "../../worker/lib/portone.js";
import { applyTestChargeAmount } from "../../worker/lib/billing-policy.js";
import { listProducts } from "../../worker/payments/catalog.js";
import { resolveLegacyProduct } from "../../worker/payments/legacy-pricing.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const USER = "64b000000000000000000001";
const BASE_ENV = {
  JWT_ACCESS_SECRET: "test-access-secret-value-0123456789",
  PORTONE_STORE_ID: "store-test-1",
  PORTONE_CHANNEL_KEY: "channel-test-1",
  PORTONE_API_SECRET: "portone-secret-test",
};
/** 프로덕션 워커의 env 모양 — APP_ENV 가 없고 NODE_ENV 는 "production" 이다. */
const PROD_ENV = { ...BASE_ENV, NODE_ENV: "production" };
/** 스테이징 워커의 env 모양 — worker/wrangler.staging.toml [vars] 가 주는 두 값. */
const STAGING_ENV = { ...BASE_ENV, NODE_ENV: "production", APP_ENV: "staging", PAYMENT_TEST_AMOUNT_KRW: "1000" };

const PRODUCT = listProducts()[0]; // 레지스트리 정본에서 뽑는다 — 가격 개정에도 테스트가 흔들리지 않게.
const TEST_CHARGE = 1000;

async function tokenFor(userId) {
  const { signAuthToken } = await import("../../worker/lib/auth.js");
  return signAuthToken({ _id: userId, email: "t@e.st", role: "user", name: "t" }, BASE_ENV);
}

function seedUser(db) {
  db.rows.push({
    _id: USER,
    email: "buyer@example.com",
    name: "테스터",
    phoneNumber: "01012345678",
    destinyProfilesCurrentId: "profile-current-1",
    profileSubscription: { tier: "free", expiresAt: null },
  });
}

async function post(db, env, path, body, { headers = {}, legacyEnvelope } = {}) {
  const request = new Request(`https://code-destiny.com${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await tokenFor(USER)}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const response = await handlePaymentsContext(request, env, {
    prefix: "/api/payments",
    ...(legacyEnvelope ? { legacyEnvelope } : {}),
    withDb: (_e, _ctx, fn) => fn(db),
  });
  return { response, payload: await response.json() };
}

function passBody(tier, overrides = {}) {
  return {
    tier,
    planId: `${tier}_1m`,
    durationMonths: 1,
    durationDays: 30,
    currency: "KRW",
    productType: "membership_pass",
    paymentMethod: "card_general",
    ...overrides,
  };
}

describe("환경 판정 — 두 조건 AND, 기본값은 정가", () => {
  test("프로덕션 env 는 정가를 그대로 돌려준다(같은 객체 아이덴티티가 아니라 같은 값)", () => {
    expect(resolveTestChargeAmountKRW(PROD_ENV)).toBe(0);
    expect(resolveChargeAmountKRW(PROD_ENV, 10_000)).toBe(10_000);
    expect(resolveChargeAmountKRW({}, 10_000)).toBe(10_000);
    expect(resolveChargeAmountKRW(undefined, 10_000)).toBe(10_000);
  });

  test("APP_ENV 만 있고 금액 var 이 없으면 정가 — fail-safe 기본값", () => {
    expect(resolveChargeAmountKRW({ ...BASE_ENV, APP_ENV: "staging" }, 10_000)).toBe(10_000);
  });

  test("금액 var 만 있고 APP_ENV 가 없으면 정가 — 프로덕션 toml 에 값이 새어도 혼자서는 못 켠다", () => {
    expect(resolveChargeAmountKRW({ ...PROD_ENV, PAYMENT_TEST_AMOUNT_KRW: "1000" }, 10_000)).toBe(10_000);
  });

  test("스테이징 + 1000 이면 어떤 정가든 1,000원으로 청구한다", () => {
    expect(resolveTestChargeAmountKRW(STAGING_ENV)).toBe(TEST_CHARGE);
    expect(resolveChargeAmountKRW(STAGING_ENV, 10_000)).toBe(TEST_CHARGE);
    expect(resolveChargeAmountKRW(STAGING_ENV, 50_000)).toBe(TEST_CHARGE);
    expect(resolveChargeAmountKRW(STAGING_ENV, 9_900)).toBe(TEST_CHARGE);
  });

  test("이니시스 최소 승인금액(1,000원) 미만은 무시하고 정가로 돌아간다", () => {
    expect(resolveChargeAmountKRW({ ...STAGING_ENV, PAYMENT_TEST_AMOUNT_KRW: "500" }, 10_000)).toBe(10_000);
    expect(resolveChargeAmountKRW({ ...STAGING_ENV, PAYMENT_TEST_AMOUNT_KRW: "0" }, 10_000)).toBe(10_000);
    expect(resolveChargeAmountKRW({ ...STAGING_ENV, PAYMENT_TEST_AMOUNT_KRW: "not-a-number" }, 10_000)).toBe(10_000);
  });

  test("정가보다 비싸게 청구하지 않는다 — min(청구가, 정가)", () => {
    expect(resolveChargeAmountKRW({ ...STAGING_ENV, PAYMENT_TEST_AMOUNT_KRW: "5000" }, 3_000)).toBe(3_000);
    expect(applyTestChargeAmount(3_000, 5_000)).toBe(3_000);
    expect(applyTestChargeAmount(10_000, 0)).toBe(10_000);
    expect(applyTestChargeAmount(0, 1_000)).toBe(0); // 0원 상품에 청구가를 만들지 않는다
  });
});

describe("단건 주문(POST /orders) — 카드·카카오페이 공통 경로", () => {
  test("프로덕션은 정가 주문 그대로다", async () => {
    const db = makeFakePaymentDb();
    seedUser(db);
    const { response, payload } = await post(db, PROD_ENV, "/api/payments/orders", { productId: PRODUCT.productId, idempotencyKey: "orders-prod-1" });
    expect(response.status).toBe(200);
    expect(payload.amountKRW).toBe(PRODUCT.priceKRW);
    expect(payload.order.amountKRW).toBe(PRODUCT.priceKRW);
  });

  test("스테이징은 주문 금액만 1,000원이고 상품 식별은 그대로다", async () => {
    const db = makeFakePaymentDb();
    seedUser(db);
    const { response, payload } = await post(db, STAGING_ENV, "/api/payments/orders", { productId: PRODUCT.productId, idempotencyKey: "orders-stg-1" });
    expect(response.status).toBe(200);
    expect(payload.amountKRW).toBe(TEST_CHARGE);
    expect(payload.order.amountKRW).toBe(TEST_CHARGE);
    // 🔴 지급 불변 — grantOrderEntitlement 가 읽는 두 필드는 정가 주문과 완전히 같아야 한다.
    expect(payload.order.productId).toBe(PRODUCT.productId);
    expect(payload.order.featureKey).toBe(PRODUCT.featureKey);
  });
});

describe("컷오버 어댑터(POST /prepare) — 셸·PointsClient 가 쓰는 경로", () => {
  const body = {
    paymentType: "digital_content",
    productId: PRODUCT.productId,
    featureKey: PRODUCT.featureKey,
    paymentAmount: PRODUCT.priceKRW, // 프론트는 표시가(=정가)를 그대로 보낸다
    paymentMethod: "CARD",
  };

  test("프로덕션은 정가 주문 그대로다", async () => {
    const db = makeFakePaymentDb();
    seedUser(db);
    const { response, payload } = await post(db, PROD_ENV, "/api/payments/prepare", body);
    expect(response.status).toBe(201);
    expect(payload.order.paymentAmount).toBe(PRODUCT.priceKRW);
  });

  test("스테이징: 프론트가 정가를 보내도 트립와이어를 통과하고 주문에는 1,000원이 실린다", async () => {
    const db = makeFakePaymentDb();
    seedUser(db);
    const { response, payload } = await post(db, STAGING_ENV, "/api/payments/prepare", body);
    expect(response.status).toBe(201);
    // 프론트는 이 값을 그대로 PortOne totalAmount 로 넘긴다 → PG 창이 1,000원이 된다.
    expect(payload.order.paymentAmount).toBe(TEST_CHARGE);
    expect(payload.order.amountKRW).toBe(TEST_CHARGE);
    expect(payload.order.featureKey).toBe(PRODUCT.featureKey);
    // 🔴 화면 표시가(pricing)는 정가로 남는다 — 상품 가치는 바뀌지 않았다.
    const listed = resolveLegacyProduct(body);
    const shownKRW = Number(payload.order.pricing?.amountKRW ?? payload.order.pricing?.priceKRW);
    expect(shownKRW).toBe(Number(listed.priceKRW));
  });

  test("스테이징: 재개 경로가 주문에 기록된 청구가를 되보내도 통과한다", async () => {
    const db = makeFakePaymentDb();
    seedUser(db);
    const { response } = await post(db, STAGING_ENV, "/api/payments/prepare", { ...body, paymentAmount: TEST_CHARGE });
    expect(response.status).toBe(201);
  });

  test("프로덕션에서 1,000원을 보내면 종전대로 CLIENT_AMOUNT_MISMATCH 로 막힌다", async () => {
    const db = makeFakePaymentDb();
    seedUser(db);
    const { response, payload } = await post(db, PROD_ENV, "/api/payments/prepare", { ...body, paymentAmount: TEST_CHARGE });
    expect(response.status).toBe(400);
    expect(payload.code || payload.error?.code).toBe("CLIENT_AMOUNT_MISMATCH");
  });
});

describe("이용권(POST /subscription/prepare)", () => {
  test("프로덕션은 정가 주문이고, 1,000원 바디는 SUBSCRIPTION_PRICE_MISMATCH 로 막힌다", async () => {
    const db = makeFakePaymentDb();
    seedUser(db);
    const ok = await post(db, PROD_ENV, "/api/payments/subscription/prepare", passBody("standard"), {
      headers: { "Idempotency-Key": "prod-1" },
    });
    expect(ok.response.status).toBe(201);
    expect(ok.payload.order.paymentAmount).toBeGreaterThan(TEST_CHARGE);

    const blocked = await post(db, PROD_ENV, "/api/payments/subscription/prepare", passBody("standard", { amount: TEST_CHARGE }), {
      headers: { "Idempotency-Key": "prod-2" },
    });
    expect(blocked.response.status).toBe(400);
    expect(blocked.payload.code || blocked.payload.error?.code).toBe("SUBSCRIPTION_PRICE_MISMATCH");
  });

  test("스테이징: 정가·청구가 둘 다 정답이고 주문에는 1,000원이 실린다", async () => {
    const db = makeFakePaymentDb();
    seedUser(db);
    const listPriceKRW = (await post(db, PROD_ENV, "/api/payments/subscription/prepare", passBody("standard"), {
      headers: { "Idempotency-Key": "ref-1" },
    })).payload.order.paymentAmount;

    const byList = await post(db, STAGING_ENV, "/api/payments/subscription/prepare", passBody("standard", { amount: listPriceKRW }), {
      headers: { "Idempotency-Key": "stg-1" },
    });
    expect(byList.response.status).toBe(201);
    expect(byList.payload.order.paymentAmount).toBe(TEST_CHARGE);

    const byCharge = await post(db, STAGING_ENV, "/api/payments/subscription/prepare", passBody("standard", { amount: TEST_CHARGE }), {
      headers: { "Idempotency-Key": "stg-2" },
    });
    expect(byCharge.response.status).toBe(201);
    expect(byCharge.payload.order.paymentAmount).toBe(TEST_CHARGE);
  });

  test("스테이징에서도 엉뚱한 금액은 종전대로 막힌다", async () => {
    const db = makeFakePaymentDb();
    seedUser(db);
    const { response, payload } = await post(db, STAGING_ENV, "/api/payments/subscription/prepare", passBody("standard", { amount: 5000 }), {
      headers: { "Idempotency-Key": "stg-bad" },
    });
    expect(response.status).toBe(400);
    expect(payload.code || payload.error?.code).toBe("SUBSCRIPTION_PRICE_MISMATCH");
  });

  test("🔴 지급 불변 — 청구가만 다르고 등급·기간·프로필 한도는 정가 주문과 같다", async () => {
    const prodDb = makeFakePaymentDb();
    seedUser(prodDb);
    const prod = await post(prodDb, PROD_ENV, "/api/payments/subscription/prepare", passBody("premium"), {
      headers: { "Idempotency-Key": "grant-prod" },
    });
    const stagingDb = makeFakePaymentDb();
    seedUser(stagingDb);
    const staging = await post(stagingDb, STAGING_ENV, "/api/payments/subscription/prepare", passBody("premium"), {
      headers: { "Idempotency-Key": "grant-stg" },
    });
    expect(prod.response.status).toBe(201);
    expect(staging.response.status).toBe(201);
    expect(staging.payload.order.paymentAmount).toBe(TEST_CHARGE);

    for (const key of ["tier", "planId", "durationMonths", "durationDays", "profileLimit", "productType", "productName", "recurring"]) {
      expect(staging.payload.order[key]).toEqual(prod.payload.order[key]);
    }
  });
});

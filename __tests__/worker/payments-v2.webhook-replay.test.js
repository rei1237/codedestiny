/**
 * @jest-environment node
 *
 * 웹훅 재생 — 실패·정체된 Transaction.Paid 이벤트를 10분 크론이 V2 confirmOrder 로 다시 돌린다.
 *
 * 왜 있나(2026-09-05): 프로덕션 워커의 PortOne 시크릿이 죽어 있는 동안 웹훅은 전부 PG_UNAVAILABLE 로
 * failed 가 됐고, 구 일일 재생(runWebhookReconcileTask)은 그 이벤트를 레거시 단건 정산 경로로 보내
 * 이용권 주문에 404 를 내며 lastError 를 덮어썼다. 돈은 나갔는데 이용권이 없는 상태가 하루 넘게 남았다.
 * 이 테스트가 확인하는 것: (a) 실패 이벤트가 웹훅과 같은 경로로 확정·지급된다 (b) 손대면 안 되는 이벤트는
 * 손대지 않는다 (c) 실패 사유에 PortOne 의 말이 남고 다음 틱이 다시 잡는다 (d) PAID 재생은 PG 를 안 부른다.
 * PG 는 전부 주입 — 실결제·실 DB 없음.
 */
import { handlePaymentsContext, replayWebhookEvents } from "../../worker/payments/index.js";
import { WEBHOOK_STALE_PROCESSING_MS } from "../../worker/payments/webhook.js";
import { __passesTestUtils } from "../../worker/payments/passes.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const USER = "64b000000000000000000001";
const ENV = {
  JWT_ACCESS_SECRET: "test-access-secret-value-0123456789",
  PORTONE_STORE_ID: "store-test-1",
  PORTONE_CHANNEL_KEY: "channel-test-1",
  PORTONE_API_SECRET: "portone-secret-test",
};
const withDbOf = (db) => (_env, _ctx, fn) => fn(db);
const pgPaidFor = (order) => async () => ({
  paymentId: order.merchantUid, status: "paid", amount: __passesTestUtils.PASS_MONTHLY_WON[order.tier], currency: "KRW",
  pay_method: "card", paid_at: Math.floor(Date.now() / 1000),
});
const pgMustNotBeCalled = async () => { throw new Error("PG must not be called for a PAID replay"); };

function seedUser(db) {
  const user = { _id: USER, email: "buyer@example.com", name: "테스터", phoneNumber: "01012345678", points: 0, profileSubscription: { tier: "free", expiresAt: null } };
  db.rows.push(user);
  return user;
}

async function prepareOrder(db, tier, idempotencyKey) {
  const { signAuthToken } = await import("../../worker/lib/auth.js");
  const token = await signAuthToken({ _id: USER, email: "t@e.st", role: "user", name: "t" }, ENV);
  const request = new Request("https://code-destiny.com/api/payments/subscription/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({
      tier, planId: `${tier}_1m`, durationMonths: 1, durationDays: 30, amount: __passesTestUtils.PASS_MONTHLY_WON[tier],
      currency: "KRW", productType: "membership_pass", paymentMethod: "card_general",
    }),
  });
  const response = await handlePaymentsContext(request, ENV, { prefix: "/api/payments", withDb: withDbOf(db) });
  expect(response.status).toBe(201);
  return (await response.json()).order;
}

function seedEvent(db, overrides = {}) {
  const at = overrides.lastAttemptAt || new Date(Date.now() - 60_000);
  const event = {
    provider: "portone", eventId: `evt_${Math.random().toString(36).slice(2, 8)}`, eventType: "Transaction.Paid",
    paymentId: "", status: "failed", attempts: 1, receivedAt: at, lastAttemptAt: at, processedAt: null, lastError: "old", ...overrides,
  };
  db.rows.push(event);
  return event;
}

describe("실패한 Transaction.Paid 이벤트의 재생", () => {
  test("🔴 PENDING 주문을 웹훅과 같은 confirmOrder 로 확정·지급하고 이벤트를 processed 로 닫는다", async () => {
    const db = makeFakePaymentDb({ uniqueKeys: [["provider", "eventId"]] });
    const user = seedUser(db);
    const order = await prepareOrder(db, "premium", "replay-pending");
    const event = seedEvent(db, { paymentId: order.merchantUid });

    const summary = await replayWebhookEvents(ENV, { withDb: withDbOf(db), deps: { fetchPayment: pgPaidFor(order) } });

    expect(summary).toMatchObject({ scanned: 1, processed: 1, failed: 0, contended: 0 });
    const row = db.rows.find((r) => r.merchantUid === order.merchantUid);
    expect(row.status).toBe("paid");
    expect(row.entitlementGrantedAt).toBeTruthy();
    expect(user.profileSubscription.tier).toBe("premium");
    expect(user.profileSubscription.lastPassOrderId).toBe(order.merchantUid);
    expect(event.status).toBe("processed");
    expect(event.attempts).toBe(2);
    expect(event.lastError).toBe("");
  });

  test("🔴 PAID+미지급 주문은 PG 를 다시 부르지 않고 지급만 마무리한다", async () => {
    const db = makeFakePaymentDb({ uniqueKeys: [["provider", "eventId"]] });
    const user = seedUser(db);
    const order = await prepareOrder(db, "standard", "replay-paid-ungranted");
    Object.assign(db.rows.find((r) => r.merchantUid === order.merchantUid), { status: "paid", paidAt: new Date(), entitlementGrantedAt: null });
    const event = seedEvent(db, { paymentId: order.merchantUid });

    const summary = await replayWebhookEvents(ENV, { withDb: withDbOf(db), deps: { fetchPayment: pgMustNotBeCalled } });

    expect(summary).toMatchObject({ scanned: 1, processed: 1, failed: 0 });
    expect(user.profileSubscription.tier).toBe("standard");
    expect(event.status).toBe("processed");
  });

  test("손대면 안 되는 이벤트는 손대지 않는다 — processed · 시도 소진 · 비-Paid · 살아 있는 processing", async () => {
    const db = makeFakePaymentDb({ uniqueKeys: [["provider", "eventId"]] });
    seedUser(db);
    const order = await prepareOrder(db, "standard", "replay-untouchable");
    const untouched = [
      seedEvent(db, { paymentId: order.merchantUid, status: "processed", processedAt: new Date() }),
      seedEvent(db, { paymentId: order.merchantUid, status: "failed", attempts: 10 }),
      seedEvent(db, { paymentId: order.merchantUid, status: "failed", eventType: "Transaction.Cancelled" }),
      seedEvent(db, { paymentId: order.merchantUid, status: "processing", lastAttemptAt: new Date(Date.now() - WEBHOOK_STALE_PROCESSING_MS / 2) }),
    ];
    const before = untouched.map((e) => ({ status: e.status, attempts: e.attempts }));

    const summary = await replayWebhookEvents(ENV, { withDb: withDbOf(db), deps: { fetchPayment: pgMustNotBeCalled } });

    expect(summary).toMatchObject({ scanned: 0, processed: 0, failed: 0 });
    expect(untouched.map((e) => ({ status: e.status, attempts: e.attempts }))).toEqual(before);
    expect(db.rows.find((r) => r.merchantUid === order.merchantUid).status).toBe("pending");
  });

  test("정체된 processing(2분 초과)은 죽은 형제로 보고 다시 잡는다", async () => {
    const db = makeFakePaymentDb({ uniqueKeys: [["provider", "eventId"]] });
    seedUser(db);
    const order = await prepareOrder(db, "standard", "replay-stale");
    const event = seedEvent(db, { paymentId: order.merchantUid, status: "processing", lastAttemptAt: new Date(Date.now() - WEBHOOK_STALE_PROCESSING_MS - 1_000) });

    const summary = await replayWebhookEvents(ENV, { withDb: withDbOf(db), deps: { fetchPayment: pgPaidFor(order) } });

    expect(summary).toMatchObject({ scanned: 1, processed: 1 });
    expect(event.status).toBe("processed");
  });

  test("🔴 PG 에 닿지 못하면 주문은 그대로 두고, lastError 에 PortOne 의 사유를 남기며, 다음 틱이 다시 잡는다", async () => {
    const db = makeFakePaymentDb({ uniqueKeys: [["provider", "eventId"]] });
    seedUser(db);
    const order = await prepareOrder(db, "premium", "replay-pg-down");
    const event = seedEvent(db, { paymentId: order.merchantUid });
    const pgDown = async () => { throw new Error("PortOne payment lookup failed: UNAUTHORIZED"); };

    const first = await replayWebhookEvents(ENV, { withDb: withDbOf(db), deps: { fetchPayment: pgDown } });
    expect(first).toMatchObject({ scanned: 1, processed: 0, failed: 1 });
    expect(event.status).toBe("failed");
    expect(event.attempts).toBe(2);
    expect(event.lastError).toContain("PG_UNAVAILABLE");
    expect(event.lastError).toContain("UNAUTHORIZED"); // 사용자 문구 뒤에 PortOne 의 말이 숨으면 시크릿 사고를 하루 늦게 안다
    expect(db.rows.find((r) => r.merchantUid === order.merchantUid).status).toBe("pending");

    // 시크릿이 고쳐진 다음 틱: 같은 이벤트를 다시 잡아 확정한다.
    const second = await replayWebhookEvents(ENV, { withDb: withDbOf(db), deps: { fetchPayment: pgPaidFor(order) } });
    expect(second).toMatchObject({ scanned: 1, processed: 1, failed: 0 });
    expect(event.status).toBe("processed");
    expect(event.attempts).toBe(3);
    expect(db.rows.find((r) => r.merchantUid === order.merchantUid).status).toBe("paid");
  });

  test("주문이 없는 이벤트는 실패로 남기고 사유를 적는다 — 조용히 processed 로 닫지 않는다", async () => {
    const db = makeFakePaymentDb({ uniqueKeys: [["provider", "eventId"]] });
    const event = seedEvent(db, { paymentId: "sub_s1m_ghost" });

    const summary = await replayWebhookEvents(ENV, { withDb: withDbOf(db), deps: { fetchPayment: pgMustNotBeCalled } });

    expect(summary).toMatchObject({ scanned: 1, failed: 1 });
    expect(event.status).toBe("failed");
    expect(event.lastError).toContain("ORDER_NOT_FOUND");
  });
});

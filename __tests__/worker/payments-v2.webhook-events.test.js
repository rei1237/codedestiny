/**
 * @jest-environment node
 *
 * 비-Paid PG 이벤트의 컷오버 패리티. 구 웹훅은 Failed·Cancelled·PartialCancelled 를 처리했고,
 * V2 가 Paid 만 다루면 컷오버 순간 PG 발 취소·실패 상태 전이가 조용히 사라진다 — 그 승계
 * (applyNonPaidPgEvent)를 서명된 요청으로 라우트 레벨에서 검증한다.
 * VirtualAccountIssued 는 카드 전용 서비스(클라이언트 노출 0건, 2026-08-12 확인)라 의도적
 * 미지원 — "ack 만 하고 상태는 건드리지 않는다"를 여기서 고정한다.
 */
import { handlePaymentsContext } from "../../worker/payments/index.js";
import { signWebhookPayload } from "../../worker/payments/webhook.js";
import { __ordersTestUtils } from "../../worker/payments/orders.js";
import { CONTENT_ENTITLEMENT_STATUSES } from "../../worker/lib/models.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const SECRET = "whsec_dGVzdC1zZWNyZXQtdmFsdWU=";
const ENV = { PORTONE_webhook: SECRET, PORTONE_WEBHOOK_SECRET: SECRET };
const PAID_STATUS = __ordersTestUtils.PAID_RAW_STATUSES[0];

let eventSeq = 0;

async function postWebhook(db, body) {
  const rawBody = JSON.stringify(body);
  const eventId = `evt_${(eventSeq += 1)}`;
  // 🔴 고정 리터럴을 쓰지 않는다 — acceptWebhook 이 신선도를 보므로 박아 둔 값은 며칠 뒤
  //    전 케이스를 401 로 만든다(실제로 1786000000 이 그렇게 됐다).
  const timestamp = String(Math.floor(Date.now() / 1000));
  const request = new Request("https://code-destiny.com/api/payments/webhook", {
    method: "POST",
    body: rawBody,
    headers: {
      "content-type": "application/json",
      "webhook-id": eventId,
      "webhook-timestamp": timestamp,
      "webhook-signature": `v1,${await signWebhookPayload(SECRET, eventId, timestamp, rawBody)}`,
    },
  });
  const withDb = async (_env, _ctx, fn) => fn(db);
  const response = await handlePaymentsContext(request, ENV, { prefix: "/api/payments", withDb });
  return { response, payload: await response.json() };
}

const makeDb = () => makeFakePaymentDb({ uniqueKeys: [["provider", "eventId"]] });

function seedOrder(db, overrides = {}) {
  const order = {
    merchantUid: "cdorder1",
    userId: "u1",
    productId: "test-product",
    featureKey: "test-feature",
    paymentType: "digital_content",
    status: "pending",
    paymentAmount: 5000,
    createdAt: new Date(),
    ...overrides,
  };
  db.rows.push(order);
  return order;
}

test("Transaction.Failed: PENDING 주문은 실패로 확정된다", async () => {
  const db = makeDb();
  const order = seedOrder(db);
  const { response, payload } = await postWebhook(db, { type: "Transaction.Failed", data: { paymentId: order.merchantUid } });
  expect(response.status).toBe(200);
  expect(payload).toMatchObject({ ok: true, event: "failed", marked: true });
  expect(order.status).toBe("failed");
  expect(order.failureCode).toBe("pg_webhook_failed");
});

test("Transaction.Failed: 결제 완료 주문은 절대 실패로 바뀌지 않는다(멱등 ack)", async () => {
  const db = makeDb();
  const order = seedOrder(db, { status: PAID_STATUS, paidAt: new Date() });
  const { response, payload } = await postWebhook(db, { type: "Transaction.Failed", data: { paymentId: order.merchantUid } });
  expect(response.status).toBe(200);
  expect(payload).toMatchObject({ ok: true, event: "failed", marked: false });
  expect(order.status).toBe(PAID_STATUS);
});

test("Transaction.Cancelled: PENDING 주문은 취소된다", async () => {
  const db = makeDb();
  const order = seedOrder(db);
  const { payload } = await postWebhook(db, { type: "Transaction.Cancelled", data: { paymentId: order.merchantUid } });
  expect(payload).toMatchObject({ ok: true, event: "cancelled", cancelled: true });
  expect(order.status).toBe("cancelled");
  expect(order.failureCode).toBe("PG_CANCELLED");
});

test("Transaction.Cancelled: PAID 주문은 환불 정산 + 권한 회수 + 검토 마커", async () => {
  const db = makeDb();
  const order = seedOrder(db, { status: PAID_STATUS, paidAt: new Date(), entitlementGrantedAt: new Date() });
  db.rows.push({ orderId: order.merchantUid, status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE, userId: "u1" });
  const { payload } = await postWebhook(db, { type: "Transaction.Cancelled", data: { paymentId: order.merchantUid } });
  expect(payload).toMatchObject({ ok: true, event: "cancelled", refunded: true, revoked: true, reviewRequired: false });
  expect(order.status).toBe("refunded");
  const entitlement = db.rows.find((r) => r.orderId === order.merchantUid);
  expect(entitlement.status).toBe(CONTENT_ENTITLEMENT_STATUSES.REFUNDED);
});

test("Transaction.Cancelled: 회수할 활성 권한이 없으면 관리자 검토 마커를 남긴다", async () => {
  const db = makeDb();
  const order = seedOrder(db, { status: PAID_STATUS, paidAt: new Date() });
  const { payload } = await postWebhook(db, { type: "Transaction.Cancelled", data: { paymentId: order.merchantUid } });
  expect(payload).toMatchObject({ ok: true, event: "cancelled", refunded: true, revoked: false, reviewRequired: true });
  // fixture 가 Mongo dot notation $set 을 중첩으로 반영한다(실제 드라이버 시맨틱과 동일).
  expect(order.metadata.cancellationReviewRequired).toBe(true);
  expect(order.failureStage).toBe("webhook_cancel_admin_review");
});

test("Transaction.PartialCancelled: 상태·권한은 건드리지 않고 검토 마커만 남긴다", async () => {
  const db = makeDb();
  const order = seedOrder(db, { status: PAID_STATUS, paidAt: new Date(), entitlementGrantedAt: new Date() });
  db.rows.push({ orderId: order.merchantUid, status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE, userId: "u1" });
  const { payload } = await postWebhook(db, { type: "Transaction.PartialCancelled", data: { paymentId: order.merchantUid } });
  expect(payload).toMatchObject({ ok: true, event: "partial-cancelled", reviewRequired: true });
  expect(order.status).toBe(PAID_STATUS);
  expect(order.failureCode).toBe("partial_cancel_admin_review");
  const entitlement = db.rows.find((r) => r.orderId === order.merchantUid);
  expect(entitlement.status).toBe(CONTENT_ENTITLEMENT_STATUSES.ACTIVE);
});

test("Transaction.VirtualAccountIssued: 카드 전용 서비스 — ack 만 하고 아무것도 바꾸지 않는다", async () => {
  const db = makeDb();
  const order = seedOrder(db);
  const { response, payload } = await postWebhook(db, { type: "Transaction.VirtualAccountIssued", data: { paymentId: order.merchantUid } });
  expect(response.status).toBe(200);
  expect(payload).toMatchObject({ ok: true, ignored: true });
  expect(order.status).toBe("pending");
});

test("모르는 주문의 취소 이벤트는 조용히 ack 한다(재전송 요구 없음)", async () => {
  const db = makeDb();
  const { response, payload } = await postWebhook(db, { type: "Transaction.Cancelled", data: { paymentId: "cd-unknown" } });
  expect(response.status).toBe(200);
  expect(payload).toMatchObject({ ok: true, ignored: true, reason: "ORDER_NOT_FOUND" });
});

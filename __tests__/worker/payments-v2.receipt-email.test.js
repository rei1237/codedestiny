/**
 * @jest-environment node
 *
 * 구매 확인 메일 — 전자상거래법 제13조 통지.
 *
 * 지키려는 것 셋:
 *   1) **첫 배포에 과거 주문으로 메일이 나가지 않는다.** 나이 창이 없으면 기능 도입 전에 결제한
 *      사람에게 갑자기 영수증이 간다. 그건 기능이 아니라 사고다.
 *   2) **한 주문에 한 통.** 확정 주체가 셋(클라이언트·webhook·크론)이고 크론은 10분마다 돈다.
 *   3) **법정 표기는 번역본이 아니라 등록 원문**이 실린다(2026-08-20 사업자 표기 사고와 같은 축).
 */
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";
import {
  RECEIPT_MAX_AGE_MS,
  buildReceiptEmail,
  sendPendingReceiptEmails,
} from "../../worker/payments/receipt-email.js";
import { BUSINESS_IDENTITY } from "../../lib/site-policy-config.js";
import { RECEIPT_WITHDRAWAL_ROWS } from "../../lib/legal/refund-policy-rows.js";

const USER_ID = "64b000000000000000000001";
const ENV = {};
const NOW = new Date("2026-08-20T12:00:00Z");

function seed(db, overrides = {}) {
  // 🔴 _id 는 주문의 userId 와 같아야 한다 — 다르면 조회가 빗나가 "주소 없음" 경로로 새고,
  //    그러면 발송 테스트가 아무것도 검증하지 않는다(첫 작성 때 실제로 그랬다).
  db.rows.push({ _id: USER_ID, email: "buyer@example.com" });
  const order = {
    _id: "pay-1",
    merchantUid: "cd_order_0001",
    userId: USER_ID,
    status: "paid",
    paymentAmount: 10000,
    paymentMethod: "card",
    featureKey: "saju_premium",
    paidAt: new Date(NOW.getTime() - 60_000),
    entitlementGrantedAt: new Date(NOW.getTime() - 30_000),
    receiptEmailSentAt: null,
    ...overrides,
  };
  db.rows.push(order);
  return order;
}

/** 🔴 실메일 발송 금지. 항상 주입한다. */
function recorder(result = { ok: true }) {
  const calls = [];
  return {
    calls,
    send: async (_env, payload) => {
      calls.push(payload);
      return typeof result === "function" ? result(payload) : result;
    },
  };
}

describe("sendPendingReceiptEmails", () => {
  test("정상 주문 한 건에 한 통 보내고 표식을 찍는다", async () => {
    const db = makeFakePaymentDb();
    const order = seed(db);
    const mail = recorder();

    const report = await sendPendingReceiptEmails(ENV, db, { now: NOW, send: mail.send });

    expect(report).toMatchObject({ scanned: 1, sent: 1, skipped: 0, failed: 0 });
    expect(mail.calls).toHaveLength(1);
    expect(mail.calls[0].to).toBe("buyer@example.com");
    expect(order.receiptEmailSentAt).toBeInstanceOf(Date);
  });

  test("🔴 두 번 돌려도 두 번째는 보내지 않는다 (크론은 10분마다 돈다)", async () => {
    const db = makeFakePaymentDb();
    seed(db);
    const mail = recorder();

    await sendPendingReceiptEmails(ENV, db, { now: NOW, send: mail.send });
    const second = await sendPendingReceiptEmails(ENV, db, { now: NOW, send: mail.send });

    expect(mail.calls).toHaveLength(1);
    expect(second.scanned).toBe(0);
  });

  test("🔴 나이 창 밖 주문은 대상이 아니다 — 첫 배포 백필 금지", async () => {
    const db = makeFakePaymentDb();
    seed(db, { paidAt: new Date(NOW.getTime() - RECEIPT_MAX_AGE_MS - 60_000) });
    const mail = recorder();

    const report = await sendPendingReceiptEmails(ENV, db, { now: NOW, send: mail.send });

    expect(report.scanned).toBe(0);
    expect(mail.calls).toHaveLength(0);
  });

  test("지급이 끝나지 않은 주문에는 보내지 않는다 (없는 것을 받았다고 말하지 않는다)", async () => {
    const db = makeFakePaymentDb();
    seed(db, { entitlementGrantedAt: null });
    const mail = recorder();

    const report = await sendPendingReceiptEmails(ENV, db, { now: NOW, send: mail.send });

    expect(report.scanned).toBe(0);
    expect(mail.calls).toHaveLength(0);
  });

  test("환불된 주문에는 보내지 않는다", async () => {
    const db = makeFakePaymentDb();
    seed(db, { status: "refunded" });
    const mail = recorder();

    const report = await sendPendingReceiptEmails(ENV, db, { now: NOW, send: mail.send });

    expect(report.scanned).toBe(0);
    expect(mail.calls).toHaveLength(0);
  });

  test("발송이 실패하면 표식을 되돌려 다음 회차가 다시 잡는다", async () => {
    const db = makeFakePaymentDb();
    const order = seed(db);
    const failing = recorder({ ok: false, error: "resend_error" });

    const first = await sendPendingReceiptEmails(ENV, db, { now: NOW, send: failing.send });
    expect(first).toMatchObject({ sent: 0, failed: 1 });
    expect(order.receiptEmailSentAt).toBeNull();

    const ok = recorder();
    const second = await sendPendingReceiptEmails(ENV, db, { now: NOW, send: ok.send });
    expect(second.sent).toBe(1);
    expect(ok.calls).toHaveLength(1);
  });

  test("send 가 던져도 스윕이 죽지 않고 실패로 센다", async () => {
    const db = makeFakePaymentDb();
    const order = seed(db);
    const throwing = { send: async () => { throw new Error("network down"); } };

    const report = await sendPendingReceiptEmails(ENV, db, { now: NOW, send: throwing.send });

    expect(report).toMatchObject({ sent: 0, failed: 1 });
    expect(order.receiptEmailSentAt).toBeNull();
  });

  test("🔴 계정 설정 실패면 첫 주문에서 배치를 멈춘다 (같은 403 을 주문 수만큼 쌓지 않는다)", async () => {
    const db = makeFakePaymentDb();
    const first = seed(db);
    const second = seed(db, { _id: "pay-2", merchantUid: "cd_order_0002" });
    const failing = recorder({ ok: false, status: 403, error: "domain is not verified", configError: true, from: "Code Destiny <admin@code-destiny.com>" });

    const report = await sendPendingReceiptEmails(ENV, db, { now: NOW, send: failing.send });

    expect(failing.calls).toHaveLength(1);
    expect(report).toMatchObject({ scanned: 2, sent: 0, failed: 1, configError: true });
    // 🔴 선점은 풀려 있어야 한다 — 설정이 고쳐지면 다음 크론이 두 건 다 다시 잡는다.
    expect(first.receiptEmailSentAt).toBeNull();
    expect(second.receiptEmailSentAt).toBeNull();
  });

  test("🔴 수신자별 실패는 배치를 멈추지 않는다 (일시적 실패 한 건이 그 회차를 죽이면 안 된다)", async () => {
    const db = makeFakePaymentDb();
    seed(db);
    seed(db, { _id: "pay-2", merchantUid: "cd_order_0002" });
    const failing = recorder({ ok: false, status: 500, error: "resend_error" });

    const report = await sendPendingReceiptEmails(ENV, db, { now: NOW, send: failing.send });

    expect(failing.calls).toHaveLength(2);
    expect(report).toMatchObject({ scanned: 2, sent: 0, failed: 2, configError: false });
  });

  test("이메일 주소가 없으면 표식을 찍고 넘어간다 — 매 크론 무한 재시도 금지", async () => {
    const db = makeFakePaymentDb();
    const order = { _id: "pay-2", merchantUid: "cd_order_0002", userId: "64b000000000000000000009", status: "paid", paymentAmount: 5000, paidAt: new Date(NOW.getTime() - 60_000), entitlementGrantedAt: new Date(NOW.getTime() - 30_000), receiptEmailSentAt: null };
    db.rows.push(order);
    const mail = recorder();

    const report = await sendPendingReceiptEmails(ENV, db, { now: NOW, send: mail.send });

    expect(report).toMatchObject({ scanned: 1, sent: 0, skipped: 1 });
    expect(mail.calls).toHaveLength(0);
    expect(order.receiptEmailSentAt).toBeInstanceOf(Date);
  });
});

describe("buildReceiptEmail", () => {
  const order = {
    merchantUid: "cd_order_0001",
    paymentAmount: 10000,
    paymentMethod: "card",
    featureKey: "saju_premium",
    paidAt: new Date("2026-08-20T03:04:00Z"),
  };

  test("법정 필수 항목이 본문에 있다", () => {
    const { subject, html } = buildReceiptEmail(order);
    expect(subject).toContain("cd_order_0001");
    expect(html).toContain("cd_order_0001");
    expect(html).toContain("10,000원");
    expect(html).toContain("2026-08-20 12:04 (KST)"); // UTC+9
  });

  test("🔴 사업자 표기는 등록 원문 그대로 실린다", () => {
    const { html } = buildReceiptEmail(order);
    expect(html).toContain(BUSINESS_IDENTITY.companyName);
    expect(html).toContain(BUSINESS_IDENTITY.representative);
    expect(html).toContain(BUSINESS_IDENTITY.registrationNumber);
    expect(html).toContain(BUSINESS_IDENTITY.mailOrderNumber);
    expect(html).toContain(BUSINESS_IDENTITY.address);
  });

  test("🔴 청약철회 문안은 요약하지 않고 정본을 그대로 싣는다", () => {
    const { html } = buildReceiptEmail(order);
    for (const row of RECEIPT_WITHDRAWAL_ROWS) {
      expect(html).toContain(row);
    }
    expect(RECEIPT_WITHDRAWAL_ROWS.length).toBeGreaterThan(0);
  });

  test("HTML 특수문자를 이스케이프한다", () => {
    // 🔴 문서를 그대로 싣는 칸으로 잰다. 결제수단 칸은 2026-08-31 부터 라벨표를 거치므로
    // (worker/lib/payment-method-label.js) 원문이 애초에 도달하지 않아 이스케이프를 못 잰다.
    const { html } = buildReceiptEmail({ ...order, merchantUid: "<script>x</script>" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("🔴 결제수단 칸에 내부 코드 원문이 실리지 않는다", () => {
    const { html } = buildReceiptEmail({ ...order, paymentMethod: "paymentmethodgiftcertificate" });
    expect(html).not.toContain("paymentmethodgiftcertificate");
    expect(html).toContain("상품권");
  });
});

describe("발송 타임아웃", () => {
  test("응답이 오지 않으면 슬롯을 놓고 실패로 센다 (표식도 되돌린다)", async () => {
    const db = makeFakePaymentDb();
    const order = seed(db);
    const hanging = { send: () => new Promise(() => {}) };

    const report = await sendPendingReceiptEmails(ENV, db, {
      now: NOW,
      send: hanging.send,
      sendTimeoutMs: 20,
    });

    expect(report).toMatchObject({ sent: 0, failed: 1 });
    expect(order.receiptEmailSentAt).toBeNull();
  });
});

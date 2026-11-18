import test from "node:test";
import assert from "node:assert/strict";
import { lateAccessDenialSettlement } from "../../worker/lib/late-usage-settlement.js";

// 전달 직전 재확인 거절을 전달로 바꾸는 판정은 fail-closed 다 — 하나라도 어긋나거나 조회가 실패하면 null.
const lean = value => ({ lean: async () => value, select: () => ({ lean: async () => value }) });
function setup(over = {}) {
  const state = { user: { _id: "u1", status: "active" }, execution: null, pointUse: null, passOrder: null, requestOrder: null, ledgerUse: null, fail: false, ...over };
  const models = {
    User: { findOne: () => { if (state.fail) throw new Error("db down"); return lean(state.user); } },
    PaidExecutionRecord: { findOne: () => lean(state.execution) },
    PointHistory: { findOne: () => lean(state.pointUse) },
    Payment: { findOne: filter => lean(filter.paymentType === "membership_pass" ? state.passOrder : filter.$or?.some(row => ["k1", "pay-1"].includes(row.merchantUid) || row.requestId === "k1") ? state.requestOrder : null) },
    MonthlyCreditLedger: { findOne: () => lean(state.ledgerUse) },
  };
  const doc = { id: "s1", status: "delivery_pending", accessType: "pass", idempotencyKey: "k1", createdAt: "2026-11-18T00:00:00.000Z", llmMeta: {}, ...over.doc };
  return { models, doc };
}
const run = (over = {}, fresh = { ok: false, reason: "PAYMENT_REQUIRED" }) => {
  const { models, doc } = setup(over);
  return lateAccessDenialSettlement({ fresh, doc, userId: "u1", service: "test", models });
};

test("이용권 시작 상담의 한도 거절은 미정산 표시와 함께 전달한다", async () => {
  for (const reason of ["PAYMENT_REQUIRED", "MONTHLY_PASS_LIMIT_EXCEEDED", "PRICE_EXCEEDS_PASS_LIMIT"]) {
    const settlement = await run({}, { ok: false, reason });
    assert.equal(settlement.usageSettlement, "failed"); assert.equal(settlement.usageSettlementReason, reason);
  }
  assert.equal((await run({}, null)).usageSettlementReason, "PAYMENT_REQUIRED");
});

test("취소·환불·탈퇴·다른 접근·다른 사유·조회 실패는 전달하지 않는다", async () => {
  const blocked = {
    "취소 증빙 사유": [{}, { ok: false, reason: "PAYMENT_VERIFY_FAILED" }],
    "로그인 필요": [{}, { ok: false, reason: "LOGIN_REQUIRED" }],
    "입력 불일치": [{}, { ok: false, reason: "INVALID_INPUT" }],
    "재확인 통과": [{}, { ok: true, accessType: "pass" }],
    "단건 결제 시작": [{ doc: { accessType: "paid" } }],
    "완료된 상담": [{ doc: { status: "completed" } }],
    "상담 환불 표시": [{ doc: { llmMeta: { deliveryRefund: { status: "refunded" } } } }],
    "멱등키 없음": [{ doc: { idempotencyKey: "" } }],
    "회원 탈퇴": [{ user: { _id: "u1", status: "withdrawn" } }],
    "회원 없음": [{ user: null }],
    "요청 실행 기록 환불": [{ execution: { status: "refunded" } }],
    "이용권 사용 환불 표시": [{ pointUse: { metadata: { refundedForServiceExecution: true } } }],
    "이용권 주문 환불": [{ passOrder: { merchantUid: "pass-1", status: "refunded" } }],
    "이 요청 결제 환불": [{ requestOrder: { merchantUid: "pay-1", status: "refunded" }, doc: { llmMeta: { resumeBody: { paymentId: "pay-1" } } } }],
    "월정석 사용 환불 표시": [{ ledgerUse: { metadata: { monthlyCreditRefundedForServiceExecution: true } } }],
    "조회 실패": [{ fail: true }],
  };
  for (const [label, [over, fresh]] of Object.entries(blocked)) {
    assert.equal(await run(over, fresh === undefined ? { ok: false, reason: "PAYMENT_REQUIRED" } : fresh), null, label);
  }
});

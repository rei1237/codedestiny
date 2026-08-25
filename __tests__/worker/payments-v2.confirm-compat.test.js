/**
 * @jest-environment node
 *
 * 확정 컷오버 어댑터(POST /confirm)의 응답-키 패리티.
 *
 * 셸의 확정 판정기 `_cdHasVerifiedServerAccess` 는 top-level accessGrant 에서
 * ok !== false · 증빙 id(evidenceId|purchaseId|paymentId|merchantUid) · featureKey 일치를 본다 —
 * 이 셋이 빠지면 결제는 됐는데 "결제가 완료되지 않았어요"가 뜬다(재결제 유도 방향의 최악 실패).
 * 지급 마무리 대기(granted=false)는 GRANT_PENDING 으로 나가야 셸의 PENDING 분기(PR #478)가
 * 복귀 티켓을 유지한 채 "다시 결제하지 마세요" UX 로 처리한다. 가짜 드라이버만 사용 — PG 는
 * 재생 경로(PAID 주문)로만 검증해 실호출이 없다.
 */
import { handlePaymentsContext } from "../../worker/payments/index.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const USER = "64b000000000000000000001";
const OTHER_USER = "64b000000000000000000002";
const ENV = { JWT_ACCESS_SECRET: "test-access-secret-value-0123456789" };

async function tokenFor(userId) {
  const { signAuthToken } = await import("../../worker/lib/auth.js");
  return signAuthToken({ _id: userId, email: "t@e.st", role: "user", name: "t" }, ENV);
}

function seedPaidOrder(db, overrides = {}) {
  const order = {
    merchantUid: "cdconfirmorder0000000000000000000000000",
    userId: USER,
    // 🔴 카탈로그에 실재하는 **영구 해금(unlock)** 키다. 확정 봉투의 해금 선언은 과금 유형에
    // 달려 있어서(회당 결제는 선언하지 않는다) 가짜 키로는 그 갈래를 검증할 수 없다.
    productId: "sukuyo-relationship-encyclopedia",
    featureKey: "sukuyo-relationship-encyclopedia",
    paymentType: "digital_content",
    status: "paid",
    orderState: "PAID_VERIFIED",
    paymentAmount: 5000,
    impUid: "portone-tx-1",
    paidAt: new Date(),
    entitlementGrantedAt: new Date(),
    pricingSnapshot: { profileId: "profile-9" },
    createdAt: new Date(),
    ...overrides,
  };
  db.rows.push(order);
  return order;
}

async function postConfirm(db, body, { asUser = USER } = {}) {
  const request = new Request("https://code-destiny.com/api/payments/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await tokenFor(asUser)}`,
    },
    body: JSON.stringify(body),
  });
  const response = await handlePaymentsContext(request, ENV, {
    prefix: "/api/payments",
    withDb: (_env, _ctx, fn) => fn(db),
  });
  return { response, payload: await response.json() };
}

test("PAID+지급 완료 주문: 셸 판정기가 요구하는 accessGrant·해금 증빙 초집합", async () => {
  const db = makeFakePaymentDb();
  const order = seedPaidOrder(db);
  const { response, payload } = await postConfirm(db, {
    merchantUid: order.merchantUid,
    impUid: "portone-tx-1",
    paymentId: "portone-tx-1",
    featureKey: order.featureKey,
  });
  expect(response.status).toBe(200);
  expect(payload.ok).toBe(true);
  expect(payload.status).toBe("paid");
  // _cdHasVerifiedServerAccess 필수 3요소
  expect(payload.accessGrant.ok).toBe(true);
  expect(payload.accessGrant.featureKey).toBe(order.featureKey);
  expect(payload.accessGrant.evidenceId).toBe(order.merchantUid);
  // 증빙 폴백 경로 키들
  expect(payload.unlockedFeatures).toEqual([order.featureKey]);
  expect(payload.unlockMap[order.featureKey]).toBe(true);
  expect(payload.payment.transactionId).toBe("portone-tx-1");
  expect(payload.accessGrant.profileId).toBe("profile-9");
});

test("회당 결제(per_use) 확정: accessGrant 는 주되 해금 선언(unlockedFeatures/unlockMap)은 주지 않는다", async () => {
  /* 🔴 회당 결제를 해금으로 선언하면 클라이언트 해금 맵에 그 키가 들어가고, 다음 진입이 결제창
     없이 already_unlocked 로 통과한다 — 이집트 신탁이 "한 번 결제하면 새로고침 전까지 계속 무료"
     였던 실사고의 서버 절반이다. 접근 증빙은 accessGrant 하나로 충분하다
     (_cdHasVerifiedServerAccess 는 evidenceId + featureKey 만으로 통과한다). */
  const db = makeFakePaymentDb();
  const order = seedPaidOrder(db, { productId: "openKemetModal", featureKey: "openKemetModal", paymentAmount: 3000 });
  const { response, payload } = await postConfirm(db, {
    merchantUid: order.merchantUid,
    impUid: "portone-tx-1",
    paymentId: "portone-tx-1",
    featureKey: order.featureKey,
  });
  expect(response.status).toBe(200);
  expect(payload.ok).toBe(true);
  expect(payload.accessGrant.ok).toBe(true);
  expect(payload.accessGrant.featureKey).toBe("openKemetModal");
  expect(payload.accessGrant.evidenceId).toBe(order.merchantUid);
  expect(payload.unlockedFeatures).toBeUndefined();
  expect(payload.unlockMap).toBeUndefined();
});

test("PAID 인데 지급 마무리 대기: GRANT_PENDING + '다시 결제하지 마세요' (성공 봉투 금지)", async () => {
  const db = makeFakePaymentDb();
  const order = seedPaidOrder(db, { entitlementGrantedAt: null });
  const { response, payload } = await postConfirm(db, { merchantUid: order.merchantUid, impUid: "portone-tx-1" });
  expect(response.status).toBe(200);
  expect(payload.ok).toBe(true);
  expect(payload.code).toBe("GRANT_PENDING"); // 셸 PENDING 분기(PR #478)가 이 top-level code 를 읽는다
  expect(payload.recoveryRequired).toBe(true);
  expect(payload.message).toContain("다시 결제하지");
  expect(payload.accessGrant).toBeUndefined(); // 지급 전에 성공 증빙을 내보내면 안 된다
});

test("남의 주문 확정 시도: 403 (주문 문서 소유권 판정)", async () => {
  const db = makeFakePaymentDb();
  const order = seedPaidOrder(db);
  const { response, payload } = await postConfirm(db, { merchantUid: order.merchantUid }, { asUser: OTHER_USER });
  expect(response.status).toBe(403);
  expect(payload.code).toBe("ORDER_FORBIDDEN");
});

test("모르는 주문: 404 / merchantUid 누락: 400", async () => {
  const db = makeFakePaymentDb();
  const missing = await postConfirm(db, { merchantUid: "cd-unknown" });
  expect(missing.response.status).toBe(404);
  expect(missing.payload.code).toBe("ORDER_NOT_FOUND");
  const empty = await postConfirm(db, { impUid: "tx-only" });
  // merchantUid 가 없으면 paymentId(impUid 아님)로도 못 찾는 게 구 계약 — 주문 조회로 404 가 되거나
  // 식별자 자체가 없으면 400. 여기서는 paymentId 만 있어 주문 조회 404.
  expect([400, 404]).toContain(empty.response.status);
});

test("취소된 주문 확정 시도: 409 ORDER_NOT_CONFIRMABLE (환불된 주문 부활 금지)", async () => {
  const db = makeFakePaymentDb();
  const order = seedPaidOrder(db, { status: "cancelled", orderState: "CANCELLED", entitlementGrantedAt: null });
  const { response, payload } = await postConfirm(db, { merchantUid: order.merchantUid });
  expect(response.status).toBe(409);
  expect(payload.code).toBe("ORDER_NOT_CONFIRMABLE");
});

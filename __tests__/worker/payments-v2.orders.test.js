/**
 * @jest-environment node
 *
 * 주문 상태기계 T1~T5. **Mongo 없이 전 전이를 검증한다.**
 *
 * orders.js 가 db 핸들을 주입받도록 설계된 이유가 이것이다. Atlas M0 에는 트랜잭션이 없어서
 * 원자성이 전부 CAS 조건에 실려 있는데, 그 조건이 맞는지는 인프라가 아니라 **필터 자체**를
 * 확인해야 알 수 있다. 그래서 여기 fake 컬렉션은 실제로 쓰는 연산자($nin·$in·$or·$lt·$exists·
 * $set·$inc·$unset·$setOnInsert·upsert)를 진짜로 구현한다 — 통과시켜 주는 스텁이면 의미가 없다.
 */
import {
  ORDER_STATUS,
  REFUND_LOCK_TTL_MS,
  assertOrderOwner,
  claimRefund,
  createOrder,
  deriveOrderId,
  findOrder,
  markEntitlementGranted,
  markOrderCancelled,
  markOrderFailed,
  markOrderPaid,
  releaseRefundLock,
  settleRefund,
  toOrderStatus,
  MAX_ORDER_GENERATIONS,
  createPayableOrder,
} from "../../worker/payments/orders.js";
import { PaymentError } from "../../worker/payments/errors.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const USER = "507f1f77bcf86cd799439011";
const OTHER_USER = "507f1f77bcf86cd799439012";
const PRODUCT = {
  productId: "master-love-codex",
  featureKey: "master-love-codex",
  billingType: "per-use",
  priceKRW: 30000,
  priceCoins: 300,
  monthlyCost: 3000,
};
const PG = {
  pgTransactionId: "cdorder-tx",
  paidAt: new Date("2026-08-11T00:00:00Z"),
  method: "card",
  summary: { paymentId: "cdorder-tx", amount: 30000, currency: "KRW" },
};

const makeFakeDb = makeFakePaymentDb;

async function seedPaid(db, { idempotencyKey = "idem-1" } = {}) {
  const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey });
  await markOrderPaid(db, { orderId: order.merchantUid, order, pg: PG });
  return order.merchantUid;
}

// ── T1 ─────────────────────────────────────────────────────────────────
describe("T1 · 주문 생성은 멱등이다", () => {
  test("주문 id 는 파생값이고 결정적이다", async () => {
    const a = await deriveOrderId(USER, "idem-1");
    const b = await deriveOrderId(USER, "idem-1");
    expect(a).toBe(b);
    expect(a).toHaveLength(40);
    expect(a.startsWith("cd")).toBe(true);
    expect(await deriveOrderId(USER, "idem-2")).not.toBe(a);
    expect(await deriveOrderId(OTHER_USER, "idem-1")).not.toBe(a);
  });

  test("idempotencyKey 가 없으면 만들지 않는다", async () => {
    await expect(deriveOrderId(USER, "")).rejects.toThrow(PaymentError);
  });

  test("🔴 연속 클릭이 주문을 두 개 만들지 않는다", async () => {
    // 구 single/start 는 호출마다 새 랜덤 merchantUid 로 create 해서 PENDING 주문이 둘 생겼다.
    const db = makeFakeDb();
    const first = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    const second = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    expect(db.rows).toHaveLength(1);
    expect(second.merchantUid).toBe(first.merchantUid);
  });

  test("왕복 1회 · impUid 를 넣지 않는다(unique+sparse 충돌 방지)", async () => {
    const db = makeFakeDb();
    const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    expect(db.ctx.ops).toBe(1);
    expect("impUid" in order).toBe(false);
    expect(order.status).toBe("pending");
    expect(order.paymentAmount).toBe(30000);
    // 가격은 주문 시점에 박힌다 — 나중에 가격표가 바뀌어도 대조 기준이 흔들리지 않는다.
    expect(order.pricingSnapshot.priceKRW).toBe(30000);
  });

  test("로그인하지 않았으면 만들지 않는다", async () => {
    const db = makeFakeDb();
    await expect(createOrder(db, { userId: "", product: PRODUCT, idempotencyKey: "x" })).rejects.toThrow(PaymentError);
  });

  /* 🔴 2026-08-15 회귀 재현. 11000 을 잡지 않으면 lib/http.js 가 MongoServerError 를 /^Mongo/ 로
     삼켜 **503 DB_UNAVAILABLE** 로 내보내고, 클라이언트의 status>=500 폴백이 결제창을 다시 연다
     ("503은 고질적인 문제였다"). Atlas 는 멀쩡한데 중복키가 DB 장애로 둔갑하던 경로다. */
  test("🔴 동시 요청의 패자는 503 이 아니라 승자의 주문을 받는다", async () => {
    const winnerId = await deriveOrderId(USER, "idem-1");
    const winnerRow = {
      _id: "oid-winner",
      userId: USER,
      merchantUid: winnerId,
      idempotencyKey: "idem-1",
      paymentType: "digital_content",
      status: "pending",
      paymentAmount: PRODUCT.priceKRW,
      expectedChargedPoints: PRODUCT.priceCoins,
      featureKey: PRODUCT.featureKey,
    };
    const db = makeFakeDb({
      // 승자가 우리 필터 조회와 insert 사이에 커밋한 상황. upsert 는 11000 으로 진다.
      onDuplicate: () => {
        if (db.rows.length) return false;
        db.rows.push(winnerRow);
        return true;
      },
    });

    const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    expect(order.merchantUid).toBe(winnerId); // 승자와 같은 문서 = 같은 PG 창
    expect(order._id).toBe("oid-winner");
    expect(db.rows).toHaveLength(1); // 패자가 주문을 하나 더 만들지 않는다
    // upsert(11000) + 재조회. 재조회는 이 콜드 패스에서만 돌고 정상 경로는 1회 그대로다(위 테스트).
    expect(db.ctx.ops).toBe(2);
  });

  test("🔴 11000 이 아닌 Mongo 오류는 삼키지 않고 그대로 올린다", async () => {
    const db = makeFakeDb();
    db.findOneAndUpdate = async () => {
      const error = new Error("ConflictingUpdateOperators");
      error.code = 40; // 영구 코드 버그 — 500 으로 나가 눈에 띄어야 한다
      throw error;
    };
    await expect(createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" }))
      .rejects.toThrow("ConflictingUpdateOperators");
  });
});

/* 🔴 2026-08-16 회귀 재현. "PG 결제창이 늦게 뜬다 / 409 가 떴다가 회복된다"의 서버 쪽 절반이다.
   merchantUid 는 (userId, 멱등키)의 순수 파생이라, 결정적 requestId 를 쓰는 호출부(정적 셸의
   숙요점·사주 AI 상담)는 같은 base key 를 영구히 보낸다. 결제 성공·취소·실패가 각각 세대를 하나씩
   태우므로 세 번이면 고정 사다리가 소진되고, 그 뒤로는 **모든 결제가 409 로 시작**했다. */
describe("T1' · 결제 가능한 주문을 반드시 돌려준다", () => {
  async function burnGeneration(db, baseKey, generation) {
    const key = generation === 0 ? baseKey : `${baseKey}#${generation}`;
    const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: key });
    await markOrderCancelled(db, { orderId: order.merchantUid, userId: USER });
    return order.merchantUid;
  }

  test("같은 의도의 재전송은 같은 주문이다(멱등 계약 불변)", async () => {
    const db = makeFakeDb();
    const first = await createPayableOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    const second = await createPayableOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    expect(second.merchantUid).toBe(first.merchantUid);
    expect(db.rows).toHaveLength(1);
  });

  test("🔴 고정 세대가 모두 종료 상태여도 409 가 아니라 결제 가능한 주문이 나온다", async () => {
    const db = makeFakeDb();
    const burned = [];
    for (let generation = 0; generation < MAX_ORDER_GENERATIONS; generation += 1) {
      burned.push(await burnGeneration(db, "idem-1", generation));
    }

    const order = await createPayableOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    expect(order.status).toBe("pending");
    expect(order.paymentAmount).toBe(PRODUCT.priceKRW);
    // 새 merchantUid = 새 PortOne paymentId. 태운 세대 중 아무것도 재사용하지 않는다.
    expect(burned).not.toContain(order.merchantUid);
  });

  test("🔴 결제 완료 주문은 덮지 않는다 — 새 주문을 따로 발급한다", async () => {
    const db = makeFakeDb();
    const paidId = await seedPaid(db, { idempotencyKey: "idem-1" });
    for (let generation = 1; generation < MAX_ORDER_GENERATIONS; generation += 1) {
      await burnGeneration(db, "idem-1", generation);
    }

    const order = await createPayableOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    expect(order.merchantUid).not.toBe(paidId);
    expect(db.rows.find((row) => row.merchantUid === paidId).status).toBe("paid");
  });

  test("멱등키가 없으면 만들지 않는다", async () => {
    const db = makeFakeDb();
    await expect(createPayableOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: " " }))
      .rejects.toThrow(PaymentError);
  });
});

// ── T2 ─────────────────────────────────────────────────────────────────
describe("T2 · 확정", () => {
  test("PENDING → PAID", async () => {
    const db = makeFakeDb();
    const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    const paid = await markOrderPaid(db, { orderId: order.merchantUid, order, pg: PG });
    expect(toOrderStatus(paid)).toBe(ORDER_STATUS.PAID);
    expect(paid.impUid).toBe("cdorder-tx");
    expect(paid.chargedPoints).toBe(300);
    expect(paid.confirmAttempts).toBe(1);
  });

  // 🔴 2026-08-31 실장애. PortOne V2 는 method.type 으로 `PaymentMethodEasyPay` 까지만 알려준다.
  // 그 값을 그대로 쓰면 결제창에서 고른 카카오페이·계좌이체·상품권이 승인 순간 지워져,
  // 결제내역이 전부 "카드 결제"로 뭉개졌다. 수단별 전수는 verify:checkout-pass-card 가 본다.
  test("🔴 확정이 결제창에서 고른 결제수단을 PG 의 굵은 타입으로 덮지 않는다", async () => {
    const db = makeFakeDb();
    const created = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    const order = { ...created, paymentMethod: "kakaopay" };
    const paid = await markOrderPaid(db, {
      orderId: order.merchantUid, order,
      pg: { ...PG, method: "paymentmethodeasypay" },
    });
    expect(paid.paymentMethod).toBe("kakaopay");
  });

  test("계열이 다르면 실제로 승인된 PG 수단을 기록한다", async () => {
    const db = makeFakeDb();
    const created = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    const order = { ...created, paymentMethod: "card_general" };
    const paid = await markOrderPaid(db, {
      orderId: order.merchantUid, order,
      pg: { ...PG, method: "paymentmethodvirtualaccount" },
    });
    expect(paid.paymentMethod).toBe("virtual_account");
  });

  test("🔴 두 번째 확정은 null — 클라·webhook·크론이 동시에 와도 한 번만 처리된다", async () => {
    const db = makeFakeDb();
    const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    await markOrderPaid(db, { orderId: order.merchantUid, order, pg: PG });
    expect(await markOrderPaid(db, { orderId: order.merchantUid, order, pg: PG })).toBeNull();
  });

  test("🔴 환불·취소된 주문은 늦게 온 webhook 이 되살릴 수 없다", async () => {
    for (const dead of ["refunded", "cancelled"]) {
      const db = makeFakeDb();
      const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
      db.rows[0].status = dead;
      expect(await markOrderPaid(db, { orderId: order.merchantUid, order, pg: PG })).toBeNull();
      expect(db.rows[0].status).toBe(dead);
    }
  });

  test("🔴 구 코드가 쓴 success/fulfilled 주문을 재처리하지 않는다", async () => {
    for (const legacy of ["success", "fulfilled"]) {
      const db = makeFakeDb();
      const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
      db.rows[0].status = legacy;
      expect(await markOrderPaid(db, { orderId: order.merchantUid, order, pg: PG })).toBeNull();
    }
  });

  test("PG 요약만 저장되고 PII 는 들어가지 않는다", async () => {
    const db = makeFakeDb();
    const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    const paid = await markOrderPaid(db, { orderId: order.merchantUid, order, pg: PG });
    expect(paid.rawPortOne).toEqual(PG.summary);
    expect(JSON.stringify(paid.rawPortOne)).not.toMatch(/customer|phone/i);
  });
});

// ── T3 · T4 ────────────────────────────────────────────────────────────
describe("T3/T4 · 실패와 취소", () => {
  test("🔴 PAID 는 절대 FAILED 가 될 수 없다 — 되돌리는 것은 환불이지 실패가 아니다", async () => {
    const db = makeFakeDb();
    const orderId = await seedPaid(db);
    expect(await markOrderFailed(db, { orderId, failureCode: "X" })).toBe(false);
    expect(db.rows[0].status).toBe("paid");
  });

  test("PENDING → FAILED", async () => {
    const db = makeFakeDb();
    const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    expect(await markOrderFailed(db, { orderId: order.merchantUid, failureCode: "PG_PAYMENT_NOT_PAID" })).toBe(true);
    expect(toOrderStatus(db.rows[0])).toBe(ORDER_STATUS.FAILED);
  });

  test("남의 주문은 취소하지 못한다", async () => {
    const db = makeFakeDb();
    const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    expect(await markOrderCancelled(db, { orderId: order.merchantUid, userId: OTHER_USER })).toBe(false);
    expect(await markOrderCancelled(db, { orderId: order.merchantUid, userId: USER })).toBe(true);
  });

  test("크론은 주체가 없는 대신 나이 조건으로 만료 주문만 정리한다", async () => {
    const db = makeFakeDb();
    const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    const future = new Date(Date.now() + 60_000);
    const past = new Date(Date.now() - 60_000);
    expect(await markOrderCancelled(db, { orderId: order.merchantUid, olderThan: past })).toBe(false);
    expect(await markOrderCancelled(db, { orderId: order.merchantUid, olderThan: future, reason: "ORDER_EXPIRED" })).toBe(true);
    expect(db.rows[0].failureCode).toBe("ORDER_EXPIRED");
  });

  test("PAID 주문은 취소되지 않는다", async () => {
    const db = makeFakeDb();
    const orderId = await seedPaid(db);
    expect(await markOrderCancelled(db, { orderId, userId: USER })).toBe(false);
  });
});

// ── T5 ─────────────────────────────────────────────────────────────────
describe("T5 · 환불은 두 단계다", () => {
  test("claim → settle", async () => {
    const db = makeFakeDb();
    const orderId = await seedPaid(db);
    expect(await claimRefund(db, { orderId })).not.toBeNull();
    expect(await settleRefund(db, { orderId })).toBe(true);
    expect(toOrderStatus(db.rows[0])).toBe(ORDER_STATUS.REFUNDED);
    expect(db.rows[0].refundLock).toBeUndefined();
  });

  test("🔴 동시 환불은 두 번째가 락을 못 잡는다", async () => {
    const db = makeFakeDb();
    const orderId = await seedPaid(db);
    expect(await claimRefund(db, { orderId })).not.toBeNull();
    expect(await claimRefund(db, { orderId })).toBeNull();
  });

  test("🔴 죽은 락은 이어받는다 — PG 호출 중 죽어도 영영 잠기지 않는다", async () => {
    const db = makeFakeDb();
    const orderId = await seedPaid(db);
    const now = new Date();
    await claimRefund(db, { orderId, now });
    const later = new Date(now.getTime() + REFUND_LOCK_TTL_MS + 1000);
    expect(await claimRefund(db, { orderId, now: later })).not.toBeNull();
  });

  test("PG 가 거절하면 락만 놓고 상태는 PAID 로 남는다", async () => {
    const db = makeFakeDb();
    const orderId = await seedPaid(db);
    await claimRefund(db, { orderId });
    await releaseRefundLock(db, { orderId });
    expect(db.rows[0].refundLock).toBeUndefined();
    expect(toOrderStatus(db.rows[0])).toBe(ORDER_STATUS.PAID);
    expect(await claimRefund(db, { orderId })).not.toBeNull();
  });

  test("PENDING 주문은 환불 대상이 아니다", async () => {
    const db = makeFakeDb();
    const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    expect(await claimRefund(db, { orderId: order.merchantUid })).toBeNull();
  });
});

// ── 부수 ───────────────────────────────────────────────────────────────
describe("읽기 매핑과 소유권", () => {
  test("🔴 레거시 status 100% 가 5상태로 접힌다 — 그래서 마이그레이션이 필요 없다", () => {
    const cases = {
      pending: ORDER_STATUS.PENDING, processing: ORDER_STATUS.PENDING, retryable: ORDER_STATUS.PENDING, "": ORDER_STATUS.PENDING,
      paid: ORDER_STATUS.PAID, success: ORDER_STATUS.PAID, fulfilled: ORDER_STATUS.PAID,
      failed: ORDER_STATUS.FAILED, cancelled: ORDER_STATUS.CANCELLED, refunded: ORDER_STATUS.REFUNDED,
    };
    for (const [raw, expected] of Object.entries(cases)) {
      expect(toOrderStatus({ status: raw })).toBe(expected);
    }
    // paymentSchema enum 전체를 덮는지 확인 — 새 값이 생기면 여기서 걸린다.
    expect(Object.keys(cases).filter(Boolean).sort()).toEqual(
      ["cancelled", "failed", "fulfilled", "paid", "pending", "processing", "refunded", "retryable", "success"],
    );
  });

  test("소유권은 users 가 아니라 주문 문서로 판정한다", async () => {
    const db = makeFakeDb();
    const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    const found = await findOrder(db, { orderId: order.merchantUid });
    expect(() => assertOrderOwner(found, USER)).not.toThrow();
    expect(() => assertOrderOwner(found, OTHER_USER)).toThrow(/접근할 수 없습니다/);
    expect(() => assertOrderOwner(null, USER)).toThrow(PaymentError);
  });

  test("지급 표식은 한 번만 찍힌다", async () => {
    const db = makeFakeDb();
    const orderId = await seedPaid(db);
    db.rows[0].entitlementGrantedAt = null;
    const first = new Date("2026-08-11T01:00:00Z");
    await markEntitlementGranted(db, { orderId, now: first });
    await markEntitlementGranted(db, { orderId, now: new Date("2026-08-11T02:00:00Z") });
    expect(db.rows[0].entitlementGrantedAt).toEqual(first);
  });
});

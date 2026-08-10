/**
 * 단계 ② 주문 생성 · ⑤ 주문 확정. **이 시스템의 모든 CAS 조건이 여기에만 있다.**
 *
 * ## 트랜잭션 없이 원자성을 얻는 법
 *
 * Atlas M0 에는 리플리카셋이 없어 startSession/withTransaction 이 아예 못 뜬다. 구 코드는 그것을
 * 503 MONTHLY_ATOMIC_UNAVAILABLE 로 표면화했는데, 재시도로 절대 성공하지 않는 **영구 503** 이라
 * 월정석 결제수단이 사실상 죽어 있었다.
 *
 * 여기서는 트랜잭션을 흉내내지 않는다. 대신 모든 전이를 **단일 문서 조건부 갱신**으로 만들고,
 * 쓰기 순서로 안전성을 얻는다:
 *
 *     PG 돈 먼저 → 주문 PAID 둘째 → entitlement 셋째
 *
 * 이 수열의 **모든 접두사는 접미사를 재생해 복구 가능하고, 어떤 접두사도 거짓이 아니다.**
 *   · 돈만 빠진 상태 → 주문은 이미 PENDING 으로 존재한다(결제창을 열기 전에 썼다). webhook·크론이 확정한다.
 *   · PAID 인데 미지급 → entitlementGrantedAt 이 비어 있어 크론이 찾아 재지급한다. 지급은 멱등이다.
 *   · 지급됐는데 돈이 없는 상태 → **불가능하다.** 지급은 T2 가 문서를 돌려준 뒤에만 돈다.
 *
 * ## 상태는 다섯이고, 레거시 값은 읽기만 한다
 *
 * paymentSchema.status enum 에는 예전 값(success·fulfilled·processing·retryable)이 남아 있다.
 * 신규 코드는 그것들을 **절대 쓰지 않고** 읽을 때만 5상태로 접는다. 그래서 마이그레이션이 필요 없다 —
 * 기존 행 100% 가 그대로 매핑된다.
 */
import { Payment } from "../lib/models.js";
import { paymentError } from "./errors.js";
import { toObjectId } from "./db.js";

export const ORDER_STATUS = Object.freeze({
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
});

/* 확정을 더 시도하면 안 되는 상태. T2 의 $nin 이 이 목록이고, 두 가지를 동시에 막는다:
     · success/fulfilled — **구 코드가 쓴 주문**을 신규 코드가 다시 처리하는 것
     · refunded/cancelled — 늦게 도착한 webhook 이 환불된 주문을 되살리는 것 */
const NOT_CONFIRMABLE_RAW_STATUSES = Object.freeze(["paid", "success", "fulfilled", "refunded", "cancelled"]);
/** 아직 PAID 로 취급해야 하는 레거시 값들. 환불·재지급 대상 판정에 쓴다. */
const PAID_RAW_STATUSES = Object.freeze(["paid", "success", "fulfilled"]);

/** 환불 락 유효 시간. 이보다 오래된 락은 죽은 것으로 보고 크론이 이어받는다. */
export const REFUND_LOCK_TTL_MS = 120_000;

/** 레거시 status → 5상태. 읽기 전용 매핑이라 마이그레이션이 필요 없다. */
export function toOrderStatus(doc) {
  const raw = String(doc?.status || "");
  if (PAID_RAW_STATUSES.includes(raw)) return ORDER_STATUS.PAID;
  if (raw === "failed") return ORDER_STATUS.FAILED;
  if (raw === "cancelled") return ORDER_STATUS.CANCELLED;
  if (raw === "refunded") return ORDER_STATUS.REFUNDED;
  return ORDER_STATUS.PENDING; // pending · processing · retryable · ""
}

/* 드라이버 7 은 findOneAndUpdate 가 문서를 직접 준다. 예전 형태({value})도 받아 두는 이유는
   드라이버 상향 한 번에 조용히 null 로 읽혀 **모든 CAS 가 "졌다"로 보이는** 사고를 막기 위해서다. */
function unwrap(result) {
  if (result && typeof result === "object" && "value" in result && !("_id" in result)) return result.value;
  return result;
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 🔴 주문 id 는 **파생값이지 랜덤이 아니다.**
 *
 * 구 코드(payments.js:2278 single/start)는 호출마다 새 랜덤 merchantUid 로 Payment.create 를 했다.
 * upsert 도 E11000 핸들러도 없어서 **연속 클릭이 PENDING 주문 두 개**를 만들었다. 여기서는 같은
 * (userId, idempotencyKey) 가 항상 같은 id 를 낳으므로, 인덱스가 없어 둘 다 insert 되더라도
 * merchantUid unique 에서 충돌한다 — 가드가 2중이다.
 */
export async function deriveOrderId(userId, idempotencyKey) {
  const key = String(idempotencyKey || "").trim();
  if (!key) throw paymentError("IDEMPOTENCY_KEY_REQUIRED", "결제 요청 식별자가 필요합니다.");
  const hex = await sha256Hex(`${String(userId || "").trim()}:${key}`);
  return `cd${hex.slice(0, 38)}`; // 40자 — PortOne paymentId 제한 안쪽
}

/**
 * T1 · (none) → PENDING. 사용자가 결제수단을 고른 시점. **Mongo 왕복 1회.**
 * 같은 idempotencyKey 로 다시 부르면 **같은 문서**가 그대로 돌아온다(같은 merchantUid → 같은 PG 창).
 */
export async function createOrder(db, {
  userId, product, idempotencyKey, paymentType = "digital_content",
  profileId = "", contentKey = "", scope = "", returnPath = "", paymentMethod = "unknown",
}) {
  const uid = toObjectId(userId);
  if (!uid) throw paymentError("UNAUTHORIZED", "로그인이 필요합니다.");
  const orderId = await deriveOrderId(userId, idempotencyKey);
  const now = new Date();

  const result = await db.findOneAndUpdate(
    Payment,
    { userId: uid, idempotencyKey: String(idempotencyKey).trim(), paymentType },
    {
      $setOnInsert: {
        userId: uid,
        merchantUid: orderId,
        idempotencyKey: String(idempotencyKey).trim(),
        paymentType,
        accessType: "single_purchase",
        status: "pending",
        orderState: "PENDING",
        paymentAmount: product.priceKRW,
        expectedChargedPoints: product.priceCoins,
        chargedPoints: 0,
        coinPrice: product.priceCoins,
        membershipCreditCost: product.monthlyCost,
        featureKey: product.featureKey,
        productId: product.productId,
        paymentMethod,
        source: "prepare",
        subscriptionTier: "",
        confirmAttempts: 0,
        // 가격을 주문 시점에 박아 둔다. 나중에 가격표가 바뀌어도 이 주문의 대조 기준은 흔들리지 않는다.
        pricingSnapshot: {
          priceKRW: product.priceKRW,
          priceCoins: product.priceCoins,
          monthlyCost: product.monthlyCost,
          billingType: product.billingType,
          profileId, contentKey, scope, returnPath,
          createdAt: now.toISOString(),
        },
        createdAt: now,
        updatedAt: now,
      },
      // 🔴 impUid 는 unique+sparse 다. 빈 문자열로 넣으면 두 번째 주문부터 전부 충돌한다 — 넣지 않는다.
    },
    { upsert: true, returnDocument: "after" },
  );

  const order = unwrap(result);
  if (!order) throw paymentError("INTERNAL_ERROR", "주문을 생성하지 못했습니다.", { orderId });
  return order;
}

/**
 * T2 · PENDING → PAID. 클라 확정·webhook·크론이 **전부 이 한 함수**를 부른다(주체별 분기 없음).
 * 호출 전에 pg.verifyPgPayment 가 통과해 있어야 한다 — 이 함수는 대조하지 않고 기록만 한다.
 */
export async function markOrderPaid(db, { orderId, order, pg }) {
  const result = await db.findOneAndUpdate(
    Payment,
    { merchantUid: orderId, status: { $nin: NOT_CONFIRMABLE_RAW_STATUSES } },
    {
      $set: {
        status: "paid",
        orderState: "PAID_VERIFIED",
        impUid: pg.pgTransactionId,
        paidAt: pg.paidAt || new Date(),
        paymentMethod: pg.method || "unknown",
        chargedPoints: Number(order?.expectedChargedPoints || 0),
        rawPortOne: pg.summary, // 요약본이다 — customer(PII)는 pg.js 가 이미 떨어뜨렸다
        failureCode: "", failureMessage: "", failureStage: "",
        updatedAt: new Date(),
      },
      $inc: { confirmAttempts: 1 },
    },
    { returnDocument: "after" },
  );
  return unwrap(result); // null = 누군가 이미 PENDING 밖으로 옮겼다 → 호출부가 재조회해 분기한다
}

/** T3 · PENDING → FAILED. `status: "pending"` 정확 일치 — **PAID 는 절대 FAILED 가 될 수 없다.** */
export async function markOrderFailed(db, { orderId, failureCode, failureMessage, failureStage }) {
  const result = await db.updateOne(
    Payment,
    { merchantUid: orderId, status: "pending" },
    {
      $set: {
        status: "failed",
        orderState: "FAILED",
        failureCode: String(failureCode || "").slice(0, 80),
        failureMessage: String(failureMessage || "").slice(0, 500),
        failureStage: String(failureStage || "").slice(0, 80),
        lastErrorAt: new Date(),
        updatedAt: new Date(),
      },
      $inc: { confirmAttempts: 1 },
    },
  );
  return result?.modifiedCount === 1;
}

/** T4 · PENDING → CANCELLED. 사용자가 결제창을 닫았거나, 크론이 만료 주문을 정리한다. */
export async function markOrderCancelled(db, { orderId, userId, reason = "USER_CANCELLED", olderThan = null }) {
  const filter = { merchantUid: orderId, status: "pending" };
  // 사용자 요청이면 소유권을 함께 건다. 크론에는 주체가 없으므로 대신 나이 조건을 건다.
  if (userId) filter.userId = toObjectId(userId);
  if (olderThan) filter.createdAt = { $lt: olderThan };

  const result = await db.updateOne(Payment, filter, {
    $set: { status: "cancelled", orderState: "CANCELLED", failureCode: reason, updatedAt: new Date() },
  });
  return result?.modifiedCount === 1;
}

/**
 * T5-A · 환불 claim. PortOne 을 부르기 **전에** 락을 잡는다.
 * null = 다른 주체가 이미 진행 중 → 409 REFUND_IN_PROGRESS(재시도 가능).
 */
export async function claimRefund(db, { orderId, now = new Date() }) {
  const staleBefore = new Date(now.getTime() - REFUND_LOCK_TTL_MS);
  const result = await db.findOneAndUpdate(
    Payment,
    {
      merchantUid: orderId,
      status: { $in: PAID_RAW_STATUSES },
      $or: [
        { refundLock: { $exists: false } },
        { refundLock: null },
        { refundLock: { $lt: staleBefore } }, // 죽은 락은 이어받는다
      ],
    },
    { $set: { refundLock: now, updatedAt: now } },
    { returnDocument: "after" },
  );
  return unwrap(result);
}

/**
 * T5-B · 환불 정산. PortOne 이 2xx 를 준 뒤.
 * A~B 사이에 죽어도 락이 120s 뒤 만료되어 크론이 이어받고, PortOne 의 Idempotency-Key 가
 * (주문 id 파생이라 결정적) 두 번째 취소를 무해한 no-op 으로 만든다.
 */
export async function settleRefund(db, { orderId, now = new Date() }) {
  const result = await db.updateOne(
    Payment,
    { merchantUid: orderId, status: { $in: PAID_RAW_STATUSES } },
    {
      $set: { status: "refunded", orderState: "CANCELLED", refundedAt: now, updatedAt: now },
      $unset: { refundLock: "" },
    },
  );
  return result?.modifiedCount === 1;
}

/** 락을 잡았는데 PG 가 거절한 경우. 락만 놓아 준다(상태는 PAID 그대로). */
export async function releaseRefundLock(db, { orderId }) {
  await db.updateOne(Payment, { merchantUid: orderId }, { $unset: { refundLock: "" }, $set: { updatedAt: new Date() } });
}

/** 지급 완료 표식. 크론이 "PAID 인데 이 값이 없는 주문"을 찾는 근거가 된다. */
export async function markEntitlementGranted(db, { orderId, now = new Date() }) {
  await db.updateOne(
    Payment,
    { merchantUid: orderId, entitlementGrantedAt: null },
    { $set: { entitlementGrantedAt: now, updatedAt: now } },
  );
}

export async function findOrder(db, { orderId }) {
  return db.findOne(Payment, { merchantUid: String(orderId || "").trim() });
}

/** 주문 소유권은 users 컬렉션이 아니라 **주문 문서**로 판정한다 — 확정 경로의 Mongo 읽기 0회. */
export function assertOrderOwner(order, userId) {
  if (!order) throw paymentError("ORDER_NOT_FOUND", "주문을 찾을 수 없습니다.");
  if (String(order.userId) !== String(userId)) {
    throw paymentError("ORDER_FORBIDDEN", "이 주문에 접근할 수 없습니다.", { orderId: String(order.merchantUid || "") });
  }
  return order;
}

export const __ordersTestUtils = {
  NOT_CONFIRMABLE_RAW_STATUSES,
  PAID_RAW_STATUSES,
  sha256Hex,
  unwrap,
};

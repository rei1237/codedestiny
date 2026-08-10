/**
 * 크론 정리. **"돈은 받았는데 권한이 없다"를 사람이 찾아내지 않게 하는 것**이 목적이다.
 *
 * 이 파일이 존재하는 이유는 트랜잭션이 없기 때문이다. 쓰기 순서(PG → 주문 PAID → 권한)가
 * 모든 중단점을 복구 가능하게 만들어 두지만, **복구를 실제로 실행하는 주체**가 있어야 그 설계가
 * 완성된다. 여기가 그 주체다.
 *
 * 세 가지를 본다:
 *   1. PAID 인데 지급 표식이 없는 주문 → 다시 지급한다(지급은 멱등이라 안전하다)
 *   2. 오래된 PENDING → 취소한다(결제창을 열고 이탈한 주문이 영원히 남지 않게)
 *   3. 죽은 환불 락 → 놓아 준다(PG 호출 중 아이솔레이트가 죽은 경우)
 *
 * 🔴 **재시도 루프가 아니다.** 각 항목을 한 번씩만 시도하고, 실패하면 다음 크론에 다시 만난다.
 * 크론 안에서 재시도를 돌리면 admission 슬롯을 몰아 쓰게 되고, 그게 사용자 요청을 굶긴다.
 */
import { Payment } from "../lib/models.js";
import { REFUND_LOCK_TTL_MS, markOrderCancelled } from "./orders.js";

const PAID_RAW_STATUSES = Object.freeze(["paid", "success", "fulfilled"]);

/** 결제창을 열고 이탈한 주문을 정리하기까지의 유예. PG 창이 열려 있을 수 있으므로 넉넉히 둔다. */
export const PENDING_EXPIRY_MS = 30 * 60_000;

/**
 * PAID 인데 권한이 없는 주문을 찾아 다시 지급한다.
 *
 * @param {(order: object) => Promise<void>} grant 지급 실행자. orders/entitlements 를 아는 쪽이 넘긴다 —
 *   여기서 직접 부르면 크론이 상품 해석·권한 규칙까지 알아야 해서 책임이 번진다.
 */
export async function regrantUnfulfilledOrders(db, { grant, now = new Date(), limit = 50, minAgeMs = 60_000 } = {}) {
  const cutoff = new Date(now.getTime() - minAgeMs);
  const orders = await db.find(
    Payment,
    {
      status: { $in: PAID_RAW_STATUSES },
      entitlementGrantedAt: null,
      // 방금 확정된 주문은 건드리지 않는다 — 정상 흐름이 지급을 마무리하는 중일 수 있다.
      updatedAt: { $lt: cutoff },
    },
    { limit },
  );

  let repaired = 0;
  let failed = 0;
  for (const order of orders) {
    try {
      await grant(order);
      repaired += 1;
    } catch (error) {
      // 한 주문의 실패가 나머지를 막지 않는다. 다음 크론에 다시 만난다.
      failed += 1;
    }
  }
  return { scanned: orders.length, repaired, failed };
}

/** 오래된 PENDING 주문을 취소한다. 주체가 없으므로 나이 조건이 소유권을 대신한다. */
export async function expireStalePendingOrders(db, { now = new Date(), limit = 50, olderThanMs = PENDING_EXPIRY_MS } = {}) {
  const cutoff = new Date(now.getTime() - olderThanMs);
  const orders = await db.find(
    Payment,
    { status: "pending", createdAt: { $lt: cutoff } },
    { limit },
  );

  let cancelled = 0;
  for (const order of orders) {
    const ok = await markOrderCancelled(db, {
      orderId: String(order.merchantUid || ""),
      reason: "ORDER_EXPIRED",
      olderThan: cutoff,
    });
    if (ok) cancelled += 1;
  }
  return { scanned: orders.length, cancelled };
}

/**
 * 죽은 환불 락을 놓아 준다.
 *
 * 락 자체에 TTL 이 있어 claimRefund 가 알아서 이어받지만, 그건 **누군가 다시 환불을 시도할 때**만
 * 일어난다. 사용자가 다시 시도하지 않으면 그 주문은 락이 붙은 채로 남아, 나중에 보는 사람이
 * "환불 진행 중"으로 오해한다. 표식을 걷어 상태를 사실과 맞춘다.
 */
export async function releaseStaleRefundLocks(db, { now = new Date(), limit = 50 } = {}) {
  const staleBefore = new Date(now.getTime() - REFUND_LOCK_TTL_MS);
  const stuck = await db.find(
    Payment,
    { status: { $in: PAID_RAW_STATUSES }, refundLock: { $lt: staleBefore } },
    { limit },
  );

  let released = 0;
  for (const order of stuck) {
    const result = await db.updateOne(
      Payment,
      { merchantUid: String(order.merchantUid || ""), refundLock: { $lt: staleBefore } },
      { $unset: { refundLock: "" }, $set: { updatedAt: now } },
    );
    if (Number(result?.modifiedCount || 0) === 1) released += 1;
  }
  return { scanned: stuck.length, released };
}

/**
 * 크론 진입점. 셋을 **직렬로** 돈다 —
 * 병렬로 돌리면 한 번에 여는 Mongo 작업이 늘어 사용자 요청이 쓸 슬롯을 빼앗는다.
 */
export async function runPaymentReconcile(db, { grant, now = new Date(), limit = 50 } = {}) {
  const regrant = await regrantUnfulfilledOrders(db, { grant, now, limit });
  const expired = await expireStalePendingOrders(db, { now, limit });
  const locks = await releaseStaleRefundLocks(db, { now, limit });
  return { regrant, expired, locks };
}

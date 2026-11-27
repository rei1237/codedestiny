/**
 * 크론 정리. **"돈은 받았는데 권한이 없다"를 사람이 찾아내지 않게 하는 것**이 목적이다.
 *
 * 이 파일이 존재하는 이유는 트랜잭션이 없기 때문이다. 쓰기 순서(PG → 주문 PAID → 권한)가
 * 모든 중단점을 복구 가능하게 만들어 두지만, **복구를 실제로 실행하는 주체**가 있어야 그 설계가
 * 완성된다. 여기가 그 주체다.
 *
 * 세 가지를 본다:
 *   1. PAID 인데 지급 표식이 없는 주문 → 다시 지급한다(지급은 멱등이라 안전하다)
 *   2. 오래된 PENDING → PortOne 을 다시 물은 뒤 취소한다(결제창을 열고 이탈한 주문이 영원히 남지 않게). PAID 면 확정한다
 *   3. 죽은 환불 락 → 놓아 준다(PG 호출 중 아이솔레이트가 죽은 경우)
 *
 * 🔴 **재시도 루프가 아니다.** 각 항목을 한 번씩만 시도하고, 실패하면 다음 크론에 다시 만난다.
 * 크론 안에서 재시도를 돌리면 admission 슬롯을 몰아 쓰게 되고, 그게 사용자 요청을 굶긴다.
 */
import { Payment } from "../lib/models.js";
import { REFUND_LOCK_TTL_MS, markOrderCancelled, revivableClosedOrderFilter } from "./orders.js";
import { RESUME_APPROVED_TTL_MS } from "./resume-context.js";
import { listProducts } from "./catalog.js";
import { buildPaymentAlert } from "./fulfillment-alert.js";
import { MANUAL_REVIEW_FAILURE_CODE } from "./birth-identity.js";

const PAID_RAW_STATUSES = Object.freeze(["paid", "success", "fulfilled"]);

/** 지급 대상(출생 정보)을 찾지 못한 오류 — 재시도해도 풀리지 않는다. 사용자가 프로필을 골라야 한다. */
const BIRTH_PROFILE_REQUIRED_CODES = new Set(["MISSING_PROFILE_ID", "INVALID_PROFILE"]);

/** 결제창을 열고 이탈한 주문을 정리하기까지의 유예. PG 창이 열려 있을 수 있으므로 넉넉히 둔다. */
export const PENDING_EXPIRY_MS = 30 * 60_000;

/**
 * "PAID 인데 권한이 없다" 조건. 재지급(regrantUnfulfilledOrders)과 미지급 알림(alertPaymentAnomalies)이
 * 같은 정의를 쓴다 — 둘이 갈라지면 알림은 오는데 재지급은 안 도는(또는 그 반대) 주문이 생긴다.
 */
function unfulfilledClause() {
  return { $or: [
    { entitlementGrantedAt: null },
    { paymentType: "digital_content", featureKey: { $in: listProducts().filter(p => p.billingType === "per_use").map(p => p.featureKey) }, "metadata.purchaseGrantVersion": { $ne: 1 } },
  ] };
}

/**
 * PAID 인데 권한이 없는 주문을 찾아 다시 지급한다.
 *
 * @param {(order: object) => Promise<void>} grant 지급 실행자. orders/entitlements 를 아는 쪽이 넘긴다 —
 *   여기서 직접 부르면 크론이 상품 해석·권한 규칙까지 알아야 해서 책임이 번진다.
 *
 * 🔴 status 는 **"paid" 정확 일치**다(레거시 success/fulfilled 제외, 2026-08-12 크론 배선 시 확정).
 * "paid" 는 V2 markOrderPaid 만 쓰는 값이라 이 필터가 곧 "V2 가 확정한 주문"이다. 레거시 성공
 * 주문은 entitlementGrantedAt 을 쓴 적이 없어 전부 null 이므로, PAID_RAW_STATUSES 로 훑으면
 * **역사적 주문 전체가 매 크론 재지급 스캔**에 걸리고, 구 해금 신원과 V2 신원이 다른 상품은
 * 중복 entitlement 문서까지 만든다. 레거시 주문의 지급 복구는 구 크론(payment-reconcile-task)이
 * 계속 담당한다 — 두 크론이 같은 주문을 이중 처리하지 않는 경계가 바로 이 status 값이다.
 */
export async function regrantUnfulfilledOrders(db, { grant, now = new Date(), limit = 50, minAgeMs = 60_000 } = {}) {
  const cutoff = new Date(now.getTime() - minAgeMs);
  const orders = await db.find(
    Payment,
    {
      status: "paid",
      $and: [
        unfulfilledClause(),
        { $or: [{ "metadata.fulfillmentRetryAt": { $exists: false } }, { "metadata.fulfillmentRetryAt": { $lte: now } }] },
      ],
      // 방금 확정된 주문은 건드리지 않는다 — 정상 흐름이 지급을 마무리하는 중일 수 있다.
      updatedAt: { $lt: cutoff },
      // 프로필 선택 대기로 종결한 주문은 다시 돌리지 않는다 — 사용자가 프로필을 고를 때 지급된다.
      failureCode: { $ne: MANUAL_REVIEW_FAILURE_CODE },
    },
    // 오래 기다린 주문부터 처리하고 실패한 주문은 다음 재시도 시각까지 양보한다.
    { limit, sort: { updatedAt: 1 } },
  );

  let repaired = 0;
  let failed = 0;
  for (const order of orders) {
    try {
      await grant(order);
      repaired += 1;
    } catch (error) {
      // 한 주문의 실패가 나머지를 막지 않는다. 다음 크론에 다시 만난다.
      // 주문별 사유를 남긴다 — 없으면 "돈은 받았는데 안 열림"이 요약의 failed 숫자로만 보인다.
      console.error("[payments] regrant failed", {
        orderId: String(order?.merchantUid || ""),
        message: String(error?.message || error).slice(0, 200),
      });
      failed += 1;
      const code = String(error?.code || "GRANT_FAILED");
      if (BIRTH_PROFILE_REQUIRED_CODES.has(code)) {
        // 소급 출생 기반 주문(스냅샷 생년월일 없음 + 프로필 결손). 무한 재시도 대신 종결 표식을 단다.
        await db.updateOne(Payment, { merchantUid: order.merchantUid, status: "paid" }, {
          $set: { failureCode: MANUAL_REVIEW_FAILURE_CODE, failureStage: "birth_profile_required", "metadata.fulfillmentLastError": code },
          $inc: { "metadata.fulfillmentAttempts": 1 },
        }).catch(() => { console.error("[payments] regrant retry state unavailable", { orderId: String(order.merchantUid || "") }); });
        continue;
      }
      await db.updateOne(Payment, { merchantUid: order.merchantUid, status: "paid" }, {
        $set: { "metadata.fulfillmentRetryAt": new Date(now.getTime() + 5 * 60_000), "metadata.fulfillmentLastError": code },
        // 실패 횟수(운영자 알림 본문의 "재지급 실패 N회"). 재시도는 여전히 무제한이다.
        $inc: { "metadata.fulfillmentAttempts": 1 },
      }).catch(() => { console.error("[payments] regrant retry state unavailable", { orderId: String(order.merchantUid || "") }); });
    }
  }
  return { scanned: orders.length, repaired, failed };
}

/** 만료 직전 PortOne 재조회 1틱 상한. 주문마다 PG 를 부르므로(8s 상한) 작게 두고, 밀린 것은 다음 틱이 이어받는다. */
export const PENDING_EXPIRY_PROBE_LIMIT = 20;
/** 이 PG 상태일 때만 만료 취소한다. 그 밖(pay_pending 등 모르는 값)은 건너뛴다 — fail-closed. */
const EXPIRABLE_PG_STATUSES = Object.freeze(["ready", "failed", "cancelled"]);

/**
 * 오래된 PENDING 주문을 취소한다. 주체가 없으므로 나이 조건이 소유권을 대신한다.
 * 🔴 fail-closed: 구 재조정 태스크가 PortOne 과 대조해 남긴 `metadata.reconcile.lastPgStatus` 가 있고
 * 그 값이 paid 가 아닌 주문만 후보로 고른다. 대조한 적 없는 주문·PG 가 PAID 라는 주문은 그대로 둔다(2026-09-03 사고).
 * 🔴 그 값은 낡을 수 있다(예: 마지막 대조 뒤 승인). 그래서 **취소 직전에 PortOne 을 다시 묻는다**(2026-11-27) —
 *   · PAID → 취소하지 않고 settle(=settleOrderFromReconcile, 금액·통화 대조 포함)로 확정·지급한다.
 *   · 조회 실패·주문 id 불일치·모르는 상태 → 건너뛴다(다음 틱).
 *   · ready/failed/cancelled → ORDER_EXPIRED 취소(월정석 할인 주문은 failed/cancelled 만).
 * probe 가 없으면 아무것도 취소하지 않는다. PG 조회는 DB 슬롯 밖에서 돌아야 하므로 DB 접근은 withDb 로만 한다.
 *
 * @param {object|null} db  withDb 를 넘기지 않을 때 쓸 DB(테스트).
 * @param {{ probe?: (order) => Promise<object>, settle?: (order, pg) => Promise<unknown>, withDb?: (fn) => Promise<unknown> }} options
 */
export async function expireStalePendingOrders(db, {
  now = new Date(), limit = PENDING_EXPIRY_PROBE_LIMIT, olderThanMs = PENDING_EXPIRY_MS,
  probe = null, settle = null, withDb = (fn) => fn(db),
} = {}) {
  if (typeof probe !== "function") return { scanned: 0, cancelled: 0, settled: 0, skipped: 0, probe: false };
  const cutoff = new Date(now.getTime() - olderThanMs);
  const orders = await withDb((conn) => conn.find(
    Payment,
    {
      status: "pending",
      "pricingSnapshot.billingType": {$ne:"business_api"},
      createdAt: { $lt: cutoff },
      "metadata.reconcile.lastPgStatus": { $exists: true, $nin: ["paid"] },
      $or:[{'pricingSnapshot.moonstoneDiscount':{$exists:false}},
        {'metadata.reconcile.lastPgStatus':{$in:['failed','cancelled']}}],
    },
    // 조회가 계속 실패하는 주문이 뒤 주문을 굶기지 않게 확인 시각으로 돌린다.
    { sort: { "metadata.reconcile.expiryCheckedAt": 1, createdAt: 1 }, limit },
  ));

  let cancelled = 0, settled = 0, skipped = 0;
  for (const order of orders) {
    const orderId = String(order.merchantUid || "");
    await withDb((conn) => conn.updateOne(Payment, { merchantUid: orderId, status: "pending" },
      { $set: { "metadata.reconcile.expiryCheckedAt": now } }));
    let pg;
    try {
      pg = await probe(order);
    } catch {
      skipped += 1; // PG 에 닿지 못했다 — 상태를 모르면 닫지 않는다.
      continue;
    }
    if (!pg || String(pg.paymentId || "") !== orderId) { skipped += 1; continue; }
    const pgStatus = String(pg.status || "");
    if (pgStatus === "paid") {
      if (typeof settle !== "function") { skipped += 1; continue; }
      try {
        await settle(order, pg);
        settled += 1;
      } catch (error) {
        skipped += 1;
        console.error("[payments-v2-reconcile] expiry settle failed:", { orderId, code: String(error?.code || error?.message || error) });
      }
      continue;
    }
    const moonstone = Boolean(order.pricingSnapshot?.moonstoneDiscount);
    const expirable = moonstone ? ["failed", "cancelled"] : EXPIRABLE_PG_STATUSES;
    if (!expirable.includes(pgStatus)) { skipped += 1; continue; }
    const ok = await withDb((conn) => markOrderCancelled(conn, {
      orderId,
      reason: "ORDER_EXPIRED",
      olderThan: cutoff,
    }));
    if (ok) cancelled += 1;
  }
  return { scanned: orders.length, cancelled, settled, skipped };
}

/** 닫힌 주문 복구 스윕(2026-11-27). 1틱 상한·되돌아볼 기간·같은 주문 재확인 간격. */
export const CLOSED_ORDER_RECOVERY_LIMIT = 20;
export const CLOSED_ORDER_RECOVERY_LOOKBACK_MS = 30 * 24 * 60 * 60_000;
export const CLOSED_ORDER_RECOVERY_RECHECK_MS = 6 * 60 * 60_000;
/** 막 닫힌 주문은 만료 단계가 방금 PortOne 을 물었으므로 이만큼 지난 뒤부터 본다. */
const CLOSED_ORDER_RECOVERY_SETTLE_MS = 10 * 60_000;

/**
 * 우리 추정으로 닫힌 주문(30분 만료 ORDER_EXPIRED · 클라이언트 실패 보고, orders.js isRevivableClosedOrder) 중
 * 최근 30일 안의 것을 PortOne 에 다시 물어, PAID 면 settle(=settleOrderFromReconcile — 금액·통화 대조 · markOrderPaid CAS ·
 * 멱등 지급)로 확정·지급한다. 이 단계가 없으면 만료 뒤 승인된 결제(가상계좌 입금 등)를 아무 주체도 되살리지 않는다.
 *   · 조회 실패·주문 id 불일치·정산 실패 → 건너뛴다(다음 재확인 때 다시).
 *   · PortOne 이 cancelled/failed → 그 사실을 표식으로 남기고 다시 묻지 않는다. 주문은 닫힌 그대로다.
 *   · 그 밖(ready 등) → 6시간 뒤 다시 본다.
 * 🔴 환불·PG 취소는 하지 않는다. probe 가 없으면 아무것도 하지 않는다. PG 조회는 슬롯 밖, DB 접근은 withDb 로만.
 */
export async function recoverClosedPaidOrders(db, {
  now = new Date(), limit = CLOSED_ORDER_RECOVERY_LIMIT,
  probe = null, settle = null, withDb = (fn) => fn(db),
} = {}) {
  if (typeof probe !== "function" || typeof settle !== "function") return { scanned: 0, settled: 0, closed: 0, skipped: 0, probe: false };
  const orders = await withDb((conn) => conn.find(
    Payment,
    {
      $and: [
        revivableClosedOrderFilter(),
        { createdAt: { $gte: new Date(now.getTime() - CLOSED_ORDER_RECOVERY_LOOKBACK_MS) } },
        { updatedAt: { $lt: new Date(now.getTime() - CLOSED_ORDER_RECOVERY_SETTLE_MS) } },
        { "pricingSnapshot.billingType": { $ne: "business_api" } },
        { "metadata.moonstoneDiscountReleasedAt": { $exists: false } },
        { "metadata.reconcile.recoveryPgStatus": { $nin: ["cancelled", "failed"] } },
        { $or: [
          { "metadata.reconcile.recoveryCheckedAt": { $exists: false } },
          { "metadata.reconcile.recoveryCheckedAt": { $lt: new Date(now.getTime() - CLOSED_ORDER_RECOVERY_RECHECK_MS) } },
        ] },
      ],
    },
    { sort: { "metadata.reconcile.recoveryCheckedAt": 1, createdAt: 1 }, limit },
  ));

  let settled = 0, closed = 0, skipped = 0;
  for (const order of orders) {
    const orderId = String(order.merchantUid || "");
    const stamp = (fields) => withDb((conn) => conn.updateOne(Payment, { merchantUid: orderId, status: { $in: ["cancelled", "failed"] } }, { $set: fields }));
    await stamp({ "metadata.reconcile.recoveryCheckedAt": now });
    let pg;
    try {
      pg = await probe(order);
    } catch {
      skipped += 1;
      continue;
    }
    if (!pg || String(pg.paymentId || "") !== orderId) { skipped += 1; continue; }
    const pgStatus = String(pg.status || "");
    if (pgStatus === "paid") {
      try {
        await settle(order, pg);
        settled += 1;
      } catch (error) {
        skipped += 1;
        console.error("[payments-v2-reconcile] closed order recovery failed:", { orderId, code: String(error?.code || error?.message || error) });
      }
      continue;
    }
    if (pgStatus === "cancelled" || pgStatus === "failed") {
      await stamp({ "metadata.reconcile.recoveryPgStatus": pgStatus });
      closed += 1;
      continue;
    }
    skipped += 1;
  }
  return { scanned: orders.length, settled, closed, skipped };
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
export async function purgeExpiredResumePayloads(db, { now = new Date(), limit = 50 } = {}) {
  const cutoff = new Date(now.getTime() - RESUME_APPROVED_TTL_MS);
  const orders = await db.find(Payment, {
    "metadata.paidResume.payload": { $exists: true },
    "metadata.paidResume.createdAt": { $lt: cutoff },
  }, { limit, sort: { "metadata.paidResume.createdAt": 1 }, projection: { merchantUid: 1 } });
  let purged = 0;
  for (const order of orders) {
    const result = await db.updateOne(Payment, {
      merchantUid: order.merchantUid,
      "metadata.paidResume.createdAt": { $lt: cutoff },
    }, {
      $unset: { "metadata.paidResume.payload": "" },
      $set: { "metadata.paidResume.expiredAt": now },
    });
    purged += Number(result?.modifiedCount || 0);
  }
  // 주문 및 승인 기록은 보존하고 민감한 복원 입력만 제거한다.
  return { scanned: orders.length, purged };
}

/**
 * 슬롯 안에서 도는 정리 묶음. 🔴 PENDING 만료(expireStalePendingOrders)는 여기서 돌지 않는다 — 취소 직전 PortOne
 * 재조회가 필요해 슬롯 밖에서 따로 돈다(index.js runPaymentsV2Reconcile).
 */
export async function runPaymentReconcile(db, { grant, now = new Date(), limit = 50 } = {}) {
  const regrant = await regrantUnfulfilledOrders(db, { grant, now, limit });
  const locks = await releaseStaleRefundLocks(db, { now, limit });
  const resumePrivacy = await purgeExpiredResumePayloads(db, { now, limit });
  // Cold cron only; no gift queries on balance/home requests.
  const { Gift } = await import("../lib/gift-models.js");
  const gifts = await db.find(Gift, { status: "PAID", expiresAt: { $lte: now } }, { limit });
  for (const gift of gifts) await db.updateOne(Gift, { _id: gift._id, status: "PAID", expiresAt: { $lte: now } }, { $set: { status: "EXPIRED", updatedAt: now } });
  return { regrant, locks, resumePrivacy, expiredGifts: gifts.length };
}

/** 결제 후 이만큼 지나도 권한이 없으면 알린다. 정상 확정과 재지급 몇 틱이 끝날 여유다. */
const UNFULFILLED_ALERT_AFTER_MS = 30 * 60_000;
/** 같은 미지급 주문을 다시 알리는 간격과 최대 횟수(하루 한 번, 7번까지). */
const UNFULFILLED_REALERT_INTERVAL_MS = 24 * 60 * 60_000;
const UNFULFILLED_ALERT_MAX_COUNT = 7;
/** 대조 실패는 이 기간 안에 실패 확정된 주문만 본다 — 알림 도입 이전의 실패 주문을 한꺼번에 쏟지 않는다. */
const VERIFY_ALERT_LOOKBACK_MS = 30 * 24 * 60 * 60_000;
/** PG 가 말하는 사실과 주문이 어긋난 코드만(errors.js 422). PG_PAYMENT_NOT_PAID 는 돈이 나가지 않은 주문이라 뺀다. */
const VERIFY_ALERT_CODES = Object.freeze(["AMOUNT_MISMATCH", "CURRENCY_MISMATCH", "PAYMENT_ID_MISMATCH", "STORE_ID_MISMATCH", "CHANNEL_MISMATCH"]);

/**
 * 결제 후 미이행·PG 대조 실패를 운영자에게 알린다(해외카드 1단계 C7). 알림뿐이다 — 지급·환불은 하지 않는다.
 *
 *   A 미지급: paid · 결제 30분+ · 권한 없음(unfulfilledClause) · (미알림 또는 마지막 알림 24시간+ 이고 7회 미만)
 *   B PG 대조 실패: failed · failureStage "pg-verify" · 30일 내 · VERIFY_ALERT_CODES · 주문당 1회
 *
 * @param {(message: {subject: string, text: string}) => Promise<{delivered: boolean}>} notify
 *   발송기(fulfillment-alert.js createOperatorAlertSender). 채널을 아는 쪽이 넘긴다.
 *
 * 🔴 표식(metadata.fulfillmentAlert·metadata.verifyAlert)은 **전달 성공 후에만** 찍는다. 실패·타임아웃·채널
 *    미설정이면 표식이 없어 다음 틱이 다시 보낸다 — 늦게 성공한 발송 때문에 두 번 가는 것은 허용한다
 *    (receipt-email.js 와 같은 판단). 표식은 읽은 값에 건 CAS 라 겹친 틱이 횟수를 두 번 올리지 않는다.
 */
export async function alertPaymentAnomalies(db, { notify, now = new Date(), limit = 20 } = {}) {
  const unfulfilled = await db.find(
    Payment,
    {
      status: "paid",
      paidAt: { $lte: new Date(now.getTime() - UNFULFILLED_ALERT_AFTER_MS) },
      $and: [
        unfulfilledClause(),
        { $or: [
          { "metadata.fulfillmentAlert": { $exists: false } },
          {
            "metadata.fulfillmentAlert.lastAlertedAt": { $lte: new Date(now.getTime() - UNFULFILLED_REALERT_INTERVAL_MS) },
            "metadata.fulfillmentAlert.count": { $lt: UNFULFILLED_ALERT_MAX_COUNT },
          },
        ] },
      ],
    },
    { limit, sort: { paidAt: 1 } },
  );
  const verifyFailures = await db.find(
    Payment,
    {
      status: "failed",
      failureStage: "pg-verify",
      failureCode: { $in: VERIFY_ALERT_CODES },
      updatedAt: { $gte: new Date(now.getTime() - VERIFY_ALERT_LOOKBACK_MS) },
      "metadata.verifyAlert": { $exists: false },
    },
    { limit, sort: { updatedAt: 1 } },
  );
  const summary = { unfulfilled: unfulfilled.length, verifyFailures: verifyFailures.length, delivered: false, marked: 0 };
  if (!unfulfilled.length && !verifyFailures.length) return summary;

  const message = buildPaymentAlert({ unfulfilled, verifyFailures, now });
  try {
    summary.delivered = (await notify({ subject: message.subject, text: message.text }))?.delivered === true;
  } catch {
    summary.delivered = false;
  }
  if (!summary.delivered) return summary;

  for (const order of message.included.unfulfilled) {
    const previous = order?.metadata?.fulfillmentAlert;
    const result = await db.updateOne(Payment, {
      merchantUid: order.merchantUid,
      status: "paid",
      ...(previous ? { "metadata.fulfillmentAlert.count": previous.count } : { "metadata.fulfillmentAlert": { $exists: false } }),
    }, {
      $set: { "metadata.fulfillmentAlert.lastAlertedAt": now },
      $inc: { "metadata.fulfillmentAlert.count": 1 },
    });
    summary.marked += Number(result?.modifiedCount || 0);
  }
  for (const order of message.included.verifyFailures) {
    const result = await db.updateOne(Payment, {
      merchantUid: order.merchantUid,
      status: "failed",
      "metadata.verifyAlert": { $exists: false },
    }, { $set: { "metadata.verifyAlert.lastAlertedAt": now } });
    summary.marked += Number(result?.modifiedCount || 0);
  }
  return summary;
}

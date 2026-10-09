// 주문 단위 매출 사실(ops_revenue_facts, _id = 주문 _id) — 매출 XP 의 유일한 원천.
//
// 인정 조건
//   - 실제 수납: paidAt 과 impUid(PG 거래 id)가 둘 다 있다. status·orderState 값은 경로마다 달라 근거로 쓰지 않는다.
//   - 제공 완료: 상품 유형별 원천(아래 deliveryFor). 결제됐지만 제공 전이면 XP 보류(held).
//   - 환불: 누적 **성공** 환불액(PortOne cancellations[].status=SUCCEEDED). 요청됨·실패는 빼지 않는다.
//     환불 신호가 있는데 조회에 실패하면 refund_unknown 으로 보류하고 다음 실행에서 다시 조회한다.
//   - 제외: 0원 주문(월정석·이용권 사용), 설정의 내부 테스트 계정, PortOne 채널이 TEST 인 주문.
//   - 통화: 원통화·원금과 환산 근거(fxBasis)를 그대로 보존. PayPal 은 주문 때 고정한 priceKRW 로 환산.
//
// 🔴 결제 컬렉션은 읽기만 한다. 결제·환불 경로(confirmOrder·웹훅·환불)는 이 모듈을 모른다 —
//    XP 계산이 실패해도 결제에는 아무 영향이 없다(크론에서 별도 waitUntil + catch).
// 🔴 기존 growth-metrics 의 grossVerifiedKRW 의미는 건드리지 않는다. 여기 값은 별도 지표다.

import { BUSINESS_ID } from "./db.js";
import { applyBucketTarget, revenueXpTarget } from "./xp.js";
import { kstDateKey, kstDateTime } from "./time.js";

export const REVENUE_RULE_VERSION = "ops-revenue-v1";
export const DELIVERY_RULE_VERSION = "ops-delivery-v1";
export const REVENUE_BUCKET = "revenue:cumulative";

const BATCH_LIMIT = 400;
const REFUND_FETCH_LIMIT = 20;
const CURSOR_OVERLAP_MS = 24 * 60 * 60 * 1000;

export const HOLD_REASON_LABELS = Object.freeze({
  delivery_pending: "결제 후 제공 대기",
  delivery_unknown: "제공 판정 불가",
  refund_unknown: "환불 조회 실패 — 재시도 대기",
  fx_pending: "환산 근거 없음",
});

export const EXCLUDE_REASON_LABELS = Object.freeze({
  not_paid: "실수납 확인 안 됨",
  zero_amount: "0원 주문(월정석·이용권 사용)",
  test_account: "내부 테스트 계정",
  test_channel: "PortOne 테스트 채널",
});

export function hasRefundSignal(payment) {
  if (!payment?.paidAt) return false;
  return ["refunded", "cancelled"].includes(payment.status)
    || ["CANCELLED", "PARTIAL_CANCELLED"].includes(payment.orderState)
    || payment.failureCode === "partial_cancel_admin_review"
    || Boolean(payment.refundedAt);
}

/** 원통화 금액과 KRW 환산. PayPal 은 metadata.paypalCharge(USD 센트, 고정 환율, priceKRW). */
export function amountFor(payment) {
  const charge = payment?.metadata?.paypalCharge;
  if (charge && charge.currency && charge.currency !== "KRW") {
    // Number(null) 은 0 이라 근거 없는 주문이 0원으로 "반영"된다 — 빈 값은 없음으로 본다.
    const krw = charge.priceKRW == null || charge.priceKRW === "" ? NaN : Number(charge.priceKRW);
    const minor = charge.totalAmount == null || charge.totalAmount === "" ? NaN : Number(charge.totalAmount);
    return {
      currency: String(charge.currency),
      amountOriginal: Number.isFinite(minor) ? minor / 100 : null,
      amountOriginalMinor: Number.isFinite(minor) ? minor : null,
      amountKRW: Number.isFinite(krw) && krw >= 0 ? Math.round(krw) : null,
      fxBasis: { kind: "order_locked_price", rate: charge.rate ?? null, rateDate: charge.rateDate ?? null, source: charge.source ?? null },
    };
  }
  const krw = Math.max(0, Math.round(Number(payment?.paymentAmount) || 0));
  return { currency: "KRW", amountOriginal: krw, amountOriginalMinor: krw, amountKRW: krw, fxBasis: null };
}

/**
 * 성공 환불 합계(KRW). cancellations 는 PortOne V2 rawV2.cancellations — 금액은 결제 통화의 최소 단위.
 * 외화는 결제 원금 대비 비율로 주문 고정 KRW 를 나눈다(환불 시점 환율을 새로 쓰지 않는다).
 */
export function refundsFor(cancellations, amount) {
  const rows = (Array.isArray(cancellations) ? cancellations : [])
    .filter((row) => String(row?.status || "").toUpperCase() === "SUCCEEDED")
    .map((row) => ({
      id: String(row.id || row.cancellationId || `${row.cancelledAt || ""}:${row.totalAmount}`),
      amountMinor: Math.max(0, Number(row.totalAmount) || 0),
      cancelledAt: row.cancelledAt || row.requestedAt || null,
    }));
  const unique = [...new Map(rows.map((row) => [row.id, row])).values()];
  const totalMinor = unique.reduce((sum, row) => sum + row.amountMinor, 0);
  let refundedKRW;
  if (amount.currency === "KRW") refundedKRW = totalMinor;
  else if (amount.amountOriginalMinor > 0 && amount.amountKRW != null) refundedKRW = Math.round(amount.amountKRW * Math.min(1, totalMinor / amount.amountOriginalMinor));
  else refundedKRW = null;
  return { refunds: unique, refundedMinor: totalMinor, refundedKRW };
}

/**
 * 제공 판정. evidence 는 주문별 원천 조회 결과:
 *   { execution, serviceTx, yeongnyangi, entitlement: "granted"|"refunded"|null, gift, perUse }
 */
export function deliveryFor(payment, evidence = {}) {
  if (payment.purchaseType === "GIFT") {
    return evidence.gift ? { state: "delivered", source: "gift" } : { state: "pending", source: null };
  }
  if (evidence.execution) return { state: "delivered", source: "paid_execution" };
  if (evidence.serviceTx) return { state: "delivered", source: "service_execution" };
  if (evidence.yeongnyangi) return { state: "delivered", source: "yeongnyangi_request" };
  if (evidence.entitlement === "granted") return { state: "delivered", source: "purchase_entitlement" };
  const servicePack = payment.pricingSnapshot?.fulfillmentType === "service_pack";
  const perUse = payment.paymentType === "digital_content" && evidence.perUse !== false;
  if (servicePack || perUse) {
    // 레거시 성공 주문은 구 해금 경로로 제공됐고 entitlementGrantedAt 을 쓴 적이 없다.
    if (["success", "fulfilled"].includes(payment.status)) return { state: "delivered", source: "legacy_status" };
    return { state: "pending", source: null };
  }
  if (payment.entitlementGrantedAt) return { state: "delivered", source: "entitlement_granted_at" };
  if (["success", "fulfilled"].includes(payment.status)) return { state: "delivered", source: "legacy_status" };
  if (payment.status === "paid") return { state: "pending", source: null };
  return { state: "unknown", source: null };
}

/**
 * 주문 하나 → 매출 사실. 순수 함수 — 같은 입력이면 같은 결과.
 * refundCheck: { status: "ok", cancellations, channelType, checkedAt } | { status: "error", error, checkedAt } | null(조회 안 함)
 */
export function buildRevenueFact(payment, { evidence = {}, refundCheck = null, excludedUserIds = [] } = {}) {
  const amount = amountFor(payment);
  const fact = {
    _id: String(payment._id),
    businessId: BUSINESS_ID,
    merchantUid: payment.merchantUid || null,
    userId: payment.userId ? String(payment.userId) : null,
    paymentType: payment.paymentType || null,
    productId: payment.productId || null,
    featureKey: payment.featureKey || null,
    purchaseType: payment.purchaseType || "SELF",
    paidAt: payment.paidAt || null,
    paidDate: payment.paidAt ? kstDateKey(payment.paidAt) : null,
    sourceStatus: payment.status || null,
    sourceOrderState: payment.orderState || null,
    sourceUpdatedAt: payment.updatedAt || null,
    // 기존 reconcile 의 미제공 알림 표식(metadata.fulfillmentAlert) — 표시용.
    fulfillmentAlertCount: Number(payment.metadata?.fulfillmentAlert?.count || 0),
    ...amount,
    refunds: [],
    refundedKRW: 0,
    refundState: "none",
    netKRW: 0,
    delivery: null,
    xpState: "counted",
    holdReason: null,
    excludeReason: null,
    ruleVersion: REVENUE_RULE_VERSION,
    deliveryRuleVersion: DELIVERY_RULE_VERSION,
  };

  if (!payment.paidAt || !payment.impUid) return { ...fact, xpState: "excluded", excludeReason: "not_paid" };
  if (!(Number(payment.paymentAmount) > 0) && !(amount.amountKRW > 0)) return { ...fact, xpState: "excluded", excludeReason: "zero_amount" };
  if (fact.userId && excludedUserIds.map((id) => String(id).toLowerCase()).includes(fact.userId.toLowerCase())) {
    return { ...fact, xpState: "excluded", excludeReason: "test_account" };
  }
  if (refundCheck?.status === "ok" && String(refundCheck.channelType || "").toUpperCase() === "TEST") {
    return { ...fact, xpState: "excluded", excludeReason: "test_channel" };
  }

  if (hasRefundSignal(payment)) {
    if (refundCheck?.status === "ok") {
      const refunds = refundsFor(refundCheck.cancellations, amount);
      fact.refunds = refunds.refunds;
      fact.refundedKRW = refunds.refundedKRW ?? 0;
      fact.refundState = refunds.refundedKRW == null ? "unknown" : refunds.refundedMinor >= (amount.amountOriginalMinor || Infinity) ? "full" : refunds.refundedMinor > 0 ? "partial" : "none";
      fact.refundCheckedAt = refundCheck.checkedAt || null;
    } else {
      fact.refundState = "unknown";
      fact.refundCheckedAt = refundCheck?.checkedAt || null;
      fact.refundError = refundCheck?.error ? String(refundCheck.error).slice(0, 200) : null;
    }
  }

  fact.delivery = { ...deliveryFor(payment, evidence), ruleVersion: DELIVERY_RULE_VERSION };
  fact.netKRW = amount.amountKRW == null ? 0 : Math.max(0, amount.amountKRW - fact.refundedKRW);

  if (amount.amountKRW == null) return { ...fact, xpState: "held", holdReason: "fx_pending" };
  if (fact.refundState === "unknown") return { ...fact, xpState: "held", holdReason: "refund_unknown" };
  // 전액 환불이면 제공 여부와 무관하게 0원이 반영된다(보류할 금액이 없다).
  if (fact.netKRW > 0 && fact.delivery.state !== "delivered") {
    return { ...fact, xpState: "held", holdReason: fact.delivery.state === "pending" ? "delivery_pending" : "delivery_unknown" };
  }
  return fact;
}

const FACT_COMPARE_KEYS = ["netKRW", "refundedKRW", "xpState", "holdReason", "excludeReason", "refundState"];

function factChanged(before, after) {
  if (!before) return true;
  if (FACT_COMPARE_KEYS.some((key) => (before[key] ?? null) !== (after[key] ?? null))) return true;
  return (before.delivery?.state || null) !== (after.delivery?.state || null);
}

/** 성공 환불이 필요한 주문만 PortOne 을 다시 본다. merchantUid(V2 paymentId) → impUid 순. */
async function defaultRefundCheck(env, payment) {
  const { fetchPortOnePayment } = await import("../lib/portone.js");
  const candidates = [payment.merchantUid, payment.impUid].filter(Boolean);
  let lastError = null;
  for (const id of candidates) {
    try {
      const result = await fetchPortOnePayment(env, id);
      const raw = result?.rawV2 || {};
      return { status: "ok", cancellations: raw.cancellations || [], channelType: raw.channel?.type || null, checkedAt: new Date() };
    } catch (error) {
      lastError = error;
    }
  }
  return { status: "error", error: String(lastError?.message || "portone_lookup_failed"), checkedAt: new Date() };
}

async function defaultLoadPayments(env, filter, limit) {
  const { Payment } = await import("../lib/models.js");
  const { withMongoRetry } = await import("../lib/db.js");
  return withMongoRetry(env, () => Payment.find(filter)
    .select({ userId: 1, impUid: 1, merchantUid: 1, paymentAmount: 1, paymentType: 1, productId: 1, featureKey: 1, purchaseType: 1,
      pricingSnapshot: 1, "metadata.paypalCharge": 1, "metadata.fulfillmentAlert": 1, status: 1, orderState: 1, failureCode: 1, paidAt: 1,
      refundedAt: 1, entitlementGrantedAt: 1, updatedAt: 1 })
    .sort({ updatedAt: 1, _id: 1 })
    .limit(limit)
    .lean());
}

async function defaultLoadEvidence(env, payments) {
  const result = new Map();
  if (!payments.length) return result;
  const [{ PaidExecutionRecord, ServiceExecutionTransaction }, { PurchaseEntitlement }, { YeongnyangiRequest }, { Gift }, { resolveProduct }, { withMongoRetry, mongoose }] = await Promise.all([
    import("../lib/models.js"),
    import("../payments/purchase-entitlement-model.js"),
    import("../lib/yeongnyangi-models.js"),
    import("../lib/gift-models.js"),
    import("../payments/catalog.js"),
    import("../lib/db.js"),
  ]);
  const uids = payments.map((payment) => payment.merchantUid).filter(Boolean);
  const ids = payments.map((payment) => payment._id).filter((id) => mongoose.isValidObjectId(id));
  const [entitlements, executions, serviceTxs, requests, gifts] = await Promise.all([
    withMongoRetry(env, () => PurchaseEntitlement.find({ orderId: { $in: uids } }).select({ orderId: 1, status: 1 }).lean()),
    withMongoRetry(env, () => PaidExecutionRecord.find({ paymentId: { $in: uids }, status: "completed", resultId: { $nin: [null, ""] } }).select({ paymentId: 1 }).lean()),
    withMongoRetry(env, () => ServiceExecutionTransaction.find({ deliveryStatus: "delivered", $or: [{ paymentId: { $in: uids } }, { merchantUid: { $in: uids } }, { orderId: { $in: uids } }] })
      .select({ paymentId: 1, merchantUid: 1, orderId: 1 }).lean()),
    withMongoRetry(env, () => YeongnyangiRequest.find({ paymentId: { $in: ids }, state: "COMPLETED" }).select({ paymentId: 1 }).lean()),
    withMongoRetry(env, () => Gift.find({ orderId: { $in: uids }, status: { $in: ["PAID", "CLAIMED"] } }).select({ orderId: 1 }).lean()),
  ]);
  const entitlementBy = new Map();
  for (const row of entitlements) {
    if (row.status === "granted" || !entitlementBy.has(row.orderId)) entitlementBy.set(row.orderId, row.status);
  }
  const executed = new Set(executions.map((row) => row.paymentId));
  const delivered = new Set(serviceTxs.flatMap((row) => [row.paymentId, row.merchantUid, row.orderId]).filter(Boolean));
  const completed = new Set(requests.map((row) => String(row.paymentId)));
  const gifted = new Set(gifts.map((row) => row.orderId));
  for (const payment of payments) {
    let perUse = true;
    try { perUse = String(resolveProduct({ featureKey: String(payment.featureKey || "") }).billingType || "per_use") === "per_use"; } catch { perUse = true; }
    result.set(String(payment._id), {
      perUse,
      entitlement: entitlementBy.get(payment.merchantUid) || null,
      execution: executed.has(payment.merchantUid),
      serviceTx: delivered.has(payment.merchantUid),
      yeongnyangi: completed.has(String(payment._id)),
      gift: gifted.has(payment.merchantUid),
    });
  }
  return result;
}

export const defaultRevenueDeps = { loadPayments: defaultLoadPayments, loadEvidence: defaultLoadEvidence, refundCheck: defaultRefundCheck };

/** 기존 사실의 환불 조회 결과를 다시 쓸 수 있는가(주문이 그 뒤로 바뀌지 않았다면). */
function reusableRefundCheck(existing, payment) {
  if (!existing || existing.refundState === "unknown" || !existing.refundCheckedAt) return null;
  if (payment.updatedAt && new Date(payment.updatedAt) > new Date(existing.refundCheckedAt)) return null;
  return { status: "ok", cancellations: (existing.refunds || []).map((row) => ({ id: row.id, status: "SUCCEEDED", totalAmount: row.amountMinor, cancelledAt: row.cancelledAt })), channelType: existing.channelType || null, checkedAt: existing.refundCheckedAt };
}

/**
 * 결제 → 매출 사실 → 매출 XP 버킷. 커서(updatedAt) 이후 바뀐 주문 + 보류 중인 사실을 다시 본다.
 * full=true 면 revenueSince 이후 전체를 다시 본다(백필 적용·규칙 변경 때).
 */
export async function syncRevenueFacts(env, cols, { settings, now = new Date(), full = false, deps = defaultRevenueDeps, actor = "system" } = {}) {
  const since = kstDateTime(settings.revenueSince, "00:00");
  const state = await cols.syncState.findOne({ _id: "revenue" });
  const held = await cols.revenueFacts.find({ xpState: "held" }, { projection: { _id: 1 } }).limit(BATCH_LIMIT).toArray();
  const heldIds = held.map((row) => row._id);

  const base = { paidAt: { $gte: since }, impUid: { $nin: [null, ""] } };
  // 평소에는 커서 하루 전부터 다시 본다(늦게 바뀐 주문 대비). 한 번에 다 못 본 스캔(pending)을 이어 갈 때는
  // (updatedAt, _id) 정확한 위치에서 이어야 한다 — 겹침을 두면 하루 안에 400건이 넘을 때 같은 묶음만 반복한다.
  const fromStart = full || !state?.cursor;
  const continuing = !fromStart && state.pending && state.cursorId;
  let filter = base;
  if (continuing) {
    const at = new Date(state.cursor);
    const [afterId] = await toPaymentIds([state.cursorId]);
    filter = { ...base, $or: [{ updatedAt: { $gt: at } }, { updatedAt: at, _id: { $gt: afterId } }] };
  } else if (!fromStart) {
    filter = { ...base, updatedAt: { $gte: new Date(new Date(state.cursor).getTime() - CURSOR_OVERLAP_MS) } };
  }
  const changedPayments = await deps.loadPayments(env, filter, BATCH_LIMIT);
  const seen = new Set(changedPayments.map((payment) => String(payment._id)));
  const missingHeld = heldIds.filter((id) => !seen.has(String(id)));
  const heldPayments = missingHeld.length ? await deps.loadPayments(env, { _id: { $in: await toPaymentIds(missingHeld) } }, BATCH_LIMIT) : [];
  const payments = [...changedPayments, ...heldPayments];

  const existingFacts = payments.length
    ? await cols.revenueFacts.find({ _id: { $in: payments.map((payment) => String(payment._id)) } }).toArray()
    : [];
  const existingBy = new Map(existingFacts.map((fact) => [fact._id, fact]));
  const evidence = await deps.loadEvidence(env, payments);

  let refundFetches = 0;
  const changedIds = [];
  for (const payment of payments) {
    const id = String(payment._id);
    const existing = existingBy.get(id);
    let refundCheck = null;
    if (hasRefundSignal(payment)) {
      refundCheck = reusableRefundCheck(existing, payment);
      if (!refundCheck && refundFetches < REFUND_FETCH_LIMIT) {
        refundFetches += 1;
        refundCheck = await deps.refundCheck(env, payment);
      }
    }
    const fact = buildRevenueFact(payment, { evidence: evidence.get(id) || {}, refundCheck, excludedUserIds: settings.excludedUserIds });
    if (refundCheck?.channelType) fact.channelType = refundCheck.channelType;
    if (!factChanged(existing, fact) && existing) continue;
    changedIds.push(id);
    await cols.revenueFacts.updateOne(
      { _id: id },
      {
        $set: { ...fact, updatedAt: now },
        $setOnInsert: { createdAt: now, firstSeenAt: now },
        $inc: { revision: 1 },
        $push: { changes: { $each: [{ at: now, netKRW: fact.netKRW, xpState: fact.xpState, holdReason: fact.holdReason, excludeReason: fact.excludeReason, delivery: fact.delivery?.state || null }], $slice: -20 } },
      },
      { upsert: true },
    );
  }

  const target = await revenueTargetFor(cols, since);
  const ledger = await applyBucketTarget(cols, {
    bucket: REVENUE_BUCKET,
    target: target.xp,
    sourceType: "revenue",
    sourceIds: changedIds,
    stage: "verified_delivered_net",
    reason: full ? "revenue_full_resync" : "revenue_sync",
    occurredAt: now,
    actor,
    now,
  });

  const more = changedPayments.length >= BATCH_LIMIT;
  const last = changedPayments.at(-1);
  // 전체 재스캔은 이전 커서를 씨앗으로 쓰지 않는다 — 앞부분만 본 상태에서 커서가 뒤로 건너뛰면 안 된다.
  const maxUpdated = changedPayments.reduce((max, payment) => {
    const time = payment.updatedAt ? new Date(payment.updatedAt).getTime() : 0;
    return Math.max(max, time);
  }, !fromStart && state?.cursor ? new Date(state.cursor).getTime() : 0);
  const cursorAt = more && last?.updatedAt ? new Date(last.updatedAt) : maxUpdated ? new Date(maxUpdated) : (state?.cursor || null);
  await cols.syncState.updateOne(
    { _id: "revenue" },
    {
      $set: {
        source: "payments",
        cursor: cursorAt,
        cursorId: more && last ? String(last._id) : null,
        pending: more,
        lastRunAt: now,
        lastSuccessAt: now,
        lastError: null,
        window: { since: settings.revenueSince, until: kstDateKey(now) },
        counts: { scanned: payments.length, changed: changedIds.length, refundFetches, more },
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  return { scanned: payments.length, changed: changedIds.length, refundFetches, target, ledgerDelta: ledger.delta, more };
}

async function toPaymentIds(ids) {
  const { mongoose } = await import("../lib/db.js");
  return ids.map((id) => (mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(String(id)) : id));
}

/** 인정 매출 합계 → XP 목표. 주문별로 반올림하지 않고 합계에서 한 번만 내린다. */
export async function revenueTargetFor(cols, since) {
  const facts = await cols.revenueFacts.find(
    { xpState: "counted", paidAt: { $gte: since } },
    { projection: { netKRW: 1 } },
  ).toArray();
  const netKRW = facts.reduce((sum, fact) => sum + (Number(fact.netKRW) || 0), 0);
  return { netKRW, orders: facts.length, xp: revenueXpTarget(netKRW) };
}

/** 기간 지표 — 결제액·환불액·환불 차감 결제액·보류. 정산액·이익은 원천이 없어 null. */
export async function revenueSummary(cols, { fromDate, toDate }) {
  const facts = await cols.revenueFacts.find(
    { paidDate: { $gte: fromDate, $lte: toDate } },
    { projection: { amountKRW: 1, refundedKRW: 1, netKRW: 1, xpState: 1, holdReason: 1, excludeReason: 1, paidDate: 1, delivery: 1, currency: 1 } },
  ).toArray();
  const out = { grossKRW: 0, refundedKRW: 0, netKRW: 0, orders: 0, held: {}, excluded: {}, byDate: {}, currencies: {}, settlementKRW: null, profitKRW: null };
  for (const fact of facts) {
    if (fact.xpState === "excluded") {
      out.excluded[fact.excludeReason] = (out.excluded[fact.excludeReason] || 0) + 1;
      continue;
    }
    out.orders += 1;
    out.grossKRW += Number(fact.amountKRW) || 0;
    out.refundedKRW += Number(fact.refundedKRW) || 0;
    out.netKRW += Number(fact.netKRW) || 0;
    out.currencies[fact.currency] = (out.currencies[fact.currency] || 0) + 1;
    if (fact.xpState === "held") out.held[fact.holdReason] = (out.held[fact.holdReason] || 0) + 1;
    const day = out.byDate[fact.paidDate] || { grossKRW: 0, refundedKRW: 0, netKRW: 0, orders: 0 };
    day.grossKRW += Number(fact.amountKRW) || 0;
    day.refundedKRW += Number(fact.refundedKRW) || 0;
    day.netKRW += Number(fact.netKRW) || 0;
    day.orders += 1;
    out.byDate[fact.paidDate] = day;
  }
  return out;
}

/**
 * 백필 미리보기 — 아무것도 쓰지 않는다. PortOne 도 부르지 않는다(환불 신호가 있는데 기존 조회 결과가
 * 없는 주문은 refund_unknown 으로 세어 보여 준다). 적용은 라우트가 설정을 바꾼 뒤 full 동기화로 한다.
 */
export async function previewRevenueBackfill(env, cols, { since, settings, deps = defaultRevenueDeps }) {
  const sinceDate = kstDateTime(since, "00:00");
  const payments = await deps.loadPayments(env, { paidAt: { $gte: sinceDate }, impUid: { $nin: [null, ""] } }, 5000);
  const existing = await cols.revenueFacts.find({ _id: { $in: payments.map((payment) => String(payment._id)) } }).toArray();
  const existingBy = new Map(existing.map((fact) => [fact._id, fact]));
  const evidence = await deps.loadEvidence(env, payments);
  const counts = { counted: 0, held: 0, excluded: 0 };
  const holdReasons = {};
  let netKRW = 0;
  for (const payment of payments) {
    const id = String(payment._id);
    const refundCheck = hasRefundSignal(payment) ? reusableRefundCheck(existingBy.get(id), payment) : null;
    const fact = buildRevenueFact(payment, { evidence: evidence.get(id) || {}, refundCheck, excludedUserIds: settings.excludedUserIds });
    counts[fact.xpState] += 1;
    if (fact.xpState === "held") holdReasons[fact.holdReason] = (holdReasons[fact.holdReason] || 0) + 1;
    if (fact.xpState === "counted") netKRW += fact.netKRW;
  }
  return { since, orders: payments.length, counts, holdReasons, netKRW, targetXp: revenueXpTarget(netKRW), truncated: payments.length >= 5000 };
}

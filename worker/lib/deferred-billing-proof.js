/**
 * 지연차감(deferUsage) 등록 증빙 조회 — **레포 유일 정본**.
 *
 * ## 왜 이 파일이 생겼나
 *
 * `deferUsage: true` 인 기능(운명 찻집·신년운세·인생책·업연·숙요궁합·프리미엄 언락)은
 * 결제 런타임이 성공한 **직후** `/api/billing/coin-gate/deferred/register` 를 부르고,
 * 그 핸들러가 "이 사용자가 정말 냈는가"를 DB 에서 확인해 `PaidExecutionRecord` 를 만든다.
 * 여기서 못 찾으면 402(PAYMENT_VERIFICATION_FAILED)가 나가고, 클라이언트는 그 402 를
 * 결제 실패로 번역한다 — **돈은 이미 나갔는데 서비스가 열리지 않는다.**
 *
 * 그런데 이 조회는 `worker/routes/billing.js` 안에 손으로 적힌 3갈래(PointHistory ·
 * MonthlyCreditLedger · Payment) 단발 쿼리였고, 다음이 전부 빠져 있었다 —
 *
 *   · **월정석**: 원장 쿼리를 사본으로 들고 있었다. 미정산 예약행(settledAt 없음)을 배제하지
 *     못해, 차감은 끝났는데 정산 write 가 안 내려앉은 창에서 402 가 났다. 이 사고 계열은
 *     이미 `worker/lib/moonstone-spend-proof.js` 로 한 번 정리됐는데 여기만 못 받았다.
 *   · **이용권**: `worker/payments/index.js` 의 pass-check 는 멱등 재시도(같은 requestId)를
 *     `recentConsumeRequestIds` 마커로 먼저 걸러 **`recordPassUsageEvidence` 를 건너뛴다.**
 *     그래서 재시도 경로에는 PointHistory 행이 없고, 이용권을 이미 소비하고도 402 가 났다.
 *     (`recordPassUsageEvidence` 자신도 실패를 삼키므로 첫 시도에서 행이 없을 수 있다.)
 *   · **이미 만들어진 지급행**: `PaidExecutionRecord` 를 아예 안 봤다. 같은 요청을 다시 내면
 *     첫 등록의 결과물이 눈앞에 있는데도 처음부터 다시 증빙을 찾다가 떨어졌다.
 *
 * 소비 라우트 쪽(`worker/routes/fortune-tea-house.js resolveFortuneTeaBillingEvidenceAccess`)은
 * 이미 이 4갈래를 다 본다. **register 만 관대함이 부족해서 결제된 세션을 버리고 있었다.**
 *
 * 🔴 여기서 판정 사본을 만들지 말 것. 월정석은 moonstone-spend-proof, 이용권 마커는
 *    `worker/payments/passes.js buildPassConsumeMarker` 가 정본이고 이 파일은 그것을 부른다.
 *
 * ## 🔴 재시도 계층은 하나다 (CLAUDE.md 코딩 원칙 6)
 *
 * `findVerifiedDeferredBillingEvidence` 는 **순수 조회**다 — 재시도하지 않는다.
 * 쓰기 전파 지연을 기다리는 유일한 계층은 `findDeferredBillingEvidenceWithSettleWindow` 이고,
 * 호출부(register 핸들러)는 그 쪽만 부른다. 여기에 또 감싸지 말 것.
 */
import mongoose from "mongoose";
import { MonthlyCreditLedger, PaidExecutionRecord, Payment, PointHistory, User } from "./models.js";
import { findMoonstoneSpendEvidence } from "./moonstone-spend-proof.js";

/** 이미 지급행이 만들어진 상태들. worker/routes/fortune-tea-house.js 의 목록과 같은 집합이다. */
const DEFERRED_RECORD_STATUSES = ["paid_pending_generation", "generating", "generation_failed", "completed"];
const PAID_PAYMENT_STATUSES = ["paid", "success", "fulfilled"];

/**
 * 전파 지연을 기다리는 간격. 합계 1.1초로 묶는다 — 결제 직후 사용자가 로딩 화면에서
 * 기다리는 구간이라 더 길면 체감이 나빠지고, 더 짧으면 Mongo 세컨더리 반영을 못 넘긴다.
 * 🔴 상한을 넘기면 **통과시키지 않는다**(fail-closed). 여기는 지연을 흡수하는 창이지
 *    증빙 없는 요청을 통과시키는 우회로가 아니다.
 */
const SETTLE_WINDOW_DELAYS_MS = Object.freeze([400, 700]);

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function objectIdLike(value) {
  const text = String(value || "").trim();
  return Boolean(text && mongoose.Types.ObjectId.isValid(text));
}

export function normalizeDeferredPaymentMethod(value) {
  const method = String(value || "").trim().toUpperCase();
  if (method === "MONTHLY" || method === "MONTHLY_CREDIT" || method === "MOONLIGHT_STONE") return "MONTHLY";
  if (method === "PASS" || method === "MEMBERSHIP_PASS") return "PASS";
  if (method === "FAMILY" || method === "FAMILY_PASS") return "FAMILY";
  if (method === "DIRECT_KRW" || method === "CARD" || method === "SINGLE_PURCHASE") return "DIRECT_KRW";
  return "COIN";
}

export function deferredAccessType(paymentMethod) {
  const method = normalizeDeferredPaymentMethod(paymentMethod);
  if (method === "MONTHLY") return "membership_credit";
  if (method === "PASS") return "membership_pass";
  if (method === "FAMILY") return "family";
  if (method === "DIRECT_KRW") return "single_purchase";
  return "coin";
}

export function collectDeferredEvidenceIds(...sources) {
  const ids = new Set();
  const visit = (value, depth = 0) => {
    if (!value || depth > 3) return;
    if (typeof value !== "object") return;
    for (const key of ["_id", "id", "paymentId", "merchantUid", "merchant_uid", "impUid", "imp_uid", "transactionId", "purchaseId", "evidenceId", "requestId", "idempotencyKey", "orderId", "ledgerId"]) {
      const id = String(value?.[key] || "").trim();
      if (id) ids.add(id);
    }
    for (const key of ["data", "consume", "accessGrant", "payment", "pricing", "billingGate"]) visit(value?.[key], depth + 1);
  };
  sources.forEach((source) => visit(source));
  return [...ids];
}

/**
 * 토큰 하나가 증빙 컬렉션에서 나타날 수 있는 자리.
 * 🔴 `metadata.transactionId`·`metadata.evidenceId`·`metadata.paymentId` 는 소비 라우트
 *    (fortune-tea-house `idClauses`)가 이미 보는 자리다. 여기만 빠져 있어서, 클라이언트가
 *    `consume.transactionId` 만 에코한 요청이 register 에서 떨어지고 소비 단계에서는
 *    통과하는 비대칭이 있었다.
 */
export function deferredEvidenceClauses(ids = []) {
  const clauses = [];
  for (const id of ids) {
    clauses.push({ requestId: id }, { idempotencyKey: id }, { merchantUid: id }, { impUid: id });
    clauses.push({ "metadata.requestId": id }, { "metadata.purchaseId": id }, { "metadata.idempotencyKey": id }, { "metadata.orderId": id }, { "metadata.ledgerId": id }, { "metadata.pointHistoryId": id });
    clauses.push({ "metadata.transactionId": id }, { "metadata.evidenceId": id }, { "metadata.paymentId": id });
    clauses.push({ sourceId: id });
    if (objectIdLike(id)) clauses.push({ _id: id }, { paymentId: id });
  }
  return clauses;
}

function recordClauses(ids = []) {
  const clauses = [];
  for (const id of ids) {
    clauses.push(
      { requestId: id },
      { idempotencyKey: id },
      { executionId: id },
      { orderId: id },
      { "result.deferredUsage.requestId": id },
      { "result.deferredUsage.paymentId": id },
    );
    if (objectIdLike(id)) clauses.push({ _id: id }, { paymentId: id });
  }
  return clauses;
}

/**
 * 이용권 소비 마커를 사용자 문서에서 확인한다.
 *
 * 마커 형식의 정본은 `worker/payments/passes.js buildPassConsumeMarker` 하나다.
 * 🔴 정본은 **동적 임포트**로 가져온다 — `worker/lib/pass-consumption.js` 와 같은 이유다.
 *    payments/* 를 정적으로 물면 그 그래프(passes → orders → db)가 워커 메인 청크에 들어가
 *    `verify:worker-size` 예산을 먹는다.
 */
async function findPassConsumeEvidence(userId, featureKey, ids) {
  if (!featureKey || !ids.length) return null;
  const { buildPassConsumeMarker } = await import("../payments/passes.js");
  const markers = ids.map((id) => buildPassConsumeMarker(featureKey, id)).filter(Boolean);
  if (!markers.length) return null;
  const user = await User.findById(userId).select("recentConsumeRequestIds").lean();
  const consumed = Array.isArray(user?.recentConsumeRequestIds) ? user.recentConsumeRequestIds : [];
  if (!consumed.length) return null;
  const hit = markers.find((marker) => consumed.includes(marker));
  if (!hit) return null;
  return {
    source: "pass_consume_marker",
    paymentMethod: "PASS",
    accessType: "membership_pass",
    paymentId: hit,
    evidence: { passConsumeMarker: hit },
    alreadyConsumed: true,
  };
}

/**
 * 이 사용자가 이 기능에 대해 실제로 지불했는가.
 *
 * @returns {Promise<{source:string, paymentMethod:string, accessType:string, paymentId:string,
 *                    evidence:object, alreadyConsumed:boolean}|null>}
 *   null 은 "증빙 없음"이다. DB 장애는 던진다 — 호출부가 402 가 아닌 503 으로 다뤄야 한다.
 */
export async function findVerifiedDeferredBillingEvidence(env, authUserId, featureKey, body = {}) {
  const gate = safeObject(body.billingGate || body.billing || body.billingResult || body.paymentContext);
  const ids = collectDeferredEvidenceIds(body, gate);
  const clauses = deferredEvidenceClauses(ids);
  if (!clauses.length) return null;

  // 1) 이미 만들어진 지급행. 같은 요청의 재시도는 여기서 멱등하게 끝난다.
  const deferredClauses = recordClauses(ids);
  const record = deferredClauses.length
    ? await PaidExecutionRecord.findOne({
      userId: String(authUserId || ""),
      featureId: featureKey,
      status: { $in: DEFERRED_RECORD_STATUSES },
      $or: deferredClauses,
    }).sort({ updatedAt: -1, createdAt: -1 }).select("_id executionId requestId paymentId accessMethod result").lean()
    : null;
  if (record) {
    const snapshot = safeObject(safeObject(record.result).deferredUsage);
    const method = normalizeDeferredPaymentMethod(snapshot.paymentMethod || record.accessMethod);
    return {
      source: "paid_execution_record",
      paymentMethod: method,
      accessType: snapshot.accessType || deferredAccessType(method),
      paymentId: String(record.paymentId || record.executionId || record._id || ""),
      evidence: { executionId: String(record.executionId || ""), paidExecutionRecordId: String(record._id || "") },
      alreadyConsumed: true,
    };
  }

  // 2) 코인·이용권 차감 이력(이용권은 recordPassUsageEvidence 가 delta 0 으로 남긴다).
  const pointHistory = await PointHistory.findOne({
    userId: authUserId,
    kind: "deduct",
    featureKey,
    $or: clauses,
  }).sort({ createdAt: -1 }).select("_id metadata").lean();
  if (pointHistory) {
    const meta = safeObject(pointHistory.metadata);
    const method = normalizeDeferredPaymentMethod(meta.paymentMethod || meta.accessMethod || meta.accessType);
    return {
      source: "point_history",
      paymentMethod: method,
      accessType: meta.accessType || deferredAccessType(method),
      paymentId: String(pointHistory._id || ""),
      evidence: { pointHistoryId: String(pointHistory._id || "") },
      alreadyConsumed: true,
    };
  }

  // 3) 이용권 소비 마커. 멱등 재시도로 증빙 행이 안 남은 경우의 유일한 증거다.
  const passEvidence = await findPassConsumeEvidence(authUserId, featureKey, ids);
  if (passEvidence) return passEvidence;

  // 4) 월정석. 🔴 원장 쿼리 사본을 여기 만들지 말 것 — 정본은 moonstone-spend-proof 하나다.
  const moonstone = await findMoonstoneSpendEvidence(env, {
    userId: authUserId,
    featureKeys: [featureKey],
    tokens: ids,
  });
  if (moonstone) {
    return {
      source: "monthly_credit_ledger",
      paymentMethod: "MONTHLY",
      accessType: "membership_credit",
      paymentId: String(moonstone.ledgerId || moonstone.sourceId || ""),
      evidence: { ledgerId: String(moonstone.ledgerId || ""), sourceId: String(moonstone.sourceId || "") },
      alreadyConsumed: true,
    };
  }

  // 5) 단건 결제(PortOne). markOrderPaid 가 status 를 "paid" 로 뒤집은 행이다.
  const payment = await Payment.findOne({
    userId: authUserId,
    paymentType: "digital_content",
    status: { $in: PAID_PAYMENT_STATUSES },
    $and: [
      { $or: clauses },
      {
        $or: [
          { featureKey },
          { "pricingSnapshot.featureKey": featureKey },
          { "metadata.featureKey": featureKey },
        ],
      },
    ],
  }).sort({ paidAt: -1, updatedAt: -1, createdAt: -1 }).select("_id merchantUid impUid requestId").lean();
  if (payment) {
    return {
      source: "payment",
      paymentMethod: "DIRECT_KRW",
      accessType: "single_purchase",
      paymentId: String(payment.merchantUid || payment.impUid || payment.requestId || payment._id || ""),
      evidence: { paymentId: String(payment._id || ""), merchantUid: payment.merchantUid || "", impUid: payment.impUid || "" },
      alreadyConsumed: true,
    };
  }

  return null;
}

/**
 * 위 조회를 쓰기 전파 지연 창만큼만 다시 본다. **재시도 계층은 이것 하나뿐이다.**
 * @param {(ms:number)=>Promise<void>} [sleep] 테스트가 대기를 건너뛰기 위한 주입점.
 */
export async function findDeferredBillingEvidenceWithSettleWindow(env, authUserId, featureKey, body = {}, {
  delaysMs = SETTLE_WINDOW_DELAYS_MS,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  let evidence = await findVerifiedDeferredBillingEvidence(env, authUserId, featureKey, body);
  for (const delay of delaysMs) {
    if (evidence) return evidence;
    await sleep(delay);
    evidence = await findVerifiedDeferredBillingEvidence(env, authUserId, featureKey, body);
  }
  return evidence;
}

export const __deferredBillingProofTestUtils = { recordClauses, SETTLE_WINDOW_DELAYS_MS };

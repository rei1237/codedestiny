// 회당 결제 라우트 — 서버측 결제 증빙 검증(공용).
//
// 대상: /api/nakshatra/compat(₩10,000) · /api/nakshatra-premium/muhurta(₩5,000)
//       /api/nakshatra-premium/vvip-codex(₩50,000)
//       /api/fortune/guardian/generate(연이 운명 상담 ₩5,000, 무료 소진 이후)
//       /api/fusion-fortune/generate[/stream](초융합 운세 ₩30,000)
// 나크샤트라 3종은 지금도 관측 전용(PER_USE_ENFORCE=false)이지만, 연이·초융합 두 상담은
// 이 함수의 판정으로 **실제로 차단**한다(2026-08-07, 전용 재화 폐지와 함께).
// 지금까지 이 셋은 requireAuth 뿐이라 로그인만 하면 결제 없이 본문이 나갔다.
//
// 정본 패턴은 같은 기능군의 worker/routes/nakshatra-ai.js resolveStartAccess 다
// (서명 토큰 → Payment → MonthlyCreditLedger/PointHistory → 이용권 → admin).
// 여기서는 /ensure-access 단계가 없는 **동기 라우트용으로 축약**했다 — 서명 토큰 경로 제외.
//
// 🔴 canAccessPaidFeature 를 관문으로 쓰지 않는다. 그 함수는 엔티틀먼트(영구 해금) 전용이라
//    회당결제 키에는 언제나 PAYMENT_REQUIRED 를 돌려주고, 이미 차감된 사용자가 402 를 맞아
//    돈만 나간다(레포에 사고 이력). 대신 "차감·결제 기록이 실제로 있는가"를 DB 로 직접 본다.
//
// 🔴 클라이언트가 보낸 값을 근거로 삼지 않는다. requestId 는 **DB 를 찾는 열쇠**일 뿐이고,
//    증빙은 언제나 서버가 읽은 문서다. requestId 를 위조해도 그 이름의 차감 기록이 없으면 통과하지 못한다.

import mongoose from "mongoose";
import { connectDb, isTransientMongoError, withMongoRetry } from "./db.js";
import { isAuthDbInfraError } from "./auth.js";
import { User, Payment, PointHistory, MonthlyCreditLedger } from "./models.js";
import { normalizeHoneyPassEntitlement, canUseByPass, resolveMonthlySpendQuota, resolvePremiumQuota } from "./profile-limits.js";
// 🔴 family 공정이용 상한의 cycleKey 는 entitlement 의 expiresAt 에서 나온다. coin-gate 가 쓰는 것과
// **같은 생산자**를 써야 두 곳의 cycleKey 가 일치하고, 저장된 카운터를 실제로 읽을 수 있다
// (다른 생산자를 쓰면 storedKey 불일치로 used 가 항상 0 이 되어 검사가 조용히 무력해진다).
import { resolveCanonicalEntitlement } from "./entitlement-policy.js";

const ID_MAX = 180;

function clean(value, max = ID_MAX) {
  return String(value ?? "").trim().slice(0, max);
}

function isObjectId(value) {
  return Boolean(value) && mongoose.Types.ObjectId.isValid(value);
}

// 단건결제(카드/간편결제) — Payment 문서가 남는다.
async function findPaidPayment(userId, featureKey, requestId) {
  if (!requestId) return null;
  return Payment.findOne({
    userId,
    featureKey,
    status: { $in: ["paid", "success", "fulfilled"] },
    $or: [
      { requestId },
      { idempotencyKey: requestId },
      { merchantUid: requestId },
      { impUid: requestId },
    ],
  }).select("_id merchantUid impUid").lean();
}

// 코인 차감 · 월정석 차감 — 둘 다 PointHistory deduct 로 남고 metadata.accessType 으로 갈린다.
async function findDeduction(userId, featureKey, requestId) {
  if (!requestId) return null;
  return PointHistory.findOne({
    userId,
    kind: "deduct",
    featureKey,
    $or: [
      { "metadata.requestId": requestId },
      { "metadata.idempotencyKey": requestId },
      { "metadata.purchaseId": requestId },
      { "metadata.orderId": requestId },
    ],
  }).select("_id metadata").lean();
}

// 월정석 차감의 회계 정본은 이 원장 하나다(worker/payments/moonstone.js — V2 는 PointHistory 를
// 일부러 쓰지 않는다). 그래서 이 조회가 월정석의 **유일한** 증빙 경로다.
//
// 🔴 조회 필드는 writer 가 실제로 쓰는 이름이어야 한다. 예전 이 함수는 top-level `requestId`·
//    `idempotencyKey` 로 찾았는데 **원장 스키마에 그런 필드가 없다**(models.js monthlyCreditLedgerSchema —
//    멱등키는 `sourceId` 다). 구 billing.js 시절에는 그 경로가 함께 남기던 PointHistory 로 증빙이
//    서서 결함이 가려져 있었고, V2 컷오버가 PointHistory 쓰기를 없애자 월정석으로 결제한 사용자가
//    차감만 당하고 402(미결제)를 받았다(초융합 운세 ₩30,000 실사고). 계약은
//    __tests__/worker/per-use-proof-roundtrip.test.js 가 writer↔reader 왕복으로 고정한다.
async function findMonthlyLedger(userId, featureKey, requestId) {
  if (!requestId) return null;
  const clauses = [
    { sourceId: requestId },                    // V2 정본(worker/payments/moonstone.js)
    { "metadata.purchaseId": requestId },       // V2 가 함께 남기는 값
    { "metadata.requestId": requestId },        // 구 billing.js 행
    { "metadata.idempotencyKey": requestId },
    { "metadata.orderId": requestId },
  ];
  if (isObjectId(requestId)) clauses.push({ _id: requestId });
  return MonthlyCreditLedger.findOne({
    userId,
    type: "MONTHLY_CREDIT_SPEND",
    serviceKey: featureKey,
    // 🔴 미정산 예약행은 증빙이 아니다. V2 는 "원장 예약 → lot 차감 → 정산" 순으로 도는데
    //    (moonstone.js), 예약과 차감 사이에서 죽으면 **차감되지 않은 행**이 남는다. 이 조건을
    //    빼면 결제에 실패한 요청이 유료 결과를 공짜로 연다.
    settledAt: { $exists: true },
    // 해금 실패로 되돌린 차감은 증빙이 아니다 — billing.js 의 멱등 재조회와 같은 제외 조건.
    "metadata.refundedForUnlockFailure": { $ne: true },
    $or: clauses,
  }).select("_id").lean();
}

/**
 * 회당 결제 증빙 검증.
 *
 * @param {object} env
 * @param {{ userId:string, featureKey:string, coinPrice:number, requestId:string }} input
 * @returns {Promise<{proven:(boolean|null), source:string, reason:string}>}
 *   proven === true  : 증빙됨
 *   proven === false : 증빙 못 찾음
 *   proven === null  : 🔴 판단 보류(DB 일시 장애). 절대 402 로 바꾸지 말 것 — 503 이다.
 */
export async function verifyPerUsePayment(env, { userId, featureKey, coinPrice = 0, requestId = "" } = {}) {
  const uid = clean(userId, 64);
  const key = clean(featureKey, 120);
  const rid = clean(requestId);
  if (!uid || !key) return { proven: false, source: "", reason: "MISSING_IDENTITY" };

  try {
    await connectDb(env);

    // 1) 단건결제
    if (await withMongoRetry(env, () => findPaidPayment(uid, key, rid))) {
      return { proven: true, source: "payment", reason: "" };
    }

    // 2) 코인 / 3) 월정석 — 같은 컬렉션에서 accessType 으로 갈린다.
    const deduction = await withMongoRetry(env, () => findDeduction(uid, key, rid));
    if (deduction) {
      const accessType = String(deduction?.metadata?.accessType || "").toLowerCase();
      return {
        proven: true,
        source: accessType === "membership_credit" ? "monthly" : "coin",
        reason: "",
      };
    }
    if (await withMongoRetry(env, () => findMonthlyLedger(uid, key, rid))) {
      return { proven: true, source: "monthly", reason: "" };
    }

    // 4) 이용권 커버 — 차감 기록이 없는 **정상** 경로다(무료 통과라 Payment 도 PointHistory 도 안 남는다).
    //    결제창을 띄우는 게 아니라 "이미 커버된 사용자인가"만 읽으므로 게이팅 이중 적용이 아니다.
    // 5) admin
    const user = await withMongoRetry(env, () => User.findById(uid)
      .select("role profileSubscription subscription membership membershipPass pass entitlement licensePass passTier expiresAt isActive")
      .lean());
    if (!user) return { proven: false, source: "", reason: "USER_NOT_FOUND" };
    if (String(user.role || "").toLowerCase() === "admin") {
      return { proven: true, source: "admin", reason: "" };
    }
    // 🔴 family 는 canUseByPass 가 가격을 보지 않고 무조건 통과시킨다(profile-limits.js 의
    // "passTier === FAMILY 면 price >= 0 이기만 하면 true"). 그래서 기간당 공정이용 상한
    // (family 10회 · vvip 3회)과 월 누적 한도가 coin-gate 의 소비 단계에만 존재했고, 게이트를
    // 거치지 않고 이 라우트를 직접 호출하면 상한을 넘겨도 통과했다.
    //
    // 정상 사용자는 여기 오지 않는다: 이용권 사용은 recordPassAccessIfNeeded 가 PointHistory
    // 증빙을 남기므로 위 2)의 findDeduction 에서 이미 proven 으로 끝난다. 즉 이 검사가 막는 것은
    // "증빙이 없는데 이용권이라서 통과하던" 우회 호출뿐이다.
    //
    // 판정을 못 내리면(만료일 없음 → cycleKey 없음, 해당 등급 아님) applies=false 로 열어 둔다 —
    // resolvePremiumQuota/resolveMonthlySpendQuota 의 문서화된 정책이며, 셀 수 없는 상태에서
    // 막지 않는다.
    const canonicalEntitlement = resolveCanonicalEntitlement(user || {});
    const familyQuota = resolvePremiumQuota(
      user?.profileSubscription || {},
      canonicalEntitlement,
      Number(coinPrice) || 0,
    );
    // familyQuota.eligible 인 건은 canUseByPass(건당 상한)를 통과 못해도 커버 대상이다 — VVIP는
    // 건당 상한(10,000원)이 상담 포함횟수 기준가(300코인=30,000원)보다 낮아, 순서를 그대로 두면
    // 포함횟수가 죽은 코드가 된다. cycleKey를 못 구해도(만료일 없음) 열어 둬야 하므로 applies가
    // 아니라 eligible을 쓴다(profile-limits.js의 resolvePremiumQuota 주석 참고).
    if (canUseByPass(normalizeHoneyPassEntitlement(user), Number(coinPrice) || 0) || familyQuota.eligible) {
      if (familyQuota.applies && familyQuota.exhausted) {
        return { proven: false, source: "", reason: "PREMIUM_QUOTA_EXHAUSTED" };
      }
      const monthlyQuota = resolveMonthlySpendQuota(
        user?.profileSubscription || {},
        canonicalEntitlement,
        Number(coinPrice) || 0,
      );
      if (monthlyQuota.applies && monthlyQuota.exceeded) {
        return { proven: false, source: "", reason: "MONTHLY_PASS_LIMIT_EXCEEDED" };
      }
      return { proven: true, source: "pass", reason: "" };
    }

    return { proven: false, source: "", reason: rid ? "NO_RECORD" : "NO_REQUEST_ID" };
  } catch (error) {
    // 🔴 DB 블립을 "미결제"로 세탁하지 않는다. 결제한 사용자를 잠그는 가장 흔한 경로다.
    if (isTransientMongoError(error) || isAuthDbInfraError(error)) {
      return { proven: null, source: "", reason: "DB_DEGRADED" };
    }
    throw error;
  }
}

/**
 * 증빙 판정 결과를 관측용으로 남긴다. 나크샤트라 3종은 이 로그만 쓰고 차단하지 않으며,
 * 연이·초융합 두 상담은 같은 판정으로 실제 차단까지 한다 — 로그는 양쪽 공통이다.
 * 개인정보를 남기지 않는다(userId·결제 식별자 제외, featureKey/source/proven 만).
 */
export function logPerUsePaymentProof(featureKey, proof) {
  try {
    console.info("[nakshatra-paid-access]", JSON.stringify({
      featureKey: clean(featureKey, 120),
      proven: proof?.proven ?? null,
      source: proof?.source || "",
      reason: proof?.reason || "",
    }));
  } catch {
    // 로깅 실패가 본문 전달을 막지 않는다.
  }
}

export const __nakshatraPaidAccessTestUtils = { clean, isObjectId };

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
import { normalizeHoneyPassEntitlement, canUseByPass, resolveFamilyPremiumQuota } from "./profile-limits.js";
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

// 월정석은 원장에도 남는다. PointHistory 가 늦게 써지는 경로를 대비해 함께 본다.
async function findMonthlyLedger(userId, featureKey, requestId) {
  if (!requestId) return null;
  const clauses = [{ requestId }, { idempotencyKey: requestId }];
  if (isObjectId(requestId)) clauses.push({ _id: requestId });
  return MonthlyCreditLedger.findOne({
    userId,
    type: "MONTHLY_CREDIT_SPEND",
    serviceKey: featureKey,
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
    if (canUseByPass(normalizeHoneyPassEntitlement(user), Number(coinPrice) || 0)) {
      // 🔴 family 는 canUseByPass 가 가격을 보지 않고 무조건 통과시킨다(profile-limits.js 의
      // "passTier === FAMILY 면 price >= 0 이기만 하면 true"). 그래서 기간당 10회 공정이용 상한
      // (FAMILY_PREMIUM_INCLUDED_USES)이 coin-gate 의 소비 단계에만 존재했고, 게이트를 거치지 않고
      // 이 라우트를 직접 호출하면 상한을 넘겨도 통과했다.
      //
      // 정상 사용자는 여기 오지 않는다: family 이용권 사용은 recordPassAccessIfNeeded 가 PointHistory
      // 증빙을 남기므로 위 2)의 findDeduction 에서 이미 proven 으로 끝난다. 즉 이 검사가 막는 것은
      // "증빙이 없는데 family 라서 통과하던" 우회 호출뿐이다.
      //
      // 판정을 못 내리면(만료일 없음 → cycleKey 없음, family 아님) applies=false 로 열어 둔다 —
      // resolveFamilyPremiumQuota 의 문서화된 정책이며, 셀 수 없는 상태에서 막지 않는다.
      const familyQuota = resolveFamilyPremiumQuota(
        user?.profileSubscription || {},
        resolveCanonicalEntitlement(user || {}),
        Number(coinPrice) || 0,
      );
      if (familyQuota.applies && familyQuota.exhausted) {
        return { proven: false, source: "", reason: "FAMILY_PREMIUM_QUOTA_EXHAUSTED" };
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

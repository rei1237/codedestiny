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
import { User, Payment, PointHistory } from "./models.js";
import { findMoonstoneSpendEvidence } from "./moonstone-spend-proof.js";
import { normalizeHoneyPassEntitlement, canUseByPass, resolvePremiumQuota } from "./profile-limits.js";
// 🔴 family 공정이용 상한의 cycleKey 는 entitlement 의 expiresAt 에서 나온다. coin-gate 가 쓰는 것과
// **같은 생산자**를 써야 두 곳의 cycleKey 가 일치하고, 저장된 카운터를 실제로 읽을 수 있다
// (다른 생산자를 쓰면 storedKey 불일치로 used 가 항상 0 이 되어 검사가 조용히 무력해진다).
import { resolveCanonicalEntitlement } from "./entitlement-policy.js";
// 🔴 이용권 통과는 **차감을 동반해야** 한도가 존재한다. 판정·소비 정본은 worker/payments/passes.js
// 이며 이 어댑터가 그 정본을 부른다(worker/lib/pass-consumption.js 머리주석).
import { consumePassForFeature, passDenialCode } from "./pass-consumption.js";

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

// 월정석 차감의 회계 정본은 MonthlyCreditLedger 하나다(worker/payments/moonstone.js — V2 는
// PointHistory 를 일부러 쓰지 않는다). 그래서 이 조회가 월정석의 **유일한** 증빙 경로다.
//
// 🔴 쿼리 본문은 여기 두지 않는다. writer 가 바뀔 때마다 레포 곳곳의 사본이 하나씩 조용히 죽고,
//    죽은 자리에서 월정석이 차감된 사용자가 402 를 받았다(초융합 ₩30,000 · 네오 팩폭 실사고).
//    정본은 worker/lib/moonstone-spend-proof.js 하나이며, 계약은
//    __tests__/worker/per-use-proof-roundtrip.test.js 가 writer↔reader 왕복으로 고정한다.
async function findMonthlyLedger(env, userId, featureKey, requestId) {
  if (!requestId) return null;
  return findMoonstoneSpendEvidence(env, {
    userId,
    featureKeys: [featureKey],
    tokens: [requestId],
  });
}

/**
 * 회당 결제 증빙 검증.
 *
 * @param {object} env
 * @param {{ userId:string, featureKey:string, coinPrice:number, requestId:string }} input
 * @returns {Promise<{proven:(boolean|null), source:string, reason:string, transactionId?:string}>}
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
    // 🔴 transactionId 는 **가산 필드**다. 생성이 실패했을 때 환불(failServiceExecution)의
    //    sourceTransactionId 를 채우려면 어떤 기록으로 증빙됐는지 알아야 하는데, 예전에는
    //    이미 조회한 문서를 버리고 boolean 만 돌려줬다. 기존 호출자는 proven/source/reason
    //    셋만 읽으므로 이 추가는 무해하다.
    const payment = await withMongoRetry(env, () => findPaidPayment(uid, key, rid));
    if (payment) {
      return { proven: true, source: "payment", reason: "", transactionId: clean(payment?._id, 120) };
    }

    // 2) 코인 / 3) 월정석 — 같은 컬렉션에서 accessType 으로 갈린다.
    const deduction = await withMongoRetry(env, () => findDeduction(uid, key, rid));
    if (deduction) {
      const accessType = String(deduction?.metadata?.accessType || "").toLowerCase();
      return {
        proven: true,
        source: accessType === "membership_credit" ? "monthly" : "coin",
        reason: "",
        transactionId: clean(deduction?._id, 120),
      };
    }
    if (await withMongoRetry(env, () => findMonthlyLedger(env, uid, key, rid))) {
      return { proven: true, source: "monthly", reason: "" };
    }

    // 4) 이용권 커버 — 단건결제·코인·월정석 증빙이 없을 때의 **정상** 경로다.
    //    🔴 여기는 조회 전용이 아니다(2026-09-06). 이용권으로 통과시키면 그 자리에서
    //    monthlySpendCoin 을 차감한다 — 아래 분기 주석 참고.
    // 5) admin
    const user = await withMongoRetry(env, () => User.findById(uid)
      // recentConsumeRequestIds 는 이용권 차감의 멱등 마커 배열이다 — 빼면 재시도가 예산을
      // 두 번 깎는다(worker/payments/passes.js consumePassCoverage).
      .select("role profileSubscription subscription membership membershipPass pass entitlement licensePass passTier expiresAt isActive recentConsumeRequestIds")
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
    // 🔴 "정상 사용자는 coin-gate 가 남긴 PointHistory 증빙 덕에 여기 오지 않는다"는 예전 전제는
    // 사실이 아니었다 — worker/routes/master-love-codex.js 처럼 coin-gate 를 아예 거치지 않는
    // 자체 게이트가 있어서, 증빙 없이 이 분기로 들어오는 것이 오히려 흔한 경로였다.
    // 그래서 이 분기는 검사만 하고 넘기면 안 되고 **차감까지 해야** 한도가 성립한다.
    //
    // 판정을 못 내리면(만료일 없음 → cycleKey 없음, 해당 등급 아님) applies=false 로 열어 둔다 —
    // resolvePremiumQuota 의 문서화된 정책이며, 셀 수 없는 상태에서 막지 않는다
    // (evaluatePassCoverage 의 budgetApplies 도 같은 정책이다).
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
      // 🔴 예전에는 여기서 resolveMonthlySpendQuota 로 초과 여부를 **읽기만** 했다. 이 경로는
      //    monthlySpendCoin 을 증가시키는 곳이 아니었으므로 그 값이 영원히 0 에 머물렀고,
      //    "참이 될 수 없는 검사" 였다 — 이용권만 있으면 한도와 무관하게 계속 통과했다.
      //    이제 정본(evaluatePassCoverage + consumePassCoverage)으로 판정하고 **실제로 차감**한다.
      //    차감이 쌓이면 소진 종료도 정본이 자동으로 수행한다(새 소진 플래그를 만들지 않는다).
      const cost = Math.max(0, Math.floor(Number(coinPrice) || 0));
      // 가격이 없는(무료) 건은 차감할 것이 없다 — 예전 동작을 그대로 둔다.
      // 여기서 cost>0 조건을 빼면 evaluatePassCoverage 가 invalid_price 로 무료 건을 막는다.
      if (cost > 0) {
        const consumed = await consumePassForFeature({
          user,
          entitlement: canonicalEntitlement,
          userId: uid,
          featureKey: key,
          requestId: rid,
          coinCost: cost,
        });
        // 🔴 코드가 빈 문자열이면 막지 않는다(passDenialCode 주석) — 예전 통과 판정을 존중한다.
        const denial = consumed.covered ? "" : passDenialCode(consumed.reason);
        if (denial) return { proven: false, source: "", reason: denial };
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

/**
 * 결제 컨텍스트의 **유일한 진입점이자 합성 루트**.
 *
 * ## if 체인이 아니라 표다
 *
 * 구 라우터(worker/index.js:1029)는 수동 if 체인이라 어떤 경로가 무엇을 하는지 알려면 수천 줄을
 * 따라가야 했다. 여기서는 라우트가 객체 리터럴 하나이고, **표를 읽으면 전체 표면이 보인다.**
 *
 * ## 형제 파일은 서로를 부르지 않는다
 *
 * catalog·orders·pg·entitlements·moonstone 은 서로를 import 하지 않는다. 확정처럼 여럿을 엮는
 * 흐름은 **여기서만** 조립된다. 그래서 "PG 검증을 건너뛰는 지름길"이나 "권한만 따로 주는 경로"가
 * 생길 자리가 구조적으로 없다 — 구 코드에서 확정 경로가 셋으로 갈라졌던 원인이 그 자리였다.
 *
 * ## 요청 하나 = 슬롯 하나 = 로그 한 줄
 *
 * 모든 Mongo 작업이 withPaymentDb 콜백 하나 안에서 돌고, try/finally 가 성공·실패 무관하게
 * 정확히 한 줄을 남긴다. mongoOps 가 그 줄에 실리므로 왕복 예산 회귀는 코드 리뷰가 아니라
 * 로그가 잡는다.
 */
import { getRequestMeta, json } from "../lib/http.js";
import { peekAccessTokenUserId } from "../lib/auth.js";
import { CREDENTIAL_CACHE_PREFIXES, purgeCredentialCache } from "../lib/credential-scoped-cache.js";
// 🔴 leaf 를 import 한다(../lib/access-state.js 가 아니라). 그쪽은 models.js·content-unlocks.js 를
//    딸고 오므로 models.js 를 부분 모킹한 스위트가 통째로 죽는다(2026-08-31 실측 11개 스위트 109건).
//    옵셔널 경유(globalThis.__accessStateCache?.invalidateForUser?.())는 아이솔레이트에 모듈이 아직
//    안 실렸으면 조용히 no-op 이라 fail-open 이고, verify:access-state-cache-order 가 거부한다.
import { invalidateAccessStateCacheForUser } from "../lib/access-state-cache.js";
import { User } from "../lib/models.js";
import { getPortOnePublicConfig, resolveChargeAmountKRW } from "../lib/portone.js";
import { decryptPhoneNumber } from "../lib/pii-crypto.js";
import { classify, contractFor, paymentError, responseHeadersFor } from "./errors.js";
import { createPaymentContext, toObjectId, withPaymentDb } from "./db.js";
import { logPayment } from "./log.js";
import { listProducts, resolveProduct } from "./catalog.js";
import { verifyPgPayment } from "./pg.js";
import { dropEntitlementByIdentity, grantEntitlement, markUserFeatureUnlocked, revokeEntitlementForOrder } from "./entitlements.js";
import { settleOrphanSpends, spendMoonstone } from "./moonstone.js";
import { acceptWebhook, claimReplayableEvents, describeEventFailure, markEventFailed, markEventProcessed } from "./webhook.js";
import { runPaymentReconcile } from "./reconcile.js";
import { sendPendingReceiptEmails } from "./receipt-email.js";
import { resolveLegacyProduct } from "./legacy-pricing.js";
import {
  activatePassSubscription,
  buildPassConsumeMarker,
  buildPassCustomerUid,
  consumePassCoverage,
  createPayablePassOrder,
  evaluatePassCoverage,
  presentPassSubscription,
  recordPassUsageEvidence,
  resolvePassPlan,
  revokePassGrantForOrder,
} from "./passes.js";
import { computePassExpiry, evaluatePassTierTransition, isPassBudgetExhausted } from "../lib/profile-limits.js";
import {
  isPassLikeProductType,
  resolveCanonicalEntitlement,
  resolveServerProductType,
  validatePurchasePolicy,
} from "../lib/entitlement-policy.js";
import { writeSecurityLog } from "../lib/security/index.js";
import {
  buildPremiumAccessCookie,
  createPremiumAccessToken,
  resolvePremiumAccessReportType,
} from "../lib/premium-access-token.js";
import {
  legacyBillingCheckoutEnvelope,
  legacyMoonstoneEnvelope,
  legacyOrderDetailEnvelope,
  legacyConfirmEnvelope,
  legacyPassCheckEnvelope,
  legacyPrepareEnvelope,
  toLegacyPrepareOrder,
} from "./compat.js";
import {
  assertOrderOwner,
  createOrder,
  createPayableOrder,
  findOrder,
  markEntitlementGranted,
  markOrderCancelled,
  markOrderFailed,
  markOrderPaid,
  recordPgCancellationMarkers,
  settleRefund,
  toOrderStatus,
} from "./orders.js";

function requireUser(userId) {
  if (!userId) throw paymentError("UNAUTHORIZED", "로그인이 필요합니다.");
  return userId;
}

/**
 * 잔액·권한을 바꾸는 V2 쓰기 뒤의 **유저별 캐시 무효화 초크포인트**. 두 캐시를 함께 지운다.
 *
 *   ① 표시용 잔액 스냅샷(/api/billing/balance·unlock-status 공용, billing.js).
 *      정본 패턴은 worker/lib/monthly-credit-store.js 와 동일 — globalThis 공유 객체라 임포트가 없다.
 *      🔴 TTL 이 45초로 늘어난 뒤에는(2026-08-12) 잔액·해금·구독을 바꾸는 **모든** V2 쓰기가 이걸
 *      불러야 한다 — 빠뜨리면 결제 직후 새로고침에서 옛 잔량·미해금 상태가 최대 45초 보인다.
 *   ② /api/me/access-state 의 60초 이용권 스냅샷(2026-08-31 추가). 같은 이유다 — 결제로 커버가
 *      생겼는데 옛 스냅샷이 나가면 방금 산 기능이 잠긴 채로 보인다.
 *
 * 🔴 ②는 **best-effort 다.** 그 캐시는 globalThis 맵이라 아이솔레이트 로컬이고, 확정 요청이 탄
 * 아이솔레이트만 지워진다. 사용자에게 보이는 창을 실제로 닫는 것은 클라이언트가 결제 성공 직후
 * 보내는 x-code-destiny-cache-refresh: 1 강제 GET 이다(refreshUserAccessAfterPayment). 여기 한 줄로
 * "해결됐다"고 보지 말 것.
 *
 * 🔴 새 무효화 초크포인트를 따로 만들지 말 것 — 이 함수가 클라이언트 확정·PG 웹훅·크론 정산을
 * 모두 덮는 유일한 지점이고, 갈라 놓으면 그중 하나가 조용히 죽는다(코딩 원칙 6).
 */
function invalidateBalanceSnapshot(userId) {
  const normalizedUserId = String(userId || "");
  try {
    globalThis.__billingBalanceCache?.invalidateForUser?.(normalizedUserId);
  } catch { /* 표시 캐시 무효화 실패는 결제를 막지 않는다 */ }
  try {
    invalidateAccessStateCacheForUser(normalizedUserId);
  } catch { /* 스냅샷 무효화 실패도 결제를 막지 않는다 */ }
}

/**
 * 🔴 컷오버 패리티(2026-08-12): 구 웹훅은 Paid 외에 Failed·Cancelled·PartialCancelled 를 처리했다.
 * 그대로 컷오버하면 PG 발 취소·실패 상태 전이가 사라지므로 시맨틱을 여기서 승계한다:
 *   Failed          = 결제 완료 주문 보호(PENDING 한정 CAS) 하에 실패 마킹
 *   Cancelled       = PENDING 이면 취소(T4), PAID 면 환불 정산(T5)+권한 회수+검토 마커
 *   PartialCancelled= 자동 회수 없이 관리자 검토 마커만(구 시맨틱 그대로)
 * VirtualAccountIssued 는 **의도적 미지원**: 클라이언트 전체에 가상계좌·계좌이체 노출이 0건인
 * 카드 전용 서비스임을 확인했다(2026-08-12). 가상계좌를 판매하게 되면 이 결정을 다시 볼 것.
 * 미지원 타입은 받았다는 사실만 남기고 200 으로 끝낸다(재전송 요구 없음).
 */
async function applyNonPaidPgEvent(db, { eventType, orderId }) {
  const type = String(eventType || "").trim().toLowerCase();

  if (type === "transaction.failed") {
    const marked = await markOrderFailed(db, {
      orderId,
      failureCode: "pg_webhook_failed",
      failureMessage: "PortOne Transaction.Failed webhook received.",
      failureStage: "webhook",
    });
    return { event: "failed", marked };
  }

  const partial = type === "transaction.partialcancelled";
  const full = type === "transaction.cancelled";
  if (!partial && !full) return { ignored: true, type };

  const order = await findOrder(db, { orderId });
  if (!order) return { ignored: true, reason: "ORDER_NOT_FOUND" };

  if (partial) {
    // 부분취소는 금액 사실이 주문 문서와 어긋난 상태다 — 자동으로 상태·권한을 건드리지 않고
    // 사람이 판단한다(미결제 건의 부분취소는 PG 상 존재하지 않으므로 상태 전이 자체가 없다).
    await recordPgCancellationMarkers(db, { orderId, partial: true, reviewRequired: true });
    return { event: "partial-cancelled", reviewRequired: true };
  }

  const status = toOrderStatus(order);
  if (status === "PENDING") {
    const cancelled = await markOrderCancelled(db, { orderId, reason: "PG_CANCELLED" });
    return { event: "cancelled", cancelled };
  }
  if (status === "PAID") {
    // PG 콘솔 전액 취소 = 돈이 이미 돌아갔다. 주문을 환불로 정산하고 권한을 회수한다.
    // 회수가 매칭되지 않으면(이미 회수됨·비활성) 사람이 확인하도록 검토 마커를 남긴다.
    const refunded = await settleRefund(db, { orderId });
    // 이용권은 ContentEntitlement 가 아니라 User.profileSubscription 이라 회수 경로가 따로 있다 —
    // 없으면 환불된 이용권이 만료일까지 활성으로 남는다(2026-09-03 발견). 이 주문이 최신 활성 주문이
    // 아니면(lastPassOrderId 불일치) 손대지 않고 아래 검토 마커로 사람이 본다.
    const revoked = String(order.paymentType || "") === "membership_pass"
      ? await revokePassGrantForOrder(db, {
        userId: order.userId,
        orderId,
        durationMonths: Number(order?.metadata?.durationMonths || 1),
      })
      : await revokeEntitlementForOrder(db, { orderId });
    await recordPgCancellationMarkers(db, { orderId, partial: false, reviewRequired: !revoked });
    invalidateBalanceSnapshot(order?.userId);
    return { event: "cancelled", refunded, revoked, reviewRequired: !revoked };
  }
  return { ignored: true, status };
}

/**
 * 레거시 prepare 가 User 에서 실제로 읽는 필드 전부.
 *
 * 투영 없이 읽으면 destinyProfiles[]·unlockedFeatures[]·membershipCreditLots[]·
 * recentConsumeRequestIds[] 가 결제 임계경로로 통째로 딸려온다. 이 왕복은 클릭과 PG 창 사이의
 * 유일한 서버 왕복이라 그만큼이 그대로 체감 지연이다.
 *
 * 🔴 필드를 빼면 예외가 아니라 **조용한 폴백**이 된다. 이름은 "Code Destiny 고객"으로,
 * profileId 는 빈 문자열로 떨어질 뿐 아무도 실패했다고 말해 주지 않는다. 앞의 7개는
 * buildLegacyPrepareCustomer 가, destinyProfilesCurrentId 는 아래 profileId 폴백(:750)이 쓴다 —
 * 같은 조회를 두 곳이 나눠 쓰므로 한쪽만 보고 목록을 줄이면 다른 쪽이 소리 없이 깨진다.
 *
 * 🔴 이 투영은 레거시 prepare 의 그 한 조회에만 건다. 다른 findOne(User) 들은
 * profileSubscription 을 읽으므로(handlePassPrepare·grantPassOrderEntitlement·
 * resolveCanonicalEntitlement 경로) 같은 투영을 쓰면 역시 조용히 깨진다.
 */
const LEGACY_PREPARE_USER_PROJECTION = {
  fullName: 1,
  name: 1,
  displayName: 1,
  username: 1,
  email: 1,
  phoneNumber: 1,
  phone: 1,
  destinyProfilesCurrentId: 1,
};

/**
 * 컷오버 어댑터 전용(POST /prepare). 구 prepare 는 주문 응답에 customer(이름·이메일·전화 평문)를
 * 실어 보냈고, 셸은 그 인라인 값 덕분에 결제 직전의 /api/auth/me·/api/me/payment-phone 왕복을
 * 건너뛴다(RC-8). 순수 V2 라우트(POST /orders)는 Mongo 읽기 0회가 계약이라 이걸 하지 않는다 —
 * 레거시 마운트에서만 User 1읽기+복호화 비용을 낸다. 정제 규칙은 구 buildSinglePaymentCustomer
 * (payments.js:1144)와 동일: 이름 40자, 이메일 불량 시 합성 주소, 전화는 01x 로컬 숫자만.
 */
async function buildLegacyPrepareCustomer(env, user, userId) {
  const fullName = [user?.fullName, user?.name, user?.displayName, user?.username, "Code Destiny 고객"]
    .map((value) => String(value || "").trim())
    .find(Boolean)
    .slice(0, 40);
  const emailRaw = String(user?.email || "").trim().toLowerCase();
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)
    ? emailRaw.slice(0, 120)
    : `buyer-${String(userId || "").replace(/[^a-zA-Z0-9]/g, "").slice(-10) || "guest"}@code-destiny.com`;
  let phoneNumber = "";
  try {
    const digits = String((await decryptPhoneNumber(user?.phoneNumber || user?.phone, env)) || "").replace(/\D/g, "");
    const localDigits = digits.startsWith("82") && /^821\d{8,9}$/.test(digits) ? `0${digits.slice(2)}` : digits;
    if (/^01\d{8,9}$/.test(localDigits)) phoneNumber = localDigits;
  } catch {
    phoneNumber = ""; // 복호화 실패는 결제를 막지 않는다 — 셸이 자체 번호 확보 경로로 폴백한다.
  }
  return { fullName, email, phoneNumber };
}

/* ── 이용권(구독) 구매 — 구 subscription/prepare·confirm 계약 승계 ─────────────
   검증 순서·오류 코드는 구 핸들러(payments.js:3773-4431)와 같다. 자동갱신·구매시 월정석 지급은
   구 핸들러에도 없었음이 전수 조사로 확정됐다(passes.js 머리주석). */

/** 구 billing.js handleCheckout/handleConfirm 의 isSubscription 판별과 같은 정본을 쓴다. */
function isPassLikeBody(body = {}) {
  return isPassLikeProductType(resolveServerProductType({
    body,
    paymentType: body?.paymentType,
    productId: body?.productId || body?.planId,
  }))
    || Boolean(body?.subscriptionTier)
    || String(body?.paymentType || "").trim().toLowerCase() === "subscription";
}

const PASS_POLICY_MESSAGES = Object.freeze({
  CANNOT_BUY_PASS_WITH_PASS: "이용권 상품은 보유 이용권으로 구매할 수 없습니다. 이용권은 원화 단건 결제로만 구매할 수 있습니다.",
  FAMILY_CANNOT_PURCHASE_HIGHER_TIER_PRODUCTS: "패밀리 이용권은 기능 이용 권한이며, 더 높은 가격의 이용권 구매 수단으로 사용할 수 없습니다.",
});

/**
 * 이 환경에서 실제로 청구할 금액을 상품에 입힌다. **프로덕션에서는 언제나 인자를 그대로 돌려준다**
 * (resolveChargeAmountKRW 가 정가를 그대로 반환하므로 새 객체조차 만들지 않는다).
 *
 * 🔴 주문 문서에 직접 쓰지 않고 **상품 객체 단계에서** 덮어쓰는 이유: orders.js hasPriceDrift ·
 *    passes.js hasPassDrift 가 "주문 금액 ≠ 상품 금액"을 재가격 신호로 읽는다. 주문에만 넣으면
 *    prepare 를 다시 부를 때마다 정가로 되돌려진다.
 *
 * 정가(paid-feature-registry.js · PASS_MONTHLY_WON)와 상품의 나머지 필드(featureKey · priceCoins ·
 * pricing)는 건드리지 않는다 — 지급 판정과 화면 표시가는 정가 기준으로 남아야 한다.
 */
function withChargeAmount(env, product) {
  const chargeKRW = resolveChargeAmountKRW(env, product.priceKRW);
  return chargeKRW === Number(product.priceKRW) ? product : { ...product, priceKRW: chargeKRW };
}

function resolvePassRequest(env, body = {}) {
  const durationMonths = Number(body?.durationMonths || 1);
  const durationDays = Number(body?.durationDays ?? 30);
  if (durationMonths !== 1 || durationDays !== 30) {
    throw paymentError("INVALID_SUBSCRIPTION_DURATION", "이용권 기간이 올바르지 않습니다.");
  }
  const plan = resolvePassPlan(body?.tier || body?.passTier || body?.subscriptionTier, durationMonths);
  if (!plan) throw paymentError("INVALID_SUBSCRIPTION_TIER", "이용권 등급이 올바르지 않습니다.");
  const planId = String(body?.planId || "").trim().toLowerCase();
  const productType = String(body?.productType || "membership_pass").trim().toLowerCase();
  if ((planId && planId !== plan.planId) || productType !== plan.productType) {
    throw paymentError("SUBSCRIPTION_PLAN_MISMATCH", "이용권 상품 정보가 일치하지 않습니다.");
  }
  const amount = body?.amount === undefined || body?.amount === null ? null : Number(body.amount);
  const currency = String(body?.currency || "KRW").trim().toUpperCase();
  /* 🔴 청구가도 정답으로 받는다. /points 의 confirm 은 amount 로 **주문에 기록된 금액**을 되보내는데
     (PointsClient.tsx confirmPayload), 스테이징 테스트 모드에서는 그 값이 정가가 아니라 청구가다.
     프로덕션에서는 chargeKRW === plan.wonPrice 라 판정이 종전과 완전히 같다. */
  const chargeKRW = resolveChargeAmountKRW(env, plan.wonPrice);
  if ((amount !== null && amount !== plan.wonPrice && amount !== chargeKRW) || !["KRW", "CURRENCY_KRW"].includes(currency)) {
    throw paymentError("SUBSCRIPTION_PRICE_MISMATCH", "이용권 가격 정보가 일치하지 않습니다.");
  }
  const paymentMethod = String(body?.paymentMethod || "card_general").trim().toLowerCase();
  if (/monthly|credit|moonlight|stone/.test(paymentMethod)) {
    // 문구는 구 핸들러 고정 계약(payments.subscription-purchase.test.js:501)과 동일하게 유지한다.
    throw paymentError("SUBSCRIPTION_MONTHLY_CREDIT_UNSUPPORTED", "이용권은 단건 결제로만 구매할 수 있습니다. 월정석으로는 이용권을 구매할 수 없습니다.");
  }
  return { plan, paymentMethod, chargeKRW };
}

async function enforcePassPurchasePolicy(env, request, { userId, plan, paymentMethod, body, userDoc, route }) {
  const decision = validatePurchasePolicy({
    userId,
    sku: plan.planId,
    productId: plan.planId,
    productType: resolveServerProductType({
      body,
      paymentType: "membership_pass",
      serverProductType: plan.productType,
      productId: plan.planId,
    }),
    price: plan.wonPrice,
    requestedPaymentMethod: paymentMethod,
    currentSubscription: userDoc?.profileSubscription || null,
    familyPlanInfo: userDoc?.profileSubscription || null,
    orderContext: {
      route,
      coveredByPass: body?.coveredByPass === true,
      userEntitlement: body?.userEntitlement,
    },
  });
  if (decision?.allowed) return;
  try {
    await writeSecurityLog({
      env,
      request,
      level: "warn",
      reason: decision?.auditCode || decision?.denialReason || "PURCHASE_POLICY_DENIED",
      userId,
      endpoint: route,
      metadata: { policyVersion: decision?.policyVersion || "", sku: plan.planId, requestedPaymentMethod: paymentMethod },
    });
  } catch { /* 감사 로그 실패가 정책 판정을 막지 않는다 */ }
  const reason = String(decision?.denialReason || "PURCHASE_POLICY_DENIED");
  throw paymentError("PURCHASE_POLICY_DENIED", PASS_POLICY_MESSAGES[reason] || "이용권은 원화 단건 결제로만 구매할 수 있습니다.", { reason });
}

/* ── 이용권 검사 응답 헬퍼 (구 billing.js failure/success 봉투 승계) ───────────── */

const PASS_FAILURE_CODES = Object.freeze({
  price_exceeds_pass_limit: "PRICE_EXCEEDS_PASS_LIMIT",
  monthly_pass_limit_exceeded: "MEMBERSHIP_PASS_NOT_COVERED",
  pass_access_conflict: "MEMBERSHIP_PASS_NOT_COVERED",
  no_active_pass: "MEMBERSHIP_PASS_NOT_COVERED",
  invalid_price: "MEMBERSHIP_PASS_NOT_COVERED",
});

/* 🔴 "다음 달에 다시 열린다"고 쓰지 말 것 — 사이클 키가 이용권 만료일이라 기간 안에서 리셋이
   없고, 2026-09-04 정책은 한도를 다 쓰면 그 자리에서 이용권을 끝낸다(profile-limits.js
   isPassBudgetExhausted). 이 문구가 나오는 남은 경우는 잔여가 최저가보다는 커서 아직 종료되지
   않았지만 이번 건은 못 덮는 상태뿐이다. verify:pass-tier-policy 가 리셋 문구 0건을 단언한다. */
const PASS_FAILURE_MESSAGES = Object.freeze({
  monthly_pass_limit_exceeded: "이번 이용권의 남은 한도로는 이 서비스를 열 수 없습니다. 원화 단건 결제 또는 월정석으로 이용해 주세요.",
  pass_access_conflict: "이용권 상태를 확인하지 못했습니다. 원화 단건 결제 또는 월정석으로 이용해 주세요.",
});

function passFailureCode(reason) {
  return PASS_FAILURE_CODES[String(reason || "")] || "MEMBERSHIP_PASS_NOT_COVERED";
}

function passFailureMessage(reason) {
  return PASS_FAILURE_MESSAGES[String(reason || "")]
    || "현재 이용권 한도 밖 서비스입니다. 원화 단건 결제로 이용해 주세요.";
}

/* 🔴 구 buildPassPaymentDecision(billing.js)의 decisionReason 어휘를 그대로 승계한다. V2 402 봉투에는
   이 키가 없었고, 클라이언트 판정기 pass-verdict.isMonthlyLimitPayload 는 **이 필드만** 본다 —
   그래서 이용권을 가진 사용자의 한도 초과 거절이 "이용권 없음"으로 오분류돼 이용권 상점으로 튕겼다.
   값 어휘를 바꾸면 세 결제창 렌더러가 함께 어긋나므로 문자열을 그대로 유지할 것. */
const PASS_DECISION_REASONS = Object.freeze({
  monthly_pass_limit_exceeded: "MONTHLY_PASS_LIMIT_EXCEEDED",
  price_exceeds_pass_limit: "PRICE_EXCEEDS_PASS_LIMIT",
});

function passDecisionReason(reason) {
  return PASS_DECISION_REASONS[String(reason || "")] || "PAYMENT_REQUIRED";
}

/** 구 failure(402, …) 봉투 그대로 — 셸은 402 를 받으면 코드와 무관하게 결제창으로 인계한다. */
function passGateFailure(code, message, extras = {}) {
  return json({
    ok: false,
    code,
    message,
    status: "payment_required",
    reason: code,
    ...extras,
    accessGrant: null,
    balance: null,
    error: { code, message },
  }, { status: 402 });
}

function presentMembershipPass(entitlement, coverage = {}) {
  const tier = String(coverage.tier || entitlement?.passTier || entitlement?.tier || "") || null;
  const limit = Number(coverage.perItemLimit ?? entitlement?.maxCoveredCoin ?? 0);
  return {
    tier,
    passTier: tier,
    freeLimit: limit,
    passLimit: limit,
    maxCoveredCoin: limit,
    ...(coverage.budgetCoin !== undefined ? {
      monthlyPassLimit: coverage.budgetCoin,
      monthlySpendUsed: coverage.usedCoin,
      monthlySpendRemaining: coverage.remainingCoin,
    } : {}),
  };
}

async function handlePassPrepare({ request, env, ctx, userId, body, withDb }) {
  const { plan, paymentMethod, chargeKRW } = resolvePassRequest(env, body);
  ctx.productId = plan.planId;

  const headerKey = String(request.headers.get("Idempotency-Key") || request.headers.get("X-Idempotency-Key") || "").trim();
  let idempotencyKey = String(body.idempotencyKey || "").trim() || headerKey || String(body.requestId || "").trim();
  if (!idempotencyKey) idempotencyKey = `pass-${crypto.randomUUID()}`;

  const { order, user } = await withDb(env, ctx, async (db) => {
    const userDoc = await db.findOne(User, { _id: toObjectId(userId) });
    await enforcePassPurchasePolicy(env, request, { userId, plan, paymentMethod, body, userDoc, route: "subscription_prepare" });
    const transition = evaluatePassTierTransition(userDoc?.profileSubscription, plan.tier);
    if (transition.code === "DOWNGRADE_BLOCKED") {
      throw paymentError("SUBSCRIPTION_DOWNGRADE_BLOCKED", "이미 더 높은 등급의 이용권이 활성화되어 있습니다.", { activeTier: transition.activeTier });
    }
    /* 🔴 재사용할 수 없는 주문(다른 플랜·이미 결제됨·취소됨)은 409 가 아니라 **새 세대 주문**으로 답한다
       (passes.js createPayablePassOrder). /points 는 409 를 새 키로 재시도하지 않고 토스트만 띄워,
       그 키가 바뀔 때까지 이용권을 살 수 없는 막다른 길이었다. 카드 상품과 같은 계약이다. */
    /* 🔴 enforcePassPurchasePolicy 에는 위에서 **정가 plan** 을 넘겼다 — 패밀리 등급의 상위상품
       구매 차단처럼 구매 정책은 상품 가치 기준이어야 하고, 청구가로 판정하면 스테이징에서만
       정책이 달라진다. 주문에 실리는 금액만 청구가로 바꾼다. */
    const chargePlan = chargeKRW === Number(plan.wonPrice) ? plan : { ...plan, wonPrice: chargeKRW };
    const created = await createPayablePassOrder(db, { userId, plan: chargePlan, idempotencyKey, paymentMethod });
    return { order: created, user: userDoc };
  });
  ctx.orderId = String(order.merchantUid || "");

  const idempotent = Date.now() - new Date(order.createdAt || 0).getTime() > 10_000;
  const customer = await buildLegacyPrepareCustomer(env, user, userId);
  return json({
    message: idempotent
      ? "Membership pass payment preparation already completed."
      : "Membership pass payment preparation completed.",
    idempotent,
    order: {
      merchantUid: String(order.merchantUid || ""),
      customerUid: buildPassCustomerUid(userId),
      customer,
      tier: plan.tier,
      planId: plan.planId,
      durationMonths: plan.durationMonths,
      paymentAmount: Number(order.paymentAmount || chargeKRW),
      productName: plan.name,
      productType: plan.productType,
      profileLimit: plan.profileLimit,
      durationDays: plan.durationDays,
      recurring: false,
    },
  }, { status: idempotent ? 200 : 201 });
}

async function handlePassConfirm({ request, env, ctx, userId, body, withDb }) {
  const impUid = String(body.impUid || body.paymentId || "").trim();
  if (!impUid) throw paymentError("INVALID_REQUEST", "impUid 가 필요합니다.");
  // 구 계약 승계: merchantUid 부재 시 impUid 로 조회한다(V2 는 paymentId=merchantUid 라 동치).
  const orderId = String(body.merchantUid || body.merchant_uid || impUid).trim();
  ctx.orderId = orderId;
  const customerUid = String(body.customerUid || "").trim() || buildPassCustomerUid(userId);
  const tierFromBody = String(body.tier || body.passTier || body.subscriptionTier || "").trim();
  let plan = null;
  let paymentMethod = "";
  /* 🔴 등급이 실려 오면 예전처럼 **주문을 읽기 전에** 전부 검증한다 — 월정석 결제수단 차단·기간·가격
     오류는 주문 조회 한 왕복도 쓰지 않고 400 이어야 한다(구 계약, payments-v2.subscription.test.js
     의 `db.ctx.ops === 0`). 등급이 없을 때만 주문에서 복원할 수 있어 그 경우에만 아래로 미룬다. */
  if (tierFromBody) {
    ({ plan, paymentMethod } = resolvePassRequest(env, body));
    ctx.productId = plan.planId;
  }

  /* 이용권 고유의 사전 검증(등급 일치·구매 정책·하위등급 차단)을 판정 슬롯 안에서 함께 끝낸다.
     주문은 여기서 한 번만 읽고 그 문서를 evaluateConfirmable 에 그대로 넘긴다. */
  const begun = await withDb(env, ctx, async (db) => {
    const order = await findOrder(db, { orderId });
    if (!order) throw paymentError("ORDER_NOT_FOUND", "이용권 주문을 찾을 수 없습니다.", { orderId });
    assertOrderOwner(order, userId);
    /* 🔴 등급은 body 가 없어도 **주문에서 복원**한다. 모바일은 PG 가 상위 프레임을 리다이렉트하는데
       카카오페이처럼 다른 앱을 거쳐 돌아오면 안드로이드가 새 탭을 여는 일이 흔하고, 그러면 /points 가
       남긴 대기 정보(localStorage)를 못 읽는 문서가 복귀를 처리하게 된다. 예전에는 그 상태에서
       resolvePassRequest 가 INVALID_SUBSCRIPTION_TIER 로 죽어 "결제는 승인됐는데 클라이언트가 확정을
       시도조차 못 하는" 창이 열렸다(재조정 크론이 최대 20분 뒤에야 정산). 주문은 소유자 검사를 이미
       통과했고 등급도 서버가 기록한 사실이라, 클라 값이 없을 때 그것을 쓰는 것이 더 정확하다.
       body 에 등급이 실려 오면 종전대로 대조한다 — 위조 방어(SUBSCRIPTION_PLAN_MISMATCH)는 그대로다. */
    if (!plan) {
      const resolved = resolvePassRequest(env, {
        ...body,
        tier: String(order.subscriptionTier || ""),
        paymentMethod: String(body.paymentMethod || "").trim()
          || (String(order.paymentMethod || "") !== "unknown" ? String(order.paymentMethod || "") : "")
          || undefined,
      });
      plan = resolved.plan;
      paymentMethod = resolved.paymentMethod;
      ctx.productId = plan.planId;
    }
    if (String(order.subscriptionTier || "") !== plan.tier) {
      throw paymentError("SUBSCRIPTION_PLAN_MISMATCH", "이용권 주문의 등급이 일치하지 않습니다.");
    }
    const userDoc = await db.findOne(User, { _id: toObjectId(userId) });
    await enforcePassPurchasePolicy(env, request, { userId, plan, paymentMethod, body, userDoc, route: "subscription_confirm" });
    if (toOrderStatus(order) === "PENDING") {
      // 활성화 전 하위등급 차단(구 계약). 이미 PAID 인 재생은 통과한다 — 구 confirm 도 재생을
      // 멱등 응답으로 흘려보냈고, 여기서 막으면 정상 결제의 재확인이 409 로 오탐된다.
      const transition = evaluatePassTierTransition(userDoc?.profileSubscription, plan.tier);
      if (transition.code === "DOWNGRADE_BLOCKED") {
        throw paymentError("SUBSCRIPTION_DOWNGRADE_BLOCKED", "이미 더 높은 등급의 이용권이 활성화되어 있습니다.", { activeTier: transition.activeTier });
      }
    }
    return evaluateConfirmable(ctx, order, { orderId, actorUserId: userId });
  });

  // 확정·활성화는 제네릭 confirmOrder 하나를 탄다 — grantOrderEntitlement 의 이용권 분기가
  // 클라이언트·webhook·크론 세 주체 모두에 같은 활성화를 보장한다(주체별 분기 없음 원칙).
  let user = null;
  let activationPending = false;
  const result = await confirmOrder(env, ctx, { orderId, actorUserId: userId }, {
    withDb,
    begun,
    // 정산과 같은 슬롯에서 마무리한다 — 지급 재시도와 최종 사용자 조회에 슬롯을 더 쓰지 않는다.
    afterSettle: async (db, settled) => {
      if (!settled.granted) {
        // 결제는 됐는데 활성화가 미완(그랜트 실패 또는 webhook 선확정 후 활성화 대기).
        // 활성화는 lastPassOrderId 가드로 멱등이므로 여기서 한 번 마무리를 시도한다.
        activationPending = !(await grantOrderEntitlement(db, settled.order));
      }
      user = await db.findOne(User, { _id: toObjectId(userId) });
    },
  });
  const idempotent = result.replayed;
  ctx.paymentStatus = "PAID";

  const subscription = presentPassSubscription(user?.profileSubscription, plan, { customerUid, paymentMethod });
  // 응답 에코는 **실제 청구된 주문 금액**이다(정가가 아니다) — 영수증·내역 표시가 승인액과 어긋나지 않게 한다.
  const payment = { merchantUid: orderId, impUid, paymentAmount: Number(begun?.order?.paymentAmount || plan.wonPrice), paymentType: "membership_pass", status: "paid" };
  // 🔴 이용권 활성화는 GET /api/auth/me 응답의 pass/membership/subscription 필드를 바꾼다. 그 응답은
  // 30초 자격증명 단위 엣지 캐시(worker/lib/credential-scoped-cache.js)를 타므로, 여기서 지우지
  // 않으면 결제 직후 다른 탭·새로고침이 최대 30초간 옛 이용권 상태를 본다.
  await purgeCredentialCache(request, CREDENTIAL_CACHE_PREFIXES);
  if (activationPending) {
    /* 🔴 200 이다. 카드는 승인됐고 주문도 PAID 로 기록됐다 — 남은 것은 활성화 반영뿐이라 장애가 아니라
       마무리가 덜 끝난 성공이다. 여기는 오래 503 을 냈는데, 그건 confirmOrder 머리주석이 "구 코드의
       모순"이라며 제거를 선언한 바로 그 패턴이 이용권 경로에만 남아 있던 것이다. 클라이언트는 재시도해도
       같은 결과를 받고(주문은 이미 PAID) 사용자는 결제된 돈에 대해 실패 화면을 본다.
       마무리 주체는 둘이다: webhook 의 Transaction.Paid 재생과 재조정 크론의 regrantUnfulfilledOrders
       (paid + entitlementGrantedAt 없음 → 같은 grantOrderEntitlement). 자동 환불은 없다(passes.js 계약). */
    return json({
      message: "이용권 결제가 확인됐어요. 활성화를 마무리하는 중이니 다시 결제하지 말아 주세요.",
      idempotent,
      code: "GRANT_PENDING",
      activationPending: true,
      pollUrl: `/api/payments/orders/${encodeURIComponent(orderId)}`,
      payment,
      subscription,
      user: { id: String(userId || ""), points: Number(user?.points || 0) },
    });
  }
  return json({
    message: idempotent ? "Membership pass payment already processed." : "30-day membership pass has been activated.",
    idempotent,
    payment,
    subscription,
    user: { id: String(userId || ""), points: Number(user?.points || 0) },
  });
}

/** 주문을 클라이언트가 읽는 형태로. 내부 필드(rawPortOne·pricingSnapshot 등)는 내보내지 않는다. */
function presentOrder(order) {
  return {
    orderId: String(order.merchantUid || ""),
    status: toOrderStatus(order),
    productId: String(order.productId || ""),
    featureKey: String(order.featureKey || ""),
    amountKRW: Number(order.paymentAmount || 0),
    paidAt: order.paidAt || null,
    entitlementGranted: Boolean(order.entitlementGrantedAt),
    createdAt: order.createdAt || null,
  };
}

/**
 * 확정 1단계 — 이 주문을 확정해도 되는가. Mongo 를 쓰지 않는 순수 판정이라 호출부가 이미 읽어 둔
 * 주문을 그대로 넘길 수 있다(이용권 확정처럼 자기 검증 때문에 어차피 한 번 읽는 경로의 중복 방지).
 * `settled: true` 는 "PG 를 부를 필요가 없다"는 뜻이다.
 */
function evaluateConfirmable(ctx, order, { orderId, actorUserId = "" }) {
  if (!order) throw paymentError("ORDER_NOT_FOUND", "주문을 찾을 수 없습니다.", { orderId });
  if (actorUserId) assertOrderOwner(order, actorUserId);
  ctx.productId = String(order.productId || "");

  const status = toOrderStatus(order);
  if (status === "PAID") {
    // 재생. PG 를 다시 부르지 않는다 — PortOne 지연이 확정 경로의 지배적 비용이다.
    return { order, replayed: true, granted: Boolean(order.entitlementGrantedAt), settled: true };
  }
  // 🔴 PG_PAYMENT_NOT_PAID 로 닫힌 FAILED 는 되살린다(2026-09-03). 결제창을 연 뒤 60초 지나 /points 부팅
  // 재확인이 돌면 PG 가 아직 ready 라 422 → failed 가 되는데, 그 뒤 실제 결제가 나면 웹훅·크론이 이 주문을
  // 다시 만난다. 이 코드는 pg.js verifyPgPayment 만 던지므로(git grep 2026-09-03) V2 주문에 한정되고,
  // markOrderPaid CAS 는 failed 를 제외하지 않아 그대로 PAID 로 넘어가며 failure* 를 비운다. PG 가 여전히
  // 미결제면 markOrderFailed(status:"pending" 정확 일치)가 no-op 이고 422 만 다시 나간다.
  // 그 밖의 FAILED(다른 failureCode)·CANCELLED·REFUNDED 는 종전대로 409 다.
  const revivable = status === "FAILED" && String(order.failureCode || "") === "PG_PAYMENT_NOT_PAID";
  if (status !== "PENDING" && !revivable) {
    throw paymentError("ORDER_NOT_CONFIRMABLE", "이 주문은 확정할 수 없는 상태입니다.", { orderId, status });
  }
  return { order, settled: false };
}

/** 확정 3단계 — PG 사실을 주문에 반영하고 권한을 지급한다. 직렬화 지점은 markOrderPaid 의 CAS 다. */
async function settleVerifiedOrder(db, ctx, { order, pg }) {
  const orderId = String(order.merchantUid || "");
  const paid = await markOrderPaid(db, { orderId, order, pg });
  if (!paid) {
    // CAS 를 졌다 = 다른 주체가 방금 확정했다. 재조회해 그 결과를 그대로 쓴다.
    const current = await findOrder(db, { orderId });
    return { order: current || order, replayed: true, granted: Boolean(current?.entitlementGrantedAt) };
  }
  ctx.pgTransactionId = pg.pgTransactionId;

  const granted = await grantOrderEntitlement(db, paid);
  return { order: paid, replayed: false, granted };
}

/**
 * 확정 — **클라이언트 · webhook 이 모두 이 함수를 탄다.** 주체별 분기는 없다.
 *
 * 순서가 계약이다: PG 검증 → 주문 PAID → 권한. 마지막 단계가 실패해도 **200 으로 성공을 알린다** —
 * 카드는 승인됐고 주문도 기록됐으므로 장애가 아니라 부작용이 덜 끝난 성공이고, 크론이 마무리한다.
 * 구 코드는 이 자리에서 `503 + retryable:false` 를 냈는데, 클라이언트가 행동할 수 없는 모순이었다.
 *
 * 🔴 **PG 검증은 DB 슬롯 밖에서 돈다**(2026-08-13). 예전에는 세 단계가 한 콜백 안에 있어서,
 * PortOne 이 응답하는 8초 내내 결제 레인의 admission 슬롯과 Mongo 소켓을 하나씩 붙들고 있었다.
 * 레인 한도가 12 라 PG 가 느려지는 순간 확정 12건이 레인을 통째로 채우고 **그 뒤의 결제창 요청이
 * 하드 503** 을 받는다(admission 거절은 재시도 대상이 아니다). verifyPgPayment 는 Mongo 를 건드리지
 * 않으므로(pg.js) 슬롯 안에 있을 이유가 애초에 없었다.
 *
 * 대신 확정 하나가 슬롯을 두 번 잡는다(판정 · 정산). 둘 다 짧고, 그 사이 주문 상태가 바뀌어도
 * markOrderPaid 의 CAS 가 직렬화 지점이라 결과는 같다(CAS 를 지면 이긴 쪽 결과를 그대로 쓴다).
 *
 * @param {{ withDb: Function, deps?: object, begun?: object, afterSettle?: Function }} options
 *   begun — 호출부가 자기 슬롯에서 이미 evaluateConfirmable 을 돌렸을 때. 판정 슬롯을 건너뛴다.
 *   afterSettle — 정산과 **같은 슬롯**에서 이어 돌 마무리(웹훅의 이벤트 처리 표시 등). 재생 경로에도 돈다.
 */
async function confirmOrder(env, ctx, { orderId, actorUserId = "" }, options = {}) {
  const { withDb, deps = {}, afterSettle } = options;
  const begun = options.begun
    || await withDb(env, ctx, async (db) => evaluateConfirmable(ctx, await findOrder(db, { orderId }), { orderId, actorUserId }));

  if (begun.settled) {
    if (afterSettle) await withDb(env, ctx, (db) => afterSettle(db, begun));
    return begun;
  }

  let pg;
  try {
    pg = await verifyPgPayment(env, { orderId, expectedAmountKRW: Number(begun.order.paymentAmount || 0) }, deps);
  } catch (error) {
    const contract = classify(error);
    // 사실이 어긋난 것(422)은 주문을 실패로 확정한다. 닿지 못한 것(503)은 상태를 건드리지 않는다 —
    // PG 가 살아나면 그대로 확정될 주문이다.
    if (contract.status === 422) {
      await withDb(env, ctx, (db) => markOrderFailed(db, {
        orderId, failureCode: contract.code, failureMessage: error.message, failureStage: "pg-verify",
      }));
    }
    throw error;
  }

  return withDb(env, ctx, async (db) => {
    const result = await settleVerifiedOrder(db, ctx, { order: begun.order, pg });
    if (afterSettle) await afterSettle(db, result);
    return result;
  });
}

/**
 * 회당 결제(per_use)인가. 회당 결제는 결제할 때마다 다시 사야 하므로 영구 해금(ContentEntitlement ·
 * User.unlockedFeatures)도, 응답의 해금 선언(unlockedFeatures/unlockMap)도 남기면 안 된다 —
 * 남기는 순간 다음 이용이 공짜가 된다. 판정 정본은 worker/lib/paid-feature-registry.js 의
 * PER_USE_PAID_FEATURE_KEY_LIST 이고, catalog.resolveProduct 가 billingType 으로 실어 준다.
 * 카탈로그에 없어 유형을 모르면 회당으로 본다(fail-closed — 모르는 키에 영구 해금을 주지 않는다).
 */
function isPerUseFeatureKey(featureKey) {
  try {
    return String(resolveProduct({ featureKey: String(featureKey || "") }).billingType || "per_use") === "per_use";
  } catch {
    return true;
  }
}

/**
 * 이용권 주문의 지급 = profileSubscription 활성화. confirmOrder 를 타는 세 주체(클라이언트 확정 ·
 * webhook · 크론) 모두 이 분기로 온다 — 이용권 결제의 webhook 이 카탈로그 지급 경로에 빠지면
 * 활성화 없이 entitlementGranted 만 실패로 남는다.
 * 하위등급 전이는 활성화하지 않고 false 를 돌려준다(재생 제외) — prepare 가 하위등급 주문 생성을
 * 막으므로 결제 후 그 사이 상위 이용권이 생긴 극단 케이스뿐이고, 상위 이용권을 하위로 덮어쓰는
 * 쪽이 더 큰 사고다. 주문은 paid+미지급으로 남아 reconcile 로그에 계속 드러난다(사람이 환불 판단).
 */
async function grantPassOrderEntitlement(db, order) {
  const plan = resolvePassPlan(order.subscriptionTier, Number(order?.metadata?.durationMonths || 1));
  const orderId = String(order.merchantUid || "");
  // 🔴 false 반환은 던지지 않으므로 여기서 로그하지 않으면 '돈은 받았는데 지급 안 됨'이 로그 0줄로 남는다.
  if (!plan) {
    console.error("[payments] pass grant skipped", { orderId, code: "PLAN_NOT_FOUND", tier: String(order.subscriptionTier || "") });
    return false;
  }
  const userId = String(order.userId || "");
  const userDoc = await db.findOne(User, { _id: toObjectId(userId) });
  const replay = String(userDoc?.profileSubscription?.lastPassOrderId || "") === orderId;
  const paidAt = order.paidAt || new Date();
  const transition = evaluatePassTierTransition(userDoc?.profileSubscription, plan.tier);
  if (transition.code === "DOWNGRADE_BLOCKED" && !replay) {
    console.error("[payments] pass grant skipped", { orderId, code: "DOWNGRADE_BLOCKED", userId });
    return false;
  }
  await activatePassSubscription(db, {
    userId,
    plan,
    orderId,
    customerUid: buildPassCustomerUid(userId),
    paymentMethod: String(order.paymentMethod || "card_general"),
    paidAt,
    expiresAt: computePassExpiry({ transition, paidAt }),
    // 위에서 읽은 문서를 그대로 넘겨 활성화 함수의 재조회를 없앤다(왕복 6→5).
    existing: userDoc,
  });
  await markEntitlementGranted(db, { orderId });
  return true;
}

/** 지급. 실패해도 던지지 않는다 — 돈은 이미 받았고, 실패를 오류로 올리면 사용자가 다시 결제한다. */
async function grantOrderEntitlement(db, order) {
  try {
    if (String(order?.paymentType || "") === "membership_pass") {
      const granted = await grantPassOrderEntitlement(db, order);
      // 구독 활성화는 잔액 스냅샷의 subscription/membership 블록을 바꾼다 — 45s TTL 이라 필수.
      if (granted) invalidateBalanceSnapshot(order?.userId);
      return granted;
    }
    const snapshot = order.pricingSnapshot || {};
    const product = resolveProduct({
      productId: String(order.productId || ""),
      featureKey: String(order.featureKey || ""),
    });
    /* 🔴 회당 결제(per_use)는 영구 해금을 남기지 않는다 — 남기면 다음 이용이 공짜가 된다.
       월정석(coin-gate/moonstone)·이용권(coin-gate/pass-check) 경로에는 있던 이 경계가 단건 KRW
       확정 경로에만 빠져 있었다. 회당 결제의 증빙은 Payment 문서가 맡으므로(verifyPerUsePayment)
       여기서는 지급을 건너뛰고 주문 상태만 마무리한다. */
    if (String(product.billingType || "per_use") === "per_use") {
      await markEntitlementGranted(db, { orderId: String(order.merchantUid || "") });
      invalidateBalanceSnapshot(order?.userId);
      return true;
    }
    await grantEntitlement(db, {
      userId: String(order.userId || ""),
      product,
      orderId: String(order.merchantUid || ""),
      paymentId: String(order.impUid || ""),
      profileId: String(snapshot.profileId || ""),
      contentKey: String(snapshot.contentKey || ""),
      scope: String(snapshot.scope || ""),
    });
    await markUserFeatureUnlocked(db, { userId: String(order.userId || ""), featureKey: String(order.featureKey || "") });
    await markEntitlementGranted(db, { orderId: String(order.merchantUid || "") });
    invalidateBalanceSnapshot(order?.userId); // 해금 스냅샷(unlockedFeatures/unlockMap) 갱신 반영
    return true;
  } catch (error) {
    // 무음이면 "PAID 인데 이용권 없음"이 로그에 한 줄도 안 남는다. 크론 regrant 가 다시 시도하므로 던지지는 않는다.
    console.error("[payments] entitlement grant failed", {
      orderId: String(order?.merchantUid || ""),
      code: error?.code || "",
      message: error?.message || String(error),
    });
    return false;
  }
}

/* ── 라우트 표 ───────────────────────────────────────────────────────────
   키는 `METHOD /path` 이고, `:id` 자리는 하나의 세그먼트를 받는다.
   auth: "required" 면 토큰에서 userId 를 뽑아 넘긴다(**Mongo 읽기 0회**),
         "none" 이면 신원을 보지 않는다(webhook·카탈로그). */
const ROUTES = {
  "GET /features": {
    auth: "none",
    // Mongo 를 아예 열지 않는다 — 슬롯 0개.
    async handle() {
      return json({ ok: true, products: listProducts() });
    },
  },

  /**
   * 🔴 컷오버 어댑터 — 구 GET /api/payments/config 승계. 결제창 오픈 임계경로의 공개 설정이라
   * Mongo 0회·무인증이 계약이다. 봉투 키는 구 handlePaymentConfig(payments.js:5926, 동결) 그대로 —
   * 소비 키는 storeId·channelKey·currency·payMethod·noticeUrl(셸 checkoutAssets·PointsClient).
   */
  "GET /config": {
    auth: "none",
    async handle({ env }) {
      const config = getPortOnePublicConfig(env);
      if (!config.configured) {
        return json({
          message: "PortOne V2 KG Inicis public payment config is missing.",
          code: "PORTONE_V2_PUBLIC_CONFIG_MISSING",
          missing: {
            storeId: !config.storeId,
            channelKey: !config.channelKey,
            serverVerification: !config.serverVerificationConfigured,
            inicisMid: !config.inicisMidConfigured,
            inicisSignKey: !config.inicisSignKeyConfigured,
            inicisApiKey: !config.inicisApiKeyConfigured,
            inicisApiIv: !config.inicisApiIvConfigured,
          },
        }, { status: 503 });
      }
      return json({
        ok: true,
        configured: config.configured,
        serverVerificationConfigured: Boolean(config.serverVerificationConfigured),
        inicisConfigured: Boolean(config.inicisConfigured),
        inicisMidConfigured: Boolean(config.inicisMidConfigured),
        inicisSignKeyConfigured: Boolean(config.inicisSignKeyConfigured),
        inicisApiKeyConfigured: Boolean(config.inicisApiKeyConfigured),
        inicisApiIvConfigured: Boolean(config.inicisApiIvConfigured),
        provider: config.provider,
        pg: config.pg,
        storeId: config.storeId,
        channelKey: config.channelKey,
        kakaopayChannelKey: config.kakaopayChannelKey,
        kakaopayConfigured: Boolean(config.kakaopayConfigured),
        currency: config.currency,
        payMethod: config.payMethod,
        noticeUrl: config.noticeUrl,
      });
    },
  },

  "GET /orders/:id": {
    auth: "required",
    async handle({ env, ctx, userId, params, withDb, legacyShape }) {
      const order = await withDb(env, ctx, (db) => findOrder(db, { orderId: params.id }));
      assertOrderOwner(order, userId);
      ctx.orderId = params.id;
      /* 구 경로(/api/payments)로 마운트되면 구 형태로 답한다. 컷오버는 서버만 바뀌고 클라이언트는
         그대로인 구간을 반드시 지나는데, 그때 키가 어긋나면 200 이 오고 파싱도 되는데 값만
         undefined 라 **에러 없이 화면이 빈다.** 마운트 지점이 형태를 결정하므로 플래그가 따로 없다. */
      if (legacyShape) return json(legacyOrderDetailEnvelope(order));
      return json({ ok: true, order: presentOrder(order) });
    },
  },

  "POST /orders": {
    auth: "required",
    async handle({ env, ctx, userId, body, withDb }) {
      const product = withChargeAmount(env, resolveProduct({
        productId: body.productId, featureKey: body.featureKey, reason: body.reason,
      }));
      ctx.productId = product.productId;
      const order = await withDb(env, ctx, (db) => createOrder(db, {
        userId,
        product,
        idempotencyKey: body.idempotencyKey,
        profileId: body.profileId,
        contentKey: body.contentKey,
        scope: body.scope,
        returnPath: body.returnPath,
      }));
      ctx.orderId = String(order.merchantUid || "");
      return json({ ok: true, order: presentOrder(order), amountKRW: product.priceKRW });
    },
  },

  /**
   * 🔴 컷오버 어댑터 — 구 주문 발급 URL(/api/payments/prepare · /api/billing/checkout 재작성)을
   * V2 주문 발급으로 잇는다. 클라이언트는 그대로이므로 응답 키가 계약이다(compat.js 초집합).
   *   ① CLIENT_AMOUNT_MISMATCH(400) — 낡은 가격의 요청으로 결제창을 열지 않는다
   *   ② 멱등키 부재 시(구 PointsClient) 합성 키 — 구 partial 인덱스의 "키 없음 = 클릭마다 새 주문"
   *      의미를 보존한다.
   *
   * 🔴 구 prepare 와의 **의도적 차이 하나**: 같은 키의 기존 주문이 현재 의도와 다르거나 이미 결제
   * 가능한 상태가 아니면 IDEMPOTENCY_CONFLICT(409) 대신 **새 세대 주문을 발급한다**. 409 는 세대를
   * 다 쓴 뒤에만 남고(fail-closed), 클라이언트의 새-키 1회 재시도는 그 코드에 그대로 걸려 있다.
   * 근거는 orders.js createPayableOrder 머리주석.
   */
  "POST /prepare": {
    auth: "required",
    async handle({ request, env, ctx, userId, body, withDb, legacyEnvelope }) {
      // 이용권형 바디는 이용권 경로로 위임 — 구 billing.js handleCheckout 의 isSubscription 분기 승계.
      // 구 코드도 이때 billing-checkout 래퍼 없이 subscription prepare 봉투를 그대로 돌려줬다.
      if (isPassLikeBody(body)) return handlePassPrepare({ request, env, ctx, userId, body, withDb });
      // 🔴 가격 해석은 구 정본(billing-feature-registry) 체인을 그대로 탄다(legacy-pricing.js).
      // 첫 배선은 catalog(resolveProduct)를 썼는데, mode/reportMode/categoryKey 변형 가격을 잃어
      // 해당 기능의 단건 결제가 400(금액 불일치)으로 막히는 라이브 결함이었다(2026-08-12 수정).
      const listedProduct = resolveLegacyProduct(body);
      ctx.productId = listedProduct.productId;

      /* 🔴 트립와이어는 **정가** 기준이다. 클라이언트가 낡은 가격으로 결제창을 여는 것을 막는 장치라
         상품 가치와 대야 하고, 청구가와 대면 스테이징에서만 검사가 헐거워진다.
         재개 경로가 주문에 기록된 청구가를 되보내는 경우가 있어 그 값도 정답으로 받는다 —
         프로덕션에서는 두 값이 같아 판정이 종전과 완전히 같다. */
      const chargeKRW = resolveChargeAmountKRW(env, listedProduct.priceKRW);
      const clientAmount = Number(body.paymentAmount ?? body.amount);
      if (Number.isFinite(clientAmount) && clientAmount > 0
        && Math.floor(clientAmount) !== Number(listedProduct.priceKRW)
        && Math.floor(clientAmount) !== chargeKRW) {
        throw paymentError("CLIENT_AMOUNT_MISMATCH", "결제 금액이 현재 가격과 다릅니다. 화면을 새로고침한 뒤 다시 시도해 주세요.", {
          expectedAmount: Number(listedProduct.priceKRW),
          clientAmount,
        });
      }
      // 주문에 실리는 금액만 청구가다. pricing(화면 표시가)은 아래 응답 조립에서 정가 상품을 그대로 쓴다.
      const product = withChargeAmount(env, listedProduct);

      const headerKey = String(request.headers.get("Idempotency-Key") || request.headers.get("X-Idempotency-Key") || "").trim();
      let idempotencyKey = String(body.idempotencyKey || "").trim()
        || headerKey
        || String(body.orderId || body.requestId || "").trim();
      if (!idempotencyKey) idempotencyKey = `legacy-${crypto.randomUUID()}`;

      const { order, user } = await withDb(env, ctx, async (db) => {
        /* 🔴 사용자 조회와 주문 발급을 겹친다. 이 두 왕복은 서로를 기다릴 이유가 없다 — 사용자 문서는
           응답 봉투의 customer 조립(아래 buildLegacyPrepareCustomer)에만 쓰이고, 주문 발급이 그걸
           참조하는 유일한 지점은 profileId 폴백뿐이다. 셸·React 는 profileId 를 실어 보내므로
           일반 경로에서는 폴백이 필요 없고, 두 왕복이 겹쳐 **결제창 앞 대기가 한 왕복만큼 짧아진다**
           (클릭→PG창 사이 서버 왕복은 이 prepare 하나뿐이라 그만큼이 그대로 체감 지연이다).
           바디에 profileId 가 없으면 예전처럼 사용자 문서를 먼저 기다린다 — 그때만 직렬이다. */
        const userPromise = db.findOne(User, { _id: toObjectId(userId) }, { projection: LEGACY_PREPARE_USER_PROJECTION });
        userPromise.catch(() => {}); // 미관측 거부 경고만 막는다 — 실제 처리는 아래 await 가 한다.
        const bodyProfileId = String(body.profileId || body.selectedProfileId || "");
        const profileId = bodyProfileId || String((await userPromise)?.destinyProfilesCurrentId || "");
        /* 🔴 재사용할 수 없는 주문(결제완료·실패·만료취소·레거시 상태)이나 의도가 달라진 주문은
           409 가 아니라 **새 세대 주문**으로 답한다(orders.js createPayableOrder). 예전에는 여기서
           거절했고, 그 결과 복구가 전적으로 클라이언트의 새-키 재시도에 달려 있었다 — 그 재시도가
           빠진 경로가 하나만 생겨도 결제창이 영영 안 열렸다(#467·#471·#497 이 같은 증상을 반복 수정).
           같은 기능·미결제·옛 가격은 종전대로 재가격 승계이고, 같은 의도의 재전송은 여전히 같은
           주문을 돌려준다(멱등 계약 불변). */
        const created = await createPayableOrder(db, {
          userId,
          product,
          idempotencyKey,
          requestId: body.requestId,
          profileId,
          contentKey: body.contentKey,
          scope: body.scope,
          returnPath: body.returnPath,
          paymentMethod: String(body.paymentMethod || body.payMethod || "card_general"),
        });
        return { order: created, user: await userPromise };
      });
      ctx.orderId = String(order.merchantUid || "");

      // 어떤 소비자도 idempotent 값·201/200 구분을 읽지 않는다(전수 조사). 생성 직후(10초 이내)만
      // 신규로 표기한다 — 정확한 created 신호를 위해 createOrder 반환 형태를 바꾸지 않는다.
      const idempotent = Date.now() - new Date(order.createdAt || 0).getTime() > 10_000;
      const customer = await buildLegacyPrepareCustomer(env, user, userId);
      const legacyOrder = toLegacyPrepareOrder(order, {
        config: getPortOnePublicConfig(env),
        customer,
        pricing: listedProduct.pricing || { ...listedProduct },
        body,
      });
      const envelope = legacyPrepareEnvelope(legacyOrder, { idempotent });
      if (legacyEnvelope === "billing-checkout") return json(legacyBillingCheckoutEnvelope(envelope));
      return json(envelope, { status: idempotent ? 200 : 201 });
    },
  },

  "POST /orders/:id/confirm": {
    auth: "required",
    async handle({ request, env, ctx, userId, params, withDb }) {
      ctx.orderId = params.id;
      const result = await confirmOrder(env, ctx, { orderId: params.id, actorUserId: userId }, { withDb });
      ctx.paymentStatus = "PAID";
      // 결제 확정이 GET /api/auth/me 의 entitlement/points 필드를 바꾼다 — 30초 엣지 캐시를 지운다
      // (근거는 handlePassConfirm 의 같은 주석, worker/lib/credential-scoped-cache.js).
      await purgeCredentialCache(request, CREDENTIAL_CACHE_PREFIXES);
      if (result.granted) return json({ ok: true, order: presentOrder(result.order), entitlementStatus: "granted" });
      // 🔴 200 이다. 카드는 승인됐고 주문도 기록됐다 — 장애가 아니라 마무리가 남은 성공이다.
      return json({
        ok: true,
        order: presentOrder(result.order),
        entitlementStatus: "pending",
        code: "GRANT_PENDING",
        pollUrl: `/api/payments/orders/${encodeURIComponent(params.id)}`,
        message: "결제는 완료됐어요. 콘텐츠 준비를 마무리하는 중이니 다시 결제하지 말아 주세요.",
      });
    },
  },

  /**
   * 🔴 컷오버 어댑터 — 구 확정 URL(/api/billing/confirm 재작성)을 confirmOrder 로 잇는다.
   * 주문 id 는 body.merchantUid(구 클라이언트가 checkout 응답에서 받아 되돌려주는 값 = V2 주문 id).
   * 금액·impUid 는 클라 값을 믿지 않는다 — verifyPgPayment 가 주문 문서와 PortOne 사실을 대조한다.
   * 성공 봉투는 셸 판정기(_cdHasVerifiedServerAccess)가 읽는 accessGrant·해금 증빙 초집합을 싣고,
   * 지급 마무리 대기(granted=false)는 GRANT_PENDING 으로 나간다 — 셸의 PENDING 분기(PR #478)가
   * 복귀 티켓을 유지한 채 "다시 결제하지 마세요" UX 로 처리한다.
   */
  "POST /confirm": {
    auth: "required",
    async handle({ request, env, ctx, userId, body, withDb }) {
      // 이용권형 바디는 이용권 경로로 위임 — 구 billing.js handleConfirm 의 isSubscription 분기 승계.
      if (isPassLikeBody(body)) return handlePassConfirm({ request, env, ctx, userId, body, withDb });
      const orderId = String(body.merchantUid || body.orderId || body.paymentId || "").trim();
      if (!orderId) throw paymentError("INVALID_REQUEST", "merchantUid 가 필요합니다.");
      ctx.orderId = orderId;
      const result = await confirmOrder(env, ctx, { orderId, actorUserId: userId }, { withDb });
      ctx.paymentStatus = "PAID";
      // 결제 확정이 GET /api/auth/me 의 entitlement/points 필드를 바꾼다 — 30초 엣지 캐시를 지운다
      // (근거는 handlePassConfirm 의 같은 주석, worker/lib/credential-scoped-cache.js).
      await purgeCredentialCache(request, CREDENTIAL_CACHE_PREFIXES);
      const envelope = legacyConfirmEnvelope(result.order, {
        granted: result.granted,
        replayed: result.replayed,
        unlock: !isPerUseFeatureKey(result.order?.featureKey),
      });
      // 🔴 프리미엄 리포트류는 확정 응답의 premiumAccessToken(+쿠키)이 열람 자격이다 — 구 confirm 의
      // successWithPremiumAccess 승계. 빠지면 결제는 됐는데 콘텐츠 접근이 막힌다(2026-08-12 수정).
      const featureKey = String(result.order?.featureKey || "");
      const reason = String(body.reason || result.order?.pricingSnapshot?.reason || "");
      const reportType = result.granted ? resolvePremiumAccessReportType(featureKey, reason) : "";
      if (!reportType) return json(envelope);
      const premiumAccessToken = await createPremiumAccessToken(env, {
        userId: String(userId || ""),
        reportType,
        featureKey,
        reason,
        transactionId: orderId,
        requestId: String(body.requestId || ""),
        purchaseId: orderId,
        chargedCoins: Number(result.order?.chargedPoints || 0),
      });
      if (!premiumAccessToken) return json(envelope);
      envelope.premiumAccessToken = premiumAccessToken;
      return json(envelope, {
        headers: { "Set-Cookie": buildPremiumAccessCookie(premiumAccessToken, String(env?.NODE_ENV || "").trim().toLowerCase() === "production") },
      });
    },
  },

  /**
   * 🔴 월정석 컷오버 어댑터 — 구 /api/billing/coin-gate 의 MOONLIGHT_STONE 분기(재작성)를 V2
   * spendMoonstone 으로 잇는다. 구 월정석의 고질병(M0 트랜잭션 불가 → MONTHLY_ATOMIC_UNAVAILABLE
   * 영구 503)이 이 전환의 이유다 — V2 는 원장 예약→lot CAS→정산 순서로 트랜잭션 없이 원자성을 얻는다.
   * 계약: 성공은 legacyMoonstoneEnvelope(셸 판정기 2종 충족), 부족은 402 INSUFFICIENT_MONTHLY_CREDITS
   * (+잔액 필드 — 월정석 옵션 비활성 판정), 경합·진행중은 409 MONTHLY_CREDIT_CONSUME_IN_PROGRESS
   * (셸이 같은 requestId 로 3회 재시도 — 원장 replay 라 이중차감 없음). 영구 해금형만 지급을 남기고
   * 회당(per_use)은 차감+증빙만 — 구 분기와 같은 경계다.
   */
  "POST /coin-gate/moonstone": {
    auth: "required",
    async handle({ request, env, ctx, userId, body, withDb }) {
      const requestId = String(body.requestId || body.purchaseId || "").trim();
      if (!requestId) throw paymentError("IDEMPOTENCY_KEY_REQUIRED", "requestId 가 필요합니다.");
      const product = resolveLegacyProduct(body);
      ctx.productId = product.productId;
      ctx.orderId = requestId;
      const profileId = String(body.profileId || body.selectedProfileId || "").trim();
      let billingType = "per_use";
      try { billingType = String(resolveProduct({ featureKey: product.featureKey }).billingType || "per_use"); } catch { billingType = "per_use"; }
      const unlock = billingType !== "per_use";

      let spend;
      let alreadyUnlocked = false;
      try {
        spend = await withDb(env, ctx, async (db) => {
          /* 🔴 영구 해금형은 **소유 여부를 차감보다 먼저** 확정한다. 한 번 결제해 해금한 콘텐츠는
             이후 재열람이 무료여야 하고, 이건 결제수단과 무관한 규칙이다(이용권 pass-check 와 대칭).
             뒤로 미루면 다시 열 때마다 월정석이 또 빠져 재열람이 반복 과금이 된다.
             grantEntitlement 는 upsert 라 순서만 바뀔 뿐 왕복이 늘지 않고, 재열람은 차감·원장
             기록을 통째로 건너뛰므로 **더 빨라진다**(왕복 6회 → 2회). */
          let grantedIdentity = null;
          if (unlock) {
            const granted = await grantEntitlement(db, {
              userId, product, orderId: requestId, profileId,
              contentKey: body.contentKey, scope: body.scope, source: "MONTHLY",
            });
            if (granted.alreadyOwned) {
              alreadyUnlocked = true;
              return { balance: null, replayed: true, ledgerId: "" };
            }
            grantedIdentity = granted.identity;
          }
          /* 🔴 차감이 실패하면 위에서 만든 지급을 되돌린다. withPaymentDb 는 트랜잭션이 아니라
             (worker/payments/db.js) 아무도 대신 걷어 주지 않는다 — 이게 없으면 **잔액이 부족해
             402 를 받은 사용자에게 영구 해금이 그대로 남아** 재진입이 무료가 된다.
             spendMoonstone 은 자기 원장 예약을 스스로 지우므로(moonstone.js) 여기서 되돌릴 것은
             권한뿐이다. */
          let result;
          try {
            result = await spendMoonstone(db, { userId, product, purchaseId: requestId, profileId });
          } catch (error) {
            if (grantedIdentity) {
              await dropEntitlementByIdentity(db, { userId, identity: grantedIdentity, orderId: requestId });
            }
            throw error;
          }
          /* 🔴 계정 해금 목록은 **차감이 끝난 뒤에** 적는다. 실패했을 때 $pull 로 되돌리면 카드 결제 등
             다른 경로로 얻은 같은 featureKey 까지 지우게 되므로, 애초에 늦게 쓰는 쪽이 맞다. */
          if (unlock) await markUserFeatureUnlocked(db, { userId, featureKey: product.featureKey });
          return result;
        });
      } catch (error) {
        // 레거시 오류 계약 — 코드·필드가 셸의 재시도(409)·재제안(402)·월정석 옵션 비활성 판정에 걸려 있다.
        if (error?.code === "MOONSTONE_IN_PROGRESS" || error?.code === "MOONSTONE_CONTENDED") {
          return json({ ok: false, code: "MONTHLY_CREDIT_CONSUME_IN_PROGRESS", message: String(error.message || "월정석 사용을 처리하는 중입니다. 잠시 후 다시 시도해 주세요.") }, { status: 409 });
        }
        if (error?.code === "INSUFFICIENT_MOONSTONE") {
          return json({
            ok: false,
            code: "INSUFFICIENT_MONTHLY_CREDITS",
            message: String(error.message || "월정석이 부족합니다."),
            monthlyBalance: Number(error?.meta?.balance ?? 0),
            currentMonthlyCredits: Number(error?.meta?.balance ?? 0),
            requiredMonthlyCredits: Number(error?.meta?.required ?? product.monthlyCost),
            membershipCreditCost: Number(product.monthlyCost || 0),
          }, { status: 402 });
        }
        throw error;
      }

      ctx.paymentStatus = alreadyUnlocked ? "ALREADY_UNLOCKED" : "MONTHLY";
      // 재열람은 잔액을 바꾸지 않는다 — 스냅샷을 굳이 비우면 다음 조회가 Mongo 를 다시 탄다.
      // GET /api/auth/me 의 entitlement/accessGateResult 엣지 캐시도 같은 이유로 같이 건너뛴다
      // (근거는 handlePassConfirm 의 같은 주석, worker/lib/credential-scoped-cache.js).
      if (!alreadyUnlocked) {
        invalidateBalanceSnapshot(userId);
        await purgeCredentialCache(request, CREDENTIAL_CACHE_PREFIXES);
      }
      const reason = String(body.reason || "");
      const reportType = resolvePremiumAccessReportType(product.featureKey, reason);
      const premiumAccessToken = reportType
        ? await createPremiumAccessToken(env, {
          userId: String(userId || ""),
          reportType,
          featureKey: product.featureKey,
          reason,
          transactionId: String(spend.ledgerId || requestId),
          requestId,
          purchaseId: requestId,
          chargedCoins: Number(product.priceCoins || 0),
        })
        : "";
      const envelope = legacyMoonstoneEnvelope({
        product, requestId, profileId, spend, unlock, premiumAccessToken, alreadyUnlocked,
      });
      if (!premiumAccessToken) return json(envelope);
      return json(envelope, {
        headers: { "Set-Cookie": buildPremiumAccessCookie(premiumAccessToken, String(env?.NODE_ENV || "").trim().toLowerCase() === "production") },
      });
    },
  },

  /**
   * 🔴 이용권 검사 컷오버 — 구 /api/billing/coin-gate 의 MEMBERSHIP_PASS 분기(재작성)를 V2 로 잇는다.
   *
   * 이 경로가 남은 503·"로그인이 필요합니다" 오탐의 최대 지점이었다: 구 분기는 인증 조회 + 이용권
   * 조회 + 프로필 조회 + 소비 CAS 로 **왕복 4회**를 공유 풀에서 썼고, M0 에서 그 팬아웃이 곧
   * 커넥션 기아였다. V2 는 신원을 JWT 로만 풀고(Mongo 0회) **User 1읽기 + CAS 1쓰기**로 끝낸다.
   *
   * 판정 정책은 2규칙(건당 상한 + 단일 월 예산)으로 단순화했다 — 근거·승계 범위는 passes.js
   * evaluatePassCoverage 머리주석. 응답 계약은 구 successWithPremiumAccess 봉투를 그대로 승계한다:
   * 셸 판정기 `_cdIsMembershipFreePayload`(index.html)가 data.consume.accessType 을 읽고,
   * 미커버는 402(코드 무관하게 결제창으로 인계)로 나간다 — 막다른 길을 만들지 않는 것이 핵심이다.
   */
  "POST /coin-gate/pass-check": {
    auth: "required",
    async handle({ request, env, ctx, userId, body, withDb }) {
      const product = resolveLegacyProduct(body);
      ctx.productId = product.productId;
      const requestId = String(body.requestId || body.idempotencyKey || body.purchaseId || "").trim()
        || `pass-${crypto.randomUUID()}`;
      ctx.orderId = requestId;

      // 이용권으로 결제할 수 없는 상품(프로필 카드 관리·음악 등)은 등급과 무관하게 즉시 인계한다.
      // 정본은 카탈로그의 passExcluded 하나다 — featureKey 별 예외 분기를 두지 말 것.
      let billingType = "per_use";
      let passExcluded = false;
      try {
        const catalogItem = resolveProduct({ featureKey: product.featureKey });
        billingType = String(catalogItem.billingType || "per_use");
        passExcluded = catalogItem.passExcluded === true;
      } catch { /* 카탈로그 미등재는 아래 일반 경로로 */ }
      if (passExcluded) {
        return passGateFailure("MEMBERSHIP_PASS_NOT_ALLOWED", "이 기능은 이용권으로 결제할 수 없습니다. 단건 결제 또는 월정석으로 이용해 주세요.", { featureKey: product.featureKey });
      }

      const profileId = String(body.profileId || body.selectedProfileId || "").trim();
      const marker = buildPassConsumeMarker(product.featureKey, requestId);
      const unlock = billingType !== "per_use";

      const outcome = await withDb(env, ctx, async (db) => {
        const user = await db.findOne(User, { _id: toObjectId(userId) });
        const entitlement = resolveCanonicalEntitlement(user || {});
        const coverage = evaluatePassCoverage({ user, entitlement, coinCost: product.priceCoins });
        if (!coverage.covered) return { coverage, entitlement };

        // 멱등: 같은 (기능, requestId) 로 이미 통과했으면 예산을 다시 깎지 않는다.
        const markers = Array.isArray(user?.recentConsumeRequestIds) ? user.recentConsumeRequestIds : [];
        if (marker && markers.includes(marker)) {
          return { coverage, entitlement, user, replayed: true };
        }

        /* 🔴 영구 해금형은 **소유 여부를 먼저** 확정한다. 뒤로 미루면 이미 가진 콘텐츠를 다시 열
           때마다 월 예산이 또 깎여, 재열람이 사실상 반복 과금이 된다(구 accessDecision 의
           already_unlocked 분기 승계). grantEntitlement 는 upsert 라 순서만 바뀔 뿐 왕복은 늘지 않는다.
           🔴 지급은 **여기 한 번뿐**이다. 소유 확인을 앞으로 옮긴 리팩터가 뒤쪽 지급 쌍을 지우지 않아
           한동안 같은 upsert + $addToSet 가 예산 차감 뒤에 한 번 더 돌았다 — 결과는 같지만 unlock 형
           이용권 검사마다 왕복 2회를 그냥 버렸다. 뒤에 다시 넣지 말 것. */
        let grantedIdentity = null;
        if (unlock) {
          const granted = await grantEntitlement(db, {
            userId, product, orderId: requestId, profileId,
            contentKey: body.contentKey, scope: body.scope, source: "PASS",
          });
          if (granted.alreadyOwned) return { coverage, entitlement, user, alreadyUnlocked: true };
          grantedIdentity = granted.identity;
        }

        const updated = await consumePassCoverage(db, {
          userId, coverage, marker, existingMarkers: markers,
        });
        if (!updated) {
          /* CAS 패배 = 그 사이 예산이 소진됐거나 이용권이 바뀌었다. 커버를 단정하지 않고 인계하되,
             🔴 위에서 만든 지급은 반드시 되돌린다 — 남기면 예산을 못 깎고도 영구 해금이 성립해
             그 다음 진입이 무료가 된다(월정석 경로와 같은 결함). */
          if (grantedIdentity) {
            await dropEntitlementByIdentity(db, { userId, identity: grantedIdentity, orderId: requestId });
          }
          return { coverage: { covered: false, reason: "pass_access_conflict", tier: coverage.tier }, entitlement };
        }
        // 계정 해금 목록은 예산 차감이 확정된 뒤에 적는다($pull 로 되돌리면 다른 경로의 권한까지 지운다).
        if (unlock) await markUserFeatureUnlocked(db, { userId, featureKey: product.featureKey });
        // 🔴 증빙 먼저. 구 deferred/register 가 이 행을 찾지 못하면 이용권을 이미 소비하고도
        //    402 로 막힌다(passes.js recordPassUsageEvidence 머리주석).
        await recordPassUsageEvidence(db, { userId, product, requestId, profileId, coverage, user: updated });
        return { coverage, entitlement, user: updated };
      });

      if (!outcome.coverage.covered) {
        ctx.paymentStatus = "PASS_NOT_COVERED";
        return passGateFailure(passFailureCode(outcome.coverage.reason), passFailureMessage(outcome.coverage.reason), {
          featureKey: product.featureKey,
          decisionReason: passDecisionReason(outcome.coverage.reason),
          membershipPass: presentMembershipPass(outcome.entitlement, outcome.coverage),
          ...(outcome.coverage.perItemLimit !== undefined ? { passLimit: outcome.coverage.perItemLimit } : {}),
          ...(outcome.coverage.budgetCoin !== undefined ? {
            monthlyPassLimit: outcome.coverage.budgetCoin,
            monthlySpendUsed: outcome.coverage.usedCoin,
            monthlySpendRemaining: outcome.coverage.remainingCoin,
          } : {}),
        });
      }

      ctx.paymentStatus = "PASS";
      // 표시용 잔액 스냅샷에 이용권 커버 사용량이 반영된다 — 45s TTL 이라 무효화가 필수다.
      // GET /api/auth/me 의 entitlement/accessGateResult 엣지 캐시도 같은 이유로 같이 지운다
      // (근거는 handlePassConfirm 의 같은 주석, worker/lib/credential-scoped-cache.js).
      invalidateBalanceSnapshot(userId);
      await purgeCredentialCache(request, CREDENTIAL_CACHE_PREFIXES);
      const reason = String(body.reason || "");
      const reportType = resolvePremiumAccessReportType(product.featureKey, reason);
      const premiumAccessToken = reportType
        ? await createPremiumAccessToken(env, {
          userId: String(userId || ""),
          reportType,
          featureKey: product.featureKey,
          reason,
          transactionId: requestId,
          requestId,
          purchaseId: requestId,
          chargedCoins: 0,
          freeBySubscription: true,
        })
        : "";
      /* 🔴 소진을 유발한 **이 요청**이 클라이언트에 종료를 알리는 유일한 기회다. 다음 요청은 이용권이
         이미 없어 no_active_pass 로 떨어지는데, 그 전에 스냅샷이 "보유"라고 답하면 낙관 통과 →
         402 → 결제창의 왕복이 한 번 더 돈다. 판정은 소비 후 누적액 하나로 파생한다(플래그 배선 없음).
         멱등 재생·이미 해금 경로에서도 같은 답이 나온다 — 이용권이 끝난 것은 사실이기 때문이다. */
      const passEnded = isPassBudgetExhausted(
        outcome.coverage.tier,
        outcome.user?.profileSubscription?.monthlySpendCoin,
        outcome.coverage.budgetCoin,
      );
      const envelope = legacyPassCheckEnvelope({
        product, requestId, profileId, unlock, premiumAccessToken, passEnded,
        coverage: outcome.coverage,
        entitlement: outcome.entitlement,
        user: outcome.user,
        replayed: outcome.replayed === true,
        alreadyUnlocked: outcome.alreadyUnlocked === true,
        sessionId: String(body.sessionId || body.reportSessionId || ""),
        reportId: String(body.reportId || ""),
      });
      if (!premiumAccessToken) return json(envelope);
      return json(envelope, {
        headers: { "Set-Cookie": buildPremiumAccessCookie(premiumAccessToken, String(env?.NODE_ENV || "").trim().toLowerCase() === "production") },
      });
    },
  },

  /**
   * 🔴 이용권(구독) 컷오버 — 구 /api/payments/subscription/prepare|confirm(재작성)을 V2 로 잇는다.
   * 검증·오류 코드·응답 키는 구 핸들러 승계(위 handlePassPrepare/Confirm 머리주석), 주문·활성화는
   * passes.js(파생 멱등 주문 id · CAS · lastPassOrderId 재실행 가드). 자동갱신·월정석 지급 없음이
   * 구 동작과 동일함은 전수 조사로 확정(passes.js 머리주석).
   */
  "POST /subscription/prepare": {
    auth: "required",
    async handle(args) {
      return handlePassPrepare(args);
    },
  },

  "POST /subscription/confirm": {
    auth: "required",
    async handle(args) {
      return handlePassConfirm(args);
    },
  },

  "POST /moonstone/spend": {
    auth: "required",
    async handle({ request, env, ctx, userId, body, withDb }) {
      const product = resolveProduct({ productId: body.productId, featureKey: body.featureKey, reason: body.reason });
      if (product.passExcluded) {
        throw paymentError("PASS_NOT_APPLICABLE", "이 기능은 월정석으로 결제할 수 없습니다.");
      }
      ctx.productId = product.productId;
      const purchaseId = String(body.idempotencyKey || "").trim();
      const result = await withDb(env, ctx, async (db) => {
        const spend = await spendMoonstone(db, { userId, product, purchaseId, profileId: body.profileId });
        await grantEntitlement(db, {
          userId, product, orderId: purchaseId, profileId: body.profileId,
          contentKey: body.contentKey, scope: body.scope, source: "MONTHLY",
        });
        await markUserFeatureUnlocked(db, { userId, featureKey: product.featureKey });
        return spend;
      });
      invalidateBalanceSnapshot(userId); // 월정석 차감 반영
      // GET /api/auth/me 의 entitlement/accessGateResult 엣지 캐시도 같은 이유로 같이 지운다
      // (근거는 handlePassConfirm 의 같은 주석, worker/lib/credential-scoped-cache.js).
      await purgeCredentialCache(request, CREDENTIAL_CACHE_PREFIXES);
      return json({ ok: true, balance: result.balance, replayed: result.replayed });
    },
  },

  "POST /webhook": {
    auth: "none",
    // 🔴 본문을 **원문 그대로** 읽어야 한다. JSON 파싱 후 재직렬화하면 서명이 깨진다.
    rawBody: true,
    async handle({ env, ctx, rawBody, request, withDb }) {
      /* 첫 슬롯에서 이벤트 청구·비-Paid 처리·확정 판정까지 함께 끝낸다. 확정 판정을 여기서 같이
         내려 두면(begun) confirmOrder 가 판정 슬롯을 따로 잡지 않아, 카드 결제마다 오는 웹훅이
         결제 레인에서 쓰는 슬롯이 둘로 유지된다. */
      const accepted = await withDb(env, ctx, async (db) => {
        const event = await acceptWebhook(env, db, { rawBody, headers: request.headers });
        ctx.orderId = event.paymentId;
        // 처리 완료된 중복은 조용히 성공이다 — PortOne 에 재전송을 요구할 이유가 없다.
        // 처리 중(busy)은 409 — 형제가 결국 실패하면 PortOne 재전송이 유일한 복구 장치라 200 으로 끊지 않는다.
        if (event.busy) throw paymentError("WEBHOOK_IN_PROGRESS", "webhook event is being processed", { orderId: event.paymentId });
        if (!event.claimed) return { ...event, outcome: { duplicate: true } };

        if (event.eventType && !/paid/i.test(event.eventType)) {
          // 비-Paid 이벤트(실패·취소·부분취소)는 위 applyNonPaidPgEvent 가 구 웹훅 시맨틱을 승계한다.
          // 그 밖의 타입(가상계좌 등 카드 전용 서비스의 미지원 계열)은 받았다는 사실만 남긴다.
          const applied = await applyNonPaidPgEvent(db, { eventType: event.eventType, orderId: event.paymentId });
          await markEventProcessed(db, { eventId: event.eventId });
          return { ...event, outcome: applied };
        }
        const order = await findOrder(db, { orderId: event.paymentId });
        return { ...event, begun: evaluateConfirmable(ctx, order, { orderId: event.paymentId }) };
      });
      if (accepted.outcome) return json({ ok: true, ...accepted.outcome });

      try {
        await confirmOrder(env, ctx, { orderId: accepted.paymentId }, {
          withDb,
          begun: accepted.begun,
          afterSettle: async (db, settled) => {
            // PAID 인데 지급이 안 된 주문(재생 포함)은 여기서 지급을 마무리한다 — handlePassConfirm 과 같은 규칙.
            if (!settled.granted) await grantOrderEntitlement(db, settled.order);
            await markEventProcessed(db, { eventId: accepted.eventId });
          },
        });
      } catch (error) {
        /* 실패를 기록하고 **그대로 올린다.** 200 을 주면 PortOne 이 재전송을 멈춰 그 결제가
           영영 미확정으로 남는다 — PortOne 의 재전송이 우리의 재시도 장치다. */
        await withDb(env, ctx, (db) => markEventFailed(db, { eventId: accepted.eventId, reason: describeEventFailure(error) }));
        throw error;
      }
      return json({ ok: true, confirmed: true });
    },
  },
};

/** `GET /orders/abc` → 표의 `GET /orders/:id` + { id: "abc" } */
function matchRoute(method, path) {
  const direct = ROUTES[`${method} ${path}`];
  if (direct) return { route: direct, params: {} };

  const segments = path.split("/").filter(Boolean);
  for (const key of Object.keys(ROUTES)) {
    const [routeMethod, routePath] = key.split(" ");
    if (routeMethod !== method) continue;
    const routeSegments = routePath.split("/").filter(Boolean);
    if (routeSegments.length !== segments.length) continue;
    const params = {};
    const matched = routeSegments.every((segment, index) => {
      if (segment.startsWith(":")) {
        params[segment.slice(1)] = decodeURIComponent(segments[index]);
        return true;
      }
      return segment === segments[index];
    });
    if (matched) return { route: ROUTES[key], params };
  }
  return null;
}

/**
 * @param {Request} request
 * @param {object} env
 * @param {{ prefix?: string, withDb?: typeof withPaymentDb, legacyShape?: boolean, bodyText?: string }} [options]
 *   prefix — 마운트 지점(구 경로 /api/payments 에 마운트된다).
 *   withDb — 테스트용 주입. 실행기를 갈아끼울 수 있어야 **오류 매핑·로그·응답 계약까지
 *            전 경로를 Mongo 없이** 확인할 수 있다. 그러지 않으면 여기 테스트는
 *            "던지지 않았다" 수준에 머물러 사실상 아무것도 검증하지 못한다.
 *   bodyText — 라우터가 갈래를 정하느라 이미 읽은 본문. coin-gate 처럼 paymentMode 로 분기하는
 *            진입은 본문을 읽어야 라우트를 고를 수 있는데, 그대로 두면 같은 본문을 라우터에서 한 번
 *            (clone) 컨텍스트에서 또 한 번 읽는다. 넘어오면 재사용한다(rawBody 라우트는 해당 없음).
 */
export async function handlePaymentsContext(request, env, options = {}) {
  const withDb = options.withDb || withPaymentDb;
  // 구 경로로 마운트되면 구 응답 형태로 답한다(compat.js). 섀도 경로는 신규 형태 그대로.
  const legacyShape = options.legacyShape === true;
  // 주문 발급 어댑터의 봉투 선택: "billing-checkout" 이면 구 delegateToPayments 래핑({ok,data:{…}})을 승계.
  const legacyEnvelope = String(options.legacyEnvelope || "");
  const prefix = options.prefix || "/api/payments";
  const url = new URL(request.url);
  const path = url.pathname.slice(prefix.length).replace(/\/+$/, "") || "/";
  const method = request.method.toUpperCase();
  const meta = getRequestMeta(request);
  const ctx = createPaymentContext({ requestId: meta.requestId, route: `${method} ${prefix}${path}` });

  const matched = matchRoute(method, path);
  if (!matched) return json({ ok: false, code: "NOT_FOUND", message: "Not found." }, { status: 404 });

  let status = 200;
  let errorCode = "";
  let stage = "";
  let errorReason = "";
  try {
    const userId = matched.route.auth === "required"
      ? requireUser(await peekAccessTokenUserId(request, env)) // JWT 만 본다 — Mongo 읽기 0회
      : "";
    ctx.userId = userId;

    const rawBody = matched.route.rawBody ? await request.text() : "";
    let body = {};
    if (!matched.route.rawBody && method !== "GET") {
      const text = typeof options.bodyText === "string" ? options.bodyText : await request.text();
      if (text.trim()) {
        try { body = JSON.parse(text); } catch { throw paymentError("INVALID_REQUEST", "요청 본문이 올바르지 않습니다."); }
      }
    }

    const response = await matched.route.handle({
      request, env, ctx, userId, body, rawBody, params: matched.params, withDb, legacyShape, legacyEnvelope,
    });
    status = response.status;
    /* 🔴 정상 응답에도 서버 시간을 실어 보낸다. 예전엔 Server-Timing 이 오류 경로에만 붙어서
       (worker/lib/http.js), "느린데 200 으로 성공하는" 요청 — 즉 '결제창이 늦게 뜬다'의 본체 —
       은 브라우저에서 총 시간만 보였다. 숫자만 담으므로 PII 가 없고, Access-Control-Expose-Headers
       에 Server-Timing 이 이미 있어(worker/index.js) 교차출처에서도 읽힌다.
       오류 경로는 건드리지 않는다 — 그쪽의 cd-error;desc="stage" 가 진단 축이다. */
    applyServerTiming(response, ctx);
    return response;
  } catch (error) {
    const contract = classify(error);
    status = contract.status;
    errorCode = contract.code;
    stage = contract.stage || "";
    // PG_UNAVAILABLE 의 실제 사유(PortOne 응답·타임아웃)를 tail 에서 볼 수 있게 한다 — 사용자 문구만
    // 남기면 시크릿 불일치(UNAUTHORIZED)와 진짜 지연이 같은 줄로 보인다(2026-09-05).
    errorReason = String(contract.meta?.reason || "").slice(0, 160);
    return json({
      ok: false,
      code: contract.code,
      message: error?.message || "요청을 처리하지 못했습니다.",
      retryable: contract.retryable,
      requestId: meta.requestId,
      ...(Object.keys(contract.meta).length ? { details: contract.meta } : {}),
    }, { status: contract.status, headers: responseHeadersFor(contract) });
  } finally {
    logPayment({
      requestId: meta.requestId,
      route: ctx.route,
      userId: ctx.userId,
      orderId: ctx.orderId,
      productId: ctx.productId,
      paymentStatus: ctx.paymentStatus,
      pgTransactionId: ctx.pgTransactionId,
      status,
      errorCode,
      stage,
      durationMs: Date.now() - ctx.startedAt,
      mongoOps: ctx.mongoOps,
      // durationMs 를 admission 대기 / 커넥션 수립 / 실제 쿼리로 가른다(withPaymentDb 가 채운다).
      extra: { ...(ctx.dbTimings || {}), reason: errorReason },
    });
  }
}

/**
 * 성공 응답에 붙는 서버 시간. 이름은 짧게 — Server-Timing 은 헤더 예산을 먹는다.
 *   cd=요청 전체 · cdadm=admission 대기 · cdconn=Mongo 커넥션 수립 · cdop=쿼리
 * cd 에서 나머지 셋을 빼면 인증·가격해석·봉투 조립 등 순수 CPU 구간이 남는다.
 */
function applyServerTiming(response, ctx) {
  try {
    if (!response?.headers || response.headers.has("Server-Timing")) return;
    const t = ctx.dbTimings || {};
    const parts = [`cd;dur=${Date.now() - ctx.startedAt}`];
    if (Number.isFinite(t.admissionMs)) parts.push(`cdadm;dur=${t.admissionMs}`);
    if (Number.isFinite(t.connectMs)) parts.push(`cdconn;dur=${t.connectMs}`);
    if (Number.isFinite(t.opMs)) parts.push(`cdop;dur=${t.opMs}`);
    response.headers.set("Server-Timing", parts.join(", "));
  } catch {
    // 계측은 절대 응답 경로를 바꾸지 않는다.
  }
}

/**
 * 🔴 구 재조정 크론(payment-reconcile-task)의 정산 주체 — PENDING 인데 PortOne 이 PAID 라고 말하는
 * **V2 주문**(이용권 포함)을 웹훅과 같은 confirmOrder 로 확정·지급한다. 이 배선이 없던 동안 이용권은
 * "자동 정산 경로 없음" 마커만 받고 PENDING 으로 남았다가 30분 만료 취소를 맞았다(2026-09-03).
 * PG 재조회는 태스크가 이미 한 결과(pgPayment)를 주입해 생략한다 — 슬롯 안 fetch 금지 원칙 유지.
 * @returns {Promise<{ ok: true, replayed: boolean, granted: boolean }>}
 */
export async function settleOrderFromReconcile(env, { orderId, pgPayment = null }, { withDb = withPaymentDb } = {}) {
  const ctx = createPaymentContext({ requestId: `reconcile-${Date.now().toString(36)}`, route: "CRON payment-reconcile settle" });
  ctx.orderId = orderId;
  let granted = false;
  const result = await confirmOrder(env, ctx, { orderId }, {
    withDb,
    deps: pgPayment ? { fetchPayment: async () => pgPayment } : {},
    afterSettle: async (db, settled) => {
      granted = settled.granted || await grantOrderEntitlement(db, settled.order);
    },
  });
  return { ok: true, replayed: Boolean(result.replayed), granted };
}

/**
 * 🔴 실패·정체된 Transaction.Paid 웹훅의 재생 — 구 runWebhookReconcileTask(routes/payments.js, 일일 1회)를
 * 대체한다(2026-09-05 삭제). 구 태스크는 이벤트를 레거시 단건 정산 경로로 보내 **이용권 주문에 404** 를
 * 내고 lastError 를 덮어썼다(프로덕션 실측). 여기서는 "POST /webhook" 과 같은 confirmOrder + afterSettle 을
 * 그대로 탄다 — 주체별 분기를 만들지 않는다. 환불은 없다. 10분 크론(runPaymentsV2Reconcile)이 부른다.
 * 이벤트당 PG 조회 1회(8s 상한)라 limit 은 작게 둔다 — 밀린 이벤트는 다음 틱이 이어받는다.
 * @returns {Promise<{ scanned: number, processed: number, failed: number, contended: number }>}
 */
export async function replayWebhookEvents(env, { limit = 10, maxAttempts = 10, withDb = withPaymentDb, deps = {} } = {}) {
  const ctx = createPaymentContext({ requestId: `replay-${Date.now().toString(36)}`, route: "CRON payments-v2-webhook-replay" });
  const { claimed, contended } = await withDb(env, ctx, (db) => claimReplayableEvents(db, { limit, maxAttempts }));
  const summary = { scanned: claimed.length, processed: 0, failed: 0, contended };
  for (const event of claimed) {
    ctx.orderId = event.paymentId;
    try {
      if (!event.paymentId) throw paymentError("INVALID_REQUEST", "webhook event has no paymentId");
      await confirmOrder(env, ctx, { orderId: event.paymentId }, {
        withDb,
        deps,
        afterSettle: async (db, settled) => {
          if (!settled.granted) await grantOrderEntitlement(db, settled.order);
          await markEventProcessed(db, { eventId: event.eventId });
        },
      });
      summary.processed += 1;
    } catch (error) {
      summary.failed += 1;
      // 사유를 남긴다. 기록 자체가 실패하면 processing 으로 남아 2분 뒤 정체로 다시 잡힌다.
      await withDb(env, ctx, (db) => markEventFailed(db, { eventId: event.eventId, reason: describeEventFailure(error) }))
        .catch((markError) => console.error("[payments-v2-replay] markEventFailed failed:", String(markError?.message || markError)));
    }
  }
  // 재생 대상이 있었던 틱만 남긴다 — 매 틱 0건 로그는 tail 을 덮는다.
  if (summary.scanned > 0 || summary.contended > 0) console.warn("[CRON] payments-v2 webhook replay", summary);
  return summary;
}

/**
 * 🔴 크론 진입점 — V2 자가치유 4종(미지급 재지급 · 30분 PENDING 만료 · 죽은 환불락 해제 · 웹훅 재생).
 * V2 확정(confirmOrder)은 지급 실패를 200 GRANT_PENDING 으로 알리고 **여기에 마무리를 맡긴다** —
 * 이 배선이 없으면 그 계약은 약속만 있고 집행자가 없는 상태가 된다(컷오버 활성 직후의 실제 갭).
 * grant 를 여기서 조립해 넘기므로 reconcile.js 는 상품 해석·권한 규칙을 모른다.
 * 레거시 주문의 복구는 구 크론(payment-reconcile-task)이 계속 담당한다 — 경계는 status:"paid"
 * (reconcile.js regrantUnfulfilledOrders 주석 참고).
 */
export async function runPaymentsV2Reconcile(env) {
  const ctx = createPaymentContext({ requestId: `cron-${Date.now().toString(36)}`, route: "CRON payments-v2-reconcile" });
  let status = 200;
  let errorCode = "";
  try {
    const report = await withPaymentDb(env, ctx, async (db) => {
      const report = await runPaymentReconcile(db, {
        grant: (order) => grantOrderEntitlement(db, order).then((granted) => {
          if (!granted) throw paymentError("INTERNAL_ERROR", "entitlement grant failed", { orderId: String(order?.merchantUid || "") });
        }),
      });
      // 재지급 대상이 있었던 틱만 요약을 남긴다 — 무음이면 미지급이 쌓여도 로그로는 보이지 않는다.
      if (Number(report?.regrant?.scanned || 0) > 0) {
        console.warn("[CRON] payments-v2 regrant", report.regrant);
      }
      /* 월정석 고아 예약 정리. spendMoonstone 은 원장 예약을 효과보다 먼저 쓰므로, 그 사이에서
         죽으면 **미정산 예약 + 미차감 잔액** 이 남는다(사용자는 과금되지 않았다).
         재시도가 오는 경우는 spendMoonstone 이 그 자리에서 이어받으므로(90초 나이 게이트), 여기 남는
         것은 **아무도 다시 오지 않은** 잔상이다 — 그건 사용자가 아니라 크론이 걷어야 한다.
         같은 슬롯·같은 커넥션에서 이어 돌고, 실패해도 위 주문 재조정 결과는 잃지 않는다. */
      let moonstone = null;
      try {
        moonstone = await settleOrphanSpends(db);
      } catch (error) {
        console.error("[payments-v2-reconcile] moonstone orphan sweep failed:", String(error?.message || error));
      }
      /* 구매 확인 메일(전자상거래법 제13조). 🔴 결제 경로가 아니라 여기서 보낸다 — 확정 경로에
         외부 HTTP(Resend)를 얹으면 메일이 느려질 때 그 지연이 결제창 하드 503 으로 나온다.
         같은 슬롯에서 이어 돌고, 실패해도 위 두 결과는 잃지 않는다(월정석 정리와 같은 규칙). */
      let receipts = null;
      try {
        receipts = await sendPendingReceiptEmails(env, db);
      } catch (error) {
        console.error("[payments-v2-reconcile] receipt email sweep failed:", String(error?.message || error));
      }
      return { ...report, moonstone, receipts };
    });
    /* 웹훅 재생은 이벤트마다 PG 를 부르므로(슬롯 밖 fetch) 위 슬롯 바깥에서 따로 돈다.
       실패해도 위 결과는 잃지 않는다(월정석·메일과 같은 규칙). */
    let webhookReplay = null;
    try {
      webhookReplay = await replayWebhookEvents(env);
    } catch (error) {
      console.error("[payments-v2-reconcile] webhook replay failed:", String(error?.message || error));
    }
    return { ...report, webhookReplay };
  } catch (error) {
    const contract = classify(error);
    status = contract.status;
    errorCode = contract.code;
    throw error;
  } finally {
    logPayment({
      requestId: ctx.requestId,
      route: ctx.route,
      status,
      errorCode,
      durationMs: Date.now() - ctx.startedAt,
      mongoOps: ctx.mongoOps,
    });
  }
}

export const __paymentsContextTestUtils = {
  ROUTES, matchRoute, presentOrder, confirmOrder, evaluateConfirmable, settleVerifiedOrder, contractFor,
};

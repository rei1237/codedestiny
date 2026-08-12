/**
 * 이용권(달빛 이용권, membership_pass) 구매 — 플랜 카탈로그 · 주문 · 활성화.
 *
 * ## 구 핸들러에서 승계하지 **않은** 것 (2026-08-12 전수 조사로 확정된 사실들)
 *   · 자동갱신 없음 — runCardSubscriptionBillingTask 는 영구 비활성 스텁이고 nextBillingAt 은 항상
 *     null 이다. 그래도 profileSubscription 의 청구 필드들은 **형태 호환** 때문에 그대로 쓴다.
 *   · 구매 시 월정석 지급 없음 — 구 confirm 은 MonthlyCreditLedger/PointHistory 를 전혀 쓰지 않았다.
 *     잔액 필드는 기존 값을 에코할 뿐이다. 여기서도 동일하다.
 *   · 활성화 실패 시 자동 환불 없음(의도적 이탈) — 활성화는 멱등 flat $set 이라 재실행이 안전하므로,
 *     구 코드의 auto-refund 대신 **재시도 가능 실패(503)** 로 응답해 클라이언트의 pending 재확인
 *     경로("결제 상태 다시 확인"·리다이렉트 복귀·replay)가 마무리하게 한다. 환불은 사람이 결정한다.
 *
 * ## 가격 정본
 * 월 가격 리터럴은 구 payments.js(352-356)·PointsClient(571-644)·셸 goldenPackages 와 3중 미러다.
 * 구 파일은 동결이라 옮기지 못하므로 여기 리터럴을 두고, 패리티 테스트가 셸 정본과 대조한다
 * (payments.subscription-purchase.test.js 가 쓰는 것과 같은 기법).
 */
import { Payment, User } from "../lib/models.js";
import { HONEY_PASS_POLICY, normalizePassTier } from "../lib/profile-limits.js";
import { paymentError } from "./errors.js";
import { toObjectId } from "./db.js";

const PASS_MONTHLY_WON = Object.freeze({ standard: 9900, premium: 29900, vvip: 59000, family: 149000 });
const PASS_PRODUCT_TYPE = "membership_pass";
const PASS_TIER_RANK = Object.freeze({ free: 0, standard: 1, premium: 2, vvip: 3, family: 4 });
const DAY_MS = 86_400_000;

export function resolvePassPlan(tierInput, durationMonthsInput) {
  const tier = normalizePassTier(tierInput);
  const durationMonths = Number(durationMonthsInput || 1);
  if (!tier || !PASS_MONTHLY_WON[tier]) return null;
  if (durationMonths !== 1) return null; // 30일 단품만 판다(구 카탈로그와 동일)
  const policy = HONEY_PASS_POLICY[tier];
  return Object.freeze({
    tier,
    planId: `${tier}_1m`,
    durationMonths: 1,
    durationDays: 30,
    wonPrice: PASS_MONTHLY_WON[tier],
    productType: PASS_PRODUCT_TYPE,
    profileLimit: Number(policy?.maxProfiles ?? 1),
    maxCoveredCoin: Number(policy?.maxCoveredCoin ?? 0),
    name: `${policy?.label || tier} 30일`,
  });
}

export function listPassPlans() {
  return Object.keys(PASS_MONTHLY_WON).map((tier) => resolvePassPlan(tier, 1));
}

/** 구 스킴 그대로: cdsub_<alnum(userId)>. 클라이언트가 confirm 바디로 되돌려준다. */
export function buildPassCustomerUid(userId) {
  return `cdsub_${String(userId || "").replace(/[^a-zA-Z0-9]/g, "")}`.slice(0, 60);
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 주문 id 는 파생값이다(V2 orders.js 와 같은 원칙 — 연속 클릭이 주문 두 개를 만들지 못한다).
 * sub_ 접두는 구 스킴 승계: 기존 조회·정산·관리자 화면이 이 접두로 이용권 주문을 식별한다.
 */
export async function derivePassOrderId(userId, idempotencyKey, tier) {
  const key = String(idempotencyKey || "").trim();
  if (!key) throw paymentError("IDEMPOTENCY_KEY_REQUIRED", "결제 요청 식별자가 필요합니다.");
  const hex = await sha256Hex(`${String(userId || "").trim()}:${key}`);
  return `sub_${String(tier || "").charAt(0) || "x"}1m_${hex.slice(0, 28)}`.slice(0, 40);
}

/** 구 evaluateSubscriptionTierTransition 승계: 활성 이용권 보유 중 하위 등급 구매만 막는다. */
export function evaluatePassTierTransition(currentSubscription, requestedTier, now = new Date()) {
  const sub = currentSubscription && typeof currentSubscription === "object" ? currentSubscription : {};
  const activeTier = normalizePassTier(sub.tier) || "free";
  const expiresAt = sub.expiresAt ? new Date(sub.expiresAt) : null;
  const hasActive = activeTier !== "free" && expiresAt instanceof Date && !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() > now.getTime();
  if (!hasActive) return { code: "NEW", activeTier: "free" };
  const activeRank = PASS_TIER_RANK[activeTier] ?? 0;
  const requestedRank = PASS_TIER_RANK[requestedTier] ?? 0;
  if (requestedRank < activeRank) return { code: "DOWNGRADE_BLOCKED", activeTier };
  if (requestedRank === activeRank) return { code: "EXTENSION_ALLOWED", activeTier, activeExpiresAt: expiresAt };
  return { code: "UPGRADE_ALLOWED", activeTier };
}

/**
 * 만료 계산(구 calculateSubscriptionActivationExpiresAt 승계):
 * 업그레이드는 결제 시점부터 새로 시작(남은 기간 소멸 — 구 정책 그대로),
 * 같은 등급 연장은 기존 만료에 이어 붙인다(스택).
 */
export function computePassExpiry({ transition, paidAt, now = new Date(), durationDays = 30 }) {
  const reference = new Date(Math.max(now.getTime(), paidAt instanceof Date ? paidAt.getTime() : now.getTime()));
  let anchor = reference;
  if (transition?.code === "EXTENSION_ALLOWED" && transition.activeExpiresAt instanceof Date
    && transition.activeExpiresAt.getTime() > now.getTime()) {
    anchor = transition.activeExpiresAt;
  }
  return new Date(anchor.getTime() + durationDays * DAY_MS);
}

/**
 * T1 · 이용권 주문 upsert. 같은 (userId, idempotencyKey, membership_pass) 는 같은 주문이다.
 * 같은 키의 기존 주문이 다른 금액·등급이면 IDEMPOTENCY_CONFLICT — 구 계약 그대로, 옛 가격
 * 주문을 조용히 돌려주지 않는다(클라이언트는 새 키로 다시 온다).
 */
export async function createPassOrder(db, { userId, plan, idempotencyKey, paymentMethod = "card_general" }) {
  const uid = toObjectId(userId);
  if (!uid) throw paymentError("UNAUTHORIZED", "로그인이 필요합니다.");
  const orderId = await derivePassOrderId(userId, idempotencyKey, plan.tier);
  const now = new Date();

  const result = await db.findOneAndUpdate(
    Payment,
    { userId: uid, idempotencyKey: String(idempotencyKey).trim(), paymentType: PASS_PRODUCT_TYPE },
    {
      $setOnInsert: {
        userId: uid,
        merchantUid: orderId,
        idempotencyKey: String(idempotencyKey).trim(),
        paymentType: PASS_PRODUCT_TYPE,
        paymentAmount: plan.wonPrice,
        expectedChargedPoints: 0,
        chargedPoints: 0,
        paymentMethod,
        status: "pending",
        orderState: "PENDING",
        source: "prepare",
        subscriptionTier: plan.tier,
        productId: plan.planId,
        confirmAttempts: 0,
        metadata: {
          planId: plan.planId,
          durationMonths: plan.durationMonths,
          durationDays: plan.durationDays,
          productType: plan.productType,
          currency: "KRW",
        },
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  const order = result && typeof result === "object" && "value" in result && !("_id" in result) ? result.value : result;
  if (!order) throw paymentError("INTERNAL_ERROR", "이용권 주문을 생성하지 못했습니다.", { orderId });
  if (Number(order.paymentAmount) !== Number(plan.wonPrice) || String(order.subscriptionTier || "") !== plan.tier) {
    throw paymentError("IDEMPOTENCY_CONFLICT", "Idempotency key conflict. Request payload does not match existing membership pass preparation.", {
      orderId: String(order.merchantUid || ""),
    });
  }
  return order;
}

/**
 * 활성화 — User.profileSubscription 에 구 confirm 과 **정확히 같은 19경로 flat $set** + lastPassOrderId.
 * 멱등이다: 같은 주문으로 다시 실행해도 같은 값이 다시 쓰일 뿐이다(연장 스택은 transition 이
 * 활성 만료를 앵커로 쓰므로, 같은 주문의 재실행은 이미 반영된 만료를 다시 늘리지 않도록
 * lastPassOrderId 가드로 막는다).
 */
export async function activatePassSubscription(db, {
  userId, plan, orderId, customerUid, paymentMethod, paidAt, expiresAt, now = new Date(),
}) {
  const uid = toObjectId(userId);
  const existing = await db.findOne(User, { _id: uid });
  const prior = existing?.profileSubscription && typeof existing.profileSubscription === "object"
    ? existing.profileSubscription
    : {};
  // 🔴 재실행 가드: 이 주문이 이미 반영됐다면(연장 스택 이중 적용 방지) 현재 상태를 그대로 돌려준다.
  if (String(prior.lastPassOrderId || "") === String(orderId)) {
    return { user: existing, replayed: true };
  }
  const update = {
    "profileSubscription.tier": plan.tier,
    "profileSubscription.passTier": plan.tier,
    "profileSubscription.planId": plan.planId,
    "profileSubscription.durationMonths": plan.durationMonths,
    "profileSubscription.productType": PASS_PRODUCT_TYPE,
    "profileSubscription.profileLimit": plan.profileLimit,
    "profileSubscription.maxCoveredCoin": Number(plan.maxCoveredCoin || 0),
    "profileSubscription.freeLimit": Number(plan.maxCoveredCoin || 0),
    "profileSubscription.passLimit": Number(plan.maxCoveredCoin || 0),
    "profileSubscription.source": "pass",
    "profileSubscription.startedAt": paidAt,
    "profileSubscription.expiresAt": expiresAt,
    "profileSubscription.cancelAtPeriodEnd": false,
    "profileSubscription.cancelRequestedAt": null,
    "profileSubscription.customerUid": String(customerUid || buildPassCustomerUid(userId)),
    "profileSubscription.paymentMethod": String(paymentMethod || "card_general"),
    "profileSubscription.nextBillingAt": null,
    "profileSubscription.lastBillingAt": paidAt,
    "profileSubscription.lastBillingStatus": "success",
    "profileSubscription.lastBillingError": "",
    "profileSubscription.firstSubAt": prior.firstSubAt || paidAt,
    "profileSubscription.lastPassOrderId": String(orderId),
    "profileSubscription.updatedAt": now,
  };
  const updated = await db.findOneAndUpdate(User, { _id: uid }, { $set: update }, { returnDocument: "after" });
  const user = updated && typeof updated === "object" && "value" in updated && !("_id" in updated) ? updated.value : updated;
  if (!user) throw paymentError("DB_UNAVAILABLE", "이용권 활성화를 반영하지 못했습니다. 잠시 후 '결제 상태 다시 확인'으로 재시도해 주세요.", { orderId });
  return { user, replayed: false };
}

/** 클라이언트가 실제로 읽는 subscription 응답(구 17키 + 실제로 읽히지만 구가 빠뜨렸던 startedAt). */
export function presentPassSubscription(profileSubscription, plan, { customerUid = "", paymentMethod = "" } = {}) {
  const sub = profileSubscription && typeof profileSubscription === "object" ? profileSubscription : {};
  const expiresAt = sub.expiresAt ? new Date(sub.expiresAt).toISOString() : null;
  return {
    tier: sub.tier || plan?.tier || "free",
    source: "pass",
    isActive: Boolean(expiresAt && new Date(expiresAt).getTime() > Date.now()),
    startedAt: sub.startedAt ? new Date(sub.startedAt).toISOString() : null,
    expiresAt,
    profileLimit: Number(sub.profileLimit ?? plan?.profileLimit ?? 1),
    planId: sub.planId || plan?.planId || "",
    durationMonths: Number(sub.durationMonths ?? plan?.durationMonths ?? 1),
    productType: PASS_PRODUCT_TYPE,
    membershipCreditBalance: Number(sub.membershipCreditBalance || 0),
    membershipCreditGranted: Number(sub.membershipCreditGranted || 0),
    membershipCreditUsed: Number(sub.membershipCreditUsed || 0),
    cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
    cancelRequestedAt: sub.cancelRequestedAt ? new Date(sub.cancelRequestedAt).toISOString() : null,
    customerUid: String(sub.customerUid || customerUid || ""),
    paymentMethod: String(sub.paymentMethod || paymentMethod || ""),
    nextBillingAt: null,
    lastBillingStatus: "success",
  };
}

export const __passesTestUtils = { PASS_MONTHLY_WON, PASS_TIER_RANK };

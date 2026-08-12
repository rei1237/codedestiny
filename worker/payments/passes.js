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
 * 월 가격은 `lib/payment/pass-pricing.js` 하나가 정본이며 구 payments.js·PointsClient 도 같은 모듈을
 * import 한다(2026-08-12 에 4중 미러를 정리했다). 유일하게 남은 사본은 import 가 불가능한 정적 셸
 * 인라인(`index.html` goldenPackages)이고, payments.subscription-purchase.test.js 가 셸과 대조한다.
 */
import { Payment, PointHistory, User } from "../lib/models.js";
import {
  HONEY_PASS_POLICY,
  MONTHLY_PASS_LIMITS,
  PASS_LIMITS,
  PREMIUM_QUOTA_MIN_COIN_COST,
  normalizePassTier,
  resolvePremiumQuotaCycleKey,
} from "../lib/profile-limits.js";
import { PASS_MONTHLY_WON } from "../../lib/payment/pass-pricing.js";
import { paymentError } from "./errors.js";
import { toObjectId } from "./db.js";

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

/* ── 이용권 커버 판정·소비 (구 coin-gate MEMBERSHIP_PASS 분기 승계) ──────────────
 *
 * ## 3중 쿼터 → 2규칙 단순화 (2026-08-12 사용자 승인)
 * 구 판정은 ①건당 상한 ②프리미엄 상담 포함횟수(family 10회·vvip 3회) ③월 누적 한도의 3중이었다.
 * ②와 ③을 **단일 월 예산(코인)** 하나로 합친다 — 카운터가 하나면 판정과 소비가 같은 수를 보므로
 * "판정은 커버라 했는데 소비가 거부"하는 막다른 길(과거 프로필카드 실사고와 동형)이 구조적으로
 * 사라진다. 예산 수치는 현행 월 누적 한도(MONTHLY_PASS_LIMITS)를 그대로 승계하므로 체감 변화가 없고,
 * 고가 상담도 코인 예산에서 자연히 차단된다(vvip 2,000코인 = 20만원).
 * 건당 상한 우회는 유지한다: 프리미엄 상담(300코인 이상)을 포함 혜택으로 갖던 등급(family·vvip)은
 * 상한 대신 예산으로만 판정한다 — 이걸 빼면 vvip 상한(100코인)이 상담을 전부 막아 혜택이 사라진다.
 *
 * ## 왕복 예산
 * 판정은 넘겨받은 User 문서 하나로 끝나고(추가 조회 0), 소비는 CAS 1회다. 구 경로는 인증 조회 +
 * 이용권 조회 + 프로필 조회 + 소비 CAS 로 4왕복이었고, 그 팬아웃이 M0 풀 기아·503·"로그인 필요"
 * 오탐의 최대 지점이었다(worker/lib/db.js 결제 레인 주석과 한 세트다).
 */
const PASS_MARKER_CAP = 40;

/** 프리미엄 상담 건당-상한 우회 대상 등급. 구 PREMIUM_QUOTA_INCLUDED_USES_BY_TIER 의 키와 같다. */
const PREMIUM_BYPASS_TIERS = new Set(["family", "vvip"]);

export function buildPassConsumeMarker(featureKey, requestId) {
  const key = String(featureKey || "").trim();
  const id = String(requestId || "").trim();
  return key && id ? `tier-pass:${key}:${id}` : "";
}

/**
 * 커버 판정. **읽기 0회** — 호출부가 이미 읽은 User 문서로만 판단한다.
 * @returns {{ covered: boolean, reason?: string, tier?: string, ... }}
 */
export function evaluatePassCoverage({ user, entitlement, coinCost }) {
  const cost = Math.max(0, Math.floor(Number(coinCost || 0)));
  const sub = user?.profileSubscription && typeof user.profileSubscription === "object" ? user.profileSubscription : {};
  const tier = normalizePassTier(entitlement?.passTier || entitlement?.tier);
  if (!entitlement?.isActive || !tier) return { covered: false, reason: "no_active_pass" };
  if (!Number.isFinite(cost) || cost <= 0) return { covered: false, reason: "invalid_price", tier };

  const perItemLimit = Math.max(0, Math.floor(Number(PASS_LIMITS[tier] || 0)));
  const budgetCoin = Math.max(0, Math.floor(Number(MONTHLY_PASS_LIMITS[tier] || 0)));
  const cycleKey = resolvePremiumQuotaCycleKey(entitlement);
  // 예산은 사이클 키(=이용권 만료일)가 있어야 셀 수 있다. 못 세는 상태는 막지 않는다(구 정책 승계).
  const budgetApplies = Boolean(cycleKey) && budgetCoin > 0;
  const usedCoin = String(sub.premiumUseCycleKey || "") === cycleKey
    ? Math.max(0, Math.floor(Number(sub.monthlySpendCoin || 0)))
    : 0;

  const premiumBypass = PREMIUM_BYPASS_TIERS.has(tier) && cost >= PREMIUM_QUOTA_MIN_COIN_COST;
  if (!premiumBypass && cost > perItemLimit) {
    return { covered: false, reason: "price_exceeds_pass_limit", tier, perItemLimit, coinCost: cost };
  }
  if (budgetApplies && usedCoin + cost > budgetCoin) {
    return {
      covered: false, reason: "monthly_pass_limit_exceeded", tier,
      budgetCoin, usedCoin, remainingCoin: Math.max(0, budgetCoin - usedCoin), coinCost: cost,
    };
  }
  return {
    covered: true, tier, perItemLimit, coinCost: cost,
    budgetApplies, budgetCoin, usedCoin, cycleKey,
    remainingCoin: budgetApplies ? Math.max(0, budgetCoin - usedCoin - cost) : budgetCoin,
    sameCycle: budgetApplies && String(sub.premiumUseCycleKey || "") === cycleKey,
  };
}

/**
 * 소비 CAS. **쓰기 1회**(경합 시 반대 분기로 1회 재시도).
 * 필터가 예산을 다시 검사하므로 동시 요청이 예산을 초과해 통과할 수 없고, 멱등 마커가 있으면
 * 같은 요청의 재시도가 예산을 두 번 깎지 않는다. null = 경합에서 졌다 → 호출부가 재판정한다.
 */
export async function consumePassCoverage(db, { userId, coverage, marker, existingMarkers = [], now = new Date() }) {
  const uid = toObjectId(userId);
  if (!uid) throw paymentError("UNAUTHORIZED", "로그인이 필요합니다.");
  const cost = Math.max(0, Math.floor(Number(coverage?.coinCost || 0)));
  const markerSet = { ...(marker ? { recentConsumeRequestIds: { $ne: marker } } : {}) };
  const markerWrite = !marker
    ? {}
    : existingMarkers.length < PASS_MARKER_CAP
      ? { $addToSet: { recentConsumeRequestIds: marker } }
      : { $set: { recentConsumeRequestIds: [...existingMarkers.slice(-(PASS_MARKER_CAP - 1)), marker] } };

  const baseSet = {
    "profileSubscription.passTier": coverage.tier,
    "profileSubscription.maxCoveredCoin": coverage.perItemLimit,
    "profileSubscription.updatedAt": now,
  };

  // 예산을 못 세는 상태(만료일 없음)면 카운터를 건드리지 않고 마커만 남긴다.
  if (!coverage.budgetApplies) {
    const updated = await db.findOneAndUpdate(
      User, { _id: uid, ...markerSet },
      mergeUpdate({ $set: baseSet }, markerWrite),
      { returnDocument: "after" },
    );
    return unwrapUser(updated);
  }

  // 같은 사이클이면 증분(예산 잔량을 필터로 재검사), 새 사이클이면 이번 건부터 다시 센다.
  const attempts = coverage.sameCycle
    ? [
      {
        filter: {
          _id: uid, ...markerSet,
          "profileSubscription.premiumUseCycleKey": coverage.cycleKey,
          "profileSubscription.monthlySpendCoin": { $lte: coverage.budgetCoin - cost },
        },
        update: mergeUpdate({ $set: baseSet, $inc: { "profileSubscription.monthlySpendCoin": cost } }, markerWrite),
      },
    ]
    : [
      {
        filter: { _id: uid, ...markerSet, "profileSubscription.premiumUseCycleKey": { $ne: coverage.cycleKey } },
        update: mergeUpdate({
          $set: {
            ...baseSet,
            "profileSubscription.premiumUseCycleKey": coverage.cycleKey,
            "profileSubscription.monthlySpendCoin": cost,
          },
        }, markerWrite),
      },
      // 읽은 뒤 다른 요청이 사이클을 먼저 열었다면 증분 분기로 한 번 더 시도한다.
      {
        filter: {
          _id: uid, ...markerSet,
          "profileSubscription.premiumUseCycleKey": coverage.cycleKey,
          "profileSubscription.monthlySpendCoin": { $lte: coverage.budgetCoin - cost },
        },
        update: mergeUpdate({ $set: baseSet, $inc: { "profileSubscription.monthlySpendCoin": cost } }, markerWrite),
      },
    ];

  for (const attempt of attempts) {
    const updated = unwrapUser(await db.findOneAndUpdate(User, attempt.filter, attempt.update, { returnDocument: "after" }));
    if (updated) return updated;
  }
  return null;
}

/**
 * 이용권 사용 증빙(PointHistory delta 0) 기록.
 *
 * 🔴 이게 없으면 지연차감(deferUsage) 흐름이 결제 뒤에 막힌다. 클라이언트는 coin-gate 성공 직후
 * 구 `/api/billing/coin-gate/deferred/register` 를 부르고, 그 핸들러는 PointHistory·원장·Payment
 * 중 하나에서 증빙을 찾지 못하면 402(PAYMENT_VERIFICATION_FAILED)로 응답한다 — V2 가 이용권을
 * 이미 소비했는데도 기능이 열리지 않는 최악의 조합이 된다(2026-08-12 감사에서 발견).
 * 구 코드는 FAMILY 등급만 이 행을 남겼고 나머지 등급은 사용 이력 자체가 없었다 — 여기서는
 * 모든 등급에 남긴다(감사 추적이 생기고, 위 지연차감 연결이 등급과 무관하게 성립한다).
 * delta 0 이라 잔액에 영향이 없다(구 recordPassAccessIfNeeded 와 같은 형태).
 */
export async function recordPassUsageEvidence(db, { userId, product, requestId, profileId = "", coverage = {}, user = null }) {
  const uid = toObjectId(userId);
  if (!uid || !requestId) return null;
  const isFamily = String(coverage.tier || "") === "family";
  const now = new Date();
  try {
    await db.insertOne(PointHistory, {
      userId: uid,
      kind: "deduct",
      delta: 0,
      balanceAfter: Math.max(0, Math.floor(Number(user?.points || 0))),
      reason: String(product?.label || "pass_access"),
      featureKey: String(product?.featureKey || ""),
      metadata: {
        accessType: isFamily ? "family" : "membership_pass",
        accessMethod: isFamily ? "FAMILY" : "PASS",
        paymentMethod: isFamily ? "FAMILY" : "PASS",
        requestId: String(requestId),
        purchaseId: String(requestId),
        profileId: String(profileId || ""),
        featureKey: String(product?.featureKey || ""),
        coinCost: Number(product?.priceCoins || 0),
        coinPrice: Number(product?.priceCoins || 0),
        passTier: coverage.tier || null,
        passLimit: Number(coverage.perItemLimit || 0),
        monthlySpendUsed: Number(coverage.usedCoin || 0) + Number(coverage.coinCost || 0),
      },
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    // 증빙 기록 실패가 이미 소비된 이용권 접근을 막지 않는다. 지연차감 연결은 못 하지만
    // 그 경우 register 가 402 를 주고 클라이언트가 다른 결제수단으로 인계한다(무료 누수 없음).
    return null;
  }
  return true;
}

function mergeUpdate(base, extra) {
  const merged = { ...base };
  for (const [op, value] of Object.entries(extra || {})) {
    merged[op] = { ...(merged[op] || {}), ...value };
  }
  return merged;
}

function unwrapUser(result) {
  if (result && typeof result === "object" && "value" in result && !("_id" in result)) return result.value;
  return result || null;
}

export const __passesTestUtils = { PASS_MONTHLY_WON, PASS_TIER_RANK, PASS_MARKER_CAP };

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
  FAMILY_PASS_MAX_COVERED_COIN,
  HONEY_PASS_POLICY,
  KRW_PER_COIN,
  MONTHLY_PASS_LIMITS,
  PASS_LIMITS,
  normalizePassTier,
  resolvePremiumQuotaCycleKey,
} from "../lib/profile-limits.js";
import { PASS_MONTHLY_WON } from "../../lib/payment/pass-pricing.js";
import { paymentError } from "./errors.js";
import { toObjectId } from "./db.js";
// 🔴 세대 사다리는 카드 상품과 **같은 구현**을 쓴다. 두 벌을 두면 한쪽만 고쳐 상품별 멱등 계약이 갈린다.
import { MAX_ORDER_GENERATIONS, generationKey, terminalGenerationKey } from "./orders.js";

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
 * 같은 키의 기존 주문이 다른 금액·등급이면 IDEMPOTENCY_CONFLICT — 옛 가격 주문을 조용히
 * 돌려주지 않는다. 그 409 를 흡수하는 것은 아래 createPayablePassOrder 다(호출부는 그쪽을 쓴다).
 */
export async function createPassOrder(db, { userId, plan, idempotencyKey, paymentMethod = "card_general" }) {
  const uid = toObjectId(userId);
  if (!uid) throw paymentError("UNAUTHORIZED", "로그인이 필요합니다.");
  const orderId = await derivePassOrderId(userId, idempotencyKey, plan.tier);
  const now = new Date();

  let result = null;
  try {
    result = await db.findOneAndUpdate(
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
  } catch (error) {
    /* 🔴 orders.js createOrder 와 **완전히 같은 결함**이었다(2026-08-15). 동시 클릭의 패자가 내는
       11000 을 잡지 않으면 lib/http.js 가 MongoServerError 를 /^Mongo/ 로 삼켜 503 DB_UNAVAILABLE
       로 내보내고, 클라이언트의 status>=500 폴백이 결제창을 다시 연다. 이용권 구매도 같은 길을
       탔다. 승자 문서를 돌려주는 것이 멱등 계약이고, 아래 금액·등급 대조가 그 문서에 그대로
       적용되므로 다른 플랜의 주문이면 종전대로 IDEMPOTENCY_CONFLICT(409)가 된다. */
    if (Number(error?.code) !== 11000) throw error;
    result = null;
  }
  let order = result && typeof result === "object" && "value" in result && !("_id" in result) ? result.value : result;
  if (!order) {
    // 11000 이 났을 때만 도는 콜드 패스. 정상 경로의 Mongo 왕복 수는 그대로 1회다.
    // findOne 은 드라이버 7·6 모두 문서를 직접 주므로 위 {value} 되감기가 필요 없다.
    order = await db.findOne(Payment, {
      userId: uid,
      paymentType: PASS_PRODUCT_TYPE,
      $or: [{ merchantUid: orderId }, { idempotencyKey: String(idempotencyKey).trim() }],
    });
  }
  if (!order) throw paymentError("INTERNAL_ERROR", "이용권 주문을 생성하지 못했습니다.", { orderId });
  return order;
}

/** 이 주문으로 지금 결제창을 열어도 되는가. orders.js isPayableOrder 와 같은 술어(정확 일치)다. */
function isPayablePassOrder(order) {
  return String(order?.status || "") === "pending";
}

/** 의도가 달라졌는가. 이용권은 가격 승계(reprice)를 하지 않는다 — 다른 플랜은 다른 주문이다. */
function hasPassDrift(order, plan) {
  return Number(order?.paymentAmount) !== Number(plan.wonPrice)
    || String(order?.subscriptionTier || "") !== plan.tier;
}

/**
 * T1' · **결제 가능한 이용권 주문을 반드시 돌려준다.** 카드 상품의 createPayableOrder 와 같은 계약이다.
 *
 * 예전에는 재사용할 수 없는 주문(다른 플랜·이미 결제됨·취소됨)을 만나면 곧바로 409 를 던졌다. 그런데
 * `/points` 는 그 409 를 새 키로 재시도하지 않고 토스트만 띄우므로(PointsClient), 사용자는 그 키가
 * 바뀔 때까지 **이용권을 살 수 없는 막다른 길**에 갇혔다. 게다가 이미 결제된 주문이 조건을 통과하면
 * 그 merchantUid 가 PortOne 에 다시 넘어가 **결제창이 그려지기 전에 거절**된다(카드 쪽에서 닫은 것과
 * 같은 형제 결함).
 *
 * 멱등키가 막아야 하는 것은 "진행 중인 결제의 중복 생성"이지 "의도가 달라진 재요청"이 아니다.
 * 그래서 재사용할 수 없으면 거절하는 대신 세대를 올려 새 주문을 발급한다. 새 merchantUid =
 * 새 PortOne paymentId 이고 결제창이 열리기 전이라 이중결제 위험이 없다.
 *
 * 왕복 수: 정상 경로 **1회 그대로**. 재사용 불가일 때만 세대당 1회가 더 붙는다.
 */
export async function createPayablePassOrder(db, input) {
  const baseKey = String(input?.idempotencyKey || "").trim();
  if (!baseKey) throw paymentError("IDEMPOTENCY_KEY_REQUIRED", "결제 요청 식별자가 필요합니다.");
  const plan = input.plan;
  let lastOrderId = "";

  for (let generation = 0; generation < MAX_ORDER_GENERATIONS; generation += 1) {
    const order = await createPassOrder(db, { ...input, idempotencyKey: generationKey(baseKey, generation) });
    lastOrderId = String(order.merchantUid || "");
    if (isPayablePassOrder(order) && !hasPassDrift(order, plan)) return order;
  }

  // 고정 사다리 소진 — 겹칠 수 없는 키로 새 주문을 발급한다(orders.js terminalGenerationKey 머리주석).
  const fresh = await createPassOrder(db, { ...input, idempotencyKey: terminalGenerationKey(baseKey) });
  if (isPayablePassOrder(fresh) && !hasPassDrift(fresh, plan)) return fresh;

  throw paymentError("IDEMPOTENCY_CONFLICT", "Idempotency key conflict. Request payload does not match existing membership pass preparation.", {
    orderId: String(fresh?.merchantUid || lastOrderId || ""),
  });
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
 * 사라진다. 예산 수치는 현행 월 이용 한도(MONTHLY_PASS_LIMITS)를 그대로 승계한다.
 *
 * ## 건당-상한 우회 폐지 (2026-08-24 사용자 확정)
 * 2026-08-12~24 사이에는 family·vvip 가 300코인 이상 상품에서 건당 상한을 우회했다. vvip 상한이
 * 100코인(10,000원)이라 그 우회가 없으면 고가 상담 혜택이 통째로 사라졌기 때문이다. 이제 vvip
 * 상한이 200코인(20,000원)으로 올랐고, 새 정책은 "2만원급 콘텐츠까지"를 문자 그대로 지킨다 —
 * 우회를 남기면 20,001~29,999원만 미커버인 설명 불가능한 구간이 생기고 가격 페이지 문구가
 * 서버 판정과 어긋난다. family 는 애초에 건당 상한이 없어 우회가 필요 없었다.
 * 정본은 PASS_LIMITS 하나이며, 여기에 등급별 예외 분기를 되살리지 말 것.
 *
 * ## 왕복 예산
 * 판정은 넘겨받은 User 문서 하나로 끝나고(추가 조회 0), 소비는 CAS 1회다. 구 경로는 인증 조회 +
 * 이용권 조회 + 프로필 조회 + 소비 CAS 로 4왕복이었고, 그 팬아웃이 M0 풀 기아·503·"로그인 필요"
 * 오탐의 최대 지점이었다(worker/lib/db.js 결제 레인 주석과 한 세트다).
 */
const PASS_MARKER_CAP = 40;

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

  if (cost > perItemLimit) {
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
 * 이용권 판정을 **사람이 읽는 모양**으로 한 번에 설명한다. 읽기·쓰기 0회 — 호출부가 이미 읽은
 * User 문서와 이미 해석한 상품(catalog.resolveProduct 결과)만 쓴다.
 *
 * 왜 별도 함수인가: "이 서비스가 내 이용권으로 열리나?" 를 화면마다 각자 계산하면(가격 비교를
 * 페이지에 흩뿌리면) 가격이 바뀔 때마다 화면이 조용히 어긋난다. 판정의 정본은
 * evaluatePassCoverage 하나이고, 이 함수는 **그 결과를 그대로 옮겨 담는 어댑터**다 —
 * 여기서 커버 여부를 다시 계산하지 말 것(판정 두 벌 = 막다른 길의 씨앗).
 *
 * 🔴 게이트가 아니다. 실제 허용/차감은 evaluatePassCoverage + consumePassCoverage 가 한다.
 *    이 결과를 보고 소비를 건너뛰는 코드를 만들지 말 것(원칙 6 — 중첩 사전검사 금지).
 *
 * @param {{ user?: object, entitlement?: object, product?: object }} input
 *   product 는 { featureKey, priceCoins, priceKRW, passExcluded } 를 갖는 catalog 해석 결과.
 * @returns {{
 *   hasPass: boolean, tier: string|null, tierLabel: string,
 *   featureKey: string, canonicalPriceKRW: number,
 *   perItemLimitKRW: number|null, monthlyLimitKRW: number,
 *   monthlyUsedKRW: number, monthlyRemainingKRW: number,
 *   eligible: boolean, reason: string, deductKRW: number,
 *   profileLimit: number, expiresAt: string|null, cycleEndsAt: string|null,
 * }}
 *   perItemLimitKRW 가 null = 건당 상한 없음(family). profileLimit 0 = 무제한.
 *   reason 은 evaluatePassCoverage 의 사유를 그대로 쓰고, 이용권 제외 상품만
 *   "pass_excluded" 를 더한다.
 */
export function describePassEligibility({ user, entitlement, product } = {}) {
  const tier = normalizePassTier(entitlement?.passTier || entitlement?.tier);
  const policy = tier ? HONEY_PASS_POLICY[tier] : null;
  const hasPass = Boolean(entitlement?.isActive) && Boolean(tier);
  const priceCoins = Math.max(0, Math.floor(Number(product?.priceCoins || 0)));
  const canonicalPriceKRW = Math.max(0, Math.floor(Number(product?.priceKRW || 0)));
  const cycleKey = resolvePremiumQuotaCycleKey(entitlement);

  const perItemLimitCoin = tier ? Number(PASS_LIMITS[tier] || 0) : 0;
  const monthlyLimitCoin = tier ? Number(MONTHLY_PASS_LIMITS[tier] || 0) : 0;
  const sub = user?.profileSubscription && typeof user.profileSubscription === "object" ? user.profileSubscription : {};
  const usedCoin = cycleKey && String(sub.premiumUseCycleKey || "") === cycleKey
    ? Math.max(0, Math.floor(Number(sub.monthlySpendCoin || 0)))
    : 0;

  const base = {
    hasPass,
    tier: tier || null,
    tierLabel: policy ? policy.label : HONEY_PASS_POLICY.none.label,
    featureKey: String(product?.featureKey || ""),
    canonicalPriceKRW,
    perItemLimitKRW: !tier || perItemLimitCoin >= FAMILY_PASS_MAX_COVERED_COIN
      ? null
      : perItemLimitCoin * KRW_PER_COIN,
    monthlyLimitKRW: monthlyLimitCoin * KRW_PER_COIN,
    monthlyUsedKRW: usedCoin * KRW_PER_COIN,
    monthlyRemainingKRW: Math.max(0, monthlyLimitCoin - usedCoin) * KRW_PER_COIN,
    profileLimit: policy ? Number(policy.maxProfiles || 0) : HONEY_PASS_POLICY.none.maxProfiles,
    expiresAt: entitlement?.expiresAt ? String(entitlement.expiresAt) : null,
    cycleEndsAt: cycleKey || null,
  };

  if (product?.passExcluded) {
    return { ...base, eligible: false, reason: "pass_excluded", deductKRW: 0 };
  }

  const coverage = evaluatePassCoverage({ user, entitlement, coinCost: priceCoins });
  return {
    ...base,
    eligible: coverage.covered === true,
    reason: coverage.covered === true ? "covered" : String(coverage.reason || "not_covered"),
    // 차감은 정상 판매가 기준이다 — 할인·쿠폰·프로모션가가 아니라 canonical price.
    deductKRW: coverage.covered === true ? canonicalPriceKRW : 0,
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

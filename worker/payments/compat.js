/**
 * 부패방지층 — 신규 모듈의 응답을 **기존 클라이언트가 읽는 형태**로 되돌린다.
 *
 * ## 왜 필요한가
 *
 * 컷오버는 서버만 바뀌고 클라이언트는 그대로인 구간을 반드시 지난다. 그 구간에서 응답 키가
 * 하나라도 어긋나면 화면이 조용히 빈다 — 200 이 오고 파싱도 되는데 값이 undefined 라
 * 에러도 안 뜬다. 그게 가장 찾기 어려운 실패다.
 *
 * ## 🔴 이 파일은 추측으로 쓰지 않았다
 *
 * 키 목록은 구 응답(payments.js formatOrderDetailResponse)이 아니라 **소비자가 실제로 읽는 것**을
 * 세어서 만들었다. 구 응답은 22개 키를 내려주지만 소비자(app/points/history/order-view-model.ts
 * adaptOrderToViewModel + resolveType + resolveStatus)가 읽는 것은 아래 16개뿐이다.
 * 안 읽는 6개(coinPrice·accessType·cancelAmount·cancelledAt 등)는 여기서 되살리지 않는다 —
 * 호환층이 구 응답을 통째로 복제하면 그건 부패방지가 아니라 부패 이전이다.
 *
 * ## 봉투가 다르다
 *
 * 구 계약은 `{ data: { order } }` 이고 신규는 `{ ok, order }` 다.
 * PointHistoryClient.tsx:607 이 `data?.data?.order` 로 읽으므로 봉투를 맞춰 준다.
 *
 * 상태값은 손대지 않는다. resolveStatus 가 `status + orderState` 를 소문자로 이어 붙여
 * 부분문자열로 판정하므로, 신규 5상태(PENDING/PAID/FAILED/CANCELLED/REFUNDED)가 그대로 통과한다
 * (PAID→"paid"→completed). 이건 우연이 아니라 확인한 사실이고, 아래 테스트가 고정한다.
 */

/** 구 응답과 같은 마스킹. 끝 4자만 남긴다(payments.js maskPaymentIdentifier 와 동일). */
export function maskIdentifier(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.length <= 4 ? `••••${text}` : `••••${text.slice(-4)}`;
}

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * 주문 문서 → 구 `/api/payments/orders/:id` 의 order 형태.
 *
 * 신규 presentOrder 가 아니라 **주문 문서**를 받는다. presentOrder 는 신규 클라이언트용으로
 * 의도적으로 얇고, 구 클라이언트가 읽는 필드 일부(paymentType·membershipCreditCost 등)를
 * 담고 있지 않기 때문이다. 두 표현을 각자의 소비자에게 맞추는 것이 이 층의 일이다.
 */
export function toLegacyOrderDetail(order) {
  if (!order) return null;
  const merchantUid = String(order.merchantUid || "");
  return {
    // adaptOrderToViewModel 이 읽는 16개.
    id: merchantUid,
    paymentAmount: Number(order.paymentAmount || 0),
    membershipCreditCost: Number(order.membershipCreditCost || 0),
    chargedPoints: Number(order.chargedPoints || 0),
    featureKey: String(order.featureKey || ""),
    productId: String(order.productId || ""),
    paymentType: String(order.paymentType || ""),
    subscriptionTier: String(order.subscriptionTier || ""),
    paymentMethod: String(order.paymentMethod || ""),
    paymentMethodLabel: String(order.paymentMethodLabel || order.paymentMethod || ""),
    // resolveStatus 는 status 와 orderState 를 이어 붙여 본다. 신규 코드는 orderState 도 계속
    // 쓰고 있으므로 둘 다 그대로 넘긴다 — 여기서 5상태로 접지 않는다(구 판정 로직을 건드리지 않는다).
    status: String(order.status || ""),
    orderState: String(order.orderState || ""),
    createdAt: toIso(order.createdAt),
    updatedAt: toIso(order.updatedAt),
    paidAt: toIso(order.paidAt),
    orderNumberMasked: maskIdentifier(merchantUid),
    approvalNumberMasked: maskIdentifier(order.impUid),
    // 영수증은 PG 요약에만 있다. rawPortOne 은 pg.js 가 이미 PII 를 걷어낸 요약본이다.
    receiptUrl: order.rawPortOne?.receiptUrl || null,
    receiptAvailable: Boolean(order.rawPortOne?.receiptUrl),
  };
}

/** 구 봉투. PointHistoryClient 가 `data.data.order` 로 읽는다. */
export function legacyOrderDetailEnvelope(order) {
  return { ok: true, success: true, data: { order: toLegacyOrderDetail(order) } };
}

/* ── 주문 발급(prepare/checkout) 컷오버 어댑터 ─────────────────────────────
   구 /api/payments/prepare 의 201 응답 order 키 전부(2026-08-12 소비자 전수 조사).
   소비자 3곳이 실제로 읽는 키: 셸 _cdFindCheckoutOrder(merchantUid·paymentAmount 필수, config 5키,
   customer 폰·이메일·이름, coinPrice·featureKey), dp 폴백(같은 집합의 부분), PointsClient(merchantUid·
   paymentAmount·productName·coinPrice·customer.phoneNumber). 나머지는 구 응답과의 키 패리티 유지용 —
   빠지면 "200 인데 화면만 비는" 부류가 되므로 **초집합**으로 항상 전부 내보낸다. */
export function toLegacyPrepareOrder(order, { config = {}, customer = null, pricing = null, body = {} } = {}) {
  const amount = Number(order?.paymentAmount || 0);
  const coins = Number(order?.expectedChargedPoints ?? order?.coinPrice ?? 0);
  const snapshot = (order?.pricingSnapshot && typeof order.pricingSnapshot === "object") ? order.pricingSnapshot : {};
  return {
    // PG 클라이언트 config 블록 — 셸이 이걸 인라인으로 받으면 /api/payments/config 왕복을 건너뛴다.
    storeId: String(config.storeId || ""),
    channelKey: String(config.channelKey || ""),
    currency: String(config.currency || "CURRENCY_KRW"),
    payMethod: String(config.payMethod || "CARD"),
    noticeUrl: String(config.noticeUrl || ""),
    merchantUid: String(order?.merchantUid || ""),
    paymentAmount: amount,
    amountKRW: amount,
    amountKrw: amount,
    coinPrice: coins,
    costCoins: coins,
    membershipCreditCost: Number(order?.membershipCreditCost || 0),
    featureKey: String(order?.featureKey || ""),
    accessType: "single_purchase",
    profileId: String(snapshot.profileId || body.profileId || body.selectedProfileId || ""),
    profileCardId: String(body.profileCardId || snapshot.profileId || body.profileId || ""),
    productType: String(body.productType || body.serviceType || "digital_content"),
    serviceType: String(body.serviceType || body.productType || "digital_content"),
    actionType: String(body.actionType || ""),
    idempotencyKey: String(order?.idempotencyKey || ""),
    orderId: String(order?.merchantUid || ""),
    productName: String(body.productName || pricing?.label || order?.featureKey || "Code Destiny"),
    customer: customer && typeof customer === "object" ? customer : { fullName: "", email: "", phoneNumber: "" },
    pricing: pricing || snapshot || null,
  };
}

/** 구 /api/payments/prepare 봉투. PointsClient 가 `payload.order` 로 읽는다(중첩 없음). */
export function legacyPrepareEnvelope(legacyOrder, { idempotent = false } = {}) {
  return {
    message: idempotent
      ? "Product payment preparation already completed."
      : "Product payment preparation completed.",
    idempotent: idempotent === true,
    order: legacyOrder,
  };
}

/** 구 /api/billing/checkout 봉투(delegateToPayments 의 success 래핑 승계).
    셸·dp 는 `payload.data.order` 에서 주문을 찾는다 — data 중첩이 계약이다. */
export function legacyBillingCheckoutEnvelope(prepareEnvelope) {
  return {
    ok: true,
    message: "결제 요청이 성공했습니다.",
    data: prepareEnvelope,
  };
}

/**
 * 구 /api/billing/confirm 성공 봉투. 셸 판정기 `_cdHasVerifiedServerAccess` 가 읽는 것:
 * top-level `accessGrant` 에서 ok !== false · (evidenceId|purchaseId|paymentId|merchantUid 중 하나) ·
 * featureKey(별칭 일치). 증빙 폴백 경로는 unlockedFeatures/unlockMap/status 를 본다 — 전부 싣는다.
 * granted=false(지급 마무리 대기)는 성공 봉투가 아니라 GRANT_PENDING 으로 나가야 한다:
 * 셸 PR #478 분기가 top-level code 로 그 상태를 "다시 결제하지 마세요" UX 로 처리한다.
 */
export function legacyConfirmEnvelope(order, { granted = false, replayed = false } = {}) {
  const merchantUid = String(order?.merchantUid || "");
  const featureKey = String(order?.featureKey || "");
  const impUid = String(order?.impUid || "");
  const snapshot = (order?.pricingSnapshot && typeof order.pricingSnapshot === "object") ? order.pricingSnapshot : {};
  if (!granted) {
    return {
      ok: true,
      code: "GRANT_PENDING",
      recoveryRequired: true,
      status: "paid",
      merchantUid,
      featureKey,
      message: "결제는 완료됐어요. 콘텐츠 준비를 마무리하는 중이니 다시 결제하지 말아 주세요.",
    };
  }
  return {
    ok: true,
    status: "paid",
    alreadyUnlocked: replayed === true,
    message: "결제가 확인되어 콘텐츠 이용 권한이 적용되었습니다.",
    accessGrant: {
      ok: true,
      accessType: "single_purchase",
      featureKey,
      merchantUid,
      purchaseId: merchantUid,
      evidenceId: merchantUid,
      paymentId: impUid || merchantUid,
      profileId: String(snapshot.profileId || ""),
      paidAt: order?.paidAt || null,
    },
    unlockedFeatures: featureKey ? [featureKey] : [],
    unlockMap: featureKey ? { [featureKey]: true } : {},
    payment: {
      merchantUid,
      paymentId: impUid || merchantUid,
      transactionId: impUid || merchantUid,
      status: "paid",
      paymentAmount: Number(order?.paymentAmount || 0),
    },
  };
}

/**
 * 구 /api/billing/coin-gate 월정석(MOONLIGHT_STONE) 성공 봉투.
 * 셸 판정기 두 개가 계약이다: _cdHasVerifiedMonthlyConsumption 은 data.consume 에서
 * ledgerId|transactionId · accessType "membership_credit" · membershipCreditCost>0 · featureKey 를
 * 요구하고, _cdToCoinPayload 는 data.consume 을 우선 병합한다. 잔액 동기화는
 * consume.monthlyStoneBalance/remainingMembershipCredit, 재제안 판정은 402/409 코드·필드가 담당.
 */
export function legacyMoonstoneEnvelope({ product, requestId, profileId = "", spend, unlock = false, premiumAccessToken = "" }) {
  const balance = Number(spend?.balance || 0);
  const evidenceId = String(spend?.ledgerId || requestId);
  const consume = {
    ok: true,
    transactionType: "membership_credit",
    accessType: "membership_credit",
    accessMethod: "MONTHLY",
    paymentMethod: "MONTHLY",
    requestId,
    transactionId: evidenceId,
    ledgerId: String(spend?.ledgerId || ""),
    purchaseId: requestId,
    featureKey: String(product.featureKey || ""),
    profileId: profileId || undefined,
    coinPrice: Number(product.priceCoins || 0),
    chargedCoins: Number(product.priceCoins || 0),
    membershipCreditCost: Number(product.monthlyCost || 0),
    requiredMonthlyCredits: Number(product.monthlyCost || 0),
    remainingMembershipCredit: balance,
    monthlyStoneBalance: balance,
    idempotent: spend?.replayed === true,
  };
  return {
    ok: true,
    status: "paid",
    message: "월정석으로 결제가 완료되었습니다.",
    data: {
      pricing: product.pricing || null,
      charged: Number(product.priceCoins || 0),
      accessMethod: "MONTHLY",
      consume,
      accessGrant: {
        ok: true,
        accessType: "membership_credit",
        accessMethod: "MONTHLY",
        featureKey: String(product.featureKey || ""),
        requestId,
        purchaseId: requestId,
        evidenceId,
        profileId: profileId || undefined,
        paidAt: new Date().toISOString(),
      },
      balance,
      ...(unlock ? { unlockedFeatures: [String(product.featureKey || "")], unlockMap: { [String(product.featureKey || "")]: true } } : {}),
      ...(premiumAccessToken ? { premiumAccessToken } : {}),
    },
  };
}

/**
 * 이용권 무료 통과 봉투 — 구 coin-gate MEMBERSHIP_PASS 성공 응답(successWithPremiumAccess) 승계.
 *
 * 🔴 셸 판정기 `_cdIsMembershipFreePayload` 는 `_cdToCoinPayload` 로 **data.consume 을 최상위로
 * 병합한 뒤** accessType/accessMethod 를 본다. 즉 `consume.accessType = "membership_pass"`(family 는
 * "family")가 무료 통과의 증거이고, 이게 빠지면 결제는 면제됐는데 화면은 "결제가 완료되지 않았어요"로
 * 뜬다. data.freeBySubscription 도 같은 판정기의 첫 조건이라 함께 싣는다(둘 중 하나만 맞아도 통과하지만
 * 구 봉투가 둘 다 실었으므로 초집합을 유지한다).
 */
export function legacyPassCheckEnvelope({
  product, requestId, profileId = "", unlock = false, premiumAccessToken = "",
  coverage = {}, entitlement = {}, user = null, replayed = false, sessionId = "", reportId = "",
}) {
  const featureKey = String(product.featureKey || "");
  const isFamily = String(coverage.tier || "") === "family";
  const accessType = isFamily ? "family" : "membership_pass";
  const accessMethod = isFamily ? "FAMILY" : "PASS";
  const evidenceId = `membership:${String(coverage.tier || "pass")}:${requestId}`;
  const limit = Number(coverage.perItemLimit ?? entitlement?.maxCoveredCoin ?? 0);
  return {
    ok: true,
    message: "이용권 무료 한도 조건으로 서비스를 열었습니다.",
    data: {
      pricing: product.pricing || null,
      accessMethod: "PASS",
      charged: 0,
      consume: {
        ok: true,
        transactionType: isFamily ? "family_pass" : "membership_pass",
        accessType,
        accessMethod,
        paymentMethod: accessMethod,
        requestId,
        transactionId: evidenceId,
        purchaseId: requestId,
        featureKey,
        profileId: profileId || undefined,
        coinPrice: Number(product.priceCoins || 0),
        amountCoins: Number(product.priceCoins || 0),
        amountKRW: Number(product.priceKRW || 0),
        passTier: coverage.tier || null,
        idempotent: replayed === true,
        chargedCoins: 0,
        membershipCreditCost: 0,
      },
      accessGrant: {
        ok: true,
        accessType,
        accessMethod,
        featureKey,
        requestId,
        purchaseId: requestId,
        evidenceId,
        profileId: profileId || undefined,
        sessionId: sessionId || undefined,
        reportId: reportId || undefined,
        paidAt: new Date().toISOString(),
      },
      balance: null,
      membershipPass: {
        tier: coverage.tier || null,
        passTier: coverage.tier || null,
        freeLimit: limit,
        passLimit: limit,
        maxCoveredCoin: limit,
        ...(coverage.budgetCoin !== undefined ? {
          monthlyPassLimit: coverage.budgetCoin,
          monthlySpendUsed: coverage.usedCoin,
          monthlySpendRemaining: coverage.remainingCoin,
        } : {}),
      },
      user: {
        id: String(user?._id || ""),
        profileSubscription: user?.profileSubscription || null,
      },
      freeBySubscription: true,
      ...(unlock ? { unlockedFeatures: [featureKey], unlockMap: { [featureKey]: true } } : {}),
      ...(premiumAccessToken ? { premiumAccessToken } : {}),
    },
  };
}

/** adaptOrderToViewModel + resolveType + resolveStatus 가 읽는 키 전부. 테스트가 이 목록을 강제한다. */
export const LEGACY_ORDER_DETAIL_KEYS = Object.freeze([
  "approvalNumberMasked",
  "chargedPoints",
  "createdAt",
  "featureKey",
  "id",
  "membershipCreditCost",
  "orderNumberMasked",
  "orderState",
  "paidAt",
  "paymentAmount",
  "paymentMethod",
  "paymentMethodLabel",
  "paymentType",
  "productId",
  "receiptAvailable",
  "receiptUrl",
  "status",
  "subscriptionTier",
  "updatedAt",
]);

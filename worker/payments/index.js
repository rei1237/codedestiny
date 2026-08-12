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
import { User } from "../lib/models.js";
import { getPortOnePublicConfig } from "../lib/portone.js";
import { decryptPhoneNumber } from "../lib/pii-crypto.js";
import { classify, contractFor, paymentError, responseHeadersFor } from "./errors.js";
import { createPaymentContext, toObjectId, withPaymentDb } from "./db.js";
import { logPayment } from "./log.js";
import { listProducts, resolveProduct } from "./catalog.js";
import { verifyPgPayment } from "./pg.js";
import { grantEntitlement, markUserFeatureUnlocked, revokeEntitlementForOrder } from "./entitlements.js";
import { spendMoonstone } from "./moonstone.js";
import { acceptWebhook, markEventFailed, markEventProcessed } from "./webhook.js";
import { runPaymentReconcile } from "./reconcile.js";
import { resolveLegacyProduct } from "./legacy-pricing.js";
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
  legacyPrepareEnvelope,
  toLegacyPrepareOrder,
} from "./compat.js";
import {
  assertOrderOwner,
  createOrder,
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
    const revoked = await revokeEntitlementForOrder(db, { orderId });
    await recordPgCancellationMarkers(db, { orderId, partial: false, reviewRequired: !revoked });
    return { event: "cancelled", refunded, revoked, reviewRequired: !revoked };
  }
  return { ignored: true, status };
}

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
 * 확정 — **클라이언트 · webhook · 크론이 모두 이 함수를 탄다.** 주체별 분기는 없다.
 *
 * 순서가 계약이다: PG 검증 → 주문 PAID → 권한. 마지막 단계가 실패해도 **200 으로 성공을 알린다** —
 * 카드는 승인됐고 주문도 기록됐으므로 장애가 아니라 부작용이 덜 끝난 성공이고, 크론이 마무리한다.
 * 구 코드는 이 자리에서 `503 + retryable:false` 를 냈는데, 클라이언트가 행동할 수 없는 모순이었다.
 */
async function confirmOrder(env, db, ctx, { orderId, actorUserId = "" }, deps = {}) {
  const order = await findOrder(db, { orderId });
  if (!order) throw paymentError("ORDER_NOT_FOUND", "주문을 찾을 수 없습니다.", { orderId });
  if (actorUserId) assertOrderOwner(order, actorUserId);
  ctx.productId = String(order.productId || "");

  const status = toOrderStatus(order);
  if (status === "PAID") {
    // 재생. PG 를 다시 부르지 않는다 — PortOne 지연이 확정 경로의 지배적 비용이다.
    return { order, replayed: true, granted: Boolean(order.entitlementGrantedAt) };
  }
  if (status !== "PENDING") {
    throw paymentError("ORDER_NOT_CONFIRMABLE", "이 주문은 확정할 수 없는 상태입니다.", { orderId, status });
  }

  let pg;
  try {
    pg = await verifyPgPayment(env, { orderId, expectedAmountKRW: Number(order.paymentAmount || 0) }, deps);
  } catch (error) {
    const contract = classify(error);
    // 사실이 어긋난 것(422)은 주문을 실패로 확정한다. 닿지 못한 것(503)은 상태를 건드리지 않는다 —
    // PG 가 살아나면 그대로 확정될 주문이다.
    if (contract.status === 422) {
      await markOrderFailed(db, {
        orderId, failureCode: contract.code, failureMessage: error.message, failureStage: "pg-verify",
      });
    }
    throw error;
  }

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

/** 지급. 실패해도 던지지 않는다 — 돈은 이미 받았고, 실패를 오류로 올리면 사용자가 다시 결제한다. */
async function grantOrderEntitlement(db, order) {
  try {
    const snapshot = order.pricingSnapshot || {};
    const product = resolveProduct({
      productId: String(order.productId || ""),
      featureKey: String(order.featureKey || ""),
    });
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
    return true;
  } catch (error) {
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
      const product = resolveProduct({
        productId: body.productId, featureKey: body.featureKey, reason: body.reason,
      });
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
   * V2 createOrder 로 잇는다. 클라이언트는 그대로이므로 응답 키가 계약이다(compat.js 초집합).
   * 구 prepare 와의 의도적 차이 없음 · 승계한 계약 셋:
   *   ① CLIENT_AMOUNT_MISMATCH(400) — 낡은 가격의 요청으로 결제창을 열지 않는다
   *   ② IDEMPOTENCY_CONFLICT(409) — 같은 키의 기존 주문이 현재 가격·기능과 다르면 옛 주문을
   *      조용히 돌려주지 않는다(V2 createOrder 단독이면 그렇게 된다). 클라이언트의 새-키 1회
   *      재시도가 이 코드에 걸려 있다.
   *   ③ 멱등키 부재 시(구 PointsClient) 합성 키 — 구 partial 인덱스의 "키 없음 = 클릭마다 새 주문"
   *      의미를 보존한다.
   */
  "POST /prepare": {
    auth: "required",
    async handle({ request, env, ctx, userId, body, withDb, legacyEnvelope }) {
      // 🔴 가격 해석은 구 정본(billing-feature-registry) 체인을 그대로 탄다(legacy-pricing.js).
      // 첫 배선은 catalog(resolveProduct)를 썼는데, mode/reportMode/categoryKey 변형 가격을 잃어
      // 해당 기능의 단건 결제가 400(금액 불일치)으로 막히는 라이브 결함이었다(2026-08-12 수정).
      const product = resolveLegacyProduct(body);
      ctx.productId = product.productId;

      const clientAmount = Number(body.paymentAmount ?? body.amount);
      if (Number.isFinite(clientAmount) && clientAmount > 0 && Math.floor(clientAmount) !== Number(product.priceKRW)) {
        throw paymentError("CLIENT_AMOUNT_MISMATCH", "결제 금액이 현재 가격과 다릅니다. 화면을 새로고침한 뒤 다시 시도해 주세요.", {
          expectedAmount: Number(product.priceKRW),
          clientAmount,
        });
      }

      const headerKey = String(request.headers.get("Idempotency-Key") || request.headers.get("X-Idempotency-Key") || "").trim();
      let idempotencyKey = String(body.idempotencyKey || "").trim()
        || headerKey
        || String(body.orderId || body.requestId || "").trim();
      if (!idempotencyKey) idempotencyKey = `legacy-${crypto.randomUUID()}`;

      const { order, user } = await withDb(env, ctx, async (db) => {
        const userDoc = await db.findOne(User, { _id: toObjectId(userId) });
        const profileId = String(body.profileId || body.selectedProfileId || userDoc?.destinyProfilesCurrentId || "");
        const created = await createOrder(db, {
          userId,
          product,
          idempotencyKey,
          profileId,
          contentKey: body.contentKey,
          scope: body.scope,
          returnPath: body.returnPath,
          paymentMethod: String(body.paymentMethod || body.payMethod || "card_general"),
        });
        if (
          Number(created.paymentAmount) !== Number(product.priceKRW)
          || Number(created.expectedChargedPoints ?? created.coinPrice ?? 0) !== Number(product.priceCoins)
          || (String(created.featureKey || "") && String(product.featureKey || "") && String(created.featureKey) !== String(product.featureKey))
        ) {
          throw paymentError("IDEMPOTENCY_CONFLICT", "Idempotency key conflict. Request payload does not match existing product payment preparation.", {
            orderId: String(created.merchantUid || ""),
          });
        }
        return { order: created, user: userDoc };
      });
      ctx.orderId = String(order.merchantUid || "");

      // 어떤 소비자도 idempotent 값·201/200 구분을 읽지 않는다(전수 조사). 생성 직후(10초 이내)만
      // 신규로 표기한다 — 정확한 created 신호를 위해 createOrder 반환 형태를 바꾸지 않는다.
      const idempotent = Date.now() - new Date(order.createdAt || 0).getTime() > 10_000;
      const customer = await buildLegacyPrepareCustomer(env, user, userId);
      const legacyOrder = toLegacyPrepareOrder(order, {
        config: getPortOnePublicConfig(env),
        customer,
        pricing: product.pricing || { ...product },
        body,
      });
      const envelope = legacyPrepareEnvelope(legacyOrder, { idempotent });
      if (legacyEnvelope === "billing-checkout") return json(legacyBillingCheckoutEnvelope(envelope));
      return json(envelope, { status: idempotent ? 200 : 201 });
    },
  },

  "POST /orders/:id/confirm": {
    auth: "required",
    async handle({ env, ctx, userId, params, withDb }) {
      ctx.orderId = params.id;
      const result = await withDb(env, ctx, (db) => confirmOrder(env, db, ctx, {
        orderId: params.id, actorUserId: userId,
      }));
      ctx.paymentStatus = "PAID";
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
    async handle({ env, ctx, userId, body, withDb }) {
      const orderId = String(body.merchantUid || body.orderId || body.paymentId || "").trim();
      if (!orderId) throw paymentError("INVALID_REQUEST", "merchantUid 가 필요합니다.");
      ctx.orderId = orderId;
      const result = await withDb(env, ctx, (db) => confirmOrder(env, db, ctx, {
        orderId, actorUserId: userId,
      }));
      ctx.paymentStatus = "PAID";
      const envelope = legacyConfirmEnvelope(result.order, { granted: result.granted, replayed: result.replayed });
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
    async handle({ env, ctx, userId, body, withDb }) {
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
      try {
        spend = await withDb(env, ctx, async (db) => {
          const result = await spendMoonstone(db, { userId, product, purchaseId: requestId, profileId });
          if (unlock) {
            await grantEntitlement(db, {
              userId, product, orderId: requestId, profileId,
              contentKey: body.contentKey, scope: body.scope, source: "MONTHLY",
            });
            await markUserFeatureUnlocked(db, { userId, featureKey: product.featureKey });
          }
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

      ctx.paymentStatus = "MONTHLY";
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
      const envelope = legacyMoonstoneEnvelope({ product, requestId, profileId, spend, unlock, premiumAccessToken });
      if (!premiumAccessToken) return json(envelope);
      return json(envelope, {
        headers: { "Set-Cookie": buildPremiumAccessCookie(premiumAccessToken, String(env?.NODE_ENV || "").trim().toLowerCase() === "production") },
      });
    },
  },

  "POST /moonstone/spend": {
    auth: "required",
    async handle({ env, ctx, userId, body, withDb }) {
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
      return json({ ok: true, balance: result.balance, replayed: result.replayed });
    },
  },

  "POST /webhook": {
    auth: "none",
    // 🔴 본문을 **원문 그대로** 읽어야 한다. JSON 파싱 후 재직렬화하면 서명이 깨진다.
    rawBody: true,
    async handle({ env, ctx, rawBody, request, withDb }) {
      const outcome = await withDb(env, ctx, async (db) => {
        const accepted = await acceptWebhook(env, db, { rawBody, headers: request.headers });
        ctx.orderId = accepted.paymentId;
        // 중복은 조용히 성공이다 — PortOne 에 재전송을 요구할 이유가 없다.
        if (!accepted.claimed) return { duplicate: true };

        if (accepted.eventType && !/paid/i.test(accepted.eventType)) {
          // 비-Paid 이벤트(실패·취소·부분취소)는 위 applyNonPaidPgEvent 가 구 웹훅 시맨틱을 승계한다.
          // 그 밖의 타입(가상계좌 등 카드 전용 서비스의 미지원 계열)은 받았다는 사실만 남긴다.
          const applied = await applyNonPaidPgEvent(db, { eventType: accepted.eventType, orderId: accepted.paymentId });
          await markEventProcessed(db, { eventId: accepted.eventId });
          return applied;
        }

        try {
          await confirmOrder(env, db, ctx, { orderId: accepted.paymentId });
          await markEventProcessed(db, { eventId: accepted.eventId });
          return { confirmed: true };
        } catch (error) {
          /* 실패를 기록하고 **그대로 올린다.** 200 을 주면 PortOne 이 재전송을 멈춰 그 결제가
             영영 미확정으로 남는다 — PortOne 의 재전송이 우리의 재시도 장치다. */
          await markEventFailed(db, { eventId: accepted.eventId, reason: error?.message });
          throw error;
        }
      });
      return json({ ok: true, ...outcome });
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
 * @param {{ prefix?: string, withDb?: typeof withPaymentDb, legacyShape?: boolean }} [options]
 *   prefix — 마운트 지점. Phase 4 는 /api/payments2 로 섀도 마운트한다.
 *   withDb — 테스트용 주입. 실행기를 갈아끼울 수 있어야 **오류 매핑·로그·응답 계약까지
 *            전 경로를 Mongo 없이** 확인할 수 있다. 그러지 않으면 여기 테스트는
 *            "던지지 않았다" 수준에 머물러 사실상 아무것도 검증하지 못한다.
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
  try {
    const userId = matched.route.auth === "required"
      ? requireUser(await peekAccessTokenUserId(request, env)) // JWT 만 본다 — Mongo 읽기 0회
      : "";
    ctx.userId = userId;

    const rawBody = matched.route.rawBody ? await request.text() : "";
    let body = {};
    if (!matched.route.rawBody && method !== "GET") {
      const text = await request.text();
      if (text.trim()) {
        try { body = JSON.parse(text); } catch { throw paymentError("INVALID_REQUEST", "요청 본문이 올바르지 않습니다."); }
      }
    }

    const response = await matched.route.handle({
      request, env, ctx, userId, body, rawBody, params: matched.params, withDb, legacyShape, legacyEnvelope,
    });
    status = response.status;
    return response;
  } catch (error) {
    const contract = classify(error);
    status = contract.status;
    errorCode = contract.code;
    stage = contract.stage || "";
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
    });
  }
}

/**
 * 🔴 크론 진입점 — V2 자가치유 3종(미지급 재지급 · 30분 PENDING 만료 · 죽은 환불락 해제).
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
    return await withPaymentDb(env, ctx, (db) => runPaymentReconcile(db, {
      grant: (order) => grantOrderEntitlement(db, order).then((granted) => {
        if (!granted) throw paymentError("INTERNAL_ERROR", "entitlement grant failed", { orderId: String(order?.merchantUid || "") });
      }),
    }));
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

export const __paymentsContextTestUtils = { ROUTES, matchRoute, presentOrder, confirmOrder, contractFor };

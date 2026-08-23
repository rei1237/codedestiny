// "이 사용자가 실제로 이용한 상품" 판정.
//
// 🔴 구매 흔적은 한 컬렉션에 모여 있지 않다:
//   - KRW 단건결제 → Payment + ContentEntitlement (PointHistory 행 없음)
//   - 코인 차감     → PointHistory (kind: "deduct")
//   - 이용권 무료   → PointHistory (metadata.accessMethod: PASS/FAMILY)
//   - 회당 결제 실행 → PaidExecutionRecord (가장 정확하지만 per_use만 커버)
// 따라서 4개 소스 union이 불가피하다.
//
// 🔴 paid-feature-access의 canAccessPaidFeature().allowed 를 재사용하면 안 된다 —
// family 이용권 보유자는 한 번도 쓰지 않아도 전부 allowed가 되어 리뷰 게이트가 뚫린다.
// 여기서는 "실제로 이용한 기록이 남았는가"만 본다.

import { mongoose, withMongoRetry } from "./db.js";
import {
  ContentEntitlement,
  PaidExecutionRecord,
  Payment,
  PointHistory,
} from "./models.js";
import {
  resolveReviewProductByContentKey,
  resolveReviewProductByFeatureKey,
} from "./review-product-catalog.js";
import { Review } from "./review-models.js";

const SINGLE_PAYMENT_STATUSES = Object.freeze(["paid", "success", "fulfilled"]);
const PASS_ACCESS_METHODS = new Set(["PASS", "FAMILY", "MONTHLY"]);
const LOOKBACK_LIMIT = 300;

// 구매 인증 배지는 "실제로 돈이 오간 기록이 있다"는 사실 진술이다(review-models.js의 주석).
// 이용권·월정석은 유료 구독이므로 구매에 포함한다.
//
// 🔴 화이트리스트여야 한다. `!sources.includes("free")` 같은 블랙리스트로 쓰면 새 소스가
// 생겼을 때 "구매로 간주"되는 쪽으로 실패한다 — 없는 결제를 있다고 말하는 방향이다.
// 화이트리스트면 등록을 잊었을 때 배지가 안 붙는 쪽으로 실패한다.
const PURCHASE_SOURCES = new Set(["execution", "payment", "coin", "pass", "entitlement"]);

// 리뷰쓰기 모달을 열 때(GET eligibility)와 실제 제출할 때(POST create)가 같은 세션에서
// 수 초~수십 초 안에 같은 userId로 이 함수를 두 번 호출한다. TTL을 짧게 잡아 그 구간만
// 캐시로 흡수한다 — access-state.js와 같은 isolate 재사용 캐시 패턴(무효화 훅은 두지 않고
// 시간 경과로 자연 해소시킨다. handleCreate가 최종적으로 서버에서 다시 검증하므로 정합성엔
// 영향 없다).
const REVIEW_ELIGIBILITY_CACHE_TTL_MS = 25000;
const REVIEW_ELIGIBILITY_CACHE_MAX_ENTRIES = 512;
const cache = globalThis.__codeDestinyReviewEligibilityCache || (globalThis.__codeDestinyReviewEligibilityCache = {
  entries: new Map(),
});

function toText(value) {
  return String(value || "").trim();
}

function toTime(value) {
  const time = value instanceof Date ? value.getTime() : Date.parse(value || "");
  return Number.isFinite(time) ? time : 0;
}

// Payment.userId는 ObjectId, ContentEntitlement/PaidExecutionRecord.userId는 String이다.
// payments.js의 findRecentPaymentsForUser와 같은 방식으로 두 형태를 모두 매칭한다.
function buildPaymentUserIdClause(userId) {
  const normalized = toText(userId);
  if (!mongoose.Types.ObjectId.isValid(normalized)) return null;
  return { $in: [new mongoose.Types.ObjectId(normalized), normalized] };
}

function collect(map, product, { featureKey, orderId, usedAt, source }) {
  if (!product) return;

  const existing = map.get(product.productId);
  const usedTime = toTime(usedAt);

  if (!existing) {
    map.set(product.productId, {
      productId: product.productId,
      productName: product.name,
      href: product.href,
      featureKey: toText(featureKey),
      orderId: toText(orderId),
      usedAt: usedTime ? new Date(usedTime).toISOString() : "",
      sources: [source],
    });
    return;
  }

  if (!existing.sources.includes(source)) existing.sources.push(source);
  // 가장 최근 이용 기록을 대표로 남긴다.
  if (usedTime && usedTime > toTime(existing.usedAt)) {
    existing.usedAt = new Date(usedTime).toISOString();
    if (toText(featureKey)) existing.featureKey = toText(featureKey);
    if (toText(orderId)) existing.orderId = toText(orderId);
  }
}

/**
 * 사용자가 실제로 이용한 리뷰 상품 목록.
 *
 * @returns {Promise<Array<{productId,productName,href,featureKey,orderId,usedAt,sources}>>}
 */
export async function listUsedReviewProducts({ userId, env = {} }) {
  const normalizedUserId = toText(userId);
  if (!normalizedUserId) return [];

  const now = Date.now();
  const cached = cache.entries.get(normalizedUserId);
  if (cached && cached.expiresAt > now) return cached.value.slice();

  const value = await fetchUsedReviewProducts(normalizedUserId, env);
  cache.entries.set(normalizedUserId, { value, expiresAt: now + REVIEW_ELIGIBILITY_CACHE_TTL_MS });
  // 만료 확인이 읽기 경로에만 있어 다시 오지 않는 userId 의 엔트리가 계속 남았다.
  // 쓰기마다 만료분을 걷고, 그래도 넘치면 오래된 것부터 버린다.
  for (const [cachedUserId, entry] of cache.entries) {
    if (entry.expiresAt <= now) cache.entries.delete(cachedUserId);
  }
  while (cache.entries.size > REVIEW_ELIGIBILITY_CACHE_MAX_ENTRIES) {
    const oldestUserId = cache.entries.keys().next().value;
    if (oldestUserId === undefined) break;
    cache.entries.delete(oldestUserId);
  }
  return value.slice();
}

async function fetchUsedReviewProducts(normalizedUserId, env) {
  const paymentUserClause = buildPaymentUserIdClause(normalizedUserId);
  const now = new Date();

  // 4개 소스는 서로 독립이므로 하나가 실패해도 나머지로 판정한다.
  // 각 쿼리는 raw 모델 read라 자체 재시도가 없다 → 여기서 한 번만 감싼다(이중 재시도 금지).
  const [executions, payments, pointHistories, entitlements] = await Promise.allSettled([
    withMongoRetry(env, () => PaidExecutionRecord.find({
      userId: normalizedUserId,
      status: "completed",
    })
      .select("featureId completedAt consumedAt executionId paymentId")
      .sort({ completedAt: -1 })
      .limit(LOOKBACK_LIMIT)
      .lean()),

    paymentUserClause
      ? withMongoRetry(env, () => Payment.find({
        userId: paymentUserClause,
        featureKey: { $nin: ["", null] },
        status: { $in: SINGLE_PAYMENT_STATUSES },
      })
        .select("featureKey createdAt paidAt merchantUid")
        .sort({ createdAt: -1 })
        .limit(LOOKBACK_LIMIT)
        .lean())
      : Promise.resolve([]),

    paymentUserClause
      ? withMongoRetry(env, () => PointHistory.find({
        userId: paymentUserClause,
        featureKey: { $nin: ["", null] },
        kind: "deduct",
      })
        .select("featureKey createdAt metadata merchantUid")
        .sort({ createdAt: -1 })
        .limit(LOOKBACK_LIMIT)
        .lean())
      : Promise.resolve([]),

    withMongoRetry(env, () => ContentEntitlement.find({
      userId: normalizedUserId,
      status: "ACTIVE",
      $or: [
        { expiresAt: null },
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: now } },
      ],
    })
      .select("contentKey serviceKey unlockedAt orderId")
      .sort({ unlockedAt: -1 })
      .limit(LOOKBACK_LIMIT)
      .lean()),
  ]);

  const map = new Map();

  for (const row of executions.status === "fulfilled" ? executions.value || [] : []) {
    collect(map, resolveReviewProductByFeatureKey(row?.featureId), {
      featureKey: row?.featureId,
      orderId: row?.paymentId || row?.executionId,
      usedAt: row?.completedAt || row?.consumedAt,
      source: "execution",
    });
  }

  for (const row of payments.status === "fulfilled" ? payments.value || [] : []) {
    collect(map, resolveReviewProductByFeatureKey(row?.featureKey), {
      featureKey: row?.featureKey,
      orderId: row?.merchantUid,
      usedAt: row?.paidAt || row?.createdAt,
      source: "payment",
    });
  }

  for (const row of pointHistories.status === "fulfilled" ? pointHistories.value || [] : []) {
    // kind:"deduct"는 코인 차감·이용권 무료 통과(delta 0)·월정석 차감을 모두 덮는다
    // (billing.js:1752 pass_access 기록). accessMethod로 어느 쪽인지만 구분한다.
    const accessMethod = toText(row?.metadata?.accessMethod).toUpperCase();

    collect(map, resolveReviewProductByFeatureKey(row?.featureKey), {
      featureKey: row?.featureKey,
      orderId: row?.merchantUid,
      usedAt: row?.createdAt,
      source: accessMethod && PASS_ACCESS_METHODS.has(accessMethod) ? "pass" : "coin",
    });
  }

  for (const row of entitlements.status === "fulfilled" ? entitlements.value || [] : []) {
    collect(map, resolveReviewProductByContentKey(row?.contentKey, row?.serviceKey), {
      featureKey: row?.contentKey,
      orderId: row?.orderId,
      usedAt: row?.unlockedAt,
      source: "entitlement",
    });
  }

  return Array.from(map.values()).sort((a, b) => toTime(b.usedAt) - toTime(a.usedAt));
}

/**
 * 리뷰 작성 화면에 뿌릴 목록. 이미 리뷰를 남긴 상품은 alreadyReviewed로 표시한다.
 */
export async function listReviewableProducts({ userId, env = {} }) {
  const normalizedUserId = toText(userId);
  if (!normalizedUserId) return [];

  const used = await listUsedReviewProducts({ userId: normalizedUserId, env });
  if (!used.length) return [];

  let existing = [];
  try {
    existing = await withMongoRetry(env, () => Review.find({
      userId: normalizedUserId,
      productId: { $in: used.map((item) => item.productId) },
    }).select("productId status").lean());
  } catch {
    // 기존 리뷰 조회 실패는 치명적이지 않다 — 중복은 unique 인덱스가 막는다.
    existing = [];
  }

  const statusByProduct = new Map(
    (Array.isArray(existing) ? existing : []).map((row) => [toText(row?.productId), toText(row?.status)]),
  );

  return used.map((item) => ({
    ...item,
    alreadyReviewed: statusByProduct.has(item.productId),
    existingReviewStatus: statusByProduct.get(item.productId) || "",
  }));
}

/**
 * 이용 기록 하나가 "구매"인지 판정한다.
 *
 * 소스 이름(execution/payment/coin/pass/entitlement)이 이 모듈에서만 정의되므로 판정도
 * 여기 둔다 — 라우트가 소스 이름을 손으로 다시 적으면 목록이 두 벌이 되어 어긋난다.
 *
 * @param {{sources?: string[]}} usage listUsedReviewProducts가 돌려준 항목
 * @returns {{isVerifiedPurchase: boolean, usageSource: "purchase"|""}}
 */
export function resolveUsageVerification(usage) {
  const sources = Array.isArray(usage?.sources) ? usage.sources : [];
  if (sources.some((source) => PURCHASE_SOURCES.has(source))) {
    return { isVerifiedPurchase: true, usageSource: "purchase" };
  }
  return { isVerifiedPurchase: false, usageSource: "" };
}

/**
 * 특정 상품 하나에 대한 이용 여부. 리뷰 작성 POST에서 서버가 재검증할 때 쓴다.
 */
export async function findUsedReviewProduct({ userId, productId, env = {} }) {
  const targetId = toText(productId);
  if (!targetId) return null;

  const used = await listUsedReviewProducts({ userId, env });
  return used.find((item) => item.productId === targetId) || null;
}

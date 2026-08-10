import { getRequestMeta, getRoutePath, handleRouteError, isDbUnavailableError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { handleFortuneRoutes } from "./fortune.js";
import { handlePaymentRoutes } from "./payments.js";
import { getOptionalUserFromRequest, isAuthDbInfraError, peekAccessTokenUserId } from "../lib/auth.js";
import {
  buildPremiumAccessCookie,
  createPremiumAccessToken,
  resolvePremiumAccessReportType,
} from "../lib/premium-access-token.js";
import {
  assertFeatureEnabled,
  getBillingFeaturePricing,
  listBillingFeatures,
} from "../lib/billing-feature-registry.js";
import {
  isUnlockPaidFeatureKey,
} from "../lib/paid-feature-registry.js";
import {
  completeServiceExecution,
  failServiceExecution,
  getServiceExecution,
  heartbeatServiceExecution,
  startServiceExecution,
} from "../lib/service-execution-task.js";
import { connectDb, mongoose, withMongoRetry } from "../lib/db.js";
import { canAccessPaidFeature } from "../lib/paid-feature-access.js";
import {
  CONTENT_ENTITLEMENT_SOURCES,
  CheckoutFunnelEvent,
  MonthlyCreditLedger,
  PaidExecutionRecord,
  Payment,
  PointHistory,
  RECENT_CONSUME_REQUEST_ID_CAP,
  SAJU_LOCKED_CONTENT_KEYS,
  ServiceExecutionTransaction,
  User,
} from "../lib/models.js";
import { calculateKrwAmountFromCoins, calculateMembershipCreditCost, KRW_PER_COIN, MEMBERSHIP_CREDIT_PER_COIN } from "../lib/billing-policy.js";
import { MONTHLY_CREDIT_TTL_MS, applyGrantLot, deductLotsFIFO, ensureLotsForBalance, resolveNextExpiry } from "../lib/monthly-credit-lots.js";
import {
  applyPdfPassDiscountToPricing,
  isPdfFeaturePricing,
} from "../lib/pdf-pass-discount.js";
import {
  findActivePaidContentUnlock,
  formatPermanentUnlockGrant,
  getUnlockedContentSnapshot,
  upsertPaidContentUnlock,
} from "../lib/content-unlocks.js";
import {
  normalizePassTier,
  PASS_LIMITS,
  HONEY_PASS_POLICY,
  resolveActivePassPolicy,
  resolveFamilyPremiumQuota,
  FAMILY_PREMIUM_INCLUDED_USES,
  FAMILY_PREMIUM_MIN_COIN_COST,
} from "../lib/profile-limits.js";
import {
  getProfileCardMutationPolicy,
  PROFILE_CARD_DELETE_COST_MONTHLY_STONES,
  PROFILE_CARD_MUTATION_ACTIONS,
} from "../lib/profile-card-mutation-policy.js";
import { enforceSensitiveEndpointSecurity } from "../lib/security/index.js";
import {
  isPassLikeProductType,
  resolveCanonicalEntitlement,
  resolveFeatureAccessPolicy,
  resolveServerProductType,
} from "../lib/entitlement-policy.js";
import {
  PAYMENT_METHODS,
  createInactiveMembershipPass,
  resolvePaymentCommand,
  runAtomicMonthlyPayment,
  shouldVerifyMembershipPass,
} from "../lib/payment-service.js";
import "../lib/access-state.js";

const ACCESS_DECISION_REASONS = Object.freeze({
  FREE: "free",
  AUTH_REQUIRED: "auth_required",
  ALREADY_UNLOCKED: "already_unlocked",
  SUBSCRIPTION_ACTIVE: "subscription_active",
  INSUFFICIENT_COINS: "insufficient_coins",
  REQUIRES_PURCHASE: "requires_purchase",
});

const SAJU_PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY = Object.freeze({
  section_daewun: SAJU_LOCKED_CONTENT_KEYS.DAEUN_ANALYSIS,
  section_summary: SAJU_LOCKED_CONTENT_KEYS.FULL_READING,
  section_compat: SAJU_LOCKED_CONTENT_KEYS.COMPATIBILITY,
});

const SUKYO_YEARLY_FORTUNE_PRODUCT_KEY = "sukyo_yearly_fortune_unlock";

const ZIWEI_PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY = Object.freeze({
  ziwei_decade_luck: "ziwei.decadeLuck",
  ziwei_love_deep: "ziwei.loveDeep",
  ziwei_twelve_palaces: "ziwei.twelvePalaces",
  ziwei_symbolic_layer: "ziwei.symbolicLayer",
  ziwei_life_yearly_flow: "ziwei.lifeYearlyFlow",
});

const PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY = Object.freeze({
  ...SAJU_PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY,
  ...ZIWEI_PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY,
  [SUKYO_YEARLY_FORTUNE_PRODUCT_KEY]: SUKYO_YEARLY_FORTUNE_PRODUCT_KEY,
  "premium-fpti-report": "fpti.deepReport",
});

const PROFILE_UNLOCK_FEATURE_BY_CONTENT_KEY = Object.freeze(
  Object.fromEntries(
    Object.entries(PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY).map(([featureKey, contentKey]) => [contentKey, featureKey]),
  ),
);

const SAJU_ANALYSIS_ENTITLEMENT_SERVICE_KEYS = Object.freeze(["saju", "ziwei"]);
const SAJU_ANALYSIS_ENTITLEMENT_CONTENT_BY_FEATURE_KEY = Object.freeze({
  ...SAJU_PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY,
  ...ZIWEI_PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY,
});
const SAJU_ANALYSIS_CORE_CONTENT_IDS = Object.freeze(Object.values(SAJU_PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY));
const SAJU_ANALYSIS_ENTITLEMENT_NO_STORE_HEADERS = Object.freeze({
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
});

const ACCESS_METHOD_ORDER = Object.freeze(["pass", "monthly", "one_time"]);
const LOTTO_RITUAL_REPORT_FEATURE_KEY = "fun.quantumLotto.ritualReport";
const PROFILE_CARD_MANAGE_FEATURE_KEY = "profile-card-manage";
const PAID_ACCESS_DECISION_CACHE_TTL_MS = 4000;
const PAID_ACCESS_DECISION_CACHE_MAX_ENTRIES = 2500;
// 🔴 이 값은 속도가 아니라 정확성 장치다. 너무 짧으면 '느림'이 '이용권 미보유'로 세탁된다:
// 이 상한에 걸리면 PASS_STATUS_TEMPORARILY_UNAVAILABLE 이 되고, 정적 셸은 그걸 '결제창 재노출'로
// 처리해 이용권 보유자에게 결제창이 뜬다.
//
// 🔴 4000ms → 12000ms (2026-08-08). 이 상한은 withMongoRetry 의 **안쪽**에 들어간다
// (resolveProfileIdFromDb·resolvePaidContentAccess). 그런데 db.js 는 시도당 상한에 하한
// 11,500ms(serverSelection 8,000 + 쿼리 여유 3,500)를 강제하므로, 4초는 콜드 커넥션의
// 서버선택 창조차 못 기다리고 정상 조회를 잘랐다. 게다가 이 타임아웃이 만드는 에러 메시지
// ("Billing operation timed out after …")는 db.js 의 isTransientMongoError 정규식
// (connection/socket/server selection … timed out)에 걸리지 않아, 감싸고 있는 withMongoRetry 가
// 재시도조차 하지 않는다 — 즉 짧은 값은 완충이 아니라 순수한 503 생성기였다.
// 12초로 두면 드라이버 자체 상한이 먼저 걸리고 이 상수는 backstop 으로 돌아간다.
// 낮추지 말 것: 내려가는 만큼 그대로 이용권 보유자의 503 이 된다.
const PAID_ACCESS_DECISION_DB_TIMEOUT_MS = 12000;
const PAID_PASS_DECISION_DB_TIMEOUT_MS = 10000;
// 이용권 조회가 fortune.js 라우트로 위임할 때의 자체 예산. 위 10초는 위임까지 포함한 전체
// 상한이라, 위임 하나가 느리면 요청 전체가 503(PASS_STATUS_TEMPORARILY_UNAVAILABLE)이 됐다.
// 위임에 별도 상한을 주면 초과 시 위임만 포기하고, 권위 판정(getActiveMembershipPassForUser 가
// 이미 성공적으로 읽은 User 문서)으로 정상 응답한다. 상세는 readSubscriptionStatusSnapshot 참고.
const SUBSCRIPTION_STATUS_DELEGATION_TIMEOUT_MS = 3500;
function billingRateLimitForPath(path = "", method = "GET") {
  if (path === "/coin-gate" || path === "/checkout") return { limit: 20, windowSeconds: 60 };
  if (path === "/confirm") return { limit: 20, windowSeconds: 60 };
  if (path.startsWith("/coin-gate/deferred/") || path.startsWith("/executions/")) return { limit: 15, windowSeconds: 60 };
  if (path === "/access") return method === "GET" ? { limit: 100, windowSeconds: 60 } : { limit: 30, windowSeconds: 60 };
  if (path === "/dev-payment-tester") return { limit: 10, windowSeconds: 10 * 60 };
  return { limit: 60, windowSeconds: 60 };
}

function isBillingSecurityPath(path = "", method = "GET") {
  if (method === "POST") return true;
  return path === "/access";
}

// 🔴 요청 단위 인증 중복 제거(요청 간 캐시가 아니다). 결제 POST 한 건에서 인증 리졸버가 세 번
// 돌았다 — 보안 단계(아래) · requireBillingAuth · readBillingSnapshot 이 각자 같은 User 문서를
// 직렬로 다시 읽었고, Cloudflare 아이들 소켓이 회수된 상태면 그 왕복마다 재핸드셰이크를 냈다.
// 항목은 가장 엄격한 옵션 하나로 고정한다: surfaceDbInfraError:true (DB 장애를 확정 401 로
// 뭉개지 않고 503 으로 표면화하는 기존 의미 유지) + 결제 스냅샷 projection(모든 소비자의 상위집합).
// 보안 단계만 지금처럼 catch 해서 게스트로 진행하고, requireBillingAuth 는 그대로 throw 를 받아
// 기존 503 분기를 탄다 — 에러 의미는 바뀌지 않는다. 권위 있는 인증 조회는 여전히 요청당 정확히 1회다.
const BILLING_REQUEST_AUTH_MEMO = new WeakMap();
function resolveBillingRequestAuth(request, env) {
  const options = { surfaceDbInfraError: true, userProjection: BILLING_SNAPSHOT_USER_PROJECTION };
  if (!request || typeof request !== "object") return getOptionalUserFromRequest(request, env, options);
  const memoized = BILLING_REQUEST_AUTH_MEMO.get(request);
  if (memoized) return memoized;
  const promise = getOptionalUserFromRequest(request, env, options);
  // 첫 소비자가 catch 하기 전에 거부되면 unhandled rejection 이 뜬다 — 분리된 no-op 핸들러를 달아
  // 막되, 반환하는 promise 는 원본 그대로라 각 소비자의 catch/throw 동작은 유지된다.
  promise.catch(() => {});
  BILLING_REQUEST_AUTH_MEMO.set(request, promise);
  return promise;
}

async function enforceBillingRouteSecurity(request, env, path, method) {
  if (!isBillingSecurityPath(path, method)) return { ok: true };
  const auth = await resolveBillingRequestAuth(request, env).catch(() => null);
  const userId = String(auth?.userId || "");
  const meta = getRequestMeta(request);
  return enforceSensitiveEndpointSecurity({
    env,
    request,
    userId,
    endpoint: `billing:${path}`,
    allowedMethods: method === "GET" ? ["GET"] : ["POST"],
    requireJson: method !== "GET",
    rateLimit: billingRateLimitForPath(path, method),
    rateLimitKey: `${userId || meta.ip || "anonymous"}:${path}`,
  });
}

/* 🔴 우리가 **스스로 건** 예산 상한이 던지는 코드. 이름이 전부 withDbAccessTimeout 의 message 인자다.
   예전에는 이 코드들을 "connection"/"timeout"/"network" 같은 일반 단어 목록으로 잡았는데, 그 목록이
   두 가지를 동시에 망가뜨렸다:
     ① Mongo 가 죽지 않고 그냥 느렸을 뿐인 요청이 "DB 장애"로 세탁돼 503 이 됐다(사용자가 겪은 결제 503).
     ② 메시지에 "connection"/"network" 가 우연히 든 **비-DB 코드 버그**까지 재시도 가능 503 으로 위장됐다.
        http.js:185-188 이 바로 그 안티패턴이 며칠간 장애를 가린 사례(guardian ensureGuest)를 기록해 뒀다.
   그래서 자체 예산은 **정확 일치**로만 잡고, 진짜 인프라 장애는 http.js 의 단일 정의를 재사용한다
   (isDbUnavailableError — PERMANENT_MONGO_ERROR_CODES allowlist 까지 포함된 쪽). 판정기를 새로 만들지 않는다. */
const PAID_ACCESS_SELF_BUDGET_CODES = new Set([
  "COIN_GATE_PASS_RESOLVE_TIMEOUT",
  "COIN_GATE_PROFILE_RESOLVE_TIMEOUT",
  "UNLOCK_ACCESS_DECISION_TIMEOUT",
  "UNLOCK_DB_TIMEOUT",
]);

const LEGACY_COIN_PAYMENT_MODES = new Set([
  "coin",
  "coins",
  "coin_credit",
  "coin_payment",
  "pig_coin",
  "pig-coin",
]);

function isExplicitLegacyCoinPaymentMode(value) {
  return LEGACY_COIN_PAYMENT_MODES.has(String(value ?? "").trim().toLowerCase());
}

const paidAccessDecisionCache = globalThis.__paidAccessDecisionCache
  || (globalThis.__paidAccessDecisionCache = {
    entries: new Map(),
    lastPruneAt: 0,
  });

function buildPaidAccessDecisionCacheKey({ userId, profileId, featureKey, coinPrice, requestedPaymentMode, allowPassAutoUnlock }) {
  return [
    String(userId || ""),
    String(profileId || ""),
    String(featureKey || ""),
    Math.max(0, Math.floor(Number(coinPrice || 0))),
    String((requestedPaymentMode || "")).toLowerCase(),
    allowPassAutoUnlock === false ? "0" : "1",
  ].join("|");
}

// 결제/환불 완료 시 해당 유저의 접근 결정 캐시를 즉시 무효화한다(캐시 키 첫 세그먼트가 userId).
// payments.js가 import 순환(billing.js→payments.js) 없이 호출할 수 있도록 캐시 객체에 노출한다.
function invalidatePaidAccessDecisionCacheForUser(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return 0;
  const prefix = `${uid}|`;
  let removed = 0;
  for (const key of paidAccessDecisionCache.entries.keys()) {
    if (key.startsWith(prefix)) {
      paidAccessDecisionCache.entries.delete(key);
      removed += 1;
    }
  }
  // 결제/환불/해금으로 접근결정이 바뀌면 이용권 캐시도 함께 무효화한다(구독 상태 변화 즉시 반영).
  try { globalThis.__membershipPassCache?.invalidateForUser?.(uid); } catch {}
  try { globalThis.__accessStateCache?.invalidateForUser?.(uid); } catch {}
  try { globalThis.__codeDestinyAccessUnlocksCache?.invalidateForUser?.(uid); } catch {}
  return removed;
}
paidAccessDecisionCache.invalidateForUser = invalidatePaidAccessDecisionCacheForUser;

function readPaidAccessDecisionFromCache(cacheKey) {
  if (!cacheKey) return null;
  const now = Date.now();
  const entry = paidAccessDecisionCache.entries.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    paidAccessDecisionCache.entries.delete(cacheKey);
    return null;
  }
  return entry.decision || null;
}

function writePaidAccessDecisionToCache(cacheKey, decision, priceCoin) {
  if (!cacheKey || !decision) return decision;
  const now = Date.now();
  if (paidAccessDecisionCache.lastPruneAt + 2000 < now) {
    paidAccessDecisionCache.lastPruneAt = now;
    for (const [key, entry] of paidAccessDecisionCache.entries.entries()) {
      if (!entry || entry.expiresAt <= now) paidAccessDecisionCache.entries.delete(key);
    }
  }
  if (paidAccessDecisionCache.entries.size > PAID_ACCESS_DECISION_CACHE_MAX_ENTRIES) {
    const earliestKey = paidAccessDecisionCache.entries.keys().next().value;
    if (earliestKey) paidAccessDecisionCache.entries.delete(earliestKey);
  }
  paidAccessDecisionCache.entries.set(cacheKey, {
    decision: decision,
    createdAt: now,
    expiresAt: now + Math.max(1000, Math.floor(PAID_ACCESS_DECISION_CACHE_TTL_MS)),
    priceCoin: Number.isFinite(Number(priceCoin)) ? Math.max(0, Math.floor(Number(priceCoin))) : 0,
  });
  return decision;
}

// ── 결제창 월정석 잔량 표시용 짧은 TTL 캐시 ──────────────────────────────
// /api/billing/balance는 결제창을 열 때마다 Mongo를 신선 조회한다(인증 1회 + User.findById 1회 = 2 왕복,
// 각 ~11.5s 상한). op-timeout 시 즉시 503으로 표면화돼 잔량이 "확인 필요"로 뜬다. 유저별로 healthy 응답을
// 몇 초 캐시해 재개폐/버스트를 collapse한다(paidAccessDecisionCache와 동일 패턴, globalThis 공유).
// 정확성: healthy(authenticated·비degraded)만 저장하고, 결제/환불 시 payments.js가 invalidateForUser로 즉시 무효화한다.
const BILLING_BALANCE_CACHE_TTL_MS = 5000;
const BILLING_BALANCE_CACHE_MAX_ENTRIES = 2500;
const billingBalanceCache = globalThis.__billingBalanceCache
  || (globalThis.__billingBalanceCache = {
    entries: new Map(),
    lastPruneAt: 0,
  });

function invalidateBillingBalanceCacheForUser(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return 0;
  const prefix = `${uid}|`;
  let removed = 0;
  for (const key of billingBalanceCache.entries.keys()) {
    if (key.startsWith(prefix)) {
      billingBalanceCache.entries.delete(key);
      removed += 1;
    }
  }
  try { globalThis.__accessStateCache?.invalidateForUser?.(uid); } catch {}
  return removed;
}
billingBalanceCache.invalidateForUser = invalidateBillingBalanceCacheForUser;

// 이용권(멤버십 패스) 조회는 코인게이트(결제 실행)·언락상태에서 매번 User.findById(콜드 시 ~10s 상한)로 신선 조회됐다.
// 패스는 무료·구독형이라 거래마다 소모되지 않고 상태가 거의 안 바뀌므로, 유저별로 성공 조회를 몇 초 캐시해
// 반복 콜드 조회를 없앤다(billingBalanceCache와 동일 패턴). 결제/환불 시 invalidatePaidAccessDecisionCacheForUser가
// 함께 무효화하고, 실패(op-timeout)는 throw로 전파돼 캐시에 저장되지 않는다(healthy만 저장).
const MEMBERSHIP_PASS_CACHE_TTL_MS = 5000;
const membershipPassCache = globalThis.__membershipPassCache
  || (globalThis.__membershipPassCache = {
    entries: new Map(),
    lastPruneAt: 0,
  });
membershipPassCache.invalidateForUser = function invalidateMembershipPassCacheForUser(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return 0;
  let removed = 0;
  if (membershipPassCache.entries.delete(uid)) removed += 1;
  return removed;
};

function readMembershipPassFromCache(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return null;
  const entry = membershipPassCache.entries.get(uid);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    membershipPassCache.entries.delete(uid);
    return null;
  }
  return entry.value || null;
}

function writeMembershipPassToCache(userId, value) {
  const uid = String(userId || "").trim();
  if (!uid || !value) return;
  const now = Date.now();
  if (membershipPassCache.lastPruneAt + 2000 < now) {
    membershipPassCache.lastPruneAt = now;
    for (const [key, entry] of membershipPassCache.entries.entries()) {
      if (!entry || entry.expiresAt <= now) membershipPassCache.entries.delete(key);
    }
    if (membershipPassCache.entries.size > 2500) {
      const earliest = membershipPassCache.entries.keys().next().value;
      if (earliest) membershipPassCache.entries.delete(earliest);
    }
  }
  membershipPassCache.entries.set(uid, { value, expiresAt: now + MEMBERSHIP_PASS_CACHE_TTL_MS });
}

function readBillingBalanceFromCache(cacheKey) {
  if (!cacheKey) return null;
  const now = Date.now();
  const entry = billingBalanceCache.entries.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    billingBalanceCache.entries.delete(cacheKey);
    return null;
  }
  return entry.snapshot || null;
}

function writeBillingBalanceToCache(cacheKey, snapshot) {
  if (!cacheKey || !snapshot) return snapshot;
  const now = Date.now();
  if (billingBalanceCache.lastPruneAt + 2000 < now) {
    billingBalanceCache.lastPruneAt = now;
    for (const [key, entry] of billingBalanceCache.entries.entries()) {
      if (!entry || entry.expiresAt <= now) billingBalanceCache.entries.delete(key);
    }
  }
  if (billingBalanceCache.entries.size > BILLING_BALANCE_CACHE_MAX_ENTRIES) {
    const earliestKey = billingBalanceCache.entries.keys().next().value;
    if (earliestKey) billingBalanceCache.entries.delete(earliestKey);
  }
  billingBalanceCache.entries.set(cacheKey, {
    snapshot,
    createdAt: now,
    expiresAt: now + Math.max(1000, Math.floor(BILLING_BALANCE_CACHE_TTL_MS)),
  });
  return snapshot;
}

const SAJU_PDF_GENERATION_FEATURE_KEYS = new Set([]);

function resolveSajuProfileUnlockContentKey(featureKey, contentKey = "") {
  const explicitContentKey = String(contentKey || "").trim();
  const normalizedFeatureKey = String(featureKey || "").trim();
  if (
    normalizedFeatureKey === SUKYO_YEARLY_FORTUNE_PRODUCT_KEY
    && (explicitContentKey === SUKYO_YEARLY_FORTUNE_PRODUCT_KEY || explicitContentKey.startsWith(`${SUKYO_YEARLY_FORTUNE_PRODUCT_KEY}:`))
  ) {
    return explicitContentKey;
  }
  if (PROFILE_UNLOCK_FEATURE_BY_CONTENT_KEY[explicitContentKey]) return explicitContentKey;
  return PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY[normalizedFeatureKey] || "";
}

function createUnlockEntitlementSaveError(error) {
  const wrapped = new Error(String(error?.message || "Unlock entitlement save failed."));
  wrapped.code = String(error?.code || "UNLOCK_ENTITLEMENT_SAVE_FAILED");
  wrapped.cause = error;
  return wrapped;
}

async function findActiveSajuProfileUnlock(env, { userId, profileId, featureKey }) {
  await connectDb(env);
  return findActivePaidContentUnlock({ userId, profileId, featureKey });
}

// unlockedFeatures: 이번 요청의 인증 조회가 이미 읽어 온 User.unlockedFeatures.
// 넘어오면 같은 필드를 User.exists 로 다시 묻지 않는다 — 아래 쿼리가 보는 필드와 **완전히 동일**하다
// (BILLING_SNAPSHOT_USER_PROJECTION 에 unlockedFeatures 포함). 판정 근거가 바뀌지 않는 순수 왕복 제거다.
async function hasUserScopedPermanentUnlock(env, { userId, featureKey, unlockedFeatures = null }) {
  const key = String(featureKey || "").trim();
  if (!userId || !key || !isUnlockPaidFeatureKey(key) || resolveSajuProfileUnlockContentKey(key)) {
    return false;
  }
  if (Array.isArray(unlockedFeatures)) {
    return unlockedFeatures.some((entry) => String(entry || "").trim() === key);
  }
  await connectDb(env);
  const row = await User.exists({ _id: userId, unlockedFeatures: key });
  return Boolean(row);
}

async function upsertSajuProfileUnlockEntitlement(env, {
  userId,
  profileId,
  featureKey,
  contentKey = "",
  source,
  orderId = "",
  paymentId = "",
  passId = "",
  coinAmount = 0,
  unlockedAt = null,
  session = null,
}) {
  if (!userId) {
    const error = new Error("User id is required for profile-scoped unlock entitlement.");
    error.code = "INVALID_UNLOCK_TARGET";
    throw error;
  }

  await connectDb(env);
  const normalizedContentKey = resolveSajuProfileUnlockContentKey(featureKey, contentKey);
  if (normalizedContentKey && !profileId) {
    const error = new Error("Profile id is required for profile-scoped unlock entitlement.");
    error.code = "MISSING_PROFILE_ID";
    throw error;
  }
  const entitlement = await upsertPaidContentUnlock({
    userId,
    profileId,
    featureKey,
    contentKey: normalizedContentKey || undefined,
    source,
    orderId,
    paymentId,
    passId,
    coinAmount,
    unlockedAt,
    session,
  }).catch((error) => {
    throw createUnlockEntitlementSaveError(error);
  });
  return {
    ...entitlement,
    unlockGrant: formatPermanentUnlockGrant(entitlement, { featureKey, profileId }),
  };
}

const PASS_EXCLUDED_FEATURE_KEYS = new Set([
  PROFILE_CARD_MANAGE_FEATURE_KEY,
]);

function firstFiniteNonNegativeNumber(values = []) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number) && number >= 0) return Math.floor(number);
  }
  return null;
}

function resolvePricingCoinCost(pricing = {}, fallback = 0) {
  const directCoins = firstFiniteNonNegativeNumber([
    pricing?.coinPrice,
    pricing?.cost,
    pricing?.amountCoins,
    pricing?.priceCoins,
    pricing?.coinCost,
    fallback,
  ]);
  if (directCoins && directCoins > 0) return directCoins;
  const amountKRW = firstFiniteNonNegativeNumber([
    pricing?.amountKRW,
    pricing?.krwAmount,
    pricing?.cashPrice,
    pricing?.paymentAmount,
    pricing?.priceKRW,
  ]);
  if (amountKRW && amountKRW > 0) return Math.ceil(amountKRW / KRW_PER_COIN);
  return 0;
}

function resolvePricingAmountKRW(pricing = {}, coinCost = 0) {
  const amountKRW = firstFiniteNonNegativeNumber([
    pricing?.amountKRW,
    pricing?.krwAmount,
    pricing?.cashPrice,
    pricing?.paymentAmount,
    pricing?.priceKRW,
  ]);
  if (amountKRW && amountKRW > 0) return amountKRW;
  return calculateKrwAmountFromCoins(coinCost);
}

function isPassExcludedPricing(pricing = {}) {
  return PASS_EXCLUDED_FEATURE_KEYS.has(String(pricing?.featureKey || "").trim());
}

function resolvePassPolicyForTier(tierRaw) {
  const tier = normalizePassTier(tierRaw);
  if (!tier) return null;
  return {
    tier,
    maxCoinLimit: Number(PASS_LIMITS[tier] || 0),
  };
}

function buildPassTierMatchValues(tierRaw) {
  const tier = normalizePassTier(tierRaw);
  if (!tier) return [];
  return Array.from(new Set([
    tier,
    `${tier}_1m`,
    `${tier}-1m`,
    `honey_${tier}`,
    `honey-${tier}`,
    `${tier}_pass`,
    `${tier}-pass`,
    `${tier} pass`,
    `${tier} plan`,
    ...(tier === "family" ? [
      "familyplan",
      "familypass",
      "family_plan",
      "family-pass",
      "Code Destiny Family",
      "code destiny family",
      "code-destiny-family",
      "codedestinyfamily",
    ] : []),
  ]));
}

function resolveTierPassUsageSnapshot(profileSubscription = {}, entitlement = {}) {
  const tier = normalizePassTier(
    entitlement?.passTier
      || entitlement?.tier
      || profileSubscription?.passTier
      || profileSubscription?.tier,
  );
  const policy = resolvePassPolicyForTier(tier);
  if (!policy) return null;
  if (policy.tier === "family") {
    return {
      tier: policy.tier,
      passTier: policy.tier,
      maxCoinLimit: policy.maxCoinLimit,
    };
  }
  return {
    tier: policy.tier,
    passTier: policy.tier,
    maxCoinLimit: policy.maxCoinLimit,
  };
}

function resolveActivePassPolicyWithProfileFallback(user = {}) {
  // Compatibility name retained for callers; canonical entitlement policy is
  // authoritative and legacy fields cannot elevate it.
  return resolveCanonicalEntitlement(user || {});
  const entitlement = resolveActivePassPolicy(user || {});
  if (entitlement?.isActive === true) return entitlement;

  const sub = user?.profileSubscription && typeof user.profileSubscription === "object"
    ? user.profileSubscription
    : {};
  const tier = normalizePassTier(
    sub?.passTier
      || sub?.tier
      || sub?.plan
      || sub?.planId
      || sub?.productId
      || user?.passTier
      || user?.subscriptionTier
      || user?.membershipTier,
  );
  const policy = resolvePassPolicyForTier(tier);
  if (!policy) return entitlement;

  const status = String(
    sub?.status
      || sub?.subscriptionStatus
      || sub?.membershipStatus
      || sub?.lastBillingStatus
      || user?.status
      || user?.subscriptionStatus
      || user?.membershipStatus
      || "",
  ).trim().toLowerCase();
  const inactive = ["expired", "canceled", "cancelled", "inactive", "failed", "paused", "refunded"].includes(status);
  const activeStatus = ["active", "paid", "current", "subscribed", "success", "valid", "ok", "complete", "completed", "confirmed", "approved"].includes(status);
  const expiresAt = sub?.expiresAt || user?.expiresAt || null;
  const expiresMs = expiresAt ? new Date(expiresAt).getTime() : NaN;
  const dateActive = expiresAt ? (Number.isFinite(expiresMs) && expiresMs > Date.now()) : false;
  // 이용권은 30일짜리다 — 만료일이 없는 문서는 "무기한 유효"가 아니라 "활성 근거 없음"으로 본다.
  // (과거엔 만료일이 없으면 dateActive=true로 통과시켜, tier만 적힌 문서가 영구 무료 이용권이 됐다.
  //  정본 profile-limits.js의 normalizeHoneyPassEntitlement는 만료일이 없으면 명시적 활성을 요구하는데
  //  이 폴백만 느슨해서 같은 입력에 반대 답을 냈다.)
  // passLimit 폴백에서 policy.maxCoinLimit을 뺀 이유: tier가 풀리면 그 값이 항상 ≥30이라
  // explicitPass가 무조건 true가 돼 activeStatus 검사가 죽은 코드였다.
  const passLimit = Number(sub?.maxCoveredCoin || sub?.passLimit || sub?.freeLimit || 0);
  const explicitPass = tier === "family" ? (dateActive || activeStatus) : (passLimit > 0 || activeStatus);
  if (inactive || !dateActive || !explicitPass) return entitlement;

  const maxCoveredCoin = tier === "family"
    ? Number(PASS_LIMITS.family || passLimit || policy.maxCoinLimit || 0)
    : Number(passLimit || policy.maxCoinLimit || 0);
  return {
    ...(entitlement || {}),
    tier,
    passTier: tier,
    passLabel: tier,
    label: tier,
    isActive: true,
    maxCoveredCoin,
    maxProfiles: tier === "family" ? 0 : Number(entitlement?.maxProfiles || sub?.profileLimit || 1),
    profileLimit: tier === "family" ? 0 : Number(entitlement?.profileLimit || sub?.profileLimit || 1),
    source: entitlement?.source || "profile_subscription_fallback",
    startedAt: sub?.startedAt ? new Date(sub.startedAt).toISOString() : null,
    expiresAt: Number.isFinite(expiresMs) ? new Date(expiresMs).toISOString() : null,
  };
}

async function consumeTierPassIfAvailable(env, authUserId, pricing, requestId, body = {}, options = {}) {
  const featureKey = String(pricing?.featureKey || body?.featureKey || "").trim();
  const normalizedRequestId = String(requestId || "").trim();
  const coinCost = resolvePricingCoinCost(pricing);
  const amountKRW = resolvePricingAmountKRW(pricing, coinCost);
  const profileId = cleanProfileId(options?.profileId || body?.profileId || body?.selectedProfileId);
  const idempotencyMarker = normalizedRequestId && featureKey ? `tier-pass:${featureKey}:${normalizedRequestId}` : "";
  if (!authUserId || !featureKey || !Number.isFinite(coinCost) || coinCost < 0) return { ok: false, reason: "invalid_pass_request" };
  // 프로필 카드 추가/삭제는 tier와 무관하게 이용권으로 결제할 수 없다(단건 결제 또는 월정석만).
  // 무료 판정(family 바이패스 · 계정당 첫 카드)은 '이용권으로 결제'가 아니라 '가격이 0원'이라는 뜻이며,
  // worker/routes/profile.js가 resolveProfileCardActionAccess/getProfileCardMutationPolicy로 판정한다
  // — coin-gate는 profile.js가 402(결제 필요)를 준 뒤에만 열리므로 무료 카드는 여기 도달하지 않는다.
  // (과거엔 이 자리에서 정책을 다시 조회해 무료 통과를 내주면서 tier를 "family"로 하드코딩해,
  //  이용권 없는 유저의 첫 카드가 family_pass 거래로 오기록됐다.)
  if (featureKey === PROFILE_CARD_MANAGE_FEATURE_KEY) {
    return { ok: false, reason: "profile_card_pass_excluded", featureKey, coinCost, amountKRW };
  }
  if (isPassExcludedPricing(pricing)) {
    return { ok: false, reason: "pass_excluded_feature", featureKey, coinCost, amountKRW };
  }

  await connectDb(env);

  // 이용권 확인의 유일한 User 조회. 멱등 마커까지 함께 읽어 재시도 판정을 메모리에서 한다.
  // (과거엔 마커 확인용 findOne을 앞에 한 번 더 돌렸는데, requestId는 난수 폴백이 있어 마커가 사실상
  //  항상 생성되므로 그 탐침은 '첫 호출에선 반드시 miss' = 모든 이용권 확인마다 왕복 1회 낭비였다.
  //  게다가 탐침은 points/profileSubscription만 읽어 자격 리졸버가 보는 9개 소스 중 1개만 본 채 판정해,
  //  레거시 소스 이용권 보유자는 재시도 때 자격을 못 봐 pass_access_conflict로 결제창이 열렸다.
  //  단일 조회로 합치면 왕복이 줄고 두 경로의 자격 판정이 같은 데이터를 쓰게 된다.)
  const user = await User.findById(authUserId)
    .select("points profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt recentConsumeRequestIds")
    .lean();
  const entitlement = resolveActivePassPolicyWithProfileFallback(user || {});
  const usage = resolveTierPassUsageSnapshot(user?.profileSubscription || {}, entitlement);
  const policy = resolvePassPolicyForTier(usage?.tier);

  // 멱등: 이미 이 마커로 통과한 요청이면 재기록 없이 같은 결과를 되돌린다(추가 왕복 없음).
  if (
    idempotencyMarker
    && Array.isArray(user?.recentConsumeRequestIds)
    && user.recentConsumeRequestIds.includes(idempotencyMarker)
    && entitlement?.isActive && usage?.tier && policy
    && (usage.tier === "family" || coinCost <= Number(policy.maxCoinLimit || 0))
  ) {
    return {
      ok: true,
      idempotent: true,
      tier: usage.tier,
      passTier: usage.passTier,
      accessMethod: usage.tier === "family" ? "family" : "pass",
      transactionType: usage.tier === "family" ? "family_pass" : "membership_pass",
      accessType: usage.tier === "family" ? "family" : "membership_pass",
      requestId: normalizedRequestId,
      idempotencyKey: idempotencyMarker,
      featureKey,
      profileId,
      coinCost,
      amountKRW,
      user: {
        id: String(authUserId || ""),
        points: Number(user?.points || 0),
        profileSubscription: user?.profileSubscription || null,
      },
    };
  }
  if (!entitlement?.isActive || !usage || !policy) {
    return { ok: false, reason: "no_active_pass", featureKey, coinCost, amountKRW };
  }
  if (usage.tier !== "family" && (!Number.isFinite(coinCost) || coinCost <= 0 || coinCost > Number(policy.maxCoinLimit || 0))) {
    return {
      ok: false,
      reason: "price_exceeds_pass_limit",
      featureKey,
      coinCost,
      amountKRW,
      passTier: usage.tier,
      passLimit: policy.maxCoinLimit,
    };
  }

  // Family 공정이용: 포함 횟수를 다 썼으면 이용권으로는 통과시키지 않는다.
  // 판정 단계(buildPassPaymentDecision)가 같은 헬퍼로 미리 같은 답을 내므로, 여기 도달할 때는
  // 이미 결제창이 떠 있는 게 정상이다. 그래도 두 단계 사이에 횟수가 소진될 수 있어(동시 요청)
  // 소비 단계에도 둔다 — 이건 이중 방어가 아니라 판정·소비 2단계 구조의 필수 짝이다.
  const familyQuota = resolveFamilyPremiumQuota(user?.profileSubscription || {}, entitlement, coinCost);
  if (familyQuota.applies && familyQuota.exhausted) {
    return {
      ok: false,
      reason: "family_premium_quota_exhausted",
      featureKey,
      coinCost,
      amountKRW,
      passTier: usage.tier,
      familyPremiumIncluded: familyQuota.included,
      familyPremiumUsed: familyQuota.used,
      familyPremiumRemaining: 0,
    };
  }

  if (!requiresMeteredPassWrite(usage.tier)) {
    return {
      ok: true,
      idempotent: false,
      tier: usage.tier,
      passTier: usage.tier,
      accessMethod: "pass",
      transactionType: "membership_pass",
      accessType: "membership_pass",
      requestId: normalizedRequestId,
      idempotencyKey: normalizedRequestId,
      featureKey,
      profileId,
      coinCost,
      amountKRW,
      user: {
        id: String(authUserId || ""),
        points: Number(user?.points || 0),
        profileSubscription: user?.profileSubscription || null,
      },
    };
  }

  const now = new Date();
  const coveredCoinLimit = usage.tier === "family" ? Number(PASS_LIMITS.family || 0) : Number(policy.maxCoinLimit || 0);
  const tierMatchValues = buildPassTierMatchValues(usage.tier);
  const updateQuery = {
    _id: authUserId,
    ...(idempotencyMarker ? { recentConsumeRequestIds: { $ne: idempotencyMarker } } : {}),
    $and: [
      {
        $or: [
          { "profileSubscription.tier": { $in: tierMatchValues } },
          { "profileSubscription.passTier": { $in: tierMatchValues } },
          { "profileSubscription.plan": { $in: tierMatchValues } },
          { "profileSubscription.planId": { $in: tierMatchValues } },
          { "profileSubscription.productId": { $in: tierMatchValues } },
          { passTier: { $in: tierMatchValues } },
          { subscriptionTier: { $in: tierMatchValues } },
          { membershipTier: { $in: tierMatchValues } },
          { tier: { $in: tierMatchValues } },
          { plan: { $in: tierMatchValues } },
          { planId: { $in: tierMatchValues } },
          { productId: { $in: tierMatchValues } },
        ],
      },
      {
        $or: [
          { "profileSubscription.expiresAt": { $gt: now } },
          { "profileSubscription.expiresAt": null },
          { "profileSubscription.expiresAt": { $exists: false } },
          { expiresAt: { $gt: now } },
          { expiresAt: null },
          { expiresAt: { $exists: false } },
        ],
      },
    ],
  };
  const updatedUser = await User.findOneAndUpdate(
    updateQuery,
    [
      {
        $set: {
          "profileSubscription.passTier": usage.tier,
          "profileSubscription.maxCoveredCoin": coveredCoinLimit,
          "profileSubscription.freeLimit": coveredCoinLimit,
          "profileSubscription.passLimit": coveredCoinLimit,
          "profileSubscription.updatedAt": now,
          // Family 프리미엄 포함 횟수 차감. 이미 도는 파이프라인 안에서 함께 증가시키므로
          // 쓰기가 늘지 않고, 통과와 차감이 한 번의 원자적 write 로 묶인다.
          // 사이클 키가 다르면(=새 이용권) 1부터 다시 센다.
          ...(familyQuota.applies ? {
            "profileSubscription.premiumUseCycleKey": familyQuota.cycleKey,
            "profileSubscription.premiumUseCount": {
              $cond: [
                { $eq: [{ $ifNull: ["$profileSubscription.premiumUseCycleKey", ""] }, familyQuota.cycleKey] },
                { $add: [{ $ifNull: ["$profileSubscription.premiumUseCount", 0] }, 1] },
                1,
              ],
            },
          } : {}),
          // 파이프라인 업데이트라 $push/$slice 연산자를 못 쓴다 → 집계 표현식으로 append + 상한.
          // $setUnion이 아니라 $concatArrays인 이유: $setUnion은 집합 연산이라 순서를 보장하지 않아
          // $slice(-N)과 조합하면 '최근 N개'가 아니라 '정렬 후 뒤 N개'가 남아 마커 의미가 붕괴한다.
          // 중복은 위 updateQuery의 `$ne: idempotencyMarker` 가드가 막는다(마커가 있으면 문서 자체가
          // 매치되지 않아 write가 일어나지 않음) — $setUnion의 dedup은 애초에 불필요한 이중장치였다.
          ...(idempotencyMarker ? {
            recentConsumeRequestIds: {
              $slice: [
                {
                  $concatArrays: [
                    { $ifNull: ["$recentConsumeRequestIds", []] },
                    [idempotencyMarker],
                  ],
                },
                -RECENT_CONSUME_REQUEST_ID_CAP,
              ],
            },
          } : {}),
        },
      },
    ],
    {
      updatePipeline: true,
      returnDocument: "after",
      projection: { points: 1, profileSubscription: 1 },
    },
  ).lean();

  if (!updatedUser) {
    return { ok: false, reason: "pass_access_conflict", featureKey, coinCost, amountKRW, passTier: usage.tier };
  }

  return {
    ok: true,
    tier: usage.tier,
    passTier: usage.tier,
    accessMethod: usage.tier === "family" ? "family" : "pass",
    transactionType: usage.tier === "family" ? "family_pass" : "membership_pass",
    accessType: usage.tier === "family" ? "family" : "membership_pass",
    requestId: normalizedRequestId,
    idempotencyKey: idempotencyMarker || normalizedRequestId,
    featureKey,
    profileId,
    coinCost,
    amountKRW,
    user: {
      id: String(authUserId || ""),
      points: Number(updatedUser?.points || 0),
      profileSubscription: updatedUser?.profileSubscription || null,
    },
  };
}

function isActiveMembership(profileSubscription = {}) {
  return resolveActivePassPolicyWithProfileFallback({ profileSubscription }).isActive;
}

function buildPassPaymentDecision(entitlement = {}, pricing = {}, profileSubscription = {}, overrides = {}) {
  const activeEntitlement = resolveActivePassPolicyWithProfileFallback({ profileSubscription, ...(entitlement || {}) });
  const coinCost = resolvePricingCoinCost(pricing);
  const passLimitValue = Number(activeEntitlement?.maxCoveredCoin || 0);
  // 결제창 초기 월정석 잔량은 /balance·/unlock-status와 동일하게 lot 정본(미만료 lot 합계)에서 계산한다.
  // 원시 스칼라 캐시(membershipCreditBalance)는 만료 미반영으로 stale/오차가 있어 직접 쓰지 않는다.
  // overrides.monthlyBalance가 명시되면 그대로 우선(호출부가 이미 계산해 넘긴 경우).
  const lotDerivedMonthlyBalance = ensureLotsForBalance(profileSubscription || {}, Date.now()).balance;
  const monthlyBalance = Math.max(0, Math.floor(Number(
    overrides.monthlyBalance ?? lotDerivedMonthlyBalance ?? 0,
  )));
  const membershipCreditCost = Math.max(0, Math.floor(Number(
    pricing?.membershipCreditCost || calculateMembershipCreditCost(coinCost),
  )));
  const hasActivePass = activeEntitlement?.isActive === true;
  const passTier = hasActivePass ? normalizePassTier(activeEntitlement?.passTier || activeEntitlement?.tier) : null;
  // 이용권 제외 기능(프로필 카드 추가/삭제)은 tier와 무관하게 이용권으로 결제할 수 없다.
  // featureKey별 예외 분기를 두지 말 것 — 과거 `&& !isProfileCardManage`로 제외를 되풀어, 프로필 카드가
  // premium/vvip에게 PASS_COVERED + 결제수단 전부 숨김으로 뜬 뒤 소비 단계에서 거부되는 막다른 길이 됐다.
  // 제외 여부의 정본은 isPassExcludedPricing(=PASS_EXCLUDED_FEATURE_KEYS)뿐이다.
  const targetProductType = resolveServerProductType({
    pricing,
    paymentType: pricing?.paymentType,
    serverProductType: pricing?.productType,
    productId: pricing?.productId || pricing?.featureKey,
  });
  const passExcluded = isPassExcludedPricing(pricing) || isPassLikeProductType(targetProductType);
  // Family 공정이용: 프리미엄 상담(300코인 이상)은 이용권 기간당 포함 횟수까지만 커버한다.
  // 소비 단계(consumeTierPassIfAvailable)와 반드시 같은 답을 내야 한다 — 여기서 커버라 해놓고
  // 소비가 거부하면 결제수단이 전부 숨겨진 막다른 길이 된다(바로 위 프로필 카드 사고와 같은 형태).
  const familyPremiumQuota = resolveFamilyPremiumQuota(profileSubscription, activeEntitlement, coinCost);
  const familyQuotaExhausted = familyPremiumQuota.applies && familyPremiumQuota.exhausted;
  const featureAccess = resolveFeatureAccessPolicy({
    user: {
      profileSubscription: {
        ...(profileSubscription || {}),
        ...(activeEntitlement || {}),
      },
    },
    pricing,
    coinCost,
    passExcluded,
  });
  const passCovered = featureAccess.allowed && !familyQuotaExhausted;
  const monthlyCovered = coinCost > 0 && membershipCreditCost > 0 && monthlyBalance >= membershipCreditCost;
  // 월정석은 잔량과 무관히 단건결제와 항상 동등 노출한다(부족 시 클라이언트가 비활성 처리).
  // 커버 여부는 canUseByMonthly 플래그로만 전달하고, 목록에서 제거하지 않는다.
  const equalPriorityPaidMethods = ["DIRECT_KRW", "MOONLIGHT_STONE"];

  return {
    coinCost,
    hasActivePass,
    passTier,
    // 🔴 클라이언트 스냅샷(cd_subscription_snapshot_v2)의 유효기간 근거. 이 값이 없으면 스냅샷은
    // "만료일을 모르는 active" 로 저장돼 5분 뒤 폐기되고, 이용권 보유자가 매번 서버 왕복을 다시 탄다.
    // activeEntitlement 는 위에서 이미 계산돼 있어 DB 왕복이 늘지 않는다.
    expiresAt: hasActivePass ? (activeEntitlement?.expiresAt || null) : null,
    passLimit: hasActivePass && passLimitValue > 0 ? passLimitValue : null,
    passLimitKRW: hasActivePass && passLimitValue > 0 ? calculateKrwAmountFromCoins(passLimitValue) : null,
    amountKRW: resolvePricingAmountKRW(pricing, coinCost),
    canUseByPass: passCovered,
    monthlyBalance,
    canUseByMonthly: monthlyCovered,
    canUseByCard: true,
    recommendedMethod: passCovered ? "PASS" : "PAYMENT_CHOICE",
    recommendedMethods: passCovered ? ["PASS"] : equalPriorityPaidMethods,
    equalPriorityMethods: passCovered ? [] : equalPriorityPaidMethods,
    paymentPriority: passCovered ? "PASS_FIRST" : "USER_CHOICE_EQUAL",
    hiddenMethods: passCovered ? ["DIRECT_KRW", "MOONLIGHT_STONE", "COIN"] : [],
    // 포함 횟수를 다 쓴 경우에도 결제수단은 그대로 동등 노출된다(위 equalPriorityPaidMethods).
    // 클라이언트가 "이용권이 없어서"가 아니라 "포함 횟수를 다 써서"라고 안내할 수 있도록
    // 사유와 잔여 횟수를 함께 내린다.
    ...(familyPremiumQuota.applies ? {
      familyPremiumIncluded: familyPremiumQuota.included,
      familyPremiumUsed: familyPremiumQuota.used,
      familyPremiumRemaining: familyPremiumQuota.remaining,
    } : {}),
    decisionReason: passCovered
      ? "PASS_COVERED"
      : (passExcluded
        ? "PASS_EXCLUDED_PAYMENT_REQUIRED"
        : (familyQuotaExhausted
          ? "FAMILY_PREMIUM_QUOTA_EXHAUSTED"
          : (hasActivePass && passLimitValue > 0 && coinCost > passLimitValue ? "PRICE_EXCEEDS_PASS_LIMIT" : "PAYMENT_REQUIRED"))),
    ...(pricing?.passDiscount ? { passDiscount: pricing.passDiscount } : {}),
  };
}

function toAccessGateLicenseTier(value) {
  const tier = normalizePassTier(value);
  return tier ? String(tier).toUpperCase() : "";
}

function buildLicensePassAccessGateResult({
  pricing = {},
  paymentOptions = {},
  membershipPass = {},
  accessDecision = {},
} = {}) {
  const featureKey = String(pricing?.featureKey || "").trim();
  const licenseTier = toAccessGateLicenseTier(
    paymentOptions?.passTier
      || membershipPass?.passTier
      || membershipPass?.tier
      || accessDecision?.membershipPass?.passTier
      || accessDecision?.membershipPass?.tier,
  );
  if (!licenseTier) return null;
  if (featureKey === PROFILE_CARD_MANAGE_FEATURE_KEY && licenseTier !== "FAMILY") return null;
  const coveredCoinPrice = resolvePricingCoinCost(pricing, paymentOptions?.coinCost || accessDecision?.priceCoin || 0);
  return {
    status: "license_passed",
    licenseTier,
    coveredCoinPrice,
    contentTitle: String(pricing?.reason || pricing?.categoryLabel || pricing?.featureKey || "").trim() || undefined,
    reason: licenseTier === "FAMILY" ? "family_all_access" : "license_coin_limit",
  };
}

function buildPaidContentAccessDecision({
  accessGranted = false,
  reason = "payment_required",
  shouldOpenPaymentSelector = false,
  availableMethods = ACCESS_METHOD_ORDER,
  unlockId = "",
  priceCoin = 0,
  paymentOptions = null,
  accessGateResult = null,
} = {}) {
  return {
    accessGranted: Boolean(accessGranted),
    reason,
    shouldOpenPaymentSelector: reason === "payment_required" ? Boolean(shouldOpenPaymentSelector) : false,
    availableMethods: Array.isArray(availableMethods) ? availableMethods : [...ACCESS_METHOD_ORDER],
    ...(unlockId ? { unlockId: String(unlockId) } : {}),
    priceCoin: Math.max(0, Math.floor(Number(priceCoin || 0))),
    ...(paymentOptions ? { paymentOptions } : {}),
    ...(accessGateResult ? { accessGateResult } : {}),
  };
}

function buildTemporaryUnavailableAccessDecision(pricing, profileSubscription = null, extras = {}) {
  return {
    ...buildPaidContentAccessDecision({
      reason: "temporary_unavailable",
      priceCoin: resolvePricingCoinCost(pricing),
      paymentOptions: buildPassPaymentDecisionFallback(pricing, profileSubscription || {
        membershipCreditBalance: 0,
      }),
    }),
    degraded: true,
    temporaryUnavailable: true,
    scope: String(extras?.scope || "").trim() || undefined,
    errorCode: String(extras?.errorCode || "PASS_STATUS_TEMPORARILY_UNAVAILABLE").trim(),
    errorDetails: extras?.errorDetails || null,
    // 503 계층 라벨. 응답 본문이 아니라 헤더로 나가므로 여기서 끝까지 실어 나른다.
    cause: String(extras?.cause || "").trim() || undefined,
  };
}

function isTemporaryUnavailableAccessDecision(decision) {
  return Boolean(decision?.temporaryUnavailable) || String(decision?.reason || "").trim().toLowerCase() === "temporary_unavailable";
}

function createPassLookupUnavailableMarker(scope, error) {
  return {
    __passLookupUnavailable: true,
    scope: String(scope || "").trim() || "unknown",
    error: error || null,
  };
}

function isPassLookupUnavailableMarker(value) {
  return Boolean(value && typeof value === "object" && value.__passLookupUnavailable === true);
}

function buildPassStatusTemporarilyUnavailableFailure(pricing, options = {}) {
  const profileSubscription = options?.profileSubscription && typeof options.profileSubscription === "object"
    ? options.profileSubscription
    : null;
  const paymentOptions = options?.paymentOptions && typeof options.paymentOptions === "object"
    ? options.paymentOptions
    : buildPassPaymentDecisionFallback(pricing, profileSubscription);
  const detail = {
    pricing,
    reason: "temporary_unavailable",
    degraded: true,
    paymentOptions,
    accessGrant: null,
    balance: null,
    ...(options?.profileId ? { profileId: options.profileId } : {}),
    ...(options?.scope ? { scope: options.scope } : {}),
  };
  return failure(
    503,
    "PASS_STATUS_TEMPORARILY_UNAVAILABLE",
    "이용권 상태를 일시적으로 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    undefined,
    detail,
    options?.errorDetails || null,
    paidAccessRetryableHeaders(options?.cause),
  );
}

function resolveProfileCardActionType(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text.includes("update") || text.includes("edit") || text.includes("modify")) return PROFILE_CARD_MUTATION_ACTIONS.UPDATE;
  if (text.includes("delete") || text.includes("remove")) return PROFILE_CARD_MUTATION_ACTIONS.DELETE;
  if (
    text === PROFILE_CARD_MUTATION_ACTIONS.CREATE
    || text.includes("create")
    || text.includes("add")
    || text.includes("extra")
    || text.includes("profile_card_add_extra")
  ) return PROFILE_CARD_MUTATION_ACTIONS.CREATE;
  return "";
}

function buildProfileCardMutationMetadata(body = {}) {
  const actionType = resolveProfileCardActionType(body?.actionType || body?.profileAction || body?.action);
  if (actionType === PROFILE_CARD_MUTATION_ACTIONS.CREATE) {
    return {
      actionType: "profile_card_add_extra",
      profileAction: PROFILE_CARD_MUTATION_ACTIONS.CREATE,
      action: PROFILE_CARD_MUTATION_ACTIONS.CREATE,
    };
  }
  if (actionType === PROFILE_CARD_MUTATION_ACTIONS.UPDATE) {
    return {
      actionType: "profile_card_update",
      profileAction: PROFILE_CARD_MUTATION_ACTIONS.UPDATE,
      action: PROFILE_CARD_MUTATION_ACTIONS.UPDATE,
    };
  }
  if (actionType !== PROFILE_CARD_MUTATION_ACTIONS.DELETE) return {};
  return {
    actionType: "profile_card_delete",
    profileAction: PROFILE_CARD_MUTATION_ACTIONS.DELETE,
    action: PROFILE_CARD_MUTATION_ACTIONS.DELETE,
  };
}

function resolveMonthlyCreditCostForBilling(pricing, body = {}) {
  const coinPrice = resolvePricingCoinCost(pricing, resolvePricingCoinCost(body));
  const featureKey = String(pricing?.featureKey || body?.featureKey || "").trim();
  const actionType = resolveProfileCardActionType(body?.actionType || body?.profileAction || body?.action);
  if (
    featureKey === PROFILE_CARD_MANAGE_FEATURE_KEY
    && (
      actionType === PROFILE_CARD_MUTATION_ACTIONS.CREATE
      || actionType === PROFILE_CARD_MUTATION_ACTIONS.UPDATE
      || actionType === PROFILE_CARD_MUTATION_ACTIONS.DELETE
    )
  ) {
    return Math.max(0, Math.floor(Number(PROFILE_CARD_DELETE_COST_MONTHLY_STONES || 0)));
  }
  return calculateMembershipCreditCost(coinPrice);
}

async function assertProfileCardPassPolicyIfNeeded({ userId, profileId, pricing, body = {} }) {
  const featureKey = String(pricing?.featureKey || body?.featureKey || "").trim();
  if (featureKey !== PROFILE_CARD_MANAGE_FEATURE_KEY) return { ok: true, policy: null };
  const actionType = resolveProfileCardActionType(body?.actionType || body?.profileAction || body?.action);
  const policy = await getProfileCardMutationPolicy(userId, profileId, actionType);
  if (policy?.allowed === true && policy?.requiresPayment !== true) return { ok: true, policy };
  const reason = String(policy?.reason || "").trim() || "PROFILE_LIMIT_EXCEEDED";
  return {
    ok: false,
    policy,
    reason: reason === "PRICE_EXCEEDS_PASS_LIMIT" ? "price_exceeds_pass_limit" : "profile_limit_exceeded",
  };
}

async function resolvePaidContentAccess(env, {
  userId,
  profileId,
  pricing,
  requestId = "",
  requestedPaymentMode = "",
  allowPassAutoUnlock = true,
  subscriptionPass = null,
  // 호출자가 이번 요청에서 이미 읽은 User.unlockedFeatures. 있으면 같은 필드를 다시 조회하지 않는다.
  accountUnlockedFeatures = null,
  body = {},
} = {}) {
  const priceCoin = resolvePricingCoinCost(pricing);
  const featureKey = String(pricing?.featureKey || "").trim();
  const cacheKey = buildPaidAccessDecisionCacheKey({
    userId,
    profileId,
    featureKey,
    coinPrice: priceCoin,
    requestedPaymentMode,
    allowPassAutoUnlock,
  });
  const cachedAccessDecision = readPaidAccessDecisionFromCache(cacheKey);
  if (cachedAccessDecision) return cachedAccessDecision;

  if (!userId) {
    return buildPaidContentAccessDecision({
      reason: "not_logged_in",
      priceCoin,
    });
  }

  if (resolveSajuProfileUnlockContentKey(featureKey) && !profileId) {
    return buildPaidContentAccessDecision({
      reason: "invalid_profile",
      priceCoin,
    });
  }

  try {
    // 결제 게이팅의 핵심 판정(이미 해금됐는지·이용권이 커버하는지). 일시적 풀 초기화에도
    // '일시 불가'로 떨어지지 않고 정확히 판정하도록 재시도로 감싼다(타임아웃 degrade는 유지).
    const [existingUnlock, userPermanentUnlock, existingPass] = await withMongoRetry(env, () => withDbAccessTimeout(Promise.all([
      findActiveSajuProfileUnlock(env, { userId, profileId, featureKey }),
      hasUserScopedPermanentUnlock(env, { userId, featureKey, unlockedFeatures: accountUnlockedFeatures }),
      Promise.resolve(subscriptionPass || getActiveMembershipPassForUser(env, userId)),
    ]), PAID_ACCESS_DECISION_DB_TIMEOUT_MS, "UNLOCK_ACCESS_DECISION_TIMEOUT"));
    if (existingUnlock || userPermanentUnlock) {
      return writePaidAccessDecisionToCache(cacheKey, buildPaidContentAccessDecision({
        accessGranted: true,
        reason: "already_unlocked",
        unlockId: String(existingUnlock?._id || `user:${featureKey}`),
        priceCoin,
      }), priceCoin);
    }

    const activePass = existingPass || {
      isActive: false,
      tier: "free",
      passTier: null,
      freeLimit: 0,
      profileSubscription: null,
      entitlement: {},
    };
    const paymentOptions = buildPassPaymentDecision(
      activePass.entitlement,
      pricing,
      activePass.profileSubscription,
    );
    const normalizedPaymentMode = String(requestedPaymentMode || "").trim().toLowerCase();

    if (normalizedPaymentMode.includes("monthly") && !paymentOptions.canUseByMonthly) {
      return writePaidAccessDecisionToCache(cacheKey, buildPaidContentAccessDecision({
        reason: "monthly_balance_required",
        priceCoin,
        paymentOptions,
      }), priceCoin);
    }

    if (paymentOptions.canUseByPass && allowPassAutoUnlock) {
      const profilePolicy = await assertProfileCardPassPolicyIfNeeded({ userId, profileId, pricing, body });
      if (!profilePolicy.ok) {
        return writePaidAccessDecisionToCache(cacheKey, buildPaidContentAccessDecision({
          reason: profilePolicy.reason,
          priceCoin,
          paymentOptions: {
            ...paymentOptions,
            profilePolicy: profilePolicy.policy || null,
          },
        }), priceCoin);
      }
      return writePaidAccessDecisionToCache(cacheKey, buildPaidContentAccessDecision({
        accessGranted: true,
        reason: "pass_covered",
        shouldOpenPaymentSelector: false,
        priceCoin,
        paymentOptions,
        accessGateResult: buildLicensePassAccessGateResult({
          pricing,
          paymentOptions,
          membershipPass: activePass,
        }),
      }), priceCoin);
    }

    return writePaidAccessDecisionToCache(cacheKey, buildPaidContentAccessDecision({
      reason: "payment_required",
      shouldOpenPaymentSelector: true,
      priceCoin,
      paymentOptions,
    }), priceCoin);
  } catch (error) {
    if (String(error?.code || "") === "MISSING_PROFILE_ID") {
      return buildPaidContentAccessDecision({
        reason: "invalid_profile",
        priceCoin,
      });
    }

    // DB 일시장애·접근판정 타임아웃(UNLOCK_ACCESS_DECISION_TIMEOUT)·기타 예기치 못한 오류는 모두
    // '일시 불가'로 degrade한다. 과거엔 비-DB 오류가 reason:"error"→payment_required 로 떨어져,
    // 이미 해금/이용권 보유한 사용자가 일시적 오류에 결제창을 다시 보거나 해금이 풀렸다(간헐 재잠금).
    // temporary_unavailable 은 클라가 last-known(해금 유지)로 처리하므로 오탐 재잠금을 막는다.
    return buildTemporaryUnavailableAccessDecision(pricing, null, {
      scope: "resolve_paid_content_access",
      cause: paidAccessErrorStage(error),
      errorDetails: buildBillingErrorDetails("resolve-paid-content-access", error, {
        featureKey,
        requestId,
        profileId,
      }),
    });
  }
}

// authUserDoc: 이번 요청의 인증 조회가 이미 읽어 온 User 문서(resolveBillingRequestAuth 경유).
// 넘어오면 같은 문서를 다시 읽지 않는다 — 방금 읽은 값이라 캐시보다 신선하므로 __userDocFresh 도 true 다.
// (이것이 없으면 캐시 히트가 __userDocFresh:false 를 반환해 오히려 프로필 id 조회 왕복을 추가로 유발했다.)
async function getActiveMembershipPassForUser(env, authUserId, authUserDoc = null) {
  if (!authUserDoc) {
    const cached = readMembershipPassFromCache(authUserId);
    // 캐시 히트는 최대 5초 stale 이라 프로필 id 재사용 근거로 쓰지 않는다(프로필 전환 직후 오기록 방지).
    if (cached) return { ...cached, __userDocFresh: false };
  }
  let user = authUserDoc;
  if (!user) {
    // 🔴 이 읽기를 withMongoRetry 로 감싸지 말 것. 이 함수는 resolvePaidContentAccess 의
    // withMongoRetry 콜백 안에서도 불리므로(billing.js 의 unlock/pass 병렬 조회) 여기 감싸면
    // 그쪽이 즉시 중첩이 된다 — verify:no-nested-retry 가 잡는다.
    // 인증이 문서를 붙여 주는 경로(access token·refresh 폴백)에서는 애초에 여기 오지 않고,
    // 오는 경우의 일시 실패는 호출부의 createPassLookupUnavailableMarker degrade 가 받는다.
    await connectDb(env);
    user = await User.findById(authUserId)
      .select("destinyProfilesCurrentId profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt")
      .lean();
  }
  const entitlement = resolveActivePassPolicyWithProfileFallback(user || {});
  const result = {
    isActive: entitlement.isActive,
    tier: entitlement.isActive ? entitlement.tier : "free",
    passTier: entitlement.isActive ? entitlement.passTier : null,
    freeLimit: entitlement.isActive ? Number(entitlement.maxCoveredCoin || 0) : 0,
    profileSubscription: user?.profileSubscription || null,
    entitlement,
    // 이 조회가 성공했다는 사실 자체가 판정 근거다. "구독 신호가 전혀 없음"을 여기서 확정해 두면
    // 아래 getMembershipPassForBillingRequest 가 같은 User 를 다시 읽는 스냅샷 경로를 건너뛸 수 있다.
    // 🔴 조회 실패는 throw 로 전파되고 캐시는 성공만 기록하므로(아래 writeMembershipPassToCache),
    // 이 플래그가 "확인 실패"를 "미보유"로 세탁할 수 없다.
    hasSubscriptionSignal: hasResolvableSubscriptionSignal(user),
    // 같은 User 문서에서 함께 읽어 둔다 — coin-gate 가 프로필 id 를 위해 같은 문서를 또 읽던 중복을 없앤다.
    destinyProfilesCurrentId: user?.destinyProfilesCurrentId || null,
    __userDocFresh: true,
  };
  writeMembershipPassToCache(authUserId, result); // healthy 조회만 캐시(실패는 위에서 throw로 전파)
  return result;
}

function buildMembershipPassFromStatusSnapshot(snapshot = {}) {
  const subscription = snapshot?.subscription && typeof snapshot.subscription === "object" ? snapshot.subscription : {};
  const rawStatus = String(
    snapshot?.status
    || snapshot?.subscriptionStatus
    || snapshot?.membershipStatus
    || subscription?.status
    || subscription?.subscriptionStatus
    || subscription?.membershipStatus
    || "",
  ).trim().toLowerCase();
  const inactiveStatus = rawStatus === "expired"
    || rawStatus === "canceled"
    || rawStatus === "cancelled"
    || rawStatus === "inactive"
    || rawStatus === "failed"
    || rawStatus === "paused"
    || rawStatus === "refunded";
  const activeStatus = rawStatus === "active"
    || rawStatus === "paid"
    || rawStatus === "current"
    || rawStatus === "subscribed"
    || rawStatus === "trialing"
    || rawStatus === "success"
    || rawStatus === "registered"
    || rawStatus === "registering"
    || rawStatus === "pending"
    || rawStatus === "processing"
    || rawStatus === "enrolled"
    || rawStatus === "enabled"
    || rawStatus === "valid"
    || rawStatus === "ok"
    || rawStatus === "complete"
    || rawStatus === "completed"
    || rawStatus === "confirmed"
    || rawStatus === "approved"
    || rawStatus === "\uB4F1\uB85D\uC911"
    || rawStatus === "\uC774\uC6A9\uC911"
    || rawStatus === "\uC720\uD6A8"
    || rawStatus === "\uC644\uB8CC";
  const expiresAtRaw = snapshot?.expiresAt || subscription?.expiresAt || null;
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
  const expiresAtValid = expiresAt && Number.isFinite(expiresAt.getTime());
  const expiredByDate = Boolean(expiresAtRaw) && (!expiresAtValid || expiresAt.getTime() <= Date.now());
  const isSnapshotActive = !inactiveStatus && !expiredByDate && (
    snapshot?.isActive === true
      || snapshot?.isSubscribed === true
      || snapshot?.active === true
      || snapshot?.enabled === true
      || snapshot?.valid === true
      || snapshot?.registered === true
      || activeStatus
      || Boolean(expiresAtValid && expiresAt.getTime() > Date.now())
  );
  if (!isSnapshotActive) return null;
  const tier = String(
    snapshot?.tier
    || snapshot?.plan
    || snapshot?.planId
    || snapshot?.productId
    || snapshot?.subscriptionTier
    || snapshot?.membershipTier
    || snapshot?.passTier
    || subscription?.tier
    || subscription?.plan
    || subscription?.planId
    || subscription?.productId
    || subscription?.subscriptionTier
    || subscription?.membershipTier
    || subscription?.passTier
    || "free",
  ).trim().toLowerCase();
  if (!tier || tier === "free") return null;
  const profileSubscription = {
    ...subscription,
    tier,
    passTier: snapshot?.passTier || subscription?.passTier || tier,
    isActive: true,
    isSubscribed: true,
    status: rawStatus || "active",
    expiresAt: expiresAtValid ? expiresAt.toISOString() : null,
    freeLimit: Number(snapshot?.freeLimit || subscription?.freeLimit || 0),
    source: snapshot?.source || subscription?.source || "subscription_status_snapshot",
  };
  const entitlement = resolveActivePassPolicyWithProfileFallback({ profileSubscription });
  if (!entitlement.isActive) return null;
  return {
    isActive: true,
    tier: entitlement.tier,
    passTier: entitlement.passTier,
    freeLimit: Number(entitlement.maxCoveredCoin || 0),
    passLimit: Number(entitlement.maxCoveredCoin || 0),
    maxCoveredCoin: Number(entitlement.maxCoveredCoin || 0),
    profileSubscription,
    entitlement,
  };
}

async function getMembershipPassForBillingRequest(request, env, authUserId, authUserDoc = null) {
  const directPass = await getActiveMembershipPassForUser(env, authUserId, authUserDoc);
  if (directPass?.isActive === true) return directPass;
  // 🔴 왕복 2회 절감: readSubscriptionStatusSnapshot 은 getOptionalUserFromRequest(인증 읽기) +
  // User.findById(위와 **완전히 동일한 projection**)를 다시 한다. 위 조회가 성공했고 구독 신호가
  // 전혀 없다면 스냅샷이 새로 알아낼 것이 없다 — 그 두 왕복을 건너뛴다.
  // 이용권 미보유자가 다수이고 이 경로가 coin-gate(결제창 직전) 임계경로라 체감이 가장 크다.
  // "확인 실패"는 위에서 throw 로 전파되므로 여기 도달하지 않는다(= degraded 처리 경로 그대로 유지).
  if (directPass?.hasSubscriptionSignal === false) return directPass;
  // 🔴 신호가 있어 스냅샷 위임이 필요한 경우에도, 위 조회가 방금 읽은 그 문서를 넘겨
  // 스냅샷이 하던 인증 왕복 + User.findById 를 없앤다(직렬 3왕복 → 1왕복).
  // 이 두 왕복은 같은 문서로 같은 판정 함수를 다시 돌릴 뿐이라 새로 알아내는 것이 없었는데,
  // 전역 Mongo 슬롯 5개를 두고 경합하며 10초 예산을 넘겨 503 을 만들던 지점이다.
  // 인증이 문서를 붙여 주지 못한 드문 경로(JWT-only 폴백 등)는 넘길 문서가 없으므로 기존 경로 그대로 둔다.
  const snapshot = await readSubscriptionStatusSnapshot(request, env, authUserDoc);
  return buildMembershipPassFromStatusSnapshot(snapshot) || directPass;
}

// 레거시 포인트→월정석 **1회 전환**이 아직 필요한 계정인지. 방금 읽은 문서만으로 판단한다.
// 🔴 코인이 폐지된 지금 이 전환은 사실상 전원이 이미 끝냈거나 애초에 대상이 아니다. 그런데도
// 예전에는 그 가능성 하나 때문에 모든 잔액 조회가 (a) 인증 메모를 우회한 별도 인증 왕복과
// (b) authUserDoc 재사용 포기로 인한 User.findById 를 **매번** 냈다 — 결과는 write 없는 no-op.
// 판정을 여기로 끌어올려, 실제로 전환할 것이 있을 때만 왕복이 생기게 한다.
function needsLegacyCoinCreditSeed(user) {
  if (!user?._id) return false;
  if (user?.profileSubscription?.legacyCoinCreditSeeded === true) return false;
  return Number(user?.points || 0) > 0;
}

// 이미 조회한 user 문서로 legacy seed 필요 여부만 판단하고, 필요할 때만 원자적 write.
// readBillingSnapshot처럼 User를 이미 읽은 경로에서 중복 findById를 피하기 위해 사용.
async function seedMembershipCreditFromUserDoc(authUserId, user) {
  const sub = user?.profileSubscription || {};
  const legacyPoints = Number(user?.points || 0);
  if (!user?._id) return null;

  const legacyCredit = !sub?.legacyCoinCreditSeeded && legacyPoints > 0
    ? Math.floor(legacyPoints * MEMBERSHIP_CREDIT_PER_COIN)
    : 0;
  if (legacyCredit <= 0) return null;

  const seededAt = new Date();
  // 레거시 포인트→월정석 1회 전환분도 지급일+30일 소멸 lot으로 적립(seed 가드로 멱등).
  // 백필까지 겸함: lot이 아직 없고 스칼라 잔액만 있던 유저의 기존 잔액도 lot으로 흡수해 유실을 막는다.
  const ensuredSeed = ensureLotsForBalance(sub, seededAt.getTime());
  const seededLots = applyGrantLot(ensuredSeed.lots, {
    lotId: "legacy-seed",
    amount: legacyCredit,
    grantedAt: seededAt,
    now: seededAt.getTime(),
  });
  return User.findOneAndUpdate(
    {
      _id: authUserId,
      "profileSubscription.legacyCoinCreditSeeded": { $ne: true },
    },
    {
      $set: {
        "profileSubscription.membershipCreditBalance": seededLots.balance,
        "profileSubscription.membershipCreditLots": seededLots.lots,
        "profileSubscription.legacyCoinCreditSeeded": true,
        "profileSubscription.legacyCoinCreditSeededAt": seededAt,
        "profileSubscription.legacyCoinCreditSeededPoints": Math.floor(legacyPoints),
      },
      $inc: {
        "profileSubscription.membershipCreditGranted": legacyCredit,
        "profileSubscription.membershipCreditLotsVersion": 1,
      },
    },
    {
      returnDocument: "after",
      projection: { points: 1, profileSubscription: 1 },
    },
  ).lean();
}

// 환불된 SPEND 원장의 sourceId를 무효화 표식으로 바꿔 유니크 키({userId,type,sourceId})를 비운다.
// 이게 없으면 환불 뒤 같은 purchaseId로 재구매할 때 원장 create가 영구히 E11000 → 500이 되어
// 사용자가 결과를 영영 못 받는다(행은 삭제하지 않는다 — 감사 추적 보존, 원본은 metadata.purchaseId에 있음).
// ledgerId를 '앞에' 두는 게 핵심: sourceId가 최대 180자라 뒤에 붙이면 절단이 유일성을 깨뜨릴 수 있다.
// Date.now() 금지 — 재실행해도 같은 값이어야 마이그레이션/self-heal이 멱등하다.
function buildRefundedSpendSourceId(sourceId, ledgerId) {
  return `refunded:${String(ledgerId || "")}:${String(sourceId || "")}`.slice(0, 180);
}

async function consumeMembershipCreditIfAvailable(
  env,
  authUserId,
  pricing,
  requestId,
  body = {},
  { atomicUnlock = null } = {},
) {
  const coinPrice = resolvePricingCoinCost(pricing, resolvePricingCoinCost(body));
  const requiredCredit = resolveMonthlyCreditCostForBilling(pricing, body);
  if (!Number.isInteger(requiredCredit) || requiredCredit <= 0) return null;
  const profileMutationMetadata = buildProfileCardMutationMetadata(body);

  await connectDb(env);
  const featureKey = String(pricing?.featureKey || body?.featureKey || "").trim();
  const normalizedRequestId = String(requestId || "").trim();
  const purchaseId = String(
    body?.purchaseId
    || body?.paymentId
    || body?.orderId
    || body?.idempotencyKey
    || normalizedRequestId
    || "",
  ).trim().slice(0, 160);
  // 멱등 재조회: 동일 purchaseId가 이미 처리됐으면 재차감 없이 기존 결과를 되돌린다.
  // 진입부 선검사와 ALREADY_PROCESSED 해소기가 공용으로 쓴다 — 해소기는 sibling 요청이 커밋한 원장을
  // 관찰해야 하므로 반드시 트랜잭션 세션 '밖'에서 호출할 것(세션 안이면 스냅샷 격리로 못 본다).
  const readIdempotentSpendResult = async () => {
  if (purchaseId) {
    const existingLedger = await MonthlyCreditLedger.findOne({
      userId: authUserId,
      type: "MONTHLY_CREDIT_SPEND",
      sourceId: purchaseId,
      "metadata.refundedForUnlockFailure": { $ne: true },
    }).select("_id amount afterBalance metadata").lean();
    if (existingLedger) {
      const currentUser = await User.findById(authUserId)
        .select("points profileSubscription")
        .lean();
      const currentCredit = Number(currentUser?.profileSubscription?.membershipCreditBalance ?? existingLedger?.afterBalance ?? 0);
      return {
        ok: true,
        transactionId: String(existingLedger?.metadata?.pointHistoryId || existingLedger?._id || ""),
        ledgerId: String(existingLedger?._id || ""),
        requestId: normalizedRequestId,
        purchaseId,
        transactionType: "membership_credit",
        accessType: "membership_credit",
        accessMethod: "MONTHLY",
        paymentMethod: "MONTHLY",
        featureKey,
        coinPrice,
        membershipCreditCost: Math.max(0, Math.floor(Number(existingLedger?.amount || requiredCredit))),
        requiredMonthlyCredits: Math.max(0, Math.floor(Number(existingLedger?.amount || requiredCredit))),
        remainingMembershipCredit: Number.isFinite(currentCredit) ? Math.max(0, Math.floor(currentCredit)) : 0,
        monthlyStoneBalance: Number.isFinite(currentCredit) ? Math.max(0, Math.floor(currentCredit)) : 0,
        monthlyCredits: Number.isFinite(currentCredit) ? Math.max(0, Math.floor(currentCredit)) : 0,
        monthlyCreditsAsCoins: Number.isFinite(currentCredit) ? Math.max(0, Math.floor(currentCredit)) / MEMBERSHIP_CREDIT_PER_COIN : 0,
        idempotent: true,
        user: {
          id: String(authUserId || ""),
          points: Number(currentUser?.points || 0),
          profileSubscription: currentUser?.profileSubscription || null,
        },
      };
    }
  }
  if (purchaseId && featureKey) {
    const existing = await PointHistory.findOne({
      userId: authUserId,
      featureKey,
      "metadata.accessType": "membership_credit",
      "metadata.monthlyCreditRefundedForUnlockFailure": { $ne: true },
      // 원장 write 실패로 차감이 보상(compensateDeduct)된 이력도 제외해야 한다 — 안 그러면 다음 재시도가
      // 이 이력에 매치돼 차감도 원장도 없이 idempotent 성공으로 무상 해금된다(매출 누수).
      // fortune.js가 이미 이 플래그들을 모두 제외하는 정본이고, billing만 비대칭으로 빠져 있었다.
      "metadata.monthlyCreditRefundedForLedgerFailure": { $ne: true },
      $or: [
        { "metadata.purchaseId": purchaseId },
        { "metadata.idempotencyKey": purchaseId },
        { "metadata.orderId": purchaseId },
        ...(normalizedRequestId ? [{ "metadata.requestId": normalizedRequestId }] : []),
      ],
    }).select("_id metadata").lean();
    if (existing) {
      const currentUser = await User.findById(authUserId)
        .select("points profileSubscription")
        .lean();
      const currentCredit = Number(currentUser?.profileSubscription?.membershipCreditBalance ?? existing?.metadata?.remainingMembershipCredit ?? 0);
      return {
        ok: true,
        transactionId: String(existing?._id || ""),
        requestId: normalizedRequestId,
        purchaseId,
        transactionType: "membership_credit",
        accessType: "membership_credit",
        accessMethod: "MONTHLY",
        paymentMethod: "MONTHLY",
        featureKey,
        coinPrice,
        membershipCreditCost: requiredCredit,
        requiredMonthlyCredits: requiredCredit,
        remainingMembershipCredit: Number.isFinite(currentCredit) ? Math.max(0, Math.floor(currentCredit)) : 0,
        monthlyStoneBalance: Number.isFinite(currentCredit) ? Math.max(0, Math.floor(currentCredit)) : 0,
        monthlyCredits: Number.isFinite(currentCredit) ? Math.max(0, Math.floor(currentCredit)) : 0,
        monthlyCreditsAsCoins: Number.isFinite(currentCredit) ? Math.max(0, Math.floor(currentCredit)) / MEMBERSHIP_CREDIT_PER_COIN : 0,
        idempotent: true,
        user: {
          id: String(authUserId || ""),
          points: Number(currentUser?.points || existing?.metadata?.balanceAfter || 0),
          profileSubscription: currentUser?.profileSubscription || null,
        },
      };
    }
  }
    return null;
  };
  const idempotentSpend = await readIdempotentSpendResult();
  if (idempotentSpend) return idempotentSpend;

  // 환불된 원장이 유니크 키를 아직 점유 중이면 표식 sourceId로 옮겨 키를 비운다(재구매 가능하게).
  // 정상 경로에선 환불 시점에 이미 비워지므로, 여기 오는 건 그때 updateOne이 삼켜졌거나 isolate가
  // 복원~재기입 사이에서 죽은 경우다(self-heal).
  // 🔒 안전 계약: 필터의 refundedForUnlockFailure:true — 미환불 원장은 절대 건드리지 않는다.
  //    (미환불 행을 옮기면 유효한 차감의 원장이 유실된다.)
  const releaseRefundedSpendSourceId = async () => {
    if (!purchaseId) return false;
    const refundedLedger = await MonthlyCreditLedger.findOne({
      userId: authUserId,
      type: "MONTHLY_CREDIT_SPEND",
      sourceId: purchaseId,
      "metadata.refundedForUnlockFailure": true,
    }).select("_id").lean();
    if (!refundedLedger?._id) return false;
    const released = await MonthlyCreditLedger.updateOne(
      { _id: refundedLedger._id, userId: authUserId, "metadata.refundedForUnlockFailure": true },
      { $set: { sourceId: buildRefundedSpendSourceId(purchaseId, refundedLedger._id) } },
    ).catch(() => null);
    return Number(released?.modifiedCount || 0) > 0;
  };

  const reportId = String(body?.reportId || body?.accessGrant?.reportId || "").trim();
  const sessionId = String(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || "").trim();
  const profileId = cleanProfileId(body?.profileId || body?.selectedProfileId);

  // 월정석 지급분별(lot) FIFO 차감: 만료 lot은 제외(지연소멸)하고 오래된 지급분부터 소진한다.
  // 단일 $inc로는 FIFO 배열 갱신이 불가하므로, 버전 가드 기반 낙관적 read-modify-write + 재시도로
  // 동시 차감/지급과의 경합을 안전하게 처리한다.
  const LOT_DEDUCT_MAX_ATTEMPTS = 5;
  const applyLotDeduction = async (session = null) => {
    for (let attempt = 0; attempt < LOT_DEDUCT_MAX_ATTEMPTS; attempt += 1) {
      const query = User.findById(authUserId).select("points profileSubscription recentConsumeRequestIds");
      if (session) query.session(session);
      const current = await query.lean();
      if (!current?._id) return { ok: false, reason: "USER_NOT_FOUND" };
      // 멱등: 이미 처리된 purchaseId면 재차감하지 않는다(상위 원장/이력 가드와 이중 방어).
      // '이미 차감됨'을 '잔량 부족'과 뭉뚱그리면 차감이 끝난 재시도가 402로 나가 결제창이 다시 열린다
      // — 반드시 구분해서 상위가 원장 재조회로 성공을 되돌릴 수 있게 한다.
      if (purchaseId && Array.isArray(current.recentConsumeRequestIds) && current.recentConsumeRequestIds.includes(purchaseId)) {
        return { ok: false, reason: "ALREADY_PROCESSED" };
      }
      const sub = current.profileSubscription || {};
      // 지연 백필: 마이그레이션 이전(잔액만 있고 lot 없음) 유저를 위해 즉석 30일 lot 합성.
      const ensured = ensureLotsForBalance(sub, Date.now());
      const deduction = deductLotsFIFO(ensured.lots, requiredCredit, Date.now());
      // 유효(미만료) 월정석 부족 → 결제창으로 폴백. lot 정본 잔액을 실어 상위 402가 스칼라 대신 이 값을 쓴다.
      if (!deduction.ok) return { ok: false, reason: "INSUFFICIENT", balance: ensured.balance };
      const version = Math.floor(Number(sub.membershipCreditLotsVersion || 0));
      const writeFilter = {
        _id: authUserId,
        "profileSubscription.membershipCreditLotsVersion": version,
        ...(purchaseId ? { recentConsumeRequestIds: { $ne: purchaseId } } : {}),
      };
      const writeUpdate = {
        $set: {
          "profileSubscription.membershipCreditLots": deduction.lots,
          "profileSubscription.membershipCreditBalance": deduction.balance,
        },
        $inc: {
          "profileSubscription.membershipCreditUsed": requiredCredit,
          "profileSubscription.membershipCreditLotsVersion": 1,
        },
        // $push는 $addToSet과 달리 스스로 중복을 막지 않는다 — 중복 방지는 위 writeFilter의
        // `recentConsumeRequestIds: { $ne: purchaseId }` 가드가 담당한다(같은 원자적 findOneAndUpdate).
        // 가드와 push 값이 어긋나면 즉시 이중 차감이므로 둘을 항상 같은 변수로 유지할 것.
        ...(purchaseId ? {
          $push: {
            recentConsumeRequestIds: { $each: [purchaseId], $slice: -RECENT_CONSUME_REQUEST_ID_CAP },
          },
        } : {}),
      };
      const writeOpts = { returnDocument: "after", projection: { points: 1, profileSubscription: 1 } };
      if (session) writeOpts.session = session;
      const updated = await User.findOneAndUpdate(writeFilter, writeUpdate, writeOpts).lean();
      if (updated) {
        return { ok: true, user: updated };
      }
      // 버전 충돌(동시 차감/지급) → 재조회 후 재시도.
    }
    // 5회 모두 write 실패 = 미차감. 잔량 부족이 아니므로 402가 아니라 일시 오류로 표면화해야 한다.
    return { ok: false, reason: "CONTENDED" };
  };
  const buildHistoryPayload = (pointsAfter, monthlyCredits) => ({
    userId: authUserId,
    kind: "deduct",
    delta: -Math.max(0, coinPrice),
    balanceAfter: Number(pointsAfter || 0),
    reason: String(pricing?.reason || "membership_credit_access"),
    featureKey,
    metadata: {
      accessType: "membership_credit",
      accessMethod: "MONTHLY",
      paymentMethod: "MONTHLY",
      ...profileMutationMetadata,
      requestId: normalizedRequestId,
      purchaseId,
      idempotencyKey: String(body?.idempotencyKey || purchaseId || "").trim().slice(0, 160),
      orderId: String(body?.orderId || purchaseId || "").trim().slice(0, 160),
      reportId,
      sessionId,
      reportSessionId: sessionId,
      profileId,
      selectedProfileId: profileId,
      featureKey,
      coinPrice,
      membershipCreditCost: requiredCredit,
      requiredMonthlyCredits: requiredCredit,
      remainingMembershipCredit: monthlyCredits,
      monthlyStoneBalance: monthlyCredits,
      monthlyCredits,
      monthlyCreditsAsCoins: monthlyCredits / MEMBERSHIP_CREDIT_PER_COIN,
      balanceAfter: Number(pointsAfter || 0),
    },
  });
  const buildLedgerPayload = (historyId, monthlyCredits) => ({
    userId: authUserId,
    type: "MONTHLY_CREDIT_SPEND",
    amount: requiredCredit,
    beforeBalance: monthlyCredits + requiredCredit,
    afterBalance: monthlyCredits,
    reason: String(pricing?.reason || "membership_credit_access"),
    sourceId: purchaseId || String(historyId || ""),
    serviceKey: featureKey,
    profileId,
    metadata: {
      pointHistoryId: String(historyId || ""),
      ...profileMutationMetadata,
      requestId: normalizedRequestId,
      purchaseId,
      idempotencyKey: String(body?.idempotencyKey || purchaseId || "").trim().slice(0, 160),
      orderId: String(body?.orderId || purchaseId || "").trim().slice(0, 160),
      coinPrice,
      requiredMonthlyCredits: requiredCredit,
      accessType: "membership_credit",
      accessMethod: "MONTHLY",
    },
  });

  // Atomic path: monthly-stone deduction + point-history + spend-ledger commit together, so an
  // isolate kill can never leave the balance debited without its ledger/history rows.
  const runSpend = () => runAtomicMonthlyPayment({
    mongoose,
    operation: async (session) => {
      const deducted = await applyLotDeduction(session);
      if (!deducted?.ok) {
        return { ok: false, reason: deducted?.reason || "CONTENDED", balance: deducted?.balance };
      }
      const updatedUser = deducted.user;
      const monthlyCredits = Math.max(0, Math.floor(Number(updatedUser?.profileSubscription?.membershipCreditBalance || 0)));
      const [history] = await PointHistory.create([buildHistoryPayload(updatedUser?.points, monthlyCredits)], { session });
      const [ledger] = await MonthlyCreditLedger.create([buildLedgerPayload(history?._id, monthlyCredits)], { session });
      const unlockEntitlement = typeof atomicUnlock === "function"
        ? await atomicUnlock({ session, updatedUser, monthlyCredits, history, ledger, purchaseId })
        : null;
      return { ok: true, updatedUser, monthlyCredits, history, ledger, unlockEntitlement };
    },
  });

  let spendOutcome;
  try {
    spendOutcome = await runSpend();
  } catch (error) {
    if (Number(error?.code) !== 11000) throw error;
    // 원장 유니크 키 충돌 시 트랜잭션이 전체 abort되어 돈이 움직이지 않았으므로 안전하게 판별·재시도할 수 있다.
    // (payments.js의 11000 처리와 취지는 같으나 상황이 다르다: 거기선 차감이 이미 커밋돼 '롤백할까'가
    //  질문이지만, 여기선 롤백이 끝나 있어 원장-잔액 불일치가 구조적으로 불가능하다.)
    const replayed = await readIdempotentSpendResult();
    if (replayed) return replayed; // 미환불 원장 = 진짜 재시도 → 재차감 없이 기존 결과를 되돌린다
    // 환불된 원장이 키를 점유 중이면 비우고 딱 1회만 재시도한다(무한루프 금지).
    if (!await releaseRefundedSpendSourceId()) throw error;
    spendOutcome = await runSpend();
  }
  if (!spendOutcome?.ok) {
    const failureReason = String(spendOutcome?.reason || "CONTENDED");
    // 이미 차감된 purchaseId면 sibling이 커밋했거나 커밋 직전이다. 원장 write는 user 문서 커밋 '이후'라
    // 관찰 창이 존재하므로, 세션 밖에서 짧게 재조회해 성공(idempotent)으로 되돌린다. 여기서 402를 내면
    // 돈은 빠진 채 "월정석 부족"이 떠서 결제창이 다시 열린다(= 이번 버그의 본체).
    if (failureReason === "ALREADY_PROCESSED") {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 150));
        const replayed = await readIdempotentSpendResult();
        if (replayed) return replayed;
      }
    }
    return { ok: false, reason: failureReason, balance: spendOutcome?.balance };
  }
  const { updatedUser, monthlyCredits, history, ledger, unlockEntitlement } = spendOutcome;
  // 잔량/접근 결정이 바뀌었으니 표시용 캐시를 즉시 무효화한다. 이게 없으면 결제 직후 /balance가 5초간
  // 차감 전 잔량을, ensure-access가 미해금 판정을 돌려줘 클라가 "결제 안 됐다"고 오인한다.
  // (payments.js:1419-1422가 원화 결제에서 지키는 계약과 동일 — 월정석 인라인 차감만 빠져 있었다.)
  try { globalThis.__billingBalanceCache?.invalidateForUser?.(authUserId); } catch {}
  try { globalThis.__paidAccessDecisionCache?.invalidateForUser?.(authUserId); } catch {}

  return {
    ok: true,
    transactionId: String(history?._id || ""),
    ledgerId: String(ledger?._id || ""),
    unlockEntitlement,
    requestId: String(requestId || ""),
    purchaseId,
    transactionType: "membership_credit",
    accessType: "membership_credit",
    accessMethod: "MONTHLY",
    paymentMethod: "MONTHLY",
    ...profileMutationMetadata,
    featureKey,
    coinPrice,
    membershipCreditCost: requiredCredit,
    requiredMonthlyCredits: requiredCredit,
    remainingMembershipCredit: monthlyCredits,
    monthlyStoneBalance: monthlyCredits,
    monthlyCredits,
    monthlyCreditsAsCoins: monthlyCredits / MEMBERSHIP_CREDIT_PER_COIN,
    user: {
      id: String(authUserId || ""),
      points: Number(updatedUser?.points || 0),
      profileSubscription: updatedUser?.profileSubscription || null,
    },
  };
}

// preloadedPoints: 호출부가 이미 BILLING_SNAPSHOT_USER_PROJECTION(points 포함)으로 인증을 마쳤다면
// authUserDoc.points 를 넘겨 여기서 users 를 다시 읽지 않게 한다. 폐지된 코인 잔액을 delta:0 감사행
// metadata 에 찍기만 하는 값이라(어떤 접근 판정에도 안 쓰인다) 약간 stale 해도 무해하다. 넘기지
// 않으면 예전처럼 신선 조회로 폴백한다(admin/dev 인증 등 authUserDoc 미부착 경로 보호).
async function recordPassAccessIfNeeded(env, authUserId, pricing, requestId, body = {}, entitlement = {}, preloadedPoints = undefined) {
  const featureKey = String(pricing?.featureKey || body?.featureKey || "").trim();
  const normalizedRequestId = String(requestId || "").trim();
  if (!authUserId || !featureKey || !normalizedRequestId) return null;
  const normalizedAccessMethod = String(body?.accessMethod || "").trim().toUpperCase() === "FAMILY" ? "FAMILY" : "PASS";
  const normalizedAccessType = normalizedAccessMethod === "FAMILY" ? "family" : "membership_pass";
  if (normalizedAccessMethod !== "FAMILY") return null;

  await connectDb(env);
  const existing = await PointHistory.findOne({
    userId: authUserId,
    kind: "deduct",
    featureKey,
    "metadata.requestId": normalizedRequestId,
    "metadata.accessMethod": normalizedAccessMethod,
  }).select("_id createdAt delta featureKey reason metadata").lean();
  if (existing) return existing;

  const pointsForBalance = preloadedPoints !== undefined
    ? preloadedPoints
    : (await User.findById(authUserId).select("points").lean())?.points;
  const reportId = String(body?.reportId || body?.accessGrant?.reportId || "").trim();
  const sessionId = String(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || "").trim();
  const profileId = cleanProfileId(body?.profileId || body?.selectedProfileId);
  const coinCost = resolvePricingCoinCost(pricing);

  return PointHistory.create({
    userId: authUserId,
    kind: "deduct",
    delta: 0,
    balanceAfter: Number(pointsForBalance || 0),
    reason: String(pricing?.reason || "pass_access"),
    featureKey,
    metadata: {
      accessType: normalizedAccessType,
      accessMethod: normalizedAccessMethod,
      paymentMethod: normalizedAccessMethod,
      requestId: normalizedRequestId,
      purchaseId: normalizedRequestId,
      reportId,
      sessionId,
      reportSessionId: sessionId,
      profileId,
      selectedProfileId: profileId,
      featureKey,
      coinCost,
      coinPrice: coinCost,
      passTier: entitlement?.passTier || null,
      passLimit: Number(entitlement?.maxCoveredCoin || 0),
    },
  });
}

function buildBillingErrorDetails(stage, error, extras = {}) {
  return {
    stage: String(stage || "billing-route"),
    name: error?.name || "Error",
    code: error?.code || "BILLING_ROUTE_ERROR",
    message: String(error?.message || "Unknown error"),
    ...(extras && typeof extras === "object" ? extras : {}),
  };
}

function passEvidenceFailure(error, { pricing, requestId, profileId, stage = "pass-access-record" } = {}) {
  logPaidAccessStage("INFRA_503_PASS_EVIDENCE", {
    requestId,
    featureKey: String(pricing?.featureKey || ""),
    profileId: profileId || undefined,
    httpStatus: 503,
    scope: stage,
    errorName: String(error?.name || ""),
    errorMessage: String(error?.message || ""),
  });
  return failure(
    503,
    "PAID_ACCESS_VERIFY_RETRYABLE",
    "이용권 확인 기록이 잠시 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
    String(error?.message || ""),
    {
      pricing,
      pendingPassEvidence: true,
      retryable: true,
      reason: "DB_UNAVAILABLE",
      accessGrant: {
        featureKey: String(pricing?.featureKey || ""),
        requestId,
        profileId: profileId || undefined,
      },
    },
    buildBillingErrorDetails(stage, error, {
      featureKey: String(pricing?.featureKey || ""),
      requestId,
      profileId: profileId || undefined,
    }),
  );
}

function logBillingRouteError(stage, error, request, extras = {}) {
  const payload = {
    route: "billing",
    method: request?.method || "",
    path: request ? new URL(request.url).pathname : "",
    ...buildBillingErrorDetails(stage, error, extras),
  };

  try {
    console.error("[worker-billing-route-error]", JSON.stringify(payload));
  } catch (e) {
    console.error("[worker-billing-route-error]", payload);
  }
}

function toMessage(payload, fallbackMessage) {
  if (!payload || typeof payload !== "object") return fallbackMessage;
  if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
  if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
  if (payload.error && typeof payload.error.message === "string" && payload.error.message.trim()) {
    return payload.error.message;
  }
  return fallbackMessage;
}

function toCode(payload) {
  if (!payload || typeof payload !== "object") return "";
  if (typeof payload.code === "string") return payload.code;
  if (payload.error && typeof payload.error.code === "string") return payload.error.code;
  return "";
}

function success(data, message = "요청이 성공했습니다.", init = {}) {
  const responseStatus = data && typeof data.status === "string" && data.status.trim() ? data.status.trim() : undefined;
  return json({ ok: true, ...(responseStatus ? { status: responseStatus } : {}), data, message }, init);
}

function normalizeBillingErrorCode(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return "SERVER_ERROR";
  if (normalized === "LOGIN_REQUIRED" || normalized === "UNAUTHORIZED") return "AUTH_REQUIRED";
  if (normalized === "INSUFFICIENT_BALANCE" || normalized === "INSUFFICIENT_POINTS") return "INSUFFICIENT_COINS";
  if (normalized === "INVALID_CONFIRM_PAYLOAD" || normalized === "VERIFY_FAILED" || normalized === "PAYMENT_VERIFY_FAILED") return "PAYMENT_VERIFICATION_FAILED";
  if (normalized === "INVALID_PAYMENT_MODE" || normalized === "INVALID_PAYMENT_METHOD") return "UNKNOWN_PAYMENT_METHOD";
  return normalized;
}

function resolveSuccessAccessStatus(data = {}, consume = {}, accessGrant = {}) {
  const accessType = String(data.accessType || consume.accessType || accessGrant.accessType || "").trim().toLowerCase();
  const transactionType = String(data.transactionType || consume.transactionType || accessGrant.transactionType || "").trim().toLowerCase();
  const accessMethod = String(data.accessMethod || consume.accessMethod || accessGrant.accessMethod || "").trim().toLowerCase();
  if (data.alreadyUnlocked === true || accessType === "already_unlocked" || transactionType === "unlock_entitlement") return "already_unlocked";
  if (
    data.freeBySubscription === true
    || accessType === "membership_pass"
    || accessType === "family"
    || accessType === "family_pass"
    || transactionType === "membership_pass"
    || transactionType === "family_pass"
    || accessMethod === "pass"
    || accessMethod === "family"
  ) return "pass_applied";
  return "success";
}

function resolvePaymentRequiredReason(code, extras = {}) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  const debug = extras?.membershipPassDebug && typeof extras.membershipPassDebug === "object" ? extras.membershipPassDebug : {};
  const requestedCoinPrice = Number(debug.requestedCoinPrice || extras?.pricing?.coinPrice || extras?.pricing?.cost || 0);
  const passLimit = Number(debug.passLimit || debug.freeLimit || extras?.paymentOptions?.passLimit || 0);
  const statusText = String(debug.status || "").trim().toLowerCase();
  if (normalizedCode === "PROFILE_LIMIT_EXCEEDED" || statusText.includes("profile_limit")) return "PROFILE_LIMIT_EXCEEDED";
  if (normalizedCode === "AUTH_REQUIRED") return "AUTH_REQUIRED";
  if (normalizedCode === "MEMBERSHIP_PASS_NOT_COVERED" || normalizedCode === "PAYMENT_REQUIRED") {
    if (statusText === "expired" || statusText === "canceled" || statusText === "cancelled" || statusText === "inactive") return "PASS_EXPIRED";
    if (Number.isFinite(requestedCoinPrice) && Number.isFinite(passLimit) && passLimit > 0 && requestedCoinPrice > passLimit) return "PRICE_EXCEEDS_PASS_LIMIT";
    if (debug.hasActivePass === false || !passLimit) return "NO_ACTIVE_PASS";
    return "PRICE_EXCEEDS_PASS_LIMIT";
  }
  if (normalizedCode === "PRICE_EXCEEDS_PASS_LIMIT") return "PRICE_EXCEEDS_PASS_LIMIT";
  return normalizedCode || "PAYMENT_REQUIRED";
}

function cleanProfileId(value) {
  return String(value || "").trim().slice(0, 80).replace(/\s+/g, "_");
}

function isDeferredUsageRequested(body = {}) {
  const value = body?.deferUsage ?? body?.usageDeferred ?? body?.deferredUsage;
  return value === true
    || String(value || "").trim().toLowerCase() === "true"
    || String(body?.usagePolicy || "").trim().toLowerCase() === "apply_after_success";
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function objectIdLike(value) {
  const text = String(value || "").trim();
  return Boolean(text && mongoose.Types.ObjectId.isValid(text));
}

function deferredExecutionId(featureKey, userId, requestId) {
  return `deferred:${String(featureKey || "").trim()}:${String(userId || "").trim()}:${String(requestId || "").trim()}`.slice(0, 160);
}

function normalizeDeferredPaymentMethod(value) {
  const method = String(value || "").trim().toUpperCase();
  if (method === "MONTHLY" || method === "MONTHLY_CREDIT" || method === "MOONLIGHT_STONE") return "MONTHLY";
  if (method === "PASS" || method === "MEMBERSHIP_PASS") return "PASS";
  if (method === "FAMILY" || method === "FAMILY_PASS") return "FAMILY";
  if (method === "DIRECT_KRW" || method === "CARD" || method === "SINGLE_PURCHASE") return "DIRECT_KRW";
  return "COIN";
}

function deferredRecordAccessMethod(paymentMethod) {
  const method = normalizeDeferredPaymentMethod(paymentMethod);
  if (method === "MONTHLY") return "monthly";
  if (method === "PASS") return "pass";
  if (method === "FAMILY") return "family";
  return "single";
}

function deferredAccessType(paymentMethod) {
  const method = normalizeDeferredPaymentMethod(paymentMethod);
  if (method === "MONTHLY") return "membership_credit";
  if (method === "PASS") return "membership_pass";
  if (method === "FAMILY") return "family";
  if (method === "DIRECT_KRW") return "single_purchase";
  return "coin";
}

function applyPaymentModeForDeferred(paymentMethod) {
  const method = normalizeDeferredPaymentMethod(paymentMethod);
  if (method === "MONTHLY") return "monthly_credit";
  if (method === "PASS" || method === "FAMILY") return "membership_pass";
  if (method === "DIRECT_KRW") return "single_purchase";
  return "coin";
}

function collectDeferredEvidenceIds(...sources) {
  const ids = new Set();
  const visit = (value, depth = 0) => {
    if (!value || depth > 3) return;
    if (typeof value !== "object") return;
    for (const key of ["_id", "id", "paymentId", "merchantUid", "merchant_uid", "impUid", "imp_uid", "transactionId", "purchaseId", "evidenceId", "requestId", "idempotencyKey", "orderId", "ledgerId"]) {
      const id = String(value?.[key] || "").trim();
      if (id) ids.add(id);
    }
    for (const key of ["data", "consume", "accessGrant", "payment", "pricing", "billingGate"]) visit(value?.[key], depth + 1);
  };
  sources.forEach((source) => visit(source));
  return [...ids];
}

function deferredEvidenceClauses(ids = []) {
  const clauses = [];
  for (const id of ids) {
    clauses.push({ requestId: id }, { idempotencyKey: id }, { merchantUid: id }, { impUid: id });
    clauses.push({ "metadata.requestId": id }, { "metadata.purchaseId": id }, { "metadata.idempotencyKey": id }, { "metadata.orderId": id }, { "metadata.ledgerId": id }, { "metadata.pointHistoryId": id });
    clauses.push({ sourceId: id });
    if (objectIdLike(id)) clauses.push({ _id: id }, { paymentId: id });
  }
  return clauses;
}

function deferredUsageSnapshot(record = {}) {
  return safeObject(safeObject(record.result).deferredUsage);
}

function buildDeferredGrantPayload({ record, pricing, paymentMethod, accessType, user, message }) {
  const method = normalizeDeferredPaymentMethod(paymentMethod);
  const executionId = String(record?.executionId || "");
  const evidenceId = String(record?._id || record?.id || "");
  const requestId = String(record?.requestId || "");
  const coinPrice = resolvePricingCoinCost(pricing);
  const membershipCreditCost = method === "MONTHLY" ? resolveMonthlyCreditCostForBilling(pricing, {}) : 0;
  const balance = Number.isFinite(Number(user?.points)) ? Number(user.points) : null;
  const monthlyCredits = Math.max(0, Math.floor(Number(user?.profileSubscription?.membershipCreditBalance || 0)));
  return {
    pricing,
    deferredUsage: true,
    usageDeferred: true,
    executionId,
    accessMethod: method,
    paymentMode: method,
    consume: {
      ok: true,
      deferredUsage: true,
      transactionType: accessType,
      accessType,
      accessMethod: method,
      paymentMethod: method,
      transactionId: evidenceId,
      purchaseId: requestId,
      requestId,
      executionId,
      featureKey: String(pricing?.featureKey || ""),
      chargedCoins: 0,
      coinPrice: method === "COIN" ? coinPrice : 0,
      membershipCreditCost,
    },
    accessGrant: {
      ok: true,
      deferredUsage: true,
      accessType,
      accessMethod: method,
      paymentMethod: method,
      featureKey: String(pricing?.featureKey || ""),
      requestId,
      purchaseId: requestId,
      evidenceId,
      executionId,
      paidAt: new Date().toISOString(),
    },
    balance,
    monthlyStoneBalance: monthlyCredits,
    membershipCreditBalance: monthlyCredits,
    monthlyCredits,
    monthlyCreditsAsCoins: monthlyCredits / MEMBERSHIP_CREDIT_PER_COIN,
    user: user ? {
      id: String(user?._id || user?.id || ""),
      points: Number(user?.points || 0),
      profileSubscription: user?.profileSubscription || null,
    } : null,
    freeBySubscription: accessType === "membership_pass" || accessType === "family",
    message,
  };
}

async function createDeferredUsageGrant(env, authUserId, pricing, requestId, options = {}) {
  await connectDb(env);
  const featureKey = String(pricing?.featureKey || options?.body?.featureKey || "").trim();
  const normalizedRequestId = String(requestId || options?.body?.idempotencyKey || "").trim();
  const paymentMethod = normalizeDeferredPaymentMethod(options.paymentMethod);
  const accessType = options.accessType || deferredAccessType(paymentMethod);
  const executionId = deferredExecutionId(featureKey, authUserId, normalizedRequestId);
  const user = await User.findById(authUserId).select("points profileSubscription").lean();
  const now = new Date();
  const record = await PaidExecutionRecord.findOneAndUpdate(
    { executionId },
    {
      $setOnInsert: {
        executionId,
        requestId: normalizedRequestId,
        userId: String(authUserId || ""),
        featureId: featureKey,
        profileId: cleanProfileId(options.profileId || options?.body?.profileId || "default") || "default",
        accessMode: "per_use",
        accessMethod: deferredRecordAccessMethod(paymentMethod),
        amountCoins: paymentMethod === "COIN" ? resolvePricingCoinCost(pricing) : 0,
        amountKRW: paymentMethod === "DIRECT_KRW" ? resolvePricingAmountKRW(pricing, resolvePricingCoinCost(pricing)) : 0,
        monthlyDeductedAmount: paymentMethod === "MONTHLY" ? resolveMonthlyCreditCostForBilling(pricing, options.body || {}) : 0,
        paymentId: String(options.paymentId || ""),
        orderId: String(options.orderId || normalizedRequestId),
        status: "paid_pending_generation",
        resultId: "",
        result: {
          deferredUsage: {
            source: String(options.source || "pre_usage"),
            featureKey,
            requestId: normalizedRequestId,
            paymentMethod,
            accessType,
            paymentId: String(options.paymentId || ""),
            evidence: options.evidence || null,
            pricingSnapshot: pricing,
            createdAt: now.toISOString(),
          },
        },
        idempotencyKey: executionId,
      },
      $set: {
        paymentId: String(options.paymentId || ""),
        orderId: String(options.orderId || normalizedRequestId),
      },
    },
    { upsert: true, new: true },
  ).lean();
  return success(
    buildDeferredGrantPayload({
      record,
      pricing,
      paymentMethod,
      accessType,
      user,
      message: "이용 권한을 확인했습니다.",
    }),
    "이용 권한을 확인했습니다.",
  );
}

async function findVerifiedDeferredBillingEvidence(env, authUserId, featureKey, body = {}) {
  await connectDb(env);
  const gate = safeObject(body.billingGate || body.billing || body.billingResult || body.paymentContext);
  const ids = collectDeferredEvidenceIds(body, gate);
  const clauses = deferredEvidenceClauses(ids);
  if (!clauses.length) return null;

  const pointHistory = await PointHistory.findOne({
    userId: authUserId,
    kind: "deduct",
    featureKey,
    $or: clauses,
  }).sort({ createdAt: -1 }).select("_id metadata").lean();
  if (pointHistory) {
    const meta = safeObject(pointHistory.metadata);
    const method = normalizeDeferredPaymentMethod(meta.paymentMethod || meta.accessMethod || meta.accessType);
    return {
      source: "point_history",
      paymentMethod: method,
      accessType: meta.accessType || deferredAccessType(method),
      paymentId: String(pointHistory._id || ""),
      evidence: { pointHistoryId: String(pointHistory._id || "") },
      alreadyConsumed: true,
    };
  }

  const ledger = await MonthlyCreditLedger.findOne({
    userId: authUserId,
    type: "MONTHLY_CREDIT_SPEND",
    serviceKey: featureKey,
    $or: clauses,
  }).sort({ createdAt: -1 }).select("_id").lean();
  if (ledger) {
    return {
      source: "monthly_credit_ledger",
      paymentMethod: "MONTHLY",
      accessType: "membership_credit",
      paymentId: String(ledger._id || ""),
      evidence: { ledgerId: String(ledger._id || "") },
      alreadyConsumed: true,
    };
  }

  const payment = await Payment.findOne({
    userId: authUserId,
    paymentType: "digital_content",
    status: { $in: ["paid", "success", "fulfilled"] },
    $and: [
      { $or: clauses },
      {
        $or: [
          { featureKey },
          { "pricingSnapshot.featureKey": featureKey },
        ],
      },
    ],
  }).sort({ paidAt: -1, updatedAt: -1, createdAt: -1 }).select("_id merchantUid impUid requestId").lean();
  if (payment) {
    return {
      source: "payment",
      paymentMethod: "DIRECT_KRW",
      accessType: "single_purchase",
      paymentId: String(payment.merchantUid || payment.impUid || payment.requestId || payment._id || ""),
      evidence: { paymentId: String(payment._id || ""), merchantUid: payment.merchantUid || "", impUid: payment.impUid || "" },
      alreadyConsumed: true,
    };
  }

  return null;
}

async function handleDeferredUsageRegister(request, env) {
  const body = await readJson(request);
  const pricingResult = resolvePricingFromBody(body);
  if (!pricingResult.ok) return failure(404, "PRICE_NOT_FOUND", pricingResult.message || "가격 정보를 찾을 수 없습니다.");
  const authCheck = await requireBillingAuth(request, env, pricingResult.pricing);
  if (!authCheck.ok) return authCheck.response;
  const requestId = resolveRequestId(request, body);
  const featureKey = String(pricingResult.pricing?.featureKey || body?.featureKey || "").trim();
  const evidence = await findVerifiedDeferredBillingEvidence(env, authCheck.auth.userId, featureKey, body);
  if (!evidence) {
    return failure(402, "PAYMENT_VERIFICATION_FAILED", "결제 확인이 완료되지 않았습니다.");
  }
  return createDeferredUsageGrant(env, authCheck.auth.userId, pricingResult.pricing, requestId, {
    body,
    paymentMethod: evidence.paymentMethod,
    accessType: evidence.accessType,
    paymentId: evidence.paymentId,
    orderId: evidence.paymentId || requestId,
    source: evidence.alreadyConsumed ? "verified_payment" : "pre_usage",
    evidence: evidence.evidence,
  });
}

async function findDeferredUsageRecord(env, authUserId, featureKey, requestId, body = {}) {
  await connectDb(env);
  const ids = collectDeferredEvidenceIds(body, { requestId });
  const executionId = String(body?.executionId || deferredExecutionId(featureKey, authUserId, requestId)).trim();
  return PaidExecutionRecord.findOne({
    userId: String(authUserId || ""),
    featureId: featureKey,
    $or: [
      { executionId },
      { requestId: String(requestId || "") },
      { _id: ids.find(objectIdLike) || undefined },
    ].filter((item) => Object.values(item)[0]),
  }).sort({ updatedAt: -1, createdAt: -1 });
}

async function markDeferredPaymentFulfilled(record, authUserId) {
  const snapshot = deferredUsageSnapshot(record);
  const paymentId = String(snapshot?.paymentId || snapshot?.evidence?.paymentId || "").trim();
  if (!paymentId) return;
  const query = objectIdLike(paymentId)
    ? { _id: paymentId, userId: authUserId }
    : {
      userId: authUserId,
      $or: [
        { merchantUid: paymentId },
        { impUid: paymentId },
        { requestId: paymentId },
      ],
    };
  await Payment.updateOne(query, {
    $set: {
      status: "fulfilled",
      orderState: "UNLOCKED",
    },
  }).catch(() => {});
}

async function completeDeferredUsageRecord(record, authUserId, resultId, applyResult = null) {
  const now = new Date();
  await markDeferredPaymentFulfilled(record, authUserId);
  const updated = await PaidExecutionRecord.findOneAndUpdate(
    { _id: record._id, userId: String(authUserId || "") },
    {
      $set: {
        status: "completed",
        consumedAt: record.consumedAt || now,
        completedAt: now,
        resultId: String(resultId || ""),
        "result.applyResult": applyResult,
        "result.completedAt": now.toISOString(),
      },
    },
    { new: true },
  ).lean();
  return updated;
}

async function handleDeferredUsageApply(request, env) {
  const body = await readJson(request);
  const pricingResult = resolvePricingFromBody(body);
  if (!pricingResult.ok) return failure(404, "PRICE_NOT_FOUND", pricingResult.message || "가격 정보를 찾을 수 없습니다.");
  const authCheck = await requireBillingAuth(request, env, pricingResult.pricing);
  if (!authCheck.ok) return authCheck.response;
  const requestId = resolveRequestId(request, body);
  const featureKey = String(pricingResult.pricing?.featureKey || body?.featureKey || "").trim();
  const record = await findDeferredUsageRecord(env, authCheck.auth.userId, featureKey, requestId, body);
  if (!record) return failure(404, "DEFERRED_USAGE_NOT_FOUND", "보류된 이용 권한을 찾을 수 없습니다.");
  if (record.status === "completed") {
    return success({ deferredUsage: true, executionId: record.executionId, status: "completed" }, "이용 권한이 이미 확정되었습니다.");
  }

  const snapshot = deferredUsageSnapshot(record);
  const paymentMethod = normalizeDeferredPaymentMethod(snapshot.paymentMethod || body?.paymentMode);
  if (paymentMethod === "COIN" && snapshot.source !== "verified_payment" && !snapshot.evidence) {
    return failure(402, "PAYMENT_REQUIRED", "기존 코인 결제 기록은 새 코인 차감으로 재처리하지 않습니다. 이용권, 월정석 또는 단건 결제를 선택해 주세요.", undefined, {
      legacyCoinDisabled: true,
      blockedPaymentMode: "COIN",
      paymentOptions: ["MEMBERSHIP_PASS", "MOONLIGHT_STONE", "DIRECT_KRW"],
      checkout: {},
    });
  }
  if (snapshot.source === "verified_payment" || snapshot.evidence) {
    const completed = await completeDeferredUsageRecord(record, authCheck.auth.userId, body?.resultId || body?.sessionId || "", { source: snapshot.source, evidence: snapshot.evidence || null });
    return success({ deferredUsage: true, executionId: completed?.executionId || record.executionId, status: "completed" }, "이용 권한이 확정되었습니다.");
  }

  const applyBody = {
    ...body,
    featureKey,
    requestId: record.requestId || requestId,
    idempotencyKey: record.requestId || requestId,
    paymentMode: applyPaymentModeForDeferred(paymentMethod),
    deferUsage: false,
    usagePolicy: "",
  };
  const applyResponse = await processCoinGateFromPricing(request, env, applyBody, pricingResult);
  const applyPayload = await readPayloadSafe(applyResponse);
  if (!applyResponse.ok || applyPayload?.ok !== true) return applyResponse;
  const completed = await completeDeferredUsageRecord(record, authCheck.auth.userId, body?.resultId || body?.sessionId || "", applyPayload?.data || applyPayload);
  return success({
    ...(applyPayload?.data && typeof applyPayload.data === "object" ? applyPayload.data : {}),
    deferredUsage: true,
    executionId: completed?.executionId || record.executionId,
    status: "completed",
  }, "이용 권한이 확정되었습니다.");
}

async function handleDeferredUsageCancel(request, env) {
  const body = await readJson(request);
  const pricingResult = resolvePricingFromBody(body);
  if (!pricingResult.ok) return failure(404, "PRICE_NOT_FOUND", pricingResult.message || "가격 정보를 찾을 수 없습니다.");
  const authCheck = await requireBillingAuth(request, env, pricingResult.pricing);
  if (!authCheck.ok) return authCheck.response;
  const requestId = resolveRequestId(request, body);
  const featureKey = String(pricingResult.pricing?.featureKey || body?.featureKey || "").trim();
  const record = await findDeferredUsageRecord(env, authCheck.auth.userId, featureKey, requestId, body);
  if (!record || record.status === "completed") {
    return success({ deferredUsage: true, status: record?.status || "not_found" }, "보류된 이용 권한을 정리했습니다.");
  }
  await PaidExecutionRecord.updateOne(
    { _id: record._id, userId: String(authCheck.auth.userId || "") },
    {
      $set: {
        status: "generation_failed",
        "error.code": String(body?.code || "GENERATION_FAILED").slice(0, 80),
        "error.message": String(body?.message || "").slice(0, 500),
      },
    },
  );
  return success({ deferredUsage: true, executionId: record.executionId, status: "generation_failed" }, "보류된 이용 권한을 정리했습니다.");
}

async function resolveBillingProfileId(authUserId, body = {}, env = {}, authUserDoc = null) {
  const explicit = cleanProfileId(body?.profileId || body?.selectedProfileId || body?.profile?.profileId || body?.profile?.id);
  if (explicit || !authUserId) return explicit;
  const fromAuth = cleanProfileId(authUserDoc?.destinyProfilesCurrentId);
  if (fromAuth) return fromAuth;
  await connectDb(env);
  const user = await User.findById(authUserId).select("destinyProfilesCurrentId").lean();
  return cleanProfileId(user?.destinyProfilesCurrentId);
}

function isProfileScopedUnlockKey(featureKey) {
  const key = String(featureKey || "").trim();
  if (!key) return false;
  return Boolean(resolveSajuProfileUnlockContentKey(key));
}

function normalizeUnlockedFeatureList(values = []) {
  if (!Array.isArray(values)) return [];
  return values
    .map((key) => String(key || "").trim())
    .filter((key) => key && key !== LOTTO_RITUAL_REPORT_FEATURE_KEY);
}

async function resolveProfileScopedUnlocks(authUserId, profileId, accountFeatureKeys = []) {
  if (!authUserId) return { unlockedFeatures: [], unlockMap: {}, contentKeys: [], profileScopedAuthoritative: false };
  const normalizedProfileId = cleanProfileId(profileId);
  // 두 조회는 서로의 결과를 참조하지 않는다(아래에서 union만 한다) — 직렬로 두면 왕복 1회가
  // 순수 낭비로 이용권 확인 대기에 얹힌다.
  const [keys, entitlementSnapshot] = await Promise.all([
    normalizedProfileId
      ? PointHistory.distinct("featureKey", {
        userId: authUserId,
        kind: "deduct",
        featureKey: { $ne: "" },
        $or: [
          { "metadata.profileId": normalizedProfileId },
          { "metadata.selectedProfileId": normalizedProfileId },
        ],
      })
      : Promise.resolve([]),
    getUnlockedContentSnapshot({
      userId: String(authUserId),
      profileId: normalizedProfileId,
    }),
  ]);
  const legacyProfileKeys = keys
    .map((key) => String(key || "").trim())
    .filter(isProfileScopedUnlockKey);
  // 계정 전역 배열(User.unlockedFeatures/paidFeatures)은 어떤 프로필에서 구매했는지 모른다.
  // 프로필 스코프 키(예: section_daewun)까지 여기서 그대로 union하면 프로필 A의 구매가
  // 프로필 B 조회에도 해제로 새어나간다 — 계정 전역으로 취급해도 되는 키만 union한다.
  const unlockedFeatures = Array.from(new Set([
    ...normalizeUnlockedFeatureList(accountFeatureKeys).filter((key) => !isProfileScopedUnlockKey(key)),
    ...legacyProfileKeys,
    ...normalizeUnlockedFeatureList(entitlementSnapshot.featureKeys),
  ]));
  const unlockMap = { ...(entitlementSnapshot.unlockMap || {}) };
  for (const key of unlockedFeatures) unlockMap[key] = true;
  return {
    unlockedFeatures,
    unlockMap,
    contentKeys: entitlementSnapshot.contentKeys || [],
    profileScopedAuthoritative: entitlementSnapshot.profileScopedAuthoritative === true,
  };
}

async function successWithPremiumAccess(env, authUserId, data, message = "요청이 성공했습니다.", init = {}) {
  const pricing = data?.pricing || {};
  const consume = data?.consume || {};
  const accessGrant = data?.accessGrant && typeof data.accessGrant === "object" ? data.accessGrant : {};
  const featureKey = String(pricing?.featureKey || consume?.featureKey || accessGrant?.featureKey || "").trim();
  const reason = String(pricing?.reason || "").trim();
  const profileId = cleanProfileId(accessGrant?.profileId || consume?.profileId || data?.profileId);
  const transactionId = String(
    consume?.transactionId
      || accessGrant?.evidenceId
      || accessGrant?.purchaseId
      || accessGrant?.requestId
      || "",
  ).trim();
  const tokenReportId = String(data?.reportId || accessGrant?.reportId || consume?.reportId || "").trim();
  const tokenSessionId = String(
    data?.sessionId
      || data?.reportSessionId
      || accessGrant?.sessionId
      || accessGrant?.reportSessionId
      || consume?.sessionId
      || consume?.reportSessionId
      || "",
  ).trim();
  const tokenRequestId = String(data?.requestId || accessGrant?.requestId || consume?.requestId || "").trim();
  const tokenPurchaseId = String(data?.purchaseId || accessGrant?.purchaseId || consume?.purchaseId || "").trim();
  const reportType = resolvePremiumAccessReportType(featureKey, reason);
  const premiumAccessToken = reportType
    ? await createPremiumAccessToken(env, {
      userId: String(authUserId || ""),
      reportType,
      featureKey,
      reason,
      transactionId,
      reportId: tokenReportId,
      sessionId: tokenSessionId,
      requestId: tokenRequestId,
      purchaseId: tokenPurchaseId,
      chargedCoins: Number(consume?.chargedCoins || 0),
      freeBySubscription: data?.freeBySubscription === true || consume?.accessType === "membership_pass",
    })
    : "";
  const responseHeaders = new Headers(init?.headers || {});
  if (premiumAccessToken) {
    responseHeaders.append("Set-Cookie", buildPremiumAccessCookie(premiumAccessToken, isProductionRuntime(env)));
  }
  let unlockedFeatures = Array.isArray(data?.unlockedFeatures) ? [...data.unlockedFeatures] : [];
  let unlockMap = data?.unlockMap && typeof data.unlockMap === "object" ? { ...data.unlockMap } : {};
  const unlockGrant = data?.unlockGrant || accessGrant?.unlockGrant || null;
  const isPermanentUnlock = isUnlockPaidFeatureKey(featureKey);
  const isUserScopedPermanentUnlock = isPermanentUnlock
    && !resolveSajuProfileUnlockContentKey(featureKey)
    && featureKey !== LOTTO_RITUAL_REPORT_FEATURE_KEY;
  if (authUserId && featureKey && isUserScopedPermanentUnlock && !unlockGrant) {
    await connectDb(env);
    const updatedUser = await User.findByIdAndUpdate(
      authUserId,
      { $addToSet: { unlockedFeatures: featureKey } },
      { returnDocument: "after", projection: { unlockedFeatures: 1 } },
    ).lean();
    unlockedFeatures = Array.isArray(updatedUser?.unlockedFeatures) ? updatedUser.unlockedFeatures : unlockedFeatures;
    unlockMap = { ...unlockMap, [featureKey]: true };
  }
  const accessStatus = resolveSuccessAccessStatus(data, consume, data?.accessGrant || {});
  const coinCharged = Number(consume?.chargedCoins || data?.charged || 0);
  const monthlyStoneCharged = String(consume?.accessType || "").toLowerCase() === "membership_credit"
    ? Number(consume?.membershipCreditCost || 0)
    : 0;
  const normalizedAccessType = String(consume?.accessType || data?.accessGrant?.accessType || "").toLowerCase();
  const normalizedTransactionType = String(consume?.transactionType || data?.accessGrant?.transactionType || "").toLowerCase();
  const membershipPassApplied = normalizedAccessType === "membership_pass" || normalizedTransactionType === "membership_pass";
  const normalizedAccessMethod = String(consume?.accessMethod || consume?.paymentMethod || data?.accessGrant?.accessMethod || data?.accessGrant?.paymentMethod || "").toUpperCase();
  const resolvedAccessSource = String(data?.accessSource || data?.accessGrant?.accessSource || "").trim()
    || (membershipPassApplied || normalizedAccessType === "subscription_pass" ? "license_pass"
      : (normalizedAccessType === "family" || normalizedAccessType === "family_pass" || normalizedAccessMethod === "FAMILY" ? "family_pass"
        : (normalizedAccessType === "membership_credit" || normalizedAccessMethod === "MONTHLY" ? "monthly_subscription"
          : (normalizedAccessType === "single_purchase" || normalizedAccessType === "single_payment" || normalizedAccessMethod === "CARD" || normalizedAccessMethod === "DIRECT_KRW" ? "single_payment"
            : (normalizedAccessType === "coin" || normalizedAccessMethod === "COIN" ? "coin_payment" : "")))));
  const resolvedPaymentIntentType = String(data?.paymentIntentType || "").trim()
    || (resolvedAccessSource === "single_payment" ? "single_payment"
      : (resolvedAccessSource === "monthly_subscription" ? "monthly_subscription" : "none"));
  const accessGateResult = data?.accessGateResult
    || data?.accessDecision?.accessGateResult
    || (membershipPassApplied
      ? buildLicensePassAccessGateResult({
        pricing,
        paymentOptions: data?.paymentOptions || data,
        membershipPass: data?.membershipPass || {},
        accessDecision: data?.accessDecision || {},
      })
      : null);
  const normalizedAccessDecision = data?.accessDecision || (membershipPassApplied
    ? buildPaidContentAccessDecision({
      accessGranted: true,
      reason: "pass_covered",
      shouldOpenPaymentSelector: false,
      priceCoin: resolvePricingCoinCost(pricing),
      paymentOptions: data?.paymentOptions || data,
      accessGateResult,
    })
    : undefined);
  const hasResponseHeaders = Array.from(responseHeaders.keys()).length > 0;
  logPaidAccessStage("PAID_FLOW_DONE", {
    requestId: consume?.requestId || data?.requestId || data?.accessGrant?.requestId || "",
    userId: authUserId,
    featureKey,
    profileId,
    accessMethod: consume?.accessMethod || data?.accessGrant?.accessMethod || "",
    paymentMethod: consume?.paymentMethod || data?.accessGrant?.paymentMethod || "",
    amountCoins: resolvePricingCoinCost(pricing),
    amountKRW: resolvePricingAmountKRW(pricing, resolvePricingCoinCost(pricing)),
    paymentId: consume?.transactionId || data?.transactionId || "",
    orderId: consume?.purchaseId || data?.accessGrant?.purchaseId || "",
    idempotencyKey: consume?.purchaseId || consume?.requestId || data?.requestId || "",
  });
  return success({
    ...data,
    status: accessStatus,
    contentId: String(data?.contentId || data?.accessGrant?.reportId || featureKey || "").trim(),
    serviceType: String(data?.serviceType || pricing?.categoryKey || featureKey || "").trim(),
    coinCharged,
    monthlyStoneCharged,
    featureKey,
    accessSource: resolvedAccessSource || undefined,
    paymentIntentType: resolvedPaymentIntentType,
    ...(resolvedPaymentIntentType !== "none" ? { paymentType: resolvedPaymentIntentType } : {}),
    chargedCoins: Number(consume?.chargedCoins || 0),
    transactionId,
    freeBySubscription: data?.freeBySubscription === true || consume?.accessType === "membership_pass",
    premiumAccessToken: premiumAccessToken || data?.premiumAccessToken || null,
    profileId: profileId || undefined,
    unlockedFeatures,
    unlockMap,
    unlockGrant,
    ...(normalizedAccessDecision ? { accessDecision: normalizedAccessDecision } : {}),
    ...(accessGateResult ? { accessGateResult, licensePass: accessGateResult } : {}),
  }, message, hasResponseHeaders ? { ...init, headers: responseHeaders } : init);
}

function cleanText(value, max = 240) {
  return String(value || "").trim().slice(0, max);
}

function toIso(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

// responseHeaders: 503 계층 라벨(X-CD-Error-Stage)·Retry-After 처럼 **본문에 넣으면 안 되는** 진단 정보만
// 싣는다. extras 는 그대로 본문에 스프레드되므로 헤더를 그쪽에 태우면 응답 스키마가 오염된다.
function failure(status, code, message, debugMessage, extras = {}, errorDetails, responseHeaders) {
  const normalizedCode = normalizeBillingErrorCode(code);
  const responseStatus = extras?.status || (Number(status) === 402 ? "payment_required" : "error");
  const responseReason = extras?.reason || (responseStatus === "payment_required" ? resolvePaymentRequiredReason(normalizedCode, extras) : normalizedCode);
  const requiredMonthlyCredits = Math.max(0, Math.floor(Number(extras?.requiredMonthlyCredits ?? extras?.membershipCreditCost ?? 0)));
  const currentMonthlyCredits = Math.max(0, Math.floor(Number(extras?.currentMonthlyCredits ?? extras?.monthlyCredits ?? extras?.membershipCreditBalance ?? 0)));
  return json({
    ok: false,
    code: normalizedCode,
    message,
    status: responseStatus,
    reason: responseReason,
    ...extras,
    ...(requiredMonthlyCredits > 0 ? { requiredMonthlyCredits } : {}),
    ...(normalizedCode === "INSUFFICIENT_MONTHLY_CREDITS" ? { currentMonthlyCredits } : {}),
    error: {
      code: normalizedCode,
      message,
      ...(debugMessage ? { debugMessage: String(debugMessage).slice(0, 300) } : {}),
      ...(errorDetails && typeof errorDetails === "object" ? { details: errorDetails } : {}),
    },
  }, {
    status,
    ...(responseHeaders && typeof responseHeaders === "object" ? { headers: responseHeaders } : {}),
  });
}

function buildRoutedRequest(request, targetPath, method, body) {
  const url = new URL(request.url);
  url.pathname = targetPath;

  const headers = new Headers(request.headers || {});
  const nextMethod = String(method || request.method || "GET").toUpperCase();

  const init = {
    method: nextMethod,
    headers,
  };

  if (body !== undefined && body !== null && nextMethod !== "GET") {
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(body);
  }

  return new Request(url.toString(), init);
}

async function readPayloadSafe(response) {
  try {
    return await response.clone().json();
  } catch (e) {
    return {};
  }
}

function resolveRequestId(request, body) {
  const rawRequestId = String(
    body?.requestId
      || request.headers.get("idempotency-key")
      || request.headers.get("x-idempotency-key")
      || "",
  ).trim().slice(0, 120);

  if (rawRequestId) return rawRequestId;
  return `billing:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function shouldRetryCoinConsume(responseStatus, payload) {
  const code = String(toCode(payload) || "").trim().toUpperCase();
  // AUTH_STATUS_TEMPORARILY_UNAVAILABLE/SERVICE_UNAVAILABLE는 안쪽 인증 재시도
  // (resolveActiveUserAuth의 withMongoRetry)가 이미 소진된 뒤에만 나온다 — 여기서 위임
  // 라우트를 통째로 다시 돌리면 같은 인증 조회를 반복해 풀이 가장 바쁜 순간 비용만
  // 두 배가 된다(중첩 재시도). MongoTopologyClosedError 등 진짜 예외 경로는
  // shouldRetryCoinConsumeException이 별도로 계속 처리하므로 여기서는 손대지 않는다.
  if (code === "AUTH_STATUS_TEMPORARILY_UNAVAILABLE" || code === "SERVICE_UNAVAILABLE") return false;
  const status = Number(responseStatus || 0);
  if (status >= 500) return true;
  return code === "WORKER_UNHANDLED_EXCEPTION";
}

function sleep(ms) {
  const delay = Number(ms);
  if (!Number.isFinite(delay) || delay <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, delay));
}

async function withTimeout(promise, timeoutMs, code = "BILLING_TIMEOUT") {
  const ms = Math.max(1000, Number(timeoutMs || 15000));
  let timer = null;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error(`Billing operation timed out after ${ms}ms`);
          error.code = code;
          reject(error);
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function shouldRetryCoinConsumeException(error) {
  const code = String(error?.code || "").trim().toUpperCase();
  const name = String(error?.name || "").trim().toUpperCase();
  const message = String(error?.message || "").trim().toUpperCase();
  return code === "COIN_GATE_CONSUME_TIMEOUT"
    || code === "WORKER_UNHANDLED_EXCEPTION"
    || name === "MONGOTOPOLOGYCLOSEDERROR"
    || message.includes("TOPOLOGY IS CLOSED")
    || message.includes("TOPOLOGY CLOSED");
}

function isPaidAccessSelfBudgetError(error) {
  return PAID_ACCESS_SELF_BUDGET_CODES.has(String(error?.message || "").trim())
    || PAID_ACCESS_SELF_BUDGET_CODES.has(String(error?.code || "").trim());
}

function isDatabaseUnavailableError(error) {
  // 자체 예산 초과는 여전히 degrade 대상이다(호출부 동작 불변). 달라지는 것은 **왜** degrade 됐는지를
  // 헤더/로그로 구분할 수 있게 된 것과, 일반 단어에 걸린 비-DB 오류가 더는 여기 섞이지 않는다는 것뿐이다.
  return isPaidAccessSelfBudgetError(error) || isDbUnavailableError(error);
}

/* 503 을 낸 계층 라벨. 우리 예산으로 자른 것(billing-pass-budget)과 진짜 인프라 장애(db)를 가른다.
   지금까지 billing 이 내는 503 에는 stage 헤더도 Retry-After 도 없어서, DEBUGGING_GUIDE 의 계층 판별
   절차가 결제 503 에 대해서만 작동하지 않았다(= 어떤 수정이 효과가 있었는지 측정할 수단이 없었다). */
function paidAccessErrorStage(error) {
  return isPaidAccessSelfBudgetError(error) ? "billing-pass-budget" : "db";
}

function paidAccessRetryableHeaders(stage) {
  return {
    "X-CD-Error-Stage": String(stage || "db"),
    "Retry-After": "2",
  };
}

function withDbAccessTimeout(promise, timeoutMs, message) {
  return withTimeout(promise, timeoutMs, String(message || "UNLOCK_DB_TIMEOUT"));
}

function buildPassPaymentDecisionFallback(pricing, profileSubscription = null) {
  return buildPassPaymentDecision({}, pricing, profileSubscription || {
    membershipCreditBalance: 0,
  });
}

function isProductionRuntime(env) {
  const nodeEnv = String(env?.NODE_ENV || "").trim().toLowerCase();
  if (nodeEnv === "production") return true;

  const appEnv = String(env?.APP_ENV || env?.DEPLOY_ENV || env?.ENVIRONMENT || "").trim().toLowerCase();
  return appEnv === "prod" || appEnv === "production";
}

function isTruthyFlag(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function shouldCreateDirectPortOneOrder(body = {}) {
  const paymentMode = String(body?.paymentMode || body?.accessMode || body?.mode || "").trim().toLowerCase();
  const provider = String(body?.provider || body?.paymentProvider || "").trim().toLowerCase();
  const pg = String(body?.pg || body?.pgProvider || "").trim().toLowerCase();
  return paymentMode === "direct_krw"
    || paymentMode === "single_payment"
    || paymentMode === "single"
    || isTruthyFlag(body?.forceDirectPayment)
    || (provider === "portone_v2" && (pg === "kg_inicis" || pg === "kg-inicis" || pg === "inicis"));
}

function shouldApplyMembershipPassBeforeCard(body = {}) {
  if (shouldCreateDirectPortOneOrder(body)) return false;
  const paymentMode = String(body?.paymentMode || body?.accessMode || body?.mode || "").trim().toLowerCase();
  return paymentMode === "membership_pass" || paymentMode === "membership";
}

function requiresMeteredPassWrite(tier) {
  return normalizePassTier(tier) === "family";
}

function isSajuPdfGenerationFeatureKey(featureKey) {
  const key = String(featureKey || "").trim();
  if (!key) return false;
  return SAJU_PDF_GENERATION_FEATURE_KEYS.has(key) || SAJU_PDF_GENERATION_FEATURE_KEYS.has(key.toLowerCase());
}

function canGeneratePaidPdf(pricing = {}) {
  return isSajuPdfGenerationFeatureKey(pricing?.featureKey) || isPdfFeaturePricing(pricing);
}

function resolvePaidReportSessionFallback(pricing = {}, reportId = "", requestId = "") {
  const featureKey = String(pricing?.featureKey || "").trim();
  const id = String(reportId || "").trim();
  if (!id) return String(requestId || "").trim();
  if (/love[_-]?secret|love[_-]?book/i.test(featureKey)) return `love-book:${id}`;
  return `paid-report:${id}`;
}

function shouldPersistProfileUnlockEntitlement(pricing = {}) {
  return !canGeneratePaidPdf(pricing) && isUnlockPaidFeatureKey(pricing?.featureKey);
}

function logCoinGateResult(payload) {
  try {
    console.log("[worker-billing-coin-gate]", JSON.stringify(payload));
  } catch (e) {
    console.log("[worker-billing-coin-gate]", payload);
  }
}

function logPaidAccessStage(stage, details = {}) {
  const payload = {
    stage,
    requestId: String(details.requestId || ""),
    userId: String(details.userId || ""),
    featureId: String(details.featureId || details.featureKey || ""),
    productId: String(details.productId || ""),
    profileId: String(details.profileId || ""),
    accessMethod: String(details.accessMethod || ""),
    paymentMethod: String(details.paymentMethod || details.paymentMode || ""),
    amountCoins: Number(details.amountCoins || 0),
    amountKRW: Number(details.amountKRW || 0),
    passEligible: details.passEligible === true,
    passTier: String(details.passTier || ""),
    passLimit: Number(details.passLimit || 0),
    passLimitKRW: Number(details.passLimitKRW || details.passLimitWon || (details.passLimit ? calculateKrwAmountFromCoins(details.passLimit) : 0)),
    unlockId: String(details.unlockId || ""),
    monthlyRequiredAmount: Number(details.monthlyRequiredAmount || 0),
    monthlyBalanceBefore: Number(details.monthlyBalanceBefore || 0),
    monthlyBalanceAfter: Number(details.monthlyBalanceAfter || 0),
    paymentId: String(details.paymentId || ""),
    orderId: String(details.orderId || ""),
    idempotencyKey: String(details.idempotencyKey || ""),
    // 503 진단용: 어느 체크포인트(httpStatus)에서, 어떤 조회 범위(scope)가,
    // 얼마나(elapsedMs) 걸려 실패했는지 정량화하기 위한 필드.
    scope: String(details.scope || ""),
    // 503 이 우리 예산(billing-pass-budget) 때문인지 진짜 인프라(db/auth) 때문인지. X-CD-Error-Stage 와 같은 값.
    cause: String(details.cause || ""),
    httpStatus: Number(details.httpStatus || 0),
    elapsedMs: Number(details.elapsedMs || 0),
    errorName: String(details.errorName || ""),
    errorMessage: String(details.errorMessage || ""),
    stack: String(details.stack || ""),
  };
  try {
    console.log("[worker-paid-access]", JSON.stringify(payload));
  } catch (e) {
    console.log("[worker-paid-access]", payload);
  }
}

function maskSajuUnlockLogId(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= 8) return text;
  return `...${text.slice(-8)}`;
}

function withSajuEntitlementNoStore(response) {
  const headers = response?.headers;
  if (!headers || typeof headers.set !== "function") return response;
  headers.set("Cache-Control", SAJU_ANALYSIS_ENTITLEMENT_NO_STORE_HEADERS["Cache-Control"]);
  headers.set("Pragma", SAJU_ANALYSIS_ENTITLEMENT_NO_STORE_HEADERS.Pragma);
  headers.set("Expires", SAJU_ANALYSIS_ENTITLEMENT_NO_STORE_HEADERS.Expires);
  return response;
}

function logSajuUnlockEntitlement(details = {}) {
  const payload = {
    userId: maskSajuUnlockLogId(details.userId),
    attemptId: maskSajuUnlockLogId(details.attemptId),
    paymentId: maskSajuUnlockLogId(details.paymentId),
    purchaseStatus: String(details.purchaseStatus || ""),
    unlockedContentIdsLength: Number(details.unlockedContentIdsLength || 0),
    dbReadMs: Number(details.dbReadMs || 0),
    totalMs: Number(details.totalMs || 0),
    cacheHeader: SAJU_ANALYSIS_ENTITLEMENT_NO_STORE_HEADERS["Cache-Control"],
  };
  try {
    console.log("[Saju Unlock Entitlement]", JSON.stringify(payload));
  } catch (e) {
    console.log("[Saju Unlock Entitlement]", payload);
  }
}

function logSajuPaymentUnlockApplied(details = {}) {
  const payload = {
    userId: maskSajuUnlockLogId(details.userId),
    attemptId: maskSajuUnlockLogId(details.attemptId),
    paymentId: maskSajuUnlockLogId(details.paymentId),
    productId: String(details.productId || ""),
    contentIds: Array.isArray(details.contentIds) ? details.contentIds.map((item) => String(item || "")).filter(Boolean) : [],
    paymentVerified: details.paymentVerified === true,
    unlockSaved: details.unlockSaved === true,
    totalMs: Number(details.totalMs || 0),
  };
  try {
    console.log("[Saju Payment Unlock Applied]", JSON.stringify(payload));
  } catch (e) {
    console.log("[Saju Payment Unlock Applied]", payload);
  }
}

async function consumeCoinWithRetry(request, env, delegatedBody) {
  const maxAttempts = 2;
  const consumeTimeoutMs = Math.max(2000, Number(env?.BILLING_COIN_GATE_TIMEOUT_MS || env?.COIN_GATE_TIMEOUT_MS || 15000));
  let delegatedResponse = null;
  let payload = {};

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const delegatedRequest = buildRoutedRequest(request, "/api/fortune/pig-coin/consume", "POST", delegatedBody);
    try {
      delegatedResponse = await withTimeout(
        handleFortuneRoutes(delegatedRequest, env),
        consumeTimeoutMs,
        "COIN_GATE_CONSUME_TIMEOUT",
      );
      payload = await readPayloadSafe(delegatedResponse);
    } catch (error) {
      payload = {};
      if (attempt >= maxAttempts || !shouldRetryCoinConsumeException(error)) {
        throw error;
      }
      await sleep(120);
      continue;
    }

    if (delegatedResponse.ok) break;
    if (attempt >= maxAttempts) break;
    if (!shouldRetryCoinConsume(delegatedResponse.status, payload)) break;
    await sleep(120);
  }

  return { delegatedResponse, payload };
}

function mapCoinGateFailure(responseStatus, payload) {
  const rawCode = String(toCode(payload) || "").trim().toUpperCase();
  const message = toMessage(payload, "이용권 확인 중 오류가 발생했습니다.");

  if (rawCode === "SERVER_CONFIG_ERROR") {
    return {
      status: 500,
      code: "SERVER_CONFIG_ERROR",
      message: "서버 설정을 확인해 주세요.",
      debugMessage: message,
    };
  }

  // 🔴 가격표 실패를 인증 실패보다 **먼저** 분류한다. worker/routes/fortune.js 의 가격 조회 실패는
  // status 를 `pricing.status || 403` 으로 돌려주는데(같은 파일 2365행), 아래 상태코드 폴드가 403 을
  // 인증 실패로 읽으면 **가격표 설정 오류가 강제 로그아웃으로 둔갑한다.**
  // 코드가 명시적이면 상태코드보다 코드를 믿는다.
  if (
    rawCode === "PRICE_NOT_FOUND"
    || rawCode === "SERVER_PRICE_REQUIRED"
    || rawCode === "UNKNOWN_FEATURE_KEY"
  ) {
    return {
      status: 404,
      code: "PRICE_NOT_FOUND",
      message: "요청한 기능의 서버 가격표를 찾을 수 없습니다.",
      debugMessage: message,
    };
  }

  if (
    responseStatus === 401
    || rawCode === "AUTH_REQUIRED"
    || rawCode === "LOGIN_REQUIRED"
    || rawCode === "UNAUTHORIZED"
  ) {
    return {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "로그인이 필요합니다.",
      debugMessage: message,
    };
  }

  // 🔴 403 을 401 로 세탁하지 않는다. 여기 오는 403 은 인증 실패가 아니다 —
  //   · MISSING_PROFILE_ID (worker/routes/access.js): 프로필을 아직 안 골랐다
  //   · INVALID_ORIGIN     (worker/lib/security/index.js): Origin 헤더가 예상 밖이다
  // 그런데 예전에는 이걸 전부 "로그인이 필요합니다"(401)로 접었고, 클라이언트가 401/403 을
  // handleSessionInvalidated({redirect:true}) 로 처리해서 **멀쩡히 로그인한 사용자가 프로필을
  // 안 골랐다는 이유로 로그아웃당하고 로그인 페이지로 튕겼다.**
  // 원래 코드를 보존해 클라이언트가 "권한/상태 문제"와 "인증 문제"를 구분할 수 있게 한다.
  if (responseStatus === 403) {
    return {
      status: 403,
      code: rawCode || "FORBIDDEN",
      message: rawCode === "MISSING_PROFILE_ID"
        ? "프로필을 먼저 선택해 주세요."
        : "이 요청을 수행할 권한이 없습니다.",
      debugMessage: message,
    };
  }

  if (
    responseStatus === 402
    || rawCode === "INSUFFICIENT_BALANCE"
    || rawCode === "INSUFFICIENT_POINTS"
    || rawCode === "INSUFFICIENT_COINS"
  ) {
    return {
      status: 402,
      code: "PAYMENT_REQUIRED",
      message: "상품별 원화 단건 결제가 필요합니다.",
      debugMessage: message,
    };
  }

  if (
    responseStatus === 404
    || rawCode === "PRICE_NOT_FOUND"
    || rawCode === "SERVER_PRICE_REQUIRED"
    || rawCode === "UNKNOWN_FEATURE_KEY"
  ) {
    return {
      status: 404,
      code: "PRICE_NOT_FOUND",
      message: "요청한 기능의 서버 가격표를 찾을 수 없습니다.",
      debugMessage: message,
    };
  }

  if (responseStatus >= 500) {
    if (rawCode === "SERVICE_UNAVAILABLE") {
      return {
        status: 500,
        code: "SERVER_CONFIG_ERROR",
        message: "서버 설정을 확인해 주세요.",
        debugMessage: message,
      };
    }
    return {
      status: 500,
      code: "SERVER_ERROR",
      message: "서버 처리 중 오류가 발생했습니다.",
      debugMessage: message,
    };
  }

  return {
    status: 400,
    code: "SERVER_ERROR",
    message: "이용권 확인 요청이 거부되었습니다.",
    debugMessage: message,
  };
}

function buildAccessDecision({
  pricing,
  authenticated,
  balance,
  unlockMap,
  subscription,
} = {}) {
  const cost = Number(pricing?.cost || 0);
  const featureKey = String(pricing?.featureKey || "").trim();
  const currentBalance = Number(balance || 0);
  const unlocked = Boolean(featureKey && unlockMap && typeof unlockMap === "object" && unlockMap[featureKey]);
  const subActive = Boolean(subscription?.isActive);
  const subFreeLimit = Number(subscription?.freeLimit || 0);

  if (!Number.isFinite(cost) || cost <= 0) {
    return {
      allowed: true,
      reason: ACCESS_DECISION_REASONS.FREE,
      requiredCoins: 0,
    };
  }

  if (!authenticated) {
    return {
      allowed: false,
      reason: ACCESS_DECISION_REASONS.AUTH_REQUIRED,
      requiredCoins: cost,
    };
  }

  if (unlocked) {
    return {
      allowed: true,
      reason: ACCESS_DECISION_REASONS.ALREADY_UNLOCKED,
      requiredCoins: cost,
    };
  }

  if (subActive && Number.isFinite(subFreeLimit) && cost <= subFreeLimit) {
    return {
      allowed: true,
      reason: ACCESS_DECISION_REASONS.SUBSCRIPTION_ACTIVE,
      requiredCoins: cost,
    };
  }

  return {
    allowed: false,
    reason: ACCESS_DECISION_REASONS.REQUIRES_PURCHASE,
    requiredCoins: cost,
  };
}

async function requireBillingAuth(request, env, pricing = {}) {
  const cost = Number(pricing?.cost || 0);
  const featureKey = String(pricing?.featureKey || "").trim();
  if (Number.isFinite(cost) && cost <= 0 && !featureKey) {
    return { ok: true, auth: null };
  }

  let auth;
  try {
    auth = await resolveBillingRequestAuth(request, env);
  } catch (error) {
    // 로그인 사용자가 DB 풀 초기화 등 일시적 장애로 인증 확인이 안 되는 순간을
    // 확정 401(로그아웃 유발)로 뭉개지 않고 재시도 가능한 503으로 응답한다.
    if (isAuthDbInfraError(error)) {
      logPaidAccessStage("INFRA_503_AUTH", {
        featureKey: String(pricing?.featureKey || ""),
        httpStatus: 503,
        scope: "auth",
        cause: "auth",
        errorName: String(error?.name || ""),
        errorMessage: String(error?.message || ""),
      });
      return {
        ok: false,
        response: failure(
          503,
          "AUTH_STATUS_TEMPORARILY_UNAVAILABLE",
          "로그인 상태를 일시적으로 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
          undefined,
          { retryable: true },
          null,
          // http.js resolveErrorStage 와 같은 라벨을 쓴다 — 결제 503 과 인증 503 을 헤더 하나로 가른다.
          paidAccessRetryableHeaders("auth"),
        ),
      };
    }
    throw error;
  }
  if (auth) {
    return { ok: true, auth };
  }

  return {
    ok: false,
    response: failure(401, "AUTH_REQUIRED", "로그인이 필요합니다."),
  };
}

function isGenericBillingFeatureKey(featureKey) {
  const key = String(featureKey || "").trim().toLowerCase();
  return !key
    || key === "coin-gate-per-use"
    || key === "paid-service"
    || key === "paid_service"
    || key === "default"
    || key === "service";
}

function resolvePricingFromBody(body = {}) {
  const baseInput = {
    categoryKey: body?.categoryKey,
    subFeatureKey: body?.subFeatureKey,
    featureKey: body?.featureKey,
    reason: body?.reason,
    mode: body?.mode,
    reportMode: body?.reportMode,
  };
  const initial = getBillingFeaturePricing(baseInput);
  if (initial?.ok && !isGenericBillingFeatureKey(initial?.pricing?.featureKey)) {
    return initial;
  }

  const featureCandidates = [
    body?.featureKey,
    body?.subFeatureKey,
    body?.paidFeatureKey,
    body?.billingFeatureKey,
    body?.unlockFeatureKey,
    body?.accessFeatureKey,
    body?.serviceKey,
    body?.productId,
    body?.contentKey,
    body?.reportType,
    body?.reportMode,
    body?.mode,
    body?.action,
  ];
  const seen = new Set();
  for (const value of featureCandidates) {
    const candidate = String(value || "").trim();
    const dedupeKey = candidate.toLowerCase();
    if (!candidate || seen.has(dedupeKey) || isGenericBillingFeatureKey(candidate)) continue;
    seen.add(dedupeKey);
    const resolved = getBillingFeaturePricing({
      ...baseInput,
      categoryKey: "",
      subFeatureKey: "",
      featureKey: candidate,
    });
    if (resolved?.ok && !isGenericBillingFeatureKey(resolved?.pricing?.featureKey)) {
      return {
        ...resolved,
        source: `feature-candidate:${resolved.source || "feature"}`,
      };
    }
  }

  return initial;
}

async function processCoinGateFromPricing(request, env, body, pricingResult) {
  const authCheck = await requireBillingAuth(request, env, pricingResult?.pricing || {});
  if (!authCheck.ok) return authCheck.response;

  const enabled = assertFeatureEnabled(pricingResult.pricing);
  if (!enabled.ok) {
    return failure(403, enabled.code || "FEATURE_DISABLED", enabled.message || "현재 이용할 수 없는 기능입니다.");
  }

  const requestId = resolveRequestId(request, body);
  let pricing = pricingResult.pricing;
  const initialCoinCost = resolvePricingCoinCost(pricing);
  const initialAmountKRW = resolvePricingAmountKRW(pricing, initialCoinCost);
  logPaidAccessStage("REQUEST_ID_CREATED", {
    requestId,
    userId: authCheck.auth?.userId,
    featureKey: pricing?.featureKey,
    productId: body?.productId,
    amountCoins: initialCoinCost,
    amountKRW: initialAmountKRW,
    idempotencyKey: body?.idempotencyKey || body?.purchaseId || body?.orderId || requestId,
  });
  logPaidAccessStage("PAID_FLOW_START", {
    requestId,
    userId: authCheck.auth?.userId,
    featureKey: pricing?.featureKey,
    productId: body?.productId,
    paymentMode: String(body?.paymentMode || body?.accessMode || "").trim().toLowerCase(),
    amountCoins: initialCoinCost,
    amountKRW: initialAmountKRW,
    idempotencyKey: body?.idempotencyKey || body?.purchaseId || body?.orderId || requestId,
  });
  const requestedPaymentMode = String(body?.paymentMode || body?.accessMode || "").trim().toLowerCase();
  const pricingFeatureKey = String(pricing?.featureKey || "").trim();
  // featureKey별 예외 분기 금지 — 제외 여부의 정본은 isPassExcludedPricing 하나뿐이다(buildPassPaymentDecision 주석 참고).
  const passExcludedForPricing = isPassExcludedPricing(pricing);
  const directPaymentRequested = shouldCreateDirectPortOneOrder(body);
  const paymentCommand = resolvePaymentCommand({
    paymentMode: requestedPaymentMode,
    directPaymentRequested,
  });
  const membershipPassRequested = paymentCommand.method === PAYMENT_METHODS.MEMBERSHIP_PASS;
  const membershipPassOnly = membershipPassRequested && !passExcludedForPricing;
  const monthlyBalanceRequested = paymentCommand.method === PAYMENT_METHODS.MONTHLY;
  const coinPaymentRequested = isExplicitLegacyCoinPaymentMode(requestedPaymentMode);
  const deferUsage = isDeferredUsageRequested(body);
  const knownPaymentMode = !requestedPaymentMode
    || requestedPaymentMode === "single_purchase"
    || membershipPassRequested
    || monthlyBalanceRequested
    || directPaymentRequested
    || coinPaymentRequested;
  if (!knownPaymentMode) {
    return failure(400, "UNKNOWN_PAYMENT_METHOD", "알 수 없는 결제 수단입니다.", undefined, {
      paymentMode: requestedPaymentMode,
    });
  }
  // 이 가드는 음악 트랙 전용이 아니다 — PASS_EXCLUDED_FEATURE_KEYS(프로필 카드 추가/삭제)와
  // 음악 트랙이 같은 판정(isPassExcludedPricing)을 공유하므로 문구도 기능 중립이어야 한다.
  if (membershipPassRequested && passExcludedForPricing) {
    return failure(402, "MEMBERSHIP_PASS_NOT_ALLOWED", "이 기능은 이용권으로 결제할 수 없습니다. 단건 결제 또는 월정석으로 이용해 주세요.", undefined, {
      pricing,
      paymentOptions: buildPassPaymentDecision(null, pricing, null),
      accessGrant: null,
      balance: null,
    });
  }
  logPaidAccessStage("REQUEST_START", {
    requestId,
    userId: authCheck.auth?.userId,
    featureKey: pricing?.featureKey,
    productId: body?.productId,
    paymentMode: requestedPaymentMode,
    amountCoins: Number(pricing?.coinPrice || pricing?.cost || 0),
    amountKRW: calculateKrwAmountFromCoins(Number(pricing?.coinPrice || pricing?.cost || 0)),
    idempotencyKey: body?.idempotencyKey || body?.purchaseId || body?.orderId || requestId,
  });
  logPaidAccessStage("PAID_ACCESS_REQUEST_START", {
    requestId,
    userId: authCheck.auth?.userId,
    featureKey: pricing?.featureKey,
    productId: body?.productId,
    paymentMode: requestedPaymentMode,
    amountCoins: Number(pricing?.coinPrice || pricing?.cost || 0),
    amountKRW: calculateKrwAmountFromCoins(Number(pricing?.coinPrice || pricing?.cost || 0)),
    idempotencyKey: body?.idempotencyKey || body?.purchaseId || body?.orderId || requestId,
  });
  logPaidAccessStage("AUTH_CHECK_SUCCESS", {
    requestId,
    userId: authCheck.auth?.userId,
    featureKey: pricing?.featureKey,
    paymentMode: requestedPaymentMode,
  });
  const shouldLoadMembershipPass = shouldVerifyMembershipPass(paymentCommand.method);

  const reportId = String(body?.reportId || body?.accessGrant?.reportId || "").trim();
  const reportSessionId = String(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || resolvePaidReportSessionFallback(pricing, reportId, requestId)).trim();
  const persistProfileUnlockEntitlement = shouldPersistProfileUnlockEntitlement(pricing);
  // 이용권/프로필 조회(READ)도 일시적 풀 초기화(MongoPoolClearedError)에 '일시 불가'로
  // 떨어지지 않도록 재시도로 감싼다(재시도 소진 시 degrade 마커는 기존 유지).
  const lookupStartedAt = Date.now();
  const resolveProfileIdFromDb = () => withMongoRetry(env, () => withDbAccessTimeout(
    resolveBillingProfileId(authCheck.auth.userId, body, env, authCheck.auth.authUserDoc || null),
    PAID_ACCESS_DECISION_DB_TIMEOUT_MS,
    "COIN_GATE_PROFILE_RESOLVE_TIMEOUT",
  )).catch((error) => {
    if (!isDatabaseUnavailableError(error)) {
      throw error;
    }
    return createPassLookupUnavailableMarker("profile_lookup", error);
  });
  // 🔴 여기를 withMongoRetry 로 감싸지 않는다. getMembershipPassForBillingRequest 는 안쪽 모든 DB 읽기가
  // 이미 각자 재시도를 갖는다(getActiveMembershipPassForUser 의 User 읽기 · auth.js 인증 읽기 ·
  // fortune.js 구독상태). 밖에서 또 감싸면 레벨당 2회 × 2레벨 = 4시도 / 최대 4회 재연결이 되어
  // 결제 임계경로가 그만큼 느려진다. 타임아웃 상한과 degrade 마커는 그대로 유지한다.
  const subscriptionPassPromise = shouldLoadMembershipPass && authCheck?.auth?.userId ? withDbAccessTimeout(
    getMembershipPassForBillingRequest(
      request,
      env,
      authCheck.auth.userId,
      // 인증 단계가 이미 읽은 문서를 넘겨 같은 User 를 다시 읽지 않는다(결제 임계경로 왕복 1회 제거).
      authCheck.auth.authUserDoc || null,
    ),
    PAID_PASS_DECISION_DB_TIMEOUT_MS,
    "COIN_GATE_PASS_RESOLVE_TIMEOUT",
  ).catch((error) => {
    if (!isDatabaseUnavailableError(error)) {
      throw error;
    }
    return createPassLookupUnavailableMarker("membership_pass_lookup", error);
  }) : Promise.resolve(null);
  const subscriptionPassLookupResult = await subscriptionPassPromise;
  // 🔴 중복 User 조회 제거: 예전에는 프로필 id 조회와 이용권 조회가 **같은 User 문서**를 projection 만 달리해
  // 두 번 읽었다(병렬이라 지연은 가려졌지만 왕복은 2회). 이용권 조회가 방금 DB 를 읽었다면 그 문서에 실려 온
  // destinyProfilesCurrentId 를 그대로 쓴다. 캐시 히트(__userDocFresh !== true)는 stale 일 수 있어 재사용하지
  // 않고 기존대로 조회하며, 이용권 조회가 실패(marker)면 어차피 아래에서 503 으로 끝나므로 조회하지 않는다.
  const explicitBillingProfileId = cleanProfileId(
    body?.profileId || body?.selectedProfileId || body?.profile?.profileId || body?.profile?.id,
  );
  let profileLookupResult = "";
  if (authCheck?.auth?.userId && !isPassLookupUnavailableMarker(subscriptionPassLookupResult)) {
    if (explicitBillingProfileId) {
      profileLookupResult = explicitBillingProfileId;
    } else if (subscriptionPassLookupResult?.__userDocFresh === true) {
      profileLookupResult = cleanProfileId(subscriptionPassLookupResult.destinyProfilesCurrentId);
    } else {
      profileLookupResult = await resolveProfileIdFromDb();
    }
  }
  const lookupElapsedMs = Date.now() - lookupStartedAt;
  const lookupUnavailable = isPassLookupUnavailableMarker(profileLookupResult)
    ? profileLookupResult
    : (isPassLookupUnavailableMarker(subscriptionPassLookupResult) ? subscriptionPassLookupResult : null);
  if (lookupUnavailable) {
    logPaidAccessStage("INFRA_503_PASS_LOOKUP", {
      requestId,
      userId: authCheck.auth.userId,
      featureKey: pricing?.featureKey,
      httpStatus: 503,
      scope: lookupUnavailable.scope,
      cause: paidAccessErrorStage(lookupUnavailable.error),
      elapsedMs: lookupElapsedMs,
      errorName: String(lookupUnavailable.error?.name || ""),
      errorMessage: String(lookupUnavailable.error?.message || ""),
    });
    return buildPassStatusTemporarilyUnavailableFailure(pricing, {
      scope: lookupUnavailable.scope,
      cause: paidAccessErrorStage(lookupUnavailable.error),
      errorDetails: buildBillingErrorDetails("coin-gate-pass-lookup", lookupUnavailable.error, {
        featureKey: String(pricing?.featureKey || ""),
        requestId,
        paymentMode: requestedPaymentMode || undefined,
      }),
    });
  }
  const profileId = profileLookupResult;
  const subscriptionPassForDecision = subscriptionPassLookupResult || createInactiveMembershipPass();
  if (shouldLoadMembershipPass) {
    pricing = applyPdfPassDiscountToPricing(pricing, subscriptionPassForDecision.entitlement || {});
  }
  const featurePolicyDecision = buildPassPaymentDecision(
    subscriptionPassForDecision?.entitlement,
    pricing,
    subscriptionPassForDecision?.profileSubscription,
  );
  logPaidAccessStage("FEATURE_POLICY_LOADED", {
    requestId,
    userId: authCheck.auth.userId,
    featureKey: pricing?.featureKey,
    productId: body?.productId,
    amountCoins: Number(pricing?.coinPrice || pricing?.cost || 0),
    amountKRW: calculateKrwAmountFromCoins(Number(pricing?.coinPrice || pricing?.cost || 0)),
    passEligible: featurePolicyDecision.canUseByPass,
    passTier: featurePolicyDecision.passTier,
    passLimit: featurePolicyDecision.passLimit,
    idempotencyKey: body?.idempotencyKey || body?.purchaseId || body?.orderId || requestId,
  });
  const scopedBody = profileId ? { ...body, profileId, selectedProfileId: profileId } : body;
  if (persistProfileUnlockEntitlement && !profileId) {
    return failure(403, "MISSING_PROFILE_ID", "Profile selection is required before unlocking this paid section.", undefined, {
      pricing,
      reason: "missing_profile_id",
      accessGrant: null,
      paymentOptions: buildPassPaymentDecision(
        subscriptionPassForDecision?.entitlement,
        pricing,
        subscriptionPassForDecision?.profileSubscription,
      ),
      requiresProfile: true,
    });
  }
  let paymentDecision = buildPassPaymentDecision(null, pricing, null);
  let accessDecision = buildPaidContentAccessDecision({
    reason: "payment_required",
    shouldOpenPaymentSelector: true,
    priceCoin: Number(pricing?.coinPrice || pricing?.cost || 0),
    paymentOptions: paymentDecision,
  });
  let accessDecisionElapsedMs = 0;
  if (persistProfileUnlockEntitlement) {
    logPaidAccessStage("ACCESS_CHECK_START", {
      requestId,
      userId: authCheck.auth.userId,
      featureKey: pricing?.featureKey,
      profileId,
      paymentMode: requestedPaymentMode,
      amountCoins: Number(pricing?.coinPrice || pricing?.cost || 0),
      amountKRW: calculateKrwAmountFromCoins(Number(pricing?.coinPrice || pricing?.cost || 0)),
    });
    logPaidAccessStage("PASS_CHECK_START", {
      requestId,
      userId: authCheck.auth.userId,
      featureKey: pricing?.featureKey,
      profileId,
      paymentMode: requestedPaymentMode,
      amountCoins: Number(pricing?.coinPrice || pricing?.cost || 0),
      amountKRW: calculateKrwAmountFromCoins(Number(pricing?.coinPrice || pricing?.cost || 0)),
      passEligible: featurePolicyDecision.canUseByPass,
      passTier: featurePolicyDecision.passTier,
      passLimit: featurePolicyDecision.passLimit,
      idempotencyKey: body?.idempotencyKey || body?.purchaseId || body?.orderId || requestId,
    });
    const accessDecisionStartedAt = Date.now();
    accessDecision = await resolvePaidContentAccess(env, {
      userId: authCheck.auth.userId,
      profileId,
      pricing,
      requestId,
      requestedPaymentMode,
      allowPassAutoUnlock: false,
      subscriptionPass: subscriptionPassForDecision,
      // 인증 조회가 이미 읽어 온 User.unlockedFeatures 원본을 넘겨 같은 필드의 User.exists 왕복을 없앤다
      // (BILLING_SNAPSHOT_USER_PROJECTION에 unlockedFeatures가 포함돼 있다). 배열이 아니면 null로 넘겨
      // 기존 User.exists 폴백을 그대로 태운다 — 빈 배열로 넘기면 오탐 거부가 난다.
      accountUnlockedFeatures: Array.isArray(authCheck.auth.authUserDoc?.unlockedFeatures)
        ? authCheck.auth.authUserDoc.unlockedFeatures
        : null,
      body: scopedBody,
    });
    accessDecisionElapsedMs = Date.now() - accessDecisionStartedAt;
  }
  if (isTemporaryUnavailableAccessDecision(accessDecision)) {
    logPaidAccessStage("INFRA_503_ACCESS_DECISION", {
      requestId,
      userId: authCheck.auth.userId,
      featureKey: pricing?.featureKey,
      profileId: profileId || undefined,
      httpStatus: 503,
      scope: accessDecision.scope || "coin_gate_access_decision",
      cause: accessDecision.cause || "",
      elapsedMs: accessDecisionElapsedMs,
      errorName: String(accessDecision.errorDetails?.name || ""),
      errorMessage: String(accessDecision.errorDetails?.message || accessDecision.reason || ""),
    });
    return buildPassStatusTemporarilyUnavailableFailure(pricing, {
      profileId: profileId || undefined,
      profileSubscription: subscriptionPassForDecision?.profileSubscription || null,
      paymentOptions: accessDecision.paymentOptions || undefined,
      scope: accessDecision.scope || "coin_gate_access_decision",
      cause: accessDecision.cause,
      errorDetails: accessDecision.errorDetails || null,
    });
  }

  if (accessDecision.paymentOptions) {
    paymentDecision = membershipPassOnly
      ? {
        ...accessDecision.paymentOptions,
        monthlyBalance: 0,
        canUseByMonthly: false,
        canUseByCard: false,
        recommendedMethods: accessDecision.paymentOptions.canUseByPass ? ["PASS"] : [],
        equalPriorityMethods: [],
      }
      : accessDecision.paymentOptions;
  }
  if (accessDecision.reason === "already_unlocked" || accessDecision.reason === "pass_covered") {
    if (deferUsage && accessDecision.reason === "pass_covered") {
      return createDeferredUsageGrant(env, authCheck.auth.userId, pricing, requestId, {
        body: scopedBody,
        profileId,
        paymentMethod: "PASS",
        accessType: "membership_pass",
        source: "pre_usage",
      });
    }
    let passUnlockEntitlement = null;
    if (accessDecision.reason === "pass_covered" && persistProfileUnlockEntitlement) {
      try {
        logPaidAccessStage("UNLOCK_SAVE_START", {
          requestId,
          userId: authCheck.auth.userId,
          featureKey: pricing?.featureKey,
          profileId,
          accessMethod: "pass",
          paymentMethod: "PASS",
          amountCoins: Number(pricing?.coinPrice || pricing?.cost || 0),
          passTier: paymentDecision.passTier,
          passLimit: paymentDecision.passLimit,
          idempotencyKey: requestId,
        });
        passUnlockEntitlement = await upsertSajuProfileUnlockEntitlement(env, {
          userId: authCheck.auth.userId,
          profileId,
          featureKey: pricing.featureKey,
          contentKey: body?.contentKey,
          source: CONTENT_ENTITLEMENT_SOURCES.PASS,
          passId: `membership:${subscriptionPassForDecision?.tier || paymentDecision.passTier || "pass"}:${requestId}`,
          coinAmount: 0,
        });
        logPaidAccessStage("UNLOCK_SAVE_SUCCESS", {
          requestId,
          userId: authCheck.auth.userId,
          featureKey: pricing?.featureKey,
          profileId,
          accessMethod: "pass",
          paymentMethod: "PASS",
          amountCoins: Number(pricing?.coinPrice || pricing?.cost || 0),
          passTier: paymentDecision.passTier,
          passLimit: paymentDecision.passLimit,
          unlockId: String(passUnlockEntitlement?._id || ""),
          idempotencyKey: requestId,
        });
      } catch (error) {
        return failure(
          error?.code === "MISSING_PROFILE_ID" ? 403 : 500,
          "UNLOCK_ENTITLEMENT_SAVE_FAILED",
          "Unlock entitlement could not be saved after pass access.",
          String(error?.message || ""),
          {
            pricing,
            pendingUnlock: true,
            settlement: {
              source: "PASS",
              requestId,
              profileId: profileId || undefined,
            },
          },
        );
      }
    }
    const resolvedUnlockId = String(passUnlockEntitlement?._id || accessDecision.unlockId || "");
    const resolvedAccessDecision = passUnlockEntitlement?._id
      ? { ...accessDecision, accessGranted: true, unlockId: String(passUnlockEntitlement._id || "") }
      : accessDecision;
    logPaidAccessStage(accessDecision.reason === "already_unlocked" ? "EXISTING_UNLOCK_FOUND" : "PASS_FEATURE_ELIGIBLE", {
      requestId,
      userId: authCheck.auth.userId,
      featureKey: pricing?.featureKey,
      profileId,
      accessMethod: accessDecision.reason === "pass_covered" ? "pass" : "already_unlocked",
      amountCoins: Number(pricing?.coinPrice || pricing?.cost || 0),
      amountKRW: calculateKrwAmountFromCoins(Number(pricing?.coinPrice || pricing?.cost || 0)),
      passEligible: accessDecision.reason === "pass_covered",
      passTier: paymentDecision.passTier,
      passLimit: paymentDecision.passLimit,
      unlockId: resolvedUnlockId,
      orderId: resolvedUnlockId || requestId,
      idempotencyKey: requestId,
    });
    logPaidAccessStage(accessDecision.reason === "already_unlocked" ? "ACCESS_ALREADY_UNLOCKED" : "PASS_GRANTED", {
      requestId,
      userId: authCheck.auth.userId,
      featureKey: pricing?.featureKey,
      profileId,
      accessMethod: accessDecision.reason === "pass_covered" ? "pass" : "already_unlocked",
      amountCoins: Number(pricing?.coinPrice || pricing?.cost || 0),
      amountKRW: calculateKrwAmountFromCoins(Number(pricing?.coinPrice || pricing?.cost || 0)),
      passEligible: accessDecision.reason === "pass_covered",
      passTier: paymentDecision.passTier,
      passLimit: paymentDecision.passLimit,
      unlockId: resolvedUnlockId,
      orderId: resolvedUnlockId || requestId,
      idempotencyKey: requestId,
    });
    const accessType = accessDecision.reason === "already_unlocked" ? "already_unlocked" : "membership_pass";
    return await successWithPremiumAccess(env, authCheck.auth.userId, {
      pricing,
      ...paymentDecision,
      paymentOptions: paymentDecision,
      alreadyUnlocked: accessDecision.reason === "already_unlocked",
      accessMethod: accessDecision.reason === "pass_covered" ? "PASS" : undefined,
      consume: {
        ok: true,
        transactionType: accessDecision.reason === "already_unlocked" ? "unlock_entitlement" : "membership_pass",
        accessType,
        accessMethod: accessDecision.reason === "pass_covered" ? "PASS" : undefined,
        paymentMethod: accessDecision.reason === "pass_covered" ? "PASS" : undefined,
        requestId,
        featureKey: String(pricing.featureKey || ""),
        profileId: profileId || undefined,
        chargedCoins: 0,
        membershipCreditCost: 0,
      },
      accessGrant: {
        ok: true,
        accessType,
        accessMethod: accessDecision.reason === "pass_covered" ? "PASS" : undefined,
        featureKey: String(pricing.featureKey || ""),
        sessionId: reportSessionId || undefined,
        requestId,
        purchaseId: resolvedUnlockId || requestId,
        evidenceId: resolvedUnlockId,
        unlockGrant: passUnlockEntitlement?.unlockGrant || null,
        reportId: reportId || undefined,
        profileId: profileId || undefined,
        paidAt: new Date().toISOString(),
      },
      accessDecision: resolvedAccessDecision,
      unlockedFeatures: [String(pricing.featureKey || "")],
      unlockMap: { [String(pricing.featureKey || "")]: true },
      balance: null,
      membershipPass: accessDecision.reason === "pass_covered" && subscriptionPassForDecision ? {
        tier: subscriptionPassForDecision.tier,
        passTier: subscriptionPassForDecision.passTier,
        freeLimit: subscriptionPassForDecision.freeLimit,
        passLimit: subscriptionPassForDecision.passLimit || subscriptionPassForDecision.freeLimit,
        maxCoveredCoin: subscriptionPassForDecision.maxCoveredCoin || subscriptionPassForDecision.passLimit || subscriptionPassForDecision.freeLimit,
      } : undefined,
      user: {
        id: String(authCheck.auth.userId || ""),
        profileSubscription: subscriptionPassForDecision?.profileSubscription || null,
      },
      freeBySubscription: accessDecision.reason === "pass_covered",
    }, accessDecision.reason === "already_unlocked" ? "ALREADY_UNLOCKED" : "PASS_FREE");
  }
  if (accessDecision.reason === "invalid_profile") {
    return failure(403, "INVALID_PROFILE", "Profile access could not be verified.", undefined, {
      pricing,
      accessDecision,
    });
  }
  if (accessDecision.reason === "error") {
    return failure(500, "ACCESS_DECISION_ERROR", "Paid content access could not be verified.", undefined, {
      pricing,
      accessDecision,
    });
  }
  const passBlockedByAccessDecision = accessDecision.reason === "profile_limit_exceeded"
    || accessDecision.reason === "price_exceeds_pass_limit";

  if (authCheck?.auth?.userId) {
    const subscriptionPass = subscriptionPassForDecision || {
      isActive: false,
      entitlement: {},
      profileSubscription: null,
      tier: "free",
      passTier: null,
      freeLimit: 0,
    };
    const coinPrice = resolvePricingCoinCost(pricing);
    paymentDecision = buildPassPaymentDecision(
      subscriptionPass.entitlement,
      pricing,
      subscriptionPass.profileSubscription,
    );
    if (!directPaymentRequested && !monthlyBalanceRequested && paymentDecision.canUseByPass && !passBlockedByAccessDecision) {
      logPaidAccessStage("PASS_ACTIVE_FOUND", {
        requestId,
        userId: authCheck.auth.userId,
        featureKey: pricing?.featureKey,
        profileId,
        accessMethod: "pass",
        paymentMethod: "PASS",
        amountCoins: Number(pricing?.coinPrice || pricing?.cost || 0),
        amountKRW: calculateKrwAmountFromCoins(Number(pricing?.coinPrice || pricing?.cost || 0)),
        passEligible: true,
        passTier: paymentDecision.passTier,
        passLimit: paymentDecision.passLimit,
        idempotencyKey: requestId,
      });
      if (deferUsage) {
        return createDeferredUsageGrant(env, authCheck.auth.userId, pricing, requestId, {
          body: scopedBody,
          profileId,
          paymentMethod: paymentDecision.passTier === "family" ? "FAMILY" : "PASS",
          accessType: paymentDecision.passTier === "family" ? "family" : "membership_pass",
          source: "pre_usage",
        });
      }
      const tierPassConsume = await consumeTierPassIfAvailable(env, authCheck.auth.userId, pricing, requestId, scopedBody, { profileId });
      if (!tierPassConsume?.ok) {
        logPaidAccessStage("PASS_DENIED", {
          requestId,
          userId: authCheck.auth.userId,
          featureKey: pricing?.featureKey,
          profileId,
          accessMethod: "pass",
          paymentMethod: "PASS",
          amountCoins: resolvePricingCoinCost(pricing),
          amountKRW: resolvePricingAmountKRW(pricing, resolvePricingCoinCost(pricing)),
          passEligible: false,
          passTier: paymentDecision.passTier,
          passLimit: paymentDecision.passLimit,
          idempotencyKey: requestId,
        });
      } else {
        logPaidAccessStage(tierPassConsume.idempotent ? "PASS_ACCESS_DUPLICATE_RETURNED" : "PASS_ACCESS_GRANTED", {
          requestId,
          userId: authCheck.auth.userId,
          featureKey: pricing?.featureKey,
          profileId,
          accessMethod: tierPassConsume.accessMethod,
          paymentMethod: tierPassConsume.accessMethod === "family" ? "FAMILY" : "PASS",
          amountCoins: tierPassConsume.coinCost,
          amountKRW: tierPassConsume.amountKRW,
          passEligible: true,
          passTier: tierPassConsume.passTier,
          passLimit: paymentDecision.passLimit,
          idempotencyKey: tierPassConsume.idempotencyKey || requestId,
        });
      let passEvidence = null;
      try {
        // 🔴 재시도 추가(2026-08-08). recordPassAccessIfNeeded 는 connectDb + PointHistory.findOne
        // + User.findById + PointHistory.create 를 무방비로 연달아 돈다. 한 번의 Mongo 블립이 그대로
        // passEvidenceFailure → 503 PAID_ACCESS_VERIFY_RETRYABLE 이 됐고, 그 시점엔 이용권이 이미
        // 소진된 뒤라 사용자는 "이용권을 썼는데 실패"를 본다. FAMILY 등급만 이 경로를 타므로
        // (recordPassAccessIfNeeded 의 조기 반환) 300코인 초융합처럼 family 전용 커버 기능에 집중됐다.
        // 재시도가 중복 기록을 만들지 않는 근거: 같은 함수가 metadata.requestId 로 기존 기록을 먼저
        // 조회해 있으면 그대로 돌려준다(멱등).
        // 🔴 여기에 withDbAccessTimeout 을 겹치지 않는다 — withMongoRetry 가 이미 시도마다 상한을
        // 걸고(db.js attemptTimeoutMS, 하한 11.5s) 그게 이 조회에 맞는 유일한 예산이다. 밖에서 또
        // 감싸면 둘 중 짧은 쪽이 드라이버를 앞질러 자르는 예전 패턴이 그대로 재발한다.
        // 중첩 아님: 이 호출부는 어떤 withMongoRetry 안에도 없고 함수 내부에도 재시도가 없다
        // (verify:no-nested-retry 로 재확인).
        passEvidence = await withMongoRetry(env, () => recordPassAccessIfNeeded(env, authCheck.auth.userId, pricing, requestId, {
          ...scopedBody,
          reportId,
          sessionId: reportSessionId,
          reportSessionId,
          accessMethod: tierPassConsume.accessMethod === "family" ? "FAMILY" : "PASS",
        }, {
          ...subscriptionPass.entitlement,
          passTier: tierPassConsume.passTier,
        }, authCheck.auth?.authUserDoc?.points));
      } catch (error) {
        logBillingRouteError("pass-access-record", error, request, {
          featureKey: String(pricing?.featureKey || ""),
          requestId,
          profileId: profileId || undefined,
        });
        return passEvidenceFailure(error, { pricing, requestId, profileId });
      }
      let unlockEntitlement = null;
      if (persistProfileUnlockEntitlement) {
        try {
          logPaidAccessStage("UNLOCK_SAVE_START", {
            requestId,
            userId: authCheck.auth.userId,
            featureKey: pricing?.featureKey,
            profileId,
            accessMethod: "pass",
            paymentMethod: "PASS",
            amountCoins: Number(pricing?.coinPrice || pricing?.cost || 0),
            passEligible: true,
            passTier: paymentDecision.passTier,
            passLimit: paymentDecision.passLimit,
            orderId: String(passEvidence?._id || requestId),
            idempotencyKey: requestId,
          });
          unlockEntitlement = await upsertSajuProfileUnlockEntitlement(env, {
            userId: authCheck.auth.userId,
            profileId,
            featureKey: pricing.featureKey,
            contentKey: body?.contentKey,
            source: CONTENT_ENTITLEMENT_SOURCES.PASS,
            passId: `membership:${subscriptionPass.tier}:${requestId}`,
            coinAmount: 0,
          });
          logPaidAccessStage("UNLOCK_SAVE_SUCCESS", {
            requestId,
            userId: authCheck.auth.userId,
            featureKey: pricing?.featureKey,
            profileId,
            accessMethod: "pass",
            paymentMethod: "PASS",
            amountCoins: Number(pricing?.coinPrice || pricing?.cost || 0),
            passEligible: true,
            passTier: paymentDecision.passTier,
            passLimit: paymentDecision.passLimit,
            unlockId: String(unlockEntitlement?._id || ""),
            orderId: String(passEvidence?._id || requestId),
            idempotencyKey: requestId,
          });
        } catch (error) {
          return failure(
            error?.code === "MISSING_PROFILE_ID" ? 403 : 500,
            "UNLOCK_ENTITLEMENT_SAVE_FAILED",
            "Unlock entitlement could not be saved.",
            String(error?.message || ""),
            {
              pricing,
              pendingUnlock: true,
              accessGrant: {
                featureKey: String(pricing.featureKey || ""),
                requestId,
                evidenceId: String(passEvidence?._id || ""),
                profileId: profileId || undefined,
              },
            },
          );
        }
      }
      return await successWithPremiumAccess(env, authCheck.auth.userId, {
        pricing,
        ...paymentDecision,
        paymentOptions: paymentDecision,
        accessMethod: "PASS",
        charged: 0,
        consume: {
          ok: true,
          transactionType: tierPassConsume.transactionType || "membership_pass",
          accessType: tierPassConsume.accessType || "membership_pass",
          accessMethod: tierPassConsume.accessMethod === "family" ? "FAMILY" : "PASS",
          paymentMethod: tierPassConsume.accessMethod === "family" ? "FAMILY" : "PASS",
          requestId,
          featureKey: String(pricing.featureKey || ""),
          coinPrice: tierPassConsume.coinCost,
          amountCoins: tierPassConsume.coinCost,
          amountKRW: tierPassConsume.amountKRW,
          passTier: tierPassConsume.passTier,
          idempotent: Boolean(tierPassConsume.idempotent),
          chargedCoins: 0,
          membershipCreditCost: 0,
        },
        premiumAccessToken: null,
        accessGrant: {
          ok: true,
          accessType: tierPassConsume.accessType || "membership_pass",
          featureKey: String(pricing.featureKey || ""),
          sessionId: reportSessionId || undefined,
          requestId,
          purchaseId: requestId,
          evidenceId: String(unlockEntitlement?._id || passEvidence?._id || `membership:${subscriptionPass.tier}:${requestId}`),
          unlockGrant: unlockEntitlement?.unlockGrant || null,
          reportId: reportId || undefined,
          profileId: profileId || undefined,
          paidAt: new Date().toISOString(),
          accessMethod: tierPassConsume.accessMethod === "family" ? "FAMILY" : "PASS",
        },
        balance: null,
        membershipPass: {
          tier: subscriptionPass.tier,
          passTier: subscriptionPass.passTier,
          freeLimit: subscriptionPass.freeLimit,
          passLimit: subscriptionPass.passLimit || subscriptionPass.freeLimit,
          maxCoveredCoin: subscriptionPass.maxCoveredCoin || subscriptionPass.passLimit || subscriptionPass.freeLimit,
        },
        user: {
          id: String(authCheck.auth.userId || ""),
          profileSubscription: subscriptionPass.profileSubscription || null,
        },
        freeBySubscription: true,
      }, "이용권 무료 한도 조건으로 서비스를 열었습니다.");
      }
    }

    if (membershipPassOnly) {
      const passFailureCode = accessDecision.reason === "profile_limit_exceeded"
        ? "PROFILE_LIMIT_EXCEEDED"
        : (accessDecision.reason === "price_exceeds_pass_limit" ? "PRICE_EXCEEDS_PASS_LIMIT" : "MEMBERSHIP_PASS_NOT_COVERED");
      return failure(402, passFailureCode, "현재 이용권 한도 밖 서비스입니다. 원화 단건 결제로 이용해 주세요.", undefined, {
        pricing,
        ...paymentDecision,
        paymentOptions: paymentDecision,
        accessGrant: null,
        balance: null,
        membershipPass: {
          tier: subscriptionPass.tier,
          passTier: subscriptionPass.passTier,
          freeLimit: subscriptionPass.freeLimit,
          passLimit: subscriptionPass.passLimit || subscriptionPass.freeLimit,
          maxCoveredCoin: subscriptionPass.maxCoveredCoin || subscriptionPass.passLimit || subscriptionPass.freeLimit,
        },
        membershipPassDebug: {
          detectedTier: subscriptionPass.tier,
          passTier: subscriptionPass.passTier,
          freeLimit: subscriptionPass.freeLimit,
          passLimit: paymentDecision.passLimit,
          requestedCoinPrice: Number(pricing?.coinPrice || pricing?.cost || 0),
          hasActivePass: paymentDecision.hasActivePass,
          canUseByPass: paymentDecision.canUseByPass,
          status: subscriptionPass.profileSubscription?.status
            || subscriptionPass.profileSubscription?.subscriptionStatus
            || subscriptionPass.profileSubscription?.membershipStatus
            || null,
          expiresAt: subscriptionPass.profileSubscription?.expiresAt || null,
        },
      });
    }

    if (monthlyBalanceRequested) {
      try {
      logPaidAccessStage("PAYMENT_METHOD_SELECTED", {
        requestId,
        userId: authCheck.auth.userId,
        featureKey: pricing?.featureKey,
        profileId,
        accessMethod: "monthly",
        paymentMethod: requestedPaymentMode || "monthly",
        amountCoins: Number(pricing?.coinPrice || pricing?.cost || 0),
        amountKRW: calculateKrwAmountFromCoins(Number(pricing?.coinPrice || pricing?.cost || 0)),
        monthlyRequiredAmount: calculateMembershipCreditCost(Number(pricing?.coinPrice || pricing?.cost || 0)),
        idempotencyKey: body?.idempotencyKey || body?.purchaseId || body?.orderId || requestId,
      });
      logPaidAccessStage("MONTHLY_BALANCE_CHECK_START", {
        requestId,
        userId: authCheck.auth.userId,
        featureKey: pricing?.featureKey,
        profileId,
        accessMethod: "monthly",
        paymentMethod: requestedPaymentMode || "monthly",
        monthlyRequiredAmount: calculateMembershipCreditCost(Number(pricing?.coinPrice || pricing?.cost || 0)),
        idempotencyKey: body?.idempotencyKey || body?.purchaseId || body?.orderId || requestId,
      });
      logPaidAccessStage("MONTHLY_PROCESSING_START", {
        requestId,
        userId: authCheck.auth.userId,
        featureKey: pricing?.featureKey,
        profileId,
        accessMethod: "monthly",
        paymentMethod: requestedPaymentMode || "monthly",
        amountCoins: resolvePricingCoinCost(pricing),
        amountKRW: resolvePricingAmountKRW(pricing, resolvePricingCoinCost(pricing)),
        monthlyRequiredAmount: resolveMonthlyCreditCostForBilling(pricing, scopedBody),
        idempotencyKey: body?.idempotencyKey || body?.purchaseId || body?.orderId || requestId,
      });
      if (deferUsage) {
        const requiredMonthlyCredits = resolveMonthlyCreditCostForBilling(pricing, scopedBody);
        const currentUser = await User.findById(authCheck.auth.userId).select("profileSubscription points").lean();
        // 스칼라가 아니라 lot 정본으로 판정한다(만료 lot 제외) — 아래 실제 차감(deductLotsFIFO)과 같은 기준.
        const monthlyCredits = Math.max(0, Math.floor(Number(
          ensureLotsForBalance(currentUser?.profileSubscription || {}, Date.now()).balance || 0,
        )));
        if (monthlyCredits < requiredMonthlyCredits) {
          return failure(402, "INSUFFICIENT_MONTHLY_CREDITS", "이용권 선택액이 부족합니다.", undefined, {
            pricing,
            requiredMonthlyCredits,
            currentMonthlyCredits: monthlyCredits,
            membershipCreditBalance: monthlyCredits,
            canUseByCard: true,
          });
        }
        return createDeferredUsageGrant(env, authCheck.auth.userId, pricing, requestId, {
          body: scopedBody,
          profileId,
          paymentMethod: "MONTHLY",
          accessType: "membership_credit",
          source: "pre_usage",
        });
      }
      if (persistProfileUnlockEntitlement) {
        logPaidAccessStage("UNLOCK_SAVE_START", {
          requestId,
          userId: authCheck.auth.userId,
          featureKey: pricing?.featureKey,
          profileId,
          accessMethod: "monthly",
          paymentMethod: "MONTHLY",
          amountCoins: resolvePricingCoinCost(pricing),
          monthlyRequiredAmount: resolveMonthlyCreditCostForBilling(pricing, scopedBody),
          idempotencyKey: body?.idempotencyKey || body?.purchaseId || body?.orderId || requestId,
          scope: "monthly_atomic_transaction",
        });
      }
      // 🔴 이 파일의 다른 읽기 경로(resolvePaidContentAccess 등)는 withMongoRetry로 감싸 트랜지언트 DB
      // 오류를 자동 재시도하고 admission gate에도 정상 계정된다. 이 월정석 소비 경로만 원시 호출이라
      // 풀 경합 순간 재시도 없이 바로 실패하고, 그 실패가 아래 catch에서 미분류 500 또는(USER_NOT_FOUND는)
      // 401 AUTH_REQUIRED로 잘못 표면화됐다 — 로그인 중인 사용자가 "로그인이 필요합니다"를 보는 원인.
      // purchaseId/recentConsumeRequestIds 멱등성이 이미 있어 재시도로 인한 이중 차감 위험은 없다.
      const membershipConsume = await withMongoRetry(env, () => consumeMembershipCreditIfAvailable(env, authCheck.auth.userId, pricing, requestId, {
        ...scopedBody,
        reportId,
        sessionId: reportSessionId,
        reportSessionId,
      }, {
        atomicUnlock: persistProfileUnlockEntitlement
          ? async ({ session, history, ledger, purchaseId }) => upsertSajuProfileUnlockEntitlement(env, {
            userId: authCheck.auth.userId,
            profileId,
            featureKey: pricing.featureKey,
            contentKey: scopedBody?.contentKey,
            source: CONTENT_ENTITLEMENT_SOURCES.MONTHLY,
            orderId: purchaseId || requestId,
            paymentId: String(history?._id || ledger?._id || requestId),
            coinAmount: resolvePricingCoinCost(pricing),
            session,
          })
          : null,
      }));
      if (membershipConsume?.ok) {
        logPaidAccessStage("MONTHLY_DEDUCT_SUCCESS", {
          requestId,
          userId: authCheck.auth.userId,
          featureKey: pricing?.featureKey,
          profileId,
          accessMethod: "monthly",
          paymentMethod: "MONTHLY",
          amountCoins: Number(membershipConsume.coinPrice || 0),
          amountKRW: calculateKrwAmountFromCoins(Number(membershipConsume.coinPrice || 0)),
          monthlyRequiredAmount: Number(membershipConsume.requiredMonthlyCredits || membershipConsume.membershipCreditCost || 0),
          monthlyBalanceAfter: Number(membershipConsume.remainingMembershipCredit || 0),
          paymentId: membershipConsume.transactionId || "",
          orderId: membershipConsume.purchaseId || requestId,
          idempotencyKey: body?.idempotencyKey || membershipConsume.purchaseId || requestId,
        });
        let unlockEntitlement = membershipConsume.unlockEntitlement || null;
        if (persistProfileUnlockEntitlement && !unlockEntitlement && membershipConsume.idempotent) {
          try {
            // 과거 버전에서 차감만 커밋된 멱등 요청은 기존 원장을 근거로 해금만 복구한다.
            // 신규 요청은 위 트랜잭션 안에서 저장되므로 이 경로로 오지 않는다.
            unlockEntitlement = await upsertSajuProfileUnlockEntitlement(env, {
              userId: authCheck.auth.userId,
              profileId,
              featureKey: pricing.featureKey,
              contentKey: body?.contentKey,
              source: CONTENT_ENTITLEMENT_SOURCES.MONTHLY,
              orderId: membershipConsume.purchaseId || requestId,
              paymentId: membershipConsume.transactionId || requestId,
              coinAmount: Number(membershipConsume.coinPrice || 0),
            });
          } catch (error) {
            return failure(
              error?.code === "MISSING_PROFILE_ID" ? 403 : 503,
              "UNLOCK_ENTITLEMENT_REPAIR_FAILED",
              "기존 월정석 결제의 이용 권한을 복구하지 못했습니다. 다시 결제하지 말고 잠시 후 확인해 주세요.",
              String(error?.message || ""),
              {
                pricing,
                pendingUnlock: true,
                settlement: {
                  source: "MONTHLY",
                  transactionId: membershipConsume.transactionId || "",
                  requestId,
                  profileId: profileId || undefined,
                },
              },
            );
          }
        }
        if (persistProfileUnlockEntitlement) {
          try { globalThis.__paidAccessDecisionCache?.invalidateForUser?.(authCheck.auth.userId); } catch {}
          logPaidAccessStage("UNLOCK_SAVE_SUCCESS", {
            requestId,
            userId: authCheck.auth.userId,
            featureKey: pricing?.featureKey,
            profileId,
            accessMethod: "monthly",
            paymentMethod: "MONTHLY",
            amountCoins: Number(membershipConsume.coinPrice || 0),
            monthlyRequiredAmount: Number(membershipConsume.requiredMonthlyCredits || membershipConsume.membershipCreditCost || 0),
            paymentId: membershipConsume.transactionId || "",
            orderId: membershipConsume.purchaseId || requestId,
            idempotencyKey: body?.idempotencyKey || membershipConsume.purchaseId || requestId,
            scope: membershipConsume.idempotent ? "monthly_idempotent_repair" : "monthly_atomic_transaction",
          });
        }
        const updatedPaymentDecision = buildPassPaymentDecision(
          subscriptionPass.entitlement,
          pricing,
          membershipConsume?.user?.profileSubscription || subscriptionPass.profileSubscription,
        );
        return await successWithPremiumAccess(env, authCheck.auth.userId, {
          pricing,
          ...updatedPaymentDecision,
          paymentOptions: updatedPaymentDecision,
          accessMethod: "MONTHLY",
          charged: Number(membershipConsume.coinPrice || 0),
          consume: {
            ok: true,
            transactionType: "membership_credit",
            accessType: "membership_credit",
            accessMethod: "MONTHLY",
            paymentMethod: "MONTHLY",
            requestId,
            transactionId: membershipConsume.transactionId || "",
            ledgerId: membershipConsume.ledgerId || "",
            purchaseId: membershipConsume.purchaseId || requestId,
            featureKey: String(pricing.featureKey || ""),
            profileId: profileId || undefined,
            coinPrice: membershipConsume.coinPrice,
            chargedCoins: Number(membershipConsume.coinPrice || 0),
            membershipCreditCost: membershipConsume.membershipCreditCost,
            requiredMonthlyCredits: membershipConsume.requiredMonthlyCredits,
            remainingMembershipCredit: membershipConsume.remainingMembershipCredit,
            monthlyStoneBalance: membershipConsume.monthlyStoneBalance ?? membershipConsume.remainingMembershipCredit,
            monthlyCredits: membershipConsume.monthlyCredits,
            monthlyCreditsAsCoins: membershipConsume.monthlyCreditsAsCoins,
            idempotent: Boolean(membershipConsume.idempotent),
          },
          premiumAccessToken: null,
          accessGrant: {
            ok: true,
            accessType: "membership_credit",
            featureKey: String(pricing.featureKey || ""),
            sessionId: reportSessionId || undefined,
            requestId,
            transactionId: membershipConsume.transactionId || "",
            ledgerId: membershipConsume.ledgerId || "",
            purchaseId: membershipConsume.purchaseId || requestId,
            evidenceId: String(unlockEntitlement?._id || membershipConsume.transactionId || ""),
            unlockGrant: unlockEntitlement?.unlockGrant || null,
            reportId: reportId || undefined,
            profileId: profileId || undefined,
            paidAt: new Date().toISOString(),
            accessMethod: "MONTHLY",
          },
          balance: Number(membershipConsume?.user?.points || 0),
          monthlyStoneBalance: membershipConsume.monthlyStoneBalance ?? membershipConsume.remainingMembershipCredit,
          membershipCreditBalance: membershipConsume.remainingMembershipCredit,
          monthlyCredits: membershipConsume.monthlyCredits,
          monthlyCreditsAsCoins: membershipConsume.monthlyCreditsAsCoins,
          transactionId: membershipConsume.transactionId || "",
          ledgerId: membershipConsume.ledgerId || "",
          user: membershipConsume.user,
        }, "월정석으로 이번 생성 권한이 저장되었습니다.");
      }
      // 차감 실패 사유를 구분해 응답한다. 이 구분이 없으면 '이미 차감됨'·'경합'까지 402(월정석 부족)로 나가
      // 결제창이 다시 열린다 — 402는 진짜 잔량 부족(INSUFFICIENT)일 때만이며, 그 경로는 아래 폴스루가 맡는다.
      const membershipConsumeReason = String(membershipConsume?.reason || "");
      if (membershipConsumeReason === "ALREADY_PROCESSED") {
        // 차감은 끝났는데 원장이 아직 안 보인다(sibling 커밋 직전). 여기서 결제 선택지를 실은 402를 내면
        // 사용자가 카드로 한 번 더 결제해 월정석+카드 이중과금이 된다. 재시도 가능한 409로 표면화하면
        // 클라가 '동일 requestId'로 재요청해 원장이 뜨는 순간 idempotent 성공을 받는다.
        return failure(409, "MONTHLY_CREDIT_CONSUME_IN_PROGRESS", "월정석 사용을 처리하는 중입니다. 잠시 후 다시 시도해 주세요.", undefined, {
          pricing,
          retryable: true,
          canUseByCard: false,
        });
      }
      if (membershipConsumeReason === "CONTENDED") {
        // 5회 write가 모두 경합으로 실패 = 미차감. 재시도가 안전하므로 일시 오류로 표면화한다.
        return failure(503, "MONTHLY_CREDIT_CONTENDED", "월정석 사용이 일시적으로 지연되고 있습니다. 잠시 후 다시 시도해 주세요.", undefined, {
          pricing,
          retryable: true,
        });
      }
      if (membershipConsumeReason === "USER_NOT_FOUND") {
        return failure(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
      }
    } catch (error) {
      logBillingRouteError("membership-credit-consume", error, request, {
        featureKey: String(pricing?.featureKey || ""),
        requestId,
      });
      const atomicUnavailable = String(error?.code || "") === "MONTHLY_ATOMIC_UNAVAILABLE";
      const atomicWriteFailed = String(error?.code || "") === "UNLOCK_ENTITLEMENT_SAVE_FAILED";
      if (atomicUnavailable || atomicWriteFailed) {
        return failure(
          503,
          atomicUnavailable ? "MONTHLY_ATOMIC_UNAVAILABLE" : "MONTHLY_ATOMIC_WRITE_FAILED",
          atomicUnavailable
            ? "월정석 결제를 안전하게 처리할 수 없어 차감하지 않았습니다. 잠시 후 다시 시도해 주세요."
            : "월정석 권한을 안전하게 저장하지 못해 차감하지 않았습니다. 잠시 후 다시 시도해 주세요.",
          String(error?.message || ""),
          {
            pricing,
            retryable: true,
            canUseByCard: false,
          },
        );
      }
      // 🔴 트랜지언트 DB 오류(풀 경합/커넥션 재수립 등)는 로그인 사용자 확정 실패가 아니다. 이 파일의
      // resolveBillingRequestAuth(3224행)·resolvePaidContentAccess(5640행)와 동일 판정을 여기도 적용해
      // 재시도 가능 503으로 응답한다 — 이걸 빼면 위 withMongoRetry가 소진한 뒤의 실패가 미분류 500으로 뭉개진다.
      if (isAuthDbInfraError(error)) {
        return failure(
          503,
          "MONTHLY_CREDIT_CONSUME_INFRA_UNAVAILABLE",
          "월정석 사용을 일시적으로 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
          String(error?.message || ""),
          {
            pricing,
            retryable: true,
            canUseByCard: false,
          },
        );
      }
      return failure(
        500,
        "MEMBERSHIP_CREDIT_CONSUME_FAILED",
        "이용권 혜택 처리 중 오류가 발생했습니다.",
        String(error?.message || ""),
      );
    }
    }

    if (monthlyBalanceRequested) {
      // lot 정본으로 읽는다. subscriptionPassForDecision의 스칼라는 (a) 차감 시도 '이전' 캡처값이고
      // (b) buildMembershipPassFromBillingSnapshot이 만든 객체엔 membershipCreditLots가 없어 만료 lot을
      // 반영하지 못한다. 그 값을 쓰면 "부족하다면서 잔량은 충분한" 자기모순 402가 나가 클라가 재제안 루프에 빠진다.
      const currentUser = await User.findById(authCheck.auth.userId)
        .select("profileSubscription")
        .lean();
      let monthlyCredits = Number(
        ensureLotsForBalance(currentUser?.profileSubscription || {}, Date.now()).balance,
      );
      if (!Number.isFinite(monthlyCredits)) monthlyCredits = 0;
      monthlyCredits = Math.max(0, Math.floor(monthlyCredits));
      const requiredMonthlyCredits = resolveMonthlyCreditCostForBilling(pricing, scopedBody);
      const normalizedCoinCost = resolvePricingCoinCost(pricing, resolvePricingCoinCost(scopedBody));
      const normalizedAmountKRW = resolvePricingAmountKRW(pricing, normalizedCoinCost);
      logPaidAccessStage("MONTHLY_DEDUCT_FAILED", {
        requestId,
        userId: authCheck.auth.userId,
        featureKey: pricing?.featureKey,
        profileId,
        accessMethod: "monthly",
        paymentMethod: requestedPaymentMode || "monthly",
        amountCoins: normalizedCoinCost,
        amountKRW: normalizedAmountKRW,
        monthlyRequiredAmount: requiredMonthlyCredits,
        monthlyBalanceBefore: monthlyCredits,
        monthlyBalanceAfter: monthlyCredits,
        idempotencyKey: body?.idempotencyKey || body?.purchaseId || body?.orderId || requestId,
      });
      return failure(402, "INSUFFICIENT_MONTHLY_CREDITS", "이용권 혜택이 부족합니다.", undefined, {
        pricing,
        ...paymentDecision,
        paymentOptions: {
          ...paymentDecision,
          monthlyBalance: monthlyCredits,
          canUseByMonthly: false,
        },
        // paymentDecision 스프레드가 top-level에 canUseByMonthly:true를 실을 수 있다. top-level만 읽는
        // 소비자가 "월정석 가능"으로 오인해 재제안 루프를 만들지 않도록 스프레드 뒤에서 명시적으로 덮는다.
        monthlyBalance: monthlyCredits,
        canUseByMonthly: false,
        accessGrant: null,
        requiredMonthlyCredits,
        currentMonthlyCredits: monthlyCredits,
        currentMonthlyStoneBalance: monthlyCredits,
        monthlyStoneBalance: monthlyCredits,
        membershipCreditCost: requiredMonthlyCredits,
        membershipCreditBalance: monthlyCredits,
        monthlyCredits,
        monthlyCreditsAsCoins: monthlyCredits / MEMBERSHIP_CREDIT_PER_COIN,
        canUseByCard: true,
      });
    }
  }

  if (!coinPaymentRequested) return failure(402, "PAYMENT_REQUIRED", "상품별 원화 단건 결제가 필요합니다.", undefined, {
    pricing,
    ...paymentDecision,
    paymentOptions: paymentDecision,
    accessDecision,
    shouldOpenPaymentSelector: accessDecision.shouldOpenPaymentSelector,
    availableMethods: accessDecision.availableMethods,
    accessGrant: null,
    balance: null,
    checkout: {
      endpoint: "/api/billing/checkout",
      payload: {
        paymentType: "digital_content",
        featureKey: String(pricing.featureKey || ""),
        reason: String(pricing.reason || ""),
        categoryKey: pricing.categoryKey,
        subFeatureKey: pricing.subFeatureKey,
        paymentAmount: resolvePricingAmountKRW(pricing, resolvePricingCoinCost(pricing)),
        coinPrice: resolvePricingCoinCost(pricing),
        membershipCreditCost: Number(pricing.membershipCreditCost || calculateMembershipCreditCost(resolvePricingCoinCost(pricing))),
        requestId,
        reportId: reportId || undefined,
        sessionId: reportSessionId || undefined,
        profileId: profileId || undefined,
      },
    },
  });

  if (passExcludedForPricing && coinPaymentRequested) {
    // 월정석은 잔량과 무관히 단건결제와 항상 동등 노출(부족 시 클라이언트가 비활성 처리).
    // 이용권 제외 기능 공용 경로(프로필 카드 추가/삭제 + 음악 트랙) — 문구·변수명을 기능 중립으로 둔다.
    const passExcludedPaymentMethods = ["DIRECT_KRW", "MOONLIGHT_STONE"];
    return failure(402, "PAYMENT_REQUIRED", "이 기능은 단건 결제 또는 월정석으로 이용해 주세요.", undefined, {
      pricing,
      ...paymentDecision,
      paymentOptions: {
        ...paymentDecision,
        canUseByPass: false,
        recommendedMethod: "PAYMENT_CHOICE",
        recommendedMethods: passExcludedPaymentMethods,
        equalPriorityMethods: passExcludedPaymentMethods,
        hiddenMethods: ["PASS", "COIN"],
        paymentPriority: "USER_CHOICE_EQUAL",
      },
      accessDecision,
      shouldOpenPaymentSelector: true,
      availableMethods: passExcludedPaymentMethods,
      legacyCoinDisabled: true,
      blockedPaymentMode: "COIN",
      accessGrant: null,
      balance: null,
      checkout: {
        endpoint: "/api/billing/checkout",
        payload: {
          paymentType: "digital_content",
          featureKey: String(pricing.featureKey || ""),
          reason: String(pricing.reason || ""),
          categoryKey: pricing.categoryKey,
          subFeatureKey: pricing.subFeatureKey,
          paymentAmount: resolvePricingAmountKRW(pricing, resolvePricingCoinCost(pricing)),
          coinPrice: resolvePricingCoinCost(pricing),
          membershipCreditCost: Number(pricing.membershipCreditCost || calculateMembershipCreditCost(resolvePricingCoinCost(pricing))),
          requestId,
          reportId: reportId || undefined,
          sessionId: reportSessionId || undefined,
          profileId: profileId || undefined,
        },
      },
    });
  }

  if (coinPaymentRequested) {
    logPaidAccessStage("LEGACY_COIN_BLOCKED", {
      requestId,
      userId: authCheck.auth.userId,
      featureKey: String(pricing?.featureKey || ""),
      paymentMode: "COIN",
      legacyCoinDisabled: true,
    });
    return failure(402, "PAYMENT_REQUIRED", "기존 코인 결제는 더 이상 사용하지 않습니다. 이용권, 월정석 또는 단건 결제를 선택해 주세요.", undefined, {
      pricing,
      ...paymentDecision,
      paymentOptions: paymentDecision,
      accessDecision,
      shouldOpenPaymentSelector: true,
      availableMethods: paymentDecision.recommendedMethods || ["DIRECT_KRW", "MOONLIGHT_STONE"],
      legacyCoinDisabled: true,
      blockedPaymentMode: "COIN",
      accessGrant: null,
      balance: null,
      checkout: {
        endpoint: "/api/billing/checkout",
        payload: {
          paymentType: "digital_content",
          featureKey: String(pricing.featureKey || ""),
          reason: String(pricing.reason || ""),
          categoryKey: pricing.categoryKey,
          subFeatureKey: pricing.subFeatureKey,
          paymentAmount: resolvePricingAmountKRW(pricing, resolvePricingCoinCost(pricing)),
          coinPrice: resolvePricingCoinCost(pricing),
          membershipCreditCost: Number(pricing.membershipCreditCost || calculateMembershipCreditCost(resolvePricingCoinCost(pricing))),
          requestId,
          reportId: reportId || undefined,
          sessionId: reportSessionId || undefined,
          profileId: profileId || undefined,
        },
      },
    });

    // The legacy debit implementation below is intentionally unreachable. Keep this
    // compatibility boundary until all stale clients have migrated, but never allow
    // a legacy request to mutate points or create a new COIN ledger entry.
    await connectDb(env);
    const requiredCoins = resolvePricingCoinCost(pricing);
    const coinPurchaseId = String(body?.purchaseId || body?.idempotencyKey || body?.orderId || requestId || "").trim();
    const coinFeatureKey = String(pricing?.featureKey || body?.featureKey || "").trim();

    if (deferUsage) {
      const currentUser = await User.findById(authCheck.auth.userId)
        .select("points profileSubscription")
        .lean();
      const currentCoins = Math.max(0, Math.floor(Number(currentUser?.points || 0)));
      if (currentCoins < requiredCoins) {
        return failure(402, "INSUFFICIENT_COINS", "결제 가능한 금액이 부족합니다. 원화 단건 결제를 이용해 주세요.", undefined, {
          pricing,
          requiredCoins,
          currentCoins,
          membershipCreditBalance: Math.max(0, Math.floor(Number(currentUser?.profileSubscription?.membershipCreditBalance || 0))),
          canUseByCard: true,
        });
      }
      return createDeferredUsageGrant(env, authCheck.auth.userId, pricing, requestId, {
        body: scopedBody,
        profileId,
        paymentMethod: "COIN",
        accessType: "coin",
        source: "pre_usage",
      });
    }

    if (coinPurchaseId && coinFeatureKey) {
      const existingCoinSpend = await PointHistory.findOne({
        userId: authCheck.auth.userId,
        kind: "deduct",
        featureKey: coinFeatureKey,
        "metadata.accessType": "coin",
        $or: [
          { "metadata.purchaseId": coinPurchaseId },
          { "metadata.idempotencyKey": coinPurchaseId },
          { "metadata.orderId": coinPurchaseId },
          { "metadata.requestId": coinPurchaseId },
        ],
      }).select("_id balanceAfter metadata").lean();
      if (existingCoinSpend) {
        const currentUser = await User.findById(authCheck.auth.userId)
          .select("points profileSubscription")
          .lean();
        const currentBalance = Math.max(0, Math.floor(Number(currentUser?.points || existingCoinSpend.balanceAfter || 0)));
        if (isUnlockPaidFeatureKey(coinFeatureKey) && !isProfileScopedUnlockKey(coinFeatureKey)) {
          await User.updateOne(
            { _id: authCheck.auth.userId },
            { $addToSet: { unlockedFeatures: coinFeatureKey } },
          );
        }
        return success({
          pricing,
          accessMethod: "COIN",
          paymentMode: "COIN",
          consume: {
            ok: true,
            transactionId: String(existingCoinSpend._id || ""),
            purchaseId: coinPurchaseId,
            requestId,
            transactionType: "coin",
            accessType: "coin",
            accessMethod: "COIN",
            paymentMethod: "COIN",
            featureKey: coinFeatureKey,
            chargedCoins: requiredCoins,
            idempotent: true,
          },
          premiumAccessToken: null,
          accessGrant: {
            ok: true,
            accessType: "coin",
            accessMethod: "COIN",
            paymentMethod: "COIN",
            featureKey: coinFeatureKey,
            sessionId: reportSessionId || undefined,
            requestId,
            purchaseId: coinPurchaseId,
            evidenceId: String(existingCoinSpend._id || ""),
            reportId: reportId || undefined,
            profileId: profileId || undefined,
            paidAt: existingCoinSpend?.metadata?.paidAt || new Date().toISOString(),
          },
          balance: currentBalance,
          membershipCreditBalance: Math.max(0, Math.floor(Number(currentUser?.profileSubscription?.membershipCreditBalance || 0))),
          monthlyCredits: Math.max(0, Math.floor(Number(currentUser?.profileSubscription?.membershipCreditBalance || 0))),
          user: {
            id: String(authCheck.auth.userId || ""),
            points: currentBalance,
            profileSubscription: currentUser?.profileSubscription || null,
          },
        }, "이미 처리된 원화 결제 요청입니다.");
      }
    }

    const coinDeductFilter = {
      _id: authCheck.auth.userId,
      points: { $gte: requiredCoins },
      ...(coinPurchaseId ? { recentConsumeRequestIds: { $ne: coinPurchaseId } } : {}),
    };
    const coinDeductUpdate = {
      $inc: { points: -requiredCoins },
      // 중복 방지는 위 필터의 `$ne: coinPurchaseId` 가드가 담당한다($push는 스스로 못 막는다).
      ...(coinPurchaseId ? {
        $push: {
          recentConsumeRequestIds: { $each: [coinPurchaseId], $slice: -RECENT_CONSUME_REQUEST_ID_CAP },
        },
      } : {}),
    };
    const compensateCoinDeduct = async () => {
      await User.findByIdAndUpdate(authCheck.auth.userId, {
        $inc: { points: requiredCoins },
        ...(coinPurchaseId ? { $pull: { recentConsumeRequestIds: coinPurchaseId } } : {}),
      }).catch(() => {});
    };
    const buildCoinHistoryPayload = (balanceAfter) => ({
      userId: authCheck.auth.userId,
      kind: "deduct",
      delta: -requiredCoins,
      balanceAfter,
      reason: String(pricing?.reason || "coin_access"),
      featureKey: coinFeatureKey,
      metadata: {
        accessType: "coin",
        accessMethod: "COIN",
        paymentMethod: "COIN",
        transactionType: "coin",
        ...buildProfileCardMutationMetadata(body),
        requestId,
        purchaseId: coinPurchaseId,
        idempotencyKey: String(body?.idempotencyKey || coinPurchaseId || "").trim().slice(0, 160),
        orderId: String(body?.orderId || coinPurchaseId || "").trim().slice(0, 160),
        reportId,
        sessionId: reportSessionId,
        reportSessionId,
        profileId,
        selectedProfileId: profileId,
        featureKey: coinFeatureKey,
        coinPrice: requiredCoins,
        chargedCoins: requiredCoins,
        paidAt: new Date().toISOString(),
      },
    });

    // Atomic: coin balance debit + its point-history row (the coin ledger) commit together,
    // so an isolate kill can't debit coins without recording the deduction.
    const runCoinSpendWithTransaction = async () => {
      const session = await mongoose.startSession();
      let outcome = null;
      try {
        await session.withTransaction(async () => {
          const updatedUser = await User.findOneAndUpdate(coinDeductFilter, coinDeductUpdate, {
            returnDocument: "after",
            projection: { points: 1, profileSubscription: 1 },
            session,
          }).lean();
          if (!updatedUser) { outcome = null; return; }
          const coinBalance = Math.max(0, Math.floor(Number(updatedUser?.points || 0)));
          const [coinHistory] = await PointHistory.create([buildCoinHistoryPayload(coinBalance)], { session });
          outcome = { updatedUser, coinBalance, coinHistory };
        });
        return outcome;
      } finally {
        await session.endSession();
      }
    };

    // Fallback when transactions are unavailable: best-effort with manual compensation (saga).
    const runCoinSpendWithCompensation = async () => {
      const updatedUser = await User.findOneAndUpdate(coinDeductFilter, coinDeductUpdate, {
        returnDocument: "after",
        projection: { points: 1, profileSubscription: 1 },
      }).lean();
      if (!updatedUser) return null;
      const coinBalance = Math.max(0, Math.floor(Number(updatedUser?.points || 0)));
      const coinHistory = await PointHistory.create(buildCoinHistoryPayload(coinBalance)).catch(async (error) => {
        await compensateCoinDeduct();
        throw error;
      });
      return { updatedUser, coinBalance, coinHistory };
    };

    let coinOutcome;
    try {
      coinOutcome = await runCoinSpendWithTransaction();
    } catch (error) {
      if (!isTransactionUnsupported(error)) throw error;
      coinOutcome = await runCoinSpendWithCompensation();
    }

    if (!coinOutcome) {
      const currentUser = await User.findById(authCheck.auth.userId)
        .select("points profileSubscription recentConsumeRequestIds")
        .lean();
      if (coinPurchaseId && Array.isArray(currentUser?.recentConsumeRequestIds) && currentUser.recentConsumeRequestIds.includes(coinPurchaseId)) {
        return success({
          pricing,
          accessMethod: "COIN",
          paymentMode: "COIN",
          consume: {
            ok: true,
            purchaseId: coinPurchaseId,
            requestId,
            transactionType: "coin",
            accessType: "coin",
            accessMethod: "COIN",
            paymentMethod: "COIN",
            featureKey: coinFeatureKey,
            chargedCoins: requiredCoins,
            idempotent: true,
          },
          accessGrant: null,
          balance: Math.max(0, Math.floor(Number(currentUser?.points || 0))),
          membershipCreditBalance: Math.max(0, Math.floor(Number(currentUser?.profileSubscription?.membershipCreditBalance || 0))),
          monthlyCredits: Math.max(0, Math.floor(Number(currentUser?.profileSubscription?.membershipCreditBalance || 0))),
          user: {
            id: String(authCheck.auth.userId || ""),
            points: Math.max(0, Math.floor(Number(currentUser?.points || 0))),
            profileSubscription: currentUser?.profileSubscription || null,
          },
        }, "이미 처리된 원화 결제 요청입니다.");
      }
      return failure(402, "INSUFFICIENT_COINS", "결제 가능 금액이 부족합니다. 원화 단건 결제를 이용해 주세요.", undefined, {
        pricing,
        requiredCoins,
        currentCoins: Math.max(0, Math.floor(Number(currentUser?.points || 0))),
        membershipCreditBalance: Math.max(0, Math.floor(Number(currentUser?.profileSubscription?.membershipCreditBalance || 0))),
        monthlyCredits: Math.max(0, Math.floor(Number(currentUser?.profileSubscription?.membershipCreditBalance || 0))),
        canUseByCard: true,
      });
    }

    const { updatedUser, coinBalance, coinHistory } = coinOutcome;
    const monthlyCredits = Math.max(0, Math.floor(Number(updatedUser?.profileSubscription?.membershipCreditBalance || 0)));
    // 잔량·접근 결정이 바뀌었으니 표시용 캐시를 즉시 버린다. 월정석 인라인 차감(1651-1652)과 원화 결제
    // (payments.js:1420-1423)가 이미 지키는 계약인데 코인 인라인 차감만 빠져 있어서, 결제 직후 최대 5초 동안
    // /balance 가 해금 전 스냅샷을 돌려줘 방금 산 콘텐츠가 잠금으로 보였다.
    try { globalThis.__billingBalanceCache?.invalidateForUser?.(authCheck.auth.userId); } catch {}
    try { globalThis.__paidAccessDecisionCache?.invalidateForUser?.(authCheck.auth.userId); } catch {}

    let accessGrant = null;
    let unlockEntitlement = null;
    if (persistProfileUnlockEntitlement) {
      try {
        unlockEntitlement = await upsertSajuProfileUnlockEntitlement(env, {
          userId: authCheck.auth.userId,
          profileId,
          featureKey: coinFeatureKey,
          contentKey: body?.contentKey,
          source: CONTENT_ENTITLEMENT_SOURCES.COIN,
          paymentId: String(coinHistory?._id || coinPurchaseId || requestId),
          orderId: coinPurchaseId || requestId,
          coinAmount: requiredCoins,
        });
      } catch (error) {
        await User.findByIdAndUpdate(authCheck.auth.userId, {
          $inc: { points: requiredCoins },
          ...(coinPurchaseId ? { $pull: { recentConsumeRequestIds: coinPurchaseId } } : {}),
        }).catch(() => {});
        await PointHistory.updateOne(
          { _id: coinHistory?._id, userId: authCheck.auth.userId },
          {
            $set: {
              "metadata.coinRefundedForUnlockFailure": true,
              "metadata.coinRefundedAt": new Date(),
              "metadata.unlockFailureMessage": String(error?.message || "").slice(0, 500),
            },
          },
        ).catch(() => {});
        return failure(
          error?.code === "MISSING_PROFILE_ID" ? 403 : 500,
          "UNLOCK_ENTITLEMENT_SAVE_FAILED",
          "Unlock entitlement could not be saved after coin consumption.",
          String(error?.message || ""),
          {
            pricing,
            pendingUnlock: true,
            settlement: {
              source: "COIN",
              transactionId: String(coinHistory?._id || ""),
              requestId,
              profileId: profileId || undefined,
            },
          },
        );
      }
    }

    accessGrant = {
      ok: true,
      accessType: "coin",
      accessMethod: "COIN",
      paymentMethod: "COIN",
      featureKey: coinFeatureKey,
      sessionId: reportSessionId || undefined,
      requestId,
      purchaseId: coinPurchaseId || String(coinHistory?._id || ""),
      evidenceId: String(unlockEntitlement?._id || coinHistory?._id || ""),
      unlockGrant: unlockEntitlement?.unlockGrant || null,
      reportId: reportId || undefined,
      profileId: profileId || undefined,
      paidAt: new Date().toISOString(),
    };

    const coinSuccessPayload = {
      pricing,
      accessMethod: "COIN",
      paymentMode: "COIN",
      consume: {
        ok: true,
        transactionId: String(coinHistory?._id || ""),
        purchaseId: coinPurchaseId || String(coinHistory?._id || ""),
        requestId,
        transactionType: "coin",
        accessType: "coin",
        accessMethod: "COIN",
        paymentMethod: "COIN",
        featureKey: coinFeatureKey,
        chargedCoins: requiredCoins,
        idempotent: false,
      },
      premiumAccessToken: null,
      accessGrant,
      balance: coinBalance,
      monthlyStoneBalance: monthlyCredits,
      membershipCreditBalance: monthlyCredits,
      monthlyCredits,
      monthlyCreditsAsCoins: monthlyCredits / MEMBERSHIP_CREDIT_PER_COIN,
      user: {
        id: String(authCheck.auth.userId || ""),
        points: coinBalance,
        profileSubscription: updatedUser?.profileSubscription || null,
      },
    };

    const isPdfGenerationService = canGeneratePaidPdf(pricing);
    if (isPdfGenerationService || isUnlockPaidFeatureKey(coinFeatureKey)) {
      return await successWithPremiumAccess(env, authCheck.auth.userId, coinSuccessPayload, `${resolvePricingAmountKRW(pricing, requiredCoins).toLocaleString("ko-KR")}원 결제로 콘텐츠 이용 권한을 발급했습니다.`);
    }

    return success(coinSuccessPayload, `${resolvePricingAmountKRW(pricing, requiredCoins).toLocaleString("ko-KR")}원 결제로 콘텐츠 이용 권한을 발급했습니다.`);
  }

  const delegatedBody = {
    cost: Number(pricing.cost),
    reason: String(pricing.reason),
    featureKey: String(pricing.featureKey),
    requestId,
    categoryKey: pricing.categoryKey,
    subFeatureKey: pricing.subFeatureKey,
    payloadHash: String(body?.payloadHash || "").trim().slice(0, 120),
    reportId: reportId || undefined,
    sessionId: reportSessionId || undefined,
    reportSessionId: reportSessionId || undefined,
    profileId: profileId || undefined,
    selectedProfileId: profileId || undefined,
  };

  if (body?.productId) {
    delegatedBody.productId = String(body.productId).trim().toLowerCase();
  }

  let delegatedResponse = null;
  let payload = {};
  try {
    const consumeResult = await consumeCoinWithRetry(request, env, delegatedBody);
    delegatedResponse = consumeResult.delegatedResponse;
    payload = consumeResult.payload;
  } catch (error) {
    logBillingRouteError("coin-gate-consume", error, request, {
      featureKey: String(pricing?.featureKey || ""),
      requestId,
    });
    return failure(
      500,
      "SERVER_ERROR",
      "이용권 확인 중 오류가 발생했습니다.",
      String(error?.message || ""),
      {},
      buildBillingErrorDetails("coin-gate-consume", error, { featureKey: String(pricing?.featureKey || "") }),
    );
  }

  if (!delegatedResponse.ok) {
    const mapped = mapCoinGateFailure(delegatedResponse.status, payload);
    logCoinGateResult({
      status: "failed",
      requestId,
      featureKey: String(pricing?.featureKey || ""),
      responseStatus: Number(delegatedResponse.status || 0),
      code: mapped.code,
      delegatedCode: String(toCode(payload) || ""),
      hasPremiumAccessToken: Boolean(String(payload?.premiumAccessToken || "").trim()),
      transactionId: String(payload?.transactionId || ""),
    });
    return failure(mapped.status, mapped.code, mapped.message, mapped.debugMessage);
  }

  // 위임(fortune.js pig-coin) 경로도 차감이 끝난 상태다 — 인라인 차감과 같은 이유로 표시용 캐시를 버린다.
  try { globalThis.__billingBalanceCache?.invalidateForUser?.(authCheck.auth.userId); } catch {}
  try { globalThis.__paidAccessDecisionCache?.invalidateForUser?.(authCheck.auth.userId); } catch {}

  const balance = Number(payload?.user?.points ?? payload?.balance ?? 0);
  const premiumAccessToken = String(
    payload?.premiumAccessToken
    || payload?.data?.premiumAccessToken
    || "",
  ).trim();
  const responseHeaders = new Headers();
  const delegatedCookie = String(delegatedResponse.headers?.get("set-cookie") || "").trim();
  if (delegatedCookie) responseHeaders.append("Set-Cookie", delegatedCookie);
  if (premiumAccessToken) {
    responseHeaders.append("Set-Cookie", buildPremiumAccessCookie(premiumAccessToken, isProductionRuntime(env)));
  }

  logCoinGateResult({
    status: "ok",
    requestId,
    featureKey: String(pricing?.featureKey || ""),
    responseStatus: Number(delegatedResponse.status || 200),
    hasPremiumAccessToken: Boolean(premiumAccessToken),
    transactionId: String(payload?.transactionId || ""),
    chargedCoins: Number(payload?.chargedCoins || payload?.delta || payload?.deductedAmount || 0),
    balance: Number.isFinite(balance) ? balance : null,
  });

  const requestedFeatureKey = String(body?.featureKey || pricing?.featureKey || "").trim() || String(pricing?.featureKey || "").trim();
  const purchaseId = String(payload?.transactionId || payload?.data?.transactionId || "").trim();
  const requestedFeatureIsPdfGeneration = canGeneratePaidPdf({ featureKey: requestedFeatureKey });
  const accessGrant = requestedFeatureKey && purchaseId
    ? {
      ok: true,
      featureKey: requestedFeatureKey,
      sessionId: reportSessionId || undefined,
      purchaseId: purchaseId || undefined,
      requestId: requestId || undefined,
      reportId: reportId || undefined,
      profileId: profileId || undefined,
      paidAt: new Date().toISOString(),
    }
    : null;

  let unlockEntitlement = null;
  // Only persist a ContentEntitlement for genuine profile-scoped UNLOCK features.
  // Per-use (회당결제) keys must not be persisted here — they re-charge each use.
  // Mirrors shouldPersistProfileUnlockEntitlement (= !canGeneratePaidPdf && isProfileScopedUnlockKey).
  if (!requestedFeatureIsPdfGeneration && isProfileScopedUnlockKey(requestedFeatureKey)) {
    try {
      unlockEntitlement = await upsertSajuProfileUnlockEntitlement(env, {
        userId: authCheck.auth.userId,
        profileId,
        featureKey: requestedFeatureKey,
        contentKey: body?.contentKey,
        source: CONTENT_ENTITLEMENT_SOURCES.COIN,
        paymentId: purchaseId,
        orderId: requestId,
        coinAmount: Number(payload?.chargedCoins || payload?.delta || payload?.deductedAmount || pricing?.coinPrice || pricing?.cost || 0),
      });
    } catch (error) {
      return failure(
        error?.code === "MISSING_PROFILE_ID" ? 403 : 500,
        "UNLOCK_ENTITLEMENT_SAVE_FAILED",
        "Unlock entitlement could not be saved after coin consumption.",
        String(error?.message || ""),
        {
          pricing,
          pendingUnlock: true,
          settlement: {
            source: "COIN",
            transactionId: purchaseId || "",
            requestId,
            profileId: profileId || undefined,
          },
        },
      );
    }
  }
  if (accessGrant && unlockEntitlement?._id) {
    accessGrant.evidenceId = String(unlockEntitlement._id || "");
  }
  if (accessGrant) {
    accessGrant.accessType = "coin";
    accessGrant.accessMethod = "COIN";
    accessGrant.paymentMethod = "COIN";
  }

  const delegatedSuccessPayload = {
    pricing,
    accessMethod: "COIN",
    paymentMode: "COIN",
    consume: {
      ...(payload && typeof payload === "object" ? payload : {}),
      transactionId: purchaseId || payload?.transactionId || payload?.data?.transactionId || undefined,
      featureKey: requestedFeatureKey,
      accessType: "coin",
      accessMethod: "COIN",
      paymentMethod: "COIN",
      transactionType: "coin",
    },
    premiumAccessToken: premiumAccessToken || null,
    accessGrant,
    balance: Number.isFinite(balance) ? balance : null,
    user: payload?.user || null,
  };

  if (
    requestedFeatureIsPdfGeneration
    || isUnlockPaidFeatureKey(requestedFeatureKey)
    || resolvePremiumAccessReportType(requestedFeatureKey, String(pricing?.reason || ""))
  ) {
    return await successWithPremiumAccess(
      env,
      authCheck.auth.userId,
      delegatedSuccessPayload,
      toMessage(payload, "이용권 확인이 완료되었습니다."),
      { headers: responseHeaders },
    );
  }

  return success(delegatedSuccessPayload, toMessage(payload, "이용권 확인이 완료되었습니다."), {
    headers: responseHeaders,
  });
}

async function handleFeatures(request) {
  const url = new URL(request.url);
  const categoryKey = String(url.searchParams.get("categoryKey") || "").trim();
  const subFeatureKey = String(url.searchParams.get("subFeatureKey") || "").trim();
  const featureKey = String(url.searchParams.get("featureKey") || "").trim();
  const reason = String(url.searchParams.get("reason") || "").trim();

  if (categoryKey || subFeatureKey || featureKey || reason) {
    const resolved = getBillingFeaturePricing({ categoryKey, subFeatureKey, featureKey, reason });
    if (!resolved.ok) {
      return failure(404, "PRICE_NOT_FOUND", resolved.message || "가격 정보를 찾을 수 없습니다.");
    }

    return success({ pricing: resolved.pricing, source: resolved.source }, "기능 가격 정보를 조회했습니다.");
  }

  return success(listBillingFeatures(), "서버 기능 가격표를 조회했습니다.");
}

async function handleBillingSnapshotBalance(request, env) {
  const billingUrl = new URL(request.url);
  const isMoonlightStoneRequest = billingUrl.searchParams.get("moonlightStone") === "1";
  // 페이지 로드 시 자동으로 도는 프리페치가 스스로를 밝히는 표시. 사용자가 연 모달·재조회와 구분한다.
  const isBackgroundRequest = billingUrl.searchParams.get("background") === "1";
  const isCompactRequest = billingUrl.searchParams.get("compact") === "1" || isMoonlightStoneRequest;
  // 월정석 모달 전용 경로(?moonlightStone=1)는 compact 라서 레거시 포인트→월정석 시드를 건너뛰고 있었다.
  // 그 결과 미시드 레거시 사용자는 결제창에서만 잔량 0 을 보고(그 0 이 healthy 라 5초 캐시에까지 저장됨),
  // 같은 계정이 /points·React 결제창에서는 실제 잔량을 보는 모순이 났다. 시드는 legacyCoinCreditSeeded
  // 가드로 멱등이고 전환할 포인트가 없으면 쓰기 없이 즉시 반환하므로(seedMembershipCreditFromUserDoc),
  // 잔량을 보여주는 게 목적인 이 경로에서는 켠다.
  const seedLegacyCredit = billingUrl.searchParams.get("seedLegacyCredit") === "1" ? true : billingUrl.searchParams.get("seedLegacyCredit") === "0" ? false : (!isCompactRequest || isMoonlightStoneRequest);
  const includeUnlocks = !isCompactRequest;
  // 수동 "재조회"(fresh=1)는 항상 서버 캐시를 우회해 최신값을 읽는다. 자동 조회는 캐시를 허용해 빠르게 응답한다.
  const isFresh = billingUrl.searchParams.get("fresh") === "1";

  // 🔴 표시용 잔량 캐시를 이 핸들러가 따로 갖지 않는다. 예전에는 `uid|c|s|u` 4세그 키로 자체 캐시를 두고
  // readBillingSnapshot 에는 allowCache:false 를 넘겼는데, 그쪽 내부 캐시 키는 `uid|s|u|b|m` 5세그라
  // **같은 Map 을 쓰면서 네임스페이스만 갈라져** 교차 히트가 구조적으로 0이었다. 그 결과 부트스트랩의
  // /unlock-status 가 방금 만들어 둔 스냅샷을 결제창의 /balance 가 전혀 못 쓰고 인증+Mongo 왕복을
  // 매번 새로 냈고, readBillingSnapshot 안에 이미 구현돼 있던 superset 폴백(`|u`→`|-`)도 사문화됐다.
  // 이제 캐시는 readBillingSnapshot 한 곳이 소유한다. 키 매핑은 무손실이다 — 옛 `c/f` 세그먼트는
  // includeUnlocks 와 1:1 이고(isCompactRequest ⟺ !includeUnlocks), 이 라우트에서
  // includeLegacyCoinBalance 는 항상 false, includeMonthlyCreditBalance 는 항상 true 다.
  // 재조회(fresh=1)는 캐시 **읽기만** 건너뛴다(skipCacheRead) — 키를 비우면 write-back 까지 죽어
  // 연타가 곧 degraded → 503 BALANCE_SNAPSHOT_UNAVAILABLE 로 이어졌던 회귀가 되살아난다.
  //
  // 🔴 요청 간 in-flight Promise 공유는 두지 않는다. 예전에는 셸·React·프로필 런타임에서 동시에 오는
  // 같은 사용자 부트스트랩을 하나의 Promise 로 합쳤는데, Cloudflare Workers 는 한 요청의 I/O 컨텍스트에서
  // 만든 Promise 를 다른 요청이 이어받는 것을 금지한다. 위반하면 런타임이 continuation 을 취소하고
  // 그 요청은 응답을 못 받은 채 op 타임아웃까지 끌려가 503 으로 죽는다(2026-08-09 실측 — 같은 이유로
  // worker/lib/auth.js 의 auth dedup 이 6ab597c0b 에서 제거됐다).
  //
  // 대신 아래 healthy-result TTL 캐시(5s)가 재사용을 담당한다. 그건 Promise 가 아니라 데이터라 요청 간
  // 공유가 합법이고, 버스트 직후의 반복 조회는 그쪽에서 그대로 걸린다. 한 브라우저에서 오는 동시 중복은
  // 이미 클라이언트 dedup(app/_lib/auth-client.ts GET dedup · user-session-cache inFlight)이 막는다.
  const snapshot = await readBillingSnapshot(request, env, {
    seedLegacyCredit,
    includeUnlocks,
    allowCache: true,
    skipCacheRead: isFresh,
  });
  if (snapshot?.degraded === true) {
    // 모달/재조회 경로(?moonlightStone=1)는 조회 실패를 '잔량 0'으로 오인하지 않도록 503으로 표면화한다
    // (클라가 '확인 필요 · 재조회'로 처리). 일반 /balance 호출은 기존처럼 200+degraded 폴백을 유지해
    // fetchBillingBalance·MeClient·PointsClient 등 다른 소비자에 회귀를 주지 않는다.
    // 단, 페이지 로드 시 자동으로 도는 프리페치(background=1)는 예외다 — 사용자가 요청하지도 않은
    // 조회라 503으로 알릴 대상이 없고, 콘솔 에러만 남는다. 클라는 degraded 를 이미 처리한다.
    if (isMoonlightStoneRequest && !isBackgroundRequest) {
      return failure(
        503,
        "BALANCE_SNAPSHOT_UNAVAILABLE",
        "월정석 잔량을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        undefined,
        {
          status: "error",
          degraded: true,
          membershipCreditBalance: 0,
          monthlyCredits: 0,
          monthlyCreditsAsCoins: 0,
        },
        snapshot?.error?.errorDetails || snapshot?.error?.details,
      );
    }
    return success({
      ...snapshot,
      raw: {
        source: "billing_snapshot",
        code: snapshot?.error?.code || "DB_FALLBACK",
        degraded: true,
        errorDetails: snapshot?.error?.errorDetails || snapshot?.error?.details || null,
      },
    }, "Billing balance fallback loaded.");
  }
  // 캐시 write-back(healthy·신원일치 조건 포함)은 readBillingSnapshot 이 소유한다 — 여기서 또 쓰지 않는다.
  // snapshotCacheHit 은 내부 표식이므로 응답에 싣지 않고 raw.cached 로만 옮긴다.
  const { snapshotCacheHit = false, ...snapshotBody } = snapshot;
  return success({
    ...snapshotBody,
    raw: {
      source: "billing_snapshot",
      degraded: Boolean(snapshot.degraded),
      cached: Boolean(snapshotCacheHit),
    },
  }, "Billing balance loaded.");
}

function requireDevPaymentTesterAccess(env) {
  if (!isProductionRuntime(env)) return null;
  return failure(403, "FORBIDDEN", "Development payment tester is disabled in production.");
}

function buildDevPassPatch(tier, now) {
  const normalizedTier = normalizePassTier(tier);
  const passLimit = Number(PASS_LIMITS[normalizedTier] || 0);
  const profileLimit = Number(HONEY_PASS_POLICY[normalizedTier]?.maxProfiles ?? 1);
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    tier: normalizedTier,
    source: "event",
    planId: `dev-${normalizedTier}`,
    productType: "membership_pass",
    durationMonths: 1,
    profileLimit,
    passTier: normalizedTier,
    maxCoveredCoin: passLimit,
    freeLimit: passLimit,
    passLimit,
    membershipCreditBalance: 0,
    membershipCreditGranted: 0,
    membershipCreditUsed: 0,
    legacyCoinCreditSeeded: false,
    legacyCoinCreditSeededAt: null,
    legacyCoinCreditSeededPoints: 0,
    startedAt: now,
    expiresAt,
    firstSubAt: now,
    cancelAtPeriodEnd: false,
    cancelRequestedAt: null,
    customerUid: "",
    paymentMethod: "dev-payment-tester",
    nextBillingAt: null,
    lastBillingAt: now,
    lastBillingStatus: "success",
    lastBillingError: "",
  };
}

function buildDevLicensePatch(tier, now) {
  const normalizedTier = normalizePassTier(tier);
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    standard: normalizedTier === "standard" ? 3 : 0,
    premium: normalizedTier === "premium" ? 7 : 0,
    vvip: normalizedTier === "vvip" ? 15 : 0,
    status: "active",
    expiresAt,
  };
}

function buildDevFreePatch(now) {
  return {
    paidFeatures: [],
    unlockedFeatures: [],
    licenses: {
      standard: 0,
      premium: 0,
      vvip: 0,
      status: "none",
      expiresAt: null,
    },
    profileSubscription: {
      tier: "free",
      source: "event",
      planId: "",
      productType: "",
      durationMonths: 0,
      profileLimit: 1,
      passTier: "",
      maxCoveredCoin: 0,
      freeLimit: 0,
      passLimit: 0,
      membershipCreditBalance: 0,
      membershipCreditGranted: 0,
      membershipCreditUsed: 0,
      legacyCoinCreditSeeded: false,
      legacyCoinCreditSeededAt: null,
      legacyCoinCreditSeededPoints: 0,
      startedAt: null,
      expiresAt: null,
      firstSubAt: null,
      cancelAtPeriodEnd: false,
      cancelRequestedAt: null,
      customerUid: "",
      paymentMethod: "",
      nextBillingAt: null,
      lastBillingAt: null,
      lastBillingStatus: "idle",
      lastBillingError: "",
    },
    monthlySubscription: {
      active: false,
      status: "none",
      tier: "",
      startedAt: null,
      expiresAt: null,
      source: "dev-payment-tester",
    },
    updatedAt: now,
  };
}

async function readDevPaymentTesterSnapshot(userId) {
  const user = await User.findById(userId)
    .select("email name paidFeatures unlockedFeatures licenses profileSubscription monthlySubscription points")
    .lean();
  if (!user?._id) return null;
  return {
    userId: String(user._id || ""),
    email: String(user.email || ""),
    name: String(user.name || ""),
    points: Number(user.points || 0),
    paidFeatures: Array.isArray(user.paidFeatures) ? user.paidFeatures : [],
    unlockedFeatures: Array.isArray(user.unlockedFeatures) ? user.unlockedFeatures : [],
    licenses: user.licenses || null,
    profileSubscription: user.profileSubscription || null,
    monthlySubscription: user.monthlySubscription || null,
  };
}

async function handlePaidAccessCheck(request, env) {
  const method = request.method.toUpperCase();
  const url = new URL(request.url);
  const body = method === "POST" ? await readJson(request) : {};
  // 🔴 요청 단위 인증 메모를 탄다. /access 는 isBillingSecurityPath 라 enforceBillingRouteSecurity 가
  // 이미 resolveBillingRequestAuth 로 인증을 읽었는데, 여기서 메모를 안 타는 조회를 한 번 더 해
  // **모든 /api/billing/access 요청이 인증 왕복을 2회** 냈다(이 라우트는 GET 100회/분 허용이다).
  // 덤으로 DB 일시 장애가 401(미인증)로 세탁되던 것도 사라진다 — surfaceDbInfraError 가 켜져 있어
  // 재시도 가능한 503 으로 표면화되고, 이용권 보유자가 결제창을 보는 경로 하나가 닫힌다.
  const auth = await resolveBillingRequestAuth(request, env);
  const featureKey = String(body?.featureKey || url.searchParams.get("featureKey") || "").trim();
  // BILLING_SNAPSHOT_USER_PROJECTION 이 PAID_FEATURE_ACCESS_USER_FIELDS 를 전부 포함하므로(RC-8),
  // 위에서 이미 읽은 문서를 그대로 넘겨 canAccessPaidFeature 내부의 세 번째 users 조회를 없앤다.
  const decision = await canAccessPaidFeature(auth?.userId || "", featureKey, {
    env,
    categoryKey: body?.categoryKey || url.searchParams.get("categoryKey") || "",
    subFeatureKey: body?.subFeatureKey || url.searchParams.get("subFeatureKey") || "",
    reason: body?.reason || url.searchParams.get("reason") || "",
    userDoc: auth?.authUserDoc || null,
  });
  const status = decision.reason === "LOGIN_REQUIRED" ? 401 : 200;
  return json({ ok: decision.allowed, data: decision, code: decision.reason }, { status });
}

async function handleDevPaymentTester(request, env) {
  const blocked = requireDevPaymentTesterAccess(env);
  if (blocked) return blocked;

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth?.userId) {
    return failure(401, "LOGIN_REQUIRED", "Development payment tester requires a current user.");
  }

  await connectDb(env);

  if (request.method.toUpperCase() === "GET") {
    const snapshot = await readDevPaymentTesterSnapshot(auth.userId);
    return success({ user: snapshot }, "Development payment tester state loaded.");
  }

  const body = await readJson(request);
  const action = String(body?.action || "").trim().toLowerCase();
  const now = new Date();

  if (action === "free" || action === "reset") {
    await User.findByIdAndUpdate(auth.userId, { $set: buildDevFreePatch(now) });
  } else if (["standard", "premium", "vvip", "family"].includes(action)) {
    const patch = buildDevFreePatch(now);
    await User.findByIdAndUpdate(auth.userId, {
      $set: {
        ...patch,
        licenses: buildDevLicensePatch(action, now),
        profileSubscription: buildDevPassPatch(action, now),
      },
    });
  } else if (action === "monthly") {
    const patch = buildDevFreePatch(now);
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    // 월정석 지급분별(lot) 만료 도입 — dev 시드도 지급일+30일 lot을 동반 생성해야
    // 크론 스윕이 대상을 찾고 소멸이 성립한다(스칼라-only 지급은 만료가 시작조차 안 됨).
    const granted = applyGrantLot([], {
      lotId: `dev-monthly:${now.getTime()}`,
      amount: 999999,
      grantedAt: now,
      now: now.getTime(),
    });
    await User.findByIdAndUpdate(auth.userId, {
      $set: {
        ...patch,
        profileSubscription: {
          ...patch.profileSubscription,
          membershipCreditBalance: granted.balance,
          membershipCreditGranted: 999999,
          membershipCreditLots: granted.lots,
        },
        monthlySubscription: {
          active: true,
          status: "active",
          tier: "dev-monthly",
          startedAt: now,
          expiresAt,
          source: "dev-payment-tester",
        },
      },
    });
  } else if (action === "paid-feature") {
    const featureKey = String(body?.featureKey || "").trim();
    if (!featureKey) return failure(400, "FEATURE_KEY_REQUIRED", "featureKey is required.");
    await User.findByIdAndUpdate(auth.userId, {
      $addToSet: {
        paidFeatures: featureKey,
        unlockedFeatures: featureKey,
      },
      $set: {
        "monthlySubscription.source": "dev-payment-tester",
        updatedAt: now,
      },
    });
  } else {
    return failure(400, "UNKNOWN_DEV_PAYMENT_TEST_ACTION", "Unknown development payment tester action.");
  }

  const snapshot = await readDevPaymentTesterSnapshot(auth.userId);
  return success({ user: snapshot }, "Development payment tester state updated.");
}

// 구독/이용권 신호가 전혀 없는 사용자인지 판별한다. 신호가 없으면 위임 GET이 하는
// 자동갱신(만료 구독 재활성)도 불가능하고 pass 판정도 이미 inactive이므로, 위임 자체가
// 불필요한 중복 라우팅(재인증 + User.findById + 핸들러 실행)이 된다. 조금이라도 신호가
// 있으면(만료일·plan·레거시 구독 객체·월정석 잔액 등) 기존대로 위임해 갱신/판정을 보존한다.
function hasResolvableSubscriptionSignal(user) {
  if (!user || typeof user !== "object") return false;
  const sub = user.profileSubscription;
  if (sub && typeof sub === "object") {
    if (sub.expiresAt || sub.planId || sub.plan || sub.productId || sub.startedAt || sub.customerUid) return true;
    // 🔴 tier 후보는 entitlement-policy.js activeCandidate 가 읽는 것과 **같은 집합**이어야 한다.
    // 그쪽은 passTier|tier|subscriptionTier|membershipTier|plan|planId|productId 를 보고 하나도 없으면
    // if (!tier) return null 로 비활성을 확정한다. 여기서 두 필드를 빠뜨리면 위임만이 활성이라고
    // 판단할 수 있는 계정을 놓친다.
    const subTier = String(
      sub.tier || sub.passTier || sub.subscriptionTier || sub.membershipTier || "",
    ).trim().toLowerCase();
    if (subTier && subTier !== "free") return true;
    // 🔴 membershipCreditBalance > 0 은 신호가 아니다(2026-08-10 제거).
    // 월정석 잔액은 이벤트 지급 재화라 이용권과 무관한데, 이 한 줄 때문에 **월정석 보유·이용권 미보유
    // 사용자 전원**이 coin-gate 마다 fortune.js 라우트 재진입(264KB 지연 임포트 + 인증 op + User read +
    // 3500ms 예산)을 탔다. 그리고 위임은 tier 없이는 절대 active 를 낼 수 없다:
    //   fortune.js  handleSubscriptionStatus : if (tier !== "free")  — tier 필수
    //   entitlement-policy.js activeCandidate: if (!tier) return null — tier 필수
    // 즉 tier 류 필드가 하나도 없는 계정은 위임해 봐야 결과가 inactive 로 정해져 있다.
  }
  if (user.subscription || user.membership || user.pass || user.entitlement) return true;
  if (user.plan || user.planId || user.productId || user.subscriptionTier || user.membershipTier || user.passTier || user.expiresAt) return true;
  if (user.isSubscribed === true) return true;
  return false;
}

// resolvedUserDoc: 호출부가 이번 요청에서 이미 읽어 온 User 문서.
// 🔴 넘어오면 아래 인증 왕복(getOptionalUserFromRequest)과 User.findById 를 **둘 다** 건너뛴다.
// 그 두 왕복은 호출부(getActiveMembershipPassForUser)가 같은 문서로 이미 내린 판정을 재생산할 뿐이었다
// — 아래 select 목록은 BILLING_SNAPSHOT_USER_PROJECTION 의 부분집합이고, 판정 함수도
// resolveActivePassPolicyWithProfileFallback 로 동일하다. 그런데도 직렬 3왕복이 되어
// coin-gate 의 10초 예산(PAID_PASS_DECISION_DB_TIMEOUT_MS)을 정상 부하에서 넘겼고,
// COIN_GATE_PASS_RESOLVE_TIMEOUT → isDatabaseUnavailableError → 503 PASS_STATUS_TEMPORARILY_UNAVAILABLE
// 로 떨어졌다. 월정석 보유·만료 구독 잔재가 있는 계정은 hasResolvableSubscriptionSignal 이 항상 true 라
// 이 경로가 매 요청 재현돼 "간헐적"이 아니라 "항상" 실패했다.
// 안 넘어오면 기존 경로 그대로 둔다(다른 진입 조건의 회귀 방지).
async function readSubscriptionStatusSnapshot(request, env, resolvedUserDoc = null) {
  try {
    let user = resolvedUserDoc;
    // 문서를 받은 것 자체가 "인증된 사용자 맥락"이다. 아래 분기는 user 가 null 이어도(탈퇴 등)
    // 원본과 동일하게 돌아야 하므로 존재 여부가 아니라 이 플래그로 가른다.
    let hasAuthContext = Boolean(resolvedUserDoc);
    if (!hasAuthContext) {
      const auth = await getOptionalUserFromRequest(request, env);
      if (auth?.userId) {
        hasAuthContext = true;
        await connectDb(env);
        user = await User.findById(auth.userId)
          .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt")
          .lean();
      }
    }
    if (hasAuthContext) {
      const entitlement = resolveActivePassPolicyWithProfileFallback(user || {});
      if (entitlement.isActive) {
        return {
          isActive: true,
          tier: entitlement.tier,
          passTier: entitlement.passTier || null,
          passLabel: entitlement.passLabel || entitlement.label,
          passColorTone: entitlement.passColorTone || null,
          freeLimit: Number(entitlement.maxCoveredCoin || 0),
          passLimit: Number(entitlement.maxCoveredCoin || 0),
          maxCoveredCoin: Number(entitlement.maxCoveredCoin || 0),
          entitlement,
        };
      }
      // 구독 신호가 전혀 없으면 위임(자동갱신 포함)이 무의미 → 즉시 inactive 반환.
      if (!hasResolvableSubscriptionSignal(user)) {
        return { isActive: false, tier: "free", passTier: null, freeLimit: 0 };
      }
    }

    const delegatedRequest = buildRoutedRequest(request, "/api/fortune/pig-coin/profile-subscription/status", "GET");
    // 🔴 위임에 자체 예산을 준다(2026-08-08). 이 조회는 coin-gate 의 이용권 예산
    // (PAID_PASS_DECISION_DB_TIMEOUT_MS, 10초) **안에서** 실행되는데, handleFortuneRoutes 는
    // fortune.js(264KB) 지연 임포트 + 자체 인증 왕복까지 도는 라우트 재진입이라 콜드 아이솔레이트에서
    // 그 예산을 통째로 태웠다 → COIN_GATE_PASS_RESOLVE_TIMEOUT → 503 PASS_STATUS_TEMPORARILY_UNAVAILABLE.
    // 월정석 잔액·만료 구독 잔재가 있는 계정은 hasResolvableSubscriptionSignal 이 항상 true 라
    // 이용권을 확인할 때마다 이 경로를 타므로, 결제창의 '이용권으로 구매'가 간헐적으로 죽는 주범이었다.
    //
    // 초과 시 위임만 포기하고 아래 inactive 를 돌려주면, 호출부(getMembershipPassForBillingRequest)가
    // directPass 로 폴백한다 — 그건 authUserDoc 으로 **이미 성공적으로** 내린 권위 판정이라
    // 판정 근거가 사라지지 않는다. 위임 실패(!ok)와 예외는 원래부터 같은 inactive 로 처리하고
    // 있었으므로(바로 아래 · 함수 말미 catch) 이건 새로운 '확인 실패 → 미보유' 세탁이 아니다.
    const delegatedPromise = handleFortuneRoutes(delegatedRequest, env);
    // race 에서 진 쪽이 나중에 거부하면 unhandled rejection 이 된다 — 분리된 no-op 핸들러로 막는다.
    delegatedPromise.catch(() => {});
    let delegatedResponse;
    try {
      delegatedResponse = await withTimeout(
        delegatedPromise,
        SUBSCRIPTION_STATUS_DELEGATION_TIMEOUT_MS,
        "SUBSCRIPTION_STATUS_DELEGATION_TIMEOUT",
      );
    } catch (error) {
      console.warn("[billing-subscription-delegation]", JSON.stringify({
        code: String(error?.code || ""),
        name: String(error?.name || ""),
        message: String(error?.message || ""),
        budgetMs: SUBSCRIPTION_STATUS_DELEGATION_TIMEOUT_MS,
      }));
      return { isActive: false, tier: "free", passTier: null, freeLimit: 0 };
    }
    if (!delegatedResponse.ok) {
      return { isActive: false, tier: "free", passTier: null, freeLimit: 0 };
    }
    const payload = await readPayloadSafe(delegatedResponse);
    const subscription = payload?.subscription && typeof payload.subscription === "object" ? payload.subscription : null;
    return {
      isActive: Boolean(payload?.isActive),
      isSubscribed: Boolean(payload?.isSubscribed || subscription?.isSubscribed),
      active: payload?.active,
      enabled: payload?.enabled,
      valid: payload?.valid,
      registered: payload?.registered,
      tier: String(
        payload?.tier
        || payload?.plan
        || payload?.planId
        || payload?.productId
        || payload?.subscriptionTier
        || payload?.membershipTier
        || payload?.passTier
        || subscription?.tier
        || subscription?.plan
        || subscription?.planId
        || subscription?.productId
        || subscription?.subscriptionTier
        || subscription?.membershipTier
        || subscription?.passTier
        || "free",
      ),
      plan: payload?.plan || subscription?.plan || null,
      passTier: payload?.passTier || subscription?.passTier || null,
      status: payload?.status || subscription?.status || null,
      subscriptionStatus: payload?.subscriptionStatus || subscription?.subscriptionStatus || null,
      membershipStatus: payload?.membershipStatus || subscription?.membershipStatus || null,
      expiresAt: payload?.expiresAt || subscription?.expiresAt || null,
      freeLimit: Number(payload?.freeLimit || subscription?.freeLimit || 0),
      passLimit: Number(payload?.passLimit || payload?.freeLimit || subscription?.passLimit || subscription?.freeLimit || 0),
      maxCoveredCoin: Number(payload?.maxCoveredCoin || payload?.passLimit || payload?.freeLimit || subscription?.maxCoveredCoin || subscription?.passLimit || subscription?.freeLimit || 0),
      source: payload?.source || subscription?.source || "profile_subscription_status",
      subscription,
    };
  } catch (_) {
    return { isActive: false, tier: "free", passTier: null, freeLimit: 0 };
  }
}

function buildBillingSubscriptionSnapshot(user = {}) {
  const sub = user?.profileSubscription || {};
  const entitlement = resolveActivePassPolicyWithProfileFallback(user || {});
  return {
    isActive: entitlement.isActive,
    isSubscribed: Boolean(user?.isSubscribed || sub?.isSubscribed || entitlement.isActive),
    active: entitlement.isActive,
    enabled: entitlement.isActive,
    valid: entitlement.isActive,
    registered: entitlement.isActive,
    tier: entitlement.isActive ? entitlement.tier : String(sub?.tier || "free"),
    plan: user?.plan || sub?.plan || null,
    passTier: entitlement.passTier || sub?.passTier || null,
    status: user?.status || user?.subscriptionStatus || user?.membershipStatus || sub?.status || null,
    subscriptionStatus: user?.subscriptionStatus || sub?.subscriptionStatus || null,
    membershipStatus: user?.membershipStatus || sub?.membershipStatus || null,
    expiresAt: entitlement.expiresAt || sub?.expiresAt || user?.expiresAt || null,
    freeLimit: Number(entitlement.maxCoveredCoin || 0),
    passLimit: Number(entitlement.maxCoveredCoin || 0),
    maxCoveredCoin: Number(entitlement.maxCoveredCoin || 0),
    source: entitlement.source || "billing_snapshot",
    subscription: sub,
    entitlement,
  };
}

// includeLegacyCoinBalance 는 폐지된 코인 잔액(user.points)을 응답에 실을지다. 기본값이 true 로
// 남아 있어서, 코인을 폐지한 뒤에도 모든 /api/billing 스냅샷이 죽은 잔액을 계속 브라우저로
// 내려보내고 있었다 — 끄는 배관(프로젝션 제거·balance=null)은 이미 다 만들어져 있었고 스위치만
// 켜진 채였다. 소비자는 전부 `?? user.points` 또는 Number.isFinite 가드 뒤의 폴백이라
// (billing-client.ts·PalmDestinyMain·animal-totem-experience·StaticOAuthCallbackRedirect)
// 값이 사라져도 1순위인 data.balance 경로가 그대로 동작한다. 접근 판정은 애초에 points 를
// 읽지 않는다(worker/lib/access-control.js 참조 0건).
function buildBillingSnapshotUser(auth, user, balance, unlockedFeatures, monthlyCredits, membership, includeLegacyCoinBalance = false) {
  const payload = {
    id: String(auth?.userId || user?._id || ""),
    monthlyStoneBalance: monthlyCredits,
    monthlyCredits,
    membershipCreditBalance: monthlyCredits,
    profileSubscriptionTier: membership?.tier || "free",
    subscriptionTier: membership?.tier || "free",
    profileSubscription: user?.profileSubscription || null,
    unlockedFeatures,
  };
  if (includeLegacyCoinBalance) payload.points = Number(balance || 0);
  return payload;
}

function buildMembershipPassFromBillingSnapshot(snapshot = {}) {
  if (!snapshot?.authenticated) return null;
  const subscription = snapshot.subscription && typeof snapshot.subscription === "object" ? snapshot.subscription : {};
  const subscriptionRecord = subscription.subscription && typeof subscription.subscription === "object" ? subscription.subscription : {};
  const profileSubscription = {
    ...subscriptionRecord,
    monthlyStoneBalance: Math.max(0, Math.floor(Number(snapshot.monthlyStoneBalance ?? snapshot.membershipCreditBalance ?? 0))),
    membershipCreditBalance: Math.max(0, Math.floor(Number(snapshot.membershipCreditBalance || 0))),
  };
  const entitlement = subscription.entitlement && typeof subscription.entitlement === "object"
    ? resolveActivePassPolicyWithProfileFallback({ profileSubscription, ...subscription.entitlement })
    : resolveActivePassPolicyWithProfileFallback({ profileSubscription });
  return {
    isActive: Boolean(subscription.isActive || entitlement.isActive),
    tier: String(subscription.tier || entitlement.tier || "free"),
    passTier: subscription.passTier || entitlement.passTier || null,
    freeLimit: Number(subscription.freeLimit || entitlement.maxCoveredCoin || 0),
    passLimit: Number(subscription.passLimit || subscription.freeLimit || entitlement.maxCoveredCoin || 0),
    maxCoveredCoin: Number(subscription.maxCoveredCoin || subscription.passLimit || subscription.freeLimit || entitlement.maxCoveredCoin || 0),
    profileSubscription,
    entitlement,
  };
}

// 결제 스냅샷 stage-2 User 조회가 쓰는 필드. 인증 리졸버에 userProjection으로 넘겨 인증 확인과
// 같은 조회에서 함께 읽어(authUserDoc) 인증-후 재조회(stage-2 User 왕복)를 없앤다.
export const BILLING_SNAPSHOT_USER_PROJECTION = {
  _id: 1,
  name: 1,
  email: 1,
  joinedAt: 1,
  profileSubscription: 1,
  subscription: 1,
  membership: 1,
  pass: 1,
  entitlement: 1,
  plan: 1,
  planId: 1,
  productId: 1,
  subscriptionTier: 1,
  membershipTier: 1,
  passTier: 1,
  status: 1,
  subscriptionStatus: 1,
  // 이용권 조회(getActiveMembershipPassForUser)가 쓰는 유일한 미포함 필드였다. 여기에 넣어야
  // 그 조회가 이 문서를 그대로 재사용할 수 있다(= User 왕복 1회 제거).
  membershipStatus: 1,
  isActive: 1,
  isSubscribed: 1,
  expiresAt: 1,
  points: 1,
  destinyProfilesCurrentId: 1,
  unlockedFeatures: 1,
  birthDate: 1,
  phoneNumber: 1,
  phone: 1,
  fullName: 1,
  displayName: 1,
  username: 1,
  // paid-feature-access.js 의 PAID_FEATURE_ACCESS_USER_FIELDS 대비 빠져 있던 6개. 이게 없으면
  // canAccessPaidFeature(handlePaidAccessCheck)에 이 스냅샷을 userDoc 으로 넘길 때 이 필드들이
  // 비어 있어 오탐 거부가 난다 — 그래서 넘기지 못하고 users 를 다시 읽고 있었다(RC-8).
  paidFeatures: 1,
  licenses: 1,
  monthlySubscription: 1,
  membershipPass: 1,
  licensePass: 1,
  accessGateResult: 1,
};

async function readBillingSnapshot(request, env, options = {}) {
  const {
    seedLegacyCredit = true,
    includeUnlocks = true,
    // 폐지된 코인 잔액은 기본으로 싣지 않는다. buildBillingSnapshotUser 위 주석 참고.
    includeLegacyCoinBalance = false,
    includeMonthlyCreditBalance = true,
    allowCache = true,
    // 캐시 **읽기만** 건너뛰고 write-back 은 유지한다(/balance?fresh=1 의 계약).
    // 키를 비워 버리면 성공 결과가 영영 안 실려 재조회를 누를수록 매번 전체 조회가 나간다.
    skipCacheRead = false,
  } = options || {};

  // 스냅샷 캐시(표시·판정 공용): 유효 access 토큰이 있으면 Mongo 없이 로컬 JWT로 userId를 얻어 캐시 키를 만든다.
  // 히트 시 인증·조회 왕복 전부 스킵(Mongo 0회) — 503 주범인 인증 라운드트립까지 회피. 게스트/allowCache:false는 미사용.
  // 키에 seed/unlocks 플래그를 넣어(멱등 seed 스킵 방지·unlock 유무 구분) 다른 옵션 결과가 섞이지 않게 한다.
  // 🔴 /balance 도 이 캐시를 쓴다(예전에는 핸들러가 `uid|c|s|u` 4세그 키로 **같은 Map 에 다른 네임스페이스**를
  // 만들어, 부트스트랩이 방금 채운 스냅샷을 결제창이 절대 못 쓰고 매번 인증+Mongo 왕복을 새로 냈다).
  const snapshotCacheUserId = allowCache ? await peekAccessTokenUserId(request, env).catch(() => "") : "";
  const snapshotCacheKey = snapshotCacheUserId
    ? `${snapshotCacheUserId}|${seedLegacyCredit ? "s" : "-"}|${includeUnlocks ? "u" : "-"}|${includeLegacyCoinBalance ? "b" : "-"}|${includeMonthlyCreditBalance ? "m" : "-"}`
    : "";
  if (snapshotCacheKey && !skipCacheRead) {
    const cachedSnapshot = readBillingBalanceFromCache(snapshotCacheKey);
    if (cachedSnapshot) return { ...cachedSnapshot, snapshotCacheHit: true };
  }
  // 🔴 캐시 키 파편화 해소: unlock 포함본(`|u`)은 미포함본(`|-`)의 **상위집합**이라 그대로 답이 된다.
  // 예전에는 진입 프로브(`uid|-|-`)와 유료 클릭(`uid|-|u`)이 절대 서로를 못 써서, 방금 서버가 만든
  // 스냅샷을 두고도 첫 클릭이 전체 조회를 다시 냈다. 반대 방향(미포함본으로 포함본 대체)은 unlock 이
  // 비어 잘못된 답이 되므로 하지 않는다.
  if (snapshotCacheUserId && !skipCacheRead && !includeUnlocks) {
    const supersetSnapshot = readBillingBalanceFromCache(`${snapshotCacheUserId}|${seedLegacyCredit ? "s" : "-"}|u|${includeLegacyCoinBalance ? "b" : "-"}|${includeMonthlyCreditBalance ? "m" : "-"}`);
    if (supersetSnapshot) return { ...supersetSnapshot, snapshotCacheHit: true };
  }

  // 인증 해석 중 일시적 DB 풀 초기화(MongoPoolClearedError) 등 재시도 가능한 infra 에러로
  // 로그인 이용권 보유자가 조용히 게스트로 강등돼 결제창이 뜨는 문제를 막는다.
  // infra 에러는 표면화(surfaceDbInfraError)해 withMongoRetry로 흡수하고, 토큰 미부착/무효 등
  // 진짜 미인증은 종전대로 null → 게스트로 처리한다.
  let auth = null;
  let authInfraError = null;
  try {
    // 🔴 withMongoRetry로 감싸지 않는다. 인증의 실제 DB 읽기는 auth.js의 resolveActiveUserAuth·
    // verifyRefreshSessionToAuth 안에서 이미 재시도되며, 그 안쪽 래퍼가 서버선택 타임아웃(8s)+3.5s를
    // per-attempt 상한의 하한으로 강제한다 — 여기서 11s를 다시 지정할 필요도, 감쌀 이유도 없다.
    // 밖에서 또 감싸면 시도·재연결만 배수로 늘어난다(verify:no-nested-retry 가 감시).
    // 🔴 seed 경로도 요청 단위 인증 메모를 탄다. 예전에는 seed 경로만 projection 없는 전체 문서가
    // 필요하다며 메모를 우회해 **인증 왕복을 하나 더** 냈는데, 정작 seed 가 보는 필드(points·
    // profileSubscription)는 BILLING_SNAPSHOT_USER_PROJECTION 에 이미 들어 있다. 우회할 이유가
    // 없었고, 그 왕복은 보안 단계·requireBillingAuth 와 공유됐어야 할 조회였다.
    auth = await resolveBillingRequestAuth(request, env);
  } catch (error) {
    if (!isAuthDbInfraError(error)) throw error;
    // 재시도 후에도 지속되는 infra 에러 = 토큰은 있으나 DB 장애로 확인 불가(진짜 게스트는 throw 없이 null).
    // 종전엔 auth=null로 게스트 강등 → 이용권 보유자에게 결제창이 떠 버렸다(핵심 결함).
    // degraded로 표면화해 호출자(handleUnlockStatus 등)가 503(일시 확인불가·재시도)로 응답하게 한다.
    authInfraError = error;
  }
  if (authInfraError) {
    return {
      authenticated: false,
      authUserId: "",
      balance: 0,
      membershipCreditBalance: 0,
      monthlyStoneBalance: 0,
      monthlyCredits: 0,
      monthlyCreditsAsCoins: 0,
      membership: null,
      subscription: { isActive: false, tier: "free", passTier: null, freeLimit: 0 },
      currentProfileId: "",
      user: null,
      unlockedFeatures: [],
      unlockMap: {},
      degraded: true,
      error: {
        code: "AUTH_DB_UNAVAILABLE",
        message: "Billing auth check temporarily unavailable.",
        errorDetails: buildBillingErrorDetails("billing-snapshot-auth", authInfraError),
      },
    };
  }
  if (!auth?.userId) {
    return {
      authenticated: false,
      authUserId: "",
      balance: 0,
      membershipCreditBalance: 0,
      monthlyStoneBalance: 0,
      monthlyCredits: 0,
      monthlyCreditsAsCoins: 0,
      membership: null,
      subscription: { isActive: false, tier: "free", passTier: null, freeLimit: 0 },
      currentProfileId: "",
      user: null,
      unlockedFeatures: [],
      unlockMap: {},
      degraded: false,
    };
  }

  try {
    // 일시적 풀 초기화(MongoPoolClearedError) 등 재시도 가능한 Mongo 에러가 나도
    // degraded(부정확) 대신 정확한 스냅샷을 돌려주도록 쿼리 전체를 재시도로 감싼다.
    // attemptTimeoutMS를 11s로 넓혀 콜드 연결까지 완료되게 한다(위 인증 경로와 동일 사유).
    // authUserDoc(인증 리졸버가 함께 읽어준 문서)를 재사용해 stage-2 User 재조회 왕복을 없앤다.
    // 🔴 seed 경로도 이제 재사용한다. 예전 주석은 "seed 커밋 뒤 pre-seed 문서를 쓰면 갓 지급된
    //   월정석을 0으로 과소보고한다"는 이유로 매번 fresh read 를 했는데, 그 위험이 실재하는 구간은
    //   **실제로 seed write 가 일어나는 계정**뿐이다(계정당 평생 1회). 아래에서 그 경우만 골라
    //   다시 읽으므로, 나머지 전원은 왕복 하나를 통째로 아낀다.
    const reusableUserDoc = auth.authUserDoc || null;
    const freshSnapshot = await withMongoRetry(env, async () => {
    const snapshotProjection = { ...BILLING_SNAPSHOT_USER_PROJECTION };
    // 폐지된 코인 잔액은 응답에서 빼지만, seed 판정은 points 를 봐야 하므로 읽기에서는 남긴다.
    if (!includeLegacyCoinBalance && seedLegacyCredit !== true) delete snapshotProjection.points;
    let user = reusableUserDoc || await User.findById(auth.userId)
      .select(snapshotProjection)
      .lean();
    let seededUser = null;
    if (seedLegacyCredit === true && needsLegacyCoinCreditSeed(user)) {
      seededUser = await seedMembershipCreditFromUserDoc(auth.userId, user);
      if (!seededUser) {
        // 멱등 가드($ne: true)에 걸려 write 가 없었다 = 그 사이 다른 요청이나 재시도된 이전 시도가
        // 이미 전환했다. 손에 든 문서는 pre-seed 라 갓 지급된 월정석을 0으로 과소보고한다 —
        // 예전 주석이 걱정하던 바로 그 구간이며, 여기서만 다시 읽는다.
        user = await User.findById(auth.userId).select(snapshotProjection).lean();
      }
    }
    const effectiveUser = seededUser ? { ...(user || {}), ...seededUser } : user;
    const sub = effectiveUser?.profileSubscription || {};
    const entitlement = resolveActivePassPolicyWithProfileFallback(effectiveUser || {});
    const scopedProfileId = cleanProfileId(effectiveUser?.destinyProfilesCurrentId);
    const scopedUnlocks = includeUnlocks && auth.userId
      ? await resolveProfileScopedUnlocks(auth.userId, scopedProfileId, effectiveUser?.unlockedFeatures)
      : {
          unlockedFeatures: normalizeUnlockedFeatureList(effectiveUser?.unlockedFeatures || []),
          unlockMap: {},
          contentKeys: [],
          profileScopedAuthoritative: false,
        };
    const unlockedFeatures = Array.from(new Set(scopedUnlocks.unlockedFeatures));
    const unlockMap = { ...scopedUnlocks.unlockMap };
    const balance = includeLegacyCoinBalance ? Number(effectiveUser?.points || 0) : null;
    // 스칼라 캐시 대신 활성(미만료) lot 합계로 표시 잔액 산출 — 아직 스윕 안 된 만료분을 즉시 제외한다.
    // 🔴 소멸예정일도 **잔액과 같은 lot 집합**에서 뽑는다. 예전에는 원본 sub.membershipCreditLots 를
    // 따로 넘겨서, lot 이 비어 있고 스칼라만 있는 미마이그레이션 계정(ensureLotsForBalance 가 30일
    // lot 을 백필해 주는 경우)에서 잔액은 나오는데 소멸예정일만 null 로 빠졌다.
    // access-state.js buildMonthlyBalance · lib/auth.js normalizeAuthProfileSubscription 과 같은 규율.
    const lotsState = ensureLotsForBalance(sub || {}, Date.now());
    const membershipCreditBalance = includeMonthlyCreditBalance
      ? Math.max(0, Math.floor(Number(lotsState.balance || 0)))
      : 0;
    // 가장 이른 소멸 예정일(미만료 lot 중 가장 빨리 만료되는 것). 없으면 null.
    const monthlyStoneExpiresAt = resolveNextExpiry(lotsState.lots);
    const membership = {
      tier: entitlement.isActive ? entitlement.tier : String(sub?.tier || "free"),
      passTier: entitlement.passTier || null,
      passLabel: entitlement.passLabel || entitlement.label,
      passColorTone: entitlement.passColorTone || null,
      label: entitlement.label,
      isActive: entitlement.isActive,
      freeLimit: entitlement.maxCoveredCoin,
      passLimit: entitlement.maxCoveredCoin,
      maxCoveredCoin: entitlement.maxCoveredCoin,
      profileLimit: entitlement.maxProfiles,
      source: entitlement.source,
      expiresAt: entitlement.expiresAt || sub?.expiresAt || null,
      monthlyStoneBalance: membershipCreditBalance,
      monthlyStoneExpiresAt,
      membershipCreditBalance,
      membershipCreditGranted: Number(sub?.membershipCreditGranted || 0),
      membershipCreditUsed: Number(sub?.membershipCreditUsed || 0),
      legacyCoinCreditSeeded: Boolean(sub?.legacyCoinCreditSeeded),
      legacyCoinCreditSeededPoints: Number(sub?.legacyCoinCreditSeededPoints || 0),
      ...(includeLegacyCoinBalance ? { legacyCoinBalance: balance } : {}),
    };
    const subscription = buildBillingSubscriptionSnapshot(effectiveUser || {});

    return {
      authenticated: true,
      authUserId: String(auth.userId || ""),
      ...(includeLegacyCoinBalance ? {
        balance: Number.isFinite(balance) ? balance : 0,
        legacyCoinBalance: Number.isFinite(balance) ? balance : 0,
        coins: Number.isFinite(balance) ? balance : 0,
      } : {}),
      membershipCreditBalance,
      monthlyStoneBalance: membershipCreditBalance,
      monthlyStoneExpiresAt,
      monthlyCredits: membershipCreditBalance,
      monthlyCreditsAsCoins: membershipCreditBalance / MEMBERSHIP_CREDIT_PER_COIN,
      membership,
      subscription,
      currentProfileId: scopedProfileId || undefined,
      user: buildBillingSnapshotUser(auth, effectiveUser, balance, unlockedFeatures, membershipCreditBalance, membership, includeLegacyCoinBalance),
      unlockedFeatures,
      // 🔴 unlockedFeatures 와 다르다. 위쪽은 프로필 스코프 해금·레거시 이력까지 합친 **합집합**이고,
      // 이건 User.unlockedFeatures 원본 그대로다. hasUserScopedPermanentUnlock 이 보는 필드와 동일해야
      // 판정이 바뀌지 않으므로 재사용 목적으로는 반드시 이 원본을 쓴다(합집합을 쓰면 더 넓게 허용된다).
      accountUnlockedFeatures: Array.isArray(effectiveUser?.unlockedFeatures) ? effectiveUser.unlockedFeatures : [],
      unlockMap,
      degraded: false,
    };
    }, { attemptTimeoutMS: 11000 });
    // healthy(로그인·비degraded)이고 신원(로컬 JWT peek == 실제 authUserId)이 일치할 때만 캐시에 저장한다
    // — flower-admin 등으로 peek 신원과 스냅샷 신원이 어긋나면 교차 캐시를 원천 차단. 나머지 호출자
    // (/balance·probe·saju-entitlements·unlock-status)도 이 캐시로 인증·조회 왕복을 절감한다. TTL이 stale 상한.
    // skipCacheRead(fresh=1)여도 write-back 은 반드시 한다 — 읽기만 건너뛰는 것이 그 플래그의 계약이다.
    if (
      snapshotCacheKey
      && freshSnapshot
      && freshSnapshot.authenticated !== false
      && freshSnapshot.degraded !== true
      && String(freshSnapshot.authUserId || "") === snapshotCacheUserId
    ) {
      writeBillingBalanceToCache(snapshotCacheKey, freshSnapshot);
    }
    return freshSnapshot;
  } catch (error) {
    logBillingRouteError("billing-snapshot", error, request);
    const fallbackBalance = includeLegacyCoinBalance && Number.isFinite(Number(auth?.points)) ? Number(auth.points) : 0;
    return {
      authenticated: true,
      authUserId: String(auth.userId || ""),
      ...(includeLegacyCoinBalance ? {
        balance: fallbackBalance,
        legacyCoinBalance: fallbackBalance,
        coins: fallbackBalance,
      } : {}),
      membershipCreditBalance: 0,
      monthlyCredits: 0,
      monthlyCreditsAsCoins: 0,
      membership: null,
      subscription: { isActive: false, tier: "free", passTier: null, freeLimit: 0 },
      currentProfileId: undefined,
      user: {
        id: String(auth.userId || ""),
        ...(includeLegacyCoinBalance ? { points: fallbackBalance } : {}),
        monthlyStoneBalance: 0,
        monthlyCredits: 0,
        membershipCreditBalance: 0,
        unlockedFeatures: [],
      },
      unlockedFeatures: [],
      unlockMap: {},
      degraded: true,
      error: {
        code: "DB_FALLBACK",
        message: "Billing snapshot fallback applied.",
        errorDetails: buildBillingErrorDetails("billing-snapshot", error),
      },
    };
  }
}

function resolveSajuAnalysisPurchaseStatus(docs = [], passAvailable = false) {
  const sources = new Set(
    (Array.isArray(docs) ? docs : [])
      .map((doc) => String(doc?.source || "").trim().toUpperCase())
      .filter(Boolean),
  );
  if (sources.has(CONTENT_ENTITLEMENT_SOURCES.MONTHLY)) return "monthly";
  if (sources.has(CONTENT_ENTITLEMENT_SOURCES.PASS)) return "pass";
  if (
    sources.has(CONTENT_ENTITLEMENT_SOURCES.PAYMENT)
    || sources.has(CONTENT_ENTITLEMENT_SOURCES.COIN)
    || sources.has(CONTENT_ENTITLEMENT_SOURCES.ADMIN)
    || sources.has(CONTENT_ENTITLEMENT_SOURCES.BACKFILL)
  ) return "paid";
  return passAvailable ? "pass" : "none";
}

async function handleSajuAnalysisEntitlements(request, env) {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const requestedAttemptId = cleanProfileId(url.searchParams.get("attemptId") || "");
  const requestedProfileId = cleanProfileId(url.searchParams.get("profileId") || "");
  const snapshot = await readBillingSnapshot(request, env, { seedLegacyCredit: false, includeUnlocks: false, includeLegacyCoinBalance: false });

  if (!snapshot?.authenticated || !snapshot?.authUserId) {
    return withSajuEntitlementNoStore(failure(401, "AUTH_REQUIRED", "Authentication is required."));
  }
  if (snapshot?.degraded === true) {
    return withSajuEntitlementNoStore(failure(503, "BALANCE_SNAPSHOT_UNAVAILABLE", "Billing snapshot is temporarily unavailable."));
  }

  const profileId = cleanProfileId(requestedProfileId || requestedAttemptId || snapshot.currentProfileId || "");
  const attemptId = requestedAttemptId || profileId;
  if (!profileId) {
    return withSajuEntitlementNoStore(failure(400, "MISSING_PROFILE_ID", "Profile id is required."));
  }

  const dbStartedAt = Date.now();
  // 일시적 풀 초기화에도 해금 상태를 정확히 반환하도록 재시도로 감싼다.
  const entitlementSnapshot = await withMongoRetry(env, () => getUnlockedContentSnapshot({
    userId: String(snapshot.authUserId || ""),
    profileId,
    serviceKeys: SAJU_ANALYSIS_ENTITLEMENT_SERVICE_KEYS,
  }));
  const dbReadMs = Date.now() - dbStartedAt;
  const unlockedContentIds = Array.from(new Set(entitlementSnapshot.contentKeys || []));
  const unlockedContentSet = new Set(unlockedContentIds);
  const unlockedFeatures = Array.from(new Set(entitlementSnapshot.featureKeys || []));
  const unlockMap = { ...(entitlementSnapshot.unlockMap || {}) };
  const unlocks = Object.create(null);

  for (const [featureKey, contentKey] of Object.entries(SAJU_ANALYSIS_ENTITLEMENT_CONTENT_BY_FEATURE_KEY)) {
    const unlocked = unlockedContentSet.has(contentKey);
    unlocks[contentKey] = {
      unlocked,
      featureKey,
      contentKey,
      serviceKey: contentKey.startsWith("ziwei.") ? "ziwei" : "saju",
    };
    unlockMap[featureKey] = unlocked;
  }

  const subscriptionPass = buildMembershipPassFromBillingSnapshot(snapshot);
  const passAvailable = Boolean(subscriptionPass && resolveFeatureAccessPolicy({
    user: { profileSubscription: subscriptionPass.entitlement || subscriptionPass },
    coinCost: 50,
  }).allowed);
  const hasFullAccess = SAJU_ANALYSIS_CORE_CONTENT_IDS.every((contentId) => unlockedContentSet.has(contentId));
  const purchaseStatus = resolveSajuAnalysisPurchaseStatus(entitlementSnapshot.docs || [], passAvailable);
  const latestUnlockedAt = (entitlementSnapshot.docs || [])
    .map((doc) => new Date(doc?.unlockedAt || doc?.createdAt || 0).getTime())
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0];
  const updatedAt = new Date(latestUnlockedAt || Date.now()).toISOString();
  const data = {
    success: true,
    attemptId,
    profileId,
    authenticated: true,
    currentProfileId: profileId,
    unlockedContentIds,
    unlockedContentKeys: unlockedContentIds,
    paidContentIds: unlockedContentIds,
    unlockedFeatures,
    unlockMap,
    unlocks,
    accessUnlocks: {
      ok: true,
      profileId,
      serviceKeys: SAJU_ANALYSIS_ENTITLEMENT_SERVICE_KEYS,
      unlockedContentKeys: unlockedContentIds,
      unlocks,
    },
    passAvailable,
    hasFullAccess,
    purchaseStatus,
    updatedAt,
  };

  logSajuUnlockEntitlement({
    userId: snapshot.authUserId,
    attemptId,
    purchaseStatus,
    unlockedContentIdsLength: unlockedContentIds.length,
    dbReadMs,
    totalMs: Date.now() - startedAt,
  });

  return withSajuEntitlementNoStore(success(data, "Saju analysis entitlement snapshot loaded."));
}

// 클라이언트가 앱 진입 시 멤버십 커버리지만 새로고침하려고 보내는 상태 조회 전용 의사 키.
// 실제 구매 가능한 기능이 아니므로 서버 가격표를 요구하지 않는다(index.html `_cdRefreshMembershipCoverage`).
const MEMBERSHIP_STATUS_PROBE_FEATURE_KEY = "membership-status-refresh";
const ENTITLEMENT_ONLY_PROBE_FEATURE_KEYS = new Set([
  "ad_free",
  "ad_free_pass",
  "ad-free",
  "ad_removal",
  "ads_free",
  "ads_removed",
  "code_destiny_ad_free",
  "no_ads",
  "remove_ads",
]);

const AD_REMOVAL_ENTITLEMENT_KEYS = new Set([
  "ad_free",
  "ad_free_pass",
  "adfree",
  "ad_removal",
  "adremoval",
  "ads_disabled",
  "adsdisabled",
  "ads_free",
  "adsfree",
  "ads_removed",
  "code_destiny_ad_free",
  "has_ad_removal",
  "hasadremoval",
  "no_ads",
  "noads",
  "remove_ads",
  "removeads",
]);

function normalizeEntitlementProbeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_");
}

function hasEntitlementProbeUnlock(data = {}, featureKey = "") {
  const target = normalizeEntitlementProbeKey(featureKey);
  const targetKeys = AD_REMOVAL_ENTITLEMENT_KEYS.has(target)
    ? AD_REMOVAL_ENTITLEMENT_KEYS
    : new Set([target]);
  const lists = [data.unlockedFeatures, data.accountUnlockedFeatures];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    if (list.some((entry) => targetKeys.has(normalizeEntitlementProbeKey(entry)))) return true;
  }
  const unlockMap = data.unlockMap && typeof data.unlockMap === "object" ? data.unlockMap : {};
  return Object.entries(unlockMap).some(([key, value]) => targetKeys.has(normalizeEntitlementProbeKey(key)) && value === true);
}

// membership-status-refresh 상태 조회: 가격표 없이 스냅샷에서 이용권 커버리지만 200으로 반환한다.
// 응답 필드는 `_cdRefreshMembershipCoverage`의 unlock-status 성공 분기가 읽는 계약에 맞춘다.
async function handleMembershipStatusProbe(request, env) {
  // 이용권 상태 프로브는 unlockMap을 사용하지 않으므로 unlock 조회(프로필 스코프 2 RTT)를 건너뛴다.
  // (handleSajuAnalysisEntitlements와 동일 패턴 — pass/월정석 커버리지만 필요.)
  const data = await readBillingSnapshot(request, env, { seedLegacyCredit: false, includeUnlocks: false, includeLegacyCoinBalance: false });
  if (data?.degraded === true) {
    return failure(
      503,
      "BALANCE_SNAPSHOT_UNAVAILABLE",
      "이용권 혜택을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      undefined,
      {
        status: "error",
        degraded: true,
        membershipCreditBalance: 0,
        monthlyCredits: 0,
        monthlyCreditsAsCoins: 0,
      },
      data?.error?.errorDetails || data?.error?.details,
    );
  }

  const membershipPass = buildMembershipPassFromBillingSnapshot(data);
  const subscription = data.subscription || { isActive: false, tier: "free", passTier: null, freeLimit: 0 };
  const monthlyBalance = Math.max(0, Math.floor(Number(data.membershipCreditBalance ?? data.membership?.membershipCreditBalance ?? 0)));
  const passActive = Boolean(membershipPass?.isActive || subscription.isActive);
  const passTier = subscription.passTier || membershipPass?.passTier || null;
  const tier = passActive ? String(membershipPass?.tier || subscription.tier || "free") : "free";
  const passLimit = Math.max(0, Math.floor(Number(subscription.freeLimit || membershipPass?.passLimit || membershipPass?.maxCoveredCoin || 0)));
  const expiresAt = subscription.entitlement?.expiresAt || membershipPass?.entitlement?.expiresAt || null;
  const canUseByMonthly = monthlyBalance > 0;
  const paymentOptions = {
    coinCost: 0,
    hasActivePass: passActive,
    passTier,
    passLimit,
    canUseByPass: passActive,
    canUseByMonthly,
    monthlyBalance,
  };

  return success({
    statusOnly: true,
    featureKey: MEMBERSHIP_STATUS_PROBE_FEATURE_KEY,
    paymentOptions,
    hasActivePass: passActive,
    passTier,
    passLimit,
    subscriptionTier: tier,
    freeLimit: passLimit,
    freeBySubscription: passActive,
    canUseByPass: passActive,
    canUseByMonthly,
    monthlyBalance,
    expiresAt,
    membershipPass,
    subscription,
  }, "이용권 상태를 조회했습니다.");
}

async function handleUnlockStatus(request, env) {
  const url = new URL(request.url);
  const categoryKey = String(url.searchParams.get("categoryKey") || "").trim();
  const subFeatureKey = String(url.searchParams.get("subFeatureKey") || "").trim();
  const featureKey = String(url.searchParams.get("featureKey") || "").trim();
  const reason = String(url.searchParams.get("reason") || "").trim();
  const requestedScope = String(url.searchParams.get("scope") || "").trim().toLowerCase();
  const passOnly = requestedScope === "pass";
  const entitlementOnly = requestedScope === "entitlement";

  // 상태 조회 전용 의사 키: 구매 가능한 유료 기능이 아니라 멤버십 커버리지 스냅샷만 필요하다.
  // 가격표 조회를 건너뛰고 스냅샷 기반 커버리지를 200으로 반환한다(가격표가 없어 404가 나던 문제 해결).
  if (featureKey === MEMBERSHIP_STATUS_PROBE_FEATURE_KEY) {
    return await handleMembershipStatusProbe(request, env);
  }

  // 광고 제거처럼 가격표에 등록되지 않은 계정 entitlement만 확인하는 경로다.
  // 일반 잔액 스냅샷과 분리해 User.points·월정석 잔액을 읽지 않는다.
  if (entitlementOnly && ENTITLEMENT_ONLY_PROBE_FEATURE_KEYS.has(normalizeEntitlementProbeKey(featureKey))) {
    const data = await readBillingSnapshot(request, env, {
      seedLegacyCredit: false,
      includeLegacyCoinBalance: false,
      includeMonthlyCreditBalance: false,
    });
    if (data?.degraded === true) {
      return failure(503, "BALANCE_SNAPSHOT_UNAVAILABLE", "Entitlement snapshot is temporarily unavailable.", undefined, {
        status: "error",
        degraded: true,
      });
    }
    return success({
      featureKey: normalizeEntitlementProbeKey(featureKey),
      unlocked: hasEntitlementProbeUnlock(data, featureKey),
      entitlementOnly: true,
    }, "Entitlement status loaded.");
  }

  const pricingResult = getBillingFeaturePricing({ categoryKey, subFeatureKey, featureKey, reason });
  if (!pricingResult.ok) {
    return failure(404, "PRICE_NOT_FOUND", pricingResult.message || "가격 정보를 찾을 수 없습니다.");
  }

  const data = await readBillingSnapshot(request, env, {
    seedLegacyCredit: false,
    includeLegacyCoinBalance: false,
    includeMonthlyCreditBalance: !entitlementOnly,
  });
  if (data?.degraded === true) {
    return failure(
      503,
      "BALANCE_SNAPSHOT_UNAVAILABLE",
      "이용권 혜택을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      undefined,
      {
        status: "error",
        degraded: true,
        membershipCreditBalance: 0,
        monthlyCredits: 0,
        monthlyCreditsAsCoins: 0,
      },
      data?.error?.errorDetails || data?.error?.details,
    );
  }
  const unlockMap = data.unlockMap && typeof data.unlockMap === "object" ? data.unlockMap : {};
  let pricing = pricingResult.pricing;
  let unlocked = Boolean(unlockMap[pricing.featureKey]);
  const currentBalance = null;
  const subscription = data.subscription || { isActive: false, tier: "free", passTier: null, freeLimit: 0 };
  const subscriptionEntitlement = {
    isActive: subscription.isActive,
    tier: subscription.tier,
    passTier: subscription.passTier,
    maxCoveredCoin: subscription.freeLimit,
    expiresAt: subscription.entitlement?.expiresAt || null,
  };
  pricing = applyPdfPassDiscountToPricing(pricing, subscriptionEntitlement);
  let paymentDecision = buildPassPaymentDecision(
    subscriptionEntitlement,
    pricing,
    passOnly || entitlementOnly ? {} : {
      membershipCreditBalance: Number(data.membershipCreditBalance ?? data.membership?.membershipCreditBalance ?? 0),
    },
    passOnly ? { monthlyBalance: 0 } : {},
  );

  const subscriptionPass = buildMembershipPassFromBillingSnapshot(data);
  const accessProfileId = cleanProfileId(url.searchParams.get("profileId") || data.currentProfileId || "");
  const accessDecision = await resolvePaidContentAccess(env, {
    userId: String(data.authUserId || ""),
    profileId: accessProfileId,
    pricing,
    requestId: String(url.searchParams.get("requestId") || "").trim(),
    allowPassAutoUnlock: false,
    subscriptionPass,
    // 스냅샷이 이미 읽어 온 User.unlockedFeatures 원본을 넘겨 같은 필드의 User.exists 왕복을 없앤다.
    accountUnlockedFeatures: Array.isArray(data.accountUnlockedFeatures) ? data.accountUnlockedFeatures : null,
    body: {
      actionType: String(url.searchParams.get("actionType") || "").trim(),
    },
  });
  if (isTemporaryUnavailableAccessDecision(accessDecision)) {
    return buildPassStatusTemporarilyUnavailableFailure(pricing, {
      profileId: accessProfileId || undefined,
      profileSubscription: subscriptionPass?.profileSubscription || null,
      paymentOptions: accessDecision.paymentOptions || undefined,
      scope: accessDecision.scope || "unlock_status_access_decision",
      cause: accessDecision.cause,
      errorDetails: accessDecision.errorDetails || null,
    });
  }
  if (accessDecision.paymentOptions) paymentDecision = accessDecision.paymentOptions;
  const passStatusCovered = paymentDecision.canUseByPass === true;
  const responseAccessDecision = passStatusCovered && !accessDecision.accessGranted
    ? {
      ...accessDecision,
      accessGranted: true,
      reason: "pass_covered",
      shouldOpenPaymentSelector: false,
    }
    : accessDecision;
  if (accessDecision.accessGranted) {
    unlocked = true;
    if (pricing.featureKey) unlockMap[pricing.featureKey] = true;
  }

  if (passOnly) {
    // 🔴 expiresAt 을 반드시 함께 준다. 클라이언트 스냅샷(cd_subscription_snapshot_v2)의 유효기간은
    // 벽시계 TTL 이 아니라 이 만료일이라, 이 필드가 없으면 스냅샷이 "만료일을 모르는 active" 가 되어
    // 5분 뒤 폐기되고 이용권 보유자가 다시 차단형 서버 왕복을 탄다. 값은 위에서 이미 읽어 둔
    // subscriptionEntitlement 것이라 DB 왕복이 늘지 않는다.
    return success({
      pricing,
      profileId: accessProfileId,
      coinCost: paymentDecision.coinCost,
      amountKRW: paymentDecision.amountKRW,
      hasActivePass: paymentDecision.hasActivePass,
      passTier: paymentDecision.passTier,
      passLimit: paymentDecision.passLimit,
      passLimitKRW: paymentDecision.passLimitKRW,
      canUseByPass: passStatusCovered,
      expiresAt: subscriptionEntitlement.expiresAt || null,
      paymentOptions: {
        coinCost: paymentDecision.coinCost,
        amountKRW: paymentDecision.amountKRW,
        hasActivePass: paymentDecision.hasActivePass,
        passTier: paymentDecision.passTier,
        passLimit: paymentDecision.passLimit,
        passLimitKRW: paymentDecision.passLimitKRW,
        canUseByPass: passStatusCovered,
        expiresAt: subscriptionEntitlement.expiresAt || null,
        canUseByMonthly: false,
        canUseByCard: false,
        recommendedMethod: passStatusCovered ? "PASS" : "PAYMENT_REQUIRED",
        recommendedMethods: passStatusCovered ? ["PASS"] : [],
        equalPriorityMethods: [],
        hiddenMethods: passStatusCovered ? ["DIRECT_KRW", "MOONLIGHT_STONE", "COIN"] : [],
        paymentPriority: passStatusCovered ? "PASS_FIRST" : "PAYMENT_AFTER_PASS",
        decisionReason: paymentDecision.decisionReason,
      },
      accessDecision: responseAccessDecision,
      accessReason: accessDecision.reason === "already_unlocked"
        ? ACCESS_DECISION_REASONS.ALREADY_UNLOCKED
        : (passStatusCovered ? ACCESS_DECISION_REASONS.SUBSCRIPTION_ACTIVE : accessDecision.reason),
      subscriptionTier: subscription.tier,
      freeLimit: Number(subscription.freeLimit || 0),
      freeBySubscription: passStatusCovered,
      accessGateResult: accessDecision.accessGateResult || null,
      licensePass: accessDecision.accessGateResult || null,
      requiredCoins: accessDecision.accessGranted || passStatusCovered ? 0 : Number(pricing.cost || 0),
      shouldOpenPaymentSelector: false,
      availableMethods: passStatusCovered ? ["PASS"] : [],
      canAccess: Boolean(accessDecision.accessGranted || passStatusCovered),
    }, "이용권 접근 상태를 조회했습니다.");
  }

  // 🔴 여기서 canAccessPaidFeature 를 부르지 않는다. 결과를 담던 serverAccessDecision 필드는
  // 레포 전수 조회 결과 소비자가 없고(생산자 1곳뿐), 위 accessDecision/paymentDecision 이 이미
  // 접근 판정을 끝냈다. 그런데도 이 호출은 위에서 읽은 것과 같은 User 문서를 다시 읽고
  // (paid-feature-access.js) 이어서 Payment.find 를 직렬로 한 번 더 돌았다 — 그 두 왕복이
  // 이용권 미보유자의 "이용권 확인" 대기에 그대로 얹혔다(미보유자는 사용자 문서의 해금 목록에
  // 키가 없어 Payment 조회를 항상 수행하므로 보유자보다 비싸다).
  const legacyAccess = buildAccessDecision({
    pricing,
    authenticated: Boolean(data.authenticated),
    balance: currentBalance,
    unlockMap,
    subscription,
  });

  return success({
    pricing,
    profileId: accessProfileId,
    ...paymentDecision,
    paymentOptions: paymentDecision,
    unlocked,
    accessDecision: responseAccessDecision,
    accessReason: accessDecision.reason === "already_unlocked"
      ? ACCESS_DECISION_REASONS.ALREADY_UNLOCKED
      : (passStatusCovered ? ACCESS_DECISION_REASONS.SUBSCRIPTION_ACTIVE : legacyAccess.reason),
    subscriptionTier: subscription.tier,
    freeLimit: Number(subscription.freeLimit || 0),
    freeBySubscription: passStatusCovered,
    serverAccessDecision: null,
    accessGateResult: accessDecision.accessGateResult || null,
    licensePass: accessDecision.accessGateResult || null,
    currentBalance,
    requiredCoins: accessDecision.accessGranted || passStatusCovered ? 0 : Number(pricing.cost || 0),
    shouldOpenPaymentSelector: passStatusCovered ? false : accessDecision.shouldOpenPaymentSelector,
    availableMethods: accessDecision.availableMethods,
    canAccess: Boolean(accessDecision.accessGranted || passStatusCovered),
  }, "기능 접근 상태를 조회했습니다.");
}

async function handleCoinGate(request, env) {
  const body = await readJson(request);
  const pricingResult = resolvePricingFromBody(body);

  if (!pricingResult.ok) {
    return failure(404, "PRICE_NOT_FOUND", pricingResult.message || "가격 정보를 찾을 수 없습니다.");
  }

  return processCoinGateFromPricing(request, env, body, pricingResult);
}

async function handleLegacyPurchaseOrCharge(request, env) {
  const body = await readJson(request);
  const pricingResult = resolvePricingFromBody(body);

  if (!pricingResult.ok) {
    return failure(
      400,
      "UNKNOWN_FEATURE_KEY",
      "결제 상품 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      undefined,
      {
        featureKey: String(body?.featureKey || "").trim() || undefined,
      },
    );
  }

  return processCoinGateFromPricing(request, env, body, pricingResult);
}

async function handleLegacyRefund(request, env) {
  const authCheck = await requireBillingAuth(request, env, { cost: 1 });
  if (!authCheck.ok) return authCheck.response;

  const body = await readJson(request);
  let delegatedResponse = null;
  let payload = {};
  try {
    const delegatedRequest = buildRoutedRequest(request, "/api/fortune/pig-coin/refund", "POST", body);
    delegatedResponse = await handleFortuneRoutes(delegatedRequest, env);
    payload = await readPayloadSafe(delegatedResponse);
  } catch (error) {
    logBillingRouteError("refund-delegate-fortune", error, request);
    return failure(
      500,
      "SERVER_ERROR",
      "환불 처리 중 서버 오류가 발생했습니다.",
      String(error?.message || ""),
      {},
      buildBillingErrorDetails("refund-delegate-fortune", error),
    );
  }

  if (!delegatedResponse.ok) {
    const mapped = mapCoinGateFailure(delegatedResponse.status, payload);
    return failure(mapped.status, mapped.code, mapped.message, mapped.debugMessage);
  }

  return success(payload, toMessage(payload, "환불 요청이 처리되었습니다."));
}

async function delegateToPayments(request, env, targetPath, body, options = {}) {
  const delegatedStartedAt = Date.now();
  let delegatedResponse = null;
  let payload = {};
  try {
    const delegatedRequest = buildRoutedRequest(request, targetPath, "POST", body);
    delegatedResponse = await handlePaymentRoutes(delegatedRequest, env, {
      preverifiedAuth: options?.preverifiedAuth || null,
    });
    payload = await readPayloadSafe(delegatedResponse);
  } catch (error) {
    logBillingRouteError("delegate-to-payments", error, request, { targetPath });
    return failure(
      500,
      "SERVER_ERROR",
      "결제 서버 처리 중 오류가 발생했습니다.",
      String(error?.message || ""),
      {},
      buildBillingErrorDetails("delegate-to-payments", error, { targetPath }),
    );
  }

  if (!delegatedResponse.ok) {
    const rawCode = normalizeBillingErrorCode(toCode(payload));
    const isConfirmTarget = String(targetPath || "").includes("/confirm");
    const code = delegatedResponse.status === 401 || delegatedResponse.status === 403
      ? "AUTH_REQUIRED"
      : (rawCode !== "SERVER_ERROR" ? rawCode : (isConfirmTarget ? "PAYMENT_VERIFICATION_FAILED" : "SERVER_ERROR"));
    // confirm 은 카드 승인 이후 단계다. 5xx 를 "결제 검증에 실패했습니다"로만 알리면 사용자가
    // 재결제를 시도해 이중 결제가 난다 — 이 경우에만 재시도 금지 안내를 붙인다.
    const message = isConfirmTarget && delegatedResponse.status >= 500
      ? CONFIRM_AFTER_CHARGE_FAILURE_MESSAGE
      : (code === "PAYMENT_VERIFICATION_FAILED"
        ? "결제 검증에 실패했습니다."
        : (delegatedResponse.status >= 500 ? "서버 결제 처리 중 오류가 발생했습니다." : "결제 요청이 거부되었습니다."));
    return failure(
      delegatedResponse.status,
      code,
      message,
      toMessage(payload, "결제 요청 실패"),
    );
  }

  try {
    const accessGrant = payload?.accessGrant && typeof payload.accessGrant === "object" ? payload.accessGrant : null;
    const featureKey = String(accessGrant?.featureKey || body?.featureKey || options?.pricing?.featureKey || "").trim();
    const contentId = resolveSajuProfileUnlockContentKey(featureKey, body?.contentKey || accessGrant?.contentKey || "");
    if (String(targetPath || "").includes("/confirm") && accessGrant && SAJU_PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY[featureKey]) {
      logSajuPaymentUnlockApplied({
        userId: options?.authUserId || body?.userId || "",
        attemptId: accessGrant?.profileId || body?.profileId || body?.selectedProfileId || "",
        paymentId: body?.paymentId || body?.impUid || body?.merchantUid || payload?.payment?.merchantUid || payload?.payment?.id || "",
        productId: body?.productId || payload?.payment?.productId || featureKey,
        contentIds: contentId ? [contentId] : [],
        paymentVerified: true,
        unlockSaved: Boolean(accessGrant?.evidenceId || accessGrant?.unlockId || accessGrant?.purchaseId || payload?.accessGranted === true),
        totalMs: Date.now() - delegatedStartedAt,
      });
    }
  } catch (_) {}

  if (options?.premiumAccess === true && options?.authUserId && options?.pricing) {
    const pricing = options.pricing;
    const accessGrant = payload?.accessGrant && typeof payload.accessGrant === "object" ? payload.accessGrant : null;
    const payment = payload?.payment && typeof payload.payment === "object" ? payload.payment : null;
    const transactionId = String(
      accessGrant?.evidenceId
        || accessGrant?.purchaseId
        || payment?._id
        || payment?.id
        || payment?.merchantUid
        || body?.merchantUid
        || body?.merchant_uid
        || body?.paymentId
        || body?.impUid
        || "",
    ).trim();
    return successWithPremiumAccess(env, options.authUserId, {
      pricing,
      ...payload,
      consume: {
        ok: true,
        featureKey: String(pricing.featureKey || ""),
        transactionId,
        chargedCoins: Number(pricing.coinPrice || pricing.cost || body?.coinPrice || 0),
        accessType: String(accessGrant?.accessType || "single_purchase"),
      },
      accessGrant: accessGrant || {
        ok: true,
        accessType: "single_purchase",
        featureKey: String(pricing.featureKey || ""),
        requestId: String(body?.requestId || ""),
        evidenceId: transactionId || undefined,
      },
    }, toMessage(payload, "결제 확인이 완료되었습니다."));
  }

  return success(payload, toMessage(payload, "결제 요청이 성공했습니다."));
}

// Existing permanent unlocks may bypass duplicate payment. An explicit DIRECT_KRW
// choice must never be converted to pass access before the PortOne flow.
async function grantPassFreeAccessBeforeCardIfAvailable(request, env, body = {}, authCheckOverride = null, pricingResultOverride = null) {
  const pricingResult = pricingResultOverride || resolvePricingFromBody(body);
  if (!pricingResult?.ok) return null;

  const authCheck = authCheckOverride || await requireBillingAuth(request, env, pricingResult.pricing);
  if (!authCheck.ok || !authCheck?.auth?.userId) return null;

  let pricing = pricingResult.pricing;
  const requestId = resolveRequestId(request, body);
  const reportId = String(body?.reportId || body?.accessGrant?.reportId || "").trim();
  const reportSessionId = String(
    body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || resolvePaidReportSessionFallback(pricing, reportId, requestId),
  ).trim();
  const profileId = await resolveBillingProfileId(authCheck.auth.userId, body, env, authCheck.auth.authUserDoc || null);
  const scopedBody = profileId ? { ...body, profileId, selectedProfileId: profileId } : body;
  const persistProfileUnlockEntitlement = shouldPersistProfileUnlockEntitlement(pricing);
  if (persistProfileUnlockEntitlement) {
    const existingProfileUnlock = await findActiveSajuProfileUnlock(env, {
      userId: authCheck.auth.userId,
      profileId,
      featureKey: pricing?.featureKey,
    });
    if (existingProfileUnlock) {
      return successWithPremiumAccess(env, authCheck.auth.userId, {
        pricing,
        alreadyUnlocked: true,
        consume: {
          ok: true,
          transactionType: "unlock_entitlement",
          accessType: "already_unlocked",
          requestId,
          featureKey: String(pricing.featureKey || ""),
          profileId: profileId || undefined,
          chargedCoins: 0,
        },
        checkout: {
          bypassed: true,
          bypassReason: "ALREADY_UNLOCKED",
          paymentMode: "MEMBERSHIP_PASS",
          orderCreated: false,
        },
        premiumAccessToken: null,
        accessGrant: {
          ok: true,
          accessType: "already_unlocked",
          featureKey: String(pricing.featureKey || ""),
          sessionId: reportSessionId || undefined,
          requestId,
          purchaseId: String(existingProfileUnlock._id || ""),
          evidenceId: String(existingProfileUnlock._id || ""),
          reportId: reportId || undefined,
          profileId: profileId || undefined,
          paidAt: existingProfileUnlock.unlockedAt ? new Date(existingProfileUnlock.unlockedAt).toISOString() : new Date().toISOString(),
        },
        unlockedFeatures: [String(pricing.featureKey || "")],
        unlockMap: { [String(pricing.featureKey || "")]: true },
        balance: null,
      }, "ALREADY_UNLOCKED");
    }
  }

  if (!shouldApplyMembershipPassBeforeCard(body)) return null;

  const subscriptionPass = await getMembershipPassForBillingRequest(
    request,
    env,
    authCheck.auth.userId,
    authCheck.auth.authUserDoc || null,
  );
  pricing = applyPdfPassDiscountToPricing(pricing, subscriptionPass.entitlement || {});
  const paymentDecision = buildPassPaymentDecision(
    subscriptionPass.entitlement,
    pricing,
    subscriptionPass.profileSubscription,
  );
  if (!paymentDecision.canUseByPass) return null;
  const profilePolicy = await assertProfileCardPassPolicyIfNeeded({
    userId: authCheck.auth.userId,
    profileId,
    pricing,
    body: scopedBody,
  });
  if (!profilePolicy.ok) {
    return failure(
      402,
      profilePolicy.reason === "price_exceeds_pass_limit" ? "PRICE_EXCEEDS_PASS_LIMIT" : "PROFILE_LIMIT_EXCEEDED",
      "현재 이용권 정책으로 처리할 수 없는 프로필 카드 요청입니다.",
      undefined,
      {
        pricing,
        ...paymentDecision,
        paymentOptions: {
          ...paymentDecision,
          profilePolicy: profilePolicy.policy || null,
        },
        accessGrant: null,
        balance: null,
      },
    );
  }

  const tierPassConsume = await consumeTierPassIfAvailable(env, authCheck.auth.userId, pricing, requestId, scopedBody, { profileId });
  if (!tierPassConsume?.ok) {
    logPaidAccessStage("PASS_DENIED", {
      requestId,
      userId: authCheck.auth.userId,
      featureKey: pricing?.featureKey,
      profileId,
      accessMethod: "pass",
      paymentMethod: "PASS",
      amountCoins: resolvePricingCoinCost(pricing),
      amountKRW: resolvePricingAmountKRW(pricing, resolvePricingCoinCost(pricing)),
      passEligible: false,
      passTier: paymentDecision.passTier,
      passLimit: paymentDecision.passLimit,
      idempotencyKey: requestId,
    });
    return null;
  }
  logPaidAccessStage(tierPassConsume.idempotent ? "PASS_ACCESS_DUPLICATE_RETURNED" : "PASS_ACCESS_GRANTED", {
    requestId,
    userId: authCheck.auth.userId,
    featureKey: pricing?.featureKey,
    profileId,
    accessMethod: tierPassConsume.accessMethod,
    paymentMethod: tierPassConsume.accessMethod === "family" ? "FAMILY" : "PASS",
    amountCoins: tierPassConsume.coinCost,
    amountKRW: tierPassConsume.amountKRW,
    passEligible: true,
    passTier: tierPassConsume.passTier,
    passLimit: paymentDecision.passLimit,
    idempotencyKey: tierPassConsume.idempotencyKey || requestId,
  });

  let passEvidence = null;
  try {
    passEvidence = await recordPassAccessIfNeeded(env, authCheck.auth.userId, pricing, requestId, {
      ...scopedBody,
      reportId,
    sessionId: reportSessionId,
    reportSessionId,
    accessMethod: tierPassConsume.accessMethod === "family" ? "FAMILY" : "PASS",
  }, {
    ...subscriptionPass.entitlement,
    passTier: tierPassConsume.passTier,
  }, authCheck.auth?.authUserDoc?.points);
  } catch (error) {
    logBillingRouteError("pass-access-record", error, request, {
      featureKey: String(pricing?.featureKey || ""),
      requestId,
      profileId: profileId || undefined,
    });
    return passEvidenceFailure(error, { pricing, requestId, profileId });
  }
  let unlockEntitlement = null;
  if (persistProfileUnlockEntitlement) {
    try {
      unlockEntitlement = await upsertSajuProfileUnlockEntitlement(env, {
        userId: authCheck.auth.userId,
        profileId,
        featureKey: pricing.featureKey,
        contentKey: body?.contentKey,
        source: CONTENT_ENTITLEMENT_SOURCES.PASS,
        passId: `membership:${subscriptionPass.tier}:${requestId}`,
        coinAmount: 0,
      });
    } catch (error) {
      return failure(
        error?.code === "MISSING_PROFILE_ID" ? 403 : 500,
        "UNLOCK_ENTITLEMENT_SAVE_FAILED",
        "Unlock entitlement could not be saved.",
        String(error?.message || ""),
        {
          pricing,
          pendingUnlock: true,
          accessGrant: {
            featureKey: String(pricing.featureKey || ""),
            requestId,
            evidenceId: String(passEvidence?._id || ""),
            profileId: profileId || undefined,
          },
        },
      );
    }
  }

  return successWithPremiumAccess(env, authCheck.auth.userId, {
    pricing,
    ...paymentDecision,
    paymentOptions: paymentDecision,
    accessMethod: tierPassConsume.accessMethod === "family" ? "FAMILY" : "PASS",
    checkout: {
      bypassed: true,
      bypassReason: "PASS_FREE",
      paymentMode: "MEMBERSHIP_PASS",
      orderCreated: false,
    },
    charged: 0,
    consume: {
      ok: true,
      transactionType: tierPassConsume.transactionType || "membership_pass",
      accessType: tierPassConsume.accessType || "membership_pass",
      accessMethod: tierPassConsume.accessMethod === "family" ? "FAMILY" : "PASS",
      paymentMethod: tierPassConsume.accessMethod === "family" ? "FAMILY" : "PASS",
      requestId,
      featureKey: String(pricing.featureKey || ""),
      coinPrice: tierPassConsume.coinCost,
      amountCoins: tierPassConsume.coinCost,
      amountKRW: tierPassConsume.amountKRW,
      passTier: tierPassConsume.passTier,
      idempotent: Boolean(tierPassConsume.idempotent),
      chargedCoins: 0,
      membershipCreditCost: 0,
    },
    premiumAccessToken: null,
    accessGrant: {
      ok: true,
      accessType: tierPassConsume.accessType || "membership_pass",
      accessMethod: tierPassConsume.accessMethod === "family" ? "FAMILY" : "PASS",
      featureKey: String(pricing.featureKey || ""),
      sessionId: reportSessionId || undefined,
      requestId,
      purchaseId: requestId,
      evidenceId: String(unlockEntitlement?._id || passEvidence?._id || `membership:${subscriptionPass.tier}:${requestId}`),
      unlockGrant: unlockEntitlement?.unlockGrant || null,
      reportId: reportId || undefined,
      profileId: profileId || undefined,
      paidAt: new Date().toISOString(),
    },
    balance: null,
    membershipPass: {
      tier: subscriptionPass.tier,
      passTier: subscriptionPass.passTier,
      freeLimit: subscriptionPass.freeLimit,
      passLimit: subscriptionPass.passLimit || subscriptionPass.freeLimit,
      maxCoveredCoin: subscriptionPass.maxCoveredCoin || subscriptionPass.passLimit || subscriptionPass.freeLimit,
    },
    user: {
      id: String(authCheck.auth.userId || ""),
      profileSubscription: subscriptionPass.profileSubscription || null,
    },
    freeBySubscription: true,
  }, "PASS_FREE");
}

async function buildDiscountedPdfPaymentDelegation(request, env, body = {}, pricingResult = null, authCheckOverride = null) {
  const resolved = pricingResult || resolvePricingFromBody(body);
  if (!resolved?.ok || !canGeneratePaidPdf(resolved.pricing)) {
    return { body, pricing: resolved?.pricing || null };
  }

  const authCheck = authCheckOverride || await requireBillingAuth(request, env, resolved.pricing);
  if (!authCheck.ok || !authCheck?.auth?.userId) return { body, pricing: resolved.pricing, response: authCheck.response };

  const subscriptionPass = await getMembershipPassForBillingRequest(
    request,
    env,
    authCheck.auth.userId,
    authCheck.auth.authUserDoc || null,
  );
  const pricing = applyPdfPassDiscountToPricing(resolved.pricing, subscriptionPass.entitlement || {});
  if (!pricing?.passDiscount || Number(pricing.coinPrice || pricing.cost || 0) <= 0) return { body, pricing };

  return {
    pricing,
    body: {
      ...body,
      cost: Number(pricing.cost || 0),
      coinPrice: Number(pricing.coinPrice || 0),
      paymentAmount: Number(pricing.amountKRW || pricing.cashPrice || 0),
      amount: Number(pricing.amountKRW || pricing.cashPrice || 0),
      membershipCreditCost: Number(pricing.membershipCreditCost || 0),
      pricingSnapshot: pricing,
      passDiscount: pricing.passDiscount,
      pdfPassDiscount: pricing.passDiscount,
    },
  };
}

async function handleCheckout(request, env) {
  // DIRECT_KRW는 인증과 서버 가격 확인 후 곧바로 payments 어댑터로 위임한다.
  // 이용권 검증은 명시적인 MEMBERSHIP_PASS 명령에서만 수행한다.
  const checkoutStartedAt = Date.now();
  const body = await readJson(request);
  const serverProductType = resolveServerProductType({
    body,
    paymentType: body?.paymentType,
    productId: body?.productId || body?.planId,
  });
  const isSubscription = isPassLikeProductType(serverProductType)
    || Boolean(body?.subscriptionTier)
    || String(body?.paymentType || "").toLowerCase() === "subscription";
  const checkoutPricingResult = isSubscription ? null : resolvePricingFromBody(body);
  const checkoutAuthCheck = await requireBillingAuth(
    request,
    env,
    checkoutPricingResult?.ok ? checkoutPricingResult.pricing : { cost: 1 },
  );
  if (!checkoutAuthCheck.ok) {
    logCheckoutElapsed(body, checkoutStartedAt, checkoutAuthCheck.response?.status, "auth");
    return checkoutAuthCheck.response;
  }
  const targetPath = isSubscription ? "/api/payments/subscription/prepare" : "/api/payments/prepare";
  const response = await delegateToPayments(request, env, targetPath, body, {
    preverifiedAuth: checkoutAuthCheck.auth,
  });
  logCheckoutElapsed(body, checkoutStartedAt, response?.status, isSubscription ? "subscription" : "direct");
  return response;
}

// 기존 logPaidAccessStage 스키마에 elapsedMs·httpStatus 가 이미 있어 새 로그 채널을 만들지 않는다.
// wrangler tail 에서 [worker-paid-access] 로 같이 조회된다.
function logCheckoutElapsed(body, startedAt, httpStatus, branch) {
  try {
    logPaidAccessStage("CHECKOUT_DONE", {
      featureKey: body?.featureKey || body?.reason || "",
      requestId: body?.requestId || "",
      idempotencyKey: body?.idempotencyKey || "",
      httpStatus: Number(httpStatus || 0),
      elapsedMs: Date.now() - startedAt,
      scope: branch,
    });
  } catch (_) {}
}

// 카드 승인이 끝난 뒤(confirm 단계)의 실패에만 쓰는 문구. "다시 결제하지 마세요"가 핵심이다 —
// 이 안내가 없으면 사용자가 재시도해서 이중 결제가 난다. 결제창을 여는 /checkout 단계에는 쓰지 않는다.
const CONFIRM_AFTER_CHARGE_FAILURE_MESSAGE = "일시적인 서버 오류로 결제 확인이 지연되고 있습니다. 카드는 이미 결제되었을 수 있으니 다시 결제하지 마시고, 내 정보 > 결제 내역에서 상태를 확인해 주세요.";

// 상태코드·code 는 그대로 두고 사용자 문구만 결제 문맥으로 바꾼다(프론트 분기 보존).
async function replaceConfirmAuthFailureMessage(response) {
  try {
    const payload = await response.clone().json();
    return json({
      ...payload,
      message: CONFIRM_AFTER_CHARGE_FAILURE_MESSAGE,
      ...(payload?.error && typeof payload.error === "object"
        ? { error: { ...payload.error, message: CONFIRM_AFTER_CHARGE_FAILURE_MESSAGE } }
        : {}),
    }, { status: response.status });
  } catch (_) {
    return response;
  }
}

async function handleConfirm(request, env) {
  const body = await readJson(request);
  const serverProductType = resolveServerProductType({
    body,
    paymentType: body?.paymentType,
    productId: body?.productId || body?.planId,
  });
  const isSubscription = isPassLikeProductType(serverProductType)
    || Boolean(body?.subscriptionTier)
    || String(body?.paymentType || "").toLowerCase() === "subscription";
  const hasPaymentVerificationPayload = Boolean(body?.impUid || body?.paymentId || body?.merchantUid || body?.merchant_uid);
  const pricingResult = !isSubscription ? resolvePricingFromBody(body) : null;
  const confirmAuthCheck = await requireBillingAuth(
    request,
    env,
    pricingResult?.ok ? pricingResult.pricing : { cost: 1 },
  );
  if (!confirmAuthCheck.ok) return replaceConfirmAuthFailureMessage(confirmAuthCheck.response);
  const delegatedPricing = pricingResult?.pricing || null;
  let premiumAccessOptions = null;
  if (!isSubscription && hasPaymentVerificationPayload && pricingResult?.ok) {
    const delegatedFeatureKey = String(delegatedPricing?.featureKey || "").trim();
    const reportType = resolvePremiumAccessReportType(delegatedFeatureKey, delegatedPricing?.reason);
    if (reportType || isUnlockPaidFeatureKey(delegatedFeatureKey)) {
      premiumAccessOptions = {
        premiumAccess: true,
        authUserId: confirmAuthCheck.auth.userId,
        pricing: delegatedPricing,
      };
    }
  }
  const targetPath = isSubscription ? "/api/payments/subscription/confirm" : "/api/payments/confirm";
  const response = await delegateToPayments(request, env, targetPath, body, {
    ...(premiumAccessOptions || {}),
    preverifiedAuth: confirmAuthCheck.auth,
  });
  if (!isSubscription && hasPaymentVerificationPayload && Number(response?.status || 0) >= 500) {
    logPaidAccessStage("CARD_CONFIRM_PENDING", {
      requestId: String(body?.requestId || ""),
      featureKey: String(pricingResult?.pricing?.featureKey || body?.featureKey || ""),
      profileId: String(body?.profileId || body?.selectedProfileId || ""),
      accessMethod: "card",
      paymentMethod: "DIRECT_KRW",
      httpStatus: Number(response?.status || 0),
      idempotencyKey: String(body?.idempotencyKey || body?.orderId || body?.merchantUid || ""),
      recovery: true,
    });
    return json({
      ok: false,
      status: "pending_confirmation",
      code: "PENDING_CONFIRMATION",
      message: "카드 승인은 접수되었지만 권한 확인이 지연되고 있습니다. 다시 결제하지 말고 결제 내역에서 복구해 주세요.",
      requestId: String(body?.requestId || ""),
      orderId: String(body?.orderId || body?.merchantUid || body?.merchant_uid || ""),
      recoveryRequired: true,
      retryable: false,
    }, { status: 503 });
  }
  return response;
}

async function runServiceExecutionAction(request, env, action) {
  const authCheck = await requireBillingAuth(request, env, { cost: 1 });
  if (!authCheck.ok) return authCheck.response;

  const body = await readJson(request);
  let result;
  if (action === "start") {
    result = await startServiceExecution(env, authCheck.auth.userId, body);
  } else if (action === "heartbeat") {
    result = await heartbeatServiceExecution(env, authCheck.auth.userId, body);
  } else if (action === "complete") {
    result = await completeServiceExecution(env, authCheck.auth.userId, body);
  } else if (action === "fail") {
    result = await failServiceExecution(env, authCheck.auth.userId, body);
  } else {
    return failure(400, "INVALID_EXECUTION_ACTION", "지원하지 않는 실행 액션입니다.");
  }

  if (!result?.ok) {
    return failure(
      Number(result?.status || 400),
      "SERVICE_EXECUTION_ERROR",
      String(result?.message || "서비스 실행 상태를 처리하지 못했습니다."),
    );
  }

  return success({
    idempotent: Boolean(result.idempotent),
    execution: result.execution || null,
    settlement: result.settlement || null,
  }, "서비스 실행 상태가 반영되었습니다.", { status: Number(result.status || 200) });
}

async function getServiceExecutionStatus(request, env) {
  const authCheck = await requireBillingAuth(request, env, { cost: 1 });
  if (!authCheck.ok) return authCheck.response;

  const url = new URL(request.url);
  const result = await getServiceExecution(env, authCheck.auth.userId, {
    executionKey: String(url.searchParams.get("executionKey") || "").trim(),
    requestId: String(url.searchParams.get("requestId") || "").trim(),
    sessionId: String(url.searchParams.get("sessionId") || "").trim(),
    reportId: String(url.searchParams.get("reportId") || "").trim(),
  });

  if (!result?.ok) {
    return failure(
      Number(result?.status || 400),
      "SERVICE_EXECUTION_NOT_FOUND",
      String(result?.message || "서비스 실행 상태를 찾을 수 없습니다."),
    );
  }

  return success({ execution: result.execution || null }, "서비스 실행 상태를 조회했습니다.");
}

export async function handleBillingRoutes(request, env, ctx) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/billing");
  const trace = {
    route: "billing",
    requestPath: new URL(request.url).pathname,
    method,
    stage: "security",
  };

  // 내부 위임(예: /api/ziwei/daehan/unlock, *-ai.js 의 deferred usage 호출)이 만드는 합성 Request는
  // BILLING_REQUEST_AUTH_MEMO(WeakMap, request 객체 identity 기준)를 못 타 매번 users 를 다시 읽었다.
  // 호출부가 이미 BILLING_SNAPSHOT_USER_PROJECTION 으로 인증을 마쳤다면 여기서 그 결과를 이 합성
  // request 의 메모에 미리 채워, 아래 enforceBillingRouteSecurity 를 포함한 이번 호출 전체가
  // resolveBillingRequestAuth 를 호출할 때마다 재조회 없이 이 값을 재사용하게 한다.
  const preverifiedAuth = ctx && typeof ctx === "object" && ctx.preverifiedAuth && typeof ctx.preverifiedAuth === "object"
    ? ctx.preverifiedAuth
    : null;
  if (preverifiedAuth?.userId) {
    const seeded = Promise.resolve(preverifiedAuth);
    seeded.catch(() => {});
    BILLING_REQUEST_AUTH_MEMO.set(request, seeded);
  }

  try {
    const security = await enforceBillingRouteSecurity(request, env, path, method);
    if (!security.ok) return security.response;

    trace.stage = "dispatch";

    if (method === "GET" && path === "/features") return await handleFeatures(request);
    if (method === "GET" && path === "/balance") return await handleBillingSnapshotBalance(request, env);
    if (method === "GET" && path === "/saju-analysis/entitlements") return await handleSajuAnalysisEntitlements(request, env);
    if ((method === "GET" || method === "POST") && path === "/access") return await handlePaidAccessCheck(request, env);
    if ((method === "GET" || method === "POST") && path === "/dev-payment-tester") return await handleDevPaymentTester(request, env);
    if (method === "GET" && path === "/unlock-status") return await handleUnlockStatus(request, env);
    if (method === "POST" && path === "/funnel-event") return await handleCheckoutFunnelEvent(request, env, ctx);

    if (method === "POST" && path === "/coin-gate") {
      trace.stage = "coin_gate";
      return await handleCoinGate(request, env);
    }
    if (method === "POST" && path === "/coin-gate/deferred/register") return await handleDeferredUsageRegister(request, env);
    if (method === "POST" && path === "/coin-gate/deferred/apply") return await handleDeferredUsageApply(request, env);
    if (method === "POST" && path === "/coin-gate/deferred/cancel") return await handleDeferredUsageCancel(request, env);
    if (method === "POST" && (path === "/purchase" || path === "/charge")) return await handleLegacyPurchaseOrCharge(request, env);
    if (method === "POST" && path === "/refund") return await handleLegacyRefund(request, env);
    if (method === "POST" && path === "/checkout") return await handleCheckout(request, env);
    if (method === "POST" && path === "/confirm") return await handleConfirm(request, env);
    if (method === "POST" && path === "/executions/start") return await runServiceExecutionAction(request, env, "start");
    if (method === "POST" && path === "/executions/heartbeat") return await runServiceExecutionAction(request, env, "heartbeat");
    if (method === "POST" && path === "/executions/complete") return await runServiceExecutionAction(request, env, "complete");
    if (method === "POST" && path === "/executions/fail") return await runServiceExecutionAction(request, env, "fail");
    if (method === "GET" && path === "/executions/status") return await getServiceExecutionStatus(request, env);

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    logBillingRouteError("handle-billing-routes", error, request);
    return handleRouteError(error, { request, env, trace });
  }
}

// 결제창 퍼널 계측 수집구. 이 프로젝트에는 GA/GTM 이 없어 "결제창까지 왔는데 왜 안 사는가"를
// 볼 수단이 없었다 — 그 공백을 메우는 최소 채널이다.
//
// 계약(전부 의도적):
//   · 인증 불필요. 비로그인 이탈도 퍼널의 일부이고, 어차피 개인식별자를 받지 않는다.
//   · 항상 204. 클라는 sendBeacon 으로 fire-and-forget 하며 응답을 읽지 않는다.
//   · 어떤 실패도 밖으로 내보내지 않는다 — 계측이 결제 경로에 영향을 주면 안 된다.
//   · 이벤트명 화이트리스트 + 본문 1KB 상한. 재시도 없음(중첩 재시도 금지 원칙).
const CHECKOUT_FUNNEL_EVENT_NAMES = new Set([
  "checkout_opened",
  "checkout_option_click",
  "pass_verified_free",
  "pass_store_entered",
  "checkout_dismissed",
]);
const CHECKOUT_FUNNEL_MAX_BODY_BYTES = 1024;

// 🔴 이 쓰기는 auth·결제 인증 조회와 같은 5-커넥션 풀을 두고 경쟁하면 안 된다.
// worker/lib/security/index.js의 SECURITY_DB_* 우선순위 레인과 동일한 값을 그대로 재사용한다 —
// 풀이 조금이라도 바쁘면(active>=2) 250ms만 기다리고 곧바로 포기한다(이 라우트는 원래
// 실패를 밖으로 내보내지 않으므로 포기해도 안전하다). resetOnOperationTimeout:false는 필수 —
// 이 저우선순위 쓰기의 타임아웃이 전역 풀 리셋을 걸어 동시 결제 요청의 소켓까지 끊으면 안 된다.
const FUNNEL_EVENT_DB_OPERATION_OPTIONS = Object.freeze({
  retries: 0,
  attemptTimeoutMS: 1000,
  minAttemptTimeoutMS: 1000,
  respectServerSelectionFloor: false,
  resetOnOperationTimeout: false,
  maxConcurrent: 2,
  admissionTimeoutMS: 250,
});

function clampFunnelText(value, maxLength) {
  return String(value === null || value === undefined ? "" : value).trim().slice(0, maxLength);
}

function clampFunnelNumber(value, max) {
  const parsed = Math.floor(Number(value || 0));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, max);
}

async function handleCheckoutFunnelEvent(request, env, ctx = null) {
  const noContent = () => new Response(null, { status: 204 });
  try {
    const raw = await request.text();
    if (!raw || raw.length > CHECKOUT_FUNNEL_MAX_BODY_BYTES) return noContent();
    const body = JSON.parse(raw);
    const name = clampFunnelText(body?.name, 60);
    if (!CHECKOUT_FUNNEL_EVENT_NAMES.has(name)) return noContent();
    const write = withMongoRetry(env, async () => {
      await connectDb(env);
      await CheckoutFunnelEvent.create({
        name,
        featureKey: clampFunnelText(body?.featureKey, 120),
        option: clampFunnelText(body?.option, 40),
        renderer: clampFunnelText(body?.renderer, 40),
        runtime: clampFunnelText(body?.runtime, 20),
        coinPrice: clampFunnelNumber(body?.coinPrice, 1000000),
        hasPassHint: clampFunnelText(body?.hasPassHint, 20),
        dwellMs: clampFunnelNumber(body?.dwellMs, 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });
    }, FUNNEL_EVENT_DB_OPERATION_OPTIONS).catch(() => {});
    if (typeof ctx?.waitUntil === "function") {
      try { ctx.waitUntil(write); } catch { /* 컨텍스트가 이미 닫혔으면 유실을 허용한다 */ }
    } else {
      await write;
    }
  } catch (_funnelEventError) {
    // 계측 유실은 허용한다. 로그도 남기지 않는다 — 비정상 트래픽이 로그를 밀어내면 그게 더 나쁘다.
  }
  return noContent();
}

export const __billingTestUtils = {
  ACCESS_DECISION_REASONS,
  buildAccessDecision,
  buildPaidContentAccessDecision,
  buildPassPaymentDecision,
  buildMembershipPassFromStatusSnapshot,
  buildRefundedSpendSourceId,
  isPassExcludedPricing,
  isExplicitLegacyCoinPaymentMode,
  // 503 분류 3종. 정적 문자열 매칭으로는 "무엇을 DB 장애로 볼 것인가"를 검증할 수 없어 실제로 호출한다.
  isDatabaseUnavailableError,
  paidAccessErrorStage,
  hasResolvableSubscriptionSignal,
  buildPassStatusTemporarilyUnavailableFailure,
  shouldCreateDirectPortOneOrder,
  shouldApplyMembershipPassBeforeCard,
  requiresMeteredPassWrite,
  requireBillingAuth,
  resolvePaidContentAccess,
};

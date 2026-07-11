import { getEnv } from "./env.js";
import { cookieValue, createHttpError, getRequestMeta } from "./http.js";
import { signJwt, verifyJwt } from "./jwt.js";
import { createHash } from "node:crypto";
import { connectDb, mongoose, withMongoRetry } from "./db.js";
import { RefreshTokenSession, User } from "./models.js";
import { normalizeHoneyPassEntitlement, PASS_LIMITS } from "./profile-limits.js";
import { ensureLotsForBalance, resolveNextExpiry } from "./monthly-credit-lots.js";

export const JWT_ISSUER = "code-destiny-api";
export const ACCESS_COOKIE_NAME = "fortune_auth_token";
export const REFRESH_COOKIE_NAME = "fortune_auth_refresh";
const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;
const FLOWER_ADMIN_USER_ID = "flower-admin";
const PAID_SERVICE_ADMIN_AUTH_PATHS = Object.freeze([
  "/api/premium/saju-lifebook",
  "/api/premium/saju/life-book",
  "/api/lifebook",
  "/api/life-book-ai",
  "/api/love-secret-ai",
  "/api/saju-new-year",
  "/api/new-year-ai",
  "/api/ziwei-ai",
  "/api/astrology-ai",
  "/api/neo-operation-room",
  "/api/sukuyo",
  "/api/sukuyo-compatibility-ai",
  "/api/astro",
  "/api/vedic",
  "/api/karma-destiny-ai",
  "/api/soul-origin",
  "/api/sibyl",
  "/api/fpti",
  "/api/celestial-harmony",
  "/api/tarot",
  "/api/fortune/ziwei/ai-prompt",
  "/api/fortune/sukuyo/ai-prompt",
  "/api/fortune/saju/ai-prompt",
  "/api/fortune/saju/question-prompt",
  "/api/fortune/astrology/ai-prompt",
  "/api/fortune/vedic/ai-prompt",
]);

export function getJwtIssuer(env) {
  return getEnv(env, "JWT_ISSUER") || JWT_ISSUER;
}

export function getJwtAudience(env) {
  return getEnv(env, "JWT_AUDIENCE") || getEnv(env, "AUTH_AUDIENCE") || "code-destiny-web";
}

function isProductionAuthEnv(env) {
  const value = String(
    getEnv(env, "NODE_ENV")
    || getEnv(env, "ENVIRONMENT")
    || getEnv(env, "CF_PAGES_BRANCH")
    || "",
  ).trim().toLowerCase();
  return value === "production" || value === "main";
}

// The dev secret fallback must be OPT-IN: only an explicit local-dev signal enables it.
// An unknown/unset environment (e.g. a Cloudflare deploy with empty NODE_ENV and a non-main
// CF_PAGES_BRANCH) is NOT treated as dev, so it can never silently sign tokens with "dev-secret".
function isExplicitLocalDevEnv(env) {
  const nodeEnv = String(getEnv(env, "NODE_ENV") || "").trim().toLowerCase();
  const environment = String(getEnv(env, "ENVIRONMENT") || "").trim().toLowerCase();
  return nodeEnv === "development"
    || nodeEnv === "test"
    || environment === "development"
    || environment === "local";
}

function isPlaceholderSecret(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return !normalized
    || normalized === "dev-secret"
    || normalized.includes("placeholder")
    || normalized.includes("change_me")
    || normalized.includes("your_")
    || normalized.includes("example");
}

function resolveFlowerAdminSecret(env) {
  const secret = String(getEnv(env, "FLOWER_ADMIN_SECRET") || "").trim();
  if (isProductionAuthEnv(env) && isPlaceholderSecret(secret)) {
    throw new Error("FLOWER_ADMIN_SECRET is required in production.");
  }
  return secret || (isProductionAuthEnv(env) ? "" : "flower-admin-dev-secret-placeholder-000000");
}

function resolveRequiredAuthSecret(env, keys, fallbackErrorMessage) {
  for (const key of keys) {
    const value = getEnv(env, key);
    // Ignore placeholder/dev values so a leftover "dev-secret"/"change_me" can't be trusted.
    if (value && !isPlaceholderSecret(value)) return value;
  }
  // Fail closed everywhere except an explicit local-dev context. This is stricter than the
  // previous "any non-production env → dev-secret", which let a mis-detected production sign
  // forgeable tokens.
  if (!isExplicitLocalDevEnv(env)) {
    throw new Error(fallbackErrorMessage);
  }
  return "dev-secret";
}

export function getAccessTokenSecret(env) {
  return resolveRequiredAuthSecret(
    env,
    ["JWT_ACCESS_SECRET", "JWT_SECRET", "AUTH_SECRET"],
    "JWT access token secret is required in production.",
  );
}

export function getRefreshTokenSecret(env) {
  return resolveRequiredAuthSecret(
    env,
    ["JWT_REFRESH_SECRET", "JWT_SECRET", "AUTH_SECRET"],
    "JWT refresh token secret is required in production.",
  );
}

export function getAccessTokenExpiresIn(env) {
  return getEnv(env, "ACCESS_TOKEN_EXPIRES_IN") || getEnv(env, "JWT_EXPIRES_IN", "30m");
}

export function getRefreshTokenExpiresIn(env) {
  return getEnv(env, "REFRESH_TOKEN_EXPIRES_IN", "14d");
}

export function getBearerToken(request) {
  const authorization = request.headers.get("Authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  return bearer || cookieValue(request, ACCESS_COOKIE_NAME);
}

function getHeaderBearerToken(request) {
  const authorization = request.headers.get("Authorization") || "";
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
}

function hashRefreshToken(rawToken, env) {
  const pepper = getEnv(env, "AUTH_SECRET") || getAccessTokenSecret(env);
  return createHash("sha256").update(`${String(rawToken || "")}|${pepper}`).digest("hex");
}

function extractRefreshUserId(payload) {
  const userId = String(payload?.userId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(userId)) return "";
  if (String(payload?.typ || "") !== "refresh") return "";
  return userId;
}

function normalizeAuthResultFromPayload(payload, userId) {
  return {
    userId,
    email: payload.email ? String(payload.email) : "",
    role: payload.role ? String(payload.role) : "user",
    name: payload.name ? String(payload.name) : "",
    image: payload.image ? String(payload.image) : "",
    birthDate: payload.birthDate ? String(payload.birthDate) : "",
    birthTime: payload.birthTime ? String(payload.birthTime) : "",
    gender: payload.gender ? String(payload.gender) : "OTHER",
    points: Number.isFinite(Number(payload.points)) ? Number(payload.points) : 0,
    joinedAt: payload.joinedAt || null,
  };
}

function normalizeAuthResultFromUser(user) {
  return {
    userId: String(user?._id || ""),
    email: user?.email ? String(user.email) : "",
    role: user?.role ? String(user.role) : "user",
    name: user?.name ? String(user.name) : "",
    image: user?.profileImage ? String(user.profileImage) : (user?.image ? String(user.image) : ""),
    birthDate: user?.birthDate ? String(user.birthDate) : "",
    birthTime: user?.birthTime ? String(user.birthTime) : "",
    gender: user?.gender ? String(user.gender) : "OTHER",
    points: Number.isFinite(Number(user?.points)) ? Number(user.points) : 0,
    joinedAt: user?.joinedAt || null,
  };
}

function isWithdrawnUser(user) {
  return String(user?.status || "").trim().toLowerCase() === "withdrawn";
}

function isAuthMeRequest(request) {
  try {
    const pathname = new URL(request.url).pathname;
    return pathname === "/api/auth/me" || pathname === "/auth/me";
  } catch (e) {
    return false;
  }
}

export function isAuthDbInfraError(error) {
  const text = String(error?.message || "").toLowerCase();
  if (!text) return false;
  return (
    text.includes("auth_me_connect_db")
    || text.includes("auth_me_find_user")
    || text.includes("timeout")
    || text.includes("timed out")
    || text.includes("mongo")
    || text.includes("mongoose")
    || text.includes("econn")
    || text.includes("network")
    || text.includes("server selection")
  );
}

function isPaidServiceAdminAuthPath(request) {
  try {
    const pathname = new URL(request.url).pathname;
    return PAID_SERVICE_ADMIN_AUTH_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  } catch (e) {
    return false;
  }
}

function extractFlowerAdminToken(request) {
  const headerToken = String(request.headers.get("x-admin-token") || "").trim();
  if (FLOWER_ADMIN_TOKEN_RE.test(headerToken)) return headerToken;

  const auth = String(request.headers.get("authorization") || "").trim();
  if (auth.toLowerCase().startsWith("bearer ")) {
    const bearer = auth.slice(7).trim();
    if (FLOWER_ADMIN_TOKEN_RE.test(bearer)) return bearer;
  }

  const cookieToken = cookieValue(request, "flower_admin_token");
  return FLOWER_ADMIN_TOKEN_RE.test(cookieToken) ? cookieToken : "";
}

function timingSafeEqualText(a, b) {
  const lhs = String(a || "");
  const rhs = String(b || "");
  if (lhs.length !== rhs.length) return false;
  let diff = 0;
  for (let i = 0; i < lhs.length; i += 1) diff |= lhs.charCodeAt(i) ^ rhs.charCodeAt(i);
  return diff === 0;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map((value) => value.toString(16).padStart(2, "0")).join("");
}

function base64urlDecode(value) {
  const base64 = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (base64.length % 4)) % 4;
  return atob(base64 + "=".repeat(pad));
}

async function hmacSha256Hex(text, secret) {
  const subtle = globalThis?.crypto?.subtle;
  if (!subtle) return "";
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return bytesToHex(new Uint8Array(signature));
}

async function verifyFlowerAdminTokenForPaidService(request, env) {
  if (!isPaidServiceAdminAuthPath(request)) return null;
  const token = extractFlowerAdminToken(request);
  if (!token) return null;

  const dotIdx = token.lastIndexOf(".");
  if (dotIdx < 1) return null;

  const payloadB64 = token.slice(0, dotIdx);
  const signatureHex = token.slice(dotIdx + 1).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(signatureHex)) return null;

  let expectedHex = "";
  try {
    expectedHex = await hmacSha256Hex(payloadB64, resolveFlowerAdminSecret(env));
  } catch (error) {
    logAuthError("flower-admin-secret", error);
    return null;
  }
  if (!timingSafeEqualText(expectedHex, signatureHex)) return null;

  let payload = null;
  try {
    payload = JSON.parse(base64urlDecode(payloadB64));
  } catch (e) {
    return null;
  }

  const exp = Number(payload?.exp || 0);
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload?.v !== 1 || !Number.isFinite(exp) || nowSec > exp) return null;

  return {
    userId: FLOWER_ADMIN_USER_ID,
    email: "",
    role: "admin",
    name: "ADMIN",
    image: "",
    birthDate: "",
    birthTime: "",
    gender: "OTHER",
    points: 0,
    joinedAt: null,
  };
}

function logAuthError(stage, error, extras = {}) {
  const payload = {
    stage: String(stage || "auth"),
    name: error?.name || "Error",
    code: error?.code || "AUTH_ERROR",
    message: String(error?.message || "Unknown auth error"),
    ...(extras && typeof extras === "object" ? extras : {}),
  };

  try {
    console.error("[worker-auth-error]", JSON.stringify(payload));
  } catch (e) {
    console.error("[worker-auth-error]", payload);
  }
}

async function resolveActiveUserAuth(userId, env) {
  // stateless Worker 풀 초기화 시 무방비 connectDb/findOne이 정착하지 않아 요청이 hang되는 것을
  // 막는다. withMongoRetry가 각 시도를 per-attempt 타임아웃으로 감싸고 일시적 오류를 재연결·재시도한다.
  const user = await withMongoRetry(env, () => User.collection.findOne(
    { _id: new mongoose.Types.ObjectId(userId) },
    {
      projection: {
        _id: 1,
        name: 1,
        email: 1,
        birthDate: 1,
        birthTime: 1,
        gender: 1,
        role: 1,
        points: 1,
        joinedAt: 1,
        image: 1,
        profileImage: 1,
        status: 1,
      },
    },
  ));
  if (!user || isWithdrawnUser(user)) return null;
  return normalizeAuthResultFromUser(user);
}

async function verifyAccessTokenToAuth(token, env, options = {}) {
  if (!token) return null;
  try {
    const payload = await verifyJwt(token, getAccessTokenSecret(env), {
      issuer: getJwtIssuer(env),
      audience: getJwtAudience(env),
    });
    const userId = extractTokenUserId(payload);
    if (!userId) return null;
    const tokenAuth = normalizeAuthResultFromPayload(payload, userId);
    try {
      return await resolveActiveUserAuth(userId, env);
    } catch (dbError) {
      logAuthError("verify-access-token-user", dbError, { userId });
      if (options.allowDbFallback === true) {
        return { ...tokenAuth, authDbFallback: true };
      }
      // Mongo URI가 없는 환경(테스트 등)에서는 JWT 검증만으로 인증 허용
      const isNoUriError = String(dbError?.message || "").includes("Mongo URI is required");
      if (isNoUriError) {
        return { ...tokenAuth, authDbFallback: true };
      }
      return null;
    }
  } catch (error) {
    logAuthError("verify-access-token", error, { hasToken: true });
    return null;
  }
}

async function verifyRefreshSessionToAuth(request, env, options = {}) {
  const refreshToken = cookieValue(request, REFRESH_COOKIE_NAME);
  if (!refreshToken) return null;

  let userId;
  try {
    const payload = await verifyJwt(refreshToken, getRefreshTokenSecret(env), {
      issuer: getJwtIssuer(env),
      audience: getJwtAudience(env),
    });
    userId = extractRefreshUserId(payload);
    if (!userId) return null;
  } catch (error) {
    logAuthError("verify-refresh-session-jwt", error, { hasRefreshToken: true });
    return null;
  }

  try {
    // 각 read를 withMongoRetry로 감싸 풀 초기화 순간의 hang을 per-attempt 타임아웃으로 끊고
    // 일시적 오류를 재연결·재시도한다(withMongoRetry가 내부에서 connectDb 호출).
    const tokenHash = hashRefreshToken(refreshToken, env);
    const session = await withMongoRetry(env, () => RefreshTokenSession.findOne({ tokenHash }).lean());
    if (!session || session.revokedAt) return null;
    if (!refreshSessionMatchesRequest(session, request)) return null;

    const expiresAt = new Date(session.expiresAt || 0).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;

    const user = await withMongoRetry(env, () => User.collection.findOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      {
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          birthDate: 1,
          birthTime: 1,
          gender: 1,
          role: 1,
          points: 1,
          joinedAt: 1,
          image: 1,
          profileImage: 1,
          status: 1,
        },
      },
    ));
    if (!user || isWithdrawnUser(user)) return null;

    return normalizeAuthResultFromUser(user);
  } catch (error) {
    logAuthError("verify-refresh-session-db", error, { hasRefreshToken: true, userId });
    // Only a request that already tolerates DB blips (e.g. /api/auth/me) gets the raw
    // infra error rethrown, so the caller can report "degraded" instead of a hard sign-out.
    // Every other route keeps failing closed to null, unchanged from prior behavior.
    if (options.allowDbFallback === true && isAuthDbInfraError(error)) {
      throw error;
    }
    return null;
  }
}

function refreshSessionMatchesRequest(session, request) {
  const storedUserAgent = String(session?.userAgent || "").trim();
  if (!storedUserAgent) return true;
  const currentUserAgent = String(getRequestMeta(request).userAgent || "").trim();
  if (!currentUserAgent) return true;
  return storedUserAgent === currentUserAgent;
}

function extractTokenUserId(payload) {
  const userId = String(payload?.userId || payload?.id || "").trim();
  if (!/^[a-f0-9]{24}$/i.test(userId)) return "";
  return userId;
}

function isProductionRuntime(env) {
  return String(getEnv(env, "NODE_ENV") || "").trim().toLowerCase() === "production";
}

async function getDevAuthUserFromEnv(env) {
  const userId = String(getEnv(env, "DEV_AUTH_USER_ID") || "").trim();
  if (isProductionRuntime(env)) {
    // dev-auth는 프로덕션에서 무시(throw 금지 — 게스트 트래픽 붕괴 방지)
    return null;
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;

  await connectDb(env);
  const user = await User.findById(userId).lean();
  return user?._id && !isWithdrawnUser(user) ? normalizeAuthResultFromUser(user) : null;
}

export async function requireAuth(request, env) {
  return getServerUser(request, env);
}

export async function getOptionalUserFromRequest(request, env, options = {}) {
  try {
    const bearerToken = getHeaderBearerToken(request);
    const accessCookieToken = cookieValue(request, ACCESS_COOKIE_NAME);
    const refreshCookieToken = cookieValue(request, REFRESH_COOKIE_NAME);
    const allowTokenDbFallback = options?.allowDbFallback === true || isAuthMeRequest(request);

    const flowerAdminAuth = await verifyFlowerAdminTokenForPaidService(request, env);
    if (flowerAdminAuth) return flowerAdminAuth;

    const bearerAuth = await verifyAccessTokenToAuth(bearerToken, env, { allowDbFallback: allowTokenDbFallback });
    if (bearerAuth) return bearerAuth;

    if (accessCookieToken && accessCookieToken !== bearerToken) {
      const cookieAuth = await verifyAccessTokenToAuth(accessCookieToken, env, { allowDbFallback: allowTokenDbFallback });
      if (cookieAuth) return cookieAuth;
    }

    if (refreshCookieToken) {
      const refreshAuth = await verifyRefreshSessionToAuth(request, env, { allowDbFallback: allowTokenDbFallback });
      if (refreshAuth) return refreshAuth;
    }

    const devAuth = await getDevAuthUserFromEnv(env);
    if (devAuth) return devAuth;

    return null;
  } catch (error) {
    if (error?.message === "DEV_AUTH_USER_ID must not be used in production") throw error;
    // Let callers that already tolerate DB blips (e.g. /api/auth/me, /api/subscription/status)
    // see a raw DB-infra error so they can report "degraded" instead of getting collapsed
    // into a generic 401 that looks like a real sign-out.
    if ((options?.allowDbFallback === true || isAuthMeRequest(request)) && isAuthDbInfraError(error)) throw error;
    logAuthError("get-optional-user", error, {
      hasAuthorizationHeader: Boolean(request?.headers?.get("Authorization")),
      hasCookieHeader: Boolean(request?.headers?.get("Cookie")),
    });
    return null;
  }
}

export async function requireUserFromRequest(request, env) {
  const auth = await getOptionalUserFromRequest(request, env);
  if (auth) return auth;
  throw createHttpError(401, "Authentication is required.", { code: "UNAUTHORIZED" });
}

export async function getServerUser(request, env) {
  return requireUserFromRequest(request, env);
}

export async function getCurrentUser(request, env) {
  return getOptionalUserFromRequest(request, env);
}

export async function signAuthToken(user, env) {
  return signJwt(
    {
      userId: String(user._id),
      email: user.email,
      role: user.role,
      name: user.name,
      image: user.profileImage || user.image || "",
      birthDate: user.birthDate,
      birthTime: user.birthTime,
      gender: user.gender,
      points: user.points,
      joinedAt: user.joinedAt,
    },
    getAccessTokenSecret(env),
    {
      expiresIn: getAccessTokenExpiresIn(env),
      issuer: getJwtIssuer(env),
      audience: getJwtAudience(env),
    },
  );
}

function toAuthIsoOrNull(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function readNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.floor(number);
}

function normalizeAuthProfileSubscription(user = {}) {
  const rawSub = user?.profileSubscription && typeof user.profileSubscription === "object"
    ? user.profileSubscription
    : {};
  const entitlement = normalizeHoneyPassEntitlement(user || {});
  const activeTier = entitlement?.isActive && entitlement?.tier && entitlement.tier !== "none"
    ? String(entitlement.tier || "free").toLowerCase()
    : "free";
  const isActive = activeTier !== "free";
  const passLimit = isActive
    ? readNonNegativeInteger(entitlement.maxCoveredCoin || rawSub.maxCoveredCoin || rawSub.passLimit || rawSub.freeLimit || PASS_LIMITS[activeTier] || 0)
    : 0;
  // 월정석은 지급일+30일 만료(지급분별) — 만료분을 제외한 "유효 잔액"만 노출한다(지연소멸, 읽기 전용).
  // lot이 프로젝션에 없으면 스칼라를 활성으로 간주(백필-계산). 실제 소멸·정리는 소비/크론이 영속화한다.
  const scalarForBackfill = readNonNegativeInteger(rawSub.membershipCreditBalance ?? rawSub.monthlyStoneBalance, 0);
  const lotState = ensureLotsForBalance(
    { membershipCreditLots: rawSub.membershipCreditLots, membershipCreditBalance: scalarForBackfill },
    Date.now(),
  );
  const membershipCreditBalance = readNonNegativeInteger(lotState.balance, 0);
  const monthlyStoneExpiresAt = resolveNextExpiry(lotState.lots, Date.now());
  const membershipCreditGranted = readNonNegativeInteger(rawSub.membershipCreditGranted, 0);
  const membershipCreditUsed = readNonNegativeInteger(rawSub.membershipCreditUsed, 0);

  return {
    tier: activeTier,
    passTier: isActive ? String(entitlement.passTier || rawSub.passTier || activeTier) : "free",
    plan: isActive ? String(rawSub.plan || activeTier) : "free",
    planId: isActive ? String(rawSub.planId || rawSub.plan || activeTier) : "free",
    isActive,
    isSubscribed: isActive,
    status: isActive
      ? String(rawSub.status || rawSub.subscriptionStatus || rawSub.membershipStatus || rawSub.lastBillingStatus || "active")
      : "free",
    subscriptionStatus: isActive
      ? String(rawSub.subscriptionStatus || rawSub.status || rawSub.lastBillingStatus || "active")
      : "free",
    membershipStatus: isActive ? String(rawSub.membershipStatus || rawSub.status || "active") : "free",
    source: isActive ? String(entitlement.source || rawSub.source || "auth_me") : "auth_me",
    expiresAt: isActive ? (entitlement.expiresAt || toAuthIsoOrNull(rawSub.expiresAt)) : null,
    profileLimit: isActive ? readNonNegativeInteger(entitlement.maxProfiles || rawSub.profileLimit, 1) : 1,
    freeLimit: passLimit,
    passLimit,
    maxCoveredCoin: passLimit,
    membershipCreditBalance,
    monthlyStoneBalance: membershipCreditBalance,
    monthlyStoneExpiresAt,
    membershipCreditGranted,
    membershipCreditUsed,
    snapshotSource: "auth_me",
  };
}

export function normalizeUserResponse(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    image: user.profileImage || user.image || "",
    birthDate: user.birthDate,
    birthTime: user.birthTime,
    gender: user.gender,
    role: user.role,
    points: user.points,
    joinedAt: user.joinedAt,
    profileSubscription: normalizeAuthProfileSubscription(user),
  };
}

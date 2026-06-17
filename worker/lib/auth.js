import { getEnv } from "./env.js";
import { cookieValue, createHttpError } from "./http.js";
import { signJwt, verifyJwt } from "./jwt.js";
import { createHash } from "node:crypto";
import { connectDb, mongoose } from "./db.js";
import { RefreshTokenSession, User } from "./models.js";

export const JWT_ISSUER = "code-destiny-api";
export const ACCESS_COOKIE_NAME = "fortune_auth_token";
export const REFRESH_COOKIE_NAME = "fortune_auth_refresh";
const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;
const FLOWER_ADMIN_USER_ID = "flower-admin";
const PAID_SERVICE_ADMIN_AUTH_PATHS = Object.freeze([
  "/api/premium/saju-lifebook",
  "/api/premium/saju/life-book",
  "/api/lifebook",
  "/api/love-secret",
  "/api/saju-new-year",
  "/api/ziwei-book",
  "/api/sukuyo",
  "/api/astro",
  "/api/vedic",
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

export function getAccessTokenSecret(env) {
  return (
    getEnv(env, "JWT_ACCESS_SECRET")
    || getEnv(env, "JWT_SECRET")
    || getEnv(env, "AUTH_SECRET")
    || "dev-secret"
  );
}

export function getRefreshTokenSecret(env) {
  return (
    getEnv(env, "JWT_REFRESH_SECRET")
    || getEnv(env, "JWT_SECRET")
    || getEnv(env, "AUTH_SECRET")
    || "dev-secret"
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

  const expectedHex = await hmacSha256Hex(
    payloadB64,
    String(env?.FLOWER_ADMIN_SECRET || "flower-admin-dev-secret-placeholder-000000"),
  );
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

async function verifyAccessTokenToAuth(token, env) {
  if (!token) return null;
  try {
    const payload = await verifyJwt(token, getAccessTokenSecret(env), {
      issuer: getJwtIssuer(env),
      audience: getJwtAudience(env),
    });
    const userId = extractTokenUserId(payload);
    if (!userId) return null;
    return normalizeAuthResultFromPayload(payload, userId);
  } catch (error) {
    logAuthError("verify-access-token", error, { hasToken: true });
    return null;
  }
}

async function verifyRefreshSessionToAuth(request, env) {
  const refreshToken = cookieValue(request, REFRESH_COOKIE_NAME);
  if (!refreshToken) return null;

  try {
    const payload = await verifyJwt(refreshToken, getRefreshTokenSecret(env), {
      issuer: getJwtIssuer(env),
      audience: getJwtAudience(env),
    });
    const userId = extractRefreshUserId(payload);
    if (!userId) return null;

    await connectDb(env);

    const tokenHash = hashRefreshToken(refreshToken, env);
    const session = await RefreshTokenSession.findOne({ tokenHash }).lean();
    if (!session || session.revokedAt) return null;

    const expiresAt = new Date(session.expiresAt || 0).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;

    const user = await User.collection.findOne(
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
        },
      },
    );
    if (!user) return null;

    return normalizeAuthResultFromUser(user);
  } catch (error) {
    logAuthError("verify-refresh-session", error, { hasRefreshToken: true });
    return null;
  }
}

function extractTokenUserId(payload) {
  const userId = String(payload?.userId || payload?.id || "").trim();
  if (!/^[a-f0-9]{24}$/i.test(userId)) return "";
  return userId;
}

export async function requireAuth(request, env) {
  return requireUserFromRequest(request, env);
}

export async function getOptionalUserFromRequest(request, env) {
  try {
    const bearerToken = getHeaderBearerToken(request);
    const accessCookieToken = cookieValue(request, ACCESS_COOKIE_NAME);
    const refreshCookieToken = cookieValue(request, REFRESH_COOKIE_NAME);

    const flowerAdminAuth = await verifyFlowerAdminTokenForPaidService(request, env);
    if (flowerAdminAuth) return flowerAdminAuth;

    const bearerAuth = await verifyAccessTokenToAuth(bearerToken, env);
    if (bearerAuth) return bearerAuth;

    if (accessCookieToken && accessCookieToken !== bearerToken) {
      const cookieAuth = await verifyAccessTokenToAuth(accessCookieToken, env);
      if (cookieAuth) return cookieAuth;
    }

    if (refreshCookieToken) {
      const refreshAuth = await verifyRefreshSessionToAuth(request, env);
      if (refreshAuth) return refreshAuth;
    }

    return null;
  } catch (error) {
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
  };
}

import { connectDb, mongoose, resetMongooseConnection, resolveMongoDbName } from "../lib/db.js";
import { RefreshTokenSession, User } from "../lib/models.js";
import { getEnv } from "../lib/env.js";
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  getAccessTokenExpiresIn,
  getAccessTokenSecret,
  getJwtAudience,
  getJwtIssuer,
  getRefreshTokenExpiresIn,
  getRefreshTokenSecret,
  requireAuth,
  normalizeUserResponse,
  signAuthToken,
  JWT_ISSUER,
} from "../lib/auth.js";
import { getRequestMeta, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson, redirect } from "../lib/http.js";
import { buildConfigErrorBody, evaluateFeatureKeyHealth } from "../lib/key-health.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { validateLoginPayload, validateRegisterPayload } from "../lib/validation.js";
import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

const OAUTH_PROVIDERS = ["google", "naver", "kakao"];
const SOCIAL_GRANT_EXPIRES_IN_SEC = 180;
const CSRF_COOKIE_NAME = "cd_csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const REFRESH_COOKIE_PRIMARY_PATH = "/";
const REFRESH_COOKIE_LEGACY_PATH = "/api/auth/refresh";
const CSRF_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;
const WITHDRAW_RATE_LIMIT_MAX = 3;
const WITHDRAW_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const withdrawRateLimitMap = new Map();

function parseDurationToSeconds(rawValue, fallbackSeconds) {
  const raw = String(rawValue || "").trim();
  if (!raw) return fallbackSeconds;

  if (/^\d+$/.test(raw)) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallbackSeconds;
  }

  const match = raw.match(/^(\d+)\s*([smhd])$/i);
  if (!match) return fallbackSeconds;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return fallbackSeconds;
  const unit = String(match[2] || "s").toLowerCase();
  const multiplier = unit === "d" ? 86400 : unit === "h" ? 3600 : unit === "m" ? 60 : 1;
  return Math.floor(amount * multiplier);
}

function isLocalHostname(hostname) {
  const normalized = String(hostname || "").trim().toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "[::1]";
}

function resolveCookieSecure(request, env) {
  const requestUrl = new URL(request.url);
  const forwardedProto = String(request.headers.get("x-forwarded-proto") || "").trim().toLowerCase();
  const proto = forwardedProto || requestUrl.protocol.replace(":", "");
  const forwardedHost = String(request.headers.get("x-forwarded-host") || "").trim();
  const host = String(forwardedHost || requestUrl.host || "").split(":")[0];
  const localRequest = isLocalHostname(host);

  const forced = String(getEnv(env, "AUTH_COOKIE_SECURE", "")).trim().toLowerCase();
  // Keep production strict, but avoid dropping cookies on local HTTP during dev.
  if (forced === "true") return localRequest && proto !== "https" ? false : true;
  if (forced === "false") return false;

  const explicitProd = String(getEnv(env, "NODE_ENV", "")).trim().toLowerCase() === "production";
  if (explicitProd) return true;

  return proto === "https";
}

function resolveCookieSameSite(env) {
  const raw = String(getEnv(env, "AUTH_COOKIE_SAMESITE", "lax")).trim().toLowerCase();
  if (raw === "strict") return "Strict";
  if (raw === "none") return "None";
  return "Lax";
}

function buildCookieValue(name, value, options = {}) {
  const pieces = [`${name}=${encodeURIComponent(String(value || ""))}`];
  pieces.push(`Path=${options.path || "/"}`);
  if (typeof options.maxAge === "number") pieces.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  if (options.httpOnly) pieces.push("HttpOnly");
  if (options.secure) pieces.push("Secure");
  if (options.sameSite) pieces.push(`SameSite=${options.sameSite}`);
  return pieces.join("; ");
}

function buildAuthCookieOptions(request, env) {
  const secure = resolveCookieSecure(request, env);
  const sameSite = resolveCookieSameSite(env);
  const accessMaxAgeSec = parseDurationToSeconds(getAccessTokenExpiresIn(env), 30 * 60);
  const refreshMaxAgeSec = parseDurationToSeconds(getRefreshTokenExpiresIn(env), 14 * 24 * 60 * 60);

  return {
    secure,
    sameSite,
    accessMaxAgeSec,
    refreshMaxAgeSec,
  };
}

function appendAuthCookies(response, request, env, accessToken, refreshToken) {
  const cookieOptions = buildAuthCookieOptions(request, env);
  response.headers.append("Set-Cookie", buildCookieValue(ACCESS_COOKIE_NAME, accessToken, {
    path: "/",
    maxAge: cookieOptions.accessMaxAgeSec,
    httpOnly: true,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
  }));
  response.headers.append("Set-Cookie", buildCookieValue(REFRESH_COOKIE_NAME, refreshToken, {
    path: REFRESH_COOKIE_PRIMARY_PATH,
    maxAge: cookieOptions.refreshMaxAgeSec,
    httpOnly: true,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
  }));
}

function appendClearAuthCookies(response, request, env) {
  const cookieOptions = buildAuthCookieOptions(request, env);
  response.headers.append("Set-Cookie", buildCookieValue(ACCESS_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
  }));
  response.headers.append("Set-Cookie", buildCookieValue(REFRESH_COOKIE_NAME, "", {
    path: REFRESH_COOKIE_PRIMARY_PATH,
    maxAge: 0,
    httpOnly: true,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
  }));
  response.headers.append("Set-Cookie", buildCookieValue(REFRESH_COOKIE_NAME, "", {
    path: REFRESH_COOKIE_LEGACY_PATH,
    maxAge: 0,
    httpOnly: true,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
  }));
}

function hashRefreshToken(rawToken, env) {
  const pepper = getEnv(env, "AUTH_SECRET") || getAccessTokenSecret(env);
  return createHash("sha256").update(`${String(rawToken || "")}|${pepper}`).digest("hex");
}

function buildRefreshSessionFromRequest(request, env, userId) {
  const cookieOptions = buildAuthCookieOptions(request, env);
  const expiresAt = new Date(Date.now() + cookieOptions.refreshMaxAgeSec * 1000);
  const meta = getRequestMeta(request);

  return {
    userId: new mongoose.Types.ObjectId(String(userId)),
    userAgent: String(meta.userAgent || ""),
    ip: String(meta.ip || ""),
    expiresAt,
  };
}

async function issueRefreshTokenForUser(userId, env) {
  const nowSec = Math.floor(Date.now() / 1000);
  const refreshTtlSec = parseDurationToSeconds(getRefreshTokenExpiresIn(env), 14 * 24 * 60 * 60);
  const payload = {
    userId: String(userId),
    sid: randomBytes(16).toString("hex"),
    typ: "refresh",
    iat: nowSec,
    exp: nowSec + refreshTtlSec,
  };

  const refreshToken = await signJwt(payload, getRefreshTokenSecret(env), {
    expiresIn: getRefreshTokenExpiresIn(env),
    issuer: getJwtIssuer(env),
    audience: getJwtAudience(env),
  });

  return {
    refreshToken,
    tokenHash: hashRefreshToken(refreshToken, env),
    expiresAt: new Date((payload.exp || nowSec + refreshTtlSec) * 1000),
  };
}

function normalizeOriginOnly(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return "";

  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function normalizeAbsoluteUrl(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return "";

  try {
    const parsed = new URL(value);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function isWorkersDevOrigin(origin) {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname === "workers.dev" || hostname.endsWith(".workers.dev");
  } catch {
    return false;
  }
}

function isTrueLike(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function getAuthEnvPresence(env) {
  return {
    hasAuthSecret: Boolean(getEnv(env, "AUTH_SECRET") || getEnv(env, "NEXTAUTH_SECRET")),
    hasJwtSecret: Boolean(getEnv(env, "JWT_SECRET") || getEnv(env, "NEXTAUTH_SECRET")),
    hasAuthUrl: Boolean(getEnv(env, "AUTH_URL") || getEnv(env, "NEXTAUTH_URL")),
    hasAuthApiBaseUrl: Boolean(getEnv(env, "AUTH_API_BASE_URL")),
    hasAuthTrustHost: Boolean(getEnv(env, "AUTH_TRUST_HOST") || getEnv(env, "NEXTAUTH_TRUST_HOST")),
    hasGoogleClientId: Boolean(getEnv(env, "GOOGLE_OAUTH_CLIENT_ID") || getEnv(env, "GOOGLE_CLIENT_ID")),
    hasGoogleClientSecret: Boolean(getEnv(env, "GOOGLE_OAUTH_CLIENT_SECRET") || getEnv(env, "GOOGLE_CLIENT_SECRET")),
    hasMongoUri: Boolean(getEnv(env, "MONGO_URI") || getEnv(env, "MONGODB_URI")),
  };
}

function getRequestHost(request) {
  try {
    return String(new URL(request.url).host || "");
  } catch {
    return "";
  }
}

function getStackSnippet(error) {
  const stack = String(error?.stack || "");
  if (!stack) return "";
  return stack
    .split("\n")
    .slice(0, 4)
    .map((line) => line.trim())
    .join(" | ")
    .slice(0, 600);
}

function logAuthDiagnostic(request, env, routePath, provider, marker, error) {
  const payload = {
    marker,
    routePath,
    provider: provider || "",
    requestHost: getRequestHost(request),
    errorName: String(error?.name || "Error"),
    errorMessage: String(error?.message || "unknown_error").slice(0, 300),
    stackSnippet: getStackSnippet(error),
    env: getAuthEnvPresence(env),
  };

  try {
    console.error("[auth-diagnostic]", JSON.stringify(payload));
  } catch {
    console.error("[auth-diagnostic]", payload);
  }
}

function resolveAuthTrustHost(env) {
  return isTrueLike(getEnv(env, "AUTH_TRUST_HOST") || getEnv(env, "NEXTAUTH_TRUST_HOST"));
}

function resolveCanonicalAuthOrigin(env) {
  const configuredApiBase = normalizeOriginOnly(getEnv(env, "AUTH_API_BASE_URL"));
  if (configuredApiBase && !isWorkersDevOrigin(configuredApiBase)) return configuredApiBase;

  const configuredAuthUrl = normalizeOriginOnly(getEnv(env, "AUTH_URL") || getEnv(env, "NEXTAUTH_URL"));
  if (configuredAuthUrl && !isWorkersDevOrigin(configuredAuthUrl)) return configuredAuthUrl;

  const siteBase = normalizeOriginOnly(getEnv(env, "SITE_BASE_URL"));
  if (siteBase && !isWorkersDevOrigin(siteBase)) return siteBase;

  return "";
}

function getAuthOpTimeoutMs(env) {
  const raw = Number(getEnv(env, "AUTH_OPERATION_TIMEOUT_MS", "12000"));
  if (!Number.isFinite(raw) || raw < 1000) return 5000;
  return Math.floor(raw);
}

function buildAuthDbEnv(env, timeoutMs) {
  const clamp = (value, fallback, floor, ceil) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(floor, Math.min(Math.floor(parsed), ceil));
  };

  const base = clamp(timeoutMs, 7000, 2500, 9000);
  const serverSelection = clamp(getEnv(env, "MONGO_SERVER_SELECTION_TIMEOUT_MS", String(base)), base, 2500, 9000);
  const connectTimeout = clamp(getEnv(env, "MONGO_CONNECT_TIMEOUT_MS", String(base)), base, 2500, 9000);
  const guardTimeout = clamp(getEnv(env, "MONGO_WORKER_CONNECT_GUARD_MS", String(base + 1000)), base + 1000, 3000, 11000);

  return {
    ...env,
    MONGO_SERVER_SELECTION_TIMEOUT_MS: String(serverSelection),
    MONGO_CONNECT_TIMEOUT_MS: String(connectTimeout),
    MONGO_WORKER_CONNECT_GUARD_MS: String(guardTimeout),
    MONGO_CONNECT_RETRY_ONCE: "false",
    MONGO_VERIFY_PING_EACH_REQUEST: "false",
  };
}

async function withAuthOpTimeout(task, timeoutMs, label) {
  let timeoutId;
  try {
    return await Promise.race([
      Promise.resolve(task),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label}_timeout`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function toOAuthFeature(provider) {
  if (provider === "google") return "auth-oauth-google";
  if (provider === "naver") return "auth-oauth-naver";
  if (provider === "kakao") return "auth-oauth-kakao";
  return "auth-basic";
}

function configMismatchResponse(feature, env) {
  const health = evaluateFeatureKeyHealth(env, feature);
  if (health.ok) return null;
  return json(buildConfigErrorBody(feature, health), { status: 503 });
}

function getFrontendBaseUrl(env) {
  const configured = normalizeOriginOnly(getEnv(env, "AUTH_FRONTEND_BASE_URL"));
  if (configured && !isWorkersDevOrigin(configured)) return configured;

  const canonicalAuthOrigin = resolveCanonicalAuthOrigin(env);
  if (canonicalAuthOrigin) return canonicalAuthOrigin;

  const siteBase = normalizeOriginOnly(getEnv(env, "SITE_BASE_URL"));
  if (siteBase && !isWorkersDevOrigin(siteBase)) return siteBase;

  const apiBase = normalizeOriginOnly(getEnv(env, "AUTH_API_BASE_URL"));
  if (apiBase && !isWorkersDevOrigin(apiBase)) return apiBase;

  const authUrl = normalizeOriginOnly(getEnv(env, "AUTH_URL") || getEnv(env, "NEXTAUTH_URL"));
  if (authUrl && !isWorkersDevOrigin(authUrl)) return authUrl;

  return "http://localhost:3000";
}

function getApiBaseUrl(request, env) {
  const canonicalAuthOrigin = resolveCanonicalAuthOrigin(env);
  if (canonicalAuthOrigin) return canonicalAuthOrigin;

  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const requestOrigin = normalizeOriginOnly(`${proto}://${host}`);
  const productionLike = String(getEnv(env, "NODE_ENV", "")).trim().toLowerCase() === "production";
  const trustHost = resolveAuthTrustHost(env);

  if (requestOrigin && (!productionLike || trustHost || !isWorkersDevOrigin(requestOrigin))) {
    return requestOrigin;
  }

  return requestOrigin || "http://localhost:3000";
}

function getRequestOrigin(request) {
  try {
    const url = new URL(request.url);
    const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
    return normalizeOriginOnly(`${proto}://${host}`);
  } catch {
    return "";
  }
}

function resolveProviderCallbackUrl(provider, request, env) {
  const key = `${provider.toUpperCase()}_OAUTH_CALLBACK`;
  const configured = String(getEnv(env, key) || "").trim();
  if (!configured) {
    return `${getApiBaseUrl(request, env)}/api/auth/oauth/${provider}/callback`;
  }

  if (configured.startsWith("/")) {
    return `${getApiBaseUrl(request, env)}${configured}`;
  }

  return normalizeAbsoluteUrl(configured) || `${getApiBaseUrl(request, env)}/api/auth/oauth/${provider}/callback`;
}

function sanitizeNextPath(rawNext) {
  if (!rawNext || typeof rawNext !== "string") return null;
  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return null;
  return rawNext;
}

function sanitizeAuthFlow(rawFlow) {
  return String(rawFlow || "").trim().toLowerCase() === "signup" ? "signup" : "login";
}

async function signSocialState(payload, env) {
  return signJwt(
    {
      purpose: "social-oauth-state",
      ...payload,
    },
    getAccessTokenSecret(env),
    { expiresIn: "10m", issuer: JWT_ISSUER },
  );
}

async function verifySocialState(token, env) {
  const payload = await verifyJwt(token, getAccessTokenSecret(env), { issuer: JWT_ISSUER });
  if (!payload || payload.purpose !== "social-oauth-state") {
    throw new Error("invalid_oauth_state");
  }
  return payload;
}

async function signSocialGrant(payload, env) {
  return signJwt(
    {
      purpose: "social-oauth-grant",
      ...payload,
      jti: crypto.randomUUID(),
    },
    getAccessTokenSecret(env),
    { expiresIn: `${SOCIAL_GRANT_EXPIRES_IN_SEC}s`, issuer: JWT_ISSUER },
  );
}

async function verifySocialGrant(token, env) {
  const payload = await verifyJwt(token, getAccessTokenSecret(env), { issuer: JWT_ISSUER });
  if (!payload || payload.purpose !== "social-oauth-grant") {
    throw new Error("invalid_social_grant");
  }
  return payload;
}

function buildProviderConfig(provider, request, env) {
  const redirectUri = resolveProviderCallbackUrl(provider, request, env);

  if (provider === "google") {
    return {
      clientId: getEnv(env, "GOOGLE_OAUTH_CLIENT_ID") || getEnv(env, "GOOGLE_CLIENT_ID"),
      clientSecret: getEnv(env, "GOOGLE_OAUTH_CLIENT_SECRET") || getEnv(env, "GOOGLE_CLIENT_SECRET"),
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      userInfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
      scope: "openid email profile",
      redirectUri,
    };
  }

  if (provider === "naver") {
    return {
      clientId: getEnv(env, "NAVER_OAUTH_CLIENT_ID"),
      clientSecret: getEnv(env, "NAVER_OAUTH_CLIENT_SECRET"),
      authorizationEndpoint: "https://nid.naver.com/oauth2.0/authorize",
      tokenEndpoint: "https://nid.naver.com/oauth2.0/token",
      userInfoEndpoint: "https://openapi.naver.com/v1/nid/me",
      scope: "name email",
      redirectUri,
    };
  }

  if (provider === "kakao") {
    return {
      clientId: getEnv(env, "KAKAO_OAUTH_CLIENT_ID"),
      clientSecret: getEnv(env, "KAKAO_OAUTH_CLIENT_SECRET"),
      authorizationEndpoint: "https://kauth.kakao.com/oauth/authorize",
      tokenEndpoint: "https://kauth.kakao.com/oauth/token",
      userInfoEndpoint: "https://kapi.kakao.com/v2/user/me",
      scope: "profile_nickname account_email",
      redirectUri,
    };
  }

  throw new Error("unsupported_provider");
}

function mapSocialProfile(provider, payload) {
  if (provider === "google") {
    return {
      providerId: String(payload?.sub || ""),
      email: payload?.email ? String(payload.email).toLowerCase() : "",
      name: String(payload?.name || payload?.given_name || "Google user"),
      image: String(payload?.picture || ""),
    };
  }

  if (provider === "naver") {
    const profile = payload?.response || {};
    return {
      providerId: String(profile?.id || ""),
      email: profile?.email ? String(profile.email).toLowerCase() : "",
      name: String(profile?.name || profile?.nickname || "Naver user"),
      image: String(profile?.profile_image || ""),
    };
  }

  if (provider === "kakao") {
    const account = payload?.kakao_account || {};
    const profile = account?.profile || {};
    return {
      providerId: String(payload?.id || ""),
      email: account?.email ? String(account.email).toLowerCase() : "",
      name: String(profile?.nickname || "Kakao user"),
      image: String(profile?.profile_image_url || profile?.thumbnail_image_url || ""),
    };
  }

  return { providerId: "", email: "", name: "", image: "" };
}

async function exchangeCodeForAccessToken(provider, code, request, env, stateToken, redirectUriOverride) {
  const cfg = buildProviderConfig(provider, request, env);
  if (!cfg.clientId || ((provider === "google" || provider === "naver") && !cfg.clientSecret)) {
    throw new Error("oauth_not_configured");
  }

  const redirectUri = normalizeAbsoluteUrl(redirectUriOverride) || cfg.redirectUri;

  const tokenParams = {
    grant_type: "authorization_code",
    code,
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
  };

  if (cfg.clientSecret) tokenParams.client_secret = cfg.clientSecret;
  if (provider === "naver") tokenParams.state = stateToken;

  const response = await fetch(cfg.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(tokenParams),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) {
    throw new Error(`${provider}_token_exchange_failed`);
  }

  return String(data.access_token);
}

async function fetchSocialProfile(provider, accessToken, request, env) {
  const cfg = buildProviderConfig(provider, request, env);
  const response = await fetch(cfg.userInfoEndpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${provider}_profile_fetch_failed`);
  }

  const mapped = mapSocialProfile(provider, data);
  if (!mapped.providerId) {
    throw new Error(`${provider}_profile_invalid`);
  }

  return mapped;
}

async function findOrCreateSocialUser(provider, profile) {
  const socialField = `socialAccounts.${provider}.id`;

  let user = await User.findOne({ [socialField]: profile.providerId });
  if (user) return user;

  if (profile.email) {
    user = await User.findOne({ email: profile.email });
    if (user) {
      user.set(socialField, profile.providerId);
      user.set(`socialAccounts.${provider}.connectedAt`, new Date());
      if (!String(user.profileImage || "").trim() && String(profile.image || "").trim()) {
        user.set("profileImage", String(profile.image || "").trim());
      }
      await user.save();
      return user;
    }
  }

  const fallbackEmail = `${provider}_${profile.providerId}@social.code-destiny.local`;
  return User.create({
    name: profile.name || `${provider} user`,
    email: profile.email || fallbackEmail,
    profileImage: String(profile.image || ""),
    passwordHash: "",
    birthDate: "1900-01-01",
    birthTime: "00:00",
    gender: "OTHER",
    role: "user",
    points: 50,
    joinedAt: new Date(),
    localAuth: {
      enabled: false,
      activatedAt: null,
    },
    socialAccounts: {
      [provider]: {
        id: profile.providerId,
        connectedAt: new Date(),
      },
    },
  });
}

function isLocalAuthEnabled(user) {
  return user?.localAuth?.enabled !== false;
}

function getCsrfSecret(env) {
  return getEnv(env, "CSRF_SECRET") || getAccessTokenSecret(env) || "dev-csrf-secret";
}

function generateCsrfToken(env) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  const payload = `${timestamp}.${random}`;
  const sig = createHmac("sha256", getCsrfSecret(env)).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

function verifyCsrfToken(token, env) {
  if (typeof token !== "string" || !token) {
    return { valid: false, reason: "missing_token" };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, reason: "invalid_token_format" };
  }

  const [ts36, random, providedSig] = parts;
  const issuedAt = parseInt(ts36, 36);
  if (!Number.isFinite(issuedAt)) {
    return { valid: false, reason: "invalid_timestamp" };
  }
  if (Date.now() - issuedAt > CSRF_TOKEN_TTL_MS) {
    return { valid: false, reason: "token_expired" };
  }

  const payload = `${ts36}.${random}`;
  const expectedSig = createHmac("sha256", getCsrfSecret(env)).update(payload).digest("hex");
  const expected = Buffer.from(expectedSig, "hex");
  const provided = Buffer.from(String(providedSig || "").padEnd(expectedSig.length, "0"), "hex");

  if (expected.length !== provided.length) {
    return { valid: false, reason: "signature_length_mismatch" };
  }
  if (!timingSafeEqual(expected, provided)) {
    return { valid: false, reason: "signature_mismatch" };
  }
  return { valid: true };
}

function validateCsrfFromRequest(request, env) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookieMatch = cookieHeader.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]+)`));
  const cookieToken = cookieMatch ? decodeURIComponent(cookieMatch[1]) : "";
  const headerToken = request.headers.get(CSRF_HEADER_NAME) || "";

  if (!cookieToken || !headerToken) {
    return { valid: false, reason: "csrf_token_missing" };
  }

  const cookieBuf = Buffer.from(cookieToken);
  const headerBuf = Buffer.from(headerToken);
  if (cookieBuf.length !== headerBuf.length || !timingSafeEqual(cookieBuf, headerBuf)) {
    return { valid: false, reason: "csrf_token_mismatch" };
  }

  return verifyCsrfToken(cookieToken, env);
}

function setCsrfCookie(response, request, env, token) {
  response.headers.append("Set-Cookie", buildCookieValue(CSRF_COOKIE_NAME, token, {
    path: "/",
    maxAge: 7200,
    httpOnly: true,
    secure: resolveCookieSecure(request, env),
    sameSite: "Strict",
  }));
}

function clearAuthCookies(response, request, env) {
  appendClearAuthCookies(response, request, env);
  response.headers.append("Set-Cookie", buildCookieValue(CSRF_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: resolveCookieSecure(request, env),
    sameSite: "Strict",
  }));
}

function isWithdrawRateLimited(request) {
  const meta = getRequestMeta(request);
  const key = String(meta.ip || "unknown");
  const now = Date.now();
  const state = withdrawRateLimitMap.get(key);

  if (!state || now > state.resetAt) {
    withdrawRateLimitMap.set(key, {
      count: 1,
      resetAt: now + WITHDRAW_RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  state.count += 1;
  withdrawRateLimitMap.set(key, state);
  return state.count > WITHDRAW_RATE_LIMIT_MAX;
}

function hashEmailForAudit(email, env) {
  const normalized = String(email || "").trim().toLowerCase();
  const salt = getAccessTokenSecret(env);
  return createHash("sha256").update(`${normalized}|${salt}`).digest("hex");
}

function resolveAuthDbName(env) {
  return resolveMongoDbName(env) || mongoose?.connection?.name || "";
}

function toErrorMessage(error) {
  return String(error?.message || "").slice(0, 240);
}

function isAuthInfraFailure(error, markers = []) {
  const message = String(error?.message || "");
  if (!message) return false;

  const infraHint = (
    message.includes("Mongo")
    || message.includes("timed out")
    || message.includes("timeout")
    || message.includes("ECONN")
    || message.includes("network")
    || message.includes("connect")
    || message.includes("server selection")
  );

  if (infraHint) return true;
  return markers.some((marker) => message.includes(marker));
}

async function sleep(ms) {
  const delay = Number(ms);
  if (!Number.isFinite(delay) || delay <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, Math.floor(delay)));
}

function readCookieFromRequest(request, key) {
  const cookieHeader = String(request.headers.get("cookie") || "");
  if (!cookieHeader) return "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${key}=([^;]+)`));
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return String(match[1] || "");
  }
}

function readRefreshTokenFromRequest(request) {
  return readCookieFromRequest(request, REFRESH_COOKIE_NAME);
}

function extractRefreshUserId(payload) {
  const userId = String(payload?.userId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(userId)) return "";
  if (String(payload?.typ || "") !== "refresh") return "";
  return userId;
}

async function createRefreshSession(request, env, userId, tokenHash, expiresAt) {
  const base = buildRefreshSessionFromRequest(request, env, userId);
  return RefreshTokenSession.create({
    ...base,
    tokenHash,
    expiresAt,
    revokedAt: null,
    replacedByTokenHash: "",
  });
}

async function markSessionRevoked(tokenHash, patch = {}) {
  if (!tokenHash) return;
  await RefreshTokenSession.updateOne(
    { tokenHash },
    {
      $set: {
        revokedAt: patch.revokedAt || new Date(),
        ...(patch.replacedByTokenHash ? { replacedByTokenHash: patch.replacedByTokenHash } : {}),
      },
    },
  ).catch(() => {});
}

async function revokeAllUserRefreshSessions(userId) {
  if (!mongoose.Types.ObjectId.isValid(String(userId || ""))) return;
  await RefreshTokenSession.updateMany(
    { userId: new mongoose.Types.ObjectId(String(userId)), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  ).catch(() => {});
}

async function createAuthSuccessResponse(request, env, user, status = 200, nextPath = "/") {
  const accessToken = await signAuthToken(user, env);
  const { refreshToken, tokenHash, expiresAt } = await issueRefreshTokenForUser(user._id, env);
  await createRefreshSession(request, env, user._id, tokenHash, expiresAt);
  const accessExpiresInSec = parseDurationToSeconds(getAccessTokenExpiresIn(env), 30 * 60);

  const response = json({
    ok: true,
    message: status === 201 ? "Registration completed." : "Login completed.",
    user: normalizeUserResponse(user),
    nextPath: sanitizeNextPath(nextPath) || "/",
    accessToken,
    tokenType: "Bearer",
    accessTokenExpiresInSec: accessExpiresInSec,
  }, { status });
  appendAuthCookies(response, request, env, accessToken, refreshToken);
  return response;
}

function buildTokenFallbackUser(auth) {
  return {
    id: auth.userId,
    name: auth.name || auth.email || "",
    email: auth.email || "",
    image: auth.image || "",
    birthDate: auth.birthDate || "",
    birthTime: auth.birthTime || "",
    gender: auth.gender || "OTHER",
    role: auth.role || "user",
    points: Number.isFinite(Number(auth.points)) ? Number(auth.points) : 0,
    joinedAt: auth.joinedAt || null,
    hasLocalAuth: true,
  };
}

function isAuthDbInfraError(error) {
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

function logSignupFailure(request, env, errorCode, errorMessage) {
  const meta = getRequestMeta(request);
  console.error("[auth/signup]", JSON.stringify({
    requestId: meta.requestId || "",
    endpoint: "/api/auth/register",
    errorCode,
    errorMessage: String(errorMessage || "unknown_error").slice(0, 240),
    dbName: resolveAuthDbName(env),
  }));
}

function signupErrorResponse(request, env, status, code, message, extra = {}) {
  logSignupFailure(request, env, code, message);
  return json({
    ok: false,
    message,
    code,
    error: code,
    ...extra,
  }, { status });
}

async function handleRegister(request, env) {
  const timeoutMs = getAuthOpTimeoutMs(env);
  const dbMaxTimeMs = Math.max(1000, timeoutMs - 1000);
  let body;

  try {
    body = await readJson(request);
  } catch {
    return signupErrorResponse(
      request,
      env,
      400,
      "invalid_request_body",
      "Request body must be valid JSON.",
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return signupErrorResponse(
      request,
      env,
      400,
      "invalid_request_body",
      "Request body must be a JSON object.",
    );
  }

  const requiredKeys = ["name", "email", "password", "birthDate", "birthTime", "gender"];
  const missingFields = requiredKeys.filter((key) => {
    const value = body[key];
    return typeof value !== "string" || value.trim() === "";
  });

  if (missingFields.length > 0) {
    return signupErrorResponse(
      request,
      env,
      400,
      "missing_fields",
      "Required signup fields are missing.",
      { missingFields },
    );
  }

  const validated = validateRegisterPayload(body);
  if (!validated.isValid) {
    return signupErrorResponse(
      request,
      env,
      400,
      "invalid_request_body",
      "Registration payload is invalid.",
      { errors: validated.errors },
    );
  }

  try {
    await withAuthOpTimeout(connectDb(env), timeoutMs, "auth_register_connect_db");
  } catch (error) {
    return signupErrorResponse(
      request,
      env,
      503,
      "db_connection_failed",
      toErrorMessage(error) || "Database connection failed.",
    );
  }

  const { name, email, password, birthDate, birthTime, gender } = validated.sanitized;

  try {
    const users = User.collection;
    const existing = await withAuthOpTimeout(
      users.findOne(
        { email },
        {
          projection: { _id: 1, localAuth: 1, socialAccounts: 1 },
          maxTimeMS: dbMaxTimeMs,
        },
      ),
      timeoutMs,
      "auth_register_find_existing",
    );

    if (existing) {
      return signupErrorResponse(
        request,
        env,
        409,
        "duplicate_email",
        "This email is already registered.",
      );
    }
  } catch (error) {
    return signupErrorResponse(
      request,
      env,
      503,
      "db_connection_failed",
      toErrorMessage(error) || "Failed to query existing user.",
    );
  }

  let passwordHash = "";
  try {
    passwordHash = await withAuthOpTimeout(
      hashPassword(password),
      timeoutMs,
      "auth_register_hash_password",
    );
  } catch (error) {
    return signupErrorResponse(
      request,
      env,
      500,
      "unknown_error",
      toErrorMessage(error) || "Password hashing failed.",
    );
  }

  let user;
  try {
    user = await withAuthOpTimeout(
      User.create({
        name,
        email,
        passwordHash,
        birthDate,
        birthTime,
        gender,
        role: "user",
        points: Number(getEnv(env, "AUTH_SIGNUP_BONUS_POINTS", "50")) || 0,
        joinedAt: new Date(),
        localAuth: {
          enabled: true,
          activatedAt: new Date(),
        },
      }),
      timeoutMs,
      "auth_register_create_user",
    );
  } catch (error) {
    if (error && error.code === 11000) {
      return signupErrorResponse(
        request,
        env,
        409,
        "duplicate_email",
        "This email is already registered.",
      );
    }

    return signupErrorResponse(
      request,
      env,
      500,
      "db_write_failed",
      toErrorMessage(error) || "Failed to create user.",
    );
  }

  try {
    return await withAuthOpTimeout(
      createAuthSuccessResponse(request, env, user, 201, body?.nextPath),
      timeoutMs,
      "auth_register_issue_session",
    );
  } catch (error) {
    return signupErrorResponse(
      request,
      env,
      500,
      "unknown_error",
      toErrorMessage(error) || "Session issuance failed.",
    );
  }
}

async function handleLogin(request, env) {
  const timeoutMs = Math.min(getAuthOpTimeoutMs(env), 7000);
  const dbMaxTimeMs = Math.max(1000, timeoutMs - 1000);
  const dbEnv = buildAuthDbEnv(env, timeoutMs);
  const body = await readJson(request);
  const validated = validateLoginPayload(body);
  if (!validated.isValid) {
    return json({
      ok: false,
      code: "invalid_request_body",
      message: "Login payload is invalid.",
      errors: validated.errors,
    }, { status: 400 });
  }

  const { email, password } = validated.sanitized;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await withAuthOpTimeout(connectDb(dbEnv), timeoutMs, "auth_login_connect_db");

      const users = User.collection;
      const user = await withAuthOpTimeout(
        users.findOne(
          { email },
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
              passwordHash: 1,
              localAuth: 1,
            },
            maxTimeMS: dbMaxTimeMs,
          },
        ),
        timeoutMs,
        "auth_login_find_user",
      );
      if (!user || !isLocalAuthEnabled(user) || !user.passwordHash) {
        return json({
          ok: false,
          code: "invalid_credentials",
          message: "Email or password is incorrect.",
        }, { status: 401 });
      }

      const passwordOk = await withAuthOpTimeout(
        verifyPassword(password, user.passwordHash),
        timeoutMs,
        "auth_login_verify_password",
      );
      if (!passwordOk) {
        return json({
          ok: false,
          code: "invalid_credentials",
          message: "Email or password is incorrect.",
        }, { status: 401 });
      }

      return await withAuthOpTimeout(
        createAuthSuccessResponse(request, env, user, 200, body?.nextPath),
        timeoutMs,
        "auth_login_issue_session",
      );
    } catch (error) {
      const infraFailure = isAuthInfraFailure(error, [
        "auth_login_connect_db",
        "auth_login_find_user",
        "auth_login_verify_password_timeout",
      ]);

      if (infraFailure && attempt < 3) {
        console.warn("[auth/login] transient infra failure, retrying:", error);
        resetMongooseConnection().catch(() => {});
        await sleep(150 * attempt);
        continue;
      }

      if (infraFailure) {
        console.error("[auth/login] infrastructure failure:", error);
        return json({
          ok: false,
          code: "login_service_unavailable",
          message: "Login service is temporarily unavailable. Please try again.",
        }, { status: 503 });
      }

      console.error("[auth/login] normalized auth failure:", error);
      return json({
        ok: false,
        code: "invalid_credentials",
        message: "Email or password is incorrect.",
      }, { status: 401 });
    }
  }

  return json({
    ok: false,
    code: "login_service_unavailable",
    message: "Login service is temporarily unavailable. Please try again.",
  }, { status: 503 });
}

async function handleMe(request, env) {
  try {
    const timeoutMs = getAuthOpTimeoutMs(env);
    const dbMaxTimeMs = Math.max(1000, timeoutMs - 1000);
    const auth = await requireAuth(request, env);

    const userId = String(auth.userId || "");
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return json({ ok: false, code: "invalid_auth_token", message: "Invalid authentication token." }, { status: 401 });
    }
    const objectId = new mongoose.Types.ObjectId(userId);

    let user;
    try {
      await withAuthOpTimeout(connectDb(env), timeoutMs, "auth_me_connect_db");
      const users = User.collection;
      user = await withAuthOpTimeout(
        users.findOne(
          { _id: objectId },
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
            },
            maxTimeMS: dbMaxTimeMs,
          },
        ),
        timeoutMs,
        "auth_me_find_user",
      );
    } catch (error) {
      if (isAuthDbInfraError(error)) {
        logAuthDiagnostic(request, env, "/api/auth/me", "", "session_me_db_fallback", error);
        return json({
          ok: true,
          message: "Authenticated user loaded from token.",
          user: buildTokenFallbackUser(auth),
          source: "token",
        });
      }
      throw error;
    }
    if (!user) {
      return json({ ok: false, code: "unauthorized", message: "User not found." }, { status: 401 });
    }

    return json({
      ok: true,
      message: "Authenticated user loaded.",
      user: {
        ...normalizeUserResponse(user),
        hasLocalAuth: isLocalAuthEnabled(user) && Boolean(user.passwordHash),
      },
    });
  } catch (error) {
    logAuthDiagnostic(request, env, "/api/auth/me", "", "session_me_failed", error);
    throw error;
  }
}

async function handleRefresh(request, env) {
  const timeoutMs = Math.min(getAuthOpTimeoutMs(env), 7000);
  const dbMaxTimeMs = Math.max(1000, timeoutMs - 1000);
  const dbEnv = buildAuthDbEnv(env, timeoutMs);
  const refreshToken = readRefreshTokenFromRequest(request);
  if (!refreshToken) {
    const response = json({ ok: false, message: "Refresh token is missing." }, { status: 401 });
    clearAuthCookies(response, request, env);
    return response;
  }

  let payload;
  try {
    payload = await verifyJwt(refreshToken, getRefreshTokenSecret(env), {
      issuer: getJwtIssuer(env),
      audience: getJwtAudience(env),
    });
  } catch {
    const response = json({ ok: false, message: "Refresh token is invalid or expired." }, { status: 401 });
    clearAuthCookies(response, request, env);
    return response;
  }

  const userId = extractRefreshUserId(payload);
  if (!userId) {
    const response = json({ ok: false, message: "Refresh token is invalid." }, { status: 401 });
    clearAuthCookies(response, request, env);
    return response;
  }

  try {
    await withAuthOpTimeout(connectDb(dbEnv), timeoutMs, "auth_refresh_connect_db");
  } catch (error) {
    if (isAuthInfraFailure(error, ["auth_refresh_connect_db"])) {
      logAuthDiagnostic(request, env, "/api/auth/refresh", "", "refresh_connect_db_unavailable", error);
      return json({
        ok: false,
        code: "refresh_service_unavailable",
        message: "Refresh service is temporarily unavailable. Please retry.",
      }, { status: 503 });
    }
    throw error;
  }

  const tokenHash = hashRefreshToken(refreshToken, env);
  let session;
  try {
    session = await withAuthOpTimeout(
      RefreshTokenSession.findOne({ tokenHash }).maxTimeMS(dbMaxTimeMs).lean(),
      timeoutMs,
      "auth_refresh_find_session",
    );
  } catch (error) {
    if (isAuthInfraFailure(error, ["auth_refresh_find_session"])) {
      logAuthDiagnostic(request, env, "/api/auth/refresh", "", "refresh_find_session_unavailable", error);
      return json({
        ok: false,
        code: "refresh_service_unavailable",
        message: "Refresh service is temporarily unavailable. Please retry.",
      }, { status: 503 });
    }
    throw error;
  }
  if (!session) {
    await revokeAllUserRefreshSessions(userId);
    const response = json({ ok: false, message: "Refresh token reuse detected. Please sign in again." }, { status: 401 });
    clearAuthCookies(response, request, env);
    return response;
  }

  if (session.revokedAt) {
    await revokeAllUserRefreshSessions(userId);
    const response = json({ ok: false, message: "Session expired. Please sign in again." }, { status: 401 });
    clearAuthCookies(response, request, env);
    return response;
  }

  const now = Date.now();
  const sessionExpiresAt = new Date(session.expiresAt || 0).getTime();
  if (!Number.isFinite(sessionExpiresAt) || sessionExpiresAt <= now) {
    await markSessionRevoked(tokenHash, { revokedAt: new Date() });
    const response = json({ ok: false, message: "Refresh token expired. Please sign in again." }, { status: 401 });
    clearAuthCookies(response, request, env);
    return response;
  }

  let user;
  try {
    user = await withAuthOpTimeout(
      User.collection.findOne(
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
            passwordHash: 1,
            localAuth: 1,
          },
          maxTimeMS: dbMaxTimeMs,
        },
      ),
      timeoutMs,
      "auth_refresh_find_user",
    );
  } catch (error) {
    if (isAuthInfraFailure(error, ["auth_refresh_find_user"])) {
      logAuthDiagnostic(request, env, "/api/auth/refresh", "", "refresh_find_user_unavailable", error);
      return json({
        ok: false,
        code: "refresh_service_unavailable",
        message: "Refresh service is temporarily unavailable. Please retry.",
      }, { status: 503 });
    }
    throw error;
  }

  if (!user) {
    await revokeAllUserRefreshSessions(userId);
    const response = json({ ok: false, message: "User not found." }, { status: 401 });
    clearAuthCookies(response, request, env);
    return response;
  }

  let accessToken;
  let nextRefresh;
  try {
    accessToken = await withAuthOpTimeout(signAuthToken(user, env), timeoutMs, "auth_refresh_sign_access");
    nextRefresh = await withAuthOpTimeout(issueRefreshTokenForUser(userId, env), timeoutMs, "auth_refresh_issue_refresh");
    await withAuthOpTimeout(
      createRefreshSession(request, env, userId, nextRefresh.tokenHash, nextRefresh.expiresAt),
      timeoutMs,
      "auth_refresh_create_session",
    );
    await withAuthOpTimeout(
      markSessionRevoked(tokenHash, {
        revokedAt: new Date(),
        replacedByTokenHash: nextRefresh.tokenHash,
      }),
      timeoutMs,
      "auth_refresh_revoke_previous",
    );
  } catch (error) {
    if (isAuthInfraFailure(error, [
      "auth_refresh_sign_access",
      "auth_refresh_issue_refresh",
      "auth_refresh_create_session",
      "auth_refresh_revoke_previous",
    ])) {
      logAuthDiagnostic(request, env, "/api/auth/refresh", "", "refresh_issue_token_unavailable", error);
      return json({
        ok: false,
        code: "refresh_service_unavailable",
        message: "Refresh service is temporarily unavailable. Please retry.",
      }, { status: 503 });
    }
    throw error;
  }
  const accessExpiresInSec = parseDurationToSeconds(getAccessTokenExpiresIn(env), 30 * 60);

  const response = json({
    ok: true,
    message: "Token refreshed.",
    accessToken,
    tokenType: "Bearer",
    accessTokenExpiresInSec: accessExpiresInSec,
    user: {
      ...normalizeUserResponse(user),
      hasLocalAuth: isLocalAuthEnabled(user) && Boolean(user.passwordHash),
    },
  });
  appendAuthCookies(response, request, env, accessToken, nextRefresh.refreshToken);
  return response;
}

async function handleLogout(request, env) {
  const refreshToken = readRefreshTokenFromRequest(request);
  if (refreshToken) {
    const tokenHash = hashRefreshToken(refreshToken, env);
    await markSessionRevoked(tokenHash, { revokedAt: new Date() });
  }

  const response = json({ ok: true, message: "Logged out." });
  clearAuthCookies(response, request, env);
  return response;
}

async function handleWithdrawCsrfIssue(request, env) {
  await requireAuth(request, env);
  const csrfToken = generateCsrfToken(env);
  const response = json({ csrfToken });
  setCsrfCookie(response, request, env, csrfToken);
  return response;
}

async function handleWithdraw(request, env) {
  if (isWithdrawRateLimited(request)) {
    return json({ message: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  const auth = await requireAuth(request, env);
  const csrfResult = validateCsrfFromRequest(request, env);
  if (!csrfResult.valid) {
    return json({ message: "CSRF validation failed." }, { status: 403 });
  }

  let body;
  try {
    body = await readJson(request);
  } catch {
    return json({ message: "Request body must be valid JSON." }, { status: 400 });
  }

  const agreeIrreversible = Boolean(body?.agreeIrreversible);
  if (!agreeIrreversible) {
    return json({ message: "Please agree to irreversible deletion before continuing." }, { status: 400 });
  }

  const confirmText = String(body?.confirmText || "").trim();
  if (confirmText !== "회원탈퇴") {
    return json({ message: 'Please type "회원탈퇴" to confirm account withdrawal.' }, { status: 400 });
  }

  await connectDb(env);

  if (!mongoose.Types.ObjectId.isValid(String(auth.userId || ""))) {
    return json({ message: "Invalid authentication token." }, { status: 401 });
  }
  const objectId = new mongoose.Types.ObjectId(String(auth.userId));

  const user = await User.collection.findOne(
    { _id: objectId },
    {
      projection: {
        _id: 1,
        name: 1,
        email: 1,
        passwordHash: 1,
        localAuth: 1,
        socialAccounts: 1,
        status: 1,
      },
      maxTimeMS: 8000,
    },
  );

  if (!user) {
    return json({ message: "User not found." }, { status: 404 });
  }

  if (String(user.status || "").toLowerCase() === "withdrawn") {
    return json({ message: "This account is already withdrawn." }, { status: 409 });
  }

  const localAuthRequired = isLocalAuthEnabled(user) && Boolean(user.passwordHash);
  const password = String(body?.password || "");
  if (localAuthRequired) {
    if (password.length < 8) {
      return json({ message: "Current password is required." }, { status: 400 });
    }

    const passwordOk = await verifyPassword(password, user.passwordHash);
    if (!passwordOk) {
      return json({ message: "Current password is incorrect." }, { status: 403 });
    }
  }

  const now = new Date();
  const userId = String(user._id);
  const emailHash = hashEmailForAudit(user.email, env);
  const anonymizedEmail = `withdrawn_${userId}_${now.getTime()}@withdrawn.local`;

  let partialFailure = false;

  try {
    await User.collection.updateOne(
      { _id: objectId },
      {
        $set: {
          name: "[탈퇴한 회원]",
          email: anonymizedEmail,
          passwordHash: "",
          birthDate: "1900-01-01",
          birthTime: "00:00",
          gender: "OTHER",
          role: "user",
          points: 0,
          status: "withdrawn",
          withdrawnAt: now,
          localAuth: {
            enabled: false,
            activatedAt: null,
          },
          socialAccounts: {
            google: { id: "", connectedAt: null },
            naver: { id: "", connectedAt: null },
            kakao: { id: "", connectedAt: null },
          },
        },
      },
      { maxTimeMS: 8000 },
    );
  } catch (error) {
    console.error("[auth/withdraw] user anonymize failed:", error);
    return json({ message: "Account withdrawal failed. Please try again." }, { status: 500 });
  }

  try {
    await User.db.collection("payments").updateMany(
      { userId: objectId },
      {
        $unset: { userId: "" },
        $set: {
          _anonymized: true,
          anonymizedAt: now,
          userEmailHash: emailHash,
        },
      },
      { maxTimeMS: 8000 },
    );
  } catch (error) {
    partialFailure = true;
    console.error("[auth/withdraw] payment anonymize failed:", error);
  }

  try {
    await User.db.collection("pointhistories").deleteMany(
      { userId: objectId },
      { maxTimeMS: 8000 },
    );
  } catch (error) {
    partialFailure = true;
    console.error("[auth/withdraw] point history delete failed:", error);
  }

  try {
    await User.db.collection("fortuneviewlogs").updateMany(
      { userId: objectId },
      {
        $unset: { userId: "" },
        $set: { _anonymized: true, anonymizedAt: now, userEmailHash: emailHash },
      },
      { maxTimeMS: 8000 },
    );
  } catch (error) {
    partialFailure = true;
    console.error("[auth/withdraw] fortune view log anonymize failed:", error);
  }

  try {
    await User.db.collection("deleted_account_logs").insertOne({
      userId,
      emailHash,
      withdrawnAt: now,
      reason: "self",
      partialFailure,
      source: "worker_auth_withdraw",
    });
  } catch (error) {
    partialFailure = true;
    console.error("[auth/withdraw] audit log insert failed:", error);
  }

  const response = json({
    message: "Account withdrawal completed.",
    partialFailure,
  });
  await revokeAllUserRefreshSessions(userId);
  clearAuthCookies(response, request, env);
  return response;
}

async function handleOAuthStart(request, env, provider) {
  if (!OAUTH_PROVIDERS.includes(provider)) {
    return json({ message: "Unsupported social login provider." }, { status: 400 });
  }

  try {
    const cfg = buildProviderConfig(provider, request, env);
    if (!cfg.clientId || ((provider === "google" || provider === "naver") && !cfg.clientSecret)) {
      return json({ message: "Social login is not configured on the server." }, { status: 500 });
    }

    const url = new URL(request.url);
    const nextPath = sanitizeNextPath(url.searchParams.get("next") || "") || "/";
    const flow = sanitizeAuthFlow(url.searchParams.get("flow"));
    const requestOrigin = getRequestOrigin(request);
    const frontendBase = requestOrigin && !isWorkersDevOrigin(requestOrigin)
      ? requestOrigin
      : getFrontendBaseUrl(env);
    const stateToken = await signSocialState({
      provider,
      nextPath,
      frontendBase,
      flow,
      redirectUri: cfg.redirectUri,
    }, env);

    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      response_type: "code",
      scope: cfg.scope,
      state: stateToken,
    });

    return redirect(`${cfg.authorizationEndpoint}?${params.toString()}`);
  } catch (error) {
    logAuthDiagnostic(request, env, "/api/auth/oauth/start", provider, "oauth_start_failed", error);
    return json({
      ok: false,
      message: "Social login start failed.",
      code: "oauth_start_failed",
    }, { status: 500 });
  }
}

async function handleOAuthCallback(request, env, provider) {
  const frontendBase = getFrontendBaseUrl(env);

  if (!OAUTH_PROVIDERS.includes(provider)) {
    return redirect(`${frontendBase}/login?social_error=unsupported_provider`);
  }

  try {
    const url = new URL(request.url);
    const stateRaw = String(url.searchParams.get("state") || "");
    const code = String(url.searchParams.get("code") || "");
    const oauthError = String(url.searchParams.get("error") || "");

    if (oauthError) return redirect(`${frontendBase}/login?social_error=${encodeURIComponent(oauthError)}`);
    if (!stateRaw || !code) return redirect(`${frontendBase}/login?social_error=invalid_callback`);

    const statePayload = await verifySocialState(stateRaw, env);
    if (statePayload.provider !== provider) {
      return redirect(`${frontendBase}/login?social_error=provider_mismatch`);
    }

    await connectDb(env);

    const flow = sanitizeAuthFlow(statePayload.flow);
    const redirectPath = `/auth/${provider}/callback`;
    const accessToken = await exchangeCodeForAccessToken(
      provider,
      code,
      request,
      env,
      stateRaw,
      String(statePayload.redirectUri || ""),
    );
    const socialProfile = await fetchSocialProfile(provider, accessToken, request, env);
    const user = await findOrCreateSocialUser(provider, socialProfile);
    const grant = await signSocialGrant({
      userId: String(user._id),
      provider,
      nextPath: sanitizeNextPath(statePayload.nextPath) || "/",
    }, env);

    const redirectParams = new URLSearchParams({ social_grant: grant, flow });
    if (statePayload.nextPath) redirectParams.set("next", statePayload.nextPath);

    const safeFrontendBase = String(statePayload.frontendBase || frontendBase).replace(/\/+$/, "");
    return redirect(`${safeFrontendBase}${redirectPath}?${redirectParams.toString()}`);
  } catch (error) {
    logAuthDiagnostic(request, env, "/api/auth/oauth/callback", provider, "oauth_callback_failed", error);
    const reason = String(error?.message || "oauth_callback_failed").trim() || "oauth_callback_failed";
    return redirect(`${frontendBase}/login?social_error=${encodeURIComponent(reason)}`);
  }
}

async function handleOAuthComplete(request, env) {
  const timeoutMs = getAuthOpTimeoutMs(env);
  const dbMaxTimeMs = Math.max(1000, timeoutMs - 1000);

  try {
    const body = await readJson(request);
    const socialGrant = String(body?.socialGrant || "");
    if (!socialGrant) {
      return json({ message: "Social authentication grant is missing." }, { status: 400 });
    }

    const payload = await verifySocialGrant(socialGrant, env);

    if (!mongoose.Types.ObjectId.isValid(String(payload?.userId || ""))) {
      return json({ message: "Invalid social authentication grant." }, { status: 400 });
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await withAuthOpTimeout(connectDb(env), timeoutMs, "auth_oauth_complete_connect_db");

        const user = await withAuthOpTimeout(
          User.collection.findOne(
            { _id: new mongoose.Types.ObjectId(String(payload.userId)) },
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
              },
              maxTimeMS: dbMaxTimeMs,
            },
          ),
          timeoutMs,
          "auth_oauth_complete_find_user",
        );

        if (!user) return json({ message: "User not found." }, { status: 404 });

        const accessToken = await signAuthToken(user, env);
        const nextRefresh = await issueRefreshTokenForUser(user._id, env);
        await withAuthOpTimeout(
          createRefreshSession(request, env, user._id, nextRefresh.tokenHash, nextRefresh.expiresAt),
          timeoutMs,
          "auth_oauth_complete_issue_session",
        );

        const response = json({
          ok: true,
          message: "Social login completed.",
          user: normalizeUserResponse(user),
          nextPath: sanitizeNextPath(payload.nextPath) || "/",
          provider: payload.provider,
          accessToken,
          tokenType: "Bearer",
          accessTokenExpiresInSec: parseDurationToSeconds(getAccessTokenExpiresIn(env), 30 * 60),
        });
        appendAuthCookies(response, request, env, accessToken, nextRefresh.refreshToken);
        return response;
      } catch (error) {
        const infraFailure = isAuthInfraFailure(error, [
          "auth_oauth_complete_connect_db",
          "auth_oauth_complete_find_user",
          "auth_oauth_complete_issue_session",
        ]);

        if (infraFailure && attempt < 3) {
          console.warn("[auth/oauth-complete] transient infra failure, retrying:", error);
          resetMongooseConnection().catch(() => {});
          await sleep(150 * attempt);
          continue;
        }

        if (infraFailure) {
          console.error("[auth/oauth-complete] infrastructure failure:", error);
          return json({
            ok: false,
            code: "oauth_service_unavailable",
            message: "Social login service is temporarily unavailable. Please try again.",
          }, { status: 503 });
        }

        throw error;
      }
    }

    return json({
      ok: false,
      code: "oauth_service_unavailable",
      message: "Social login service is temporarily unavailable. Please try again.",
    }, { status: 503 });
  } catch (error) {
    logAuthDiagnostic(request, env, "/api/auth/oauth/complete", "", "oauth_complete_failed", error);
    throw error;
  }
}

export async function handleAuthRoutes(request, env) {
  let path = "";
  try {
    const method = request.method.toUpperCase();
    path = getRoutePath(request, "/api/auth");

    const providerAliasMatch = path.match(/^\/(google|naver|kakao)$/);
    if (method === "GET" && providerAliasMatch) {
      return await handleOAuthStart(request, env, String(providerAliasMatch[1] || "").toLowerCase());
    }

    const providerCallbackAliasMatch = path.match(/^\/(google|naver|kakao)\/callback$/);
    if (method === "GET" && providerCallbackAliasMatch) {
      return await handleOAuthCallback(request, env, String(providerCallbackAliasMatch[1] || "").toLowerCase());
    }

    const legacySignInMatch = path.match(/^\/signin\/([^/]+)$/);
    if (method === "GET" && legacySignInMatch) {
      return await handleOAuthStart(request, env, String(legacySignInMatch[1] || "").toLowerCase());
    }

    const legacyCallbackMatch = path.match(/^\/callback\/([^/]+)$/);
    if (method === "GET" && legacyCallbackMatch) {
      return await handleOAuthCallback(request, env, String(legacyCallbackMatch[1] || "").toLowerCase());
    }

    if (method === "GET" && path === "/session") {
      return await handleMe(request, env);
    }

    if (
      path === "/register"
      || path === "/signup"
      || path === "/login"
      || path === "/refresh"
      || path === "/me"
      || path === "/withdraw"
      || path === "/oauth/complete"
    ) {
      const configError = configMismatchResponse("auth-basic", env);
      if (configError) return configError;
    }

    const oauthPathMatch = path.match(/^\/oauth\/([^/]+)\/(start|callback)$/);
    if (oauthPathMatch) {
      const feature = toOAuthFeature(String(oauthPathMatch[1] || "").toLowerCase());
      const oauthConfigError = configMismatchResponse(feature, env);
      if (oauthConfigError) return oauthConfigError;
    }

    if (method === "POST" && path === "/register") return await handleRegister(request, env);
    if (method === "POST" && path === "/signup") return await handleRegister(request, env);
    if (method === "POST" && path === "/login") return await handleLogin(request, env);
    if (method === "POST" && path === "/refresh") return await handleRefresh(request, env);
    if (method === "GET" && path === "/me") return await handleMe(request, env);
    if (method === "GET" && path === "/withdraw") return await handleWithdrawCsrfIssue(request, env);
    if (method === "POST" && path === "/withdraw") return await handleWithdraw(request, env);
    if (method === "POST" && path === "/logout") return await handleLogout(request, env);
    if (method === "POST" && path === "/oauth/complete") return await handleOAuthComplete(request, env);

    const startMatch = path.match(/^\/oauth\/([^/]+)\/start$/);
    if (method === "GET" && startMatch) {
      return await handleOAuthStart(request, env, String(startMatch[1] || "").toLowerCase());
    }

    const callbackMatch = path.match(/^\/oauth\/([^/]+)\/callback$/);
    if (method === "GET" && callbackMatch) {
      return await handleOAuthCallback(request, env, String(callbackMatch[1] || "").toLowerCase());
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    const providerMatch = path.match(/^\/oauth\/([^/]+)/);
    const provider = providerMatch ? String(providerMatch[1] || "") : "";
    logAuthDiagnostic(request, env, `/api/auth${path || ""}`, provider, "auth_route_failed", error);
    if (error && error.code === 11000) {
      return json({
        message: "This email is already registered.",
        code: "duplicate_email",
        error: "duplicate_email",
      }, { status: 409 });
    }
    return handleRouteError(error, {
      request,
      env,
      trace: {
        route: "auth",
        requestPath: `/api/auth${path || ""}`,
        method: request?.method || "",
      },
    });
  }
}

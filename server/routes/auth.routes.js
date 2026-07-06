const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const User = require("../models/User");
const RefreshTokenSession = require("../models/RefreshTokenSession");
const { requireAuth } = require("../middleware/auth.middleware");
const { validateRegisterPayload, validateLoginPayload } = require("../utils/validation");

const router = express.Router();

const OAUTH_PROVIDERS = ["google", "naver", "kakao"];
const SOCIAL_GRANT_EXPIRES_IN_SEC = 180;
const ACCESS_COOKIE_NAME = "fortune_auth_token";
const REFRESH_COOKIE_NAME = "fortune_auth_refresh";

router.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  next();
});

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

function readEnv(...keys) {
  for (const key of keys) {
    const value = String(process.env[key] || "").trim();
    if (value) return value;
  }
  return "";
}

function serverAuthStackSnippet(error) {
  const stack = String(error?.stack || "");
  if (!stack) return "";
  return stack
    .split("\n")
    .slice(0, 4)
    .map((line) => line.trim())
    .join(" | ")
    .slice(0, 600);
}

function serverAuthEnvPresence() {
  return {
    hasAuthSecret: Boolean(readEnv("AUTH_SECRET", "NEXTAUTH_SECRET")),
    hasJwtSecret: Boolean(readEnv("JWT_SECRET", "NEXTAUTH_SECRET")),
    hasAuthUrl: Boolean(readEnv("AUTH_URL", "NEXTAUTH_URL")),
    hasAuthApiBaseUrl: Boolean(readEnv("AUTH_API_BASE_URL")),
    hasAuthTrustHost: Boolean(readEnv("AUTH_TRUST_HOST", "NEXTAUTH_TRUST_HOST")),
    hasGoogleClientId: Boolean(readEnv("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_CLIENT_ID")),
    hasGoogleClientSecret: Boolean(readEnv("GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET")),
    hasMongoUri: Boolean(readEnv("MONGO_URI", "MONGODB_URI")),
  };
}

function logServerAuthDiagnostic(req, routePath, provider, marker, error) {
  const payload = {
    marker,
    routePath,
    provider: provider || "",
    requestHost: String(req?.headers?.host || ""),
    errorName: String(error?.name || "Error"),
    errorMessage: String(error?.message || "server_auth_error").slice(0, 300),
    stackSnippet: serverAuthStackSnippet(error),
    env: serverAuthEnvPresence(),
  };

  try {
    console.error("[server-auth-diagnostic]", JSON.stringify(payload));
  } catch (e) {
    console.error("[server-auth-diagnostic]", payload);
  }
}

function getAccessTokenSecret() {
  const secret = readEnv("JWT_ACCESS_SECRET", "JWT_SECRET", "AUTH_SECRET", "NEXTAUTH_SECRET");
  if (secret) return secret;
  // fail-closed: 로컬 개발에서만 명시적 opt-in으로 임시 시크릿 허용
  if (process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_JWT_FALLBACK === "true") {
    return "dev-secret";
  }
  throw new Error("JWT access secret is not configured (set JWT_ACCESS_SECRET)");
}

function getRefreshTokenSecret() {
  return readEnv("JWT_REFRESH_SECRET", "AUTH_SECRET", "JWT_SECRET", "NEXTAUTH_SECRET") || getAccessTokenSecret();
}

function getJwtIssuer() {
  return process.env.JWT_ISSUER || "code-destiny-api";
}

function getJwtAudience() {
  return String(process.env.JWT_AUDIENCE || "code-destiny-web").trim();
}

function getAccessTokenExpiresIn() {
  return process.env.ACCESS_TOKEN_EXPIRES_IN || process.env.JWT_EXPIRES_IN || "30m";
}

function getRefreshTokenExpiresIn() {
  return process.env.REFRESH_TOKEN_EXPIRES_IN || "14d";
}

function isLocalHostname(hostname) {
  const normalized = String(hostname || "").trim().toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "[::1]";
}

function resolveCookieSecure(req) {
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "http").toLowerCase();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(":")[0];
  const localRequest = isLocalHostname(host);

  const forced = String(process.env.AUTH_COOKIE_SECURE || "").trim().toLowerCase();
  // Keep production strict, but avoid dropping cookies on local HTTP during dev.
  if (forced === "true") return localRequest && proto !== "https" ? false : true;
  if (forced === "false") return false;
  if (String(process.env.NODE_ENV || "").toLowerCase() === "production") return true;
  return proto === "https";
}

function resolveCookieSameSite() {
  const raw = String(process.env.AUTH_COOKIE_SAMESITE || "lax").trim().toLowerCase();
  if (raw === "strict") return "strict";
  if (raw === "none") return "none";
  return "lax";
}

function buildCookieOptions(req, maxAgeSec, path) {
  return {
    httpOnly: true,
    secure: resolveCookieSecure(req),
    sameSite: resolveCookieSameSite(),
    path,
    maxAge: Math.max(0, Math.floor(maxAgeSec * 1000)),
  };
}

function getCookieValue(req, cookieName) {
  const raw = String(req.headers.cookie || "");
  if (!raw) return "";
  const parts = raw.split(";").map((v) => v.trim());
  for (const part of parts) {
    const [k, ...rest] = part.split("=");
    if (k === cookieName) {
      try {
        return decodeURIComponent(rest.join("="));
      } catch (e) {
        return rest.join("=");
      }
    }
  }
  return "";
}

function hashRefreshToken(rawToken) {
  const pepper = process.env.AUTH_SECRET || getAccessTokenSecret();
  return crypto.createHash("sha256").update(`${String(rawToken || "")}|${pepper}`).digest("hex");
}

function buildRefreshSessionFromRequest(req, userId) {
  const refreshMaxAgeSec = parseDurationToSeconds(getRefreshTokenExpiresIn(), 14 * 24 * 60 * 60);
  const ip = String(req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();
  const userAgent = String(req.headers["user-agent"] || "");
  return {
    userId: new mongoose.Types.ObjectId(String(userId)),
    ip,
    userAgent,
    expiresAt: new Date(Date.now() + refreshMaxAgeSec * 1000),
  };
}

function signAccessToken(user) {
  return jwt.sign(
    {
      userId: String(user._id),
      email: user.email,
      role: user.role,
    },
    getAccessTokenSecret(),
    {
      expiresIn: getAccessTokenExpiresIn(),
      issuer: getJwtIssuer(),
      audience: getJwtAudience(),
    },
  );
}

function signRefreshToken(userId) {
  const nowSec = Math.floor(Date.now() / 1000);
  const expiresIn = getRefreshTokenExpiresIn();
  const refreshToken = jwt.sign(
    {
      userId: String(userId),
      sid: crypto.randomBytes(16).toString("hex"),
      typ: "refresh",
      iat: nowSec,
    },
    getRefreshTokenSecret(),
    {
      expiresIn,
      issuer: getJwtIssuer(),
      audience: getJwtAudience(),
    },
  );

  const decoded = jwt.decode(refreshToken) || {};
  const expSec = Number(decoded.exp || nowSec + parseDurationToSeconds(expiresIn, 14 * 24 * 60 * 60));
  return {
    refreshToken,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(expSec * 1000),
  };
}

async function createRefreshSession(req, userId, tokenHash, expiresAt) {
  const base = buildRefreshSessionFromRequest(req, userId);
  return RefreshTokenSession.create({
    ...base,
    tokenHash,
    expiresAt,
    revokedAt: null,
    replacedByTokenHash: "",
  });
}

async function revokeRefreshSessionByHash(tokenHash, replacedByTokenHash = "") {
  if (!tokenHash) return;
  await RefreshTokenSession.updateOne(
    { tokenHash },
    {
      $set: {
        revokedAt: new Date(),
        ...(replacedByTokenHash ? { replacedByTokenHash } : {}),
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

function setAuthCookies(req, res, accessToken, refreshToken) {
  const accessMaxAgeSec = parseDurationToSeconds(getAccessTokenExpiresIn(), 30 * 60);
  const refreshMaxAgeSec = parseDurationToSeconds(getRefreshTokenExpiresIn(), 14 * 24 * 60 * 60);
  res.cookie(ACCESS_COOKIE_NAME, accessToken, buildCookieOptions(req, accessMaxAgeSec, "/"));
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, buildCookieOptions(req, refreshMaxAgeSec, "/"));
}

function clearAuthCookies(req, res) {
  const accessClear = buildCookieOptions(req, 0, "/");
  const refreshClear = buildCookieOptions(req, 0, "/");
  const refreshLegacyClear = buildCookieOptions(req, 0, "/api/auth/refresh");
  res.cookie(ACCESS_COOKIE_NAME, "", accessClear);
  res.cookie(REFRESH_COOKIE_NAME, "", refreshClear);
  res.cookie(REFRESH_COOKIE_NAME, "", refreshLegacyClear);
  res.clearCookie("fortune_auth_role", { path: "/" });
}

async function findUserByIdRaw(userId, projection = {}) {
  const normalizedId = String(userId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(normalizedId)) return null;

  return User.collection.findOne(
    { _id: new mongoose.Types.ObjectId(normalizedId) },
    { projection },
  );
}

function normalizeOriginOnly(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return "";

  try {
    return new URL(value).origin;
  } catch (e) {
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
  } catch (e) {
    return "";
  }
}

function isWorkersDevOrigin(origin) {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname === "workers.dev" || hostname.endsWith(".workers.dev");
  } catch (e) {
    return false;
  }
}

function getFrontendBaseUrl() {
  return (
    (() => {
      const configured = normalizeOriginOnly(readEnv("AUTH_FRONTEND_BASE_URL", "SITE_BASE_URL", "AUTH_URL", "NEXTAUTH_URL"));
      return configured && !isWorkersDevOrigin(configured) ? configured : "";
    })()
    || normalizeOriginOnly(readEnv("SITE_BASE_URL", "AUTH_URL", "NEXTAUTH_URL"))
    || normalizeOriginOnly(readEnv("AUTH_API_BASE_URL", "AUTH_URL", "NEXTAUTH_URL"))
    || "http://localhost:3000"
  );
}

function getApiBaseUrl(req) {
  if (normalizeOriginOnly(readEnv("AUTH_API_BASE_URL", "AUTH_URL", "NEXTAUTH_URL"))) {
    return normalizeOriginOnly(readEnv("AUTH_API_BASE_URL", "AUTH_URL", "NEXTAUTH_URL"));
  }
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}`;
}

function getRequestOrigin(req) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return normalizeOriginOnly(`${proto}://${host}`);
}

function shouldUseRequestOrigin(origin) {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    if (hostname === "workers.dev" || hostname.endsWith(".workers.dev")) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

function resolveProviderCallbackUrl(provider, req) {
  const key = `${provider.toUpperCase()}_OAUTH_CALLBACK`;
  const configured = String(process.env[key] || "").trim();
  if (!configured) {
    return `${getApiBaseUrl(req)}/api/auth/oauth/${provider}/callback`;
  }

  if (configured.startsWith("/")) {
    return `${getApiBaseUrl(req)}${configured}`;
  }

  return normalizeAbsoluteUrl(configured) || `${getApiBaseUrl(req)}/api/auth/oauth/${provider}/callback`;
}

function sanitizeNextPath(rawNext) {
  if (!rawNext || typeof rawNext !== "string") return null;
  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return null;
  return rawNext;
}

function sanitizeAuthFlow(rawFlow) {
  const normalized = String(rawFlow || "").trim().toLowerCase();
  if (normalized === "signup") return "signup";
  return "login";
}

function signSocialState(payload) {
  return jwt.sign(
    {
      purpose: "social-oauth-state",
      ...payload,
    },
    getAccessTokenSecret(),
    {
      expiresIn: "10m",
      issuer: getJwtIssuer(),
    },
  );
}

function verifySocialState(token) {
  const payload = jwt.verify(token, getAccessTokenSecret(), {
    issuer: getJwtIssuer(),
  });
  if (!payload || payload.purpose !== "social-oauth-state") {
    throw new Error("invalid_oauth_state");
  }
  return payload;
}

function signSocialGrant(payload) {
  return jwt.sign(
    {
      purpose: "social-oauth-grant",
      ...payload,
      jti: crypto.randomUUID(),
    },
    getAccessTokenSecret(),
    {
      expiresIn: `${SOCIAL_GRANT_EXPIRES_IN_SEC}s`,
      issuer: getJwtIssuer(),
    },
  );
}

function verifySocialGrant(token) {
  const payload = jwt.verify(token, getAccessTokenSecret(), {
    issuer: getJwtIssuer(),
  });
  if (!payload || payload.purpose !== "social-oauth-grant") {
    throw new Error("invalid_social_grant");
  }
  return payload;
}

function buildProviderConfig(provider, req) {
  const redirectUri = resolveProviderCallbackUrl(provider, req);

  if (provider === "google") {
    return {
      clientId: readEnv("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_CLIENT_ID"),
      clientSecret: readEnv("GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"),
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      userInfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
      scope: "openid email profile",
      redirectUri,
    };
  }

  if (provider === "naver") {
    return {
      clientId: process.env.NAVER_OAUTH_CLIENT_ID,
      clientSecret: process.env.NAVER_OAUTH_CLIENT_SECRET,
      authorizationEndpoint: "https://nid.naver.com/oauth2.0/authorize",
      tokenEndpoint: "https://nid.naver.com/oauth2.0/token",
      userInfoEndpoint: "https://openapi.naver.com/v1/nid/me",
      scope: "name email",
      redirectUri,
    };
  }

  if (provider === "kakao") {
    return {
      clientId: process.env.KAKAO_OAUTH_CLIENT_ID,
      clientSecret: process.env.KAKAO_OAUTH_CLIENT_SECRET,
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
      name: String(payload?.name || payload?.given_name || "Google 사용자"),
      image: String(payload?.picture || ""),
    };
  }

  if (provider === "naver") {
    const profile = payload?.response || {};
    return {
      providerId: String(profile?.id || ""),
      email: profile?.email ? String(profile.email).toLowerCase() : "",
      name: String(profile?.name || profile?.nickname || "네이버 사용자"),
      image: String(profile?.profile_image || ""),
    };
  }

  if (provider === "kakao") {
    const account = payload?.kakao_account || {};
    const profile = account?.profile || {};
    return {
      providerId: String(payload?.id || ""),
      email: account?.email ? String(account.email).toLowerCase() : "",
      name: String(profile?.nickname || "카카오 사용자"),
      image: String(profile?.profile_image_url || profile?.thumbnail_image_url || ""),
    };
  }

  return { providerId: "", email: "", name: "", image: "" };
}

function normalizeUserResponse(user) {
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

function isLocalAuthEnabled(user) {
  // 기존 사용자 문서에 필드가 없을 수 있으므로 undefined는 enabled로 처리한다.
  return user?.localAuth?.enabled !== false;
}

async function exchangeCodeForAccessToken(provider, code, req, redirectUriOverride) {
  const cfg = buildProviderConfig(provider, req);
  if (!cfg.clientId || ((provider === "google" || provider === "naver") && !cfg.clientSecret)) {
    throw new Error("oauth_not_configured");
  }

  const redirectUri = normalizeAbsoluteUrl(redirectUriOverride) || cfg.redirectUri;

  if (provider === "google") {
    const response = await fetch(cfg.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data?.access_token) {
      throw new Error("google_token_exchange_failed");
    }
    return String(data.access_token);
  }

  if (provider === "naver" || provider === "kakao") {
    const tokenParams = {
      grant_type: "authorization_code",
      code,
      client_id: cfg.clientId,
      redirect_uri: redirectUri,
    };
    if (cfg.clientSecret) {
      tokenParams.client_secret = cfg.clientSecret;
    }
    if (provider === "naver") {
      tokenParams.state = req.query.state ? String(req.query.state) : "";
    }

    const response = await fetch(cfg.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams(tokenParams),
    });

    const data = await response.json();
    if (!response.ok || !data?.access_token) {
      throw new Error(`${provider}_token_exchange_failed`);
    }
    return String(data.access_token);
  }

  throw new Error("unsupported_provider");
}

async function fetchSocialProfile(provider, accessToken, req) {
  const cfg = buildProviderConfig(provider, req);

  const response = await fetch(cfg.userInfoEndpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const data = await response.json();
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

  const created = await User.create({
    name: profile.name || `${provider} 사용자`,
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

  return created;
}

function signToken(user) {
  return signAccessToken(user);
}

async function hashPassword(rawPassword) {
  return bcrypt.hash(rawPassword, 12);
}

async function verifyPassword(rawPassword, passwordHash) {
  try {
    return await bcrypt.compare(rawPassword, passwordHash);
  } catch (e) {
    return false;
  }
}

router.post("/register", async (req, res, next) => {
  try {
    const validated = validateRegisterPayload(req.body);
    if (!validated.isValid) {
      return res.status(400).json({
        ok: false,
        code: "INVALID_REQUEST_BODY",
        message: "회원가입 요청값이 올바르지 않습니다.",
        errors: validated.errors,
      });
    }

    const { name, email, password, birthDate, birthTime, gender } = validated.sanitized;
    const existing = await User.findOne(
      { email },
      {
        _id: 1,
      },
    ).lean();

    if (existing) {
      return res.status(409).json({
        ok: false,
        message: "이미 가입된 이메일입니다.",
        code: "EMAIL_ALREADY_REGISTERED",
      });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      passwordHash,
      birthDate,
      birthTime,
      gender,
      role: "user",
      points: Number(process.env.AUTH_SIGNUP_BONUS_POINTS || "50") || 0,
      joinedAt: new Date(),
      localAuth: {
        enabled: true,
        activatedAt: new Date(),
      },
    });

    const accessToken = signToken(user);
    const refreshIssue = signRefreshToken(user._id);
    await createRefreshSession(req, user._id, refreshIssue.tokenHash, refreshIssue.expiresAt);
    setAuthCookies(req, res, accessToken, refreshIssue.refreshToken);

    return res.status(201).json({
      ok: true,
      message: "회원가입이 완료되었습니다.",
      user: normalizeUserResponse(user),
      nextPath: sanitizeNextPath(req.body?.nextPath) || "/",
      accessToken,
      tokenType: "Bearer",
      accessTokenExpiresInSec: parseDurationToSeconds(getAccessTokenExpiresIn(), 30 * 60),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/signup", async (req, res, next) => {
  req.url = "/register";
  return router.handle(req, res, next);
});

router.post("/login", async (req, res, next) => {
  try {
    const validated = validateLoginPayload(req.body);
    if (!validated.isValid) {
      return res.status(400).json({
        ok: false,
        code: "INVALID_REQUEST_BODY",
        message: "로그인 요청값이 올바르지 않습니다.",
        errors: validated.errors,
      });
    }

    const { email, password } = validated.sanitized;
    const user = await User.findOne({ email })
      .select("+passwordHash")
      .lean();

    if (!user || !isLocalAuthEnabled(user) || !user.passwordHash) {
      return res.status(401).json({
        ok: false,
        code: "INVALID_CREDENTIALS",
        message: "아이디(이메일) 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    const passwordOk = await verifyPassword(password, user.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({
        ok: false,
        code: "INVALID_CREDENTIALS",
        message: "아이디(이메일) 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    const accessToken = signToken(user);
    const refreshIssue = signRefreshToken(user._id);
    await createRefreshSession(req, user._id, refreshIssue.tokenHash, refreshIssue.expiresAt);
    setAuthCookies(req, res, accessToken, refreshIssue.refreshToken);

    return res.status(200).json({
      ok: true,
      message: "로그인에 성공했습니다.",
      user: normalizeUserResponse(user),
      nextPath: sanitizeNextPath(req.body?.nextPath) || "/",
      accessToken,
      tokenType: "Bearer",
      accessTokenExpiresInSec: parseDurationToSeconds(getAccessTokenExpiresIn(), 30 * 60),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const refreshToken = getCookieValue(req, REFRESH_COOKIE_NAME);
    if (!refreshToken) {
      clearAuthCookies(req, res);
      return res.status(401).json({ ok: false, message: "리프레시 토큰이 없습니다." });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, getRefreshTokenSecret(), {
        issuer: getJwtIssuer(),
        audience: getJwtAudience(),
      });
    } catch (e) {
      clearAuthCookies(req, res);
      return res.status(401).json({ ok: false, message: "리프레시 토큰이 유효하지 않습니다." });
    }

    const userId = String(payload?.userId || "");
    if (!mongoose.Types.ObjectId.isValid(userId) || String(payload?.typ || "") !== "refresh") {
      clearAuthCookies(req, res);
      return res.status(401).json({ ok: false, message: "리프레시 토큰 형식이 올바르지 않습니다." });
    }

    const tokenHash = hashRefreshToken(refreshToken);
    const session = await RefreshTokenSession.findOne({ tokenHash }).lean();
    if (!session || session.revokedAt) {
      await revokeAllUserRefreshSessions(userId);
      clearAuthCookies(req, res);
      return res.status(401).json({ ok: false, message: "세션이 만료되었습니다. 다시 로그인해 주세요." });
    }

    const expiresAt = new Date(session.expiresAt || 0).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      await revokeRefreshSessionByHash(tokenHash);
      clearAuthCookies(req, res);
      return res.status(401).json({ ok: false, message: "리프레시 토큰이 만료되었습니다." });
    }

    const user = await User.findById(userId)
      .select("_id name email profileImage birthDate birthTime gender role points joinedAt passwordHash localAuth")
      .lean();
    if (!user) {
      await revokeAllUserRefreshSessions(userId);
      clearAuthCookies(req, res);
      return res.status(401).json({ ok: false, message: "사용자 정보를 찾을 수 없습니다." });
    }

    const accessToken = signToken(user);
    const refreshIssue = signRefreshToken(user._id);
    await createRefreshSession(req, user._id, refreshIssue.tokenHash, refreshIssue.expiresAt);
    await revokeRefreshSessionByHash(tokenHash, refreshIssue.tokenHash);
    setAuthCookies(req, res, accessToken, refreshIssue.refreshToken);

    return res.status(200).json({
      ok: true,
      message: "세션이 갱신되었습니다.",
      accessToken,
      tokenType: "Bearer",
      accessTokenExpiresInSec: parseDurationToSeconds(getAccessTokenExpiresIn(), 30 * 60),
      user: {
        ...normalizeUserResponse(user),
        hasLocalAuth: isLocalAuthEnabled(user) && Boolean(user.passwordHash),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, code: "UNAUTHORIZED", message: "인증 정보가 없습니다." });
    }

    const user = await findUserByIdRaw(userId, {
      _id: 1,
      name: 1,
      email: 1,
      profileImage: 1,
      birthDate: 1,
      birthTime: 1,
      gender: 1,
      role: 1,
      points: 1,
      joinedAt: 1,
    });
    if (!user) {
      console.warn("[AUTH] User not found during /me check:", userId);
      return res.status(401).json({ ok: false, code: "UNAUTHORIZED", message: "사용자 정보를 찾을 수 없습니다." });
    }

    return res.status(200).json({
      ok: true,
      message: "인증 사용자 조회에 성공했습니다.",
      user: normalizeUserResponse(user),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", async (req, res) => {
  const refreshToken = getCookieValue(req, REFRESH_COOKIE_NAME);
  if (refreshToken) {
    await revokeRefreshSessionByHash(hashRefreshToken(refreshToken));
  }
  clearAuthCookies(req, res);
  return res.status(200).json({ ok: true, message: "로그아웃되었습니다." });
});

router.get(["/google", "/naver", "/kakao"], async (req, res) => {
  const provider = String(req.path || "").replace(/^\//, "").toLowerCase();
  const query = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
  return res.redirect(`/api/auth/oauth/${provider}/start${query}`);
});

router.get(["/google/callback", "/naver/callback", "/kakao/callback"], async (req, res) => {
  const provider = String(req.path || "").split("/")[1] || "";
  const query = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
  return res.redirect(`/api/auth/oauth/${provider}/callback${query}`);
});

router.get("/oauth/:provider/start", async (req, res) => {
  const provider = String(req.params.provider || "").toLowerCase();
  if (!OAUTH_PROVIDERS.includes(provider)) {
    return res.status(400).json({ message: "지원하지 않는 소셜 로그인입니다." });
  }

  try {
    const cfg = buildProviderConfig(provider, req);
    if (!cfg.clientId || ((provider === "google" || provider === "naver") && !cfg.clientSecret)) {
      return res.status(500).json({ message: "소셜 로그인 서버 설정이 누락되었습니다." });
    }

    const nextPath = sanitizeNextPath(String(req.query.next || "")) || "/";
    const flow = sanitizeAuthFlow(req.query.flow);
    const requestOrigin = getRequestOrigin(req);
    const frontendBase = shouldUseRequestOrigin(requestOrigin)
      ? requestOrigin
      : getFrontendBaseUrl();
    const stateToken = signSocialState({
      provider,
      nextPath,
      frontendBase,
      flow,
      redirectUri: cfg.redirectUri,
    });

    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      response_type: "code",
      scope: cfg.scope,
      state: stateToken,
    });

    const authUrl = `${cfg.authorizationEndpoint}?${params.toString()}`;
    return res.redirect(authUrl);
  } catch (error) {
    logServerAuthDiagnostic(req, "/api/auth/oauth/start", provider, "oauth_start_failed", error);
    return res.status(500).json({ message: "소셜 로그인 시작 중 오류가 발생했습니다." });
  }
});

router.get("/oauth/:provider/callback", async (req, res) => {
  const provider = String(req.params.provider || "").toLowerCase();
  const frontendBase = getFrontendBaseUrl();
  const fallbackRedirect = `${frontendBase}/login?social_error=oauth_callback_failed`;

  if (!OAUTH_PROVIDERS.includes(provider)) {
    return res.redirect(`${frontendBase}/login?social_error=unsupported_provider`);
  }

  try {
    const stateRaw = String(req.query.state || "");
    const code = String(req.query.code || "");
    const oauthError = String(req.query.error || "");

    if (oauthError) {
      return res.redirect(`${frontendBase}/login?social_error=${encodeURIComponent(oauthError)}`);
    }
    if (!stateRaw || !code) {
      return res.redirect(`${frontendBase}/login?social_error=invalid_callback`);
    }

    const statePayload = verifySocialState(stateRaw);
    if (statePayload.provider !== provider) {
      return res.redirect(`${frontendBase}/login?social_error=provider_mismatch`);
    }

    const flow = sanitizeAuthFlow(statePayload.flow);
    const redirectPath = `/auth/${provider}/callback`;

    const accessToken = await exchangeCodeForAccessToken(
      provider,
      code,
      req,
      String(statePayload.redirectUri || ""),
    );
    const socialProfile = await fetchSocialProfile(provider, accessToken, req);
    const user = await findOrCreateSocialUser(provider, socialProfile);

    const grant = signSocialGrant({
      userId: String(user._id),
      provider,
      nextPath: sanitizeNextPath(statePayload.nextPath) || "/",
    });

    const redirectParams = new URLSearchParams({ social_grant: grant, flow });
    if (statePayload.nextPath) {
      redirectParams.set("next", statePayload.nextPath);
    }

    return res.redirect(`${frontendBase}${redirectPath}?${redirectParams.toString()}`);
  } catch (error) {
    logServerAuthDiagnostic(req, "/api/auth/oauth/callback", provider, "oauth_callback_failed", error);
    const reason = String(error?.message || "oauth_callback_failed").trim() || "oauth_callback_failed";
    return res.redirect(`${frontendBase}/login?social_error=${encodeURIComponent(reason)}`);
  }
});

router.post("/oauth/complete", async (req, res, next) => {
  try {
    const socialGrant = String(req.body?.socialGrant || "");
    if (!socialGrant) {
      return res.status(400).json({ message: "소셜 인증 정보가 없습니다." });
    }

    const payload = verifySocialGrant(socialGrant);
    const user = await User.findById(payload.userId).lean();
    if (!user) {
      return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    const accessToken = signToken(user);
    const refreshIssue = signRefreshToken(user._id);
    await createRefreshSession(req, user._id, refreshIssue.tokenHash, refreshIssue.expiresAt);
    setAuthCookies(req, res, accessToken, refreshIssue.refreshToken);

    return res.status(200).json({
      ok: true,
      message: "소셜 로그인에 성공했습니다.",
      user: normalizeUserResponse(user),
      nextPath: sanitizeNextPath(payload.nextPath) || "/",
      provider: payload.provider,
      accessToken,
      tokenType: "Bearer",
      accessTokenExpiresInSec: parseDurationToSeconds(getAccessTokenExpiresIn(), 30 * 60),
    });
  } catch (error) {
    logServerAuthDiagnostic(req, "/api/auth/oauth/complete", "", "oauth_complete_failed", error);
    if (error && error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "소셜 인증이 만료되었습니다. 다시 시도해 주세요." });
    }
    return next(error);
  }
});

module.exports = router;

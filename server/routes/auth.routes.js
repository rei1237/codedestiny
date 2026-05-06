const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const User = require("../models/User");
const { requireAuth } = require("../middleware/auth.middleware");
const { validateRegisterPayload, validateLoginPayload } = require("../utils/validation");

const router = express.Router();

const OAUTH_PROVIDERS = ["google", "naver", "kakao"];
const SOCIAL_GRANT_EXPIRES_IN_SEC = 180;

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

function getFrontendBaseUrl() {
  return (
    (() => {
      const configured = normalizeOriginOnly(process.env.AUTH_FRONTEND_BASE_URL);
      return configured && !isWorkersDevOrigin(configured) ? configured : "";
    })()
    || normalizeOriginOnly(process.env.SITE_BASE_URL)
    || normalizeOriginOnly(process.env.AUTH_API_BASE_URL)
    || "http://localhost:3000"
  );
}

function getApiBaseUrl(req) {
  if (normalizeOriginOnly(process.env.AUTH_API_BASE_URL)) {
    return normalizeOriginOnly(process.env.AUTH_API_BASE_URL);
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
  } catch {
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
    process.env.JWT_SECRET || "dev-secret",
    {
      expiresIn: "10m",
      issuer: "code-destiny-api",
    },
  );
}

function verifySocialState(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret", {
    issuer: "code-destiny-api",
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
    process.env.JWT_SECRET || "dev-secret",
    {
      expiresIn: `${SOCIAL_GRANT_EXPIRES_IN_SEC}s`,
      issuer: "code-destiny-api",
    },
  );
}

function verifySocialGrant(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret", {
    issuer: "code-destiny-api",
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
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
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
    };
  }

  if (provider === "naver") {
    const profile = payload?.response || {};
    return {
      providerId: String(profile?.id || ""),
      email: profile?.email ? String(profile.email).toLowerCase() : "",
      name: String(profile?.name || profile?.nickname || "네이버 사용자"),
    };
  }

  if (provider === "kakao") {
    const account = payload?.kakao_account || {};
    const profile = account?.profile || {};
    return {
      providerId: String(payload?.id || ""),
      email: account?.email ? String(account.email).toLowerCase() : "",
      name: String(profile?.nickname || "카카오 사용자"),
    };
  }

  return { providerId: "", email: "", name: "" };
}

function normalizeUserResponse(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
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
      await user.save();
      return user;
    }
  }

  const fallbackEmail = `${provider}_${profile.providerId}@social.code-destiny.local`;

  const created = await User.create({
    name: profile.name || `${provider} 사용자`,
    email: profile.email || fallbackEmail,
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
  return jwt.sign(
    {
      userId: String(user._id),
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || "dev-secret",
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      issuer: "code-destiny-api",
    },
  );
}

async function hashPassword(rawPassword) {
  return bcrypt.hash(rawPassword, 12);
}

async function verifyPassword(rawPassword, passwordHash) {
  try {
    return await bcrypt.compare(rawPassword, passwordHash);
  } catch {
    return false;
  }
}

router.post("/register", async (req, res, next) => {
  try {
    const validated = validateRegisterPayload(req.body);
    if (!validated.isValid) {
      return res.status(400).json({
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

    const token = signToken(user);
    return res.status(201).json({
      message: "회원가입이 완료되었습니다.",
      token,
      user: normalizeUserResponse(user),
      nextPath: sanitizeNextPath(req.body?.nextPath) || "/",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const validated = validateLoginPayload(req.body);
    if (!validated.isValid) {
      return res.status(400).json({
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
        message: "아이디(이메일) 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    const passwordOk = await verifyPassword(password, user.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({
        message: "아이디(이메일) 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    const token = signToken(user);
    return res.status(200).json({
      message: "로그인에 성공했습니다.",
      token,
      user: normalizeUserResponse(user),
      nextPath: sanitizeNextPath(req.body?.nextPath) || "/",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }

    const user = await findUserByIdRaw(userId, {
      _id: 1,
      name: 1,
      email: 1,
      birthDate: 1,
      birthTime: 1,
      gender: 1,
      role: 1,
      points: 1,
      joinedAt: 1,
    });
    if (!user) {
      console.warn("[AUTH] User not found during /me check:", userId);
      return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    return res.status(200).json({
      message: "인증 사용자 조회에 성공했습니다.",
      user: normalizeUserResponse(user),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", async (req, res) => {
  // JWT stateless 구조이므로 서버 세션 제거는 없고, 클라이언트 쿠키 정리를 위한 응답만 반환한다.
  res.clearCookie("fortune_auth_token", { path: "/" });
  res.clearCookie("fortune_auth_role", { path: "/" });
  return res.status(200).json({ message: "로그아웃되었습니다." });
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
  } catch {
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
    const redirectPath = flow === "signup" ? "/signup" : "/login";

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

    const redirectParams = new URLSearchParams({ social_grant: grant });
    if (statePayload.nextPath) {
      redirectParams.set("next", statePayload.nextPath);
    }

    return res.redirect(`${frontendBase}${redirectPath}?${redirectParams.toString()}`);
  } catch (error) {
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

    const token = signToken(user);
    return res.status(200).json({
      message: "소셜 로그인에 성공했습니다.",
      token,
      user: normalizeUserResponse(user),
      nextPath: sanitizeNextPath(payload.nextPath) || "/",
      provider: payload.provider,
    });
  } catch (error) {
    if (error && error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "소셜 인증이 만료되었습니다. 다시 시도해 주세요." });
    }
    return next(error);
  }
});

module.exports = router;

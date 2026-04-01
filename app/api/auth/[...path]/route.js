import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

import connectDB from "../../../../server/config/db";
import User from "../../../../server/models/User";

export const runtime = "nodejs";

const OAUTH_PROVIDERS = ["google", "naver", "kakao"];
const SOCIAL_GRANT_EXPIRES_IN_SEC = 180;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const birthTimeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function json(body, status = 200) {
  return NextResponse.json(body, { status });
}

function normalizeBaseUrl(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return "";

  try {
    const parsed = new URL(value);
    return parsed.origin.replace(/\/$/, "");
  } catch {
    return "";
  }
}

function getFrontendBaseUrl() {
  const candidates = [
    process.env.AUTH_FRONTEND_BASE_URL,
    process.env.SITE_BASE_URL,
    process.env.CODE_DESTINY_API_URL,
    process.env.NEXT_PUBLIC_CODE_DESTINY_API_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
    "http://localhost:3000",
  ];

  for (const candidate of candidates) {
    const normalized = normalizeBaseUrl(candidate);
    if (normalized) return normalized;
  }

  return "http://localhost:3000";
}

function getApiBaseUrl(request) {
  const candidates = [
    process.env.AUTH_API_BASE_URL,
    process.env.CODE_DESTINY_API_URL,
    process.env.NEXT_PUBLIC_CODE_DESTINY_API_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
    request.nextUrl.origin,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeBaseUrl(candidate);
    if (normalized) return normalized;
  }

  return request.nextUrl.origin.replace(/\/$/, "");
}

function sanitizeNextPath(rawNext) {
  if (!rawNext || typeof rawNext !== "string") return null;
  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return null;
  return rawNext;
}

function sanitizeAuthFlow(rawFlow) {
  const normalized = String(rawFlow || "").trim().toLowerCase();
  return normalized === "signup" ? "signup" : "login";
}

function signSocialState(payload) {
  return jwt.sign(
    { purpose: "social-oauth-state", ...payload },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "10m", issuer: "code-destiny-api" },
  );
}

function verifySocialState(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret", { issuer: "code-destiny-api" });
  if (!payload || payload.purpose !== "social-oauth-state") {
    throw new Error("invalid_oauth_state");
  }
  return payload;
}

function signSocialGrant(payload) {
  return jwt.sign(
    { purpose: "social-oauth-grant", ...payload, jti: crypto.randomUUID() },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: `${SOCIAL_GRANT_EXPIRES_IN_SEC}s`, issuer: "code-destiny-api" },
  );
}

function verifySocialGrant(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret", { issuer: "code-destiny-api" });
  if (!payload || payload.purpose !== "social-oauth-grant") {
    throw new Error("invalid_social_grant");
  }
  return payload;
}

function buildProviderConfig(provider, request) {
  const redirectUri = `${getApiBaseUrl(request)}/api/auth/oauth/${provider}/callback`;

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
  return user?.localAuth?.enabled !== false;
}

function signToken(user) {
  return jwt.sign(
    { userId: String(user._id), email: user.email, role: user.role },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d", issuer: "code-destiny-api" },
  );
}

function getAuthToken(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const chunks = cookieHeader.split(";").map((v) => v.trim());
  for (const chunk of chunks) {
    const [k, ...rest] = chunk.split("=");
    if (k === "fortune_auth_token") return decodeURIComponent(rest.join("="));
  }
  return null;
}

function validateRegisterPayload(payload = {}) {
  const errors = [];
  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  const birthDate = String(payload.birthDate || "").trim();
  const birthTime = String(payload.birthTime || "").trim();
  const gender = String(payload.gender || "").trim().toUpperCase();

  if (!name || name.length < 2) errors.push("이름은 최소 2자 이상이어야 합니다.");
  if (!emailRegex.test(email)) errors.push("유효한 이메일 형식이 아닙니다.");
  if (password.length < 8) errors.push("비밀번호는 최소 8자 이상이어야 합니다.");
  if (!birthDateRegex.test(birthDate)) errors.push("생년월일 형식은 YYYY-MM-DD 이어야 합니다.");
  if (!birthTimeRegex.test(birthTime)) errors.push("태어난 시간 형식은 HH:mm 이어야 합니다.");
  if (!["M", "F", "OTHER"].includes(gender)) errors.push("성별은 M, F, OTHER 중 하나여야 합니다.");

  return { isValid: errors.length === 0, errors, sanitized: { name, email, password, birthDate, birthTime, gender } };
}

function validateLoginPayload(payload = {}) {
  const errors = [];
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");

  if (!emailRegex.test(email)) errors.push("유효한 이메일 형식이 아닙니다.");
  if (!password || password.length < 8) errors.push("비밀번호를 다시 확인해 주세요.");

  return { isValid: errors.length === 0, errors, sanitized: { email, password } };
}

async function exchangeCodeForAccessToken(provider, code, request, stateRaw) {
  const cfg = buildProviderConfig(provider, request);
  if (!cfg.clientId || ((provider === "google" || provider === "naver") && !cfg.clientSecret)) {
    throw new Error("oauth_not_configured");
  }

  if (provider === "google") {
    const response = await fetch(cfg.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: cfg.redirectUri,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data?.access_token) throw new Error("google_token_exchange_failed");
    return String(data.access_token);
  }

  if (provider === "naver" || provider === "kakao") {
    const tokenParams = {
      grant_type: "authorization_code",
      code,
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
    };
    if (cfg.clientSecret) tokenParams.client_secret = cfg.clientSecret;
    if (provider === "naver") tokenParams.state = stateRaw || "";

    const response = await fetch(cfg.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams(tokenParams),
    });

    const data = await response.json();
    if (!response.ok || !data?.access_token) throw new Error(`${provider}_token_exchange_failed`);
    return String(data.access_token);
  }

  throw new Error("unsupported_provider");
}

async function fetchSocialProfile(provider, accessToken, request) {
  const cfg = buildProviderConfig(provider, request);
  const response = await fetch(cfg.userInfoEndpoint, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`${provider}_profile_fetch_failed`);

  const mapped = mapSocialProfile(provider, data);
  if (!mapped.providerId) throw new Error(`${provider}_profile_invalid`);
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
  return User.create({
    name: profile.name || `${provider} 사용자`,
    email: profile.email || fallbackEmail,
    passwordHash: "",
    birthDate: "1900-01-01",
    birthTime: "00:00",
    gender: "OTHER",
    role: "user",
    joinedAt: new Date(),
    localAuth: { enabled: false, activatedAt: null },
    socialAccounts: { [provider]: { id: profile.providerId, connectedAt: new Date() } },
  });
}

async function handleRegister(request) {
  const payload = await request.json();
  const { isValid, errors, sanitized } = validateRegisterPayload(payload);
  if (!isValid) return json({ message: "입력값 유효성 검증에 실패했습니다.", errors }, 400);

  const existing = await User.findOne({ email: sanitized.email }).select("+passwordHash").lean();
  if (existing) {
    const canUpgradeToLocal = !isLocalAuthEnabled(existing);
    if (!canUpgradeToLocal) return json({ message: "이미 가입된 이메일입니다." }, 409);

    const passwordHash = await bcrypt.hash(sanitized.password, 12);
    const updated = await User.findByIdAndUpdate(
      existing._id,
      {
        $set: {
          name: sanitized.name,
          passwordHash,
          birthDate: sanitized.birthDate,
          birthTime: sanitized.birthTime,
          gender: sanitized.gender,
          localAuth: { enabled: true, activatedAt: new Date() },
        },
      },
      { new: true },
    ).lean();

    const token = signToken(updated);
    return json({ message: "소셜 계정에 로컬 로그인 수단이 추가되었습니다.", token, user: normalizeUserResponse(updated) }, 200);
  }

  const passwordHash = await bcrypt.hash(sanitized.password, 12);
  const created = await User.create({
    name: sanitized.name,
    email: sanitized.email,
    passwordHash,
    birthDate: sanitized.birthDate,
    birthTime: sanitized.birthTime,
    gender: sanitized.gender,
    role: "user",
    joinedAt: new Date(),
    localAuth: { enabled: true, activatedAt: new Date() },
  });

  const token = signToken(created);
  return json({ message: "회원가입이 완료되었습니다.", token, user: normalizeUserResponse(created) }, 201);
}

async function handleLogin(request) {
  const payload = await request.json();
  const { isValid, errors, sanitized } = validateLoginPayload(payload);
  if (!isValid) return json({ message: "입력값 유효성 검증에 실패했습니다.", errors }, 400);

  const user = await User.findOne({ email: sanitized.email }).select("+passwordHash").lean();
  if (!user) return json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." }, 401);
  if (!isLocalAuthEnabled(user) || !user.passwordHash) {
    return json({ message: "이 계정은 소셜 로그인으로 가입되었습니다. 소셜 로그인 또는 회원가입에서 로컬 로그인 추가를 진행해 주세요." }, 409);
  }

  const isPasswordValid = await bcrypt.compare(sanitized.password, user.passwordHash);
  if (!isPasswordValid) return json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." }, 401);

  const token = signToken(user);
  return json({ message: "로그인에 성공했습니다.", token, user: normalizeUserResponse(user) }, 200);
}

async function handleMe(request) {
  const token = getAuthToken(request);
  if (!token) return json({ message: "인증 토큰이 필요합니다." }, 401);

  let auth;
  try {
    auth = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
  } catch {
    return json({ message: "유효하지 않거나 만료된 토큰입니다." }, 401);
  }

  const user = await User.findById(auth.userId).lean();
  if (!user) return json({ message: "사용자 정보를 찾을 수 없습니다." }, 404);
  return json({ message: "인증 사용자 조회에 성공했습니다.", user: normalizeUserResponse(user) }, 200);
}

function handleLogout() {
  const response = json({ message: "로그아웃되었습니다." }, 200);
  response.cookies.set("fortune_auth_token", "", { path: "/", maxAge: 0 });
  response.cookies.set("fortune_auth_role", "", { path: "/", maxAge: 0 });
  return response;
}

function handleOAuthStart(request, provider) {
  if (!OAUTH_PROVIDERS.includes(provider)) {
    return json({ message: "지원하지 않는 소셜 로그인입니다." }, 400);
  }

  const cfg = buildProviderConfig(provider, request);
  if (!cfg.clientId || ((provider === "google" || provider === "naver") && !cfg.clientSecret)) {
    return json({ message: "소셜 로그인 서버 설정이 누락되었습니다." }, 500);
  }

  const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get("next")) || "/";
  const flow = sanitizeAuthFlow(request.nextUrl.searchParams.get("flow"));
  const frontendBase = getFrontendBaseUrl();
  const stateToken = signSocialState({ provider, nextPath, frontendBase, flow });

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: cfg.scope,
    state: stateToken,
  });

  return NextResponse.redirect(`${cfg.authorizationEndpoint}?${params.toString()}`);
}

async function handleOAuthCallback(request, provider) {
  const frontendBase = getFrontendBaseUrl();
  const fallbackRedirect = `${frontendBase}/login?social_error=oauth_callback_failed`;

  if (!OAUTH_PROVIDERS.includes(provider)) {
    return NextResponse.redirect(`${frontendBase}/login?social_error=unsupported_provider`);
  }

  try {
    const stateRaw = String(request.nextUrl.searchParams.get("state") || "");
    const code = String(request.nextUrl.searchParams.get("code") || "");
    const oauthError = String(request.nextUrl.searchParams.get("error") || "");

    if (oauthError) {
      return NextResponse.redirect(`${frontendBase}/login?social_error=${encodeURIComponent(oauthError)}`);
    }
    if (!stateRaw || !code) {
      return NextResponse.redirect(`${frontendBase}/login?social_error=invalid_callback`);
    }

    const statePayload = verifySocialState(stateRaw);
    if (statePayload.provider !== provider) {
      return NextResponse.redirect(`${frontendBase}/login?social_error=provider_mismatch`);
    }

    const flow = sanitizeAuthFlow(statePayload.flow);
    const redirectPath = flow === "signup" ? "/signup" : "/login";

    const accessToken = await exchangeCodeForAccessToken(provider, code, request, stateRaw);
    const socialProfile = await fetchSocialProfile(provider, accessToken, request);
    const user = await findOrCreateSocialUser(provider, socialProfile);

    const grant = signSocialGrant({
      userId: String(user._id),
      provider,
      nextPath: sanitizeNextPath(statePayload.nextPath) || "/",
    });

    const redirectParams = new URLSearchParams({ social_grant: grant });
    if (statePayload.nextPath) redirectParams.set("next", statePayload.nextPath);

    return NextResponse.redirect(`${frontendBase}${redirectPath}?${redirectParams.toString()}`);
  } catch {
    return NextResponse.redirect(fallbackRedirect);
  }
}

async function handleOAuthComplete(request) {
  const payload = await request.json();
  const socialGrant = String(payload?.socialGrant || "");
  if (!socialGrant) return json({ message: "소셜 인증 정보가 없습니다." }, 400);

  try {
    const grantPayload = verifySocialGrant(socialGrant);
    const user = await User.findById(grantPayload.userId).lean();
    if (!user) return json({ message: "사용자 정보를 찾을 수 없습니다." }, 404);

    const token = signToken(user);
    return json({
      message: "소셜 로그인에 성공했습니다.",
      token,
      user: normalizeUserResponse(user),
      nextPath: sanitizeNextPath(grantPayload.nextPath) || "/",
      provider: grantPayload.provider,
    }, 200);
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      return json({ message: "소셜 인증이 만료되었습니다. 다시 시도해 주세요." }, 401);
    }
    return json({ message: "소셜 인증 처리 중 오류가 발생했습니다." }, 500);
  }
}

async function routeRequest(request) {
  await connectDB();

  const pathSegments = request.nextUrl.pathname.split("/").filter(Boolean);
  const authSegments = pathSegments.slice(2); // api/auth/...
  const method = request.method.toUpperCase();

  if (authSegments.length === 1 && authSegments[0] === "register" && method === "POST") {
    return handleRegister(request);
  }

  if (authSegments.length === 1 && authSegments[0] === "login" && method === "POST") {
    return handleLogin(request);
  }

  if (authSegments.length === 1 && authSegments[0] === "me" && method === "GET") {
    return handleMe(request);
  }

  if (authSegments.length === 1 && authSegments[0] === "logout" && method === "POST") {
    return handleLogout();
  }

  if (authSegments.length === 2 && authSegments[0] === "oauth" && authSegments[1] === "complete" && method === "POST") {
    return handleOAuthComplete(request);
  }

  if (authSegments.length === 3 && authSegments[0] === "oauth" && authSegments[2] === "start" && method === "GET") {
    return handleOAuthStart(request, String(authSegments[1] || "").toLowerCase());
  }

  if (authSegments.length === 3 && authSegments[0] === "oauth" && authSegments[2] === "callback" && method === "GET") {
    return handleOAuthCallback(request, String(authSegments[1] || "").toLowerCase());
  }

  return json({ message: "요청한 API 경로를 찾을 수 없습니다." }, 404);
}

export async function GET(request) {
  try {
    return await routeRequest(request);
  } catch (error) {
    return json({ message: error?.message || "서버 내부 오류가 발생했습니다." }, 500);
  }
}

export async function POST(request) {
  try {
    return await routeRequest(request);
  } catch (error) {
    return json({ message: error?.message || "서버 내부 오류가 발생했습니다." }, 500);
  }
}
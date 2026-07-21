import { connectDb, mongoose, resetMongooseConnection, resolveMongoDbName, withMongoRetry } from "../lib/db.js";
import { MonthlyCreditLedger, PointHistory, RefreshTokenSession, User } from "../lib/models.js";
import { MONTHLY_CREDIT_TTL_MS } from "../lib/monthly-credit-lots.js";
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
  isAuthDbInfraError,
  requireAuth,
  requireUserFromRequest,
  normalizeUserResponse,
  signAuthToken,
  JWT_ISSUER,
} from "../lib/auth.js";
import { getRequestMeta, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson, redirect } from "../lib/http.js";
import { buildConfigErrorBody, evaluateFeatureKeyHealth } from "../lib/key-health.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { validateLoginPayload, validateRegisterPayload } from "../lib/validation.js";
import { clearRateLimit, incrementRateLimit, readRateLimitState } from "../lib/rate-limit.js";
import { Buffer } from "node:buffer";
import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

const OAUTH_PROVIDERS = ["google", "naver", "kakao"];
const SOCIAL_GRANT_EXPIRES_IN_SEC = 180;
const CSRF_COOKIE_NAME = "cd_csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const REFRESH_COOKIE_PRIMARY_PATH = "/";
const REFRESH_COOKIE_LEGACY_PATH = "/api/auth/refresh";
const EXTRA_AUTH_CLEAR_COOKIE_NAMES = [
  "fortune_auth_role",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
];
const CSRF_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;
const WITHDRAW_RATE_LIMIT_MAX = 3;
const WITHDRAW_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const LOGIN_RATE_LIMIT_DEFAULT_MAX = 20;
const LOGIN_RATE_LIMIT_DEFAULT_WINDOW_MS = 60 * 1000;
const SIGNUP_MONTHLY_CREDIT_GRANT = 500;
const REFERRAL_REWARD_MONTHLY_CREDIT = 100;
const REFERRAL_DAILY_MONTHLY_CREDIT_CAP = 500;
const withdrawRateLimitMap = new Map();
const loginRateLimitMap = new Map();
const OAUTH_CODE_GUARD_TTL_MS = 10 * 60 * 1000;
const OAUTH_CODE_EXCHANGE_GUARDS = new Map();

function buildSignupProfileSubscription(now = new Date()) {
  const grantedAt = now instanceof Date ? now : new Date(now);
  return {
    tier: "free",
    source: "event",
    membershipCreditBalance: SIGNUP_MONTHLY_CREDIT_GRANT,
    membershipCreditGranted: SIGNUP_MONTHLY_CREDIT_GRANT,
    membershipCreditUsed: 0,
    // 월정석은 지급일로부터 30일간만 유효 — 가입 지급분을 lot으로 기록(지급일+30일 소멸).
    membershipCreditLots: [{
      lotId: "signup",
      amount: SIGNUP_MONTHLY_CREDIT_GRANT,
      remaining: SIGNUP_MONTHLY_CREDIT_GRANT,
      grantedAt,
      expiresAt: new Date(grantedAt.getTime() + MONTHLY_CREDIT_TTL_MS),
    }],
    membershipCreditLotsVersion: 0,
    signupMembershipCreditGrantedAt: now,
    legacyCoinCreditSeeded: true,
    legacyCoinCreditSeededPoints: 0,
  };
}

async function recordMonthlyCreditGrantLedger({
  userId,
  amount,
  beforeBalance,
  afterBalance,
  reason,
  sourceId,
  serviceKey,
  metadata,
}) {
  const normalizedAmount = Math.max(0, Math.floor(Number(amount || 0)));
  const normalizedSourceId = String(sourceId || "").trim().slice(0, 180);
  if (!userId || normalizedAmount <= 0 || !normalizedSourceId) return;

  try {
    await MonthlyCreditLedger.updateOne(
      {
        userId,
        type: "MONTHLY_CREDIT_GRANT",
        sourceId: normalizedSourceId,
      },
      {
        $setOnInsert: {
          userId,
          type: "MONTHLY_CREDIT_GRANT",
          amount: normalizedAmount,
          beforeBalance: Math.max(0, Math.floor(Number(beforeBalance || 0))),
          afterBalance: Math.max(0, Math.floor(Number(afterBalance || normalizedAmount))),
          reason: String(reason || "monthly_credit_grant").trim(),
          sourceId: normalizedSourceId,
          serviceKey: String(serviceKey || "").trim().slice(0, 120),
          profileId: "",
          metadata: metadata || null,
        },
      },
      { upsert: true },
    );
  } catch (error) {
    console.error("[auth/monthly-credit-ledger] grant insert failed:", error);
  }
}

function normalizeReferralCode(rawCode) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!code || code.length < 6 || code.length > 24) return "";
  if (!/^[A-Z0-9_-]+$/.test(code)) return "";
  return code;
}

function normalizeReferralShareToken(rawToken) {
  const token = String(rawToken || "").trim();
  if (!token || token.length < 24 || token.length > 1800) return "";
  return token;
}

function extractReferralCapture(source = {}) {
  return {
    referralCode: normalizeReferralCode(source.referralCode || source.ref || source.pendingReferralCode),
    referralShareToken: normalizeReferralShareToken(
      source.referralShareToken || source.rs || source.referralToken || source.pendingReferralShareToken,
    ),
    referralSource: String(source.referralSource || source.via || "").trim().toLowerCase(),
  };
}

function generateReferralCode() {
  return `CD${randomBytes(7).toString("hex").toUpperCase()}`;
}

function unwrapFindOneAndUpdateResult(result) {
  if (result && Object.prototype.hasOwnProperty.call(result, "value")) return result.value;
  return result;
}

async function createUniqueReferralCode(dbMaxTimeMs = 8000) {
  for (let i = 0; i < 8; i += 1) {
    const code = generateReferralCode();
    const existing = await User.collection.findOne(
      { referralCode: code },
      { projection: { _id: 1 }, maxTimeMS: dbMaxTimeMs },
    );
    if (!existing) return code;
  }
  throw new Error("referral_code_generation_failed");
}

function resolveKakaoJavascriptKey(env) {
  return String(
    getEnv(env, "NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY")
      || getEnv(env, "KAKAO_JAVASCRIPT_KEY")
      || getEnv(env, "KAKAO_PLATFORM_KEY")
      || "",
  ).trim();
}

async function signReferralShareToken(referrerUserId, referralCode, env) {
  return signJwt(
    {
      purpose: "kakao-referral-share",
      referrerUserId: String(referrerUserId || ""),
      referralCode,
      channel: "kakao",
      rewardMonthlyCredit: REFERRAL_REWARD_MONTHLY_CREDIT,
    },
    getAccessTokenSecret(env),
    { expiresIn: "30d", issuer: JWT_ISSUER },
  );
}

async function verifyReferralShareToken(referralCode, token, env) {
  const payload = await verifyJwt(token, getAccessTokenSecret(env), { issuer: JWT_ISSUER });
  if (!payload || payload.purpose !== "kakao-referral-share") return null;
  if (String(payload.channel || "") !== "kakao") return null;
  if (normalizeReferralCode(payload.referralCode) !== referralCode) return null;
  if (!mongoose.Types.ObjectId.isValid(String(payload.referrerUserId || ""))) return null;
  return {
    referrerUserId: String(payload.referrerUserId),
    referralCode,
  };
}

async function ensureReferralCodeForUser(user, env, dbMaxTimeMs = 8000) {
  const existingCode = normalizeReferralCode(user?.referralCode);
  if (existingCode) return existingCode;

  const userId = String(user?._id || "");
  if (!mongoose.Types.ObjectId.isValid(userId)) throw new Error("invalid_user_id");
  const objectId = new mongoose.Types.ObjectId(userId);
  const now = new Date();

  const code = await createUniqueReferralCode(dbMaxTimeMs);
  const updatedResult = await User.collection.findOneAndUpdate(
    {
      _id: objectId,
      $or: [
        { referralCode: { $exists: false } },
        { referralCode: "" },
        { referralCode: null },
      ],
    },
    {
      $set: {
        referralCode: code,
        referralCodeCreatedAt: now,
        "referralProgram.kakaoShareRewardEnabled": true,
        "referralProgram.kakaoShareLastPreparedAt": now,
      },
    },
    {
      returnDocument: "after",
      projection: { referralCode: 1 },
      maxTimeMS: dbMaxTimeMs,
    },
  );
  const updated = unwrapFindOneAndUpdateResult(updatedResult);

  const updatedCode = normalizeReferralCode(updated?.referralCode);
  if (updatedCode) return updatedCode;

  const refreshed = await User.collection.findOne(
    { _id: objectId },
    { projection: { referralCode: 1 }, maxTimeMS: dbMaxTimeMs },
  );
  const refreshedCode = normalizeReferralCode(refreshed?.referralCode);
  if (refreshedCode) return refreshedCode;
  throw new Error("referral_code_generation_failed");
}

function resolveReferralFrontendBaseUrl(request, env) {
  const requestOrigin = getRequestOrigin(request);
  if (requestOrigin && !isWorkersDevOrigin(requestOrigin)) return requestOrigin;

  const configured = normalizeOriginOnly(getFrontendBaseUrl(env));
  if (configured && !isWorkersDevOrigin(configured) && !isLocalHostname(new URL(configured).hostname)) return configured;

  return "https://code-destiny.com";
}

function buildReferralShareUrl(request, env, referralCode, referralShareToken) {
  const base = String(resolveReferralFrontendBaseUrl(request, env) || "https://code-destiny.com").replace(/\/+$/, "");
  const url = new URL(base || "https://code-destiny.com");
  url.searchParams.set("ref", referralCode);
  url.searchParams.set("rs", referralShareToken);
  url.searchParams.set("via", "kakao_reward");
  return url.toString();
}

function getKstDayKey(date = new Date()) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function applyKakaoReferralReward(request, env, newUser, referralCapture = {}) {
  const referralCode = normalizeReferralCode(referralCapture.referralCode);
  const referralShareToken = normalizeReferralShareToken(referralCapture.referralShareToken);
  if (!referralCode || !referralShareToken) return null;

  let verified;
  try {
    verified = await verifyReferralShareToken(referralCode, referralShareToken, env);
  } catch (error) {
    verified = null;
  }
  if (!verified) {
    return { status: "invalid_share_token", referralCode, rewardMonthlyCredit: 0 };
  }

  const newUserId = String(newUser?._id || "");
  if (!mongoose.Types.ObjectId.isValid(newUserId)) return { status: "invalid_new_user", referralCode, rewardMonthlyCredit: 0 };
  if (newUserId === verified.referrerUserId) return { status: "self_referral_blocked", referralCode, rewardMonthlyCredit: 0 };

  const now = new Date();
  const dayKey = getKstDayKey(now);
  const users = User.collection;
  const newUserObjectId = new mongoose.Types.ObjectId(newUserId);
  const referrerObjectId = new mongoose.Types.ObjectId(verified.referrerUserId);

  const refereeClaimResult = await users.findOneAndUpdate(
    {
      _id: newUserObjectId,
      $or: [
        { "referralReward.status": { $exists: false } },
        { "referralReward.status": "" },
        { "referralReward.status": null },
      ],
    },
    {
      $set: {
        "referralReward.status": "pending",
        "referralReward.channel": "kakao",
        "referralReward.referralCode": referralCode,
        "referralReward.inviterUserId": verified.referrerUserId,
        "referralReward.capturedAt": now,
      },
    },
    {
      returnDocument: "after",
      projection: { _id: 1, referralReward: 1 },
    },
  );
  const refereeClaim = unwrapFindOneAndUpdateResult(refereeClaimResult);
  if (!refereeClaim) return { status: "already_processed", referralCode, rewardMonthlyCredit: 0 };

  const dailyCreditBase = {
    $cond: [
      { $eq: ["$referralProgram.rewardDayKey", dayKey] },
      { $ifNull: ["$referralProgram.rewardedToday", 0] },
      0,
    ],
  };
  const referrerResult = await users.findOneAndUpdate(
    {
      _id: referrerObjectId,
      referralCode,
      // Withdrawn accounts must not collect referral rewards. $ne (not $eq "active")
      // keeps legacy docs that predate the status field eligible.
      status: { $ne: "withdrawn" },
      "referralProgram.kakaoShareRewardEnabled": true,
      $expr: {
        $lte: [
          dailyCreditBase,
          REFERRAL_DAILY_MONTHLY_CREDIT_CAP - REFERRAL_REWARD_MONTHLY_CREDIT,
        ],
      },
    },
    [
      { $set: { _referralRewardDailyBase: dailyCreditBase } },
      {
        $set: {
          "profileSubscription.tier": { $ifNull: ["$profileSubscription.tier", "free"] },
          "profileSubscription.source": { $ifNull: ["$profileSubscription.source", "event"] },
          "profileSubscription.membershipCreditBalance": {
            $add: [
              { $ifNull: ["$profileSubscription.membershipCreditBalance", 0] },
              REFERRAL_REWARD_MONTHLY_CREDIT,
            ],
          },
          "profileSubscription.membershipCreditGranted": {
            $add: [
              { $ifNull: ["$profileSubscription.membershipCreditGranted", 0] },
              REFERRAL_REWARD_MONTHLY_CREDIT,
            ],
          },
          // 추천 보상 월정석도 지급일+30일에 개별 소멸하는 lot으로 적립(피추천인당 1 lot, 멱등키 = referee id).
          "profileSubscription.membershipCreditLots": {
            $concatArrays: [
              { $ifNull: ["$profileSubscription.membershipCreditLots", []] },
              [{
                lotId: `referral:${String(newUserObjectId)}`,
                amount: REFERRAL_REWARD_MONTHLY_CREDIT,
                remaining: REFERRAL_REWARD_MONTHLY_CREDIT,
                grantedAt: now,
                expiresAt: new Date(now.getTime() + MONTHLY_CREDIT_TTL_MS),
              }],
            ],
          },
          "referralProgram.rewardDayKey": dayKey,
          "referralProgram.rewardedToday": {
            $add: ["$_referralRewardDailyBase", REFERRAL_REWARD_MONTHLY_CREDIT],
          },
          "referralProgram.totalRewardCredit": {
            $add: [
              { $ifNull: ["$referralProgram.totalRewardCredit", 0] },
              REFERRAL_REWARD_MONTHLY_CREDIT,
            ],
          },
          "referralProgram.lastRewardedAt": now,
        },
      },
      { $unset: "_referralRewardDailyBase" },
    ],
    {
      returnDocument: "after",
      projection: {
        _id: 1,
        profileSubscription: 1,
        referralProgram: 1,
      },
    },
  );
  const referrer = unwrapFindOneAndUpdateResult(referrerResult);

  if (!referrer) {
    await users.updateOne(
      { _id: newUserObjectId, "referralReward.status": "pending" },
      {
        $set: {
          "referralReward.status": "daily_cap_or_referrer_invalid",
          "referralReward.completedAt": now,
          "referralReward.rewardMonthlyCredit": 0,
        },
      },
    );
    return { status: "daily_cap_or_referrer_invalid", referralCode, rewardMonthlyCredit: 0 };
  }

  const balanceAfter = Number(referrer?.profileSubscription?.membershipCreditBalance || 0);
  await users.updateOne(
    { _id: newUserObjectId, "referralReward.status": "pending" },
    {
      $set: {
        "referralReward.status": "rewarded",
        "referralReward.completedAt": now,
        "referralReward.rewardMonthlyCredit": REFERRAL_REWARD_MONTHLY_CREDIT,
      },
    },
  );

  try {
    await PointHistory.create({
      userId: referrerObjectId,
      kind: "share_reward",
      delta: REFERRAL_REWARD_MONTHLY_CREDIT,
      balanceAfter,
      reason: "카카오 공유 추천 가입 보상",
      featureKey: "referral_signup_kakao",
      metadata: {
        rewardType: "membership_credit",
        channel: "kakao",
        referralCode,
        referredUserId: newUserId,
        dailyCap: REFERRAL_DAILY_MONTHLY_CREDIT_CAP,
        shareOnly: true,
        requestMeta: getRequestMeta(request),
      },
    });
  } catch (error) {
    console.error("[auth/referral] point history insert failed:", error);
  }

  await recordMonthlyCreditGrantLedger({
    userId: referrerObjectId,
    amount: REFERRAL_REWARD_MONTHLY_CREDIT,
    beforeBalance: Math.max(0, balanceAfter - REFERRAL_REWARD_MONTHLY_CREDIT),
    afterBalance: balanceAfter,
    reason: "카카오 공유 추천 가입 보상",
    sourceId: `referral_signup_kakao:${newUserId}`,
    serviceKey: "referral_signup_kakao",
    metadata: {
      grantType: "referral",
      channel: "kakao",
      referralCode,
      referredUserId: newUserId,
      dailyCap: REFERRAL_DAILY_MONTHLY_CREDIT_CAP,
      shareOnly: true,
      requestMeta: getRequestMeta(request),
    },
  });

  return {
    status: "rewarded",
    referralCode,
    rewardMonthlyCredit: REFERRAL_REWARD_MONTHLY_CREDIT,
    dailyCap: REFERRAL_DAILY_MONTHLY_CREDIT_CAP,
    referrerBalanceAfter: balanceAfter,
  };
}

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

function getRequestHostname(request) {
  try {
    const requestUrl = new URL(request.url);
    const forwardedHost = String(request.headers.get("x-forwarded-host") || "").trim();
    const host = String(forwardedHost || request.headers.get("host") || requestUrl.host || "").split(":")[0];
    return host || requestUrl.hostname;
  } catch (e) {
    return "";
  }
}

function isLocalDevAuthEnabled(request, env) {
  if (!isTrueLike(getEnv(env, "LOCAL_DEV_AUTH_ENABLED", ""))) return false;
  return isLocalHostname(getRequestHostname(request));
}

function getLocalDevAuthConfig(env) {
  const configuredId = String(getEnv(env, "LOCAL_DEV_AUTH_USER_ID", "") || "").trim();
  const userId = mongoose.Types.ObjectId.isValid(configuredId)
    ? configuredId
    : "000000000000000000000001";
  const rawPoints = String(getEnv(env, "LOCAL_DEV_AUTH_POINTS", "") || "").trim();
  const parsedPoints = rawPoints ? Number(rawPoints) : NaN;

  return {
    email: String(getEnv(env, "LOCAL_DEV_AUTH_EMAIL", "") || "local-login-test@example.com").trim().toLowerCase(),
    password: String(getEnv(env, "LOCAL_DEV_AUTH_PASSWORD", "") || "LocalTest!2026").trim(),
    userId,
    name: String(getEnv(env, "LOCAL_DEV_AUTH_NAME", "") || "Local Login Test").trim(),
    points: Number.isFinite(parsedPoints)
      ? Math.max(0, Math.floor(parsedPoints))
      : 9999,
  };
}

function timingSafeTextEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function resolveLocalDevAuthUser(request, env, email, password) {
  if (!isLocalDevAuthEnabled(request, env)) return null;
  const config = getLocalDevAuthConfig(env);
  if (String(email || "").trim().toLowerCase() !== config.email) return null;
  if (!config.password || !timingSafeTextEqual(password, config.password)) return null;

  return buildLocalDevAuthUser(config);
}

function buildLocalDevAuthUser(config) {
  return {
    _id: config.userId,
    name: config.name,
    email: config.email,
    birthDate: "1990-01-01",
    birthTime: "09:00",
    gender: "OTHER",
    role: "user",
    points: config.points,
    joinedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    localAuth: {
      enabled: true,
    },
  };
}

function isLocalDevAuthTokenUser(request, env, auth) {
  if (!isLocalDevAuthEnabled(request, env)) return false;
  const config = getLocalDevAuthConfig(env);
  return String(auth?.userId || "") === config.userId
    && String(auth?.email || "").trim().toLowerCase() === config.email;
}

function isLocalDevAuthRoute(request, env, method, path) {
  if (!isLocalDevAuthEnabled(request, env)) return false;
  return method === "POST" && path === "/login";
}

function resolveCookieSecure(request, env) {
  const requestUrl = new URL(request.url);
  const forwardedProto = String(request.headers.get("x-forwarded-proto") || "").trim().toLowerCase();
  const proto = forwardedProto || requestUrl.protocol.replace(":", "");
  const host = getRequestHostname(request);
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
  if (options.domain) pieces.push(`Domain=${options.domain}`);
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

function normalizeCookieDomain(rawValue) {
  const value = String(rawValue || "").trim().replace(/^\./, "").toLowerCase();
  if (!value || value === "localhost" || value.includes(":")) return "";
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) return "";
  return value;
}

function resolveCookieClearDomains(request, env) {
  const domains = new Set();
  const configured = normalizeCookieDomain(getEnv(env, "AUTH_COOKIE_DOMAIN") || getEnv(env, "COOKIE_DOMAIN"));
  if (configured) domains.add(configured);

  try {
    const host = normalizeCookieDomain(new URL(request.url).hostname.replace(/^www\./i, ""));
    if (host === "code-destiny.com" || host.endsWith(".code-destiny.com")) {
      domains.add("code-destiny.com");
    }
  } catch (e) {
    void e;
  }

  return Array.from(domains).flatMap((domain) => [domain, `.${domain}`]);
}

function appendClearCookie(response, name, options = {}) {
  response.headers.append("Set-Cookie", buildCookieValue(name, "", options));
  if (String(name || "").startsWith("__Host-")) return;
  for (const domain of options.clearDomains || []) {
    response.headers.append("Set-Cookie", buildCookieValue(name, "", {
      ...options,
      domain,
    }));
  }
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

function appendAuthRoleCookie(response, request, env, user) {
  const cookieOptions = buildAuthCookieOptions(request, env);
  const role = String(user?.role || "user").trim() || "user";
  response.headers.append("Set-Cookie", buildCookieValue("fortune_auth_role", role, {
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
  }));
}

function appendClearAuthCookies(response, request, env) {
  const cookieOptions = buildAuthCookieOptions(request, env);
  const clearDomains = resolveCookieClearDomains(request, env);
  appendClearCookie(response, ACCESS_COOKIE_NAME, {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    clearDomains,
  });
  appendClearCookie(response, REFRESH_COOKIE_NAME, {
    path: REFRESH_COOKIE_PRIMARY_PATH,
    maxAge: 0,
    httpOnly: true,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    clearDomains,
  });
  appendClearCookie(response, REFRESH_COOKIE_NAME, {
    path: REFRESH_COOKIE_LEGACY_PATH,
    maxAge: 0,
    httpOnly: true,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    clearDomains,
  });
  for (const cookieName of EXTRA_AUTH_CLEAR_COOKIE_NAMES) {
    appendClearCookie(response, cookieName, {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      clearDomains,
    });
  }
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

function refreshSessionMatchesRequest(session, request) {
  const storedUserAgent = String(session?.userAgent || "").trim();
  if (!storedUserAgent) return true;
  const currentUserAgent = String(getRequestMeta(request).userAgent || "").trim();
  if (!currentUserAgent) return true;
  return storedUserAgent === currentUserAgent;
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
    hasNaverClientId: Boolean(getEnv(env, "NAVER_OAUTH_CLIENT_ID") || getEnv(env, "NAVER_CLIENT_ID")),
    hasNaverClientSecret: Boolean(getEnv(env, "NAVER_OAUTH_CLIENT_SECRET") || getEnv(env, "NAVER_CLIENT_SECRET")),
    hasKakaoClientId: Boolean(getEnv(env, "KAKAO_OAUTH_CLIENT_ID") || getEnv(env, "KAKAO_CLIENT_ID")),
    hasKakaoClientSecret: Boolean(getEnv(env, "KAKAO_OAUTH_CLIENT_SECRET") || getEnv(env, "KAKAO_CLIENT_SECRET")),
    hasMongoUri: Boolean(getEnv(env, "MONGO_URI") || getEnv(env, "MONGODB_URI")),
  };
}

function getRequestHost(request) {
  try {
    return String(new URL(request.url).host || "");
  } catch (e) {
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
  } catch (e) {
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

// 회전 claim은 됐지만 replacedByTokenHash 기록이 아직 안 끝난 아주 짧은 구간(형제 탭이
// 회전을 완료 중) — 이 구간 안의 재생은 탈취 재사용이 아니라 동시 새로고침으로 간주한다.
const REFRESH_IN_FLIGHT_ROTATION_TOLERANCE_MS = 3000;

// refresh 토큰 회전 grace window — 방금 회전된 토큰이 이 시간 이내에 재생되면
// 멀티탭 동시 회전으로 간주해 전 세션 폐기 대신 정상 처리한다. (기본 30초)
function getRefreshReuseGraceMs(env) {
  const raw = Number(getEnv(env, "AUTH_REFRESH_REUSE_GRACE_MS", "30000"));
  if (!Number.isFinite(raw) || raw < 0) return 30000;
  return Math.min(Math.floor(raw), 5 * 60 * 1000);
}

function getAuthConnectTimeoutMs(env) {
  const authTimeoutMs = getAuthOpTimeoutMs(env);
  const guardTimeoutMs = Number(getEnv(env, "MONGO_WORKER_CONNECT_GUARD_MS", "10000"));
  const serverSelectionTimeoutMs = Number(getEnv(env, "MONGO_SERVER_SELECTION_TIMEOUT_MS", "8000"));
  return Math.max(
    authTimeoutMs,
    Number.isFinite(guardTimeoutMs) ? guardTimeoutMs + 5000 : 15000,
    Number.isFinite(serverSelectionTimeoutMs) ? serverSelectionTimeoutMs + 7000 : 15000,
  );
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

async function withOptionalAuthSideEffect(task, timeoutMs, label, fallback = null) {
  try {
    return await withAuthOpTimeout(task, timeoutMs, label);
  } catch (error) {
    console.warn(`[auth/side-effect] ${label} skipped:`, error);
    return fallback;
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
  } catch (e) {
    return "";
  }
}

function isLocalOrigin(origin) {
  try {
    return isLocalHostname(new URL(origin).hostname);
  } catch (e) {
    return false;
  }
}

function getHeaderOrigin(request, headerName) {
  return normalizeOriginOnly(request.headers.get(headerName));
}

function getOAuthFrontendBaseUrl(request, env) {
  const requestOrigin = getRequestOrigin(request);
  const refererOrigin = getHeaderOrigin(request, "referer");

  if (isLocalOrigin(requestOrigin) && isLocalOrigin(refererOrigin)) {
    return refererOrigin;
  }

  return getFrontendBaseUrl(env);
}

function getAllowedAuthOrigins(request, env) {
  return new Set([
    getRequestOrigin(request),
    getFrontendBaseUrl(env),
    getApiBaseUrl(request, env),
    normalizeOriginOnly(getEnv(env, "AUTH_URL") || getEnv(env, "NEXTAUTH_URL")),
    normalizeOriginOnly(getEnv(env, "AUTH_FRONTEND_BASE_URL")),
    normalizeOriginOnly(getEnv(env, "AUTH_API_BASE_URL")),
    normalizeOriginOnly(getEnv(env, "SITE_BASE_URL")),
  ].filter(Boolean));
}

function requiresSameOriginAuthGuard(method, path) {
  const normalizedMethod = String(method || "").toUpperCase();
  if (!["POST", "PATCH", "DELETE"].includes(normalizedMethod)) return false;
  return path === "/refresh"
    || path === "/logout"
    || path === "/withdraw"
    || path === "/oauth/complete"
    || path === "/referral/kakao-share"
    || path === "/me/phone-number"
    || path === "/me/payment-phone";
}

// Capacitor 앱은 https://localhost 출처에서 이 API를 호출한다. 브라우저는 이걸 교차 사이트로
// 보고 언제나 sec-fetch-site: cross-site 를 붙이므로, 아래 가드에 그대로 걸려 403 이 났다
// — 로그인(/oauth/complete)뿐 아니라 로그아웃·세션갱신·탈퇴·전화번호 수정까지 전부.
//
// CSRF 는 "브라우저가 요청에 자동으로 실어보내는 쿠키 세션"을 악용하는 공격이다. 앱은 쿠키가
// 아니라 localStorage 의 Bearer 토큰으로 인증하므로 앰비언트 크리덴셜이 없고, 애초에
// SameSite=Lax 라 앱 출처로는 세션 쿠키가 나가지도 않는다. 즉 이 공격 모델이 성립하지 않는다.
// 그래서 앱 출처와 앱 런타임 헤더가 "둘 다" 맞을 때만 면제한다.
// 웹 오리진 경로는 손대지 않는다 — 거기서 넓히면 진짜 쿠키 세션이 노출된다.
const MOBILE_APP_REQUEST_ORIGINS = new Set(["https://localhost"]);

function isMobileAppAuthRequest(request) {
  const runtime = String(request.headers.get("x-code-destiny-runtime") || "").trim().toLowerCase();
  if (runtime !== "mobile-app") return false;
  const origin = normalizeOriginOnly(request.headers.get("origin"));
  return Boolean(origin) && MOBILE_APP_REQUEST_ORIGINS.has(origin);
}

// 같은 이유(SameSite=Lax)로 앱은 리프레시 쿠키를 받지도, 되돌려 보내지도 못한다. 그래서
// handleRefresh 가 쿠키만 읽던 동안 앱은 액세스 토큰(기본 30분)이 만료되면 되살릴 방법이
// 없어 세션이 그대로 끊겼다. 쿠키를 쓸 수 없는 앱에 한해 같은 리프레시 토큰을 JSON 본문으로
// 내려주고 이 헤더로 되돌려 받는다 — 회전·재사용 탐지·세션 폐기는 기존 경로를 그대로 탄다.
// 웹은 이 분기에 들어오지 않으므로 쿠키 전용 동작이 그대로 유지된다.
const APP_REFRESH_TOKEN_HEADER = "x-code-destiny-refresh-token";

function appRefreshTokenField(request, refreshToken) {
  if (!refreshToken || !isMobileAppAuthRequest(request)) return {};
  return { refreshToken };
}

function isAllowedSameOriginAuthRequest(request, env) {
  if (isMobileAppAuthRequest(request)) return true;

  const secFetchSite = String(request.headers.get("sec-fetch-site") || "").trim().toLowerCase();
  if (secFetchSite === "cross-site") return false;

  const origin = normalizeOriginOnly(request.headers.get("origin"));
  if (!origin) return true;

  return getAllowedAuthOrigins(request, env).has(origin);
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

function isUnsafeOAuthRedirectPath(pathname) {
  const path = String(pathname || "").split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return (
    path === "/login"
    || path.startsWith("/login/")
    || path === "/signup"
    || path.startsWith("/signup/")
    || path === "/auth"
    || path.startsWith("/auth/")
    || path === "/api/auth"
    || path.startsWith("/api/auth/")
  );
}

function sanitizeOAuthNextPath(rawNext) {
  const nextPath = sanitizeNextPath(rawNext);
  if (!nextPath || isUnsafeOAuthRedirectPath(nextPath)) return "/";
  return nextPath;
}

function sanitizeAppOAuthRedirect(rawRedirect) {
  const value = String(rawRedirect || "").trim();
  if (!value) return "";
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "com.codedestiny.app:" || parsed.host !== "auth") return "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch (e) {
    return "";
  }
}

function buildAppOAuthRedirect(appRedirect, params = {}) {
  const target = sanitizeAppOAuthRedirect(appRedirect);
  if (!target) return "";
  const url = new URL(target);
  Object.entries(params).forEach(([key, value]) => {
    const text = String(value || "");
    if (text) url.searchParams.set(key, text);
  });
  return url.toString();
}

/**
 * 앱 복귀를 302 대신 아주 작은 HTML 중계 페이지로 처리한다.
 *
 * 왜: Chrome 은 리다이렉트 체인 끝에서 사용자 제스처가 소모된 채 도착한 커스텀 스킴
 * (com.codedestiny.app://) 으로의 **서버 302 를 차단**하는 경우가 있다. 그러면 사용자는 커스텀탭 안
 * 웹페이지에 그대로 남아 "브라우저에서 로그인은 됐는데 앱은 로그아웃" 상태가 된다.
 * intent:// 형식은 Chrome 이 앱 실행용으로 특별 취급하므로 훨씬 확실하고,
 * 그마저 막히면 사용자가 직접 누르는 버튼(=새 제스처)이 마지막 안전망이 된다.
 *
 * appRedirect 가 있을 때만 쓰인다 — 웹 로그인 경로는 기존 302 그대로다.
 */
function buildAppOAuthHandoffResponse(appRedirectTarget) {
  const parsed = new URL(appRedirectTarget);
  // intent:// 는 '#' 부터를 Intent 파라미터로 읽는다. 쿼리에 '#' 이 섞이면 안 된다.
  const query = parsed.search.replace(/#/g, "%23");
  const intentUrl = `intent://${parsed.host}${parsed.pathname || ""}${query}`
    + "#Intent;scheme=com.codedestiny.app;package=com.codedestiny.app;end";
  const escapeForScript = (value) => JSON.stringify(String(value)).replace(/</g, "\\u003c");

  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>앱으로 돌아가는 중…</title>
<style>
html,body{margin:0;height:100%;background:#fffaf7;color:#3c1830;
font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif}
.wrap{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px;text-align:center}
h1{margin:0;font-size:17px;font-weight:800}
p{margin:0;font-size:13px;color:#70445c;line-height:1.6}
a.btn{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 28px;
border-radius:999px;background:#b31955;color:#fffaf7;font-size:15px;font-weight:800;text-decoration:none;
box-shadow:0 12px 24px rgba(179,25,85,.18)}
</style></head><body><div class="wrap">
<h1>로그인이 완료되었습니다</h1>
<p>앱으로 자동 전환됩니다.<br>화면이 바뀌지 않으면 아래 버튼을 눌러 주세요.</p>
<a class="btn" id="back" href="#">앱으로 돌아가기</a>
</div><script>
(function(){
  var intentUrl=${escapeForScript(intentUrl)};
  var schemeUrl=${escapeForScript(appRedirectTarget)};
  var btn=document.getElementById('back');
  if(btn)btn.setAttribute('href',intentUrl);
  try{location.replace(intentUrl);}catch(e){}
  setTimeout(function(){try{location.replace(schemeUrl);}catch(e){}},700);
}());
</script></body></html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // 인증 grant 가 실려 있으므로 어디에도 캐시하지 않는다.
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function buildOAuthFrontendUrl(frontendBase, nextPath = "/") {
  const base = String(frontendBase || "http://localhost:3000").replace(/\/+$/, "") || "http://localhost:3000";
  const safeNextPath = sanitizeOAuthNextPath(nextPath);
  try {
    return new URL(safeNextPath, `${base}/`).toString();
  } catch (e) {
    return `${base}/`;
  }
}

function buildOAuthFailureRedirect(frontendBase, provider, reason) {
  const loginUrl = new URL("/login", buildOAuthFrontendUrl(frontendBase, "/"));
  loginUrl.searchParams.set("authError", provider || "oauth");
  loginUrl.searchParams.set("social_error", String(reason || "oauth_failed").slice(0, 120));
  return redirect(loginUrl.toString());
}

function logKakaoCallbackMarker(request, provider, marker, extra = {}) {
  if (provider !== "kakao") return;
  const payload = {
    routePath: new URL(request.url).pathname,
    requestHost: getRequestHost(request),
    ...extra,
  };
  try {
    console.info(`[Kakao Callback] ${marker}`, JSON.stringify(payload));
  } catch (e) {
    console.info(`[Kakao Callback] ${marker}`);
  }
}

function cleanupOAuthCodeExchangeGuards(now = Date.now()) {
  for (const [key, entry] of OAUTH_CODE_EXCHANGE_GUARDS) {
    if (!entry || Number(entry.expiresAt || 0) <= now) OAUTH_CODE_EXCHANGE_GUARDS.delete(key);
  }
  if (OAUTH_CODE_EXCHANGE_GUARDS.size <= 500) return;
  let removed = 0;
  for (const key of OAUTH_CODE_EXCHANGE_GUARDS.keys()) {
    OAUTH_CODE_EXCHANGE_GUARDS.delete(key);
    removed += 1;
    if (removed >= 100 || OAUTH_CODE_EXCHANGE_GUARDS.size <= 500) break;
  }
}

function buildOAuthCodeGuardKey(provider, code, stateRaw, env) {
  const secret = getAccessTokenSecret(env);
  return `${provider}:${createHash("sha256")
    .update(`${provider}|${String(code || "")}|${String(stateRaw || "")}|${secret}`)
    .digest("hex")}`;
}

function beginOAuthCodeExchange(provider, code, stateRaw, env) {
  const now = Date.now();
  cleanupOAuthCodeExchangeGuards(now);
  const key = buildOAuthCodeGuardKey(provider, code, stateRaw, env);
  if (OAUTH_CODE_EXCHANGE_GUARDS.has(key)) return { key, blocked: true };
  OAUTH_CODE_EXCHANGE_GUARDS.set(key, {
    status: "processing",
    expiresAt: now + OAUTH_CODE_GUARD_TTL_MS,
  });
  return { key, blocked: false };
}

function markOAuthCodeExchangeComplete(key) {
  if (!key) return;
  OAUTH_CODE_EXCHANGE_GUARDS.set(key, {
    status: "complete",
    expiresAt: Date.now() + OAUTH_CODE_GUARD_TTL_MS,
  });
}

function sanitizeAuthFlow(rawFlow) {
  return String(rawFlow || "").trim().toLowerCase() === "signup" ? "signup" : "login";
}

async function signSocialState(payload, env) {
  return signJwt(
    {
      purpose: "social-oauth-state",
      jti: randomBytes(16).toString("hex"),
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
      clientId: getEnv(env, "NAVER_OAUTH_CLIENT_ID") || getEnv(env, "NAVER_CLIENT_ID"),
      clientSecret: getEnv(env, "NAVER_OAUTH_CLIENT_SECRET") || getEnv(env, "NAVER_CLIENT_SECRET"),
      authorizationEndpoint: "https://nid.naver.com/oauth2.0/authorize",
      tokenEndpoint: "https://nid.naver.com/oauth2.0/token",
      userInfoEndpoint: "https://openapi.naver.com/v1/nid/me",
      scope: "name email",
      redirectUri,
    };
  }

  if (provider === "kakao") {
    return {
      clientId: getEnv(env, "KAKAO_OAUTH_CLIENT_ID") || getEnv(env, "KAKAO_CLIENT_ID"),
      clientSecret: getEnv(env, "KAKAO_OAUTH_CLIENT_SECRET") || getEnv(env, "KAKAO_CLIENT_SECRET"),
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
      emailVerified: payload?.email_verified === false ? false : (payload?.email_verified === true ? true : null),
      name: String(payload?.name || payload?.given_name || "Google user"),
      image: String(payload?.picture || ""),
      phoneNumber: normalizeKoreanPhoneNumber(payload?.phone_number || payload?.phoneNumber || ""),
    };
  }

  if (provider === "naver") {
    const profile = payload?.response || {};
    return {
      providerId: String(profile?.id || ""),
      email: profile?.email ? String(profile.email).toLowerCase() : "",
      emailVerified: profile?.email_verified === false ? false : (profile?.email_verified === true ? true : null),
      name: String(profile?.name || profile?.nickname || "Naver user"),
      image: String(profile?.profile_image || ""),
      phoneNumber: normalizeKoreanPhoneNumber(profile?.mobile || profile?.mobile_e164 || profile?.phone || profile?.phoneNumber || ""),
    };
  }

  if (provider === "kakao") {
    const account = payload?.kakao_account || {};
    const profile = account?.profile || {};
    return {
      providerId: String(payload?.id || ""),
      email: account?.email ? String(account.email).toLowerCase() : "",
      emailVerified: account?.is_email_verified === false ? false : (account?.is_email_verified === true ? true : null),
      name: String(profile?.nickname || "Kakao user"),
      image: String(profile?.profile_image_url || profile?.thumbnail_image_url || ""),
      phoneNumber: normalizeKoreanPhoneNumber(account?.phone_number || account?.phoneNumber || account?.phone || ""),
    };
  }

  return { providerId: "", email: "", emailVerified: null, name: "", image: "" };
}

function hasExplicitlyUnverifiedSocialEmail(profile) {
  return Boolean(profile?.email) && profile?.emailVerified === false;
}

// OAuth 공급자(네이버·카카오·구글) 토큰/프로필 fetch용 타임아웃+제한적 재시도 래퍼.
// 국내 호스팅 공급자 API의 지연 편차가 그대로 로그인 실패로 표면화되던 문제를 흡수한다.
// (kasi.js의 AbortController+setTimeout(abort) 패턴 재사용)
const OAUTH_PROVIDER_FETCH_TIMEOUT_MS = 8000;
const OAUTH_PROVIDER_FETCH_RETRIES = 1;

async function fetchOAuthProvider(url, init = {}, options = {}) {
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : OAUTH_PROVIDER_FETCH_TIMEOUT_MS;
  const retries = Number.isFinite(options.retries) ? Math.max(0, Math.floor(options.retries)) : OAUTH_PROVIDER_FETCH_RETRIES;

  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = setTimeout(() => {
      if (controller) {
        try {
          controller.abort();
        } catch (_) {}
      }
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller ? controller.signal : undefined,
      });
      // 5xx는 공급자 일시 장애로 보고 남은 시도가 있으면 재시도. 마지막 시도면 그대로
      // 반환해 호출부가 기존 방식대로 실패를 판정한다. 4xx(잘못된 code 등)는 재시도 무의미.
      if (response.status >= 500 && attempt < retries) {
        lastError = new Error(`oauth_provider_http_${response.status}`);
        await sleep(150 * (attempt + 1));
        continue;
      }
      return response;
    } catch (error) {
      // abort(타임아웃)·네트워크 오류만 재시도 대상.
      lastError = error;
      if (attempt < retries) {
        await sleep(150 * (attempt + 1));
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error("oauth_provider_fetch_failed");
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

  const response = await fetchOAuthProvider(cfg.tokenEndpoint, {
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
  const response = await fetchOAuthProvider(cfg.userInfoEndpoint, {
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

// 기존 소셜/이메일 유저 조회 + 연결 로직. findOrCreateSocialUser의 최초 조회와,
// 동시 생성 경합(E11000) 발생 시의 재조회 양쪽에서 재사용한다.
async function findExistingSocialUser(provider, profile, socialField) {
  let user = await User.findOne({ [socialField]: profile.providerId });
  if (user) {
    if (isWithdrawnAuthUser(user)) throw new Error(`${provider}_account_withdrawn`);
    const profilePhoneNumber = normalizeKoreanPhoneNumber(profile.phoneNumber);
    if (profilePhoneNumber && !normalizeKoreanPhoneNumber(user.phoneNumber || user.phone)) {
      user.set("phoneNumber", profilePhoneNumber);
      await user.save();
    }
    return { user, created: false };
  }

  if (profile.email) {
    user = await User.findOne({ email: profile.email });
    if (user) {
      if (isWithdrawnAuthUser(user)) throw new Error(`${provider}_account_withdrawn`);
      if (hasExplicitlyUnverifiedSocialEmail(profile)) {
        throw new Error(`${provider}_email_unverified`);
      }
      user.set(socialField, profile.providerId);
      user.set(`socialAccounts.${provider}.connectedAt`, new Date());
      if (!String(user.profileImage || "").trim() && String(profile.image || "").trim()) {
        user.set("profileImage", String(profile.image || "").trim());
      }
      const profilePhoneNumber = normalizeKoreanPhoneNumber(profile.phoneNumber);
      if (profilePhoneNumber && !normalizeKoreanPhoneNumber(user.phoneNumber || user.phone)) {
        user.set("phoneNumber", profilePhoneNumber);
      }
      await user.save();
      return { user, created: false };
    }
  }

  return null;
}

async function findOrCreateSocialUser(provider, profile, env) {
  const socialField = `socialAccounts.${provider}.id`;

  const existing = await findExistingSocialUser(provider, profile, socialField);
  if (existing) return existing;

  const fallbackEmail = `${provider}_${profile.providerId}@social.code-destiny.local`;
  const joinedAt = new Date();
  const profilePhoneNumber = normalizeKoreanPhoneNumber(profile.phoneNumber);
  let createdUser;
  try {
    createdUser = await User.create({
      name: profile.name || `${provider} user`,
      email: profile.email || fallbackEmail,
      profileImage: String(profile.image || ""),
      ...(profilePhoneNumber ? { phoneNumber: profilePhoneNumber } : {}),
      passwordHash: "",
      birthDate: "1900-01-01",
      birthTime: "00:00",
      gender: "OTHER",
      role: "user",
      points: 0,
      profileSubscription: buildSignupProfileSubscription(joinedAt),
      joinedAt,
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
  } catch (error) {
    // 동시 소셜 로그인 경합: 다른 요청이 같은 providerId/email로 먼저 유저를 만들어
    // 중복키(E11000)가 나면, 이미 생성된 유저를 재조회해 흡수한다(두 번째 요청도 정상 로그인).
    if (error && (error.code === 11000 || String(error.message || "").includes("E11000"))) {
      const raced = await findExistingSocialUser(provider, profile, socialField);
      if (raced) return raced;
    }
    throw error;
  }
  await withOptionalAuthSideEffect(recordMonthlyCreditGrantLedger({
    userId: createdUser._id,
    amount: SIGNUP_MONTHLY_CREDIT_GRANT,
    beforeBalance: 0,
    afterBalance: SIGNUP_MONTHLY_CREDIT_GRANT,
    reason: "회원가입 이용권 혜택 지급",
    sourceId: `signup:${String(createdUser._id || "")}`,
    serviceKey: "signup_bonus",
    metadata: {
      grantType: "signup",
      authMethod: "social",
      provider,
    },
  }), Math.min(getAuthOpTimeoutMs(env), 2000), `auth_social_${provider}_signup_credit_ledger`);
  return { user: createdUser, created: true };
}

// 소셜 유저 조회/생성을 일시 DB 장애(pool-clear·네트워크 버스트·op-타임아웃)에 대해
// 재시도로 흡수한다. handleOAuthComplete/handleLogin과 동일한 3회 루프 패턴을 재사용한다.
// 인프라 오류가 아닌 정상 거부(_account_withdrawn·_email_unverified)는 재시도 없이 전파된다.
async function resolveSocialUserWithRetry(provider, profile, env) {
  const timeoutMs = getAuthOpTimeoutMs(env);
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await withAuthOpTimeout(
        findOrCreateSocialUser(provider, profile, env),
        timeoutMs,
        "auth_social_resolve_user",
      );
    } catch (error) {
      lastError = error;
      const infraFailure = isAuthInfraFailure(error, ["auth_social_resolve_user"]);
      if (infraFailure && attempt < 3) {
        console.warn(`[auth/social] transient infra failure resolving ${provider} user, retrying:`, error);
        resetMongooseConnection().catch(() => {});
        await sleep(150 * attempt);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

function isLocalAuthEnabled(user) {
  return user?.localAuth?.enabled !== false;
}

function isWithdrawnAuthUser(user) {
  return String(user?.status || "").trim().toLowerCase() === "withdrawn";
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

const WITHDRAW_RATE_LIMIT_ENDPOINT = "auth_withdraw";

function isWithdrawRateLimitedInMemory(key) {
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

async function isWithdrawRateLimited(request, env) {
  const meta = getRequestMeta(request);
  const key = String(meta.ip || "unknown");
  try {
    const { count } = await incrementRateLimit({
      subjectHash: key,
      endpoint: WITHDRAW_RATE_LIMIT_ENDPOINT,
      windowMs: WITHDRAW_RATE_LIMIT_WINDOW_MS,
      env,
    });
    return count > WITHDRAW_RATE_LIMIT_MAX;
  } catch (error) {
    console.warn("[auth/withdraw] rate-limit store unavailable, falling back to in-memory:", error?.message || error);
    return isWithdrawRateLimitedInMemory(key);
  }
}

function getLoginRateLimitMax(env) {
  const value = Number(getEnv(env, "AUTH_LOGIN_RATE_LIMIT_MAX", String(LOGIN_RATE_LIMIT_DEFAULT_MAX)));
  if (!Number.isFinite(value) || value <= 0) return LOGIN_RATE_LIMIT_DEFAULT_MAX;
  return Math.min(Math.floor(value), 100);
}

function getLoginRateLimitWindowMs(env) {
  const value = Number(getEnv(env, "AUTH_LOGIN_RATE_LIMIT_WINDOW_MS", String(LOGIN_RATE_LIMIT_DEFAULT_WINDOW_MS)));
  if (!Number.isFinite(value) || value <= 0) return LOGIN_RATE_LIMIT_DEFAULT_WINDOW_MS;
  return Math.min(Math.max(Math.floor(value), 60 * 1000), 60 * 60 * 1000);
}

function buildLoginRateLimitKey(request, email, env) {
  const meta = getRequestMeta(request);
  const ip = String(meta.ip || "unknown").trim() || "unknown";
  const emailHash = hashEmailForAudit(email, env).slice(0, 32);
  return `${ip}:${emailHash}`;
}

const LOGIN_RATE_LIMIT_ENDPOINT = "auth_login";

// ── in-memory 폴백(분산 store 장애 시에만 best-effort로 사용) ────────────────
function getLoginRateLimitStateInMemory(key, max, windowMs) {
  const now = Date.now();
  const state = loginRateLimitMap.get(key);
  if (!state || now > state.resetAt) {
    return { key, source: "memory", limited: false, count: 0, max, windowMs, resetAt: now + windowMs, retryAfterSeconds: 0 };
  }
  const retryAfterSeconds = Math.max(1, Math.ceil((state.resetAt - now) / 1000));
  return {
    key,
    source: "memory",
    limited: Number(state.count || 0) >= max,
    count: Number(state.count || 0),
    max,
    windowMs,
    resetAt: state.resetAt,
    retryAfterSeconds,
  };
}

function recordFailedLoginAttemptInMemory(rateLimitState) {
  loginRateLimitMap.set(rateLimitState.key, {
    count: Number(rateLimitState.count || 0) + 1,
    resetAt: rateLimitState.resetAt,
  });
}

// ── 분산(Mongo abuse_scores) rate limit + in-memory 폴백 ─────────────────────
async function getLoginRateLimitState(request, email, env) {
  const key = buildLoginRateLimitKey(request, email, env);
  const max = getLoginRateLimitMax(env);
  const windowMs = getLoginRateLimitWindowMs(env);
  try {
    const state = await readRateLimitState({ subjectHash: key, endpoint: LOGIN_RATE_LIMIT_ENDPOINT, max, env });
    return { key, source: "mongo", env, windowMs, max, ...state };
  } catch (error) {
    console.warn("[auth/login] rate-limit store unavailable, falling back to in-memory:", error?.message || error);
    return getLoginRateLimitStateInMemory(key, max, windowMs);
  }
}

async function recordFailedLoginAttempt(rateLimitState) {
  if (!rateLimitState?.key) return;
  if (rateLimitState.source === "memory") {
    recordFailedLoginAttemptInMemory(rateLimitState);
    return;
  }
  try {
    await incrementRateLimit({
      subjectHash: rateLimitState.key,
      endpoint: LOGIN_RATE_LIMIT_ENDPOINT,
      windowMs: rateLimitState.windowMs,
      env: rateLimitState.env,
    });
  } catch (error) {
    console.warn("[auth/login] rate-limit increment failed:", error?.message || error);
    recordFailedLoginAttemptInMemory(rateLimitState);
  }
}

async function clearLoginRateLimit(rateLimitState) {
  if (!rateLimitState?.key) return;
  if (rateLimitState.source === "memory") {
    loginRateLimitMap.delete(rateLimitState.key);
    return;
  }
  try {
    await clearRateLimit({ subjectHash: rateLimitState.key, endpoint: LOGIN_RATE_LIMIT_ENDPOINT, env: rateLimitState.env });
  } catch (error) {
    console.warn("[auth/login] rate-limit clear failed:", error?.message || error);
  }
}

function buildInvalidLoginResponse() {
  return json({
    ok: false,
    code: "invalid_credentials",
    message: "Email or password is incorrect.",
  }, { status: 401 });
}

function buildLoginRateLimitedResponse(rateLimitState) {
  return json({
    ok: false,
    code: "rate_limited",
    message: "Too many login attempts. Please try again later.",
    retryAfterSeconds: rateLimitState.retryAfterSeconds,
  }, {
    status: 429,
    headers: { "Retry-After": String(rateLimitState.retryAfterSeconds) },
  });
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

function normalizeKoreanPhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const localDigits = digits.startsWith("82") && /^821\d{8,9}$/.test(digits) ? `0${digits.slice(2)}` : digits;
  if (!/^01\d{8,9}$/.test(localDigits)) return "";
  return localDigits;
}

function maskKoreanPhoneNumber(value) {
  const phoneNumber = normalizeKoreanPhoneNumber(value);
  if (!phoneNumber) return "";
  return `${phoneNumber.slice(0, 3)}-****-${phoneNumber.slice(-4)}`;
}

function buildPaymentPhoneResponse(user, extra = {}) {
  const phoneNumber = normalizeKoreanPhoneNumber(user?.phoneNumber || user?.phone);
  return {
    ...extra,
    hasPhone: Boolean(phoneNumber),
    maskedPhone: phoneNumber ? maskKoreanPhoneNumber(phoneNumber) : "",
    ...(phoneNumber ? { phoneNumber } : {}),
  };
}

function normalizeAuthUserResponse(user) {
  const normalized = normalizeUserResponse(user);
  const phoneNumber = normalizeKoreanPhoneNumber(user?.phoneNumber || user?.phone);
  return {
    ...normalized,
    ...(phoneNumber ? { phoneNumber } : {}),
  };
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
  } catch (e) {
    return String(match[1] || "");
  }
}

function readRefreshTokenFromRequest(request) {
  const fromCookie = readCookieFromRequest(request, REFRESH_COOKIE_NAME);
  if (fromCookie) return fromCookie;
  // 앱 전용 폴백. 쿠키가 있으면 언제나 쿠키가 이기므로 웹 경로는 이 줄에 닿지 않는다.
  if (!isMobileAppAuthRequest(request)) return "";
  return String(request.headers.get(APP_REFRESH_TOKEN_HEADER) || "").trim();
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
  const setFields = {};
  // skipRevokedAt: the rotation-claim step already stamped the one true revocation instant —
  // re-stamping it here on every grace-window replay would slide the reuse-detection window
  // forward indefinitely instead of enforcing a fixed graceMs from the first rotation.
  if (!patch.skipRevokedAt) {
    setFields.revokedAt = patch.revokedAt || new Date();
  }
  if (patch.replacedByTokenHash) {
    setFields.replacedByTokenHash = patch.replacedByTokenHash;
  }
  if (!Object.keys(setFields).length) return;
  await RefreshTokenSession.updateOne({ tokenHash }, { $set: setFields }).catch(() => {});
}

async function revokeAllUserRefreshSessions(userId) {
  if (!mongoose.Types.ObjectId.isValid(String(userId || ""))) return;
  await RefreshTokenSession.updateMany(
    { userId: new mongoose.Types.ObjectId(String(userId)), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  ).catch(() => {});
}

async function createAuthSuccessResponse(request, env, user, status = 200, nextPath = "/", extra = {}) {
  const accessToken = await signAuthToken(user, env);
  const { refreshToken, tokenHash, expiresAt } = await issueRefreshTokenForUser(user._id, env);
  await createRefreshSession(request, env, user._id, tokenHash, expiresAt);
  const accessExpiresInSec = parseDurationToSeconds(getAccessTokenExpiresIn(env), 30 * 60);

  const response = json({
    ok: true,
    message: status === 201 ? "Registration completed." : "Login completed.",
    user: normalizeAuthUserResponse(user),
    nextPath: sanitizeNextPath(nextPath) || "/",
    accessToken,
    tokenType: "Bearer",
    accessTokenExpiresInSec: accessExpiresInSec,
    ...appRefreshTokenField(request, refreshToken),
    ...extra,
  }, { status });
  appendAuthCookies(response, request, env, accessToken, refreshToken);
  return response;
}

async function createLocalDevAuthSuccessResponse(request, env, user, status = 200, nextPath = "/") {
  const accessToken = await signAuthToken(user, env);
  const { refreshToken } = await issueRefreshTokenForUser(user._id, env);
  const accessExpiresInSec = parseDurationToSeconds(getAccessTokenExpiresIn(env), 30 * 60);

  const response = json({
    ok: true,
    message: "Login completed.",
    user: {
      ...normalizeAuthUserResponse(user),
      hasLocalAuth: true,
    },
    nextPath: sanitizeNextPath(nextPath) || "/",
    accessToken,
    tokenType: "Bearer",
    accessTokenExpiresInSec: accessExpiresInSec,
    ...appRefreshTokenField(request, refreshToken),
    source: "local-dev",
  }, { status });

  appendAuthCookies(response, request, env, accessToken, refreshToken);
  return response;
}

function buildTokenFallbackUser(auth) {
  const phoneNumber = normalizeKoreanPhoneNumber(auth.phoneNumber || auth.phone);
  return {
    id: auth.userId,
    name: auth.name || auth.email || "",
    email: auth.email || "",
    image: auth.image || "",
    ...(phoneNumber ? { phoneNumber } : {}),
    birthDate: auth.birthDate || "",
    birthTime: auth.birthTime || "",
    gender: auth.gender || "OTHER",
    role: auth.role || "user",
    points: Number.isFinite(Number(auth.points)) ? Number(auth.points) : 0,
    joinedAt: auth.joinedAt || null,
    profileSubscription: {
      tier: "free",
      isActive: false,
      isSubscribed: false,
      status: "free",
      source: "token",
      expiresAt: null,
      passLimit: 0,
      freeLimit: 0,
      maxCoveredCoin: 0,
      membershipCreditBalance: 0,
    },
    hasLocalAuth: true,
  };
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
  } catch (e) {
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
  const phoneNumber = normalizeKoreanPhoneNumber(body.phoneNumber || body.phone);
  if (!phoneNumber) {
    return signupErrorResponse(
      request,
      env,
      400,
      "invalid_phone_number",
      "Phone number is required for payment customer information.",
    );
  }

  try {
    const users = User.collection;
    const existing = await withAuthOpTimeout(
      users.findOne(
        { email },
        {
          projection: {
            _id: 1,
            name: 1,
            email: 1,
            phoneNumber: 1,
            phone: 1,
            birthDate: 1,
            birthTime: 1,
            gender: 1,
            role: 1,
            points: 1,
            joinedAt: 1,
            passwordHash: 1,
            localAuth: 1,
            profileSubscription: 1,
            socialAccounts: 1,
            status: 1,
          },
          maxTimeMS: dbMaxTimeMs,
        },
      ),
      timeoutMs,
      "auth_register_find_existing",
    );

    if (existing) {
      if (isWithdrawnAuthUser(existing)) {
        return signupErrorResponse(
          request,
          env,
          409,
          "duplicate_email",
          "이미 사용 중인 이메일이에요.",
        );
      }

      let existingPasswordOk = false;
      if (isLocalAuthEnabled(existing) && existing.passwordHash) {
        existingPasswordOk = await withAuthOpTimeout(
          verifyPassword(password, existing.passwordHash),
          timeoutMs,
          "auth_register_existing_verify_password",
        );
      }

      if (existingPasswordOk) {
        return await withAuthOpTimeout(
          createAuthSuccessResponse(request, env, existing, 200, body?.nextPath, { idempotent: true }),
          timeoutMs,
          "auth_register_existing_issue_session",
        );
      }

      if (!isLocalAuthEnabled(existing) || !existing.passwordHash) {
        return signupErrorResponse(
          request,
          env,
          409,
          "social_account",
          "소셜 로그인으로 가입된 계정이에요. 구글/카카오/네이버로 로그인해 주세요.",
        );
      }

      return signupErrorResponse(
        request,
        env,
        409,
        "duplicate_email",
        "이미 사용 중인 이메일이에요.",
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
        phoneNumber,
        passwordHash,
        birthDate,
        birthTime,
        gender,
        role: "user",
        points: 0,
        profileSubscription: buildSignupProfileSubscription(),
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
        "이미 사용 중인 이메일이에요.",
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

  const referralCapture = extractReferralCapture(body);
  const [, referralReward] = await Promise.all([
    withOptionalAuthSideEffect(recordMonthlyCreditGrantLedger({
      userId: user._id,
      amount: SIGNUP_MONTHLY_CREDIT_GRANT,
      beforeBalance: 0,
      afterBalance: SIGNUP_MONTHLY_CREDIT_GRANT,
      reason: "회원가입 이용권 혜택 지급",
      sourceId: `signup:${String(user._id || "")}`,
      serviceKey: "signup_bonus",
      metadata: {
        grantType: "signup",
        authMethod: "local",
      },
    }), Math.min(timeoutMs, 2000), "auth_register_credit_grant_ledger"),
    (referralCapture.referralCode && referralCapture.referralShareToken)
      ? withOptionalAuthSideEffect(
        applyKakaoReferralReward(request, env, user, referralCapture),
        Math.min(timeoutMs, 4000),
        "auth_register_referral_reward",
        null,
      )
      : Promise.resolve(null),
  ]);

  try {
    return await withAuthOpTimeout(
      createAuthSuccessResponse(request, env, user, 201, body?.nextPath, referralReward ? { referralReward } : {}),
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
  const timeoutMs = getAuthOpTimeoutMs(env);
  const dbMaxTimeMs = Math.max(1000, timeoutMs - 1000);
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
  const localDevUser = resolveLocalDevAuthUser(request, env, email, password);
  if (localDevUser) {
    return await createLocalDevAuthSuccessResponse(request, env, localDevUser, 200, body?.nextPath);
  }

  const loginRateLimitState = await getLoginRateLimitState(request, email, env);
  if (loginRateLimitState.limited) {
    console.warn("[auth/login] rate limited:", {
      emailHash: hashEmailForAudit(email, env).slice(0, 12),
      retryAfterSeconds: loginRateLimitState.retryAfterSeconds,
    });
    return buildLoginRateLimitedResponse(loginRateLimitState);
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await withAuthOpTimeout(connectDb(env), getAuthConnectTimeoutMs(env), "auth_login_connect_db");

      const users = User.collection;
      const user = await withAuthOpTimeout(
        users.findOne(
          { email },
          {
            projection: {
              _id: 1,
              name: 1,
              email: 1,
              phoneNumber: 1,
              phone: 1,
              birthDate: 1,
              birthTime: 1,
              gender: 1,
              role: 1,
              points: 1,
              joinedAt: 1,
              passwordHash: 1,
              localAuth: 1,
              profileSubscription: 1,
              subscription: 1,
              membership: 1,
              membershipPass: 1,
              pass: 1,
              entitlement: 1,
              licensePass: 1,
              accessGateResult: 1,
              plan: 1,
              planId: 1,
              productId: 1,
              subscriptionTier: 1,
              membershipTier: 1,
              passTier: 1,
              status: 1,
              subscriptionStatus: 1,
              membershipStatus: 1,
              isActive: 1,
              isSubscribed: 1,
              expiresAt: 1,
              socialAccounts: 1,
            },
            maxTimeMS: dbMaxTimeMs,
          },
        ),
        timeoutMs,
        "auth_login_find_user",
      );
      if (!user) {
        await recordFailedLoginAttempt(loginRateLimitState);
        return buildInvalidLoginResponse();
      }

      if (isWithdrawnAuthUser(user)) {
        await recordFailedLoginAttempt(loginRateLimitState);
        return buildInvalidLoginResponse();
      }

      if (!isLocalAuthEnabled(user) || !user.passwordHash) {
        await recordFailedLoginAttempt(loginRateLimitState);
        return buildInvalidLoginResponse();
      }

      const passwordOk = await withAuthOpTimeout(
        verifyPassword(password, user.passwordHash),
        timeoutMs,
        "auth_login_verify_password",
      );
      if (!passwordOk) {
        await recordFailedLoginAttempt(loginRateLimitState);
        return buildInvalidLoginResponse();
      }

      // Rate-limit housekeeping doesn't gate whether the session gets issued, so run it
      // alongside session creation instead of serializing an extra DB round trip in front of it.
      const [, response] = await Promise.all([
        clearLoginRateLimit(loginRateLimitState),
        withAuthOpTimeout(
          createAuthSuccessResponse(request, env, user, 200, body?.nextPath),
          timeoutMs,
          "auth_login_issue_session",
        ),
      ]);
      return response;
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
      await recordFailedLoginAttempt(loginRateLimitState);
      return buildInvalidLoginResponse();
    }
  }

  return json({
    ok: false,
    code: "login_service_unavailable",
    message: "Login service is temporarily unavailable. Please try again.",
  }, { status: 503 });
}

// /api/auth/me 응답에 필요한 User 필드. 인증 리졸버(resolveActiveUserAuth)에 userProjection으로 넘겨
// 인증 확인과 동일한 조회에서 함께 읽어 authUserDoc로 돌려받는다 → 인증-후 재조회(2번째 Mongo 왕복) 제거.
// (image/profileImage는 normalizeUserResponse가 쓰므로 포함 — 재사용/폴백 경로 응답을 일치시킨다.)
const ME_USER_PROJECTION = {
  _id: 1,
  name: 1,
  email: 1,
  phoneNumber: 1,
  phone: 1,
  birthDate: 1,
  birthTime: 1,
  gender: 1,
  role: 1,
  points: 1,
  joinedAt: 1,
  image: 1,
  profileImage: 1,
  profileSubscription: 1,
  subscription: 1,
  membership: 1,
  membershipPass: 1,
  pass: 1,
  entitlement: 1,
  licensePass: 1,
  accessGateResult: 1,
  plan: 1,
  planId: 1,
  productId: 1,
  subscriptionTier: 1,
  membershipTier: 1,
  passTier: 1,
  status: 1,
  subscriptionStatus: 1,
  membershipStatus: 1,
  isActive: 1,
  isSubscribed: 1,
  expiresAt: 1,
};

async function handleMe(request, env) {
  // 확정적 미인증(만료/무효 토큰·유저없음·철회) 응답에는 만료 쿠키 삭제 헤더를 부착해
  // 클라이언트의 유령 로그인 힌트(fortune_auth_role 등)를 서버가 직접 정리한다.
  // 일시 오류(degraded)·토큰 폴백 경로에서는 호출하지 않는다(로그인 유지).
  const unauthenticatedJson = (body, init) => {
    const res = json(body, init);
    clearAuthCookies(res, request, env);
    return res;
  };
  try {
    const timeoutMs = getAuthOpTimeoutMs(env);
    const dbMaxTimeMs = Math.max(1000, timeoutMs - 1000);
    // 인증 확인과 동시에 me 응답용 User 문서를 함께 읽어(authUserDoc) 두 번째 Mongo 왕복을 없앤다.
    // access-token 경로면 authUserDoc가 채워지고, refresh/token-폴백 경로면 없으므로 아래에서 재조회한다.
    const auth = await requireUserFromRequest(request, env, { userProjection: ME_USER_PROJECTION });

    if (isLocalDevAuthTokenUser(request, env, auth)) {
      return json({
        ok: true,
        authenticated: true,
        message: "Authenticated user loaded.",
        user: buildTokenFallbackUser(auth),
        source: "local-dev-token",
      });
    }

    const userId = String(auth.userId || "");
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return unauthenticatedJson({ ok: false, code: "invalid_auth_token", message: "Invalid authentication token." }, { status: 401 });
    }
    const objectId = new mongoose.Types.ObjectId(userId);

    // 인증 리졸버가 함께 읽어준 문서(authUserDoc)가 있으면 재사용해 me 재조회 왕복을 건너뛴다.
    let user = auth.authUserDoc || null;
    try {
      if (!user) {
        await withAuthOpTimeout(connectDb(env), timeoutMs, "auth_me_connect_db");
        const users = User.collection;
        user = await withAuthOpTimeout(
          users.findOne(
            { _id: objectId },
            {
              projection: ME_USER_PROJECTION,
              maxTimeMS: dbMaxTimeMs,
            },
          ),
          timeoutMs,
          "auth_me_find_user",
        );
      }
    } catch (error) {
      if (isAuthDbInfraError(error)) {
        logAuthDiagnostic(request, env, "/api/auth/me", "", "session_me_db_fallback", error);
        return json({
          ok: true,
          authenticated: true,
          message: "Authenticated user loaded from token.",
          user: buildTokenFallbackUser(auth),
          source: "token",
        });
      }
      throw error;
    }
    if (!user) {
      return unauthenticatedJson({ ok: false, code: "unauthorized", message: "User not found." }, { status: 401 });
    }
    if (isWithdrawnAuthUser(user)) {
      return unauthenticatedJson({ ok: false, code: "unauthorized", message: "User is not active." }, { status: 401 });
    }

    return json({
      ok: true,
      authenticated: true,
      message: "Authenticated user loaded.",
      user: {
        ...normalizeAuthUserResponse(user),
        hasLocalAuth: isLocalAuthEnabled(user) && Boolean(user.passwordHash),
      },
    });
  } catch (error) {
    logAuthDiagnostic(request, env, "/api/auth/me", "", "session_me_failed", error);
    const status = Number(error?.status || 0);
    const code = String(error?.payload?.code || error?.code || "").trim().toUpperCase();
    const unauthorized = status === 401
      || code === "UNAUTHORIZED"
      || error?.name === "TokenExpiredError"
      || error?.name === "JsonWebTokenError";

    if (unauthorized) {
      return unauthenticatedJson({
        ok: true,
        message: "No active authenticated session.",
        authenticated: false,
        user: null,
      });
    }

    if (isAuthDbInfraError(error)) {
      return json({
        ok: true,
        message: "사용자 정보를 일시적으로 불러오지 못해 기본 세션 상태로 응답합니다.",
        authenticated: false,
        user: null,
        degraded: true,
        code: "AUTH_ME_DEGRADED",
      });
    }

    return json({
      ok: true,
      message: "사용자 세션 조회 중 예외가 발생해 기본 상태로 응답합니다.",
      authenticated: false,
      user: null,
      degraded: true,
      code: "AUTH_ME_RECOVERED",
    });
  }
}

async function handlePaymentPhoneStatus(request, env) {
  const timeoutMs = getAuthOpTimeoutMs(env);
  const dbMaxTimeMs = Math.max(1000, timeoutMs - 1000);
  const auth = await requireAuth(request, env);
  const userId = String(auth.userId || "");

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return json({ ok: false, code: "invalid_auth_token", message: "Invalid authentication token." }, { status: 401 });
  }

  await withAuthOpTimeout(connectDb(env), timeoutMs, "auth_phone_connect_db");
  const user = await withAuthOpTimeout(
    User.findById(userId)
      .select("phoneNumber phone")
      .maxTimeMS(dbMaxTimeMs)
      .lean(),
    timeoutMs,
    "auth_payment_phone_find_user",
  );

  if (!user) {
    return json({ ok: false, code: "user_not_found", message: "User not found." }, { status: 404 });
  }

  return json({
    ok: true,
    ...buildPaymentPhoneResponse(user),
  });
}

async function handleSavePaymentPhoneNumber(request, env) {
  const timeoutMs = getAuthOpTimeoutMs(env);
  const dbMaxTimeMs = Math.max(1000, timeoutMs - 1000);
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const phoneNumber = normalizeKoreanPhoneNumber(body?.phoneNumber || body?.phone);

  if (!phoneNumber) {
    return json({
      ok: false,
      code: "invalid_phone_number",
      message: "휴대폰 번호를 정확히 입력해 주세요.",
    }, { status: 400 });
  }

  const userId = String(auth.userId || "");
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return json({ ok: false, code: "invalid_auth_token", message: "Invalid authentication token." }, { status: 401 });
  }

  await withAuthOpTimeout(connectDb(env), timeoutMs, "auth_phone_connect_db");
  const currentUser = await withAuthOpTimeout(
    User.findById(userId)
      .select("phoneNumber phone")
      .maxTimeMS(dbMaxTimeMs)
      .lean(),
    timeoutMs,
    "auth_payment_phone_find_current",
  );

  if (!currentUser) {
    return json({ ok: false, code: "user_not_found", message: "User not found." }, { status: 404 });
  }

  const currentPhoneNumber = normalizeKoreanPhoneNumber(currentUser?.phoneNumber || currentUser?.phone);
  if (currentPhoneNumber) {
    return json({
      ok: true,
      updated: false,
      ...buildPaymentPhoneResponse(currentUser),
    });
  }

  const updatedResult = await withAuthOpTimeout(
    User.collection.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $set: { phoneNumber, phoneUpdatedAt: new Date() } },
      {
        returnDocument: "after",
        projection: {
          _id: 1,
          phoneNumber: 1,
          phone: 1,
        },
        maxTimeMS: dbMaxTimeMs,
      },
    ),
    timeoutMs,
    "auth_phone_update_user",
  );
  const user = unwrapFindOneAndUpdateResult(updatedResult);

  if (!user) {
    return json({ ok: false, code: "user_not_found", message: "User not found." }, { status: 404 });
  }

  return json({
    ok: true,
    updated: true,
    ...buildPaymentPhoneResponse(user),
  });
}

async function handleUpdatePhoneNumber(request, env) {
  return await handleSavePaymentPhoneNumber(request, env);
}

async function handleRefresh(request, env) {
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
  } catch (e) {
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

  if (isLocalDevAuthEnabled(request, env)) {
    const config = getLocalDevAuthConfig(env);
    if (userId === config.userId) {
      return await createLocalDevAuthSuccessResponse(request, env, buildLocalDevAuthUser(config), 200, "/");
    }
  }

  try {
    // 풀 초기화(MongoPoolClearedError) 버스트에서 1회 실패로 즉시 503을 내지 않도록
    // withMongoRetry로 감싼다(내부에서 connectDb + per-attempt 타임아웃 + 재연결·재시도).
    await withMongoRetry(env, async () => {});
  } catch (error) {
    if (isAuthDbInfraError(error)) {
      logAuthDiagnostic(request, env, "/api/auth/refresh", "", "refresh_db_degraded", error);
      return json({
        ok: false,
        code: "AUTH_REFRESH_DEGRADED",
        message: "Authentication refresh is temporarily unavailable.",
        degraded: true,
      }, { status: 503 });
    }
    throw error;
  }

  const tokenHash = hashRefreshToken(refreshToken, env);

  // 원자적 회전 권리 선점 — revokedAt:null 세션만 매칭해 즉시 revoked 처리한다.
  // 동시 요청(멀티탭) 중 오직 하나만 pre-image(session)를 획득한다. 나머지는
  // null을 받아 아래 grace window 판정으로 넘어간다. 이로써 read-modify-write
  // 경쟁과 revokedAt 재확인 분기를 하나의 원자 연산으로 대체한다.
  let session;
  try {
    // withMongoRetry는 타임아웃(실행됐을 수 있는 모호 케이스)은 재시도하지 않고 풀-클리어류만
    // 재시도하므로 회전 선점 write에 안전하다. 만에 하나 1차 성공 후 재시도되어도 아래
    // grace window 분기가 방금 회전된 세션을 수용한다.
    session = await withMongoRetry(env, () => RefreshTokenSession.findOneAndUpdate(
      { tokenHash, revokedAt: null },
      { $set: { revokedAt: new Date() } },
      { returnDocument: "before" },
    ).lean());
  } catch (error) {
    if (isAuthDbInfraError(error)) {
      logAuthDiagnostic(request, env, "/api/auth/refresh", "", "refresh_session_degraded", error);
      return json({
        ok: false,
        code: "AUTH_REFRESH_DEGRADED",
        message: "Authentication refresh is temporarily unavailable.",
        degraded: true,
      }, { status: 503 });
    }
    throw error;
  }

  if (!session) {
    // 회전 선점 실패 — 이미 회전됐거나 존재하지 않는 토큰.
    // grace window 이내에 방금 회전된 토큰의 재생이라면 멀티탭 동시 회전으로 보고
    // 전 세션 폐기 없이 이 요청에도 새 세션을 발급한다.
    let priorSession = null;
    try {
      priorSession = await RefreshTokenSession.findOne({ tokenHash }).lean();
    } catch (e) {
      // 조회 실패 시 아래 reuse 처리로 폴백
    }

    const graceMs = getRefreshReuseGraceMs(env);
    const rotatedAt = priorSession?.revokedAt ? new Date(priorSession.revokedAt).getTime() : 0;
    const rotationAge = rotatedAt > 0 ? Date.now() - rotatedAt : Infinity;
    const hasReplacement = Boolean(priorSession?.replacedByTokenHash);
    // A sibling tab's rotation can be revoked (claim step) before it finishes writing
    // replacedByTokenHash a few DB round trips later. Without this short allowance, a second
    // tab refreshing at nearly the same instant would read "revoked, no replacement yet" and
    // get hard-logged-out even though its sibling's rotation was legitimate and in flight.
    const withinInFlightRotationTolerance = !hasReplacement
      && rotationAge <= Math.min(REFRESH_IN_FLIGHT_ROTATION_TOLERANCE_MS, graceMs);
    const withinGrace = Boolean(
      priorSession
      && (hasReplacement || withinInFlightRotationTolerance)
      && rotationAge <= graceMs
      && refreshSessionMatchesRequest(priorSession, request),
    );

    if (withinGrace) {
      session = priorSession;
    } else {
      await revokeAllUserRefreshSessions(userId);
      const response = json({ ok: false, message: "Refresh token reuse detected. Please sign in again." }, { status: 401 });
      clearAuthCookies(response, request, env);
      return response;
    }
  }

  if (!refreshSessionMatchesRequest(session, request)) {
    await revokeAllUserRefreshSessions(userId);
    const response = json({ ok: false, message: "Session changed. Please sign in again." }, { status: 401 });
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
    user = await withMongoRetry(env, () => User.collection.findOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      {
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          phoneNumber: 1,
          phone: 1,
          birthDate: 1,
          birthTime: 1,
          gender: 1,
          role: 1,
          points: 1,
          joinedAt: 1,
          passwordHash: 1,
          localAuth: 1,
          status: 1,
        },
      },
    ));
  } catch (error) {
    if (isAuthDbInfraError(error)) {
      logAuthDiagnostic(request, env, "/api/auth/refresh", "", "refresh_user_lookup_degraded", error);
      return json({
        ok: false,
        code: "AUTH_REFRESH_DEGRADED",
        message: "Authentication refresh is temporarily unavailable.",
        degraded: true,
      }, { status: 503 });
    }
    throw error;
  }

  if (!user || isWithdrawnAuthUser(user)) {
    await revokeAllUserRefreshSessions(userId);
    const response = json({ ok: false, message: "User not found." }, { status: 401 });
    clearAuthCookies(response, request, env);
    return response;
  }

  const accessToken = await signAuthToken(user, env);
  const nextRefresh = await issueRefreshTokenForUser(userId, env);
  await createRefreshSession(request, env, userId, nextRefresh.tokenHash, nextRefresh.expiresAt);
  await markSessionRevoked(tokenHash, {
    skipRevokedAt: true,
    replacedByTokenHash: nextRefresh.tokenHash,
  });
  const accessExpiresInSec = parseDurationToSeconds(getAccessTokenExpiresIn(env), 30 * 60);

  const response = json({
    ok: true,
    message: "Token refreshed.",
    accessToken,
    tokenType: "Bearer",
    accessTokenExpiresInSec: accessExpiresInSec,
    ...appRefreshTokenField(request, nextRefresh.refreshToken),
    user: {
      ...normalizeAuthUserResponse(user),
      hasLocalAuth: isLocalAuthEnabled(user) && Boolean(user.passwordHash),
    },
  });
  appendAuthCookies(response, request, env, accessToken, nextRefresh.refreshToken);
  return response;
}

async function handleLogout(request, env) {
  const refreshToken = readRefreshTokenFromRequest(request);
  const timeoutMs = getAuthOpTimeoutMs(env);

  try {
    await withAuthOpTimeout(connectDb(env), getAuthConnectTimeoutMs(env), "auth_logout_connect_db");

    let logoutUserId = "";
    if (refreshToken) {
      const tokenHash = hashRefreshToken(refreshToken, env);
      await markSessionRevoked(tokenHash, { revokedAt: new Date() });

      try {
        const payload = await verifyJwt(refreshToken, getRefreshTokenSecret(env), {
          issuer: getJwtIssuer(env),
          audience: getJwtAudience(env),
        });
        logoutUserId = extractRefreshUserId(payload);
      } catch (e) {
        logoutUserId = "";
      }
    }

    if (!logoutUserId) {
      try {
        const auth = await requireAuth(request, env);
        logoutUserId = String(auth?.userId || "");
      } catch (e) {
        logoutUserId = "";
      }
    }

    if (logoutUserId) {
      await withAuthOpTimeout(
        revokeAllUserRefreshSessions(logoutUserId),
        timeoutMs,
        "auth_logout_revoke_user_sessions",
      );
    }
  } catch (error) {
    logAuthDiagnostic(request, env, "/api/auth/logout", "", "logout_revoke_failed", error);
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
  if (await isWithdrawRateLimited(request, env)) {
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
  } catch (e) {
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

async function handleKakaoReferralShare(request, env) {
  const auth = await requireAuth(request, env);
  if (!mongoose.Types.ObjectId.isValid(String(auth.userId || ""))) {
    return json({ ok: false, message: "로그인이 필요합니다." }, { status: 401 });
  }

  const objectId = new mongoose.Types.ObjectId(String(auth.userId));
  const user = await withMongoRetry(env, () => User.collection.findOne(
    { _id: objectId },
    {
      projection: {
        _id: 1,
        name: 1,
        referralCode: 1,
      },
      maxTimeMS: 8000,
    },
  ));
  if (!user) return json({ ok: false, message: "사용자 정보를 찾을 수 없습니다." }, { status: 404 });

  const referralCode = await ensureReferralCodeForUser(user, env);
  const referralShareToken = await signReferralShareToken(user._id, referralCode, env);
  const shareUrl = buildReferralShareUrl(request, env, referralCode, referralShareToken);

  /* 공유 링크를 실제로 만든 사건을 서버가 직접 보고 EXP 를 적립한다(하루 1회).
     클라이언트 신고를 받지 않는 이유는 EXP 가 레벨 마일스톤을 통해 월정석으로 이어지기 때문이다.
     적립 실패가 공유 자체를 막으면 안 되므로 조용히 삼킨다. */
  try {
    const { grantRpgExpForServerEvent } = await import("./rpg.js");
    await grantRpgExpForServerEvent(env, user._id, "share", "kakao");
  } catch (rpgError) {
    console.warn("[Referral][ShareExpSkipped]", { message: String(rpgError?.message || rpgError || "") });
  }

  return json({
    ok: true,
    referralCode,
    referralShareToken,
    shareUrl,
    kakaoJavascriptKey: resolveKakaoJavascriptKey(env),
    rewardPolicy: {
      channel: "kakao",
      rewardMonthlyCredit: REFERRAL_REWARD_MONTHLY_CREDIT,
      dailyMonthlyCreditCap: REFERRAL_DAILY_MONTHLY_CREDIT_CAP,
      shareOnly: true,
      message: "이 버튼으로 만든 카카오 공유 링크를 통해 친구가 회원가입을 완료한 경우에만 추천 보상이 지급됩니다.",
    },
  });
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
    const nextPath = sanitizeOAuthNextPath(url.searchParams.get("next") || "");
    const appRedirect = sanitizeAppOAuthRedirect(url.searchParams.get("appRedirect") || "");
    const flow = sanitizeAuthFlow(url.searchParams.get("flow"));
    const referralCapture = extractReferralCapture({
      referralCode: url.searchParams.get("referralCode") || url.searchParams.get("ref"),
      referralShareToken: url.searchParams.get("referralShareToken") || url.searchParams.get("rs"),
      referralSource: url.searchParams.get("referralSource") || url.searchParams.get("via"),
    });
    const frontendBase = getOAuthFrontendBaseUrl(request, env);
    const stateToken = await signSocialState({
      provider,
      nextPath,
      frontendBase,
      appRedirect,
      flow,
      redirectUri: cfg.redirectUri,
      referralCode: referralCapture.referralCode,
      referralShareToken: referralCapture.referralShareToken,
      referralSource: referralCapture.referralSource,
    }, env);

    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      response_type: "code",
      scope: cfg.scope,
      state: stateToken,
    });
    if (provider === "google") params.set("prompt", "select_account");
    if (provider === "kakao") params.set("prompt", "login");

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

async function applySocialOAuthReferralReward(request, env, user, payload, fallbackCapture, timeoutMs) {
  const referralCapture = {
    referralCode: payload.referralCode || fallbackCapture?.referralCode,
    referralShareToken: payload.referralShareToken || fallbackCapture?.referralShareToken,
    referralSource: payload.referralSource || fallbackCapture?.referralSource,
  };
  if (
    !payload.isNewUser
    || sanitizeAuthFlow(payload.flow) !== "signup"
    || !normalizeReferralCode(referralCapture.referralCode)
    || !normalizeReferralShareToken(referralCapture.referralShareToken)
  ) {
    return null;
  }
  return await withOptionalAuthSideEffect(
    applyKakaoReferralReward(request, env, user, referralCapture),
    Math.min(timeoutMs, 4000),
    "auth_oauth_referral_reward",
    null,
  );
}

async function handleOAuthCallback(request, env, provider) {
  const frontendBase = getFrontendBaseUrl(env);

  if (!OAUTH_PROVIDERS.includes(provider)) {
    return buildOAuthFailureRedirect(frontendBase, provider, "unsupported_provider");
  }

  let exchangeFailureLogged = false;
  const logExchangeFailed = (reason) => {
    if (exchangeFailureLogged) return;
    exchangeFailureLogged = true;
    logKakaoCallbackMarker(request, provider, "exchangeFailed", {
      reason: String(reason || "oauth_callback_failed").slice(0, 120),
    });
  };

  try {
    logKakaoCallbackMarker(request, provider, "entry");
    const url = new URL(request.url);
    const stateRaw = String(url.searchParams.get("state") || "");
    const code = String(url.searchParams.get("code") || "");
    const oauthError = String(url.searchParams.get("error") || "");
    logKakaoCallbackMarker(request, provider, "hasCode", { hasCode: Boolean(code) });
    logKakaoCallbackMarker(request, provider, "hasState", { hasState: Boolean(stateRaw) });

    if (oauthError) {
      logExchangeFailed("provider_error");
      return buildOAuthFailureRedirect(frontendBase, provider, oauthError);
    }
    if (!stateRaw || !code) {
      logKakaoCallbackMarker(request, provider, "stateValid", { stateValid: false });
      logExchangeFailed("missing_oauth_params");
      return buildOAuthFailureRedirect(frontendBase, provider, "missing_oauth_params");
    }

    let statePayload = null;
    try {
      statePayload = await verifySocialState(stateRaw, env);
    } catch (error) {
      logKakaoCallbackMarker(request, provider, "stateValid", { stateValid: false });
      logExchangeFailed("invalid_oauth_state");
      throw new Error("invalid_oauth_state");
    }
    if (statePayload.provider !== provider) {
      logKakaoCallbackMarker(request, provider, "stateValid", { stateValid: false });
      logExchangeFailed("provider_mismatch");
      return buildOAuthFailureRedirect(frontendBase, provider, "provider_mismatch");
    }
    logKakaoCallbackMarker(request, provider, "stateValid", { stateValid: true });

    await connectDb(env);

    const flow = sanitizeAuthFlow(statePayload.flow);
    const nextPath = sanitizeOAuthNextPath(statePayload.nextPath);
    const safeFrontendBase = String(statePayload.frontendBase || frontendBase).replace(/\/+$/, "");
    const appRedirect = sanitizeAppOAuthRedirect(statePayload.appRedirect);

    if (provider !== "kakao") {
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
      const socialUser = await resolveSocialUserWithRetry(provider, socialProfile, env);
      const user = socialUser.user;
      const grant = await signSocialGrant({
        userId: String(user._id),
        provider,
        nextPath,
        flow,
        isNewUser: !!socialUser.created,
        referralCode: normalizeReferralCode(statePayload.referralCode),
        referralShareToken: normalizeReferralShareToken(statePayload.referralShareToken),
        referralSource: String(statePayload.referralSource || "").trim().toLowerCase(),
      }, env);

      const redirectParams = new URLSearchParams({ social_grant: grant, flow });
      if (nextPath !== "/") redirectParams.set("next", nextPath);
      const appRedirectTarget = buildAppOAuthRedirect(appRedirect, {
        social_grant: grant,
        flow,
        next: nextPath !== "/" ? nextPath : "",
      });
      if (appRedirectTarget) return buildAppOAuthHandoffResponse(appRedirectTarget);
      return redirect(`${safeFrontendBase}${redirectPath}?${redirectParams.toString()}`);
    }

    const redirectTarget = buildOAuthFrontendUrl(safeFrontendBase, nextPath);
    const exchangeGuard = beginOAuthCodeExchange(provider, code, stateRaw, env);
    if (exchangeGuard.blocked) {
      logKakaoCallbackMarker(request, provider, "loopGuardTriggered", { redirectTarget: nextPath });
      return redirect(redirectTarget);
    }

    let exchangeStarted = false;
    try {
      logKakaoCallbackMarker(request, provider, "exchangeStart");
      exchangeStarted = true;
      const accessToken = await exchangeCodeForAccessToken(
        provider,
        code,
        request,
        env,
        stateRaw,
        String(statePayload.redirectUri || ""),
      );
      logKakaoCallbackMarker(request, provider, "exchangeSuccess");
      const socialProfile = await fetchSocialProfile(provider, accessToken, request, env);
      const socialUser = await resolveSocialUserWithRetry(provider, socialProfile, env);
      const user = socialUser.user;
      logKakaoCallbackMarker(request, provider, "userResolved");

      if (appRedirect) {
        const grant = await signSocialGrant({
          userId: String(user._id),
          provider,
          nextPath,
          flow,
          isNewUser: !!socialUser.created,
          referralCode: normalizeReferralCode(statePayload.referralCode),
          referralShareToken: normalizeReferralShareToken(statePayload.referralShareToken),
          referralSource: String(statePayload.referralSource || "").trim().toLowerCase(),
        }, env);
        const appRedirectTarget = buildAppOAuthRedirect(appRedirect, {
          social_grant: grant,
          flow,
          next: nextPath !== "/" ? nextPath : "",
        });
        if (appRedirectTarget) {
          logKakaoCallbackMarker(request, provider, "appRedirectTarget", { redirectTarget: nextPath });
          return buildAppOAuthHandoffResponse(appRedirectTarget);
        }
      }

      const referralReward = await applySocialOAuthReferralReward(request, env, user, {
        isNewUser: !!socialUser.created,
        flow,
        referralCode: normalizeReferralCode(statePayload.referralCode),
        referralShareToken: normalizeReferralShareToken(statePayload.referralShareToken),
        referralSource: String(statePayload.referralSource || "").trim().toLowerCase(),
      }, null, getAuthOpTimeoutMs(env));

      const appAccessToken = await signAuthToken(user, env);
      const nextRefresh = await issueRefreshTokenForUser(user._id, env);
      await withAuthOpTimeout(
        createRefreshSession(request, env, user._id, nextRefresh.tokenHash, nextRefresh.expiresAt),
        getAuthOpTimeoutMs(env),
        "auth_social_kakao_issue_session",
      );
      const response = redirect(redirectTarget);
      appendAuthCookies(response, request, env, appAccessToken, nextRefresh.refreshToken);
      appendAuthRoleCookie(response, request, env, user);
      if (referralReward) response.headers.set("X-Code-Destiny-Referral-Reward", "applied");
      logKakaoCallbackMarker(request, provider, "sessionCreated");
      logKakaoCallbackMarker(request, provider, "redirectTarget", { redirectTarget: nextPath });
      return response;
    } catch (error) {
      if (exchangeStarted) {
        logExchangeFailed(error?.message || "oauth_callback_failed");
      }
      throw error;
    } finally {
      markOAuthCodeExchangeComplete(exchangeGuard.key);
    }
  } catch (error) {
    logAuthDiagnostic(request, env, "/api/auth/oauth/callback", provider, "oauth_callback_failed", error);
    const reason = String(error?.message || "oauth_callback_failed").trim() || "oauth_callback_failed";
    logExchangeFailed(reason);
    return buildOAuthFailureRedirect(frontendBase, provider, reason);
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
                phoneNumber: 1,
                phone: 1,
                birthDate: 1,
                birthTime: 1,
                gender: 1,
                role: 1,
                points: 1,
                joinedAt: 1,
                profileSubscription: 1,
                status: 1,
              },
              maxTimeMS: dbMaxTimeMs,
            },
          ),
          timeoutMs,
          "auth_oauth_complete_find_user",
        );

        if (!user) return json({ message: "User not found." }, { status: 404 });
        if (isWithdrawnAuthUser(user)) return json({ message: "User not found." }, { status: 404 });

        const referralReward = await applySocialOAuthReferralReward(request, env, user, payload, {
          referralCode: body?.referralCode,
          referralShareToken: body?.referralShareToken,
          referralSource: body?.referralSource,
        }, timeoutMs);

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
          user: normalizeAuthUserResponse(user),
          nextPath: sanitizeOAuthNextPath(payload.nextPath),
          provider: payload.provider,
          accessToken,
          tokenType: "Bearer",
          accessTokenExpiresInSec: parseDurationToSeconds(getAccessTokenExpiresIn(env), 30 * 60),
          ...appRefreshTokenField(request, nextRefresh.refreshToken),
          ...(referralReward ? { referralReward } : {}),
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

async function handleAppExchange(request, env) {
  const auth = await requireAuth(request, env);
  const tokenUser = {
    _id: auth.userId,
    id: auth.userId,
    email: auth.email || "",
    name: auth.name || "",
    role: auth.role || "user",
    image: auth.image || "",
    profileImage: auth.image || "",
    birthDate: auth.birthDate || "",
    birthTime: auth.birthTime || "",
    gender: auth.gender || "OTHER",
    points: Number(auth.points || 0),
    joinedAt: auth.joinedAt || null,
    profileSubscription: auth.profileSubscription || null,
  };
  const accessToken = await signAuthToken(tokenUser, env);
  return json({
    ok: true,
    runtimeTarget: "mobile-app",
    accessToken,
    tokenType: "Bearer",
    accessTokenExpiresInSec: parseDurationToSeconds(getAccessTokenExpiresIn(env), 30 * 60),
    user: normalizeAuthUserResponse(tokenUser),
  });
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
      || path === "/app/exchange"
      || path === "/withdraw"
      || path === "/oauth/complete"
      || path === "/referral/kakao-share"
      || path === "/me/phone-number"
      || path === "/me/payment-phone"
    ) {
      if (!isLocalDevAuthRoute(request, env, method, path)) {
        const configError = configMismatchResponse("auth-basic", env);
        if (configError) return configError;
      }
    }

    if (
      requiresSameOriginAuthGuard(method, path)
      && !isAllowedSameOriginAuthRequest(request, env)
    ) {
      return json({ ok: false, code: "csrf_origin_mismatch", message: "Invalid auth request origin." }, { status: 403 });
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
    if (method === "POST" && path === "/app/exchange") return await handleAppExchange(request, env);
    if (method === "GET" && path === "/me") return await handleMe(request, env);
    if (method === "GET" && path === "/me/payment-phone") return await handlePaymentPhoneStatus(request, env);
    if ((method === "PATCH" || method === "POST") && path === "/me/payment-phone") return await handleSavePaymentPhoneNumber(request, env);
    if ((method === "PATCH" || method === "POST") && path === "/me/phone-number") return await handleUpdatePhoneNumber(request, env);
    if (method === "GET" && path === "/withdraw") return await handleWithdrawCsrfIssue(request, env);
    if (method === "POST" && path === "/withdraw") return await handleWithdraw(request, env);
    if (method === "POST" && path === "/logout") return await handleLogout(request, env);
    if (method === "POST" && path === "/oauth/complete") return await handleOAuthComplete(request, env);
    if (method === "POST" && path === "/referral/kakao-share") return await handleKakaoReferralShare(request, env);

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
        message: "이미 사용 중인 이메일이에요.",
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

export const __authTestUtils = {
  handleLogin,
  handleRefresh,
  handleWithdraw,
  handleWithdrawCsrfIssue,
  clearLoginRateLimitState: () => loginRateLimitMap.clear(),
  clearWithdrawRateLimitState: () => withdrawRateLimitMap.clear(),
};

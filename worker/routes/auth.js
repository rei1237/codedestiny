import { connectDb, mongoose, requestPoolRecovery, resolveMongoDbName, withMongoRetry } from "../lib/db.js";
import { MonthlyCreditLedger, PointHistory, RefreshTokenSession, User } from "../lib/models.js";
import { MONTHLY_CREDIT_TTL_MS } from "../lib/monthly-credit-lots.js";
import { getEnv } from "../lib/env.js";
import { readThroughCredentialCache } from "../lib/credential-scoped-cache.js";
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  getAccessTokenExpiresIn,
  getAccessTokenSecret,
  getJwtAudience,
  getJwtIssuer,
  getRefreshReuseGraceMs,
  getRefreshTokenExpiresIn,
  getRefreshTokenSecret,
  isAuthDbInfraError,
  refreshSessionMatchesRequest,
  requireAuth,
  requireUserFromRequest,
  resolvePaidRouteAuth,
  normalizeUserResponse,
  signAuthToken,
  JWT_ISSUER,
} from "../lib/auth.js";
import { getRequestMeta, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson, redirect } from "../lib/http.js";
import { buildConfigErrorBody, evaluateFeatureKeyHealth } from "../lib/key-health.js";
import { buildProfilePolicySnapshot } from "../lib/profile-limits.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { hashPassword, needsPasswordRehash, verifyPassword } from "../lib/password.js";
import { checkPasswordBreached } from "../lib/password-breach.js";
import { decryptPhoneNumber, encryptPhoneNumber } from "../lib/pii-crypto.js";
import { MIN_NEW_PASSWORD_LENGTH, MIN_SELF_CONSENT_AGE, deriveNameFromEmail, validateBirthYear, validateLoginPayload, validateNewPassword, validateRegisterPayload } from "../lib/validation.js";
import {
  buildSocialSignupRedirectUrl,
  signSocialSignupTicket,
  socialProfileFromSignupTicket,
  verifySocialSignupTicket,
} from "../lib/social-signup-ticket.js";
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
// 번호 변경은 "이 번호가 이미 쓰이는가"를 409 로 알려주므로, 무제한이면 번호를 하나씩 넣어 보며
// 가입 여부를 훑을 수 있다. 정상 사용(오타 정정)에는 넉넉하고 열거에는 좁은 값으로 잡는다.
const PHONE_CHANGE_RATE_LIMIT_MAX = 5;
const PHONE_CHANGE_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_RATE_LIMIT_DEFAULT_MAX = 20;
const LOGIN_RATE_LIMIT_DEFAULT_WINDOW_MS = 60 * 1000;
const SIGNUP_MONTHLY_CREDIT_GRANT = 500;
const AUTH_TERMS_VERSION = "2026-04-11";
// 🔴 app/privacy-policy/PrivacyPolicyContent.jsx 의 PRIVACY_POLICY_EFFECTIVE_DATE 와 같아야 한다.
const AUTH_PRIVACY_VERSION = "2026-08-25";
const REFERRAL_REWARD_MONTHLY_CREDIT = 100;
const REFERRAL_DAILY_MONTHLY_CREDIT_CAP = 500;
const withdrawRateLimitMap = new Map();
const phoneChangeRateLimitMap = new Map();
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
  /* 🔴 레거시 경로 사본을 같은 응답에서 만료시켜 마이그레이션을 끝낸다.
     남겨 두면 브라우저가 두 개(Path=/ 신규, Path=/api/auth/refresh 폐기)를 함께 갖는데,
     RFC 6265 §5.4 는 긴 path 를 먼저 보내고 readCookieFromRequest 는 첫 매치를 취하므로
     **다음 refresh 가 방금 폐기된 토큰을 읽는다.** 그러면 회전 선점이 실패하고 grace window 도
     넘겨 handleRefresh 가 reuse 로 판정해 revokeAllUserRefreshSessions 를 돌린다 —
     사용자는 모든 기기에서 강제 로그아웃된다. 세션을 새로 발급하는 이 지점이 유일한 치유 시점이다.
     설정할 때 도메인을 안 붙였으므로(host-only) 지울 때도 host-only 로 맞춘다. */
  response.headers.append("Set-Cookie", buildCookieValue(REFRESH_COOKIE_NAME, "", {
    path: REFRESH_COOKIE_LEGACY_PATH,
    maxAge: 0,
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
    // 🔴 세션(refresh, 기본 14d)보다 먼저 죽으면 안 된다. 이 쿠키는 값이 아니라 **로그인 힌트**이고,
    // 클라이언트의 "로그인이 필요합니다" 분기 4곳이 이걸 보고 갈린다(index.html hasAuthSessionHint ·
    // js/destiny-profile.js _dpHasSessionHint · app/hooks/useCoinGate.ts · billing-client
    // hasClientAuthSessionHint). 고정 7일이던 시절에는 localStorage 를 지운 채 8~14일차에 돌아온
    // **정상 인증 사용자가 힌트를 잃어**, 이용권 401/403 이 그대로 "로그인이 필요합니다"로 렌더됐다.
    // refresh 쿠키와 같은 수명을 쓰면 힌트와 세션이 항상 함께 살고 함께 죽는다.
    maxAge: cookieOptions.refreshMaxAgeSec,
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

// 인증 라우트의 단계별 소요시간 계측. 지금까지 프로덕션에서 로그인 지연을 정량화할 수단이 없었다
// (성공 로그가 아예 없고 오류 로그만 있었다). 한 요청당 한 줄만 찍고, 개인정보는 담지 않는다.
// `wrangler tail | grep auth-timing` 으로 바로 읽힌다.
function createAuthTimer(routePath) {
  const startedAt = Date.now();
  let lastAt = startedAt;
  const stages = {};
  return {
    mark(stage) {
      const now = Date.now();
      stages[stage] = now - lastAt;
      lastAt = now;
    },
    log(outcome, extra = {}) {
      try {
        console.log("[auth-timing]", JSON.stringify({
          routePath,
          outcome,
          totalMs: Date.now() - startedAt,
          stages,
          ...extra,
        }));
      } catch (e) {
        // 계측 실패가 인증을 막아서는 안 된다.
      }
    },
  };
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

// getRefreshReuseGraceMs·refreshSessionMatchesRequest 는 lib/auth.js 가 정본이다.
// 예전에는 두 파일에 같은 구현이 각각 있어서, 한쪽만 고치면 읽기 경로(verifyRefreshSessionToAuth)와
// 회전 경로(여기)가 서로 다른 판정을 내는 어긋난 구간이 생겼다.

// 폴백이 준비된 rate-limit 조회 전용 상한. 인증 공용 12초와 분리한다(getLoginRateLimitState 주석).
function getLoginRateLimitReadTimeoutMs(env) {
  const raw = Number(getEnv(env, "AUTH_LOGIN_RATE_LIMIT_READ_TIMEOUT_MS", "1200"));
  if (!Number.isFinite(raw) || raw <= 0) return 1200;
  return Math.min(Math.max(Math.floor(raw), 250), 5000);
}

function getAuthConnectTimeoutMs(env) {
  const authTimeoutMs = getAuthOpTimeoutMs(env);
  const guardTimeoutMs = Number(getEnv(env, "MONGO_WORKER_CONNECT_GUARD_MS", "10000"));
  // 🔴 connectDb 는 자기 가드(MONGO_WORKER_CONNECT_GUARD_MS, 기본 10초) 안에서 끝나거나 던진다.
  // 그보다 긴 상한은 실제로 기다릴 일이 없는 '사예산'이고, 정체 구간에서 그만큼 더 매달릴 뿐이다.
  // 예전에는 serverSelection+7000 까지 max 로 잡아 15초였다 — connectDb 가 10초에 이미 포기한 뒤
  // 5초를 더 기다린 셈이다. 가드보다 아주 약간만 크게 잡아 그 초과분을 없앤다.
  return Math.max(
    authTimeoutMs,
    Number.isFinite(guardTimeoutMs) ? guardTimeoutMs + 500 : 10500,
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
    || path === "/password"
    || path === "/oauth/complete"
    || path === "/oauth/complete-signup"
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
  if (!rawNext || typeof rawNext !== "string" || rawNext.length > 1200) return null;
  if (!rawNext.startsWith("/") || rawNext.startsWith("//") || rawNext.includes("\\") || /[\u0000-\u001f\u007f]/.test(rawNext)) return null;
  try {
    const base = "https://code-destiny.invalid";
    const parsed = new URL(rawNext, base);
    if (parsed.origin !== base) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
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

/**
 * 이중 콜백(같은 code 로 두 번 들어온 경우) 응답.
 *
 * 첫 콜백이 이미 grant 를 넘겨 로그인을 끝냈으므로 둘째는 아무것도 하지 말고 사용자를
 * 원래 있던 자리로만 되돌린다. 앱 플로우에서 웹 URL 로 보내면 커스텀탭 안에 갇혀
 * "브라우저에선 로그인됐는데 앱은 로그아웃" 상태가 된다 — 앱이면 앱으로 되돌린다.
 * 앱 브리지는 social_grant 가 없으면 조용히 no-op 한다(completeMobileOAuth → deepLink:noGrant).
 */
function buildOAuthDuplicateCallbackResponse(safeFrontendBase, nextPath, appRedirect, flow) {
  const appTarget = buildAppOAuthRedirect(appRedirect, {
    flow,
    next: nextPath !== "/" ? nextPath : "",
  });
  if (appTarget) return buildAppOAuthHandoffResponse(appTarget);
  return redirect(buildOAuthFrontendUrl(safeFrontendBase, nextPath));
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


/**
 * 전화번호 제공 동의항목은 공급자 검수를 통과한 앱만 요청할 수 있다.
 *
 * 🔴 승인 전에 요청하면 카카오는 authorize 단계에서 KOE205(등록되지 않은 scope)로 거절한다 —
 * 즉 코드에 박아 두는 순간 승인이 날 때까지 **카카오 로그인이 전면 중단**된다. 승인 시점은
 * 우리가 통제하지 못하므로 요청 여부만 env 로 뺐다. 파싱·암호화·저장·백필은 이미 완성되어
 * 있어(mapSocialProfile → findOrCreateSocialUser) 이 스위치를 켜는 것 말고 할 일이 없다.
 *
 * 값은 쉼표 구분 공급자 목록이다. 승인은 공급자별로 따로 떨어지므로 개별 활성화를 허용한다.
 *   ""(기본, 요청 안 함) / "kakao" / "naver" / "kakao,naver"
 * 🔴 프로덕션 값은 worker/wrangler.toml [vars] 에 있다 — env 가 코드 기본값을 이긴다.
 */
const PHONE_SCOPE_BY_PROVIDER = { kakao: "phone_number", naver: "mobile" };

/**
 * 로그인 폼에서 만 14세 확인을 **공급자가 직접** 받는 곳.
 *
 * 카카오는 카카오계정 로그인 단계에서 만 14세 확인을 받으므로 우리 가입 화면이 같은 확인을
 * 한 번 더 물을 이유가 없다(2026-08-25 사용자 확인). 네이버·구글에는 그 단계가 없어서,
 * 그쪽은 가입 화면에서 **생년**을 받아 서버가 직접 만 14세 미만을 거른다(validateBirthYear).
 *
 * 🔴 목록에 공급자를 추가하려면 그 공급자가 실제로 그 확인을 받는지 먼저 확인할 것 —
 * 여기 들어가는 순간 우리 쪽 연령 검사가 통째로 면제된다.
 */
const AGE_VERIFIED_BY_PROVIDER = new Set(["kakao"]);

/**
 * 출생연도를 **제공 항목으로 받아오는** 공급자. 지금은 네이버뿐이다(응답 필드 `birthyear`).
 *
 * 🔴 phone 과 **같은 이유로 env 스위치를 둔다.** 2026-08-25 에 카카오 phone_number 를 콘솔에서
 * 설정하지 않은 채 scope 에 넣었다가 authorize 가 KOE205 로 거절해 스테이징 카카오 로그인이
 * 전면 중단됐다. 네이버 제공 항목도 개발자센터에서 먼저 켜야 하므로 기본값은 **요청 안 함**이다.
 *
 * 켜지 않아도 가입은 정상 동작한다 — 값이 없으면 가입 화면이 생년 입력칸을 보여준다(안전 강등).
 */
const BIRTH_YEAR_SCOPE_BY_PROVIDER = {
  naver: "birthyear",
  // 🔴 구글은 **민감 범위(sensitive scope)** 라 앱 검증(OAuth verification)이 끝나기 전에는
  // 켜지 말 것. 미검증 앱은 "확인되지 않은 앱" 경고 화면과 100명 상한에 걸려 구글 로그인
  // 자체가 망가진다 — 카카오 phone_number 를 콘솔 설정 없이 켰다가 KOE205 를 맞은 것과 같은 형태다.
  google: "https://www.googleapis.com/auth/user.birthday.read",
};

// 구글 생일은 userinfo 가 아니라 People API 에 있다.
const GOOGLE_PEOPLE_BIRTHDAY_ENDPOINT = "https://people.googleapis.com/v1/people/me?personFields=birthdays";

/**
 * 구글 People API 에서 **출생 연도**만 뽑는다.
 *
 * 🔴 연도가 없는 경우가 흔하다 — 구글 사용자는 생일을 월·일만 공개해 두는 일이 많아서
 * `date` 에 `year` 가 아예 안 오는 응답이 정상이다. 그래서 실패도 빈 값도 던지지 않고 "" 로
 * 돌려주고, 호출부는 그때 가입 화면에서 생년을 직접 묻는다(안전 강등).
 */
async function fetchGoogleBirthYear(accessToken, request, env) {
  try {
    const response = await fetchOAuthProvider(GOOGLE_PEOPLE_BIRTHDAY_ENDPOINT, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    if (!response.ok) return "";
    const data = await response.json().catch(() => null);
    const entries = Array.isArray(data?.birthdays) ? data.birthdays : [];
    // primary 를 먼저 보고, 없으면 연도가 실린 아무 항목이나 쓴다.
    const withYear = entries.filter((entry) => Number(entry?.date?.year) > 0);
    const primary = withYear.find((entry) => entry?.metadata?.primary === true) || withYear[0];
    const year = Number(primary?.date?.year);
    return Number.isFinite(year) && year > 0 ? String(year) : "";
  } catch (error) {
    logAuthDiagnostic(request, env, "/api/auth/oauth/callback", "google", "google_birthday_fetch_failed", error);
    return "";
  }
}

function birthYearScopeSuffix(provider, env) {
  const scope = BIRTH_YEAR_SCOPE_BY_PROVIDER[provider];
  if (!scope) return "";
  const enabled = String(getEnv(env, "SOCIAL_BIRTHYEAR_SCOPE_PROVIDERS") || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return enabled.includes(provider) ? ` ${scope}` : "";
}

/**
 * 공급자가 준 출생연도로 만 14세 이상인지 본다.
 * 값이 없거나 형식이 틀리면 `settled:false` 로 돌려준다 — 그때는 가입 화면이 직접 묻는다.
 */
function resolveProviderAgeVerdict(socialProfile) {
  const raw = String(socialProfile?.birthYear || "").trim();
  if (!/^\d{4}$/.test(raw)) return { settled: false, underage: false };
  const check = validateBirthYear(raw);
  if (check.age < 0) return { settled: false, underage: false };
  return { settled: check.isValid, underage: !check.isValid };
}

/**
 * 공급자 화면만 거치고 가입이 끝나는 경로의 동의 기록.
 *
 * 화면이 없어졌을 뿐 제22조 입증 기록은 그대로 남는다 — 값의 모양은 가입 마무리 화면 경로가
 * 쓰는 것과 **같아야** 한다(한쪽만 바뀌면 같은 사용자가 어느 경로로 들어왔느냐에 따라 기록이 갈린다).
 *
 * 🔴 phone 동의는 **번호가 실제로 왔을 때만** 적는다. 안 온 계정에 적으면 받지도 않은 항목에
 * 동의받았다고 기록하는 셈이고, 그 계정은 첫 결제 화면에서 따로 동의를 받는다.
 */
function buildProviderSignupConsents(hasProviderPhoneNumber) {
  const now = new Date();
  return {
    termsVersion: AUTH_TERMS_VERSION,
    termsAcceptedAt: now,
    privacyVersion: AUTH_PRIVACY_VERSION,
    privacyAcceptedAt: now,
    age14AttestedAt: now,
    ...(hasProviderPhoneNumber ? { phoneVersion: AUTH_PRIVACY_VERSION, phoneAcceptedAt: now } : {}),
  };
}

/**
 * 공급자가 준 것만으로 계정을 끝까지 만들 수 있는가.
 *
 * 이름은 mapSocialProfile 이 항상 채우고(없으면 "<provider> user"), 번호는 없어도 첫 결제 화면이
 * 받는다. 그래서 남는 조건은 **연령**뿐이다 — 카카오는 로그인 폼이 확인하고, 네이버는 birthyear 를
 * 넘긴다. 구글은 둘 다 아니므로 생년 한 칸짜리 화면으로 간다.
 */
function resolveSocialAutoSignup(provider, socialProfile) {
  const ageVerdict = resolveProviderAgeVerdict(socialProfile);
  return {
    underage: ageVerdict.underage,
    canAutoCreate: !ageVerdict.underage && (providerVerifiesAge(provider) || ageVerdict.settled),
  };
}

function providerVerifiesAge(provider) {
  return AGE_VERIFIED_BY_PROVIDER.has(String(provider || "").trim().toLowerCase());
}

/**
 * 이미 로그인한 사용자에게 전화번호 동의를 **다시** 요청하는 모드.
 *
 * 왜 필요한가: 카카오 phone_number 는 **선택 동의**라 사용자가 한 번 거부하면 다음 로그인의
 * 동의 화면에 그 항목이 다시 뜨지 않는다. 즉 로그인 scope 를 켜는 것만으로는 거부한 사용자와
 * 그 전에 가입한 사용자의 번호를 영영 못 받는다. 공급자가 그 경우를 위해 두는 것이
 * 카카오 "추가 항목 동의 받기"(추가 항목만 scope 에 실어 authorize 재요청)와
 * 네이버 auth_type=reprompt 다.
 *
 * 🔴 이 모드는 세션을 새로 발급하지 않는다 — 신원은 start 시점에 확인해 state JWT 에 싣고,
 * 콜백은 그 사용자에게 번호만 붙인다. 콜백에서 쿠키로 신원을 다시 찾지 않는 이유는
 * SameSite·앱 커스텀탭 경우의 수를 통째로 없애기 위해서다.
 */
const PHONE_CONSENT_MODE = "phone-consent";

function sanitizeOAuthMode(value) {
  return String(value || "").trim().toLowerCase() === PHONE_CONSENT_MODE ? PHONE_CONSENT_MODE : "";
}

function phoneScopeSuffix(provider, env) {
  const scope = PHONE_SCOPE_BY_PROVIDER[provider];
  if (!scope) return "";
  const enabled = String(getEnv(env, "SOCIAL_PHONE_SCOPE_PROVIDERS") || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return enabled.includes(provider) ? ` ${scope}` : "";
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
      scope: `openid email profile${birthYearScopeSuffix("google", env)}`,
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
      // mobile 이 붙으면 프로필 응답의 response.mobile / mobile_e164 가 채워진다(mapSocialProfile 이 이미 읽는다).
      scope: `name email${birthYearScopeSuffix("naver", env)}${phoneScopeSuffix("naver", env)}`,
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
      // phone_number 가 붙으면 kakao_account.phone_number 가 "+82 10-1234-5678" 형태로 온다.
      // normalizeKoreanPhoneNumber 의 82 분기가 그대로 01… 로 되돌린다(pii-crypto.js:71).
      scope: `profile_nickname account_email${phoneScopeSuffix("kakao", env)}`,
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
      // 제공 항목 "출생연도" 가 켜져 있을 때만 온다(YYYY). 없으면 가입 화면이 직접 묻는다.
      birthYear: String(profile?.birthyear || "").trim(),
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

  // 구글만 생년이 다른 엔드포인트(People API)에 있다. scope 를 요청하지 않았으면 부르지 않는다 —
  // 부르면 403 만 받고 로그인 경로에 왕복 하나를 얹는다.
  if (provider === "google" && birthYearScopeSuffix("google", env)) {
    mapped.birthYear = await fetchGoogleBirthYear(accessToken, request, env);
  }

  return mapped;
}

const EMPTY_PHONE_FIELDS = { phoneNumber: "", storedPhoneNumber: "" };

/**
 * 번호 하나를 저장 가능한 두 값(정규화 평문 · 암호화 봉투)으로 만든다.
 *
 * 🔴 encryptPhoneNumber 를 이 함수 밖에서 직접 부르지 말 것 — 정규화를 건너뛴 값이 봉투가 되면
 * 복호화 결과가 하위 소비자(결제창 customer.phoneNumber)의 기대 형식을 벗어난다.
 * 전수 강제: scripts/verify-signup-phone-required.mjs
 *
 * 형식이 어긋나면 두 값 모두 "" 이므로 호출자의 기존 검증에 그대로 걸린다.
 * 키가 없으면 throw 한다(fail-closed) — 가입·결제 경로는 그 편이 맞다.
 */
async function preparePhoneForStorage(rawValue, env) {
  const phoneNumber = normalizeKoreanPhoneNumber(rawValue);
  if (!phoneNumber) return { ...EMPTY_PHONE_FIELDS };

  const storedPhoneNumber = await encryptPhoneNumber(phoneNumber, env);
  return { phoneNumber, storedPhoneNumber };
}

// 공급자가 준 번호를 기존 계정에 채워 넣을 때 쓴다. 실패하면 빈 값을 돌려 백필을 건너뛴다.
// 🔴 여기서 throw 하면 안 된다 — 백필은 로그인의 목적이 아니라 곁다리라, 암호화 키 문제로
// 멀쩡한 소셜 "로그인"까지 막히는 건 과하다. 평문으로 폴백하지 않으므로 보안 성질은 그대로다
// (번호가 안 채워지면 첫 결제 때 입력 모달을 타고, 그 경로도 동일하게 fail-closed 다).
async function preparePhoneBackfill(value, env) {
  try {
    return await preparePhoneForStorage(value, env);
  } catch (error) {
    return { ...EMPTY_PHONE_FIELDS };
  }
}

/**
 * "번호가 없어 가입을 못 한다"를 알리는 문구.
 *
 * 🔴 앱은 dist/ 를 통째로 번들해 배포되므로, 스토어에 남은 **구버전 앱의 가입 화면에는 번호
 * 입력칸 자체가 없다**. 그 사용자에게 "정확히 입력해 주세요"라고만 하면 입력할 곳이 없어
 * 무한히 막힌다 — 앱 요청에는 업데이트 안내를 붙인다.
 */
function phoneRequiredMessage(request) {
  return isMobileAppAuthRequest(request)
    ? "가입에 휴대폰 번호가 필요해요. 앱을 최신 버전으로 업데이트한 뒤 다시 시도해 주세요."
    : "휴대폰 번호를 정확히 입력해 주세요.";
}

// 기존 소셜/이메일 유저 조회 + 연결 로직. findOrCreateSocialUser의 최초 조회와,
// 동시 생성 경합(E11000) 발생 시의 재조회 양쪽에서 재사용한다.
//
// 🔴 번호 우선순위는 **공급자 값 > 가입 화면 입력값**이고, 아래 신규 생성 분기
// (findOrCreateSocialUser)와 같아야 한다. 공급자 값은 우리 서버가 카카오/네이버 API 를 직접
// 불러 받은 값이라 사용자가 폼에 적어 보낸 값보다 신뢰도가 높다. 공급자가 번호를 주지 않는
// 경우(구글은 항상, 카카오도 동의항목 미승인 시)에는 그대로 입력값이 쓰이므로, 예전에 이
// 함수가 입력값을 통째로 버려 첫 결제마다 모달을 띄우던 문제는 그대로 막혀 있다.
async function findExistingSocialUser(provider, profile, socialField, env, signupProfile = null) {
  const signupPhoneNumber = normalizeKoreanPhoneNumber(profile.phoneNumber)
    || normalizeKoreanPhoneNumber(signupProfile?.phoneNumber);
  let user = await User.findOne({ [socialField]: profile.providerId });
  if (user) {
    if (isWithdrawnAuthUser(user)) throw new Error(`${provider}_account_withdrawn`);
    if (signupPhoneNumber && !(await decryptPhoneNumber(user.phoneNumber || user.phone, env))) {
      const backfill = await preparePhoneBackfill(signupPhoneNumber, env);
      if (backfill.storedPhoneNumber) {
        user.set("phoneNumber", backfill.storedPhoneNumber);
        user.set("phoneUpdatedAt", new Date());
        if (!user.phoneSource) user.set("phoneSource", "social");
        await user.save();
      }
    }
    return { user, created: false };
  }

  if (profile.email) {
    user = await User.findOne({ email: profile.email });
    if (user) {
      if (isWithdrawnAuthUser(user)) throw new Error(`${provider}_account_withdrawn`);
      if (profile.emailVerified !== true) {
        throw new Error(`${provider}_email_unverified`);
      }
      user.set(socialField, profile.providerId);
      user.set(`socialAccounts.${provider}.connectedAt`, new Date());
      if (!String(user.profileImage || "").trim() && String(profile.image || "").trim()) {
        user.set("profileImage", String(profile.image || "").trim());
      }
      if (signupPhoneNumber && !(await decryptPhoneNumber(user.phoneNumber || user.phone, env))) {
        const backfill = await preparePhoneBackfill(signupPhoneNumber, env);
        if (backfill.storedPhoneNumber) {
          user.set("phoneNumber", backfill.storedPhoneNumber);
          user.set("phoneUpdatedAt", new Date());
          if (!user.phoneSource) user.set("phoneSource", "social");
        }
      }
      await user.save();
      return { user, created: false };
    }
  }

  return null;
}

/**
 * @param {object} [options]
 * @param {boolean} [options.createIfMissing] false면 신규 신원일 때 계정을 만들지 않고 null을 돌려준다.
 *   만 14세 미만 판정을 위해 생년월일을 받기 전에는 계정을 만들 수 없어서 필요하다.
 * @param {object} [options.signupProfile] 가입 마무리 단계에서 받은 생년월일·시각·성별·휴대폰 번호.
 */
async function findOrCreateSocialUser(provider, profile, env, options = {}) {
  const socialField = `socialAccounts.${provider}.id`;
  const createIfMissing = options.createIfMissing !== false;
  const signupProfile = options.signupProfile || null;

  const existing = await findExistingSocialUser(provider, profile, socialField, env, signupProfile);
  if (existing) return existing;
  if (!createIfMissing) return { user: null, created: false };

  const fallbackEmail = `${provider}_${profile.providerId}@social.code-destiny.local`;
  const joinedAt = new Date();
  // 🔴 공급자가 준 번호를 먼저 쓴다 — 우리 서버가 카카오/네이버 API 에서 직접 받아 티켓에
  // 서명해 둔 값이라, 사용자가 폼에 적어 보낸 값보다 신뢰도가 높다. 공급자가 주지 않으면
  // (구글은 항상, 카카오도 동의항목 미승인 시) 가입 마무리 화면에서 받은 값이 쓰인다.
  const providerPhoneNumber = normalizeKoreanPhoneNumber(profile.phoneNumber);
  const profilePhoneNumber = providerPhoneNumber || normalizeKoreanPhoneNumber(signupProfile?.phoneNumber);
  // 저장 전 암호화. 키가 없으면 여기서 throw 되어 소셜 가입도 fail-closed 다.
  const { storedPhoneNumber } = profilePhoneNumber
    ? await preparePhoneForStorage(profilePhoneNumber, env)
    : { ...EMPTY_PHONE_FIELDS };
  let createdUser;
  try {
    createdUser = await User.create({
      name: signupProfile?.name || profile.name || `${provider} user`,
      email: profile.email || fallbackEmail,
      profileImage: String(profile.image || ""),
      ...(storedPhoneNumber
        ? {
          phoneNumber: storedPhoneNumber,
          phoneSource: providerPhoneNumber ? "social" : "signup",
          phoneUpdatedAt: joinedAt,
        }
        : {}),
      passwordHash: "",
      role: "user",
      points: 0,
      profileSubscription: buildSignupProfileSubscription(joinedAt),
      joinedAt,
      localAuth: {
        enabled: false,
        activatedAt: null,
      },
      legalConsents: signupProfile?.legalConsents || {},
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
      const raced = await findExistingSocialUser(provider, profile, socialField, env, signupProfile);
      if (raced) return raced;
    }
    throw error;
  }
  await withOptionalAuthSideEffect(recordMonthlyCreditGrantLedger({
    userId: createdUser._id,
    amount: SIGNUP_MONTHLY_CREDIT_GRANT,
    beforeBalance: 0,
    afterBalance: SIGNUP_MONTHLY_CREDIT_GRANT,
    reason: "회원가입 월정석 지급",
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
async function resolveSocialUserWithRetry(provider, profile, env, options = {}) {
  const timeoutMs = getAuthOpTimeoutMs(env);
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await withAuthOpTimeout(
        findOrCreateSocialUser(provider, profile, env, options),
        timeoutMs,
        "auth_social_resolve_user",
      );
    } catch (error) {
      lastError = error;
      const infraFailure = isAuthInfraFailure(error, ["auth_social_resolve_user"]);
      if (infraFailure && attempt < 3) {
        console.warn(`[auth/social] transient infra failure resolving ${provider} user, retrying:`, error);
        // 가드된 복구만 쓴다 — 원시 resetMongooseConnection 은 동시 요청의 소켓까지 끊는다(db.js 주석).
        requestPoolRecovery(env).catch(() => {});
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

// 레이트리밋 저장소(Mongo)가 죽었을 때의 폴백. 격리 인스턴스마다 카운터가 따로 도는 한계는
// 그대로지만, 저장소 장애가 곧 무제한 허용이 되는 것보다는 낫다.
function isRateLimitedInMemory(map, key, windowMs, max) {
  const now = Date.now();
  const state = map.get(key);

  if (!state || now > state.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  state.count += 1;
  map.set(key, state);
  return state.count > max;
}

function isWithdrawRateLimitedInMemory(key) {
  return isRateLimitedInMemory(
    withdrawRateLimitMap,
    key,
    WITHDRAW_RATE_LIMIT_WINDOW_MS,
    WITHDRAW_RATE_LIMIT_MAX,
  );
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

const PHONE_CHANGE_RATE_LIMIT_ENDPOINT = "auth_phone_change";

/**
 * 번호 변경 시도 제한. 계정 단위로 센다 — 인증이 필요한 경로라 IP 보다 정확하고,
 * 한 계정이 여러 IP 를 돌며 번호를 열거하는 것도 같이 막힌다.
 * 제한에 걸리면 429 Response 를, 아니면 null 을 돌려준다.
 */
async function enforcePhoneChangeRateLimit(request, env, userId) {
  const key = String(userId || "unknown");
  let limited = false;
  try {
    const { count } = await incrementRateLimit({
      subjectHash: key,
      endpoint: PHONE_CHANGE_RATE_LIMIT_ENDPOINT,
      windowMs: PHONE_CHANGE_RATE_LIMIT_WINDOW_MS,
      env,
    });
    limited = count > PHONE_CHANGE_RATE_LIMIT_MAX;
  } catch (error) {
    console.warn("[auth/phone-change] rate-limit store unavailable, falling back to in-memory:", error?.message || error);
    limited = isRateLimitedInMemory(
      phoneChangeRateLimitMap,
      key,
      PHONE_CHANGE_RATE_LIMIT_WINDOW_MS,
      PHONE_CHANGE_RATE_LIMIT_MAX,
    );
  }

  if (!limited) return null;
  return json({
    ok: false,
    code: "rate_limited",
    message: "번호 변경을 너무 자주 시도했어요. 잠시 후 다시 시도해 주세요.",
  }, { status: 429 });
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
    // 🔴 이 조회는 로그인 임계경로의 첫 작업인데 readRateLimitState 안에는 maxTimeMS·재시도·타임아웃이
    // 하나도 없다(worker/lib/rate-limit.js). 여기서 상한을 걸지 않으면 Mongo 가 느릴 때 소켓 타임아웃까지
    // 그대로 매달린다. 타임아웃이면 아래 catch 가 기존대로 인메모리 상태로 폴백한다.
    // 🔴 예산은 인증 공용 상한(12초)이 아니라 전용 상한(1.2초)이다.
    // 이 조회는 인덱스 하나 타는 AbuseScore.findOne 이고, 실패해도 아래 catch 가 인메모리로 폴백한다
    // (= 브루트포스 방어는 유지되고 로그인은 계속 진행된다). 그런데 12초를 주면 Mongo 가 느릴 때
    // **로그인이 시작도 못 한 채** 12초를 버린다. 폴백이 준비된 조회에 긴 예산을 줄 이유가 없다.
    // ⚠️ user lookup 과 병렬화하지 말 것 — rate-limit 이면 findOne 을 아예 안 하는 것이 의도된
    // 보안 속성이다(__tests__/worker/auth.login-security.test.js 가 이를 단언한다).
    const state = await withAuthOpTimeout(
      readRateLimitState({ subjectHash: key, endpoint: LOGIN_RATE_LIMIT_ENDPOINT, max, env }),
      getLoginRateLimitReadTimeoutMs(env),
      "auth_login_rate_limit_read",
    );
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

// 성공 로그인의 대부분은 실패 기록이 하나도 없어 지울 문서 자체가 없다. 그런 경우 deleteOne 은
// 순수한 Mongo 쓰기 낭비이므로 건너뛴다(카운트가 있을 때만 실제로 지운다).
async function clearLoginRateLimitIfRecorded(rateLimitState) {
  if (!rateLimitState?.key) return;
  if (Number(rateLimitState.count || 0) <= 0) return;
  await clearLoginRateLimit(rateLimitState);
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

// 저장값은 암호화 봉투일 수 있으므로 응답을 만들 때 복호화한다(worker/lib/pii-crypto.js).
// 복호화 실패는 "번호 없음"과 같게 취급돼 결제창 앞 재입력 경로가 그대로 돈다.
async function buildPaymentPhoneResponse(user, env, extra = {}) {
  const phoneNumber = await decryptPhoneNumber(user?.phoneNumber || user?.phone, env);
  return {
    ...extra,
    hasPhone: Boolean(phoneNumber),
    maskedPhone: phoneNumber ? maskKoreanPhoneNumber(phoneNumber) : "",
    ...(phoneNumber ? { phoneNumber } : {}),
  };
}

async function normalizeAuthUserResponse(user, env) {
  const normalized = normalizeUserResponse(user);
  const phoneNumber = await decryptPhoneNumber(user?.phoneNumber || user?.phone, env);
  return {
    ...normalized,
    profilePolicySnapshot: buildProfilePolicySnapshot(user, { source: "auth_me" }),
    termsVersion: String(user?.legalConsents?.termsVersion || ""),
    privacyVersion: String(user?.legalConsents?.privacyVersion || ""),
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

// createdBefore 를 주면 그 시각 이전에 생성된 세션만 폐기한다(로그아웃의 백그라운드 실행 전용).
// 재사용 탐지·탈퇴 등 "지금 즉시 전부 끊어야" 하는 호출은 옵션 없이 부르면 종전과 동일하다.
async function revokeAllUserRefreshSessions(userId, options = {}) {
  if (!mongoose.Types.ObjectId.isValid(String(userId || ""))) return;
  const filter = { userId: new mongoose.Types.ObjectId(String(userId)), revokedAt: null };
  if (options.createdBefore instanceof Date) {
    filter.createdAt = { $lte: options.createdBefore };
  }
  await RefreshTokenSession.updateMany(
    filter,
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
    user: await normalizeAuthUserResponse(user, env),
    nextPath: sanitizeNextPath(nextPath) || "/",
    ...(isMobileAppAuthRequest(request) ? {
      accessToken,
      tokenType: "Bearer",
      accessTokenExpiresInSec: accessExpiresInSec,
    } : {}),
    ...appRefreshTokenField(request, refreshToken),
    ...extra,
  }, { status });
  appendAuthCookies(response, request, env, accessToken, refreshToken);
  // 🔴 힌트 쿠키는 세션 쿠키와 **한 세트로** 나가야 한다. 예전에는 이 공통 경로(로그인·회원가입)가
  // appendAuthCookies 만 부르고, appendAuthRoleCookie 는 OAuth 콜백 한 곳에서만 호출됐다.
  //
  // 그래서 이메일/비밀번호로 로그인하면 httpOnly 세션 쿠키는 멀쩡히 발급되는데 힌트가 없었고,
  // 클라이언트는 힌트가 없으면 **서버에 묻지도 않고** 게스트로 단정한다
  // (app/_lib/user-session-cache.ts 의 no_auth_hint 단축 · 셸의 __cdHasAuthToken).
  // 결과: 세션이 살아 있는데 화면은 로그아웃 상태로 렌더된다. 평소에는 React 가 로그인 직후
  // localStorage 를 채워 가려졌지만, 그 쓰기가 없거나 늦은 진입(리다이렉트 직후 새 문서, 프로그램적
  // 로그인, 저장소 차단 브라우저)에서는 그대로 드러났다.
  //
  // 힌트를 서버가 발급하면 추측할 일이 없어진다 — 세션이 있으면 힌트도 있고, 함께 만료된다.
  appendAuthRoleCookie(response, request, env, user);
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
      ...(await normalizeAuthUserResponse(user, env)),
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
  // 프로덕션 경로(createAuthSuccessResponse)와 같은 이유로 힌트 쿠키를 함께 발급한다 —
  // 로컬에서만 "세션은 있는데 게스트로 보이는" 상태가 재현되면 디버깅이 헛돈다.
  appendAuthRoleCookie(response, request, env, user);
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

/**
 * 만 14세 미만은 가입 불가라 이 상태의 계정이 새로 생기지는 않는다.
 * 2026-07-29 하루 동안 운영했던 보호자 동의 절차에서 남았을 수 있는 대기 계정을
 * 잠가두기 위한 잔여 가드다. 차단 사유가 없으면 null.
 */
function buildGuardianConsentLoginBlock(user) {
  const consent = user?.guardianConsent;
  if (!consent || !consent.required) return null;
  if (consent.status === "approved") return null;

  return json({
    ok: false,
    code: "guardian_consent_required",
    guardianConsentStatus: consent.status || "pending",
    message: "이 계정은 이용할 수 없습니다. admin@code-destiny.com 으로 문의해 주세요.",
  }, { status: 403 });
}

function signupErrorResponse(request, env, status, code, message, extra = {}) {
  logSignupFailure(request, env, code, message);
  // requestId 는 logSignupFailure 가 남기는 것과 같은 값이다. 응답에도 실어야 사용자가 알려준
  // 값으로 워커 로그의 그 한 줄을 바로 찾을 수 있다(민감정보 아님, 요청마다 새로 생성).
  const requestId = String(getRequestMeta(request)?.requestId || "");
  return json({
    ok: false,
    message,
    code,
    error: code,
    ...(requestId ? { requestId } : {}),
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

  const requiredKeys = ["name", "email", "password"];
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

  // 🔴 만 나이 판정은 validateRegisterPayload 안의 생년 검사 하나다(2026-08-25). 예전에는
  // 여기에 ageAttested 체크박스 선검사가 따로 있었는데, 체크박스는 눌러서 지나가는 것이라
  // 미만 연령을 실제로 걸러내지 못했고 판정이 두 곳으로 갈라져 있었다.
  const validated = validateRegisterPayload(body);
  if (!validated.isValid) {
    // 만 14세 미만은 "다시 입력"이 아니라 "가입 불가"다 — 화면이 다르게 말할 수 있어야 한다.
    if (validated.isUnderage) {
      return signupErrorResponse(request, env, 400, "underage", validated.errors[validated.errors.length - 1]);
    }
    // 번호 하나 때문에 막힌 경우는 따로 알린다 — 뭉뚱그린 invalid_request_body 로 내보내면
    // 클라이언트가 "이름·비밀번호를 확인하세요"로 접어 버려 원인을 못 찾는다.
    const onlyPhoneMissing = validated.errors.length === 1
      && validated.errors[0] === "Phone number is invalid.";
    if (onlyPhoneMissing) {
      return signupErrorResponse(request, env, 400, "phone_required", phoneRequiredMessage(request));
    }
    return signupErrorResponse(
      request,
      env,
      400,
      "invalid_request_body",
      "Registration payload is invalid.",
      { errors: validated.errors },
    );
  }

  // 유출 목록 대조는 외부 HTTP 왕복이라 connectDb 와 **병렬로** 띄운다 — 직렬로 붙이면 가입
  // 응답이 그만큼 통째로 늘어난다. 조회 실패는 fail-open(password-breach.js 주석 참고).
  const breachCheck = checkPasswordBreached(validated.sanitized.password);

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

  if ((await breachCheck).breached) {
    return signupErrorResponse(
      request,
      env,
      400,
      "breached_password",
      "이 비밀번호는 외부 유출 목록에 있어 사용할 수 없어요. 다른 곳에서 쓰지 않는 새 비밀번호를 정해 주세요.",
    );
  }

  const { name, email, password } = validated.sanitized;
  // 🔴 번호는 필수다(2026-08-19 정책, 2026-08-15 의 "선택" 정책을 대체한다). 카카오 개인정보
  // 동의항목 심사가 "자체 회원가입에서도 전화번호를 수집할 것"을 요구하고, 개인정보처리방침도
  // 이제 필수 수집 항목으로 고지한다. 형식 검증은 validateRegisterPayload 가 이미 끝냈다.
  const phoneNumber = validated.sanitized.phoneNumber;

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
        // 🔴 재제출(응답 지연 후 재시도·뒤로가기 후 재제출)로 여기 오면 예전에는 세션만 내주고
        // 방금 입력한 번호를 버렸다. 그 계정에 번호가 없으면 첫 단건결제마다 입력 모달을 타게 된다.
        // 이미 번호가 있으면 덮어쓰지 않고, 저장이 실패해도 로그인은 막지 않는다(백필은 곁다리다).
        if (!(await decryptPhoneNumber(existing.phoneNumber || existing.phone, env))) {
          const backfill = await preparePhoneBackfill(phoneNumber, env);
          if (backfill.storedPhoneNumber) {
            try {
              // 필터에 방금 읽은 값을 함께 넣어, 그 사이 다른 요청이 번호를 채웠으면 덮어쓰지 않는다
              // (upgradeLegacyPasswordHash 가 해시에 쓰는 것과 같은 compare-and-set).
              await withAuthOpTimeout(
                User.collection.updateOne(
                  {
                    _id: existing._id,
                    // 값 없음은 ""·null·필드 자체 부재 세 가지로 존재한다(레거시 raw insert 포함).
                    ...(existing.phoneNumber
                      ? { phoneNumber: existing.phoneNumber }
                      : { phoneNumber: { $in: ["", null] } }),
                  },
                  {
                    $set: {
                      phoneNumber: backfill.storedPhoneNumber,
                      phoneSource: existing.phoneSource || "signup",
                      phoneUpdatedAt: new Date(),
                    },
                  },
                ),
                timeoutMs,
                "auth_register_existing_phone_backfill",
              );
              existing.phoneNumber = backfill.storedPhoneNumber;
            } catch (backfillError) {
              console.warn("[auth/register] phone backfill skipped:", backfillError?.message || backfillError);
            }
          }
        }
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

  // 🔴 키가 없으면 평문으로 폴백하지 않고 가입을 중단한다(fail-closed).
  // "암호화해서 보관한다"는 개인정보처리방침 문구가 조용히 거짓이 되는 쪽이 더 나쁘다.
  // 🔴 번호가 필수가 된 뒤로는 이 실패가 곧 "가입 전체 중단"이다(예전에는 번호를 실어 보낸
  // 요청만 막혔다). 배포 전 npm run verify:phone-encryption-key 로 프로덕션 키를 확인할 것.
  let storedPhoneNumber = "";
  try {
    ({ storedPhoneNumber } = await preparePhoneForStorage(phoneNumber, env));
  } catch (error) {
    return signupErrorResponse(
      request,
      env,
      503,
      "phone_encryption_unavailable",
      "휴대폰 번호를 안전하게 저장할 수 없어요. 잠시 후 다시 시도해 주세요.",
    );
  }

  let user;
  try {
    user = await withAuthOpTimeout(
      User.create({
        name,
        email,
        phoneNumber: storedPhoneNumber,
        phoneSource: "signup",
        phoneUpdatedAt: new Date(),
        passwordHash,
        role: "user",
        points: 0,
        profileSubscription: buildSignupProfileSubscription(),
        joinedAt: new Date(),
        localAuth: {
          enabled: true,
          activatedAt: new Date(),
        },
        legalConsents: {
          termsVersion: AUTH_TERMS_VERSION,
          termsAcceptedAt: new Date(),
          privacyVersion: AUTH_PRIVACY_VERSION,
          privacyAcceptedAt: new Date(),
          age14AttestedAt: new Date(),
          // 번호 수집 동의를 계정 생성과 **같은 쓰기**에 담는다(개인정보 보호법 제22조 입증책임).
          // 가입 화면의 개인정보 동의 체크가 이제 번호까지 포함해 고지하므로 같은 시점이다.
          phoneVersion: AUTH_PRIVACY_VERSION,
          phoneAcceptedAt: new Date(),
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

    // 풀 클리어·서버 선택 실패·op 타임아웃(auth_register_create_user_timeout)은 재시도가 의미 있는
    // 인프라 실패다. 예전에는 이것까지 500 으로 나가 소셜 가입 경로(handleOAuthCompleteSignup 는
    // 같은 상황을 503 으로 낸다)와 어긋났고, 클라이언트의 재시도 판단(retryable)도 못 받았다.
    return signupErrorResponse(
      request,
      env,
      isAuthDbInfraError(error) ? 503 : 500,
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
      reason: "회원가입 월정석 지급",
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

// 레거시 bcrypt 해시를 로그인 성공 시점에 PBKDF2 로 갈아끼운다(계정당 1회).
// 평문 비밀번호가 손에 있는 지점은 여기뿐이라 이전은 여기서만 가능하다.
// 🔴 실패·지연이 로그인을 막아서는 안 된다 — 자체 타임아웃을 두고 예외는 삼킨다(다음 로그인에서 재시도).
// 필터에 기존 passwordHash 를 함께 넣어, 동시에 비밀번호가 바뀐 경우 새 해시를 덮어쓰지 않는다.
async function upgradeLegacyPasswordHash(user, password, env) {
  try {
    if (!needsPasswordRehash(user?.passwordHash)) return;
    const nextHash = await hashPassword(password);
    await withAuthOpTimeout(
      User.collection.updateOne(
        { _id: user._id, passwordHash: user.passwordHash },
        { $set: { passwordHash: nextHash } },
      ),
      getAuthOpTimeoutMs(env),
      "auth_login_password_rehash",
    );
  } catch (error) {
    console.warn("[auth/login] password rehash skipped:", error?.message || error);
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

  const timer = createAuthTimer("/api/auth/login");
  const loginRateLimitState = await getLoginRateLimitState(request, email, env);
  timer.mark("rateLimitRead");
  if (loginRateLimitState.limited) {
    console.warn("[auth/login] rate limited:", {
      emailHash: hashEmailForAudit(email, env).slice(0, 12),
      retryAfterSeconds: loginRateLimitState.retryAfterSeconds,
    });
    timer.log("rate_limited");
    return buildLoginRateLimitedResponse(loginRateLimitState);
  }

  // 재시도 사이에 살아남아야 하는 비밀번호 검증 결과(아래 verifyPassword 주석 참고).
  let verifiedPasswordOk = false;
  let verifiedPasswordIdentity = "";

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await withAuthOpTimeout(connectDb(env), getAuthConnectTimeoutMs(env), "auth_login_connect_db");
      timer.mark("connectDb");

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
              guardianConsent: 1,
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
      timer.mark("findUser");
      if (!user) {
        await recordFailedLoginAttempt(loginRateLimitState);
        timer.log("invalid_credentials");
        return buildInvalidLoginResponse();
      }

      if (isWithdrawnAuthUser(user)) {
        await recordFailedLoginAttempt(loginRateLimitState);
        timer.log("withdrawn");
        return buildInvalidLoginResponse();
      }

      if (!isLocalAuthEnabled(user) || !user.passwordHash) {
        await recordFailedLoginAttempt(loginRateLimitState);
        timer.log("no_local_auth");
        return buildInvalidLoginResponse();
      }

      const legacyHash = needsPasswordRehash(user.passwordHash);
      // 🔴 재시도마다 KDF 를 다시 태우지 않는다.
      // verifyPassword 는 절대 throw 하지 않고 false 를 돌려주므로(password.js) **재시도 사유가 될 수
      // 없다** — 이 루프로 다시 들어오는 실제 경로는 세션 발급/조회 타임아웃이다. 그런데 예전에는
      // 재시도가 try 전체를 다시 돌려서, 느린 RefreshTokenSession.create 하나가 PBKDF2 600k(~89ms)나
      // 레거시 bcryptjs.compare(~270ms)를 통째로 재계산시켰다. 3회면 최악 CPU 270~810ms(레거시
      // 재해시까지 겹치면 ~1.08s)이고, 이 워커는 과거 그 CPU 로 error 1102(Worker exceeded resource
      // limits)를 맞은 이력이 있다(worker/lib/password.js 주석).
      // 같은 사용자 문서 + 같은 해시면 결과가 달라질 수 없으므로 첫 검증 결과를 그대로 쓴다.
      const passwordIdentity = `${String(user._id || "")}|${String(user.passwordHash || "")}`;
      if (verifiedPasswordIdentity !== passwordIdentity) {
        verifiedPasswordOk = await withAuthOpTimeout(
          verifyPassword(password, user.passwordHash),
          timeoutMs,
          "auth_login_verify_password",
        );
        verifiedPasswordIdentity = passwordIdentity;
        timer.mark("verifyPassword");
      }
      const passwordOk = verifiedPasswordOk;
      if (!passwordOk) {
        await recordFailedLoginAttempt(loginRateLimitState);
        timer.log("invalid_credentials", { hashKind: legacyHash ? "bcrypt" : "pbkdf2" });
        return buildInvalidLoginResponse();
      }

      // 보호자 동의를 아직 받지 못한 만 14세 미만 계정은 서비스를 이용할 수 없다.
      // guardianConsent 필드가 없는 기존 계정은 이 분기에 걸리지 않는다.
      const guardianBlock = buildGuardianConsentLoginBlock(user);
      if (guardianBlock) {
        await clearLoginRateLimit(loginRateLimitState);
        timer.log("guardian_consent_blocked");
        return guardianBlock;
      }

      // Rate-limit housekeeping doesn't gate whether the session gets issued, so run it
      // alongside session creation instead of serializing an extra DB round trip in front of it.
      // 레거시 bcrypt 해시의 PBKDF2 재해시도 같은 이유로 여기에 얹는다 — 세션 발급을 막지 않는다.
      const [, , response] = await Promise.all([
        clearLoginRateLimitIfRecorded(loginRateLimitState),
        upgradeLegacyPasswordHash(user, password, env),
        withAuthOpTimeout(
          createAuthSuccessResponse(request, env, user, 200, body?.nextPath),
          timeoutMs,
          "auth_login_issue_session",
        ),
      ]);
      timer.mark("issueSession");
      timer.log("success", { attempt, hashKind: legacyHash ? "bcrypt->pbkdf2" : "pbkdf2" });
      return response;
    } catch (error) {
      const infraFailure = isAuthInfraFailure(error, [
        "auth_login_connect_db",
        "auth_login_find_user",
        "auth_login_verify_password_timeout",
      ]);

      if (infraFailure && attempt < 3) {
        console.warn("[auth/login] transient infra failure, retrying:", error);
        // 가드된 복구만 쓴다 — 원시 resetMongooseConnection 은 동시 요청의 소켓까지 끊는다(db.js 주석).
        requestPoolRecovery(env).catch(() => {});
        await sleep(150 * attempt);
        continue;
      }

      if (infraFailure) {
        console.error("[auth/login] infrastructure failure:", error);
        timer.log("infra_failure", { attempt });
        return json({
          ok: false,
          code: "login_service_unavailable",
          message: "Login service is temporarily unavailable. Please try again.",
        }, { status: 503 });
      }

      console.error("[auth/login] normalized auth failure:", error);
      await recordFailedLoginAttempt(loginRateLimitState);
      timer.log("auth_failure", { attempt });
      return buildInvalidLoginResponse();
    }
  }

  return json({
    ok: false,
    code: "login_service_unavailable",
    message: "Login service is temporarily unavailable. Please try again.",
  }, { status: 503 });
}

/**
 * POST /api/auth/password — 로그인 상태에서 비밀번호 변경.
 *
 * 🔴 이 라우트가 없던 동안, 크롬 비밀번호 검사가 "유출됐으니 지금 바꾸세요"라고 알려도 사용자가
 * 실제로 바꿀 방법이 없었다(passwordHash 를 다루는 경로가 가입·로그인·탈퇴뿐이었다).
 *
 * 🔴 성공 시 기존 리프레시 세션을 **전부** 폐기한 뒤 이 기기에만 새 세션을 발급한다. 유출 대응의
 * 핵심이 "훔친 세션을 끊는 것"이라 순서를 바꾸면 안 된다 — 새 세션을 먼저 만들면 그것까지 폐기된다.
 */
async function handleChangePassword(request, env) {
  const timeoutMs = getAuthOpTimeoutMs(env);
  const dbMaxTimeMs = Math.max(1000, timeoutMs - 1000);
  const auth = await requireAuth(request, env);
  const userId = String(auth.userId || "");
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return json({ ok: false, code: "invalid_auth_token", message: "Invalid authentication token." }, { status: 401 });
  }

  const body = await readJson(request);
  const currentPassword = String(body?.currentPassword || "");
  const nextPassword = String(body?.newPassword || "");

  await withAuthOpTimeout(connectDb(env), timeoutMs, "auth_password_connect_db");
  const objectId = new mongoose.Types.ObjectId(userId);
  const user = await withAuthOpTimeout(
    User.collection.findOne(
      { _id: objectId },
      {
        projection: { _id: 1, name: 1, email: 1, passwordHash: 1, localAuth: 1, status: 1 },
        maxTimeMS: dbMaxTimeMs,
      },
    ),
    timeoutMs,
    "auth_password_find_user",
  );

  if (!user || isWithdrawnAuthUser(user)) {
    return json({ ok: false, code: "user_not_found", message: "User not found." }, { status: 404 });
  }

  // 소셜 전용 계정은 바꿀 비밀번호 자체가 없다. 여기서 새로 만들어 주면 소셜 계정에 이메일
  // 로그인을 붙이는 별개 기능이 되므로(가입 흐름·약관 동의를 우회한다) 명시적으로 거절한다.
  if (!isLocalAuthEnabled(user) || !user.passwordHash) {
    return json({
      ok: false,
      code: "social_account",
      message: "소셜 로그인으로 가입된 계정이에요. 비밀번호가 없어 변경할 수 없습니다.",
    }, { status: 409 });
  }

  // 현재 비밀번호 추측을 로그인과 같은 한도로 막는다(세션을 탈취당한 뒤의 권한 상승 시도 방어).
  const rateLimitState = await getLoginRateLimitState(request, user.email, env);
  if (rateLimitState.limited) {
    return buildLoginRateLimitedResponse(rateLimitState);
  }

  const currentOk = currentPassword.length >= 8 && await withAuthOpTimeout(
    verifyPassword(currentPassword, user.passwordHash),
    timeoutMs,
    "auth_password_verify_current",
  );
  if (!currentOk) {
    await recordFailedLoginAttempt(rateLimitState);
    return json({
      ok: false,
      code: "invalid_current_password",
      message: "현재 비밀번호가 올바르지 않아요.",
    }, { status: 403 });
  }

  const policy = validateNewPassword(nextPassword, { email: user.email, name: user.name });
  if (!policy.isValid) {
    return json({
      ok: false,
      code: "weak_password",
      message: `새 비밀번호는 ${MIN_NEW_PASSWORD_LENGTH}자 이상이어야 하고, 이메일·이름을 포함할 수 없어요.`,
      errors: policy.errors,
    }, { status: 400 });
  }

  if (nextPassword === currentPassword) {
    return json({
      ok: false,
      code: "same_password",
      message: "지금 쓰는 비밀번호와 다른 값을 정해 주세요.",
    }, { status: 400 });
  }

  if ((await checkPasswordBreached(nextPassword)).breached) {
    return json({
      ok: false,
      code: "breached_password",
      message: "이 비밀번호는 외부 유출 목록에 있어 사용할 수 없어요. 다른 곳에서 쓰지 않는 새 비밀번호를 정해 주세요.",
    }, { status: 400 });
  }

  // 해싱 실패는 라우터 최상위 catch 로 새면 내부 오류 문구가 그대로 실린 500 이 된다.
  // 가입 경로(handleRegister)와 같은 자리에서 같은 모양으로 처리한다.
  let nextHash = "";
  try {
    nextHash = await withAuthOpTimeout(hashPassword(nextPassword), timeoutMs, "auth_password_hash");
  } catch (error) {
    console.error("[auth/password] hash failed:", String(error?.message || error).slice(0, 240));
    return json({
      ok: false,
      code: "password_hash_failed",
      message: "비밀번호를 안전하게 저장할 수 없어요. 잠시 후 다시 시도해 주세요.",
    }, { status: isAuthDbInfraError(error) ? 503 : 500 });
  }

  await withAuthOpTimeout(
    User.collection.updateOne(
      { _id: objectId, passwordHash: user.passwordHash },
      { $set: { passwordHash: nextHash, passwordUpdatedAt: new Date() } },
    ),
    timeoutMs,
    "auth_password_update",
  );

  await clearLoginRateLimitIfRecorded(rateLimitState);
  await revokeAllUserRefreshSessions(objectId);

  return await withAuthOpTimeout(
    createAuthSuccessResponse(request, env, user, 200, "/", { passwordChanged: true }),
    timeoutMs,
    "auth_password_issue_session",
  );
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
  legalConsents: 1,
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
  /* 🔴 여기서 쿠키를 지우지 않는다(2026-08-15). GET /api/auth/me 는 **읽기 전용**이고 서버 세션을
     아무것도 바꾸지 않는데, 종전에는 이 응답에 만료 쿠키 삭제 헤더를 붙였다. 그 결과:
       ① 로그아웃 직후 재로그인하면, 그 전에 떠난 /me 요청의 늦은 401 응답이 **방금 발급된**
          access·refresh·role·csrf 쿠키를 지워 사용자가 즉시 튕겼다(증상은 app/_lib/auth-store.ts
          주석에 문자 그대로 기록돼 있다).
       ② authFetch 의 retryOn401(app/_lib/auth-client.ts)이 401 후 refresh 로 회복하려는데, /me 가
          이미 refresh 쿠키를 지워 버려 그 refresh 가 "쿠키 없음"으로 확정 실패했다 — 회복 경로를
          스스로 무력화하고 있었다.
     세션 종료 의도가 있는 logout·withdraw 와 자격증명이 확정 무효인 refresh 분기는 그대로 쿠키를
     지운다. 클라이언트도 401/확정 미인증에서 자기 상태와 힌트 쿠키(fortune_auth_role 등)를 스스로
     정리하므로(auth-client.ts clearClientAuthState · index.html __cdForceSignOut) 실해가 없다.
     🔴 되살리지 말 것 — 되살리면 위 ①②가 같이 돌아온다. */
  const timer = createAuthTimer("/api/auth/me");
  const unauthenticatedJson = (body, init) => json(body, init);
  try {
    const timeoutMs = getAuthOpTimeoutMs(env);
    const dbMaxTimeMs = Math.max(1000, timeoutMs - 1000);
    // 인증 확인과 동시에 me 응답용 User 문서를 함께 읽어(authUserDoc) 두 번째 Mongo 왕복을 없앤다.
    // access-token 경로와 refresh 폴백 경로 모두 authUserDoc가 채워진다(admin/dev 폴백만 아래에서 재조회).
    const auth = await requireUserFromRequest(request, env, { userProjection: ME_USER_PROJECTION });
    timer.mark("resolveAuth");

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
    const userDocReused = Boolean(user);
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
        timer.log("token_fallback", { userDocReused });
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
    timer.mark("loadUser");
    if (!user) {
      timer.log("user_not_found", { userDocReused });
      return unauthenticatedJson({ ok: false, code: "unauthorized", message: "User not found." }, { status: 401 });
    }
    if (isWithdrawnAuthUser(user)) {
      timer.log("withdrawn", { userDocReused });
      return unauthenticatedJson({ ok: false, code: "unauthorized", message: "User is not active." }, { status: 401 });
    }

    timer.log("authenticated", { userDocReused });
    return json({
      ok: true,
      authenticated: true,
      message: "Authenticated user loaded.",
      user: {
        ...(await normalizeAuthUserResponse(user, env)),
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
      timer.log("no_session");
      return unauthenticatedJson({
        ok: true,
        message: "No active authenticated session.",
        authenticated: false,
        user: null,
      });
    }

    if (isAuthDbInfraError(error)) {
      timer.log("degraded");
      return json({
        ok: true,
        message: "사용자 정보를 일시적으로 불러오지 못해 기본 세션 상태로 응답합니다.",
        authenticated: false,
        user: null,
        degraded: true,
        code: "AUTH_ME_DEGRADED",
      });
    }

    timer.log("recovered");
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

// 결제용 전화번호 조회에 필요한 최소 필드. 인증 리졸버가 인증 조회와 함께 읽어 authUserDoc로 돌려준다.
const PAYMENT_PHONE_USER_PROJECTION = {
  _id: 1,
  phoneNumber: 1,
  phone: 1,
  // 번호 입력 모달이 "카카오에서 가져오기" 버튼을 띄울지 판단할 재료. 이 조회는 결제창 직전
  // 경로라 왕복을 늘리지 않는 것이 중요해서, 새 엔드포인트를 만들지 않고 여기에 얹는다.
  socialAccounts: 1,
};

/**
 * 이 사용자가 **지금** 번호를 가져올 수 있는 소셜 공급자.
 *
 * 두 조건의 교집합이다: ① 계정에 그 소셜이 연결돼 있다 ② 그 공급자의 전화번호 동의항목이
 * 승인돼 scope 가 켜져 있다(SOCIAL_PHONE_SCOPE_PROVIDERS). 판정을 서버에 두는 이유는
 * 승인 상태가 env 하나로만 바뀌기 때문이다 — 네이버가 승인되면 **코드 변경 없이** 버튼이 켜진다.
 */
function resolveSocialPhoneProviders(user, env) {
  return OAUTH_PROVIDERS.filter(
    (provider) => phoneScopeSuffix(provider, env) && String(user?.socialAccounts?.[provider]?.id || ""),
  );
}

async function handlePaymentPhoneStatus(request, env) {
  const timeoutMs = getAuthOpTimeoutMs(env);
  const dbMaxTimeMs = Math.max(1000, timeoutMs - 1000);
  // 인증 확인과 같은 조회에서 결제용 전화번호까지 함께 읽는다. 이 라우트는 결제창을 여는 직전 경로라
  // 왕복 하나가 곧 체감 지연이자 일시적 503 표면적이다. (access-token 경로에서만 authUserDoc 부착)
  // 🔴 requireUserFromRequest 가 아니라 resolvePaidRouteAuth — DB 일시 장애(스테이징 2026-08-21
  // 실측: MongoDB operation timed out)를 401(로그인 필요)로 오판하지 않고 재시도 가능한 503으로
  // 표면화한다. sukuyo.js 1년운 라우트가 같은 이유로 쓰는 정본과 동일 패턴(worker/lib/auth.js
  // resolvePaidRouteAuth 머리주석).
  const auth = await resolvePaidRouteAuth(request, env, { userProjection: PAYMENT_PHONE_USER_PROJECTION });
  if (!auth) return json({ ok: false, code: "UNAUTHORIZED", message: "Authentication is required." }, { status: 401 });
  const userId = String(auth.userId || "");

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return json({ ok: false, code: "invalid_auth_token", message: "Invalid authentication token." }, { status: 401 });
  }

  let user = auth.authUserDoc || null;
  if (!user) {
    await withAuthOpTimeout(connectDb(env), timeoutMs, "auth_phone_connect_db");
    user = await withAuthOpTimeout(
      User.findById(userId)
        .select("phoneNumber phone")
        .maxTimeMS(dbMaxTimeMs)
        .lean(),
      timeoutMs,
      "auth_payment_phone_find_user",
    );
  }

  if (!user) {
    return json({ ok: false, code: "user_not_found", message: "User not found." }, { status: 404 });
  }

  return json({
    ok: true,
    socialPhoneProviders: resolveSocialPhoneProviders(user, env),
    ...(await buildPaymentPhoneResponse(user, env)),
  });
}

/**
 * 결제용 번호 **최초 등록** 쓰기. 결제 모달(POST /me/payment-phone)과 소셜 추가 동의 콜백이
 * 이 하나를 공유한다 — 암호화·phoneSource·동의 기록이 두 곳에 복사되면 한쪽이 조용히 갈라진다.
 * 이미 번호가 있으면 덮어쓰지 않는다(변경은 /me/phone-number 담당).
 */
async function savePaymentPhoneForUser({ userId, phoneNumber, source, consentedAt, env, timeoutMs, dbMaxTimeMs }) {
  if (!mongoose.Types.ObjectId.isValid(String(userId || ""))) return { outcome: "invalid_user" };

  await withAuthOpTimeout(connectDb(env), timeoutMs, "auth_phone_connect_db");
  const currentUser = await withAuthOpTimeout(
    User.findById(userId)
      .select("phoneNumber phone")
      .maxTimeMS(dbMaxTimeMs)
      .lean(),
    timeoutMs,
    "auth_payment_phone_find_current",
  );
  if (!currentUser) return { outcome: "user_not_found" };

  const currentPhoneNumber = await decryptPhoneNumber(currentUser?.phoneNumber || currentUser?.phone, env);
  if (currentPhoneNumber) return { outcome: "already_set", user: currentUser };

  // 🔴 raw driver 경로라 Mongoose setter 가 돌지 않는다 — 여기서 직접 암호화해야 한다.
  // 키가 없으면 preparePhoneForStorage 가 throw 하고, 평문으로 폴백하지 않는다(fail-closed).
  let storedPhoneNumber = "";
  try {
    ({ storedPhoneNumber } = await preparePhoneForStorage(phoneNumber, env));
  } catch (error) {
    return { outcome: "encryption_unavailable" };
  }

  // 🔴 동의를 번호와 **같은 쓰기**에 담는다(개인정보 보호법 제22조 입증책임).
  // 따로 쓰면 한쪽만 남는 창이 생긴다.
  const updatedResult = await withAuthOpTimeout(
    User.collection.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          phoneNumber: storedPhoneNumber,
          phoneSource: source,
          phoneUpdatedAt: new Date(),
          ...(consentedAt
            ? { "legalConsents.phoneVersion": AUTH_PRIVACY_VERSION, "legalConsents.phoneAcceptedAt": consentedAt }
            : {}),
        },
      },
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
  if (!user) return { outcome: "user_not_found" };
  return { outcome: "saved", user };
}

async function handleSavePaymentPhoneNumber(request, env) {
  const timeoutMs = getAuthOpTimeoutMs(env);
  const dbMaxTimeMs = Math.max(1000, timeoutMs - 1000);
  // 결제 전화번호 저장도 결제창 진입 경로다 — 위 handlePaymentPhoneStatus 와 같은 이유로
  // requireAuth(=requireUserFromRequest) 대신 resolvePaidRouteAuth 를 쓴다.
  const auth = await resolvePaidRouteAuth(request, env);
  if (!auth) return json({ ok: false, code: "UNAUTHORIZED", message: "Authentication is required." }, { status: 401 });
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

  // 🔴 여기서는 동의를 **강제하지 않는다** — 이 경로는 사용자가 이미 결제를 시작한 시점이라
  // 번호 수집의 근거가 계약 이행(제15조 1항 4호)으로도 선다. 400 으로 막으면 스토어에 남은
  // 구버전 앱이 결제를 통째로 못 하게 되는데, 그 위험이 얻는 것보다 크다.
  // 동의를 실제로 보내는 것은 렌더러 3벌이 모두 막고 있다(체크 전에는 저장 호출 자체가 없다).
  const consentedAt = body?.phoneConsent === true ? new Date() : null;
  const saved = await savePaymentPhoneForUser({
    userId,
    phoneNumber,
    source: "checkout",
    consentedAt,
    env,
    timeoutMs,
    dbMaxTimeMs,
  });

  if (saved.outcome === "invalid_user") {
    return json({ ok: false, code: "invalid_auth_token", message: "Invalid authentication token." }, { status: 401 });
  }
  if (saved.outcome === "user_not_found") {
    return json({ ok: false, code: "user_not_found", message: "User not found." }, { status: 404 });
  }
  if (saved.outcome === "encryption_unavailable") {
    return json({
      ok: false,
      code: "phone_encryption_unavailable",
      message: "휴대폰 번호를 안전하게 저장할 수 없어요. 잠시 후 다시 시도해 주세요.",
    }, { status: 503 });
  }

  return json({
    ok: true,
    updated: saved.outcome === "saved",
    ...(await buildPaymentPhoneResponse(saved.user, env)),
  });
}

/**
 * PATCH|POST /api/auth/me/phone-number — 번호 **변경**.
 *
 * 🔴 /me/payment-phone(위)과 의미가 다르다. 저쪽은 결제 모달이 쓰는 **최초 등록 전용**이라
 * 이미 번호가 있으면 updated:false 로 조용히 지나간다(재시도 멱등성이 필요하다). 이쪽은
 * 사용자가 번호를 고치는 자리라 기존 값을 덮어쓴다. 가입 때 번호가 필수가 된 이상 오타를
 * 고칠 경로가 없으면 개인정보 보호법 제36조(정정 요구권)를 만족시킬 수 없다.
 *
 * 🔴 대상은 언제나 토큰의 userId 다 — 본문의 userId 류를 읽지 않는다.
 */
async function handleChangePhoneNumber(request, env) {
  const timeoutMs = getAuthOpTimeoutMs(env);
  const dbMaxTimeMs = Math.max(1000, timeoutMs - 1000);
  const auth = await requireAuth(request, env);
  const userId = String(auth.userId || "");
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return json({ ok: false, code: "invalid_auth_token", message: "Invalid authentication token." }, { status: 401 });
  }

  await withAuthOpTimeout(connectDb(env), timeoutMs, "auth_phone_change_connect_db");

  // 세션을 쥔 쪽이 번호를 무제한으로 갈아치우지 못하게 막는다(계정 탈취 후의 연락처 세탁).
  // 🔴 새 구현을 만들지 말 것 — 탈퇴가 쓰는 레이트리밋과 같은 저장소·같은 헬퍼다.
  const rateLimited = await enforcePhoneChangeRateLimit(request, env, userId);
  if (rateLimited) return rateLimited;

  const body = await readJson(request);
  let storedPhoneNumber = "";
  let normalizedPhoneNumber = "";
  try {
    ({ storedPhoneNumber, phoneNumber: normalizedPhoneNumber } = await preparePhoneForStorage(body?.phoneNumber || body?.phone, env));
  } catch (error) {
    return json({
      ok: false,
      code: "phone_encryption_unavailable",
      message: "휴대폰 번호를 안전하게 저장할 수 없어요. 잠시 후 다시 시도해 주세요.",
    }, { status: 503 });
  }

  if (!storedPhoneNumber) {
    return json({
      ok: false,
      code: "invalid_phone_number",
      message: "휴대폰 번호를 정확히 입력해 주세요.",
    }, { status: 400 });
  }

  const objectId = new mongoose.Types.ObjectId(userId);
  const currentUser = await withAuthOpTimeout(
    User.findById(userId).select("phoneNumber phone").maxTimeMS(dbMaxTimeMs).lean(),
    timeoutMs,
    "auth_phone_change_find_current",
  );
  if (!currentUser) {
    return json({ ok: false, code: "user_not_found", message: "User not found." }, { status: 404 });
  }

  // 같은 번호를 다시 보낸 것은 오류가 아니다 — 저장 없이 현재 상태를 그대로 돌려준다.
  // 봉투끼리는 IV 가 달라 비교가 안 되므로 복호화한 평문으로 비교한다.
  const currentPhoneNumber = await decryptPhoneNumber(currentUser.phoneNumber || currentUser.phone, env);
  if (currentPhoneNumber && currentPhoneNumber === normalizedPhoneNumber) {
    return json({ ok: true, updated: false, ...(await buildPaymentPhoneResponse(currentUser, env)) });
  }

  const updatedResult = await withAuthOpTimeout(
    User.collection.findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          phoneNumber: storedPhoneNumber,
          phoneUpdatedAt: new Date(),
          // 바뀐 번호에 대해 동의 기록을 다시 남긴다 — 화면이 같은 고지를 다시 보여준다.
          "legalConsents.phoneVersion": AUTH_PRIVACY_VERSION,
          "legalConsents.phoneAcceptedAt": new Date(),
        },
      },
      {
        returnDocument: "after",
        projection: { _id: 1, phoneNumber: 1, phone: 1 },
        maxTimeMS: dbMaxTimeMs,
      },
    ),
    timeoutMs,
    "auth_phone_change_update_user",
  );

  const user = unwrapFindOneAndUpdateResult(updatedResult);
  if (!user) {
    return json({ ok: false, code: "user_not_found", message: "User not found." }, { status: 404 });
  }

  return json({ ok: true, updated: true, ...(await buildPaymentPhoneResponse(user, env)) });
}

async function handleRefresh(request, env) {
  const timer = createAuthTimer("/api/auth/refresh");
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

  // 예전에는 여기서 빈 워밍업(`withMongoRetry(env, async () => {})`)을 한 번 더 돌렸다. 바로 아래
  // 회전 선점이 이미 withMongoRetry(=connectDb + per-attempt 타임아웃 + 재연결·재시도) 안에서 돌고
  // 그 catch 가 동일한 AUTH_REFRESH_DEGRADED 503 을 반환하므로, 워밍업은 Mongo 왕복만 하나 더
  // 얹는 순수 중복이었다. 다시 넣지 말 것.
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
    timer.mark("claimRotation");
  } catch (error) {
    if (isAuthDbInfraError(error)) {
      logAuthDiagnostic(request, env, "/api/auth/refresh", "", "refresh_session_degraded", error);
      timer.log("degraded");
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
      /* 🔴 '재사용'은 **회전으로 죽은** 토큰의 재생일 때만이다(2026-08-15).
         replacedByTokenHash 는 회전만 기록하고 로그아웃·탈퇴는 "" 로 남긴다. 로그아웃으로 죽은
         토큰의 늦게 도착한 요청까지 재사용으로 보면, 사용자가 그 사이 재로그인해 만든 새 세션까지
         revokeAllUserRefreshSessions 가 쓸어 **"로그아웃 → 재로그인 → 즉시 튕김"** 이 된다.
         로그아웃이 이미 전부 폐기했으므로 여기서 한 번 더 쓰는 것은 새 세션을 죽이는 효과밖에 없다.
         🔴 보안은 그대로다 — 진짜 탈취(공격자가 회전을 선점)면 replacedByTokenHash 가 채워져 있어
         전 세션 폐기가 유지된다. **공격자가 만든 세션을 면제하지 않는다**(기준을 "제시된 토큰의
         createdAt" 으로 잡는 안은 정확히 그 세션을 면제해 의미가 뒤집힌다 — 채택하지 않은 이유).
         priorSession 이 아예 없으면(토큰 미상·조회 실패) 판별 근거가 없으므로 보수적으로 전부 끊는다. */
      const revokedByRotation = !priorSession || Boolean(priorSession.replacedByTokenHash);
      if (revokedByRotation) await revokeAllUserRefreshSessions(userId);
      timer.log(revokedByRotation ? "reuse_detected" : "stale_refresh_after_logout");
      const response = json({ ok: false, message: "Refresh token reuse detected. Please sign in again." }, { status: 401 });
      /* 🔴 낡은 토큰(로그아웃으로 죽은 것)일 때는 쿠키도 지우지 않는다. 이 요청은 재로그인 **이전에**
         출발해 옛 쿠키를 싣고 온 것이므로, 응답이 늦게 도착해 Set-Cookie 를 적용하면 그 사이 발급된
         **새 세션의 쿠키**를 지운다 — 세션 폐기를 막아도 여기서 쿠키를 지우면 결국 튕기는 건 같다.
         진짜 재사용(회전으로 죽은 토큰의 재생)은 실제 보안 사건이므로 종전대로 지운다. */
      if (revokedByRotation) clearAuthCookies(response, request, env);
      return response;
    }
  }

  if (!refreshSessionMatchesRequest(session, request)) {
    /* 🔴 이 세션은 위 회전 선점에서 **이미 revoked** 다 — 제시된 토큰은 이 시점에 죽어 있다.
       따라서 전 세션 일괄 폐기는 이 토큰을 무력화하는 데 필요하지 않고, 정당한 UA 변경(브라우저·OS
       업데이트)일 때 다른 기기까지 끊는 부수 피해만 남는다. 이 세션만 끝내고 401 을 돌려준다(2026-08-15). */
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
    timer.mark("findUser");
  } catch (error) {
    if (isAuthDbInfraError(error)) {
      logAuthDiagnostic(request, env, "/api/auth/refresh", "", "refresh_user_lookup_degraded", error);
      timer.log("degraded");
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
    timer.log("user_not_found");
    const response = json({ ok: false, message: "User not found." }, { status: 401 });
    clearAuthCookies(response, request, env);
    return response;
  }

  const accessToken = await signAuthToken(user, env);
  const nextRefresh = await issueRefreshTokenForUser(userId, env);
  // 새 세션 insert 와 이전 세션의 replacedByTokenHash 기록은 서로를 참조하지 않는다
  // (양쪽 다 nextRefresh.tokenHash 만 쓴다) — 직렬로 둘 이유가 없어 한 번에 보낸다.
  await Promise.all([
    createRefreshSession(request, env, userId, nextRefresh.tokenHash, nextRefresh.expiresAt),
    markSessionRevoked(tokenHash, {
      skipRevokedAt: true,
      replacedByTokenHash: nextRefresh.tokenHash,
    }),
  ]);
  timer.mark("rotateSession");
  timer.log("refreshed");
  const accessExpiresInSec = parseDurationToSeconds(getAccessTokenExpiresIn(env), 30 * 60);

  const response = json({
    ok: true,
    message: "Token refreshed.",
    accessToken,
    tokenType: "Bearer",
    accessTokenExpiresInSec: accessExpiresInSec,
    ...appRefreshTokenField(request, nextRefresh.refreshToken),
    user: {
      ...(await normalizeAuthUserResponse(user, env)),
      hasLocalAuth: isLocalAuthEnabled(user) && Boolean(user.passwordHash),
    },
  });
  appendAuthCookies(response, request, env, accessToken, nextRefresh.refreshToken);
  // 🔴 힌트 쿠키도 함께 재발행한다. 지우지 말 것. refresh 쿠키는 회전할 때마다 수명이 리셋되는데
  // 이 쿠키만 **최초 로그인 시각 +14일**에 고정 만료하면, 15일 넘게 연속 사용한 세션에서
  // "세션은 살아 있는데 힌트만 먼저 죽는" 구간이 생긴다. 그 구간에 들어가면 클라이언트의
  // user-session-cache 가 /api/auth/me 를 네트워크 없이 게스트로 합성해(hasClientAuthHint 부재)
  // 멀쩡한 인증 사용자가 로그아웃된 것처럼 보인다. 힌트와 세션은 항상 함께 살고 함께 죽어야 한다.
  appendAuthRoleCookie(response, request, env, user);
  return response;
}

// 세션 폐기 본체. 사용자에게 보이는 로그아웃(=쿠키 삭제)은 이 작업의 완료를 기다릴 필요가 없다.
// revokedBefore: 이 시각 이전에 만들어진 세션만 폐기한다 — 백그라운드 실행이 늦어지는 동안
// 사용자가 이미 재로그인했다면 그 새 세션까지 죽여 "로그아웃 직후 다시 로그아웃" 이 나기 때문이다.
async function revokeSessionsForLogout(request, env, refreshToken, revokedBefore) {
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
        revokeAllUserRefreshSessions(logoutUserId, { createdBefore: revokedBefore }),
        timeoutMs,
        "auth_logout_revoke_user_sessions",
      );
    }
  } catch (error) {
    logAuthDiagnostic(request, env, "/api/auth/logout", "", "logout_revoke_failed", error);
  }
}

async function handleLogout(request, env, ctx) {
  const refreshToken = readRefreshTokenFromRequest(request);
  const revokedBefore = new Date();

  // 응답(=쿠키 삭제)을 먼저 확정하고 세션 폐기는 백그라운드로 넘긴다. 예전에는 Mongo 왕복 2~5회를
  // 전부 await 한 뒤에야 응답해서, 클라이언트가 이미 로컬 상태를 지운 뒤에도 최대 수 초를 기다렸다.
  // waitUntil 이 없는 환경(테스트 등)에서는 종전처럼 완료를 기다린다.
  const revokeTask = revokeSessionsForLogout(request, env, refreshToken, revokedBefore);
  if (typeof ctx?.waitUntil === "function") {
    ctx.waitUntil(revokeTask);
  } else {
    await revokeTask;
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
          // 🔴 개인정보처리방침 6항이 "휴대폰 번호는 회원 탈퇴 시 지체 없이 파기한다"고 고지하는데
          // 예전에는 이 익명화가 번호를 그대로 남겨 고지와 코드가 어긋나 있었다.
          // 결제 기록 쪽 구매자 정보는 아래 payments 익명화가 따로 처리하므로 여기서 지워도 된다.
          phoneNumber: "",
          phoneSource: "",
          phoneUpdatedAt: null,
          birthDate: "1900-01-01",
          birthTime: "00:00",
          gender: "OTHER",
          role: "user",
          points: 0,
          status: "withdrawn",
          withdrawnAt: now,
          // 프로필 카드는 별도 컬렉션(아래 profilecards 삭제)이지만, 레거시 계정은 같은
          // 생년월일·출생지를 이 배열에도 들고 있다. 한쪽만 지우면 탈퇴 후에도 남는다.
          destinyProfiles: [],
          destinyProfilesCurrentId: "",
          destinyProfilesCurrentIdUpdatedAt: null,
          destinyProfilesLockedCurrentId: "",
          destinyProfilesLockedAt: null,
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

  /* 프로필 카드는 이름·성별·생년월일·출생시각·출생지 좌표를 담고 있고 TTL 이 없다.
     결제 이력처럼 보존해야 할 근거가 없으므로 익명화가 아니라 삭제한다 —
     동의 모달의 "프로필 카드를 삭제하시면 서버에서도 함께 삭제됩니다" 와 같은 선이다. */
  try {
    await User.db.collection("profilecards").deleteMany(
      { userId: objectId },
      { maxTimeMS: 8000 },
    );
  } catch (error) {
    partialFailure = true;
    console.error("[auth/withdraw] profile card delete failed:", error);
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
    const mode = sanitizeOAuthMode(url.searchParams.get("mode"));
    let phoneConsentUserId = "";
    if (mode === PHONE_CONSENT_MODE) {
      // 🔴 구글은 영구 미지원이다 — People API 를 붙이지 않기로 한 결정이고
      // __tests__/worker/auth.social-phone-scope.test.js 가 구글 scope 고정을 단언한다.
      if (provider === "google") {
        return json({
          ok: false,
          code: "phone_scope_unsupported",
          message: "이 소셜 계정으로는 번호를 가져올 수 없어요.",
        }, { status: 400 });
      }
      // 🔴 승인 게이트를 두 개 만들지 않는다 — 로그인 scope 를 켜는 env 하나가 이 경로의 게이트다.
      // 미승인 상태에서 열어 두면 authorize 가 KOE205 로 죽는 창을 사용자에게 보이게 된다.
      if (!phoneScopeSuffix(provider, env)) {
        return json({
          ok: false,
          code: "phone_scope_disabled",
          message: "번호 가져오기가 아직 준비되지 않았어요.",
        }, { status: 400 });
      }
      // 🔴 requireUserFromRequest 가 아니라 resolvePaidRouteAuth — 이 경로는 결제 직전이라
      // DB 일시 장애를 401(로그인 필요)로 오판하면 사용자가 손쓸 방법이 없다.
      const consentAuth = await resolvePaidRouteAuth(request, env);
      if (!consentAuth?.userId) {
        return json({ ok: false, code: "UNAUTHORIZED", message: "Authentication is required." }, { status: 401 });
      }
      phoneConsentUserId = String(consentAuth.userId);
    }
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
      ...(mode ? { mode, phoneConsentUserId } : {}),
    }, env);

    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      response_type: "code",
      scope: cfg.scope,
      state: stateToken,
    });
    if (provider === "google") params.set("prompt", "select_account");
    // 🔴 추가 동의에서는 prompt=login 을 붙이지 않는다 — 기존 카카오 세션 위에서 **새 항목만**
    // 물어야 하는데, 재로그인을 강요하면 그 화면이 아니라 로그인 화면이 뜬다.
    if (provider === "kakao" && mode !== PHONE_CONSENT_MODE) params.set("prompt", "login");
    if (mode === PHONE_CONSENT_MODE) {
      // 카카오 "추가 항목 동의 받기" 규격: 추가로 받을 항목만 scope 에 싣는다.
      if (provider === "kakao") params.set("scope", PHONE_SCOPE_BY_PROVIDER.kakao);
      // 네이버는 이미 판단이 끝난 항목을 다시 물으려면 재동의 화면을 명시해야 한다.
      if (provider === "naver") params.set("auth_type", "reprompt");
    }

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

/**
 * 아직 계정이 없는 소셜 신원을 티켓으로 만든다. 티켓의 필드는 나중에 계정을 만들 때
 * 그대로 소셜 프로필로 복원되므로, 이메일 연결 판정(hasExplicitlyUnverifiedSocialEmail)에
 * 쓰이는 emailVerified 까지 함께 보존한다.
 */
async function buildSocialSignupTicket(provider, socialProfile, statePayload, env, { nextPath, flow, appRedirect }) {
  return await signSocialSignupTicket({
    provider,
    providerId: String(socialProfile?.providerId || ""),
    email: String(socialProfile?.email || ""),
    name: String(socialProfile?.name || ""),
    image: String(socialProfile?.image || ""),
    phoneNumber: normalizeKoreanPhoneNumber(socialProfile?.phoneNumber) || "",
    // 🔴 공급자가 준 출생연도는 **티켓에** 싣는다. 클라이언트가 보낸 값을 믿으면 만 14세 검사를
    // 누구나 건너뛸 수 있다 — 서버는 언제나 이 서명된 값을 먼저 본다.
    birthYear: String(socialProfile?.birthYear || "").trim(),
    emailVerified: socialProfile?.emailVerified === true ? true : (socialProfile?.emailVerified === false ? false : null),
    nextPath: nextPath || "/",
    flow: flow || "signup",
    appRedirect: appRedirect || "",
    referralCode: normalizeReferralCode(statePayload?.referralCode),
    referralShareToken: normalizeReferralShareToken(statePayload?.referralShareToken),
    referralSource: String(statePayload?.referralSource || "").trim().toLowerCase(),
  }, getAccessTokenSecret(env), JWT_ISSUER);
}

/**
 * 보호자 동의가 끝나지 않은 계정은 소셜 로그인으로도 들어올 수 없다.
 * (이메일 로그인의 buildGuardianConsentLoginBlock 과 같은 정책을 리다이렉트로 표현한다)
 */
function buildSocialGuardianConsentRedirect(frontendBase, provider, consent) {
  const status = String(consent?.status || "pending");
  return buildOAuthFailureRedirect(frontendBase, provider, `guardian_consent_${status}`);
}

function isGuardianConsentBlocked(user) {
  const consent = user?.guardianConsent;
  if (!consent || !consent.required) return false;
  return consent.status !== "approved";
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

/**
 * 팝업을 연 창에 결과만 알리고 자기를 닫는 최소 페이지.
 *
 * 🔴 번호를 payload 에 싣지 않는다. 부모 창은 이미 GET /api/me/payment-phone 를 갖고 있어
 * 다시 물으면 되고, 그러면 PII 가 HTML 과 postMessage 를 타고 흐르지 않는다.
 */
function buildPhoneConsentResultPage(frontendBase, result) {
  const payload = JSON.stringify({ type: "cd-phone-consent", ok: result.ok === true, reason: String(result.reason || "") });
  const targetOrigin = JSON.stringify(String(frontendBase || "").replace(/\/+$/, "") || "*");
  const message = result.ok === true
    ? "번호를 가져왔어요. 이 창은 곧 닫힙니다."
    : "번호를 가져오지 못했어요. 창을 닫고 직접 입력해 주세요.";
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">`
    + `<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">`
    + `<title>전화번호 동의</title></head>`
    + `<body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;`
    + `background:#100c26;color:#f6f3ff;font-family:system-ui,-apple-system,sans-serif;font-size:14px;`
    + `line-height:1.7;text-align:center;padding:24px"><p>${message}</p>`
    + `<script>(function(){var p=${payload};try{if(window.opener)window.opener.postMessage(p,${targetOrigin});}catch(e){}`
    + `try{window.close();}catch(e){}})();</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/**
 * 추가 동의 콜백 — 공급자가 준 번호를 **state 에 실린 그 사용자**에게 붙인다.
 *
 * 🔴 소유권 검증이 이 함수의 핵심이다. providerId 가 그 계정에 연결된 소셜 id 와 다르면
 * 저장하지 않는다 — 없으면 남의 카카오 계정으로 로그인해 내 계정에 그 번호를 붙일 수 있다.
 */
async function handlePhoneConsentCallback({ request, env, provider, code, stateRaw, statePayload, frontendBase }) {
  const timeoutMs = getAuthOpTimeoutMs(env);
  const dbMaxTimeMs = Math.max(1000, timeoutMs - 1000);
  const fail = (reason) => buildPhoneConsentResultPage(frontendBase, { ok: false, reason });

  const userId = String(statePayload.phoneConsentUserId || "");
  if (!mongoose.Types.ObjectId.isValid(userId)) return fail("invalid_state");

  let socialProfile = null;
  try {
    const accessToken = await exchangeCodeForAccessToken(
      provider,
      code,
      request,
      env,
      stateRaw,
      String(statePayload.redirectUri || ""),
    );
    socialProfile = await fetchSocialProfile(provider, accessToken, request, env);
  } catch (error) {
    logAuthDiagnostic(request, env, "/api/auth/oauth/callback", provider, "phone_consent_exchange_failed", error);
    return fail("provider_error");
  }

  await withAuthOpTimeout(connectDb(env), timeoutMs, "auth_phone_connect_db");
  const user = await withAuthOpTimeout(
    User.findById(userId).select("socialAccounts").maxTimeMS(dbMaxTimeMs).lean(),
    timeoutMs,
    "auth_phone_consent_find_user",
  );
  if (!user) return fail("user_not_found");

  const linkedProviderId = String(user?.socialAccounts?.[provider]?.id || "");
  if (!linkedProviderId || linkedProviderId !== String(socialProfile?.providerId || "")) {
    return fail("account_mismatch");
  }

  const phoneNumber = normalizeKoreanPhoneNumber(socialProfile?.phoneNumber);
  // 항목만 거부한 경우다. 로그인은 멀쩡하고 번호만 안 온다 — 부모 창은 직접 입력으로 계속한다.
  if (!phoneNumber) return fail("declined");

  const saved = await savePaymentPhoneForUser({
    userId,
    phoneNumber,
    // 🔴 공급자 동의 화면 자체가 동의 근거다(제22조 입증책임).
    consentedAt: new Date(),
    source: "social",
    env,
    timeoutMs,
    dbMaxTimeMs,
  });
  if (saved.outcome !== "saved" && saved.outcome !== "already_set") return fail(saved.outcome);
  return buildPhoneConsentResultPage(frontendBase, { ok: true, reason: saved.outcome });
}

async function handleOAuthCallback(request, env, provider) {
  const frontendBase = getFrontendBaseUrl(env);

  if (!OAUTH_PROVIDERS.includes(provider)) {
    return buildOAuthFailureRedirect(frontendBase, provider, "unsupported_provider");
  }

  let exchangeFailureLogged = false;
  // 앱(Capacitor) 플로우인지 catch 블록에서도 알아야 한다. state 검증 후에 채워진다.
  // 이게 없으면 실패 시 무조건 웹 /login 으로 리다이렉트해 앱 사용자가 커스텀탭에 갇힌다.
  let appOAuthRedirect = "";
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
    appOAuthRedirect = appRedirect;

    // 🔴 이중 콜백 dedup 은 공급자 분기보다 앞에 있어야 한다.
    // 과거 이 가드가 kakao 경로 안에만 있어 google·naver 는 dedup 이 전혀 없었고,
    // 둘째 콜백이 같은 code 를 재사용하다 <provider>_token_exchange_failed 로 죽어
    // 웹 /login?authError= 로 샜다(앱에서는 로그인 실패로 보임).
    const exchangeGuard = beginOAuthCodeExchange(provider, code, stateRaw, env);
    if (exchangeGuard.blocked) {
      logKakaoCallbackMarker(request, provider, "loopGuardTriggered", { redirectTarget: nextPath });
      return buildOAuthDuplicateCallbackResponse(safeFrontendBase, nextPath, appRedirect, flow);
    }

    // 🔴 추가 동의 콜백은 로그인이 아니다 — 세션을 발급하지 않고 번호만 붙인 뒤 팝업을 닫는다.
    // 공급자 분기보다 앞에 둔다(카카오/네이버가 각자 세션 발급 경로를 갖고 있어서다).
    if (sanitizeOAuthMode(statePayload.mode) === PHONE_CONSENT_MODE) {
      return await handlePhoneConsentCallback({
        request,
        env,
        provider,
        code,
        stateRaw,
        statePayload,
        frontendBase: safeFrontendBase,
      });
    }

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
      // 🔴 2026-08-25: 공급자가 연령까지 확정해 주면 **여기서 계정을 만들고 화면을 띄우지 않는다.**
      // 예전 주석("신규 신원은 여기서 계정을 만들지 않는다 — 생년월일을 받아야…")은 그때의 사실이고,
      // 지금은 네이버가 birthyear 를, 카카오가 로그인 폼의 확인을 대신 해 준다.
      const autoSignup = resolveSocialAutoSignup(provider, socialProfile);
      const socialUser = await resolveSocialUserWithRetry(provider, socialProfile, env, {
        createIfMissing: autoSignup.canAutoCreate,
        signupProfile: autoSignup.canAutoCreate
          ? { legalConsents: buildProviderSignupConsents(Boolean(normalizeKoreanPhoneNumber(socialProfile?.phoneNumber))) }
          : null,
      });
      if (!socialUser.user) {
        // 🔴 미성년이면 티켓조차 주지 않는다. 티켓을 주면 가입 마무리 화면에서 생년을 다시 적어
        // 우회할 수 있고, 그러면 공급자가 알려 준 나이를 우리가 스스로 버리는 셈이다.
        if (autoSignup.underage) return buildOAuthFailureRedirect(safeFrontendBase, provider, "underage");
        const ticket = await buildSocialSignupTicket(provider, socialProfile, statePayload, env, {
          nextPath,
          flow,
          appRedirect,
        });
        return redirect(buildSocialSignupRedirectUrl(safeFrontendBase, ticket, {
          nextPath,
          flow,
          hasPhoneNumber: Boolean(normalizeKoreanPhoneNumber(socialProfile?.phoneNumber)),
          name: socialProfile?.name,
          // 카카오는 로그인 폼이 확인을 받고, 네이버는 출생연도를 넘겨 준다. 둘 다 아니면(구글 등)
          // 가입 화면이 생년을 직접 묻는다 — 제공 항목이 꺼져 있어 값이 안 와도 여기로 떨어진다.
          ageVerifiedByProvider: providerVerifiesAge(provider) || resolveProviderAgeVerdict(socialProfile).settled,
        }));
      }
      const user = socialUser.user;
      if (isGuardianConsentBlocked(user)) {
        return buildSocialGuardianConsentRedirect(safeFrontendBase, provider, user.guardianConsent);
      }
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
      // 카카오는 이 콜백에서 세션까지 바로 발급하는 유일한 경로다. 🔴 2026-08-25 부터 신규 신원도
      // 여기서 계정을 만든다 — 카카오 로그인 폼이 만 14세 확인과 개인정보 제공 동의를 이미 받으므로
      // 우리 화면을 한 번 더 띄울 이유가 없다. 아래 세션 발급 경로에 그대로 합류한다.
      const autoSignup = resolveSocialAutoSignup(provider, socialProfile);
      const socialUser = await resolveSocialUserWithRetry(provider, socialProfile, env, {
        createIfMissing: autoSignup.canAutoCreate,
        signupProfile: autoSignup.canAutoCreate
          ? { legalConsents: buildProviderSignupConsents(Boolean(normalizeKoreanPhoneNumber(socialProfile?.phoneNumber))) }
          : null,
      });
      if (!socialUser.user) {
        if (autoSignup.underage) return buildOAuthFailureRedirect(safeFrontendBase, provider, "underage");
        const ticket = await buildSocialSignupTicket(provider, socialProfile, statePayload, env, {
          nextPath,
          flow,
          appRedirect,
        });
        logKakaoCallbackMarker(request, provider, "signupTicketIssued");
        return redirect(buildSocialSignupRedirectUrl(safeFrontendBase, ticket, {
          nextPath,
          flow,
          hasPhoneNumber: Boolean(normalizeKoreanPhoneNumber(socialProfile?.phoneNumber)),
          name: socialProfile?.name,
          // 카카오는 로그인 폼이 확인을 받고, 네이버는 출생연도를 넘겨 준다. 둘 다 아니면(구글 등)
          // 가입 화면이 생년을 직접 묻는다 — 제공 항목이 꺼져 있어 값이 안 와도 여기로 떨어진다.
          ageVerifiedByProvider: providerVerifiesAge(provider) || resolveProviderAgeVerdict(socialProfile).settled,
        }));
      }
      const user = socialUser.user;
      logKakaoCallbackMarker(request, provider, "userResolved");
      if (isGuardianConsentBlocked(user)) {
        return buildSocialGuardianConsentRedirect(safeFrontendBase, provider, user.guardianConsent);
      }

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
    // 앱 플로우는 웹 /login 에러 페이지로 보내지 않는다. 커스텀탭에 갇히는 대신 앱으로 되돌린다.
    // 특히 아이솔레이트가 갈려 위 dedup 을 통과한 둘째 콜백은 code 가 이미 소진돼 여기로 오는데,
    // 그때 첫 콜백은 이미 로그인을 끝냈으므로 앱으로 돌아가면 정상 상태다.
    const appFailureTarget = buildAppOAuthRedirect(appOAuthRedirect, { social_error: reason });
    if (appFailureTarget) return buildAppOAuthHandoffResponse(appFailureTarget);
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
                guardianConsent: 1,
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

        const guardianBlock = buildGuardianConsentLoginBlock(user);
        if (guardianBlock) return guardianBlock;

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
          user: await normalizeAuthUserResponse(user, env),
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
          // 가드된 복구만 쓴다 — 원시 resetMongooseConnection 은 동시 요청의 소켓까지 끊는다(db.js 주석).
          requestPoolRecovery(env).catch(() => {});
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

/**
 * 소셜 가입 마무리 — 콜백이 넘긴 티켓 + 생년월일로 이제야 계정을 만든다.
 * 만 14세 미만이면 이메일 가입과 똑같이 보호자 동의 대기 상태로 만들고 세션을 주지 않는다.
 */
async function handleOAuthCompleteSignup(request, env) {
  const timeoutMs = getAuthOpTimeoutMs(env);

  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    return signupErrorResponse(request, env, 400, "invalid_request_body", "Request body must be valid JSON.");
  }

  const ticketRaw = String(body?.socialSignupTicket || body?.socialSignup || "");
  if (!ticketRaw) {
    return signupErrorResponse(
      request,
      env,
      400,
      "invalid_social_signup_ticket",
      "소셜 가입 정보를 확인할 수 없습니다. 소셜 인증부터 다시 진행해 주세요.",
    );
  }

  let ticket;
  try {
    ticket = await verifySocialSignupTicket(ticketRaw, getAccessTokenSecret(env), JWT_ISSUER);
  } catch (error) {
    return signupErrorResponse(
      request,
      env,
      400,
      "invalid_social_signup_ticket",
      "소셜 가입 링크가 만료되었습니다. 소셜 인증부터 다시 진행해 주세요.",
    );
  }

  const provider = String(ticket.provider || "").trim().toLowerCase();
  if (!OAUTH_PROVIDERS.includes(provider)) {
    return signupErrorResponse(request, env, 400, "invalid_social_signup_ticket", "지원하지 않는 소셜 로그인입니다.");
  }

  // 약관·개인정보 동의는 공급자가 대신 받아 줄 수 없다 — 우리 약관과 우리 방침이기 때문이다.
  if (body?.termsAccepted !== true || body?.privacyAccepted !== true) {
    return signupErrorResponse(
      request,
      env,
      400,
      "invalid_birth_date",
      "Required signup consent is missing.",
    );
  }

  // 🔴 만 14세 판정은 **공급자별로 갈린다**(2026-08-25). 카카오는 카카오계정 로그인이 이미
  // 그 확인을 받으므로 면제하고, 네이버·구글은 그 단계가 없어 생년을 받아 서버가 직접 거른다.
  // 판정 근거를 body 가 아니라 **티켓의 provider** 로 삼는 것이 핵심이다 — 화면이 보낸
  // social_age 를 믿으면 누구나 붙여서 검사를 건너뛸 수 있다.
  if (!providerVerifiesAge(provider)) {
    // 🔴 공급자가 준 값(티켓, 서명됨)이 있으면 그것이 우선이다. 없을 때만 화면이 보낸 값을 본다 —
    // 순서가 뒤집히면 네이버 사용자가 자기 출생연도를 아무 값으로 덮어써 검사를 건너뛸 수 있다.
    const providerBirthYear = String(ticket?.birthYear || "").trim();
    const birthYearCheck = validateBirthYear(providerBirthYear || body?.birthYear);
    if (!birthYearCheck.isValid) {
      const isUnderage = birthYearCheck.age >= 0 && birthYearCheck.age < MIN_SELF_CONSENT_AGE;
      return signupErrorResponse(
        request,
        env,
        400,
        isUnderage ? "underage" : "invalid_birth_date",
        birthYearCheck.error,
      );
    }
  }

  // 🔴 가입 화면은 이름을 받지 않는다(2026-08-25) — 티켓의 공급자 이름이 정본이고, 그마저
  // 너무 짧으면 이메일 아이디에서 만든다. 여기서 400 을 내면 이름 칸이 없는 화면에서
  // 사용자가 고칠 방법이 없는 오류가 된다.
  const providerName = String(ticket?.name || "").trim().slice(0, 40);
  const signupName = providerName.length >= 2
    ? providerName
    : (deriveNameFromEmail(ticket?.email) || `${provider} user`);

  // 🔴 휴대폰 번호는 필수다(2026-08-19 정책). 값의 출처는 둘이고 우선순위가 있다.
  //   ① 티켓의 번호 — 공급자(카카오·네이버)가 자기 동의 절차로 넘긴 값을 **우리 서버가** 공급자
  //      API 에서 직접 받아 서명해 둔 것이다. 클라이언트를 거치지 않으므로 이쪽이 우선이다.
  //   ② 본문의 번호 — 공급자가 주지 않을 때(구글은 항상, 카카오도 동의항목 미승인 시) 가입
  //      마무리 화면에서 사용자가 직접 입력한 값.
  // 둘 다 없으면 계정을 만들지 않는다. 실제 우선순위 적용은 findOrCreateSocialUser 한 곳이다.
  // 🔴 소셜 가입은 번호 없이도 끝난다(2026-08-25). 공급자가 준 값이 있으면 쓰고, 없으면
  // (구글) 번호 없이 계정을 만든 뒤 **첫 카드 결제 화면**에서 받는다 — 그 경로는 이미 있고
  // 개인정보처리방침도 그 수집 방법을 고지한다.
  // 🔴 이메일 가입은 그대로 번호 필수다(validateRegisterPayload) — 카카오 동의항목 심사가 보는
  // 것이 "**자체** 회원가입 프로세스에서도 수집하는가" 라서, 그쪽을 완화하면 요건이 깨진다.
  const ticketPhoneNumber = normalizeKoreanPhoneNumber(ticket?.phoneNumber);
  const bodyPhoneNumber = normalizeKoreanPhoneNumber(body?.phoneNumber || body?.phone);

  try {
    await withAuthOpTimeout(connectDb(env), timeoutMs, "auth_social_signup_connect_db");
  } catch (error) {
    return signupErrorResponse(request, env, 503, "db_connection_failed", toErrorMessage(error) || "Database connection failed.");
  }

  const signupProfile = {
    name: signupName,
    phoneNumber: bodyPhoneNumber,
    legalConsents: {
      termsVersion: AUTH_TERMS_VERSION,
      termsAcceptedAt: new Date(),
      privacyVersion: AUTH_PRIVACY_VERSION,
      privacyAcceptedAt: new Date(),
      age14AttestedAt: new Date(),
      // 번호 수집 동의를 계정 생성과 같은 쓰기에 담는다(개인정보 보호법 제22조 입증책임).
      phoneVersion: AUTH_PRIVACY_VERSION,
      phoneAcceptedAt: new Date(),
    },
  };

  let socialUser;
  try {
    socialUser = await resolveSocialUserWithRetry(
      provider,
      socialProfileFromSignupTicket(ticket),
      env,
      { createIfMissing: true, signupProfile },
    );
  } catch (error) {
    return signupErrorResponse(request, env, 503, "db_write_failed", toErrorMessage(error) || "Failed to create user.");
  }

  const user = socialUser?.user;
  if (!user) {
    return signupErrorResponse(request, env, 500, "unknown_error", "Failed to create social account.");
  }

  // 티켓 재제출·동시 콜백 경합으로 과거 보호자 동의 대기 계정을 받았다면 세션을 주지 않는다.
  if (isGuardianConsentBlocked(user)) {
    return signupErrorResponse(
      request,
      env,
      403,
      "guardian_consent_required",
      "이 계정은 이용할 수 없습니다. admin@code-destiny.com 으로 문의해 주세요.",
    );
  }

  const nextPath = sanitizeOAuthNextPath(ticket.nextPath);
  const flow = sanitizeAuthFlow(ticket.flow);
  const referralReward = await applySocialOAuthReferralReward(request, env, user, {
    isNewUser: !!socialUser.created,
    flow,
    referralCode: normalizeReferralCode(ticket.referralCode),
    referralShareToken: normalizeReferralShareToken(ticket.referralShareToken),
    referralSource: String(ticket.referralSource || "").trim().toLowerCase(),
  }, null, timeoutMs);

  // 앱(Capacitor)에서 시작한 가입은 커스텀탭 웹 화면에서 끝난다. 앱으로 돌아가려면
  // 구버전 브릿지가 이해하는 형식(social_grant 딥링크)을 그대로 만들어 프론트에 넘긴다.
  const appRedirect = sanitizeAppOAuthRedirect(ticket.appRedirect);
  let appRedirectUrl = "";
  if (appRedirect) {
    const grant = await signSocialGrant({
      userId: String(user._id),
      provider,
      nextPath,
      flow,
      isNewUser: !!socialUser.created,
    }, env);
    appRedirectUrl = buildAppOAuthRedirect(appRedirect, {
      social_grant: grant,
      flow,
      next: nextPath !== "/" ? nextPath : "",
    }) || "";
  }

  return await withAuthOpTimeout(
    createAuthSuccessResponse(request, env, user, 201, nextPath, {
      provider,
      ...(referralReward ? { referralReward } : {}),
      ...(appRedirectUrl ? { appRedirectUrl } : {}),
    }),
    timeoutMs,
    "auth_social_signup_issue_session",
  );
}

// ctx 는 로그아웃의 세션 폐기를 waitUntil 백그라운드로 넘기기 위해서만 쓴다(없으면 종전대로 동기 처리).
export async function handleAuthRoutes(request, env, ctx) {
  let path = "";
  try {
    const method = request.method.toUpperCase();
    path = getRoutePath(request, "/api/auth");

    if (
      path === "/register"
      || path === "/login"
      || path === "/refresh"
      || path === "/withdraw"
      || path === "/password"
      || path === "/oauth/complete"
      || path === "/oauth/complete-signup"
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
    if (method === "POST" && path === "/login") return await handleLogin(request, env);
    if (method === "POST" && path === "/refresh") return await handleRefresh(request, env);
    // 🔴 handleMe 를 직접 부르지 않는다. 엣지 캐시를 지나며, 캐시할 수 없는 응답(401·degraded·
    // Set-Cookie 동반)은 래퍼가 그대로 통과시킨다. 근거와 안전조건은
    // worker/lib/credential-scoped-cache.js.
    if (method === "GET" && path === "/me") {
      return await readThroughCredentialCache({
        request,
        env,
        prefix: "auth-me:v1",
        handler: handleMe,
        isCacheable: (body) => body.authenticated === true,
      });
    }
    if (method === "GET" && path === "/me/payment-phone") return await handlePaymentPhoneStatus(request, env);
    if ((method === "PATCH" || method === "POST") && path === "/me/payment-phone") return await handleSavePaymentPhoneNumber(request, env);
    if ((method === "PATCH" || method === "POST") && path === "/me/phone-number") return await handleChangePhoneNumber(request, env);
    if (method === "POST" && path === "/password") return await handleChangePassword(request, env);
    if (method === "GET" && path === "/withdraw") return await handleWithdrawCsrfIssue(request, env);
    if (method === "POST" && path === "/withdraw") return await handleWithdraw(request, env);
    if (method === "POST" && path === "/logout") return await handleLogout(request, env, ctx);
    if (method === "POST" && path === "/oauth/complete") return await handleOAuthComplete(request, env);
    if (method === "POST" && path === "/oauth/complete-signup") return await handleOAuthCompleteSignup(request, env);
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
  handleRegister,
  handleChangePassword,
  handleRefresh,
  handleWithdraw,
  handleWithdrawCsrfIssue,
  handleChangePhoneNumber,
  handleSavePaymentPhoneNumber,
  handlePaymentPhoneStatus,
  handleOAuthStart,
  handleOAuthCallback,
  handleOAuthCompleteSignup,
  resolveSocialAutoSignup,
  findOrCreateSocialUser,
  buildProviderConfig,
  clearLoginRateLimitState: () => loginRateLimitMap.clear(),
  clearWithdrawRateLimitState: () => withdrawRateLimitMap.clear(),
  clearPhoneChangeRateLimitState: () => phoneChangeRateLimitMap.clear(),
};

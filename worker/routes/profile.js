import { connectDb } from "../lib/db.js";
import { requireUserFromRequest } from "../lib/auth.js";
import { PointHistory, ProfileCard, User } from "../lib/models.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import {
  normalizeHoneyPassEntitlement,
  resolveCurrentProfileId as resolveCurrentId,
  resolveProfileLimitForClient,
  resolveSingleProfileAccess,
} from "../lib/profile-limits.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import {
  PROFILE_CARD_DELETE_COST_COINS,
  PROFILE_CARD_DELETE_COST_KRW,
  PROFILE_CARD_DELETE_COST_MONTHLY_STONES,
  PROFILE_CARD_MUTATION_ACTIONS,
  getProfileCardMutationPolicy,
  resolveProfileCardActionAccess,
} from "../lib/profile-card-mutation-policy.js";
import { enforceSensitiveEndpointSecurity } from "../lib/security/index.js";

const MAX_PROFILE_ID_LEN = 80;
const MAX_NAME_LEN = 80;
const PROFILE_CARD_MANAGE_FEATURE_KEY = "profile-card-manage";
const PROFILE_CARD_MANAGE_COST = PROFILE_CARD_DELETE_COST_COINS;
const PROFILE_CARD_MANAGE_AMOUNT_KRW = PROFILE_CARD_DELETE_COST_KRW;
const PROFILE_CARD_MANAGE_MEMBERSHIP_COST = PROFILE_CARD_DELETE_COST_MONTHLY_STONES || calculateMembershipCreditCost(PROFILE_CARD_MANAGE_COST);

function sanitizeString(value, maxLen) {
  return String(value || "").trim().slice(0, maxLen);
}

async function enforceProfileRouteSecurity(request, env, auth, method, path) {
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(method)) return { ok: true };
  return enforceSensitiveEndpointSecurity({
    env,
    request,
    userId: auth?.userId || auth?.id || "",
    endpoint: `profile:${method}:${path}`,
    allowedMethods: [method],
    requireJson: method !== "DELETE",
    rateLimit: { limit: 10, windowSeconds: 10 * 60 },
    rateLimitKey: `${auth?.userId || auth?.id || "anonymous"}:profile:${method}`,
  });
}

function sanitizeProfileId(value) {
  return sanitizeString(value, MAX_PROFILE_ID_LEN).replace(/\s+/g, "_");
}

function sanitizeName(value) {
  return sanitizeString(value, MAX_NAME_LEN) || "이름 없음";
}

function sanitizeGender(value) {
  const normalized = String(value || "OTHER").trim().toUpperCase();
  if (normalized === "M" || normalized === "F") return normalized;
  return "OTHER";
}

function pickNonEmpty(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function parseBirthDateText(value) {
  const text = pickNonEmpty(value);
  if (!text) return null;
  const compact = text.replace(/\s+/g, "");
  const normalized = compact.match(/^(\d{4})[-./]?(\d{2})[-./]?(\d{2})$/);
  if (!normalized) return null;
  const year = Number(normalized[1]);
  const month = Number(normalized[2]);
  const day = Number(normalized[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return { year, month, day };
}

function parseBirthTimeText(value) {
  const text = pickNonEmpty(value);
  if (!text) return null;
  const normalized = text.replace(/\s+/g, "");
  const match = normalized.match(/^(\d{2}):?(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return { hour, minute };
}

function sanitizeInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.trunc(n);
  if (i < min) return min;
  if (i > max) return max;
  return i;
}

function sanitizeFloat(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function sanitizeCalType(value) {
  const calType = String(value || "solar").trim().toLowerCase();
  if (calType === "lunar" || calType === "lunar_leap") return calType;
  return "solar";
}

function isValidBirthDateParts(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1000 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return dt.getUTCFullYear() === year && (dt.getUTCMonth() + 1) === month && dt.getUTCDate() === day;
}

function validateRequiredBirth(rawProfile) {
  const source = rawProfile && typeof rawProfile === "object" ? rawProfile : {};
  const birth = source.birth && typeof source.birth === "object" ? source.birth : {};

  const parsedDate = parseBirthDateText(
    source.birthDate
    || source.birthIso
    || source.solarDate
    || birth.birthDate
    || birth.solarDate
    || birth.lunarDate
    || source.date,
  );
  const parsedTime = parseBirthTimeText(
    source.birthTime
    || birth.birthTime
    || birth.time
    || source.time,
  );

  const hasDateParts = birth.year !== undefined && birth.month !== undefined && birth.day !== undefined;
  const hasTimeParts = birth.hour !== undefined && birth.minute !== undefined;

  if (!hasDateParts && !parsedDate) {
    return { ok: false, message: "생년월일을 YYYYMMDD 숫자 8자리로 입력해 주세요." };
  }
  if (!hasTimeParts && !parsedTime) {
    return { ok: false, message: "출생 시간을 HH:mm 형식으로 입력해 주세요." };
  }

  const year = Number(hasDateParts ? birth.year : parsedDate?.year);
  const month = Number(hasDateParts ? birth.month : parsedDate?.month);
  const day = Number(hasDateParts ? birth.day : parsedDate?.day);

  if (!isValidBirthDateParts(year, month, day)) {
    return { ok: false, message: "생년월일을 YYYYMMDD 숫자 8자리로 입력해 주세요." };
  }

  const hour = Number(hasTimeParts ? birth.hour : parsedTime?.hour);
  const minute = Number(hasTimeParts ? birth.minute : parsedTime?.minute);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    return { ok: false, message: "출생 시간을 HH:mm 형식으로 입력해 주세요." };
  }

  return {
    ok: true,
    birth: {
      year,
      month,
      day,
      hour,
      minute,
      calType: sanitizeCalType(birth.calType || source.calType || source.calendarType),
    },
  };
}

function buildProfileId(rawProfileId, fallbackIndex) {
  const profileId = sanitizeProfileId(rawProfileId);
  if (profileId) return profileId;
  return `dp_${Date.now()}_${fallbackIndex}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeIncomingProfile(raw, index) {
  const source = raw && typeof raw === "object" ? raw : {};
  const birth = source.birth && typeof source.birth === "object" ? source.birth : {};
  const location = source.location && typeof source.location === "object" ? source.location : {};
  const parsedDate = parseBirthDateText(
    source.birthDate
    || source.birthIso
    || source.solarDate
    || birth.birthDate
    || birth.solarDate
    || birth.lunarDate
    || source.date
  );
  const parsedTime = parseBirthTimeText(source.birthTime || birth.birthTime || birth.time || source.time);

  return {
    profileId: buildProfileId(source.profileId || source.id, index),
    name: sanitizeName(source.name),
    gender: sanitizeGender(source.gender),
    birth: {
      year: sanitizeInt(birth.year ?? parsedDate?.year, 1000, 9999, 1900),
      month: sanitizeInt(birth.month ?? parsedDate?.month, 1, 12, 1),
      day: sanitizeInt(birth.day ?? parsedDate?.day, 1, 31, 1),
      hour: sanitizeInt(birth.hour ?? parsedTime?.hour, 0, 23, 0),
      minute: sanitizeInt(birth.minute ?? parsedTime?.minute, 0, 59, 0),
      calType: sanitizeCalType(birth.calType || source.calType || source.calendarType),
    },
    location: {
      label: sanitizeString(location.label, 120),
      tz: sanitizeString(location.tz, 80) || "Asia/Seoul",
      lng: sanitizeFloat(location.lng, -180, 180, 127.0),
      lat: sanitizeFloat(location.lat, -90, 90, 37.5),
    },
  };
}

function resolveSubscriptionPolicy(user) {
  const entitlement = normalizeHoneyPassEntitlement(user || {});
  const rawTier = resolveStoredSubscriptionTier(user);

  return {
    tier: entitlement.isActive ? entitlement.tier : "free",
    rawTier,
    label: entitlement.label,
    isActive: entitlement.isActive,
    freeLimit: entitlement.maxCoveredCoin,
    profileLimit: entitlement.maxProfiles,
    source: entitlement.source,
    startedAt: entitlement.startedAt || null,
    expiresAt: entitlement.expiresAt,
  };
}

function canCreateProfileWithinSubscriptionLimit(subscription, currentCount) {
  const limit = resolveProfileLimitForClient(subscription);
  if (limit <= 0) return true;
  const count = Math.max(0, Math.floor(Number(currentCount || 0)));
  return count < limit;
}

function getRemainingProfileActionCoins(user) {
  const creditBalance = Number(user?.profileSubscription?.membershipCreditBalance);
  if (Number.isFinite(creditBalance) && creditBalance > 0) return Math.max(0, Math.floor(creditBalance / 10));
  return Math.max(0, Math.floor(Number(user?.points || 0)));
}

function resolveStoredSubscriptionTier(user = {}) {
  const sources = [
    user?.profileSubscription,
    user?.subscription,
    user?.membership,
    user?.pass,
    user?.entitlement,
    user,
  ].filter((source) => source && typeof source === "object");

  for (const source of sources) {
    const values = [
      source.tier,
      source.plan,
      source.planId,
      source.productId,
      source.subscriptionTier,
      source.membershipTier,
      source.passTier,
      source.label,
    ];
    for (const value of values) {
      const text = String(value || "").trim().toLowerCase();
      if (!text || text === "free" || text === "none") continue;
      if (text === "gold" || text === "vvip" || text.includes("vvip") || text.includes("轅?⑥?")) return "vvip";
      if (text.includes("family")) return "family";
      if (text === "silver" || text === "premium" || text.includes("premium") || text.includes("?꾨━誘몄뾼")) return "premium";
      if (text === "bronze" || text === "standard" || text.includes("standard") || text.includes("?ㅽ깲?ㅻ뱶")) return "standard";
    }
  }

  return "free";
}

function toClientProfile(doc) {
  const year = Number(doc?.birth?.year || 1900);
  const month = Number(doc?.birth?.month || 1);
  const day = Number(doc?.birth?.day || 1);
  const hour = Number(doc?.birth?.hour || 0);
  const minute = Number(doc?.birth?.minute || 0);
  const calendarType = sanitizeCalType(doc?.birth?.calType);
  const birthDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const birthTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  return {
    id: String(doc.profileId || ""),
    profileId: String(doc.profileId || ""),
    userId: String(doc.userId || ""),
    name: String(doc.name || "이름 없음"),
    gender: sanitizeGender(doc.gender),
    birthDate,
    birthTime,
    calendarType,
    isDefault: false,
    selected: false,
    birthIso: `${birthDate} ${birthTime}`,
    birth: {
      year,
      month,
      day,
      hour,
      minute,
      calType: calendarType,
    },
    location: {
      label: String(doc?.location?.label || ""),
      tz: String(doc?.location?.tz || "Asia/Seoul"),
      lng: Number(doc?.location?.lng || 127.0),
      lat: Number(doc?.location?.lat || 37.5),
    },
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  };
}

async function listUserProfiles(userId) {
  const docs = await ProfileCard.find({ userId }).sort({ createdAt: 1 }).lean();
  return docs.map(toClientProfile);
}

function markCurrentProfile(profiles, currentId) {
  const selectedId = String(currentId || "").trim();
  return profiles.map((profile) => ({
    ...profile,
    isDefault: Boolean(selectedId && String(profile?.id || profile?.profileId || "") === selectedId),
    selected: Boolean(selectedId && String(profile?.id || profile?.profileId || "") === selectedId),
  }));
}

function buildProfilePaymentRequestId(action, profileId) {
  return `profile-card:${String(action || "manage").trim()}:${sanitizeProfileId(profileId) || Date.now().toString(36)}`.slice(0, 120);
}

function profilePaymentRequiredResponse(action, requestId) {
  const reason = action === "delete" ? "프로필 카드 삭제" : "프로필 카드 추가";
  return json({
    ok: false,
    success: false,
    code: "PAYMENT_REQUIRED",
    message: "프로필 카드 추가/삭제는 5,000원 단건 결제 또는 월정석으로 진행할 수 있습니다.",
    pricing: {
      featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
      reason,
      cost: PROFILE_CARD_MANAGE_COST,
      coinPrice: PROFILE_CARD_MANAGE_COST,
      membershipCreditCost: PROFILE_CARD_MANAGE_MEMBERSHIP_COST,
      amountKRW: PROFILE_CARD_MANAGE_AMOUNT_KRW,
      cashPrice: PROFILE_CARD_MANAGE_AMOUNT_KRW,
      forceDeduct: true,
    },
    checkout: {
      endpoint: "/api/billing/checkout",
      payload: {
        paymentType: "digital_content",
        featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
        reason,
        paymentAmount: PROFILE_CARD_MANAGE_AMOUNT_KRW,
        coinPrice: PROFILE_CARD_MANAGE_COST,
        membershipCreditCost: PROFILE_CARD_MANAGE_MEMBERSHIP_COST,
        requestId,
      },
    },
  }, { status: 402 });
}

function resolveProfileMutationActionType(action) {
  if (action === PROFILE_CARD_MUTATION_ACTIONS.DELETE) return "profile_card_delete";
  return "profile_card_add_extra";
}

function resolveProfileMutationReason(action) {
  if (action === PROFILE_CARD_MUTATION_ACTIONS.DELETE) return "프로필 카드 삭제";
  return "프로필 카드 추가";
}

function readProfileMutationRequestId(body, action, profileId) {
  const explicitRequestId = sanitizeString(
    body?.requestId
      || body?.payment?.requestId
      || body?.consume?.requestId
      || body?.accessGrant?.requestId
      || body?._paymentContext?.requestId
      || "",
    120,
  );
  if (explicitRequestId) return explicitRequestId;
  if (action === PROFILE_CARD_MUTATION_ACTIONS.DELETE) {
    return `profile-card:${action}:${sanitizeProfileId(profileId)}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`.slice(0, 120);
  }
  return buildProfilePaymentRequestId(action, profileId);
}

function resolveProfileMutationPaymentMethod(body = {}) {
  const accessGrant = body?.accessGrant && typeof body.accessGrant === "object" ? body.accessGrant : {};
  const payment = body?.payment && typeof body.payment === "object" ? body.payment : {};
  const text = String(
    body?.paymentMethod
      || body?.paymentMode
      || body?.accessMethod
      || body?.accessMode
      || accessGrant.paymentMethod
      || accessGrant.accessMethod
      || accessGrant.accessType
      || payment.paymentMethod
      || payment.accessMethod
      || payment.accessType
      || "",
  ).trim().toLowerCase();

  if (
    text === "membership_credit"
    || text === "monthly_credit"
    || text === "monthly"
    || text === "monthly_stones"
    || text === "moonlight_stone"
    || text === "moonlightstone"
    || text === "moonlight stone"
  ) return "membership_credit";

  if (
    text === "single_purchase"
    || text === "card"
    || text === "credit_card"
    || text === "portone"
    || text === "payment"
  ) return "single_purchase";

  return "";
}

function profileDeletePaymentRequiredResponse(action, requestId, profileId, policy = {}) {
  const reason = resolveProfileMutationReason(action);
  const actionType = resolveProfileMutationActionType(action);
  return json({
    ok: false,
    success: false,
    code: "PAYMENT_REQUIRED",
    message: `${reason}는 5,000원 단건 결제 또는 월정석으로 진행할 수 있습니다.`,
    policy,
    pricing: {
      featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
      reason,
      actionType,
      cost: PROFILE_CARD_MANAGE_COST,
      coinPrice: PROFILE_CARD_MANAGE_COST,
      membershipCreditCost: PROFILE_CARD_MANAGE_MEMBERSHIP_COST,
      amountKRW: PROFILE_CARD_MANAGE_AMOUNT_KRW,
      cashPrice: PROFILE_CARD_MANAGE_AMOUNT_KRW,
      forceDeduct: true,
    },
    checkout: {
      endpoint: "/api/billing/checkout",
      payload: {
        paymentType: "digital_content",
        featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
        reason,
        paymentAmount: PROFILE_CARD_MANAGE_AMOUNT_KRW,
        coinPrice: PROFILE_CARD_MANAGE_COST,
        membershipCreditCost: PROFILE_CARD_MANAGE_MEMBERSHIP_COST,
        requestId,
        profileId,
        selectedProfileId: profileId,
        actionType,
      },
    },
  }, { status: 402 });
}

function profileCardActionPaymentRequiredResponse(action, requestId, profileId = "", policy = {}) {
  const reason = resolveProfileMutationReason(action);
  const actionType = resolveProfileMutationActionType(action);
  return json({
    ok: false,
    success: false,
    code: "PAYMENT_REQUIRED",
    message: `${reason}는 이용권 무료 통과 없이 오직 단건 결제 ${PROFILE_CARD_MANAGE_AMOUNT_KRW.toLocaleString("ko-KR")}원 또는 월정석 ${(PROFILE_CARD_MANAGE_MEMBERSHIP_COST * 10).toLocaleString("ko-KR")}원 상당으로만 진행할 수 있습니다.`,
    policy,
    pricing: {
      featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
      reason,
      actionType,
      cost: PROFILE_CARD_MANAGE_COST,
      coinPrice: PROFILE_CARD_MANAGE_COST,
      membershipCreditCost: PROFILE_CARD_MANAGE_MEMBERSHIP_COST,
      amountKRW: PROFILE_CARD_MANAGE_AMOUNT_KRW,
      cashPrice: PROFILE_CARD_MANAGE_AMOUNT_KRW,
      forceDeduct: true,
    },
    checkout: {
      endpoint: "/api/billing/checkout",
      payload: {
        paymentType: "digital_content",
        featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
        reason,
        paymentAmount: PROFILE_CARD_MANAGE_AMOUNT_KRW,
        coinPrice: PROFILE_CARD_MANAGE_COST,
        membershipCreditCost: PROFILE_CARD_MANAGE_MEMBERSHIP_COST,
        requestId,
        profileId,
        selectedProfileId: profileId,
        actionType,
      },
    },
  }, { status: 402 });
}

function profileMutationConflictResponse(message, details = {}) {
  return json({
    ok: false,
    success: false,
    code: "PROFILE_MUTATION_PAYMENT_ALREADY_USED",
    message,
    ...details,
  }, { status: 409 });
}

function buildProfileMutationEvidenceClauses({ requestId, body, profileId }) {
  const accessGrant = body?.accessGrant && typeof body.accessGrant === "object" ? body.accessGrant : {};
  const payment = body?.payment && typeof body.payment === "object" ? body.payment : {};
  const candidates = [
    requestId,
    body?.purchaseId,
    body?.paymentId,
    body?.orderId,
    body?.merchantUid,
    body?.merchant_uid,
    body?.impUid,
    body?.imp_uid,
    accessGrant.evidenceId,
    accessGrant.purchaseId,
    accessGrant.paymentId,
    accessGrant.orderId,
    accessGrant.merchantUid,
    accessGrant.requestId,
    payment.evidenceId,
    payment.purchaseId,
    payment.paymentId,
    payment.orderId,
    payment.merchantUid,
    payment.merchant_uid,
    payment.requestId,
  ].map((value) => sanitizeString(value, 120)).filter(Boolean);

  const unique = Array.from(new Set(candidates));
  const clauses = [];
  unique.forEach((value) => {
    clauses.push({ "metadata.requestId": value });
    clauses.push({ "metadata.profilePaymentKey": value });
    clauses.push({ "metadata.paymentId": value });
    clauses.push({ "metadata.purchaseId": value });
    clauses.push({ "metadata.evidenceId": value });
    clauses.push({ "metadata.orderId": value });
    clauses.push({ "metadata.merchantUid": value });
    clauses.push({ merchantUid: value });
    clauses.push({ impUid: value });
  });

  if (profileId && requestId) {
    clauses.push({ "metadata.profileId": profileId, "metadata.requestId": requestId });
  }

  return clauses.length > 0 ? clauses : [{ "metadata.requestId": requestId }];
}

function evidenceProfileMatches(evidence, profileId) {
  const metadata = evidence?.metadata || {};
  const evidenceProfileId = sanitizeProfileId(metadata.profileCardId || metadata.profileId || metadata.selectedProfileId);
  return !evidenceProfileId || evidenceProfileId === profileId;
}

function evidenceActionMatches(evidence, action) {
  const metadata = evidence?.metadata || {};
  const expectedActionType = resolveProfileMutationActionType(action);
  const rawActionType = String(metadata.actionType || "").trim().toLowerCase();
  const rawProfileAction = String(metadata.profileAction || "").trim().toLowerCase();
  return rawActionType === expectedActionType || rawProfileAction === String(action || "").trim().toLowerCase();
}

function evidenceCostMatches(evidence) {
  const metadata = evidence?.metadata || {};
  const accessType = String(metadata.accessType || "").trim().toLowerCase();
  const coinPrice = Math.max(0, Math.floor(Number(metadata.coinPrice || metadata.costCoins || Math.abs(Number(evidence?.delta || 0)))));
  const monthlyCreditCost = Math.max(0, Math.floor(Number(metadata.membershipCreditCost || 0)));
  const paidAmount = Math.max(0, Math.floor(Number(metadata.paidAmount || metadata.amountKrw || 0)));

  if (accessType === "membership_credit") return monthlyCreditCost >= PROFILE_CARD_MANAGE_MEMBERSHIP_COST;
  if (accessType === "single_purchase") {
    return coinPrice >= PROFILE_CARD_MANAGE_COST && paidAmount >= PROFILE_CARD_MANAGE_AMOUNT_KRW;
  }
  return false;
}

function evidencePaymentMethodMatches(evidence, paymentMethod) {
  if (!paymentMethod) return true;
  const metadata = evidence?.metadata || {};
  const values = [
    metadata.accessType,
    metadata.accessMethod,
    metadata.paymentMethod,
  ].map((value) => String(value || "").trim().toLowerCase()).filter(Boolean);

  if (paymentMethod === "membership_credit") {
    return values.includes("membership_credit")
      || values.includes("monthly_credit")
      || values.includes("monthly");
  }

  if (paymentMethod === "single_purchase") {
    return values.includes("single_purchase")
      || values.includes("card")
      || values.includes("credit_card")
      || values.includes("portone");
  }

  return true;
}

async function findProfileMutationPaymentEvidence(auth, { action, profileId, requestId, body }) {
  const actionType = resolveProfileMutationActionType(action);
  const clauses = buildProfileMutationEvidenceClauses({ requestId, body, profileId });
  const baseQuery = {
    userId: auth.userId,
    kind: "deduct",
    featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
    $or: clauses,
  };

  const used = await PointHistory.findOne({
    userId: auth.userId,
    kind: "deduct",
    featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
    $and: [
      { $or: clauses },
      {
        $or: [
          { "metadata.profileMutationCompleted": true },
          { "metadata.profileMutationInProgress": true },
        ],
      },
    ],
  }).lean();
  if (used) {
    return {
      ok: false,
      response: profileMutationConflictResponse("이미 사용 완료된 프로필 카드 결제 건입니다.", {
        actionType: used?.metadata?.actionType || actionType,
        requestId,
      }),
    };
  }

  const evidence = await PointHistory.findOne(baseQuery).sort({ createdAt: -1 }).lean();
  if (!evidence) return { ok: true, evidence: null };
  if (!evidenceProfileMatches(evidence, profileId)) {
    return {
      ok: false,
      response: profileMutationConflictResponse("결제 대상 프로필 카드가 현재 요청과 일치하지 않습니다.", {
        actionType,
        requestId,
      }),
    };
  }
  if (!evidenceActionMatches(evidence, action) || !evidenceCostMatches(evidence)) {
    return {
      ok: false,
      response: profileMutationConflictResponse("프로필 카드 결제 증거가 현재 작업과 일치하지 않습니다.", {
        actionType,
        requestId,
      }),
    };
  }

  return { ok: true, evidence };
}

function policyFailureStatus(reason) {
  if (reason === "AUTH_REQUIRED") return 401;
  if (reason === "INVALID_ACTION_TYPE" || reason === "PROFILE_CARD_ID_REQUIRED") return 400;
  if (reason === "USER_NOT_FOUND" || reason === "PROFILE_CARD_NOT_FOUND_OR_NOT_OWNED") return 404;
  return 403;
}

async function ensureProfileDeleteAuthorized(auth, { action, profileId, body }) {
  const requestId = readProfileMutationRequestId(body, action, profileId);
  const paymentMethod = resolveProfileMutationPaymentMethod(body);
  const policy = await getProfileCardMutationPolicy(auth.userId, profileId, action);

  if (policy.allowed && !policy.requiresPayment) {
    return { ok: true, requestId, policy, evidence: null };
  }

  if (!policy.requiresPayment && !policy.allowed) {
    return {
      ok: false,
      response: json({
        ok: false,
        success: false,
        code: policy.reason,
        message: policy.reason,
        policy,
      }, { status: policyFailureStatus(policy.reason) }),
    };
  }

  const evidenceResult = await findProfileMutationPaymentEvidence(auth, { action, profileId, requestId, body });
  if (!evidenceResult.ok) return evidenceResult;

  let evidence = evidenceResult.evidence || null;
  if (evidence && !evidencePaymentMethodMatches(evidence, paymentMethod)) {
    return {
      ok: false,
      response: profileMutationConflictResponse("프로필 카드 결제 방식이 현재 요청과 일치하지 않습니다.", {
        actionType: resolveProfileMutationActionType(action),
        requestId,
      }),
    };
  }
  if (!evidence) {
    if (paymentMethod === "single_purchase") {
      return { ok: false, response: profileCardActionPaymentRequiredResponse(action, requestId, profileId, policy) };
    }
    const payment = await ensureProfileMutationPayment(auth, { action, profileId, requestId });
    if (!payment.ok) return payment;
    evidence = payment.evidence || null;
    if (evidence && !evidencePaymentMethodMatches(evidence, "membership_credit")) {
      return {
        ok: false,
        response: profileMutationConflictResponse("프로필 카드 결제 방식이 현재 요청과 일치하지 않습니다.", {
          actionType: resolveProfileMutationActionType(action),
          requestId,
        }),
      };
    }
  }

  const paidPolicy = await getProfileCardMutationPolicy(auth.userId, profileId, action, { paymentSettled: true });
  if (!paidPolicy.allowed) {
    return {
      ok: false,
      response: json({
        ok: false,
        success: false,
        code: paidPolicy.reason,
        message: paidPolicy.reason,
        policy: paidPolicy,
      }, { status: policyFailureStatus(paidPolicy.reason) }),
    };
  }

  return { ok: true, requestId, policy: paidPolicy, evidence };
}

async function ensureProfileCreatePaymentAuthorized(auth, { profileId, body }) {
  const action = "create";
  const requestId = readProfileMutationRequestId(body, action, profileId);
  const paymentMethod = resolveProfileMutationPaymentMethod(body);
  const evidenceResult = await findProfileMutationPaymentEvidence(auth, { action, profileId, requestId, body });
  if (!evidenceResult.ok) return evidenceResult;

  let evidence = evidenceResult.evidence || null;
  if (evidence && !evidencePaymentMethodMatches(evidence, paymentMethod)) {
    return {
      ok: false,
      response: profileMutationConflictResponse("프로필 카드 결제 방식이 현재 요청과 일치하지 않습니다.", {
        actionType: resolveProfileMutationActionType(action),
        requestId,
      }),
    };
  }
  if (!evidence) {
    if (paymentMethod === "single_purchase") {
      return { ok: false, response: profileCardActionPaymentRequiredResponse(action, requestId, profileId) };
    }
    const payment = await ensureProfileMutationPayment(auth, { action, profileId, requestId });
    if (!payment.ok) return payment;
    evidence = payment.evidence || null;
    if (evidence && !evidencePaymentMethodMatches(evidence, "membership_credit")) {
      return {
        ok: false,
        response: profileMutationConflictResponse("프로필 카드 결제 방식이 현재 요청과 일치하지 않습니다.", {
          actionType: resolveProfileMutationActionType(action),
          requestId,
        }),
      };
    }
  }

  const claim = await claimProfileMutationEvidence(auth, { action, profileId, requestId, evidence });
  if (!claim.ok) return claim;
  return { ok: true, requestId, evidence };
}

async function claimProfileMutationEvidence(auth, { action, profileId, requestId, evidence }) {
  if (!evidence?._id) return { ok: true };

  const result = await PointHistory.updateOne(
    {
      _id: evidence._id,
      userId: auth.userId,
      "metadata.profileMutationCompleted": { $ne: true },
      "metadata.profileMutationInProgress": { $ne: true },
    },
    {
      $set: {
        "metadata.profileMutationInProgress": true,
        "metadata.profileMutationInProgressAt": new Date(),
        "metadata.actionType": resolveProfileMutationActionType(action),
        "metadata.profileAction": action,
        "metadata.profileId": profileId,
        "metadata.selectedProfileId": profileId,
        "metadata.profilePaymentKey": requestId,
      },
    },
  );

  if (Number(result?.modifiedCount || 0) > 0) return { ok: true };
  return {
    ok: false,
    response: profileMutationConflictResponse("이미 처리 중이거나 사용 완료된 프로필 카드 결제 건입니다.", {
      actionType: resolveProfileMutationActionType(action),
      requestId,
    }),
  };
}

async function recordProfileMutationCompleted(auth, { action, profileId, requestId, policy, evidence }) {
  const actionType = resolveProfileMutationActionType(action);
  const now = new Date();

  if (evidence?._id) {
    await PointHistory.updateOne(
      {
        _id: evidence._id,
        userId: auth.userId,
        "metadata.profileMutationCompleted": { $ne: true },
      },
      {
        $set: {
          "metadata.profileMutationCompleted": true,
          "metadata.profileMutationCompletedAt": now,
          "metadata.profileMutationInProgress": false,
          "metadata.actionType": actionType,
          "metadata.profileAction": action,
          "metadata.profileId": profileId,
          "metadata.selectedProfileId": profileId,
          "metadata.profilePaymentKey": requestId,
          "metadata.policyReason": policy?.reason || "",
        },
      },
    );
    return;
  }

  const user = await User.findById(auth.userId).select("points").lean();
  await PointHistory.create({
    userId: auth.userId,
    kind: "deduct",
    delta: 0,
    balanceAfter: Number(user?.points || 0),
    reason: resolveProfileMutationReason(action),
    featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
    metadata: {
      accessType: "membership_pass",
      accessMethod: "PASS",
      paymentMethod: "PASS",
      purpose: "profile_card_manage",
      requestId,
      profilePaymentKey: requestId,
      profileMutationCompleted: true,
      profileMutationCompletedAt: now,
      actionType,
      profileAction: action,
      profileId,
      selectedProfileId: profileId,
      policyReason: policy?.reason || "PROFILE_CARD_PAYMENT_BYPASS",
      passType: policy?.passType || "",
      limit: Number(policy?.limit || 0),
      currentProfileCardCount: Number(policy?.currentProfileCardCount || 0),
      coinPrice: 0,
      paidAmount: 0,
    },
  });
}

async function refundProfileMutationCreditIfNeeded(auth, { action, profileId, requestId, evidence, reason }) {
  const metadata = evidence?.metadata || {};
  if (!evidence?._id || metadata.profileMutationCompleted === true) return;
  if (metadata.accessType !== "membership_credit") {
    await PointHistory.updateOne(
      { _id: evidence._id, userId: auth.userId },
      {
        $set: {
          "metadata.profileMutationInProgress": false,
          "metadata.profileMutationReleasedAt": new Date(),
        },
      },
    ).catch(() => {});
    return;
  }

  const credit = Math.max(0, Math.floor(Number(metadata.membershipCreditCost || PROFILE_CARD_MANAGE_MEMBERSHIP_COST)));
  const coins = Math.max(0, Math.floor(Math.abs(Number(evidence.delta || PROFILE_CARD_MANAGE_COST))));
  if (credit <= 0) return;

  const updatedUser = await User.findOneAndUpdate(
    { _id: auth.userId },
    {
      $inc: {
        "profileSubscription.membershipCreditBalance": credit,
        "profileSubscription.membershipCreditUsed": -credit,
      },
    },
    { returnDocument: "after", projection: { points: 1, profileSubscription: 1 } },
  ).lean();

  await PointHistory.create({
    userId: auth.userId,
    kind: "refund",
    delta: coins,
    balanceAfter: Number(updatedUser?.points || 0),
    reason: reason || `${resolveProfileMutationReason(action)} ?ㅽ뙣 ?섎텋`,
    featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
    metadata: {
      source: "profile_mutation_failure",
      refundedEvidenceId: String(evidence._id || ""),
      requestId,
      profilePaymentKey: requestId,
      actionType: resolveProfileMutationActionType(action),
      profileAction: action,
      profileId,
      selectedProfileId: profileId,
      coinPrice: coins,
      membershipCreditCost: credit,
      remainingMembershipCredit: Number(updatedUser?.profileSubscription?.membershipCreditBalance || 0),
    },
  }).catch(() => {});

  await PointHistory.updateOne(
    { _id: evidence._id, userId: auth.userId },
    {
      $set: {
        "metadata.profileMutationInProgress": false,
        "metadata.profileMutationReleasedAt": new Date(),
      },
    },
  ).catch(() => {});
}

async function seedProfileLegacyCreditIfNeeded(authUserId) {
  const user = await User.findById(authUserId)
    .select("points profileSubscription")
    .lean();
  const legacyPoints = Math.floor(Number(user?.points || 0));
  const sub = user?.profileSubscription || {};
  if (!user?._id || sub?.legacyCoinCreditSeeded || legacyPoints <= 0) return user;

  const legacyCredit = calculateMembershipCreditCost(legacyPoints);
  return User.findOneAndUpdate(
    { _id: authUserId, "profileSubscription.legacyCoinCreditSeeded": { $ne: true } },
    {
      $inc: {
        "profileSubscription.membershipCreditBalance": legacyCredit,
        "profileSubscription.membershipCreditGranted": legacyCredit,
      },
      $set: {
        "profileSubscription.legacyCoinCreditSeeded": true,
        "profileSubscription.legacyCoinCreditSeededAt": new Date(),
        "profileSubscription.legacyCoinCreditSeededPoints": legacyPoints,
      },
    },
    { returnDocument: "after", projection: { points: 1, profileSubscription: 1 } },
  ).lean();
}

async function ensureProfileMutationPayment(auth, { action, profileId, requestId }) {
  const paymentRequestId = sanitizeString(requestId, 120) || buildProfilePaymentRequestId(action, profileId);
  const reason = action === "delete" ? "프로필 카드 삭제" : "프로필 카드 추가";

  const existing = await PointHistory.findOne({
    userId: auth.userId,
    kind: "deduct",
    featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
    "metadata.accessType": "membership_credit",
    $or: [
      { "metadata.requestId": paymentRequestId },
      { "metadata.profilePaymentKey": paymentRequestId },
    ],
  }).lean();
  if (existing) return { ok: true, requestId: paymentRequestId, idempotent: true, evidence: existing };

  await seedProfileLegacyCreditIfNeeded(auth.userId);

  const updatedUser = await User.findOneAndUpdate(
    {
      _id: auth.userId,
      "profileSubscription.membershipCreditBalance": { $gte: PROFILE_CARD_MANAGE_MEMBERSHIP_COST },
    },
    {
      $inc: {
        "profileSubscription.membershipCreditBalance": -PROFILE_CARD_MANAGE_MEMBERSHIP_COST,
        "profileSubscription.membershipCreditUsed": PROFILE_CARD_MANAGE_MEMBERSHIP_COST,
      },
    },
    { returnDocument: "after", projection: { points: 1, profileSubscription: 1 } },
  ).lean();
  if (!updatedUser) {
    return { ok: false, response: profileCardActionPaymentRequiredResponse(action, paymentRequestId, profileId) };
  }

  const history = await PointHistory.create({
    userId: auth.userId,
    kind: "deduct",
    delta: -PROFILE_CARD_MANAGE_COST,
    balanceAfter: Number(updatedUser.points || 0),
    reason,
    featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
    metadata: {
      accessType: "membership_credit",
      accessMethod: "MONTHLY",
      paymentMethod: "MONTHLY",
      paymentMode: "membership_credit",
      purpose: "profile_card_manage",
      forceDeduct: true,
      requestId: paymentRequestId,
      profilePaymentKey: paymentRequestId,
      actionType: resolveProfileMutationActionType(action),
      profileAction: action,
      profileId,
      selectedProfileId: profileId,
      profileCardId: profileId,
      coinPrice: PROFILE_CARD_MANAGE_COST,
      membershipCreditCost: PROFILE_CARD_MANAGE_MEMBERSHIP_COST,
      remainingMembershipCredit: Number(updatedUser?.profileSubscription?.membershipCreditBalance || 0),
      paidAmount: PROFILE_CARD_MANAGE_AMOUNT_KRW,
    },
  });

  return { ok: true, requestId: paymentRequestId, idempotent: false, evidence: history };
}

async function handleGetProfiles(auth) {
  const user = await User.findById(auth.userId)
    .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt destinyProfilesCurrentId destinyProfilesLockedCurrentId destinyProfilesLockedAt")
    .lean();

  if (!user) {
    return json({ ok: false, message: "?ъ슜?먮? 李얠쓣 ???놁뒿?덈떎." }, { status: 404 });
  }

  const subscription = resolveSubscriptionPolicy(user);
  const profiles = await listUserProfiles(auth.userId);
  const access = resolveSingleProfileAccess(user, profiles, subscription);
  const currentId = access.currentId;

  if (subscription.isActive) {
    const updateSet = {};
    if (currentId && currentId !== String(user.destinyProfilesCurrentId || "")) updateSet.destinyProfilesCurrentId = currentId;
    if (user.destinyProfilesLockedCurrentId || user.destinyProfilesLockedAt) {
      updateSet.destinyProfilesLockedCurrentId = "";
      updateSet.destinyProfilesLockedAt = null;
    }
    if (Object.keys(updateSet).length > 0) {
      await User.updateOne({ _id: auth.userId }, { $set: updateSet });
    }
  } else if (profiles.length <= 1 && currentId && currentId !== String(user.destinyProfilesLockedCurrentId || "")) {
    await User.updateOne(
      { _id: auth.userId },
      { $set: { destinyProfilesCurrentId: currentId, destinyProfilesLockedCurrentId: currentId, destinyProfilesLockedAt: new Date() } },
    );
  }

  return json({
    ok: true,
    profiles: markCurrentProfile(access.profiles, currentId),
    currentId,
    subscription,
    profileAccess: access.profileAccess,
    canCreateMore: canCreateProfileWithinSubscriptionLimit(subscription, profiles.length),
  });
}

async function handleGetProfileDetail(auth, profileIdRaw) {
  const profileId = sanitizeProfileId(profileIdRaw);
  if (!profileId) return json({ ok: false, code: "PROFILE_ID_REQUIRED", message: "조회할 프로필 카드 ID가 필요합니다." }, { status: 400 });

  const [profile, user] = await Promise.all([
    ProfileCard.findOne({ userId: auth.userId, profileId }).lean(),
    User.findById(auth.userId).select("destinyProfilesCurrentId").lean(),
  ]);

  if (!profile) {
    return json({ ok: false, code: "PROFILE_NOT_FOUND", message: "프로필 카드를 찾을 수 없습니다." }, { status: 404 });
  }

  const clientProfile = toClientProfile(profile);
  const selected = String(user?.destinyProfilesCurrentId || "") === String(clientProfile.id || "");
  return json({
    ok: true,
    profile: {
      ...clientProfile,
      isActive: selected,
      isDefault: selected,
      selected,
    },
  });
}

async function handleGetCurrentProfile(auth) {
  const user = await User.findById(auth.userId)
    .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt destinyProfilesCurrentId destinyProfilesLockedCurrentId destinyProfilesLockedAt")
    .lean();
  if (!user) return json({ ok: false, message: "User not found." }, { status: 404 });

  const subscription = resolveSubscriptionPolicy(user);
  const profiles = await listUserProfiles(auth.userId);
  const access = resolveSingleProfileAccess(user, profiles, subscription);
  const currentId = access.currentId;
  const markedProfiles = markCurrentProfile(access.profiles, currentId);
  return json({
    ok: true,
    profile: markedProfiles.find((profile) => String(profile.id || "") === String(currentId || "")) || null,
    profiles: markedProfiles,
    currentId,
    subscription,
    profileAccess: access.profileAccess,
    canCreateMore: canCreateProfileWithinSubscriptionLimit(subscription, profiles.length),
  });
}

async function handleCreateProfile(request, auth) {
  try {
    const [user, count, body] = await Promise.all([
      User.findById(auth.userId)
        .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt destinyProfilesCurrentId destinyProfilesLockedCurrentId destinyProfilesLockedAt")
        .lean(),
      ProfileCard.countDocuments({ userId: auth.userId }),
      readJson(request),
    ]);

    if (!user) {
      return json({ ok: false, success: false, message: "?ъ슜?먮? 李얠쓣 ???놁뒿?덈떎." }, { status: 404 });
    }

    const subscription = resolveSubscriptionPolicy(user);
    const rawProfile = body?.profile || body;
    const birthValidation = validateRequiredBirth(rawProfile);
    if (!birthValidation.ok) {
      return json({
        ok: false,
        success: false,
        message: birthValidation.message,
      }, { status: 400 });
    }

    const normalized = normalizeIncomingProfile(rawProfile, count);
    normalized.birth = birthValidation.birth;

    const duplicated = await ProfileCard.findOne({ userId: auth.userId, profileId: normalized.profileId }).lean();
    if (duplicated) {
      return json({ ok: false, success: false, message: "이미 존재하는 프로필 ID입니다." }, { status: 409 });
    }

    const createPolicy = await resolveProfileCardActionAccess({
      userId: auth.userId,
      action: PROFILE_CARD_MUTATION_ACTIONS.CREATE,
      currentProfileCount: count,
    });
    let createPayment = null;
    if (createPolicy.requiresPayment) {
      createPayment = await ensureProfileCreatePaymentAuthorized(auth, {
        profileId: normalized.profileId,
        body,
      });
      if (!createPayment.ok) return createPayment.response;
    } else if (!createPolicy.allowed) {
      return json({
        ok: false,
        success: false,
        code: createPolicy.reason || "PROFILE_CREATE_NOT_ALLOWED",
        message: "프로필 카드를 추가할 수 없습니다.",
        policy: createPolicy,
      }, { status: 403 });
    }

    let created;
    try {
      created = await ProfileCard.create({
        userId: auth.userId,
        profileId: normalized.profileId,
        name: normalized.name,
        gender: normalized.gender,
        birth: normalized.birth,
        location: normalized.location,
      });
    } catch (error) {
      if (createPayment?.evidence) {
        await refundProfileMutationCreditIfNeeded(auth, {
          action: "create",
          profileId: normalized.profileId,
          requestId: createPayment.requestId,
          evidence: createPayment.evidence,
          reason: "프로필 카드 생성 실패 환불",
        });
      }
      throw error;
    }

    const profile = toClientProfile(created.toObject());
    const nextCurrentId = String(profile.id || "");

    if (nextCurrentId !== String(user.destinyProfilesCurrentId || "")) {
      await User.updateOne({ _id: auth.userId }, { $set: { destinyProfilesCurrentId: nextCurrentId } });
    }

    if (createPayment?.requestId) {
      await recordProfileMutationCompleted(auth, {
        action: "create",
        profileId: normalized.profileId,
        requestId: createPayment.requestId,
        policy: { reason: "PAID_PROFILE_CARD_CREATE" },
        evidence: createPayment.evidence,
      });
    }

    const profiles = await listUserProfiles(auth.userId);

    return json({
      success: true,
      message: "PROFILE_CREATED_SUCCESSFULLY",
      data: { ...profile, isDefault: true, selected: true },
      ok: true,
      profile: { ...profile, isDefault: true, selected: true },
      profiles: markCurrentProfile(profiles, nextCurrentId),
      currentId: nextCurrentId,
      subscription,
      canCreateMore: canCreateProfileWithinSubscriptionLimit(subscription, count + 1),
    }, { status: 201 });
  } catch (error) {
    const status = Number(error?.status || 0);
    if (status >= 400 && status < 500) {
      return json({
        ok: false,
        success: false,
        message: String(error?.message || "BAD_REQUEST"),
      }, { status });
    }

    if (Number(error?.code) === 11000) {
      return json({
        ok: false,
        success: false,
        message: "이미 존재하는 프로필 ID입니다.",
      }, { status: 409 });
    }

    console.error("[profile-create-error]", {
      userId: String(auth?.userId || ""),
      message: String(error?.message || error),
      stack: error?.stack || null,
    });

    return json({
      ok: false,
      success: false,
      message: "PROFILE_CREATE_INTERNAL_ERROR",
    }, { status: 500 });
  }
}

async function handleUpdateCurrent(request, auth) {
  const body = await readJson(request);
  const requestedCurrentId = sanitizeProfileId(body?.currentId);
  if (!requestedCurrentId) {
    return json({ ok: false, message: "currentId媛 ?꾩슂?⑸땲??" }, { status: 400 });
  }

  const exists = await ProfileCard.findOne({ userId: auth.userId, profileId: requestedCurrentId }).lean();
  if (!exists) {
    return json({ ok: false, message: "선택한 프로필 카드를 찾을 수 없습니다." }, { status: 404 });
  }

  const user = await User.findById(auth.userId)
    .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt destinyProfilesCurrentId destinyProfilesLockedCurrentId destinyProfilesLockedAt")
    .lean();
  if (!user) {
    return json({ ok: false, message: "?ъ슜?먮? 李얠쓣 ???놁뒿?덈떎." }, { status: 404 });
  }

  const subscription = resolveSubscriptionPolicy(user);
  const profiles = await listUserProfiles(auth.userId);
  const profileLimit = resolveProfileLimitForClient(subscription);
  const isSingleMode = false;
  const lockedId = resolveCurrentId(user.destinyProfilesLockedCurrentId, profiles);

  if (isSingleMode && lockedId && requestedCurrentId !== lockedId) {
    return json({
      ok: false,
      code: "PROFILE_SINGLE_LOCKED",
      message: "이용권 혜택 종료 후 확정된 프로필 카드만 사용할 수 있습니다.",
      currentId: lockedId,
      lockedProfileId: lockedId,
      profileAccess: {
        mode: "single",
        selectionRequired: false,
        locked: true,
        lockedProfileId: lockedId,
        profileLimit: 1,
      },
    }, { status: 403 });
  }

  const updateSet = { destinyProfilesCurrentId: requestedCurrentId };
  if (isSingleMode) {
    updateSet.destinyProfilesLockedCurrentId = requestedCurrentId;
    updateSet.destinyProfilesLockedAt = new Date();
  } else {
    updateSet.destinyProfilesLockedCurrentId = "";
    updateSet.destinyProfilesLockedAt = null;
  }

  await User.updateOne({ _id: auth.userId }, { $set: updateSet });
  return json({
    ok: true,
    currentId: requestedCurrentId,
    profileAccess: {
      mode: isSingleMode ? "single" : "subscription",
      selectionRequired: false,
      locked: isSingleMode,
      lockedProfileId: isSingleMode ? requestedCurrentId : "",
      profileLimit: isSingleMode ? 1 : profileLimit,
    },
  });
}

async function handleUpdateProfile(request, auth, profileIdRaw) {
  const profileId = sanitizeProfileId(profileIdRaw);
  if (!profileId) return json({ ok: false, code: "PROFILE_ID_REQUIRED", message: "수정할 프로필 카드 ID가 필요합니다." }, { status: 400 });

  const body = await readJson(request);
  const rawProfile = body?.profile && typeof body.profile === "object" ? body.profile : body;
  const existingProfile = await ProfileCard.findOne({ userId: auth.userId, profileId }).lean();
  if (!existingProfile) return json({ ok: false, code: "PROFILE_NOT_FOUND", message: "프로필 카드를 찾을 수 없습니다." }, { status: 404 });

  const mergedProfile = {
    ...existingProfile,
    ...rawProfile,
    profileId,
    birth: {
      ...(existingProfile.birth || {}),
      ...((rawProfile.birth && typeof rawProfile.birth === "object") ? rawProfile.birth : {}),
    },
    location: {
      ...(existingProfile.location || {}),
      ...((rawProfile.location && typeof rawProfile.location === "object") ? rawProfile.location : {}),
    },
  };
  const birthValidation = validateRequiredBirth(mergedProfile);
  if (!birthValidation.ok) {
    return json({ ok: false, success: false, message: birthValidation.message }, { status: 400 });
  }

  const normalized = normalizeIncomingProfile(mergedProfile, 0);
  normalized.profileId = profileId;
  normalized.birth = birthValidation.birth;

  const updated = await ProfileCard.findOneAndUpdate(
    { userId: auth.userId, profileId },
    {
      $set: {
        name: normalized.name,
        gender: normalized.gender,
        birth: normalized.birth,
        location: normalized.location,
      },
    },
    { returnDocument: "after" },
  ).lean();

  if (!updated) return json({ ok: false, code: "PROFILE_NOT_FOUND", message: "프로필 카드를 찾을 수 없습니다." }, { status: 404 });

  const user = await User.findById(auth.userId)
    .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt destinyProfilesCurrentId destinyProfilesLockedCurrentId destinyProfilesLockedAt")
    .lean();
  const subscription = resolveSubscriptionPolicy(user || {});
  const profiles = await listUserProfiles(auth.userId);
  const nextCurrentId = resolveCurrentId(user?.destinyProfilesCurrentId, profiles) || profileId || profiles[0]?.id || "";
  if (nextCurrentId !== String(user?.destinyProfilesCurrentId || "")) {
    await User.updateOne({ _id: auth.userId }, { $set: { destinyProfilesCurrentId: nextCurrentId } });
  }

  return json({
    ok: true,
    success: true,
    profile: {
      ...toClientProfile(updated),
      isDefault: String(nextCurrentId) === profileId,
      selected: String(nextCurrentId) === profileId,
    },
    profiles: markCurrentProfile(profiles, nextCurrentId),
    currentId: nextCurrentId,
    subscription,
    canCreateMore: canCreateProfileWithinSubscriptionLimit(subscription, profiles.length),
  });
}

async function handleDeleteProfile(request, auth, profileIdRaw) {
  const profileId = sanitizeProfileId(profileIdRaw);
  if (!profileId) return json({ ok: false, message: "?좏슚??profileId媛 ?꾩슂?⑸땲??" }, { status: 400 });

  const [existingProfile, body] = await Promise.all([
    ProfileCard.findOne({ userId: auth.userId, profileId }).lean(),
    readJson(request).catch(() => ({})),
  ]);
  if (!existingProfile) return json({ ok: false, message: "프로필 카드를 찾을 수 없습니다." }, { status: 404 });

  const authorization = await ensureProfileDeleteAuthorized(auth, {
    action: PROFILE_CARD_MUTATION_ACTIONS.DELETE,
    profileId,
    body,
  });
  if (!authorization.ok) return authorization.response;

  const claim = await claimProfileMutationEvidence(auth, {
    action: PROFILE_CARD_MUTATION_ACTIONS.DELETE,
    profileId,
    requestId: authorization.requestId,
    evidence: authorization.evidence,
  });
  if (!claim.ok) return claim.response;

  const deleted = await ProfileCard.findOneAndDelete({ userId: auth.userId, profileId }).lean();
  if (!deleted) {
    await refundProfileMutationCreditIfNeeded(auth, {
      action: PROFILE_CARD_MUTATION_ACTIONS.DELETE,
      profileId,
      requestId: authorization.requestId,
      evidence: authorization.evidence,
      reason: "프로필 카드 삭제 실패 환불",
    });
    return json({ ok: false, message: "프로필 카드를 찾을 수 없습니다." }, { status: 404 });
  }

  await recordProfileMutationCompleted(auth, {
    action: PROFILE_CARD_MUTATION_ACTIONS.DELETE,
    profileId,
    requestId: authorization.requestId,
    policy: authorization.policy,
    evidence: authorization.evidence,
  });

  const profiles = await listUserProfiles(auth.userId);
  const user = await User.findById(auth.userId)
    .select("destinyProfilesCurrentId points profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt")
    .lean();
  const nextCurrentId = resolveCurrentId(user?.destinyProfilesCurrentId, profiles) || profiles[0]?.id || "";
  const subscription = resolveSubscriptionPolicy(user || {});

  await User.updateOne({ _id: auth.userId }, { $set: { destinyProfilesCurrentId: nextCurrentId } });
  const chargedCoins = Math.max(0, Math.floor(Number(authorization.policy?.costCoins || 0)));
  const freeByMembership = chargedCoins === 0;

  return json({
    ok: true,
    success: true,
    deletedId: profileId,
    deletedProfileId: profileId,
    chargedCoins,
    freeByMembership,
    remainingCoins: getRemainingProfileActionCoins(user),
    profiles: markCurrentProfile(profiles, nextCurrentId),
    currentId: nextCurrentId,
    currentProfile: profiles.find((profile) => String(profile?.id || "") === nextCurrentId) || null,
    canCreateMore: canCreateProfileWithinSubscriptionLimit(subscription, profiles.length),
    actionType: "profile_card_delete",
    policy: authorization.policy,
  });
}

export async function handleProfileRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/profile");
    const auth = await requireUserFromRequest(request, env);
    const security = await enforceProfileRouteSecurity(request, env, auth, method, path);
    if (!security.ok) return security.response;

    await connectDb(env);

    if (method === "GET" && path === "/") return await handleGetProfiles(auth);
    if (method === "POST" && path === "/") return await handleCreateProfile(request, auth);
    if (method === "GET" && path === "/current") return await handleGetCurrentProfile(auth);
    if (method === "PATCH" && path === "/current") return await handleUpdateCurrent(request, auth);

    const profileMatch = path.match(/^\/([^/]+)$/);
    if (profileMatch && method === "GET") {
      return await handleGetProfileDetail(auth, profileMatch[1]);
    }
    if (profileMatch && (method === "PATCH" || method === "PUT")) {
      return await handleUpdateProfile(request, auth, profileMatch[1]);
    }
    if (profileMatch && method === "DELETE") {
      return await handleDeleteProfile(request, auth, profileMatch[1]);
    }

    if (["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, {
      env,
      request,
      trace: {
        route: "profile",
        method: request.method,
      },
    });
  }
}

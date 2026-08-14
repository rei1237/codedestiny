import { connectDb, withMongoRetry } from "../lib/db.js";
import { isAuthDbInfraError, requireUserFromRequest } from "../lib/auth.js";
import { PointHistory, ProfileCard, User } from "../lib/models.js";
import { restoreMonthlyCreditLot } from "../lib/monthly-credit-store.js";
import { getRoutePath, handleRouteError, isDbUnavailableError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import {
  buildProfilePolicySnapshot,
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
} from "../lib/profile-card-mutation-policy.js";
import { enforceSensitiveEndpointSecurity } from "../lib/security/index.js";
import { invalidateAccessStateCacheForUser } from "../lib/access-state.js";

const MAX_PROFILE_ID_LEN = 80;
const MAX_NAME_LEN = 80;
const PROFILE_CARD_MANAGE_FEATURE_KEY = "profile-card-manage";
const PROFILE_CARD_MANAGE_COST = PROFILE_CARD_DELETE_COST_COINS;
const PROFILE_CARD_MANAGE_AMOUNT_KRW = PROFILE_CARD_DELETE_COST_KRW;
const PROFILE_CARD_MANAGE_MEMBERSHIP_COST = PROFILE_CARD_DELETE_COST_MONTHLY_STONES || calculateMembershipCreditCost(PROFILE_CARD_MANAGE_COST);

/* 인증 조회(resolveActiveUserAuth)를 이 필드까지 확장해 원본 문서를 auth.authUserDoc 로 받는다.
   그동안 이 라우트는 인증 단계에서 User 를 한 번 읽고 핸들러에서 같은 문서를 또 읽어, 요청 1회에
   Mongo 왕복이 2회였다 — 홈 진입마다 불리는 /api/profile 이라 일시적 블립에 그만큼 더 노출됐다.
   🔴 아래 select 문자열과 반드시 같은 집합을 유지할 것. 필드가 빠지면 재조회를 건너뛴 자리에서
   조용히 undefined 가 되어 구독 등급이 오판된다(= 이용권 보유자에게 결제창이 뜨는 유형의 사고).
   이 문서를 재사용하는 것은 읽기 GET 3개뿐이다 — 쓰기(POST/PATCH) 핸들러는 자기 write 이후 상태를
   봐야 하므로 종전대로 직접 조회한다(인증 시점 스냅샷을 쓰면 방금 쓴 값을 놓친다). */
const PROFILE_ROUTE_USER_PROJECTION = {
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
  membershipStatus: 1,
  isActive: 1,
  isSubscribed: 1,
  expiresAt: 1,
  destinyProfilesCurrentId: 1,
  destinyProfilesLockedCurrentId: 1,
  destinyProfilesLockedAt: 1,
};

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
    rateLimit: { limit: 60, windowSeconds: 60 },
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

/* 등급 해석은 normalizeHoneyPassEntitlement(worker/lib/profile-limits.js) 하나로 일원화한다.
   여기 있던 resolveStoredSubscriptionTier 는 같은 일을 하는 두 번째 파서였는데, 그 결과인
   subscription.rawTier 를 읽는 곳이 서버·클라이언트 어디에도 없었다(전수 확인). 응답 계약에서
   함께 뺐다 — 갈라진 두 파서를 남겨 두면 폐기 별칭 정리 같은 변경이 한쪽만 반영된다. */
function resolveSubscriptionPolicy(user) {
  const entitlement = normalizeHoneyPassEntitlement(user || {});

  return {
    tier: entitlement.isActive ? entitlement.tier : "free",
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

function hasProfileMutationPaymentContext(body = {}) {
  const source = body && typeof body === "object" ? body : {};
  const payment = source.payment && typeof source.payment === "object" ? source.payment : null;
  const consume = source.consume && typeof source.consume === "object" ? source.consume : null;
  const accessGrant = source.accessGrant && typeof source.accessGrant === "object" ? source.accessGrant : null;
  const values = [
    source.paymentMode,
    source.paymentMethod,
    source.accessMethod,
    source.accessType,
    source.transactionId,
    source.paymentId,
    source.impUid,
    source.merchantUid,
    payment?.paymentMode,
    payment?.paymentMethod,
    payment?.paymentId,
    payment?.impUid,
    payment?.merchantUid,
    consume?.paymentMode,
    consume?.paymentMethod,
    consume?.transactionId,
    accessGrant?.paymentMode,
    accessGrant?.paymentMethod,
    accessGrant?.transactionId,
  ];
  return values.some((value) => String(value || "").trim());
}

function getRemainingProfileActionCoins(user) {
  const creditBalance = Number(user?.profileSubscription?.membershipCreditBalance);
  if (Number.isFinite(creditBalance) && creditBalance > 0) return Math.max(0, Math.floor(creditBalance / 10));
  return Math.max(0, Math.floor(Number(user?.points || 0)));
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

function resolveProfileMutationActionType(action) {
  if (action === PROFILE_CARD_MUTATION_ACTIONS.UPDATE) return "profile_card_update";
  if (action === PROFILE_CARD_MUTATION_ACTIONS.DELETE) return "profile_card_delete";
  return "profile_card_add_extra";
}

function resolveProfileMutationReason(action) {
  if (action === PROFILE_CARD_MUTATION_ACTIONS.UPDATE) return "프로필 카드 수정";
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

async function findCompletedProfileMutationReplay(auth, { action, profileId, requestId, body }) {
  if (!requestId) return null;
  const clauses = buildProfileMutationEvidenceClauses({ requestId, body, profileId });
  const evidence = await PointHistory.findOne({
    userId: auth.userId,
    kind: "deduct",
    featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
    $and: [
      { $or: clauses },
      { "metadata.profileMutationCompleted": true },
    ],
  }).sort({ createdAt: -1 }).lean();
  if (!evidence) return null;
  if (!evidenceProfileMatches(evidence, profileId)) return null;
  if (!evidenceActionMatches(evidence, action)) return null;
  return evidence;
}

function policyFailureStatus(reason) {
  if (reason === "AUTH_REQUIRED") return 401;
  if (reason === "INVALID_ACTION_TYPE" || reason === "PROFILE_CARD_ID_REQUIRED") return 400;
  if (reason === "USER_NOT_FOUND" || reason === "PROFILE_CARD_NOT_FOUND_OR_NOT_OWNED") return 404;
  return 403;
}

async function ensureProfileMutationAuthorized(auth, { action, profileId, body }) {
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
    return { ok: false, response: profileCardActionPaymentRequiredResponse(action, requestId, profileId, policy) };
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

// 하위 검증 스크립트와 레거시 호출 흔적의 의미를 유지하되, 실제 정책은 모든 변경 작업이 공유한다.
const ensureProfileDeleteAuthorized = ensureProfileMutationAuthorized;

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
    return { ok: false, response: profileCardActionPaymentRequiredResponse(action, requestId, profileId) };
  }

  const claim = await claimProfileMutationEvidence(auth, { action, profileId, requestId, evidence });
  if (!claim.ok) return claim;

  const paidPolicy = await getProfileCardMutationPolicy(auth.userId, profileId, action, { paymentSettled: true });
  if (!paidPolicy.allowed) {
    await refundProfileMutationCreditIfNeeded(auth, {
      action,
      profileId,
      requestId,
      evidence,
      reason: "프로필 카드 생성 한도 초과 환불",
    });
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

  // 프로필 카드 변경 실패 → 차감했던 월정석을 신규 30일 lot으로 복원(lotId로 멱등).
  const updatedUser = await restoreMonthlyCreditLot({
    userId: auth.userId,
    lotId: `profile-mutation-refund:${String(evidence._id)}`,
    amount: credit,
  });

  await PointHistory.create({
    userId: auth.userId,
    kind: "refund",
    delta: coins,
    balanceAfter: Number(updatedUser?.points || 0),
    reason: reason || `${resolveProfileMutationReason(action)} 실패 환불`,
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

async function handleGetProfiles(auth, env) {
  // 일시적 풀 초기화에도 프로필/구독 정보를 정확히 반환하도록 조회를 재시도로 감싼다.
  // 두 독립 조회(User.findById · listUserProfiles)는 서로 필요 없으므로 병렬로 시작해 Mongo 왕복 1회를 줄인다.
  const profilesPromise = withMongoRetry(env, () => listUserProfiles(auth.userId));
  // 인증 단계가 같은 문서를 이미 읽어 왔으면 재조회하지 않는다(access-token 경로에서만 붙으므로 폴백 유지).
  const user = auth.authUserDoc || await withMongoRetry(env, () => User.findById(auth.userId)
    .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt destinyProfilesCurrentId destinyProfilesLockedCurrentId destinyProfilesLockedAt")
    .lean());

  if (!user) {
    return json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const subscription = resolveSubscriptionPolicy(user);
  const profiles = await profilesPromise;
  const access = resolveSingleProfileAccess(user, profiles, subscription);
  const currentId = access.currentId;

  // currentId 정리 write는 부기성 side-effect이므로, 일시적 풀 초기화로 실패해도
  // 이미 확보한 읽기 결과(프로필/구독)를 503으로 죽이지 않고 조용히 넘어간다(다음 요청에서 정리됨).
  try {
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
  } catch (writeError) {
    console.warn("[profile] currentId 정리 write 스킵(일시적 DB 장애)", String(writeError?.message || writeError).slice(0, 200));
  }

  return json({
    ok: true,
    profiles: markCurrentProfile(access.profiles, currentId),
    currentId,
    subscription,
    profilePolicySnapshot: buildProfilePolicySnapshot(user, { source: "profile_get" }),
    serverSyncedAt: new Date().toISOString(),
    profileAccess: access.profileAccess,
    canCreateMore: canCreateProfileWithinSubscriptionLimit(subscription, profiles.length),
  });
}

async function handleGetProfileDetail(auth, profileIdRaw, env) {
  const profileId = sanitizeProfileId(profileIdRaw);
  if (!profileId) return json({ ok: false, code: "PROFILE_ID_REQUIRED", message: "조회할 프로필 카드 ID가 필요합니다." }, { status: 400 });

  // 일시적 풀 초기화에도 프로필 상세 조회가 1회 실패로 죽지 않도록 재시도로 감싼다.
  // 인증 단계가 읽어 둔 문서가 있으면 User 조회는 아예 발행하지 않는다.
  const [profile, user] = await withMongoRetry(env, () => Promise.all([
    ProfileCard.findOne({ userId: auth.userId, profileId }).lean(),
    auth.authUserDoc || User.findById(auth.userId).select("destinyProfilesCurrentId").lean(),
  ]));

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

async function handleGetCurrentProfile(auth, env) {
  // 일시적 풀 초기화에도 현재 프로필/구독 정보를 정확히 반환하도록 조회를 재시도로 감싼다.
  // 인증 단계가 같은 문서를 이미 읽어 왔으면 재조회하지 않는다(폴백 유지).
  const user = auth.authUserDoc || await withMongoRetry(env, () => User.findById(auth.userId)
    .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt destinyProfilesCurrentId destinyProfilesLockedCurrentId destinyProfilesLockedAt")
    .lean());
  if (!user) return json({ ok: false, message: "User not found." }, { status: 404 });

  const subscription = resolveSubscriptionPolicy(user);
  const profiles = await withMongoRetry(env, () => listUserProfiles(auth.userId));
  const access = resolveSingleProfileAccess(user, profiles, subscription);
  const currentId = access.currentId;
  const markedProfiles = markCurrentProfile(access.profiles, currentId);
  return json({
    ok: true,
    profile: markedProfiles.find((profile) => String(profile.id || "") === String(currentId || "")) || null,
    profiles: markedProfiles,
    currentId,
    subscription,
    profilePolicySnapshot: buildProfilePolicySnapshot(user, { source: "profile_current" }),
    serverSyncedAt: new Date().toISOString(),
    profileAccess: access.profileAccess,
    canCreateMore: canCreateProfileWithinSubscriptionLimit(subscription, profiles.length),
  });
}

async function handleCreateProfile(request, auth, env) {
  try {
    /* 🔴 두 조회는 서로 의존하지 않으므로 같은 admission 슬롯 안에서 병렬로 낸다
       (handleUpdateCurrent·handleGetProfileDetail 과 같은 패턴). withMongoRetry 는 호출마다 전역
       게이트 슬롯을 하나씩 잡는데(worker/lib/db.js), 이 라우트는 가입 직후 홈 진입 팬아웃과 같은
       순간에 불린다. 호출마다 따로 감싸면 첫 카드 생성 한 건이 슬롯을 여러 개 먹고, 초과분은
       재시도 대상이 아닌 MongoOperationOverloadedError 가 되어 신규 회원의 첫 카드가 그대로 죽는다.
       readJson 은 Mongo 가 아니므로 슬롯 밖에 둔다. */
    const [[user, count], body] = await Promise.all([
      withMongoRetry(env, () => Promise.all([
        User.findById(auth.userId)
          .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt destinyProfilesCurrentId destinyProfilesLockedCurrentId destinyProfilesLockedAt")
          .lean(),
        ProfileCard.countDocuments({ userId: auth.userId }),
      ])),
      readJson(request),
    ]);

    if (!user) {
      return json({ ok: false, success: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });
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

    /* 선행 중복검사(ProfileCard.findOne)는 제거했다 — {userId, profileId} unique 인덱스와 아래
       11000 처리가 이미 같은 일을 하는데, 슬롯 하나와 왕복 한 번을 더 썼다. */
    const profilePolicySnapshot = buildProfilePolicySnapshot(user, { source: "profile_create" });
    const createFitsLocalPolicy = canCreateProfileWithinSubscriptionLimit(subscription, count);
    let createPayment = null;
    if (!createFitsLocalPolicy && !hasProfileMutationPaymentContext(body)) {
      return json({
        ok: false,
        success: false,
        code: "PROFILE_LIMIT_RECONCILE_REQUIRED",
        message: "현재 이용권의 기본 프로필 카드 저장 개수를 초과했습니다. 기존 카드를 정리하거나 이용권을 확인해 주세요.",
        subscription,
        profilePolicySnapshot,
        serverSyncedAt: new Date().toISOString(),
      }, { status: 409 });
    }

    if (!createFitsLocalPolicy) {
      createPayment = await ensureProfileCreatePaymentAuthorized(auth, {
        profileId: normalized.profileId,
        body,
      });
      if (!createPayment.ok) return createPayment.response;
    }

    let created;
    let replayedCreate = false;
    try {
      created = await withMongoRetry(env, () => ProfileCard.create({
        userId: auth.userId,
        profileId: normalized.profileId,
        name: normalized.name,
        gender: normalized.gender,
        birth: normalized.birth,
        location: normalized.location,
      }));
    } catch (error) {
      /* 🔴 중복키를 곧바로 실패로 돌리지 않는다. 이 엔드포인트는 같은 profileId 로 재시도된다
         (클라이언트는 profileId 를 저장 시작 시 1회만 만든다, js/destiny-profile.js dpSaveProfile).
         1차 시도가 실제로 삽입된 뒤 응답만 유실되면 재시도가 11000 을 보는데, 그때 409 를 주면
         "카드는 만들어졌는데 실패 안내"가 뜬다. 내 소유 카드면 그것을 결과로 이어간다. */
      if (Number(error?.code) === 11000) {
        const existing = await withMongoRetry(env, () => ProfileCard.findOne({
          userId: auth.userId,
          profileId: normalized.profileId,
        }).lean());
        if (existing) created = existing;
      }
      if (!created) {
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
      replayedCreate = true;
    }

    const profile = toClientProfile(typeof created.toObject === "function" ? created.toObject() : created);
    const nextCurrentId = String(profile.id || "");
    const shouldMoveCurrent = nextCurrentId !== String(user.destinyProfilesCurrentId || "");

    /* currentId 이동과 목록 재조회도 서로 의존하지 않는다 — 위 조회와 같은 이유로 슬롯 하나에 합친다. */
    const [, profiles] = await withMongoRetry(env, () => Promise.all([
      shouldMoveCurrent
        ? User.updateOne({ _id: auth.userId }, { $set: { destinyProfilesCurrentId: nextCurrentId } })
        : Promise.resolve(null),
      listUserProfiles(auth.userId),
    ]));

    if (createPayment?.requestId) {
      await recordProfileMutationCompleted(auth, {
        action: "create",
        profileId: normalized.profileId,
        requestId: createPayment.requestId,
        policy: { reason: "PAID_PROFILE_CARD_CREATE" },
        evidence: createPayment.evidence,
      });
    }

    return json({
      success: true,
      message: "PROFILE_CREATED_SUCCESSFULLY",
      data: { ...profile, isDefault: true, selected: true },
      ok: true,
      profile: { ...profile, isDefault: true, selected: true },
      profiles: markCurrentProfile(profiles, nextCurrentId),
      currentId: nextCurrentId,
      subscription,
      profilePolicySnapshot,
      serverSyncedAt: new Date().toISOString(),
      canCreateMore: canCreateProfileWithinSubscriptionLimit(subscription, count + 1),
    }, { status: replayedCreate ? 200 : 201 });
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

    /* 🔴 DB 일시 장애를 500 으로 내리지 말 것. admission 게이트 거절·풀 리셋·op 타임아웃은
       "서버가 거절"이 아니라 "대답을 못한" 것인데, 클라이언트의 일시 장애 재시도는 0/503/504
       에만 붙는다(js/destiny-profile.js `_dpIsTransientResult`). 500 으로 주면 가입 직후 블립
       한 번이 곧 "첫 카드 생성 영구 실패"가 된다. 이 catch 가 바깥 degrade 로직보다 먼저
       잡으므로 여기서 직접 갈라 준다. */
    if (isDbUnavailableError(error)) {
      console.warn("[profile-create-degraded]", String(error?.message || error).slice(0, 200));
      return json({
        ok: false,
        success: false,
        code: "SERVICE_UNAVAILABLE",
        message: "서버 연결이 잠시 불안정해요. 잠시 후 다시 시도해 주세요.",
      }, { status: 503 });
    }

    console.error("[profile-create-error]", {
      userId: String(auth?.userId || ""),
      message: String(error?.message || error),
      stack: error?.stack || null,
    });

    /* message 는 클라이언트에서 그대로 alert() 된다 — 기계 코드는 code 로 보내고 message 는 안내문. */
    return json({
      ok: false,
      success: false,
      code: "PROFILE_CREATE_INTERNAL_ERROR",
      message: "프로필 카드를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    }, { status: 500 });
  }
}

async function handleUpdateCurrent(request, auth, env) {
  const body = await readJson(request);
  const requestedCurrentId = sanitizeProfileId(body?.currentId);
  const baseCurrentId = sanitizeProfileId(body?.baseCurrentId);
  if (!requestedCurrentId) {
    return json({ ok: false, message: "currentId가 필요합니다." }, { status: 400 });
  }

  /* 🔴 두 읽기는 서로 의존하지 않으므로 같은 admission 슬롯 안에서 병렬로 낸다
     (handleGetProfileDetail 과 같은 패턴). withMongoRetry 는 호출마다 전역 게이트 슬롯을 하나씩
     잡는데(worker/lib/db.js, limit 5), 이 라우트는 홈 진입 팬아웃과 같은 순간에 불린다. 직렬로
     늘어놓으면 PATCH 한 건이 슬롯을 여러 개 먹고, 초과분은 재시도 대상이 아닌
     MongoOperationOverloadedError → 503 이 되어 degrade 하지 않는 쓰기 경로로 그대로 나간다. */
  const [exists, user] = await withMongoRetry(env, () => Promise.all([
    ProfileCard.findOne({ userId: auth.userId, profileId: requestedCurrentId }).lean(),
    User.findById(auth.userId)
      .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt destinyProfilesCurrentId destinyProfilesLockedCurrentId destinyProfilesLockedAt")
      .lean(),
  ]));
  if (!exists) {
    return json({ ok: false, message: "선택한 프로필 카드를 찾을 수 없습니다." }, { status: 404 });
  }
  if (!user) {
    return json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  // 스테일 탭이 오래된 currentId를 기준으로 전환을 요청하면 서버의 "현재 프로필" 포인터가
  // 실제로 보고 있는/결제한 프로필과 어긋나 프로필 스코프 잠금 콘텐츠가 잘못 조회된다.
  // 이 탭이 마지막으로 알고 있던 서버 currentId(baseCurrentId)가 서버 저장값과 일치할 때만 전환을 수용한다.
  const storedCurrentId = sanitizeProfileId(user.destinyProfilesCurrentId);
  const switchIsSafe = !storedCurrentId || baseCurrentId === storedCurrentId || storedCurrentId === requestedCurrentId;
  if (!switchIsSafe) {
    const staleProfiles = await withMongoRetry(env, () => listUserProfiles(auth.userId));
    return json({
      ok: true,
      currentId: storedCurrentId,
      staleSwitchIgnored: true,
      profiles: markCurrentProfile(staleProfiles, storedCurrentId),
    });
  }

  const subscription = resolveSubscriptionPolicy(user);
  const profileLimit = resolveProfileLimitForClient(subscription);
  /* single 모드(이용권 종료 후 카드 1개 확정)는 서버 전역에서 꺼져 있다 —
     worker/lib/profile-limits.js 의 resolveSingleProfileAccess 도 같은 상수로 subscription 모드만
     내보낸다. 여기 있던 lockedId 계산과 403 PROFILE_SINGLE_LOCKED 분기는 도달 불가능한 코드였고,
     그 lockedId 하나를 만들려고 listUserProfiles() 를 부르느라 이 라우트가 admission 슬롯을
     하나 더 태우고 있었다. 되살릴 때는 profile-limits.js 쪽과 함께 켜고, 목록 조회는 그 분기
     안으로 넣을 것(성공 경로가 다시 비용을 물지 않도록). 클라이언트의 403 처리는 남아 있다. */
  const isSingleMode = false;

  const updateSet = { destinyProfilesCurrentId: requestedCurrentId, destinyProfilesCurrentIdUpdatedAt: new Date() };
  updateSet.destinyProfilesLockedCurrentId = "";
  updateSet.destinyProfilesLockedAt = null;

  await withMongoRetry(env, () => User.updateOne({ _id: auth.userId }, { $set: updateSet }));
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

async function handleUpdateProfile(request, auth, profileIdRaw, env) {
  const profileId = sanitizeProfileId(profileIdRaw);
  if (!profileId) return json({ ok: false, code: "PROFILE_ID_REQUIRED", message: "수정할 프로필 카드 ID가 필요합니다." }, { status: 400 });

  const body = await readJson(request);
  const rawProfile = body?.profile && typeof body.profile === "object" ? body.profile : body;
  const existingProfile = await withMongoRetry(env, () => ProfileCard.findOne({ userId: auth.userId, profileId }).lean());
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

  const authorization = await ensureProfileMutationAuthorized(auth, {
    action: PROFILE_CARD_MUTATION_ACTIONS.UPDATE,
    profileId,
    body,
  });
  if (!authorization.ok) return authorization.response;

  const claim = await claimProfileMutationEvidence(auth, {
    action: PROFILE_CARD_MUTATION_ACTIONS.UPDATE,
    profileId,
    requestId: authorization.requestId,
    evidence: authorization.evidence,
  });
  if (!claim.ok) return claim.response;

  let updated;
  try {
    updated = await withMongoRetry(env, () => ProfileCard.findOneAndUpdate(
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
    ).lean());
  } catch (error) {
    await refundProfileMutationCreditIfNeeded(auth, {
      action: PROFILE_CARD_MUTATION_ACTIONS.UPDATE,
      profileId,
      requestId: authorization.requestId,
      evidence: authorization.evidence,
      reason: "프로필 카드 수정 실패 환불",
    });
    throw error;
  }

  if (!updated) {
    await refundProfileMutationCreditIfNeeded(auth, {
      action: PROFILE_CARD_MUTATION_ACTIONS.UPDATE,
      profileId,
      requestId: authorization.requestId,
      evidence: authorization.evidence,
      reason: "프로필 카드 수정 실패 환불",
    });
    return json({ ok: false, code: "PROFILE_NOT_FOUND", message: "프로필 카드를 찾을 수 없습니다." }, { status: 404 });
  }

  await recordProfileMutationCompleted(auth, {
    action: PROFILE_CARD_MUTATION_ACTIONS.UPDATE,
    profileId,
    requestId: authorization.requestId,
    policy: authorization.policy,
    evidence: authorization.evidence,
  });

  /* 두 읽기는 서로 의존하지 않으므로 같은 admission 슬롯 안에서 병렬로 낸다(위와 같은 패턴). */
  const [user, profiles] = await withMongoRetry(env, () => Promise.all([
    User.findById(auth.userId)
      .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt destinyProfilesCurrentId destinyProfilesLockedCurrentId destinyProfilesLockedAt")
      .lean(),
    listUserProfiles(auth.userId),
  ]));
  const subscription = resolveSubscriptionPolicy(user || {});
  const nextCurrentId = resolveCurrentId(user?.destinyProfilesCurrentId, profiles) || profileId || profiles[0]?.id || "";
  if (nextCurrentId !== String(user?.destinyProfilesCurrentId || "")) {
    await withMongoRetry(env, () => User.updateOne({ _id: auth.userId }, { $set: { destinyProfilesCurrentId: nextCurrentId } }));
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
    profilePolicySnapshot: buildProfilePolicySnapshot(user || {}, { source: "profile_update" }),
    serverSyncedAt: new Date().toISOString(),
    canCreateMore: canCreateProfileWithinSubscriptionLimit(subscription, profiles.length),
    chargedCoins: Math.max(0, Math.floor(Number(authorization.policy?.costCoins || 0))),
    freeByMembership: Number(authorization.policy?.costCoins || 0) === 0,
    actionType: "profile_card_update",
    policy: authorization.policy,
  });
}

async function buildProfileDeleteResponse(auth, profileId, env, { policy = null, evidence = null, replayed = false } = {}) {
  /* 두 읽기는 서로 의존하지 않으므로 같은 admission 슬롯 안에서 병렬로 낸다(handleUpdateCurrent 과 같은 패턴). */
  const [profiles, user] = await withMongoRetry(env, () => Promise.all([
    listUserProfiles(auth.userId),
    User.findById(auth.userId)
      .select("destinyProfilesCurrentId points profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt")
      .lean(),
  ]));
  const nextCurrentId = resolveCurrentId(user?.destinyProfilesCurrentId, profiles) || profiles[0]?.id || "";
  const subscription = resolveSubscriptionPolicy(user || {});
  if (nextCurrentId !== String(user?.destinyProfilesCurrentId || "")) {
    await withMongoRetry(env, () => User.updateOne({ _id: auth.userId }, { $set: { destinyProfilesCurrentId: nextCurrentId } }));
  }
  const metadata = evidence?.metadata || {};
  const chargedCoins = Math.max(0, Math.floor(Number(
    policy
      ? (policy.costCoins || 0)
      : (metadata.coinPrice || Math.abs(Number(evidence?.delta || 0)) || 0),
  )));
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
    subscription,
    profilePolicySnapshot: buildProfilePolicySnapshot(user || {}, { source: "profile_delete" }),
    serverSyncedAt: new Date().toISOString(),
    canCreateMore: canCreateProfileWithinSubscriptionLimit(subscription, profiles.length),
    actionType: "profile_card_delete",
    policy: policy || { allowed: true, reason: "IDEMPOTENT_REPLAY" },
    replayed,
  });
}

async function handleDeleteProfile(request, auth, profileIdRaw, trace, env) {
  const profileId = sanitizeProfileId(profileIdRaw);
  if (!profileId) return json({ ok: false, message: "유효한 profileId가 필요합니다." }, { status: 400 });

  const body = await readJson(request).catch(() => ({}));
  const requestId = readProfileMutationRequestId(body, PROFILE_CARD_MUTATION_ACTIONS.DELETE, profileId);
  const replay = await findCompletedProfileMutationReplay(auth, {
    action: PROFILE_CARD_MUTATION_ACTIONS.DELETE,
    profileId,
    requestId,
    body,
  });
  if (replay) {
    if (trace) trace.stage = "delete_replay";
    return buildProfileDeleteResponse(auth, profileId, env, { evidence: replay, replayed: true });
  }

  if (trace) trace.stage = "delete_read";
  const existingProfile = await withMongoRetry(env, () => ProfileCard.findOne({ userId: auth.userId, profileId }).lean());
  if (!existingProfile) return json({ ok: false, message: "프로필 카드를 찾을 수 없습니다." }, { status: 404 });

  if (trace) trace.stage = "delete_policy";
  const authorization = await ensureProfileDeleteAuthorized(auth, {
    action: PROFILE_CARD_MUTATION_ACTIONS.DELETE,
    profileId,
    body,
  });
  if (!authorization.ok) return authorization.response;

  if (trace) trace.stage = "delete_claim";
  const claim = await claimProfileMutationEvidence(auth, {
    action: PROFILE_CARD_MUTATION_ACTIONS.DELETE,
    profileId,
    requestId: authorization.requestId,
    evidence: authorization.evidence,
  });
  if (!claim.ok) return claim.response;

  if (trace) trace.stage = "delete_mutation";
  const deleted = await withMongoRetry(env, () => ProfileCard.findOneAndDelete({ userId: auth.userId, profileId }).lean());
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

  if (trace) trace.stage = "delete_finalize";
  return buildProfileDeleteResponse(auth, profileId, env, { policy: authorization.policy });
}

export async function handleProfileRoutes(request, env) {
  // 503 진단용: 실패가 인증 왕복(auth)인지, DB 연결(connect)인지, 핸들러 READ인지
  // 구분하려고 단계마다 플래그를 갱신한다(handleRouteError가 이 필드를 로그에 남김).
  const trace = { route: "profile", method: request.method, authVerified: false, dbConnected: false, stage: "auth", userId: "" };
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/profile");
    // 인증 조회를 확장해 authUserDoc 를 받아 온다 — 읽기 GET 핸들러들이 같은 User 를 재조회하던
    // 두 번째 왕복을 없앤다(쓰기 핸들러는 자기 write 이후 상태가 필요해 종전대로 직접 조회한다).
    const auth = await requireUserFromRequest(request, env, { userProjection: PROFILE_ROUTE_USER_PROJECTION });
    trace.userId = String(auth?.userId || "");
    trace.authPresent = true;
    trace.authVerified = true;
    trace.stage = "security";
    const security = await enforceProfileRouteSecurity(request, env, auth, method, path);
    if (!security.ok) return security.response;

    trace.stage = "connect";
    await connectDb(env);
    trace.dbConnected = true;
    trace.stage = "dispatch";

    if (method === "GET" && path === "/") return await handleGetProfiles(auth, env);
    if (method === "POST" && path === "/") return await handleCreateProfile(request, auth, env);
    if (method === "GET" && path === "/current") return await handleGetCurrentProfile(auth, env);
    if (method === "PATCH" && path === "/current") return await handleUpdateCurrent(request, auth, env);

    const profileMatch = path.match(/^\/([^/]+)$/);
    if (profileMatch && method === "GET") {
      return await handleGetProfileDetail(auth, profileMatch[1], env);
    }
    if (profileMatch && (method === "PATCH" || method === "PUT")) {
      return await handleUpdateProfile(request, auth, profileMatch[1], env);
    }
    if (profileMatch && method === "DELETE") {
      return await handleDeleteProfile(request, auth, profileMatch[1], trace, env);
    }

    if (["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    /* 읽기 전용 조회(GET)는 DB 일시 장애를 503으로 알릴 이유가 없다. 이 요청은 페이지 로드 때
       자동으로 나가고, 클라이언트는 이미 조용히 물러나도록 만들어져 있다
       (js/destiny-profile.js: `!data.ok || !Array.isArray(data.profiles)` 면 기존 목록 유지).
       ok:false 를 유지해야 그 가드가 작동하므로 ok 를 true 로 바꾸지 말 것 — 빈 목록으로 오인하면
       카드가 지워진다. 쓰기(POST·PATCH·DELETE)는 종전대로 503이어야 한다: 실패한 쓰기를
       성공처럼 보이게 하면 안 된다. */
    if (request.method.toUpperCase() === "GET" && (isAuthDbInfraError(error) || isDbUnavailableError(error))) {
      console.warn("[Profile][ReadDegraded]", {
        stage: trace.authVerified ? "read" : "auth",
        message: String(error?.message || error || ""),
      });
      return json({
        ok: false,
        degraded: true,
        code: "DB_FALLBACK",
        message: "프로필 정보를 잠시 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      });
    }
    return handleRouteError(error, {
      env,
      request,
      trace,
    });
  } finally {
    if (!["GET", "HEAD"].includes(String(request.method || "").toUpperCase()) && trace.userId) {
      invalidateAccessStateCacheForUser(trace.userId);
    }
  }
}

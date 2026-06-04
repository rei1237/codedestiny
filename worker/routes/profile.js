import { connectDb } from "../lib/db.js";
import { requireUserFromRequest } from "../lib/auth.js";
import { PointHistory, ProfileCard, User } from "../lib/models.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { normalizeHoneyPassEntitlement } from "../lib/profile-limits.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";

const MAX_PROFILE_ID_LEN = 80;
const MAX_NAME_LEN = 80;
const PROFILE_CARD_MANAGE_FEATURE_KEY = "profile-card-manage";
const PROFILE_CARD_MANAGE_COST = 50;
const PROFILE_CARD_MANAGE_AMOUNT_KRW = 5000;
const PROFILE_CARD_MANAGE_MEMBERSHIP_COST = calculateMembershipCreditCost(PROFILE_CARD_MANAGE_COST);

function sanitizeString(value, maxLen) {
  return String(value || "").trim().slice(0, maxLen);
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
    return { ok: false, message: "생년월일은 필수입니다. (YYYY-MM-DD)" };
  }
  if (!hasTimeParts && !parsedTime) {
    return { ok: false, message: "태어난 시간은 필수입니다. (HH:mm)" };
  }

  const year = Number(hasDateParts ? birth.year : parsedDate?.year);
  const month = Number(hasDateParts ? birth.month : parsedDate?.month);
  const day = Number(hasDateParts ? birth.day : parsedDate?.day);

  if (!isValidBirthDateParts(year, month, day)) {
    return { ok: false, message: "생년월일 형식이 올바르지 않습니다. (YYYY-MM-DD)" };
  }

  const hour = Number(hasTimeParts ? birth.hour : parsedTime?.hour);
  const minute = Number(hasTimeParts ? birth.minute : parsedTime?.minute);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    return { ok: false, message: "태어난 시간 형식이 올바르지 않습니다. (HH:mm)" };
  }

  return {
    ok: true,
    birth: {
      year,
      month,
      day,
      hour,
      minute,
      calType: sanitizeCalType(birth.calType),
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
      calType: sanitizeCalType(birth.calType),
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

  return {
    tier: entitlement.isActive ? entitlement.tier : "free",
    label: entitlement.label,
    isActive: entitlement.isActive,
    freeLimit: entitlement.maxCoveredCoin,
    profileLimit: entitlement.maxProfiles,
    source: entitlement.source,
    expiresAt: entitlement.expiresAt,
  };
}

function toClientProfile(doc) {
  const year = Number(doc?.birth?.year || 1900);
  const month = Number(doc?.birth?.month || 1);
  const day = Number(doc?.birth?.day || 1);
  const hour = Number(doc?.birth?.hour || 0);
  const minute = Number(doc?.birth?.minute || 0);
  const birthDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const birthTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  return {
    id: String(doc.profileId || ""),
    profileId: String(doc.profileId || ""),
    name: String(doc.name || "이름 없음"),
    gender: sanitizeGender(doc.gender),
    birthDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    birthTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    birthIso: `${birthDate} ${birthTime}`,
    birth: {
      year,
      month,
      day,
      hour,
      minute,
      calType: sanitizeCalType(doc?.birth?.calType),
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

function resolveCurrentId(rawCurrentId, profiles) {
  const currentId = sanitizeProfileId(rawCurrentId);
  if (!currentId) return "";
  for (let i = 0; i < profiles.length; i += 1) {
    if (String(profiles[i]?.id || "") === currentId) return currentId;
  }
  return "";
}

function resolveSingleProfileAccess(user, profiles, subscription) {
  const profileLimit = Number(subscription?.profileLimit || 1);
  const isSingleMode = false;
  const savedCurrentId = resolveCurrentId(user?.destinyProfilesCurrentId, profiles) || profiles[0]?.id || "";

  if (!isSingleMode) {
    return {
      profiles,
      currentId: savedCurrentId,
      profileAccess: {
        mode: "subscription",
        selectionRequired: false,
        locked: false,
        lockedProfileId: "",
        profileLimit,
      },
    };
  }

  if (profiles.length <= 1) {
    const onlyId = profiles[0]?.id || "";
    return {
      profiles,
      currentId: onlyId,
      profileAccess: {
        mode: "single",
        selectionRequired: false,
        locked: Boolean(onlyId),
        lockedProfileId: onlyId,
        profileLimit: 1,
      },
    };
  }

  const lockedId = resolveCurrentId(user?.destinyProfilesLockedCurrentId, profiles);
  if (lockedId) {
    return {
      profiles: profiles.filter((profile) => String(profile?.id || "") === lockedId),
      currentId: lockedId,
      profileAccess: {
        mode: "single",
        selectionRequired: false,
        locked: true,
        lockedProfileId: lockedId,
        profileLimit: 1,
      },
    };
  }

  return {
    profiles,
    currentId: savedCurrentId,
    profileAccess: {
      mode: "single",
      selectionRequired: true,
      locked: false,
      lockedProfileId: "",
      profileLimit: 1,
    },
  };
}

async function listUserProfiles(userId) {
  const docs = await ProfileCard.find({ userId }).sort({ createdAt: 1 }).lean();
  return docs.map(toClientProfile);
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
    message: "프로필 카드 추가/삭제는 50코인 또는 5,000원 결제 후 가능합니다.",
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
    $or: [
      { "metadata.requestId": paymentRequestId },
      { "metadata.profilePaymentKey": paymentRequestId },
    ],
  }).lean();
  if (existing) return { ok: true, requestId: paymentRequestId, idempotent: true };

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
    return { ok: false, response: profilePaymentRequiredResponse(action, paymentRequestId) };
  }

  await PointHistory.create({
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
      purpose: "profile_card_manage",
      forceDeduct: true,
      requestId: paymentRequestId,
      profilePaymentKey: paymentRequestId,
      profileAction: action,
      profileId,
      coinPrice: PROFILE_CARD_MANAGE_COST,
      membershipCreditCost: PROFILE_CARD_MANAGE_MEMBERSHIP_COST,
      remainingMembershipCredit: Number(updatedUser?.profileSubscription?.membershipCreditBalance || 0),
      paidAmount: PROFILE_CARD_MANAGE_AMOUNT_KRW,
    },
  });

  return { ok: true, requestId: paymentRequestId, idempotent: false };
}

async function handleGetProfiles(auth) {
  const user = await User.findById(auth.userId)
    .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt destinyProfilesCurrentId destinyProfilesLockedCurrentId destinyProfilesLockedAt")
    .lean();

  if (!user) {
    return json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });
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
    profiles: access.profiles,
    currentId,
    subscription,
    profileAccess: access.profileAccess,
    canCreateMore: true,
  });
}

async function handleCreateProfile(request, auth) {
  try {
    const user = await User.findById(auth.userId)
      .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt destinyProfilesCurrentId destinyProfilesLockedCurrentId destinyProfilesLockedAt")
      .lean();

    if (!user) {
      return json({ ok: false, success: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    const subscription = resolveSubscriptionPolicy(user);
    const count = await ProfileCard.countDocuments({ userId: auth.userId });

    const body = await readJson(request);
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

    if (count > 0) {
      const payment = await ensureProfileMutationPayment(auth, {
        action: "create",
        profileId: normalized.profileId,
        requestId: body?.requestId || body?.payment?.requestId || body?.consume?.requestId || body?.accessGrant?.requestId,
      });
      if (!payment.ok) return payment.response;
    }

    const created = await ProfileCard.create({
      userId: auth.userId,
      profileId: normalized.profileId,
      name: normalized.name,
      gender: normalized.gender,
      birth: normalized.birth,
      location: normalized.location,
    });

    const profile = toClientProfile(created.toObject());
    const nextCurrentId = String(profile.id || "");

    if (nextCurrentId !== String(user.destinyProfilesCurrentId || "")) {
      await User.updateOne({ _id: auth.userId }, { $set: { destinyProfilesCurrentId: nextCurrentId } });
    }

    return json({
      success: true,
      message: "PROFILE_CREATED_SUCCESSFULLY",
      data: profile,
      ok: true,
      profile,
      currentId: nextCurrentId,
      subscription,
      canCreateMore: true,
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
    return json({ ok: false, message: "currentId가 필요합니다." }, { status: 400 });
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
  const profileLimit = Number(subscription.profileLimit || 1);
  const isSingleMode = false;
  const lockedId = resolveCurrentId(user.destinyProfilesLockedCurrentId, profiles);

  if (isSingleMode && lockedId && requestedCurrentId !== lockedId) {
    return json({
      ok: false,
      code: "PROFILE_SINGLE_LOCKED",
      message: "이용권 혜택 종료 후 확정한 프로필 카드만 사용할 수 있습니다.",
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

async function handlePatchProfile(request, auth, profileIdRaw) {
  const profileId = sanitizeProfileId(profileIdRaw);
  if (!profileId) return json({ ok: false, message: "유효한 profileId가 필요합니다." }, { status: 400 });

  const body = await readJson(request);
  const normalized = normalizeIncomingProfile({
    ...body,
    profileId,
  }, 0);

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

  if (!updated) return json({ ok: false, message: "프로필 카드를 찾을 수 없습니다." }, { status: 404 });
  return json({ ok: true, profile: toClientProfile(updated) });
}

async function handleDeleteProfile(request, auth, profileIdRaw) {
  const profileId = sanitizeProfileId(profileIdRaw);
  if (!profileId) return json({ ok: false, message: "유효한 profileId가 필요합니다." }, { status: 400 });

  const existingProfile = await ProfileCard.findOne({ userId: auth.userId, profileId }).lean();
  if (!existingProfile) return json({ ok: false, message: "?꾨줈??移대뱶瑜?李얠쓣 ???놁뒿?덈떎." }, { status: 404 });

  const body = await readJson(request).catch(() => ({}));
  const payment = await ensureProfileMutationPayment(auth, {
    action: "delete",
    profileId,
    requestId: body?.requestId || body?.payment?.requestId || body?.consume?.requestId || body?.accessGrant?.requestId,
  });
  if (!payment.ok) return payment.response;

  const deleted = await ProfileCard.findOneAndDelete({ userId: auth.userId, profileId }).lean();
  if (!deleted) return json({ ok: false, message: "프로필 카드를 찾을 수 없습니다." }, { status: 404 });

  const profiles = await listUserProfiles(auth.userId);
  const user = await User.findById(auth.userId).select("destinyProfilesCurrentId").lean();
  const nextCurrentId = resolveCurrentId(user?.destinyProfilesCurrentId, profiles) || profiles[0]?.id || "";

  await User.updateOne({ _id: auth.userId }, { $set: { destinyProfilesCurrentId: nextCurrentId } });

  return json({ ok: true, deletedProfileId: profileId, profiles, currentId: nextCurrentId, canCreateMore: true });
}

export async function handleProfileRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/profile");
    const auth = await requireUserFromRequest(request, env);

    await connectDb(env);

    if (method === "GET" && path === "/") return await handleGetProfiles(auth);
    if (method === "POST" && path === "/") return await handleCreateProfile(request, auth);
    if (method === "PATCH" && path === "/current") return await handleUpdateCurrent(request, auth);

    const profileMatch = path.match(/^\/([^/]+)$/);
    if (profileMatch && method === "PATCH") {
      return await handlePatchProfile(request, auth, profileMatch[1]);
    }
    if (profileMatch && method === "DELETE") {
      return await handleDeleteProfile(request, auth, profileMatch[1]);
    }

    if (["GET", "POST", "PATCH", "DELETE"].includes(method)) return notFound();
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

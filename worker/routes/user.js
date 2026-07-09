import { connectDb } from "../lib/db.js";
import { PointHistory, ProfileCard, User } from "../lib/models.js";
import { getOptionalUserFromRequest, requireUserFromRequest } from "../lib/auth.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import {
  normalizeHoneyPassEntitlement,
  resolveCurrentProfileId as resolveCurrentId,
  resolveSingleProfileAccess,
} from "../lib/profile-limits.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";

const MAX_SYNC_PROFILES = 30;
const MAX_PROFILE_ID_LEN = 80;
const MAX_NAME_LEN = 80;
const MAX_TAMAGOTCHI_TEXT_LEN = 180;
const PROFILE_CARD_MANAGE_FEATURE_KEY = "profile-card-manage";
const PROFILE_CARD_MANAGE_COST = 50;
const PROFILE_CARD_MANAGE_AMOUNT_KRW = 5000;
const PROFILE_CARD_MANAGE_MEMBERSHIP_COST = calculateMembershipCreditCost(PROFILE_CARD_MANAGE_COST);

function buildErrorDetails(stage, error, extras = {}) {
  return {
    stage: String(stage || "user-route"),
    name: error?.name || "Error",
    code: error?.code || "USER_ROUTE_ERROR",
    message: String(error?.message || "Unknown error"),
    ...(extras && typeof extras === "object" ? extras : {}),
  };
}

function logUserRouteError(stage, error, request, extras = {}) {
  const payload = {
    route: "user",
    method: request?.method || "",
    path: request ? new URL(request.url).pathname : "",
    ...buildErrorDetails(stage, error, extras),
  };

  try {
    console.error("[worker-user-route-error]", JSON.stringify(payload));
  } catch (e) {
    console.error("[worker-user-route-error]", payload);
  }
}

function sanitizeString(value, maxLen) {
  return String(value || "").trim().slice(0, maxLen);
}

function sanitizeProfileId(value) {
  return sanitizeString(value, MAX_PROFILE_ID_LEN).replace(/\s+/g, "_");
}

function sanitizeName(value) {
  return sanitizeString(value, MAX_NAME_LEN) || "이름 없음";
}

function sanitizeTamagotchiText(value, fallback = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return (text || fallback).slice(0, MAX_TAMAGOTCHI_TEXT_LEN);
}

function clampPercent(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function sanitizeTamagotchiAction(value) {
  const action = String(value || "").trim();
  if (action === "feed" || action === "play" || action === "rest" || action === "fortune") return action;
  return null;
}

function normalizeTamagotchi(raw) {
  if (!raw || typeof raw !== "object") return null;
  const source = raw;
  const now = new Date().toISOString();
  const animalId = sanitizeTamagotchiText(source.animalId, "").replace(/[^a-z0-9-]/gi, "").slice(0, 60);
  return {
    animalId: animalId || null,
    animalName: sanitizeTamagotchiText(source.animalName, "운명의 알"),
    stage: sanitizeTamagotchiText(source.stage, ""),
    hunger: clampPercent(source.hunger, 70),
    mood: clampPercent(source.mood, 70),
    bond: clampPercent(source.bond, 45),
    luck: clampPercent(source.luck, 70),
    energy: clampPercent(source.energy, 70),
    growth: clampPercent(source.growth, 30),
    todayFortune: sanitizeTamagotchiText(source.todayFortune, "오늘은 작은 돌봄 하나가 운의 문을 부드럽게 엽니다."),
    lastAction: sanitizeTamagotchiAction(source.lastAction),
    lastActionAt: sanitizeTamagotchiText(source.lastActionAt, "") || null,
    createdAt: sanitizeTamagotchiText(source.createdAt, now),
    updatedAt: now,
    ownerScope: "account",
  };
}

function sanitizeGender(value) {
  const normalized = String(value || "OTHER").trim().toUpperCase();
  if (normalized === "M" || normalized === "F") return normalized;
  return "OTHER";
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

function buildProfileId(rawProfileId, fallbackIndex) {
  const profileId = sanitizeProfileId(rawProfileId);
  if (profileId) return profileId;
  return `dp_${Date.now()}_${fallbackIndex}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeIncomingProfile(raw, index) {
  const source = raw && typeof raw === "object" ? raw : {};
  const birth = source.birth && typeof source.birth === "object" ? source.birth : {};
  const location = source.location && typeof source.location === "object" ? source.location : {};

  return {
    profileId: buildProfileId(source.profileId || source.id, index),
    name: sanitizeName(source.name),
    gender: sanitizeGender(source.gender),
    birth: {
      year: sanitizeInt(birth.year, 1000, 9999, 1900),
      month: sanitizeInt(birth.month, 1, 12, 1),
      day: sanitizeInt(birth.day, 1, 31, 1),
      hour: sanitizeInt(birth.hour, 0, 23, 0),
      minute: sanitizeInt(birth.minute, 0, 59, 0),
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

function normalizeProfileList(rawProfiles) {
  if (!Array.isArray(rawProfiles)) return [];

  const output = [];
  const seen = new Set();

  for (let i = 0; i < rawProfiles.length; i += 1) {
    if (output.length >= MAX_SYNC_PROFILES) break;
    const normalized = normalizeIncomingProfile(rawProfiles[i], i);
    if (!normalized.profileId || seen.has(normalized.profileId)) continue;

    seen.add(normalized.profileId);
    output.push(normalized);
  }

  return output;
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
    startedAt: entitlement.startedAt || null,
    expiresAt: entitlement.expiresAt,
  };
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
      year: Number(doc?.birth?.year || 1900),
      month: Number(doc?.birth?.month || 1),
      day: Number(doc?.birth?.day || 1),
      hour: Number(doc?.birth?.hour || 0),
      minute: Number(doc?.birth?.minute || 0),
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

function profilePaymentRequiredResponse(requestId) {
  return json({
    ok: false,
    code: "PAYMENT_REQUIRED",
    message: "프로필 카드 추가/삭제는 5,000원 또는 5,000원 결제 후 가능합니다.",
    pricing: {
      featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
      reason: "프로필 카드 추가/삭제",
      coinPrice: PROFILE_CARD_MANAGE_COST,
      membershipCreditCost: PROFILE_CARD_MANAGE_MEMBERSHIP_COST,
      amountKRW: PROFILE_CARD_MANAGE_AMOUNT_KRW,
      forceDeduct: true,
    },
    checkout: {
      endpoint: "/api/billing/checkout",
      payload: {
        paymentType: "digital_content",
        featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
        reason: "프로필 카드 추가/삭제",
        paymentAmount: PROFILE_CARD_MANAGE_AMOUNT_KRW,
        coinPrice: PROFILE_CARD_MANAGE_COST,
        membershipCreditCost: PROFILE_CARD_MANAGE_MEMBERSHIP_COST,
        requestId,
      },
    },
  }, { status: 402 });
}

async function ensureSyncProfileMutationPayment(auth, requestId) {
  const paymentRequestId = sanitizeString(requestId, 120) || `profile-card:sync:${Date.now().toString(36)}`;
  const existing = await PointHistory.findOne({
    userId: auth.userId,
    kind: "deduct",
    featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
    $or: [
      { "metadata.requestId": paymentRequestId },
      { "metadata.profilePaymentKey": paymentRequestId },
    ],
  }).lean();
  if (existing) return { ok: true };

  const seedUser = await User.findById(auth.userId)
    .select("points profileSubscription subscription membership membershipPass pass entitlement licensePass accessGateResult plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt")
    .lean();
  const entitlement = normalizeHoneyPassEntitlement(seedUser || {});
  if (entitlement.isActive && entitlement.tier === "family") {
    return { ok: true, freeBySubscription: true };
  }
  const legacyPoints = Math.floor(Number(seedUser?.points || 0));
  if (seedUser?._id && !seedUser?.profileSubscription?.legacyCoinCreditSeeded && legacyPoints > 0) {
    const legacyCredit = calculateMembershipCreditCost(legacyPoints);
    await User.updateOne(
      { _id: auth.userId, "profileSubscription.legacyCoinCreditSeeded": { $ne: true } },
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
    );
  }

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
  if (!updatedUser) return { ok: false, response: profilePaymentRequiredResponse(paymentRequestId) };

  await PointHistory.create({
    userId: auth.userId,
    kind: "deduct",
    delta: -PROFILE_CARD_MANAGE_COST,
    balanceAfter: Number(updatedUser.points || 0),
    reason: "프로필 카드 추가/삭제",
    featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
    metadata: {
      accessType: "membership_credit",
      accessMethod: "MONTHLY",
      paymentMethod: "MONTHLY",
      purpose: "profile_card_manage",
      requestId: paymentRequestId,
      profilePaymentKey: paymentRequestId,
      profileAction: "sync",
      coinPrice: PROFILE_CARD_MANAGE_COST,
      membershipCreditCost: PROFILE_CARD_MANAGE_MEMBERSHIP_COST,
      remainingMembershipCredit: Number(updatedUser?.profileSubscription?.membershipCreditBalance || 0),
      paidAmount: PROFILE_CARD_MANAGE_AMOUNT_KRW,
    },
  });

  return { ok: true };
}

async function handleGetDestinyProfiles(auth) {
  let user = null;
  try {
    user = await User.findById(auth.userId)
      .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt destinyProfilesCurrentId destinyProfilesLockedCurrentId destinyProfilesLockedAt")
      .lean();
  } catch (error) {
    console.error("[worker-user-route-error]", JSON.stringify(buildErrorDetails("query-destiny-profiles-user", error, {
      userId: String(auth?.userId || ""),
    })));
    return json({
      ok: false,
      degraded: true,
      profiles: [],
      currentId: "",
      code: "DB_FALLBACK",
      message: "프로필 동기화 서버가 일시적으로 불안정합니다.",
      debugMessage: String(error?.message || ""),
      errorDetails: buildErrorDetails("query-destiny-profiles-user", error, {
        userId: String(auth?.userId || ""),
      }),
    }, { status: 200 });
  }

  if (!user) {
    return json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const subscription = resolveSubscriptionPolicy(user);
  const profiles = await listUserProfiles(auth.userId);
  const access = resolveSingleProfileAccess(user, profiles, subscription, { allowZeroLimit: true });
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
    canCreateMore: true,
  });
}

async function handleSyncDestinyProfiles(request, auth) {
  const body = await readJson(request);
  const action = String(body?.action || "").trim().toLowerCase();
  if (action && action !== "sync") {
    return json({ ok: false, message: "Unsupported action." }, { status: 400 });
  }

  const user = await User.findById(auth.userId)
    .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt destinyProfilesCurrentId destinyProfilesLockedCurrentId destinyProfilesLockedAt")
    .lean();

  if (!user) {
    return json({ ok: false, message: "User not found." }, { status: 404 });
  }

  const subscription = resolveSubscriptionPolicy(user);
  const normalizedProfiles = normalizeProfileList(body?.profiles || []);
  const requestedCurrentId = sanitizeProfileId(body?.currentId);
  const baseCurrentId = sanitizeProfileId(body?.baseCurrentId);
  const storedCurrentId = sanitizeProfileId(user.destinyProfilesCurrentId);
  const existingProfiles = await listUserProfiles(auth.userId);
  const existingIds = new Set(existingProfiles.map((profile) => String(profile?.profileId || profile?.id || "")));
  const nextIdSet = new Set(normalizedProfiles.map((profile) => String(profile?.profileId || "")));
  const hasProfileAddition = normalizedProfiles.some((profile) => !existingIds.has(String(profile?.profileId || "")));
  const hasProfileDeletion = existingProfiles.some((profile) => !nextIdSet.has(String(profile?.profileId || profile?.id || "")));
  const isInitialProfileCreate = hasProfileAddition
    && !hasProfileDeletion
    && existingProfiles.length === 0
    && normalizedProfiles.length <= 1;
  if ((hasProfileAddition || hasProfileDeletion) && !isInitialProfileCreate) {
    const payment = await ensureSyncProfileMutationPayment(auth, body?.requestId || body?.payment?.requestId || body?.consume?.requestId || body?.accessGrant?.requestId);
    if (!payment.ok) return payment.response;
  }

  if (false && !subscription.isActive && normalizedProfiles.length > 1) {
    const lockedId = sanitizeProfileId(user.destinyProfilesLockedCurrentId);
    const hasLockedProfile = lockedId && normalizedProfiles.some((profile) => profile.profileId === lockedId);
    const hasRequestedProfile = requestedCurrentId && normalizedProfiles.some((profile) => profile.profileId === requestedCurrentId);
    return json({
      ok: false,
      code: hasLockedProfile ? "PROFILE_SINGLE_LOCKED" : "PROFILE_SELECTION_REQUIRED",
      message: hasLockedProfile
        ? "이용권 혜택 종료 후 확정한 프로필 카드만 사용할 수 있습니다."
        : "이용권 혜택이 종료되어 사용할 프로필 카드 1개를 먼저 선택해야 합니다.",
      currentId: hasLockedProfile ? lockedId : (hasRequestedProfile ? requestedCurrentId : ""),
      lockedProfileId: hasLockedProfile ? lockedId : "",
      profileAccess: {
        mode: "single",
        selectionRequired: !hasLockedProfile,
        locked: Boolean(hasLockedProfile),
        lockedProfileId: hasLockedProfile ? lockedId : "",
        profileLimit: 1,
      },
      subscription,
    }, { status: 409 });
  }

  if (false && normalizedProfiles.length > subscription.profileLimit) {
    return json({
      ok: false,
      code: "PROFILE_LIMIT_EXCEEDED",
      message: "무료 계정은 프로필 카드를 1개만 생성할 수 있습니다. 구독 후 추가 생성이 가능합니다.",
      subscription,
    }, { status: 403 });
  }

  try {
    if (normalizedProfiles.length > 0) {
      await ProfileCard.bulkWrite(
        normalizedProfiles.map((profile) => ({
          updateOne: {
            filter: { userId: auth.userId, profileId: profile.profileId },
            update: {
              $set: {
                name: profile.name,
                gender: profile.gender,
                birth: profile.birth,
                location: profile.location,
              },
            },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    }

    const nextIds = normalizedProfiles.map((profile) => profile.profileId);
    if (nextIds.length > 0) {
      await ProfileCard.deleteMany({ userId: auth.userId, profileId: { $nin: nextIds } });
    } else {
      await ProfileCard.deleteMany({ userId: auth.userId });
    }
  } catch (error) {
    console.error("[worker-user-route-error]", JSON.stringify(buildErrorDetails("sync-destiny-profiles", error, {
      userId: String(auth?.userId || ""),
      profileCount: normalizedProfiles.length,
    })));
    throw error;
  }

  const profiles = await listUserProfiles(auth.userId);
  // 다른 탭/스테일 클라이언트가 오래된 currentId로 sync를 호출해 서버의 "현재 프로필" 포인터를
  // 엉뚱한 프로필로 덮어쓰면, 프로필 스코프 잠금 콘텐츠 조회가 잘못된 profileId로 필터링되어
  // 이미 결제한 콘텐츠가 잠긴 것처럼 보인다. 이를 막기 위해 currentId 전환은 클라이언트가 보낸
  // baseCurrentId(그 클라이언트가 마지막으로 알고 있던 서버 값)가 서버 저장값과 일치할 때만 수용한다.
  const validStoredId = resolveCurrentId(storedCurrentId, profiles);
  const validRequestedId = resolveCurrentId(requestedCurrentId, profiles);
  const isIntentionalSwitch = Boolean(validRequestedId) && validRequestedId !== validStoredId;
  const switchIsSafe = !storedCurrentId || baseCurrentId === storedCurrentId;
  const currentIdChanged = isIntentionalSwitch && switchIsSafe;
  const currentId = currentIdChanged
    ? validRequestedId
    : (validStoredId || validRequestedId || profiles[0]?.id || "");
  const updateSet = {
    destinyProfilesCurrentId: currentId,
    destinyProfilesLockedCurrentId: "",
    destinyProfilesLockedAt: null,
  };
  if (currentIdChanged || (!validStoredId && currentId)) {
    updateSet.destinyProfilesCurrentIdUpdatedAt = new Date();
  }

  await User.updateOne(
    { _id: auth.userId },
    { $set: updateSet },
  );
  const access = resolveSingleProfileAccess({ ...user, ...updateSet }, profiles, subscription, { allowZeroLimit: true });

  return json({
    ok: true,
    profiles: markCurrentProfile(access.profiles, access.currentId),
    currentId: access.currentId,
    subscription,
    profileAccess: access.profileAccess,
    canCreateMore: true,
  });
}

async function handleGetTamagotchi(auth) {
  const user = await User.findById(auth.userId).select("tamagotchi").lean();
  if (!user) {
    return json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  return json({
    ok: true,
    tamagotchi: normalizeTamagotchi(user.tamagotchi),
  });
}

async function handlePutTamagotchi(request, auth) {
  const body = await readJson(request);
  const tamagotchi = normalizeTamagotchi(body?.tamagotchi || body);
  if (!tamagotchi?.animalId) {
    return json({ ok: false, message: "다마고치 캐릭터 정보가 필요합니다." }, { status: 400 });
  }

  const updated = await User.findByIdAndUpdate(
    auth.userId,
    { $set: { tamagotchi } },
    { returnDocument: "after", projection: { tamagotchi: 1 } },
  ).lean();

  if (!updated) {
    return json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  return json({
    ok: true,
    tamagotchi: normalizeTamagotchi(updated.tamagotchi),
  });
}

export async function handleUserRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/user");

    if (method === "GET" && path === "/tamagotchi") {
      const auth = await getOptionalUserFromRequest(request, env);
      if (!auth) {
        return json({ ok: false, code: "AUTH_REQUIRED", message: "로그인이 필요합니다." }, { status: 401 });
      }
      try {
        await connectDb(env);
      } catch (error) {
        logUserRouteError("connect-db-get-tamagotchi", error, request, {
          userId: String(auth?.userId || ""),
        });
        return json({
          ok: false,
          degraded: true,
          code: "DB_FALLBACK",
          message: "다마고치 동기화 서버가 일시적으로 불안정합니다.",
          debugMessage: String(error?.message || ""),
          errorDetails: buildErrorDetails("connect-db-get-tamagotchi", error),
        }, { status: 200 });
      }
      return await handleGetTamagotchi(auth);
    }

    if ((method === "PUT" || method === "POST") && path === "/tamagotchi") {
      const auth = await requireUserFromRequest(request, env);
      try {
        await connectDb(env);
      } catch (error) {
        logUserRouteError("connect-db-put-tamagotchi", error, request, {
          userId: String(auth?.userId || ""),
        });
        return json({
          ok: false,
          degraded: true,
          code: "DB_FALLBACK",
          message: "다마고치 동기화 서버가 일시적으로 불안정합니다.",
          debugMessage: String(error?.message || ""),
          errorDetails: buildErrorDetails("connect-db-put-tamagotchi", error),
        }, { status: 202 });
      }
      return await handlePutTamagotchi(request, auth);
    }

    if (method === "GET" && path === "/destiny-profiles") {
      const auth = await getOptionalUserFromRequest(request, env);
      if (!auth) {
        return json({ ok: false, code: "AUTH_REQUIRED", message: "로그인이 필요합니다." }, { status: 401 });
      }
      try {
        await connectDb(env);
      } catch (error) {
        logUserRouteError("connect-db-get-destiny-profiles", error, request, {
          userId: String(auth?.userId || ""),
        });
        return json({
          ok: false,
          degraded: true,
          code: "DB_FALLBACK",
          message: "프로필 동기화 서버가 일시적으로 불안정합니다.",
          debugMessage: String(error?.message || ""),
          errorDetails: buildErrorDetails("connect-db-get-destiny-profiles", error),
        }, { status: 200 });
      }
      return await handleGetDestinyProfiles(auth);
    }

    if (method === "POST" && path === "/destiny-profiles") {
      const auth = await requireUserFromRequest(request, env);
      try {
        await connectDb(env);
      } catch (error) {
        logUserRouteError("connect-db-post-destiny-profiles", error, request, {
          userId: String(auth?.userId || ""),
        });
        return json({
          ok: false,
          degraded: true,
          code: "DB_FALLBACK",
          message: "프로필 동기화 서버가 일시적으로 불안정합니다.",
          debugMessage: String(error?.message || ""),
          errorDetails: buildErrorDetails("connect-db-post-destiny-profiles", error),
        }, { status: 202 });
      }
      return await handleSyncDestinyProfiles(request, auth);
    }

    if (["GET", "POST", "PUT"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    logUserRouteError("handle-user-routes", error, request);
    return handleRouteError(error);
  }
}

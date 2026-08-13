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

// 서버 로그용. 원문 메시지를 포함한다 — 진단에 필요하고 콘솔은 클라이언트에 안 나간다.
function buildErrorDetails(stage, error, extras = {}) {
  return {
    stage: String(stage || "user-route"),
    name: error?.name || "Error",
    code: error?.code || "USER_ROUTE_ERROR",
    message: String(error?.message || "Unknown error"),
    ...(extras && typeof extras === "object" ? extras : {}),
  };
}

// 응답 본문용. 원문 메시지를 뺀다 — Mongo 타임아웃 메시지에는 Atlas 샤드 호스트명·IP 가 들어 있어
// 그대로 내보내면 무인증 정보노출이 된다(worker/lib/http.js 의 toPublicErrorDetails 와 같은 규칙).
// stage/name/code 는 분류값이라 남긴다. degraded 응답의 클라이언트 분기는 code 로만 한다.
function buildPublicErrorDetails(stage, error, extras = {}) {
  const { message: _omitted, ...publicDetails } = buildErrorDetails(stage, error, extras);
  return publicDetails;
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

const TAMAGOTCHI_ELEMENTS = new Set(["wood", "fire", "earth", "metal", "water"]);
const TAMAGOTCHI_THEMES = new Set(["moon", "strawberry", "cherry", "star", "angel"]);
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeTamagotchiEnum(value, allowed, fallback) {
  const text = String(value || "").trim().toLowerCase();
  return allowed.has(text) ? text : fallback;
}

function sanitizeDayKey(value) {
  const text = String(value || "").trim();
  return DAY_KEY_PATTERN.test(text) ? text : "";
}

// /tadagochi 의 펫 상태. 화이트리스트라 클라이언트가 보낸 임의 필드는 저장되지 않는다.
// 동물 키는 문자 제한을 걸지 않는다 — 클라이언트가 별칭(한글 포함)을 자기 쪽에서
// normalizeAnimalKey 로 정규화하므로 여기서 깎으면 되레 값이 깨진다.
function normalizeTamagotchi(raw) {
  if (!raw || typeof raw !== "object") return null;
  const source = raw;
  const now = new Date().toISOString();
  return {
    petName: sanitizeTamagotchiText(source.petName, ""),
    animal: sanitizeTamagotchiText(source.animal, "").slice(0, 40),
    zodiac: sanitizeTamagotchiText(source.zodiac, "").slice(0, 40),
    element: sanitizeTamagotchiEnum(source.element, TAMAGOTCHI_ELEMENTS, "water"),
    theme: sanitizeTamagotchiEnum(source.theme, TAMAGOTCHI_THEMES, "moon"),
    day: sanitizeInt(source.day, 1, 9999, 1),
    hunger: clampPercent(source.hunger, 70),
    happy: clampPercent(source.happy, 80),
    energy: clampPercent(source.energy, 90),
    fortune: clampPercent(source.fortune, 50),
    sleeping: Boolean(source.sleeping),
    birthYear: sanitizeInt(source.birthYear, 1900, 2200, 0),
    birthMonth: sanitizeInt(source.birthMonth, 1, 12, 6),
    birthDay: sanitizeInt(source.birthDay, 1, 31, 15),
    birthHour: sanitizeInt(source.birthHour, 0, 23, 12),
    // 하루 5회 운세 제한의 근거. 상한을 서버에서도 걸어 클라이언트 값만 믿지 않는다.
    chatCount: sanitizeInt(source.chatCount, 0, 5, 0),
    chatDate: sanitizeDayKey(source.chatDate),
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
  return { ok: false, response: profilePaymentRequiredResponse(paymentRequestId) };
}

/* 인증 조회(resolveActiveUserAuth)를 이 필드까지 확장해 auth.authUserDoc 로 받는다 —
   아래 handleGetDestinyProfiles 가 같은 User 를 재조회하던 왕복을 없앤다.
   🔴 바로 아래 select 문자열과 같은 집합을 유지할 것(필드가 빠지면 구독 등급이 조용히 오판된다). */
const DESTINY_PROFILES_USER_PROJECTION = {
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

async function handleGetDestinyProfiles(auth) {
  let user = auth.authUserDoc || null;
  try {
    if (!user) {
      user = await User.findById(auth.userId)
        .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt destinyProfilesCurrentId destinyProfilesLockedCurrentId destinyProfilesLockedAt")
        .lean();
    }
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
      errorDetails: buildPublicErrorDetails("query-destiny-profiles-user", error, {
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
    pet: normalizeTamagotchi(user.tamagotchi),
  });
}

async function handlePutTamagotchi(request, auth) {
  const body = await readJson(request);
  const pet = normalizeTamagotchi(body?.pet || body?.tamagotchi || body);
  // 클라이언트가 "펫이 있다"고 판정하는 기준과 같게 둔다(petName/animal/zodiac 중 하나).
  if (!pet || !(pet.petName || pet.animal || pet.zodiac)) {
    return json({ ok: false, message: "다마고치 캐릭터 정보가 필요합니다." }, { status: 400 });
  }

  const updated = await User.findByIdAndUpdate(
    auth.userId,
    { $set: { tamagotchi: pet } },
    { returnDocument: "after", projection: { tamagotchi: 1 } },
  ).lean();

  if (!updated) {
    return json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  return json({
    ok: true,
    pet: normalizeTamagotchi(updated.tamagotchi),
  });
}

async function handleDeleteTamagotchi(auth) {
  const updated = await User.findByIdAndUpdate(
    auth.userId,
    { $set: { tamagotchi: null } },
    { returnDocument: "after", projection: { _id: 1 } },
  ).lean();

  if (!updated) {
    return json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  return json({ ok: true, pet: null });
}

export async function handleUserRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/user");

    if (method === "GET" && path === "/tamagotchi") {
      // 읽기 전용 조회다. 바로 아래 connectDb 실패는 이미 200+degraded 로 다루면서
      // 그 앞의 인증 조회만 무방비로 두면, 같은 DB 블립이 인증 단계에서 터졌을 때만
      // catch-all 로 새어 503 이 된다 — 같은 완충을 인증에도 씌운다.
      let auth;
      try {
        auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
      } catch (error) {
        logUserRouteError("auth-get-tamagotchi", error, request);
        return json({
          ok: false,
          degraded: true,
          code: "DB_FALLBACK",
          message: "다마고치 동기화 서버가 일시적으로 불안정합니다.",
          errorDetails: buildPublicErrorDetails("auth-get-tamagotchi", error),
        }, { status: 200 });
      }
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
          errorDetails: buildPublicErrorDetails("connect-db-get-tamagotchi", error),
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
          errorDetails: buildPublicErrorDetails("connect-db-put-tamagotchi", error),
        }, { status: 202 });
      }
      return await handlePutTamagotchi(request, auth);
    }

    if (method === "DELETE" && path === "/tamagotchi") {
      const auth = await requireUserFromRequest(request, env);
      try {
        await connectDb(env);
      } catch (error) {
        logUserRouteError("connect-db-delete-tamagotchi", error, request, {
          userId: String(auth?.userId || ""),
        });
        return json({
          ok: false,
          degraded: true,
          code: "DB_FALLBACK",
          message: "다마고치 동기화 서버가 일시적으로 불안정합니다.",
          errorDetails: buildPublicErrorDetails("connect-db-delete-tamagotchi", error),
        }, { status: 202 });
      }
      return await handleDeleteTamagotchi(auth);
    }

    if (method === "GET" && path === "/destiny-profiles") {
      // 읽기 전용 조회다. 바로 아래 connectDb 실패는 이미 200+degraded 로 다루면서
      // 그 앞의 인증 조회만 무방비로 두면, 같은 DB 블립이 인증 단계에서 터졌을 때만
      // catch-all 로 새어 503 이 된다 — 같은 완충을 인증에도 씌운다.
      let auth;
      try {
        // 인증 조회를 확장해 authUserDoc 를 받아, 아래 handleGetDestinyProfiles 가 같은 User 를
        // 다시 읽던 두 번째 왕복을 없앤다(읽기 전용 경로라 스냅샷 재사용이 안전하다).
        auth = await getOptionalUserFromRequest(request, env, {
          surfaceDbInfraError: true,
          userProjection: DESTINY_PROFILES_USER_PROJECTION,
        });
      } catch (error) {
        logUserRouteError("auth-get-destiny-profiles", error, request);
        return json({
          ok: false,
          degraded: true,
          code: "DB_FALLBACK",
          message: "프로필 동기화 서버가 일시적으로 불안정합니다.",
          errorDetails: buildPublicErrorDetails("auth-get-destiny-profiles", error),
        }, { status: 200 });
      }
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
          errorDetails: buildPublicErrorDetails("connect-db-get-destiny-profiles", error),
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
          errorDetails: buildPublicErrorDetails("connect-db-post-destiny-profiles", error),
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

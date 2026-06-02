import { connectDb } from "../lib/db.js";
import { ProfileCard, User } from "../lib/models.js";
import { getOptionalUserFromRequest, requireUserFromRequest } from "../lib/auth.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { normalizeHoneyPassEntitlement } from "../lib/profile-limits.js";

const MAX_SYNC_PROFILES = 30;
const MAX_PROFILE_ID_LEN = 80;
const MAX_NAME_LEN = 80;

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
    expiresAt: entitlement.expiresAt,
  };
}

function toClientProfile(doc) {
  return {
    id: String(doc.profileId || ""),
    profileId: String(doc.profileId || ""),
    name: String(doc.name || "이름 없음"),
    gender: sanitizeGender(doc.gender),
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
  const isSingleMode = !subscription?.isActive || !Number.isFinite(profileLimit) || profileLimit <= 1;
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
    canCreateMore: profiles.length < subscription.profileLimit && !access.profileAccess.selectionRequired,
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

  if (!subscription.isActive && normalizedProfiles.length > 1) {
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

  if (normalizedProfiles.length > subscription.profileLimit) {
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
  const currentId = resolveCurrentId(requestedCurrentId, profiles) || profiles[0]?.id || "";
  const updateSet = { destinyProfilesCurrentId: currentId };
  if (subscription.isActive) {
    updateSet.destinyProfilesLockedCurrentId = "";
    updateSet.destinyProfilesLockedAt = null;
  } else if (currentId) {
    updateSet.destinyProfilesLockedCurrentId = currentId;
    updateSet.destinyProfilesLockedAt = new Date();
  }

  await User.updateOne(
    { _id: auth.userId },
    { $set: updateSet },
  );
  const access = resolveSingleProfileAccess({ ...user, ...updateSet }, profiles, subscription);

  return json({
    ok: true,
    profiles: access.profiles,
    currentId: access.currentId,
    subscription,
    profileAccess: access.profileAccess,
    canCreateMore: profiles.length < subscription.profileLimit && !access.profileAccess.selectionRequired,
  });
}

export async function handleUserRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/user");

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

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    logUserRouteError("handle-user-routes", error, request);
    return handleRouteError(error);
  }
}

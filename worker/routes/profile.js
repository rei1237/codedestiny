import { connectDb } from "../lib/db.js";
import { requireUserFromRequest } from "../lib/auth.js";
import { ProfileCard, User } from "../lib/models.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";

const PROFILE_LIMIT_BY_TIER = Object.freeze({
  standard: 3,
  premium: 7,
  vvip: 15,
});

const MAX_PROFILE_ID_LEN = 80;
const MAX_NAME_LEN = 80;

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

function resolveSubscriptionPolicy(user) {
  const tierRaw = String(user?.profileSubscription?.tier || "").trim().toLowerCase();
  const expiresAtRaw = user?.profileSubscription?.expiresAt;
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
  const hasPlan = Object.prototype.hasOwnProperty.call(PROFILE_LIMIT_BY_TIER, tierRaw);
  const isActive = Boolean(
    hasPlan
      && expiresAt
      && Number.isFinite(expiresAt.getTime())
      && expiresAt.getTime() > Date.now(),
  );

  return {
    tier: isActive ? tierRaw : "free",
    isActive,
    profileLimit: isActive ? PROFILE_LIMIT_BY_TIER[tierRaw] : 1,
    expiresAt: isActive && expiresAt ? expiresAt.toISOString() : null,
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

async function listUserProfiles(userId) {
  const docs = await ProfileCard.find({ userId }).sort({ createdAt: 1 }).lean();
  return docs.map(toClientProfile);
}

async function handleGetProfiles(auth) {
  const user = await User.findById(auth.userId)
    .select("profileSubscription destinyProfilesCurrentId")
    .lean();

  if (!user) {
    return json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const subscription = resolveSubscriptionPolicy(user);
  const profiles = await listUserProfiles(auth.userId);
  const currentId = resolveCurrentId(user.destinyProfilesCurrentId, profiles) || profiles[0]?.id || "";

  if (currentId && currentId !== String(user.destinyProfilesCurrentId || "")) {
    await User.updateOne({ _id: auth.userId }, { $set: { destinyProfilesCurrentId: currentId } });
  }

  return json({
    ok: true,
    profiles,
    currentId,
    subscription,
    canCreateMore: profiles.length < subscription.profileLimit,
  });
}

async function handleCreateProfile(request, auth) {
  const user = await User.findById(auth.userId)
    .select("profileSubscription destinyProfilesCurrentId")
    .lean();

  if (!user) {
    return json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const subscription = resolveSubscriptionPolicy(user);
  const count = await ProfileCard.countDocuments({ userId: auth.userId });

  if (count >= subscription.profileLimit) {
    return json({
      ok: false,
      code: "PROFILE_LIMIT_EXCEEDED",
      message: "무료 계정은 프로필 카드를 1개만 생성할 수 있습니다. 구독 후 추가 생성이 가능합니다.",
      subscription,
    }, { status: 403 });
  }

  const body = await readJson(request);
  const normalized = normalizeIncomingProfile(body?.profile || body, count);
  const duplicated = await ProfileCard.findOne({ userId: auth.userId, profileId: normalized.profileId }).lean();

  if (duplicated) {
    return json({ ok: false, code: "PROFILE_ID_CONFLICT", message: "이미 존재하는 프로필 ID입니다." }, { status: 409 });
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
  const nextCurrentId = String(user.destinyProfilesCurrentId || "") || profile.id;

  if (nextCurrentId !== String(user.destinyProfilesCurrentId || "")) {
    await User.updateOne({ _id: auth.userId }, { $set: { destinyProfilesCurrentId: nextCurrentId } });
  }

  return json({
    ok: true,
    profile,
    currentId: nextCurrentId,
    subscription,
    canCreateMore: count + 1 < subscription.profileLimit,
  }, { status: 201 });
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

  await User.updateOne({ _id: auth.userId }, { $set: { destinyProfilesCurrentId: requestedCurrentId } });
  return json({ ok: true, currentId: requestedCurrentId });
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

async function handleDeleteProfile(auth, profileIdRaw) {
  const profileId = sanitizeProfileId(profileIdRaw);
  if (!profileId) return json({ ok: false, message: "유효한 profileId가 필요합니다." }, { status: 400 });

  const deleted = await ProfileCard.findOneAndDelete({ userId: auth.userId, profileId }).lean();
  if (!deleted) return json({ ok: false, message: "프로필 카드를 찾을 수 없습니다." }, { status: 404 });

  const profiles = await listUserProfiles(auth.userId);
  const user = await User.findById(auth.userId).select("destinyProfilesCurrentId").lean();
  const nextCurrentId = resolveCurrentId(user?.destinyProfilesCurrentId, profiles) || profiles[0]?.id || "";

  await User.updateOne({ _id: auth.userId }, { $set: { destinyProfilesCurrentId: nextCurrentId } });

  return json({ ok: true, deletedProfileId: profileId, profiles, currentId: nextCurrentId });
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
      return await handleDeleteProfile(auth, profileMatch[1]);
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

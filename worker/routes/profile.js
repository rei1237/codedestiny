import { connectDb } from "../lib/db.js";
import { requireUserFromRequest } from "../lib/auth.js";
import { ProfileCard, User } from "../lib/models.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { PROFILE_LIMIT_BY_TIER } from "../lib/profile-limits.js";

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
  try {
    const user = await User.findById(auth.userId)
      .select("profileSubscription destinyProfilesCurrentId")
      .lean();

    if (!user) {
      return json({ ok: false, success: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    const subscription = resolveSubscriptionPolicy(user);
    const count = await ProfileCard.countDocuments({ userId: auth.userId });
    const profileLimit = Number(subscription.profileLimit);
    const hasLimit = Number.isFinite(profileLimit) && profileLimit > 0;

    if (hasLimit && count >= profileLimit) {
      const exceededMessage = subscription.tier === "free" ? "LIMIT_EXCEEDED_FREE" : "LIMIT_EXCEEDED_PREMIUM";
      return json({
        ok: false,
        success: false,
        message: exceededMessage,
        subscription,
      }, { status: 403 });
    }

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
      canCreateMore: hasLimit ? (count + 1 < profileLimit) : true,
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

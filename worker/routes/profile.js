import { connectDb } from "../lib/db.js";
import { User } from "../lib/models.js";
import { requireUserFromRequest } from "../lib/auth.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";

const CALENDAR_TYPES = new Set(["solar", "lunar"]);
const PROFILE_GENDERS = new Set(["male", "female", "other", ""]);

function toText(value, maxLen = 200) {
  return String(value || "").trim().slice(0, maxLen);
}

function toIsoOrNow(value) {
  const date = value ? new Date(value) : new Date();
  if (!Number.isFinite(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function normalizeCalendarType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return CALENDAR_TYPES.has(normalized) ? normalized : "solar";
}

function normalizeProfileGender(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "m") return "male";
  if (raw === "f") return "female";
  if (raw === "male" || raw === "female" || raw === "other" || raw === "") return raw;
  return "";
}

function normalizeUserGender(profileGender) {
  if (profileGender === "male") return "M";
  if (profileGender === "female") return "F";
  return "OTHER";
}

function sanitizeSajuProfile(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const source = value;
  return {
    yearPillar: toText(source.yearPillar, 20),
    monthPillar: toText(source.monthPillar, 20),
    dayPillar: toText(source.dayPillar, 20),
    hourPillar: toText(source.hourPillar, 20),
    dayMaster: toText(source.dayMaster, 20),
  };
}

function sanitizePreferences(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}

function buildProfile(userId, userDoc) {
  const profile = userDoc?.profileMe && typeof userDoc.profileMe === "object" ? userDoc.profileMe : {};
  const profileGender = normalizeProfileGender(profile.gender || userDoc?.gender);
  const calendarType = normalizeCalendarType(profile.calendarType);

  return {
    userId,
    displayName: toText(profile.displayName || userDoc?.name, 80),
    birthDate: toText(profile.birthDate || userDoc?.birthDate, 20),
    birthTime: toText(profile.birthTime || userDoc?.birthTime, 20),
    calendarType,
    gender: PROFILE_GENDERS.has(profileGender) ? profileGender : "",
    timezone: toText(profile.timezone || "Asia/Seoul", 60),
    location: toText(profile.location, 120),
    sajuProfile: sanitizeSajuProfile(profile.sajuProfile),
    preferences: sanitizePreferences(profile.preferences),
    createdAt: toIsoOrNow(profile.createdAt || userDoc?.createdAt),
    updatedAt: toIsoOrNow(profile.updatedAt || userDoc?.updatedAt),
  };
}

function mergeProfileInput(baseProfile, payload) {
  const input = payload && typeof payload === "object" ? payload : {};
  const next = {
    ...baseProfile,
    displayName: input.displayName !== undefined ? toText(input.displayName, 80) : baseProfile.displayName,
    birthDate: input.birthDate !== undefined ? toText(input.birthDate, 20) : baseProfile.birthDate,
    birthTime: input.birthTime !== undefined ? toText(input.birthTime, 20) : baseProfile.birthTime,
    calendarType: input.calendarType !== undefined ? normalizeCalendarType(input.calendarType) : normalizeCalendarType(baseProfile.calendarType),
    gender: input.gender !== undefined ? normalizeProfileGender(input.gender) : normalizeProfileGender(baseProfile.gender),
    timezone: input.timezone !== undefined ? toText(input.timezone, 60) : toText(baseProfile.timezone, 60),
    location: input.location !== undefined ? toText(input.location, 120) : toText(baseProfile.location, 120),
    sajuProfile: input.sajuProfile !== undefined ? sanitizeSajuProfile(input.sajuProfile) : sanitizeSajuProfile(baseProfile.sajuProfile),
    preferences: input.preferences !== undefined ? sanitizePreferences(input.preferences) : sanitizePreferences(baseProfile.preferences),
    createdAt: toIsoOrNow(baseProfile.createdAt),
    updatedAt: new Date().toISOString(),
  };

  return next;
}

async function handleGetProfileMe(request, env) {
  const auth = await requireUserFromRequest(request, env);
  await connectDb(env);

  const user = await User.findById(auth.userId)
    .select("name birthDate birthTime gender profileMe createdAt updatedAt")
    .lean();

  if (!user) {
    return json({ ok: false, code: "USER_NOT_FOUND", message: "사용자 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  return json({
    ok: true,
    profile: buildProfile(String(auth.userId), user),
  });
}

async function handleUpsertProfileMe(request, env) {
  const auth = await requireUserFromRequest(request, env);
  await connectDb(env);

  const body = await readJson(request);
  const currentUser = await User.findById(auth.userId)
    .select("name birthDate birthTime gender profileMe createdAt updatedAt")
    .lean();

  if (!currentUser) {
    return json({ ok: false, code: "USER_NOT_FOUND", message: "사용자 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  const currentProfile = buildProfile(String(auth.userId), currentUser);
  const nextProfile = mergeProfileInput(currentProfile, body);

  const update = {
    $set: {
      profileMe: nextProfile,
      ...(nextProfile.displayName ? { name: nextProfile.displayName } : {}),
      ...(nextProfile.birthDate ? { birthDate: nextProfile.birthDate } : {}),
      ...(nextProfile.birthTime ? { birthTime: nextProfile.birthTime } : {}),
      gender: normalizeUserGender(nextProfile.gender),
    },
  };

  const updated = await User.findByIdAndUpdate(
    auth.userId,
    update,
    {
      new: true,
      projection: {
        name: 1,
        birthDate: 1,
        birthTime: 1,
        gender: 1,
        profileMe: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ).lean();

  if (!updated) {
    return json({ ok: false, code: "USER_NOT_FOUND", message: "사용자 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  return json({
    ok: true,
    message: "프로필이 저장되었습니다.",
    profile: buildProfile(String(auth.userId), updated),
  });
}

export async function handleProfileRoutes(request, env) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/profile");

  try {
    if (path === "/me") {
      if (method === "GET") return await handleGetProfileMe(request, env);
      if (method === "PUT" || method === "PATCH") return await handleUpsertProfileMe(request, env);
      return methodNotAllowed();
    }

    if (["GET", "PUT", "PATCH"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, {
      request,
      env,
      trace: {
        route: "profile",
        requestPath: new URL(request.url).pathname,
        method,
      },
    });
  }
}

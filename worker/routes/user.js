import { connectDb } from "../lib/db.js";
import { User } from "../lib/models.js";
import { getOptionalUserFromRequest, requireUserFromRequest } from "../lib/auth.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";

const MAX_DESTINY_PROFILES = 30;
const MAX_PROFILE_ID_LEN = 80;

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
  } catch {
    console.error("[worker-user-route-error]", payload);
  }
}

function sanitizeProfileId(value) {
  return String(value || "").trim().slice(0, MAX_PROFILE_ID_LEN);
}

function sanitizeDestinyProfiles(rawProfiles) {
  if (!Array.isArray(rawProfiles)) return [];

  const sanitized = [];
  const seenIds = new Set();

  for (let i = 0; i < rawProfiles.length; i += 1) {
    if (sanitized.length >= MAX_DESTINY_PROFILES) break;
    const profile = rawProfiles[i];
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) continue;

    let cloned;
    try {
      cloned = JSON.parse(JSON.stringify(profile));
    } catch {
      continue;
    }

    const id = sanitizeProfileId(cloned?.id);
    if (!id || seenIds.has(id)) continue;

    cloned.id = id;
    seenIds.add(id);
    sanitized.push(cloned);
  }

  return sanitized;
}

function resolveCurrentId(rawCurrentId, profiles) {
  const currentId = sanitizeProfileId(rawCurrentId);
  if (!currentId) return "";

  for (let i = 0; i < profiles.length; i += 1) {
    if (String(profiles[i]?.id || "") === currentId) return currentId;
  }

  return "";
}

async function handleGetDestinyProfiles(auth) {
  let user = null;
  try {
    user = await User.findById(auth.userId)
      .select("destinyProfiles destinyProfilesCurrentId")
      .lean();
  } catch (error) {
    console.error("[worker-user-route-error]", JSON.stringify(buildErrorDetails("query-destiny-profiles", error, {
      userId: String(auth?.userId || ""),
    })));
    throw error;
  }

  if (!user) {
    return json({ ok: true, profiles: [], currentId: "" });
  }

  const profiles = sanitizeDestinyProfiles(user.destinyProfiles || []);
  const currentId = resolveCurrentId(user.destinyProfilesCurrentId, profiles);

  return json({ ok: true, profiles, currentId });
}

async function handleSyncDestinyProfiles(request, auth) {
  const body = await readJson(request);
  const action = String(body?.action || "").trim().toLowerCase();
  if (action && action !== "sync") {
    return json({ ok: false, message: "Unsupported action." }, { status: 400 });
  }

  const profiles = sanitizeDestinyProfiles(body?.profiles || []);
  const currentId = resolveCurrentId(body?.currentId, profiles);

  let updated = null;
  try {
    updated = await User.findByIdAndUpdate(
      auth.userId,
      {
        $set: {
          destinyProfiles: profiles,
          destinyProfilesCurrentId: currentId,
        },
      },
      {
        new: true,
        projection: {
          destinyProfiles: 1,
          destinyProfilesCurrentId: 1,
        },
      },
    ).lean();
  } catch (error) {
    console.error("[worker-user-route-error]", JSON.stringify(buildErrorDetails("sync-destiny-profiles", error, {
      userId: String(auth?.userId || ""),
      profileCount: profiles.length,
    })));
    throw error;
  }

  if (!updated) return json({ ok: false, message: "User not found." }, { status: 404 });

  const nextProfiles = sanitizeDestinyProfiles(updated.destinyProfiles || []);
  const nextCurrentId = resolveCurrentId(updated.destinyProfilesCurrentId, nextProfiles);

  return json({ ok: true, profiles: nextProfiles, currentId: nextCurrentId });
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

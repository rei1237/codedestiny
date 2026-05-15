import { connectDb } from "../lib/db.js";
import { User } from "../lib/models.js";
import { getOptionalUserFromRequest, requireUserFromRequest } from "../lib/auth.js";
import {
  getRoutePath,
  handleRouteError,
  json,
  logApiCatchDiagnostic,
  methodNotAllowed,
  notFound,
  readJson,
} from "../lib/http.js";

const MAX_DESTINY_PROFILES = 30;
const MAX_PROFILE_ID_LEN = 80;

function hasMongoBinding(env = {}) {
  return Boolean(String(env?.MONGO_URI || env?.MONGODB_URI || "").trim());
}

function buildStorageFailureResponse(env, error, fallbackCode = "DB_QUERY_FAILED") {
  const configMissing = !hasMongoBinding(env);
  const status = configMissing ? 500 : 503;
  const code = configMissing ? "SERVER_CONFIG_ERROR" : "SERVICE_UNAVAILABLE";
  const message = configMissing
    ? "서버 설정 또는 데이터 조회 중 오류가 발생했습니다."
    : "프로필 저장소가 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.";
  return json({
    ok: false,
    code,
    causeCode: fallbackCode,
    message,
    ...(configMissing ? { detail: String(error?.message || "") } : {}),
  }, { status });
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
  const user = await User.findById(auth.userId)
    .select("destinyProfiles destinyProfilesCurrentId")
    .lean();

  if (!user) {
    return json({ ok: true, profiles: [], currentId: "" });
  }

  const profiles = sanitizeDestinyProfiles(user.destinyProfiles || []);
  const currentId = resolveCurrentId(user.destinyProfilesCurrentId, profiles);

  return json({ ok: true, profiles, currentId });
}

function handleDestinyProfilesDbFallback(auth) {
  return json({
    ok: true,
    profiles: [],
    currentId: "",
    degraded: true,
    code: "DESTINY_PROFILE_STORAGE_UNAVAILABLE",
    message: "프로필 저장소가 일시적으로 불안정하여 로컬 데이터로 동작합니다.",
    user: {
      id: String(auth?.userId || ""),
      points: Number(auth?.points || 0),
    },
  });
}

async function handleSyncDestinyProfiles(request, auth) {
  const body = await readJson(request);
  const action = String(body?.action || "").trim().toLowerCase();
  if (action && action !== "sync") {
    return json({ ok: false, message: "Unsupported action." }, { status: 400 });
  }

  const profiles = sanitizeDestinyProfiles(body?.profiles || []);
  const currentId = resolveCurrentId(body?.currentId, profiles);

  const updated = await User.findByIdAndUpdate(
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

  if (!updated) return json({ ok: false, message: "User not found." }, { status: 404 });

  const nextProfiles = sanitizeDestinyProfiles(updated.destinyProfiles || []);
  const nextCurrentId = resolveCurrentId(updated.destinyProfilesCurrentId, nextProfiles);

  return json({ ok: true, profiles: nextProfiles, currentId: nextCurrentId });
}

async function handleSyncDestinyProfilesDegraded(request, auth) {
  let body = {};
  try {
    body = await readJson(request);
  } catch {
    body = {};
  }

  const profiles = sanitizeDestinyProfiles(body?.profiles || []);
  const currentId = resolveCurrentId(body?.currentId, profiles);

  return json({
    ok: true,
    profiles,
    currentId,
    degraded: true,
    code: "DESTINY_PROFILE_STORAGE_UNAVAILABLE",
    message: "프로필 저장소가 일시적으로 불안정하여 로컬 데이터로 동작합니다.",
    user: {
      id: String(auth?.userId || ""),
      points: Number(auth?.points || 0),
    },
  });
}

export async function handleUserRoutes(request, env) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/user");
  const trace = {
    route: "user",
    requestPath: new URL(request.url).pathname,
    method,
    hasSession: Boolean(request.headers.get("Authorization") || request.headers.get("Cookie")),
    envBindingExists: hasMongoBinding(env),
    userIdExists: false,
  };

  try {
    if (method === "GET" && path === "/destiny-profiles") {
      const auth = await getOptionalUserFromRequest(request, env);
      if (!auth) {
        return json({ ok: false, code: "AUTH_REQUIRED", message: "로그인이 필요합니다." }, { status: 401 });
      }
      trace.userIdExists = Boolean(String(auth?.userId || auth?.id || "").trim());
      try {
        await connectDb(env);
      } catch (error) {
        logApiCatchDiagnostic({
          request,
          route: "/api/user/destiny-profiles",
          method,
          userId: auth?.userId || auth?.id,
          env,
          hasSession: true,
          envBindingExists: hasMongoBinding(env),
          error,
        });
        return buildStorageFailureResponse(env, error, "DB_QUERY_FAILED");
      }
      try {
        return await handleGetDestinyProfiles(auth);
      } catch (error) {
        logApiCatchDiagnostic({
          request,
          route: "/api/user/destiny-profiles",
          method,
          userId: auth?.userId || auth?.id,
          env,
          hasSession: true,
          envBindingExists: hasMongoBinding(env),
          error,
        });
        return buildStorageFailureResponse(env, error, "DB_QUERY_FAILED");
      }
    }

    if (method === "POST" && path === "/destiny-profiles") {
      const auth = await requireUserFromRequest(request, env);
      trace.userIdExists = Boolean(String(auth?.userId || auth?.id || "").trim());
      try {
        await connectDb(env);
      } catch (error) {
        logApiCatchDiagnostic({
          request,
          route: "/api/user/destiny-profiles",
          method,
          userId: auth?.userId || auth?.id,
          env,
          hasSession: true,
          envBindingExists: hasMongoBinding(env),
          error,
        });
        return buildStorageFailureResponse(env, error, "DB_QUERY_FAILED");
      }

      try {
        return await handleSyncDestinyProfiles(request, auth);
      } catch (error) {
        logApiCatchDiagnostic({
          request,
          route: "/api/user/destiny-profiles",
          method,
          userId: auth?.userId || auth?.id,
          env,
          hasSession: true,
          envBindingExists: hasMongoBinding(env),
          error,
        });
        return buildStorageFailureResponse(env, error, "DB_QUERY_FAILED");
      }
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    logApiCatchDiagnostic({
      request,
      route: `/api/user${path}`,
      method,
      userId: "",
      env,
      hasSession: trace.hasSession,
      envBindingExists: trace.envBindingExists,
      error,
    });
    return handleRouteError(error, { request, env, trace });
  }
}

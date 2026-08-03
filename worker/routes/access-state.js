import { peekAccessTokenUserId, requireUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { getRoutePath, handleRouteError, isDbUnavailableError, json, methodNotAllowed, notFound } from "../lib/http.js";
import { resolveActivePassPolicy } from "../lib/profile-limits.js";
import {
  ACCESS_STATE_USER_PROJECTION,
  clearAccessStateInFlight,
  readAccessStateCache,
  readAccessStateInFlight,
  resolveCompleteAccessState,
  writeAccessStateCache,
  writeAccessStateInFlight,
} from "../lib/access-state.js";

function responseHeaders(state) {
  const entitlementVersion = String(state?.versions?.entitlementVersion || state?.entitlementSnapshot?.entitlementVersion || "unknown")
    .replace(/[^a-zA-Z0-9._:-]/g, "_")
    .slice(0, 120);
  return {
    "Cache-Control": "private, max-age=60, stale-while-revalidate=1800",
    "ETag": `W/\"${entitlementVersion}\"`,
    "Last-Modified": new Date(state?.fetchedAt || Date.now()).toUTCString(),
    "X-Access-State-Source": String(state?.source || "db"),
  };
}

function responseFor(state, degraded = false, request = null) {
  const headers = responseHeaders(state);
  if (degraded) headers["Cache-Control"] = "private, no-store";
  if (!degraded && request?.headers?.get("If-None-Match") === headers.ETag) {
    return new Response(null, { status: 304, headers });
  }
  return json({
    ok: true,
    data: { ...state, degraded },
    ...state,
    degraded,
  }, {
    status: 200,
    headers,
  });
}

function isAccessStateEnabled(env = {}) {
  const configured = String(env.ACCESS_STATE_ENABLED || "").trim().toLowerCase();
  if (configured) return ["1", "true", "yes", "on"].includes(configured);
  const nodeEnv = String(env.NODE_ENV || env.ENV || "").trim().toLowerCase();
  return nodeEnv !== "production";
}

function degradedHeaders(request, stage) {
  return {
    "Retry-After": "2",
    "X-Request-ID": String(request.headers.get("x-request-id") || request.headers.get("cf-ray") || "unknown").slice(0, 120),
    "X-CD-Error-Stage": stage,
    "Server-Timing": `cd-error;desc=\"${stage}\"`,
  };
}

function buildDegradedAccessState(userId, profileId, code) {
  const checkedAt = new Date().toISOString();
  return {
    userId: String(userId || "").trim(),
    profileId: String(profileId || "").trim(),
    currentProfileId: String(profileId || "").trim(),
    version: "degraded",
    completeness: "degraded",
    completenessDetails: {
      account: "unavailable",
      profile: "unavailable",
      pass: "unavailable",
      monthlyCredits: "unavailable",
    },
    authority: "none",
    source: "degraded",
    checkedAt,
    fetchedAt: checkedAt,
    degraded: true,
    code,
  };
}

export async function handleAccessStateRoutes(request, env) {
  const trace = { route: "me/access-state", method: request.method, authVerified: false, dbConnected: false };
  let userId = "";
  let profileId = "";
  try {
    const method = String(request.method || "GET").toUpperCase();
    const path = getRoutePath(request, "/api/me/access-state");
    if (method !== "GET") return methodNotAllowed();
    if (path !== "/") return notFound();
    if (!isAccessStateEnabled(env)) return notFound();

    const requestedProfileId = String(new URL(request.url).searchParams.get("profileId") || "").trim();
    profileId = requestedProfileId;
    userId = await peekAccessTokenUserId(request, env);
    const auth = await requireUserFromRequest(request, env, {
      surfaceDbInfraError: true,
      userProjection: ACCESS_STATE_USER_PROJECTION,
    });
    trace.authPresent = true;
    trace.authVerified = true;
    userId = String(auth.userId || "").trim();
    const storedProfileId = String(auth.authUserDoc?.destinyProfilesCurrentId || "").trim();
    profileId = requestedProfileId || storedProfileId;

    const cached = readAccessStateCache(userId, { profileId });
    if (cached) return responseFor(cached, false, request);

    const pending = readAccessStateInFlight(userId, { profileId });
    if (pending) return responseFor(await pending, false, request);

    const promise = (async () => {
      const user = auth.authUserDoc || {};
      const entitlement = resolveActivePassPolicy(user || {});
      const state = await resolveCompleteAccessState({
        userId,
        user: { ...user, activeEntitlement: entitlement },
        profileId,
        source: "db",
      });
      return writeAccessStateCache(userId, state, { profileId });
    })();
    writeAccessStateInFlight(userId, promise, { profileId });
    try {
      return responseFor(await promise, false, request);
    } finally {
      clearAccessStateInFlight(userId, promise, { profileId });
    }
  } catch (error) {
    const stale = userId ? readAccessStateCache(userId, { profileId, allowStale: true }) : null;
    if (stale) return responseFor(stale, true, request);
    if (/timeout|timed out/i.test(String(error?.message || error || ""))) {
      if (userId) {
        return responseFor(buildDegradedAccessState(userId, profileId, "ACCESS_STATE_TIMEOUT"), true, request);
      }
      return json({
        ok: false,
        code: "ACCESS_STATE_TIMEOUT",
        degraded: true,
        retryable: true,
        message: "접근 상태 확인 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.",
      }, { status: 504, headers: degradedHeaders(request, "db-op-timeout") });
    }
    if (isAuthDbInfraError(error) || isDbUnavailableError(error)) {
      if (userId) {
        return responseFor(buildDegradedAccessState(userId, profileId, "ACCESS_STATE_UNAVAILABLE"), true, request);
      }
      return json({
        ok: false,
        code: "ACCESS_STATE_UNAVAILABLE",
        degraded: true,
        retryable: true,
        message: "접근 상태를 잠시 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      }, { status: 503, headers: degradedHeaders(request, "db") });
    }
    return handleRouteError(error, { env, request, trace });
  }
}

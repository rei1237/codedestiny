import { requireUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { withMongoRetry } from "../lib/db.js";
import { getRoutePath, handleRouteError, isDbUnavailableError, json, methodNotAllowed, notFound } from "../lib/http.js";
import { ProfileCard } from "../lib/models.js";
import { resolveActivePassPolicy } from "../lib/profile-limits.js";
import {
  ACCESS_STATE_USER_PROJECTION,
  buildAccessState,
  clearAccessStateInFlight,
  readAccessStateCache,
  readAccessStateInFlight,
  writeAccessStateCache,
  writeAccessStateInFlight,
} from "../lib/access-state.js";

function responseFor(state, degraded = false) {
  return json({
    ok: true,
    data: { ...state, degraded },
    ...state,
    degraded,
  }, {
    status: 200,
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=1800",
      "X-Access-State-Source": String(state?.source || "db"),
    },
  });
}

function isAccessStateEnabled(env = {}) {
  const configured = String(env.ACCESS_STATE_ENABLED || "").trim().toLowerCase();
  if (configured) return ["1", "true", "yes", "on"].includes(configured);
  const nodeEnv = String(env.NODE_ENV || env.ENV || "").trim().toLowerCase();
  return nodeEnv !== "production";
}

export async function handleAccessStateRoutes(request, env) {
  const trace = { route: "me/access-state", method: request.method, authVerified: false, dbConnected: false };
  let userId = "";
  try {
    const method = String(request.method || "GET").toUpperCase();
    const path = getRoutePath(request, "/api/me/access-state");
    if (method !== "GET") return methodNotAllowed();
    if (path !== "/") return notFound();
    if (!isAccessStateEnabled(env)) return notFound();

    const auth = await requireUserFromRequest(request, env, {
      surfaceDbInfraError: true,
      userProjection: ACCESS_STATE_USER_PROJECTION,
    });
    trace.authPresent = true;
    trace.authVerified = true;
    userId = String(auth.userId || "").trim();

    const cached = readAccessStateCache(userId);
    if (cached) return responseFor(cached);

    const pending = readAccessStateInFlight(userId);
    if (pending) return responseFor(await pending);

    const promise = (async () => {
      const user = auth.authUserDoc || {};
      const profileCount = await withMongoRetry(env, () => ProfileCard.countDocuments({ userId }));
      const entitlement = resolveActivePassPolicy(user || {});
      const state = buildAccessState({
        userId,
        user: { ...user, activeEntitlement: entitlement },
        profileCount,
        source: "db",
      });
      return writeAccessStateCache(userId, state);
    })();
    writeAccessStateInFlight(userId, promise);
    try {
      return responseFor(await promise);
    } finally {
      clearAccessStateInFlight(userId, promise);
    }
  } catch (error) {
    const stale = userId ? readAccessStateCache(userId, { allowStale: true }) : null;
    if (stale) return responseFor(stale, true);
    if (/timeout|timed out/i.test(String(error?.message || error || ""))) {
      return json({
        ok: false,
        code: "ACCESS_STATE_TIMEOUT",
        degraded: true,
        retryable: true,
        message: "접근 상태 확인 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.",
      }, { status: 504, headers: { "Retry-After": "2" } });
    }
    if (isAuthDbInfraError(error) || isDbUnavailableError(error)) {
      return json({
        ok: false,
        code: "ACCESS_STATE_UNAVAILABLE",
        degraded: true,
        retryable: true,
        message: "접근 상태를 잠시 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      }, { status: 503, headers: { "Retry-After": "2" } });
    }
    return handleRouteError(error, { env, request, trace });
  }
}

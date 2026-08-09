import { peekAccessTokenUserId, requireUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { getRoutePath, handleRouteError, isDbUnavailableError, json, methodNotAllowed, notFound } from "../lib/http.js";
import { resolveActivePassPolicy } from "../lib/profile-limits.js";
import {
  ACCESS_STATE_USER_PROJECTION,
  attachDegradedGuardianUsageToAccessState,
  attachGuardianUsageToAccessState,
  clearAccessStateInFlight,
  readAccessStateCache,
  readAccessStateInFlight,
  resolveCompleteAccessState,
  writeAccessStateCache,
  writeAccessStateInFlight,
} from "../lib/access-state.js";
import { buildApiError, buildApiMeta, requestIdFromRequest } from "../lib/api-contract.js";
import {
  buildGuardianFortuneUsageStatus,
  createMongoGuardianFortuneStore,
  getGuardianFortuneDateKey,
  isGuardianFortuneApiEnabled,
} from "../lib/guardian-fortune-usage.js";

function responseHeaders(state) {
  const accessStateVersion = String(state?.versions?.accessStateVersion || state?.versions?.entitlementVersion || state?.entitlementSnapshot?.entitlementVersion || "unknown")
    .replace(/[^a-zA-Z0-9._:-]/g, "_")
    .slice(0, 120);
  return {
    "Cache-Control": "private, max-age=60, stale-while-revalidate=1800",
    "ETag": `W/\"${accessStateVersion}\"`,
    "Last-Modified": new Date(state?.fetchedAt || Date.now()).toUTCString(),
    "X-Access-State-Source": String(state?.source || "db"),
  };
}

function diagnosticsEnabled(env = {}) {
  return ["1", "true", "yes", "on"].includes(String(env.ACCESS_STATE_DIAGNOSTICS_ENABLED || "").trim().toLowerCase());
}

async function anonymizeUserId(userId) {
  const value = String(userId || "").trim();
  if (!value || !globalThis.crypto?.subtle) return "anonymous";
  const bytes = new TextEncoder().encode(`access-state:${value}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).slice(0, 8).map((item) => item.toString(16).padStart(2, "0")).join("");
}

function classifyAccessError(error, stage = "") {
  const message = String(error?.message || error || "");
  const code = String(error?.code || error?.name || "").toUpperCase();
  if (/admission|wait queue|pool.*queue/i.test(message) || /ADMISSION|OVERLOAD/.test(code)) return "DUPLICATE_REQUEST_OVERLOAD";
  if (/rate.?limit/i.test(message) || /RATE_LIMIT/.test(code)) return "RATE_LIMITED";
  if (/server selection|connect(?:ion)?.*timed out|MONGO.*CONNECT/i.test(message) || stage === "db-connect") return "DB_CONNECTION_TIMEOUT";
  if (/operation timed out|query.*timed out|socket.*timed out/i.test(message) || stage === "db-query") return "DB_QUERY_TIMEOUT";
  if (/auth/i.test(message) || stage === "auth") return "AUTH_NOT_READY";
  if (/dependency|guardian/i.test(message) || stage === "guardian") return "INTERNAL_DEPENDENCY_ERROR";
  return "UNKNOWN_SERVER_ERROR";
}

async function logAccessStateDiagnostics(env, trace, response, userId, errorType = "") {
  if (!diagnosticsEnabled(env)) return;
  const payload = {
    requestId: trace.requestId,
    userHash: await anonymizeUserId(userId),
    route: trace.route,
    authReady: trace.authVerified === true,
    authMs: Math.max(0, Math.round(Number(trace.authMs || 0))),
    entitlementQueryMs: Math.max(0, Math.round(Number(trace.entitlementQueryMs || 0))),
    guardianQueryMs: Math.max(0, Math.round(Number(trace.guardianQueryMs || 0))),
    cache: trace.cache || "miss",
    singleFlightJoin: trace.singleFlightJoin === true,
    externalApiCalled: false,
    status: Number(response?.status || 0),
    errorType: errorType || trace.errorType || null,
    totalMs: Math.max(0, Math.round(Date.now() - trace.startedAt)),
  };
  console.info("[access-state-diagnostics]", JSON.stringify(payload));
}

function responseFor(state, degraded = false, request = null) {
  const headers = responseHeaders(state);
  if (degraded) headers["Cache-Control"] = "private, no-store";
  const requestId = requestIdFromRequest(request);
  if (!degraded && request?.headers?.get("If-None-Match") === headers.ETag) {
    return new Response(null, { status: 304, headers });
  }
  return json({
    ok: true,
    data: { ...state, degraded },
    meta: buildApiMeta({
      generatedAt: state?.fetchedAt,
      stale: degraded,
      source: state?.source || (degraded ? "degraded" : "db"),
      expiresAt: state?.expiresAt || null,
    }),
    requestId,
    ...state,
    degraded,
  }, {
    status: 200,
    headers,
  });
}

function isAccessStateEnabled(env = {}) {
  const configured = String(env.ACCESS_STATE_ENABLED || "").trim().toLowerCase();
  if (!configured) return true;
  return !["0", "false", "no", "off"].includes(configured);
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
  const trace = {
    route: "me/access-state",
    method: request.method,
    requestId: requestIdFromRequest(request),
    startedAt: Date.now(),
    authVerified: false,
    dbConnected: false,
    cache: "miss",
    singleFlightJoin: false,
  };
  let userId = "";
  let profileId = "";
  let include = "";
  const finish = async (response, errorType = "") => {
    await logAccessStateDiagnostics(env, trace, response, userId, errorType);
    return response;
  };
  try {
    const method = String(request.method || "GET").toUpperCase();
    const path = getRoutePath(request, "/api/me/access-state");
    if (method !== "GET") return methodNotAllowed();
    if (path !== "/") return notFound();
    if (!isAccessStateEnabled(env)) return notFound();

    const url = new URL(request.url);
    const requestedProfileId = String(url.searchParams.get("profileId") || "").trim();
    const includeValues = String(url.searchParams.get("include") || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    const includeGuardian = includeValues.includes("guardian");
    include = includeGuardian ? "guardian" : "";
    profileId = requestedProfileId;
    const authStartedAt = Date.now();
    userId = await peekAccessTokenUserId(request, env);
    trace.authMs = Date.now() - authStartedAt;

    const pending = userId ? readAccessStateInFlight(userId, { profileId: requestedProfileId, include }) : null;
    if (pending) {
      trace.singleFlightJoin = true;
      trace.cache = "single-flight";
      const shared = await pending;
      userId = shared.userId;
      profileId = shared.profileId;
      trace.authVerified = true;
      trace.authMs = shared.authMs;
      trace.entitlementQueryMs = shared.entitlementQueryMs;
      trace.guardianQueryMs = shared.guardianQueryMs;
      trace.errorType = shared.errorType || "";
      return finish(responseFor(shared.state, false, request), shared.errorType || "");
    }

    const promise = (async () => {
      const verifiedAuthStartedAt = Date.now();
      const auth = await requireUserFromRequest(request, env, {
        surfaceDbInfraError: true,
        userProjection: ACCESS_STATE_USER_PROJECTION,
      });
      const authMs = Date.now() - verifiedAuthStartedAt;
      const verifiedUserId = String(auth.userId || "").trim();
      const storedProfileId = String(auth.authUserDoc?.destinyProfilesCurrentId || "").trim();
      const resolvedProfileId = requestedProfileId || storedProfileId;
      const cached = readAccessStateCache(verifiedUserId, { profileId: resolvedProfileId, include });
      if (cached) {
        return { state: cached, userId: verifiedUserId, profileId: resolvedProfileId, authMs, entitlementQueryMs: 0, guardianQueryMs: 0, cache: "hit", errorType: "" };
      }

      const entitlementStartedAt = Date.now();
      const user = auth.authUserDoc || {};
      const entitlement = resolveActivePassPolicy(user || {});
      let state = await resolveCompleteAccessState({
        userId: verifiedUserId,
        user: { ...user, activeEntitlement: entitlement },
        profileId: resolvedProfileId,
        source: "db",
      });
      const entitlementQueryMs = Date.now() - entitlementStartedAt;
      let guardianQueryMs = 0;
      let errorType = "";
      if (includeGuardian) {
        const guardianStartedAt = Date.now();
        try {
          const usage = isGuardianFortuneApiEnabled(env)
            ? await buildGuardianFortuneUsageStatus({
              userId: verifiedUserId,
              dateKey: getGuardianFortuneDateKey(new Date()),
              store: createMongoGuardianFortuneStore({ env }),
            })
            : { isLoggedIn: true, canGenerate: false, generationSource: "blocked", nextAction: "wait_tomorrow" };
          state = attachGuardianUsageToAccessState(state, usage);
        } catch (guardianError) {
          errorType = classifyAccessError(guardianError, "guardian");
          state = attachDegradedGuardianUsageToAccessState(state, errorType);
        } finally {
          guardianQueryMs = Date.now() - guardianStartedAt;
        }
      }
      if (!state?.freeUsage?.guardian?.degraded) {
        state = writeAccessStateCache(verifiedUserId, state, { profileId: resolvedProfileId, include });
      }
      return { state, userId: verifiedUserId, profileId: resolvedProfileId, authMs, entitlementQueryMs, guardianQueryMs, cache: "miss", errorType };
    })();
    if (userId) writeAccessStateInFlight(userId, promise, { profileId: requestedProfileId, include });
    try {
      const resolved = await promise;
      userId = resolved.userId;
      profileId = resolved.profileId;
      trace.authPresent = true;
      trace.authVerified = true;
      trace.authMs = resolved.authMs;
      trace.entitlementQueryMs = resolved.entitlementQueryMs;
      trace.guardianQueryMs = resolved.guardianQueryMs;
      trace.cache = resolved.cache;
      trace.errorType = resolved.errorType || "";
      return finish(responseFor(resolved.state, false, request), resolved.errorType || "");
    } finally {
      if (userId) clearAccessStateInFlight(userId, promise, { profileId: requestedProfileId, include });
    }
  } catch (error) {
    const requestId = trace.requestId;
    const errorType = classifyAccessError(error, trace.authVerified ? "db-query" : "auth");
    let stale = userId ? readAccessStateCache(userId, { profileId, include, allowStale: true }) : null;
    if (!stale && include === "guardian" && userId) {
      const entitlementStale = readAccessStateCache(userId, { profileId, allowStale: true });
      if (entitlementStale) stale = attachDegradedGuardianUsageToAccessState(entitlementStale, errorType);
    }
    if (stale) return finish(responseFor(stale, true, request), errorType);
    if (/timeout|timed out/i.test(String(error?.message || error || ""))) {
      if (userId) {
        return finish(responseFor(buildDegradedAccessState(userId, profileId, "ACCESS_STATE_TIMEOUT"), true, request), errorType);
      }
      return finish(json({
        ok: false,
        code: "ACCESS_STATE_TIMEOUT",
        error: buildApiError({ code: "ACCESS_STATE_TIMEOUT", retryable: true, message: "접근 상태 확인 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.", requestId }),
        requestId,
        degraded: true,
        retryable: true,
        message: "접근 상태 확인 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.",
      }, { status: 504, headers: degradedHeaders(request, "db-op-timeout") }), errorType);
    }
    if (isAuthDbInfraError(error) || isDbUnavailableError(error)) {
      // 🔴 userId 유무로 갈라 맨 503 을 내지 않는다. 여기의 userId 는 peekAccessTokenUserId 가
      // **액세스 JWT 만** 보고 뽑은 값이고(DB 없음), 액세스 토큰 수명은 30분인데 리프레시는 14일이다.
      // 즉 30분 지난 정상 로그인 사용자는 HttpOnly 리프레시 쿠키만 들고 있어 userId 가 "" 이 되고,
      // 바로 위 분기가 주려던 우아한 degraded-200 대신 맨 503 을 받았다(로그인했는데 화면이 깨지는 증상).
      //
      // 진짜 게스트는 이 분기에 닿지 않는다 — 토큰이 없으면 requireUserFromRequest 가 401 을 던지고
      // isAuthDbInfraError 가 그걸 걸러내 아래 handleRouteError(=401)로 간다. 284행에 오는 것은
      // '토큰은 있었는데 DB 가 실패한' 요청뿐이므로, 신원 미상이어도 degraded 로 답하는 편이 맞다.
      // buildDegradedAccessState 는 빈 userId 를 이미 처리하고 completeness:"degraded"/authority:"none"
      // 을 달아서, 클라이언트가 이걸 '이용권 미보유 확정' 으로 오독할 수 없다.
      return finish(responseFor(buildDegradedAccessState(userId, profileId, "ACCESS_STATE_UNAVAILABLE"), true, request), errorType);
    }
    return finish(handleRouteError(error, { env, request, trace }), errorType);
  }
}

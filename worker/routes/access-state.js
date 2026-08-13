import { peekAccessTokenUserId, requireUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { getRoutePath, handleRouteError, isDbUnavailableError, isPermanentMongoError, json, methodNotAllowed, notFound } from "../lib/http.js";
import { resolveActivePassPolicy } from "../lib/profile-limits.js";
import {
  ACCESS_STATE_USER_PROJECTION,
  attachDegradedGuardianUsageToAccessState,
  attachGuardianUsageToAccessState,
  readAccessStateCache,
  resolveCompleteAccessState,
  writeAccessStateCache,
} from "../lib/access-state.js";
import { buildApiMeta, requestIdFromRequest } from "../lib/api-contract.js";
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

    // 🔴 요청 간 in-flight Promise 공유(globalThis 캐시)는 두지 않는다. Cloudflare Workers 는 한 요청의
    // I/O 컨텍스트에서 만든 Promise 를 다른 요청이 이어받는 것을 금지하며, 위반하면 런타임이
    // "A promise was resolved... from a different request context" 로 continuation 을 취소한다.
    // 그 요청은 응답을 못 받은 채 op 타임아웃까지 끌려가 503 으로 죽는다(2026-08-09 실측, 같은 이유로
    // worker/lib/auth.js 의 auth dedup 이 6ab597c0b 에서 제거됐다 — 여기만 남아 있었다).
    //
    // 게다가 이 캐시에는 고유한 고장 모드가 하나 더 있었다: 정리(clear)가 finally 에 있어 클라이언트가
    // 요청을 abort 하면 건너뛰어지고, 죽은 Promise 가 맵에 남아 **그 아이솔레이트의 이후 모든 동일
    // 사용자 요청이 영원히 거기 조인**했다.
    //
    // 결과 TTL 캐시(readAccessStateCache/writeAccessStateCache)는 그대로 둔다 — 그건 Promise 가 아니라
    // 평범한 데이터라 요청 간 공유가 합법이고, 버스트 병합 효과도 대부분 그쪽이 낸다.
    const verifiedAuthStartedAt = Date.now();
    const auth = await requireUserFromRequest(request, env, {
      surfaceDbInfraError: true,
      userProjection: ACCESS_STATE_USER_PROJECTION,
    });
    trace.authMs = Date.now() - verifiedAuthStartedAt;
    trace.authPresent = true;
    trace.authVerified = true;
    userId = String(auth.userId || "").trim();
    const storedProfileId = String(auth.authUserDoc?.destinyProfilesCurrentId || "").trim();
    profileId = requestedProfileId || storedProfileId;

    const cached = readAccessStateCache(userId, { profileId, include });
    if (cached) {
      trace.cache = "hit";
      return finish(responseFor(cached, false, request), "");
    }

    const entitlementStartedAt = Date.now();
    const user = auth.authUserDoc || {};
    const entitlement = resolveActivePassPolicy(user || {});
    let state = await resolveCompleteAccessState({
      userId,
      user: { ...user, activeEntitlement: entitlement },
      profileId,
      source: "db",
    });
    trace.entitlementQueryMs = Date.now() - entitlementStartedAt;
    let errorType = "";
    if (includeGuardian) {
      const guardianStartedAt = Date.now();
      try {
        const usage = isGuardianFortuneApiEnabled(env)
          ? await buildGuardianFortuneUsageStatus({
            userId,
            dateKey: getGuardianFortuneDateKey(new Date()),
            store: createMongoGuardianFortuneStore({ env }),
          })
          : { isLoggedIn: true, canGenerate: false, generationSource: "blocked", nextAction: "wait_tomorrow" };
        state = attachGuardianUsageToAccessState(state, usage);
      } catch (guardianError) {
        errorType = classifyAccessError(guardianError, "guardian");
        state = attachDegradedGuardianUsageToAccessState(state, errorType);
      } finally {
        trace.guardianQueryMs = Date.now() - guardianStartedAt;
      }
    }
    if (!state?.freeUsage?.guardian?.degraded) {
      state = writeAccessStateCache(userId, state, { profileId, include });
    }
    trace.cache = "miss";
    trace.errorType = errorType;
    return finish(responseFor(state, false, request), errorType);
  } catch (error) {
    const errorType = classifyAccessError(error, trace.authVerified ? "db-query" : "auth");
    let stale = userId ? readAccessStateCache(userId, { profileId, include, allowStale: true }) : null;
    if (!stale && include === "guardian" && userId) {
      const entitlementStale = readAccessStateCache(userId, { profileId, allowStale: true });
      if (entitlementStale) stale = attachDegradedGuardianUsageToAccessState(entitlementStale, errorType);
    }
    if (stale) return finish(responseFor(stale, true, request), errorType);
    // 🔴 인프라 실패를 userId 유무로 갈라 맨 504/503 을 내지 않는다.
    //
    // 여기의 userId 는 peekAccessTokenUserId 가 **액세스 JWT 만** 보고 뽑은 값이다(DB 없음).
    // 액세스 토큰 수명은 30분인데 리프레시는 14일이라, 30분 지난 정상 로그인 사용자는 HttpOnly
    // 리프레시 쿠키만 들고 있어 userId 가 "" 이 된다. 그러면 바로 옆 분기가 주려던 우아한
    // degraded-200 대신 맨 504/503 을 받았다 — "로그인했는데 화면이 깨진다" 의 정체다.
    //
    // 진짜 게스트는 이 분기에 닿지 않는다: 토큰이 없으면 requireUserFromRequest 가 401 을 던지고
    // 그 에러는 timeout 정규식에도 isAuthDbInfraError 에도 걸리지 않아 아래 handleRouteError(=401)로
    // 그대로 간다. 여기 오는 것은 '토큰은 있었는데 DB 가 느리거나 실패한' 요청뿐이므로, 신원을
    // 확정하지 못했더라도 degraded 로 답하는 편이 맞다.
    //
    // 오독 위험도 없다 — buildDegradedAccessState 는 빈 userId 를 이미 처리하고
    // completeness:"degraded" / authority:"none" 을 달기 때문에, 클라이언트(js/core/pass-verdict.js
    // isUntrustedNoneSource)가 이걸 '이용권 미보유 확정' 스냅샷으로 저장할 수 없다.
    //
    // 🔴 isPermanentMongoError 를 함께 보는 이유: isDbUnavailableError 가 영구 Mongo 오류를 제외하도록
    // 좁혀졌는데(http.js), 이 라우트는 원래부터 "DB 쪽 문제면 종류를 안 가리고 degraded 스냅샷"이
    // 의도였다. 그 좁힘이 여기까지 번지면 접근상태 조회가 degraded-200 대신 500 을 내고, 그건
    // pass-verdict 스냅샷 경로를 통째로 깨뜨린다. 500↔503 교정은 handleRouteError 쪽에서만 받는다.
    const infraCode = /timeout|timed out/i.test(String(error?.message || error || ""))
      ? "ACCESS_STATE_TIMEOUT"
      : ((isAuthDbInfraError(error) || isDbUnavailableError(error) || isPermanentMongoError(error))
        ? "ACCESS_STATE_UNAVAILABLE"
        : "");
    if (infraCode) {
      return finish(responseFor(buildDegradedAccessState(userId, profileId, infraCode), true, request), errorType);
    }
    return finish(handleRouteError(error, { env, request, trace }), errorType);
  }
}

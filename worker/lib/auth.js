import { getEnv } from "./env.js";
import { cookieValue, createHttpError, getRequestMeta } from "./http.js";
import { signJwt, verifyJwt } from "./jwt.js";
import { createHash } from "node:crypto";
import { connectDb, mongoose, withMongoRetry, isTransientMongoError } from "./db.js";
import { RefreshTokenSession, User } from "./models.js";
import { normalizeHoneyPassEntitlement, PASS_LIMITS } from "./profile-limits.js";
import { ensureLotsForBalance, resolveNextExpiry } from "./monthly-credit-lots.js";

export const JWT_ISSUER = "code-destiny-api";
export const ACCESS_COOKIE_NAME = "fortune_auth_token";
export const REFRESH_COOKIE_NAME = "fortune_auth_refresh";
export const APP_REFRESH_TOKEN_HEADER = "x-code-destiny-refresh-token";

// 앱(Capacitor)은 https://localhost 출처라 SameSite=Lax 쿠키를 주고받지 못한다. 그래서 앱 출처와
// 앱 런타임 헤더가 **둘 다** 맞을 때만 헤더 자격증명을 인정한다 — CSRF 는 브라우저가 자동으로 싣는
// 쿠키 세션을 악용하는 공격인데 이 조합에는 앰비언트 크리덴셜이 없다. 웹 오리진은 손대지 않는다.
// 🔴 정본은 여기 하나다 — worker/routes/auth.js 가 이걸 import 해서 쓴다. 사본을 만들지 말 것.
const MOBILE_APP_REQUEST_ORIGINS = new Set(["https://localhost"]);

export function isMobileAppAuthRequest(request) {
  const runtime = String(request?.headers?.get("x-code-destiny-runtime") || "").trim().toLowerCase();
  if (runtime !== "mobile-app") return false;
  let origin = "";
  try {
    origin = new URL(String(request.headers.get("origin") || "").trim()).origin;
  } catch (e) {
    return false;
  }
  return MOBILE_APP_REQUEST_ORIGINS.has(origin);
}

// 리프레시 자격증명 읽기 정본. 쿠키가 있으면 언제나 쿠키가 이기므로 웹 경로는 헤더 줄에 닿지 않는다.
function readRequestRefreshToken(request) {
  const fromCookie = cookieValue(request, REFRESH_COOKIE_NAME);
  if (fromCookie) return fromCookie;
  if (!isMobileAppAuthRequest(request)) return "";
  return String(request.headers.get(APP_REFRESH_TOKEN_HEADER) || "").trim();
}
const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;
const FLOWER_ADMIN_USER_ID = "flower-admin";
const PAID_SERVICE_ADMIN_AUTH_PATHS = Object.freeze([
  "/api/premium/saju-lifebook",
  "/api/premium/saju/life-book",
  "/api/lifebook",
  "/api/life-book-ai",
  "/api/love-secret-ai",
  "/api/saju-new-year",
  "/api/new-year-ai",
  "/api/ziwei-ai",
  "/api/astrology-ai",
  "/api/neo-operation-room",
  "/api/sukuyo",
  "/api/sukuyo-compatibility-ai",
  "/api/astro",
  "/api/vedic",
  "/api/karma-destiny-ai",
  "/api/soul-origin",
  "/api/sibyl",
  "/api/fpti",
  "/api/celestial-harmony",
  "/api/tarot",
  "/api/fortune/ziwei/ai-prompt",
  "/api/fortune/sukuyo/ai-prompt",
  "/api/fortune/saju/ai-prompt",
  "/api/fortune/saju/question-prompt",
  "/api/fortune/astrology/ai-prompt",
  "/api/fortune/vedic/ai-prompt",
]);

export function getJwtIssuer(env) {
  return getEnv(env, "JWT_ISSUER") || JWT_ISSUER;
}

export function getJwtAudience(env) {
  return getEnv(env, "JWT_AUDIENCE") || getEnv(env, "AUTH_AUDIENCE") || "code-destiny-web";
}

function isProductionAuthEnv(env) {
  const value = String(
    getEnv(env, "NODE_ENV")
    || getEnv(env, "ENVIRONMENT")
    || getEnv(env, "CF_PAGES_BRANCH")
    || "",
  ).trim().toLowerCase();
  return value === "production" || value === "main";
}

// The dev secret fallback must be OPT-IN: only an explicit local-dev signal enables it.
// An unknown/unset environment (e.g. a Cloudflare deploy with empty NODE_ENV and a non-main
// CF_PAGES_BRANCH) is NOT treated as dev, so it can never silently sign tokens with "dev-secret".
function isExplicitLocalDevEnv(env) {
  const nodeEnv = String(getEnv(env, "NODE_ENV") || "").trim().toLowerCase();
  const environment = String(getEnv(env, "ENVIRONMENT") || "").trim().toLowerCase();
  return nodeEnv === "development"
    || nodeEnv === "test"
    || environment === "development"
    || environment === "local";
}

function isPlaceholderSecret(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return !normalized
    || normalized === "dev-secret"
    || normalized.includes("placeholder")
    || normalized.includes("change_me")
    || normalized.includes("your_")
    || normalized.includes("example");
}

function resolveFlowerAdminSecret(env) {
  const secret = String(getEnv(env, "FLOWER_ADMIN_SECRET") || "").trim();
  if (isProductionAuthEnv(env) && isPlaceholderSecret(secret)) {
    throw new Error("FLOWER_ADMIN_SECRET is required in production.");
  }
  return secret || (isProductionAuthEnv(env) ? "" : "flower-admin-dev-secret-placeholder-000000");
}

function resolveRequiredAuthSecret(env, keys, fallbackErrorMessage) {
  for (const key of keys) {
    const value = getEnv(env, key);
    // Ignore placeholder/dev values so a leftover "dev-secret"/"change_me" can't be trusted.
    if (value && !isPlaceholderSecret(value)) return value;
  }
  // Fail closed everywhere except an explicit local-dev context. This is stricter than the
  // previous "any non-production env → dev-secret", which let a mis-detected production sign
  // forgeable tokens.
  if (!isExplicitLocalDevEnv(env)) {
    throw new Error(fallbackErrorMessage);
  }
  return "dev-secret";
}

export function getAccessTokenSecret(env) {
  return resolveRequiredAuthSecret(
    env,
    ["JWT_ACCESS_SECRET", "JWT_SECRET", "AUTH_SECRET"],
    "JWT access token secret is required in production.",
  );
}

export function getRefreshTokenSecret(env) {
  return resolveRequiredAuthSecret(
    env,
    ["JWT_REFRESH_SECRET", "JWT_SECRET", "AUTH_SECRET"],
    "JWT refresh token secret is required in production.",
  );
}

export function getAccessTokenExpiresIn(env) {
  return getEnv(env, "ACCESS_TOKEN_EXPIRES_IN") || getEnv(env, "JWT_EXPIRES_IN", "30m");
}

export function getRefreshTokenExpiresIn(env) {
  return getEnv(env, "REFRESH_TOKEN_EXPIRES_IN", "14d");
}

export function getBearerToken(request) {
  const authorization = request.headers.get("Authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  return bearer || cookieValue(request, ACCESS_COOKIE_NAME);
}

function getHeaderBearerToken(request) {
  const authorization = request.headers.get("Authorization") || "";
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
}

function hashRefreshToken(rawToken, env) {
  const pepper = getEnv(env, "AUTH_SECRET") || getAccessTokenSecret(env);
  return createHash("sha256").update(`${String(rawToken || "")}|${pepper}`).digest("hex");
}

function extractRefreshUserId(payload) {
  const userId = String(payload?.userId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(userId)) return "";
  if (String(payload?.typ || "") !== "refresh") return "";
  return userId;
}

function normalizeAuthResultFromPayload(payload, userId) {
  return {
    userId,
    email: payload.email ? String(payload.email) : "",
    role: payload.role ? String(payload.role) : "user",
    name: payload.name ? String(payload.name) : "",
    image: payload.image ? String(payload.image) : "",
    birthDate: payload.birthDate ? String(payload.birthDate) : "",
    birthTime: payload.birthTime ? String(payload.birthTime) : "",
    gender: payload.gender ? String(payload.gender) : "OTHER",
    points: Number.isFinite(Number(payload.points)) ? Number(payload.points) : 0,
    joinedAt: payload.joinedAt || null,
  };
}

function normalizeAuthResultFromUser(user) {
  return {
    userId: String(user?._id || ""),
    email: user?.email ? String(user.email) : "",
    role: user?.role ? String(user.role) : "user",
    name: user?.name ? String(user.name) : "",
    image: user?.profileImage ? String(user.profileImage) : (user?.image ? String(user.image) : ""),
    birthDate: user?.birthDate ? String(user.birthDate) : "",
    birthTime: user?.birthTime ? String(user.birthTime) : "",
    gender: user?.gender ? String(user.gender) : "OTHER",
    points: Number.isFinite(Number(user?.points)) ? Number(user.points) : 0,
    joinedAt: user?.joinedAt || null,
  };
}

function isWithdrawnUser(user) {
  return String(user?.status || "").trim().toLowerCase() === "withdrawn";
}

function isAuthMeRequest(request) {
  try {
    const pathname = new URL(request.url).pathname;
    return pathname === "/api/auth/me" || pathname === "/auth/me";
  } catch (e) {
    return false;
  }
}

export function isAuthDbInfraError(error) {
  // 이름으로만 식별되는 일시적 DB 에러(MongoPoolClearedError, "Cannot perform I/O ... different request" 등)를
  // 메시지 텍스트만 보면 놓쳐 로그인 유저를 하드 401로 세탁했다. db.js·http.js와 동일한 판별로 정렬한다.
  if (isTransientMongoError(error)) return true;
  const text = String(error?.message || "").toLowerCase();
  if (!text) return false;
  return (
    text.includes("auth_me_connect_db")
    || text.includes("auth_me_find_user")
    || text.includes("timeout")
    || text.includes("timed out")
    || text.includes("mongo")
    || text.includes("mongoose")
    || text.includes("econn")
    || text.includes("network")
    || text.includes("server selection")
  );
}

function isPaidServiceAdminAuthPath(request) {
  try {
    const pathname = new URL(request.url).pathname;
    return PAID_SERVICE_ADMIN_AUTH_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  } catch (e) {
    return false;
  }
}

function extractFlowerAdminToken(request) {
  const headerToken = String(request.headers.get("x-admin-token") || "").trim();
  if (FLOWER_ADMIN_TOKEN_RE.test(headerToken)) return headerToken;

  const auth = String(request.headers.get("authorization") || "").trim();
  if (auth.toLowerCase().startsWith("bearer ")) {
    const bearer = auth.slice(7).trim();
    if (FLOWER_ADMIN_TOKEN_RE.test(bearer)) return bearer;
  }

  const cookieToken = cookieValue(request, "flower_admin_token");
  return FLOWER_ADMIN_TOKEN_RE.test(cookieToken) ? cookieToken : "";
}

function timingSafeEqualText(a, b) {
  const lhs = String(a || "");
  const rhs = String(b || "");
  if (lhs.length !== rhs.length) return false;
  let diff = 0;
  for (let i = 0; i < lhs.length; i += 1) diff |= lhs.charCodeAt(i) ^ rhs.charCodeAt(i);
  return diff === 0;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map((value) => value.toString(16).padStart(2, "0")).join("");
}

function base64urlDecode(value) {
  const base64 = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (base64.length % 4)) % 4;
  return atob(base64 + "=".repeat(pad));
}

async function hmacSha256Hex(text, secret) {
  const subtle = globalThis?.crypto?.subtle;
  if (!subtle) return "";
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return bytesToHex(new Uint8Array(signature));
}

async function verifyFlowerAdminTokenForPaidService(request, env) {
  if (!isPaidServiceAdminAuthPath(request)) return null;
  const token = extractFlowerAdminToken(request);
  if (!token) return null;

  const dotIdx = token.lastIndexOf(".");
  if (dotIdx < 1) return null;

  const payloadB64 = token.slice(0, dotIdx);
  const signatureHex = token.slice(dotIdx + 1).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(signatureHex)) return null;

  let expectedHex = "";
  try {
    expectedHex = await hmacSha256Hex(payloadB64, resolveFlowerAdminSecret(env));
  } catch (error) {
    logAuthError("flower-admin-secret", error);
    return null;
  }
  if (!timingSafeEqualText(expectedHex, signatureHex)) return null;

  let payload = null;
  try {
    payload = JSON.parse(base64urlDecode(payloadB64));
  } catch (e) {
    return null;
  }

  const exp = Number(payload?.exp || 0);
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload?.v !== 1 || !Number.isFinite(exp) || nowSec > exp) return null;

  // jti 를 신원 문자열에 붙인다. 진입 비밀번호는 공유 자격증명이라 "누구인지"는 알 수 없지만,
  // 세션은 갈라낼 수 있다(예전에는 모든 관리자 행위가 'flower-admin' 한 문자열로 뭉개졌다).
  // 범위 주의: 이 함수는 위 PAID_SERVICE_ADMIN_AUTH_PATHS 에 걸린 유료 서비스 경로에서만 동작한다.
  // 그 목록에 /api/payments 는 없으므로, 관리자 결제 취소의 pricingSnapshot.cancelledBy 는
  // 이 값이 아니라 일반 JWT 인증의 userId 로 남는다 — 그쪽 추적은 admin.js 의 authorizeAdminRequest
  // 가 붙이는 jti 가 담당한다. 여기서 얻는 것은 유료 AI 라우트 로그·기록의 세션 구분이다.
  const sessionId = String(payload?.jti || "").slice(0, 16);
  return {
    userId: sessionId ? `${FLOWER_ADMIN_USER_ID}:${sessionId}` : FLOWER_ADMIN_USER_ID,
    email: "",
    role: "admin",
    name: "ADMIN",
    image: "",
    birthDate: "",
    birthTime: "",
    gender: "OTHER",
    points: 0,
    joinedAt: null,
  };
}

function logAuthError(stage, error, extras = {}) {
  const payload = {
    stage: String(stage || "auth"),
    name: error?.name || "Error",
    code: error?.code || "AUTH_ERROR",
    message: String(error?.message || "Unknown auth error"),
    ...(extras && typeof extras === "object" ? extras : {}),
  };

  try {
    console.error("[worker-auth-error]", JSON.stringify(payload));
  } catch (e) {
    console.error("[worker-auth-error]", payload);
  }
}

// resolveActiveUserAuth가 유저 활성/철회 판정과 normalizeAuthResultFromUser에 쓰는 필수 필드.
const AUTH_USER_IDENTITY_PROJECTION = {
  _id: 1,
  name: 1,
  email: 1,
  birthDate: 1,
  birthTime: 1,
  gender: 1,
  role: 1,
  points: 1,
  joinedAt: 1,
  image: 1,
  profileImage: 1,
  status: 1,
};

async function resolveActiveUserAuth(userId, env, userProjection = null, timings = null) {
  // stateless Worker 풀 초기화 시 무방비 connectDb/findOne이 정착하지 않아 요청이 hang되는 것을
  // 막는다. withMongoRetry가 각 시도를 per-attempt 타임아웃으로 감싸고 일시적 오류를 재연결·재시도한다.
  //
  // userProjection이 주어지면 필수 identity 필드에 그 필드를 더한(superset) projection으로 한 번에 읽고,
  // 원본 User 문서를 authUserDoc로 첨부한다 — 호출자(/me·결제 스냅샷 등)가 인증 직후 같은 문서를 재조회하던
  // 두 번째 Mongo 왕복을 없앤다. userProjection이 없으면 종전과 완전히 동일(identity projection·authUserDoc 미부착).
  //
  // 🔴 요청 간 in-flight Promise 공유(globalThis 캐시)는 일부러 두지 않는다. Cloudflare Workers는
  // 한 요청의 I/O 컨텍스트에서 만든 Promise를 다른 요청이 이어받는 것을 금지하는데, 예전 구현이 정확히
  // 그걸 했다 — 런타임이 "A promise was resolved... from a different request context"로 continuation을
  // 취소했고, 그 요청은 정상 응답을 못 받은 채 12초 op 타임아웃(withMongoRetry)까지 끌려가 503으로
  // 죽었다(2026-08-09, /fortune-chat 진입 시 /auth/me·/profile·/billing·/guardian/generate 동시 요청에서
  // 실측). 각 요청이 자기 몫을 독립적으로 조회하게 되돌린다 — 버스트 시 중복 Mongo 읽기가 늘 수 있지만
  // withMongoRetry가 이미 그 비용을 감당하고, 지금 겪는 컨텍스트 위반발 503보다 훨씬 싸다.
  const projection = userProjection
    ? { ...AUTH_USER_IDENTITY_PROJECTION, ...userProjection, _id: 1, status: 1 }
    : AUTH_USER_IDENTITY_PROJECTION;
  // retryAdmissionOnOverload: 인증 신원 읽기는 결제 checkout 의 첫 관문이라, admission 순간 포화가
  // 이 읽기를 거절하면 그대로 503/401 이 된다(worker/lib/db.js 의 옵션 주석 참고). 읽기 전용이라
  // 획득 재시도에 부작용이 없다.
  const user = await withMongoRetry(env, () => User.collection.findOne(
    { _id: new mongoose.Types.ObjectId(userId) },
    { projection },
  ), { retryAdmissionOnOverload: true, timings });
  if (!user || isWithdrawnUser(user)) return null;
  const authResult = normalizeAuthResultFromUser(user);
  if (userProjection) authResult.authUserDoc = user;
  return authResult;
}

async function verifyAccessTokenToAuth(token, env, options = {}) {
  if (!token) return null;
  try {
    const payload = await verifyJwt(token, getAccessTokenSecret(env), {
      issuer: getJwtIssuer(env),
      audience: getJwtAudience(env),
    });
    const userId = extractTokenUserId(payload);
    if (!userId) return null;
    const tokenAuth = normalizeAuthResultFromPayload(payload, userId);
    try {
      return await resolveActiveUserAuth(userId, env, options.userProjection || null, options.timings || null);
    } catch (dbError) {
      logAuthError("verify-access-token-user", dbError, { userId });
      if (options.allowDbFallback === true) {
        return { ...tokenAuth, authDbFallback: true };
      }
      // Mongo URI가 없는 환경(테스트 등)에서는 JWT 검증만으로 인증 허용
      const isNoUriError = String(dbError?.message || "").includes("Mongo URI is required");
      if (isNoUriError) {
        return { ...tokenAuth, authDbFallback: true };
      }
      // JWT는 유효한데 DB 조회만 일시적으로 실패한 케이스. 옵트인 호출자(유료 라우트)에는
      // null(→ 확정 401 "로그인 필요")로 뭉개지 말고 원본 에러를 던져 상위에서 503으로 강등한다.
      if (options.surfaceDbInfraError === true && isAuthDbInfraError(dbError)) {
        throw dbError;
      }
      return null;
    }
  } catch (error) {
    logAuthError("verify-access-token", error, { hasToken: true });
    // 내부 DB catch가 옵트인(surfaceDbInfraError)으로 re-throw한 infra 에러가 이 외부 catch에
    // 다시 잡혀 null로 뭉개지지 않도록 표면화한다. verifyJwt 실패(=진짜 잘못된 토큰)는
    // isAuthDbInfraError가 false라 그대로 null 반환(기존 동작).
    if (options.surfaceDbInfraError === true && isAuthDbInfraError(error)) {
      throw error;
    }
    return null;
  }
}

async function verifyRefreshSessionToAuth(request, env, options = {}) {
  // 🔴 쿠키만 읽던 시절, 앱은 액세스 토큰(기본 30분)이 만료되는 순간 이 폴백을 못 타 세션이
  // 끊겼다. 웹은 refresh 쿠키로 여기서 조용히 되살아나는데 앱만 30분마다 로그아웃된 것이다.
  // 더 나쁜 건 그 401 이 셸의 부팅 프로브를 타고 __cdForceSignOut 으로 이어져 **리프레시 토큰까지**
  // 지웠다는 점이다(index.html __cdClearClientAuthState) — 14일짜리 세션이 30분에 죽었다.
  const refreshToken = readRequestRefreshToken(request);
  if (!refreshToken) return null;

  let userId;
  try {
    const payload = await verifyJwt(refreshToken, getRefreshTokenSecret(env), {
      issuer: getJwtIssuer(env),
      audience: getJwtAudience(env),
    });
    userId = extractRefreshUserId(payload);
    if (!userId) return null;
  } catch (error) {
    logAuthError("verify-refresh-session-jwt", error, { hasRefreshToken: true });
    return null;
  }

  try {
    // 각 read를 withMongoRetry로 감싸 풀 초기화 순간의 hang을 per-attempt 타임아웃으로 끊고
    // 일시적 오류를 재연결·재시도한다(withMongoRetry가 내부에서 connectDb 호출).
    const tokenHash = hashRefreshToken(refreshToken, env);
    const session = await withMongoRetry(env, () => RefreshTokenSession.findOne({ tokenHash }).lean(), { retryAdmissionOnOverload: true });
    if (!session) return null;
    // 🔴 회전 직후의 옛 쿠키를 하드 401 로 떨어뜨리지 않는다. 형제 탭이 /api/auth/refresh 로 회전을
    // 끝낸 순간, 아직 새 쿠키를 못 받은 다른 요청(멀티탭·프리페치·진입 팬아웃)이 옛 refresh 쿠키로
    // 들어오면 여기서 401 이 났다. 이 경로는 **읽기 전용 신원 확인**이라 새 토큰을 발급하지 않으므로
    // 회전 계약을 흔들지 않으며, 유예는 회전 경로와 같은 창(getRefreshReuseGraceMs)을 쓴다.
    if (session.revokedAt && !isRotatedWithinReuseGrace(session, env)) return null;
    if (!refreshSessionMatchesRequest(session, request)) return null;

    const expiresAt = new Date(session.expiresAt || 0).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;

    // access-token 경로(resolveActiveUserAuth)와 동일하게, userProjection이 주어지면 identity 필드에
    // 그 필드를 더한 상위집합으로 한 번에 읽고 원본 문서를 authUserDoc로 첨부한다.
    // 🔴 반드시 상위집합이어야 한다 — identity 필드가 빠지면 normalizeAuthResultFromUser가 조용히 오판한다.
    const projection = options.userProjection
      ? { ...AUTH_USER_IDENTITY_PROJECTION, ...options.userProjection, _id: 1, status: 1 }
      : AUTH_USER_IDENTITY_PROJECTION;
    const user = await withMongoRetry(env, () => User.collection.findOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { projection },
    ), { retryAdmissionOnOverload: true });
    if (!user || isWithdrawnUser(user)) return null;

    const authResult = normalizeAuthResultFromUser(user);
    if (options.userProjection) authResult.authUserDoc = user;
    return authResult;
  } catch (error) {
    logAuthError("verify-refresh-session-db", error, { hasRefreshToken: true, userId });
    // Only a request that already tolerates DB blips (e.g. /api/auth/me) or explicitly
    // opts in (surfaceDbInfraError, e.g. paid routes) gets the raw infra error rethrown,
    // so the caller can report "degraded"/503 instead of a hard sign-out.
    // Every other route keeps failing closed to null, unchanged from prior behavior.
    if ((options.allowDbFallback === true || options.surfaceDbInfraError === true) && isAuthDbInfraError(error)) {
      throw error;
    }
    return null;
  }
}

// refresh 토큰 회전 grace window — 방금 회전된 토큰이 이 시간 이내에 재생되면 멀티탭 동시 회전으로
// 간주한다. routes/auth.js 의 회전 경로와 **같은 창**을 쓰기 위해 여기로 옮겨 공유한다(창이 둘이면
// 한쪽만 허용하는 어긋난 구간이 생긴다). 기본 30초.
export function getRefreshReuseGraceMs(env) {
  const raw = Number(getEnv(env, "AUTH_REFRESH_REUSE_GRACE_MS", "30000"));
  if (!Number.isFinite(raw) || raw < 0) return 30000;
  return Math.min(Math.floor(raw), 5 * 60 * 1000);
}

// 🔴 UA 에서 버전 숫자를 걷어낸 형태. 크롬·엣지는 약 4주마다 major 버전을 올리는데, 예전 비교는
// 완전 문자열 일치라 **브라우저가 자동 업데이트되는 순간 그 사용자의 refresh 세션이 통째로 무효**가
// 됐다. 그 결과 로그인 상태인데도 /api/me/access-state 가 401 을 내고(→ 셸이 로컬 신원을 지워
// 이용권 스냅샷이 고아가 됨), /api/auth/refresh 는 "Session changed" 로 전 세션 폐기까지 갔다.
// 세션 고정 방어의 의도는 "다른 기기·다른 브라우저"를 거르는 것이므로 숫자만 지우고 비교한다 —
// 브라우저·엔진·플랫폼 토큰(chrome/ edg/ firefox/ safari/ windows nt/ iphone os …)은 그대로 남아
// 서로 다른 클라이언트는 계속 구분된다.
function normalizeSessionUserAgent(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\d+(?:[._]\d+)*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function refreshSessionMatchesRequest(session, request) {
  const storedUserAgent = String(session?.userAgent || "").trim();
  if (!storedUserAgent) return true;
  const currentUserAgent = String(getRequestMeta(request).userAgent || "").trim();
  if (!currentUserAgent) return true;
  if (storedUserAgent === currentUserAgent) return true;
  return normalizeSessionUserAgent(storedUserAgent) === normalizeSessionUserAgent(currentUserAgent);
}

// 방금 '정상 회전'으로 승계된 세션인지. 승계본(replacedByTokenHash)이 있는 것만 인정하므로
// 탈취 감지(revokeAllUserRefreshSessions)로 일괄 폐기된 세션은 여기에 걸리지 않는다.
function isRotatedWithinReuseGrace(session, env) {
  if (!session?.replacedByTokenHash) return false;
  const rotatedAt = new Date(session.revokedAt || 0).getTime();
  if (!Number.isFinite(rotatedAt) || rotatedAt <= 0) return false;
  return Date.now() - rotatedAt <= getRefreshReuseGraceMs(env);
}

function extractTokenUserId(payload) {
  const userId = String(payload?.userId || payload?.id || "").trim();
  if (!/^[a-f0-9]{24}$/i.test(userId)) return "";
  return userId;
}

function isProductionRuntime(env) {
  return String(getEnv(env, "NODE_ENV") || "").trim().toLowerCase() === "production";
}

async function getDevAuthUserFromEnv(env) {
  const userId = String(getEnv(env, "DEV_AUTH_USER_ID") || "").trim();
  if (isProductionRuntime(env)) {
    // dev-auth는 프로덕션에서 무시(throw 금지 — 게스트 트래픽 붕괴 방지)
    return null;
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;

  await connectDb(env);
  const user = await User.findById(userId).lean();
  return user?._id && !isWithdrawnUser(user) ? normalizeAuthResultFromUser(user) : null;
}

export async function requireAuth(request, env, options = {}) {
  return getServerUser(request, env, options);
}

export async function getOptionalUserFromRequest(request, env, options = {}) {
  try {
    const bearerToken = getHeaderBearerToken(request);
    const accessCookieToken = cookieValue(request, ACCESS_COOKIE_NAME);
    const refreshCookieToken = readRequestRefreshToken(request);
    const allowTokenDbFallback = options?.allowDbFallback === true || isAuthMeRequest(request);
    const surfaceDbInfraError = options?.surfaceDbInfraError === true;
    // userProjection: 주어지면 access-token 경로와 refresh 폴백 경로 **양쪽** 모두 User 조회를 이 필드까지
    // 확장해 원본 문서를 authUserDoc로 첨부한다(호출자의 인증-후 재조회 왕복 제거).
    // 예전엔 refresh 폴백만 미부착이라, access 만료 직후 첫 /api/auth/me 가 Mongo 3왕복을 돌았다.
    // admin/dev 폴백 경로는 여전히 미부착 → 호출자는 authUserDoc 부재 시 종전대로 자체 조회로 폴백한다.
    // 🔴 선택적 계측 싱크(options.authTimings). 호출부가 객체를 주지 않으면 아래 markAuthPath 는
    //    전부 no-op 이고 이 함수의 동작은 종전과 완전히 같다 — 이 경로는 전 라우트가 지난다.
    //    목적: "AUTH 가 3.1s"(2026-08-30 실측, docs/handoff/human-design-report-generation-fix.md)를
    //    (어느 분기가 인증을 성사시켰나) × (그 분기의 Mongo 왕복이 admission/connect/op 중 어디서
    //    샜나) 로 가른다. 뒤쪽은 worker/lib/db.js 의 **기존** timings 싱크가 그대로 채운다 —
    //    여기에 새 계측기를 만들지 않는다(중첩 사전검사 금지).
    const authTimings = options?.authTimings && typeof options.authTimings === "object" ? options.authTimings : null;
    const markAuthPath = (path) => { if (authTimings) authTimings.path = path; };
    const verifyOptions = { allowDbFallback: allowTokenDbFallback, surfaceDbInfraError, userProjection: options?.userProjection || null, timings: authTimings };

    const flowerAdminAuth = await verifyFlowerAdminTokenForPaidService(request, env);
    if (flowerAdminAuth) { markAuthPath("flower-admin"); return flowerAdminAuth; }

    const bearerAuth = await verifyAccessTokenToAuth(bearerToken, env, verifyOptions);
    if (bearerAuth) { markAuthPath("bearer"); return bearerAuth; }

    if (accessCookieToken && accessCookieToken !== bearerToken) {
      const cookieAuth = await verifyAccessTokenToAuth(accessCookieToken, env, verifyOptions);
      if (cookieAuth) { markAuthPath("access-cookie"); return cookieAuth; }
    }

    if (refreshCookieToken) {
      const refreshAuth = await verifyRefreshSessionToAuth(request, env, verifyOptions);
      if (refreshAuth) { markAuthPath("refresh-fallback"); return refreshAuth; }
    }

    const devAuth = await getDevAuthUserFromEnv(env);
    if (devAuth) { markAuthPath("dev"); return devAuth; }

    markAuthPath("none");
    return null;
  } catch (error) {
    if (error?.message === "DEV_AUTH_USER_ID must not be used in production") throw error;
    // Let callers that already tolerate DB blips (e.g. /api/auth/me, /api/subscription/status)
    // see a raw DB-infra error so they can report "degraded" instead of getting collapsed
    // into a generic 401 that looks like a real sign-out.
    if ((options?.allowDbFallback === true || options?.surfaceDbInfraError === true || isAuthMeRequest(request)) && isAuthDbInfraError(error)) throw error;
    logAuthError("get-optional-user", error, {
      hasAuthorizationHeader: Boolean(request?.headers?.get("Authorization")),
      hasCookieHeader: Boolean(request?.headers?.get("Cookie")),
    });
    return null;
  }
}

// 표시용(잔량 캐시 키 등) 경량 인증: DB를 전혀 건드리지 않고 access 토큰(bearer→쿠키)의
// JWT 서명만 로컬 검증해 userId를 얻는다. 유효한 토큰이 없으면 "" 반환(게스트 → 캐시 미사용).
// 실제 인증/권한 판정에는 쓰지 말 것 — 토큰 유효성만 볼 뿐 유저 활성/탈퇴 여부는 확인하지 않는다.
export async function peekAccessTokenUserId(request, env) {
  const secret = getAccessTokenSecret(env);
  if (!secret) return "";
  const issuer = getJwtIssuer(env);
  const audience = getJwtAudience(env);
  const bearerToken = getHeaderBearerToken(request);
  const accessCookieToken = cookieValue(request, ACCESS_COOKIE_NAME);
  for (const token of [bearerToken, accessCookieToken]) {
    if (!token) continue;
    try {
      const payload = await verifyJwt(token, secret, { issuer, audience });
      const userId = extractTokenUserId(payload);
      if (userId) return userId;
    } catch (_) {
      // 무효/만료 토큰은 조용히 다음 후보로 넘어간다(게스트 취급).
    }
  }
  return "";
}

export async function requireUserFromRequest(request, env, options = {}) {
  // surfaceDbInfraError: 로그인 사용자가 일시적 DB 장애로 확인이 안 될 때 null→확정 401(로그아웃)로
  // 뭉개지 않고 원본 infra 에러를 던진다. 진짜 게스트(토큰 없음/무효)는 여전히 null→401.
  // userProjection(선택): 인증 경로 User 조회를 확장해 authUserDoc를 첨부(호출자 재조회 왕복 제거).
  //
  // 🔴 여기를 withMongoRetry로 감싸지 말 것. 인증의 실제 DB 읽기는 이 아래
  // resolveActiveUserAuth·verifyRefreshSessionToAuth 안에서 이미 재시도된다. 밖에서 또 감싸면
  // 시도 횟수와 resetMongooseConnection 호출이 배수로 늘어 재연결 폭풍에 가까워지는 반면,
  // 정작 op-타임아웃은 설계상 재시도 대상이 아니라 아무것도 나아지지 않는다.
  // 재시도는 실제 DB 작업이 일어나는 한 지점에서만 건다. (verify:no-nested-retry 가 감시)
  const auth = await getOptionalUserFromRequest(request, env, {
    surfaceDbInfraError: true,
    allowDbFallback: options.allowDbFallback === true,
    userProjection: options.userProjection || null,
    authTimings: options.authTimings || null,
  });
  if (auth) return auth;
  throw createHttpError(401, "Authentication is required.", { code: "UNAUTHORIZED" });
}

// 유료/인증필요 라우트 전용 인증 해석. 로그인 사용자가 DB 풀 초기화 같은 일시적 장애로
// 인증이 확인 안 될 때, null(→확정 401 "로그인 필요")로 강등되지 않고 503(재시도 가능)으로
// 표면화한다. 진짜 게스트(토큰 없음/무효)는 그대로 null을 돌려주므로 호출자는 기존 401 유지.
// options.userProjection 을 주면 인증 조회를 그 필드까지 확장해 authUserDoc 를 붙여 준다
// (호출자의 인증-후 User 재조회 왕복 제거). 기본값 {} 이라 인자를 주지 않으면 종전과 완전히 동일하다 —
// 아래 getServerUser 와 같은 형태의 패스스루다.
export async function resolvePaidRouteAuth(request, env, options = {}) {
  try {
    // 🔴 requireUserFromRequest와 같은 이유로 여기도 감싸지 않는다 — 인증 DB 읽기의 재시도는
    // resolveActiveUserAuth·verifyRefreshSessionToAuth 한 지점에만 있어야 한다.
    return await getOptionalUserFromRequest(request, env, {
      surfaceDbInfraError: true,
      userProjection: options?.userProjection || null,
    });
  } catch (error) {
    if (isAuthDbInfraError(error)) {
      throw createHttpError(503, "로그인 상태를 일시적으로 확인하지 못했어요. 잠시 후 다시 시도해 주세요.", {
        code: "AUTH_STATUS_TEMPORARILY_UNAVAILABLE",
        retryable: true,
      });
    }
    throw error;
  }
}

// options 는 requireUserFromRequest 로 그대로 흘려보낸다(현재 쓰이는 건 userProjection 하나).
// 인자를 주지 않으면 종전과 완전히 동일하게 동작한다 — 기존 호출부는 손대지 않아도 된다.
export async function getServerUser(request, env, options = {}) {
  return requireUserFromRequest(request, env, options);
}

export async function getCurrentUser(request, env) {
  return getOptionalUserFromRequest(request, env);
}

export async function signAuthToken(user, env) {
  return signJwt(
    {
      userId: String(user._id),
      email: user.email,
      role: user.role,
      name: user.name,
      image: user.profileImage || user.image || "",
      birthDate: user.birthDate,
      birthTime: user.birthTime,
      gender: user.gender,
      points: user.points,
      joinedAt: user.joinedAt,
    },
    getAccessTokenSecret(env),
    {
      expiresIn: getAccessTokenExpiresIn(env),
      issuer: getJwtIssuer(env),
      audience: getJwtAudience(env),
    },
  );
}

function toAuthIsoOrNull(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function readNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.floor(number);
}

function normalizeAuthProfileSubscription(user = {}) {
  const rawSub = user?.profileSubscription && typeof user.profileSubscription === "object"
    ? user.profileSubscription
    : {};
  const entitlement = normalizeHoneyPassEntitlement(user || {});
  const activeTier = entitlement?.isActive && entitlement?.tier && entitlement.tier !== "none"
    ? String(entitlement.tier || "free").toLowerCase()
    : "free";
  const isActive = activeTier !== "free";
  const passLimit = isActive
    ? readNonNegativeInteger(entitlement.maxCoveredCoin || rawSub.maxCoveredCoin || rawSub.passLimit || rawSub.freeLimit || PASS_LIMITS[activeTier] || 0)
    : 0;
  // 월정석은 지급일+30일 만료(지급분별) — 만료분을 제외한 "유효 잔액"만 노출한다(지연소멸, 읽기 전용).
  // lot이 프로젝션에 없으면 스칼라를 활성으로 간주(백필-계산). 실제 소멸·정리는 소비/크론이 영속화한다.
  const scalarForBackfill = readNonNegativeInteger(rawSub.membershipCreditBalance ?? rawSub.monthlyStoneBalance, 0);
  const lotState = ensureLotsForBalance(
    { membershipCreditLots: rawSub.membershipCreditLots, membershipCreditBalance: scalarForBackfill },
    Date.now(),
  );
  const membershipCreditBalance = readNonNegativeInteger(lotState.balance, 0);
  const monthlyStoneExpiresAt = resolveNextExpiry(lotState.lots, Date.now());
  const membershipCreditGranted = readNonNegativeInteger(rawSub.membershipCreditGranted, 0);
  const membershipCreditUsed = readNonNegativeInteger(rawSub.membershipCreditUsed, 0);

  return {
    tier: activeTier,
    passTier: isActive ? String(entitlement.passTier || rawSub.passTier || activeTier) : "free",
    plan: isActive ? String(rawSub.plan || activeTier) : "free",
    planId: isActive ? String(rawSub.planId || rawSub.plan || activeTier) : "free",
    isActive,
    isSubscribed: isActive,
    status: isActive
      ? String(rawSub.status || rawSub.subscriptionStatus || rawSub.membershipStatus || rawSub.lastBillingStatus || "active")
      : "free",
    subscriptionStatus: isActive
      ? String(rawSub.subscriptionStatus || rawSub.status || rawSub.lastBillingStatus || "active")
      : "free",
    membershipStatus: isActive ? String(rawSub.membershipStatus || rawSub.status || "active") : "free",
    source: isActive ? String(entitlement.source || rawSub.source || "auth_me") : "auth_me",
    expiresAt: isActive ? (entitlement.expiresAt || toAuthIsoOrNull(rawSub.expiresAt)) : null,
    profileLimit: isActive ? readNonNegativeInteger(entitlement.maxProfiles || rawSub.profileLimit, 1) : 1,
    freeLimit: passLimit,
    passLimit,
    maxCoveredCoin: passLimit,
    membershipCreditBalance,
    monthlyStoneBalance: membershipCreditBalance,
    monthlyStoneExpiresAt,
    membershipCreditGranted,
    membershipCreditUsed,
    snapshotSource: "auth_me",
  };
}

export function normalizeUserResponse(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    image: user.profileImage || user.image || "",
    birthDate: user.birthDate,
    birthTime: user.birthTime,
    gender: user.gender,
    role: user.role,
    points: user.points,
    joinedAt: user.joinedAt,
    profileSubscription: normalizeAuthProfileSubscription(user),
  };
}

import { connectDb, mongoose, withMongoRetry } from "./db.js";
import {
  GuardianFortuneAccountUsage,
  GuardianFortuneAnonymousMerge,
  GuardianFortuneGenerationAttempt,
  GuardianFortuneGuestUsage,
} from "./models.js";

export const GUARDIAN_FORTUNE_GUEST_LIMIT = 1;
export const GUARDIAN_FORTUNE_DAILY_LIMIT = 3;
export const GUARDIAN_FORTUNE_ACCOUNT_FREE_LIMIT = 3;
export const GUARDIAN_FORTUNE_DEFAULT_TIMEZONE = "Asia/Seoul";
export const GUARDIAN_FORTUNE_GUEST_COOKIE = "guardian_fortune_guest_id";
export const GUARDIAN_FORTUNE_RESERVATION_TTL_MS = 10 * 60 * 1000;
// 무료 횟수를 소진한 뒤의 회당 결제 키. 가격 정본은 worker/lib/paid-feature-registry.js 다.
export const GUARDIAN_FORTUNE_PAID_FEATURE_KEY = "fortune-chat-consultation";

export const GUARDIAN_FORTUNE_ERROR_CODES = Object.freeze({
  FEATURE_DISABLED: "GUARDIAN_FORTUNE_FEATURE_DISABLED",
  INVALID_INPUT: "GUARDIAN_FORTUNE_INVALID_INPUT",
  GUEST_LIMIT_EXCEEDED: "GUARDIAN_FORTUNE_GUEST_LIMIT_EXCEEDED",
  DAILY_LIMIT_EXCEEDED: "GUARDIAN_FORTUNE_DAILY_LIMIT_EXCEEDED",
  // 무료 횟수를 모두 쓴 로그인 사용자에게 회당 결제를 요구한다(구 NO_CREDITS = 대화권 소진).
  PAYMENT_REQUIRED: "GUARDIAN_FORTUNE_PAYMENT_REQUIRED",
  // 결제 증빙 조회가 DB 장애로 판단 보류된 상태. 402(결제 필요)로 바꾸면 이미 결제한
  // 사용자에게서 돈만 나가므로 반드시 503으로 표면화한다.
  PAYMENT_CHECK_DEGRADED: "GUARDIAN_FORTUNE_PAYMENT_CHECK_DEGRADED",
  CONTEXT_FAILED: "GUARDIAN_FORTUNE_CONTEXT_FAILED",
  GENERATION_FAILED: "GUARDIAN_FORTUNE_GENERATION_FAILED",
  RESULT_INVALID: "GUARDIAN_FORTUNE_RESULT_INVALID",
  USAGE_COMMIT_FAILED: "GUARDIAN_FORTUNE_USAGE_COMMIT_FAILED",
  // 일시적 DB 장애로 상담을 시작조차 못한 상태. 예약이 커밋되지 않았으므로 횟수·결제 차감이
  // 없고 그대로 재시도하면 된다. 이게 없으면 공용 핸들러가 코드 없는 영문 503 을 뱉는다.
  SERVICE_TEMPORARILY_UNAVAILABLE: "GUARDIAN_FORTUNE_SERVICE_TEMPORARILY_UNAVAILABLE",
  SERVER_ERROR: "GUARDIAN_FORTUNE_SERVER_ERROR",
  REQUEST_IN_PROGRESS: "GUARDIAN_FORTUNE_REQUEST_IN_PROGRESS",
  CANCELLED: "GUARDIAN_FORTUNE_CANCELLED",
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,120}$/;

function numberOr(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampNonNegative(value) {
  return Math.max(0, Math.floor(numberOr(value)));
}

function toDate(value, fallback = new Date()) {
  const date = value instanceof Date ? value : new Date(value || fallback);
  return Number.isNaN(date.getTime()) ? new Date(fallback) : date;
}

function normalizeUserId(userId) {
  return String(userId || "").trim().slice(0, 120);
}

function normalizeGuestHash(guestIdHash) {
  return String(guestIdHash || "").trim().slice(0, 128);
}

function normalizeDateKey(dateKey) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || "")) ? String(dateKey) : "";
}

function assertRequestId(requestId) {
  const value = String(requestId || "").trim();
  return REQUEST_ID_PATTERN.test(value) ? value : "";
}

export function isValidGuardianFortuneGuestId(value) {
  const normalized = String(value || "").trim();
  return UUID_PATTERN.test(normalized) || GUEST_ID_PATTERN.test(normalized);
}

export function createGuardianFortuneGuestId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function createGuardianFortuneRequestId() {
  return globalThis.crypto?.randomUUID?.() || `guardian-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getGuardianFortuneDateKey(date = new Date(), timezone = GUARDIAN_FORTUNE_DEFAULT_TIMEZONE) {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(toDate(date));
  return formatted;
}

function resolveGuestSecret(env = {}, options = {}) {
  return String(options.guestSecret || env.GUARDIAN_FORTUNE_GUEST_SECRET || "").trim();
}

function bytesToHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashGuardianFortuneGuestId(guestId, options = {}) {
  const normalized = String(guestId || "").trim();
  const secret = resolveGuestSecret(options.env || {}, options);
  if (!isValidGuardianFortuneGuestId(normalized)) throw new Error("GUARDIAN_FORTUNE_GUEST_ID_INVALID");
  if (!globalThis.crypto?.subtle) throw new Error("GUARDIAN_FORTUNE_CRYPTO_UNAVAILABLE");

  const encoder = new TextEncoder();
  if (!secret) {
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`guardian-fortune:${normalized}`));
    return bytesToHex(digest);
  }
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(normalized));
  return bytesToHex(signature);
}


export function buildGuardianFortuneGuestCookie(guestId, { secure = false, maxAgeSeconds = 60 * 60 * 24 * 365 } = {}) {
  const encoded = encodeURIComponent(String(guestId || ""));
  return [
    `${GUARDIAN_FORTUNE_GUEST_COOKIE}=${encoded}`,
    "Path=/",
    `Max-Age=${Math.max(60, Math.floor(maxAgeSeconds))}`,
    "SameSite=Lax",
    "HttpOnly",
    secure ? "Secure" : "",
  ].filter(Boolean).join("; ");
}

export function isGuardianFortuneApiEnabled(env = {}) {
  return env.ENABLE_GUARDIAN_FORTUNE_API === true || String(env.ENABLE_GUARDIAN_FORTUNE_API || "").toLowerCase() === "true";
}

export function maskGuardianFortuneUsageIdentity({ userId, guestIdHash } = {}) {
  return {
    isLoggedIn: Boolean(normalizeUserId(userId)),
    hasGuestHash: Boolean(normalizeGuestHash(guestIdHash)),
  };
}

function usageMessage({ isLoggedIn, guestUsed, dailyRemaining }) {
  if (!isLoggedIn) {
    return guestUsed > 0
      ? "첫 무료 상담을 이미 사용했어요. 로그인하면 3번까지 연이와 네오에게 물어볼 수 있어요."
      : "첫 1회는 로그인 없이 무료로 볼 수 있어요.";
  }
  if (dailyRemaining > 0) return `남은 무료 상담 ${dailyRemaining}회`;
  return "무료 상담을 모두 사용했어요. 지금부터는 1회 5,000원으로 이어서 물어볼 수 있어요.";
}

export function buildGuardianFortuneDisabledUsageStatus({ isLoggedIn = false } = {}) {
  return {
    isLoggedIn: Boolean(isLoggedIn),
    guestFreeLimit: isLoggedIn ? 0 : GUARDIAN_FORTUNE_GUEST_LIMIT,
    guestFreeUsed: 0,
    guestFreeRemaining: 0,
    dailyFreeLimit: isLoggedIn ? GUARDIAN_FORTUNE_ACCOUNT_FREE_LIMIT : 0,
    dailyFreeUsed: 0,
    dailyFreeRemaining: 0,
    canGenerate: false,
    generationSource: "blocked",
    nextAction: "disabled",
    message: "오늘의 귀인 운세는 준비 중이에요.",
  };
}

function emptyStatus(isLoggedIn) {
  return {
    isLoggedIn,
    guestFreeLimit: isLoggedIn ? 0 : GUARDIAN_FORTUNE_GUEST_LIMIT,
    guestFreeUsed: 0,
    guestFreeRemaining: isLoggedIn ? 0 : GUARDIAN_FORTUNE_GUEST_LIMIT,
    dailyFreeLimit: isLoggedIn ? GUARDIAN_FORTUNE_ACCOUNT_FREE_LIMIT : 0,
    dailyFreeUsed: 0,
    dailyFreeRemaining: isLoggedIn ? GUARDIAN_FORTUNE_ACCOUNT_FREE_LIMIT : 0,
    canGenerate: !isLoggedIn,
    generationSource: isLoggedIn ? "daily_free" : "guest_free",
    nextAction: "generate",
    message: "",
  };
}

/**
 * snapshot 은 방금 커밋한 findOneAndUpdate({ new: true }) 가 돌려준 사용량 문서다. 주어지면
 * 같은 값을 다시 읽지 않는다 — 지금 프로덕션에서 Mongo 왕복 한 번은 평균 5초이고, 커밋
 * 직후의 재조회는 그 5초를 쓰고도 방금 쓴 값을 그대로 다시 가져올 뿐이다.
 * 파생 로직(잔여·nextAction·문구)은 아래 한 벌만 유지해 읽기 경로와 커밋 경로가 갈리지 않게 한다.
 */
export async function buildGuardianFortuneUsageStatus({ userId, guestIdHash, dateKey, store, now = new Date(), snapshot = null } = {}) {
  const normalizedUserId = normalizeUserId(userId);
  const isLoggedIn = Boolean(normalizedUserId);
  const safeDateKey = normalizeDateKey(dateKey) || getGuardianFortuneDateKey(now);
  const status = emptyStatus(isLoggedIn);

  if (!isLoggedIn) {
    const guest = snapshot || await store.findGuest(normalizeGuestHash(guestIdHash));
    status.guestFreeUsed = clampNonNegative(guest?.totalUsed);
    status.guestFreeRemaining = Math.max(0, GUARDIAN_FORTUNE_GUEST_LIMIT - status.guestFreeUsed);
    status.canGenerate = status.guestFreeRemaining > 0;
    status.generationSource = status.canGenerate ? "guest_free" : "blocked";
    status.nextAction = status.canGenerate ? "generate" : "login";
    status.message = usageMessage({ isLoggedIn: false, guestUsed: status.guestFreeUsed, dailyRemaining: 0 });
    return status;
  }

  const daily = snapshot || await store.findDaily(normalizedUserId, safeDateKey);
  status.dailyFreeUsed = clampNonNegative(daily?.freeUsed);
  status.dailyFreeRemaining = Math.max(0, clampNonNegative(daily?.freeLimit || GUARDIAN_FORTUNE_ACCOUNT_FREE_LIMIT) - status.dailyFreeUsed);
  // 무료를 다 써도 회당 결제로 계속 이용할 수 있으므로 canGenerate 는 항상 true 다.
  // 결제 여부는 생성 요청 시점에 판정한다(진입 시 서버 이용권 선검사 금지 규칙과 같은 이유).
  status.canGenerate = true;
  status.generationSource = status.dailyFreeRemaining > 0 ? "daily_free" : "paid";
  status.nextAction = status.dailyFreeRemaining > 0 ? "generate" : "purchase";
  status.message = usageMessage({
    isLoggedIn: true,
    guestUsed: 0,
    dailyRemaining: status.dailyFreeRemaining,
  });
  return status;
}

function guestKey(hash) {
  return normalizeGuestHash(hash);
}

function dailyKey(userId, dateKey) {
  return normalizeUserId(userId);
}

function attemptValue({ requestId, userId, guestIdHash, source, dateKey, status = "reserved", now }) {
  return {
    requestId: assertRequestId(requestId),
    userId: normalizeUserId(userId) || undefined,
    guestIdHash: normalizeGuestHash(guestIdHash) || undefined,
    source,
    dateKey,
    status,
    errorCode: "",
    expiresAt: new Date(toDate(now).getTime() + GUARDIAN_FORTUNE_RESERVATION_TTL_MS),
    createdAt: toDate(now),
    updatedAt: toDate(now),
  };
}

export function createMemoryGuardianFortuneStore(seed = {}) {
  const accountSeed = new Map();
  Object.values(seed.daily || {}).forEach((entry) => {
    const userId = normalizeUserId(entry?.userId);
    if (!userId) return;
    const previous = accountSeed.get(userId) || { ...entry, userId, freeUsed: 0, reserved: 0 };
    previous.freeUsed = Math.min(GUARDIAN_FORTUNE_ACCOUNT_FREE_LIMIT, clampNonNegative(previous.freeUsed) + clampNonNegative(entry?.freeUsed));
    previous.reserved = clampNonNegative(previous.reserved) + clampNonNegative(entry?.reserved);
    accountSeed.set(userId, previous);
  });
  const state = {
    guests: new Map(Object.entries(seed.guests || {})),
    daily: accountSeed,
    attempts: new Map(Object.entries(seed.attempts || {})),
  };

  const store = {
    kind: "memory",
    state,
    async findGuest(hash) { return state.guests.get(guestKey(hash)) || null; },
    async ensureGuest(hash, now = new Date()) {
      const key = guestKey(hash);
      if (!state.guests.has(key)) state.guests.set(key, { guestIdHash: key, totalUsed: 0, reserved: 0, firstUsedAt: null, lastUsedAt: null, reservationUpdatedAt: null, createdAt: now, updatedAt: now });
      return state.guests.get(key);
    },
    async reserveGuest(hash, now = new Date()) {
      const doc = await store.ensureGuest(hash, now);
      if (clampNonNegative(doc.totalUsed) + clampNonNegative(doc.reserved) >= GUARDIAN_FORTUNE_GUEST_LIMIT) return null;
      doc.reserved = clampNonNegative(doc.reserved) + 1;
      doc.reservationUpdatedAt = now;
      doc.updatedAt = now;
      return doc;
    },
    async commitGuest(hash, now = new Date()) {
      const doc = state.guests.get(guestKey(hash));
      if (!doc || clampNonNegative(doc.reserved) < 1) return null;
      doc.reserved -= 1;
      doc.totalUsed = clampNonNegative(doc.totalUsed) + 1;
      doc.firstUsedAt ||= now;
      doc.lastUsedAt = now;
      doc.reservationUpdatedAt = null;
      doc.updatedAt = now;
      return doc;
    },
    async releaseGuest(hash, now = new Date()) {
      const doc = state.guests.get(guestKey(hash));
      if (!doc || clampNonNegative(doc.reserved) < 1) return doc || null;
      doc.reserved -= 1;
      doc.reservationUpdatedAt = null;
      doc.updatedAt = now;
      return doc;
    },
    async findDaily(userId, dateKey) { return state.daily.get(dailyKey(userId, dateKey)) || null; },
    async ensureDaily(userId, dateKey, now = new Date()) {
      const key = dailyKey(userId, dateKey);
      if (!state.daily.has(key)) state.daily.set(key, { userId: normalizeUserId(userId), dateKey, freeLimit: GUARDIAN_FORTUNE_ACCOUNT_FREE_LIMIT, freeUsed: 0, reserved: 0, reservationUpdatedAt: null, createdAt: now, updatedAt: now });
      return state.daily.get(key);
    },
    async reserveDaily(userId, dateKey, now = new Date()) {
      const doc = await store.ensureDaily(userId, dateKey, now);
      if (clampNonNegative(doc.freeUsed) + clampNonNegative(doc.reserved) >= clampNonNegative(doc.freeLimit || GUARDIAN_FORTUNE_ACCOUNT_FREE_LIMIT)) return null;
      doc.reserved = clampNonNegative(doc.reserved) + 1;
      doc.reservationUpdatedAt = now;
      doc.updatedAt = now;
      return doc;
    },
    async commitDaily(userId, dateKey, now = new Date()) {
      const doc = state.daily.get(dailyKey(userId, dateKey));
      if (!doc || clampNonNegative(doc.reserved) < 1) return null;
      doc.reserved -= 1;
      doc.freeUsed = clampNonNegative(doc.freeUsed) + 1;
      doc.reservationUpdatedAt = null;
      doc.updatedAt = now;
      return doc;
    },
    async releaseDaily(userId, dateKey, now = new Date()) {
      const doc = state.daily.get(dailyKey(userId, dateKey));
      if (!doc || clampNonNegative(doc.reserved) < 1) return doc || null;
      doc.reserved -= 1;
      doc.reservationUpdatedAt = null;
      doc.updatedAt = now;
      return doc;
    },
    async findAttempt(requestId) { return state.attempts.get(assertRequestId(requestId)) || null; },
    async beginAttempt(data) {
      const requestId = assertRequestId(data.requestId);
      const existing = state.attempts.get(requestId);
      if (existing) return { created: false, attempt: existing };
      const attempt = attemptValue({ ...data, requestId });
      state.attempts.set(requestId, attempt);
      return { created: true, attempt };
    },
    async updateAttempt(requestId, patch = {}) {
      const attempt = state.attempts.get(assertRequestId(requestId));
      if (!attempt) return null;
      Object.assign(attempt, patch, { updatedAt: patch.updatedAt || new Date() });
      return attempt;
    },
    async releaseStaleReservations(now = new Date()) {
      const threshold = toDate(now).getTime() - GUARDIAN_FORTUNE_RESERVATION_TTL_MS;
      let released = 0;
      for (const doc of state.guests.values()) if (doc.reservationUpdatedAt && toDate(doc.reservationUpdatedAt).getTime() < threshold && doc.reserved > 0) { doc.reserved -= 1; released += 1; }
      for (const doc of state.daily.values()) if (doc.reservationUpdatedAt && toDate(doc.reservationUpdatedAt).getTime() < threshold && doc.reserved > 0) { doc.reserved -= 1; released += 1; }
      return released;
    },
  };
  return store;
}

export async function mergeGuardianFortuneAnonymousUsage({ userId, guestIdHash, env, now = new Date() } = {}) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedGuestHash = normalizeGuestHash(guestIdHash);
  if (!normalizedUserId || !normalizedGuestHash) return { ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.INVALID_INPUT, status: 400 };
  await connectDb(env);
  const accountId = objectIdOrString(normalizedUserId);
  const session = await mongoose.startSession();
  try {
    let merged = false;
    let guestUsed = 0;
    let freeUsed = 0;
    await session.withTransaction(async () => {
      const existing = await GuardianFortuneAnonymousMerge.findOne({ userId: accountId, guestIdHash: normalizedGuestHash }).session(session).lean();
      const guest = await GuardianFortuneGuestUsage.findOne({ guestIdHash: normalizedGuestHash }).session(session).lean();
      guestUsed = Math.min(GUARDIAN_FORTUNE_GUEST_LIMIT, clampNonNegative(guest?.totalUsed));
      const account = await GuardianFortuneAccountUsage.findOneAndUpdate(
        { userId: accountId },
        { $setOnInsert: { userId: accountId, freeLimit: GUARDIAN_FORTUNE_ACCOUNT_FREE_LIMIT, freeUsed: 0, reserved: 0, legacyMigratedAt: now } },
        { upsert: true, new: true, session },
      ).lean();
      if (!existing) {
        const nextUsed = Math.min(GUARDIAN_FORTUNE_ACCOUNT_FREE_LIMIT, clampNonNegative(account?.freeUsed) + guestUsed);
        await GuardianFortuneAccountUsage.updateOne({ userId: accountId }, { $set: { freeUsed: nextUsed, updatedAt: now } }, { session });
        await GuardianFortuneAnonymousMerge.create([{ userId: accountId, guestIdHash: normalizedGuestHash, mergedGuestUsed: guestUsed }], { session });
        merged = true; freeUsed = nextUsed;
      } else freeUsed = clampNonNegative(account?.freeUsed);
    });
    return { ok: true, merged, guestUsed, freeUsed, remaining: Math.max(0, GUARDIAN_FORTUNE_ACCOUNT_FREE_LIMIT - freeUsed) };
  } finally { await session.endSession(); }
}

function objectIdOrString(value) {
  const normalized = normalizeUserId(value);
  if (mongoose.Types.ObjectId.isValid(normalized)) return new mongoose.Types.ObjectId(normalized);
  return normalized;
}

function leanQuery(query) {
  return query?.lean ? query.lean() : query;
}

export function createMongoGuardianFortuneStore({ env } = {}) {
  /**
   * 개별 Mongo 호출을 커밋 0ea717329 가 세운 정본 패턴대로 감싼다 — admission 제어, 12초 시도
   * 상한, 일시적 오류 재시도, `[db-op-timeout]` 계측이 전부 여기서 붙는다.
   *
   * 감싸기 전에는 이 store 의 14개 메서드가 전부 raw 였다. 그래서 풀이 붐비면 재시도 없이
   * waitQueueTimeoutMS(5초) 한 방에 죽었고, admission 슬롯을 잡지 않아 maxPoolSize(5) 위로
   * 무제한 쇄도했으며, 계측에도 안 잡혀 로그에 흔적이 남지 않았다.
   *
   * 🔴 중첩 금지(CLAUDE.md 6번): 감싸는 것은 **말단 쿼리 하나**뿐이다. reserveGuest/reserveDaily 는
   * 자기 자신을 감싸지 않고 ensureX(감싼 것) → 자기 쿼리(감싼 것) 순으로 **직렬** 호출한다.
   * beginAttempt 도 create 만 감싸고, 11000 분기의 findAttempt 는 그 밖에서 별도로 돈다.
   * withMongoRetry 가 내부에서 connectDb 를 부르므로 메서드마다 있던 connectDb 는 걷어냈다.
   */
  const run = (operation) => withMongoRetry(env, operation);

  const store = {
    kind: "mongo",
    async findGuest(hash) {
      return run(() => leanQuery(GuardianFortuneGuestUsage.findOne({ guestIdHash: normalizeGuestHash(hash) })));
    },
    async ensureGuest(hash, now = new Date()) {
      // 🔴 createdAt·updatedAt 을 $setOnInsert 에 직접 넣지 말 것. 이 스키마는 timestamps:true 라
      // Mongoose 가 $set.updatedAt 을 **무조건** 덧붙인다(applyTimestampsToUpdate 는 $currentDate 만
      // 확인하고 $setOnInsert 는 보지 않는다). 그러면 updatedAt 이 두 연산자에 동시에 실려 MongoDB 가
      // ConflictingUpdateOperators(code 40)로 매번 거부한다 — 이 컬렉션에 문서가 단 하나도 생기지
      // 못했고 상담 전체가 100% 죽어 있던 원인이다(2026-08-09). 두 필드는 timestamps 가 넣어 준다.
      return run(() => leanQuery(GuardianFortuneGuestUsage.findOneAndUpdate(
        { guestIdHash: normalizeGuestHash(hash) },
        { $setOnInsert: { guestIdHash: normalizeGuestHash(hash), totalUsed: 0, reserved: 0, firstUsedAt: null, lastUsedAt: null, reservationUpdatedAt: null } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )));
    },
    async reserveGuest(hash, now = new Date()) {
      await store.ensureGuest(hash, now);
      return run(() => leanQuery(GuardianFortuneGuestUsage.findOneAndUpdate(
        { guestIdHash: normalizeGuestHash(hash), $expr: { $lt: [{ $add: [{ $ifNull: ["$totalUsed", 0] }, { $ifNull: ["$reserved", 0] }] }, GUARDIAN_FORTUNE_GUEST_LIMIT] } },
        { $inc: { reserved: 1 }, $set: { reservationUpdatedAt: now, updatedAt: now } },
        { new: true },
      )));
    },
    async commitGuest(hash, now = new Date()) {
      return run(() => leanQuery(GuardianFortuneGuestUsage.findOneAndUpdate(
        { guestIdHash: normalizeGuestHash(hash), reserved: { $gt: 0 } },
        { $inc: { reserved: -1, totalUsed: 1 }, $set: { firstUsedAt: now, lastUsedAt: now, updatedAt: now }, $unset: { reservationUpdatedAt: 1 } },
        { new: true },
      )));
    },
    async releaseGuest(hash, now = new Date()) {
      return run(() => leanQuery(GuardianFortuneGuestUsage.findOneAndUpdate(
        { guestIdHash: normalizeGuestHash(hash), reserved: { $gt: 0 } },
        { $inc: { reserved: -1 }, $set: { updatedAt: now }, $unset: { reservationUpdatedAt: 1 } },
        { new: true },
      )));
    },
    async findDaily(userId, dateKey) {
      return run(() => leanQuery(GuardianFortuneAccountUsage.findOne({ userId: objectIdOrString(userId) })));
    },
    async ensureDaily(userId, dateKey, now = new Date()) {
      const accountId = objectIdOrString(userId);
      // Account quota is lifetime-scoped. Historical per-day rows are deliberately
      // not imported: they remain legacy audit data and must never grant or remove
      // a user's current three free consultations.
      return run(() => leanQuery(GuardianFortuneAccountUsage.findOneAndUpdate(
        { userId: accountId },
        // createdAt·updatedAt 은 넣지 않는다 — 위 ensureGuest 주석과 같은 이유(timestamps 충돌).
        { $setOnInsert: { userId: accountId, freeLimit: GUARDIAN_FORTUNE_ACCOUNT_FREE_LIMIT, freeUsed: 0, reserved: 0, reservationUpdatedAt: null, legacyMigratedAt: now } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )));
    },
    async reserveDaily(userId, dateKey, now = new Date()) {
      await store.ensureDaily(userId, dateKey, now);
      return run(() => leanQuery(GuardianFortuneAccountUsage.findOneAndUpdate(
        { userId: objectIdOrString(userId), $expr: { $lt: [{ $add: [{ $ifNull: ["$freeUsed", 0] }, { $ifNull: ["$reserved", 0] }] }, { $ifNull: ["$freeLimit", GUARDIAN_FORTUNE_ACCOUNT_FREE_LIMIT] }] } },
        { $inc: { reserved: 1 }, $set: { reservationUpdatedAt: now, updatedAt: now } },
        { new: true },
      )));
    },
    async commitDaily(userId, dateKey, now = new Date()) {
      return run(() => leanQuery(GuardianFortuneAccountUsage.findOneAndUpdate(
        { userId: objectIdOrString(userId), reserved: { $gt: 0 } },
        { $inc: { reserved: -1, freeUsed: 1 }, $set: { updatedAt: now }, $unset: { reservationUpdatedAt: 1 } },
        { new: true },
      )));
    },
    async releaseDaily(userId, dateKey, now = new Date()) {
      return run(() => leanQuery(GuardianFortuneAccountUsage.findOneAndUpdate(
        { userId: objectIdOrString(userId), reserved: { $gt: 0 } },
        { $inc: { reserved: -1 }, $set: { updatedAt: now }, $unset: { reservationUpdatedAt: 1 } },
        { new: true },
      )));
    },
    async findAttempt(requestId) {
      return run(() => leanQuery(GuardianFortuneGenerationAttempt.findOne({ requestId: assertRequestId(requestId) })));
    },
    async beginAttempt(data) {
      const value = attemptValue(data);
      try {
        // create 만 감싼다. 중복키(11000)는 isTransientMongoError 의 이름 allowlist 에 없어
        // withMongoRetry 가 재시도하지 않고 그대로 던지므로 아래 멱등성 분기가 그대로 산다.
        const created = await run(() => GuardianFortuneGenerationAttempt.create(value));
        return { created: true, attempt: created.toObject ? created.toObject() : created };
      } catch (error) {
        if (error?.code !== 11000) throw error;
        return { created: false, attempt: await store.findAttempt(value.requestId) };
      }
    },
    async updateAttempt(requestId, patch = {}) {
      return run(() => leanQuery(GuardianFortuneGenerationAttempt.findOneAndUpdate(
        { requestId: assertRequestId(requestId) },
        { $set: { ...patch, updatedAt: patch.updatedAt || new Date() } },
        { new: true },
      )));
    },
    async releaseStaleReservations(now = new Date()) {
      const before = new Date(toDate(now).getTime() - GUARDIAN_FORTUNE_RESERVATION_TTL_MS);
      const [guest, daily] = await Promise.all([
        run(() => GuardianFortuneGuestUsage.updateMany({ reserved: { $gt: 0 }, reservationUpdatedAt: { $lt: before } }, { $inc: { reserved: -1 }, $unset: { reservationUpdatedAt: 1 } })),
        run(() => GuardianFortuneAccountUsage.updateMany({ reserved: { $gt: 0 }, reservationUpdatedAt: { $lt: before } }, { $inc: { reserved: -1 }, $unset: { reservationUpdatedAt: 1 } })),
      ]);
      return Number(guest.modifiedCount || 0) + Number(daily.modifiedCount || 0);
    },
  };
  return store;
}

/**
 * 무료 횟수를 소진한 로그인 사용자를 위한 회당 결제 판정.
 *
 * 대화권(전용 재화)을 폐지하면서 이 자리에 표준 회당 결제가 들어왔다. 결제 증빙 조회는
 * 워커 라우트가 소유하므로(verifyPerUsePayment 는 env 와 featureKey 를 안다) 여기서는
 * 콜백만 호출한다 — 예약/멱등성 기록은 한곳에 유지하면서 결제 지식은 라우트에 둔다.
 *
 * 반환 계약: `{ ok: true }` 통과 / `{ ok: false, degraded: true }` 판단 보류(503) /
 * 그 외 `{ ok: false }` 결제 필요(402).
 */
async function resolvePaidGuardianFortuneAccess(resolvePaidAccess, context) {
  if (typeof resolvePaidAccess !== "function") return { ok: false, degraded: false };
  try {
    const verdict = await resolvePaidAccess(context);
    return { ok: verdict?.ok === true, degraded: verdict?.degraded === true };
  } catch {
    // 예외는 "결제 안 했다"가 아니라 "확인 못 했다"이다. 402 로 내리면 결제한 사용자가 막힌다.
    return { ok: false, degraded: true };
  }
}

export async function reserveGuardianFortuneUsage({ userId, guestIdHash, dateKey, requestId, store, resolvePaidAccess, now = new Date() } = {}) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedGuestHash = normalizeGuestHash(guestIdHash);
  const safeDateKey = normalizeDateKey(dateKey) || getGuardianFortuneDateKey(now);
  const safeRequestId = assertRequestId(requestId);
  if (!safeRequestId) return { ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.INVALID_INPUT, status: 400 };
  if (!normalizedUserId && !normalizedGuestHash) return { ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.INVALID_INPUT, status: 400 };

  const started = await store.beginAttempt({ requestId: safeRequestId, userId: normalizedUserId, guestIdHash: normalizedGuestHash, dateKey: safeDateKey, now });
  if (!started.created) {
    const existingStatus = String(started.attempt?.status || "");
    // released(생성 실패) · blocked(결제 전 거절)는 **끝난** 시도다. 여기서 409 로 막으면
    // 그 requestId 로 결제한 사용자가 영원히 결과를 못 받는다 — 결제 증빙이 requestId 에
    // 묶여 있어 새 requestId 로는 증빙이 안 잡히기 때문이다. 다시 열어 재시도를 허용한다.
    if (existingStatus !== "released" && existingStatus !== "blocked") {
      return { ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.REQUEST_IN_PROGRESS, status: 409 };
    }
    await store.updateAttempt(safeRequestId, {
      status: "reserved",
      errorCode: "",
      expiresAt: new Date(toDate(now).getTime() + GUARDIAN_FORTUNE_RESERVATION_TTL_MS),
    });
  }

  let reserved = null;
  if (!normalizedUserId) {
    reserved = await store.reserveGuest(normalizedGuestHash, now);
    if (reserved) return { ok: true, source: "guest_free", requestId: safeRequestId, userId: "", guestIdHash: normalizedGuestHash, dateKey: safeDateKey };
    await store.updateAttempt(safeRequestId, { status: "blocked", errorCode: GUARDIAN_FORTUNE_ERROR_CODES.GUEST_LIMIT_EXCEEDED });
    return { ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.GUEST_LIMIT_EXCEEDED, status: 429 };
  }

  reserved = await store.reserveDaily(normalizedUserId, safeDateKey, now);
  if (reserved) return { ok: true, source: "daily_free", requestId: safeRequestId, userId: normalizedUserId, guestIdHash: "", dateKey: safeDateKey };

  const paid = await resolvePaidGuardianFortuneAccess(resolvePaidAccess, { userId: normalizedUserId, requestId: safeRequestId });
  if (paid.ok) {
    // 결제분은 무료 카운터를 건드리지 않는다. 예약 자리 대신 attempt 문서가 멱등성을 맡는다.
    return { ok: true, source: "paid", requestId: safeRequestId, userId: normalizedUserId, guestIdHash: "", dateKey: safeDateKey };
  }
  if (paid.degraded) {
    await store.updateAttempt(safeRequestId, { status: "released", errorCode: GUARDIAN_FORTUNE_ERROR_CODES.PAYMENT_CHECK_DEGRADED });
    return { ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.PAYMENT_CHECK_DEGRADED, status: 503, retryable: true };
  }

  await store.updateAttempt(safeRequestId, { status: "blocked", errorCode: GUARDIAN_FORTUNE_ERROR_CODES.PAYMENT_REQUIRED });
  return { ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.PAYMENT_REQUIRED, status: 402 };
}

export async function releaseGuardianFortuneUsage(reservation, { store, errorCode = "", now = new Date() } = {}) {
  if (!reservation?.ok) return null;
  if (reservation.source === "guest_free") await store.releaseGuest(reservation.guestIdHash, now);
  if (reservation.source === "daily_free") await store.releaseDaily(reservation.userId, reservation.dateKey, now);
  // source === "paid" 는 무료 카운터를 잡지 않았으므로 되돌릴 예약이 없다. attempt 만 풀어
  // 같은 requestId 로 재시도할 수 있게 한다 — 이미 결제한 사용자가 결과를 받아야 하기 때문이다.
  return store.updateAttempt(reservation.requestId, { status: "released", errorCode: String(errorCode || "") });
}

export async function commitGuardianFortuneUsage(reservation, { store, now = new Date(), ctx = null } = {}) {
  if (!reservation?.ok) return { ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.USAGE_COMMIT_FAILED };
  let committed;
  try {
    if (reservation.source === "guest_free") committed = await store.commitGuest(reservation.guestIdHash, now);
    if (reservation.source === "daily_free") committed = await store.commitDaily(reservation.userId, reservation.dateKey, now);
    // 결제분은 소비할 무료 예약이 없다. 차감은 결제 게이트가 이미 끝냈고, 여기서는
    // attempt 를 completed 로 닫는 것만 남는다.
    if (reservation.source === "paid") committed = { paid: true };
    if (!committed) throw new Error("GUARDIAN_FORTUNE_USAGE_COMMIT_FAILED");

    // An attempt-status write is diagnostic/idempotency metadata. It must not turn
    // an already committed usage into a false failure response.
    //
    // 그래서 응답을 붙잡을 이유도 없다. ctx 가 있으면 waitUntil 로 넘겨 임계 경로에서 Mongo
    // 왕복 한 번(현재 평균 5초)을 덜어낸다. 이 쓰기가 늦어져도 같은 requestId 재전송은
    // reserveGuardianFortuneUsage 가 "released/blocked 가 아니면 409" 로 막으므로 중복 생성
    // 방향으로는 안전하다. ctx 가 없는 호출자(테스트·Express)는 종전대로 기다린다.
    // waitUntil 자체가 던질 수 있다(요청 컨텍스트가 이미 닫힌 경우). 그걸 새어 나가게 두면
    // **커밋에 성공한 요청이 아래 catch 로 떨어져** USAGE_COMMIT_FAILED 가 된다 — 진단용 쓰기
    // 하나 때문에 성사된 상담을 실패로 뒤집는 것이라 반드시 여기서 삼킨다.
    const closeAttempt = () => store.updateAttempt(reservation.requestId, { status: "completed", errorCode: "" }).catch(() => {});
    if (typeof ctx?.waitUntil === "function") {
      try { ctx.waitUntil(closeAttempt()); } catch { /* 컨텍스트가 닫혔으면 TTL 청소에 맡긴다 */ }
    } else {
      await closeAttempt();
    }
    return { ok: true, committed };
  } catch (error) {
    if (reservation.source === "guest_free") await store.releaseGuest(reservation.guestIdHash, now).catch(() => {});
    if (reservation.source === "daily_free") await store.releaseDaily(reservation.userId, reservation.dateKey, now).catch(() => {});
    // A null commit means the reservation was not consumed; release only the
    // reservation slot.
    await store.updateAttempt(reservation.requestId, { status: "released", errorCode: GUARDIAN_FORTUNE_ERROR_CODES.USAGE_COMMIT_FAILED }).catch(() => {});
    return { ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.USAGE_COMMIT_FAILED };
  }
}

export function buildGuardianFortuneLimitCta(errorCode, isLoggedIn) {
  if (!isLoggedIn || errorCode === GUARDIAN_FORTUNE_ERROR_CODES.GUEST_LIMIT_EXCEEDED) {
    return { label: "로그인하고 3회 무료로 보기", targetPath: "/auth/login", reason: "로그인하면 3번까지 연이와 네오에게 물어볼 수 있어요." };
  }
  // 결제창은 클라이언트의 공용 게이트(useCoinGate)가 연다. 여기서 /points 로 보내면
  // 이용권 보유자가 결제창의 [이용권으로 구매] 카드를 만나지 못한다.
  return {
    label: "이어서 상담하기",
    featureKey: GUARDIAN_FORTUNE_PAID_FEATURE_KEY,
    reason: "무료 상담을 모두 사용했어요. 1회 5,000원으로 이어서 물어볼 수 있어요.",
  };
}

export function isValidGuardianFortuneRequestId(requestId) {
  return Boolean(assertRequestId(requestId));
}

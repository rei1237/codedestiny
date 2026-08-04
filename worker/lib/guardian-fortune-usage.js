import { connectDb, mongoose } from "./db.js";
import {
  GuardianFortuneChatCreditBalance,
  GuardianFortuneChatCreditTransaction,
  GuardianFortuneDailyUsage,
  GuardianFortuneGenerationAttempt,
  GuardianFortuneGuestUsage,
} from "./models.js";

export const GUARDIAN_FORTUNE_GUEST_LIMIT = 1;
export const GUARDIAN_FORTUNE_DAILY_LIMIT = 3;
export const GUARDIAN_FORTUNE_DEFAULT_TIMEZONE = "Asia/Seoul";
export const GUARDIAN_FORTUNE_GUEST_COOKIE = "guardian_fortune_guest_id";
export const GUARDIAN_FORTUNE_RESERVATION_TTL_MS = 10 * 60 * 1000;

export const GUARDIAN_FORTUNE_ERROR_CODES = Object.freeze({
  FEATURE_DISABLED: "GUARDIAN_FORTUNE_FEATURE_DISABLED",
  INVALID_INPUT: "GUARDIAN_FORTUNE_INVALID_INPUT",
  GUEST_LIMIT_EXCEEDED: "GUARDIAN_FORTUNE_GUEST_LIMIT_EXCEEDED",
  DAILY_LIMIT_EXCEEDED: "GUARDIAN_FORTUNE_DAILY_LIMIT_EXCEEDED",
  NO_CREDITS: "GUARDIAN_FORTUNE_NO_CREDITS",
  CONTEXT_FAILED: "GUARDIAN_FORTUNE_CONTEXT_FAILED",
  GENERATION_FAILED: "GUARDIAN_FORTUNE_GENERATION_FAILED",
  RESULT_INVALID: "GUARDIAN_FORTUNE_RESULT_INVALID",
  USAGE_COMMIT_FAILED: "GUARDIAN_FORTUNE_USAGE_COMMIT_FAILED",
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

function usageMessage({ isLoggedIn, guestUsed, dailyRemaining, paidRemaining }) {
  if (!isLoggedIn) {
    return guestUsed > 0
      ? "첫 무료 상담을 이미 사용했어요. 로그인하면 하루 최대 3번까지 연이와 네오에게 물어볼 수 있어요."
      : "첫 1회는 로그인 없이 무료로 볼 수 있어요.";
  }
  if (dailyRemaining > 0) return `오늘 남은 무료 상담 ${dailyRemaining}회`;
  if (paidRemaining > 0) return `오늘의 무료 상담은 모두 사용했어요. 보유 대화권 ${paidRemaining}회 중 1회를 사용할 수 있어요.`;
  return "오늘 이용 가능한 무료 상담을 모두 사용했어요. 대화권을 구매하면 더 물어볼 수 있어요.";
}

export function buildGuardianFortuneDisabledUsageStatus({ isLoggedIn = false } = {}) {
  return {
    isLoggedIn: Boolean(isLoggedIn),
    guestFreeLimit: isLoggedIn ? 0 : GUARDIAN_FORTUNE_GUEST_LIMIT,
    guestFreeUsed: 0,
    guestFreeRemaining: 0,
    dailyFreeLimit: isLoggedIn ? GUARDIAN_FORTUNE_DAILY_LIMIT : 0,
    dailyFreeUsed: 0,
    dailyFreeRemaining: 0,
    paidCreditsRemaining: 0,
    canGenerate: false,
    generationSource: "blocked",
    nextAction: "wait_tomorrow",
    message: "오늘의 귀인 운세는 준비 중이에요.",
  };
}

function emptyStatus(isLoggedIn) {
  return {
    isLoggedIn,
    guestFreeLimit: isLoggedIn ? 0 : GUARDIAN_FORTUNE_GUEST_LIMIT,
    guestFreeUsed: 0,
    guestFreeRemaining: isLoggedIn ? 0 : GUARDIAN_FORTUNE_GUEST_LIMIT,
    dailyFreeLimit: isLoggedIn ? GUARDIAN_FORTUNE_DAILY_LIMIT : 0,
    dailyFreeUsed: 0,
    dailyFreeRemaining: isLoggedIn ? GUARDIAN_FORTUNE_DAILY_LIMIT : 0,
    paidCreditsRemaining: 0,
    canGenerate: !isLoggedIn,
    generationSource: isLoggedIn ? "daily_free" : "guest_free",
    nextAction: "generate",
    message: "",
  };
}

export async function buildGuardianFortuneUsageStatus({ userId, guestIdHash, dateKey, store, now = new Date() } = {}) {
  const normalizedUserId = normalizeUserId(userId);
  const isLoggedIn = Boolean(normalizedUserId);
  const safeDateKey = normalizeDateKey(dateKey) || getGuardianFortuneDateKey(now);
  const status = emptyStatus(isLoggedIn);

  if (!isLoggedIn) {
    const guest = await store.findGuest(normalizeGuestHash(guestIdHash));
    status.guestFreeUsed = clampNonNegative(guest?.totalUsed);
    status.guestFreeRemaining = Math.max(0, GUARDIAN_FORTUNE_GUEST_LIMIT - status.guestFreeUsed);
    status.canGenerate = status.guestFreeRemaining > 0;
    status.generationSource = status.canGenerate ? "guest_free" : "blocked";
    status.nextAction = status.canGenerate ? "generate" : "login";
    status.message = usageMessage({ isLoggedIn: false, guestUsed: status.guestFreeUsed, dailyRemaining: 0, paidRemaining: 0 });
    return status;
  }

  const [daily, credit] = await Promise.all([
    store.findDaily(normalizedUserId, safeDateKey),
    store.findCredit(normalizedUserId),
  ]);
  status.dailyFreeUsed = clampNonNegative(daily?.freeUsed);
  status.dailyFreeRemaining = Math.max(0, clampNonNegative(daily?.freeLimit || GUARDIAN_FORTUNE_DAILY_LIMIT) - status.dailyFreeUsed);
  status.paidCreditsRemaining = clampNonNegative(credit?.remaining);
  status.canGenerate = status.dailyFreeRemaining > 0 || status.paidCreditsRemaining > 0;
  status.generationSource = status.dailyFreeRemaining > 0
    ? "daily_free"
    : status.paidCreditsRemaining > 0 ? "paid_credit" : "blocked";
  status.nextAction = status.canGenerate ? "generate" : "buy_credits";
  status.message = usageMessage({
    isLoggedIn: true,
    guestUsed: 0,
    dailyRemaining: status.dailyFreeRemaining,
    paidRemaining: status.paidCreditsRemaining,
  });
  return status;
}

function guestKey(hash) {
  return normalizeGuestHash(hash);
}

function dailyKey(userId, dateKey) {
  return `${normalizeUserId(userId)}:${normalizeDateKey(dateKey)}`;
}

function creditKey(userId) {
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
  const state = {
    guests: new Map(Object.entries(seed.guests || {})),
    daily: new Map(Object.entries(seed.daily || {})),
    credits: new Map(Object.entries(seed.credits || {})),
    attempts: new Map(Object.entries(seed.attempts || {})),
    transactions: Array.isArray(seed.transactions) ? seed.transactions.map(clone) : [],
  };

  const store = {
    kind: "memory",
    state,
    transactions: state.transactions,
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
      if (!state.daily.has(key)) state.daily.set(key, { userId: normalizeUserId(userId), dateKey, freeLimit: GUARDIAN_FORTUNE_DAILY_LIMIT, freeUsed: 0, reserved: 0, reservationUpdatedAt: null, createdAt: now, updatedAt: now });
      return state.daily.get(key);
    },
    async reserveDaily(userId, dateKey, now = new Date()) {
      const doc = await store.ensureDaily(userId, dateKey, now);
      if (clampNonNegative(doc.freeUsed) + clampNonNegative(doc.reserved) >= clampNonNegative(doc.freeLimit || GUARDIAN_FORTUNE_DAILY_LIMIT)) return null;
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
    async findCredit(userId) { return state.credits.get(creditKey(userId)) || null; },
    async ensureCredit(userId, now = new Date()) {
      const key = creditKey(userId);
      if (!state.credits.has(key)) state.credits.set(key, { userId: key, remaining: 0, reserved: 0, purchasedTotal: 0, usedTotal: 0, refundedTotal: 0, updatedAt: now });
      return state.credits.get(key);
    },
    async reserveCredit(userId, now = new Date()) {
      const doc = await store.ensureCredit(userId, now);
      if (clampNonNegative(doc.remaining) - clampNonNegative(doc.reserved) < 1) return null;
      doc.reserved += 1;
      doc.reservationUpdatedAt = now;
      doc.updatedAt = now;
      return doc;
    },
    async commitCredit(userId, now = new Date()) {
      const doc = state.credits.get(creditKey(userId));
      if (!doc || clampNonNegative(doc.reserved) < 1 || clampNonNegative(doc.remaining) < 1) return null;
      doc.reserved -= 1;
      doc.remaining -= 1;
      doc.usedTotal = clampNonNegative(doc.usedTotal) + 1;
      doc.reservationUpdatedAt = null;
      doc.updatedAt = now;
      return doc;
    },
    async releaseCredit(userId, now = new Date()) {
      const doc = state.credits.get(creditKey(userId));
      if (!doc || clampNonNegative(doc.reserved) < 1) return doc || null;
      doc.reserved -= 1;
      doc.reservationUpdatedAt = null;
      doc.updatedAt = now;
      return doc;
    },
    async rollbackCredit(userId, now = new Date()) {
      const doc = await store.ensureCredit(userId, now);
      doc.remaining = clampNonNegative(doc.remaining) + 1;
      doc.usedTotal = Math.max(0, clampNonNegative(doc.usedTotal) - 1);
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
    async createTransaction(data) {
      if (["purchase", "refund"].includes(data.type)) throw new Error("GUARDIAN_FORTUNE_PURCHASE_TRANSACTION_NOT_ALLOWED");
      const transaction = { ...clone(data), createdAt: data.createdAt || new Date() };
      state.transactions.push(transaction);
      return transaction;
    },
    async releaseStaleReservations(now = new Date()) {
      const threshold = toDate(now).getTime() - GUARDIAN_FORTUNE_RESERVATION_TTL_MS;
      let released = 0;
      for (const doc of state.guests.values()) if (doc.reservationUpdatedAt && toDate(doc.reservationUpdatedAt).getTime() < threshold && doc.reserved > 0) { doc.reserved -= 1; released += 1; }
      for (const doc of state.daily.values()) if (doc.reservationUpdatedAt && toDate(doc.reservationUpdatedAt).getTime() < threshold && doc.reserved > 0) { doc.reserved -= 1; released += 1; }
      for (const doc of state.credits.values()) if (doc.reservationUpdatedAt && toDate(doc.reservationUpdatedAt).getTime() < threshold && doc.reserved > 0) { doc.reserved -= 1; released += 1; }
      return released;
    },
  };
  return store;
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
  const store = {
    kind: "mongo",
    async findGuest(hash) {
      return leanQuery(GuardianFortuneGuestUsage.findOne({ guestIdHash: normalizeGuestHash(hash) }));
    },
    async ensureGuest(hash, now = new Date()) {
      await connectDb(env);
      return leanQuery(GuardianFortuneGuestUsage.findOneAndUpdate(
        { guestIdHash: normalizeGuestHash(hash) },
        { $setOnInsert: { guestIdHash: normalizeGuestHash(hash), totalUsed: 0, reserved: 0, firstUsedAt: null, lastUsedAt: null, reservationUpdatedAt: null, createdAt: now, updatedAt: now } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ));
    },
    async reserveGuest(hash, now = new Date()) {
      await store.ensureGuest(hash, now);
      return leanQuery(GuardianFortuneGuestUsage.findOneAndUpdate(
        { guestIdHash: normalizeGuestHash(hash), $expr: { $lt: [{ $add: [{ $ifNull: ["$totalUsed", 0] }, { $ifNull: ["$reserved", 0] }] }, GUARDIAN_FORTUNE_GUEST_LIMIT] } },
        { $inc: { reserved: 1 }, $set: { reservationUpdatedAt: now, updatedAt: now } },
        { new: true },
      ));
    },
    async commitGuest(hash, now = new Date()) {
      return leanQuery(GuardianFortuneGuestUsage.findOneAndUpdate(
        { guestIdHash: normalizeGuestHash(hash), reserved: { $gt: 0 } },
        { $inc: { reserved: -1, totalUsed: 1 }, $set: { firstUsedAt: now, lastUsedAt: now, updatedAt: now }, $unset: { reservationUpdatedAt: 1 } },
        { new: true },
      ));
    },
    async releaseGuest(hash, now = new Date()) {
      return leanQuery(GuardianFortuneGuestUsage.findOneAndUpdate(
        { guestIdHash: normalizeGuestHash(hash), reserved: { $gt: 0 } },
        { $inc: { reserved: -1 }, $set: { updatedAt: now }, $unset: { reservationUpdatedAt: 1 } },
        { new: true },
      ));
    },
    async findDaily(userId, dateKey) {
      return leanQuery(GuardianFortuneDailyUsage.findOne({ userId: objectIdOrString(userId), dateKey: normalizeDateKey(dateKey) }));
    },
    async ensureDaily(userId, dateKey, now = new Date()) {
      await connectDb(env);
      return leanQuery(GuardianFortuneDailyUsage.findOneAndUpdate(
        { userId: objectIdOrString(userId), dateKey: normalizeDateKey(dateKey) },
        { $setOnInsert: { userId: objectIdOrString(userId), dateKey: normalizeDateKey(dateKey), freeLimit: GUARDIAN_FORTUNE_DAILY_LIMIT, freeUsed: 0, reserved: 0, reservationUpdatedAt: null, createdAt: now, updatedAt: now } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ));
    },
    async reserveDaily(userId, dateKey, now = new Date()) {
      await store.ensureDaily(userId, dateKey, now);
      return leanQuery(GuardianFortuneDailyUsage.findOneAndUpdate(
        { userId: objectIdOrString(userId), dateKey: normalizeDateKey(dateKey), $expr: { $lt: [{ $add: [{ $ifNull: ["$freeUsed", 0] }, { $ifNull: ["$reserved", 0] }] }, { $ifNull: ["$freeLimit", GUARDIAN_FORTUNE_DAILY_LIMIT] }] } },
        { $inc: { reserved: 1 }, $set: { reservationUpdatedAt: now, updatedAt: now } },
        { new: true },
      ));
    },
    async commitDaily(userId, dateKey, now = new Date()) {
      return leanQuery(GuardianFortuneDailyUsage.findOneAndUpdate(
        { userId: objectIdOrString(userId), dateKey: normalizeDateKey(dateKey), reserved: { $gt: 0 } },
        { $inc: { reserved: -1, freeUsed: 1 }, $set: { updatedAt: now }, $unset: { reservationUpdatedAt: 1 } },
        { new: true },
      ));
    },
    async releaseDaily(userId, dateKey, now = new Date()) {
      return leanQuery(GuardianFortuneDailyUsage.findOneAndUpdate(
        { userId: objectIdOrString(userId), dateKey: normalizeDateKey(dateKey), reserved: { $gt: 0 } },
        { $inc: { reserved: -1 }, $set: { updatedAt: now }, $unset: { reservationUpdatedAt: 1 } },
        { new: true },
      ));
    },
    async findCredit(userId) {
      return leanQuery(GuardianFortuneChatCreditBalance.findOne({ userId: objectIdOrString(userId) }));
    },
    async ensureCredit(userId, now = new Date()) {
      await connectDb(env);
      return leanQuery(GuardianFortuneChatCreditBalance.findOneAndUpdate(
        { userId: objectIdOrString(userId) },
        { $setOnInsert: { userId: objectIdOrString(userId), remaining: 0, reserved: 0, purchasedTotal: 0, usedTotal: 0, refundedTotal: 0, createdAt: now, updatedAt: now } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ));
    },
    async reserveCredit(userId, now = new Date()) {
      await store.ensureCredit(userId, now);
      return leanQuery(GuardianFortuneChatCreditBalance.findOneAndUpdate(
        { userId: objectIdOrString(userId), $expr: { $gte: [{ $subtract: [{ $ifNull: ["$remaining", 0] }, { $ifNull: ["$reserved", 0] }] }, 1] } },
        { $inc: { reserved: 1 }, $set: { reservationUpdatedAt: now, updatedAt: now } },
        { new: true },
      ));
    },
    async commitCredit(userId, now = new Date()) {
      return leanQuery(GuardianFortuneChatCreditBalance.findOneAndUpdate(
        { userId: objectIdOrString(userId), reserved: { $gt: 0 }, remaining: { $gt: 0 } },
        { $inc: { reserved: -1, remaining: -1, usedTotal: 1 }, $set: { updatedAt: now }, $unset: { reservationUpdatedAt: 1 } },
        { new: true },
      ));
    },
    async releaseCredit(userId, now = new Date()) {
      return leanQuery(GuardianFortuneChatCreditBalance.findOneAndUpdate(
        { userId: objectIdOrString(userId), reserved: { $gt: 0 } },
        { $inc: { reserved: -1 }, $set: { updatedAt: now }, $unset: { reservationUpdatedAt: 1 } },
        { new: true },
      ));
    },
    async rollbackCredit(userId, now = new Date()) {
      return leanQuery(GuardianFortuneChatCreditBalance.findOneAndUpdate(
        { userId: objectIdOrString(userId) },
        { $inc: { remaining: 1, usedTotal: -1 }, $set: { updatedAt: now } },
        { new: true, upsert: false },
      ));
    },
    async findAttempt(requestId) {
      return leanQuery(GuardianFortuneGenerationAttempt.findOne({ requestId: assertRequestId(requestId) }));
    },
    async beginAttempt(data) {
      await connectDb(env);
      const value = attemptValue(data);
      try {
        const created = await GuardianFortuneGenerationAttempt.create(value);
        return { created: true, attempt: created.toObject ? created.toObject() : created };
      } catch (error) {
        if (error?.code !== 11000) throw error;
        return { created: false, attempt: await store.findAttempt(value.requestId) };
      }
    },
    async updateAttempt(requestId, patch = {}) {
      return leanQuery(GuardianFortuneGenerationAttempt.findOneAndUpdate(
        { requestId: assertRequestId(requestId) },
        { $set: { ...patch, updatedAt: patch.updatedAt || new Date() } },
        { new: true },
      ));
    },
    async createTransaction(data) {
      if (["purchase", "refund"].includes(data.type)) throw new Error("GUARDIAN_FORTUNE_PURCHASE_TRANSACTION_NOT_ALLOWED");
      return GuardianFortuneChatCreditTransaction.create({
        ...data,
        userId: objectIdOrString(data.userId),
      });
    },
    async releaseStaleReservations(now = new Date()) {
      const before = new Date(toDate(now).getTime() - GUARDIAN_FORTUNE_RESERVATION_TTL_MS);
      const [guest, daily, credit] = await Promise.all([
        GuardianFortuneGuestUsage.updateMany({ reserved: { $gt: 0 }, reservationUpdatedAt: { $lt: before } }, { $inc: { reserved: -1 }, $unset: { reservationUpdatedAt: 1 } }),
        GuardianFortuneDailyUsage.updateMany({ reserved: { $gt: 0 }, reservationUpdatedAt: { $lt: before } }, { $inc: { reserved: -1 }, $unset: { reservationUpdatedAt: 1 } }),
        GuardianFortuneChatCreditBalance.updateMany({ reserved: { $gt: 0 }, reservationUpdatedAt: { $lt: before } }, { $inc: { reserved: -1 }, $unset: { reservationUpdatedAt: 1 } }),
      ]);
      return Number(guest.modifiedCount || 0) + Number(daily.modifiedCount || 0) + Number(credit.modifiedCount || 0);
    },
  };
  return store;
}

export async function reserveGuardianFortuneUsage({ userId, guestIdHash, dateKey, requestId, store, now = new Date() } = {}) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedGuestHash = normalizeGuestHash(guestIdHash);
  const safeDateKey = normalizeDateKey(dateKey) || getGuardianFortuneDateKey(now);
  const safeRequestId = assertRequestId(requestId);
  if (!safeRequestId) return { ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.INVALID_INPUT, status: 400 };
  if (!normalizedUserId && !normalizedGuestHash) return { ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.INVALID_INPUT, status: 400 };

  const started = await store.beginAttempt({ requestId: safeRequestId, userId: normalizedUserId, guestIdHash: normalizedGuestHash, dateKey: safeDateKey, now });
  if (!started.created) {
    const existingStatus = String(started.attempt?.status || "");
    return {
      ok: false,
      errorCode: existingStatus === "completed" ? GUARDIAN_FORTUNE_ERROR_CODES.REQUEST_IN_PROGRESS : GUARDIAN_FORTUNE_ERROR_CODES.REQUEST_IN_PROGRESS,
      status: 409,
    };
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
  reserved = await store.reserveCredit(normalizedUserId, now);
  if (reserved) return { ok: true, source: "paid_credit", requestId: safeRequestId, userId: normalizedUserId, guestIdHash: "", dateKey: safeDateKey };

  await store.updateAttempt(safeRequestId, { status: "blocked", errorCode: GUARDIAN_FORTUNE_ERROR_CODES.NO_CREDITS });
  return { ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.NO_CREDITS, status: 429 };
}

export async function releaseGuardianFortuneUsage(reservation, { store, errorCode = "", now = new Date() } = {}) {
  if (!reservation?.ok) return null;
  if (reservation.source === "guest_free") await store.releaseGuest(reservation.guestIdHash, now);
  if (reservation.source === "daily_free") await store.releaseDaily(reservation.userId, reservation.dateKey, now);
  if (reservation.source === "paid_credit") await store.releaseCredit(reservation.userId, now);
  return store.updateAttempt(reservation.requestId, { status: "released", errorCode: String(errorCode || "") });
}

export async function commitGuardianFortuneUsage(reservation, { store, now = new Date() } = {}) {
  if (!reservation?.ok) return { ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.USAGE_COMMIT_FAILED };
  let committed;
  try {
    if (reservation.source === "guest_free") committed = await store.commitGuest(reservation.guestIdHash, now);
    if (reservation.source === "daily_free") committed = await store.commitDaily(reservation.userId, reservation.dateKey, now);
    if (reservation.source === "paid_credit") committed = await store.commitCredit(reservation.userId, now);
    if (!committed) throw new Error("GUARDIAN_FORTUNE_USAGE_COMMIT_FAILED");

    if (reservation.source === "paid_credit") {
      try {
        await store.createTransaction({
          userId: reservation.userId,
          type: "use",
          amount: -1,
          balanceAfter: clampNonNegative(committed.remaining),
          beforeBalance: clampNonNegative(committed.remaining) + 1,
          afterBalance: clampNonNegative(committed.remaining),
          fortuneRequestId: reservation.requestId,
          reason: "guardian_fortune_generation",
          createdAt: now,
        });
      } catch {
        await store.rollbackCredit(reservation.userId, now).catch(() => {});
        const rolledBack = await store.findCredit(reservation.userId).catch(() => null);
        await store.createTransaction({
          userId: reservation.userId,
          type: "rollback",
          amount: 1,
          balanceAfter: clampNonNegative(rolledBack?.remaining),
          beforeBalance: Math.max(0, clampNonNegative(rolledBack?.remaining) - 1),
          afterBalance: clampNonNegative(rolledBack?.remaining),
          fortuneRequestId: reservation.requestId,
          reason: "guardian_fortune_commit_rollback",
          createdAt: now,
        }).catch(() => {});
        await store.updateAttempt(reservation.requestId, { status: "released", errorCode: GUARDIAN_FORTUNE_ERROR_CODES.USAGE_COMMIT_FAILED }).catch(() => {});
        return { ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.USAGE_COMMIT_FAILED };
      }
    }
    // An attempt-status write is diagnostic/idempotency metadata. It must not turn
    // an already committed usage into a false failure response.
    await store.updateAttempt(reservation.requestId, { status: "completed", errorCode: "" }).catch(() => {});
    return { ok: true, committed };
  } catch (error) {
    if (reservation.source === "guest_free") await store.releaseGuest(reservation.guestIdHash, now).catch(() => {});
    if (reservation.source === "daily_free") await store.releaseDaily(reservation.userId, reservation.dateKey, now).catch(() => {});
    // A null commit means the reservation was not consumed; release only the
    // reservation slot. Paid-credit rollback is handled only after a successful
    // credit commit followed by a ledger write failure above.
    await store.updateAttempt(reservation.requestId, { status: "released", errorCode: GUARDIAN_FORTUNE_ERROR_CODES.USAGE_COMMIT_FAILED }).catch(() => {});
    return { ok: false, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.USAGE_COMMIT_FAILED };
  }
}

export function buildGuardianFortuneLimitCta(errorCode, isLoggedIn) {
  if (!isLoggedIn || errorCode === GUARDIAN_FORTUNE_ERROR_CODES.GUEST_LIMIT_EXCEEDED) {
    return { label: "로그인하고 하루 최대 3회 보기", targetPath: "/auth/login", reason: "로그인하면 하루 최대 3번까지 연이와 네오에게 물어볼 수 있어요." };
  }
  return { label: "대화권 보기", targetPath: "/points", reason: "무료 상담을 모두 사용한 뒤 보유 대화권으로 더 물어볼 수 있어요." };
}

export function isValidGuardianFortuneRequestId(requestId) {
  return Boolean(assertRequestId(requestId));
}

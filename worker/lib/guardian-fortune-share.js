import { GuardianFortuneSharedSnapshot } from "./models.js";
import {
  getDefaultCta,
  getTopicCtas,
  isAllowedCta,
} from "./guardian-fortune-runtime-contract.js";

export const GUARDIAN_FORTUNE_SHARE_TOKEN_VERSION = 1;
export const GUARDIAN_FORTUNE_SHARE_TOKEN_TTL_MS = 10 * 60 * 1000;
export const GUARDIAN_FORTUNE_SHARE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const GUARDIAN_FORTUNE_SHARE_ID_PREFIX = "gf_";

const SHARE_ID_PATTERN = /^gf_[A-Za-z0-9_-]{24,80}$/;
const SHARE_RESULT_TEXT_LIMITS = Object.freeze({
  title: 160,
  openingLine: 1200,
  innerState: 2400,
  coreReading: 3200,
  topicAdvice: 3200,
  cautionPattern: 1800,
  luckyAction: 1400,
  shareText: 320,
  ctaReason: 1000,
});
const SHARE_RESULT_FIELDS = Object.freeze([
  "title",
  "openingLine",
  "innerState",
  "coreReading",
  "topicAdvice",
  "cautionPattern",
  "luckyAction",
  "premiumCta",
  "shareText",
]);
const VALID_MODES = new Set(["yeoni", "neo"]);
const VALID_TOPICS = new Set(["daily", "love", "money_work", "relationship", "mind", "decision"]);
const SENSITIVE_PATTERNS = Object.freeze([
  /\b\d{6}[- ]?\d{7}\b/,
  /\b\d{2,4}[- ]?\d{3,4}[- ]?\d{4}\b/,
  /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/,
  /(?:주민번호|주민등록|계좌번호|카드번호|비밀번호|password)/i,
]);

function asString(value, limit) {
  return String(value == null ? "" : value)
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
    .slice(0, limit);
}

function hasSensitiveText(value) {
  if (typeof value !== "string") return false;
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(value));
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function stringToBase64Url(value) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlToString(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function signTokenBody(body, secret) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("GUARDIAN_FORTUNE_SHARE_CRYPTO_UNAVAILABLE");
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function signaturesMatch(expected, actual) {
  const left = String(expected || "");
  const right = String(actual || "");
  if (!left || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function getShareSecret(env = {}) {
  return String(env.GUARDIAN_FORTUNE_SHARE_SECRET || "").trim();
}

export function isGuardianFortuneShareEnabled(env = {}) {
  return String(env.ENABLE_GUARDIAN_FORTUNE_SHARE || "").toLowerCase() === "true";
}

export function isValidGuardianFortuneShareId(shareId) {
  return SHARE_ID_PATTERN.test(String(shareId || ""));
}

export function createGuardianFortuneShareId() {
  const bytes = new Uint8Array(18);
  globalThis.crypto.getRandomValues(bytes);
  return `${GUARDIAN_FORTUNE_SHARE_ID_PREFIX}${bytesToBase64Url(bytes)}`;
}

function projectPremiumCta(topic, cta) {
  const candidates = getTopicCtas(topic);
  const selected = isAllowedCta(topic, cta)
    ? candidates.find((candidate) => candidate.ctaKey === cta.ctaKey && candidate.targetPath === cta.targetPath)
    : getDefaultCta(topic);
  if (!selected) return undefined;
  return {
    ctaKey: String(selected.ctaKey),
    label: asString(selected.label, 120),
    targetPath: String(selected.targetPath),
    reason: asString(cta?.reason, SHARE_RESULT_TEXT_LIMITS.ctaReason),
  };
}

export function projectGuardianFortuneShareResult(result, { topic } = {}) {
  if (!isRecord(result) || !VALID_TOPICS.has(String(topic || ""))) return null;
  const projected = {
    title: asString(result.title, SHARE_RESULT_TEXT_LIMITS.title),
    openingLine: asString(result.openingLine, SHARE_RESULT_TEXT_LIMITS.openingLine),
    innerState: asString(result.innerState, SHARE_RESULT_TEXT_LIMITS.innerState),
    coreReading: asString(result.coreReading, SHARE_RESULT_TEXT_LIMITS.coreReading),
    topicAdvice: asString(result.topicAdvice, SHARE_RESULT_TEXT_LIMITS.topicAdvice),
    cautionPattern: asString(result.cautionPattern, SHARE_RESULT_TEXT_LIMITS.cautionPattern),
    luckyAction: asString(result.luckyAction, SHARE_RESULT_TEXT_LIMITS.luckyAction),
    premiumCta: projectPremiumCta(topic, result.premiumCta),
    shareText: asString(result.shareText, SHARE_RESULT_TEXT_LIMITS.shareText),
  };
  if (hasSensitiveText(JSON.stringify(projected))) return null;
  if (SHARE_RESULT_FIELDS.some((field) => field !== "premiumCta" && !projected[field])) return null;
  return projected;
}

export async function createGuardianFortuneShareDraftToken({
  env = {},
  requestId,
  mode,
  topic,
  locale = "ko-KR",
  result,
  now = new Date(),
} = {}) {
  const secret = getShareSecret(env);
  if (!isGuardianFortuneShareEnabled(env) || !secret || !String(requestId || "").trim()) return undefined;
  if (!VALID_MODES.has(String(mode || "")) || !VALID_TOPICS.has(String(topic || ""))) return undefined;
  const shareSafeResult = projectGuardianFortuneShareResult(result, { topic });
  if (!shareSafeResult) return undefined;
  const issuedAt = new Date(now).getTime();
  const expiresAt = issuedAt + GUARDIAN_FORTUNE_SHARE_TOKEN_TTL_MS;
  const payload = {
    version: GUARDIAN_FORTUNE_SHARE_TOKEN_VERSION,
    requestId: String(requestId).slice(0, 120),
    mode: String(mode),
    topic: String(topic),
    locale: String(locale || "ko-KR"),
    result: shareSafeResult,
    issuedAt,
    expiresAt,
  };
  const body = stringToBase64Url(JSON.stringify(payload));
  const signature = await signTokenBody(body, secret);
  return `${body}.${signature}`;
}

export async function verifyGuardianFortuneShareDraftToken(token, { env = {}, now = new Date() } = {}) {
  const secret = getShareSecret(env);
  const parts = String(token || "").split(".");
  if (!secret || parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, errorCode: "GUARDIAN_FORTUNE_SHARE_TOKEN_INVALID" };
  try {
    const expected = await signTokenBody(parts[0], secret);
    if (!(await signaturesMatch(expected, parts[1]))) return { ok: false, errorCode: "GUARDIAN_FORTUNE_SHARE_TOKEN_INVALID" };
    const payload = JSON.parse(base64UrlToString(parts[0]));
    if (payload.version !== GUARDIAN_FORTUNE_SHARE_TOKEN_VERSION) throw new Error("version");
    if (!VALID_MODES.has(payload.mode) || !VALID_TOPICS.has(payload.topic)) throw new Error("scope");
    if (!Number.isFinite(payload.expiresAt) || payload.expiresAt <= new Date(now).getTime()) {
      return { ok: false, errorCode: "GUARDIAN_FORTUNE_SHARE_TOKEN_EXPIRED" };
    }
    const result = projectGuardianFortuneShareResult(payload.result, { topic: payload.topic });
    if (!result) throw new Error("result");
    return { ok: true, payload: { version: payload.version, requestId: String(payload.requestId || "").slice(0, 120), mode: payload.mode, topic: payload.topic, locale: String(payload.locale || "ko-KR"), result, issuedAt: payload.issuedAt, expiresAt: payload.expiresAt } };
  } catch {
    return { ok: false, errorCode: "GUARDIAN_FORTUNE_SHARE_TOKEN_INVALID" };
  }
}

function toIso(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function toPublicGuardianFortuneSnapshot(record) {
  if (!record) return null;
  const value = typeof record.toObject === "function" ? record.toObject() : record;
  return {
    shareId: String(value.shareId),
    mode: String(value.mode),
    topic: String(value.topic),
    title: String(value.title),
    openingLine: String(value.openingLine),
    innerState: String(value.innerState),
    coreReading: String(value.coreReading),
    topicAdvice: String(value.topicAdvice),
    cautionPattern: String(value.cautionPattern),
    luckyAction: String(value.luckyAction),
    ...(value.premiumCta ? { premiumCta: { ...value.premiumCta } } : {}),
    shareText: String(value.shareText),
    createdAt: toIso(value.createdAt),
    ...(value.expiresAt ? { expiresAt: toIso(value.expiresAt) } : {}),
    locale: String(value.locale || "ko-KR"),
  };
}

export function buildGuardianFortuneShareUrl({ shareId, requestUrl, env = {} } = {}) {
  const configuredOrigin = String(env.PUBLIC_SITE_URL || env.SITE_URL || "").trim().replace(/\/+$/, "");
  const origin = configuredOrigin || new URL(requestUrl).origin;
  return `${origin}/fortune/share/?shareId=${encodeURIComponent(String(shareId))}`;
}

export async function createGuardianFortuneShareSnapshot({ draft, requestUrl, env = {}, now = new Date(), model = GuardianFortuneSharedSnapshot } = {}) {
  if (!draft?.requestId || !model) throw new Error("GUARDIAN_FORTUNE_SHARE_STORAGE_UNAVAILABLE");
  const existing = await model.findOne({ sourceRequestId: draft.requestId, status: "active" }).lean();
  const existingExpiry = existing?.expiresAt ? new Date(existing.expiresAt).getTime() : 0;
  if (existing && existingExpiry > new Date(now).getTime()) {
    return { snapshot: toPublicGuardianFortuneSnapshot(existing), shareUrl: buildGuardianFortuneShareUrl({ shareId: existing.shareId, requestUrl, env }), reused: true };
  }

  const createdAt = new Date(now);
  const expiresAt = new Date(createdAt.getTime() + GUARDIAN_FORTUNE_SHARE_TTL_MS);
  const safeResult = projectGuardianFortuneShareResult(draft.result, { topic: draft.topic });
  if (!safeResult) throw new Error("GUARDIAN_FORTUNE_SHARE_RESULT_INVALID");
  const base = { mode: draft.mode, topic: draft.topic, ...safeResult, locale: draft.locale || "ko-KR", createdAt, expiresAt, status: "active", sourceRequestId: draft.requestId };

  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const record = await model.create({ shareId: createGuardianFortuneShareId(), ...base });
      const snapshot = toPublicGuardianFortuneSnapshot(record);
      return { snapshot, shareUrl: buildGuardianFortuneShareUrl({ shareId: snapshot.shareId, requestUrl, env }), reused: false };
    } catch (error) {
      lastError = error;
      if (error?.code !== 11000) throw error;
    }
  }
  throw lastError || new Error("GUARDIAN_FORTUNE_SHARE_ID_COLLISION");
}

export async function findPublicGuardianFortuneSnapshot({ shareId, now = new Date(), model = GuardianFortuneSharedSnapshot } = {}) {
  if (!isValidGuardianFortuneShareId(shareId) || !model) return null;
  const record = await model.findOne({ shareId: String(shareId), status: "active" }).lean();
  if (!record || (record.expiresAt && new Date(record.expiresAt).getTime() <= new Date(now).getTime())) return null;
  return toPublicGuardianFortuneSnapshot(record);
}

export const GUARDIAN_FORTUNE_SHARE_RESULT_FIELDS = SHARE_RESULT_FIELDS;

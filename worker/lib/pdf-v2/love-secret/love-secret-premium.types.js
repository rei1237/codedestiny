export const LOVE_SECRET_LLM_VERSION = "2026-06-love-secret-llm-v1";
export const LOVE_SECRET_PREMIUM_ENGINE_VERSION = LOVE_SECRET_LLM_VERSION;
export const LOVE_SECRET_PREMIUM_QUALITY_VERSION = "love-secret-llm-only-chapter-lock-v1";
export const LOVE_SECRET_PREMIUM_REPORT_TYPE = "loveSecret";
export const LOVE_SECRET_PREMIUM_SERVICE_KEY = "saju-love-secret";
export const LOVE_SECRET_PREMIUM_FEATURE_KEY = "premium_pdf_saju_love_secret";
export const LOVE_SECRET_PREMIUM_COMPAT_FEATURE_KEY = "premium_pdf_saju_love_secret_compat";

const SOLO_MODE_ALIASES = new Set(["solo", "single", "alone"]);
const COMPATIBILITY_MODE_ALIASES = new Set(["compatibility", "compat", "couple", "pair", "match"]);

export function normalizeLoveSecretMode(rawMode, { allowDefault = false } = {}) {
  const mode = clean(rawMode).toLowerCase();
  if (!mode && allowDefault) return "solo";
  if (SOLO_MODE_ALIASES.has(mode)) return "solo";
  if (COMPATIBILITY_MODE_ALIASES.has(mode)) return "compatibility";
  const error = new Error(`Invalid love secret mode: ${clean(rawMode) || "(empty)"}`);
  error.code = "LOVE_SECRET_INVALID_MODE";
  error.status = 400;
  throw error;
}

export function clean(value, limit = 0) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return limit > 0 ? text.slice(0, limit) : text;
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function stripTags(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function compactObject(value) {
  if (Array.isArray(value)) {
    return value.map(compactObject).filter((item) => item !== undefined);
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) return undefined;
    return value === undefined || value === null || value === "" ? undefined : value;
  }
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    const next = compactObject(item);
    if (next !== undefined && !(Array.isArray(next) && next.length === 0)) output[key] = next;
  }
  return output;
}

export function stableStringify(value) {
  const seen = new WeakSet();
  return JSON.stringify(value, function stableReplacer(key, item) {
    if (typeof item === "number" && !Number.isFinite(item)) return null;
    if (item === undefined) return null;
    if (!item || typeof item !== "object") return item;
    if (seen.has(item)) return "[Circular]";
    seen.add(item);
    if (Array.isArray(item)) return item;
    return Object.keys(item).sort().reduce((acc, objectKey) => {
      acc[objectKey] = item[objectKey];
      return acc;
    }, {});
  });
}

export function hashStable(value) {
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function withLoveSecretArchiveFormat(url, format = "pdf") {
  const value = clean(url);
  const target = clean(format) || "pdf";
  if (!value || !/\/api\/premium\/pdf-archive\//.test(value)) return value;
  if (/[?&]format=/i.test(value)) return value.replace(/([?&]format=)[^&]+/i, `$1${encodeURIComponent(target)}`);
  return `${value}${value.includes("?") ? "&" : "?"}format=${encodeURIComponent(target)}`;
}

export function logLoveSecretPdfEvent(event, data = {}) {
  const payload = {
    jobId: clean(data.jobId || data.reportId, 160) || undefined,
    userId: clean(data.userId, 120) || undefined,
    chapterId: clean(data.chapterId, 80) || undefined,
    status: clean(data.status, 80) || undefined,
    source: clean(data.source, 80) || undefined,
    provider: clean(data.provider, 80) || undefined,
    modelName: clean(data.modelName, 120) || undefined,
    promptVersion: clean(data.promptVersion, 80) || undefined,
    chapterPlanVersion: clean(data.chapterPlanVersion, 80) || undefined,
    durationMs: Number.isFinite(Number(data.durationMs)) ? Number(data.durationMs) : undefined,
    errorCode: clean(data.errorCode, 120) || undefined,
    errorMessage: clean(data.errorMessage, 300) || undefined,
  };
  try {
    console.info(`[LoveSecretPremiumPDF][${event}]`, payload);
  } catch (_) {}
}

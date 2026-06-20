export const LIFE_BOOK_PREMIUM_ENGINE_VERSION = "pdf-v3-llm-only";
export const LIFE_BOOK_PREMIUM_QUALITY_VERSION = "life-book-no-local-v1";
export const LIFE_BOOK_PREMIUM_REPORT_TYPE = "lifeBook";
export const LIFE_BOOK_PREMIUM_SERVICE_KEY = "saju-lifebook";
export const LIFE_BOOK_PREMIUM_FEATURE_KEY = "saju_life_book_pdf";
export const LIFE_BOOK_PREMIUM_MANUSCRIPT_SOURCE = "life-book-llm-v1";
export const LIFE_BOOK_PREMIUM_WRITING_PIPELINE = "saju-calculation-to-llm-authored-pdf";

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

export function withLifeBookArchiveFormat(url, format = "pdf") {
  const value = clean(url);
  const target = clean(format) || "pdf";
  if (!value || !/\/api\/premium\/pdf-archive\//.test(value)) return value;
  if (/[?&]format=/i.test(value)) return value.replace(/([?&]format=)[^&]+/i, `$1${encodeURIComponent(target)}`);
  return `${value}${value.includes("?") ? "&" : "?"}format=${encodeURIComponent(target)}`;
}

export function buildLifeBookLlmAssembly(chapterCount = 13, expectedChapterCount = 13) {
  const actualCount = Number.isFinite(Number(chapterCount)) ? Number(chapterCount) : 0;
  const plannedCount = Number.isFinite(Number(expectedChapterCount)) ? Number(expectedChapterCount) : 13;
  return {
    enabled: true,
    externalGeneration: true,
    fallbackUsed: false,
    chapterCount: actualCount,
    expectedChapterCount: plannedCount,
  };
}

export function logLifeBookPdfEvent(event, data = {}) {
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
    console.info(`[LifeBookPremiumPDF][${event}]`, payload);
  } catch (_) {}
}

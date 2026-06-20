export const SOUL_ORIGIN_LLM_ENGINE_VERSION = "soul-origin-llm-json-v1";
export const SOUL_ORIGIN_LLM_SCHEMA_VERSION = "DestinyKarmaPdfResult.v2";
export const SOUL_ORIGIN_LLM_QUALITY_VERSION = "soul-origin-quality-v1";
export const SOUL_ORIGIN_LLM_PROMPT_FAMILY = "destiny-karma-pdf";
export const SOUL_ORIGIN_LLM_MANUSCRIPT_SOURCE = "llm-authored";
export const SOUL_ORIGIN_LLM_PROVIDER = "gemini";
export const SOUL_ORIGIN_LLM_WRITING_PIPELINE = "soul-origin-calculation-to-llm-authored-pdf";

export function clean(value, limit = 0) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return limit > 0 ? text.slice(0, limit) : text;
}

export function cleanMultiline(value, limit = 0) {
  const text = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return limit > 0 ? text.slice(0, limit) : text;
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function stripTags(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

export function buildSoulOriginLlmAssembly(chapterCount = 12) {
  return {
    enabled: true,
    externalGeneration: true,
    fallbackUsed: false,
    chapterCount,
    expectedChapterCount: chapterCount,
  };
}

export function logSoulOriginPdfEvent(event, data = {}) {
  const payload = {
    jobId: clean(data.jobId || data.reportId, 160) || undefined,
    userId: clean(data.userId, 120) || undefined,
    chapterId: clean(data.chapterId, 80) || undefined,
    status: clean(data.status, 80) || undefined,
    source: clean(data.source, 80) || undefined,
    provider: clean(data.provider, 80) || undefined,
    modelName: clean(data.modelName, 120) || undefined,
    promptVersion: clean(data.promptVersion, 80) || undefined,
    schemaVersion: clean(data.schemaVersion, 80) || undefined,
    durationMs: Number.isFinite(Number(data.durationMs)) ? Number(data.durationMs) : undefined,
    errorCode: clean(data.errorCode, 120) || undefined,
    errorMessage: clean(data.errorMessage, 300) || undefined,
  };
  try {
    console.info(`[SoulOriginLLMPDF][${event}]`, payload);
  } catch (_) {}
}

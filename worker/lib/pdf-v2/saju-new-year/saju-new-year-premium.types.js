export const SAJU_NEW_YEAR_LLM_PROMPT_VERSION = "saju-new-year-llm-prompt.v1";
export const SAJU_NEW_YEAR_LLM_SCHEMA_VERSION = "saju-new-year-llm-json.v1";
export const SAJU_NEW_YEAR_LLM_ENGINE_VERSION = "worker-saju-new-year-engine.v1";
export const SAJU_NEW_YEAR_LLM_QUALITY_VERSION = "saju-new-year-llm-quality.v1";
export const SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE = "saju-new-year-llm-only";
export const SAJU_NEW_YEAR_LLM_GENERATION_MODE = "pdf-v3-llm-only";

export function clean(value, maxLength = 50000) {
  const text = String(value == null ? "" : value)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const max = Number(maxLength || 0);
  return max > 0 && text.length > max ? text.slice(0, max).trim() : text;
}

export function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

export function hashStable(value) {
  const input = stableStringify(value);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(36)}${(h1 >>> 0).toString(36)}`;
}

export function stripJsonFence(value = "") {
  return clean(value, 300000)
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

export function parseJsonStrict(value = "") {
  const text = stripJsonFence(value);
  if (!text) {
    const error = new Error("SAJU_NEW_YEAR_LLM_EMPTY_JSON");
    error.code = "SAJU_NEW_YEAR_LLM_EMPTY_JSON";
    throw error;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(text.slice(first, last + 1));
      } catch (_) {}
    }
    error.code = "SAJU_NEW_YEAR_LLM_JSON_PARSE_FAILED";
    throw error;
  }
}

export class SajuNewYearLlmGenerationError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "SajuNewYearLlmGenerationError";
    this.code = clean(options.code || "SAJU_NEW_YEAR_LLM_GENERATION_FAILED");
    this.status = Number(options.status || 503);
    this.stage = clean(options.stage || "saju-new-year-llm");
    this.issues = Array.isArray(options.issues) ? options.issues.map((item) => clean(item, 300)).filter(Boolean) : [];
    this.attempts = Array.isArray(options.attempts) ? options.attempts : [];
    this.cause = options.cause;
  }
}

export function logSajuNewYearLlmEvent(eventName, payload = {}) {
  console.info(`[SajuNewYearPremiumPDF][${eventName}]`, payload);
}

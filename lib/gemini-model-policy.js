/** Server-owned routing: prose stays inexpensive; only named synthesis steps use Pro. */
export const GEMINI_PRO_MODEL = "gemini-2.5-pro";
export const GEMINI_PROSE_MODEL = "gemini-2.5-flash";
/**
 * Every Pro task says how it still delivers when Pro refuses: the same prompt on fallbackModel.
 * A task missing here never reaches Pro. minCallMs is the shortest optional Pro call worth starting.
 */
export const PRO_TASK_POLICY = Object.freeze({
  "fusion-integration": Object.freeze({ fallbackModel: GEMINI_PROSE_MODEL }),
  "fusion-verdict": Object.freeze({ fallbackModel: GEMINI_PROSE_MODEL }),
  "tuna-synthesis": Object.freeze({ fallbackModel: GEMINI_PROSE_MODEL, minCallMs: 120000 }),
});
const PRO_TASKS = new Set(Object.keys(PRO_TASK_POLICY));
export const isGeminiProModel = model => /(?:^|\/)gemini-[\w.-]*pro(?:[-.]|$)/i.test(String(model || ""));

export function selectGeminiModel(requested, reasoningTask) {
  if (PRO_TASKS.has(reasoningTask)) return GEMINI_PRO_MODEL;
  const model = String(requested || GEMINI_PROSE_MODEL).trim() || GEMINI_PROSE_MODEL;
  return isGeminiProModel(model) ? GEMINI_PROSE_MODEL : model;
}

// 2026-10-30: gemini-2.5-pro answered 404 (retired for this project) and paid orders stalled on it.
// A retired model, 429 and 5xx are refused before generation; a timeout is reported so callers can move on.
const PRO_FALLBACK_CODES = new Set(["GEMINI_MODEL_UNAVAILABLE", "GEMINI_RATE_LIMITED", "GEMINI_UNAVAILABLE"]);
export function proFallbackCause(model, response) {
  if (response?.ok || !isGeminiProModel(model)) return "";
  if (PRO_FALLBACK_CODES.has(response?.providerCode)) return response.providerCode;
  return response?.error === "LLM_GENERATION_TIMEOUT" ? "LLM_GENERATION_TIMEOUT" : "";
}

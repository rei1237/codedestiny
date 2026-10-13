/** Server-owned routing: prose stays inexpensive; only named synthesis steps use Pro. */
export const GEMINI_PRO_MODEL = "gemini-2.5-pro";
export const GEMINI_PROSE_MODEL = "gemini-2.5-flash";
const PRO_TASKS = new Set(["fusion-integration", "fusion-verdict", "tuna-synthesis"]);

export function selectGeminiModel(requested, reasoningTask) {
  if (PRO_TASKS.has(reasoningTask)) return GEMINI_PRO_MODEL;
  const model = String(requested || GEMINI_PROSE_MODEL).trim() || GEMINI_PROSE_MODEL;
  return /(?:^|\/)gemini-[\w.-]*pro(?:[-.]|$)/i.test(model) ? GEMINI_PROSE_MODEL : model;
}

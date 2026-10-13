import { selectGeminiModel, GEMINI_PROSE_MODEL } from "./gemini-model-policy.js";
/** Shared editorial contract. Calculation/entitlement versions remain independent. */
export const FUSION_PREMIUM_VERSION = "fusion-premium.v1";
export const FUSION_PREMIUM_MODEL = GEMINI_PROSE_MODEL;
export const fusionReasoningTask = group => ({ integration: "fusion-integration", verdict: "fusion-verdict" })[group.id];
export const fusionGroupModel = group => selectGeminiModel(FUSION_PREMIUM_MODEL, fusionReasoningTask(group));
export const FUSION_PREMIUM_THINKING = 4096;
export const FUSION_PREMIUM_LENGTH = Object.freeze({ min: 36000, targetMin: 45000, targetMax: 60000 });
export const FUSION_PREMIUM_TARGETS = Object.freeze({
  openingMessage: 400, executiveSummary: 1600,
  sajuSection: 5000, ziweiSection: 5000, vedicSection: 5000,
  sukuyoSection: 5000, astrologySection: 5000, tarotSection: 5000,
  integratedReading: 8000, timingAndAction: 6000, finalVerdict: 4000, closingMessage: 1000,
});
export const FUSION_ART_KEYS = Object.freeze(["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot", "fusion", "action", "choice"]);
export const isPremiumFusion = value => value?.reportVersion === FUSION_PREMIUM_VERSION;
export const fusionParagraphs = section => String(section?.content || "").split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

/** Ranges point into the one canonical content string; no duplicate paid prose. */
export function fusionSubchapters(section) {
  const paragraphs = fusionParagraphs(section);
  const chapters = section?.subchapters;
  if (!Array.isArray(chapters) || !chapters.length) return [];
  let cursor = 0;
  const valid = chapters.every(c => typeof c.title === "string" && c.title.trim()
    && Number.isInteger(c.start) && Number.isInteger(c.end)
    && c.start === cursor && c.end > c.start && c.end <= paragraphs.length && (cursor = c.end));
  if (!valid || cursor !== paragraphs.length) return [];
  return chapters.map(c => ({ ...c, paragraphs: paragraphs.slice(c.start, c.end) }));
}

export function validFusionConsultationPlan(plan) {
  return plan?.version === FUSION_PREMIUM_VERSION && typeof plan.question === "string" && plan.question.trim().length > 0
    && Array.isArray(plan.questions) && plan.questions.length >= 3 && plan.questions.length <= 5
    && plan.questions.every((q, i) => q.id === `q${i + 1}` && typeof q.title === "string" && q.title.trim().length > 0);
}

export function premiumGroupTarget(group) {
  return group.keys.reduce((sum, key) => sum + (FUSION_PREMIUM_TARGETS[key] || 0), 0);
}

export function premiumFusionBody(result) {
  return [result.openingMessage, result.executiveSummary,
    ...["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot"].map(key => result[`${key}Section`]?.content),
    result.integratedReading?.content, result.timingAndAction?.content,
    result.finalVerdict?.rationale, result.closingMessage].filter(Boolean).join("\n\n");
}

/** Numeric range formatting is repairable without rewriting or dropping paid prose. */
export function normalizeFusionSubchapters(section) {
  if (fusionSubchapters(section).length || !Array.isArray(section?.subchapters)) return section;
  const chapters = section.subchapters;
  const total = fusionParagraphs(section).length;
  if (chapters.length < 4 || chapters.length > 6 || total < chapters.length) return section;
  return { ...section, subchapters: chapters.map((chapter, index) => ({ ...chapter,
    start: Math.floor(index * total / chapters.length), end: Math.floor((index + 1) * total / chapters.length),
  })) };
}

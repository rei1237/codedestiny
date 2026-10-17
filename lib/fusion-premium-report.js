import { selectGeminiModel, GEMINI_PROSE_MODEL } from "./gemini-model-policy.js";
/** Shared editorial contract. Calculation/entitlement versions remain independent. */
export const FUSION_PREMIUM_VERSION = "fusion-premium.v1";
/** v2 = 체계 6장 + 영역별 8장(마스터 화자). 상담 계획(consultationPlan.version)은 형식 계약이라 v1 값을 그대로 쓴다. */
export const FUSION_PREMIUM_V2 = "fusion-premium.v2";
export const FUSION_PREMIUM_VERSIONS = Object.freeze([FUSION_PREMIUM_VERSION, FUSION_PREMIUM_V2]);
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
/** 영역별 장: 한 그룹(=한 마스터 화자)이 한두 장을 쓴다. 무성은 10대 중반이라 연애·결혼·건강 장을 맡지 않는다. */
export const FUSION_DOMAIN_CHAPTERS = Object.freeze([
  { key: "natureSection", id: "nature", label: "타고난 성향", narrator: "musung", group: "domainMusung", target: 4000 },
  { key: "lifeCycleSection", id: "lifeCycle", label: "인생의 시기", narrator: "yun", group: "domainYun", target: 3500 },
  { key: "loveSection", id: "love", label: "연애", narrator: "yeoni", group: "domainYeoni", target: 4000 },
  { key: "marriageSection", id: "marriage", label: "결혼·배우자", narrator: "hanbi", group: "domainHanbi", target: 3500 },
  { key: "wealthSection", id: "wealth", label: "재물", narrator: "neo", group: "domainNeo", target: 3500 },
  { key: "careerSection", id: "career", label: "직업·일", narrator: "neo", group: "domainNeo", target: 3500 },
  { key: "healthSection", id: "health", label: "건강·생활 리듬", narrator: "yun", group: "domainYun", target: 3000 },
  { key: "relationsSection", id: "relations", label: "인간관계", narrator: "hanbi", group: "domainHanbi", target: 3500 },
].map(chapter => Object.freeze(chapter)));
export const FUSION_DOMAIN_KEYS = Object.freeze(FUSION_DOMAIN_CHAPTERS.map(chapter => chapter.key));
export const FUSION_DOMAIN_ART_KEYS = Object.freeze(FUSION_DOMAIN_CHAPTERS.map(chapter => chapter.id));
/**
 * v2 장별 화자. 여기 없는 키(서두·종합·판정·맺음·요약)는 중립적인 초융합 상담자가 쓴다.
 * 서버 프롬프트(화자 지시)와 결과 화면(화자 이름표)이 같은 표를 본다.
 * 🔴 무성은 미성년 캐릭터라 연애·결혼·건강 장을 맡기지 않는다(자미두수·타고난 성향만).
 */
export const FUSION_NARRATOR_BY_KEY = Object.freeze({
  sajuSection: "neo", ziweiSection: "musung", sukuyoSection: "hanbi", vedicSection: "yun", astrologySection: "yun", tarotSection: "yeoni",
  timingAndAction: "neo",
  ...Object.fromEntries(FUSION_DOMAIN_CHAPTERS.map(chapter => [chapter.key, chapter.narrator])),
});
export const FUSION_PREMIUM_LENGTH_V2 = Object.freeze({ min: 48000, targetMin: 60000, targetMax: 80000 });
export const FUSION_PREMIUM_TARGETS_V2 = Object.freeze({
  openingMessage: 400, executiveSummary: 1600,
  sajuSection: 4000, ziweiSection: 4000, vedicSection: 4000,
  sukuyoSection: 4000, astrologySection: 4000, tarotSection: 4000,
  integratedReading: 7000, timingAndAction: 5000, finalVerdict: 3500, closingMessage: 800,
  ...Object.fromEntries(FUSION_DOMAIN_CHAPTERS.map(chapter => [chapter.key, chapter.target])),
});
export const isPremiumFusion = value => FUSION_PREMIUM_VERSIONS.includes(value?.reportVersion);
export const isDomainFusion = value => value?.reportVersion === FUSION_PREMIUM_V2;
export const premiumTargetsFor = value => isDomainFusion(value) ? FUSION_PREMIUM_TARGETS_V2 : FUSION_PREMIUM_TARGETS;
export const premiumLengthFor = value => isDomainFusion(value) ? FUSION_PREMIUM_LENGTH_V2 : FUSION_PREMIUM_LENGTH;
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

export function premiumGroupTarget(group, value) {
  const targets = premiumTargetsFor(value);
  return group.keys.reduce((sum, key) => sum + (targets[key] || 0), 0);
}

export function premiumFusionBody(result) {
  return [result.openingMessage, result.executiveSummary,
    ...["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot"].map(key => result[`${key}Section`]?.content),
    result.integratedReading?.content, ...FUSION_DOMAIN_KEYS.map(key => result[key]?.content), result.timingAndAction?.content,
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

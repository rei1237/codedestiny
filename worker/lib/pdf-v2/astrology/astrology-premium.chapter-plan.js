import {
  ASTROLOGY_CHAPTER_CONFIG_VERSION,
  ASTROLOGY_DEFAULT_CHAPTERS,
  astrologyPublicChapters,
  normalizeChapterPlan,
} from "./astrology-chapters.js";
import { asArray, clean } from "./astrology-premium.types.js";

export const ASTROLOGY_PREMIUM_CHAPTER_PLAN_VERSION = ASTROLOGY_CHAPTER_CONFIG_VERSION;

const plan = normalizeChapterPlan(ASTROLOGY_DEFAULT_CHAPTERS, {
  source: "default-15",
  version: ASTROLOGY_CHAPTER_CONFIG_VERSION,
  expectedCount: 15,
  defaultPlan: true,
});

const chapters = Object.freeze(plan.chapters.map((chapter) => Object.freeze({
  ...chapter,
  required: true,
  minLength: 700,
  sections: Object.freeze(["핵심 요약", "차트 기반 해석", "별자리 처방"]),
  groundingTerms: Object.freeze(asArray(chapter.groundingTerms).length
    ? asArray(chapter.groundingTerms)
    : ["점성술", "출생 차트", "행성", "하우스", "어스펙트", "트랜짓"]),
})));

export const astrologyPremiumChapterPlanV2 = Object.freeze({
  version: ASTROLOGY_PREMIUM_CHAPTER_PLAN_VERSION,
  serviceType: "astrology-premium",
  language: "ko",
  source: "default-15",
  chapters,
});

export const astrologyPremiumPublicChapters = astrologyPublicChapters;

export function assertAstrologyPremiumChapterPlan(currentPlan = astrologyPremiumChapterPlanV2) {
  const currentChapters = asArray(currentPlan.chapters);
  if (!currentChapters.length) {
    throw Object.assign(new Error("ASTROLOGY_CHAPTER_PLAN_EMPTY"), {
      code: "ASTROLOGY_CHAPTER_PLAN_EMPTY",
      status: 500,
    });
  }
  for (const chapter of currentChapters) {
    if (!clean(chapter.id) || !clean(chapter.title) || !clean(chapter.category)) {
      throw Object.assign(new Error(`ASTROLOGY_CHAPTER_INVALID:${clean(chapter.id)}`), {
        code: "ASTROLOGY_CHAPTER_INVALID",
        status: 500,
        chapterId: clean(chapter.id),
      });
    }
  }
  return true;
}

assertAstrologyPremiumChapterPlan();

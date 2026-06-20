import { VEDIC_PREMIUM_CHAPTERS } from "../../vedic-premium-chapters.js";
import { asArray, clean } from "./vedic-premium.types.js";

export const VEDIC_PREMIUM_CHAPTER_PLAN_VERSION = "2026-vedic-chapter-plan-v1";

export const vedicPremiumChapterPlanV2 = Object.freeze({
  version: VEDIC_PREMIUM_CHAPTER_PLAN_VERSION,
  serviceType: "vedic-premium",
  language: "ko",
  chapters: Object.freeze(asArray(VEDIC_PREMIUM_CHAPTERS).map((chapter, index) => Object.freeze({
    id: clean(chapter.id || `vedic_ch_${index + 1}`),
    order: Number(chapter.order || chapter.num || index + 1),
    title: clean(chapter.title || `제 ${index + 1}장`),
    purpose: clean(chapter.subtitle || chapter.purpose || "베다점 계산 결과를 유료 리포트 문장으로 해석한다."),
    sections: Object.freeze(asArray(chapter.categories).map((section) => clean(section.title)).filter(Boolean)),
    required: true,
    minLength: 1800,
  }))),
});

export function assertVedicPremiumChapterPlan(plan = vedicPremiumChapterPlanV2) {
  if (!asArray(plan.chapters).length) {
    throw Object.assign(new Error("VEDIC_CHAPTER_PLAN_EMPTY"), { code: "VEDIC_CHAPTER_PLAN_EMPTY", status: 500 });
  }
  for (const chapter of plan.chapters) {
    if (!clean(chapter.id) || !clean(chapter.title) || !asArray(chapter.sections).length) {
      throw Object.assign(new Error(`VEDIC_CHAPTER_INVALID:${clean(chapter.id)}`), {
        code: "VEDIC_CHAPTER_INVALID",
        status: 500,
        chapterId: clean(chapter.id),
      });
    }
  }
  return true;
}

assertVedicPremiumChapterPlan();

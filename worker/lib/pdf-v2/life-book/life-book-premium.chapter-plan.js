import { asArray, clean } from "./life-book-premium.types.js";
import {
  LIFE_BOOK_DEFAULT_CHAPTERS,
  LIFE_BOOK_LLM_VERSION,
  assertLifeBookChapterPlan,
  lifeBookPremiumChapterPlanV1,
} from "./life-book-chapters.js";

export { LIFE_BOOK_DEFAULT_CHAPTERS, LIFE_BOOK_LLM_VERSION, lifeBookPremiumChapterPlanV1 };

const chapterPlanContractVersion = "life-book-llm-section-contract-v1";

export function buildLifeBookPremiumChapterContract(plan = lifeBookPremiumChapterPlanV1) {
  const chapters = asArray(plan.chapters).map((chapter, index) => {
    const chapterId = clean(chapter.id);
    const sections = asArray(chapter.sections).map((section, sectionIndex) => ({
      chapterId,
      sectionId: `${chapterId}-${String(sectionIndex + 1).padStart(2, "0")}`,
      sectionTitle: clean(section),
      sectionIntent: clean(chapter.purpose || chapter.description || section, 240),
      sectionOrder: sectionIndex + 1,
    }));
    return {
      chapterId,
      chapterOrder: Number(chapter.order || index + 1),
      chapterTitle: clean(chapter.title),
      chapterCategory: clean(chapter.category),
      chapterPurpose: clean(chapter.purpose || chapter.description),
      sections,
      contractSections: sections.length,
    };
  });
  return Object.freeze({
    contractVersion: chapterPlanContractVersion,
    chapterPlanVersion: clean(plan.version || LIFE_BOOK_LLM_VERSION),
    language: clean(plan.language || "ko"),
    chapterCount: chapters.length,
    chapters: Object.freeze(chapters),
  });
}

export const LIFE_BOOK_PREMIUM_CHAPTER_CONTRACT = buildLifeBookPremiumChapterContract(lifeBookPremiumChapterPlanV1);

export function getLifeBookPremiumChapterContractByChapterId(chapterId, contract = LIFE_BOOK_PREMIUM_CHAPTER_CONTRACT) {
  const target = clean(chapterId);
  return asArray(contract.chapters).find((entry) => clean(entry.chapterId) === target) || null;
}

export function assertLifeBookPremiumChapterPlan(plan = lifeBookPremiumChapterPlanV1) {
  return assertLifeBookChapterPlan(asArray(plan.chapters), { requireDefaultIds: true });
}

import { asArray, clean, hashStable } from "./soul-origin-premium.types.js";
import { assertSoulOriginChapterPlan, soulOriginChapterPlanV1 } from "./soul-origin-premium.chapter-plan.js";

export const KARMA_SUPPORTED_SYSTEMS = Object.freeze([
  "saju",
  "vedic",
  "astrology",
  "numerology",
  "tarot",
  "ziwei",
  "sukuyo",
  "custom",
]);

const SYSTEM_SET = new Set(KARMA_SUPPORTED_SYSTEMS);

const chapterSystemOverrides = Object.freeze({
  "01": ["saju", "vedic", "astrology", "sukuyo"],
  "02": ["saju"],
  "03": ["saju", "vedic", "astrology", "sukuyo"],
  "04": ["saju", "vedic", "astrology"],
  "05": ["saju", "astrology"],
  "06": ["vedic", "astrology"],
  "07": ["saju", "vedic", "astrology"],
  "08": ["saju", "vedic", "astrology"],
  "09": ["saju", "vedic", "astrology", "sukuyo"],
  "10": ["saju", "vedic", "astrology"],
  "11": ["saju", "vedic", "astrology"],
  "12": ["saju", "vedic", "astrology", "sukuyo"],
});

function normalizeSystems(value) {
  return asArray(value)
    .map((item) => clean(item).toLowerCase())
    .filter((item, index, list) => SYSTEM_SET.has(item) && list.indexOf(item) === index);
}

export function inferKarmaSystemsFromChapter(chapter = {}) {
  const override = normalizeSystems(chapterSystemOverrides[clean(chapter.id)]);
  if (override.length) return override;

  const text = [
    chapter.category,
    chapter.title,
    chapter.purpose,
    chapter.description,
    ...asArray(chapter.requiredSections),
  ].join(" ");
  const systems = new Set();
  if (/사주|명리|원국|일간|오행|십성|대운|세운|시주|재물|직업|가족|건강|돈/.test(text)) systems.add("saju");
  if (/베다|라그나|나크샤트라|다샤|라후|케투|카르마|업/.test(text)) systems.add("vedic");
  if (/점성|행성|하우스|상승궁|어스펙트|트랜짓|무의식|마음|그림자|사랑|관계/.test(text)) systems.add("astrology");
  if (/숙요|인연|사랑|결혼|관계/.test(text)) systems.add("sukuyo");
  return Array.from(systems.size ? systems : new Set(["saju", "vedic", "astrology"]));
}

export function loadExistingKarmaChapterConfig({ plan = soulOriginChapterPlanV1, logger = console } = {}) {
  assertSoulOriginChapterPlan(plan);
  const inferred = [];
  const chapters = asArray(plan.chapters).map((chapter, index) => {
    const requiredSections = asArray(chapter.requiredSections).map((item) => clean(item)).filter(Boolean);
    const existingSystems = normalizeSystems(chapter.requiredSystems);
    const requiredSystems = existingSystems.length ? existingSystems : inferKarmaSystemsFromChapter(chapter);
    if (!existingSystems.length) {
      inferred.push({ chapterId: clean(chapter.id), requiredSystems });
    }
    return {
      id: clean(chapter.id),
      order: Number(chapter.order || chapter.chapterNumber || index + 1),
      chapterNumber: Number(chapter.chapterNumber || index + 1),
      category: clean(chapter.category) || requiredSections.join(" / ") || "운명의 업",
      categories: requiredSections,
      title: clean(chapter.title),
      description: clean(chapter.description || ""),
      purpose: clean(chapter.purpose || ""),
      requiredSystems,
      tone: clean(chapter.tone || "professional-mystical"),
      requiredKeywords: asArray(chapter.requiredKeywords).map((item) => clean(item)).filter(Boolean),
    };
  });

  if (inferred.length && logger?.info) {
    logger.info("[KarmaIntegrated][ChapterSystemsInferred]", {
      chapterConfigVersion: clean(plan.version),
      inferred,
    });
  }

  return {
    version: clean(plan.version || "soul-origin-chapter-plan-v1"),
    chapterConfigVersion: clean(plan.version || "soul-origin-chapter-plan-v1"),
    chapterConfigHash: hashStable({
      version: clean(plan.version),
      chapters: chapters.map((chapter) => ({
        id: chapter.id,
        order: chapter.order,
        title: chapter.title,
        category: chapter.category,
        categories: chapter.categories,
        requiredSystems: chapter.requiredSystems,
      })),
    }),
    chapters,
    inferredSystems: inferred,
  };
}

export function assertValidExistingChapterPlan(chapterPlan = {}) {
  const chapters = asArray(chapterPlan.chapters);
  if (!chapters.length) {
    throw Object.assign(new Error("KARMA_CHAPTER_PLAN_EMPTY"), {
      code: "KARMA_CHAPTER_PLAN_EMPTY",
      status: 500,
      failedStep: "validating",
    });
  }
  chapters.forEach((chapter, index) => {
    if (!chapter.id || !chapter.title || Number(chapter.order) !== index + 1) {
      throw Object.assign(new Error("KARMA_CHAPTER_PLAN_INVALID"), {
        code: "KARMA_CHAPTER_PLAN_INVALID",
        status: 500,
        failedStep: "validating",
        failedChapterId: clean(chapter.id),
      });
    }
  });
  return true;
}

import { asArray, clean } from "./astrology-premium.types.js";

export const ASTROLOGY_LLM_VERSION = "2026-06-astrology-llm-v1";
export const ASTROLOGY_CHAPTER_CONFIG_VERSION = "2026-06-astrology-default-12-v1";

export const ASTROLOGY_DEFAULT_CHAPTERS = Object.freeze([
  {
    id: "astro-01",
    category: "총론",
    title: "나의 별자리 지도 — 출생 차트가 말하는 인생의 큰 방향",
    purpose: "태양, 달, 상승궁, 주요 행성 분포를 바탕으로 전체 성향과 삶의 방향을 해석한다.",
  },
  {
    id: "astro-02",
    category: "핵심 성향",
    title: "태양·달·상승궁 — 겉모습과 내면의 진짜 나",
    purpose: "태양 별자리, 달 별자리, 상승궁을 중심으로 자아, 감정, 외부 이미지의 차이를 분석한다.",
  },
  {
    id: "astro-03",
    category: "행성",
    title: "개인 행성 해석 — 생각, 사랑, 행동의 방식",
    purpose: "수성, 금성, 화성을 중심으로 사고방식, 연애 스타일, 추진력을 해석한다.",
  },
  {
    id: "astro-04",
    category: "사회성",
    title: "사회 행성 해석 — 성장, 책임, 인생의 과제",
    purpose: "목성, 토성을 중심으로 확장성, 제한, 책임, 성취 방식을 해석한다.",
  },
  {
    id: "astro-05",
    category: "세대 행성",
    title: "천왕성·해왕성·명왕성 — 깊은 변화와 운명의 압력",
    purpose: "세대 행성이 개인 차트에서 어떤 영역을 흔들고 변화시키는지 해석한다.",
  },
  {
    id: "astro-06",
    category: "하우스",
    title: "12하우스 해석 — 삶의 무대와 에너지의 위치",
    purpose: "행성이 위치한 하우스를 바탕으로 일, 관계, 돈, 가족, 내면의 주제를 분석한다.",
  },
  {
    id: "astro-07",
    category: "어스펙트",
    title: "행성 간 각도 — 내 안의 조화와 충돌",
    purpose: "주요 어스펙트를 통해 성격의 긴장, 재능, 반복되는 패턴을 상담형으로 해석한다.",
  },
  {
    id: "astro-08",
    category: "연애",
    title: "사랑과 관계운 — 내가 사랑하고 사랑받는 방식",
    purpose: "금성, 화성, 5하우스, 7하우스, 달의 흐름을 중심으로 연애와 관계 패턴을 분석한다.",
  },
  {
    id: "astro-09",
    category: "직업",
    title: "직업운과 사회적 성취 — 세상에서 빛나는 방식",
    purpose: "MC, 10하우스, 태양, 토성, 목성을 중심으로 직업 방향과 성취 가능성을 해석한다.",
  },
  {
    id: "astro-10",
    category: "재물",
    title: "돈과 현실 감각 — 재물운과 자원 관리",
    purpose: "2하우스, 8하우스, 금성, 목성, 토성의 흐름을 바탕으로 재물 성향을 분석한다.",
  },
  {
    id: "astro-11",
    category: "미래 흐름",
    title: "트랜짓과 전환점 — 지금 나에게 오는 변화",
    purpose: "현재 트랜짓과 주요 행성 이동을 바탕으로 가까운 미래의 변화와 주의점을 해석한다.",
  },
  {
    id: "astro-12",
    category: "실전 조언",
    title: "나만의 별자리 사용법 — 운을 살리는 실천 처방",
    purpose: "전체 차트를 종합해 현실에서 실천할 수 있는 관계, 일, 돈, 자기관리 조언을 제시한다.",
  },
]);

function normalizeChapter(raw, index) {
  const source = raw && typeof raw === "object" ? raw : {};
  const id = clean(source.id || source.chapterId || source.key);
  const title = clean(source.title || source.name);
  const category = clean(source.category || source.group || source.type);
  const purpose = clean(source.purpose || source.description || source.summary);
  if (!id || !title || !category) return null;
  return Object.freeze({
    id,
    order: Number.isFinite(Number(source.order)) ? Number(source.order) : index + 1,
    category,
    title,
    purpose: purpose || `${title}의 핵심 흐름을 차트 데이터에 근거해 해석한다.`,
  });
}

function readCategoryChapters(categories) {
  if (Array.isArray(categories)) return categories;
  if (categories && typeof categories === "object") {
    if (Array.isArray(categories.chapters)) return categories.chapters;
    if (Array.isArray(categories.items)) return categories.items;
    if (Array.isArray(categories.categories)) return categories.categories;
  }
  return [];
}

export function normalizeChapterPlan(rawChapters, options = {}) {
  const source = asArray(rawChapters)
    .map(normalizeChapter)
    .filter(Boolean)
    .sort((a, b) => Number(a.order) - Number(b.order));
  const expectedCount = Number(options.expectedCount || source.length || 0);
  const invalidCount = expectedCount > 0 && source.length !== expectedCount;
  const invalidDefaultCount = options.defaultPlan === true && source.length !== 12;
  if (!source.length || invalidCount || invalidDefaultCount) {
    throw Object.assign(new Error("ASTROLOGY_CHAPTER_CONFIG_INVALID"), {
      code: "ASTROLOGY_CHAPTER_CONFIG_INVALID",
      status: 422,
      expectedCount,
      actualCount: source.length,
    });
  }
  return Object.freeze({
    version: clean(options.version || ASTROLOGY_CHAPTER_CONFIG_VERSION),
    source: clean(options.source || "configured"),
    chapters: Object.freeze(source.map((chapter, index) => Object.freeze({ ...chapter, order: index + 1 }))),
  });
}

export function loadAstrologyChapterConfig({ categories } = {}) {
  const configured = readCategoryChapters(categories);
  if (configured.length) {
    try {
      return normalizeChapterPlan(configured, {
        source: "request-categories",
        version: clean(categories?.version || categories?.chapterConfigVersion || "request-categories-v1"),
        expectedCount: configured.length,
      });
    } catch (_) {}
  }
  return normalizeChapterPlan(ASTROLOGY_DEFAULT_CHAPTERS, {
    source: "default-12",
    version: ASTROLOGY_CHAPTER_CONFIG_VERSION,
    expectedCount: 12,
    defaultPlan: true,
  });
}

export const astrologyPublicChapters = Object.freeze(ASTROLOGY_DEFAULT_CHAPTERS.map((chapter, index) => Object.freeze({
  id: chapter.id,
  order: index + 1,
  title: chapter.title,
  category: chapter.category,
  categories: Object.freeze([Object.freeze({
    id: `${chapter.id}-main`,
    title: chapter.category,
    description: chapter.purpose,
  })]),
})));

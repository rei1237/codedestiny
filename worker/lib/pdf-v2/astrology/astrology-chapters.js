import { asArray, clean } from "./astrology-premium.types.js";

export const ASTROLOGY_LLM_VERSION = "2026-06-astrology-llm-v1";
export const ASTROLOGY_CHAPTER_CONFIG_VERSION = "2026-06-astrology-default-15-v1";

export const ASTROLOGY_DEFAULT_CHAPTERS = Object.freeze([
  {
    id: "ch01",
    category: "총론",
    title: "출생 차트 총론 — 나의 우주적 설계도",
    purpose: "출생 차트 전체 구조와 핵심 행성 분포를 바탕으로 삶의 큰 방향을 해석한다.",
    groundingTerms: ["출생 차트", "태양", "달", "상승궁", "MC", "행성"],
  },
  {
    id: "ch02",
    category: "빅3",
    title: "빅3 해석 — 태양·달·상승궁",
    purpose: "태양 별자리, 달 별자리, 상승궁을 중심으로 자아, 감정, 외부 이미지의 차이를 분석한다.",
    groundingTerms: ["태양", "달", "상승궁", "자아", "감정", "외부 이미지"],
  },
  {
    id: "ch03",
    category: "행성",
    title: "10행성 완전 해석 — 내 안의 여러 목소리",
    purpose: "태양부터 명왕성까지 10행성의 배치를 통해 성향, 욕구, 행동 패턴을 해석한다.",
    groundingTerms: ["태양", "달", "수성", "금성", "화성", "목성", "토성", "천왕성", "해왕성", "명왕성"],
  },
  {
    id: "ch04",
    category: "하우스",
    title: "12하우스 분석 — 삶의 무대와 사건의 자리",
    purpose: "12하우스와 행성 위치를 바탕으로 관계, 일, 돈, 가족, 내면의 주제가 어디서 강해지는지 분석한다.",
    groundingTerms: ["하우스", "1하우스", "4하우스", "7하우스", "10하우스", "행성"],
  },
  {
    id: "ch05",
    category: "기질",
    title: "원소와 양식 분석 — 기질의 균형과 과부족",
    purpose: "불, 흙, 공기, 물의 원소와 cardinal, fixed, mutable 양식의 균형을 현실 대응 방식으로 해석한다.",
    groundingTerms: ["원소", "양식", "불", "흙", "공기", "물", "cardinal", "fixed", "mutable"],
  },
  {
    id: "ch06",
    category: "어스펙트",
    title: "어스펙트 분석 — 행성 간 조화와 긴장",
    purpose: "주요 어스펙트를 통해 성격의 긴장, 재능, 반복되는 패턴을 상담형으로 해석한다.",
    groundingTerms: ["어스펙트", "컨정션", "섹스타일", "스퀘어", "트라인", "오포지션"],
  },
  {
    id: "ch07",
    category: "관계",
    title: "사랑과 관계운 — 내가 사랑하고 사랑받는 방식",
    purpose: "금성, 화성, 달, 5하우스, 7하우스의 흐름을 중심으로 연애와 관계 패턴을 분석한다.",
    groundingTerms: ["금성", "화성", "달", "5하우스", "7하우스", "관계"],
  },
  {
    id: "ch08",
    category: "직업",
    title: "직업과 소명 — 세상에서 빛나는 방식",
    purpose: "MC, 10하우스, 태양, 토성, 목성을 중심으로 직업 방향과 사회적 성취 가능성을 해석한다.",
    groundingTerms: ["MC", "10하우스", "태양", "토성", "목성", "직업", "소명"],
  },
  {
    id: "ch09",
    category: "재물",
    title: "돈과 자원 — 재물운과 현실 감각",
    purpose: "2하우스, 8하우스, 금성, 목성, 토성의 흐름을 바탕으로 재물 성향과 자원 관리 방식을 분석한다.",
    groundingTerms: ["돈", "재물", "자원", "2하우스", "8하우스", "금성", "목성", "토성"],
  },
  {
    id: "ch10",
    category: "심리",
    title: "심리·무의식·상처 — 마음의 그림자와 회복",
    purpose: "달, 토성, 4하우스, 8하우스, 12하우스의 신호를 바탕으로 내면 패턴과 회복 방향을 해석한다.",
    groundingTerms: ["달", "토성", "4하우스", "8하우스", "12하우스", "무의식"],
  },
  {
    id: "ch11",
    category: "생활",
    title: "건강·생활 리듬 — 몸과 일상의 별자리",
    purpose: "6하우스, 달, 화성, 토성의 흐름을 바탕으로 에너지 관리와 생활 리듬을 해석한다.",
    groundingTerms: ["6하우스", "달", "화성", "토성", "생활 리듬", "건강"],
  },
  {
    id: "ch12",
    category: "현재 흐름",
    title: "현재 트랜짓 — 지금 나에게 오는 변화",
    purpose: "현재 트랜짓과 주요 행성 이동을 바탕으로 지금 열리는 변화와 주의점을 해석한다.",
    groundingTerms: ["트랜짓", "현재", "목성", "토성", "외행성", "변화"],
  },
  {
    id: "ch13",
    category: "시기 흐름",
    title: "90일·1년 흐름 — 가까운 미래의 선택 지도",
    purpose: "90일과 1년 단위의 흐름을 바탕으로 관계, 일, 돈, 생활에서 조정할 선택을 해석한다.",
    groundingTerms: ["90일", "1년", "트랜짓", "시기", "선택", "전환"],
  },
  {
    id: "ch14",
    category: "장기 로드맵",
    title: "3년 로드맵 — 천천히 열리는 인생의 방향",
    purpose: "장기 행성 흐름과 반복 주제를 바탕으로 3년 단위의 성장 방향과 준비 과제를 해석한다.",
    groundingTerms: ["3년", "장기", "토성", "목성", "외행성", "로드맵"],
  },
  {
    id: "ch15",
    category: "최종 종합",
    title: "최종 종합 — 별의 언어를 현실로 바꾸는 법",
    purpose: "전체 차트를 종합해 관계, 일, 돈, 자기관리에서 실천할 수 있는 최종 조언을 제시한다.",
    groundingTerms: ["종합", "출생 차트", "트랜짓", "관계", "직업", "재물"],
  },
]);

function normalizeChapter(raw, index) {
  const source = raw && typeof raw === "object" ? raw : {};
  const id = clean(source.id || source.chapterId || source.key);
  const title = clean(source.title || source.name);
  const category = clean(source.category || source.group || source.type);
  const purpose = clean(source.purpose || source.description || source.summary);
  const groundingTerms = asArray(source.groundingTerms || source.requiredGroundingTerms || source.focusTerms)
    .map((term) => clean(term))
    .filter(Boolean);
  if (!id || !title || !category) return null;
  return Object.freeze({
    id,
    order: Number.isFinite(Number(source.order)) ? Number(source.order) : index + 1,
    category,
    title,
    purpose: purpose || `${title}의 핵심 흐름을 차트 데이터에 근거해 해석한다.`,
    groundingTerms: Object.freeze(groundingTerms),
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
  const invalidDefaultCount = options.defaultPlan === true && source.length !== 15;
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
    source: "default-15",
    version: ASTROLOGY_CHAPTER_CONFIG_VERSION,
    expectedCount: 15,
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

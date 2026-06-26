import { asArray, clean, hashStable, safeObject } from "./life-book-premium.types.js";

export const LIFE_BOOK_LLM_VERSION = "2026-06-life-book-llm-v1";

export const LIFE_BOOK_DEFAULT_CHAPTERS = Object.freeze([
  {
    id: "life-01",
    category: "총론",
    title: "인생의 큰 지도 — 사주 팔자가 말하는 삶의 방향",
    purpose: "사주 원국 전체를 바탕으로 타고난 기질, 삶의 중심축, 인생의 큰 흐름을 해석한다.",
  },
  {
    id: "life-02",
    category: "자아와 기질",
    title: "나라는 사람의 본질 — 일간과 월령의 구조",
    purpose: "일간, 월령, 계절감, 오행 균형을 통해 사용자의 기본 성향과 내면 구조를 분석한다.",
  },
  {
    id: "life-03",
    category: "강점",
    title: "타고난 재능과 강점 — 내가 잘할 수밖에 없는 것",
    purpose: "십성, 오행, 격국, 용신 흐름을 바탕으로 재능과 강점을 상담형으로 풀어준다.",
  },
  {
    id: "life-04",
    category: "약점",
    title: "반복되는 삶의 숙제 — 막히는 패턴과 보완점",
    purpose: "사주 구조상 반복되기 쉬운 불안, 지연, 관계 문제, 선택 실수를 분석한다.",
  },
  {
    id: "life-05",
    category: "직업",
    title: "직업운과 사회적 성취 — 어떤 길에서 빛나는가",
    purpose: "관성, 인성, 식상, 재성의 흐름을 바탕으로 적성, 직업 방향, 사회적 성취 가능성을 본다.",
  },
  {
    id: "life-06",
    category: "재물",
    title: "재물운과 돈의 그릇 — 벌고 지키는 방식",
    purpose: "재성, 식상생재, 재극인, 비겁탈재 등 재물 구조를 현실적인 조언으로 해석한다.",
  },
  {
    id: "life-07",
    category: "관계",
    title: "인간관계와 귀인운 — 사람을 통해 열리는 운",
    purpose: "비겁, 인성, 관성, 합충 관계를 통해 인간관계, 귀인, 협업, 갈등 패턴을 분석한다.",
  },
  {
    id: "life-08",
    category: "연애와 결혼",
    title: "사랑과 배우자운 — 오래 함께할 인연의 모습",
    purpose: "배우자궁, 재성/관성, 합충, 대운 흐름을 바탕으로 연애와 결혼운을 해석한다.",
  },
  {
    id: "life-09",
    category: "가족과 뿌리",
    title: "가족운과 내면의 뿌리 — 나를 만든 환경",
    purpose: "부모, 형제, 성장 환경, 심리적 뿌리를 사주 구조와 연결해 상담한다.",
  },
  {
    id: "life-10",
    category: "건강과 심리",
    title: "건강운과 마음의 리듬 — 무너지지 않는 법",
    purpose: "오행 과다·부족, 조후, 스트레스 패턴을 바탕으로 건강과 심리적 관리 포인트를 제안한다.",
  },
  {
    id: "life-11",
    category: "대운",
    title: "대운의 전환점 — 인생이 크게 바뀌는 시기",
    purpose: "대운 흐름을 기준으로 삶의 주요 전환점, 상승기, 조심할 시기를 분석한다.",
  },
  {
    id: "life-12",
    category: "세운",
    title: "가까운 미래운 — 앞으로 집중해야 할 흐름",
    purpose: "현재와 가까운 미래의 세운을 바탕으로 일, 돈, 관계, 건강의 흐름을 구체적으로 본다.",
  },
  {
    id: "life-13",
    category: "개운법",
    title: "나만의 인생 사용법 — 운을 살리는 실천 처방",
    purpose: "사주 전체를 종합해 사용자가 현실에서 실천할 수 있는 개운법, 선택 기준, 생활 전략을 제시한다.",
  },
]);

function looksCorrupt(value) {
  const text = clean(value, 4000);
  if (!text) return true;
  return /\uFFFD|\?{2,}|[�]/.test(text);
}

function pickConfigChapters(config = {}) {
  if (Array.isArray(config)) return config;
  const item = safeObject(config);
  if (Array.isArray(item.chapters)) return item.chapters;
  if (Array.isArray(item.categories)) return item.categories;
  if (Array.isArray(item.lifeBookChapters)) return item.lifeBookChapters;
  return [];
}

function normalizeOneChapter(raw, index) {
  const item = safeObject(raw);
  const order = Number.isFinite(Number(item.order || item.no || index + 1))
    ? Number(item.order || item.no || index + 1)
    : index + 1;
  const id = clean(item.id || item.chapterId || item.key || `life-custom-${String(order).padStart(2, "0")}`, 80);
  const category = clean(item.category || item.categoryName || item.group || item.kind || "인생", 80);
  const title = clean(item.title || item.name || item.chapterTitle, 160);
  const purpose = clean(item.purpose || item.description || item.summary || item.intent || category, 600);
  if (!id || !title || looksCorrupt(id) || looksCorrupt(title) || looksCorrupt(category) || looksCorrupt(purpose)) return null;
  return {
    id,
    category,
    title,
    purpose,
    order,
    description: purpose,
  };
}

function normalizeDefaultChapters() {
  const chapters = LIFE_BOOK_DEFAULT_CHAPTERS.map((chapter, index) => ({
    ...chapter,
    order: index + 1,
    description: chapter.purpose,
  }));
  assertLifeBookChapterPlan(chapters, { requireDefaultIds: true });
  return chapters;
}

export function normalizeChapterPlan(rawConfig = null) {
  const source = safeObject(rawConfig);
  const sourceChapters = pickConfigChapters(rawConfig);
  const normalized = sourceChapters
    .map(normalizeOneChapter)
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);

  if (!normalized.length) {
    const chapters = normalizeDefaultChapters();
    return {
      source: "default-13",
      version: LIFE_BOOK_LLM_VERSION,
      chapterConfigVersion: `default:${LIFE_BOOK_LLM_VERSION}`,
      chapters,
    };
  }

  assertLifeBookChapterPlan(normalized);
  return {
    source: clean(source.source || source.name || "project-config", 80),
    version: clean(source.version || source.updatedAt || `config:${hashStable(normalized)}`, 120),
    chapterConfigVersion: clean(source.version || source.updatedAt || hashStable(normalized), 120),
    chapters: normalized,
  };
}

export function loadLifeBookChapterConfig({ env = {}, input = {} } = {}) {
  const rawInput = safeObject(input.body || input);
  const candidates = [
    rawInput.lifeBookChapterConfig,
    rawInput.lifeBookChapters,
    rawInput.chapterConfig,
    rawInput.chapterPlan,
    rawInput.categories,
    env.LIFE_BOOK_CHAPTER_CONFIG,
    env.LIFE_BOOK_CHAPTERS,
  ];

  if (clean(env.LIFE_BOOK_CHAPTER_CONFIG_JSON)) {
    try {
      candidates.push(JSON.parse(env.LIFE_BOOK_CHAPTER_CONFIG_JSON));
    } catch (_) {}
  }

  for (const candidate of candidates) {
    try {
      const chapters = pickConfigChapters(candidate);
      if (chapters.length) return normalizeChapterPlan(candidate);
    } catch (_) {}
  }
  return normalizeChapterPlan(null);
}

export function assertLifeBookChapterPlan(chapters = [], options = {}) {
  const list = asArray(chapters);
  if (!list.length) {
    throw Object.assign(new Error("LIFE_BOOK_CHAPTER_PLAN_EMPTY"), { code: "LIFE_BOOK_CHAPTER_PLAN_EMPTY", status: 422 });
  }
  const ids = new Set();
  list.forEach((chapter, index) => {
    const id = clean(chapter.id);
    if (!id || ids.has(id)) {
      throw Object.assign(new Error(`LIFE_BOOK_CHAPTER_ID_INVALID:${index + 1}`), { code: "LIFE_BOOK_CHAPTER_ID_INVALID", status: 422 });
    }
    ids.add(id);
    if (!clean(chapter.title) || !clean(chapter.category) || !clean(chapter.purpose || chapter.description)) {
      throw Object.assign(new Error(`LIFE_BOOK_CHAPTER_META_INVALID:${id}`), { code: "LIFE_BOOK_CHAPTER_META_INVALID", status: 422 });
    }
  });

  if (options.requireDefaultIds) {
    LIFE_BOOK_DEFAULT_CHAPTERS.forEach((chapter, index) => {
      if (clean(list[index]?.id) !== chapter.id) {
        throw Object.assign(new Error(`LIFE_BOOK_DEFAULT_CHAPTER_ID_INVALID:${index + 1}`), { code: "LIFE_BOOK_DEFAULT_CHAPTER_ID_INVALID", status: 500 });
      }
    });
  }
  return true;
}

export const lifeBookPremiumChapterPlanV1 = Object.freeze({
  version: LIFE_BOOK_LLM_VERSION,
  language: "ko",
  chapters: normalizeDefaultChapters().map((chapter) => Object.freeze({
    id: chapter.id,
    order: chapter.order,
    category: chapter.category,
    title: chapter.title,
    purpose: chapter.purpose,
    description: chapter.description,
    sections: [
      "사주 구조 해석",
      "인생 상담식 풀이",
      "장점과 가능성",
      "주의점과 반복되는 숙제",
      "실천 조언",
    ],
    focus: [chapter.category, chapter.purpose],
    minLength: 800,
  })),
});

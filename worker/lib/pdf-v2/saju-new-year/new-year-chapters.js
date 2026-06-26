import { clean, hashStable } from "./saju-new-year-premium.types.js";

export const NEW_YEAR_LLM_VERSION = "2026-06-new-year-llm-v1";

export const NEW_YEAR_DEFAULT_CHAPTERS = [
  {
    id: "newyear-01",
    category: "총론",
    title: "신년운세 총론 — 올해 내 운의 큰 방향",
    purpose: "해당 연도의 세운과 원국의 관계를 바탕으로 한 해의 전체 분위기와 핵심 흐름을 해석한다.",
  },
  {
    id: "newyear-02",
    category: "사주 구조",
    title: "원국과 세운의 만남 — 올해 운이 작동하는 방식",
    purpose: "사주 원국, 용신·기신, 십성, 오행 균형이 해당 연도에 어떻게 반응하는지 분석한다.",
  },
  {
    id: "newyear-03",
    category: "직업",
    title: "직업운과 사업운 — 일에서 열리는 기회",
    purpose: "관성, 식상, 재성, 대운·세운 흐름을 바탕으로 직업, 사업, 이직, 성취 가능성을 해석한다.",
  },
  {
    id: "newyear-04",
    category: "재물",
    title: "재물운 — 돈이 들어오고 나가는 흐름",
    purpose: "재성, 식상생재, 비겁, 대운·세운의 작용을 통해 수입, 지출, 투자 주의점을 분석한다.",
  },
  {
    id: "newyear-05",
    category: "연애와 결혼",
    title: "연애운과 결혼운 — 인연의 변화",
    purpose: "배우자궁, 재성·관성, 합충, 세운 작용을 통해 연애, 재회, 결혼, 관계 변화를 해석한다.",
  },
  {
    id: "newyear-06",
    category: "대인관계",
    title: "인간관계와 귀인운 — 사람을 통해 열리는 길",
    purpose: "비겁, 인성, 관성, 합충 흐름을 통해 올해의 귀인, 협업, 갈등, 평판운을 분석한다.",
  },
  {
    id: "newyear-07",
    category: "건강과 심리",
    title: "건강운과 마음의 리듬 — 무너지지 않기 위한 관리법",
    purpose: "오행 과다·부족, 조후, 스트레스 흐름을 바탕으로 건강과 심리 관리 포인트를 제시한다.",
  },
  {
    id: "newyear-08",
    category: "이동과 변화",
    title: "이동운과 변화운 — 이사, 여행, 환경 변화",
    purpose: "충, 합, 역마성, 대운·세운 흐름을 통해 이동, 이사, 변화, 새로운 시작의 가능성을 본다.",
  },
  {
    id: "newyear-09",
    category: "1분기",
    title: "1월~3월 운세 — 시작의 흐름",
    purpose: "1월부터 3월까지의 월운을 바탕으로 일, 돈, 관계, 건강의 흐름과 주의점을 분석한다.",
  },
  {
    id: "newyear-10",
    category: "2분기",
    title: "4월~6월 운세 — 확장과 조정의 흐름",
    purpose: "4월부터 6월까지의 월운을 바탕으로 기회, 갈등, 조정 포인트를 분석한다.",
  },
  {
    id: "newyear-11",
    category: "3분기",
    title: "7월~9월 운세 — 전환과 선택의 흐름",
    purpose: "7월부터 9월까지의 월운을 바탕으로 중요한 선택, 관계 변화, 재물 흐름을 해석한다.",
  },
  {
    id: "newyear-12",
    category: "4분기",
    title: "10월~12월 운세 — 마무리와 다음 해 준비",
    purpose: "10월부터 12월까지의 월운을 바탕으로 마무리, 정리, 성과, 다음 해 준비를 분석한다.",
  },
  {
    id: "newyear-13",
    category: "실전 처방",
    title: "올해의 개운 전략 — 운을 살리는 실천법",
    purpose: "한 해 전체 흐름을 종합해 일, 돈, 관계, 건강, 습관에 대한 실전 행동 지침을 제시한다.",
  },
];

function hasHangul(value = "") {
  return /[가-힣]/.test(String(value || ""));
}

function looksBrokenText(value = "") {
  const text = clean(value, 1000);
  if (!text) return true;
  if (text.includes("\uFFFD") || /\?{2,}/.test(text)) return true;
  return !hasHangul(text);
}

function normalizeExistingChapter(item = {}, index = 0, targetYear) {
  const id = clean(item.id || item.chapterId);
  const title = clean(item.title).replace(/\{YEAR\}/g, String(targetYear));
  const category = clean(item.category || item.domain);
  const purpose = clean(item.purpose || item.description || item.focus || item.summary);
  if (!id || !title || !category || looksBrokenText(title) || looksBrokenText(category)) return null;
  return {
    id,
    no: Number(item.no || index + 1),
    category,
    title,
    purpose: purpose && !looksBrokenText(purpose) ? purpose : `${category}의 흐름을 세운과 월운에 맞추어 해석한다.`,
  };
}

function normalizeDefaultChapter(item, index, targetYear) {
  return {
    ...item,
    no: index + 1,
    title: clean(item.title).replace(/\{YEAR\}/g, String(targetYear)),
    category: clean(item.category),
    purpose: clean(item.purpose),
  };
}

export function normalizeChapterPlan(sourceChapters = [], options = {}) {
  const targetYear = Number(options.targetYear || 0);
  const existing = Array.isArray(sourceChapters)
    ? sourceChapters.map((item, index) => normalizeExistingChapter(item, index, targetYear)).filter(Boolean)
    : [];
  const existingUsable = existing.length > 0 && existing.every((chapter) => chapter.id && chapter.title && chapter.category);
  const chapters = existingUsable
    ? existing
    : NEW_YEAR_DEFAULT_CHAPTERS.map((item, index) => normalizeDefaultChapter(item, index, targetYear));
  return {
    source: existingUsable ? "existing-config" : "default-13",
    chapterConfigVersion: existingUsable
      ? `existing:${hashStable(chapters.map(({ id, title, category, purpose }) => ({ id, title, category, purpose })))}`
      : "new-year-default-13.v1",
    chapters,
    expectedChapterCount: chapters.length,
  };
}

export function toLegacyChapterSpec(chapter) {
  return {
    no: Number(chapter.no || 0),
    id: clean(chapter.id),
    category: clean(chapter.category),
    title: clean(chapter.title),
    focus: clean(chapter.purpose),
    purpose: clean(chapter.purpose),
    categories: [clean(chapter.purpose)].filter(Boolean),
  };
}

import { VEDIC_PREMIUM_CHAPTERS } from "../../vedic-premium-chapters.js";
import { asArray, clean, hashStable } from "./vedic-premium.types.js";

export const VEDIC_LLM_VERSION = "2026-06-vedic-llm-v1";

export const VEDIC_DEFAULT_CHAPTERS = Object.freeze([
  Object.freeze({ id: "vedic-01", category: "총론", title: "베다 차트 총론 — 영혼의 설계도와 삶의 큰 방향", purpose: "라그나, 달, 태양, 행성 분포를 바탕으로 전체 인생 방향과 핵심 기질을 해석한다." }),
  Object.freeze({ id: "vedic-02", category: "라그나", title: "라그나와 첫인상 — 세상에 드러나는 나", purpose: "라그나, 라그나 로드, 1하우스를 중심으로 성향, 외부 이미지, 삶의 출발점을 해석한다." }),
  Object.freeze({ id: "vedic-03", category: "달과 마음", title: "찬드라와 마음의 리듬 — 감정과 무의식의 패턴", purpose: "달의 별자리, 하우스, 나크샤트라를 바탕으로 감정 구조와 안정감을 분석한다." }),
  Object.freeze({ id: "vedic-04", category: "라시 차트", title: "라시 차트 D1 — 현실 인생의 기본 구조", purpose: "D1 차트의 행성, 하우스, 주인성 배치를 통해 삶의 기본 골격을 해석한다." }),
  Object.freeze({ id: "vedic-05", category: "그라하", title: "9그라하 해석 — 내 운명을 움직이는 행성들", purpose: "태양, 달, 화성, 수성, 목성, 금성, 토성, 라후, 케투의 작용을 상담형으로 해석한다." }),
  Object.freeze({ id: "vedic-06", category: "바바", title: "12바바 해석 — 삶의 영역별 운세", purpose: "12하우스의 의미를 직업, 재물, 가족, 관계, 건강, 내면의 주제와 연결해 분석한다." }),
  Object.freeze({ id: "vedic-07", category: "나크샤트라", title: "나크샤트라 — 영혼의 결, 본능과 재능", purpose: "주요 나크샤트라를 바탕으로 타고난 기질, 본능, 재능, 반복되는 삶의 패턴을 해석한다." }),
  Object.freeze({ id: "vedic-08", category: "요가", title: "요가와 카르마 — 특별한 재능과 삶의 숙제", purpose: "라자 요가, 다나 요가, 니차, 우차, 파파/슈바 영향 등 주요 조합을 해석한다." }),
  Object.freeze({ id: "vedic-09", category: "직업", title: "직업운과 사회적 성취 — 세상에서 쓰임 받는 방식", purpose: "10하우스, 6하우스, 2하우스, 11하우스, 토성·태양·수성의 작용을 중심으로 직업운을 분석한다." }),
  Object.freeze({ id: "vedic-10", category: "재물", title: "재물운과 풍요의 흐름 — 벌고 지키고 키우는 법", purpose: "2하우스, 11하우스, 목성, 금성, 다나 요가를 중심으로 재물운과 관리 방식을 해석한다." }),
  Object.freeze({ id: "vedic-11", category: "연애와 결혼", title: "사랑과 결혼운 — 인연, 배우자, 관계의 카르마", purpose: "7하우스, 금성, 목성, 나바암샤 D9를 중심으로 연애, 결혼, 배우자운을 해석한다." }),
  Object.freeze({ id: "vedic-12", category: "다샤와 고차라", title: "다샤와 고차라 — 지금 펼쳐지는 운의 시간표", purpose: "빔쇼타리 다샤와 주요 트랜짓을 바탕으로 현재와 가까운 미래의 흐름을 분석한다." }),
  Object.freeze({ id: "vedic-13", category: "실전 처방", title: "나만의 베다 운세 처방 — 운을 살리는 삶의 전략", purpose: "전체 차트를 종합해 현실에서 실천할 수 있는 직업, 관계, 재물, 마음관리 조언을 제시한다." }),
]);

function normalizeSectionTitles(chapter = {}) {
  const direct = asArray(chapter.sections).map((item) => clean(item?.title || item?.heading || item)).filter(Boolean);
  if (direct.length) return direct;
  return asArray(chapter.categories).map((item) => clean(item?.title || item?.heading || item)).filter(Boolean);
}

function normalizeChapter(row = {}, index = 0, source = "project") {
  const sectionTitles = normalizeSectionTitles(row);
  const title = clean(row.title);
  const category = clean(row.category || row.group || row.roman || sectionTitles[0] || "베다점");
  const purpose = clean(row.purpose || row.subtitle || row.description || "제공된 베다 차트 계산값을 바탕으로 상담형 본문을 작성한다.");
  return Object.freeze({
    id: clean(row.id || row.key || `vedic-${String(index + 1).padStart(2, "0")}`),
    order: Number(row.order || row.num || index + 1),
    category,
    title,
    purpose,
    sections: Object.freeze(sectionTitles),
    required: true,
    source,
  });
}

function defaultChapterToPlan(row = {}, index = 0) {
  return Object.freeze({
    id: clean(row.id),
    order: index + 1,
    category: clean(row.category),
    title: clean(row.title),
    purpose: clean(row.purpose),
    sections: Object.freeze(["핵심 요약", "차트 기반 본문", "베다 처방"]),
    required: true,
    source: "default",
  });
}

export function createDefaultVedicChapterPlan() {
  const chapters = VEDIC_DEFAULT_CHAPTERS.map(defaultChapterToPlan);
  return Object.freeze({
    version: `${VEDIC_LLM_VERSION}:default-13:${hashStable(chapters)}`,
    serviceType: "vedic",
    language: "ko",
    source: "default",
    expectedChapterCount: 13,
    chapters: Object.freeze(chapters),
  });
}

export function normalizeChapterPlan(rows = [], options = {}) {
  const source = clean(options.source || "project");
  const chapters = asArray(rows).map((row, index) => normalizeChapter(row, index, source));
  const invalid = !chapters.length || chapters.some((chapter) => (
    !clean(chapter.id)
    || !clean(chapter.title)
    || !clean(chapter.category)
    || !Number.isFinite(Number(chapter.order))
  ));
  if (invalid) return null;
  return Object.freeze({
    version: clean(options.version) || `${VEDIC_LLM_VERSION}:${source}:${hashStable(chapters.map((chapter) => ({
      id: chapter.id,
      order: chapter.order,
      title: chapter.title,
      category: chapter.category,
      purpose: chapter.purpose,
      sections: chapter.sections,
    })))}`,
    serviceType: "vedic",
    language: "ko",
    source,
    expectedChapterCount: chapters.length,
    chapters: Object.freeze(chapters),
  });
}

export function loadVedicChapterConfig(input = {}, env = {}) {
  const projectPlan = normalizeChapterPlan(VEDIC_PREMIUM_CHAPTERS, { source: "project" });
  if (projectPlan) return projectPlan;

  const dbRows = asArray(input?.vedicChapterConfig || input?.chapterConfig || input?.categories || env?.VEDIC_PREMIUM_CHAPTER_CONFIG);
  const dbPlan = normalizeChapterPlan(dbRows, { source: "db" });
  if (dbPlan) return dbPlan;

  const fallbackPlan = createDefaultVedicChapterPlan();
  if (fallbackPlan.chapters.length !== 13) {
    throw Object.assign(new Error("VEDIC_DEFAULT_CHAPTER_PLAN_INVALID"), {
      code: "VEDIC_DEFAULT_CHAPTER_PLAN_INVALID",
      status: 500,
    });
  }
  return fallbackPlan;
}

export const vedicPremiumChapterPlanV2 = loadVedicChapterConfig();
export const VEDIC_PREMIUM_CHAPTER_PLAN_VERSION = vedicPremiumChapterPlanV2.version;

export function assertVedicChapterPlan(plan = vedicPremiumChapterPlanV2) {
  const chapters = asArray(plan.chapters);
  if (!chapters.length) {
    throw Object.assign(new Error("VEDIC_CHAPTER_PLAN_EMPTY"), { code: "VEDIC_CHAPTER_PLAN_EMPTY", status: 500 });
  }
  if (clean(plan.source) === "default" && chapters.length !== 13) {
    throw Object.assign(new Error("VEDIC_DEFAULT_CHAPTER_COUNT_INVALID"), { code: "VEDIC_DEFAULT_CHAPTER_COUNT_INVALID", status: 500 });
  }
  for (const chapter of chapters) {
    if (!clean(chapter.id) || !clean(chapter.title) || !clean(chapter.category)) {
      throw Object.assign(new Error(`VEDIC_CHAPTER_INVALID:${clean(chapter.id)}`), {
        code: "VEDIC_CHAPTER_INVALID",
        status: 500,
        chapterId: clean(chapter.id),
      });
    }
  }
  return true;
}

import { asArray, clean, normalizeLoveSecretMode } from "./love-secret-premium.types.js";

export const LOVE_SECRET_PREMIUM_CHAPTER_PLAN_VERSION = "2026-06-love-secret-llm-v1";

export const LOVE_SECRET_SOLO_CHAPTERS = Object.freeze([
  Object.freeze({
    id: "solo-01",
    title: "연애 원국 총론 — 내가 사랑을 시작하는 방식",
    purpose: "사용자의 사주 원국을 바탕으로 연애 성향, 정서 구조, 인연의 기본 방향을 상담형 문장으로 해석한다.",
  }),
  Object.freeze({
    id: "solo-02",
    title: "타고난 매력과 끌림의 포인트",
    purpose: "사용자가 어떤 분위기와 매력으로 상대에게 인식되는지, 연애 시장에서의 강점을 풀어준다.",
  }),
  Object.freeze({
    id: "solo-03",
    title: "이상형과 실제로 잘 맞는 사람",
    purpose: "막연한 이상형이 아니라 실제 관계 유지에 맞는 사람의 성향을 분석한다.",
  }),
  Object.freeze({
    id: "solo-04",
    title: "반복되는 연애 패턴과 상처의 원인",
    purpose: "과거 연애에서 반복되기 쉬운 감정 패턴, 회피, 집착, 불안, 선택 실수를 분석한다.",
  }),
  Object.freeze({
    id: "solo-05",
    title: "썸과 고백의 타이밍",
    purpose: "관계를 시작할 때 유리한 접근법, 고백 타이밍, 상대 반응을 읽는 법을 제안한다.",
  }),
  Object.freeze({
    id: "solo-06",
    title: "관계가 깊어지는 대화법과 표현법",
    purpose: "사용자에게 맞는 애정 표현, 연락 빈도, 대화 방식, 갈등 예방법을 상담한다.",
  }),
  Object.freeze({
    id: "solo-07",
    title: "이별수·재회수·미련 정리법",
    purpose: "이별 가능성, 재회 가능성, 미련을 정리하는 기준과 감정 회복법을 제시한다.",
  }),
  Object.freeze({
    id: "solo-08",
    title: "결혼운과 장기 연애 가능성",
    purpose: "연애가 결혼이나 안정적 동반자 관계로 이어질 가능성과 주의점을 본다.",
  }),
  Object.freeze({
    id: "solo-09",
    title: "시기별 연애운과 인연이 들어오는 흐름",
    purpose: "대운·세운·월운 흐름을 참고해 만남, 고백, 관계 진전, 정리의 시기를 분석한다.",
  }),
  Object.freeze({
    id: "solo-10",
    title: "나만의 연애 비책 — 실전 행동 처방",
    purpose: "사용자가 바로 실천할 수 있는 연애 전략, 자기관리, 연락법, 만남운 활용법을 정리한다.",
  }),
]);

export const LOVE_SECRET_COMPATIBILITY_CHAPTERS = Object.freeze([
  Object.freeze({
    id: "compat-01",
    title: "두 사람의 인연 총론 — 왜 서로에게 끌리는가",
    purpose: "두 사람의 사주를 바탕으로 인연의 성격, 끌림, 관계의 핵심 분위기를 해석한다.",
  }),
  Object.freeze({
    id: "compat-02",
    title: "각자의 연애 성향과 사랑의 언어",
    purpose: "두 사람이 사랑을 표현하고 받아들이는 방식의 차이를 분석한다.",
  }),
  Object.freeze({
    id: "compat-03",
    title: "첫 끌림과 케미스트리",
    purpose: "감정적·본능적 끌림, 설렘, 호감 형성 구조를 해석한다.",
  }),
  Object.freeze({
    id: "compat-04",
    title: "감정 궁합과 정서적 안정감",
    purpose: "서로가 정서적으로 안정감을 주는지, 불안을 자극하는지를 분석한다.",
  }),
  Object.freeze({
    id: "compat-05",
    title: "대화 궁합과 갈등 패턴",
    purpose: "말투, 연락, 오해, 감정 표현 방식에서 생길 수 있는 갈등을 분석한다.",
  }),
  Object.freeze({
    id: "compat-06",
    title: "현실 생활 궁합",
    purpose: "생활 리듬, 습관, 책임감, 현실 감각의 조화를 본다.",
  }),
  Object.freeze({
    id: "compat-07",
    title: "애정 표현과 스킨십 리듬",
    purpose: "애정의 온도차, 표현 방식, 친밀감 형성 속도를 상담한다.",
  }),
  Object.freeze({
    id: "compat-08",
    title: "재물관·일관·미래 설계 궁합",
    purpose: "돈, 일, 목표, 미래 계획에서의 합과 충돌 지점을 분석한다.",
  }),
  Object.freeze({
    id: "compat-09",
    title: "결혼운과 동거·장기 관계 가능성",
    purpose: "결혼, 동거, 장기 연애로 이어질 때의 장점과 현실적 주의점을 본다.",
  }),
  Object.freeze({
    id: "compat-10",
    title: "위기 구간과 헤어짐을 부르는 패턴",
    purpose: "관계가 흔들리기 쉬운 시기와 반복되는 문제를 분석한다.",
  }),
  Object.freeze({
    id: "compat-11",
    title: "재회 가능성과 관계 회복 전략",
    purpose: "이미 갈등이나 이별 위기가 있는 경우 회복 가능성과 접근법을 제시한다.",
  }),
  Object.freeze({
    id: "compat-12",
    title: "시기별 궁합운과 관계의 전환점",
    purpose: "대운·세운·월운 흐름을 참고해 관계 진전, 갈등, 결혼, 정리의 시기를 분석한다.",
  }),
  Object.freeze({
    id: "compat-13",
    title: "두 사람만의 연애 비책 — 함께 오래 가는 법",
    purpose: "두 사람이 실제로 지켜야 할 관계 운영법, 대화법, 갈등 해결법, 애정 회복법을 제안한다.",
  }),
]);

const REQUIRED_PERSPECTIVES_BY_MODE = Object.freeze({
  solo: Object.freeze(["상담형 해석", "주의점", "실전 조언"]),
  compatibility: Object.freeze(["두 사람의 차이", "관계 리스크", "실전 조언"]),
});

function chaptersForMode(mode) {
  return mode === "compatibility" ? LOVE_SECRET_COMPATIBILITY_CHAPTERS : LOVE_SECRET_SOLO_CHAPTERS;
}

function normalizeCuratedChapter(chapter, index, mode) {
  return Object.freeze({
    id: chapter.id,
    order: index + 1,
    title: chapter.title,
    purpose: chapter.purpose,
    requiredPerspectives: REQUIRED_PERSPECTIVES_BY_MODE[mode],
    required: true,
    minLength: 1500,
    planSource: "love-secret-llm-fixed",
  });
}

export function getLoveSecretExpectedChapterCount(mode = "solo") {
  return chaptersForMode(normalizeLoveSecretMode(mode, { allowDefault: true })).length;
}

export function resolveLoveSecretPremiumChapterPlan({ mode = "solo" } = {}) {
  const normalizedMode = normalizeLoveSecretMode(mode, { allowDefault: true });
  const chapters = chaptersForMode(normalizedMode).map((chapter, index) => normalizeCuratedChapter(chapter, index, normalizedMode));
  const plan = Object.freeze({
    version: LOVE_SECRET_PREMIUM_CHAPTER_PLAN_VERSION,
    serviceType: "love-secret",
    language: "ko",
    mode: normalizedMode,
    planSource: "love-secret-llm-fixed",
    expectedChapterCount: chapters.length,
    chapters: Object.freeze(chapters),
  });
  assertLoveSecretPremiumChapterPlan(plan);
  return plan;
}

export const loveSecretPremiumDefaultChapterPlanV2 = resolveLoveSecretPremiumChapterPlan();

export function assertLoveSecretPremiumChapterPlan(plan = loveSecretPremiumDefaultChapterPlanV2) {
  const mode = normalizeLoveSecretMode(plan.mode, { allowDefault: true });
  const expected = chaptersForMode(mode);
  const actual = asArray(plan.chapters);
  if (actual.length !== expected.length) {
    throw Object.assign(new Error(`LOVE_SECRET_CHAPTER_PLAN_COUNT:${actual.length}/${expected.length}`), {
      code: "LOVE_SECRET_CHAPTER_PLAN_COUNT",
      status: 500,
      mode,
    });
  }
  expected.forEach((chapter, index) => {
    const actualChapter = actual[index] || {};
    if (clean(actualChapter.id) !== chapter.id || clean(actualChapter.title) !== chapter.title) {
      throw Object.assign(new Error(`LOVE_SECRET_CHAPTER_PLAN_MISMATCH:${chapter.id}`), {
        code: "LOVE_SECRET_CHAPTER_PLAN_MISMATCH",
        status: 500,
        chapterId: chapter.id,
      });
    }
    const requiredPerspectives = asArray(actualChapter.requiredPerspectives);
    if (requiredPerspectives.length !== REQUIRED_PERSPECTIVES_BY_MODE[mode].length) {
      throw Object.assign(new Error(`LOVE_SECRET_CHAPTER_PERSPECTIVE_MISSING:${chapter.id}`), {
        code: "LOVE_SECRET_CHAPTER_PERSPECTIVE_MISSING",
        status: 500,
        chapterId: chapter.id,
      });
    }
  });
  return true;
}

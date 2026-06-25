import { asArray, clean } from "./love-secret-premium.types.js";

export const LOVE_SECRET_PREMIUM_CHAPTER_PLAN_VERSION = "2026-love-secret-chapter-plan-v4-mode-split";

const BROKEN_TEXT_RE = /(?:횄|횂|챙|챘|챠|챗|챨|嚥|揶|筌|獄|夷|\?[\u3131-\uD7A3])/;
const HANGUL_RE = /[\uAC00-\uD7A3]/;

const SOLO_CHAPTERS = Object.freeze([
  Object.freeze({
    id: "love_overview",
    title: "나의 사랑 기질",
    purpose: "사주 원국의 일간, 일지, 오행 균형으로 사랑을 시작하고 받아들이는 기본 온도를 정리합니다.",
    sections: Object.freeze(["일간으로 보는 사랑의 기본 태도", "일지 배우자궁의 친밀감 본능", "오행 균형과 애정 에너지", "사랑에서 지켜야 할 핵심 기준"]),
  }),
  Object.freeze({
    id: "attraction_pattern",
    title: "끌림이 시작되는 조건",
    purpose: "사주의 배우자성, 일지, 오행 흐름으로 마음이 움직이는 순간과 사람의 결을 읽습니다.",
    sections: Object.freeze(["처음 마음이 움직이는 신호", "배우자성과 이상형의 접점", "강한 끌림과 안정감의 차이", "좋은 인연을 알아보는 기준"]),
  }),
  Object.freeze({
    id: "relationship_pattern",
    title: "반복되는 연애 패턴",
    purpose: "관계 초반부터 가까워진 뒤까지 되풀이되는 선택, 기대, 거리감의 흐름을 짚습니다.",
    sections: Object.freeze(["관계 초반의 리듬", "가까워질수록 드러나는 반응", "상처가 커지는 지점", "반복을 바꾸는 실천 기준"]),
  }),
  Object.freeze({
    id: "love_expression",
    title: "마음 표현과 소통",
    purpose: "사랑을 표현하고 확인받는 방식, 말과 침묵 사이에서 생기는 오해의 결을 풉니다.",
    sections: Object.freeze(["감정을 표현하는 방식", "침묵과 확인 욕구", "오해가 생기는 말의 습관", "관계를 여는 대화법"]),
  }),
  Object.freeze({
    id: "love_risk_pattern",
    title: "불안과 관계 리스크",
    purpose: "애정이 깊어질수록 드러나는 불안, 집착처럼 보일 수 있는 반응, 기대의 과열 지점을 살핍니다.",
    sections: Object.freeze(["불안이 올라오는 사주 조건", "집착처럼 보일 수 있는 반응", "기대가 과해지는 순간", "마음을 안정시키는 행동"]),
  }),
  Object.freeze({
    id: "ideal_partner_gap",
    title: "이상형과 현실의 간격",
    purpose: "끌리는 사람과 오래 편안한 사람 사이의 차이를 구분하고 현실적인 선택 기준을 세웁니다.",
    sections: Object.freeze(["끌리는 사람의 공통점", "오래 편안한 사람의 조건", "이상형이 만드는 착시", "현실 궁합을 보는 기준"]),
  }),
  Object.freeze({
    id: "breakup_risk",
    title: "이별 신호와 회복 기준",
    purpose: "멀어지는 흐름, 미련이 오래 남는 이유, 다시 가까워질 수 있는 조건을 차분히 나눕니다.",
    sections: Object.freeze(["멀어지는 신호", "미련이 오래 남는 이유", "다시 가까워질 조건", "정리해야 할 마음"]),
  }),
  Object.freeze({
    id: "intimacy_pattern",
    title: "친밀감과 거리 조절",
    purpose: "가까워지는 속도와 혼자 머무를 공간의 필요를 읽어 건강한 친밀감의 규칙을 제안합니다.",
    sections: Object.freeze(["가까워지는 속도", "혼자 있는 시간의 필요", "밀착이 부담이 되는 때", "건강한 친밀감의 규칙"]),
  }),
  Object.freeze({
    id: "love_luck_cycles",
    title: "연애운과 만남의 시기",
    purpose: "대운, 세운, 월운의 흐름 안에서 만남과 선택이 열리는 시기를 사주 기준으로 정리합니다.",
    sections: Object.freeze(["현재 연애운의 흐름", "기회가 열리는 구간", "조심해야 할 시기", "선택을 미루지 않아야 할 문"]),
  }),
  Object.freeze({
    id: "love_master_plan",
    title: "최종 연애 비책",
    purpose: "전체 흐름을 하나의 방향으로 묶어 다음 선택과 관계 운영의 기준을 세웁니다.",
    sections: Object.freeze(["핵심 결론", "살려야 할 매력", "줄여야 할 반응", "90일 실천 루틴"]),
  }),
]);

const COMPATIBILITY_CHAPTERS = Object.freeze([
  Object.freeze({
    id: "couple_code",
    title: "두 사람의 관계 코드",
    purpose: "두 사주의 일간, 일지, 오행 흐름이 만날 때 생기는 관계의 기본 결을 정리합니다.",
    sections: Object.freeze(["첫눈에 느껴지는 관계의 결", "일간과 일지의 첫 맞물림", "끌림과 안정감의 균형", "관계를 살리는 기본 태도"]),
  }),
  Object.freeze({
    id: "first_attraction",
    title: "첫 끌림과 매력의 이유",
    purpose: "서로에게 끌리는 이유와 시간이 지나며 자극이 피로가 될 수 있는 지점을 구분합니다.",
    sections: Object.freeze(["서로에게 끌리는 지점", "처음 설레는 조건", "자극이 피로가 되는 때", "매력을 오래 살리는 법"]),
  }),
  Object.freeze({
    id: "emotional_match",
    title: "감정 궁합",
    purpose: "감정이 오가는 속도, 애정 확인 방식, 서운함이 쌓이는 구조를 두 사람의 사주로 읽습니다.",
    sections: Object.freeze(["감정의 속도", "애정 확인 방식", "서운함이 쌓이는 지점", "감정 회복의 순서"]),
  }),
  Object.freeze({
    id: "communication_match",
    title: "소통 궁합",
    purpose: "말의 온도와 침묵의 의미, 오해가 생기는 대화 패턴과 풀리는 방식을 정리합니다.",
    sections: Object.freeze(["말의 온도", "침묵의 의미", "오해가 생기는 패턴", "대화가 풀리는 방식"]),
  }),
  Object.freeze({
    id: "conflict_match",
    title: "갈등 궁합",
    purpose: "충돌이 시작되는 원인과 각자의 방어 방식, 상처가 깊어지는 말을 구체적으로 짚습니다.",
    sections: Object.freeze(["충돌이 시작되는 원인", "각자의 방어 방식", "상처가 깊어지는 말", "갈등을 줄이는 약속"]),
  }),
  Object.freeze({
    id: "reconciliation_match",
    title: "화해와 회복 궁합",
    purpose: "다시 가까워지는 조건, 사과와 확인의 순서, 반복을 멈추는 행동을 관계 흐름에 맞춥니다.",
    sections: Object.freeze(["다시 가까워지는 조건", "사과와 확인의 순서", "반복을 멈추는 행동", "회복을 지키는 말"]),
  }),
  Object.freeze({
    id: "reality_match",
    title: "생활 리듬과 현실 궁합",
    purpose: "생활 속도, 돈과 책임의 감각, 일상에서 부딪히는 지점을 현실적인 기준으로 봅니다.",
    sections: Object.freeze(["생활 속도", "돈과 책임의 감각", "일상에서 부딪히는 지점", "현실 조율 기준"]),
  }),
  Object.freeze({
    id: "long_term_relation",
    title: "장기 관계와 결혼 가능성",
    purpose: "오래 만날수록 안정되는 부분과 공식화 전에 확인해야 할 조건을 나눠 봅니다.",
    sections: Object.freeze(["오래 만날수록 안정되는 부분", "공식화 전 확인할 조건", "생활 리듬의 맞물림", "장기 관계로 가는 기준"]),
  }),
  Object.freeze({
    id: "current_year_flow",
    title: "올해의 관계 흐름",
    purpose: "현재 세운과 월운의 흐름에서 가까워지는 구간, 조심할 전환점, 결정의 타이밍을 정리합니다.",
    sections: Object.freeze(["올해 가까워지는 구간", "조심해야 할 전환점", "관계 결정의 좋은 타이밍", "월별 운영 기준"]),
  }),
  Object.freeze({
    id: "couple_master_plan",
    title: "최종 궁합 비책",
    purpose: "두 사람의 강점과 피해야 할 습관을 하나로 묶어 관계 성장의 기준을 세웁니다.",
    sections: Object.freeze(["두 사람의 최종 메시지", "반드시 살려야 할 강점", "반드시 피해야 할 습관", "90일 관계 성장 루틴"]),
  }),
]);

function hasReadableKorean(value) {
  const text = clean(value);
  return Boolean(text && HANGUL_RE.test(text) && !BROKEN_TEXT_RE.test(text));
}

function chapterIsReadable(chapter = {}) {
  const title = clean(chapter.title || chapter.name);
  const sections = asArray(chapter.categories || chapter.sections)
    .map((section) => clean(section?.title || section?.name || section))
    .filter(Boolean);
  return hasReadableKorean(title) && sections.length >= 3 && sections.every(hasReadableKorean);
}

function slugChapterId(title, index) {
  const ascii = clean(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return ascii || `love_secret_ch_${index + 1}`;
}

function normalizeConfigChapter(chapter, index) {
  const source = chapter && typeof chapter === "object" ? chapter : {};
  const title = clean(source.title || source.name || `연애 비책 ${index + 1}장`);
  const sections = asArray(source.categories || source.sections)
    .map((section) => clean(section?.title || section?.name || section))
    .filter(Boolean);
  return Object.freeze({
    id: clean(source.id || source.key || slugChapterId(title, index)),
    order: Number(source.order || source.num || index + 1),
    title,
    purpose: clean(source.subtitle || source.purpose || `${title}을 사주 계산 근거에 맞춰 상담형 본문으로 풉니다.`),
    sections: Object.freeze(sections),
    required: true,
    minLength: Math.max(1800, Number(source.minLength || source.minChars || 1800)),
    planSource: "config",
  });
}

function normalizeCuratedChapter(chapter, index, planSource) {
  return Object.freeze({
    id: chapter.id,
    order: index + 1,
    title: chapter.title,
    purpose: chapter.purpose,
    sections: Object.freeze(chapter.sections),
    required: true,
    minLength: 1800,
    planSource,
  });
}

function curatedChaptersForMode(mode) {
  return clean(mode).toLowerCase() === "compatibility" ? COMPATIBILITY_CHAPTERS : SOLO_CHAPTERS;
}

function configuredChaptersAreUsable(config = {}) {
  const configured = asArray(config?.chapters);
  if (configured.length < 8) return false;
  return configured.every(chapterIsReadable);
}

export function resolveLoveSecretPremiumChapterPlan({ mode = "solo", config = null } = {}) {
  const normalizedMode = clean(mode).toLowerCase() === "compatibility" ? "compatibility" : "solo";
  const useConfig = configuredChaptersAreUsable(config);
  const chapters = useConfig
    ? asArray(config?.chapters).map(normalizeConfigChapter)
    : curatedChaptersForMode(normalizedMode).map((chapter, index) => normalizeCuratedChapter(chapter, index, normalizedMode));
  const plan = Object.freeze({
    version: LOVE_SECRET_PREMIUM_CHAPTER_PLAN_VERSION,
    serviceType: "love-secret-premium",
    language: "ko",
    mode: normalizedMode,
    planSource: useConfig ? "config" : normalizedMode,
    chapters: Object.freeze(chapters),
  });
  assertLoveSecretPremiumChapterPlan(plan);
  return plan;
}

export const loveSecretPremiumDefaultChapterPlanV2 = resolveLoveSecretPremiumChapterPlan();

export function assertLoveSecretPremiumChapterPlan(plan = loveSecretPremiumDefaultChapterPlanV2) {
  if (!asArray(plan.chapters).length) {
    throw Object.assign(new Error("LOVE_SECRET_CHAPTER_PLAN_EMPTY"), { code: "LOVE_SECRET_CHAPTER_PLAN_EMPTY", status: 500 });
  }
  for (const chapter of plan.chapters) {
    if (!clean(chapter.id) || !hasReadableKorean(chapter.title) || !asArray(chapter.sections).length || !chapter.sections.every(hasReadableKorean)) {
      throw Object.assign(new Error(`LOVE_SECRET_CHAPTER_INVALID:${clean(chapter.id)}`), {
        code: "LOVE_SECRET_CHAPTER_INVALID",
        status: 500,
        chapterId: clean(chapter.id),
      });
    }
  }
  return true;
}

import { asArray, clean } from "./love-secret-premium.types.js";

export const LOVE_SECRET_PREMIUM_CHAPTER_PLAN_VERSION = "2026-love-secret-chapter-plan-v3";

const BROKEN_TEXT_RE = /�|(?:Ã|Â|ì|ë|í|ê|ð)|\?[\u3131-\uD7A3]|(?:濡|怨|媛|留|諛|沅|鍮|쨌)/;
const HANGUL_RE = /[\uAC00-\uD7A3]/;

const SOLO_CHAPTERS = Object.freeze([
  Object.freeze({ id: "love_overview", title: "연애 기질의 중심", purpose: "사주 계산 신호로 사랑을 시작하고 받아들이는 기본 온도를 정리합니다.", sections: ["타고난 연애 기질", "끌림과 안정감의 균형", "반복되는 선택", "지금 필요한 태도"] }),
  Object.freeze({ id: "attraction_pattern", title: "끌림이 시작되는 지점", purpose: "호감이 열리는 조건과 마음이 움직이는 순간을 살핍니다.", sections: ["첫 끌림의 신호", "마음이 열리는 조건", "끌리지만 흔들리는 지점", "관계로 이어지는 행동"] }),
  Object.freeze({ id: "relationship_pattern", title: "반복되는 관계 패턴", purpose: "반복되는 선택, 거리감, 기대의 습관을 해석합니다.", sections: ["관계 초반의 리듬", "익숙하게 반복되는 장면", "상처가 커지는 방식", "패턴을 바꾸는 기준"] }),
  Object.freeze({ id: "emotional_language", title: "감정 표현과 소통 방식", purpose: "사랑을 표현하고 받아들이는 언어를 정리합니다.", sections: ["표현의 온도", "말보다 먼저 드러나는 태도", "오해가 생기는 지점", "편안한 대화의 순서"] }),
  Object.freeze({ id: "love_risk_pattern", title: "불안과 집착의 그림자", purpose: "관계가 흔들릴 때 드러나는 약점을 부드럽게 짚습니다.", sections: ["불안이 올라오는 순간", "집착으로 번지기 쉬운 조건", "상대에게 과하게 기대는 지점", "마음을 안정시키는 행동"] }),
  Object.freeze({ id: "ideal_partner_gap", title: "이상형과 현실의 간격", purpose: "끌리는 사람과 안정적인 사람 사이의 차이를 봅니다.", sections: ["끌리는 사람의 공통점", "오래 편안한 사람의 조건", "이상형이 만드는 착시", "현실 궁합을 보는 기준"] }),
  Object.freeze({ id: "compatibility_axis", title: "궁합을 볼 때 중요한 축", purpose: "상대가 있거나 앞으로 만날 인연에서 확인해야 할 기준을 세웁니다.", sections: ["나와 맞는 결", "감정의 속도", "생활 리듬의 맞물림", "관계를 지키는 최소 조건"] }),
  Object.freeze({ id: "breakup_reconciliation", title: "이별과 재회의 흐름", purpose: "관계가 멀어지는 조건과 다시 가까워질 수 있는 조건을 구분합니다.", sections: ["멀어지는 신호", "다시 가까워지는 조건", "붙잡아도 되는 때", "정리해야 하는 때"] }),
  Object.freeze({ id: "intimacy_pattern", title: "친밀감과 거리 조절", purpose: "가까워질수록 필요한 안정감과 경계의 리듬을 읽습니다.", sections: ["가까워지는 속도", "혼자만의 공간", "친밀감이 부담이 되는 순간", "건강한 거리의 기준"] }),
  Object.freeze({ id: "love_luck_cycles", title: "연애운의 시기와 문", purpose: "대운·세운·월운의 흐름에서 관계가 열리는 시기를 봅니다.", sections: ["현재 연애운", "다가오는 기회", "조심할 시기", "선택을 미루지 말아야 할 문"] }),
  Object.freeze({ id: "marriage_long_term", title: "장기 관계와 결혼의 조건", purpose: "오래 이어지는 관계에 필요한 현실 조건을 정리합니다.", sections: ["오래 가는 관계의 조건", "생활 안정감", "결혼을 볼 때의 기준", "현실 조율의 순서"] }),
  Object.freeze({ id: "thirty_day_practice", title: "30일 관계 실천법", purpose: "지금의 흐름을 바꾸는 구체적인 관계 루틴을 제안합니다.", sections: ["첫 7일의 정리", "둘째 주의 표현", "셋째 주의 조율", "마지막 주의 선택"] }),
  Object.freeze({ id: "love_master_plan", title: "최종 연애 전략", purpose: "전체 해석을 하나의 방향으로 묶어 다음 선택 기준을 세웁니다.", sections: ["핵심 결론", "줄여야 할 반응", "늘려야 할 행동", "다음 선택 기준"] }),
]);

const COMPATIBILITY_CHAPTERS = Object.freeze([
  Object.freeze({ id: "couple_overview", title: "두 사람의 관계 구조", purpose: "두 사주의 결이 만날 때 생기는 기본 온도와 방향을 정리합니다.", sections: ["관계의 첫 인상", "서로에게 끌리는 이유", "안정감의 조건", "관계의 큰 흐름"] }),
  Object.freeze({ id: "emotional_match", title: "감정 궁합", purpose: "두 사람이 사랑을 느끼고 확인하는 방식의 차이를 읽습니다.", sections: ["감정의 속도", "애정 확인 방식", "서운함이 쌓이는 지점", "감정 회복의 순서"] }),
  Object.freeze({ id: "communication_match", title: "소통 궁합", purpose: "말, 침묵, 반응의 결이 맞물리는 지점과 어긋나는 지점을 봅니다.", sections: ["말의 온도", "침묵의 의미", "오해가 생기는 패턴", "대화가 풀리는 방식"] }),
  Object.freeze({ id: "attraction_match", title: "끌림과 설렘의 궁합", purpose: "서로에게 자극과 호감이 생기는 방식을 해석합니다.", sections: ["처음 끌리는 지점", "설렘이 커지는 조건", "자극이 피로가 되는 때", "매력을 오래 살리는 법"] }),
  Object.freeze({ id: "conflict_match", title: "갈등과 회복 패턴", purpose: "다툼이 커지는 구조와 다시 맞춰지는 조건을 구분합니다.", sections: ["충돌의 원인", "각자의 방어 방식", "화해가 어려운 순간", "회복 대화의 순서"] }),
  Object.freeze({ id: "reality_match", title: "생활 리듬과 현실 궁합", purpose: "감정 너머 생활 습관과 현실 조건의 맞물림을 봅니다.", sections: ["생활 속도", "돈과 책임의 감각", "일상에서 부딪히는 지점", "현실 조율 기준"] }),
  Object.freeze({ id: "intimacy_match", title: "친밀감과 거리 궁합", purpose: "가까워질 때 필요한 안정감과 경계를 두 사람 기준으로 정리합니다.", sections: ["가까워지는 방식", "혼자 있는 시간", "밀착이 부담이 되는 때", "편안한 거리"] }),
  Object.freeze({ id: "long_term_match", title: "장기 관계 가능성", purpose: "오래 이어지는 관계로 자라기 위해 필요한 조건을 봅니다.", sections: ["지속력의 신호", "관계가 약해지는 구간", "함께 쌓아야 할 습관", "장기 안정의 기준"] }),
  Object.freeze({ id: "marriage_match", title: "결혼과 동반자 조건", purpose: "결혼을 단정하지 않고 현실적으로 확인해야 할 동반자 조건을 정리합니다.", sections: ["동반자성", "가정과 책임의 감각", "결혼 전 확인할 기준", "현실 합의의 순서"] }),
  Object.freeze({ id: "breakup_reunion_match", title: "이별과 재회 가능성", purpose: "멀어지는 조건과 다시 가까워질 수 있는 조건을 차분히 구분합니다.", sections: ["멀어지는 신호", "재회가 열리는 조건", "반복하면 위험한 장면", "정리와 회복의 기준"] }),
  Object.freeze({ id: "love_timing_match", title: "두 사람의 연애운 시기", purpose: "두 사람의 운 흐름에서 관계가 움직이기 쉬운 시기를 봅니다.", sections: ["현재 관계운", "좋아지는 시기", "조심할 시기", "중요한 선택의 문"] }),
  Object.freeze({ id: "couple_practice", title: "30일 관계 조율법", purpose: "두 사람이 바로 적용할 수 있는 관계 루틴을 제안합니다.", sections: ["첫 7일의 대화", "둘째 주의 약속", "셋째 주의 조율", "마지막 주의 확인"] }),
  Object.freeze({ id: "couple_master_plan", title: "최종 궁합 전략", purpose: "궁합 해석을 현실적인 선택 기준과 행동 계획으로 묶습니다.", sections: ["관계의 핵심 결론", "반복을 줄일 지점", "함께 늘릴 행동", "앞으로의 기준"] }),
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
    purpose: clean(source.subtitle || source.purpose || "연애 계산 결과를 자연스러운 상담 문장으로 해석합니다."),
    sections: Object.freeze(sections),
    required: true,
    minLength: Math.max(1400, Number(source.minLength || source.minChars || 1500)),
    planSource: "config",
  });
}

function normalizeCuratedChapter(chapter, index) {
  return Object.freeze({
    id: chapter.id,
    order: index + 1,
    title: chapter.title,
    purpose: chapter.purpose,
    sections: Object.freeze(chapter.sections),
    required: true,
    minLength: 1500,
    planSource: "curated",
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
    : curatedChaptersForMode(normalizedMode).map(normalizeCuratedChapter);
  const plan = Object.freeze({
    version: LOVE_SECRET_PREMIUM_CHAPTER_PLAN_VERSION,
    serviceType: "love-secret-premium",
    language: "ko",
    mode: normalizedMode,
    planSource: useConfig ? "config" : "curated",
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

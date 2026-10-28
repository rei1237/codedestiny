// 전문가 상담 캐릭터 페르소나 — CMS 오버라이드를 거쳐 라우트 시스템 프롬프트 뒤에 붙인다.
// 원문·말투 검사는 expert-character-persona-text.js(순수 모듈)에 있다.

import { cmsPromptText } from "./cms-prompts.js";
import {
  EXPERT_PERSONA_ENABLED,
  HANBI_LOVE_PERSONA_KO,
  HANBI_PERSONA_KO,
  MUSUNG_PERSONA_EN,
  MUSUNG_PERSONA_KO,
  NEO_NEW_YEAR_PERSONA_KO,
  YEONI_LOVE_PERSONA_KO,
  YEONI_PERSONA_KO,
  YUN_LIFE_BOOK_PERSONA_KO,
  YUN_PERSONA_KO,
  YUN_VEDIC_PERSONA_KO,
  BASIC_FORTUNE_PERSONA_KEYS,
  isKoreanLocale,
} from "./expert-character-persona-text.js";

export * from "./expert-character-persona-text.js";

// 키를 리터럴로 적어야 cms-prompt-catalog-coverage 테스트가 카탈로그 등록을 검사할 수 있다.
const PERSONA_RESOLVERS = {
  yunVedic: (env) => cmsPromptText(env, "expert-persona-yun-vedic", YUN_VEDIC_PERSONA_KO),
  yun: (env) => cmsPromptText(env, "expert-persona-yun", YUN_PERSONA_KO),
  musung: (env) => cmsPromptText(env, "expert-persona-musung", MUSUNG_PERSONA_KO),
  hanbi: (env) => cmsPromptText(env, "expert-persona-hanbi", HANBI_PERSONA_KO),
  yeoni: (env) => cmsPromptText(env, "expert-persona-yeoni", YEONI_PERSONA_KO),
  yeoniLove: (env) => cmsPromptText(env, "expert-persona-yeoni-love", YEONI_LOVE_PERSONA_KO),
  hanbiLove: (env) => cmsPromptText(env, "expert-persona-hanbi-love", HANBI_LOVE_PERSONA_KO),
  neoNewYear: (env) => cmsPromptText(env, "expert-persona-neo-new-year", NEO_NEW_YEAR_PERSONA_KO),
  yunLifeBook: (env) => cmsPromptText(env, "expert-persona-yun-life-book", YUN_LIFE_BOOK_PERSONA_KO),
};

/**
 * 페르소나 원문만 돌려준다(CMS 오버라이드 반영). 꺼져 있거나 없는 키는 빈 문자열.
 * 연애 비책처럼 base 와 범위 지시 사이에 끼워야 하는 경로가 쓴다.
 * CMS 오버라이드는 한국어 페르소나에만 적용한다(비한국어 로케일은 코드 메모).
 */
export async function resolveExpertPersona(env, key, { locale = "ko" } = {}) {
  if (!EXPERT_PERSONA_ENABLED[key] || !PERSONA_RESOLVERS[key]) return "";
  if (key === "musung" && !isKoreanLocale(locale)) return MUSUNG_PERSONA_EN;
  return (await PERSONA_RESOLVERS[key](env)) || "";
}

/** base 시스템 프롬프트 뒤에 캐릭터 페르소나를 붙인다. */
export async function appendExpertPersona(env, key, base, { locale = "ko" } = {}) {
  const persona = await resolveExpertPersona(env, key, { locale });
  return persona ? `${base}\n\n${persona}` : base;
}

/** Server-owned feature mapping; reused for new parts and stored-result continuation. */
export async function appendBasicFortunePersona(env, featureKey, base, options = {}) {
  const key = BASIC_FORTUNE_PERSONA_KEYS[featureKey];
  if (!key) return base;
  const expertise = '[꿀꿀운세 전문 상담 기준]\n당신은 해당 점술 분야의 최고 수준 전문가인 담당 마스터입니다. 계산 근거를 정확히 짚고, 왜 그런 해석이 나오는지 쉬운 말로 설명한 뒤 구체적인 선택과 행동을 제시합니다. 체계를 섞거나 없는 근거·경력·성공 보장을 만들지 않습니다. 각 부분의 범위와 출력 계약을 우선하며, 첫 부분 이후에는 자기소개·출생시각 안내를 반복하지 않습니다.';
  return appendExpertPersona(env, key, String(base || '') + '\n\n' + expertise, options);
}

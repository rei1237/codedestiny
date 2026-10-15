// 전문가 상담 캐릭터 페르소나 — CMS 오버라이드를 거쳐 라우트 시스템 프롬프트 뒤에 붙인다.
// 원문·말투 검사는 expert-character-persona-text.js(순수 모듈)에 있다.

import { cmsPromptText } from "./cms-prompts.js";
import {
  EXPERT_PERSONA_ENABLED,
  HANBI_PERSONA_KO,
  MUSUNG_PERSONA_EN,
  MUSUNG_PERSONA_KO,
  YEONI_PERSONA_KO,
  YUN_PERSONA_KO,
  isKoreanLocale,
} from "./expert-character-persona-text.js";

export * from "./expert-character-persona-text.js";

// 키를 리터럴로 적어야 cms-prompt-catalog-coverage 테스트가 카탈로그 등록을 검사할 수 있다.
const PERSONA_RESOLVERS = {
  yun: (env) => cmsPromptText(env, "expert-persona-yun", YUN_PERSONA_KO),
  musung: (env) => cmsPromptText(env, "expert-persona-musung", MUSUNG_PERSONA_KO),
  hanbi: (env) => cmsPromptText(env, "expert-persona-hanbi", HANBI_PERSONA_KO),
  yeoni: (env) => cmsPromptText(env, "expert-persona-yeoni", YEONI_PERSONA_KO),
};

/**
 * base 시스템 프롬프트 뒤에 캐릭터 페르소나를 붙인다.
 * CMS 오버라이드는 한국어 페르소나에만 적용한다(비한국어 로케일은 코드 메모).
 */
export async function appendExpertPersona(env, key, base, { locale = "ko" } = {}) {
  if (!EXPERT_PERSONA_ENABLED[key] || !PERSONA_RESOLVERS[key]) return base;
  const persona = key === "musung" && !isKoreanLocale(locale)
    ? MUSUNG_PERSONA_EN
    : await PERSONA_RESOLVERS[key](env);
  return persona ? `${base}\n\n${persona}` : base;
}

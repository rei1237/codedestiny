// 분야별 프롬프트 템플릿의 런타임 오버라이드 보관소.
//
// 왜 이렇게 하는가: get*PromptTemplate() 은 프롬프트 빌더 깊숙한 곳에서 동기로 불린다.
// 여기에 오버라이드를 먹이려고 빌더를 async 로 바꾸면 사주 AI 를 포함한 유료 경로 전체의
// 시그니처가 흔들린다. 대신 접근자 한 줄만 이 보관소를 거치게 하고, 값은 요청 앞단에서
// primePromptTemplateOverrides(env) 로 채운다. 접근자 시그니처는 그대로다.
//
// 의존성을 두지 않는다(순수 저장소) — cms-prompts.js 가 이 모듈을 채우고, 템플릿 모듈은
// 읽기만 한다. 반대로 엮으면 templates -> cms-prompts -> models -> templates 순환이 생긴다.

let overrides = {};

/** cms-prompts.js 가 CMS 조회 결과로 호출한다. */
export function setPromptTemplateOverrides(next) {
  overrides = next && typeof next === "object" ? next : {};
}

export function hasPromptTemplateOverrides() {
  return Object.keys(overrides).length > 0;
}

/**
 * 코드 템플릿 위에 CMS 값을 얹는다. 오버라이드가 없으면 원본 객체를 그대로 돌려준다
 * (동일 참조 유지 — 호출부가 참조 비교를 하더라도 기존 동작이 변하지 않게).
 */
export function applyPromptTemplateOverride(system, domain, template) {
  if (!template) return template;

  const patch = overrides[`${system}:${String(domain || "").trim()}`];
  if (!patch) return template;

  const merged = { ...template };
  if (typeof patch.title === "string" && patch.title.trim()) merged.title = patch.title;
  if (Array.isArray(patch.analysisAngles) && patch.analysisAngles.length) merged.analysisAngles = patch.analysisAngles;
  if (Array.isArray(patch.questionPatterns) && patch.questionPatterns.length) merged.questionPatterns = patch.questionPatterns;

  return merged;
}

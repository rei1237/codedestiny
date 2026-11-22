// Trait-First 1차(사주 6종) 공용 진입점. 순수 모듈 — DB·LLM 의존 없음.
// 🔴 플래그 OFF(기본)면 빈 배열 — 기존 프롬프트가 바이트 단위로 같다(V1 sha256 고정 테스트 유지).
// 🔴 생성 시작 때 llmMeta.traitFirst 로 고정한다. 키가 없는 기존 문서·진행 중 문서는 끝까지 OFF 로 간다
//    (재개·다시 시도 중에 플래그가 바뀌어도 장마다 근거가 섞이지 않는다).
// 🔴 전달·완성 판정·환불을 바꾸지 않는다. 검증기는 기록만 한다(게이트 B 설계 제약 4).
// 켜기: worker/lib/engine-rollout.js ENGINE_ROLLOUT_FLAGS 에 TRAIT_FIRST_SAJU:'true' 한 줄을 넣는다.
// 되돌리기: 그 줄을 지우는 revert. [vars] 에 같은 키가 있으면 그 값이 이긴다.
import { buildSajuTraitProfile, checkTraitFirstSection, sajuTraitProfilePromptLines, softenTraitDoubleHedges, TRAIT_FIRST_META } from './saju.js';

export const TRAIT_FIRST_SAJU_FLAG = 'TRAIT_FIRST_SAJU';
export { softenTraitDoubleHedges, TRAIT_FIRST_META };

/** 요청 시점 선택: 'v1' | null. */
export function selectTraitFirst(env) {
  return env && typeof env === 'object' && env[TRAIT_FIRST_SAJU_FLAG] === 'true' ? TRAIT_FIRST_META : null;
}

/**
 * 생성 상태(llmMeta 등)에 저장할 값. existing 이 있으면 저장값을 따르고, 키가 없으면(도입 전 시작) null.
 * existing 이 없으면(새 세션) 요청 시점 값.
 */
export function pinTraitFirst(existing, env) {
  if (existing && typeof existing === 'object') return existing.traitFirst === TRAIT_FIRST_META ? TRAIT_FIRST_META : null;
  return selectTraitFirst(env);
}

/**
 * 성향 장 프롬프트에 덧붙일 근거 줄. traitFirst 가 'v1' 이 아니면 [].
 * @param {object} chart buildSajuTemperamentProfile 이 받는 계산 사실
 * @param {{traitFirst?:string|null, seed?:string, fiveElements?:object}} options
 */
export function sajuTraitFirstLines(chart, { traitFirst = null, seed = '', fiveElements } = {}) {
  if (traitFirst !== TRAIT_FIRST_META || !chart || typeof chart !== 'object') return [];
  try {
    return sajuTraitProfilePromptLines(buildSajuTraitProfile(chart, { seed, fiveElements }));
  } catch {
    // 근거 블록 실패가 생성 실패가 되면 안 된다 — 결과 미제공이 최악이다. 기존 프롬프트로 간다.
    return [];
  }
}

/**
 * Shadow 검증 — 로그용 값만 돌려준다. 결과 본문·전달·완성 판정에 쓰지 않는다. 절대 throw 하지 않는다.
 * @returns {null|{traitFirst:string, ok:boolean, issues:string[], headline:string}}
 */
export function traitFirstShadowCheck(chart, text, { traitFirst = null, seed = '', fiveElements } = {}) {
  if (traitFirst !== TRAIT_FIRST_META) return null;
  try {
    const profile = buildSajuTraitProfile(chart || {}, { seed, fiveElements });
    if (!profile) return { traitFirst, ok: false, issues: ['profile_unavailable'], headline: '' };
    return { traitFirst, ...checkTraitFirstSection(text, profile), headline: profile.headline.key };
  } catch {
    return { traitFirst, ok: false, issues: ['shadow_check_error'], headline: '' };
  }
}

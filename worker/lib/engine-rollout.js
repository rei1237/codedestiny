// 승인 엔진 전환 스위치(docs/engine-audit/29-production-rollout.md).
// 🔴 [vars] 에 올리지 않는 이유: 워커 텍스트 바인딩 예산(128, 여유 2 유지)이 이미 꽉 차 있다 —
//    scripts/lib/worker-binding-budget.mjs. 이 표는 바인딩을 쓰지 않는다.
// 새 요청에만 적용되고 저장된 결과는 각자의 핀을 따른다. 되돌리기는 이 표의 줄을 지우는 revert 다.
// 천문 계산을 독립 검증하지 못한 ASTROLOGY·VEDIC·SUKUYO 의 소비자 사실 플래그는 일부러 뺐다.
export const ENGINE_ROLLOUT_FLAGS = Object.freeze({
  SAJU_GYEOKGUK_AUTHORITY_V2: 'true',
  ZIWEI_CALENDAR_AUTHORITY_V2: 'true',
  YEONGNYANGI_NATAL_PROFILE_V1: 'true',
  SAJU_CONSUMER_FACTS_V1: 'true',
  ZIWEI_CONSUMER_FACTS_V1: 'true',
  TAROT_CONSUMER_FACTS_V1: 'true',
  // 숙요 영냥이 개인 질문의 신규 주문만 IMD 검증 구간 계산을 쓴다(사용자 결정 2026-11-07). 기존 주문은 저장 핀을 따른다.
  SUKUYO_IMD_NEW_ORDERS_V1: 'true',
  // 질문 직답·마스터 조언 렌즈(worker/lib/consultation-answer-contract.js). 생성 시작 때 고정되어 재개 중에는 바뀌지 않는다.
  CONSULTATION_ANSWER_VOICE_V1: 'true',
});

const rolledOut = new WeakMap();

// 격리 안에서 env 동일성을 유지한다. [vars] 에 같은 키가 있으면 그 값이 이긴다.
export function engineRolloutEnv(env) {
  if (!env || typeof env !== 'object') return env;
  let next = rolledOut.get(env);
  if (!next) {
    next = { ...ENGINE_ROLLOUT_FLAGS, ...env };
    rolledOut.set(env, next);
  }
  return next;
}

// fetch·queue·scheduled 는 모두 (입력, env, ctx) 형태다.
export function withEngineRollout(handlers) {
  return Object.fromEntries(Object.entries(handlers).map(([name, handler]) => [
    name,
    (input, env, ...rest) => handler.call(handlers, input, engineRolloutEnv(env), ...rest),
  ]));
}

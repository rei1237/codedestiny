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
  // SUKUYO_IMD_NEW_ORDERS_V1 은 다시 껐다(2026-11-07). 켜면 검증 구간 밖 출생의 영냥이 숙요 무료 운세·개인 질문이
  // PRECISION_UNAVAILABLE 503 으로 막힌다. 범위 밖을 기존 계산으로 넘기도록 provider 를 고친 뒤에만 다시 켠다.
  // 질문 직답·마스터 조언 렌즈(worker/lib/consultation-answer-contract.js). 생성 시작 때 고정되어 재개 중에는 바뀌지 않는다.
  CONSULTATION_ANSWER_VOICE_V1: 'true',
  // Trait-First 1차 6종 성향 장 근거 주입(worker/lib/trait-profile/). 새 세션만 시작 때 고정, 진행 중·옛 세션은 OFF 로 끝난다.
  // 골든셋: docs/handoff/trait-first-phase5-verification.md (2026-11-22 게이트 C 승인).
  TRAIT_FIRST_SAJU: 'true',
  // 정본 신살 사실 블록(lib/saju/natal-core/shinsal/) 주입. 값은 소비처 id CSV, 'true' 는 전부 켠다. 빈 값이면 전부 끈다.
  // 소비처는 shinsalFactsOn(env, id) 로만 읽는다. 블록은 프롬프트 때 계산되고 해시·다이제스트에 넣지 않는다.
  SAJU_SHINSAL_FACTS_V1: 'prompt-hub,free-saju,natal-static,saju-ai,new-year,life-book,heukwol,neo,tea-house,love-codex,karma,guardian,fusion,saju-compat',
  // 정본 액땜 케이스(lib/saju/remedy/) 주입·카드. 값은 소비처 id CSV(today-saju, natal-static, samjae, new-year, heukwol,
  // tea-house, ziwei-ai), 'true' 는 전부 켠다. 빈 값이면 전부 끈다. 소비처는 remedyFactsOn(env, id) 로만 읽는다.
  SAJU_REMEDY_FACTS_V1: 'today-saju,natal-static,samjae,new-year,heukwol,tea-house,ziwei-ai',
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

// 인생 보정(docs/context/life-calibration.md) 스위치. 위 표에 일부러 넣지 않았다 = 기본 OFF.
// 켤 때는 LIFE_CALIBRATION_V1 에 소비처 id CSV(api, saju-ai, ...) 또는 'true' 를 넣는다. 출시 선행 조건: 처리방침 국외이전 고지 시행.
export function lifeCalibrationOn(env, id) {
  const raw = String(env?.LIFE_CALIBRATION_V1 ?? '').trim();
  if (!raw) return false;
  if (raw === 'true') return true;
  const want = String(id || '').trim();
  if (!want) return false;
  return raw.split(',').map((part) => part.trim()).filter(Boolean).includes(want);
}

// 신살 사실 블록 소비처 스위치. env.SAJU_SHINSAL_FACTS_V1 이 'true' 면 전부, CSV 면 목록에 든 id 만 켠다.
export function shinsalFactsOn(env, id) {
  const raw = String(env?.SAJU_SHINSAL_FACTS_V1 ?? '').trim();
  if (!raw) return false;
  if (raw === 'true') return true;
  const want = String(id || '').trim();
  if (!want) return false;
  return raw.split(',').map((part) => part.trim()).filter(Boolean).includes(want);
}

// 신살 블록 핀. 새 기록·세션을 만들 때 selectShinsalFacts 값을 meta.shinsalFacts 에 넣고,
// 생성·재시도·재개는 shinsalFactsPinned 로 읽는다. 키 없는 기존 기록은 플래그를 켜도 영구 off,
// 핀이 있어도 플래그를 끄면 off(킬 스위치). 블록 자체는 프롬프트 때 계산하고 meta 에 저장하지 않는다.
export const SHINSAL_FACTS_META = 'shinsal-facts-v1';

export function selectShinsalFacts(env, id) {
  return shinsalFactsOn(env, id) ? SHINSAL_FACTS_META : null;
}

export function shinsalFactsPinned(meta, env, id) {
  return meta?.shinsalFacts === SHINSAL_FACTS_META && shinsalFactsOn(env, id);
}

// 액땜 소비처 스위치. env.SAJU_REMEDY_FACTS_V1 이 'true' 면 전부, CSV 면 목록에 든 id 만 켠다.
export function remedyFactsOn(env, id) {
  const raw = String(env?.SAJU_REMEDY_FACTS_V1 ?? '').trim();
  if (!raw) return false;
  if (raw === 'true') return true;
  const want = String(id || '').trim();
  if (!want) return false;
  return raw.split(',').map((part) => part.trim()).filter(Boolean).includes(want);
}

// 액땜 핀. 새 기록·세션을 만들 때 selectRemedyFacts 값을 meta.remedyFacts 에 넣고, 생성·재시도·재개는
// remedyFactsPinned 로 읽는다. 키 없는 기존 기록은 플래그를 켜도 영구 off, 핀이 있어도 플래그를 끄면 off(킬 스위치).
export const REMEDY_FACTS_META = 'remedy-facts-v1';

export function selectRemedyFacts(env, id) {
  return remedyFactsOn(env, id) ? REMEDY_FACTS_META : null;
}

export function remedyFactsPinned(meta, env, id) {
  return meta?.remedyFacts === REMEDY_FACTS_META && remedyFactsOn(env, id);
}

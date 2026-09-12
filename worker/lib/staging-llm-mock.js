/**
 * 스테이징 LLM mock 활성 여부를 판정하는 **정본** 순수 함수.
 * gemini.js를 부분 mock하는 Jest 테스트와 결합하지 않도록 별도 모듈로 둔다.
 *
 * 세 조건을 모두 요구한다. 플래그만 복사되거나 APP_ENV가 운영으로 바뀌면 mock이 켜지지
 * 않아야 하며, Workers AI도 동시에 켜져 있으면 안 된다.
 *
 * 🔴 이 판정을 다시 구현하지 않는다. 워커 라우트·lib/llm-client.ts·lib/tarot/*.mjs 가
 *    전부 이 파일을 import 한다. 유일한 예외는 CJS 라 ESM 을 물 수 없는 jest 목
 *    (__tests__/__mocks__/llm-client.js)이며, 그 사본은 verify:staging-llm-mock 의
 *    진리표가 이 파일과 대조한다.
 */
export function isStagingLlmMockEnabled(env = {}) {
  const appEnv = String(env?.APP_ENV || "").trim().toLowerCase();
  const flag = String(env?.STAGING_LLM_MOCK_ENABLED || "").trim().toLowerCase();
  const workersAi = String(env?.WORKERS_AI_ENABLED || "").trim().toLowerCase();
  return appEnv === "staging"
    && ["1", "true", "on", "yes"].includes(flag)
    && ["0", "false", "off", "no"].includes(workersAi);
}

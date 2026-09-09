/**
 * 스테이징 LLM mock 활성 여부를 판정하는 순수 함수.
 * gemini.js를 부분 mock하는 Jest 테스트와 결합하지 않도록 별도 모듈로 둔다.
 */
export function isStagingLlmMockEnabled(env = {}) {
  const appEnv = String(env?.APP_ENV || "").trim().toLowerCase();
  const flag = String(env?.STAGING_LLM_MOCK_ENABLED || "").trim().toLowerCase();
  const workersAi = String(env?.WORKERS_AI_ENABLED || "").trim().toLowerCase();
  return appEnv === "staging"
    && ["1", "true", "on", "yes"].includes(flag)
    && ["0", "false", "off", "no"].includes(workersAi);
}

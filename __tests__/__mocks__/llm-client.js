// lib/llm-client.ts는 TypeScript interface 문법을 쓰는데, 이 레포의 Jest 설정에는
// TypeScript 프리셋이 없어(package-lock.json 변경 없이 새 devDependency를 추가할 수 없음)
// worker/lib/gemini.js -> lib/llm-client.ts를 거치는 모든 테스트가 파싱 단계에서 깨진다.
// 테스트에서는 실제 Gemini 호출이 필요 없으므로 jest.config.cjs의 moduleNameMapper로
// 이 스텁으로 대체한다. 루트 package.json이 "type": "commonjs"이므로 CJS 문법을 쓴다.
async function callLLM() {
  throw new Error("callLLM is not available in the test environment (see __tests__/__mocks__/llm-client.js).");
}

// 🔴 worker/lib/gemini.js 가 named import 로 가져가므로 여기 없으면 **파싱 단계에서** 깨진다
//    ("does not provide an export named ..."). 그러면 gemini.js 를 거치는 라우트 테스트가
//    기능과 무관하게 전부 실패한다 — 실제로 19개 스위트가 그렇게 넘어졌다.
//    null 을 돌려주는 것이 "컨텍스트 캐시 없음" = 기존 동작이므로 테스트 기대값이 바뀌지 않는다.
//    컨텍스트 캐시 자체의 계약은 scripts/verify-llm-token-usage.mjs 와
//    scripts/verify-saju-ai-section-plan.mjs 가 진짜 구현으로 검증한다.
async function createGeminiContextCache() {
  return null;
}

async function deleteGeminiContextCache() {
  // no-op
}

module.exports = { callLLM, createGeminiContextCache, deleteGeminiContextCache };

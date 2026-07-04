// lib/llm-client.ts는 TypeScript interface 문법을 쓰는데, 이 레포의 Jest 설정에는
// TypeScript 프리셋이 없어(package-lock.json 변경 없이 새 devDependency를 추가할 수 없음)
// worker/lib/gemini.js -> lib/llm-client.ts를 거치는 모든 테스트가 파싱 단계에서 깨진다.
// 테스트에서는 실제 Gemini 호출이 필요 없으므로 jest.config.cjs의 moduleNameMapper로
// 이 스텁으로 대체한다. 루트 package.json이 "type": "commonjs"이므로 CJS 문법을 쓴다.
async function callLLM() {
  throw new Error("callLLM is not available in the test environment (see __tests__/__mocks__/llm-client.js).");
}

module.exports = { callLLM };

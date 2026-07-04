// astronomy-engine의 package.json "exports"는 import 조건을 esm/astronomy.js로 연결하지만,
// 그 패키지에는 "type": "module"이 없어 Jest의 ESM 로더가 이를 CJS로 오인해
// "Unexpected export statement in CJS module" 에러를 낸다. CJS 진입점으로 강제 매핑해 우회한다.
//
// lib/llm-client.ts는 TypeScript interface 문법을 쓰는데 이 레포의 Jest에는 TS 프리셋이 없다
// (package-lock.json을 건드리지 않고는 새 devDependency를 추가할 수 없음). worker/lib/gemini.js를
// 거쳐 이 파일을 임포트하는 테스트가 모두 파싱 단계에서 깨지므로, 실제 LLM 호출이 필요 없는
// 테스트 환경에서는 스텁으로 대체한다.
module.exports = {
  moduleNameMapper: {
    "^astronomy-engine$": "<rootDir>/node_modules/astronomy-engine/astronomy.js",
    "^\\.\\./\\.\\./lib/llm-client\\.ts$": "<rootDir>/__tests__/__mocks__/llm-client.js",
  },
};

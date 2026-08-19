// astronomy-engine의 package.json "exports"는 import 조건을 esm/astronomy.js로 연결하지만,
// 그 패키지에는 "type": "module"이 없어 Jest의 ESM 로더가 이를 CJS로 오인해
// "Unexpected export statement in CJS module" 에러를 낸다. CJS 진입점으로 강제 매핑해 우회한다.
//
// lib/llm-client.ts는 TypeScript interface 문법을 쓰는데 이 레포의 Jest에는 TS 프리셋이 없다
// (package-lock.json을 건드리지 않고는 새 devDependency를 추가할 수 없음). worker/lib/gemini.js를
// 거쳐 이 파일을 임포트하는 테스트가 모두 파싱 단계에서 깨지므로, 실제 LLM 호출이 필요 없는
// 테스트 환경에서는 스텁으로 대체한다.
module.exports = {
  roots: ["<rootDir>/__tests__"],
  moduleNameMapper: {
    "^astronomy-engine$": "<rootDir>/node_modules/astronomy-engine/astronomy.js",
    "^\\.\\./\\.\\./lib/llm-client\\.ts$": "<rootDir>/__tests__/__mocks__/llm-client.js",
    // lib/cms/build-text.ts 도 같은 이유로 대역한다 — constants/*.js 같은 순수 JS 모듈이
    // CMS 폴백 유틸을 물면서 파싱 단계에서 깨졌다. 테스트 환경엔 발행본이 없으므로
    // "항상 코드 기본값을 돌려준다"는 대역이 실제 동작과 정확히 같다.
    "(^|/)lib/cms/build-text(\\.ts)?$": "<rootDir>/__tests__/__mocks__/cms-build-text.js",
    "\\.wasm$": "<rootDir>/__tests__/__mocks__/swisseph-wasm-binary.js",
  },
  // __tests__ 아래에 러너가 다른 파일들이 섞여 있다. 걸러내지 않으면 jest 가 이들을 테스트로
  // 수집해 "must contain at least one test"로 실패시키고, 그 상시 빨간불이 진짜 실패를 가린다.
  testPathIgnorePatterns: [
    "/node_modules/",
    // 목 모듈 — 테스트가 아니라 moduleNameMapper 의 대체 구현이다.
    "[\\\\/]__tests__[\\\\/]__mocks__[\\\\/]",
    "[\\\\/]__tests__[\\\\/]fixtures[\\\\/]",
    "[\\\\/]__tests__[\\\\/]guardian-fortune[\\\\/]contract\\.test\\.js$",
    // node:test 로 작성된 정적 검사들. `npm run test:node` 가 돌린다.
    "[\\\\/]__tests__[\\\\/]ui[\\\\/]",
    "[\\\\/]__tests__[\\\\/]fortune[\\\\/]maya-calendar\\.test\\.js$",
    "[\\\\/]__tests__[\\\\/]fortune[\\\\/]kst-business-date\\.test\\.js$",
  ],
};

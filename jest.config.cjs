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
    "\\.wasm$": "<rootDir>/__tests__/__mocks__/swisseph-wasm-binary.js",
  },
  // __tests__ 아래에 러너가 다른 파일들이 섞여 있다. 걸러내지 않으면 jest 가 이들을 테스트로
  // 수집해 "must contain at least one test"로 실패시키고, 그 상시 빨간불이 진짜 실패를 가린다.
  testPathIgnorePatterns: [
    "/node_modules/",
    // 목 모듈 — 테스트가 아니라 moduleNameMapper 의 대체 구현이다.
    "<rootDir>/__tests__/__mocks__/",
    // node:test 로 작성된 정적 검사들. `npm run test:node` 가 돌린다.
    "<rootDir>/__tests__/ui/",
    "<rootDir>/__tests__/fortune/maya-calendar\\.test\\.js$",
    // 대상이 사라진 테스트: app/api/auth/withdraw/route.js 는 워커(worker/routes/auth.js)로
    // 이관되면서 삭제됐다. 이 파일은 없는 모듈을 import 하므로 영원히 실패한다.
    // 워커 라우트 기준으로 다시 쓰거나 삭제할지 결정이 필요하다(AUDIT.md 참고).
    "<rootDir>/__tests__/api/auth/withdraw\\.test\\.js$",
  ],
};

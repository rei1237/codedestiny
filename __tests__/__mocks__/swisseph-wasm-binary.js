// worker/lib/swiss-ephemeris.js는 Cloudflare Workers의 런타임 WASM 코드 생성 제한
// (WebAssembly.instantiate(): Wasm code generation disallowed by embedder)을 피하기 위해
// swisseph.wasm을 빌드 타임 ES 모듈로 import한다. Jest(Node)는 .wasm 파일을 모듈로 로드할
// 수 없으므로, 이 테스트 환경에서 실제로 사용되지 않는 astro-swiss-url-builder 테스트를 위해
// jest.config.cjs의 moduleNameMapper로 더미 값으로 대체한다.
module.exports = {};

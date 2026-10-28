// jest setupFilesAfterEnv — 결제 증빙 claim 메모리 대역(__tests__/__mocks__/billing-evidence-claim-store.js)을
// 매 테스트 전에 비운다. 같은 증빙 ID 를 다른 requestId 로 쓰는 테스트끼리 서로의 claim 에 걸리지 않게 한다.
beforeEach(() => {
  if (globalThis.__cdBillingEvidenceClaims instanceof Map) globalThis.__cdBillingEvidenceClaims.clear();
});

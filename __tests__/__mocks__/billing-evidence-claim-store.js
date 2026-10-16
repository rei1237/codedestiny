// worker/lib/billing-evidence-claim-store.js 의 메모리 대역(jest moduleNameMapper).
// 저장소는 테스트 파일마다 새로 생기고(jest 의 파일별 전역), 매 테스트 전에 비운다
// (scripts/lib/billing-evidence-claim-test-reset.cjs). 테스트가 직접 들여다볼 때는 __billingEvidenceClaims 를 쓴다.
// 루트 package.json 이 "type": "commonjs" 라 CJS 문법을 쓴다.
const store = () => {
  if (!(globalThis.__cdBillingEvidenceClaims instanceof Map)) globalThis.__cdBillingEvidenceClaims = new Map();
  return globalThis.__cdBillingEvidenceClaims;
};

exports.BILLING_EVIDENCE_CLAIM_COLLECTION = "billing_evidence_claims";
exports.__billingEvidenceClaims = () => store();

exports.insertBillingEvidenceClaim = async (_env, doc) => {
  if (store().has(doc._id)) return false;
  store().set(doc._id, { ...doc });
  return true;
};

exports.findBillingEvidenceClaim = async (_env, id) => {
  const row = store().get(id);
  return row ? { ...row } : null;
};

exports.deleteBillingEvidenceClaims = async (_env, ids, { userId, requestId }) => {
  let deleted = 0;
  for (const id of ids) {
    const row = store().get(id);
    if (row && row.userId === userId && row.requestId === requestId) {
      store().delete(id);
      deleted += 1;
    }
  }
  return deleted;
};

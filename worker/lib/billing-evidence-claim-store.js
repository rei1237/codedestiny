import { connectDb, mongoose } from "./db.js";
import { scopeConnection } from "./db-scope-connection.js";

// billing-evidence-claim.js 의 저장 계층. 네이티브 컬렉션 하나 — 유일성은 기본 `_id` 인덱스가 보장하므로
// autoIndex:false 인 운영에서도 인덱스 마이그레이션이 필요 없다. 테스트는 jest moduleNameMapper 로
// 메모리 대역(__tests__/__mocks__/billing-evidence-claim-store.js)으로 바꾼다.
export const BILLING_EVIDENCE_CLAIM_COLLECTION = "billing_evidence_claims";

async function collection(env) {
  await connectDb(env);
  return (scopeConnection() || mongoose.connection).db.collection(BILLING_EVIDENCE_CLAIM_COLLECTION);
}

/** 새로 잡았으면 true, 이미 있으면(중복 키) false. 그 밖의 오류는 던진다. */
export async function insertBillingEvidenceClaim(env, doc) {
  try {
    await (await collection(env)).insertOne(doc);
    return true;
  } catch (error) {
    if (Number(error?.code) === 11000) return false;
    throw error;
  }
}

export async function findBillingEvidenceClaim(env, id) {
  return (await collection(env)).findOne({ _id: id });
}

/** 이 요청(userId·requestId)이 잡은 claim 만 지운다. */
export async function deleteBillingEvidenceClaims(env, ids, { userId, requestId }) {
  const result = await (await collection(env)).deleteMany({ _id: { $in: ids }, userId, requestId });
  return Number(result?.deletedCount || 0);
}

// 별빛 운영본부(ops-hq) 컬렉션 접근자.
//
// 🔴 mongoose 모델을 만들지 않고 드라이버 컬렉션을 직접 쓴다 — autoIndex:false 환경에서 정합성은
//    전부 결정적 _id(고유 인덱스가 기본으로 있다)로 지킨다. 조회 성능 인덱스는
//    scripts/migrations/20261009-add-ops-hq-indexes.mjs 로 따로 만든다(승인 후 실행).
// 🔴 결제 컬렉션(payments 등)은 여기서 **읽기만** 한다. 쓰는 곳은 ops_* 뿐이다.

import { connectDb, mongoose } from "../lib/db.js";
import { scopeConnection } from "../lib/db-scope-connection.js";

export const BUSINESS_ID = "code-destiny";

export const OPS_COLLECTIONS = Object.freeze({
  quests: "ops_quests",
  evidence: "ops_quest_evidence",
  ledger: "ops_xp_ledger",
  xpState: "ops_xp_state",
  revenueFacts: "ops_revenue_facts",
  traffic: "ops_traffic_snapshots",
  achievements: "ops_achievements",
  settings: "ops_hq_settings",
  syncState: "ops_sync_state",
});

/** 연결이 열린 뒤에 부른다. 테스트는 같은 모양의 가짜 컬렉션 묶음을 넘긴다. */
export function opsCollections() {
  const db = (scopeConnection() || mongoose.connection).db;
  return Object.fromEntries(Object.entries(OPS_COLLECTIONS).map(([key, name]) => [key, db.collection(name)]));
}

export async function openOpsCollections(env) {
  await connectDb(env);
  return opsCollections();
}

export function isDuplicateKeyError(error) {
  return Number(error?.code) === 11000;
}

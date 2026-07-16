// READ-ONLY 진단: monthly_credit_ledger의 unique 인덱스 실재 여부와 sourceId 중복 실태를 보고한다.
//
// 왜 필요한가: worker/lib/db.js는 autoIndex:false로 연결하므로 models.js의 index() 선언만으로는
// 실제 인덱스가 생성되지 않는다. 그런데 monthlyCreditLedgerSchema를 대상으로 하는 마이그레이션이
// 하나도 없다 → {userId,type,sourceId} unique가 프로덕션에 없을 가능성이 높다. 이게 사실이면
// 월정석 이중차감의 최종 방어는 User.recentConsumeRequestIds 마커 '단독'이므로, 그 배열에 상한을
// 거는 작업(캡)을 인덱스보다 먼저 배포하면 안 된다.
//
// 이 스크립트는 아무것도 쓰지 않는다(getIndexes + aggregate만).
//
//   node scripts/check-monthly-credit-ledger-indexes.mjs
import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";
import { MonthlyCreditLedger } from "../worker/lib/models.js";

config({ path: ".env.local" });
config({ path: ".env" });

const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || process.env.DB_NAME || "",
  MONGO_SERVER_SELECTION_TIMEOUT_MS: process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || "10000",
  MONGO_CONNECT_TIMEOUT_MS: process.env.MONGO_CONNECT_TIMEOUT_MS || "10000",
  MONGO_SOCKET_TIMEOUT_MS: process.env.MONGO_SOCKET_TIMEOUT_MS || "45000",
  MONGO_WORKER_CONNECT_GUARD_MS: process.env.MONGO_WORKER_CONNECT_GUARD_MS || "15000",
  MONGO_MAX_POOL_SIZE: process.env.MONGO_MAX_POOL_SIZE || "5",
  MONGO_IP_FAMILY: process.env.MONGO_IP_FAMILY || "4",
  MONGO_IP_FAMILY_AUTO_FALLBACK: process.env.MONGO_IP_FAMILY_AUTO_FALLBACK || "true",
};

if (!env.MONGO_URI && !env.MONGODB_URI) {
  console.error("MONGO_URI or MONGODB_URI is required.");
  process.exit(1);
}

const TAG = "[check-monthly-credit-ledger-indexes]";

await connectDb(env);

try {
  const collection = MonthlyCreditLedger.collection;

  const indexes = await collection.indexes();
  console.log(`${TAG} collection=${collection.collectionName}`);
  console.log(`${TAG} --- indexes (${indexes.length}) ---`);
  for (const idx of indexes) {
    console.log(`  ${idx.name}  key=${JSON.stringify(idx.key)}  unique=${Boolean(idx.unique)}${idx.partialFilterExpression ? `  partial=${JSON.stringify(idx.partialFilterExpression)}` : ""}`);
  }

  // 정본 스펙: models.js monthlyCreditLedgerSchema.index({userId:1,type:1,sourceId:1},{unique:true})
  const spendUnique = indexes.find((idx) => idx.unique === true
    && JSON.stringify(idx.key) === JSON.stringify({ userId: 1, type: 1, sourceId: 1 }));

  console.log(`${TAG} --- verdict ---`);
  console.log(spendUnique
    ? `${TAG} WORLD B: {userId,type,sourceId} unique EXISTS (name=${spendUnique.name})`
    : `${TAG} WORLD A: {userId,type,sourceId} unique MISSING — 마커가 이중차감 최종 방어. 캡(①)을 인덱스보다 먼저 배포하면 안 됨`);

  // 중복 실태 — 환불행/미환불행 분리 집계.
  // 환불행 중복은 마이그레이션 백필(sourceId 재기입)이 치유한다.
  // 미환불행 중복은 사람이 판단해야 하므로 자동 병합하지 않는다.
  const dupes = await collection
    .aggregate([
      { $match: { type: "MONTHLY_CREDIT_SPEND" } },
      {
        $group: {
          _id: { userId: "$userId", sourceId: "$sourceId" },
          count: { $sum: 1 },
          refunded: { $sum: { $cond: [{ $eq: ["$metadata.refundedForUnlockFailure", true] }, 1, 0] } },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ])
    .toArray();

  const totalSpend = await collection.countDocuments({ type: "MONTHLY_CREDIT_SPEND" });
  const refundedSpend = await collection.countDocuments({
    type: "MONTHLY_CREDIT_SPEND",
    "metadata.refundedForUnlockFailure": true,
  });

  console.log(`${TAG} --- MONTHLY_CREDIT_SPEND rows: ${totalSpend} (refunded: ${refundedSpend}) ---`);
  if (dupes.length === 0) {
    console.log(`${TAG} duplicate (userId,sourceId) groups: 0 → 마이그레이션이 abort 없이 통과할 전망`);
  } else {
    console.log(`${TAG} duplicate (userId,sourceId) groups: ${dupes.length}${dupes.length === 50 ? "+ (표시 상한 50)" : ""}`);
    let healable = 0;
    let manual = 0;
    for (const g of dupes) {
      // 환불행을 빼고도 2건 이상 남으면 백필로 못 고친다 → 사람 판단 필요.
      const remainingAfterBackfill = g.count - g.refunded;
      if (remainingAfterBackfill > 1) manual += 1; else healable += 1;
      console.log(`  userId=${g._id.userId} sourceId=${g._id.sourceId} count=${g.count} refunded=${g.refunded}${remainingAfterBackfill > 1 ? "  ← MANUAL" : "  (backfill로 치유)"}`);
    }
    console.log(`${TAG} → 백필로 치유 가능: ${healable} / 사람 판단 필요: ${manual}`);
  }
} finally {
  await mongoose.disconnect();
}

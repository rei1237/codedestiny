/**
 * 복합 인덱스의 접두(prefix)라 읽기 성능 손실 없이 지울 수 있는 단일 필드 인덱스 11개를 드롭한다.
 * Atlas Performance Advisor(2026-08-20, M10 클러스터)가 "Redundant"로 분류한 것과 동일한
 * 집합이며, 같은 커밋에서 `worker/lib/models.js`의 해당 필드 `index: true` 선언도 제거했다.
 *
 * 각 대상은 이미 존재하는 복합 인덱스가 그 필드를 접두로 가진다:
 *   profilecards.userId_1                  ⊂ {userId:1, createdAt:1}
 *   payments.userId_1                      ⊂ {userId:1, createdAt:-1}
 *   monthly_credit_ledger.userId_1         ⊂ {userId:1, createdAt:-1}
 *   content_entitlements.userId_1          ⊂ {userId:1, serviceKey:1, status:1, expiresAt:1}
 *   paymentfailurelogs.source_1            ⊂ {source:1, createdAt:-1}
 *   payment_webhook_events.paymentId_1     ⊂ {paymentId:1, createdAt:-1}
 *   abuse_scores.userId_1                  ⊂ {userId:1, endpoint:1, updatedAt:-1}
 *   neoOperationRoomConsultations.userId_1 ⊂ {userId:1, createdAt:-1}
 *   user_rpg_progresses.userId_1           ⊂ {userId:1, updatedAt:-1} / {userId:1, currentLevel:1}
 *   user_daily_quest_logs.userId_1         ⊂ {userId:1, questDateKst:1}
 *   insights.type_1                        ⊂ {type:1, status:1, updatedAt:-1}
 *
 * 🔴 안전장치: 키가 정확히 일치하고 unique 가 아니며 _id_ 가 아닐 때만 드롭한다.
 *    unique 제약 인덱스(impUid/merchantUid 등)는 절대 건드리지 않는다.
 *    존재하지 않으면 조용히 SKIP — 재실행 안전(idempotent).
 *
 * 사용: node scripts/migrations/20260820-drop-redundant-prefix-indexes.mjs [--check]
 *   --check 는 읽기 전용(드롭하지 않고 현재 존재 여부만 보고).
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";

config({ path: ".env.local" }); config({ path: ".env" });
const check = process.argv.includes("--check");
const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
};
if (!env.MONGO_URI) { console.error("MONGO_URI or MONGODB_URI is required."); process.exit(1); }

// [collection, redundant single-field key]
const TARGETS = [
  ["profilecards", { userId: 1 }],
  ["payments", { userId: 1 }],
  ["monthly_credit_ledger", { userId: 1 }],
  ["content_entitlements", { userId: 1 }],
  ["paymentfailurelogs", { source: 1 }],
  ["payment_webhook_events", { paymentId: 1 }],
  ["abuse_scores", { userId: 1 }],
  ["neoOperationRoomConsultations", { userId: 1 }],
  ["user_rpg_progresses", { userId: 1 }],
  ["user_daily_quest_logs", { userId: 1 }],
  ["insights", { type: 1 }],
];

await connectDb(env);

let dropped = 0, skipped = 0, present = 0, missing = 0;
for (const [collectionName, key] of TARGETS) {
  const collection = mongoose.connection.db.collection(collectionName);
  const label = `${collectionName} ${JSON.stringify(key)}`;
  const indexes = await collection.indexes().catch(() => []);
  const match = indexes.find((item) => JSON.stringify(item.key) === JSON.stringify(key));

  // 안전장치: unique 인덱스나 _id_ 는 접두 중복 대상이 아니므로 절대 드롭하지 않는다.
  const droppable = match && match.unique !== true && match.name !== "_id_";

  if (check) {
    if (match) { present += 1; console.log(`PRESENT ${label} (name=${match.name}${match.unique ? ", unique" : ""})`); }
    else { missing += 1; console.log(`ABSENT  ${label}`); }
    continue;
  }

  if (!droppable) {
    skipped += 1;
    console.log(`SKIP ${label} ${match ? "(unique/protected)" : "(not present)"}`);
    continue;
  }

  try {
    await collection.dropIndex(match.name);
    dropped += 1;
    console.log(`DROPPED ${label} (name=${match.name})`);
  } catch (error) {
    console.error(`FAILED ${label}: ${error?.codeName || error?.code || ""} ${error?.message || error}`);
    process.exitCode = 1;
  }
}

console.log(check ? `[check] present=${present} absent=${missing}` : `[apply] dropped=${dropped} skipped=${skipped}`);
await mongoose.disconnect();

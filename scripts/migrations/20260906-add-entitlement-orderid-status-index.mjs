/**
 * MongoDB 마이그레이션 — content_entitlements {orderId:1, status:1} 인덱스. 자동 실행되지 않는다.
 *
 * 근거: M10 Phase 2 #4 (C:\Users\user\.claude\plans\mongodb-warm-conway.md §3).
 *   worker/payments/entitlements.js revokeEntitlementForOrder 가 환불 회수에서
 *   `{ orderId, status: "ACTIVE" }` 로 updateOne 한다. models.js 는 orderId 에 `index:true` 를 선언하지만
 *   db.js 가 autoIndex:false 로 연결하므로 선언만으로는 Atlas 에 인덱스가 생기지 않는다 —
 *   실재 여부와 실제 플랜은 --check 가 explain 으로 보여 준다(읽기 전용).
 *
 * 모드:
 *   --check     인덱스 존재 여부 + 환불 필터의 explain(executionStats) 출력. 쓰기 없음.
 *   (기본)      인덱스 생성. 🔴 사용자 별도 허가 후 1회.
 *   --rollback  같은 이름의 인덱스 삭제.
 *
 * 실행: MONGO_URI="mongodb+srv://..." node scripts/migrations/20260906-add-entitlement-orderid-status-index.mjs [--check|--rollback]
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { ContentEntitlement, CONTENT_ENTITLEMENT_STATUSES } from "../../worker/lib/models.js";

config({ path: ".env.local" });
config({ path: ".env" });

const CHECK = process.argv.includes("--check");
const ROLLBACK = process.argv.includes("--rollback");

const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || process.env.DB_NAME || "",
};

if (!env.MONGO_URI && !env.MONGODB_URI) {
  console.error("❌ MONGO_URI 또는 MONGODB_URI 환경변수가 필요합니다.");
  process.exit(1);
}

// models.js 의 contentEntitlementSchema.index({ orderId: 1, status: 1 }) 선언과 같은 키·이름이어야 한다.
const INDEX_SPEC = { orderId: 1, status: 1 };
const INDEX_NAME = "orderId_1_status_1";

function specKey(spec) {
  return Object.entries(spec).map(([k, v]) => `${k}:${v}`).join(",");
}

function summarizePlan(node, stages = [], indexes = []) {
  if (!node || typeof node !== "object") return { stages, indexes };
  if (node.stage) stages.push(node.stage);
  if (node.indexName) indexes.push(node.indexName);
  for (const child of [node.inputStage, ...(node.inputStages || [])]) summarizePlan(child, stages, indexes);
  return { stages, indexes };
}

async function explainRefundFilter(collection) {
  const sample = await collection.findOne({ orderId: { $gt: "" } }, { projection: { orderId: 1 } });
  if (!sample) { console.log("EXPLAIN  표본 없음(orderId 가 있는 문서 0건)"); return; }
  const filter = { orderId: sample.orderId, status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE };
  const out = await collection.find(filter).explain("executionStats");
  const { stages, indexes } = summarizePlan(out.queryPlanner?.winningPlan);
  const es = out.executionStats || {};
  console.log(`EXPLAIN  ${stages.join(" > ")} index=${indexes.join(",") || "-"} examined=${es.totalDocsExamined ?? "?"} returned=${es.nReturned ?? "?"} ms=${es.executionTimeMillis ?? "?"}`);
}

async function migrate() {
  await connectDb(env);
  const collection = ContentEntitlement.collection;
  console.log(`[db] ${mongoose.connection.db.databaseName} · ${collection.collectionName}`);

  const existing = await collection.indexes().catch(() => []);
  const found = existing.find((index) => specKey(index.key) === specKey(INDEX_SPEC));
  const total = await collection.estimatedDocumentCount().catch(() => -1);
  console.log(`DOCS     ${total}`);

  if (ROLLBACK) {
    if (!found) { console.log(`ABSENT   ${INDEX_NAME} — 지울 것이 없다`); return; }
    await collection.dropIndex(found.name);
    console.log(`DROPPED  ${found.name}`);
    return;
  }

  if (found && found.name !== INDEX_NAME) {
    console.log(`CONFLICT 같은 키의 인덱스가 다른 이름으로 있다: ${found.name}`);
    process.exitCode = 1;
    return;
  }

  if (CHECK) {
    console.log(found ? `OK       ${INDEX_NAME}` : `MISSING  ${INDEX_NAME}`);
    await explainRefundFilter(collection);
    if (!found) process.exitCode = 1;
    return;
  }

  if (found) { console.log(`OK       ${INDEX_NAME} 이미 있음`); return; }
  await collection.createIndex(INDEX_SPEC, { name: INDEX_NAME });
  console.log(`CREATED  ${INDEX_NAME}`);
  await explainRefundFilter(collection);
}

migrate()
  .catch((error) => {
    console.error(`❌ 마이그레이션 실패: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });

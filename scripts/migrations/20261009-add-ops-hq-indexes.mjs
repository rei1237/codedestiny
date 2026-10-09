/**
 * 별빛 운영본부(ops_*) 조회 인덱스.
 *
 * 정합성(중복 보상·중복 퀘스트)은 결정적 _id 로만 지키므로 이 인덱스가 없어도 값은 맞다 — 목록·집계 속도용이다.
 * db.js 는 autoIndex:false 이므로 운영 인덱스는 이 스크립트로만 생긴다.
 * --check 는 읽기 전용이며, --apply 없이 실행하면 아무것도 만들지 않는다. 프로덕션은 승인 후 실행한다.
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { opsCollections } from "../../worker/ops-hq/db.js";

config({ path: ".env.local" });
config({ path: ".env" });

const CHECK = process.argv.includes("--check");
const APPLY = process.argv.includes("--apply");
const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || process.env.DB_NAME || "",
};

const INDEXES = [
  { collection: "quests", spec: { plannedDate: 1 }, options: { name: "ops_quests_planned_date_v1" } },
  { collection: "quests", spec: { status: 1, kind: 1 }, options: { name: "ops_quests_status_kind_v1" } },
  { collection: "quests", spec: { campaignId: 1, origin: 1 }, options: { name: "ops_quests_campaign_origin_v1" } },
  { collection: "quests", spec: { parentId: 1 }, options: { name: "ops_quests_parent_v1", sparse: true } },
  { collection: "evidence", spec: { questId: 1, createdAt: 1 }, options: { name: "ops_evidence_quest_v1" } },
  { collection: "revenueFacts", spec: { xpState: 1, paidAt: -1 }, options: { name: "ops_revenue_xp_state_v1" } },
  { collection: "revenueFacts", spec: { paidDate: 1 }, options: { name: "ops_revenue_paid_date_v1" } },
  { collection: "traffic", spec: { source: 1, propertyId: 1, date: 1 }, options: { name: "ops_traffic_source_date_v1" } },
  { collection: "ledger", spec: { processedAt: 1 }, options: { name: "ops_ledger_processed_v1" } },
  { collection: "ledger", spec: { occurredAt: 1 }, options: { name: "ops_ledger_occurred_v1" } },
];

function specKey(spec) {
  return JSON.stringify(spec);
}

async function main() {
  if (!env.MONGO_URI && !env.MONGODB_URI) throw new Error("MONGO_URI 또는 MONGODB_URI 환경변수가 필요합니다.");
  if (!CHECK && !APPLY) {
    console.log("사용법: node scripts/migrations/20261009-add-ops-hq-indexes.mjs --check | --apply");
    return;
  }
  await connectDb(env);
  const cols = opsCollections();
  let missing = 0;

  for (const index of INDEXES) {
    const collection = cols[index.collection];
    const existing = await collection.indexes().catch((error) => {
      if (error?.codeName === "NamespaceNotFound") return [];
      throw error;
    });
    const found = existing.find((row) => specKey(row.key) === specKey(index.spec));
    if (found) {
      console.log(`OK       ${collection.collectionName}.${index.options.name} (${found.name})`);
      continue;
    }
    missing += 1;
    if (CHECK) console.log(`MISSING  ${collection.collectionName}.${index.options.name}`);
    else {
      await collection.createIndex(index.spec, index.options);
      console.log(`CREATED  ${collection.collectionName}.${index.options.name}`);
    }
  }

  if (CHECK && missing > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(`❌ 운영본부 인덱스 확인 실패: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });

/**
 * AdminAuditLog index migration. Never run automatically; --check is read-only.
 *
 * worker/lib/db.js 는 autoIndex:false 로 연결하므로 스키마의 .index() 선언은 프로덕션에
 * 생성되지 않는다. 감사 로그는 "최근 것부터" 와 "이 행위자가 무엇을 했나" 두 가지로만
 * 읽히므로 인덱스도 그 두 개면 충분하다.
 *
 * 컬렉션 adminauditlogs 는 레거시 Express 시절부터 존재하지만 프로덕션 문서가 0건이라
 * 인덱스 생성 비용이 사실상 없다.
 *
 * 사용: node scripts/migrations/20260812-add-admin-audit-log-indexes.mjs [--check]
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { AdminAuditLog } from "../../worker/lib/models.js";

config({ path: ".env.local" }); config({ path: ".env" });
const check = process.argv.includes("--check");
const env = { MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "", MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "" };
if (!env.MONGO_URI) { console.error("MONGO_URI or MONGODB_URI is required."); process.exit(1); }

const specs = [
  [AdminAuditLog, { createdAt: -1 }, { name: "admin_audit_created_desc" }],
  [AdminAuditLog, { actorLabel: 1, createdAt: -1 }, { name: "admin_audit_actor_created" }],
];

await connectDb(env);
let missing = 0;
for (const [model, key, options] of specs) {
  const label = `${model.collection.collectionName} ${options.name}`;
  const existing = await model.collection.indexes();
  const exists = existing.some((item) => JSON.stringify(item.key) === JSON.stringify(key));
  if (check) {
    console.log(`${exists ? "OK" : "MISSING"} ${label}`);
    if (!exists) missing += 1;
    continue;
  }
  if (exists) { console.log(`SKIP ${label} (already present)`); continue; }
  try {
    await model.collection.createIndex(key, options);
    console.log(`CREATED ${label}`);
  } catch (error) {
    console.error(`FAILED ${label}: ${error?.codeName || error?.code || ""} ${error?.message || error}`);
    process.exitCode = 1;
  }
}
await mongoose.disconnect();
if (check && missing) process.exitCode = 1;

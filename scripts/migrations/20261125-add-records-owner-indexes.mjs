/**
 * MongoDB 마이그레이션 — 다시 보기(/records/, /yeongnyangi/library/) 목록 인덱스. 자동 실행되지 않는다.
 *
 * 목록 조회는 컬렉션마다 { userId } 로 거르고 { createdAt:-1, _id:-1 } 로 정렬해 한 페이지를 읽는다
 * (worker/lib/record-library.js listRecords). 계획 정본은 worker/lib/record-indexes.js 의 recordIndexPlan() 이다.
 * db.js 가 autoIndex:false 로 연결하므로 이 스크립트를 돌리기 전에는 인덱스가 만들어지지 않는다.
 *
 * 기본은 읽기 전용이다: 컬렉션별 인덱스 목록과 추정 문서 수만 읽고, 무엇이 빠졌는지 출력한다.
 * 🔴 --apply 를 붙였을 때만 빠진 인덱스를 createIndex 한다(문서는 건드리지 않는다). 운영 실행은 사용자 별도 허가 후 1회.
 * 롤백: db.<collection>.dropIndex("records_owner_created_id_v1")
 *
 * 실행: MONGO_URI="mongodb+srv://..." node scripts/migrations/20261125-add-records-owner-indexes.mjs [--apply]
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { recordIndexPlan } from "../../worker/lib/record-indexes.js";

config({ path: ".env.local" });
config({ path: ".env" });

const APPLY = process.argv.includes("--apply");

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

const specKey = (spec) => Object.entries(spec).map(([key, value]) => `${key}:${value}`).join(",");

async function migrate() {
  await connectDb(env);
  const db = mongoose.connection.db;
  console.log(`[db] ${db.databaseName} · ${APPLY ? "APPLY (createIndex)" : "dry-run (읽기 전용)"}`);

  const present = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name));
  let missing = 0, conflict = 0, created = 0;
  for (const { collection, keys, name } of recordIndexPlan()) {
    if (!present.has(collection)) {
      console.log(`- ${collection}: 컬렉션 없음 (첫 문서가 생긴 뒤 다시 확인)`);
      continue;
    }
    const handle = db.collection(collection);
    const [indexes, count] = await Promise.all([handle.indexes(), handle.estimatedDocumentCount()]);
    const sameKeys = indexes.find((index) => specKey(index.key) === specKey(keys));
    const sameName = indexes.find((index) => index.name === name);
    const owner = indexes.filter((index) => Object.keys(index.key)[0] === "userId").map((index) => `${index.name}{${specKey(index.key)}}`);
    const facts = `문서 약 ${count}건 · userId 선두 인덱스: ${owner.join(" | ") || "없음"}`;
    if (sameKeys) { console.log(`✓ ${collection}: 있음 (${sameKeys.name}) · ${facts}`); continue; }
    if (sameName) { conflict++; console.log(`✖ ${collection}: 이름은 같지만 키가 다름 {${specKey(sameName.key)}} · ${facts}`); continue; }
    missing++;
    if (!APPLY) { console.log(`· ${collection}: 없음 → ${name}{${specKey(keys)}} 필요 · ${facts}`); continue; }
    await handle.createIndex(keys, { name });
    created++;
    console.log(`+ ${collection}: 생성 ${name}`);
  }
  console.log(`[결과] 누락 ${missing} · 충돌 ${conflict} · 생성 ${created}${APPLY ? "" : " (dry-run: 아무것도 쓰지 않음)"}`);
  if (conflict) process.exitCode = 1;
}

migrate()
  .catch((error) => { console.error("❌", error?.message || error); process.exitCode = 1; })
  .finally(() => mongoose.disconnect().catch(() => {}));

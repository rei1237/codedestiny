/**
 * MongoDB 마이그레이션 — expiresAt TTL 인덱스 드리프트 복구
 *
 * 배경:
 *   idempotency_keys / abuse_scores / refresh_tokens 스키마는 과거 expiresAt 필드에
 *   `index: true`(plain)와 `.index({expiresAt:1},{expireAfterSeconds:0})`(TTL)를 동시에
 *   선언했다. 같은 키의 인덱스가 충돌(IndexOptionsConflict)하면서 프로덕션에는 TTL 이
 *   아닌 plain 인덱스만 생성되어 만료 문서가 자동 삭제되지 않는 상태였다(무한 증가).
 *   models.js 에서 필드 레벨 index:true 를 제거했고, 이 스크립트는 이미 생성된 plain
 *   expiresAt_1 인덱스를 드롭한 뒤 TTL 인덱스로 재생성한다.
 *   (refresh_tokens 는 로그인·토큰회전마다 행이 쌓이고 앱에서 delete 하지 않으므로 TTL
 *    이 유일한 정리 수단 — 드리프트 시 세션 무한 누적.)
 *
 * 실행:
 *   MONGO_URI="mongodb+srv://..." node scripts/migrations/20260705-fix-ttl-index-drift.mjs
 *
 * 주의:
 *   TTL 인덱스가 붙는 즉시 expiresAt 가 과거인 문서는 ~60초 내 삭제된다. 두 컬렉션의
 *   만료 문서(멱등키/레이트리밋 카운터)는 삭제되는 것이 원래 의도된 동작이다.
 *   재실행해도 안전(idempotent) — 이미 TTL 이면 건너뛴다.
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { IdempotencyKey, AbuseScore, RefreshTokenSession } from "../../worker/lib/models.js";

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
  console.error("❌ MONGO_URI 또는 MONGODB_URI 환경변수가 필요합니다.");
  process.exit(1);
}

async function fixExpiresAtTtl(model) {
  const name = model.collection.name;
  const indexes = await model.collection.listIndexes().toArray();
  const existing = indexes.find((idx) => JSON.stringify(idx.key) === JSON.stringify({ expiresAt: 1 }));

  if (existing && existing.expireAfterSeconds === 0) {
    console.log(`  ✅ [${name}] 이미 TTL 인덱스 정상 — 건너뜀`);
    return;
  }

  if (existing) {
    console.log(`  🔧 [${name}] plain 인덱스 발견(${existing.name}) → 드롭 후 TTL 재생성`);
    await model.collection.dropIndex(existing.name);
  } else {
    console.log(`  🔧 [${name}] expiresAt 인덱스 없음 → TTL 신규 생성`);
  }

  await model.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_1" });
  console.log(`  ✅ [${name}] TTL 인덱스 생성 완료 (expireAfterSeconds=0)`);
}

async function migrate() {
  console.log("🔌 MongoDB 연결 중...");
  await connectDb(env);
  console.log("✅ MongoDB 연결 완료\n");

  const targets = [IdempotencyKey, AbuseScore, RefreshTokenSession];
  for (const model of targets) {
    await fixExpiresAtTtl(model);
  }

  console.log("\n📊 인덱스 현황 요약");
  for (const model of targets) {
    const indexes = await model.collection.indexes();
    const ttl = indexes.find((idx) => JSON.stringify(idx.key) === JSON.stringify({ expiresAt: 1 }));
    console.log(`  [${model.collection.name}] expiresAt_1 TTL=${ttl?.expireAfterSeconds ?? "(none)"}s`);
  }

  console.log("\n✅ 마이그레이션 완료\n");
}

migrate()
  .catch((err) => {
    console.error("❌ 마이그레이션 실패:", err.message);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log("🔌 MongoDB 연결 종료");
  });

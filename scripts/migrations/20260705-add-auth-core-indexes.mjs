/**
 * MongoDB 마이그레이션 — 인증 핵심 인덱스 보장
 *
 * 배경:
 *   worker/lib/db.js 는 autoIndex:false 로 연결하므로 스키마에 선언된 인덱스가
 *   런타임에 자동 생성되지 않는다. 이 스크립트는 로그인/회원가입/refresh/rate-limit
 *   경로가 의존하는 인덱스를 명시적으로 생성한다.
 *
 *   - users            : email unique (동시 회원가입 중복 계정 방지 + 로그인 조회 최적화)
 *   - refresh_tokens   : tokenHash / userId / TTL (세션 회전·재사용 탐지)
 *   - idempotency_keys : (userId,endpoint,keyHash) unique + TTL (OAuth complete 멱등)
 *   - abuse_scores     : (subjectHash,endpoint,kind) unique + TTL (분산 rate limit)
 *
 * 실행:
 *   MONGO_URI="mongodb+srv://..." node scripts/migrations/20260705-add-auth-core-indexes.mjs
 *
 * 주의:
 *   users.email unique 생성이 E11000 으로 실패하면 프로덕션에 이미 중복 이메일
 *   계정이 존재한다는 뜻이다(과거 unique 미적용 상태에서 생성 가능). 이 경우
 *   중복 계정을 먼저 정리한 뒤 재실행한다.
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import {
  User,
  RefreshTokenSession,
  IdempotencyKey,
  AbuseScore,
} from "../../worker/lib/models.js";

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

// 스키마에 선언된 인덱스를 그대로 생성한다(단일 소스 = worker/lib/models.js).
// createIndexes 는 기존 인덱스를 삭제하지 않으므로 마이그레이션으로 만든
// 부분/TTL 인덱스와 충돌하지 않는다.
async function ensureModelIndexes(model) {
  const name = model.collection.name;
  try {
    await model.createIndexes();
    console.log(`  ✅ 인덱스 생성/확인 완료: [${name}]`);
  } catch (err) {
    if (err && err.code === 11000) {
      console.error(
        `  ❌ [${name}] unique 인덱스 생성 실패 (E11000) — 중복 문서가 존재합니다. `
        + `중복 데이터를 정리한 뒤 재실행하세요.\n     ${err.message}`,
      );
      throw err;
    }
    if (err && (err.code === 85 || err.code === 86)) {
      console.warn(`  ⚠️  [${name}] 기존 인덱스와 옵션 충돌 — 수동 확인 필요: ${err.message}`);
      return;
    }
    console.error(`  ❌ [${name}] 인덱스 생성 실패: ${err.message}`);
    throw err;
  }
}

async function migrate() {
  console.log("🔌 MongoDB 연결 중...");
  await connectDb(env);
  console.log("✅ MongoDB 연결 완료\n");

  const targets = [User, RefreshTokenSession, IdempotencyKey, AbuseScore];
  for (const model of targets) {
    await ensureModelIndexes(model);
  }

  console.log("\n📊 인덱스 현황 요약");
  for (const model of targets) {
    const indexes = await model.collection.indexes();
    console.log(`\n  [${model.collection.name}] (${indexes.length}개)`);
    indexes.forEach((idx) => {
      const flags = [
        idx.unique ? "unique" : "",
        idx.expireAfterSeconds != null ? `TTL=${idx.expireAfterSeconds}s` : "",
      ].filter(Boolean).join(" ");
      console.log(`    - ${idx.name}${flags ? ` (${flags})` : ""}`);
    });
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

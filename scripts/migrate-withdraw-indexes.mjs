/**
 * MongoDB 마이그레이션 스크립트
 * 회원 탈퇴 기능 — 인덱스 및 TTL 설정
 *
 * 실행 방법:
 *   MONGO_URI="mongodb+srv://..." node scripts/migrate-withdraw-indexes.mjs
 *
 * 적용 대상 컬렉션:
 *   - deleted_account_logs  : 탈퇴 감사 로그 TTL 인덱스 (5년 자동 삭제)
 *   - users                 : 탈퇴 계정 조회/차단용 인덱스
 *   - payments              : 익명화 필드 인덱스
 *   - point_histories       : 사용자별 포인트 이력 삭제 인덱스
 */

import mongoose from "mongoose";
import { config } from "dotenv";

// 로컬 .env.local 로드 (CI 환경에서는 환경변수로 주입)
config({ path: ".env.local" });
config({ path: ".env" });

const MONGO_URI = (
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  ""
).trim().replace(/^["']|["']$/g, "");

if (!MONGO_URI) {
  console.error("❌ MONGO_URI 환경변수가 설정되지 않았습니다.");
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────
// 유틸: 인덱스 생성 (이미 있으면 건너뜀)
// ─────────────────────────────────────────────────────────────────
async function ensureIndex(collection, spec, options = {}) {
  const name = options.name || Object.entries(spec).map(([k, v]) => `${k}_${v}`).join("_");
  try {
    await collection.createIndex(spec, { background: true, ...options });
    console.log(`  ✅ 인덱스 생성/확인: [${collection.collectionName}] ${name}`);
  } catch (err) {
    if (err.code === 85 || err.code === 86) {
      // 85: IndexKeySpecsConflict, 86: IndexOptionsConflict
      // 기존 인덱스 삭제 후 재생성
      console.warn(`  ⚠️  인덱스 충돌 — 재생성: [${collection.collectionName}] ${name}`);
      try {
        await collection.dropIndex(name);
        await collection.createIndex(spec, { background: true, ...options });
        console.log(`  ✅ 인덱스 재생성 완료: [${collection.collectionName}] ${name}`);
      } catch (e2) {
        console.error(`  ❌ 인덱스 재생성 실패: ${e2.message}`);
      }
    } else if (err.code === 11000 || err.message?.includes("already exists")) {
      console.log(`  ℹ️  인덱스 이미 존재: [${collection.collectionName}] ${name}`);
    } else {
      console.error(`  ❌ 인덱스 생성 실패 [${collection.collectionName}] ${name}:`, err.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────────────
async function migrate() {
  console.log("🔌 MongoDB 연결 중...");
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
  });
  console.log("✅ MongoDB 연결 완료\n");

  const db = mongoose.connection.db;

  // ── 1. deleted_account_logs ───────────────────────────────────
  console.log("📋 [deleted_account_logs] 인덱스 설정");
  await db.createCollection("deleted_account_logs").catch(() => {});
  const deletedLogs = db.collection("deleted_account_logs");

  // TTL 인덱스: 탈퇴 후 5년(157,680,000초) 자동 삭제
  // → 전자상거래법 거래 기록 5년 보존 의무 만료 후 자동 파기
  await ensureIndex(
    deletedLogs,
    { withdrawnAt: 1 },
    {
      name:               "ttl_withdrawn_5yr",
      expireAfterSeconds: 157_680_000, // 5년
    },
  );

  // 재가입 차단 조회용 (emailHash 기준 탈퇴 이력 확인)
  await ensureIndex(
    deletedLogs,
    { emailHash: 1, withdrawnAt: -1 },
    { name: "idx_email_hash_withdrawn" },
  );

  // ── 2. users ──────────────────────────────────────────────────
  console.log("\n📋 [users] 인덱스 설정");
  const users = db.collection("users");

  // 탈퇴 계정 상태 조회 최적화
  await ensureIndex(
    users,
    { status: 1, updatedAt: -1 },
    { name: "idx_status_updated" },
  );

  // 탈퇴 비식별화 이메일 패턴 조회 (관리자 수동 파기 확인용)
  await ensureIndex(
    users,
    { email: 1, status: 1 },
    {
      name:                "idx_email_status",
      partialFilterExpression: { status: "withdrawn" },
    },
  );

  // ── 3. payments ───────────────────────────────────────────────
  console.log("\n📋 [payments] 인덱스 설정");
  const payments = db.collection("payments");

  // 익명화된 결제 건 조회 (관리자 수동 검증용)
  await ensureIndex(
    payments,
    { _anonymized: 1, _anonymizedAt: -1 },
    {
      name:                    "idx_anonymized_at",
      sparse:                  true,
      partialFilterExpression: { _anonymized: true },
    },
  );

  // 법적 보존 기간 만료 자동 삭제 TTL
  // → 전자상거래법 5년 보존 의무: 익명화된 결제 기록도 5년 후 삭제
  await ensureIndex(
    payments,
    { _anonymizedAt: 1 },
    {
      name:               "ttl_anonymized_payment_5yr",
      expireAfterSeconds: 157_680_000, // 5년
      sparse:             true,
      partialFilterExpression: { _anonymized: true },
    },
  );

  // ── 4. point_histories ────────────────────────────────────────
  console.log("\n📋 [point_histories] 인덱스 설정");
  const pointHistories = db.collection("point_histories");

  // userId 기준 일괄 삭제 성능 최적화
  await ensureIndex(
    pointHistories,
    { userId: 1, createdAt: -1 },
    { name: "idx_user_point_created" },
  );

  // ── 5. fortune_view_logs ──────────────────────────────────────
  console.log("\n📋 [fortune_view_logs] 인덱스 설정");
  const viewLogs = db.collection("fortune_view_logs");

  // userId 기반 익명화 작업 성능 최적화
  await ensureIndex(
    viewLogs,
    { userId: 1 },
    {
      name:   "idx_user_fortune_view",
      sparse: true,
    },
  );

  // ── 6. 현재 인덱스 목록 출력 ─────────────────────────────────
  console.log("\n📊 인덱스 현황 요약");
  for (const colName of [
    "deleted_account_logs",
    "users",
    "payments",
    "point_histories",
    "fortune_view_logs",
  ]) {
    const col = db.collection(colName);
    const indexes = await col.indexes();
    console.log(`\n  [${colName}] (${indexes.length}개)`);
    indexes.forEach((idx) => {
      const ttl = idx.expireAfterSeconds != null
        ? ` ⏱ TTL=${idx.expireAfterSeconds}s`
        : "";
      console.log(`    - ${idx.name}${ttl}`);
    });
  }

  console.log("\n✅ 마이그레이션 완료\n");
}

// ─────────────────────────────────────────────────────────────────
// 실행
// ─────────────────────────────────────────────────────────────────
migrate()
  .catch((err) => {
    console.error("❌ 마이그레이션 실패:", err);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log("🔌 MongoDB 연결 종료");
  });

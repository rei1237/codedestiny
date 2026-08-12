/**
 * MongoDB 마이그레이션 — users.status 결손 백필
 *
 * 왜 필요한가: 2026-08 감사 실측으로 245건 중 37건에 `status` 필드가 **아예 없다**.
 * mongoose 로 읽으면 스키마 기본값 "active" 가 채워지지만, 네이티브 드라이버나 관리자
 * 목록 쿼리가 `{status:"active"}` 를 걸면 이 37명이 결과에서 통째로 사라진다(회원 15%).
 *
 * 이 스크립트는 그 문서에만 `status:"active"` 를 채운다. 이미 값이 있는 문서(active/
 * withdrawn)는 건드리지 않으므로 탈퇴 상태가 되살아나지 않는다.
 *
 * 실행:
 *   node scripts/migrations/20260812-backfill-user-status.mjs           # dry-run
 *   node scripts/migrations/20260812-backfill-user-status.mjs --apply
 *   node scripts/migrations/20260812-backfill-user-status.mjs --check   # 결손 0 이면 0 종료
 *   ... --expect 37   기대 건수와 다르면 중단 (기본 37, --expect any 로 해제)
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { User } from "../../worker/lib/models.js";
import { buildMongoEnv, requireMongoUri, writeBeforeImage } from "../lib/migration-before-image.mjs";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

const APPLY = process.argv.includes("--apply");
const CHECK = process.argv.includes("--check");
const EXPECT_RAW = String(argValue("--expect", "37"));
const EXPECT = EXPECT_RAW === "any" ? null : Number(EXPECT_RAW);

const OPERATION_ID = "20260812-backfill-user-status";
const FILTER = { status: { $exists: false } };

const env = buildMongoEnv();
requireMongoUri(env);

async function main() {
  console.log("🔌 MongoDB 연결 중...");
  await connectDb(env);
  console.log("✅ 연결 완료\n");

  const rows = await User.collection
    .find(FILTER, { projection: { _id: 1, joinedAt: 1, withdrawnAt: 1 } })
    .toArray();

  console.log(`📊 status 필드가 없는 계정: ${rows.length}건`);
  const total = await User.collection.countDocuments({});
  console.log(`   전체 ${total}건 대비 ${total ? ((rows.length / total) * 100).toFixed(1) : 0}%`);

  // 탈퇴 흔적이 있는데 status 가 없는 문서는 "active" 로 덮으면 안 된다.
  const suspicious = rows.filter((row) => row.withdrawnAt);
  if (suspicious.length) {
    console.error(`\n❌ withdrawnAt 이 있는데 status 가 없는 문서 ${suspicious.length}건 — active 로 덮으면 탈퇴가 되살아납니다.`);
    console.error("   수동 확인이 필요합니다. 중단합니다.");
    process.exitCode = 1;
    return;
  }

  if (CHECK) {
    console.log(rows.length ? `\n❌ 결손 ${rows.length}건` : "\n✅ status 결손 없음");
    process.exitCode = rows.length ? 1 : 0;
    return;
  }

  if (!rows.length) {
    console.log("\n✅ 채울 것이 없습니다.");
    return;
  }

  if (EXPECT !== null && rows.length !== EXPECT) {
    console.error(`\n❌ 기대 ${EXPECT}건과 다릅니다(실제 ${rows.length}건). 감사 기준선 이후 데이터가 바뀌었을 수 있습니다.`);
    console.error("   확인 후 --expect <n> 또는 --expect any 로 다시 실행하세요.");
    process.exitCode = 1;
    return;
  }

  if (!APPLY) {
    console.log("\n🔍 DRY-RUN — 아무것도 쓰지 않았습니다. 적용하려면 --apply 를 붙이세요.");
    return;
  }

  const beforeFile = writeBeforeImage(
    OPERATION_ID,
    rows.map((row) => ({ _id: String(row._id), status: null })),
    { filter: "status 필드 부재", count: rows.length },
  );
  console.log(`\n💾 변경 전 이미지 기록: ${beforeFile}`);

  const result = await User.collection.updateMany(FILTER, { $set: { status: "active" } });
  console.log(`\n✅ 적용 완료 — matched ${result.matchedCount} · modified ${result.modifiedCount}`);

  const remaining = await User.collection.countDocuments(FILTER);
  console.log(`   검증: status 결손 ${remaining}건 (0 기대)`);
  if (remaining !== 0 || result.modifiedCount !== rows.length) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("❌ 마이그레이션 실패:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log("\n🔌 MongoDB 연결 종료");
  });

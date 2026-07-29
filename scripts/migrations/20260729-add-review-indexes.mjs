/**
 * MongoDB 마이그레이션 — 사용자 리뷰 인덱스
 *
 * 배경:
 *   db.js가 autoIndex:false로 연결하므로 review-models.js의 스키마 선언만으로는 실제 인덱스가
 *   생성되지 않는다. 특히 "사용자 1인 1상품 1리뷰" unique 제약이 걸리지 않아, 이 스크립트를
 *   돌리기 전에는 한 사용자가 같은 상품에 리뷰를 무한히 작성할 수 있다.
 *
 * 이 스크립트가 하는 일:
 *   1) 공개 목록 조회 인덱스 (status+displayedAt / productId+status+displayedAt / +rating)
 *   2) 관리자 검수 대기열 인덱스 (status+createdAt)
 *   3) 1인 1상품 1리뷰 partial unique 인덱스
 *      — 관리자 시딩(createdByAdmin:true)과 익명 닉네임(userId 빈값)은 제외한다
 *
 * 신규 컬렉션이라 백필은 없다. 다만 (3)은 기존 중복이 있으면 생성에 실패하므로,
 * 실패 시 중복 목록을 출력하고 종료한다.
 *
 * 실행:
 *   MONGO_URI="mongodb+srv://..." node scripts/migrations/20260729-add-review-indexes.mjs [--dry-run]
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { Review } from "../../worker/lib/review-models.js";

config({ path: ".env.local" });
config({ path: ".env" });

const DRY_RUN = process.argv.includes("--dry-run");

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

async function reportDuplicates() {
  const duplicates = await Review.aggregate([
    { $match: { createdByAdmin: false, userId: { $type: "string", $gt: "" } } },
    { $group: { _id: { userId: "$userId", productId: "$productId" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 20 },
  ]);

  if (!duplicates.length) return;

  console.error(`\n⚠️  중복 리뷰 ${duplicates.length}건(최대 20건 표시) — unique 인덱스 생성 전 정리가 필요합니다:`);
  for (const row of duplicates) {
    console.error(`  - userId=${row._id.userId} productId=${row._id.productId} (${row.count}건)`);
  }
}

async function migrate() {
  console.log("🔌 MongoDB 연결 중...");
  await connectDb(env);
  console.log("✅ MongoDB 연결 완료");

  console.log(`\n🧭 인덱스 생성/확인: [reviews] ${DRY_RUN ? "(dry-run 건너뜀)" : ""}`);
  if (!DRY_RUN) {
    await Review.collection.createIndex({ status: 1, displayedAt: -1 });
    console.log("  ✅ status+displayedAt 공개 목록 인덱스 확인");

    await Review.collection.createIndex({ productId: 1, status: 1, displayedAt: -1 });
    console.log("  ✅ productId+status+displayedAt 상품별 최신순 인덱스 확인");

    await Review.collection.createIndex({ productId: 1, status: 1, rating: -1 });
    console.log("  ✅ productId+status+rating 평점순 인덱스 확인");

    await Review.collection.createIndex({ status: 1, createdAt: -1 });
    console.log("  ✅ status+createdAt 검수 대기열 인덱스 확인");

    try {
      await Review.collection.createIndex(
        { userId: 1, productId: 1 },
        {
          name: "user_product_unique_nonadmin",
          unique: true,
          partialFilterExpression: {
            createdByAdmin: false,
            userId: { $type: "string", $gt: "" },
          },
        },
      );
      console.log("  ✅ userId+productId 1인 1리뷰 unique 인덱스 확인");
    } catch (error) {
      console.error(`  ❌ unique 인덱스 생성 실패: ${error.message}`);
      await reportDuplicates();
      throw error;
    }
  }

  console.log(DRY_RUN ? "\n✅ dry-run 완료(쓰기 없음)\n" : "\n✅ 마이그레이션 완료\n");
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

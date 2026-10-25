/** Initial review lookup indexes. No participation cap. Existing installations must explicitly run 20261025-repeat-review-submissions.mjs to remove the legacy unique index. */

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

    // Repeat submissions: never recreate the retired product cap.
    await Review.collection.createIndex({ userId: 1, createdAt: -1 });
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

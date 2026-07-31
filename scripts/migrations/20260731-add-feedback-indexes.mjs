/**
 * MongoDB 마이그레이션 — 버그 제보실 인덱스
 *
 * 배경:
 *   db.js가 autoIndex:false로 연결하므로 feedback-models.js의 스키마 선언만으로는 실제
 *   인덱스가 생성되지 않는다. 특히 24시간 중복 탐지(contentHash) 조회가 콜렉션 스캔이 되어
 *   결제·인증과 공유하는 Atlas 풀을 점유한다. 배포 전에 반드시 1회 실행할 것.
 *
 * 이 스크립트가 하는 일:
 *   1) 내 제보 내역 (userId+createdAt)
 *   2) 관리자 큐 (status+createdAt / status+priorityRank+createdAt)
 *   3) 카테고리 필터 (category+status+createdAt)
 *   4) 중복 탐지 (contentHash+createdAt)
 *   5) 공개 처리완료 피드 partial 인덱스 (isPublic+publishedAt)
 *
 * 신규 컬렉션이라 백필이 없고, unique 제약도 없어 실패 시나리오가 없다.
 *
 * 실행:
 *   MONGO_URI="mongodb+srv://..." node scripts/migrations/20260731-add-feedback-indexes.mjs [--dry-run]
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { Feedback } from "../../worker/lib/feedback-models.js";

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

const INDEXES = [
  { spec: { userId: 1, createdAt: -1 }, options: {}, label: "userId+createdAt 내 제보 내역" },
  { spec: { status: 1, createdAt: -1 }, options: {}, label: "status+createdAt 관리자 기본 큐" },
  { spec: { status: 1, priorityRank: 1, createdAt: -1 }, options: {}, label: "status+priorityRank+createdAt 우선순위 큐" },
  { spec: { category: 1, status: 1, createdAt: -1 }, options: {}, label: "category+status+createdAt 카테고리 필터" },
  { spec: { contentHash: 1, createdAt: -1 }, options: {}, label: "contentHash+createdAt 중복 탐지" },
  {
    spec: { isPublic: 1, publishedAt: -1 },
    options: { name: "public_resolved_feed", partialFilterExpression: { isPublic: true } },
    label: "isPublic+publishedAt 공개 처리완료 피드",
  },
];

async function migrate() {
  console.log("🔌 MongoDB 연결 중...");
  await connectDb(env);
  console.log("✅ MongoDB 연결 완료");

  console.log(`\n🐞 인덱스 생성/확인: [feedbacks] ${DRY_RUN ? "(dry-run 건너뜀)" : ""}`);
  for (const index of INDEXES) {
    if (DRY_RUN) {
      console.log(`  ⏭️  ${index.label}`);
      continue;
    }
    await Feedback.collection.createIndex(index.spec, index.options);
    console.log(`  ✅ ${index.label} 인덱스 확인`);
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

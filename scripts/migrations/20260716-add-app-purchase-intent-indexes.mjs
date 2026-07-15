/**
 * MongoDB 마이그레이션 — 앱(Google Play) 결제 의도(intent) 인덱스
 *
 * 배경:
 *   앱은 가격대 티어 SKU를 쓴다(예: cd_content_tier_02 ← 50코인 기능 54개). productId 하나에
 *   여러 featureKey가 매달리므로 구매 토큰만으로는 "무엇을 사려던 것인지" 역해석할 수 없다.
 *   launchBillingFlow 직전에 남기는 app_purchase_intents 기록이, 결제 도중 앱이 죽어 verify를
 *   못 한 고아 구매를 queryPurchasesAsync로 복구할 때의 유일한 단서다.
 *
 * 이 스크립트가 하는 일:
 *   1) TTL 인덱스(expiresAt, 24h) — 만료된 의도 자동 정리
 *   2) 복구 조회 인덱스(userId+productId+status+createdAt) — 고아 구매 역해석 경로
 *   (db.js가 autoIndex:false로 연결하므로 스키마 선언만으로는 생성되지 않는다)
 *
 * 신규 컬렉션이라 백필은 없다.
 *
 * 실행:
 *   MONGO_URI="mongodb+srv://..." node scripts/migrations/20260716-add-app-purchase-intent-indexes.mjs [--dry-run]
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { AppPurchaseIntent } from "../../worker/lib/app-store-models.js";

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

  console.log(`\n🧭 인덱스 생성/확인: [app_purchase_intents] ${DRY_RUN ? "(dry-run 건너뜀)" : ""}`);
  if (!DRY_RUN) {
    await AppPurchaseIntent.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log("  ✅ expiresAt TTL 인덱스 확인");
    await AppPurchaseIntent.collection.createIndex({ userId: 1, productId: 1, status: 1, createdAt: -1 });
    console.log("  ✅ userId+productId+status+createdAt 복구 조회 인덱스 확인");
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

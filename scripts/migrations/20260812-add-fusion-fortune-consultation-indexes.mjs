/**
 * MongoDB 마이그레이션 — 초융합 상담 보관본 인덱스
 *
 * 배경:
 *   db.js 가 autoIndex:false 로 연결하므로 models.js 의 스키마 선언만으로는 실제 인덱스가
 *   생성되지 않는다. 이 컬렉션은 세 경로에서 조회된다:
 *     · 저장(멱등 upsert) — userId+idempotencyKey. unique 가 없으면 같은 requestId 재시도가
 *       보관본을 하나 더 만들어 "결제 1회 = 보관본 1개" 불변식이 깨진다.
 *     · 재열람 단건 — id
 *     · 최근 목록 — userId+createdAt
 *   배포 전에 반드시 1회 실행할 것.
 *
 * 실행:
 *   MONGO_URI="mongodb+srv://..." node scripts/migrations/20260812-add-fusion-fortune-consultation-indexes.mjs [--dry-run|--check]
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { FusionFortuneConsultation } from "../../worker/lib/models.js";

config({ path: ".env.local" });
config({ path: ".env" });

const DRY_RUN = process.argv.includes("--dry-run");
const CHECK = process.argv.includes("--check");

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
  { spec: { id: 1 }, options: { unique: true, name: "fusion_consultation_id_unique" }, label: "id 재열람 단건 조회(unique)" },
  { spec: { userId: 1, idempotencyKey: 1 }, options: { unique: true, name: "fusion_user_idem_unique" }, label: "userId+idempotencyKey 멱등 저장(unique)" },
  { spec: { userId: 1, createdAt: -1 }, options: {}, label: "userId+createdAt 최근 목록" },
];

function specKey(spec) {
  return Object.entries(spec).map(([k, v]) => `${k}:${v}`).join(",");
}

async function migrate() {
  console.log("🔌 MongoDB 연결 중...");
  await connectDb(env);
  console.log("✅ MongoDB 연결 완료");

  if (CHECK) {
    const existing = await FusionFortuneConsultation.collection.indexes().catch(() => []);
    const have = new Set(existing.map((i) => specKey(i.key)));
    let missing = 0;
    for (const index of INDEXES) {
      const ok = have.has(specKey(index.spec));
      console.log(`  ${ok ? "✅" : "❌"} ${index.label}`);
      if (!ok) missing += 1;
    }
    if (missing) {
      console.error(`\n❌ 인덱스 ${missing}개 누락 — 마이그레이션을 실행하세요.\n`);
      process.exitCode = 1;
    } else {
      console.log("\n✅ 모든 인덱스 존재\n");
    }
    return;
  }

  console.log(`\n🔮 인덱스 생성/확인: [fusionFortuneConsultations] ${DRY_RUN ? "(dry-run 건너뜀)" : ""}`);
  for (const index of INDEXES) {
    if (DRY_RUN) {
      console.log(`  ⏭️  ${index.label}`);
      continue;
    }
    await FusionFortuneConsultation.collection.createIndex(index.spec, index.options);
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

/**
 * MongoDB 마이그레이션 — 휴먼 디자인 프리미엄 리포트 인덱스
 *
 * 배경:
 *   db.js 가 autoIndex:false 로 연결하므로 models.js 의 스키마 선언만으로는 실제 인덱스가
 *   생성되지 않는다. humanDesignReports 는 신규 컬렉션이고 세 경로에서 매 요청 조회된다:
 *     · 동일 차트 재생성 금지 (userId+reportKey, unique) — 없으면 결제한 리포트를 다시 만든다
 *     · 웨이브 클레임·저장 (id) — 반복 호출이 같은 문서를 이어서 채운다
 *     · 재열람/목록 (userId+createdAt)
 *   인덱스가 없으면 콜렉션 스캔이 되어 결제·인증과 공유하는 Atlas 풀을 점유한다.
 *   배포 전에 반드시 1회 실행할 것.
 *
 * 🔴 userId+reportKey 는 unique 다. 신규 컬렉션이라 기존 문서가 없어 충돌은 없지만,
 *    데이터가 들어간 뒤 실행하면 중복이 있을 때 실패할 수 있다(--check 로 먼저 확인).
 *
 * 실행:
 *   MONGO_URI="mongodb+srv://..." node scripts/migrations/20260823-add-human-design-report-indexes.mjs [--dry-run|--check]
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { HumanDesignReport } from "../../worker/lib/models.js";

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

const TARGETS = [
  {
    label: "humanDesignReports",
    model: HumanDesignReport,
    indexes: [
      { spec: { id: 1 }, options: { unique: true, name: "report_id_unique" }, label: "id 웨이브 클레임·재열람(unique)" },
      { spec: { userId: 1, reportKey: 1 }, options: { unique: true, name: "user_reportkey_unique" }, label: "userId+reportKey 동일 차트 재생성 금지(unique)" },
      { spec: { userId: 1, idempotencyKey: 1 }, options: { name: "user_idem" }, label: "userId+idempotencyKey 결제 키 조회" },
      { spec: { userId: 1, createdAt: -1 }, options: { name: "user_created" }, label: "userId+createdAt 내 리포트 목록" },
      { spec: { status: 1 }, options: { name: "status" }, label: "status 미완 스윕" },
    ],
  },
];

function specKey(spec) {
  return Object.entries(spec).map(([k, v]) => `${k}:${v}`).join(",");
}

async function migrate() {
  console.log("MongoDB 연결 중...");
  await connectDb(env);
  console.log("MongoDB 연결 완료");

  let missingTotal = 0;
  for (const target of TARGETS) {
    console.log("");
    console.log(`[${target.label}] ${CHECK ? "상태 확인" : DRY_RUN ? "(dry-run)" : "인덱스 생성/확인"}`);
    const existing = CHECK ? await target.model.collection.indexes().catch(() => []) : [];
    const have = new Set(existing.map((index) => specKey(index.key)));
    for (const index of target.indexes) {
      if (CHECK) {
        const ok = have.has(specKey(index.spec));
        console.log(`  ${ok ? "OK  " : "누락"} ${index.label}`);
        if (!ok) missingTotal += 1;
        continue;
      }
      if (DRY_RUN) {
        console.log(`  건너뜀 ${index.label}`);
        continue;
      }
      await target.model.collection.createIndex(index.spec, index.options);
      console.log(`  생성/확인 ${index.label}`);
    }
  }

  console.log("");
  if (CHECK) {
    if (missingTotal) {
      console.error(`인덱스 ${missingTotal}개 누락 — 마이그레이션을 실행하세요.`);
      process.exitCode = 1;
    } else {
      console.log("모든 인덱스 존재");
    }
    return;
  }
  console.log(DRY_RUN ? "dry-run 완료(쓰기 없음)" : "마이그레이션 완료");
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

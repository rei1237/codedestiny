/**
 * MongoDB 마이그레이션 — 휴먼 디자인 계산·해석 아카이브 인덱스
 *
 * 배경:
 *   db.js 가 autoIndex:false 로 연결하므로 models.js 의 스키마 선언만으로는 실제 인덱스가
 *   생성되지 않는다. 이 두 컬렉션에는 **지금까지 인덱스가 하나도 없었다**(마이그레이션 파일
 *   자체가 없었다). 게다가 worker/routes/human-design.js 의 withMongoRetry 인자 순서 버그로
 *   아카이브 쓰기가 한 번도 성공한 적이 없어 컬렉션이 사실상 비어 있을 가능성이 높다.
 *
 *   2026-09 차트 무료화로 이 컬렉션의 쓰기·조회가 급증한다:
 *     · 재열람 판별 (userId+inputHash+calculationVersion) — 없으면 매번 천문 계산을 다시 한다
 *     · 멱등 upsert (userId+idempotencyKey) — unique 가 없으면 동시 요청이 문서를 중복 생성한다
 *     · 내 차트 목록 (userId+createdAt)
 *   인덱스가 없으면 콜렉션 스캔이 되어 결제·인증과 공유하는 Atlas 풀을 점유한다.
 *   배포 전에 반드시 1회 실행할 것.
 *
 * 🔴 unique 인덱스는 기존 중복이 있으면 실패한다. --check 로 먼저 상태를 본 뒤 실행한다.
 *
 * 실행:
 *   MONGO_URI="mongodb+srv://..." node scripts/migrations/20260823-add-human-design-indexes.mjs [--dry-run|--check]
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { HumanDesignCalculation, HumanDesignInterpretation } from "../../worker/lib/models.js";

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
    label: "humanDesignCalculations",
    model: HumanDesignCalculation,
    indexes: [
      { spec: { userId: 1, idempotencyKey: 1 }, options: { unique: true, name: "user_idem_unique" }, label: "userId+idempotencyKey 멱등 upsert(unique)" },
      { spec: { userId: 1, inputHash: 1, calculationVersion: 1 }, options: { name: "user_input_version" }, label: "userId+inputHash+calculationVersion 재열람 조회" },
      { spec: { userId: 1, createdAt: -1 }, options: { name: "user_created" }, label: "userId+createdAt 내 차트 목록" },
    ],
  },
  {
    label: "humanDesignInterpretations",
    model: HumanDesignInterpretation,
    indexes: [
      { spec: { userId: 1, calculationId: 1, promptVersion: 1, locale: 1 }, options: { unique: true, name: "user_calc_prompt_locale_unique" }, label: "userId+calculationId+promptVersion+locale(unique)" },
      { spec: { userId: 1, createdAt: -1 }, options: { name: "user_created" }, label: "userId+createdAt 내 해석 목록" },
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

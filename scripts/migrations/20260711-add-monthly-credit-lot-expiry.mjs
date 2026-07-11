/**
 * MongoDB 마이그레이션 — 월정석 지급분별(lot) 만료 도입 백필 + 인덱스
 *
 * 배경:
 *   월정석(membershipCreditBalance)에 "지급일+30일 소멸" 정책을 도입하면서, 잔액을
 *   지급분별 lot(membershipCreditLots)으로 관리하도록 전환한다. lot 배열이 신뢰 원천이고
 *   스칼라 잔액은 "미만료 lot.remaining 합계" 파생 캐시가 된다.
 *
 * 이 스크립트가 하는 일:
 *   1) 백필: 기존에 membershipCreditBalance>0 이지만 lot이 없는 유저의 잔액을
 *      "롤아웃 시점 기준 신규 30일 창"의 단일 lot으로 흡수한다(지급 시각 소급 대신 전원
 *      30일 유예 → 롤아웃 직후 대량 즉시 소멸/민원 방지). 런타임 리졸버/소비 경로에도
 *      동일 규칙의 지연 백필이 있으나, 휴면 유저까지 일괄 정리하려면 배치 실행이 필요하다.
 *   2) 인덱스: 만료 스윕 크론이 쓰는 profileSubscription.membershipCreditLots.expiresAt
 *      인덱스를 생성한다(db.js autoIndex:false 이므로 명시 생성 필요).
 *
 * 실행:
 *   MONGO_URI="mongodb+srv://..." node scripts/migrations/20260711-add-monthly-credit-lot-expiry.mjs [--dry-run]
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { User } from "../../worker/lib/models.js";
import { MONTHLY_CREDIT_TTL_MS } from "../../worker/lib/monthly-credit-lots.js";

config({ path: ".env.local" });
config({ path: ".env" });

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 500;

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

// membershipCreditBalance>0 인데 lot이 없는(미전환) 유저.
const BACKFILL_FILTER = {
  "profileSubscription.membershipCreditBalance": { $gt: 0 },
  $or: [
    { "profileSubscription.membershipCreditLots": { $exists: false } },
    { "profileSubscription.membershipCreditLots": { $size: 0 } },
    { "profileSubscription.membershipCreditLots": null },
  ],
};

async function backfillLots() {
  const users = User.collection;
  const total = await users.countDocuments(BACKFILL_FILTER);
  console.log(`\n🔎 백필 대상(잔액>0 & lot 없음): ${total}명 ${DRY_RUN ? "(dry-run)" : ""}`);
  if (total === 0) return { total: 0, updated: 0 };
  if (DRY_RUN) return { total, updated: 0 };

  let processed = 0;
  let updated = 0;
  // 매 배치마다 필터가 좁혀지므로(업데이트된 유저는 lot이 생겨 제외) skip 없이 앞에서부터 반복.
  while (processed < total + BATCH_SIZE) {
    const now = new Date();
    const cursor = users.find(BACKFILL_FILTER, {
      projection: { _id: 1, "profileSubscription.membershipCreditBalance": 1, "profileSubscription.membershipCreditLotsVersion": 1 },
      limit: BATCH_SIZE,
    });
    const batch = await cursor.toArray();
    if (!batch.length) break;

    const ops = batch.map((doc) => {
      const balance = Math.max(0, Math.floor(Number(doc?.profileSubscription?.membershipCreditBalance || 0)));
      const version = Math.floor(Number(doc?.profileSubscription?.membershipCreditLotsVersion || 0));
      const lot = {
        lotId: `backfill:${now.getTime()}`,
        amount: balance,
        remaining: balance,
        grantedAt: now,
        expiresAt: new Date(now.getTime() + MONTHLY_CREDIT_TTL_MS),
      };
      return {
        updateOne: {
          filter: { _id: doc._id, "profileSubscription.membershipCreditLotsVersion": version },
          update: {
            $set: {
              "profileSubscription.membershipCreditLots": [lot],
              "profileSubscription.membershipCreditBalance": balance,
            },
            $inc: { "profileSubscription.membershipCreditLotsVersion": 1 },
          },
        },
      };
    });
    const res = await users.bulkWrite(ops, { ordered: false });
    const modified = Number(res?.modifiedCount || 0);
    updated += modified;
    processed += batch.length;
    console.log(`  … ${updated}명 백필 완료`);
    // 이번 배치에서 아무 것도 수정 못 했으면(전부 버전 충돌 등) 무한 루프 방지 위해 종료.
    if (modified === 0) break;
  }
  return { total, updated };
}

async function migrate() {
  console.log("🔌 MongoDB 연결 중...");
  await connectDb(env);
  console.log("✅ MongoDB 연결 완료");

  const backfill = await backfillLots();

  console.log(`\n🧭 인덱스 생성/확인: [users] ${DRY_RUN ? "(dry-run 건너뜀)" : ""}`);
  if (!DRY_RUN) {
    await User.collection.createIndex({ "profileSubscription.membershipCreditLots.expiresAt": 1 });
    console.log("  ✅ profileSubscription.membershipCreditLots.expiresAt 인덱스 확인");
  }

  console.log("\n📊 요약");
  console.log(`  - 백필 대상: ${backfill.total}명 / 처리: ${backfill.updated}명`);
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

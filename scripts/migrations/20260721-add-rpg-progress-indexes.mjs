/**
 * MongoDB 마이그레이션 — 프로필 카드 레벨 시스템 인덱스 보장
 *
 * 배경:
 *   worker/lib/db.js 는 autoIndex:false 로 연결하므로 worker/lib/models.js 에 선언된
 *   인덱스가 런타임에 자동 생성되지 않는다. worker/routes/rpg.js 의 ensureRpgIndexes()
 *   는 Model.init() 만 호출하므로 이 상태에서는 인덱스를 만들지 않는다.
 *
 *   EXP 적립(/api/rpg/award)과 로컬 진행분 승계(/api/rpg/adopt)의 중복 방지는
 *   사전 조회가 아니라 아래 unique 인덱스의 E11000 을 최종 보증으로 삼는다.
 *   인덱스가 없으면 동시 요청(더블클릭·다중 탭)에서 EXP 가 중복 지급될 수 있다.
 *
 *   - user_rpg_progresses  : (userId, profileId) unique  — 계정당 진행도 1건
 *   - user_daily_quest_logs: (userId, profileId, questDateKst, questId) unique — 하루 1회 지급
 *   - user_rpg_reward_logs : (userId, profileId, rewardType, rewardKey) unique — 승계 1회성
 *
 * 실행:
 *   MONGO_URI="mongodb+srv://..." node scripts/migrations/20260721-add-rpg-progress-indexes.mjs
 *   (npm run migrate:rpg-indexes)
 *
 * 주의:
 *   E11000 으로 실패하면 이미 중복 문서가 쌓였다는 뜻이다. 중복을 정리한 뒤 재실행한다.
 *   이 컬렉션들은 API 가 프론트에서 호출되지 않던 기간이 길어 비어 있을 가능성이 높다.
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import {
  UserDailyQuestLog,
  UserRpgProgress,
  UserRpgRewardLog,
} from "../../worker/lib/models.js";

config({ path: ".env.local" });
config({ path: ".env" });

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

const CHECK_ONLY = process.argv.includes("--check");

// 스키마 선언을 그대로 생성한다(단일 소스 = worker/lib/models.js).
// createIndexes 는 기존 인덱스를 지우지 않으므로 반복 실행해도 안전하다.
async function ensureModelIndexes(model) {
  const name = model.collection.name;
  try {
    await model.createIndexes();
    console.log(`  ✅ 인덱스 생성/확인 완료: [${name}]`);
  } catch (err) {
    if (err && err.code === 11000) {
      console.error(
        `  ❌ [${name}] unique 인덱스 생성 실패 (E11000) — 중복 문서가 존재합니다. `
        + `중복 데이터를 정리한 뒤 재실행하세요.\n     ${err.message}`,
      );
      throw err;
    }
    if (err && (err.code === 85 || err.code === 86)) {
      console.warn(`  ⚠️  [${name}] 기존 인덱스와 옵션 충돌 — 수동 확인 필요: ${err.message}`);
      return;
    }
    console.error(`  ❌ [${name}] 인덱스 생성 실패: ${err.message}`);
    throw err;
  }
}

// 멱등성이 걸린 unique 인덱스가 실제로 존재하는지만 본다.
// 없으면 EXP 중복 지급 창이 열려 있다는 뜻이므로 실패로 처리한다.
const REQUIRED_UNIQUE_KEYS = new Map([
  ["user_rpg_progresses", "userId_1_profileId_1"],
  ["user_daily_quest_logs", "userId_1_profileId_1_questDateKst_1_questId_1"],
  ["user_rpg_reward_logs", "userId_1_profileId_1_rewardType_1_rewardKey_1"],
]);

async function reportIndexes(models) {
  console.log("\n📊 인덱스 현황 요약");
  const missing = [];
  for (const model of models) {
    const name = model.collection.name;
    const indexes = await model.collection.indexes();
    console.log(`\n  [${name}] (${indexes.length}개)`);
    indexes.forEach((idx) => {
      const flags = [
        idx.unique ? "unique" : "",
        idx.expireAfterSeconds != null ? `TTL=${idx.expireAfterSeconds}s` : "",
      ].filter(Boolean).join(" ");
      console.log(`    - ${idx.name}${flags ? ` (${flags})` : ""}`);
    });

    const requiredName = REQUIRED_UNIQUE_KEYS.get(name);
    const found = indexes.find((idx) => idx.name === requiredName);
    if (!found || !found.unique) {
      missing.push(`${name}.${requiredName}`);
    }
  }
  return missing;
}

async function migrate() {
  console.log("🔌 MongoDB 연결 중...");
  await connectDb(env);
  console.log("✅ MongoDB 연결 완료\n");

  const targets = [UserRpgProgress, UserDailyQuestLog, UserRpgRewardLog];

  if (CHECK_ONLY) {
    console.log("🔍 --check 모드: 인덱스를 만들지 않고 실재 여부만 확인합니다.\n");
  } else {
    for (const model of targets) {
      await ensureModelIndexes(model);
    }
  }

  const missing = await reportIndexes(targets);
  if (missing.length > 0) {
    console.error(
      `\n❌ 멱등성에 필요한 unique 인덱스가 없습니다: ${missing.join(", ")}`
      + "\n   이 상태에서는 동시 요청 시 EXP 가 중복 지급될 수 있습니다."
      + (CHECK_ONLY ? "\n   → --check 없이 다시 실행해 생성하세요." : ""),
    );
    process.exitCode = 1;
    return;
  }

  console.log("\n✅ 필요한 unique 인덱스가 모두 존재합니다.\n");
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

/**
 * MongoDB 마이그레이션 — users.phoneHash unique 인덱스 생성
 *
 * 배경:
 *   2026-08-19 부터 휴대폰 번호는 회원가입 필수 항목이고, 한 번호로 여러 계정을 만들 수 없다.
 *   번호는 AES-GCM 랜덤 IV 로 저장돼 같은 번호라도 암호문이 달라서, 중복 판정은 결정적 해시
 *   컬럼(users.phoneHash)으로 한다. worker/lib/db.js 가 autoIndex:false 로 연결하므로
 *   스키마 선언만으로는 인덱스가 생기지 않아 이 스크립트가 필요하다.
 *
 *   서버 코드는 저장 전에 선점 조회를 하지만, 그 조회와 저장 사이의 경합을 실제로 막는 것은
 *   이 unique 인덱스다(worker/routes/auth.js isDuplicatePhoneNumberError 가 E11000 을 409 로 접는다).
 *
 * 🔴 선행 조건:
 *   node scripts/migrate-backfill-phone-hash.mjs --apply
 *   를 먼저 돌려 기존 계정에 해시를 채우고 **중복이 0 건인지 확인**할 것. 중복이 남아 있으면
 *   여기서 E11000 으로 실패한다(그게 정상 동작이다 — 데이터를 먼저 정리해야 한다).
 *
 * 실행:
 *   MONGO_URI="mongodb+srv://..." node scripts/migrations/20260819-add-phone-hash-unique-index.mjs
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { User } from "../../worker/lib/models.js";

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

async function migrate() {
  console.log("🔌 MongoDB 연결 중...");
  await connectDb(env);
  console.log("✅ MongoDB 연결 완료\n");

  // 인덱스를 만들기 전에 중복을 먼저 세어 준다 — E11000 메시지만으로는 어느 계정인지 모른다.
  const duplicates = await User.collection.aggregate([
    { $match: { phoneHash: { $type: "string", $gt: "" } } },
    { $group: { _id: "$phoneHash", count: { $sum: 1 }, ids: { $push: "$_id" } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 20 },
  ]).toArray();

  if (duplicates.length > 0) {
    console.error(`❌ 같은 phoneHash 를 가진 계정 그룹이 ${duplicates.length}개 있습니다. 인덱스를 만들 수 없습니다.`);
    for (const group of duplicates) {
      console.error(`   ${group.ids.map((id) => String(id)).join("  ")}`);
    }
    console.error("\n   어느 계정이 그 번호를 계속 쓸지 정한 뒤 나머지의 phoneNumber/phoneHash 를 비우고 재실행하세요.");
    process.exit(1);
  }

  // 스키마 선언(worker/lib/models.js)을 그대로 만든다 — 옵션이 두 곳에 갈라지지 않게 한다.
  await User.createIndexes();
  console.log("  ✅ 인덱스 생성/확인 완료: [users]");

  const indexes = await User.collection.indexes();
  const phoneIndex = indexes.find((index) => index.key && index.key.phoneHash === 1);
  if (!phoneIndex) {
    console.error("❌ phoneHash 인덱스가 만들어지지 않았습니다. worker/lib/models.js 의 선언을 확인하세요.");
    process.exit(1);
  }
  if (!phoneIndex.unique) {
    console.error(`❌ phoneHash 인덱스(${phoneIndex.name})가 unique 가 아닙니다 — 중복 차단이 서버 선점 조회에만 의존하게 됩니다.`);
    console.error("   기존 non-unique 인덱스를 먼저 dropIndex 로 지운 뒤 재실행하세요.");
    process.exit(1);
  }

  console.log(`\n📊 phoneHash 인덱스: ${phoneIndex.name} (unique${phoneIndex.partialFilterExpression ? ", partial" : ""})`);
  console.log("\n✅ 마이그레이션 완료\n");
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

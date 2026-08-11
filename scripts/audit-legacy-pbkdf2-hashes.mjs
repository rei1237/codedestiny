/**
 * 워커가 검증할 수 없는 PBKDF2 해시가 몇 개나 쌓여 있는지 센다. **읽기 전용이다 — 쓰기 없음.**
 *
 * 배경: Cloudflare Workers 의 WebCrypto 는 PBKDF2 반복수를 100,000 으로 하드 제한한다.
 * worker/lib/password.js 가 600,000 으로 굳어 있던 동안,
 *   - 워커에서의 해시 생성은 **항상 실패**했으므로(회원가입 500) 워커가 만든 600k 해시는 없다.
 *   - 그러나 시드 스크립트(seed-dev-users·seed-test-users·ensure-hanyuzu-…)는 **Node** 에서 돌아
 *     상한이 없으므로 600k 해시를 정상적으로 만들어 DB 에 넣었다.
 * 그렇게 저장된 해시는 워커가 복원할 방법이 없어 로그인 시 "비밀번호 틀림"과 구분되지 않는다.
 * 해시는 단방향이라 반복수를 낮추는 변환도 불가능하다 — 해당 계정은 재시드하거나
 * 비밀번호를 다시 설정해야 한다. 그 규모를 먼저 알기 위한 스크립트다.
 *
 * 🔴 이메일·이름·_id·해시 원문은 출력하지 않는다. 반복수별 계정 수만 센다.
 *
 *   node scripts/audit-legacy-pbkdf2-hashes.mjs
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";
import { User } from "../worker/lib/models.js";
import { PBKDF2_MAX_ITERATIONS } from "../worker/lib/password.js";

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
  console.error("MONGO_URI or MONGODB_URI is required.");
  process.exit(1);
}

await connectDb(env);

// 반복수는 `pbkdf2-sha256$<반복수>$<salt>$<hash>` 의 두 번째 조각이다. 해시 원문이 클라이언트로
// 넘어오지 않도록 집계는 서버(DB)에서 끝낸다.
const byIterations = await User.collection.aggregate([
  { $match: { passwordHash: { $regex: "^pbkdf2-sha256\\$" } } },
  {
    $project: {
      _id: 0,
      iterations: {
        $convert: {
          input: { $arrayElemAt: [{ $split: ["$passwordHash", "$"] }, 1] },
          to: "int",
          onError: null,
          onNull: null,
        },
      },
    },
  },
  { $group: { _id: "$iterations", count: { $sum: 1 } } },
  { $sort: { _id: 1 } },
]).toArray();

const [totalUsers, bcryptCount, hmacCount, noPasswordCount] = await Promise.all([
  User.collection.countDocuments({}),
  User.collection.countDocuments({ passwordHash: { $regex: "^\\$2[aby]\\$" } }),
  User.collection.countDocuments({ passwordHash: { $regex: "^hmac-sha256-v1\\$" } }),
  User.collection.countDocuments({ $or: [{ passwordHash: "" }, { passwordHash: null }, { passwordHash: { $exists: false } }] }),
]);

const overLimit = byIterations
  .filter((row) => Number(row._id) > PBKDF2_MAX_ITERATIONS)
  .reduce((sum, row) => sum + row.count, 0);
const unparseable = byIterations
  .filter((row) => row._id === null)
  .reduce((sum, row) => sum + row.count, 0);

console.log(`[audit-legacy-pbkdf2-hashes] workers 상한 = ${PBKDF2_MAX_ITERATIONS}`);
console.log(JSON.stringify({
  totalUsers,
  pbkdf2: byIterations.reduce((sum, row) => sum + row.count, 0),
  bcryptLegacy: bcryptCount,
  hmacLegacy: hmacCount,
  noPassword: noPasswordCount,
  pbkdf2OverWorkersLimit: overLimit,
  pbkdf2UnparseableIterations: unparseable,
}, null, 2));

console.log("\n반복수 분포(계정 수):");
for (const row of byIterations) {
  const iterations = row._id === null ? "(파싱 불가)" : String(row._id);
  const flag = Number(row._id) > PBKDF2_MAX_ITERATIONS ? "  ← 워커에서 검증 불가" : "";
  console.log(`  ${iterations.padStart(8)} : ${row.count}${flag}`);
}

if (overLimit > 0) {
  console.log(`\n${overLimit}개 계정이 워커에서 로그인할 수 없습니다.`);
  console.log("해시는 단방향이라 반복수를 낮추는 변환이 없습니다. 재시드하거나 비밀번호를 다시 설정해야 합니다.");
} else {
  console.log("\n워커 상한을 넘는 해시는 없습니다.");
}

await mongoose.disconnect();

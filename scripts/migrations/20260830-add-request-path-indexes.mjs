/**
 * MongoDB 마이그레이션 — 요청 경로 COLLSCAN 실측으로 확정된 인덱스만 추가한다. 자동 실행되지 않는다.
 *
 * 근거: docs/db-query-plans-2026-08-30.md (읽기 전용 explain executionStats, db=code_destiny).
 * 정적 분석 후보 16개 중 winningPlan 이 COLLSCAN 인 것은 2개였고 둘 다 users(267건)다.
 *
 *   · worker/routes/auth.js:186  users {referralCode}  — 가입마다 최대 8회 findOne, COLLSCAN 267/0.
 *     문서 수에 비례해 커지는 유일한 요청 경로 COLLSCAN 이라 sparse 단일 키 인덱스를 만든다.
 *     referralCode 는 대부분의 사용자에게 없으므로(표본 사용자도 없었다) sparse 로 둬 키 수를 줄인다.
 *     unique 는 걸지 않는다 — 코드가 유일성을 루프로 보장하고, 기존 중복이 있으면 생성이 실패한다.
 *   · worker/lib/monthly-credit-store.js:12  users $or membershipCreditLotsVersion — 178/267 반환.
 *     인덱스가 있어도 선택도가 없어 COLLSCAN 이 정답이다. 만들지 않는다.
 *
 * 나머지(access·fortune·rpg·insights·크론)는 전부 IXSCAN 이었다. 계획 표가 지목한
 * `pointhistories metadata.profileId` · `payments 4키` · `users expiresAt` 인덱스는 **만들지 않는다.**
 *
 * db.js 가 autoIndex:false 로 연결하므로 models.js 의 userSchema.index 선언만으로는 생성되지 않는다.
 * 🔴 실행(인덱스 생성)은 사용자 별도 허가 후 1회. --check 는 읽기 전용이다.
 *
 * 실행: MONGO_URI="mongodb+srv://..." node scripts/migrations/20260830-add-request-path-indexes.mjs [--check]
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { User } from "../../worker/lib/models.js";

config({ path: ".env.local" });
config({ path: ".env" });

const CHECK = process.argv.includes("--check");

const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || process.env.DB_NAME || "",
};

if (!env.MONGO_URI && !env.MONGODB_URI) {
  console.error("❌ MONGO_URI 또는 MONGODB_URI 환경변수가 필요합니다.");
  process.exit(1);
}

const TARGETS = [
  {
    label: "users",
    model: User,
    indexes: [
      { spec: { referralCode: 1 }, options: { sparse: true, name: "referralCode_1" }, label: "referralCode 가입 유일성 루프 (auth.js:186)" },
    ],
  },
];

function specKey(spec) {
  return Object.entries(spec).map(([k, v]) => `${k}:${v}`).join(",");
}

async function migrate() {
  await connectDb(env);
  console.log(`[db] ${mongoose.connection.db.databaseName}`);

  let missing = 0;
  let conflict = 0;
  for (const target of TARGETS) {
    const existing = await target.model.collection.indexes().catch(() => []);
    const byKey = new Map(existing.map((index) => [specKey(index.key), index]));
    for (const index of target.indexes) {
      const found = byKey.get(specKey(index.spec));
      const label = `${target.label} :: ${index.label}`;
      if (found) {
        // 키는 같은데 옵션(sparse/unique/이름)이 다르면 createIndex 가 IndexOptionsConflict 로 죽는다.
        const optionsMatch = Boolean(found.sparse) === Boolean(index.options.sparse) && found.name === index.options.name;
        if (!optionsMatch) { console.log(`CONFLICT ${label} — 기존 ${found.name} sparse=${Boolean(found.sparse)}`); conflict += 1; continue; }
        console.log(`OK       ${label}`);
        continue;
      }
      if (CHECK) { console.log(`MISSING  ${label}`); missing += 1; continue; }
      await target.model.collection.createIndex(index.spec, index.options);
      console.log(`CREATED  ${label}`);
    }
  }

  console.log(`[${CHECK ? "check" : "apply"}] 누락=${missing} 충돌=${conflict}`);
  if (conflict > 0 || (CHECK && missing > 0)) process.exitCode = 1;
}

migrate()
  .catch((error) => {
    console.error(`❌ 마이그레이션 실패: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });

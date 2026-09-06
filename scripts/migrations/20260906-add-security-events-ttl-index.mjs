/**
 * security_events 90일 TTL 인덱스. 자동 실행되지 않으며 --check 는 읽기 전용이다.
 *
 * 이 컬렉션은 **쓰기 전용**이다 — 유일한 사용처가 worker/lib/security/index.js 의
 * `SecurityEvent.create()` 이고 읽는 코드는 0건이다(2026-08-24 3면 grep, 2026-09-06 재확인).
 * 그런데 TTL 이 없어 ipHash·userId·userAgent 를 담은 문서가 무기한 쌓인다
 * (2026-09-06 프로덕션 실측: 3,302건 · 가장 오래된 문서 2026-07-04 · 인덱스는 `_id_` 하나).
 * 보존 기간 90일은 2026-09-06 사용자 결정이며, 같은 성격의 checkout_funnel_events 와 같은 값이다.
 *
 * 인덱스 이름은 `createdAt_1`(mongoose 기본) 대신 `createdAt_ttl_90d` — checkout_funnel_events
 * 전례와 같은 규칙이고 listIndexes 출력만 봐도 TTL 임이 드러난다. 20260824-drop-unused-secondary-
 * indexes.mjs 의 드롭 목록에 `createdAt_1` 이 "no-reader" 로 남아 있지만, 그 스크립트의 inspect()
 * 가 `expireAfterSeconds !== undefined` 를 차단하므로(:97) 이름과 무관하게 이 TTL 은 안 지워진다.
 *
 * 🔴 plain 인덱스 드리프트를 함께 처리한다. 같은 키에 TTL 없는 인덱스가 이미 있으면 createIndex 는
 * IndexOptionsConflict 로 실패하고, 그 상태로 두면 "인덱스는 있는데 만료는 안 되는" 조용한 실패가
 * 된다 — 이 레포에 같은 사고 이력이 있다(20260705-fix-ttl-index-drift.mjs).
 *
 * 사용: node scripts/migrations/20260906-add-security-events-ttl-index.mjs [--check]
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { SecurityEvent } from "../../worker/lib/models.js";

config({ path: ".env.local" }); config({ path: ".env" });
const check = process.argv.includes("--check");
const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
};
if (!env.MONGO_URI) { console.error("MONGO_URI or MONGODB_URI is required."); process.exit(1); }

const KEY = { createdAt: 1 };
const EXPIRE_AFTER_SECONDS = 90 * 24 * 60 * 60;
const NAME = "createdAt_ttl_90d";

await connectDb(env);

const collection = SecurityEvent.collection;
const label = `${collection.collectionName} ${NAME}`;
const indexes = await collection.indexes();
const sameKey = indexes.filter((item) => JSON.stringify(item.key) === JSON.stringify(KEY));
const correct = sameKey.find((item) => item.expireAfterSeconds === EXPIRE_AFTER_SECONDS);
// TTL 이 아예 없거나 기간이 다른 같은-키 인덱스. 이것이 위에서 말한 드리프트다.
const drifted = sameKey.filter((item) => item.expireAfterSeconds !== EXPIRE_AFTER_SECONDS);

if (check) {
  if (correct) {
    console.log(`OK ${label} (expireAfterSeconds=${correct.expireAfterSeconds})`);
  } else if (drifted.length) {
    console.log(`DRIFT ${label} — same key exists without the expected TTL: ${drifted.map((i) => `${i.name}(expireAfterSeconds=${i.expireAfterSeconds ?? "none"})`).join(", ")}`);
  } else {
    console.log(`MISSING ${label}`);
  }
  const total = await collection.countDocuments();
  const expired = await collection.countDocuments({ createdAt: { $lt: new Date(Date.now() - EXPIRE_AFTER_SECONDS * 1000) } });
  console.log(`docs=${total} olderThanTtl=${expired}`);
  await mongoose.disconnect();
  if (!correct) process.exitCode = 1;
} else if (correct) {
  console.log(`SKIP ${label} (already present)`);
  await mongoose.disconnect();
} else {
  try {
    for (const stale of drifted) {
      await collection.dropIndex(stale.name);
      console.log(`DROPPED ${collection.collectionName} ${stale.name} (expireAfterSeconds=${stale.expireAfterSeconds ?? "none"})`);
    }
    await collection.createIndex(KEY, { name: NAME, expireAfterSeconds: EXPIRE_AFTER_SECONDS });
    console.log(`CREATED ${label} (expireAfterSeconds=${EXPIRE_AFTER_SECONDS})`);
    // 90일이 지난 문서는 백그라운드 태스크가 ~60초 내 지운다. 의도된 동작이다.
    console.log("NOTE: documents older than 90 days will be removed within ~60s by the TTL monitor.");
  } catch (error) {
    console.error(`FAILED ${label}: ${error?.codeName || error?.code || ""} ${error?.message || error}`);
    process.exitCode = 1;
  }
  await mongoose.disconnect();
}

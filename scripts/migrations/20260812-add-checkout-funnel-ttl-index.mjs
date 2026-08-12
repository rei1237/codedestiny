/**
 * checkout_funnel_events 90일 TTL 인덱스. 자동 실행되지 않으며 --check 는 읽기 전용이다.
 *
 * worker/lib/models.js:531 주석은 이 컬렉션이 "90일 TTL 로 스스로 사라진다"고 약속하고
 * :544 가 그 TTL 을 선언한다. 그런데 db.js 가 autoIndex:false 로 붙기 때문에 선언만으로는
 * 프로덕션에 인덱스가 생기지 않고, 이 컬렉션을 만드는 마이그레이션도 없었다.
 * 결과적으로 **자동 삭제가 한 번도 돈 적이 없고** 이벤트가 무기한 누적된다
 * (2026-08-12 감사 실측 545건, docs/db-audit-2026-08/01-collection-inventory.md:118).
 *
 * 개인식별자는 저장하지 않는 익명 집계 이벤트라 삭제에 따르는 권리·법적 문제는 없다.
 * 남는 것은 순수한 증가분이므로 선언된 의도대로 TTL 을 만들어 준다.
 *
 * 🔴 plain 인덱스 드리프트를 함께 처리한다. 같은 키에 TTL 없는 `createdAt_1` 이 이미 있으면
 * createIndex 는 IndexOptionsConflict 로 실패하고, 그 상태로 두면 "인덱스는 있는데 만료는
 * 안 되는" 조용한 실패가 된다 — 이 레포에 같은 사고 이력이 있다
 * (scripts/migrations/20260705-fix-ttl-index-drift.mjs: idempotency_keys·abuse_scores·
 *  refresh_tokens 가 정확히 그 상태였다). 그래서 존재 확인을 키뿐 아니라
 * expireAfterSeconds 까지 본 뒤, 어긋나면 드롭하고 다시 만든다.
 *
 * 사용: node scripts/migrations/20260812-add-checkout-funnel-ttl-index.mjs [--check]
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { CheckoutFunnelEvent } from "../../worker/lib/models.js";

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

const collection = CheckoutFunnelEvent.collection;
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
  console.log(`docs=${total}`);
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
    // TTL 이 붙으면 90일이 지난 문서는 백그라운드 태스크가 ~60초 내 지운다. 의도된 동작이다.
    console.log("NOTE: documents older than 90 days will be removed within ~60s by the TTL monitor.");
  } catch (error) {
    console.error(`FAILED ${label}: ${error?.codeName || error?.code || ""} ${error?.message || error}`);
    process.exitCode = 1;
  }
  await mongoose.disconnect();
}

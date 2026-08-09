/**
 * PointHistory consumption-check index migration. Never run automatically; --check is read-only.
 *
 * worker/routes/ziwei-island-ai.js repeatedly filters PointHistory on
 * { userId, kind: "deduct", featureKey } (one call site also sorts by createdAt desc) to decide
 * whether a paid feature was already consumed. The only existing indexes are
 * { userId: 1, createdAt: -1 } and a unique dedupeKey — kind/featureKey fall outside both, so
 * that lookup scans every point-history row for the user.
 *
 * 사용: node scripts/migrations/20260810-add-point-history-feature-lookup-index.mjs [--check]
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { PointHistory } from "../../worker/lib/models.js";

config({ path: ".env.local" }); config({ path: ".env" });
const check = process.argv.includes("--check");
const env = { MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "", MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "" };
if (!env.MONGO_URI) { console.error("MONGO_URI or MONGODB_URI is required."); process.exit(1); }

const specs = [
  [PointHistory, { userId: 1, kind: 1, featureKey: 1, createdAt: -1 }, { name: "user_kind_feature_lookup" }],
];

await connectDb(env);
let missing = 0;
for (const [model, key, options] of specs) {
  const label = `${model.collection.collectionName} ${options.name}`;
  const existing = await model.collection.indexes();
  const exists = existing.some((item) => JSON.stringify(item.key) === JSON.stringify(key));
  if (check) {
    console.log(`${exists ? "OK" : "MISSING"} ${label}`);
    if (!exists) missing += 1;
    continue;
  }
  if (exists) { console.log(`SKIP ${label} (already present)`); continue; }
  try {
    await model.collection.createIndex(key, options);
    console.log(`CREATED ${label}`);
  } catch (error) {
    // unique 인덱스는 기존 중복 데이터가 있으면 실패한다. 조용히 넘기지 말고 그대로 드러낸다.
    console.error(`FAILED ${label}: ${error?.codeName || error?.code || ""} ${error?.message || error}`);
    process.exitCode = 1;
  }
}
await mongoose.disconnect();
if (check && missing) process.exitCode = 1;

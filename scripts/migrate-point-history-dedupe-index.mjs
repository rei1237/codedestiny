// Adds the partial-unique index on PointHistory.dedupeKey that backs the share-reward
// idempotency guard (worker/routes/fortune.js handleShareReward). Safe to re-run.
//
// The index is partial (dedupeKey must be a non-empty string), so legacy share_reward
// documents — which have no dedupeKey — are excluded and cannot cause a build conflict.
// It only enforces "one grant per (user, contentId, KST-day)" for newly written rows.
//
//   node scripts/migrate-point-history-dedupe-index.mjs
import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";
import { PointHistory } from "../worker/lib/models.js";

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

const INDEX_SPEC = { dedupeKey: 1 };
const INDEX_OPTIONS = {
  unique: true,
  partialFilterExpression: {
    dedupeKey: { $exists: true, $type: "string", $gt: "" },
  },
};

await connectDb(env);

try {
  const collection = PointHistory.collection;

  // Pre-flight: report any existing dedupeKey collisions so the operator can resolve
  // them before a unique build would otherwise fail. (Fresh field → normally none.)
  const dupes = await collection
    .aggregate([
      { $match: { dedupeKey: { $exists: true, $type: "string", $gt: "" } } },
      { $group: { _id: "$dedupeKey", count: { $sum: 1 }, ids: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  if (dupes.length > 0) {
    console.error(`[migrate-point-history-dedupe-index] Found ${dupes.length} duplicate dedupeKey group(s):`);
    for (const group of dupes) {
      console.error(`  dedupeKey=${group._id} count=${group.count}`);
    }
    console.error("Resolve duplicates before creating the unique index. Aborting.");
    process.exit(2);
  }

  await collection.createIndex(INDEX_SPEC, INDEX_OPTIONS);
  console.log(`[migrate-point-history-dedupe-index] OK ${collection.collectionName} dedupeKey partial-unique`);
  console.log("[migrate-point-history-dedupe-index] complete");
} finally {
  await mongoose.disconnect();
}

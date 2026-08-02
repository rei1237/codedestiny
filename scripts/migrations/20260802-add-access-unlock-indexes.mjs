/**
 * Access unlock read-path indexes.
 *
 * This migration is intentionally explicit because Worker Mongo connections
 * use autoIndex:false. It is safe to inspect with --check or --dry-run; no
 * production migration is run as part of tests or builds.
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { ContentEntitlement, Payment, PointHistory } from "../../worker/lib/models.js";

config({ path: ".env.local" });
config({ path: ".env" });

const DRY_RUN = process.argv.includes("--dry-run");
const CHECK = process.argv.includes("--check");
const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || process.env.DB_NAME || "",
};

const INDEXES = [
  {
    collection: ContentEntitlement.collection,
    spec: { userId: 1, serviceKey: 1, status: 1, scope: 1, profileId: 1, expiresAt: 1 },
    options: { name: "access_snapshot_lookup" },
    label: "ContentEntitlement access snapshot",
  },
  {
    collection: PointHistory.collection,
    spec: { userId: 1, kind: 1, featureKey: 1, createdAt: -1 },
    options: { name: "access_backfill_history_lookup" },
    label: "PointHistory access backfill",
  },
  {
    collection: Payment.collection,
    spec: { userId: 1, paymentType: 1, status: 1, featureKey: 1, updatedAt: -1 },
    options: { name: "access_backfill_payment_lookup" },
    label: "Payment access backfill",
  },
];

function specKey(spec) {
  return Object.entries(spec).map(([key, value]) => `${key}:${value}`).join(",");
}

async function migrate() {
  if (!env.MONGO_URI && !env.MONGODB_URI) throw new Error("MONGO_URI or MONGODB_URI is required");
  await connectDb(env);

  let missing = 0;
  for (const index of INDEXES) {
    const existing = await index.collection.indexes().catch(() => []);
    const present = existing.some((candidate) => specKey(candidate.key || {}) === specKey(index.spec));
    console.log(`${present ? "OK" : "MISSING"} ${index.label}: ${specKey(index.spec)}`);
    if (!present) missing += 1;
    if (!CHECK && !DRY_RUN && !present) {
      await index.collection.createIndex(index.spec, index.options);
      console.log(`CREATED ${index.options.name}`);
    }
  }
  if (CHECK && missing) process.exitCode = 1;
}

migrate()
  .catch((error) => {
    console.error(`Access unlock index migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });

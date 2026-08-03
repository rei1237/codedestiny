/**
 * MongoDB migration - Fusion Fortune ticket, daily limit, and idempotency indexes.
 *
 * This script is never run by build or deploy. Use --check for a read-only
 * preflight. Creating indexes against production requires separate approval.
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import {
  FusionFortuneDailyLimit,
  FusionFortuneGenerationAttempt,
  FusionFortuneTicketBalance,
  FusionFortuneTicketTransaction,
} from "../../worker/lib/models.js";

config({ path: ".env.local" });
config({ path: ".env" });

const CHECK = process.argv.includes("--check");
const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || process.env.DB_NAME || "",
  MONGO_SERVER_SELECTION_TIMEOUT_MS: "10000",
  MONGO_CONNECT_TIMEOUT_MS: "10000",
  MONGO_SOCKET_TIMEOUT_MS: "45000",
  MONGO_WORKER_CONNECT_GUARD_MS: "15000",
  MONGO_MAX_POOL_SIZE: "5",
  MONGO_IP_FAMILY: process.env.MONGO_IP_FAMILY || "4",
  MONGO_IP_FAMILY_AUTO_FALLBACK: "true",
};

if (!env.MONGO_URI && !env.MONGODB_URI) {
  console.error("MONGO_URI or MONGODB_URI is required.");
  process.exit(1);
}

const collections = [
  {
    model: FusionFortuneTicketBalance,
    indexes: [
      { spec: { userId: 1 }, options: { unique: true, name: "fusion_ticket_user_unique" } },
    ],
  },
  {
    model: FusionFortuneTicketTransaction,
    indexes: [
      { spec: { paymentId: 1, type: 1 }, options: { unique: true, name: "fusion_payment_type_unique", partialFilterExpression: { paymentId: { $type: "string", $gt: "" } } } },
      { spec: { userId: 1, fusionRequestId: 1, type: 1 }, options: { unique: true, name: "fusion_request_use_unique", partialFilterExpression: { fusionRequestId: { $type: "string", $gt: "" } } } },
      { spec: { userId: 1, createdAt: -1 }, options: { name: "fusion_transaction_user_created" } },
    ],
  },
  {
    model: FusionFortuneDailyLimit,
    indexes: [
      { spec: { dateKey: 1 }, options: { unique: true, name: "fusion_daily_date_unique" } },
    ],
  },
  {
    model: FusionFortuneGenerationAttempt,
    indexes: [
      { spec: { requestId: 1 }, options: { unique: true, name: "fusion_attempt_request_unique" } },
      { spec: { expiresAt: 1 }, options: { expireAfterSeconds: 0, name: "fusion_attempt_expiry_ttl" } },
    ],
  },
];

const keyOf = (spec) => Object.entries(spec).map(([key, value]) => `${key}:${value}`).join(",");

async function run() {
  await connectDb(env);
  let missing = 0;
  for (const { model, indexes } of collections) {
    const existing = CHECK ? await model.collection.indexes().catch(() => []) : [];
    const existingKeys = new Set(existing.map((index) => keyOf(index.key)));
    for (const index of indexes) {
      if (CHECK) {
        const present = existingKeys.has(keyOf(index.spec));
        console.log(`${present ? "OK" : "MISSING"} ${model.collection.collectionName} ${index.options.name}`);
        if (!present) missing += 1;
      } else {
        await model.collection.createIndex(index.spec, index.options);
        console.log(`OK ${model.collection.collectionName} ${index.options.name}`);
      }
    }
  }
  if (CHECK && missing) {
    console.error(`Missing ${missing} Fusion Fortune indexes.`);
    process.exitCode = 1;
  }
}

run()
  .catch((error) => {
    console.error(`Fusion Fortune index migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());

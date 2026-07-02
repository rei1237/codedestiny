import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";
import {
  AstrologyAiConsultation,
  ContentEntitlement,
  KarmaDestinyAiConsultation,
  LifeBookAiConsultation,
  LoveSecretAiConsultation,
  NeoOperationRoomConsultation,
  NewYearAiConsultation,
  PaidExecutionRecord,
  Payment,
  PaymentFailureLog,
  PaymentWebhookEvent,
  RefreshTokenSession,
  ServiceExecutionTransaction,
  SukuyoCompatibilityAiConsultation,
  User,
  VedicAiConsultation,
  ZiweiAiConsultation,
} from "../worker/lib/models.js";

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

const launchModels = [
  User,
  RefreshTokenSession,
  Payment,
  PaymentFailureLog,
  PaymentWebhookEvent,
  ContentEntitlement,
  ServiceExecutionTransaction,
  PaidExecutionRecord,
  NewYearAiConsultation,
  KarmaDestinyAiConsultation,
  ZiweiAiConsultation,
  LoveSecretAiConsultation,
  LifeBookAiConsultation,
  SukuyoCompatibilityAiConsultation,
  VedicAiConsultation,
  AstrologyAiConsultation,
  NeoOperationRoomConsultation,
];

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hasSameKey(indexes, spec) {
  return indexes.some((index) => stableJson(index.key) === stableJson(spec));
}

function isAllowedOptionConflict(collection, spec, options = {}) {
  return collection === "refresh_tokens"
    && stableJson(spec) === "{\"expiresAt\":1}"
    && options.expireAfterSeconds === 0;
}

await connectDb(env);

try {
  for (const model of launchModels) {
    const indexes = await model.collection.listIndexes().toArray();
    const expectedIndexes = model.schema.indexes();
    for (const [spec, options = {}] of expectedIndexes) {
      try {
        await model.collection.createIndex(spec, options);
      } catch (error) {
        const isIndexConflict = error?.codeName === "IndexOptionsConflict"
          || error?.codeName === "IndexKeySpecsConflict";
        if (isIndexConflict && hasSameKey(indexes, spec) && isAllowedOptionConflict(model.collection.name, spec, options)) {
          console.warn(`[migrate-payments-read-indexes] WARN option conflict skipped ${model.collection.name} ${stableJson(spec)}`);
          continue;
        }
        throw error;
      }
    }
    console.log(`[migrate-payments-read-indexes] OK ${model.collection.name}`);
  }
  console.log("[migrate-payments-read-indexes] complete");
} finally {
  await mongoose.disconnect();
}

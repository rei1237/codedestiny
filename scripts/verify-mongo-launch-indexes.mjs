import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";
import {
  AbuseScore,
  AstrologyAiConsultation,
  ContentEntitlement,
  IdempotencyKey,
  KarmaDestinyAiConsultation,
  LifeBookAiConsultation,
  LlmResponseCache,
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
  IdempotencyKey,
  AbuseScore,
  Payment,
  PaymentFailureLog,
  PaymentWebhookEvent,
  ContentEntitlement,
  ServiceExecutionTransaction,
  PaidExecutionRecord,
  LlmResponseCache,
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

function optionMatches(expected = {}, actual = {}) {
  for (const key of ["unique", "sparse", "expireAfterSeconds"]) {
    if (expected[key] !== undefined && actual[key] !== expected[key]) return false;
  }
  if (expected.partialFilterExpression !== undefined) {
    return stableJson(expected.partialFilterExpression) === stableJson(actual.partialFilterExpression);
  }
  return true;
}

function hasIndex(indexes, spec, options = {}) {
  return indexes.some((index) => stableJson(index.key) === stableJson(spec) && optionMatches(options, index));
}

function hasIndexKey(indexes, spec) {
  return indexes.some((index) => stableJson(index.key) === stableJson(spec));
}

function isAllowedOptionWarning(collection, spec, options = {}) {
  return collection === "refresh_tokens"
    && stableJson(spec) === "{\"expiresAt\":1}"
    && options.expireAfterSeconds === 0;
}

await connectDb(env);

const failures = [];
const warnings = [];
try {
  for (const model of launchModels) {
    const indexes = await model.collection.listIndexes().toArray();
    const expectedIndexes = model.schema.indexes();
    for (const [spec, options = {}] of expectedIndexes) {
      if (hasIndex(indexes, spec, options)) continue;
      if (hasIndexKey(indexes, spec) && isAllowedOptionWarning(model.collection.name, spec, options)) {
        warnings.push(`${model.collection.name} ${stableJson(spec)}`);
      } else {
        failures.push(`${model.collection.name} ${stableJson(spec)}`);
      }
    }
    console.log(`[verify-mongo-launch-indexes] checked ${model.collection.name}`);
  }
} finally {
  await mongoose.disconnect();
}

if (failures.length) {
  console.error("[verify-mongo-launch-indexes] missing indexes:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

if (warnings.length) {
  console.warn("[verify-mongo-launch-indexes] option warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

console.log("[verify-mongo-launch-indexes] OK");

/*
 * 스키마가 선언한 인덱스가 실 DB 에 전부 있는지 — **모든 등록 모델**을 본다(읽기 전용).
 *
 * db.js 는 autoIndex:false 라 선언은 자동 생성되지 않는다. 그래서 "선언했지만 실물이 없는" 드리프트가
 * 조용히 쌓이고, 2026-09-06 에는 20개 손목록 밖 모델에서 7건이 발견됐다(원칙 10 — 손으로 쓴 대상
 * 목록은 가드가 아니다). 이제 4개 모델 파일을 등록 부수효과로 읽고 mongoose.models 를 전수 순회한다.
 * 실물 생성은 scripts/migrations/20260906-reconcile-index-drift.mjs --apply.
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";
import "../worker/lib/models.js";
import "../worker/lib/app-store-models.js";
import "../worker/lib/feedback-models.js";
import "../worker/lib/review-models.js";

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

const launchModels = Object.values(mongoose.models);
if (launchModels.length < 40) {
  console.error(`[verify-mongo-launch-indexes] 등록 모델이 ${launchModels.length}개뿐 — 모델 파일 로드 실패 의심(fail-closed)`);
  process.exit(1);
}

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

await connectDb(env);

const failures = [];
try {
  for (const model of launchModels) {
    // 컬렉션이 아직 없으면(한 번도 쓰이지 않은 모델) listIndexes 가 NamespaceNotFound(26) 를 던진다.
    // 그 모델의 선언은 전부 "없음"이 맞다 — 숨기지 않고 실패 목록에 올린다.
    const indexes = await model.collection.listIndexes().toArray().catch((error) => {
      if (error?.code === 26 || /ns does not exist/i.test(String(error?.message))) return [];
      throw error;
    });
    const expectedIndexes = model.schema.indexes();
    for (const [spec, options = {}] of expectedIndexes) {
      if (hasIndex(indexes, spec, options)) continue;
      failures.push(`${model.collection.name} ${stableJson(spec)}`);
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

console.log("[verify-mongo-launch-indexes] OK");

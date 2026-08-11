/**
 * MongoDB 컬렉션 인벤토리 감사 — 읽기 전용(쓰기 없음).
 *
 * 컬렉션별로 문서 수·인덱스·TTL·최근 쓰기 시각을 수집하고, 코드에 등록된 mongoose
 * 모델과 대조해 "DB에만 있는 고아 컬렉션" / "코드에만 있고 생성된 적 없는 컬렉션" /
 * "선언만 되고 실제로는 없는 인덱스"를 분리해 보고한다.
 *
 * 이 스크립트는 아무것도 쓰지 않는다. find/count/aggregate/listIndexes/listCollections
 * 외의 연산을 넣지 말 것. worker/lib/db.js 는 autoIndex:false 로 연결하므로 모델을
 * import 해도 인덱스가 생성되지 않는다(db.js:507).
 *
 * 실행:
 *   node scripts/audit-mongo-collections.mjs [--json] [--out <path>] [--exact-count-max 200000] [--max-time-ms 120000]
 *
 * --out 은 파일로 직접 쓴다. worker/lib/db.js 의 연결 로그가 stdout 으로 나가서
 * `--json > file` 리다이렉트가 JSON 을 오염시키기 때문이다(DB 쓰기와 무관).
 */

import { writeFileSync } from "node:fs";
import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";

// 모델 등록만이 목적이다(부수효과 import). 등록되면 mongoose.models 로 전부 열거된다.
import "../worker/lib/models.js";
import "../worker/lib/app-store-models.js";
import "../worker/lib/review-models.js";
import "../worker/lib/feedback-models.js";

// quiet: dotenv 배너는 stdout 으로 나가 --json 출력을 오염시킨다.
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

const OUT_PATH = String(argValue("--out", "") || "");
const AS_JSON = process.argv.includes("--json") || Boolean(OUT_PATH);
const EXACT_COUNT_MAX = Math.max(0, Math.floor(Number(argValue("--exact-count-max", 200000))) || 0);
const MAX_TIME_MS = Math.max(1000, Math.floor(Number(argValue("--max-time-ms", 120000))) || 120000);

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
  console.error("❌ MONGO_URI 또는 MONGODB_URI 환경변수가 필요합니다.");
  process.exit(1);
}

// scripts/verify-mongo-launch-indexes.mjs 의 비교 규칙과 같은 형태를 쓴다.
// 키 순서가 달라도 같은 인덱스로 보도록 정렬 직렬화한다.
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

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function describeIndex(index) {
  const parts = [];
  if (index.unique) parts.push("unique");
  if (index.sparse) parts.push("sparse");
  if (index.partialFilterExpression) parts.push("partial");
  if (index.expireAfterSeconds !== undefined) parts.push(`TTL=${index.expireAfterSeconds}s`);
  return {
    name: String(index.name || ""),
    key: index.key || {},
    flags: parts,
    expireAfterSeconds: index.expireAfterSeconds !== undefined ? Number(index.expireAfterSeconds) : null,
  };
}

/**
 * 가장 최근에 "생성된" 문서의 시각. _id 역순 1건만 읽는다(_id 인덱스만 타므로 저렴).
 * 🔴 최근 수정 시각이 아니다 — 기존 문서만 갱신되는 컬렉션(users 등)은 이 값이 오래돼 보인다.
 * _id 가 ObjectId 가 아닌 컬렉션(app_settings 등)은 타임스탬프를 못 뽑으므로 null 이다.
 */
async function readLastWrite(coll) {
  const docs = await coll
    .find({}, {
      projection: { _id: 1, createdAt: 1, updatedAt: 1, withdrawnAt: 1 },
      sort: { _id: -1 },
      limit: 1,
      maxTimeMS: MAX_TIME_MS,
    })
    .toArray();
  const doc = docs[0];
  if (!doc) return { lastObjectIdAt: null, lastCreatedAt: null, lastUpdatedAt: null };
  let lastObjectIdAt = null;
  try {
    if (doc._id && typeof doc._id.getTimestamp === "function") {
      lastObjectIdAt = toIso(doc._id.getTimestamp());
    }
  } catch {
    lastObjectIdAt = null;
  }
  return {
    lastObjectIdAt,
    lastCreatedAt: toIso(doc.createdAt),
    lastUpdatedAt: toIso(doc.updatedAt),
  };
}

async function main() {
  console.error("🔌 MongoDB 연결 중...");
  await connectDb(env);
  const db = mongoose.connection.db;
  console.error(`✅ 연결 완료 (db: ${db.databaseName})\n`);

  // 1. 코드에 등록된 모델 → 컬렉션명 매핑
  const modelsByCollection = new Map();
  for (const [modelName, model] of Object.entries(mongoose.models)) {
    const collectionName = model?.collection?.collectionName;
    if (!collectionName) continue;
    if (!modelsByCollection.has(collectionName)) modelsByCollection.set(collectionName, []);
    modelsByCollection.get(collectionName).push(modelName);
  }

  // 2. DB 실제 컬렉션
  const rawCollections = await db.listCollections().toArray();
  const collections = rawCollections
    .filter((entry) => !String(entry.name || "").startsWith("system."))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  const report = [];
  for (const entry of collections) {
    const name = String(entry.name);
    const isView = String(entry.type || "collection") === "view";
    const coll = db.collection(name);

    let estimatedCount = null;
    let exactCount = null;
    let rawIndexes = [];
    let lastWrite = { lastObjectIdAt: null, lastCreatedAt: null, lastUpdatedAt: null };

    if (!isView) {
      estimatedCount = await coll.estimatedDocumentCount({ maxTimeMS: MAX_TIME_MS });
      if (estimatedCount <= EXACT_COUNT_MAX) {
        exactCount = await coll.countDocuments({}, { maxTimeMS: MAX_TIME_MS });
      }
      rawIndexes = await coll.listIndexes().toArray();
      if ((exactCount ?? estimatedCount) > 0) {
        lastWrite = await readLastWrite(coll);
      }
    }

    const indexes = rawIndexes.map(describeIndex);
    report.push({
      collection: name,
      type: isView ? "view" : "collection",
      modeledBy: modelsByCollection.get(name) || [],
      hasValidator: Boolean(entry.options?.validator),
      estimatedCount,
      exactCount,
      documentCount: exactCount ?? estimatedCount,
      indexCount: indexes.length,
      ttlIndexes: indexes.filter((index) => index.expireAfterSeconds !== null),
      indexes,
      rawIndexes,
      ...lastWrite,
    });
    console.error(`  · ${name} (${exactCount ?? estimatedCount ?? "-"}건)`);
  }

  // 3. 코드 ↔ DB 대조
  const dbCollectionNames = new Set(report.map((row) => row.collection));
  const orphanCollections = report
    .filter((row) => row.modeledBy.length === 0)
    .map((row) => ({ collection: row.collection, documentCount: row.documentCount, lastObjectIdAt: row.lastObjectIdAt }));
  const neverMaterialized = [...modelsByCollection.entries()]
    .filter(([collectionName]) => !dbCollectionNames.has(collectionName))
    .map(([collectionName, models]) => ({ collection: collectionName, modeledBy: models }))
    .sort((a, b) => a.collection.localeCompare(b.collection));

  // 4. 선언 인덱스 vs 실제 인덱스 (db.js 가 autoIndex:false 라 선언이 곧 존재를 뜻하지 않는다)
  const missingIndexes = [];
  for (const [modelName, model] of Object.entries(mongoose.models)) {
    const collectionName = model?.collection?.collectionName;
    if (!collectionName || !dbCollectionNames.has(collectionName)) continue;
    const actualIndexes = report.find((item) => item.collection === collectionName)?.rawIndexes || [];
    for (const [spec, options = {}] of model.schema.indexes()) {
      if (hasIndex(actualIndexes, spec, options)) continue;
      missingIndexes.push({
        collection: collectionName,
        model: modelName,
        key: spec,
        options,
        indexName: options.name || null,
      });
    }
  }

  const summary = {
    database: db.databaseName,
    generatedAt: new Date().toISOString(),
    collectionCount: report.length,
    registeredModelCount: Object.keys(mongoose.models).length,
    totalDocuments: report.reduce((acc, row) => acc + (row.documentCount || 0), 0),
    emptyCollections: report.filter((row) => (row.documentCount || 0) === 0).map((row) => row.collection),
    orphanCollections,
    neverMaterialized,
    missingIndexes,
  };

  if (AS_JSON) {
    // rawIndexes 는 indexes 의 원본 중복이라 스냅샷에서는 뺀다.
    const serialized = report.map((row) => {
      const copy = { ...row };
      delete copy.rawIndexes;
      return copy;
    });
    const text = JSON.stringify({ summary, collections: serialized }, null, 2);
    if (OUT_PATH) {
      writeFileSync(OUT_PATH, `${text}\n`, "utf8");
      console.error(`💾 저장 완료: ${OUT_PATH}`);
    } else {
      console.log(text);
    }
    return;
  }

  const pad = (value, width) => String(value).padEnd(width);
  const padL = (value, width) => String(value).padStart(width);

  console.log(`\n📦 컬렉션 인벤토리 — db: ${db.databaseName} (총 ${report.length}개, 문서 ${summary.totalDocuments.toLocaleString()}건)\n`);
  console.log(`  ${pad("collection", 40)} ${padL("문서수", 9)} ${padL("idx", 4)} ${padL("TTL", 4)} ${pad("모델", 30)} 최근생성`);
  console.log(`  ${"-".repeat(40)} ${"-".repeat(9)} ${"-".repeat(4)} ${"-".repeat(4)} ${"-".repeat(30)} ${"-".repeat(10)}`);
  for (const row of report) {
    console.log(
      `  ${pad(row.collection.slice(0, 40), 40)} ${padL((row.documentCount ?? "-").toLocaleString?.() ?? "-", 9)} ` +
      `${padL(row.indexCount, 4)} ${padL(row.ttlIndexes.length || "", 4)} ` +
      `${pad((row.modeledBy[0] || "(모델없음)").slice(0, 30), 30)} ${(row.lastObjectIdAt || row.lastUpdatedAt || "-").slice(0, 10)}`,
    );
  }

  console.log(`\n🟡 모델 없는 컬렉션 (${orphanCollections.length}개)`);
  for (const row of orphanCollections) {
    console.log(`  · ${row.collection} — ${(row.documentCount ?? 0).toLocaleString()}건, 최근생성 ${row.lastObjectIdAt || "-"}`);
  }

  console.log(`\n🟡 코드에만 있고 DB에 없는 컬렉션 (${neverMaterialized.length}개)`);
  for (const row of neverMaterialized) {
    console.log(`  · ${row.collection} ← ${row.modeledBy.join(", ")}`);
  }

  console.log(`\n🔴 선언됐지만 실제로 없는 인덱스 (${missingIndexes.length}개)`);
  for (const row of missingIndexes) {
    console.log(`  · ${row.collection} ${stableJson(row.key)}${row.indexName ? ` (${row.indexName})` : ""}`);
  }

  console.log(`\n⚪ 빈 컬렉션 (${summary.emptyCollections.length}개): ${summary.emptyCollections.join(", ") || "(없음)"}`);
}

main()
  .catch((error) => {
    console.error("❌ 감사 실패:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.error("\n🔌 MongoDB 연결 종료");
  });

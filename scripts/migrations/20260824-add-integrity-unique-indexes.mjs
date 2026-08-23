/**
 * 정합성 유니크 인덱스 2건을 만든다.
 *
 * 2026-08-24 `verify:mongo-launch-indexes` 실측에서 미생성 7건이 나왔는데, 그중 5건은
 * unique 없는 단일 필드 인덱스이고 값이 거의 상수인 필드라(schemaVersion 기본 1 · serviceType
 * 기본값 · degraded 불리언 · featureKey 기본값) 만들면 읽기 이득 없이 쓰기 비용만 붙는다.
 * 나머지 2건은 성격이 다르다 — **성능이 아니라 제약**이다.
 *
 *   ① paid_execution_records {paymentId:1} unique+partial — "결제 1건당 실행기록 1건"
 *   ② astrologyAiConsultations {id:1} unique — 상담 세션 식별자
 *
 * 🔴 문서가 적다고 안전한 것이 아니라 **아직 충돌이 안 났을 뿐**이다. worker/lib/db.js 가
 * autoIndex:false 라 스키마 선언은 실물이 아니고, 그래서 두 제약은 지금 강제되지 않는다.
 *
 * 🔴 중복 사전 스캔은 읽기 전용이고 모든 모드에서 돈다. 중복이 있으면 createIndex 가 E11000 으로
 * 죽는데, 그 맨 드라이버 오류 대신 어느 행이 막고 있는지를 보여준다. 중복 정리는 "어느 행이
 * 이기는가"라는 정책 판단이라 여기서 지우거나 고치지 않는다(20260804-add-permanent-unlock-index
 * 와 같은 계약).
 *
 * 실행: node scripts/migrations/20260824-add-integrity-unique-indexes.mjs [--check|--dry-run]
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { AstrologyAiConsultation, PaidExecutionRecord } from "../../worker/lib/models.js";

config({ path: ".env.local" });
config({ path: ".env" });

const CHECK = process.argv.includes("--check");
const DRY_RUN = process.argv.includes("--dry-run");
const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || process.env.DB_NAME || "",
};

// 🔴 각 항목의 spec·options 는 worker/lib/models.js 의 선언과 글자 그대로 같아야 한다. 키가 같고
// 이름만 다르면 IndexOptionsConflict 로 죽는다(20260802 와 20260810 이 pointhistories 에 같은 키를
// 다른 이름으로 선언해 둔 전례가 있다).
const TARGETS = [
  {
    label: "paid_execution_records.paymentId_unique_nonempty",
    model: PaidExecutionRecord,
    spec: { paymentId: 1 },
    options: {
      name: "paymentId_unique_nonempty",
      unique: true,
      partialFilterExpression: { paymentId: { $exists: true, $type: "string", $gt: "" } },
    },
    // 스캔 대상을 partialFilterExpression 에서 그대로 파생시켜, 인덱스가 덮는 문서 집합과 항상
    // 일치하게 한다(둘을 따로 적으면 드리프트가 생긴다).
    groupKey: "$paymentId",
    sampleFields: { userId: "$userId", featureId: "$featureId", requestId: "$requestId", createdAt: "$createdAt" },
  },
  {
    label: "astrologyAiConsultations.id_1",
    model: AstrologyAiConsultation,
    spec: { id: 1 },
    // 🔴 2026-08-24 실측: 전체 9건 중 8건이 id 필드를 아예 갖고 있지 않다(null 0 · 빈 문자열 0).
    // 필터 없는 유니크 인덱스는 그 8건이 서로 충돌해 E11000 으로 생성 자체가 막힌다. 그래서
    // partial 로 그 8건을 제외한다 — worker/lib/models.js 의 선언도 같은 필터로 맞춰 두었다.
    // 앞으로 들어오는 문서는 required:true 라 전부 이 필터 안에 들어오므로 제약이 성립한다.
    options: {
      name: "id_1",
      unique: true,
      partialFilterExpression: { id: { $exists: true, $type: "string", $gt: "" } },
    },
    groupKey: "$id",
    sampleFields: { userId: "$userId", createdAt: "$createdAt" },
  },
];

const GROUP_LIMIT = 200;
const SAMPLE_LIMIT = 20;

function buildDuplicatePipeline(target) {
  const stages = [];
  if (target.options.partialFilterExpression) {
    stages.push({ $match: target.options.partialFilterExpression });
  }
  stages.push(
    { $group: { _id: target.groupKey, count: { $sum: 1 }, rows: { $push: target.sampleFields } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: GROUP_LIMIT },
  );
  return stages;
}

async function scanDuplicates(target) {
  const groups = await target.model.collection
    .aggregate(buildDuplicatePipeline(target), { allowDiskUse: true })
    .toArray();
  const conflictingRows = groups.reduce((sum, group) => sum + (group.count - 1), 0);
  console.log(`SCANNED_GROUPS ${target.label} ${groups.length}`);
  console.log(`CONFLICTING_ROWS ${target.label} ${conflictingRows}`);
  for (const group of groups.slice(0, SAMPLE_LIMIT)) {
    console.log(`DUP ${target.label} value=${JSON.stringify(group._id)} count=${group.count}`);
  }
  if (groups.length > SAMPLE_LIMIT) {
    console.log(`DUP_TRUNCATED ${target.label} ${groups.length - SAMPLE_LIMIT} more groups not shown`);
  }
  return groups.length;
}

async function handleTarget(target) {
  const indexes = await target.model.collection.indexes();
  const present = indexes.some((index) => index.name === target.options.name);
  console.log(`${present ? "OK" : "MISSING"} ${target.label}`);

  // 🔴 이미 있어도 스캔은 돈다. "있다"는 것과 "제약이 유효하다"는 것은 다른 사실이고, 사람이
  // unique 없이 같은 이름으로 만들어 둔 경우를 여기서 보여줘야 한다.
  const duplicateGroups = await scanDuplicates(target);
  if (duplicateGroups > 0) {
    console.log(`RESULT ${target.label} DUPLICATES`);
    return false;
  }
  if (present) {
    console.log(`RESULT ${target.label} OK`);
    return true;
  }
  if (CHECK || DRY_RUN) {
    console.log(`RESULT ${target.label} MISSING_INDEX`);
    return false;
  }
  await target.model.collection.createIndex(target.spec, target.options);
  console.log(`CREATED ${target.label}`);
  console.log(`RESULT ${target.label} OK`);
  return true;
}

async function migrate() {
  if (!env.MONGO_URI && !env.MONGODB_URI) throw new Error("MONGO_URI or MONGODB_URI is required");
  await connectDb(env);

  // 🔴 한 항목이 막혀도 나머지를 건너뛰지 않는다. 둘은 서로 독립이고, 한 번의 실행으로 두 컬렉션의
  // 상태를 모두 알 수 있어야 운영자가 판단할 수 있다.
  let allOk = true;
  for (const target of TARGETS) {
    const ok = await handleTarget(target);
    if (!ok) allOk = false;
  }

  console.log(allOk ? "RESULT OK" : "RESULT INCOMPLETE");
  if (!allOk) process.exitCode = 1;
}

migrate()
  .catch((error) => {
    console.error(`Integrity unique index migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });

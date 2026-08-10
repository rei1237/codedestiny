/**
 * Adds the canonical permanent-unlock identity index.
 *
 * Existing documents are not backfilled or deleted. Only documents with a
 * non-empty featureKey participate, so legacy entitlement rows remain readable.
 * Use --check or --dry-run for read-only validation before an approved run.
 *
 * The duplicate pre-scan is read-only and runs in every mode. createIndex would
 * fail with E11000 if conflicting rows exist; scanning first tells the operator
 * which rows block it instead of surfacing a bare driver error. Conflicting rows
 * are never deleted or rewritten here.
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { ContentEntitlement } from "../../worker/lib/models.js";

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
// contentKey 포함이 정본이다(worker/lib/models.js 의 선언과 일치해야 한다). featureKey 가 상수이고
// contentKey 만 연도별로 다른 상품(sukyo_yearly_fortune_unlock)이 있어 contentKey 없이는 다년 보유가 막힌다.
const spec = { userId: 1, profileId: 1, featureKey: 1, contentKey: 1, scope: 1 };
const options = {
  unique: true,
  name: "permanent_unlock_identity",
  partialFilterExpression: { featureKey: { $exists: true, $type: "string", $gt: "" } },
};

// $match 를 partialFilterExpression 에서 그대로 파생시켜, 스캔 대상이 인덱스가 덮는 문서 집합과
// 항상 일치하게 한다(둘을 따로 적으면 드리프트가 생긴다).
const DUPLICATE_PIPELINE = [
  { $match: options.partialFilterExpression },
  {
    $group: {
      _id: {
        userId: "$userId",
        profileId: "$profileId",
        featureKey: "$featureKey",
        contentKey: "$contentKey",
        scope: "$scope",
      },
      count: { $sum: 1 },
      rows: {
        $push: {
          _id: "$_id",
          serviceKey: "$serviceKey",
          status: "$status",
          source: "$source",
          grantedAt: "$grantedAt",
        },
      },
    },
  },
  { $match: { count: { $gt: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 200 },
];

const SAMPLE_LIMIT = 20;

async function scanDuplicates() {
  const groups = await ContentEntitlement.collection
    .aggregate(DUPLICATE_PIPELINE, { allowDiskUse: true })
    .toArray();
  const conflictingRows = groups.reduce((sum, group) => sum + (group.count - 1), 0);
  console.log(`SCANNED_GROUPS ${groups.length}`);
  console.log(`CONFLICTING_ROWS ${conflictingRows}`);
  for (const group of groups.slice(0, SAMPLE_LIMIT)) {
    const { userId, profileId, featureKey, contentKey, scope } = group._id;
    console.log(`DUP ${userId} ${profileId} ${featureKey} ${contentKey} ${scope} count=${group.count}`);
  }
  if (groups.length > SAMPLE_LIMIT) {
    console.log(`DUP_TRUNCATED ${groups.length - SAMPLE_LIMIT} more groups not shown`);
  }
  return groups.length;
}

async function migrate() {
  if (!env.MONGO_URI && !env.MONGODB_URI) throw new Error("MONGO_URI or MONGODB_URI is required");
  await connectDb(env);
  const indexes = await ContentEntitlement.collection.indexes();
  const present = indexes.some((index) => index.name === options.name);
  console.log(`${present ? "OK" : "MISSING"} ${options.name}`);

  const duplicateGroups = await scanDuplicates();

  if (duplicateGroups > 0) {
    // 중복 정리는 정책 판단이 필요하다(어느 행이 이기는가). 여기서 자동으로 지우거나 고치지 않는다.
    console.log("RESULT DUPLICATES");
    process.exitCode = 1;
    return;
  }
  if (CHECK) {
    console.log(present ? "RESULT OK" : "RESULT MISSING_INDEX");
    if (!present) process.exitCode = 1;
    return;
  }
  if (present || DRY_RUN) {
    console.log(present ? "RESULT OK" : "RESULT MISSING_INDEX");
    return;
  }
  await ContentEntitlement.collection.createIndex(spec, options);
  console.log(`CREATED ${options.name}`);
  console.log("RESULT OK");
}

migrate()
  .catch((error) => {
    console.error(`Permanent unlock index migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });

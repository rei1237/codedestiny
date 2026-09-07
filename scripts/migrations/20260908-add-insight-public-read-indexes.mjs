/**
 * 인사이트 공개 목록의 페이지 단위 집계와 Atlas Search 인덱스.
 *
 * db.js 는 autoIndex:false 이므로 models.js 선언만으로는 운영 인덱스가 생기지 않는다.
 * --check 는 읽기 전용이며, --apply 는 스테이징에서 READY와 explain을 확인한 뒤에만 실행한다.
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { Insight } from "../../worker/lib/models.js";

config({ path: ".env.local" });
config({ path: ".env" });

const CHECK = process.argv.includes("--check");
const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || process.env.DB_NAME || "",
};

const INDEXES = [
  {
    spec: { type: 1, status: 1, publishedAt: -1, updatedAt: -1, createdAt: -1 },
    options: { name: "insight_public_latest_v1" },
  },
  {
    spec: { type: 1, status: 1, isFeatured: 1, publishedAt: -1, updatedAt: -1, createdAt: -1 },
    options: { name: "insight_public_featured_latest_v1" },
  },
];

const SEARCH_INDEX = {
  name: "insights_public_search_v1",
  definition: {
    mappings: {
      dynamic: false,
      fields: Object.fromEntries([
        "title", "subtitle", "summary", "excerpt", "content", "contentHtml", "body",
        "category", "categoryLabel", "tags", "tag",
      ].map((field) => [field, { type: "string", analyzer: "lucene.korean" }])),
    },
  },
};

function specKey(spec) {
  return JSON.stringify(spec);
}

async function main() {
  if (!env.MONGO_URI && !env.MONGODB_URI) throw new Error("MONGO_URI 또는 MONGODB_URI 환경변수가 필요합니다.");
  await connectDb(env);

  const existing = await Insight.collection.indexes();
  const byKey = new Map(existing.map((index) => [specKey(index.key), index]));
  let missing = 0;

  for (const index of INDEXES) {
    const found = byKey.get(specKey(index.spec));
    if (found) {
      console.log(`OK       ${index.options.name} (${found.name})`);
      continue;
    }
    missing += 1;
    if (CHECK) console.log(`MISSING  ${index.options.name}`);
    else {
      await Insight.collection.createIndex(index.spec, index.options);
      console.log(`CREATED  ${index.options.name}`);
    }
  }

  const searchIndexes = await Insight.collection.listSearchIndexes(SEARCH_INDEX.name).toArray();
  const search = searchIndexes.find((index) => index.name === SEARCH_INDEX.name);
  const ready = String(search?.status || "").toUpperCase() === "READY";
  if (ready) console.log(`OK       ${SEARCH_INDEX.name} READY`);
  else if (CHECK) {
    missing += 1;
    console.log(`MISSING  ${SEARCH_INDEX.name} READY`);
  } else if (search) {
    console.log(`PENDING  ${SEARCH_INDEX.name} status=${search.status || "unknown"}`);
  } else {
    await Insight.collection.createSearchIndex(SEARCH_INDEX);
    console.log(`CREATED  ${SEARCH_INDEX.name} (Atlas가 READY가 될 때까지 기다린 뒤 --check 재실행)`);
  }

  if (CHECK && missing > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(`❌ 인사이트 인덱스 확인 실패: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });

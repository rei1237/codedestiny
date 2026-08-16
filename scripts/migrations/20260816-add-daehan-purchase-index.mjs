/**
 * daehan_purchases 의 {userId, profileId} unique 인덱스. --check 는 읽기 전용이다.
 *
 * 이 컬렉션에는 mongoose 모델이 없다 — `worker/routes/ziwei-daehan.js` 가 raw 드라이버로
 * 직접 읽고 쓴다. 그래서 `verify:mongo-launch-indexes`(모델 레지스트리 순회)의 사각지대에
 * 있었고, 대신 라우트가 요청 경로에서 `ensureDaehanIndexes()` 로 직접 createIndex 를 불러
 * 왔다. 그 방식은 **아이솔레이트가 새로 뜰 때마다 최초 요청 1건이 createIndex 왕복을
 * 지불**한다(모듈 스코프 프로미스라 아이솔레이트당 1회).
 *
 * 이 스크립트가 그 역할을 넘겨받아 상태 조회 경로에서 런타임 createIndex 를 걷어낸다.
 * 🔴 결제 무결성 장치이므로 unlock(쓰기) 경로의 ensureDaehanIndexes 호출은 그대로 둔다 —
 *    이 유니크 제약이 곧 대한 구매 중복 방지이고, 마이그레이션 미실행 환경에서 그것이
 *    조용히 사라지면 같은 프로필에 중복 구매가 들어갈 수 있다.
 *
 * 사용: node scripts/migrations/20260816-add-daehan-purchase-index.mjs [--check]
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";

config({ path: ".env.local" }); config({ path: ".env" });
const check = process.argv.includes("--check");
const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
};
if (!env.MONGO_URI) { console.error("MONGO_URI or MONGODB_URI is required."); process.exit(1); }

const COLLECTION = "daehan_purchases";
const KEY = { userId: 1, profileId: 1 };
const NAME = "uniq_daehan_purchase_user_profile";

await connectDb(env);

const collection = mongoose.connection.db.collection(COLLECTION);
const label = `${COLLECTION} ${NAME}`;
const indexes = await collection.indexes().catch(() => []);
const existing = indexes.find((item) => JSON.stringify(item.key) === JSON.stringify(KEY) && item.unique === true);

if (check) {
  console.log(existing ? `OK ${label}` : `MISSING ${label}`);
  console.log(`docs=${await collection.countDocuments()}`);
  await mongoose.disconnect();
  if (!existing) process.exitCode = 1;
} else if (existing) {
  console.log(`SKIP ${label} (already present)`);
  await mongoose.disconnect();
} else {
  try {
    await collection.createIndex(KEY, { unique: true, name: NAME });
    console.log(`CREATED ${label}`);
  } catch (error) {
    // unique 라 기존 중복이 있으면 E11000 으로 실패한다. 삼키지 말고 그대로 드러낸다.
    console.error(`FAILED ${label}: ${error?.codeName || error?.code || ""} ${error?.message || error}`);
    process.exitCode = 1;
  }
  await mongoose.disconnect();
}

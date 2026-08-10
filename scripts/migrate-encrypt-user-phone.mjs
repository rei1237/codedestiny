/**
 * 기존 User.phoneNumber 평문 레코드를 AES-256-GCM 봉투로 일괄 전환한다.
 *
 * 🔴 기본 동작은 dry-run 이다. 실제 쓰기는 `--apply` 를 명시해야만 일어난다.
 * 🔴 실행 전 MongoDB 백업을 확보할 것 — 배포 후 데이터 포맷이 바뀌므로 되돌리기가 쉽지 않다.
 *
 * 코드는 평문도 그대로 읽을 수 있으므로(worker/lib/pii-crypto.js 의 하위호환 읽기)
 * 이 스크립트를 돌리지 않아도 서비스는 정상 동작한다. 이건 "이미 쌓인 평문을 없애는" 작업이다.
 *
 *   node scripts/migrate-encrypt-user-phone.mjs                 # dry-run (쓰기 없음)
 *   node scripts/migrate-encrypt-user-phone.mjs --limit=100     # 앞 100건만 미리보기
 *   node scripts/migrate-encrypt-user-phone.mjs --apply         # 실제 전환
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";
import { User } from "../worker/lib/models.js";
import { encryptPhoneNumber, isEncryptedPiiValue, maskKoreanPhoneNumber, normalizeKoreanPhoneNumber } from "../worker/lib/pii-crypto.js";

config({ path: ".env.local" });
config({ path: ".env" });

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const limitArg = args.find((value) => value.startsWith("--limit="));
const limit = limitArg ? Math.max(0, Number(limitArg.split("=")[1]) || 0) : 0;

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
  PII_ENC_KEY: process.env.PII_ENC_KEY || "",
};

if (!env.MONGO_URI && !env.MONGODB_URI) {
  console.error("MONGO_URI or MONGODB_URI is required.");
  process.exit(1);
}
if (!env.PII_ENC_KEY) {
  console.error("PII_ENC_KEY is required (base64, 32 bytes). Use the same value the worker has.");
  process.exit(1);
}

// 키가 실제로 쓸 수 있는 값인지 DB 를 건드리기 전에 확인한다.
try {
  const probe = await encryptPhoneNumber("01012345678", env);
  if (!isEncryptedPiiValue(probe)) throw new Error("unexpected envelope");
} catch (error) {
  console.error(`PII_ENC_KEY is unusable: ${error?.message || error}`);
  process.exit(1);
}

await connectDb(env);
console.log(`[migrate-encrypt-user-phone] mode=${apply ? "APPLY" : "DRY-RUN"}${limit ? ` limit=${limit}` : ""}`);

const cursor = User.collection.find(
  { phoneNumber: { $nin: [null, ""] } },
  { projection: { _id: 1, phoneNumber: 1 } },
);

const stats = { scanned: 0, alreadyEncrypted: 0, converted: 0, unusable: 0 };
const samples = [];

for await (const doc of cursor) {
  if (limit && stats.scanned >= limit) break;
  stats.scanned += 1;

  const stored = String(doc.phoneNumber || "");
  if (isEncryptedPiiValue(stored)) {
    stats.alreadyEncrypted += 1;
    continue;
  }

  const plain = normalizeKoreanPhoneNumber(stored);
  if (!plain) {
    // 정규화되지 않는 값은 결제에도 못 쓰는 쓰레기 값이다. 건드리지 않고 세기만 한다.
    stats.unusable += 1;
    continue;
  }

  const envelope = await encryptPhoneNumber(plain, env);
  if (apply) {
    await User.collection.updateOne({ _id: doc._id }, { $set: { phoneNumber: envelope } });
  }
  stats.converted += 1;
  if (samples.length < 5) samples.push(`${String(doc._id)} ${maskKoreanPhoneNumber(plain)} -> v1:…`);
}

console.log(JSON.stringify(stats, null, 2));
if (samples.length) console.log(`samples:\n  ${samples.join("\n  ")}`);
if (!apply && stats.converted > 0) {
  console.log(`\n${stats.converted} record(s) would be encrypted. Re-run with --apply after taking a database backup.`);
}
if (stats.unusable > 0) {
  console.log(`${stats.unusable} record(s) hold a value that is not a usable Korean mobile number; left untouched.`);
}

await mongoose.disconnect();

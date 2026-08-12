/**
 * 기존 User.phoneNumber 평문 레코드를 AES-256-GCM 봉투로 일괄 전환한다.
 *
 * 🔴 기본 동작은 dry-run 이다. 실제 쓰기는 `--apply` 를 명시해야만 일어난다.
 * 🔴 실행 전 MongoDB 백업을 확보할 것 — 배포 후 데이터 포맷이 바뀌므로 되돌리기가 쉽지 않다.
 *
 * 코드는 평문도 그대로 읽을 수 있으므로(worker/lib/pii-crypto.js 의 하위호환 읽기)
 * 이 스크립트를 돌리지 않아도 서비스는 정상 동작한다. 이건 "이미 쌓인 평문을 없애는" 작업이다.
 *
 *   node scripts/migrate-encrypt-user-phone.mjs --check          # 키 일치 증명 + 현황 (쓰기 없음)
 *   node scripts/migrate-encrypt-user-phone.mjs                 # dry-run (쓰기 없음)
 *   node scripts/migrate-encrypt-user-phone.mjs --limit=100     # 앞 100건만 미리보기
 *   node scripts/migrate-encrypt-user-phone.mjs --apply         # 실제 전환
 *
 * 🔴 --apply 전에 반드시 --check 를 통과시킬 것. 아래 프리플라이트는 키가 32바이트인지만 보고
 * 자기 자신과 라운드트립하므로, 프로덕션과 **다른** 키여도 통과한다. 다른 키로 --apply 하면
 * decryptPhoneNumber 가 예외 없이 ""를 돌려(pii-crypto.js) 워커는 "번호 없음"으로 조용히
 * 동작하고, 평문 원본은 이미 덮여 복구할 수 없다. --check 는 이미 암호화된 레코드를 후보 키로
 * 실제 복호화해 그 조합을 막는다.
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";
import { User } from "../worker/lib/models.js";
import { decryptPhoneNumber, encryptPhoneNumber, isEncryptedPiiValue, maskKoreanPhoneNumber, normalizeKoreanPhoneNumber } from "../worker/lib/pii-crypto.js";

config({ path: ".env.local" });
config({ path: ".env" });

const args = process.argv.slice(2);
const check = args.includes("--check");
const apply = args.includes("--apply") && !check;
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

/**
 * 후보 키가 프로덕션 워커의 키와 같은지 증명한다.
 *
 * 방법: 이미 봉투로 저장된 레코드를 후보 키로 복호화해 본다. 그 봉투는 라이브 워커가 만든
 * 것이므로, 복호화가 성공하면 두 키는 같다. 실패하면 다르다. decryptPhoneNumber 는 실패해도
 * throw 하지 않고 ""를 돌리므로 성공 판정은 "정규화된 번호가 나왔는가"로 한다.
 *
 * 봉투 레코드가 하나도 없으면 증명할 재료가 없다 — 그 경우 통과시키지 않는다.
 */
async function runKeyCheck() {
  const buckets = { total: 0, encrypted: 0, plaintext: 0, unusable: 0, decryptOk: 0, decryptFail: 0 };
  const cursor = User.collection.find(
    { phoneNumber: { $nin: [null, ""] } },
    { projection: { _id: 1, phoneNumber: 1 } },
  );

  for await (const doc of cursor) {
    buckets.total += 1;
    const stored = String(doc.phoneNumber || "");
    if (isEncryptedPiiValue(stored)) {
      buckets.encrypted += 1;
      const plain = await decryptPhoneNumber(stored, env);
      if (plain) buckets.decryptOk += 1;
      else buckets.decryptFail += 1;
      continue;
    }
    if (normalizeKoreanPhoneNumber(stored)) buckets.plaintext += 1;
    else buckets.unusable += 1;
  }

  console.log(JSON.stringify(buckets, null, 2));

  if (buckets.encrypted === 0) {
    console.error(
      "\n❌ 봉투로 저장된 레코드가 하나도 없어 키 일치를 증명할 수 없습니다.\n" +
      "   먼저 실서비스에서 전화번호를 1건 저장(가입 또는 /api/me/payment-phone)한 뒤 다시 확인하세요.",
    );
    return false;
  }
  if (buckets.decryptFail > 0) {
    console.error(
      `\n❌ 봉투 ${buckets.encrypted}건 중 ${buckets.decryptFail}건이 이 키로 복호화되지 않습니다.\n` +
      "   PII_ENC_KEY 가 프로덕션 워커의 값과 다릅니다. 이 상태로 --apply 하면 평문이 복구 불가로 덮입니다.",
    );
    return false;
  }

  console.log(
    `\n✅ 봉투 ${buckets.decryptOk}건이 모두 이 키로 복호화됩니다 — PII_ENC_KEY 가 프로덕션과 일치합니다.\n` +
    `   평문 ${buckets.plaintext}건이 전환 대상입니다. 백업 후 --apply 하세요.`,
  );
  return true;
}

if (check) {
  console.log("[migrate-encrypt-user-phone] mode=CHECK (쓰기 없음)");
  const ok = await runKeyCheck();
  await mongoose.disconnect();
  process.exit(ok ? 0 : 1);
}

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

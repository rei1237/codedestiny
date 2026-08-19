/**
 * 기존 User 문서에 phoneHash(중복 판정용 결정적 해시)를 채운다.
 *
 * 왜 필요한가: 번호는 AES-GCM 랜덤 IV 로 저장돼 같은 번호라도 암호문이 매번 다르다. 그래서
 * "이 번호를 이미 다른 계정이 쓰는가"를 암호문으로는 판정할 수 없고, 별도 해시 컬럼이 있어야
 * unique 인덱스를 걸 수 있다(worker/lib/models.js phoneHash).
 *
 * 🔴 기본 동작은 dry-run 이다. 실제 쓰기는 `--apply` 를 명시해야만 일어난다.
 * 🔴 이 스크립트는 unique 인덱스를 만들지 않는다. 중복이 남아 있으면 인덱스 빌드가 실패하므로
 *    **중복을 먼저 보고**하고, 0 건일 때만 다음 단계로 넘어가라고 안내한다.
 *    인덱스 생성: node scripts/migrations/20260819-add-phone-hash-unique-index.mjs
 *
 *   node scripts/migrate-backfill-phone-hash.mjs             # dry-run + 중복 보고 (쓰기 없음)
 *   node scripts/migrate-backfill-phone-hash.mjs --limit=100 # 앞 100건만 미리보기
 *   node scripts/migrate-backfill-phone-hash.mjs --apply     # 실제 백필
 *
 * 선행 권장: scripts/migrate-encrypt-user-phone.mjs --check → --apply 로 평문을 먼저 봉투로
 * 바꿔 두는 편이 좋다(해시 자체는 평문·봉투 어느 쪽에서도 계산되므로 필수는 아니다).
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";
import { User } from "../worker/lib/models.js";
import { decryptPhoneNumber, hashPhoneNumber, maskKoreanPhoneNumber } from "../worker/lib/pii-crypto.js";

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

// 키가 쓸 수 있는 값인지 DB 를 건드리기 전에 확인한다.
try {
  const probe = await hashPhoneNumber("01012345678", env);
  if (!/^[a-f0-9]{64}$/.test(probe)) throw new Error("unexpected hash shape");
} catch (error) {
  console.error(`PII_ENC_KEY is unusable: ${error?.message || error}`);
  process.exit(1);
}

await connectDb(env);

console.log(`[migrate-backfill-phone-hash] mode=${apply ? "APPLY" : "DRY-RUN"}${limit ? ` limit=${limit}` : ""}`);

const cursor = User.collection.find(
  { phoneNumber: { $nin: [null, ""] } },
  { projection: { _id: 1, email: 1, phoneNumber: 1, phoneHash: 1, status: 1 } },
);

const stats = { scanned: 0, hashed: 0, alreadyHashed: 0, undecryptable: 0, withdrawnSkipped: 0 };
/** 해시 -> 그 해시를 가진 계정들. 중복 인덱스 빌드 실패를 미리 잡기 위한 것이다. */
const owners = new Map();

for await (const doc of cursor) {
  if (limit && stats.scanned >= limit) break;
  stats.scanned += 1;

  // 탈퇴 계정은 번호를 파기하는 것이 방침이라 해시를 새로 만들지 않는다 — 만들면 그 번호로
  // 재가입할 수 없게 된다(worker/routes/auth.js handleWithdraw 가 이제 함께 비운다).
  if (String(doc.status || "") === "withdrawn") {
    stats.withdrawnSkipped += 1;
    continue;
  }

  const plain = await decryptPhoneNumber(doc.phoneNumber, env);
  if (!plain) {
    // 키 불일치이거나 정규화 불가한 쓰레기 값이다. 건드리지 않고 세기만 한다.
    stats.undecryptable += 1;
    continue;
  }

  const hash = await hashPhoneNumber(plain, env);
  const seen = owners.get(hash) || [];
  seen.push({ id: String(doc._id), email: String(doc.email || ""), masked: maskKoreanPhoneNumber(plain) });
  owners.set(hash, seen);

  if (String(doc.phoneHash || "") === hash) {
    stats.alreadyHashed += 1;
    continue;
  }

  if (apply) {
    await User.collection.updateOne(
      { _id: doc._id },
      { $set: { phoneHash: hash, ...(doc.phoneSource ? {} : { phoneSource: "checkout" }) } },
    );
  }
  stats.hashed += 1;
}

const duplicates = [...owners.entries()].filter(([, list]) => list.length > 1);

console.log(JSON.stringify(stats, null, 2));

if (duplicates.length > 0) {
  console.error(`\n🔴 같은 번호를 쓰는 계정이 ${duplicates.length}개 그룹 있습니다. unique 인덱스를 만들면 빌드가 실패합니다.`);
  for (const [, list] of duplicates.slice(0, 20)) {
    console.error(`  ${list[0].masked}  ->  ${list.map((item) => `${item.id}(${item.email})`).join("  ")}`);
  }
  console.error("\n   먼저 어느 계정이 그 번호를 계속 쓸지 정한 뒤(나머지는 번호를 비우거나 바꾼 뒤)");
  console.error("   scripts/migrations/20260819-add-phone-hash-unique-index.mjs 를 실행하세요.");
} else if (apply) {
  console.log("\n✅ 중복 없음 — 이제 scripts/migrations/20260819-add-phone-hash-unique-index.mjs 를 1회 실행하세요.");
} else if (stats.hashed > 0) {
  console.log(`\n${stats.hashed} record(s) would get a phoneHash. Re-run with --apply after taking a database backup.`);
} else {
  console.log("\n백필할 레코드가 없습니다.");
}

await mongoose.disconnect();
process.exit(duplicates.length > 0 ? 1 : 0);

/**
 * guardian·fusion 3개 컬렉션의 TTL 드리프트 복구 + guardianFortuneSharedSnapshots 인덱스 생성.
 * 자동 실행되지 않는다. --check 는 읽기 전용이다.
 *
 * ── 무엇이 잘못돼 있었나 (실측 2026-08-21, listIndexes) ──────────────────────────
 *
 * worker/lib/models.js 의 세 스키마가 expiresAt 에 필드 레벨 `index: true` 와
 * `.index({expiresAt:1},{expireAfterSeconds:0})` 를 **동시에** 선언하고 있었다. 같은 키의 plain
 * 인덱스와 TTL 인덱스는 IndexOptionsConflict 로 충돌하고, 그때 살아남는 것은 plain 쪽이다.
 * 2026-07-05 에 idempotency_keys·abuse_scores·refresh_tokens 에서 똑같이 겪은 사고이며
 * (scripts/migrations/20260705-fix-ttl-index-drift.mjs), 이 셋만 규약 밖에 남아 있었다.
 *
 *   프로덕션(code_destiny) — 인덱스를 **명시 마이그레이션**으로만 만들었기 때문에 무사했다:
 *     guardianFortuneGenerationAttempts   guardian_attempt_expiry_ttl  TTL=0   ✅
 *     fusionFortuneGenerationAttempts     fusion_attempt_expiry_ttl    TTL=0   ✅
 *     guardianFortuneSharedSnapshots      _id_ 뿐 — shareId unique 도 없다     ❌
 *
 *   스테이징(code_destiny_staging) — 선언에서 createIndexes() 로 만들었더니 결함이 그대로 나왔다:
 *     세 컬렉션 전부 expiresAt_1 이 **TTL 없는 plain 인덱스**                   ❌
 *     → 만료 문서가 영원히 지워지지 않는다(무한 증가).
 *
 * 즉 프로덕션이 무사했던 것은 스키마가 옳아서가 아니라 autoIndex:false 덕분이었다. 선언을 그대로
 * 두면 다음에 인덱스를 선언에서 만드는 순간 프로덕션도 같은 상태가 된다. 그래서 같은 커밋에서
 * worker/lib/models.js 의 `index: true` 3곳을 제거했고, 이 스크립트가 이미 만들어진 잔재를 고친다.
 *
 * ── 왜 shareId unique 가 TTL 보다 급한가 ──────────────────────────────────────
 *
 * guardianFortuneSharedSnapshots 는 프로덕션에 인덱스가 `_id_` 하나뿐이다. 스키마가 선언한
 * shareId unique 와 sourceRequestId sparse+unique 가 **DB 에 존재하지 않는다**. 지금은 0건이라
 * 무해하지만, 쓰기가 시작되면 같은 shareId 를 가진 공유 문서가 둘 생길 수 있고 그때는
 * 공유 링크 하나가 어느 쪽을 가리키는지 알 수 없게 된다. 조회도 전부 COLLSCAN 이다.
 *
 * ── 안전장치 ────────────────────────────────────────────────────────────────
 *
 * · 존재 판정은 **키**로 한다(이름이 아니다). 스테이징의 shareId_1 처럼 이름만 다른 같은 키가
 *   이미 있으면 SKIP 한다 — 다른 이름으로 다시 만들면 IndexOptionsConflict 로 실패한다.
 * · TTL 복구는 "같은 키에 expireAfterSeconds 가 없는 인덱스"일 때만 드롭한다. unique 인덱스와
 *   _id_ 는 어떤 경우에도 건드리지 않는다.
 * · 재실행 안전(idempotent). --check 는 아무것도 바꾸지 않는다.
 *
 * 사용:
 *   node scripts/migrations/20260821-fix-guardian-fusion-ttl-and-snapshot-indexes.mjs --check
 *   node scripts/migrations/20260821-fix-guardian-fusion-ttl-and-snapshot-indexes.mjs
 *   MONGO_DB_NAME=code_destiny_staging node scripts/migrations/...mjs      (스테이징 대상)
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";

config({ path: ".env.local" }); config({ path: ".env" });
const check = process.argv.includes("--check");
const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || "",
};
if (!env.MONGO_URI) { console.error("MONGO_URI or MONGODB_URI is required."); process.exit(1); }

// [collection, key, options] — 없으면 만든다. 같은 키가 이미 있으면(이름이 달라도) SKIP.
const CREATE_SPECS = [
  ["guardianFortuneSharedSnapshots", { shareId: 1 }, { unique: true, name: "guardian_shared_snapshot_share_unique" }],
  ["guardianFortuneSharedSnapshots", { sourceRequestId: 1 }, { unique: true, sparse: true, name: "guardian_shared_snapshot_source_unique" }],
  ["guardianFortuneSharedSnapshots", { status: 1, createdAt: -1 }, { name: "guardian_shared_snapshot_status_created" }],
];

// [collection, ttl index name] — expiresAt 에 TTL 이 걸려 있어야 하는 컬렉션.
const TTL_TARGETS = [
  ["guardianFortuneGenerationAttempts", "guardian_attempt_expiry_ttl"],
  ["guardianFortuneSharedSnapshots", "guardian_shared_snapshot_expiry_ttl"],
  ["fusionFortuneGenerationAttempts", "fusion_attempt_expiry_ttl"],
];

const EXPIRES_KEY = JSON.stringify({ expiresAt: 1 });
const sameKey = (index, key) => JSON.stringify(index.key) === JSON.stringify(key);

await connectDb(env);
console.log(`[db] ${mongoose.connection.name}`);

let created = 0; let skipped = 0; let repaired = 0; let problems = 0;

for (const [collectionName, key, options] of CREATE_SPECS) {
  const collection = mongoose.connection.db.collection(collectionName);
  const label = `${collectionName} ${JSON.stringify(key)}`;
  const indexes = await collection.indexes().catch(() => []);
  const existing = indexes.find((item) => sameKey(item, key));

  if (check) {
    if (existing) console.log(`OK      ${label} (name=${existing.name})`);
    else { problems += 1; console.log(`MISSING ${label}`); }
    continue;
  }

  if (existing) { skipped += 1; console.log(`SKIP    ${label} (already present as ${existing.name})`); continue; }

  try {
    await collection.createIndex(key, options);
    created += 1;
    console.log(`CREATED ${label} (name=${options.name})`);
  } catch (error) {
    // unique 인덱스는 기존 중복 데이터가 있으면 실패한다. 조용히 넘기지 말고 그대로 드러낸다.
    console.error(`FAILED  ${label}: ${error?.codeName || error?.code || ""} ${error?.message || error}`);
    process.exitCode = 1;
  }
}

for (const [collectionName, ttlName] of TTL_TARGETS) {
  const collection = mongoose.connection.db.collection(collectionName);
  const label = `${collectionName} expiresAt TTL`;
  const indexes = await collection.indexes().catch(() => []);
  const onExpires = indexes.filter((item) => JSON.stringify(item.key) === EXPIRES_KEY);
  const ttl = onExpires.find((item) => item.expireAfterSeconds === 0);
  // 🔴 unique 와 _id_ 는 어떤 경우에도 드롭 대상이 아니다.
  const plain = onExpires.find((item) => item.expireAfterSeconds === undefined && item.unique !== true && item.name !== "_id_");

  if (check) {
    if (ttl && !plain) console.log(`OK      ${label} (name=${ttl.name})`);
    else {
      problems += 1;
      console.log(`BROKEN  ${label} — ${ttl ? "" : "TTL 없음"}${!ttl && plain ? " / " : ""}${plain ? `plain ${plain.name} 이 남아 있다` : ""}`);
    }
    continue;
  }

  try {
    if (plain) {
      await collection.dropIndex(plain.name);
      console.log(`DROPPED ${collectionName} ${plain.name} (plain — TTL 을 가로막고 있었다)`);
    }
    if (!ttl) {
      await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: ttlName });
      repaired += 1;
      console.log(`CREATED ${label} (name=${ttlName})`);
    } else if (plain) {
      repaired += 1;
      console.log(`OK      ${label} (name=${ttl.name}, plain 만 제거)`);
    } else {
      skipped += 1;
      console.log(`SKIP    ${label} (already correct)`);
    }
  } catch (error) {
    console.error(`FAILED  ${label}: ${error?.codeName || error?.code || ""} ${error?.message || error}`);
    process.exitCode = 1;
  }
}

console.log(check
  ? `[check] problems=${problems}`
  : `[apply] created=${created} ttlRepaired=${repaired} skipped=${skipped}`);

await mongoose.disconnect();
if (check && problems) process.exitCode = 1;

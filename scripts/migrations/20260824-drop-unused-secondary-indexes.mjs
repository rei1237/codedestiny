/**
 * 안 쓰이는 보조 인덱스를 드롭한다. 자동 실행되지 않는다. --check 는 읽기 전용이다.
 *
 * ── 왜 이제야 판단할 수 있나 ────────────────────────────────────────────────
 *
 * 2026-08-16 감사(docs/db-cost-audit-2026-08-16/03-index-and-ttl.md:43-49)가
 * pointhistories.userId_1 을 "완전히 중복"이라고 인정하면서도 삭제하지 않았다. 사유는
 * "$indexStats 로 실제 운영 미사용을 확인하지 않았으므로 보고만 한다" 였다. 2026-08-24 에
 * 그 실측을 했다(관측 창 2026-08-12 ~ 08-24, 12일).
 *
 * ── 🔴 ops=0 은 삭제 근거가 아니다 ──────────────────────────────────────────
 *
 * 이 서비스는 트래픽이 적다(90일 결제 시도자 20명). 그래서 "12일 동안 안 쓰였다"는
 * "그 쿼리가 안 돌았다"와 구분되지 않는다. 실측에서 나온 후보 66개를 그대로 지우면
 * 트래픽이 없어서 0인 인덱스까지 지운다 — 예: pointhistories.userId_1_createdAt_-1 은
 * /points/history 가 쓰는 경로이고, 그 페이지를 12일간 아무도 안 열었을 뿐이다.
 *
 * 그래서 **트래픽과 무관하게 증명되는 근거가 있는 것만** 지운다.
 *
 *   A. 구조적 중복 — 키가 같은 컬렉션의 다른 인덱스의 **진부분 접두**다. 접두 인덱스는
 *      더 긴 인덱스가 항상 대신할 수 있으므로, 쿼리가 무엇이든 중복이다.
 *   B. 읽기 경로 0건 — 소스 3면 grep 으로 그 모델에 조회 호출이 아예 없음을 확인했다.
 *
 * ── 남긴 것 (보고만) ────────────────────────────────────────────────────────
 *
 * content_entitlements 14 · payments 7 · serviceexecutiontransactions 25 · users 3 ·
 * monthly_credit_ledger 2 · pointhistories 5. 전부 ops=0 이지만 A·B 어느 근거도 없다.
 * 특히 serviceexecutiontransactions 는 문서가 5건이라 Mongo 가 인덱스를 안 쓰는 것이
 * 정상이고, 그건 "쓸모없다"가 아니라 "아직 작다"이다.
 *
 * 실행: node scripts/migrations/20260824-drop-unused-secondary-indexes.mjs [--check]
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";

config({ path: ".env.local" });
config({ path: ".env" });

const CHECK = process.argv.includes("--check");

const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || process.env.DB_NAME || "",
};

// 🔴 관측 창이 이보다 짧으면 드롭하지 않는다. $indexStats 카운터는 노드 재시작·페일오버·인덱스
// 재생성에서 0으로 돌아간다. 그 직후에 읽은 ops=0 은 "안 쓰인다"가 아니라 "방금 세기 시작했다"다.
const MIN_OBSERVATION_DAYS = 7;

const TARGETS = [
  // ── A. 구조적 중복: 키가 다른 인덱스의 진부분 접두 ──────────────────────
  // 2026-08-16 감사가 지목했으나 근거 부족으로 남겨 둔 바로 그 인덱스다.
  // {userId} ⊂ {userId,kind,createdAt} · {userId,createdAt} · {userId,kind,featureKey,createdAt}
  { collection: "pointhistories", index: "userId_1", reason: "prefix-redundant" },
  // {ipHash} ⊂ {ipHash,createdAt} / {reason} ⊂ {reason,createdAt} / {userId} ⊂ {userId,createdAt}
  { collection: "security_events", index: "userId_1", reason: "prefix-redundant" },
  { collection: "security_events", index: "ipHash_1", reason: "prefix-redundant" },
  { collection: "security_events", index: "reason_1", reason: "prefix-redundant" },

  // ── B. 읽기 경로 0건 ────────────────────────────────────────────────────
  // SecurityEvent 모델의 유일한 사용처는 worker/lib/security/index.js:119 의 .create() 다.
  // find·findOne·aggregate·countDocuments·distinct 가 저장소 전체에 0건이다
  // (2026-08-24 git grep, 범위: worker/ lib/ app/ scripts/ __tests__/).
  // 즉 이 컬렉션은 순수 기록용이고 보조 인덱스는 전부 쓰기 비용만 낸다.
  // 🔴 나중에 조회가 생기면 그때 필요한 것만 다시 만든다 — 3,301건이라 COLLSCAN 도 싸다.
  { collection: "security_events", index: "createdAt_1", reason: "no-reader" },
  { collection: "security_events", index: "level_1", reason: "no-reader" },
  { collection: "security_events", index: "endpoint_1", reason: "no-reader" },
  { collection: "security_events", index: "userId_1_createdAt_-1", reason: "no-reader" },
  { collection: "security_events", index: "ipHash_1_createdAt_-1", reason: "no-reader" },
  { collection: "security_events", index: "reason_1_createdAt_-1", reason: "no-reader" },
];

/** 키가 후보의 진부분 접두인 다른 인덱스가 있는가. 필드 순서까지 같아야 접두다. */
function findCoveringIndex(candidate, allIndexes) {
  const keys = Object.keys(candidate.key || {});
  return allIndexes.find((other) => {
    if (other.name === candidate.name) return false;
    const otherKeys = Object.keys(other.key || {});
    if (otherKeys.length <= keys.length) return false;
    return keys.every((key, i) => otherKeys[i] === key && other.key[key] === candidate.key[key]);
  });
}

async function inspect(db, target) {
  const collection = db.collection(target.collection);
  const indexes = await collection.indexes();
  const found = indexes.find((index) => index.name === target.index);
  if (!found) return { skip: true, note: "ABSENT (이미 없음)" };

  // 🔴 아래 넷은 조회 통계와 무관하게 존재 이유가 있다. ops=0 이어도 절대 드롭하지 않는다 —
  // 유니크는 쓰기 시 제약 강제에 쓰이고 그 사용은 accesses.ops 에 잡히지 않는다.
  if (found.name === "_id_") return { blocked: true, note: "_id_ 는 드롭 불가" };
  if (found.unique === true) return { blocked: true, note: "unique 제약" };
  if (found.expireAfterSeconds !== undefined) return { blocked: true, note: "TTL 인덱스" };
  if (found.partialFilterExpression !== undefined) return { blocked: true, note: "partial 인덱스" };
  if (found.sparse === true) return { blocked: true, note: "sparse 인덱스" };

  const stats = await collection.aggregate([{ $indexStats: {} }]).toArray();
  const stat = stats.find((s) => s.name === target.index);
  if (!stat) return { blocked: true, note: "$indexStats 에 없다" };

  const ops = Number(stat.accesses?.ops || 0);
  if (ops !== 0) return { blocked: true, note: `사용 중 (ops=${ops})` };

  const since = stat.accesses?.since ? new Date(stat.accesses.since) : null;
  if (!since) return { blocked: true, note: "관측 시작 시각 없음" };
  const days = (Date.now() - since.getTime()) / 86400000;
  if (days < MIN_OBSERVATION_DAYS) {
    return { blocked: true, note: `관측 창 ${days.toFixed(1)}일 < ${MIN_OBSERVATION_DAYS}일 — 카운터가 최근 초기화됐다` };
  }

  // 구조적 중복이라고 주장한 항목은 실제로 접두인지 여기서 다시 확인한다. 덮는 인덱스가
  // 사라졌는데 목록만 남아 있으면, 중복이 아니라 유일한 인덱스를 지우게 된다.
  if (target.reason === "prefix-redundant") {
    const covering = findCoveringIndex(found, indexes);
    if (!covering) return { blocked: true, note: "접두를 덮는 인덱스가 없다 — 더 이상 중복이 아니다" };
    return { ok: true, note: `redundant, covered by ${covering.name} (ops=0, ${days.toFixed(0)}일 관측)` };
  }
  return { ok: true, note: `no-reader (ops=0, ${days.toFixed(0)}일 관측)` };
}

async function migrate() {
  if (!env.MONGO_URI && !env.MONGODB_URI) throw new Error("MONGO_URI or MONGODB_URI is required");
  await connectDb(env);
  const db = mongoose.connection.db;
  console.log(`[db] ${db.databaseName}`);

  let dropped = 0;
  let blocked = 0;
  let skipped = 0;

  for (const target of TARGETS) {
    const label = `${target.collection} :: ${target.index}`;
    const verdict = await inspect(db, target);
    if (verdict.skip) { console.log(`SKIP    ${label} — ${verdict.note}`); skipped += 1; continue; }
    if (verdict.blocked) { console.log(`BLOCKED ${label} — ${verdict.note}`); blocked += 1; continue; }
    if (CHECK) { console.log(`WOULD   ${label} — ${verdict.note}`); dropped += 1; continue; }
    await db.collection(target.collection).dropIndex(target.index);
    console.log(`DROPPED ${label} — ${verdict.note}`);
    dropped += 1;
  }

  console.log(`[${CHECK ? "check" : "apply"}] ${CHECK ? "드롭 예정" : "드롭"}=${dropped} 차단=${blocked} 이미없음=${skipped}`);
  // 🔴 차단이 하나라도 있으면 실패로 끝낸다. 목록과 실제 상태가 어긋났다는 뜻이고, 그건 사람이
  // 봐야 한다 — 조용히 나머지만 처리하고 성공으로 보고하면 목록이 썩는다.
  if (blocked > 0) process.exitCode = 1;
}

migrate()
  .catch((error) => {
    console.error(`Unused secondary index migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });

/**
 * 영냥이(YeongnyangiRequest) 결제 후 결과 누락 집계 — 읽기 전용(쓰기 없음).
 *
 * 챕터 생성은 클라이언트가 매 챕터마다 트리거하고(worker/yeongnyangi/service.ts
 * generateNextChapter), 서버 자동 재시도/크론이 없다. 챕터당 시도가
 * manifest.length*3 회를 넘으면 GENERATION_REVIEW_REQUIRED 로 막혀
 * scripts/recover-yeongnyangi-request.mjs 로 운영자가 직접 풀어야 한다. 이 스크립트는
 * "결제는 됐는데 아직 결과가 없는" 요청이 실제로 몇 건 있는지, state/errorCode 별
 * 분포와 함께 집계만 한다 — 어떤 요청도 고치지 않는다.
 *
 * 🔴 이 스크립트는 아무것도 쓰지 않는다. find/count/aggregate 외의 연산을 넣지 말 것.
 *    실제 복구는 scripts/recover-yeongnyangi-request.mjs 를 개별 requestId 로 실행한다.
 *
 * 🔴 개인정보 무출력: userId·requestId·이메일을 출력하지 않는다. 카운트와 시각 범위만 낸다.
 *
 * 🔴 --db 는 기본값이 없다 — 대상을 실수로 프로덕션으로 흘리지 않기 위해서다.
 *
 * 실행 (스테이징):
 *   node scripts/audit-yeongnyangi-paid-without-result.mjs --db code_destiny_staging [--json] [--stuck-hours 24]
 */

import assert from "node:assert/strict";
import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

const DATABASE = argValue("--db", "");
if (!["code_destiny_staging", "code_destiny"].includes(DATABASE)) {
  throw new Error("Required: --db code_destiny_staging | code_destiny (no default — pick the target explicitly).");
}
const AS_JSON = process.argv.includes("--json");
const STUCK_HOURS = Math.max(1, Math.floor(Number(argValue("--stuck-hours", 24))) || 24);
const MAX_TIME_MS = Math.max(1000, Math.floor(Number(argValue("--max-time-ms", 120000))) || 120000);
const COUNT_OPTIONS = { maxTimeMS: MAX_TIME_MS };
const AGG_OPTIONS = { maxTimeMS: MAX_TIME_MS, allowDiskUse: false };

// yeongnyangi 파이프라인은 실제 PG/LLM 호출이 걸린 영역이다 — 실수로라도 외부 호출이
// 섞여 들어가면 이 스크립트가 과금 동작을 유발할 수 있으므로 원천 차단한다.
globalThis.fetch = () => { throw new Error("External HTTP is forbidden in this read-only audit."); };

const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: DATABASE,
  MONGODB_DB_NAME: DATABASE,
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

let connected = false;
try {
  await connectDb(env);
  connected = true;
  assert.equal(mongoose.connection.name, DATABASE);
  const db = mongoose.connection.db;
  const collection = db.collection("yeongnyangi_requests");

  const now = new Date();
  const stuckBefore = new Date(now.getTime() - STUCK_HOURS * 3600 * 1000);

  // state x errorCode 분포 — 결제된 요청 전체를 어디서도 빠짐없이 본다.
  const breakdown = await collection.aggregate([
    { $match: { paymentId: { $ne: null } } },
    { $group: {
      _id: { state: "$state", errorCode: "$errorCode" },
      count: { $sum: 1 },
      oldestCreatedAt: { $min: "$createdAt" },
      newestCreatedAt: { $max: "$createdAt" },
    } },
    { $sort: { count: -1 } },
  ], AGG_OPTIONS).toArray();

  const totalPaid = await collection.countDocuments({ paymentId: { $ne: null } }, COUNT_OPTIONS);
  const totalCompleted = await collection.countDocuments(
    { paymentId: { $ne: null }, state: "COMPLETED" }, COUNT_OPTIONS,
  );

  // "결제됐고 완결도 환불도 아니며 --stuck-hours 넘게 그대로인" 요청 — 이름 그대로 PAID_WITHOUT_RESULT 후보.
  const stuckCandidates = await collection.countDocuments({
    paymentId: { $ne: null },
    state: { $in: ["PAID", "GENERATING", "FORTUNE_FAILED"] },
    createdAt: { $lt: stuckBefore },
  }, COUNT_OPTIONS);

  // 재시도 상한(manifest.length*3)에 걸려 운영자 개입 없이는 절대 못 풀리는 확정 케이스.
  const reviewRequiredNow = await collection.countDocuments({
    paymentId: { $ne: null },
    state: "FORTUNE_FAILED",
    errorCode: "GENERATION_REVIEW_REQUIRED",
  }, COUNT_OPTIONS);

  const summary = {
    database: DATABASE,
    generatedAt: now.toISOString(),
    stuckThresholdHours: STUCK_HOURS,
    totalPaid,
    totalCompleted,
    stuckCandidates,
    reviewRequiredNow,
    breakdown: breakdown.map((row) => ({
      state: row._id.state,
      errorCode: row._id.errorCode || "",
      count: row.count,
      oldestCreatedAt: row.oldestCreatedAt,
      newestCreatedAt: row.newestCreatedAt,
    })),
  };

  if (AS_JSON) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log("");
    console.log(`[yeongnyangi_requests@${DATABASE}] 결제 후 결과 누락 집계 (읽기 전용)`);
    console.log("-".repeat(58));
    console.log(`결제된 요청 총계             : ${totalPaid}`);
    console.log(`완결(COMPLETED)              : ${totalCompleted}`);
    console.log(`${STUCK_HOURS}시간 넘게 미완결(추정 정체)  : ${stuckCandidates}`);
    console.log(`운영자 개입 필수(REVIEW 대기) : ${reviewRequiredNow}`);
    console.log("state x errorCode 분포:");
    for (const row of summary.breakdown) {
      const code = row.errorCode ? `/${row.errorCode}` : "";
      console.log(`  ${row.state}${code}: ${row.count} (oldest ${row.oldestCreatedAt?.toISOString?.() ?? row.oldestCreatedAt})`);
    }
    console.log("-".repeat(58));
    console.log("이 스크립트는 아무것도 쓰지 않았습니다. 개별 복구는 scripts/recover-yeongnyangi-request.mjs 로 진행합니다.");
  }
} finally {
  if (connected) await mongoose.disconnect();
}

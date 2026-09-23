/**
 * 영냥이(YeongnyangiRequest) 결제 후 결과 누락 집계 — 읽기 전용(쓰기 없음).
 *
 * 챕터는 큐 메시지 하나당 하나씩 생성되고(worker/yeongnyangi/queue.js), 운영은 10분 크론
 * (worker/yeongnyangi/recovery.js)이 멈춘 요청을 다시 큐에 넣는다. 챕터당 자동 3회·수동 2회를
 * 넘기면 GENERATION_REVIEW_REQUIRED 로 막혀 scripts/recover-yeongnyangi-request.mjs 로
 * 운영자가 직접 풀어야 한다. failureCodes·generationSeconds 는 실패 원인과 생성 소요시간이다. 이 스크립트는
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

  // 생성 실패 원인과 소요시간 — 카드 결제와 가족 이용권을 모두 본다. 코드·상품·수치만 낸다.
  const anyAccess = { $or: [{ paymentId: { $ne: null } }, { accessMethod: "FAMILY" }] };
  const failureCodes = await collection.aggregate([
    { $match: anyAccess },
    { $unwind: "$recoveryAudit" },
    { $match: { "recoveryAudit.kind": { $in: ["retryable_failure", "automatic_recovery_stopped", "review_required"] } } },
    { $group: { _id: { kind: "$recoveryAudit.kind", code: "$recoveryAudit.code" }, events: { $sum: 1 },
      requests: { $addToSet: "$_id" }, newestAt: { $max: "$recoveryAudit.at" } } },
    { $project: { events: 1, requests: { $size: "$requests" }, newestAt: 1 } },
    { $sort: { events: -1 } },
  ], AGG_OPTIONS).toArray();
  const durations = await collection.aggregate([
    { $match: { ...anyAccess, state: "COMPLETED", completedAt: { $ne: null } } },
    { $project: { productId: 1, chapters: { $size: "$chapters" }, attempts: 1, completedAt: 1,
      startedAt: { $min: { $map: { input: { $filter: { input: "$recoveryAudit", cond: { $eq: ["$$this.kind", "generation_claim"] } } }, in: "$$this.at" } } } } },
    { $match: { startedAt: { $ne: null } } },
  ], AGG_OPTIONS).toArray();
  const pct = (values, p) => values.length ? values[Math.min(values.length - 1, Math.floor(p * values.length))] : null;
  const byProduct = {};
  for (const row of durations) {
    const item = byProduct[row.productId] ||= { count: 0, chapters: row.chapters, seconds: [], extraAttempts: 0 };
    item.count += 1;
    item.seconds.push(Math.round((new Date(row.completedAt) - new Date(row.startedAt)) / 1000));
    item.extraAttempts += Math.max(0, (row.attempts || 0) - row.chapters);
  }
  const generationSeconds = Object.entries(byProduct).map(([productId, item]) => {
    const s = item.seconds.sort((a, b) => a - b);
    return { productId, count: item.count, chapters: item.chapters, extraAttempts: item.extraAttempts,
      p50: pct(s, 0.5), p90: pct(s, 0.9), max: s.at(-1) };
  }).sort((a, b) => b.count - a.count);

  const summary = {
    database: DATABASE,
    generatedAt: now.toISOString(),
    stuckThresholdHours: STUCK_HOURS,
    totalPaid,
    totalCompleted,
    stuckCandidates,
    reviewRequiredNow,
    failureCodes: failureCodes.map((row) => ({ kind: row._id.kind, code: row._id.code || "", events: row.events, requests: row.requests, newestAt: row.newestAt })),
    generationSeconds,
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

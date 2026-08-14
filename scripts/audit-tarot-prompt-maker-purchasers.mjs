/**
 * 타로 프롬프트 라이브러리 기존 구매자 집계 — 읽기 전용(쓰기 없음).
 *
 * `tarot-prompt-maker` 를 회당 결제(per-use ₩5,000) → 1회 영구 해금(₩10,000)으로 바꾸면서,
 * "이미 회당 결제로 산 사람에게 영구 해금을 소급 부여할 것인가"를 결정하려면 먼저 대상자 수를
 * 알아야 한다. 이 스크립트는 그 숫자만 낸다 — 부여는 하지 않는다.
 *
 * 🔴 이 스크립트는 아무것도 쓰지 않는다. countDocuments/aggregate/distinct 외의 연산을 넣지 말 것.
 *    소급 부여가 필요해지면 별도 마이그레이션 스크립트를 만들고 사용자 승인을 받는다.
 *
 * 🔴 개인정보 무출력: 이메일·이름·userId 를 출력하지 않는다. 카운트와 분포만 낸다.
 *
 * 환불된 차감은 제외한다. 환불 판정은 워커가 쓰는 것과 같은 규칙이다 —
 * `kind: "refund"` + `metadata.refundForPointHistoryId === String(차감._id)`
 * (worker/routes/fortune.js 의 findAIPromptPaymentEvidence 와 동일).
 *
 * 실행:
 *   node scripts/audit-tarot-prompt-maker-purchasers.mjs [--json] [--max-time-ms 120000]
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const FEATURE_KEY = "tarot-prompt-maker";

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

const AS_JSON = process.argv.includes("--json");
const MAX_TIME_MS = Math.max(1000, Math.floor(Number(argValue("--max-time-ms", 120000))) || 120000);
const AGG_OPTIONS = { maxTimeMS: MAX_TIME_MS, allowDiskUse: false };

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
};

if (!env.MONGO_URI && !env.MONGODB_URI) {
  console.error("❌ MONGO_URI 또는 MONGODB_URI 환경변수가 필요합니다.");
  process.exit(1);
}

await connectDb(env);
const db = mongoose.connection.db;

// 차감 1건마다 "그 차감을 되돌린 환불이 있는가"를 붙여, 환불되지 않은 결제만 남긴다.
// $lookup 은 같은 컬렉션 안에서 metadata.refundForPointHistoryId 로 되짚는다.
const rows = await db.collection("pointhistories").aggregate([
  { $match: { kind: "deduct", featureKey: FEATURE_KEY } },
  {
    $lookup: {
      from: "pointhistories",
      let: { deductId: { $toString: "$_id" } },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$kind", "refund"] },
                { $eq: ["$metadata.refundForPointHistoryId", "$$deductId"] },
              ],
            },
          },
        },
        { $limit: 1 },
        { $project: { _id: 1 } },
      ],
      as: "refunds",
    },
  },
  { $match: { refunds: { $size: 0 } } },
  { $group: { _id: "$userId", purchases: { $sum: 1 } } },
], AGG_OPTIONS).toArray();

const userIds = rows.map((row) => row._id).filter(Boolean);

// 이미 해금이 기록된 사용자(전환 후 새로 산 사람)는 소급 대상이 아니다.
const alreadyUnlocked = userIds.length
  ? await db.collection("users").countDocuments(
    { _id: { $in: userIds }, unlockedFeatures: FEATURE_KEY },
    { maxTimeMS: MAX_TIME_MS },
  )
  : 0;

const totalRefunded = await db.collection("pointhistories").countDocuments(
  { kind: "refund", featureKey: FEATURE_KEY },
  { maxTimeMS: MAX_TIME_MS },
);

const purchaseCounts = rows.map((row) => row.purchases);
const totalPurchases = purchaseCounts.reduce((sum, n) => sum + n, 0);
const repeatBuyers = purchaseCounts.filter((n) => n > 1).length;

// 몇 번 샀는지의 분포 — 회당 결제가 실제로 반복 구매를 막고 있었는지 보여 준다.
const distribution = {};
for (const n of purchaseCounts) {
  const bucket = n >= 5 ? "5+" : String(n);
  distribution[bucket] = (distribution[bucket] || 0) + 1;
}

const summary = {
  featureKey: FEATURE_KEY,
  distinctPurchasers: rows.length,
  totalPurchases,
  repeatBuyers,
  maxPurchasesBySingleUser: purchaseCounts.length ? Math.max(...purchaseCounts) : 0,
  purchaseCountDistribution: distribution,
  alreadyUnlocked,
  backfillCandidates: rows.length - alreadyUnlocked,
  refundedDeducts: totalRefunded,
};

if (AS_JSON) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log("");
  console.log(`[${FEATURE_KEY}] 기존 구매자 집계 (환불건 제외, 읽기 전용)`);
  console.log("-".repeat(58));
  console.log(`구매자 수(고유)          : ${summary.distinctPurchasers}`);
  console.log(`총 결제 건수             : ${summary.totalPurchases}`);
  console.log(`2회 이상 구매자          : ${summary.repeatBuyers}`);
  console.log(`한 사람 최대 구매 횟수   : ${summary.maxPurchasesBySingleUser}`);
  console.log(`구매 횟수 분포           : ${JSON.stringify(summary.purchaseCountDistribution)}`);
  console.log(`이미 해금 기록 있음      : ${summary.alreadyUnlocked}`);
  console.log(`소급 부여 대상           : ${summary.backfillCandidates}`);
  console.log(`환불된 차감(집계 제외)   : ${summary.refundedDeducts}`);
  console.log("-".repeat(58));
  console.log("이 스크립트는 아무것도 쓰지 않았습니다. 소급 부여는 별도 승인 후 별도 스크립트로 진행합니다.");
}

await mongoose.disconnect();

/**
 * MongoDB 마이그레이션 — 월정석 대량 지급 계정의 잔량 일괄 0 처리 (1회성 운영 정리)
 *
 * 대상:
 *   profileSubscription.membershipCreditGranted >= 10,000 인 계정 전부.
 *   단 EXCLUDED_EMAILS(운영자 계정)는 제외한다.
 *
 * 이 스크립트가 하는 일(계정당):
 *   1) 소멸 원장(MONTHLY_CREDIT_EXPIRE) 먼저 기록 — 잔량이 사라진 이유를 감사 추적에 남긴다.
 *      sourceId는 OPERATION_ID 고정이라 재실행해도 중복 생성되지 않는다(유니크 {userId,type,sourceId}).
 *   2) lot 배열을 비우고 스칼라 잔액을 0으로 맞춘다.
 *      lot이 신뢰 원천이라 둘 중 하나만 지우면 안 된다 — lot을 남기면 잔액이 되살아나고,
 *      스칼라만 남기면 ensureLotsForBalance()가 그 값으로 새 lot을 합성해 되살린다.
 *   3) 레거시 코인 시딩(points>0 && !legacyCoinCreditSeeded)이 아직 안 된 계정은 시딩 완료로 표시한다.
 *      이게 없으면 다음 빌링 스냅샷 조회에서 points*10 만큼 월정석이 다시 지급되어 0 처리가 무효가 된다
 *      (worker/routes/billing.js seedMembershipCreditFromUserDoc, user.js, profile.js 3곳 동일 가드).
 *
 * 실행:
 *   node scripts/migrations/20260730-zero-heavy-monthly-credit-balances.mjs [--dry-run]
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { MonthlyCreditLedger, User } from "../../worker/lib/models.js";
import { normalizeLots } from "../../worker/lib/monthly-credit-lots.js";

config({ path: ".env.local" });
config({ path: ".env" });

const DRY_RUN = process.argv.includes("--dry-run");

const MIN_GRANTED = 10000;
const EXCLUDED_EMAILS = ["seongbae555@gmail.com"];
// 원장 멱등키. Date.now() 금지 — 재실행해도 같은 값이어야 소멸 원장이 중복되지 않는다.
const OPERATION_ID = "20260730-zero-heavy-monthly-credit";

const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || process.env.DB_NAME || "",
  MONGO_SERVER_SELECTION_TIMEOUT_MS: process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || "10000",
  MONGO_CONNECT_TIMEOUT_MS: process.env.MONGO_CONNECT_TIMEOUT_MS || "10000",
  MONGO_SOCKET_TIMEOUT_MS: process.env.MONGO_SOCKET_TIMEOUT_MS || "45000",
  MONGO_MAX_POOL_SIZE: process.env.MONGO_MAX_POOL_SIZE || "5",
  MONGO_IP_FAMILY: process.env.MONGO_IP_FAMILY || "4",
  MONGO_IP_FAMILY_AUTO_FALLBACK: process.env.MONGO_IP_FAMILY_AUTO_FALLBACK || "true",
};

if (!env.MONGO_URI && !env.MONGODB_URI) {
  console.error("❌ MONGO_URI 또는 MONGODB_URI 환경변수가 필요합니다.");
  process.exit(1);
}

const excludedSet = new Set(EXCLUDED_EMAILS.map((mail) => mail.trim().toLowerCase()));

function n(value) {
  return Math.max(0, Math.floor(Number(value || 0)));
}

function isExcluded(email) {
  return excludedSet.has(String(email || "").trim().toLowerCase());
}

// 소멸 원장(멱등 upsert). 잔량 0이면 남길 것이 없으므로 건너뛴다(스키마 amount min:1).
async function recordZeroLedger(userId, summary, appliedAt) {
  if (summary.activeBalance <= 0) return false;
  const sourceId = `admin-zero:${OPERATION_ID}`;
  await MonthlyCreditLedger.updateOne(
    { userId, type: "MONTHLY_CREDIT_EXPIRE", sourceId },
    {
      $setOnInsert: {
        userId,
        type: "MONTHLY_CREDIT_EXPIRE",
        amount: summary.activeBalance,
        beforeBalance: summary.activeBalance,
        afterBalance: 0,
        reason: "admin_zero_heavy_monthly_credit",
        sourceId,
        serviceKey: "",
        profileId: "",
        metadata: {
          operationId: OPERATION_ID,
          minGranted: MIN_GRANTED,
          granted: summary.granted,
          used: summary.used,
          storedBalance: summary.storedBalance,
          expiredRemaining: summary.expiredBalance,
          lotCount: summary.lotCount,
          appliedAt,
        },
      },
    },
    { upsert: true },
  );
  return true;
}

async function main() {
  console.log("🔌 MongoDB 연결 중...");
  await connectDb(env);
  console.log("✅ MongoDB 연결 완료");

  const users = User.collection;
  const docs = await users
    .find(
      {
        "profileSubscription.membershipCreditGranted": { $gte: MIN_GRANTED },
        email: { $nin: EXCLUDED_EMAILS },
      },
      {
        projection: {
          email: 1,
          points: 1,
          "profileSubscription.membershipCreditGranted": 1,
          "profileSubscription.membershipCreditUsed": 1,
          "profileSubscription.membershipCreditBalance": 1,
          "profileSubscription.membershipCreditLots": 1,
          "profileSubscription.membershipCreditLotsVersion": 1,
          "profileSubscription.legacyCoinCreditSeeded": 1,
        },
      },
    )
    .sort({ "profileSubscription.membershipCreditGranted": -1 })
    .toArray();

  // 필터에서 이미 제외했지만, 대소문자 표기가 다른 저장본이 섞여도 절대 건드리지 않도록 한 번 더 막는다.
  const targets = docs.filter((doc) => !isExcluded(doc.email));
  const skippedByEmail = docs.length - targets.length;

  const now = new Date();
  const nowMs = now.getTime();
  const plans = targets.map((doc) => {
    const sub = doc.profileSubscription || {};
    const { activeBalance, expiredBalance } = normalizeLots(sub.membershipCreditLots, nowMs);
    const lots = Array.isArray(sub.membershipCreditLots) ? sub.membershipCreditLots : [];
    const legacyPoints = n(doc.points);
    return {
      _id: doc._id,
      email: doc.email || "(no-email)",
      granted: n(sub.membershipCreditGranted),
      used: n(sub.membershipCreditUsed),
      storedBalance: n(sub.membershipCreditBalance),
      activeBalance,
      expiredBalance,
      lotCount: lots.length,
      version: Math.floor(Number(sub.membershipCreditLotsVersion || 0)),
      needsLegacySeal: legacyPoints > 0 && sub.legacyCoinCreditSeeded !== true,
      legacyPoints,
    };
  });

  const pad = (s, w) => String(s).padEnd(w);
  const padL = (s, w) => String(s).padStart(w);
  console.log(`\n🔎 대상: ${plans.length}명 (제외 계정 ${skippedByEmail}명) ${DRY_RUN ? "(dry-run)" : ""}`);
  console.log(`  ${pad("email", 34)} ${padL("지급", 11)} ${padL("잔액(유효)", 11)} ${padL("만료잔량", 9)} ${padL("lot", 4)}  레거시시딩`);
  console.log(`  ${"-".repeat(34)} ${"-".repeat(11)} ${"-".repeat(11)} ${"-".repeat(9)} ${"-".repeat(4)}  ${"-".repeat(10)}`);
  for (const p of plans) {
    console.log(
      `  ${pad(p.email.slice(0, 34), 34)} ${padL(p.granted.toLocaleString(), 11)} ${padL(p.activeBalance.toLocaleString(), 11)} ${padL(p.expiredBalance.toLocaleString(), 9)} ${padL(p.lotCount, 4)}  ${p.needsLegacySeal ? `필요(points ${p.legacyPoints.toLocaleString()})` : "-"}`,
    );
  }
  const totalWiped = plans.reduce((a, p) => a + p.activeBalance, 0);
  console.log(`\n  소멸 예정 유효잔액 합계: ${totalWiped.toLocaleString()} 월정석`);

  if (DRY_RUN) {
    console.log("\n✅ dry-run 완료(쓰기 없음)\n");
    return;
  }
  if (!plans.length) {
    console.log("\n✅ 변경 대상 없음\n");
    return;
  }

  let zeroed = 0;
  let ledgerWritten = 0;
  let sealed = 0;
  let conflicted = 0;

  for (const p of plans) {
    // 원장 먼저(멱등) → 잔량 제거. 순서가 반대면 원장 기록 실패 시 사라진 이유가 남지 않는다.
    if (await recordZeroLedger(p._id, p, now)) ledgerWritten += 1;

    const $set = {
      "profileSubscription.membershipCreditBalance": 0,
      "profileSubscription.membershipCreditLots": [],
    };
    if (p.needsLegacySeal) {
      $set["profileSubscription.legacyCoinCreditSeeded"] = true;
      $set["profileSubscription.legacyCoinCreditSeededAt"] = now;
      $set["profileSubscription.legacyCoinCreditSeededPoints"] = p.legacyPoints;
    }

    // 버전 가드(낙관적 락). 레거시 유저는 필드 자체가 없어 `field: 0` 으로는 매칭되지 않으므로 부재도 허용.
    const res = await users.updateOne(
      {
        _id: p._id,
        $or: [
          { "profileSubscription.membershipCreditLotsVersion": p.version },
          { "profileSubscription.membershipCreditLotsVersion": { $exists: false } },
        ],
      },
      { $set, $inc: { "profileSubscription.membershipCreditLotsVersion": 1 } },
    );
    if (Number(res?.matchedCount || 0) === 0) {
      conflicted += 1;
      console.warn(`  ⚠️  ${p.email}: 버전 충돌로 건너뜀(동시 변경). 재실행 필요`);
      continue;
    }
    zeroed += 1;
    if (p.needsLegacySeal) sealed += 1;
  }

  console.log("\n📊 요약");
  console.log(`  - 잔량 0 처리: ${zeroed}명 / 대상 ${plans.length}명`);
  console.log(`  - 소멸 원장 기록: ${ledgerWritten}건`);
  console.log(`  - 레거시 코인 재시딩 차단: ${sealed}명`);
  if (conflicted) console.log(`  - 버전 충돌(미처리): ${conflicted}명`);
  console.log("\n✅ 마이그레이션 완료\n");
}

main()
  .catch((err) => {
    console.error("❌ 마이그레이션 실패:", err.message);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log("🔌 MongoDB 연결 종료");
  });

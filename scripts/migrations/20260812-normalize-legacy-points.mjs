/**
 * MongoDB 마이그레이션 — 레거시 코인(points) 봉인 + 잔액 정규화 (1회성 운영 정리)
 *
 * 🔴 왜 급한가: worker/routes/billing.js 의 seedMembershipCreditFromUserDoc 은
 * `legacyCoinCreditSeeded !== true && points > 0` 인 계정이 **결제창을 여는 것만으로**
 * points × MEMBERSHIP_CREDIT_PER_COIN(=10) 만큼 월정석 lot 을 자동 지급한다.
 * 2026-08 감사 실측: points>0 계정 160개 / 합계 2,002,956,304 코인, 봉인은 94건뿐.
 * 즉 최대 200억 월정석이 발행될 수 있는 경로가 열려 있다.
 *
 * 이 스크립트가 하는 일(계정당, 순서 고정):
 *   1) 원장 먼저 — PointHistory(kind:"adjust") 를 멱등 upsert 로 남긴다.
 *      잔액이 사라진 이유를 감사 추적에 남긴 뒤에 잔액을 건드린다.
 *      dedupeKey 가 OPERATION_ID 고정이라 재실행해도 중복되지 않는다(unique partial index).
 *   2) 봉인 — legacyCoinCreditSeeded:true + SeededAt + SeededPoints.
 *      🔴 오너 계정도 봉인한다. 봉인은 "자동 전환"만 막고 잔액은 건드리지 않으므로,
 *      빼면 오너가 결제창을 여는 순간 수백만 월정석이 발행된다.
 *   3) 잔액 0 — OWNER_EMAILS 가 아닌 계정만. 오너 2계정은 잔액을 유지한다.
 *
 * points 를 왜 지워도 되는가: 코인 차감 경로는 전 구간이 402(legacyCoinDisabled)로 죽어 있어
 * 쓸 수 없는 화폐다(billing.js:4552, fortune.js:2493, server/routes/fortune.routes.js:669).
 * 증빙인 pointhistories 19,524건은 **그대로 보존**한다 — 이 스크립트는 원장에 행을 더할 뿐
 * 지우지 않는다.
 *
 * 실행:
 *   node scripts/migrations/20260812-normalize-legacy-points.mjs            # dry-run
 *   node scripts/migrations/20260812-normalize-legacy-points.mjs --apply
 *   node scripts/migrations/20260812-normalize-legacy-points.mjs --check    # 현황만
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { PointHistory, User } from "../../worker/lib/models.js";
import { buildMongoEnv, maskEmail, requireMongoUri, writeBeforeImage } from "../lib/migration-before-image.mjs";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const APPLY = process.argv.includes("--apply");
const CHECK = process.argv.includes("--check");

// 잔액을 유지할 운영자 계정. 소문자 Set 으로 다시 걸러 대소문자 저장 차이를 흡수한다
// (20260730-zero-heavy-monthly-credit-balances.mjs 와 같은 방식).
const OWNER_EMAILS = ["seongbae555@gmail.com", "bulegyung@naver.com"];
const ownerSet = new Set(OWNER_EMAILS.map((mail) => mail.trim().toLowerCase()));

// 멱등키. Date.now() 금지 — 재실행해도 같아야 원장이 중복되지 않는다.
const OPERATION_ID = "20260812-normalize-legacy-points";

const env = buildMongoEnv();
requireMongoUri(env);

function n(value) {
  return Math.max(0, Math.floor(Number(value || 0)));
}

function isOwner(email) {
  return ownerSet.has(String(email || "").trim().toLowerCase());
}

async function loadTargets() {
  return User.collection
    .find(
      { points: { $gt: 0 } },
      {
        projection: {
          email: 1,
          points: 1,
          "profileSubscription.legacyCoinCreditSeeded": 1,
          "profileSubscription.legacyCoinCreditSeededPoints": 1,
          "profileSubscription.membershipCreditBalance": 1,
        },
      },
    )
    .sort({ points: -1 })
    .toArray();
}

/** 잔액이 사라진 이유를 남기는 원장 행. 멱등 upsert 라 재실행해도 하나만 생긴다. */
async function recordAdjustLedger(userId, points, now) {
  await PointHistory.collection.updateOne(
    { dedupeKey: `legacy-points-zero:${OPERATION_ID}:${String(userId)}` },
    {
      $setOnInsert: {
        userId,
        kind: "adjust",
        delta: -points,
        balanceAfter: 0,
        reason: "레거시 코인 정리(차감 경로 폐지, 사용 불가 잔액 0 처리)",
        featureKey: "",
        dedupeKey: `legacy-points-zero:${OPERATION_ID}:${String(userId)}`,
        metadata: { operationId: OPERATION_ID, beforePoints: points },
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true },
  );
}

async function main() {
  console.log("🔌 MongoDB 연결 중...");
  await connectDb(env);
  console.log("✅ 연결 완료\n");

  const targets = await loadTargets();
  const totalPoints = targets.reduce((acc, row) => acc + n(row.points), 0);
  const unsealed = targets.filter((row) => row.profileSubscription?.legacyCoinCreditSeeded !== true);
  const toZero = targets.filter((row) => !isOwner(row.email));
  const ownerRows = targets.filter((row) => isOwner(row.email));

  console.log(`📊 points > 0 계정 ${targets.length}명 / 합계 ${totalPoints.toLocaleString()} 코인`);
  console.log(`   🔴 미봉인(자동 월정석 지급 위험) ${unsealed.length}명`);
  console.log(`      → 그대로 두면 최대 ${(unsealed.reduce((a, r) => a + n(r.points), 0) * 10).toLocaleString()} 월정석 발행 가능`);
  console.log(`   봉인 대상 ${unsealed.length}명 · 잔액 0 처리 대상 ${toZero.length}명 · 잔액 유지(오너) ${ownerRows.length}명\n`);

  if (ownerRows.length) {
    console.log("👤 잔액 유지 계정");
    for (const row of ownerRows) {
      console.log(`   · ${maskEmail(row.email)}  points=${n(row.points).toLocaleString()}  봉인=${row.profileSubscription?.legacyCoinCreditSeeded === true}`);
    }
    console.log("");
  }
  const missingOwners = OWNER_EMAILS.filter((mail) => !targets.some((row) => String(row.email || "").toLowerCase() === mail));
  if (missingOwners.length) {
    console.log(`ℹ️  오너 계정 중 points>0 이 아닌 계정: ${missingOwners.map(maskEmail).join(", ")} (건드릴 것 없음)\n`);
  }

  const top = toZero.slice(0, 20);
  if (top.length) {
    console.log(`🎯 잔액 0 처리 상위 ${top.length}건`);
    for (const row of top) {
      console.log(`   · ${maskEmail(row.email).padEnd(34)} ${n(row.points).toLocaleString().padStart(14)} → 0`);
    }
    if (toZero.length > top.length) console.log(`   … 외 ${toZero.length - top.length}건`);
    console.log("");
  }

  if (CHECK) {
    console.log(unsealed.length
      ? `❌ 미봉인 ${unsealed.length}건 — 자동 월정석 지급 경로가 열려 있습니다.`
      : "✅ 미봉인 계정 없음 — 자동 월정석 지급 경로가 닫혀 있습니다.");
    process.exitCode = unsealed.length ? 1 : 0;
    return;
  }

  if (!APPLY) {
    console.log("🔍 DRY-RUN — 아무것도 쓰지 않았습니다. 적용하려면 --apply 를 붙이세요.");
    console.log("🔴 --apply 전에 백업을 확보하세요: npm run backup:mongo -- --out backups/mongodb/<date>");
    return;
  }

  const beforeFile = writeBeforeImage(
    OPERATION_ID,
    targets.map((row) => ({
      _id: String(row._id),
      email: row.email,
      points: n(row.points),
      legacyCoinCreditSeeded: row.profileSubscription?.legacyCoinCreditSeeded ?? null,
      legacyCoinCreditSeededPoints: row.profileSubscription?.legacyCoinCreditSeededPoints ?? null,
    })),
    { targets: targets.length, unsealed: unsealed.length, toZero: toZero.length, totalPoints },
  );
  console.log(`💾 변경 전 이미지 기록: ${beforeFile}\n`);

  const now = new Date();
  const stats = { sealed: 0, zeroed: 0, ledger: 0, skipped: 0, failed: 0 };

  for (const row of targets) {
    const points = n(row.points);
    const owner = isOwner(row.email);
    const alreadySealed = row.profileSubscription?.legacyCoinCreditSeeded === true;
    const set = {};

    if (!alreadySealed) {
      set["profileSubscription.legacyCoinCreditSeeded"] = true;
      set["profileSubscription.legacyCoinCreditSeededAt"] = now;
      set["profileSubscription.legacyCoinCreditSeededPoints"] = points;
    }

    try {
      if (!owner) {
        // 원장 먼저. 이 행이 실패하면 잔액을 건드리지 않는다.
        await recordAdjustLedger(row._id, points, now);
        stats.ledger += 1;
        set.points = 0;
      }

      if (!Object.keys(set).length) {
        stats.skipped += 1;
        continue;
      }

      // CAS: 읽은 시점의 points 가 그대로일 때만 쓴다. 그 사이 환불 등으로 값이 바뀌었으면 건너뛴다.
      const result = await User.collection.updateOne({ _id: row._id, points }, { $set: set });
      if (result.matchedCount !== 1) {
        console.warn(`   ⚠️  건너뜀(그 사이 points 변경): ${maskEmail(row.email)}`);
        stats.skipped += 1;
        continue;
      }
      if (!alreadySealed) stats.sealed += 1;
      if (!owner) stats.zeroed += 1;
    } catch (error) {
      console.error(`   ❌ 실패 ${maskEmail(row.email)}: ${error?.message || error}`);
      stats.failed += 1;
    }
  }

  console.log(`\n✅ 적용 완료 — 봉인 ${stats.sealed} · 잔액0 ${stats.zeroed} · 원장 ${stats.ledger} · 건너뜀 ${stats.skipped} · 실패 ${stats.failed}`);
  if (stats.failed) process.exitCode = 1;

  const after = await User.collection.countDocuments({ points: { $gt: 0 } });
  const afterUnsealed = await User.collection.countDocuments({
    points: { $gt: 0 },
    "profileSubscription.legacyCoinCreditSeeded": { $ne: true },
  });
  console.log(`   검증: points>0 계정 ${after}명(오너 ${ownerRows.length}명 기대) · 미봉인 ${afterUnsealed}명(0 기대)`);
  if (afterUnsealed !== 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("❌ 마이그레이션 실패:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log("\n🔌 MongoDB 연결 종료");
  });

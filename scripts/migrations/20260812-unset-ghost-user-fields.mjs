/**
 * MongoDB 마이그레이션 — users 의 유령 필드 제거 (스키마에 없고 읽는 코드도 없는 것만)
 *
 * 2026-08 감사에서 users 문서에 워커 스키마(worker/lib/models.js userSchema)에 존재하지
 * 않는 필드 경로 24개가 실재하는 것을 확인했다. 그중 **5개는 살아 있는 코드가 지금도 쓴다**
 * (referralCode/referralCodeCreatedAt/referralProgram/phoneUpdatedAt/
 *  profileSubscription.updatedAt) — 이들은 스키마에 선언을 추가했고 여기서 건드리지 않는다.
 *
 * 남은 19개 경로만 지운다. 그룹 단위로 나눠 실행하며, 한 번에 전부 지우지 않는다.
 *
 * 🔴 재생성 차단이 선행돼야 한다: app/_lib/models/UserModel.js 가 세 번째 User 스키마를
 * 갖고 있어 시드 스크립트 실행마다 third-schema 그룹이 되살아났다. 그 파일은 워커 모델로
 * 위임하도록 바뀌었으므로(같은 정리 작업의 앞 단계) 이제 다시 새겨지지 않는다.
 *
 * 실행:
 *   node scripts/migrations/20260812-unset-ghost-user-fields.mjs                     # 전 그룹 dry-run
 *   node scripts/migrations/20260812-unset-ghost-user-fields.mjs --group third-schema --apply
 *   node scripts/migrations/20260812-unset-ghost-user-fields.mjs --check
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { User } from "../../worker/lib/models.js";
import { buildMongoEnv, requireMongoUri, writeBeforeImage } from "../lib/migration-before-image.mjs";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

const APPLY = process.argv.includes("--apply");
const CHECK = process.argv.includes("--check");
const ONLY_GROUP = String(argValue("--group", "") || "").trim();

const OPERATION_ID = "20260812-unset-ghost-user-fields";

/**
 * 그룹별 제거 대상.
 * 🔴 여기 없는 유령 필드는 "살아 있는 코드가 쓰는 것"이라 일부러 뺀 것이다. 추가하지 말 것.
 */
const GROUPS = [
  {
    name: "legacy-pass-counters",
    why: "구 이용권 카운터. 읽는 코드 0건이며 verify-billing-pass-policy.mjs 가 passRemainingUses 부활을 금지하는 가드까지 두고 있다.",
    paths: [
      "usagePasses",
      "profileSubscription.passRemainingUses",
      "profileSubscription.passTotalUses",
      "profileSubscription.passUsedCount",
    ],
  },
  {
    name: "third-schema",
    why: "app/_lib/models/UserModel.js(세 번째 User 스키마)를 쓰던 시드 스크립트가 새긴 잔재. banReason/bannedAt 은 존재하지 않는 회원 잠금 기능이 있는 것처럼 오해를 부른다.",
    paths: [
      "lastLoginAt",
      "bannedAt",
      "banReason",
      "destinyCurrentProfileId",
      "profileSubscription.status",
      "profileSubscription.autoRenewEnabled",
      "profileSubscription.currentPeriodStart",
      "profileSubscription.currentPeriodEnd",
      "profileSubscription.priceCoins",
      "profileSubscription.freeServiceThresholdCoins",
      "profileSubscription.lastRenewedAt",
      "profileSubscription.lastRenewalFailedAt",
      "profileSubscription.renewalFailReason",
    ],
  },
  {
    name: "unknown-origin",
    why: "출처 불명. 읽는 코드 0건. 변경 전 이미지에 값을 통째로 남긴 뒤 제거한다.",
    paths: ["metadata", "profileMe"],
  },
];

const env = buildMongoEnv();
requireMongoUri(env);

function orFilter(paths) {
  return { $or: paths.map((path) => ({ [path]: { $exists: true } })) };
}

async function main() {
  console.log("🔌 MongoDB 연결 중...");
  await connectDb(env);
  console.log("✅ 연결 완료\n");

  const groups = ONLY_GROUP ? GROUPS.filter((group) => group.name === ONLY_GROUP) : GROUPS;
  if (ONLY_GROUP && !groups.length) {
    console.error(`❌ 알 수 없는 그룹: ${ONLY_GROUP} (사용 가능: ${GROUPS.map((g) => g.name).join(", ")})`);
    process.exitCode = 1;
    return;
  }

  let remainingTotal = 0;

  for (const group of groups) {
    const filter = orFilter(group.paths);
    const projection = { _id: 1 };
    for (const path of group.paths) projection[path] = 1;

    const rows = await User.collection.find(filter, { projection }).toArray();
    console.log(`📦 [${group.name}] ${rows.length}건`);
    console.log(`   ${group.why}`);
    for (const path of group.paths) {
      const count = await User.collection.countDocuments({ [path]: { $exists: true } });
      if (count) console.log(`     · ${path.padEnd(48)} ${count}건`);
    }
    remainingTotal += rows.length;

    if (CHECK || !APPLY) {
      console.log("");
      continue;
    }

    if (!rows.length) {
      console.log("   → 지울 것이 없습니다.\n");
      continue;
    }

    const beforeFile = writeBeforeImage(
      `${OPERATION_ID}.${group.name}`,
      rows.map((row) => ({ ...row, _id: String(row._id) })),
      { group: group.name, paths: group.paths, count: rows.length },
    );
    console.log(`   💾 변경 전 이미지: ${beforeFile}`);

    const unset = {};
    for (const path of group.paths) unset[path] = "";
    const result = await User.collection.updateMany(filter, { $unset: unset });
    console.log(`   ✅ matched ${result.matchedCount} · modified ${result.modifiedCount}`);

    const left = await User.collection.countDocuments(filter);
    console.log(`   검증: 남은 문서 ${left}건 (0 기대)\n`);
    if (left !== 0) process.exitCode = 1;
  }

  if (CHECK) {
    console.log(remainingTotal ? `❌ 유령 필드 보유 문서 ${remainingTotal}건` : "✅ 유령 필드 없음");
    process.exitCode = remainingTotal ? 1 : 0;
    return;
  }
  if (!APPLY) {
    console.log("🔍 DRY-RUN — 아무것도 쓰지 않았습니다. 그룹 단위로 --group <name> --apply 하세요.");
    console.log("🔴 --apply 전에 백업을 확보하세요: npm run backup:mongo -- --out backups/mongodb/<date>");
  }
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

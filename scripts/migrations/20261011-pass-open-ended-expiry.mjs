/**
 * MongoDB 마이그레이션 — 활성 이용권의 **만료일 해제** (1회성, 2026-10-11 사용자 결정)
 *
 * 이용권에 기간이 없어졌다. 이제 끝나는 조건은 한도 소진 하나뿐이다(worker/lib/profile-limits.js
 * PASS_OPEN_ENDED_MS · buildPassTerminationFields). 새 결제는 처음부터 기간 없는 만료일(+100년)을 받지만,
 * 이미 활성인 이용권은 옛 만료일(구매 + 30일, 재구매 스택 포함)을 갖고 있어 그날 끝난다. 이 스크립트가
 * 그 만료일을 기간 없는 날짜로 바꾼다.
 *
 * 대상: profileSubscription.tier 가 이용권 등급이고, now < expiresAt <= now + 10년(아직 기간이 있는) 문서.
 *   - 소진 종료된 이용권은 expiresAt 이 과거라 자연히 빠진다.
 *   - 이미 기간 없는 이용권(+100년)은 10년 문턱 밖이라 빠진다 — 다시 돌려도 무해하다.
 *
 * 쓰는 필드:
 *   - expiresAt → now + PASS_OPEN_ENDED_MS
 *   - premiumUseCycleKey → 새 만료일 ISO. **저장 키가 옛 만료일과 같을 때만** 바꾼다. 그래야 사용액
 *     (monthlySpendCoin)과 쌓인 한도(monthlyLimitCoin)가 그대로 이어진다. 키가 어긋난 문서는 원래도
 *     사용액 0·기본 한도로 읽히고 있었으므로 키를 그대로 둬서 같은 상태를 유지한다.
 * 사용액·한도·등급은 건드리지 않는다.
 *
 * 🔴 문서별 CAS — 필터에 옛 expiresAt 을 넣는다. 그 사이 결제·소진·환불이 문서를 바꿨으면 건너뛴다.
 * 🔴 개인정보 무출력 — 등급별 건수만 낸다. before-image 파일에는 _id 와 옛 값이 들어간다.
 *
 * 실행:
 *   node scripts/migrations/20261011-pass-open-ended-expiry.mjs --self-test  # DB 없이 로직만
 *   node scripts/migrations/20261011-pass-open-ended-expiry.mjs              # dry-run(읽기 전용)
 *   node scripts/migrations/20261011-pass-open-ended-expiry.mjs --apply --expect <n>
 *
 * 🔴 운영 DB --apply 는 사용자 승인 후에만 한다. 그 전에 전량 백업을 확보한다:
 *      npm run backup:mongo -- --out <레포 밖 경로>
 * 🔴 순서: 새 코드 배포 → 이 스크립트. 새 코드는 옛 만료일 문서도 그대로 활성으로 읽는다.
 */

import { config } from "dotenv";
import { PASS_OPEN_ENDED_MS, PASS_OPEN_ENDED_THRESHOLD_MS, PASS_TIERS } from "../../worker/lib/profile-limits.js";

const APPLY = process.argv.includes("--apply");
const SELF_TEST = process.argv.includes("--self-test");
// --dry-run 은 인자 없음과 같은 읽기 전용이다(.claude/hooks/guard-costly-commands.mjs db-write 규칙).
const DRY_RUN = process.argv.includes("--dry-run");

const OPERATION_ID = "20261011-pass-open-ended-expiry";
const PASS_TIER_VALUES = Object.freeze(Object.values(PASS_TIERS));

function argValue(name, fallback = "") {
  const at = process.argv.indexOf(name);
  if (at < 0 || at + 1 >= process.argv.length) return fallback;
  return process.argv[at + 1];
}

export function buildTargetFilter(now) {
  return {
    "profileSubscription.tier": { $in: [...PASS_TIER_VALUES] },
    "profileSubscription.expiresAt": { $gt: now, $lte: new Date(now.getTime() + PASS_OPEN_ENDED_THRESHOLD_MS) },
  };
}

/** 한 문서에 쓸 $set 과 CAS 필터. 대상이 아니면 null. */
export function planOpenEndedUpdate(userDoc, now) {
  const sub = userDoc?.profileSubscription || {};
  const oldExpiresAt = sub.expiresAt ? new Date(sub.expiresAt) : null;
  if (!oldExpiresAt || !Number.isFinite(oldExpiresAt.getTime())) return null;
  if (!PASS_TIER_VALUES.includes(String(sub.tier || ""))) return null;
  const remaining = oldExpiresAt.getTime() - now.getTime();
  if (!(remaining > 0) || remaining > PASS_OPEN_ENDED_THRESHOLD_MS) return null;
  const newExpiresAt = new Date(now.getTime() + PASS_OPEN_ENDED_MS);
  const set = { "profileSubscription.expiresAt": newExpiresAt, "profileSubscription.updatedAt": now };
  const keyMatches = String(sub.premiumUseCycleKey || "") === oldExpiresAt.toISOString();
  if (keyMatches) set["profileSubscription.premiumUseCycleKey"] = newExpiresAt.toISOString();
  return {
    filter: { _id: userDoc._id, "profileSubscription.expiresAt": oldExpiresAt, "profileSubscription.tier": sub.tier },
    set,
    keyMatches,
    before: {
      _id: String(userDoc._id || ""),
      tier: String(sub.tier || ""),
      expiresAt: oldExpiresAt.toISOString(),
      premiumUseCycleKey: String(sub.premiumUseCycleKey || ""),
    },
  };
}

function runSelfTest() {
  const failures = [];
  const ok = (condition, message) => { if (!condition) failures.push(message); };
  const now = new Date("2026-10-11T00:00:00Z");
  const day = 86_400_000;
  const in10 = new Date(now.getTime() + 10 * day);

  const matched = planOpenEndedUpdate({ _id: "a", profileSubscription: { tier: "standard", expiresAt: in10, premiumUseCycleKey: in10.toISOString(), monthlySpendCoin: 80 } }, now);
  ok(matched && matched.keyMatches, "키가 옛 만료일과 같으면 키를 옮겨야 한다");
  ok(matched?.set["profileSubscription.premiumUseCycleKey"] === matched?.set["profileSubscription.expiresAt"].toISOString(), "새 키는 새 만료일 ISO 여야 사용액·한도가 이어진다");
  ok(matched?.set["profileSubscription.expiresAt"].getTime() - now.getTime() > PASS_OPEN_ENDED_THRESHOLD_MS, "새 만료일은 기간 없음 문턱 밖이어야 한다");
  ok(!("profileSubscription.monthlySpendCoin" in (matched?.set || {})), "사용액은 건드리지 않는다");
  ok(matched?.filter["profileSubscription.expiresAt"].getTime() === in10.getTime(), "CAS 필터에 옛 만료일이 있어야 한다");

  const stale = planOpenEndedUpdate({ _id: "b", profileSubscription: { tier: "vvip", expiresAt: in10, premiumUseCycleKey: "2026-09-01T00:00:00.000Z" } }, now);
  ok(stale && !stale.keyMatches && !("profileSubscription.premiumUseCycleKey" in stale.set), "어긋난 키는 그대로 둔다");

  ok(planOpenEndedUpdate({ _id: "c", profileSubscription: { tier: "standard", expiresAt: new Date(now.getTime() - day) } }, now) === null, "소진·만료된 이용권은 대상이 아니다");
  ok(planOpenEndedUpdate({ _id: "d", profileSubscription: { tier: "free", expiresAt: in10 } }, now) === null, "free 는 대상이 아니다");
  ok(planOpenEndedUpdate({ _id: "e", profileSubscription: { tier: "family", expiresAt: new Date(now.getTime() + PASS_OPEN_ENDED_MS) } }, now) === null, "이미 기간 없는 이용권은 다시 바꾸지 않는다");

  if (failures.length) {
    for (const message of failures) console.error(`❌ ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[${OPERATION_ID}] self-test OK`);
}

if (SELF_TEST) {
  runSelfTest();
} else {
  await runAgainstDatabase();
}

async function runAgainstDatabase() {
  config({ path: ".env.local", quiet: true });
  config({ path: ".env", quiet: true });

  const { buildMongoEnv, requireMongoUri, writeBeforeImage } = await import("../lib/migration-before-image.mjs");
  const { connectDb, mongoose } = await import("../../worker/lib/db.js");
  const { User } = await import("../../worker/lib/models.js");

  const env = buildMongoEnv();
  requireMongoUri(env);
  const expectRaw = String(argValue("--expect", "any"));
  const expect = expectRaw === "any" ? null : Number(expectRaw);

  await connectDb(env);
  try {
    const now = new Date();
    const rows = await User.find(buildTargetFilter(now))
      .select("_id profileSubscription.tier profileSubscription.expiresAt profileSubscription.premiumUseCycleKey")
      .lean();
    const plans = rows.map((row) => planOpenEndedUpdate(row, now)).filter(Boolean);
    const byTier = new Map();
    for (const plan of plans) byTier.set(plan.before.tier, (byTier.get(plan.before.tier) || 0) + 1);
    const keyMatched = plans.filter((plan) => plan.keyMatches).length;

    console.log(`[${OPERATION_ID}] 기간이 남은 활성 이용권: ${plans.length}`);
    console.log(`  등급별: ${[...byTier.entries()].map(([tier, count]) => `${tier}=${count}`).join(" · ") || "(없음)"}`);
    console.log(`  사이클 키 이동(사용액·한도 이어짐): ${keyMatched} · 키 유지(원래 기본 한도로 읽힘): ${plans.length - keyMatched}`);

    if (plans.length === 0) {
      console.log("  바꿀 것이 없다.");
      console.log("RESULT OK");
      return;
    }
    if (DRY_RUN || !APPLY) {
      console.log("\n🔍 읽기 전용 — 아무것도 쓰지 않았습니다.");
      console.log("   🔴 운영 DB --apply 는 사용자 승인 후에만. 그 전에 백업: npm run backup:mongo -- --out <레포 밖 경로>");
      console.log(`   적용: --apply --expect ${plans.length}`);
      console.log("RESULT PENDING");
      return;
    }
    if (expect !== null && plans.length !== expect) {
      console.error(`\n❌ 기대 ${expect}건과 다릅니다(실제 ${plans.length}건). 다시 dry-run 으로 확인하세요.`);
      process.exitCode = 1;
      return;
    }

    const imagePath = writeBeforeImage(OPERATION_ID, plans.map((plan) => plan.before), {
      why: "이용권 기간 제거 — 활성 이용권의 옛 만료일을 기간 없는 만료일로 바꾸기 전 값",
      count: plans.length,
    });
    console.log(`\n  before-image: ${imagePath}`);

    let updated = 0;
    let skipped = 0;
    for (const plan of plans) {
      const result = await User.updateOne(plan.filter, { $set: plan.set });
      if (Number(result?.modifiedCount || 0) > 0) updated += 1;
      else skipped += 1; // 그 사이 결제·소진·환불로 문서가 바뀌었다 — 새 코드가 이미 맞게 쓴다.
    }
    const remaining = await User.countDocuments(buildTargetFilter(new Date()));
    console.log(`  갱신 ${updated} · 건너뜀(동시 변경) ${skipped} · 잔여 ${remaining}`);
    if (remaining !== 0) {
      console.error("❌ 기간이 남은 활성 이용권이 남았습니다 — 다시 실행하거나 before-image 로 확인하세요.");
      process.exitCode = 1;
      return;
    }
    console.log("RESULT OK");
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }
}

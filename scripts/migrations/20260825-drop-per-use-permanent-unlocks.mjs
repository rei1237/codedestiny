/**
 * MongoDB 마이그레이션 — 회당 결제(per_use) 키로 잘못 기록된 **영구 해금 행 정리** (1회성)
 *
 * 🔴 왜 이 행들이 생겼나: 단건 KRW 확정 경로(`worker/payments/index.js` grantOrderEntitlement)가
 * `billingType` 검사 없이 `grantEntitlement`(ContentEntitlement, grantType:"permanent_unlock") 와
 * `markUserFeatureUnlocked`(User.unlockedFeatures/paidFeatures)를 불렀다. 월정석·이용권 게이트에는
 * 있던 경계가 이 경로에만 빠져 있었다. 쓰는 경로는 PR #1137, 읽는 경로는 PR #1141·#1142 에서
 * 닫혔으므로 **이 행들은 이제 무료 통과를 만들지 못한다.** 다만 남아 있는 한
 *   · `/api/access/unlocks`·관리자 주문 조회·리뷰 자격 등 다른 조회를 계속 오염시키고
 *   · "이 계정이 무엇을 보유하는가"라는 질문에 거짓을 섞는다.
 * 그래서 지운다. 급한 장애 대응이 아니라 회계 정합성 정리다.
 *
 * 하는 일(순서 고정):
 *   1) 대상 조회 — featureKey 가 회당 결제인 ContentEntitlement 행 + 그 키를 가진 User 배열
 *   2) before-image 기록 — 지우기 **전에** 전량을 파일로 남긴다(정밀 롤백 근거)
 *   3) ContentEntitlement 삭제 — status 무관. 애초에 존재하면 안 되는 행이라 REFUNDED/CANCELLED 도 같다
 *   4) User.unlockedFeatures / paidFeatures 에서 $pull — 두 필드는 항상 쌍으로 움직인다
 *      (worker/lib/content-unlocks.js revokePaymentContentAccess 와 같은 규약)
 *   5) 재조회로 잔여 0 확인. 아니면 exitCode 1
 *
 * 🔴 판정은 레지스트리만 본다 — `isPerUsePaidFeatureKey` 를 import 한다. 여기에 키 목록을 다시
 *    적으면 런타임과 드리프트가 생기고, 그 드리프트가 곧 "지웠는데 안 지워진 행"이 된다
 *    (20260813-normalize-v2-entitlement-service-keys.mjs 와 같은 계약).
 *
 * 🔴 레지스트리에서 은퇴한 키는 건드리지 않는다. `isPerUsePaidFeatureKey` 는 그런 키에 false 를
 *    주므로 자연히 제외된다 — 그 행들은 정당한 과거 구매일 수 있다.
 *
 * 🔴 `ContentEntitlement.userId` 는 **String** 이고 다른 결제 컬렉션은 ObjectId 다
 *    (worker/payments/entitlements.js:19-22). 여기서는 문자열로만 다룬다.
 *
 * 🔴 개인정보 무출력 — 이메일·이름·userId 를 화면에 찍지 않는다. 카운트와 featureKey 분포만 낸다.
 *    (before-image 파일에는 들어가므로 backups/ 아래에 두고 검증 후 파기한다.)
 *
 * 실행:
 *   node scripts/migrations/20260825-drop-per-use-permanent-unlocks.mjs --self-test  # DB 없이 로직만
 *   node scripts/migrations/20260825-drop-per-use-permanent-unlocks.mjs --check      # 현황만(읽기 전용)
 *   node scripts/migrations/20260825-drop-per-use-permanent-unlocks.mjs              # dry-run(읽기 전용)
 *   node scripts/migrations/20260825-drop-per-use-permanent-unlocks.mjs --apply --expect <n>
 *
 * 🔴 `--apply` 전에 전량 백업을 확보한다:
 *      npm run backup:mongo -- --out <레포 밖 경로>
 */

import { config } from "dotenv";
import { isPerUsePaidFeatureKey, PER_USE_PAID_FEATURE_KEYS } from "../../worker/lib/paid-feature-registry.js";

const APPLY = process.argv.includes("--apply");
const CHECK = process.argv.includes("--check");
const SELF_TEST = process.argv.includes("--self-test");
/* 🔴 --dry-run 은 훅(.claude/hooks/guard-costly-commands.mjs 의 db-write 규칙)이 승인 없이
   통과시키는 유일한 모드다. 그래서 이 스크립트에서 --dry-run 은 **인자 없음과 완전히 같은
   읽기 전용**이며, --apply 와 함께 주면 쓰기를 하지 않고 거부한다. */
const DRY_RUN = process.argv.includes("--dry-run");

const OPERATION_ID = "20260825-drop-per-use-permanent-unlocks";
/** 한 번에 다루는 문서 수. 큰 컬렉션에서 커서·메모리를 묶어 두지 않기 위한 상한. */
const BATCH_SIZE = 500;

function argValue(name, fallback = "") {
  const at = process.argv.indexOf(name);
  if (at < 0 || at + 1 >= process.argv.length) return fallback;
  return process.argv[at + 1];
}

/**
 * 삭제 대상 키 집합. 레지스트리에서 전수 발견하고, 비면 그 자체로 실패다
 * (대상이 없을 때 통과시키는 정리는 정리가 아니다).
 */
export function resolveTargetKeys() {
  const keys = [...PER_USE_PAID_FEATURE_KEYS].filter((key) => isPerUsePaidFeatureKey(key));
  if (keys.length < 50) {
    throw new Error(`회당 결제 키를 ${keys.length}개밖에 못 찾았다 — 레지스트리 로드 실패 의심(fail-closed)`);
  }
  return keys;
}

/** featureKey 별 건수 분포. 개인정보가 섞이지 않는 유일한 요약 축이다. */
export function summarizeByFeatureKey(rows) {
  const counts = new Map();
  for (const row of rows) {
    const key = String(row?.featureKey || "").trim() || "(empty)";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** 삭제 전에 남길 최소 정보. _id 가 있어야 되돌릴 수 있다. */
export function toBeforeImageRow(row) {
  return {
    _id: String(row?._id || ""),
    userId: String(row?.userId || ""),
    profileId: String(row?.profileId || ""),
    featureKey: String(row?.featureKey || ""),
    serviceKey: String(row?.serviceKey || ""),
    contentKey: String(row?.contentKey || ""),
    scope: String(row?.scope || ""),
    status: String(row?.status || ""),
    source: String(row?.source || ""),
    grantType: String(row?.grantType || ""),
    orderId: String(row?.orderId || ""),
    paymentId: String(row?.paymentId || ""),
    coinPrice: Number(row?.coinPrice || 0),
    amountKRW: Number(row?.amountKRW || 0),
    grantedAt: row?.grantedAt ? new Date(row.grantedAt).toISOString() : null,
    unlockedAt: row?.unlockedAt ? new Date(row.unlockedAt).toISOString() : null,
  };
}

/* ── DB 없이 도는 자체 점검 ─────────────────────────────────────────────────
   실 DB 실행은 승인 사항이라(CLAUDE.md 규칙 2) CI 나 개발 중에는 돌릴 수 없다.
   그래서 "무엇을 지울지 고르는 규칙"만이라도 실행으로 증명한다. */
function runSelfTest() {
  const failures = [];
  const ok = (condition, message) => { if (!condition) failures.push(message); };

  const keys = resolveTargetKeys();
  ok(keys.includes("openKemetModal"), "이집트 신탁이 대상에 없다 — 이 정리가 생긴 사고의 키다");
  ok(keys.includes("dream-psycho-analysis"), "정신분석 해몽이 대상에 없다");

  // 영구 해금은 절대 대상이 아니다 — 돈 낸 사용자의 콘텐츠를 지우는 것이 최악의 실패다.
  for (const unlockKey of ["section_daewun", "sukuyo-relationship-encyclopedia", "premium-fpti-report"]) {
    ok(!keys.includes(unlockKey), `영구 해금 키가 삭제 대상에 섞였다: ${unlockKey}`);
  }
  // 음악 트랙은 동적 키이고 unlock 으로 분류된다.
  ok(!isPerUsePaidFeatureKey("music-track-abcdef123456"), "음악 트랙이 삭제 대상으로 분류된다");
  // 레지스트리에서 은퇴한 키는 판단하지 않는다(정당한 과거 구매일 수 있다).
  ok(!isPerUsePaidFeatureKey("some-retired-product-key"), "미등재 키가 삭제 대상으로 분류된다");

  const distribution = summarizeByFeatureKey([
    { featureKey: "openKemetModal" },
    { featureKey: "openKemetModal" },
    { featureKey: "tarot-year-fortune" },
    { featureKey: "" },
  ]);
  ok(distribution[0][0] === "openKemetModal" && distribution[0][1] === 2, "분포 집계가 틀렸다");
  ok(distribution.some(([key]) => key === "(empty)"), "빈 featureKey 를 (empty) 로 드러내지 않는다");

  const image = toBeforeImageRow({ _id: "abc", userId: "u1", featureKey: "openKemetModal", grantedAt: new Date(0) });
  ok(image._id === "abc" && image.grantedAt === "1970-01-01T00:00:00.000Z", "before-image 행 변환이 틀렸다");
  ok(!("email" in image) && !("name" in image), "before-image 행에 개인정보 필드가 섞였다");

  ok(!(APPLY && DRY_RUN), "--apply 와 --dry-run 을 함께 주면 쓰기를 하지 않는다");

  console.log(`[self-test] 대상 키 ${keys.length}개 · 점검 ${8 + 3}건 중 ${8 + 3 - failures.length}건 통과`);
  if (failures.length) {
    for (const failure of failures) console.error(`  FAIL ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log("[self-test] OK — 삭제 대상 선별 규칙이 레지스트리와 일치한다");
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
  const { ContentEntitlement, User } = await import("../../worker/lib/models.js");

  const env = buildMongoEnv();
  requireMongoUri(env);

  const targetKeys = resolveTargetKeys();
  const expectRaw = String(argValue("--expect", "any"));
  const expect = expectRaw === "any" ? null : Number(expectRaw);

  await connectDb(env);
  try {
    // ── 1) 현황 ────────────────────────────────────────────────────────────
    const entitlementFilter = { featureKey: { $in: targetKeys } };
    const userFilter = {
      $or: [
        { unlockedFeatures: { $in: targetKeys } },
        { paidFeatures: { $in: targetKeys } },
      ],
    };

    const [entitlementCount, userCount] = await Promise.all([
      ContentEntitlement.countDocuments(entitlementFilter),
      User.countDocuments(userFilter),
    ]);

    console.log(`[${OPERATION_ID}] 회당 결제 키 ${targetKeys.length}개 기준`);
    console.log(`  ContentEntitlement 대상 행: ${entitlementCount}`);
    console.log(`  unlockedFeatures/paidFeatures 에 해당 키를 가진 계정: ${userCount}`);

    if (entitlementCount === 0 && userCount === 0) {
      console.log("  정리할 것이 없다.");
      console.log("RESULT OK");
      return;
    }

    // featureKey 분포 — 개인정보 없이 규모를 보여주는 유일한 축.
    const sample = await ContentEntitlement.find(entitlementFilter)
      .select("featureKey status grantedAt")
      .lean();
    console.log("  featureKey 분포:");
    for (const [key, count] of summarizeByFeatureKey(sample)) {
      console.log(`    ${key}: ${count}`);
    }
    const statusCounts = new Map();
    for (const row of sample) {
      const status = String(row?.status || "(none)");
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    }
    console.log(`  status 분포: ${[...statusCounts.entries()].map(([s, c]) => `${s}=${c}`).join(" · ")}`);

    if (CHECK || DRY_RUN || !APPLY) {
      // 🔴 --apply 없이는 절대 쓰지 않는다. 인자 없는 실행도 읽기 전용이다.
      console.log("\n🔍 읽기 전용 — 아무것도 쓰지 않았습니다.");
      console.log("   적용하려면 --apply 를 붙이세요.");
      console.log(`   🔴 --apply 전에 백업을 확보하세요: npm run backup:mongo -- --out <레포 밖 경로>`);
      console.log(`   기대 건수를 못박으려면: --apply --expect ${entitlementCount}`);
      console.log("RESULT PENDING");
      if (CHECK) process.exitCode = 1;
      return;
    }

    // ── 2) 기대 건수 게이트 ────────────────────────────────────────────────
    if (expect !== null && entitlementCount !== expect) {
      console.error(`\n❌ 기대 ${expect}건과 다릅니다(실제 ${entitlementCount}건).`);
      console.error("   그 사이 데이터가 바뀌었습니다 — 다시 --check 로 확인한 뒤 실행하세요.");
      process.exitCode = 1;
      return;
    }

    // ── 3) before-image ────────────────────────────────────────────────────
    const rows = await ContentEntitlement.find(entitlementFilter).lean();
    const imagePath = writeBeforeImage(
      OPERATION_ID,
      rows.map(toBeforeImageRow),
      {
        why: "단건 KRW 확정 경로가 billingType 검사 없이 쓴 회당 결제 영구 해금 행",
        entitlementCount,
        userCount,
        targetKeyCount: targetKeys.length,
      },
    );
    console.log(`\n  before-image: ${imagePath}`);
    console.log("  🔴 개인정보가 포함됩니다. backups/ 아래에 두고 검증 후 파기하세요.");

    // ── 4) 삭제 ────────────────────────────────────────────────────────────
    let deleted = 0;
    for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
      const ids = rows.slice(offset, offset + BATCH_SIZE).map((row) => row._id);
      const result = await ContentEntitlement.deleteMany({ _id: { $in: ids } });
      deleted += Number(result?.deletedCount || 0);
      console.log(`  삭제 ${Math.min(offset + BATCH_SIZE, rows.length)}/${rows.length} (누적 ${deleted})`);
    }

    const pullResult = await User.updateMany(userFilter, {
      $pull: {
        unlockedFeatures: { $in: targetKeys },
        paidFeatures: { $in: targetKeys },
      },
    });
    const pulled = Number(pullResult?.modifiedCount || 0);
    console.log(`  계정 배열 정리: ${pulled}건`);

    // ── 5) 자체 검증 ───────────────────────────────────────────────────────
    const [remainingEntitlements, remainingUsers] = await Promise.all([
      ContentEntitlement.countDocuments(entitlementFilter),
      User.countDocuments(userFilter),
    ]);
    console.log(`\n  검증: ContentEntitlement 잔여 ${remainingEntitlements}건 · 계정 잔여 ${remainingUsers}건 (둘 다 0 기대)`);

    if (remainingEntitlements !== 0 || remainingUsers !== 0 || deleted !== entitlementCount) {
      console.error("❌ 예상과 다릅니다 — before-image 로 되돌릴 수 있습니다.");
      process.exitCode = 1;
      return;
    }
    console.log("RESULT OK");
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }
}

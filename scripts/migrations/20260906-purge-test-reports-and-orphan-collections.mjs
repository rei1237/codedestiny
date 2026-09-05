/**
 * MongoDB 마이그레이션 — 테스트 계정의 전문가 운세 결과 삭제 + 코드 참조 0 고아 컬렉션 드롭 (1회성)
 *
 * 🔴 왜: 사용자가 개발 중 테스트 계정(CD_PREVIEW_TEST_EMAIL)으로 만든 AI 상담·리포트 결과가 프로덕션
 * 컬렉션에 그대로 남아 있고, 2026-08 감사(docs/db-audit-2026-08/01-collection-inventory.md §C)에서
 * 코드가 더 이상 읽지도 쓰지도 않는 컬렉션이 확인됐다. 둘 다 서비스 데이터가 아니라 쓰레기다.
 *
 * 하는 일(순서 고정):
 *   1) 대상 계정(`--email <주소>`, 없으면 CD_PREVIEW_TEST_EMAIL) → users._id. 이메일은 출력하지 않는다.
 *   2) 상담·리포트 모델을 **전수 발견** — 4개 모델 파일의 등록 모델 중 컬렉션명이 상담·리포트 규칙에
 *      맞고 스키마에 `userId`(String 또는 ObjectId — 모델마다 다르다)가 있는 것(원칙 10 — 손목록 아님).
 *      결제·이용권·월정석·포인트·세션 토큰은 이름 규칙에 걸리지 않고, 걸려도 `EXCLUDE_NAME` 이 막는다.
 *      발견 목록과 컬렉션별 전체 건수를 같이 찍는다(테스트 결과가 전체의 몇 할인지 보이게).
 *   3) 고아 컬렉션 — 아래 `ORPHAN_COLLECTIONS` 각각에 대해 실행 시점에 (a) 등록 모델이 그 컬렉션을
 *      쓰지 않고 (b) `git grep` 으로 소스(worker/app/lib/scripts, 이 파일 제외)에 이름이 없어야 한다.
 *      하나라도 걸리면 그 컬렉션은 건너뛰고 exit 1(fail-closed). 🔴 `fortune_tea_house_*` 는 원시
 *      드라이버로 **활성**이다 — 이름이 비슷하니 목록에 넣지 말 것.
 *   4) before-image — 지울 문서 전량을 backups/ 에 남긴다.
 *   5) deleteMany / drop → 잔여 0 재확인.
 *
 * 🔴 개인정보 무출력 — 이메일·userId 를 찍지 않는다. 컬렉션명과 건수만 낸다.
 *
 * 실행:
 *   node scripts/migrations/20260906-purge-test-reports-and-orphan-collections.mjs --self-test
 *   npm run verify:purge-test-reports        # --check, 읽기 전용, 지울 것이 있으면 exit 1
 *   npm run migrate:purge-test-reports -- --apply --expect <n>   # n = 문서 건수 + 드롭 컬렉션 수
 */

import { config } from "dotenv";
import { execFileSync } from "node:child_process";

const APPLY = process.argv.includes("--apply");
const CHECK = process.argv.includes("--check");
const SELF_TEST = process.argv.includes("--self-test");
const DRY_RUN = process.argv.includes("--dry-run");

const OPERATION_ID = "20260906-purge-test-reports-and-orphan-collections";
const BATCH_SIZE = 500;

/** 상담·리포트 결과 컬렉션의 이름 규칙. */
const REPORT_NAME = /(consultations|reports|sessions|calculations|interpretations)$/i;
/** 이름 규칙에 걸려도 절대 대상이 아닌 것 — 인증·결제 계열. */
const EXCLUDE_NAME = /(token|payment|entitlement|point|order|credit|subscription|refund|ledger)/i;

/** 2026-08 감사 + 2026-09-06 재grep 기준 코드 참조 0. 실행 시 다시 검증한다. */
const ORPHAN_COLLECTIONS = [
  "premium_report_jobs",
  "premiumpdfreports",
  "premium_runtime_store",
  "honeysubscriptions",
  "fortune_tea_honey_reward_logs",
  "fortune_tea_honey_states",
  "translationusages",
  "oauthHandoffCache",
  "translationcaches",
  "honeysubscriptiontransactions",
  "membershipcontentaccessconsents",
  "fusionFortuneDailyLimits",
  // 2026-09-06 모델 삭제(읽는 코드 0·문서 0) — 컬렉션만 남았다.
  "guardianFortuneDailyUsages",
];

function argValue(name, fallback = "") {
  const at = process.argv.indexOf(name);
  if (at < 0 || at + 1 >= process.argv.length) return fallback;
  return process.argv[at + 1];
}

/** 등록 모델 → 삭제 대상 모델 목록. 이름 규칙 + userId(String|ObjectId). picked 항목은 { model, userIdType }. */
export function discoverReportModels(models) {
  const picked = [];
  const skipped = [];
  for (const model of models) {
    const name = model.collection.name;
    const userIdPath = model.schema.path("userId");
    const userIdType = userIdPath ? userIdPath.instance : "";
    if (!REPORT_NAME.test(name)) continue;
    if (EXCLUDE_NAME.test(name)) { skipped.push(`${name} (제외 규칙)`); continue; }
    if (userIdType !== "String" && userIdType !== "ObjectId") { skipped.push(`${name} (userId 타입 ${userIdType || "없음"})`); continue; }
    picked.push({ model, userIdType });
  }
  return { picked, skipped };
}

/** 모델의 userId 타입에 맞는 조회값 — String 스키마엔 문자열, ObjectId 스키마엔 ObjectId 그대로. */
export function userIdFilterValue(userIdType, objectId) {
  return userIdType === "ObjectId" ? objectId : String(objectId);
}

/** 고아 후보가 정말 코드 참조 0 인가 — 등록 모델 + git grep. 참조가 있으면 사유를 돌려준다. */
export function orphanReferenceReasons(name, { modelCollections, grepHits }) {
  const reasons = [];
  if (modelCollections.includes(name)) reasons.push("등록 모델이 이 컬렉션을 쓴다");
  if (grepHits.length) reasons.push(`소스 참조 ${grepHits.length}건: ${grepHits.slice(0, 3).join(", ")}`);
  return reasons;
}

function gitGrepHits(name, root) {
  try {
    const out = execFileSync(
      "git",
      ["grep", "-l", "-F", "--", name, "worker", "app", "lib", "scripts", `:!scripts/migrations/${OPERATION_ID}.mjs`],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return out.split(/\r?\n/).filter(Boolean);
  } catch (error) {
    if (error?.status === 1) return []; // 매치 없음
    throw error;
  }
}

/** before-image 행: 문서 전체를 남기되 _id 는 문자열로. */
export function toBeforeImageRow(collection, doc) {
  return { collection, ...doc, _id: String(doc?._id || "") };
}

function runSelfTest() {
  const failures = [];
  const ok = (condition, message) => { if (!condition) failures.push(message); };

  const fake = (name, instance) => ({
    collection: { name },
    schema: { path: (p) => (p === "userId" && instance ? { instance } : null) },
  });
  const { picked, skipped } = discoverReportModels([
    fake("ziweiAiConsultations", "String"),
    fake("humanDesignCalculations", "String"),
    fake("fortuneChatSessions", "String"),
    fake("refreshtokensessions", "String"),
    fake("paymentReports", "String"),
    fake("someReports", "ObjectId"),
    fake("noOwnerReports", null),
    fake("users", "String"),
  ]);
  const names = picked.map((p) => p.model.collection.name);
  ok(names.includes("ziweiAiConsultations") && names.includes("humanDesignCalculations") && names.includes("fortuneChatSessions"), "상담·리포트·세션·계산 컬렉션을 고른다");
  ok(!names.includes("refreshtokensessions"), "토큰 세션은 제외 규칙에 걸린다");
  ok(!names.includes("paymentReports"), "결제 계열은 제외 규칙에 걸린다");
  ok(names.includes("someReports") && picked.find((p) => p.model.collection.name === "someReports").userIdType === "ObjectId", "userId 가 ObjectId 여도 타입을 달고 고른다");
  ok(!names.includes("noOwnerReports") && skipped.some((s) => s.startsWith("noOwnerReports")), "userId 가 없으면 건너뛰고 사유를 남긴다");
  ok(!names.includes("users"), "이름 규칙 밖은 대상이 아니다");
  const oid = { toString: () => "0123" };
  ok(userIdFilterValue("ObjectId", oid) === oid && userIdFilterValue("String", oid) === "0123", "조회값은 스키마 타입을 따른다");

  ok(orphanReferenceReasons("x", { modelCollections: ["x"], grepHits: [] }).length === 1, "등록 모델 참조는 이유가 된다");
  ok(orphanReferenceReasons("x", { modelCollections: [], grepHits: ["worker/a.js"] }).length === 1, "소스 참조는 이유가 된다");
  ok(orphanReferenceReasons("x", { modelCollections: [], grepHits: [] }).length === 0, "참조 0 이면 이유 없음");
  ok(!ORPHAN_COLLECTIONS.some((n) => /fortune_tea_house/i.test(n)), "활성 컬렉션 fortune_tea_house_* 가 고아 목록에 섞였다");
  ok(new Set(ORPHAN_COLLECTIONS).size === ORPHAN_COLLECTIONS.length, "고아 목록 중복");

  const row = toBeforeImageRow("c", { _id: { toString: () => "abc" }, a: 1 });
  ok(row._id === "abc" && row.collection === "c" && row.a === 1, "before-image 행 변환");
  ok(!(APPLY && DRY_RUN), "--apply 와 --dry-run 을 함께 주면 쓰기를 하지 않는다");

  const total = 14;
  console.log(`[self-test] 점검 ${total}건 중 ${total - failures.length}건 통과`);
  if (failures.length) {
    for (const failure of failures) console.error(`  FAIL ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log("[self-test] OK");
}

if (SELF_TEST) {
  runSelfTest();
} else {
  await runAgainstDatabase();
}

async function runAgainstDatabase() {
  config({ path: ".env.local", quiet: true });
  config({ path: ".env", quiet: true });

  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { buildMongoEnv, requireMongoUri, writeBeforeImage } = await import("../lib/migration-before-image.mjs");
  const { connectDb, mongoose } = await import("../../worker/lib/db.js");
  const { User } = await import("../../worker/lib/models.js");
  await import("../../worker/lib/app-store-models.js");
  await import("../../worker/lib/feedback-models.js");
  await import("../../worker/lib/review-models.js");

  const env = buildMongoEnv();
  requireMongoUri(env);
  const email = String(argValue("--email", process.env.CD_PREVIEW_TEST_EMAIL || "")).trim().toLowerCase();
  if (!email) {
    console.error("❌ --email <주소> 또는 CD_PREVIEW_TEST_EMAIL 이 필요합니다. 값은 출력하지 않습니다.");
    process.exitCode = 1;
    return;
  }
  const expectRaw = String(argValue("--expect", "any"));
  const expect = expectRaw === "any" ? null : Number(expectRaw);
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

  const models = Object.values(mongoose.models);
  if (models.length < 40) {
    console.error(`❌ 등록 모델이 ${models.length}개뿐 — 모델 파일 로드 실패 의심(fail-closed)`);
    process.exitCode = 1;
    return;
  }
  const { picked, skipped } = discoverReportModels(models);
  if (picked.length < 15) {
    console.error(`❌ 상담·리포트 모델을 ${picked.length}개밖에 못 찾았다(기대 ≥15) — 발견 규칙 회귀 의심(fail-closed)`);
    process.exitCode = 1;
    return;
  }
  const modelCollections = models.map((m) => m.collection.name);

  await connectDb(env);
  try {
    const db = mongoose.connection.db;
    const user = await User.findOne({ email }).select("_id").lean();
    if (!user) {
      console.error("❌ 테스트 계정을 users 에서 찾지 못했다(이메일은 출력하지 않는다).");
      process.exitCode = 1;
      return;
    }
    // ── 1) 대상 계정 결과 현황 ────────────────────────────────────────────
    console.log(`[${OPERATION_ID}] 상담·리포트 모델 ${picked.length}개 발견(건너뜀 ${skipped.length}: ${skipped.join(" · ") || "없음"})`);
    const reportTargets = [];
    let docTotal = 0;
    for (const { model, userIdType } of picked) {
      const filter = { userId: userIdFilterValue(userIdType, user._id) };
      const [count, all] = await Promise.all([model.countDocuments(filter), model.estimatedDocumentCount()]);
      reportTargets.push({ model, filter, count, all });
      docTotal += count;
    }
    console.log("\n== 대상 계정 결과(컬렉션: 계정 건수 / 전체 건수)");
    for (const t of reportTargets) console.log(`  ${t.model.collection.name}: ${t.count} / ${t.all}`);
    console.log(`  합계 ${docTotal}건`);

    // ── 2) 고아 컬렉션 현황 ─────────────────────────────────────────────────
    const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
    const orphanTargets = [];
    let blocked = 0;
    console.log("\n== 고아 컬렉션(코드 참조 0 재검증)");
    for (const name of ORPHAN_COLLECTIONS) {
      const reasons = orphanReferenceReasons(name, { modelCollections, grepHits: gitGrepHits(name, root) });
      if (reasons.length) { blocked += 1; console.log(`  ${name}: 🔴 참조 있음 → 건너뜀 (${reasons.join(" / ")})`); continue; }
      if (!existing.has(name)) { console.log(`  ${name}: 이미 없음`); continue; }
      const count = await db.collection(name).countDocuments();
      orphanTargets.push({ name, count });
      console.log(`  ${name}: ${count}건 → DROP`);
    }

    const pending = docTotal + orphanTargets.length;
    if (blocked) {
      console.error(`\n❌ 고아 후보 ${blocked}개에 참조가 있다 — 목록을 고치기 전에는 실행하지 않는다.`);
      process.exitCode = 1;
      return;
    }
    if (pending === 0) {
      console.log("\n  지울 것이 없다.");
      console.log("RESULT OK");
      return;
    }
    if (CHECK || DRY_RUN || !APPLY) {
      console.log("\n🔍 읽기 전용 — 아무것도 쓰지 않았습니다.");
      console.log(`   지울 것: 문서 ${docTotal}건 + 컬렉션 ${orphanTargets.length}개 = ${pending}`);
      console.log(`   🔴 --apply 전에 백업을 확보하세요: npm run backup:mongo -- --out <레포 밖 경로>`);
      console.log(`   적용: npm run migrate:purge-test-reports -- --apply --expect ${pending}`);
      console.log("RESULT PENDING");
      if (CHECK) process.exitCode = 1;
      return;
    }
    if (expect !== null && pending !== expect) {
      console.error(`\n❌ 기대 ${expect}건과 다릅니다(실제 ${pending}건). 다시 --check 로 확인한 뒤 실행하세요.`);
      process.exitCode = 1;
      return;
    }

    // ── 3) before-image ────────────────────────────────────────────────────
    const rows = [];
    for (const t of reportTargets) {
      if (!t.count) continue;
      const docs = await t.model.find(t.filter).lean();
      for (const doc of docs) rows.push(toBeforeImageRow(t.model.collection.name, doc));
    }
    for (const t of orphanTargets) {
      const docs = await db.collection(t.name).find({}).toArray();
      for (const doc of docs) rows.push(toBeforeImageRow(t.name, doc));
    }
    const imagePath = writeBeforeImage(OPERATION_ID, rows, {
      why: "테스트 계정의 상담·리포트 결과 + 코드 참조 0 고아 컬렉션",
      testAccountDocs: docTotal,
      orphanCollections: orphanTargets.map((t) => `${t.name}:${t.count}`),
    });
    console.log(`\n  before-image: ${imagePath}`);
    console.log("  🔴 개인정보가 포함됩니다. backups/ 아래에 두고 검증 후 파기하세요.");

    // ── 4) 삭제 ────────────────────────────────────────────────────────────
    let deleted = 0;
    for (const t of reportTargets) {
      if (!t.count) continue;
      const ids = (await t.model.find(t.filter).select("_id").lean()).map((d) => d._id);
      for (let offset = 0; offset < ids.length; offset += BATCH_SIZE) {
        const result = await t.model.deleteMany({ _id: { $in: ids.slice(offset, offset + BATCH_SIZE) } });
        deleted += Number(result?.deletedCount || 0);
      }
      console.log(`  ${t.model.collection.name}: 삭제 누적 ${deleted}`);
    }
    let dropped = 0;
    for (const t of orphanTargets) {
      await db.collection(t.name).drop();
      dropped += 1;
      console.log(`  drop ${t.name}`);
    }

    // ── 5) 자체 검증 ───────────────────────────────────────────────────────
    let remaining = 0;
    for (const t of reportTargets) remaining += await t.model.countDocuments(t.filter);
    const after = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
    const stillThere = orphanTargets.filter((t) => after.has(t.name)).map((t) => t.name);
    console.log(`\n  검증: 문서 잔여 ${remaining}건 · 남은 고아 컬렉션 ${stillThere.length}개 (둘 다 0 기대)`);
    if (remaining !== 0 || stillThere.length !== 0 || deleted !== docTotal || dropped !== orphanTargets.length) {
      console.error("❌ 예상과 다릅니다 — before-image 로 되돌릴 수 있습니다.");
      process.exitCode = 1;
      return;
    }
    console.log("RESULT OK");
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }
}

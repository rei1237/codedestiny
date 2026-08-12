/**
 * MongoDB 마이그레이션 — recentConsumeRequestIds 상한 초과 문서 절단
 *
 * 배경: 상한은 RECENT_CONSUME_REQUEST_ID_CAP(=200, worker/lib/models.js)인데 2026-08 감사에서
 * 224개짜리 문서가 발견됐다. 조사 결과 **현재 쓰기 경로에는 문제가 없다** — 5곳 전부
 * `$push … $slice:-200`(또는 집계 파이프라인 $slice)을 쓰고 `$addToSet` 은 0건이다.
 * 원인은 커밋 196d11c74(2026-07-16) 이전의 `$addToSet`(상한을 걸 수 없다) 잔재다.
 *
 * 즉 다음 결제·이용권 통과 때 자동으로 200으로 잘린다. 그래도 지금 자르는 이유는,
 * 그때까지 결제 핫패스(applyLotDeduction)가 매 재시도마다 초과분을 통째로 읽기 때문이다.
 *
 * 🔴 "길이 > 200" 자체가 증거다: `$push … $slice:-200` 은 append 후 마지막 200개만 남기므로
 * 결과가 **정확히 200**이다. 길이가 그보다 크다는 것은 그 문서에 상한 있는 쓰기가 한 번도
 * 일어나지 않았다는 뜻이다. updatedAt 은 문서 단위 타임스탬프라 다른 필드 변경으로도 갱신되므로
 * 쓰기 경로 판정 근거가 되지 못한다(참고 정보로만 출력한다).
 *
 * 🔴 절단이 원인을 가리지는 않는다: 상한 없는 쓰기 경로가 실제로 있다면 배열이 다시 자란다.
 * 그래서 --apply 뒤 며칠 지나 `--check` 를 한 번 더 돌리는 것이 진짜 탐지 수단이다.
 *
 * 실행:
 *   node scripts/migrations/20260812-truncate-consume-request-ids.mjs           # dry-run
 *   node scripts/migrations/20260812-truncate-consume-request-ids.mjs --apply
 *   node scripts/migrations/20260812-truncate-consume-request-ids.mjs --check
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { RECENT_CONSUME_REQUEST_ID_CAP, User } from "../../worker/lib/models.js";
import { buildMongoEnv, requireMongoUri, writeBeforeImage } from "../lib/migration-before-image.mjs";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const APPLY = process.argv.includes("--apply");
const CHECK = process.argv.includes("--check");

const OPERATION_ID = "20260812-truncate-consume-request-ids";

const env = buildMongoEnv();
requireMongoUri(env);

async function main() {
  console.log("🔌 MongoDB 연결 중...");
  await connectDb(env);
  console.log(`✅ 연결 완료 (상한 ${RECENT_CONSUME_REQUEST_ID_CAP})\n`);

  const rows = await User.collection
    .find(
      { [`recentConsumeRequestIds.${RECENT_CONSUME_REQUEST_ID_CAP}`]: { $exists: true } },
      { projection: { _id: 1, recentConsumeRequestIds: 1, updatedAt: 1 } },
    )
    .toArray();

  console.log(`📊 상한 초과 문서 ${rows.length}건`);
  for (const row of rows) {
    const length = Array.isArray(row.recentConsumeRequestIds) ? row.recentConsumeRequestIds.length : 0;
    // updatedAt 은 문서 단위라 로그인·프로필 변경으로도 갱신된다. 배열 쓰기 시각이 아니다.
    const updatedAt = row.updatedAt ? new Date(row.updatedAt).toISOString() : "(없음)";
    console.log(`   · ${String(row._id)}  길이 ${length}  문서 updatedAt ${updatedAt}(참고)`);
  }

  if (CHECK) {
    console.log(rows.length ? "\n❌ 상한 초과 문서가 있습니다." : "\n✅ 상한 초과 문서 없음");
    process.exitCode = rows.length ? 1 : 0;
    return;
  }

  if (!rows.length) {
    console.log("\n✅ 자를 것이 없습니다.");
    return;
  }

  console.log(
    `\n📌 길이가 ${RECENT_CONSUME_REQUEST_ID_CAP} 를 넘는다는 것은 이 문서들에 상한 있는 쓰기가` +
    "\n   한 번도 일어나지 않았다는 뜻입니다($push+$slice 는 결과를 정확히 상한으로 만든다)." +
    "\n   과거 $addToSet 시절의 잔재이며, 절단은 다음 결제 때 일어날 일을 앞당기는 것뿐입니다.",
  );

  if (!APPLY) {
    console.log("\n🔍 DRY-RUN — 아무것도 쓰지 않았습니다. 적용하려면 --apply 를 붙이세요.");
    return;
  }

  const beforeFile = writeBeforeImage(
    OPERATION_ID,
    rows.map((row) => ({
      _id: String(row._id),
      recentConsumeRequestIds: row.recentConsumeRequestIds,
    })),
    { cap: RECENT_CONSUME_REQUEST_ID_CAP, count: rows.length },
  );
  console.log(`\n💾 변경 전 이미지 기록: ${beforeFile}`);

  let truncated = 0;
  for (const row of rows) {
    const list = Array.isArray(row.recentConsumeRequestIds) ? row.recentConsumeRequestIds : [];
    // 런타임의 $slice:-N 과 같은 규칙 — 최신 N개만 남긴다.
    const kept = list.slice(-RECENT_CONSUME_REQUEST_ID_CAP);
    const result = await User.collection.updateOne(
      { _id: row._id, [`recentConsumeRequestIds.${RECENT_CONSUME_REQUEST_ID_CAP}`]: { $exists: true } },
      { $set: { recentConsumeRequestIds: kept } },
    );
    if (result.modifiedCount === 1) truncated += 1;
    else console.warn(`   ⚠️  건너뜀(그 사이 배열 변경): ${String(row._id)}`);
  }

  console.log(`\n✅ 적용 완료 — ${truncated}건 절단`);
  const left = await User.collection.countDocuments({
    [`recentConsumeRequestIds.${RECENT_CONSUME_REQUEST_ID_CAP}`]: { $exists: true },
  });
  console.log(`   검증: 상한 초과 문서 ${left}건 (0 기대)`);
  if (left !== 0) process.exitCode = 1;
  console.log(
    "\n🔎 며칠 뒤 `npm run verify:truncate-consume-ids` 를 한 번 더 돌리세요." +
    "\n   다시 상한을 넘었다면 상한 없는 쓰기 경로가 실제로 존재한다는 뜻입니다" +
    "\n   (User.collection.* 네이티브 드라이버 경유 쓰기부터 확인).",
  );
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

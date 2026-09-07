/**
 * 운명의 찻집 상담이 왜 폴백(degrade)으로 떨어지는지 조회 — 읽기 전용(쓰기 0건, LLM 호출 0건).
 *
 * `saveFortuneTeaHouseResult` 가 `fortune_tea_house_results` 에 `generationMeta`
 * ({ mode, reason, degraded })를 그대로 저장한다. 그래서 degrade 사유는 추정할 필요가 없고
 * 저장된 값을 세기만 하면 된다 — 이 스크립트가 하는 일의 전부다.
 *
 * mode 의 의미(worker/routes/fortune-tea-house.js generateConsultResult):
 *   gemini          품질 게이트 통과
 *   gemini_degraded LLM 응답은 있었지만 품질 게이트를 못 넘겨 그대로 전달
 *   local_fallback  LLM 출력이 없어 결정론 초안이 그대로 전달
 *
 * 🔴 스테이징 DB 에만 돌린다. 접속 문자열은 실행 시 환경변수로 주입하고 출력하지 않는다.
 *
 * 실행:
 *   MONGO_URI="<스테이징 URI>" node scripts/query-tea-house-degrade-reasons.mjs [--days 30] [--limit 20] [--json]
 *
 * 종료코드: 항상 0 (조회 전용 — 게이트가 아니다)
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";

config({ path: ".env.local" });
config({ path: ".env" });

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

const DAYS = Math.max(1, Math.floor(Number(argValue("--days", 30))) || 30);
const REASON_LIMIT = Math.max(1, Math.floor(Number(argValue("--limit", 20))) || 20);
const AS_JSON = process.argv.includes("--json");

const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
};

if (!env.MONGO_URI) {
  console.error("❌ MONGO_URI 또는 MONGODB_URI 환경변수가 필요합니다(스테이징 URI 를 주입하세요).");
  process.exit(1);
}

async function main() {
  await connectDb(env);
  const results = mongoose.connection.db.collection("fortune_tea_house_results");
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const match = { status: "completed", createdAt: { $gte: since } };

  const byMode = await results.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          consultationMode: "$consultationMode",
          mode: { $ifNull: ["$generationMeta.mode", "(없음)"] },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]).toArray();

  const byReason = await results.aggregate([
    { $match: { ...match, "generationMeta.degraded": true } },
    {
      $group: {
        _id: {
          consultationMode: "$consultationMode",
          reason: { $ifNull: ["$generationMeta.reason", "(없음)"] },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: REASON_LIMIT },
  ]).toArray();

  const total = byMode.reduce((sum, row) => sum + row.count, 0);
  const degraded = byMode
    .filter((row) => row._id.mode !== "gemini")
    .reduce((sum, row) => sum + row.count, 0);

  const report = {
    windowDays: DAYS,
    totalCompleted: total,
    degradedCount: degraded,
    degradedRatio: total ? Number((degraded / total).toFixed(4)) : 0,
    byMode: byMode.map((row) => ({
      consultationMode: row._id.consultationMode || "(없음)",
      mode: row._id.mode,
      count: row.count,
    })),
    byReason: byReason.map((row) => ({
      consultationMode: row._id.consultationMode || "(없음)",
      reason: row._id.reason,
      count: row.count,
    })),
  };

  if (AS_JSON) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`\n운명의 찻집 상담 생성 결과 — 최근 ${DAYS}일 (읽기 전용)`);
  console.log(`총 완료 ${report.totalCompleted}건 · degrade ${report.degradedCount}건 (${(report.degradedRatio * 100).toFixed(1)}%)\n`);
  console.log("[모드별 분포]");
  for (const row of report.byMode) {
    console.log(`  ${row.consultationMode.padEnd(18)} ${row.mode.padEnd(18)} ${row.count}`);
  }
  console.log("\n[degrade 사유]");
  if (!report.byReason.length) console.log("  (degrade 없음)");
  for (const row of report.byReason) {
    console.log(`  ${row.consultationMode.padEnd(18)} ${String(row.count).padStart(5)}  ${row.reason}`);
  }
  console.log("");
}

main()
  .catch((error) => {
    console.error("❌ 조회 실패:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

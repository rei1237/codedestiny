#!/usr/bin/env node

/*
 * 지연차감(deferUsage) 미정산 감사 — **읽기 전용**. 아무것도 쓰지 않는다.
 *
 * 왜: 구 coin-gate 의 지연차감은 "먼저 열어주고(pre_usage) 나중에 정산(/deferred/apply)"이다.
 * M0 에서 정산이 실패하면 차감 없이 콘텐츠가 열린 채로 남는다 — 사용자가 보고한
 * "결제 안 하고도 게이트를 통과했다"의 구조적 원인이다(2026-08-12 감사).
 * V2 컷오버(월정석·이용권)는 즉시 차감이라 이 누수가 닫히지만, **그동안 쌓인 미정산 건**의
 * 규모는 따로 세어 봐야 안다. 이 스크립트가 그 집계를 한다.
 *
 * 세는 것: PaidExecutionRecord 중
 *   · status = "paid_pending_generation" (정산 전 상태로 남은 것)
 *   · result.deferredUsage.source = "pre_usage" (검증된 결제 증빙 없이 먼저 열어준 건)
 * 회수·정산은 하지 않는다 — 사람이 판단할 자료를 만드는 것까지가 이 스크립트의 일이다.
 *
 * 실행: node scripts/audit-deferred-usage-leak.mjs [--days 30] [--limit 20]
 */
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";
import { PaidExecutionRecord } from "../worker/lib/models.js";

const root = process.cwd();
for (const name of [".env.cloudflare.local", ".env.local", ".env"]) {
  const file = path.join(root, name);
  if (fs.existsSync(file)) dotenv.config({ path: file, override: false, quiet: true });
}

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const days = Math.max(1, Number(arg("days", "30")) || 30);
const limit = Math.max(1, Number(arg("limit", "20")) || 20);
const since = new Date(Date.now() - days * 86_400_000);

async function main() {
  await connectDb(process.env);
  const filter = {
    status: "paid_pending_generation",
    "result.deferredUsage.source": "pre_usage",
    createdAt: { $gte: since },
  };

  const rows = await PaidExecutionRecord.find(filter)
    .select("executionId requestId userId featureId profileId amountCoins amountKRW monthlyDeductedAmount createdAt result.deferredUsage.paymentMethod")
    .sort({ createdAt: -1 })
    .lean();

  if (!rows.length) {
    console.log(`[deferred-audit] 최근 ${days}일 미정산 선지급 건: 0건 — 누수 없음.`);
    return;
  }

  const byMethod = new Map();
  let totalKRW = 0;
  let totalCoins = 0;
  let totalMonthly = 0;
  for (const row of rows) {
    const method = String(row?.result?.deferredUsage?.paymentMethod || "UNKNOWN");
    const entry = byMethod.get(method) || { count: 0, coins: 0, krw: 0, monthly: 0 };
    entry.count += 1;
    entry.coins += Number(row.amountCoins || 0);
    entry.krw += Number(row.amountKRW || 0);
    entry.monthly += Number(row.monthlyDeductedAmount || 0);
    byMethod.set(method, entry);
    totalCoins += Number(row.amountCoins || 0);
    totalKRW += Number(row.amountKRW || 0);
    totalMonthly += Number(row.monthlyDeductedAmount || 0);
  }

  console.log(`[deferred-audit] 최근 ${days}일 미정산 선지급(pre_usage) ${rows.length}건`);
  console.log(`  합계: ${totalCoins} 코인 · ${totalKRW.toLocaleString()}원 · 월정석 ${totalMonthly}`);
  console.log("  결제수단별:");
  for (const [method, entry] of byMethod) {
    console.log(`    ${method}: ${entry.count}건 · ${entry.coins}코인 · ${entry.krw.toLocaleString()}원 · 월정석 ${entry.monthly}`);
  }
  const uniqueUsers = new Set(rows.map((row) => String(row.userId || ""))).size;
  console.log(`  영향 사용자: ${uniqueUsers}명`);
  console.log(`\n  최근 ${Math.min(limit, rows.length)}건:`);
  for (const row of rows.slice(0, limit)) {
    console.log(`    ${new Date(row.createdAt).toISOString()} ${String(row.featureId || "").padEnd(28)} ${String(row?.result?.deferredUsage?.paymentMethod || "?").padEnd(8)} ${row.amountCoins || 0}코인 exec=${row.executionId}`);
  }
  console.log("\n  ※ 이 스크립트는 아무것도 쓰지 않습니다. 회수·정산은 별도 판단이 필요합니다.");
}

main()
  .catch((error) => {
    console.error("[deferred-audit] 실행 오류:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await mongoose.disconnect(); } catch { /* 종료 경로 */ }
  });

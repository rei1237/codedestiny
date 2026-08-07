/**
 * MongoDB migration — 폐지된 상담 전용 재화 컬렉션 드롭.
 *
 * 연이 운명 상담의 "대화권"과 초융합 상담의 "상담권"은 표준 회당 결제로 대체됐다
 * (fortune-chat-consultation 50코인 / fusion-fortune-consultation 300코인).
 * 소비 코드가 모두 제거됐으므로 이 네 컬렉션은 더 이상 읽히거나 쓰이지 않는다.
 *
 * 🔴 드롭 전에 **잔액이 남은 문서를 JSON 으로 덤프**한다. 잔액 보유자에게 보상을 지급할지는
 *    별도 판단이지만, 근거가 사라지면 그 판단 자체를 할 수 없다. 덤프 없이는 드롭하지 않는다.
 *
 * 이 스크립트는 빌드·배포가 부르지 않는다. 기본은 --dry-run 이고, 실제 드롭은 --apply 가
 * 있어야만 실행된다. 프로덕션 실행은 사용자 승인을 받은 뒤 수동으로 한다.
 *
 * 사용:
 *   node scripts/migrations/20260808-drop-legacy-consultation-currencies.mjs            # 미리보기(기본)
 *   node scripts/migrations/20260808-drop-legacy-consultation-currencies.mjs --apply    # 덤프 후 드롭
 *   node scripts/migrations/20260808-drop-legacy-consultation-currencies.mjs --apply --out ./backups
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";

config({ path: ".env.local" });
config({ path: ".env" });

const APPLY = process.argv.includes("--apply");
const outFlagIndex = process.argv.indexOf("--out");
const OUT_DIR = resolve(outFlagIndex >= 0 ? process.argv[outFlagIndex + 1] || "." : "./migration-backups");

const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || process.env.DB_NAME || "",
  MONGO_SERVER_SELECTION_TIMEOUT_MS: "10000",
  MONGO_CONNECT_TIMEOUT_MS: "10000",
  MONGO_SOCKET_TIMEOUT_MS: "45000",
  MONGO_WORKER_CONNECT_GUARD_MS: "15000",
  MONGO_MAX_POOL_SIZE: "5",
  MONGO_IP_FAMILY: process.env.MONGO_IP_FAMILY || "4",
  MONGO_IP_FAMILY_AUTO_FALLBACK: "true",
};

if (!env.MONGO_URI && !env.MONGODB_URI) {
  console.error("MONGO_URI or MONGODB_URI is required.");
  process.exit(1);
}

/** 잔액 컬렉션은 필드명이 서로 다르다 — 덤프 판정에 쓸 필드를 각각 지정한다. */
const COLLECTIONS = [
  { name: "guardianFortuneChatCreditBalances", balanceFields: ["remaining", "reserved"] },
  { name: "guardianFortuneChatCreditTransactions", balanceFields: [] },
  { name: "fusionFortuneTicketBalances", balanceFields: ["totalRemaining", "reserved"] },
  { name: "fusionFortuneTicketTransactions", balanceFields: [] },
];

function stamp() {
  // 파일명 충돌만 피하면 되므로 초 단위까지만 쓴다.
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

async function run() {
  await connectDb(env);
  const db = mongoose.connection.db;
  const existing = new Set((await db.listCollections().toArray()).map((item) => item.name));
  const report = [];

  for (const target of COLLECTIONS) {
    if (!existing.has(target.name)) {
      console.log(`SKIP    ${target.name} — 컬렉션이 없습니다.`);
      report.push({ collection: target.name, present: false, documents: 0, withBalance: 0, dropped: false });
      continue;
    }
    const collection = db.collection(target.name);
    const documents = await collection.countDocuments();
    const balanceQuery = target.balanceFields.length
      ? { $or: target.balanceFields.map((field) => ({ [field]: { $gt: 0 } })) }
      : null;
    const withBalance = balanceQuery ? await collection.countDocuments(balanceQuery) : 0;

    if (!APPLY) {
      console.log(`DRY-RUN ${target.name} — 문서 ${documents}건, 잔액 보유 ${withBalance}건 (드롭하지 않음)`);
      report.push({ collection: target.name, present: true, documents, withBalance, dropped: false });
      continue;
    }

    if (balanceQuery && withBalance > 0) {
      const rows = await collection.find(balanceQuery).toArray();
      const file = join(OUT_DIR, `${stamp()}-${target.name}.json`);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
      console.log(`DUMP    ${target.name} — 잔액 보유 ${rows.length}건 → ${file}`);
    }

    await collection.drop();
    console.log(`DROP    ${target.name} — 문서 ${documents}건 제거`);
    report.push({ collection: target.name, present: true, documents, withBalance, dropped: true });
  }

  console.log(`\n${APPLY ? "적용 완료" : "미리보기(기본). 실제 드롭은 --apply 가 필요합니다."}`);
  console.table(report);
}

run()
  .catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });

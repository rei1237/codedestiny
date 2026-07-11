/**
 * 월정석(membershipCredit) 대량 지급 계정 조회 — 읽기 전용(쓰기 없음).
 *
 * 누적 지급량(profileSubscription.membershipCreditGranted)이 임계값 이상인 계정을
 * 지급량 내림차순으로 나열한다.
 *
 * 실행:
 *   node scripts/query-monthly-credit-heavy-grants.mjs [--min 10000] [--limit 200] [--json]
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";
import { User } from "../worker/lib/models.js";
import { sumActiveBalance } from "../worker/lib/monthly-credit-lots.js";

config({ path: ".env.local" });
config({ path: ".env" });

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

const MIN_GRANTED = Math.max(0, Math.floor(Number(argValue("--min", 10000))) || 0);
const LIMIT = Math.max(1, Math.floor(Number(argValue("--limit", 200))) || 200);
const AS_JSON = process.argv.includes("--json");

const env = {
  ...process.env,
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGO_IP_FAMILY: process.env.MONGO_IP_FAMILY || "4",
};

if (!env.MONGO_URI && !process.env.MONGODB_URI) {
  console.error("❌ MONGO_URI 또는 MONGODB_URI 환경변수가 필요합니다.");
  process.exit(1);
}

function n(v) {
  return Math.floor(Number(v || 0));
}

async function main() {
  console.log("🔌 MongoDB 연결 중...");
  await connectDb(env);
  console.log("✅ MongoDB 연결 완료\n");

  const filter = { "profileSubscription.membershipCreditGranted": { $gte: MIN_GRANTED } };
  const total = await User.collection.countDocuments(filter);

  const rows = await User.collection
    .find(filter, {
      projection: {
        email: 1,
        name: 1,
        joinedAt: 1,
        "profileSubscription.membershipCreditGranted": 1,
        "profileSubscription.membershipCreditBalance": 1,
        "profileSubscription.membershipCreditUsed": 1,
        "profileSubscription.membershipCreditLots": 1,
      },
    })
    .sort({ "profileSubscription.membershipCreditGranted": -1 })
    .limit(LIMIT)
    .toArray();

  const now = Date.now();
  const list = rows.map((u) => {
    const sub = u.profileSubscription || {};
    const lots = Array.isArray(sub.membershipCreditLots) ? sub.membershipCreditLots : [];
    const activeBalance = lots.length ? sumActiveBalance(lots, now) : n(sub.membershipCreditBalance);
    let nextExpiry = null;
    for (const lot of lots) {
      const exp = lot?.expiresAt ? new Date(lot.expiresAt).getTime() : 0;
      const rem = n(lot?.remaining);
      if (rem > 0 && exp > now && (nextExpiry === null || exp < nextExpiry)) nextExpiry = exp;
    }
    return {
      email: u.email || "(no-email)",
      name: u.name || "",
      granted: n(sub.membershipCreditGranted),
      balanceStored: n(sub.membershipCreditBalance),
      balanceActive: activeBalance,
      used: n(sub.membershipCreditUsed),
      lots: lots.length,
      nextExpiry: nextExpiry ? new Date(nextExpiry).toISOString().slice(0, 10) : "-",
    };
  });

  if (AS_JSON) {
    console.log(JSON.stringify({ min: MIN_GRANTED, total, shown: list.length, accounts: list }, null, 2));
    return;
  }

  console.log(`📊 월정석 누적 지급량 ${MIN_GRANTED.toLocaleString()} 이상: 총 ${total}명 (상위 ${list.length}명 표시)\n`);
  if (!list.length) {
    console.log("  (해당 계정 없음)");
    return;
  }
  const pad = (s, w) => String(s).padEnd(w);
  const padL = (s, w) => String(s).padStart(w);
  console.log(
    `  ${pad("email", 34)} ${padL("지급", 10)} ${padL("잔액(유효)", 10)} ${padL("사용", 9)} ${padL("lot", 4)}  다음소멸`,
  );
  console.log(`  ${"-".repeat(34)} ${"-".repeat(10)} ${"-".repeat(10)} ${"-".repeat(9)} ${"-".repeat(4)}  ${"-".repeat(10)}`);
  for (const r of list) {
    console.log(
      `  ${pad(r.email.slice(0, 34), 34)} ${padL(r.granted.toLocaleString(), 10)} ${padL(r.balanceActive.toLocaleString(), 10)} ${padL(r.used.toLocaleString(), 9)} ${padL(r.lots, 4)}  ${r.nextExpiry}`,
    );
  }
  const sumGranted = list.reduce((a, r) => a + r.granted, 0);
  console.log(`\n  합계(표시분) 지급 ${sumGranted.toLocaleString()}`);
}

main()
  .catch((err) => {
    console.error("❌ 조회 실패:", err.message);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log("\n🔌 MongoDB 연결 종료");
  });

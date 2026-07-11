#!/usr/bin/env node
/**
 * 월정석 "지급일로부터 정확히 30일 후 소멸" 종단 검증.
 *
 * 두 가지 모드:
 *   1) 오프라인(기본): 실제 lot 회계 + 실제 /api/auth/me 리졸버로 30일 경계·FIFO·회귀를
 *      DB 없이 결정적으로 검증한다. `node scripts/verify-monthly-credit-expiry-flow.mjs`
 *   2) DB 종단(--db): 실제 Mongo에 임시 유저를 만들어 실제 소비(consumeMonthlyCreditLots)·
 *      만료 스윕(sweepExpiredMonthlyCreditForUser)·소멸 원장을 구동하고 검증 후 정리한다.
 *      배포 후 실행 권장. `MONGO_URI=... node scripts/verify-monthly-credit-expiry-flow.mjs --db`
 *
 * 시간 여행은 30일을 실제로 기다리는 대신 lot의 grantedAt/expiresAt을 과거로 세팅해 모사한다.
 */

import assert from "node:assert/strict";
import {
  MONTHLY_CREDIT_TTL_MS,
  applyGrantLot,
  deductLotsFIFO,
  ensureLotsForBalance,
  sumActiveBalance,
  normalizeLots,
} from "../worker/lib/monthly-credit-lots.js";
import { normalizeUserResponse } from "../worker/lib/auth.js";

const DAY = 24 * 60 * 60 * 1000;
let passed = 0;
function it(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => { passed += 1; console.log(`  ✓ ${name}`); })
    .catch((error) => { console.error(`  ✗ ${name}\n    ${error.message}`); throw error; });
}

// ───────────────────────── 오프라인 검증 ─────────────────────────
async function runOffline() {
  console.log("\n[오프라인] 실제 lot 회계 + /me 리졸버로 30일 경계 검증");

  const T0 = 1_700_000_000_000;

  await it("지급 즉시 만료일 = 지급시각 + 정확히 30일", () => {
    const { lot } = applyGrantLot([], { lotId: "g", amount: 500, grantedAt: new Date(T0), now: T0 });
    assert.equal(lot.expiresAt.getTime() - lot.grantedAt.getTime(), 30 * DAY);
    assert.equal(lot.expiresAt.getTime(), T0 + 30 * DAY);
  });

  await it("경계: 30일 되기 1ms 전에는 사용 가능(활성)", () => {
    const lots = applyGrantLot([], { lotId: "g", amount: 500, grantedAt: new Date(T0), now: T0 }).lots;
    const at = T0 + 30 * DAY - 1;
    assert.equal(sumActiveBalance(lots, at), 500);
    const d = deductLotsFIFO(lots, 100, at);
    assert.equal(d.ok, true);
    assert.equal(d.balance, 400);
  });

  await it("경계: 정확히 30일이 되는 순간 소멸(사용 불가)", () => {
    const lots = applyGrantLot([], { lotId: "g", amount: 500, grantedAt: new Date(T0), now: T0 }).lots;
    const at = T0 + 30 * DAY; // 지급 + 정확히 30일
    assert.equal(sumActiveBalance(lots, at), 0, "30일째 유효잔액은 0이어야 한다");
    assert.equal(deductLotsFIFO(lots, 1, at).ok, false, "30일째엔 1도 못 쓴다");
    // 만료분은 스윕 대상으로 분리되되 잔량은 보존(원장 기록 후 크론이 제거)
    const norm = normalizeLots(lots, at);
    assert.equal(norm.expiredBalance, 500);
    assert.equal(norm.expiredLots.length, 1);
  });

  await it("여러 지급분: 각자 자기 지급일 + 30일에 개별 소멸(FIFO)", () => {
    let lots = applyGrantLot([], { lotId: "a", amount: 300, grantedAt: new Date(T0), now: T0 }).lots;
    lots = applyGrantLot(lots, { lotId: "b", amount: 200, grantedAt: new Date(T0 + 15 * DAY), now: T0 + 15 * DAY }).lots;
    // T0+30d: a 소멸, b 유효(200)
    assert.equal(sumActiveBalance(lots, T0 + 30 * DAY), 200);
    // T0+45d: b도 소멸
    assert.equal(sumActiveBalance(lots, T0 + 45 * DAY), 0);
    // 활성 구간(T0+10d)에서 350 쓰면 a(300)부터 소진 후 b에서 50
    const d = deductLotsFIFO(lots, 350, T0 + 10 * DAY);
    assert.deepEqual(d.allocation, [{ lotId: "a", taken: 300 }, { lotId: "b", taken: 50 }]);
  });

  await it("회귀: 부분 사용분의 잔량도 원래 지급일 기준으로 소멸", () => {
    const lots = applyGrantLot([], { lotId: "a", amount: 500, grantedAt: new Date(T0), now: T0 }).lots;
    const afterSpend = deductLotsFIFO(lots, 200, T0 + DAY).lots; // 300 남음, 만료일 불변
    assert.equal(sumActiveBalance(afterSpend, T0 + 30 * DAY - 1), 300);
    assert.equal(sumActiveBalance(afterSpend, T0 + 30 * DAY), 0);
  });

  // ── 실제 /api/auth/me 리졸버(normalizeUserResponse) — 실시간(Date.now) 기준 ──
  const makeUser = (lots) => ({
    _id: "verify-user",
    name: "Verify",
    email: "verify@example.invalid",
    profileSubscription: { membershipCreditBalance: sumActiveBalance(lots, Date.now()), membershipCreditLots: lots },
  });

  await it("리졸버: 방금 지급(만료 30일 뒤) → 유효잔액 노출 + 소멸예정일 표기", () => {
    const now = Date.now();
    const lots = [{ lotId: "g", amount: 500, remaining: 500, grantedAt: new Date(now), expiresAt: new Date(now + 30 * DAY) }];
    const res = normalizeUserResponse(makeUser(lots));
    assert.equal(res.profileSubscription.monthlyStoneBalance, 500);
    assert.equal(res.profileSubscription.membershipCreditBalance, 500);
    assert.ok(res.profileSubscription.monthlyStoneExpiresAt, "소멸 예정일이 있어야 한다");
    const iso = new Date(res.profileSubscription.monthlyStoneExpiresAt).getTime();
    assert.ok(Math.abs(iso - (now + 30 * DAY)) < 5000);
  });

  await it("리졸버: 지급 29일 경과(아직 유효) → 유효잔액 그대로", () => {
    const now = Date.now();
    const lots = [{ lotId: "g", amount: 500, remaining: 500, grantedAt: new Date(now - 29 * DAY), expiresAt: new Date(now + DAY) }];
    const res = normalizeUserResponse(makeUser(lots));
    assert.equal(res.profileSubscription.monthlyStoneBalance, 500);
  });

  await it("리졸버: 지급 30일 경과(소멸) → 유효잔액 0 + 소멸예정일 null", () => {
    const now = Date.now();
    const lots = [{ lotId: "g", amount: 500, remaining: 500, grantedAt: new Date(now - 30 * DAY), expiresAt: new Date(now - 1000) }];
    const res = normalizeUserResponse(makeUser(lots));
    assert.equal(res.profileSubscription.monthlyStoneBalance, 0, "만료분은 /me에서 0으로 보여야 한다");
    assert.equal(res.profileSubscription.monthlyStoneExpiresAt, null);
  });

  await it("리졸버: 지연 백필(잔액만 있고 lot 없음) → 유효잔액 유지, 30일 창 부여", () => {
    const res = normalizeUserResponse({
      _id: "u", name: "Verify", email: "v@example.invalid",
      profileSubscription: { membershipCreditBalance: 250, membershipCreditLots: [] },
    });
    assert.equal(res.profileSubscription.monthlyStoneBalance, 250);
    assert.ok(res.profileSubscription.monthlyStoneExpiresAt);
  });
}

// ───────────────────────── DB 종단 검증(--db) ─────────────────────────
async function runDb() {
  console.log("\n[DB 종단] 실제 Mongo에서 소비·만료 스윕·소멸 원장 구동");
  const { config } = await import("dotenv");
  config({ path: ".env.local" });
  config({ path: ".env" });

  const env = {
    MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
    MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
    MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || process.env.DB_NAME || "",
    MONGO_SERVER_SELECTION_TIMEOUT_MS: process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || "10000",
    MONGO_CONNECT_TIMEOUT_MS: process.env.MONGO_CONNECT_TIMEOUT_MS || "10000",
    MONGO_SOCKET_TIMEOUT_MS: process.env.MONGO_SOCKET_TIMEOUT_MS || "45000",
    MONGO_WORKER_CONNECT_GUARD_MS: process.env.MONGO_WORKER_CONNECT_GUARD_MS || "15000",
    MONGO_MAX_POOL_SIZE: process.env.MONGO_MAX_POOL_SIZE || "5",
    MONGO_IP_FAMILY: process.env.MONGO_IP_FAMILY || "4",
    MONGO_IP_FAMILY_AUTO_FALLBACK: process.env.MONGO_IP_FAMILY_AUTO_FALLBACK || "true",
  };
  if (!env.MONGO_URI && !env.MONGODB_URI) {
    console.error("❌ --db 모드는 MONGO_URI(또는 MONGODB_URI)가 필요합니다.");
    process.exit(1);
  }

  const { connectDb, mongoose } = await import("../worker/lib/db.js");
  const { User, MonthlyCreditLedger } = await import("../worker/lib/models.js");
  const { consumeMonthlyCreditLots } = await import("../worker/lib/monthly-credit-store.js");
  const { sweepExpiredMonthlyCreditForUser } = await import("../worker/lib/monthly-credit-expiry-task.js");

  await connectDb(env);
  const stamp = Date.now();
  const email = `mc-lot-verify-${stamp}@example.invalid`;
  let userId = null;

  const seedLots = async (lots) => {
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          "profileSubscription.membershipCreditLots": lots,
          "profileSubscription.membershipCreditBalance": lots.reduce((s, l) => s + (l.remaining || 0), 0),
        },
        $inc: { "profileSubscription.membershipCreditLotsVersion": 1 },
      },
    );
  };

  try {
    const created = await User.create({
      name: "MC Lot Verify",
      email,
      profileSubscription: { membershipCreditBalance: 0, membershipCreditGranted: 0, membershipCreditUsed: 0, membershipCreditLots: [], membershipCreditLotsVersion: 0 },
    });
    userId = created._id;
    console.log(`  · 임시 유저 생성: ${email}`);

    const now = Date.now();
    // 1) 방금 지급된 lot(만료 30일 뒤) — 활성 소비 성공
    await seedLots([{ lotId: "e2e-a", amount: 500, remaining: 500, grantedAt: new Date(now), expiresAt: new Date(now + 30 * DAY) }]);
    await it("활성 lot 소비 성공(500→400)", async () => {
      const r = await consumeMonthlyCreditLots({ userId, amount: 100 });
      assert.equal(r.ok, true);
      assert.equal(r.balance, 400);
    });

    // 2) 30일 경과 모사: 남은 lot을 과거 만료로 세팅 → 소비 차단
    await it("만료된 lot은 소비 불가(INSUFFICIENT)", async () => {
      const u = await User.findById(userId).lean();
      const lots = (u.profileSubscription.membershipCreditLots || []).map((l) => ({
        ...l, grantedAt: new Date(now - 31 * DAY), expiresAt: new Date(now - 1000),
      }));
      await seedLots(lots);
      const r = await consumeMonthlyCreditLots({ userId, amount: 50 });
      assert.equal(r.ok, false);
      assert.equal(r.reason, "INSUFFICIENT");
    });

    // 3) 크론 스윕: 만료 lot 제거 + 소멸 원장 기록
    await it("만료 스윕: lot 제거·잔액 0·MONTHLY_CREDIT_EXPIRE 원장 기록", async () => {
      const doc = await User.findById(userId).select("profileSubscription.membershipCreditLots profileSubscription.membershipCreditLotsVersion").lean();
      const res = await sweepExpiredMonthlyCreditForUser(doc, new Date());
      assert.equal(res.changed, true);
      assert.equal(res.expiredAmount, 400);
      const after = await User.findById(userId).lean();
      assert.equal(sumActiveBalanceRemaining(after.profileSubscription.membershipCreditLots), 0);
      assert.equal(Number(after.profileSubscription.membershipCreditBalance || 0), 0);
      const ledger = await MonthlyCreditLedger.findOne({ userId, type: "MONTHLY_CREDIT_EXPIRE" }).lean();
      assert.ok(ledger, "소멸 원장이 있어야 한다");
      assert.equal(Number(ledger.amount), 400);
    });

    // 4) FIFO: 만료 lot과 활성 lot 공존 시 활성분만 사용, 만료분은 스윕
    await it("FIFO+만료 혼재: 활성분만 소비되고 만료분은 소멸", async () => {
      const now2 = Date.now();
      await seedLots([
        { lotId: "e2e-old", amount: 200, remaining: 200, grantedAt: new Date(now2 - 40 * DAY), expiresAt: new Date(now2 - 10 * DAY) },
        { lotId: "e2e-new", amount: 300, remaining: 300, grantedAt: new Date(now2), expiresAt: new Date(now2 + 30 * DAY) },
      ]);
      const r = await consumeMonthlyCreditLots({ userId, amount: 300 });
      assert.equal(r.ok, true, "활성 300으로 300 사용 가능");
      assert.equal(r.balance, 0);
      const doc = await User.findById(userId).select("profileSubscription.membershipCreditLots profileSubscription.membershipCreditLotsVersion").lean();
      const res = await sweepExpiredMonthlyCreditForUser(doc, new Date());
      assert.equal(res.expiredAmount, 200, "만료 old lot 200이 소멸");
    });

    console.log("  · DB 종단 검증 통과");
  } finally {
    if (userId) {
      await User.deleteOne({ _id: userId }).catch(() => {});
      await MonthlyCreditLedger.deleteMany({ userId }).catch(() => {});
      console.log("  · 임시 유저/원장 정리 완료");
    }
    await mongoose.disconnect().catch(() => {});
  }
}

function sumActiveBalanceRemaining(lots) {
  return normalizeLots(lots, Date.now()).activeBalance;
}

async function main() {
  console.log("월정석 '지급일 + 정확히 30일 소멸' 검증");
  await runOffline();
  if (process.argv.includes("--db")) {
    await runDb();
  } else {
    console.log("\n(DB 종단 검증은 배포 후 `--db` 옵션 + MONGO_URI로 실행하세요.)");
  }
  console.log(`\n✅ 통과: ${passed}개 항목`);
}

main().catch((error) => {
  console.error("\n❌ 검증 실패:", error.message);
  process.exit(1);
});

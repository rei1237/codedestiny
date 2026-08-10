import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

import { connectDb, mongoose } from "../worker/lib/db.js";
import { User } from "../worker/lib/models.js";
import { hashPassword } from "../worker/lib/password.js";
import { applyGrantLot } from "../worker/lib/monthly-credit-lots.js";

const TARGET_EMAIL = "hanyuzu@example.com";
// 🔴 평문 비밀번호를 여기 되돌리지 말 것. 예전에는 "test!1234" 가 그대로 커밋돼 있었고, 이 계정은
// 프로덕션에 실재하므로 리포를 읽을 수 있는 누구나 로그인할 수 있었다. 정본 패턴은
// scripts/seed-preview-test-account.mjs 와 같다 — env 필수, 미설정이면 실행 자체를 거절한다.
const TARGET_PASSWORD = String(process.env.HANYUZU_SEED_PASSWORD || "").trim();
const TARGET_MOON_STONE_BALANCE = 999999;

function loadEnvFiles() {
  for (const fileName of [".env.local", ".env"]) {
    const envPath = path.join(process.cwd(), fileName);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    }
  }
}

function resolveMoonstoneBalance(user) {
  const raw = user?.profileSubscription?.membershipCreditBalance;
  const value = Number(raw ?? 0);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

async function main() {
  loadEnvFiles();

  if (!process.env.MONGO_URI && !process.env.MONGODB_URI && !process.env.DB_URI) {
    throw new Error("No Mongo connection env found.");
  }

  if (TARGET_PASSWORD.length < 12) {
    throw new Error("Set HANYUZU_SEED_PASSWORD in .env.local (minimum 12 characters). It must not be committed.");
  }

  await connectDb({ ...process.env, MONGO_IP_FAMILY: "4" });

  try {
    const passwordHash = await hashPassword(TARGET_PASSWORD);
    const existing = await User.findOne({ email: TARGET_EMAIL }).select("+passwordHash");

    if (!existing) {
      const now = new Date();
      // 월정석은 지급분별(lot) 만료 회계 — 스칼라만 쓰면 크론 스윕이 못 잡아 소멸이 시작조차 안 됨.
      const granted = applyGrantLot([], {
        lotId: `hanyuzu-seed:${now.getTime()}`,
        amount: TARGET_MOON_STONE_BALANCE,
        grantedAt: now,
        now: now.getTime(),
      });
      const created = await User.create({
        email: TARGET_EMAIL,
        name: "hanyuzu",
        birthDate: "1900-01-01",
        birthTime: "00:00",
        gender: "OTHER",
        passwordHash,
        profileSubscription: {
          membershipCreditBalance: granted.balance,
          membershipCreditGranted: TARGET_MOON_STONE_BALANCE,
          membershipCreditLots: granted.lots,
        },
        role: "user",
      });

      console.log("ACTION=created");
      console.log(`월정석 잔액=${TARGET_MOON_STONE_BALANCE}`);
      console.log(`비밀번호=변경`);
      console.log(`RESULT=${JSON.stringify({ email: created.email, userId: String(created._id) })}`);
      return;
    }

    const beforeMoonStone = resolveMoonstoneBalance(existing);
    const needBalanceUpdate = beforeMoonStone !== TARGET_MOON_STONE_BALANCE;

    const now = new Date();
    // 강제 세팅 잔액을 지급분별(lot) 만료 회계로 백킹 — 스칼라만 두면 30일 소멸이 동작하지 않는다.
    const granted = applyGrantLot([], {
      lotId: `hanyuzu-seed:${now.getTime()}`,
      amount: TARGET_MOON_STONE_BALANCE,
      grantedAt: now,
      now: now.getTime(),
    });
    const updatePayload = {
      passwordHash,
      "profileSubscription.membershipCreditBalance": granted.balance,
      "profileSubscription.membershipCreditLots": granted.lots,
    };
    if (needBalanceUpdate) {
      updatePayload["profileSubscription.membershipCreditGranted"] = TARGET_MOON_STONE_BALANCE;
      updatePayload["profileSubscription.membershipCreditUsed"] = 0;
    }

    await User.updateOne({ _id: existing._id }, { $set: updatePayload });

    const updated = await User.findById(existing._id).select("+passwordHash");
    const afterMoonStone = resolveMoonstoneBalance(updated);

    console.log("ACTION=updated");
    console.log(`월정석 잔액=${afterMoonStone}`);
    console.log(`이전 월정석=${beforeMoonStone}`);
    console.log(`비밀번호=변경`);
    console.log(`월정석_변경=${needBalanceUpdate ? "yes" : "no"}`);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

main().catch((error) => {
  console.error("ACTION=failed", error?.message || error);
  process.exitCode = 1;
});

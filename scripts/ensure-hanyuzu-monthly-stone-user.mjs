import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

import { connectDb, mongoose } from "../worker/lib/db.js";
import { User } from "../worker/lib/models.js";
import { hashPassword } from "../worker/lib/password.js";

const TARGET_EMAIL = "hanyuzu@example.com";
const TARGET_PASSWORD = "test!1234";
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

  await connectDb({ ...process.env, MONGO_IP_FAMILY: "4" });

  try {
    const passwordHash = await hashPassword(TARGET_PASSWORD);
    const existing = await User.findOne({ email: TARGET_EMAIL }).select("+passwordHash");

    if (!existing) {
      const created = await User.create({
        email: TARGET_EMAIL,
        name: "hanyuzu",
        birthDate: "1900-01-01",
        birthTime: "00:00",
        gender: "OTHER",
        passwordHash,
        profileSubscription: {
          membershipCreditBalance: TARGET_MOON_STONE_BALANCE,
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

    const updatePayload = {
      passwordHash,
      "profileSubscription.membershipCreditBalance": TARGET_MOON_STONE_BALANCE,
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

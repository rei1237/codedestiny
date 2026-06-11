import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

import { connectDb, mongoose } from "../worker/lib/db.js";
import { PointHistory, User } from "../worker/lib/models.js";

function parseArgs(argv) {
  const values = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    const value = argv[i + 1];
    if (typeof value === "string" && !value.startsWith("--")) {
      values[key.slice(2)] = value;
      i += 1;
    } else {
      values[key.slice(2)] = "true";
    }
  }
  return values;
}

function loadEnvFiles() {
  for (const fileName of [".env.local", ".env"]) {
    const envPath = path.join(process.cwd(), fileName);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    }
  }
}

function enforceGuards({ targetEmail, amount, mode }) {
  if (process.env.ALLOW_ADMID_GRANT !== "true") {
    throw new Error("ALLOW_ADMID_GRANT=true is required.");
  }

  if (!targetEmail) {
    throw new Error("--email is required.");
  }

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("--amount must be a non-negative number.");
  }

  if (!["add", "set"].includes(mode)) {
    throw new Error("--mode must be 'add' or 'set'.");
  }

  if (
    process.env.NODE_ENV === "production"
    && process.env.CONFIRM_ADMID_GRANT !== "CONFIRM"
  ) {
    throw new Error("Production grant requires CONFIRM_ADMID_GRANT=CONFIRM.");
  }
}

async function main() {
  loadEnvFiles();

  const args = parseArgs(process.argv.slice(2));
  const email = String(args.email || "").trim().toLowerCase();
  const rawAmount = Number(args.amount);
  const mode = String(args.mode || "add").trim().toLowerCase();
  const reason = String(args.reason || args.note || "ADMIN Moonlight Stone 지급");
  const requester = String(args.requester || process.env.ADMID_GRANT_REQUESTER || "admin-script");

  enforceGuards({ targetEmail: email, amount: rawAmount, mode });

  await connectDb({ ...process.env, MONGO_IP_FAMILY: "4" });

  try {
    const user = await User.findOne({ email }).lean();
    if (!user) {
      throw new Error(`사용자 없음: ${email}`);
    }

    const beforePoints = Number(user.points || 0);
    const amount = Math.trunc(rawAmount);

    let afterPoints = beforePoints;
    if (mode === "set") {
      afterPoints = amount;
    } else {
      afterPoints = beforePoints + amount;
    }

    const delta = afterPoints - beforePoints;
    if (delta === 0) {
      console.log(`[grant-monthly-coins] no-op (before=${beforePoints}, after=${afterPoints})`);
      return;
    }

    if (args.dryRun) {
      console.log(`[grant-monthly-coins][dry-run] ${email} before=${beforePoints} after=${afterPoints} delta=${delta}`);
      return;
    }

    const updated = await User.findByIdAndUpdate(
      user._id,
      { $set: { points: afterPoints } },
      { returnDocument: "after", projection: { points: 1 } },
    ).lean();

    if (!updated) {
      throw new Error("사용자 포인트 업데이트 실패.");
    }

    const history = await PointHistory.create({
      userId: user._id,
      kind: "adjust",
      delta,
      balanceAfter: Number(updated.points || 0),
      reason,
      featureKey: "admid:manual-grant",
      metadata: {
        source: "admid-monthly-grant",
        email,
        mode,
        beforePoints,
        afterPoints,
        requester,
      },
    });

    console.log(
      `[grant-monthly-coins] ok email=${email} before=${beforePoints} after=${Number(updated.points || 0)} delta=${delta} history=${String(history._id || "")}`,
    );
  } finally {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    } catch (_error) {
    }
  }
}

main().catch((error) => {
  console.error("[grant-monthly-coins] failed:", error?.message || error);
  process.exitCode = 1;
});

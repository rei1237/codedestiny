import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

import { connectDb, mongoose } from "../worker/lib/db.js";
import { PointHistory, User } from "../worker/lib/models.js";
import { hashPassword } from "../worker/lib/password.js";

const TEST_EMAILS = [
  "hanyuju@code-destiny.local",
  "songgokni@code-destiny.local",
  "james@code-destiny.local",
  "testuser04@code-destiny.local",
  "testuser05@code-destiny.local",
];

const TARGET_POINTS = 99999;
const SEED_REASON = "Seed test account initial balance";
const SEED_FEATURE_KEY = "seed:test-users";

function loadEnvFiles() {
  for (const fileName of [".env.local", ".env"]) {
    const envPath = path.join(process.cwd(), fileName);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    }
  }
}

function enforceSafetyGuards() {
  if (process.env.ALLOW_TEST_USER_SEED !== "true") {
    throw new Error("ALLOW_TEST_USER_SEED=true is required to seed test users.");
  }

  if (
    process.env.NODE_ENV === "production"
    && process.env.CONFIRM_PRODUCTION_SEED !== "CREATE_TEST_USERS"
  ) {
    throw new Error("Production seed requires CONFIRM_PRODUCTION_SEED=CREATE_TEST_USERS");
  }
}

function displayNameFromEmail(email) {
  const local = String(email || "").split("@")[0] || "tester";
  return local.replace(/[^a-zA-Z0-9]/g, " ").trim() || "Test User";
}

function generateStrongPassword() {
  const partA = crypto.randomBytes(12).toString("base64url");
  const partB = crypto.randomBytes(8).toString("hex");
  return `Cd!${partA}${partB}`;
}

function normalizeMongoUriEnv() {
  const currentMongoUri = String(process.env.MONGO_URI || "").trim();
  const fallbackMongoUri = String(process.env.MONGODB_URI || "").trim();
  if (
    fallbackMongoUri
    && (!currentMongoUri || /(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(currentMongoUri))
  ) {
    process.env.MONGO_URI = fallbackMongoUri;
  }

  const familyRaw = String(process.env.MONGO_IP_FAMILY || "").trim();
  if (familyRaw && familyRaw !== "4" && familyRaw !== "6") {
    process.env.MONGO_IP_FAMILY = "4";
  }
}

async function ensureUserAndBalance({ email, inputPassword, forcePasswordReset }) {
  const users = User.collection;
  const now = new Date();
  const emailNorm = String(email || "").trim().toLowerCase();

  const existing = await users.findOne(
    { email: emailNorm },
    {
      projection: {
        _id: 1,
        email: 1,
        points: 1,
        passwordHash: 1,
        localAuth: 1,
        role: 1,
        status: 1,
      },
    },
  );

  const shouldWritePassword = !existing || forcePasswordReset;
  const nextPassword = shouldWritePassword ? String(inputPassword || "").trim() : "";
  const passwordHash = shouldWritePassword ? await hashPassword(nextPassword) : "";

  let userId;
  let beforePoints = 0;
  let afterPoints = 0;
  let balanceDelta = 0;
  let operation = "updated";

  if (!existing) {
    const doc = {
      name: displayNameFromEmail(emailNorm),
      email: emailNorm,
      passwordHash,
      birthDate: "1990-01-01",
      birthTime: "09:00",
      gender: "OTHER",
      joinedAt: now,
      status: "active",
      role: "user",
      points: TARGET_POINTS,
      unlockedFeatures: [],
      localAuth: {
        enabled: true,
        activatedAt: now,
      },
      metadata: {
        role: "tester",
        isTestAccount: true,
        createdBy: "seed-test-users",
        seededAt: now.toISOString(),
      },
    };

    const inserted = await users.insertOne(doc);
    userId = inserted.insertedId;
    beforePoints = 0;
    afterPoints = TARGET_POINTS;
    balanceDelta = TARGET_POINTS;
    operation = "created";

    await PointHistory.create({
      userId,
      kind: "adjust",
      delta: balanceDelta,
      balanceAfter: afterPoints,
      reason: SEED_REASON,
      featureKey: SEED_FEATURE_KEY,
      metadata: {
        source: "seed-test-users",
        type: "TEST_ACCOUNT_CREDIT",
        amount: balanceDelta,
        targetBalance: TARGET_POINTS,
        email: emailNorm,
      },
    });
  } else {
    userId = existing._id;
    beforePoints = Number(existing.points || 0);

    const baseSet = {
      name: displayNameFromEmail(emailNorm),
      email: emailNorm,
      status: "active",
      "localAuth.enabled": true,
      "localAuth.activatedAt": now,
      "metadata.role": "tester",
      "metadata.isTestAccount": true,
      "metadata.createdBy": "seed-test-users",
      "metadata.seededAt": now.toISOString(),
    };

    if (shouldWritePassword) {
      baseSet.passwordHash = passwordHash;
    }

    await users.updateOne({ _id: userId }, { $set: baseSet });

    balanceDelta = TARGET_POINTS - beforePoints;
    if (balanceDelta !== 0) {
      const updated = await users.findOneAndUpdate(
        { _id: userId },
        { $inc: { points: balanceDelta } },
        { returnDocument: "after", projection: { points: 1 } },
      );
      afterPoints = Number(updated?.points || TARGET_POINTS);

      await PointHistory.create({
        userId,
        kind: "adjust",
        delta: balanceDelta,
        balanceAfter: afterPoints,
        reason: SEED_REASON,
        featureKey: SEED_FEATURE_KEY,
        metadata: {
          source: "seed-test-users",
          type: balanceDelta >= 0 ? "TEST_ACCOUNT_CREDIT" : "TEST_ACCOUNT_DEBIT",
          amount: balanceDelta,
          targetBalance: TARGET_POINTS,
          email: emailNorm,
        },
      });
    } else {
      afterPoints = beforePoints;
    }
  }

  return {
    email: emailNorm,
    userId: String(userId),
    operation,
    beforePoints,
    afterPoints,
    balanceDelta,
    passwordApplied: shouldWritePassword,
    password: shouldWritePassword ? nextPassword : "(unchanged)",
  };
}

async function main() {
  loadEnvFiles();
  normalizeMongoUriEnv();
  enforceSafetyGuards();

  const suppliedPassword = String(process.env.SEED_TEST_USER_PASSWORD || "").trim();
  const forcePasswordReset = suppliedPassword.length > 0 || process.env.SEED_TEST_USER_RESET_PASSWORD === "true";

  await connectDb({
    ...process.env,
    MONGO_IP_FAMILY: "4",
  });

  const results = [];
  for (const email of TEST_EMAILS) {
    const perUserPassword = suppliedPassword || generateStrongPassword();
    const result = await ensureUserAndBalance({
      email,
      inputPassword: perUserPassword,
      forcePasswordReset,
    });
    results.push(result);
  }

  const summary = {
    ok: true,
    count: results.length,
    targetPoints: TARGET_POINTS,
    forcePasswordReset,
    seededAt: new Date().toISOString(),
    accounts: results.map((row) => ({
      email: row.email,
      userId: row.userId,
      operation: row.operation,
      beforePoints: row.beforePoints,
      afterPoints: row.afterPoints,
      balanceDelta: row.balanceDelta,
      passwordApplied: row.passwordApplied,
    })),
  };

  console.log("[seed-test-users] completed");
  console.log(JSON.stringify(summary, null, 2));
  if (process.env.CI) {
    console.log("[seed-test-users] CI run detected — skipping plaintext password printout.");
  } else {
    console.log("[seed-test-users] plaintext passwords (print-once, local only)");
    for (const row of results) {
      console.log(`${row.email} :: ${row.password}`);
    }
  }
}

main()
  .catch((error) => {
    console.error("[seed-test-users] failed:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    } catch (_error) {
      // no-op
    }
  });

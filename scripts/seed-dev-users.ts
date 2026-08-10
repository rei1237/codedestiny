import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

import { connectDb, mongoose } from "../worker/lib/db.js";
import { PointHistory, User } from "../worker/lib/models.js";
import { hashPassword } from "../worker/lib/password.js";

// 🔴 기본 비밀번호를 여기 되돌리지 말 것 — 커밋된 값은 그 자체로 공개된 비밀번호다.
const PASSWORD = String(process.env.DEV_SEED_USER_PASSWORD || "").trim();
const PAID_FEATURE_KEY = String(process.env.DEV_SEED_PAID_FEATURE_KEY || "saju_ai_question").trim();
const SINGLE_ACCOUNT_EMAIL = String(process.env.DEV_SEED_ACCOUNT_EMAIL || "").trim().toLowerCase();
const SINGLE_ACCOUNT_SLUG = String(process.env.DEV_SEED_ACCOUNT_SLUG || "").trim();
const SINGLE_ACCOUNT_STATE = String(process.env.DEV_SEED_ACCOUNT_STATE || "free").trim();

const PASS_SPECS = {
  standard: { profileLimit: 3, maxCoveredCoin: 30 },
  premium: { profileLimit: 7, maxCoveredCoin: 50 },
  vvip: { profileLimit: 15, maxCoveredCoin: 100 },
  family: { profileLimit: 0, maxCoveredCoin: 999999999 },
};

const ACCOUNTS = [
  { slug: "test-no-license", email: "test-no-license@code-destiny.com", state: "free" },
  { slug: "test-paid-feature", email: "test-paid-feature@code-destiny.com", state: "paid-feature" },
  { slug: "test-standard", email: "test-standard@code-destiny.com", state: "standard" },
  { slug: "test-premium", email: "test-premium@code-destiny.com", state: "premium" },
  { slug: "test-vvip", email: "test-vvip@code-destiny.com", state: "vvip" },
  { slug: "test-family", email: "test-family@code-destiny.com", state: "family" },
  { slug: "test-monthly", email: "test-monthly@code-destiny.com", state: "monthly" },
  { slug: "test-payment-failed", email: "test-payment-failed@code-destiny.com", state: "payment-failed" },
  { slug: "test-expired-license", email: "test-expired-license@code-destiny.com", state: "expired-license" },
];

function resolveSeedAccounts() {
  if (SINGLE_ACCOUNT_EMAIL) {
    return [{
      slug: SINGLE_ACCOUNT_SLUG || SINGLE_ACCOUNT_EMAIL.split("@")[0] || "dev-user",
      email: SINGLE_ACCOUNT_EMAIL,
      state: SINGLE_ACCOUNT_STATE,
    }];
  }
  if (SINGLE_ACCOUNT_SLUG) {
    const account = ACCOUNTS.find((entry) => entry.slug === SINGLE_ACCOUNT_SLUG);
    if (!account) throw new Error(`Unknown DEV_SEED_ACCOUNT_SLUG: ${SINGLE_ACCOUNT_SLUG}`);
    return [account];
  }
  return ACCOUNTS;
}

function loadEnvFiles() {
  for (const fileName of [".env.local", ".env"]) {
    const envPath = path.join(process.cwd(), fileName);
    if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false });
  }
}

function enforceSafety() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("seed-dev-users is disabled when NODE_ENV=production.");
  }
  if (process.env.ALLOW_DEV_USER_SEED !== "true") {
    throw new Error("ALLOW_DEV_USER_SEED=true is required.");
  }
}

function baseProfileSubscription() {
  return {
    tier: "free",
    source: "event",
    planId: "",
    productType: "",
    durationMonths: 0,
    profileLimit: 1,
    passTier: "",
    maxCoveredCoin: 0,
    freeLimit: 0,
    passLimit: 0,
    membershipCreditBalance: 0,
    membershipCreditGranted: 0,
    membershipCreditUsed: 0,
    startedAt: null,
    expiresAt: null,
    firstSubAt: null,
    cancelAtPeriodEnd: false,
    cancelRequestedAt: null,
    customerUid: "",
    paymentMethod: "",
    nextBillingAt: null,
    lastBillingAt: null,
    lastBillingStatus: "idle",
    lastBillingError: "",
  };
}

function monthlySubscription(active, now) {
  return active
    ? {
      active: true,
      status: "active",
      tier: "dev-monthly",
      startedAt: now,
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      source: "seed-dev-users",
    }
    : {
      active: false,
      status: "none",
      tier: "",
      startedAt: null,
      expiresAt: null,
      source: "seed-dev-users",
    };
}

function licenseExpiresAt(state, now) {
  if (state === "expired-license") return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (PASS_SPECS[state]) return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return null;
}

function licensesForState(state, now) {
  const expiresAt = licenseExpiresAt(state, now);
  if (state === "standard") {
    return { standard: 3, premium: 0, vvip: 0, status: "active", expiresAt };
  }
  if (state === "premium") {
    return { standard: 0, premium: 7, vvip: 0, status: "active", expiresAt };
  }
  if (state === "vvip") {
    return { standard: 0, premium: 0, vvip: 15, status: "active", expiresAt };
  }
  if (state === "expired-license") {
    return { standard: 0, premium: 7, vvip: 0, status: "expired", expiresAt };
  }
  return { standard: 0, premium: 0, vvip: 0, status: state === "payment-failed" ? "failed" : "none", expiresAt: null };
}

function profileSubscriptionForState(state, now) {
  const base = baseProfileSubscription();
  if (!PASS_SPECS[state]) {
    if (state === "expired-license") {
      const spec = PASS_SPECS.premium;
      const expiredAt = licenseExpiresAt(state, now);
      return {
        ...base,
        tier: "premium",
        source: "event",
        planId: "dev-expired-premium",
        productType: "membership_pass",
        durationMonths: 1,
        profileLimit: spec.profileLimit,
        passTier: "premium",
        maxCoveredCoin: spec.maxCoveredCoin,
        freeLimit: spec.maxCoveredCoin,
        passLimit: spec.maxCoveredCoin,
        startedAt: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000),
        expiresAt: expiredAt,
        firstSubAt: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000),
        paymentMethod: "seed-dev-users",
        lastBillingAt: expiredAt,
        lastBillingStatus: "expired",
      };
    }
    if (state === "payment-failed") {
      return {
        ...base,
        lastBillingAt: now,
        lastBillingStatus: "failed",
        lastBillingError: "DEV_PAYMENT_FAILED",
      };
    }
    if (state === "monthly") {
      return {
        ...base,
        membershipCreditBalance: 999999,
        membershipCreditGranted: 999999,
        // 월정석 지급분별 만료 도입 — 개발 시드도 지급일+30일 lot으로 부여.
        membershipCreditLots: [{
          lotId: "dev-monthly-seed",
          amount: 999999,
          remaining: 999999,
          grantedAt: now,
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        }],
      };
    }
    return base;
  }
  const spec = PASS_SPECS[state];
  return {
    ...base,
    tier: state,
    source: "event",
    planId: `dev-${state}`,
    productType: "membership_pass",
    durationMonths: 1,
    profileLimit: spec.profileLimit,
    passTier: state,
    maxCoveredCoin: spec.maxCoveredCoin,
    freeLimit: spec.maxCoveredCoin,
    passLimit: spec.maxCoveredCoin,
    startedAt: now,
    expiresAt: licenseExpiresAt(state, now),
    firstSubAt: now,
    paymentMethod: "seed-dev-users",
    lastBillingAt: now,
    lastBillingStatus: "success",
  };
}

async function upsertDevUser(account, passwordHash) {
  const now = new Date();
  const email = account.email;
  const paidFeatures = account.state === "paid-feature" ? [PAID_FEATURE_KEY] : [];
  const update = {
    name: account.slug,
    email,
    passwordHash,
    birthDate: "1990-01-01",
    birthTime: "09:00",
    gender: "OTHER",
    status: "active",
    role: "user",
    points: 100000,
    paidFeatures,
    unlockedFeatures: paidFeatures,
    licenses: licensesForState(account.state, now),
    profileSubscription: profileSubscriptionForState(account.state, now),
    monthlySubscription: monthlySubscription(account.state === "monthly", now),
    localAuth: {
      enabled: true,
      activatedAt: now,
    },
  };

  const result = await User.findOneAndUpdate(
    { email },
    { $set: update, $setOnInsert: { joinedAt: now } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  await PointHistory.create({
    userId: result._id,
    kind: "adjust",
    delta: 0,
    balanceAfter: Number(result.points || 0),
    reason: "seed-dev-users",
    featureKey: PAID_FEATURE_KEY,
    metadata: {
      source: "seed-dev-users",
      state: account.state,
      email,
    },
  }).catch(() => {});

  return {
    slug: account.slug,
    state: account.state,
    email,
    userId: String(result._id),
    devAuthEnv: `DEV_AUTH_USER_ID=${String(result._id)}`,
  };
}

async function main() {
  loadEnvFiles();
  enforceSafety();

  if (PASSWORD.length < 12) {
    throw new Error("Set DEV_SEED_USER_PASSWORD in .env.local (minimum 12 characters). It must not be committed.");
  }

  await connectDb({
    ...process.env,
    MONGO_IP_FAMILY: process.env.MONGO_IP_FAMILY || "4",
  });

  const passwordHash = await hashPassword(PASSWORD);
  const accounts: Array<{ slug: string; state: string; email: string; userId: string; devAuthEnv: string }> = [];
  for (const account of resolveSeedAccounts()) {
    accounts.push(await upsertDevUser(account, passwordHash));
  }

  console.log(JSON.stringify({
    ok: true,
    // 평문 출력 금지 — 값은 DEV_SEED_USER_PASSWORD 로 실행자가 직접 넣은 것이다.
    password: `(DEV_SEED_USER_PASSWORD, ${PASSWORD.length}자)`,
    paidFeatureKey: PAID_FEATURE_KEY,
    accounts,
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("[seed-dev-users] failed", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

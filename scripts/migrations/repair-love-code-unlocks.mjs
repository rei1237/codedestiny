#!/usr/bin/env node
/**
 * Repairs durable Love Code ownership from verified historical evidence.
 * Default and --dry-run only report; --apply is the sole write mode.
 */
import { createHash } from "node:crypto";
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import {
  CONTENT_ENTITLEMENT_SCOPES,
  CONTENT_ENTITLEMENT_SOURCES,
  CONTENT_ENTITLEMENT_STATUSES,
  ContentEntitlement,
  Payment,
  User,
} from "../../worker/lib/models.js";
import { USER_SCOPE_PROFILE_ID } from "../../worker/lib/content-unlocks.js";
import {
  LEGACY_LOVE_CODE_FEATURE_KEYS,
  LOVE_CODE_FEATURE_KEY,
  LOVE_CODE_PRODUCT_ID,
} from "../../worker/lib/paid-feature-registry.js";

config({ path: ".env.local" });
config({ path: ".env" });

const APPLY = process.argv.includes("--apply");
const DRY_RUN = process.argv.includes("--dry-run") || !APPLY;
const FEATURE_KEYS = [LOVE_CODE_FEATURE_KEY, ...LEGACY_LOVE_CODE_FEATURE_KEYS];
const PRODUCT_KEYS = [LOVE_CODE_PRODUCT_ID, ...FEATURE_KEYS];
const SUCCESS_STATUSES = ["paid", "success", "fulfilled"];
const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || process.env.DB_NAME || "",
};

function safeUserId(value) {
  return createHash("sha256").update(String(value || "")).digest("hex").slice(0, 12);
}

function asUserId(value) {
  const id = String(value || "").trim();
  return id || "";
}

async function collectCandidateUserIds() {
  const ids = new Set();
  const paymentRows = await Payment.collection.find({
    status: { $in: SUCCESS_STATUSES },
    paymentAmount: 10000,
    $or: [
      { featureKey: { $in: FEATURE_KEYS } },
      { productId: { $in: PRODUCT_KEYS } },
      { "pricingSnapshot.featureKey": { $in: FEATURE_KEYS } },
      { "pricingSnapshot.productId": { $in: PRODUCT_KEYS } },
    ],
  }, { projection: { userId: 1 } }).toArray();
  paymentRows.forEach((row) => ids.add(asUserId(row.userId)));

  const entitlementRows = await ContentEntitlement.collection.find({
    featureKey: { $in: FEATURE_KEYS },
    status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
  }, { projection: { userId: 1 } }).toArray();
  entitlementRows.forEach((row) => ids.add(asUserId(row.userId)));

  const userRows = await User.collection.find({
    $or: [
      { unlockedFeatures: { $in: FEATURE_KEYS } },
      { paidFeatures: { $in: FEATURE_KEYS } },
    ],
  }, { projection: { _id: 1 } }).toArray();
  userRows.forEach((row) => ids.add(asUserId(row._id)));

  return [...ids].filter(Boolean);
}

async function hasCanonicalEntitlement(userId) {
  return Boolean(await ContentEntitlement.exists({
    userId,
    profileId: USER_SCOPE_PROFILE_ID,
    serviceKey: LOVE_CODE_FEATURE_KEY,
    contentKey: LOVE_CODE_FEATURE_KEY,
    scope: CONTENT_ENTITLEMENT_SCOPES.USER,
    status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
    expiresAt: null,
  }));
}

async function repairUser(userId) {
  const alreadyEntitled = await hasCanonicalEntitlement(userId);
  if (alreadyEntitled) return { status: "already" };
  if (DRY_RUN) return { status: "candidate" };

  const now = new Date();
  await ContentEntitlement.updateOne(
    {
      userId,
      profileId: USER_SCOPE_PROFILE_ID,
      serviceKey: LOVE_CODE_FEATURE_KEY,
      contentKey: LOVE_CODE_FEATURE_KEY,
      scope: CONTENT_ENTITLEMENT_SCOPES.USER,
    },
    {
      $setOnInsert: {
        userId,
        profileId: USER_SCOPE_PROFILE_ID,
        serviceKey: LOVE_CODE_FEATURE_KEY,
        contentKey: LOVE_CODE_FEATURE_KEY,
        scope: CONTENT_ENTITLEMENT_SCOPES.USER,
        featureKey: LOVE_CODE_FEATURE_KEY,
        source: CONTENT_ENTITLEMENT_SOURCES.BACKFILL,
        grantType: "permanent_unlock",
        orderId: "repair-love-code-unlocks",
        paymentId: "repair-love-code-unlocks",
        coinPrice: 100,
        coinAmount: 100,
        amountKRW: 10000,
        unlockedAt: now,
        grantedAt: now,
        expiresAt: null,
      },
      $set: { status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE, expiresAt: null, updatedAt: now },
    },
    { upsert: true },
  );
  await User.updateOne(
    { _id: userId },
    { $addToSet: { unlockedFeatures: LOVE_CODE_FEATURE_KEY, paidFeatures: LOVE_CODE_FEATURE_KEY }, $set: { updatedAt: now } },
  );
  return { status: "applied" };
}

async function main() {
  if (!env.MONGO_URI && !env.MONGODB_URI) throw new Error("MONGO_URI or MONGODB_URI is required");
  await connectDb(env);
  const candidates = await collectCandidateUserIds();
  const totals = { scanned: candidates.length, already: 0, candidate: 0, applied: 0 };
  console.log(`MODE ${APPLY ? "apply" : "dry-run"}`);
  console.log(`SCANNED ${totals.scanned}`);
  for (const userId of candidates) {
    const result = await repairUser(userId);
    totals[result.status] += 1;
    console.log(`LOVE_CODE_REPAIR ${result.status.toUpperCase()} user=${safeUserId(userId)}`);
  }
  console.log(`SUMMARY scanned=${totals.scanned} already=${totals.already} candidates=${totals.candidate} applied=${totals.applied}`);
}

try {
  await main();
} finally {
  await mongoose.disconnect();
}

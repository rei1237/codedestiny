import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";
// 연결은 getUserModel() 이 worker/lib/db.js 의 connectDb(autoIndex:false)로 처리한다.
import { getUserModel } from "../app/_lib/models/UserModel.js";
import { PointHistory } from "../worker/lib/models.js";
import { signAuthToken } from "../worker/lib/auth.js";
import { handleBillingRoutes } from "../worker/routes/billing.js";
import {
  COIN_GATE_PER_USE_REASON_COSTS,
  FEATURE_KEY_PRICE_TABLE,
  FEATURE_KEY_REASON_COSTS,
  PAID_FEATURE_KEY_ALIASES,
  PIG_COIN_UNLOCK_PRODUCTS,
  isUnlockPaidFeatureKey,
  listServerPricedFeatureKeys,
  normalizePaidFeatureKey,
} from "../worker/lib/paid-feature-registry.js";

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    const value = argv[i + 1];
    if (typeof value === "string" && !value.startsWith("--")) {
      result[key.slice(2)] = value;
      i += 1;
    } else {
      result[key.slice(2)] = "true";
    }
  }
  return result;
}

for (const fileName of [".env.local", ".env"]) {
  const envPath = path.join(process.cwd(), fileName);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const currentMongoUri = String(process.env.MONGO_URI || "").trim();
const fallbackMongoUri = String(process.env.MONGODB_URI || "").trim();
if (
  fallbackMongoUri
  && (!currentMongoUri || /(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(currentMongoUri))
) {
  process.env.MONGO_URI = fallbackMongoUri;
}

const args = parseArgs(process.argv.slice(2));
const TEST_LOGIN_ID = String(args.email || "test1234@example.com").trim().toLowerCase();
const TEST_POINTS = Number.isFinite(Number(args.points)) ? Number(args.points) : 100000;
const TEST_PROFILE_ID = String(args.profileId || `qa-all-paid-${Date.now().toString(36)}`).trim();
const REQUEST_ID_PREFIX = `qa-all-paid-${Date.now().toString(36)}`;

if (!Number.isInteger(TEST_POINTS) || TEST_POINTS <= 0) {
  throw new Error("--points must be a positive integer.");
}

function getEnvForWorker() {
  return {
    MONGO_URI: String(process.env.MONGO_URI || ""),
    MONGODB_URI: String(process.env.MONGODB_URI || ""),
    MONGO_DB_NAME: String(process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || ""),
    JWT_SECRET: String(process.env.JWT_SECRET || process.env.AUTH_SECRET || "dev-secret"),
    AUTH_SECRET: String(process.env.AUTH_SECRET || ""),
    FLOWER_ADMIN_SECRET: String(process.env.FLOWER_ADMIN_SECRET || "flower-admin-dev-secret-placeholder-000000"),
  };
}

function buildConsumeCases() {
  const cases = [];
  const seenKeyReason = new Set();

  for (const [reason, cost] of Object.entries(COIN_GATE_PER_USE_REASON_COSTS)) {
    const featureKey = "coin-gate-per-use";
    const dedupeKey = `${featureKey}::${reason}`;
    if (seenKeyReason.has(dedupeKey)) continue;
    seenKeyReason.add(dedupeKey);
    cases.push({
      id: `coin-gate:${reason}`,
      featureKey,
      reason,
      expectedCost: Number(cost),
    });
  }

  for (const [featureKey, spec] of Object.entries(FEATURE_KEY_PRICE_TABLE)) {
    const reason = String(spec?.reason || "").trim();
    const dedupeKey = `${featureKey}::${reason}`;
    if (seenKeyReason.has(dedupeKey)) continue;
    seenKeyReason.add(dedupeKey);
    cases.push({
      id: `feature:${featureKey}`,
      featureKey,
      reason,
      expectedCost: Number(spec?.cost || 0),
    });
  }

  for (const [featureKey, reasonTable] of Object.entries(FEATURE_KEY_REASON_COSTS)) {
    for (const [reason, pricing] of Object.entries(reasonTable || {})) {
      const dedupeKey = `${featureKey}::${reason}`;
      if (seenKeyReason.has(dedupeKey)) continue;
      seenKeyReason.add(dedupeKey);
      cases.push({
        id: `feature-reason:${featureKey}:${reason}`,
        featureKey,
        reason,
        expectedCost: Number(pricing?.cost ?? pricing),
      });
    }
  }

  const unlockByFeatureKey = new Map();
  for (const spec of Object.values(PIG_COIN_UNLOCK_PRODUCTS)) {
    const key = String(spec?.featureKey || "").trim();
    if (!key) continue;
    if (!unlockByFeatureKey.has(key)) unlockByFeatureKey.set(key, spec);
  }

  for (const [featureKey, spec] of unlockByFeatureKey.entries()) {
    const reason = String(spec?.reason || "").trim();
    const dedupeKey = `${featureKey}::${reason}`;
    if (seenKeyReason.has(dedupeKey)) continue;
    seenKeyReason.add(dedupeKey);
    cases.push({
      id: `unlock:${featureKey}`,
      featureKey,
      reason,
      expectedCost: Number(spec?.cost || 0),
    });
  }

  for (const [aliasKey, canonicalKeyRaw] of Object.entries(PAID_FEATURE_KEY_ALIASES)) {
    const canonicalKey = normalizePaidFeatureKey(canonicalKeyRaw);
    const featureSpec = FEATURE_KEY_PRICE_TABLE[canonicalKey] || unlockByFeatureKey.get(canonicalKey) || null;
    if (!featureSpec) continue;
    const reason = String(featureSpec?.reason || "").trim();
    const dedupeKey = `${aliasKey}::${reason}`;
    if (seenKeyReason.has(dedupeKey)) continue;
    seenKeyReason.add(dedupeKey);
    cases.push({
      id: `alias:${aliasKey}->${canonicalKey}`,
      featureKey: aliasKey,
      reason,
      expectedCost: Number(featureSpec?.cost || 0),
    });
  }

  return cases;
}

function verifyCoverage(cases) {
  const coveredKeys = new Set(cases.map((entry) => entry.featureKey));
  const serverKeys = listServerPricedFeatureKeys();
  const missing = serverKeys.filter((key) => !coveredKeys.has(key));
  if (missing.length) {
    throw new Error(`결제 테스트 케이스에서 누락된 server priced featureKey: ${missing.join(", ")}`);
  }
}

function requiresProfileScope(testCase) {
  if (isUnlockPaidFeatureKey(testCase?.featureKey)) return true;
  return Object.entries(FEATURE_KEY_PRICE_TABLE).some(([featureKey, spec]) => (
    isUnlockPaidFeatureKey(featureKey)
    && String(spec?.reason || "").trim() === String(testCase?.reason || "").trim()
  ));
}

async function prepareTestUser(email, points) {
  const User = await getUserModel();

  const existing = await User.findOne({ email }).select("_id email").lean();
  if (!existing) {
    throw new Error(`테스트 계정이 없습니다: ${email}. 먼저 npm run seed:test-account 실행 필요`);
  }

  await User.updateOne(
    { _id: existing._id },
    {
      $set: {
        role: "user",
        points,
        destinyProfilesCurrentId: TEST_PROFILE_ID,
        unlockedFeatures: [],
        recentConsumeRequestIds: [],
        "profileSubscription.tier": "free",
        "profileSubscription.source": "coin",
        "profileSubscription.expiresAt": null,
        "profileSubscription.cancelAtPeriodEnd": false,
      },
    },
  );

  const user = await User.findById(existing._id).lean();
  if (!user) throw new Error("테스트 계정 재조회 실패");
  return user;
}

async function consumeOne({ env, authToken, testCase, index }) {
  const requestId = `${REQUEST_ID_PREFIX}-${String(index).padStart(3, "0")}`;
  const scopedProfileId = `${TEST_PROFILE_ID}-${String(index).padStart(3, "0")}`;
  const profileScope = requiresProfileScope(testCase)
    ? {
        profileId: scopedProfileId,
        selectedProfileId: scopedProfileId,
      }
    : {};
  const response = await handleBillingRoutes(
    new Request("https://local.test/api/billing/coin-gate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        featureKey: testCase.featureKey,
        reason: testCase.reason,
        paymentMode: "COIN",
        forceDeduct: true,
        requestId,
        ...profileScope,
      }),
    }),
    env,
  );

  const payload = await response.json();

  if (response.status !== 200) {
    throw new Error(`consume 실패 (${testCase.id}): status=${response.status}, body=${JSON.stringify(payload)}`);
  }

  const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const consume = data?.consume && typeof data.consume === "object" ? data.consume : data;
  const chargedCoins = Number(consume?.chargedCoins ?? consume?.cost ?? 0);
  if (!Number.isFinite(chargedCoins) || chargedCoins <= 0) {
    throw new Error(`유료 처리 검증 실패 (${testCase.id}): chargedCoins=${chargedCoins}`);
  }

  if (Number.isFinite(testCase.expectedCost) && testCase.expectedCost > 0 && chargedCoins !== testCase.expectedCost) {
    throw new Error(`유료 처리 금액 불일치 (${testCase.id}): expected=${testCase.expectedCost}, actual=${chargedCoins}`);
  }

  return {
    requestId,
    chargedCoins,
    testCase,
    payload,
  };
}

async function main() {
  const env = getEnvForWorker();
  const cases = buildConsumeCases();
  verifyCoverage(cases);

  const user = await prepareTestUser(TEST_LOGIN_ID, TEST_POINTS);
  const authToken = await signAuthToken(user, env);

  let totalCharged = 0;
  const requestIds = [];

  for (let index = 0; index < cases.length; index += 1) {
    const result = await consumeOne({
      env,
      authToken,
      testCase: cases[index],
      index,
    });

    totalCharged += result.chargedCoins;
    requestIds.push(result.requestId);
  }

  const User = await getUserModel();
  const afterUser = await User.findById(user._id).select("points").lean();
  const expectedPoints = TEST_POINTS - totalCharged;
  const actualPoints = Number(afterUser?.points || 0);

  if (actualPoints !== expectedPoints) {
    throw new Error(`최종 포인트 불일치: expected=${expectedPoints}, actual=${actualPoints}`);
  }

  const historyCount = await PointHistory.countDocuments({
    userId: user._id,
    kind: "deduct",
    "metadata.requestId": { $in: requestIds },
  });

  if (historyCount !== requestIds.length) {
    throw new Error(`PointHistory 건수 불일치: expected=${requestIds.length}, actual=${historyCount}`);
  }

  console.log("[verify-all-paid-services-payment-flow] PASS");
  console.log(`  - user: ${TEST_LOGIN_ID}`);
  console.log(`  - initial points: ${TEST_POINTS}`);
  console.log(`  - cases executed: ${cases.length}`);
  console.log(`  - total charged: ${totalCharged}`);
  console.log(`  - final points: ${actualPoints}`);
}

main()
  .catch((error) => {
    console.error("[verify-all-paid-services-payment-flow] FAIL:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (e) {
      // noop
    }
  });

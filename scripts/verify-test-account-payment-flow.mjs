import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import dotenv from "dotenv";
import { dbConnect } from "../app/_lib/dbConnect.js";
import { getUserModel } from "../app/_lib/models/UserModel.js";
import { PointHistory } from "../worker/lib/models.js";
import { signAuthToken } from "../worker/lib/auth.js";
import { handleFortuneRoutes } from "../worker/routes/fortune.js";

for (const fileName of [".env.local", ".env"]) {
  const envPath = path.join(process.cwd(), fileName);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const TEST_LOGIN_ID = "test1234@example.com";
const TEST_POINTS = 9999;
const VERIFY_COST = 50;
const VERIFY_FEATURE_KEY = "tarot-love-relationship";
const VERIFY_REASON = "우리는 무슨 사이? 타로 리딩";

const currentMongoUri = String(process.env.MONGO_URI || "").trim();
const fallbackMongoUri = String(process.env.MONGODB_URI || "").trim();
if (
  fallbackMongoUri
  && (!currentMongoUri || /(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(currentMongoUri))
) {
  process.env.MONGO_URI = fallbackMongoUri;
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

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function issueAdminToken(secret) {
  const now = Math.floor(Date.now() / 1000);
  const payloadB64 = base64urlJson({ v: 1, issued: now, exp: now + 3600 });
  const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest("hex");
  return `${payloadB64}.${sig}`;
}

async function main() {
  await dbConnect();
  const User = await getUserModel();

  const normalizedEmail = TEST_LOGIN_ID.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select("_id email role points").lean();
  if (!user) {
    throw new Error("테스트 계정이 없습니다. 먼저 `npm run seed:test-account`를 실행하세요.");
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        role: "user",
        points: TEST_POINTS,
        unlockedFeatures: [],
      },
    },
  );

  const freshUser = await User.findById(user._id).lean();
  const env = getEnvForWorker();
  const authToken = await signAuthToken(freshUser, env);
  const adminToken = issueAdminToken(env.FLOWER_ADMIN_SECRET);

  const response = await handleFortuneRoutes(
    new Request("https://local.test/api/fortune/pig-coin/consume", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${authToken}`,
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({
        cost: VERIFY_COST,
        reason: VERIFY_REASON,
        featureKey: VERIFY_FEATURE_KEY,
      }),
    }),
    env,
  );

  const payload = await response.json();
  if (response.status !== 200) {
    throw new Error(`consume API 실패: status=${response.status}, body=${JSON.stringify(payload)}`);
  }
  if (payload?.adminBypass === true) {
    throw new Error("테스트 계정이 adminBypass로 통과했습니다. 일반 결제 흐름 검증 실패.");
  }

  const afterUser = await User.findById(user._id).select("points").lean();
  const expectedPoints = TEST_POINTS - VERIFY_COST;
  const actualPoints = Number(afterUser?.points || 0);
  if (actualPoints !== expectedPoints) {
    throw new Error(`포인트 차감 불일치: expected=${expectedPoints}, actual=${actualPoints}`);
  }

  const latestDeduct = await PointHistory.findOne({
    userId: user._id,
    kind: "deduct",
    featureKey: VERIFY_FEATURE_KEY,
  }).sort({ createdAt: -1 }).lean();

  if (!latestDeduct || Number(latestDeduct.delta) !== -VERIFY_COST) {
    throw new Error("PointHistory 차감 기록 검증 실패 (kind=deduct, delta=-50).");
  }

  console.log("[verify-test-account-payment-flow] PASS");
  console.log(`  - user: ${normalizedEmail}`);
  console.log(`  - deducted: ${VERIFY_COST}`);
  console.log(`  - points: ${TEST_POINTS} -> ${actualPoints}`);
  console.log("  - admin token 동시 전달 시에도 bypass 없이 차감 확인");
}

main().catch((error) => {
  console.error("[verify-test-account-payment-flow] FAIL:", error?.message || error);
  process.exitCode = 1;
});

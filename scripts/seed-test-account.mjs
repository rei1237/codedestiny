import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { dbConnect } from "../app/_lib/dbConnect.js";
import { getUserModel } from "../app/_lib/models/UserModel.js";

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

// 테스트 계정 설정
// ⚠️ 이 테스트 계정은 일반 고객과 동일한 유료 처리 로직을 사용합니다
// - /api/billing/coin-gate API 통해 실제로 결제 권한이 처리됨
// - PointHistory 컬렉션에 차감 기록 남김 (kind: "deduct")
// - unlockedFeatures 빈 배열로 설정되어 결제 필요
const TEST_LOGIN_ID = String(args.email || "test1234@example.com").trim().toLowerCase();
const TEST_PASSWORD = String(args.password || "test!1234").trim();
const TEST_POINTS = Number.isFinite(Number(args.points)) ? Number(args.points) : 9999;
const TEST_NAME = String(args.name || "Test User").trim() || "Test User";
if (String(args["mongo-uri"] || "").trim()) {
  process.env.MONGO_URI = String(args["mongo-uri"]).trim();
}

if (!TEST_LOGIN_ID) {
  throw new Error("--email 값이 비어 있습니다.");
}

if (!TEST_PASSWORD) {
  throw new Error("--password 값이 비어 있습니다.");
}

if (!Number.isInteger(TEST_POINTS) || TEST_POINTS < 0) {
  throw new Error("--points 값은 0 이상의 정수여야 합니다.");
}

async function upsertTestAccount() {
  await dbConnect();
  const User = await getUserModel();

  const now = new Date();
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  await User.updateOne(
    { email: TEST_LOGIN_ID },
    {
      $set: {
        name: TEST_NAME,
        email: TEST_LOGIN_ID,
        passwordHash,
        birthDate: "1990-01-01",
        birthTime: "09:00",
        gender: "OTHER",
        role: "user",
        points: TEST_POINTS,
        status: "active",
        lastLoginAt: now,
        localAuth: {
          enabled: true,
          activatedAt: now,
        },
        // 프리미엄 기능 테스트를 위해 빈 배열로 설정 (유료 처리 필요)
        unlockedFeatures: [],
      },
      $setOnInsert: {
        joinedAt: now,
      },
    },
    { upsert: true },
  );

  const user = await User.findOne({ email: TEST_LOGIN_ID }).lean();
  if (!user) {
    throw new Error(`${TEST_LOGIN_ID} 계정 생성/갱신 후 조회에 실패했습니다.`);
  }

  console.log("[seed-test-account] done");
  console.log("============================================");
  console.log("✅ 테스트 계정 생성/갱신 완료");
  console.log("============================================");
  console.log("【계정 정보】");
  console.log(`  - Email: ${TEST_LOGIN_ID}`);
  console.log(`  - PW: ${TEST_PASSWORD}`);
  console.log(`  - MongoDB _id: ${String(user._id)}`);
  console.log("");
  console.log("【유료 처리 상태】");
  console.log(`  - 현재 포인트: ${user.points}`);
  console.log(`  - 프리미엄 해금 상태: ${(user.unlockedFeatures || []).length === 0 ? '미해금 (결제 필요)' : '일부 해금'}`);
  console.log("");
  console.log("【동작 방식】");
  console.log("  - 일반 고객과 동일한 /api/billing/coin-gate API 사용");
  console.log("  - 프리미엄 기능 사용 시 실제로 5,000원 결제 가치 차감됨");
  console.log("  - PointHistory 컬렉션에 차감 기록 자동 생성");
  console.log("  - 권한 부족 시 결제 유도 (일반 고객과 동일)");
  console.log("");
  console.log("【로그인】");
  console.log(`  - URL: /login`);
  console.log("============================================");
  await mongoose.disconnect();
}

upsertTestAccount().catch((error) => {
  console.error("[seed-test-account] failed:", error?.message || error);
  mongoose.connection?.close().catch(() => {});
  process.exitCode = 1;
});

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { dbConnect } from "../app/_lib/dbConnect.js";
import { getUserModel } from "../app/_lib/models/UserModel.js";

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

// 테스트 계정 설정
const TEST_LOGIN_ID = "test1234";
const TEST_PASSWORD = "test!1234";
const TEST_POINTS = 9999;

async function upsertTestAccount() {
  await dbConnect();
  const User = await getUserModel();

  const now = new Date();
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  await User.updateOne(
    { email: TEST_LOGIN_ID },
    {
      $set: {
        name: "Test User",
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
        // 프리미엄 기능 테스트를 위해 빈 배열로 설정 (코인으로 결제해야 함)
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
    throw new Error("test1234 계정 생성/갱신 후 조회에 실패했습니다.");
  }

  console.log("[seed-test-account] done");
  console.log(JSON.stringify({
    id: String(user._id),
    email: user.email,
    points: user.points,
    localAuthEnabled: user?.localAuth?.enabled !== false,
    loginUrl: "/login",
    credentials: {
      id: TEST_LOGIN_ID,
      password: TEST_PASSWORD,
    },
  }, null, 2));
}

upsertTestAccount().catch((error) => {
  console.error("[seed-test-account] failed:", error?.message || error);
  process.exitCode = 1;
});

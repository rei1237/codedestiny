import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
// 연결은 getUserModel() 이 worker/lib/db.js 의 connectDb(autoIndex:false)로 처리한다.
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

const TEST_LOGIN_ID = "test_inicis";
// 🔴 평문 비밀번호를 여기 되돌리지 말 것 — 예전의 "inicis1234!" 는 프로덕션에 실재하는 계정의
// 비밀번호였고 리포에 그대로 커밋돼 있었다. env 로만 받는다(seed-preview-test-account.mjs 와 동일).
const TEST_PASSWORD = String(process.env.INICIS_TEST_ACCOUNT_PASSWORD || "").trim();
const TEST_POINTS = 9999;

async function upsertInicisAccount() {
  if (TEST_PASSWORD.length < 12) {
    throw new Error("Set INICIS_TEST_ACCOUNT_PASSWORD in .env.local (minimum 12 characters). It must not be committed.");
  }
  const User = await getUserModel();

  const now = new Date();
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  await User.updateOne(
    { email: TEST_LOGIN_ID },
    {
      $set: {
        name: "INIcis Test Reviewer",
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
      },
      $setOnInsert: {
        joinedAt: now,
      },
    },
    { upsert: true },
  );

  const user = await User.findOne({ email: TEST_LOGIN_ID }).lean();
  if (!user) {
    throw new Error("test_inicis 계정 생성/갱신 후 조회에 실패했습니다.");
  }

  console.log("[seed-inicis-test-account] done");
  console.log(JSON.stringify({
    id: String(user._id),
    email: user.email,
    points: user.points,
    localAuthEnabled: user?.localAuth?.enabled !== false,
  }, null, 2));
}

upsertInicisAccount().catch((error) => {
  console.error("[seed-inicis-test-account] failed:", error?.message || error);
  process.exitCode = 1;
});

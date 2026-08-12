#!/usr/bin/env node

/*
 * 프리뷰 검증용 FAMILY 이용권 계정을 만든다(멱등).
 *
 * 왜 필요한가: 프리뷰의 /api 는 public/_worker.js 가 운영 Worker 로 프록시하므로,
 * 무료 계정으로는 유료 화면이 전부 결제창에서 막혀 검증이 불가능하다. 이용권/월정석뿐 아니라
 * 고정 생년월일(1990-01-01) 프로필 카드도 함께 만들어 "현재 선택된 카드"로 지정하므로,
 * 로그인 직후부터 화면마다 생년월일을 직접 입력하지 않아도 된다.
 *
 * 🔴 이 스크립트는 운영 MongoDB 에 쓴다. 스테이징 DB 가 없어서(프리뷰가 운영 Worker 를 본다)
 * 다른 선택지가 없다. 건드리는 것은 지정한 이메일의 사용자 문서 1건뿐이다.
 *
 * 재화 모델 주의:
 *   - points 는 재화가 아니다. access-control 은 points 를 읽지 않으며 차감 경로도 없다.
 *     (seed-test-account.mjs 가 points 를 넣는 것은 폐지된 코인 모델의 잔재다.)
 *   - 실제로 접근을 여는 것은 이용권(profileSubscription)과 월정석(membershipCreditLots)뿐이다.
 *
 * 모델 주의: User 스키마 정본은 worker/lib/models.js 하나다. 예전에는 스크립트 전용 사본이
 * 따로 있었는데 passTier 가 없고 tier enum 도 폐기된 honey_* 에 멈춰 있어 family 를 저장할 수
 * 없었다. 그 사본은 삭제됐고, 재발은 __tests__/worker/user-model-single-source.static.test.js 가 막는다.
 */
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { connectDb, mongoose, resolveMongoDbName } from "../worker/lib/db.js";
import { ProfileCard, User } from "../worker/lib/models.js";
import { grantMonthlyCreditLot } from "../worker/lib/monthly-credit-store.js";
import { HONEY_PASS_POLICY, PASS_TIERS } from "../worker/lib/profile-limits.js";

const root = process.cwd();
for (const name of [".env.cloudflare.local", ".env.local", ".env"]) {
  const file = path.join(root, name);
  if (fs.existsSync(file)) dotenv.config({ path: file, override: false, quiet: true });
}

function arg(name, fallback = "") {
  const index = process.argv.indexOf("--" + name);
  if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith("--")) {
    return String(process.argv[index + 1]).trim();
  }
  return fallback;
}

const email = arg("email", process.env.CD_PREVIEW_TEST_EMAIL || "").toLowerCase();
const password = arg("password", process.env.CD_PREVIEW_TEST_PASSWORD || "");
const stones = Number(arg("stones", process.env.CD_PREVIEW_TEST_STONES || "30000"));
const days = Number(arg("days", process.env.CD_PREVIEW_TEST_PASS_DAYS || "3650"));

function fail(message) {
  console.error("[seed-preview-test-account] " + message);
  process.exit(1);
}

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  fail("Set CD_PREVIEW_TEST_EMAIL in .env.local (or pass --email). Never hardcode it here.");
}
// 이 계정은 운영에서 유료 기능이 전부 열린다. 약한 비밀번호는 그대로 무료 이용권 배포다.
if (password.length < 16) {
  fail("Set CD_PREVIEW_TEST_PASSWORD in .env.local (or pass --password). Minimum 16 characters — this account has paid access in production.");
}
if (!Number.isInteger(stones) || stones < 0) fail("--stones must be a non-negative integer.");
if (!Number.isInteger(days) || days <= 0) fail("--days must be a positive integer.");

const mongoUri = String(process.env.MONGO_URI || process.env.MONGODB_URI || "").trim();
if (!mongoUri) fail("MONGO_URI is missing. This script needs the production connection string.");
process.env.MONGO_URI = mongoUri;

const familyPolicy = HONEY_PASS_POLICY.family;
const now = new Date();
const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

async function main() {
  await connectDb(process.env);
  // MONGODB_DB_NAME 만 읽으면 로컬에서 "(default db)" 로 보여, 어느 DB 에 쓰는지 모른 채
  // 운영에 쓰게 된다. 실제 해석기를 그대로 써서 대상 DB 를 눈으로 확인시킨다.
  console.log("[seed-preview-test-account] writing to db: " + resolveMongoDbName(process.env));

  const passwordHash = await bcrypt.hash(password, 10);
  // $set 만 쓴다. 기존 사용자를 지우거나 다른 필드를 되돌리지 않는다.
  await User.updateOne(
    { email },
    {
      $set: {
        email,
        passwordHash,
        name: arg("name", "Preview Family Tester"),
        role: "user",
        status: "active",
        localAuth: { enabled: true, activatedAt: now },
        "profileSubscription.tier": PASS_TIERS.FAMILY,
        "profileSubscription.passTier": PASS_TIERS.FAMILY,
        // source=event: 실제 결제가 아니라 운영자 지급이라는 뜻. 정산·환불 집계에서 구매와 섞이지 않는다.
        "profileSubscription.source": "event",
        "profileSubscription.planId": "cd_pass_family_30d",
        "profileSubscription.status": "active",
        "profileSubscription.maxCoveredCoin": familyPolicy.maxCoveredCoin,
        "profileSubscription.profileLimit": familyPolicy.maxProfiles,
        "profileSubscription.startedAt": now,
        "profileSubscription.expiresAt": expiresAt,
        "profileSubscription.autoRenewEnabled": false,
        "profileSubscription.cancelAtPeriodEnd": false,
      },
      $setOnInsert: { createdAt: now, birthDate: "1990-01-01", birthTime: "09:00", gender: "OTHER" },
    },
    { upsert: true },
  );

  const user = await User.findOne({ email }).select("_id profileSubscription").lean();
  if (!user) fail("Upsert reported success but the user could not be read back.");

  // 프로필 카드(생년월일)는 User.birthDate 같은 레거시 필드가 아니라 별도 ProfileCard 문서다.
  // 이게 없으면 프리뷰 로그인 직후에도 "선택된 프로필"이 없어 유료 기능마다 생년월일을 수동 입력해야
  // 한다. 고정 테스트 데이터라 매 실행 $set 으로 덮어써 드리프트 없이 유지한다.
  const previewProfileId = "preview-test-card";
  await ProfileCard.updateOne(
    { userId: user._id, profileId: previewProfileId },
    {
      $set: {
        userId: user._id,
        profileId: previewProfileId,
        name: "프리뷰 테스트",
        gender: "OTHER",
        birth: { year: 1990, month: 1, day: 1, hour: 9, minute: 0, calType: "solar" },
        location: { label: "서울", tz: "Asia/Seoul", lng: 127.0, lat: 37.5 },
      },
    },
    { upsert: true },
  );
  // 카드를 만드는 것과 "현재 선택된 카드"로 지정하는 것은 별개다(worker/routes/profile.js 가
  // User.destinyProfilesCurrentId 로 선택 카드를 판정). 이걸 안 하면 카드는 목록에만 있고 화면은
  // 여전히 미선택 상태로 뜬다.
  await User.updateOne({ _id: user._id }, { $set: { destinyProfilesCurrentId: previewProfileId } });

  if (stones > 0) {
    // lotId 로 멱등하다(userId+type+sourceId 유니크 인덱스). 재실행해도 중복 적립되지 않는다.
    await grantMonthlyCreditLot({ userId: user._id, lotId: "preview-test-seed", amount: stones });
  }

  const fresh = await User.findOne({ email }).select("profileSubscription").lean();
  const subscription = fresh?.profileSubscription || {};
  console.log("[seed-preview-test-account] ready");
  console.log("  email        : " + email);
  console.log("  pass tier    : " + subscription.passTier + " (tier=" + subscription.tier + ")");
  console.log("  pass expires : " + new Date(subscription.expiresAt).toISOString());
  console.log("  moonstones   : " + Number(subscription.membershipCreditBalance || 0));
  console.log("  profile card : " + previewProfileId + " (birth 1990-01-01 09:00, selected as current)");
  console.log("  profileLimit : " + subscription.profileLimit + " (0 = unlimited)");
  console.log("");
  console.log("  Family covers pass-eligible features without charge, but NOT profile card add/delete —");
  console.log("  those are passExcluded for every tier and still open the payment dialog.");
  console.log("  Premium consultations over " + 300 + " coins are fair-use limited per pass cycle.");
}

main()
  .then(async () => {
    await mongoose.connection.close().catch(() => {});
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("[seed-preview-test-account] FAILED: " + (error?.stack || error));
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  });

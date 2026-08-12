/**
 * 계정에 role:"admin" 을 부여/회수한다.
 *
 * 🔴 기본 동작은 dry-run 이다. 실제 쓰기는 `--apply` 를 명시해야만 일어난다.
 *
 * 왜 스크립트가 필요한가: 배포된 워커에는 role 을 admin 으로 만드는 경로가 **하나도 없다**
 * (worker/ 전체에 users.role $set 이 0건). 프로덕션에 role:"admin" 계정이 0명인 이유다.
 * 그래서 관리자 행위가 전부 공유 비밀번호 세션(flower-admin:<jti>)으로만 기록돼 사람을
 * 특정할 수 없었다.
 *
 * 🔴 부여의 부작용을 반드시 읽고 결정할 것 — 실행 시 화면에도 출력한다:
 *   1) 유료 AI 32개 지점이 전부 무료로 열린다(isAdmin(auth) → accessType:"admin").
 *      → 이 계정으로는 유료 결제 플로우 실환경 테스트가 불가능해진다.
 *   2) 임의 주문 취소/환불 권한이 붙는다(payments.js isAdminPaymentAuth).
 *   3) 정적 셸의 관리자 바이패스(index.html isAdminUser 등)도 함께 열린다.
 * 결제 실환경 테스트를 계속 하려면 관리 전용 계정을 따로 만들어 그쪽에 부여하는 편이 낫다.
 *
 * 실행:
 *   node scripts/grant-admin-role.mjs                                  # dry-run (기본 이메일)
 *   node scripts/grant-admin-role.mjs --email me@example.com --apply
 *   node scripts/grant-admin-role.mjs --email me@example.com --revoke --apply
 *   node scripts/grant-admin-role.mjs --list                           # 현재 admin 목록만 조회
 */

import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";
import { User } from "../worker/lib/models.js";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

const DEFAULT_EMAIL = "seongbae555@gmail.com";
const email = String(argValue("--email", DEFAULT_EMAIL) || "").trim().toLowerCase();
const apply = process.argv.includes("--apply");
const revoke = process.argv.includes("--revoke");
const listOnly = process.argv.includes("--list");
const targetRole = revoke ? "user" : "admin";

const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
  MONGO_IP_FAMILY: process.env.MONGO_IP_FAMILY || "4",
};

if (!env.MONGO_URI && !env.MONGODB_URI) {
  console.error("❌ MONGO_URI 또는 MONGODB_URI 환경변수가 필요합니다.");
  process.exit(1);
}

function maskEmail(value) {
  const [local, domain] = String(value || "").split("@");
  if (!domain) return "(invalid)";
  const head = local.slice(0, 2);
  return `${head}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
}

async function listAdmins() {
  const admins = await User.collection
    .find({ role: "admin" }, { projection: { email: 1, name: 1, status: 1, joinedAt: 1 } })
    .toArray();
  console.log(`\n📋 현재 role:"admin" 계정 ${admins.length}명`);
  for (const row of admins) {
    console.log(`  · ${maskEmail(row.email)}  status=${row.status || "(없음)"}  가입=${row.joinedAt ? new Date(row.joinedAt).toISOString().slice(0, 10) : "-"}`);
  }
  if (!admins.length) console.log("  (없음)");
  return admins;
}

async function main() {
  console.log("🔌 MongoDB 연결 중...");
  await connectDb(env);
  console.log("✅ 연결 완료\n");

  await listAdmins();
  if (listOnly) return;

  const user = await User.collection.findOne(
    { email },
    { projection: { email: 1, name: 1, role: 1, status: 1, joinedAt: 1 } },
  );

  if (!user) {
    console.error(`\n❌ 계정을 찾을 수 없습니다: ${maskEmail(email)}`);
    process.exitCode = 1;
    return;
  }
  // status 필드가 아예 없는 문서가 245건 중 37건 있다(감사 결과). 없음 = active 로 읽는다.
  const status = String(user.status || "active").toLowerCase();
  if (status === "withdrawn") {
    console.error(`\n❌ 탈퇴한 계정에는 권한을 바꿀 수 없습니다: ${maskEmail(email)}`);
    process.exitCode = 1;
    return;
  }

  const currentRole = String(user.role || "user").toLowerCase();
  console.log(`\n🎯 대상: ${maskEmail(email)}  (${user.name || "-"})`);
  console.log(`   현재 role=${currentRole} → 목표 role=${targetRole}`);

  if (currentRole === targetRole) {
    console.log("\n✅ 이미 목표 상태입니다. 변경할 것이 없습니다.");
    return;
  }

  if (!revoke) {
    console.log(`
⚠️  role:"admin" 부여의 부작용
   1) 유료 AI 32개 지점이 전부 무료로 열립니다 — 이 계정으로 유료 결제 실환경 테스트 불가
   2) 임의 주문 취소/환불 권한이 붙습니다
   3) 정적 셸의 관리자 바이패스도 함께 열립니다
   결제 테스트를 계속 하려면 관리 전용 계정을 따로 만들어 그쪽에 부여하세요.`);
  }

  if (!apply) {
    console.log("\n🔍 DRY-RUN — 아무것도 쓰지 않았습니다. 실제로 적용하려면 --apply 를 붙이세요.");
    return;
  }

  const result = await User.collection.updateOne(
    { _id: user._id, role: currentRole },
    { $set: { role: targetRole } },
  );
  if (result.modifiedCount !== 1) {
    console.error(`\n❌ 변경 실패 (modifiedCount=${result.modifiedCount}). 그 사이 role 이 바뀌었을 수 있습니다.`);
    process.exitCode = 1;
    return;
  }

  console.log(`\n✅ 적용 완료 — ${maskEmail(email)} role: ${currentRole} → ${targetRole}`);
  console.log("   되돌리려면: node scripts/grant-admin-role.mjs --email <addr> --revoke --apply");
  await listAdmins();
}

main()
  .catch((error) => {
    console.error("❌ 실패:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log("\n🔌 MongoDB 연결 종료");
  });

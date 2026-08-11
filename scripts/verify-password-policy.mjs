/**
 * 비밀번호 정책·유출 차단 회귀 가드.
 *
 * 🔴 HIBP 실호출은 하지 않는다 — fetchImpl 주입으로 응답을 mock 한다
 * (정본 패턴: scripts/verify-mindscan-reading.mjs). 실호출이 필요하면 --live 뒤로 격리하되,
 * 이 스크립트의 기본 실행에는 절대 넣지 말 것.
 *
 *   node scripts/verify-password-policy.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkPasswordBreached, isLocallyBlockedPassword } from "../worker/lib/password-breach.js";
import { PBKDF2_MAX_ITERATIONS, hashPassword, verifyPassword } from "../worker/lib/password.js";
import {
  MIN_NEW_PASSWORD_LENGTH,
  validateLoginPayload,
  validateNewPassword,
  validateRegisterPayload,
} from "../worker/lib/validation.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checks = [];
function check(label, fn) {
  checks.push({ label, fn });
}

/* ─────────────────── 정책 경계 ─────────────────── */

check("신규 비밀번호는 MIN_NEW_PASSWORD_LENGTH 미만을 거절한다", () => {
  assert.equal(MIN_NEW_PASSWORD_LENGTH, 10);
  assert.equal(validateNewPassword("Ab3!efghi").isValid, false, "9자가 통과했습니다.");
  assert.equal(validateNewPassword("Ab3!efghij").isValid, true, "10자가 거절됐습니다.");
});

check("신규 비밀번호에 이메일 로컬파트·이름을 넣을 수 없다", () => {
  assert.equal(
    validateNewPassword("seongbae555xyz", { email: "seongbae555@gmail.com" }).isValid,
    false,
    "이메일 로컬파트를 포함한 비밀번호가 통과했습니다.",
  );
  assert.equal(
    validateNewPassword("hongildong99!", { name: "hongildong" }).isValid,
    false,
    "이름을 포함한 비밀번호가 통과했습니다.",
  );
  // 2자 이하 이름·로컬파트는 우연 일치가 너무 잦아 검사 대상이 아니다.
  assert.equal(validateNewPassword("Quiet!Harbor42", { name: "김", email: "a@b.com" }).isValid, true);
});

check("가입 검증기는 신규 비밀번호 정책을 그대로 쓴다", () => {
  const base = {
    name: "테스터",
    email: "policy-test@example.com",
    ageAttested: true,
    termsAccepted: true,
    privacyAccepted: true,
  };
  assert.equal(validateRegisterPayload({ ...base, password: "Ab3!efghi" }).isValid, false);
  assert.equal(validateRegisterPayload({ ...base, password: "Quiet!Harbor42" }).isValid, true);
});

check("🔴 로그인 검증기의 하한은 8자로 유지된다(기존 회원 잠금 방지)", () => {
  // 이 단언을 통과시키려고 값을 올리지 말 것. 8~9자로 가입했던 기존 회원이 전부 로그인 불가가 된다.
  const result = validateLoginPayload({ email: "legacy@example.com", password: "Ab3!efgh" });
  assert.equal(result.isValid, true, "8자 기존 비밀번호가 로그인에서 거절됐습니다.");
  assert.equal(validateLoginPayload({ email: "legacy@example.com", password: "Ab3!efg" }).isValid, false);
});

/* ─────────────────── 유출 차단 ─────────────────── */

check("리포에 커밋됐던 시드 비밀번호는 네트워크 없이 차단된다", () => {
  for (const value of ["test!1234", "inicis1234!", "LocalTest!2026", "CodeDestiny!2026"]) {
    assert.equal(isLocallyBlockedPassword(value), true, `${value} 가 로컬 blocklist 를 통과했습니다.`);
  }
});

check("HIBP 조회는 접두사 5자만 보내고 접미사를 로컬 비교한다", async () => {
  // "Quiet!Harbor42" 의 SHA-1 을 미리 알 수 없으므로, mock 이 받은 접두사로 응답을 만들어
  // "일치하면 차단"을 확인한다. 요청 URL 에 접두사 5자 외에는 아무것도 실리지 않는지도 본다.
  const password = "Quiet!Harbor42";
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
  const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  const seen = [];

  const hitFetch = async (url, init) => {
    seen.push({ url: String(url), padding: init?.headers?.["Add-Padding"] });
    return {
      ok: true,
      text: async () => `0000000000000000000000000000000000000:0\n${hash.slice(5)}:42\n`,
    };
  };
  const hit = await checkPasswordBreached(password, { fetchImpl: hitFetch });
  assert.equal(hit.breached, true, "유출 목록에 있는 비밀번호가 통과했습니다.");
  assert.equal(hit.source, "hibp");
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, `https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`);
  assert.equal(seen[0].padding, "true", "Add-Padding 헤더가 빠졌습니다(응답 길이로 접두사 추론 가능).");
  assert.ok(!seen[0].url.includes(hash.slice(5)), "🔴 해시 접미사가 외부로 나갔습니다.");
  assert.ok(!seen[0].url.includes(password), "🔴 비밀번호 원문이 외부로 나갔습니다.");

  const missFetch = async () => ({ ok: true, text: async () => "ABCDEF0123456789ABCDEF0123456789ABCDE:9\n" });
  const miss = await checkPasswordBreached(password, { fetchImpl: missFetch });
  assert.equal(miss.breached, false);
  assert.equal(miss.checked, true);
});

check("count 0 패딩 줄은 유출로 세지 않는다", async () => {
  const password = "Quiet!Harbor42";
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
  const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  const paddedFetch = async () => ({ ok: true, text: async () => `${hash.slice(5)}:0\n` });
  const result = await checkPasswordBreached(password, { fetchImpl: paddedFetch });
  assert.equal(result.breached, false, "패딩(count 0) 줄을 유출로 판정했습니다.");
});

check("외부 조회 실패는 fail-open 이지만 checked=false 로 구분된다", async () => {
  const boomFetch = async () => { throw new Error("network down"); };
  const result = await checkPasswordBreached("Quiet!Harbor42", { fetchImpl: boomFetch });
  assert.equal(result.breached, false, "조회 실패가 가입을 막았습니다(fail-open 이어야 합니다).");
  assert.equal(result.checked, false, "조회 실패와 정상 통과가 구분되지 않습니다.");

  const errorStatusFetch = async () => ({ ok: false, text: async () => "" });
  const nonOk = await checkPasswordBreached("Quiet!Harbor42", { fetchImpl: errorStatusFetch });
  assert.equal(nonOk.breached, false);
  assert.equal(nonOk.checked, false);

  // 로컬 blocklist 는 네트워크가 죽어도 계속 막는다.
  const blocked = await checkPasswordBreached("test!1234", { fetchImpl: boomFetch });
  assert.equal(blocked.breached, true, "네트워크 장애 시 로컬 blocklist 까지 무력화됐습니다.");
  assert.equal(blocked.source, "local");
});

/* ─────────────────── 배선 가드 ─────────────────── */

check("가입·비밀번호 변경 라우트가 유출 검사를 실제로 호출한다", () => {
  const source = fs.readFileSync(path.join(repoRoot, "worker/routes/auth.js"), "utf8");
  const calls = source.match(/checkPasswordBreached\(/g) || [];
  assert.ok(calls.length >= 2, `checkPasswordBreached 호출이 ${calls.length}곳뿐입니다(가입·변경 2곳 필요).`);
  assert.ok(
    /path === "\/password"/.test(source),
    "POST /api/auth/password 라우팅이 없습니다.",
  );
});

check("🔴 비밀번호 변경 라우트는 same-origin CSRF 가드 대상이다", () => {
  const source = fs.readFileSync(path.join(repoRoot, "worker/routes/auth.js"), "utf8");
  const guard = source.slice(source.indexOf("function requiresSameOriginAuthGuard"));
  const body = guard.slice(0, guard.indexOf("\n}"));
  assert.ok(body.includes('path === "/password"'), "requiresSameOriginAuthGuard 에서 /password 가 빠졌습니다.");
});

check("🔴 비밀번호 변경은 새 세션 발급 전에 기존 세션을 전부 폐기한다", () => {
  const source = fs.readFileSync(path.join(repoRoot, "worker/routes/auth.js"), "utf8");
  const start = source.indexOf("async function handleChangePassword(");
  assert.ok(start > 0, "handleChangePassword 가 없습니다.");
  const fn = source.slice(start, source.indexOf("\n}\n", start));
  const revokeAt = fn.indexOf("revokeAllUserRefreshSessions(");
  const issueAt = fn.indexOf("createAuthSuccessResponse(");
  assert.ok(revokeAt > 0, "기존 세션 폐기가 없습니다 — 훔친 세션이 그대로 살아남습니다.");
  assert.ok(issueAt > revokeAt, "새 세션을 먼저 만들면 그 세션까지 폐기됩니다. 순서를 지키세요.");
});

check("🔴 PBKDF2 반복수가 Cloudflare Workers 상한(100,000)을 넘지 않는다", async () => {
  // 워커의 WebCrypto 는 100,000 초과를 거부한다("Pbkdf2 failed: iteration counts above 100000...").
  // Node 에는 그 상한이 없어서 jest 도 이 스크립트도 그냥 돌아가므로, **값 자체**를 단언한다.
  // 600,000 으로 올렸다가 이메일 회원가입이 프로덕션에서 500 으로 죽은 적이 있다(2026-08-12).
  assert.equal(PBKDF2_MAX_ITERATIONS, 100000);

  const hash = await hashPassword("Quiet!Harbor42");
  const [prefix, iterationsRaw] = hash.split("$");
  assert.equal(prefix, "pbkdf2-sha256", `해시 포맷이 바뀌었습니다: ${prefix}`);
  assert.ok(
    Number(iterationsRaw) > 0 && Number(iterationsRaw) <= PBKDF2_MAX_ITERATIONS,
    `반복수 ${iterationsRaw} 는 워커에서 동작하지 않습니다(상한 ${PBKDF2_MAX_ITERATIONS}).`,
  );
  assert.equal(await verifyPassword("Quiet!Harbor42", hash), true, "방금 만든 해시를 검증하지 못했습니다.");
});

check("시드 스크립트에 평문 비밀번호가 되살아나지 않았다", () => {
  const files = [
    "scripts/ensure-hanyuzu-monthly-stone-user.mjs",
    "scripts/seed-inicis-test-account.mjs",
    "scripts/seed-test-account.mjs",
    "scripts/seed-dev-users.ts",
  ];
  for (const file of files) {
    const source = fs.readFileSync(path.join(repoRoot, file), "utf8");
    // 주석의 경고 문구는 제외하고, 실제 코드 라인만 본다.
    const codeLines = source.split("\n").filter((line) => !line.trim().startsWith("//"));
    for (const literal of ["test!1234", "inicis1234!", "CodeDestiny!2026"]) {
      const offender = codeLines.find((line) => line.includes(literal));
      assert.equal(offender, undefined, `${file} 에 평문 비밀번호 "${literal}" 가 되살아났습니다: ${offender}`);
    }
  }
});

const failures = [];
for (const { label, fn } of checks) {
  try {
    await fn();
    console.log(`  ok  ${label}`);
  } catch (error) {
    failures.push(label);
    console.error(`  FAIL ${label}\n       ${error?.message || error}`);
  }
}

if (failures.length > 0) {
  console.error(`\n[verify-password-policy] ${failures.length}건 실패`);
  process.exit(1);
}
console.log(`\n[verify-password-policy] ${checks.length}건 통과`);

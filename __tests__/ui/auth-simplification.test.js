const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("auth return path applies internal-only redirect guards", () => {
  const source = read("app/_lib/auth-return.js");
  assert.match(source, /!raw\.startsWith\("\/"\)/);
  assert.match(source, /raw\.startsWith\("\/\/"\)/);
  assert.match(source, /raw\.includes\("\\\\"\)/);
  assert.match(source, /parsed\.origin !== base/);
  assert.match(source, /AUTH_ROUTE_PREFIXES/);
});

test("shared auth shell keeps email and social login in one mobile-first surface", () => {
  const shell = read("app/components/auth/AuthShell.tsx");
  assert.match(shell, /type=\"email\"/);
  assert.match(shell, /autoComplete=\{isSignup \? \"new-password\" : \"current-password\"\}/);
  assert.match(shell, /\["google", "naver", "kakao"\]/);
  // 🔴 만 14세 확인은 체크박스가 아니라 생년이다(2026-08-25). 카카오는 로그인 폼이, 네이버는
  // 제공 항목이 그 확인을 대신하므로 그때만 칸이 숨는다 — 구글·이메일 가입에는 항상 남는다.
  assert.match(shell, /birthYear: birthYear.trim()/);
  assert.match(shell, /id="auth-birth-year"/);
  assert.match(shell, /needsBirthYear/);
  assert.doesNotMatch(shell, /ageAttested/);
  assert.match(shell, /min-h-\[100dvh\]/);
  // 가입 화면이 받는 것은 이름·이메일·비밀번호·휴대폰 번호·필수동의뿐이다.
  // 🔴 번호는 2026-08-19 부터 필수 입력이다 — 카카오 개인정보 동의항목 심사가 "자체 회원가입에서도
  // 전화번호를 수집할 것"을 요구한다. 생년월일은 예전과 같이 여기서 받지 않는다(운세 기능에서 받는다).
  assert.doesNotMatch(shell, /birthDate|birthTime|gender/);
  assert.match(shell, /id="auth-phone"/);
  assert.match(shell, /type="tel"/);
  // 공급자가 번호를 넘긴 소셜 가입에서만 입력칸이 숨는다.
  assert.match(shell, /socialPhoneProvided/);
});

test("web auth response does not expose bearer tokens and post-login bootstrap is bounded", () => {
  const workerAuth = read("worker/routes/auth.js");
  const authStore = read("app/_lib/auth-store.ts");
  assert.match(workerAuth, /\.\.\.\(isMobileAppAuthRequest\(request\) \? \{/);
  assert.match(authStore, /if \(state\.isLoggingIn\)/);
  assert.match(authStore, /if \(refreshInFlight\) return refreshInFlight/);
  assert.match(authStore, /refreshAccessState/);
  assert.match(authStore, /if \(accessStateSupported\) return/);
  assert.match(authStore, /export function hydrateAuthSuccessUser/);
  assert.match(authStore, /void syncPostLoginData\(expectedAuthMutationSeq\)/);
  assert.match(authStore, /status: "temporarilyOffline"/);
  assert.match(authStore, /status: "expired"/);
});

test("Resend secret sync is env-only and can target one key", () => {
  const emailScript = read("scripts/test-resend-email.mjs");
  const syncScript = read("scripts/sync-cloudflare-worker-secrets.mjs");
  assert.match(emailScript, /process\.env\.RESEND_API_KEY/);
  assert.doesNotMatch(emailScript, /re_[A-Za-z0-9]{20,}/);
  assert.match(syncScript, /--only-key=/);
  assert.match(syncScript, /normalizeEnvKey\(key\) === onlyKey/);
});

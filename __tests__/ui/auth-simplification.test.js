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
  assert.match(shell, /ageAttested: age/);
  assert.match(shell, /min-h-\[100dvh\]/);
  // 가입 화면은 생년 정보를 받지 않는다 — 그건 각 운세 기능이 프로필 카드로 따로 받는다.
  assert.doesNotMatch(shell, /birthDate|birthTime|gender/);
  // 🔴 휴대폰 번호는 **소셜 가입 마무리(ticket)에서만** 묻는 선택 항목이다. 이메일 가입 폼으로
  // 새면 2026-08-15 에 정리한 "가입 화면은 번호를 받지 않는다"로 되돌아가므로 노출 조건을 고정한다.
  assert.match(shell, /\{ticket && <Field id="auth-phone"/);
  assert.doesNotMatch(shell, /\{isSignup && <Field id="auth-phone"/);
  // 값이 있을 때만 필수 동의를 요구하고, 없으면 그대로 통과해야 한다(건너뛰기 보존).
  assert.match(shell, /if \(hasPhoneInput\(phone\) && !phoneNumber\)/);
  assert.match(shell, /if \(phoneNumber && !phoneConsent\)/);
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

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
  // 가입 화면이 받는 것은 이름·이메일·비밀번호·필수동의뿐이다. 생년월일과 마찬가지로
  // 휴대폰 번호도 여기서 받지 않는다 — 번호는 소셜 공급자 값이거나 첫 결제 때 1회 입력이다.
  assert.doesNotMatch(shell, /birthDate|birthTime|gender/);
  assert.doesNotMatch(shell, /phoneNumber|phoneHelp|type="tel"/);
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

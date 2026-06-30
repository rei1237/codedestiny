import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const authRouteSource = readFileSync(resolve(root, "worker/routes/auth.js"), "utf8");
const authLibSource = readFileSync(resolve(root, "worker/lib/auth.js"), "utf8");
const modelsSource = readFileSync(resolve(root, "worker/lib/models.js"), "utf8");
const loginClientSource = readFileSync(resolve(root, "app/login/LoginClient.tsx"), "utf8");
const signupClientSource = readFileSync(resolve(root, "app/signup/SignupClient.tsx"), "utf8");

function assertContains(source, marker, label = marker) {
  assert.ok(source.includes(marker), `${label}: missing marker`);
}

function assertNotContains(source, marker, label = marker) {
  assert.ok(!source.includes(marker), `${label}: unexpected marker`);
}

function sliceBetween(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0, `${label}: missing start marker`);
  assert.ok(end > start, `${label}: missing end marker`);
  return source.slice(start, end);
}

const registerSource = sliceBetween(
  authRouteSource,
  "async function handleRegister",
  "async function handleLogin",
  "register flow",
);
const loginSource = sliceBetween(
  authRouteSource,
  "async function handleLogin",
  "async function handleMe",
  "login flow",
);

assertContains(
  modelsSource,
  'email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: emailRegex }',
  "User email unique constraint",
);
assertContains(registerSource, "User.create(", "register creates user through User model");
assertContains(registerSource, "error && error.code === 11000", "register duplicate key race guard");
assertContains(registerSource, '"duplicate_email"', "register duplicate email response");

assertContains(authLibSource, "function isProductionAuthEnv", "production secret environment guard");
assertContains(authLibSource, "JWT access token secret is required in production.", "access secret fail closed");
assertContains(authLibSource, "JWT refresh token secret is required in production.", "refresh secret fail closed");

assertContains(loginSource, "getLoginRateLimitState(request, email, env)", "login rate-limit lookup");
assertContains(loginSource, "buildLoginRateLimitedResponse(loginRateLimitState)", "login rate-limit response");
assertContains(loginSource, "buildInvalidLoginResponse()", "generic invalid login response");
assertContains(authRouteSource, 'code: "invalid_credentials"', "invalid credential response code");
assertContains(authRouteSource, 'code: "rate_limited"', "rate limited response code");
assertNotContains(loginSource, 'code: "email_not_found"', "login account enumeration response");
assertNotContains(loginSource, 'code: "password_mismatch"', "login password mismatch response");

assertContains(loginClientSource, "if (loginSubmitting || oauthRedirecting !== null || callbackProcessing) return;", "login duplicate submit guard");
assertContains(loginClientSource, "const formDisabled = isBusy;", "login disabled state");
assertContains(loginClientSource, "disabled={formDisabled}", "login submit disabled binding");
assertContains(loginClientSource, "setError(copy.passwordResetPending)", "password reset pending UX guard");
assertContains(signupClientSource, "if (loading || socialLoading !== null) return;", "signup duplicate submit guard");
assertContains(signupClientSource, "disabled={loading || socialLoading !== null || !hasRequiredConsents}", "signup submit disabled binding");
assertContains(signupClientSource, '{loading ? "회원가입 중..." : "아이디/비밀번호로 회원가입"}', "signup loading label");

console.log("[verify-auth-p0p1-regression] PASS");

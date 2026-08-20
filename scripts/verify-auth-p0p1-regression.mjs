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
/* 로그인·가입 폼의 실체는 이 한 파일이다. app/login·app/signup 의 *Client.tsx 는 얇은 위임 셸이 됐고,
   이 가드가 어디에도 배선돼 있지 않던 동안(2026-08-15 배선) 아래 단언 7개가 전부 옛 파일의 옛 식별자를
   가리킨 채 썩어 있었다 — 미배선 가드가 왜 가드가 아닌지의 실물이다. */
const authShellSource = readFileSync(resolve(root, "app/components/auth/AuthShell.tsx"), "utf8");

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

// 라우트 셸은 AuthShell 에 위임하기만 한다. 여기에 별도 폼이 다시 생기면 아래 단언들이 지키는
// 중복 제출·비활성화 방어가 그 사본에는 없게 되므로, 위임 자체를 먼저 못박는다.
assertContains(loginClientSource, '<AuthShell initialMode="login" />', "login route delegates to AuthShell");
assertContains(signupClientSource, '<AuthShell initialMode="signup" />', "signup route delegates to AuthShell");

/* 중복 제출 방어 — 이메일 로그인·이메일 가입·소셜 셋 다. 두 번 눌러 두 번 나가면 로그인은 레이트리밋
   카운터를 올리고, 가입은 11000 경합을 만들고, 소셜은 OAuth code 를 두 번 교환한다. */
assertContains(authShellSource, "if (busy) return;", "email submit duplicate guard");
assertContains(authShellSource, "if (socialBusy || busy) return;", "social submit duplicate guard");

// 진행 중에는 제출·소셜 버튼이 모두 잠기고, 잠긴 사실이 라벨로도 보여야 한다.
assertContains(authShellSource, "disabled={busy || Boolean(socialBusy)}", "submit disabled binding");
assertContains(authShellSource, "disabled={Boolean(socialBusy) || busy}", "social disabled binding");
assertContains(authShellSource, "{busy ? copy.processing :", "busy label binding");

// 가입은 필수 동의 없이 진행되지 않는다.
assertContains(authShellSource, "!privacy || !terms || !age", "signup required-consent guard");

/* 🔴 2026-08-15 "로그아웃 → 재로그인 → 즉시 튕김" 회귀 가드 (P0-3·P0-4a).
   셋 다 되살아나기 쉬운 형태다 — 각각 "세션 정리를 더 확실히 한다"처럼 보이기 때문이다. */

// P0-4a — GET /api/auth/me 는 읽기 전용이다. 여기서 Set-Cookie 삭제를 붙이면 늦게 도착한 응답이
// 재로그인으로 방금 발급된 쿠키를 지우고, retryOn401 → refresh 회복 경로까지 자기 자격증명을 잃는다.
assertContains(
  authRouteSource,
  "const unauthenticatedJson = (body, init) => json(body, init);",
  "handleMe must not attach cookie-clearing headers",
);

// P0-3 — '재사용'은 회전으로 죽은 토큰의 재생일 때만이다. 로그아웃으로 죽은 토큰(replacedByTokenHash 가 "")의
// 늦은 요청까지 재사용으로 보면 재로그인 세션이 통째로 폐기된다. 진짜 탈취는 그대로 전 세션 폐기다.
assertContains(
  authRouteSource,
  "const revokedByRotation = !priorSession || Boolean(priorSession.replacedByTokenHash);",
  "refresh reuse detection must distinguish rotation-revoked tokens",
);
assertContains(
  authRouteSource,
  "if (revokedByRotation) await revokeAllUserRefreshSessions(userId);",
  "reuse sweep must be gated on rotation-revoked tokens",
);
assertContains(
  authRouteSource,
  "if (revokedByRotation) clearAuthCookies(response, request, env);",
  "stale-after-logout refresh must not clear the new session's cookies",
);

// P0-3 — UA 불일치 경로. 제시된 토큰은 회전 선점에서 이미 revoked 이므로 전 세션 일괄 폐기는
// 이 토큰을 무력화하는 데 필요하지 않고, 정당한 브라우저 업데이트에서 다른 기기만 끊는다.
const sessionChangedSource = sliceBetween(
  authRouteSource,
  "if (!refreshSessionMatchesRequest(session, request)) {",
  "Session changed. Please sign in again.",
  "session-changed branch",
);
assertNotContains(
  sessionChangedSource,
  "revokeAllUserRefreshSessions",
  "UA mismatch must not revoke every session",
);

console.log("[verify-auth-p0p1-regression] PASS");

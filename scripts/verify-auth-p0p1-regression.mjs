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

// 가입 동의 — 2026-08-25 에 **클릭에서 제출로** 옮겼다(체크박스 2개 제거).
//
// 왜: 카카오·네이버로 가입하면 그 계정에서 이미 동의를 거치므로 우리 화면에 채울 것이 남으면
// 안 된다는 요구였다. 없앤 것은 **클릭이지 고지도 기록도 아니다** — 그래서 이 가드가 셋을 함께 본다.
//   ① 화면이 무엇에 동의하는지 보여준다(고지 문장 + 약관·방침 링크)
//   ② 클라이언트가 동의를 실어 보낸다
//   ③ 🔴 서버가 여전히 요구한다 — 여기가 뚫리면 동의 없는 계정이 생긴다
// 🔴 체크박스로 되돌리려면 세 단언을 함께 뒤집을 것. 하나만 지우면 "고지는 있는데 기록이 없다"
//    거나 "기록은 있는데 화면에 근거가 없다" 는 상태가 조용히 만들어진다.
assertContains(authShellSource, "{copy.agreeOnSubmit}", "signup consent notice must be on screen");
assertContains(authShellSource, 'href="/terms"', "signup consent notice must link the terms");
assertContains(authShellSource, 'href="/privacy"', "signup consent notice must link the privacy policy");
assertContains(authShellSource, "privacyAccepted: true, termsAccepted: true",
  "the signup request must still carry consent — submitting is the consent");
assertContains(authRouteSource, 'body?.termsAccepted !== true || body?.privacyAccepted !== true',
  "🔴 social signup must still refuse without consent — the provider does not agree to our terms for us");
assertContains(authShellSource, "needsBirthYear && !isBirthYearOk(birthYear)", "signup age guard");

/* 🔴 소셜 가입이 **화면 없이** 끝나는 경로 (2026-08-25).
   카카오·네이버는 인증 후 우리 화면을 띄우지 않고 콜백에서 계정을 만든다. 판정 자체는
   __tests__/worker/auth.social-phone-scope.test.js 가 값으로 확인하고, 여기서는 그 판정이
   **실제로 배선돼 있는지**를 본다 — 판정 함수만 살아 있고 콜백이 안 쓰면 아무 일도 안 일어난다. */

// 두 콜백 분기(google·naver / kakao)가 모두 조건부 생성이어야 한다.
assert.equal(
  authRouteSource.split("createIfMissing: autoSignup.canAutoCreate").length - 1,
  2,
  "both OAuth callbacks must create the account only when the provider settled the age",
);

// 🔴 미성년은 티켓조차 받지 못해야 한다. 티켓을 주면 가입 마무리 화면에서 생년을 다시 적어
//    우회할 수 있고, 그러면 공급자가 알려 준 나이를 우리가 스스로 버리는 셈이다.
//    그래서 "!socialUser.user 직후"라는 **위치**까지 고정한다 — 뒤로 밀리면 티켓이 먼저 나간다.
{
  const marker = "if (!socialUser.user) {";
  let cursor = 0;
  let branches = 0;
  for (;;) {
    const at = authRouteSource.indexOf(marker, cursor);
    if (at < 0) break;
    branches += 1;
    const head = authRouteSource.slice(at, authRouteSource.indexOf("buildSocialSignupTicket", at));
    assert.ok(
      head.includes("if (autoSignup.underage) return buildOAuthFailureRedirect"),
      "underage must be refused before a signup ticket is issued",
    );
    cursor = at + marker.length;
  }
  assert.equal(branches, 2, "expected exactly the two social callback branches");
}

// 🔴 화면이 없어졌으므로 동의 고지는 **버튼을 누르기 전**에 보여야 한다. /login 에서 카카오를
//    눌러도 계정이 생기므로 로그인 화면에도 있어야 한다 — 소셜 버튼 묶음 안에 둔 이유다.
assertContains(
  authShellSource,
  "{copy.providerPolicy}</p><section aria-label={copy.agreeOnSubmit}",
  "the consent notice must sit with the social buttons so it shows before the provider screen",
);

// 이름은 더 이상 받지 않는다 — 소셜은 공급자가, 이메일은 서버가 이메일 아이디에서 만든다.
assertNotContains(authShellSource, 'id="auth-name"', "signup must not ask for a name");
assertContains(
  readFileSync(resolve(root, "worker/lib/validation.js"), "utf8"),
  "const name = deriveNameFromEmail(email);",
  "🔴 the display name must come from the server, not from whatever the client posts",
);

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

/**
 * @jest-environment node
 *
 * "로그인은 됐는데 화면은 게스트" 회귀 가드.
 *
 * 사고 경위(2026-08-09, preview 에서 발견): 로그인 응답이 세션 쿠키(fortune_auth_token /
 * fortune_auth_refresh)는 정상 발급하는데 **힌트 쿠키(fortune_auth_role)는 안 붙였다.**
 * appendAuthRoleCookie 호출부가 OAuth 콜백 한 곳뿐이었고, 이메일/비밀번호 로그인이 지나는
 * 공통 경로 createAuthSuccessResponse 는 appendAuthCookies 만 불렀다.
 *
 * 왜 치명적인가: 세션 쿠키는 httpOnly 라 클라이언트가 읽을 수 없다. 그래서 클라이언트는
 * "로그인했나"를 힌트로 판단하는데, 힌트가 없으면 **서버에 묻지도 않고** 게스트로 단정한다
 *   · app/_lib/user-session-cache.ts — no_auth_hint 로 /api/auth/me 를 클라이언트에서 단축 응답
 *   · js/core/index-inline-runtime.js __cdHasAuthToken — 셸의 로그인 판정
 * 결과: 유효한 세션을 들고도 로그아웃 화면이 뜨고, 이용권 보유자에게 결제창이 떴다.
 *
 * 평소에는 React 가 로그인 직후 localStorage 를 채워 증상이 가려졌다. 그 쓰기가 없거나 늦은
 * 진입(프로그램적 로그인, 리다이렉트 직후 새 문서, 저장소 차단 브라우저)에서만 드러나서
 * 리뷰로 잡기 어려웠다 — 그래서 가드를 코드에 박는다.
 *
 * 고정하는 성질: 세션 쿠키를 발급하는 모든 성공 경로는 힌트 쿠키도 **같은 응답에** 붙인다.
 */

import fs from "node:fs";
import path from "node:path";

const authSource = fs.readFileSync(
  path.join(process.cwd(), "worker/routes/auth.js"),
  "utf8",
);

/**
 * 함수 본문을 중괄호 균형으로 잘라낸다.
 * 🔴 이름 grep 으로 판단하지 않는다(CLAUDE.md 원칙 6) — 파일 어딘가에 두 이름이 함께 존재하는 것과
 * **같은 함수 안에서 함께 불리는 것**은 다른 문제다. 매개변수 목록의 기본값 중괄호를 본문 시작으로
 * 오인하지 않도록 괄호를 먼저 건너뛴다.
 */
function sliceFunction(source, header) {
  const start = source.indexOf(header);
  expect(start).toBeGreaterThanOrEqual(0);
  let paren = 0;
  let i = start;
  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "(") paren += 1;
    else if (ch === ")") {
      paren -= 1;
      if (paren === 0) {
        i += 1;
        break;
      }
    }
  }
  let depth = 0;
  let seenBody = false;
  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") {
      depth += 1;
      seenBody = true;
    } else if (ch === "}") {
      depth -= 1;
      if (seenBody && depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces for ${header}`);
}

const SESSION_COOKIE_EMITTERS = [
  ["로그인·회원가입 공통 성공 경로", "async function createAuthSuccessResponse("],
  ["로컬 개발 로그인 경로", "async function createLocalDevAuthSuccessResponse("],
];

describe("세션 쿠키를 내는 경로는 로그인 힌트 쿠키도 함께 낸다", () => {
  test.each(SESSION_COOKIE_EMITTERS)("%s", (_label, header) => {
    const fn = sliceFunction(authSource, header);
    expect(fn).toMatch(/appendAuthCookies\(response, request, env,/);
    expect(fn).toMatch(/appendAuthRoleCookie\(response, request, env, user\)/);
  });

  test("힌트 쿠키 수명은 리터럴이 아니라 refresh 쿠키 수명을 따라간다", () => {
    // 고정 7일이던 시절, 리프레시(14일)보다 힌트가 먼저 죽어서 8~14일차에 돌아온 정상 인증
    // 사용자가 힌트를 잃고 "로그인이 필요합니다"를 봤다. 두 값을 따로 관리하면 또 어긋난다.
    const fn = sliceFunction(authSource, "function appendAuthRoleCookie(");
    expect(fn).toMatch(/maxAge: cookieOptions\.refreshMaxAgeSec/);
    expect(fn).not.toMatch(/maxAge:\s*\d/);
  });
});

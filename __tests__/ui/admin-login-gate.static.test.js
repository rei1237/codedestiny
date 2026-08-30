const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

// 🔴 이 테스트가 막는 결함(2026-08-13 ~ 08-30 실사고, 관리자 콘솔 전체 사용 불가):
//    next.config.mjs 가 trailingSlash:true 라 배포본에서 usePathname() 은 "/admin/login/" 을 준다.
//    AdminShell 의 BARE_ROUTES 는 "/admin/login"(슬래시 없음)이라 매치되지 않았고, 로그인 화면이
//    자기 인증 게이트에 걸려 토큰 없음 → redirectToAdminLogin → 308 → 다시 게이트로 무한 왕복했다.
//    화면에는 "확인 중..." 만 영원히 남는다.

test("관리자 셸이 pathname 을 정규화한 뒤 BARE_ROUTES 와 비교한다", () => {
  const shell = read("app/admin/_components/AdminShell.tsx");

  assert.ok(
    shell.includes('import { normalizeAppPathname } from "@/app/app/_lib/app-route";'),
    "AdminShell 이 normalizeAppPathname 을 가져오지 않는다",
  );
  assert.ok(
    shell.includes('const pathname = normalizeAppPathname(usePathname() || "");'),
    "AdminShell 이 usePathname() 을 정규화 없이 쓴다 — 후행 슬래시에서 무한 리다이렉트가 된다",
  );
});

test("BARE_ROUTES 항목에 후행 슬래시가 없다(정규화가 유일한 계약)", () => {
  const shell = read("app/admin/_components/AdminShell.tsx");
  const start = shell.indexOf("const BARE_ROUTES");
  assert.ok(start > 0, "BARE_ROUTES 선언을 찾지 못했다");
  const line = shell.slice(start, shell.indexOf(";", start));

  const routes = line.split('"').filter((_, index) => index % 2 === 1);
  assert.ok(routes.length > 0, "BARE_ROUTES 가 비었다");
  for (const route of routes) {
    assert.ok(route.startsWith("/admin/"), `BARE_ROUTES 항목이 관리자 경로가 아니다: ${route}`);
    assert.ok(!route.endsWith("/"), `BARE_ROUTES 항목에 후행 슬래시가 있다: ${route}`);
  }
});

test("로그인 리다이렉트가 멱등하다(로그인 화면에서는 이동하지 않는다)", () => {
  const api = read("app/admin/_lib/admin-api.ts");
  const start = api.indexOf("export function redirectToAdminLogin");
  assert.ok(start > 0, "redirectToAdminLogin 을 찾지 못했다");
  const stop = api.indexOf("/** 워커 503", start);
  assert.ok(stop > start, "redirectToAdminLogin 다음 선언을 찾지 못했다");
  const body = api.slice(start, stop);

  assert.ok(
    body.includes("normalizeAppPathname(window.location.pathname)"),
    "현재 경로를 정규화하지 않는다 — /admin/login/ 이 로그인 화면으로 인식되지 않는다",
  );
  const stopAt = body.indexOf("if (here === ADMIN_LOGIN_PATH) return;");
  assert.ok(
    stopAt > 0,
    "이미 로그인 화면일 때 이동을 멈추는 가지가 없다 — 게이트가 잘못되면 다시 무한 루프가 된다",
  );
  assert.ok(body.indexOf("window.location.assign") > stopAt, "정지 가지가 이동보다 뒤에 있다");
});

test("관리자 라우트가 사이트 공용 크롬을 받지 않는다", () => {
  const chrome = read("app/components/AppChrome.tsx");
  const chromeless = chrome.slice(
    chrome.indexOf("const CHROMELESS_ROUTES"),
    chrome.indexOf("const FEATURE_NAV_EXTRA_ROUTES"),
  );

  assert.ok(chromeless.includes('"/admin"'), "CHROMELESS_ROUTES 에 /admin 이 없다");
});

test("관리자 라우트가 공용 플로팅 나브도 받지 않는다", () => {
  const chrome = read("app/components/AppChrome.tsx");
  const selfManaged = chrome.slice(
    chrome.indexOf("const FEATURE_NAV_SELF_MANAGED_ROUTES"),
    chrome.indexOf("const LOCALE_CODES"),
  );

  // 🔴 showFeatureNav 는 hideChrome 을 OR 가지로 갖는다(AppChrome.tsx). CHROMELESS_ROUTES 에만
  //    넣으면 하단 탭바가 사라진 자리에 좌상단 back/home 나브가 새로 뜬다. 관리자는 AdminShell 의
  //    자체 상단바·좌측 네비를 쓰므로 두 배열에 모두 있어야 한다.
  assert.ok(selfManaged.includes('"/admin"'), "FEATURE_NAV_SELF_MANAGED_ROUTES 에 /admin 이 없다");
});

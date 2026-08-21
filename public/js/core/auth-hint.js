/**
 * 로그인 힌트("서버에 물어볼 필요가 있는가") 단일 정본.
 *
 * 🔴 이 파일이 유일한 구현이다. 정적 셸(index.html 인라인, 2곳) · React(app/_lib/user-session-cache.ts ·
 * app/_lib/billing-client.ts) · 독립 정적 페이지(js/destiny-profile.js) 다섯 곳이 각자 손으로
 * localStorage/쿠키를 파싱해 "로그인한 것처럼 보이는가"를 판정하고 있었다. 최종 인가는 항상 서버
 * (/api/auth/me)가 하지만, 이 힌트가 false 로 나오면 일부 소비처는 네트워크 요청 자체를 생략하고
 * 게스트 응답을 합성한다 — 힌트 로직이 갈라지면 "정상 로그인 사용자가 로그아웃된 것처럼 보이는" 장애가
 * 난다(실제 사례: worker/routes/auth.js 의 appendAuthRoleCookie 주석 참고, 힌트 쿠키 수명이 세션보다
 * 먼저 죽어 8~14일차 사용자가 힌트를 잃었던 사고). 새 사본을 만들지 말고 여기를 고칠 것.
 *
 * 로딩 방식(번들러 없이 여러 런타임 공유 — js/core/pass-verdict.js 와 같은 패턴):
 *   - 브라우저 classic script: `globalThis.__cdAuthHint`
 *   - webpack/Node(require): `module.exports` (package.json type=commonjs)
 */
(function (factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof globalThis !== "undefined") globalThis.__cdAuthHint = api;
})(function () {
  "use strict";

  var TOKEN_KEY = "fortune_auth_token";
  var USER_KEY = "fortune_auth_user";
  var ROLE_COOKIE = "fortune_auth_role";

  function readCookie(name) {
    try {
      var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      var match = String(document.cookie || "").match(new RegExp("(?:^|;\\s*)" + escaped + "=([^;]*)"));
      return match ? decodeURIComponent(match[1] || "") : "";
    } catch (e) {
      return "";
    }
  }

  // 힌트 쿠키는 값이 아니라 존재 여부가 정본이지만, 방어적으로 "guest"/"anonymous" 값은 제외한다
  // (서버는 오늘 이 값을 굽지 않는다 — appendAuthRoleCookie 가 항상 실사용자 role 을 넣는다).
  function hasAuthCookieHint() {
    var role = readCookie(ROLE_COOKIE).trim().toLowerCase();
    return Boolean(role && role !== "guest" && role !== "anonymous");
  }

  function readStoredAuthToken() {
    try {
      return String(
        (typeof localStorage !== "undefined" && localStorage.getItem(TOKEN_KEY))
          || (typeof sessionStorage !== "undefined" && sessionStorage.getItem(TOKEN_KEY))
          || "",
      ).trim();
    } catch (e) {
      return "";
    }
  }

  function hasStoredAuthUserId() {
    try {
      var raw = typeof localStorage !== "undefined" ? localStorage.getItem(USER_KEY) : "";
      if (!raw) return false;
      var user = JSON.parse(raw);
      var id = user && (user.id || user.userId || user._id || user.uid || user.email);
      return Boolean(String(id || "").trim());
    } catch (e) {
      return false;
    }
  }

  function hasAuthHint() {
    if (typeof window === "undefined") return false;
    if (readStoredAuthToken()) return true;
    if (hasStoredAuthUserId()) return true;
    return hasAuthCookieHint();
  }

  return { hasAuthHint: hasAuthHint };
});

/**
 * 홈 "종합 운세 프롬프트" 카드 아래 꿀방울 출석 위젯.
 * 3일 출석마다 꿀방울 1개, 프롬프트 1회에 1개(정본: worker/lib/honey-wallet.js).
 * 로그인 사용자에게만 보인다 — GET 이 401 이면 위젯은 숨긴 채로 둔다.
 */
(function () {
  "use strict";

  function hasAuthHint() {
    try {
      var hint = globalThis.__cdAuthHint;
      return !hint || typeof hint.hasAuthHint !== "function" || hint.hasAuthHint();
    } catch (e) {
      return true;
    }
  }

  function render(root, state) {
    var balance = root.querySelector("[data-cd-honey-balance]");
    var button = root.querySelector("[data-cd-honey-attend]");
    var todo = root.querySelector("[data-cd-honey-todo]");
    var done = root.querySelector("[data-cd-honey-done]");
    if (balance) balance.textContent = String(Math.max(0, Number(state.balance) || 0));
    if (button) button.disabled = Boolean(state.attended);
    if (todo) todo.hidden = Boolean(state.attended);
    if (done) done.hidden = !state.attended;
    root.hidden = false;
  }

  function request(method) {
    var init = { method: method, credentials: "include", cache: "no-store", headers: { Accept: "application/json" } };
    if (method === "POST") {
      init.headers["Content-Type"] = "application/json";
      init.body = "{}";
    }
    return fetch("/api/honey/attendance", init).then(function (response) {
      if (!response.ok) return null;
      return response.json().then(function (data) { return data && data.ok ? data : null; });
    }).catch(function () { return null; });
  }

  function boot() {
    var root = document.querySelector("[data-cd-honey-widget]");
    if (!root || !hasAuthHint()) return;
    var button = root.querySelector("[data-cd-honey-attend]");
    request("GET").then(function (state) {
      if (state) render(root, state);
    });
    if (!button) return;
    button.addEventListener("click", function () {
      if (button.disabled) return;
      button.disabled = true;
      request("POST").then(function (state) {
        if (state) render(root, state);
        else button.disabled = false;
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();

/* Admin 프론트 공통 스크립트
   - 이 파일은 "비밀 해시 URL" 하위에서만 서빙되며, 인증/세션/CSRF는 백엔드 규칙을 따른다.
   - 민감정보(토큰/OTP/백업코드 원문)는 console에 출력하지 않는다.
*/

import { apiLoginStatus, apiLogout } from "../api/auth.js";

function $(sel, root = document) {
  return root.querySelector(sel);
}

function getBasePath() {
  // 예: https://site.com/<hash>/dashboard  => base = https://site.com/<hash>
  const parts = window.location.pathname.split("/").filter(Boolean);
  const hash = parts[0] || "";
  return `/${hash}`;
}

function showToast(text) {
  const toast = $("#cdToast");
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function setActiveNav(page) {
  document.querySelectorAll("[data-cd-nav]").forEach((btn) => {
    const target = btn.getAttribute("data-cd-nav") || "";
    btn.classList.toggle("is-active", target === page);
  });
}

function bindSidebarNavigation() {
  const base = getBasePath();
  document.querySelectorAll("[data-cd-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.getAttribute("data-cd-nav") || "dashboard";
      window.location.href = `${base}/${page}`;
    });
  });
}

function bindTopBar() {
  const logoutBtn = $("#cdLogoutBtn");
  if (!logoutBtn) return;
  logoutBtn.addEventListener("click", async () => {
    try {
      await apiLogout();
    } finally {
      // 로그아웃 후엔 로그인 화면으로 이동
      window.location.href = `${getBasePath()}/login`;
    }
  });
}

function startClock() {
  const clockEl = $("#cdClock");
  if (!clockEl) return;
  const tick = () => {
    const now = new Date();
    const time = now.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    clockEl.textContent = time;
  };
  tick();
  setInterval(tick, 1000 * 20);
}

function resolvePageFromBody() {
  const body = document.body;
  const page = body?.getAttribute("data-page") || "";
  return page || "dashboard";
}

async function ensureAuthenticated() {
  // 관리자 UI는 "쿠키 기반 인증"을 기대한다.
  const page = resolvePageFromBody();
  const isLogin = page === "login";
  if (isLogin) return;

  const status = await apiLoginStatus();
  if (!status?.ok) {
    window.location.href = `${getBasePath()}/login`;
    return;
  }
  // 닉네임을 노출하되 "admin"이라는 단어는 화면에 쓰지 않는다.
  const who = $("#cdWho");
  if (who && status?.user?.name) who.textContent = status.user.name;
}

export async function initAdminApp() {
  startClock();
  bindSidebarNavigation();
  bindTopBar();
  const page = resolvePageFromBody();
  setActiveNav(page);
  await ensureAuthenticated();
  // 페이지별 init은 HTML에서 data-page에 따라 별도 실행
  // (예: dashboard.html에서 window.__CD_ADMIN_PAGE_INIT__ 사용)
  if (typeof window.__CD_ADMIN_PAGE_INIT__ === "function") {
    try {
      window.__CD_ADMIN_PAGE_INIT__({ showToast });
    } catch (e) {
      // 민감정보가 섞일 수 있으므로 에러 상세는 숨긴다.
      showToast("요청을 처리할 수 없습니다.");
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  initAdminApp();
});


/* 관리자 인증 전용 API 래퍼
   - 모든 요청은 `credentials: "include"`로 쿠키 기반 세션을 사용한다.
   - CSRF: Double Submit Cookie 패턴을 가정한다.
     - 서버가 `fortune_csrf_token` 쿠키(HttpOnly 아님)를 발급
     - 클라이언트는 동일 값을 `x-csrf-token` 헤더로 함께 전송
*/

const API_BASE = "/api/admin";
const CSRF_COOKIE = "fortune_csrf_token";

function getCookie(name) {
  const raw = document.cookie || "";
  const parts = raw.split(";").map((v) => v.trim());
  for (const p of parts) {
    const [k, ...rest] = p.split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function csrfHeaders() {
  const token = getCookie(CSRF_COOKIE);
  if (!token) return {};
  return { "x-csrf-token": token };
}

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { message: text };
  }
  return { ok: res.ok, status: res.status, payload };
}

export async function apiCsrfInit() {
  // 로그인/2FA 페이지에서 먼저 호출하여 CSRF 쿠키를 세팅한다.
  const res = await fetch(`${API_BASE}/auth/csrf`, {
    credentials: "include",
  });
  if (!res.ok) return { ok: false };
  return { ok: true };
}

export async function apiLoginStatus() {
  const res = await jsonFetch(`${API_BASE}/auth/me`, { method: "GET" });
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, user: res.payload?.user || null };
}

export async function apiLogout() {
  // 로그아웃은 POST로 CSRF를 요구한다(서버 구현 가정).
  const headers = csrfHeaders();
  const res = await jsonFetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    headers,
  });
  return res.ok;
}

export async function apiAdminLogin({ email, password }) {
  const headers = csrfHeaders();
  return jsonFetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
  });
}

export async function apiVerify2FA({ otp, backupCode }) {
  const headers = csrfHeaders();
  return jsonFetch(`${API_BASE}/auth/verify-2fa`, {
    method: "POST",
    headers,
    body: JSON.stringify({ otp, backupCode }),
  });
}

export async function apiUnlockRequest({ email }) {
  const headers = csrfHeaders();
  return jsonFetch(`${API_BASE}/auth/unlock-request`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email }),
  });
}

export async function apiUnlockVerify({ email, code }) {
  const headers = csrfHeaders();
  return jsonFetch(`${API_BASE}/auth/unlock-verify`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, code }),
  });
}

export async function api2FASetupFetch() {
  // pending/credential 단계 이후에 QR 정보를 가져온다(서버 구현 가정).
  const res = await jsonFetch(`${API_BASE}/auth/2fa-setup`, { method: "GET" });
  return res.ok ? res.payload : null;
}

export async function api2FASetupVerify({ otp }) {
  const headers = csrfHeaders();
  const res = await jsonFetch(`${API_BASE}/auth/2fa-setup-verify`, {
    method: "POST",
    headers,
    body: JSON.stringify({ otp }),
  });
  return res.ok ? res.payload : null;
}


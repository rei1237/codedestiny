/* 회원 관리자 API 래퍼 */

const API_BASE = "/api/admin";
const FLOWER_TOKEN_KEY = "flower_admin_token";

function getCookie(name) {
  const raw = document.cookie || "";
  const parts = raw.split(";").map((v) => v.trim());
  for (const p of parts) {
    const [k, ...rest] = p.split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function getAdminToken() {
  // sessionStorage에 저장된 flower_admin_token 우선, 없으면 쿠키 폴백
  try {
    const stored = sessionStorage.getItem(FLOWER_TOKEN_KEY);
    if (stored) return stored;
  } catch { /* ignore */ }
  return getCookie("fortune_auth_token") || "";
}

function authHeaders() {
  const token = getAdminToken();
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
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

// 회원 목록 조회 — /api/admin/members (정확한 경로)
export async function apiUsersList({ search = "" } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("pageSize", "100");
  const q = params.toString() ? `?${params}` : "";
  return jsonFetch(`${API_BASE}/members${q}`);
}

// 코인 지급/차감 — /api/admin/members/points
export async function apiAdjustPoints({ userId, delta, reason }) {
  return jsonFetch(`${API_BASE}/members/points`, {
    method: "POST",
    body: JSON.stringify({ userId, delta, reason }),
  });
}

// 회원 삭제 — /api/admin/members/[id]
export async function apiDeleteUser(userId) {
  return jsonFetch(`${API_BASE}/members/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

// 계정 정지/해제 — /api/admin/members/[id]/ban
export async function apiBanUser({ userId, action, reason = "" }) {
  return jsonFetch(`${API_BASE}/members/${encodeURIComponent(userId)}/ban`, {
    method: "POST",
    body: JSON.stringify({ action, reason }),
  });
}



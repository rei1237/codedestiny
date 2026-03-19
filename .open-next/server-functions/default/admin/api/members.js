/* 회원 관리자 API 래퍼 */

const API_BASE = "/api/admin";

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
  const token = getCookie("fortune_csrf_token");
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

export async function apiUsersList({ search = "" } = {}) {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await fetch(`${API_BASE}/users${q}`, { credentials: "include" });
  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { message: text };
  }
  return { ok: res.ok, status: res.status, payload };
}

export async function apiAdjustPoints({ userId, delta, reason }) {
  const headers = csrfHeaders();
  return jsonFetch(`${API_BASE}/members/points`, {
    method: "POST",
    headers,
    body: JSON.stringify({ userId, delta, reason }),
  });
}

export async function apiToggleBlacklist({ userId, ip, email, reason }) {
  const headers = csrfHeaders();
  return jsonFetch(`${API_BASE}/members/blacklist`, {
    method: "POST",
    headers,
    body: JSON.stringify({ userId, ip, email, reason }),
  });
}


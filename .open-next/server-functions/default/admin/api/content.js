/* 콘텐츠 관련 관리자 API 래퍼
   - 현재 프로젝트에서는 "운세 콘텐츠 자동 생성"의 핵심 계산은 클라이언트에서 수행(만세력 엔진/변환 API 호출 포함)
   - 이 모듈은 생성된 결과를 서버에 저장/예약 발행할 때 사용
*/

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

export async function apiPreviewPost({ lang, serviceKey, content }) {
  const headers = csrfHeaders();
  return jsonFetch(`${API_BASE}/content/preview`, {
    method: "POST",
    headers,
    body: JSON.stringify({ lang, serviceKey, content }),
  });
}

export async function apiSchedulePost({ platform, scheduledAt, payload }) {
  const headers = csrfHeaders();
  return jsonFetch(`${API_BASE}/content/schedule`, {
    method: "POST",
    headers,
    body: JSON.stringify({ platform, scheduledAt, payload }),
  });
}


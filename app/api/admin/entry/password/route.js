// POST /api/admin/entry/password
// 꽃 버튼 비밀번호 게이트 — 비밀번호 검증 후 서명된 관리자 세션 토큰 발급
export const runtime = "nodejs";

import { generateFlowerAdminToken } from "../../../../_lib/flowerAdminToken.js";

// ADMIN_ENTRY_PASSWORD_SHA256 환경변수가 Cloudflare Pages에 설정된 경우 그것을 우선 사용.
// 없으면 하드코딩된 기본값 폴백 (변경 시 새 해시를 Cloudflare 환경변수로 등록하면 코드 배포 불필요).
const ADMIN_ENTRY_PASSWORD_SHA256 =
  (process.env.ADMIN_ENTRY_PASSWORD_SHA256 || "").trim() ||
  "6d01b565ddc7827808cacaeabdb3bdecb787ab342bb0a57ebcc05e173cef747b";

// ── 브루트포스 방어: IP당 15분 윈도우에서 최대 5회 실패 허용 ──────────────
const _loginAttempts = new Map(); // ip -> { count, resetAt }
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15분

function getClientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = _loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) return { allowed: true };
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true };
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const entry = _loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    _loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function clearAttempts(ip) {
  _loginAttempts.delete(ip);
}
// ──────────────────────────────────────────────────────────────────────────────

async function verifyAdminEntryPassword(rawInput) {
  const inp = String(rawInput || "");
  if (!inp) return false;
  try {
    const encoded = new TextEncoder().encode(inp);
    // globalThis 명시 — bare "crypto" 식별자가 ESM 컨텍스트에서 미정의될 수 있음
    const subtle = globalThis?.crypto?.subtle ?? (typeof crypto !== "undefined" ? crypto?.subtle : null);
    if (!subtle) return false;
    const hashBuffer = await subtle.digest("SHA-256", encoded);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex === ADMIN_ENTRY_PASSWORD_SHA256;
  } catch {
    return false;
  }
}

function notFound() {
  return new Response(JSON.stringify({ message: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  try {
    // 브루트포스 체크
    const ip = getClientIp(request);
    const rl = checkRateLimit(ip);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ message: "Too many attempts. Try again later." }), {
        status: 429,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Retry-After": String(rl.retryAfter),
          "Cache-Control": "no-store",
        },
      });
    }

    let body = null;
    try {
      body = await request.json();
    } catch {
      return notFound();
    }

    const password = String(body?.password || "");
    const ok = await verifyAdminEntryPassword(password);
    if (!ok) {
      recordFailedAttempt(ip);
      return notFound();
    }

    clearAttempts(ip); // 성공 시 카운터 초기화

    // 서명된 단기 세션 토큰 발급 — 클라이언트가 sessionStorage에 보관
    let adminToken;
    try {
      adminToken = await generateFlowerAdminToken();
    } catch (tokenErr) {
      console.error("[admin/entry/password] 토큰 발급 오류:", tokenErr);
      return new Response(JSON.stringify({ message: "토큰 발급 실패" }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      });
    }

    return new Response(JSON.stringify({ ok: true, adminToken, nextUrl: "/admin" }), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch {
    return notFound();
  }
}

export async function GET() {
  return notFound();
}

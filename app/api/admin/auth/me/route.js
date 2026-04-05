// GET /api/admin/auth/me
// flower_admin_token 쿠키 또는 Authorization Bearer 헤더로 세션 확인
export const runtime = "nodejs";

import { verifyFlowerAdminToken } from "../../../../_lib/flowerAdminToken.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function extractToken(request) {
  // 1) Authorization: Bearer <token>
  const auth = request.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();

  // 2) x-admin-token 헤더
  const xat = request.headers.get("x-admin-token") || "";
  if (xat) return xat.trim();

  // 3) fortune_auth_token 쿠키 (HTML 관리 패널 사용)
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)fortune_auth_token=([^;]+)/);
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  return "";
}

export async function GET(request) {
  try {
    const token = extractToken(request);
    const valid = token ? await verifyFlowerAdminToken(token) : false;
    if (!valid) {
      return json({ message: "Unauthorized" }, 401);
    }
    return json({ ok: true, user: { name: "관리자", role: "admin" } });
  } catch (err) {
    console.error("[admin/auth/me GET]", err?.message || err, err?.stack || "");
    return json({ message: "Unauthorized" }, 401);
  }
}

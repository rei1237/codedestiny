// GET /api/admin/auth/csrf
// Double Submit Cookie 패턴용 CSRF 토큰 발급
export const runtime = "nodejs";

import crypto from "node:crypto";

const TOKEN_MAX_AGE_SEC = 7 * 24 * 60 * 60; // 7일

export async function GET() {
  const csrf = crypto.randomBytes(24).toString("hex");

  const res = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

  res.headers.append(
    "Set-Cookie",
    `fortune_csrf_token=${csrf}; Path=/; Max-Age=${TOKEN_MAX_AGE_SEC}; SameSite=Lax`
  );

  return res;
}

// POST /api/admin/auth/logout
// fortune_auth_token 쿠키 및 CSRF 쿠키 삭제
export const runtime = "nodejs";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function POST() {
  const res = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

  // flower_admin_token: 현행 관리자 인증 쿠키
  res.headers.append("Set-Cookie", "flower_admin_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
  // 레거시 쿠키 정리
  res.headers.append("Set-Cookie", "fortune_auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
  res.headers.append("Set-Cookie", "fortune_csrf_token=; Path=/; Max-Age=0; SameSite=Lax");
  res.headers.append("Set-Cookie", "fortune_auth_role=; Path=/; Max-Age=0; SameSite=Lax");

  return res;
}

export async function GET() {
  return json({ message: "Not found" }, 404);
}

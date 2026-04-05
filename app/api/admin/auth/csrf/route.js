// GET /api/admin/auth/csrf
// Double Submit Cookie 패턴용 CSRF 토큰 발급
export const runtime = "nodejs";

// Web Crypto API — CF Workers / Node.js 18+ 공통 지원 (node:crypto default import 불필요)
function randomHex(byteLength) {
  const buf = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

const TOKEN_MAX_AGE_SEC = 7 * 24 * 60 * 60; // 7일

export async function GET() {
  try {
    const csrf = randomHex(24);

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
  } catch (err) {
    console.error("[admin/auth/csrf GET]", err?.message || err, err?.stack || "");
    return new Response(
      JSON.stringify({ message: `CSRF 토큰 발급 실패: ${err?.message || "알 수 없는 오류"}` }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }
    );
  }
}

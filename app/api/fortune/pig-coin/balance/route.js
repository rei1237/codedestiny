// GET /api/fortune/pig-coin/balance
// 로그인 사용자의 꽃꽃돼지 코인(points) 잔액 조회
// public/index.html syncBalanceFromServer() 에서 호출
export const runtime = "nodejs";

import jwt from "jsonwebtoken";
import { dbConnect } from "../../../../_lib/dbConnect.js";
import { getUserModel } from "../../../../_lib/models/UserModel.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function extractToken(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7).trim();

  const cookieHeader = request.headers.get("cookie") || "";
  const chunks = cookieHeader.split(";").map((v) => v.trim());
  for (const chunk of chunks) {
    const [k, ...rest] = chunk.split("=");
    if (k.trim() === "fortune_auth_token") {
      try { return decodeURIComponent(rest.join("=")); } catch { return rest.join("="); }
    }
  }
  return null;
}

export async function GET(request) {
  try {
    const token = extractToken(request);
    if (!token) return json({ message: "인증 토큰이 필요합니다." }, 401);

    let auth;
    try {
      auth = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    } catch {
      return json({ message: "유효하지 않거나 만료된 토큰입니다." }, 401);
    }

    if (!auth?.userId) return json({ message: "유효하지 않은 토큰입니다." }, 401);

    await dbConnect();
    const User = await getUserModel();

    const user = await User.findById(auth.userId)
      .select("points role")
      .lean();

    if (!user) return json({ message: "사용자 정보를 찾을 수 없습니다." }, 404);

    return json({
      ok: true,
      user: {
        id: String(user._id),
        points: Number(user.points || 0),
        role: user.role || "user",
      },
    });
  } catch (err) {
    console.error("[pig-coin/balance GET]", err?.message || err, err?.stack || "");
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}

// GET /api/payments/me
// 로그인 사용자의 코인(points) 잔액 + 최근 포인트 이력 반환
// public/index.html __cdAuthState() 에서 호출 → 서버 DB 기준 최신 잔액 동기화
export const runtime = "nodejs";

import jwt from "jsonwebtoken";
import { dbConnect } from "../../../_lib/dbConnect.js";
import { getUserModel } from "../../../_lib/models/UserModel.js";
import { getPointHistoryModel } from "../../../_lib/models/PointHistoryModel.js";

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
    const PointHistory = await getPointHistoryModel();

    const user = await User.findById(auth.userId)
      .select("name email points role")
      .lean();

    if (!user) return json({ message: "사용자 정보를 찾을 수 없습니다." }, 404);

    let pointHistories = [];
    try {
      const histories = await PointHistory.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
      pointHistories = histories.map((h) => ({
        id: String(h._id),
        kind: h.kind,
        delta: Number(h.delta || 0),
        balanceAfter: Number(h.balanceAfter || 0),
        reason: h.reason || "",
        featureKey: h.featureKey || "",
        createdAt: h.createdAt,
      }));
    } catch (histErr) {
      console.warn("[payments/me GET] pointHistory load failed", histErr?.message || histErr);
    }

    return json({
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        points: Number(user.points || 0),
        role: user.role || "user",
      },
      pointHistories,
    });
  } catch (err) {
    console.error("[payments/me GET]", err?.message || err, err?.stack || "");
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}

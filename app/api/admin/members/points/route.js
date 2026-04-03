// POST /api/admin/members/points
// 황금 돼지 코인 지급/차감 API — 꽃 관리자 세션 토큰 인증
// Express 백엔드 없이 MongoDB에 직접 접근
export const runtime = "nodejs";

import connectDB from "../../../../../server/config/db.js";
import User from "../../../../../server/models/User.js";
import PointHistory from "../../../../../server/models/PointHistory.js";
import {
  verifyFlowerAdminToken,
  extractAdminTokenFromRequest,
} from "../../../../_lib/flowerAdminToken.js";

const MAX_DELTA = 10_000;

function unauthorized() {
  return new Response(JSON.stringify({ message: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function badRequest(message) {
  return new Response(JSON.stringify({ message }), {
    status: 400,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  const token = extractAdminTokenFromRequest(request);
  if (!(await verifyFlowerAdminToken(token))) {
    return unauthorized();
  }

  let body = null;
  try {
    body = await request.json();
  } catch {
    return badRequest("잘못된 요청 형식입니다.");
  }

  const userId = String(body?.userId || "").trim();
  const delta = Number(body?.delta ?? body?.amount ?? 0);
  const reason = String(body?.reason || "관리자 황금 돼지 코인 지급").trim().slice(0, 200);

  if (!userId) return badRequest("userId가 필요합니다.");
  if (!Number.isFinite(delta) || delta === 0) return badRequest("유효한 코인 수량을 입력해 주세요.");
  if (Math.abs(delta) > MAX_DELTA) return badRequest(`1회 한도는 ±${MAX_DELTA.toLocaleString("ko-KR")} 코인입니다.`);

  try {
    await connectDB();

    const user = await User.findById(userId);
    if (!user) return badRequest("해당 회원을 찾을 수 없습니다.");

    const currentPoints = Number(user.points) || 0;
    const newPoints = Math.max(0, currentPoints + delta);

    user.points = newPoints;
    await user.save();

    await PointHistory.create({
      userId: user._id,
      kind: "adjust",
      delta,
      balanceAfter: newPoints,
      reason,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          _id: String(user._id),
          name: user.name,
          email: user.email,
          points: newPoints,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      },
    );
  } catch (err) {
    console.error("[admin/members/points POST]", err);
    return new Response(JSON.stringify({ message: "서버 오류가 발생했습니다." }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}

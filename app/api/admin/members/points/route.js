// POST /api/admin/members/points
export const runtime = "nodejs";

import { dbConnect } from "../../../../_lib/dbConnect.js";
import { getUserModel } from "../../../../_lib/models/UserModel.js";
import { getPointHistoryModel } from "../../../../_lib/models/PointHistoryModel.js";
import {
  verifyFlowerAdminToken,
  extractAdminTokenFromRequest,
} from "../../../../_lib/flowerAdminToken.js";

const MAX_DELTA = 1_000_000; // 관리자 최대 지급/차감 한도 (1회당 100만 코인)

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  try {
    const token = extractAdminTokenFromRequest(request);
    if (!(await verifyFlowerAdminToken(token))) {
      return json({ message: "Unauthorized" }, 401);
    }

    let body;
    try { body = await request.json(); }
    catch { return json({ message: "잘못된 요청 형식입니다." }, 400); }

    const userId = String(body?.userId || "").trim();
    const delta = Number(body?.delta ?? body?.amount ?? 0);
    const reason = String(body?.reason || "관리자 황금 돼지 코인 지급").trim().slice(0, 200);

    if (!userId) return json({ message: "userId가 필요합니다." }, 400);
    if (!Number.isFinite(delta) || delta === 0) return json({ message: "유효한 코인 수량을 입력해 주세요." }, 400);
    if (Math.abs(delta) > MAX_DELTA) return json({ message: `1회 한도는 ±${MAX_DELTA.toLocaleString("ko-KR")} 코인입니다.` }, 400);

    await dbConnect();
    const User = await getUserModel();
    const PointHistory = await getPointHistoryModel();

    const user = await User.findById(userId);
    if (!user) return json({ message: "해당 회원을 찾을 수 없습니다." }, 400);

    const newPoints = Math.max(0, (Number(user.points) || 0) + delta);
    user.points = newPoints;
    await user.save();

    await PointHistory.create({
      userId: user._id,
      kind: "adjust",
      delta,
      balanceAfter: newPoints,
      reason,
    });

    return json({
      ok: true,
      user: { _id: String(user._id), name: user.name, email: user.email, points: newPoints },
    });
  } catch (err) {
    console.error("[admin/members/points POST]", err?.message || err);
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}

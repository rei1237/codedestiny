// GET|DELETE /api/admin/members/[id]
export const runtime = "nodejs";

import { dbConnect } from "../../../../_lib/dbConnect.js";
import { getUserModel } from "../../../../_lib/models/UserModel.js";
import { getPointHistoryModel } from "../../../../_lib/models/PointHistoryModel.js";
import {
  verifyFlowerAdminToken,
  extractAdminTokenFromRequest,
} from "../../../../_lib/flowerAdminToken.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// GET — 단일 유저 조회 (포인트 내역 포함)
export async function GET(request, context) {
  try {
    const token = extractAdminTokenFromRequest(request);
    if (!(await verifyFlowerAdminToken(token))) return json({ message: "Unauthorized" }, 401);

    // Next.js 15: params is a Promise
    const resolvedParams = context?.params ? (typeof context.params.then === "function" ? await context.params : context.params) : {};
    const userId = String(resolvedParams?.id || "").trim();
    if (!userId) return json({ message: "유효하지 않은 사용자 ID입니다." }, 400);

    await dbConnect();
    const User = await getUserModel();
    const PointHistory = await getPointHistoryModel();

    const user = await User.findById(userId)
      .select("_id name email birthDate joinedAt role points status banReason bannedAt lastLoginAt gender")
      .lean();
    if (!user) return json({ message: "해당 회원을 찾을 수 없습니다." }, 404);

    const history = await PointHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return json({
      ok: true,
      user,
      pointHistory: history.map(h => ({
        _id: String(h._id),
        kind: h.kind,
        delta: h.delta,
        balanceAfter: h.balanceAfter,
        reason: h.reason,
        createdAt: h.createdAt,
      })),
    });
  } catch (err) {
    console.error("[admin/members/[id] GET]", err?.message || err);
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}

// DELETE — 회원 삭제
export async function DELETE(request, context) {
  try {
    const token = extractAdminTokenFromRequest(request);
    if (!(await verifyFlowerAdminToken(token))) return json({ message: "Unauthorized" }, 401);

    // Next.js 15: params is a Promise
    const resolvedParams = context?.params ? (typeof context.params.then === "function" ? await context.params : context.params) : {};
    const userId = String(resolvedParams?.id || "").trim();
    if (!userId || userId.length < 12) return json({ message: "유효하지 않은 사용자 ID입니다." }, 400);

    await dbConnect();
    const User = await getUserModel();

    const user = await User.findById(userId).lean();
    if (!user) return json({ message: "해당 회원을 찾을 수 없습니다." }, 404);
    if (user.role === "admin") return json({ message: "관리자 계정은 삭제할 수 없습니다." }, 400);

    await User.findByIdAndDelete(userId);
    return json({ ok: true, message: "회원이 삭제되었습니다.", userId });
  } catch (err) {
    console.error("[admin/members/[id] DELETE]", err?.message || err);
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}


// POST /api/admin/members/[id]/ban — 유저 정지/해제
export const runtime = "nodejs";

import { dbConnect } from "../../../../../_lib/dbConnect.js";
import { getUserModel } from "../../../../../_lib/models/UserModel.js";
import {
  verifyFlowerAdminToken,
  extractAdminTokenFromRequest,
} from "../../../../../_lib/flowerAdminToken.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// POST { action: "ban"|"unban", reason?: string }
export async function POST(request, { params }) {
  try {
    const token = extractAdminTokenFromRequest(request);
    if (!(await verifyFlowerAdminToken(token))) return json({ message: "Unauthorized" }, 401);

    const userId = String(params?.id || "").trim();
    if (!userId) return json({ message: "유효하지 않은 사용자 ID입니다." }, 400);

    let body;
    try { body = await request.json(); }
    catch { return json({ message: "잘못된 요청 형식입니다." }, 400); }

    const action = String(body?.action || "").trim(); // "ban" or "unban"
    const reason = String(body?.reason || "").trim().slice(0, 300);

    if (!["ban", "unban"].includes(action)) {
      return json({ message: "action은 'ban' 또는 'unban' 이어야 합니다." }, 400);
    }

    await dbConnect();
    const User = await getUserModel();

    const user = await User.findById(userId);
    if (!user) return json({ message: "해당 회원을 찾을 수 없습니다." }, 404);
    if (user.role === "admin") return json({ message: "관리자 계정은 변경할 수 없습니다." }, 400);

    if (action === "ban") {
      user.status = "banned";
      user.banReason = reason || "관리자에 의한 계정 정지";
      user.bannedAt = new Date();
    } else {
      user.status = "active";
      user.banReason = "";
      user.bannedAt = null;
    }

    await user.save();

    return json({
      ok: true,
      action,
      user: {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        status: user.status,
        banReason: user.banReason,
        bannedAt: user.bannedAt,
      },
    });
  } catch (err) {
    console.error("[admin/members/[id]/ban POST]", err?.message || err);
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}

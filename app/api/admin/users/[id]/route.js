// DELETE /api/admin/users/[id]
// HTML 관리 패널 호환 레이어 — /api/admin/members/[id] 와 동일 로직
export const runtime = "nodejs";

import { dbConnect } from "../../../../_lib/dbConnect.js";
import { getUserModel } from "../../../../_lib/models/UserModel.js";
import { verifyFlowerAdminToken } from "../../../../_lib/flowerAdminToken.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function extractToken(request) {
  const auth = request.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  const xat = request.headers.get("x-admin-token") || "";
  if (xat) return xat.trim();
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)fortune_auth_token=([^;]+)/);
  if (match) {
    try { return decodeURIComponent(match[1]); } catch { return match[1]; }
  }
  return "";
}

export async function DELETE(request, { params }) {
  try {
    const token = extractToken(request);
    if (!(await verifyFlowerAdminToken(token))) return json({ message: "Unauthorized" }, 401);

    const userId = String(params?.id || "").trim();
    if (!userId || userId.length < 12) return json({ message: "유효하지 않은 사용자 ID입니다." }, 400);

    await dbConnect();
    const User = await getUserModel();

    const user = await User.findById(userId).lean();
    if (!user) return json({ message: "해당 회원을 찾을 수 없습니다." }, 404);
    if (user.role === "admin") return json({ message: "관리자 계정은 삭제할 수 없습니다." }, 400);

    await User.findByIdAndDelete(userId);
    return json({ ok: true, message: "회원이 삭제되었습니다.", userId });
  } catch (err) {
    console.error("[admin/users/[id] DELETE]", err?.message || err);
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}

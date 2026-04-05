// PATCH /api/admin/members/[id]/role — 회원 역할 변경 (admin ↔ user)
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

// PATCH { role: "admin" | "user" }
export async function PATCH(request, context) {
  try {
    const token = extractAdminTokenFromRequest(request);
    if (!(await verifyFlowerAdminToken(token))) return json({ message: "Unauthorized" }, 401);

    // Next.js 15: params is a Promise
    const resolvedParams = context?.params ? (typeof context.params.then === "function" ? await context.params : context.params) : {};
    const userId = String(resolvedParams?.id || "").trim();
    if (!userId || userId.length < 12) return json({ message: "유효하지 않은 사용자 ID입니다." }, 400);

    let body;
    try { body = await request.json(); }
    catch { return json({ message: "잘못된 요청 형식입니다." }, 400); }

    const role = String(body?.role || "").trim();
    if (!["admin", "user"].includes(role)) {
      return json({ message: "role은 'admin' 또는 'user' 이어야 합니다." }, 400);
    }

    await dbConnect();
    const User = await getUserModel();

    const user = await User.findById(userId);
    if (!user) return json({ message: "해당 회원을 찾을 수 없습니다." }, 404);

    user.role = role;
    await user.save();

    return json({
      ok: true,
      user: {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[admin/members/[id]/role PATCH]", err?.message || err, err?.stack || "");
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}

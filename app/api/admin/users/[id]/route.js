// DELETE /api/admin/users/[id] — 회원 삭제
// PATCH  /api/admin/users/[id] — 상태 변경 (ban/unban/suspend)
export const runtime = "nodejs";

import { dbConnect } from "../../../../_lib/dbConnect.js";
import { getUserModel } from "../../../../_lib/models/UserModel.js";
import {
  verifyFlowerAdminToken,
  extractAdminTokenFromRequest,
} from "../../../../_lib/flowerAdminToken.js";
import { writeAuditLog } from "../../../../_lib/models/AuditLogModel.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function getIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

export async function DELETE(request, context) {
  try {
    const token = extractAdminTokenFromRequest(request);
    if (!(await verifyFlowerAdminToken(token))) return json({ message: "Unauthorized" }, 401);

    const resolvedParams = context?.params ? (typeof context.params.then === "function" ? await context.params : context.params) : {};
    const userId = String(resolvedParams?.id || "").trim();
    if (!userId || userId.length < 12) return json({ message: "유효하지 않은 사용자 ID입니다." }, 400);

    await dbConnect();
    const User = await getUserModel();

    const user = await User.findById(userId).lean();
    if (!user) return json({ message: "해당 회원을 찾을 수 없습니다." }, 404);
    if (user.role === "admin") return json({ message: "관리자 계정은 삭제할 수 없습니다." }, 400);

    await User.findByIdAndDelete(userId);

    await writeAuditLog({
      adminId: "admin",
      adminEmail: "admin",
      action: "user_delete",
      targetType: "user",
      targetId: userId,
      before: { name: user.name, email: user.email },
      ip: getIp(request),
    });

    return json({ ok: true, message: "회원이 삭제되었습니다.", userId });
  } catch (err) {
    console.error("[admin/users/[id] DELETE]", err?.message || err);
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}

export async function PATCH(request, context) {
  try {
    const token = extractAdminTokenFromRequest(request);
    if (!(await verifyFlowerAdminToken(token))) return json({ message: "Unauthorized" }, 401);

    const resolvedParams = context?.params ? (typeof context.params.then === "function" ? await context.params : context.params) : {};
    const userId = String(resolvedParams?.id || "").trim();
    if (!userId || userId.length < 12) return json({ message: "유효하지 않은 사용자 ID입니다." }, 400);

    let body;
    try { body = await request.json(); } catch { return json({ message: "잘못된 요청 형식입니다." }, 400); }

    const VALID_STATUS = ["active", "banned", "suspended"];
    const { status, banReason = "", role } = body || {};

    if (status && !VALID_STATUS.includes(status)) {
      return json({ message: "허용되지 않은 status 값입니다." }, 400);
    }
    if (role && !["user", "admin"].includes(role)) {
      return json({ message: "허용되지 않은 role 값입니다." }, 400);
    }

    await dbConnect();
    const User = await getUserModel();

    const user = await User.findById(userId).lean();
    if (!user) return json({ message: "해당 회원을 찾을 수 없습니다." }, 404);

    const updateFields = {};
    let action = "user_update";

    if (status) {
      updateFields.status = status;
      if (status === "banned") {
        updateFields.banReason = String(banReason).slice(0, 300);
        updateFields.bannedAt = new Date();
        action = "user_ban";
      } else if (status === "active") {
        updateFields.banReason = "";
        updateFields.bannedAt = null;
        action = "user_unban";
      } else if (status === "suspended") {
        action = "user_suspend";
      }
    }
    if (role) {
      updateFields.role = role;
      action = "user_role_change";
    }

    const updated = await User.findByIdAndUpdate(userId, { $set: updateFields }, { new: true }).lean();

    await writeAuditLog({
      adminId: "admin",
      adminEmail: "admin",
      action,
      targetType: "user",
      targetId: userId,
      before: { status: user.status, role: user.role, banReason: user.banReason },
      after: updateFields,
      ip: getIp(request),
    });

    return json({ ok: true, user: { _id: updated._id, status: updated.status, role: updated.role, banReason: updated.banReason } });
  } catch (err) {
    console.error("[admin/users/[id] PATCH]", err?.message || err);
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}

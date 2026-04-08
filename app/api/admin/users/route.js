// GET /api/admin/users
// HTML 관리 패널 호환 레이어 — 실제 처리는 /api/admin/members 와 동일
// 인증: fortune_auth_token 쿠키 또는 Authorization Bearer 헤더
export const runtime = "nodejs";

import { dbConnect } from "../../../_lib/dbConnect.js";
import { getUserModel } from "../../../_lib/models/UserModel.js";
import {
  verifyFlowerAdminToken,
  extractAdminTokenFromRequest,
} from "../../../_lib/flowerAdminToken.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function GET(request) {
  try {
    const token = extractAdminTokenFromRequest(request);
    if (!(await verifyFlowerAdminToken(token))) {
      return json({ message: "Unauthorized" }, 401);
    }

    await dbConnect();
    const User = await getUserModel();

    const url = new URL(request.url);
    const search = (url.searchParams.get("search") || "").trim();
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") || "50"), 10), 200);
    const page = Math.max(Number(url.searchParams.get("page") || "1"), 1);
    const skip = (page - 1) * pageSize;
    const statusFilter = url.searchParams.get("status") || "";
    const roleFilter = url.searchParams.get("role") || "";

    const VALID_STATUS = ["active", "banned", "suspended"];
    const VALID_ROLES = ["user", "admin"];

    const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
      ];
    }
    if (statusFilter && VALID_STATUS.includes(statusFilter)) filter.status = statusFilter;
    if (roleFilter && VALID_ROLES.includes(roleFilter)) filter.role = roleFilter;

    const [totalCount, filteredCount, users] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments(filter),
      User.find(filter)
        .select("_id name email birthDate joinedAt role points status banReason bannedAt lastLoginAt")
        .sort({ joinedAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
    ]);

    const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));

    return json({ ok: true, totalCount, filteredCount, count: users.length, users, page, pageSize, totalPages });
  } catch (err) {
    console.error("[admin/users GET]", err?.message || err, err?.stack || "");
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}

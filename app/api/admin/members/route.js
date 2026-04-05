// GET /api/admin/members
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
    const tokenValid = await verifyFlowerAdminToken(token);
    if (!tokenValid) {
      return json({ message: "Unauthorized — 토큰이 만료됐거나 FLOWER_ADMIN_SECRET이 변경됐습니다. 로그아웃 후 재로그인하세요." }, 401);
    }

    await dbConnect();
    const User = await getUserModel();

    const url = new URL(request.url);
    const search = (url.searchParams.get("search") || "").trim();
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") || "50"), 10), 200);
    const page = Math.max(Number(url.searchParams.get("page") || "1"), 1);
    const skip = (page - 1) * pageSize;

    const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filter = search
      ? { $or: [
          { name: { $regex: safeSearch, $options: "i" } },
          { email: { $regex: safeSearch, $options: "i" } },
        ] }
      : {};

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
    console.error("[admin/members GET]", err?.message || err);
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}


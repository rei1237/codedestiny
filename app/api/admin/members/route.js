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
    if (!(await verifyFlowerAdminToken(token))) {
      return json({ message: "Unauthorized" }, 401);
    }

    await dbConnect();
    const User = await getUserModel();

    const url = new URL(request.url);
    const search = (url.searchParams.get("search") || "").trim();
    const limit = Math.min(Number(url.searchParams.get("limit") || "200"), 500);

    const filter = search
      ? { $or: [
          { name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
          { email: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
        ] }
      : {};

    const [totalCount, users] = await Promise.all([
      User.countDocuments({}),
      User.find(filter)
        .select("_id name email birthDate joinedAt role points status banReason bannedAt lastLoginAt")
        .sort({ joinedAt: -1 })
        .limit(limit)
        .lean(),
    ]);

    return json({ ok: true, totalCount, count: users.length, users });
  } catch (err) {
    console.error("[admin/members GET]", err?.message || err);
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}


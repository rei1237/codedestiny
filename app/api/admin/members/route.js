// GET /api/admin/members
// 꽃 관리자 세션 토큰으로 보호되는 회원 목록 API
// Express 백엔드 없이 MongoDB에 직접 접근
export const runtime = "nodejs";

import connectDB from "../../../../server/config/db.js";
import User from "../../../../server/models/User.js";
import {
  verifyFlowerAdminToken,
  extractAdminTokenFromRequest,
} from "../../../_lib/flowerAdminToken.js";

function unauthorized() {
  return new Response(JSON.stringify({ message: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function GET(request) {
  // 환경변수 검증
  if (!process.env.FLOWER_ADMIN_SECRET) {
    console.error("[admin/members GET] FLOWER_ADMIN_SECRET not set in Cloudflare environment");
  }
  if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
    console.error("[admin/members GET] MONGO_URI/MONGODB_URI not set");
  }

  const token = extractAdminTokenFromRequest(request);
  if (!(await verifyFlowerAdminToken(token))) {
    return unauthorized();
  }

  try {
    await connectDB();

    const url = new URL(request.url);
    const search = (url.searchParams.get("search") || "").trim();
    const limit = Math.min(Number(url.searchParams.get("limit") || "200"), 500);

    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const [totalCount, users] = await Promise.all([
      User.countDocuments({}),
      User.find(filter)
        .select("_id name email birthDate joinedAt role points")
        .sort({ joinedAt: -1 })
        .limit(limit)
        .lean(),
    ]);

    return new Response(
      JSON.stringify({ ok: true, totalCount, count: users.length, users }),
      {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      },
    );
  } catch (err) {
    console.error("[admin/members GET]", err);
    return new Response(JSON.stringify({ message: "서버 오류가 발생했습니다." }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}

// GET /api/admin/stats
// 관리자 대시보드 통계 API — 꽃 관리자 세션 토큰 인증
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
    console.error("[admin/stats] FLOWER_ADMIN_SECRET not set in Cloudflare environment");
  }
  if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
    console.error("[admin/stats] MONGO_URI/MONGODB_URI not set");
  }

  const token = extractAdminTokenFromRequest(request);
  if (!(await verifyFlowerAdminToken(token))) {
    return unauthorized();
  }

  try {
    await connectDB();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 최근 30일 매일 가입자 수 (차트용)
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

    const [
      totalUsers,
      todayUsers,
      weekUsers,
      monthUsers,
      adminUsers,
      genderAgg,
      dailyAgg,
      pointsAgg,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ joinedAt: { $gte: todayStart } }),
      User.countDocuments({ joinedAt: { $gte: weekStart } }),
      User.countDocuments({ joinedAt: { $gte: monthStart } }),
      User.countDocuments({ role: "admin" }),
      User.aggregate([
        { $group: { _id: "$gender", count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { joinedAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$joinedAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([
        { $group: { _id: null, total: { $sum: "$points" }, avg: { $avg: "$points" } } },
      ]),
      User.find({})
        .select("_id name email joinedAt points")
        .sort({ joinedAt: -1 })
        .limit(5)
        .lean(),
    ]);

    // 성별 분포
    const gender = { M: 0, F: 0, OTHER: 0 };
    for (const g of genderAgg) {
      if (g._id === "M") gender.M = g.count;
      else if (g._id === "F") gender.F = g.count;
      else gender.OTHER = (gender.OTHER || 0) + g.count;
    }

    // 최근 30일 일별 가입 — 빈 날짜도 0으로 채움
    const dailyMap = {};
    for (const d of dailyAgg) dailyMap[d._id] = d.count;
    const dailyLabels = [];
    const dailyCounts = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyLabels.push(key.slice(5)); // MM-DD
      dailyCounts.push(dailyMap[key] || 0);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        summary: {
          totalUsers,
          todayUsers,
          weekUsers,
          monthUsers,
          adminUsers,
          totalCoins: Number(pointsAgg[0]?.total ?? 0),
          avgCoins: Math.round(Number(pointsAgg[0]?.avg ?? 0)),
        },
        gender,
        daily: { labels: dailyLabels, counts: dailyCounts },
        recentUsers: recentUsers.map((u) => ({
          _id: String(u._id),
          name: u.name,
          email: u.email,
          joinedAt: u.joinedAt,
          points: u.points,
        })),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      },
    );
  } catch (err) {
    console.error("[admin/stats GET]", err);
    return new Response(JSON.stringify({ message: "서버 오류가 발생했습니다." }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}

// GET /api/admin/stats
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

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

    const [
      totalUsers, todayUsers, weekUsers, monthUsers, adminUsers, bannedUsers,
      genderAgg, dailyAgg, pointsAgg, recentUsers,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ joinedAt: { $gte: todayStart } }),
      User.countDocuments({ joinedAt: { $gte: weekStart } }),
      User.countDocuments({ joinedAt: { $gte: monthStart } }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ status: "banned" }),
      User.aggregate([{ $group: { _id: "$gender", count: { $sum: 1 } } }]),
      User.aggregate([
        { $match: { joinedAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$joinedAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([{ $group: { _id: null, total: { $sum: "$points" }, avg: { $avg: "$points" } } }]),
      User.find({}).select("_id name email joinedAt points status").sort({ joinedAt: -1 }).limit(5).lean(),
    ]);

    const gender = { M: 0, F: 0, OTHER: 0 };
    for (const g of genderAgg) {
      if (g._id === "M") gender.M = g.count;
      else if (g._id === "F") gender.F = g.count;
      else gender.OTHER = (gender.OTHER || 0) + g.count;
    }

    const dailyMap = {};
    for (const d of dailyAgg) dailyMap[d._id] = d.count;
    const dailyLabels = [];
    const dailyCounts = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyLabels.push(key.slice(5));
      dailyCounts.push(dailyMap[key] || 0);
    }

    return json({
      ok: true,
      summary: {
        totalUsers, todayUsers, weekUsers, monthUsers,
        adminUsers, bannedUsers,
        totalCoins: Number(pointsAgg[0]?.total ?? 0),
        avgCoins: Math.round(Number(pointsAgg[0]?.avg ?? 0)),
      },
      gender,
      daily: { labels: dailyLabels, counts: dailyCounts },
      recentUsers: recentUsers.map((u) => ({
        _id: String(u._id), name: u.name, email: u.email,
        joinedAt: u.joinedAt, points: u.points, status: u.status || "active",
      })),
    });
  } catch (err) {
    const errMsg = String(err?.message || err || "알 수 없는 오류");
    console.error("[admin/stats GET]", errMsg);
    return json({ message: `서버 오류: ${errMsg}` }, 500);
  }
}

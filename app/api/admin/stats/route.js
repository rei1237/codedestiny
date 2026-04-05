// GET /api/admin/stats
export const runtime = "nodejs";

import { dbConnect } from "../../../_lib/dbConnect.js";
import { getUserModel } from "../../../_lib/models/UserModel.js";
import { getPointHistoryModel } from "../../../_lib/models/PointHistoryModel.js";
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

    // 운영 DB에는 joinedAt/points가 문자열로 저장된 레거시 문서가 섞일 수 있으므로
    // 집계 전 안전 변환식을 사용해 500 오류를 방지한다.
    const joinedAtExpr = {
      $convert: { input: "$joinedAt", to: "date", onError: null, onNull: null },
    };
    const pointsExpr = {
      $convert: { input: "$points", to: "double", onError: 0, onNull: 0 },
    };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

    const countSince = async (startAt) => {
      const rows = await User.aggregate([
        { $addFields: { _joinedAtSafe: joinedAtExpr } },
        { $match: { _joinedAtSafe: { $gte: startAt } } },
        { $count: "count" },
      ]);
      return Number(rows?.[0]?.count || 0);
    };

    const [todayUsersSafe, weekUsersSafe, monthUsersSafe] = await Promise.all([
      countSince(todayStart),
      countSince(weekStart),
      countSince(monthStart),
    ]);

    const PointHistory = await getPointHistoryModel();

    const [
      totalUsers, adminUsers, bannedUsers,
      genderAgg, dailyAgg, pointsAgg, recentUsers,
      recentCharges, chargeToday, chargeDailyAgg, recentBanned,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ status: "banned" }),
      User.aggregate([{ $group: { _id: "$gender", count: { $sum: 1 } } }]),
      User.aggregate([
        { $addFields: { _joinedAtSafe: joinedAtExpr } },
        { $match: { _joinedAtSafe: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$_joinedAtSafe" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([{ $group: { _id: null, total: { $sum: pointsExpr }, avg: { $avg: pointsExpr } } }]),
      User.find({}).select("_id name email joinedAt points status").sort({ joinedAt: -1 }).limit(5).lean(),

      // 최근 결제(charge) 5건
      PointHistory.find({ kind: "charge" })
        .select("_id userId delta reason createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // 오늘 총 충전 코인
      PointHistory.aggregate([
        { $match: { kind: "charge", createdAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: "$delta" }, count: { $sum: 1 } } },
      ]),

      // 최근 30일 일별 충전 추이
      PointHistory.aggregate([
        { $match: { kind: "charge", createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            total: { $sum: "$delta" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 최근 정지된 회원 3명
      User.find({ status: "banned" })
        .select("_id name email bannedAt banReason")
        .sort({ bannedAt: -1 })
        .limit(3)
        .lean(),
    ]);

    const gender = { M: 0, F: 0, OTHER: 0 };
    for (const g of genderAgg) {
      if (g._id === "M") gender.M = g.count;
      else if (g._id === "F") gender.F = g.count;
      else gender.OTHER = (gender.OTHER || 0) + g.count;
    }

    // 가입 일별 추이
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

    // 충전 일별 추이 (30일)
    const chargeDailyMap = {};
    for (const d of chargeDailyAgg) chargeDailyMap[d._id] = { total: d.total, count: d.count };
    const chargeLabels = [];
    const chargeTotals = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      chargeLabels.push(key.slice(5));
      chargeTotals.push(chargeDailyMap[key]?.total || 0);
    }

    return json({
      ok: true,
      summary: {
        totalUsers,
        todayUsers: todayUsersSafe,
        weekUsers: weekUsersSafe,
        monthUsers: monthUsersSafe,
        adminUsers, bannedUsers,
        totalCoins: Number(pointsAgg[0]?.total ?? 0),
        avgCoins: Math.round(Number(pointsAgg[0]?.avg ?? 0)),
        todayChargeCoins: Number(chargeToday[0]?.total ?? 0),
        todayChargeCount: Number(chargeToday[0]?.count ?? 0),
      },
      gender,
      daily: { labels: dailyLabels, counts: dailyCounts },
      chargeDaily: { labels: chargeLabels, totals: chargeTotals },
      recentUsers: recentUsers.map((u) => ({
        _id: String(u._id), name: u.name, email: u.email,
        joinedAt: u.joinedAt,
        points: Number.isFinite(Number(u.points)) ? Number(u.points) : 0,
        status: u.status || "active",
      })),
      recentCharges: recentCharges.map((c) => ({
        _id: String(c._id),
        userId: String(c.userId),
        delta: c.delta,
        reason: c.reason || "",
        createdAt: c.createdAt,
      })),
      recentBanned: recentBanned.map((u) => ({
        _id: String(u._id),
        name: u.name,
        email: u.email,
        bannedAt: u.bannedAt,
        banReason: u.banReason || "",
      })),
    });
  } catch (err) {
    const errMsg = String(err?.message || err || "알 수 없는 오류");
    console.error("[admin/stats GET]", errMsg, err?.stack || "");
    return json({ message: `서버 오류: ${errMsg}` }, 500);
  }
}

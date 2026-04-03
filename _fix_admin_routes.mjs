import { writeFileSync } from "fs";

// ─── stats/route.js ───────────────────────────────────────────────────────────
writeFileSync(
  new URL("./app/api/admin/stats/route.js", import.meta.url),
  `// GET /api/admin/stats
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
    console.error("[admin/stats GET]", err?.message || err);
    return json({ message: \`서버 오류: \${err?.message || "알 수 없는 오류"}\` }, 500);
  }
}
`,
  "utf8"
);

// ─── members/points/route.js ──────────────────────────────────────────────────
writeFileSync(
  new URL("./app/api/admin/members/points/route.js", import.meta.url),
  `// POST /api/admin/members/points
export const runtime = "nodejs";

import { dbConnect } from "../../../../_lib/dbConnect.js";
import { getUserModel } from "../../../../_lib/models/UserModel.js";
import { getPointHistoryModel } from "../../../../_lib/models/PointHistoryModel.js";
import {
  verifyFlowerAdminToken,
  extractAdminTokenFromRequest,
} from "../../../../_lib/flowerAdminToken.js";

const MAX_DELTA = 10_000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  try {
    const token = extractAdminTokenFromRequest(request);
    if (!(await verifyFlowerAdminToken(token))) {
      return json({ message: "Unauthorized" }, 401);
    }

    let body;
    try { body = await request.json(); }
    catch { return json({ message: "잘못된 요청 형식입니다." }, 400); }

    const userId = String(body?.userId || "").trim();
    const delta = Number(body?.delta ?? body?.amount ?? 0);
    const reason = String(body?.reason || "관리자 황금 돼지 코인 지급").trim().slice(0, 200);

    if (!userId) return json({ message: "userId가 필요합니다." }, 400);
    if (!Number.isFinite(delta) || delta === 0) return json({ message: "유효한 코인 수량을 입력해 주세요." }, 400);
    if (Math.abs(delta) > MAX_DELTA) return json({ message: \`1회 한도는 ±\${MAX_DELTA.toLocaleString("ko-KR")} 코인입니다.\` }, 400);

    await dbConnect();
    const User = await getUserModel();
    const PointHistory = await getPointHistoryModel();

    const user = await User.findById(userId);
    if (!user) return json({ message: "해당 회원을 찾을 수 없습니다." }, 400);

    const newPoints = Math.max(0, (Number(user.points) || 0) + delta);
    user.points = newPoints;
    await user.save();

    await PointHistory.create({
      userId: user._id,
      kind: "adjust",
      delta,
      balanceAfter: newPoints,
      reason,
    });

    return json({
      ok: true,
      user: { _id: String(user._id), name: user.name, email: user.email, points: newPoints },
    });
  } catch (err) {
    console.error("[admin/members/points POST]", err?.message || err);
    return json({ message: \`서버 오류: \${err?.message || "알 수 없는 오류"}\` }, 500);
  }
}
`,
  "utf8"
);

console.log("Both files written successfully.");

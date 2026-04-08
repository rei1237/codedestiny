import { dbConnect } from "@/app/_lib/dbConnect";
import { extractAdminTokenFromRequest, verifyFlowerAdminToken } from "@/app/_lib/flowerAdminToken";
import { getUserModel } from "@/app/_lib/models/UserModel";

export const runtime = "nodejs";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}


async function ensureAdmin(request) {
  const token = extractAdminTokenFromRequest(request);
  if (!(await verifyFlowerAdminToken(token))) return json({ ok: false, message: "Unauthorized" }, 401);
  return null;
}

export async function GET(request) {
  const blocked = await ensureAdmin(request);
  if (blocked) return blocked;

  try {
    await dbConnect();
    const User = await getUserModel();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);

    const [totalUsers, todayUsers, weekUsers, adminUsers, bannedUsers, pointsAgg, recentUsers] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ joinedAt: { $gte: todayStart } }),
      User.countDocuments({ joinedAt: { $gte: weekStart } }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ status: "banned" }),
      User.aggregate([{ $group: { _id: null, total: { $sum: "$points" } } }]),
      User.find({}).select("_id name email joinedAt points").sort({ joinedAt: -1 }).limit(10).lean(),
    ]);

    const labels = [];
    const counts = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      labels.push(d.toISOString().slice(5, 10));
      counts.push(0);
    }

    return json({
      ok: true,
      summary: {
        totalUsers,
        todayUsers,
        weekUsers,
        adminUsers,
        bannedUsers,
        totalCoins: Number(pointsAgg?.[0]?.total ?? 0),
      },
      daily: { labels, counts },
      recentUsers: (recentUsers || []).map((u) => ({
        _id: String(u._id),
        name: u.name || "",
        email: u.email || "",
        joinedAt: u.joinedAt || null,
        points: Number(u.points || 0),
      })),
    });
  } catch (err) {
    console.error("[admin/stats GET]", err?.message || err);
    return json({ ok: false, message: "Server error" }, 500);
  }
}

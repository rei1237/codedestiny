import { dbConnect } from "@/app/_lib/dbConnect";
import { extractAdminTokenFromRequest, verifyFlowerAdminToken } from "@/app/_lib/flowerAdminToken";
import { getPointHistoryModel } from "@/app/_lib/models/PointHistoryModel";
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


const MAX_DELTA = 1000000;

async function ensureAdmin(request) {
  const token = extractAdminTokenFromRequest(request);
  if (!(await verifyFlowerAdminToken(token))) return json({ ok: false, message: "Unauthorized" }, 401);
  return null;
}

export async function POST(request) {
  const blocked = await ensureAdmin(request);
  if (blocked) return blocked;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return json({ ok: false, message: "Bad request" }, 400);

    const userId = String(body.userId || "").trim();
    const delta = Number(body.delta ?? body.amount ?? 0);
    const reason = String(body.reason || "Admin manual adjustment").slice(0, 200);

    if (!userId) return json({ ok: false, message: "userId required" }, 400);
    if (!Number.isFinite(delta) || delta === 0) return json({ ok: false, message: "Invalid delta" }, 400);
    if (Math.abs(delta) > MAX_DELTA) return json({ ok: false, message: "Delta too large" }, 400);

    await dbConnect();
    const User = await getUserModel();
    const PointHistory = await getPointHistoryModel();

    const user = await User.findById(userId);
    if (!user) return json({ ok: false, message: "User not found" }, 404);

    const nextPoints = Math.max(0, Number(user.points || 0) + delta);
    user.points = nextPoints;
    await user.save();

    await PointHistory.create({
      userId: user._id,
      kind: "adjust",
      delta,
      balanceAfter: nextPoints,
      reason,
      metadata: { source: "admin-panel" },
    });

    return json({
      ok: true,
      user: {
        _id: String(user._id),
        name: user.name || "",
        email: user.email || "",
        points: nextPoints,
      },
    });
  } catch (err) {
    console.error("[admin/members/points POST]", err?.message || err);
    return json({ ok: false, message: "Server error" }, 500);
  }
}

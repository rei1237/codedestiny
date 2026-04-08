import { dbConnect } from "@/app/_lib/dbConnect";
import { extractAdminTokenFromRequest, verifyFlowerAdminToken } from "@/app/_lib/flowerAdminToken";
import { getPointHistoryModel } from "@/app/_lib/models/PointHistoryModel";

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
  if (!(await verifyFlowerAdminToken(token))) {
    return json({ ok: false, message: "Unauthorized" }, 401);
  }
  return null;
}

export async function GET(request) {
  const blocked = await ensureAdmin(request);
  if (blocked) return blocked;

  try {
    await dbConnect();
    const PointHistory = await getPointHistoryModel();

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 30)));
    const kind = String(url.searchParams.get("kind") || "").trim();
    const userId = String(url.searchParams.get("userId") || "").trim();
    const dateFrom = String(url.searchParams.get("dateFrom") || "").trim();
    const dateTo = String(url.searchParams.get("dateTo") || "").trim();

    const query = {};
    if (kind) query.kind = kind;
    if (userId) query.userId = userId;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(`${dateFrom}T00:00:00.000Z`);
      if (dateTo) query.createdAt.$lte = new Date(`${dateTo}T23:59:59.999Z`);
    }

    const [records, totalCount] = await Promise.all([
      PointHistory.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate("userId", "name email")
        .lean(),
      PointHistory.countDocuments(query),
    ]);

    return json({
      ok: true,
      records: (records || []).map((r) => ({
        _id: String(r._id),
        userId: String(r.userId?._id || r.userId || ""),
        userName: r.userId?.name || "",
        userEmail: r.userId?.email || "",
        kind: r.kind || "adjust",
        delta: Number(r.delta || 0),
        balanceAfter: Number(r.balanceAfter || 0),
        reason: r.reason || "",
        createdAt: r.createdAt || null,
      })),
      totalCount,
      page,
      pageSize,
    });
  } catch (err) {
    console.error("[admin/coin-history GET]", err?.message || err);
    return json({ ok: false, message: "Server error" }, 500);
  }
}

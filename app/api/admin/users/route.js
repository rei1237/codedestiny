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

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 20)));
    const search = String(url.searchParams.get("search") || "").trim();
    const status = String(url.searchParams.get("status") || "").trim();
    const role = String(url.searchParams.get("role") || "").trim();

    const query = {};
    if (search) {
      const re = new RegExp(search, "i");
      query.$or = [{ name: re }, { email: re }];
    }
    if (status) query.status = status;
    if (role) query.role = role;

    const [users, totalCount] = await Promise.all([
      User.find(query)
        .select("_id name email joinedAt role status points lastLoginAt banReason")
        .sort({ joinedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      User.countDocuments(query),
    ]);

    return json({
      ok: true,
      users: (users || []).map((u) => ({
        _id: String(u._id),
        name: u.name || "",
        email: u.email || "",
        joinedAt: u.joinedAt || null,
        role: u.role || "user",
        status: u.status || "active",
        points: Number(u.points || 0),
        lastLoginAt: u.lastLoginAt || null,
        banReason: u.banReason || "",
      })),
      totalCount,
      page,
      pageSize,
    });
  } catch (err) {
    console.error("[admin/users GET]", err?.message || err);
    return json({ ok: false, message: "Server error" }, 500);
  }
}

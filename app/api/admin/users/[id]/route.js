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

export async function PATCH(request, { params }) {
  const blocked = await ensureAdmin(request);
  if (blocked) return blocked;

  try {
    await dbConnect();
    const User = await getUserModel();

    const userId = String(params?.id || "").trim();
    if (!userId) return json({ ok: false, message: "userId required" }, 400);

    const body = await request.json().catch(() => null);
    if (!body) return json({ ok: false, message: "Bad request" }, 400);

    const user = await User.findById(userId);
    if (!user) return json({ ok: false, message: "User not found" }, 404);

    if (typeof body.status === "string") {
      const next = body.status.trim();
      if (!["active", "banned", "suspended"].includes(next)) {
        return json({ ok: false, message: "Invalid status" }, 400);
      }
      user.status = next;
      user.banReason = next === "banned" ? String(body.banReason || "").slice(0, 300) : "";
    }

    if (typeof body.role === "string") {
      const nextRole = body.role.trim();
      if (!["user", "admin"].includes(nextRole)) {
        return json({ ok: false, message: "Invalid role" }, 400);
      }
      user.role = nextRole;
    }

    await user.save();

    return json({
      ok: true,
      user: {
        _id: String(user._id),
        name: user.name || "",
        email: user.email || "",
        joinedAt: user.joinedAt || null,
        role: user.role || "user",
        status: user.status || "active",
        points: Number(user.points || 0),
        lastLoginAt: user.lastLoginAt || null,
        banReason: user.banReason || "",
      },
    });
  } catch (err) {
    console.error("[admin/users/:id PATCH]", err?.message || err);
    return json({ ok: false, message: "Server error" }, 500);
  }
}

export async function DELETE(request, { params }) {
  const blocked = await ensureAdmin(request);
  if (blocked) return blocked;

  try {
    await dbConnect();
    const User = await getUserModel();

    const userId = String(params?.id || "").trim();
    if (!userId) return json({ ok: false, message: "userId required" }, 400);

    const user = await User.findById(userId).lean();
    if (!user) return json({ ok: false, message: "User not found" }, 404);
    if (user.role === "admin") return json({ ok: false, message: "Admin user cannot be deleted" }, 400);

    await User.deleteOne({ _id: userId });
    return json({ ok: true });
  } catch (err) {
    console.error("[admin/users/:id DELETE]", err?.message || err);
    return json({ ok: false, message: "Server error" }, 500);
  }
}

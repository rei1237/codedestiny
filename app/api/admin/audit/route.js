import { dbConnect } from "@/app/_lib/dbConnect";
import { extractAdminTokenFromRequest, verifyFlowerAdminToken } from "@/app/_lib/flowerAdminToken";
import { getAuditLogModel } from "@/app/_lib/models/AuditLogModel";

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
    const AuditLog = await getAuditLogModel();

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 30)));
    const action = String(url.searchParams.get("action") || "").trim();
    const targetType = String(url.searchParams.get("targetType") || "").trim();

    const query = {};
    if (action) query.action = action;
    if (targetType) query.targetType = targetType;

    const [logs, totalCount] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return json({
      ok: true,
      logs: (logs || []).map((l) => ({
        _id: String(l._id),
        adminEmail: l.adminEmail || "",
        action: l.action || "",
        targetType: l.targetType || "",
        targetId: l.targetId || "",
        note: l.note || "",
        ip: l.ip || "",
        before: l.before ?? null,
        after: l.after ?? null,
        createdAt: l.createdAt || null,
      })),
      totalCount,
      page,
      pageSize,
    });
  } catch (err) {
    console.error("[admin/audit GET]", err?.message || err);
    return json({ ok: false, message: "Server error" }, 500);
  }
}

// GET /api/admin/audit — 감사 로그 목록 조회
export const runtime = "nodejs";

import { dbConnect } from "../../../_lib/dbConnect.js";
import { getAuditLogModel } from "../../../_lib/models/AuditLogModel.js";
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
    if (!(await verifyFlowerAdminToken(token))) return json({ message: "Unauthorized" }, 401);

    await dbConnect();
    const AuditLog = await getAuditLogModel();

    const url = new URL(request.url);
    const action     = url.searchParams.get("action") || "";
    const targetType = url.searchParams.get("targetType") || "";
    const adminId    = url.searchParams.get("adminId") || "";
    const page       = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const pageSize   = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") || "50")));

    const filter = {};
    if (action) filter.action = action;
    if (targetType) filter.targetType = targetType;
    if (adminId) filter.adminId = adminId;

    const [totalCount, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ]);

    return json({ ok: true, totalCount, page, pageSize, logs });
  } catch (err) {
    console.error("[audit GET]", err?.message || err);
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}

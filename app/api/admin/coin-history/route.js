// GET /api/admin/coin-history — 전체 코인 이력 조회 (userId, kind, dateRange, page)
export const runtime = "nodejs";

import mongoose from "mongoose";
import { dbConnect } from "../../../_lib/dbConnect.js";
import { getPointHistoryModel } from "../../../_lib/models/PointHistoryModel.js";
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
    if (!(await verifyFlowerAdminToken(token))) return json({ message: "Unauthorized" }, 401);

    const url = new URL(request.url);
    const kind     = url.searchParams.get("kind") || "";   // charge|deduct|refund|adjust
    const userId   = url.searchParams.get("userId") || "";
    const dateFrom = url.searchParams.get("dateFrom") || ""; // YYYY-MM-DD
    const dateTo   = url.searchParams.get("dateTo") || "";   // YYYY-MM-DD
    const page     = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(200, Math.max(10, Number(url.searchParams.get("pageSize") || "50")));

    const VALID_KINDS = ["charge", "deduct", "refund", "adjust"];

    await dbConnect();
    const PointHistory = await getPointHistoryModel();

    const filter = {};
    if (kind && VALID_KINDS.includes(kind)) filter.kind = kind;
    if (userId) {
      try {
        filter.userId = new mongoose.Types.ObjectId(userId);
      } catch { return json({ message: "유효하지 않은 userId 형식입니다." }, 400); }
    }
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        const d = new Date(dateFrom);
        if (!isNaN(d.getTime())) filter.createdAt.$gte = d;
      }
      if (dateTo) {
        const d = new Date(dateTo);
        if (!isNaN(d.getTime())) {
          d.setDate(d.getDate() + 1); // dateTo 포함 (하루 끝까지)
          filter.createdAt.$lt = d;
        }
      }
    }

    const [totalCount, records] = await Promise.all([
      PointHistory.countDocuments(filter),
      PointHistory.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ]);

    // 유저 이름/이메일 병합
    const userIds = [...new Set(records.map(r => String(r.userId)))];
    let userMap = {};
    if (userIds.length > 0) {
      try {
        const User = await getUserModel();
        const users = await User.find({ _id: { $in: userIds } })
          .select("_id name email")
          .lean();
        for (const u of users) {
          userMap[String(u._id)] = { name: u.name, email: u.email };
        }
      } catch { /* 유저 조회 실패 시 이름 없이 반환 */ }
    }

    const enriched = records.map(r => ({
      _id:          String(r._id),
      userId:       String(r.userId),
      userName:     userMap[String(r.userId)]?.name  || "-",
      userEmail:    userMap[String(r.userId)]?.email || "-",
      kind:         r.kind,
      delta:        r.delta,
      balanceAfter: r.balanceAfter,
      reason:       r.reason || "",
      featureKey:   r.featureKey || "",
      createdAt:    r.createdAt,
    }));

    // 집계 요약 (페이지 무관 전체)
    let summary = null;
    try {
      const agg = await PointHistory.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$kind",
            total: { $sum: "$delta" },
            count: { $sum: 1 },
          },
        },
      ]);
      summary = {};
      for (const a of agg) summary[a._id] = { total: a.total, count: a.count };
    } catch { /* summary 실패 허용 */ }

    return json({
      ok: true,
      totalCount,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      records: enriched,
      summary,
    });
  } catch (err) {
    console.error("[admin/coin-history GET]", err?.message || err, err?.stack || "");
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}

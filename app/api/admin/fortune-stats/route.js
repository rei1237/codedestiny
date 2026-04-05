// GET /api/admin/fortune-stats
// 운세 조회 통계: 카테고리별 비율, 일별 추이, 오늘 조회수, 평균 응답시간
export const runtime = "nodejs";

import { dbConnect } from "../../../_lib/dbConnect.js";
import { getFortuneViewLogModel } from "../../../_lib/models/FortuneViewLogModel.js";
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
    const Log = await getFortuneViewLogModel();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

    const [
      todayCount,
      avgResponseMs,
      categoryAgg,
      dailyAgg,
    ] = await Promise.all([
      // 오늘 조회 수
      Log.countDocuments({ createdAt: { $gte: todayStart } }),

      // 최근 7일 평균 응답 시간
      Log.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo }, responseMs: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: "$responseMs" } } },
      ]),

      // 카테고리별 조회 비율 (전체 기간 or 최근 30일)
      Log.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // 일별 조회 추이 (최근 30일)
      Log.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // 카테고리 레이블 매핑
    const CATEGORY_LABELS = {
      saju: "사주", tarot: "타로", horoscope: "별자리",
      dream: "꿈해몽", daily: "오늘의운세", geomancy: "풍수",
      love: "연애운", career: "직업운", other: "기타",
    };

    const categoryData = categoryAgg.map(c => ({
      name: CATEGORY_LABELS[c._id] || c._id,
      value: c.count,
      key: c._id,
    }));

    // 일별 추이 — 30일 전체 날짜 채우기
    const dailyMap = {};
    for (const d of dailyAgg) dailyMap[d._id] = d.count;
    const dailyLabels = [];
    const dailyCounts = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyLabels.push(key.slice(5)); // MM-DD
      dailyCounts.push(dailyMap[key] || 0);
    }

    return json({
      ok: true,
      todayCount,
      avgResponseMs: Math.round(avgResponseMs[0]?.avg ?? 0),
      categoryData,
      daily: { labels: dailyLabels, counts: dailyCounts },
    });
  } catch (err) {
    console.error("[admin/fortune-stats GET]", err?.message, err?.stack || "");
    return json({ message: `서버 오류: ${err?.message}` }, 500);
  }
}

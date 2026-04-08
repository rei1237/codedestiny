// GET  /api/admin/content — 콘텐츠 목록 조회 (category 필터, 페이지네이션)
// POST /api/admin/content — 콘텐츠 생성
export const runtime = "nodejs";

import { getFortuneContentModel } from "../../../_lib/models/FortuneContentModel.js";
import {
  verifyFlowerAdminToken,
  extractAdminTokenFromRequest,
} from "../../../_lib/flowerAdminToken.js";
import { writeAuditLog } from "../../../_lib/models/AuditLogModel.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

const VALID_CATEGORIES = ["saju", "tarot", "horoscope", "dream", "daily", "geomancy", "love", "career"];

export async function GET(request) {
  try {
    const token = extractAdminTokenFromRequest(request);
    if (!(await verifyFlowerAdminToken(token))) return json({ message: "Unauthorized" }, 401);

    const url = new URL(request.url);
    const category = url.searchParams.get("category") || "";
    const search   = (url.searchParams.get("search") || "").trim();
    const active   = url.searchParams.get("active"); // "true"|"false"|null
    const page     = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") || "50")));

    const Content = await getFortuneContentModel();

    const filter = {};
    if (category && VALID_CATEGORIES.includes(category)) filter.category = category;
    if (active === "true")  filter.isActive = true;
    if (active === "false") filter.isActive = false;
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title:   { $regex: safe, $options: "i" } },
        { content: { $regex: safe, $options: "i" } },
        { tags:    { $regex: safe, $options: "i" } },
      ];
    }

    const [totalCount, items] = await Promise.all([
      Content.countDocuments(filter),
      Content.find(filter)
        .select("_id category subcategory title tags sortOrder isActive createdAt updatedAt")
        .sort({ category: 1, sortOrder: 1, createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ]);

    return json({
      ok: true,
      totalCount,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      items,
    });
  } catch (err) {
    console.error("[admin/content GET]", err?.message || err, err?.stack || "");
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}

export async function POST(request) {
  try {
    const token = extractAdminTokenFromRequest(request);
    if (!(await verifyFlowerAdminToken(token))) return json({ message: "Unauthorized" }, 401);

    let body;
    try { body = await request.json(); }
    catch { return json({ message: "잘못된 요청 형식입니다." }, 400); }

    const { category, subcategory = "", title, content, tags = [], sortOrder = 0, isActive = true, metadata } = body || {};

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return json({ message: `category는 ${VALID_CATEGORIES.join(", ")} 중 하나여야 합니다.` }, 400);
    }
    if (!title || typeof title !== "string" || title.trim().length < 1) {
      return json({ message: "title이 필요합니다." }, 400);
    }
    if (!content || typeof content !== "string" || content.trim().length < 1) {
      return json({ message: "content가 필요합니다." }, 400);
    }

    const Content = await getFortuneContentModel();
    const item = await Content.create({
      category,
      subcategory: String(subcategory || "").trim().slice(0, 100),
      title: title.trim().slice(0, 200),
      content: content.trim().slice(0, 20000),
      tags: Array.isArray(tags) ? tags.map(String).slice(0, 20) : [],
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      isActive: Boolean(isActive),
      metadata: metadata || undefined,
    });

    await writeAuditLog({
      adminId: "admin",
      adminEmail: "admin",
      action: "content_create",
      targetType: "content",
      targetId: String(item._id),
      after: { category, title: title.trim() },
    });

    return json({ ok: true, item: item.toObject() }, 201);
  } catch (err) {
    console.error("[admin/content POST]", err?.message || err, err?.stack || "");
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}

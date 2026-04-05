// GET    /api/admin/content/[id] — 콘텐츠 단건 조회
// PATCH  /api/admin/content/[id] — 콘텐츠 수정
// DELETE /api/admin/content/[id] — 콘텐츠 삭제
export const runtime = "nodejs";

import { getFortuneContentModel } from "../../../../_lib/models/FortuneContentModel.js";
import {
  verifyFlowerAdminToken,
  extractAdminTokenFromRequest,
} from "../../../../_lib/flowerAdminToken.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

const VALID_CATEGORIES = ["saju", "tarot", "horoscope", "dream", "daily", "geomancy", "love", "career"];

async function resolveId(context) {
  const params = context?.params;
  if (!params) return "";
  return String(typeof params.then === "function" ? (await params).id : params.id || "");
}

export async function GET(request, context) {
  try {
    const token = extractAdminTokenFromRequest(request);
    if (!(await verifyFlowerAdminToken(token))) return json({ message: "Unauthorized" }, 401);

    const id = await resolveId(context);
    if (!id) return json({ message: "ID가 필요합니다." }, 400);

    const Content = await getFortuneContentModel();
    const item = await Content.findById(id).lean();
    if (!item) return json({ message: "콘텐츠를 찾을 수 없습니다." }, 404);

    return json({ ok: true, item });
  } catch (err) {
    console.error("[admin/content/[id] GET]", err?.message || err, err?.stack || "");
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}

export async function PATCH(request, context) {
  try {
    const token = extractAdminTokenFromRequest(request);
    if (!(await verifyFlowerAdminToken(token))) return json({ message: "Unauthorized" }, 401);

    const id = await resolveId(context);
    if (!id) return json({ message: "ID가 필요합니다." }, 400);

    let body;
    try { body = await request.json(); }
    catch { return json({ message: "잘못된 요청 형식입니다." }, 400); }

    const ALLOWED = ["category", "subcategory", "title", "content", "tags", "sortOrder", "isActive", "metadata"];
    const patch = {};
    for (const key of ALLOWED) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        patch[key] = body[key];
      }
    }

    if (patch.category && !VALID_CATEGORIES.includes(patch.category)) {
      return json({ message: `category는 ${VALID_CATEGORIES.join(", ")} 중 하나여야 합니다.` }, 400);
    }
    if (patch.title !== undefined) patch.title = String(patch.title).trim().slice(0, 200);
    if (patch.content !== undefined) patch.content = String(patch.content).trim().slice(0, 20000);

    if (Object.keys(patch).length === 0) return json({ message: "변경할 필드가 없습니다." }, 400);

    const Content = await getFortuneContentModel();
    const item = await Content.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
    if (!item) return json({ message: "콘텐츠를 찾을 수 없습니다." }, 404);

    return json({ ok: true, item });
  } catch (err) {
    console.error("[admin/content/[id] PATCH]", err?.message || err, err?.stack || "");
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}

export async function DELETE(request, context) {
  try {
    const token = extractAdminTokenFromRequest(request);
    if (!(await verifyFlowerAdminToken(token))) return json({ message: "Unauthorized" }, 401);

    const id = await resolveId(context);
    if (!id) return json({ message: "ID가 필요합니다." }, 400);

    const Content = await getFortuneContentModel();
    const item = await Content.findByIdAndDelete(id).lean();
    if (!item) return json({ message: "콘텐츠를 찾을 수 없습니다." }, 404);

    return json({ ok: true, message: "콘텐츠가 삭제되었습니다.", id });
  } catch (err) {
    console.error("[admin/content/[id] DELETE]", err?.message || err, err?.stack || "");
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}

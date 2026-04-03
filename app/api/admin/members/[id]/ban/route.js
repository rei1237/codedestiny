// POST /api/admin/members/[id]/ban ???좎? ?뺤?/?댁젣
export const runtime = "nodejs";

import { dbConnect } from "../../../../../_lib/dbConnect.js";
import { getUserModel } from "../../../../../_lib/models/UserModel.js";
import {
  verifyFlowerAdminToken,
  extractAdminTokenFromRequest,
} from "../../../../../_lib/flowerAdminToken.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// POST { action: "ban"|"unban", reason?: string }
export async function POST(request, { params }) {
  try {
    const token = extractAdminTokenFromRequest(request);
    if (!(await verifyFlowerAdminToken(token))) return json({ message: "Unauthorized" }, 401);

    const userId = String(params?.id || "").trim();
    if (!userId) return json({ message: "?좏슚?섏? ?딆? ?ъ슜??ID?낅땲??" }, 400);

    let body;
    try { body = await request.json(); }
    catch { return json({ message: "?섎せ???붿껌 ?뺤떇?낅땲??" }, 400); }

    const action = String(body?.action || "").trim(); // "ban" or "unban"
    const reason = String(body?.reason || "").trim().slice(0, 300);

    if (!["ban", "unban"].includes(action)) {
      return json({ message: "action? 'ban' ?먮뒗 'unban' ?댁뼱???⑸땲??" }, 400);
    }

    await dbConnect();
    const User = await getUserModel();

    const user = await User.findById(userId);
    if (!user) return json({ message: "?대떦 ?뚯썝??李얠쓣 ???놁뒿?덈떎." }, 404);
    if (user.role === "admin") return json({ message: "愿由ъ옄 怨꾩젙? 蹂寃쏀븷 ???놁뒿?덈떎." }, 400);

    if (action === "ban") {
      user.status = "banned";
      user.banReason = reason || "愿由ъ옄???섑븳 怨꾩젙 ?뺤?";
      user.bannedAt = new Date();
    } else {
      user.status = "active";
      user.banReason = "";
      user.bannedAt = null;
    }

    await user.save();

    return json({
      ok: true,
      action,
      user: {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        status: user.status,
        banReason: user.banReason,
        bannedAt: user.bannedAt,
      },
    });
  } catch (err) {
    console.error("[admin/members/[id]/ban POST]", err?.message || err);
    return json({ message: `?쒕쾭 ?ㅻ쪟: ${err?.message || "?????녿뒗 ?ㅻ쪟"}` }, 500);
  }
}

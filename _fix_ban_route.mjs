import { writeFileSync } from 'fs';
const content = `// POST /api/admin/members/[id]/ban \u2014 \uacc4\uc815 \uc815\uc9c0/\ud574\uc81c
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
    if (!userId) return json({ message: "\uc720\ud6a8\ud558\uc9c0 \uc54a\uc740 \uc0ac\uc6a9\uc790 ID\uc785\ub2c8\ub2e4." }, 400);

    let body;
    try { body = await request.json(); }
    catch { return json({ message: "\uc798\ubabb\ub41c \uc694\uccad \ud615\uc2dd\uc785\ub2c8\ub2e4." }, 400); }

    const action = String(body?.action || "").trim(); // "ban" or "unban"
    const reason = String(body?.reason || "").trim().slice(0, 300);

    if (!["ban", "unban"].includes(action)) {
      return json({ message: "action\uc740 'ban' \ub610\ub294 'unban' \uc774\uc5b4\uc57c \ud569\ub2c8\ub2e4." }, 400);
    }

    await dbConnect();
    const User = await getUserModel();

    const user = await User.findById(userId);
    if (!user) return json({ message: "\ud574\ub2f9 \ud68c\uc6d0\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." }, 404);
    if (user.role === "admin") return json({ message: "\uad00\ub9ac\uc790 \uacc4\uc815\uc740 \ubcc0\uacbd\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." }, 400);

    if (action === "ban") {
      user.status = "banned";
      user.banReason = reason || "\uad00\ub9ac\uc790\uc5d0 \uc758\ud55c \uacc4\uc815 \uc815\uc9c0";
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
    return json({ message: \`\uc11c\ubc84 \uc624\ub958: \${err?.message || "\uc54c \uc218 \uc5c6\ub294 \uc624\ub958"}\` }, 500);
  }
}
`;
writeFileSync('app/api/admin/members/[id]/ban/route.js', content, 'utf8');
console.log('ban route.js written OK');

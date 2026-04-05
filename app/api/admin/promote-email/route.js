// POST /api/admin/promote-email
// 특정 이메일 계정의 역할을 admin으로 승격 (flower_admin_token 인증 필요)
export const runtime = "nodejs";

import { dbConnect } from "../../../_lib/dbConnect.js";
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

// POST { email: string, role: "admin" | "user" }
export async function POST(request) {
  try {
    const token = extractAdminTokenFromRequest(request);
    if (!(await verifyFlowerAdminToken(token))) return json({ message: "Unauthorized" }, 401);

    let body;
    try { body = await request.json(); }
    catch { return json({ message: "잘못된 요청 형식입니다." }, 400); }

    const email = String(body?.email || "").trim().toLowerCase();
    const role = String(body?.role || "admin").trim();

    if (!email) return json({ message: "email이 필요합니다." }, 400);
    if (!["admin", "user"].includes(role)) return json({ message: "role은 'admin' 또는 'user' 이어야 합니다." }, 400);

    await dbConnect();
    const User = await getUserModel();

    const user = await User.findOne({ email });
    if (!user) return json({ message: `${email} 계정을 찾을 수 없습니다.` }, 404);

    user.role = role;
    await user.save();

    return json({
      ok: true,
      message: `${user.name} (${user.email}) 계정을 ${role === "admin" ? "관리자" : "일반 사용자"}로 변경했습니다.`,
      user: { _id: String(user._id), name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    const msg = String(err?.message || err);
    console.error("[admin/promote-email POST]", msg, err?.stack || "");

    // MongoDB Atlas IP 화이트리스트 미설정 시 발생하는 타임아웃 에러 감지
    const isNetworkErr =
      msg.includes("timed out") ||
      msg.includes("ETIMEDOUT") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("ENOTFOUND") ||
      msg.includes("Server selection") ||
      msg.toLowerCase().includes("connection");

    if (isNetworkErr) {
      return json({
        message:
          "DB 연결 타임아웃: MongoDB Atlas → Network Access → " +
          '"ALLOW ACCESS FROM ANYWHERE" (0.0.0.0/0) 로 설정해 주세요. ' +
          "Cloudflare Pages는 서버리스 환경으로 IP가 매 요청마다 변경됩니다.",
      }, 503);
    }

    return json({ message: `서버 오류: ${msg}` }, 500);
  }
}

export async function GET() {
  return new Response(JSON.stringify({ message: "Not found" }), { status: 404 });
}

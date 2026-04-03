// GET|DELETE /api/admin/members/[id]
export const runtime = "nodejs";

import { dbConnect } from "../../../../_lib/dbConnect.js";
import { getUserModel } from "../../../../_lib/models/UserModel.js";
import { getPointHistoryModel } from "../../../../_lib/models/PointHistoryModel.js";
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

// GET — 단일 유저 조회 (포인트 내역 포함)
export async function GET(request, { params }) {
  try {
    const token = extractAdminTokenFromRequest(request);
    if (!(await verifyFlowerAdminToken(token))) return json({ message: "Unauthorized" }, 401);

    const userId = String(params?.id || "").trim();
    if (!userId) return json({ message: "유효하지 않은 사용자 ID입니다." }, 400);

    await dbConnect();
    const User = await getUserModel();
    const PointHistory = await getPointHistoryModel();

    const user = await User.findById(userId)
      .select("_id name email birthDate joinedAt role points status banReason bannedAt lastLoginAt gender")
      .lean();
    if (!user) return json({ message: "해당 회원을 찾을 수 없습니다." }, 404);

    const history = await PointHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return json({
      ok: true,
      user,
      pointHistory: history.map(h => ({
        _id: String(h._id),
        kind: h.kind,
        delta: h.delta,
        balanceAfter: h.balanceAfter,
        reason: h.reason,
        createdAt: h.createdAt,
      })),
    });
  } catch (err) {
    console.error("[admin/members/[id] GET]", err?.message || err);
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}

// DELETE — 회원 삭제
export async function DELETE(request, { params }) {
  try {
    const token = extractAdminTokenFromRequest(request);
    if (!(await verifyFlowerAdminToken(token))) return json({ message: "Unauthorized" }, 401);

    const userId = String(params?.id || "").trim();
    if (!userId || userId.length < 12) return json({ message: "유효하지 않은 사용자 ID입니다." }, 400);

    await dbConnect();
    const User = await getUserModel();

    const user = await User.findById(userId).lean();
    if (!user) return json({ message: "해당 회원을 찾을 수 없습니다." }, 404);
    if (user.role === "admin") return json({ message: "관리자 계정은 삭제할 수 없습니다." }, 400);

    await User.findByIdAndDelete(userId);
    return json({ ok: true, message: "회원이 삭제되었습니다.", userId });
  } catch (err) {
    console.error("[admin/members/[id] DELETE]", err?.message || err);
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}

import connectDB from "../../../../../server/config/db.js";
import User from "../../../../../server/models/User.js";
import {
  verifyFlowerAdminToken,
  extractAdminTokenFromRequest,
} from "../../../../_lib/flowerAdminToken.js";

function unauthorized() {
  return new Response(JSON.stringify({ message: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function badRequest(message) {
  return new Response(JSON.stringify({ message }), {
    status: 400,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function DELETE(request, { params }) {
  // 환경변수 검증
  if (!process.env.FLOWER_ADMIN_SECRET) {
    console.error("[admin/members/[id] DELETE] FLOWER_ADMIN_SECRET not set in Cloudflare environment");
  }
  if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
    console.error("[admin/members/[id] DELETE] MONGO_URI/MONGODB_URI not set");
  }

  const token = extractAdminTokenFromRequest(request);
  if (!(await verifyFlowerAdminToken(token))) {
    return unauthorized();
  }

  const userId = String(params?.id || "").trim();
  if (!userId || userId.length < 12) return badRequest("유효하지 않은 사용자 ID입니다.");

  // 관리자 계정 삭제 방지
  if (userId === "self") return badRequest("자신의 계정은 삭제할 수 없습니다.");

  try {
    await connectDB();

    const user = await User.findById(userId).lean();
    if (!user) {
      return new Response(JSON.stringify({ message: "해당 회원을 찾을 수 없습니다." }), {
        status: 404,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    // admin 계정은 삭제 불가 (실수 방지)
    if (user.role === "admin") {
      return badRequest("관리자 계정은 삭제할 수 없습니다.");
    }

    await User.findByIdAndDelete(userId);

    return new Response(
      JSON.stringify({ ok: true, message: "회원이 삭제되었습니다.", userId }),
      {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      },
    );
  } catch (err) {
    console.error("[admin/members/[id] DELETE]", err);
    return new Response(JSON.stringify({ message: "서버 오류가 발생했습니다." }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}

// GET 단일 사용자 조회 (선택)
export async function GET(request, { params }) {
  // 환경변수 검증
  if (!process.env.FLOWER_ADMIN_SECRET) {
    console.error("[admin/members/[id] GET] FLOWER_ADMIN_SECRET not set in Cloudflare environment");
  }
  if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
    console.error("[admin/members/[id] GET] MONGO_URI/MONGODB_URI not set");
  }

  const token = extractAdminTokenFromRequest(request);
  if (!(await verifyFlowerAdminToken(token))) {
    return unauthorized();
  }

  const userId = String(params?.id || "").trim();
  if (!userId) return badRequest("유효하지 않은 사용자 ID입니다.");

  try {
    await connectDB();

    const user = await User.findById(userId)
      .select("_id name email birthDate joinedAt role points gender")
      .lean();

    if (!user) {
      return new Response(JSON.stringify({ message: "해당 회원을 찾을 수 없습니다." }), {
        status: 404,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    return new Response(JSON.stringify({ ok: true, user }), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[admin/members/[id] GET]", err);
    return new Response(JSON.stringify({ message: "서버 오류가 발생했습니다." }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}

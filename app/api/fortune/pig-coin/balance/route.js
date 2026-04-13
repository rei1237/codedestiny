import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { getUserModel } from "../../../../_lib/models/UserModel";
import { extractAdminTokenFromRequest, verifyFlowerAdminToken } from "../../../../_lib/flowerAdminToken";

export const runtime = "nodejs";
const ADMIN_VIRTUAL_COINS = 9999999;

function verifyToken(request) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
  } catch {
    return null;
  }
}

async function isAdminRequest(request, payload) {
  if (payload?.role === "admin") return true;

  if (payload?.userId) {
    try {
      const User = await getUserModel();
      const user = await User.findById(payload.userId).select("role").lean();
      if (user?.role === "admin") return true;
    } catch {
      // DB 조회 실패 시 아래 토큰 검증으로 폴백
    }
  }

  const adminToken = extractAdminTokenFromRequest(request);
  if (!adminToken) return false;
  return verifyFlowerAdminToken(adminToken);
}

export async function GET(request) {
  const payload = verifyToken(request);
  const adminMode = await isAdminRequest(request, payload);
  if (!payload && !adminMode) return NextResponse.json({ ok: false, message: "인증이 필요합니다." }, { status: 401 });

  const userId = payload?.userId;
  if (!userId) return NextResponse.json({ ok: false, message: "로그인이 필요합니다." }, { status: 401 });

  try {
    const User = await getUserModel();
    if (adminMode) {
      const updatedAdmin = await User.findByIdAndUpdate(
        userId,
        { $set: { points: ADMIN_VIRTUAL_COINS } },
        { new: true, projection: { points: 1 } },
      ).lean();
      if (!updatedAdmin) return NextResponse.json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });

      return NextResponse.json({
        ok: true,
        adminMode: true,
        message: "관리자 코인이 9999로 재설정되었습니다.",
        user: { id: String(userId), points: Number(updatedAdmin.points || ADMIN_VIRTUAL_COINS) },
      });
    }

    const user = await User.findById(userId).select("points").lean();
    if (!user) return NextResponse.json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });

    return NextResponse.json({
      ok: true,
      message: "꽃돼지 코인 잔액을 불러왔습니다.",
      user: { id: String(userId), points: Number(user.points || 0) },
    });
  } catch (err) {
    console.error("[pig-coin/balance] error:", err);
    return NextResponse.json({ ok: false, message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function PUT(request) {
  return proxyLegacyApi(request);
}

export async function PATCH(request) {
  return proxyLegacyApi(request);
}

export async function DELETE(request) {
  return proxyLegacyApi(request);
}

export async function OPTIONS(request) {
  return proxyLegacyApi(request);
}

export async function HEAD(request) {
  return proxyLegacyApi(request);
}

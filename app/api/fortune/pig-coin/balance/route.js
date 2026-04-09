import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { getUserModel } from "@/app/_lib/models/UserModel";

export const runtime = "nodejs";

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

export async function GET(request) {
  const payload = verifyToken(request);
  if (!payload) return NextResponse.json({ ok: false, message: "인증이 필요합니다." }, { status: 401 });

  const userId = payload.userId;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    const User = await getUserModel();
    const user = await User.findById(userId).select("points").lean();
    if (!user) return NextResponse.json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });

    return NextResponse.json({
      ok: true,
      message: "꽃꽃돼지 코인 잔액을 불러왔습니다.",
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

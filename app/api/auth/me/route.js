import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getUserModel } from "@/app/_lib/models/UserModel";

export const runtime = "nodejs";

function getToken(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/fortune_auth_token=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  return null;
}

export async function GET(request) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ message: "인증 토큰이 필요합니다." }, { status: 401 });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    } catch {
      return NextResponse.json({ message: "유효하지 않거나 만료된 토큰입니다." }, { status: 401 });
    }

    const User = await getUserModel();
    const user = await User.findById(payload.userId).lean();
    if (!user) {
      return NextResponse.json({ message: "사용자 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({
      message: "인증 사용자 조회에 성공했습니다.",
      user: {
        id: String(user._id), name: user.name, email: user.email,
        birthDate: user.birthDate, birthTime: user.birthTime, gender: user.gender,
        role: user.role, points: user.points, joinedAt: user.joinedAt,
      },
    });
  } catch (err) {
    console.error("[api/auth/me]", err);
    return NextResponse.json({ message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

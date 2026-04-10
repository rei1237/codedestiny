import { NextResponse } from "next/server";
import {
  dbConnect,
  User,
  verifyToken,
  normalizeUser,
  getTokenFromRequest,
} from "../_lib/nativeAuthHelpers.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { message: "인증 토큰이 필요합니다." },
        { status: 401 },
      );
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return NextResponse.json(
        { message: "유효하지 않거나 만료된 토큰입니다." },
        { status: 401 },
      );
    }

    await dbConnect();

    const user = await User.findById(payload.userId).lean();
    if (!user) {
      return NextResponse.json(
        { message: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "인증 사용자 조회에 성공했습니다.",
      user: normalizeUser(user),
    });
  } catch (err) {
    console.error("[api/auth/me]", err);
    return NextResponse.json(
      { message: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

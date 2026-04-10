import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getUserModel } from "../../../../_lib/models/UserModel";

export const runtime = "nodejs";

function sanitizeNextPath(rawNext) {
  if (!rawNext || typeof rawNext !== "string") return null;
  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return null;
  return rawNext;
}

function normalizeUserResponse(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    birthDate: user.birthDate,
    birthTime: user.birthTime,
    gender: user.gender,
    role: user.role,
    points: user.points,
    joinedAt: user.joinedAt,
  };
}

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "요청 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const socialGrant = String(body?.socialGrant || "");
    if (!socialGrant) {
      return NextResponse.json({ message: "소셜 인증 정보가 없습니다." }, { status: 400 });
    }

    let payload;
    try {
      payload = jwt.verify(socialGrant, process.env.JWT_SECRET || "dev-secret", { issuer: "code-destiny-api" });
      if (!payload || payload.purpose !== "social-oauth-grant") throw new Error("invalid_grant");
    } catch (err) {
      if (err?.name === "TokenExpiredError") {
        return NextResponse.json({ message: "소셜 인증이 만료되었습니다. 다시 시도해 주세요." }, { status: 401 });
      }
      return NextResponse.json({ message: "유효하지 않은 소셜 인증 정보입니다." }, { status: 401 });
    }

    const User = await getUserModel();
    const user = await User.findById(payload.userId).lean();
    if (!user) {
      return NextResponse.json({ message: "사용자 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    const token = jwt.sign(
      { userId: String(user._id), email: user.email, role: user.role },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d", issuer: "code-destiny-api" },
    );

    return NextResponse.json({
      message: "소셜 로그인에 성공했습니다.",
      token,
      user: normalizeUserResponse(user),
      nextPath: sanitizeNextPath(payload.nextPath) || "/",
      provider: payload.provider,
    });
  } catch (err) {
    console.error("[oauth/complete]", err?.message || err);
    return NextResponse.json({ message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getUserModel } from "@/app/_lib/models/UserModel";

export const runtime = "nodejs";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign(
    { userId: String(user._id), email: user.email, role: user.role },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d", issuer: "code-destiny-api" },
  );
}

export async function POST(request) {
  try {
    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ message: "요청 본문이 올바른 JSON이 아닙니다." }, { status: 400 });
    }

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: "유효한 이메일 형식이 아닙니다." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ message: "비밀번호는 최소 8자 이상이어야 합니다." }, { status: 400 });
    }

    const User = await getUserModel();
    const user = await User.findOne({ email }).select("+passwordHash").lean();

    if (!user) {
      return NextResponse.json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
    }
    if (user.localAuth?.enabled === false || !user.passwordHash) {
      return NextResponse.json({
        message: "이 계정은 소셜 로그인으로 가입되었습니다. 소셜 로그인 또는 회원가입에서 로컬 로그인 추가를 진행해 주세요.",
      }, { status: 409 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    const token = signToken(user);
    return NextResponse.json({
      message: "로그인에 성공했습니다.",
      token,
      user: {
        id: String(user._id), name: user.name, email: user.email,
        birthDate: user.birthDate, birthTime: user.birthTime, gender: user.gender,
        role: user.role, points: user.points, joinedAt: user.joinedAt,
      },
    });
  } catch (err) {
    console.error("[api/auth/login]", err);
    return NextResponse.json({ message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getUserModel } from "../../../_lib/models/UserModel";

export const runtime = "nodejs";

const TEST_INICIS_LOGIN_ID = "test_inicis";
const TEST_INICIS_POINTS = 9999;

function normalizeLoginId(rawValue) {
  return String(rawValue || "").trim().toLowerCase();
}

function sanitizeNextPath(rawNext) {
  if (!rawNext || typeof rawNext !== "string") return null;
  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return null;
  return rawNext;
}

function isLocalAuthEnabled(user) {
  return user?.localAuth?.enabled !== false;
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

function signToken(user) {
  return jwt.sign(
    {
      userId: String(user._id),
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || "dev-secret",
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      issuer: "code-destiny-api",
    },
  );
}

async function enforceInicisPoints(User, user) {
  if (!user || user.email !== TEST_INICIS_LOGIN_ID) return user;
  if (Number(user.points) === TEST_INICIS_POINTS) return user;

  const updated = await User.findByIdAndUpdate(
    user._id,
    { $set: { points: TEST_INICIS_POINTS } },
    { new: true },
  ).lean();

  return updated || { ...user, points: TEST_INICIS_POINTS };
}

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "요청 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const loginId = normalizeLoginId(body?.email || body?.loginId || body?.id);
    const password = String(body?.password || "");
    const nextPath = sanitizeNextPath(body?.nextPath || "") || "/";

    if (!loginId || password.length < 8) {
      return NextResponse.json(
        {
          message: "아이디(이메일) 또는 비밀번호를 다시 확인해 주세요.",
          errors: ["아이디(이메일) 또는 비밀번호를 다시 확인해 주세요."],
        },
        { status: 400 },
      );
    }

    const User = await getUserModel();
    const user = await User.findOne({ email: loginId }).select("+passwordHash").lean();

    if (!user) {
      return NextResponse.json(
        {
          message: "아이디(이메일) 또는 비밀번호를 다시 확인해 주세요.",
          errors: ["아이디(이메일) 또는 비밀번호를 다시 확인해 주세요."],
        },
        { status: 401 },
      );
    }

    if (user.status === "banned" || user.status === "suspended") {
      return NextResponse.json({ message: "정지된 계정입니다. 관리자에게 문의해 주세요." }, { status: 403 });
    }

    if (!isLocalAuthEnabled(user) || !user.passwordHash) {
      return NextResponse.json(
        { message: "이 계정은 아이디/비밀번호 로그인이 비활성화되어 있습니다." },
        { status: 403 },
      );
    }

    const passwordMatched = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatched) {
      return NextResponse.json(
        {
          message: "아이디(이메일) 또는 비밀번호를 다시 확인해 주세요.",
          errors: ["아이디(이메일) 또는 비밀번호를 다시 확인해 주세요."],
        },
        { status: 401 },
      );
    }

    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    let normalizedUser = await User.findById(user._id).lean();
    normalizedUser = await enforceInicisPoints(User, normalizedUser);

    const token = signToken(normalizedUser);

    return NextResponse.json({
      ok: true,
      message: "로그인에 성공했습니다.",
      token,
      nextPath,
      user: normalizeUserResponse(normalizedUser),
    });
  } catch (err) {
    console.error("[api/auth/login]", err?.message || err);
    return NextResponse.json({ message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

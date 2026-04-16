import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getUserModel } from "../../../_lib/models/UserModel";

export const runtime = "nodejs";

const TEST_INICIS_LOGIN_ID = "test_inicis";
const TEST_INICIS_POINTS = 9999;

const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const birthTimeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const allowedGenders = new Set(["M", "F", "OTHER"]);

function normalizeLoginId(rawValue) {
  return String(rawValue || "").trim().toLowerCase();
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

function validatePayload(payload = {}) {
  const errors = [];

  const name = String(payload.name || "").trim();
  const email = normalizeLoginId(payload.email || payload.loginId || payload.id);
  const password = String(payload.password || "");
  const birthDate = String(payload.birthDate || "1900-01-01").trim();
  const birthTime = String(payload.birthTime || "00:00").trim();
  const gender = String(payload.gender || "OTHER").trim().toUpperCase();

  if (name.length < 2 || name.length > 40) {
    errors.push("이름은 2자 이상 40자 이하로 입력해 주세요.");
  }

  if (!email || email.length < 3 || email.length > 120 || /\s/.test(email)) {
    errors.push("아이디(이메일)는 공백 없이 3자 이상 입력해 주세요.");
  }

  if (password.length < 8 || password.length > 72) {
    errors.push("비밀번호는 8자 이상 72자 이하로 입력해 주세요.");
  }

  if (!birthDateRegex.test(birthDate)) {
    errors.push("생년월일 형식은 YYYY-MM-DD 이어야 합니다.");
  }

  if (!birthTimeRegex.test(birthTime)) {
    errors.push("태어난 시간 형식은 HH:mm 이어야 합니다.");
  }

  if (!allowedGenders.has(gender)) {
    errors.push("성별은 M, F, OTHER 중 하나여야 합니다.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      name,
      email,
      password,
      birthDate,
      birthTime,
      gender,
    },
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

    const { isValid, errors, sanitized } = validatePayload(body);
    if (!isValid) {
      return NextResponse.json(
        {
          message: "입력값을 확인해 주세요.",
          errors,
        },
        { status: 400 },
      );
    }

    const User = await getUserModel();
    const existing = await User.findOne({ email: sanitized.email }).select("_id").lean();
    if (existing) {
      return NextResponse.json({ message: "이미 사용 중인 아이디(이메일)입니다." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(sanitized.password, 12);
    const isInicisAccount = sanitized.email === TEST_INICIS_LOGIN_ID;

    const createdUser = await User.create({
      name: sanitized.name,
      email: sanitized.email,
      passwordHash,
      birthDate: sanitized.birthDate,
      birthTime: sanitized.birthTime,
      gender: sanitized.gender,
      role: "user",
      points: isInicisAccount ? TEST_INICIS_POINTS : 50,
      joinedAt: new Date(),
      status: "active",
      localAuth: {
        enabled: true,
        activatedAt: new Date(),
      },
    });

    const user = await User.findById(createdUser._id).lean();
    const token = signToken(user);

    return NextResponse.json(
      {
        ok: true,
        message: "회원가입에 성공했습니다.",
        token,
        nextPath: "/",
        user: normalizeUserResponse(user),
      },
      { status: 201 },
    );
  } catch (err) {
    if (err?.code === 11000) {
      return NextResponse.json({ message: "이미 사용 중인 아이디(이메일)입니다." }, { status: 409 });
    }

    console.error("[api/auth/register]", err?.message || err);
    return NextResponse.json({ message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import {
  dbConnect,
  User,
  bcrypt,
  signToken,
  normalizeUser,
} from "../_lib/nativeAuthHelpers.js";

export const runtime = "nodejs";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const birthTimeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const VALID_GENDERS = ["M", "F", "OTHER"];

function validatePayload(body) {
  const errors = [];
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const birthDate = String(body.birthDate || "").trim();
  const birthTime = String(body.birthTime || "").trim();
  const gender = String(body.gender || "").trim().toUpperCase();

  if (!name || name.length < 2) errors.push("이름은 최소 2자 이상이어야 합니다.");
  if (!emailRegex.test(email)) errors.push("유효한 이메일 형식이 아닙니다.");
  if (password.length < 8) errors.push("비밀번호는 최소 8자 이상이어야 합니다.");
  if (!birthDateRegex.test(birthDate)) errors.push("생년월일 형식은 YYYY-MM-DD 이어야 합니다.");
  if (!birthTimeRegex.test(birthTime)) errors.push("태어난 시간 형식은 HH:mm 이어야 합니다.");
  if (!VALID_GENDERS.includes(gender)) errors.push("성별은 M, F, OTHER 중 하나여야 합니다.");

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: { name, email, password, birthDate, birthTime, gender },
  };
}

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "요청 본문이 올바른 JSON이 아닙니다." },
        { status: 400 },
      );
    }

    const { isValid, errors, sanitized } = validatePayload(body);
    if (!isValid) {
      return NextResponse.json(
        { message: "입력값 유효성 검증에 실패했습니다.", errors },
        { status: 400 },
      );
    }

    await dbConnect();

    const existing = await User.findOne({ email: sanitized.email })
      .select("+passwordHash")
      .lean();

    if (existing) {
      const canUpgradeToLocal = existing.localAuth?.enabled === false;
      if (!canUpgradeToLocal) {
        return NextResponse.json(
          { message: "이미 가입된 이메일입니다." },
          { status: 409 },
        );
      }
      // 소셜 계정에 로컬 로그인 추가
      const passwordHash = await bcrypt.hash(sanitized.password, 12);
      const updated = await User.findByIdAndUpdate(
        existing._id,
        {
          $set: {
            name: sanitized.name,
            passwordHash,
            birthDate: sanitized.birthDate,
            birthTime: sanitized.birthTime,
            gender: sanitized.gender,
            localAuth: { enabled: true, activatedAt: new Date() },
          },
        },
        { new: true },
      ).lean();

      const token = signToken(updated);
      return NextResponse.json({
        message: "소셜 계정에 로컬 로그인 수단이 추가되었습니다.",
        token,
        user: normalizeUser(updated),
      });
    }

    const passwordHash = await bcrypt.hash(sanitized.password, 12);
    const created = await User.create({
      name: sanitized.name,
      email: sanitized.email,
      passwordHash,
      birthDate: sanitized.birthDate,
      birthTime: sanitized.birthTime,
      gender: sanitized.gender,
      role: "user",
      points: 50,
      joinedAt: new Date(),
      localAuth: { enabled: true, activatedAt: new Date() },
    });

    const token = signToken(created);
    return NextResponse.json(
      {
        message: "회원가입이 완료되었습니다.",
        token,
        user: normalizeUser(created),
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[api/auth/register]", err);
    return NextResponse.json(
      { message: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

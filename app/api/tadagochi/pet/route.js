import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getUserModel } from "../../../_lib/models/UserModel";

export const runtime = "nodejs";

function getToken(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/fortune_auth_token=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  return null;
}

async function getUser(request) {
  const token = getToken(request);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    const User = await getUserModel();
    return await User.findById(payload.userId).lean();
  } catch {
    return null;
  }
}

// GET /api/tadagochi/pet  → 현재 유저의 펫 데이터 조회
export async function GET(request) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다.", code: "UNAUTHENTICATED" }, { status: 401 });
  }
  return NextResponse.json({ pet: user.tamagotchi || null });
}

// POST /api/tadagochi/pet  → 펫 데이터 저장 (생성 or 갱신)
export async function POST(request) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다.", code: "UNAUTHENTICATED" }, { status: 401 });
  }
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  // 허용 필드만 저장 (보안)
  const allowed = ["petName","animal","zodiac","element","theme","day","hunger","happy","energy","fortune","sleeping","birthYear","chatCount","chatDate","createdAt"];
  const petData = {};
  for (const k of allowed) {
    if (body[k] !== undefined) petData[k] = body[k];
  }
  if (!petData.createdAt) petData.createdAt = user.tamagotchi?.createdAt || new Date().toISOString();
  petData.updatedAt = new Date().toISOString();

  const User = await getUserModel();
  await User.findByIdAndUpdate(user._id, { $set: { tamagotchi: petData } }, { strict: false });
  return NextResponse.json({ ok: true, pet: petData });
}

// DELETE /api/tadagochi/pet  → 펫 삭제 (처음부터 다시 시작)
export async function DELETE(request) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다.", code: "UNAUTHENTICATED" }, { status: 401 });
  }
  const User = await getUserModel();
  await User.findByIdAndUpdate(user._id, { $set: { tamagotchi: null } }, { strict: false });
  return NextResponse.json({ ok: true });
}

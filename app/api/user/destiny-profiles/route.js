/**
 * /api/user/destiny-profiles
 * 운세 서비스 제공 목적 전용 프로필(생년월일·출생시간·성별) CRUD
 * - GET  : 저장된 프로필 목록 + 현재 선택 ID 반환
 * - POST : 프로필 추가 또는 전체 목록 동기화
 * - DELETE : 단일 프로필 삭제
 */
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getUserModel } from "../../../_lib/models/UserModel";

export const runtime = "nodejs";

const MAX_PROFILES = 20;

function getToken(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/fortune_auth_token=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  return null;
}

async function resolveUser(request) {
  const token = getToken(request);
  if (!token) return { error: "인증 토큰이 필요합니다.", status: 401 };
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
  } catch {
    return { error: "유효하지 않거나 만료된 토큰입니다.", status: 401 };
  }
  const User = await getUserModel();
  const user = await User.findById(payload.userId);
  if (!user) return { error: "사용자 정보를 찾을 수 없습니다.", status: 404 };
  return { user, User };
}

function sanitizeProfile(p) {
  // 운세 계산에 필요한 필드만 허용
  return {
    id: String(p.id || ""),
    name: String(p.name || "").slice(0, 40),
    birthYear: Number(p.birthYear) || 0,
    birthMonth: Number(p.birthMonth) || 0,
    birthDay: Number(p.birthDay) || 0,
    birthHour: p.birthHour !== undefined && p.birthHour !== null ? Number(p.birthHour) : null,
    birthMinute: p.birthMinute !== undefined && p.birthMinute !== null ? Number(p.birthMinute) : null,
    gender: ["M", "F", "OTHER"].includes(p.gender) ? p.gender : "OTHER",
    calendarType: ["solar", "lunar"].includes(p.calendarType) ? p.calendarType : "solar",
    birthCountry: String(p.birthCountry || "KR").slice(0, 10),
    createdAt: String(p.createdAt || new Date().toISOString()),
    ownerScope: String(p.ownerScope || "").slice(0, 60),
  };
}

// GET: 전체 프로필 목록 + 현재 선택 ID 반환
export async function GET(request) {
  try {
    const result = await resolveUser(request);
    if (result.error) return NextResponse.json({ message: result.error }, { status: result.status });
    const { user } = result;
    return NextResponse.json({
      ok: true,
      profiles: user.destinyProfiles || [],
      currentId: user.destinyCurrentProfileId || "",
    });
  } catch (err) {
    console.error("[api/user/destiny-profiles GET]", err);
    return NextResponse.json({ message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// POST: 프로필 동기화 (전체 목록 교체) 또는 단일 추가
// body: { action: "sync", profiles: [...], currentId: "..." }
//    or { action: "add",  profile: {...} }
//    or { action: "setCurrent", currentId: "..." }
export async function POST(request) {
  try {
    const result = await resolveUser(request);
    if (result.error) return NextResponse.json({ message: result.error }, { status: result.status });
    const { user } = result;

    let body;
    try { body = await request.json(); } catch { body = {}; }
    const action = body.action || "sync";

    if (action === "sync") {
      const raw = Array.isArray(body.profiles) ? body.profiles : [];
      if (raw.length > MAX_PROFILES) {
        return NextResponse.json({ message: `프로필은 최대 ${MAX_PROFILES}개까지 저장할 수 있습니다.` }, { status: 400 });
      }
      user.destinyProfiles = raw.map(sanitizeProfile);
      if (body.currentId !== undefined) user.destinyCurrentProfileId = String(body.currentId || "");
      await user.save();
      return NextResponse.json({ ok: true, profiles: user.destinyProfiles, currentId: user.destinyCurrentProfileId });
    }

    if (action === "add") {
      const existing = Array.isArray(user.destinyProfiles) ? user.destinyProfiles : [];
      if (existing.length >= MAX_PROFILES) {
        return NextResponse.json({ message: `프로필은 최대 ${MAX_PROFILES}개까지 저장할 수 있습니다.` }, { status: 400 });
      }
      const profile = sanitizeProfile(body.profile || {});
      if (!profile.id) profile.id = "dp_" + Date.now();
      existing.push(profile);
      user.destinyProfiles = existing;
      if (!user.destinyCurrentProfileId) user.destinyCurrentProfileId = profile.id;
      await user.save();
      return NextResponse.json({ ok: true, profile, profiles: user.destinyProfiles, currentId: user.destinyCurrentProfileId });
    }

    if (action === "setCurrent") {
      user.destinyCurrentProfileId = String(body.currentId || "");
      await user.save();
      return NextResponse.json({ ok: true, currentId: user.destinyCurrentProfileId });
    }

    return NextResponse.json({ message: "알 수 없는 action입니다." }, { status: 400 });
  } catch (err) {
    console.error("[api/user/destiny-profiles POST]", err);
    return NextResponse.json({ message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// DELETE: 단일 프로필 삭제
// body: { id: "dp_xxx" }
export async function DELETE(request) {
  try {
    const result = await resolveUser(request);
    if (result.error) return NextResponse.json({ message: result.error }, { status: result.status });
    const { user } = result;

    let body;
    try { body = await request.json(); } catch { body = {}; }
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ message: "삭제할 프로필 id가 필요합니다." }, { status: 400 });

    const existing = Array.isArray(user.destinyProfiles) ? user.destinyProfiles : [];
    user.destinyProfiles = existing.filter((p) => p.id !== id);
    if (user.destinyCurrentProfileId === id) {
      user.destinyCurrentProfileId = user.destinyProfiles.length ? user.destinyProfiles[0].id : "";
    }
    await user.save();
    return NextResponse.json({ ok: true, profiles: user.destinyProfiles, currentId: user.destinyCurrentProfileId });
  } catch (err) {
    console.error("[api/user/destiny-profiles DELETE]", err);
    return NextResponse.json({ message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

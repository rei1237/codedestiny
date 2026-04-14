import { NextResponse } from "next/server";
import { getUserModel } from "../../../../_lib/models/UserModel";
import { isAdminRequest, verifyJwtFromRequest } from "../../../_lib/adminAccess";

export const runtime = "nodejs";

export async function GET(request) {
  const payload = verifyJwtFromRequest(request);
  const adminMode = await isAdminRequest(request);
  if (!payload && !adminMode) return NextResponse.json({ ok: false, message: "인증이 필요합니다." }, { status: 401 });

  const userId = payload?.userId;
  if (!userId && !adminMode) return NextResponse.json({ ok: false, message: "로그인이 필요합니다." }, { status: 401 });

  try {
    // 관리자 토큰만 있고 실 userId가 없으면 코인 확인 불필요
    if (adminMode && !userId) {
      return NextResponse.json({ ok: true, adminMode: true });
    }

    const User = await getUserModel();
    const user = await User.findById(userId).select("points").lean();
    if (!user) return NextResponse.json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });

    return NextResponse.json({
      ok: true,
      message: "꽃돼지 코인 잔액을 불러왔습니다.",
      user: { id: String(userId), points: Number(user.points || 0) },
    });
  } catch (err) {
    console.error("[pig-coin/balance] error:", err);
    return NextResponse.json({ ok: false, message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function PUT(request) {
  return NextResponse.json({ ok: false, message: "허용되지 않은 메서드입니다." }, { status: 405 });
}

export async function PATCH(request) {
  return NextResponse.json({ ok: false, message: "허용되지 않은 메서드입니다." }, { status: 405 });
}

export async function DELETE(request) {
  return NextResponse.json({ ok: false, message: "허용되지 않은 메서드입니다." }, { status: 405 });
}

export async function OPTIONS(request) {
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function HEAD(request) {
  return new Response(null, { status: 200 });
}

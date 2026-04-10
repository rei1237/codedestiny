import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "local_auth_disabled",
      message: "아이디/비밀번호 로그인은 지원하지 않습니다. 소셜 로그인을 이용해 주세요.",
    },
    { status: 410 },
  );
}

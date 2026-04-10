import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ message: "로그아웃되었습니다." });
  response.cookies.set("fortune_auth_token", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  response.cookies.set("fortune_auth_role", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  return response;
}

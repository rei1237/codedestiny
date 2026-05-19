import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const revalidate = false;

export async function GET() {
  return NextResponse.json({
    status: "success",
    message: "API 엔드포인트 연결 성공!",
    timestamp: new Date().toISOString(),
  });
}

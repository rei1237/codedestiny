import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const revalidate = false;

const API_HELLO_ROUTE_TEXT_TRANSLATIONS = {
  ko: {
    success: "API 엔드포인트 연결 성공!",
  },
  en: {
    success: "API endpoint connected successfully!",
  },
  ja: {
    success: "APIエンドポイントの接続に成功しました！",
  },
} as const;

export async function GET() {
  return NextResponse.json({
    status: "success",
    message: API_HELLO_ROUTE_TEXT_TRANSLATIONS.ko.success,
    timestamp: new Date().toISOString(),
  });
}

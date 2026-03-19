import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAdminSecret } from "../_admin/requireAdminSecret";
import { serveAdminFile } from "../_admin/serveAdminFile";

export async function GET(request: Request, { params }: { params: { adminHash: string } }) {
  const blocked = await requireAdminSecret(request, params, { requireAuth: false });
  if (blocked) return blocked;

  // 토큰이 있으면 대시보드, 없으면 로그인
  const token = cookies().get("fortune_auth_token")?.value;
  if (token) {
    // requireAdminSecret의 인증 검증을 재사용하기 위해 requireAuth=true로 재호출
    const blocked2 = await requireAdminSecret(request, params, { requireAuth: true });
    if (!blocked2) {
      return serveAdminFile(["[hash]", "dashboard.html"]);
    }
  }

  return serveAdminFile(["[hash]", "login.html"]);
}

export async function POST() {
  return NextResponse.json({ message: "Not found" }, { status: 404 });
}


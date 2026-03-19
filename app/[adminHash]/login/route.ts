import { NextResponse } from "next/server";
import { requireAdminSecret } from "../../_admin/requireAdminSecret";
import { serveAdminFile } from "../../_admin/serveAdminFile";

export async function GET(request: Request, { params }: { params: { adminHash: string } }) {
  const blocked = await requireAdminSecret(request, params, { requireAuth: false });
  if (blocked) return blocked;

  // 로그인 페이지는 “인증 세션 없이도” 보여줄 수 있어야 한다.
  return serveAdminFile(["[hash]", "login.html"]);
}

export async function POST() {
  // POST로 직접 접근하는 경우는 차단
  return NextResponse.json({ message: "Not found" }, { status: 404 });
}


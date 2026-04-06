import { NextResponse } from "next/server";
import { requireAdminSecret } from "../../../_admin/requireAdminSecret";
import { serveAdminFile } from "../../../_admin/serveAdminFile";

export async function GET(request: Request, { params }: { params: Promise<{ adminHash: string; path: string[] }> }) {
  // CSS/JS 모듈은 로그인 전에도 로드되어야 한다.
  // (보안상 민감 토큰/비밀정보는 백엔드 인증/세션에서만 다룬다.)
  const { adminHash, path } = await params;
  const blocked = await requireAdminSecret(request, { adminHash }, { requireAuth: false });
  if (blocked) return blocked;
  return serveAdminFile(["assets", ...(path || [])]);
}

export async function POST() {
  return NextResponse.json({ message: "Not found" }, { status: 404 });
}


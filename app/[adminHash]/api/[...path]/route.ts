import { NextResponse } from "next/server";
import { requireAdminSecret } from "../../../_admin/requireAdminSecret";
import { serveAdminFile } from "../../../_admin/serveAdminFile";

export async function GET(request: Request, { params }: { params: Promise<{ adminHash: string; path: string[] }> }) {
  // admin/api 모듈은 로그인 전에도 로드되어야 한다(로그인 페이지에서 API 호출을 준비해야 함).
  // 실제 관리자 데이터/세션은 Express의 `/api/admin/auth/*`에서 2차로 검증한다.
  const { adminHash, path } = await params;
  const blocked = await requireAdminSecret(request, { adminHash }, { requireAuth: false });
  if (blocked) return blocked;
  return serveAdminFile(["api", ...(path || [])]);
}

export async function POST() {
  return new NextResponse("Not found", { status: 404 });
}


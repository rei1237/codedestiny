import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAdminSecret } from "../_admin/requireAdminSecret";
import { serveAdminFile } from "../_admin/serveAdminFile";

/**
 * app/[adminHash]/route.ts 는 "/:단일세그먼트" 전부를 잡는다.
 * 미들웨어가 일부 요청에서 건너뛰면 index.html·favicon 등이 adminHash 로 오인되어
 * requireAdminSecret 이 JSON 404를 반환할 수 있으므로, 흔한 정적 파일명은 먼저 rewrite 한다.
 */
export async function GET(request: Request, { params }: { params: { adminHash: string } }) {
  const segment = String(params.adminHash || "");
  const lower = segment.toLowerCase();

  if (lower === "index.html" || lower === "index") {
    return NextResponse.rewrite(new URL("/static/index.html", request.url));
  }
  if (lower === "favicon.ico") {
    return NextResponse.rewrite(new URL("/icons/samba-mode-icon.png", request.url));
  }
  if (lower === "robots.txt") {
    return NextResponse.rewrite(new URL("/robots.txt", request.url));
  }
  if (lower === "sitemap.xml") {
    return NextResponse.rewrite(new URL("/sitemap.xml", request.url));
  }
  if (lower === "manifest.json") {
    return NextResponse.rewrite(new URL("/manifest.json", request.url));
  }
  if (lower === "service-worker.js") {
    return NextResponse.rewrite(new URL("/service-worker.js", request.url));
  }

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


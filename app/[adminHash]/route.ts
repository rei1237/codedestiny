import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAdminSecret } from "../_admin/requireAdminSecret";
import { serveAdminFile } from "../_admin/serveAdminFile";

/**
 * app/[adminHash]/route.ts 는 "/:단일세그먼트" 전부를 잡는다.
 * 미들웨어를 우회한 경우를 대비해 index.html·favicon 같은 정적 파일명은 먼저 예외 처리한다.
 */
export async function GET(request: Request, { params }: { params: { adminHash: string } }) {
  const segment = String(params.adminHash || "");
  const lower = segment.toLowerCase();

  if (lower === "index.html" || lower === "index") {
    return NextResponse.redirect(new URL("/", request.url), 301);
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


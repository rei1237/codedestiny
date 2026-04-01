import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import path from "node:path";
import { requireAdminSecret } from "../_admin/requireAdminSecret";
import { serveAdminFile } from "../_admin/serveAdminFile";

const PUBLIC_ROOT_DIR = path.join(process.cwd(), "public");

function contentTypeForExt(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml; charset=utf-8";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".xml") return "application/xml; charset=utf-8";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  if (ext === ".ico") return "image/x-icon";
  return "application/octet-stream";
}

async function servePublicRootFile(fileName: string): Promise<NextResponse> {
  // single-segment static only: block traversal and slashes
  if (!fileName || fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const fullPath = path.join(PUBLIC_ROOT_DIR, fileName);
  const normalizedRoot = path.normalize(PUBLIC_ROOT_DIR + path.sep);
  const normalizedFull = path.normalize(fullPath);
  if (!normalizedFull.startsWith(normalizedRoot)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const fs = await import("node:fs/promises");
  try {
    const content = await fs.readFile(fullPath);
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": contentTypeForExt(fullPath),
      },
    });
  } catch {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
}

/**
 * app/[adminHash]/route.ts 는 "/:단일세그먼트" 전부를 잡는다.
 * 미들웨어를 우회한 경우를 대비해 index.html·favicon 같은 정적 파일명은 먼저 예외 처리한다.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ adminHash: string }> },
) {
  const params = await context.params;
  const segment = String(params.adminHash || "");
  const lower = segment.toLowerCase();

  // app/[adminHash] can capture any root single-segment path.
  // If it looks like a static filename (e.g. /manifest.json, /AnalysisEngine.js),
  // serve from public root instead of running admin auth flow.
  if (segment.includes(".")) {
    return servePublicRootFile(segment);
  }

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
  if (lower === "rss.xml") {
    return NextResponse.rewrite(new URL("/rss.xml", request.url));
  }

  const blocked = await requireAdminSecret(request, params, { requireAuth: false });
  if (blocked) return blocked;

  // 토큰이 있으면 대시보드, 없으면 로그인
  const cookieStore = await cookies();
  const token = cookieStore.get("fortune_auth_token")?.value;
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


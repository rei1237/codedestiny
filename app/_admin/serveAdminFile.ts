import path from "path";
import { NextResponse } from "next/server";

const ADMIN_ROOT_DIR = path.join(process.cwd(), "admin");

function contentTypeForExt(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml; charset=utf-8";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

function sanitizeSegments(segments) {
  return segments.filter(Boolean).filter((s) => !s.includes("..") && !s.startsWith("/"));
}

export async function serveAdminFile(relativePathSegments) {
  const segments = sanitizeSegments(relativePathSegments);
  const relative = path.join(...segments);
  const full = path.join(ADMIN_ROOT_DIR, relative);

  // Path traversal 방지: 실제 풀 경로가 admin 루트 안에 있는지 확인
  const normalizedAdminRoot = path.normalize(ADMIN_ROOT_DIR + path.sep);
  const normalizedFull = path.normalize(full + path.sep);
  if (!normalizedFull.startsWith(normalizedAdminRoot)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const fs = await import("fs/promises");
  try {
    const content = await fs.readFile(full);
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": contentTypeForExt(full),
        // 관리자 정적 파일은 캐시를 짧게
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
}


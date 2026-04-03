/**
 * serveAdminFile
 *
 * Reads a file from the /admin/ directory and returns it as a NextResponse.
 * Path segments are validated to prevent directory traversal.
 */
import { NextResponse } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";

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

/**
 * @param pathParts  path segments relative to <cwd>/admin/
 *                   e.g. ["[hash]", "dashboard.html"] → admin/[hash]/dashboard.html
 *                   e.g. ["assets", "app.css"]        → admin/assets/app.css
 */
export async function serveAdminFile(pathParts: string[]): Promise<NextResponse> {
  // Reject any segment that looks like traversal
  for (const part of pathParts) {
    if (!part || part.includes("..") || part.includes("\\") || part.includes("\0")) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
  }

  const adminRoot = path.join(process.cwd(), "admin");
  const filePath = path.join(adminRoot, ...pathParts);

  // Double-check traversal after join
  const normalizedRoot = path.normalize(adminRoot + path.sep);
  const normalizedFile = path.normalize(filePath);
  if (!normalizedFile.startsWith(normalizedRoot)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const content = await fs.readFile(filePath);
    return new NextResponse(content as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentTypeForExt(filePath),
        "Cache-Control": "no-store, no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
}

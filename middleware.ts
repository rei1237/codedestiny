import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BOT_UA_RE =
  /(googlebot|bingbot|baiduspider|yandexbot|duckduckbot|slurp|facebot|ia_archiver|sogou|360spider|bytespider|semrushbot|ahrefsbot)/i;

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Prevent SEO split: let bots index "/" only.
  if (pathname === "/index.html") {
    const ua = request.headers.get("user-agent") || "";
    if (BOT_UA_RE.test(ua)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = search;
      return NextResponse.redirect(url, 301);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/index.html"],
};


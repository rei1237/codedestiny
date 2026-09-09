import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const PAGE_FILE_RE = /^page\.(?:js|jsx|ts|tsx)$/;
const NON_ROUTE_DIRECTORIES = new Set([".next", "docs", "node_modules", "out", "public"]);

function collectAppPages(rootDir) {
  const pages = [];

  const walk = (directory, segments) => {
    for (const name of readdirSync(directory).sort()) {
      const absolutePath = join(directory, name);
      if (statSync(absolutePath).isDirectory()) {
        if (name.startsWith("_") || name === "api") continue;
        walk(absolutePath, /^\(.*\)$/.test(name) ? segments : [...segments, name]);
        continue;
      }
      if (PAGE_FILE_RE.test(name)) pages.push(segments);
    }
  };

  walk(resolve(rootDir, "app"), []);
  return pages;
}

function readLocaleSegments(rootDir) {
  const localeSource = resolve(rootDir, "lib/i18n/locales.ts");
  if (!existsSync(localeSource)) {
    throw new Error("[sitemap] 활성 로케일 원본 lib/i18n/locales.ts 가 없습니다.");
  }

  const segments = new Set(
    [...readFileSync(localeSource, "utf8").matchAll(/pathPrefix:\s*"([^"]*)"/g)]
      .map((match) => match[1].replace(/^\//, ""))
      .filter(Boolean),
  );
  if (segments.size === 0) {
    throw new Error("[sitemap] lib/i18n/locales.ts 에서 활성 로케일 경로를 찾지 못했습니다.");
  }
  return segments;
}

function collectStaticHtmlRoutes(rootDir) {
  const routes = new Set();

  for (const name of readdirSync(rootDir)) {
    if (name.endsWith(".html") && name !== "index.html") routes.add(`/${name.slice(0, -5)}`);
  }

  for (const name of readdirSync(rootDir)) {
    if (NON_ROUTE_DIRECTORIES.has(name) || name.startsWith(".")) continue;
    const indexPath = resolve(rootDir, name, "index.html");
    if (existsSync(indexPath) && statSync(indexPath).isFile()) routes.add(`/${name}`);
  }

  return routes;
}

function matchesPagePattern(segments, pathname, localeSegments) {
  const parts = pathname.split("/").filter(Boolean);
  const catchAllAt = segments.findIndex((segment) => segment.startsWith("[..."));
  if (catchAllAt < 0 ? segments.length !== parts.length : parts.length < catchAllAt) return false;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment.startsWith("[...")) return true;
    if (segment.startsWith("[")) {
      if (segment === "[locale]" && !localeSegments.has(parts[index])) return false;
      continue;
    }
    if (segment !== parts[index]) return false;
  }

  return true;
}

export function createLiveRouteMatcher(rootDir) {
  const appPages = collectAppPages(rootDir);
  const staticHtmlRoutes = collectStaticHtmlRoutes(rootDir);
  const localeSegments = readLocaleSegments(rootDir);

  return (pathname) => {
    const normalized = String(pathname || "/").split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
    if (normalized === "/") return existsSync(resolve(rootDir, "index.html"));
    if (staticHtmlRoutes.has(normalized)) return true;
    return appPages.some((segments) => matchesPagePattern(segments, normalized, localeSegments));
  };
}

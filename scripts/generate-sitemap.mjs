import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const rootDir = process.cwd();
const appDir = resolve(rootDir, "app");
const publicDir = resolve(rootDir, "public");
const sitemapRootPath = resolve(rootDir, "sitemap.xml");
const siteBaseUrl = (process.env.SITE_URL || "https://code-destiny.com").replace(/\/$/, "");
const today = new Date().toISOString().slice(0, 10);

const staticSkipDirs = new Set([
  ".git",
  ".next",
  ".open-next",
  "node_modules",
  "public",
  "build",
  "dist",
  "memories",
]);

function toPosixPath(filePath) {
  return filePath.split(sep).join("/");
}

function walkHtmlFiles(currentDir, bucket = []) {
  const entries = readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = resolve(currentDir, entry.name);

    if (entry.isDirectory()) {
      if (currentDir === rootDir && staticSkipDirs.has(entry.name)) {
        continue;
      }
      walkHtmlFiles(fullPath, bucket);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".html")) {
      continue;
    }

    const rel = toPosixPath(relative(rootDir, fullPath));
    if (!rel) continue;
    bucket.push(rel);
  }

  return bucket;
}

function htmlPathToRoute(relHtmlPath) {
  if (relHtmlPath === "index.html") {
    return "/";
  }

  if (relHtmlPath.endsWith("/index.html")) {
    return `/${relHtmlPath.slice(0, -"index.html".length)}`;
  }

  return `/${relHtmlPath}`;
}

function walkAppPageFiles(currentDir, bucket = []) {
  if (!existsSync(currentDir)) {
    return bucket;
  }

  const entries = readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = resolve(currentDir, entry.name);

    if (entry.isDirectory()) {
      walkAppPageFiles(fullPath, bucket);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!/^page\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      continue;
    }

    bucket.push(fullPath);
  }

  return bucket;
}

function appFileToRoute(appPagePath) {
  const rel = toPosixPath(relative(appDir, appPagePath));
  const routeDir = rel.replace(/\/page\.(js|jsx|ts|tsx)$/, "");

  if (!routeDir) {
    return "/";
  }

  const segments = routeDir
    .split("/")
    .filter(Boolean)
    .filter((segment) => !segment.startsWith("(") && !segment.endsWith(")"));

  if (segments.length === 0) {
    return "/";
  }

  if (segments.some((segment) => segment.includes("[") || segment.includes("]"))) {
    return null;
  }

  if (segments[0] === "api") {
    return null;
  }

  return `/${segments.join("/")}`;
}

function getPriority(routePath) {
  if (routePath === "/") return "1.0";
  if (routePath === "/fortune/") return "0.9";
  if (routePath.startsWith("/fortune/")) return "0.8";
  if (["/privacy-policy", "/terms-of-service", "/contact-us"].includes(routePath)) return "0.8";
  if (["/login", "/signup", "/points"].includes(routePath)) return "0.6";
  return "0.7";
}

function getChangefreq(routePath) {
  if (routePath === "/") return "daily";
  if (routePath.startsWith("/fortune/")) return "daily";
  return "weekly";
}

function toXmlUrlEntry(routePath) {
  const normalizedPath = routePath.endsWith("//") ? routePath.slice(0, -1) : routePath;
  const loc = `${siteBaseUrl}${normalizedPath}`;

  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    `    <changefreq>${getChangefreq(normalizedPath)}</changefreq>`,
    `    <priority>${getPriority(normalizedPath)}</priority>`,
    "  </url>",
  ].join("\n");
}

function buildSitemapXml(routeSet) {
  const sortedRoutes = Array.from(routeSet).sort((a, b) => a.localeCompare(b));
  const body = sortedRoutes.map((routePath) => toXmlUrlEntry(routePath)).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    "</urlset>",
    "",
  ].join("\n");
}

function main() {
  const routeSet = new Set();

  const staticHtmlFiles = walkHtmlFiles(rootDir);
  for (const relHtmlPath of staticHtmlFiles) {
    routeSet.add(htmlPathToRoute(relHtmlPath));
  }

  const appPageFiles = walkAppPageFiles(appDir);
  for (const appPagePath of appPageFiles) {
    const routePath = appFileToRoute(appPagePath);
    if (routePath) {
      routeSet.add(routePath);
    }
  }

  routeSet.delete("/public/index.html");

  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }

  const xml = buildSitemapXml(routeSet);
  writeFileSync(sitemapRootPath, xml, "utf8");

  console.log(`[sitemap] Generated ${routeSet.size} routes -> sitemap.xml`);
}

main();

/**
 * dist/ 의 모든 HTML 페이지의 색인 상태 스냅숏. 네트워크를 쓰지 않는다.
 *
 * 페이지마다 robots·googlebot meta, `_headers` X-Robots-Tag, canonical, 사이트맵 포함 여부를 모은다.
 * 리팩터 전후 스냅숏을 diffIndexState 로 비교해 색인 결정(index/follow·헤더·canonical·사이트맵)이 바뀌지 않았음을 증명한다.
 * robots 문자열의 순서·대소문자·부가 지시(max-image-preview 등)는 비교하지 않는다.
 *
 * 실행: node scripts/seo/index-state.mjs [--dist=dist] [--json=<경로>] [--diff=<전 JSON>]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { htmlFiles, sitemapLocs } from "../verify-sitemap-canonical.mjs";
import { getCanonical, getMeta, parseHeaderRobotsRules } from "./health-policy.mjs";

const COMPARED_FIELDS = ["indexable", "follow", "headerRobots", "canonical", "inSitemap"];

function directives(values) {
  return values.join(",").toLowerCase().split(",").map((token) => token.trim()).filter(Boolean);
}

// Cloudflare `_headers` 경로 패턴: `*` 는 무엇이든(splat), `:name` 은 한 세그먼트. 나머지는 글자 그대로, 전체 일치.
function headerPatternRegex(pattern) {
  const source = pattern
    .split(/(\*|:[A-Za-z]\w*)/)
    .map((part) => (part === "*" ? ".*" : part.startsWith(":") && part.length > 1 ? "[^/]+" : part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")))
    .join("");
  return new RegExp(`^${source}$`);
}

function pagePath(file, distDir) {
  const rel = relative(distDir, file).split(sep).join("/");
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return `/${rel.slice(0, -"index.html".length)}`;
  return `/${rel}`;
}

function locPathname(loc) {
  try {
    return decodeURIComponent(new URL(loc).pathname);
  } catch {
    return null;
  }
}

export function collectIndexState(distDir) {
  const headersFile = join(distDir, "_headers");
  const headerRules = existsSync(headersFile)
    ? parseHeaderRobotsRules(readFileSync(headersFile, "utf8")).map((rule) => ({ ...rule, regex: headerPatternRegex(rule.pattern) }))
    : [];
  const sitemapPaths = new Set([...sitemapLocs(distDir).locs].map(locPathname).filter(Boolean));
  const entries = htmlFiles(distDir).map((file) => {
    const html = readFileSync(file, "utf8");
    const path = pagePath(file, distDir);
    const robots = [...getMeta(html, "robots"), ...getMeta(html, "googlebot")];
    const headerValues = headerRules.filter((rule) => rule.regex.test(path)).map((rule) => rule.value);
    const headerTokens = [...new Set(directives(headerValues))].sort();
    const all = [...directives(robots), ...headerTokens];
    const canonicals = getCanonical(html);
    return {
      path,
      robots,
      indexable: !all.some((token) => token === "noindex" || token === "none"),
      follow: !all.some((token) => token === "nofollow" || token === "none"),
      headerRobots: headerTokens.length ? headerTokens.join(", ") : null,
      canonical: canonicals.length ? canonicals.join(" ") : null,
      inSitemap: sitemapPaths.has(path) || (path.endsWith(".html") && sitemapPaths.has(path.slice(0, -".html".length))),
    };
  });
  return entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

export function diffIndexState(before, after) {
  const afterByPath = new Map(after.map((entry) => [entry.path, entry]));
  const beforePaths = new Set(before.map((entry) => entry.path));
  const lines = [];
  for (const entry of before) {
    const next = afterByPath.get(entry.path);
    if (!next) {
      lines.push(`${entry.path} page present→missing`);
      continue;
    }
    for (const field of COMPARED_FIELDS) {
      if (entry[field] !== next[field]) lines.push(`${entry.path} ${field} ${entry[field]}→${next[field]}`);
    }
  }
  for (const entry of after) if (!beforePaths.has(entry.path)) lines.push(`${entry.path} page missing→present`);
  return lines;
}

function main() {
  const arg = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
  const distDir = arg("dist") || "dist";
  const state = collectIndexState(distDir);
  const jsonPath = arg("json");
  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, `${JSON.stringify(state, null, 2)}\n`);
  }
  const counts = {
    pages: state.length,
    indexable: state.filter((entry) => entry.indexable).length,
    noindex: state.filter((entry) => !entry.indexable).length,
    inSitemap: state.filter((entry) => entry.inSitemap).length,
  };
  console.log(`[index-state] ${JSON.stringify(counts)}${jsonPath ? ` → ${jsonPath}` : ""}`);
  const diffPath = arg("diff");
  if (diffPath) {
    const lines = diffIndexState(JSON.parse(readFileSync(diffPath, "utf8")), state);
    for (const line of lines) console.log(line);
    console.log(`[index-state] diff ${lines.length} line(s) vs ${diffPath}`);
    if (lines.length) process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

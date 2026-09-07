/**
 * 정적 셸(dist)의 인라인 CSS를 캐시 가능한 파일로 묶는다.
 *
 * 소스 index.html은 문자열 기반 가드가 직접 읽으므로 절대 고치지 않는다. 이 단계는
 * CSS minify 뒤에 실행되어, 배포되는 정적 셸에서만 연속한 <style> 구간을
 * /css/shell/<content-hash>.css 로 교체한다.
 *
 * 안전 경계:
 * - React 하이드레이션 HTML(__next_f)은 건드리지 않는다.
 * - 홈 첫 페인트 잠금 CSS는 반드시 인라인으로 남긴다.
 * - stylesheet link 또는 외부화 불가 style을 넘어서 합치지 않아 캐스케이드 순서를 보존한다.
 * - 런타임에서 참조하는 style id와 media 속성 style은 보수적으로 제외한다.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const ROOT = process.cwd();
const DIST = resolve(ROOT, "dist");
const OUT_DIR = resolve(DIST, "css", "shell");
const HOME_SHELL_MARKER = 'id="cd-main-shell-critical-v20260604"';
const HERO_FIRST_PAINT_ID = "cd-hero-firstpaint-lock-v20260820";
const STYLE_RE = /<style(\s[^>]*)?>([\s\S]*?)<\/style\s*>/gi;
const STYLESHEET_LINK_RE = /<link\b[^>]*\brel\s*=\s*(?:"[^"]*\bstylesheet\b[^"]*"|'[^']*\bstylesheet\b[^']*'|stylesheet\b)[^>]*>/i;
const ID_RE = /\bid\s*=\s*(?:"([^"]+)"|'([^']+)')/i;

function collectFiles(dir, test) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(full, test));
    else if (test(entry.name)) files.push(full);
  }
  return files;
}

function isReactHydratedHtml(html) {
  return html.includes("__next_f");
}

function isHomeShell(html) {
  return html.includes(HOME_SHELL_MARKER);
}

function styleId(attrs) {
  const match = ID_RE.exec(attrs || "");
  return match ? match[1] || match[2] : null;
}

function isEligibleStyle(attrs, body, referencedIds) {
  const id = styleId(attrs);
  if (id === HERO_FIRST_PAINT_ID) return false;
  // media/type/nonce 등은 <link>에 그대로 옮기는 것만으로 style과 동등하지 않다.
  if (/\b(?:media|nonce|title)\s*=/i.test(attrs || "")) return false;
  if (body.includes("${") || body.includes("</style")) return false;
  if (id && referencedIds.has(id)) return false;
  return true;
}

function collectReferencedStyleIds(files) {
  const referenced = new Set();
  const idPattern = /(?:getElementById|querySelector(?:All)?)\s*\(\s*["']#?([^"']+)["']/g;
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    let match;
    while ((match = idPattern.exec(source))) referenced.add(match[1]);
  }
  return referenced;
}

if (!existsSync(DIST)) {
  console.error("[externalize-dist-inline-css] dist가 없다. `npm run build:cf` 뒤에 실행되어야 한다.");
  process.exit(1);
}

const htmlFiles = collectFiles(DIST, (name) => name.endsWith(".html"));
if (htmlFiles.length === 0) {
  console.error("[externalize-dist-inline-css] dist에 HTML이 없다. 외부화 대상이 확인되지 않았다.");
  process.exit(1);
}

const referenceFiles = [
  ...htmlFiles,
  ...collectFiles(DIST, (name) => name.endsWith(".js")),
];
const referencedIds = collectReferencedStyleIds(referenceFiles);
mkdirSync(OUT_DIR, { recursive: true });

const written = new Map();
let shellFiles = 0;
let hydratedSkipped = 0;
let touchedFiles = 0;
let extractedGroups = 0;
let extractedBlocks = 0;
let htmlBefore = 0;
let htmlAfter = 0;

for (const file of htmlFiles) {
  const original = readFileSync(file, "utf8");
  htmlBefore += Buffer.byteLength(original);
  if (isReactHydratedHtml(original)) {
    hydratedSkipped += 1;
    htmlAfter += Buffer.byteLength(original);
    continue;
  }
  if (!isHomeShell(original)) {
    htmlAfter += Buffer.byteLength(original);
    continue;
  }
  shellFiles += 1;

  const styles = [];
  STYLE_RE.lastIndex = 0;
  let match;
  while ((match = STYLE_RE.exec(original))) {
    const attrs = match[1] || "";
    styles.push({
      start: match.index,
      end: match.index + match[0].length,
      attrs,
      body: match[2],
      eligible: isEligibleStyle(attrs, match[2], referencedIds),
    });
  }

  const edits = [];
  let group = null;
  function flushGroup() {
    if (!group) return;
    const css = group.styles.map((style) => style.body.replace(/^\n+|\s+$/g, "")).join("\n") + "\n";
    const hash = createHash("sha256").update(css).digest("hex").slice(0, 16);
    let name = written.get(hash);
    if (!name) {
      name = `s-${hash}.css`;
      writeFileSync(resolve(OUT_DIR, name), css, "utf8");
      written.set(hash, name);
    }
    edits.push({
      start: group.styles[0].start,
      end: group.styles[group.styles.length - 1].end,
      output: `<link rel="stylesheet" href="/css/shell/${name}">`,
      preserved: group.styles.slice(1).map((style, index) => ({
        at: style.start,
        html: original.slice(group.styles[index].end, style.start),
      })),
    });
    extractedGroups += 1;
    extractedBlocks += group.styles.length;
    group = null;
  }

  for (const style of styles) {
    if (!style.eligible) {
      flushGroup();
      continue;
    }
    if (group) {
      const gap = original.slice(group.styles[group.styles.length - 1].end, style.start);
      if (STYLESHEET_LINK_RE.test(gap)) flushGroup();
    }
    if (!group) group = { styles: [] };
    group.styles.push(style);
  }
  flushGroup();

  if (edits.length === 0) {
    htmlAfter += Buffer.byteLength(original);
    continue;
  }

  let next = "";
  let cursor = 0;
  for (const edit of edits) {
    next += original.slice(cursor, edit.start) + edit.output;
    for (const preserved of edit.preserved) next += preserved.html;
    cursor = edit.end;
  }
  next += original.slice(cursor);
  writeFileSync(file, next, "utf8");
  htmlAfter += Buffer.byteLength(next);
  touchedFiles += 1;
}

const cssBytes = [...written.values()].reduce((sum, name) => sum + statSync(resolve(OUT_DIR, name)).size, 0);
console.log(
  `[externalize-dist-inline-css] 정적 셸 ${touchedFiles}/${shellFiles}개에서 style ${extractedBlocks}블록을 ` +
    `${extractedGroups}개 구간으로 분리 → 고유 CSS ${written.size}개(${Math.round(cssBytes / 1024)}KB). ` +
    `HTML 합계 ${Math.round(htmlBefore / 1024)}KB → ${Math.round(htmlAfter / 1024)}KB ` +
    `(${Math.round((htmlBefore - htmlAfter) / 1024)}KB 감소)`,
);
console.log(`[externalize-dist-inline-css] React 하이드레이션 HTML ${hydratedSkipped}개와 첫 페인트 잠금 CSS는 유지했다.`);

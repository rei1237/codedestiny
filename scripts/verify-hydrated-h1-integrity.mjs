#!/usr/bin/env node
/**
 * 하이드레이션 이후 H1 중복 가드.
 *
 * 왜 필요한가 (2026-08-28):
 *   `scripts/verify-seo-heading-integrity.mjs` 는 **서버 HTML 만** 본다(그 파일 20행이 스스로
 *   명시한다). 그래서 `page.tsx` 가 h1 을 그리고 같은 라우트의 `ssr:false` 클라이언트가 또
 *   h1 을 그리면, 서버 HTML 에는 1개뿐이라 통과하고 브라우저에서는 2개가 된다.
 *   네이버 서치어드바이저의 「H1 2개 이상 53건」이 이것이었다
 *   (docs/handoff/seo-naver-diagnostic-2026-08-16.md §2-B).
 *
 *   🔴 더 나쁜 것은 방향이다 — 그 가드에서 "h1 0개"로 잡힌 라우트를 `page.tsx` 에 정적 h1 을
 *   넣어 고치면 하이드레이션 후 2개가 된다. **가드를 통과할수록 실제 중복이 느는 구조**였다.
 *
 * ── 무엇을 세는가 ─────────────────────────────────────────────────────────
 * 라우트마다 두 축을 따로 센다.
 *
 *   ① 지속 서버 h1 — 라우트의 page/layout 에서 **정적 import** 로 닿는 h1.
 *   ② 클라이언트 h1 파일 — `dynamic(() => import(X), { ssr: false })` 로 닿는 서브트리에서
 *      h1 을 가진 **파일의 수**.
 *
 * 🔴 ①에서 `loading:` 폴백 컴포넌트는 뺀다. 그 셸은 서버 HTML 에 h1 을 남기지만
 *    청크가 로드되면 **통째로 교체돼 사라진다**. 이걸 안 빼면 /saju-guardian · /saju-fpti 가
 *    위양성으로 잡힌다(브라우저 실측 2026-08-28: 둘 다 하이드레이션 후 h1 정확히 1개).
 *
 * 🔴 ②를 h1 개수가 아니라 **파일 수**로 세는 이유는 한 컴포넌트가 상태별로 서로 배타적인
 *    화면을 그리며 각각 h1 을 다는 경우가 있기 때문이다(SajuGuardianClient 4개 ·
 *    OlympusVIPLounge 3개 · PointsClient 2개 — 셋 다 실제 렌더는 1개다).
 *
 * 판정: ① ≥ 1 이고 ② ≥ 1 이면 실패한다 — 서버가 남긴 제목 위에 클라이언트가 제목을 하나 더 얹는다.
 *
 * 한계(알고 있는 것): ①이 0이고 서로 다른 클라이언트 파일 둘이 **동시에** h1 을 그리는 모양은
 * 못 잡는다. 정적으로는 배타 여부를 알 수 없어서다. 그 축은 위 verify-seo-heading-integrity 가
 * 서버 HTML 로, 아래 fail-closed 가 검사 대상 유실로 각각 막는다.
 *
 * fail-closed (원칙 10):
 *   ① 산출물이 없으면 실패한다.
 *   ② 검사한 라우트가 0개면 실패한다 — 통과시키면 이 가드는 아무것도 지키지 않는다.
 *   ③ 예외는 배열이 아니라 "왜 예외인가"를 값으로 들고, 그 예외가 더 이상 필요 없으면 실패한다.
 *
 * 실행: npm run verify:hydrated-h1-integrity  (먼저 `npm run build:cf` 로 산출물이 있어야 한다)
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const rootDir = process.cwd();
const outDir = process.env.HYDRATED_H1_OUT_DIR || "dist";
const appDir = resolve(rootDir, "app");
const buildDir = resolve(rootDir, outDir);

/**
 * 지속 서버 h1 과 클라이언트 h1 이 함께 있어도 되는 라우트.
 * 🔴 비어 있는 것이 정상이다. 채우기 전에 "정말 이 라우트는 제목이 둘이어야 하는가"를 먼저
 *    따질 것 — 대개 가드가 맞고 페이지가 틀리다. 값은 사유이고, 사유 없는 항목은 두지 않는다.
 */
const DECLARED_EXCEPTIONS = new Map([
  // ["/some/route", "왜 이 라우트는 하이드레이션 후 h1 이 2개여야 하는가"],
]);

const failures = [];
function fail(message) {
  failures.push(message);
}

if (!existsSync(buildDir)) {
  console.error(`[hydrated-h1] FAIL: 빌드 산출물이 없다 → ${outDir}/`);
  console.error("  `npm run build:cf` 를 먼저 실행할 것.");
  console.error("  🔴 여기서 조용히 통과하면 이 가드는 아무것도 지키지 않는다.");
  process.exit(1);
}
if (!existsSync(appDir)) {
  console.error("[hydrated-h1] FAIL: app/ 이 없다 — 이 가드는 App Router 소스를 읽어야 한다.");
  process.exit(1);
}

const MODULE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];

function resolveModule(fromFile, specifier) {
  let base;
  if (specifier.startsWith(".")) base = resolve(dirname(fromFile), specifier);
  else if (specifier.startsWith("@/")) base = join(rootDir, specifier.slice(2));
  else return null; // 패키지 import 는 h1 을 갖지 않는다고 본다
  for (const extension of MODULE_EXTENSIONS) {
    if (existsSync(base + extension)) return base + extension;
  }
  for (const extension of MODULE_EXTENSIONS) {
    const indexFile = join(base, `index${extension}`);
    if (existsSync(indexFile)) return indexFile;
  }
  if (existsSync(base) && statSync(base).isFile()) return base;
  return null;
}

/**
 * `function Name(` 부터 중괄호 균형으로 본문을 잘라낸다.
 * 🔴 이름 grep 으로 판단하지 않는다 — 다른 함수의 h1 을 같이 세면 위양성이 난다(원칙 6).
 */
function sliceFunctionBody(source, functionName) {
  const declaration = new RegExp(`function\\s+${functionName}\\s*\\(`);
  const match = declaration.exec(source);
  if (!match) return null;
  const openIndex = source.indexOf("{", match.index + match[0].length - 1);
  if (openIndex === -1) return null;
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex, index + 1);
    }
  }
  return null;
}

const DYNAMIC_CALL =
  /dynamic\s*\(\s*(?:async\s*)?\(\s*\)\s*=>\s*import\s*\(\s*["']([^"']+)["']\s*\)\s*,\s*(\{[\s\S]{0,600}?\})\s*\)/g;
const STATIC_IMPORT = /^\s*import\s+[\s\S]*?\s*from\s*["']([^"']+)["']/gm;

function analyzeModule(source) {
  const staticSpecifiers = [];
  const lazySpecifiers = [];
  const loadingShellNames = [];

  for (const match of source.matchAll(DYNAMIC_CALL)) {
    const [, specifier, options] = match;
    if (/ssr\s*:\s*false/.test(options)) {
      lazySpecifiers.push(specifier);
      const shell = options.match(/loading\s*:\s*\(\s*\)\s*=>\s*<\s*([A-Z][\w]*)/);
      if (shell) loadingShellNames.push(shell[1]);
    } else {
      staticSpecifiers.push(specifier);
    }
  }
  for (const match of source.matchAll(STATIC_IMPORT)) staticSpecifiers.push(match[1]);

  // loading 셸 본문의 h1 은 하이드레이션 때 교체돼 사라지므로 뺀다.
  let countable = source;
  for (const name of loadingShellNames) {
    const body = sliceFunctionBody(source, name);
    if (body) countable = countable.replace(body, "");
  }
  const h1Count = (countable.match(/<h1[\s>]/gi) || []).length;

  return { staticSpecifiers, lazySpecifiers, h1Count };
}

function walk(entryFile, seen, onFile) {
  if (seen.has(entryFile)) return;
  seen.add(entryFile);
  let source;
  try {
    source = readFileSync(entryFile, "utf8");
  } catch {
    return;
  }
  const analyzed = analyzeModule(source);
  onFile(entryFile, analyzed);
  for (const specifier of analyzed.staticSpecifiers) {
    const resolved = resolveModule(entryFile, specifier);
    if (resolved) walk(resolved, seen, onFile);
  }
}

function routeEntryFiles(routeSegments) {
  const entries = [];
  for (const name of ["page.tsx", "page.js", "page.jsx"]) {
    const candidate = join(appDir, routeSegments, name);
    if (existsSync(candidate)) entries.push(candidate);
  }
  // 라우트 자신과 조상 세그먼트의 layout. 루트 layout 은 전 라우트 공통이라 제외한다.
  let segment = routeSegments;
  while (segment && segment !== "." && segment !== "") {
    for (const name of ["layout.tsx", "layout.js", "layout.jsx"]) {
      const candidate = join(appDir, segment, name);
      if (existsSync(candidate)) entries.push(candidate);
    }
    const parent = dirname(segment);
    segment = parent === "." ? "" : parent;
  }
  return entries;
}

function collectRoutes(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectRoutes(full, found);
    else if (entry.name === "index.html") found.push(full);
  }
  return found;
}

let checkedRoutes = 0;
const usedExceptions = new Set();

for (const htmlFile of collectRoutes(buildDir)) {
  const relativeHtml = relative(buildDir, htmlFile).replace(/\\/g, "/");
  const routeSegments = relativeHtml.replace(/\/?index\.html$/, "");
  if (!routeSegments) continue;
  if (!existsSync(join(appDir, routeSegments))) continue; // App Router 가 만든 라우트만 본다

  const entries = routeEntryFiles(routeSegments);
  if (entries.length === 0) continue;

  const seen = new Set();
  let serverH1 = 0;
  const lazyEntryFiles = new Set();
  for (const entry of entries) {
    walk(entry, seen, (file, analyzed) => {
      serverH1 += analyzed.h1Count;
      for (const specifier of analyzed.lazySpecifiers) {
        const resolved = resolveModule(file, specifier);
        if (resolved) lazyEntryFiles.add(resolved);
      }
    });
  }

  const clientSeen = new Set(seen);
  const clientH1Files = new Set();
  for (const lazyEntry of lazyEntryFiles) {
    walk(lazyEntry, clientSeen, (file, analyzed) => {
      if (analyzed.h1Count > 0) clientH1Files.add(relative(rootDir, file).replace(/\\/g, "/"));
    });
  }

  checkedRoutes += 1;
  const route = `/${routeSegments}`;
  if (serverH1 < 1 || clientH1Files.size < 1) continue;

  if (DECLARED_EXCEPTIONS.has(route)) {
    usedExceptions.add(route);
    continue;
  }
  fail(
    `${route}: 서버가 h1 을 ${serverH1}개 남기는데 ssr:false 클라이언트도 h1 을 그린다 ` +
      `(${[...clientH1Files].join(", ")}) — 하이드레이션 후 h1 이 2개 이상이 된다. ` +
      `레포 관례대로 페이지 h1 은 서버가 소유하고 기능 히어로는 h2 로 내릴 것(선례 91c644e5d).`,
  );
}

if (checkedRoutes === 0) {
  fail(
    `${outDir}/ 에서 검사한 App Router 라우트가 0개다 — 산출물 구조나 app/ 경로가 어긋났을 ` +
      "가능성이 크다. 통과시키면 이 가드가 죽은 채로 남는다.",
  );
}
for (const [route, reason] of DECLARED_EXCEPTIONS) {
  if (!usedExceptions.has(route)) {
    fail(`선언된 예외 "${route}"(${reason})가 더 이상 필요 없다 — 목록에서 지울 것.`);
  }
}

if (failures.length > 0) {
  console.error("[hydrated-h1] FAIL:");
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}

console.log(
  `[hydrated-h1] OK — App Router 라우트 ${checkedRoutes}개에서 ` +
    `서버 h1 과 ssr:false 클라이언트 h1 의 동시 존재 0건 (예외 ${DECLARED_EXCEPTIONS.size}개).`,
);

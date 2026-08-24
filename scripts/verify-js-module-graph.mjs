#!/usr/bin/env node
/**
 * 정적 셸의 ES 모듈 그래프 가드 — 죽은 import 와 회전하지 않는 캐시 키를 커밋 시점에 잡는다.
 *
 * 왜 필요한가 (2026-08-24 릴리스 사고, run 32683154849):
 *   `js/services/destiny-flower-engine.js` 를 `worker/lib/` 로 옮기면서 삭제했는데,
 *   `js/app.js` 가 `./core/bootstrapDestinyFlower.js?v=20260625-df-i18n` 라는 **손으로 박은
 *   날짜 키**로 그 모듈을 불렀다. 파일 내용은 바뀌었지만 URL 이 그대로였으므로 `_headers` 의
 *   `/js/*.js  max-age=604800, stale-while-revalidate=2592000` 을 타고 엣지가 **삭제된 모듈을
 *   참조하는 옛 파일**을 계속 서빙했다. 커스텀 도메인 승격 뒤 스모크가 그 404 를 잡아
 *   릴리스가 통째로 자동 롤백됐고, 머지한 내용이 스테이징에 도달하지 못했다.
 *
 *   `_headers:342-343` 은 이미 "수기 `?v=` 금지" 를 글로 적어 두고 있었다. 강제하는 가드가
 *   없었을 뿐이다. 이 스크립트가 그 문장을 기계로 만든다.
 *
 * 무엇을 강제하는가:
 *   ① 모든 상대/루트 절대 import 지정자는 **실재 파일로 해석돼야** 한다 (죽은 import 금지)
 *   ② 지정자에 `?v=` 가 있으면 그 값은 **자동 회전 형식**이어야 한다 (`build-…` 또는 `h…`)
 *      — 회전 주체는 scripts/sync-legacy-static-to-public.mjs 다.
 *
 * fail-closed (CLAUDE.md 원칙 10 — 대상이 없을 때 통과시키는 가드는 가드가 아니다):
 *   · 스캔 대상 트리가 없거나 파일이 0개면 실패한다.
 *   · 지정자를 하나도 못 찾아도 실패한다 — 정규식이 죽으면 조용히 초록불이 되기 때문이다.
 *
 * 검사하지 않는 것 (의도적):
 *   · npm 패키지 이름·http(s) URL — 파일 시스템에 없다.
 *   · `<script src>`·srcset 등 **모듈 지정자가 아닌** 참조. 그쪽 수기 `?v=` 는 로드 실패로
 *     번지지 않아 별건이다(js/destiny-profile.js·js/olympus-oracle.js 등에 남아 있다).
 *
 * 실행: npm run verify:js-module-graph [--self-test]
 */

import { readdirSync, readFileSync, existsSync, statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

/** 스캔할 트리. [트리 루트(상대), 그 트리에서 `/`(루트 절대) 가 가리키는 곳(상대)] */
const SCAN_TREES = [
  ["js", "."],
  [join("public", "js"), "public"],
];

const SOURCE_EXT = /\.(?:js|mjs)$/;

/**
 * 자동 회전되는 캐시 키인가.
 *   build-… : resolveDeterministicCacheKey() — GITHUB_SHA 12자 · 내용 sha1 12자 · build-static
 *   h…      : computeRootAssetCacheKey() — 루트 bare 자산의 내용 sha256 12자
 * 그 밖(`20260625-df-i18n` 같은 날짜 문자열)은 사람이 손으로 박은 것이라 내용이 바뀌어도
 * 회전하지 않는다 — 이번 사고의 형태다.
 */
const ROTATING_KEY = /^(?:build-[A-Za-z0-9_-]+|h[0-9a-f]{6,})$/;

// ---------------------------------------------------------------------------
// 순수 함수 — self-test 대상. 파일 시스템을 만지지 않는다.
// ---------------------------------------------------------------------------

/**
 * 주석만 있는 줄을 비운다. 문자열 안의 `//`(예: https://) 를 자르지 않으려고 **줄 단위**로만
 * 판단한다 — 코드가 붙어 있는 줄의 꼬리 주석은 건드리지 않는다. 여러 줄에 걸친 import 는
 * 주석 줄이 아니므로 그대로 살아남는다.
 */
export function blankCommentOnlyLines(source) {
  return String(source || "")
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return "";
      return line;
    })
    .join("\n");
}

/** 소스에서 import/export 지정자를 전부 뽑는다(중복 제거하지 않는다 — 줄 번호가 근거다). */
export function extractImportSpecifiers(source) {
  const code = blankCommentOnlyLines(source);
  const found = [];
  const patterns = [
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\bimport\s+[^;()]*?\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s+["']([^"']+)["']/g,
    /\bexport\s+[^;]*?\bfrom\s*["']([^"']+)["']/g,
  ];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(code))) {
      const line = code.slice(0, match.index).split("\n").length;
      found.push({ specifier: match[1], line });
    }
  }
  return found;
}

/** 파일 시스템에서 찾아야 하는 지정자인가. npm 이름·http(s)·data: 는 아니다. */
export function isLocalSpecifier(specifier) {
  const value = String(specifier || "");
  if (!value) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return false;
  if (value.startsWith("//")) return false;
  return value.startsWith(".") || value.startsWith("/");
}

/** 지정자를 경로와 캐시 키로 가른다. */
export function splitSpecifier(specifier) {
  const value = String(specifier || "");
  const hash = value.indexOf("#");
  const withoutHash = hash >= 0 ? value.slice(0, hash) : value;
  const q = withoutHash.indexOf("?");
  if (q < 0) return { path: withoutHash, query: "", cacheKey: null };
  const query = withoutHash.slice(q + 1);
  const match = /(?:^|&)v=([^&]*)/.exec(query);
  return { path: withoutHash.slice(0, q), query, cacheKey: match ? match[1] : null };
}

/** 캐시 키가 자동 회전 형식인가. 키가 없으면 검사 대상이 아니다(null). */
export function cacheKeyVerdict(cacheKey) {
  if (cacheKey === null || cacheKey === undefined) return null;
  return ROTATING_KEY.test(cacheKey);
}

// ---------------------------------------------------------------------------
// 파일 시스템
// ---------------------------------------------------------------------------

function listSourceFiles(dir, out = []) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) listSourceFiles(full, out);
    else if (SOURCE_EXT.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * 트리 하나를 검사한다. 반환: { scanned, specifiers, problems[] }
 * problems 는 { file, line, specifier, kind, detail } 이고 kind 는 missing | stale-key.
 */
export function checkTree(base, treeDir, absoluteRootDir) {
  const files = listSourceFiles(treeDir);
  const problems = [];
  let specifiers = 0;

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const { specifier, line } of extractImportSpecifiers(source)) {
      if (!isLocalSpecifier(specifier)) continue;
      specifiers += 1;
      const { path: specPath, cacheKey } = splitSpecifier(specifier);
      const target = specPath.startsWith("/")
        ? resolve(absoluteRootDir, "." + specPath)
        : resolve(dirname(file), specPath);
      const where = relative(base, file).split("\\").join("/");

      if (!existsSync(target)) {
        problems.push({
          file: where,
          line,
          specifier,
          kind: "missing",
          detail: `해석 결과 ${relative(base, target).split("\\").join("/")} 이 없습니다.`,
        });
      }

      const verdict = cacheKeyVerdict(cacheKey);
      if (verdict === false) {
        problems.push({
          file: where,
          line,
          specifier,
          kind: "stale-key",
          detail: `?v=${cacheKey} 는 회전하지 않는 수기 키입니다. 내용이 바뀌어도 URL 이 같아 엣지가 옛 모듈을 최대 7일 서빙합니다.`,
        });
      }
    }
  }

  return { scanned: files.length, specifiers, problems };
}

// ---------------------------------------------------------------------------
// self-test — 순수 함수 + 임시 픽스처 트리로 음성 경로를 실제로 밟는다.
// ---------------------------------------------------------------------------

function selfTest() {
  const cases = [];
  const eq = (actual, expected, label) => cases.push([JSON.stringify(actual), JSON.stringify(expected), label]);

  // 추출
  eq(
    extractImportSpecifiers("import { a } from './core/init.js?v=build-abc';").map((x) => x.specifier),
    ["./core/init.js?v=build-abc"],
    "정적 import 를 뽑는다",
  );
  eq(
    extractImportSpecifiers("const p = import('./core/boot.js?v=build-abc');").map((x) => x.specifier),
    ["./core/boot.js?v=build-abc"],
    "동적 import 를 뽑는다",
  );
  eq(
    extractImportSpecifiers("export { a } from '../services/x.js';").map((x) => x.specifier),
    ["../services/x.js"],
    "export-from 을 뽑는다",
  );
  eq(
    extractImportSpecifiers("import './side-effect.js';").map((x) => x.specifier),
    ["./side-effect.js"],
    "부수효과 import 를 뽑는다",
  );
  eq(
    extractImportSpecifiers("  // import('./dead.js')").map((x) => x.specifier),
    [],
    "주석만 있는 줄은 보지 않는다",
  );
  eq(
    extractImportSpecifiers("const url = 'https://a.example/x.js'; // ok").map((x) => x.specifier),
    [],
    "문자열 URL 은 import 가 아니다",
  );

  // 지역 지정자 판정
  eq(isLocalSpecifier("./a.js"), true, "상대 경로는 지역");
  eq(isLocalSpecifier("/js/a.js"), true, "루트 절대 경로는 지역");
  eq(isLocalSpecifier("node:fs"), false, "node: 는 지역이 아니다");
  eq(isLocalSpecifier("https://cdn.example/a.js"), false, "http URL 은 지역이 아니다");
  eq(isLocalSpecifier("lodash"), false, "npm 이름은 지역이 아니다");

  // 지정자 가르기
  eq(splitSpecifier("./a.js?v=build-abc").path, "./a.js", "쿼리를 떼고 경로만 남긴다");
  eq(splitSpecifier("./a.js?v=build-abc").cacheKey, "build-abc", "v= 값을 뽑는다");
  eq(splitSpecifier("./a.js").cacheKey, null, "키가 없으면 null");
  eq(splitSpecifier("./a.js?foo=1").cacheKey, null, "v= 가 아닌 쿼리는 키가 아니다");
  eq(splitSpecifier("./a.js?v=build-abc#frag").cacheKey, "build-abc", "프래그먼트를 무시한다");

  // 키 판정
  eq(cacheKeyVerdict("build-8c20da3cdf98"), true, "build-<sha> 는 회전 키");
  eq(cacheKeyVerdict("build-static"), true, "build-static 도 회전 키");
  eq(cacheKeyVerdict("h96b7981840e2"), true, "h<hex> 는 회전 키");
  eq(cacheKeyVerdict("20260625-df-i18n"), false, "날짜 문자열은 수기 키");
  eq(cacheKeyVerdict("job-change-v1"), false, "임의 문자열은 수기 키");
  eq(cacheKeyVerdict(null), null, "키가 없으면 판정 대상이 아니다");

  // 픽스처 — 실제로 죽은 import 와 수기 키를 잡는지 파일 시스템에서 확인한다.
  const fixture = mkdtempSync(join(tmpdir(), "cd-module-graph-"));
  try {
    const tree = join(fixture, "js");
    mkdirSync(join(tree, "core"), { recursive: true });
    writeFileSync(join(tree, "core", "init.js"), "export const init = 1;\n");
    writeFileSync(
      join(tree, "ok.js"),
      "import { init } from './core/init.js?v=build-abc';\nexport default init;\n",
    );
    const clean = checkTree(fixture, tree, fixture);
    eq(clean.problems.length, 0, "성한 트리는 문제 0건");
    eq(clean.scanned, 2, "픽스처 파일 2개를 스캔했다");

    writeFileSync(join(tree, "dead.js"), "import './core/gone.js?v=build-abc';\n");
    const missing = checkTree(fixture, tree, fixture);
    eq(missing.problems.filter((p) => p.kind === "missing").length, 1, "없는 파일을 가리키는 import 를 잡는다");

    writeFileSync(join(tree, "stale.js"), "import { init } from './core/init.js?v=20260625-df-i18n';\n");
    const stale = checkTree(fixture, tree, fixture);
    eq(stale.problems.filter((p) => p.kind === "stale-key").length, 1, "수기 캐시 키를 잡는다");

    rmSync(join(tree, "dead.js"));
    rmSync(join(tree, "stale.js"));
    const again = checkTree(fixture, tree, fixture);
    eq(again.problems.length, 0, "고치면 다시 통과한다");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }

  for (const [actual, expected, label] of cases) {
    if (actual !== expected) throw new Error(`self-test 실패: ${label} (기대 ${expected}, 실제 ${actual})`);
  }
  console.log(`[verify-js-module-graph] self-test passed (${cases.length} cases)`);
}

// ---------------------------------------------------------------------------

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    return;
  }

  const problems = [];
  let scanned = 0;
  let specifiers = 0;

  for (const [treeRel, absRootRel] of SCAN_TREES) {
    const treeDir = join(repoRoot, treeRel);
    if (!existsSync(treeDir)) {
      console.error(`[verify-js-module-graph] 스캔 대상 트리가 없습니다: ${treeRel}`);
      process.exitCode = 1;
      return;
    }
    const result = checkTree(repoRoot, treeDir, join(repoRoot, absRootRel));
    if (!result.scanned) {
      console.error(`[verify-js-module-graph] ${treeRel} 에서 소스 파일을 하나도 찾지 못했습니다.`);
      process.exitCode = 1;
      return;
    }
    scanned += result.scanned;
    specifiers += result.specifiers;
    problems.push(...result.problems);
  }

  // 🔴 지정자가 0개면 정규식이 죽은 것이다. 그 상태의 초록불이 가장 위험하다.
  if (!specifiers) {
    console.error("[verify-js-module-graph] 지역 import 지정자를 하나도 찾지 못했습니다 — 추출기가 죽었습니다.");
    process.exitCode = 1;
    return;
  }

  if (problems.length) {
    console.error(`[verify-js-module-graph] 문제 ${problems.length}건:`);
    for (const p of problems) {
      console.error(`  - ${p.file}:${p.line} ${p.specifier}`);
      console.error(`      ${p.detail}`);
    }
    console.error("");
    console.error("죽은 import 는 지정자를 고치거나 파일을 되살리세요.");
    console.error("수기 캐시 키는 scripts/sync-legacy-static-to-public.mjs 의");
    console.error("MODULE_IMPORT_CACHE_KEY_FILES 에 파일을 추가해 회전시키세요(_headers:342-343).");
    process.exitCode = 1;
    return;
  }

  console.log(
    `[verify-js-module-graph] OK — 소스 ${scanned}개에서 지역 import 지정자 ${specifiers}개, 죽은 참조 0 · 수기 캐시 키 0.`,
  );
}

main();

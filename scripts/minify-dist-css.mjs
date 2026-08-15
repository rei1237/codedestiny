/**
 * 배포 산출물(dist)의 CSS 를 minify 한다 — 외부 .css 파일과 HTML 안의 인라인 <style> 둘 다.
 *
 * 왜 dist 인가 — scripts/minify-dist-js.mjs 머리말과 같은 이유다. 이 저장소의 가드 다수가
 * **셸 소스를 문자열로 읽어** 동작을 보증한다(index.html 을 읽는 verify 스크립트 61개, 그중
 * 함수 본문을 중괄호 균형으로 잘라 쓰는 것이 19개 — scripts/externalize-dist-inline-scripts.mjs
 * 머리말의 2026-08-14 실측). 소스나 public/ 미러를 건드리면 성능과 무관하게 그 가드들이 깨진다.
 * 그래서 **소스는 그대로 두고 배포되는 바이트만 고친다.**
 *
 * 왜 지금까지 없었나 — 파이프라인에 CSS·HTML minify 가 아예 없었다. 2026-08-15 실측:
 *   dist/styles/fortune-ui.css 609,513B == styles/fortune-ui.css 609,513B (바이트 동일)
 * minify-dist-js.mjs 는 dist/js/** 만 본다.
 *
 * 무엇이 줄어드는가 (2026-08-15, esbuild loader:"css" 로 사전 측정):
 *   외부 CSS 8종        1,139,746B -> 907,641B  (20.4%)
 *   셸 인라인 CSS 81블록  872,151B ->  709,190B  (18.7%, 파싱 실패 0/81)
 * 셸 HTML 은 _headers 에서 no-store 라 매 방문 다시 내려간다. 인라인 CSS 를 줄이는 것은
 * 그 재전송분을 매번 줄이는 것과 같다.
 *
 * 🔴 이건 전송·파싱 비용을 줄이는 단계이지 Style & Layout(메인스레드 59%)을 줄이는 단계가 아니다.
 *    규칙 수도 셀렉터도 그대로다. 효과를 그렇게 보고할 것.
 *
 * 🔴 <script> 안의 문자열에 들어 있는 <style> 은 건드리지 않는다. 먼저 <script> 구간을 잘라내고
 *    그 밖의 <style> 만 고른다. 템플릿 리터럴 보간(`${`)이 보이면 그 블록도 통째로 건너뛴다.
 *
 * 🔴 run-postbuild.mjs 의 steps 에서 verify-adsense-readiness **뒤**에 둘 것. 그 검증기는 dist 셸의
 *    본문 텍스트를 읽는 유일한 소비자라, 앞에 두면 가공된 산출물을 검사하게 된다.
 *
 * 🔴 target 을 고정한다. 지정하지 않으면 esbuild 가 rgba() 를 8자리 hex 로 바꾸는 등 최신 문법을
 *    낼 수 있고, 이 서비스는 구형 Android WebView 를 실제로 분기 처리한다
 *    (js/mobile-performance-bootstrap.js 의 Android <= 10 판정).
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { transformSync } from "esbuild";

const distDir = resolve(process.cwd(), "dist");
const CSS_TARGET = ["chrome80", "safari13", "firefox78", "edge80"];

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

function minifyCss(source) {
  return transformSync(source, { loader: "css", minify: true, legalComments: "none", target: CSS_TARGET }).code;
}

/** <script>…</script> 구간 목록. 이 안의 <style> 은 마크업이 아니라 문자열이다. */
function scriptRanges(html) {
  const ranges = [];
  const re = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;
  let match;
  while ((match = re.exec(html))) ranges.push([match.index, match.index + match[0].length]);
  return ranges;
}

function insideAny(ranges, index) {
  for (const [start, end] of ranges) if (index >= start && index < end) return true;
  return false;
}

const cssFiles = collectFiles(distDir, (name) => name.endsWith(".css"));
const htmlFiles = collectFiles(distDir, (name) => name.endsWith(".html"));

if (cssFiles.length === 0 && htmlFiles.length === 0) {
  // 🔴 조용히 통과시키지 않는다 — 검사 대상이 없을 때 exit 0 하는 가드가 예산을 지키는 척했던
  //    사고가 이 저장소에 있다(verify:worker-size, docs/guard-integrity-2026-08-13.md).
  console.error("[minify-dist-css] dist 에 .css 도 .html 도 없다. `npm run build:cf` 가 끝난 뒤 실행되는지 확인할 것.");
  process.exit(1);
}

let fileBefore = 0;
let fileAfter = 0;
let fileMinified = 0;
let inlineBefore = 0;
let inlineAfter = 0;
let inlineBlocks = 0;
let inlineMinified = 0;
let htmlTouched = 0;
const failures = [];

for (const file of cssFiles) {
  const source = readFileSync(file, "utf8");
  fileBefore += Buffer.byteLength(source);

  let output;
  try {
    output = minifyCss(source);
  } catch (error) {
    // 파싱 실패는 배포를 막지 않는다 — 그 파일만 원본으로 두고 반드시 찍는다(minify-dist-js 와 같은 정책).
    failures.push(`${file.slice(distDir.length + 1)} :: ${String(error && error.message).split("\n")[0]}`);
    fileAfter += Buffer.byteLength(source);
    continue;
  }

  // 이미 minify 된 산출물(Next 의 _next/static/css 등)은 결과가 더 클 수 있다. 그럼 원본을 유지한다.
  if (Buffer.byteLength(output) >= Buffer.byteLength(source)) {
    fileAfter += Buffer.byteLength(source);
    continue;
  }

  writeFileSync(file, output, "utf8");
  fileAfter += Buffer.byteLength(output);
  fileMinified += 1;
}

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const skipRanges = scriptRanges(html);
  const styleRe = /(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)/gi;

  let changed = false;
  let match;
  const edits = [];

  while ((match = styleRe.exec(html))) {
    if (insideAny(skipRanges, match.index)) continue;
    const body = match[2];
    inlineBlocks += 1;
    inlineBefore += Buffer.byteLength(body);

    if (body.includes("${") || body.includes("</style")) {
      inlineAfter += Buffer.byteLength(body);
      continue;
    }

    let output;
    try {
      output = minifyCss(body);
    } catch (error) {
      failures.push(`${file.slice(distDir.length + 1)} <style> @${match.index} :: ${String(error && error.message).split("\n")[0]}`);
      inlineAfter += Buffer.byteLength(body);
      continue;
    }

    if (Buffer.byteLength(output) >= Buffer.byteLength(body)) {
      inlineAfter += Buffer.byteLength(body);
      continue;
    }

    edits.push({ start: match.index + match[1].length, end: match.index + match[1].length + body.length, output });
    inlineAfter += Buffer.byteLength(output);
    inlineMinified += 1;
    changed = true;
  }

  if (!changed) continue;

  let next = "";
  let cursor = 0;
  for (const edit of edits) {
    next += html.slice(cursor, edit.start) + edit.output;
    cursor = edit.end;
  }
  next += html.slice(cursor);
  writeFileSync(file, next, "utf8");
  htmlTouched += 1;
}

const kb = (bytes) => Math.round(bytes / 1024);
const pct = (before, after) => (before > 0 ? (((before - after) / before) * 100).toFixed(1) : "0.0");

console.log(
  `[minify-dist-css] 외부 CSS ${fileMinified}/${cssFiles.length}개 — ` +
    `${kb(fileBefore)}KB -> ${kb(fileAfter)}KB (${kb(fileBefore - fileAfter)}KB, ${pct(fileBefore, fileAfter)}% 감소)`,
);
console.log(
  `[minify-dist-css] 인라인 <style> ${inlineMinified}/${inlineBlocks}블록 (HTML ${htmlTouched}/${htmlFiles.length}개) — ` +
    `${kb(inlineBefore)}KB -> ${kb(inlineAfter)}KB (${kb(inlineBefore - inlineAfter)}KB, ${pct(inlineBefore, inlineAfter)}% 감소)`,
);

if (failures.length > 0) {
  console.warn(`[minify-dist-css] 파싱 실패 ${failures.length}건(원본 유지):`);
  for (const failure of failures) console.warn(`  - ${failure}`);
}

/**
 * 배포 산출물(dist)의 **정적 HTML** 에서 저작 주석(`<!-- ... -->`)을 걷어낸다.
 *
 * 왜 dist 인가 — scripts/minify-dist-css.mjs 머리말과 같은 이유다. 셸 소스를 문자열로 읽는
 * 가드가 다수라(index.html 을 읽는 verify 스크립트 61개) 소스나 public/ 미러를 건드리면
 * 성능과 무관하게 그 가드들이 깨진다. **소스의 주석은 그대로 두고 배포되는 바이트만 고친다.**
 * 주석은 다음 세션이 "이 블록이 왜 있는지"를 아는 유일한 근거라 소스에서 지울 대상이 아니다.
 *
 * 무엇이 줄어드는가 (2026-08-28 실측, dist):
 *   정적 HTML 35개 385,361B 제거 (주석 2,789블록). 셸 8벌이 각각 46,890B 다.
 *   dist/index.html  raw 1,293,860 -> 1,246,970 (-3.6%)
 *                    brotli q5 216,221 -> 200,291 (-15,930, -7.4%)   ← 엣지가 쓰는 수준
 *                    brotli q11 188,136 -> 173,806 (-14,330)
 *   셸 HTML 은 `no-cache` 라 매 방문 다시 내려간다. 이 감소는 방문마다·크롤마다 반복된다.
 *   프로덕션 실측 참고(2026-08-28, Accept-Encoding: br): `/` 253,700B · `/en` 280,813B 로
 *   일반 라우트(`/saju/` 20,485B)의 12배다.
 *
 * 🔴 **React 가 하이드레이션하는 HTML 은 손대지 않는다.** 그 HTML 의 주석은 저작 주석이 아니라
 *    Suspense 경계 마커(`<!--$-->` `<!--/$-->` `<!--$?-->` `<!--$!-->`)와 텍스트 구분자
 *    (`<!-- -->`)다 — 지우면 하이드레이션이 어긋난다. 2026-08-28 실측: dist HTML 744개 중
 *    709개가 하이드레이션 대상이고 그 안에 마커가 18,188블록 있다. 판정은
 *    minify-dist-css.mjs 와 같은 `__next_f` 표식으로 한다.
 *
 * 🔴 `<script>` · `<style>` 구간 안의 `<!--` 는 마크업 주석이 아니라 문자열/레거시 감싸기다.
 *    먼저 그 구간을 잘라내고 밖의 것만 고른다.
 *
 * 🔴 조건부 주석(`<!--[if ...]>`)과 하이드레이션 마커 모양은 정적 HTML 에서도 남긴다
 *    (2026-08-28 실측 0건이지만, 생기면 조용히 깨지는 쪽이라 남기는 것이 기본값이다).
 *
 * 🔴 run-postbuild.mjs 의 steps 에서 verify-adsense-readiness **뒤**에 둘 것. 그 검증기가
 *    dist 셸의 본문 텍스트를 읽는 유일한 소비자라, 앞에 두면 가공된 산출물을 검사하게 된다.
 *
 * 사용: node scripts/strip-dist-html-comments.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const distDir = resolve(process.cwd(), "dist");

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

/** minify-dist-css.mjs 와 같은 판정. 플라이트 표식이 있으면 React 가 하이드레이션하는 산출물이다. */
function isReactHydratedHtml(html) {
  return html.includes("__next_f");
}

/**
 * 마크업 주석의 위치를 좌→우 한 번의 스캔으로 찾는다.
 *
 * 🔴 정규식으로 `<script>`·`<style>` 구간을 먼저 잡고 그 밖의 `<!--` 를 고르면 안 된다 —
 *    **주석 본문에 적힌 `<script>` 라는 글자가 가짜 구간을 열어** 그 뒤의 진짜 주석을 삼킨다.
 *    2026-08-28 실측: 셸의 preconnect 설명 주석이 그 모양이라 다음 주석 하나가 남았다.
 *    HTML 파싱은 좌→우라 먼저 열린 쪽이 이긴다. 주석 안의 `<script>` 는 요소가 아니고,
 *    스크립트 안의 `<!--` 는 주석이 아니다 — 스캔 순서가 그 둘을 동시에 지킨다.
 */
function findComments(html) {
  const comments = [];
  const lower = html.toLowerCase();
  let cursor = 0;
  while (cursor < html.length) {
    const commentAt = lower.indexOf("<!--", cursor);
    const scriptAt = lower.indexOf("<script", cursor);
    const styleAt = lower.indexOf("<style", cursor);
    const candidates = [commentAt, scriptAt, styleAt].filter((index) => index >= 0);
    if (candidates.length === 0) break;
    const next = Math.min(...candidates);
    if (next === commentAt) {
      const end = lower.indexOf("-->", next + 4);
      if (end < 0) break; // 닫히지 않은 주석 — 남은 구간은 손대지 않는다
      comments.push({ start: next, end: end + 3 });
      cursor = end + 3;
      continue;
    }
    const tag = next === scriptAt ? "script" : "style";
    const end = lower.indexOf(`</${tag}`, next);
    if (end < 0) break; // 닫히지 않은 요소 — 남은 구간은 손대지 않는다
    cursor = end + tag.length + 2;
  }
  return comments;
}

/**
 * 남겨야 하는 주석인가 — 조건부 주석, 하이드레이션 마커 모양, 그리고 앱 스트립 마커.
 *
 * 🔴 `<!--cd-app-strip-->`/`<!--/cd-app-strip-->` 는 저작 주석이 아니라 **다음 단계가 읽는 표식**이다.
 *    앱 빌드는 postbuild(=이 스크립트) 뒤에 scripts/build-mobile-app.mjs 를 돌리고, 거기서
 *    이 두 표식 사이를 통째로 걷어낸다. 여기서 지우면 그 패스가 대상 0건으로 실패한다.
 *    웹 dist 에는 표식만(셸 1벌당 4개, 76B) 남는데, 이 단계가 셸에서 지우는 46,890B 에 비하면 무시할 수준이다.
 */
const APP_STRIP_MARKER_RE = /^<!--\/?cd-app-strip-->$/;

function mustKeep(comment) {
  if (/^<!--\s*\[if\b/i.test(comment)) return true;
  if (APP_STRIP_MARKER_RE.test(comment)) return true;
  const inner = comment.slice(4, -3);
  return /^[$/!?\s]*$/.test(inner);
}

const htmlFiles = collectFiles(distDir, (name) => name.endsWith(".html"));

if (htmlFiles.length === 0) {
  // 🔴 조용히 통과시키지 않는다 — 검사 대상이 없을 때 exit 0 하는 단계가 일을 한 척했던 사고가
  //    이 저장소에 있다(verify:worker-size, docs/guard-integrity-2026-08-13.md).
  console.error("[strip-dist-html-comments] dist 에 .html 이 없다. `npm run build:cf` 가 끝난 뒤 실행되는지 확인할 것.");
  process.exit(1);
}

let hydratedSkipped = 0;
let staticFiles = 0;
let touched = 0;
let removedBytes = 0;
let removedBlocks = 0;
let keptBlocks = 0;
const failures = [];

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  if (isReactHydratedHtml(html)) {
    hydratedSkipped += 1;
    continue;
  }
  staticFiles += 1;

  const edits = [];
  for (const comment of findComments(html)) {
    const text = html.slice(comment.start, comment.end);
    if (mustKeep(text)) {
      keptBlocks += 1;
      continue;
    }
    edits.push({ start: comment.start, end: comment.end, text, bytes: Buffer.byteLength(text) });
  }
  if (edits.length === 0) continue;

  let next = "";
  let cursor = 0;
  for (const edit of edits) {
    next += html.slice(cursor, edit.start);
    cursor = edit.end;
  }
  next += html.slice(cursor);

  // 🔴 주석만 뺐는지 확인한다. 태그 수가 움직였으면 정규식이 마크업을 먹은 것이므로
  //    그 파일은 원본을 유지하고 반드시 찍는다(배포는 막지 않는다 — minify-dist-* 와 같은 정책).
  //    주석 본문에 마크업 예시가 들어 있는 경우가 많으므로(셸 주석 다수가 그렇다) 지운 주석이
  //    품고 있던 토큰 수를 그대로 빼서 비교한다.
  const tagCount = (text) => (text.match(/<[a-zA-Z/!]/g) || []).length;
  let expected = tagCount(html);
  for (const edit of edits) expected -= tagCount(edit.text);
  if (tagCount(next) !== expected) {
    failures.push(`${file.slice(distDir.length + 1)} :: 태그 수 불일치(${tagCount(next)} != ${expected}) — 원본 유지`);
    continue;
  }

  writeFileSync(file, next, "utf8");
  touched += 1;
  removedBlocks += edits.length;
  for (const edit of edits) removedBytes += edit.bytes;
}

const kb = (bytes) => Math.round(bytes / 1024);
console.log(
  `[strip-dist-html-comments] 정적 HTML ${touched}/${staticFiles}개 — 주석 ${removedBlocks}블록 ${kb(removedBytes)}KB 제거` +
    (keptBlocks > 0 ? ` (조건부·마커 ${keptBlocks}블록 유지)` : ""),
);
console.log(
  `[strip-dist-html-comments] React 하이드레이션 HTML ${hydratedSkipped}개는 건드리지 않았다(Suspense 마커 보존).`,
);

if (failures.length > 0) {
  console.warn(`[strip-dist-html-comments] 건너뛴 파일 ${failures.length}건:`);
  for (const failure of failures) console.warn(`  - ${failure}`);
}

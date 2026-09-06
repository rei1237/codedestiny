/**
 * 배포 산출물(dist/**\/*.html)의 큰 인라인 <script> 를 외부 파일로 빼낸다.
 *
 * 왜 소스가 아니라 dist 인가 — 이게 이 저장소에서 유일하게 성립하는 자리다:
 * 이 프로젝트의 가드 다수가 **셸 소스를 문자열로 읽어** 동작을 보증한다. verify:payment-freeze 는
 * index.html 안 결제 함수 3개를 중괄호 균형으로 잘라 해시하고, verify:payment-choice-parity 는
 * 규칙 배열을 new Function 으로 평가하며, verify:saju-fun-content-gate·verify:locale-main-sync 등은
 * 특정 함수명·마크업 문자열이 셸 6벌에 그대로 있는지 본다(2026-08-14 확인: index.html 을 읽는
 * verify 스크립트 61개, 그중 함수 본문을 잘라 쓰는 것이 19개). 그래서 소스에서 인라인 블록을
 * 빼내면 성능과 무관하게 그 가드들이 줄줄이 깨진다 — 실제로 시도했다가 locale-main-sync 와
 * saju-fun-content-gate 가 잡아냈다.
 *
 * 결론은 minify 와 같다(scripts/minify-dist-js.mjs 머리말 참고): **소스는 그대로 두고 배포되는
 * 바이트만 고친다.** 가드는 계속 읽기 좋은 인라인 셸을 읽고, 브라우저는 캐시 가능한 외부 파일을 받는다.
 *
 * 무엇이 좋아지는가:
 *   1) HTML 이 작아진다. 셸은 no-cache 인데(no-store 가 아니다 — 2026-09-02 정정) 엣지의
 *      Cloudflare JavaScript Detections 가 본문을 재작성하며 ETag 를 지워 304 가 성립하지
 *      않으므로, 결과적으로 이 바이트가 매 방문 다시 내려간다.
 *      근거: docs/handoff/app-optimization-remaining-2026-09-02.md §2 (코드로는 못 고친다).
 *   2) 빠진 스크립트는 /js/ 캐시 정책을 타서 재방문에 재사용된다.
 *   3) 파일명이 내용 해시라 **미러끼리 같은 블록을 공유한다** — dist 에는 같은 셸이 로케일·정적
 *      캐노니컬 라우트까지 십수 벌 있어서, 예전에는 같은 900KB 를 벌수만큼 중복 저장했다.
 *   4) 이 단계 뒤에 minify-dist-js 가 돌아 빠져나온 파일까지 압축된다(steps 순서가 그렇게 잡혀 있다).
 *
 * 🔴 인라인이던 자리에 defer/async 없는 classic <script src> 를 넣는다. 인라인의 "파서를 멈추고
 *    문서 순서대로 실행" 을 그대로 유지해야 하기 때문이다 — defer 를 붙이면 실행이 파싱 끝으로
 *    밀려 뒤따르는 인라인 블록과 순서가 뒤집힌다.
 * 🔴 run-postbuild.mjs 의 steps 에서 verify-adsense-readiness 뒤에 두어야 한다. 그 검증기는
 *    dist 셸의 본문 텍스트와 광고 코드를 보는데, 앞에 두면 검사 대상이 달라진다.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { transformSync } from "esbuild";

const ROOT = process.cwd();
const DIST = resolve(ROOT, "dist");
const OUT_DIR = resolve(DIST, "js", "shell");

// 이 값보다 작은 블록은 그대로 둔다. 작은 블록까지 빼면 요청 수만 늘고 이득이 없다.
const MIN_BYTES = 8 * 1024;

if (!existsSync(DIST)) {
  console.log("[externalize-dist-inline-scripts] dist 없음 — 건너뜀");
  process.exit(0);
}

function collectHtml(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "js" || entry.name === "_next") continue;
      out.push(...collectHtml(full));
    } else if (entry.name.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

const OPEN_RE = /<script(\s[^>]*)?>/gi;

/** 인라인 블록만 고른다 — src·type 이 붙은 것(모듈, ld+json 등)은 건드리지 않는다. */
function isPlainInline(attrs) {
  if (/\ssrc\s*=/i.test(attrs)) return false;
  const type = /\stype\s*=\s*"([^"]*)"/i.exec(attrs);
  if (type && !/^(text\/javascript|application\/javascript)$/i.test(type[1].trim())) return false;
  return true;
}

mkdirSync(OUT_DIR, { recursive: true });

const written = new Map(); // hash -> filename
// 내용 해시 -> esbuild 파싱 성공 여부. 같은 블록이 미러 수십 벌에 그대로 복제돼 있어
// 캐시하지 않으면 같은 바이트를 그 벌수만큼 다시 파싱한다.
const parsed = new Map();
const unparsed = [];
let htmlBefore = 0;
let htmlAfter = 0;
let extracted = 0;
let touchedFiles = 0;

for (const file of collectHtml(DIST)) {
  const original = readFileSync(file, "utf8");
  // 🔴 루프 밖에서 한 번만 만든다 — <script> 태그마다 toLowerCase() 를 부르면 dist 113MB 를
  //    태그 수만큼 다시 복사한다(2026-09-06 실측: 이 단계 22.3s -> 1.8s. 그때 18.2s 로 적힌 것은
  //    바로 뒤 split-dist-boot-tasks 였다 — 스크립트가 끝에만 출력해 구간이 한 칸 밀려 보인다).
  const lowerOriginal = original.toLowerCase();
  htmlBefore += Buffer.byteLength(original);

  let out = "";
  let cursor = 0;
  let changed = false;
  OPEN_RE.lastIndex = 0;

  let m;
  while ((m = OPEN_RE.exec(original)) !== null) {
    const attrs = m[1] || "";
    const bodyStart = m.index + m[0].length;
    const close = lowerOriginal.indexOf("</script>", bodyStart);
    if (close === -1) break;
    const body = original.slice(bodyStart, close);

    if (!isPlainInline(attrs) || Buffer.byteLength(body) < MIN_BYTES) {
      OPEN_RE.lastIndex = close + "</script>".length;
      continue;
    }

    // 문자열 안에 </script> 가 들어 있으면 잘라낸 경계가 코드 중간일 수 있다. 그런 블록은 건너뛴다.
    if (/<\/script/i.test(body)) {
      OPEN_RE.lastIndex = close + "</script>".length;
      continue;
    }

    // 🔴 파싱되지 않는 블록은 그대로 둔다. 이 저장소에는 실제로 그런 셸이 있다 —
    // public/static/geomancy-oracle-v4.html 의 34KB 블록은 주석 처리된 코드 안에 </script> 가
    // 있어서 HTML 파서가 거기서 스크립트를 끊고, 그 결과 `*/` 하나가 짝을 잃는다(브라우저도
    // 똑같이 깨진 채 실행한다 — 이 단계가 만든 문제가 아니라 원래 그런 파일이다).
    // 이런 블록을 밖으로 빼면 "원래도 깨져 있었다" 를 이 변경 탓으로 오인하기 쉬우므로
    // 손대지 않고 인라인으로 남겨 동작을 오늘과 바이트 단위로 같게 유지한다.
    const hash = createHash("sha256").update(body).digest("hex").slice(0, 16);
    let parses = parsed.get(hash);
    if (parses === undefined) {
      try {
        transformSync(body, {});
        parses = true;
      } catch {
        parses = false;
      }
      parsed.set(hash, parses);
    }

    if (!parses) {
      unparsed.push(relative(DIST, file).replace(/\\/g, "/"));
      OPEN_RE.lastIndex = close + "</script>".length;
      continue;
    }

    let name = written.get(hash);
    if (!name) {
      name = `s-${hash}.js`;
      writeFileSync(resolve(OUT_DIR, name), body.replace(/^\n+/, "").replace(/\s+$/, "") + "\n", "utf8");
      written.set(hash, name);
    }

    // 원래 태그의 부가 속성(id/data-marker 등)은 버린다 — 인라인 식별용이라 외부 파일에는 의미가 없고,
    // 남기면 셸을 문자열로 읽는 쪽이 "여기 코드가 있다" 고 오인할 수 있다.
    out += original.slice(cursor, m.index) + `<script src="/js/shell/${name}"></script>`;
    cursor = close + "</script>".length;
    changed = true;
    extracted += 1;
    OPEN_RE.lastIndex = cursor;
  }

  out += original.slice(cursor);
  if (changed) {
    writeFileSync(file, out, "utf8");
    touchedFiles += 1;
  }
  htmlAfter += Buffer.byteLength(changed ? out : original);
}

const jsBytes = [...written.values()].reduce((sum, n) => sum + statSync(resolve(OUT_DIR, n)).size, 0);
console.log(
  `[externalize-dist-inline-scripts] HTML ${touchedFiles}개에서 인라인 ${extracted}블록 분리 → ` +
    `고유 파일 ${written.size}개(${Math.round(jsBytes / 1024)}KB). ` +
    `dist HTML 합계 ${Math.round(htmlBefore / 1024)}KB → ${Math.round(htmlAfter / 1024)}KB ` +
    `(${Math.round((htmlBefore - htmlAfter) / 1024)}KB 감소)`
);

if (written.size > 0) {
  const sample = relative(DIST, resolve(OUT_DIR, [...written.values()][0]));
  console.log(`[externalize-dist-inline-scripts] 예: ${sample.replace(/\\/g, "/")}`);
}

if (unparsed.length > 0) {
  const unique = [...new Set(unparsed)];
  console.warn(
    `[externalize-dist-inline-scripts] 파싱 안 되는 인라인 블록이 있어 그대로 둔 파일 ${unique.length}개 ` +
      "(원래부터 깨진 스크립트다 — 이 단계가 만든 문제가 아니다):"
  );
  for (const rel of unique.slice(0, 10)) console.warn(`  - ${rel}`);
}

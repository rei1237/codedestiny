/**
 * 홈 셸의 렌더 결과가 **변경 전후로 완전히 같은지**를 증명한다.
 *
 * 왜 필요한가 — 이 저장소에서 홈 성능 작업이 두 번 되돌아갔다(d29310c4a 가 18e28782e 를,
 * dc6129747 가 8fc05dd53 의 부트 게이트 조건을). 두 번 다 "보이는 것이 달라졌다"가 사유였고,
 * 그걸 사전에 잡을 장치가 없었다. 사용자 요구도 "UI/UX 는 유지"다. 그래서 성능 변경마다
 * 이 스크립트로 before/after 를 대조하고, 어긋나면 **어느 요소의 어느 프로퍼티가 달랐는지**를 찍는다.
 *
 * 재사용한 것:
 *   - playwright chromium 은 scripts/deploy-smoke.mjs:7 · scripts/verify-mobile-detail-render.mjs 와 동일
 *   - brotli 정적 서버는 scripts/measure-home-lighthouse.mjs:367-413 과 같은 방식
 *   - dist 신선도 fail-closed 는 scripts/verify-mobile-cdp-smoke.mjs:555-596 과 같은 방식(G-8)
 *
 * 판정 2단 구조 — computed style 이 정본, 픽셀은 보조:
 *   1) computed style 전수 덤프  … 헤드리스 폰트 래스터라이즈에 흔들리지 않는다. 이게 통과/실패를 정한다.
 *   2) scrollHeight/scrollWidth   … containment·intrinsic-size 사고가 정확히 이 형태로 드러난다
 *                                    (js/core/init.js:18-22 의 900px 유령 스크롤 사고)
 *   3) 풀페이지 스크린샷 해시     … 보조 신호. 다르면 경고만 하고 어디가 달라졌는지 알려 준다.
 *
 * 🔴 요소 식별은 클래스가 아니라 **문서 순서 인덱스 경로**로 한다. 클래스가 바뀌어도 "같은 자리의
 *    요소"를 비교해야 회귀를 놓치지 않는다.
 *
 * 사용:
 *   node scripts/verify-home-visual-parity.mjs --snapshot --label=before
 *   (변경 적용)
 *   node scripts/verify-home-visual-parity.mjs --snapshot --label=after
 *   node scripts/verify-home-visual-parity.mjs --compare=before,after
 */
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { chromium } from "@playwright/test";

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const outRoot = args.out || path.join(os.tmpdir(), "code-destiny-perf", "visual-parity");

const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

// 🔴 모바일 셀은 Lighthouse/PSI 기본값과 같은 Moto G Power **412x823, DPR 1.75** 다
//    (node_modules/lighthouse/core/config/constants.js 의 MOTOGPOWER_EMULATION_METRICS).
//    파리티를 보증해야 하는 화면이 그 뷰포트이므로 여기도 같아야 한다.
const CELLS = [
  { name: "mobile-yeon", theme: "yeon", ctx: { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true, userAgent: MOBILE_UA } },
  { name: "mobile-neo", theme: "neo", ctx: { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true, userAgent: MOBILE_UA } },
  { name: "desktop-yeon", theme: "yeon", ctx: { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false } },
  { name: "desktop-neo", theme: "neo", ctx: { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false } },
];

const COMPRESSIBLE = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg", ".xml", ".txt"]);
const encodedCache = new Map();

if (args.compare) {
  await compareSnapshots(args.compare[0], args.compare[1]);
} else {
  await takeSnapshot();
}

/**
 * `background-image` 는 문자열로 비교하면 안 된다.
 *
 * getComputedStyle 이 돌려주는 값은 **작성된 그대로의 직렬화**라, CSS 상 완전히 같은 그라디언트도
 * 표기가 다르면 다른 문자열이 된다. 실제로 CSS minify 는 생략 가능한 색 정지점을 지운다:
 *   linear-gradient(120deg, A 0%, B 100%)  →  linear-gradient(120deg, A, B)
 * 사양상 첫 정지점의 기본값이 0%, 마지막이 100% 이고 위치 없는 중간 정지점은 균등 분배이므로
 * 렌더 결과가 같다. 문자열만 보면 이걸 회귀로 오판한다.
 *
 * 그래서 **브라우저에 실제로 그려서** 픽셀로 판정한다. 이 방식은 정지점 표기 차이는 통과시키고
 * 색·각도·중간 위치가 진짜로 바뀐 경우는 그대로 잡는다.
 * (도입 근거: 이번 변경에서 나온 그라디언트 쌍 8종을 이 방법으로 재 봤더니 8/8 픽셀 동일이었다.)
 */
async function makeRenderEqualityChecker(pairs) {
  const cache = new Map();
  if (pairs.length === 0) return () => false;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 320, height: 240 }, deviceScaleFactor: 2 });
  const shotOf = async (value) => {
    if (cache.has(value)) return cache.get(value);
    await page.setContent(
      `<style>html,body{margin:0}#t{width:320px;height:240px;background-image:${value}}</style><div id=t></div>`,
    );
    const png = await page.locator("#t").screenshot();
    const hash = sha(png);
    cache.set(value, hash);
    return hash;
  };
  const equal = new Set();
  for (const [a, b] of pairs) {
    try {
      if ((await shotOf(a)) === (await shotOf(b))) equal.add(`${a}
${b}`);
    } catch (_error) { /* 그릴 수 없는 값이면 다른 것으로 둔다 */ }
  }
  await browser.close();
  return (a, b) => equal.has(`${a}
${b}`);
}

/* ───────────────────────────── snapshot ───────────────────────────── */

async function takeSnapshot() {
  const staticRoot = resolveStaticRoot();
  const server = await startStaticServer(staticRoot);
  const url = `http://127.0.0.1:${server.address().port}/`;
  const dir = path.join(outRoot, args.label);
  fs.mkdirSync(dir, { recursive: true });

  console.log(`[visual-parity] snapshot "${args.label}" — ${url} (${path.relative(root, staticRoot) || "."})`);

  const browser = await chromium.launch({ headless: true });
  try {
    for (const cell of CELLS) {
      const context = await browser.newContext(cell.ctx);
      // 애니메이션은 정지시킨다. 안 그러면 별·젬 글로우 keyframes(74개) 때문에 매번 다른 픽셀이 나온다.
      await context.addInitScript(() => {
        const style = document.createElement("style");
        style.textContent = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}";
        (document.head || document.documentElement).appendChild(style);
      });
      if (cell.theme === "neo") {
        await context.addInitScript(() => {
          try { localStorage.setItem("fortuneThemeModeStateV1", "neo"); } catch (_error) { /* opaque origin */ }
        });
      }
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "load", timeout: 90000 }).catch((error) => {
        console.warn(`[visual-parity] ${cell.name} navigation warning: ${error.message.split("\n")[0]}`);
      });
      await page.waitForTimeout(args.settleMs);
      await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});

      // 🔴 애니메이션 정지에 두 번 실패했다. 기록해 둔다:
      //  1) `*{animation:none!important}` 는 안 먹는다 — `*` 는 특이도 0 이라, 클래스 선택자로 선언된
      //     `animation` 이 그대로 이긴다(!important 끼리는 특이도로 갈린다).
      //  2) 재생속도 0 도 부족하다 — 멈추기는 하는데 **멈추는 지점**이 회차마다 달라서 값이 여전히 다르다.
      // 그래서 정지가 아니라 **시각 0 으로 되감고** 멈춘다. 이건 특이도와 무관하고 회차마다 같다.
      const freeze = () => {
        for (const svg of document.querySelectorAll("svg")) {
          try { svg.setCurrentTime(0); svg.pauseAnimations(); } catch (_error) { /* 미지원 */ }
        }
        for (const anim of document.getAnimations ? document.getAnimations() : []) {
          try { anim.currentTime = 0; anim.pause(); } catch (_error) { /* 끝났거나 되감기 불가 */ }
        }
      };
      await page.evaluate(freeze);
      await page.waitForTimeout(200);
      await page.evaluate(freeze); // 그 사이에 시작된 애니메이션까지 잡는다
      await page.waitForTimeout(200);

      const dump = await page.evaluate(styleDumpExpression);
      const shot = await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" });

      fs.writeFileSync(path.join(dir, `${cell.name}.styles.json`), JSON.stringify(dump.rows), "utf8");
      fs.writeFileSync(
        path.join(dir, `${cell.name}.meta.json`),
        JSON.stringify({
          elements: dump.rows.length,
          scrollHeight: dump.scrollHeight,
          scrollWidth: dump.scrollWidth,
          rootClass: dump.rootClass,
          bodyClass: dump.bodyClass,
          stylesHash: sha(JSON.stringify(dump.rows)),
          screenshotHash: sha(shot),
          screenshotBytes: shot.length,
        }, null, 2),
        "utf8",
      );
      fs.writeFileSync(path.join(dir, `${cell.name}.png`), shot);
      console.log(`  ${cell.name.padEnd(14)} elements=${String(dump.rows.length).padStart(5)}  scrollH=${dump.scrollHeight}  shot=${Math.round(shot.length / 1024)}KB`);

      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log(`[visual-parity] wrote ${dir}`);
}

/**
 * 렌더에 영향을 주는 프로퍼티만 뽑는다. getComputedStyle 전체(340여 개)를 4,000 요소에 대해
 * 직렬화하면 파일이 수십 MB 가 되고 비교가 느려진다. 되돌려진 사고 두 건(색 뒤집힘·유령 스크롤)은
 * 이 목록으로 전부 잡힌다.
 */
function styleDumpExpression() {
  const PROPS = [
    "display", "visibility", "opacity", "position", "top", "right", "bottom", "left", "z-index",
    "width", "height", "margin-top", "margin-right", "margin-bottom", "margin-left",
    "padding-top", "padding-right", "padding-bottom", "padding-left",
    "color", "background-color", "background-image", "border-top-width", "border-top-color",
    "border-radius", "box-shadow", "font-family", "font-size", "font-weight", "line-height",
    "text-align", "transform", "overflow-x", "overflow-y", "flex-direction", "justify-content",
    "align-items", "grid-template-columns", "gap", "content-visibility", "contain-intrinsic-size",
    "backdrop-filter", "pointer-events",
  ];
  const rows = [];
  const all = document.querySelectorAll("*");
  let index = 0;
  for (const el of all) {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const styles = {};
    for (const prop of PROPS) styles[prop] = cs.getPropertyValue(prop);
    rows.push({
      i: index++,
      tag: el.tagName,
      id: el.id || "",
      cls: el.className && typeof el.className === "string" ? el.className : "",
      box: [Math.round(rect.x * 2) / 2, Math.round(rect.y * 2) / 2, Math.round(rect.width * 2) / 2, Math.round(rect.height * 2) / 2],
      s: styles,
    });
  }
  return {
    rows,
    scrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
    rootClass: document.documentElement.className,
    bodyClass: document.body ? document.body.className : "",
  };
}

/* ───────────────────────────── compare ───────────────────────────── */

/**
 * 노이즈 기준선 — **같은 dist 를 두 번 찍어** 그 사이에 흔들리는 (요소, 프로퍼티) 쌍을 구한다.
 *
 * 왜 목록을 손으로 쓰지 않는가 — 어떤 프로퍼티가 비결정적인지는 셸의 애니메이션 구현에 달렸고,
 * 손으로 적으면 그 목록이 곧 거짓말이 된다(CLAUDE.md 원칙 11). 애니메이션을 멈춰도 남는 흔들림만
 * 측정해서 빼고, 나머지는 전부 실패로 본다.
 */
/**
 * 정적 서버가 매번 임의 포트를 잡으므로 `url("http://127.0.0.1:52102/…")` 같은 값이 회차마다 다르다.
 * 이건 페이지의 차이가 아니라 하네스의 차이다 — 노이즈로 덮지 말고 값에서 지운다.
 */
function identityOf(row) {
  return `${row.tag}#${row.id}.${row.cls}`;
}

function normalizeValue(value) {
  return typeof value === "string" ? value.replace(/http:\/\/127\.0\.0\.1:\d+/g, "http://HOST") : value;
}

function noiseKeysFor(cellName, labels) {
  if (!labels) return null;
  const a = readJson(path.join(outRoot, labels[0], `${cellName}.styles.json`));
  const b = readJson(path.join(outRoot, labels[1], `${cellName}.styles.json`));
  if (!a || !b) return null;
  const keys = new Set();
  const max = Math.min(a.length, b.length);
  for (let i = 0; i < max; i += 1) {
    // 🔴 인덱스만으로 키를 만들면 안 된다. 회전하는 문구 위젯(.notranslate)은 회차마다 **다른 인덱스**에
    //    나타나서, 인덱스 키로 만든 무시 목록이 다음 회차에는 안 맞는다. 그래서 요소의 정체성
    //    (태그+id+클래스)으로도 키를 만들어 둘 다 등록한다.
    for (const prop of Object.keys(a[i].s)) {
      if (normalizeValue(a[i].s[prop]) === normalizeValue(b[i].s[prop])) continue;
      keys.add(`${i}|${prop}`);
      keys.add(`${identityOf(a[i])}|${prop}`);
    }
    for (let k = 0; k < 4; k += 1) {
      if (a[i].box[k] === b[i].box[k]) continue;
      keys.add(`${i}|box`);
      keys.add(`${identityOf(a[i])}|box`);
      break;
    }
  }
  return keys;
}

async function compareSnapshots(beforeLabel, afterLabel) {
  const beforeDir = path.join(outRoot, beforeLabel);
  const afterDir = path.join(outRoot, afterLabel);
  for (const dir of [beforeDir, afterDir]) {
    if (!fs.existsSync(dir)) {
      console.error(`[visual-parity] 스냅샷이 없다: ${dir}`);
      process.exit(1);
    }
  }

  let failures = 0;
  let warnings = 0;
  console.log(`[visual-parity] compare ${beforeLabel} → ${afterLabel}${args.noise ? ` (노이즈 기준선: ${args.noise.join(" vs ")})` : ""}`);

  // background-image 후보를 먼저 전부 모아 한 번의 브라우저 기동으로 판정한다.
  const bgPairs = [];
  for (const cell of CELLS) {
    const a = readJson(path.join(beforeDir, `${cell.name}.styles.json`));
    const b = readJson(path.join(afterDir, `${cell.name}.styles.json`));
    if (!a || !b) continue;
    for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
      const va = normalizeValue(a[i].s["background-image"]);
      const vb = normalizeValue(b[i].s["background-image"]);
      if (va !== vb && va && vb && va !== "none" && vb !== "none") bgPairs.push([va, vb]);
    }
  }
  const rendersEqual = await makeRenderEqualityChecker(bgPairs);
  if (bgPairs.length > 0) console.log(`[visual-parity] background-image 차이 ${bgPairs.length}건을 실제 렌더로 판정한다`);

  for (const cell of CELLS) {
    const a = readJson(path.join(beforeDir, `${cell.name}.meta.json`));
    const b = readJson(path.join(afterDir, `${cell.name}.meta.json`));
    if (!a || !b) {
      console.error(`  ${cell.name}: 스냅샷 파일 누락 — FAIL`);
      failures += 1;
      continue;
    }

    const problems = [];
    if (a.scrollHeight !== b.scrollHeight) problems.push(`scrollHeight ${a.scrollHeight} → ${b.scrollHeight}`);
    if (a.scrollWidth !== b.scrollWidth) problems.push(`scrollWidth ${a.scrollWidth} → ${b.scrollWidth}`);
    if (a.rootClass !== b.rootClass) problems.push(`html class "${a.rootClass}" → "${b.rootClass}"`);
    if (a.bodyClass !== b.bodyClass) problems.push(`body class "${a.bodyClass}" → "${b.bodyClass}"`);
    if (a.elements !== b.elements) problems.push(`elements ${a.elements} → ${b.elements}`);

    if (a.stylesHash !== b.stylesHash) {
      const noise = noiseKeysFor(cell.name, args.noise);
      const { diffs, ignored, renderEqualCount } = diffStyleRows(
        readJson(path.join(beforeDir, `${cell.name}.styles.json`)),
        readJson(path.join(afterDir, `${cell.name}.styles.json`)),
        noise,
        rendersEqual,
      );
      if (ignored > 0) console.log(`  ${cell.name}: 노이즈 기준선으로 ${ignored}건 제외`);
      if (renderEqualCount > 0) console.log(`  ${cell.name}: background-image ${renderEqualCount}건은 표기만 다르고 렌더가 같아 통과`);
      if (diffs.length > 0) {
        problems.push(`computed style 차이 ${diffs.length}건`);
        for (const line of diffs.slice(0, 12)) problems.push(`    ${line}`);
        if (diffs.length > 12) problems.push(`    … 그 외 ${diffs.length - 12}건`);
      }
    }

    if (problems.length > 0) {
      failures += 1;
      console.error(`  ${cell.name}: FAIL`);
      for (const problem of problems) console.error(`    - ${problem}`);
    } else if (a.screenshotHash !== b.screenshotHash) {
      warnings += 1;
      console.warn(`  ${cell.name}: computed style·기하 동일, 스크린샷 해시만 다름 (${a.screenshotBytes}B → ${b.screenshotBytes}B)`);
      console.warn("    폰트 래스터라이즈 편차일 수 있다. PNG 두 장을 눈으로 대조할 것.");
    } else {
      console.log(`  ${cell.name}: OK (elements ${a.elements} · scrollH ${a.scrollHeight} · 픽셀까지 동일)`);
    }
  }

  if (failures > 0) {
    console.error(`\n[visual-parity] FAIL — ${CELLS.length}셀 중 ${failures}셀이 달라졌다. 보이는 화면이 바뀌었다는 뜻이다.`);
    process.exit(1);
  }
  console.log(`\n[visual-parity] OK — ${CELLS.length}셀 전부 computed style·기하 동일${warnings ? ` (스크린샷 경고 ${warnings}건)` : ", 픽셀까지 동일"}`);
}

function diffStyleRows(before, after, noise, rendersEqual) {
  const out = [];
  let ignored = 0;
  let renderEqualCount = 0;
  const skip = (key, identityKey) => {
    if (!noise) return false;
    if (noise.has(key) || (identityKey && noise.has(identityKey))) { ignored += 1; return true; }
    return false;
  };
  const max = Math.max(before.length, after.length);
  for (let i = 0; i < max; i += 1) {
    const a = before[i];
    const b = after[i];
    if (!a || !b) {
      out.push(`#${i} 한쪽에만 존재 (${(a || b).tag}${(a || b).id ? "#" + (a || b).id : ""})`);
      continue;
    }
    const label = `#${i} <${a.tag.toLowerCase()}${a.id ? " id=" + a.id : ""}${a.cls ? ' class="' + a.cls.slice(0, 40) + '"' : ""}>`;
    if (a.tag !== b.tag) { out.push(`${label} tag ${a.tag} → ${b.tag}`); continue; }
    for (const key of Object.keys(a.s)) {
      const va = normalizeValue(a.s[key]);
      const vb = normalizeValue(b.s[key]);
      if (va === vb) continue;
      if (key === "background-image" && rendersEqual && rendersEqual(va, vb)) { renderEqualCount += 1; continue; }
      if (skip(`${i}|${key}`, `${identityOf(a)}|${key}`)) continue;
      out.push(`${label} ${key}: "${a.s[key]}" → "${b.s[key]}"`);
    }
    for (let k = 0; k < 4; k += 1) {
      if (a.box[k] === b.box[k]) continue;
      if (skip(`${i}|box`, `${identityOf(a)}|box`)) break;
      out.push(`${label} box[${k}] ${a.box[k]} → ${b.box[k]}`);
      break;
    }
  }
  return { diffs: out, ignored, renderEqualCount };
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (_error) { return null; }
}

function sha(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
}

/* ───────────────────────────── serving ───────────────────────────── */

function resolveStaticRoot() {
  const distShell = path.join(root, "dist", "index.html");
  if (!fs.existsSync(distShell)) {
    console.error("[visual-parity] dist/index.html 이 없다. 먼저 `npm run build:cf` 를 돌릴 것.");
    process.exit(1);
  }
  if (!args.allowStale) {
    const newer = newestSourceInput(fs.statSync(distShell).mtimeMs);
    if (newer) {
      console.error(`[visual-parity] dist 가 낡았다 — ${newer} 가 dist/index.html 보다 새롭다. \`npm run build:cf\` 를 다시 돌리거나 --allow-stale 을 줄 것.`);
      process.exit(1);
    }
  }
  return path.join(root, "dist");
}

function newestSourceInput(builtAt) {
  const stack = [path.join(root, "index.html"), path.join(root, "js"), path.join(root, "styles")].filter((p) => fs.existsSync(p));
  while (stack.length) {
    const current = stack.pop();
    const stats = fs.statSync(current);
    if (stats.isDirectory()) {
      for (const entry of fs.readdirSync(current)) stack.push(path.join(current, entry));
      continue;
    }
    if (stats.mtimeMs > builtAt) return path.relative(root, current);
  }
  return null;
}

function encodeFor(filePath, buffer, acceptEncoding) {
  if (!COMPRESSIBLE.has(path.extname(filePath).toLowerCase())) return null;
  const accepts = String(acceptEncoding || "");
  const encoding = /\bbr\b/.test(accepts) ? "br" : /\bgzip\b/.test(accepts) ? "gzip" : null;
  if (!encoding) return null;
  const key = `${encoding}:${filePath}`;
  let body = encodedCache.get(key);
  if (!body) {
    body = encoding === "br"
      ? zlib.brotliCompressSync(buffer, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } })
      : zlib.gzipSync(buffer, { level: 6 });
    encodedCache.set(key, body);
  }
  return { encoding, body };
}

function startStaticServer(staticRoot) {
  const instance = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const rawPath = decodeURIComponent(url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname);
    const filePath = path.normalize(path.join(staticRoot, rawPath));
    if (!filePath.startsWith(staticRoot)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    fs.readFile(filePath, (error, buffer) => {
      if (error) {
        res.writeHead(404).end("Not found");
        return;
      }
      const headers = { "content-type": contentType(filePath), "cache-control": "no-store" };
      const encoded = encodeFor(filePath, buffer, req.headers["accept-encoding"]);
      if (encoded) {
        headers["content-encoding"] = encoded.encoding;
        headers.vary = "Accept-Encoding";
      }
      res.writeHead(200, headers);
      res.end(encoded ? encoded.body : buffer);
    });
  });
  return new Promise((resolve, reject) => {
    instance.on("error", reject);
    instance.listen(0, "127.0.0.1", () => resolve(instance));
  });
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".mp3": "audio/mpeg",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
  }[ext] || "application/octet-stream";
}

function parseArgs(argv) {
  const get = (name) => {
    const hit = argv.find((arg) => arg.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : "";
  };
  const compareRaw = get("compare");
  const compare = compareRaw ? compareRaw.split(",").map((s) => s.trim()).filter(Boolean) : null;
  if (compare && compare.length !== 2) throw new Error("--compare=<beforeLabel>,<afterLabel>");
  const noiseRaw = get("noise");
  const noise = noiseRaw ? noiseRaw.split(",").map((s) => s.trim()).filter(Boolean) : null;
  if (noise && noise.length !== 2) throw new Error("--noise=<labelA>,<labelB> (같은 dist 를 두 번 찍은 것)");
  return {
    compare,
    noise,
    label: (get("label") || "head").replace(/[^a-zA-Z0-9._-]/g, "-"),
    out: get("out"),
    settleMs: Math.max(1000, Number(get("settle")) || 8000),
    allowStale: argv.includes("--allow-stale"),
  };
}

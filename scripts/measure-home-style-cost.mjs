/**
 * 홈 셸의 **스타일 재계산 비용**을 직접 잰다.
 *
 * 왜 perf:home 으로는 부족한가 — Lighthouse 의 mainthread-work-breakdown 은 "Style & Layout 에
 * 몇 ms 썼다"까지만 알려준다. 처방은 그 다음 갈래에서 갈린다: **재계산이 몇 번 일어났는가**와
 * **그중 실제로 매칭된 규칙이 몇 개인가**. 되돌려진 커밋 18e28782e 가 남긴 실측이
 * "Recalculate Style 681회 × 12.3ms" 였는데, 그 681 을 다시 잴 수단이 저장소에 없었다.
 *
 * 재사용한 것:
 *   - 브라우저는 scripts/deploy-smoke.mjs:7 과 같은 `@playwright/test` 의 chromium
 *   - brotli 정적 서버는 scripts/measure-home-lighthouse.mjs:367-413 과 같은 방식
 *   - dist 신선도 fail-closed 는 scripts/verify-mobile-cdp-smoke.mjs:555-596 과 같은 방식(G-8)
 *
 * 🔴 ws / chrome-launcher 를 쓰지 않았다. 둘 다 package.json 에 **선언돼 있지 않고** 전이 의존으로만
 *    존재한다(2026-08-15 확인). 새 도구를 그 위에 세우지 않는다. playwright 는 선언돼 있다.
 *
 * 🔴 정적 서버 코드를 measure-home-lighthouse.mjs 에서 import 하지 않고 다시 썼다. 그 파일은
 *    이번 작업의 before/after 기준선을 만드는 도구라, 손대면 두 측정이 서로 다른 코드로 재는
 *    셈이 된다. 중복이 기준선 오염보다 싸다.
 *
 * 🔴 계측 순서가 중요하다 — Performance.getMetrics 와 CSS 커버리지를 **먼저** 걷고,
 *    DOM 인구조사(getComputedStyle 전수)는 **맨 마지막**에 한다. 순서를 바꾸면 인구조사가
 *    스타일·레이아웃을 강제로 돌려 자기가 재려던 수치를 오염시킨다.
 *
 * 🔴 정적 grep 으로 "죽은 CSS" 를 판정하지 말 것 — 직접 해 봤더니 .cd-refund-toast 나
 *    .tarot-tile__lock-icon 처럼 런타임에 생기는 클래스를 죽었다고 오판했다. 그래서 여기서는
 *    CSS.startRuleUsageTracking 으로 브라우저가 **실제로 매칭한** 규칙만 센다.
 *
 * 사용:
 *   npm run build:cf
 *   npm run perf:style-cost -- --runs=3 --preset=mobile --label=baseline
 *   npm run perf:style-cost -- --url=https://code-destiny.com --label=prod-before
 */
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { chromium } from "@playwright/test";

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));

// Lighthouse 모바일 기본값과 같은 조건. 여기서 갈리면 perf:home 결과와 나란히 못 읽는다.
const CPU_THROTTLE = 4;
const NET = { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 };
const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

// 🔴 모바일은 Lighthouse/PSI 기본값과 같은 Moto G Power **412x823, DPR 1.75** 다
//    (node_modules/lighthouse/core/config/constants.js 의 MOTOGPOWER_EMULATION_METRICS).
//    예전 390x844(DPR 3)는 어느 프리셋에도 대응하지 않아, 여기서 잰 수치가 점수를 설명하지 못했다.
const PROFILES = {
  mobile: { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true, userAgent: MOBILE_UA },
  desktop: { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
};

const COMPRESSIBLE = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg", ".xml", ".txt"]);
const encodedCache = new Map();

const staticRoot = resolveStaticRoot();
const server = args.url ? null : await startStaticServer();
const targetUrl = args.url || `http://127.0.0.1:${server.address().port}/`;

console.log(`[perf:style-cost] target ${targetUrl}`);
if (!args.url) console.log(`[perf:style-cost] serving ${path.relative(root, staticRoot) || "."}`);
console.log(
  `[perf:style-cost] presets ${args.presets.join(",")} · themes ${args.themes.join(",")} · runs ${args.runs} · CPU ${CPU_THROTTLE}x · settle ${args.settleMs}ms · label ${args.label}`,
);

const results = {};
try {
  for (const preset of args.presets) {
    for (const theme of args.themes) {
      const key = `${preset}/${theme}`;
      const runs = [];
      for (let i = 0; i < args.runs; i += 1) {
        process.stdout.write(`[perf:style-cost] ${key} run ${i + 1}/${args.runs} ... `);
        const sample = await measureOnce(targetUrl, preset, theme);
        runs.push(sample);
        console.log(
          `recalc ${sample.metrics.RecalcStyleCount} (${fmt(sample.metrics.RecalcStyleDuration * 1000)}ms) · layout ${sample.metrics.LayoutCount} · el ${sample.dom.elements} · rules ${sample.rules.used}/${sample.rules.total}`,
        );
      }
      results[key] = summarize(runs);
    }
  }
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
}

const outDir = args.out || path.join(os.tmpdir(), "code-destiny-perf");
fs.mkdirSync(outDir, { recursive: true });
const jsonPath = path.join(outDir, `style-cost-${args.label}.json`);
fs.writeFileSync(
  jsonPath,
  JSON.stringify({ label: args.label, url: targetUrl, runs: args.runs, cpuThrottle: CPU_THROTTLE, settleMs: args.settleMs, results }, null, 2),
  "utf8",
);

printTables();
console.log(`\n[perf:style-cost] wrote ${jsonPath}`);

/* ───────────────────────────── measurement ───────────────────────────── */

async function measureOnce(url, preset, theme) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-background-networking", "--disable-default-apps", "--disable-sync", "--mute-audio", "--metrics-recording-only"],
  });
  try {
    const context = await browser.newContext(PROFILES[preset]);
    if (theme === "neo") {
      // 셸이 읽는 키 그대로(index.html:470·:1151). 첫 스타일 해석 전에 심어야 의미가 있다.
      await context.addInitScript(() => {
        try { localStorage.setItem("fortuneThemeModeStateV1", "neo"); } catch (_error) { /* opaque origin */ }
      });
    }
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);

    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable"); // DOM.enable 이 선행이어야 한다
    await cdp.send("Performance.enable");
    await cdp.send("Network.enable");
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE });
    await cdp.send("Network.emulateNetworkConditions", { offline: false, ...NET });

    // 반드시 navigate 앞에서 켠다 — 켜기 전에 등록된 스타일시트는 집계에서 빠진다.
    await cdp.send("CSS.startRuleUsageTracking");

    await page.goto(url, { waitUntil: "load", timeout: args.loadTimeoutMs }).catch((error) => {
      console.warn(`\n[perf:style-cost] navigation warning: ${error.message.split("\n")[0]}`);
    });
    await page.waitForTimeout(args.settleMs);

    // 🔴 순서 고정: 카운터 → 커버리지 → (마지막) DOM 인구조사.
    const metrics = await readMetrics(cdp);
    const usage = await cdp.send("CSS.stopRuleUsageTracking");
    const dom = await page.evaluate(domCensusExpression);

    const ruleUsage = usage.ruleUsage || [];
    const sample = {
      metrics,
      rules: { total: ruleUsage.length, used: ruleUsage.filter((r) => r.used).length },
      dom,
    };
    await context.close();
    return sample;
  } finally {
    await browser.close();
  }
}

async function readMetrics(cdp) {
  const { metrics } = await cdp.send("Performance.getMetrics");
  const wanted = [
    "RecalcStyleCount",
    "RecalcStyleDuration",
    "LayoutCount",
    "LayoutDuration",
    "ScriptDuration",
    "TaskDuration",
    "Nodes",
    "JSHeapUsedSize",
  ];
  const out = {};
  for (const name of wanted) {
    const hit = metrics.find((m) => m.name === name);
    out[name] = hit ? hit.value : NaN;
  }
  return out;
}

/**
 * DOM 인구조사.
 *
 * display:none 서브트리를 따로 세는 이유 — 그 노드들은 레이아웃을 건너뛰므로 Style & Layout
 * 예산에는 거의 안 들어가지만 파싱·전송·메모리 비용은 그대로 낸다. 둘을 한 숫자로 섞으면
 * "노드를 20% 줄였는데 왜 안 빨라지나" 를 다시 겪는다.
 *
 * 컨테이너별 집계는 **가장 가까운 id 조상** 하나로만 귀속시킨다. 서브트리를 컨테이너마다 세면
 * 중첩된 요소가 여러 번 잡혀 합계가 전체를 넘는다(이번 세션에 실제로 그랬다).
 */
function domCensusExpression() {
  const all = document.querySelectorAll("*");
  let displayNone = 0;
  let noBox = 0;
  const buckets = new Map();

  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.display === "none") displayNone += 1;
    if (el.getClientRects().length === 0) noBox += 1;
    let ancestor = el;
    while (ancestor && !ancestor.id) ancestor = ancestor.parentElement;
    const key = ancestor ? `#${ancestor.id}` : "(no id ancestor)";
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  let cssRules = 0;
  let unreadableSheets = 0;
  for (const sheet of document.styleSheets) {
    try { cssRules += sheet.cssRules.length; } catch (_error) { unreadableSheets += 1; }
  }

  return {
    elements: all.length,
    displayNone,
    noBox,
    withBox: all.length - noBox,
    templates: document.querySelectorAll("template").length,
    styleTags: document.querySelectorAll("style").length,
    linkSheets: document.querySelectorAll('link[rel="stylesheet"]').length,
    styleSheets: document.styleSheets.length,
    cssRules,
    unreadableSheets,
    rootClass: document.documentElement.className,
    bodyClass: document.body ? document.body.className : "",
    topBuckets: [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15),
  };
}

/* ───────────────────────────── aggregate + output ───────────────────────────── */

function median(values) {
  const sorted = values.filter((v) => Number.isFinite(v)).slice().sort((a, b) => a - b);
  if (!sorted.length) return NaN;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stat(values) {
  return { median: median(values), min: Math.min(...values), max: Math.max(...values) };
}

function summarize(runs) {
  const metrics = {};
  for (const key of Object.keys(runs[0].metrics)) metrics[key] = stat(runs.map((r) => r.metrics[key]));

  const dom = {};
  for (const key of ["elements", "displayNone", "noBox", "withBox", "templates", "styleTags", "linkSheets", "styleSheets", "cssRules"]) {
    dom[key] = stat(runs.map((r) => r.dom[key]));
  }

  const last = runs[runs.length - 1];
  return {
    metrics,
    dom,
    rules: { total: stat(runs.map((r) => r.rules.total)), used: stat(runs.map((r) => r.rules.used)) },
    lastRootClass: last.dom.rootClass,
    lastBodyClass: last.dom.bodyClass,
    lastTopBuckets: last.dom.topBuckets,
    rawRuns: runs.map((r) => ({ metrics: r.metrics, rules: r.rules, elements: r.dom.elements })),
  };
}

function fmt(value, digits = 0) {
  return Number.isFinite(value) ? value.toFixed(digits) : "-";
}

function scaled(s, factor) {
  return { median: s.median * factor, min: s.min * factor, max: s.max * factor };
}

function printTables() {
  for (const key of Object.keys(results)) {
    const { metrics, dom, rules } = results[key];
    const line = (label, s, digits = 0) =>
      console.log(`  ${label.padEnd(24)} ${fmt(s.median, digits).padStart(9)}   (${fmt(s.min, digits)}–${fmt(s.max, digits)})`);

    console.log(`\n── ${key} (median of ${args.runs}, CPU ${CPU_THROTTLE}x, settle ${args.settleMs}ms) ──`);
    line("RecalcStyle count", metrics.RecalcStyleCount);
    line("RecalcStyle ms", scaled(metrics.RecalcStyleDuration, 1000), 1);
    line("Layout count", metrics.LayoutCount);
    line("Layout ms", scaled(metrics.LayoutDuration, 1000), 1);
    line("Script ms", scaled(metrics.ScriptDuration, 1000), 1);
    line("Task ms", scaled(metrics.TaskDuration, 1000), 1);
    console.log("");
    line("DOM elements", dom.elements);
    line("  with a box", dom.withBox);
    line("  no box (hidden)", dom.noBox);
    line("  display:none", dom.displayNone);
    line("<template> tags", dom.templates);
    line("Nodes (CDP)", metrics.Nodes);
    console.log("");
    line("stylesheets", dom.styleSheets);
    line("  <style> tags", dom.styleTags);
    line("  <link rel=sheet>", dom.linkSheets);
    line("CSS rules (DOM)", dom.cssRules);
    line("rules tracked", rules.total);
    line("rules MATCHED", rules.used);
    const ratio = rules.total.median > 0 ? (rules.used.median / rules.total.median) * 100 : NaN;
    console.log(`  ${"matched share".padEnd(24)} ${fmt(ratio, 1).padStart(9)} %`);
    console.log(`  html class: ${results[key].lastRootClass}`);
    console.log(`  body class: ${results[key].lastBodyClass}`);
    console.log(`  top id buckets (nearest-id attribution, last run):`);
    for (const [id, count] of results[key].lastTopBuckets) console.log(`    ${String(count).padStart(5)}  ${id}`);
  }
}

/* ───────────────────────────── static serving ───────────────────────────── */

/**
 * 🔴 "dist 가 있으면 쓴다" 로 두지 말 것 — verify:mobile-cdp-smoke 가 그 형태였다가 소스를 고쳐도
 * 옛 산출물을 재며 조용히 통과했다(docs/guard-integrity-2026-08-13.md 의 G-8). 낡았으면 실패시킨다.
 */
function resolveStaticRoot() {
  if (args.url) return root;
  const distShell = path.join(root, "dist", "index.html");
  if (!fs.existsSync(distShell)) {
    console.error("[perf:style-cost] dist/index.html 이 없다. 먼저 `npm run build:cf` 를 돌릴 것.");
    process.exit(1);
  }
  const newer = newestSourceInput(fs.statSync(distShell).mtimeMs);
  if (newer) {
    console.error(`[perf:style-cost] dist 가 낡았다 — ${newer} 가 dist/index.html 보다 새롭다. \`npm run build:cf\` 를 다시 돌릴 것.`);
    process.exit(1);
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

/**
 * 🔴 압축은 옵션이 아니다. 압축 없이 서빙하면 1.4MB 셸의 전송이 지배해 JS 실행이 대부분
 * FCP 이전에 끝나고, 그러면 우리가 재려는 부팅 구간 자체가 다른 모양이 된다
 * (measure-home-lighthouse.mjs:359-365 의 실측 근거 그대로).
 */
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

function startStaticServer() {
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
  const presetRaw = (get("preset") || "mobile").toLowerCase();
  if (!["mobile", "desktop", "both"].includes(presetRaw)) {
    throw new Error(`--preset must be mobile|desktop|both (got ${presetRaw})`);
  }
  const themeRaw = (get("theme") || "yeon").toLowerCase();
  if (!["yeon", "neo", "both"].includes(themeRaw)) {
    throw new Error(`--theme must be yeon|neo|both (got ${themeRaw})`);
  }
  return {
    runs: Math.min(10, Math.max(1, Number(get("runs")) || 3)),
    presets: presetRaw === "both" ? ["mobile", "desktop"] : [presetRaw],
    themes: themeRaw === "both" ? ["yeon", "neo"] : [themeRaw],
    url: get("url"),
    out: get("out"),
    label: (get("label") || "head").replace(/[^a-zA-Z0-9._-]/g, "-"),
    settleMs: Math.max(500, Number(get("settle")) || 6000),
    loadTimeoutMs: Math.max(5000, Number(get("load-timeout")) || 60000),
  };
}

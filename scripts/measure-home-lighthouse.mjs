/**
 * 홈 셸의 Lighthouse 를 같은 조건으로 반복 측정한다.
 *
 * 왜 필요한가 — 성능 작업의 전/후를 비교하려면 같은 조건이어야 하는데, 프로덕션 URL 은
 * 네트워크·CDN·엣지 캐시가 매번 달라 그 조건을 만들 수 없다. 그래서 **이미 빌드된 dist/ 를
 * 로컬에서 서빙하고** 그 위에서 잰다. 빌드는 이 스크립트가 하지 않는다(npm run build:cf 를 먼저).
 *
 * 재사용한 것:
 *   - findChrome() / 정적 서버 / getFreePort() 는 scripts/verify-mobile-cdp-smoke.mjs 와 같은 방식
 *   - lighthouse@13 · chrome-launcher 는 이미 devDependency 트리에 있다
 *
 * 결과는 저장소가 아니라 --out 디렉터리(기본: OS temp)에 쓴다. 측정 산출물은 커밋 대상이 아니다.
 *
 * 사용:
 *   npm run build:cf
 *   npm run perf:home -- --runs=3 --preset=both --label=baseline
 */
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import desktopConfig from "lighthouse/core/config/desktop-config.js";

const root = process.cwd();
const staticRoot = fs.existsSync(path.join(root, "dist", "index.html"))
  ? path.join(root, "dist")
  : root;

// 실행마다 동일하게 적용한다. 여기서 갈리면 회차 간 비교가 무의미해진다.
const CHROME_FLAGS = [
  "--headless=new",
  "--disable-gpu",
  "--disable-extensions",
  "--disable-background-networking",
  "--disable-default-apps",
  "--disable-sync",
  "--no-first-run",
  "--no-default-browser-check",
  "--metrics-recording-only",
  "--mute-audio",
];

// 🔴 서버가 최상위 await 로 먼저 뜨므로, 서버가 쓰는 const 는 반드시 그 앞에 선언한다(TDZ).
const COMPRESSIBLE = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg", ".xml", ".txt"]);
const encodedCache = new Map();

const args = parseArgs(process.argv.slice(2));

const server = await startStaticServer();
const port = server.address().port;
const targetUrl = args.url || `http://127.0.0.1:${port}/`;

console.log(`[perf:home] serving ${path.relative(root, staticRoot) || "."} on :${port}`);
console.log(`[perf:home] target ${targetUrl}`);
console.log(`[perf:home] presets ${args.presets.join(", ")} · runs ${args.runs} · label ${args.label}`);

const results = {};

try {
  for (const preset of args.presets) {
    const runs = [];
    for (let i = 0; i < args.runs; i += 1) {
      process.stdout.write(`[perf:home] ${preset} run ${i + 1}/${args.runs} ... `);
      const lhr = await runOnce(targetUrl, preset);
      const metrics = extractMetrics(lhr);
      runs.push({
        metrics,
        longTasks: extractLongTasks(lhr),
        bootup: extractBootup(lhr),
        breakdown: extractBreakdown(lhr),
        dom: extractDom(lhr),
        unusedCss: extractUnusedCss(lhr),
        renderBlocking: extractRenderBlocking(lhr),
      });
      console.log(`score ${metrics.performance} · TBT ${Math.round(metrics.tbt)}ms`);
    }
    results[preset] = summarize(runs);
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}

const outDir = args.out || path.join(os.tmpdir(), "code-destiny-perf");
fs.mkdirSync(outDir, { recursive: true });
const jsonPath = path.join(outDir, `perf-${args.label}.json`);
const mdPath = path.join(outDir, `perf-${args.label}.md`);
fs.writeFileSync(jsonPath, JSON.stringify({ label: args.label, url: targetUrl, runs: args.runs, results }, null, 2), "utf8");
fs.writeFileSync(mdPath, renderMarkdown(), "utf8");

printTables();
console.log(`\n[perf:home] wrote ${jsonPath}`);
console.log(`[perf:home] wrote ${mdPath}`);

/* ───────────────────────────── lighthouse ───────────────────────────── */

async function runOnce(url, preset) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: CHROME_FLAGS,
    chromePath: process.env.CHROME_PATH || undefined,
    // 회차마다 새 프로필. 이전 회차의 캐시·저장소가 다음 회차에 새지 않게 한다.
    userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "cd-lh-")),
  });
  try {
    const flags = {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance"],
    };
    // 데스크탑은 lighthouse 가 제공하는 정본 config 를 그대로 쓴다(스로틀링·화면 에뮬레이션 포함).
    // 모바일은 기본 config 가 곧 모바일이라 넘기지 않는다.
    const runnerResult = await lighthouse(url, flags, preset === "desktop" ? desktopConfig : undefined);
    if (!runnerResult || !runnerResult.lhr) throw new Error("lighthouse returned no result");
    return runnerResult.lhr;
  } finally {
    await chrome.kill();
  }
}

function numeric(lhr, id) {
  const audit = lhr.audits && lhr.audits[id];
  return audit && typeof audit.numericValue === "number" ? audit.numericValue : NaN;
}

function extractMetrics(lhr) {
  return {
    performance: Math.round((lhr.categories.performance.score || 0) * 100),
    fcp: numeric(lhr, "first-contentful-paint"),
    lcp: numeric(lhr, "largest-contentful-paint"),
    tbt: numeric(lhr, "total-blocking-time"),
    cls: numeric(lhr, "cumulative-layout-shift"),
    speedIndex: numeric(lhr, "speed-index"),
  };
}

/** long-tasks 감사: 50ms 넘는 메인스레드 작업을 시작 시각·길이와 함께 준다. */
function extractLongTasks(lhr) {
  const items = lhr.audits?.["long-tasks"]?.details?.items || [];
  return items.map((item) => ({
    url: item.url || "(unattributed)",
    duration: item.duration || 0,
    startTime: item.startTime || 0,
  }));
}

/** bootup-time 감사: 스크립트별 평가/파싱 CPU 시간. 어느 파일이 비싼지는 이쪽이 정확하다. */
function extractBootup(lhr) {
  const items = lhr.audits?.["bootup-time"]?.details?.items || [];
  return items.map((item) => ({
    url: item.url || "(unattributed)",
    total: item.total || 0,
    scripting: item.scripting || 0,
    parse: item.scriptParseCompile || 0,
  }));
}

/**
 * 🔴 이 감사가 이 스크립트의 존재 이유다.
 * 메인스레드 시간이 Script Evaluation 에 있는지 Style & Layout 에 있는지가
 * 처방을 완전히 갈라놓는다 — 전자면 코드를 덜 실행해야 하고, 후자면 CSS 규칙 수와
 * DOM 크기를 줄여야 한다. 이걸 모르고 고치면 앞서 두 번 그랬듯 헛수고가 된다.
 */
function extractBreakdown(lhr) {
  const items = lhr.audits?.["mainthread-work-breakdown"]?.details?.items || [];
  const out = {};
  for (const item of items) out[item.groupLabel || item.group] = item.duration || 0;
  return out;
}

function extractDom(lhr) {
  const items = lhr.audits?.["dom-size"]?.details?.items || [];
  const out = {};
  for (const item of items) {
    const label = item.statistic || "";
    out[label] = Number(item.value?.value ?? item.value ?? 0);
  }
  return out;
}

function extractUnusedCss(lhr) {
  const items = lhr.audits?.["unused-css-rules"]?.details?.items || [];
  return items.map((item) => ({
    url: item.url || "(inline)",
    total: item.totalBytes || 0,
    wasted: item.wastedBytes || 0,
  }));
}

function extractRenderBlocking(lhr) {
  const items = lhr.audits?.["render-blocking-resources"]?.details?.items || [];
  return items.map((item) => ({
    url: item.url || "",
    total: item.totalBytes || 0,
    wasted: item.wastedMs || 0,
  }));
}

/* ───────────────────────────── aggregate ───────────────────────────── */

function median(values) {
  const sorted = values.filter((v) => Number.isFinite(v)).slice().sort((a, b) => a - b);
  if (!sorted.length) return NaN;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function summarize(runs) {
  const keys = ["performance", "fcp", "lcp", "tbt", "cls", "speedIndex"];
  const metrics = {};
  for (const key of keys) {
    const values = runs.map((run) => run.metrics[key]);
    metrics[key] = { median: median(values), min: Math.min(...values), max: Math.max(...values) };
  }
  // 회차마다 태스크 경계가 흔들리므로, URL 단위로 합산한 뒤 회차 중앙값을 쓴다.
  const breakdown = {};
  for (const key of new Set(runs.flatMap((run) => Object.keys(run.breakdown || {})))) {
    breakdown[key] = median(runs.map((run) => run.breakdown?.[key] || 0));
  }
  const dom = {};
  for (const key of new Set(runs.flatMap((run) => Object.keys(run.dom || {})))) {
    dom[key] = median(runs.map((run) => run.dom?.[key] || 0));
  }
  return {
    metrics,
    breakdown,
    dom,
    longTasks: rankByUrl(runs, (run) => run.longTasks, "duration"),
    bootup: rankByUrl(runs, (run) => run.bootup, "total"),
    unusedCss: rankByUrl(runs, (run) => run.unusedCss, "wasted"),
    renderBlocking: rankByUrl(runs, (run) => run.renderBlocking, "wasted"),
    rawRuns: runs.map((run) => run.metrics),
  };
}

function rankByUrl(runs, pick, field) {
  const perRun = runs.map((run) => {
    const totals = new Map();
    for (const item of pick(run)) {
      totals.set(item.url, (totals.get(item.url) || 0) + (item[field] || 0));
    }
    return totals;
  });
  const urls = new Set();
  for (const totals of perRun) for (const url of totals.keys()) urls.add(url);
  return [...urls]
    .map((url) => ({
      url,
      ms: median(perRun.map((totals) => totals.get(url) || 0)),
      bytes: localBytes(url),
    }))
    .filter((row) => row.ms > 0)
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 10);
}

/**
 * dist/js/shell/s-<hash>.js 는 이름만으로는 어느 블록인지 알 수 없다.
 * 크기를 함께 찍어 두면 셸 소스의 블록(640KB/258KB 등)과 대조할 수 있다.
 */
function localBytes(url) {
  try {
    const pathname = new URL(url, "http://127.0.0.1").pathname;
    const filePath = path.join(staticRoot, decodeURIComponent(pathname));
    if (!filePath.startsWith(staticRoot)) return 0;
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

/* ───────────────────────────── output ───────────────────────────── */

function fmt(value, digits = 0) {
  return Number.isFinite(value) ? value.toFixed(digits) : "-";
}

function kb(bytes) {
  return bytes > 0 ? `${Math.round(bytes / 1024)}KB` : "";
}

function printTables() {
  for (const preset of Object.keys(results)) {
    const { metrics, longTasks, bootup } = results[preset];
    console.log(`\n── ${preset} (median of ${args.runs}) ──`);
    console.log(`  Performance   ${fmt(metrics.performance.median)}   (${fmt(metrics.performance.min)}–${fmt(metrics.performance.max)})`);
    console.log(`  FCP           ${fmt(metrics.fcp.median)} ms`);
    console.log(`  LCP           ${fmt(metrics.lcp.median)} ms`);
    console.log(`  TBT           ${fmt(metrics.tbt.median)} ms   (${fmt(metrics.tbt.min)}–${fmt(metrics.tbt.max)})`);
    console.log(`  CLS           ${fmt(metrics.cls.median, 3)}`);
    console.log(`  Speed Index   ${fmt(metrics.speedIndex.median)} ms`);

    const { breakdown, dom, unusedCss } = results[preset];
    console.log(`\n  Main-thread work breakdown (median):`);
    for (const [label, ms] of Object.entries(breakdown).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${fmt(ms).padStart(7)} ms  ${label}`);
    }
    if (Object.keys(dom).length) {
      console.log(`  DOM: ${Object.entries(dom).map(([k, v]) => `${k}=${fmt(v)}`).join(" · ")}`);
    }
    console.log(`\n  Top unused CSS (wasted bytes):`);
    for (const row of unusedCss.slice(0, 5)) {
      console.log(`    ${kb(row.ms).padStart(8)} wasted  ${row.url}`);
    }

    console.log(`\n  Top long tasks (>50ms):`);
    for (const row of longTasks.slice(0, 5)) {
      console.log(`    ${fmt(row.ms).padStart(6)} ms  ${kb(row.bytes).padStart(7)}  ${row.url}`);
    }
    console.log(`\n  Top script CPU (bootup-time):`);
    for (const row of bootup.slice(0, 5)) {
      console.log(`    ${fmt(row.ms).padStart(6)} ms  ${kb(row.bytes).padStart(7)}  ${row.url}`);
    }
  }
}

function renderMarkdown() {
  const lines = [`# perf:home — ${args.label}`, "", `- URL: ${targetUrl}`, `- Runs: ${args.runs}`, ""];
  for (const preset of Object.keys(results)) {
    const { metrics, longTasks, bootup } = results[preset];
    lines.push(`## ${preset}`, "", "| Metric | Median | Min | Max |", "|---|---:|---:|---:|");
    for (const [key, label] of [["performance", "Performance"], ["fcp", "FCP (ms)"], ["lcp", "LCP (ms)"], ["tbt", "TBT (ms)"], ["cls", "CLS"], ["speedIndex", "Speed Index (ms)"]]) {
      const digits = key === "cls" ? 3 : 0;
      const m = metrics[key];
      lines.push(`| ${label} | ${fmt(m.median, digits)} | ${fmt(m.min, digits)} | ${fmt(m.max, digits)} |`);
    }
    lines.push("", "### Top long tasks", "", "| ms | size | url |", "|---:|---:|---|");
    for (const row of longTasks) lines.push(`| ${fmt(row.ms)} | ${kb(row.bytes)} | \`${row.url}\` |`);
    lines.push("", "### Top script CPU (bootup-time)", "", "| ms | size | url |", "|---:|---:|---|");
    for (const row of bootup) lines.push(`| ${fmt(row.ms)} | ${kb(row.bytes)} | \`${row.url}\` |`);
    lines.push("");
  }
  return lines.join("\n");
}

/* ───────────────────────────── plumbing ───────────────────────────── */

function parseArgs(argv) {
  const get = (name) => {
    const hit = argv.find((arg) => arg.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : "";
  };
  const runs = Math.min(10, Math.max(1, Number(get("runs")) || 3));
  const presetRaw = (get("preset") || "both").toLowerCase();
  if (!["mobile", "desktop", "both"].includes(presetRaw)) {
    throw new Error(`--preset must be mobile|desktop|both (got ${presetRaw})`);
  }
  return {
    runs,
    presets: presetRaw === "both" ? ["mobile", "desktop"] : [presetRaw],
    url: get("url"),
    out: get("out"),
    label: (get("label") || "head").replace(/[^a-zA-Z0-9._-]/g, "-"),
  };
}

/**
 * 🔴 압축은 옵션이 아니라 필수다.
 *
 * 압축 없이 서빙하면 Lighthouse 의 시뮬레이션 스로틀링에서 2.6MB 셸의 전송이 지배해
 * FCP 가 14초까지 밀리고, 그러면 **JS 실행이 대부분 FCP 이전에 끝나 TBT 에 안 잡힌다**
 * (실측: 압축 없음 → 모바일 TBT 432ms, 프로덕션 → 3,010ms. 같은 코드다).
 * 프로덕션 Cloudflare 는 brotli 로 내려주므로, 그 체제를 재현해야 측정이 의미를 가진다.
 */
function encodeFor(filePath, buffer, acceptEncoding) {
  if (!COMPRESSIBLE.has(path.extname(filePath).toLowerCase())) return null;
  const accepts = String(acceptEncoding || "");
  const encoding = /\bbr\b/.test(accepts) ? "br" : /\bgzip\b/.test(accepts) ? "gzip" : null;
  if (!encoding) return null;

  const key = `${encoding}:${filePath}`;
  let body = encodedCache.get(key);
  if (!body) {
    // 품질은 전송 크기가 프로덕션과 비슷해지는 선에서 가장 빠른 값으로 고른다.
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
        headers["vary"] = "Accept-Encoding";
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

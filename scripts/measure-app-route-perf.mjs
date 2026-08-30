#!/usr/bin/env node
/**
 * measure-app-route-perf
 *
 * 앱/모바일 웹뷰 조건에서 **App Router 기능 화면의 체감 렉**을 잰다.
 * 사용자 보고("연이의 운명 찻집이 렉 걸린다")를 수치로 바꾸는 도구이고,
 * 이후 절제(ablation)·수정의 판정 기준선을 만든다.
 *
 * 🔴 왜 새로 필요한가 — 저장소의 측정 도구는 전부 **홈 셸(정적 index.html)** 전용이다.
 *   - perf:style-cost / perf:recalc-origin / perf:home : 대상이 `/` 고정, "로드 한 번"만 잰다.
 *   - 찻집의 렉은 로드가 아니라 **로드 이후의 상호작용 구간**(입장 스토리 타자기, 앨범 스크롤)에서
 *     난다. 그 구간을 재는 도구가 하나도 없었다.
 *
 * 🔴 새로 만들지 않고 조립한 것 (CLAUDE.md 원칙 6):
 *   - brotli/gzip 정적 서버 + dist 신선도 fail-closed : scripts/measure-home-style-cost.mjs:302-380
 *   - 안드로이드 웹뷰 에뮬레이션 + 찻집 입장 스토리 진입/진행 : scripts/verify-app-bottom-clearance.mjs:69-93, :178-243
 *   - CPU 4x + Slow4G + Performance.getMetrics : scripts/measure-home-style-cost.mjs:41-46, :155-171
 *   - CDP Tracing 스트림 수신 + 파이프라인 집계 : scripts/measure-recalc-attribution.mjs:247-268, :287-300
 *
 * 🔴 압축은 옵션이 아니다. 무압축으로 서빙하면 TBT 가 432ms → 3,010ms 로 거짓 부풀려진다
 *    (measure-home-lighthouse.mjs 선례). 여기서도 brotli/gzip 을 켠다.
 *
 * 🔴 패스를 둘로 나눈 이유 — 트레이싱과 CSS 규칙 추적은 **자기가 재려는 것을 오염시킨다**
 *    (메모 perf-style-cost-inflates-recalc: 규칙 추적 ON 이면 recalc 시간이 3배). 그래서
 *      frames  : 계측 최소. 프레임 간격·롱태스크·Performance.getMetrics 델타 → **판정은 이 패스로만 한다**
 *      pipeline: Tracing + 규칙 추적. Paint/CompositeLayers 분해와 매칭 규칙 수 → **원인 귀속용, 절대값 비교 금지**
 *    두 패스의 절대 시간을 섞어 읽지 말 것.
 *
 * fail-closed 목록 (하나라도 걸리면 exit 1 — "측정 못 했다"가 "이상 없다"로 읽히면 안 된다):
 *   - dist 산출물 부재 / dist 가 소스보다 낡음
 *   - playwright import 실패
 *   - 대상 씬·앨범 미발견, 진행 버튼 없음
 *   - document.visibilityState !== "visible" (메모 cdp-scans-false-pass-when-app-is-backgrounded)
 *   - rAF 프레임 표본 0건, 또는 구간 표본 수가 기대치 미만
 *
 * 사용:
 *   npm run build                                            # dist/ 최신화
 *   node scripts/measure-app-route-perf.mjs --runs=5 --label=baseline
 *   node scripts/measure-app-route-perf.mjs --runs=3 --passes=frames --label=ablation-A
 *   node scripts/measure-app-route-perf.mjs --segments=neo-prologue --passes=frames --dump-animations
 *
 * 🔴 구간은 라우트마다 묶여 있다 — entry|album 은 찻집, neo-prologue 는 네오 작전실. 섞으면 parseArgs 가 죽는다.
 */

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(repoRoot, "dist");

/* ───────────────────────────── 측정 조건 ───────────────────────────── */

/** 갤럭시 M15 5G 급 세로 뷰포트. verify-app-bottom-clearance.mjs 와 같은 값이라 나란히 읽힌다. */
const VIEWPORT = { width: 412, height: 823 };
const DPR = 1.75;
const UA =
  "Mozilla/5.0 (Linux; Android 16; SM-M156B) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/140.0.0.0 Mobile Safari/537.36";
/** Lighthouse 모바일 기본값과 동일 — 여기서 갈리면 perf:home 결과와 나란히 못 읽는다. */
const CPU_THROTTLE = 4;
const NET = {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
};

/**
 * 60fps vsync 주기. 🔴 "16.7ms 를 넘은 프레임 비율"을 지표로 쓰지 말 것 —
 * 정상 프레임 간격이 16.666ms 라 반올림 지터만으로 40% 대가 나온다(2026-08-30 실측: 렉이 없는
 * 구간에서 43%). 그래서 판정은 **vsync 를 실제로 놓친 프레임**으로 한다.
 */
const VSYNC_MS = 1000 / 60;
/** 1.5 vsync 초과 = 최소 한 프레임을 놓쳤다. 이 비율이 체감 렉의 1차 지표다. */
const JANK_MS = VSYNC_MS * 1.5;
/**
 * 입장 스토리를 이만큼 진행시킨다 → 표본 5단계 (ADVANCES + 1). 찻집 입장 스토리의 길이에 맞춘 값이다.
 * 🔴 네오 프롤로그는 대사가 20줄이고 **연출이 붙은 장면(shadow·lion·morph)이 뒤쪽에 있다** — 기본값으로만
 * 재면 애니메이션이 하나도 없는 앞 두 장면만 보고 "연출 비용 없음"으로 오판한다. `--advances=` 로 늘린다.
 */
const ADVANCES = 4;
/** 한 단계에서 프레임을 이만큼 모은다. 타자기 24ms/글자가 도는 구간을 덮는다. */
const STAGE_SAMPLE_MS = 3000;
/**
 * 측정 가능한 구간과 그 구간이 사는 라우트. 🔴 구간마다 셀렉터가 그 화면 전용이라 라우트를 섞지 못한다
 * (dist 신선도 검사도 라우트 하나만 본다).
 */
const TEA_HOUSE_ROUTE = "/fortune-tea-house/";
const NEO_ROUTE = "/neo-operation-room/";
const SEGMENTS = ["entry", "album", "neo-prologue"];
/** 앨범 스크롤 횟수 · 1회 이동량. 🔴 smooth 금지 — 관성 애니메이션이 프레임 분포를 덮어쓴다. */
const ALBUM_SCROLLS = 6;
const ALBUM_SCROLL_PX = 800;
const ALBUM_SCROLL_GAP_MS = 500;

const BASE_TRACE_CATEGORIES = ["devtools.timeline", "disabled-by-default-devtools.timeline"];
/** 🔴 스크립트 계열(EventDispatch·FunctionCall·TimerFire)은 렌더 이벤트를 감싸므로 합산하지 않는다. */
const RENDER_EVENTS = ["UpdateLayoutTree", "Layout", "PrePaint", "Paint", "Commit", "CompositeLayers"];
const WRAPPER_EVENTS = ["FunctionCall", "TimerFire", "EventDispatch", "EvaluateScript", "ParseHTML", "HitTest"];

const COMPRESSIBLE = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg", ".xml", ".txt"]);
const encodedCache = new Map();

const MIME = {
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
  ".mp4": "video/mp4",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

/* ───────────────────────────── 인자 ───────────────────────────── */

const args = parseArgs(process.argv.slice(2));

function parseArgs(argv) {
  const get = (name) => {
    const hit = argv.find((arg) => arg.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : "";
  };
  const segmentsRaw = (get("segments") || "entry,album").split(",").map((s) => s.trim()).filter(Boolean);
  for (const segment of segmentsRaw) {
    if (!SEGMENTS.includes(segment)) throw new Error(`--segments 는 ${SEGMENTS.join("|")} 조합이어야 한다 (받은 값: ${segment})`);
  }
  // 🔴 네오 프롤로그는 라우트가 달라 찻집 구간과 한 실행에 섞지 못한다 — 조용히 한쪽을 못 재는 대신 여기서 죽인다.
  const explicitUrl = get("url");
  const wantsNeo = segmentsRaw.includes("neo-prologue");
  if (wantsNeo && segmentsRaw.length > 1) {
    throw new Error("--segments=neo-prologue 는 단독으로 돌린다 — 찻집 구간(entry|album)과 라우트가 다르다.");
  }
  if (wantsNeo && explicitUrl && !explicitUrl.startsWith(NEO_ROUTE.replace(/\/$/, ""))) {
    throw new Error(`--segments=neo-prologue 는 ${NEO_ROUTE} 전용이다 (받은 --url: ${explicitUrl}).`);
  }
  const route = explicitUrl || (wantsNeo ? NEO_ROUTE : TEA_HOUSE_ROUTE);
  const passesRaw = (get("passes") || "frames,pipeline").split(",").map((s) => s.trim()).filter(Boolean);
  for (const pass of passesRaw) {
    if (!["frames", "pipeline"].includes(pass)) throw new Error(`--passes 는 frames|pipeline 조합이어야 한다 (받은 값: ${pass})`);
  }
  if (!passesRaw.includes("frames")) throw new Error("--passes 에 frames 는 반드시 있어야 한다 — 판정 지표가 거기서만 나온다.");
  const netRaw = (get("net") || "slow4g").toLowerCase();
  if (!["slow4g", "none"].includes(netRaw)) throw new Error(`--net 은 slow4g|none 이어야 한다 (받은 값: ${netRaw})`);
  return {
    route: route.endsWith("/") ? route : `${route}/`,
    runs: Math.min(10, Math.max(1, Number(get("runs")) || 5)),
    advances: Math.max(1, Number(get("advances")) || ADVANCES),
    segments: segmentsRaw,
    passes: passesRaw,
    cpu: Math.max(1, Number(get("cpu")) || CPU_THROTTLE),
    net: netRaw,
    label: (get("label") || "baseline").replace(/[^a-zA-Z0-9._-]/g, "-"),
    out: get("out"),
    headed: argv.includes("--headed"),
    dumpAnimations: argv.includes("--dump-animations"),
  };
}

/* ───────────────────────────── dist 신선도 (fail-closed) ───────────────────────────── */

/**
 * 🔴 "dist 가 있으면 쓴다" 로 두지 말 것 — verify:mobile-cdp-smoke 가 그 형태였다가 소스를 고쳐도
 * 옛 산출물을 재며 조용히 통과했다(docs/guard-integrity-2026-08-13.md 의 G-8).
 */
function resolveRouteShell() {
  const shell = path.join(distRoot, args.route.replace(/^\/+/, "").replace(/\/$/, ""), "index.html");
  if (!fs.existsSync(shell)) {
    console.error(`[app-route-perf] ${path.relative(repoRoot, shell)} 이 없다 — 먼저 \`npm run build\` 로 dist/ 를 만들 것.`);
    console.error("(빌드 없이 재면 이 측정은 기준선이 아니다.)");
    process.exit(1);
  }
  const builtAt = fs.statSync(shell).mtimeMs;
  const stale = newestSourceInput(builtAt);
  if (stale) {
    console.error(`[app-route-perf] dist 가 낡았다 — ${stale} 가 ${path.relative(repoRoot, shell)} 보다 새롭다. \`npm run build\` 를 다시 돌릴 것.`);
    process.exit(1);
  }
  return shell;
}

const SOURCE_ROOTS = ["src", "app", "config"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".json"]);

function newestSourceInput(builtAt) {
  const stack = SOURCE_ROOTS.map((dir) => path.join(repoRoot, dir)).filter((p) => fs.existsSync(p));
  while (stack.length) {
    const current = stack.pop();
    let stats;
    try {
      stats = fs.statSync(current);
    } catch {
      continue;
    }
    if (stats.isDirectory()) {
      for (const entry of fs.readdirSync(current)) {
        if (entry === "node_modules" || entry === ".next") continue;
        stack.push(path.join(current, entry));
      }
      continue;
    }
    if (!SOURCE_EXTENSIONS.has(path.extname(current))) continue;
    if (stats.mtimeMs > builtAt) return path.relative(repoRoot, current);
  }
  return null;
}

/* ───────────────────────────── 정적 서버 ───────────────────────────── */

function encodeFor(filePath, buffer, acceptEncoding) {
  if (!COMPRESSIBLE.has(path.extname(filePath).toLowerCase())) return null;
  const accepts = String(acceptEncoding || "");
  const encoding = /\bbr\b/.test(accepts) ? "br" : /\bgzip\b/.test(accepts) ? "gzip" : null;
  if (!encoding) return null;
  const key = `${encoding}:${filePath}`;
  let body = encodedCache.get(key);
  if (!body) {
    body =
      encoding === "br"
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
    let filePath = path.normalize(path.join(distRoot, rawPath));
    if (!filePath.startsWith(distRoot)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, "index.html");
    fs.readFile(filePath, (error, buffer) => {
      if (error) {
        res.writeHead(404).end("Not found");
        return;
      }
      const headers = {
        "content-type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "cache-control": "no-store",
      };
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

/* ───────────────────────────── 페이지 안 샘플러 ───────────────────────────── */

/**
 * rAF 간격과 롱태스크를 페이지 안에서 모은다.
 *
 * 🔴 rAF 를 쓰는 이유 — Performance.getMetrics 는 "메인스레드가 얼마나 바빴나"만 준다.
 *    사용자가 말한 "렉"은 **프레임이 언제 안 나왔나**이고, 그건 rAF 간격 분포로만 보인다.
 *    합성만으로 도는 애니메이션은 메인스레드가 한가해도 프레임을 떨어뜨린다.
 */
function installSampler() {
  window.__routePerf = {
    frames: [],
    longTasks: [],
    running: false,
    observer: null,
    longTaskSupported: true,
    start() {
      this.frames = [];
      this.longTasks = [];
      this.running = true;
      try {
        this.observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) this.longTasks.push(entry.duration);
        });
        this.observer.observe({ type: "longtask", buffered: false });
        this.longTaskSupported = true;
      } catch {
        this.observer = null;
        this.longTaskSupported = false;
      }
      let last = -1;
      const tick = (now) => {
        if (!this.running) return;
        if (last >= 0) this.frames.push(now - last);
        last = now;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    stop() {
      this.running = false;
      if (this.observer) {
        try {
          this.observer.disconnect();
        } catch {
          /* 이미 끊김 */
        }
        this.observer = null;
      }
      return {
        frames: this.frames.slice(),
        longTasks: this.longTasks.slice(),
        longTaskSupported: this.longTaskSupported,
        visibilityState: document.visibilityState,
        nodes: document.querySelectorAll("*").length,
      };
    },
  };
}

/* ───────────────────────────── 페이지 안 조작 (브라우저 컨텍스트) ───────────────────────────── */

/** 입장 스토리 대사 상자의 진행 상태. 타자기가 실제로 돌았는지 확인하는 데 쓴다. */
function readDialogue() {
  const box = document.querySelector("[data-speaker][data-complete]");
  if (!box) return { present: false };
  return {
    present: true,
    complete: box.getAttribute("data-complete") === "true",
    chars: (box.textContent || "").length,
  };
}

/** verify-app-bottom-clearance.mjs:154-161 과 같은 방식 — 씬의 마지막 버튼이 "다음"이다. */
function advanceStory() {
  const scene = document.querySelector("section[data-entry-stage]");
  const buttons = Array.from(scene ? scene.querySelectorAll("button") : []);
  const next = buttons[buttons.length - 1];
  if (!next || next.disabled) return false;
  next.click();
  return true;
}

/**
 * 프롤로그가 열렸다는 표식. CSS 모듈이 이름을 해싱하므로 부분 일치로 잡는다(entry 구간의 landingActions 와 같은 방식).
 * SSR HTML 은 언제나 `data-phase="landing"` 이고, 이 값이 `prologue` 로 바뀌는 것은 마운트 훅이 돈 뒤다.
 */
const NEO_PROLOGUE_SELECTOR = '[class*="heroSection"][data-phase="prologue"]';

/** 네오는 대사 상자 자체가 진행 버튼이다 — 클릭 핸들러가 붙었는지 확인할 대상. */
const NEO_DIALOGUE_SELECTOR = '[class*="vnDialogueContent"][role="button"]';

/**
 * 네오는 대사 상자 자체가 진행 버튼이다(role="button"). 🔴 타자 중의 첫 클릭은 "타자기 즉시 완성"으로
 * 먹히고 다음 대사로 넘어가지 않는다 — 그래서 눌린 시점의 타자 여부를 함께 돌려준다.
 */
function clickNeoDialogue() {
  const box = document.querySelector("[data-speaker][data-complete]");
  const content = box && box.querySelector('[role="button"]');
  if (!content) return null;
  const typing = box.querySelector('p[data-typing="true"]') !== null;
  content.click();
  return { typing };
}

/** 프롤로그의 현재 대사가 어느 화자·캐릭터인지. entry 구간의 data-entry-stage 자리에 들어간다. */
function readNeoStage() {
  const box = document.querySelector("[data-speaker][data-complete]");
  if (!box) return null;
  return `${box.getAttribute("data-speaker")}/${box.getAttribute("data-character")}`;
}

const ALBUM_SELECTOR = '[role="dialog"][aria-labelledby="tarotAlbumTitle"]';

function scrollAlbum(px) {
  const dialog = document.querySelector('[role="dialog"][aria-labelledby="tarotAlbumTitle"]');
  if (!dialog) return null;
  const before = dialog.scrollTop;
  dialog.scrollTop = before + px; // 🔴 scrollBy({behavior:"smooth"}) 금지 — 관성이 프레임 분포를 덮는다
  return { before, after: dialog.scrollTop, max: dialog.scrollHeight - dialog.clientHeight };
}

function censusAlbum() {
  const dialog = document.querySelector('[role="dialog"][aria-labelledby="tarotAlbumTitle"]');
  if (!dialog) return { present: false };
  return {
    present: true,
    cards: dialog.querySelectorAll("article, li, [data-card-id]").length,
    images: dialog.querySelectorAll("img").length,
    nodes: dialog.querySelectorAll("*").length,
    scrollHeight: dialog.scrollHeight,
    clientHeight: dialog.clientHeight,
  };
}

/**
 * 돌고 있는 CSS 애니메이션을 이름별로 센다 — 어떤 연출이 프레임 예산을 먹는지 **추측 대신 실측**하려고 둔다.
 * 2026-08-30 절제에서 `animation:none` 하나가 앨범 끊김을 54.5% → 2.2% 로 없앴는데, 그건 전부 끈 값이라
 * 무엇을 고쳐야 하는지는 못 알려준다. 이 조사는 그 다음 질문("어느 애니메이션이냐")에만 쓴다.
 * 🔴 측정 창을 시작하기 **전에만** 부른다 — `getAnimations()` 자체가 스타일을 강제 갱신한다.
 */
function censusAnimations() {
  const byName = new Map();
  for (const anim of document.getAnimations()) {
    const effect = anim.effect;
    const target = effect && effect.target;
    if (!target) continue;
    const name = anim.animationName || (anim.constructor && anim.constructor.name) || "(unknown)";
    const entry = byName.get(name) || { name, count: 0, running: 0, sample: "", infinite: false };
    entry.count += 1;
    if (anim.playState === "running") entry.running += 1;
    const timing = effect.getComputedTiming ? effect.getComputedTiming() : {};
    if (timing.iterations === Infinity) entry.infinite = true;
    if (!entry.sample) entry.sample = (target.className && String(target.className).slice(0, 60)) || target.tagName;
    byName.set(name, entry);
  }
  return [...byName.values()].sort((a, b) => b.running - a.running || b.count - a.count);
}

/* ───────────────────────────── CDP 보조 ───────────────────────────── */

async function readMetrics(cdp) {
  const { metrics } = await cdp.send("Performance.getMetrics");
  const wanted = ["RecalcStyleCount", "RecalcStyleDuration", "LayoutCount", "LayoutDuration", "ScriptDuration", "TaskDuration", "Nodes", "JSHeapUsedSize"];
  const out = {};
  for (const name of wanted) {
    const hit = metrics.find((m) => m.name === name);
    out[name] = hit ? hit.value : NaN;
  }
  return out;
}

function metricsDelta(before, after) {
  const out = {};
  for (const key of Object.keys(after)) {
    out[key] = key === "Nodes" || key === "JSHeapUsedSize" ? after[key] : after[key] - before[key];
  }
  return out;
}

/** 합성 레이어 수 스냅샷. 🔴 샘플 구간 안에서 켜지 않는다 — 레이어 변경마다 이벤트가 흘러 프레임을 오염시킨다. */
async function snapshotLayerCount(cdp) {
  const got = new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 4000);
    cdp.once("LayerTree.layerTreeDidChange", (event) => {
      clearTimeout(timer);
      resolve(Array.isArray(event.layers) ? event.layers.length : null);
    });
  });
  try {
    await cdp.send("LayerTree.enable");
  } catch {
    return null;
  }
  const count = await got;
  await cdp.send("LayerTree.disable").catch(() => {});
  return count;
}

async function startTracing(cdp) {
  await cdp.send("Tracing.start", {
    transferMode: "ReturnAsStream",
    streamFormat: "json",
    traceConfig: { recordMode: "recordAsMuchAsPossible", includedCategories: BASE_TRACE_CATEGORIES },
  });
}

async function stopTracing(cdp) {
  const done = new Promise((resolve) => cdp.once("Tracing.tracingComplete", resolve));
  await cdp.send("Tracing.end");
  const { stream } = await done;
  if (!stream) return [];
  let raw = "";
  for (;;) {
    const chunk = await cdp.send("IO.read", { handle: stream, size: 1024 * 1024 });
    raw += chunk.base64Encoded ? Buffer.from(chunk.data, "base64").toString("utf8") : chunk.data;
    if (chunk.eof) break;
  }
  await cdp.send("IO.close", { handle: stream }).catch(() => {});
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : parsed.traceEvents || [];
  } catch {
    return [];
  }
}

function digestTrace(events) {
  const render = {};
  const wrapper = {};
  for (const name of RENDER_EVENTS) render[name] = { count: 0, ms: 0 };
  for (const name of WRAPPER_EVENTS) wrapper[name] = { count: 0, ms: 0 };
  for (const event of events) {
    const bucket = render[event.name] || wrapper[event.name];
    if (!bucket) continue;
    bucket.count += 1;
    bucket.ms += (Number(event.dur) || 0) / 1000;
  }
  const renderMs = RENDER_EVENTS.reduce((sum, name) => sum + render[name].ms, 0);
  return { render, wrapper, renderMs };
}

/**
 * 🔴 외부 출처(assets./music./api.code-destiny.com)는 **차단하되 요청은 센다.**
 *
 * 왜 — 로컬 dist 를 재는 하네스에서 그 요청들은 전부 CORS/네트워크 오류로 실패한다(2026-08-30 실측:
 * 폰트 6종 + honey-drops 잔액 4회 + BGM mp3 1회). Slow4G 에뮬레이션 아래에서는 그 실패가
 * **에뮬레이션 대역과 커넥션 슬롯을 먹으면서** 첫 상호작용을 60초 밖으로 밀어낸다(진입 실패로 관측).
 * 실제 앱에서는 CDN 이 응답하므로 그 지연은 재현 대상이 아니다 — 그래서 빠르게 끊고,
 * **무엇을 얼마나 요청했는지는 그대로 기록**해 계획 0단계의 "BGM/원격 자산 점유" 확인을 살린다.
 */
/**
 * 🔴 타로 앨범은 **서버 잔량 응답이 `tarotAlbumUnlocked: true` 일 때만** 카드 78장을 그린다.
 * 로컬 dist 하네스에는 워커가 없어 그 응답이 실패하고, 앨범은 잠금 패널(이미지 7개 · 카드 0장)만
 * 남는다 — 재려던 스크롤이 아예 존재하지 않는다(2026-08-30 실측: `앨범에 카드가 0장이다`).
 * 그래서 이 응답 하나만 고정값으로 채운다.
 *
 * 🔴 이것은 **측정 하네스 전용 스텁이고 제품의 게이팅은 손대지 않는다** — 실제 잠금 해제는
 * 꿀방울 10개를 쓰는 서버 판정 그대로다. 스텁이 몇 번 쓰였는지는 외부 요청 표에 함께 찍는다.
 */
const HONEY_BALANCE_PATTERN = /\/api\/fortune-tea-house\/honey-drops\/balance/;
const HONEY_BALANCE_STUB = {
  ok: true,
  honeyDrops: {
    serviceScope: "FORTUNE_TEA_HOUSE",
    balance: 120,
    currentHoneyDrops: 120,
    totalHoneyDrops: 120,
    totalEarned: 120,
    totalSpent: 0,
    tarotAlbumUnlocked: true,
    unlocked: true,
    authenticated: true,
    disabled: false,
  },
};

/** `credentials: "include"` 로 나가므로 ACAO 는 `*` 가 아니라 요청 origin 이어야 한다. */
function corsHeaders(request) {
  const origin = request.headers().origin || "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": request.headers()["access-control-request-headers"] || "*",
    "cache-control": "no-store",
  };
}

function isLocal(url) {
  return url.startsWith("http://127.0.0.1:") || url.startsWith("data:") || url.startsWith("blob:");
}

async function blockExternal(page, sink) {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (isLocal(url)) {
      route.continue();
      return;
    }
    let host = "(알 수 없음)";
    try {
      host = new URL(url).host;
    } catch {
      /* about:, chrome-extension: 등 */
    }
    const request = route.request();
    if (HONEY_BALANCE_PATTERN.test(url)) {
      sink.push({ host, url, type: request.resourceType(), stubbed: true });
      if (request.method() === "OPTIONS") {
        void route.fulfill({ status: 204, headers: corsHeaders(request) });
        return;
      }
      void route.fulfill({
        status: 200,
        headers: { ...corsHeaders(request), "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify(HONEY_BALANCE_STUB),
      });
      return;
    }
    sink.push({ host, url, type: request.resourceType() });
    route.abort();
  });
}

/** 네트워크 점유 기록 — 진입 구간에서 원격 mp3/이미지가 얼마나 잡아먹는지 본다(계획 0단계의 값싼 확인 2). */
function attachNetworkRecorder(cdp) {
  const byRequest = new Map();
  const finished = [];
  cdp.on("Network.responseReceived", (event) => {
    byRequest.set(event.requestId, { url: event.response.url, type: event.type });
  });
  cdp.on("Network.loadingFinished", (event) => {
    const meta = byRequest.get(event.requestId);
    if (!meta) return;
    finished.push({ ...meta, bytes: Number(event.encodedDataLength) || 0 });
  });
  return {
    reset() {
      finished.length = 0;
    },
    summary() {
      const byType = new Map();
      for (const item of finished) {
        const slot = byType.get(item.type) || { count: 0, bytes: 0 };
        slot.count += 1;
        slot.bytes += item.bytes;
        byType.set(item.type, slot);
      }
      const media = finished.filter((i) => /\.(mp3|m4a|ogg|wav)(\?|$)/i.test(i.url));
      return {
        requests: finished.length,
        bytes: finished.reduce((sum, i) => sum + i.bytes, 0),
        byType: [...byType].map(([type, v]) => ({ type, ...v })).sort((a, b) => b.bytes - a.bytes),
        audio: { count: media.length, bytes: media.reduce((sum, i) => sum + i.bytes, 0) },
      };
    },
  };
}

/* ───────────────────────────── 통계 ───────────────────────────── */

function percentile(values, p) {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!sorted.length) return NaN;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function median(values) {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!sorted.length) return NaN;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** 🔴 판정 규율: 중앙값 하나로 결론 내지 않는다. min–max 밴드를 항상 같이 낸다. */
function band(values) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return { median: NaN, min: NaN, max: NaN, n: 0 };
  return { median: median(finite), min: Math.min(...finite), max: Math.max(...finite), n: finite.length };
}

function frameStats(frames) {
  const janky = frames.filter((f) => f > JANK_MS).length;
  // 놓친 vsync 수. 33ms 한 프레임은 1 드롭, 50ms 는 2 드롭 — 비율만으로는 심각도가 안 보인다.
  const dropped = frames.reduce((sum, f) => sum + Math.max(0, Math.round(f / VSYNC_MS) - 1), 0);
  const spanMs = frames.reduce((sum, f) => sum + f, 0);
  return {
    count: frames.length,
    p50: percentile(frames, 50),
    p95: percentile(frames, 95),
    max: frames.length ? Math.max(...frames) : NaN,
    jankRatio: frames.length ? (janky / frames.length) * 100 : NaN,
    dropped,
    droppedPerSec: spanMs > 0 ? (dropped / spanMs) * 1000 : NaN,
    spanMs,
  };
}

/* ───────────────────────────── 구간 측정 ───────────────────────────── */

/**
 * 🔴 Slow4G 아래에서는 부팅이 오래 걸린다 — 이 도구가 재는 것은 **부팅이 아니라 그 뒤의 상호작용**이라
 * 넉넉히 기다린다. 60초로 두었더니 Slow4G 에서 진입 자체가 실패했다(2026-08-30 실측).
 */
const BOOT_TIMEOUT_MS = args.net === "slow4g" ? 240000 : 60000;

async function gotoRoute(page, origin) {
  await page.goto(`${origin}${args.route}`, { waitUntil: "domcontentloaded", timeout: BOOT_TIMEOUT_MS });
}

/**
 * 🔴 하이드레이션 전에 누른 클릭은 그대로 증발한다 — 누르기 전에 이 게이트를 통과시킨다.
 *
 * 2026-08-30 실측(Slow4G + CPU 4x): `waitForSelector` 는 **서버 HTML 이 그린 버튼**을 보고 곧장
 * 통과하지만, Next 의 클라이언트 번들은 `<script async>` 라 그 시점에 아직 안 붙어 있다
 * (`document.readyState` 는 이미 `complete`, 대기 중인 요청도 0건이라 겉으로는 멀쩡해 보인다).
 * 그 상태에서 클릭하면 React 핸들러가 없어 아무 일도 안 일어나고, 뒤따르는
 * `section[data-entry-stage]` 대기가 240초를 통째로 쓰고 실패한다. 네트워크 스로틀을 끄면
 * 하이드레이션이 1초 안에 끝나 **우연히** 통과하므로, 조건을 바꾸면 결과가 갈리는 하네스가 된다.
 *
 * 판정 근거는 React 가 DOM 노드에 붙이는 `__reactProps$…`/`__reactFiber$…` 키다.
 */
async function waitForHydrated(page, selector, timeout) {
  const startedAt = Date.now();
  await page.waitForSelector(selector, { timeout });
  try {
    await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        return Object.keys(el).some((key) => key.startsWith("__reactProps$") || key.startsWith("__reactFiber$"));
      },
      selector,
      { timeout, polling: 250 },
    );
  } catch (error) {
    // 🔴 "Timeout exceeded" 한 줄만 남기면 무엇을 기다리다 죽었는지 알 수 없어 4분짜리 재현을 반복하게 된다.
    const state = await page
      .evaluate((sel) => ({
        readyState: document.readyState,
        scripts: document.querySelectorAll("script[src]").length,
        anyHydrated: [...document.querySelectorAll("body *")].some((el) =>
          Object.keys(el).some((key) => key.startsWith("__reactFiber$")),
        ),
        target: (() => {
          const el = document.querySelector(sel);
          if (!el) return "선택자에 맞는 요소가 사라졌다";
          const own = Object.keys(el).filter((key) => key.startsWith("__react")).length;
          let up = el.parentElement;
          let depth = 0;
          while (up && !Object.keys(up).some((key) => key.startsWith("__reactFiber$"))) {
            up = up.parentElement;
            depth += 1;
          }
          const at = up ? `${up.tagName.toLowerCase()}.${String(up.className).split(" ")[0]}(+${depth})` : "없음";
          return `요소 있음 · 자체 react 키 ${own}개 · 가장 가까운 하이드레이션 조상 ${at}`;
        })(),
        resources: performance.getEntriesByType("resource").length,
        transferKB: Math.round(
          performance.getEntriesByType("resource").reduce((sum, e) => sum + (e.transferSize || 0), 0) / 1024,
        ),
        slowest: performance
          .getEntriesByType("resource")
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 3)
          .map((e) => `${e.name.split("/").pop().slice(0, 34)}=${Math.round(e.duration)}ms`),
      }), selector)
      .catch(() => null);
    const detail = state
      ? `readyState=${state.readyState} · 리소스 ${state.resources}건/${state.transferKB}KB · script[src] ${state.scripts}개`
        + ` · 페이지에 하이드레이션된 노드 ${state.anyHydrated ? "있음" : "없음"} · 대상 ${state.target}`
        + ` · 최장 ${state.slowest.join(", ")}`
      : "페이지 상태를 읽지 못했다";
    const cause = String(error && error.message).split("\n")[0];
    throw new Error(
      `하이드레이션 대기 ${Math.round((Date.now() - startedAt) / 1000)}초 만에 실패 (${selector}) — ${detail} · 원인 ${cause}`,
    );
  }
}

async function sampleWindow(page, cdp, durationMs) {
  const before = await readMetrics(cdp);
  await page.evaluate(() => window.__routePerf.start());
  await page.waitForTimeout(durationMs);
  const raw = await page.evaluate(() => window.__routePerf.stop());
  const after = await readMetrics(cdp);
  return { raw, metrics: metricsDelta(before, after) };
}

/** 구간 A — 입장 스토리. 각 단계에서 타자기가 도는 동안 프레임을 모은다. */
async function measureEntry(page, cdp, origin, { tracing, network }) {
  const failures = [];
  await gotoRoute(page, origin);
  network.reset();

  try {
    await waitForHydrated(page, '[class*="landingActions"] button', BOOT_TIMEOUT_MS);
    await page.click('[class*="landingActions"] button');
    await page.waitForSelector("section[data-entry-stage]", { timeout: BOOT_TIMEOUT_MS });
  } catch (error) {
    return { failures: [`입장 스토리에 도달하지 못했다 — ${error.message.split("\n")[0]}`], stages: [] };
  }
  await page.waitForTimeout(1200);

  const animations = args.dumpAnimations ? await page.evaluate(censusAnimations) : null;
  if (tracing) await startTracing(cdp);
  const stages = [];
  for (let step = 0; step <= args.advances; step += 1) {
    const dialogueBefore = await page.evaluate(readDialogue);
    const { raw, metrics } = await sampleWindow(page, cdp, STAGE_SAMPLE_MS);
    const dialogueAfter = await page.evaluate(readDialogue);
    const stage = await page.evaluate(() => {
      const scene = document.querySelector("section[data-entry-stage]");
      return scene ? scene.getAttribute("data-entry-stage") : null;
    });

    if (raw.visibilityState !== "visible") {
      failures.push(`단계 ${step}: visibilityState=${raw.visibilityState} — 레이아웃이 멈춰 표본이 무효다.`);
      break;
    }
    if (!raw.frames.length) {
      failures.push(`단계 ${step}: rAF 프레임을 하나도 못 모았다 — 표본 0건은 "이상 없음"이 아니다.`);
      break;
    }
    stages.push({
      step,
      stage,
      frames: frameStats(raw.frames),
      longTasks: { count: raw.longTasks.length, ms: raw.longTasks.reduce((s, d) => s + d, 0), supported: raw.longTaskSupported },
      metrics,
      nodes: raw.nodes,
      typed: dialogueBefore.present && dialogueAfter.present ? dialogueAfter.chars - dialogueBefore.chars : null,
      completeAtStart: dialogueBefore.complete ?? null,
      completeAtEnd: dialogueAfter.complete ?? null,
    });

    if (step === args.advances) break;
    if (!(await page.evaluate(advanceStory))) {
      failures.push(`단계 ${step}: 다음으로 넘길 버튼이 없다 — 남은 단계를 못 쟀다.`);
      break;
    }
    await page.waitForTimeout(400);
  }
  const trace = tracing ? digestTrace(await stopTracing(cdp)) : null;
  const layers = await snapshotLayerCount(cdp);

  if (stages.length !== args.advances + 1) {
    failures.push(`입장 스토리 단계를 ${stages.length}개만 쟀다(${args.advances + 1}개 기대).`);
  }
  return { failures, stages, trace, layers, animations, network: network.summary() };
}

/**
 * 구간 C — 네오 작전실 프롤로그. 찻집 입장 스토리(구간 A)와 **같은 형태**의 VN 이라(전체화면 연출 레이어 +
 * setInterval 타자기) 두 라우트를 나란히 읽으려고 둔다. 반환 모양도 A 와 같아 집계기를 공유한다.
 *
 * 진행 방식만 다르다 — 찻집은 씬의 마지막 버튼, 네오는 대사 상자 자체가 버튼이고 타자 중 첫 클릭은
 * 타자기를 끝내는 데 쓰인다(clickNeoDialogue 주석).
 */
async function measureNeoPrologue(page, cdp, origin, { tracing, network }) {
  const failures = [];
  await gotoRoute(page, origin);
  network.reset();

  // 🔴 네오 프롤로그는 **입장 버튼을 누르는 것이 아니라 스스로 열린다** — 마운트 훅이 localStorage 의
  //    "프롤로그 봤음" 표식을 읽어 없으면 그 자리에서 프롤로그를 켠다(NeoOperationRoomPage.tsx 의
  //    shouldOpenPrologue). 하네스는 매 run 새 컨텍스트라 표식이 늘 비어 있으므로 항상 자동 개막이다.
  //    랜딩 입장 버튼(vnStartButton[data-phase="landing"])은 **이미 본 방문자에게만** 뜬다 — 그걸 기다리면
  //    영원히 안 온다. 그래서 개막 자체를 게이트로 쓴다(= 하이드레이션이 끝났다는 증거이기도 하다).
  try {
    await page.waitForSelector(NEO_PROLOGUE_SELECTOR, { timeout: BOOT_TIMEOUT_MS });
    await waitForHydrated(page, NEO_DIALOGUE_SELECTOR, BOOT_TIMEOUT_MS);
  } catch (error) {
    return { failures: [`프롤로그에 진입하지 못했다 — ${error.message.split("\n")[0]}`], stages: [] };
  }
  await page.waitForTimeout(1200);

  const animations = args.dumpAnimations ? await page.evaluate(censusAnimations) : null;
  if (tracing) await startTracing(cdp);
  const stages = [];
  for (let step = 0; step <= args.advances; step += 1) {
    const dialogueBefore = await page.evaluate(readDialogue);
    // 🔴 애니메이션 조사는 **단계마다** 한다 — 네오는 대사마다 캐릭터 씬이 갈리고 연출도 함께 갈린다.
    //    진입 직후 한 번만 재면 첫 장면(hidden, 애니메이션 0개)만 보고 전체를 판정하게 된다.
    const stageAnimations = args.dumpAnimations ? await page.evaluate(censusAnimations) : null;
    const { raw, metrics } = await sampleWindow(page, cdp, STAGE_SAMPLE_MS);
    const dialogueAfter = await page.evaluate(readDialogue);
    const stage = await page.evaluate(readNeoStage);

    if (raw.visibilityState !== "visible") {
      failures.push(`단계 ${step}: visibilityState=${raw.visibilityState} — 레이아웃이 멈춰 표본이 무효다.`);
      break;
    }
    if (!raw.frames.length) {
      failures.push(`단계 ${step}: rAF 프레임을 하나도 못 모았다 — 표본 0건은 "이상 없음"이 아니다.`);
      break;
    }
    stages.push({
      step,
      stage,
      frames: frameStats(raw.frames),
      longTasks: { count: raw.longTasks.length, ms: raw.longTasks.reduce((s, d) => s + d, 0), supported: raw.longTaskSupported },
      metrics,
      nodes: raw.nodes,
      typed: dialogueBefore.present && dialogueAfter.present ? dialogueAfter.chars - dialogueBefore.chars : null,
      completeAtStart: dialogueBefore.complete ?? null,
      completeAtEnd: dialogueAfter.complete ?? null,
      animations: stageAnimations,
    });

    if (step === args.advances) break;
    const clicked = await page.evaluate(clickNeoDialogue);
    if (!clicked) {
      failures.push(`단계 ${step}: 대사 상자를 못 찾았다 — 남은 단계를 못 쟀다.`);
      break;
    }
    if (clicked.typing) {
      // 첫 클릭이 타자기를 끝냈을 뿐이다 — 다음 대사로 넘기려면 한 번 더 누른다.
      await page.waitForTimeout(120);
      await page.evaluate(clickNeoDialogue);
    }
    await page.waitForTimeout(400);
  }
  const trace = tracing ? digestTrace(await stopTracing(cdp)) : null;
  const layers = await snapshotLayerCount(cdp);

  if (stages.length !== args.advances + 1) {
    failures.push(`프롤로그 단계를 ${stages.length}개만 쟀다(${args.advances + 1}개 기대).`);
  }
  /**
   * 🔴 클릭이 안 먹으면 같은 대사를 5번 재고 "네오는 렉이 없다"가 나온다 — 그 위양성을 여기서 막는다.
   * 대사가 넘어갔다면 새 대사의 타자기가 그 표본 안에서 돌아 글자 수가 늘어난다.
   */
  if (stages.length > 1 && !stages.some((s) => (s.typed ?? 0) > 0)) {
    failures.push("타자기가 한 단계도 안 돌았다 — 진행 클릭이 안 먹었을 가능성이 크다(표본이 같은 대사의 반복).");
  }
  return { failures, stages, trace, layers, animations, network: network.summary() };
}

/** 구간 B — 타로 앨범 스크롤. */
async function measureAlbum(page, cdp, origin, { tracing, network }) {
  const failures = [];
  await gotoRoute(page, origin);
  network.reset();

  try {
    await waitForHydrated(page, '[class*="honeyAlbumButton"]', BOOT_TIMEOUT_MS);
    await page.click('[class*="honeyAlbumButton"]');
    await page.waitForSelector(ALBUM_SELECTOR, { timeout: BOOT_TIMEOUT_MS });
  } catch (error) {
    return { failures: [`타로 앨범을 열지 못했다 — ${error.message.split("\n")[0]}`], scrolls: [] };
  }
  await page.waitForTimeout(2000);

  const census = await page.evaluate(censusAlbum);
  if (!census.present) return { failures: ["앨범 다이얼로그가 사라졌다 — 잴 대상이 없다."], scrolls: [] };
  if (!census.cards) failures.push(`앨범에 카드가 0장이다(이미지 ${census.images}개) — 표본 없이 통과시키지 않는다.`);

  const animations = args.dumpAnimations ? await page.evaluate(censusAnimations) : null;
  if (tracing) await startTracing(cdp);
  const before = await readMetrics(cdp);
  await page.evaluate(() => window.__routePerf.start());
  const scrolls = [];
  for (let i = 0; i < ALBUM_SCROLLS; i += 1) {
    const moved = await page.evaluate(scrollAlbum, ALBUM_SCROLL_PX);
    scrolls.push(moved);
    await page.waitForTimeout(ALBUM_SCROLL_GAP_MS);
  }
  const raw = await page.evaluate(() => window.__routePerf.stop());
  const metrics = metricsDelta(before, await readMetrics(cdp));
  const trace = tracing ? digestTrace(await stopTracing(cdp)) : null;
  const layers = await snapshotLayerCount(cdp);

  if (raw.visibilityState !== "visible") failures.push(`visibilityState=${raw.visibilityState} — 표본이 무효다.`);
  if (!raw.frames.length) failures.push("rAF 프레임을 하나도 못 모았다 — 표본 0건은 \"이상 없음\"이 아니다.");
  const advanced = scrolls.filter((s) => s && s.after > s.before).length;
  if (advanced === 0) failures.push(`스크롤이 한 번도 안 먹었다(시도 ${ALBUM_SCROLLS}회) — 스크롤 컨테이너를 잘못 잡았다.`);

  return {
    failures,
    census,
    scrolls,
    scrollsAdvanced: advanced,
    frames: frameStats(raw.frames),
    longTasks: { count: raw.longTasks.length, ms: raw.longTasks.reduce((s, d) => s + d, 0), supported: raw.longTaskSupported },
    metrics,
    nodes: raw.nodes,
    trace,
    layers,
    animations,
    network: network.summary(),
  };
}

/* ───────────────────────────── 실행 ───────────────────────────── */

async function main() {
  resolveRouteShell();

  let chromium;
  try {
    ({ chromium } = await import("@playwright/test"));
  } catch (error) {
    console.error("playwright 를 불러올 수 없습니다 — devDependency 설치가 필요합니다.");
    console.error(error.message);
    process.exit(1);
  }

  const server = await startStaticServer();
  const origin = `http://127.0.0.1:${server.address().port}`;
  console.log(
    `[app-route-perf] ${args.route} · runs ${args.runs} · segments ${args.segments.join(",")} · passes ${args.passes.join(",")} · ` +
      `${VIEWPORT.width}x${VIEWPORT.height}@${DPR} · CPU ${args.cpu}x · ${args.net === "slow4g" ? "Slow4G" : "네트워크 스로틀 없음"} · label ${args.label}`,
  );

  const collected = Object.fromEntries(args.segments.map((segment) => [segment, { frames: [], pipeline: [] }]));
  const failures = [];

  /**
   * 🔴 `channel: "chromium"` 을 반드시 준다. Playwright 1.49+ 의 기본 `headless: true` 는
   * **합성기가 없는 `chromium_headless_shell`** 을 띄우고, 거기서는 rAF 가 고정 주기로 돌아
   * 프레임이 **절대 떨어지지 않는다**(2026-08-30 실측: CPU 4x · RecalcStyle 581ms 인데
   * 최악 프레임 16.8ms — 물리적으로 불가능한 값). 그 상태로 재면 "렉 없음"이 나온다.
   */
  const browser = await chromium.launch({
    channel: "chromium",
    headless: !args.headed,
    args: ["--disable-background-networking", "--disable-default-apps", "--disable-sync", "--mute-audio", "--metrics-recording-only"],
  });

  try {
    for (const pass of args.passes) {
      for (let run = 1; run <= args.runs; run += 1) {
        for (const segment of args.segments) {
          process.stdout.write(`[app-route-perf] ${pass} · ${segment} · run ${run}/${args.runs} ... `);
          const context = await browser.newContext({
            viewport: VIEWPORT,
            deviceScaleFactor: DPR,
            isMobile: true,
            hasTouch: true,
            userAgent: UA,
          });
          await context.addInitScript(installSampler);
          const page = await context.newPage();
          const cdp = await context.newCDPSession(page);
          await cdp.send("DOM.enable");
          await cdp.send("CSS.enable");
          await cdp.send("Performance.enable");
          await cdp.send("Network.enable");
          await cdp.send("Emulation.setCPUThrottlingRate", { rate: args.cpu });
          if (args.net === "slow4g") await cdp.send("Network.emulateNetworkConditions", NET);
          const external = [];
          await blockExternal(page, external);
          const network = attachNetworkRecorder(cdp);
          // 🔴 규칙 추적은 navigate 앞에서만 의미가 있고, recalc 시간을 부풀린다 → pipeline 패스 전용.
          if (pass === "pipeline") await cdp.send("CSS.startRuleUsageTracking");

          let result;
          try {
            const measure =
              segment === "entry" ? measureEntry : segment === "neo-prologue" ? measureNeoPrologue : measureAlbum;
            result = await measure(page, cdp, origin, { tracing: pass === "pipeline", network });
          } catch (error) {
            result = { failures: [`측정 중 예외 — ${error.message.split("\n")[0]}`] };
          }

          if (pass === "pipeline") {
            const usage = await cdp.send("CSS.stopRuleUsageTracking").catch(() => ({ ruleUsage: [] }));
            const rules = usage.ruleUsage || [];
            result.rules = { total: rules.length, used: rules.filter((r) => r.used).length };
          }
          result.external = summarizeExternal(external);

          for (const failure of result.failures || []) failures.push(`${pass}/${segment}/run${run}: ${failure}`);
          collected[segment][pass].push(result);
          console.log(summarizeLine(segment, result));
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  const report = buildReport(collected);
  printReport(report);

  const outDir = args.out || path.join(os.tmpdir(), "code-destiny-perf");
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, `app-route-perf-${args.label}.json`);
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      { label: args.label, route: args.route, runs: args.runs, passes: args.passes, cpuThrottle: args.cpu, net: args.net, viewport: VIEWPORT, dpr: DPR, report, raw: collected },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`\n[app-route-perf] wrote ${jsonPath}`);

  if (failures.length) {
    console.error("\n측정이 온전하지 않다:");
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
}

function summarizeExternal(requests) {
  const byHost = new Map();
  for (const item of requests) {
    const slot = byHost.get(item.host) || { count: 0, types: new Set() };
    slot.count += 1;
    slot.types.add(item.type);
    byHost.set(item.host, slot);
  }
  return {
    total: requests.length,
    stubbed: requests.filter((i) => i.stubbed).length,
    byHost: [...byHost].map(([host, v]) => ({ host, count: v.count, types: [...v.types].sort() })).sort((a, b) => b.count - a.count),
    audio: requests.filter((i) => /\.(mp3|m4a|ogg|wav)(\?|$)/i.test(i.url)).map((i) => i.url.replace(/^https?:\/\//, "")),
  };
}

function summarizeLine(segment, result) {
  if (result.failures && result.failures.length) return `실패 (${result.failures[0]})`;
  if (segment !== "album") {
    const all = result.stages.flatMap((s) => [s.frames.p95]);
    return `단계 ${result.stages.length}개 · p95 ${fmt(median(all), 1)}ms · 레이어 ${result.layers ?? "-"}`;
  }
  return `카드 ${result.census.cards} · p95 ${fmt(result.frames.p95, 1)}ms · jank ${fmt(result.frames.jankRatio, 1)}% · 레이어 ${result.layers ?? "-"}`;
}

function fmt(value, digits = 0) {
  return Number.isFinite(value) ? value.toFixed(digits) : "-";
}

/* ───────────────────────────── 집계·출력 ───────────────────────────── */

function buildReport(collected) {
  const report = {};
  for (const segment of args.segments) {
    const framePass = collected[segment].frames;
    const good = framePass.filter((r) => !(r.failures && r.failures.length));
    if (!good.length) {
      report[segment] = { runs: 0 };
      continue;
    }
    // 🔴 neo-prologue 는 entry 와 같은 stages 모양을 돌려주므로 집계기를 공유한다.
    const perRun = good.map((r) => (segment === "album" ? aggregateAlbumRun(r) : aggregateEntryRun(r)));
    report[segment] = {
      runs: good.length,
      p50: band(perRun.map((r) => r.p50)),
      p95: band(perRun.map((r) => r.p95)),
      maxFrame: band(perRun.map((r) => r.max)),
      jankRatio: band(perRun.map((r) => r.jankRatio)),
      dropped: band(perRun.map((r) => r.dropped)),
      droppedPerSec: band(perRun.map((r) => r.droppedPerSec)),
      longTaskMs: band(perRun.map((r) => r.longTaskMs)),
      recalcMs: band(perRun.map((r) => r.recalcMs)),
      layoutMs: band(perRun.map((r) => r.layoutMs)),
      scriptMs: band(perRun.map((r) => r.scriptMs)),
      taskMs: band(perRun.map((r) => r.taskMs)),
      nodes: band(perRun.map((r) => r.nodes)),
      layers: band(good.map((r) => r.layers)),
      networkBytes: band(good.map((r) => r.network?.bytes)),
      audioBytes: band(good.map((r) => r.network?.audio?.bytes)),
    };
    if (segment === "album") {
      report[segment].cards = band(good.map((r) => r.census.cards));
      report[segment].albumNodes = band(good.map((r) => r.census.nodes));
    }
    // 외부 요청은 run 마다 같아야 정상이라 마지막 run 의 내역을 그대로 싣는다(밴드가 아니라 목록이 정보다).
    report[segment].external = good[good.length - 1].external;
    report[segment].animations = good[good.length - 1].animations || null;
    // 단계마다 연출이 갈리는 구간(neo-prologue)에서는 단계별 조사가 판정 근거다. run 마다 같아야 정상이라 마지막 run 을 싣는다.
    const lastStages = good[good.length - 1].stages;
    if (lastStages && lastStages.some((s) => s.animations)) {
      report[segment].stageAnimations = lastStages.map((s) => ({
        step: s.step,
        stage: s.stage,
        jankRatio: s.frames.jankRatio,
        dropped: s.frames.dropped,
        running: (s.animations || []).reduce((sum, a) => sum + a.running, 0),
        names: (s.animations || []).filter((a) => a.running > 0).map((a) => `${a.name.replace(/^.*?_([A-Za-z0-9]+)__.*$/, "$1")}×${a.running}${a.infinite ? "∞" : ""}`),
      }));
    }
    report[segment].externalCount = band(good.map((r) => r.external?.total));
    const pipeline = collected[segment].pipeline.filter((r) => !(r.failures && r.failures.length));
    if (pipeline.length) {
      report[segment].pipeline = summarizePipeline(pipeline);
      report[segment].rules = {
        total: band(pipeline.map((r) => r.rules?.total)),
        used: band(pipeline.map((r) => r.rules?.used)),
      };
    }
  }
  return report;
}

function aggregateEntryRun(run) {
  const frames = run.stages.flatMap((s) => s.frames);
  const sum = (pick) => run.stages.reduce((acc, s) => acc + (pick(s) || 0), 0);
  return {
    p50: median(frames.map((f) => f.p50)),
    p95: median(frames.map((f) => f.p95)),
    max: Math.max(...frames.map((f) => f.max)),
    jankRatio: median(frames.map((f) => f.jankRatio)),
    dropped: frames.reduce((acc, f) => acc + f.dropped, 0),
    droppedPerSec: median(frames.map((f) => f.droppedPerSec)),
    longTaskMs: sum((s) => s.longTasks.ms),
    recalcMs: sum((s) => s.metrics.RecalcStyleDuration) * 1000,
    layoutMs: sum((s) => s.metrics.LayoutDuration) * 1000,
    scriptMs: sum((s) => s.metrics.ScriptDuration) * 1000,
    taskMs: sum((s) => s.metrics.TaskDuration) * 1000,
    nodes: run.stages[run.stages.length - 1].nodes,
  };
}

function aggregateAlbumRun(run) {
  return {
    p50: run.frames.p50,
    p95: run.frames.p95,
    max: run.frames.max,
    jankRatio: run.frames.jankRatio,
    dropped: run.frames.dropped,
    droppedPerSec: run.frames.droppedPerSec,
    longTaskMs: run.longTasks.ms,
    recalcMs: run.metrics.RecalcStyleDuration * 1000,
    layoutMs: run.metrics.LayoutDuration * 1000,
    scriptMs: run.metrics.ScriptDuration * 1000,
    taskMs: run.metrics.TaskDuration * 1000,
    nodes: run.nodes,
  };
}

function summarizePipeline(runs) {
  const out = {};
  for (const name of [...RENDER_EVENTS, ...WRAPPER_EVENTS]) {
    out[name] = band(runs.map((r) => r.trace?.render?.[name]?.ms ?? r.trace?.wrapper?.[name]?.ms));
  }
  out.renderTotalMs = band(runs.map((r) => r.trace?.renderMs));
  return out;
}

function printReport(report) {
  for (const segment of args.segments) {
    const data = report[segment];
    const title =
      segment === "entry"
        ? "A. 입장 스토리 (5단계 × 3초)"
        : segment === "neo-prologue"
          ? "C. 네오 작전실 프롤로그 (5단계 × 3초)"
          : `B. 타로 앨범 (스크롤 ${ALBUM_SCROLLS}회 × ${ALBUM_SCROLL_PX}px)`;
    console.log(`\n── ${title} · frames 패스 ${data.runs ?? 0}회 중앙값 (밴드 min–max) ──`);
    if (!data.runs) {
      console.log("  표본 없음");
      continue;
    }
    const line = (label, stat, digits = 1, unit = "") =>
      console.log(`  ${label.padEnd(26)} ${fmt(stat.median, digits).padStart(9)}${unit}   (${fmt(stat.min, digits)}–${fmt(stat.max, digits)})`);
    line("프레임 간격 p50", data.p50, 1, "ms");
    line("프레임 간격 p95", data.p95, 1, "ms");
    line("최악 프레임", data.maxFrame, 1, "ms");
    line(`끊긴 프레임 비율(>${JANK_MS.toFixed(1)}ms)`, data.jankRatio, 1, "%");
    line("놓친 vsync 총", data.dropped, 0, "회");
    line("  초당", data.droppedPerSec, 2, "회/s");
    line("long task 합", data.longTaskMs, 0, "ms");
    console.log("");
    line("RecalcStyle", data.recalcMs, 0, "ms");
    line("Layout", data.layoutMs, 0, "ms");
    line("Script", data.scriptMs, 0, "ms");
    line("Task(메인스레드 총)", data.taskMs, 0, "ms");
    console.log("");
    line("DOM 노드", data.nodes, 0, "개");
    line("합성 레이어", data.layers, 0, "개");
    line("네트워크 전송", { median: data.networkBytes.median / 1024, min: data.networkBytes.min / 1024, max: data.networkBytes.max / 1024 }, 0, "KB");
    line("  그중 오디오", { median: data.audioBytes.median / 1024, min: data.audioBytes.min / 1024, max: data.audioBytes.max / 1024 }, 0, "KB");
    if (data.cards) line("앨범 카드", data.cards, 0, "장");
    if (data.albumNodes) line("앨범 DOM 노드", data.albumNodes, 0, "개");

    if (data.animations) {
      const running = data.animations.reduce((s, a) => s + a.running, 0);
      console.log(`\n  ── 측정 직전 실행 중인 CSS 애니메이션 · ${data.animations.length}종 ${running}개 ──`);
      for (const anim of data.animations) {
        const mark = anim.infinite ? "∞" : " ";
        console.log(`    ${String(anim.running).padStart(4)}개 ${mark} ${anim.name.padEnd(22)} ${anim.sample}`);
      }
    }

    if (data.stageAnimations) {
      console.log(`\n  ── 단계별 장면·실행 중 애니메이션·끊긴 프레임 ──`);
      for (const s of data.stageAnimations) {
        console.log(
          `    ${String(s.step).padStart(2)}. ${String(s.stage || "-").padEnd(22)}`
          + ` 애니 ${String(s.running).padStart(3)}개  끊김 ${fmt(s.jankRatio, 1).padStart(5)}%  놓침 ${String(s.dropped).padStart(3)}회`
          + `  ${s.names.join(" ")}`,
        );
      }
    }

    if (data.external) {
      console.log(`\n  ── 외부 출처 요청 (차단하고 세기만 한다) · 총 ${data.external.total}건 ──`);
      if (data.external.stubbed) console.log(`    ↳ 그중 ${data.external.stubbed}건은 꿀방울 잔량 스텁으로 응답(앨범 잠금 해제용, 하네스 전용)`);
      for (const host of data.external.byHost) console.log(`    ${String(host.count).padStart(4)}건  ${host.host}  [${host.types.join(",")}]`);
      for (const url of data.external.audio) console.log(`    🔊 ${url}`);
      if (!data.external.audio.length) console.log("    🔊 오디오 요청 없음");
    }

    if (data.pipeline) {
      console.log(`\n  ── pipeline 패스 (Tracing ON · 🔴 절대값을 위 표와 비교하지 말 것) ──`);
      for (const name of RENDER_EVENTS) line(`  ${name}`, data.pipeline[name], 1, "ms");
      line("  렌더 합계", data.pipeline.renderTotalMs, 1, "ms");
      if (data.rules) {
        line("  CSS 규칙(추적)", data.rules.total, 0, "개");
        line("  그중 매칭", data.rules.used, 0, "개");
      }
    }
  }
}

await main();

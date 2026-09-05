/**
 * 결제 선택창(`.cd-direct-payment-modal`)이 **떠 있는 동안**의 프레임 비용을 잰다.
 *
 * 왜 따로 필요한가 — 기존 하네스로는 이 구간을 못 잰다:
 *   - `perf:home`(Lighthouse)·`perf:interaction` 은 홈 화면만 본다. 결제창을 열지 않는다.
 *   - `perf:app-route` 는 `--segments` 가 entry|album|neo-prologue 로 화이트리스트 고정이다.
 *   - 사용자가 지목한 렉 구간은 "결제창이 떠 있는 동안의 스크롤·hover" 라서
 *     로딩 지표(LCP·TBT)가 아니라 **창이 열린 뒤 매 프레임 드는 비용**이 측정 대상이다.
 *
 * 🔴 이 하네스는 결제를 실행하지 않는다 — 렌더러를 직접 불러 창만 띄우고, 카드는 한 번도
 *    클릭하지 않는다. PortOne/PG 요청 0회, 서버 결제 왕복 0회다(CLAUDE.md 절대 규칙 2).
 *    창을 여는 경로 자체가 서버를 부르지 않는다(잔량 조회는 2026-08-12 에 제거됐고,
 *    이용권 판정은 카드를 눌렀을 때만 돈다 — index.html refreshDirectEntitlementStatus).
 *
 * 측정하는 것 (창이 열린 상태에서 3구간)
 *   ① idle      — 아무것도 안 할 때. 무한 CSS 애니메이션이 프레임을 얼마나 먹는가.
 *   ② scroll    — 다이얼로그 스크롤 왕복. 부모 blur 레이어 재합성 비용이 여기서 드러난다.
 *   ③ hover     — 카드 hover 순회. transition 프로퍼티가 리페인트를 부르는가.
 *
 * 구간마다 수집하는 값
 *   - Long Animation Frame(50ms 초과) 개수·최장·blocking 합 (귀속 스크립트 포함)
 *   - CDP `Performance.getMetrics` 델타: LayoutCount·RecalcStyleCount·LayoutDuration·RecalcStyleDuration
 *   - rAF 타임스탬프로 낸 프레임 수·유효 fps·드랍률·최악 프레임 간격
 *
 * 🔴 이름이 `perf:*` 인 이유: `verify:*` 는 verify-guard-wiring 의 CI 배선 의무가 붙는데
 *    사용자 지시로 새 CI 게이트를 만들지 않기로 했다(measure-home-interaction.mjs 와 같은 이유).
 *
 * 🔴 네트워크 스로틀은 걸지 않는다 — 측정 창이 "이미 열린 모달"이고 그 구간의 네트워크 요청이
 *    0회라 결과를 바꾸지 않는다. 걸면 부팅 시간만 늘어 회차 간 분산이 커진다.
 *
 * 사용:
 *   npm run build
 *   npm run perf:checkout-modal -- --label=baseline
 *   npm run perf:checkout-modal -- --label=after --compare=baseline
 */
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(repoRoot, "dist");
const COMPRESSIBLE = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg", ".xml", ".txt"]);
const encodedCache = new Map();

const VIEWPORT = { width: 390, height: 844 };
const DPR = 3;
const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

/**
 * 결제창을 띄울 때 넘기는 값. 카드 3장이 **전부 활성**인 가장 무거운 형상을 만든다.
 * - `monthlyBalance` 를 넉넉히 줘 월정석 카드가 회색(is-disabled)이 아니라 활성으로 그려지게 한다
 *   (필요 월정석 = coinPrice * 10 = 300).
 * - 이용권 카드는 항상 활성(`pass-store`)이라 별도 값이 필요 없다.
 * 🔴 값은 화면에 그려질 뿐 서버로 나가지 않는다.
 */
const MODAL_FIXTURE = {
  title: "결제창 렌더 측정",
  coinPrice: 30,
  amountKrw: 3000,
  featureKey: "perf-checkout-modal",
  monthlyBalance: 1000,
};

const args = parseArgs(process.argv.slice(2));

await main();

async function main() {
  assertDistFresh();

  const server = await startStaticServer();
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/`;

  let result;
  try {
    result = await measure(url);
  } finally {
    server.close();
  }

  report(result);
}

/* ───────────────────────────── dist 신선도 (fail-closed) ───────────────────────────── */

/**
 * 🔴 "dist 가 있으면 쓴다" 로 두지 말 것 — verify:mobile-cdp-smoke 가 그 형태였다가 소스를 고쳐도
 * 옛 산출물을 재며 조용히 통과했다(docs/guard-integrity-2026-08-13.md 의 G-8).
 *
 * 이 하네스가 재는 CSS 정본은 `js/core/checkout-entry.js` 하나이고 셸은 `index.html` 이다.
 * 둘 중 하나라도 dist 산출물보다 새로우면 측정값은 기준선이 아니다.
 */
function assertDistFresh() {
  const pairs = [
    ["index.html", path.join("dist", "index.html")],
    [path.join("js", "core", "checkout-entry.js"), path.join("dist", "js", "core", "checkout-entry.js")],
  ];
  for (const [src, built] of pairs) {
    const srcPath = path.join(repoRoot, src);
    const builtPath = path.join(repoRoot, built);
    if (!fs.existsSync(builtPath)) {
      console.error(`[checkout-modal-perf] ${built} 이 없다 — 먼저 \`npm run build\` 로 dist/ 를 만들 것.`);
      process.exit(1);
    }
    if (fs.statSync(srcPath).mtimeMs > fs.statSync(builtPath).mtimeMs) {
      console.error(`[checkout-modal-perf] dist 가 낡았다 — ${src} 가 ${built} 보다 새롭다. \`npm run build\` 를 다시 돌릴 것.`);
      process.exit(1);
    }
  }
}

/* ───────────────────────────── 측정 ───────────────────────────── */

async function measure(url) {
  const browser = await chromium.launch({ headless: !args.headed, args: ["--disable-dev-shm-usage"] });
  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: DPR,
      isMobile: true,
      hasTouch: true,
      userAgent: MOBILE_UA,
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: args.cpu });
    await cdp.send("Performance.enable");

    // 🔴 관찰자는 문서보다 먼저 설치한다. 로드 뒤에 붙이면 이미 지나간 프레임을 못 본다.
    // rAF 샘플러는 **구간 안에서만** 돌린다 — 상시 루프는 부팅 타이밍을 바꾼다.
    await page.addInitScript(() => {
      window.__cdModalPerf = { loaf: [], frames: [], raf: 0 };
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            window.__cdModalPerf.loaf.push({
              startTime: e.startTime,
              duration: e.duration,
              blockingDuration: e.blockingDuration,
              // 무엇이 프레임을 밀었는지까지 남긴다 — 숫자만으로는 고칠 수 없다.
              scripts: Array.from(e.scripts || []).slice(0, 3).map((s) => ({
                name: s.sourceFunctionName || s.invoker || s.sourceURL || "(익명)",
                duration: Math.round(s.duration),
              })),
              styleAndLayoutDuration: e.styleAndLayoutDuration,
              renderStart: e.renderStart,
            });
          }
        }).observe({ type: "long-animation-frame", buffered: true });
      } catch {}
      window.__cdModalPerfStart = function () {
        window.__cdModalPerf.frames = [];
        const tick = (ts) => {
          window.__cdModalPerf.frames.push(ts);
          window.__cdModalPerf.raf = requestAnimationFrame(tick);
        };
        window.__cdModalPerf.raf = requestAnimationFrame(tick);
      };
      window.__cdModalPerfStop = function () {
        if (window.__cdModalPerf.raf) cancelAnimationFrame(window.__cdModalPerf.raf);
        window.__cdModalPerf.raf = 0;
        return window.__cdModalPerf.frames.slice();
      };
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForFunction(
      () => typeof window._cdChooseServicePaymentMode === "function" && !!window.__cdCheckoutEntry,
      null,
      { timeout: 90000 },
    );
    // 부팅 잔여 작업이 빠져나갈 때까지 기다린다 — 안 그러면 idle 구간이 부팅 롱태스크를 줍는다.
    await page.waitForTimeout(args.settle);

    /**
     * 🔴 결제창을 여는 유일한 지점. 렌더러가 돌려주는 프라미스는 "사용자가 골랐을 때" 풀리므로
     *    await 하지 않는다. 카드는 끝까지 클릭하지 않는다 → 결제 실행 경로 진입 0회.
     */
    const openedAt = Date.now();
    await page.evaluate((fixture) => {
      window.__cdModalPerfChoice = window._cdChooseServicePaymentMode(fixture);
    }, MODAL_FIXTURE);
    await page.waitForSelector(".cd-direct-payment-modal.is-open .cd-direct-payment-dialog", { timeout: 20000 });
    const openMs = Date.now() - openedAt;

    const cards = await page.$$eval(".cd-direct-payment-option", (nodes) =>
      nodes.map((n) => (n.getAttribute("data-mode") || "(no-mode)") + (n.hasAttribute("disabled") ? "[disabled]" : "")),
    );
    if (!cards.length) throw new Error("결제창은 떴는데 카드가 0장이다 — 픽스처가 세 카드를 다 끄고 있다.");

    // 스크롤 대상: 다이얼로그가 넘치면 다이얼로그, 아니면 모달 자신이 스크롤러다(둘 다 overflow:auto).
    const scroller = await page.evaluate(() => {
      const pick = (sel) => {
        const el = document.querySelector(sel);
        return el && el.scrollHeight - el.clientHeight > 8 ? { sel, range: el.scrollHeight - el.clientHeight } : null;
      };
      return pick(".cd-direct-payment-dialog") || pick(".cd-direct-payment-modal.is-open") || null;
    });

    const phases = [];
    phases.push(await runPhase(page, cdp, "idle", async () => {
      await page.waitForTimeout(args.idle);
    }));
    phases.push(await runPhase(page, cdp, "scroll", async () => {
      if (!scroller) return;
      for (const target of scrollPlan(scroller.range, args.scrollSteps)) {
        await page.evaluate(({ sel, top }) => {
          const el = document.querySelector(sel);
          if (el) el.scrollTop = top;
        }, { sel: scroller.sel, top: target });
        await page.waitForTimeout(args.step);
      }
    }));
    phases.push(await runPhase(page, cdp, "hover", async () => {
      const boxes = await page.$$(".cd-direct-payment-option");
      for (let pass = 0; pass < args.hoverPasses; pass += 1) {
        for (const handle of boxes) {
          const box = await handle.boundingBox();
          if (!box) continue;
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.waitForTimeout(args.step);
        }
      }
    }));

    return { url, openMs, cards, scroller, phases };
  } finally {
    await browser.close();
  }
}

/**
 * 한 구간을 재고 델타를 낸다.
 * - LoAF 는 누적 배열이라 구간 시작 시각으로 잘라 쓴다(관찰자를 껐다 켜면 buffered 엔트리를 잃는다).
 * - Performance.getMetrics 는 누적 카운터라 앞뒤 차이를 쓴다.
 */
async function runPhase(page, cdp, name, body) {
  const before = await readMetrics(cdp);
  const startedAt = await page.evaluate(() => {
    window.__cdModalPerfStart();
    return performance.now();
  });
  await body();
  const { frames, endedAt } = await page.evaluate(() => ({
    frames: window.__cdModalPerfStop(),
    endedAt: performance.now(),
  }));
  const after = await readMetrics(cdp);
  const loaf = await page.evaluate(
    ({ from, to }) => window.__cdModalPerf.loaf.filter((e) => e.startTime >= from && e.startTime <= to),
    { from: startedAt, to: endedAt },
  );

  const wallMs = endedAt - startedAt;
  return {
    name,
    wallMs: Math.round(wallMs),
    frames: frameStats(frames, wallMs),
    loaf: {
      count: loaf.length,
      worstMs: loaf.length ? Math.round(Math.max(...loaf.map((e) => e.duration))) : 0,
      blockingTotalMs: Math.round(loaf.reduce((sum, e) => sum + (e.blockingDuration || 0), 0)),
      styleAndLayoutMs: Math.round(loaf.reduce((sum, e) => sum + (e.styleAndLayoutDuration || 0), 0)),
      top: loaf
        .slice()
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 3)
        .map((e) => ({ durationMs: Math.round(e.duration), scripts: e.scripts })),
    },
    renderer: {
      layoutCount: after.LayoutCount - before.LayoutCount,
      recalcStyleCount: after.RecalcStyleCount - before.RecalcStyleCount,
      layoutMs: round1((after.LayoutDuration - before.LayoutDuration) * 1000),
      recalcStyleMs: round1((after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000),
      taskMs: round1((after.TaskDuration - before.TaskDuration) * 1000),
    },
  };
}

async function readMetrics(cdp) {
  const { metrics } = await cdp.send("Performance.getMetrics");
  const out = {};
  for (const m of metrics) out[m.name] = m.value;
  for (const key of ["LayoutCount", "RecalcStyleCount", "LayoutDuration", "RecalcStyleDuration", "TaskDuration"]) {
    if (!(key in out)) out[key] = 0;
  }
  return out;
}

/**
 * rAF 타임스탬프 → 프레임 통계.
 * 드랍률은 "60fps 였다면 나왔을 프레임 수" 대비 실제 프레임 수로 낸다.
 */
function frameStats(timestamps, wallMs) {
  if (timestamps.length < 2) return { count: timestamps.length, fps: 0, dropRate: 1, worstGapMs: 0 };
  const gaps = [];
  for (let i = 1; i < timestamps.length; i += 1) gaps.push(timestamps[i] - timestamps[i - 1]);
  const span = timestamps[timestamps.length - 1] - timestamps[0];
  const expected = Math.max(1, Math.round(wallMs / (1000 / 60)));
  return {
    count: timestamps.length,
    fps: span > 0 ? round1(((timestamps.length - 1) / span) * 1000) : 0,
    dropRate: round1(Math.max(0, 1 - timestamps.length / expected) * 100) / 100,
    worstGapMs: Math.round(Math.max(...gaps)),
  };
}

/** 아래로 끝까지 → 다시 위로. 왕복이라야 스크롤 방향별 재합성 비용을 둘 다 본다. */
function scrollPlan(range, steps) {
  const plan = [];
  for (let i = 1; i <= steps; i += 1) plan.push(Math.round((range * i) / steps));
  for (let i = steps - 1; i >= 0; i -= 1) plan.push(Math.round((range * i) / steps));
  return plan;
}

/* ───────────────────────────── 보고 ───────────────────────────── */

function report(result) {
  const outDir = args.out || path.join(os.tmpdir(), "code-destiny-perf");
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, `checkout-modal-${args.label}.json`);
  const payload = {
    label: args.label,
    measuredAt: new Date().toISOString(),
    env: { viewport: VIEWPORT, dpr: DPR, cpuThrottle: args.cpu, idleMs: args.idle, scrollSteps: args.scrollSteps },
    ...result,
  };
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");

  const lines = [];
  lines.push(`[checkout-modal-perf] label=${args.label} · ${VIEWPORT.width}x${VIEWPORT.height}@${DPR} · CPU ${args.cpu}x`);
  lines.push(`  결제창 오픈: ${result.openMs}ms · 카드 ${result.cards.length}장 [${result.cards.join(", ")}]`);
  lines.push(`  스크롤러: ${result.scroller ? `${result.scroller.sel} (범위 ${result.scroller.range}px)` : "없음 — 넘치지 않는다"}`);
  lines.push("");
  lines.push("  구간      fps   드랍률  최악프레임  LoAF(50ms+)  최장   Layout  Recalc  Layout(ms) Recalc(ms)");
  for (const p of result.phases) {
    lines.push(
      `  ${p.name.padEnd(8)} ${String(p.frames.fps).padStart(5)} ${String(`${Math.round(p.frames.dropRate * 100)}%`).padStart(7)} ` +
        `${String(`${p.frames.worstGapMs}ms`).padStart(11)} ${String(p.loaf.count).padStart(12)} ${String(`${p.loaf.worstMs}ms`).padStart(6)} ` +
        `${String(p.renderer.layoutCount).padStart(7)} ${String(p.renderer.recalcStyleCount).padStart(7)} ` +
        `${String(p.renderer.layoutMs).padStart(10)} ${String(p.renderer.recalcStyleMs).padStart(10)}`,
    );
  }
  for (const p of result.phases) {
    for (const hit of p.loaf.top) {
      lines.push(`    · ${p.name} LoAF ${hit.durationMs}ms ← ${hit.scripts.map((s) => `${s.name}(${s.duration}ms)`).join(", ") || "스크립트 귀속 없음(스타일·레이아웃)"}`);
    }
  }
  lines.push("");
  lines.push(`  JSON: ${jsonPath}`);

  if (args.compare) {
    const basePath = path.join(outDir, `checkout-modal-${args.compare}.json`);
    if (!fs.existsSync(basePath)) {
      lines.push(`  ⚠ 비교 대상 없음: ${basePath}`);
    } else {
      const base = JSON.parse(fs.readFileSync(basePath, "utf8"));
      lines.push(`  ── ${args.compare} → ${args.label} 대조 ──`);
      for (const p of result.phases) {
        const b = (base.phases || []).find((x) => x.name === p.name);
        if (!b) continue;
        lines.push(
          `  ${p.name.padEnd(8)} fps ${b.frames.fps}→${p.frames.fps} · LoAF ${b.loaf.count}→${p.loaf.count} · ` +
            `Layout ${b.renderer.layoutCount}→${p.renderer.layoutCount} · Recalc ${b.renderer.recalcStyleCount}→${p.renderer.recalcStyleCount} · ` +
            `Layout ${b.renderer.layoutMs}→${p.renderer.layoutMs}ms · Recalc ${b.renderer.recalcStyleMs}→${p.renderer.recalcStyleMs}ms`,
        );
      }
    }
  }

  console.log(lines.join("\n"));
}

/* ───────────────────────────── 인프라 ───────────────────────────── */

function parseArgs(argv) {
  const get = (name, fallback) => {
    const hit = argv.find((arg) => arg.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
  };
  return {
    label: get("label", "run"),
    compare: get("compare", ""),
    cpu: Math.max(1, parseInt(get("cpu", "4"), 10)),
    settle: Math.max(0, parseInt(get("settle", "6000"), 10)),
    idle: Math.max(500, parseInt(get("idle", "3000"), 10)),
    scrollSteps: Math.max(1, parseInt(get("scroll-steps", "8"), 10)),
    hoverPasses: Math.max(1, parseInt(get("hover-passes", "3"), 10)),
    step: Math.max(16, parseInt(get("step", "120"), 10)),
    out: get("out", ""),
    headed: argv.includes("--headed"),
  };
}

function startStaticServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    let filePath = path.join(distRoot, urlPath);
    if (urlPath.endsWith("/")) filePath = path.join(filePath, "index.html");
    if (!filePath.startsWith(distRoot)) {
      res.writeHead(403).end();
      return;
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      const indexed = path.join(filePath, "index.html");
      if (fs.existsSync(indexed)) filePath = indexed;
      else {
        res.writeHead(404).end();
        return;
      }
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = { "content-type": contentType(ext), "cache-control": ext === ".html" ? "no-store" : "public, max-age=3600" };
    if (COMPRESSIBLE.has(ext) && String(req.headers["accept-encoding"] || "").includes("br")) {
      let encoded = encodedCache.get(filePath);
      if (!encoded) {
        encoded = zlib.brotliCompressSync(fs.readFileSync(filePath));
        encodedCache.set(filePath, encoded);
      }
      res.writeHead(200, { ...headers, "content-encoding": "br" }).end(encoded);
      return;
    }
    res.writeHead(200, headers).end(fs.readFileSync(filePath));
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function contentType(ext) {
  const map = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
    ".xml": "application/xml",
    ".txt": "text/plain; charset=utf-8",
  };
  return map[ext] || "application/octet-stream";
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

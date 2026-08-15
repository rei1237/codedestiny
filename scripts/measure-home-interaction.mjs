/**
 * 홈의 **체감 성능**을 잰다 — 버튼·입력이 얼마나 빨리 반응하는가, 스크롤이 버벅이는가.
 *
 * 왜 따로 필요한가 — Lighthouse 점수(perf:home)는 로딩만 본다. TBT 는 INP 의 대용이 아니다:
 * TBT 는 "FCP~TTI 사이 롱태스크 합"이라 **부팅이 끝난 뒤의 반응성은 하나도 안 센다.**
 * 사용자가 요구한 것은 "버튼/입력이 즉각 반응한다 · 스크롤이 버벅이지 않는다" 이고,
 * 그건 Event Timing(INP 의 실제 재료)과 Long Animation Frame 으로만 잴 수 있다.
 *
 * 재사용:
 *   - playwright chromium · 모바일 컨텍스트는 scripts/verify-home-visual-parity.mjs 와 동일
 *   - brotli 정적 서버는 scripts/measure-home-lighthouse.mjs 와 같은 방식
 *   - CPU 4배 스로틀은 Lighthouse 모바일 프리셋과 같은 값(CDP Emulation.setCPUThrottlingRate)
 *
 * 측정하는 것
 *   1) 인터랙션 지연 — Event Timing 의 `duration`(입력~다음 페인트). INP 는 이 값들의 상위 백분위다.
 *      입력 지연 / 처리 시간 / 렌더 지연 3단으로 쪼개 어디서 늦는지까지 낸다.
 *   2) 스크롤 버벅임 — 스크롤 중 Long Animation Frame(50ms 초과 프레임) 수와 최장 길이.
 *   3) 인터랙션 중 레이아웃 시프트 — 누르고 나서 생기는 CLS 는 로딩 CLS 와 별개 문제다.
 *
 * 🔴 판정은 perf:home 과 같다 — **min~max 밴드 비겹침**. 인터랙션 지연은 노이즈가 크다.
 * 🔴 이름이 `perf:*` 인 이유: `verify:*` 는 verify-guard-wiring 의 배선 의무가 붙는데
 *    사용자 지시로 CI 에 새 게이트를 만들지 않기로 했다.
 *
 * 사용:
 *   npm run build:cf
 *   npm run perf:interaction -- --runs=3 --label=base
 *   npm run perf:interaction -- --url=https://code-destiny.com --runs=3
 */
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { chromium } from "@playwright/test";

const root = process.cwd();
const staticRoot = fs.existsSync(path.join(root, "dist", "index.html")) ? path.join(root, "dist") : root;
const COMPRESSIBLE = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg", ".xml", ".txt"]);
const encodedCache = new Map();

const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

/**
 * 누를 대상. **화면을 떠나는 것은 넣지 않는다** — 이동해 버리면 그 뒤 측정이 다른 페이지를 잰다.
 * type 이 "type" 이면 키 입력, 아니면 탭.
 */
const TARGETS = [
  { name: "서비스 검색 입력", selector: "#cdServiceSearchInput", type: "type", text: "사주" },
  { name: "탑바 드롭다운", selector: ".cd-nav-group__toggle" },
  { name: "컬렉션 펼치기", selector: ".tarot-collection__header" },
  { name: "모바일 컬렉션 탭", selector: ".cd-mobile-collection-tab" },
  { name: "오늘의 운세 탭", selector: "#cdTodayTabVedic" },
  { name: "푸터 아코디언", selector: ".cd-footer-accordion__toggle, .cd-footer-col__title" },
  { name: "테마 전환", selector: "#themeToggleLabel" },
];

/**
 * 🔴 부팅 중 탭. 필드 INP 가 최악인 요소가 **핸들러가 없는** `#inputPage > header.logo-area`
 * (2,672ms · 2,504ms) 라는 것은, 비용이 처리 시간이 아니라 **입력 대기**(메인스레드 점유)라는 뜻이다.
 * 부팅이 끝난 뒤만 재면(settle) 이 구간이 통째로 안 보인다 — 실제로 로컬 최악은 176ms 였는데
 * 필드는 2,672ms 였다. 그래서 아무 일도 하지 않는 요소를 부팅 도중 여러 시점에 눌러
 * "지금 누르면 몇 ms 만에 답이 오는가"의 바닥값을 잰다.
 */
const EARLY_TAP_SELECTOR = "#inputPage > header.logo-area";
const EARLY_TAP_AT = [800, 1600, 2600, 4000];

const args = parseArgs(process.argv.slice(2));
const server = await startStaticServer();
const port = server.address().port;
const targetUrl = args.url || `http://127.0.0.1:${port}/`;

console.log(`[perf:interaction] target ${targetUrl}`);
console.log(`[perf:interaction] runs ${args.runs} · CPU ${args.cpu}x · label ${args.label}`);

const runs = [];
try {
  for (let i = 0; i < args.runs; i += 1) {
    process.stdout.write(`[perf:interaction] run ${i + 1}/${args.runs} ... `);
    const result = await measureOnce(targetUrl);
    runs.push(result);
    const worst = result.interactions.concat(result.early).reduce((max, it) => Math.max(max, Number(it.duration) || 0), 0);
    console.log(
      `최악 인터랙션 ${Math.round(worst)}ms · 스크롤 롱프레임 ${result.scroll.longFrames}개 · ` +
        `부팅후 시프트 ${result.shiftReport.total.toFixed(3)}`,
    );
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}

report();

/* ───────────────────────────── 측정 ───────────────────────────── */

async function measureOnce(url) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent: MOBILE_UA,
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: args.cpu });

    // 🔴 관찰자는 문서보다 먼저 설치해야 한다. 로드 뒤에 붙이면 이미 지나간 엔트리를 못 본다.
    await page.addInitScript(() => {
      window.__cdPerf = { events: [], loaf: [], shifts: [], marks: [] };
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            window.__cdPerf.events.push({
              name: e.name,
              startTime: e.startTime,
              duration: e.duration,
              processingStart: e.processingStart,
              processingEnd: e.processingEnd,
            });
          }
        }).observe({ type: "event", durationThreshold: 16, buffered: true });
      } catch {}
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            window.__cdPerf.loaf.push({ startTime: e.startTime, duration: e.duration, blockingDuration: e.blockingDuration });
          }
        }).observe({ type: "long-animation-frame", buffered: true });
      } catch {}
      // 🔴 값만 모으면 "0.32 가 났다"까지밖에 못 말한다. 고치려면 **무엇이 밀렸는지**가 있어야 하므로
      //    sources 의 노드를 그 자리에서 사람이 읽을 수 있는 이름으로 굳힌다(나중엔 노드가 사라진다).
      const describe = (node) => {
        if (!node || node.nodeType !== 1) return "(비요소)";
        const id = node.id ? `#${node.id}` : "";
        const cls = String(node.className || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((c) => `.${c}`).join("");
        return `${node.tagName.toLowerCase()}${id}${cls}`;
      };
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            if (e.hadRecentInput) continue;
            window.__cdPerf.shifts.push({
              startTime: e.startTime,
              value: e.value,
              sources: Array.from(e.sources || []).slice(0, 3).map((s) => describe(s.node)),
            });
          }
        }).observe({ type: "layout-shift", buffered: true });
      } catch {}
    });

    // 🔴 goto 를 기다리면 부팅 초반을 이미 놓친다. commit 직후부터 시계를 잡는다.
    const navStartedAt = Date.now();
    await page.goto(url, { waitUntil: "commit", timeout: 90000 });

    const early = [];
    for (const at of EARLY_TAP_AT) {
      const wait = at - (Date.now() - navStartedAt);
      if (wait > 0) await page.waitForTimeout(wait);
      const before = await page.evaluate(() => (window.__cdPerf ? window.__cdPerf.events.length : 0)).catch(() => 0);
      try {
        // 좌표 탭이다 — 요소 핸들을 잡으려 기다리면 그 대기 자체가 시점을 밀어 버린다.
        const box = await page.locator(EARLY_TAP_SELECTOR).first().boundingBox({ timeout: 1500 });
        if (!box) throw new Error("요소 없음");
        await page.mouse.click(box.x + box.width / 2, Math.min(box.y + 12, box.y + box.height / 2));
      } catch (error) {
        early.push({ at, failed: String(error.message || error).split("\n")[0] });
        continue;
      }
      await page.waitForTimeout(500);
      const fresh = await page
        .evaluate((n) => (window.__cdPerf ? window.__cdPerf.events.slice(n) : []), before)
        .catch(() => []);
      const worst = fresh.reduce((best, e) => (!best || e.duration > best.duration ? e : best), null);
      early.push(
        worst
          ? {
              at,
              duration: worst.duration,
              inputDelay: worst.processingStart - worst.startTime,
              processing: worst.processingEnd - worst.processingStart,
              presentation: worst.duration - (worst.processingEnd - worst.startTime),
            }
          : { at, duration: 0, inputDelay: 0, processing: 0, presentation: 0 },
      );
    }

    await page.waitForLoadState("load", { timeout: 90000 }).catch(() => {});
    // 여기부터는 부팅이 끝난 뒤의 반응성이다. 위 early 와 섞으면 둘 다 못 읽는다.
    await page.waitForTimeout(args.settle);
    const bootMark = await page.evaluate(() => performance.now());

    const interactions = [];
    for (const target of TARGETS) {
      const handle = await page.$(target.selector);
      if (!handle) {
        interactions.push({ name: target.name, missing: true });
        continue;
      }
      const before = await page.evaluate(() => window.__cdPerf.events.length);
      const startedAt = await page.evaluate((n) => { window.__cdPerf.marks.push({ name: n, at: performance.now() }); return performance.now(); }, target.name);
      try {
        // 🔴 타임아웃을 길게 주면 실패한 대상이 수 초의 조용한 구간을 만들고, 그 사이에 도착한
        //    지연 이미지 시프트가 "입력과 무관한 시프트"로 계상돼 귀속이 통째로 어긋난다.
        if (target.type === "type") {
          await handle.click({ timeout: 1200 });
          await page.keyboard.type(target.text, { delay: 60 });
        } else {
          await handle.click({ timeout: 1200 });
        }
      } catch (error) {
        interactions.push({ name: target.name, failed: String(error.message || error).split("\n")[0] });
        await page.evaluate((n) => window.__cdPerf.marks.push({ name: n, at: performance.now() }), `${target.name} (실패)`);
        continue;
      }
      await page.waitForTimeout(args.between);
      const fresh = await page.evaluate((n) => window.__cdPerf.events.slice(n), before);
      const worst = fresh.reduce((best, e) => (!best || e.duration > best.duration ? e : best), null);
      interactions.push(
        worst
          ? {
              name: target.name,
              duration: worst.duration,
              inputDelay: worst.processingStart - worst.startTime,
              processing: worst.processingEnd - worst.processingStart,
              presentation: worst.duration - (worst.processingEnd - worst.startTime),
              events: fresh.length,
            }
          // 16ms 를 넘는 엔트리가 하나도 없으면 그 인터랙션은 한 프레임 안에 끝났다는 뜻이다.
          : { name: target.name, duration: 0, inputDelay: 0, processing: 0, presentation: 0, events: 0 },
      );
      void startedAt;
    }

    // ── 스크롤 ──
    const scrollMark = await page.evaluate(() => { window.__cdPerf.marks.push({ name: '스크롤', at: performance.now() }); return performance.now(); });
    await page.evaluate(async (steps) => {
      const step = Math.max(200, Math.floor(window.innerHeight * 0.9));
      for (let i = 0; i < steps; i += 1) {
        window.scrollBy(0, step);
        await new Promise((r) => setTimeout(r, 120));
      }
    }, args.scrollSteps);
    await page.waitForTimeout(400);

    const perf = await page.evaluate((mark) => {
      const p = window.__cdPerf;
      const during = p.loaf.filter((f) => f.startTime >= mark);
      return {
        longFrames: during.filter((f) => f.duration > 50).length,
        worstFrame: during.reduce((m, f) => Math.max(m, f.duration), 0),
        blockingTotal: during.reduce((s, f) => s + (f.blockingDuration || 0), 0),
        frames: during.length,
      };
    }, scrollMark);

    const shiftReport = await page.evaluate(([mark, scrollAt]) => {
      const after = window.__cdPerf.shifts.filter((s) => s.startTime >= mark);
      const interactionPhase = after.filter((s) => s.startTime < scrollAt).reduce((sum, s) => sum + s.value, 0);
      const scrollPhase = after.filter((s) => s.startTime >= scrollAt).reduce((sum, s) => sum + s.value, 0);
      const bySource = {};
      for (const s of after) {
        const key = s.sources.length ? s.sources.join(" + ") : "(출처 미상)";
        bySource[key] = (bySource[key] || 0) + s.value;
      }
      // 🔴 "무엇이 밀렸나"만으로는 못 고친다. 밀린 요소는 결과이고 원인은 그 위에서 커진 무언가다.
      //    그래서 각 시프트를 **그 시각에 진행 중이던 인터랙션**에 귀속시킨다.
      const marks = window.__cdPerf.marks;
      const byPhase = {};
      for (const s of after) {
        let phase = "(첫 대상 이전)";
        for (const m of marks) if (m.at <= s.startTime) phase = m.name;
        byPhase[phase] = (byPhase[phase] || 0) + s.value;
      }
      return {
        total: after.reduce((sum, s) => sum + s.value, 0),
        byPhase,
        interactionPhase,
        scrollPhase,
        count: after.length,
        top: Object.entries(bySource)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([source, value]) => ({ source, value })),
      };
    }, [bootMark, scrollMark]);

    await context.close();
    return { early, interactions, scroll: perf, shiftReport };
  } finally {
    await browser.close();
  }
}

/* ───────────────────────────── 보고 ───────────────────────────── */

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function band(values) {
  return values.length ? `${Math.round(Math.min(...values))}–${Math.round(Math.max(...values))}` : "-";
}

function report() {
  const lines = [];
  lines.push(`# perf:interaction — ${args.label}`, "", `- URL: ${targetUrl}`, `- Runs: ${args.runs} · CPU ${args.cpu}x`, "");
  lines.push(
    `## 🔴 부팅 중 탭 — \`${EARLY_TAP_SELECTOR}\` (핸들러 없음 = 순수 대기)`,
    "",
    "| 탭 시점 | 총 지연 | 입력 대기 | 처리 | 렌더 |",
    "|---|---:|---:|---:|---:|",
  );
  for (const at of EARLY_TAP_AT) {
    const samples = runs.map((r) => r.early.find((e) => e.at === at)).filter((s) => s && typeof s.duration === "number");
    if (samples.length === 0) {
      lines.push(`| ${at}ms | (측정 실패) | | | |`);
      continue;
    }
    const d = samples.map((s) => s.duration);
    lines.push(
      `| ${at}ms | **${Math.round(median(d))}** [${band(d)}] | ${Math.round(median(samples.map((s) => s.inputDelay)))} | ` +
        `${Math.round(median(samples.map((s) => s.processing)))} | ${Math.round(median(samples.map((s) => s.presentation)))} |`,
    );
  }
  const earlyWorst = runs.map((r) => r.early.reduce((m, e) => Math.max(m, Number(e.duration) || 0), 0));
  lines.push("", `**부팅 중 최악: ${Math.round(median(earlyWorst))} ms [${band(earlyWorst)}]**`, "");

  lines.push("## 부팅 이후 인터랙션 지연 (ms, 중앙값 [min–max])", "");
  lines.push("| 대상 | 총 지연 | 입력 대기 | 처리 | 렌더 |", "|---|---:|---:|---:|---:|");

  let missing = 0;
  for (const target of TARGETS) {
    const samples = runs.map((r) => r.interactions.find((i) => i.name === target.name)).filter(Boolean);
    if (samples.every((s) => s.missing)) {
      lines.push(`| ${target.name} | (요소 없음) | | | |`);
      missing += 1;
      continue;
    }
    const usable = samples.filter((s) => typeof s.duration === "number");
    if (usable.length === 0) {
      lines.push(`| ${target.name} | (실패: ${samples[0]?.failed || "?"}) | | | |`);
      missing += 1;
      continue;
    }
    const d = usable.map((s) => s.duration);
    lines.push(
      `| ${target.name} | **${Math.round(median(d))}** [${band(d)}] | ${Math.round(median(usable.map((s) => s.inputDelay)))} | ` +
        `${Math.round(median(usable.map((s) => s.processing)))} | ${Math.round(median(usable.map((s) => s.presentation)))} |`,
    );
  }

  const worstPerRun = runs.map((r) => r.interactions.reduce((m, i) => Math.max(m, Number(i.duration) || 0), 0));
  lines.push(
    "",
    `**최악 인터랙션(=INP 대용): ${Math.round(median(worstPerRun))} ms [${band(worstPerRun)}]** — 목표 ≤ 200ms`,
    "",
    "## 스크롤",
    "",
    "| 항목 | 중앙값 | min–max |",
    "|---|---:|---|",
    `| 50ms 초과 프레임 수 | ${median(runs.map((r) => r.scroll.longFrames))} | ${band(runs.map((r) => r.scroll.longFrames))} |`,
    `| 최장 프레임(ms) | ${Math.round(median(runs.map((r) => r.scroll.worstFrame)))} | ${band(runs.map((r) => r.scroll.worstFrame))} |`,
    `| 블로킹 합계(ms) | ${Math.round(median(runs.map((r) => r.scroll.blockingTotal)))} | ${band(runs.map((r) => r.scroll.blockingTotal))} |`,
    "",
    `**부팅 이후 레이아웃 시프트: ${median(runs.map((r) => r.shiftReport.total)).toFixed(4)}** ` +
      `(누르는 동안 ${median(runs.map((r) => r.shiftReport.interactionPhase)).toFixed(4)} · ` +
      `스크롤 중 ${median(runs.map((r) => r.shiftReport.scrollPhase)).toFixed(4)}) — 로딩 CLS 와 별개다. 목표 ≤ 0.1`,
    "",
    "### 어느 인터랙션이 일으켰나",
    "",
    "| 구간 | 시프트 합계 |",
    "|---|---:|",
  );
  const phaseTotals = new Map();
  for (const run of runs) for (const [k, v] of Object.entries(run.shiftReport.byPhase || {})) phaseTotals.set(k, (phaseTotals.get(k) || 0) + v / runs.length);
  for (const [k, v] of [...phaseTotals].sort((a, b) => b[1] - a[1])) lines.push(`| ${k} | ${v.toFixed(4)} |`);
  lines.push(
    "",
    "### 무엇이 밀렸나 (시프트 값 합계 상위)",
    "",
    "| 출처 | 합계 |",
    "|---|---:|",
  );
  const shiftTotals = new Map();
  for (const run of runs) {
    for (const item of run.shiftReport.top) {
      shiftTotals.set(item.source, (shiftTotals.get(item.source) || 0) + item.value / runs.length);
    }
  }
  for (const [source, value] of [...shiftTotals].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    lines.push(`| \`${source}\` | ${value.toFixed(4)} |`);
  }

  const text = lines.join("\n");
  console.log("\n" + text);

  const outDir = args.out || path.join(os.tmpdir(), "code-destiny-perf");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `interaction-${args.label}.md`), text, "utf8");
  fs.writeFileSync(
    path.join(outDir, `interaction-${args.label}.json`),
    JSON.stringify({ label: args.label, url: targetUrl, runs }, null, 2),
    "utf8",
  );
  console.log(`\n[perf:interaction] wrote ${path.join(outDir, `interaction-${args.label}.md`)}`);

  // 🔴 대상이 다 사라졌는데 "문제 없음"으로 읽히면 안 된다. 재는 게 없으면 실패다.
  if (missing >= TARGETS.length) {
    console.error("[perf:interaction] 실패 — 잴 수 있는 대상이 하나도 없다. 셀렉터가 낡았다.");
    process.exit(1);
  }
}

/* ───────────────────────────── 인프라 ───────────────────────────── */

function parseArgs(argv) {
  const get = (name, fallback) => {
    const hit = argv.find((arg) => arg.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
  };
  return {
    runs: Math.max(1, parseInt(get("runs", "3"), 10)),
    cpu: Math.max(1, parseInt(get("cpu", "4"), 10)),
    settle: Math.max(0, parseInt(get("settle", "6000"), 10)),
    between: Math.max(100, parseInt(get("between", "700"), 10)),
    scrollSteps: Math.max(1, parseInt(get("scroll-steps", "12"), 10)),
    label: get("label", "run"),
    url: get("url", ""),
    out: get("out", ""),
  };
}

function startStaticServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    let filePath = path.join(staticRoot, urlPath);
    if (urlPath.endsWith("/")) filePath = path.join(filePath, "index.html");
    if (!filePath.startsWith(staticRoot)) {
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

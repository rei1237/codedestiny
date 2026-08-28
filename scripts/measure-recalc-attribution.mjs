/**
 * 홈의 **스타일 재계산을 누가 유발했는지** 귀속시킨다.
 *
 * 왜 따로 필요한가 — 저장소에는 재계산의 **양**을 재는 도구가 이미 둘 있다.
 *   - `perf:style-cost` : `Performance.getMetrics` 의 `RecalcStyleCount/Duration`.
 *     🔴 다만 `CSS.startRuleUsageTracking` 을 켜므로 recalc 시간이 부풀고 횟수가 줄어든다
 *        (docs/handoff/home-lcp-inp-2026-08-28.md §5 · 메모 [perf-style-cost-inflates-recalc]).
 *   - `perf:interaction` : Event Timing 3단 분해. "렌더가 전부"까지는 말해 주지만
 *     **그 렌더 안에서 무엇이 무효화를 넓혔는지**는 못 말한다.
 * 즉 "홈 RecalcStyle 4,090ms / 588회"(같은 문서 §3-1)를 **파일·함수 단위로 쪼갤 수단이 없었다.**
 * 이 도구가 그 한 칸을 채운다 — 양이 아니라 **원인**이다.
 *
 * 방법(같은 문서 §5 의 "recalc 원인" 줄):
 *   `Tracing.start` 에 `disabled-by-default-devtools.timeline.stack` 을 포함시키면
 *   `UpdateLayoutTree` 이벤트에 `args.beginData.stackTrace` 가 붙는다. 그 최상위 프레임으로
 *   재계산을 묶는다. **스택이 없는 것이 파서/스타일시트 몫**이다(§5 가 정한 해석).
 *   `disabled-by-default-devtools.timeline.invalidationTracking` 은 한 걸음 더 가서
 *   "어떤 클래스·속성 변경이 무효화를 걸었나"(`changedClass`/`changedAttribute`/`changedId`)를 준다.
 *
 * 🔴 두 카테고리는 **서로 다른 패스로 켠다.** invalidationTracking 은 무효화마다 노드를
 *    직렬화하므로 같은 패스에 켜면 stack 패스의 시간 분포가 통째로 달라진다. 공유하는 것은
 *    브라우저 설정뿐이고 트레이스는 각자 딴다.
 *
 * 🔴 **이 도구의 절대 시간은 §3-1 의 값과 비교하지 말 것.** 트레이싱 자체가 오버헤드다.
 *    읽어야 하는 것은 **비중(share)** 과 **엘리먼트 수**이고, 절대값의 대조군은 같은 실행 안의
 *    `Performance.getMetrics` 다(탭 전·후 두 번 찍는다 — §5 의 함정).
 *
 * 측정 조건은 문서 §5 와 같다 — 390×844 · DPR 3 · CPU 4x · Slow 4G(1.6Mbps/150ms).
 * 기본 대상은 **프로덕션**이다. §3-1 의 616ms 가 프로덕션 값이라 로컬 dist 로 재면 나란히 못 읽는다.
 *
 * 🔴 부팅 게이트 대기는 **"붙는 것을 먼저 기다린 뒤 사라짐을 기다린다"** — 서빙 HTML 의 `<html>`
 *    에는 `cd-boot-gate` 가 없고 JS 가 ~1.2초에 붙인다. 사라짐만 기다리면 첫 폴에서 곧장 통과해
 *    가짜 해제시각이 나온다(문서 §5 가 한 번 그렇게 냈다).
 *
 * 사용:
 *   npm run perf:recalc-origin                                      # 진단(두 패스, 변형 A만)
 *   npm run perf:recalc-origin -- --passes=stack --variants=A,B --runs=3   # 원인 확인 A/B
 *   npm run perf:recalc-origin -- --target="#cdMobileBottomNav [data-nav-key='fortunes']"
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";

const args = parseArgs(process.argv.slice(2));

// 문서 §5 의 공통 설정. 여기서 갈리면 §3-1 의 분해와 나란히 못 읽는다.
const VIEWPORT = { width: 390, height: 844 };
const DPR = 3;
const CPU_THROTTLE = 4;
const NET = { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, offline: false };
const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

const BASE_CATEGORIES = ["devtools.timeline", "disabled-by-default-devtools.timeline"];
const ALL_PASSES = [
  { key: "stack", label: "스택 귀속", categories: [...BASE_CATEGORIES, "disabled-by-default-devtools.timeline.stack"] },
  {
    key: "invalidation",
    label: "무효화 이유",
    categories: [...BASE_CATEGORIES, "disabled-by-default-devtools.timeline.invalidationTracking"],
  },
];
const PASSES = ALL_PASSES.filter((p) => args.passes.includes(p.key));

/**
 * 변형. **로드 구간은 손대지 않는다** — 클래스는 정착이 끝난 뒤, 탭 직전에만 건다.
 * 그래야 A/B 가 "탭 한 번"의 차이만 보게 된다.
 *
 * 🔴 B 의 `cd-hero-ambient-idle` 은 새로 만든 노브가 아니다. index.html 에 이미 있는
 *    "히어로가 화면 밖이면 앰비언트를 멈춘다" 규칙(`animation-play-state:paused!important`)을
 *    **최상단에 있는 채로** 걸어 보는 것뿐이다. 제품 결정이 아니라 원인 확인용 변형이다.
 */
const ALL_VARIANTS = [
  { key: "A", label: "베이스라인", htmlClass: "" },
  /* 🔴 B 는 **애니메이션을 줄이지 않는다 — 바꿀 뿐이다.** `cd-hero-ambient-idle` 이 붙으면 히어로
     앰비언트는 멈추지만, 폴드 아래 블록은 `:not(.cd-hero-ambient-idle)` 로 걸려 있어서 그 34개가
     **거꾸로 풀린다**(index.html 의 "폴드 아래 장식 애니메이션" 주석). 그래서 B 의 결과는
     "히어로 앰비언트만 뗀 값"이 아니다. 상한을 보려면 C 를 쓸 것. */
  { key: "B", label: "히어로 앰비언트 정지(폴드 아래는 거꾸로 풀림)", htmlClass: "cd-hero-ambient-idle" },
  /* 상한. 문서·모든 의사요소의 애니메이션과 트랜지션을 통째로 끈다. 제품에 넣을 수 있는 안이
     아니라 **"애니메이션이 원인인가"의 천장**을 재는 변형이다. */
  {
    key: "C",
    label: "모든 애니메이션·트랜지션 정지(상한)",
    css: "*,*::before,*::after{animation:none!important;transition:none!important}",
  },
];
const VARIANTS = ALL_VARIANTS.filter((v) => args.variants.includes(v.key));


/* ───────────────────────────── 측정 ───────────────────────────── */

async function measureOnce(pass, variant) {
  const browser = await chromium.launch({ headless: true });
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
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE });
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", NET);
    await cdp.send("Performance.enable");

    // 🔴 Event Timing 관찰자는 문서보다 먼저 설치해야 한다. 로드 뒤에 붙이면 이미 지나간
    //    엔트리를 못 본다. `perf:interaction` 과 같은 3단 분해를 쓴다(입력지연·처리·프레젠테이션).
    await page.addInitScript(() => {
      window.__cdRecalcPerf = { events: [] };
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            window.__cdRecalcPerf.events.push({
              name: e.name,
              startTime: e.startTime,
              duration: e.duration,
              processingStart: e.processingStart,
              processingEnd: e.processingEnd,
            });
          }
        }).observe({ type: "event", durationThreshold: 16, buffered: true });
      } catch {}
    });

    // ── 로드 구간 ──
    await startTracing(cdp, pass.categories);
    const navStartedAt = Date.now();
    await page.goto(args.url, { waitUntil: "commit", timeout: 120000 });
    const gate = await waitForBootGate(page, navStartedAt);
    await page.waitForTimeout(args.settle);
    const loadTrace = await stopTracing(cdp);

    // 🔴 metrics 는 탭 **전**에 한 번 찍는다. 한 번만 찍으면 전체화면 DOM 이 섞여 로드 몫을
    //    3배로 읽는다(문서 §5).
    const beforeTap = await readMetrics(cdp);
    const domBefore = await page.evaluate(() => document.querySelectorAll("*").length);

    // 🔴 변형은 **여기서만** 건다 — 로드 구간을 공유해야 A/B 가 탭 한 번의 차이만 본다.
    if (variant.htmlClass) {
      await page.evaluate((cls) => document.documentElement.classList.add(cls), variant.htmlClass);
      await page.waitForTimeout(400);
    }
    if (variant.css) {
      await page.evaluate((css) => {
        const el = document.createElement("style");
        el.textContent = css;
        document.head.appendChild(el);
      }, variant.css);
      // 🔴 시트를 넣는 것 자체가 문서 전체 무효화를 한 번 만든다. 그 재계산이 탭 구간에 섞이지
      //    않도록 넉넉히 흘려보낸 뒤 트레이싱을 시작한다.
      await page.waitForTimeout(1200);
    }

    // ── 탭 구간 ──
    const eventsBefore = await page.evaluate(() => window.__cdRecalcPerf.events.length).catch(() => 0);
    await startTracing(cdp, pass.categories);
    let tapError = "";
    try {
      const handle = await page.$(args.target);
      if (!handle) throw new Error(`대상 없음: ${args.target}`);
      await handle.click({ timeout: 5000 });
    } catch (error) {
      tapError = String(error.message || error).split("\n")[0];
    }
    await page.waitForTimeout(args.after);
    const tapTrace = await stopTracing(cdp);
    const interaction = await page
      .evaluate((n) => {
        const fresh = window.__cdRecalcPerf.events.slice(n);
        const worst = fresh.reduce((best, e) => (!best || e.duration > best.duration ? e : best), null);
        if (!worst) return { duration: 0, inputDelay: 0, processing: 0, presentation: 0, name: "(16ms 초과 없음)", count: 0 };
        return {
          name: worst.name,
          duration: worst.duration,
          inputDelay: worst.processingStart - worst.startTime,
          processing: worst.processingEnd - worst.processingStart,
          presentation: worst.duration - (worst.processingEnd - worst.startTime),
          count: fresh.length,
        };
      }, eventsBefore)
      .catch(() => null);

    const afterTap = await readMetrics(cdp);
    const domAfter = await page.evaluate(() => document.querySelectorAll("*").length);

    await context.close();
    return {
      gate,
      tapError,
      interaction,
      dom: { before: domBefore, after: domAfter },
      metrics: { beforeTap, afterTap },
      load: digest(loadTrace),
      tap: digest(tapTrace),
    };
  } finally {
    await browser.close();
  }
}

/**
 * 🔴 `cd-boot-gate` 는 서빙 HTML 에 없다 — JS 가 붙인다. 그래서 **붙는 것을 먼저** 기다린다.
 *    Node 쪽 폴링을 쓴다(문서 §5: addInitScript 안의 MutationObserver 는 이 사이트에서 빈 결과).
 */
async function waitForBootGate(page, navStartedAt) {
  const has = () =>
    page.evaluate(() => document.documentElement.classList.contains("cd-boot-gate")).catch(() => false);
  let appearedAt = null;
  let releasedAt = null;
  const deadline = navStartedAt + args.gateTimeout;
  while (Date.now() < deadline) {
    if (await has()) {
      appearedAt = Date.now() - navStartedAt;
      break;
    }
    await page.waitForTimeout(100);
  }
  if (appearedAt === null) return { appearedAt: null, releasedAt: null, note: "게이트가 끝내 안 붙었다" };
  while (Date.now() < deadline) {
    if (!(await has())) {
      releasedAt = Date.now() - navStartedAt;
      break;
    }
    await page.waitForTimeout(100);
  }
  return { appearedAt, releasedAt, note: releasedAt === null ? "제한시간 안에 해제되지 않았다" : "" };
}

async function readMetrics(cdp) {
  const { metrics } = await cdp.send("Performance.getMetrics");
  const pick = {};
  for (const m of metrics) {
    if (/^(TaskDuration|RecalcStyleCount|RecalcStyleDuration|LayoutCount|LayoutDuration|ScriptDuration|Nodes)$/.test(m.name)) {
      pick[m.name] = m.value;
    }
  }
  return pick;
}

/* ───────────────────────────── 트레이스 ───────────────────────────── */

async function startTracing(cdp, categories) {
  await cdp.send("Tracing.start", {
    transferMode: "ReturnAsStream",
    streamFormat: "json",
    traceConfig: { recordMode: "recordAsMuchAsPossible", includedCategories: categories },
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

/**
 * 트레이스 한 벌에서 우리가 읽는 세 가지만 뽑는다.
 *   1) UpdateLayoutTree 를 **스택 최상위 프레임**으로 묶는다. 스택 없음 = 파서/스타일시트 몫.
 *   2) 각 재계산이 만진 **엘리먼트 수**(`args.elementCount`) — 이게 "무효화 범위"다.
 *   3) 무효화 이유(invalidationTracking 패스에서만) — 어떤 클래스·속성이 걸었나.
 */
/**
 * 탭 한 번의 **파이프라인 분해**. 🔴 재계산이 그 구간의 지배항인지 아무도 확인한 적이 없다 —
 * 문서 §3 은 `RecalcStyle 이 로드 TaskDuration 의 42.5%` 라는 **로드** 수치에서 그렇게 추정했을 뿐이다.
 * 🔴 스크립트 계열(EventDispatch·FunctionCall·TimerFire)은 아래 렌더 이벤트를 **감싸므로**
 *    같이 더하지 말 것. 표에서도 따로 읽는다.
 */
const PIPELINE_EVENTS = new Set([
  "UpdateLayoutTree",
  "Layout",
  "PrePaint",
  "Paint",
  "Commit",
  "CompositeLayers",
  "ParseHTML",
  "EvaluateScript",
  "FunctionCall",
  "TimerFire",
  "EventDispatch",
  "HitTest",
]);

const NO_STACK = "(스택 없음 — 파서·스타일시트 몫)";

function digest(events) {
  const byOrigin = new Map();
  const invalidations = new Map();
  let total = { count: 0, dur: 0, elements: 0 };
  let scheduled = 0;
  const pipeline = new Map();
  const calls = new Map();
  const layoutByOrigin = new Map();

  for (const e of events) {
    if (PIPELINE_EVENTS.has(e.name)) {
      const slot = pipeline.get(e.name) || { count: 0, dur: 0 };
      slot.count += 1;
      slot.dur += Number(e.dur) || 0;
      pipeline.set(e.name, slot);
    }
    /* 🔴 `FunctionCall` 은 자기가 부른 렌더 이벤트를 **감싼다** — 그래서 이 표의 시간은
       "그 함수가 태운 총 시간"이지 자기 몫이 아니다. 그래도 **어느 파일의 어느 함수가
       그 구간을 잡고 있는지**는 이것으로만 나온다. `args.data` 는 스택 카테고리 없이도 붙는다. */
    if (e.name === "FunctionCall") {
      const d = e.args?.data || {};
      const url = String(d.url || "(익명)").replace(/^https?:\/\/[^/]+/, "");
      const key = `${d.functionName || "(익명 함수)"} @ ${url}:${d.lineNumber ?? "?"}:${d.columnNumber ?? "?"}`;
      const slot = calls.get(key) || { count: 0, dur: 0 };
      slot.count += 1;
      slot.dur += Number(e.dur) || 0;
      calls.set(key, slot);
    }
    if (e.name === "UpdateLayoutTree") {
      const dur = Number(e.dur) || 0;
      const elements = Number(e.args?.elementCount) || 0;
      total = { count: total.count + 1, dur: total.dur + dur, elements: total.elements + elements };
      const key = originKey(e.args?.beginData?.stackTrace);
      const slot = byOrigin.get(key) || { count: 0, dur: 0, elements: 0, maxElements: 0 };
      slot.count += 1;
      slot.dur += dur;
      slot.elements += elements;
      slot.maxElements = Math.max(slot.maxElements, elements);
      byOrigin.set(key, slot);
      continue;
    }
    /* 🔴 Layout 도 같은 자리에 스택을 달고 온다. 재계산만 귀속시키면 "재계산이 범인"이라는
       결론으로 미끄러진다 — 실측상 이 구간의 Layout 은 애니메이션을 다 꺼도 안 줄었다. */
    if (e.name === "Layout") {
      const key = originKey(e.args?.beginData?.stackTrace);
      const slot = layoutByOrigin.get(key) || { count: 0, dur: 0 };
      slot.count += 1;
      slot.dur += Number(e.dur) || 0;
      layoutByOrigin.set(key, slot);
      continue;
    }
    if (e.name === "ScheduleStyleRecalculation") {
      scheduled += 1;
      continue;
    }
    if (e.name === "StyleRecalcInvalidationTracking" || e.name === "StyleInvalidatorInvalidationTracking") {
      const d = e.args?.data || {};
      const changed = d.changedClass
        ? `class="${d.changedClass}"`
        : d.changedAttribute
          ? `attr=${d.changedAttribute}`
          : d.changedId
            ? `id=${d.changedId}`
            : "(변경 표식 없음)";
      const key = `${changed} · ${d.reason || "(사유 없음)"}`;
      const slot = invalidations.get(key) || { count: 0, nodes: new Map(), frames: new Set() };
      slot.count += 1;
      const node = d.nodeName || "(노드 미상)";
      slot.nodes.set(node, (slot.nodes.get(node) || 0) + 1);
      const frame = originKey(d.stackTrace);
      if (frame !== NO_STACK) slot.frames.add(frame);
      invalidations.set(key, slot);
    }
  }

  return {
    events: total.count,
    durMs: total.dur / 1000,
    elements: total.elements,
    scheduled,
    pipeline: [...pipeline].map(([name, v]) => ({ name, count: v.count, durMs: v.dur / 1000 })).sort((x, y) => y.durMs - x.durMs),
    layoutByOrigin: [...layoutByOrigin].map(([origin, v]) => ({ origin, count: v.count, durMs: v.dur / 1000 })).sort((x, y) => y.durMs - x.durMs).slice(0, 15),
    calls: [...calls].map(([name, v]) => ({ name, count: v.count, durMs: v.dur / 1000 })).sort((x, y) => y.durMs - x.durMs).slice(0, 25),
    byOrigin: [...byOrigin]
      .map(([origin, v]) => ({ origin, ...v, durMs: v.dur / 1000 }))
      .sort((a, b) => b.dur - a.dur),
    invalidations: [...invalidations]
      .map(([key, v]) => ({
        key,
        count: v.count,
        nodes: [...v.nodes].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, c]) => `${n}×${c}`),
        frames: [...v.frames].slice(0, 2),
      }))
      .sort((a, b) => b.count - a.count),
  };
}

function originKey(stackTrace) {
  if (!Array.isArray(stackTrace) || stackTrace.length === 0) return NO_STACK;
  const f = stackTrace[0] || {};
  const url = String(f.url || "(익명)").replace(/^https?:\/\/[^/]+/, "");
  const name = f.functionName || "(익명 함수)";
  return `${name} @ ${url}:${f.lineNumber ?? "?"}:${f.columnNumber ?? "?"}`;
}

/* ───────────────────────────── 보고 ───────────────────────────── */

function median(values) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// 🔴 귀속 표는 **한 변형만** 쓴다. 섞으면 A 와 B 의 유발 지점이 한 표에 합쳐져 둘 다 못 읽는다.
const DIAG_VARIANT = VARIANTS[0].key;

function report() {
  const lines = [];
  lines.push(
    `# perf:recalc-origin — ${args.label}`,
    "",
    `- URL: ${args.url}`,
    `- 탭 대상: \`${args.target}\``,
    `- 조건: ${VIEWPORT.width}×${VIEWPORT.height} · DPR ${DPR} · CPU ${CPU_THROTTLE}x · Slow 4G(1.6Mbps/150ms) · 게이트 해제 후 ${args.settle}ms 정착`,
    `- 패스별 ${args.runs}회`,
    "",
    "🔴 **절대 시간은 트레이싱 오버헤드가 실린 값이다.** 읽어야 하는 것은 비중과 엘리먼트 수이고,",
    "절대값의 대조군은 아래 `Performance.getMetrics` 표다.",
    "",
  );

  // ── 변형 A/B ── 🔴 판정은 이 레포의 통상 기준대로 **밴드 비겹침**이다.
  if (VARIANTS.length > 1) {
    lines.push(
      "## 변형 A/B — 탭 한 번의 인터랙션 지연 (Event Timing)",
      "",
      "🔴 트레이싱이 켜진 채로 잰 값이라 **§3-1 의 616ms 와 절대 비교하지 말 것.** 같은 하네스 안의 변형 간 차이로만 읽는다.",
      "",
      "| 변형 | 총 지연 중앙값 | 밴드 | 입력지연 | 처리 | 프레젠테이션 | 탭 후 RecalcStyle |",
      "|---|---:|---|---:|---:|---:|---|",
    );
    for (const variant of VARIANTS) {
      const rows = sessions.filter((s) => s.variant === variant.key && s.interaction);
      if (!rows.length) continue;
      const d = rows.map((r) => r.interaction.duration);
      const recalcDelta = rows.map(
        (r) => ((r.metrics.afterTap.RecalcStyleDuration || 0) - (r.metrics.beforeTap.RecalcStyleDuration || 0)) * 1000,
      );
      lines.push(
        `| ${variant.key} — ${variant.label} | **${Math.round(median(d))}** | ${Math.round(Math.min(...d))}–${Math.round(Math.max(...d))} | ` +
          `${Math.round(median(rows.map((r) => r.interaction.inputDelay)))} | ${Math.round(median(rows.map((r) => r.interaction.processing)))} | ` +
          `${Math.round(median(rows.map((r) => r.interaction.presentation)))} | +${Math.round(median(recalcDelta))}ms |`,
      );
    }
    lines.push("");
  }

  // ── 대조군 ──
  lines.push("## 대조군 — `Performance.getMetrics` (탭 전 / 탭 후)", "", "| 패스 · 변형 | RecalcStyle (탭 전) | RecalcStyle (탭 후) | 엘리먼트 (전→후) |", "|---|---|---|---|");
  for (const pass of PASSES) {
    for (const variant of VARIANTS) {
    const rows = sessions.filter((s) => s.pass === pass.key && s.variant === variant.key);
    if (!rows.length) continue;
    const fmt = (getter) => {
      const counts = rows.map((r) => getter(r).RecalcStyleCount || 0);
      const durs = rows.map((r) => (getter(r).RecalcStyleDuration || 0) * 1000);
      return `${Math.round(median(durs))}ms / ${Math.round(median(counts))}회`;
    };
    lines.push(
      `| ${pass.label} · ${variant.key} | ${fmt((r) => r.metrics.beforeTap)} | ${fmt((r) => r.metrics.afterTap)} | ` +
        `${Math.round(median(rows.map((r) => r.dom.before)))} → ${Math.round(median(rows.map((r) => r.dom.after)))} |`,
    );
    }
  }
  lines.push("");

  const gateRows = sessions.filter((s) => s.gate.releasedAt != null);
  lines.push(
    `부팅 게이트: 부착 ${Math.round(median(sessions.map((s) => s.gate.appearedAt || 0)))}ms → ` +
      `해제 ${gateRows.length ? Math.round(median(gateRows.map((s) => s.gate.releasedAt))) : "미해제"}ms ` +
      `(${gateRows.length}/${sessions.length} 회 해제)`,
    "",
  );

  const failed = sessions.filter((s) => s.tapError);
  if (failed.length) {
    lines.push(`🔴 탭 실패 ${failed.length}/${sessions.length}회: ${[...new Set(failed.map((s) => s.tapError))].join(" · ")}`, "");
  }

  // ── 탭 구간 파이프라인 분해 ──
  {
    const stackRows = sessions.filter((s) => s.pass === "stack");
    if (stackRows.length) {
      lines.push(
        "## 탭 구간 파이프라인 분해 — 재계산이 정말 지배항인가",
        "",
        "🔴 스크립트 계열(`EventDispatch`·`FunctionCall`·`TimerFire`)은 아래 렌더 이벤트를 **감싼다.** 합계를 내지 말고 따로 읽을 것.",
        "",
        `| 변형 | ${["UpdateLayoutTree", "Layout", "PrePaint", "Paint", "EventDispatch"].join(" | ")} |`,
        "|---|---:|---:|---:|---:|---:|",
      );
      for (const variant of VARIANTS) {
        const rows = stackRows.filter((s) => s.variant === variant.key);
        if (!rows.length) continue;
        const cell = (name) => {
          const per = rows.map((r) => (r.tap.pipeline || []).find((p) => p.name === name));
          const durs = per.map((p) => (p ? p.durMs : 0));
          const counts = per.map((p) => (p ? p.count : 0));
          return `${Math.round(median(durs))}ms / ${Math.round(median(counts))}회`;
        };
        lines.push(
          `| ${variant.key} | ${["UpdateLayoutTree", "Layout", "PrePaint", "Paint", "EventDispatch"].map(cell).join(" | ")} |`,
        );
      }
      lines.push("");
    }
  }

  // ── 탭 구간 스크립트 ──
  {
    const rows = sessions.filter((s) => s.pass === "stack" && s.variant === DIAG_VARIANT);
    if (rows.length) {
      const merged = new Map();
      for (const r of rows) {
        for (const c of r.tap.calls || []) {
          const slot = merged.get(c.name) || { name: c.name, count: 0, durMs: 0 };
          slot.count += c.count / rows.length;
          slot.durMs += c.durMs / rows.length;
          merged.set(c.name, slot);
        }
      }
      const sorted = [...merged.values()].sort((a, b) => b.durMs - a.durMs);
      const layout = new Map();
      for (const r of rows) {
        for (const l of r.tap.layoutByOrigin || []) {
          const slot = layout.get(l.origin) || { origin: l.origin, count: 0, durMs: 0 };
          slot.count += l.count / rows.length;
          slot.durMs += l.durMs / rows.length;
          layout.set(l.origin, slot);
        }
      }
      if (layout.size) {
        lines.push(
          `## 탭 구간 — \`Layout\` 을 유발한 곳 (변형 ${DIAG_VARIANT}, 회차 평균 ${rows.length}회)`,
          "",
          "| 유발 지점 | 횟수 | 시간(ms) |",
          "|---|---:|---:|",
        );
        for (const l of [...layout.values()].sort((a, b) => b.durMs - a.durMs).slice(0, args.top)) {
          lines.push(`| \`${l.origin}\` | ${Math.round(l.count)} | ${Math.round(l.durMs)} |`);
        }
        lines.push("");
      }

      lines.push(
        `## 탭 구간 — \`FunctionCall\` 상위 (변형 ${DIAG_VARIANT}, 회차 평균 ${rows.length}회)`,
        "",
        "🔴 이 시간은 **그 함수가 태운 총 시간**이다(자기가 부른 재계산·레이아웃을 포함한다). 서로 더하지 말 것.",
        "",
        "| 함수 | 횟수 | 시간(ms) |",
        "|---|---:|---:|",
      );
      for (const c of sorted.slice(0, args.top)) {
        lines.push(`| \`${c.name}\` | ${Math.round(c.count)} | ${Math.round(c.durMs)} |`);
      }
      lines.push("");
    }
  }

  // ── 스택 귀속 ──
  for (const phase of ["load", "tap"]) {
    const title = phase === "load" ? "로드 구간" : "탭 구간";
    const rows = sessions.filter((s) => s.pass === "stack" && s.variant === DIAG_VARIANT);
    if (!rows.length) continue;
    const merged = mergeOrigins(rows.map((r) => r[phase].byOrigin));
    const totalDur = merged.reduce((s, o) => s + o.durMs, 0) || 1;
    const totalEl = merged.reduce((s, o) => s + o.elements, 0) || 1;
    lines.push(
      `## ${title} — \`UpdateLayoutTree\` 를 유발한 곳 (회차 평균, ${rows.length}회)`,
      "",
      `합계 **${Math.round(totalDur)}ms / ${Math.round(merged.reduce((s, o) => s + o.count, 0))}회 / 엘리먼트 ${Math.round(totalEl)}개**`,
      "",
      "| 유발 지점 | 횟수 | 시간(ms) | 시간 비중 | 엘리먼트 합 | 최대 1회 |",
      "|---|---:|---:|---:|---:|---:|",
    );
    for (const o of merged.slice(0, args.top)) {
      lines.push(
        `| \`${o.origin}\` | ${Math.round(o.count)} | ${Math.round(o.durMs)} | ${((o.durMs / totalDur) * 100).toFixed(1)}% | ` +
          `${Math.round(o.elements)} | ${Math.round(o.maxElements)} |`,
      );
    }
    if (merged.length > args.top) lines.push(`| … 그 외 ${merged.length - args.top}개 | | | | | |`);
    lines.push("");
  }

  // ── 무효화 이유 ──
  for (const phase of ["load", "tap"]) {
    const title = phase === "load" ? "로드 구간" : "탭 구간";
    const rows = sessions.filter((s) => s.pass === "invalidation" && s.variant === DIAG_VARIANT);
    if (!rows.length) continue;
    const merged = mergeInvalidations(rows.map((r) => r[phase].invalidations));
    if (!merged.length) {
      lines.push(`## ${title} — 무효화 이유`, "", "(invalidationTracking 이벤트가 없었다)", "");
      continue;
    }
    const total = merged.reduce((s, o) => s + o.count, 0) || 1;
    lines.push(
      `## ${title} — 무효화를 건 것 (회차 평균, ${rows.length}회)`,
      "",
      `합계 **${Math.round(total)}건**`,
      "",
      "| 변경 · 사유 | 건수 | 비중 | 대상 노드 상위 |",
      "|---|---:|---:|---|",
    );
    for (const o of merged.slice(0, args.top)) {
      lines.push(`| ${o.key} | ${Math.round(o.count)} | ${((o.count / total) * 100).toFixed(1)}% | ${o.nodes.join(", ") || "—"} |`);
    }
    if (merged.length > args.top) lines.push(`| … 그 외 ${merged.length - args.top}개 | | | |`);
    lines.push("");
  }

  const text = lines.join("\n");
  console.log("\n" + text);

  const outDir = args.out || path.join(os.tmpdir(), "code-destiny-perf");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `recalc-origin-${args.label}.md`), text, "utf8");
  fs.writeFileSync(
    path.join(outDir, `recalc-origin-${args.label}.json`),
    JSON.stringify({ label: args.label, url: args.url, target: args.target, sessions }, null, 2),
    "utf8",
  );
  console.log(`\n[perf:recalc-origin] wrote ${path.join(outDir, `recalc-origin-${args.label}.md`)}`);

  // 🔴 fail-closed. 탭을 한 번도 못 눌렀으면 탭 구간 표가 통째로 거짓이므로 초록으로 끝내지 않는다.
  if (sessions.every((s) => s.tapError)) {
    console.error("\n[perf:recalc-origin] 실패 — 탭 대상을 한 번도 누르지 못했다. --target 을 고쳐라.");
    process.exit(1);
  }
}

function mergeOrigins(lists) {
  const acc = new Map();
  for (const list of lists) {
    for (const o of list) {
      const slot = acc.get(o.origin) || { origin: o.origin, count: 0, durMs: 0, elements: 0, maxElements: 0 };
      slot.count += o.count / lists.length;
      slot.durMs += o.durMs / lists.length;
      slot.elements += o.elements / lists.length;
      slot.maxElements = Math.max(slot.maxElements, o.maxElements);
      acc.set(o.origin, slot);
    }
  }
  return [...acc.values()].sort((a, b) => b.durMs - a.durMs);
}

function mergeInvalidations(lists) {
  const acc = new Map();
  for (const list of lists) {
    for (const o of list) {
      const slot = acc.get(o.key) || { key: o.key, count: 0, nodes: new Set() };
      slot.count += o.count / lists.length;
      for (const n of o.nodes) slot.nodes.add(n);
      acc.set(o.key, slot);
    }
  }
  return [...acc.values()].map((v) => ({ ...v, nodes: [...v.nodes].slice(0, 4) })).sort((a, b) => b.count - a.count);
}

/* ───────────────────────────── 인프라 ───────────────────────────── */

function parseArgs(argv) {
  const get = (name, fallback) => {
    const hit = argv.find((arg) => arg.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
  };
  return {
    // 🔴 기본이 프로덕션이다 — 비교 대상인 §3-1 의 616ms 가 프로덕션 값이다.
    url: get("url", "https://code-destiny.com/"),
    // 문서 §3-1 이 "판정 대상"으로 못 박은 자리.
    target: get("target", "#cdMobileBottomNav [data-nav-key='fortunes']"),
    runs: Math.max(1, parseInt(get("runs", "2"), 10)),
    settle: Math.max(0, parseInt(get("settle", "6000"), 10)),
    after: Math.max(200, parseInt(get("after", "1500"), 10)),
    gateTimeout: Math.max(5000, parseInt(get("gate-timeout", "40000"), 10)),
    top: Math.max(3, parseInt(get("top", "12"), 10)),
    // 진단은 두 패스 다 필요하지만, A/B 판정은 stack 하나로 충분하다(실행시간 절반).
    passes: get("passes", "stack,invalidation").split(",").map((s) => s.trim()).filter(Boolean),
    variants: get("variants", "A").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
    label: get("label", "prod"),
    out: get("out", ""),
  };
}

/* ───────────────────────────── 실행 ───────────────────────────── */

console.log(`[perf:recalc-origin] target ${args.url}`);
console.log(`[perf:recalc-origin] tap ${args.target}`);
console.log(
  `[perf:recalc-origin] runs ${args.runs} · CPU ${CPU_THROTTLE}x · Slow4G · settle ${args.settle}ms · label ${args.label}`,
);

const sessions = [];
for (const pass of PASSES) {
  for (const variant of VARIANTS) {
    for (let i = 0; i < args.runs; i += 1) {
      process.stdout.write(`[perf:recalc-origin] ${pass.key}/${variant.key} run ${i + 1}/${args.runs} ... `);
      const session = await measureOnce(pass, variant);
      sessions.push({ pass: pass.key, variant: variant.key, run: i + 1, ...session });
      console.log(
        `게이트 ${session.gate.appearedAt ?? "?"}→${session.gate.releasedAt ?? "미해제"}ms · ` +
          `탭 지연 ${Math.round(session.interaction?.duration || 0)}ms · ` +
          `로드 UpdateLayoutTree ${session.load.events}건 · 탭 ${session.tap.events}건 · ` +
          `recalc(metrics) ${session.metrics.beforeTap.RecalcStyleCount}→${session.metrics.afterTap.RecalcStyleCount}회`,
      );
    }
  }
}

report();

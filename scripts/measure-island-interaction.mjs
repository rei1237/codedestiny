/**
 * 운명의 섬(`/destiny-island.html`) 맵 화면의 **탭 정확도와 체감 성능**을 잰다.
 *
 * 왜 따로 필요한가 — 이 페이지는 외부 JS 를 하나도 로드하지 않는 자급자족 SPA 라서
 * 홈의 입력 브리지(js/mobile-interaction-patch.js · js/inline/gesture-arbiter.js)가 **적용되지 않는다.**
 * 그래서 `perf:interaction`/`perf:tap-cost` 의 측정 대상(홈 전용 셀렉터)으로는 이 화면을 못 잰다.
 *
 * 재사용:
 *   - brotli 정적 서버 · 모바일 컨텍스트 · CPU 4배 스로틀 · Event Timing/LoAF 관찰자
 *     · min~max 밴드 판정 → scripts/measure-home-interaction.mjs 와 같은 방식
 *   - 진짜 CDP 터치(Input.dispatchTouchEvent) · 호출 횟수 카운팅 래퍼
 *     · 문서 이탈 차단(Fetch.failRequest) → scripts/measure-tap-fixed-cost.mjs 와 같은 방식
 *
 * 재는 것
 *   M1 탭 지연     궁 탭의 Event Timing `duration`(입력지연/처리/렌더 3단 분해)
 *   M2 탭 성공률   손가락 지터를 N px 넣고 탭했을 때 궁 대화가 열리는가 (**"탭이 안 먹는다"의 직접 지표**)
 *   M3 팬 프레임   드래그 중 rAF 델타의 중앙값·최대
 *   M4 고정 비용   팬 1회당 getBoundingClientRect / setAttribute / elementFromPoint **호출 횟수**
 *   M5 핀치 리셋   핀치 줌 후 손가락을 떼면 줌이 유지되는가
 *   M6 히트 밀도   궁 중심 주변 64×64px 격자에서 그 궁이 맞는 비율
 *   M7 잔여 포인터 pointerdown 후 up/cancel 이 오지 않은 pointerId
 *
 * 🔴 판정은 perf:home / perf:interaction 과 같다 — **min~max 밴드 비겹침**.
 *    회차 하나의 평균 차이로 개선을 주장하지 않는다. M2·M4·M5·M6 은 결정적이거나 횟수라
 *    노이즈가 거의 없고, M1·M3 만 밴드 판정 대상이다.
 * 🔴 이름이 `perf:*` 인 이유: `verify:*` 는 verify-guard-wiring 의 CI 배선 의무가 붙는데
 *    사용자 지시로 새 CI 게이트를 만들지 않기로 했다(measure-home-interaction.mjs:21-22 와 같은 사유).
 *
 * 사용:
 *   npm run perf:island -- --runs=5 --label=base
 *   npm run perf:island -- --runs=5 --label=base --ablate=filter      # 원인 귀속(제품 코드 무수정)
 *   npm run perf:island -- --runs=3 --label=live --url=https://code-destiny.com/destiny-island.html
 *
 * --ablate 값(콤마 구분): filter | backdrop | anim | caustic | glowf | soft | particles | all
 *   제품 코드를 고치지 않고 요인을 하나씩 꺼서 **그 요인의 몫**을 먼저 잰다.
 */

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import zlib from "node:zlib";
import { chromium } from "@playwright/test";
import { buildIslandSeed } from "./lib/island-perf-seed.mjs";

const root = process.cwd();
const ISLAND_FILE = path.join(root, "destiny-island.html");
const ISLAND_PATH = "/destiny-island.html";
const COMPRESSIBLE = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg", ".xml", ".txt"]);
const encodedCache = new Map();

const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

/* 지터 곡선의 격자. 사람 손가락의 통상 지터가 들어가는 구간(2~10px)을 촘촘히 본다. */
const SLOP_STEPS = [0, 2, 4, 6, 8, 10, 12, 16, 24];
const SLOP_TRIES = 6;

const args = parseArgs(process.argv.slice(2));

/* ───────────────────────────── 진입 ───────────────────────────── */

const seed = await buildIslandSeed();
const server = args.url ? null : await startStaticServer();
const port = server ? server.address().port : 0;
const targetUrl = args.url || `http://127.0.0.1:${port}${ISLAND_PATH}`;

if (!args.url) await assertServingCurrentFile(port);

console.log(`# perf:island — ${args.label}`);
console.log(`- URL: ${targetUrl}`);
console.log(`- Runs: ${args.runs} · CPU ${args.cpu}x · viewport ${args.width}x${args.height}`);
console.log(`- 픽스처: biome=${seed.summary.biome} weather=${seed.summary.weather} 궁=${seed.summary.palaces} 공명=${seed.summary.edges}(flow ${seed.summary.flowEdges})`);
console.log(`- 절제(ablate): ${args.ablate.length ? args.ablate.join(",") : "없음"}`);
console.log("");

const runs = [];
for (let i = 0; i < args.runs; i += 1) {
  process.stdout.write(`  회차 ${i + 1}/${args.runs} … `);
  const result = await measureOnce(targetUrl);
  runs.push(result);
  process.stdout.write("완료\n");
}
if (server) server.close();

report(runs);

/* ───────────────────────────── 측정 ───────────────────────────── */

async function measureOnce(url) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: args.width, height: args.height },
      deviceScaleFactor: args.dsf,
      isMobile: !args.desktop,
      hasTouch: !args.desktop,
      userAgent: args.desktop ? undefined : MOBILE_UA,
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: args.cpu });

    /* 🔴 궁 대화의 선택지에는 /island-consult 링크가 있다. 실수로 밟아 문서가 바뀌면
       그 뒤의 값은 다른 문서의 것이다. 문서 요청만 취소해 이 문서에 머문다. */
    await cdp.send("Fetch.enable", {
      patterns: [{ urlPattern: "*", requestStage: "Request", resourceType: "Document" }],
    });
    let allowNavigation = true;
    cdp.on("Fetch.requestPaused", (event) => {
      const done = allowNavigation
        ? cdp.send("Fetch.continueRequest", { requestId: event.requestId })
        : cdp.send("Fetch.failRequest", { requestId: event.requestId, errorReason: "Aborted" });
      done.catch(() => {});
    });

    await page.addInitScript(installProbes);
    await page.addInitScript(seedStorage, {
      profileListKey: seed.profileListKey,
      profileList: seed.profileList,
      gameKey: seed.gameKey,
      game: seed.game,
      blueprintKey: seed.blueprintKey,
      blueprintEntry: seed.blueprintEntry,
    });

    await page.goto(url, { waitUntil: "commit", timeout: 90000 });

    /* 게이트 → 맵. 시드한 명반 카드를 누른다(사용자가 실제로 밟는 경로 그대로). */
    await page.waitForSelector(".gate-card-item", { timeout: 20000 });
    await page.click(".gate-card-item", { timeout: 10000 });
    /* 🔴 `#scrIsland.on` 은 display:block 이지만 자식이 전부 absolute/fixed 라 **높이가 0**이다.
       playwright 의 visible 대기는 여기서 영원히 안 끝난다 — 궁 노드가 붙는 것으로 판정한다. */
    await page.waitForFunction(
      () => document.getElementById("scrIsland").classList.contains("on") && document.querySelectorAll(".palace").length > 0,
      null,
      { timeout: 30000 },
    );
    await page.waitForTimeout(args.settle);
    allowNavigation = false;

    /* 🔴 위상 고정. applyPhase() 가 실행 시각으로 밤/낮을 바꾸므로 회차마다 다른 것을 재게 된다.
       밤이 최악이다(반딧불 + .emis + .nreflect 의 glowF 가 전부 활성). */
    await page.evaluate((phase) => {
      document.body.classList.remove("ph-dawn", "ph-day", "ph-dusk", "ph-night");
      document.body.classList.add(phase);
    }, args.phase);

    const gate = await page.evaluate(() => ({
      fxLow: document.body.classList.contains("fx-low"),
      palaces: document.querySelectorAll(".palace").length,
      leyFlow: document.querySelectorAll(".leyline.flow").length,
      caustic: document.querySelectorAll('[filter*="caustic"]').length,
      glowF: document.querySelectorAll('[filter*="glowF"]').length,
      soft: document.querySelectorAll('[filter*="soft"]').length,
      backdrops: Array.from(document.querySelectorAll(".hud-id,.chip,.hud-btn,.narrator .nav-bubble")).filter((el) => {
        const v = getComputedStyle(el);
        return (v.backdropFilter || v.webkitBackdropFilter || "none") !== "none";
      }).length,
      fireflies: document.querySelectorAll("#ffLayer i").length,
      weather: document.querySelectorAll("#wxLayer i").length,
    }));
    if (!gate.palaces) throw new Error("궁 노드가 0개다 — 맵이 안 그려졌다. 측정을 중단한다.");

    await applyAblation(page, args.ablate);
    await page.waitForTimeout(400);

    const m1 = await measureTapLatency(page, cdp);
    const m2 = args.skip.includes("slop") ? [] : await measureSlopCurve(page, cdp);
    const m3m4 = await measurePan(page, cdp);
    const m5 = args.skip.includes("pinch") ? null : await measurePinchReset(page, cdp);
    /* 🔴 M5 가 성공하면(=핀치 줌이 유지되면) 맵이 3배로 확대된 채 남아 궁이 화면 밖으로 나간다.
       M6 은 기본 배율에서 재야 의미가 있으므로 먼저 뷰를 되돌린다(데스크톱 더블클릭 리셋 경로). */
    await page.evaluate(() => document.getElementById("mapSvg").dispatchEvent(new MouseEvent("dblclick", { bubbles: true })));
    await page.waitForTimeout(300);
    const m6 = args.skip.includes("hit") ? [] : await measureHitDensity(page);
    const m7 = await page.evaluate(() => window.__isl.leftoverPointers());

    return { gate, m1, m2, m3: m3m4.frames, m4: m3m4.counts, m5, m6, m7 };
  } finally {
    await browser.close();
  }
}

/** M1 — 궁 탭의 Event Timing duration(입력지연/처리/렌더). */
async function measureTapLatency(page, cdp) {
  const samples = [];
  const names = await palaceNames(page);
  for (const name of names.slice(0, args.tapSamples)) {
    const pt = await palacePoint(page, name);
    if (!pt) continue;
    await page.evaluate(() => window.__isl.resetEvents());
    await tap(cdp, pt.x, pt.y);
    await page.waitForTimeout(600);
    const entry = await page.evaluate(() => window.__isl.worstEvent());
    await closeDialogue(page);
    if (entry) samples.push({ name, ...entry });
  }
  return samples;
}

/**
 * M2 — 지터 슬롭 곡선. touchStart → touchMove(N px) → touchEnd 후 궁 대화가 열렸는가.
 * 🔴 실패한 시도도 맵을 N px 팬시키므로, 매 시도마다 궁 좌표를 다시 읽는다.
 */
async function measureSlopCurve(page, cdp) {
  const out = [];
  const names = await palaceNames(page);
  const target = names[0];
  for (const step of SLOP_STEPS) {
    for (const axis of ["axis", "diag"]) {
      const dx = axis === "axis" ? step : Math.round(step / Math.SQRT2);
      const dy = axis === "axis" ? 0 : Math.round(step / Math.SQRT2);
      let ok = 0;
      for (let i = 0; i < SLOP_TRIES; i += 1) {
        const pt = await palacePoint(page, target);
        if (!pt) continue;
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: pt.x, y: pt.y, id: 1 }] });
        if (step > 0) {
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: pt.x + dx, y: pt.y + dy, id: 1 }],
          });
        }
        await page.waitForTimeout(20);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await page.waitForTimeout(160);
        const opened = await page.evaluate(() => document.getElementById("dlgWrap").classList.contains("on"));
        if (opened) ok += 1;
        await closeDialogue(page);
      }
      out.push({ step, axis, ok, tries: SLOP_TRIES });
    }
  }
  return out;
}

/** M3/M4 — 팬 중 rAF 델타와, 팬 1회의 DOM 호출 횟수. */
async function measurePan(page, cdp) {
  const start = { x: Math.round(args.width * 0.5), y: Math.round(args.height * 0.55) };
  await page.evaluate(() => {
    window.__isl.resetCounts();
    window.__isl.startFrames();
  });
  /* 🔴 스텝 수를 줄이면 move 가 성기게 들어와 팬 부하를 과소평가한다(24스텝/1.2초 = 20Hz 는
     실제 터치 스트림 60~120Hz 의 1/3 이하다). 기본 60스텝으로 60Hz 근처를 맞춘다. */
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: start.x, y: start.y, id: 1 }] });
  for (let i = 1; i <= args.panSteps; i += 1) {
    const t = i / args.panSteps;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: start.x - Math.round(90 * t), y: start.y - Math.round(60 * t), id: 1 }],
    });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(300);
  return page.evaluate(() => ({ frames: window.__isl.stopFrames(), counts: window.__isl.readCounts() }));
}

/**
 * M5 — 핀치 줌이 손을 떼는 순간 되돌아가는가.
 * 🔴 CDP 는 touchEnd 에 touchPoints 를 못 넣으므로 두 손가락이 동시에 떨어진다.
 *    그게 실제 사용자의 동작이기도 하고, pointerup 2건이 같은 태스크에 들어와
 *    `now - lastTap < 300` 을 확실히 만족시킨다.
 */
async function measurePinchReset(page, cdp) {
  const cx = Math.round(args.width * 0.5);
  const cy = Math.round(args.height * 0.5);
  const before = await readMapScale(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: cx - 40, y: cy, id: 1 },
      { x: cx + 40, y: cy, id: 2 },
    ],
  });
  for (let i = 1; i <= 8; i += 1) {
    const spread = 40 + i * 12;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: cx - spread, y: cy, id: 1 },
        { x: cx + spread, y: cy, id: 2 },
      ],
    });
    await page.waitForTimeout(24);
  }
  const zoomed = await readMapScale(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(300);
  const after = await readMapScale(page);
  return { before, zoomed, after, kept: zoomed > 0 && after >= zoomed - 0.02 };
}

/** M6 — 궁 중심 주변 64×64px 를 2px 격자로 훑어 그 궁이 맞는 비율. */
function measureHitDensity(page) {
  return page.evaluate(() => {
    const out = [];
    for (const node of document.querySelectorAll(".palace")) {
      const ctm = node.getScreenCTM();
      if (!ctm) continue;
      const cx = ctm.e;
      const cy = ctm.f;
      const name = node.getAttribute("data-palace") || "?";
      let self = 0;
      let other = 0;
      let miss = 0;
      let self44 = 0;
      let total44 = 0;
      for (let dy = -32; dy <= 32; dy += 2) {
        for (let dx = -32; dx <= 32; dx += 2) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
          const hit = document.elementFromPoint(x, y);
          const grp = hit && hit.closest ? hit.closest(".palace") : null;
          const inner44 = Math.abs(dx) <= 22 && Math.abs(dy) <= 22;
          if (inner44) total44 += 1;
          if (grp === node) {
            self += 1;
            if (inner44) self44 += 1;
          } else if (grp) other += 1;
          else miss += 1;
        }
      }
      out.push({ name, self, other, miss, rate44: total44 ? Math.round((self44 / total44) * 100) : 0 });
    }
    return out;
  });
}

/* ───────────────────────────── 페이지 헬퍼 ───────────────────────────── */

function palaceNames(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll(".palace")).map((n) => n.getAttribute("data-palace")));
}

/**
 * 궁의 탭 지점 — 그룹 로컬 원점을 화면 좌표로 변환한다.
 * 🔴 getBoundingClientRect 의 중앙을 쓰지 않는다. bbox 에는 핀 헥사곤과 (opacity 0 인) 툴팁이
 *    포함돼 중심이 건물 밖으로 밀린다. 로컬 원점은 그림자 타원(:1567)의 중심이라 항상 맞는다.
 */
function palacePoint(page, name) {
  return page.evaluate((palace) => {
    const node = document.querySelector(`.palace[data-palace="${palace}"]`);
    if (!node) return null;
    const ctm = node.getScreenCTM();
    if (!ctm) return null;
    return { x: Math.round(ctm.e), y: Math.round(ctm.f) };
  }, name);
}

function readMapScale(page) {
  return page.evaluate(() => {
    const t = document.getElementById("mapZoom").getAttribute("transform") || "";
    const m = /scale\(([\d.]+)\)/.exec(t);
    return m ? Number(m[1]) : 0;
  });
}

async function tap(cdp, x, y) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function closeDialogue(page) {
  const open = await page.evaluate(() => document.getElementById("dlgWrap").classList.contains("on"));
  if (!open) return;
  await page.keyboard.press("Escape");
  await page.waitForTimeout(80);
}

/** 제품 코드를 고치지 않고 요인을 끈다 — Step 0 의 원인 귀속표용. */
async function applyAblation(page, list) {
  if (!list.length) return;
  const on = (k) => list.includes(k) || list.includes("all");
  const css = [];
  if (on("filter")) css.push("#mapSvg{filter:none!important;transition:none!important}");
  if (on("backdrop")) {
    css.push(
      ".hud-id,.chip,.hud-btn,.sheet,.dlg-box,.narrator .nav-bubble,.gate-card-item,.form-card,.toast,.intro-name .box" +
        "{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}",
    );
  }
  if (on("anim")) css.push(".leyline.flow,.mk-badge.pulse,.wave,.spk{animation:none!important}");
  /* 애니메이션 항목별 귀속 — 어느 하나가 몫을 독차지하는지 가린다. */
  if (on("ley")) css.push(".leyline.flow{animation:none!important}");
  if (on("pulse")) css.push(".mk-badge.pulse{animation:none!important}");
  if (on("wave")) css.push(".wave{animation:none!important}");
  if (on("spk")) css.push(".spk{animation:none!important}");
  if (on("particles")) css.push(".fireflies,.wx{display:none!important}");
  if (css.length) await page.addStyleTag({ content: css.join("\n") });

  const svgFilters = ["caustic", "glowf", "soft"].filter((k) => on(k));
  if (svgFilters.length) {
    await page.evaluate((keys) => {
      const want = keys.map((k) => (k === "glowf" ? "glowF" : k));
      for (const el of document.querySelectorAll("[filter]")) {
        const v = el.getAttribute("filter") || "";
        if (want.some((k) => v.includes(k))) el.removeAttribute("filter");
      }
    }, svgFilters);
  }
}

/* ───────────────────────────── 페이지에 심는 것 ───────────────────────────── */

function seedStorage(payload) {
  try {
    localStorage.setItem(payload.profileListKey, JSON.stringify(payload.profileList));
    localStorage.setItem(payload.gameKey, JSON.stringify(payload.game));
    localStorage.setItem(payload.blueprintKey, JSON.stringify(payload.blueprintEntry));
  } catch {}
}

/**
 * 관찰자·프로브. 🔴 문서보다 먼저 설치해야 한다 — 로드 뒤에 붙이면 지나간 엔트리를 못 본다.
 * 카운터는 원본에 위임만 하는 순수 래퍼다(동작을 바꾸지 않는다).
 */
function installProbes() {
  const events = [];
  const counts = Object.create(null);
  const pointers = new Map();
  let frames = null;
  let rafId = 0;

  const bump = (k) => {
    counts[k] = (counts[k] || 0) + 1;
  };
  const wrap = (obj, method, key) => {
    const original = obj[method];
    if (typeof original !== "function") return;
    obj[method] = function (...rest) {
      bump(key);
      return original.apply(this, rest);
    };
  };
  wrap(Element.prototype, "getBoundingClientRect", "getBoundingClientRect");
  wrap(Element.prototype, "setAttribute", "setAttribute");
  wrap(Element.prototype, "closest", "closest");
  wrap(Document.prototype, "elementFromPoint", "elementFromPoint");

  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        events.push({
          name: e.name,
          duration: e.duration,
          inputDelay: Math.max(0, e.processingStart - e.startTime),
          processing: Math.max(0, e.processingEnd - e.processingStart),
          render: Math.max(0, e.startTime + e.duration - e.processingEnd),
        });
      }
    }).observe({ type: "event", durationThreshold: 16, buffered: true });
  } catch {}

  for (const type of ["pointerdown", "pointerup", "pointercancel"]) {
    window.addEventListener(
      type,
      (e) => {
        if (type === "pointerdown") pointers.set(e.pointerId, Date.now());
        else pointers.delete(e.pointerId);
      },
      { capture: true, passive: true },
    );
  }

  window.__isl = {
    resetEvents() {
      events.length = 0;
    },
    worstEvent() {
      let worst = null;
      for (const e of events) if (!worst || e.duration > worst.duration) worst = e;
      return worst;
    },
    resetCounts() {
      for (const k of Object.keys(counts)) delete counts[k];
    },
    readCounts() {
      return Object.assign({}, counts);
    },
    startFrames() {
      frames = [];
      let last = performance.now();
      const tick = (now) => {
        frames.push(now - last);
        last = now;
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    },
    stopFrames() {
      cancelAnimationFrame(rafId);
      const list = (frames || []).slice(1).sort((a, b) => a - b);
      frames = null;
      if (!list.length) return { median: 0, p95: 0, max: 0, count: 0 };
      const at = (q) => list[Math.min(list.length - 1, Math.floor(list.length * q))];
      return { median: at(0.5), p95: at(0.95), max: list[list.length - 1], count: list.length };
    },
    leftoverPointers() {
      return Array.from(pointers.keys());
    },
  };
}

/* ───────────────────────────── 보고 ───────────────────────────── */

function report(all) {
  const lines = [];
  const push = (s) => {
    lines.push(s);
    console.log(s);
  };

  const g = all[0].gate;
  push("## 화면 상태 (1회차)");
  push("");
  push(`- \`body.fx-low\`: **${g.fxLow}** · 궁 ${g.palaces}개 · 흐르는 공명선 ${g.leyFlow}개`);
  push(`- SVG 필터 인스턴스: caustic ${g.caustic} · glowF ${g.glowF} · soft ${g.soft}`);
  push(`- 활성 backdrop-filter(맵 위 상시): ${g.backdrops}개 · 반딧불 ${g.fireflies} · 날씨 파티클 ${g.weather}`);
  push("");

  if (all[0].m2.length) {
    push("## M2 탭 성공률 — 지터 N px (🔴 1순위 지표)");
    push("");
    push("| 지터 px | 축방향 | 대각선 |");
    push("|---:|---:|---:|");
    for (const step of SLOP_STEPS) {
      push(`| ${step} | ${pct(sumSlop(all, step, "axis"))} | ${pct(sumSlop(all, step, "diag"))} |`);
    }
    push("");
  }

  if (all[0].m5) {
    push("## M5 핀치 줌 유지");
    push("");
    push(`- 줌이 유지된 회차: **${all.filter((r) => r.m5.kept).length}/${all.length}**`);
    for (const r of all) {
      push(
        `  - 시작 ${r.m5.before.toFixed(3)} → 핀치 후 ${r.m5.zoomed.toFixed(3)} → 손 뗀 뒤 ${r.m5.after.toFixed(3)}${r.m5.kept ? "" : "  ← 되돌아감"}`,
      );
    }
    push("");
  }

  /* 🔴 밴드는 **회차별 대표값**으로 잡는다(perf:home 과 같은 방식). 표본을 통째로 풀면
     이상치 탭 하나가 밴드를 벌려 진짜 개선을 조용히 "겹침"으로 만든다. */
  push("## M1 탭 지연 (ms · 회차 중앙값의 min~max 밴드)");
  push("");
  const perRun = (pick) => all.map((r) => median(r.m1.map(pick)));
  push("| 성분 | min | 중앙 | max | 회차 |");
  push("|---|---:|---:|---:|---:|");
  push(`| 전체 duration | ${band(perRun((s) => s.duration))} |`);
  push(`| 입력 지연 | ${band(perRun((s) => s.inputDelay))} |`);
  push(`| 처리 | ${band(perRun((s) => s.processing))} |`);
  push(`| 렌더 | ${band(perRun((s) => s.render))} |`);
  push("");
  push(`- 참고(전 표본 풀링, n=${all.flatMap((r) => r.m1).length}): 입력 지연 ${band(all.flatMap((r) => r.m1.map((s) => s.inputDelay)))}`);
  push("");

  push("## M3 팬 중 프레임 간격 (ms)");
  push("");
  push("| 성분 | min | 중앙 | max | 표본 |");
  push("|---|---:|---:|---:|---:|");
  push(`| 중앙값 | ${band(all.map((r) => r.m3.median))} |`);
  push(`| p95 | ${band(all.map((r) => r.m3.p95))} |`);
  push(`| 최대 | ${band(all.map((r) => r.m3.max))} |`);
  push("");

  push("## M4 팬 1회의 DOM 호출 횟수 (🔴 노이즈 없음 — 1차 판정용)");
  push("");
  const keys = Array.from(new Set(all.flatMap((r) => Object.keys(r.m4)))).sort();
  push("| 호출 | min | 중앙 | max |");
  push("|---|---:|---:|---:|");
  for (const k of keys) {
    const vals = all.map((r) => r.m4[k] || 0);
    push(`| \`${k}\` | ${Math.min(...vals)} | ${median(vals).toFixed(0)} | ${Math.max(...vals)} |`);
  }
  push("");

  if (all[0].m6.length) {
    push("## M6 히트 밀도 — 궁 중심 44×44px 안에서 그 궁이 맞는 비율");
    push("");
    const rates = all[0].m6.map((p) => p.rate44).sort((a, b) => a - b);
    push(`- 중앙값 **${median(rates).toFixed(0)}%** · 최악 **${rates[0]}%** · 최고 ${rates[rates.length - 1]}%`);
    const worst = all[0].m6.slice().sort((a, b) => a.rate44 - b.rate44).slice(0, 4);
    for (const p of worst) push(`  - ${p.name}: ${p.rate44}% (다른 궁 ${p.other} · 빈곳 ${p.miss})`);
    push("");
  }

  push("## M7 잔여 포인터");
  push("");
  const leftover = all.map((r) => r.m7.length);
  push(`- 회차별 남은 pointerId 수: ${leftover.join(", ")} ${leftover.some((n) => n > 0) ? "← 🔴 잔여 있음" : "(없음)"}`);
  push("");

  if (args.out) {
    const head = [
      `# perf:island — ${args.label}`,
      "",
      `- URL: ${targetUrl}`,
      `- Runs: ${args.runs} · CPU ${args.cpu}x · viewport ${args.width}x${args.height} · phase ${args.phase}`,
      `- 절제: ${args.ablate.length ? args.ablate.join(",") : "없음"}`,
      `- 픽스처: biome=${seed.summary.biome} weather=${seed.summary.weather} 공명=${seed.summary.edges}(flow ${seed.summary.flowEdges})`,
      "",
    ];
    fs.writeFileSync(args.out, head.concat(lines).join("\n"), "utf8");
    console.log(`\n리포트 저장: ${args.out}`);
  }
}

function sumSlop(all, step, axis) {
  let ok = 0;
  let tries = 0;
  for (const r of all) {
    for (const s of r.m2) {
      if (s.step === step && s.axis === axis) {
        ok += s.ok;
        tries += s.tries;
      }
    }
  }
  return { ok, tries };
}

function pct({ ok, tries }) {
  if (!tries) return "—";
  const p = Math.round((ok / tries) * 100);
  return `${p}% (${ok}/${tries})`;
}

function band(values) {
  const list = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!list.length) return "— | — | — | 0";
  return `${list[0].toFixed(1)} | ${median(list).toFixed(1)} | ${list[list.length - 1].toFixed(1)} | ${list.length}`;
}

function median(values) {
  const list = values.slice().sort((a, b) => a - b);
  if (!list.length) return 0;
  const mid = Math.floor(list.length / 2);
  return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
}

/* ───────────────────────────── 인프라 ───────────────────────────── */

function parseArgs(argv) {
  const get = (name, fallback) => {
    const hit = argv.find((arg) => arg.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
  };
  const desktop = get("desktop", "") === "1" || argv.includes("--desktop");
  return {
    runs: Math.max(1, parseInt(get("runs", "3"), 10)),
    cpu: Math.max(1, parseInt(get("cpu", "4"), 10)),
    settle: Math.max(0, parseInt(get("settle", "1500"), 10)),
    panSteps: Math.max(4, parseInt(get("pan-steps", "60"), 10)),
    skip: get("skip", "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
    tapSamples: Math.max(1, parseInt(get("tap-samples", "6"), 10)),
    label: get("label", "run"),
    island: get("island", ""),
    url: get("url", ""),
    out: get("out", ""),
    phase: get("phase", "ph-night"),
    ablate: get("ablate", "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
    desktop,
    width: parseInt(get("width", desktop ? "1280" : "412"), 10),
    height: parseInt(get("height", desktop ? "800" : "823"), 10),
    dsf: Number(get("dsf", desktop ? "1" : "1.75")),
  };
}

/**
 * 🔴 낡은 산출물을 재지 않기 위한 단언.
 * 기존 측정기(measure-home-interaction.mjs:44)는 `dist/index.html` 이 있으면 staticRoot 를 dist 로
 * 잡는데, 이 레포의 `dist/destiny-island.html` 은 루트와 크기가 다른 낡은 사본이다(실측).
 * 여기서는 루트로 고정하고, 실제로 서빙되는 바이트가 루트 파일과 같은지 확인한다.
 */
function assertServingCurrentFile(port) {
  const onDisk = fs.readFileSync(args.island ? path.resolve(args.island) : ISLAND_FILE);
  return new Promise((resolve, reject) => {
    http
      .get({ host: "127.0.0.1", port, path: ISLAND_PATH }, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const served = Buffer.concat(chunks);
          if (served.length !== onDisk.length) {
            reject(new Error(`서빙 바이트(${served.length})가 루트 파일(${onDisk.length})과 다르다. 측정을 중단한다.`));
            return;
          }
          resolve();
        });
      })
      .on("error", reject);
  });
}

function startStaticServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    let filePath = path.join(root, urlPath);
    if (!filePath.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    /* --island=<경로> 로 이 한 파일만 갈아끼운다. 수정 전/후를 A/B 할 때 작업 트리를 되돌리지 않고
       `git show HEAD:destiny-island.html` 을 임시 파일로 뽑아 재기 위한 것이다. */
    if (args.island && urlPath === ISLAND_PATH) filePath = path.resolve(args.island);
    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      "content-type": contentType(ext),
      "cache-control": ext === ".html" ? "no-store" : "public, max-age=3600",
    };
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
    ".ttf": "font/ttf",
    ".xml": "application/xml",
    ".txt": "text/plain; charset=utf-8",
  };
  return map[ext] || "application/octet-stream";
}

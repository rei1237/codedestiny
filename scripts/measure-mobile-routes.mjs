#!/usr/bin/env node
/**
 * measure:mobile-routes — 기능 라우트 하나(또는 여러 개)를 모바일 뷰포트에서 실제로 렌더해
 * 인체공학 축(docs/context/design-and-ui.md:19 — 탭 타깃 44px · 입력 16px · 가로 오버플로 ·
 * safe-area)을 기하로 재는 계측기. 기능별 모바일 순회 원장(docs/handoff/mobile-feature-sweep.md)의
 * 스캔 열을 채우는 도구다.
 *
 * 🔴 verify:* 가 아니라 measure:* 인 이유 — verify:* 는 scripts/verify-guard-wiring.mjs 가
 * CI 배선을 강제하는데, 이 스크립트는 dist 빌드 + 브라우저 기동이 필요해 PR CI 게이트가 될 수
 * 없다(measure-home-score.mjs 와 같은 사유). 발견(findings)은 데이터이지 실패가 아니다 —
 * exit 1 은 측정 자체가 무효(INVALID)일 때만 낸다. verify:* 로 개명하지 말 것.
 *
 * 실행:
 *   npm run build   (App Router 라우트를 재려면 dist/ 가 최신이어야 한다)
 *   npm run measure:mobile-routes -- --routes=/master-love-codex/,/fortune-tea-house/
 *   npm run measure:mobile-routes -- --routes=/tadagochi.html --target=source   (루트 정적 셸)
 *   npm run measure:mobile-routes -- --routes=/saju/ --target=https://staging.example  (배포본)
 *
 * 옵션: --viewports=412x823,360x800 (기본. 412×823 DPR1.75 = Lighthouse Moto G Power 정본,
 *       360×800 은 #1435 가 실증한 좁은 폭 진단 축 — 기하는 CSS px 기준이라 DPR 은 1.75 고정)
 *       --insets=0,47 (safe-area-inset-bottom. 47 은 갤럭시 M15 5G 웹뷰 실측)
 *       --settle=2500 (로드 후 하이드레이션 대기 ms) --out=DIR --label=이름 --allow-stale
 */

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** 갤럭시 M15 5G 급 프로필 — verify-app-bottom-clearance.mjs:180-188 에서 복사 */
const DEVICE_SCALE_FACTOR = 1.75;
const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 16; SM-M156B) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/140.0.0.0 Mobile Safari/537.36";

/** 탭 타깃 최소 변 — measure-home-score.mjs:72 와 같은 값 */
const MIN_TAP_PX = 44;
/** iOS 자동 확대 방지 하한 (design-and-ui.md 인체공학 계약) */
const MIN_INPUT_FONT_PX = 16;
/** 안전선 위 최소 여유 — verify-app-bottom-clearance.mjs:46 (하단 앵커 관용구 10~22px 의 하한) */
const MIN_GAP = 12;
/** 전면 배경/백드롭 제외 비율 — verify-mobile-bottom-nav-clearance.mjs 와 같은 값 */
const BACKDROP_HEIGHT_RATIO = 0.6;

/** measure-home-score.mjs:82-94 에서 복사 — 홈 축2 진단과 같은 셀렉터로 세야 수치가 비교된다 */
const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input:not([type=hidden])",
  "select",
  "textarea",
  "summary",
  "[role=button]",
  "[role=link]",
  "[role=tab]",
  "[data-action]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const INPUT_SELECTOR =
  "input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]),select,textarea";

/** 본문 "읽는 열" 후보 — #1435 가 잰 축(360px 에서 254px 문제 / 274px 수용)을 재현 */
const READING_SELECTOR = 'p,li,blockquote,[class*="reading"],[class*="bubble"]';

/** 몰입형 라우트의 자체 이탈 컨트롤 휴리스틱(advisory — 미발견은 실패가 아니라 수동 확인) */
const EXIT_SELECTOR = [
  'a[href="/"]',
  'a[href="/index.html"]',
  'a[href^="/?"]',
  '[aria-label*="홈"]',
  '[aria-label*="뒤로"]',
  '[aria-label*="닫기"]',
  '[aria-label*="back" i]',
  '[aria-label*="home" i]',
  '[aria-label*="close" i]',
  '[class*="backButton"]',
  '[class*="homeButton"]',
  '[class*="closeButton"]',
  // 공용 크롬리스 이탈 나브(AppChrome FeatureBackHomeNav). aria-label 이 "이전 페이지로 이동",
  // 홈 버튼은 텍스트뿐이라 위 패턴에 안 걸려 렌더되는데도 매번 "수동확인"이 났다(낙샤트라 2026-09-02).
  ".cd-feature-nav button",
].join(",");

function parseArgs(argv) {
  const args = {
    routes: [],
    target: "dist",
    viewports: [
      { width: 412, height: 823 },
      { width: 360, height: 800 },
    ],
    insets: [0, 47],
    settle: 2500,
    out: path.join(os.tmpdir(), "code-destiny-mobile-routes"),
    label: new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19),
    allowStale: false,
  };
  for (const raw of argv) {
    const [key, value = ""] = raw.split(/=(.*)/s);
    if (key === "--routes") args.routes = value.split(",").map((r) => r.trim()).filter(Boolean);
    else if (key === "--target") args.target = value;
    else if (key === "--viewports")
      args.viewports = value.split(",").map((v) => {
        const [w, h] = v.toLowerCase().split("x").map(Number);
        if (!Number.isFinite(w) || !Number.isFinite(h)) throw new Error(`--viewports 형식 오류: ${v}`);
        return { width: w, height: h };
      });
    else if (key === "--insets") args.insets = value.split(",").map(Number);
    else if (key === "--settle") args.settle = Number(value);
    else if (key === "--out") args.out = path.resolve(value);
    else if (key === "--label") args.label = value;
    else if (key === "--allow-stale") args.allowStale = true;
    else throw new Error(`알 수 없는 인자: ${raw} (지원: --routes --target --viewports --insets --settle --out --label --allow-stale)`);
  }
  if (!args.routes.length) throw new Error("--routes=/route/ 가 필요합니다 (쉼표로 여러 개).");
  /* trailingSlash export 구조 — .html 파일이 아니면 후행 슬래시를 강제한다 */
  args.routes = args.routes.map((r) => {
    let route = r.startsWith("/") ? r : `/${r}`;
    if (!route.endsWith(".html") && !route.endsWith("/")) route += "/";
    return route;
  });
  return args;
}

/* dist 신선도 fail-closed — verify-mobile-cdp-smoke.mjs:791-832 의 G-8 패턴을 App Router
   입력(app/, styles/, src/)으로 바꿔 적용. 낡은 산출물을 조용히 재는 것을 막는다. */
function assertDistFresh() {
  const distIndex = path.join(repoRoot, "dist", "index.html");
  if (!fs.existsSync(distIndex)) {
    throw new Error("dist/index.html 이 없습니다 — 먼저 `npm run build` 를 돌리거나 --target=source 를 쓰세요.");
  }
  const builtAt = fs.statSync(distIndex).mtimeMs;
  const roots = ["app", "styles", "src"].map((p) => path.join(repoRoot, p)).filter((p) => fs.existsSync(p));
  const stack = [...roots];
  while (stack.length) {
    const current = stack.pop();
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(current)) {
        if (entry === "node_modules" || entry.startsWith(".")) continue;
        stack.push(path.join(current, entry));
      }
      continue;
    }
    if (stat.mtimeMs > builtAt) {
      throw new Error(
        `dist/ 가 ${path.relative(repoRoot, current)} 보다 낡았습니다 — 낡은 화면을 재게 됩니다. ` +
          "재빌드(npm run build)하거나, 의도한 것이면 --allow-stale 을 붙이세요.",
      );
    }
  }
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
};

/** 정적 서버 — verify-app-bottom-clearance.mjs:69-93 에서 복사(루트 인자화) */
function serveStatic(rootDir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      const relative = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
      let filePath = path.join(rootDir, relative);
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403).end();
        return;
      }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }
      fs.readFile(filePath, (error, data) => {
        if (error) {
          res.writeHead(404, { "content-type": "text/plain" }).end("not found");
          return;
        }
        res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
        res.end(data);
      });
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

/** 라우트가 서빙 루트에 실재하는지 — 없는 라우트를 "발견 0건"으로 통과시키지 않는다(fail-closed) */
function routeFileExists(rootDir, route) {
  const relative = route.endsWith(".html") ? route.replace(/^\/+/, "") : path.join(route.replace(/^\/+/, ""), "index.html");
  return fs.existsSync(path.join(rootDir, relative));
}

/**
 * 브라우저 안 계측 본체. 스크롤 스윕은 measure-home-score.mjs:287-334 에서 복사 —
 * content-visibility:auto 자식은 뷰포트에 들어와야 rect 가 실현되므로 한 화면씩 내려가며
 * 그 순간 보이는 것을 누적한다. env 센서·fail-closed 는 verify-app-bottom-clearance.mjs:99-104,
 * 223-241 패턴.
 */
async function probe(params) {
  const { selectors, minTap, minInputFont, minGap, backdropRatio, inset } = params;
  const settle = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const visible = (el, rect) => {
    if (rect.width <= 0 || rect.height <= 0) return false;
    if (typeof el.checkVisibility === "function") {
      return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    }
    const cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) >= 0.05;
  };
  const describe = (el) => {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";
    const cls =
      !id && typeof el.className === "string" && el.className.trim()
        ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
        : "";
    const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 14);
    return `${tag}${id}${cls}${text ? ` "${text}"` : ""}`;
  };

  const out = { visibilityState: document.visibilityState, innerWidth: window.innerWidth, innerHeight: window.innerHeight };

  // 🔴 safe-area 에뮬레이션이 실제로 먹었는지 — 안 먹었으면 측정 자체가 무효다.
  const sensor = document.createElement("div");
  sensor.style.cssText = "position:fixed;left:-9999px;padding-bottom:env(safe-area-inset-bottom,0px)";
  document.body.appendChild(sensor);
  out.envBottom = parseFloat(getComputedStyle(sensor).paddingBottom) || 0;
  sensor.remove();

  const seenTap = new Set();
  const seenInput = new Set();
  const seenReading = new Set();
  const seenOverflow = new Set();
  const seenFixed = new Set();
  const smallTargets = [];
  const inputsUnder = [];
  const readingBlocks = [];
  const overflowOffenders = [];
  const fixedBottom = [];
  let scanned = 0;
  let inputsTotal = 0;
  let docOverflow = false;

  const scanFixedBottom = () => {
    for (const el of document.querySelectorAll("body *")) {
      if (seenFixed.has(el)) continue;
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" && cs.position !== "sticky") continue;
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) <= 0.01) continue;
      if (cs.pointerEvents === "none") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (rect.height >= window.innerHeight * backdropRatio) continue;
      // 하단에 붙은 것만 — bottom 앵커가 있거나 뷰포트 하단 80px 안에서 끝나는 것
      if (cs.bottom === "auto" && rect.bottom < window.innerHeight - 80) continue;
      if (rect.top >= window.innerHeight) continue;
      seenFixed.add(el);
      const gap = Number((window.innerHeight - inset - rect.bottom).toFixed(1));
      // 🔴 판정은 contentGap — 박스 하단만 재면 padding-bottom:env(safe-area-inset-bottom) 관용구
      // (배경은 화면 끝까지, 내용물은 인셋 위 — 채팅 컴포저의 정석)가 전부 -inset 오탐이 된다
      // (fortune-chat 실측 2026-09-02: 올바른 컴포저가 -47px 로 찍혔다). env() 미배선 바는
      // 인셋을 줘도 패딩이 안 자라 여전히 걸리므로 이 완화는 fail-open 이 아니다.
      const paddingBottom = Number((parseFloat(cs.paddingBottom) || 0).toFixed(1));
      const contentGap = Number((gap + paddingBottom).toFixed(1));
      fixedBottom.push({ label: describe(el), position: cs.position, cssBottom: cs.bottom, bottom: Number(rect.bottom.toFixed(1)), gap, paddingBottom, contentGap });
    }
  };

  const step = window.innerHeight;
  let steps = 0;
  for (let y = 0; y < document.documentElement.scrollHeight && steps < 80; y += step) {
    window.scrollTo(0, y);
    await settle();
    steps += 1;

    if (document.documentElement.scrollWidth > window.innerWidth + 1) {
      docOverflow = true;
      for (const el of document.body.querySelectorAll("*")) {
        if (seenOverflow.has(el)) continue;
        const rect = el.getBoundingClientRect();
        if (!visible(el, rect)) continue;
        const overRight = rect.right - window.innerWidth;
        const overLeft = -rect.left;
        if (overRight <= 1 && overLeft <= 1) continue;
        seenOverflow.add(el);
        overflowOffenders.push({ label: describe(el), overPx: Number(Math.max(overRight, overLeft).toFixed(1)) });
      }
    }

    const nodes = document.querySelectorAll(selectors.interactive);
    scanned = Math.max(scanned, nodes.length);
    for (const el of nodes) {
      if (seenTap.has(el)) continue;
      const rect = el.getBoundingClientRect();
      if (!visible(el, rect)) continue;
      seenTap.add(el);
      if (rect.width < minTap || rect.height < minTap) {
        smallTargets.push({ label: describe(el), w: Number(rect.width.toFixed(1)), h: Number(rect.height.toFixed(1)) });
      }
    }

    for (const el of document.querySelectorAll(selectors.input)) {
      if (seenInput.has(el)) continue;
      const rect = el.getBoundingClientRect();
      if (!visible(el, rect)) continue;
      seenInput.add(el);
      inputsTotal += 1;
      const fontSize = parseFloat(getComputedStyle(el).fontSize);
      if (fontSize < minInputFont) inputsUnder.push({ label: describe(el), fontSize: Number(fontSize.toFixed(1)) });
    }

    for (const el of document.querySelectorAll(selectors.reading)) {
      if (seenReading.has(el)) continue;
      const textLength = (el.textContent || "").trim().length;
      if (textLength < 80) continue;
      const rect = el.getBoundingClientRect();
      if (!visible(el, rect)) continue;
      seenReading.add(el);
      const cs = getComputedStyle(el);
      const contentWidth = el.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
      readingBlocks.push({ label: describe(el), textLength, width: Number(contentWidth.toFixed(1)) });
    }

    if (steps === 1 || y + step >= document.documentElement.scrollHeight) scanFixedBottom();
  }
  window.scrollTo(0, 0);
  await settle();
  scanFixedBottom();

  // 이탈 컨트롤 휴리스틱 — 첫 화면(스크롤 0) 기준
  const exitFound = [];
  for (const el of document.querySelectorAll(selectors.exit)) {
    const rect = el.getBoundingClientRect();
    if (!visible(el, rect)) continue;
    if (rect.top >= window.innerHeight) continue;
    exitFound.push(describe(el));
    if (exitFound.length >= 5) break;
  }
  const bottomNav = document.querySelector("#cdMobileBottomNav, .cd-mobile-bottom-nav");
  const bottomNavVisible = !!bottomNav && visible(bottomNav, bottomNav.getBoundingClientRect());

  const readingTop = readingBlocks.sort((a, b) => b.textLength - a.textLength).slice(0, 5);
  const widths = readingTop.map((b) => b.width).sort((a, b) => a - b);

  return {
    ...out,
    steps,
    scanned,
    docHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
    visibleInteractive: seenTap.size,
    docOverflow,
    overflowOffenders: overflowOffenders.sort((a, b) => b.overPx - a.overPx).slice(0, 10),
    smallTapTargets: smallTargets.length,
    smallTapWorst: smallTargets.sort((a, b) => Math.min(a.w, a.h) - Math.min(b.w, b.h)).slice(0, 15),
    inputsTotal,
    inputsUnder16: inputsUnder,
    readingBlocksSeen: seenReading.size,
    readingCol: widths.length
      ? { min: widths[0], median: widths[Math.floor(widths.length / 2)], samples: readingTop }
      : null,
    fixedBottom: fixedBottom.sort((a, b) => a.contentGap - b.contentGap),
    fixedBottomViolations: fixedBottom.filter((f) => f.contentGap < minGap),
    bottomNavVisible,
    exitFound,
  };
}

async function measureLeg(browser, origin, route, viewport, inset, settleMs) {
  const context = await browser.newContext({
    viewport,
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    userAgent: MOBILE_UA,
  });
  try {
    const page = await context.newPage();
    if (inset > 0) {
      const client = await context.newCDPSession(page);
      try {
        await client.send("Emulation.setSafeAreaInsetsOverride", {
          insets: { top: 0, topMax: 0, right: 0, rightMax: 0, bottom: inset, bottomMax: inset, left: 0, leftMax: 0 },
        });
      } catch (error) {
        return { valid: false, invalidReason: `safe-area 에뮬레이션 불가 — ${error.message}` };
      }
    }
    const response = await page.goto(`${origin}${route}`, { waitUntil: "load", timeout: 60000 });
    if (response && response.status() >= 400) {
      return { valid: false, invalidReason: `HTTP ${response.status()}` };
    }
    await page.waitForTimeout(settleMs);
    const result = await page.evaluate(probe, {
      selectors: { interactive: INTERACTIVE_SELECTOR, input: INPUT_SELECTOR, reading: READING_SELECTOR, exit: EXIT_SELECTOR },
      minTap: MIN_TAP_PX,
      minInputFont: MIN_INPUT_FONT_PX,
      minGap: MIN_GAP,
      backdropRatio: BACKDROP_HEIGHT_RATIO,
      inset,
    });

    // 🔴 fail-closed 3종 — 앱 백그라운드/에뮬레이션 불발/빈 화면을 "발견 0건"으로 통과시키지 않는다.
    if (result.visibilityState !== "visible") {
      return { valid: false, invalidReason: `visibilityState=${result.visibilityState} — 레이아웃이 멈춰 판정 무효`, ...result };
    }
    if (result.envBottom !== inset) {
      return { valid: false, invalidReason: `env(safe-area-inset-bottom)=${result.envBottom}px (기대 ${inset}px) — 에뮬레이션 불발`, ...result };
    }
    if (!result.scanned || !result.visibleInteractive) {
      return { valid: false, invalidReason: `보이는 조작 요소 0건(훑은 ${result.scanned}개) — 페이지가 안 떴거나 렌더 전`, ...result };
    }
    return { valid: true, ...result };
  } catch (error) {
    return { valid: false, invalidReason: `로드/계측 실패 — ${error.message}` };
  } finally {
    await context.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let origin = null;
  let server = null;
  let servedRoot = null;
  if (/^https?:\/\//.test(args.target)) {
    origin = args.target.replace(/\/+$/, "");
  } else if (args.target === "dist") {
    if (!args.allowStale) assertDistFresh();
    servedRoot = path.join(repoRoot, "dist");
    server = await serveStatic(servedRoot);
    origin = `http://127.0.0.1:${server.address().port}`;
  } else if (args.target === "source") {
    servedRoot = repoRoot;
    server = await serveStatic(servedRoot);
    origin = `http://127.0.0.1:${server.address().port}`;
  } else {
    throw new Error(`--target 은 dist | source | http(s) URL 이어야 합니다 (받음: ${args.target})`);
  }

  console.log(`[measure:mobile-routes] target=${args.target} origin=${origin}`);
  console.log(
    `  viewports=${args.viewports.map((v) => `${v.width}x${v.height}`).join(",")} (DPR ${DEVICE_SCALE_FACTOR}) insets=${args.insets.join(",")} settle=${args.settle}ms`,
  );

  const browser = await chromium.launch();
  const runs = [];
  let invalidCount = 0;
  try {
    for (const route of args.routes) {
      const legs = [];
      if (servedRoot && !routeFileExists(servedRoot, route)) {
        // 🔴 없는 라우트를 스캔 0건 초록으로 넘기지 않는다.
        console.error(`✗ ${route} — 서빙 루트에 산출물이 없다(${args.target}). 라우트 오탈자 또는 빌드 누락.`);
        invalidCount += 1;
        runs.push({ route, missing: true, legs });
        continue;
      }
      for (const viewport of args.viewports) {
        for (const inset of args.insets) {
          const leg = await measureLeg(browser, origin, route, viewport, inset, args.settle);
          leg.viewport = `${viewport.width}x${viewport.height}`;
          leg.inset = inset;
          legs.push(leg);
          const tag = `${route} ${leg.viewport} inset=${inset}`;
          if (!leg.valid) {
            invalidCount += 1;
            console.error(`✗ INVALID ${tag} — ${leg.invalidReason}`);
            continue;
          }
          const sa = leg.fixedBottom.length ? `${Math.min(...leg.fixedBottom.map((f) => f.contentGap))}px` : "—";
          console.log(
            `· ${tag} scanned=${leg.visibleInteractive}/${leg.scanned} ` +
              `OF=${leg.docOverflow ? leg.overflowOffenders.length + "건" : "0"} ` +
              `TT<44=${leg.smallTapTargets} IN<16=${leg.inputsUnder16.length}/${leg.inputsTotal} ` +
              `SAgap=${sa} 열폭=${leg.readingCol ? `${leg.readingCol.min}px` : "—"} ` +
              `이탈=${leg.bottomNavVisible ? "탭바" : leg.exitFound.length ? "유" : "수동확인"}`,
          );
          for (const off of leg.overflowOffenders) console.log(`    ↔ ${off.overPx}px 초과: ${off.label}`);
          for (const v of leg.fixedBottomViolations)
            console.log(`    ⚠ safe-area 내용물 여유 ${v.contentGap}px (박스 ${v.gap}px + 하단패딩 ${v.paddingBottom}px): ${v.label}`);
        }
      }
      runs.push({ route, legs });
    }
  } finally {
    await browser.close();
    if (server) server.close();
  }

  fs.mkdirSync(args.out, { recursive: true });
  const outFile = path.join(args.out, `mobile-routes-${args.label}.json`);
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      { measuredAt: new Date().toISOString(), target: args.target, viewports: args.viewports, insets: args.insets, runs },
      null,
      2,
    ),
  );
  console.log(`[measure:mobile-routes] JSON → ${outFile}`);

  if (invalidCount) {
    console.error(`[measure:mobile-routes] INVALID ${invalidCount}건 — 측정이 무효인 레그가 있다. 발견 수치로 쓰지 말 것.`);
    process.exit(1);
  }
}

await main();

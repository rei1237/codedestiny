#!/usr/bin/env node
/**
 * verify-mobile-bottom-nav-clearance
 *
 * 하단 탭바(#cdMobileBottomNav) 위에 떠야 하는 body 직속 fixed UI 가 실제로 그 위에 있는지
 * 실브라우저에서 잰다. 정적으로는 안 보이는 축이다 — 탭바가 화면 바닥에서 차지하는 높이는
 *   max(6px, safe-area-inset-bottom)   ← 자기 bottom (index.html 모바일 플로팅 필 규칙)
 * + 71px + safe-area-inset-bottom      ← 자기 높이 (styles/mobile-lite.css 의 padding-bottom)
 * 이라 safe-area 를 두 번 센다. 그래서 "64px + safe" 같은 손어림 상수는 safe-area 가 큰 기기에서
 * 반드시 모자라고, 그 UI 는 탭바(z-index:980) 뒤로 통째로 숨는다. 실측 2026-08-29 에
 * .cd-sticky-cta 가 safe=0 에서 13px, safe=47 에서 52px(자기 높이 전부) 가려져 있었다.
 *
 * 판정:
 *  1) 탭바와 탭 5개가 있다                                  (없으면 실패 — 잴 대상이 없다)
 *  2) 탭바보다 z-index 가 낮은 하단 고정 UI 는 탭바와 겹치지 않는다
 *  3) 탭 5개는 전부 그 좌표에서 자기 자신이 잡힌다           (다른 fixed UI 가 탭을 훔치지 않는다)
 *
 * safe-area-inset-bottom 을 0 과 47 두 값으로 돌린다. 47 은 갤럭시 M15 5G 웹뷰의 실측값이다
 * (그 값에서 탭바 높이가 118px 로 재현된다 — 2026-08-29 기기 실측과 같다).
 *
 * 홈에서 히어로 CTA 를 지나 스크롤한 상태 하나만 본다. 결과 화면(#resultPage)도 2026-08-29 에
 * 같이 쟀는데 탭바·CTA 가 둘 다 position:fixed 라 기하가 홈과 동일했다(bottom 85px/173px,
 * 겹침 0). 그래서 결과를 만들려고 사주 엔진을 돌리지는 않는다.
 *
 * 실행: npm run verify:mobile-bottom-nav-clearance
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const VIEWPORT = { width: 390, height: 844 };
/** 0 = 데스크탑 에뮬레이션 기본, 47 = 갤럭시 M15 5G 웹뷰 실측(탭바 118px 재현) */
const SAFE_AREA_INSETS = [0, 47];
/** 전면 배경/백드롭은 탭바에 가려도 문제가 아니다 — 뷰포트의 이만큼 이상을 덮으면 후보에서 뺀다. */
const BACKDROP_HEIGHT_RATIO = 0.6;

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
};

function serveRepo() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      const relative = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
      const filePath = path.join(repoRoot, relative);
      if (!filePath.startsWith(repoRoot)) {
        res.writeHead(403).end();
        return;
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

/** 브라우저 안에서 잰다. 대상은 손으로 열거하지 않고 렌더된 문서에서 전수 발견한다. */
function probe(backdropRatio) {
  const nav = document.getElementById("cdMobileBottomNav");
  if (!nav) return { navMissing: true, visibilityState: document.visibilityState };
  const navStyle = getComputedStyle(nav);
  if (navStyle.display === "none" || navStyle.visibility === "hidden") {
    return { navHidden: true, visibilityState: document.visibilityState };
  }
  const navRect = nav.getBoundingClientRect();
  const navZ = Number(navStyle.zIndex);

  const describe = (el) => {
    const r = el.getBoundingClientRect();
    return (
      (el.id ? "#" + el.id : el.tagName.toLowerCase()) +
      (typeof el.className === "string" && el.className.trim()
        ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
        : "") +
      ` [${r.top.toFixed(1)}..${r.bottom.toFixed(1)}]`
    );
  };

  const candidates = [];
  const violations = [];
  let scanned = 0;
  for (const el of document.querySelectorAll("body *")) {
    scanned++;
    if (el === nav || nav.contains(el) || el.contains(nav)) continue;
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed") continue;
    if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) <= 0.01) continue;
    if (cs.pointerEvents === "none") continue;
    if (cs.bottom === "auto") continue;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    if (rect.height >= window.innerHeight * backdropRatio) continue;
    const z = Number(cs.zIndex);
    // 탭바보다 위에 있는 것(쿠키 배너 등)은 가려지지 않는다 — 탭 히트테스트(3번)가 따로 본다.
    if (Number.isFinite(z) && Number.isFinite(navZ) && z > navZ) continue;
    const overlap = Math.min(rect.bottom, navRect.bottom) - Math.max(rect.top, navRect.top);
    const entry = {
      label: describe(el),
      cssBottom: cs.bottom,
      zIndex: cs.zIndex,
      overlap: Number(Math.max(0, overlap).toFixed(1)),
    };
    candidates.push(entry);
    if (overlap > 0) violations.push(entry);
  }

  const items = Array.from(nav.querySelectorAll(".cd-mobile-bottom-nav__item"));
  const stolenTabs = [];
  for (const item of items) {
    const r = item.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) {
      stolenTabs.push({ label: (item.textContent || "").trim().slice(0, 12), hit: "(렌더 안 됨)" });
      continue;
    }
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    if (!hit || !(hit === item || item.contains(hit))) {
      stolenTabs.push({ label: (item.textContent || "").trim().slice(0, 12), hit: hit ? describe(hit) : "(없음)" });
    }
  }

  return {
    visibilityState: document.visibilityState,
    innerHeight: window.innerHeight,
    scanned,
    navRect: { top: Number(navRect.top.toFixed(1)), bottom: Number(navRect.bottom.toFixed(1)), height: Number(navRect.height.toFixed(1)) },
    navSpace: Number((window.innerHeight - navRect.top).toFixed(1)),
    navZIndex: navStyle.zIndex,
    tabCount: items.length,
    candidates,
    violations,
    stolenTabs,
  };
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (error) {
    console.error("playwright 를 불러올 수 없습니다 — devDependency 설치가 필요합니다.");
    console.error(error.message);
    process.exit(1);
  }

  const server = await serveRepo();
  const { port } = server.address();
  const origin = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  const failures = [];

  try {
    for (const inset of SAFE_AREA_INSETS) {
      const where = `safe-area-inset-bottom=${inset}px`;
      const context = await browser.newContext({
        viewport: VIEWPORT,
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 3,
        userAgent:
          "Mozilla/5.0 (Linux; Android 16; SM-M156B) AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/140.0.0.0 Mobile Safari/537.36",
      });
      const page = await context.newPage();
      if (inset > 0) {
        const client = await context.newCDPSession(page);
        try {
          await client.send("Emulation.setSafeAreaInsetsOverride", {
            insets: { top: 0, topMax: 0, right: 0, rightMax: 0, bottom: inset, bottomMax: inset, left: 0, leftMax: 0 },
          });
        } catch (error) {
          // 에뮬레이션을 못 하면 통과시키지 않는다 — 이 축이 정확히 safe-area 에서 터졌다.
          failures.push(`${where}: safe-area 에뮬레이션 불가 — ${error.message}`);
          await context.close();
          continue;
        }
      }
      await page.goto(`${origin}/index.html`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("#cdMobileBottomNav", { timeout: 20000 });
      await page.waitForTimeout(6000);
      // 히어로 CTA 를 지나 스크롤해야 .cd-sticky-cta 가 뜬다.
      await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = "auto";
        window.scrollTo(0, 2200);
      });
      await page.waitForTimeout(1500);

      const result = await page.evaluate(probe, BACKDROP_HEIGHT_RATIO);
      await context.close();

      if (result.navMissing) {
        failures.push(`${where}: #cdMobileBottomNav 가 없다 — 잴 대상이 없으므로 통과시키지 않는다.`);
        continue;
      }
      if (result.navHidden) {
        failures.push(`${where}: 탭바가 숨겨진 상태로 렌더됐다 — 이 상태에서는 이 가드가 아무것도 못 본다.`);
        continue;
      }
      // 🔴 fail-closed: 앱이 뒤로 가 있거나 레이아웃이 멈추면 rect 가 전부 0 이라 "위반 0건"이 된다.
      if (result.visibilityState !== "visible") {
        failures.push(`${where}: document.visibilityState=${result.visibilityState} — 레이아웃이 멈춰 판정이 무효다.`);
        continue;
      }
      if (result.tabCount < 5) {
        failures.push(`${where}: 탭이 ${result.tabCount}개뿐이다(5개 기대) — 셀렉터가 낡았거나 렌더가 덜 됐다.`);
        continue;
      }
      if (!result.candidates.length) {
        failures.push(
          `${where}: 탭바 아래 z-index 의 하단 고정 UI 를 하나도 못 찾았다 — 대상이 0건이면 이 가드는 가드가 아니다.`,
        );
        continue;
      }

      console.log(
        `· ${where}: 탭바 [${result.navRect.top}..${result.navRect.bottom}] 높이 ${result.navRect.height}px · ` +
          `바닥에서 ${result.navSpace}px · z-index ${result.navZIndex} · 요소 ${result.scanned}개 훑어 후보 ${result.candidates.length}건`,
      );
      for (const candidate of result.candidates) {
        console.log(`    ${candidate.overlap > 0 ? "✗" : "✓"} ${candidate.label} bottom:${candidate.cssBottom} z:${candidate.zIndex} 겹침 ${candidate.overlap}px`);
      }
      for (const violation of result.violations) {
        failures.push(
          `${where}: ${violation.label} 가 탭바와 ${violation.overlap}px 겹친다(bottom:${violation.cssBottom}, ` +
            `z-index:${violation.zIndex} < 탭바 ${result.navZIndex}) — 탭바 뒤로 깔린다.`,
        );
      }
      for (const stolen of result.stolenTabs) {
        failures.push(`${where}: 탭 "${stolen.label}" 좌표에서 ${stolen.hit} 가 잡힌다 — 탭이 먹힌다.`);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (failures.length) {
    console.error("\n하단 탭바 클리어런스 위반:");
    for (const failure of failures) console.error(`  - ${failure}`);
    console.error(
      "\n고치는 법: 그 UI 의 bottom 을 탭바 발자국 위로 올린다 —\n" +
        "  calc(max(6px, env(safe-area-inset-bottom, 0px)) + 79px + env(safe-area-inset-bottom, 0px))\n" +
        "  (탭바 bottom + 높이 71px + 여유 8px. 두 항의 safe-area 는 탭바가 두 번 세는 것을 그대로 따른 것이다.)",
    );
    process.exit(1);
  }

  console.log("\n✅ 하단 탭바를 가리거나 탭바에 가려지는 고정 UI 없음 (safe-area 0px·47px).");
}

main();

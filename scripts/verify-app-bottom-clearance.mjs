#!/usr/bin/env node
/**
 * verify-app-bottom-clearance
 *
 * 앱(안드로이드 웹뷰)에서 화면 하단의 주 액션이 시스템 UI(제스처바) 위에 충분히 떠 있는지
 * 실브라우저에서 잰다. 대상은 App Router 기능 화면이라 정적 셸만 보는
 * verify:mobile-bottom-nav-clearance 가 구조적으로 못 보는 축이다.
 *
 * 🔴 정적 검사로는 못 잡는 이유(2026-08-30 실측):
 *   연이의 운명 찻집 입장 스토리가 가려진 원인은 "bottom 에 env() 가 없다" 가 아니었다.
 *   .entryStoryPanel 은 이미 max(16px, env(safe-area-inset-bottom)) 을 선언하고 있었고
 *   (그마저 컴포넌트의 Tailwind `!p-0` 가 덮어 죽어 있었다), 진짜 원인은 조상의 뷰포트 산술이다 —
 *     .pageInner  padding-bottom: max(26px, env(safe-area-inset-bottom))   ← inset 만큼 늘어나고
 *     .sceneFrame min-height:      calc(100svh - 72px)                     ← 그만큼 줄지 않는다
 *   그래서 inset 이 커질수록 씬 바닥이 안전선 아래로 밀렸다. 이런 짝은 파일 안에 안 적혀 있어
 *   렌더해서 재는 수밖에 없다.
 *
 * 판정: 화면 안에서 시작하는 조작 가능한 요소는 안전선(innerHeight - inset)보다
 *       최소 MIN_GAP 만큼 위에서 끝나야 한다.
 *   - "겹쳤는가" 로만 보면 이 버그를 통과시킨다. 수정 전 실측이 여유 6.2px 로 겹치지는 않았지만
 *     제스처바에 붙어 있어 사용자가 가려졌다고 보고했다. 수정 후 27.2px.
 *   - MIN_GAP=12px 은 이 레포가 하단 앵커에 쓰는 최소 여백 관용구(10~22px)의 하한이다.
 *
 * safe-area-inset-bottom 은 0 과 47 두 값으로 돌린다. 47 은 갤럭시 M15 5G 웹뷰 실측값이다.
 *
 * 🔴 네오 팩폭 작전실 결과 화면은 이 가드가 못 덮는다 — 결과를 열려면 실제 생성 결과가 있어야 하고
 *    로컬 프리뷰(?neoPreview=)는 NODE_ENV!=="production" 에서만 열리는데 dist/ 는 프로덕션 빌드다.
 *    그 화면의 하단 여백은 정적 수정만 되어 있고 실측은 미검증이다.
 *
 * 실행: npm run build  (dist/ 가 최신이어야 한다) → npm run verify:app-bottom-clearance
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(repoRoot, "dist");

/** 갤럭시 M15 5G 급 세로 뷰포트 */
const VIEWPORT = { width: 412, height: 823 };
/** 0 = 시스템 UI 없음, 47 = 갤럭시 M15 5G 웹뷰 실측 */
const SAFE_AREA_INSETS = [0, 47];
/** 안전선 위로 최소한 이만큼은 떠 있어야 한다 */
const MIN_GAP = 12;
/** 입장 스토리를 이만큼 진행시키며 매 단계 잰다 */
const ADVANCES = 4;
/** 전면 배경/백드롭은 가려도 문제가 아니다 — 뷰포트의 이만큼 이상을 덮으면 후보에서 뺀다. */
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
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
};

function serveDist() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      const relative = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
      let filePath = path.join(distRoot, relative);
      if (!filePath.startsWith(distRoot)) {
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

/** 브라우저 안에서 잰다. 대상은 손으로 열거하지 않고 렌더된 문서에서 전수 발견한다. */
function probe({ inset, minGap, backdropRatio }) {
  const out = { visibilityState: document.visibilityState, innerHeight: window.innerHeight };

  // 🔴 safe-area 에뮬레이션이 실제로 먹었는지 먼저 본다 — 안 먹었으면 측정 자체가 무효다.
  const sensor = document.createElement("div");
  sensor.style.cssText = "position:fixed;left:-9999px;padding-bottom:env(safe-area-inset-bottom,0px)";
  document.body.appendChild(sensor);
  out.envBottom = parseFloat(getComputedStyle(sensor).paddingBottom) || 0;
  sensor.remove();

  const scene = document.querySelector("section[data-entry-stage]");
  if (!scene) return { ...out, sceneMissing: true };
  out.stage = scene.getAttribute("data-entry-stage");

  const describe = (el) => {
    const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 16);
    const tag = el.tagName.toLowerCase();
    return text ? `${tag} "${text}"` : tag;
  };

  const limit = window.innerHeight - inset;
  out.limit = limit;
  out.candidates = [];
  out.violations = [];
  out.scanned = 0;

  for (const el of scene.querySelectorAll('button, a[href], [role="button"], input, select, textarea')) {
    out.scanned += 1;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) <= 0.01) continue;
    if (cs.pointerEvents === "none") continue;
    if (el.disabled) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    if (rect.height >= window.innerHeight * backdropRatio) continue;
    // 화면 밖에서 시작하는 것은 스크롤로 올려 보는 것이 정상이라 이 가드의 대상이 아니다.
    if (rect.top < 0 || rect.top >= limit) continue;
    const entry = {
      label: describe(el),
      bottom: Number(rect.bottom.toFixed(1)),
      gap: Number((limit - rect.bottom).toFixed(1)),
    };
    out.candidates.push(entry);
    if (entry.gap < minGap) out.violations.push(entry);
  }

  return out;
}

/** 마지막 버튼을 눌러 다음 단계로 넘긴다. */
function advance() {
  const scene = document.querySelector("section[data-entry-stage]");
  const buttons = Array.from(scene ? scene.querySelectorAll("button") : []);
  const next = buttons[buttons.length - 1];
  if (!next || next.disabled) return false;
  next.click();
  return true;
}

async function main() {
  if (!fs.existsSync(path.join(distRoot, "fortune-tea-house", "index.html"))) {
    console.error("dist/fortune-tea-house/index.html 이 없습니다 — 먼저 `npm run build` 로 dist/ 를 만드세요.");
    console.error("(빌드 없이 통과시키면 이 가드는 가드가 아닙니다.)");
    process.exit(1);
  }

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (error) {
    console.error("playwright 를 불러올 수 없습니다 — devDependency 설치가 필요합니다.");
    console.error(error.message);
    process.exit(1);
  }

  const server = await serveDist();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const failures = [];
  let measured = 0;

  try {
    for (const inset of SAFE_AREA_INSETS) {
      const where = `safe-area-inset-bottom=${inset}px`;
      const context = await browser.newContext({
        viewport: VIEWPORT,
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 1.75,
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
          failures.push(`${where}: safe-area 에뮬레이션 불가 — ${error.message}`);
          await context.close();
          continue;
        }
      }

      await page.goto(`${origin}/fortune-tea-house/`, { waitUntil: "domcontentloaded" });
      try {
        await page.waitForSelector('[class*="landingActions"] button', { timeout: 30000 });
        await page.click('[class*="landingActions"] button');
        await page.waitForSelector("section[data-entry-stage]", { timeout: 30000 });
      } catch (error) {
        failures.push(`${where}: 입장 스토리에 도달하지 못했다 — ${error.message}`);
        await context.close();
        continue;
      }
      await page.waitForTimeout(2500);

      for (let step = 0; step <= ADVANCES; step += 1) {
        const result = await page.evaluate(probe, { inset, minGap: MIN_GAP, backdropRatio: BACKDROP_HEIGHT_RATIO });
        const at = `${where} · ${step === 0 ? "입장 직후" : `다음 ${step}회`}`;

        if (result.sceneMissing) {
          failures.push(`${at}: 입장 스토리 씬(section[data-entry-stage])이 사라졌다 — 잴 대상이 없다.`);
          break;
        }
        // 🔴 fail-closed: 앱이 뒤로 가 있으면 rect 가 전부 0 이라 "위반 0건"이 된다.
        if (result.visibilityState !== "visible") {
          failures.push(`${at}: document.visibilityState=${result.visibilityState} — 레이아웃이 멈춰 판정이 무효다.`);
          break;
        }
        if (result.envBottom !== inset) {
          failures.push(
            `${at}: env(safe-area-inset-bottom) 이 ${result.envBottom}px 로 읽힌다(${inset}px 기대) — ` +
              "에뮬레이션이 안 먹은 상태라 통과시키지 않는다.",
          );
          break;
        }
        if (!result.candidates.length) {
          failures.push(
            `${at}: 화면 안에서 시작하는 조작 요소를 하나도 못 찾았다(훑은 요소 ${result.scanned}개) — ` +
              "대상이 0건이면 이 가드는 가드가 아니다.",
          );
          break;
        }

        measured += 1;
        const worst = result.candidates.reduce((a, b) => (a.gap <= b.gap ? a : b));
        console.log(
          `· ${at} [${result.stage}] 안전선 ${result.limit}px · 후보 ${result.candidates.length}건 · ` +
            `최소 여유 ${worst.gap}px (${worst.label})`,
        );
        for (const violation of result.violations) {
          failures.push(
            `${at}: ${violation.label} 이(가) 안전선에서 ${violation.gap}px 밖에 안 떨어져 있다` +
              `(bottom ${violation.bottom}px, 안전선 ${result.limit}px, 최소 ${MIN_GAP}px) — 시스템 UI 에 붙는다.`,
          );
        }

        if (step === ADVANCES) break;
        if (!(await page.evaluate(advance))) {
          failures.push(`${at}: 다음 단계로 넘길 버튼이 없다 — 스토리 진행이 막혀 남은 단계를 못 쟀다.`);
          break;
        }
        await page.waitForTimeout(1600);
      }

      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  // 🔴 fail-closed: 한 번도 못 쟀으면 통과가 아니다.
  if (measured < (ADVANCES + 1) * SAFE_AREA_INSETS.length) {
    failures.push(
      `잰 단계가 ${measured}개뿐이다(${(ADVANCES + 1) * SAFE_AREA_INSETS.length}개 기대) — 측정이 도중에 끊겼다.`,
    );
  }

  if (failures.length) {
    console.error("\n앱 하단 클리어런스 위반:");
    for (const failure of failures) console.error(`  - ${failure}`);
    console.error(
      "\n고치는 법: 하단 여백만 늘리지 말고 그 여백을 세는 조상의 뷰포트 산술도 같이 줄인다 —\n" +
        "  .pageInner  padding-bottom: max(<기존값>, env(safe-area-inset-bottom, 0px))\n" +
        "  .sceneFrame min-height:     calc(100svh - <나머지> - max(<기존값>, env(safe-area-inset-bottom, 0px)))\n" +
        "  (env 가 0 인 웹에서는 두 줄 다 종전값과 같아야 한다 — 그래야 웹 회귀가 0 이다.)",
    );
    process.exit(1);
  }

  console.log(
    `\n✅ 찻집 입장 스토리 ${measured}개 단계에서 하단 조작 요소가 안전선 위 ${MIN_GAP}px 이상 (safe-area 0px·47px).`,
  );
}

main();

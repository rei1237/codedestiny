#!/usr/bin/env node
/**
 * measure-home-score — 홈 4축(정리 · 모바일 · 설명 · 성능) 점수 하네스
 *
 * 왜 이게 있나 — 2026-09-01 홈 4축 진단(docs/handoff/home-ux-audit-2026-09-01.md)은 수치를
 * 냈지만 **계측용 임시 스크립트 5개를 작업 후 지웠다.** 그래서 개선 PR 을 하나 머지할 때마다
 * "점수가 올랐는가"를 다시 잴 수단이 없었다. 이 파일이 그 하네스의 정본이다.
 *
 * 🔴 이름을 `verify:*` 로 짓지 않는다 — 가드가 아니라 계측기다. `verify:*` 는
 *    verify-guard-wiring 의 배선 의무가 붙고, 이 스크립트는 dist 빌드와 브라우저가 있어야
 *    돌아서 CI 게이트에 넣을 물건이 아니다.
 *
 * 측정 조건(진단 문서와 같게 맞춘 것 — 바꾸면 과거 수치와 비교가 깨진다)
 *   - `npm run build:cf` 가 만든 `dist/` 를 정적 서버로 띄운다
 *   - Playwright chromium · 390×844 · DPR 3 · 모바일 UA
 *   - CPU 스로틀은 걸지 않는다. 여기서 재는 것은 시간이 아니라 **기하와 배선**이다
 *     (시간 축은 perf:home / perf:interaction 담당이고, 축 3 은 그 산출물을 읽어 온다)
 *
 * 🔴 하네스가 피해야 할 위양성 4종 (전부 이 레포의 실사고 이력)
 *   1. `z-index < 0` 요소를 가림으로 세지 않는다 — `#cdHomeAtmos` 배경 레이어를 가림으로
 *      셌던 오답 이력이 있다.
 *   2. 스캔한 요소 **개수를 함께 출력**한다 — 앱이 백그라운드면 rect 가 전부 0 이라
 *      "위반 0건"이 위양성이 된다(메모리 cdp-scans-false-pass-when-app-is-backgrounded).
 *      그래서 스캔 0건이면 실패시킨다.
 *   3. 섹션 분량을 `innerText` 로 재지 않는다 — `content-visibility: auto` 가 걸린 5개 섹션이
 *      화면 밖에서 빈 문자열을 돌려준다. 인터랙티브도 같은 이유로 **스크롤 스윕**으로 센다
 *      (한 번도 화면에 안 들어온 c-v 섹션의 자식은 rect 가 0×0 이다).
 *   4. CLS 판정을 로컬로 끝내지 않는다 — 광고발 CLS 를 숨긴다(스테이징 0 vs 프로덕션 0.275).
 *      축 3 은 이 스크립트가 재지 않고 perf:home 산출물을 인용하며, 그 사실을 표에 적는다.
 *
 * 🔴 09-01 진단과 정의가 갈리는 지표 3개 (하네스가 정본이고, 진단 수치는 참고선이다)
 *   - 랜딩 섹션: 진단은 손으로 13개를 적었다. 여기서는 `#inputPage section[id]` 중 **CSS 로 보이는 것**을
 *     센다(2026-09-01 dist 기준 14개). 차이는 진단 목록에 없는 moonMusicEntry · cdFeedbackGate ·
 *     cdReviews 3개와, display:none 이라 빠지는 destinyCardForm · cdTodayPick 2개다. 표에 그 차이를
 *     통째로 찍으므로 다음 세션이 다시 파헤칠 필요는 없다.
 *   - 첫 화면 가림: 진단의 "결함 2건"은 **가린 고정 레이어 수**다(요소 수로는 4개). 그래서 여기서도
 *     덮은 요소의 고정/스티키 조상으로 묶어 센다.
 *   - 첫 화면 서비스 링크: `window.__cdServiceRegistry` 의 href/action 과 일치하는 것만 센다.
 *     🔴 2026-09-01 진단 시점의 레지스트리 43개에는 `/fusion-fortune` 이 없었다. 히어로의 유일한
 *     실서비스 링크가 그것이라 이 지표가 낮게 나오는 원인 절반이 그거였다 — PR-2 에서 등록해
 *     항목이 44개가 됐고, 축4 문안 커버리지 분모도 43 -> 44 로 함께 옮겼다.
 *
 * 점수는 docs/handoff/home-ux-audit-2026-09-01.md 「점수와 목표」의 루브릭 그대로다.
 * 🔴 임계(100점/0점 기준)는 **선언한 잣대**이지 업계 상수가 아니다. 바꾸려면 RUBRIC 만 고친다.
 *
 * 사용:
 *   npm run build:cf
 *   npm run perf:home -- --runs=3 --preset=mobile     # 축 3 재료(없으면 인용값으로 돈다)
 *   npm run measure:home-score
 *   npm run measure:home-score -- --perf-json=<경로> --inp=616 --out=<디렉터리>
 *
 * 산출물은 저장소가 아니라 --out 디렉터리(기본 OS temp)에 쓴다 — 측정 결과는 커밋 대상이 아니다.
 */

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const VIEWPORT = { width: 390, height: 844 };
const DEVICE_SCALE_FACTOR = 3;
const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

/** 탭 타깃 최소 변. 39/162 를 낸 진단과 같은 값이다. */
const MIN_TAP_PX = 44;

/** 정적 서버가 br 로 눌러 보내는 확장자. 최상위 await 보다 위에 있어야 한다(TDZ). */
const COMPRESSIBLE = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg", ".xml", ".txt"]);
const encodedCache = new Map();

/** 전면 배경/백드롭은 "고정 UI 점유"가 아니다 — 뷰포트의 이만큼 이상을 덮으면 후보에서 뺀다.
 *  (scripts/verify-mobile-bottom-nav-clearance.mjs 의 BACKDROP_HEIGHT_RATIO 와 같은 값) */
const BACKDROP_HEIGHT_RATIO = 0.6;

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

/**
 * 2026-09-01 진단이 센 랜딩 섹션 13개. 🔴 이 배열은 판정 기준이 아니라 **대조군**이다 —
 * 지금 DOM 과 다르면 그 차이를 출력해서 "지표 정의가 밀렸는지"를 사람이 보게 한다.
 * 손으로 쓴 목록을 가드로 쓰지 않는다(코딩 원칙 10).
 */
const LANDING_SECTIONS_20260901 = [
  "destinyCardForm", "cdConcernPick", "cdTodayHub", "cdTodayPick", "cdWhyUs",
  "cdSignatureConsult", "cdQuickServices", "cdFinder", "fortuneGatewayEntry",
  "cdServiceIndex", "cdDiaryPlannerEntry", "cdAiFeatures", "cdFortunePick",
];

/**
 * 진입 전 상세 시트(#tilePvwOverlay)에 도달해야 하는 표면.
 * 판정은 **정말 눌러 보고** 시트가 뜨는지로 한다 — 선택자 대조로는 마스터 게이트와
 * 조기 반환을 못 본다(실제로 그 둘 때문에 선택자만 보면 틀린 답이 나온다).
 *
 * 🔴 분모는 2 다(2026-09-01 결정 ⓒ 반영, 이전에는 4). 나머지 둘은 "닫아야 할 구멍"이
 *    아니어서 점수에서 뺐고, 진단용으로만 계속 찍는다:
 *    - `.cd-svc-hit` 는 **존재하지 않는 표면**이다. 두 번째 mount() 를 2026-08-19 에
 *      사용자 요청으로 지웠고(js/core/home-service-finder.js boot() 주석), 되살릴 계획이
 *      없다. 없는 표면을 분모에 두면 만점이 영구히 불가능하다.
 *    - `[data-pvw-free]` 는 무료 표식이라 **모바일에서 안 열리는 것이 정상**이다.
 *      열리는지로 채점하면 결정 ⓒ 를 지킨 코드가 감점된다. 표식이 붙어 있는지만 센다.
 *
 * `requirePaid` 표면은 유료 노드를 골라 누른다 — 첫 노드(무료일 때가 많다)를 누르면
 * 결정 ⓒ 가 정상적으로 거절한 것을 "회귀"로 오독한다.
 */
const PREVIEW_SURFACES = [
  {
    key: "collection-tile", label: "컬렉션 타일(유료)", scored: true, requirePaid: true,
    selector: ".tarot-tile,.lifebook-tile,.lovebible-tile,.moon-preview-card",
  },
  {
    key: "finder-rec", label: "#cdFinder 추천 카드(유료)", scored: true, requirePaid: true,
    /* 기본 목록 6개는 전부 무료라(DEFAULT_PICKS) 가격 칩을 켜야 유료 카드가 나온다. */
    prepare: "paid-filter",
    selector: ".fortune-gateway__rec",
  },
  { key: "service-index-hit", label: "서비스 인덱스 결과 카드(설계상 없음·비채점)", selector: ".cd-svc-hit" },
  { key: "free-exempt", label: "무료 항목 면제 표식(비채점)", presenceOnly: true, selector: "[data-pvw-free]" },
];

/** 레지스트리 `price` 가 이 셋이면 무료 취급(진단의 무료 23개 = 무료 12 + 무료 시작 10 + 이용권 1). */
const FREE_PRICES = new Set(["무료", "무료 시작", "이용권"]);

/**
 * 루브릭. `best` 가 100점, `worst` 가 0점이고 그 사이는 선형이다(방향은 두 값의 대소가 정한다).
 * `baseline` 은 2026-09-01 진단값 — 지금 측정값과 나란히 찍어 **지표 정의가 밀렸는지**를 본다.
 */
const RUBRIC = [
  {
    key: "axis1", label: "축1 정리", target: 60,
    metrics: [
      { key: "screens", label: "문서 높이(화면 수)", weight: 0.35, best: 6, worst: 17.5, baseline: 15.2, digits: 1 },
      { key: "visibleInteractive", label: "보이는 인터랙티브", weight: 0.35, best: 60, worst: 200, baseline: 162 },
      { key: "landingSections", label: "랜딩 섹션 수", weight: 0.2, best: 8, worst: 16, baseline: 13 },
      { key: "destinationOverlapPairs", label: "목적지 중복 쌍", weight: 0.1, best: 0, worst: 13, baseline: 2 },
    ],
  },
  {
    key: "axis2", label: "축2 모바일", target: 60,
    metrics: [
      { key: "occludedInteractive", label: "첫 화면 가림 결함(원인 수)", weight: 0.3, best: 0, worst: 2, baseline: 2 },
      { key: "fixedFirstVisitPct", label: "첫 방문 고정 UI 점유(%)", weight: 0.2, best: 20, worst: 45, baseline: 43, digits: 1 },
      { key: "firstScreenServiceLinks", label: "첫 화면 서비스 링크", weight: 0.2, best: 3, worst: 0, baseline: 0 },
      { key: "smallTapPct", label: "44px 미만 탭 타깃(%)", weight: 0.15, best: 5, worst: 30, baseline: 24.1, digits: 1 },
      { key: "horizontalOverflow", label: "가로 오버플로(1=있음)", weight: 0.15, best: 0, worst: 1, baseline: 0 },
    ],
  },
  {
    key: "axis3", label: "축3 성능", target: 60,
    metrics: [
      { key: "performance", label: "Lighthouse Performance", weight: 0.3, best: 100, worst: 0, baseline: 63 },
      { key: "lcp", label: "LCP(ms)", weight: 0.2, best: 2500, worst: 4000, baseline: 4580 },
      { key: "inp", label: "INP(ms)", weight: 0.2, best: 200, worst: 500, baseline: 616 },
      { key: "tbt", label: "TBT(ms)", weight: 0.15, best: 200, worst: 600, baseline: 495 },
      { key: "cls", label: "CLS", weight: 0.15, best: 0.1, worst: 0.25, baseline: 0.001, digits: 3 },
    ],
  },
  {
    key: "axis4", label: "축4 설명", target: 60,
    metrics: [
      { key: "previewSurfaces", label: "프리뷰 도달 표면(/2)", weight: 0.35, best: 2, worst: 0, baseline: 0 },
      { key: "copyCoverage", label: "문안 커버리지(/44)", weight: 0.3, best: 44, worst: 0, baseline: 16 },
      { key: "freeCopyCoverage", label: "무료 문안 커버리지(/23)", weight: 0.2, best: 23, worst: 0, baseline: 2 },
      { key: "descLocales", label: "desc 로케일(/12)", weight: 0.15, best: 12, worst: 0, baseline: 1 },
    ],
  },
];

const TOTAL_TARGET = 70;

/* ───────────────────────────── 실행 ───────────────────────────── */

const args = parseArgs(process.argv.slice(2));

const staticRoot = path.join(repoRoot, "dist");
if (!fs.existsSync(path.join(staticRoot, "index.html"))) {
  console.error("[measure:home-score] dist/index.html 이 없다. 먼저 `npm run build:cf` 를 돌릴 것.");
  console.error("  🔴 저장소 루트의 index.html 을 대신 재면 셸 승격·청크 분리 이전 상태를 재게 되어 수치가 달라진다.");
  process.exit(1);
}

const source = readShellSource();
const server = await startStaticServer();
const port = server.address().port;
const targetUrl = args.url || `http://127.0.0.1:${port}/`;

console.log(`[measure:home-score] target ${targetUrl}`);
console.log(`[measure:home-score] ${VIEWPORT.width}x${VIEWPORT.height} · DPR ${DEVICE_SCALE_FACTOR} · 모바일 UA · settle ${args.settle}ms`);

let measured;
let coverageDetail = [];
const browser = await chromium.launch({ headless: true });
try {
  measured = await measure();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

const perf = loadPerf();
const values = toRubricValues(measured, perf);
const scored = score(values);

report(measured, perf, scored);
writeArtifact(measured, perf, scored);

/* ───────────────────────────── 측정 ───────────────────────────── */

async function measure() {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    isMobile: true,
    hasTouch: true,
    userAgent: MOBILE_UA,
  });

  const page = await context.newPage();
  await open(page);

  /* 첫 방문 — 쿠키 배너가 떠 있는 상태. 진단의 "첫 방문 고정 UI 점유 43%" 가 이 상태다. */
  const sweep = await sweepPage(page);
  const firstVisit = await probeFirstViewport(page);
  const layout = await probeLayout(page);
  const registry = await probeRegistry(page);
  const previewGate = await page.evaluate(() => window.__cdFeatureMarketingPreviewEnabled);
  const previewPaidOnly = await page.evaluate(() => window.__cdFeatureMarketingPreviewPaidOnly);
  const descLocalized = await page.evaluate(
    () => document.querySelectorAll(".fortune-gateway__rec-desc[data-cd-trans]").length > 0,
  );

  /* 재방문 — 배너를 실제로 동의로 닫고 새로 연다. localStorage 를 손으로 심지 않는 이유는
     동의 값의 정본이 CodeDestinyCookiePolicy 쪽이라 심는 순간 실제와 어긋날 수 있어서다. */
  const accepted = await page.evaluate(() => {
    const btn = document.getElementById("cdCookieAcceptBtn");
    if (!btn) return false;
    btn.click();
    return true;
  });
  await open(page);
  const revisit = await probeFirstViewport(page);

  await page.close();

  /* 표면별 클릭 판정은 매번 새 페이지에서 한다 — 시트가 열린 채로 다음 표면을 누르면
     "이미 열려 있는 시트"를 성공으로 오독한다. */
  const surfaces = [];
  for (const surface of PREVIEW_SURFACES) {
    surfaces.push(await probeSurface(context, surface));
  }

  await context.close();

  return { sweep, firstVisit, revisit, layout, registry, previewGate, previewPaidOnly, descLocalized, cookieAccepted: accepted, surfaces };
}

async function open(page) {
  await page.goto(targetUrl, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(args.settle);
}

/**
 * 스크롤 스윕. `content-visibility: auto` 섹션의 자식은 한 번도 뷰포트에 안 들어오면
 * rect 가 0×0 이라 "안 보이는 것"으로 세인다. 그래서 한 화면씩 내려가며 **그 순간 보이는 것**을
 * 누적한다. 문서 높이도 스윕이 끝난 뒤(레이아웃이 다 실현된 뒤) 읽는다.
 */
function sweepPage(page) {
  return page.evaluate(
    async ({ selector, step, minTap }) => {
      const settle = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const visible = (el, rect) => {
        if (rect.width <= 0 || rect.height <= 0) return false;
        if (typeof el.checkVisibility === "function") {
          return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
        }
        const cs = getComputedStyle(el);
        return cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) >= 0.05;
      };

      const seen = new Set();
      let small = 0;
      let scanned = 0;
      let steps = 0;
      for (let y = 0; y < document.documentElement.scrollHeight && steps < 80; y += step) {
        window.scrollTo(0, y);
        await settle();
        steps += 1;
        const nodes = document.querySelectorAll(selector);
        scanned = Math.max(scanned, nodes.length);
        for (const el of nodes) {
          if (seen.has(el)) continue;
          const rect = el.getBoundingClientRect();
          if (!visible(el, rect)) continue;
          seen.add(el);
          if (rect.width < minTap || rect.height < minTap) small += 1;
        }
      }
      window.scrollTo(0, 0);
      await settle();

      return {
        steps,
        scanned,
        docHeight: document.documentElement.scrollHeight,
        visibleInteractive: seen.size,
        smallTapTargets: small,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      };
    },
    { selector: INTERACTIVE_SELECTOR, step: VIEWPORT.height, minTap: MIN_TAP_PX },
  );
}

/**
 * 스크롤 0 에서의 첫 화면 — 고정 UI 점유 · 완전 가림 · 첫 화면 서비스 링크.
 *
 * 🔴 `z-index < 0` 은 후보에서 뺀다(배경 레이어). 🔴 뷰포트의 60% 이상을 덮는 것은
 * 백드롭이므로 점유에서 뺀다 — 안 그러면 배너 백드롭 하나가 점유 100% 를 만든다.
 */
function probeFirstViewport(page) {
  return page.evaluate(
    async ({ selector, backdropRatio }) => {
      const settle = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      window.scrollTo(0, 0);
      await settle();

      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const describe = (el) => {
        if (!el) return "(없음)";
        const id = el.id ? `#${el.id}` : "";
        const cls = typeof el.className === "string" && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}` : "";
        return `${el.tagName.toLowerCase()}${id}${cls}`;
      };
      const visible = (el, rect) => {
        if (rect.width <= 0 || rect.height <= 0) return false;
        if (typeof el.checkVisibility === "function") {
          return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
        }
        const cs = getComputedStyle(el);
        return cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) >= 0.05;
      };

      /* ── 고정 UI 점유 ── */
      const all = Array.from(document.querySelectorAll("body *"));
      const bands = [];
      const fixedNodes = [];
      for (const el of all) {
        const cs = getComputedStyle(el);
        if (cs.position !== "fixed" && cs.position !== "sticky") continue;
        const z = cs.zIndex === "auto" ? 0 : Number(cs.zIndex);
        if (Number.isFinite(z) && z < 0) continue; // 🔴 배경 레이어(#cdHomeAtmos)를 세지 않는다
        const rect = el.getBoundingClientRect();
        if (!visible(el, rect)) continue;
        const top = Math.max(0, rect.top);
        const bottom = Math.min(vh, rect.bottom);
        if (bottom - top <= 0) continue;
        if (bottom - top >= vh * backdropRatio) continue; // 전면 백드롭은 점유가 아니다
        bands.push([top, bottom]);
        fixedNodes.push({ node: describe(el), z: cs.zIndex, top: Math.round(rect.top), bottom: Math.round(rect.bottom) });
      }
      bands.sort((a, b) => a[0] - b[0]);
      let fixedPx = 0;
      let cursor = -1;
      for (const [top, bottom] of bands) {
        const from = Math.max(top, cursor);
        if (bottom > from) {
          fixedPx += bottom - from;
          cursor = bottom;
        }
      }

      /* ── 첫 화면 인터랙티브와 완전 가림 ── */
      /* 가림의 "원인"은 덮은 요소 자신이 아니라 그 요소가 속한 고정 레이어다 — 쿠키 배너의
         버튼과 본문은 서로 다른 요소지만 결함은 배너 하나다. 09-01 진단의 "가림 결함 2건"이
         이 기준이라, 요소 수(4개)로 세면 같은 홈이 다른 점수를 받는다. */
      const groupOf = (el) => {
        let node = el;
        while (node && node !== document.body) {
          const cs = getComputedStyle(node);
          if (cs.position === "fixed" || cs.position === "sticky") return describe(node);
          node = node.parentElement;
        }
        return describe(el.closest("[id]") || el);
      };

      const covered = (el, rect) => {
        const left = Math.max(0, rect.left);
        const right = Math.min(vw, rect.right);
        const top = Math.max(0, rect.top);
        const bottom = Math.min(vh, rect.bottom);
        if (right - left <= 0 || bottom - top <= 0) return null;
        const hits = new Map();
        let sampled = 0;
        let blocked = 0;
        for (let i = 1; i <= 3; i += 1) {
          for (let j = 1; j <= 3; j += 1) {
            const x = left + ((right - left) * i) / 4;
            const y = top + ((bottom - top) * j) / 4;
            const hit = document.elementFromPoint(x, y);
            sampled += 1;
            if (!hit) {
              blocked += 1;
              continue;
            }
            if (hit === el || el.contains(hit) || hit.contains(el)) continue;
            blocked += 1;
            hits.set(hit, (hits.get(hit) || 0) + 1);
          }
        }
        const top1 = Array.from(hits.entries()).sort((a, b) => b[1] - a[1])[0];
        return {
          sampled,
          blocked,
          fully: sampled > 0 && blocked === sampled,
          by: top1 ? describe(top1[0]) : "(없음)",
          byGroup: top1 ? groupOf(top1[0]) : "(없음)",
        };
      };

      const registryHrefs = new Set(
        (window.__cdServiceRegistry || [])
          .map((item) => String(item.href || ""))
          .filter(Boolean)
          .map((href) => href.replace(/\/+$/, "") || "/"),
      );
      /* 🔴 href 만 보면 안 된다 — 히어로 CTA 처럼 `data-action` 으로 여는 진입점이 레지스트리에
         있고, 그걸 빼면 "첫 화면 서비스 링크 0개" 같은 위음성이 나온다. */
      const registryActions = new Set(
        (window.__cdServiceRegistry || []).map((item) => String(item.action || "")).filter(Boolean),
      );

      const interactive = Array.from(document.querySelectorAll(selector));
      let scannedFirstScreen = 0;
      const occluded = [];
      const serviceLinks = [];
      const otherAnchors = [];
      for (const el of interactive) {
        const rect = el.getBoundingClientRect();
        if (!visible(el, rect)) continue;
        if (rect.bottom <= 0 || rect.top >= vh) continue;
        scannedFirstScreen += 1;
        const cover = covered(el, rect);
        if (cover && cover.fully) {
          occluded.push({
            node: describe(el),
            text: (el.textContent || "").trim().slice(0, 24),
            by: cover.by,
            byGroup: cover.byGroup,
            top: Math.round(rect.top),
          });
        }
        const raw = el.tagName === "A" ? String(el.getAttribute("href") || "") : "";
        const action = String(el.getAttribute("data-action") || "");
        const href = raw ? raw.replace(/\/+$/, "") || "/" : "";
        const entry = {
          node: describe(el),
          text: (el.textContent || "").trim().slice(0, 24),
          href: raw,
          action,
          top: Math.round(rect.top),
          occluded: Boolean(cover && cover.fully),
        };
        if ((href && registryHrefs.has(href)) || (action && registryActions.has(action))) serviceLinks.push(entry);
        else if (raw && !raw.startsWith("#")) otherAnchors.push(entry);
      }

      return {
        viewport: { width: vw, height: vh },
        fixedPx: Math.round(fixedPx),
        fixedPct: Math.round((fixedPx / vh) * 1000) / 10,
        fixedNodes,
        scannedFirstScreen,
        occluded,
        occlusionGroups: Array.from(new Set(occluded.map((item) => item.byGroup))),
        serviceLinks,
        serviceLinksVisible: serviceLinks.filter((item) => !item.occluded).length,
        otherAnchors,
        registryHrefs: registryHrefs.size,
      };
    },
    { selector: INTERACTIVE_SELECTOR, backdropRatio: BACKDROP_HEIGHT_RATIO },
  );
}

/** 섹션 수와 랜딩 섹션 간 목적지 중복. DOM 질의는 content-visibility 와 무관하므로 스크롤이 필요 없다. */
function probeLayout(page) {
  return page.evaluate(() => {
    const landingRoot = document.getElementById("inputPage");
    const all = landingRoot ? Array.from(landingRoot.querySelectorAll("section[id]")) : [];
    /* 🔴 09-01 진단의 "랜딩 13개"는 **눈에 보이는** 섹션만 센 값이다. DOM 에만 있는 섹션까지
       세면 17개가 되어 같은 홈이 다른 점수를 받는다. 숨은 것은 따로 찍어 사람이 보게 한다. */
    /* 🔴 여기서 rect 나 checkVisibility 를 쓰면 안 된다 — `content-visibility: auto` 섹션 5개가
       화면 밖에서 높이 0 으로 잡혀 "숨겨진 섹션"으로 오분류된다(실측: 13 → 8). CSS 표시 여부만 본다. */
    const shown = (sec) => {
      const cs = getComputedStyle(sec);
      return cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) >= 0.05;
    };
    const landing = all.filter(shown);
    const destinationsOf = (sec) => {
      const out = new Set();
      for (const el of sec.querySelectorAll("a[href],[data-action],[data-cd-open-collection]")) {
        const href = el.getAttribute("href");
        if (href && !href.startsWith("#")) out.add("href:" + href.replace(/\/+$/, ""));
        const action = el.getAttribute("data-action");
        if (action) out.add("action:" + action);
        const coll = el.getAttribute("data-cd-open-collection");
        if (coll) out.add("coll:" + coll);
      }
      return out;
    };
    const sets = landing.map((sec) => ({ id: sec.id, dest: destinationsOf(sec) }));
    const overlaps = [];
    for (let i = 0; i < sets.length; i += 1) {
      for (let j = i + 1; j < sets.length; j += 1) {
        const shared = Array.from(sets[i].dest).filter((d) => sets[j].dest.has(d));
        if (shared.length) overlaps.push({ a: sets[i].id, b: sets[j].id, shared });
      }
    }
    return {
      sectionsTotal: document.querySelectorAll("section[id]").length,
      landingIds: landing.map((sec) => sec.id),
      landingHiddenIds: all.filter((sec) => !shown(sec)).map((sec) => sec.id),
      landingDirectIds: landingRoot
        ? Array.from(landingRoot.children).filter((el) => el.tagName === "SECTION" && el.id).map((el) => el.id)
        : [],
      overlaps,
    };
  });
}

/** 레지스트리는 브라우저 전역이 정본이다 — 소스를 파싱하지 않는다. */
function probeRegistry(page) {
  return page.evaluate(() =>
    (window.__cdServiceRegistry || []).map((item) => ({
      id: item.id || "",
      href: item.href || "",
      action: item.action || "",
      featureKey: item.featureKey || "",
      price: item.price || "",
    })),
  );
}

/**
 * 표면 하나를 **정말 눌러** 진입 전 상세 시트가 열리는지 본다.
 *
 * 🔴 정적 선택자 대조로는 틀린 답이 나온다 — 마스터 게이트(window.__cdFeatureMarketingPreviewEnabled),
 *    모바일 유료-한정 게이트(window.__cdFeatureMarketingPreviewPaidOnly, 2026-09-01 결정 ⓒ)와
 *    `<a href>` 조기 반환이 선택자 뒤에 하나씩 더 있다.
 * 이동을 막는 방법: document 캡처에 **앱의 핸들러보다 나중에** 등록한 리스너로 preventDefault 한다.
 * 앱이 시트를 열면 stopImmediatePropagation 을 부르므로 이 리스너는 아예 안 돈다.
 */
async function probeSurface(context, surface) {
  const page = await context.newPage();
  try {
    await open(page);
    const result = await page.evaluate(
      async ({ selector, prepare, requirePaid, presenceOnly }) => {
        const settle = (ms) => new Promise((r) => setTimeout(r, ms || 350));
        const sheet = () => {
          const ov = document.getElementById("tilePvwOverlay");
          if (!ov) return false;
          if (typeof ov.checkVisibility === "function") return ov.checkVisibility({ checkVisibilityCSS: true });
          return getComputedStyle(ov).display !== "none";
        };
        if (sheet()) return { count: 0, opened: false, note: "누르기 전에 이미 시트가 열려 있다 — 판정 불가" };

        if (prepare === "paid-filter") {
          /* 가격 칩(무료 제외)을 전부 켜면 추천 목록이 유료 항목만 남는다. */
          const chips = Array.from(document.querySelectorAll('.fortune-gateway__fchip[data-price]'))
            .filter((c) => c.getAttribute("data-price") !== "free");
          chips.forEach((c) => c.click());
          await settle(400);
        }

        const nodes = Array.from(document.querySelectorAll(selector));
        if (!nodes.length) return { count: 0, opened: false, note: "그 표면의 요소가 DOM 에 없다" };
        if (presenceOnly) return { count: nodes.length, opened: false, note: "표식 존재만 센다(모바일에서 안 열리는 것이 정상)" };

        /* 결정 ⓒ 의 유료 판정을 그대로 흉내 낸다(index.html _hasPaidPreviewSignal 의
           속성 축. href 화이트리스트는 여기서 재현하지 않는다). */
        const isPaid = (el) =>
          Number(el.getAttribute("data-coin-cost") || 0) > 0 ||
          Number(el.getAttribute("data-tile-lock-cost") || 0) > 0 ||
          !!el.getAttribute("data-tile-lock-key") ||
          !!el.getAttribute("data-pvw-paid");
        const paidNodes = nodes.filter(isPaid);
        if (requirePaid && !paidNodes.length) {
          return { count: nodes.length, opened: false, note: "요소는 있는데 유료 노드가 하나도 없다 — 유료 표식 배선을 볼 것" };
        }

        let navigated = false;
        document.addEventListener(
          "click",
          (e) => {
            navigated = true;
            e.preventDefault();
          },
          true,
        );

        const target = requirePaid ? paidNodes[0] : nodes[0];
        target.click();
        await settle();
        return {
          count: nodes.length,
          paidCount: paidNodes.length,
          opened: sheet(),
          reachedDefault: navigated,
          sample: (target.textContent || "").trim().slice(0, 30),
          tag: target.tagName.toLowerCase(),
          href: target.getAttribute("href") || "",
        };
      },
      {
        selector: surface.selector,
        prepare: surface.prepare || "",
        requirePaid: !!surface.requirePaid,
        presenceOnly: !!surface.presenceOnly,
      },
    );
    return { ...surface, ...result };
  } finally {
    await page.close();
  }
}

/* ───────────────────────────── 소스(정적) 재료 ───────────────────────────── */

/**
 * 마케팅 문안 키와 프리뷰 델리게이션 선택자는 **저장소 소스**에서 읽는다.
 * dist 의 인라인 스크립트는 해시 청크로 빠져 나가므로 dist 를 grep 하면 0건이 나온다(메모리).
 */
function readShellSource() {
  const shellPath = path.join(repoRoot, "index.html");
  const text = fs.readFileSync(shellPath, "utf8");

  const delegation = text.match(/closest\('(\.tarot-tile,[^']*)'\)/);
  if (!delegation) {
    console.error("[measure:home-score] 프리뷰 델리게이션 선택자를 index.html 에서 못 찾았다 — 선택자가 바뀌었는지 확인할 것.");
    process.exit(1);
  }

  const copyKeys = extractObjectKeys(text, "var FEATURE_MARKETING_COPY={");
  const templateKeys = extractObjectKeys(text, "var FEATURE_MARKETING_TEMPLATES={");

  return { delegationSelector: delegation[1], copyKeys, templateKeys };
}

/** `<이름>={` 부터 중괄호를 세어 객체 리터럴을 잘라내고 vm 에서 평가해 **키만** 가져온다. */
function extractObjectKeys(text, marker) {
  const start = text.indexOf(marker);
  if (start === -1) {
    console.error(`[measure:home-score] '${marker}' 를 index.html 에서 못 찾았다.`);
    process.exit(1);
  }
  const from = start + marker.length - 1;
  let depth = 0;
  let quote = "";
  let end = -1;
  for (let i = from; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "/" && text[i + 1] === "/") {
      const nl = text.indexOf("\n", i);
      i = nl === -1 ? text.length : nl;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) {
    console.error(`[measure:home-score] '${marker}' 의 객체 끝을 못 찾았다(중괄호 불균형).`);
    process.exit(1);
  }
  try {
    const value = vm.runInNewContext(`(${text.slice(from, end)})`, Object.create(null), { timeout: 2000 });
    return Object.keys(value);
  } catch (error) {
    console.error(`[measure:home-score] '${marker}' 를 평가하지 못했다: ${error.message}`);
    process.exit(1);
  }
}

/* ───────────────────────────── 축 3 (인용) ───────────────────────────── */

/**
 * 축 3 은 이 하네스가 재지 않는다. perf:home 이 남긴 JSON 을 읽고, 없으면 진단 문서의
 * 2026-09-01 값을 **인용으로 표시**하고 돈다. INP 는 perf:home 이 내지 않는 값이라
 * 항상 인용이거나 `--inp=` 로 주입한 값이다.
 */
function loadPerf() {
  const explicit = args.perfJson ? path.resolve(args.perfJson) : path.join(os.tmpdir(), "code-destiny-perf", "perf-head.json");
  const inp = args.inp === null ? null : args.inp;
  if (!fs.existsSync(explicit)) {
    return {
      source: "인용(2026-09-01 진단)",
      path: explicit,
      measuredAt: null,
      metrics: { performance: 63, lcp: 4580, tbt: 495, cls: 0.001, inp: inp === null ? 616 : inp },
      inpSource: inp === null ? "인용(2026-09-01 perf:interaction)" : "--inp",
    };
  }
  const raw = JSON.parse(fs.readFileSync(explicit, "utf8"));
  const mobile = raw?.results?.mobile?.metrics;
  if (!mobile) {
    console.error(`[measure:home-score] ${explicit} 에 mobile 프리셋 결과가 없다 — perf:home 을 --preset=mobile 로 돌릴 것.`);
    process.exit(1);
  }
  return {
    source: "실측(perf:home)",
    path: explicit,
    measuredAt: fs.statSync(explicit).mtime.toISOString(),
    metrics: {
      performance: mobile.performance.median,
      lcp: mobile.lcp.median,
      tbt: mobile.tbt.median,
      cls: mobile.cls.median,
      inp: inp === null ? 616 : inp,
    },
    inpSource: inp === null ? "인용(2026-09-01 perf:interaction)" : "--inp",
  };
}

/* ───────────────────────────── 점수 ───────────────────────────── */

function toRubricValues(m, perf) {
  const registry = m.registry;
  const copyKeys = new Set(source.copyKeys);
  const hasCopy = (item) => {
    const candidates = [item.action, item.featureKey, item.href];
    if (item.href) {
      candidates.push(item.href.replace(/\/+$/, ""));
      candidates.push(item.href.replace(/\/*$/, "/"));
    }
    return candidates.some((key) => key && copyKeys.has(key));
  };
  const free = registry.filter((item) => FREE_PRICES.has(item.price));
  const covered = registry.filter(hasCopy);
  const freeCovered = free.filter(hasCopy);
  /* 어떤 항목에 문안이 없는지가 PR-6 의 작업 목록이다 — JSON 산출물에 그대로 남긴다. */
  coverageDetail = registry.map((item) => ({
    id: item.id,
    href: item.href,
    price: item.price,
    free: FREE_PRICES.has(item.price),
    hasCopy: hasCopy(item),
  }));

  /* 🔴 스캔 0건은 "위반 없음"이 아니라 계측 실패다(앱 백그라운드 위양성 이력). */
  if (!m.sweep.scanned || !m.firstVisit.scannedFirstScreen) {
    console.error("[measure:home-score] 스캔한 요소가 0개다 — 페이지가 안 떴거나 렌더 전에 쟀다. 판정 불가.");
    process.exit(1);
  }

  return {
    axis1: {
      screens: m.sweep.docHeight / VIEWPORT.height,
      visibleInteractive: m.sweep.visibleInteractive,
      landingSections: m.layout.landingIds.length,
      destinationOverlapPairs: m.layout.overlaps.length,
    },
    axis2: {
      occludedInteractive: m.firstVisit.occlusionGroups.length,
      fixedFirstVisitPct: m.firstVisit.fixedPct,
      firstScreenServiceLinks: m.firstVisit.serviceLinksVisible,
      smallTapPct: Math.round((m.sweep.smallTapTargets / m.sweep.visibleInteractive) * 1000) / 10,
      horizontalOverflow: m.sweep.horizontalOverflow ? 1 : 0,
    },
    axis3: { ...perf.metrics },
    axis4: {
      previewSurfaces: m.surfaces.filter((s) => s.scored && s.opened).length,
      copyCoverage: covered.length,
      freeCopyCoverage: freeCovered.length,
      descLocales: m.descLocalized ? 12 : 1,
      _registryTotal: registry.length,
      _freeTotal: free.length,
    },
  };
}

function score(values) {
  const axes = RUBRIC.map((axis) => {
    const metrics = axis.metrics.map((metric) => {
      const value = values[axis.key][metric.key];
      const ratio = (value - metric.worst) / (metric.best - metric.worst);
      const points = Math.max(0, Math.min(1, ratio)) * 100;
      return { ...metric, value, points };
    });
    const total = metrics.reduce((sum, metric) => sum + metric.points * metric.weight, 0);
    return { ...axis, metrics, score: total };
  });
  const total = axes.reduce((sum, axis) => sum + axis.score, 0) / axes.length;
  return { axes, total };
}

/* ───────────────────────────── 보고 ───────────────────────────── */

function report(m, perf, scored) {
  const fmt = (value, digits) => (digits ? value.toFixed(digits) : String(Math.round(value)));

  console.log("");
  console.log(`[measure:home-score] 스캔 ${m.sweep.scanned}개 · 스윕 ${m.sweep.steps}단계 · 첫 화면 ${m.firstVisit.scannedFirstScreen}개`);
  console.log(`[measure:home-score] 축3 출처 ${perf.source}${perf.measuredAt ? ` (${perf.measuredAt})` : ""} · INP ${perf.inpSource}`);
  console.log("");

  for (const axis of scored.axes) {
    const flag = axis.score >= axis.target ? "OK" : "미달";
    console.log(`## ${axis.label} — ${axis.score.toFixed(1)} / 목표 ${axis.target} (${flag})`);
    console.log("| 지표 | 가중 | 측정 | 09-01 | 100점 | 0점 | 점수 |");
    console.log("|---|---:|---:|---:|---:|---:|---:|");
    for (const metric of axis.metrics) {
      console.log(
        `| ${metric.label} | ${Math.round(metric.weight * 100)}% | ${fmt(metric.value, metric.digits)} | ` +
          `${fmt(metric.baseline, metric.digits)} | ${metric.best} | ${metric.worst} | ${metric.points.toFixed(0)} |`,
      );
    }
    console.log("");
  }

  console.log(`## 총점 ${scored.total.toFixed(1)} / 목표 ${TOTAL_TARGET} (${scored.total >= TOTAL_TARGET ? "OK" : "미달"})`);
  console.log("");

  /* ── 판정 재료 — 점수만으로는 다음에 뭘 고쳐야 하는지 안 보인다 ── */
  console.log("### 프리뷰 도달 표면");
  console.log(`- 마스터 게이트 window.__cdFeatureMarketingPreviewEnabled = ${String(m.previewGate)}`);
  console.log(`- 모바일 유료-한정 window.__cdFeatureMarketingPreviewPaidOnly = ${String(m.previewPaidOnly)}` +
    (m.previewPaidOnly === true ? " (무료 표면은 시트 없이 즉시 진입이 정상이다)" : ""));
  console.log(`- 델리게이션 선택자: ${source.delegationSelector}`);
  console.log(`- 채점 대상은 ${PREVIEW_SURFACES.filter((s) => s.scored).length}종이다(나머지는 진단용 — 정의는 PREVIEW_SURFACES 주석).`);
  for (const surface of m.surfaces) {
    const state = surface.presenceOnly ? "표식만 확인" : surface.opened ? "열림" : "안 열림";
    const why = surface.note ? ` — ${surface.note}` : surface.count ? ` — 요소 ${surface.count}개, 시트 대신 기본 동작` : "";
    const paid = typeof surface.paidCount === "number" ? ` [유료 ${surface.paidCount}/${surface.count}]` : "";
    console.log(`- ${surface.label}${surface.scored ? "" : " *비채점*"} (${surface.selector}): ${state}${paid}${why}`);
  }
  console.log("");

  console.log("### 첫 화면 완전 가림");
  console.log(`- 결함(원인) 수: 첫 방문 ${m.firstVisit.occlusionGroups.length} · 재방문 ${m.revisit.occlusionGroups.length}`);
  if (!m.firstVisit.occluded.length) console.log("- 첫 방문: 없음");
  for (const item of m.firstVisit.occluded) {
    console.log(`- 첫 방문: ${item.node} "${item.text}" (y${item.top}) ← ${item.by} [원인 ${item.byGroup}]`);
  }
  if (!m.revisit.occluded.length) console.log("- 재방문: 없음");
  for (const item of m.revisit.occluded) {
    console.log(`- 재방문: ${item.node} "${item.text}" (y${item.top}) ← ${item.by} [원인 ${item.byGroup}]`);
  }
  console.log(
    `- 고정 UI 점유: 첫 방문 ${m.firstVisit.fixedPx}px(${m.firstVisit.fixedPct}%) · ` +
      `재방문 ${m.revisit.fixedPx}px(${m.revisit.fixedPct}%)${m.cookieAccepted ? "" : " 🔴 동의 버튼을 못 찾아 재방문 상태가 첫 방문과 같을 수 있다"}`,
  );
  console.log("");

  console.log("### 첫 화면 서비스 링크 (레지스트리 href 와 일치하는 것)");
  console.log(
    `- 첫 방문 ${m.firstVisit.serviceLinks.length}개 중 안 가려진 것 ${m.firstVisit.serviceLinksVisible}개 · ` +
      `재방문 ${m.revisit.serviceLinks.length}개 중 ${m.revisit.serviceLinksVisible}개 (레지스트리 href ${m.firstVisit.registryHrefs}종)`,
  );
  for (const link of m.firstVisit.serviceLinks) {
    console.log(`- 첫 방문 일치: ${link.href || `action:${link.action}`} "${link.text}" (y${link.top})${link.occluded ? " 🔴 가려짐" : ""}`);
  }
  for (const link of m.revisit.serviceLinks) {
    console.log(`- 재방문 일치: ${link.href || `action:${link.action}`} "${link.text}" (y${link.top})${link.occluded ? " 🔴 가려짐" : ""}`);
  }
  /* 🔴 "0개"의 원인을 사람이 판정할 수 있어야 한다 — 링크가 없는 것과, 있는데 레지스트리
     href 와 안 맞는 것과, 가려진 것은 서로 다른 결함이고 고치는 방법도 다르다. */
  for (const link of m.revisit.otherAnchors) {
    console.log(`- 재방문 불일치 앵커: ${link.href} "${link.text}" (y${link.top})${link.occluded ? " 🔴 가려짐" : ""}`);
  }
  console.log("");

  console.log("### 랜딩 섹션");
  const missing = LANDING_SECTIONS_20260901.filter((id) => !m.layout.landingIds.includes(id));
  const added = m.layout.landingIds.filter((id) => !LANDING_SECTIONS_20260901.includes(id));
  console.log(
    `- section[id] 총 ${m.layout.sectionsTotal}개 · #inputPage 안 보이는 것 ${m.layout.landingIds.length}개 · ` +
      `숨은 것 ${m.layout.landingHiddenIds.length}개${m.layout.landingHiddenIds.length ? ` (${m.layout.landingHiddenIds.join(" · ")})` : ""}`,
  );
  if (missing.length) console.log(`- 09-01 목록에 있는데 지금 없음: ${missing.join(" · ")}`);
  if (added.length) console.log(`- 09-01 목록에 없는데 지금 있음: ${added.join(" · ")}`);
  for (const overlap of m.layout.overlaps) {
    console.log(`- 목적지 중복: ${overlap.a} ↔ ${overlap.b} — ${overlap.shared.join(", ")}`);
  }
  console.log("");
}

function writeArtifact(m, perf, scored) {
  const outDir = args.out || path.join(os.tmpdir(), "code-destiny-home-score");
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `home-score-${args.label}.json`);
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        label: args.label,
        url: targetUrl,
        measuredAt: new Date().toISOString(),
        viewport: { ...VIEWPORT, deviceScaleFactor: DEVICE_SCALE_FACTOR },
        perf: { source: perf.source, path: perf.path, measuredAt: perf.measuredAt, inpSource: perf.inpSource },
        total: scored.total,
        axes: scored.axes.map((axis) => ({
          key: axis.key,
          label: axis.label,
          score: axis.score,
          target: axis.target,
          metrics: axis.metrics.map((metric) => ({
            key: metric.key,
            label: metric.label,
            weight: metric.weight,
            value: metric.value,
            baseline: metric.baseline,
            points: metric.points,
          })),
        })),
        raw: m,
        coverage: coverageDetail,
        delegationSelector: source.delegationSelector,
        copyKeys: source.copyKeys.length,
        templateKeys: source.templateKeys.length,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`[measure:home-score] wrote ${file}`);
}

/* ───────────────────────────── 인프라 ───────────────────────────── */

function parseArgs(argv) {
  const get = (name, fallback) => {
    const hit = argv.find((arg) => arg.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
  };
  const inpRaw = get("inp", "");
  return {
    url: get("url", ""),
    out: get("out", ""),
    perfJson: get("perf-json", ""),
    label: (get("label", "head") || "head").replace(/[^a-zA-Z0-9._-]/g, "-"),
    settle: Math.max(0, parseInt(get("settle", "6000"), 10)),
    inp: inpRaw === "" ? null : Number(inpRaw),
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

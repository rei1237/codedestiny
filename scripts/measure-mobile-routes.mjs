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
 *       --click=SEL[,SEL] (로드 후 순서대로 클릭 — 폼 제출이 있어야 뜨는 결과 화면용)
 *       --expect=SEL (클릭 후 이 요소가 보일 때까지 대기. 🔴 안 뜨면 레그를 INVALID 로 떨군다
 *       — 없으면 첫 화면을 재고 '발견 0건'으로 통과시키게 된다)
 *       --reveal=SEL[,SEL] (진입 애니메이션 래퍼. opacity 를 강제로 켜 하위를 표본에 넣는다 —
 *       스캐너의 visible() 이 checkVisibility({checkOpacity:true}) 라 opacity:0 으로 시작하는
 *       reveal 래퍼의 하위 전체가 OF·TT·IN 표본에서 통째로 빠진다. 🔴 0매칭이면 INVALID)
 *       --self-test (합성 픽스처로 축이 실제로 무는지 스스로 증명 — 서버·dist 불필요)
 *
 * 가로 오버플로는 세 축으로 잰다 — A: 자기 상자가 뷰포트를 벗어남 / B: 스스로 잘라 내는 상자 안에서
 * 내용이 사라짐 / C: 상자는 멀쩡한데 인라인 글자만 새어 나감(크로미엄의 scrollWidth 는 인라인 텍스트
 * 넘침을 신뢰성 있게 포함하지 않아 A·B 가 구조적으로 못 본다 — Range.getClientRects 로 잰다).
 * 세 축 모두에 위양성 필터 3종(sr-only · 가로 레일 조상 · 마퀴 트랙)을 걸고, 🔴 억제한 건수와
 * 표본을 반드시 함께 출력한다(필터는 fail-open 이라 이 출력이 유일한 감사 수단이다 — 원칙 10).
 *
 * 결과 화면 예 (dev 서버 + lib/dev-preview 픽스처 — 결제·LLM 실호출 없음):
 *   npm run measure:mobile-routes -- --target=http://127.0.0.1:3050 \
 *     --routes="/ziwei-ai/?preview=success&x=/" --click=".primaryBtn" \
 *     --expect="[data-ziwei-complete-result]"
 */

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** 🔴 축 구성이 바뀐 날짜 — 이 날 이전 원장 수치와 직접 비교하지 말 것(축이 늘고 필터가 붙었다) */
const AXIS_VERSION = "2026-09-06 · OF-A/B/C + 위양성필터3 + --reveal + 순회 fail-closed";
/** 축 C 의 측정 예산(텍스트를 가진 요소 수). 넘으면 조용히 자르지 않고 runsTruncated 로 알린다 */
const TEXT_RUN_BUDGET = 4000;

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
    click: [],
    expect: "",
    reveal: "",
    selfTest: false,
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
    else if (key === "--click") args.click = value.split(",").map((s) => s.trim()).filter(Boolean);
    else if (key === "--expect") args.expect = value.trim();
    else if (key === "--reveal") args.reveal = value.trim();
    else if (key === "--self-test") args.selfTest = true;
    else if (key === "--allow-stale") args.allowStale = true;
    else
      throw new Error(
        `알 수 없는 인자: ${raw} (지원: --routes --target --viewports --insets --settle --out --label ` +
          `--click --expect --reveal --self-test --allow-stale)`,
      );
  }
  if (args.selfTest) return args;
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
  const { selectors, minTap, minInputFont, minGap, backdropRatio, inset, textRunBudget } = params;
  const settle = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  /* 🔴 가로 기준은 layout viewport(innerWidth)가 아니라 **시각 뷰포트**다 — 크로미엄 모바일
     에뮬레이션은 <meta viewport width=device-width> 화면에서 내용이 넘치면 layout viewport 를
     내용 폭까지 늘린다(실측 2026-09-06: 412px 기기에서 innerWidth=754 / visualViewport.width=412).
     그 상태에서 innerWidth 로 재면 넘침이 기준 자체에 흡수돼 축 A·C 가 통째로 0 을 찍는다 —
     문서폭 게이트가 구조적으로 죽어 있던 것과 같은 종류의 사고다. html·body 에 overflow-x:clip 이
     걸린 화면(App Router 전부)에서는 두 값이 같아 기존 수치가 달라지지 않는다. */
  const vv = window.visualViewport;
  const viewportWidth = vv && vv.width > 0 ? Math.min(window.innerWidth, vv.width) : window.innerWidth;
  const layoutViewportExpanded = window.innerWidth - viewportWidth > 1;
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

  /* ── 위양성 필터 3종 ──────────────────────────────────────────────────────────
     필터 없이 /nakshatra/ 를 재면 이탈 150건이 나오는데 전부 마퀴 띠와 레일이었다.
     🔴 필터는 본질적으로 fail-open 이다(원칙 10) — 그래서 억제 건수를 세고 표본을 JSON 에
     남긴다. 억제 출력을 빼고 필터만 넣지 말 것. 🔴 필터는 위반 후보에만 돌린다(전 요소에
     getComputedStyle 을 걸면 스텝마다 스타일 재계산이 터진다). */
  const styleCache = new Map();
  const styleOf = (el) => {
    let value = styleCache.get(el);
    if (!value) {
      value = getComputedStyle(el);
      styleCache.set(el, value);
    }
    return value;
  };

  /** ① sr-only — 스크린리더 전용 노드는 상자를 1px 로 접고 내용을 잘라 낸다(설계상 정상) */
  const isSrOnly = (el, rect) => {
    const s = styleOf(el);
    if (/inset\(\s*50%/.test(s.clipPath || "")) return true;
    if (s.clip && s.clip !== "auto" && /^rect\(/.test(s.clip)) return true;
    return s.position === "absolute" && (rect.width <= 1 || rect.height <= 1);
  };

  /** ② 가로 레일 — 조상이 auto|scroll 이면 밖으로 나간 것은 스크롤로 닿는다(의도된 레일).
      🔴 축 B 는 **자기 자신의** overflow-x 만 봤다 — 레일 안의 넓은 자식이 전부 위반으로 찍히던
      구멍이 여기다(docs/handoff/mobile-feature-sweep.md §OF 열 정정). */
  const railAncestor = (el) => {
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const ox = styleOf(p).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
    }
    return false;
  };

  /** ③ 마퀴 트랙 — nowrap + 부모보다 넓은 상자 + 부모가 잘라 냄 + 애니메이션(app/nakshatra
      /nakshatra.module.css:160-170 의 .marquee > .mqRow 가 원형).
      🔴 선언값으로는 못 거른다 — getComputedStyle(...).width 는 max-content 가 아니라 사용값 px 을 준다.
      🔴 animation-name 을 요구해 규칙을 좁게 유지한다 — prefers-reduced-motion 으로 애니메이션이 꺼진
      채 재면 마퀴가 위반으로 찍히지만, 그 방향(노이즈)이 침묵보다 안전하다.
      🔴 부모가 body/html 이면 제외한다 — 이 레포는 html·body 에 overflow-x:clip 을 걸어서
      (styles/globals.css:80-81,111-112) 본문 직계의 nowrap 결함이 통째로 마퀴로 오인된다. */
  const isMarqueeTrack = (el) => {
    const p = el.parentElement;
    if (!p || p === document.body || p === document.documentElement) return false;
    const s = styleOf(el);
    if (s.whiteSpace !== "nowrap" && s.whiteSpace !== "pre") return false;
    if (!s.animationName || s.animationName === "none") return false;
    if (styleOf(p).overflowX === "visible") return false;
    if (!p.clientWidth) return false;
    return el.getBoundingClientRect().width > p.clientWidth + 1;
  };

  const suppressed = { srOnly: 0, rail: 0, marquee: 0 };
  const suppressedSamples = [];
  /** 위반 후보를 억제할 사유 — 없으면 null. 억제해도 반드시 센다. */
  const suppressReason = (el, rect) => {
    if (isSrOnly(el, rect)) return "srOnly";
    if (railAncestor(el)) return "rail";
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      if (isMarqueeTrack(a)) return "marquee";
    }
    return null;
  };
  /** 축 B 전용 — 잘라 내는 상자 자신은 마퀴가 아니고 **안의 트랙**이 마퀴다(조상 방향으로는 안 잡힌다) */
  const clipsMarqueeTrack = (el) => {
    for (const child of el.querySelectorAll("*")) if (isMarqueeTrack(child)) return true;
    return false;
  };
  const suppress = (reason, axis, el) => {
    suppressed[reason] += 1;
    if (suppressedSamples.length < 30) suppressedSamples.push({ axis, reason, label: describe(el) });
  };

  /** 자기 자식 요소가 아니라 자기 텍스트를 담고 있는가 — measure-locale-text-fit.mjs 의 ownsText 와 같은 판정 */
  const ownsText = (el) => {
    for (const node of el.childNodes) {
      if (node.nodeType === 3 && node.nodeValue && node.nodeValue.trim().length >= 2) return true;
    }
    return false;
  };
  /** 축 C — 인라인 텍스트 런이 뷰포트를 넘어간 최대 px. 판정 기준은 축 A 와 같다(뷰포트 우변·좌변). */
  const textRunOverflow = (el) => {
    let worst = 0;
    for (const node of el.childNodes) {
      if (node.nodeType !== 3 || !node.nodeValue || node.nodeValue.trim().length < 2) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) {
        if (r.width <= 0 || r.height <= 0) continue;
        const over = Math.max(r.right - viewportWidth, -r.left);
        if (over > worst) worst = over;
      }
    }
    return worst;
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
  const seenClipped = new Set();
  const seenTextRun = new Set();
  const seenFixed = new Set();
  const smallTargets = [];
  const inputsUnder = [];
  const readingBlocks = [];
  const overflowOffenders = [];
  const clippedOffenders = [];
  const textRunOffenders = [];
  const fixedBottom = [];
  let scanned = 0;
  let inputsTotal = 0;
  let docOverflow = false;
  let runBudget = textRunBudget;
  let runsTruncated = false;

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

  // 🔴 스크롤은 반드시 즉시 이동이어야 한다 — styles/core-ui.css:23-27 이 prefers-reduced-motion 이
  // 없는 환경(플레이라이트 기본)의 html 에 scroll-behavior:smooth 를 건다. 그러면 window.scrollTo(x,y)
  // 가 애니메이션으로 돌고 두 rAF 짜리 settle 은 그 첫 프레임만 본다 — 7854px 문서에서 7407px 를
  // 요청해도 실제 scrollY 는 540px 이었다(2026-09-06 실측, /nakshatra/muhurta/). 축 A·B·C 는 전부
  // 뷰포트 안 요소만 세므로 순회가 끊기면 "첫 화면만 잰 결과"가 발견 0건으로 보고된다. 그래서
  // 여기서는 ① CSS 를 눌러 끄고 ② behavior:"instant" 로 요청하고 ③ 도달한 scrollY 를 검사한다.
  const scrollStyle = document.createElement("style");
  scrollStyle.textContent = "html,body{scroll-behavior:auto !important}";
  document.documentElement.appendChild(scrollStyle);
  const maxScrollY = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  let scrollReach = window.innerHeight;
  let scrollStalled = null;
  const scrollToY = async (y) => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      window.scrollTo({ top: Math.min(y, maxScrollY()), left: 0, behavior: "instant" });
      await settle();
      if (Math.abs(window.scrollY - Math.min(y, maxScrollY())) <= 2) break;
    }
    const want = Math.min(y, maxScrollY());
    if (!scrollStalled && Math.abs(window.scrollY - want) > 2) {
      scrollStalled = { want: Math.round(want), got: Math.round(window.scrollY), asked: Math.round(y) };
    }
    scrollReach = Math.max(scrollReach, window.scrollY + window.innerHeight);
  };

  const step = window.innerHeight;
  let steps = 0;
  for (let y = 0; y < document.documentElement.scrollHeight && steps < 80; y += step) {
    await scrollToY(y);
    steps += 1;

    // 🔴 문서 폭 게이트는 이 레포에서 구조적으로 죽어 있다 — styles/globals.css:80-81,111-112 가
    // html·body 에 overflow-x:clip 을 걸어 documentElement.scrollWidth 는 clientWidth 를 넘을 수
    // 없다. 그래서 넘친 내용은 가로 스크롤바가 아니라 조용한 잘림으로 나타나고, 이 게이트 안에
    // 갇혀 있던 요소 수집기는 한 번도 돈 적이 없다(docs/handoff/mobile-feature-sweep.md 의 OF 열이
    // 55개 기능 전 배치에서 0 이었던 이유). 게이트 없이 요소 단위 두 축으로 잰다.
    if (document.documentElement.scrollWidth > window.innerWidth + 1) docOverflow = true;

    for (const el of document.body.querySelectorAll("*")) {
      const rect = el.getBoundingClientRect();
      if (!visible(el, rect)) continue;

      // 축 A — 자기 박스가 뷰포트 밖으로 나간 것
      if (!seenOverflow.has(el)) {
        const overRight = rect.right - viewportWidth;
        const overLeft = -rect.left;
        if (overRight > 1 || overLeft > 1) {
          seenOverflow.add(el);
          const reason = suppressReason(el, rect);
          if (reason) suppress(reason, "OF-A", el);
          else overflowOffenders.push({ label: describe(el), overPx: Number(Math.max(overRight, overLeft).toFixed(1)) });
        }
      }

      // 축 C — 상자는 제자리인데 인라인 글자만 새어 나간 것. 크로미엄의 scrollWidth 는 인라인 텍스트
      // 넘침을 신뢰성 있게 포함하지 않아 축 A·B 둘 다 이 결함을 구조적으로 못 본다(6개 기능 세션이
      // 매번 1회용 Range 프로브를 새로 만들어 이 축에서만 결함을 봤다). 축 A 로 이미 잡힌 요소는
      // 같은 결함이므로 다시 세지 않는다.
      if (
        !seenTextRun.has(el) &&
        !seenOverflow.has(el) &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        ownsText(el)
      ) {
        if (runBudget <= 0) runsTruncated = true;
        else {
          seenTextRun.add(el);
          runBudget -= 1;
          const over = textRunOverflow(el);
          if (over > 1) {
            const reason = suppressReason(el, rect);
            if (reason) suppress(reason, "OF-C", el);
            else textRunOffenders.push({ label: describe(el), overPx: Number(over.toFixed(1)) });
          }
        }
      }

      // 축 B — 스스로 잘라 내는 상자 안에서 내용이 넘쳐 사라진 것.
      // minmax(0,1fr) 은 트랙 폭만 고정할 뿐 줄바꿈 못 하는 내용(white-space:nowrap · keep-all 긴
      // 어절 · 고정 px 폭)은 아이템 박스 밖으로 샌다. 아이템의 layout box 는 트랙 폭 그대로라
      // 축 A 로는 절대 안 잡히고, 조상의 overflow:hidden|clip 에서 조용히 잘린다.
      if (seenClipped.has(el)) continue;
      const lost = el.scrollWidth - el.clientWidth;
      if (lost <= 1) continue;
      // 🔴 getComputedStyle 은 넘친 요소에만 — 전 요소에 걸면 스텝마다 스타일 재계산이 터진다.
      const overflowX = getComputedStyle(el).overflowX;
      // overflow-x:auto|scroll 은 의도된 가로 레일이므로 위반이 아니다.
      if (overflowX !== "hidden" && overflowX !== "clip") continue;
      seenClipped.add(el);
      const clipReason = suppressReason(el, rect) || (clipsMarqueeTrack(el) ? "marquee" : null);
      if (clipReason) {
        suppress(clipReason, "OF-B", el);
        continue;
      }
      // 잘린 상자만으로는 원인을 못 짚는다 — 내용이 제 박스보다 넓은 자손을 같이 남긴다.
      const culprits = [];
      for (const child of el.querySelectorAll("*")) {
        const spill = child.scrollWidth - child.clientWidth;
        if (spill <= 1) continue;
        const childRect = child.getBoundingClientRect();
        if (!visible(child, childRect)) continue;
        culprits.push({ label: describe(child), spillPx: Number(spill.toFixed(1)) });
      }
      clippedOffenders.push({
        label: describe(el),
        lostPx: Number(lost.toFixed(1)),
        culprits: culprits.sort((a, b) => b.spillPx - a.spillPx).slice(0, 3),
      });
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
  await scrollToY(0);
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
    scrollReach: Math.round(scrollReach),
    scrollStalled,
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth,
    layoutViewportExpanded,
    visibleInteractive: seenTap.size,
    docOverflow,
    overflowOffenders: overflowOffenders.sort((a, b) => b.overPx - a.overPx).slice(0, 10),
    clippedOffenders: clippedOffenders.sort((a, b) => b.lostPx - a.lostPx).slice(0, 10),
    textRunOffenders: textRunOffenders.sort((a, b) => b.overPx - a.overPx).slice(0, 10),
    textRunSeen: seenTextRun.size,
    runsTruncated,
    suppressed,
    suppressedSamples,
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

/** --reveal 주입 전후의 표본 크기 — probe 의 visible() 과 같은 판정을 써야 수치가 비교된다 */
function countVisibleElements() {
  let count = 0;
  for (const el of document.body.querySelectorAll("*")) {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    if (typeof el.checkVisibility === "function") {
      if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    } else {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.05) continue;
    }
    count += 1;
  }
  return count;
}

/** 🔴 셀렉터 목록은 항목마다 펼쳐야 한다 — "a,b" 에 " *" 를 그냥 붙이면 마지막 항목에만 걸린다 */
function revealRule(selector) {
  const parts = selector.split(",").map((s) => s.trim()).filter(Boolean);
  const scope = parts.flatMap((p) => [p, `${p} *`]).join(",");
  // transform 까지 끄는 이유 — reveal 은 대개 opacity + translate 쌍이라, 정지시키지 않으면
  // 중간 위치의 기하를 재게 된다. 애니메이션만 멈추는 것으로는 인라인 스타일을 못 이긴다.
  return `${scope}{opacity:1!important;visibility:visible!important;animation:none!important;transition:none!important;transform:none!important;}`;
}

/** 화면을 다 몰고 간 뒤의 계측 한 번 — measureLeg 와 --self-test 가 같은 경로를 쓰게 묶었다 */
async function runProbe(page, inset, revealSelector) {
  let reveal = null;
  if (revealSelector) {
    const matched = await page.evaluate((sel) => document.querySelectorAll(sel).length, revealSelector);
    // 🔴 fail-closed — 오탈자로 0매칭이면 표본이 그대로인 채 '발견 0건'이 나온다(--expect 와 같은 취급).
    if (!matched) return { invalidReason: `--reveal 셀렉터 0매칭 (${revealSelector}) — 표본이 안 늘었다` };
    const before = await page.evaluate(countVisibleElements);
    await page.addStyleTag({ content: revealRule(revealSelector) });
    await page.waitForTimeout(300);
    const after = await page.evaluate(countVisibleElements);
    reveal = { selector: revealSelector, matched, before, after };
  }
  const result = await page.evaluate(probe, {
    selectors: { interactive: INTERACTIVE_SELECTOR, input: INPUT_SELECTOR, reading: READING_SELECTOR, exit: EXIT_SELECTOR },
    minTap: MIN_TAP_PX,
    minInputFont: MIN_INPUT_FONT_PX,
    minGap: MIN_GAP,
    backdropRatio: BACKDROP_HEIGHT_RATIO,
    inset,
    textRunBudget: TEXT_RUN_BUDGET,
  });
  return { reveal, result };
}

async function measureLeg(browser, origin, route, viewport, inset, settleMs, clickSelectors = [], expectSelector = "", revealSelector = "") {
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

    // 결과 화면은 폼 제출 뒤에 뜬다 — 여기까지 몰고 가지 않으면 첫 화면만 재게 된다
    // (docs/handoff/mobile-feature-sweep.md 비고: 스캐너는 첫 화면만 본다).
    for (const selector of clickSelectors) {
      try {
        await page.locator(selector).first().click({ timeout: 15000 });
      } catch (error) {
        return { valid: false, invalidReason: `--click 실패 (${selector}) — ${error.message}` };
      }
      await page.waitForTimeout(settleMs);
    }
    // 🔴 fail-closed — 기대한 화면이 안 떴는데 재면 그 '발견 0건'은 거짓이다.
    if (expectSelector) {
      try {
        await page.locator(expectSelector).first().waitFor({ state: "visible", timeout: 30000 });
      } catch (error) {
        return { valid: false, invalidReason: `--expect 미출현 (${expectSelector}) — ${error.message}` };
      }
      await page.waitForTimeout(settleMs);
    }
    const probed = await runProbe(page, inset, revealSelector);
    if (probed.invalidReason) return { valid: false, invalidReason: probed.invalidReason };
    const result = { ...probed.result, reveal: probed.reveal };

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
    // 🔴 순회 도달 fail-closed — 축 3종은 전부 뷰포트 안 요소만 센다. 스크롤이 문서 끝까지 못 가면
    // 아래쪽을 한 번도 안 본 채 "발견 0건"이 되므로, 부분 순회는 통과가 아니라 무효다.
    if (result.scrollStalled) {
      const s = result.scrollStalled;
      return { valid: false, invalidReason: `스크롤 정체 — ${s.want}px 요청에 ${s.got}px 도달. 순회가 끊겨 판정 무효`, ...result };
    }
    if (result.scrollReach + 2 < result.docHeight) {
      return {
        valid: false,
        invalidReason: `문서 ${result.docHeight}px 중 ${result.scrollReach}px 까지만 훑음(스크롤 잠금·스텝 한도 의심) — 판정 무효`,
        ...result,
      };
    }
    return { valid: true, ...result };
  } catch (error) {
    return { valid: false, invalidReason: `로드/계측 실패 — ${error.message}` };
  } finally {
    await context.close();
  }
}

/* ── 자체 검증 픽스처 ────────────────────────────────────────────────────────────
   🔴 이 레포에서 오버플로 게이트가 55개 기능 전 배치에서 0 을 찍은 원인은 "요소 수집기가
   if (docOverflow) 안에 갇혀 한 번도 실행된 적이 없었다" 였다. 축이 도는 것과 축이 무는 것은
   다르다 — 진짜 위반 4개와 위양성 3개를 심어 두고 축마다 무는 것을 매번 증명한다.
   fp* = 물면 안 되는 것(위양성), #of* = 반드시 물어야 하는 것. */
const selfTestHtml = (clip) => `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>self-test</title><style>
  ${clip ? "html, body { overflow-x: clip; }" : "/* clip 없음 — layout viewport 가 내용 폭까지 늘어난다 */"}
  body { margin: 0; font: 16px/1.4 sans-serif; }
  h1 { font-size: 18px; margin: 8px; }
  .fpSrOnly { position: absolute; width: 1px; height: 1px; overflow: hidden;
              clip: rect(0,0,0,0); clip-path: inset(50%); white-space: nowrap; }
  .fpRail { overflow-x: auto; width: 300px; }
  .fpRailWide { width: 900px; height: 24px; background: #eee; }
  .fpMarquee { overflow: hidden; width: 300px; }
  .fpMarqueeTrack { display: flex; gap: 20px; white-space: nowrap; width: max-content;
                    animation: slide 40s linear infinite; }
  @keyframes slide { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  #ofA { position: absolute; left: 380px; top: 260px; width: 220px; height: 30px; background: #fdd; }
  #ofB { overflow-x: hidden; width: 100px; }
  #ofB span { white-space: nowrap; }
  #ofC { width: 280px; white-space: nowrap; }
  /* 🔴 프로덕션 셸과 같은 조건 — styles/core-ui.css:23-27 이 html 에 거는 것 */
  html { scroll-behavior: smooth; }
  #ofDeep { width: 280px; white-space: nowrap; }
  .revealWrap { opacity: 0; }
  #ofReveal { position: absolute; left: 390px; top: 340px; width: 220px; height: 30px; background: #dfd; }
</style></head><body>
<h1>measure:mobile-routes 자체 검증</h1>
<button type="button">버튼</button>
<span class="fpSrOnly">스크린리더 전용 안내 문구가 아주 길게 이어지는 노드입니다</span>
<div class="fpRail"><div class="fpRailWide">가로 레일</div></div>
<div class="fpMarquee"><div class="fpMarqueeTrack"><span>마퀴 항목 하나</span><span>마퀴 항목 둘</span
  ><span>마퀴 항목 셋</span><span>마퀴 항목 넷</span><span>마퀴 항목 다섯</span><span>마퀴 항목 여섯</span></div></div>
<div id="ofA">뷰포트 밖 상자</div>
<div id="ofB"><span>nnnnnnnnnnnnnnnnnnnnnnnn</span></div>
<div id="ofC">wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww</div>
<div class="revealWrap"><div id="ofReveal">진입 애니메이션 안의 이탈 상자</div></div>
<div style="height:4200px"></div>
<div id="ofDeep">wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww</div>
<div style="height:900px"></div>
</body></html>`;

async function runSelfTest(browser) {
  const context = await browser.newContext({
    viewport: { width: 412, height: 823 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    userAgent: MOBILE_UA,
  });
  const failures = [];
  const check = (ok, message) => {
    if (!ok) failures.push(message);
  };
  const labels = (list) => (list.length ? list.map((x) => x.label).join(" | ") : "—");
  const has = (list, needle) => list.some((x) => x.label.includes(needle));

  const load = async (clip = true) => {
    const page = await context.newPage();
    await page.setContent(selfTestHtml(clip), { waitUntil: "load" });
    await page.waitForTimeout(300);
    return page;
  };

  try {
    const base = await runProbe(await load(), 0, "");
    if (base.invalidReason) throw new Error(`기본 계측 실패 — ${base.invalidReason}`);
    const r = base.result;
    console.log(
      `  기본     OF-A=${r.overflowOffenders.length} OF-B=${r.clippedOffenders.length} OF-C=${r.textRunOffenders.length}` +
        ` 억제=sr-only:${r.suppressed.srOnly} 레일:${r.suppressed.rail} 마퀴:${r.suppressed.marquee}`,
    );
    console.log(`    OF-A ${labels(r.overflowOffenders)}`);
    console.log(`    OF-B ${labels(r.clippedOffenders)}`);
    console.log(`    OF-C ${labels(r.textRunOffenders)}`);
    console.log(`    억제 ${r.suppressedSamples.map((s) => `${s.axis}/${s.reason} ${s.label}`).join(" | ") || "—"}`);

    check(r.visibilityState === "visible", "픽스처가 visible 이 아니다 — 계측 자체가 무효");
    check(has(r.overflowOffenders, "#ofA"), "축 A 가 #ofA(뷰포트 이탈 상자)를 못 잡았다");
    check(has(r.clippedOffenders, "#ofB"), "축 B 가 #ofB(자기 상자 안에서 잘린 내용)를 못 잡았다");
    check(has(r.textRunOffenders, "#ofC"), "축 C 가 #ofC(상자 밖으로 샌 인라인 글자)를 못 잡았다");
    // 🔴 축 C 가 새 축이라는 증명 — 같은 결함을 축 A·B 가 잡는다면 축을 추가할 이유가 없다.
    check(
      !has(r.overflowOffenders, "#ofC") && !has(r.clippedOffenders, "#ofC"),
      "#ofC 가 축 A·B 로도 잡혔다 — 픽스처가 축 C 의 존재 이유를 증명하지 못한다",
    );
    check(!has(r.overflowOffenders, "#ofReveal"), "--reveal 없이 opacity:0 하위가 표본에 들어왔다");
    // 🔴 순회 변이 — 픽스처는 프로덕션과 같은 scroll-behavior:smooth 를 걸고 위반 하나를 4,200px
    // 아래 숨긴다. 스크롤이 애니메이션으로 돌면(옛 window.scrollTo(0,y)) 여기서 반드시 실패한다.
    console.log(`    순회     docHeight=${r.docHeight} reach=${r.scrollReach} steps=${r.steps} stalled=${JSON.stringify(r.scrollStalled)}`);
    check(r.scrollStalled === null, `스크롤이 요청한 오프셋에 못 갔다: ${JSON.stringify(r.scrollStalled)}`);
    check(r.scrollReach + 2 >= r.docHeight, `순회가 문서 ${r.docHeight}px 중 ${r.scrollReach}px 에서 끊겼다`);
    check(has(r.textRunOffenders, "#ofDeep"), "문서 4,200px 아래의 축 C 위반을 못 잡았다 — 스크롤 순회가 첫 화면에서 끊긴다");
    for (const [axis, list] of [
      ["OF-A", r.overflowOffenders],
      ["OF-B", r.clippedOffenders],
      ["OF-C", r.textRunOffenders],
    ]) {
      check(!list.some((x) => x.label.includes("fp")), `${axis} 에 위양성 픽스처가 보고됐다: ${labels(list)}`);
    }
    check(r.suppressed.srOnly >= 1, "sr-only 억제 0건 — 필터 ①이 안 돈다");
    check(r.suppressed.rail >= 1, "가로 레일 억제 0건 — 필터 ②가 안 돈다");
    check(r.suppressed.marquee >= 1, "마퀴 트랙 억제 0건 — 필터 ③이 안 돈다");

    // 변이 — 같은 화면에 --reveal 만 붙이면 표본이 늘고 숨어 있던 위반이 드러나야 한다
    const revealed = await runProbe(await load(), 0, ".revealWrap");
    if (revealed.invalidReason) throw new Error(`--reveal 계측 실패 — ${revealed.invalidReason}`);
    const rv = revealed.result;
    console.log(
      `  --reveal OF-A=${rv.overflowOffenders.length} 표본 ${revealed.reveal.before}→${revealed.reveal.after}` +
        ` (매칭 ${revealed.reveal.matched}개)`,
    );
    console.log(`    OF-A ${labels(rv.overflowOffenders)}`);
    check(has(rv.overflowOffenders, "#ofReveal"), "--reveal 을 붙였는데도 opacity:0 하위 위반이 안 드러났다");
    check(revealed.reveal.after > revealed.reveal.before, "--reveal 주입 후 표본이 안 늘었다");

    // 🔴 layout viewport 확장 — html·body 에 overflow-x:clip 이 없는 셸(루트 정적 셸 24개 중 일부)에서는
    // 크로미엄이 layout viewport 를 내용 폭까지 늘려 innerWidth 가 넘침을 흡수한다. innerWidth 를
    // 기준으로 재던 옛 축 A 는 이 화면에서 통째로 0 을 찍었다(2026-09-06 실측). 기준을 시각 뷰포트로
    // 바꾼 것이 실제로 무는지 같은 픽스처의 clip 없는 판으로 증명한다.
    const wide = await runProbe(await load(false), 0, "");
    if (wide.invalidReason) throw new Error(`clip 없는 판 계측 실패 — ${wide.invalidReason}`);
    const w = wide.result;
    console.log(
      `  확장     innerWidth=${w.innerWidth} 기준폭=${w.viewportWidth} 확장=${w.layoutViewportExpanded}` +
        ` OF-A=${w.overflowOffenders.length} OF-C=${w.textRunOffenders.length}`,
    );
    check(w.layoutViewportExpanded === true, "clip 없는 픽스처에서 layout viewport 가 안 늘었다 — 이 경우를 못 재고 있다");
    check(has(w.overflowOffenders, "#ofA"), "layout viewport 확장 화면에서 축 A 가 #ofA 를 놓쳤다(기준폭이 넘침을 흡수)");

    // fail-closed — 오탈자 셀렉터는 조용히 통과하면 안 된다
    const missed = await runProbe(await load(), 0, ".no-such-reveal-wrapper");
    check(!!missed.invalidReason, "--reveal 0매칭이 INVALID 로 안 떨어졌다(오탈자가 '발견 0건'이 된다)");
    console.log(`  0매칭    ${missed.invalidReason || "(INVALID 안 남)"}`);
  } finally {
    await context.close();
  }

  if (failures.length) {
    for (const message of failures) console.error(`✗ ${message}`);
    console.error(`[measure:mobile-routes] 자체 검증 실패 ${failures.length}건 — 축이 물지 않는다.`);
    return false;
  }
  console.log("[measure:mobile-routes] 자체 검증 통과 — 축 3종·필터 3종·--reveal 변이 모두 확인.");
  return true;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.selfTest) {
    console.log(`[measure:mobile-routes] 자체 검증 (축 ${AXIS_VERSION})`);
    const browser = await chromium.launch();
    let ok = false;
    try {
      ok = await runSelfTest(browser);
    } finally {
      await browser.close();
    }
    if (!ok) process.exit(1);
    return;
  }

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
  // 🔴 축 버전 — 축이 늘고 위양성 필터가 붙었으므로 이 날 이전 원장 수치와 직접 비교하지 말 것.
  console.log(`  축=${AXIS_VERSION}${args.reveal ? ` reveal=${args.reveal}` : ""}`);

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
          const leg = await measureLeg(browser, origin, route, viewport, inset, args.settle, args.click, args.expect, args.reveal);
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
          const sup = leg.suppressed;
          console.log(
            `· ${tag} scanned=${leg.visibleInteractive}/${leg.scanned} 순회=${leg.docHeight}px` +
              `${leg.reveal ? ` revealed=${leg.reveal.before}→${leg.reveal.after}` : ""} ` +
              `OF-A=${leg.overflowOffenders.length} OF-B=${leg.clippedOffenders.length} ` +
              `OF-C=${leg.textRunOffenders.length}${leg.runsTruncated ? "+" : ""} ` +
              `TT<44=${leg.smallTapTargets} IN<16=${leg.inputsUnder16.length}/${leg.inputsTotal} ` +
              `SAgap=${sa} 열폭=${leg.readingCol ? `${leg.readingCol.min}px` : "—"} ` +
              `이탈=${leg.bottomNavVisible ? "탭바" : leg.exitFound.length ? "유" : "수동확인"}`,
          );
          // 🔴 억제 건수는 항상 찍는다 — 필터는 fail-open 이라 이 줄과 JSON 의 suppressedSamples 가
          // 유일한 감사 수단이다. 수치가 크면 진짜 결함을 삼켰는지 표본으로 확인할 것.
          if (sup.srOnly || sup.rail || sup.marquee)
            console.log(`    ⊘ 억제(위양성 필터) sr-only=${sup.srOnly} 레일=${sup.rail} 마퀴=${sup.marquee}`);
          if (leg.runsTruncated) console.log(`    ⚠ 축 C 측정 예산(${TEXT_RUN_BUDGET}) 초과 — 글자 이탈 수치가 하한이다.`);
          for (const off of leg.overflowOffenders) console.log(`    ↔ ${off.overPx}px 뷰포트 이탈: ${off.label}`);
          for (const run of leg.textRunOffenders) console.log(`    ✎ 글자 ${run.overPx}px 이탈(상자는 제자리): ${run.label}`);
          for (const clip of leg.clippedOffenders) {
            console.log(`    ✂ ${clip.lostPx}px 잘림: ${clip.label}`);
            for (const c of clip.culprits) console.log(`        └ 내용 ${c.spillPx}px 초과: ${c.label}`);
          }
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

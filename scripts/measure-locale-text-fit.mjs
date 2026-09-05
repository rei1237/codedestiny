#!/usr/bin/env node
/**
 * measure:locale-text-fit — 같은 화면을 12개 UI 로케일로 실제 렌더해서 "글자가 칸에 들어가는지"를
 * 기하로 재는 계측기. 로케일별 팽창률이 최대 1.44배(fr)인데 로케일별 타이포 완충이 코드베이스에
 * 하나도 없어서(전체 추적 파일 `git grep ":lang(|\[lang=|html\[lang"` → 0건), 한국어 기준으로
 * 레이아웃된 셸에 더 긴 문자열이 그대로 꽂힌다.
 *
 * 🔴 verify:* 가 아니라 measure:* 인 이유 — verify:* 는 scripts/verify-guard-wiring.mjs 가
 * CI 배선을 강제하는데, 이 스크립트는 dist 빌드 + 브라우저 기동이 필요해 PR CI 게이트가 될 수
 * 없다(measure-mobile-routes.mjs:8-11 과 같은 사유). 발견(findings)은 데이터이지 실패가 아니다 —
 * exit 1 은 측정 자체가 무효(INVALID)일 때만 낸다. verify:* 로 개명하지 말 것.
 * 정적으로 잡을 수 있는 축은 npm run verify:locale-text-fit 이 CI 에서 이미 막는다.
 *
 * 재는 것 — 가로 오버플로를 **로케일 문자열 관점**에서 본다. 기하 축(뷰포트 이탈·하드 클립·글자 런)은
 * measure-mobile-routes.mjs 가 OF-A/B/C 로 재므로 겹치지 않는다 — 여기서 보는 것은 아래 셋이다.
 *   clip    : 글자가 자기 칸을 넘겼는데 부모가 hidden/ellipsis/line-clamp 로 잘라내고 있다
 *   spill   : overflow-x:hidden 조상의 안쪽 상자 밖으로 자손이 나갔다(결제창 배지 파손의 모양)
 *   collide : 같은 행의 형제 상자가 겹쳤다
 * ko 를 기준선으로 먼저 재고, 로케일별로 **ko 에 없던 발견**만 새 파손으로 보고한다.
 *
 * 실행:
 *   npm run build   (App Router 라우트를 재려면 dist/ 가 최신이어야 한다)
 *   npm run measure:locale-text-fit -- --routes=/,/points/ --out=.tmp/ltf
 *   npm run measure:locale-text-fit -- --routes=/ --locales=ko,de,fr --viewports=360x800
 *   npm run measure:locale-text-fit -- --routes=/ --pseudo=x40    (원문 +40% 스트레스)
 *   npm run measure:locale-text-fit -- --routes=/ --pseudo=min    (최단 극단)
 *   npm run measure:locale-text-fit -- --routes=/ --open="#someCta"  (측정 전 한 번 클릭)
 *
 * 🔴 결제 선택창처럼 조작해야 열리는 표면은 --open 으로 여는 사람이 직접 지정한다. 이 스크립트는
 *    결제 로직을 알지 못하고, 어떤 주문도 만들지 않는다.
 */

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { RUNTIME_LOCALES } from "../lib/i18n/locale-normalize.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** 갤럭시 M15 5G 급 프로필 — measure-mobile-routes.mjs:57-61 에서 복사 */
const DEVICE_SCALE_FACTOR = 1.75;
const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 16; SM-M156B) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/140.0.0.0 Mobile Safari/537.36";

/** 이 밑으로는 반올림 오차로 보고 무시한다. 1px 은 서브픽셀 레이아웃에서 상시 발생한다. */
const TOLERANCE_PX = 1.5;

function parseArgs(argv) {
  const args = {
    routes: [],
    target: "dist",
    locales: [...RUNTIME_LOCALES],
    viewports: [
      { width: 412, height: 823 },
      { width: 360, height: 800 },
    ],
    settle: 2500,
    switchSettle: 900, // 셸 repair observer 디바운스(400ms)를 넉넉히 넘긴다
    pseudo: "",
    open: "",
    out: path.join(os.tmpdir(), "code-destiny-locale-text-fit"),
    label: new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19),
    allowStale: false,
  };
  for (const raw of argv) {
    const [key, value = ""] = raw.split(/=(.*)/s);
    if (key === "--routes") args.routes = value.split(",").map((r) => r.trim()).filter(Boolean);
    else if (key === "--target") args.target = value;
    else if (key === "--locales") args.locales = value.split(",").map((l) => l.trim()).filter(Boolean);
    else if (key === "--viewports")
      args.viewports = value.split(",").map((v) => {
        const [w, h] = v.toLowerCase().split("x").map(Number);
        if (!Number.isFinite(w) || !Number.isFinite(h)) throw new Error(`--viewports 형식 오류: ${v}`);
        return { width: w, height: h };
      });
    else if (key === "--settle") args.settle = Number(value);
    else if (key === "--switch-settle") args.switchSettle = Number(value);
    else if (key === "--pseudo") args.pseudo = value;
    else if (key === "--open") args.open = value;
    else if (key === "--out") args.out = path.resolve(value);
    else if (key === "--label") args.label = value;
    else if (key === "--allow-stale") args.allowStale = true;
    else
      throw new Error(
        `알 수 없는 인자: ${raw} (지원: --routes --target --locales --viewports --settle ` +
          "--switch-settle --pseudo --open --out --label --allow-stale)",
      );
  }
  if (!args.routes.length) throw new Error("--routes=/route/ 가 필요합니다 (쉼표로 여러 개).");
  if (args.pseudo && !["x40", "min"].includes(args.pseudo)) {
    throw new Error(`--pseudo 는 x40 | min 이어야 합니다 (받음: ${args.pseudo})`);
  }
  const unknown = args.locales.filter((l) => !RUNTIME_LOCALES.includes(l));
  if (unknown.length) {
    throw new Error(
      `지원하지 않는 로케일: ${unknown.join(",")} (지원: ${RUNTIME_LOCALES.join(",")})`,
    );
  }
  if (!args.locales.includes("ko")) {
    // ko 는 기준선이다 — 없으면 "원래 잘려 있던 것"과 "로케일 때문에 잘린 것"을 못 가른다.
    args.locales = ["ko", ...args.locales];
  }
  /* trailingSlash export 구조 — measure-mobile-routes.mjs:157-162 와 같은 정규화 */
  args.routes = args.routes.map((r) => {
    let route = r.startsWith("/") ? r : `/${r}`;
    if (!route.endsWith(".html") && !route.endsWith("/")) route += "/";
    return route;
  });
  return args;
}

/* dist 신선도 fail-closed — measure-mobile-routes.mjs:166-193 에서 복사 */
function assertDistFresh() {
  const distIndex = path.join(repoRoot, "dist", "index.html");
  if (!fs.existsSync(distIndex)) {
    throw new Error(
      "dist/index.html 이 없습니다 — 먼저 `npm run build` 를 돌리거나 --target=source 를 쓰세요.",
    );
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

/**
 * 정적 서버 — measure-mobile-routes.mjs:212-237 에서 복사하되 **루트를 여러 개** 받는다.
 * 🔴 원본은 dist/ 한 곳만 서빙하면 됐지만, 로케일 축은 /i18n/<loc>.json 이 있어야 한다.
 *    소스 모드에서 셸(index.html)은 리포 루트에 있고 사전은 public/i18n/ 에 있어서, 루트 한 곳만
 *    서빙하면 사전이 통째로 404 나고 모든 키가 같은 플레이스홀더로 렌더된다(실제로 그렇게 나왔다).
 */
function serveStatic(rootDirs) {
  const roots = Array.isArray(rootDirs) ? rootDirs : [rootDirs];
  const locate = (relative) => {
    for (const root of roots) {
      let candidate = path.join(root, relative);
      if (!candidate.startsWith(root)) continue;
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        candidate = path.join(candidate, "index.html");
      }
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  };
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      const relative = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
      const filePath = locate(relative);
      if (!filePath) {
        res.writeHead(404, { "content-type": "text/plain" }).end("not found");
        return;
      }
      fs.readFile(filePath, (error, data) => {
        if (error) {
          res.writeHead(404, { "content-type": "text/plain" }).end("not found");
          return;
        }
        res.writeHead(200, {
          "content-type": MIME[path.extname(filePath)] || "application/octet-stream",
        });
        res.end(data);
      });
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

/** 라우트 실재 확인 — measure-mobile-routes.mjs:239-243 에서 복사(없는 라우트를 "발견 0건"으로 넘기지 않는다) */
function routeFileExists(rootDirs, route) {
  const relative = route.endsWith(".html")
    ? route.replace(/^\/+/, "")
    : path.join(route.replace(/^\/+/, ""), "index.html");
  return rootDirs.some((root) => fs.existsSync(path.join(root, relative)));
}

/**
 * 페이지 안에서 로케일을 바꾼다. 정적 셸은 window.changeLanguage 로 DOM 텍스트를 제자리
 * 치환하고, App Router 라우트는 ?lang= 로 다시 들어가야 한다(호출부에서 처리).
 * changeLanguage 가 없으면 false 를 돌려 호출부가 INVALID 로 처리한다 — 조용히 ko 를 12번 재는
 * 것을 막는다.
 */
async function switchLanguageInPage(page, locale) {
  return page.evaluate(async (loc) => {
    if (typeof window.changeLanguage !== "function") return false;
    await window.changeLanguage(loc);
    return true;
  }, locale);
}

/**
 * 의사 로케일 스트레스. 사전에 아직 없는 "더 긴 미래 문구"까지 커버한다.
 *   x40 : 번역 대상 텍스트를 원문 대비 약 +40% 로 늘린다(팽창 최대치 fr 1.44 근사)
 *   min : 가장 짧은 극단(한 글자)으로 줄여 반대편 파손(가운데 정렬 붕괴 등)을 본다
 *
 * 🔴 셸의 repair observer(js/cd-lang-native.js)가 [data-cd-trans] 텍스트를 되돌릴 수 있다.
 *    그래서 적용한 문자열을 노드에 적어 두고 정착 후 살아남은 개수를 따로 센다 — 되돌려진 화면을
 *    "스트레스 통과"로 읽으면 이 모드 전체가 위양성이 된다.
 */
async function applyPseudo(page, mode) {
  return page.evaluate((pseudoMode) => {
    const nodes = document.querySelectorAll("[data-cd-trans]");
    let touched = 0;
    for (const el of nodes) {
      const text = (el.textContent || "").trim();
      if (!text) continue;
      const filler = Math.max(1, Math.round(text.length * 0.4));
      const next =
        pseudoMode === "min"
          ? text.slice(0, 1)
          : text + "\u0020" + "\u0448".repeat(filler);
      el.textContent = next;
      el.setAttribute("data-cd-pseudo", next);
      touched += 1;
    }
    return touched;
  }, mode);
}

/** 적용한 의사 문자열이 정착 후에도 남아 있는 노드 수 */
async function survivedPseudo(page) {
  return page.evaluate(() => {
    let survived = 0;
    for (const el of document.querySelectorAll("[data-cd-pseudo]")) {
      if ((el.textContent || "").trim() === el.getAttribute("data-cd-pseudo")) survived += 1;
    }
    return survived;
  });
}

/**
 * 브라우저 안 기하 계측 본체.
 * 스크롤 스윕은 measure-mobile-routes.mjs:433-438 에서 복사 — content-visibility:auto 자식은
 * 뷰포트에 들어와야 rect 가 실현되므로 한 화면씩 내려가며 그 순간 보이는 것을 누적한다.
 */
async function probe(params) {
  const { tolerance } = params;
  const settle = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  /* visible/describe 는 measure-mobile-routes.mjs:264-281 에서 복사 */
  const visible = (el, rect) => {
    if (rect.width <= 0 || rect.height <= 0) return false;
    if (typeof el.checkVisibility === "function") {
      return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    }
    const cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) >= 0.05;
  };
  /**
   * 🔴 구조 지문 — 글자를 넣지 않는다. 로케일마다 글자가 달라지므로 글자가 섞이면 ko 기준선과
   *    영원히 매칭되지 않아 '전부 신규'가 된다(실제로 12개 로케일 전부 그렇게 나왔다).
   */
  const sig = (el) => {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";
    const cls =
      !id && typeof el.className === "string" && el.className.trim()
        ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
        : "";
    return `${tag}${id}${cls}`;
  };
  /** 사람이 읽는 이름 — 표에만 쓴다(지문으로 쓰지 말 것) */
  const describe = (el) => {
    const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 14);
    return `${sig(el)}${text ? ` "${text}"` : ""}`;
  };

  /** 자기 자식 요소가 아니라 자기 텍스트를 담고 있는가 — 스크롤 컨테이너를 clip 으로 오인하지 않는다. */
  const ownsText = (el) => {
    for (const node of el.childNodes) {
      if (node.nodeType === 3 && node.textContent.trim()) return true;
    }
    return false;
  };

  const out = {
    visibilityState: document.visibilityState,
    lang: document.documentElement.lang || "",
    innerWidth: window.innerWidth,
  };
  const findings = [];
  const seen = new Set();
  const seenClip = new Set();
  const seenSpill = new Set();
  const seenCollide = new Set();
  let scanned = 0;

  const push = (kind, el, detail, over) => {
    const key = `${kind}|${sig(el)}|${detail}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({
      kind,
      sig: sig(el),
      label: describe(el),
      detail,
      over: Number(over.toFixed(1)),
      text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
    });
  };

  const sweep = () => {
    for (const el of document.body.querySelectorAll("*")) {
      const rect = el.getBoundingClientRect();
      if (!visible(el, rect)) continue;
      scanned += 1;
      const cs = getComputedStyle(el);

      // --- clip: 자기 글자가 자기 칸을 넘겼는데 잘라내고 있다 ---
      if (!seenClip.has(el) && ownsText(el)) {
        const clipsX = cs.overflowX === "hidden" || cs.overflowX === "clip";
        const clipsY = cs.overflowY === "hidden" || cs.overflowY === "clip";
        const ellipsis = cs.textOverflow === "ellipsis";
        const clamped = cs.webkitLineClamp && cs.webkitLineClamp !== "none";
        const overX = el.scrollWidth - el.clientWidth;
        const overY = el.scrollHeight - el.clientHeight;
        if ((clipsX || ellipsis) && overX > tolerance) {
          seenClip.add(el);
          push("clip", el, ellipsis ? "가로 말줄임" : "가로 하드 클립", overX);
        } else if ((clipsY || clamped) && overY > tolerance) {
          seenClip.add(el);
          push("clip", el, clamped ? `줄 수 고정(${cs.webkitLineClamp})` : "세로 하드 클립", overY);
        }
      }

      // --- spill: overflow-x:hidden 조상의 안쪽 상자를 자손이 넘었다 ---
      if (!seenSpill.has(el) && (cs.overflowX === "hidden" || cs.overflowX === "clip")) {
        const padLeft = parseFloat(cs.paddingLeft) || 0;
        const padRight = parseFloat(cs.paddingRight) || 0;
        const left = rect.left + (parseFloat(cs.borderLeftWidth) || 0) + padLeft;
        const right = rect.right - (parseFloat(cs.borderRightWidth) || 0) - padRight;
        for (const child of el.querySelectorAll("*")) {
          const childRect = child.getBoundingClientRect();
          if (!visible(child, childRect)) continue;
          // 장식(별·후광·꽃·SVG)은 상자 밖으로 나가라고 만든 것이다 — 글자가 없으면 세지 않는다.
          if (!(child.textContent || "").trim()) continue;
          const over = Math.max(childRect.right - right, left - childRect.left);
          if (over <= tolerance) continue;
          seenSpill.add(el);
          push("spill", child, `조상 ${sig(el)} 안쪽 상자를 넘음`, over);
          break;
        }
      }

      // --- collide: 같은 행(flex/grid)의 형제 상자가 겹쳤다 ---
      if (!seenCollide.has(el) && (cs.display === "flex" || cs.display === "inline-flex")) {
        if (cs.flexWrap === "nowrap") {
          const kids = [...el.children]
            .map((child) => ({ child, r: child.getBoundingClientRect() }))
            .filter(({ child, r }) => visible(child, r));
          for (let i = 0; i < kids.length - 1; i += 1) {
            const a = kids[i];
            const b = kids[i + 1];
            const overlap = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
            const sameRow = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top) > 0;
            if (!sameRow || overlap <= tolerance) continue;
            seenCollide.add(el);
            push("collide", a.child, `형제 ${sig(b.child)} 와 겹침`, overlap);
            break;
          }
        }
      }
    }
  };

  const step = window.innerHeight;
  let steps = 0;
  for (let y = 0; y < document.documentElement.scrollHeight && steps < 40; y += step) {
    window.scrollTo(0, y);
    await settle();
    steps += 1;
    sweep();
  }
  window.scrollTo(0, 0);

  // 사전 적재 지표 — 번역 노드가 많은데 서로 다른 문자열이 거의 없으면 사전이 안 실린 것이다.
  const transNodes = document.querySelectorAll("[data-cd-trans]");
  const transTexts = new Set();
  for (const el of transNodes) {
    const text = (el.textContent || "").trim();
    if (text) transTexts.add(text);
  }
  out.transNodes = transNodes.length;
  out.transDistinct = transTexts.size;

  out.scanned = scanned;
  out.docOverflow = document.documentElement.scrollWidth > window.innerWidth + 1;
  out.findings = findings;
  return out;
}

/** App Router 라우트는 ?lang= 이 최우선 소스다(lib/i18n/dictionary.ts). 정적 셸은 changeLanguage 로 바꾼다. */
function localeUrl(origin, route, locale) {
  const url = new URL(`${origin}${route}`);
  url.searchParams.set("lang", locale);
  return url.toString();
}

async function measureLeg(browser, origin, route, viewport, locale, args) {
  const context = await browser.newContext({
    viewport,
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    userAgent: MOBILE_UA,
    locale,
  });
  try {
    const page = await context.newPage();
    // 🔴 사전 요청이 깨진 화면은 모든 키가 같은 플레이스홀더로 렌더된다 — 그걸 '발견'으로 세면
    //    로케일 리포트 전체가 허구가 된다. 응답을 직접 감시해 무효로 떨군다.
    const brokenDictionaries = [];
    page.on("response", (res) => {
      const url = res.url();
      if (/\/i18n\/[^/]+\.json/.test(url) && res.status() >= 400) {
        brokenDictionaries.push(`${res.status()} ${new URL(url).pathname}`);
      }
    });
    const response = await page.goto(localeUrl(origin, route, locale), {
      waitUntil: "load",
      timeout: 60000,
    });
    if (response && response.status() >= 400) {
      return { valid: false, invalidReason: `HTTP ${response.status()}` };
    }
    await page.waitForTimeout(args.settle);

    // 셸은 ?lang= 만으로는 안 바뀌는 경우가 있어 changeLanguage 를 한 번 더 부른다.
    // 🔴 둘 다 실패하면 INVALID — ko 화면을 로케일 이름표만 붙여 12번 재는 것을 막는다.
    const switched = await switchLanguageInPage(page, locale);
    if (switched) await page.waitForTimeout(args.switchSettle);

    if (args.open) {
      const target = page.locator(args.open).first();
      if ((await target.count()) === 0) {
        return { valid: false, invalidReason: `--open 대상을 찾을 수 없음: ${args.open}` };
      }
      await target.click({ timeout: 15000 });
      await page.waitForTimeout(args.switchSettle);
    }

    let pseudoTouched = 0;
    if (args.pseudo) {
      pseudoTouched = await applyPseudo(page, args.pseudo);
      if (!pseudoTouched) {
        return { valid: false, invalidReason: "[data-cd-trans] 노드가 0개 — 의사 로케일이 안 먹었다" };
      }
      await page.waitForTimeout(args.switchSettle);
      // 🔴 repair observer 가 되돌렸으면 스트레스가 걸리지 않은 화면이다 — 통과로 읽지 않는다.
      const survived = await survivedPseudo(page);
      if (survived < pseudoTouched * 0.5) {
        return {
          valid: false,
          invalidReason:
            `의사 로케일이 되돌려졌다 — 적용 ${pseudoTouched}건 중 ${survived}건만 생존. ` +
            "repair observer 가 원문을 복원했으므로 이 측정은 스트레스가 아니다.",
        };
      }
      pseudoTouched = survived;
    }

    const result = await page.evaluate(probe, { tolerance: TOLERANCE_PX });

    // 🔴 fail-closed — 빈 화면이나 안 바뀐 로케일을 "발견 0건"으로 통과시키지 않는다.
    if (result.visibilityState !== "visible") {
      return { valid: false, invalidReason: `visibilityState=${result.visibilityState} — 판정 무효` };
    }
    if (!result.scanned) {
      return { valid: false, invalidReason: "보이는 요소 0건 — 페이지가 안 떴거나 렌더 전" };
    }
    if (brokenDictionaries.length) {
      return {
        valid: false,
        invalidReason: `사전 요청 실패 ${brokenDictionaries.join(", ")} — 번역이 안 실린 화면이다`,
      };
    }
    if (result.transNodes >= 20 && result.transDistinct <= 3) {
      return {
        valid: false,
        invalidReason:
          `번역 노드 ${result.transNodes}개가 서로 다른 문자열 ${result.transDistinct}종뿐이다 — ` +
          "사전이 안 실려 전 키가 같은 플레이스홀더로 렌더됐다.",
      };
    }
    if (locale !== "ko" && !switched) {
      // changeLanguage 가 없는 라우트라면 ?lang= 이 실제로 먹었는지 html[lang] 로 확인한다.
      const htmlLang = (result.lang || "").toLowerCase();
      if (!htmlLang || !htmlLang.startsWith(locale.slice(0, 2).toLowerCase())) {
        return {
          valid: false,
          invalidReason:
            `로케일 전환 불발 — changeLanguage 없음이고 html[lang]="${result.lang}" 이라 ` +
            `${locale} 화면이 아니다. 이 라우트는 로케일 축을 지원하지 않는다.`,
        };
      }
    }
    return { valid: true, pseudoTouched, switched, ...result };
  } catch (error) {
    return { valid: false, invalidReason: `로드/계측 실패 — ${error.message}` };
  } finally {
    await context.close();
  }
}

/** 🔴 label(글자 포함)이 아니라 sig(구조)로 지문을 만든다 — 위 probe 의 주석 참고. */
const fingerprint = (finding) => `${finding.kind}|${finding.sig}|${finding.detail}`;

function toMarkdown(args, runs) {
  const lines = [];
  lines.push(`# measure:locale-text-fit — ${args.label}`);
  lines.push("");
  lines.push(
    `target=${args.target} · pseudo=${args.pseudo || "없음"} · 로케일 ${args.locales.length}개 · ` +
      `허용 오차 ${TOLERANCE_PX}px`,
  );
  lines.push("");
  lines.push("ko 를 기준선으로 두고, **ko 에 없던 발견만** 새 파손으로 센다.");
  lines.push("");
  lines.push("| 라우트 | 뷰포트 | 로케일 | clip | spill | collide | ko 대비 신규 | 상태 |");
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const run of runs) {
    const count = (kind) => (run.findings || []).filter((f) => f.kind === kind).length;
    lines.push(
      `| ${run.route} | ${run.viewport} | ${run.locale} | ${count("clip")} | ${count("spill")} | ` +
        `${count("collide")} | ${run.valid ? run.newCount : "—"} | ${run.valid ? "OK" : "INVALID: " + run.invalidReason} |`,
    );
  }
  const withNew = runs.filter((run) => run.valid && run.newCount > 0);
  if (withNew.length) {
    lines.push("");
    lines.push("## ko 기준선에 없던 발견");
    lines.push("");
    for (const run of withNew) {
      lines.push(`### ${run.route} · ${run.viewport} · ${run.locale}`);
      lines.push("");
      lines.push("| 종류 | 요소 | 내용 | 초과 | 글자 |");
      lines.push("|---|---|---|---|---|");
      for (const finding of run.newFindings) {
        lines.push(
          `| ${finding.kind} | \`${finding.label}\` | ${finding.detail} | ${finding.over}px | ${finding.text} |`,
        );
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let origin = null;
  let server = null;
  let servedRoots = null;
  if (/^https?:\/\//.test(args.target)) {
    origin = args.target.replace(/\/+$/, "");
  } else if (args.target === "dist") {
    if (!args.allowStale) assertDistFresh();
    servedRoots = [path.join(repoRoot, "dist")];
    server = await serveStatic(servedRoots);
    origin = `http://127.0.0.1:${server.address().port}`;
  } else if (args.target === "source") {
    // 셸은 리포 루트, 자산과 사전은 public/ — 배포 레이아웃을 이 둘로 근사한다.
    servedRoots = [repoRoot, path.join(repoRoot, "public")];
    server = await serveStatic(servedRoots);
    origin = `http://127.0.0.1:${server.address().port}`;
  } else {
    throw new Error(`--target 은 dist | source | http(s) URL 이어야 합니다 (받음: ${args.target})`);
  }

  console.log(`[measure:locale-text-fit] target=${args.target} origin=${origin}`);
  console.log(
    `  locales=${args.locales.join(",")} viewports=${args.viewports.map((v) => `${v.width}x${v.height}`).join(",")} ` +
      `pseudo=${args.pseudo || "없음"} settle=${args.settle}ms`,
  );

  const browser = await chromium.launch();
  const runs = [];
  let invalidCount = 0;
  try {
    for (const route of args.routes) {
      if (servedRoots && !routeFileExists(servedRoots, route)) {
        // 🔴 없는 라우트를 스캔 0건 초록으로 넘기지 않는다.
        for (const viewport of args.viewports) {
          runs.push({
            route,
            viewport: `${viewport.width}x${viewport.height}`,
            locale: "—",
            valid: false,
            invalidReason: `서빙 루트에 ${route} 가 없다`,
          });
          invalidCount += 1;
        }
        continue;
      }
      for (const viewport of args.viewports) {
        const baseline = new Set();
        for (const locale of args.locales) {
          const leg = await measureLeg(browser, origin, route, viewport, locale, args);
          const run = {
            route,
            viewport: `${viewport.width}x${viewport.height}`,
            locale,
            ...leg,
          };
          if (leg.valid) {
            const prints = (leg.findings || []).map(fingerprint);
            if (locale === "ko") {
              for (const print of prints) baseline.add(print);
              run.newFindings = [];
            } else {
              run.newFindings = (leg.findings || []).filter((f) => !baseline.has(fingerprint(f)));
            }
            run.newCount = run.newFindings.length;
          } else {
            invalidCount += 1;
          }
          runs.push(run);
          const head = `  ${route} ${run.viewport} ${locale}`;
          console.log(
            leg.valid
              ? `${head} — 발견 ${(leg.findings || []).length}건, ko 대비 신규 ${run.newCount}건`
              : `${head} — INVALID: ${leg.invalidReason}`,
          );
        }
      }
    }
  } finally {
    await browser.close();
    if (server) server.close();
  }

  fs.mkdirSync(args.out, { recursive: true });
  const jsonPath = path.join(args.out, `${args.label}.json`);
  const mdPath = path.join(args.out, `${args.label}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify({ args, runs }, null, 2), "utf8");
  fs.writeFileSync(mdPath, toMarkdown(args, runs), "utf8");
  console.log(`\n리포트: ${path.relative(repoRoot, mdPath)} (원본 ${path.relative(repoRoot, jsonPath)})`);

  const totalNew = runs.reduce((sum, run) => sum + (run.newCount || 0), 0);
  console.log(`ko 기준선 대비 신규 발견 합계 ${totalNew}건, INVALID ${invalidCount}건.`);
  // 🔴 발견은 데이터다 — exit 1 은 측정이 무효일 때만 낸다(헤더 참고).
  if (invalidCount) process.exit(1);
}

main().catch((error) => {
  console.error(`[measure:locale-text-fit] ${error.message}`);
  process.exit(1);
});

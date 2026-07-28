#!/usr/bin/env node
/**
 * verify-mobile-detail-render
 *
 * 정적 가드(verify-mobile-detail-nonintrusive)의 짝. CSS 를 읽어서는 안 보이고 렌더해야
 * 드러나는 것들을 실제 브라우저에서 잡는다 — 겹침, 상속으로 새는 색, 가로 오버플로.
 *
 * 판정:
 *  1) top 섹션이 sticky/fixed 로 뜨지 않는다  (이름판이 본문을 가리던 원인)
 *  2) 기능 자기 제목이 닫기 버튼과 겹치지 않는다 (예전엔 8px 확정 겹침)
 *  3) 기능 자기 서체가 살아 있다              (재도색/타이포 강제 없음)
 *  4) 가로 스크롤이 생기지 않는다              ("화면에 맞도록" 은 지킨다)
 *
 * 로그인·결제 없이 결정론적으로 돌리려고, 홈에서 기능을 클릭하는 대신 오버레이를 직접
 * 표시하고 어노테이터의 공개 API(window.__cdMobileFeatureDetailTemplate.annotate)를 부른다.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const VIEWPORT = { width: 390, height: 844 };

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
};

/**
 * 검사 대상. titleSelector 는 "그 기능이 자기 마크업에서 쓰는" 제목 —
 * 래퍼가 만든 요소가 아니다. 그게 요점이다.
 */
const TARGETS = [
  { id: "tarotModalOverlay", label: "명리학 타로(무료)", titleSelector: ".oracle-title-m" },
  {
    id: "kemetOracleOverlay",
    label: "이집트 오라클(유료)",
    titleSelector: ".kemet-title, .kemet-hero h2, .kemet-hero h3",
  },
  {
    id: "sukuyoModalOverlay",
    label: "숙요점(자체 야경 테마)",
    titleSelector: ".sy-basic-head h2, .sy-basic-head h3, .sukuyo-hero h2, header h2, header h3",
  },
  {
    id: "astroModalOverlay",
    label: "점성술 기본 차트",
    titleSelector: ".astro-head h2, .astro-hero h2, header h2, header h3",
  },
];

/** 래퍼가 기능 디자인에 손대면 안 되는 속성들 — 켰을 때와 껐을 때가 같아야 한다. */
const OWNED_BY_FEATURE = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "color",
  "backgroundColor",
  "backgroundImage",
  "borderTopWidth",
  "borderTopColor",
  "borderRadius",
  "textAlign",
];

const THEMES = [
  { name: "연이", neo: false },
  { name: "네오", neo: true },
];

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

/** 브라우저 안에서 한 기능을 열고 측정한다. */
function probe({ id, titleSelector, owned }) {
  if (window.__cdMobileHomeLazyMount && typeof window.__cdMobileHomeLazyMount.mount === "function") {
    try { window.__cdMobileHomeLazyMount.mount(id); } catch (_) {}
  }
  const root = document.getElementById(id);
  if (!root) return { missing: true };

  // 오버레이를 강제로 띄운다(홈 클릭 경로는 로그인/결제에 걸릴 수 있다).
  root.style.setProperty("display", "flex", "important");
  root.setAttribute("aria-hidden", "false");
  root.classList.add("pvw-open");

  const api = window.__cdMobileFeatureDetailTemplate;
  if (!api || typeof api.annotate !== "function") return { noApi: true };
  api.annotate(id);

  const visible = (node) => {
    if (!node) return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  const rectOf = (node) => {
    const r = node.getBoundingClientRect();
    return { top: r.top, right: r.right, bottom: r.bottom, left: r.left };
  };
  const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const snapshot = (node) => {
    const style = getComputedStyle(node);
    const out = {};
    for (const property of owned) out[property] = style[property];
    return out;
  };

  const title = Array.prototype.find.call(root.querySelectorAll(titleSelector), visible) || null;
  const close =
    Array.prototype.find.call(root.querySelectorAll('[data-mobile-detail-close="primary"]'), visible) || null;
  const top = root.querySelector('[data-mobile-detail-section="top"]');
  // 셸은 어느 기능에나 있다. 헤더/제목이 런타임 렌더라 정적 마크업에 없는 기능
  // (숙요·점성술 등)도 최소한 "표면을 재도색당했는가"는 여기서 실측된다.
  const shell = root.querySelector("[data-mobile-detail-shell]");

  const result = {
    titleFound: Boolean(title),
    topFound: Boolean(top),
    shellFound: Boolean(shell),
    topPosition: top ? getComputedStyle(top).position : null,
    titleCloseOverlap: title && close ? overlaps(rectOf(title), rectOf(close)) : false,
    measuredOverlap: Boolean(title && close),
    docScrollWidth: document.documentElement.scrollWidth,
    withWrapper: {},
    withoutWrapper: {},
  };

  // 래퍼 기여도 측정 — 래퍼를 벗겼을 때와 계산 스타일이 같아야 한다.
  // 같지 않다면 그 차이가 곧 "래퍼가 기능 디자인을 덮은 양"이다.
  const probed = [];
  if (title) probed.push(["title", title]);
  if (top) probed.push(["top", top]);
  if (shell) probed.push(["shell", shell]);
  for (const [key, node] of probed) result.withWrapper[key] = snapshot(node);

  const marked = Array.prototype.slice.call(root.querySelectorAll("*"));
  marked.push(root);
  const stripped = [];
  for (const node of marked) {
    const removedAttrs = [];
    for (const attr of Array.prototype.slice.call(node.attributes)) {
      if (attr.name.indexOf("data-mobile-detail") === 0) removedAttrs.push([attr.name, attr.value]);
    }
    const removedClasses = ["MobileFeatureDetail", "MobileFeatureBottomSheet"].filter(function (name) {
      return node.classList.contains(name);
    });
    const removedComponent = node.getAttribute("data-component");
    if (!removedAttrs.length && !removedClasses.length) continue;
    removedAttrs.forEach(function (pair) { node.removeAttribute(pair[0]); });
    removedClasses.forEach(function (name) { node.classList.remove(name); });
    if (removedComponent === "MobileFeatureDetail") node.removeAttribute("data-component");
    stripped.push({ node: node, attrs: removedAttrs, classes: removedClasses, component: removedComponent });
  }

  for (const [key, node] of probed) result.withoutWrapper[key] = snapshot(node);

  for (const entry of stripped) {
    entry.attrs.forEach(function (pair) { entry.node.setAttribute(pair[0], pair[1]); });
    entry.classes.forEach(function (name) { entry.node.classList.add(name); });
    if (entry.component) entry.node.setAttribute("data-component", entry.component);
  }

  root.style.removeProperty("display");
  root.setAttribute("aria-hidden", "true");
  root.classList.remove("pvw-open");
  return result;
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
  const notes = [];

  try {
    for (const theme of THEMES) {
      const context = await browser.newContext({
        viewport: VIEWPORT,
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 3,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
          "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      });
      const page = await context.newPage();
      await page.goto(`${origin}/index.html`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => Boolean(window.__cdMobileFeatureDetailTemplate), null, {
        timeout: 20000,
      });
      await page.evaluate((neo) => {
        document.documentElement.classList.toggle("neo-mode", neo);
        document.body.classList.toggle("neo-mode", neo);
      }, theme.neo);

      for (const target of TARGETS) {
        const where = `${theme.name}/${target.label}`;
        const result = await page.evaluate(probe, { ...target, owned: OWNED_BY_FEATURE });

        if (result.missing) {
          notes.push(`${where}: #${target.id} 가 이 셸에 없어 건너뜀`);
          continue;
        }
        if (result.noApi) {
          failures.push(`${where}: __cdMobileFeatureDetailTemplate.annotate 를 쓸 수 없음`);
          continue;
        }

        // sticky/fixed 만 문제다. relative 는 기능이 자기 CSS 에서 쓰는 정상값이다
        // (예: .oracle-header-m 은 fortune-ui.css 에서 position:relative; z-index:2).
        if (result.topPosition === "sticky" || result.topPosition === "fixed") {
          failures.push(
            `${where}: top 섹션이 position:${result.topPosition} — 기능 이름판이 본문 위에 떠 UI 를 가린다.`,
          );
        }
        if (!result.topFound) notes.push(`${where}: top 섹션이 없어 위치 검사 생략(헤더가 런타임 렌더)`);
        if (!result.shellFound) {
          failures.push(`${where}: [data-mobile-detail-shell] 이 없어 표면 재도색 검사를 못 했다.`);
        }

        // 핵심 불변식: 래퍼를 벗겨도 계산 스타일이 같아야 한다 = 래퍼가 기능 디자인에 손대지 않았다.
        for (const [key, before] of Object.entries(result.withWrapper)) {
          const after = result.withoutWrapper[key] || {};
          for (const [property, value] of Object.entries(before)) {
            if (value === after[property]) continue;
            failures.push(
              `${where}: 래퍼가 ${key}.${property} 를 덮었다 — 래퍼 적용 '${value}' vs 미적용 '${after[property]}'.`,
            );
          }
        }

        if (!result.titleFound) {
          notes.push(`${where}: 제목(${target.titleSelector})을 못 찾아 겹침 검사 생략`);
        } else if (result.titleCloseOverlap) {
          failures.push(`${where}: 기능 제목이 닫기 버튼과 겹친다.`);
        } else if (!result.measuredOverlap) {
          notes.push(`${where}: 아이콘 닫기 버튼이 없어 겹침 검사 생략`);
        }

        if (result.docScrollWidth > VIEWPORT.width) {
          failures.push(
            `${where}: 가로 스크롤 발생 (document ${result.docScrollWidth}px > ${VIEWPORT.width}px).`,
          );
        }
      }

      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  for (const note of notes) console.log(`  · ${note}`);

  if (failures.length) {
    console.error("\n모바일 상세 렌더 검증 실패:\n");
    for (const failure of failures) console.error(`  - ${failure}`);
    console.error(
      "\n기능 화면은 모바일에서도 데스크탑과 같은 자기 디자인으로 보여야 합니다.\n" +
        "공용 래퍼(styles/mobile-lite.css 의 MobileFeatureDetail 블록)가 아니라\n" +
        "해당 기능의 CSS 에서 고치세요.\n",
    );
    process.exit(1);
  }

  console.log(`\nMobile detail render OK (${THEMES.length}테마 × ${TARGETS.length}기능 @ 390x844).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * measure-home-section-heights
 *
 * 홈 랜딩 섹션의 **콘텐츠 박스 높이**를 실브라우저에서 재서 `contain-intrinsic-size` 에 넣을
 * 값을 뽑는다. index.html:806 의 실측 표를 다시 만드는 도구다 — 그 표는 2026-08-16 에
 * `_tmp_belowfold_sections.mjs` 라는 임시 파일로 뽑혔고 그 파일이 남지 않아 재현이 끊겨 있었다.
 *
 * 🔴 보더 박스가 아니라 콘텐츠 박스를 잰다. `contain-intrinsic-size` 는 콘텐츠 박스에 적용되므로
 *    getBoundingClientRect().height 를 그대로 넣으면 패딩·보더만큼 과다 예약된다(2026-08-16 에
 *    그렇게 넣었다가 문서 scrollHeight 가 312px 늘었다).
 * 🔴 재기 전에 content-visibility 를 끈다 — 켜진 채로 재면 컨테인먼트가 건 예약 높이를 도로 읽어
 *    자기 자신을 측정하게 된다.
 *
 * 실행: node scripts/measure-home-section-heights.mjs [--selector "#cdWhyUs,#cdFinder"]
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const VIEWPORTS = [
  { name: "모바일", width: 390, height: 844, mobile: true },
  { name: "데스크탑", width: 1350, height: 940, mobile: false },
];

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
  ".avif": "image/avif",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
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

/** 브라우저 안에서 돈다. 대상은 손으로 열거하지 않고 랜딩 컨테이너의 직속 섹션에서 전수 발견한다. */
function probe(explicitSelectors) {
  const picked = [];
  if (explicitSelectors && explicitSelectors.length) {
    for (const sel of explicitSelectors) {
      document.querySelectorAll(sel).forEach((el) => picked.push(el));
    }
  } else {
    // 랜딩 셸의 최상위 섹션 후보: 퍼널 표식이 있거나, .wrap 직속 section/footer.
    document.querySelectorAll("[data-cd-funnel-section]").forEach((el) => picked.push(el));
    document.querySelectorAll(".wrap > section, .wrap > footer, .cd-home-guide").forEach((el) => {
      if (!picked.includes(el)) picked.push(el);
    });
  }

  const rows = [];
  for (const el of picked) {
    const cs = getComputedStyle(el);
    if (cs.display === "none") {
      rows.push({ label: describe(el), skipped: "display:none" });
      continue;
    }
    if (el.hasAttribute("hidden")) {
      rows.push({ label: describe(el), skipped: "hidden 속성" });
      continue;
    }

    // 컨테인먼트를 끄고 강제로 레이아웃시킨 뒤 콘텐츠 박스를 읽는다.
    const prevCv = el.style.contentVisibility;
    const prevCis = el.style.containIntrinsicSize;
    el.style.contentVisibility = "visible";
    el.style.containIntrinsicSize = "auto none";
    void el.offsetHeight;

    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const padY = parseFloat(s.paddingTop) + parseFloat(s.paddingBottom);
    const borderY = parseFloat(s.borderTopWidth) + parseFloat(s.borderBottomWidth);
    const content = Math.round(r.height - padY - borderY);

    rows.push({
      label: describe(el),
      top: Math.round(r.top + window.scrollY),
      border: Math.round(r.height),
      content,
      nodes: el.querySelectorAll("*").length,
      cvNow: s.contentVisibility,
    });

    el.style.contentVisibility = prevCv;
    el.style.containIntrinsicSize = prevCis;
  }

  rows.sort((a, b) => (a.top ?? 1e9) - (b.top ?? 1e9));
  return rows;

  function describe(el) {
    if (el.id) return "#" + el.id;
    const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/)[0] : "";
    return cls ? "." + cls : el.tagName.toLowerCase();
  }
}

const selArg = process.argv.find((a) => a.startsWith("--selector"));
const selectors = selArg
  ? (selArg.includes("=") ? selArg.split("=")[1] : process.argv[process.argv.indexOf(selArg) + 1] || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : [];

const server = await serveRepo();
const { port } = server.address();
const browser = await chromium.launch();

try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
      deviceScaleFactor: vp.mobile ? 3 : 1,
      userAgent: vp.mobile
        ? "Mozilla/5.0 (Linux; Android 14; SM-M156B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Mobile Safari/537.36"
        : undefined,
    });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(700);

    const rows = await page.evaluate(probe, selectors);
    const runtimeClass = await page.evaluate(() => document.documentElement.className);

    console.log(`\n═══ ${vp.name} ${vp.width}x${vp.height} ═══  html.class = ${runtimeClass || "(없음)"}`);
    console.log("  " + "대상".padEnd(26) + "top".padStart(7) + "보더".padStart(8) + "콘텐츠".padStart(8) + "요소".padStart(7) + "  현재 cv");
    for (const r of rows) {
      if (r.skipped) {
        console.log("  " + r.label.padEnd(26) + `  — 건너뜀 (${r.skipped})`);
        continue;
      }
      console.log(
        "  " +
          r.label.padEnd(26) +
          String(r.top).padStart(7) +
          String(r.border).padStart(8) +
          String(r.content).padStart(8) +
          String(r.nodes).padStart(7) +
          "  " +
          r.cvNow,
      );
    }
    console.log(`\n  ${vp.name} 붙여넣기용:`);
    const prefix = vp.mobile ? "html.cd-mobile-runtime " : "html:not(.cd-mobile-runtime) ";
    for (const r of rows) {
      if (r.skipped) continue;
      console.log(`  ${prefix}${r.label} { content-visibility: auto; contain-intrinsic-size: auto ${r.content}px; }`);
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

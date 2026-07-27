#!/usr/bin/env node
/**
 * 실제 렌더 기준 한국어 잔존 검사.
 *
 * 정적 분석(마커 개수·사전 키 수)은 "번역이 걸릴 준비가 됐는지"만 말해 준다.
 * 진짜 확인해야 할 것은 **사용자가 언어를 바꿨을 때 화면에 한국어가 남는가**다.
 * 그래서 셸을 헤드리스 브라우저로 열고, 언어를 전환한 뒤, 보이는 텍스트에서
 * 한글을 센다. 마커 누락·사전 키 부재·런타임 오류가 전부 여기서 한 번에 드러난다.
 *
 * 사용법:
 *   node scripts/verify-i18n-rendered-korean.mjs                기본 로케일 표본
 *   node scripts/verify-i18n-rendered-korean.mjs --locales ja,en
 *   node scripts/verify-i18n-rendered-korean.mjs --all           12개 전부
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, join, extname } from "node:path";

const rootDir = process.cwd();
const publicDir = resolve(rootDir, "public");

const args = process.argv.slice(2);
const ALL = ["en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"];
const locales = args.includes("--all")
  ? ALL
  : (() => {
      const i = args.indexOf("--locales");
      return i >= 0 && args[i + 1] ? args[i + 1].split(",") : ["en", "ja", "zh-CN"];
    })();

/**
 * 검사할 경로. 기본은 홈 셸이다.
 * `--paths /login,/points` 로 React 라우트도 볼 수 있다 — 컴포넌트 카피 테이블의
 * 로케일 결손은 정적 분석으로는 오판이 잦다(선언 뒤 명령형 채움, `?? .en ?? .ko`
 * 체인 등). 실제로 그려서 세는 것이 유일하게 믿을 수 있는 측정이다.
 */
const paths = (() => {
  const i = args.indexOf("--paths");
  return i >= 0 && args[i + 1] ? args[i + 1].split(",") : ["/"];
})();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

/** public/ 을 그대로 서빙한다. 배포본과 같은 경로 구조에서 검사해야 의미가 있다. */
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  let filePath = join(publicDir, decodeURIComponent(url.pathname));
  try {
    if ((await stat(filePath)).isDirectory()) filePath = join(filePath, "index.html");
  } catch {
    res.writeHead(404).end("not found");
    return;
  }
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});

await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const browser = await chromium.launch();
const results = [];

for (const locale of locales) {
 for (const routePath of paths) {
  const page = await browser.newPage();
  const missingKeys = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("cd-i18n-missing")) missingKeys.push(text.slice(0, 120));
  });

  const sep = routePath.includes("?") ? "&" : "?";
  await page.goto(`http://localhost:${port}${routePath}${sep}lang=${encodeURIComponent(locale)}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  // 번역기는 사전을 fetch 한 뒤 DOM 을 갈아끼운다. 적용이 끝날 때까지 기다린다.
  await page
    .waitForFunction(() => document.documentElement.getAttribute("data-cd-lang"), null, { timeout: 30_000 })
    .catch(() => {});
  await page.waitForTimeout(2500);

  const report = await page.evaluate(() => {
    const isHidden = (el) => {
      const style = window.getComputedStyle(el);
      return style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0;
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const offenders = [];
    let hangul = 0;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = (node.nodeValue || "").trim();
      if (!text || !/[가-힣]/.test(text)) continue;
      const el = node.parentElement;
      if (!el || el.closest("script, style, template, noscript")) continue;
      // 화면에 안 보이는 노드는 세지 않는다 — 닫힌 모달·미개봉 패널이 대부분이다
      let hiddenAncestor = false;
      for (let cur = el; cur && cur !== document.body; cur = cur.parentElement) {
        if (isHidden(cur)) { hiddenAncestor = true; break; }
      }
      if (hiddenAncestor) continue;
      hangul += (text.match(/[가-힣]/g) || []).length;
      if (offenders.length < 25) {
        // 마커가 있는데도 한국어면 = 사전에 키가 없다(또는 번역 전에 DOM 이 다시 그려졌다).
        // 마커가 없으면 = 런타임 생성 DOM 이라 애초에 번역 대상이 아니었다.
        const marked = !!el.closest("[data-cd-trans], .custom-trans");
        offenders.push({
          tag: el.tagName,
          cls: (el.className || "").toString().slice(0, 40),
          text: text.slice(0, 60),
          marked,
        });
      }
    }
    return { hangul, offenders, lang: document.documentElement.getAttribute("data-cd-lang") };
  });

  results.push({ locale, path: routePath, ...report, missingKeys: missingKeys.length });
  console.log(`[rendered-ko] ${locale.padEnd(6)} ${routePath.padEnd(18)} data-cd-lang=${String(report.lang).padEnd(6)} 보이는 한글 ${String(report.hangul).padStart(6)}자  누락키 ${missingKeys.length}`);
  if (report.offenders.length) {
    report.offenders.slice(0, 10).forEach((o) =>
      console.log(`[rendered-ko]      ${o.marked ? "[마커O]" : "[마커X]"} <${o.tag}.${o.cls}> ${o.text}`));
  }
  missingKeys.slice(0, 8).forEach((m) => console.log(`[rendered-ko]      누락키: ${m}`));
  await page.close();
 }
}

await browser.close();
server.close();

const worst = results.reduce((max, r) => Math.max(max, r.hangul), 0);
console.log("");
console.log(`[rendered-ko] 최대 잔존: ${worst}자`);
if (worst > 0) {
  console.log("[rendered-ko] 잔존 구간은 대부분 (a) 아직 키화하지 않은 인라인 script 생성 DOM (b) React 페이지 본문이다.");
}

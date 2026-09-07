// Offline public-page smoke test: the local server never proxies, and every API/external request is blocked.
import { createServer } from "node:http";
import { readFile, stat, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { chromium } from "playwright";

const directory = resolve("dist");
const output = resolve("seo-qa");
await mkdir(output, { recursive: true });
const mime = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".xml": "application/xml", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain" };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method !== "GET" && req.method !== "HEAD") return res.writeHead(405).end();
  if (url.pathname.startsWith("/api/")) return res.writeHead(503, { "Content-Type": "application/json" }).end('{"ok":false,"mock":true}');
  const target = resolve(directory, `.${decodeURIComponent(url.pathname)}`);
  if (target !== directory && !target.startsWith(`${directory}${sep}`)) return res.writeHead(403).end();
  const candidates = [target, resolve(target, "index.html"), `${target}.html`];
  for (const file of candidates) {
    try {
      if (!(await stat(file)).isFile()) continue;
      res.writeHead(200, { "Content-Type": `${mime[extname(file)] || "application/octet-stream"}; charset=utf-8` });
      return res.end(await readFile(file));
    } catch { /* Try the next static export path. */ }
  }
  res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
  res.end(await readFile(resolve(directory, "404.html")).catch(() => "Not found"));
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  const xml = await readFile(resolve(directory, "sitemap.xml"), "utf8");
  const routes = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname);
  const badRoutes = [];
  for (const path of routes) { const response = await fetch(base + path); if (response.status !== 200) badRoutes.push({ path, status: response.status }); await response.body?.cancel(); }
  const missingStatus = (await fetch(`${base}/seo-definitely-missing-page/`)).status;
  browser = await chromium.launch({ headless: true });
  const results = [];
  const paths = ["/ja/", "/ja/about/", "/ja/faq/", "/ja/saju/", "/ja/sukuyo/", "/en/about/", "/zh/about/"];
  for (const width of [360, 390, 430, 1280]) {
    for (const path of paths) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: "block" });
      let blockedRequests = 0;
      await context.route("**/*", route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin !== base || url.pathname.startsWith("/api/") || !["GET", "HEAD"].includes(request.method())) {
          blockedRequests++;
          return route.fulfill({ status: 503, contentType: "application/json", body: '{"ok":false,"mock":true}' });
        }
        return route.continue();
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.addInitScript(() => {
        window.__seoCls = 0;
        new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__seoCls += entry.value; }).observe({ type: "layout-shift", buffered: true });
      });
      const response = await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1200);
      const measurements = await page.evaluate(() => {
        const visible = element => { const r = element.getBoundingClientRect(); return r.width > 0 && r.height > 0 && element.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true }); };
        const mains = [...document.querySelectorAll("main")];
        const language = document.documentElement.lang;
        const root = mains[0] || document.body;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const korean = [];
        while (walker.nextNode()) {
          const node = walker.currentNode; const parent = node.parentElement;
          if (!parent || parent.closest("script,style,nav,footer,[data-cd-no-trans],[lang=ko],[lang=ko-KR]") || !visible(parent)) continue;
          if (/[가-힣]/.test(node.textContent)) korean.push(node.textContent.trim().slice(0, 120));
        }
        return {
          language, title: document.title, h1: [...document.querySelectorAll("h1")].filter(visible).length,
          overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth), cls: window.__seoCls,
          navText: document.querySelector(".cd-mnav")?.innerText || "",
          policyLinks: [...document.querySelectorAll("footer a")].map(a => a.getAttribute("href")).filter(href => /about|contact|disclaimer|faq|privacy|terms|refund/.test(href || "")),
          korean,
        };
      });
      const image = `${path.replace(/\//g, "_")}-${width}.png`;
      await page.screenshot({ path: resolve(output, image), fullPage: false });
      // Inspect the footer in the same pass, without changing data or opening any paid tool.
      await page.locator("footer").last().scrollIntoViewIfNeeded().catch(() => {});
      if (path === "/ja/about/" && width === 390) await page.screenshot({ path: resolve(output, "ja-about-footer-390.png") });
      results.push({ path, width, status: response.status(), blockedRequests, ...measurements, errors, image });
      await context.close();
    }
  }
  const report = { source: "local dist; all APIs and external requests blocked", crawled: routes.length, badRoutes, missingStatus, results };
  await writeFile(resolve(output, "smoke.json"), JSON.stringify(report, null, 2) + "\n");
  if (process.argv.includes("--lighthouse")) {
    const { launch } = await import("chrome-launcher");
    const { default: lighthouse } = await import("lighthouse");
    // Only loopback bypasses the deliberately unreachable proxy. Lighthouse may create
    // a fresh context, so this process-wide network boundary does not rely on Playwright routes.
    const chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: [
      "--headless=new", "--no-sandbox", "--disable-background-networking",
      "--proxy-server=http://127.0.0.1:9", "--proxy-bypass-list=127.0.0.1;localhost",
      "--host-resolver-rules=MAP * 127.0.0.1, EXCLUDE localhost",
    ] });
    try {
      const scores = [];
      for (const path of ["/ja/", "/ja/about/", "/ja/saju/"]) {
        const result = await lighthouse(base + path, { port: chrome.port, onlyCategories: ["seo"], output: "json", logLevel: "error" });
        const slug = path.replace(/\//g, "_");
        await writeFile(resolve(output, `lighthouse${slug}.json`), result.report);
        scores.push({ path, score: result.lhr.categories.seo.score, failed: Object.values(result.lhr.audits).filter(a => a.score === 0).map(a => a.id), runtimeError: result.lhr.runtimeError || null });
      }
      await writeFile(resolve(output, "lighthouse-summary.json"), JSON.stringify({ environment: "local static export; external network blocked; SEO-only lab audit", scores }, null, 2) + "\n");
      console.log(JSON.stringify({ lighthouse: scores }));
      if (scores.some(s => s.runtimeError)) process.exitCode = 1;
    } finally {
      try { await chrome.kill(); }
      catch (error) {
        // On Windows Chrome can release its profile lock after the launcher has
        // already terminated the process. Preserve the profile instead of deleting broadly.
        if (!["EPERM", "EBUSY"].includes(error.code)) throw error;
        console.warn(`[seo-lighthouse] browser stopped; temporary profile cleanup deferred (${error.code})`);
      }
    }
  }
  console.log(JSON.stringify({ crawled: routes.length, badRoutes, missingStatus, browserSamples: results.length, overflows: results.filter(r => r.overflow > 1).length, koreanSamples: results.filter(r => r.korean.length).length, errors: results.filter(r => r.errors.length).length }));
  if (badRoutes.length || missingStatus !== 404 || results.some(r => r.status !== 200 || r.overflow > 1 || r.h1 !== 1 || r.errors.length)) process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}

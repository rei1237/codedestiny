import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { EDITORIAL_READING_PATHS } from "../app/insights/editorial-reading-paths.mjs";

const origin = process.env.PUBLISHER_TEST_ORIGIN || "http://127.0.0.1:24930";
assert.equal(new URL(origin).hostname, "127.0.0.1", "Browser verification must use the mock server");
const browser = await chromium.launch({ headless: true });
const results = [];
const advertising = [];
try {
  for (const width of [360, 390, 430, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: "ko-KR" });
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (/googlesyndication|doubleclick|googleadservices/.test(url.hostname)) advertising.push(url.hostname);
      return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    const paths = width === 390
      ? ["/insights/", ...EDITORIAL_READING_PATHS.flatMap((group) => group.slugs.map((slug) => `/insights/${slug}/`))]
      : ["/insights/", "/insights/how-we-calculate-saju/", "/insights/ziwei-star-brightness/"];
    for (const path of paths) {
      const response = await page.goto(origin + path, { waitUntil: "domcontentloaded", timeout: 90000 });
      assert.equal(response.status(), 200);
      await page.locator("h1").first().waitFor();
      const metric = await page.evaluate(() => ({
        h1: document.querySelector("h1")?.textContent,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        width: innerWidth,
        articleChars: document.querySelector('[data-article-body="true"]')?.textContent.length || 0,
        review: document.querySelector("[data-editorial-review]")?.getAttribute("data-editorial-review"),
        reviewsCompleted: document.querySelectorAll('[data-editorial-review="verified"]').length,
        picks: document.querySelectorAll("#insight-reading-paths + p + div a").length,
      }));
      assert.equal(metric.overflow, false, `${width} ${path}: horizontal overflow`);
      assert.equal(metric.reviewsCompleted, 0);
      if (path !== "/insights/") {
        assert.ok(metric.articleChars > 0);
        assert.equal(metric.review, "pending");
      } else assert.equal(metric.picks, 20);
      const summary = page.locator("footer details summary").first();
      await summary.focus();
      await page.keyboard.press("Enter");
      assert.equal(await page.locator("footer details").first().getAttribute("open"), "");
      results.push({ path, ...metric, footerKeyboard: "pass" });
    }
    await context.close();
  }
  assert.deepEqual(advertising, [], "Unreviewed pages must not request ads");
} finally {
  await browser.close();
  await mkdir("docs/adsense", { recursive: true });
  await writeFile("docs/adsense/browser-verification.json", JSON.stringify({ mode: "local mock; external requests blocked", results, advertising }, null, 2) + "\n");
}
console.log(`[publisher-browser] ${results.length} viewport/page checks passed; no ad requests`);

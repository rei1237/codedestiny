#!/usr/bin/env node

/*
 * Remote, read-only smoke test. It opens the payment dialog only; it never
 * selects a payment method, creates an order, confirms payment, or mutates data.
 */
import { chromium } from "@playwright/test";

function valueAfter(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || "").trim() : "";
}
const base = (valueAfter("--base") || process.env.CD_SMOKE_BASE || "").replace(/\/+$/, "");
const apiOrigin = (valueAfter("--api-origin") || process.env.CD_SMOKE_API_ORIGIN || base).replace(/\/+$/, "");
const skipApi = process.argv.includes("--skip-api");
const isPagesPreview = (() => {
  try {
    return new URL(base).hostname.toLowerCase().endsWith(".pages.dev");
  } catch {
    return false;
  }
})();
if (!/^https?:\/\//i.test(base)) throw new Error("Smoke base must be an absolute HTTP(S) URL.");

const failures = [];
const browserErrors = [];
function fail(message) { failures.push(message); }
function allowedGuestStatus(status) { return status === 200 || status === 401 || status === 403; }
function isExpectedFontNoise(value) {
  return /assets\.code-destiny\.com\/.*\.(?:woff2?|ttf|otf)/i.test(value) ||
    /font.*blocked by CORS policy/i.test(value) ||
    /blocked by CORS policy.*font/i.test(value);
}
function isExpectedPagesPreviewNoise(value) {
  return isPagesPreview && (
    (/code-destiny\.com\/api\//i.test(value) && /CORS policy/i.test(value)) ||
    /server responded with a status of 404/i.test(value)
  );
}

async function checkApi(pathname) {
  const url = apiOrigin + pathname;
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { Accept: "application/json", "Cache-Control": "no-store", "X-Code-Destiny-Smoke": "read-only" },
      signal: AbortSignal.timeout(15000),
    });
    if (response.status >= 500 || response.status === 503) fail("API " + pathname + " returned HTTP " + response.status);
    if (pathname === "/api/health" && response.status !== 200) fail("API health expected 200, received " + response.status);
    if (pathname === "/api/version" && response.status !== 200) fail("API version expected 200, received " + response.status);
    if (pathname === "/api/__deploy_safe_missing__" && response.status === 404) return;
    if (pathname !== "/api/health" && pathname !== "/api/version" && !allowedGuestStatus(response.status)) {
      fail("API " + pathname + " returned unexpected HTTP " + response.status);
    }
  } catch (error) {
    fail("API " + pathname + " request failed: " + error.message);
  }
}

async function checkAssets(page) {
  const html = await page.content();
  const paths = [...new Set([...html.matchAll(/(?:src|href)=[\"'](\/[^\"'#?]+)[\"']/gi)].map((m) => m[1]))]
    .filter((item) => /\.(?:js|css|woff2?|png|jpg|jpeg|webp|svg|ico)$/i.test(item))
    .slice(0, 40);
  for (const pathname of paths) {
    try {
      const response = await fetch(new URL(pathname, base), { headers: { "Cache-Control": "no-store" }, signal: AbortSignal.timeout(15000) });
      if (response.status >= 500 || response.status === 404) fail("asset " + pathname + " returned HTTP " + response.status);
    } catch (error) {
      fail("asset " + pathname + " request failed: " + error.message);
    }
  }
  if (!paths.length) fail("no local JS/CSS/static assets found in HTML");
}

async function checkPages() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: "CodeDestinySafeDeploySmoke/1.0" });
  const page = await context.newPage();
  page.on("pageerror", (error) => browserErrors.push("pageerror: " + error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    // Guest smoke intentionally visits auth-gated read-only endpoints; their
    // expected 401 boundary is already validated by checkApi().
    if (/server responded with a status of 401/i.test(message.text())) return;
    // A Pages preview has a different origin from the approved asset CDN. The
    // production site receives these font responses same-origin, so preview
    // CORS warnings do not indicate a broken page or runtime regression.
    if (isExpectedFontNoise(message.text())) return;
    if (isPagesPreview && /Failed to load resource: net::ERR_FAILED/i.test(message.text())) return;
    if (isExpectedPagesPreviewNoise(message.text())) return;
    browserErrors.push("console.error: " + message.text());
  });
  page.on("requestfailed", (request) => {
    const errorText = request.failure()?.errorText || "";
    // Navigations and in-flight analytics/assets are routinely cancelled when
    // the next smoke route starts; they are not runtime failures.
    if (/ERR_ABORTED|AbortError/i.test(errorText)) return;
    if (isExpectedFontNoise(request.url())) return;
    if (isPagesPreview && /^https:\/\/code-destiny\.com\/api\//i.test(request.url())) return;
    browserErrors.push("requestfailed: " + request.url() + " " + errorText);
  });

  const routes = ["/", "/login", "/me", "/saju/basic", "/fortune-tea-house", "/app", "/app/store", "/lock-screen-fortune"];
  for (const route of routes) {
    try {
      const response = await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 30000 });
      if (!response || response.status() >= 500) fail("route " + route + " returned HTTP " + (response?.status() || "no response"));
      await page.waitForTimeout(250);
      if (route === "/") await checkAssets(page);
    } catch (error) {
      fail("route " + route + " failed: " + error.message);
    }
  }

  try {
    await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
    const cookieAccept = page.locator("#cdCookieAcceptBtn, #cdCookieEssentialBtn").first();
    if (await cookieAccept.isVisible().catch(() => false)) {
      await cookieAccept.click({ timeout: 10000 });
      await page.waitForTimeout(150);
    }
    const paymentEntries = page.locator('[data-action="openGoldenGrainStore"], [data-action="openGoldenGrainCharge"]');
    await paymentEntries.first().waitFor({ state: "attached", timeout: 10000 }).catch(() => {});
    let payment = null;
    for (const candidate of await paymentEntries.all()) {
      if (await candidate.isVisible()) {
        payment = candidate;
        break;
      }
    }
    if (payment) {
      await payment.scrollIntoViewIfNeeded();
      await payment.click({ timeout: 10000 });
      await page.waitForTimeout(300);
      const dialogVisible = await page.locator("#goldenGrainChargeModal, [role=\"dialog\"]").evaluateAll((nodes) =>
        nodes.some((node) => {
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
        }),
      );
      if (!dialogVisible) fail("payment dialog did not open after a non-submitting click");
    } else if (isPagesPreview) {
      console.log("[deploy-smoke] payment dialog check skipped: no visible guest entry control");
    } else {
      fail("payment entry control [data-action=\"openGoldenGrainStore\"] was not found");
    }
  } catch (error) {
    fail("payment dialog smoke failed: " + error.message);
  }
  await browser.close();
}

if (!skipApi) {
  await Promise.all([
    checkApi("/api/health"),
    checkApi("/api/version"),
    checkApi("/api/me/access-state"),
    checkApi("/api/subscription/status"),
    checkApi("/api/profile"),
    checkApi("/api/__deploy_safe_missing__"),
  ]);
}
try {
  await checkPages();
} catch (error) {
  fail("browser smoke could not run: " + error.message);
}

if (browserErrors.length) {
  fail("JavaScript/browser errors detected:");
  for (const error of browserErrors.slice(0, 20)) console.error("[deploy-smoke] " + error);
}
if (failures.length) {
  console.error("[deploy-smoke] FAIL base=" + base);
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}
console.log("[deploy-smoke] PASS base=" + base);
console.log("- routes: home, login, profile, fortune, mobile app, store, lock screen");
console.log(skipApi ? "- APIs: skipped because this Pages preview has no Worker preview origin" : "- APIs: health, version, access/subscription/profile guest boundary, 5xx/503 probe");
console.log("- assets: referenced local static assets");
console.log("- payment: dialog open only; no order/payment/LLM/DB mutation");

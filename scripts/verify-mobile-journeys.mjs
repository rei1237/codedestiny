import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (file) => fs.readFileSync(path.join(root, file), "utf8");
const viewports = [320, 360, 375, 390, 412, 430].map((width) => ({ width, height: 844 }));
const mobileUserAgent = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36";
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function contentType(file) {
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".json")) return "application/json; charset=utf-8";
  if (file.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function createStaticServer() {
  return http.createServer((request, response) => {
    const requestPath = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
    const relative = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
    const resolved = path.resolve(root, relative);
    if (!resolved.startsWith(root) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(200, { "content-type": contentType(resolved) });
    fs.createReadStream(resolved).pipe(response);
  });
}

function verifySourceContracts() {
  const staticBack = source("js/mobile-backstack-navigation.js");
  const provider = source("app/providers/NavigationProvider.tsx");
  const draft = source("app/_lib/feature-session-draft.ts");
  const paidResume = source("app/hooks/usePaidResume.ts");

  check(!staticBack.includes("pathname = '/index.html'"), "static back navigation still rewrites the URL to /index.html");
  check(staticBack.includes("window.location.href"), "static back reset must retain the active URL");
  check(provider.includes('"overlay" | "wizard" | "analysis"'), "React back handler scopes are incomplete");
  check(provider.includes("ensureTransientBackGuard"), "transient modal/wizard guard is not installed");
  check(draft.includes("window.sessionStorage"), "feature drafts must use sessionStorage");
  check(!draft.includes("window.localStorage"), "feature drafts must not persist in localStorage");
  check(paidResume.includes("registerPaidResumeHandler") && paidResume.includes("grant"), "paid resume handler/grant contract changed");
}

async function verifyStaticMobileJourney() {
  const server = createStaticServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch();

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport,
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 2,
        userAgent: mobileUserAgent,
      });
      await context.route('**/*', (route) => new URL(route.request().url()).origin === origin
        ? route.continue() : route.abort());
      const page = await context.newPage();
      await page.goto(origin, { waitUntil: "domcontentloaded" });
      // Wait for the real startup veil to clear before beginning a journey.
      // DOM clicks otherwise bypass it and race startup scroll-lock cleanup.
      await page.locator('.cd-boot-gate__veil').waitFor({ state: 'hidden', timeout: 15000 });
      // The static backstack runtime is loaded on the first mobile action, not
      // eagerly at boot. Dispatch its real click handler rather than injecting
      // the script; the launcher can be inside a collapsed collection at load.
      const dispatched = await page.locator('[data-action="openTarotModal"]').evaluateAll((nodes) => {
        const launcher = nodes.find((node) => node instanceof HTMLElement);
        if (!(launcher instanceof HTMLElement)) return false;
        launcher.click();
        return true;
      });
      check(dispatched, `${viewport.width}px: tarot mobile launcher is missing`);
      await page.waitForFunction(() => Boolean(window.__cdMobileNav), undefined, { timeout: 15000 }).catch(async (error) => {
        const state = await page.evaluate(() => ({ url: location.href, bridge: window.__cdMobileTouchBridgeReady,
          title: document.title, bodyOverflow: document.body.style.overflow }));
        throw new Error(`${viewport.width}px: mobile backstack not ready ${JSON.stringify(state)}: ${error.message}`);
      });
      // The backstack API can be ready before the deferred open action runs.
      // Start the return journey only once the feature is actually open and
      // owns the scroll lock; otherwise a pending opener can run after Back.
      await page.locator('#tarotModalOverlay').waitFor({ state: 'visible', timeout: 15000 });
      await page.waitForFunction(() => document.body.style.overflow === 'hidden', undefined, { timeout: 15000 }).catch(async (error) => {
        throw new Error(`${viewport.width}px: tarot scroll lock missing: ${error.message}`);
      });

      const layout = await page.evaluate(() => {
        const nav = document.querySelector("#cdMobileBottomNav");
        const targets = [...document.querySelectorAll("#cdMobileBottomNav a, #cdMobileBottomNav button")];
        return {
          path: window.location.pathname,
          overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          navVisible: Boolean(nav && nav.getBoundingClientRect().height > 0),
          smallTargets: targets.map((node) => {
            const rect = node.getBoundingClientRect();
            return { tag: node.tagName, className: node.className, width: Math.round(rect.width), height: Math.round(rect.height) };
          }).filter((target) => target.width > 0 && target.height > 0 && (target.width < 44 || target.height < 44)),
        };
      });
      check(!layout.overflow, `${viewport.width}px: horizontal overflow detected`);
      check(layout.navVisible, `${viewport.width}px: mobile bottom navigation is not visible`);
      check(layout.smallTargets.length === 0, `${viewport.width}px: bottom navigation touch target is below 44px (${JSON.stringify(layout.smallTargets)})`);

      await page.evaluate(() => window.__cdMobileNav.markFeature("journey-test"));
      await page.goBack({ waitUntil: "domcontentloaded" });
      // Back dispatch and the overlay lifecycle cleanup run on separate tasks.
      // Observe their completed state instead of sampling a fixed 220 ms later.
      // A persistent lock still fails, with the active overlays in the error.
      await page.waitForFunction(() => window.__cdMobileNav.getState().surface === 'main'
        && document.body.style.overflow !== 'hidden', undefined, { timeout: 5000 }).catch(async (error) => {
        const pending = await page.evaluate(() => ({
          navigation: window.__cdMobileNav.getState(),
          overflow: document.body.style.overflow,
          overlays: [...document.querySelectorAll('[id$="Overlay"], dialog[open]')]
            .filter(node => { const style = getComputedStyle(node); return style.display !== 'none' && style.visibility !== 'hidden' && node.getBoundingClientRect().height > 0; })
            .map(node => node.id || node.className),
        }));
        throw new Error(`${viewport.width}px: browser back did not finish cleanup ${JSON.stringify(pending)}: ${error.message}`);
      });
      const back = await page.evaluate(() => ({
        path: window.location.pathname,
        surface: window.__cdMobileNav.getState().surface,
        bodyOverflow: document.body.style.overflow,
        visibleOverlays: [...document.querySelectorAll('body [id$="Overlay"], body [role="dialog"], .cd-boot-gate__veil')].filter(node => { const style = getComputedStyle(node); return style.display !== 'none' && style.visibility !== 'hidden' && node.getBoundingClientRect().height > 0; }).map(node => ({ id: node.id, className: node.className, display: node.style.display })),
      }));
      check(back.path === "/", `${viewport.width}px: browser back rewrote ${back.path} instead of preserving /`);
      check(back.surface === "main", `${viewport.width}px: browser back did not restore the main surface (${JSON.stringify(back)})`);
      check(back.bodyOverflow !== "hidden", `${viewport.width}px: browser back left body scroll locked (${JSON.stringify(back)})`);
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

verifySourceContracts();
try {
  await verifyStaticMobileJourney();
} catch (error) {
  failures.push(`browser journey could not run: ${error instanceof Error ? error.message : String(error)}`);
}

if (failures.length) {
  console.error("Mobile journey verification failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Mobile journey verification OK");
console.log(`- Viewports: ${viewports.map(({ width }) => width).join(", ")}`);
console.log("- Journey: static feature surface → browser back → original URL/main surface");
console.log("- Contracts: transient back scopes, session-only drafts, paid-resume grant wiring");

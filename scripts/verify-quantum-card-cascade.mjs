import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";

const root = process.cwd();
const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".woff2", "font/woff2"],
]);

function resolveRequestPath(url) {
  const parsed = new URL(url, "http://127.0.0.1");
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === "/") pathname = "/index.html";
  const candidate = normalize(join(root, pathname));
  if (!(candidate === root || candidate.startsWith(root + sep))) return null;
  if (existsSync(candidate)) return candidate;
  if (!extname(pathname)) return resolve(root, "index.html");
  return candidate;
}

function startStaticServer() {
  const server = createServer(async (req, res) => {
    try {
      const filePath = resolveRequestPath(req.url || "/");
      if (!filePath || !existsSync(filePath)) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("not found");
        return;
      }
      const body = await readFile(filePath);
      res.writeHead(200, {
        "content-type": mimeTypes.get(extname(filePath).toLowerCase()) || "application/octet-stream",
        "cache-control": "no-store",
      });
      res.end(body);
    } catch (error) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end(String(error && error.stack || error));
    }
  });

  return new Promise((resolveServer) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolveServer({ server, baseUrl: `http://127.0.0.1:${address.port}/` });
    });
  });
}

function assert(condition, message, details) {
  if (!condition) {
    const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : "";
    throw new Error(`${message}${suffix}`);
  }
}

async function prepareRuntime(page, baseUrl) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForFunction(() => typeof window.__cdEnsureSajuCoreLoaded === "function", null, { timeout: 30_000 });
  await page.evaluate(async () => {
    await window.__cdEnsureSajuCoreLoaded();
  });
  await page.waitForFunction(() => typeof window.renderTodayDestinyCard === "function", null, { timeout: 30_000 });
}

async function prepareResultSurface(page) {
  await page.evaluate(() => {
    // The real calculation flow opens resultPage before rendering its cards.
    // Without that setup, mobile idle cleanup can detach the hidden parent
    // between renderTodayDestinyCard and this test's CSS assertions.
    window.__cdMobileHomeLazyMount?.mount("resultPage");
    const result = document.getElementById("resultPage");
    if (!result) throw new Error("Result surface failed to mount");
    result.style.display = "block";
  });
}

async function renderZiweiThenCard(page) {
  await prepareResultSurface(page);
  await page.evaluate(() => {
    if (typeof window.renderZiwei === "function") {
      window.renderZiwei(null, null, "ziweiModalSection");
    }
    window.renderTodayDestinyCard({ dayStem: "gap", dayBranch: "ja", element: "wood" });
  });
  await page.waitForFunction(() => {
    const section = document.getElementById("destinySection");
    return section && getComputedStyle(section).display !== "none";
  }, null, { timeout: 10_000 });
}

async function renderCardOnly(page) {
  await prepareResultSurface(page);
  await page.evaluate(() => {
    window.renderTodayDestinyCard({ dayStem: "gap", dayBranch: "ja", element: "wood" });
  });
  await page.waitForFunction(() => {
    const section = document.getElementById("destinySection");
    return section && getComputedStyle(section).display !== "none";
  }, null, { timeout: 10_000 });
}

async function collectQuantumState(page) {
  return page.evaluate(() => {
    const styleOf = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const computed = getComputedStyle(element);
      return {
        display: computed.display,
        width: computed.width,
        height: computed.height,
        padding: computed.padding,
        margin: computed.margin,
        fontSize: computed.fontSize,
        fontFamily: computed.fontFamily,
        fontWeight: computed.fontWeight,
        letterSpacing: computed.letterSpacing,
        backgroundImage: computed.backgroundImage,
        borderRadius: computed.borderRadius,
        boxShadow: computed.boxShadow,
        transform: computed.transform,
        overflow: computed.overflow,
        webkitTextFillColor: computed.webkitTextFillColor,
        perspective: computed.perspective,
      };
    };

    const styleTags = Array.from(document.querySelectorAll("style"));
    const sheetHrefs = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((node) => node.href)
      .filter(Boolean);
    const duplicateSheets = sheetHrefs.filter((href, index) => sheetHrefs.indexOf(href) !== index);

    return {
      counts: {
        destinySection: document.querySelectorAll("#destinySection").length,
        qCardEl: document.querySelectorAll("#qCardEl").length,
        qCardScene: document.querySelectorAll("#qCardScene").length,
        title: Array.from(document.querySelectorAll(".quantum-title"))
          .filter((node) => (node.textContent || "").trim() === "Today's Cosmic Destiny").length,
        inlineQuantumStyle: styleTags.filter((node) => node.textContent.includes(".quantum-mode")).length,
      },
      duplicateSheets,
      section: styleOf("#destinySection"),
      title: styleOf(".quantum-title"),
      scene: styleOf("#qCardScene"),
      front: styleOf(".quantum-card-front"),
      tap: styleOf(".q-tap-text"),
    };
  });
}

function assertCanonicalState(state, viewportName) {
  assert(state.counts.destinySection === 1, `${viewportName}: #destinySection must be unique`, state.counts);
  assert(state.counts.qCardEl === 1, `${viewportName}: #qCardEl must be unique`, state.counts);
  assert(state.counts.qCardScene === 1, `${viewportName}: #qCardScene must be unique`, state.counts);
  assert(state.counts.title === 1, `${viewportName}: quantum title must be unique`, state.counts);
  assert(state.counts.inlineQuantumStyle === 0, `${viewportName}: inline .quantum-mode styles must not exist`, state.counts);
  assert(state.duplicateSheets.length === 0, `${viewportName}: stylesheet links must not be duplicated`, state.duplicateSheets);

  const isMobile = viewportName.includes("mobile");
  const expectedSectionPadding = isMobile ? "30px 16px 22px" : "38px 24px 30px";
  const expectedSectionRadius = isMobile ? "24px" : "30px";
  const expectedSceneWidth = isMobile ? "176px" : "196px";
  const expectedSceneHeight = isMobile ? "264px" : "292px";

  assert(state.section.padding === expectedSectionPadding, `${viewportName}: section padding drifted`, state.section);
  assert(state.section.borderRadius === expectedSectionRadius, `${viewportName}: section radius drifted`, state.section);
  assert(state.section.overflow === "hidden", `${viewportName}: section overflow drifted`, state.section);
  assert(state.section.backgroundImage.includes("radial-gradient"), `${viewportName}: section background drifted`, state.section);
  assert(state.section.fontFamily.includes("Noto Serif KR"), `${viewportName}: section font drifted`, state.section);

  assert(state.title.fontWeight === "700", `${viewportName}: title weight drifted`, state.title);
  assert(state.title.backgroundImage === "none", `${viewportName}: title must not use legacy gradient text`, state.title);
  assert(!/rgba\(0, 0, 0, 0\)|transparent/i.test(state.title.webkitTextFillColor), `${viewportName}: title fill is transparent`, state.title);

  assert(state.scene.width === expectedSceneWidth, `${viewportName}: card scene width drifted`, state.scene);
  assert(state.scene.height === expectedSceneHeight, `${viewportName}: card scene height drifted`, state.scene);
  assert(state.scene.perspective === "1800px", `${viewportName}: card scene perspective drifted`, state.scene);

  assert(state.front.borderRadius === "24px", `${viewportName}: card front radius drifted`, state.front);
  assert(state.front.backgroundImage.includes("160deg"), `${viewportName}: card front background drifted`, state.front);

  assert(state.tap.borderRadius === "999px", `${viewportName}: tap label radius drifted`, state.tap);
  assert(state.tap.backgroundImage.includes("130deg"), `${viewportName}: tap label background drifted`, state.tap);
}

async function runScenario(browser, baseUrl, name, viewport, mode) {
  const page = await browser.newPage({ viewport });
  const hydrationWarnings = [];
  page.on("console", (message) => {
    const text = message.text();
    if (/Hydration failed|Text content does not match|Expected server HTML|className did not match/i.test(text)) {
      hydrationWarnings.push(text);
    }
  });

  await prepareRuntime(page, baseUrl);
  if (mode === "reload") {
    await renderCardOnly(page);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForFunction(() => typeof window.__cdEnsureSajuCoreLoaded === "function", null, { timeout: 30_000 });
    await page.evaluate(async () => {
      await window.__cdEnsureSajuCoreLoaded();
    });
    await renderZiweiThenCard(page);
  } else if (mode === "spa") {
    await prepareResultSurface(page);
    await page.evaluate(() => {
      history.pushState({}, "", "/ziwei/chart/");
      if (typeof window.renderZiwei === "function") {
        window.renderZiwei(null, null, "ziweiModalSection");
      }
      history.pushState({}, "", "/");
      window.renderTodayDestinyCard({ dayStem: "gap", dayBranch: "ja", element: "wood" });
    });
  } else {
    await renderZiweiThenCard(page);
  }

  const state = await collectQuantumState(page);
  assert(hydrationWarnings.length === 0, `${name}: hydration warnings found`, hydrationWarnings);
  assertCanonicalState(state, name);
  await page.close();
  return { name, status: "PASS" };
}

const { server, baseUrl } = await startStaticServer();
const browser = await chromium.launch({ headless: true });

try {
  const results = [];
  results.push(await runScenario(browser, baseUrl, "desktop-direct", { width: 1440, height: 1000 }, "direct"));
  results.push(await runScenario(browser, baseUrl, "desktop-reload", { width: 1440, height: 1000 }, "reload"));
  results.push(await runScenario(browser, baseUrl, "desktop-spa-navigation", { width: 1440, height: 1000 }, "spa"));
  results.push(await runScenario(browser, baseUrl, "mobile-375", { width: 375, height: 900 }, "direct"));
  results.push(await runScenario(browser, baseUrl, "mobile-390", { width: 390, height: 900 }, "direct"));
  console.log("[verify-quantum-card-cascade] PASS");
  for (const result of results) console.log(`- ${result.name}: ${result.status}`);
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}

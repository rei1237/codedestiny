import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import WebSocket from "ws";

const root = process.cwd();
const staticRoot = fs.existsSync(path.join(root, "dist", "index.html")) ? path.join(root, "dist") : root;
// dist 는 웹 배포본일 수도, 앱(Android) 빌드본일 수도 있다. 앱 빌드는 build-mobile-app.mjs 가
const chromePath = findChrome();
const server = await startStaticServer();
const tempProfilePrefix = path.join(os.tmpdir(), "code-destiny-mobile-cdp-profile-");
const debugCdp = process.env.MOBILE_CDP_DEBUG === "1";
const focusAllFortunes = process.env.MOBILE_CDP_FOCUS === "all-fortunes";
const hybridDesktopProfile = process.argv.includes("--hybrid-desktop");
const desktopProfile = hybridDesktopProfile || process.argv.includes("--desktop");

const failures = [];
let chrome;
let cdp;
let userDataDir;

try {
  const launched = await launchReadyChrome();
  chrome = launched.chrome;
  cdp = launched.cdp;
  userDataDir = launched.userDataDir;

  await send(cdp, "Runtime.enable");
  await send(cdp, "Network.enable");
  if (hybridDesktopProfile) {
    await send(cdp, "Page.addScriptToEvaluateOnNewDocument", {
      source: `Object.defineProperty(Navigator.prototype, "maxTouchPoints", {
        configurable: true,
        get: () => 10
      });`,
    });
  }
  await send(cdp, "Emulation.setDeviceMetricsOverride", desktopProfile ? {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  } : {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
  });
  await send(cdp, "Emulation.setTouchEmulationEnabled", desktopProfile ? { enabled: false } : { enabled: true, maxTouchPoints: 5 });
  await navigate(cdp, `http://127.0.0.1:${server.port}/index.html`);

  if (desktopProfile) {
    const desktopState = await evaluate(cdp, `(() => ({
      viewport: { width: innerWidth, height: innerHeight },
      maxTouchPoints: navigator.maxTouchPoints,
      bridgeReady: window.__cdMobileTouchBridgeReady === true,
      touchBridgeBound: document.__cdTouchBridgeBound === true,
      fallbackBound: document.__cdMobileDataActionFallbackBound === true,
      touchStyleInjected: !!document.getElementById('cd-mobile-touch-bridge-style'),
      bottomNavDisplay: getComputedStyle(document.getElementById('cdMobileBottomNav')).display
    }))()`, "desktop bridge state");
    assert(desktopState.viewport.width === 1440 && desktopState.viewport.height === 900, "desktop viewport is 1440x900", desktopState);
    assert(!desktopState.bridgeReady && !desktopState.touchBridgeBound && !desktopState.fallbackBound && !desktopState.touchStyleInjected, "desktop does not initialize the mobile touch bridge or its global capture handlers", desktopState);
    assert(desktopState.bottomNavDisplay === "none", "desktop keeps the mobile bottom nav out of layout", desktopState);

    const selector = '.fc-toggle-btn[data-target="tarotCollection"]';
    const probeReady = await evaluate(cdp, `(() => {
      const target = document.querySelector(${JSON.stringify(selector)});
      if (!target) return false;
      target.scrollIntoView({ block: 'center', behavior: 'instant' });
      sessionStorage.setItem('__cdDesktopClickProbe', '[]');
      window.addEventListener('click', function desktopClickProbe(event) {
        if (!event.target || !event.target.closest(${JSON.stringify(selector)})) return;
        window.setTimeout(function () {
          const clicks = JSON.parse(sessionStorage.getItem('__cdDesktopClickProbe') || '[]');
          clicks.push({
            defaultPrevented: event.defaultPrevented,
            expanded: target.getAttribute('aria-expanded')
          });
          sessionStorage.setItem('__cdDesktopClickProbe', JSON.stringify(clicks));
        }, 0);
      }, true);
      return true;
    })()`, "desktop click probe setup");
    assert(probeReady, "desktop tarot collection control exists", { selector });
    await clickSelector(cdp, selector);
    await delay(100);
    await clickSelector(cdp, selector);
    await delay(100);
    const clickState = await evaluate(cdp, `(() => ({
      clicks: JSON.parse(sessionStorage.getItem('__cdDesktopClickProbe') || '[]'),
      bridgeReady: window.__cdMobileTouchBridgeReady === true,
      touchBridgeBound: document.__cdTouchBridgeBound === true
    }))()`, "desktop click probe result");
    assert(clickState.clicks.length === 2, "desktop collection control receives consecutive native clicks", clickState);
    assert(clickState.clicks[0]?.expanded === "true" && clickState.clicks[1]?.expanded === "false", "desktop collection remains usable after its first interaction", clickState);
    assert(!clickState.bridgeReady && !clickState.touchBridgeBound, "desktop click flow never activates the mobile bridge", clickState);
  } else {
  const initial = await evaluate(cdp, mobileStateExpression(), "initial mobile state");
  assert(initial.viewportWidth === 390, "viewport width is 390", initial);
  if (!focusAllFortunes) {
    assert(initial.responsiveHomeVisible, "responsive mobile home is visible", initial);
    assert(initial.primaryCtaInFirstView, "primary CTA is in first view", initial);
  }
  assert(initial.bottomNavVisible, "bottom nav is visible", initial);
  assert(initial.bottomNavMainCount === 5, "bottom nav has five main items", initial);
  assert(initial.bottomNavQuickHidden, "bottom nav quick rail is hidden", initial);
  assert(initial.languageDropdownClosed, "language dropdown is closed without hit boxes", initial);
  // 2026-07 모바일 홈 리디자인부터 추천 카드가 첫 화면에 일부 노출된다(프로덕션 실측 top≈502).
  // 리디자인에도 살아남는 불변식은 "카드가 주 CTA 를 덮고 올라오지 않는다"이다.
  if (!focusAllFortunes) {
    assert(initial.membershipBelowPrimaryCta, "membership guidance begins below the primary CTA", initial);
  }
  assert(initial.noHorizontalOverflow, "no horizontal overflow", initial);
  assert(initial.audioVideoCount === 0, "home has no initial audio/video elements", initial);
  assert(initial.hiddenOverlaysPointerSafe, "hidden overlays do not block touch", initial);

  if (!focusAllFortunes) {
  await tapSelector(cdp, ".moon-hero__cta--primary[href=\"/codedestiny-novel.html\"]");
  // 단일 반응형 홈의 주 CTA는 운명 여정으로 이동한다. 정적 셸의 문서 전환은 고정 대기보다 짧은 폴링이 안정적이다.
  let afterPrimaryTap = { pathname: "" };
  for (let i = 0; i < 12; i += 1) {
    await delay(250);
    afterPrimaryTap = await evaluate(cdp, "({ pathname: location.pathname })", "after primary CTA tap");
    if (afterPrimaryTap.pathname.indexOf("/codedestiny-novel.html") === 0) break;
  }
  assert(
    afterPrimaryTap.pathname.indexOf("/codedestiny-novel.html") === 0,
    "primary CTA opens the destiny journey",
    afterPrimaryTap,
  );

  await navigate(cdp, `http://127.0.0.1:${server.port}/index.html`);
  await tapSelector(cdp, ".moon-preview-card[href=\"/tarot/mingri\"]");
  await delay(450);
  const afterTarotTap = await evaluate(cdp, `(() => {
    const modal = ${modalStateExpression()};
    return Object.assign({ pathname: location.pathname }, modal);
  })()`, "after tarot tap");
  assert(afterTarotTap.pathname.indexOf("/tarot/mingri") === 0 || afterTarotTap.tilePreviewOpen || afterTarotTap.tarotModalVisible, "tarot touch opens route, sheet, or modal", afterTarotTap);
  }

  await navigate(cdp, `http://127.0.0.1:${server.port}/index.html`);
  // 모든 운세 탭은 이동하지 않고 풀스크린 오버레이를 전체 개요 모드로 연다.
  await tapSelector(cdp, "#cdMobileBottomNav .cd-mobile-bottom-nav__main [data-nav-key=\"fortunes\"]");
  // Visual exit completes at 280ms; allow scheduler margin before checking the
  // follow-up display:none cleanup under CDP's mobile emulation load.
  await delay(800);
  const afterFortunesNav = await evaluate(cdp, `(() => {
    const panel = document.getElementById('cdMobileFortuneOverview');
    const api = window.cdMobileCollectionFullscreen;
    return {
      pathname: location.pathname,
      overlayOpen: !!(api && api.isOpen()),
      overviewShown: !!panel && panel.classList.contains('is-open'),
      categoryCount: panel ? panel.querySelectorAll('.cd-fov__cat').length : 0,
      activeKey: document.querySelector('#cdMobileBottomNav .cd-mobile-bottom-nav__main [aria-current="page"]')?.getAttribute('data-nav-key') || null,
      navDisplay: getComputedStyle(document.getElementById('cdMobileBottomNav')).display,
      navPointerEvents: getComputedStyle(document.getElementById('cdMobileBottomNav')).pointerEvents,
      navAriaHidden: document.getElementById('cdMobileBottomNav')?.getAttribute('aria-hidden'),
      panelBottom: panel ? Math.round(panel.getBoundingClientRect().bottom) : 0,
      viewportHeight: innerHeight
    };
  })()`, "after bottom nav all-fortunes tap");
  assert(afterFortunesNav.overlayOpen && afterFortunesNav.overviewShown, "bottom nav all-fortunes opens the overview overlay", afterFortunesNav);
  assert(afterFortunesNav.categoryCount > 0, "all-fortunes overview lists categories", afterFortunesNav);
  assert(afterFortunesNav.activeKey === "fortunes", "all-fortunes tab marks itself active", afterFortunesNav);
  assert(afterFortunesNav.navDisplay === "none" && afterFortunesNav.navPointerEvents === "none" && afterFortunesNav.navAriaHidden === "true", "immersive all-fortunes removes the bottom-nav layout and touch target", afterFortunesNav);
  assert(afterFortunesNav.panelBottom >= afterFortunesNav.viewportHeight - 1, "all-fortunes content extends through the released bottom safe area", afterFortunesNav);

  await tapSelector(cdp, '.cd-fov__cat[data-collection-id="tarotCollection"]');
  await delay(120);
  await tapSelector(cdp, '.cd-mobile-collection-tab[data-collection-id="oracleCollection"]');
  await delay(120);
  const afterRapidCollectionSwitch = await evaluate(cdp, `(() => {
    const api = window.cdMobileCollectionFullscreen;
    const chrome = document.getElementById('cdMobileCollectionChromeBar');
    const activeTab = chrome?.querySelector('.cd-mobile-collection-tab[aria-current="page"]');
    return {
      overlayOpen: !!api?.isOpen?.(),
      currentCollection: api?.getCurrent?.() || null,
      activeCollection: activeTab?.getAttribute('data-collection-id') || null,
      chromePointerEvents: chrome ? getComputedStyle(chrome).pointerEvents : null
    };
  })()`, "after rapid tarot-to-oracle touch switch");
  assert(afterRapidCollectionSwitch.overlayOpen && afterRapidCollectionSwitch.currentCollection === "oracleCollection" && afterRapidCollectionSwitch.activeCollection === "oracleCollection" && afterRapidCollectionSwitch.chromePointerEvents === "auto", "rapid tarot-to-oracle touch switch remains interactive", afterRapidCollectionSwitch);
  await tapSelector(cdp, '.cd-mobile-collection-tab[data-collection-id="miscCollection"]');
  await delay(120);
  await tapSelector(cdp, ".cd-mobile-collection-close");
  await delay(350);
  const afterFortunesClose = await evaluate(cdp, `(() => {
    const nav = document.getElementById('cdMobileBottomNav');
    const api = window.cdMobileCollectionFullscreen;
    return { overlayOpen: !!(api && api.isOpen()), navDisplay: getComputedStyle(nav).display, navPointerEvents: getComputedStyle(nav).pointerEvents, navAriaHidden: nav.getAttribute('aria-hidden') };
  })()`, "after all-fortunes close");
  assert(!afterFortunesClose.overlayOpen && afterFortunesClose.navDisplay !== "none" && afterFortunesClose.navPointerEvents !== "none" && afterFortunesClose.navAriaHidden !== "true", "closing all-fortunes restores a usable bottom nav", afterFortunesClose);

  await tapSelector(cdp, "#cdMobileBottomNav .cd-mobile-bottom-nav__main [data-nav-key=\"fortunes\"]");
  await delay(450);
  const restoredFortunesState = await evaluate(cdp, "({ currentCollection: window.cdMobileCollectionFullscreen?.getCurrent?.() || null, overlayOpen: !!window.cdMobileCollectionFullscreen?.isOpen?.() })", "restored all-fortunes state");
  assert(restoredFortunesState.overlayOpen && restoredFortunesState.currentCollection === "miscCollection", "reopening all-fortunes preserves its selected collection", restoredFortunesState);

  if (!focusAllFortunes) {
  await navigate(cdp, `http://127.0.0.1:${server.port}/index.html`);
  await navigate(cdp, `http://127.0.0.1:${server.port}/index.html`);
  const membershipButtonState = await evaluate(cdp, `(() => {
    const node = document.querySelector('#honeyMembershipMini [data-membership-cta="benefits"]');
    if (!node) return { exists: false, visible: false, action: null };
    const r = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      exists: true,
      visible: r.width > 0 && r.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
      action: node.getAttribute('data-membership-cta'),
      width: Math.round(r.width),
      height: Math.round(r.height)
    };
  })()`, "membership benefits button state");
  assert(membershipButtonState.exists && membershipButtonState.visible && membershipButtonState.action === "benefits", "mobile membership benefits button is visible and action-wired", membershipButtonState);

  await tapSelector(cdp, '#honeyMembershipMini [data-membership-cta="benefits"]');
  let membershipBenefitsDestination = { pathname: "", search: "" };
  for (let i = 0; i < 12; i += 1) {
    await delay(250);
    membershipBenefitsDestination = await evaluate(cdp, "({ pathname: location.pathname, search: location.search })", "membership benefits destination");
    if (membershipBenefitsDestination.pathname.indexOf("/points") === 0 || membershipBenefitsDestination.pathname.indexOf("/login") === 0) break;
  }
  assert(
    membershipBenefitsDestination.pathname.indexOf("/points") === 0 || (
      membershipBenefitsDestination.pathname.indexOf("/login") === 0 &&
      membershipBenefitsDestination.search.indexOf("/points") >= 0
    ),
    "mobile membership benefits routes to the pass guide without entering a payment flow",
    membershipBenefitsDestination,
  );
  }

  }

  if (failures.length) {
    console.error(desktopProfile ? "Desktop CDP smoke failed." : "Mobile CDP smoke failed.");
    for (const failure of failures) {
      console.error(`- ${failure.name}: ${JSON.stringify(failure.details)}`);
    }
    process.exitCode = 1;
  } else {
    if (desktopProfile) {
      console.log("Desktop CDP smoke OK");
      console.log(`- Profile: ${hybridDesktopProfile ? "1440x900 hybrid touch desktop" : "1440x900 mouse desktop"}`);
      console.log("- Mobile bridge initialization: skipped");
      console.log("- Consecutive tarot collection clicks: OK");
    } else {
      console.log("Mobile CDP smoke OK");
      console.log("- Viewport: 390x844");
      if (!focusAllFortunes) {
        console.log("- Primary CTA opens the destiny journey: OK");
        console.log("- Tarot touch: OK");
        console.log("- Bottom nav 5-tab tarot touch: OK");
        console.log("- Membership benefits CTA routes to the pass guide: OK");
      }
      console.log("- Initial audio/video elements: 0");
      if (focusAllFortunes) console.log("- Focused all-fortunes touch flow: OK");
    }
  }
} finally {
  if (cdp) {
    try {
      await send(cdp, "Browser.close");
    } catch {}
    try {
      cdp.close();
    } catch {}
  }
  await closeQuietly(server.instance);
  if (chrome) {
    chrome.kill();
    await waitForProcessExit(chrome, 5000);
  }
  if (userDataDir) {
    await removeTempDir(userDataDir);
  }
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error("Chrome or Edge executable was not found.");
  }
  return found;
}

function startStaticServer() {
  const instance = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const rawPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const filePath = path.normalize(path.join(staticRoot, rawPath));
    if (!filePath.startsWith(staticRoot)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    fs.readFile(filePath, (error, buffer) => {
      if (error) {
        res.writeHead(404).end("Not found");
        return;
      }
      res.writeHead(200, { "content-type": contentType(filePath), "cache-control": "no-store" });
      res.end(buffer);
    });
  });
  return new Promise((resolve) => {
    instance.listen(0, "127.0.0.1", () => {
      resolve({ instance, port: instance.address().port });
    });
  });
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".mp3": "audio/mpeg",
  }[ext] || "application/octet-stream";
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const instance = http.createServer();
    instance.on("error", reject);
    instance.listen(0, "127.0.0.1", () => {
      const address = instance.address();
      const port = typeof address === "object" && address ? address.port : 0;
      instance.close(() => {
        if (port > 0) resolve(port);
        else reject(new Error("Failed to reserve a Chrome debug port."));
      });
    });
  });
}

function startChrome(args) {
  return spawn(chromePath, args, {
    stdio: ["ignore", "ignore", "pipe"],
    windowsHide: true,
  });
}

function logDebug(message) {
  if (debugCdp) {
    console.warn(`[mobile-cdp-smoke] ${message}`);
  }
}

async function launchReadyChrome() {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const debugPort = await getFreePort();
    const attemptUserDataDir = `${tempProfilePrefix}${Date.now()}-${attempt}`;
    const attemptChrome = startChrome([
      "--headless=new",
      "--disable-gpu",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-extensions",
      "--disable-features=DawnGraphite,DawnWebGPU",
      "--disable-sync",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-debugging-address=127.0.0.1",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${attemptUserDataDir}`,
      "about:blank",
    ]);
    let chromeStderr = "";
    attemptChrome.stderr?.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      chromeStderr = `${chromeStderr}${text}`.slice(-800);
      if (debugCdp && text.trim()) {
        console.warn(`[mobile-cdp-smoke] chrome stderr: ${text.trim()}`);
      }
    });
    let attemptExit = null;
    attemptChrome.once("exit", (code, signal) => {
      attemptExit = `code=${code} signal=${signal}`;
      logDebug(`chrome exited attempt=${attempt} ${attemptExit}`);
    });
    attemptChrome.once("error", (error) => {
      attemptExit = `error=${error.message}`;
      logDebug(`chrome launch error attempt=${attempt} ${attemptExit}`);
    });
    logDebug(`launch attempt=${attempt} pid=${attemptChrome.pid || "unknown"} port=${debugPort} profile=${attemptUserDataDir}`);

    try {
      await delay(100);
      await waitForChrome(debugPort);
      await delay(500);
      const attemptCdp = await createReadyCdp(debugPort);
      if (attempt > 1) {
        console.warn(`[mobile-cdp-smoke] Chrome launch recovered on attempt ${attempt}.`);
      }
      return { chrome: attemptChrome, cdp: attemptCdp, userDataDir: attemptUserDataDir };
    } catch (error) {
      const stderrTail = chromeStderr.trim() ? `; stderr=${chromeStderr.trim()}` : "";
      lastError = attemptExit ? new Error(`${error.message}; Chrome ${attemptExit}${stderrTail}`) : error;
      logDebug(`launch attempt=${attempt} failed: ${error.message}`);
      attemptChrome.kill();
      await waitForProcessExit(attemptChrome, 5000);
      await removeTempDir(attemptUserDataDir);
      await delay(1000 * attempt);
    }
  }
  throw new Error(`Failed to launch ready Chrome for mobile CDP smoke: ${lastError?.message || "unknown error"}`);
}

async function waitForChrome(port) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const response = await requestCdpJson(port, "/json/version");
      if (response.ok) return;
    } catch {}
    await delay(150);
  }
  throw new Error("Timed out waiting for Chrome CDP endpoint.");
}

async function createCdpPage(port, url) {
  let response;
  try {
    response = await requestCdpJson(port, `/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  } catch (error) {
    const fallback = await findExistingCdpPage(port);
    if (fallback) return fallback;
    throw new Error(`Failed to create CDP page: ${error.message}`);
  }
  if (!response.ok) {
    const fallback = await findExistingCdpPage(port);
    if (fallback) return fallback;
    throw new Error(`Failed to create CDP page: HTTP ${response.status}`);
  }
  return response.data;
}

async function findExistingCdpPage(port) {
  try {
    const response = await requestCdpJson(port, "/json");
    if (!response.ok) return null;
    const targets = response.data;
    return targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl) || null;
  } catch {
    return null;
  }
}

function requestCdpJson(port, requestPath, options = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: requestPath,
        method: options.method || "GET",
        headers: { connection: "close" },
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          try {
            resolve({
              ok: response.statusCode >= 200 && response.statusCode < 300,
              status: response.statusCode || 0,
              data: body ? JSON.parse(body) : null,
            });
          } catch (error) {
            reject(new Error(`Invalid CDP JSON response: ${error.message}`));
          }
        });
      }
    );
    request.setTimeout(5000, () => {
      request.destroy(new Error(`CDP HTTP timeout: ${requestPath}`));
    });
    request.on("error", reject);
    request.end();
  });
}

async function createReadyCdp(port) {
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    let attemptCdp;
    try {
      const page = await createCdpPage(port, "about:blank");
      attemptCdp = await connectCdp(page.webSocketDebuggerUrl);
      await send(attemptCdp, "Page.enable");
      if (attempt > 1) {
        console.warn(`[mobile-cdp-smoke] CDP handshake recovered on attempt ${attempt}.`);
      }
      return attemptCdp;
    } catch (error) {
      lastError = error;
      try {
        attemptCdp?.close();
      } catch {}
      await delay(650 * attempt);
    }
  }
  try {
    return await createReadyCdpFromBrowserTarget(port);
  } catch (error) {
    lastError = error;
  }
  throw new Error(`Failed to initialize Chrome CDP after retries: ${lastError?.message || "unknown error"}`);
}

async function createReadyCdpFromBrowserTarget(port) {
  const version = await requestCdpJson(port, "/json/version");
  const browserSocket = version.data?.webSocketDebuggerUrl;
  if (!version.ok || !browserSocket) {
    throw new Error("Chrome CDP browser websocket is unavailable.");
  }
  const browserCdp = await connectCdp(browserSocket);
  try {
    const target = await send(browserCdp, "Target.createTarget", { url: "about:blank" });
    const attached = await send(browserCdp, "Target.attachToTarget", {
      targetId: target.targetId,
      flatten: true,
    });
    const pageCdp = browserCdp.withSession(attached.sessionId);
    await send(pageCdp, "Page.enable");
    console.warn("[mobile-cdp-smoke] CDP handshake used browser-target fallback.");
    return pageCdp;
  } catch (error) {
    try {
      browserCdp.close();
    } catch {}
    throw error;
  }
}

function connectCdp(webSocketUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(webSocketUrl);
    const pending = new Map();
    const events = new Map();
    let id = 0;
    let connected = false;

    ws.once("open", () => {
      connected = true;
      const client = {
        sessionId: null,
        withSession(sessionId) {
          return { ...client, sessionId };
        },
        send(method, params = {}) {
          const messageId = ++id;
          const responsePromise = new Promise((res, rej) => {
            pending.set(messageId, { resolve: res, reject: rej });
            setTimeout(() => {
              if (pending.has(messageId)) {
                pending.delete(messageId);
                rej(new Error(`CDP timeout: ${method}`));
              }
            }, 45000);
          });
          const sendTrace = `[cdp-send] ${messageId} ${method}`;
          if (process.env.MOBILE_CDP_DEBUG === "1") console.log(sendTrace);
          try {
            const message = { id: messageId, method, params };
            if (this.sessionId && !method.startsWith("Browser.") && !method.startsWith("Target.")) {
              message.sessionId = this.sessionId;
            }
            ws.send(JSON.stringify(message));
          } catch (error) {
            if (pending.has(messageId)) {
              pending.delete(messageId);
              throw error;
            }
          }
          return responsePromise;
        },
        waitForEvent(method, timeoutMs = 15000) {
          return new Promise((res, rej) => {
            const timer = setTimeout(() => {
              const list = events.get(method) || [];
              events.set(method, list.filter((entry) => entry.resolve !== res));
              rej(new Error(`CDP event timeout: ${method}`));
            }, timeoutMs);
            const list = events.get(method) || [];
            list.push({ resolve: (params) => {
              clearTimeout(timer);
              res(params);
            } });
            events.set(method, list);
          });
        },
        close() {
          ws.close();
        },
      };
      setTimeout(() => resolve(client), 120);
    });
    ws.once("error", (error) => {
      if (!connected) {
        reject(error);
        return;
      }
      rejectPending(pending, error);
    });
    ws.once("close", () => {
      const error = new Error("CDP WebSocket closed before command response.");
      if (!connected) {
        reject(error);
        return;
      }
      rejectPending(pending, error);
    });
    ws.on("message", (data) => {
      let payload = data;
      if (typeof payload !== "string") {
        if (Buffer.isBuffer(payload)) {
          payload = payload.toString("utf8");
        } else if (payload instanceof ArrayBuffer) {
          payload = new TextDecoder().decode(payload);
        } else if (ArrayBuffer.isView(payload)) {
          payload = new TextDecoder().decode(payload);
        } else {
          payload = String(payload || "");
        }
      }

      let message;
      try {
        message = JSON.parse(payload);
      } catch {
        return;
      }
      const messageTrace = `[cdp-message] id=${message.id || ""} method=${message.method || ""}`;
      if (process.env.MOBILE_CDP_DEBUG === "1") console.log(messageTrace);

      if (message.id && pending.has(message.id)) {
        const entry = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) entry.reject(new Error(message.error.message || "CDP error"));
        else entry.resolve(message.result);
        return;
      }
      if (message.method && events.has(message.method)) {
        const list = events.get(message.method);
        const entry = list.shift();
        if (entry) entry.resolve(message.params || {});
      }
    });
  });
}

function rejectPending(pending, error) {
  for (const [, entry] of pending) {
    entry.reject(error);
  }
  pending.clear();
}

async function send(cdp, method, params) {
  return cdp.send(method, params);
}

async function navigate(cdp, url) {
  const loaded = cdp.waitForEvent("Page.loadEventFired", 20000);
  await send(cdp, "Page.navigate", { url });
  await loaded;
}

async function evaluate(cdp, expression, label = "Runtime.evaluate") {
  let result;
  try {
    result = await send(cdp, "Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
  } catch (error) {
    throw new Error(`${label}: ${error.message}`);
  }
  if (result.exceptionDetails) {
    throw new Error(`${label}: ${result.exceptionDetails.text || "Runtime evaluation failed"}`);
  }
  return result.result.value;
}

async function tapSelector(cdp, selector) {
  let box = await evaluate(cdp, selectorBoxExpression(selector));
  if (!box.exists || !box.visible) {
    throw new Error(`Cannot tap hidden selector: ${selector} ${JSON.stringify(box)}`);
  }
  if (!box.inViewport) {
    await evaluate(cdp, scrollSelectorIntoViewExpression(selector), `scroll ${selector} into view`);
    await delay(160);
    box = await evaluate(cdp, selectorBoxExpression(selector));
  }
  if (!box.inViewport) {
    throw new Error(`Cannot tap selector outside viewport: ${selector} ${JSON.stringify(box)}`);
  }
  // load 직후엔 부팅 실드(.cd-boot-gate__veil 등)가 좌표를 덮고 있어 탭이 실드에 떨어진다.
  // getBoundingClientRect 는 오버레이를 뚫고 측정되므로, 좌표가 실제로 대상 요소에
  // 닿는지(elementFromPoint) 확인될 때까지 기다린 뒤 디스패치한다.
  let hit = null;
  const occlusionDeadline = Date.now() + 8000;
  for (;;) {
    hit = await evaluate(cdp, tapPointHitExpression(selector, box.centerX, box.centerY), `hit-test ${selector}`);
    if (hit.hits) break;
    if (Date.now() > occlusionDeadline) {
      throw new Error(`Tap point occluded for ${selector}: top element is ${hit.top || "(none)"}`);
    }
    await delay(120);
    box = await evaluate(cdp, selectorBoxExpression(selector));
    if (!box.exists || !box.visible || !box.inViewport) {
      throw new Error(`Selector became untappable while waiting: ${selector} ${JSON.stringify(box)}`);
    }
  }
  await send(cdp, "Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.centerX, y: box.centerY, radiusX: 3, radiusY: 3, force: 1 }],
  });
  await send(cdp, "Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

async function clickSelector(cdp, selector) {
  let box = await evaluate(cdp, selectorBoxExpression(selector));
  if (!box.exists || !box.visible) {
    throw new Error(`Cannot click hidden selector: ${selector} ${JSON.stringify(box)}`);
  }
  if (!box.inViewport) {
    await evaluate(cdp, scrollSelectorIntoViewExpression(selector), `scroll ${selector} into view`);
    await delay(120);
    box = await evaluate(cdp, selectorBoxExpression(selector));
  }
  if (!box.inViewport) {
    throw new Error(`Cannot click selector outside viewport: ${selector} ${JSON.stringify(box)}`);
  }
  let hit = null;
  const occlusionDeadline = Date.now() + 8000;
  for (;;) {
    hit = await evaluate(cdp, tapPointHitExpression(selector, box.centerX, box.centerY), `hit-test ${selector}`);
    if (hit.hits) break;
    if (Date.now() > occlusionDeadline) {
      throw new Error(`Click point occluded for ${selector}: top element is ${hit.top || "(none)"}`);
    }
    await delay(120);
    box = await evaluate(cdp, selectorBoxExpression(selector));
    if (!box.exists || !box.visible || !box.inViewport) {
      throw new Error(`Selector became unclickable while waiting: ${selector} ${JSON.stringify(box)}`);
    }
  }
  await evaluate(cdp, `(() => {
    const node = document.querySelector(${JSON.stringify(selector)});
    if (!node) return false;
    node.click();
    return true;
  })()`, `click ${selector}`);
}

function tapPointHitExpression(selector, x, y) {
  return `(() => {
    const el = document.elementFromPoint(${Number(x)}, ${Number(y)});
    if (!el) return { hits: false, top: null };
    const target = el.closest(${JSON.stringify(selector)});
    const label = el.tagName.toLowerCase()
      + (el.id ? '#' + el.id : '')
      + (el.classList && el.classList.length ? '.' + Array.from(el.classList).slice(0, 3).join('.') : '');
    return { hits: !!target, top: label };
  })()`;
}

function scrollSelectorIntoViewExpression(selector) {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return false;
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    return true;
  })()`;
}

function selectorBoxExpression(selector) {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return { exists: false, visible: false };
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      exists: true,
      visible: r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
      x: Math.round(r.x),
      y: Math.round(r.y),
      width: Math.round(r.width),
      height: Math.round(r.height),
      centerX: Math.round(r.left + r.width / 2),
      centerY: Math.round(r.top + r.height / 2),
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      inViewport: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
      pointerEvents: style.pointerEvents
    };
  })()`;
}

function mobileStateExpression() {
  return `(() => {
    const home = document.querySelector('#inputPage');
    const nav = document.querySelector('#cdMobileBottomNav');
    const cta = document.querySelector('.moon-hero__cta--primary[href="/codedestiny-novel.html"]');
    const quickRail = document.querySelector('#cdMobileBottomNav .cd-mobile-bottom-nav__quick');
    const mainNavItems = Array.from(document.querySelectorAll('#cdMobileBottomNav .cd-mobile-bottom-nav__main [data-nav-key]'));
    const langDropdown = document.querySelector('#langDropdown');
    const langButtons = Array.from(document.querySelectorAll('#langDropdown [data-action="changeLanguage"]'));
    const membership = document.querySelector('#honeyMembershipMini');
    const overlays = ['#tilePvwOverlay', '#privacy-modal-overlay', '#goldenGrainChargeModalRoot'];
    const ctaRect = cta?.getBoundingClientRect();
    const navRect = nav?.getBoundingClientRect();
    const membershipRect = membership?.getBoundingClientRect();
    const quickStyle = quickRail ? getComputedStyle(quickRail) : null;
    const langStyle = langDropdown ? getComputedStyle(langDropdown) : null;
    const visibleLangButtons = langButtons.filter((node) => {
      const r = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return r.width > 0 && r.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });
    return {
      viewportWidth: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth + 1,
      responsiveHomeVisible: !!home && getComputedStyle(home).display !== 'none',
      primaryCtaInFirstView: !!ctaRect && ctaRect.top >= 0 && ctaRect.bottom <= innerHeight,
      bottomNavVisible: !!navRect && navRect.bottom <= innerHeight + 2 && navRect.top < innerHeight,
      bottomNavMainCount: mainNavItems.length,
      bottomNavMainKeys: mainNavItems.map((node) => node.getAttribute('data-nav-key')),
      bottomNavQuickHidden: !!quickRail && (quickRail.hidden || quickStyle.display === 'none' || quickStyle.visibility === 'hidden'),
      languageDropdownClosed: !!langDropdown && langDropdown.getAttribute('aria-hidden') === 'true' && langStyle.display === 'none' && visibleLangButtons.length === 0,
      membershipBelowPrimaryCta: !!membershipRect && !!ctaRect && membershipRect.top >= ctaRect.bottom,
      membershipRect: membershipRect ? { top: Math.round(membershipRect.top), bottom: Math.round(membershipRect.bottom) } : null,
      audioVideoCount: document.querySelectorAll('audio,video').length,
      bodyClass: document.body.className,
      navRect: navRect ? { top: Math.round(navRect.top), bottom: Math.round(navRect.bottom), height: Math.round(navRect.height) } : null,
      navStyle: nav ? { display: getComputedStyle(nav).display, visibility: getComputedStyle(nav).visibility, opacity: getComputedStyle(nav).opacity, transform: getComputedStyle(nav).transform } : null,
      overlayDetails: overlays.map((selector) => {
        const node = document.querySelector(selector);
        if (!node) return { selector, exists: false };
        const r = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          selector,
          exists: true,
          ariaHidden: node.getAttribute('aria-hidden'),
          classes: node.className,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          pointerEvents: style.pointerEvents,
          rect: { width: Math.round(r.width), height: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom) }
        };
      }),
      hiddenOverlaysPointerSafe: overlays.every((selector) => {
        const node = document.querySelector(selector);
        if (!node) return true;
        const r = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        const visuallyEmpty = r.width === 0 || r.height === 0 || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0;
        const hidden = visuallyEmpty || node.getAttribute('aria-hidden') === 'true' || (!node.classList.contains('pvw-open') && !node.classList.contains('golden-grain-modal--open'));
        return hidden || style.pointerEvents === 'none';
      })
    };
  })()`;
}

function modalStateExpression() {
  return `(() => {
    const preview = document.querySelector('#tilePvwOverlay');
    const tarot = document.querySelector('#tarotModalOverlay, #tarotModal');
    return {
      tilePreviewOpen: !!preview && (preview.classList.contains('pvw-open') || preview.getAttribute('aria-hidden') === 'false'),
      tarotModalVisible: !!tarot && getComputedStyle(tarot).display !== 'none' && getComputedStyle(tarot).visibility !== 'hidden'
    };
  })()`;
}

function assert(pass, name, details) {
  if (!pass) failures.push({ name, details });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function closeQuietly(serverInstance) {
  return new Promise((resolve) => {
    serverInstance.close(() => resolve());
  });
}

function waitForProcessExit(child, timeoutMs) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode) {
      resolve();
      return;
    }
    if (typeof child.once !== "function") {
      setTimeout(resolve, Math.min(timeoutMs, 1000));
      return;
    }
    const timer = setTimeout(resolve, timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function removeTempDir(dir) {
  if (!dir.startsWith(tempProfilePrefix)) {
    return;
  }
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
      return;
    } catch (error) {
      if (attempt === 5) {
        if (process.env.MOBILE_CDP_STRICT_CLEANUP === "1") {
          console.warn(`[mobile-cdp-smoke] cleanup warning: ${error.message}`);
        }
        return;
      }
      await delay(250);
    }
  }
}

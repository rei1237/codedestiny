#!/usr/bin/env node
/**
 * verify-rpt-preview-cta-flow.mjs
 *
 * "재미있는 사주 콘텐츠"(.rpt-v2-toggle-btn) 타일의 기능 상세 팝업 ↔ 결제/토글 흐름을
 * 실제 크롬(CDP)에서 클릭으로 재현한다.
 *
 * 왜 정적 grep으로 부족한가: 이번 회귀의 실체는 "document 캡처 리스너 두 개가 같은 클릭을
 * 각각 처리한다"였다. 두 코드 조각 모두 문법적으로 멀쩡했고 마커 검사도 통과했다.
 * 결함은 실행 시점에만 드러난다 — 그래서 진짜 클릭을 쏴서 호출 횟수를 센다.
 *
 * 재현 시나리오 (각각 새 페이지에서):
 *  1) 잠금 타일   : 클릭 → 상세 팝업만 뜬다(결제 게이트·토글 없음) → CTA → 결제 경로 진입
 *  2) 해금 타일   : 클릭 → 상세 팝업만 뜬다(카드 안 펼쳐짐)       → CTA → 카드 1회만 열림
 *                 → 펼쳐진 카드 재클릭 → 팝업 없이 접힘 → 다시 클릭하면 팝업 복귀
 *  3) 회당결제 타일: 클릭 → 상세 팝업만 뜬다                       → CTA → 결제 경로 진입
 *
 * 2)의 "1회만"이 핵심이다. 예전엔 첫 클릭에서 카드가 팝업 뒤로 열리고(1회), CTA 재클릭이
 * 토글로 도로 닫아(2회) 사용자에게는 "눌러도 안 열림"으로 보였다.
 * 2)의 재클릭 단계는 그 반대 방향 회귀를 잡는다: 펼쳐진 카드를 다시 눌렀을 때 팝업이 또 뜨면
 * 카드를 자기 버튼으로 닫을 방법이 사라져 "영원히 못 닫는" 상태가 된다(2026-08 재발).
 *
 * 실제 사주 분석을 완주할 필요는 없다(결함은 문서 레벨 위임 로직에 있다). 대신 대시보드가
 * 만드는 것과 같은 속성의 타일을 주입하고, toggleReportFeatureCard 는 호출 횟수를 세는
 * 스텁으로 대체한다(회귀는 "몇 번 불리는가"이지 토글 내부 구현이 아니다).
 */
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import WebSocket from "ws";

const root = process.cwd();
const staticRoot = root;
const chromePath = findChrome();
const server = await startStaticServer();
const tempProfilePrefix = path.join(os.tmpdir(), "code-destiny-rpt-preview-profile-");
const debugCdp = process.env.RPT_PREVIEW_CDP_DEBUG === "1";

const failures = [];
const passes = [];
let chrome;
let cdp;
let userDataDir;

const LOCK_KEY = "rpt_quantumCard";
const PER_USE_KEY = "rpt_destinyMeetingPlace";

try {
  const launched = await launchReadyChrome();
  chrome = launched.chrome;
  cdp = launched.cdp;
  userDataDir = launched.userDataDir;

  await send(cdp, "Runtime.enable");
  await send(cdp, "Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // ── 1) 잠금 타일 ────────────────────────────────────────────────────────────
  await resetPage();
  await installFixture({ lockKey: LOCK_KEY, lockCost: 100, unlocked: false });
  const lockedFirst = await clickTileAndRead();
  assert(lockedFirst.previewOpen, "잠금 타일 클릭 → 기능 상세 팝업이 뜬다", lockedFirst);
  assert(!lockedFirst.blockOpen, "잠금 타일 클릭 → 카드가 펼쳐지지 않는다", lockedFirst);
  assert(!lockedFirst.paidGateOpen, "잠금 타일 클릭 → 결제 게이트로 직행하지 않는다", lockedFirst);
  assert(lockedFirst.toggleCalls === 0, "잠금 타일 클릭 → 토글 0회", lockedFirst);

  const lockedCta = await clickCtaAndRead();
  assert(!lockedCta.previewOpen, "잠금 CTA → 팝업이 닫힌다", lockedCta);
  assert(lockedCta.paymentEntered, "잠금 CTA → 결제/권한 확인 경로로 진입한다", lockedCta);

  // ── 2) 해금 타일 ────────────────────────────────────────────────────────────
  await resetPage();
  await installFixture({ lockKey: LOCK_KEY, lockCost: 100, unlocked: true });
  const unlockedFirst = await clickTileAndRead();
  assert(unlockedFirst.previewOpen, "해금 타일 클릭 → 기능 상세 팝업이 뜬다", unlockedFirst);
  assert(
    !unlockedFirst.blockOpen && unlockedFirst.toggleCalls === 0,
    "해금 타일 클릭 → 카드가 팝업 뒤에서 펼쳐지지 않는다 (이중 처리 없음)",
    unlockedFirst,
  );
  assert(unlockedFirst.previewCtaLabel.indexOf("결과 보러가기") >= 0, "해금 팝업 CTA 문구가 '결과 보러가기'", unlockedFirst);

  const unlockedCta = await clickCtaAndRead();
  assert(!unlockedCta.previewOpen, "해금 CTA → 팝업이 닫힌다", unlockedCta);
  assert(unlockedCta.toggleCalls === 1, "해금 CTA → 토글이 정확히 1회 (열렸다 닫힘 회귀 없음)", unlockedCta);
  assert(unlockedCta.blockOpen, "해금 CTA → 카드가 열린 채 유지된다", unlockedCta);

  // 펼쳐진 카드의 재클릭('닫기') — 팝업이 또 뜨면 사용자는 카드를 영영 닫을 수 없다.
  // CTA 가 다는 data-pvw-cta-bypass 는 100ms 뒤 사라지므로, 여기서는 진짜 맨클릭 상태다.
  await delay(300);
  const unlockedSecond = await clickTileAndRead();
  assert(!unlockedSecond.previewOpen, "펼쳐진 카드 재클릭 → 상세 팝업이 다시 뜨지 않는다", unlockedSecond);
  assert(unlockedSecond.toggleCalls === 2, "펼쳐진 카드 재클릭 → 토글이 1회 더 (총 2회)", unlockedSecond);
  assert(!unlockedSecond.blockOpen, "펼쳐진 카드 재클릭 → 카드가 접힌다", unlockedSecond);

  // 접힌 뒤에는 원래 계약(팝업 먼저)으로 돌아와야 한다.
  await delay(300);
  const unlockedThird = await clickTileAndRead();
  assert(unlockedThird.previewOpen, "다시 접힌 카드 클릭 → 상세 팝업이 정상 복귀한다", unlockedThird);
  assert(unlockedThird.toggleCalls === 2, "다시 접힌 카드 클릭 → 토글은 늘지 않는다(팝업 우선 유지)", unlockedThird);

  // ── 3) 회당결제 타일 ────────────────────────────────────────────────────────
  await resetPage();
  await installFixture({ coinCost: 100, featureKey: PER_USE_KEY });
  const perUseFirst = await clickTileAndRead();
  assert(perUseFirst.previewOpen, "회당결제 타일 클릭 → 기능 상세 팝업이 뜬다", perUseFirst);
  assert(!perUseFirst.paidGateOpen, "회당결제 타일 클릭 → 결제 게이트로 직행하지 않는다", perUseFirst);

  const perUseCta = await clickCtaAndRead();
  assert(perUseCta.paymentEntered, "회당결제 CTA → 결제 경로로 진입한다", perUseCta);

  if (failures.length) {
    console.error("\n❌ 재미있는 사주 콘텐츠 팝업/결제 흐름 재현 실패\n");
    for (const failure of failures) {
      console.error(`- ${failure.name}\n  ${JSON.stringify(failure.details)}`);
    }
    process.exitCode = 1;
  } else {
    console.log("✅ 재미있는 사주 콘텐츠 팝업/결제 흐름 재현 통과");
    for (const name of passes) console.log(`- ${name}`);
  }
} finally {
  if (cdp) {
    try { await send(cdp, "Browser.close"); } catch {}
    try { cdp.close(); } catch {}
  }
  await closeQuietly(server.instance);
  if (chrome) {
    chrome.kill();
    await waitForProcessExit(chrome, 5000);
  }
  if (userDataDir) await removeTempDir(userDataDir);
}

// ── 시나리오 헬퍼 ────────────────────────────────────────────────────────────

async function resetPage() {
  await navigate(cdp, `http://127.0.0.1:${server.port}/index.html`);
  await delay(500);
}

/**
 * reportDashboard.js 가 생성하는 것과 같은 속성의 타일을 주입한다.
 * (실 대시보드는 사주 분석 완주 후에만 렌더되므로 홈 셸에는 존재하지 않는다.)
 */
async function installFixture({ lockKey = "", lockCost = 0, coinCost = 0, featureKey = "", unlocked = false }) {
  const expression = `(() => {
    document.querySelectorAll('#cdRptFixture').forEach(n => n.remove());
    const wrap = document.createElement('div');
    wrap.id = 'cdRptFixture';
    wrap.style.cssText = 'position:relative;z-index:1;padding:24px';
    const lockAttrs = ${JSON.stringify(lockKey)}
      ? ' data-tile-lock-key="' + ${JSON.stringify(lockKey)} + '" data-tile-lock-cost="' + ${lockCost} + '"'
      : '';
    const coinAttrs = ${coinCost} > 0
      ? ' data-coin-cost="' + ${coinCost} + '" data-feature-key="' + ${JSON.stringify(featureKey)} + '"'
      : '';
    wrap.innerHTML = ''
      + '<section class="rpt-v2-block" id="cdRptFixtureBlock">'
      + '  <div class="rpt-v2-head">'
      + '    <button class="rpt-v2-toggle-btn" id="cdRptFixtureBtn" type="button" data-action="toggleRptCard"'
      +        lockAttrs + coinAttrs + ' aria-expanded="false" data-label="열기">'
      + '      <span class="rpt-v2-toggle-label">열기</span>'
      + '      <span class="rpt-v2-toggle-arrow" aria-hidden="true">▼</span>'
      + '    </button>'
      + '  </div>'
      + '  <div class="rpt-v2-detail" aria-hidden="true"><div class="rpt-v2-detail-inner">본문</div></div>'
      + '</section>';
    document.body.insertBefore(wrap, document.body.firstChild);
    window.scrollTo(0, 0);

    // 해금 상태는 셸이 window 로 내보낸 실제 맵(참조 공유)을 직접 조작한다.
    try {
      if (window.unlockedFeatureMap) {
        if (${unlocked ? "true" : "false"}) window.unlockedFeatureMap[${JSON.stringify(lockKey)}] = true;
        else delete window.unlockedFeatureMap[${JSON.stringify(lockKey)}];
      }
    } catch (_) {}

    // 토글 호출 횟수만 센다 — 회귀는 '몇 번 불리는가'다.
    window.__cdRptToggleCalls = 0;
    window.toggleReportFeatureCard = function (btn) {
      window.__cdRptToggleCalls += 1;
      const block = btn && btn.closest ? btn.closest('.rpt-v2-block') : null;
      if (block) block.classList.toggle('open');
      // 실제 구현(reportDashboard.js)과 동일하게 열림 상태를 버튼에도 반영한다.
      if (btn && block) btn.setAttribute('aria-expanded', block.classList.contains('open') ? 'true' : 'false');
    };
    return {
      injected: !!document.getElementById('cdRptFixtureBtn'),
      unlockedSeen: typeof window.isTileKeyUnlocked === 'function'
        ? !!window.isTileKeyUnlocked(${JSON.stringify(lockKey)})
        : null
    };
  })()`;
  const state = await evaluate(cdp, expression, "install fixture");
  if (!state.injected) throw new Error("픽스처 타일 주입 실패");
  if (lockKey && state.unlockedSeen !== unlocked) {
    throw new Error(`해금 상태 시드 실패: 기대 ${unlocked}, 실제 ${state.unlockedSeen}`);
  }
}

async function clickTileAndRead() {
  await evaluate(
    cdp,
    "document.getElementById('cdRptFixtureBtn').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1})), true",
    "click fixture tile",
  );
  await delay(450);
  return readState();
}

async function clickCtaAndRead() {
  await evaluate(
    cdp,
    "document.getElementById('tilePvwCtaBtn').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1})), true",
    "click preview CTA",
  );
  await delay(700);
  return readState();
}

function readState() {
  return evaluate(cdp, `(() => {
    const overlay = document.getElementById('tilePvwOverlay');
    const gate = document.getElementById('cdPaidFeatureGate');
    const block = document.getElementById('cdRptFixtureBlock');
    const label = document.getElementById('tilePvwCtaBtnLabel');
    return {
      previewOpen: !!(overlay && overlay.classList.contains('pvw-open')),
      previewCtaLabel: (label && label.textContent || '').trim(),
      paidGateOpen: !!(gate && gate.classList.contains('is-open')),
      blockOpen: !!(block && block.classList.contains('open')),
      toggleCalls: Number(window.__cdRptToggleCalls || 0),
      pathname: location.pathname,
      paymentEntered: !!(gate && gate.classList.contains('is-open')) || location.pathname.indexOf('/login') === 0
    };
  })()`, "read state");
}

function assert(condition, name, details) {
  if (condition) passes.push(name);
  else failures.push({ name, details });
}

// ── CDP / 정적 서버 하네스 (verify-mobile-cdp-smoke.mjs 와 동일 패턴) ─────────

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
  if (!found) throw new Error("Chrome or Edge executable was not found.");
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
    instance.listen(0, "127.0.0.1", () => resolve({ instance, port: instance.address().port }));
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
  }[ext] || "application/octet-stream";
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const instance = http.createServer();
    instance.on("error", reject);
    instance.listen(0, "127.0.0.1", () => {
      const address = instance.address();
      const port = typeof address === "object" && address ? address.port : 0;
      instance.close(() => (port > 0 ? resolve(port) : reject(new Error("Failed to reserve a Chrome debug port."))));
    });
  });
}

async function launchReadyChrome() {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const debugPort = await getFreePort();
    const attemptUserDataDir = `${tempProfilePrefix}${Date.now()}-${attempt}`;
    const attemptChrome = spawn(chromePath, [
      "--headless=new",
      "--disable-gpu",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-extensions",
      "--disable-sync",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-debugging-address=127.0.0.1",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${attemptUserDataDir}`,
      "about:blank",
    ], { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
    let chromeStderr = "";
    attemptChrome.stderr?.on("data", (chunk) => {
      chromeStderr = `${chromeStderr}${chunk.toString("utf8")}`.slice(-800);
    });
    try {
      await delay(100);
      await waitForChrome(debugPort);
      await delay(500);
      const attemptCdp = await createReadyCdp(debugPort);
      return { chrome: attemptChrome, cdp: attemptCdp, userDataDir: attemptUserDataDir };
    } catch (error) {
      lastError = new Error(`${error.message}${chromeStderr.trim() ? `; stderr=${chromeStderr.trim()}` : ""}`);
      attemptChrome.kill();
      await waitForProcessExit(attemptChrome, 5000);
      await removeTempDir(attemptUserDataDir);
      await delay(1000 * attempt);
    }
  }
  throw new Error(`Failed to launch ready Chrome: ${lastError?.message || "unknown error"}`);
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

async function createReadyCdp(port) {
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    let attemptCdp;
    try {
      const page = await createCdpPage(port, "about:blank");
      attemptCdp = await connectCdp(page.webSocketDebuggerUrl);
      await send(attemptCdp, "Page.enable");
      return attemptCdp;
    } catch (error) {
      lastError = error;
      try { attemptCdp?.close(); } catch {}
      await delay(650 * attempt);
    }
  }
  throw new Error(`Failed to initialize Chrome CDP after retries: ${lastError?.message || "unknown error"}`);
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
    return response.data.find((target) => target.type === "page" && target.webSocketDebuggerUrl) || null;
  } catch {
    return null;
  }
}

function requestCdpJson(port, requestPath, options = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      { hostname: "127.0.0.1", port, path: requestPath, method: options.method || "GET", headers: { connection: "close" } },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => { body += chunk; });
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
      },
    );
    request.setTimeout(5000, () => request.destroy(new Error(`CDP HTTP timeout: ${requestPath}`)));
    request.on("error", reject);
    request.end();
  });
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
          if (debugCdp) console.log(`[cdp-send] ${messageId} ${method}`);
          try {
            ws.send(JSON.stringify({ id: messageId, method, params }));
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
            list.push({ resolve: (params) => { clearTimeout(timer); res(params); } });
            events.set(method, list);
          });
        },
        close() { ws.close(); },
      };
      setTimeout(() => resolve(client), 120);
    });
    ws.once("error", (error) => {
      if (!connected) reject(error);
      else rejectPending(pending, error);
    });
    ws.once("close", () => {
      const error = new Error("CDP WebSocket closed before command response.");
      if (!connected) reject(error);
      else rejectPending(pending, error);
    });
    ws.on("message", (data) => {
      let payload = data;
      if (typeof payload !== "string") {
        payload = Buffer.isBuffer(payload) ? payload.toString("utf8") : String(payload || "");
      }
      let message;
      try { message = JSON.parse(payload); } catch { return; }
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
  for (const [, entry] of pending) entry.reject(error);
  pending.clear();
}

function send(client, method, params) {
  return client.send(method, params);
}

async function navigate(client, url) {
  const loaded = client.waitForEvent("Page.loadEventFired", 20000);
  await send(client, "Page.navigate", { url });
  await loaded;
}

async function evaluate(client, expression, label = "Runtime.evaluate") {
  let result;
  try {
    result = await send(client, "Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  } catch (error) {
    throw new Error(`${label}: ${error.message}`);
  }
  if (result.exceptionDetails) {
    throw new Error(`${label}: ${result.exceptionDetails.text || "Runtime evaluation failed"}`);
  }
  return result.result.value;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function closeQuietly(instance) {
  return new Promise((resolve) => {
    if (!instance) { resolve(); return; }
    instance.close(() => resolve());
  });
}

function waitForProcessExit(child, timeoutMs) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null) { resolve(); return; }
    const timer = setTimeout(resolve, timeoutMs);
    child.once("exit", () => { clearTimeout(timer); resolve(); });
  });
}

async function removeTempDir(dir) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await fs.promises.rm(dir, { recursive: true, force: true });
      return;
    } catch {
      await delay(200);
    }
  }
}

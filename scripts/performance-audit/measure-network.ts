#!/usr/bin/env node
// @ts-nocheck
import type {} from "node:fs";
"use strict";

const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const ROOT = process.cwd();
const DEFAULT_BASE_URL = "https://code-destiny.com";
const DEFAULT_INVENTORY = path.join(ROOT, "docs", "performance-audit", "01-route-inventory.md");
const DEFAULT_OUT_DIR = path.join(ROOT, "docs", "performance-audit", "results");
const DEFAULT_MAX_WAIT_MS = 15000;
const DEFAULT_IDLE_MS = 900;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 CodeDestinyPerformanceAudit/1.0";
let progressLogPath = "";
let errorLogPath = "";

const VIEWPORTS = {
  mobile: { name: "mobile", width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  desktop: { name: "desktop", width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false },
};

function parseArgs(argv) {
  const args = {
    baseUrl: DEFAULT_BASE_URL,
    inventory: DEFAULT_INVENTORY,
    outDir: DEFAULT_OUT_DIR,
    mode: "top20",
    limit: 0,
    urls: [],
    viewports: ["mobile", "desktop"],
    runs: ["cold", "repeat"],
    maxWaitMs: DEFAULT_MAX_WAIT_MS,
    idleMs: DEFAULT_IDLE_MS,
    chromePath: "",
    headful: false,
    keepBrowser: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--base-url" && next) {
      args.baseUrl = next;
      i += 1;
    } else if (arg === "--inventory" && next) {
      args.inventory = path.resolve(next);
      i += 1;
    } else if (arg === "--out-dir" && next) {
      args.outDir = path.resolve(next);
      i += 1;
    } else if (arg === "--mode" && next) {
      args.mode = next;
      i += 1;
    } else if (arg === "--limit" && next) {
      args.limit = Math.max(0, Number.parseInt(next, 10) || 0);
      i += 1;
    } else if (arg === "--url" && next) {
      args.urls.push(next);
      i += 1;
    } else if (arg === "--urls" && next) {
      args.urls.push(...next.split(",").map((item) => item.trim()).filter(Boolean));
      i += 1;
    } else if (arg === "--viewports" && next) {
      args.viewports = next.split(",").map((item) => item.trim()).filter(Boolean);
      i += 1;
    } else if (arg === "--runs" && next) {
      args.runs = next.split(",").map((item) => item.trim()).filter(Boolean);
      i += 1;
    } else if (arg === "--max-wait-ms" && next) {
      args.maxWaitMs = Math.max(1000, Number.parseInt(next, 10) || DEFAULT_MAX_WAIT_MS);
      i += 1;
    } else if (arg === "--idle-ms" && next) {
      args.idleMs = Math.max(100, Number.parseInt(next, 10) || DEFAULT_IDLE_MS);
      i += 1;
    } else if (arg === "--chrome-path" && next) {
      args.chromePath = next;
      i += 1;
    } else if (arg === "--headful") {
      args.headful = true;
    } else if (arg === "--keep-browser") {
      args.keepBrowser = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  args.viewports = args.viewports.filter((name) => VIEWPORTS[name]);
  if (!args.viewports.length) args.viewports = ["mobile", "desktop"];
  args.runs = args.runs.filter((name) => name === "cold" || name === "repeat");
  if (!args.runs.length) args.runs = ["cold", "repeat"];
  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/performance-audit/measure-network.ts [options]

Options:
  --base-url <url>       Base URL. Default: ${DEFAULT_BASE_URL}
  --inventory <path>     Route inventory markdown.
  --out-dir <path>       Output directory. Default: docs/performance-audit/results
  --mode <top20|p0p1p2>  URL extraction mode. Default: top20
  --limit <n>            Limit URL count after extraction.
  --url <path>           Add one URL. Can be repeated.
  --urls <a,b,c>         Comma-separated URL list.
  --viewports <list>     mobile,desktop. Default: both.
  --runs <list>          cold,repeat. Default: both.
  --max-wait-ms <n>      Wait until network idle or this timeout. Default: 15000.
  --idle-ms <n>          Network idle window. Default: 900.
  --chrome-path <path>   Chrome or Edge executable.
  --headful              Run visible Chrome.
`);
}

function readInventoryUrls(options) {
  if (options.urls.length) return unique(options.urls.map(normalizePathOrUrl));
  const source = fs.readFileSync(options.inventory, "utf8");
  const urls = [];

  if (options.mode === "p0p1p2") {
    const lines = source.split(/\r?\n/);
    for (const line of lines) {
      if (!line.startsWith("|")) continue;
      if (!/\|\s*P[012]\s*\|/.test(line)) continue;
      const cols = splitMarkdownRow(line);
      const rawUrl = stripBackticks(cols[1] || "");
      if (rawUrl && rawUrl.startsWith("/")) urls.push(rawUrl);
    }
  } else {
    const section = extractTop20Section(source);
    for (const line of section) {
      const match = line.match(/^\s*\d+\.\s+`([^`]+)`/);
      if (match) urls.push(match[1]);
    }
  }

  const resolved = unique(urls.map(normalizePathOrUrl));
  return options.limit > 0 ? resolved.slice(0, options.limit) : resolved;
}

function extractTop20Section(source) {
  const lines = source.split(/\r?\n/);
  const section = [];
  let inSection = false;

  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      inSection = /\bTop\s*20\b/i.test(line) && /\bURL\b/i.test(line);
      continue;
    }
    if (inSection) section.push(line);
  }

  if (section.length) return section;
  return lines.filter((line) => /^\s*\d+\.\s+`[^`]+`/.test(line)).slice(0, 20);
}

function splitMarkdownRow(line) {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((part) => part.trim());
}

function stripBackticks(value) {
  return String(value || "").replace(/^`|`$/g, "").trim();
}

function normalizePathOrUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function buildAbsoluteUrl(baseUrl, item) {
  if (/^https?:\/\//i.test(item)) return item;
  return new URL(item, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

function findChromeExecutable(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.CHROME_PATH,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    path.join(process.env.PROGRAMFILES || "", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] || "", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env.PROGRAMFILES || "", "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] || "", "Microsoft", "Edge", "Application", "msedge.exe"),
    "google-chrome",
    "chromium",
    "chromium-browser",
    "msedge",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate.includes(path.sep) && fs.existsSync(candidate)) return candidate;
    if (!candidate.includes(path.sep)) return candidate;
  }
  throw new Error("Chrome executable was not found. Pass --chrome-path.");
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = address && typeof address === "object" ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function configureRunLogs(outDir) {
  progressLogPath = path.join(outDir, "network-measurement.log");
  errorLogPath = path.join(outDir, "network-measurement.err.log");
  fs.writeFileSync(progressLogPath, "", "utf8");
  fs.writeFileSync(errorLogPath, "", "utf8");
}

function log(message) {
  writeLine(1, progressLogPath, message);
}

function warn(message) {
  writeLine(2, errorLogPath, message);
}

function writeLine(fd, filePath, message) {
  const line = `${message}\n`;
  try {
    fs.writeSync(fd, line);
  } catch (_error) {
  }
  if (filePath) fs.appendFileSync(filePath, line, "utf8");
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(2500, () => {
      req.destroy(new Error(`Timeout fetching ${url}`));
    });
  });
}

async function waitForChrome(port) {
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < 60000) {
    try {
      const json = await fetchJson(endpoint);
      if (json.webSocketDebuggerUrl) return json.webSocketDebuggerUrl;
    } catch (error) {
      lastError = error;
    }
    await sleep(200);
  }
  throw lastError || new Error("Chrome DevTools endpoint did not become ready.");
}

async function startChrome(options) {
  const port = await getFreePort();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "cd-network-audit-"));
  const chromePath = findChromeExecutable(options.chromePath);
  const chromeArgs = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-domain-reliability",
    "--disable-extensions",
    "--disable-sync",
    "--disable-notifications",
    "--disable-popup-blocking",
    "--mute-audio",
    "--autoplay-policy=document-user-activation-required",
    "about:blank",
  ];
  if (!options.headful) chromeArgs.unshift("--headless=new");

  const child = spawn(chromePath, chromeArgs, {
    stdio: ["ignore", "ignore", "ignore"],
    windowsHide: true,
  });
  child.unref();
  const wsUrl = await waitForChrome(port);
  return { child, wsUrl, userDataDir };
}

async function stopChrome(chrome, options) {
  if (options.keepBrowser) return;

  if (process.platform === "win32") {
    killWindowsBrowserProcesses(chrome);
  } else if (chrome.child && chrome.child.pid) {
    if (!chrome.child.killed) {
      chrome.child.kill();
    }
  }

  await sleep(500);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      fs.rmSync(chrome.userDataDir, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 2) return;
      await sleep(500);
    }
  }
}

function killWindowsBrowserProcesses(chrome) {
  if (chrome.child && chrome.child.pid) {
    spawnSync("taskkill", ["/PID", String(chrome.child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
      timeout: 5000,
    });
  }

  const pattern = `*${chrome.userDataDir}*`;
  const escapedPattern = pattern.replace(/'/g, "''");
  const command = [
    `$pattern = '${escapedPattern}'`,
    "Get-CimInstance Win32_Process -Filter \"name='chrome.exe'\" | Where-Object { $_.CommandLine -like $pattern } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
    "Get-CimInstance Win32_Process -Filter \"name='msedge.exe'\" | Where-Object { $_.CommandLine -like $pattern } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
  ].join("; ");

  spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], {
    stdio: "ignore",
    windowsHide: true,
    timeout: 7000,
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
    this.ws = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      this.ws = ws;
      ws.addEventListener("open", () => resolve());
      ws.addEventListener("error", (event) => reject(event.error || new Error("WebSocket error")));
      ws.addEventListener("message", (event) => this.handleMessage(event.data));
      ws.addEventListener("close", () => {
        for (const item of this.pending.values()) {
          clearTimeout(item.timer);
          item.reject(new Error("CDP connection closed"));
        }
        this.pending.clear();
      });
    });
  }

  handleMessage(data) {
    const message = JSON.parse(String(data));
    if (message.id && this.pending.has(message.id)) {
      const item = this.pending.get(message.id);
      this.pending.delete(message.id);
      clearTimeout(item.timer);
      if (message.error) item.reject(new Error(`${item.method}: ${message.error.message || JSON.stringify(message.error)}`));
      else item.resolve(message.result || {});
      return;
    }

    if (message.method) {
      const list = this.handlers.get(message.method) || [];
      for (const handler of list) handler(message.params || {}, message.sessionId || "");
    }
  }

  on(method, handler) {
    const list = this.handlers.get(method) || [];
    list.push(handler);
    this.handlers.set(method, list);
  }

  send(method, params = {}, sessionId = "", timeoutMs = 20000) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, method, timer });
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

function createCapture(pageUrl, viewport, runLabel) {
  return {
    pageUrl,
    viewport,
    runLabel,
    startedAt: Date.now(),
    loadedAt: 0,
    lastActivityAt: Date.now(),
    mainRequestId: "",
    inflight: new Set(),
    requests: new Map(),
  };
}

function attachCaptureHandlers(client, getCapture, sessionId) {
  client.on("Network.requestWillBeSent", (params, eventSessionId) => {
    if (eventSessionId !== sessionId) return;
    const capture = getCapture();
    if (!capture) return;
    const requestId = params.requestId;
    const url = params.request && params.request.url ? params.request.url : "";
    if (!url || /^data:/i.test(url)) return;
    const record = capture.requests.get(requestId) || {};
    record.requestId = requestId;
    record.url = url;
    record.method = params.request.method || "";
    record.resourceType = params.type || record.resourceType || "Other";
    record.initiator = summarizeInitiator(params.initiator);
    record.requestTimestamp = params.timestamp || 0;
    record.wallTime = params.wallTime || 0;
    record.redirected = Boolean(params.redirectResponse);
    capture.requests.set(requestId, record);
    capture.inflight.add(requestId);
    capture.lastActivityAt = Date.now();
    if (params.type === "Document" && !capture.mainRequestId) capture.mainRequestId = requestId;
  });

  client.on("Network.responseReceived", (params, eventSessionId) => {
    if (eventSessionId !== sessionId) return;
    const capture = getCapture();
    if (!capture) return;
    const record = capture.requests.get(params.requestId) || { requestId: params.requestId };
    const response = params.response || {};
    record.url = response.url || record.url || "";
    record.resourceType = params.type || record.resourceType || "Other";
    record.mimeType = response.mimeType || "";
    record.status = response.status || 0;
    record.statusText = response.statusText || "";
    record.protocol = response.protocol || "";
    record.headers = response.headers || {};
    record.remoteIPAddress = response.remoteIPAddress || "";
    record.fromDiskCache = Boolean(response.fromDiskCache);
    record.fromPrefetchCache = Boolean(response.fromPrefetchCache);
    record.fromServiceWorker = Boolean(response.fromServiceWorker);
    record.responseEncodedDataLength = Number(response.encodedDataLength || 0);
    capture.requests.set(params.requestId, record);
    capture.lastActivityAt = Date.now();
  });

  client.on("Network.loadingFinished", (params, eventSessionId) => {
    if (eventSessionId !== sessionId) return;
    const capture = getCapture();
    if (!capture) return;
    const record = capture.requests.get(params.requestId) || { requestId: params.requestId };
    record.finished = true;
    record.loadingFailed = false;
    record.transferredSize = Number(params.encodedDataLength || record.responseEncodedDataLength || 0);
    capture.requests.set(params.requestId, record);
    capture.inflight.delete(params.requestId);
    capture.lastActivityAt = Date.now();
  });

  client.on("Network.loadingFailed", (params, eventSessionId) => {
    if (eventSessionId !== sessionId) return;
    const capture = getCapture();
    if (!capture) return;
    const record = capture.requests.get(params.requestId) || { requestId: params.requestId };
    record.finished = true;
    record.loadingFailed = true;
    record.errorText = params.errorText || "";
    record.blockedReason = params.blockedReason || "";
    record.resourceType = params.type || record.resourceType || "Other";
    capture.requests.set(params.requestId, record);
    capture.inflight.delete(params.requestId);
    capture.lastActivityAt = Date.now();
  });

  client.on("Page.loadEventFired", (_params, eventSessionId) => {
    if (eventSessionId !== sessionId) return;
    const capture = getCapture();
    if (!capture) return;
    capture.loadedAt = Date.now();
    capture.lastActivityAt = Date.now();
  });
}

function summarizeInitiator(initiator) {
  if (!initiator) return "";
  const pieces = [initiator.type || ""].filter(Boolean);
  const stack = initiator.stack || initiator.asyncStackTrace;
  const callFrames = stack && Array.isArray(stack.callFrames) ? stack.callFrames : [];
  const frame = callFrames.find((item) => item && item.url) || callFrames[0];
  if (frame) {
    const url = frame.url || "";
    const file = url ? safeFileNameFromUrl(url) : "";
    const line = Number.isFinite(frame.lineNumber) ? frame.lineNumber + 1 : "";
    pieces.push(`${file}${line ? `:${line}` : ""}`);
  }
  if (initiator.url) pieces.push(safeFileNameFromUrl(initiator.url));
  return pieces.join(" ");
}

async function createPageSession(client, viewport) {
  const target = await client.send("Target.createTarget", { url: "about:blank" });
  const targetId = target.targetId;
  const attached = await client.send("Target.attachToTarget", { targetId, flatten: true });
  const sessionId = attached.sessionId;

  await client.send("Page.enable", {}, sessionId, 45000);
  await client.send("Runtime.enable", {}, sessionId, 45000);
  await client.send("Network.enable", { maxTotalBufferSize: 100000000, maxResourceBufferSize: 50000000 }, sessionId, 45000);
  await client.send("Network.setCacheDisabled", { cacheDisabled: true }, sessionId);
  await client.send("Network.setBypassServiceWorker", { bypass: true }, sessionId).catch(() => {});
  await client.send("Network.setUserAgentOverride", { userAgent: USER_AGENT }, sessionId);
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.deviceScaleFactor,
    mobile: viewport.mobile,
  }, sessionId);
  return { targetId, sessionId };
}

async function closePageSession(client, targetId, sessionId) {
  await client.send("Target.detachFromTarget", { sessionId }).catch(() => {});
  await client.send("Target.closeTarget", { targetId }).catch(() => {});
}

async function measureOnePage(client, absoluteUrl, displayUrl, viewport, options) {
  const { targetId, sessionId } = await createPageSession(client, viewport);
  let currentCapture = null;
  const captures = [];
  attachCaptureHandlers(client, () => currentCapture, sessionId);

  try {
    for (const runLabel of options.runs) {
      currentCapture = createCapture(displayUrl, viewport.name, runLabel);
      await client.send("Network.clearBrowserCache", {}, sessionId).catch(() => {});
      await client.send("Network.clearBrowserCookies", {}, sessionId).catch(() => {});
      await client.send("Page.navigate", { url: absoluteUrl }, sessionId, 45000);
      await waitForNetworkSettled(currentCapture, options);
      await client.send("Page.stopLoading", {}, sessionId).catch(() => {});
      const perfEntries = await getPerformanceEntries(client, sessionId);
      captures.push(finalizeCapture(currentCapture, perfEntries));
      currentCapture = null;
      await sleep(350);
    }
  } finally {
    currentCapture = null;
    await closePageSession(client, targetId, sessionId);
  }

  return captures;
}

async function waitForNetworkSettled(capture, options) {
  const deadline = Date.now() + options.maxWaitMs;
  while (Date.now() < deadline) {
    const idleFor = Date.now() - capture.lastActivityAt;
    const loadEnough = capture.loadedAt > 0 || Date.now() - capture.startedAt > 2500;
    if (loadEnough && capture.inflight.size === 0 && idleFor >= options.idleMs) break;
    await sleep(120);
  }
}

async function getPerformanceEntries(client, sessionId) {
  const expression = `JSON.stringify({
    navigation: performance.getEntriesByType("navigation").map((e) => ({
      name: e.name, transferSize: e.transferSize || 0, encodedBodySize: e.encodedBodySize || 0, decodedBodySize: e.decodedBodySize || 0
    })),
    resources: performance.getEntriesByType("resource").map((e) => ({
      name: e.name, initiatorType: e.initiatorType || "", transferSize: e.transferSize || 0, encodedBodySize: e.encodedBodySize || 0, decodedBodySize: e.decodedBodySize || 0
    }))
  })`;
  try {
    const result = await client.send("Runtime.evaluate", { expression, returnByValue: true }, sessionId);
    return JSON.parse(result.result.value || "{}");
  } catch (_error) {
    return { navigation: [], resources: [] };
  }
}

function finalizeCapture(capture, perfEntries) {
  const perfByUrl = new Map();
  for (const entry of [...(perfEntries.navigation || []), ...(perfEntries.resources || [])]) {
    if (!entry || !entry.name) continue;
    if (!perfByUrl.has(entry.name)) perfByUrl.set(entry.name, entry);
  }

  const requests = Array.from(capture.requests.values())
    .filter((request) => request.url && /^https?:\/\//i.test(request.url))
    .map((request) => normalizeRequestRecord(capture, request, perfByUrl.get(request.url)));

  const mainRequest = requests.find((request) => request.requestId === capture.mainRequestId)
    || requests.find((request) => request.resourceType === "document")
    || null;

  const summary = summarizeRequests(capture, requests, mainRequest);
  return { summary, requests };
}

function normalizeRequestRecord(capture, request, perfEntry) {
  const urlObject = safeUrl(request.url);
  const headers = request.headers || {};
  const contentLength = Number(headers["content-length"] || headers["Content-Length"] || 0) || 0;
  const transferredSize = Math.max(
    0,
    Number(request.transferredSize || 0),
    Number(request.responseEncodedDataLength || 0),
    Number(perfEntry && perfEntry.transferSize ? perfEntry.transferSize : 0),
  );
  const encodedBodySize = Math.max(
    0,
    Number(perfEntry && perfEntry.encodedBodySize ? perfEntry.encodedBodySize : 0),
    contentLength,
    transferredSize,
  );
  const resourceType = normalizeResourceType(request.resourceType, request.mimeType, request.url);
  const extension = getExtension(urlObject.pathname);
  const fileName = safeFileNameFromUrl(request.url);
  const cached = Boolean(
    request.fromDiskCache
    || request.fromPrefetchCache
    || request.fromServiceWorker
    || (perfEntry && perfEntry.transferSize === 0 && perfEntry.encodedBodySize > 0)
  );

  return {
    pageUrl: capture.pageUrl,
    viewport: capture.viewport,
    run: capture.runLabel,
    requestId: request.requestId || "",
    requestUrl: request.url,
    path: urlObject.pathname + urlObject.search,
    host: urlObject.host,
    resourceType,
    mimeType: request.mimeType || "",
    status: request.status || 0,
    statusText: request.statusText || "",
    transferredSize,
    encodedBodySize,
    cached,
    initiator: request.initiator || "",
    extension,
    fileName,
    failed: Boolean(request.loadingFailed),
    errorText: request.errorText || "",
    blockedReason: request.blockedReason || "",
    category: categorizeRequest(resourceType, request.mimeType || "", request.url),
  };
}

function normalizeResourceType(resourceType, mimeType, url) {
  const lowerMime = String(mimeType || "").toLowerCase();
  const ext = getExtension(safeUrl(url).pathname);
  const raw = String(resourceType || "Other").toLowerCase();
  if (raw === "document") return "document";
  if (raw === "stylesheet") return "stylesheet";
  if (raw === "script") return "script";
  if (raw === "image") return "image";
  if (raw === "font") return "font";
  if (raw === "xhr") return "xhr";
  if (raw === "fetch") return "fetch";
  if (raw === "media") return "media";
  if (lowerMime.includes("text/css")) return "stylesheet";
  if (lowerMime.includes("javascript") || [".js", ".mjs"].includes(ext)) return "script";
  if (lowerMime.startsWith("image/")) return "image";
  if (lowerMime.startsWith("font/") || [".woff", ".woff2", ".ttf", ".otf"].includes(ext)) return "font";
  if (lowerMime.startsWith("audio/") || lowerMime.startsWith("video/") || [".mp3", ".wav", ".m4a", ".ogg", ".mp4", ".webm"].includes(ext)) return "media";
  return raw || "other";
}

function categorizeRequest(resourceType, mimeType, url) {
  const type = normalizeResourceType(resourceType, mimeType, url);
  const lowerMime = String(mimeType || "").toLowerCase();
  if (type === "document" || lowerMime.includes("text/html")) return "document";
  if (type === "image") return "image";
  if (type === "script") return "js";
  if (type === "stylesheet") return "css";
  if (type === "font") return "font";
  if (type === "media") return "audioVideo";
  if (type === "xhr" || type === "fetch") return "fetchXhr";
  return "other";
}

function summarizeRequests(capture, requests, mainRequest) {
  const totals = {
    document: 0,
    image: 0,
    js: 0,
    css: 0,
    font: 0,
    audioVideo: 0,
    fetchXhr: 0,
    other: 0,
  };

  for (const request of requests) {
    totals[request.category] = (totals[request.category] || 0) + request.transferredSize;
  }

  const totalTransferred = requests.reduce((sum, request) => sum + request.transferredSize, 0);
  const audioRequests = requests.filter(isAudioVideoRequest);
  const spriteRequests = requests.filter(isSpriteRequest);
  const r2Requests = requests.filter(isR2Request);
  const imageRequests = requests.filter((request) => request.category === "image");
  const tarotAlbumImages = imageRequests.filter(isTarotOrAlbumImage);
  const apiRepeats = repeatedApiCalls(requests);
  const errorRequests = requests.filter((request) => request.failed || request.status >= 400);
  const largest = [...requests].sort((a, b) => b.transferredSize - a.transferredSize).slice(0, 20);
  const largestRequest = largest[0] || null;
  const judgement = judgeSummary(totalTransferred, audioRequests, spriteRequests, tarotAlbumImages, imageRequests, totals.js, apiRepeats);

  return {
    pageUrl: capture.pageUrl,
    viewport: capture.viewport,
    run: capture.runLabel,
    measuredAt: new Date().toISOString(),
    status: mainRequest ? mainRequest.status : 0,
    totalRequests: requests.length,
    totalTransferred,
    documentTransferred: totals.document,
    imageTransferred: totals.image,
    jsTransferred: totals.js,
    cssTransferred: totals.css,
    fontTransferred: totals.font,
    audioVideoTransferred: totals.audioVideo,
    fetchXhrTransferred: totals.fetchXhr,
    otherTransferred: totals.other,
    largestRequestUrl: largestRequest ? largestRequest.requestUrl : "",
    largestRequestSize: largestRequest ? largestRequest.transferredSize : 0,
    largestTop20: largest.map((request) => `${formatBytes(request.transferredSize)} ${request.requestUrl}`).join(" | "),
    autoAudioRequests: audioRequests.map((request) => request.requestUrl),
    spriteSheetRequests: spriteRequests.map((request) => request.requestUrl),
    r2Requests: r2Requests.map((request) => request.requestUrl),
    repeatedApiCalls: apiRepeats,
    errorRequests: errorRequests.map((request) => `${request.status || request.errorText} ${request.requestUrl}`),
    suspectedCause: judgement.cause,
    priority: judgement.priority,
    imageRequestCount: imageRequests.length,
    tarotAlbumImageCount: tarotAlbumImages.length,
    jsRequestCount: requests.filter((request) => request.category === "js").length,
    fetchXhrRequestCount: requests.filter((request) => request.category === "fetchXhr").length,
  };
}

function judgeSummary(totalTransferred, audioRequests, spriteRequests, tarotAlbumImages, imageRequests, jsBytes, apiRepeats) {
  const causes = [];
  let score = 0;
  if (totalTransferred >= 20 * 1024 * 1024) {
    causes.push("initial load >= 20MB");
    score = Math.max(score, 3);
  } else if (totalTransferred >= 10 * 1024 * 1024) {
    causes.push("initial load >= 10MB");
    score = Math.max(score, 2);
  } else if (totalTransferred >= 5 * 1024 * 1024) {
    causes.push("initial load >= 5MB");
    score = Math.max(score, 1);
  }
  if (audioRequests.length) {
    causes.push("audio/mp3 requested before click");
    score = Math.max(score, 3);
  }
  if (tarotAlbumImages.length >= 20) {
    causes.push("tarot/card/album images >= 20");
    score = Math.max(score, 2);
  } else if (imageRequests.length >= 30) {
    causes.push("image requests >= 30");
    score = Math.max(score, 2);
  }
  if (spriteRequests.length) {
    causes.push("sprite/sheet requested on entry");
    score = Math.max(score, 2);
  }
  if (jsBytes >= 3 * 1024 * 1024) {
    causes.push("JS transferred >= 3MB");
    score = Math.max(score, 2);
  } else if (jsBytes >= 1.5 * 1024 * 1024) {
    causes.push("JS transferred >= 1.5MB");
    score = Math.max(score, 1);
  }
  if (apiRepeats.length) {
    causes.push("same API called >= 3 times");
    score = Math.max(score, 2);
  }
  return {
    priority: score >= 3 ? "very-high" : score === 2 ? "high" : score === 1 ? "watch" : "normal",
    cause: causes.join("; ") || "none",
  };
}

function repeatedApiCalls(requests) {
  const counts = new Map();
  for (const request of requests) {
    if (!request.path.startsWith("/api/")) continue;
    const key = request.path.split("?")[0];
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count >= 3)
    .map(([apiPath, count]) => `${apiPath} x${count}`);
}

function isAudioVideoRequest(request) {
  return request.category === "audioVideo"
    || /\.(mp3|wav|m4a|ogg|mp4|webm)(\?|$)/i.test(request.requestUrl)
    || /^audio\//i.test(request.mimeType)
    || /^video\//i.test(request.mimeType);
}

function isSpriteRequest(request) {
  const value = `${request.requestUrl} ${request.fileName}`.toLowerCase();
  return value.includes("sprite") || value.includes("sprites") || value.includes("sheet") || value.includes("atlas");
}

function isR2Request(request) {
  const value = request.requestUrl.toLowerCase();
  return value.includes("assets.code-destiny.com")
    || value.includes("music.code-destiny.com")
    || value.includes("codedestinyassets")
    || value.includes("codedestinymusic")
    || value.includes("r2.cloudflarestorage.com")
    || value.includes(".r2.");
}

function isTarotOrAlbumImage(request) {
  if (request.category !== "image") return false;
  const value = request.requestUrl.toLowerCase();
  return value.includes("tarot")
    || value.includes("taro")
    || value.includes("card")
    || value.includes("album")
    || value.includes("caretaro")
    || value.includes("tarot-cards");
}

function safeUrl(value) {
  try {
    return new URL(value);
  } catch (_error) {
    return new URL("http://invalid.local/");
  }
}

function getExtension(pathname) {
  const clean = String(pathname || "").split("/").pop() || "";
  const ext = path.extname(clean).toLowerCase();
  return ext || "";
}

function safeFileNameFromUrl(value) {
  try {
    const url = new URL(value);
    const file = decodeURIComponent((url.pathname.split("/").pop() || "").trim());
    return file || url.hostname;
  } catch (_error) {
    return "";
  }
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function csvEscape(value) {
  const raw = Array.isArray(value) ? value.join(" | ") : String(value == null ? "" : value);
  if (/[",\r\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.map((col) => csvEscape(col.header)).join(",")];
  for (const row of rows) {
    lines.push(columns.map((col) => csvEscape(col.value(row))).join(","));
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function summaryCsvColumns() {
  return [
    { header: "pageUrl", value: (row) => row.pageUrl },
    { header: "viewport", value: (row) => row.viewport },
    { header: "run", value: (row) => row.run },
    { header: "status", value: (row) => row.status },
    { header: "totalRequests", value: (row) => row.totalRequests },
    { header: "totalTransferredBytes", value: (row) => row.totalTransferred },
    { header: "totalTransferred", value: (row) => formatBytes(row.totalTransferred) },
    { header: "documentBytes", value: (row) => row.documentTransferred },
    { header: "imageBytes", value: (row) => row.imageTransferred },
    { header: "jsBytes", value: (row) => row.jsTransferred },
    { header: "cssBytes", value: (row) => row.cssTransferred },
    { header: "fontBytes", value: (row) => row.fontTransferred },
    { header: "audioVideoBytes", value: (row) => row.audioVideoTransferred },
    { header: "fetchXhrBytes", value: (row) => row.fetchXhrTransferred },
    { header: "largestRequestUrl", value: (row) => row.largestRequestUrl },
    { header: "largestRequestBytes", value: (row) => row.largestRequestSize },
    { header: "largestTop20", value: (row) => row.largestTop20 },
    { header: "autoAudioRequests", value: (row) => row.autoAudioRequests },
    { header: "spriteSheetRequests", value: (row) => row.spriteSheetRequests },
    { header: "r2Requests", value: (row) => row.r2Requests },
    { header: "repeatedApiCalls", value: (row) => row.repeatedApiCalls },
    { header: "errorRequests", value: (row) => row.errorRequests },
    { header: "imageRequestCount", value: (row) => row.imageRequestCount },
    { header: "tarotAlbumImageCount", value: (row) => row.tarotAlbumImageCount },
    { header: "jsRequestCount", value: (row) => row.jsRequestCount },
    { header: "fetchXhrRequestCount", value: (row) => row.fetchXhrRequestCount },
    { header: "suspectedCause", value: (row) => row.suspectedCause },
    { header: "priority", value: (row) => row.priority },
    { header: "measuredAt", value: (row) => row.measuredAt },
  ];
}

function requestCsvColumns() {
  return [
    { header: "pageUrl", value: (row) => row.pageUrl },
    { header: "viewport", value: (row) => row.viewport },
    { header: "run", value: (row) => row.run },
    { header: "requestUrl", value: (row) => row.requestUrl },
    { header: "path", value: (row) => row.path },
    { header: "resourceType", value: (row) => row.resourceType },
    { header: "mimeType", value: (row) => row.mimeType },
    { header: "status", value: (row) => row.status || row.errorText },
    { header: "transferredSizeBytes", value: (row) => row.transferredSize },
    { header: "transferredSize", value: (row) => formatBytes(row.transferredSize) },
    { header: "encodedBodySizeBytes", value: (row) => row.encodedBodySize },
    { header: "cache", value: (row) => row.cached ? "yes" : "no" },
    { header: "initiator", value: (row) => row.initiator },
    { header: "extension", value: (row) => row.extension },
    { header: "fileName", value: (row) => row.fileName },
    { header: "componentTraceNeeded", value: (row) => needsComponentTrace(row) ? "yes" : "no" },
  ];
}

function needsComponentTrace(row) {
  return row.transferredSize >= 1024 * 1024
    || isAudioVideoRequest(row)
    || isSpriteRequest(row)
    || (row.category === "js" && row.transferredSize >= 512 * 1024)
    || (row.category === "image" && row.transferredSize >= 512 * 1024)
    || row.path.startsWith("/api/");
}

function worstSummaryRows(summaryRows) {
  const map = new Map();
  for (const row of summaryRows) {
    const key = `${row.pageUrl} ${row.viewport}`;
    const prev = map.get(key);
    if (!prev || row.totalTransferred > prev.totalTransferred) map.set(key, row);
  }
  return Array.from(map.values()).sort((a, b) => b.totalTransferred - a.totalTransferred);
}

function renderMarkdown(summaryRows, heavyRows) {
  const worstRows = worstSummaryRows(summaryRows);
  const lines = [];
  lines.push("# Network measurement summary");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("| URL | viewport | total transferred | requests | image | js | audio | fetch/xhr | 가장 큰 파일 | 의심 원인 | 우선순위 |");
  lines.push("|---|---|---:|---:|---:|---:|---:|---:|---|---|---|");
  for (const row of worstRows) {
    lines.push([
      row.pageUrl,
      row.viewport,
      formatBytes(row.totalTransferred),
      row.totalRequests,
      formatBytes(row.imageTransferred),
      formatBytes(row.jsTransferred),
      formatBytes(row.audioVideoTransferred),
      formatBytes(row.fetchXhrTransferred),
      row.largestRequestUrl ? `${safeFileNameFromUrl(row.largestRequestUrl)} (${formatBytes(row.largestRequestSize)})` : "",
      row.suspectedCause,
      row.priority,
    ].map((value) => `| ${escapeMarkdownCell(value)} `).join("") + "|");
  }

  lines.push("");
  appendTopList(lines, "가장 무거운 URL Top 20", worstRows.slice(0, 20).map((row) => `${row.pageUrl} ${row.viewport} ${formatBytes(row.totalTransferred)} (${row.priority})`));
  appendTopList(lines, "가장 무거운 파일 Top 20", heavyRows.slice(0, 20).map((row) => `${formatBytes(row.transferredSize)} ${row.requestUrl} <- ${row.pageUrl} ${row.viewport}/${row.run}`));
  appendTopList(lines, "자동 로딩 mp3/audio", unique(summaryRows.flatMap((row) => row.autoAudioRequests)).map((url) => url));
  appendTopList(lines, "자동 로딩 sprite sheet", unique(summaryRows.flatMap((row) => row.spriteSheetRequests)).map((url) => url));
  appendTopList(lines, "이미지 과다 로딩 페이지", worstRows.filter((row) => row.imageRequestCount >= 30 || row.tarotAlbumImageCount >= 20).map((row) => `${row.pageUrl} ${row.viewport}: images ${row.imageRequestCount}, tarot/card/album ${row.tarotAlbumImageCount}`));
  appendTopList(lines, "JS 번들이 큰 페이지", worstRows.filter((row) => row.jsTransferred >= 1.5 * 1024 * 1024).map((row) => `${row.pageUrl} ${row.viewport}: ${formatBytes(row.jsTransferred)}`));
  appendTopList(lines, "Fetch/XHR 반복 호출 의심", worstRows.filter((row) => row.repeatedApiCalls.length).map((row) => `${row.pageUrl} ${row.viewport}: ${row.repeatedApiCalls.join(", ")}`));

  const traceTargets = heavyRows
    .filter(needsComponentTrace)
    .slice(0, 50)
    .map((row) => `${row.pageUrl} -> ${row.fileName || row.path} (${row.resourceType}, ${formatBytes(row.transferredSize)}, initiator: ${row.initiator || "unknown"})`);
  appendTopList(lines, "다음 코드 추적 후보", traceTargets);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function appendTopList(lines, title, items) {
  lines.push(`## ${title}`);
  lines.push("");
  if (!items.length) {
    lines.push("- none");
    lines.push("");
    return;
  }
  items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item}`);
  });
  lines.push("");
}

function escapeMarkdownCell(value) {
  return String(value == null ? "" : value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

async function openMeasurementBrowser(options) {
  const chrome = await startChrome(options);
  const client = new CdpClient(chrome.wsUrl);
  await client.connect();
  return { chrome, client };
}

async function closeMeasurementBrowser(browser, options) {
  if (!browser) return;
  browser.client.close();
  await stopChrome(browser.chrome, options);
}

async function restartMeasurementBrowser(browser, options) {
  await closeMeasurementBrowser(browser, options);
  return openMeasurementBrowser(options);
}

async function main() {
  const options = parseArgs(process.argv);
  const urls = readInventoryUrls(options);
  if (!urls.length) throw new Error("No URLs to measure.");
  fs.mkdirSync(options.outDir, { recursive: true });
  configureRunLogs(options.outDir);

  log(`[measure-network] base=${options.baseUrl}`);
  log(`[measure-network] urls=${urls.length}, viewports=${options.viewports.join(",")}, runs=${options.runs.join(",")}`);

  let browser = await openMeasurementBrowser(options);
  const summaryRows = [];
  const requestRows = [];

  try {
    for (const viewportName of options.viewports) {
      const viewport = VIEWPORTS[viewportName];
      for (const displayUrl of urls) {
        const absoluteUrl = buildAbsoluteUrl(options.baseUrl, displayUrl);
        log(`[measure-network] ${viewport.name} ${displayUrl}`);
        try {
          const captures = await measureOnePage(browser.client, absoluteUrl, displayUrl, viewport, options);
          for (const capture of captures) {
            summaryRows.push(capture.summary);
            requestRows.push(...capture.requests);
            log(`  ${capture.summary.run}: ${formatBytes(capture.summary.totalTransferred)} ${capture.summary.totalRequests} requests ${capture.summary.priority}`);
          }
        } catch (error) {
          warn(`[measure-network] failed ${viewport.name} ${displayUrl}: ${error.message}`);
          summaryRows.push({
            pageUrl: displayUrl,
            viewport: viewport.name,
            run: "error",
            measuredAt: new Date().toISOString(),
            status: "MEASURE_FAILED",
            totalRequests: 0,
            totalTransferred: 0,
            documentTransferred: 0,
            imageTransferred: 0,
            jsTransferred: 0,
            cssTransferred: 0,
            fontTransferred: 0,
            audioVideoTransferred: 0,
            fetchXhrTransferred: 0,
            otherTransferred: 0,
            largestRequestUrl: "",
            largestRequestSize: 0,
            largestTop20: "",
            autoAudioRequests: [],
            spriteSheetRequests: [],
            r2Requests: [],
            repeatedApiCalls: [],
            errorRequests: [error.message],
            suspectedCause: "measurement failed",
            priority: "unknown",
            imageRequestCount: 0,
            tarotAlbumImageCount: 0,
            jsRequestCount: 0,
            fetchXhrRequestCount: 0,
          });
          browser = await restartMeasurementBrowser(browser, options);
        }
      }
    }
  } finally {
    await closeMeasurementBrowser(browser, options);
  }

  const heavyRows = [...requestRows].sort((a, b) => b.transferredSize - a.transferredSize).slice(0, 100);
  writeCsv(path.join(options.outDir, "network-summary.csv"), summaryRows, summaryCsvColumns());
  writeCsv(path.join(options.outDir, "network-heavy-requests.csv"), heavyRows, requestCsvColumns());
  fs.writeFileSync(path.join(options.outDir, "network-summary.md"), renderMarkdown(summaryRows, heavyRows), "utf8");

  log(`[measure-network] wrote ${path.relative(ROOT, options.outDir)}`);
}

main().catch((error) => {
  warn(`[measure-network] ${error.stack || error.message}`);
  process.exit(1);
});

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";
import autoprefixer from "autoprefixer";
import { build } from "esbuild";
import postcss from "postcss";
import tailwindcss from "tailwindcss";

const host = "127.0.0.1";
const require = createRequire(import.meta.url);
const tailwindConfig = require("../tailwind.config.js");
const fixtureImage = "public/tarot-cards/thesun.jpeg";
const consultMarker = "mock 결제 복귀 뒤에도 보존되는 손금 심층 해석 마지막 문장입니다.";

function makeHandReading() {
  const line = (summary) => ({ detected: true, summary, advice: "작은 선택을 기록하며 흐름을 확인해 보세요." });
  return {
    handShape: { type: "earth", labelKo: "단단한 현실형", palmRatio: "balanced", fingerRatio: "balanced", summary: "꾸준히 쌓아가는 힘이 돋보입니다." },
    majorLines: {
      lifeLine: { ...line("생활 리듬을 안정적으로 지키는 흐름입니다."), length: "long", depth: "deep", curvature: "wide", breaks: 0, branches: 1 },
      headLine: { ...line("판단 기준을 세운 뒤 움직이는 편입니다."), length: "long", direction: "straight", startRelationWithLifeLine: "joined", breaks: 0, branches: 1 },
      heartLine: { ...line("관계에서 신뢰를 천천히 쌓습니다."), length: "medium", curvature: "curved", endingArea: "betweenIndexMiddle", breaks: 0, branches: 1 },
      fateLine: { ...line("경험이 쌓일수록 진로 방향이 선명해집니다."), strength: "strong", startArea: "wrist", endArea: "saturnMount", breaks: 0 },
    },
    minorLines: {
      sunLine: { detected: true, strength: "medium", summary: "표현력이 차츰 살아납니다." },
      moneyLine: { detected: true, strength: "medium", summary: "반복 가능한 수익 구조에 강점이 있습니다." },
      marriageLine: { detected: true, strength: "medium", summary: "관계의 속도를 조율하는 편입니다." },
      mercuryLine: { detected: true, strength: "medium", summary: "설명과 조율 능력이 좋습니다." },
    },
    mounts: {
      venus: { fullness: "balanced", summary: "정서적 에너지가 안정적입니다." },
      moon: { fullness: "balanced", summary: "상상력과 현실 감각을 함께 씁니다." },
      jupiter: { fullness: "balanced", summary: "책임감을 가지고 목표를 세웁니다." },
      saturn: { fullness: "balanced", summary: "꾸준함이 강점입니다." },
      sun: { fullness: "balanced", summary: "성과를 차분히 드러냅니다." },
      mercury: { fullness: "balanced", summary: "소통의 맥락을 잘 읽습니다." },
      mars: { fullness: "balanced", summary: "필요할 때 버티는 힘이 있습니다." },
    },
    scores: { love: 72, career: 78, wealth: 76, vitality: 74, creativity: 70, communication: 77 },
    overall: {
      title: "꾸준함이 방향을 만드는 손",
      summary: "급하게 결론 내리기보다 경험을 쌓아 선택의 정확도를 높이는 흐름입니다.",
      strengths: ["꾸준함", "현실 감각"],
      cautions: ["결정을 오래 미루지 않기"],
      recommendedActions: ["이번 주 우선순위 한 가지를 정해 실행하기"],
    },
  };
}

function makePalmResult(requestId) {
  return {
    requestId,
    analysisSaved: true,
    mode: "full",
    qualityScore: 94,
    canonical: {
      profile: { dominantHand: "right", analysisPurpose: "general" },
      handContext: { uploadedHands: ["right"], leftHandRole: "innate", rightHandRole: "acquired" },
      imageQuality: { isPalmDetected: true, handSide: "right", brightness: "normal", sharpness: "sharp", palmCoverage: 0.92, rotation: 0, warnings: [] },
      rightHandReading: makeHandReading(),
      specialPatterns: { detected: [], summary: "" },
      purposeAnalysis: { summary: "현재의 생활 흐름과 선택 습관을 함께 살펴봅니다.", advice: "작은 실행을 반복해 보세요." },
    },
    interpretation: {
      consultText: `사진에서 확인된 선과 손의 균형을 바탕으로 현재 흐름을 정리했습니다. ${consultMarker}`,
      overallSummary: "현실적인 판단과 꾸준한 실행이 서로 힘을 보태는 손입니다.",
      focusSummary: "지금은 넓게 벌이기보다 이미 시작한 일의 완성도를 높일 때입니다.",
      cards: [{ key: "lifeLine", title: "생명선", summary: "안정적인 생활 리듬이 강점입니다.", detail: "체력 자체를 단정하기보다 회복 습관이 잘 작동하는 흐름으로 읽습니다.", advice: "수면과 활동 시간을 일정하게 맞춰 보세요." }],
    },
    report: { oneLiner: "꾸준함이 방향을 만드는 시기", summary: "작은 반복이 큰 차이를 만듭니다.", advice: "한 번에 한 가지를 완성하세요." },
  };
}

async function createHarness() {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "code-destiny-palm-recovery-"));
  const entry = `
    import React from "react";
    import { createRoot } from "react-dom/client";
    import PalmDestinyMain from "${path.join(process.cwd(), "app/palm-reading/PalmDestinyMain.tsx").replaceAll("\\", "/")}";
    createRoot(document.getElementById("root")).render(React.createElement(PalmDestinyMain));
  `;
  await build({
    stdin: { contents: entry, resolveDir: process.cwd(), sourcefile: "palm-recovery-entry.tsx", loader: "tsx" },
    absWorkingDir: process.cwd(),
    alias: { "@": process.cwd() },
    bundle: true,
    define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" },
    format: "iife",
    jsx: "automatic",
    outfile: path.join(tempRoot, "app.js"),
    platform: "browser",
    sourcemap: false,
  });
  const globals = readFileSync("styles/globals.css", "utf8")
    .replace('@import "./fonts-serif.css";', "")
    .replaceAll(/url\("https:\/\/assets\.code-destiny\.com\/[^\"]+"\) format\([^\)]+\)/g, 'local("Malgun Gothic")');
  const css = await postcss([tailwindcss({
    ...tailwindConfig,
    content: ["./app/palm-reading/**/*.{ts,tsx}", "./app/components/PaymentProcessingContext.tsx"],
  }), autoprefixer]).process(globals, { from: path.resolve("styles/globals.css") });
  writeFileSync(path.join(tempRoot, "styles.css"), css.css);
  writeFileSync(path.join(tempRoot, "index.html"), '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>');

  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url || "/", "http://localhost").pathname;
    const file = pathname === "/app.js" ? "app.js" : pathname === "/styles.css" ? "styles.css" : "index.html";
    const contentType = file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : "text/html";
    response.writeHead(200, { "Content-Type": `${contentType}; charset=utf-8`, "Cache-Control": "no-store" });
    response.end(readFileSync(path.join(tempRoot, file)));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return { tempRoot, server, baseUrl: `http://${host}:${address.port}` };
}

async function runViewport(browser, width, baseUrl) {
  const context = await browser.newContext({
    viewport: { width, height: width === 390 ? 844 : 900 },
    locale: "ko-KR",
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  const state = { paid: false, analyzeCalls: 0, paymentCalls: 0, resultCalls: [], requestId: "", result: null, resume: null, externalRequests: [] };

  await context.addInitScript(() => {
    localStorage.setItem("fortune_auth_token", "mock-palm-token");
    localStorage.setItem("fortune_auth_user", JSON.stringify({ id: "mock-palm-user", _id: "mock-palm-user", points: 0 }));
    localStorage.setItem("fortune_user_points", "0");
    class MockHands {
      callback = null;
      setOptions() {}
      onResults(callback) { this.callback = callback; }
      async send() {
        const points = Array.from({ length: 21 }, (_, index) => ({
          x: 0.28 + ((index % 5) * 0.11),
          y: 0.82 - (Math.floor(index / 5) * 0.16),
          z: 0,
        }));
        this.callback?.({ multiHandLandmarks: [points], multiHandedness: [{ label: "Right", score: 0.99 }] });
      }
    }
    window.Hands = MockHands;
    window.__palmHandsAssetBase = "/__mock/mediapipe";
    const mockGate = async (options) => {
      localStorage.setItem("palm_mock_resume", JSON.stringify(options?.resume || null));
      await fetch("/__mock/palm-pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: options?.requestId || "", resume: options?.resume || null }) });
      location.replace("/palm-reading/?mockPaidReturn=1");
      return new Promise(() => {});
    };
    Object.defineProperty(window, "_cdOpenPaidServiceGate", { configurable: true, get: () => mockGate, set: () => {} });
    window.__cdPreloadPortOneV2Sdk = () => {};
  });

  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== baseUrl) {
      state.externalRequests.push(request.url());
      return route.abort("blockedbyclient");
    }
    if (url.pathname === "/__mock/palm-pay") {
      const body = request.postDataJSON();
      state.paid = true;
      state.paymentCalls += 1;
      state.resume = body.resume;
      assert.equal(body.requestId, state.requestId, `${width}px: payment requestId drift`);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, mock: true }) });
    }
    if (url.pathname === "/api/palm/analyze") {
      const body = request.postDataJSON();
      state.analyzeCalls += 1;
      state.requestId = String(body.requestId || "");
      assert.match(state.requestId, /^palm-reading:general:/, `${width}px: canonical request id`);
      assert.ok(String(body.rightPalmImage || "").startsWith("data:image/"), `${width}px: selected photo reaches analysis request`);
      state.result = makePalmResult(state.requestId);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(state.result) });
    }
    if (url.pathname === "/api/palm/result") {
      const requestedId = url.searchParams.get("requestId") || "";
      state.resultCalls.push({ paid: state.paid, requestId: requestedId });
      if (!state.result) return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "RESULT_NOT_FOUND" }) });
      if (!state.paid) return route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ code: "PAID_ACCESS_REQUIRED" }) });
      if (requestedId && requestedId !== state.requestId) return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "RESULT_NOT_FOUND" }) });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...state.result, saved: true }) });
    }
    if (url.pathname === "/api/auth/me" || url.pathname === "/api/auth/refresh") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, user: { id: "mock-palm-user", _id: "mock-palm-user", points: 0 } }) });
    }
    if (url.pathname.startsWith("/api/")) {
      return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ ok: false, code: "MOCK_ROUTE_NOT_IMPLEMENTED" }) });
    }
    return route.continue();
  });

  await page.goto(`${baseUrl}/palm-reading/`, { waitUntil: "domcontentloaded" });
  const upload = page.locator("#palm-right-gallery-input");
  await upload.waitFor({ state: "attached", timeout: 10_000 }).catch(async (error) => {
    const body = (await page.locator("body").innerText().catch(() => "")).slice(0, 2_000);
    throw new Error(`${width}px: PalmDestinyMain did not mount: ${error.message}; pageErrors=${JSON.stringify(pageErrors)}; body=${JSON.stringify(body)}`);
  });
  await upload.setInputFiles(fixtureImage);
  const dominantFieldset = page.locator("fieldset").filter({ hasText: "주로 쓰는 손 선택" });
  await dominantFieldset.getByRole("button", { name: /오른손/ }).click();
  const override = page.getByRole("button", { name: "이 사진 그대로 분석하기" });
  const start = page.getByRole("button", { name: "손바닥 운명 지도 열기" });
  await assert.doesNotReject(() => start.waitFor({ state: "visible" }), `${width}px: start button visible`);
  const readyDeadline = Date.now() + 15_000;
  while (!(await start.isEnabled()) && Date.now() < readyDeadline) {
    if (await override.first().isVisible().catch(() => false)) await override.first().click();
    await page.waitForTimeout(100);
  }
  assert.equal(await start.isEnabled(), true, `${width}px: photo validation and dominant-hand selection enable analysis`);
  await start.click();

  await page.waitForURL(/mockPaidReturn=1/, { timeout: 20_000 });
  await page.getByText(consultMarker, { exact: false }).waitFor({ state: "visible", timeout: 20_000 });
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    resultHeading: document.body.innerText.includes("한눈에 보는 손금 리딩"),
    restoredPhoto: Boolean(document.querySelector('img[alt*="선택한 손바닥"]')),
    mockResume: JSON.parse(localStorage.getItem("palm_mock_resume") || "null"),
  }));

  assert.equal(state.analyzeCalls, 1, `${width}px: redirect recovery must not analyze again`);
  assert.equal(state.paymentCalls, 1, `${width}px: exactly one mock payment handoff`);
  assert.equal(state.resume?.kind, "palm-reading", `${width}px: palm resume kind`);
  assert.equal(state.resume?.args?.serverSaved, true, `${width}px: server-saved resume descriptor`);
  assert.equal(state.resume?.args?.requestId, state.requestId, `${width}px: resume keeps original requestId`);
  assert.ok(state.resultCalls.some((call) => call.paid && call.requestId === ""), `${width}px: returned document reads the latest paid server snapshot`);
  assert.equal(metrics.resultHeading, true, `${width}px: result screen rendered`);
  assert.ok(metrics.documentWidth <= metrics.viewportWidth + 1, `${width}px: horizontal overflow ${JSON.stringify(metrics)}`);
  assert.equal(metrics.restoredPhoto, false, `${width}px: original biometric image must not be restored from server`);
  assert.equal(pageErrors.length, 0, `${width}px: page errors ${JSON.stringify(pageErrors)}`);
  assert.equal(state.externalRequests.length, 0, `${width}px: external requests ${JSON.stringify(state.externalRequests)}`);

  await context.close();
  return { width, analyzeCalls: state.analyzeCalls, paymentCalls: state.paymentCalls, resultCalls: state.resultCalls.length, documentWidth: metrics.documentWidth };
}

let harness = null;
let browser = null;
try {
  harness = await createHarness();
  browser = await chromium.launch({ headless: true });
  const results = [];
  for (const width of [390, 1280]) results.push(await runViewport(browser, width, harness.baseUrl));
  console.log(`[palm-mobile-payment-recovery] PASS ${JSON.stringify(results)}`);
  console.log("[palm-mobile-payment-recovery] actual PalmDestinyMain + compiled Tailwind; isolated from the Next shell");
  console.log("[palm-mobile-payment-recovery] mock only: no LLM, PG, production DB, or deployment requests");
} finally {
  await browser?.close().catch(() => {});
  if (harness) {
    await new Promise((resolve) => harness.server.close(resolve));
    const tempBase = path.resolve(os.tmpdir()) + path.sep;
    const resolvedTempRoot = path.resolve(harness.tempRoot);
    assert.ok(resolvedTempRoot.startsWith(tempBase), `refusing to remove non-temp path: ${resolvedTempRoot}`);
    rmSync(resolvedTempRoot, { recursive: true, force: true });
  }
}

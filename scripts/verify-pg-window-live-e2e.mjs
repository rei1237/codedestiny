#!/usr/bin/env node

/*
 * PG 결제창 오픈 E2E 프로브 — "결제창이 안 뜬다 / 뜨는 게 느리다" 재현·원인 특정 전용.
 *
 * 실제 브라우저(Playwright)로 프로덕션 홈을 열고 테스트 계정 로그인 후, 셸의 단건 결제
 * 파이프라인(_cdRunDirectKrwCheckout)을 실제로 호출해 PortOne SDK 결제창 직전까지 진행한다.
 * 카드 정보는 입력하지 않으므로 결제는 발생하지 않는다(결제창 오픈 = PG 과금 아님).
 *
 * 두 가지를 답한다:
 *   ① 도달 여부  — 어느 단계에서 죽는지(콘솔·pageerror·네트워크 실패 전량 수집)
 *   ② 단계별 소요 — 클릭→PG창 구간을 checkout / sdk / config / customer 로 가르고,
 *                   checkout 안쪽은 네트워크 타이밍 + 서버 Server-Timing 으로 다시 가른다.
 *
 * 🔴 부작용: 1회당 프로덕션에 PENDING 주문 문서가 1건 생긴다(과금 없음, 30분 만료 크론이 정리).
 *
 * 실행: node scripts/verify-pg-window-live-e2e.mjs --live [--base https://code-destiny.com] [--iterations 3]
 */
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { chromium } from "@playwright/test";

const root = process.cwd();
for (const name of [".env.cloudflare.local", ".env.local", ".env"]) {
  const file = path.join(root, name);
  if (fs.existsSync(file)) dotenv.config({ path: file, override: false, quiet: true });
}

const LIVE = process.argv.includes("--live");
const baseIndex = process.argv.indexOf("--base");
const BASE = baseIndex >= 0 && process.argv[baseIndex + 1] ? process.argv[baseIndex + 1].replace(/\/$/, "") : "https://code-destiny.com";
const iterIndex = process.argv.indexOf("--iterations");
const rawIterations = iterIndex >= 0 ? Number.parseInt(process.argv[iterIndex + 1], 10) : 3;
if (!Number.isInteger(rawIterations) || rawIterations < 1 || rawIterations > 10) {
  console.error("[pg-e2e] --iterations 는 1~10 사이 정수여야 합니다(1회당 PENDING 주문 1건).");
  process.exit(1);
}
const ITERATIONS = rawIterations;
const EMAIL = String(process.env.CD_PREVIEW_TEST_EMAIL || "").trim();
const PASSWORD = String(process.env.CD_PREVIEW_TEST_PASSWORD || "").trim();

if (!LIVE) {
  console.log("[pg-e2e] --live 없이는 실행하지 않습니다.");
  process.exit(0);
}
if (!EMAIL || !PASSWORD) {
  console.error("[pg-e2e] CD_PREVIEW_TEST_EMAIL/PASSWORD 필요");
  process.exit(1);
}

const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];
// 셸이 이미 찍고 있는 단계 계측을 그대로 회수한다(계측을 새로 만들지 않는다 — index.html _cdMarkPgStep).
let stepLines = [];
// /api/billing/checkout 한 건의 네트워크·서버 타이밍.
let checkoutSamples = [];
// 한 반복 동안 오간 /api/* 전량. checkout 이후 어디서 멈추는지는 이 순서열이 답한다.
let apiCalls = [];

/** "checkout=812ms sdk=0ms config=0ms customer=1ms total=814ms" → 객체 */
function parseStepLine(line) {
  const out = {};
  for (const [, name, ms] of line.matchAll(/([a-z]+)=(\d+)ms/g)) out[name] = Number(ms);
  return out;
}

/** "cd;dur=780, cdadm;dur=0, cdconn;dur=3, cdop;dur=141" → { cd: 780, ... } */
function parseServerTiming(header) {
  const out = {};
  if (!header) return out;
  for (const entry of String(header).split(",")) {
    const name = entry.split(";")[0].trim();
    const dur = /dur=([0-9.]+)/.exec(entry);
    if (name && dur) out[name] = Number(dur[1]);
  }
  return out;
}

function stat(values) {
  const list = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!list.length) return null;
  return {
    min: list[0],
    p50: list[Math.floor((list.length - 1) / 2)],
    max: list[list.length - 1],
  };
}

function reportRow(label, values) {
  const s = stat(values);
  if (!s) return;
  console.log(`  ${label.padEnd(22)} min=${String(s.min).padStart(6)}ms  p50=${String(s.p50).padStart(6)}ms  max=${String(s.max).padStart(6)}ms`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.on("console", (m) => {
  const text = m.text();
  // 스텁이 돌려주는 PG_E2E_PROBE_STOP 은 우리가 만든 정상 종료 신호다 — 진단 노이즈로 세지 않는다.
  if (m.type() === "error" && !text.includes("PG_E2E_PROBE_STOP")) consoleErrors.push(text.slice(0, 300));
  // 셸(_cdMarkPgStep) · 독립 정적 폴백(_dpMarkPgStep) 둘 다 같은 문구를 쓴다.
  if (text.includes("click→PG steps")) stepLines.push(text);
});
page.on("pageerror", (e) => pageErrors.push(String(e?.message || e).slice(0, 300)));
page.on("requestfailed", (r) => failedRequests.push(`${r.url().slice(0, 120)} ${r.failure()?.errorText || ""}`));
page.on("requestfinished", async (request) => {
  const url = request.url();
  if (url.includes("/api/")) {
    try {
      const response = await request.response();
      apiCalls.push(`${request.method()} ${new URL(url).pathname} → ${response?.status() ?? "?"} ${Math.round(request.timing().responseEnd)}ms`);
    } catch { /* 계측 실패는 무시 */ }
  }
  if (!url.includes("/api/billing/checkout")) return;
  try {
    const timing = request.timing();
    const response = await request.response();
    checkoutSamples.push({
      status: response?.status() ?? 0,
      // startTime 기준 상대값. 쓸 수 없는 구간은 -1 로 온다.
      netTotalMs: Math.round(timing.responseEnd),
      ttfbMs: timing.responseStart >= 0 && timing.requestStart >= 0
        ? Math.round(timing.responseStart - timing.requestStart)
        : null,
      // 커넥션을 재사용하면 -1 이다 = 핸드셰이크 비용 0.
      connectMs: timing.connectEnd >= 0 && timing.connectStart >= 0
        ? Math.round(timing.connectEnd - timing.connectStart)
        : 0,
      server: parseServerTiming(response?.headers()["server-timing"]),
    });
  } catch {
    // 계측 실패가 프로브 판정을 바꾸지 않는다.
  }
});

try {
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 45000 }).catch(async (e) => {
    if (!/interrupted by another navigation/i.test(String(e?.message))) throw e;
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
  });
  await page.waitForTimeout(1500);

  // 1) 로그인 (deploy-safe 와 같은 방식 — 페이지 안에서 /api/auth/login 직접 호출, httpOnly 쿠키 수신)
  const loginStatus = await page.evaluate(async (creds) => {
    const r = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: creds.email, password: creds.password }), credentials: "include",
    });
    return r.status;
  }, { email: EMAIL, password: PASSWORD });
  console.log(`[pg-e2e] login status=${loginStatus} base=${BASE} iterations=${ITERATIONS}`);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2500);

  // 2) 파이프라인 사전 상태
  const pre = await page.evaluate(() => ({
    hasRunDirect: typeof window._cdRunDirectKrwCheckout === "function",
    hasPortOne: typeof window.PortOne !== "undefined" && typeof window.PortOne?.requestPayment === "function",
    hasChoiceModal: typeof window._cdChooseServicePaymentMode === "function",
    hasOpenGate: typeof window._cdOpenPaidServiceGate === "function",
    hasAuthToken: typeof window.__cdHasAuthToken === "function" ? window.__cdHasAuthToken() : null,
  }));
  console.log("[pg-e2e] pipeline:", JSON.stringify(pre));

  /* 3) 결제창이 실제로 열리기 직전에서 멈춘다.
        🔴 in-page 스텁(window.PortOne.requestPayment 대입)은 **동작하지 않는다** — V2 SDK 가 그
        속성을 잠가 놔서 대입도 defineProperty 도 조용히 실패한다(실측). 그래서 SDK 대신 그 SDK 가
        결제창을 열려고 부르는 **네트워크**를 끊는다. cdn.portone.io(스크립트)는 살려 두고
        api.portone.io(결제 개시)만 막으면, requestPayment 가 즉시 실패로 돌아오고 셸의 기존 실패
        처리가 그대로 돈다. 창은 뜨지 않고 과금도 없다.
        SDK 가 결제창을 팝업으로 열면 그 요청은 page 가 아니라 context 에 속하므로 context 에 건다. */
  await context.route(/^https:\/\/api\.portone\.io\//, (route) => route.abort());

  const setup = await page.evaluate(async () => {
    /* 🔴 SDK 예열을 깨운다. 셸은 첫 pointerdown 에서만 cdn.portone.io 를 부르는데(index.html
       _cdWarmPortOneV2Sdk), 프로브는 사람 손이 없어 그 이벤트가 영영 안 온다. 그러면 스텁을 못 걸고
       실제 requestPayment 가 불려 결제창을 띄우려다 45초를 매단다 — 제품 결함이 아니라 프로브 결함이다.
       리스너는 document 캡처라 프로그램적 디스패치로도 같은 경로를 탄다. */
    try { document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); } catch { /* 폴백 아래 */ }
    for (let i = 0; i < 40 && typeof window.PortOne === "undefined"; i += 1) {
      await new Promise((r) => setTimeout(r, 250));
    }
    /* 🔴 저장된 결제 전화번호가 없으면 셸이 결제창 직전에 **대화형 입력 모달**을 띄우고 사람이
       넣을 때까지 영원히 기다린다(index.html _cdPromptDirectCheckoutPhoneNumber). 프로브에는
       사람이 없어 매 반복이 상한까지 매달리고, 남는 건 측정값이 아니라 타임아웃이다.
       미리 확인해 두고 아래 반복에서 번호를 주입해 그 분기를 건너뛴다 — 저장된 번호가 있는
       재구매 사용자(=정상 경로)와 같은 왕복 수가 된다. */
    let hasPhone = false;
    try {
      const r = await fetch("/api/me/payment-phone", { credentials: "include", cache: "no-store" });
      const j = await r.json().catch(() => null);
      const d = (j && (j.data || j)) || {};
      hasPhone = Boolean(d.hasPhone || d.phoneNumber || d.maskedPhone);
    } catch { hasPhone = false; }
    return { sdkReady: Boolean(window.PortOne && window.PortOne.requestPayment), hasPhone };
  });
  const { sdkReady, hasPhone } = setup;
  if (!hasPhone) {
    console.log("[pg-e2e] ℹ 이 계정에는 저장된 결제 전화번호가 없다 — 프로브가 번호를 주입해 입력 모달을 건너뛴다.");
    console.log("           (실사용자 첫 결제는 여기서 GET /api/me/payment-phone 한 왕복이 더 붙는다.)");
  }
  if (!sdkReady) {
    /* SDK 를 못 받으면 반복을 돌리지 않는다 — 그 자체가 결론이고, 더 돌려 봐야 PENDING 주문만 쌓인다. */
    console.log("[pg-e2e] ⚠ PortOne SDK 를 못 받았다 — cdn.portone.io 로드 실패 또는 예열 경로 파손. 여기가 원인이다.");
  }

  const runs = [];
  for (let i = 0; sdkReady && i < ITERATIONS; i += 1) {
    stepLines = [];
    checkoutSamples = [];
    apiCalls = [];

    // 🔴 반복마다 단건 게이트의 single-flight 키를 다르게 만든다. 키는
    // feature|label|cost|amount|profile 조합이고(index.html _cdBuildPaidServiceSingleFlightKey)
    // 슬롯은 settle 후 1800ms 살아 있어서, title 을 고정하면 2회차가 서버 왕복 없이 1회차의
    // 결과를 그대로 돌려받아 "0ms" 라는 가짜 측정이 나온다.
    const result = await page.evaluate(async ({ iteration, injectPhone }) => {
      const trace = [];
      const withCap = (promise, ms) => Promise.race([
        promise,
        new Promise((resolve) => setTimeout(() => resolve({ __pgE2eTimedOut: true, ms }), ms)),
      ]);
      const startedAt = performance.now();
      let clientTotalMs = 0;
      try {
        const out = await withCap(window._cdRunDirectKrwCheckout({
          // 프로브 SKU 는 "레지스트리에 있는 가장 싼 항목"이면 된다. 결제창을 띄우기 전에
          // PortOne.requestPayment 를 스텁으로 가로채므로 실제 청구는 발생하지 않지만,
          // 서버 prepare 가 클라이언트 금액을 레지스트리와 대조하므로(CLIENT_AMOUNT_MISMATCH)
          // featureKey 와 금액은 반드시 정본과 일치해야 한다.
          featureKey: "tarot-numerology-reading",
          title: "PG E2E probe #" + iteration,
          coinPrice: 30,
          cost: 30,
          amountKrw: 3000,
          requestId: "pg-e2e-probe-" + iteration + "-" + Date.now().toString(36),
          idempotencyKey: "pg-e2e-probe-" + iteration + "-" + Date.now().toString(36),
          skipPassProbe: true,
          forceDirectPayment: true,
          internalMainGate: true,
          __cdPaymentGateAuthorized: true,
          __cdDirectPaymentChoiceConfirmed: true,
          // 저장된 번호가 없는 계정에서만 주입한다. checkoutPayload.phoneNumber 는 셸이 이미 보는
          // 세 소스 중 하나라(index.html _cdResolveDirectCheckoutPhoneNumber) 별도 분기가 없다.
          ...(injectPhone ? { checkoutPayload: { phoneNumber: "01000000000" } } : {}),
        }), 45000);
        clientTotalMs = Math.round(performance.now() - startedAt);
        trace.push(out && out.__pgE2eTimedOut
          ? `파이프라인이 ${out.ms}ms 안에 반환하지 않음 — 결제창 직전에서 매달린다(느린 checkout·대기 오버레이 의심)`
          : "파이프라인 반환: " + JSON.stringify(out || {}).slice(0, 200));
      } catch (error) {
        clientTotalMs = Math.round(performance.now() - startedAt);
        // api.portone.io 를 끊었으므로 정상 도달 시에도 여기로 온다(예상된 흐름).
        trace.push("파이프라인 예외: " + String(error?.message || error).slice(0, 300) + (error?.code ? ` code=${error.code}` : "") + (error?.status ? ` status=${error.status}` : ""));
      }
      return { clientTotalMs, trace };
    }, { iteration: i + 1, injectPhone: !hasPhone });

    // 콘솔 이벤트는 evaluate 반환보다 늦게 도착할 수 있다.
    await page.waitForTimeout(400);
    /* 🔴 도달 판정의 정본은 셸이 찍는 단계 로그다. 그 한 줄은 requestPayment 를 부르기 **직전**에만
       나오므로(index.html), 존재 자체가 "결제창 호출 지점까지 갔다"는 증거이고 동시에 단계별 수치다.
       in-page 카운터를 쓰던 옛 판정은 스텁이 안 걸리면 조용히 거짓이 됐다. */
    const steps = stepLines.length ? parseStepLine(stepLines[stepLines.length - 1]) : {};
    const reached = stepLines.length > 0;
    const net = checkoutSamples[checkoutSamples.length - 1] || null;
    runs.push({ ...result, reached, steps, net });

    const cold = i === 0 ? " (cold)" : "";
    console.log(`\n[pg-e2e] run ${i + 1}/${ITERATIONS}${cold} reached=${reached ? "YES" : "NO"} clientTotal=${result.clientTotalMs}ms`);
    if (stepLines.length) console.log("  steps: " + stepLines[stepLines.length - 1].replace(/^.*click→PG steps /, ""));
    if (net) {
      console.log(`  net:   status=${net.status} total=${net.netTotalMs}ms ttfb=${net.ttfbMs ?? "-"}ms connect=${net.connectMs}ms`);
      const s = net.server;
      if (Object.keys(s).length) {
        console.log(`  server: total=${s.cd ?? "-"}ms admission=${s.cdadm ?? "-"}ms connect=${s.cdconn ?? "-"}ms query=${s.cdop ?? "-"}ms`);
      } else {
        console.log("  server: Server-Timing 없음 — 워커 계측이 아직 배포되지 않았다(클라 구간만 귀속 가능)");
      }
    }
    if (apiCalls.length) console.log("  api:   " + apiCalls.join(" | "));
    // 멈춘 지점 판별용 — 결제창 직전에 열리는 대화형 UI(휴대폰 번호 입력 등)가 있으면 여기서 보인다.
    if (!reached) {
      const stuck = await page.evaluate(() => ({
        phonePrompt: Boolean(document.querySelector('[id*="ayment-phone" i], [class*="payment-phone" i], [data-cd-payment-phone]')),
        visibleDialogs: Array.from(document.querySelectorAll('[role="dialog"], .cd-modal, [class*="modal" i]'))
          .filter((n) => n.offsetParent !== null)
          .map((n) => (n.id || n.className || "").toString().slice(0, 80))
          .slice(0, 6),
        overlayText: (document.querySelector('[class*="coin-gate" i], [class*="pg-wait" i]')?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120),
      }));
      console.log("  stuck: " + JSON.stringify(stuck));
    }
    for (const line of result.trace) console.log("  " + line);

    // 다음 반복 전에 single-flight 슬롯(1800ms)이 확실히 비도록 둔다.
    if (i < ITERATIONS - 1) await page.waitForTimeout(2200);
  }

  console.log(`\n[pg-e2e] ── 집계 (n=${runs.length}) ──`);
  reportRow("client total", runs.map((r) => r.clientTotalMs));
  reportRow("step checkout", runs.map((r) => r.steps.checkout));
  reportRow("step sdk", runs.map((r) => r.steps.sdk));
  reportRow("step config", runs.map((r) => r.steps.config));
  reportRow("step customer", runs.map((r) => r.steps.customer));
  reportRow("net checkout total", runs.map((r) => r.net?.netTotalMs));
  reportRow("net checkout ttfb", runs.map((r) => r.net?.ttfbMs));
  reportRow("net tcp+tls connect", runs.map((r) => r.net?.connectMs));
  reportRow("server total", runs.map((r) => r.net?.server?.cd));
  reportRow("server admission", runs.map((r) => r.net?.server?.cdadm));
  reportRow("server db connect", runs.map((r) => r.net?.server?.cdconn));
  reportRow("server db query", runs.map((r) => r.net?.server?.cdop));

  const reachedAll = runs.length > 0 && runs.every((r) => r.reached);
  console.log(`\n[pg-e2e] PortOne 결제창 직전 도달: ${reachedAll ? "YES — 서버·클라 파이프라인 정상" : "NO — 위 트레이스가 사인이다"}`);
  if (pageErrors.length) { console.log("\n[pg-e2e] pageerror:"); pageErrors.slice(0, 10).forEach((e) => console.log("  " + e)); }
  if (consoleErrors.length) { console.log("\n[pg-e2e] console.error:"); consoleErrors.slice(0, 15).forEach((e) => console.log("  " + e)); }
  if (failedRequests.length) { console.log("\n[pg-e2e] requestfailed:"); failedRequests.slice(0, 10).forEach((e) => console.log("  " + e)); }
  process.exitCode = reachedAll ? 0 : 1;
} finally {
  await browser.close();
}

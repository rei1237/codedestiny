#!/usr/bin/env node

/*
 * PG 결제창 오픈 E2E 프로브 — "결제창이 아예 안 뜬다" 재현·원인 특정 전용.
 *
 * 실제 브라우저(Playwright)로 프로덕션 홈을 열고 테스트 계정 로그인 후, 셸의 단건 결제
 * 파이프라인(_cdRunDirectKrwCheckout)을 실제로 호출해 PortOne SDK 결제창 직전까지 진행한다.
 * 카드 정보는 입력하지 않으므로 결제는 발생하지 않는다(결제창 오픈 = PG 과금 아님).
 * 콘솔 에러·pageerror·네트워크 실패·SDK 로드 상태를 전부 수집해 어느 단계에서 죽는지 찍는다.
 *
 * 실행: node scripts/verify-pg-window-live-e2e.mjs --live [--base https://code-destiny.com]
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

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300)); });
page.on("pageerror", (e) => pageErrors.push(String(e?.message || e).slice(0, 300)));
page.on("requestfailed", (r) => failedRequests.push(`${r.url().slice(0, 120)} ${r.failure()?.errorText || ""}`));

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
  console.log(`[pg-e2e] login status=${loginStatus}`);
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

  // 3) 단건 결제 파이프라인 실호출 — PortOne.requestPayment 를 가로채 "결제창 오픈 직전 도달"만 확인하고
  //    실제 창은 띄우지 않는다(도달 = 성공, 원인 규명이 목적).
  const result = await page.evaluate(async () => {
    const trace = [];
    let reachedPortOne = false;
    const ensureSdk = async () => {
      for (let i = 0; i < 40 && typeof window.PortOne === "undefined"; i += 1) await new Promise((r) => setTimeout(r, 250));
      return typeof window.PortOne !== "undefined";
    };
    await ensureSdk();
    if (window.PortOne && window.PortOne.requestPayment) {
      const original = window.PortOne.requestPayment.bind(window.PortOne);
      window.PortOne.requestPayment = async (req) => {
        reachedPortOne = true;
        trace.push("PortOne.requestPayment 도달: paymentId=" + String(req?.paymentId || "").slice(0, 16) + " amount=" + req?.totalAmount);
        return { code: "PG_E2E_PROBE_STOP", message: "probe stop before opening window" };
      };
      window.__pgE2eRestore = () => { window.PortOne.requestPayment = original; };
    } else {
      trace.push("PortOne SDK 미로드 상태로 진입");
    }
    // 🔴 반드시 판정을 낸다. 파이프라인이 매달리면(느린 checkout·오버레이 대기) 그 자체가
    // 결론이므로, 무한 대기 대신 상한을 걸어 "매달림"을 결과로 보고한다.
    const withCap = (promise, ms) => Promise.race([
      promise,
      new Promise((resolve) => setTimeout(() => resolve({ __pgE2eTimedOut: true, ms }), ms)),
    ]);
    try {
      const out = await withCap(window._cdRunDirectKrwCheckout({
        featureKey: "fortune-fish-gacha",
        title: "PG E2E probe",
        coinPrice: 5,
        cost: 5,
        amountKrw: 500,
        requestId: "pg-e2e-probe-1",
        idempotencyKey: "pg-e2e-probe-" + Date.now().toString(36),
        skipPassProbe: true,
        forceDirectPayment: true,
        internalMainGate: true,
        __cdPaymentGateAuthorized: true,
        __cdDirectPaymentChoiceConfirmed: true,
      }), 45000);
      trace.push(out && out.__pgE2eTimedOut
        ? `파이프라인이 ${out.ms}ms 안에 반환하지 않음 — 결제창 직전에서 매달린다(느린 checkout·대기 오버레이 의심)`
        : "파이프라인 반환: " + JSON.stringify(out || {}).slice(0, 200));
    } catch (error) {
      trace.push("파이프라인 예외: " + String(error?.message || error).slice(0, 300) + (error?.code ? ` code=${error.code}` : "") + (error?.status ? ` status=${error.status}` : ""));
    }
    return { reachedPortOne, trace };
  });

  console.log(`\n[pg-e2e] PortOne 결제창 직전 도달: ${result.reachedPortOne ? "YES — 서버·클라 파이프라인 정상" : "NO — 아래 트레이스가 사인이다"}`);
  for (const line of result.trace) console.log("  " + line);
  if (pageErrors.length) { console.log("\n[pg-e2e] pageerror:"); pageErrors.slice(0, 10).forEach((e) => console.log("  " + e)); }
  if (consoleErrors.length) { console.log("\n[pg-e2e] console.error:"); consoleErrors.slice(0, 15).forEach((e) => console.log("  " + e)); }
  if (failedRequests.length) { console.log("\n[pg-e2e] requestfailed:"); failedRequests.slice(0, 10).forEach((e) => console.log("  " + e)); }
  process.exitCode = result.reachedPortOne ? 0 : 1;
} finally {
  await browser.close();
}

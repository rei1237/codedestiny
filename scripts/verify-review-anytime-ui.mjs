import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.REVIEW_UI_BASE_URL || "http://localhost:3107";
const output = ".integration/review-anytime";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const user = { id: "507f1f77bcf86cd799439011", name: "mock-user", profileSubscription: {} };
const products = { ok: true, rewardPolicy: { amount: 100, currency: "moonstone", trigger: "approved" }, items: [] };
let mode = "ready", posts = 0;
const items = [
  { productId: "tarot", productName: "타로 상담", usedAt: "2025-01-02T00:00:00Z", alreadyReviewed: false },
  { productId: "saju-ai", productName: "AI 사주 분석", usedAt: "2024-01-01T00:00:00Z", alreadyReviewed: true, existingReviewStatus: "pending" },
  { productId: "ziwei", productName: "자미두수", usedAt: "", alreadyReviewed: true, existingReviewStatus: "approved" },
  { productId: "vedic", productName: "베다점", usedAt: "", alreadyReviewed: true, existingReviewStatus: "rejected" },
];
try {
  const context = await browser.newContext();
  await context.addInitScript((mockUser) => {
    localStorage.setItem("fortune_auth_user", JSON.stringify(mockUser));
    window.CODE_DESTINY_API_BASE_URL = window.location.origin;
  }, user);
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(base).origin) return route.abort();
    if (url.pathname === "/version.json") return route.abort();
    if (!url.pathname.startsWith("/api/")) return route.continue();
    let data = { ok: true, user, items: [], histories: [], payments: [], profileSubscription: {} }, status = 200;
    if (mode === "guest" && ["/api/auth/me", "/api/auth/refresh"].includes(url.pathname)) {
      status = 401; data = { ok: false };
    }
    if (url.pathname === "/api/auth/login") { mode = "ready"; data = { ok: true, user, nextPath: "/reviews/?write=1" }; }
    if (url.pathname === "/api/reviews/products") data = products;
    else if (url.pathname === "/api/reviews/eligibility") {
      status = mode === "guest" ? 401 : mode === "error" ? 503 : 200;
      data = { ok: status === 200, items: mode === "empty" ? [] : items };
    } else if (url.pathname === "/api/reviews" && route.request().method() === "POST") {
      posts += 1; status = 201; data = { ok: true, status: "pending" };
    } else if (url.pathname === "/api/reviews/summary") data = { total: 0, average: 0, distribution: {} };
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(180000);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + "/reviews/");
    await page.getByRole("button", { name: "후기 남기기", exact: true }).waitFor();
    await page.getByText("후기 공개 승인 후 월정석 100개", { exact: true }).waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "reviews overflow");
    await page.locator(".cd-review-invite").screenshot({ path: `${output}/invite-${width}.png` });
  }
  await page.goto(base + "/reviews/?write=1");
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await page.locator("#review-product option").filter({ hasText: "2025" }).waitFor({ state: "attached" });
  for (const status of ["검수 대기", "공개", "반려"]) assert((await page.locator("#review-product").innerText()).includes(status));
  await page.locator("#review-body").fill("상담 내용을 다시 읽을 수 있어서 마음을 정리하는 데 도움이 됐어요.");
  await dialog.getByRole("button", { name: "리뷰 등록", exact: true }).click();
  await page.getByText("이용하신 모든 상품에 이미 후기를 남기셨습니다.").waitFor();
  assert.equal(posts, 1);
  assert(await dialog.getByRole("button", { name: "리뷰 등록", exact: true }).isDisabled());
  await page.keyboard.press("Escape"); assert.equal(await dialog.count(), 0);
  mode = "error"; await page.goto(base + "/reviews/?write=1");
  await page.getByRole("button", { name: "이용 내역 다시 확인하기" }).waitFor();
  mode = "empty"; await page.getByRole("button", { name: "이용 내역 다시 확인하기" }).click();
  await page.getByText("이 상품을 구매한 사용자만 리뷰를 작성할 수 있습니다.", { exact: false }).waitFor();
  mode = "guest"; await page.goto(base + "/reviews/?write=1");
  const login = page.getByRole("dialog").getByRole("link", { name: "로그인하기", exact: true });
  await login.waitFor();
  assert.equal(new URL(await login.getAttribute("href"), base).searchParams.get("next"), "/reviews/?write=1");
  await login.click();
  await page.locator("#auth-email").fill("review-mock@example.com");
  await page.locator("#auth-password").fill("mock-password-123");
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL("**/reviews/?write=1");
  await page.getByRole("dialog").waitFor();
  const close = page.getByRole("button", { name: "리뷰 작성 닫기", exact: true });
  await close.focus();
  await page.keyboard.press("Shift+Tab");
  assert(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')), "dialog focus trap");
  await page.goto(base + "/points/history/");
  await page.getByRole("link", { name: "후기 남기기", exact: true }).waitFor();
  await page.locator(".cd-review-invite").screenshot({ path: `${output}/history.png` });
  await page.evaluate(() => document.documentElement.setAttribute("data-cd-theme", "neo"));
  await page.locator(".cd-review-invite").screenshot({ path: `${output}/invite-neo.png` });
  mode = "error";
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + "/ggulggul/");
    await page.locator("#cdReviewInvite .cd-review-invite__action").waitFor();
    assert.equal(await page.locator("#cdReviewInvite .cd-review-invite__action").getAttribute("href"), "/reviews/?write=1");
    if (width <= 540) assert((await page.locator("#cdReviewInvite .cd-review-invite__image").boundingBox()).width <= 80, "home mascot overlaps mobile copy");
    await page.locator("#cdReviewInvite").screenshot({ path: `${output}/home-${width}.png` });
  }
  console.log("PASS: 320/390/1280px, auto-open, mock login return, date/status, submit once, empty/error/retry, keyboard focus, history/home CTA, neo theme (mock)");
} finally { await browser.close(); }

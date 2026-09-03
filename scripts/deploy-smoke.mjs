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
const smokeHost = (() => {
  try {
    return new URL(base).hostname.toLowerCase();
  } catch {
    return "";
  }
})();
if (!/^https?:\/\//i.test(base)) throw new Error("Smoke base must be an absolute HTTP(S) URL.");

const failures = [];
const browserErrors = [];
const ignoredConsoleErrors = [];
const pendingServerErrors = [];
function fail(message) { failures.push(message); }
function allowedGuestStatus(status) { return status === 200 || status === 401 || status === 403; }
function isExpectedFontNoise(value) {
  return /assets\.code-destiny\.com\/.*\.(?:woff2?|ttf|otf)/i.test(value) ||
    /font.*blocked by CORS policy/i.test(value) ||
    /blocked by CORS policy.*font/i.test(value);
}
/**
 * 프리뷰에서 무시해도 되는 404 인가.
 *
 * 🔴 2026-08-24 까지 이 자리는 `isPagesPreview` 이기만 하면 **모든 404 를** 무시했다. 호스트도
 * 경로도 보지 않았으므로, 승격 전 관문인 프리뷰 스모크가 **같은 출처의 앱 자산이 통째로 빠져도
 * 초록불**을 냈다. 실제로 그날 릴리스는 프리뷰 PASS → 승격 → 커스텀 도메인에서
 * `/js/services/destiny-flower-engine.js` 404 로 FAIL → 자동 롤백이었다. 관문이 뒤에 있었다.
 *
 * 프리뷰 호스트에서 404 가 정상인 것은 셋뿐이다:
 *   · 교차 출처 — assets.code-destiny.com 등. 프리뷰 배포본에 없는 것이 정상이다.
 *   · /cdn-cgi/* — Cloudflare RUM·beacon. 프리뷰 배포에는 붙지 않는다.
 *   · /api/* — 프리뷰 Pages 배포는 정적 전용이라 워커 라우트가 없다(deploy-safe.mjs:793-795).
 * 그 밖의 같은 출처 404 는 진짜 결함이므로 **승격 전에** 실패로 잡는다.
 *
 * 출처를 판정할 URL 이 문자열에 없으면 무시하지 않는다(fail-closed).
 */
function isIgnorablePreview404(value) {
  if (!isPagesPreview) return false;
  if (!/status of 404/i.test(value)) return false;
  if (/\/cdn-cgi\//i.test(value)) return true;
  const urls = String(value).match(/https?:\/\/[^\s)"'`]+/gi) || [];
  if (!urls.length) return false;
  return urls.every((raw) => {
    try {
      const parsed = new URL(raw);
      if (parsed.hostname.toLowerCase() !== smokeHost) return true;
      return parsed.pathname.startsWith("/api/");
    } catch {
      return false;
    }
  });
}
function isExpectedPreviewCorsNoise(value) {
  return isPagesPreview &&
    /code-destiny\.com\/api\//i.test(value) &&
    /CORS policy|preflight|ERR_FAILED/i.test(value);
}
function isExpectedPagesPreviewNoise(value) {
  return isPagesPreview &&
    /code-destiny\.com\/api\//i.test(value) &&
    /CORS policy/i.test(value);
}

function isExpectedConsoleNoise(value) {
  return isExpectedFontNoise(value) ||
    isExpectedPreviewCorsNoise(value) ||
    (isPagesPreview && /Failed to load resource: net::ERR_FAILED/i.test(value)) ||
    isExpectedPagesPreviewNoise(value) ||
    isIgnorablePreview404(value);
}

/**
 * 브라우저가 본 5xx 를 **즉시 실패로 굳히지 않는다.**
 *
 * 🔴 이 게이트는 콘솔 에러 1건이면 릴리스를 BLOCKED 로 만들고 Pages·Worker 를 직전 버전으로
 * 자동 롤백한다. 그런데 Mongo 커넥션 콜드스타트는 첫 요청 하나만 5xx 를 내고 곧 200(다만 7~8초)
 * 으로 회복하므로, 커밋 내용과 인과가 전혀 없는 롤백이 난다 — 2026-09-03 하루에 두 번 났고
 * (e475983 `/api/reviews/summary`, d2b0236 `/api/reviews`) 뒤엣것은 문서가 아닌 결제 수정이
 * 통째로 되돌아갔다. 직후 손으로 재보면 둘 다 200 이었다.
 *
 * 그래서 5xx 는 **그 URL 을 들고 나중에 직접 재조회**해 판정한다. 계속 5xx 면 그대로 실패다
 * — 진짜 장애는 재조회로 낫지 않는다. 재조회할 URL 이 없으면 완화하지 않는다(fail-closed).
 */
function transientServerErrorUrl(value) {
  if (!/server responded with a status of 5\d\d/i.test(value)) return "";
  const urls = String(value).match(/https?:\/\/[^\s)"'`]+/gi) || [];
  return urls.length === 1 ? urls[0] : "";
}
async function settleServerError(url) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 3000));
    try {
      const response = await fetch(url, {
        headers: { "Cache-Control": "no-store", "X-Code-Destiny-Smoke": "read-only" },
        signal: AbortSignal.timeout(10000),
      });
      if (response.status < 500) return true;
    } catch {
      // 다음 시도로 넘긴다. 두 번 다 실패하면 아래에서 진짜 실패로 승격된다.
    }
  }
  return false;
}
// 콜드스타트는 엔드포인트 한둘에만 걸린다. 서로 다른 URL 이 여럿 5xx 라면 그것은 워커·오리진이
// 통째로 죽은 것이므로 완화 대상이 아니다 — 재조회에 시간을 쓰지 않고 곧장 실패로 굳힌다.
const TRANSIENT_5XX_URL_BUDGET = 3;
async function resolvePendingServerErrors() {
  const distinct = [...new Set(pendingServerErrors.map((item) => item.url))];
  const recovered = new Map();
  if (distinct.length <= TRANSIENT_5XX_URL_BUDGET) {
    for (const url of distinct) recovered.set(url, await settleServerError(url));
  }
  for (const item of pendingServerErrors) {
    if (recovered.get(item.url)) {
      console.log("[deploy-smoke] transient 5xx recovered on re-probe: " + item.detail);
      continue;
    }
    browserErrors.push("console.error: " + item.detail);
  }
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
    if (pathname === "/api/__deploy_safe_missing__" && (response.status === 404 || response.status === 503)) return;
    if (response.status >= 500) {
      if (await settleServerError(url)) {
        console.log("[deploy-smoke] transient 5xx recovered on re-probe: " + url + " (first response HTTP " + response.status + ")");
        return;
      }
      fail("API " + pathname + " returned HTTP " + response.status);
      return;
    }
    if (pathname === "/api/health" && response.status !== 200) fail("API health expected 200, received " + response.status);
    if (pathname === "/api/version" && response.status !== 200) fail("API version expected 200, received " + response.status);
    if (pathname !== "/api/health" && pathname !== "/api/version" && !allowedGuestStatus(response.status)) {
      fail("API " + pathname + " returned unexpected HTTP " + response.status);
    }
  } catch (error) {
    fail("API " + pathname + " request failed: " + error.message);
  }
}

// Cloudflare Image Resizing(/cdn-cgi/image/<옵션>/<원본경로>)은 존(zone) 기능이라 *.pages.dev
// 프리뷰 호스트에는 존재하지 않아 무조건 404 가 난다. 셸 <img> 는 onerror 로 원본 경로에 폴백하므로
// 화면은 성립한다 — 이 검사가 증명해야 할 사실은 "변환 엔드포인트"가 아니라 "원본 자산이 빌드에
// 있는가"다. 이 구분이 없으면 홈 셸이 리사이징 URL 을 참조하는 한 모든 릴리스가 승격 전 스모크에서
// 차단된다(2026-08-12 릴리스 연속 실패의 원인 — #490 자산 다이어트 이후 전 릴리스가 여기서 죽었다).
function imageResizingOriginalPath(pathname) {
  const match = /^\/cdn-cgi\/image\/[^/]+(\/.+)$/.exec(pathname);
  return match ? match[1] : "";
}

async function checkAssets(page) {
  const html = await page.content();
  const paths = [...new Set([...html.matchAll(/(?:src|href)=[\"'](\/[^\"'#?]+)[\"']/gi)].map((m) => m[1]))]
    .filter((item) => /\.(?:js|css|woff2?|png|jpg|jpeg|webp|svg|ico)$/i.test(item))
    .slice(0, 40);
  for (const pathname of paths) {
    try {
      const response = await fetch(new URL(pathname, base), { headers: { "Cache-Control": "no-store" }, signal: AbortSignal.timeout(15000) });
      if (response.status >= 500 || response.status === 404) {
        const original = imageResizingOriginalPath(pathname);
        if (!original) {
          fail("asset " + pathname + " returned HTTP " + response.status);
          continue;
        }
        const fallback = await fetch(new URL(original, base), { headers: { "Cache-Control": "no-store" }, signal: AbortSignal.timeout(15000) });
        if (fallback.status >= 500 || fallback.status === 404) {
          fail("asset " + pathname + " returned HTTP " + response.status + " and its original " + original + " returned HTTP " + fallback.status);
        } else {
          console.log("[deploy-smoke] image resizing unavailable on this host (HTTP " + response.status + "); original asset OK: " + original);
        }
      }
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
    // 🔴 "Failed to load resource: the server responded with a status of NNN ()" 본문에는 자원
    // URL 이 없다. URL 은 location().url 에만 실린다(실측 2026-08-19, Chromium 149). 그래서
    // 본문만 보던 이전 판정에서는 아래 호스트별 예외가 **상태코드 오류에 하나도 걸리지 않았고**,
    // 실패 로그도 "status of 530" 뿐이라 무엇이 죽었는지 알 수 없었다 — #807 릴리스가 정확히
    // 그렇게 530 두 건으로 자동 롤백됐고 대상 URL 이 없어 사후 추적이 불가능했다.
    // 판정도 보고도 URL 을 포함한 문자열로 한다.
    const detail = message.text() + " " + (message.location()?.url || "");
    // Guest smoke intentionally visits auth-gated read-only endpoints; their
    // expected 401 boundary is already validated by checkApi().
    if (/server responded with a status of 401/i.test(detail)) return;
    if (/server responded with a status of 403/i.test(detail)) return;
    // A Pages preview has a different origin from the approved asset CDN. The
    // production site receives these font responses same-origin, so preview
    // CORS warnings do not indicate a broken page or runtime regression.
    if (isExpectedConsoleNoise(detail)) {
      ignoredConsoleErrors.push(detail);
      return;
    }
    const transientUrl = transientServerErrorUrl(detail);
    if (transientUrl) {
      pendingServerErrors.push({ detail, url: transientUrl });
      return;
    }
    browserErrors.push("console.error: " + detail);
  });
  page.on("requestfailed", (request) => {
    const errorText = request.failure()?.errorText || "";
    // Navigations and in-flight analytics/assets are routinely cancelled when
    // the next smoke route starts; they are not runtime failures.
    if (/ERR_ABORTED|AbortError/i.test(errorText)) return;
    if (isExpectedFontNoise(request.url())) return;
    if (isExpectedPreviewCorsNoise(request.url() + " " + errorText)) return;
    if (isPagesPreview && /^https:\/\/code-destiny\.com\/api\//i.test(request.url())) return;
    browserErrors.push("requestfailed: " + request.url() + " " + errorText);
  });

  // 셸은 로드 중 스스로 재네비게이션할 수 있다(자가복구 스윕·로케일 처리 등). 그 순간의 goto 는
  // "interrupted by another navigation" 으로 끊기는데, 페이지는 곧 정상 도착하므로 실패가 아니라
  // 정착 대기 대상이다(2026-08-12 #495 릴리스가 이 경합 한 번으로 롤백된 실사고). 다른 오류는 그대로 실패다.
  async function gotoSettled(route) {
    try {
      const response = await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 30000 });
      return { response, interrupted: false };
    } catch (error) {
      if (!/interrupted by another navigation/i.test(String(error?.message || ""))) throw error;
      await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
      return { response: null, interrupted: true };
    }
  }

  const routes = ["/", "/login", "/saju/basic", "/fortune-tea-house", "/app", "/app/store", "/lock-screen-fortune"];
  for (const route of routes) {
    try {
      const nav = await gotoSettled(route);
      if (!nav.interrupted && (!nav.response || nav.response.status() >= 500)) {
        fail("route " + route + " returned HTTP " + (nav.response?.status() || "no response"));
      }
      await page.waitForTimeout(250);
      if (route === "/") await checkAssets(page);
    } catch (error) {
      fail("route " + route + " failed: " + error.message);
    }
  }

  try {
    await gotoSettled("/");
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
    } else {
      console.log("[deploy-smoke] payment dialog check skipped: no visible guest entry control");
    }
  } catch (error) {
    fail("payment dialog smoke failed: " + error.message);
  }
  // 예외로 넘긴 것도 남긴다 — 예외가 조용히 넓어지면 게이트가 눈을 감은 것을 알 수 없다.
  for (const ignored of ignoredConsoleErrors) console.log("[deploy-smoke] ignored console error: " + ignored);
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
await resolvePendingServerErrors();

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

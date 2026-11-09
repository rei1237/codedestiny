// Launched by the isolated business-api Jest integration test. All API and PG traffic stays on loopback.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
const source = process.env.BUSINESS_TEST_UI,
  api = process.env.BUSINESS_TEST_API;
for (const url of [source, api])
  assert.equal(new URL(url).hostname, "127.0.0.1");
const browser = await chromium.launch({ headless: true });
try {
  for (const [width, height] of [
    [1280, 800],
    [390, 844],
  ]) {
    await fetch(api + "/reset", { method: "POST" });
    const context = await browser.newContext({
      viewport: { width, height },
      locale: "ko-KR",
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(180000);
    page.setDefaultNavigationTimeout(360000);
    await context.route("**/*", async (route) => {
      const req = route.request(),
        url = new URL(req.url());
      if (url.pathname.startsWith("/api/") && url.origin === source) {
        const res = await fetch(api + url.pathname + url.search, {
          method: req.method(),
          headers: { "Content-Type": "application/json" },
          body: req.postData(),
        });
        return route.fulfill({
          status: res.status,
          contentType: "application/json",
          body: await res.text(),
        });
      }
      if (url.origin !== source) return route.abort();
      return route.continue();
    });
    await page.addInitScript(() => {
      window.PortOne = {
        requestPayment: async (data) => {
          const r = await fetch("/api/test-pg", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: data.paymentId,
              amount: data.totalAmount,
            }),
          });
          if (!r.ok) throw Error("모의 PG 금액 불일치");
          return { paymentId: data.paymentId };
        },
      };
    });
    await page.goto(source + "/", { waitUntil: "domcontentloaded" });
    await page
      .locator("footer")
      .getByRole("link", { name: "운세 API · 요금 및 연동" })
      .click();
    const buy = page.getByRole("button", {
      name: "사주 API 1개월 구매 · 149,000원",
    });
    await page.waitForFunction(() => !document.querySelector("#pricing button")?.disabled && document.querySelector("#pricing button"));
    await page.getByRole("link", {name:"API 응답 예시 보기",exact:true}).click();
    for (const slug of ["ziwei","astrology","vedic","sukuyo","tarot","saju"]) {
      await page.locator("#examples select").selectOption(slug);
      await page.locator(`.biz-reading img[src$="/${slug}.webp"]`).waitFor();
      assert.ok(await page.locator("#examples pre").nth(1).innerText());
    }
    await page.getByRole("button",{name:"출생시각 미상 예시"}).click();
    assert.equal(JSON.parse(await page.locator("#examples pre").nth(1).innerText()).pillars.hour,null);
    await buy.click();
    await page.locator("#auth-email").fill("api-buyer@example.test");
    await page.locator("#auth-password").fill("Mock-only-password!");
    await page.locator("form button[type=submit]").click();
    await page.waitForURL(
      (u) =>
        u.pathname === "/business/api/" &&
        u.searchParams.get("product") === "saju",
    );
    await page.getByRole("checkbox", { name: /상업 이용 범위/ }).check();
    await buy.click();
    await page.waitForURL("**/business/api/dashboard/**");
    await page.getByRole("button", { name: "키 발급", exact: true }).click();
    const key = await page.locator("output").innerText();
    const example = await page.locator("pre").last().innerText();
    const url = new URL(example.match(/curl --request POST "([^"]+)"/)[1]);
    assert.equal(url.pathname, "/api/business/v1/saju");
    assert.ok(example.includes("Authorization: Bearer $GGUL_FORTUNE_API_KEY"));
    const input = example.match(/--data '([^']+)'/)[1];
    // Pass the sandbox key through stdin, never a process argument or captured browser log.
    const curl = process.platform === "win32" ? "curl.exe" : "curl";
    const child = await new Promise((resolve, reject) => {
      const proc = execFile(
        curl,
        [
          "--silent",
          "--show-error",
          "--config",
          "-",
          "--data",
          input,
          "--url",
          api + url.pathname,
          "--write-out",
          "\\n%{http_code}",
        ],
        (error, stdout) => (error ? reject(error) : resolve(stdout)),
      );
      proc.stdin.end(
        'header = "Authorization: Bearer ' +
          key +
          '"\nheader = "Content-Type: application/json"\n',
      );
    });
    const [json, status] = child.trim().split(/\r?\n/);
    assert.equal(status, "200");
    assert.equal(JSON.parse(json).dayMaster, "甲");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    console.log(width + "px footer → login → checkout → key → cURL HTTP 200");
    await context.close();
  }
} finally {
  await browser.close();
}

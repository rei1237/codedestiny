import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mockDevSettings } from "./lib/mock-dev-settings.mjs";

const origin = `http://127.0.0.1:${mockDevSettings(process.cwd()).port}`;
const output = resolve("test-results/cms-visual-editor");
mkdirSync(output, { recursive: true });
const detail = JSON.parse(readFileSync("lib/marketing/feature-visual-details.generated.json")).items["new-year-ai"];
const episode = JSON.parse(readFileSync("lib/stories/vn/episodes.generated.json")).episodes[0];
const browser = await chromium.launch();
const writes = [];
let page;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  await context.addInitScript(() => {
    sessionStorage.setItem("flower_admin_token", "visual-editor-mock-token." + "a".repeat(64));
  });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname.startsWith("/api/")) {
      if (url.pathname === "/api/admin/hq/summary") return route.fulfill({ json: { ok: true, alerts: [], focus: [], period: { today: "2026-10-21" } } });
      if (route.request().method() !== "GET") writes.push({ path: url.pathname, body: route.request().postDataJSON() });
      const match = url.pathname.match(/^\/api\/admin\/cms\/entries\/([^/]+)\/([^/]+)$/);
      const payload = match && route.request().method() === "PUT"
        ? { ok: true, item: { namespace: decodeURIComponent(match[1]), key: decodeURIComponent(match[2]), ...route.request().postDataJSON(), version: 1 } }
        : { ok: true, items: [] };
      return route.fulfill({ json: payload });
    }
    return route.continue();
  });
  page = await context.newPage();
  const diagnostics = await context.newCDPSession(page);
  await diagnostics.send("Runtime.enable");
  diagnostics.on("Runtime.exceptionThrown", ({ exceptionDetails: error }) => console.error(JSON.stringify({ url: error.url, line: error.lineNumber, description: error.exception?.description })));
  const errors = [];
  page.on("pageerror", (error) => { errors.push(error.message); console.error(error.message); });
  await page.goto(origin + "/admin/cms/", { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.getByRole("button", { name: "신년운세", exact: false }).first().click({ timeout: 120000 });
  const preview = page.frameLocator('iframe[title="콘텐츠 실제 화면 미리보기"]');
  await page.getByText(/현재 화면에서 연결된 위치 [1-9]/).waitFor({ timeout: 120000 });
  await preview.getByText(detail.description, { exact: true }).first().click({ timeout: 120000 });
  const chooser = page.getByRole("combobox", { name: "수정할 항목" });
  if (await chooser.count()) await chooser.selectOption(JSON.stringify(["record", "description", "text"]));
  await page.getByRole("textbox", { name: "선택한 문구" }).fill("올해의 일과 관계를 차근차근 살펴봅니다.");
  await page.getByRole("button", { name: "초안에 적용", exact: true }).click();
  await preview.getByText("올해의 일과 관계를 차근차근 살펴봅니다.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "브라우저에 초안 저장" }).click();
  assert.equal(writes.length, 0, "draft editing must not write or unpublish server content");
  await page.getByRole("button", { name: "발행", exact: true }).click();
  const published = writes.find((item) => item.path.includes("/feature-detail/new-year-ai"));
  assert.equal(published.body.status, "published");
  assert.equal(published.body.fields.record.description.text, "올해의 일과 관계를 차근차근 살펴봅니다.");
  await page.locator('[aria-label="화면에서 편집"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(output, "desktop.png"), fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.locator('[aria-label="화면에서 편집"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(output, "mobile.png"), fullPage: false });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "라이트 노벨 대본", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(episode.title) }).first().click();
  await page.getByText(/현재 화면에서 연결된 위치 [1-9]/).waitFor({ timeout: 120000 });
  await preview.getByText(episode.beats[0].t, { exact: true }).click({ timeout: 120000 });
  assert.ok(await page.getByRole("textbox", { name: "선택한 문구" }).count(), "novel text is selectable");
  await page.getByRole("textbox", { name: "선택한 문구" }).fill("검수용으로 바꾼 첫 문장입니다.");
  await page.getByRole("button", { name: "초안에 적용", exact: true }).click();
  await preview.getByText("검수용으로 바꾼 첫 문장입니다.", { exact: true }).waitFor();
  await page.screenshot({ path: resolve(output, "novel.png"), fullPage: false });
  assert.deepEqual(errors, []);
  console.log("PASS: real detail and novel iframe selection, local draft isolation, mocked publication, mobile overflow");
} catch (error) {
  if (page) {
    console.error((await page.locator("body").innerText()).slice(0, 4000));
    await page.screenshot({ path: resolve(output, "failure.png"), fullPage: false });
  }
  throw error;
} finally { await browser.close(); }

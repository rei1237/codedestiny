// Browser interaction regression. All service APIs are fulfilled locally; no real account or LLM.
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { MASTER_LOVE_CODEX_CHAPTERS, LOVE_DNA_METRICS } from "../worker/lib/master-love-codex-prompt.mjs";

const origin = process.env.CODEX_READER_ORIGIN || "http://127.0.0.1:3107";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname)) throw new Error("Local mock origin required");
const chapters = MASTER_LOVE_CODEX_CHAPTERS.map(chapter => ({ ...chapter, ok: true,
  body: `## ${chapter.title}\n\n${"서로의 기대를 구체적인 말로 확인하고, 대화할 시간을 합의해 보세요.\n\n".repeat(40)}`,
  content: { narration: "검증용 상담 도입입니다.", keySentence: "기대한 행동을 구체적으로 말해 보세요.", insight: "서로 다른 대화의 속도를 조율하는 장면입니다.",
    evidence: [{ label: "일간", system: "사주", explanation: "검증용 근거 설명입니다." }], actions: ["대화 시간을 정해 보세요.", "원하는 행동을 말해 보세요."] },
}));
const book = { ok: true, sessionId: "reader-mock", mode: "solo", status: "completed", accessType: "paid", chapters,
  birthInfo: { name: "검증", gender: "female", birthDate: "1993-05-14", birthTime: "07:20", calendarType: "solar" },
  loveDna: { typeName: "검증용 관계 유형", typeSummary: "다른 성향을 합산해 우열을 매기지 않습니다.", metrics: LOVE_DNA_METRICS.map(metric => ({ ...metric, score: 100, basis: "검증용 근거" })) }, totalCharCount: 50000 };
const browser = await chromium.launch();
try {
  let cancelled = false;
  const context = await browser.newContext({ reducedMotion: "reduce", serviceWorkers: "block" });
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/master-love-codex/session") return route.fulfill(cancelled
      ? { status: 402, json: { ok: false, message: "취소된 구매입니다." } } : { json: book });
    if (url.pathname.startsWith("/api/")) return route.fulfill({ json: { ok: true, user: null } });
    return url.origin === origin ? route.continue() : route.abort();
  });
  // Storage loss must not prevent reading a server-owned purchase.
  await context.addInitScript(() => Object.defineProperty(window, "sessionStorage", { get() { throw new DOMException("disabled", "SecurityError"); } }));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${origin}/master-love-codex/result/?sessionId=reader-mock`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.locator("#master-love-codex-document").waitFor();
  assert.equal(await page.locator("h1").count(), 1, "result route owns its single page heading");
  const summary = await page.locator("[data-codex-summary]").innerText();
  assert.ok(summary.includes(book.loveDna.typeName));
  assert.equal(/Excellent Match|Strong Match|Balanced Match|\/\s*100/.test(summary), false, "no invented average match grade");
  for (const width of [360, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    const contents = page.locator("nav details");
    await contents.locator("summary").click();
    assert.equal(await contents.locator("a").count(), 20);
    await contents.locator("a").nth(9).click();
    assert.equal(await contents.getAttribute("open"), null);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-codex-chapter")), "10");
    const chapter = page.locator('[data-codex-chapter="10"]');
    const top = await chapter.evaluate(element => element.getBoundingClientRect().top);
    assert.ok(top >= 100 && top <= 160, `${width}px navigation lands below sticky controls: ${top}`);
    if (await chapter.locator("details").last().getAttribute("open") === null) {
      await chapter.locator("details").last().locator("summary").click();
    }
    assert.ok(await chapter.locator("details").last().getAttribute("open") !== null);
    const size = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth,
      small: [...document.querySelectorAll("nav button, nav summary, [data-codex-chapter] summary")]
        .filter(element => element.getBoundingClientRect().height > 0 && element.getBoundingClientRect().height < 44).length }));
    assert.equal(size.overflow, false, `${width}px horizontal overflow`);
    assert.equal(size.small, 0, `${width}px controls smaller than 44px`);
    await contents.locator("summary").click();
    await contents.locator("summary").press("Escape");
    assert.equal(await contents.getAttribute("open"), null);
    console.log(`PASS reader ${width}px: contents, focus, reading, storage disabled, touch targets, overflow`);
  }
  cancelled = true;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("alert").waitFor();
  assert.equal(await page.locator("#master-love-codex-document").count(), 0);
  assert.deepEqual(errors, []);
  console.log("PASS cancelled purchase does not render the stored result; individual metrics are not averaged");
} finally { await browser.close(); }

const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const url = "http://127.0.0.1:3485/games/kkulkkul-card-rpg/#battle";
const out = process.env.RPG_CAPTURE_DIR;
async function play(browser, mode) {
  const record = !!out && mode === "normal";
  const ctx = await browser.newContext({
    viewport: { width: 844, height: 390 },
    reducedMotion: mode === "reduced" ? "reduce" : "no-preference",
    ...(record
      ? { recordVideo: { dir: out, size: { width: 844, height: 390 } } }
      : {}),
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (
      m.type() === "error" &&
      /same key|unique.*key|hydration failed/i.test(m.text())
    )
      errors.push(m.text());
  });
  const btn = (name) => p.getByRole("button", { name, exact: true });
  try {
    await ctx.addCookies([
      {
        name: "cd_cookie_consent",
        value: "essential",
        url: "http://127.0.0.1:3485",
      },
    ]);
    await ctx.route("**/*", (r) =>
      new URL(r.request().url()).hostname === "127.0.0.1"
        ? r.continue()
        : r.abort(),
    );
    await p.addInitScript(() => {
      const original = crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues = (a) =>
        a instanceof Uint32Array && a.length === 1
          ? ((a[0] = 941), a)
          : original(a);
    });
    await p.goto(url);
    if (record)
      await p.addStyleTag({
        content: "nextjs-portal {display:none!important}",
      });
    await p.locator("select").first().selectOption("rehearsal");
    await btn("모카와 임시 지원으로 연습").click();
    const special = p.getByRole("group", { name: "사용 가능한 운명해방" });
    const moka = special.getByRole("button", {
      name: /모카 운명해방 불꽃 주방의 앙코르/,
    });
    await moka.waitFor();
    assert.equal(await special.getByRole("button").count(), 3);
    const hand = p.locator("button[data-type]");
    assert.equal(await hand.count(), 5);
    if (mode === "fast") await btn("1×").click();
    await hand.first().click();
    await moka.click();
    await hand.first().click();
    assert.equal(await moka.locator("b").textContent(), "1");
    await hand.first().click();
    if (record)
      await p.screenshot({ path: path.join(out, "release-hand.png") });
    await btn("2장 확정").click();
    if (mode === "normal") {
      const cutin = p.getByRole("img", {
        name: "모카 · 운명해방 · 불꽃 주방의 앙코르",
      });
      await cutin.waitFor();
      const meter = p.locator("meter").first();
      assert.equal(await meter.getAttribute("value"), "2600");
      if (record)
        await p.screenshot({ path: path.join(out, "moka-release.png") });
      await p.waitForFunction(
        () => Number(document.querySelector("meter")?.value) < 2600,
      );
      await p.locator('[data-signature="moka"]').waitFor();
      const firstHit = Number(await meter.getAttribute("value"));
      await p.waitForFunction(
        (first) => Number(document.querySelector("meter")?.value) < first,
        firstHit,
      );
      // The second card in this fixed hand is a melee Buster. Measure the figure against its stationary formation slot.
      await p.waitForFunction(() =>
        Array.from(document.querySelectorAll('[data-striking="true"]')).some(
          (slot) => {
            const figure = slot.firstElementChild;
            return (
              figure?.getAttribute("data-motion") === "Buster" &&
              figure.getBoundingClientRect().x -
                slot.getBoundingClientRect().x >
                80
            );
          },
        ),
      );
      if (record)
        await p.screenshot({ path: path.join(out, "melee-approach.png") });
    }
    await p.getByText("2턴", { exact: true }).waitFor();
    assert.equal(await moka.count(), 0);
    assert.equal(await p.locator("button[data-fighter] img").count(), 1);
    const fingerprint = async () => ({
      hp: await p.locator("meter").first().getAttribute("value"),
      allies: await p.locator('[class*="allies"] small').allTextContents(),
      hand: await hand.evaluateAll((es) =>
        es.map((e) => e.getAttribute("aria-label")),
      ),
    });
    const result = await fingerprint();
    await p.reload();
    await hand.first().waitFor();
    assert.deepEqual(await fingerprint(), result);
    await btn("전투 기록").click();
    await p
      .getByRole("dialog")
      .getByText(/모카 · 불꽃 주방의 앙코르 →/)
      .waitFor();
    if (mode === "reduced") {
      await p.getByRole("dialog").getByRole("button", { name: "닫기" }).click();
      for (let turn = 0; turn < 15 && (await hand.count()); turn++) {
        const enabled = hand;
        for (let i = 0; i < 3; i++) await enabled.nth(i).click();
        await btn("3장 확정").click();
        await p.waitForFunction(
          () =>
            !document.querySelector('button[data-type][aria-pressed="true"]'),
        );
      }
      await p.getByRole("heading", { name: "승리", exact: true }).waitFor();
      await btn("결과 확인 · 로비로").click();
      assert.equal(
        await p.getByRole("group", { name: "사용 가능한 운명해방" }).count(),
        0,
      );
    }
    assert.deepEqual(errors, []);
    return result;
  } finally {
    const video = p.video();
    await ctx.close();
    if (record && video) {
      await video.saveAs(path.join(out, "moka-release.webm"));
      await video.delete();
    }
  }
}
(async () => {
  if (out) fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
  });
  try {
    const reference = await play(browser, "normal");
    for (const mode of ["fast", "reduced"])
      assert.deepEqual(await play(browser, mode), reference);
    console.log(
      "PASS: named release, five cards + three outside-deck finishers, order, impact damage, reload, equal 1x/2x/reduced outcomes.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

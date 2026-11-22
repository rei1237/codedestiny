const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require("playwright");
const url = "http://127.0.0.1:3485/games/kkulkkul-card-rpg/#growth";
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
  });
  try {
    // A disposable context is the only guest inventory this test can modify.
    const ctx = await browser.newContext({
      viewport: { width: 915, height: 412 },
      reducedMotion: "reduce",
    });
    const writes = [];
    await ctx.route("**/*", (route) => {
      const request = route.request(),
        u = new URL(request.url());
      if (!["127.0.0.1", "localhost"].includes(u.hostname))
        return route.abort();
      if (
        u.pathname.startsWith("/api/") &&
        !["GET", "OPTIONS"].includes(request.method())
      ) {
        writes.push(request.method() + " " + u.pathname);
        return route.abort();
      }
      return route.continue();
    });
    await ctx.addCookies([
      { name: "cd_cookie_consent", value: "essential", url },
    ]);
    const p = await ctx.newPage();
    await p.goto(url);
    await p
      .getByText("제1장 후 ‘연잎의 첫 수업’을 마치면 열려요.", { exact: false })
      .waitFor();
    await p.evaluate(async () => {
      const db = await new Promise((ok, fail) => {
        const req = indexedDB.open("kkulkkul-card-rpg.dev-collection", 1);
        req.onsuccess = () => ok(req.result);
        req.onerror = () => fail(req.error);
      });
      await new Promise((ok, fail) => {
        const tx = db.transaction("accounts", "readwrite"),
          accounts = tx.objectStore("accounts"),
          req = accounts.get("guest");
        req.onsuccess = () => {
          const c = req.result;
          c.shards = 40;
          c.campaign = {
            completed: { "study.growth": 1, "study.gear": 1, "study.skill": 1 },
            cleared: true,
          };
          for (const speaker of ["yun", "pje", "ln"])
            c.units.push({
              ownedUnitId: "qa-" + speaker,
              battleVariantId: speaker + "-base",
              costumeId: "default",
              level: 1,
              xp: 0,
              acquired: 1,
            });
          accounts.put(c, "guest");
        };
        tx.oncomplete = ok;
        tx.onabort = () => fail(tx.error);
      });
      db.close();
    });
    await p.reload();
    const click = (p, text) =>
      p.getByRole("button", { name: text, exact: true }).click();
    const other = await ctx.newPage();
    await other.goto(url);
    await click(other, "수련 확인");
    await click(p, "수련 확인");
    await click(p, "취소");
    await click(p, "수련 확인");
    await click(p, "재료 사용 확정");
    await p.getByText("성장 기록을 저장했어요.").waitFor();
    await click(other, "재료 사용 확정");
    await other
      .getByText("다른 화면에서 성장 상태가 바뀌었어요. 다시 불러오세요.")
      .waitFor();
    await other.close();
    await p.reload();
    await p.getByText("Lv.2 · HP 1080 · 공격 250", { exact: true }).waitFor();
    await p.getByRole("combobox", { name: "수련 과정" }).selectOption("skill");
    if (process.env.RPG_CAPTURE_DIR) {
      fs.mkdirSync(process.env.RPG_CAPTURE_DIR, { recursive: true });
      await p.setViewportSize({ width: 1280, height: 720 });
      await p.screenshot({
        path: path.join(process.env.RPG_CAPTURE_DIR, "growth.png"),
        style: "nextjs-portal{display:none!important}",
      });
    }
    await click(p, "예장 수련");
    await click(p, "예장 잠금");
    await click(p, "즐겨찾기");
    await p.reload();
    await click(p, "예장 수련");
    await p.getByRole("button", { name: "잠금 해제", exact: true }).waitFor();
    await p
      .getByRole("button", { name: "즐겨찾기 해제", exact: true })
      .waitFor();
    await click(p, "동료 수련");
    await p
      .getByRole("combobox", { name: "수련 과정" })
      .selectOption("variant");
    await click(p, "수련 확인");
    await click(p, "재료 사용 확정");
    for (const id of ["yun", "pje", "ln"]) {
      await p
        .getByRole("combobox", { name: "수련할 동료" })
        .selectOption("qa-" + id);
      await p
        .getByRole("combobox", { name: "수련 과정" })
        .selectOption("costume");
      await click(p, "수련 확인");
      await click(p, "재료 사용 확정");
      await p
        .getByText("이미 사용 가능한 의상이에요.", { exact: false })
        .waitFor();
    }
    await p
      .locator("nav")
      .getByRole("button", { name: "동료", exact: true })
      .click();
    for (const [name, id] of [
      ["윤달", "yun-traveler"],
      ["서한비", "pje-rain"],
      ["루나", "ln-festival"],
    ]) {
      await click(p, name + " 카드");
      await p
        .getByRole("combobox", { name: "의상", exact: true })
        .selectOption(id);
      await p.getByText("의상을 저장했어요.", { exact: true }).waitFor();
      const img = p.getByRole("img", {
        name: name + " 전투 모습",
        exact: true,
      });
      await img.evaluate((el) => el.decode());
      assert.ok((await img.getAttribute("src")).endsWith(id + ".webp"));
    }
    await click(p, "모카 정오의 앙코르 카드");
    const stage = p.getByRole("img", { name: "모카 전투 모습", exact: true });
    await stage.evaluate((img) => img.decode());
    assert.ok((await stage.getAttribute("src")).endsWith("moka-stage.webp"));
    assert.deepEqual(writes, []);
    console.log(
      "Growth UI PASS: locked explanation, confirmation/cancel, correct stats, stale second tab, persisted protection, no API writes",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

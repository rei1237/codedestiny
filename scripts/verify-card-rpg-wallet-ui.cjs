const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path");
(async () => {
  process.env.NODE_ENV = "development";
  process.env.CD_MOCK_DEV = "1";
  const { createMockApiServer } = await import("./mock-dev-api.mjs");
  const mock = createMockApiServer({ rpgWalletFile: null });
  await new Promise((resolve) => mock.listen(0, "127.0.0.1", resolve));
  const api = "http://127.0.0.1:" + mock.address().port;
  const game =
    process.env.RPG_DEV_URL || "http://127.0.0.1:3485/games/kkulkkul-card-rpg/";
  assert(["127.0.0.1", "localhost"].includes(new URL(game).hostname));
  let browser;
  try {
    // This server and the payment database exist only during this test.
    const login = await fetch(api + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const readCatalog = async () =>
      (
        await fetch(api + "/api/mock/card-rpg/catalog", {
          headers: { Cookie: cookie },
        })
      ).json();
    assert.equal((await fetch(api + "/api/mock/card-rpg/catalog")).status, 401);
    const refused = await fetch(api + "/api/mock/card-rpg/summon", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        Origin: "https://example.invalid",
      },
      body: "{}",
    });
    assert.equal(refused.status, 403);
    let loseNextResponse = false;
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH,
    });
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      reducedMotion: "reduce",
    });
    await ctx.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (!["127.0.0.1", "localhost"].includes(url.hostname))
        return route.abort();
      if (url.pathname.startsWith("/api/")) {
        const transfer = await route.fetch({
          url: api + url.pathname + url.search,
        });
        if (loseNextResponse && url.pathname === "/api/mock/card-rpg/summon") {
          loseNextResponse = false;
          assert.equal(transfer.status(), 200);
          return route.abort("failed");
        }
        return route.fulfill({ response: transfer });
      }
      return route.continue();
    });
    await ctx.addCookies([
      {
        name: "cd_local_rpg_wallet",
        value: cookie.split("=")[1],
        domain: new URL(game).hostname,
        path: "/api",
        httpOnly: true,
        sameSite: "Strict",
      },
      { name: "cd_cookie_consent", value: "essential", url: game },
      { name: "fortune_auth_role", value: "user", url: game },
    ]);
    await ctx.addInitScript(() =>
      localStorage.setItem(
        "fortune_auth_user",
        JSON.stringify({ id: "mock-user", name: "개발 사용자", role: "user" }),
      ),
    );
    const page = await ctx.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(game + "#summon");
    const btn = (name) => page.getByRole("button", { name, exact: true });
    await btn("테스트 월정석 소환 열기").click();
    await btn("테스트 10회 · 400개").click();
    await btn("테스트 월정석 사용 확인").click();
    await page
      .getByText("격리 테스트 계정 · 월정석 원장 정산 완료", { exact: true })
      .waitFor();
    await btn("결과로 건너뛰기").click();
    await page.getByRole("heading", { name: "소환 결과" }).waitFor();
    assert.equal(
      await page.getByRole("button", { name: /상세 보기/ }).count(),
      10,
    );
    await page.getByText(/정산 직후 잔액 200개/).waitFor();
    const state = await readCatalog();
    assert.equal(state.balance, 200);
    assert.equal(state.history.length, 1);
    if (process.env.RPG_CAPTURE_DIR) {
      fs.mkdirSync(process.env.RPG_CAPTURE_DIR, { recursive: true });
      await page.screenshot({
        path: path.join(process.env.RPG_CAPTURE_DIR, "settled-summon.png"),
        style: "nextjs-portal{display:none!important}",
      });
    }
    await btn("배너로 돌아가기").click();
    await btn("테스트 월정석 소환 열기").click();
    await page.getByText("테스트 소환 이력 1건").click();
    await btn("언덕 너머의 동료들 · 10장 · 400개 사용").click();
    await page
      .getByText("격리 테스트 계정 · 월정석 원장 정산 완료", { exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByText("격리 테스트 계정 · 월정석 원장 정산 완료", { exact: true })
      .waitFor();
    const after = await readCatalog();
    assert.deepEqual(after.history, state.history);
    assert.equal(after.balance, 200);
    await btn("결과로 건너뛰기").click();
    await btn("배너로 돌아가기").click();
    await btn("예장 소환").click();
    await btn("테스트 월정석 소환 열기").click();
    await btn("테스트 10회 · 200개").click();
    loseNextResponse = true;
    await btn("테스트 월정석 사용 확인").click();
    await page.getByRole("alert").waitFor();
    await page.reload();
    await btn("테스트 월정석 소환 열기").click();
    await page.getByText("테스트 소환 이력 2건").click();
    await btn("방에 남은 작은 기억 · 10장 · 200개 사용").click();
    await btn("결과로 건너뛰기").click();
    await page.getByText(/정산 직후 잔액 0개/).waitFor();
    const final = await readCatalog();
    assert.equal(final.history.length, 2);
    assert.equal(final.balance, 0);
    const gear = final.history[1].cards;
    const i = gear.findIndex((pick) => pick.duplicate);
    assert(i >= 0);
    await page
      .getByRole("button", { name: /상세 보기/ })
      .nth(i)
      .click();
    await btn("예장 장착 안내").click();
    assert.equal(
      await page.getByLabel("보유 예장 선택").inputValue(),
      gear[i].ownedId,
    );
    await fetch(api + "/api/auth/logout", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    await fetch(api + "/api/auth/login", { method: "POST" });
    assert.equal(
      (
        await fetch(api + "/api/mock/card-rpg/catalog", {
          headers: { Cookie: cookie },
        })
      ).status,
      401,
    );
    process.env.NODE_ENV = "production";
    const closed = createMockApiServer({ rpgWalletFile: null });
    process.env.NODE_ENV = "development";
    await new Promise((resolve) => closed.listen(0, "127.0.0.1", resolve));
    try {
      const disabledApi = "http://127.0.0.1:" + closed.address().port;
      const disabledLogin = await fetch(disabledApi + "/api/auth/login", {
        method: "POST",
      });
      assert.equal(disabledLogin.headers.get("set-cookie"), null);
      assert.equal(
        (
          await fetch(disabledApi + "/api/mock/card-rpg/summon", {
            method: "POST",
          })
        ).status,
        501,
      );
    } finally {
      closed.closeAllConnections();
      await new Promise((resolve) => closed.close(resolve));
    }
    console.log(
      "Wallet browser PASS: session isolation, disabled production route, cost and balance, receipt recovery after lost response, 20 awarded slots and exact owned equipment detail.",
    );
  } finally {
    if (browser) await browser.close();
    mock.closeAllConnections();
    await new Promise((resolve) => mock.close(resolve));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
  });
  try {
    const p = await b.newPage({ viewport: { width: 844, height: 390 } }),
      url = "http://127.0.0.1:3485/games/kkulkkul-card-rpg/",
      shots = (process.env.RPG_CAPTURE_DIR || ".tmp/card-rpg-preview") + "/";
    require("node:fs").mkdirSync(shots, { recursive: true });
    p.setDefaultTimeout(12000);
    const writes = [];
    p.on("request", (r) => {
      if (r.url().includes("/api/") && r.method() === "POST")
        writes.push(r.url());
    });
    await p.route("**/*", (route) =>
      ["127.0.0.1", "localhost"].includes(
        new URL(route.request().url()).hostname,
      )
        ? route.continue()
        : route.abort(),
    );
    await p
      .context()
      .addCookies([{ name: "cd_cookie_consent", value: "essential", url }]);
    await p.goto(url);
    await p.getByRole("button", { name: "대표 캐릭터 교체" }).waitFor();
    for (const name of ["연이", "영냥이", "윤달", "서한비", "모카", "루나"]) {
      const face = p.getByRole("img", { name, exact: true });
      await face.waitFor();
      await p.waitForTimeout(1850);
      await p.getByRole("button", { name: /다음 대사/ }).click();
      await p.waitForFunction((n) => {
        const el = document.querySelector('svg[aria-label="' + n + '"]');
        return (
          el &&
          (n === "루나"
            ? el.querySelector("path")
            : Number(el.querySelector("image")?.getAttribute("x")) < 0)
        );
      }, name);
      await p.getByRole("button", { name: /대사 전체 보기/ }).click();
      assert.equal(await face.locator("image").getAttribute("x"), "0");
      await p.getByRole("button", { name: "대표 캐릭터 교체" }).click();
    }
    await p.waitForTimeout(1500);
    for (const [width, height] of [
      [800, 360],
      [844, 390],
      [915, 412],
      [1024, 768],
      [1280, 720],
      [390, 844],
    ]) {
      await p.setViewportSize({ width, height });
      assert(
        await p.locator("main button").evaluateAll((nodes) =>
          nodes.every((el) => {
            const box = el.getBoundingClientRect();
            return (
              box.width >= 44 &&
              box.height >= 44 &&
              box.right <= innerWidth + 1 &&
              (innerWidth < innerHeight || box.bottom <= innerHeight + 1)
            );
          }),
        ),
      );
    }
    await p.setViewportSize({ width: 844, height: 390 });
    await p.screenshot({
      path: shots + "pink-lobby.png",
      style: "nextjs-portal{display:none!important}",
    });
    console.log("six speakers / reveal / idle PASS");
    const btn = (n) => p.getByRole("button", { name: n, exact: true });
    await btn("소환").click();
    const shot = async (n) =>
      p.screenshot({
        path: shots + n + ".png",
        style: "nextjs-portal{display:none!important}",
      });
    await shot("summon-banner");
    const reset = async () => {
      await btn("배너로 돌아가기").click();
    };
    const scenario = async (v) => p.getByLabel("검증 시나리오").selectOption(v);
    const open = async (n, c) => btn(n + "회 소환 · " + c + "개").click();
    const start = () => btn("미리보기 시작").click();
    const results = () =>
      p.getByRole("heading", { name: "소환 결과", exact: true }).waitFor();
    await scenario("poor");
    await open(1, 40);
    assert(await btn("미리보기 시작").isDisabled());
    await btn("취소").click();
    await scenario("slow");
    await open(1, 40);
    await btn("미리보기 시작").evaluate((e) => {
      e.click();
      e.click();
    });
    await p
      .getByRole("heading", { name: "소환 응답을 기다리고 있어요" })
      .waitFor();
    await p.reload();
    await results();
    assert.equal(await p.getByRole("button", { name: /상세 보기/ }).count(), 1);
    await reset();
    await scenario("failure");
    await open(1, 40);
    await start();
    await btn("다시 시도").click();
    await results();
    await reset();
    await scenario("normal");
    await open(10, 400);
    await start();
    await btn("다음 카드").click();
    await btn("배속 1×").click();
    await btn("메뉴").click();
    await btn("소환").click();
    await btn("결과로 건너뛰기").click();
    await results();
    const cards = p.getByRole("button", { name: /상세 보기/ });
    assert.equal(await cards.count(), 10);
    const names = await cards.allTextContents();
    assert(
      names.some((x) => x.includes("NEW")) &&
        names.some((x) => x.includes("기존 보유")),
    );
    await shot("summon-results");
    await cards.first().click();
    await btn("편성").first().click();
    await btn("소환").click();
    await btn("결과 목록").click();
    assert.deepEqual(await cards.allTextContents(), names);
    await reset();
    await btn("예장 소환").click();
    await scenario("image");
    await open(1, 20);
    await start();
    await p.getByRole("heading", { name: "카드 공개" }).waitFor();
    await results();
    await cards.first().click();
    await p.getByRole("img", { name: /이미지 없음/ }).waitFor();
    await btn("예장 장착 안내").click();
    await btn("소환").click();
    await reset();
    await p.emulateMedia({ reducedMotion: "reduce" });
    await scenario("normal");
    await open(1, 20);
    await start();
    await results();
    await reset();
    await btn("캐릭터 소환").click();
    await open(10, 400);
    await start();
    await results();
    assert.deepEqual(
      (await cards.allTextContents()).map((v) => v.split(/NEW|기존 보유/)[0]),
      names.map((v) => v.split(/NEW|기존 보유/)[0]),
    );
    assert.deepEqual(writes, []);
    console.log(
      "single, ten, duplicate/new, relic, insufficient, double click, waiting, retry, back/restore, image failure, reduced motion PASS; API POSTs:",
      writes,
    );

    await p.goto(url + "#story");
    for (let i = 1; i < 6; i++) await btn("다음 문장").click();
    await p.getByRole("img", { name: "연이", exact: true }).waitFor();
    await p.getByRole("link", { name: "원작 뷰어 열기" }).waitFor();
    await p.reload();
    await p.getByRole("link", { name: "원작 뷰어 열기" }).waitFor();
    await p.getByRole("img", { name: "연이", exact: true }).waitFor();
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

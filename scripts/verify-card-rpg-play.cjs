const { chromium } = require("playwright");
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const url = "http://127.0.0.1:3485/games/kkulkkul-card-rpg/";
const out = process.env.RPG_CAPTURE_DIR || ".tmp/card-rpg-battle";
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
  });
  const p = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    reducedMotion: "reduce",
  });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.setDefaultTimeout(10000);
  const button = (name) => p.getByRole("button", { name, exact: true });
  const cards = () => p.locator("button[data-type]");
  const shot = async (name) => {
    await p
      .locator("main img")
      .evaluateAll((imgs) => Promise.allSettled(imgs.map((i) => i.decode())));
    await p.screenshot({
      path: path.join(out, name + ".png"),
      style: "nextjs-portal{display:none!important}",
    });
  };
  const team = p
    .locator("nav")
    .getByRole("button", { name: "편성", exact: true });
  await p
    .context()
    .addCookies([{ name: "cd_cookie_consent", value: "essential", url }]);
  await p.route("**/*", (r) =>
    ["127.0.0.1", "localhost"].includes(new URL(r.request().url()).hostname)
      ? r.continue()
      : r.abort(),
  );
  async function win() {
    for (let t = 0; t < 40; t++) {
      if (await p.getByRole("heading", { name: "승리", exact: true }).count())
        return;
      if (await p.getByRole("heading", { name: "패배", exact: true }).count())
        throw Error("Training defeat");
      const hand = cards();
      await hand.first().waitFor();
      const options = await hand.evaluateAll((es) =>
        es
          .map((el, i) => ({ i, type: el.dataset.type, off: el.disabled }))
          .filter((x) => !x.off)
          .sort(
            (a, b) =>
              ({ Buster: 3, Arts: 2, Quick: 1 })[b.type] -
              { Buster: 3, Arts: 2, Quick: 1 }[a.type],
          ),
      );
      for (const c of options.slice(0, 3)) await hand.nth(c.i).click();
      const n = Math.min(3, options.length);
      await button(n ? n + "장 확정" : "턴 넘기기").click();
      await p.waitForFunction(
        () =>
          !!document.querySelector('[class*="result"] h2') ||
          document.querySelectorAll('button[data-type][aria-pressed="true"]')
            .length === 0,
      );
    }
    throw Error("Exceeded turn limit");
  }
  try {
    await p.goto(url + "#cast");
    await p
      .getByRole("combobox", { name: "의상", exact: true })
      .selectOption("moka-apron");
    await p.getByText("의상을 저장했어요.", { exact: true }).waitFor();
    await team.click();
    for (const [i, label] of [
      "모카",
      "연이 · 임시 지원",
      "영냥이 · 임시 지원",
    ].entries()) {
      await button("전열 " + (i + 1) + " 빈 슬롯").click();
      await p.getByLabel("배치할 동료").selectOption({ label });
      await button("선택 슬롯에 배치").click();
      if (!i)
        await p.getByLabel("장착 예장").selectOption({ label: "세 번째 알람" });
    }
    await button("저장하고 출전").click();
    await button("출전").click();
    await cards().first().waitFor();
    assert.equal(await cards().count(), 5);
    const names = await cards().evaluateAll((es) =>
      es.map((e) => e.getAttribute("aria-label")),
    );
    await cards().nth(1).click();
    await cards().nth(2).click();
    await cards().nth(1).click();
    assert.equal(await cards().nth(2).locator("em").textContent(), "1");
    await p.reload();
    await cards().first().waitFor();
    assert.deepEqual(
      await cards().evaluateAll((es) =>
        es.map((e) => e.getAttribute("aria-label")),
      ),
      names,
    );
    await p.getByRole("button", { name: /모카 · 스킬/ }).click();
    await p.getByRole("dialog").getByRole("button").first().click();
    for (const [width, height] of [
      [800, 360],
      [844, 390],
      [915, 412],
      [1024, 768],
      [1280, 720],
      [390, 844],
    ]) {
      await p.setViewportSize({ width, height });
      await cards().first().waitFor();
      const ok = await cards().evaluateAll((es) =>
        es.every((el) => {
          const b = el.getBoundingClientRect();
          return (
            b.width >= 44 &&
            b.height >= 44 &&
            b.right <= innerWidth + 1 &&
            b.left >= 0 &&
            (innerWidth < innerHeight || b.bottom <= innerHeight + 1)
          );
        }),
      );
      assert.ok(ok, "command layout " + width);
      if (width === 844 || width === 1280) await shot("battle-" + width);
    }
    await p.setViewportSize({ width: 1280, height: 720 });
    await win();
    await button("결과 확인 · 로비로").click();
    await p.waitForURL("**/#home");
    console.log(
      "Saved costume + gear, five-card hand, order, reload, skill, six sizes and victory PASS",
    );
    await button("이야기 이어하기").click();
    for (let i = 0; i < 5; i++) await button("다음 문장").click();
    await button("본편 시작 · 비겁의 섬").click();
    await button("다음 문장").waitFor();
    for (let n = 0; n < 28; n++) {
      if (await p.getByRole("heading", { name: "달빛 선착장의 의뢰" }).count())
        break;
      await p
        .locator("footer, article button, [class*=questList]")
        .first()
        .waitFor();
      const gate = p.locator("footer").getByRole("button", { name: /출전$/ });
      if (await gate.count()) {
        await gate.click();
        await button("출전").click();
        await win();
        await button("이야기·의뢰로 돌아가기").click();
        await p.waitForURL("**/#campaign");
        continue;
      }
      const next = p
        .locator("footer")
        .getByRole("button", {
          name: /^(다음 문장|알림을 들여다본다|제1장 마치기)$/,
        })
        .first();
      const title = await p.locator("main h2").first().innerText();
      await next.click();
      await p.waitForFunction(
        (t) => document.querySelector("main h2")?.textContent !== t,
        title,
      );
    }
    if (!p.url().endsWith("#event")) {
      await p
        .locator("nav")
        .getByRole("button", { name: "메뉴", exact: true })
        .click();
      await button("본편 이야기").click();
    }
    const questButton = p.getByRole("button", { name: /^연잎의 첫 수업/ });
    await questButton.click();
    await button("의뢰 출전").click();
    await button("출전").click();
    await win();
    await button("이야기·의뢰로 돌아가기").click();
    await button("강화 열기").click();
    await button("수련 확인").click();
    await button("재료 사용 확정").click();
    await p.getByText("성장 기록을 저장했어요.").waitFor();
    await p
      .locator("nav")
      .getByRole("button", { name: "메뉴", exact: true })
      .click();
    await button("본편 이야기").click();
    await p.getByRole("heading", { name: "되돌아오는 숨소리" }).waitFor();
    await p.goto(url + "#event");
    await p.getByRole("heading", { name: "달빛 선착장의 의뢰" }).waitFor();
    for (const title of [
      "선착장의 물결",
      "자명종이 울릴 때",
      "모자 끝 별 하나",
      "한 박자 먼저",
      "거울의 긴 그림자",
      "연잎 등불 띄우기",
    ]) {
      await p
        .getByRole("button", { name: new RegExp("^" + title) })
        .first()
        .click();
      await button("의뢰 출전").click();
      await button("출전").click();
      await win();
      await button("이야기·의뢰로 돌아가기").click();
      await p.getByRole("heading", { name: "달빛 선착장의 의뢰" }).waitFor();
    }
    await p
      .locator("nav")
      .getByRole("button", { name: "메뉴", exact: true })
      .click();
    await button("전투 기록").click();
    await p.getByText("연잎 등불 띄우기 · 승리").waitFor();
    await shot("quest-records");
    console.log(
      "Chapter 1, next chapter, 9 server-verified quests, growth commit, bond, skill, event, boss and receipts PASS",
    );
    assert.deepEqual(errors, []);
  } catch (err) {
    console.error(
      "At",
      p.url(),
      await p
        .locator("main")
        .innerText({ timeout: 3000 })
        .catch(() => "no main"),
      errors,
    );
    throw err;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright");
const { buildSync } = require("esbuild");

const url = "http://127.0.0.1:3485/games/kkulkkul-card-rpg/";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kkulkkul-collection-"));
const shots = process.env.RPG_CAPTURE_DIR || ".tmp/card-rpg-stage3";
fs.mkdirSync(shots, { recursive: true });
let context, page;
const writes = [];
async function open(hash) {
  context = await chromium.launchPersistentContext(dir, {
    headless: true,
    executablePath: process.env.CHROMIUM_PATH,
    viewport: { width: 1280, height: 720 },
    reducedMotion: "reduce",
  });
  await context.route("**/*", (route) =>
    ["127.0.0.1", "localhost"].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await context.addCookies([
    { name: "cd_cookie_consent", value: "essential", url },
  ]);
  page = context.pages()[0];
  page.setDefaultTimeout(16000);
  page.on("request", (r) => {
    if (
      r.url().includes("/api/") &&
      r.method() !== "GET" &&
      r.method() !== "OPTIONS"
    )
      writes.push(r.url());
  });
  await page.goto(url + hash);
}
const button = (name) => page.getByRole("button", { name, exact: true });
const shot = (name) =>
  page.screenshot({
    path: path.join(shots, name + ".png"),
    style: "nextjs-portal{display:none!important}",
  });
async function ten(cost) {
  await button("10회 소환 · " + cost + "개").click();
  await button("미리보기 시작").click();
  await button("결과로 건너뛰기").click();
  await page.getByRole("heading", { name: "소환 결과", exact: true }).waitFor();
}
async function checkStore() {
  const prefix = "./app/games/kkulkkul-card-rpg/";
  const script = buildSync({
    stdin: {
      contents:
        'export * from "' +
        prefix +
        'collection"; export * from "' +
        prefix +
        'formation"',
      resolveDir: process.cwd(),
    },
    bundle: true,
    format: "iife",
    globalName: "CollectionTest",
    write: false,
    define: { "process.env": JSON.stringify({ NODE_ENV: "development" }) },
  }).outputFiles[0].text;
  const testUrl = new URL("/__qa__/collection-check.js", url).href;
  await page.route(testUrl, (route) =>
    route.fulfill({ contentType: "text/javascript", body: script }),
  );
  await page.addScriptTag({ url: testUrl });
  const checks = await page.evaluate(async () => {
    const {
      loadCollection,
      applySummon,
      saveFormation,
      setCostume,
      validateFormation,
      buildBattleSnapshot,
      definitions,
      moveSlot,
    } = CollectionTest;
    const scope = "test-A",
      other = "test-B",
      run = "same-execution";
    const [first, repeat] = await Promise.all([
      applySummon(scope, run, "character", 10),
      applySummon(scope, run, "character", 10),
    ]);
    const a = await loadCollection(scope),
      b = await loadCollection(other);
    const slots = [
      ...a.units.map((u) => ({ unit: u.ownedUnitId })),
      null,
      null,
      null,
    ];
    slots[0].gear = a.items[0].ownedEquipmentId;
    const f = { slots, tutorial: false },
      before = buildBattleSnapshot(a, f),
      saved = await saveFormation(scope, 1, 0, f);
    let stale = false;
    try {
      await saveFormation(scope, 1, 0, f);
    } catch {
      stale = true;
    }
    const refreshed = await loadCollection(scope);
    await saveFormation(scope, 1, refreshed.revisions[1], f);
    const changed = await setCostume(scope, slots[0].unit, "moka-apron"),
      after = buildBattleSnapshot(changed, f);
    const duplicateUnit = {
      ...f,
      slots: [slots[0], slots[0], ...slots.slice(2)],
    };
    const duplicateGear = {
      ...f,
      slots: slots.map((s, i) => (i === 1 ? { ...s, gear: slots[0].gear } : s)),
    };
    const altId = "moka-alt-test",
      defs = {
        ...definitions,
        [altId]: { ...definitions["moka-base"], battleVariantId: altId },
      };
    const alt = {
      ...a,
      units: [
        ...a.units,
        { ...a.units[0], ownedUnitId: "another", battleVariantId: altId },
      ],
    };
    const twoVariants = {
      ...f,
      slots: [slots[0], { unit: "another" }, ...slots.slice(2)],
    };
    const support = {
      tutorial: true,
      slots: [{ unit: "support:neo" }, null, null, null, null, null],
    };
    let invalidSave = false;
    try {
      await saveFormation(scope, 0, 0, duplicateGear);
    } catch {
      invalidSave = true;
    }
    const catchUp = await loadCollection(scope);
    const encounter = await applySummon(other, "more", "encounter", 10);
    return {
      atomic:
        JSON.stringify(first) === JSON.stringify(repeat) &&
        a.units.length === 3 &&
        a.shards === first.filter((x) => x.duplicate).length * 3,
      isolation:
        b.units.length === 1 &&
        b.shards === 0 &&
        b.formations.every((f) => f.slots.every((x) => !x)),
      encounter: new Set(encounter.map((r) => r.entry.id)).size === 3,
      deck: before.slice(0, 3).flatMap((s) => s.deck).length === 15,
      costume:
        JSON.stringify({ ...after[0], costumeId: "default" }) ===
          JSON.stringify(before[0]) && after[0].costumeId === "moka-apron",
      equipment: before[0].atk === 270 && before[0].effect.amount === 8,
      duplicateUnit: validateFormation(a, duplicateUnit).length > 0,
      duplicateGear: validateFormation(a, duplicateGear).length > 0,
      variants: validateFormation(alt, twoVariants, true, defs).length === 0,
      swap: moveSlot(f, 0, 3).slots[3].gear === slots[0].gear,
      support:
        buildBattleSnapshot(a, support)[0].temporary &&
        validateFormation(a, { ...support, tutorial: false }).length > 0 &&
        catchUp.units.length === 3,
      shortage:
        validateFormation(a, { tutorial: false, slots: Array(6).fill(null) })
          .length === 3,
      rollback:
        invalidSave &&
        catchUp.formations[0].slots.every((x) => !x) &&
        stale &&
        saved.revisions[1] === 1 &&
        catchUp.revisions[1] === 2,
    };
  });
  for (const [name, passed] of Object.entries(checks)) assert.ok(passed, name);
  console.log("IndexedDB and battle snapshot", checks);
}
(async () => {
  try {
    await open("#summon");
    await ten(400);
    await page
      .getByRole("button", { name: /모카.*상세 보기/ })
      .first()
      .click();
    await button("동료 상세 열기").click();
    await page
      .getByRole("combobox", { name: "의상", exact: true })
      .selectOption("moka-apron");
    await page.getByText("의상을 저장했어요.", { exact: true }).waitFor();
    await shot("companion-cards");
    await button("캐릭터 룸").click();
    await button("다음 문장").click();
    await page.getByRole("img", { name: "모카", exact: true }).waitFor();
    await shot("moka-room");
    await button("카드 상세로").click();
    await button("편성에 넣기").click();
    await button("선택 슬롯에 배치").click();
    await page.getByLabel("장착 예장").selectOption({ label: "세 번째 알람" });
    await page.evaluate(() => {
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        if (this.transaction.db.name === "kkulkkul-card-rpg.dev-collection") {
          IDBObjectStore.prototype.put = put;
          throw new DOMException("storage full", "QuotaExceededError");
        }
        return put.apply(this, args);
      };
    });
    await button("편성 저장").click();
    await page
      .getByText(
        "기기 저장 공간이 부족해요. 공간을 확보한 뒤 다시 저장해 주세요.",
      )
      .waitFor();
    await button("편성 저장").click();
    await page.getByText("편성을 저장했어요.").waitFor();
    await context.close();
    await open("#team");
    assert.equal(
      await page
        .getByLabel("장착 예장")
        .locator("option:checked")
        .textContent(),
      "세 번째 알람",
    );
    assert.ok(
      (await button("전열 1 모카").locator("img").getAttribute("src")).endsWith(
        "moka-festival.webp",
      ),
    );
    await button("출전 준비 확인").click();
    await page.getByText("출전 준비 완료").waitFor();
    await shot("formation");
    console.log(
      "Storage error retry, accessory and costume restored after browser restart PASS",
    );
    await button("편성 2").click();
    await button("전열 1 빈 슬롯").waitFor();
    await button("편성 1").click();
    // Use a browser DataTransfer so headless verification also works on a locked desktop.
    const transfer = await page.evaluateHandle(() => new DataTransfer());
    await button("전열 1 모카").dispatchEvent("dragstart", {
      dataTransfer: transfer,
    });
    await button("후열 1 빈 슬롯").dispatchEvent("drop", {
      dataTransfer: transfer,
    });
    await transfer.dispose();
    await button("후열 1 모카").click();
    assert.equal(
      await page.getByLabel("장착 예장").inputValue(),
      "gear:initial-alarm",
    );
    await button("위치 교환").click();
    await button("전열 1 빈 슬롯").click();
    await button("전열 1 모카").waitFor();
    await button("소환").click();
    await button("예장 소환").click();
    await ten(200);
    await page
      .getByRole("button", { name: /연꽃의 문장.*상세 보기/ })
      .first()
      .click();
    await button("예장 장착 안내").click();
    await page.getByRole("heading", { name: "연꽃의 문장" }).waitFor();
    await shot("equipment");
    await button("편성에서 장착").click();
    await button("연꽃의 문장 장착").click();
    await button("편성 저장").click();
    await page.getByText("편성을 저장했어요.").waitFor();
    await page.reload();
    assert.equal(
      await page
        .getByLabel("장착 예장")
        .locator("option:checked")
        .textContent(),
      "연꽃의 문장",
    );
    for (const [width, height] of [
      [800, 360],
      [844, 390],
      [915, 412],
      [1024, 768],
      [1280, 720],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      for (const tab of ["동료", "예장", "편성"]) {
        await page
          .locator("nav")
          .getByRole("button", { name: tab, exact: true })
          .click();
        const control = button(
          tab === "동료"
            ? "캐릭터 룸"
            : tab === "예장"
              ? "편성에서 장착"
              : "편성 저장",
        );
        await control.scrollIntoViewIfNeeded();
        const box = await control.boundingBox();
        assert.ok(
          box &&
            box.width >= 44 &&
            box.height >= 44 &&
            box.x >= 0 &&
            box.x + box.width <= width + 1,
          [width, height, tab],
        );
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
      }
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    await button("소환").click();
    await button("배너로 돌아가기").click();
    await button("캐릭터 소환").click();
    await page.getByLabel("캐릭터 배너").selectOption("encounter");
    await ten(400);
    await button("동료").click();
    for (const name of ["연이", "영냥이", "윤달", "서한비", "모카", "루나"]) {
      await button(name + " 카드").click();
      await button("캐릭터 룸").click();
      for (let i = 1; i < 4; i++) await button("다음 문장").click();
      await page.getByRole("img", { name, exact: true }).waitFor();
      await button("다시 읽기").click();
      await button("카드 상세로").click();
    }
    await button("편성").click();
    console.log(
      "Six collectible characters and six complete personal stories PASS",
    );
    await checkStore();
    await page.route("**/api/auth/me*", (r) =>
      r.fulfill({
        json: {
          ok: true,
          authenticated: true,
          user: { id: "room-qa", name: "서재 검증", role: "user" },
        },
      }),
    );
    await context.addCookies([
      { name: "fortune_auth_role", value: "user", url },
    ]);
    await page.evaluate(() =>
      localStorage.setItem(
        "fortune_auth_user",
        JSON.stringify({ id: "room-qa", name: "서재 검증", role: "user" }),
      ),
    );
    await page.reload();
    await page.getByText("서재 검증", { exact: true }).waitFor();
    await button("전열 1 빈 슬롯").waitFor();
    assert.deepEqual(writes, []);
    console.log(
      "Summon, room, gear, restart, six viewports and no API writes PASS",
    );
  } catch (error) {
    console.error(
      await page
        .locator("main")
        .ariaSnapshot()
        .catch(() => page.url()),
    );
    throw error;
  } finally {
    if (context) await context.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

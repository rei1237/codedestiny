const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildSync } = require("esbuild");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const sharp = require("sharp");

const dir = path.resolve("app/games/kkulkkul-card-rpg");
const assets = buildSync({
  stdin: {
    contents:
      'export { default, BattleCutIn, battleActorSheet } from "./BattleActor"; export { default as CharacterCard } from "./CharacterCard"; export { definitions, costumeArt } from "./formation";',
    resolveDir: dir,
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  loader: { ".module.css": "local-css" },
  jsx: "automatic",
  write: false,
  packages: "external",
  external: ["/images/*"],
  outfile: "preview.js",
}).outputFiles;
const bundle = assets.find((asset) => asset.path.endsWith(".js")).text;
const compiled = { exports: {} };
new Function("module", "exports", "require", bundle)(
  compiled,
  compiled.exports,
  require,
);
const Actor = compiled.exports.default;
const motions = [
  "idle",
  "enter",
  "Quick",
  "Arts",
  "Buster",
  "skill",
  "ultimate",
  "hit",
  "heavy",
  "down",
  "victory",
];
const costumes = [
  "moka-apron",
  "yun-traveler",
  "pje-rain",
  "ln-festival",
  "moka-stage",
];
const base = ["yeon", "neo", "yun", "pje", "moka", "ln"];

async function checkFrames(file, size, columns, rows) {
  const image = sharp(file),
    metadata = await image.metadata();
  assert.deepEqual(
    [metadata.width, metadata.height],
    [columns * size[0], rows * size[1]],
    file,
  );
  assert.equal(metadata.hasAlpha, true, file);
  for (let i = 0; i < columns * rows; i++) {
    const bytes = await image
      .clone()
      .extract({
        left: (i % columns) * size[0],
        top: Math.floor(i / columns) * size[1],
        width: size[0],
        height: size[1],
      })
      .extractChannel("alpha")
      .raw()
      .toBuffer();
    assert.ok(
      bytes.some((v) => v > 200) && bytes.some((v) => v < 15),
      file + " frame " + i,
    );
  }
}
function collectibleMarkup(variantId, costume = "default") {
  return renderToStaticMarkup(
    React.createElement(compiled.exports.CharacterCard, {
      variant: compiled.exports.definitions[variantId],
      costume,
    }),
  );
}
async function checkCollectibles() {
  for (const id of base) {
    const url = "/images/card-rpg/" + id + "-moonlit-card.webp";
    assert.ok(
      collectibleMarkup(id + "-base").includes(url),
      id + " illustrated card",
    );
    const { info } = await sharp("public" + url)
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.deepEqual([info.width, info.height], [700, 1050], id + " card size");
  }
  for (const key of costumes) {
    const variant = key === "moka-stage" ? key : key.split("-")[0] + "-base";
    const costume = key === "moka-stage" ? "default" : key;
    const art = compiled.exports.costumeArt(
      compiled.exports.definitions[variant],
      costume,
    );
    assert.ok(
      collectibleMarkup(variant, costume).includes(art),
      key + " collectible appearance",
    );
  }
}
async function main() {
  let rendered = 0;
  for (const key of [...base, ...costumes]) {
    const person = key.split("-")[0],
      variant = key === "moka-stage" ? key : person + "-base";
    const unit = {
      baseCharacterId: person,
      battleVariantId: variant,
      costumeId: key === variant || !key.includes("-") ? "default" : key,
    };
    const url = compiled.exports.battleActorSheet(unit);
    assert.equal(url, "/images/card-rpg/battle/" + key + ".webp");
    await checkFrames("public" + url, [320, 320], 4, 2);
    for (const motion of motions) {
      const markup = renderToStaticMarkup(
        React.createElement(Actor, { unit, motion, still: false, fast: false }),
      );
      assert.ok(
        markup.includes('data-motion="' + motion + '"') && markup.includes(url),
        key + " " + motion,
      );
      assert.ok(!markup.includes("원화 누락"), key);
      rendered++;
    }
  }
  for (const key of costumes) {
    const folder = "public/images/card-rpg/wardrobe/";
    await checkFrames(folder + key + "-dialogue.webp", [320, 384], 4, 1);
    if (key !== "moka-apron")
      assert.ok(fs.statSync(folder + key + ".webp").size > 1000);
  }
  await checkCollectibles();
  console.log(
    "Decoded all six illustrated base cards at 700×1050 and verified five costume or variant overrides.",
  );
  console.log(
    "Verified " +
      rendered +
      " battle appearance/motion combinations, 88 poses and 5 dialogue strips.",
  );
  if (process.argv.includes("--browser")) await checkMotionPlayback();
}
async function checkMotionPlayback() {
  const browser = await require("playwright").chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    });
    const css = assets.find((asset) => asset.path.endsWith(".css")).text;
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== "http://127.0.0.1:3485") return route.abort();
      if (url.pathname === "/art-check")
        return route.fulfill({
          contentType: "text/html",
          body:
            "<!doctype html><meta charset=utf-8><style>" +
            css +
            " body{background:#604256;color:#fff5ec}main{display:grid;grid-template-columns:repeat(6,1fr);gap:5px}figure{margin:0;height:155px}h1{font:18px serif}</style><h1>전투 모션 검수</h1><main></main>",
        });
      if (/^\/images\/card-rpg\/(?:battle\/)?[a-z-]+\.webp$/.test(url.pathname))
        return route.fulfill({
          path: path.join(process.cwd(), "public", url.pathname),
        });
      return route.abort();
    });
    await page.goto("http://127.0.0.1:3485/art-check");
    const shots = process.env.RPG_CAPTURE_DIR;
    if (shots) fs.mkdirSync(shots, { recursive: true });
    for (const motion of motions) {
      const markup = [...base, ...costumes]
        .map((key) => {
          const person = key.split("-")[0],
            variant = key === "moka-stage" ? key : person + "-base";
          const unit = {
            baseCharacterId: person,
            battleVariantId: variant,
            costumeId: key,
          };
          return (
            "<figure>" +
            renderToStaticMarkup(
              React.createElement(Actor, {
                unit,
                motion,
                still: false,
                fast: false,
              }),
            ) +
            "</figure>"
          );
        })
        .join("");
      await page.locator("main").evaluate((main, html) => {
        main.innerHTML = html;
      }, markup);
      await page
        .locator("main img")
        .evaluateAll((images) =>
          Promise.all(images.map((img) => img.decode())),
        );
      assert.equal(await page.locator("[data-motion]").count(), 11);
      assert.ok(
        await page.locator("[data-motion]").evaluateAll((nodes) =>
          nodes.every((node) => {
            return (
              node.getAnimations({ subtree: true }).length > 0 &&
              node.querySelector("img").clientHeight > 0
            );
          }),
        ),
        motion,
      );
      if (shots && ["Arts", "down", "victory"].includes(motion)) {
        await page.locator("main").evaluate((main) => {
          for (const a of main.getAnimations({ subtree: true })) {
            a.pause();
            a.currentTime = 240;
          }
        });
        await page.screenshot({
          path: path.join(shots, "cast-" + motion + ".png"),
        });
      }
      await page
        .locator("[data-motion]")
        .evaluateAll((nodes) =>
          nodes.forEach((node) => node.setAttribute("data-still", "true")),
        );
      assert.ok(
        await page
          .locator("[data-motion]")
          .evaluateAll((nodes) =>
            nodes.every(
              (node) => node.getAnimations({ subtree: true }).length === 0,
            ),
          ),
        motion + " reduced",
      );
    }
    await page.locator("h1").evaluate((title) => {
      title.textContent = "운명의 연대기 · 소장 원화";
    });
    await page.locator("main").evaluate(
      (main, html) => {
        main.innerHTML = html;
      },
      base.map((id) => collectibleMarkup(id + "-base")).join(""),
    );
    await page
      .locator("main img")
      .evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
    assert.equal(await page.locator("main img").count(), 6);
    assert.ok(
      await page.locator("main img").evaluateAll((images) =>
        images.every((img) => {
          const { width, height } = img.getBoundingClientRect();
          return (
            Math.abs(width / height - 2 / 3) < 0.02 && img.naturalWidth === 700
          );
        }),
      ),
      "six visible 2:3 collectible cards",
    );
    if (shots)
      await page
        .locator("main")
        .screenshot({
          path: path.join(shots, "collectible-illustrations.png"),
        });
    console.log(
      "Chromium played 11 states for 11 appearances, image decoding and static reduced motion PASS.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

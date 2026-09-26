// Offline publication pipeline: fetch only declared public art, preserve masters,
// and produce bounded WebP derivatives. Never runs as a page request or paid call.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { createHash } from "node:crypto";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const html = await readFile(resolve(root, "public/codedestiny-novel.html"), "utf8");
const map = html.match(/var BG=\{([\s\S]*?)\n\};/);
if (!map) throw new Error("BG registry missing");
const registry = runInNewContext(`({${map[1]}})`, {
  NOVEL: "https://assets.code-destiny.com/CodeDestinyNovel/",
  enc: (p) => p.split("/").map(encodeURIComponent).join("/"),
});
const output = resolve(root, "public/images/novel/mobile");
await mkdir(output, { recursive: true });
const inventory = [];
for (const [key, url] of Object.entries(registry)) {
  const bytes = url.startsWith("/") ? await readFile(resolve(root, "public", url.slice(1))) : await (async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${key}: HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  })();
  const meta = await sharp(bytes).metadata();
  // Height matters for portrait cover: cap the decoded long edge without
  // imposing a portrait crop that would erase story details on wide screens.
  const result = await sharp(bytes).resize({ width: 1280, height: 960, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78, effort: 6 }).toBuffer({ resolveWithObject: true });
  await writeFile(resolve(output, `${key}.webp`), result.data);
  inventory.push({ key, source: url, sourceBytes: bytes.length, sourceWidth: meta.width, sourceHeight: meta.height,
    path: `/images/novel/mobile/${key}.webp`, bytes: result.data.length, width: result.info.width, height: result.info.height });
}
await writeFile(resolve(root, "content/novel/mobile-assets.json"), JSON.stringify({ backgrounds: inventory }, null, 2) + "\n");
console.log(`Mobile backgrounds: ${inventory.length}, ${inventory.reduce((n,a)=>n+a.sourceBytes,0)} -> ${inventory.reduce((n,a)=>n+a.bytes,0)} bytes`);

// A single expression no longer needs the full atlas decoded on mobile.
const context = { IS_APP: () => true, location: { hostname: "code-destiny.com" } };
runInNewContext(html.slice(html.indexOf("var PROD="), html.indexOf("var S={")), context);
const source = JSON.parse(await readFile(resolve(root, "content/novel/episodes.source.json"), "utf8"));
const sprites = {}, masters = new Map();
for (const episode of source.episodes) for (const beat of episode.beats) {
  const cast = [beat.l, beat.c, beat.r, { who: beat.s, x: beat.x }].filter(Boolean);
  for (const actor of cast) for (const form of ["human", "pig"]) {
    if (!["yeon", "neo", "ln", "lns", "rab", "moka"].includes(actor.who)) continue;
    const sp = (context.spriteMaster || context.spriteFor)(actor.who, actor.x, form);
    if (!sp.sheet) continue;
    const key = sp.cls + "|" + (sp.size || "") + "|" + (sp.pos || "");
    if (sprites[key]) continue;
    if (!masters.has(sp.url)) {
      const bytes = sp.url.startsWith("/") ? await readFile(resolve(root, "public", sp.url.slice(1))) : await (async () => {
        const response = await fetch(sp.url);
        if (!response.ok) throw new Error(`sprite HTTP ${response.status}: ${sp.url}`);
        return Buffer.from(await response.arrayBuffer());
      })();
      masters.set(sp.url, bytes);
    }
    const bytes = masters.get(sp.url), meta = await sharp(bytes).metadata();
    const sizes = (sp.size || "418% 418%").split(" ").map(Number.parseFloat);
    const pos = (sp.pos || "0% 0%").split(" ").map(Number.parseFloat);
    const width = Math.round(meta.width * 100 / sizes[0]), height = Math.round(meta.height * 100 / sizes[1]);
    const left = Math.max(0, Math.min(meta.width - width, Math.round((meta.width - width) * pos[0] / 100)));
    const top = Math.max(0, Math.min(meta.height - height, Math.round((meta.height - height) * pos[1] / 100)));
    const name = `${actor.who}-${createHash("sha256").update(key).digest("hex").slice(0, 10)}.webp`;
    const result = await sharp(bytes).extract({ left, top, width, height })
      .resize({ width: 400, height: 600, fit: "inside", withoutEnlargement: true }).webp({ quality: 84, alphaQuality: 100, effort: 6 }).toBuffer({ resolveWithObject: true });
    await writeFile(resolve(output, name), result.data);
    sprites[key] = { path: `/images/novel/mobile/${name}`, width: result.info.width, height: result.info.height, bytes: result.data.length };
  }
}
await writeFile(resolve(root, "content/novel/mobile-assets.json"), JSON.stringify({ backgrounds: inventory, sprites }, null, 2) + "\n");
const bindings = Object.fromEntries(Object.entries(sprites).map(([key, sprite]) => [key, sprite.path]));
if (!/var MOBILE_SPRITES=\{[^\n]*\};/.test(html)) throw new Error("Mobile sprite registry missing");
await writeFile(resolve(root, "public/codedestiny-novel.html"), html.replace(/var MOBILE_SPRITES=\{[^\n]*\};/, `var MOBILE_SPRITES=${JSON.stringify(bindings)};`));
console.log(`Mobile expressions: ${Object.keys(sprites).length} individual frames`);

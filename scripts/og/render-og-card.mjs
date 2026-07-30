/**
 * VVIP OG 카드 HTML → PNG 렌더러
 *
 *   node scripts/og/render-og-card.mjs
 *
 * 2배 해상도(2400x1260)로 찍고 sharp 로 1200x630 으로 줄여 금박 각인/세필선의
 * 안티에일리어싱을 살린다. 결과물은 public/og/ 에 떨어진다.
 */
import { chromium } from "playwright";
import sharp from "sharp";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(HERE, "vvip-card.html");
const OUTPUT = path.join(HERE, "..", "..", "public", "og", "code-destiny-og-vvip.png");

const WIDTH = 1200;
const HEIGHT = 630;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 2,
  });
  await page.goto(pathToFileURL(SOURCE).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const raw = await page.screenshot({ type: "png" });

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await sharp(raw)
    .resize(WIDTH, HEIGHT, { kernel: "lanczos3" })
    .png({ compressionLevel: 9, palette: false })
    .toFile(OUTPUT);

  const { size } = await fs.stat(OUTPUT);
  console.log(`OK ${path.relative(process.cwd(), OUTPUT)} — ${WIDTH}x${HEIGHT}, ${(size / 1024).toFixed(0)}KB`);
} finally {
  await browser.close();
}

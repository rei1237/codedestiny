import path from "node:path";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const root = process.cwd();
const assets = path.join(root, "apps", "toss", "public", "assets");
const output = path.join(root, "docs", "toss", "assets", "products");

await mkdir(output, { recursive: true });

const background = Buffer.from(`
  <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
    <rect width="1024" height="1024" fill="#fff8ed"/>
    <circle cx="116" cy="120" r="74" fill="#fcebd8"/>
    <circle cx="914" cy="148" r="108" fill="#f8e7db"/>
    <circle cx="892" cy="882" r="156" fill="#f2ead9"/>
    <circle cx="138" cy="864" r="124" fill="#fae8df"/>
    <rect x="38" y="38" width="948" height="948" rx="92" fill="none" stroke="#e8d7c1" stroke-width="12"/>
  </svg>
`);

await sharp(path.join(assets, "root-card-yeoni.webp"))
  .resize(1024, 1024, { fit: "cover", position: "centre" })
  .flatten({ background: "#fff8ed" })
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toFile(path.join(output, "yeoni-saju-letter.png"));

for (const fish of ["mackerel", "salmon", "flounder", "tuna"]) {
  const foreground = await sharp(path.join(assets, "fish", `${fish}.webp`))
    .resize({ width: 760, kernel: sharp.kernel.nearest })
    .png()
    .toBuffer();
  const metadata = await sharp(foreground).metadata();
  await sharp(background)
    .composite([{ input: foreground, left: 132, top: Math.round((1024 - metadata.height) / 2) }])
    .flatten({ background: "#fff8ed" })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(path.join(output, `yeongnyangi-${fish}.png`));
}

for (const name of [
  "yeoni-saju-letter.png",
  "yeongnyangi-mackerel.png",
  "yeongnyangi-salmon.png",
  "yeongnyangi-flounder.png",
  "yeongnyangi-tuna.png",
]) {
  const metadata = await sharp(path.join(output, name)).metadata();
  if (metadata.width !== 1024 || metadata.height !== 1024 || metadata.hasAlpha) {
    throw new Error(`Invalid Toss product image: ${name}`);
  }
}

/**
 * Rewrites fixed marketing <img src="/fuctionassets|/icons/..."> in root index.html to
 * Next.js image optimizer URLs (same pipeline as next/image). Re-run after editing index.html.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const indexPath = resolve(rootDir, "index.html");

function opt(pathname, w) {
  return `/_next/image?url=${encodeURIComponent(pathname)}&w=${w}&q=75`;
}

function replaceSrc(html, fromPath, w) {
  const to = opt(fromPath, w);
  return html
    .split(`src="${fromPath}"`)
    .join(`src="${to}"`)
    .split(`src='${fromPath}'`)
    .join(`src='${to}'`);
}

let html = readFileSync(indexPath, "utf8");

html = html.replace(
  '<img id="dfStudioImage" src="/fuctionassets/flower.webp"',
  `<img id="dfStudioImage" src="${opt("/fuctionassets/flower.webp", 750)}"`
);

html = replaceSrc(html, "/icons/꿀꿀 운세 로고.webp", 256);
html = replaceSrc(html, "/icons/neo.webp", 256);

const tile384 = [
  "/fuctionassets/ai%20animal.webp",
  "/fuctionassets/ai%20face.webp",
  "/fuctionassets/animaltotem.webp",
  "/fuctionassets/tarolove.webp",
  "/fuctionassets/healing.webp",
  "/fuctionassets/jajongam.webp",
  "/fuctionassets/reunion.webp",
  "/fuctionassets/12animals.webp",
  "/fuctionassets/ai%20tarrot.webp",
  "/fuctionassets/tazza.webp",
  "/fuctionassets/egypt.webp",
  "/fuctionassets/juyuk.webp",
  "/fuctionassets/sukyo.webp",
  "/fuctionassets/jumsung.webp",
  "/fuctionassets/jami.webp",
  "/fuctionassets/veda.webp",
  "/fuctionassets/flower2.webp",
  "/fuctionassets/flower3.webp",
  "/fuctionassets/flower4.webp",
  "/fuctionassets/heamong.webp",
  "/fuctionassets/phydream.webp",
];
for (const p of tile384) {
  html = replaceSrc(html, p, 384);
}

html = replaceSrc(html, "/fuctionassets/flower.webp", 384);
html = replaceSrc(html, "/fuctionassets/info.webp", 1080);

html = html.replace(
  'href="/icons/neo.webp"',
  `href="${opt("/icons/neo.webp", 256)}"`
);

writeFileSync(indexPath, html, "utf8");
console.log("[patch-index-html-optimized-images] Updated index.html");

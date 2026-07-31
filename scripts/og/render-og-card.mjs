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
// 🔴 이 경로는 영구 고정이다. 디자인이 바뀌어도 파일명을 바꾸지 말고 덮어쓸 것.
//
// 카카오는 og:image URL 이 아니라 "공유된 페이지 URL" 을 키로 스크랩 결과를 캐시하고,
// 스크랩 시점의 이미지를 자기 CDN 에 복사해 둔다. 그래서 파일명을 바꿔도 캐시는 안 깨지고,
// 오히려 옛 URL 에 옛 이미지가 영구 박제되어 캐시가 만료돼도 옛 카드가 되살아난다.
// 고정 URL 을 덮어써야 어떤 소비자든 재조회하는 순간 최신 카드를 받는다.
// 이미 캐시된 미리보기를 즉시 갱신하는 방법은 카카오 디버거의 캐시 초기화뿐이다.
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

  // 카메오 캐릭터는 R2 원격 자산이라 조용히 비어 나갈 수 있다 — 실패하면 렌더를 세운다.
  const pigLoaded = await page.evaluate(() => {
    const img = document.querySelector(".cameo__pig");
    return Boolean(img && img.complete && img.naturalWidth > 0);
  });
  if (!pigLoaded) {
    throw new Error("꽃돼지 카메오 이미지를 불러오지 못했습니다 — R2 자산 URL을 확인하세요.");
  }

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

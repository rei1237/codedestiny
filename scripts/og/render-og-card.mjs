/**
 * OG 공유 카드 HTML → PNG 렌더러 (서비스별)
 *
 *   node scripts/og/render-og-card.mjs            # 모든 카드
 *   node scripts/og/render-og-card.mjs yeongnyangi # 한 장만
 *
 * 2배 해상도(2400x1260)로 찍고 sharp 로 1200x630 으로 줄여 금박 각인/세필선의
 * 안티에일리어싱을 살린다. 결과물은 public/og/ 에 떨어진다.
 *   - ggulggul    : 꿀꿀 사주(꽃돼지 연이) — 꿀꿀 셸·사이트 기본 OG(한국어)
 *   - ggulggul-*  : 같은 카드의 로케일판(vvip-card.html?lang=) — /en·/ja·/zh·/zh-tw 셸 og:image·공유 imageUrl
 *   - yeongnyangi : 영냥이 — app/yeongnyangi/** 메타·카카오 공유 imageUrl
 */
import { chromium } from "playwright";
import sharp from "sharp";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OG_DIR = path.join(HERE, "..", "..", "public", "og");

// 🔴 출력 경로는 영구 고정이다. 디자인이 바뀌어도 파일명을 바꾸지 말고 덮어쓸 것.
//
// 카카오는 og:image URL 이 아니라 "공유된 페이지 URL" 을 키로 스크랩 결과를 캐시하고,
// 스크랩 시점의 이미지를 자기 CDN 에 복사해 둔다. 그래서 파일명을 바꿔도 캐시는 안 깨지고,
// 오히려 옛 URL 에 옛 이미지가 영구 박제되어 캐시가 만료돼도 옛 카드가 되살아난다.
// 고정 URL 을 덮어써야 어떤 소비자든 재조회하는 순간 최신 카드를 받는다.
// 이미 캐시된 미리보기를 즉시 갱신하는 방법은 카카오 디버거의 캐시 초기화뿐이다.
const CARDS = [
  { id: "ggulggul", source: "vvip-card.html", output: "code-destiny-og-vvip.png" },
  { id: "ggulggul-en", source: "vvip-card.html", query: "?lang=en", output: "code-destiny-og-en.png" },
  { id: "ggulggul-ja", source: "vvip-card.html", query: "?lang=ja", output: "code-destiny-og-ja.png" },
  { id: "ggulggul-zh", source: "vvip-card.html", query: "?lang=zh-CN", output: "code-destiny-og-zh.png" },
  { id: "ggulggul-zh-tw", source: "vvip-card.html", query: "?lang=zh-TW", output: "code-destiny-og-zh-tw.png" },
  { id: "yeongnyangi", source: "yeongnyangi-card.html", output: "yeongnyangi-og.png" },
];

const WIDTH = 1200;
const HEIGHT = 630;

const only = process.argv[2];
const targets = only ? CARDS.filter((card) => card.id === only) : CARDS;
if (!targets.length) {
  console.error(`알 수 없는 카드: ${only} (가능: ${CARDS.map((card) => card.id).join(", ")})`);
  process.exit(1);
}

const browser = await chromium.launch();
try {
  for (const card of targets) {
    const page = await browser.newPage({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: 2,
    });
    await page.goto(pathToFileURL(path.join(HERE, card.source)).href + (card.query || ""), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    // 캐릭터 그림이 비어 나가면 카드가 의미를 잃는다 — 하나라도 못 불러오면 렌더를 세운다.
    const artLoaded = await page.evaluate(() => {
      const images = [...document.querySelectorAll("img")];
      return images.length > 0 && images.every((img) => img.complete && img.naturalWidth > 0);
    });
    if (!artLoaded) {
      throw new Error(`${card.id}: 캐릭터 이미지를 불러오지 못했습니다 — ${card.source} 의 img src 를 확인하세요.`);
    }

    const raw = await page.screenshot({ type: "png" });
    await page.close();

    const output = path.join(OG_DIR, card.output);
    await fs.mkdir(OG_DIR, { recursive: true });
    await sharp(raw)
      .resize(WIDTH, HEIGHT, { kernel: "lanczos3" })
      .png({ compressionLevel: 9, palette: false })
      .toFile(output);

    const { size } = await fs.stat(output);
    const hash = createHash("sha256").update(await fs.readFile(output)).digest("hex").slice(0, 10);
    console.log(`OK ${card.id}: ${path.relative(process.cwd(), output)} — ${WIDTH}x${HEIGHT}, ${(size / 1024).toFixed(0)}KB`);
    console.log(`  content hash (og:image ?v= 쿼리로 쓸 것): ${hash}`);
  }
  console.log(
    "다음: 셸 밖 og:image 참조의 ?v= 를 위 해시로 갱신 (셸 index.html 의 ?v=build-… 는 sync:public 이 배포 SHA 로 다시 찍는다)"
  );
} finally {
  await browser.close();
}

// 대표 상담 히어로·표지의 화면용 변형 — 원본 webp 옆에 -<폭>.webp 를 만든다.
// next.config 의 images.unoptimized 때문에 srcset·image-set 변형을 여기서 직접 만든다(패턴: build-master-dedicated.mjs).
//   node scripts/design/build-hero-variants.mjs
// 원본은 그대로 둔다. 다른 화면(결과 표지·공유 카드)이 원본 경로를 계속 쓴다.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WEBP = { quality: 76, effort: 6, smartSubsample: true };

// [원본, 만들 폭들]. 인생의 책 표지는 데스크톱 최대 390px(2x 780) 이라 800w 가 상한이다 — 원본폭 q76 재압축은 410→354KB 로 이득이 작았다.
const HEROES = [
  ['public/images/expert-consulting/life-book-cover-20260923.webp', [600, 800]],
  ['public/images/feature-details/new-year-ai-hero-v3.webp', [600, 1200]],
  ['public/images/feature-details/love-secret-ai-hero-v2.webp', [600]],
];

for (const [file, widths] of HEROES) {
  const source = path.join(root, file);
  const { width: sourceWidth } = await sharp(source).metadata();
  for (const width of widths) {
    if (width > sourceWidth) throw new Error(`${file}: ${width}w 는 원본 폭 ${sourceWidth} 보다 크다`);
    const target = source.replace(/\.webp$/, `-${width}.webp`);
    const info = await sharp(source).resize({ width }).webp(WEBP).toFile(target);
    console.log(`${path.relative(root, target)} ${info.width}×${info.height} ${Math.round(info.size / 1024)}KB`);
  }
}

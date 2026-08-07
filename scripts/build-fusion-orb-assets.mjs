#!/usr/bin/env node
/**
 * 초융합 오브 에셋 생성.
 *
 * 원본은 R2 `fusion/초융합2-Photoroom.webp` 를 그대로 미러한
 * public/images/fusion-fortune/fusion-orb-sheet.webp (1536×1024, 투명 배경) 한 장이다.
 * 5체계 오브가 가로로 놓이고 그 아래 Fusion Core 오브가 있으며, 그림 안에 한국어 라벨이
 * 각인돼 있다. 🔴 라벨은 잘라내지 않는다 — 각인 텍스트를 쓰면 en/ja/zh 로케일에서
 * 한국어가 박힌 이미지가 나간다. 화면의 이름표는 항상 HTML 이 그린다.
 *
 * 좌표는 눈대중이 아니라 알파 채널 bbox 로 뽑았다. 시트를 다시 그리면 이 스크립트를
 * 다시 돌려 좌표를 재확인할 것(--inspect 로 현재 bbox 를 출력한다).
 *
 * 사용:
 *   node scripts/build-fusion-orb-assets.mjs            # 크롭 생성
 *   node scripts/build-fusion-orb-assets.mjs --inspect  # 알파 bbox 만 출력
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "public/images/fusion-fortune/fusion-orb-sheet.webp");
const OUT_DIR = join(ROOT, "public/images/fusion-fortune/orbs");

/** 정사각 크롭 박스 — 알파 bbox 의 중심을 잡고 긴 변에 맞춘다(원형 마스크에 잘 앉는다). */
const ORBS = [
  { key: "saju", label: "사주", left: 34, top: 80, side: 284 },
  { key: "ziwei", label: "자미두수", left: 338, top: 87, side: 272 },
  { key: "vedic", label: "베다점", left: 631, top: 87, side: 271 },
  { key: "sukuyo", label: "숙요점", left: 920, top: 87, side: 271 },
  { key: "astrology", label: "점성술", left: 1223, top: 85, side: 273 },
  { key: "core", label: "초융합 코어", left: 547, top: 475, side: 429 },
];

/** 라벨 각인을 절대 포함하지 않도록, 크롭 하단이 라벨 밴드보다 위인지 확인한다. */
const LABEL_BANDS = [[389, 424], [452, 473], [905, 939], [964, 980]];

function overlapsLabel(top, side) {
  const bottom = top + side;
  return LABEL_BANDS.some(([y0, y1]) => bottom > y0 && top < y1);
}

async function inspect() {
  const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const alpha = (x, y) => data[(y * width + x) * channels + 3];
  for (const orb of ORBS) {
    let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1;
    for (let y = Math.max(0, orb.top); y < Math.min(height, orb.top + orb.side); y += 1) {
      for (let x = Math.max(0, orb.left); x < Math.min(width, orb.left + orb.side); x += 1) {
        if (alpha(x, y) > 24) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    console.log(`${orb.key.padEnd(10)} bbox=[${minX},${minY},${maxX - minX + 1},${maxY - minY + 1}] crop=[${orb.left},${orb.top},${orb.side}]`);
  }
}

async function build() {
  await mkdir(OUT_DIR, { recursive: true });
  const meta = await sharp(SOURCE).metadata();
  if (meta.width !== 1536 || meta.height !== 1024) {
    throw new Error(`시트 크기가 바뀌었습니다(${meta.width}×${meta.height}). 좌표를 --inspect 로 다시 확인하세요.`);
  }

  for (const orb of ORBS) {
    if (overlapsLabel(orb.top, orb.side)) {
      throw new Error(`${orb.key} 크롭이 라벨 밴드와 겹칩니다. 각인 텍스트가 이미지에 들어가면 로케일이 깨집니다.`);
    }
    const buffer = await sharp(SOURCE)
      .extract({ left: orb.left, top: orb.top, width: orb.side, height: orb.side })
      .resize(orb.key === "core" ? 512 : 320, orb.key === "core" ? 512 : 320, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 88, effort: 6 })
      .toBuffer();
    const file = join(OUT_DIR, `${orb.key}.webp`);
    await writeFile(file, buffer);
    console.log(`  ✓ ${orb.key}.webp  ${(buffer.length / 1024).toFixed(0)}KB  (${orb.label})`);
  }
  console.log(`\n${ORBS.length}개 오브를 ${OUT_DIR} 에 생성했습니다.`);
  console.log("타로 오브는 시트에 없습니다 — 화면에서는 같은 문법의 CSS 오브로 대체합니다.");
}

if (process.argv.includes("--inspect")) await inspect();
else await build();

#!/usr/bin/env node
/**
 * 상담자(연이·네오) 표정 아바타 크롭 생성.
 *
 * 왜 CSS 스프라이트를 그만뒀나:
 *   꽃돼지 시트는 1056×1488 이라 셀이 264×372(세로형)인데, 아바타 박스는 정사각이고
 *   `background-size: 400% 400%` 였다. 시트를 정사각으로 늘려 넣으니 캐릭터가 세로로
 *   71% 로 눌렸다. 게다가 백분율 좌표는 시트를 다시 그리면 조용히 어긋난다.
 *   셀을 미리 잘라 <img> 로 쓰면 왜곡도 좌표 취약성도 사라지고, 해상도도 우리가 정한다.
 *
 * 좌표는 기존 personaSprite.ts 의 background-position 백분율을 그대로 픽셀로 환산한다.
 * (background-size 400% 기준: left = X% × 0.75 × sheetWidth, 창 크기 = sheet / 4)
 * 백사자 시트 좌표는 정확한 4등분이 아니라 손으로 맞춘 값이라 이 환산이 정본이다.
 *
 * 사용:
 *   node scripts/build-persona-avatar-assets.mjs
 *   node scripts/build-persona-avatar-assets.mjs --inspect   # 크롭 박스만 출력
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public/images/fortune-chat/persona");

const SHEETS = {
  yeoni: {
    file: join(ROOT, "public/images/novel/pig-expressions.webp"),
    expect: { width: 1056, height: 1488 },
    cells: {
      greet: [0, 100],
      listen: [33.333, 0],
      read: [66.667, 33.333],
      think: [66.667, 0],
      cheer: [66.667, 66.667],
    },
  },
  neo: {
    file: join(ROOT, "public/images/novel/neo-strategy-sheet.webp"),
    expect: { width: 1254, height: 1254 },
    cells: {
      greet: [2.306, 97.065],
      listen: [63.941, 65.618],
      read: [63.941, 34.172],
      think: [2.516, 65.618],
      cheer: [95.178, 65.618],
    },
  },
};

/** background-position 백분율 → 시트 픽셀 박스. */
function cellBox(percentX, percentY, width, height) {
  const cellWidth = Math.round(width / 4);
  const cellHeight = Math.round(height / 4);
  const left = Math.round((percentX / 100) * 0.75 * width);
  const top = Math.round((percentY / 100) * 0.75 * height);
  return {
    left: Math.max(0, Math.min(left, width - cellWidth)),
    top: Math.max(0, Math.min(top, height - cellHeight)),
    width: cellWidth,
    height: cellHeight,
  };
}

const inspect = process.argv.includes("--inspect");
if (!inspect) await mkdir(OUT_DIR, { recursive: true });

for (const [persona, sheet] of Object.entries(SHEETS)) {
  const meta = await sharp(sheet.file).metadata();
  if (meta.width !== sheet.expect.width || meta.height !== sheet.expect.height) {
    throw new Error(`${persona}: 시트 크기가 바뀌었습니다(${meta.width}×${meta.height}). 좌표를 다시 확인하세요.`);
  }
  for (const [mood, [percentX, percentY]] of Object.entries(sheet.cells)) {
    const box = cellBox(percentX, percentY, meta.width, meta.height);
    if (inspect) {
      console.log(`${persona}/${mood}`.padEnd(16), JSON.stringify(box));
      continue;
    }
    // 표시 최대 186px(웰컴 카드)에 2배 DPR 여유를 둔다.
    const buffer = await sharp(sheet.file)
      .extract(box)
      .resize({ width: 384, withoutEnlargement: true })
      .webp({ quality: 90, effort: 6 })
      .toBuffer();
    const file = join(OUT_DIR, `${persona}-${mood}.webp`);
    await writeFile(file, buffer);
    console.log(`  ✓ ${persona}-${mood}.webp  ${(buffer.length / 1024).toFixed(0)}KB  (${box.width}×${box.height} → 384w)`);
  }
}

if (!inspect) console.log(`\n표정 10컷을 ${OUT_DIR} 에 생성했습니다.`);

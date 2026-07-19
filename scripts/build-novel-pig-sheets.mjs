/**
 * 비주얼 노벨용 꽃돼지 연이 스프라이트 시트 정규화 빌더
 *
 * 원본(R2) 시트는 도형이 균등 격자에 놓여 있지 않다 — 행마다 40~50px씩 아래로
 * 밀려 있어 CSS `background-size:400% 400%` 격자 크롭으로는 윗칸 발굽이 딸려 들어오고
 * 정작 그 프레임의 다리는 잘린다. 행 간 여백이 7~18px뿐이라 크롭창을 아무리 옮겨도
 * 전신을 담을 수 없으므로, 도형을 실측 좌표로 떼어내 균등 격자로 재조립한다.
 *
 * 좌표는 원본 알파 채널의 연결요소를 실측한 값이다(도형 16 + 8개).
 * 원본이 갱신되면 좌표를 다시 실측해야 한다.
 *
 * 사용: npm run novel:sheets   (선행: npm run novel:assets 로 원본 로컬 사본 확보)
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "public", "codedestinyassets", "DestinyCafe", "nobackground");
const OUT = join(ROOT, "public", "images", "novel");

/* 셀 = 최대 도형(232×328) + 여백. 머리 위 패딩을 고정해 행마다 머리 높이가 일치한다. */
const CELL_W = 264;
const CELL_H = 372;
const HEAD_PAD = 22;

/* 표정 시트(말하는 꽃돼지 연이2, 1254×1254) — 4×4 실측 도형 [x0,y0,x1,y1] */
const FACE_FIGURES = [
  [56, 36, 276, 356], [352, 32, 568, 356], [656, 32, 876, 356], [944, 28, 1168, 356],
  [56, 360, 276, 680], [352, 360, 572, 680], [652, 360, 876, 680], [948, 360, 1168, 680],
  [56, 688, 284, 944], [352, 688, 576, 944], [656, 688, 876, 944], [948, 688, 1168, 944],
  [48, 960, 280, 1236], [352, 960, 576, 1240], [644, 960, 872, 1240], [936, 960, 1164, 1240],
];

/* 동작 포즈 시트(꽃돼지5, 1774×887) — 4×2 실측 도형. 도형이 표정 시트보다 커서 축소해 맞춘다. */
const POSE_FIGURES = [
  [116, 48, 392, 436], [544, 40, 820, 404], [968, 20, 1244, 384], [1380, 40, 1652, 396],
  [120, 480, 392, 828], [552, 464, 812, 816], [960, 468, 1224, 816], [1388, 488, 1656, 844],
];
const POSE_SCALE = 224 / 272; /* 포즈 도형 평균 폭 272 → 표정 도형 평균 폭 224 */

async function buildSheet({ src, figures, cols, rows, scale, out }) {
  const image = sharp(src);
  const layers = [];
  for (let i = 0; i < figures.length; i += 1) {
    const [x0, y0, x1, y1] = figures[i];
    let fig = image.clone().extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 });
    let w = x1 - x0;
    let h = y1 - y0;
    if (scale !== 1) {
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      fig = fig.resize(w, h, { fit: "fill" });
    }
    if (w > CELL_W || h + HEAD_PAD > CELL_H) {
      throw new Error(`도형 ${i}가 셀(${CELL_W}×${CELL_H})을 넘는다: ${w}×${h}`);
    }
    const col = i % cols;
    const row = Math.floor(i / cols);
    layers.push({
      input: await fig.png().toBuffer(),
      left: col * CELL_W + Math.round((CELL_W - w) / 2),
      top: row * CELL_H + HEAD_PAD,
    });
  }

  await sharp({
    create: { width: CELL_W * cols, height: CELL_H * rows, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(layers)
    .webp({ quality: 82, alphaQuality: 100, effort: 6 })
    .toFile(out);

  console.log(`  ✓ ${out.replace(ROOT, ".")}  ${CELL_W * cols}×${CELL_H * rows}  (${cols}×${rows} 셀 ${figures.length}개)`);
}

await mkdir(OUT, { recursive: true });
console.log("꽃돼지 스프라이트 시트 정규화");
await buildSheet({
  src: join(SRC, "말하는 꽃돼지 연이2-Photoroom.png"),
  figures: FACE_FIGURES, cols: 4, rows: 4, scale: 1,
  out: join(OUT, "pig-expressions.webp"),
});
await buildSheet({
  src: join(SRC, "꽃돼지5-Photoroom.png"),
  figures: POSE_FIGURES, cols: 4, rows: 2, scale: POSE_SCALE,
  out: join(OUT, "pig-poses.webp"),
});
console.log("완료");

/**
 * 비주얼 노벨 완결부(EP.15~40) 캐스트 시트 정규화 빌더
 *
 * 1) 청토끼(4×2)·루나 언니(3×2) 시트: 원본 격자가 균등하지 않아(도형이 셀 경계를
 *    넘나듦) CSS % 크롭이 불가능하다. 알파 연결요소를 실측해 도형을 떼어내고
 *    균등 격자로 재조립한다(build-novel-pig-sheets.mjs와 동일 접근, 단 좌표는
 *    하드코딩 대신 연결요소 자동 실측 — 원본 갱신 시에도 재실행만 하면 된다).
 *    작은 파편(연기·김·낙서 효과)은 가장 가까운 큰 도형에 병합한다.
 * 2) 무성1~10 단일컷: 하단에 "N. 표정명" 라벨 텍스트가 그림에 박혀 있어
 *    본체 도형 아래를 잘라낸다(라벨은 본체와 분리된 작은 연결요소).
 *
 * 루나(루나-Photoroom.webp)는 균등 격자로 실측 확인돼 원본을 CSS로 직접 크롭한다.
 *
 * 사용: node scripts/build-novel-cast-sheets.mjs  (선행: npm run novel:assets)
 * 산출: public/images/novel/rab-sheet.webp, lunas-sheet.webp, mu-01..10.webp
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "public", "codedestinyassets", "CodeDestinyNovel");
const OUT = join(ROOT, "public", "images", "novel");
const ALPHA_MIN = 16;

async function loadRaw(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height, ch: info.channels };
}

/* 알파 연결요소 라벨링(4방향) */
function components({ data, W, H, ch }) {
  const label = new Int32Array(W * H).fill(-1);
  const comps = [];
  const stack = [];
  for (let i = 0; i < W * H; i++) {
    if (data[i * ch + 3] <= ALPHA_MIN || label[i] >= 0) continue;
    const id = comps.length;
    let minX = W, maxX = 0, minY = H, maxY = 0, count = 0;
    stack.push(i); label[i] = id;
    while (stack.length) {
      const p = stack.pop();
      const x = p % W, y = (p / W) | 0;
      count++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      const nb = [];
      if (x > 0) nb.push(p - 1);
      if (x < W - 1) nb.push(p + 1);
      if (y > 0) nb.push(p - W);
      if (y < H - 1) nb.push(p + W);
      for (const q of nb) if (label[q] < 0 && data[q * ch + 3] > ALPHA_MIN) { label[q] = id; stack.push(q); }
    }
    comps.push({ id, count, minX, minY, maxX, maxY });
  }
  return { label, comps };
}

/* 시트 재조립: 큰 도형 rows×cols개를 격자 순서로 정렬, 파편은 가장 가까운 도형에 병합 */
async function rebuildSheet(srcName, outName, cols, rows) {
  const src = await loadRaw(join(SRC, srcName));
  const { label, comps } = components(src);
  const figures = comps.filter((c) => c.count > 10000).slice(0, cols * rows);
  if (figures.length !== cols * rows) throw new Error(`${srcName}: 도형 ${figures.length}개 — ${cols * rows}개 필요`);
  const frags = comps.filter((c) => c.count > 60 && c.count <= 10000);
  const owner = new Map(); // fragment id → figure
  for (const f of frags) {
    const cx = (f.minX + f.maxX) / 2, cy = (f.minY + f.maxY) / 2;
    let best = null, bd = Infinity;
    for (const g of figures) {
      const gx = (g.minX + g.maxX) / 2, gy = (g.minY + g.maxY) / 2;
      const d = (cx - gx) * (cx - gx) + (cy - gy) * (cy - gy);
      if (d < bd) { bd = d; best = g; }
    }
    owner.set(f.id, best);
    best.minX = Math.min(best.minX, f.minX); best.maxX = Math.max(best.maxX, f.maxX);
    best.minY = Math.min(best.minY, f.minY); best.maxY = Math.max(best.maxY, f.maxY);
  }
  // 격자 순서 정렬(행: 중심 y, 열: 중심 x)
  figures.sort((a, b) => (a.minY + a.maxY) - (b.minY + b.maxY));
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = figures.slice(r * cols, (r + 1) * cols);
    row.sort((a, b) => (a.minX + a.maxX) - (b.minX + b.maxX));
    grid.push(...row);
  }
  const PAD = 8;
  const cellW = Math.max(...grid.map((g) => g.maxX - g.minX + 1)) + PAD * 2;
  const cellH = Math.max(...grid.map((g) => g.maxY - g.minY + 1)) + PAD * 2;
  const outW = cellW * cols, outH = cellH * rows;
  const out = Buffer.alloc(outW * outH * 4);
  const figOf = (id) => grid.includes(comps[id]) ? comps[id] : owner.get(id);
  for (let y = 0; y < src.H; y++) {
    for (let x = 0; x < src.W; x++) {
      const id = label[y * src.W + x];
      if (id < 0) continue;
      const g = figOf(id);
      if (!g) continue;
      const gi = grid.indexOf(g);
      if (gi < 0) continue;
      const col = gi % cols, row = (gi / cols) | 0;
      // 하단 정렬 + 가로 중앙
      const gw = g.maxX - g.minX + 1, gh = g.maxY - g.minY + 1;
      const ox = col * cellW + Math.round((cellW - gw) / 2) + (x - g.minX);
      const oy = row * cellH + (cellH - PAD - gh) + (y - g.minY);
      if (ox < col * cellW || ox >= (col + 1) * cellW || oy < row * cellH || oy >= (row + 1) * cellH) continue;
      const si = (y * src.W + x) * src.ch, di = (oy * outW + ox) * 4;
      out[di] = src.data[si]; out[di + 1] = src.data[si + 1]; out[di + 2] = src.data[si + 2]; out[di + 3] = src.data[si + 3];
    }
  }
  await sharp(out, { raw: { width: outW, height: outH, channels: 4 } }).webp({ quality: 92 }).toFile(join(OUT, outName));
  console.log(`✓ ${outName}  ${outW}x${outH} (셀 ${cellW}x${cellH}, ${cols}x${rows})`);
  return { cellW, cellH };
}

/* 무성 단일컷: 본체(최대 도형) 아래 라벨 제거 — 본체 하단 + 8px에서 크롭 */
async function cropMuLabel(i) {
  const name = `무성${i}.webp`;
  const src = await loadRaw(join(SRC, name));
  const { comps } = components(src);
  const main = comps.reduce((a, b) => (b.count > a.count ? b : a));
  const cut = Math.min(src.H, main.maxY + 9);
  await sharp(join(SRC, name)).extract({ left: 0, top: 0, width: src.W, height: cut }).webp({ quality: 92 })
    .toFile(join(OUT, `mu-${String(i).padStart(2, "0")}.webp`));
  console.log(`✓ mu-${String(i).padStart(2, "0")}.webp  ${src.W}x${cut} (원본 ${src.H}, 라벨 ${src.H - cut}px 제거)`);
}

await mkdir(OUT, { recursive: true });
await rebuildSheet("빌런 청토끼-Photoroom.webp", "rab-sheet.webp", 4, 2);
await rebuildSheet("루나 언니-Photoroom.webp", "lunas-sheet.webp", 3, 2);
for (let i = 1; i <= 10; i++) await cropMuLabel(i);
console.log("완료");

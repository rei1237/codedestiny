#!/usr/bin/env node
/**
 * 스크린샷을 판정 가능한 최소 크기로 줄인다.
 *
 * 왜 (2026-08-24 실측): 08-19 이후 세션들의 Read 결과 총량 45.5MB 중 **스크린샷이
 * 71%(32.4MB, 132회)** 였다 — 텍스트 파일 2,538회를 전부 합친 것의 2.5배다. 이미지 토큰은
 * 파일 바이트가 아니라 **치수**로 정해지고(`가로×세로/750`), 한 번 컨텍스트에 들어오면
 * 그 세션의 모든 후속 요청에서 다시 지불된다. 실측된 `desktop-full.png` 는
 * 1440×15019 = 약 28,800 토큰이었다. 그런 이미지 하나가 이후 1,000 요청 동안 살아 있으면
 * 캐시 재읽기로만 2,880만 토큰이다.
 *
 * 그래서 이 스크립트는 **바이트를 줄이지 않는다. 치수를 줄인다.** 화질 최적화가 아니다.
 *
 * 🔴 관심 영역이 분명하면 축소보다 `--crop` 이 항상 낫다 — 판정 정확도가 안 떨어지면서
 *    토큰은 훨씬 더 준다. 축소는 "어디를 봐야 할지 아직 모를 때"의 수단이다.
 *
 * 사용:
 *   node scripts/shrink-shot.mjs shot.png
 *   node scripts/shrink-shot.mjs shot.png --width 720
 *   node scripts/shrink-shot.mjs shot.png --crop 0,1200,1440,900
 *   node scripts/shrink-shot.mjs shot.png --max-height 1600 --out ./tmp
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

/** 이미지 토큰 추정식. 정확한 값은 모델이 정하지만 비교·판단에는 이 비율로 충분하다. */
const TOKENS_PER_PIXEL = 1 / 750;
const estimateTokens = (w, h) => Math.round(w * h * TOKENS_PER_PIXEL);

const DEFAULT_WIDTH = 900;
const DEFAULT_MAX_HEIGHT = 2400;

function parseArgs(argv) {
  const opts = {
    file: null,
    width: DEFAULT_WIDTH,
    maxHeight: DEFAULT_MAX_HEIGHT,
    crop: null,
    outDir: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--width") opts.width = Number(argv[++i]);
    else if (arg === "--max-height") opts.maxHeight = Number(argv[++i]);
    else if (arg === "--out") opts.outDir = argv[++i];
    else if (arg === "--crop") {
      const parts = String(argv[++i]).split(",").map(Number);
      if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
        throw new Error("--crop 은 left,top,width,height 네 숫자다");
      }
      opts.crop = { left: parts[0], top: parts[1], width: parts[2], height: parts[3] };
    } else if (!arg.startsWith("--") && !opts.file) opts.file = arg;
  }
  if (!opts.file) throw new Error("이미지 경로가 필요하다");
  if (!Number.isFinite(opts.width) || opts.width <= 0) throw new Error("--width 가 잘못됐다");
  if (!Number.isFinite(opts.maxHeight) || opts.maxHeight <= 0) {
    throw new Error("--max-height 가 잘못됐다");
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(opts.file)) throw new Error(`파일이 없다: ${opts.file}`);

  const source = sharp(opts.file);
  const meta = await source.metadata();
  const originalTokens = estimateTokens(meta.width, meta.height);

  const outDir = opts.outDir || path.dirname(opts.file);
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.basename(opts.file, path.extname(opts.file));

  console.log(`원본  ${meta.width}x${meta.height}  ~${originalTokens.toLocaleString()} 토큰`);

  // ── 크롭이 지정되면 그것만 낸다. 관심 영역이 분명한 경우라 축소도 타일도 필요 없다.
  if (opts.crop) {
    const out = path.join(outDir, `${base}.crop.png`);
    const { width, height } = await sharp(opts.file).extract(opts.crop).toFile(out);
    const tokens = estimateTokens(width, height);
    console.log(`크롭  ${width}x${height}  ~${tokens.toLocaleString()} 토큰  ${out}`);
    report(originalTokens, tokens);
    return;
  }

  // ── 폭을 기준으로 축소한다. 원본이 이미 더 좁으면 확대하지 않는다.
  const targetWidth = Math.min(opts.width, meta.width);
  const scale = targetWidth / meta.width;
  const scaledHeight = Math.round(meta.height * scale);

  // 세로가 긴 전체페이지 샷은 한 장으로 두면 여전히 비싸고, 축소만 하면 글자가 뭉갠다.
  // 타일로 쪼개면 **필요한 장만 골라 볼 수 있다** — 그게 실제 절감이다.
  if (scaledHeight > opts.maxHeight) {
    const tiles = Math.ceil(scaledHeight / opts.maxHeight);
    const resized = await sharp(opts.file).resize({ width: targetWidth }).toBuffer();
    let emitted = 0;
    for (let i = 0; i < tiles; i += 1) {
      const top = i * opts.maxHeight;
      const height = Math.min(opts.maxHeight, scaledHeight - top);
      const out = path.join(outDir, `${base}.tile${i + 1}.png`);
      await sharp(resized).extract({ left: 0, top, width: targetWidth, height }).toFile(out);
      const tokens = estimateTokens(targetWidth, height);
      emitted += tokens;
      console.log(`타일${i + 1} ${targetWidth}x${height}  ~${tokens.toLocaleString()} 토큰  ${out}`);
    }
    console.log(`\n타일 ${tiles}장 전부를 보면 ~${emitted.toLocaleString()} 토큰이다.`);
    console.log("🔴 전부 보지 마라. 필요한 타일 한 장만 Read 하는 것이 이 분할의 목적이다.");
    report(originalTokens, Math.round(emitted / tiles), `타일 1장 기준`);
    return;
  }

  const out = path.join(outDir, `${base}.small.png`);
  const { width, height } = await sharp(opts.file).resize({ width: targetWidth }).toFile(out);
  const tokens = estimateTokens(width, height);
  console.log(`축소  ${width}x${height}  ~${tokens.toLocaleString()} 토큰  ${out}`);
  report(originalTokens, tokens);
}

function report(before, after, note = "") {
  const saved = before - after;
  const pct = before > 0 ? Math.round((saved / before) * 100) : 0;
  const suffix = note ? ` (${note})` : "";
  console.log(`\n절감  ~${saved.toLocaleString()} 토큰 (${pct}%)${suffix}`);
  console.log("이 절감은 1회가 아니라 세션의 남은 모든 요청에 걸쳐 반복된다.");
}

main().catch((err) => {
  console.error(`[shrink-shot] ${err.message}`);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * 마스터 대기 모션 스프라이트 빌드(F, 2026-11-22). 참고 구현: scripts/sprites/prepare-yeoni.mjs.
 *
 *   node scripts/sprites/build-master-motion.mjs scripts/sprites/master-motion/<id>.json            # 시트·포스터·매니페스트 생성
 *   node scripts/sprites/build-master-motion.mjs scripts/sprites/master-motion/<id>.json --report   # 1차 픽셀 검수만(파일 안 씀)
 *
 * 원칙
 * - 캐릭터를 다시 그리지 않는다. 기본 칸은 정본 초상 그대로이고, 편집 생성물(D:\CodeDestiny-Build)은
 *   정본에 맞춰 위치·배율을 맞춘 뒤 spec 의 영역(눈·입 등 타원)만 페더 마스크로 정본 위에 얹는다.
 * - 1차 검수(fail-closed): 영역 밖(얼굴 윤곽·의상) 평균 차이가 qa.maxGuardDiff 를 넘거나,
 *   영역 안 변화가 qa.minRegionDiff 보다 작으면 그 프레임을 쓰는 빌드는 실패한다.
 * - 시트는 재생 순서대로 한 줄(cols === frames). 용량이 lib/master-motion/sheets.mjs 의 상한을 넘으면 실패한다.
 */
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve, posix } from "node:path";
import { MASTER_MOTION_BUDGETS, MASTER_MOTION_FRAME_MS, MASTER_MOTION_MAX_FRAMES, MASTER_MOTION_MIN_FRAMES } from "../../lib/master-motion/sheets.mjs";

const [specPath, ...flags] = process.argv.slice(2);
if (!specPath) fail("사용법: node scripts/sprites/build-master-motion.mjs <spec.json> [--report]");
const reportOnly = flags.includes("--report");
const spec = JSON.parse(await readFile(resolve(specPath), "utf8"));

function fail(message) {
  console.error(`[build-master-motion] FAIL: ${message}`);
  process.exit(1);
}
const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

for (const key of ["id", "base", "sourceDir", "out", "input", "registration", "qa", "frames", "sequence", "variants", "webp"]) {
  if (spec[key] === undefined) fail(`spec.${key} 가 없다`);
}
if (!/^[a-z0-9-]+$/.test(spec.id)) fail(`id 형식: ${spec.id}`);
if (!spec.out.startsWith("public/images/master-motion/")) fail(`out 은 public/images/master-motion/ 아래여야 한다: ${spec.out}`);

const baseMeta = await sharp(spec.base).metadata();
const W = baseMeta.width, H = baseMeta.height;
const portraitBudget = MASTER_MOTION_BUDGETS.portrait;
if (W !== portraitBudget.width || H !== portraitBudget.height) fail(`정본 초상 크기 ${W}x${H} ≠ ${portraitBudget.width}x${portraitBudget.height}`);
const baseRgb = await sharp(spec.base).removeAlpha().raw().toBuffer();

const luma = (buf, i) => 0.299 * buf[i] + 0.587 * buf[i + 1] + 0.114 * buf[i + 2];

/** 생성물(정사각 패딩 캔버스)을 배율 s 로 맞춘 RGB 버퍼와 그 크기. */
async function scaledRaw(file, s) {
  const size = Math.round(spec.input.paddedSize * s);
  const buffer = await sharp(file).removeAlpha().resize(size, size, { kernel: "lanczos3" }).raw().toBuffer();
  return { size, buffer };
}

/** 정본 좌표 (x,y) → 배율 캔버스 좌표. 중심을 맞추고 (dx,dy) 만큼 민다. */
function mapper(size, dx, dy) {
  const off = (size - spec.input.paddedSize) / 2;
  return (x, y) => [Math.round(x + spec.input.padLeft + off + dx), Math.round(y + (spec.input.padTop ?? 0) + off + dy)];
}

/** region 은 타원 { cx, cy, rx, ry, feather } 하나 또는 그 배열(두 눈처럼 떨어진 영역). 겹치면 큰 무게를 쓴다. */
function ellipseWeight(region, x, y) {
  if (!region) return 0;
  if (Array.isArray(region)) return region.reduce((max, one) => Math.max(max, ellipseWeight(one, x, y)), 0);
  const d = Math.hypot((x - region.cx) / region.rx, (y - region.cy) / region.ry);
  const inner = 1, outer = 1 + region.feather / Math.min(region.rx, region.ry);
  if (d <= inner) return 1;
  if (d >= outer) return 0;
  const t = (outer - d) / (outer - inner);
  return t * t * (3 - 2 * t);
}

/** 위치·배율 맞춤: 등록 상자에서 영역(타원+페더) 밖 밝기 차이 합이 가장 작은 (s,dx,dy). */
async function register(file, region) {
  const box = spec.registration.box;
  const max = spec.registration.maxShift ?? 10;
  let best = null;
  for (const s of spec.registration.scales ?? [1]) {
    const { size, buffer } = await scaledRaw(file, s);
    const scan = (dx, dy, step) => {
      const map = mapper(size, dx, dy);
      let sum = 0, n = 0;
      for (let y = box.top; y < box.top + box.height; y += step) for (let x = box.left; x < box.left + box.width; x += step) {
        if (ellipseWeight(region, x, y) > 0) continue;
        const [gx, gy] = map(x, y);
        if (gx < 0 || gy < 0 || gx >= size || gy >= size) { sum += 255; n += 1; continue; }
        sum += Math.abs(luma(baseRgb, (y * W + x) * 3) - luma(buffer, (gy * size + gx) * 3)); n += 1;
      }
      return sum / n;
    };
    let local = null;
    for (let dy = -max; dy <= max; dy += 2) for (let dx = -max; dx <= max; dx += 2) {
      const score = scan(dx, dy, 3);
      if (!local || score < local.score) local = { dx, dy, score };
    }
    for (let dy = local.dy - 1; dy <= local.dy + 1; dy += 1) for (let dx = local.dx - 1; dx <= local.dx + 1; dx += 1) {
      const score = scan(dx, dy, 1);
      if (!best || score < best.score) best = { s, dx, dy, score, size, buffer };
    }
  }
  return best;
}

/** 맞춘 생성물을 정본 크기 RGB 로 뽑는다(캔버스 밖은 정본 픽셀). */
function alignedRgb(reg) {
  const map = mapper(reg.size, reg.dx, reg.dy);
  const out = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const [gx, gy] = map(x, y);
    const o = (y * W + x) * 3;
    if (gx < 0 || gy < 0 || gx >= reg.size || gy >= reg.size) { baseRgb.copy(out, o, o, o + 3); continue; }
    reg.buffer.copy(out, o, (gy * reg.size + gx) * 3, (gy * reg.size + gx) * 3 + 3);
  }
  return out;
}

/** 1차 검수 수치와, 영역만 정본 위에 얹은 프레임. 영역 둘레 고리에서 채널 평균을 정본에 맞춘다(색 틀어짐 보정). */
// 수치는 8px 블록 평균 밝기 차이다. 편집 생성물은 그림 전체를 다시 그려 픽셀 단위 결 차이(평균 10 안팎)가 늘 있으므로,
// 결이 아니라 구조(윤곽·명암 배치)가 같은지를 본다. guard = 등록 상자 안에서 영역과 겹치지 않는 블록, region = 중심이 영역 안인 블록.
const BLOCK = 8;
function compose(aligned, region) {
  const box = spec.registration.box;
  let guardSum = 0, guardN = 0, wholeSum = 0, wholeN = 0, regionSum = 0, regionN = 0;
  for (let by = 0; by + BLOCK <= H; by += BLOCK) for (let bx = 0; bx + BLOCK <= W; bx += BLOCK) {
    let signed = 0, touches = false;
    for (let y = by; y < by + BLOCK; y += 1) for (let x = bx; x < bx + BLOCK; x += 1) {
      const i = (y * W + x) * 3;
      signed += luma(aligned, i) - luma(baseRgb, i);
      if (ellipseWeight(region, x, y) > 0) touches = true;
    }
    const diff = Math.abs(signed / (BLOCK * BLOCK));
    if (ellipseWeight(region, bx + BLOCK / 2, by + BLOCK / 2) >= 1) { regionSum += diff; regionN += 1; }
    if (touches) continue;
    wholeSum += diff; wholeN += 1;
    if (bx >= box.left && bx + BLOCK <= box.left + box.width && by >= box.top && by + BLOCK <= box.top + box.height) { guardSum += diff; guardN += 1; }
  }
  const ring = [0, 0, 0], ringBase = [0, 0, 0];
  let ringN = 0;
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const w = ellipseWeight(region, x, y);
    if (w <= 0 || w >= 1) continue;
    const i = (y * W + x) * 3;
    for (let c = 0; c < 3; c += 1) { ring[c] += aligned[i + c]; ringBase[c] += baseRgb[i + c]; }
    ringN += 1;
  }
  const shift = ring.map((v, c) => (ringN ? (ringBase[c] - v) / ringN : 0));
  const out = Buffer.from(baseRgb);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const w = ellipseWeight(region, x, y);
    if (!w) continue;
    const i = (y * W + x) * 3;
    for (let c = 0; c < 3; c += 1) {
      const edited = Math.min(255, Math.max(0, aligned[i + c] + shift[c]));
      out[i + c] = Math.round(baseRgb[i + c] * (1 - w) + edited * w);
    }
  }
  const round = (v) => Math.round(v * 100) / 100;
  return {
    frame: out,
    qa: { guardDiff: round(guardSum / guardN), wholeDiff: round(wholeSum / wholeN), regionDiff: round(regionN ? regionSum / regionN : 0), colorShift: shift.map(round) },
  };
}

/** 영역 후보를 찾기 위한 변화 상자(등록 상자 안에서 밝기 차이 > threshold 인 픽셀의 범위·무게중심). */
function changeBox(aligned, threshold = 28) {
  const box = spec.registration.box;
  let left = W, right = -1, top = H, bottom = -1, sx = 0, sy = 0, n = 0;
  for (let y = box.top; y < box.top + box.height; y += 1) for (let x = box.left; x < box.left + box.width; x += 1) {
    const i = (y * W + x) * 3;
    if (Math.abs(luma(baseRgb, i) - luma(aligned, i)) <= threshold) continue;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); sx += x; sy += y; n += 1;
  }
  return n ? { left, top, right, bottom, cx: Math.round(sx / n), cy: Math.round(sy / n), pixels: n } : null;
}

const results = {};
for (const [name, frame] of Object.entries(spec.frames)) {
  if (name === "base") fail("frames 에 base 를 두지 않는다(base 는 정본 초상 자체다)");
  const file = join(spec.sourceDir, frame.file);
  if (!existsSync(file)) { results[name] = { missing: file }; continue; }
  const reg = await register(file, frame.region);
  const aligned = alignedRgb(reg);
  const { frame: composed, qa } = compose(aligned, frame.region);
  const pass = Boolean(frame.region) && qa.guardDiff <= spec.qa.maxGuardDiff && qa.regionDiff >= spec.qa.minRegionDiff;
  results[name] = {
    file, sourceSha256: sha256(await readFile(file)),
    registration: { scale: reg.s, dx: reg.dx, dy: reg.dy, score: Math.round(reg.score * 100) / 100 },
    qa: { ...qa, pass }, changeBox: changeBox(aligned), composed,
  };
}

const printable = Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { ...v, composed: undefined }]));
console.log(JSON.stringify({ id: spec.id, thresholds: spec.qa, frames: printable }, null, 2));

if (reportOnly) {
  if (spec.reportDir) {
    await mkdir(spec.reportDir, { recursive: true });
    for (const [name, r] of Object.entries(results)) if (r.composed) await sharp(r.composed, { raw: { width: W, height: H, channels: 3 } }).png().toFile(join(spec.reportDir, `${spec.id}-${name}.png`));
    console.log(`[build-master-motion] 검수용 합성 프레임: ${spec.reportDir}`);
  }
  process.exit(0);
}

// ---- 빌드 ----
const sequence = spec.sequence;
if (!Array.isArray(sequence) || sequence.length < MASTER_MOTION_MIN_FRAMES || sequence.length > MASTER_MOTION_MAX_FRAMES) {
  fail(`sequence 칸 수 ${sequence?.length} 는 ${MASTER_MOTION_MIN_FRAMES}~${MASTER_MOTION_MAX_FRAMES} 여야 한다`);
}
for (const name of sequence) {
  if (name === "base") continue;
  const r = results[name];
  if (!r) fail(`sequence 의 ${name} 가 frames 에 없다`);
  if (r.missing) fail(`원본 생성물이 없다: ${r.missing}`);
  if (!r.qa.pass) fail(`1차 검수 불합격 프레임 ${name}: ${JSON.stringify(r.qa)}`);
}
const cells = sequence.map((name) => (name === "base" ? baseRgb : results[name].composed));
await mkdir(spec.out, { recursive: true });
const publicUrl = (file) => "/" + posix.relative("public", posix.join(spec.out, file));

const manifest = { id: spec.id, frameMs: MASTER_MOTION_FRAME_MS, sequence, base: spec.base, baseSha256: sha256(await readFile(spec.base)), variants: {} };
for (const [variantName, variant] of Object.entries(spec.variants)) {
  const budget = MASTER_MOTION_BUDGETS[variant.kind];
  if (!budget) fail(`알 수 없는 kind: ${variant.kind}`);
  const toCell = (rgb) => {
    let img = sharp(rgb, { raw: { width: W, height: H, channels: 3 } });
    if (variant.kind === "avatar") {
      const { left, top, size } = variant.crop;
      img = img.extract({ left, top, width: size, height: size });
    }
    return img.resize(budget.width, budget.height, { kernel: "lanczos3" }).raw().toBuffer();
  };
  const cellBuffers = await Promise.all(cells.map(toCell));
  const posterBuffer = await toCell(baseRgb);
  const composites = await Promise.all(cellBuffers.map(async (buffer, index) => ({
    input: await sharp(buffer, { raw: { width: budget.width, height: budget.height, channels: 3 } }).png().toBuffer(),
    left: index * budget.width, top: 0,
  })));
  const sheetFile = `${variantName}-sheet.webp`, posterFile = `${variantName}-poster.webp`;
  const quality = spec.webp[variant.kind] ?? spec.webp.default;
  const sheet = await sharp({ create: { width: budget.width * cells.length, height: budget.height, channels: 3, background: { r: 0, g: 0, b: 0 } } })
    .composite(composites).webp({ quality: quality.sheet, effort: 6, smartSubsample: true }).toBuffer();
  const poster = await sharp(posterBuffer, { raw: { width: budget.width, height: budget.height, channels: 3 } })
    .webp({ quality: quality.poster, effort: 6, smartSubsample: true }).toBuffer();
  if (sheet.length > budget.sheetBytes) fail(`${variantName} 시트 ${sheet.length}B > 상한 ${budget.sheetBytes}B`);
  if (poster.length > budget.posterBytes) fail(`${variantName} 포스터 ${poster.length}B > 상한 ${budget.posterBytes}B`);
  await writeFile(join(spec.out, sheetFile), sheet);
  await writeFile(join(spec.out, posterFile), poster);
  manifest.variants[variantName] = {
    kind: variant.kind,
    poster: publicUrl(posterFile), posterBytes: poster.length,
    sheet: { src: publicUrl(sheetFile), frames: cells.length, cols: cells.length, cell: { width: budget.width, height: budget.height } },
    sheetBytes: sheet.length,
    ...(variant.crop ? { crop: variant.crop } : {}),
  };
}
manifest.qa = Object.fromEntries(sequence.filter((n) => n !== "base").map((n) => [n, { ...results[n].qa, registration: results[n].registration }]));
await writeFile(join(spec.out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

const provenance = {
  ...spec.provenance,
  id: spec.id,
  built: new Date().toISOString().slice(0, 10),
  builder: "scripts/sprites/build-master-motion.mjs",
  spec: specPath.replaceAll("\\", "/"),
  base: { path: spec.base, sha256: manifest.baseSha256 },
  sources: Object.fromEntries(sequence.filter((n) => n !== "base").map((n) => [n, { file: results[n].file.replaceAll("\\", "/"), sha256: results[n].sourceSha256, region: spec.frames[n].region, prompt: spec.frames[n].prompt }])),
  operation: "정본 초상을 기본 칸으로 쓰고, 편집 생성물을 정본에 위치·배율 맞춤 뒤 영역(타원·페더)만 합성했다. 한 줄 WebP 시트와 포스터로 내보냈다.",
};
await writeFile(join(spec.out, "provenance.json"), JSON.stringify(provenance, null, 2) + "\n");
console.log(JSON.stringify({ out: spec.out, variants: Object.fromEntries(Object.entries(manifest.variants).map(([k, v]) => [k, { sheetBytes: v.sheetBytes, posterBytes: v.posterBytes, frames: v.sheet.frames }])) }, null, 2));

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
 * - frame.keep(선택): 영역 안이지만 정본을 그대로 둘 타원(점·머리카락 가닥 등 생성물이 다시 그려 어긋난 곳).
 *   keep 안은 정본 무늬 + 바깥 고리의 톤 차(applyKeep). 등록·색 보정 고리·검수 블록 분류는 영역(region)만으로 정하고,
 *   keep 핵심과 겹치는 블록은 region 수치에서 뺀다(바뀌지 않는 곳을 변화량으로 세지 않는다).
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
// portrait·avatar 는 600×720 정본 초상에서 만든다. patch(F7 영냥이)는 정본 크기 그대로의 부분 사각형이라 크기를 묻지 않는다.
const needsPortraitBase = Object.values(spec.variants).some((variant) => variant.kind !== "patch");
if (needsPortraitBase && (W !== portraitBudget.width || H !== portraitBudget.height)) fail(`정본 초상 크기 ${W}x${H} ≠ ${portraitBudget.width}x${portraitBudget.height}`);
const baseRgb = await sharp(spec.base).removeAlpha().raw().toBuffer();
// 투명 배경 정본(영냥이)의 알파. patch 칸은 이 알파를 그대로 붙인다(합성 영역은 몸 안 불투명 영역이어야 한다).
const baseAlpha = baseMeta.hasAlpha ? await sharp(spec.base).ensureAlpha().extractChannel(3).raw().toBuffer() : null;

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
function compose(aligned, region, keep) {
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
    if (ellipseWeight(region, bx + BLOCK / 2, by + BLOCK / 2) >= 1 && !keepTouches(keep, bx, by)) { regionSum += diff; regionN += 1; }
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
  // edited = 색 보정한 생성물(영역 무게 > 0 인 곳만, 나머지는 정본). patch 는 이것을 알파 = 무게로 정본 <img> 위에 얹는다.
  const edited = Buffer.from(baseRgb);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const w = ellipseWeight(region, x, y);
    if (!w) continue;
    const i = (y * W + x) * 3;
    for (let c = 0; c < 3; c += 1) {
      edited[i + c] = Math.round(Math.min(255, Math.max(0, aligned[i + c] + shift[c])));
      out[i + c] = Math.round(baseRgb[i + c] * (1 - w) + edited[i + c] * w);
    }
  }
  applyKeep(out, keep);
  const round = (v) => Math.round(v * 100) / 100;
  return {
    frame: out,
    edited,
    qa: { guardDiff: round(guardSum / guardN), wholeDiff: round(wholeSum / wholeN), regionDiff: round(regionN ? regionSum / regionN : 0), colorShift: shift.map(round) },
  };
}

/**
 * keep 타원마다 정본 무늬를 되돌리되 밝기는 주변 합성 피부에 맞춘다. 편집이 눈가 피부 톤을 몇 단계 바꾸면
 * 정본을 그대로 붙인 자리가 밝은/어두운 원반으로 남기 때문이다(F5 hanbi 점, visual-checker).
 * 톤 = keep 바깥 3px 고리에서 (합성 − 정본) 채널 평균.
 */
function applyKeep(out, keep) {
  for (const k of keep ? [keep].flat() : []) {
    const outer = 1 + k.feather / Math.min(k.rx, k.ry), ringOuter = outer + 3 / Math.min(k.rx, k.ry);
    const x0 = Math.max(0, Math.floor(k.cx - k.rx * ringOuter)), x1 = Math.min(W - 1, Math.ceil(k.cx + k.rx * ringOuter));
    const y0 = Math.max(0, Math.floor(k.cy - k.ry * ringOuter)), y1 = Math.min(H - 1, Math.ceil(k.cy + k.ry * ringOuter));
    const tone = [0, 0, 0];
    let n = 0;
    for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
      const d = Math.hypot((x - k.cx) / k.rx, (y - k.cy) / k.ry);
      if (d < outer || d > ringOuter) continue;
      const i = (y * W + x) * 3;
      for (let c = 0; c < 3; c += 1) tone[c] += out[i + c] - baseRgb[i + c];
      n += 1;
    }
    if (n) for (let c = 0; c < 3; c += 1) tone[c] /= n;
    for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
      const wk = ellipseWeight(k, x, y);
      if (!wk) continue;
      const i = (y * W + x) * 3;
      for (let c = 0; c < 3; c += 1) {
        const kept = Math.min(255, Math.max(0, baseRgb[i + c] + tone[c]));
        out[i + c] = Math.round(out[i + c] * (1 - wk) + kept * wk);
      }
    }
  }
}

/** 블록 안에 keep 핵심(무게 1) 픽셀이 있는가. */
function keepTouches(keep, bx, by) {
  if (!keep) return false;
  for (let y = by; y < by + BLOCK; y += 1) for (let x = bx; x < bx + BLOCK; x += 1) if (ellipseWeight(keep, x, y) >= 1) return true;
  return false;
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
  const { frame: composed, edited, qa } = compose(aligned, frame.region, frame.keep);
  const pass = Boolean(frame.region) && qa.guardDiff <= spec.qa.maxGuardDiff && qa.regionDiff >= spec.qa.minRegionDiff;
  results[name] = {
    file, sourceSha256: sha256(await readFile(file)),
    registration: { scale: reg.s, dx: reg.dx, dy: reg.dy, score: Math.round(reg.score * 100) / 100 },
    qa: { ...qa, pass }, changeBox: changeBox(aligned), composed, edited,
  };
}

const printable = Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { ...v, composed: undefined, edited: undefined }]));
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

/**
 * patch: 정본 위에 겹칠 부분 사각형(area)만 정본 배율 그대로 잘라 한 줄 시트로 만든다. 포스터는 없다 — 화면의 정본 <img> 가 포스터다.
 * 모든 합성 영역(타원+페더)이 area 안에 있어야 하고(밖이면 잘린 칸이 정본과 어긋난다), area 의 알파가 qa.minPatchAlpha 이상이어야
 * 한다(투명 윤곽이 들어오면 겹친 곳의 반투명 가장자리가 진해진다).
 * 칸의 색은 색 보정한 생성물, 알파는 영역 무게 × 정본 알파다. 영역 밖은 투명이라 화면의 <img>(hero-480 처럼 해상도가 다른 파일일 수 있다)가
 * 그대로 보이고, 페더 고리에서는 브라우저가 <img> 와 생성물을 섞는다. 불투명 사각형을 덮으면 선명도가 다른 파일 위에서 사각형 이음매가 남는다.
 */
async function buildPatch(variantName, variant, budget) {
  const area = variant.area;
  if (!area || area.left < 0 || area.top < 0 || area.left + area.width > W || area.top + area.height > H) fail(`${variantName} area 가 정본 밖이다: ${JSON.stringify(area)}`);
  if (area.width > budget.maxWidth || area.height > budget.maxHeight) fail(`${variantName} area ${area.width}x${area.height} > ${budget.maxWidth}x${budget.maxHeight}`);
  for (const name of sequence.filter((n) => n !== "base")) {
    for (const one of [spec.frames[name].region].flat()) {
      const grow = 1 + one.feather / Math.min(one.rx, one.ry);
      if (one.cx - one.rx * grow < area.left || one.cx + one.rx * grow > area.left + area.width || one.cy - one.ry * grow < area.top || one.cy + one.ry * grow > area.top + area.height) {
        fail(`${variantName}: ${name} 영역 ${JSON.stringify(one)} 이 area 밖으로 나간다`);
      }
    }
  }
  const minAlpha = spec.qa.minPatchAlpha ?? 250;
  if (baseAlpha) for (let y = area.top; y < area.top + area.height; y += 1) for (let x = area.left; x < area.left + area.width; x += 1) {
    if (baseAlpha[y * W + x] < minAlpha) fail(`${variantName} area 안 (${x},${y}) 알파 ${baseAlpha[y * W + x]} < ${minAlpha}`);
  }
  for (const name of sequence) if (name !== "base" && spec.frames[name].keep) fail(`${variantName}: patch 는 keep 을 지원하지 않는다(${name}). 영역을 줄여 정본을 남긴다`);
  const cellRgba = (name) => {
    const out = Buffer.alloc(area.width * area.height * 4);
    if (name === "base") return out; // 정본 칸 = 완전 투명(아래 <img> 가 그대로 보인다)
    const { edited } = results[name];
    const region = spec.frames[name].region;
    for (let y = 0; y < area.height; y += 1) for (let x = 0; x < area.width; x += 1) {
      const px = area.left + x, py = area.top + y;
      const s = py * W + px, o = (y * area.width + x) * 4;
      const w = ellipseWeight(region, px, py);
      if (!w) continue;
      edited.copy(out, o, s * 3, s * 3 + 3);
      out[o + 3] = Math.round(w * (baseAlpha ? baseAlpha[s] : 255));
    }
    return out;
  };
  const composites = await Promise.all(sequence.map(async (name, index) => ({
    input: await sharp(cellRgba(name), { raw: { width: area.width, height: area.height, channels: 4 } }).png().toBuffer(),
    left: index * area.width, top: 0,
  })));
  const quality = spec.webp[variant.kind] ?? spec.webp.default;
  const sheet = await sharp({ create: { width: area.width * cells.length, height: area.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(composites).webp({ quality: quality.sheet, alphaQuality: 100, effort: 6, smartSubsample: true }).toBuffer();
  if (sheet.length > budget.sheetBytes) fail(`${variantName} 시트 ${sheet.length}B > 상한 ${budget.sheetBytes}B`);
  const sheetFile = `${variantName}-sheet.webp`;
  await writeFile(join(spec.out, sheetFile), sheet);
  manifest.variants[variantName] = {
    kind: variant.kind,
    sheet: { src: publicUrl(sheetFile), frames: cells.length, cols: cells.length, cell: { width: area.width, height: area.height } },
    sheetBytes: sheet.length,
    area: { left: area.left, top: area.top, width: area.width, height: area.height },
    canvas: { width: W, height: H },
  };
}

for (const [variantName, variant] of Object.entries(spec.variants)) {
  const budget = MASTER_MOTION_BUDGETS[variant.kind];
  if (!budget) fail(`알 수 없는 kind: ${variant.kind}`);
  if (variant.kind === "patch") { await buildPatch(variantName, variant, budget); continue; }
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
  sources: Object.fromEntries(sequence.filter((n) => n !== "base").map((n) => [n, { file: results[n].file.replaceAll("\\", "/"), sha256: results[n].sourceSha256, region: spec.frames[n].region, ...(spec.frames[n].keep ? { keep: spec.frames[n].keep } : {}), prompt: spec.frames[n].prompt }])),
  operation: spec.provenance?.operation ?? "정본 초상을 기본 칸으로 쓰고, 편집 생성물을 정본에 위치·배율 맞춤 뒤 영역(타원·페더)만 합성했다. 한 줄 WebP 시트와 포스터로 내보냈다.",
};
await writeFile(join(spec.out, "provenance.json"), JSON.stringify(provenance, null, 2) + "\n");
console.log(JSON.stringify({ out: spec.out, variants: Object.fromEntries(Object.entries(manifest.variants).map(([k, v]) => [k, { sheetBytes: v.sheetBytes, posterBytes: v.posterBytes, frames: v.sheet.frames }])) }, null, 2));

#!/usr/bin/env node
// Build shipped WebP/PNG derivatives for the destiny-bias (K-POP chemistry card) art set.
// Idempotent: reads original PNGs (outside the repo) and (re)writes public/images/destiny-bias/**.
//   node scripts/idol-chemi/build-art-derivatives.mjs [--originals <dir>] [--contact-sheet <png>] [--only <asset,...>]
// Originals are named `<asset>-a<attempt>.png`; SELECTION pins which attempt ships for each asset.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const ORIGINALS = opt('--originals', 'D:/Development/yeoni-garden-art/source/destiny-bias');
const CONTACT = opt('--contact-sheet', path.join(ORIGINALS, 'contact-sheet.png'));
const ONLY = opt('--only', '') ? opt('--only', '').split(',') : null;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'public', 'images', 'destiny-bias');
const WEBP = { quality: 82, effort: 6 };
const KB = 1024;

// asset -> attempt that ships (update after visual review; rejected assets are omitted)
export const SELECTION = {
  'home-card': 3, hero: 2, 'frame-member': 1,
  's-01': 1, 's-02': 1, 's-03': 1, 's-04': 1, 's-05': 1, 's-06': 1,
  telepathy: 1, 'same-wave': 1, 'accel-brake': 1, 'locked-in': 1, 'quiet-care': 1,
  'hype-charger': 1, 'push-pull': 1, 'cross-learn': 1, 'slow-burn': 1,
  'card-bg': 2, 'share-bg-square': 2, 'share-bg-story': 2,
  loading: 1, empty: 1, error: 1,
};

// Shipped derivative spec. kind: cover (opaque centre crop), og (png centre crop), story (opaque fit+pad), contain (transparent)
const TYPES = ['telepathy', 'same-wave', 'accel-brake', 'locked-in', 'quiet-care', 'hype-charger', 'push-pull', 'cross-learn', 'slow-burn'];
const SPECS = [
  { asset: 'home-card', out: 'home-card-640.webp', w: 640, h: 427, kind: 'cover', max: 150 },
  { asset: 'home-card', out: 'home-card-320.webp', w: 320, h: 213, kind: 'cover', max: 150 },
  { asset: 'hero', out: 'hero-1200.webp', w: 1200, h: 800, kind: 'cover', max: 220 },
  { asset: 'hero', out: 'hero-mobile-780.webp', w: 780, h: 520, kind: 'cover', max: 220 },
  { asset: 'hero', out: 'og-default-1200x630.png', w: 1200, h: 630, kind: 'og', max: 1024 },
  { asset: 'frame-member', out: 'frame-member.webp', w: 540, h: 810, kind: 'contain', max: 150 },
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ asset: `s-0${n}`, out: `stickers/s-0${n}.webp`, w: 256, h: 256, kind: 'contain', max: 150 })),
  ...TYPES.map((id) => ({ asset: id, out: `types/${id}.webp`, w: 320, h: 320, kind: 'contain', max: 150 })),
  { asset: 'card-bg', out: 'card-bg-1080.webp', w: 1080, h: 1080, kind: 'cover', max: 150 },
  { asset: 'share-bg-square', out: 'share-bg-1080.webp', w: 1080, h: 1080, kind: 'cover', max: 260 },
  { asset: 'share-bg-story', out: 'share-bg-1080x1920.webp', w: 1080, h: 1920, kind: 'story', max: 260 },
  { asset: 'loading', out: 'mini/loading.webp', w: 240, h: 240, kind: 'contain', max: 150 },
  { asset: 'empty', out: 'mini/empty.webp', w: 240, h: 240, kind: 'contain', max: 150 },
  { asset: 'error', out: 'mini/error.webp', w: 240, h: 240, kind: 'contain', max: 150 },
];

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

async function sampleBgColor(img) {
  // median colour of the middle 10% rows (the quiet band) -> used to extend the story bg
  const { width, height } = await img.metadata();
  const band = await img.clone()
    .extract({ left: 0, top: Math.floor(height * 0.45), width, height: Math.max(1, Math.floor(height * 0.1)) })
    .removeAlpha().raw().toBuffer();
  const ch = [[], [], []];
  for (let i = 0; i < band.length; i += 3) { ch[0].push(band[i]); ch[1].push(band[i + 1]); ch[2].push(band[i + 2]); }
  const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];
  return { r: med(ch[0]), g: med(ch[1]), b: med(ch[2]) };
}

// Opaque backgrounds: the generator returns arbitrary aspect ratios. cover/og use a centre crop (motifs run to
// the source edges, so padding would leave a visible hard seam - verified visually). story uses fit+pad with the
// sampled quiet colour because that asset is prompted to fade into flat cream at the top/bottom.
async function fitPad(img, w, h) {
  const bg = await sampleBgColor(img);
  const resized = await img.clone().flatten({ background: bg }).resize(w, h, { fit: 'inside' }).toBuffer();
  const m = await sharp(resized).metadata();
  const padH = Math.max(0, h - m.height), padW = Math.max(0, w - m.width);
  const top = Math.floor(padH / 2), left = Math.floor(padW / 2);
  return sharp(resized).extend({ top, bottom: padH - top, left, right: padW - left, background: bg });
}

async function build(spec, src) {
  const dest = path.join(OUT, spec.out);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const img = sharp(src);
  if (spec.kind === 'cover') {
    await img.flatten({ background: '#FFF7EC' }).resize(spec.w, spec.h, { fit: 'cover', position: 'centre' }).webp(WEBP).toFile(dest);
  } else if (spec.kind === 'og') {
    await img.flatten({ background: '#FFF7EC' }).resize(spec.w, spec.h, { fit: 'cover', position: 'centre' })
      .png({ compressionLevel: 9, palette: true }).toFile(dest);
  } else if (spec.kind === 'story') {
    await (await fitPad(img, spec.w, spec.h)).webp(WEBP).toFile(dest);
  } else if (spec.kind === 'contain') {
    await img.ensureAlpha().resize(spec.w, spec.h, { fit: 'contain', background: transparent })
      .webp({ ...WEBP, alphaQuality: 90 }).toFile(dest);
  }
  return dest;
}

async function verify(spec, dest) {
  const meta = await sharp(dest).metadata();
  const bytes = fs.statSync(dest).size;
  const issues = [];
  if (meta.width !== spec.w || meta.height !== spec.h) issues.push(`dims ${meta.width}x${meta.height}`);
  if (bytes > spec.max * KB) issues.push(`size ${(bytes / KB).toFixed(1)}KB > ${spec.max}KB`);
  if (spec.kind === 'contain') {
    if (!meta.hasAlpha) issues.push('no alpha channel');
    const { data, info } = await sharp(dest).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const a = (x, y) => data[(y * info.width + x) * 4 + 3];
    const corners = [a(0, 0), a(info.width - 1, 0), a(0, info.height - 1), a(info.width - 1, info.height - 1)];
    if (corners.some((v) => v !== 0)) issues.push(`corner alpha ${corners.join(',')}`);
    let t = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] === 0) t++;
    const frac = t / (info.width * info.height);
    if (frac < 0.05) issues.push(`transparent frac ${frac.toFixed(2)} too low`);
  } else if (meta.hasAlpha && meta.format === 'webp') {
    issues.push('unexpected alpha');
  }
  return { out: spec.out, dims: `${meta.width}x${meta.height}`, kb: +(bytes / KB).toFixed(1), alpha: !!meta.hasAlpha, issues };
}

async function contactSheet(rows) {
  const cell = 220, pad = 12, cols = 6;
  const items = rows.filter((r) => r.dest);
  const rowsN = Math.ceil(items.length / cols);
  const W = cols * (cell + pad) + pad, H = rowsN * (cell + pad) + pad;
  // checker tile so transparency is visible on the sheet
  const tile = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#bdbdbd"/><rect width="10" height="10" fill="#e0e0e0"/><rect x="10" y="10" width="10" height="10" fill="#e0e0e0"/></svg>');
  const checker = await sharp(tile).png().toBuffer();
  const comps = [{ input: checker, tile: true, top: 0, left: 0 }];
  for (let i = 0; i < items.length; i++) {
    const buf = await sharp(items[i].dest).resize(cell, cell, { fit: 'contain', background: transparent }).png().toBuffer();
    comps.push({ input: buf, top: pad + Math.floor(i / cols) * (cell + pad), left: pad + (i % cols) * (cell + pad) });
  }
  await sharp({ create: { width: W, height: H, channels: 4, background: '#ffffff' } }).composite(comps).png().toFile(CONTACT);
  return CONTACT;
}

const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

async function main() {
  const results = [];
  for (const spec of SPECS) {
    if (ONLY && !ONLY.includes(spec.asset)) continue;
    const att = SELECTION[spec.asset];
    if (!att) { results.push({ out: spec.out, skipped: 'not selected' }); continue; }
    const src = path.join(ORIGINALS, `${spec.asset}-a${att}.png`);
    if (!fs.existsSync(src)) { results.push({ out: spec.out, skipped: `missing ${src}` }); continue; }
    const dest = await build(spec, src);
    const v = await verify(spec, dest);
    results.push({ ...v, dest, src: path.basename(src), sha256: sha256(src) });
  }
  const sheet = ONLY ? null : await contactSheet(results);
  for (const r of results) {
    if (r.skipped) console.log(`SKIP ${r.out}: ${r.skipped}`);
    else console.log(`${r.issues.length ? 'FAIL' : 'OK  '} ${r.out} ${r.dims} ${r.kb}KB alpha=${r.alpha} <- ${r.src}${r.issues.length ? ' !! ' + r.issues.join('; ') : ''}`);
  }
  if (sheet) console.log(`contact sheet: ${sheet}`);
  if (process.env.JSON_OUT) fs.writeFileSync(process.env.JSON_OUT, JSON.stringify(results, null, 1));
  process.exitCode = results.some((r) => r.issues?.length) ? 1 : 0;
}
main().catch((e) => { console.error(e); process.exit(2); });

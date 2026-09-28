import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artArg = process.argv.find((arg) => arg.startsWith('--art-root='));
if (!artArg) throw new Error('Pass --art-root=<approved original art directory>');
const artRoot = resolve(artArg.slice('--art-root='.length));
const sources = JSON.parse(await readFile(resolve(root, 'docs/design/yeongnyangi-tarot/asset-sources.json'), 'utf8'));
const prefix = '/assets/yeongnyangi/tarot/v1';
const output = resolve(root, `public${prefix}`);
const sizes = { thumb: 240, std: 600, hi: 1200 };
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex');
const safeSource = (file) => {
  const path = resolve(artRoot, file);
  const rel = relative(artRoot, path);
  if (rel.startsWith('..') || rel.includes(':')) throw new Error(`Source outside art root: ${file}`);
  return path;
};
await mkdir(output, { recursive: true });
// SVG의 텍스트 해시는 Windows CRLF와 CI의 LF 체크아웃에서 같아야 한다.
const frame = Buffer.from((await readFile(resolve(root, sources.frame.file), 'utf8')).replaceAll('\r\n', '\n'));
if (hash(frame) !== sources.frame.sha256) throw new Error('Approved SVG frame hash changed');
await writeFile(resolve(output, 'frame.svg'), frame);

async function buildEntry(source, kind) {
  const original = kind === 'frame' ? frame : await readFile(safeSource(source.file));
  if (hash(original) !== source.sha256) throw new Error(`Approved original changed: ${source.id}`);
  const input = source.framed ? await readFile(safeSource(source.framed)) : original;
  if (source.framed && hash(input) !== source.framedSha256) throw new Error(`Approved framed art changed: ${source.id}`);
  const metadata = await sharp(input).metadata();
  if (metadata.width !== 1024 || metadata.height !== 1536) throw new Error(`Source dimensions: ${source.id}`);
  const stats = await sharp(input).stats();
  const color = stats.dominant;
  const entry = {
    id: source.id,
    ...(kind === 'card' ? { arcana: 'major', suit: null, rank: source.rank } : {}),
    files: {}, avifFiles: {}, integrity: {},
    altKey: `tarot.${source.id}.alt`, nameKey: `tarot.${source.id}.name`,
    gaze: source.gaze, dominantColor: `#${[color.r, color.g, color.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`,
    contentHash: hash(input), sourceContentHash: source.sha256, deckVersion: 'v1',
    originalSize: { width: metadata.width, height: metadata.height },
  };
  for (const [size, width] of Object.entries(sizes)) {
    let pixels = await sharp(input).resize(width, width * 1.5).png().toBuffer();
    if (kind === 'back') {
      // 축소의 반올림 차이도 없애기 위해 위 절반을 180도 복제하고 lossless로 인코딩한다.
      const half = await sharp(pixels).extract({ left: 0, top: 0, width, height: width * 0.75 }).png().toBuffer();
      const bottom = await sharp(half).rotate(180).png().toBuffer();
      pixels = await sharp({ create: { width, height: width * 1.5, channels: 3, background: '#0b1220' } })
        .composite([{ input: half, top: 0, left: 0 }, { input: bottom, top: width * 0.75, left: 0 }]).png().toBuffer();
    }
    for (const format of ['webp', 'avif']) {
      const file = `${source.id}-${width}.${format}`;
      const buffer = await sharp(pixels).toFormat(format, {
        lossless: kind !== 'card', quality: format === 'webp' ? 90 : 60, effort: 4,
        ...(format === 'avif' ? { chromaSubsampling: '4:4:4' } : {}),
      }).toBuffer();
      await writeFile(resolve(output, file), buffer);
      (format === 'webp' ? entry.files : entry.avifFiles)[size] = `${prefix}/${file}`;
      entry.integrity[file] = { sha256: hash(buffer), bytes: buffer.length, width, height: width * 1.5 };
    }
  }
  console.log(`Built ${source.id}`);
  return entry;
}

const cards = [];
for (const card of sources.cards) cards.push(await buildEntry(card, 'card'));
const back = await buildEntry(sources.back, 'back');
const frameEntry = await buildEntry({ ...sources.frame, id: 'frame', gaze: 'not-applicable' }, 'frame');
const manifest = {
  schemaVersion: 1, deckId: 'yeongnyangi-tarot-v1', deckVersion: 'v1', brand: 'yeongnyangi',
  scope: 'major22', completeDeck: false, expectedCardCount: 22,
  sizes, formats: ['webp', 'avif'], cards, back, frame: { ...frameEntry, svg: `${prefix}/frame.svg` },
  encoding: { webpQuality: 90, avifQuality: 60, avifChromaSubsampling: '4:4:4', backAndFrameLossless: true, highResolution: '1200w enlarged from approved 1024w source; no new detail' },
};
await writeFile(resolve(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Built major22 manifest; 144 raster derivatives + frame.svg. Original PNGs remain outside repository.');

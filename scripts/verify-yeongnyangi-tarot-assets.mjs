import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { getYeongnyangiDeckText, YEONGNYANGI_DECK_LOCALES } from '../lib/tarot/yeongnyangi-deck-copy.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = '/assets/yeongnyangi/tarot/v1/';
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex');
const majorIds = Array.from({ length: 22 }, (_,i) => `M${String(i).padStart(2, '0')}`);
const fullIds = [...majorIds, ...['W', 'C', 'S', 'P'].flatMap((suit) => Array.from({ length: 14 }, (_, i) => `${suit}${String(i + 1).padStart(2, '0')}`))];

export function validateTarotManifest(manifest, { requireFullDeck = false } = {}) {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.brand, 'yeongnyangi');
  assert.equal(manifest.deckId, 'yeongnyangi-tarot-v1');
  assert.equal(manifest.deckVersion, 'v1');
  assert(['major22', 'full78'].includes(manifest.scope), 'Unknown deck scope');
  const full = manifest.scope === 'full78';
  assert(!requireFullDeck || full, 'Phase 4a is major22; full78 is not ready');
  assert.equal(manifest.completeDeck, full);
  assert.equal(manifest.expectedCardCount, full ? 78 : 22);
  assert.deepEqual(manifest.cards.map((card) => card.id), full ? fullIds : majorIds, 'Missing, duplicate or misordered cards');
  assert.deepEqual(manifest.sizes, { thumb: 240, std: 600, hi: 1200 });
  assert.deepEqual(manifest.formats, ['webp', 'avif']);
  assert.equal(manifest.back.id, 'back');
  assert.equal(manifest.frame.id, 'frame');
  assert.equal(manifest.frame.svg, `${prefix}frame.svg`);
  for (const card of manifest.cards) {
    assert.equal(card.arcana, card.id[0] === 'M' ? 'major' : 'minor');
    assert.equal(card.suit, card.id[0] === 'M' ? null : { W: 'wands', C: 'cups', S: 'swords', P: 'pentacles' }[card.id[0]]);
    assert.equal(card.rank, Number(card.id.slice(1)));
  }
  for (const entry of [...manifest.cards, manifest.back, manifest.frame]) {
    assert.equal(entry.deckVersion, 'v1');
    assert.match(entry.contentHash, /^[0-9a-f]{64}$/);
    assert.match(entry.sourceContentHash, /^[0-9a-f]{64}$/);
    assert.match(entry.dominantColor, /^#[0-9a-f]{6}$/);
    assert.equal(typeof entry.gaze, 'string');
    assert(entry.gaze.length > 0, `Missing gaze: ${entry.id}`);
    assert.deepEqual(entry.originalSize, { width: 1024, height: 1536 });
    assert.equal(entry.nameKey, `tarot.${entry.id}.name`);
    assert.equal(entry.altKey, `tarot.${entry.id}.alt`);
    for (const locale of [...YEONGNYANGI_DECK_LOCALES, 'fr']) {
      assert(getYeongnyangiDeckText(entry.nameKey, locale), `Missing name: ${entry.id}/${locale}`);
      assert(getYeongnyangiDeckText(entry.altKey, locale), `Missing alt: ${entry.id}/${locale}`);
    }
    const filenames = [];
    for (const [size, width] of Object.entries(manifest.sizes)) {
      for (const [format, files] of [['webp', entry.files], ['avif', entry.avifFiles]]) {
        const file = `${entry.id}-${width}.${format}`;
        filenames.push(file);
        assert.equal(files[size], `${prefix}${file}`, `Unexpected image path: ${entry.id}/${size}`);
        const integrity = entry.integrity[file];
        assert(integrity, `Missing file metadata: ${file}`);
        assert.match(integrity.sha256, /^[0-9a-f]{64}$/);
        assert(Number.isInteger(integrity.bytes) && integrity.bytes > 0);
        assert.equal(integrity.width, width);
        assert.equal(integrity.height, width * 1.5);
      }
    }
    assert.deepEqual(Object.keys(entry.integrity).sort(), filenames.sort());
  }
}

export async function verifyTarotAssetFiles(manifest, publicRoot = resolve(root, 'public')) {
  let count = 0;
  let bytes = 0;
  for (const entry of [...manifest.cards, manifest.back, manifest.frame]) {
    for (const [filename, integrity] of Object.entries(entry.integrity)) {
      const buffer = await readFile(resolve(publicRoot, `.${prefix}${filename}`));
      assert.equal(hash(buffer), integrity.sha256, `File hash mismatch: ${filename}`);
      assert.equal(buffer.length, integrity.bytes);
      const metadata = await sharp(buffer).metadata();
      assert.equal(metadata.width, integrity.width);
      assert.equal(metadata.height, integrity.height);
      assert.equal(metadata.format, filename.endsWith('.webp') ? 'webp' : 'heif');
      if (entry.id === 'back') {
        const pixels = await sharp(buffer).removeAlpha().raw().toBuffer();
        const rotated = await sharp(buffer).rotate(180).removeAlpha().raw().toBuffer();
        assert(pixels.equals(rotated), `Back lost 180-degree symmetry: ${filename}`);
      }
      count++;
      bytes += buffer.length;
    }
  }
  const frame = Buffer.from((await readFile(resolve(publicRoot, `.${manifest.frame.svg}`), 'utf8')).replaceAll('\r\n', '\n'));
  assert.equal(hash(frame), manifest.frame.contentHash, 'SVG frame mismatch');
  const expected = ['manifest.json', 'frame.svg', ...[...manifest.cards, manifest.back, manifest.frame].flatMap((entry) => Object.keys(entry.integrity))];
  assert.deepEqual((await readdir(resolve(publicRoot, `.${prefix}`))).sort(), expected.sort(), 'Unexpected or missing assets');
  const sources = JSON.parse(await readFile(resolve(root, 'docs/design/yeongnyangi-tarot/asset-sources.json'), 'utf8'));
  assert.equal(sources.scope, manifest.scope);
  assert.deepEqual(sources.cards.map((source) => source.id), manifest.cards.map((entry) => entry.id));
  const ledger = (await readFile(resolve(root, 'docs/design/yeongnyangi-tarot/art-ledger.jsonl'), 'utf8')).trim().split(/\r?\n/).map(JSON.parse);
  for (const entry of [...manifest.cards, manifest.back, manifest.frame]) {
    const source = [...sources.cards, sources.back, { ...sources.frame, id: 'frame' }].find((item) => item.id === entry.id);
    assert(source, `Missing approved source: ${entry.id}`);
    assert.equal(entry.sourceContentHash, source.sha256);
    assert.equal(entry.contentHash, source.framedSha256 || source.sha256);
    if (entry.id !== 'frame') {
      assert.equal(entry.gaze, source.gaze);
      const original = ledger.find((row) => row.file === source.file || row.derived?.some((derived) => derived.file === source.file));
      assert(original?.adopted, `Source not adopted in ledger: ${entry.id}`);
      const approvedHash = original.file === source.file ? original.sha256 : original.derived.find((derived) => derived.file === source.file).sha256;
      assert.equal(source.sha256, approvedHash, `Source ledger mismatch: ${entry.id}`);
      if (entry.id !== 'back') assert.equal(entry.gaze, original.gaze);
    } else {
      assert.equal(hash(Buffer.from((await readFile(resolve(root, source.file), 'utf8')).replaceAll('\r\n', '\n'))), source.sha256);
    }
  }
  return { count, bytes };
}

if (process.argv[1] && basename(process.argv[1]) === basename(fileURLToPath(import.meta.url))) {
  const manifest = JSON.parse(await readFile(resolve(root, `public${prefix}manifest.json`), 'utf8'));
  validateTarotManifest(manifest, { requireFullDeck: process.argv.includes('--full') });
  const result = await verifyTarotAssetFiles(manifest);
  console.log(`PASS ${manifest.scope}: ${manifest.cards.length} cards + back + frame; ${result.count} images / ${(result.bytes / 1024 / 1024).toFixed(2)} MiB; hashes, sizes, i18n, symmetry verified`);
}

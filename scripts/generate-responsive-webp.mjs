import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();

const jobs = [
  { input: 'icons/honeypig.webp', outputs: [{ w: 96, out: 'icons/honeypig-96.webp' }, { w: 130, out: 'icons/honeypig-130.webp' }] },
  { input: 'icons/samba.webp', outputs: [{ w: 96, out: 'icons/samba-96.webp' }, { w: 130, out: 'icons/samba-130.webp' }] },
  { input: 'public/icons/honeypig.webp', outputs: [{ w: 96, out: 'public/icons/honeypig-96.webp' }, { w: 130, out: 'public/icons/honeypig-130.webp' }] },
  { input: 'public/icons/samba.webp', outputs: [{ w: 96, out: 'public/icons/samba-96.webp' }, { w: 130, out: 'public/icons/samba-130.webp' }] },
  { input: 'fuctionassets/flower.webp', outputs: [{ w: 320, out: 'fuctionassets/flower-320.webp' }] },
  { input: 'public/fuctionassets/flower.webp', outputs: [{ w: 320, out: 'public/fuctionassets/flower-320.webp' }] }
];

const mobileBatchDirs = [
  'public/fuctionassets'
];

const MOBILE_WIDTH = 420;
const MOBILE_QUALITY = 62;

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function listWebpFiles(dirAbs) {
  if (!fs.existsSync(dirAbs)) return [];
  return fs.readdirSync(dirAbs, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.webp'))
    .map((entry) => entry.name);
}

async function buildMobileBatch() {
  for (const relDir of mobileBatchDirs) {
    const dirAbs = path.join(root, relDir);
    const mobileDirAbs = path.join(dirAbs, 'mobile');
    const fileNames = listWebpFiles(dirAbs)
      .filter((name) => !name.toLowerCase().endsWith('-96.webp'))
      .filter((name) => !name.toLowerCase().endsWith('-130.webp'))
      .filter((name) => !name.toLowerCase().endsWith('-320.webp'));

    if (!fileNames.length) {
      console.warn('[skip] no webp files for mobile batch in', relDir);
      continue;
    }

    for (const fileName of fileNames) {
      const inputAbs = path.join(dirAbs, fileName);
      const outAbs = path.join(mobileDirAbs, fileName);
      ensureDir(outAbs);

      await sharp(inputAbs)
        .resize({ width: MOBILE_WIDTH, withoutEnlargement: true })
        .webp({ quality: MOBILE_QUALITY, effort: 4 })
        .toFile(outAbs);

      console.log('[mobile]', path.relative(root, outAbs));
    }
  }
}

async function run() {
  for (const job of jobs) {
    const inputAbs = path.join(root, job.input);
    if (!fs.existsSync(inputAbs)) {
      console.warn('[skip] missing', job.input);
      continue;
    }

    for (const output of job.outputs) {
      const outAbs = path.join(root, output.out);
      ensureDir(outAbs);
      await sharp(inputAbs)
        .resize({ width: output.w, withoutEnlargement: true })
        .webp({ quality: 76, effort: 4 })
        .toFile(outAbs);
      console.log('[ok]', output.out);
    }
  }

  await buildMobileBatch();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

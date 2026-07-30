/**
 * Converts local raster images (.png/.jpg/.jpeg) to WebP siblings in place.
 * Originals are never deleted (rollback / fallback). Re-run is idempotent
 * (skips when the .webp is newer than its source).
 *
 * Usage:
 *   node scripts/optimize-images.mjs [path ...] [--sync-android] [--force]
 *   node scripts/optimize-images.mjs public/images/fortune-tea-house --sync-android
 *
 * Static export (`output:"export"` + images.unoptimized) does no runtime
 * optimization, so WebP only takes effect once callers reference the .webp file.
 */
import sharp from "sharp";
import { readdir, stat, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";

const RASTER_EXT = new Set([".png", ".jpg", ".jpeg"]);
// Consumers that cannot read WebP: social crawlers (Kakao/Twitter) read the OG
// thumbnail, and the OS/browser reads the PWA + favicon icon slots.
const EXCLUDED_DIR_PATTERN = /(^|[\\/])(og|icons)([\\/]|$)/i;
const EXCLUDED_BASENAME_PATTERN = /^(favicon|apple-touch-icon|app-logo|android-chrome|mstile|maskable|splash)/i;
// Crisp edges / pixel-precise sprite crops → near-lossless quality.
const HERO_PATTERNS = ["sprite", "photoroom", "mascot", "pig", "tarot", "tea-cups", "ten-gods"];
const QUALITY_DEFAULT = 82;
const QUALITY_HERO = 90;

const PUBLIC_ROOT = path.resolve("public");
const ANDROID_ROOT = path.resolve("apps/mobile/android/app/src/main/assets/public");

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const inputs = args.filter((a) => !a.startsWith("--"));
const syncAndroid = flags.has("--sync-android");
const force = flags.has("--force");
if (inputs.length === 0) inputs.push("public/images/fortune-tea-house");

/** Raster file that is safe to serve as WebP (icons / OG thumbnails are not). */
function isConvertible(filePath) {
  if (!RASTER_EXT.has(path.extname(filePath).toLowerCase())) return false;
  if (EXCLUDED_BASENAME_PATTERN.test(path.basename(filePath))) return false;
  return !EXCLUDED_DIR_PATTERN.test(path.dirname(filePath));
}

/** Recursively collect raster files from a file or directory path. */
async function collect(target) {
  const abs = path.resolve(target);
  const info = await stat(abs);
  if (info.isFile()) {
    return isConvertible(abs) ? [abs] : [];
  }
  const out = [];
  for (const entry of await readdir(abs, { withFileTypes: true })) {
    const child = path.join(abs, entry.name);
    if (entry.isDirectory()) out.push(...(await collect(child)));
    else if (entry.isFile() && isConvertible(child)) out.push(child);
  }
  return out;
}

/** Newer output than source → nothing to do. */
async function isUpToDate(srcPath, outPath) {
  try {
    const [src, out] = await Promise.all([stat(srcPath), stat(outPath)]);
    return out.mtimeMs >= src.mtimeMs;
  } catch {
    return false;
  }
}

/** Copy an output file into the Android Capacitor mirror at the matching path. */
async function mirrorToAndroid(outPath) {
  if (!outPath.startsWith(PUBLIC_ROOT)) return;
  const dest = path.join(ANDROID_ROOT, path.relative(PUBLIC_ROOT, outPath));
  await mkdir(path.dirname(dest), { recursive: true });
  await copyFile(outPath, dest);
}

function fmtKB(bytes) {
  return (bytes / 1024).toFixed(1).padStart(8) + " KB";
}

async function run() {
  const files = [...new Set((await Promise.all(inputs.map(collect))).flat())].sort();
  if (files.length === 0) {
    console.log("[optimize-images] No raster files found for:", inputs.join(", "));
    return;
  }

  let totalSrc = 0;
  let totalOut = 0;
  let converted = 0;
  let skipped = 0;

  for (const srcPath of files) {
    const outPath = srcPath.slice(0, -path.extname(srcPath).length) + ".webp";
    const rel = path.relative(process.cwd(), srcPath);

    if (!force && (await isUpToDate(srcPath, outPath))) {
      skipped++;
      console.log(`  skip   ${rel} (webp up to date)`);
      continue;
    }

    const base = path.basename(srcPath).toLowerCase();
    const quality = HERO_PATTERNS.some((p) => base.includes(p)) ? QUALITY_HERO : QUALITY_DEFAULT;

    try {
      await sharp(srcPath)
        .webp({ quality, effort: 6, smartSubsample: true })
        .toFile(outPath);
      if (syncAndroid) await mirrorToAndroid(outPath);

      const [srcInfo, outInfo] = await Promise.all([stat(srcPath), stat(outPath)]);
      totalSrc += srcInfo.size;
      totalOut += outInfo.size;
      converted++;
      const saved = ((1 - outInfo.size / srcInfo.size) * 100).toFixed(1);
      console.log(
        `  ok  q${quality} ${fmtKB(srcInfo.size)} -> ${fmtKB(outInfo.size)} (-${saved}%)  ${rel}`
      );
    } catch (err) {
      console.error(`  FAIL ${rel}: ${err.message}`);
      process.exitCode = 1;
    }
  }

  const savedTotal = totalSrc > 0 ? ((1 - totalOut / totalSrc) * 100).toFixed(1) : "0.0";
  console.log("\n[optimize-images] Summary");
  console.log(`  converted: ${converted}  skipped: ${skipped}  android-sync: ${syncAndroid}`);
  console.log(`  source total: ${fmtKB(totalSrc)}`);
  console.log(`  webp   total: ${fmtKB(totalOut)}  (saved ${savedTotal}%, ${fmtKB(totalSrc - totalOut)})`);
}

run();

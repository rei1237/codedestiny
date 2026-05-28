import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { resolve, relative, extname, basename } from "node:path";

const root = process.cwd();
const apply = process.argv.includes("--apply");

const TEXT_EXT = new Set([
  ".html", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".css", ".json", ".xml", ".txt", ".md", ".yml", ".yaml"
]);

const ASSET_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico", ".bmp", ".avif", ".woff", ".woff2", ".ttf", ".otf", ".mp3", ".wav", ".mp4", ".webm"
]);

const IGNORE_DIRS = new Set([
  ".git", "node_modules", ".next", ".open-next", "dist", "build"
]);

const TARGET_DIRS = [
  "public",
  "fuctionassets"
];

function walk(dir, out) {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(full, out);
      continue;
    }
    out.push(full);
  }
}

function toPosix(p) {
  return p.replace(/\\/g, "/");
}

const allFiles = [];
walk(root, allFiles);

let corpus = "";
for (const file of allFiles) {
  const ext = extname(file).toLowerCase();
  if (!TEXT_EXT.has(ext)) continue;
  try {
    corpus += "\n" + readFileSync(file, "utf8").toLowerCase();
  } catch (e) {
    // ignore unreadable/binary-ish text files
  }
}

const assetCandidates = [];
for (const baseDir of TARGET_DIRS) {
  const abs = resolve(root, baseDir);
  const files = [];
  walk(abs, files);
  for (const file of files) {
    const ext = extname(file).toLowerCase();
    if (!ASSET_EXT.has(ext)) continue;
    assetCandidates.push(file);
  }
}

function isReferenced(file) {
  const rel = toPosix(relative(root, file));
  const relLower = rel.toLowerCase();
  const base = basename(relLower);
  const baseEnc = encodeURIComponent(base);

  const tokens = new Set([base, baseEnc, relLower]);

  if (relLower.startsWith("public/")) {
    const webPath = "/" + relLower.slice("public/".length);
    tokens.add(webPath);
    tokens.add(encodeURI(webPath));
    tokens.add(webPath.replace(/ /g, "%20"));
  } else {
    tokens.add("/" + relLower);
    tokens.add(encodeURI("/" + relLower));
    tokens.add(("/" + relLower).replace(/ /g, "%20"));
  }

  for (const t of tokens) {
    if (t && corpus.includes(t)) return true;
  }
  return false;
}

const removable = [];
for (const file of assetCandidates) {
  if (!isReferenced(file)) {
    const st = statSync(file);
    removable.push({ file, bytes: st.size });
  }
}

const totalBytes = removable.reduce((sum, item) => sum + item.bytes, 0);
console.log(`[cleanup-unused-assets] candidates=${assetCandidates.length}`);
console.log(`[cleanup-unused-assets] removable=${removable.length}`);
console.log(`[cleanup-unused-assets] reclaimMB=${(totalBytes / 1024 / 1024).toFixed(2)}`);

for (const item of removable.slice(0, 200)) {
  console.log(` - ${toPosix(relative(root, item.file))} (${(item.bytes / 1024).toFixed(1)} KB)`);
}
if (removable.length > 200) {
  console.log(` ... and ${removable.length - 200} more`);
}

if (apply) {
  for (const item of removable) {
    rmSync(item.file, { force: true });
  }
  console.log("[cleanup-unused-assets] apply completed.");
}

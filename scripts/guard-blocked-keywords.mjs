import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = ["app", "public", "lib"];
const TEXT_EXTS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".md",
  ".txt",
  ".html",
  ".css",
  ".scss",
  ".xml",
  ".yml",
  ".yaml",
]);

const BLOCKED_KEYWORDS = [];

function shouldScan(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTS.has(ext);
}

function walk(dirPath, collector) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, collector);
      continue;
    }
    if (entry.isFile() && shouldScan(fullPath)) {
      collector.push(fullPath);
    }
  }
}

function findLine(text, keyword) {
  const idx = text.indexOf(keyword);
  if (idx < 0) return null;
  const until = text.slice(0, idx);
  return until.split(/\r?\n/).length;
}

const files = [];
for (const rel of TARGET_DIRS) {
  walk(path.join(ROOT, rel), files);
}

const violations = [];
for (const filePath of files) {
  const relFile = path.relative(ROOT, filePath).replaceAll("\\", "/");
  let body = "";
  try {
    body = fs.readFileSync(filePath, "utf8");
  } catch (e) {
    continue;
  }

  for (const keyword of BLOCKED_KEYWORDS) {
    const line = findLine(body, keyword);
    if (line !== null) {
      violations.push({
        file: relFile,
        keyword,
        line,
      });
    }
  }
}

if (violations.length > 0) {
  console.error("[guard:privacy] Blocked personal keyword detected:");
  for (const v of violations) {
    console.error(`- ${v.file}:${v.line} -> ${v.keyword}`);
  }
  process.exit(1);
}

console.log("[guard:privacy] OK - no blocked personal keywords found.");

#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

const rootDir = process.cwd();
const args = process.argv.slice(2);
const failOnFindings = args.includes("--fail-on-findings") || args.includes("--strict");
const outputPath = resolve(rootDir, "reports", "i18n-hardcoded-audit.json");
const targetArgs = args.filter((arg) => !arg.startsWith("--"));
const targets = targetArgs.length ? targetArgs : ["app", "components", "hooks", "lib", "js", "index.html"];
const exts = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".html"]);
const skipDirs = new Set([
  ".git",
  ".next",
  ".wrangler",
  "node_modules",
  "out",
  "public",
  "reports",
  "worker",
]);
const userAttrNames = [
  "placeholder",
  "aria-label",
  "aria-description",
  "title",
  "alt",
  "label",
  "description",
];
const objectCopyKeys = [
  "title",
  "label",
  "description",
  "message",
  "error",
  "success",
  "empty",
  "loading",
  "cta",
  "placeholder",
  "helper",
  "headline",
  "subtitle",
  "lead",
];
const allowedLiteralValues = new Set([
  "Code Destiny",
  "CODE DESTINY",
  "Honey Pig",
  "MOON MUSIC",
  "DESTINY STORIES",
  "DESTINY ORACLE",
  "DESTINY CARD COLLECTION",
  "LUNA BLOOM",
  "Nelumbo nucifera",
  "SEO",
  "FAQ",
  "URL",
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "Bearer",
]);

function walk(target, out = []) {
  const abs = resolve(rootDir, target);
  if (!existsSync(abs)) return out;
  const stat = statSync(abs);
  if (stat.isFile()) {
    if (exts.has(extname(abs))) out.push(abs);
    return out;
  }

  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || skipDirs.has(entry.name)) continue;
    const next = join(abs, entry.name);
    if (entry.isDirectory()) walk(next, out);
    else if (entry.isFile() && exts.has(extname(entry.name))) out.push(next);
  }
  return out;
}

function looksLikeHumanCopy(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length < 2) return false;
  if (allowedLiteralValues.has(text)) return false;
  if (text.includes("&&") || text.includes("||") || text.includes("===") || text.includes("!==") || text.includes('? "')) return false;
  if (/^https?:\/\//i.test(text) || text.startsWith("/") || text.startsWith("#")) return false;
  if (/^[a-z0-9_-]+(?:\.[a-z0-9_-]+)+$/i.test(text)) return false;
  if (/^[.#]?[a-z0-9:_/\-[\]()%.,]+$/i.test(text) && !/[가-힣ぁ-ゟァ-ヿ一-龯]/u.test(text)) return false;
  if (/[가-힣ぁ-ゟァ-ヿ一-龯]/u.test(text)) return true;
  return /[A-Za-z]{3,}(?:\s+[A-Za-z0-9&+().,'-]{2,})+/.test(text);
}

function shouldSkipLine(line) {
  return [
    "data-cd-trans",
    "data-ls-price-mode",
    "data-ls-price-delta",
    "data-key=",
    "titleKey:",
    "descKey:",
    "ctaKey:",
    "ariaKey:",
    "t(",
    "_cdPaymentI18n(",
    "_fsajDetailCopy(",
    "cdTranslate(",
    "tr(",
    "useTranslations",
    "console.",
    "className=",
    "style={{",
    " as Record<",
    " as Array<",
    "Promise<",
    "import ",
    " from ",
    "@type",
  ].some((token) => line.includes(token));
}

function pushFinding(findings, type, rel, lineNumber, value, line) {
  const text = String(value || "").trim();
  if (!looksLikeHumanCopy(text)) return;
  findings.push({
    type,
    file: rel,
    line: lineNumber,
    value: text.slice(0, 180),
    source: line.trim().slice(0, 240),
  });
}

function hasTranslatedAttribute(lines, index, attrName) {
  const start = Math.max(0, index - 3);
  const end = Math.min(lines.length - 1, index + 4);
  const chunk = lines.slice(start, end + 1).join(" ");
  const match = chunk.match(/\bdata-cd-trans-attr\s*=\s*(["'])(.*?)\1/);
  if (!match) return false;
  return match[2]
    .split(",")
    .map((item) => item.trim())
    .some((item) => item.startsWith(`${attrName}:`));
}

function scanFile(absPath) {
  const rel = relative(rootDir, absPath).replace(/\\/g, "/");
  const ext = extname(absPath);
  const scanJsxText =
    ext === ".html"
    || ext === ".jsx"
    || ext === ".tsx"
    || rel.startsWith("app/")
    || rel.startsWith("components/");
  const source = readFileSync(absPath, "utf8");
  const findings = [];
  const lines = source.split(/\r?\n/);
  const attrRe = new RegExp(`\\b(${userAttrNames.join("|")})\\s*=\\s*(["'])(.*?)\\2`, "g");
  const propRe = new RegExp(`\\b(${objectCopyKeys.join("|")})\\s*:\\s*(["'])(.*?)\\2`, "g");
  const callRe = /\b(alert|confirm|prompt|toast(?:\.[A-Za-z]+)?|setError|setMessage|setSuccess)\s*\(\s*(["'])(.*?)\2/g;
  const jsxTextRe = />([^<>{}][^<>{}]*)</g;
  let translationBlockDepth = 0;

  function blockDelta(line) {
    const withoutStrings = line.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, "");
    return (
      (withoutStrings.match(/[\{\[]/g) || []).length
      - (withoutStrings.match(/[\}\]]/g) || []).length
    );
  }

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const startsTranslationBlock =
      /\b(?:const|export const)\s+[A-Z0-9_]*(?:COPY|MESSAGES|I18N|LOCALIZED|TEXT|LABELS|TRANSLATIONS)[A-Z0-9_]*\b/.test(line)
      || /\b[A-Z0-9_]*(?:COPY|MESSAGES|I18N|LOCALIZED|TEXT|LABELS|TRANSLATIONS)[A-Z0-9_]*(?:\[[^\]]+\]|\.[A-Za-z0-9_$-]+)?\s*=/.test(line)
      || /\b(?:const|export const)\s+[A-Z0-9_]+_BY_LOCALE\b/.test(line)
      || /\b(?:export\s+)?const\s+SERVICE_MAP\b/.test(line)
      || /\blocalized\s*:\s*\{/.test(line);
    if (translationBlockDepth > 0 || startsTranslationBlock) {
      translationBlockDepth += blockDelta(line);
      if (startsTranslationBlock && translationBlockDepth <= 0 && /[\{\[]/.test(line)) translationBlockDepth = 1;
      if (translationBlockDepth < 0) translationBlockDepth = 0;
      return;
    }
    if (shouldSkipLine(line)) return;

    for (const match of line.matchAll(attrRe)) {
      if (hasTranslatedAttribute(lines, index, match[1])) continue;
      pushFinding(findings, `attr:${match[1]}`, rel, lineNumber, match[3], line);
    }
    for (const match of line.matchAll(propRe)) {
      pushFinding(findings, `prop:${match[1]}`, rel, lineNumber, match[3], line);
    }
    for (const match of line.matchAll(callRe)) {
      pushFinding(findings, `call:${match[1]}`, rel, lineNumber, match[3], line);
    }
    if (scanJsxText) {
      for (const match of line.matchAll(jsxTextRe)) {
        pushFinding(findings, "jsx:text", rel, lineNumber, match[1], line);
      }
    }
  });

  return findings;
}

const files = [...new Set(targets.flatMap((target) => walk(target)))].sort();
const findings = files.flatMap((file) => scanFile(file));
const byFile = findings.reduce((acc, finding) => {
  acc[finding.file] = (acc[finding.file] || 0) + 1;
  return acc;
}, {});
const report = {
  generatedAt: new Date().toISOString(),
  targets,
  scannedFiles: files.length,
  totalFindings: findings.length,
  byFile,
  findings,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`[i18n:audit] scanned ${files.length} files, findings=${findings.length}`);
console.log(`[i18n:audit] report ${relative(rootDir, outputPath).replace(/\\/g, "/")}`);

if (findings.length) {
  Object.entries(byFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([file, count]) => console.log(`[i18n:audit] ${count} ${file}`));
}

if (failOnFindings && findings.length) {
  process.exit(1);
}

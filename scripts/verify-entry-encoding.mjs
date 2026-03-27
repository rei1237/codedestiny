#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const targetFiles = [
  'index.html',
  'public/index.html',
  'public/static/index.html',
  'fortune/index.html',
  'public/fortune/index.html',
  'public/de-de/index.html',
  'public/en-us/index.html',
  'public/es-es/index.html',
  'public/fr-fr/index.html',
  'public/hi-in/index.html',
  'public/ja-jp/index.html',
  'public/ms-my/index.html',
  'public/nl-nl/index.html',
  'public/zh-cn/index.html',
];

const suspiciousPatterns = [
  { key: 'replacement-char', re: /\uFFFD/ },
  { key: 'broken-closing-tag', re: /\?\?\/[a-z]/i },
  { key: 'broken-open-tag', re: /<\?[a-z][^>]*>/i },
  { key: 'legacy-mojibake-signature', re: /臾대즺|轅轅|\?댁꽭/ },
];

function inspectFile(relPath) {
  const absPath = path.join(root, relPath);
  if (!fs.existsSync(absPath)) {
    return { relPath, missing: true, issues: [] };
  }

  const text = fs.readFileSync(absPath, 'utf8');
  const issues = [];

  for (const p of suspiciousPatterns) {
    if (p.re.test(text)) issues.push(p.key);
  }

  const hasUtf8MetaNearTop = /<meta\s+charset=["']UTF-8["']\s*\/?>/i.test(
    text.slice(0, 1200)
  );
  if (!hasUtf8MetaNearTop) issues.push('missing-early-utf8-meta');

  return { relPath, missing: false, issues };
}

const results = targetFiles.map(inspectFile);
const failed = results.filter((r) => r.missing || r.issues.length > 0);

if (failed.length === 0) {
  console.log('OK: Entry encoding check passed for all target files.');
  process.exit(0);
}

console.error('FAIL: Entry encoding check found issues.');
for (const r of failed) {
  if (r.missing) {
    console.error(`- ${r.relPath}: missing file`);
    continue;
  }
  console.error(`- ${r.relPath}: ${r.issues.join(', ')}`);
}
process.exit(1);

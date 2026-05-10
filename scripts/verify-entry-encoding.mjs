#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strictCore = process.argv.includes('--strict-core');
const localeEntryFiles = new Set([
  'public/en/index.html',
  'public/ja/index.html',
  'public/zh/index.html',
]);

const targetFiles = [
  'index.html',
  'public/index.html',
  'public/static/index.html',
  'fortune/index.html',
  'public/fortune/index.html',
  'public/en/index.html',
  'public/ja/index.html',
  'public/zh/index.html',
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
    return { relPath, missing: true, issues: [], replacementCharCount: 0, hasBom: false, utf8MetaCount: 0 };
  }

  const raw = fs.readFileSync(absPath);
  const hasBom = raw.length >= 3 && raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  const text = raw.toString('utf8');
  const issues = [];
  const replacementCharCount = (text.match(/\uFFFD/g) || []).length;
  const utf8MetaCount = (text.match(/<meta\s+charset=["']UTF-8["']\s*\/?>/gi) || []).length;

  for (const p of suspiciousPatterns) {
    if (p.re.test(text)) issues.push(p.key);
  }

  if (hasBom) issues.push('utf8-bom');
  if (utf8MetaCount > 1) issues.push('duplicate-charset-meta');

  const hasUtf8MetaNearTop = /<meta\s+charset=["']UTF-8["']\s*\/?>/i.test(
    text.slice(0, 1200)
  );
  if (!hasUtf8MetaNearTop) issues.push('missing-early-utf8-meta');

  return { relPath, missing: false, issues, replacementCharCount, hasBom, utf8MetaCount };
}

const results = targetFiles.map(inspectFile);
const failed = results.filter((r) => r.missing || r.issues.length > 0);

if (strictCore) {
  const strictFiles = new Set(['public/index.html', 'public/static/index.html', ...localeEntryFiles]);
  const hardFailures = results.filter((r) => {
    if (r.missing || !strictFiles.has(r.relPath)) return false;
    if (r.replacementCharCount > 0) return true;
    return (
      r.issues.includes('broken-closing-tag') ||
      r.issues.includes('broken-open-tag') ||
      r.issues.includes('legacy-mojibake-signature') ||
      r.issues.includes('utf8-bom') ||
      r.issues.includes('duplicate-charset-meta')
    );
  });

  if (hardFailures.length > 0) {
    console.error('[오류] strict-core 인코딩 검증 실패: 핵심/로케일 엔트리에 문자열/태그/인코딩 손상이 있습니다.');
    for (const r of hardFailures) {
      const issueSummary = [...r.issues, `replacement-char-count=${r.replacementCharCount}`].join(', ');
      console.error(`- ${r.relPath}: ${issueSummary}`);
    }
    process.exit(1);
  }

  console.log('OK: strict-core entry encoding check passed for core + locale files.');
  process.exit(0);
}

if (failed.length === 0) {
  console.log('OK: Entry encoding check passed for all target files.');
} else {
  console.warn('[경고] Entry encoding check에서 문제를 발견했습니다. (빌드 중단 없음)');
  for (const r of failed) {
    if (r.missing) {
      console.warn(`- ${r.relPath}: missing file`);
      continue;
    }
    console.warn(`- ${r.relPath}: ${r.issues.join(', ')}`);
  }
}

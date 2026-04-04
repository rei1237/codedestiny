import { readFileSync, writeFileSync } from 'fs';

const srcPath = 'c:\\Users\\Neo\\Desktop\\Code Destiny Main\\index.html';
const dstPath = 'c:\\Users\\Neo\\Desktop\\Code Destiny Main\\public\\index.html';

const src = readFileSync(srcPath, 'utf8');
const dst = readFileSync(dstPath, 'utf8');

function extractBetween(text, startMark, endMark) {
  const si = text.indexOf(startMark);
  const ei = text.indexOf(endMark);
  if (si === -1 || ei === -1) return null;
  return text.slice(si, ei + endMark.length);
}

function replaceBetween(text, startMark, endMark, replacement) {
  const si = text.indexOf(startMark);
  const ei = text.indexOf(endMark);
  if (si === -1 || ei === -1) return null;
  return text.slice(0, si) + replacement + text.slice(ei + endMark.length);
}

// Extract HTML panel block from src
const HTML_START = '<!-- ═══ 유명인 사주 분석 패널 ═══ -->';
const HTML_END   = '<!-- ═══ 유명인 사주 분석 패널 끝 ═══ -->';
const SCRIPT_START = '<!-- ═══ 유명인 사주 분석 패널 스크립트 ═══ -->';
const SCRIPT_END   = '<!-- ═══ 유명인 사주 분석 패널 스크립트 끝 ═══ -->';

const htmlBlock = extractBetween(src, HTML_START, HTML_END);
const scriptBlock = extractBetween(src, SCRIPT_START, SCRIPT_END);

if (!htmlBlock || !scriptBlock) {
  console.error('Could not extract blocks from src');
  process.exit(1);
}

let out = dst;
out = replaceBetween(out, HTML_START, HTML_END, htmlBlock);
if (!out) { console.error('HTML replace failed in dst'); process.exit(1); }
out = replaceBetween(out, SCRIPT_START, SCRIPT_END, scriptBlock);
if (!out) { console.error('SCRIPT replace failed in dst'); process.exit(1); }

writeFileSync(dstPath, out, 'utf8');
console.log('Sync done. public/index.html updated.');

// Verify
const verify = readFileSync(dstPath, 'utf8');
const hasFilter = verify.includes('initFspFilter');
const hasGrid = verify.includes('initFspGrid');
const hasPjh = verify.includes('박지훈');
const hasUhj = verify.includes('유해진');
console.log('Verify: initFspFilter=' + hasFilter + ' initFspGrid=' + hasGrid + ' 박지훈=' + hasPjh + ' 유해진=' + hasUhj);

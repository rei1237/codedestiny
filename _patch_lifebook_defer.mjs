/**
 * index.html 및 모든 locale에서 life-book.js lazy → immediate defer 전환,
 * 그리고 기타 lifebook 관련 수정 배치 패치
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

const targets = [
  'index.html',
  'public/index.html',
  'public/static/index.html',
  'public/zh-cn/index.html',
  'public/nl-nl/index.html',
  'public/ms-my/index.html',
  'public/ja-jp/index.html',
  'public/hi-in/index.html',
  'public/fr-fr/index.html',
  'public/es-es/index.html',
  'public/de-de/index.html',
  'public/en-us/index.html',
];

const OLD_LAZY = '<script data-cd-lazy-src="/js/life-book.js"></script>';
const NEW_DEFER = '<script src="/js/life-book.js?v=20260404-v3" defer></script>';

let patched = 0, skipped = 0;
for (const rel of targets) {
  const fp = join(__dir, rel);
  try {
    const content = readFileSync(fp, 'utf8');
    if (!content.includes('life-book.js')) { skipped++; continue; }
    if (content.includes('life-book.js?v=20260404-v3')) { console.log('[SKIP already]', rel); skipped++; continue; }
    const updated = content.replace(OLD_LAZY, NEW_DEFER);
    if (updated === content) {
      console.log('[WARN no match]', rel);
      skipped++;
    } else {
      writeFileSync(fp, updated, 'utf8');
      console.log('[OK]', rel);
      patched++;
    }
  } catch (e) {
    console.log('[ERR]', rel, e.message);
  }
}
console.log(`\n완료: ${patched}개 패치, ${skipped}개 스킵`);

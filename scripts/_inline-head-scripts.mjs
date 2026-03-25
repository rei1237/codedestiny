/**
 * HEAD 동기 외부 스크립트 3개를 인라인화하여 파서 블로킹 fetch RTT 제거.
 * 대상: public/static + public/{en-us,de-de,es-es,fr-fr,hi-in,ja-jp,ms-my,nl-nl,zh-cn}/index.html
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const baseDir = path.join(ROOT, 'public');
const inlineDir = path.join(baseDir, 'js', 'inline');

const canonicalJs = fs.readFileSync(path.join(inlineDir, 'canonical-redirect.js'), 'utf8').trimEnd();
const singletonJs = fs.readFileSync(path.join(inlineDir, 'runtime-singleton-guard.js'), 'utf8').trimEnd();
const pwaJs = fs.readFileSync(path.join(inlineDir, 'pwa-theme-init.js'), 'utf8').trimEnd();

// static/index.html: runtime-singleton-guard.js 가 이미 없이 canonical만 남아있을 수도 있음
// locale 파일들: canonical만 있고 runtime-singleton 없음
// pwa는 들여쓰기 없이 라인 단독 존재
const OLD_CANONICAL_WITH_SINGLETON = '  <script src="/js/inline/canonical-redirect.js?v=20260325-hotfix1"></script>\n  <script src="/js/inline/runtime-singleton-guard.js"></script>';
const NEW_CANONICAL_WITH_SINGLETON = `  <script>\n${canonicalJs}\n  </script>\n  <script>\n${singletonJs}\n  </script>`;

const OLD_CANONICAL_ONLY = '  <script src="/js/inline/canonical-redirect.js?v=20260325-hotfix1"></script>';
const NEW_CANONICAL_ONLY = `  <script>\n${canonicalJs}\n  </script>`;

// pwa-theme-init.js 는 들여쓰기 없이 단독 라인
const OLD_PWA = '<script src="/js/inline/pwa-theme-init.js"></script>';
const NEW_PWA = `<script>\n${pwaJs}\n</script>`;

const targetFiles = [
  path.join(baseDir, 'static', 'index.html'),
  path.join(baseDir, 'en-us', 'index.html'),
  path.join(baseDir, 'de-de', 'index.html'),
  path.join(baseDir, 'es-es', 'index.html'),
  path.join(baseDir, 'fr-fr', 'index.html'),
  path.join(baseDir, 'hi-in', 'index.html'),
  path.join(baseDir, 'ja-jp', 'index.html'),
  path.join(baseDir, 'ms-my', 'index.html'),
  path.join(baseDir, 'nl-nl', 'index.html'),
  path.join(baseDir, 'zh-cn', 'index.html'),
];

let updated = 0;
let skipped = 0;

for (const filePath of targetFiles) {
  const rel = path.relative(ROOT, filePath);
  let content = fs.readFileSync(filePath, 'utf8');

  let changed = false;

  if (content.includes(OLD_CANONICAL_WITH_SINGLETON)) {
    content = content.replace(OLD_CANONICAL_WITH_SINGLETON, NEW_CANONICAL_WITH_SINGLETON);
    changed = true;
  } else if (content.includes(OLD_CANONICAL_ONLY)) {
    content = content.replace(OLD_CANONICAL_ONLY, NEW_CANONICAL_ONLY);
    changed = true;
  } else {
    console.warn('[SKIP canonical]', rel, '— pattern not found');
  }

  if (content.includes(OLD_PWA)) {
    content = content.replace(OLD_PWA, NEW_PWA);
    changed = true;
  } else {
    console.warn('[SKIP pwa]', rel, '— pattern not found');
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('[OK]', rel);
    updated++;
  } else {
    skipped++;
  }
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped.`);

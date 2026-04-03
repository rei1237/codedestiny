import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const base = 'C:/Users/Neo/Desktop/Code Destiny Main';
const src = readFileSync(join(base, 'public/index.html'), 'utf8');

// 새 HTML 블록 (public/index.html에서)
const NEW_HTML_START = '<!-- Feature Preview Panel v2 -->';
const NEW_HTML_END = '<button class="tile-pvw-cta-btn" id="tilePvwCtaBtn">지금 시작하기 →</button>\n    </div>\n  </div>\n</div>';
const nhS = src.indexOf(NEW_HTML_START);
const nhE = src.indexOf(NEW_HTML_END, nhS);
if (nhS < 0 || nhE < 0) { console.error('Cannot extract new HTML block'); process.exit(1); }
const newHTML = src.slice(nhS, nhE + NEW_HTML_END.length);
console.log('New HTML len:', newHTML.length);

// 기존 HTML 블록 패턴
const OLD_HTML_START = '<!-- Feature Preview Panel -->';
const OLD_HTML_END = '<button class="tile-pvw-cta-btn" id="tilePvwCtaBtn">지금 시작하기 →</button>\n  </div>\n</div>';

const targets = [
  join(base, 'index.html'),
  join(base, 'public/static/index.html'),
  join(base, 'public/zh-cn/index.html'),
  join(base, 'public/nl-nl/index.html'),
  join(base, 'public/ms-my/index.html'),
  join(base, 'public/es-es/index.html'),
  join(base, 'public/ja-jp/index.html'),
  join(base, 'public/fr-fr/index.html'),
  join(base, 'public/hi-in/index.html'),
  join(base, 'public/en-us/index.html'),
  join(base, 'public/de-de/index.html'),
];

let updated = 0;
for (const fp of targets) {
  let html;
  try { html = readFileSync(fp, 'utf8'); } catch { console.warn('SKIP (not found):', fp); continue; }

  if (!html.includes(OLD_HTML_START)) {
    console.log('⏭ Already updated or not found:', fp.split('\\').pop() + ' (' + fp.split('\\').slice(-2).join('/') + ')');
    continue;
  }

  const s = html.indexOf(OLD_HTML_START);
  const e = html.indexOf(OLD_HTML_END, s);
  if (e < 0) { console.warn('End not found in', fp); continue; }

  const oldBlock = html.slice(s, e + OLD_HTML_END.length);
  html = html.slice(0, s) + newHTML + html.slice(s + oldBlock.length);
  writeFileSync(fp, html, 'utf8');
  updated++;
  console.log('✅ HTML replaced in:', fp.split('\\').slice(-2).join('/'));
}

console.log('\nDone. Updated:', updated, 'files');

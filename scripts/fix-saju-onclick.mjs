import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = 'C:\\Users\\Neo\\Desktop\\Code Destiny Main';

const files = [
  'index.html',
  'public/index.html',
  'public/static/index.html',
  'public/en/index.html',
  'public/ja/index.html',
  'public/zh/index.html',
];

const OLD_ONCLICK = `onclick="return window.__cdOpenSajuTotemFromTile ? window.__cdOpenSajuTotemFromTile(event) : true;"`;

const NEW_ONCLICK = `onclick="(function(e){e.preventDefault();e.stopPropagation();var S='/js/saju-totem-generator.js?v=20260329b';function tryOpen(n){if(typeof window.openSajuTotemModal==='function'){try{window.openSajuTotemModal();}catch(ex){}return;}if(n>0)setTimeout(function(){tryOpen(n-1);},100);}if(!window._stgInit){window._stgInit=true;var s=document.createElement('script');s.src=S;document.head.appendChild(s);}tryOpen(20);})(event)"`;

const OLD_VER = `/js/core/index-inline-runtime.js?v=20260328-hardbind1`;
const NEW_VER = `/js/core/index-inline-runtime.js?v=20260329b`;

let totalReplaced = 0;

for (const rel of files) {
  const fp = join(ROOT, rel.replace(/\//g, '\\'));
  let content;
  try {
    content = readFileSync(fp, 'utf8');
  } catch (e) {
    console.log(`SKIP (not found): ${rel}`);
    continue;
  }

  let changed = false;

  if (content.includes(OLD_ONCLICK)) {
    content = content.replaceAll(OLD_ONCLICK, NEW_ONCLICK);
    console.log(`  [onclick replaced] ${rel}`);
    changed = true;
    totalReplaced++;
  } else {
    console.log(`  [onclick NOT FOUND] ${rel}`);
  }

  if (content.includes(OLD_VER)) {
    content = content.replaceAll(OLD_VER, NEW_VER);
    console.log(`  [runtime ver replaced] ${rel}`);
    changed = true;
  }

  if (changed) {
    writeFileSync(fp, content, 'utf8');
    console.log(`  -> saved: ${rel}`);
  }
}

console.log(`\nDone. onclick replaced in ${totalReplaced} files.`);

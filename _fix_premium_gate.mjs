// Fix: lovebible-tile/lifebook-tile/prem-card bypass conditions + explicit aliases
import fs from 'fs';
import path from 'path';

const files = [
  'public/zh-cn/index.html',
  'public/de-de/index.html',
  'public/hi-in/index.html',
  'public/nl-nl/index.html',
  'public/static/index.html',
  'public/ms-my/index.html',
  'public/ja-jp/index.html',
  'public/fr-fr/index.html',
  'public/es-es/index.html',
  'public/en-us/index.html',
];

const baseDir = 'c:\\Users\\Neo\\Desktop\\Code Destiny Main';

// Fix 1: touchend handler - old: only tarot-tile, new: +prem-card +lifebook-tile +lovebible-tile
const TOUCHEND_OLD = `    if (actionNode.classList.contains('tarot-tile') && !actionNode.getAttribute('data-pvw-bypass')) return;`;
const TOUCHEND_NEW = `    if ((actionNode.classList.contains('tarot-tile') || actionNode.classList.contains('prem-card') || actionNode.classList.contains('lifebook-tile') || actionNode.classList.contains('lovebible-tile')) && !actionNode.getAttribute('data-pvw-bypass')) return;`;

// Fix 2: click handler (might have different old strings depending on version)
const CLICK_OLD_V1 = `        if (actionNode.classList.contains('tarot-tile') && !actionNode.getAttribute('data-pvw-bypass')) {`;
const CLICK_NEW = `        if ((actionNode.classList.contains('tarot-tile') || actionNode.classList.contains('prem-card') || actionNode.classList.contains('lifebook-tile') || actionNode.classList.contains('lovebible-tile')) && !actionNode.getAttribute('data-pvw-bypass')) {`;
// Also handle prem-card only version (from public/index.html-level locked version)
const CLICK_OLD_V2 = `        if ((actionNode.classList.contains('tarot-tile') || actionNode.classList.contains('prem-card')) && !actionNode.getAttribute('data-pvw-bypass')) {`;

// Fix 3: _cdInvokeActionDirect - add explicit aliases for openLifeBookModal/openLoveSecretModal
const INVOKE_OLD = `    // 알려진 액션 별칭: gotoZiweiPremium → openZiweiBookModal
    if (action === 'gotoZiweiPremium' && typeof window.openZiweiBookModal === 'function') {
      window.openZiweiBookModal();
      return;
    }
    // window[action] 함수가 있으면 직접 호출
    if (action && typeof window[action] === 'function') {
      window[action]();
      return;
    }`;
const INVOKE_NEW = `    // 알려진 액션 별칭: gotoZiweiPremium → openZiweiBookModal
    if (action === 'gotoZiweiPremium' && typeof window.openZiweiBookModal === 'function') {
      window.openZiweiBookModal();
      return;
    }
    // 명시적 핸들러: openLifeBookModal
    if (action === 'openLifeBookModal' && typeof window.openLifeBookModal === 'function') {
      window.openLifeBookModal();
      return;
    }
    // 명시적 핸들러: openLoveSecretModal
    if (action === 'openLoveSecretModal' && typeof window.openLoveSecretModal === 'function') {
      window.openLoveSecretModal();
      return;
    }
    // window[action] 함수가 있으면 직접 호출
    if (action && typeof window[action] === 'function') {
      window[action]();
      return;
    }`;

let totalFixed = 0;

for (const relFile of files) {
  const filePath = path.join(baseDir, relFile);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP (not found): ${relFile}`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Fix 1: touchend handler
  if (content.includes(TOUCHEND_OLD)) {
    content = content.replace(TOUCHEND_OLD, TOUCHEND_NEW);
    changed = true;
    console.log(`  [touchend] fixed in ${relFile}`);
  }
  
  // Fix 2: click handler (v1 - only tarot-tile)
  if (content.includes(CLICK_OLD_V1)) {
    content = content.replace(CLICK_OLD_V1, CLICK_NEW);
    changed = true;
    console.log(`  [click-v1] fixed in ${relFile}`);
  }
  // Fix 2: click handler (v2 - tarot-tile + prem-card)
  if (content.includes(CLICK_OLD_V2)) {
    content = content.replace(CLICK_OLD_V2, CLICK_NEW);
    changed = true;
    console.log(`  [click-v2] fixed in ${relFile}`);
  }
  
  // Fix 3: _cdInvokeActionDirect explicit aliases
  if (content.includes(INVOKE_OLD) && !content.includes('명시적 핸들러: openLifeBookModal')) {
    content = content.replace(INVOKE_OLD, INVOKE_NEW);
    changed = true;
    console.log(`  [invoke-alias] fixed in ${relFile}`);
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFixed++;
    console.log(`✓ ${relFile}`);
  } else {
    console.log(`- no changes: ${relFile}`);
  }
}

console.log(`\nDone. ${totalFixed} files updated.`);

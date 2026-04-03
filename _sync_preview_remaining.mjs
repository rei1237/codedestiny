import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const base = 'C:/Users/Neo/Desktop/Code Destiny Main';
const src = readFileSync(join(base, 'public/index.html'), 'utf8');

// CSS 추출
const CSS_START = '<style id="tile-preview-styles">';
const CSS_END = '</style>';
function between(html, s, e) {
  const si = html.indexOf(s);
  if (si < 0) return null;
  const ei = html.indexOf(e, si + s.length);
  if (ei < 0) return null;
  return { start: si, end: ei + e.length, text: html.slice(si, ei + e.length) };
}
const newCSSBlock = between(src, CSS_START, CSS_END);
if (!newCSSBlock) { console.error('CSS not found in src'); process.exit(1); }
const newCSS = newCSSBlock.text;

// JS 스크립트 추출
const JS_START = '<script>\n/* === Tile Feature Preview v2.0';
const JS_END = '\n})();\n</script>\n</body>';
const nsS = src.indexOf(JS_START);
const nsE = src.indexOf(JS_END, nsS);
if (nsS < 0 || nsE < 0) { console.error('JS not found in src'); process.exit(1); }
const newJS = src.slice(nsS, nsE + JS_END.length);

// touchend 수정
const TOUCH_OLD = "    if (perUseApproved[action]) { delete perUseApproved[action]; return; }\n    // 터치 해제 위치가 타일 영역 내인지 확인";
const TOUCH_NEW = "    if (perUseApproved[action]) { delete perUseApproved[action]; return; }\n    // .tarot-tile 직접 터치이고 pvw-bypass 없으면 Preview 패널이 처리\n    if (actionNode.classList.contains('tarot-tile') && !actionNode.getAttribute('data-pvw-bypass')) return;\n    // 터치 해제 위치가 타일 영역 내인지 확인";

// click per-use 수정
const CLICK_OLD = "    // ── 회당 코인 게이트 (per-use) ──\n    var tileCoinCost = Number(actionNode.getAttribute('data-coin-cost') || 0);\n    if (tileCoinCost > 0 && action !== 'unlockPremiumFeature') {\n      if (!perUseApproved[action]) {\n        _cdRunPerUseCoinGate(event, actionNode, action, tileCoinCost);\n        return;\n      }\n      delete perUseApproved[action];\n    }";
const CLICK_NEW = "    // ── 회당 코인 게이트 (per-use) ──\n    var tileCoinCost = Number(actionNode.getAttribute('data-coin-cost') || 0);\n    if (tileCoinCost > 0 && action !== 'unlockPremiumFeature') {\n      if (!perUseApproved[action]) {\n        // .tarot-tile 직접 클릭이고 pvw-bypass 없으면 Preview 패널이 먼저 처리\n        if (actionNode.classList.contains('tarot-tile') && !actionNode.getAttribute('data-pvw-bypass')) {\n          // Preview 인터셉터로 위임 (이벤트 계속 전파)\n        } else {\n          _cdRunPerUseCoinGate(event, actionNode, action, tileCoinCost);\n          return;\n        }\n      } else {\n        delete perUseApproved[action];\n      }\n    }";

// 영구 해금 게이트 수정
const LOCK_OLD = "    if (tileLockKey && tileLockCost > 0 && !unlockedFeatureMap[tileLockKey]) {\n      event.preventDefault();\n      event.stopImmediatePropagation();";
const LOCK_NEW = "    if (tileLockKey && tileLockCost > 0 && !unlockedFeatureMap[tileLockKey]) {\n      // .tarot-tile 직접 클릭이고 pvw-bypass 없으면 Preview 패널이 먼저 처리\n      if (actionNode.classList.contains('tarot-tile') && !actionNode.getAttribute('data-pvw-bypass')) {\n        // Preview 인터셉터로 위임 (이벤트 계속 전파)\n      } else {\n      event.preventDefault();\n      event.stopImmediatePropagation();";
const LOCK_CLOSE_OLD = "      })();\n      return;\n    }\n\n    if (action === 'openGoldenGrainCharge') {";
const LOCK_CLOSE_NEW = "      })();\n      return;\n      } // else: pvw-bypass 있을 때만 해금 진행\n    } // if tileLockKey\n\n    if (action === 'openGoldenGrainCharge') {";

const targets = [
  join(base, 'public/fr-fr/index.html'),
  join(base, 'public/hi-in/index.html'),
  join(base, 'public/en-us/index.html'),
  join(base, 'public/de-de/index.html'),
];

let updated = 0;
for (const fp of targets) {
  let html;
  try { html = readFileSync(fp, 'utf8'); } catch { console.warn('SKIP:', fp); continue; }
  let changed = false;

  // CSS
  if (html.includes('/* === Feature Preview Panel ===')) {
    const r = between(html, CSS_START, CSS_END);
    if (r) { html = html.slice(0, r.start) + newCSS + html.slice(r.end); changed = true; console.log('  CSS'); }
  }

  // JS
  const OLD_JS_V1 = '<script>\n/* === Tile Feature Preview v1.0 === */';
  const OLD_JS_END = '\n})();\n</script>\n</body>';
  if (html.includes('/* === Tile Feature Preview v1.0 === */')) {
    const jsS = html.indexOf(OLD_JS_V1);
    const jsE = html.indexOf(OLD_JS_END, jsS);
    if (jsS >= 0 && jsE >= 0) {
      html = html.slice(0, jsS) + newJS + html.slice(jsS + (jsE + OLD_JS_END.length - jsS));
      changed = true; console.log('  JS');
    }
  }

  // touchend
  if (html.includes(TOUCH_OLD)) { html = html.replace(TOUCH_OLD, TOUCH_NEW); changed = true; console.log('  touchend'); }
  // click per-use
  if (html.includes(CLICK_OLD)) { html = html.replace(CLICK_OLD, CLICK_NEW); changed = true; console.log('  click'); }
  // lock gate
  if (html.includes(LOCK_OLD)) {
    html = html.replace(LOCK_OLD, LOCK_NEW);
    if (html.includes(LOCK_CLOSE_OLD)) html = html.replace(LOCK_CLOSE_OLD, LOCK_CLOSE_NEW);
    changed = true; console.log('  lock');
  }

  if (changed) {
    writeFileSync(fp, html, 'utf8');
    updated++;
    console.log('✅', fp.split('\\').slice(-2).join('/'));
  } else {
    console.log('⏭', fp.split('\\').slice(-2).join('/'));
  }
}
console.log('\nDone. Updated:', updated);

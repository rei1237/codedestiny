import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const base = 'C:/Users/Neo/Desktop/Code Destiny Main';
const src = readFileSync(join(base, 'public/index.html'), 'utf8');

// ── 섹션 추출 ──────────────────────────────────────────────────
function between(html, startMark, endMark) {
  const s = html.indexOf(startMark);
  if (s < 0) throw new Error('Start not found: ' + startMark.slice(0, 60));
  const e = html.indexOf(endMark, s + startMark.length);
  if (e < 0) throw new Error('End not found: ' + endMark.slice(0, 60));
  return html.slice(s, e + endMark.length);
}

// CSS 블록
const CSS_START = '<style id="tile-preview-styles">';
const CSS_END = '</style>';
const newCSS = between(src, CSS_START, CSS_END);

// HTML 블록
const HTML_START = '<!-- Feature Preview Panel v2 -->';
// HTML 끝은 마지막 </div>\n</div> 패턴 — <!-- Feature Preview Panel v2 --> 뒤 3번째 </div>
// tilePvwOverlay div 닫기: 3개의 div가 열리므로 </div>\n</div> 뒤에 \n</div> 마지막
// 안전하게: <!-- Feature Preview Panel v1 --> ~ </div>\n</div> 추출 대신 직접 표시
const OLD_HTML_START = '<!-- Feature Preview Panel -->';
const OLD_HTML_END = '</div>\n</div>';   // tilePvwSheet 끝 + tilePvwOverlay 끝

// JS 스크립트 블록
const JS_START = '/* === Tile Feature Preview v2.0 (이미지 포함 상세 페이지) === */';
const JS_END = '</script>\n</body>';

// touchend 수정 — 새 라인 추가 여부만 확인
const TOUCH_OLD = '    if (perUseApproved[action]) { delete perUseApproved[action]; return; }\n    // 터치 해제 위치가 타일 영역 내인지 확인';
const TOUCH_NEW = '    if (perUseApproved[action]) { delete perUseApproved[action]; return; }\n    // .tarot-tile 직접 터치이고 pvw-bypass 없으면 Preview 패널이 처리\n    if (actionNode.classList.contains(\'tarot-tile\') && !actionNode.getAttribute(\'data-pvw-bypass\')) return;\n    // 터치 해제 위치가 타일 영역 내인지 확인';

// click 핸들러 수정 — per-use 코인게이트
const CLICK_OLD = `    // ── 회당 코인 게이트 (per-use) ──
    var tileCoinCost = Number(actionNode.getAttribute('data-coin-cost') || 0);
    if (tileCoinCost > 0 && action !== 'unlockPremiumFeature') {
      if (!perUseApproved[action]) {
        _cdRunPerUseCoinGate(event, actionNode, action, tileCoinCost);
        return;
      }
      delete perUseApproved[action];
    }`;

const CLICK_NEW = `    // ── 회당 코인 게이트 (per-use) ──
    var tileCoinCost = Number(actionNode.getAttribute('data-coin-cost') || 0);
    if (tileCoinCost > 0 && action !== 'unlockPremiumFeature') {
      if (!perUseApproved[action]) {
        // .tarot-tile 직접 클릭이고 pvw-bypass 없으면 Preview 패널이 먼저 처리
        if (actionNode.classList.contains('tarot-tile') && !actionNode.getAttribute('data-pvw-bypass')) {
          // Preview 인터셉터로 위임 (이벤트 계속 전파)
        } else {
          _cdRunPerUseCoinGate(event, actionNode, action, tileCoinCost);
          return;
        }
      } else {
        delete perUseApproved[action];
      }
    }`;

// 영구 해금 게이트 수정
const LOCK_OLD = `    if (tileLockKey && tileLockCost > 0 && !unlockedFeatureMap[tileLockKey]) {
      event.preventDefault();
      event.stopImmediatePropagation();`;

const LOCK_NEW = `    if (tileLockKey && tileLockCost > 0 && !unlockedFeatureMap[tileLockKey]) {
      // .tarot-tile 직접 클릭이고 pvw-bypass 없으면 Preview 패널이 먼저 처리
      if (actionNode.classList.contains('tarot-tile') && !actionNode.getAttribute('data-pvw-bypass')) {
        // Preview 인터셉터로 위임 (이벤트 계속 전파)
      } else {
      event.preventDefault();
      event.stopImmediatePropagation();`;

const LOCK_CLOSE_OLD = `      })();
      return;
    }

    if (action === 'openGoldenGrainCharge') {`;

const LOCK_CLOSE_NEW = `      })();
      return;
      } // else: pvw-bypass 있을 때만 해금 진행
    } // if tileLockKey

    if (action === 'openGoldenGrainCharge') {`;

// 구 CSS / HTML / JS 패턴 (old로 교체할 원본)
const OLD_CSS_INNER = '/* === Feature Preview Panel ===';

const targets = [
  join(base, 'index.html'),
  join(base, 'public/static/index.html'),
  join(base, 'public/zh-cn/index.html'),
  join(base, 'public/nl-nl/index.html'),
  join(base, 'public/ms-my/index.html'),
  join(base, 'public/es-es/index.html'),
  join(base, 'public/ja-jp/index.html'),
];

let updated = 0;
for (const fp of targets) {
  let html;
  try { html = readFileSync(fp, 'utf8'); } catch { console.warn('SKIP (not found):', fp); continue; }

  let changed = false;

  // 1. CSS 교체
  if (html.includes(OLD_CSS_INNER)) {
    const oldCSS = between(html, CSS_START, CSS_END);
    html = html.replace(oldCSS, newCSS);
    changed = true;
    console.log('  CSS replaced in', fp.split('/').pop());
  }

  // 2. HTML 구조 교체 (<!-- Feature Preview Panel --> ~ 마지막 </div>)
  if (html.includes(OLD_HTML_START)) {
    // 대상 HTML 블록 추출 (시작~시트 닫기~오버레이 닫기 2개 </div>)
    const hStart = html.indexOf(OLD_HTML_START);
    // 2개의 </div>\n</div> 패턴을 찾기(sheet+overlay)
    let pos = hStart;
    let divCount = 0;
    // <!-- Feature Preview Panel --> 다음에 <div 2개 있으므로 각 </div> 2번 찾기
    // 더 안정적으로: </div>\n</div>\n<!-- after --> 패턴 사용
    // 간단하게 tilePvwCtaBtn 이후 </div></div></div> 패턴
    const ctaEnd = html.indexOf('</button>\n    </div>\n  </div>\n</div>', hStart);
    if (ctaEnd >= 0) {
      const hEnd = ctaEnd + '</button>\n    </div>\n  </div>\n</div>'.length;
      const oldBlock = html.slice(hStart, hEnd);
      // newHTML 빌드 (src에서 추출)
      const nhStart = src.indexOf(HTML_START);
      const nhCtaEnd = src.indexOf('</button>\n    </div>\n  </div>\n</div>', nhStart);
      if (nhCtaEnd >= 0) {
        const newBlock = src.slice(nhStart, nhCtaEnd + '</button>\n    </div>\n  </div>\n</div>'.length);
        html = html.slice(0, hStart) + newBlock + html.slice(hEnd);
        changed = true;
        console.log('  HTML block replaced in', fp.split('/').pop());
      }
    }
  }

  // 3. JS 스크립트 교체 (Tile Feature Preview v1.0 → v2.0)
  if (html.includes('/* === Tile Feature Preview v1.0 === */')) {
    const jsStart = html.indexOf('/* === Tile Feature Preview v1.0 === */') - '<script>\n'.length;
    // 종료: </body></html> 바로 위의 </script>
    const jsEndMark = '\n})();\n</script>\n</body>';
    const jsEndIdx = html.indexOf(jsEndMark, jsStart);
    if (jsEndIdx >= 0) {
      const oldScript = html.slice(jsStart, jsEndIdx + jsEndMark.length);
      // src에서 새 스크립트 추출
      const nsStart = src.indexOf('<script>\n/* === Tile Feature Preview v2.0');
      const nsEnd = src.indexOf('\n})();\n</script>\n</body>', nsStart);
      if (nsStart >= 0 && nsEnd >= 0) {
        const newScript = src.slice(nsStart, nsEnd + '\n})();\n</script>\n</body>'.length);
        html = html.slice(0, jsStart) + newScript + html.slice(jsStart + oldScript.length);
        changed = true;
        console.log('  JS script replaced in', fp.split('/').pop());
      }
    }
  }

  // 4. touchend 핸들러 수정
  if (html.includes(TOUCH_OLD)) {
    html = html.replace(TOUCH_OLD, TOUCH_NEW);
    changed = true;
    console.log('  touchend patched in', fp.split('/').pop());
  }

  // 5. click 핸들러 - per-use 수정
  if (html.includes(CLICK_OLD)) {
    html = html.replace(CLICK_OLD, CLICK_NEW);
    changed = true;
    console.log('  click per-use patched in', fp.split('/').pop());
  }

  // 6. 영구 해금 게이트 수정
  if (html.includes(LOCK_OLD)) {
    html = html.replace(LOCK_OLD, LOCK_NEW);
    html = html.replace(LOCK_CLOSE_OLD, LOCK_CLOSE_NEW);
    changed = true;
    console.log('  lock gate patched in', fp.split('/').pop());
  }

  if (changed) {
    writeFileSync(fp, html, 'utf8');
    updated++;
    console.log('✅ Written:', fp.replace(base + '/', ''));
  } else {
    console.log('⏭ No change needed:', fp.replace(base + '/', ''));
  }
}

console.log('\nDone. Updated:', updated, 'files');

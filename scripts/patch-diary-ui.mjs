/**
 * patch-diary-ui.mjs — Luck-Sync Diary UI 전면 리뉴얼
 * Node.js ESM, CRLF-safe
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function patch(filePath) {
  let src = readFileSync(filePath, 'utf8');

  // Find buildModal function boundaries
  const fnIdx = src.indexOf('function buildModal');
  if (fnIdx < 0) { console.error('[SKIP] not found: ' + filePath); return false; }
  const startComment = src.lastIndexOf('/*', fnIdx);  // /* ─── 모달 HTML 생성 ... */
  const endSearchStr = '\u2500\u2500\u2500 \uBAA8\uB2EC \uC624\uD508'; // ─── 모달 오픈
  const endCommentIdx = src.indexOf(endSearchStr, fnIdx);
  const ei = src.lastIndexOf('/*', endCommentIdx);    // /* ─── 모달 오픈 ... */
  if (startComment < 0 || ei <= startComment) {
    console.error('[SKIP] boundaries bad: ' + startComment + ',' + ei + ' in ' + filePath);
    return false;
  }

  // Build new code block (functions + opening comment of next section)
  const nl = src.includes('\r\n') ? '\r\n' : '\n';
  const newCode = makeCode(nl);
  src = src.slice(0, startComment) + newCode + src.slice(ei);

  // Replace drawRadar call
  src = src.replace(
    /setTimeout\(function\s*\(\)\s*\{\s*drawRadar\(scores\);\s*\},\s*\d+\);/,
    'renderScoreBars(scores);'
  );
  src = src.replace(/\/\*\s*\uAC13\uC0DD \uC9C0\uC218 \uB808\uC774\uB354\s*\*\//, '/* \uAC13\uC0DD \uC9C0\uC218 \uC2A4\ucf54\uc5b4 \uBC14 */');

  writeFileSync(filePath, src, 'utf8');
  console.log('[OK] ' + filePath);
  return true;
}

function makeCode(nl) {
  const i = '  '; // 2-space indent used in this file
  const lines = [
    `${i}/* \u2500\u2500\u2500 \uAC13\uC0DD \uC9C0\uC218 \uC2A4\ucf54\uc5b4 \uBC14 \uB80C\uB354 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */`,
    `${i}function renderScoreBars(scores) {`,
    `${i}  var container = document.getElementById('lsdScoreBars');`,
    `${i}  if (!container) return;`,
    `${i}  var items = [`,
    `${i}    { key: 'wealth', label: '\uC7AC\uBB3C \uD83D\uDCB0', color: '#fbbf24' },`,
    `${i}    { key: 'love',   label: '\uC560\uC815 \uD83D\uDC95', color: '#f472b6' },`,
    `${i}    { key: 'fame',   label: '\uBA85\uC608 \uD83D\uDC51', color: '#a78bfa' },`,
    `${i}    { key: 'health', label: '\uAC74\uAC15 \uD83D\uDC9A', color: '#4ade80' },`,
    `${i}    { key: 'study',  label: '\uD559\uC2B5 \uD83D\uDCDA', color: '#60a5fa' }`,
    `${i}  ];`,
    `${i}  container.innerHTML = items.map(function (item) {`,
    `${i}    var val = scores[item.key] || 0;`,
    `${i}    return '<div>' +`,
    `${i}      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">' +`,
    `${i}        '<span style="font-size:.74rem;font-weight:700;color:#374151">' + item.label + '</span>' +`,
    `${i}        '<span style="font-size:.74rem;font-weight:900;color:' + item.color + '">' + val + '</span>' +`,
    `${i}      '</div>' +`,
    `${i}      '<div style="height:8px;border-radius:999px;background:#f3f4f6;overflow:hidden">' +`,
    `${i}        '<div class="lsd-score-bar-fill" style="width:0%" data-target="' + val + '%"></div>' +`,
    `${i}      '</div>' +`,
    `${i}    '</div>';`,
    `${i}  }).join('');`,
    `${i}  setTimeout(function () {`,
    `${i}    container.querySelectorAll('.lsd-score-bar-fill').forEach(function (bar) {`,
    `${i}      bar.style.width = bar.dataset.target;`,
    `${i}    });`,
    `${i}  }, 80);`,
    `${i}}`,
    ``,
    `${i}/* \u2500\u2500\u2500 \uBAA8\uB2EC HTML \uC0DD\uC131 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */`,
    `${i}function buildModal() {`,
    `${i}  if (document.getElementById('luckSyncDiaryModal')) return;`,
    ``,
    `${i}  if (!document.getElementById('lsd-tw-styles')) {`,
    `${i}    var st = document.createElement('style');`,
    `${i}    st.id = 'lsd-tw-styles';`,
    `${i}    st.textContent = [`,
    `${i}      '@keyframes lsdGlobeSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}',`,
    `${i}      '@keyframes lsdPopIn{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}',`,
    `${i}      '@keyframes lsdSlideUp{0%{transform:translateY(16px);opacity:0}100%{transform:translateY(0);opacity:1}}',`,
    `${i}      '.lsd-globe-inner.is-spinning{animation:lsdGlobeSpin .2s linear infinite}',`,
    `${i}      '.lsd-result--pop{animation:lsdPopIn .4s cubic-bezier(.17,.67,.35,1.4) forwards}',`,
    `${i}      '.lsd-tab{background:transparent;color:#6b7280;border:1.5px solid transparent;transition:all .2s;white-space:nowrap;flex:none;padding:7px 14px;border-radius:999px;font-size:.75rem;font-weight:700;cursor:pointer}',`,
    `${i}      '.lsd-tab:hover{background:rgba(124,58,237,.08);color:#7c3aed}',`,
    `${i}      '.lsd-tab.is-active{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;box-shadow:0 4px 14px rgba(99,102,241,.35)}',`,
    `${i}      '.lsd-score-bar-fill{background:linear-gradient(90deg,#34d399,#60a5fa,#a78bfa);transition:width .8s ease;height:100%;border-radius:999px;box-shadow:0 0 8px rgba(96,165,250,.3)}',`,
    `${i}      '.lsd-challenge-item{display:flex;align-items:center;gap:12px;padding:14px 0;cursor:pointer;border-bottom:1px solid #f3f4f6}',`,
    `${i}      '.lsd-challenge-item:last-child{border-bottom:none}',`,
    `${i}      '.lsd-challenge-item.is-done .lsd-check-box{background:#7c3aed;border-color:#7c3aed;color:#fff}',`,
    `${i}      '.lsd-challenge-item.is-done .lsd-challenge-text{text-decoration:line-through;color:#9ca3af}',`,
    `${i}      '.lsd-check-box{width:24px;height:24px;border-radius:8px;border:2px solid #c4b5fd;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:900;color:#7c3aed;flex-shrink:0;transition:all .2s}',`,
    `${i}      '.lsd-challenge-text{font-size:.85rem;color:#374151;flex:1;line-height:1.45}',`,
    `${i}      '.lsd-match-btn{flex:1;padding:10px 6px;border-radius:12px;border:1.5px solid #e5e7eb;font-size:.73rem;font-weight:700;color:#6b7280;cursor:pointer;transition:all .2s;background:#fff;text-align:center;min-width:0}',`,
    `${i}      '.lsd-match-btn:hover{border-color:#c4b5fd;background:#faf5ff;color:#7c3aed}',`,
    `${i}      '.lsd-match-btn.is-active{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border-color:transparent;box-shadow:0 4px 12px rgba(124,58,237,.28)}',`,
    `${i}      '.lsd-mood-btn{font-size:1.8rem;padding:8px;border-radius:12px;border:none;background:transparent;cursor:pointer;transition:all .2s}',`,
    `${i}      '.lsd-mood-btn:hover{transform:scale(1.2);filter:drop-shadow(0 0 6px rgba(167,139,250,.6))}',`,
    `${i}      '.lsd-mood-btn.is-active{transform:scale(1.3);background:rgba(237,233,254,.5);filter:drop-shadow(0 0 10px rgba(167,139,250,.8))}',`,
    `${i}      '.lsd-diary-lines{background-image:repeating-linear-gradient(to bottom,transparent,transparent 27px,#e2e8f0 27px,#e2e8f0 28px);line-height:1.85;padding-top:4px}',`,
    `${i}      '.lsd-history-item{background:#fff;border-radius:14px;padding:12px 14px;border-left:4px solid #7c3aed;box-shadow:0 2px 8px rgba(124,58,237,.1);animation:lsdSlideUp .3s ease}',`,
    `${i}      '.lsd-history-date{font-size:.72rem;font-weight:700;color:#7c3aed;margin-bottom:5px}',`,
    `${i}      '.lsd-history-meta{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:4px}',`,
    `${i}      '.lsd-history-tag{font-size:.65rem;padding:2px 8px;border-radius:999px;background:rgba(124,58,237,.1);color:#7c3aed;font-weight:600}',`,
    `${i}      '.lsd-history-log{font-size:.78rem;color:#4b5563;line-height:1.5;font-style:italic}',`,
    `${i}      '.lsd-empty{text-align:center;color:#9ca3af;font-size:.85rem;padding:32px 0}',`,
    `${i}      '.lsd-elem-badge{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:999px;font-size:.72rem;font-weight:700;border:1.5px solid}',`,
    `${i}      '.lsd-badge-tag{font-size:.58rem;background:rgba(255,255,255,.3);border-radius:4px;padding:1px 4px;margin-left:2px}',`,
    `${i}      '.lsd-badge-tag--ki{background:rgba(239,68,68,.2);color:#fca5a5}',`,
    `${i}      '.lsd-iljin-elem{font-size:.78rem;opacity:.8;margin-left:4px}',`,
    `${i}    ].join('');`,
    `${i}    document.head.appendChild(st);`,
    `${i}  }`,
    ``,
    `${i}  var modal = document.createElement('div');`,
    `${i}  modal.id = 'luckSyncDiaryModal';`,
    `${i}  modal.setAttribute('role', 'dialog');`,
    `${i}  modal.setAttribute('aria-modal', 'true');`,
    `${i}  modal.setAttribute('aria-label', 'Luck-Sync \uAC13\uC0DD \uB2E4\uC774\uC5B4\uB9AC');`,
    `${i}  modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);align-items:center;justify-content:center;padding:16px;box-sizing:border-box;overflow-y:auto';`,
    ``,
    `${i}  modal.innerHTML = [`,
    // Shell
    `${i}    '<div style="position:relative;width:100%;max-width:600px;background:#fff;border-radius:24px;box-shadow:0 24px 60px rgba(0,0,0,.2),0 8px 24px rgba(124,58,237,.1);max-height:88vh;display:flex;flex-direction:column;overflow:hidden;margin:0 auto">',`,
    `${i}    '<div style="display:flex;justify-content:center;padding:10px 0 4px;flex-shrink:0"><div style="width:36px;height:4px;border-radius:2px;background:rgba(0,0,0,.1)"></div></div>',`,
    `${i}    '<button style="position:absolute;top:12px;right:14px;z-index:20;width:32px;height:32px;border-radius:50%;border:none;background:rgba(0,0,0,.06);color:#6b7280;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s" onmouseover="this.style.background=\\'rgba(239,68,68,.15)\\';this.style.color=\\'#ef4444\\';this.style.transform=\\'rotate(90deg)\\'" onmouseout="this.style.background=\\'rgba(0,0,0,.06)\\';this.style.color=\\'#6b7280\\';this.style.transform=\\'rotate(0deg)\\'" data-action="closeLuckSyncDiary" aria-label="\uB2EB\uAE30">\u2715</button>',`,
    // Header
    `${i}    '<header style="padding:12px 20px 14px;background:linear-gradient(135deg,#7c3aed 0%,#6d28d9 45%,#4f46e5 100%);position:relative;overflow:hidden;flex-shrink:0">',`,
    `${i}    '<div style="position:absolute;top:-30px;right:-20px;width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,.07)"></div>',`,
    `${i}    '<div style="position:absolute;bottom:-40px;left:35%;width:90px;height:90px;border-radius:50%;background:rgba(255,255,255,.05)"></div>',`,
    `${i}    '<div style="display:flex;align-items:center;gap:14px;position:relative">',`,
    `${i}    '<div style="width:52px;height:52px;border-radius:14px;overflow:hidden;flex-shrink:0;border:2px solid rgba(255,255,255,.35);box-shadow:0 4px 16px rgba(0,0,0,.25)"><img src="/fuctionassets/godlife.webp" alt="" style="width:100%;height:100%;object-fit:cover" width="52" height="52" loading="lazy" decoding="async"></div>',`,
    `${i}    '<div style="flex:1;min-width:0"><p style="font-size:.58rem;letter-spacing:.2em;color:rgba(255,255,255,.65);margin:0 0 2px;font-weight:700;text-transform:uppercase">\u2746 Luck-Sync Diary \u2746</p><h2 style="font-size:1.08rem;font-weight:900;color:#fff;margin:0 0 2px;line-height:1.2">\uAC13\uC0DD \uC6B4\uAD6C\uAE30\uC77C \uB2E4\uC774\uC5B4\uB9AC</h2><p style="font-size:.75rem;color:rgba(255,255,255,.8);margin:0" id="lsdTodayDate"></p></div>',`,
    `${i}    '</div></header>',`,
    // Tabs
    `${i}    '<nav style="display:flex;gap:6px;padding:10px 14px;overflow-x:auto;background:#fff;border-bottom:1px solid #f3f4f6;flex-shrink:0;scrollbar-width:none;-ms-overflow-style:none" role="tablist">',`,
    `${i}    '<button class="lsd-tab is-active" role="tab" data-tab="dashboard" aria-selected="true">\uD83D\uDCCA \uB300\uC2DC\uBCF4\uB4DC</button>',`,
    `${i}    '<button class="lsd-tab" role="tab" data-tab="lotto" aria-selected="false">\uD83C\uDFB0 \uB7ED\uD0A4\uBFD1\uAE30</button>',`,
    `${i}    '<button class="lsd-tab" role="tab" data-tab="challenge" aria-selected="false">\u2705 \uC624\uC6B4\uC644</button>',`,
    `${i}    '<button class="lsd-tab" role="tab" data-tab="night" aria-selected="false">\uD83C\uDF19 \uC57C\uAC04\uD68C\uACE0</button>',`,
    `${i}    '<button class="lsd-tab" role="tab" data-tab="history" aria-selected="false">\uD83D\uDCC5 \uAE30\uB85D</button>',`,
    `${i}    '</nav>',`,
    // Panels wrapper
    `${i}    '<div style="flex:1;overflow-y:auto;background:#f9fafb;scrollbar-width:thin">',`,
    // DASHBOARD
    `${i}    '<section class="lsd-panel" id="lsdPanelDashboard" role="tabpanel" style="padding:14px;display:block">',`,
    `${i}    '<div id="lsdSajuWidget" style="background:#fff;border-radius:16px;padding:14px 16px;margin-bottom:12px;box-shadow:0 1px 6px rgba(0,0,0,.06);border:1px solid #f3f4f6">',`,
    `${i}    '<p style="font-size:.6rem;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.16em;margin:0 0 8px">\u2746 \uB098\uC758 \uC77C\uAC04(\u65E5\uE0B9) \uC624\uD589</p>',`,
    `${i}    '<div id="lsdDayMaster" style="font-size:1.4rem;font-weight:900;color:#111827;margin-bottom:8px">\u2014</div>',`,
    `${i}    '<div id="lsdElemBadges" style="display:flex;flex-wrap:wrap;gap:6px"></div></div>',`,
    `${i}    '<div id="lsdEnergyCard" style="background:linear-gradient(135deg,#6d28d9,#4f46e5);border-radius:20px;padding:16px 18px;margin-bottom:12px;color:#fff;position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.12);box-shadow:0 8px 28px rgba(109,40,217,.28)">',`,
    `${i}    '<div style="position:absolute;top:-16px;right:-16px;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,.07)"></div>',`,
    `${i}    '<p style="font-size:.6rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.65);margin:0 0 8px">\u26A1 \uC624\uB298\uC758 \uC5D0\uB108\uC9C0</p>',`,
    `${i}    '<div id="lsdEnergyIljin" style="font-size:.95rem;font-weight:800;margin-bottom:4px">\uC624\uB298\uC758 \uC77C\uC9C4 \uB85C\uB529 \uC911...</div>',`,
    `${i}    '<div id="lsdEnergyStar" style="font-size:.8rem;font-weight:700;color:rgba(255,255,255,.88);margin-bottom:10px">\uC2ED\uC131: \u2014</div>',`,
    `${i}    '<div id="lsdEnergyGuide" style="font-size:.78rem;color:rgba(255,255,255,.85);background:rgba(255,255,255,.12);border-radius:10px;padding:8px 12px;line-height:1.5">\uC0AC\uC8FC\uB97C \uBA3C\uC800 \uBD84\uC11D\uD558\uBA74 \uC815\uD655\uD55C \uC5D0\uB108\uC9C0 \uAC00\uC774\uB4DC\uB97C \uBC1B\uC744 \uC218 \uC788\uC5B4\uC694!</div></div>',`,
    `${i}    '<div style="background:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 1px 6px rgba(0,0,0,.06);border:1px solid #f3f4f6">',`,
    `${i}    '<p style="font-size:.85rem;font-weight:900;color:#111827;margin:0 0 2px">\uD83D\uDCAB \uC624\uB298\uC758 \uAC13\uC0DD \uC9C0\uC218</p>',`,
    `${i}    '<p style="font-size:.7rem;color:#9ca3af;margin:0 0 14px">\uC0AC\uC8FC \uC624\uD589 \uAE30\uBC18 5\uB300 \uC6B4\uC138 \uC9C0\uC218 \uBD84\uC11D</p>',`,
    `${i}    '<div id="lsdScoreBars" style="display:flex;flex-direction:column;gap:10px"></div>',`,
    `${i}    '<div id="lsdLuckElemRow" style="margin-top:12px;font-size:.74rem;color:#6b7280;text-align:center;font-weight:600"></div>',`,
    `${i}    '</div></section>',`,
    // LOTTO
    `${i}    '<section class="lsd-panel" id="lsdPanelLotto" role="tabpanel" style="padding:14px;display:none">',`,
    `${i}    '<div style="background:#fff;border-radius:16px;padding:16px 14px;box-shadow:0 1px 6px rgba(0,0,0,.06);border:1px solid #f3f4f6;text-align:center">',`,
    `${i}    '<h3 style="font-size:.88rem;font-weight:900;color:#111827;margin:0 0 2px">\uD83C\uDFB0 \uB7ED\uD0A4 \uBE44\uD0A4 \uAC00\uCC60 \uBFD1\uAE30</h3>',`,
    `${i}    '<p style="font-size:.72rem;color:#9ca3af;margin:0 0 20px;line-height:1.5">\uC624\uB298\uC758 \uD589\uC6B4 \uC624\uD589 \uAE30\uBC18\uC73C\uB85C LUCKY ITEM\uC744 \uBFD1\uC544\uBD10~!</p>',`,
    `${i}    '<div id="lsdLottoMachine" aria-live="polite" style="position:relative;padding:4px 0 10px">',`,
    `${i}    '<div style="width:128px;height:128px;border-radius:50%;background:linear-gradient(135deg,#ede9fe,#ddd6fe);border:4px solid #c4b5fd;margin:0 auto 10px;position:relative;overflow:hidden;box-shadow:inset 0 4px 14px rgba(124,58,237,.18),0 6px 24px rgba(124,58,237,.2)">',`,
    `${i}    '<div id="lsdGlobeInner" style="position:absolute;inset:8px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:2px;font-size:1.5rem;user-select:none">\uD83C\uDF31 \uD83D\uDD25 \uD83E\uDD0E \u26A1 \uD83D\uDCA7</div>',`,
    `${i}    '<div style="position:absolute;top:10px;left:14px;width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.55);filter:blur(3px)"></div></div>',`,
    `${i}    '<div style="width:48px;height:7px;border-radius:4px;background:#c4b5fd;margin:0 auto 12px;opacity:.5"></div>',`,
    `${i}    '<div id="lsdLuckyElemHint" style="font-size:.74rem;font-weight:700;color:#7c3aed;margin-bottom:14px;min-height:18px"></div>',`,
    `${i}    '<button id="lsdLottoBtn" type="button" style="padding:12px 24px;border:none;border-radius:999px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;font-size:.85rem;font-weight:900;cursor:pointer;box-shadow:0 4px 18px rgba(124,58,237,.4);transition:all .2s" onmouseover="this.style.transform=\\'scale(1.05)\\';this.style.boxShadow=\\'0 8px 26px rgba(124,58,237,.5)\\'" onmouseout="this.style.transform=\\'scale(1)\\';this.style.boxShadow=\\'0 4px 18px rgba(124,58,237,.4)\\'"">\uD83C\uDFB1 \uC624\uB298\uC758 \uB7ED\uD0A4 \uBE44\uD0A4 \uBFD1\uAE30</button></div>',`,
    `${i}    '<div id="lsdLottoResult" style="display:none;margin-top:18px">',`,
    `${i}    '<div style="display:inline-flex;flex-direction:column;align-items:center;gap:8px;background:linear-gradient(135deg,#faf5ff,#ede9fe);border-radius:20px;padding:22px 36px;border:1px solid #c4b5fd;width:100%;box-sizing:border-box">',`,
    `${i}    '<div id="lsdResultBall" style="width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:900;color:#fff;box-shadow:0 4px 16px rgba(124,58,237,.4)"></div>',`,
    `${i}    '<div id="lsdResultEmoji" style="font-size:3rem;line-height:1;margin:-4px 0"></div>',`,
    `${i}    '<div id="lsdResultName" style="font-size:1rem;font-weight:900;color:#1f1035"></div>',`,
    `${i}    '<div id="lsdResultTip" style="font-size:.76rem;color:#6b7280;text-align:center;line-height:1.55;max-width:200px"></div>',`,
    `${i}    '<p style="font-size:.72rem;font-weight:700;color:#7c3aed;margin:0">\uC624\uB298\uC758 \uB7ED\uD0A4\uBE44\uD0A4 \uB4DD\uD15C! \u2728</p>',`,
    `${i}    '<button id="lsdRedrawBtn" type="button" style="padding:7px 18px;border-radius:999px;border:1.5px solid #c4b5fd;background:transparent;font-size:.72rem;font-weight:700;color:#7c3aed;cursor:pointer;transition:all .2s" onmouseover="this.style.background=\\'#ede9fe\\'" onmouseout="this.style.background=\\'transparent\\'">\uD83D\uDD04 \uB2E4\uC2DC \uBFD1\uAE30</button>',`,
    `${i}    '</div></div></div></section>',`,
    // CHALLENGE
    `${i}    '<section class="lsd-panel" id="lsdPanelChallenge" role="tabpanel" style="padding:14px;display:none">',`,
    `${i}    '<div style="background:#fff;border-radius:16px;padding:14px 16px;margin-bottom:12px;box-shadow:0 1px 6px rgba(0,0,0,.06);border:1px solid #f3f4f6">',`,
    `${i}    '<h3 style="font-size:.88rem;font-weight:900;color:#111827;margin:0 0 2px">\u2705 \uC624\uC6B4\uC644 \uCC4C\uB9B0\uC9C0</h3>',`,
    `${i}    '<p style="font-size:.72rem;color:#9ca3af;margin:0 0 12px;line-height:1.4">\uC624\uB298\uC758 \uAC13\uC0DD \uBBF8\uC158\uC744 \uC644\uB8CC\uD558\uACE0 \uAE30\uC6B4\uC744 \uC313\uC544\uBD10~!</p>',`,
    `${i}    '<div id="lsdChallenges"></div></div>',`,
    `${i}    '<div style="background:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 1px 6px rgba(0,0,0,.06);border:1px solid #f3f4f6">',`,
    `${i}    '<p style="font-size:.85rem;font-weight:900;color:#111827;margin:0 0 14px">\uC9C0\uAE08 \uB098\uC758 \uAE30\uBD84\uC740? \uD83E\uDEF6</p>',`,
    `${i}    '<div id="lsdMoodEmojis" style="display:flex;justify-content:space-around">',`,
    `${i}    '<button type="button" class="lsd-mood-btn" data-emoji="\uD83D\uDD25">\uD83D\uDD25</button>',`,
    `${i}    '<button type="button" class="lsd-mood-btn" data-emoji="\uD83D\uDE0A">\uD83D\uDE0A</button>',`,
    `${i}    '<button type="button" class="lsd-mood-btn" data-emoji="\uD83D\uDE0C">\uD83D\uDE0C</button>',`,
    `${i}    '<button type="button" class="lsd-mood-btn" data-emoji="\uD83D\uDE10">\uD83D\uDE10</button>',`,
    `${i}    '<button type="button" class="lsd-mood-btn" data-emoji="\uD83D\uDE14">\uD83D\uDE14</button>',`,
    `${i}    '<button type="button" class="lsd-mood-btn" data-emoji="\uD83E\uDD71">\uD83E\uDD71</button>',`,
    `${i}    '</div></div></section>',`,
    // NIGHT LOG
    `${i}    '<section class="lsd-panel" id="lsdPanelNight" role="tabpanel" style="padding:14px;display:none">',`,
    `${i}    '<div style="background:#fff;border-radius:16px;padding:14px 16px;margin-bottom:12px;box-shadow:0 1px 6px rgba(0,0,0,.06);border:1px solid #f3f4f6">',`,
    `${i}    '<h3 style="font-size:.88rem;font-weight:900;color:#111827;margin:0 0 2px">\uD83C\uDF19 \uC0AC\uC8FC \uC57C\uAC04 \uD68C\uACE0</h3>',`,
    `${i}    '<p style="font-size:.72rem;color:#9ca3af;margin:0 0 12px;line-height:1.4">\uC624\uB298 \uD558\uB8E8 \uC0AC\uC8FC \uC5D0\uB108\uC9C0\uC640 \uC5BC\uB9C8\uB098 \uB9DE\uC558\uB098\uC694?</p>',`,
    `${i}    '<p style="font-size:.74rem;font-weight:700;color:#6b7280;margin:0 0 8px">\uC624\uB298 \uC6B4\uC138\uC640\uC758 \uB9E4\uCE6D\uB3C4</p>',`,
    `${i}    '<div style="display:flex;gap:6px">',`,
    `${i}    '<button type="button" class="lsd-match-btn" data-feedback="matched">\uD83C\uDFAF \uB538 \uB9DE\uC558\uC5B4!</button>',`,
    `${i}    '<button type="button" class="lsd-match-btn" data-feedback="partial">\uD83E\uDD14 \uBC18\uBC18\uC774\uC5C8\uC5B4</button>',`,
    `${i}    '<button type="button" class="lsd-match-btn" data-feedback="missed">\uD83C\uDF00 \uC804\uD600 \uB2EC\uB790\uC5B4</button>',`,
    `${i}    '</div></div>',`,
    `${i}    '<div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.06);border:1px solid #f3f4f6">',`,
    `${i}    '<div style="height:4px;background:linear-gradient(90deg,#7c3aed,#4f46e5,#06b6d4)"></div>',`,
    `${i}    '<div style="padding:12px 16px 6px"><label style="display:block;font-size:.62rem;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.16em;margin-bottom:6px" for="lsdNightInput">\u270D\uFE0F \uC624\uB298\uC758 \uD55C \uC904 \uC0AC\uC8FC \uC77C\uAE30</label></div>',`,
    `${i}    '<textarea id="lsdNightInput" class="lsd-diary-lines" maxlength="300" rows="6" style="width:100%;background:transparent;padding:0 16px 10px;font-size:.84rem;color:#1f2937;resize:none;outline:none;border:none;font-family:inherit;box-sizing:border-box;display:block" placeholder="\uC608: \uC815\uC7AC\uC758 \uB0A0\uC774\uB77C\uB354\uB2C8 \uC9C4\uC9DC \uC9C0\uCD9C \uCCB4\uD06C\uD588\uB354\uB2C8 3\uB9CC\uC6D0 \uC808\uC57D\uD588\uB2E4\uDC00\uDC00"></textarea>',`,
    `${i}    '<div style="padding:8px 16px 12px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #f3f4f6">',`,
    `${i}    '<span style="font-size:.7rem;color:#9ca3af"><span id="lsdCharCount">0</span>/300</span>',`,
    `${i}    '<button id="lsdSaveNightBtn" type="button" style="padding:8px 18px;border:none;border-radius:999px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;font-size:.74rem;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(124,58,237,.3);transition:all .2s" onmouseover="this.style.transform=\\'scale(1.05)\\'" onmouseout="this.style.transform=\\'scale(1)\\'"">\uD83D\uDCBE \uC800\uC7A5\uD558\uAE30</button>',`,
    `${i}    '</div>',`,
    `${i}    '<div id="lsdSaveFeedback" style="display:none;padding:0 16px 10px;font-size:.78rem;font-weight:700;color:#22c55e">\u2705 \uC800\uC7A5\uB429\uC5B4~!</div>',`,
    `${i}    '</div></section>',`,
    // HISTORY
    `${i}    '<section class="lsd-panel" id="lsdPanelHistory" role="tabpanel" style="padding:14px;display:none">',`,
    `${i}    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">',`,
    `${i}    '<div><h3 style="font-size:.88rem;font-weight:900;color:#111827;margin:0 0 2px">\uD83D\uDCC5 \uB098\uC758 \uC6B4\uAD6C \uAE30\uC77C \uAE30\uB85D</h3><p style="font-size:.7rem;color:#9ca3af;margin:0">\uB0A0\uC9DC\uBCC4\uB85C \uC800\uC7A5\uB41C \uB2E4\uC774\uC5B4\uB9AC \uAE30\uB85D\uC774\uC5B4\uC694~</p></div>',`,
    `${i}    '<button id="lsdClearBtn" type="button" style="padding:6px 12px;border:1.5px solid #fca5a5;border-radius:999px;background:transparent;font-size:.7rem;font-weight:700;color:#f87171;cursor:pointer;transition:all .2s;flex-shrink:0;margin-left:8px;white-space:nowrap" onmouseover="this.style.background=\\'#fef2f2\\'" onmouseout="this.style.background=\\'transparent\\'">\uD83D\uDDD1\uFE0F \uC804\uCCB4 \uC0AD\uC81C</button>',`,
    `${i}    '</div>',`,
    `${i}    '<div id="lsdHistoryList" style="display:flex;flex-direction:column;gap:8px"></div>',`,
    `${i}    '</section>',`,
    `${i}    '</div>',`, // /panels wrapper
    `${i}    '</div>'`,  // /lsd-shell
    `${i}  ].join('');`,
    ``,
    `${i}  document.body.appendChild(modal);`,
    `${i}}`,
    ``,
    `${i}`,
  ];
  return lines.join(nl);
}

const files = ['public/js/luck-sync-diary.js', 'js/luck-sync-diary.js'];
let ok = 0;
for (const f of files) {
  try { if (patch(resolve(root, f))) ok++; } catch (e) { console.error('[ERR]', f, e.message); }
}
console.log('\nResult: ' + ok + '/' + files.length + ' patched.');

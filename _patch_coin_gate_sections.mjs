// _patch_coin_gate_sections.mjs
// Applies coin-gate overlay wrappers to locale index.html files for:
// 1. CSS: adds .cd-section-gate* styles
// 2. 대운 section: wraps with gate overlay
// 3. 종합 사주 풀이 section: wraps with gate overlay
// 4. 궁합 section: wraps with gate overlay
// 5. applySectionGates() JS + SECTION_GATE_KEYS
// 6. toggleRptCard in _cdInvokeActionDirect
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(__filename);
const LOCALES = ['index','de-de','en-us','es-es','fr-fr','hi-in','ja-jp','ms-my','nl-nl','zh-cn','static'];

/* ============================================================
   PATCH 1: CSS
   ============================================================ */
const CSS_ANCHOR = `.golden-grain-modal__footer-copy{margin-top:11px;text-align:center;color:#8f4a33;font-weight:700;font-size:.82rem}`;
const CSS_NEW_BLOCK = `.golden-grain-modal__footer-copy{margin-top:11px;text-align:center;color:#8f4a33;font-weight:700;font-size:.82rem}
/* ── 섹션 코인 잠금 오버레이 ── */
.cd-section-gate{position:relative}
.cd-section-gate__body{filter:blur(6px) brightness(.92);pointer-events:none;user-select:none;transition:filter .35s}
.cd-section-gate--unlocked .cd-section-gate__body{filter:none;pointer-events:auto;user-select:auto}
.cd-section-gate__overlay{position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:linear-gradient(180deg,rgba(255,250,245,.08) 0%,rgba(255,245,230,.82) 52%,rgba(255,236,210,.97) 100%);border-radius:12px;padding:20px 16px;text-align:center}
.cd-section-gate--unlocked .cd-section-gate__overlay{display:none}
.cd-section-gate__icon{font-size:2.6rem;line-height:1}
.cd-section-gate__title{font-size:1.05rem;font-weight:900;color:#7c2e00;margin:0}
.cd-section-gate__desc{font-size:.84rem;color:#8a4620;line-height:1.5;margin:0;max-width:320px}
.cd-section-gate__btn{display:inline-flex;align-items:center;gap:7px;border:none;border-radius:999px;padding:12px 26px;background:linear-gradient(135deg,#ff7aaa,#ffb15e);color:#fff;font-size:.91rem;font-weight:900;cursor:pointer;box-shadow:0 10px 24px rgba(219,89,55,.32);transition:transform .2s ease,box-shadow .2s ease;letter-spacing:.02em}
.cd-section-gate__btn:hover{transform:translateY(-2px);box-shadow:0 14px 28px rgba(219,89,55,.42)}
.cd-section-gate__badge{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:999px;background:rgba(255,193,87,.32);color:#7a3a00;font-size:.76rem;font-weight:800;border:1px solid rgba(255,162,58,.38)}
@media(max-width:600px){.cd-section-gate__overlay{padding:16px 12px}.cd-section-gate__btn{padding:11px 20px;font-size:.86rem}}`;

/* ============================================================
   PATCH 2: 대운 section gate wrapper
   ============================================================ */
const DAEWUN_OLD = `    <!-- 7. 대운 -->
    <section class="card" id="daewunCard" aria-labelledby="daewunTitle">
      <h3 id="daewunTitle" class="sec-title">🔮 대운 (大運) — 억부+조후+종격 통합 판단</h3>
      <div style="font-size: 0.82rem; color: #666; margin-top: 4px; margin-bottom: 16px; line-height: 1.5; padding: 10px 12px; background: rgba(0,0,0,0.02); border-radius: 6px; border-left: 3px solid #bba371; word-break: keep-all;">
        ※ 만세력의 산술적 데이터만으로는 한 개인의 입체적인 운명을 완전히 규명하기에는 한계가 따릅니다. 본 분석은 명리학적 경향성에 기반한 것이므로 절대적인 지표가 아닌, <b>삶의 흐름을 읽고 대비하기 위한 전략적 참고 자료</b>로만 활용하시기를 권장합니다.
      </div>
      <div id="dwLegend" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;font-size:.78rem"></div>
      <div id="currentAgeInfo" style="font-size:.83rem;color:#888;margin-bottom:12px"></div>
      <!-- 인생 그래프 -->
      <div class="life-graph-section">
        <div class="life-graph-title">인생 길흉 그래프 (억부+조후+종격 통합)</div>
        <div class="life-graph-wrap" id="lifeGraphWrap">
          <canvas id="lifeGraphCanvas"></canvas>
          <div class="graph-tooltip" id="graphTooltip"></div>
        </div>
        <div class="life-graph-legend">
          <div class="lgl-item"><span class="lgl-dot" style="background:#4CAF50"></span>길운 (吉)</div>
          <div class="lgl-item"><span class="lgl-dot" style="background:#FF8BA7"></span>중립</div>
          <div class="lgl-item"><span class="lgl-dot" style="background:#E53935"></span>역경 (凶)</div>
          <div class="lgl-item"><span class="lgl-dot" style="background:#7B1FA2;opacity:.8"></span>현재</div>
        </div>
      </div>
      <div class="dw-grid" id="dwGrid"></div>
      <div class="dw-detail" id="dwDetail"></div>
    </section>`;

const DAEWUN_NEW = `    <!-- 7. 대운 -->
    <section class="card" id="daewunCard" aria-labelledby="daewunTitle">
      <h3 id="daewunTitle" class="sec-title">🔮 대운 (大運) — 억부+조후+종격 통합 판단</h3>
      <div class="cd-section-gate" id="daewunGate">
        <div class="cd-section-gate__overlay">
          <div class="cd-section-gate__icon">🔒</div>
          <p class="cd-section-gate__title">대운 분석 — 유료 콘텐츠</p>
          <p class="cd-section-gate__desc">억부·조후·종격 통합 대운 흐름과 인생 길흉 그래프를 열람하려면 황금 돼지 코인이 필요합니다.</p>
          <span class="cd-section-gate__badge">🪙 50코인으로 영구 해금</span>
          <button type="button" class="cd-section-gate__btn" data-action="unlockPremiumFeature" data-unlock-key="section_daewun" data-unlock-cost="50">🐷 50코인으로 잠금 해제</button>
        </div>
        <div class="cd-section-gate__body">
          <div style="font-size: 0.82rem; color: #666; margin-top: 4px; margin-bottom: 16px; line-height: 1.5; padding: 10px 12px; background: rgba(0,0,0,0.02); border-radius: 6px; border-left: 3px solid #bba371; word-break: keep-all;">
            ※ 만세력의 산술적 데이터만으로는 한 개인의 입체적인 운명을 완전히 규명하기에는 한계가 따릅니다. 본 분석은 명리학적 경향성에 기반한 것이므로 절대적인 지표가 아닌, <b>삶의 흐름을 읽고 대비하기 위한 전략적 참고 자료</b>로만 활용하시기를 권장합니다.
          </div>
          <div id="dwLegend" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;font-size:.78rem"></div>
          <div id="currentAgeInfo" style="font-size:.83rem;color:#888;margin-bottom:12px"></div>
          <!-- 인생 그래프 -->
          <div class="life-graph-section">
            <div class="life-graph-title">인생 길흉 그래프 (억부+조후+종격 통합)</div>
            <div class="life-graph-wrap" id="lifeGraphWrap">
              <canvas id="lifeGraphCanvas"></canvas>
              <div class="graph-tooltip" id="graphTooltip"></div>
            </div>
            <div class="life-graph-legend">
              <div class="lgl-item"><span class="lgl-dot" style="background:#4CAF50"></span>길운 (吉)</div>
              <div class="lgl-item"><span class="lgl-dot" style="background:#FF8BA7"></span>중립</div>
              <div class="lgl-item"><span class="lgl-dot" style="background:#E53935"></span>역경 (凶)</div>
              <div class="lgl-item"><span class="lgl-dot" style="background:#7B1FA2;opacity:.8"></span>현재</div>
            </div>
          </div>
          <div class="dw-grid" id="dwGrid"></div>
          <div class="dw-detail" id="dwDetail"></div>
        </div>
      </div>
    </section>`;

/* ============================================================
   PATCH 3: 종합 사주 풀이 section gate wrapper
   ============================================================ */
const SUMMARY_OLD = `    <!-- 6. 종합 사주 풀이 -->
    <section class="card" id="summaryCard" aria-labelledby="summaryTitle">
      <h3 id="summaryTitle" class="sec-title">📖 종합 사주 풀이</h3>
      <div id="summaryArea"></div>
    </section>`;

const SUMMARY_NEW = `    <!-- 6. 종합 사주 풀이 -->
    <section class="card" id="summaryCard" aria-labelledby="summaryTitle">
      <h3 id="summaryTitle" class="sec-title">📖 종합 사주 풀이</h3>
      <div class="cd-section-gate" id="summaryGate">
        <div class="cd-section-gate__overlay">
          <div class="cd-section-gate__icon">📖</div>
          <p class="cd-section-gate__title">종합 사주 풀이 — 유료 콘텐츠</p>
          <p class="cd-section-gate__desc">A4 20페이지 분량의 성격·진로·연애·건강·재물·귀인·개운 심층 풀이를 열람하려면 황금 돼지 코인이 필요합니다.</p>
          <span class="cd-section-gate__badge">🪙 50코인으로 영구 해금</span>
          <button type="button" class="cd-section-gate__btn" data-action="unlockPremiumFeature" data-unlock-key="section_summary" data-unlock-cost="50">🐷 50코인으로 잠금 해제</button>
        </div>
        <div class="cd-section-gate__body">
          <div id="summaryArea"></div>
        </div>
      </div>
    </section>`;

/* ============================================================
   PATCH 4: 궁합 section — find the compat section and wrap it
   The locale files may have slightly different compat content.
   We anchor on the section start/end.
   ============================================================ */
// We look for the beginning of compat section and its entire content up to </section>
// The compat section starts with <!-- 2-1. 궁합 보기 --> and ends with </section>
// We'll replace just the inner content (after h3 title)

// Anchor: the form container inside compat section before any gate wrapper
const COMPAT_H3 = `      <h3 id="compatTitle" class="sec-title">💞 궁합 보기 (연애 · 사업 · 친구)</h3>`;
const COMPAT_FORM_DIV = `      <div style="display:flex;flex-direction:column;gap:10px">`;

/* Instead of string-replacing the whole compat block (which varies per locale),
   we insert gate wrapper around the existing content by replacing just the H3+newline+first-div pattern */
// We replace: H3\n      <div style=...
// with: H3\n      <div class="cd-section-gate" id="compatGate">\n        <overlay...>\n        <div class="cd-section-gate__body">\n          <div style=...

// Actually the cleanest: we look for the start sentinel and then close </section>
// then do a lookahead-based replacement.
// Since JS string replace can't do complex look-ahead, we'll use indexOf + slice.

function wrapCompatSection(content) {
  const secStart = content.indexOf('<!-- 2-1. 궁합 보기 -->');
  if (secStart === -1) {
    console.log('  ⚠️  compat section not found');
    return { content, changed: false };
  }

  // Already has gate?
  if (content.indexOf('id="compatGate"') !== -1) {
    console.log('  ℹ️  compat already has gate');
    return { content, changed: false };
  }

  const h3End = content.indexOf('\n', content.indexOf(COMPAT_H3, secStart)) + 1;
  // Find the end of the section
  const secEndTag = '</section>';
  const secEnd = content.indexOf(secEndTag, h3End);
  if (secEnd === -1) return { content, changed: false };

  const innerContent = content.slice(h3End, secEnd); // everything between h3 and </section>

  // Indent inner content by 2 more spaces
  const indentedInner = innerContent.split('\n').map(l => '  ' + l).join('\n');

  const gateWrapper =
    '        <div class="cd-section-gate__overlay">\n' +
    '          <div class="cd-section-gate__icon">💞</div>\n' +
    '          <p class="cd-section-gate__title">궁합 분석 — 유료 콘텐츠</p>\n' +
    '          <p class="cd-section-gate__desc">연애·사업·친구 궁합을 사주 기반으로 분석한 결과를 열람하려면 황금 돼지 코인이 필요합니다.</p>\n' +
    '          <span class="cd-section-gate__badge">🪙 50코인으로 영구 해금</span>\n' +
    '          <button type="button" class="cd-section-gate__btn" data-action="unlockPremiumFeature" data-unlock-key="section_compat" data-unlock-cost="50">🐷 50코인으로 잠금 해제</button>\n' +
    '        </div>\n' +
    '        <div class="cd-section-gate__body">\n' +
    indentedInner +
    '        </div>\n' +
    '      ';

  const newSection =
    content.slice(0, h3End) +
    '      <div class="cd-section-gate" id="compatGate">\n' +
    gateWrapper +
    '</div>\n' +
    '    ' + secEndTag;

  return { content: content.slice(0, secStart) + newSection + content.slice(secEnd + secEndTag.length), changed: true };
}

/* ============================================================
   PATCH 5: JS — applySectionGates + SECTION_GATE_KEYS
   ============================================================ */
// We insert after the refreshUnlockButtons() function call in init sequence
const REFRESH_UNLOCK_CALL_OLD = `    refreshUnlockButtons();
    loadTileLocks();`;

const REFRESH_UNLOCK_CALL_NEW = `    refreshUnlockButtons();
    loadTileLocks();`;

// Actually the JS to add is after loadTileLocks is defined, near the end where applySectionGates is called.
// Find the sentinel: "  refreshUnlockButtons();" (in init section)
// and add applySectionGates() call right after.

// Simpler: look for the pattern where we call refreshUnlockButtons then loadTileLocks in init
const INIT_REFRESH_OLD = `  refreshUnlockButtons();
  void syncBalanceFromServer();`;
const INIT_REFRESH_NEW = `  refreshUnlockButtons();
  if(typeof applySectionGates==='function')applySectionGates();
  void syncBalanceFromServer();`;

// SECTION_GATE_KEYS + applySectionGates function — insert before "  function refreshUnlockButtons"
const BEFORE_REFRESH_FN = `  function refreshUnlockButtons() {`;
const SECTION_GATE_JS = `  var SECTION_GATE_KEYS=[{gateId:'daewunGate',unlockKey:'section_daewun'},{gateId:'summaryGate',unlockKey:'section_summary'},{gateId:'compatGate',unlockKey:'section_compat'}];
  function applySectionGates(){SECTION_GATE_KEYS.forEach(function(sg){var el=document.getElementById(sg.gateId);if(!el)return;if(unlockedFeatureMap[sg.unlockKey]){el.classList.add('cd-section-gate--unlocked');}else{el.classList.remove('cd-section-gate--unlocked');}});}
  function refreshUnlockButtons() {`;

// applySectionGates call inside tryUnlockFeature after UnlockButton(button)
const TRY_UNLOCK_OLD = `      saveTileLocks();
      UnlockButton(button);
      window.alert('잠금이 해제되었습니다. 행운의 문이 열렸어요!');`;
const TRY_UNLOCK_NEW = `      saveTileLocks();
      UnlockButton(button);
      if(typeof applySectionGates==='function')applySectionGates();
      window.alert('잠금이 해제되었습니다. 행운의 문이 열렸어요!');`;

/* ============================================================
   PATCH 6: toggleRptCard in _cdInvokeActionDirect
   ============================================================ */
const INVOKE_ACTION_OLD = `  function _cdInvokeActionDirect(action, actionEl) {`;
const INVOKE_ACTION_NEW = `  function _cdInvokeActionDirect(action, actionEl) {
    if(action==='toggleRptCard'){if(typeof window.toggleReportFeatureCard==='function')window.toggleReportFeatureCard(actionEl);return;}`;

/* ============================================================
   Run patches
   ============================================================ */
let totalPatched = 0;

for (const locale of LOCALES) {
  const filePath = locale === 'index'
    ? path.join(ROOT, 'public', 'index.html')
    : path.join(ROOT, 'public', locale, 'index.html');

  if (!fs.existsSync(filePath)) {
    console.log(`[SKIP] ${locale} — file not found`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;

  // 1. CSS
  if (!content.includes('.cd-section-gate{') && content.includes(CSS_ANCHOR)) {
    content = content.replace(CSS_ANCHOR, CSS_NEW_BLOCK);
    changes++;
    console.log(`[${locale}] ✅ CSS .cd-section-gate* added`);
  } else if (content.includes('.cd-section-gate{')) {
    console.log(`[${locale}] ℹ️  CSS already exists`);
  } else {
    console.log(`[${locale}] ⚠️  CSS anchor not found`);
  }

  // 2. 대운 gate
  if (!content.includes('id="daewunGate"') && content.includes(DAEWUN_OLD)) {
    content = content.replace(DAEWUN_OLD, DAEWUN_NEW);
    changes++;
    console.log(`[${locale}] ✅ 대운 gate wrapped`);
  } else if (content.includes('id="daewunGate"')) {
    console.log(`[${locale}] ℹ️  대운 gate already exists`);
  } else {
    console.log(`[${locale}] ⚠️  대운 anchor not matched`);
  }

  // 3. 종합 풀이 gate
  if (!content.includes('id="summaryGate"') && content.includes(SUMMARY_OLD)) {
    content = content.replace(SUMMARY_OLD, SUMMARY_NEW);
    changes++;
    console.log(`[${locale}] ✅ 종합풀이 gate wrapped`);
  } else if (content.includes('id="summaryGate"')) {
    console.log(`[${locale}] ℹ️  summaryGate already exists`);
  } else {
    console.log(`[${locale}] ⚠️  summary anchor not matched`);
  }

  // 4. compat gate
  const compatResult = wrapCompatSection(content);
  if (compatResult.changed) {
    content = compatResult.content;
    changes++;
    console.log(`[${locale}] ✅ 궁합 gate wrapped`);
  }

  // 5a. SECTION_GATE_KEYS + applySectionGates function
  if (!content.includes('SECTION_GATE_KEYS') && content.includes(BEFORE_REFRESH_FN)) {
    content = content.replace(BEFORE_REFRESH_FN, SECTION_GATE_JS);
    changes++;
    console.log(`[${locale}] ✅ applySectionGates() function added`);
  } else if (content.includes('SECTION_GATE_KEYS')) {
    console.log(`[${locale}] ℹ️  SECTION_GATE_KEYS already exists`);
  } else {
    console.log(`[${locale}] ⚠️  refreshUnlockButtons sentinel not found`);
  }

  // 5b. applySectionGates call in init
  if (!content.includes('if(typeof applySectionGates===') && content.includes(INIT_REFRESH_OLD)) {
    content = content.replace(INIT_REFRESH_OLD, INIT_REFRESH_NEW);
    changes++;
    console.log(`[${locale}] ✅ applySectionGates() init call added`);
  }

  // 5c. applySectionGates call in tryUnlockFeature
  if (content.includes(TRY_UNLOCK_OLD) && !content.includes(TRY_UNLOCK_NEW)) {
    content = content.replace(TRY_UNLOCK_OLD, TRY_UNLOCK_NEW);
    changes++;
    console.log(`[${locale}] ✅ applySectionGates() unlock call added`);
  }

  // 6. toggleRptCard in _cdInvokeActionDirect
  if (!content.includes("action==='toggleRptCard'") && content.includes(INVOKE_ACTION_OLD)) {
    content = content.replace(INVOKE_ACTION_OLD, INVOKE_ACTION_NEW);
    changes++;
    console.log(`[${locale}] ✅ toggleRptCard handler added`);
  } else if (content.includes("action==='toggleRptCard'")) {
    console.log(`[${locale}] ℹ️  toggleRptCard already exists`);
  } else {
    console.log(`[${locale}] ⚠️  _cdInvokeActionDirect not found`);
  }

  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalPatched++;
    console.log(`[${locale}] 💾 Saved (${changes} changes)\n`);
  } else {
    console.log(`[${locale}] ✔ No changes needed\n`);
  }
}

console.log(`\nDone. ${totalPatched} files patched.`);

// _patch_lock_ui_fix.mjs
// 코인·해금 UI 수정 패치:
//  1) 영구잠금 타일 뱃지: --lock CSS 변형 (보라) + 🔒 아이콘
//  2) 사주분석 섹션 게이트 아이콘: 📖/💞 → 🔒
//  3) cd-section-gate overflow:hidden 추가 (블러 번짐 방지)
//  4) tarot-tile__lock-icon CSS 추가 (잠금 타일 우측하단 자물쇠 마크)
//  5) JS: applyTileLockVisuals() 함수 추가 + 초기화·해금 후 호출
//  6) root/index.html coin badge: purple → amber 동기화
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

const ALL_FILES = [
  'public/index.html',
  'public/static/index.html',
  'index.html',
  'public/de-de/index.html',
  'public/en-us/index.html',
  'public/es-es/index.html',
  'public/fr-fr/index.html',
  'public/hi-in/index.html',
  'public/ja-jp/index.html',
  'public/ms-my/index.html',
  'public/nl-nl/index.html',
  'public/zh-cn/index.html',
];

// ── 패치 1: root index.html coin badge purple → amber (v2 패치 누락 파일 동기화) ──
const OLD_COIN_CSS_PURPLE =
`.tarot-tile__coin-badge{position:absolute;top:8px;left:8px;z-index:3;display:inline-flex;align-items:center;gap:3px;padding:4px 10px 4px 9px;border-radius:999px;font-size:.68rem;font-weight:800;line-height:1;letter-spacing:.02em;white-space:nowrap;background:linear-gradient(135deg,rgba(12,5,28,.94),rgba(22,10,44,.92));color:#ecdeff;border:1px solid rgba(190,140,255,.3);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 2px 10px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.07);pointer-events:none}
.tarot-tile__coin-badge--free{background:linear-gradient(135deg,rgba(4,44,26,.94),rgba(8,62,36,.92));border-color:rgba(100,220,168,.38);color:#a7f3d0}`;

const AMBER_COIN_WITH_LOCK =
`.tarot-tile__coin-badge{position:absolute;top:8px;left:8px;z-index:3;display:inline-flex;align-items:center;gap:3px;padding:4px 10px 4px 9px;border-radius:999px;font-size:.68rem;font-weight:800;line-height:1;letter-spacing:.02em;white-space:nowrap;background:rgba(14,8,2,.88);color:#fcd262;border:1px solid rgba(250,190,50,.35);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:0 2px 10px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,220,100,.08);pointer-events:none}
.tarot-tile__coin-badge--free{background:rgba(4,28,20,.88);border-color:rgba(90,210,150,.38);color:#6ee7b7}
.tarot-tile__coin-badge--lock{background:linear-gradient(135deg,rgba(45,15,90,.92),rgba(70,25,120,.88));border-color:rgba(190,140,255,.42);color:#ddbfff;box-shadow:0 2px 10px rgba(0,0,0,.5),0 0 0 1px rgba(160,100,255,.12),inset 0 1px 0 rgba(255,255,255,.07)}
.tarot-tile__lock-icon{position:absolute;bottom:8px;right:8px;z-index:5;width:28px;height:28px;border-radius:50%;background:rgba(10,5,30,.85);border:1.5px solid rgba(180,130,255,.45);display:none;align-items:center;justify-content:center;font-size:.85rem;line-height:1;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);box-shadow:0 2px 8px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.08);pointer-events:none}
.tarot-tile--tileLocked .tarot-tile__lock-icon{display:flex}`;

// ── 패치 2: 이미 amber인 파일에도 --lock + lock-icon CSS가 없으면 추가 ──
const OLD_AMBER_ONLY =
`.tarot-tile__coin-badge{position:absolute;top:8px;left:8px;z-index:3;display:inline-flex;align-items:center;gap:3px;padding:4px 10px 4px 9px;border-radius:999px;font-size:.68rem;font-weight:800;line-height:1;letter-spacing:.02em;white-space:nowrap;background:rgba(14,8,2,.88);color:#fcd262;border:1px solid rgba(250,190,50,.35);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:0 2px 10px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,220,100,.08);pointer-events:none}
.tarot-tile__coin-badge--free{background:rgba(4,28,20,.88);border-color:rgba(90,210,150,.38);color:#6ee7b7}`;

// ── 패치 3: cd-section-gate overflow 추가 ──
const OLD_SECTION_GATE_CSS = `.cd-section-gate{position:relative}`;
const NEW_SECTION_GATE_CSS = `.cd-section-gate{position:relative;overflow:hidden;border-radius:inherit}`;

// ── 패치 4: 섹션 게이트 아이콘 수정 ──
// summaryGate: 📖 → 🔒
const OLD_SUMMARY_ICON = `<div class="cd-section-gate__icon">📖</div>`;
const NEW_SUMMARY_ICON = `<div class="cd-section-gate__icon">🔒</div>`;
// compatGate: 💞 → 🔒
const OLD_COMPAT_ICON = `<div class="cd-section-gate__icon">💞</div>`;
const NEW_COMPAT_ICON = `<div class="cd-section-gate__icon">🔒</div>`;

// ── 패치 5: 잠금 타일 뱃지에 --lock 클래스 + 🔒 아이콘 텍스트 ──
// 베다
const OLD_VEDIC_BADGE = `<span class="tarot-tile__coin-badge">🔓 해금 300코인</span>`;
const NEW_VEDIC_BADGE = `<span class="tarot-tile__coin-badge tarot-tile__coin-badge--lock">🔒 해금 300코인</span>`;
// 올림푸스
const OLD_OLYMPUS_BADGE = `<span class="tarot-tile__coin-badge">🔓 해금 300코인</span>`;
const NEW_OLYMPUS_BADGE = `<span class="tarot-tile__coin-badge tarot-tile__coin-badge--lock">🔒 해금 300코인</span>`;

// ── 패치 6: 영구잠금 코인뱃지 (🪙 400코인 등 data-tile-lock-key 타일) — JS로 처리 ──

// ── 패치 7: JS applyTileLockVisuals 함수 추가 ──
const OLD_SAVE_TILE_FUNC =
`  function saveTileLocks() {
    try { localStorage.setItem(TILE_LOCKS_KEY, JSON.stringify(unlockedFeatureMap)); } catch (_e) {}
  }`;

const NEW_SAVE_TILE_FUNC =
`  function saveTileLocks() {
    try { localStorage.setItem(TILE_LOCKS_KEY, JSON.stringify(unlockedFeatureMap)); } catch (_e) {}
  }

  // 잠금 타일에 시각적 자물쇠 아이콘 표시/제거
  function applyTileLockVisuals() {
    try {
      var tiles = document.querySelectorAll('[data-tile-lock-key]');
      for (var i = 0; i < tiles.length; i++) {
        var tile = tiles[i];
        var key = tile.getAttribute('data-tile-lock-key');
        var wrap = tile.querySelector('.tarot-tile__img-wrap');
        if (!wrap) continue;
        if (!wrap.querySelector('.tarot-tile__lock-icon')) {
          var icon = document.createElement('span');
          icon.className = 'tarot-tile__lock-icon';
          icon.setAttribute('aria-hidden', 'true');
          icon.textContent = '🔒';
          wrap.appendChild(icon);
        }
        if (unlockedFeatureMap[key]) {
          tile.classList.remove('tarot-tile--tileLocked');
        } else {
          tile.classList.add('tarot-tile--tileLocked');
        }
      }
    } catch (_e) {}
  }`;

// ── 패치 8: 초기화 시 applyTileLockVisuals() 호출 추가 ──
const OLD_INIT_SEQUENCE =
`  loadBalance();
  loadTileLocks();
  GoldenGrainBadge();`;

const NEW_INIT_SEQUENCE =
`  loadBalance();
  loadTileLocks();
  GoldenGrainBadge();
  applyTileLockVisuals();`;

// ── 패치 9: 타일 해금 후 applyTileLockVisuals() 호출 추가 ──
// tile unlock flow: after saveTileLocks() in the tile gate handler
const OLD_TILE_UNLOCK_SAVE =
`          unlockedFeatureMap[tileLockKey] = true;
          saveTileLocks();
          sessionStorage.setItem('cd_pa_' + action, '1');
          window.alert('✅ ' + fname + ' 해금 완료!`;

const NEW_TILE_UNLOCK_SAVE =
`          unlockedFeatureMap[tileLockKey] = true;
          saveTileLocks();
          applyTileLockVisuals();
          sessionStorage.setItem('cd_pa_' + action, '1');
          window.alert('✅ ' + fname + ' 해금 완료!`;

// ── 패치 10: admin 즉시 해금 후에도 applyTileLockVisuals() 호출 ──
const OLD_ADMIN_UNLOCK =
`          unlockedFeatureMap[tileLockKey] = true;
          saveTileLocks();
          sessionStorage.setItem('cd_pa_' + action, '1');
          _cdInvokeActionDirect(action, actionNode);
          return;`;

const NEW_ADMIN_UNLOCK =
`          unlockedFeatureMap[tileLockKey] = true;
          saveTileLocks();
          applyTileLockVisuals();
          sessionStorage.setItem('cd_pa_' + action, '1');
          _cdInvokeActionDirect(action, actionNode);
          return;`;

// ──────────────────────────────────────────────────
function applyPatches(content, filename) {
  let changed = false;

  // 패치 1: purple coin badge → amber + lock variants
  if (content.includes(OLD_COIN_CSS_PURPLE)) {
    content = content.replace(OLD_COIN_CSS_PURPLE, AMBER_COIN_WITH_LOCK);
    console.log(`  [A] purple→amber+lock: ${filename}`);
    changed = true;
  }

  // 패치 2: amber-only → amber + lock variants (--lock, lock-icon CSS 없으면 추가)
  if (content.includes(OLD_AMBER_ONLY) && !content.includes('.tarot-tile__coin-badge--lock{')) {
    content = content.replace(OLD_AMBER_ONLY, AMBER_COIN_WITH_LOCK);
    console.log(`  [B] amber+lockCSS added: ${filename}`);
    changed = true;
  }

  // 패치 3: cd-section-gate overflow 추가
  if (content.includes(OLD_SECTION_GATE_CSS)) {
    content = content.replace(OLD_SECTION_GATE_CSS, NEW_SECTION_GATE_CSS);
    console.log(`  [C] section-gate overflow: ${filename}`);
    changed = true;
  }

  // 패치 4a: summaryGate 아이콘
  if (content.includes(OLD_SUMMARY_ICON)) {
    content = content.replace(OLD_SUMMARY_ICON, NEW_SUMMARY_ICON);
    console.log(`  [D1] summaryGate icon: ${filename}`);
    changed = true;
  }

  // 패치 4b: compatGate 아이콘
  if (content.includes(OLD_COMPAT_ICON)) {
    content = content.replace(OLD_COMPAT_ICON, NEW_COMPAT_ICON);
    console.log(`  [D2] compatGate icon: ${filename}`);
    changed = true;
  }

  // 패치 5: 베다/올림푸스 해금 뱃지 --lock 클래스
  // 같은 텍스트가 2개('베다', '올림푸스')이므로 replaceAll 사용
  if (content.includes(OLD_VEDIC_BADGE)) {
    content = content.replaceAll(OLD_VEDIC_BADGE, NEW_VEDIC_BADGE);
    console.log(`  [E] lock badge (vedic+olympus): ${filename}`);
    changed = true;
  }

  // 패치 7: applyTileLockVisuals 함수 추가
  if (content.includes(OLD_SAVE_TILE_FUNC) && !content.includes('applyTileLockVisuals')) {
    content = content.replace(OLD_SAVE_TILE_FUNC, NEW_SAVE_TILE_FUNC);
    console.log(`  [G] applyTileLockVisuals fn: ${filename}`);
    changed = true;
  }

  // 패치 8: 초기화 시 applyTileLockVisuals() 호출
  if (content.includes(OLD_INIT_SEQUENCE) && !content.includes('applyTileLockVisuals();')) {
    content = content.replace(OLD_INIT_SEQUENCE, NEW_INIT_SEQUENCE);
    console.log(`  [H] init call: ${filename}`);
    changed = true;
  }

  // 패치 9: 타일 해금 후 호출
  if (content.includes(OLD_TILE_UNLOCK_SAVE) && !content.includes('applyTileLockVisuals();\n          sessionStorage.setItem')) {
    content = content.replace(OLD_TILE_UNLOCK_SAVE, NEW_TILE_UNLOCK_SAVE);
    console.log(`  [I] tile-unlock call: ${filename}`);
    changed = true;
  }

  // 패치 10: admin 즉시 해금 후 호출
  if (content.includes(OLD_ADMIN_UNLOCK)) {
    content = content.replace(OLD_ADMIN_UNLOCK, NEW_ADMIN_UNLOCK);
    console.log(`  [J] admin-unlock call: ${filename}`);
    changed = true;
  }

  return { content, changed };
}

let totalPatched = 0;
let totalSkipped = 0;

for (const rel of ALL_FILES) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) {
    console.log(`[SKIP] not found: ${rel}`);
    totalSkipped++;
    continue;
  }
  const src = fs.readFileSync(fp, 'utf8');
  const { content: out, changed } = applyPatches(src, rel);

  if (changed) {
    fs.writeFileSync(fp, out, 'utf8');
    console.log(`[OK]   ${rel}`);
    totalPatched++;
  } else {
    console.log(`[SKIP] already up-to-date: ${rel}`);
    totalSkipped++;
  }
}

console.log(`\nDone: ${totalPatched} patched, ${totalSkipped} skipped.`);

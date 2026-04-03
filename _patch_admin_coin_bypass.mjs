import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = 'c:\\Users\\Neo\\Desktop\\Code Destiny Main';

// ─── Patch 1: isAdminUser — add flower_admin_token check ────────────────────
// Insert before: return false; (closing line of isAdminUser)
const ADMIN_OLD = `      if (pair[0] === 'fortune_auth_role' && decodeURIComponent(pair[1] || '') === 'admin') return true;
      }
    }
  } catch (_e) {}
  return false;
}`;
const ADMIN_NEW = `      if (pair[0] === 'fortune_auth_role' && decodeURIComponent(pair[1] || '') === 'admin') return true;
      }
    }
    // 3) flower_admin_token: 관리자 패널 로그인 시 설정됨 (코인 없이 모든 서비스 이용 가능)
    try { if (sessionStorage.getItem('flower_admin_token')) return true; } catch (_ss) {}
  } catch (_e) {}
  return false;
}`;

// ─── Patch 2: _onCta — route <a> tiles with coin-cost through coin gate ────
const ONCTA_OLD = `if(href&&tile.tagName==='A'){window.location.href=href;return;}`;
const ONCTA_NEW = `var _pvwCoinCost=Number(tile.getAttribute('data-coin-cost')||0);
    if(href&&tile.tagName==='A'&&_pvwCoinCost<=0){window.location.href=href;return;}`;

// ─── Patch 3: neville-meditation.html / yoga-guru.html admin bypass ─────────
const PAGE_FLAG_OLD = `  if (sessionStorage.getItem(flag)) { sessionStorage.removeItem(flag); return; }`;
const PAGE_FLAG_NEW = `  if (sessionStorage.getItem(flag)) { sessionStorage.removeItem(flag); return; }
  // 관리자 패널 로그인: 코인 없이 바로 이용 가능
  try { if (sessionStorage.getItem('flower_admin_token')) return; } catch(_ae) {}`;

// ─── File lists ─────────────────────────────────────────────────────────────
const indexFiles = [
  'index.html',
  'public/index.html',
  'public/static/index.html',
  'public/zh-cn/index.html',
  'public/hi-in/index.html',
  'public/de-de/index.html',
  'public/nl-nl/index.html',
  'public/fr-fr/index.html',
  'public/ms-my/index.html',
  'public/ja-jp/index.html',
  'public/es-es/index.html',
  'public/en-us/index.html',
];

const pageFiles = [
  'neville-meditation.html',
  'public/neville-meditation.html',
  'yoga-guru.html',
  'public/yoga-guru.html',
];

function patchFile(relPath, patches) {
  const fullPath = join(ROOT, relPath.replace(/\//g, '\\'));
  let content;
  try { content = readFileSync(fullPath, 'utf8'); } catch (e) { console.warn(`SKIP ${relPath}: ${e.message}`); return; }
  let changed = false;
  for (const [old, neo, label] of patches) {
    if (content.includes(old)) {
      content = content.split(old).join(neo);
      changed = true;
      console.log(`  ✅ ${label}`);
    } else {
      console.warn(`  ⚠️  ${label} — pattern NOT FOUND`);
    }
  }
  if (changed) {
    writeFileSync(fullPath, content, 'utf8');
    console.log(`  → Written: ${relPath}`);
  }
}

// Apply patches to index files
for (const f of indexFiles) {
  console.log(`\n[INDEX] ${f}`);
  patchFile(f, [
    [ADMIN_OLD, ADMIN_NEW, 'isAdminUser + flower_admin_token'],
    [ONCTA_OLD, ONCTA_NEW, '_onCta coin gate fix'],
  ]);
}

// Apply patches to page files
for (const f of pageFiles) {
  console.log(`\n[PAGE] ${f}`);
  patchFile(f, [
    [PAGE_FLAG_OLD, PAGE_FLAG_NEW, 'admin bypass in page coin check'],
  ]);
}

console.log('\n✅ All patches applied.');

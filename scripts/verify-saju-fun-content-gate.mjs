#!/usr/bin/env node
/**
 * verify-saju-fun-content-gate.mjs
 *
 * 사주 결과 화면 "재미있는 사주 콘텐츠"(js/core/saju/reportDashboard.js 가 그리는 .rpt-v2-toggle-btn)
 * 타일의 기능 상세 팝업 ↔ 결제 게이트 순서 불변식을 지킨다.
 *
 * 잡으려는 회귀 (2026-07 재발):
 *  A) 잠금 타일 게이트가 `classList.contains('tarot-tile')` 클래스 화이트리스트로 프리뷰를 위임해서,
 *     클래스가 다른 재밌는 사주 콘텐츠 버튼은 상세 팝업 없이 결제창으로 직행했다
 *     (= 구매 전 사용자가 마케팅 팝업을 볼 수 없는 구조 결함).
 *  B) 해금 상태의 toggleRptCard 브랜치가 _cdSafeBlockEvent 없이 카드를 토글해서, 같은 클릭이
 *     프리뷰 캡처 인터셉터에도 도달했다. 카드가 팝업 뒤에서 펼쳐지고 → CTA('결과 보러가기')의
 *     재클릭이 토글로 그 카드를 도로 닫았다 (= '눌러도 안 열림 / 열렸다 닫힘').
 *
 * 검증 축:
 *  1) 잠금 타일 게이트가 클래스 기반 카브아웃이 아니라 _cdOpenTilePreview 반환값으로 분기한다
 *  2) toggleRptCard 브랜치에 프리뷰 위임 + _cdSafeBlockEvent 가 모두 있다
 *  3) 회당결제 게이트의 프리뷰 화이트리스트(클릭·터치엔드)에 rpt-v2-toggle-btn 이 있다
 *  4) 위 마커가 6개 셸 미러에 동일하게 존재한다
 *  5) reportDashboard.js ↔ public 미러 동일 + CTA 스크롤 복귀 마커 존재
 *
 * 이 가드는 "코드가 있다"만 본다. 두 리스너가 같은 클릭을 처리하는지 같은 런타임 결함은
 * scripts/verify-rpt-preview-cta-flow.mjs(실제 크롬 클릭 재현)가 담당한다.
 */
import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MIRRORS = [
  'index.html',
  'public/index.html',
  'public/en/index.html',
  'public/ja/index.html',
  'public/zh/index.html',
  'public/static/index.html',
];
const DASHBOARD_MIRRORS = [
  'js/core/saju/reportDashboard.js',
  'public/js/core/saju/reportDashboard.js',
];

function read(rel) {
  return readFileSync(`${ROOT}/${rel}`, 'utf8');
}

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

/** 함수/블록 본문을 중괄호 균형으로 잘라낸다(이름 grep 오탐 방지 — CLAUDE.md 원칙 6). */
function sliceBalanced(src, fromIndex) {
  const braceStart = src.indexOf('{', fromIndex);
  if (braceStart < 0) return '';
  let depth = 0;
  for (let i = braceStart; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(fromIndex, i + 1);
    }
  }
  return '';
}

const rows = [];

for (const rel of MIRRORS) {
  let html;
  try {
    html = read(rel);
  } catch (e) {
    fails.push(`미러 읽기 실패: ${rel} (${e.message})`);
    continue;
  }

  // ── 1) 영구 해금 타일 게이트: 프리뷰 위임이 클래스가 아니라 _cdOpenTilePreview 반환값 기준인가 ──
  const lockGateAnchor = html.indexOf("if (tileLockKey && tileLockCost > 0 && !isTileKeyUnlocked(tileLockKey))");
  ok(lockGateAnchor >= 0, `${rel}: 영구 해금 타일 게이트 진입 조건을 찾지 못함`);
  let lockGateBody = '';
  if (lockGateAnchor >= 0) {
    lockGateBody = sliceBalanced(html, lockGateAnchor);
    ok(lockGateBody.length > 0, `${rel}: 잠금 타일 게이트 본문을 중괄호 균형으로 자르지 못함`);
    ok(
      lockGateBody.includes('_lockPvwHandled = !!window._cdOpenTilePreview(actionNode)'),
      `${rel}: 잠금 타일 게이트가 _cdOpenTilePreview 로 상세 팝업을 먼저 열지 않는다 (결제 직행 회귀)`,
    );
    ok(
      /_lockPvwHandled\)\s*\{\s*_cdSafeBlockEvent\(event\);\s*return;/.test(lockGateBody),
      `${rel}: 상세 팝업을 연 뒤 _cdSafeBlockEvent + return 으로 게이트를 멈추지 않는다`,
    );
    // 원인 패턴 재도입 금지: 클래스 화이트리스트로 프리뷰를 가르면 다른 클래스 타일이 또 새어나간다.
    ok(
      !/classList\.contains\('tarot-tile'\)\s*&&\s*!actionNode\.getAttribute\('data-pvw-cta-bypass'\)/.test(lockGateBody),
      `${rel}: 잠금 타일 게이트에 클래스 기반 프리뷰 카브아웃이 되살아났다 (.tarot-tile 검사 금지)`,
    );
  }

  // ── 2) toggleRptCard: 프리뷰 위임 + 이중 처리 차단 ──────────────────────────
  const rptAnchor = html.indexOf("if (action === 'toggleRptCard') {\n      // 해금 상태에서도");
  ok(rptAnchor >= 0, `${rel}: 디스패처의 toggleRptCard 브랜치(프리뷰 위임 주석 포함)를 찾지 못함`);
  let rptBody = '';
  if (rptAnchor >= 0) {
    rptBody = sliceBalanced(html, rptAnchor);
    ok(
      rptBody.includes('_rptPvwHandled = !!window._cdOpenTilePreview(actionNode)'),
      `${rel}: toggleRptCard 가 해금 상태에서 상세 팝업을 열지 않는다`,
    );
    ok(
      rptBody.includes('_cdSafeBlockEvent(event);\n      if (typeof window.toggleReportFeatureCard'),
      `${rel}: toggleRptCard 토글 직전 _cdSafeBlockEvent 가 없다 — 프리뷰 인터셉터가 같은 클릭을 다시 잡아 이중 토글이 난다`,
    );
  }

  // ── 2-b) 펼쳐진 카드의 재클릭은 '닫기' — 팝업 재오픈 차단 ────────────────────
  // 없으면 CTA 로 카드를 편 뒤 같은 버튼을 눌러도 상세 팝업만 다시 떠서 카드를 영영 못 닫는다.
  ok(
    html.includes('function _pvwIsOpenRptToggle(tile){'),
    `${rel}: _pvwIsOpenRptToggle 헬퍼가 없다 (펼쳐진 카드 재클릭이 팝업을 다시 연다)`,
  );
  ok(
    html.includes('if(!tile||_isPreviewCtaBypass(tile)||_pvwIsOpenRptToggle(tile))return;'),
    `${rel}: 캡처 프리뷰 인터셉터가 펼쳐진 카드를 통과시키지 않는다`,
  );
  ok(
    html.includes('if (_pvwIsOpenRptToggle(tile)) return false;'),
    `${rel}: _cdOpenTilePreview 가 펼쳐진 카드에 false 를 돌려주지 않는다`,
  );

  // ── 3) 회당결제 게이트 프리뷰 화이트리스트 ─────────────────────────────────
  const perUseWhitelistCount =
    html.split("classList.contains('lovebible-tile') || actionNode.classList.contains('rpt-v2-toggle-btn')").length - 1;
  ok(
    perUseWhitelistCount === 2,
    `${rel}: 회당결제 게이트 프리뷰 화이트리스트의 rpt-v2-toggle-btn 이 ${perUseWhitelistCount}곳 (클릭·터치엔드 2곳이어야 함)`,
  );

  rows.push({
    미러: rel,
    '잠금게이트 프리뷰위임': lockGateBody.includes('_lockPvwHandled') ? 'OK' : 'MISSING',
    'toggleRptCard 차단': rptBody.includes('_rptPvwHandled') ? 'OK' : 'MISSING',
    '펼친카드 재클릭=닫기': html.includes('function _pvwIsOpenRptToggle(tile){') ? 'OK' : 'MISSING',
    '회당결제 화이트리스트': `${perUseWhitelistCount}/2`,
  });
}

// ── 4) reportDashboard 미러 동일성 + CTA 스크롤 복귀 ──────────────────────────
let dashboardSrc = '';
const dashboardBodies = [];
for (const rel of DASHBOARD_MIRRORS) {
  try {
    dashboardBodies.push(read(rel));
  } catch (e) {
    fails.push(`대시보드 미러 읽기 실패: ${rel} (${e.message})`);
  }
}
if (dashboardBodies.length === DASHBOARD_MIRRORS.length) {
  ok(
    dashboardBodies[0] === dashboardBodies[1],
    `reportDashboard.js 와 public 미러가 다르다 — npm run sync:public 필요`,
  );
  dashboardSrc = dashboardBodies[0];
}
if (dashboardSrc) {
  const toggleAnchor = dashboardSrc.indexOf('function toggleReportFeatureCard(');
  ok(toggleAnchor >= 0, 'toggleReportFeatureCard 함수를 찾지 못함');
  if (toggleAnchor >= 0) {
    const toggleBody = sliceBalanced(dashboardSrc, toggleAnchor);
    ok(
      toggleBody.includes('_sajuFunScrollBlockIntoView(block)'),
      'toggleReportFeatureCard 가 펼친 카드로 스크롤하지 않는다 (CTA 이후 "아무 일도 안 일어난 것처럼" 보임)',
    );
  }
  ok(
    dashboardSrc.includes('function _sajuFunScrollBlockIntoView('),
    '_sajuFunScrollBlockIntoView 헬퍼가 없다',
  );
  // 유료 rpt 카드가 디스패처를 타도록 하는 계약(속성 생성부)이 유지되는지
  ok(
    dashboardSrc.includes(" data-tile-lock-key=\"' + lockKey + '\" data-tile-lock-cost=\"' + b.coinCost + '\""),
    'reportDashboard 가 잠금 타일 속성(data-tile-lock-key/cost)을 더 이상 붙이지 않는다',
  );
  ok(
    dashboardSrc.includes("' data-action=\"toggleRptCard\"'"),
    'reportDashboard 의 유료 비직접 카드가 data-action="toggleRptCard" 를 붙이지 않는다',
  );
}

// ── 출력 ────────────────────────────────────────────────────────────────────
console.log('=== 재미있는 사주 콘텐츠: 상세 팝업 → 결제 순서 가드 ===\n');
console.table(rows);

if (fails.length) {
  console.error(`\n❌ 실패 ${fails.length}건:`);
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('\n✅ 통과: 잠금·해금·회당결제 모두 상세 팝업이 먼저, 결제/토글은 CTA 재클릭에서만. 6미러 패리티 OK.');

/**
 * 유명인 사주 패널 → 운세 인사이트 허브 안으로 통합
 * 1) 생년월일 입력 calc 섹션 제거
 * 2) famousSajuPanel 독립 섹션 해체 → 인사이트 허브 내 서브섹션으로 이동
 * 3) _computePillarsViaEngine Solar API 우선 방식으로 교체
 * 4) 불필요한 JS 함수(initFspCalc, initFspHeaderToggle) 제거
 */

import { readFileSync, writeFileSync } from 'fs';

const enc = 'utf8';
const FILE = String.raw`c:\Users\Neo\Desktop\Code Destiny Main\index.html`;

let html = readFileSync(FILE, enc);

// ──────────────────────────────────────────────
// STEP 1: 인사이트 허브 섹션 닫는 태그 직전에 유명인 서브섹션 삽입
// 현재: ...태그링크 div ... </section> <!-- 운세 인사이트 허브 끝 -->
// 새로: ...태그링크 div ... [구분선+서브섹션] </section> <!-- 끝 -->
// ──────────────────────────────────────────────

const IH_END_MARKER = '    </section>\n    <!-- ═══ 운세 인사이트 허브 끝 ═══ -->';
const ihEndIdx = html.indexOf(IH_END_MARKER);
if (ihEndIdx < 0) { console.error('인사이트 허브 끝 마커 없음'); process.exit(1); }

const FAMOUS_SUBSECTION = `
      <!-- ══════════════════════════════════════ -->
      <!-- ⭐ 유명인 사주 분석 아카이브 (통합됨)  -->
      <!-- ══════════════════════════════════════ -->
      <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(183,148,244,0.35),transparent);margin:0 16px 16px;"></div>

      <!-- 서브 타이틀 -->
      <div style="padding:0 16px 10px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:1.1rem;">⭐</span>
        <div>
          <h3 style="margin:0 0 3px;font-size:0.97rem;font-weight:800;color:#f3e8ff;letter-spacing:0.02em;">유명인 사주 분석 아카이브</h3>
          <p style="margin:0;font-size:0.74rem;color:rgba(203,195,227,0.6);line-height:1.4;">역사 위인·K-스타·세계 유명인 50인+의 사주팔자를 KasiEngine 명리 엔진으로 심층 분석합니다</p>
        </div>
      </div>

      <!-- 검색 입력 -->
      <div style="padding:0 16px 10px;">
        <div style="position:relative;">
          <input id="fsp-search" type="search" placeholder="이름으로 검색… (예: 이순신, 테일러)" aria-label="유명인 검색"
            style="width:100%;box-sizing:border-box;padding:8px 14px 8px 36px;border-radius:10px;border:1px solid rgba(167,139,250,0.3);background:rgba(0,0,0,0.3);color:#f3e8ff;font-size:0.82rem;outline:none;">
          <span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:0.9rem;pointer-events:none;opacity:0.5;">🔍</span>
          <span id="fsp-search-empty" style="display:none;position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.79rem;color:rgba(203,195,227,0.45);pointer-events:none;padding-left:36px;">검색 결과가 없습니다</span>
        </div>
      </div>

      <!-- 카테고리 필터 바 -->
      <div id="fsp-filter-bar" role="group" aria-label="카테고리 필터"
        style="display:flex;gap:6px;padding:0 16px 12px;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none;">
        <button class="fsp-filter-btn fsp-filter--active" data-cat="all" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(167,139,250,0.6);background:rgba(124,58,237,0.35);color:#e9d5ff;cursor:pointer;white-space:nowrap;transition:all .18s;">전체</button>
        <button class="fsp-filter-btn" data-cat="kr-historic" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">역사 위인</button>
        <button class="fsp-filter-btn" data-cat="kr-modern" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">K-스타</button>
        <button class="fsp-filter-btn" data-cat="jp" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">🇯🇵 일본</button>
        <button class="fsp-filter-btn" data-cat="cn" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">🇨🇳 중국</button>
        <button class="fsp-filter-btn" data-cat="us" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">🇺🇸 미국</button>
        <button class="fsp-filter-btn" data-cat="music" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">음악</button>
        <button class="fsp-filter-btn" data-cat="acting" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">연기</button>
        <button class="fsp-filter-btn" data-cat="sports" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">스포츠</button>
        <button class="fsp-filter-btn" data-cat="business" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">기업인</button>
        <button class="fsp-filter-btn" data-cat="director" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">감독·창작</button>
        <button class="fsp-filter-btn" data-cat="politics" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">🏛️ 정치인</button>
      </div>

      <!-- 인물 카드 그리드 (JS 동적 렌더링) -->
      <div id="fsp-grid" role="list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;padding:0 16px 10px;">
        <noscript>
          <p>이순신·세종대왕·유관순·안중근·김구·정약용·BTS RM·IU(이지은)·손흥민·뉴진스 하니·류현진·봉준호·유해진·박찬호·김연아·박세리·박정희·김대중·한강·미야자키 하야오·나루히토·오타니 쇼헤이·기타노 다케시·무라카미 하루키·도요토미 히데요시·쿠로사와 아키라·아무로 나미에·이소룡·성룡·마윈·공자·장이머우·마오쩌둥·테일러 스위프트·엘론 머스크·마이클 잭슨·스티브 잡스·마틴 루터 킹·엘비스 프레슬리·빌 게이츠·버락 오바마·스티브 워즈니악·마돈나·마틴 스코세이지·레오나르도 다 빈치·알베르트 아인슈타인·윌리엄 셰익스피어·나폴레옹 등 국내외 유명인 50인+ 사주팔자 명리학 심층 분석</p>
        </noscript>
      </div><!-- /#fsp-grid -->

      <!-- 상세 분석 패널 (카드 클릭 시) -->
      <div id="fsp-detail" style="display:none;margin:0 16px 14px;border-radius:16px;border:1px solid rgba(167,139,250,0.28);background:rgba(0,0,0,0.25);overflow:hidden;">
        <div id="fsp-detail-header" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(183,148,244,0.15);">
          <span id="fsp-detail-title" style="font-size:0.9rem;font-weight:800;color:#e9d5ff;">인물 상세 분석</span>
          <button id="fsp-detail-close" aria-label="닫기" style="background:none;border:none;color:rgba(203,195,227,0.6);font-size:1.1rem;cursor:pointer;padding:2px 6px;border-radius:6px;line-height:1;">✕</button>
        </div>
        <div id="famousSajuContent" style="padding:16px;"><!-- JS 동적 렌더링 --></div>
      </div>

      <!-- 학술 면책 고지 -->
      <div style="margin:0 16px 16px;padding:8px 12px;border-radius:10px;background:rgba(251,191,36,0.05);border:1px solid rgba(251,191,36,0.18);">
        <p style="margin:0;font-size:0.7rem;line-height:1.65;color:rgba(253,230,138,0.75);text-align:center;">⚠️ <strong style="color:#fbbf24;">학술·교육 목적</strong> — 동양 명리학 이론을 소개·교육하기 위한 학술적 콘텐츠입니다. 실제 인물에 대한 가치 판단·예측이 아니며, 출생 시간 불명 인물은 정오(12시) 기준 3기둥(년주·월주·일주) 분석입니다.</p>
      </div>
`;

// 인사이트 허브 끝 직전에 삽입
html = html.slice(0, ihEndIdx) + FAMOUS_SUBSECTION + html.slice(ihEndIdx);
console.log('Step 1: 유명인 서브섹션 삽입 완료');

// ──────────────────────────────────────────────
// STEP 2: 기존 famousSajuPanel 독립 섹션 전체 제거
// <!-- ═══ 유명인 사주 분석 패널 ═══ --> 부터
// <!-- ═══ 유명인 사주 분석 패널 끝 ═══ --> 끝까지
// ──────────────────────────────────────────────

const FSP_START = '    <!-- ═══ 유명인 사주 분석 패널 ═══ -->';
const FSP_END   = '    <!-- ═══ 유명인 사주 분석 패널 끝 ═══ -->';

const fspSI = html.indexOf(FSP_START);
const fspEI = html.indexOf(FSP_END, fspSI);
if (fspSI >= 0 && fspEI >= 0) {
  // 다음 줄바꿈까지 포함해서 제거
  const endOfLine = html.indexOf('\n', fspEI + FSP_END.length);
  html = html.slice(0, fspSI) + html.slice(endOfLine + 1);
  console.log('Step 2: famousSajuPanel 독립 섹션 제거 완료');
} else {
  console.warn('Step 2: famousSajuPanel 마커 없음 — 스킵');
}

// ──────────────────────────────────────────────
// STEP 3: _computePillarsViaEngine 함수 교체 (Solar API 우선)
// ──────────────────────────────────────────────

const OLD_COMPUTE = `function _computePillarsViaEngine(y, m, d, callback) {
  function doCompute() {
    try {
      var ke = window.KasiEngine;
      if (!ke || typeof ke.getGanji !== 'function') { callback(null, '엔진 로딩 중'); return; }

      var dt = new Date(y, m - 1, d, 12, 0, 0);
      var gj = ke.getGanji(dt);
      if (!gj || !gj.secha || !gj.weolgeon || !gj.iljin) { callback(null, '계산 실패'); return; }

      var yg = String(gj.secha)[0]   || '', yz = String(gj.secha)[1]   || '';
      var mg = String(gj.weolgeon)[0] || '', mz = String(gj.weolgeon)[1] || '';
      var dg = String(gj.iljin)[0]   || '', dz = String(gj.iljin)[1]   || '';

      callback({
        y: { g: yg, j: yz, gE: (_G[yg] || {}).e || '', jE: (_J[yz] || {}).e || '' },
        m: { g: mg, j: mz, gE: (_G[mg] || {}).e || '', jE: (_J[mz] || {}).e || '' },
        d: { g: dg, j: dz, gE: (_G[dg] || {}).e || '', jE: (_J[dz] || {}).e || '' }
      });
    } catch (err) { callback(null, '계산 오류'); }
  }

  if (window.KasiEngine) {
    doCompute();
  } else if (typeof window.__cdEnsureSajuCoreLoaded === 'function') {
    window.__cdEnsureSajuCoreLoaded().then(function() { doCompute(); }).catch(function() { callback(null, '엔진 로딩 실패'); });
  } else if (typeof window.__cdEnsureLunarLibReady === 'function') {
    window.__cdEnsureLunarLibReady().then(function() {
      if (window.KasiEngine) { doCompute(); } else { callback(null, '엔진 없음'); }
    }).catch(function() { callback(null, '라이브러리 로딩 실패'); });
  } else {
    callback(null, '엔진 없음');
  }
}`;

const NEW_COMPUTE = `/* Solar.fromYmdHms → getEightChar().getYear/Month/Day 우선, KasiEngine.getGanji 폴백 */
function _computePillarsViaEngine(y, m, d, callback) {
  function parse2(str) {
    var s = String(str || ''); return { g: s[0] || '', j: s[1] || '' };
  }
  function doCompute() {
    try {
      /* ① Solar 라이브러리 우선 (절입 보정 정확) */
      if (window.Solar && typeof Solar.fromYmdHms === 'function') {
        try {
          var sol = Solar.fromYmdHms(y, m, d, 12, 0, 0);
          var lun = sol.getLunar ? sol.getLunar() : null;
          var bz  = lun && lun.getEightChar ? lun.getEightChar() : null;
          if (bz) {
            var yP = parse2(typeof bz.getYear  === 'function' ? bz.getYear()  : '');
            var mP = parse2(typeof bz.getMonth === 'function' ? bz.getMonth() : '');
            var dP = parse2(typeof bz.getDay   === 'function' ? bz.getDay()   : '');
            if (yP.g && mP.g && dP.g) {
              callback({
                y: {g:yP.g, j:yP.j, gE:(_G[yP.g]||{}).e||'', jE:(_J[yP.j]||{}).e||''},
                m: {g:mP.g, j:mP.j, gE:(_G[mP.g]||{}).e||'', jE:(_J[mP.j]||{}).e||''},
                d: {g:dP.g, j:dP.j, gE:(_G[dP.g]||{}).e||'', jE:(_J[dP.j]||{}).e||''}
              });
              return;
            }
          }
        } catch(e1) {}
      }
      /* ② KasiEngine.getGanji 폴백 */
      var ke = window.KasiEngine;
      if (ke && typeof ke.getGanji === 'function') {
        var dt = new Date(y, m - 1, d, 12, 0, 0);
        var gj = ke.getGanji(dt);
        if (gj && gj.secha && gj.weolgeon && gj.iljin) {
          var yg=gj.secha[0]||'', yz=gj.secha[1]||'';
          var mg=gj.weolgeon[0]||'', mz=gj.weolgeon[1]||'';
          var dg=gj.iljin[0]||'', dz=gj.iljin[1]||'';
          callback({
            y:{g:yg,j:yz,gE:(_G[yg]||{}).e||'',jE:(_J[yz]||{}).e||''},
            m:{g:mg,j:mz,gE:(_G[mg]||{}).e||'',jE:(_J[mz]||{}).e||''},
            d:{g:dg,j:dz,gE:(_G[dg]||{}).e||'',jE:(_J[dz]||{}).e||''}
          });
          return;
        }
      }
      callback(null, '엔진 계산 실패');
    } catch(err) { callback(null, '계산 오류'); }
  }
  if (window.Solar || window.KasiEngine) {
    doCompute();
  } else {
    var loader = window.__cdEnsureSajuCoreLoaded || window.__cdEnsureLunarLibReady;
    if (typeof loader === 'function') {
      loader().then(function(){ doCompute(); }).catch(function(){ callback(null,'엔진 로딩 실패'); });
    } else { callback(null,'엔진 없음'); }
  }
}`;

if (html.includes(OLD_COMPUTE)) {
  html = html.replace(OLD_COMPUTE, NEW_COMPUTE);
  console.log('Step 3: _computePillarsViaEngine 교체 완료');
} else {
  console.warn('Step 3: OLD_COMPUTE 매칭 안됨 — 스킵');
}

// ──────────────────────────────────────────────
// STEP 4: initFspCalc 함수 제거 및 _fspInit 정리
// ──────────────────────────────────────────────

const OLD_INITCALC = `\n/* ─── 생년월일 생년월일 입력 분석 (시주 없음 — 3기둥) ─── */\nfunction initFspCalc() {`;
const CALC_END   = '\n}\n\nfunction _fspInit() {';
const calcStart = html.indexOf(OLD_INITCALC);
const calcEnd   = html.indexOf(CALC_END, calcStart);
if (calcStart >= 0 && calcEnd >= 0) {
  html = html.slice(0, calcStart) + html.slice(calcEnd);
  console.log('Step 4a: initFspCalc 함수 제거 완료');
} else {
  console.warn('Step 4a: initFspCalc 마커 없음 — 스킵');
}

// _fspInit에서 initFspCalc() 호출 제거
html = html.replace('  initFspCalc();\n', '');

// initFspHeaderToggle 함수 제거 (fsp-body/fsp-header-btn이 없으므로)
const OLD_HEADER_TOGGLE = `\n/* ─── 헤더 버튼 토글 ─── */\nfunction initFspHeaderToggle() {
  var btn = document.getElementById('fsp-header-btn');
  var body = document.getElementById('fsp-body');
  if (!btn || !body) return;
  btn.addEventListener('click', function() {
    var open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    var badge = btn.querySelector('[style*="탭하여"]');
    if (badge) badge.textContent = open ? '탭하여 열기 ▼' : '닫기 ▲';
    if (!open) {
      btn.closest('section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}\n`;
if (html.includes(OLD_HEADER_TOGGLE)) {
  html = html.replace(OLD_HEADER_TOGGLE, '\n');
  console.log('Step 4b: initFspHeaderToggle 제거 완료');
} else {
  console.warn('Step 4b: initFspHeaderToggle 마커 없음 — 스킵');
}

// _fspInit에서 initFspHeaderToggle() 호출 제거
html = html.replace('  initFspHeaderToggle();\n', '');

console.log('All steps done. Writing file...');
writeFileSync(FILE, html, enc);
console.log('Done. index.html 저장 완료.');

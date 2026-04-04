/**
 * _fix_coingate_comprehensive.mjs
 *
 * 코인 잠금 우회 취약점 전체 패치 (6가지 수정)
 *
 * [문제 1 - CRITICAL] isAdminUser()의 try{} 뒤 catch 없음 → SyntaxError
 *   → 전체 IIFE 파싱 실패 → 코인 게이트 미등록 → 모든 유료 기능 무료 접근
 *
 * [문제 2] _cdRunPerUseCoinGate에 구독 플랜 체크 없음
 *
 * [문제 3] 영구 해금 게이트에 구독 플랜 체크 없음
 *
 * [문제 4] Preview Panel D 객체에 5개 기능 누락
 *   openLifeBookModal, openAstroModal, openZiweiModal,
 *   navigateToVedic, openOlympusOracleModal
 *
 * [문제 5] .lifebook-tile 클릭이 Preview Panel에 인터셉트되지 않음
 *
 * [문제 6] Preview Panel paywall에 구독 안내 없음
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

// ── 수정 대상 파일 ──────────────────────────────────────────────────────────
const FILES = [
  'index.html',
  'public/index.html',
  'public/static/index.html',
  'public/nl-nl/index.html',
  'public/ms-my/index.html',
  'public/ja-jp/index.html',
  'public/hi-in/index.html',
  'public/fr-fr/index.html',
  'public/es-es/index.html',
  'public/en-us/index.html',
  'public/de-de/index.html',
  'public/zh-cn/index.html',
];

// ============================================================================
// 패치 정의: [이름, 찾을 문자열, 바꿀 문자열]
// ============================================================================

const PATCHES = [];

// ── 패치 1: isAdminUser 구문 오류 수정 ────────────────────────────────────
PATCHES.push([
  'isAdminUser 구문 오류 수정 (CRITICAL)',
  // OLD: try {} 안에 catch 가 없음 - SyntaxError
  `  function isAdminUser() {
    try {
      // 1) localStorage fortune_auth_user\uC758 role \uD655\uC778
      var user = readAuthUser();
      if (user && user.role === 'admin') return true;
      // 2) fortune_auth_role \uCFE0\uD0A4 \uD655\uC778 (\uAD00\uB9AC\uC790 \uC138\uC158 \uCFE0\uD0A4)
      var cookies = document.cookie.split(';');
      for (var i = 0; i < cookies.length; i++) {
        var pair = cookies[i].trim().split('=');
        if (pair[0] === 'fortune_auth_role' && decodeURIComponent(pair[1] || '') === 'admin') return true;
      }
    }
    // 3) flower_admin_token: admin panel login -> all features available without coins
    try { if (sessionStorage.getItem('flower_admin_token')) return true; } catch (_ss) {}
  } catch (_e) {}
  return false;
  }`,
  // NEW: flower_admin_token 체크를 outer try 안으로 이동하여 구문 오류 해결
  `  function isAdminUser() {
    try {
      // 1) localStorage fortune_auth_user\uC758 role \uD655\uC778
      var user = readAuthUser();
      if (user && user.role === 'admin') return true;
      // 2) fortune_auth_role \uCFE0\uD0A4 \uD655\uC778 (\uAD00\uB9AC\uC790 \uC138\uC158 \uCFE0\uD0A4)
      var cookies = document.cookie.split(';');
      for (var i = 0; i < cookies.length; i++) {
        var pair = cookies[i].trim().split('=');
        if (pair[0] === 'fortune_auth_role' && decodeURIComponent(pair[1] || '') === 'admin') return true;
      }
      // 3) flower_admin_token: admin panel login -> all features available without coins
      try { if (sessionStorage.getItem('flower_admin_token')) return true; } catch (_ss) {}
    } catch (_e) {}
    return false;
  }`,
]);

// ── 패치 2: _cdRunPerUseCoinGate 구독 플랜 체크 추가 ──────────────────────
PATCHES.push([
  '\uCF54\uC778 \uAC8C\uC774\uD2B8 \uAD6C\uB3C5 \uD50C\uB79C \uCCB4\uD06C \uCD94\uAC00',
  `      // \uAD00\uB9AC\uC790 \uBAA8\uB4DC: \uCF54\uC778 \uCC28\uAC10 \uC5C6\uC774 \uC989\uC2DC \uC2E4\uD589
      if (isAdminUser()) {
        sessionStorage.setItem('cd_pa_' + action, '1');
        _cdInvokeActionDirect(action, actionNode);
        return;
      }
      if (userBalance < tileCoinCost) {`,
  `      // \uAD00\uB9AC\uC790 \uBAA8\uB4DC: \uCF54\uC778 \uCC28\uAC10 \uC5C6\uC774 \uC989\uC2DC \uC2E4\uD589
      if (isAdminUser()) {
        sessionStorage.setItem('cd_pa_' + action, '1');
        _cdInvokeActionDirect(action, actionNode);
        return;
      }
      // \uD504\uB9AC\uBBF8\uC5C4 \uAD6C\uB3C5 \uD50C\uB79C \uBCF4\uC720\uC790: \uCF54\uC778 \uCC28\uAC10 \uC5C6\uC774 \uC989\uC2DC \uC2E4\uD589
      try {
        var _subUser = readAuthUser();
        var _subPlan = (_subUser && _subUser.plan) ? String(_subUser.plan) : '';
        if (_subPlan === 'unlimited' || _subPlan === 'premium') {
          sessionStorage.setItem('cd_pa_' + action, '1');
          _cdInvokeActionDirect(action, actionNode);
          return;
        }
      } catch (_subErr) {}
      if (userBalance < tileCoinCost) {`,
]);

// ── 패치 3: 영구 해금 게이트 구독 플랜 체크 추가 ─────────────────────────
PATCHES.push([
  '\uC601\uAD6C \uD574\uAE08 \uAC8C\uC774\uD2B8 \uAD6C\uB3C5 \uD50C\uB79C \uCCB4\uD06C \uCD94\uAC00',
  `        // \uAD00\uB9AC\uC790 \uBAA8\uB4DC: \uCF54\uC778 \uCC28\uAC10 \uC5C6\uC774 \uC989\uC2DC \uC601\uAD6C \uD574\uAE08
        if (isAdminUser()) {
          unlockedFeatureMap[tileLockKey] = true;
          saveTileLocks();
          applyTileLockVisuals();
          sessionStorage.setItem('cd_pa_' + action, '1');
          _cdInvokeActionDirect(action, actionNode);
          return;
        }
        var titleEl = actionNode.querySelector('.tarot-tile__title');`,
  `        // \uAD00\uB9AC\uC790 \uBAA8\uB4DC: \uCF54\uC778 \uCC28\uAC10 \uC5C6\uC774 \uC989\uC2DC \uC601\uAD6C \uD574\uAE08
        if (isAdminUser()) {
          unlockedFeatureMap[tileLockKey] = true;
          saveTileLocks();
          applyTileLockVisuals();
          sessionStorage.setItem('cd_pa_' + action, '1');
          _cdInvokeActionDirect(action, actionNode);
          return;
        }
        // \uD504\uB9AC\uBBF8\uC5C4 \uAD6C\uB3C5 \uD50C\uB79C \uBCF4\uC720\uC790: \uCF54\uC778 \uC5C6\uC774 \uC601\uAD6C \uD574\uAE08
        try {
          var _lockSubUser = readAuthUser();
          var _lockSubPlan = (_lockSubUser && _lockSubUser.plan) ? String(_lockSubUser.plan) : '';
          if (_lockSubPlan === 'unlimited' || _lockSubPlan === 'premium') {
            unlockedFeatureMap[tileLockKey] = true;
            saveTileLocks();
            applyTileLockVisuals();
            sessionStorage.setItem('cd_pa_' + action, '1');
            _cdInvokeActionDirect(action, actionNode);
            return;
          }
        } catch (_lockSubErr) {}
        var titleEl = actionNode.querySelector('.tarot-tile__title');`,
]);

// ── 패치 4: Preview Panel D 객체에 누락된 5개 기능 추가 ──────────────────
PATCHES.push([
  'Preview Panel \uB204\uB77D \uAE30\uB2A5 5\uAC1C \uCD94\uAC00',
  `    '/destiny-poker.html':{cat:'\uB370\uC2A4\uD2F0\uB2C8 \uD3EC\uCEE4',title:'\uD83C\uDCA3 \uB370\uC2A4\uD2F0\uB2C8 \uD3EC\uCEE4',tagline:'\uC2E0\uB4E4\uACFC \uBC8C\uC774\uB294 \uC6B4\uBA85\uC758 \uCE74\uB4DC \uB300\uACB0! \uC2B9\uB9AC\uD558\uBA74 \uD589\uC6B4\uC774 \uCC3E\uC544\uC635\uB2C8\uB2E4',feats:['\uC2345\uC7A5 \uD3EC\uCEE4 \uAE30\uBC18 \uC6B4\uBA85 \uB300\uACB0 \uAC8C\uC784','\uC62C\uB9BC\uD478\uC2A4 \uC2E0 \uCE90\uB9AD\uD130 4\uBA85 \uBC30\uD2C0','\uC2B9\uB960\uB85C \uBCF4\uB294 \uC624\uB298\uC758 \uC6B4\uC138 \uC9C0\uC218','\uC644\uC804 \uBB34\uB8CC \uC5D4\uD130\uD14C\uC778\uBA3C\uD2B8 \uC810\uC220'],cost:'\u2728 \uBB34\uB8CC',ct:'free',img:'/fuctionassets/destiny%20pocker.webp'}
  };`,
  `    '/destiny-poker.html':{cat:'\uB370\uC2A4\uD2F0\uB2C8 \uD3EC\uCEE4',title:'\uD83C\uDCA3 \uB370\uC2A4\uD2F0\uB2C8 \uD3EC\uCEE4',tagline:'\uC2E0\uB4E4\uACFC \uBC8C\uC774\uB294 \uC6B4\uBA85\uC758 \uCE74\uB4DC \uB300\uACB0! \uC2B9\uB9AC\uD558\uBA74 \uD589\uC6B4\uC774 \uCC3E\uC544\uC635\uB2C8\uB2E4',feats:['\uC2345\uC7A5 \uD3EC\uCEE4 \uAE30\uBC18 \uC6B4\uBA85 \uB300\uACB0 \uAC8C\uC784','\uC62C\uB9BC\uD478\uC2A4 \uC2E0 \uCE90\uB9AD\uD130 4\uBA85 \uBC30\uD2C0','\uC2B9\uB960\uB85C \uBCF4\uB294 \uC624\uB298\uC758 \uC6B4\uC138 \uC9C0\uC218','\uC644\uC804 \uBB34\uB8CC \uC5D4\uD130\uD14C\uC778\uBA3C\uD2B8 \uC810\uC220'],cost:'\u2728 \uBB34\uB8CC',ct:'free',img:'/fuctionassets/destiny%20pocker.webp'},
    openLifeBookModal:{cat:'\uD504\uB9AC\uBBF8\uC5C4 \u00B7 \uC0AC\uC8FC \uC2EC\uCE35 \uBD84\uC11D',title:'\uD83D\uDCDC \uC778\uC0DD\uC758 \uCC45',tagline:'\uB098\uB9CC\uC744 \uC704\uD55C \uC0AC\uC8FC \uC2EC\uCE35 \uBD84\uC11D \u2014 \uD0DC\uC5B4\uB09C \uB0A0\uC758 \uC6B4\uBA85 \uC804\uCCB4\uB97C \uD3BC\uCCD0\uB4DC\uB9BD\uB2C8\uB2E4',feats:['\uC0AC\uC8FC \uD314\uC790 8\uAE00\uC790 \uC644\uC804 \uC815\uBC00 \uBD84\uC11D','\uB300\uC6B4\u00B7\uC138\uC6B4\u00B7\uC6D4\uC6B4 10\uB144 \uC6B4\uC138 \uD750\uB984','\uC7AC\uBB3C\u00B7\uAC74\uAC15\u00B7\uC0AC\uB791\u00B7\uC9C1\uC5C5 4\uB300 \uC6B4\uC138 \uC885\uD569','PDF \uC800\uC7A5 \uAC00\uB2A5\uD55C \uD504\uB9AC\uBBF8\uC5C4 \uB9AC\uD3EC\uD2B8'],cost:'\uD83E\uDE99 700\uCF54\uC778',ct:'paid',img:'/fuctionassets/lifebook.webp'},
    openAstroModal:{cat:'\uC810\uC131\uC220 \u00B7 \uCF54\uC988\uBBF9 \uCC28\uD2B8',title:'\u2728 \uC810\uC131\uC220 \uCF54\uC988\uBBF9 \uCC28\uD2B8',tagline:'\uD0DC\uC591\u00B7\uB2EC\u00B7\uC0C1\uC2B9\uAD81 3\uAC01 \uC5D0\uB108\uC9C0\uB85C \uC6B0\uC8FC\uC801 \uC790\uC544\uB97C \uBD84\uC11D\uD569\uB2C8\uB2E4',feats:['\uC11C\uC591 \uC810\uC131\uC220 \uC804\uCCB4 \uD589\uC131 \uBC30\uCE58 \uBD84\uC11D','\uD0DC\uC591\uAD81\u00B7\uB2EC\uAD81\u00B7\uC0C1\uC2B9\uAD81 \uC815\uBC00 \uD574\uC11D','12\uD558\uC6B0\uC2A4 \uC601\uC5ED\uBCC4 \uC6B4\uC138 \uC801\uC6A9','\uD2B8\uB79C\uC9C0\uD2B8 & \uD504\uB85C\uADF8\uB808\uC158 \uD574\uC11D \uD3EC\uD568'],cost:'\uD83D\uDD12 \uC601\uAD6C \uD574\uAE08 400\uCF54\uC778',ct:'paid',img:'/fuctionassets/jumsung.webp'},
    openZiweiModal:{cat:'\uC790\uBBF8\uB450\uC218 \u00B7 12\uAD81 \uBA85\uBC18',title:'\uD83C\uDF0C \uC790\uBBF8\uB450\uC218(\u7D2B\u5FAE)',tagline:'\uB3D9\uC591 \uCD5C\uACE0 \uBA85\uB9AC\uD559 \uC790\uBBF8\uB450\uC218\uB85C 12\uAD81 \uBA85\uBC18\uC744 \uD3BC\uCCD0\uB4DC\uB9BD\uB2C8\uB2E4',feats:['\uC790\uBBF8\uB450\uC218 12\uAD81 \uBA85\uBC18 \uC644\uC804 \uBD84\uC11D','\uC8FC\uC131\u00B7\uBCF4\uC131\u00B7\uD654\uAE30\uC131 \uC815\uBC00 \uD574\uC11D','\uBA85\uAD81\u00B7\uC7AC\uBC31\uAD81\u00B7\uAD00\uB85D\uAD81 \uC6B4\uC138 \uC801\uC6A9','\uD55C \uBC88 \uD574\uAE08\uC73C\uB85C \uD3C9\uC0DD \uC774\uC6A9'],cost:'\uD83D\uDD12 \uC601\uAD6C \uD574\uAE08 400\uCF54\uC778',ct:'paid',img:'/fuctionassets/jami.webp'},
    navigateToVedic:{cat:'\uBCA0\uB2E4 \uC810\uC131\uC220 \u00B7 Jyotish',title:'\uD83E\uDE90 \uBCA0\uB2E4 \uC810\uC131\uC220',tagline:'5000\uB144 \uC778\uB3C4 Jyotish \uBCC4\uC790\uB9AC\uB85C \uC5C5\uC7A5\uACFC \uC6B4\uBA85\uC758 \uD328\uD134\uC744 \uC77D\uC2B5\uB2C8\uB2E4',feats:['Jyotish \uB77C\uC2DC\u00B7\uB099\uC0E4\uD2B8\uB77C \uC815\uBC00 \uBD84\uC11D','\uB2E4\uC0E4 \uAE30\uAC04\uBCC4 \uC6B4\uC138 \uD750\uB984 \uD574\uC11D','\uCE74\uB974\uB9C8\u00B7\uC5C5\uC7A5 \uC6B4\uBA85 \uD328\uD134 \uD574\uB3C5','\uB3C4\uC2DC\u00B7\uB098\uB77C \uAE30\uBC18 \uB85C\uCEEC \uCC28\uD2B8 \uC801\uC6A9'],cost:'\uD83D\uDD12 \uC601\uAD6C \uD574\uAE08 300\uCF54\uC778',ct:'paid',img:'/fuctionassets/veda.webp'},
    openOlympusOracleModal:{cat:'\uC62C\uB9BC\uD478\uC2A4 \u00B7 \uBCC4\uC790\uB9AC \uC2E0\uD0C1',title:'\u26A1 \uC62C\uB9BC\uD478\uC2A4 \uC2E0\uD0C1',tagline:'12 \uC62C\uB9BC\uD478\uC2A4 \uC2E0\uC774 \uB2F9\uC2E0\uC758 \uBCC4\uC790\uB9AC\uC5D0 \uB9DE\uB294 \uC2E0\uD0C1\uC744 \uB0B4\uB9BD\uB2C8\uB2E4',feats:['12 \uC62C\uB9BC\uD478\uC2A4 \uC2E0 \uC2E0\uD0C1 \uC624\uB77C\uD074 \uB9AC\uB529','\uCD9C\uC0DD \uBCC4\uC790\uB9AC & \uC7AC\uC804\uC0DD \uC218\uD638\uC2E0 \uD574\uC11D','\uC2E0\uD0C1 \uBA54\uC2DC\uC9C0 & \uD589\uC6B4\uC758 \uAE30\uC6B4 \uBD84\uC11D','\uD55C \uBC88 \uD574\uAE08\uC73C\uB85C \uD3C9\uC0DD \uC774\uC6A9'],cost:'\uD83D\uDD12 \uC601\uAD6C \uD574\uAE08 300\uCF54\uC778',ct:'paid',img:'/fuctionassets/olympus.webp'}
  };`,
]);

// ── 패치 5: Preview Panel 인터셉터에 .lifebook-tile 추가 ─────────────────
PATCHES.push([
  'Preview Panel lifebook-tile \uC778\uD130\uC149\uD130 \uCD94\uAC00',
  `  document.addEventListener('click',function(e){
    var tile=e.target.closest('.tarot-tile');
    if(!tile||tile.getAttribute('data-pvw-bypass'))return;`,
  `  document.addEventListener('click',function(e){
    var tile=e.target.closest('.tarot-tile,.lifebook-tile');
    if(!tile||tile.getAttribute('data-pvw-bypass'))return;`,
]);

// ── 패치 6: Preview Panel paywall에 구독 플랜 안내 추가 ─────────────────
PATCHES.push([
  'Preview Panel \uAD6C\uB3C5 \uC548\uB0B4 \uCD94\uAC00',
  `      if(coinCost>0){
        _paywallEl.style.display='';
        _paywallEl.className='tile-pvw-paywall';
        if(_paywallIcon)_paywallIcon.textContent='\uD83E\uDE99';
        if(_paywallTitle)_paywallTitle.textContent='\uC774\uC6A9 \uCF54\uC778: '+coinCost+'\uCF54\uC778';
        if(_paywallDesc)_paywallDesc.textContent='\uC774\uC6A9\uD560 \uB54C\uB9C8\uB2E4 \uCF54\uC778\uC774 \uCC28\uAC10\uB429\uB2C8\uB2E4. \uCF54\uC778\uC774 \uBD80\uC871\uD558\uBA74 \uCDA9\uC804\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.';
        _ctaBtn.className='tile-pvw-cta-btn tile-pvw-cta-btn--coin';
        _ctaBtn.textContent='\uD83E\uDE99 '+coinCost+'\uCF54\uC778\uC73C\uB85C \uC2DC\uC791\uD558\uAE30';
      } else if(lockKey&&lockCost>0){
        _paywallEl.style.display='';
        _paywallEl.className='tile-pvw-paywall tile-pvw-paywall--lock';
        if(_paywallIcon)_paywallIcon.textContent='\uD83D\uDD12';
        if(_paywallTitle)_paywallTitle.textContent='\uC601\uAD6C \uD574\uAE08: '+lockCost+'\uCF54\uC778';
        if(_paywallDesc)_paywallDesc.textContent='\uD55C \uBC88 \uD574\uAE08\uD558\uBA74 \uACC4\uC18D \uC774\uC6A9 \uAC00\uB2A5\uD569\uB2C8\uB2E4!';
        _ctaBtn.className='tile-pvw-cta-btn tile-pvw-cta-btn--lock';
        _ctaBtn.textContent='\uD83D\uDD13 '+lockCost+'\uCF54\uC778\uC73C\uB85C \uC601\uAD6C \uD574\uAE08';
      } else {
        _paywallEl.style.display='none';
        _ctaBtn.className='tile-pvw-cta-btn';
        _ctaBtn.textContent='\uC9C0\uAE08 \uC2DC\uC791\uD558\uAE30 \u2192';
      }`,
  `      // \uAD6C\uB3C5 \uD50C\uB79C \uCCB4\uD06C
      var _pvwUserPlan='';
      try{var _pvwU=JSON.parse(localStorage.getItem('fortune_auth_user')||'{}');_pvwUserPlan=(_pvwU&&_pvwU.plan)?String(_pvwU.plan):'';}catch(_){}
      var _pvwHasSub=(_pvwUserPlan==='unlimited'||_pvwUserPlan==='premium');
      if(coinCost>0){
        _paywallEl.style.display='';
        _paywallEl.className='tile-pvw-paywall';
        if(_pvwHasSub){
          if(_paywallIcon)_paywallIcon.textContent='\u2705';
          if(_paywallTitle)_paywallTitle.textContent='\uD504\uB9AC\uBBF8\uC5C4 \uAD6C\uB3C5 \uC774\uC6A9 \uAC00\uB2A5';
          if(_paywallDesc)_paywallDesc.textContent='\uD504\uB9AC\uBBF8\uC5C4 \uAD6C\uB3C5 \uC911\uC774\uB77C \uCF54\uC778 \uC5C6\uC774 \uC774\uC6A9 \uAC00\uB2A5\uD569\uB2C8\uB2E4!';
          _ctaBtn.className='tile-pvw-cta-btn tile-pvw-cta-btn--sub';
          _ctaBtn.textContent='\u2705 \uAD6C\uB3C5\uC73C\uB85C \uBC14\uB85C \uC2DC\uC791\uD558\uAE30';
        } else {
          if(_paywallIcon)_paywallIcon.textContent='\uD83E\uDE99';
          if(_paywallTitle)_paywallTitle.textContent='\uC774\uC6A9 \uCF54\uC778: '+coinCost+'\uCF54\uC778';
          if(_paywallDesc)_paywallDesc.textContent='\uC774\uC6A9\uD560 \uB54C\uB9C8\uB2E4 \uCF54\uC778\uC774 \uCC28\uAC10\uB429\uB2C8\uB2E4. \uCF54\uC778\uC774 \uBD80\uC871\uD558\uBA74 \uCDA9\uC804\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.';
          _ctaBtn.className='tile-pvw-cta-btn tile-pvw-cta-btn--coin';
          _ctaBtn.textContent='\uD83E\uDE99 '+coinCost+'\uCF54\uC778\uC73C\uB85C \uC2DC\uC791\uD558\uAE30';
        }
      } else if(lockKey&&lockCost>0){
        _paywallEl.style.display='';
        _paywallEl.className='tile-pvw-paywall tile-pvw-paywall--lock';
        if(_pvwHasSub){
          if(_paywallIcon)_paywallIcon.textContent='\u2705';
          if(_paywallTitle)_paywallTitle.textContent='\uD504\uB9AC\uBBF8\uC5C4 \uAD6C\uB3C5 \uC601\uAD6C \uD574\uAE08 \uAC00\uB2A5';
          if(_paywallDesc)_paywallDesc.textContent='\uD504\uB9AC\uBBF8\uC5C4 \uAD6C\uB3C5 \uC911\uC774\uB77C \uCF54\uC778 \uC5C6\uC774 \uC601\uAD6C \uD574\uAE08\uB429\uB2C8\uB2E4!';
          _ctaBtn.className='tile-pvw-cta-btn tile-pvw-cta-btn--sub';
          _ctaBtn.textContent='\u2705 \uAD6C\uB3C5\uC73C\uB85C \uC601\uAD6C \uD574\uAE08';
        } else {
          if(_paywallIcon)_paywallIcon.textContent='\uD83D\uDD12';
          if(_paywallTitle)_paywallTitle.textContent='\uC601\uAD6C \uD574\uAE08: '+lockCost+'\uCF54\uC778';
          if(_paywallDesc)_paywallDesc.textContent='\uD55C \uBC88 \uD574\uAE08\uD558\uBA74 \uACC4\uC18D \uC774\uC6A9 \uAC00\uB2A5\uD569\uB2C8\uB2E4! \uD639\uC740 \uD504\uB9AC\uBBF8\uC5C4 \uAD6C\uB3C5\uC73C\uB85C\uB3C4 \uD574\uAE08 \uAC00\uB2A5\uD569\uB2C8\uB2E4.';
          _ctaBtn.className='tile-pvw-cta-btn tile-pvw-cta-btn--lock';
          _ctaBtn.textContent='\uD83D\uDD13 '+lockCost+'\uCF54\uC778\uC73C\uB85C \uC601\uAD6C \uD574\uAE08';
        }
      } else {
        _paywallEl.style.display='none';
        _ctaBtn.className='tile-pvw-cta-btn';
        _ctaBtn.textContent='\uC9C0\uAE08 \uC2DC\uC791\uD558\uAE30 \u2192';
      }`,
]);

// ============================================================================
// 파일별 패치 실행
// ============================================================================

function applyPatchesToContent(content, filePath) {
  let result = content;
  let anyChanged = false;

  for (const [name, oldStr, newStr] of PATCHES) {
    if (result.includes(oldStr)) {
      result = result.split(oldStr).join(newStr);
      console.log(`  \u2713 ${name}`);
      anyChanged = true;
    } else if (result.includes(newStr)) {
      console.log(`  \u25CB \uC774\uBBF8 \uC801\uC6A9\uB428: ${name}`);
    } else {
      console.warn(`  \u2717 \uD328\uCE58 \uBBF8\uC801\uC6A9 (\uD14D\uC2A4\uD2B8 \uBD88\uC77C\uCE58): ${name}`);
    }
  }

  return { result, anyChanged };
}

let patchedCount = 0;

for (const relPath of FILES) {
  const absPath = join(__dir, relPath);
  let content;
  try {
    content = readFileSync(absPath, 'utf8');
  } catch (_) {
    console.warn(`[SKIP] \uD30C\uC77C \uC5C6\uC74C: ${relPath}`);
    continue;
  }

  console.log(`\n[\uD30C\uC77C] ${relPath}`);
  const { result, anyChanged } = applyPatchesToContent(content, absPath);

  if (anyChanged) {
    writeFileSync(absPath, result, 'utf8');
    console.log(`  \u2192 \uC800\uC7A5 \uC644\uB8CC`);
    patchedCount++;
  } else {
    console.log(`  \u2192 \uBCC0\uACBD \uC5C6\uC74C`);
  }
}

console.log(`\n\u2705 \uC644\uB8CC: ${patchedCount}\uAC1C \uD30C\uC77C \uD328\uCE58\uB428`);

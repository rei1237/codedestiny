/* saju-engine continuation — STEP 8+ 모달 · 초기화 · destinyProfileChanged
 * 로드 순서: js/saju-engine.js → js/saju-engine-tarot-sukuyo-quantum.js → js/core/saju/reportDashboard.js → (본 파일) */

/* ═══════════════════════════════════════
   STEP 8: 모달
═══════════════════════════════════════ */
function showTsDetail(name){
  var info=TS_DB[name],deep=TS_DEEP[name];
  if(!info||!deep)return;
  document.getElementById('modalBody').innerHTML=
    '<div style="text-align:center;margin-bottom:20px">'+
    '<div style="font-size:2.8rem;margin-bottom:8px">'+info.emoji+'</div>'+
    '<h2 style="color:var(--pink);font-size:1.4rem;margin-bottom:4px">'+name+'</h2>'+
    '<div style="color:#999;font-size:.85rem;font-weight:700">'+info.desc+'</div></div>'+
    '<div class="prem-box"><span class="prem-title">🦁 성격과 기질</span><div class="prem-text">'+deep.nature+'</div></div>'+
    '<div class="prem-box"><span class="prem-title">💼 직업 적성</span><div class="prem-text">'+deep.career+'</div></div>'+
    '<div class="prem-box"><span class="prem-title">💘 연애 스타일</span><div class="prem-text">'+deep.love+'</div></div>'+
    '<div class="prem-box" style="background:#E8F5E9;border-color:#C8E6C9">'+
    '<span class="prem-title" style="border-color:#4CAF50;color:#2E7D32">🍀 연이의 조언</span>'+
    '<div class="prem-text" style="font-weight:700;color:#1B5E20">"'+deep.advice+'"</div></div>';
  document.getElementById('tsModal').classList.add('show');
}
function closeModal(e){
  if(e&&e.target!==document.getElementById('tsModal'))return;
  document.getElementById('tsModal').classList.remove('show');
}

function resetApp(){
  try {
    if (typeof window._cdSetCoinGateOverlay === 'function') window._cdSetCoinGateOverlay(false);
    if (typeof window.__cdCloseLoginRequiredModal === 'function') window.__cdCloseLoginRequiredModal();
    var paidGateEl = document.getElementById('cdPaidFeatureGate');
    if (paidGateEl) paidGateEl.classList.remove('is-open');
    var tilePreviewEl = document.getElementById('tilePvwOverlay');
    if (tilePreviewEl) {
      tilePreviewEl.classList.remove('pvw-open');
      tilePreviewEl.classList.remove('pvw-prem');
    }
    if (typeof window.__cdForceUnlockBodyScroll === 'function') {
      window.__cdForceUnlockBodyScroll();
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    }
    document.documentElement.style.overflow = '';
    document.body.classList.remove('lb-modal-open');
  } catch (_resetScrollLockErr) {}
  var inputPageEl = document.getElementById('inputPage');
  var resultPageEl = document.getElementById('resultPage');
  var letterBoxEl = document.getElementById('letterBox');
  var emailSubBoxEl = document.getElementById('emailSubBox');
  var btnNewSajuEl = document.getElementById('btnNewSaju');
  var dwDetailEl = document.getElementById('dwDetail');
  if (inputPageEl) inputPageEl.style.display = 'block';
  if (resultPageEl) resultPageEl.style.display = 'none';
  if (letterBoxEl) letterBoxEl.style.display = 'none';
  if (emailSubBoxEl) emailSubBoxEl.style.display = 'none';
  if (btnNewSajuEl) btnNewSajuEl.style.display = 'none';
  if (dwDetailEl) {
    dwDetailEl.innerHTML = '';
    dwDetailEl.classList.remove('show');
  }
  var energyCoordCard=document.getElementById('energyCoordCard');
  var energyCoordSection=document.getElementById('energyCoordSection');
  if(energyCoordCard)energyCoordCard.style.display='none';
  if(energyCoordSection)energyCoordSection.innerHTML='';
  var ss=document.getElementById('shareSection');if(ss)ss.style.display='none';
  var ds=document.getElementById('destinySection');if(ds)ds.style.display='none';
   var compatResult=document.getElementById('compatResult');
   if(compatResult)compatResult.innerHTML='';
  var specialCharmCard=document.getElementById('specialCharmCard');
  if(specialCharmCard)specialCharmCard.remove();
  var dmCard=document.getElementById('dailyMonthlyCard');
  if(dmCard)dmCard.style.display='none';
  /* ── 대시보드 카드 전체 원위치 초기화 ── */
  (function _cleanupDashboard() {
    try {
      var _rc = document.getElementById('reportDashboard');
      var _rd = document.getElementById('reportDashboardCard');
      var _rz = document.getElementById('_rptRescueZone');
      var _rp = document.getElementById('resultPage');
      ['lottoCard','tTestCard','quantumCard','villainCard',
       'hormone-vibe-section','sajuFourCutCard','aiPromptCard',
       'skillTreeCard','healthReportCard','energyCoordCard'].forEach(function(id) {
        var el = document.getElementById(id);
        if (!el) return;
        if ((_rc && _rc.contains(el)) || (_rz && _rz.contains(el))) {
          if (_rp) _rp.appendChild(el);
        }
        el.style.display = 'none';
      });
      if (_rc) _rc.innerHTML = '';
      if (_rd) _rd.style.display = 'none';
      if (_rz) _rz.innerHTML = '';
    } catch (_e) {}
  })();
  G_POWER=null;G_JONG=null;G_JOHU=null;G_JONG_VERIFIED=null;
  _clearDestinyFlowerSajuSnapshot();
  requestAnimationFrame(function () {
    setTimeout(function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  });
}

/* ═══════════════════════════════════════
   STEP 10: 초기화
═══════════════════════════════════════ */
function _unlockCoreBirthInputsAfterBootstrapError() {
  ['birthHour', 'birthMinute', 'birthCountry', 'btnF', 'btnM'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    try {
      el.disabled = false;
      el.removeAttribute('disabled');
    } catch (e) {}
  });
}

function _safeBootstrapSajuFlow() {
  // 메인 입력 폼 활성화만 우선 처리하고, 무거운 초기 로드는 사용자 액션 시점으로 미룬다.
  try {
    if (typeof initSelectors === 'function') {
      initSelectors();
    } else {
      _initSelectorsManually();
    }
  } catch (e1) {
    console.error('[saju-bootstrap] initSelectors 실패:', e1);
    _initSelectorsManually();
  }

  try {
    if (typeof populateCelebList === 'function') {
      populateCelebList();
    }
  } catch (eCeleb) {
    console.error('[saju-bootstrap] populateCelebList 실패:', eCeleb);
  }

  _ensureFormFieldsReady();
  _unlockCoreBirthInputsAfterBootstrapError();

  requestAnimationFrame(function() {
    try {
      _ensureFormFieldsReady();
    } catch (e2) {
      console.error('[saju-bootstrap] 폼 상태 재확인 실패:', e2);
    }
  });
}

/* 매뉴얼 초기화 - initSelectors 대체 */
function _initSelectorsManually() {
  console.log('[saju-bootstrap] 매뉴얼 초기화 시작');
  try {
    var hSel = document.getElementById('birthHour');
    var mSel = document.getElementById('birthMinute');
    if (hSel && mSel) {
      var prevH = hSel.value; // 사용자가 이미 선택한 값 보존
      var prevM = mSel.value;
      // 시간 선택지 생성
      var hBuf = '';
      for (var h = 0; h < 24; h++) {
        hBuf += '<option value="' + h + '">' + (h < 10 ? '0' : '') + h + '시</option>';
      }
      hSel.innerHTML = hBuf;
      hSel.value = (prevH !== '' && prevH !== null) ? prevH : '12';
      
      // 분 선택지 생성
      var mBuf = '';
      for (var m = 0; m < 60; m++) {
        mBuf += '<option value="' + m + '">' + (m < 10 ? '0' : '') + m + '분</option>';
      }
      mSel.innerHTML = mBuf;
      mSel.value = (prevM !== '' && prevM !== null) ? prevM : '0';
      
      console.log('[saju-bootstrap] 매뉴얼 초기화 완료');
    } else {
      console.error('[saju-bootstrap] birthHour 또는 birthMinute 요소를 찾을 수 없음');
    }
  } catch (e) {
    console.error('[saju-bootstrap] 매뉴얼 초기화 실패:', e);
  }
}

/* 입력 필드 준비 상태 확보 */
function _ensureFormFieldsReady() {
  var hSel = document.getElementById('birthHour');
  var mSel = document.getElementById('birthMinute');
  var countrySel = document.getElementById('birthCountry');
  
  if (hSel && hSel.options.length === 0) {
    console.log('[saju-bootstrap] birthHour options이 비어있음, 추가 중...');
    _initSelectorsManually();
  }
  
  if (mSel && mSel.options.length === 0) {
    console.log('[saju-bootstrap] birthMinute options이 비어있음, 추가 중...');
    _initSelectorsManually();
  }
  
  if (countrySel && countrySel.options.length <= 1) {
    console.log('[saju-bootstrap] birthCountry options이 부족함, 복구 시도 중...');
    try {
      if (typeof populateBirthCountrySelector === 'function') {
        populateBirthCountrySelector();
      }
    } catch (e) {
      console.error('[saju-bootstrap] birthCountry 복구 실패:', e);
    }
  }
  
  _unlockCoreBirthInputsAfterBootstrapError();
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',function(){
  _safeBootstrapSajuFlow();
});
}else{
  _safeBootstrapSajuFlow();
}

/* ═══════════════════════════════════════
   STEP 11: 나의 운명 카드 → 글로벌 상태 동기화
   destinyProfileChanged 이벤트 수신
   → 엔진 전역 변수(_ziweiBirth, GENDER) 즉시 반영
   → 결과 화면이 열려 있으면 자미두수·점성술·숙요점 재렌더
═══════════════════════════════════════ */
document.addEventListener('destinyProfileChanged', function(e) {
  try {
    var p = e.detail && e.detail.profile;
    if (!p || !p.birth) return;
    var b = p.birth;
    var l = p.location || {};
    var tzResolved = resolveBirthTimezoneOffset(
      b.year,
      b.month,
      b.day,
      (b.hour !== undefined ? b.hour : 12),
      (b.minute !== undefined ? b.minute : 0),
      (l.tz || 'Asia/Seoul'),
      (l.baseTzOffset !== undefined ? l.baseTzOffset : (l.tzOffset !== undefined ? l.tzOffset : 9))
    );

    /* ① 전역 상태 동기화 */
    window._astroBirth = {
      year: b.year, month: b.month, day: b.day,
      hour: (b.hour !== undefined ? b.hour : 12),
      minute: (b.minute !== undefined ? b.minute : 0),
      lat: (l.lat !== undefined ? l.lat : 37.6),
      lon: (l.lng !== undefined ? l.lng : 127.0),
      tz: tzResolved.tzOffsetHours
    };

    window._ziweiBirth = {
      year: b.year, month: b.month, day: b.day,
      hour: (b.hour !== undefined ? b.hour : 12),
      minute: (b.minute !== undefined ? b.minute : 0),
      lat: (l.lat !== undefined ? l.lat : 37.6),
      lon: (l.lng !== undefined ? l.lng : 127.0),
      tz: tzResolved.tzOffsetHours
    };

    /* ② 성별 전역 동기화 */
    if (typeof setGender === 'function') setGender(p.gender || 'F');
    GENDER = p.gender || 'F';

    /* ③ 결과 화면이 이미 열려 있으면 핵심 섹션 재렌더 */
    var resultPage = document.getElementById('resultPage');
    if (resultPage && resultPage.style.display !== 'none' && G_PILLARS) {
      try { renderAstroInsight(); }                 catch(re) {}
      try { renderSukuyo(G_PILLARS, G_NATAL, G_BAZI, null); } catch(re) {}
      _syncDestinyFlowerSajuSnapshot('profile-change-event');
    }
  } catch(err) {
    console.error('[DP→Engine] destinyProfileChanged 처리 오류:', err);
  }
});

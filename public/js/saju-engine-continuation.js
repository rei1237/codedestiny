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
  document.getElementById('inputPage').style.display='block';
  document.getElementById('resultPage').style.display='none';
    document.getElementById('letterBox').style.display='none';
    document.getElementById('emailSubBox').style.display='none';
    document.getElementById('btnNewSaju').style.display='none';
  document.getElementById('dwDetail').innerHTML='';
  document.getElementById('dwDetail').classList.remove('show');
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
  G_POWER=null;G_JONG=null;G_JOHU=null;
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
  /* 1단계: 입력 필드 초기화 */
  try {
    initSelectors();
  } catch (e1) {
    console.error('[saju-bootstrap] initSelectors 실패:', e1);
    /* 실패해도 계속 진행 */
  }
  
  /* 2단계: 유명의 리스트 로드 */
  try {
    populateCelebList();
  } catch (e2) {
    console.error('[saju-bootstrap] populateCelebList 실패:', e2);
    /* 실패해도 계속 진행 */
  }
  
  /* 3단계: CDN 라이브러리 로드 */
  try {
    loadNext();
  } catch (e3) {
    console.error('[saju-bootstrap] loadNext 실패:', e3);
    _unlockCoreBirthInputsAfterBootstrapError();
  }
  
  /* 부트 완료 후에도 입력 필드 상태 확보 */
  setTimeout(function() {
    try {
      _unlockCoreBirthInputsAfterBootstrapError();
    } catch (e) {}
  }, 2000);
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

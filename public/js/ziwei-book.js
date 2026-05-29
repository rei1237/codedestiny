(function(){
  'use strict';

  var TOTAL_CHAPTERS = 13;
  var FEATURE_KEY = 'premium_pdf_ziwei';
  var COIN_COST = 590;
  var PREPARE_API = '/api/ziwei-book/prepare';
  var COVER_IMAGE = '/fuctionassets/jamipremiun.webp';
  var RESULT = null;
  var GENERATING = false;
  var LAST_SEED = null;

  var CHAPTERS = [
    'Chapter 1. 명궁 완전 해독 — 타고난 나의 중심 별',
    'Chapter 2. 신궁 심층 분석 — 후천적으로 완성되는 나',
    'Chapter 3. 형제궁과 인간관계 — 가까운 사람들과의 거리',
    'Chapter 4. 부부궁 — 사랑, 결혼, 깊은 인연의 방식',
    'Chapter 5. 자녀궁 — 창조성, 표현력, 이어지는 운',
    'Chapter 6. 재백궁 — 돈, 자산, 현실 감각',
    'Chapter 7. 질액궁 — 몸과 마음의 취약 지점',
    'Chapter 8. 천이궁 — 세상 밖에서 열리는 기회',
    'Chapter 9. 노복궁 — 사람을 얻고 쓰는 힘',
    'Chapter 10. 관록궁 — 직업, 명예, 사회적 성취',
    'Chapter 11. 전택궁 — 집, 기반, 축적되는 복',
    'Chapter 12. 복덕궁 — 행복, 내면, 영혼의 쉼터',
    'Chapter 13. 대운·유년 종합 전략 — 앞으로 열리는 운의 지도'
  ];

  var PALACE_KEY_BY_NAME = {
    '명궁': 'ming',
    '형제궁': 'siblings',
    '부처궁': 'spouse',
    '부부궁': 'spouse',
    '자녀궁': 'children',
    '재백궁': 'wealth',
    '질액궁': 'health',
    '천이궁': 'travel',
    '노복궁': 'friends',
    '교우궁': 'friends',
    '관록궁': 'career',
    '전택궁': 'property',
    '복덕궁': 'fortune',
    '부모궁': 'parents'
  };

  function $(id){ return document.getElementById(id); }
  function text(value){ return String(value == null ? '' : value).trim(); }
  function esc(value){
    return text(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function pad2(value){ return String(Number(value) || 0).padStart(2, '0'); }
  function setText(id, value){ var el = $(id); if(el) el.textContent = value; }
  function setDisplay(id, value){ var el = $(id); if(el) el.style.display = value; }

  function updateProgress(percent, label){
    var fill = $('zbProgressBar');
    if(fill) fill.style.width = Math.max(0, Math.min(100, percent)) + '%';
    setText('zbLoadingChapter', label || '자미두수 명반을 준비하고 있습니다.');
  }

  function markChapter(index){
    for(var i=0; i<TOTAL_CHAPTERS; i++){
      var dot = $('zbChDot' + i);
      if(!dot) continue;
      dot.classList.toggle('lb-ch-dot--done', i < index);
      dot.classList.toggle('lb-ch-dot--active', i === index);
    }
    var countText = Math.max(0, Math.min(TOTAL_CHAPTERS, index + 1)) + ' / ' + TOTAL_CHAPTERS + ' 챕터 완성';
    if($('zbChapterCount')) setText('zbChapterCount', countText);
    else setText('zbProgressText', countText);
  }

  function getField(ids){
    for(var i=0;i<ids.length;i++){
      var el = $(ids[i]);
      if(el && text(el.value)) return text(el.value);
    }
    return '';
  }

  function getActiveProfile(){
    var saved = window.__cdActiveBirthProfile || window._cdCurrentProfile || window.currentProfile || window._currentProfile || {};
    var birth = (saved && typeof saved.birth === 'object') ? saved.birth : {};
    var name = getField(['userName','name','birthName','profileName','nameInput']) || text(saved.name) || '사용자';
    var gender = getField(['gender','userGender','birthGender']) || text(saved.gender) || text(window.GENDER) || 'unknown';
    var birthDate = getField(['birthDate','birthdate','solarDate','birth_date']) || text(saved.birthDate) || text(saved.date) || text(birth.birthDate || birth.date || birth.solarDate) || '';
    var year = Number(getField(['birthYear','year','yyyy'])) || Number(saved.year) || Number(birth.year) || 0;
    var month = Number(getField(['birthMonth','month','mm'])) || Number(saved.month) || Number(birth.month) || 0;
    var day = Number(getField(['birthDay','day','dd'])) || Number(saved.day) || Number(birth.day) || 0;
    if(birthDate && /^\d{4}-\d{1,2}-\d{1,2}$/.test(birthDate)){
      var parts = birthDate.split('-').map(function(v){ return Number(v); });
      year = year || parts[0]; month = month || parts[1]; day = day || parts[2];
    }
    var birthTime = getField(['birthTime','birthtime','time','birth_time']) || text(saved.birthTime) || text(saved.time) || text(birth.birthTime || birth.time) || '';
    var hour = Number(getField(['birthHour','hour','hh'])) || Number(saved.hour) || Number(birth.hour);
    var minute = Number(getField(['birthMinute','minute','mi'])) || Number(saved.minute) || Number(birth.minute);
    if(birthTime && /^\d{1,2}:\d{1,2}$/.test(birthTime)){
      var tp = birthTime.split(':').map(function(v){ return Number(v); });
      if(!Number.isFinite(hour)) hour = tp[0];
      if(!Number.isFinite(minute)) minute = tp[1];
    }
    if(!Number.isFinite(hour)) hour = 12;
    if(!Number.isFinite(minute)) minute = 0;
    return {
      name: name,
      gender: gender,
      year: year,
      month: month,
      day: day,
      hour: hour,
      minute: minute,
      birthDate: year && month && day ? year + '-' + pad2(month) + '-' + pad2(day) : birthDate,
      birthTime: pad2(hour) + ':' + pad2(minute),
      calendarType: getField(['calendarType','birthCalendarType']) || text(saved.calendarType || birth.calendarType) || 'solar',
      birthplace: getField(['birthplace','birthPlace']) || text(saved.birthplace || saved.birthPlace || birth.birthplace || birth.birthPlace) || '대한민국'
    };
  }

  function normalizeStrengthName(value){
    var raw = text(value);
    if(/묘|왕|廟|旺|◎/.test(raw)) return '묘';
    if(/득|得|○|O/.test(raw)) return '득';
    if(/리|利|약|▲/.test(raw)) return '리';
    if(/평|平|△/.test(raw)) return '평';
    if(/함|실|陷|불|쇠|×|X/i.test(raw)) return '함';
    return '평';
  }

  function strengthSymbol(value){
    var normalized = normalizeStrengthName(value);
    if(normalized === '묘') return '◎';
    if(normalized === '득') return 'O';
    if(normalized === '리') return '▲';
    if(normalized === '평') return '△';
    return 'X';
  }

  function normalizeStar(raw){
    if(!raw) return null;
    if(typeof raw === 'string'){
      var clean = raw.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
      var sihua = (clean.match(/화록|화권|화과|화기/) || [''])[0];
      var symbol = (clean.match(/[◎○O▲△X×]/) || [''])[0];
      var name = clean
        .replace(/\(차성\)/g,'')
        .replace(/화록|화권|화과|화기/g,'')
        .replace(/[◎○O▲△X×]/g,'')
        .trim()
        .split(' ')[0];
      if(!name) return null;
      var strengthName = normalizeStrengthName(symbol);
      return { name: name, strengthName: strengthName, strengthSymbol: strengthSymbol(strengthName), sihua: sihua, borrowed: /차성/.test(clean) };
    }
    var nameObj = text(raw.name || raw.nameKo || raw.starName);
    if(!nameObj) return null;
    var strength = normalizeStrengthName(raw.strength || raw.strengthName || raw.symbol || raw.strengthSymbol || raw.brightness);
    return {
      name: nameObj,
      strengthName: strength,
      strengthSymbol: strengthSymbol(strength),
      sihua: text(raw.sihua || raw.transform || raw.transformation),
      borrowed: raw.borrowed === true
    };
  }

  function normalizeStars(list){
    if(!Array.isArray(list)) return [];
    return list.map(normalizeStar).filter(Boolean);
  }

  function normalizePalaces(chart){
    var source = [];
    if(Array.isArray(chart && chart.palaces)) source = chart.palaces;
    else if(Array.isArray(chart && chart.palaceStarData)) source = chart.palaceStarData;
    else if(chart && chart.palacesByIndex){
      source = Object.keys(chart.palacesByIndex).map(function(key){ return chart.palacesByIndex[key]; });
    }
    return source.map(function(p, index){
      var name = text(p.nameKo || p.name || p.palace || p.gung || p.palaceName);
      var key = text(p.key || p.id || PALACE_KEY_BY_NAME[name]);
      return {
        key: key,
        nameKo: name,
        branch: text(p.branch || p.zhi || p.earthlyBranch),
        index: index,
        mainStars: normalizeStars(p.mainStars || p.stars || p.main || []),
        auxStars: normalizeStars(p.auxStars || p.auxiliaryStars || p.aux || []),
        maleficStars: normalizeStars(p.maleficStars || p.badStars || p.bad || []),
        transformations: Array.isArray(p.transformations) ? p.transformations : []
      };
    });
  }

  async function ensureZiweiEngine(){
    if(typeof window.calcZiweiPalaces === 'function') return;
    if(typeof window.__cdEnsureSajuCoreLoaded === 'function'){
      await window.__cdEnsureSajuCoreLoaded();
    }
    if(typeof window.calcZiweiPalaces !== 'function'){
      throw new Error('자미두수 계산 엔진을 불러오지 못했습니다. 기본 사주 결과를 먼저 계산한 뒤 다시 시도해 주세요.');
    }
  }

  async function buildZiweiSeed(profile){
    await ensureZiweiEngine();
    if(!profile.year || !profile.month || !profile.day){
      throw new Error('자미두수 PDF 생성을 위해 생년월일을 입력해 주세요.');
    }
    window._ziweiBirth = {
      year: profile.year,
      month: profile.month,
      day: profile.day,
      hour: profile.hour,
      minute: profile.minute,
      gender: profile.gender
    };
    if(profile.gender) window.GENDER = profile.gender;
    var raw = window.calcZiweiPalaces(profile.year, profile.month, profile.day, profile.hour, profile.minute);
    if(!raw || !raw.palaceStarData){
      throw new Error('자미두수 명반 계산 결과가 비어 있습니다. 입력값을 확인해 주세요.');
    }
    window._currentZiweiData = raw;
    var structured = null;
    try {
      if(typeof window.getZiweiStructuredData === 'function') structured = window.getZiweiStructuredData();
    } catch(e) {
      structured = null;
    }
    var reportPayload = structured && (structured.reportPayload || structured.ziweiBase || structured.chart);
    var palaces = normalizePalaces(reportPayload || raw);
    if(palaces.length < 12) palaces = normalizePalaces(raw);
    var chartMeta = (reportPayload && reportPayload.chartMeta) || raw.calcMeta || {};
    var seed = {
      profile: profile,
      chartMeta: {
        mingGong: text(chartMeta.mingGong || raw.meng),
        shenGong: text(chartMeta.shenGong || raw.shen),
        fiveElementBureau: text(chartMeta.fiveElementBureau || (raw.juInfo && raw.juInfo.label) || raw.ju),
        yearStemBranch: text(chartMeta.yearStemBranch || raw.yearGan || '')
      },
      palaces: palaces,
      sihua: Array.isArray((reportPayload || {}).sihua) ? reportPayload.sihua : (raw.sihuaData || []),
      luck: {
        decadeLuck: Array.isArray((reportPayload || {}).luck && reportPayload.luck.decadeLuck) ? reportPayload.luck.decadeLuck : (raw.daHanList || raw.daHan || []),
        annual: Array.isArray((reportPayload || {}).luck && reportPayload.luck.annual) ? reportPayload.luck.annual : []
      },
      diagnostics: {
        palaceCount: palaces.length,
        generatedBy: 'calcZiweiPalaces',
        generatedAt: new Date().toISOString()
      }
    };
    LAST_SEED = seed;
    return seed;
  }

  function getPremiumToken(){
    try {
      var keys = ['cd_premium_access','premiumAccessToken','cdPremiumAccessToken','ziweiPremiumAccessToken'];
      for(var i=0;i<keys.length;i++){
        var local = localStorage.getItem(keys[i]) || sessionStorage.getItem(keys[i]);
        if(local) return local;
      }
    } catch(e) {}
    return '';
  }

  function storePremiumToken(token){
    if(!token) return;
    try {
      localStorage.setItem('ziweiPremiumAccessToken', token);
      sessionStorage.setItem('ziweiPremiumAccessToken', token);
    } catch(e) {}
  }

  async function ensurePayment(){
    if(typeof window._cdCoinGatePerUse !== 'function'){
      return { ok: true, premiumAccessToken: getPremiumToken() };
    }
    return new Promise(function(resolve, reject){
      var settled = false;
      function finish(result){
        if(settled) return;
        settled = true;
        if(result && result.ok === false){
          reject(new Error(result.message || '코인 결제 확인이 필요합니다.'));
          return;
        }
        var token = result && (result.premiumAccessToken || result.accessToken || result.token);
        if(token) storePremiumToken(token);
        resolve(result || { ok: true, premiumAccessToken: getPremiumToken() });
      }
      try {
        var immediate = window._cdCoinGatePerUse(COIN_COST, '자미두수 프리미엄 PDF 리포트 생성', function(_transactionId, data){
          finish(Object.assign({ ok: true, transactionId: _transactionId }, data || {}));
        }, function(error){
          finish({ ok: false, message: (error && error.message) || '코인 결제 확인이 필요합니다.' });
        }, {
          featureKey: FEATURE_KEY,
          serviceKey: 'ziwei-book',
          reportType: 'ziweiPremium',
          requestId: FEATURE_KEY + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
        });
        if(immediate && typeof immediate.then === 'function'){
          immediate.then(finish).catch(function(error){ finish({ ok: false, message: error && error.message }); });
        } else if(immediate && immediate.ok === false) {
          finish(immediate);
        }
      } catch(error) {
        finish({ ok: false, message: error && error.message });
      }
    });
  }

  async function postPrepare(profile, seed, payment){
    var token = (payment && (payment.premiumAccessToken || payment.accessToken)) || getPremiumToken();
    var headers = { 'Content-Type': 'application/json' };
    if(token) headers['x-premium-access-token'] = token;
    var body = {
      featureKey: FEATURE_KEY,
      reportType: 'ziweiPremium',
      premiumAccessToken: token || '',
      paymentContext: payment || {},
      birthProfile: profile,
      year: profile.year,
      month: profile.month,
      day: profile.day,
      hour: profile.hour,
      minute: profile.minute,
      gender: profile.gender,
      calendarType: profile.calendarType,
      birthplace: profile.birthplace,
      ziweiBase: seed
    };
    var res = await fetch(PREPARE_API, { method: 'POST', credentials: 'include', headers: headers, body: JSON.stringify(body) });
    var json = await res.json().catch(function(){ return {}; });
    if(!res.ok || !json.ok){
      throw new Error(json.message || json.error || ('자미두수 PDF 생성 요청에 실패했습니다. HTTP ' + res.status));
    }
    if(json.premiumAccessToken || json.accessToken) storePremiumToken(json.premiumAccessToken || json.accessToken);
    return json;
  }

  function renderResult(data){
    var box = $('zbResultContent');
    if(!box) return;
    var chapters = Array.isArray(data.chapters) ? data.chapters : [];
    var cover = '<div class="zb-result-cover"><img src="' + esc(COVER_IMAGE) + '" alt="자미두수 프리미엄 PDF 표지"><div><p>ZIWEI PREMIUM</p><h3>자미두수 프리미엄 PDF</h3><span>' + esc(chapters.length) + '챕터 생성 완료</span></div></div>';
    var html = chapters.map(function(chapter, index){
      var categories = Array.isArray(chapter.categories) ? chapter.categories : [];
      var catHtml = categories.map(function(cat){
        return '<div class="zb-result-cat"><strong>' + esc(cat.title) + '</strong><p>' + esc(cat.finalText || cat.text || '') + '</p></div>';
      }).join('');
      return '<article class="zb-result-chapter"><small>' + (index + 1) + ' / ' + TOTAL_CHAPTERS + '</small><h4>' + esc(chapter.title || CHAPTERS[index] || '') + '</h4>' + catHtml + '</article>';
    }).join('');
    box.innerHTML = cover + html;
    setDisplay('zbStartScreen','none');
    setDisplay('zbLoadingScreen','none');
    setDisplay('zbResultScreen','block');
  }

  function showError(message){
    setDisplay('zbLoadingScreen','none');
    setDisplay('zbStartScreen','block');
    var msg = message || '자미두수 PDF 생성 중 문제가 발생했습니다.';
    if(window.showToast) window.showToast(msg, 'error');
    else alert(msg);
  }

  window.openZiweiBookModal = function(){
    var modal = $('ziweiBookModal');
    if(!modal) return;

    var profile = getActiveProfile();
    if (!profile || !profile.year || !profile.month) {
      try {
        var _dpNs = 'FORTUNE_APP_USER_PROFILES';
        var _dpList = JSON.parse(localStorage.getItem(_dpNs + '.list') || '[]');
        var _dpCurrId = localStorage.getItem(_dpNs + '.current');
        var _dpMatch = (_dpCurrId && _dpList.find(function(p){return p.id===_dpCurrId;})) || (_dpList.length && _dpList[0]) || null;
        if (_dpMatch && _dpMatch.birth && _dpMatch.birth.year) {
          window.__cdActiveBirthProfile = _dpMatch;
          profile = getActiveProfile();
        }
      } catch (_dpE) {}
    }

    if (profile && profile.year && profile.month) {
      if (!window.__cdActiveBirthProfile || !window.__cdActiveBirthProfile.birth) {
        window.__cdActiveBirthProfile = profile;
      }
      setDisplay('zbStartScreen','block');
      setDisplay('zbNoProfileScreen','none');
    } else {
      setDisplay('zbStartScreen','none');
      setDisplay('zbNoProfileScreen','block');
    }

    modal.classList.add('active');
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');

    if(!RESULT){
      setDisplay('zbLoadingScreen','none');
      setDisplay('zbResultScreen','none');
      updateProgress(0, '자미두수 명반을 준비합니다.');
      markChapter(-1);
    }
  };

  window.closeZiweiBookModal = function(){
    var modal = $('ziweiBookModal');
    if(modal){
      modal.classList.remove('active');
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
  };

  window.gotoZiweiPremium = function(){
    window.openZiweiBookModal();
  };

  window.generateZiweiBook = async function(){
    if(GENERATING) return;
    GENERATING = true;
    RESULT = null;
    try {
      setDisplay('zbStartScreen','none');
      setDisplay('zbResultScreen','none');
      setDisplay('zbLoadingScreen','block');
      updateProgress(8, '입력값과 로그인 상태를 확인합니다.');
      markChapter(-1);
      var profile = getActiveProfile();
      updateProgress(18, '로컬 자미두수 명반을 계산합니다.');
      var seed = await buildZiweiSeed(profile);
      updateProgress(28, '프리미엄 이용권과 코인을 확인합니다.');
      var payment = await ensurePayment();
      updateProgress(42, '13챕터 PDF seed를 서버에 전달합니다.');
      var data = await postPrepare(profile, seed, payment);
      var chapters = Array.isArray(data.chapters) ? data.chapters : [];
      for(var i=0; i<Math.min(chapters.length, TOTAL_CHAPTERS); i++){
        markChapter(i);
        updateProgress(48 + Math.round(((i + 1) / TOTAL_CHAPTERS) * 44), CHAPTERS[i] || '챕터를 완성하고 있습니다.');
      }
      RESULT = data;
      updateProgress(100, '자미두수 프리미엄 PDF가 준비되었습니다.');
      renderResult(data);
    } catch(error) {
      showError(error && error.message ? error.message : String(error));
    } finally {
      GENERATING = false;
    }
  };

  function buildFallbackPrintHtml(){
    if(!RESULT) return '';
    var chapters = Array.isArray(RESULT.chapters) ? RESULT.chapters : [];
    return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>자미두수 프리미엄 PDF</title><style>body{font-family:Malgun Gothic,serif;line-height:1.8;padding:28px;color:#241333}img{max-width:300px;border-radius:16px}h1{color:#3b0764}article{page-break-before:always;border-top:2px solid #7c3aed;padding-top:18px}.cat{border:1px solid #e9d5ff;border-radius:12px;padding:12px;margin:12px 0}p{white-space:pre-wrap}</style></head><body><h1>자미두수 프리미엄 PDF</h1><img src="' + esc(COVER_IMAGE) + '" alt="표지"><p>명궁과 12궁으로 읽는 운명의 별자리</p>' + chapters.map(function(chapter){
      var cats = Array.isArray(chapter.categories) ? chapter.categories : [];
      return '<article><h2>' + esc(chapter.title) + '</h2>' + cats.map(function(cat){ return '<div class="cat"><h3>' + esc(cat.title) + '</h3><p>' + esc(cat.finalText || cat.text || '') + '</p></div>'; }).join('') + '</article>';
    }).join('') + '</body></html>';
  }

  window.downloadZiweiBookPdf = function(){
    if(!RESULT){
      showError('먼저 자미두수 PDF를 생성해 주세요.');
      return;
    }
    var html = RESULT.pdfReady && RESULT.pdfReady.html ? RESULT.pdfReady.html : buildFallbackPrintHtml();
    var win = window.open('', '_blank', 'noopener,noreferrer');
    if(!win){
      showError('팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도해 주세요.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(function(){ try { win.focus(); win.print(); } catch(e) {} }, 450);
  };

  window.__ziweiBookState = function(){ return { result: RESULT, seed: LAST_SEED, generating: GENERATING }; };
})();
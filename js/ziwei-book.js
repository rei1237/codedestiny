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
    '제1장 명궁 완전 해석 — 나라는 사람의 첫 번째 별빛',
    '제2장 신궁 심층 분석 — 인생 후반부와 실제 행동 패턴',
    '제3장 복덕궁 — 마음의 깊이와 행복을 회복하는 방식',
    '제4장 부모궁·형제궁 — 뿌리, 가족, 성장 환경의 흔적',
    '제5장 부부궁 — 사랑, 결혼, 배우자 인연의 방향',
    '제6장 자녀궁·노복궁 — 후배, 동료, 사람을 얻는 방식',
    '제7장 재백궁 — 돈의 흐름과 재물 전략',
    '제8장 관록궁 — 직업, 성공 방식, 사회적 역할',
    '제9장 전택궁 — 집, 자산, 안정 기반',
    '제10장 질액궁 — 건강 리듬과 생활 관리',
    '제11장 천이궁 — 이동, 외부 기회, 귀인운',
    '제12장 사화와 별의 강약 — 운명을 움직이는 핵심 신호',
    '제13장 대운·세운 종합 전략 — 앞으로의 흐름과 실행 조언'
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
  function detachModalFromResultPage(modal){
    try {
      if (!modal || !modal.parentElement) return;
      if (typeof modal.closest === 'function' && modal.closest('#resultPage')) {
        document.body.appendChild(modal);
      }
    } catch (_) {}
  }
  function text(value){ return String(value == null ? '' : value).trim(); }
  function esc(value){
    return text(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function pad2(value){ return String(Number(value) || 0).padStart(2, '0'); }
  function setText(id, value){ var el = $(id); if(el) el.textContent = value; }
  function setDisplay(id, value){ var el = $(id); if(el) el.style.display = value; }

  function logFlow(tag, payload){
    try { console.info('[ZiweiBook][' + tag + ']', payload || {}); } catch(_) {}
  }

  function normalizeZiweiError(error){
    if(error instanceof Error){
      return { name: error.name, message: error.message, stack: error.stack };
    }
    if(typeof error === 'object' && error !== null){
      try { return JSON.parse(JSON.stringify(error)); }
      catch(_) { return { message: String(error) }; }
    }
    return { message: String(error) };
  }

  var EARTHLY_BRANCH_HOUR = {
    '자': 23, '축': 1, '인': 3, '묘': 5, '진': 7, '사': 9,
    '오': 11, '미': 13, '신': 15, '유': 17, '술': 19, '해': 21
  };

  function firstNonEmpty(){
    for(var i=0;i<arguments.length;i++){
      var v = text(arguments[i]);
      if(v) return v;
    }
    return '';
  }

  function normalizeGender(value){
    var raw = text(value).toLowerCase();
    if(raw === 'm' || raw === 'male' || raw === 'man' || raw === '남' || raw === '남성') return 'male';
    if(raw === 'f' || raw === 'female' || raw === 'woman' || raw === '여' || raw === '여성') return 'female';
    return 'unknown';
  }

  function normalizeCalendarType(value){
    var raw = text(value).toLowerCase();
    if(raw === 'solar' || raw === '양력' || raw === '양') return 'solar';
    if(raw === 'lunar' || raw === '음력' || raw === '음' || raw === 'lunar_leap' || raw === '윤달') return 'lunar';
    return 'unknown';
  }

  function isUnknownTime(value){
    var raw = text(value).toLowerCase();
    if(!raw) return false;
    return /모름|미상|unknown|없음|미기재|n\/a|na|not\s*known|모르/.test(raw);
  }

  function toFiniteInt(value){
    var n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : NaN;
  }

  function parseDateParts(value){
    var raw = text(value);
    if(!raw) return null;
    var m = raw.match(/^(\d{4})[-./\s](\d{1,2})[-./\s](\d{1,2})$/);
    if(!m) return null;
    var y = toFiniteInt(m[1]);
    var mo = toFiniteInt(m[2]);
    var d = toFiniteInt(m[3]);
    if(!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
    if(mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return { year: y, month: mo, day: d };
  }

  function parseBirthTime(value){
    var raw = text(value);
    if(!raw) return null;
    if(isUnknownTime(raw)) return { unknown: true };
    var branch = raw.match(/([자축인묘진사오미신유술해])\s*시/);
    if(branch && EARTHLY_BRANCH_HOUR.hasOwnProperty(branch[1])) return { hour: EARTHLY_BRANCH_HOUR[branch[1]], minute: 0 };
    var hm = raw.match(/^(\d{1,2})\s*[:시]\s*(\d{1,2})?/);
    if(hm){
      var hour = toFiniteInt(hm[1]);
      var minute = Number.isFinite(toFiniteInt(hm[2])) ? toFiniteInt(hm[2]) : 0;
      if(/오후|pm|PM/.test(raw) && hour < 12) hour += 12;
      if(/오전|am|AM/.test(raw) && hour === 12) hour = 0;
      if(hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return { hour: hour, minute: minute };
    }
    var ho = raw.match(/^(오전|오후|am|pm|AM|PM)?\s*(\d{1,2})\s*시?$/);
    if(ho){
      var hh = toFiniteInt(ho[2]);
      if(/오후|pm|PM/.test(ho[1] || '') && hh < 12) hh += 12;
      if(/오전|am|AM/.test(ho[1] || '') && hh === 12) hh = 0;
      if(hh >= 0 && hh <= 23) return { hour: hh, minute: 0 };
    }
    return null;
  }

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

  function snapshotFormProfile(){
    var birthDate = getField(['birthDate','birthdate','birthday','solarDate','lunarDate','date','birth_date']);
    var dateParts = parseDateParts(birthDate);
    var year = toFiniteInt(getField(['birthYear','year','yyyy']));
    var month = toFiniteInt(getField(['birthMonth','month','mm']));
    var day = toFiniteInt(getField(['birthDay','day','dd']));
    if(!Number.isFinite(year) && dateParts) year = dateParts.year;
    if(!Number.isFinite(month) && dateParts) month = dateParts.month;
    if(!Number.isFinite(day) && dateParts) day = dateParts.day;
    return {
      source: 'form',
      name: getField(['userName','name','birthName','profileName','nameInput']),
      gender: getField(['gender','sex','userGender','birthGender']),
      calendarType: getField(['calendarType','calendar','birthCalendarType']),
      birthDate: birthDate,
      year: year,
      month: month,
      day: day,
      birthTime: getField(['birthTime','birthtime','time','timeText','birth_time']),
      hour: toFiniteInt(getField(['birthHour','birth_hour','hour','hh'])),
      minute: toFiniteInt(getField(['birthMinute','minute','mi'])),
      timezone: 'Asia/Seoul',
      birthplace: getField(['birthplace','birthPlace'])
    };
  }

  function profileFromObject(obj, sourceName){
    var source = (obj && typeof obj === 'object') ? obj : {};
    var birth = (source.birth && typeof source.birth === 'object') ? source.birth : {};
    var birthDateRaw = firstNonEmpty(source.birthDate, source.birthday, source.solarDate, source.lunarDate, source.date, birth.birthDate, birth.solarDate, birth.lunarDate, birth.date);
    var dateParts = parseDateParts(birthDateRaw);
    var year = Number.isFinite(toFiniteInt(source.year)) ? toFiniteInt(source.year) : (Number.isFinite(toFiniteInt(birth.year)) ? toFiniteInt(birth.year) : (dateParts ? dateParts.year : NaN));
    var month = Number.isFinite(toFiniteInt(source.month)) ? toFiniteInt(source.month) : (Number.isFinite(toFiniteInt(birth.month)) ? toFiniteInt(birth.month) : (dateParts ? dateParts.month : NaN));
    var day = Number.isFinite(toFiniteInt(source.day)) ? toFiniteInt(source.day) : (Number.isFinite(toFiniteInt(birth.day)) ? toFiniteInt(birth.day) : (dateParts ? dateParts.day : NaN));
    return {
      source: sourceName,
      name: firstNonEmpty(source.name, source.profileName),
      gender: firstNonEmpty(source.gender, source.sex, birth.gender, birth.sex, window.GENDER),
      calendarType: firstNonEmpty(source.calendarType, source.calendar, source.calType, birth.calType, birth.calendarType),
      birthDate: birthDateRaw,
      year: year,
      month: month,
      day: day,
      birthTime: firstNonEmpty(source.birthTime, source.time, source.timeText, source.hourText, birth.birthTime, birth.time),
      hour: Number.isFinite(toFiniteInt(source.birthHour)) ? toFiniteInt(source.birthHour) : (Number.isFinite(toFiniteInt(source.birth_hour)) ? toFiniteInt(source.birth_hour) : (Number.isFinite(toFiniteInt(source.hour)) ? toFiniteInt(source.hour) : toFiniteInt(birth.hour))),
      minute: Number.isFinite(toFiniteInt(source.birthMinute)) ? toFiniteInt(source.birthMinute) : (Number.isFinite(toFiniteInt(source.minute)) ? toFiniteInt(source.minute) : toFiniteInt(birth.minute)),
      timezone: firstNonEmpty(source.timezone, birth.timezone, 'Asia/Seoul'),
      birthplace: firstNonEmpty(source.birthplace, source.birthPlace, birth.birthplace, birth.birthPlace)
    };
  }

  function readStorageProfile(){
    try {
      var ns = 'FORTUNE_APP_USER_PROFILES';
      var list = JSON.parse(localStorage.getItem(ns + '.list') || '[]');
      var currentId = localStorage.getItem(ns + '.current');
      var selected = (currentId && list.find(function(p){ return p && (p.id === currentId || p.profileId === currentId); })) || list[0] || null;
      if(selected) return profileFromObject(selected, 'storageProfile');
    } catch(_) {}
    try {
      var pre = JSON.parse(localStorage.getItem('premium:ziwei:session:v1') || 'null');
      if(pre && pre.birthProfile) return profileFromObject(pre.birthProfile, 'storageSession');
    } catch(_) {}
    return null;
  }

  async function readApiProfile(){
    try {
      var res = await fetch('/api/profile', { method: 'GET', credentials: 'include' });
      if(!res.ok) return null;
      var data = await res.json().catch(function(){ return {}; });
      var profiles = Array.isArray(data && data.profiles) ? data.profiles : [];
      var currentId = text(data && data.currentId);
      var selected = (currentId && profiles.find(function(p){ return p && (p.id === currentId || p.profileId === currentId); })) || profiles[0] || null;
      if(!selected) return null;
      return profileFromObject(selected, 'profileApi');
    } catch(_) {
      return null;
    }
  }

  function mergeProfilesByPriority(sources){
    var merged = {
      name: '사용자', gender: 'unknown', calendarType: 'unknown', birthDate: '', year: NaN, month: NaN, day: NaN,
      birthTime: '', hour: NaN, minute: NaN, timezone: 'Asia/Seoul', birthplace: '대한민국', pickedFrom: []
    };
    function pickString(key){
      for(var i=0;i<sources.length;i++){
        var v = text(sources[i] && sources[i][key]);
        if(v){ merged.pickedFrom.push(key + ':' + (sources[i].source || ('s'+i))); return v; }
      }
      return '';
    }
    function pickNumber(key){
      for(var i=0;i<sources.length;i++){
        var n = toFiniteInt(sources[i] && sources[i][key]);
        if(Number.isFinite(n)){ merged.pickedFrom.push(key + ':' + (sources[i].source || ('s'+i))); return n; }
      }
      return NaN;
    }
    merged.name = pickString('name') || '사용자';
    merged.gender = pickString('gender') || 'unknown';
    merged.calendarType = pickString('calendarType') || 'unknown';
    merged.birthDate = pickString('birthDate');
    merged.year = pickNumber('year');
    merged.month = pickNumber('month');
    merged.day = pickNumber('day');
    merged.birthTime = pickString('birthTime');
    merged.hour = pickNumber('hour');
    merged.minute = pickNumber('minute');
    merged.timezone = pickString('timezone') || 'Asia/Seoul';
    merged.birthplace = pickString('birthplace') || '대한민국';
    if((!Number.isFinite(merged.year) || !Number.isFinite(merged.month) || !Number.isFinite(merged.day)) && merged.birthDate){
      var d = parseDateParts(merged.birthDate);
      if(d){
        if(!Number.isFinite(merged.year)) merged.year = d.year;
        if(!Number.isFinite(merged.month)) merged.month = d.month;
        if(!Number.isFinite(merged.day)) merged.day = d.day;
      }
    }
    return merged;
  }

  function normalizeBirthInput(merged){
    var parsedTime = parseBirthTime(merged.birthTime);
    var hour = Number.isFinite(merged.hour) ? merged.hour : (parsedTime && !parsedTime.unknown ? parsedTime.hour : NaN);
    var minute = Number.isFinite(merged.minute) ? merged.minute : (parsedTime && !parsedTime.unknown ? parsedTime.minute : 0);
    var isTimeUnknown = Boolean(isUnknownTime(merged.birthTime) || (parsedTime && parsedTime.unknown));
    var birthDate = Number.isFinite(merged.year) && Number.isFinite(merged.month) && Number.isFinite(merged.day)
      ? merged.year + '-' + pad2(merged.month) + '-' + pad2(merged.day)
      : text(merged.birthDate);
    return {
      name: text(merged.name),
      gender: normalizeGender(merged.gender),
      calendarType: normalizeCalendarType(merged.calendarType),
      birthDate: birthDate,
      birthYear: Number.isFinite(merged.year) ? merged.year : NaN,
      birthMonth: Number.isFinite(merged.month) ? merged.month : NaN,
      birthDay: Number.isFinite(merged.day) ? merged.day : NaN,
      birthTime: Number.isFinite(hour) ? (pad2(hour) + ':' + pad2(minute)) : text(merged.birthTime),
      birthHour: Number.isFinite(hour) ? hour : null,
      birthMinute: Number.isFinite(minute) ? minute : 0,
      timezone: text(merged.timezone) || 'Asia/Seoul',
      isTimeUnknown: isTimeUnknown
    };
  }

  function validateBirthInputOrThrow(input){
    if(!Number.isFinite(input.birthYear) || !Number.isFinite(input.birthMonth) || !Number.isFinite(input.birthDay)){
      throw new Error('자미두수 프리미엄 PDF 생성을 위해 프로필 카드의 생년월일을 확인해 주세요.');
    }
    if(input.isTimeUnknown || !Number.isFinite(input.birthHour)){
      throw new Error('자미두수 PDF는 명궁과 12궁 계산을 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 먼저 입력해주세요.');
    }
    if(input.birthHour < 0 || input.birthHour > 23 || input.birthMinute < 0 || input.birthMinute > 59){
      throw new Error('출생 시간 형식을 확인해 주세요. 예: 07:00, 오전 7시, 인시');
    }
  }

  async function resolveBirthInput(){
    var formProfile = snapshotFormProfile();
    var activeProfile = profileFromObject(window.__cdActiveBirthProfile || window._cdCurrentProfile || window.currentProfile || window._currentProfile || {}, 'activeProfile');
    var apiProfile = await readApiProfile();
    var storageProfile = readStorageProfile();
    var merged = mergeProfilesByPriority([activeProfile, apiProfile || {}, storageProfile || {}, formProfile]);
    var birthInput = normalizeBirthInput(merged);
    var profileForEngine = {
      name: birthInput.name || '사용자',
      gender: birthInput.gender,
      year: birthInput.birthYear,
      month: birthInput.birthMonth,
      day: birthInput.birthDay,
      hour: birthInput.birthHour,
      minute: birthInput.birthMinute,
      birthDate: birthInput.birthDate,
      birthTime: birthInput.birthTime,
      calendarType: birthInput.calendarType,
      timezone: birthInput.timezone,
      birthplace: merged.birthplace || '대한민국'
    };
    return { birthInput: birthInput, profileForEngine: profileForEngine, merged: merged };
  }

  function normalizeStrengthName(value){
    var raw = text(value);
    if(/묘|廟|◎/.test(raw)) return '묘';
    if(/왕|旺|득|得|○|O/.test(raw)) return '득';
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
    var genderForEngine = profile.gender === 'male' ? 'M' : (profile.gender === 'female' ? 'F' : 'OTHER');
    window._ziweiBirth = {
      year: profile.year,
      month: profile.month,
      day: profile.day,
      hour: profile.hour,
      minute: profile.minute,
      gender: genderForEngine
    };
    if(genderForEngine) window.GENDER = genderForEngine;
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

  async function postPrepare(profile, seed, payment, birthInput){
    var token = (payment && (payment.premiumAccessToken || payment.accessToken)) || getPremiumToken();
    var headers = { 'Content-Type': 'application/json' };
    if(token) headers['x-premium-access-token'] = token;
    var body = {
      featureKey: FEATURE_KEY,
      reportType: 'ziweiPremium',
      premiumAccessToken: token || '',
      paymentContext: payment || {},
      birthProfile: profile,
      birthInput: birthInput,
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
    detachModalFromResultPage(modal);

    var profile = profileFromObject(window.__cdActiveBirthProfile || window._cdCurrentProfile || window.currentProfile || window._currentProfile || {}, 'activeProfile');
    if (!profile || !profile.year || !profile.month) {
      try {
        var _dpNs = 'FORTUNE_APP_USER_PROFILES';
        var _dpList = JSON.parse(localStorage.getItem(_dpNs + '.list') || '[]');
        var _dpCurrId = localStorage.getItem(_dpNs + '.current');
        var _dpMatch = (_dpCurrId && _dpList.find(function(p){return p.id===_dpCurrId;})) || (_dpList.length && _dpList[0]) || null;
        if (_dpMatch && _dpMatch.birth && _dpMatch.birth.year) {
          window.__cdActiveBirthProfile = _dpMatch;
          profile = profileFromObject(_dpMatch, 'activeProfile');
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
    logFlow('ModalOpen', {
      hasProfile: Boolean(profile && profile.year && profile.month),
      hasBirthDate: Boolean(profile && profile.birthDate),
      hasBirthTime: Boolean(profile && profile.birthTime)
    });

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
      updateProgress(8, '프로필 정보 확인 중');
      markChapter(-1);
      var resolved = await resolveBirthInput();
      logFlow('ProfileResolved', {
        hasBirthDate: Boolean(resolved.birthInput.birthDate),
        hasBirthTime: Boolean(resolved.birthInput.birthTime),
        birthHour: resolved.birthInput.birthHour,
        pickedCount: Array.isArray(resolved.merged.pickedFrom) ? resolved.merged.pickedFrom.length : 0
      });
      logFlow('BirthInputNormalized', {
        gender: resolved.birthInput.gender,
        calendarType: resolved.birthInput.calendarType,
        birthHour: resolved.birthInput.birthHour,
        isTimeUnknown: resolved.birthInput.isTimeUnknown
      });
      validateBirthInputOrThrow(resolved.birthInput);
      logFlow('ValidationBeforePayment', {
        hasBirthDate: true,
        hasBirthTime: true,
        birthHour: resolved.birthInput.birthHour
      });
      updateProgress(18, '자미두수 명반 계산 중');
      var profile = resolved.profileForEngine;
      var seed = await buildZiweiSeed(profile);
      updateProgress(35, '13챕터 로컬 원고 생성 중');
      logFlow('PaymentGateStart', { featureKey: FEATURE_KEY, coinCost: COIN_COST });
      updateProgress(46, '결제/코인 접근 확인 중');
      var payment = await ensurePayment();
      logFlow('PaymentGateSuccess', {
        hasPaymentToken: Boolean(payment && (payment.premiumAccessToken || payment.accessToken || payment.token))
      });
      updateProgress(58, '13챕터 로컬 원고 생성 중');
      logFlow('SessionCreateStart', { endpoint: PREPARE_API, hasPaymentToken: Boolean(payment && (payment.premiumAccessToken || payment.accessToken)) });
      logFlow('PdfRequestStart', { endpoint: PREPARE_API, chapterTarget: TOTAL_CHAPTERS });
      var data = await postPrepare(profile, seed, payment, resolved.birthInput);
      logFlow('SessionCreateSuccess', {
        chapterCount: Array.isArray(data && data.chapters) ? data.chapters.length : 0,
        fallbackUsed: Boolean(data && data.fallbackUsed)
      });
      var localDraftCount = Number((data && data.localDraftChapterCount) || 0);
      var chapterProgressCount = Math.max(0, Math.min(TOTAL_CHAPTERS, localDraftCount || Number((data && data.chapterCount) || 0)));
      for(var i=0; i<chapterProgressCount; i++){
        markChapter(i);
        updateProgress(62 + Math.round(((i + 1) / TOTAL_CHAPTERS) * 16), CHAPTERS[i] || '챕터를 완성하고 있습니다.');
        logFlow('LocalDraftProgress', { chapterDone: i + 1, chapterTotal: TOTAL_CHAPTERS });
      }
      updateProgress(82, 'AI 상담문 보강 중');
      updateProgress(95, 'PDF 편집/렌더링 중');
      RESULT = data;
      if(data && data.fallbackUsed && window.showToast){
        window.showToast('AI 문장 보강이 지연되어 로컬 자미두수 명반 기반 프리미엄 원고로 PDF를 완성합니다.', 'info');
      }
      logFlow('PdfRequestSuccess', {
        chapterCount: Array.isArray(data && data.chapters) ? data.chapters.length : 0,
        localDraftChapterCount: localDraftCount,
        fallbackUsed: Boolean(data && data.fallbackUsed)
      });
      updateProgress(100, '완료');
      renderResult(data);
    } catch(error) {
      var normalizedError = normalizeZiweiError(error);
      logFlow('Error', normalizedError);
      showError(normalizedError && normalizedError.message ? normalizedError.message : String(error));
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
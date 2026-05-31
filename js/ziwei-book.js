(function(){
  'use strict';

  var TOTAL_CHAPTERS = 13;
  var FEATURE_KEY = 'premium_pdf_ziwei';
  var COIN_COST = 590;
  var PREPARE_API = '/api/ziwei-book/prepare';
  var RESULT_API = '/api/ziwei-book/result';
  var PAID_SESSION_STORAGE_KEY = 'premium:ziwei:paid-session:v1';
  var COVER_IMAGE = '/fuctionassets/jamipremiun.webp';
  var RESULT = null;
  var GENERATING = false;
  var LAST_SEED = null;
  var ZIWEI_GENERATION_STATE = {
    isOpen: false,
    status: 'idle',
    currentChapterNo: 1,
    totalChapters: TOTAL_CHAPTERS,
    completedChapters: [],
    failedChapters: [],
    sessionId: null,
    reportId: null,
    message: ''
  };

  var CHAPTERS = [
    'Chapter 1. 명반 전체 요약 — 이 사람의 운명 구조',
    'Chapter 2. 명궁 — 타고난 성격과 삶의 태도',
    'Chapter 3. 형제궁·노복궁 — 가까운 사람과 인맥의 운',
    'Chapter 4. 부부궁 — 연애와 결혼의 구조',
    'Chapter 5. 자녀궁 — 창작물, 후배, 결과물의 운',
    'Chapter 6. 재백궁 — 돈과 수익 구조',
    'Chapter 7. 관록궁 — 직업, 성공, 사회적 역할',
    'Chapter 8. 천이궁 — 외부 활동, 이동, 세상과의 접점',
    'Chapter 9. 전택궁 — 집, 기반, 자산, 안정성',
    'Chapter 10. 질액궁·복덕궁 — 건강, 마음, 회복력',
    'Chapter 11. 부모궁 — 부모, 윗사람, 권위자와의 관계',
    'Chapter 12. 대운·세운 — 시기별 인생 흐름',
    'Chapter 13. 최종 운명 전략 — 이 명반을 가장 잘 쓰는 법'
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

  var REQUIRED_PALACE_ORDER = [
    'ming', 'siblings', 'spouse', 'children', 'wealth', 'health',
    'travel', 'friends', 'career', 'property', 'fortune', 'parents'
  ];

  var PALACE_NAME_BY_KEY = {
    ming: '명궁',
    siblings: '형제궁',
    spouse: '부부궁',
    children: '자녀궁',
    wealth: '재백궁',
    health: '질액궁',
    travel: '천이궁',
    friends: '노복궁',
    career: '관록궁',
    property: '전택궁',
    fortune: '복덕궁',
    parents: '부모궁'
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

  function toHexHash(input){
    var src = text(input);
    var hash = 2166136261;
    for(var i = 0; i < src.length; i++){
      hash ^= src.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16);
  }

  function makeBirthHash(birthInput){
    var safe = birthInput || {};
    var token = [
      text(safe.birthDate),
      pad2(safe.birthHour),
      pad2(safe.birthMinute),
      text(safe.gender).toLowerCase(),
      text(safe.calendarType).toLowerCase()
    ].join('|');
    return 'bh-' + toHexHash(token);
  }

  function readPaidSession(){
    try {
      var raw = localStorage.getItem(PAID_SESSION_STORAGE_KEY) || sessionStorage.getItem(PAID_SESSION_STORAGE_KEY) || '';
      if(!raw) return null;
      var parsed = JSON.parse(raw);
      if(!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch(_) {
      return null;
    }
  }

  function writePaidSession(patch){
    var current = readPaidSession() || {};
    var next = Object.assign({}, current, patch || {});
    try {
      localStorage.setItem(PAID_SESSION_STORAGE_KEY, JSON.stringify(next));
      sessionStorage.setItem(PAID_SESSION_STORAGE_KEY, JSON.stringify(next));
    } catch(_) {}
    return next;
  }

  function clearPaidSession(){
    try {
      localStorage.removeItem(PAID_SESSION_STORAGE_KEY);
      sessionStorage.removeItem(PAID_SESSION_STORAGE_KEY);
    } catch(_) {}
  }

  function isReusablePaidStatus(status){
    var s = text(status);
    return s === 'paid' || s === 'generating' || s === 'failed_retryable';
  }

  function isSamePaidSessionTarget(session, birthHash){
    var saved = session || {};
    return text(saved.featureKey) === FEATURE_KEY
      && text(saved.reportType) === 'ziweiPremium'
      && text(saved.birthHash) === text(birthHash)
      && isReusablePaidStatus(saved.status)
      && Boolean(text(saved.premiumAccessToken));
  }

  async function verifyPaidSessionAccess(saved){
    var token = text(saved && saved.premiumAccessToken);
    if(!token) return false;
    try {
      var res = await fetch('/api/billing/unlock-status?featureKey=' + encodeURIComponent(FEATURE_KEY), {
        method: 'GET',
        credentials: 'include',
        headers: { 'x-premium-access-token': token }
      });
      if(!res.ok) return false;
      var json = await res.json().catch(function(){ return {}; });
      var data = json && json.data && typeof json.data === 'object' ? json.data : json;
      return Boolean(data && (data.canAccess || data.unlocked));
    } catch(_) {
      return false;
    }
  }

  function buildSessionId(birthHash){
    return 'ziwei-premium:' + text(birthHash || 'unknown') + ':' + Date.now().toString(36);
  }

  function updateZiweiGenerationState(patch){
    ZIWEI_GENERATION_STATE = Object.assign({}, ZIWEI_GENERATION_STATE, patch || {});
    try { window.__ziweiPdfGenerationState = ZIWEI_GENERATION_STATE; } catch (_) {}
  }

  function resetZiweiGenerationState(){
    updateZiweiGenerationState({
      isOpen: true,
      status: 'preparing',
      currentChapterNo: 1,
      totalChapters: TOTAL_CHAPTERS,
      completedChapters: [],
      failedChapters: [],
      sessionId: null,
      reportId: null,
      message: ''
    });
  }

  function getZiweiReportReadiness(data){
    var payload = data || {};
    var chapters = Array.isArray(payload.chapters) ? payload.chapters : [];
    var hasSessionId = Boolean(text(payload.sessionId));
    var hasReportId = Boolean(text(payload.reportId));
    var hasPdfHtml = Boolean(text(payload && payload.pdfReady && payload.pdfReady.html));
    var ok = payload.ok === true;
    var processing = text(payload.status) === 'processing' || text(payload.serverStatus) === 'processing';
    var successCandidate = ok && (hasReportId || hasSessionId);
    return {
      ok: ok,
      processing: processing,
      successCandidate: successCandidate,
      completed: successCandidate && hasPdfHtml && chapters.length >= TOTAL_CHAPTERS,
      hasPdfHtml: hasPdfHtml,
      chapterCount: chapters.length,
      hasReportId: hasReportId,
      hasSessionId: hasSessionId
    };
  }

  function isZiweiReportReady(data){
    return getZiweiReportReadiness(data).completed;
  }

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
    updateZiweiGenerationState({ message: text(label || ''), totalChapters: TOTAL_CHAPTERS });
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
    var safeIndex = Math.max(-1, Math.min(TOTAL_CHAPTERS - 1, Number(index) || -1));
    var completed = [];
    for(var c = 1; c <= safeIndex + 1; c++) completed.push(c);
    updateZiweiGenerationState({
      currentChapterNo: Math.max(1, safeIndex + 1),
      completedChapters: completed
    });
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

  function normalizePalaceName(name){
    var raw = text(name);
    if(raw === '부처궁') return '부부궁';
    return raw;
  }

  function summarizeStrength(stars){
    var rows = Array.isArray(stars) ? stars : [];
    var tally = { '◎': 0, 'O': 0, '▲': 0, '△': 0, 'X': 0 };
    for(var i = 0; i < rows.length; i++){
      var symbol = text(rows[i] && rows[i].strengthSymbol);
      if(symbol === '○') symbol = 'O';
      if(tally.hasOwnProperty(symbol)) tally[symbol] += 1;
    }
    return {
      miao: tally['◎'],
      de: tally['O'],
      li: tally['▲'],
      ping: tally['△'],
      xian: tally['X'],
      legend: '◎ O ▲ △ X'
    };
  }

  function fillMissingPalaces(palaces){
    var source = Array.isArray(palaces) ? palaces.slice() : [];
    var byKey = {};
    for(var i = 0; i < source.length; i++){
      var key = text(source[i] && source[i].key);
      if(key && !byKey[key]) byKey[key] = source[i];
    }
    var finalPalaces = [];
    for(var idx = 0; idx < REQUIRED_PALACE_ORDER.length; idx++){
      var reqKey = REQUIRED_PALACE_ORDER[idx];
      var item = byKey[reqKey] || null;
      if(!item){
        item = {
          key: reqKey,
          nameKo: PALACE_NAME_BY_KEY[reqKey],
          branch: '',
          index: idx,
          mainStars: [],
          auxStars: [],
          maleficStars: [],
          transformations: []
        };
      }
      var allStars = [].concat(item.mainStars || [], item.auxStars || [], item.maleficStars || []);
      item.strengthSummary = summarizeStrength(allStars);
      finalPalaces.push(item);
    }
    return finalPalaces;
  }

  function normalizePalaces(chart){
    var source = [];
    if(Array.isArray(chart && chart.palaces)) source = chart.palaces;
    else if(Array.isArray(chart && chart.palaceStarData)) source = chart.palaceStarData;
    else if(chart && chart.palacesByIndex){
      source = Object.keys(chart.palacesByIndex).map(function(key){ return chart.palacesByIndex[key]; });
    }
    var mapped = source.map(function(p, index){
      var name = normalizePalaceName(p.nameKo || p.name || p.palace || p.gung || p.palaceName);
      var key = text(p.key || p.id || PALACE_KEY_BY_NAME[name]);
      var mainStars = normalizeStars(p.mainStars || p.stars || p.main || []);
      var auxStars = normalizeStars(p.auxStars || p.auxiliaryStars || p.aux || []);
      var maleficStars = normalizeStars(p.maleficStars || p.badStars || p.bad || []);
      var allStars = [].concat(mainStars, auxStars, maleficStars);
      return {
        key: key,
        nameKo: name,
        branch: text(p.branch || p.zhi || p.earthlyBranch),
        index: index,
        mainStars: mainStars,
        auxStars: auxStars,
        maleficStars: maleficStars,
        transformations: Array.isArray(p.transformations) ? p.transformations : [],
        strengthSummary: summarizeStrength(allStars)
      };
    });
    return fillMissingPalaces(mapped);
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
    logFlow('SeedValidated', {
      birthHash: toHexHash([profile.year, profile.month, profile.day, profile.hour, profile.minute, profile.gender].join('|')),
      palaceCount: palaces.length,
      hasToken: Boolean(getPremiumToken())
    });
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

  async function ensurePaymentOrRestore(birthInput){
    var birthHash = makeBirthHash(birthInput || {});
    var saved = readPaidSession();
    if(isSamePaidSessionTarget(saved, birthHash)){
      var verified = await verifyPaidSessionAccess(saved);
      logFlow('PaymentReuse', {
        birthHash: birthHash,
        hasToken: Boolean(text(saved && saved.premiumAccessToken)),
        palaceCount: Number((LAST_SEED && LAST_SEED.diagnostics && LAST_SEED.diagnostics.palaceCount) || 0),
        verified: verified
      });
      return Object.assign({}, saved, {
        ok: true,
        reused: true,
        verified: verified,
        sessionId: text(saved.sessionId) || buildSessionId(birthHash),
        premiumAccessToken: text(saved.premiumAccessToken) || getPremiumToken(),
        birthHash: birthHash
      });
    }

    if(typeof window._cdCoinGatePerUse !== 'function'){
      var existingToken = getPremiumToken();
      if(existingToken){
        var fallback = writePaidSession({
          featureKey: FEATURE_KEY,
          reportType: 'ziweiPremium',
          sessionId: buildSessionId(birthHash),
          premiumAccessToken: existingToken,
          transactionId: '',
          paidAt: new Date().toISOString(),
          birthHash: birthHash,
          status: 'paid'
        });
        logFlow('PaymentReuse', { birthHash: birthHash, hasToken: true, palaceCount: Number((LAST_SEED && LAST_SEED.diagnostics && LAST_SEED.diagnostics.palaceCount) || 0) });
        return Object.assign({ ok: true, reused: true }, fallback);
      }
      throw new Error('결제 권한을 확인할 수 없습니다. 로그인 상태와 결제 수단을 확인해 주세요.');
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
        var token = text(result && (result.premiumAccessToken || result.accessToken || result.token)) || getPremiumToken();
        if(token) storePremiumToken(token);
        var sessionId = text(result && (result.sessionId || result.reportSessionId)) || buildSessionId(birthHash);
        var transactionId = text(result && (result.transactionId || (result.paymentContext && result.paymentContext.transactionId)));
        var savedSession = writePaidSession({
          featureKey: FEATURE_KEY,
          reportType: 'ziweiPremium',
          sessionId: sessionId,
          premiumAccessToken: token,
          transactionId: transactionId,
          paidAt: new Date().toISOString(),
          birthHash: birthHash,
          status: 'paid'
        });
        logFlow('PaymentCreated', {
          birthHash: birthHash,
          hasToken: Boolean(token),
          palaceCount: Number((LAST_SEED && LAST_SEED.diagnostics && LAST_SEED.diagnostics.palaceCount) || 0)
        });
        resolve(Object.assign({}, savedSession, result || {}, {
          ok: true,
          premiumAccessToken: token,
          sessionId: sessionId,
          birthHash: birthHash
        }));
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

  function buildRetryableError(message, status, code, kind){
    var error = new Error(message || '자미두수 PDF 생성 요청에 실패했습니다.');
    error.status = Number(status || 500);
    error.code = text(code || 'ZIWEI_PREPARE_FAILED') || 'ZIWEI_PREPARE_FAILED';
    error.kind = text(kind || 'generation') || 'generation';
    return error;
  }

  async function fetchZiweiResult(sessionId, reportId){
    var query = [];
    if(text(sessionId)) query.push('sessionId=' + encodeURIComponent(text(sessionId)));
    if(text(reportId)) query.push('reportId=' + encodeURIComponent(text(reportId)));
    if(!query.length) return null;
    var url = RESULT_API + '?' + query.join('&');
    var res = await fetch(url, { method: 'GET', credentials: 'include' });
    var json = await res.json().catch(function(){ return {}; });
    if(!res.ok) return null;
    if(!json || json.ok !== true) return null;
    return json;
  }

  function ensureChapterFallback(chapters){
    var base = Array.isArray(chapters) ? chapters.slice(0, TOTAL_CHAPTERS) : [];
    var fallbackTitles = ['핵심 별자리 신호', '궁 연결 해석', '시기별 실행 전략', '관계/일/재정 실전 조언'];
    for(var i = base.length; i < TOTAL_CHAPTERS; i++){
      base.push({
        title: CHAPTERS[i] || ('Chapter ' + (i + 1)),
        categories: fallbackTitles.map(function(title){
          return { title: title, finalText: '현재 생성 중인 리포트입니다. 잠시 후 재조회하면 완성본이 반영됩니다.' };
        })
      });
    }
    return base;
  }

  async function recoverPendingResult(data, payment){
    var initial = data || {};
    var baseSession = text(initial.sessionId) || text(payment && payment.sessionId);
    var baseReport = text(initial.reportId) || text(payment && payment.reportId);
    var readiness = getZiweiReportReadiness(initial);
    if(readiness.completed){
      return initial;
    }
    for(var attempt = 0; attempt < 3; attempt++){
      var recovered = await fetchZiweiResult(baseSession, baseReport);
      if(recovered){
        var recoveredReadiness = getZiweiReportReadiness(recovered);
        logFlow('ReportRecovered', {
          birthHash: text(payment && payment.birthHash),
          chapterCount: Number(recoveredReadiness.chapterCount || 0),
          hasToken: Boolean(text(payment && payment.premiumAccessToken))
        });
        if(recoveredReadiness.completed) return recovered;
        if(recoveredReadiness.processing) return Object.assign({}, recovered, { status: 'processing' });
      }
      await new Promise(function(resolve){ setTimeout(resolve, 850); });
    }
    if(readiness.successCandidate){
      return Object.assign({}, initial, {
        status: 'processing',
        chapters: ensureChapterFallback(initial.chapters)
      });
    }
    return initial;
  }

  async function postPrepare(profile, seed, payment, birthInput){
    var token = (payment && (payment.premiumAccessToken || payment.accessToken)) || getPremiumToken();
    var sessionId = text(payment && payment.sessionId) || buildSessionId(text(payment && payment.birthHash));
    var birthHash = text(payment && payment.birthHash) || makeBirthHash(birthInput || {});
    var headers = { 'Content-Type': 'application/json' };
    if(token) headers['x-premium-access-token'] = token;
    var body = {
      featureKey: FEATURE_KEY,
      reportType: 'ziweiPremium',
      sessionId: sessionId || undefined,
      reportSessionId: sessionId || undefined,
      idempotencyKey: 'ziwei:' + sessionId + ':' + birthHash,
      birthHash: birthHash,
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
    logFlow('PrepareRequest', {
      birthHash: birthHash,
      chapterCount: 0,
      hasToken: Boolean(token)
    });
    var res = await fetch(PREPARE_API, { method: 'POST', credentials: 'include', headers: headers, body: JSON.stringify(body) });
    var json = await res.json().catch(function(){ return {}; });
    if(!res.ok || !json.ok){
      var code = text(json.code || json.error || 'ZIWEI_PREPARE_FAILED');
      var message = text(json.message || json.error || ('자미두수 PDF 생성 요청에 실패했습니다. HTTP ' + res.status));
      if(res.status === 401 || res.status === 402 || res.status === 403){
        throw buildRetryableError(message, res.status, code, 'payment');
      }
      if(res.status === 422 || res.status >= 500){
        throw buildRetryableError(message, res.status, code, 'generation');
      }
      throw buildRetryableError(message, res.status, code, 'request');
    }
    if(json.premiumAccessToken || json.accessToken) storePremiumToken(json.premiumAccessToken || json.accessToken);
    return json;
  }

  function renderResult(data){
    var box = $('zbResultContent');
    if(!box) return;
    var chapters = Array.isArray(data.chapters) ? data.chapters : [];
    var cover = '<div class="zb-result-cover"><img src="' + esc(COVER_IMAGE) + '" alt="자미두수 프리미엄 명반서 표지"><div><p>ZIWEI PREMIUM</p><h3>자미두수 프리미엄 명반서</h3><span>' + esc(chapters.length) + '챕터 생성 완료</span></div></div>';
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
    ensureErrorActions();
  }

  async function reopenPreviousReport(){
    var saved = readPaidSession();
    if(!saved || !text(saved.reportId)){
      showError('재열람 가능한 이전 리포트가 없습니다.');
      return;
    }
    var recovered = await fetchZiweiResult(text(saved.sessionId), text(saved.reportId));
    if(!recovered){
      showError('이전 리포트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    RESULT = recovered;
    renderResult(recovered);
    logFlow('ReportRecovered', {
      birthHash: text(saved.birthHash),
      chapterCount: Number((Array.isArray(recovered.chapters) ? recovered.chapters.length : 0) || 0),
      hasToken: Boolean(text(saved.premiumAccessToken))
    });
  }

  function ensureErrorActions(){
    var screen = $('zbErrorScreen');
    if(!screen) return;
    var actions = screen.querySelector('.lb-error__actions');
    if(!actions) return;
    var retryBtn = actions.querySelector('.lb-error__retry');
    if(retryBtn){
      retryBtn.textContent = '결제 내역으로 다시 생성';
      retryBtn.setAttribute('onclick', 'generateZiweiBook(true)');
    }

    var previousBtn = $('zbOpenPreviousBtn');
    if(!previousBtn){
      previousBtn = document.createElement('button');
      previousBtn.id = 'zbOpenPreviousBtn';
      previousBtn.className = 'lb-error__retry';
      previousBtn.style.marginLeft = '8px';
      previousBtn.textContent = '이전 PDF 열기';
      previousBtn.onclick = function(){ reopenPreviousReport(); };
      actions.insertBefore(previousBtn, actions.firstChild);
    }
    var paid = readPaidSession();
    previousBtn.style.display = paid && text(paid.reportId) ? 'inline-flex' : 'none';
  }

  function mapErrorMessage(error){
    var status = Number(error && error.status || 0);
    var kind = text(error && error.kind);
    if(kind === 'payment' || status === 401 || status === 402 || status === 403){
      return '결제 또는 이용권 확인이 필요합니다. 로그인 상태와 결제 내역을 확인해 주세요.';
    }
    if(status === 422){
      return '명반 계산 또는 입력값 검증 단계에서 오류가 발생했습니다. 프로필 정보를 확인한 뒤 다시 시도해 주세요.';
    }
    if(status >= 500){
      return '결제는 확인되었습니다. 생성 재시도를 진행합니다.';
    }
    return text(error && error.message) || '생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  }

  function showError(message, error){
    setDisplay('zbLoadingScreen','none');
    setDisplay('zbStartScreen','none');
    setDisplay('zbErrorScreen','block');
    var msg = message || mapErrorMessage(error || {});
    setText('zbErrorMsg', msg);
    ensureErrorActions();
    updateZiweiGenerationState({
      status: 'failed',
      failedChapters: ZIWEI_GENERATION_STATE.failedChapters.concat([Math.max(1, Number(ZIWEI_GENERATION_STATE.currentChapterNo || 1))]),
      message: msg
    });
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
    updateZiweiGenerationState({ isOpen: true, totalChapters: TOTAL_CHAPTERS });
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
    ensureErrorActions();

    var paid = readPaidSession();
    if(paid && text(paid.reportId)){
      var openPrev = $('zbOpenPreviousBtn');
      if(openPrev) openPrev.style.display = 'inline-flex';
    }
  };

  window.closeZiweiBookModal = function(){
    var modal = $('ziweiBookModal');
    if(modal){
      modal.classList.remove('active');
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
    updateZiweiGenerationState({ isOpen: false, status: GENERATING ? 'generating' : ZIWEI_GENERATION_STATE.status });
  };

  window.gotoZiweiPremium = function(){
    window.openZiweiBookModal();
  };

  window.generateZiweiBook = async function(usePaidSessionOnly){
    if(GENERATING) return;
    GENERATING = true;
    RESULT = null;
    resetZiweiGenerationState();
    try {
      setDisplay('zbStartScreen','none');
      setDisplay('zbResultScreen','none');
      setDisplay('zbErrorScreen','none');
      setDisplay('zbLoadingScreen','block');
      updateProgress(8, '1/9 생년월일시 확인 중');
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
      updateZiweiGenerationState({ status: 'birthInputValidated' });
      logFlow('ValidationBeforePayment', {
        hasBirthDate: true,
        hasBirthTime: true,
        birthHour: resolved.birthInput.birthHour
      });
      updateProgress(18, '2/9 자미두수 명반 계산 중');
      updateZiweiGenerationState({ status: 'calculating' });
      var profile = resolved.profileForEngine;
      var seed = await buildZiweiSeed(profile);
      logFlow('PaymentGateStart', { featureKey: FEATURE_KEY, coinCost: COIN_COST });
      updateProgress(30, '3/9 결제/이용권 확인 중');
      updateZiweiGenerationState({ status: 'paymentChecking' });
      var payment = await ensurePaymentOrRestore(resolved.birthInput);
      if(usePaidSessionOnly === true && !payment.reused){
        throw buildRetryableError('결제 내역을 찾지 못했습니다. 먼저 결제를 완료해 주세요.', 402, 'PAYMENT_REUSE_MISSING', 'payment');
      }
      writePaidSession({
        featureKey: FEATURE_KEY,
        reportType: 'ziweiPremium',
        sessionId: text(payment.sessionId),
        premiumAccessToken: text(payment.premiumAccessToken || payment.accessToken || payment.token),
        transactionId: text(payment.transactionId),
        paidAt: text(payment.paidAt) || new Date().toISOString(),
        birthHash: text(payment.birthHash),
        status: 'generating'
      });
      logFlow('PaymentGateSuccess', {
        hasPaymentToken: Boolean(payment && (payment.premiumAccessToken || payment.accessToken || payment.token))
      });
      updateProgress(40, '4/9 해석 규칙 로딩 중');
      updateProgress(52, '5/9 13챕터 원고 작성 중');
      updateZiweiGenerationState({ status: 'drafting' });
      var sessionId = text(payment && payment.sessionId) || buildSessionId(text(payment && payment.birthHash));
      updateZiweiGenerationState({ status: 'generating', sessionId: sessionId, currentChapterNo: 1 });
      logFlow('SessionCreateStart', { endpoint: PREPARE_API, hasPaymentToken: Boolean(payment && (payment.premiumAccessToken || payment.accessToken)) });
      logFlow('PdfRequestStart', { endpoint: PREPARE_API, chapterTarget: TOTAL_CHAPTERS });
      var data = await postPrepare(profile, seed, Object.assign({}, payment, { sessionId: sessionId }), resolved.birthInput);
      var readiness = getZiweiReportReadiness(data);
      if(!readiness.completed){
        var recoveredData = await recoverPendingResult(data, payment);
        readiness = getZiweiReportReadiness(recoveredData);
        if(readiness.processing){
          writePaidSession({
            status: 'failed_retryable',
            reportId: text(recoveredData.reportId || data.reportId),
            sessionId: text(recoveredData.sessionId || sessionId)
          });
          throw buildRetryableError('결제는 확인되었습니다. 생성 재시도를 진행합니다.', 500, 'ZIWEI_PROCESSING', 'generation');
        }
        data = recoveredData;
      }
      if(!isZiweiReportReady(data)){
        writePaidSession({ status: 'failed_retryable', reportId: text(data && data.reportId), sessionId: text(data && data.sessionId) || sessionId });
        throw buildRetryableError('결제는 확인되었습니다. 생성 재시도를 진행합니다.', 500, 'ZIWEI_REPORT_RECOVERY_REQUIRED', 'generation');
      }
      logFlow('SessionCreateSuccess', {
        chapterCount: Array.isArray(data && data.chapters) ? data.chapters.length : 0,
        qualityStatus: text(data && data.qualityStatus)
      });
      var localDraftCount = Number((data && data.localDraftChapterCount) || 0);
      var chapterProgressCount = Math.max(0, Math.min(TOTAL_CHAPTERS, localDraftCount || Number((data && data.chapterCount) || 0)));
      updateProgress(66, '6/9 근거/중복 검증 중');
      for(var i=0; i<chapterProgressCount; i++){
        markChapter(i);
        updateProgress(68 + Math.round(((i + 1) / TOTAL_CHAPTERS) * 12), '7/9 ' + (CHAPTERS[i] || '챕터 정교화 중'));
        logFlow('LocalDraftProgress', { chapterDone: i + 1, chapterTotal: TOTAL_CHAPTERS });
        logFlow('ChapterGenerated', {
          birthHash: text(payment && payment.birthHash),
          chapterCount: i + 1,
          hasToken: Boolean(text(payment && (payment.premiumAccessToken || payment.accessToken || payment.token)))
        });
      }
      updateProgress(84, '8/9 PDF 렌더링 중');
      updateZiweiGenerationState({ status: 'enhancing' });
      updateProgress(95, '9/9 리포트 저장 중');
      updateZiweiGenerationState({ status: 'savingPdf' });
      RESULT = data;
      logFlow('PdfRequestSuccess', {
        chapterCount: Array.isArray(data && data.chapters) ? data.chapters.length : 0,
        localDraftChapterCount: localDraftCount,
        qualityStatus: text(data && data.qualityStatus)
      });
      updateProgress(100, '완료');
      updateZiweiGenerationState({ status: 'completed', reportId: text(data && data.reportId), currentChapterNo: TOTAL_CHAPTERS });
      writePaidSession({
        featureKey: FEATURE_KEY,
        reportType: 'ziweiPremium',
        sessionId: text(data && data.sessionId) || sessionId,
        reportId: text(data && data.reportId),
        premiumAccessToken: text(payment && (payment.premiumAccessToken || payment.accessToken || payment.token)),
        transactionId: text(payment && payment.transactionId),
        birthHash: text(payment && payment.birthHash),
        paidAt: text(payment && payment.paidAt) || new Date().toISOString(),
        status: 'completed'
      });
      logFlow('PdfRendered', {
        birthHash: text(payment && payment.birthHash),
        chapterCount: Number((Array.isArray(data && data.chapters) ? data.chapters.length : 0) || 0),
        hasToken: Boolean(text(payment && (payment.premiumAccessToken || payment.accessToken || payment.token)))
      });
      renderResult(data);
    } catch(error) {
      var normalizedError = normalizeZiweiError(error);
      if((Number(error && error.status || 0) >= 422 && Number(error && error.status || 0) !== 401 && Number(error && error.status || 0) !== 402 && Number(error && error.status || 0) !== 403) || text(error && error.kind) === 'generation'){
        var paid = readPaidSession();
        if(paid){
          writePaidSession({ status: 'failed_retryable' });
        }
        logFlow('PrepareFailedRetryable', {
          birthHash: text(paid && paid.birthHash),
          chapterCount: Number((Array.isArray(RESULT && RESULT.chapters) ? RESULT.chapters.length : 0) || 0),
          hasToken: Boolean(text(paid && paid.premiumAccessToken))
        });
      }
      logFlow('Error', normalizedError);
      showError(mapErrorMessage(error), error);
    } finally {
      GENERATING = false;
    }
  };

  window.downloadZiweiBookPdf = function(){
    if(!RESULT){
      showError('먼저 자미두수 PDF를 생성해 주세요.');
      return;
    }
    var chapters = Array.isArray(RESULT.chapters) ? RESULT.chapters : [];
    if(chapters.length < TOTAL_CHAPTERS){
      showError('아직 13챕터가 모두 준비되지 않았습니다. 결제 내역으로 다시 생성 버튼을 눌러 복구해 주세요.');
      return;
    }
    var html = RESULT.pdfReady && RESULT.pdfReady.html ? RESULT.pdfReady.html : '';
    if(!html){
      showError('PDF 파일을 아직 준비하지 못했습니다. 다시 생성해 주세요.');
      return;
    }
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
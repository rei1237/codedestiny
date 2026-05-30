(function(){
  'use strict';

  var TOTAL_CHAPTERS = 13;
  var FEATURE_KEY = 'premium_pdf_ziwei';
  var COIN_COST = 590;
  var PREPARE_API = '/api/ziwei-book/prepare';
  var ZIWEI_FETCH_TIMEOUT_MS = 30000;
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
    '제1장 명반의 첫 문 작성 중...',
    '제2장 12궁 완전 해석 작성 중...',
    '제3장 주성과 보조성 작성 중...',
    '제4장 사화 해석 작성 중...',
    '제5장 성격과 내면 작성 중...',
    '제6장 사랑과 결혼 작성 중...',
    '제7장 직업과 사회적 소명 작성 중...',
    '제8장 재물과 성공 작성 중...',
    '제9장 복덕과 마음의 안식처 작성 중...',
    '제10장 질액과 위기 신호 작성 중...',
    '제11장 대운과 전환점 작성 중...',
    '제12장 업과 반복 패턴 작성 중...',
    '제13장 최종 운명 전략 작성 중...'
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

  function _buildApiCandidates(pathname){
    var path = String(pathname || '');
    if(path.charAt(0) !== '/') path = '/' + path;
    var bases = [
      '',
      (typeof window !== 'undefined' && window.__CD_API_BASE_URL) || '',
      (typeof window !== 'undefined' && window.__API_BASE_URL) || '',
      (typeof window !== 'undefined' && window.__AUTH_API_BASE_URL) || '',
      (typeof window !== 'undefined' && window.location && window.location.origin) || ''
    ];
    var seen = {};
    var out = [];
    for(var i=0;i<bases.length;i++){
      var base = String(bases[i] || '').trim();
      var url = base ? (base.replace(/\/+$/, '') + path) : path;
      if(seen[url]) continue;
      seen[url] = true;
      out.push(url);
    }
    return out.length ? out : [path];
  }

  function _fetchJsonWithTimeout(url, init, timeoutMs){
    var controller = (typeof AbortController === 'function') ? new AbortController() : null;
    var timerId = null;
    if(controller){
      timerId = setTimeout(function(){
        try { controller.abort(); } catch(_) {}
      }, Math.max(1000, Number(timeoutMs || ZIWEI_FETCH_TIMEOUT_MS)));
    }
    return fetch(url, Object.assign({}, init || {}, {
      credentials: 'include',
      cache: 'no-store',
      signal: controller ? controller.signal : undefined,
    }))
      .then(function(res){
        return res.text().then(function(textBody){
          var json = {};
          if(textBody){
            try { json = JSON.parse(textBody); } catch(_) { json = {}; }
          }
          return { res: res, json: json };
        });
      })
      .finally(function(){
        if(timerId) clearTimeout(timerId);
      });
  }

  function _isRetryableZiweiStatus(status){
    var code = Number(status || 0);
    return code >= 500 || code === 408 || code === 425 || code === 429;
  }

  function _isZiweiAuthOrPaymentFailure(status, payload){
    var code = String((payload && (payload.code || payload.error || payload.message)) || '').toUpperCase();
    if(status === 401 || status === 402 || status === 403) return true;
    return code.indexOf('AUTH') >= 0
      || code.indexOf('UNAUTHORIZED') >= 0
      || code.indexOf('FORBIDDEN') >= 0
      || code.indexOf('PAYMENT') >= 0
      || code.indexOf('PREMIUM') >= 0;
  }

  function _getZiweiStatusSpecificMessage(status, details) {
    var details = details || {};
    var httpStatus = Number(status || 0) || 0;
    var failureStage = String(details.failureStage || details.stage || '');
    var errorCode = String(details.code || details.errorCode || '').toUpperCase();
    var reasonText = String(details.reason || details.message || '').toLowerCase();

    if (httpStatus === 0) {
      if (errorCode === 'ZIWEI_PREPARE_TIMEOUT') {
        return '자미두수 PDF 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.';
      }
      if (errorCode === 'ZIWEI_NETWORK_ERROR') {
        return '네트워크 연결 문제로 자미두수 PDF 요청에 실패했습니다. 연결 상태 확인 후 다시 시도해주세요.';
      }
      return '자미두수 PDF 요청 중 네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
    
    if (httpStatus === 429) {
      return '자미두수 PDF 생성 AI 할당량이 임시로 부족합니다. 잠시 후 다시 시도해주세요.';
    }
    if (httpStatus === 503) {
      return '서버가 현재 이용 불가능합니다. 잠시 후 다시 시도해주세요.';
    }
    if (httpStatus === 422) {
      return '입력한 정보가 올바르지 않습니다. 다시 확인해주세요.';
    }
    if (httpStatus === 500 || httpStatus === 502 || httpStatus === 504) {
      if (reasonText.indexOf('_llm_error:429') >= 0 || reasonText.indexOf('quota') >= 0 || reasonText.indexOf('rate-limit') >= 0) {
        return '자미두수 PDF 생성 AI 할당량이 임시로 부족합니다. 잠시 후 다시 시도해주세요.';
      }
      if (failureStage === 'chapter_generation') {
        var chapterNo = String(details.failedChapterNo || '');
        if (chapterNo) {
          return '챕터 ' + chapterNo + ' 생성에 실패했습니다. 잠시 후 다시 시도해주세요.';
        }
        return '자미두수 PDF 챕터 생성에 실패했습니다. 잠시 후 다시 시도해주세요.';
      }
      if (failureStage === 'preparation') {
        return '자미두수 PDF 준비 중에 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      }
      return '자미두수 PDF 생성 중에 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
    return '자미두수 PDF 생성 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.';
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

  function isZiweiReportReady(data){
    var payload = data || {};
    var chapters = Array.isArray(payload.chapters) ? payload.chapters : [];
    var hasReportId = Boolean(text(payload.reportId));
    var hasPdfHtml = Boolean(text(payload && payload.pdfReady && payload.pdfReady.html));
    return hasReportId && hasPdfHtml && chapters.length === TOTAL_CHAPTERS;
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
    setText('zbLoadingChapter', label || '자미두수 명반을 펼치는 중입니다.');
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
    var endpoints = _buildApiCandidates('/api/profile');
    var endpointIndex = 0;
    try {
      while(endpointIndex < endpoints.length){
        var pack = await _fetchJsonWithTimeout(endpoints[endpointIndex++], { method: 'GET' }, 12000);
        if(!pack.res.ok){
          if(!_isRetryableZiweiStatus(pack.res.status)) return null;
          continue;
        }
        var data = pack.json || {};
        var profiles = Array.isArray(data && data.profiles) ? data.profiles : [];
        var currentId = text(data && data.currentId);
        var selected = (currentId && profiles.find(function(p){ return p && (p.id === currentId || p.profileId === currentId); })) || profiles[0] || null;
        if(!selected) continue;
        return profileFromObject(selected, 'profileApi');
      }
      return null;
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
    var endpoints = _buildApiCandidates(PREPARE_API);
    var endpointIndex = 0;
    var sessionId = text(payment && payment.sessionId);
    var authToken = '';
    try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch(_) { authToken = ''; }
    var body = {
      featureKey: FEATURE_KEY,
      reportType: 'ziweiPremium',
      sessionId: sessionId || undefined,
      premiumAccessToken: ((payment && (payment.premiumAccessToken || payment.accessToken)) || getPremiumToken()) || '',
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

    function toError(message, status, details){
      var err = new Error(message || '자미두수 PDF 생성 요청에 실패했습니다.');
      err.status = Number(status || 0) || 0;
      err.code = String((details && details.code) || 'ZIWEI_PREPARE_FAILED');
      err.details = Object.assign({ httpStatus: err.status, message: message, timestamp: new Date().toISOString() }, details || {});
      return err;
    }

    var lastError = null;
    while(endpointIndex < endpoints.length){
      var endpointUrl = endpoints[endpointIndex];
      var token = (payment && (payment.premiumAccessToken || payment.accessToken)) || getPremiumToken();
      var headers = { 'Content-Type': 'application/json' };
      if(token) headers['x-premium-access-token'] = token;
      if(authToken) headers.Authorization = 'Bearer ' + authToken;

      var pack;
      try {
        pack = await _fetchJsonWithTimeout(endpointUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(body),
        }, ZIWEI_FETCH_TIMEOUT_MS);
        endpointIndex += 1;
      } catch(error){
        if(error && error.name === 'AbortError') {
          lastError = toError('자미두수 PDF 생성 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.', 0, {
            code: 'ZIWEI_PREPARE_TIMEOUT',
            endpoint: endpointUrl,
          });
          logFlow('PrepareTimeout', { endpoint: endpointUrl, endpointIndex: endpointIndex + 1, totalEndpoints: endpoints.length });
          endpointIndex += 1;
          if(endpointIndex < endpoints.length) continue;
          throw lastError;
        }
        lastError = toError((error && error.message) || '네트워크 오류가 발생했습니다.', 0, {
          code: 'ZIWEI_NETWORK_ERROR',
          endpoint: endpointUrl,
          errorName: error && error.name,
        });
        logFlow('PrepareNetworkError', {
          endpoint: endpointUrl,
          endpointIndex: endpointIndex + 1,
          totalEndpoints: endpoints.length,
          errorName: error && error.name,
          message: error && error.message,
        });
        endpointIndex += 1;
        if(endpointIndex < endpoints.length) continue;
        throw lastError;
      }

      var json = pack.json || {};
      var status = Number(pack.res && pack.res.status || 0) || 0;
      if(pack.res && pack.res.ok && json.ok){
        if(json.premiumAccessToken || json.accessToken) storePremiumToken(json.premiumAccessToken || json.accessToken);
        return json;
      }

      lastError = toError(json.message || json.error || ('자미두수 PDF 생성 요청에 실패했습니다. HTTP ' + status), status, Object.assign({}, json, { endpoint: endpointUrl }));

      if(_isZiweiAuthOrPaymentFailure(status, json)) {
        logFlow('AuthOrPaymentFailure', { status: status, code: json.code, message: json.message });
        throw toError(json.message || json.error || '로그인 또는 결제 확인이 필요합니다.', status, Object.assign({}, json, { endpoint: endpointUrl }));
      }
      if(!_isRetryableZiweiStatus(status)) {
        logFlow('NonRetryableError', { status: status, code: json.code, message: json.message, endpoint: endpointUrl });
        throw toError(json.message || json.error || ('자미두수 PDF 생성 요청에 실패했습니다. HTTP ' + status), status, Object.assign({}, json, { endpoint: endpointUrl }));
      }
      logFlow('RetryableStatus', {
        status: status,
        code: json.code,
        message: json.message,
        endpoint: endpointUrl,
        endpointIndex: endpointIndex,
        totalEndpoints: endpoints.length
      });
    }

    throw (lastError || toError('자미두수 PDF 생성 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.', 0, { code: 'ZIWEI_PREPARE_FAILED' }));
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
    setDisplay('zbStartScreen','none');
    setDisplay('zbErrorScreen','block');
    var msg = message || 'PDF 생성이 완료되지 않아 사용된 코인이 자동으로 환불되었습니다. 다시 시도해 주세요.';
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
      updateProgress(0, '자미두수 명반을 펼치는 중입니다.');
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
    updateZiweiGenerationState({ isOpen: false, status: GENERATING ? 'generating' : ZIWEI_GENERATION_STATE.status });
  };

  window.gotoZiweiPremium = function(){
    window.openZiweiBookModal();
  };

  window.generateZiweiBook = async function(){
    if(GENERATING) return;
    GENERATING = true;
    RESULT = null;
    resetZiweiGenerationState();
    try {
      setDisplay('zbStartScreen','none');
      setDisplay('zbResultScreen','none');
      setDisplay('zbErrorScreen','none');
      setDisplay('zbLoadingScreen','block');
      updateProgress(8, '자미두수 명반을 펼치는 중입니다.');
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
      logFlow('PaymentGateStart', { featureKey: FEATURE_KEY, coinCost: COIN_COST });
      updateProgress(46, '생성 준비를 마무리하고 있습니다.');
      updateZiweiGenerationState({ status: 'paymentChecking' });
      var payment = await ensurePayment();
      logFlow('PaymentGateSuccess', {
        hasPaymentToken: Boolean(payment && (payment.premiumAccessToken || payment.accessToken || payment.token))
      });
      updateProgress(18, '명궁과 신궁의 흐름을 정리하고 있습니다.');
      updateZiweiGenerationState({ status: 'calculating' });
      var profile = resolved.profileForEngine;
      var seed = await buildZiweiSeed(profile);
      updateProgress(35, '12궁에 담긴 삶의 무대를 읽고 있습니다.');
      updateZiweiGenerationState({ status: 'drafting' });
      updateProgress(58, '사랑과 직업, 재물의 흐름을 해석하고 있습니다.');
      var sessionId = 'ziwei-premium:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8);
      updateZiweiGenerationState({ status: 'generating', sessionId: sessionId, currentChapterNo: 1 });
      logFlow('SessionCreateStart', { endpoint: PREPARE_API, hasPaymentToken: Boolean(payment && (payment.premiumAccessToken || payment.accessToken)) });
      logFlow('PdfRequestStart', { endpoint: PREPARE_API, chapterTarget: TOTAL_CHAPTERS });
      var data = await postPrepare(profile, seed, Object.assign({}, payment, { sessionId: sessionId }), resolved.birthInput);
      if(!isZiweiReportReady(data)){
        throw new Error('자미두수 PDF 결과가 아직 완전히 저장되지 않았습니다. 잠시 후 다시 시도해 주세요.');
      }
      logFlow('SessionCreateSuccess', {
        chapterCount: Array.isArray(data && data.chapters) ? data.chapters.length : 0,
        llmOnly: true
      });
      var chapterProgressCount = Math.max(0, Math.min(TOTAL_CHAPTERS, Number((data && data.chapterCount) || 0)));
      for(var i=0; i<chapterProgressCount; i++){
        markChapter(i);
        updateProgress(62 + Math.round(((i + 1) / TOTAL_CHAPTERS) * 24), CHAPTERS[i] || '챕터를 완성하고 있습니다.');
        logFlow('LocalDraftProgress', { chapterDone: i + 1, chapterTotal: TOTAL_CHAPTERS });
      }
      updateProgress(88, '인생의 반복 패턴과 전환점을 정리하고 있습니다.');
      updateZiweiGenerationState({ status: 'enhancing' });
      updateProgress(95, '마지막 운명 전략을 완성하고 있습니다.');
      updateZiweiGenerationState({ status: 'savingPdf' });
      RESULT = data;
      logFlow('PdfRequestSuccess', {
        chapterCount: Array.isArray(data && data.chapters) ? data.chapters.length : 0,
        llmOnly: true
      });
      updateProgress(100, 'PDF를 완성하고 있습니다.');
      updateZiweiGenerationState({ status: 'completed', reportId: text(data && data.reportId), currentChapterNo: TOTAL_CHAPTERS });
      renderResult(data);
    } catch(error) {
      var normalizedError = normalizeZiweiError(error);
      var enhancedError = Object.assign({}, normalizedError, { status: error.status, code: error.code, details: error.details });
      var userMessage = _getZiweiStatusSpecificMessage(error.status, error.details);
      logFlow('GenerationFailed', {
        status: error.status || 0,
        code: error.code || 'UNKNOWN',
        message: error.message,
        sessionId: ZIWEI_GENERATION_STATE.sessionId,
        currentChapterNo: ZIWEI_GENERATION_STATE.currentChapterNo,
        failedChapters: ZIWEI_GENERATION_STATE.failedChapters,
        details: error.details
      });
      showError(userMessage || (normalizedError && normalizedError.message ? normalizedError.message : String(error)));
    } finally {
      GENERATING = false;
    }
  };

  window.downloadZiweiBookPdf = function(){
    if(!RESULT){
      showError('먼저 자미두수 PDF를 생성해 주세요.');
      return;
    }
    var html = RESULT.pdfReady && RESULT.pdfReady.html ? RESULT.pdfReady.html : '';
    if(!html){
      showError('PDF 본문이 준비되지 않았습니다. 다시 생성해 주세요.');
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
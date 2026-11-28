/* Code Destiny 만세력 표 화면.
 * - saju-engine.js renderManse(p) 의 첫 줄이 render(p) 에 위임한다. false 를 돌려주면 기존 표가 그대로 그린다.
 * - 신살·관계·지장간·12운성·납음은 정본 SajuNatalCore.computeShinsal 결과만 쓴다(화면 쪽 재판정 없음).
 * - 신살 설명 문구(SajuShinsalCopy)는 배지 시트를 처음 열 때만 지연 로드한다.
 * - 표시 설정은 이 기기 localStorage(cd.manse.settings.v1)에만 둔다. 계정 동기화는 하지 않는다.
 * - 대운 흐름은 출생시간을 알고 대운 풀이가 열린 명식에서만 보인다(_cdSajuGateUnlocked, fail-closed).
 *   세운·월운은 달력 간지라 잠그지 않는다.
 */
(function (root) {
  'use strict';
  if (!root || !root.document || root.CdManseView) return;
  var doc = root.document;

  var STORE_KEY = 'cd.manse.settings.v1';
  var COPY_SRC = '/js/core/saju/shinsal-copy.generated.js?v=build-ebf3c0b4c4f6';
  var SHARE_SRC = '/js/share.js?v=build-9ac2af0941c0';
  var NS = 'manseView.';

  var COLS = [
    { key: 'hour', p: 'h', col: 2, legacy: '시주', han: '時柱' },
    { key: 'day', p: 'd', col: 3, legacy: '일주', han: '日柱' },
    { key: 'month', p: 'm', col: 4, legacy: '월주', han: '月柱' },
    { key: 'year', p: 'y', col: 5, legacy: '년주', han: '年柱' }
  ];
  var COL_INDEX = { hour: 0, day: 1, month: 2, year: 3 };
  var NATAL = { year: 1, month: 1, day: 1, hour: 1 };
  var CATS = ['gwiin', 'gil', 'hyung', 'twelve', 'relation'];
  var BADGE_CATS = ['gwiin', 'gil', 'hyung'];
  var EMOJI = { gwiin: '✨', gil: '🍀', hyung: '⚡', relation: '🔗', twelve: '🌙' };
  var RULE_KEYS = ['yanginYinStems', 'hyeonchimIncludeMi', 'goegangIncludeMuSul', 'gongmangYearBasis', 'cheoneulGengInO', 'hakdangMuShin', 'gwiinYearStem'];
  var BASES = ['both', 'yearBranch', 'dayBranch'];
  var HAP_IDS = { stemHap: 1, yukhap: 1, samhap: 1, banghap: 1, banhap: 1 };
  var CHUNG_IDS = { chung: 1, stemChung: 1 };
  var HYEONG_KIND = { '삼형': 'samhyeong', '상형': 'sanghyeong', '자형': 'jahyeong', '삼형 완성': 'samhyeongFull' };
  var ELEMENTS = ['wood', 'fire', 'earth', 'metal', 'water'];
  var STEMS = '甲乙丙丁戊己庚辛壬癸';
  var STEMS_KO = '갑을병정무기경신임계';
  var BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
  var BRANCHES_KO = '자축인묘진사오미신유술해';
  var MAX_BADGES = 3;
  var UNSEONG_HAN = { '장생': '長生', '목욕': '沐浴', '관대': '冠帶', '임관': '臨官', '제왕': '帝旺', '쇠': '衰', '병': '病', '사': '死', '묘': '墓', '절': '絶', '태': '胎', '양': '養' };
  var NAYIN_HAN = {
    '해중금': '海中金', '사중금': '沙中金', '노중화': '爐中火', '산하화': '山下火', '대림목': '大林木', '평지목': '平地木',
    '노방토': '路傍土', '벽상토': '壁上土', '검봉금': '劍鋒金', '금박금': '金箔金', '산두화': '山頭火', '복등화': '覆燈火',
    '간하수': '澗下水', '천하수': '天河水', '성두토': '城頭土', '대역토': '大驛土', '백랍금': '白蠟金', '차천금': '釵釧金',
    '양류목': '楊柳木', '상자목': '桑柘木', '천중수': '泉中水', '대계수': '大溪水', '옥상토': '屋上土', '사중토': '沙中土',
    '벽력화': '霹靂火', '천상화': '天上火', '송백목': '松柏木', '석류목': '石榴木', '장류수': '長流水', '대해수': '大海水'
  };
  var TEN_HAN = { '비견': '比肩', '겁재': '劫財', '식신': '食神', '상관': '傷官', '편재': '偏財', '정재': '正財', '편관': '偏官', '정관': '正官', '편인': '偏印', '정인': '正印', '일간': '日干' };

  /* 한국어 원문. 다른 언어는 public/i18n/<lang>.json 의 manseView.* 키로 바뀐다(i18n/authored/manseView-*.json). */
  var KO = {
    'tableLabel': '만세력 원국 표',
    'basis.label': '계산 기준',
    'basis.solar': '양력 {date} {time}',
    'basis.lunar': '음력 {date}{leap} {time}',
    'basis.leap': '(윤달)',
    'basis.toSolar': '양력 {date}',
    'basis.lmt': '지역 평균시 {time} ({place}, {minutes})',
    'basis.placeDefault': '서울 기본값',
    'basis.minutes': '{n}분',
    'basis.civil': '경도 보정 없음(입력 시각 그대로)',
    'basis.meridian': '표준 자오선 {meridian}({utc})',
    'basis.dst': '서머타임 {n}분 반영',
    'basis.term': '{term} 절입 {date} {time}',
    'basis.nightZi': '23시 이후 다음 날 일주',
    'basis.timeUnknown': '출생시간 미상(시주 제외)',
    'basis.unavailable': '입력한 생년월일시로 계산했어요',
    'tool.settings': '설정',
    'tool.hideHanja': '한자 숨기기',
    'tool.unseongGroup': '12운성 기준',
    'tool.unseongShort': '12운성',
    'tool.bong': '봉법',
    'tool.geo': '거법',
    'tool.save': '이미지 저장',
    'tool.saving': '이미지를 만드는 중이에요',
    'tool.saveFailed': '이미지를 만들지 못했어요. 잠시 뒤 다시 눌러 주세요.',
    'tool.ready': '이미지를 준비했어요',
    'tool.shareTitle': '나의 만세력',
    'settings.title': '만세력 표시 설정',
    'settings.cats': '보여 줄 신살 묶음',
    'settings.twelveBasis': '12신살 기준',
    'settings.basis.both': '년지·일지 모두',
    'settings.basis.yearBranch': '년지 기준',
    'settings.basis.dayBranch': '일지 기준',
    'settings.expert': '전문가 규칙 직접 고르기',
    'settings.expertNote': '학파마다 다르게 보는 규칙이에요. 바꾸면 표가 바로 다시 계산돼요.',
    'settings.reset': '기본값으로',
    'settings.storedNote': '설정은 이 기기에만 저장돼요.',
    'cat.gwiin': '귀인',
    'cat.gil': '길신',
    'cat.hyung': '주의',
    'cat.relation': '관계',
    'cat.twelve': '12신살',
    'rule.yanginYinStems': '음간에도 양인 보기(乙辰·丁未·己未·辛戌·癸丑)',
    'rule.hyeonchimIncludeMi': '현침살 지지에 未 포함',
    'rule.goegangIncludeMuSul': '괴강살에 戊戌 포함',
    'rule.gongmangYearBasis': '공망을 년주 기준으로도 보기',
    'rule.cheoneulGengInO': '천을귀인 庚 일간을 寅·午로 보기',
    'rule.hakdangMuShin': '학당귀인 戊 일간을 申으로 보기(수토동법)',
    'rule.gwiinYearStem': '귀인을 년간 기준으로도 보기',
    'col.hour': '시',
    'col.day': '일',
    'col.month': '월',
    'col.year': '년',
    'pillar.hour': '시주',
    'pillar.day': '일주',
    'pillar.month': '월주',
    'pillar.year': '년주',
    'posShort.stem': '간',
    'posShort.branch': '지',
    'posShort.pillar': '주',
    'spot': '{col}{pos}',
    'luckSpot': '{scope} {pos}',
    'row.head': '구분',
    'row.tenGod': '십성',
    'row.stem': '천간',
    'row.branch': '지지',
    'row.hidden': '지장간',
    'row.unseong': '12운성',
    'row.nayin': '납음',
    'row.twelve': '12신살',
    'row.badges': '신살',
    'row.relation': '관계',
    'dayMaster': '일간',
    'dayStarLabel': '일주: 나를 나타내는 기둥',
    'timeUnknown': '시간 미상으로 표시 불가',
    'moreAria': '{pillar} 신살 {n}개 더 보기',
    'badgeAria': '{name} 설명 보기',
    'charAria.stem': '{pillar} 천간 {char} 상세 보기',
    'charAria.branch': '{pillar} 지지 {char} 상세 보기',
    'el.wood': '목',
    'el.fire': '화',
    'el.earth': '토',
    'el.metal': '금',
    'el.water': '수',
    'yy.yang': '양',
    'yy.yin': '음',
    'yyEl': '{yy}{el}',
    'rel.samhyeong': '삼형',
    'rel.sanghyeong': '상형',
    'rel.jahyeong': '자형',
    'rel.samhyeongFull': '삼형 완성',
    'sum.yeoniName': '연이',
    'sum.nyangName': '영냥이',
    'sum.yeoni': '명식에 신살이 {n}개 머물러 있어요. 배지를 누르면 쉬운 설명과 근거가 열려요.',
    'sum.nyang': '좋고 나쁨을 정하는 표시가 아니다냥. 어떻게 쓰느냐가 더 중요하다냥.',
    'sum.empty': '원국에서 직접 확인되는 별신살이 없어요. 없는 것 또한 부족함이나 불운을 뜻하지 않아요.',
    'sum.basisNote': '12신살 기준: {basis}. 다른 신살은 신살마다 정해진 기준(일간·월지 등)으로 찾았고, 배지를 누르면 근거를 볼 수 있어요. 기준은 학파마다 조금씩 달라요.',
    'sum.expand': '한 줄 설명으로 펼쳐 보기',
    'sum.collapse': '한 줄 설명 접기',
    'sum.linesLabel': '신살 한 줄 설명',
    'sum.linesLoading': '한 줄 설명을 불러오는 중이에요…',
    'sum.linesFailed': '설명을 불러오지 못했어요. 이름과 자리만 먼저 보여 드려요.',
    /* 기둥 자리의 뜻. 단정하지 않고 "비추는" 정도로만 쓴다. 운(대운·세운·월운) 자리에는 쓰지 않는다. */
    'posMean.year': '뿌리·집안·어린 시절을 비추는 자리',
    'posMean.month': '일·사회생활을 비추는 자리',
    'posMean.day': '나 자신과 배우자·가까운 관계를 비추는 자리',
    'posMean.hour': '앞으로의 계획·자녀·말년을 비추는 자리',
    /* 천간·지지 자리마다 따로 비추는 영역(궁위). 간지 전체(백호 등)는 위 기둥 뜻을 그대로 쓴다. */
    'posMean.yearStem': '집안·조상의 뿌리를 비추는 자리',
    'posMean.yearBranch': '어린 시절·자란 환경을 비추는 자리',
    'posMean.monthStem': '부모·형제와 사회에 드러나는 모습을 비추는 자리',
    'posMean.monthBranch': '일·사회생활의 바탕을 비추는 자리',
    'posMean.dayStem': '나 자신을 비추는 자리',
    'posMean.dayBranch': '배우자·가까운 관계를 비추는 자리',
    'posMean.hourStem': '앞으로의 계획·자녀를 비추는 자리',
    'posMean.hourBranch': '말년·노후의 터전을 비추는 자리',
    'luck.title': '대운·세운·월운 흐름',
    'luck.daewoon': '대운',
    'luck.sewoon': '세운',
    'luck.wolwoon': '월운',
    'luck.hint': '칸을 누르면 그 시기에 들어오는 신살을 볼 수 있어요.',
    'luck.daewoonLocked': '대운 흐름은 대운 풀이와 함께 열려요.',
    'luck.daewoonTimeUnknown': '출생시간을 몰라 대운 시작 나이를 확정하지 않아요.',
    'luck.daewoonEmpty': '대운 정보를 불러오지 못했어요.',
    'luck.age': '{n}세',
    'luck.year': '{n}년',
    'luck.month': '{term} {date}',
    'luck.count': '신살 {n}',
    'luck.now': '지금',
    'luck.itemAria': '{label} {ganji} 신살 보기',
    'luck.note': '세운은 입춘, 월운은 절입일을 기준으로 바뀌어요.',
    'sheet.close': '닫기',
    'sheet.back': '목록으로',
    'sheet.loading': '설명을 불러오는 중이에요…',
    'sheet.loadFailed': '설명을 불러오지 못했어요. 이름과 근거만 먼저 보여 드려요.',
    'sheet.easy': '쉽게 말하면',
    'sheet.good': '좋게 쓰는 법',
    'sheet.caution': '주의',
    'sheet.tip': '팁',
    'sheet.how': '어떻게 잡혔나요?',
    'sheet.where': '자리',
    'sheet.basis': '기준',
    'sheet.pair': '함께 묶인 자리',
    'sheet.element': '모이는 기운',
    'sheet.kind': '종류',
    'sheet.pos.stem': '천간',
    'sheet.pos.branch': '지지',
    'sheet.pos.pillar': '간지',
    'sheet.foot': '신살은 성향과 흐름을 읽는 참고 표시예요. 하나만으로 길흉을 정하지 않아요.',
    'sheet.listTitle': '{pillar} 신살 {n}개',
    'sheet.luckTitle': '{label} {ganji}',
    'sheet.luckEmpty': '이 시기에 새로 들어오는 신살이 없어요. 없는 것도 나쁜 뜻이 아니에요.',
    'sheet.relWithNatal': '원국과 맺는 관계',
    'sheet.luckHits': '들어오는 신살',
    'polarity.good': '돕는 기운',
    'polarity.neutral': '쓰기 나름',
    'polarity.caution': '조심해서 쓰기',
    'basisKey.dayStem': '일간',
    'basisKey.yearStem': '년간',
    'basisKey.yearBranch': '년지',
    'basisKey.dayBranch': '일지',
    'basisKey.monthBranch': '월지',
    'basisKey.dayPillar': '일주',
    'basisKey.yearPillar': '년주',
    'basisKey.pillar': '간지 자체',
    'basisKey.char': '글자 자체',
    'basisKey.pair': '지지 짝',
    'basisKey.stemPair': '천간 짝',
    'basisKey.triad': '세 지지'
  };

  var state = {
    settings: null,
    settingsOpen: false,
    lastP: null,
    groups: [],
    lines: [],
    expanded: false,
    linesFailed: false,
    allowed: null,
    memo: []
  };

  /* ── 공통 도우미 ───────────────────────────────────────── */
  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fill(s, vars) {
    return String(s).replace(/\{\{?(\w+)\}?\}/g, function (m, k) { return vars && vars[k] != null ? String(vars[k]) : ''; });
  }
  function lang() {
    try {
      var l = typeof root.cdGetCurrentLanguage === 'function' ? root.cdGetCurrentLanguage() : '';
      return String(l || '').toLowerCase();
    } catch (e) { return ''; }
  }
  function isKo() { var l = lang(); return !l || l.indexOf('ko') === 0; }
  function mt(key, vars, fb) {
    var base = fb != null ? fb : (KO[key] != null ? KO[key] : '');
    if (!isKo()) {
      try {
        if (typeof root.cdTranslate === 'function') {
          var out = root.cdTranslate(NS + key, vars || null, base);
          if (typeof out === 'string' && out) return out;
        }
      } catch (e) { /* 번역 실패는 한국어 원문으로 둔다 */ }
    }
    return fill(base, vars);
  }
  function two(n) { n = Math.floor(Math.abs(Number(n) || 0)); return (n < 10 ? '0' : '') + n; }
  function ymd(o) { return o && o.year ? o.year + '-' + two(o.month) + '-' + two(o.day) : ''; }
  function hm(h, m) { return two(h) + ':' + two(m); }
  function signed(n) { n = Math.round(Number(n) || 0); return n < 0 ? '\u2212' + Math.abs(n) : (n > 0 ? '+' + n : '0'); }
  function utcLabel(deg) {
    var h = deg / 15;
    var a = Math.abs(h);
    var hh = Math.floor(a + 1e-9);
    var mm = Math.round((a - hh) * 60);
    return 'UTC' + (h < 0 ? '\u2212' : '+') + hh + (mm ? ':' + two(mm) : '');
  }
  function meridianLabel(deg) { return (Math.round(Math.abs(deg) * 100) / 100) + '°' + (deg < 0 ? 'W' : 'E'); }
  function readingOf(ch) {
    var out = '';
    String(ch || '').split('').forEach(function (c) {
      var i = STEMS.indexOf(c);
      if (i >= 0) { out += STEMS_KO.charAt(i); return; }
      i = BRANCHES.indexOf(c);
      if (i >= 0) out += BRANCHES_KO.charAt(i);
    });
    return out;
  }
  function gan() { return root.GAN || null; }
  function ji() { return root.JI || null; }
  function core() { return root.SajuNatalCore || null; }
  function gridEl() { return doc.getElementById('manseGrid'); }
  function catLabel(cat) { return mt('cat.' + cat); }
  function hitName(id, name) { return isKo() ? String(name || '') : mt('shinsal.' + id + '.name', null, name || ''); }
  function colLabel(pillar) { return mt('col.' + pillar); }
  function pillarLabel(pillar) { return mt('pillar.' + pillar); }
  function tenGod(dayGan, ch) {
    var god = '';
    try { god = typeof root.getTenGod === 'function' ? root.getTenGod(dayGan, ch) : ''; } catch (e) { god = ''; }
    if (!god || god === '?') return '';
    return isKo() ? god : (TEN_HAN[god] || god);
  }

  /* ── 설정 ─────────────────────────────────────────────── */
  function defaultRules() {
    var c = core();
    var base = (c && c.DEFAULT_SHINSAL_OPTIONS) || {};
    var out = {};
    RULE_KEYS.forEach(function (k) { out[k] = base[k] === true; });
    if (base.goegangIncludeMuSul === undefined) out.goegangIncludeMuSul = true;
    return out;
  }
  function sanitize(raw) {
    var r = raw && typeof raw === 'object' ? raw : {};
    var rules = defaultRules();
    var s = {
      showHanja: r.showHanja !== false,
      expertMode: r.expertMode === true,
      twelveBasis: BASES.indexOf(r.twelveBasis) >= 0 ? r.twelveBasis : 'both',
      unseongMode: r.unseongMode === 'geo' ? 'geo' : 'bong',
      cats: {},
      rules: {}
    };
    var cats = r.cats && typeof r.cats === 'object' ? r.cats : {};
    CATS.forEach(function (c) { s.cats[c] = cats[c] !== false; });
    var rr = r.rules && typeof r.rules === 'object' ? r.rules : {};
    RULE_KEYS.forEach(function (k) { s.rules[k] = typeof rr[k] === 'boolean' ? rr[k] : rules[k]; });
    return s;
  }
  function loadSettings() {
    var raw = null;
    try { var v = root.localStorage.getItem(STORE_KEY); raw = v ? JSON.parse(v) : null; } catch (e) { raw = null; }
    return sanitize(raw);
  }
  function saveSettings(s) {
    try { root.localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) { /* 저장 불가 환경은 이번 화면에만 적용 */ }
  }
  function settings() {
    if (!state.settings) state.settings = loadSettings();
    return state.settings;
  }
  function engineOptions(s) {
    var o = { twelveBasis: s.twelveBasis, unseongMode: s.unseongMode };
    if (s.expertMode) RULE_KEYS.forEach(function (k) { o[k] = !!s.rules[k]; });
    return o;
  }
  function catOn(s, cat) { return !!(s.cats && s.cats[cat]); }

  function compute(c, input, opts) {
    var key = JSON.stringify([input, opts]);
    for (var i = 0; i < state.memo.length; i++) if (state.memo[i].k === key) return state.memo[i].v;
    var v = c.computeShinsal(input, opts);
    state.memo.unshift({ k: key, v: v });
    if (state.memo.length > 4) state.memo.length = 4;
    return v;
  }

  /* ── 운 흐름(대운·세운·월운) ─────────────────────────── */
  function kstNow() {
    var d = new Date(Date.now() + 9 * 3600000);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() };
  }
  function sajuNow(kc) {
    var n = kstNow();
    var t = null;
    try { if (kc && typeof kc.enclosingNodeTerm === 'function') t = kc.enclosingNodeTerm(n.y, n.m, n.d, n.h, n.mi); } catch (e) { t = null; }
    if (t) return { now: n, year: (t.year < n.y || t.index === 0) ? n.y - 1 : n.y, monthIndex: t.index === 0 ? 11 : (t.index - 2) / 2 };
    return { now: n, year: (n.m < 2 || (n.m === 2 && n.d < 4)) ? n.y - 1 : n.y, monthIndex: -1 };
  }
  function termName(index) {
    var kc = root.KoreanCalendar;
    if (!kc) return '';
    var table = isKo() ? kc.TERM_NAME_KO : kc.TERM_NAME_HANJA;
    return table && table[index] ? String(table[index]) : '';
  }
  function daewoonAllowed() {
    try { return typeof root._cdSajuGateUnlocked === 'function' && root._cdSajuGateUnlocked('section_daewun') === true; } catch (e) { return false; }
  }
  function buildLuck(tu, allowed) {
    var out = { rows: [], daewoon: [], sewoon: [], wolwoon: [], now: null };
    var kc = root.KoreanCalendar;
    var sn = sajuNow(kc);
    out.now = sn;
    if (!tu && allowed) {
      try {
        var bazi = root.G_BAZI;
        if (bazi && typeof bazi.getYun === 'function' && typeof root._sajuDaewunRowsFromList === 'function') {
          var list = bazi.getYun(root.GENDER === 'M' ? 1 : 0).getDaYun();
          (root._sajuDaewunRowsFromList(list) || []).forEach(function (r) {
            if (!r || STEMS.indexOf(r.g) < 0 || BRANCHES.indexOf(r.j) < 0) return;
            out.daewoon.push({ scope: 'daewoon', stem: r.g, branch: r.j, age: r.age, startYear: r.startYear, endYear: r.endYear });
          });
        }
      } catch (e) { out.daewoon = []; }
    }
    var Y = sn.year;
    for (var k = 0; k < 10; k++) {
      var y = Y + k;
      out.sewoon.push({ scope: 'sewoon', stem: STEMS.charAt(((y - 4) % 10 + 10) % 10), branch: BRANCHES.charAt(((y - 4) % 12 + 12) % 12), year: y });
    }
    if (kc && typeof kc.nodeTerms === 'function') {
      try {
        var cur = kc.nodeTerms(Y) || [];
        var next = kc.nodeTerms(Y + 1) || [];
        var ys = ((Y - 4) % 10 + 10) % 10;
        for (var i = 0; i < 12; i++) {
          var want = i <= 10 ? 2 + 2 * i : 0;
          var src = i <= 10 ? cur : next;
          var term = null;
          for (var t = 0; t < src.length; t++) if (src[t] && src[t].index === want) { term = src[t]; break; }
          if (!term) { out.wolwoon = []; break; }
          out.wolwoon.push({ scope: 'wolwoon', stem: STEMS.charAt(((ys % 5) * 2 + 2 + i) % 10), branch: BRANCHES.charAt((2 + i) % 12), month: i + 1, term: term });
        }
      } catch (e) { out.wolwoon = []; }
    }
    function clean(r) {
      var o = { scope: r.scope, stem: r.stem, branch: r.branch };
      if (r.age != null) o.age = r.age;
      if (r.year != null) o.year = r.year;
      if (r.month != null) o.month = r.month;
      return o;
    }
    out.rows = out.daewoon.map(clean).concat(out.sewoon.map(clean), out.wolwoon.map(clean));
    return out;
  }

  /* ── 계산 기준 한 줄 ─────────────────────────────────── */
  function basisHtml(tu) {
    var meta = root.__cdSajuCalculationMeta;
    var parts = [];
    if (!meta || !meta.original) {
      parts.push(mt('basis.unavailable'));
    } else {
      var o = meta.original;
      var civ = meta.civil || null;
      var k = meta.correction || {};
      var cor = meta.corrected || null;
      var timeText = (!tu && o.birthTime) ? String(o.birthTime) : '';
      var first;
      if (o.calendarType === 'lunar') {
        first = mt('basis.lunar', { date: o.birthDate || '', leap: o.leapMonth ? mt('basis.leap') : '', time: timeText }).trim();
        if (civ) first += ' (' + mt('basis.toSolar', { date: ymd(civ) }) + ')';
      } else {
        first = mt('basis.solar', { date: o.birthDate || ymd(civ), time: timeText }).trim();
      }
      if (!tu) {
        if (k.method === 'LOCAL_MEAN_TIME' && cor) {
          var loc = meta.location || {};
          first += ' → ' + mt('basis.lmt', {
            time: hm(cor.hour, cor.minute),
            place: (loc.assumed || !loc.name) ? mt('basis.placeDefault') : loc.name,
            minutes: mt('basis.minutes', { n: signed(k.appliedMinutes) })
          });
        } else {
          first += ' → ' + mt('basis.civil');
        }
      }
      parts.push(first);
      var mer = Number(k.standardMeridian);
      if (k.standardMeridian != null && isFinite(mer)) parts.push(mt('basis.meridian', { meridian: meridianLabel(mer), utc: utcLabel(mer) }));
      if (Number(k.dstMinutes)) parts.push(mt('basis.dst', { n: Math.abs(Math.round(Number(k.dstMinutes))) }));
      var kc = root.KoreanCalendar;
      var tc = meta.termClock || null;
      var term = null;
      try {
        if (kc && typeof kc.enclosingNodeTerm === 'function') {
          if (tc) term = kc.enclosingNodeTerm(tc.y != null ? tc.y : tc.year, tc.m != null ? tc.m : tc.month, tc.d != null ? tc.d : tc.day, tc.h != null ? tc.h : (tc.hour || 0), tc.mi != null ? tc.mi : (tc.minute || 0));
          else if (civ) term = kc.enclosingNodeTerm(civ.year, civ.month, civ.day, 12, 0);
        }
      } catch (e) { term = null; }
      if (term && termName(term.index)) parts.push(mt('basis.term', { term: termName(term.index), date: two(term.month) + '-' + two(term.day), time: hm(term.hour, term.minute) }));
      parts.push(tu ? mt('basis.timeUnknown') : mt('basis.nightZi'));
    }
    return '<p class="mxv-basis"><strong class="mxv-basis__label">' + esc(mt('basis.label')) + '</strong> <span class="mxv-basis__text">' + esc(parts.join(' · ')) + '</span></p>';
  }

  /* ── 도구 막대·설정 ───────────────────────────────────── */
  function toolbarHtml(s, ko) {
    var h = '<div class="mxv-toolbar" data-html2canvas-ignore="true"><div class="mxv-toolbar__row">';
    h += '<button type="button" class="mxv-tbtn mxv-settings-toggle" data-mxv-ctl="settings" aria-expanded="' + (state.settingsOpen ? 'true' : 'false') + '" aria-controls="mxvSettings"><span aria-hidden="true">⚙</span> ' + esc(mt('tool.settings')) + '</button>';
    if (ko) h += '<button type="button" class="mxv-tbtn mxv-hanja-toggle" data-mxv-ctl="hanja" aria-pressed="' + (s.showHanja ? 'false' : 'true') + '">' + esc(mt('tool.hideHanja')) + '</button>';
    h += '<div class="mxv-seg" role="group" aria-label="' + esc(mt('tool.unseongGroup')) + '"><span class="mxv-seg__label" aria-hidden="true">' + esc(mt('tool.unseongShort')) + '</span>';
    ['bong', 'geo'].forEach(function (m) {
      h += '<button type="button" class="mxv-seg__btn" data-mxv-unseong="' + m + '" aria-pressed="' + (s.unseongMode === m ? 'true' : 'false') + '">' + esc(mt('tool.' + m)) + '</button>';
    });
    h += '</div>';
    h += '<button type="button" class="mxv-tbtn mxv-save" data-mxv-ctl="save">' + esc(mt('tool.save')) + '</button>';
    h += '</div><p class="mxv-status" role="status" aria-live="polite"></p>';
    h += '<div class="mxv-settings" id="mxvSettings"' + (state.settingsOpen ? '' : ' hidden') + '>';
    h += '<h5 class="mxv-settings__title">' + esc(mt('settings.title')) + '</h5>';
    h += '<fieldset class="mxv-fs"><legend class="mxv-fs__legend">' + esc(mt('settings.cats')) + '</legend><div class="mxv-fs__grid">';
    CATS.forEach(function (c) {
      h += '<label class="mxv-check"><input type="checkbox" data-mxv-cat="' + c + '"' + (catOn(s, c) ? ' checked' : '') + '><span><span aria-hidden="true">' + EMOJI[c] + '</span> ' + esc(catLabel(c)) + '</span></label>';
    });
    h += '</div></fieldset>';
    h += '<label class="mxv-field"><span class="mxv-field__label">' + esc(mt('settings.twelveBasis')) + '</span><select class="mxv-select" data-mxv-ctl="twelveBasis">';
    BASES.forEach(function (b) { h += '<option value="' + b + '"' + (s.twelveBasis === b ? ' selected' : '') + '>' + esc(mt('settings.basis.' + b)) + '</option>'; });
    h += '</select></label>';
    h += '<label class="mxv-check"><input type="checkbox" data-mxv-ctl="expert"' + (s.expertMode ? ' checked' : '') + '><span>' + esc(mt('settings.expert')) + '</span></label>';
    h += '<div class="mxv-rules"' + (s.expertMode ? '' : ' hidden') + '><p class="mxv-note">' + esc(mt('settings.expertNote')) + '</p>';
    RULE_KEYS.forEach(function (k) {
      h += '<label class="mxv-check"><input type="checkbox" data-mxv-rule="' + k + '"' + (s.rules[k] ? ' checked' : '') + '><span>' + esc(mt('rule.' + k)) + '</span></label>';
    });
    h += '</div><div class="mxv-settings__foot"><p class="mxv-note">' + esc(mt('settings.storedNote')) + '</p><button type="button" class="mxv-tbtn" data-mxv-ctl="reset">' + esc(mt('settings.reset')) + '</button></div></div></div>';
    return h;
  }

  /* ── 묶음(배지·칩이 여는 시트의 내용) ─────────────────── */
  function addGroup(g) { state.groups.push(g); return state.groups.length - 1; }
  function groupHits(hits) {
    var map = {};
    var out = [];
    (hits || []).forEach(function (h) {
      if (!h || !h.ruleId) return;
      var g = map[h.ruleId];
      if (!g) {
        g = map[h.ruleId] = { type: 'hit', id: h.ruleId, name: h.name, category: h.category, polarity: h.polarity, items: [] };
        out.push(g);
      }
      g.items.push(h);
    });
    return out;
  }
  function spotOf(node, position) {
    if (NATAL[node.pillar]) return mt('spot', { col: colLabel(node.pillar), pos: mt('posShort.' + (position || node.position || 'branch')) });
    return mt('luckSpot', { scope: mt('luck.' + node.pillar), pos: mt('sheet.pos.' + (position || node.position || 'branch')) });
  }
  /* 원국 칸에는 원국끼리 잡힌 것만 둔다. 세운·월운과 엮인 짝은 운 흐름 띠에서 보여 준다. */
  function natalOnly(hit) {
    if (!hit || hit.luckIndex !== undefined) return false;
    return !(hit.pair && hit.pair.some(function (n) { return n.luckIndex !== undefined; }));
  }
  /* 짝으로 잡힌 신살(원진·귀문·협록 등)은 두 자리를 모두 적는다. */
  function hitSpots(hit, withChar) {
    var nodes = hit.pair && hit.pair.length ? hit.pair : [hit];
    return nodes.map(function (n) { return spotOf(n, hit.position) + (withChar && n.char ? ' ' + n.char : ''); });
  }
  function spotsText(g) {
    var spots = [];
    g.items.forEach(function (it) { hitSpots(it).forEach(function (sp) { if (spots.indexOf(sp) < 0) spots.push(sp); }); });
    return spots.join('·');
  }
  function basisText(item) {
    if (isKo() && item.basis) return String(item.basis);
    var label = item.basisKey ? mt('basisKey.' + item.basisKey) : '';
    return (label + (item.basisChar ? ' ' + item.basisChar : '')).trim();
  }
  function relKind(rel) {
    if (HAP_IDS[rel.ruleId]) return 'hap';
    if (CHUNG_IDS[rel.ruleId]) return 'chung';
    return 'soft';
  }
  function relCols(rel) {
    var seen = {};
    var cols = [];
    (rel.pair || []).forEach(function (n) {
      if (COL_INDEX[n.pillar] == null || seen[n.pillar]) return;
      seen[n.pillar] = 1;
      cols.push(COL_INDEX[n.pillar]);
    });
    return cols.sort(function (a, b) { return a - b; });
  }
  function relColsText(rel) {
    var order = ['hour', 'day', 'month', 'year'];
    return relCols(rel).map(function (i) { return colLabel(order[i]); }).join('·');
  }

  /* ── 원국 표 ──────────────────────────────────────────── */
  function cellAt(row, col, cls, inner, rowEnd, colEnd) {
    var area = row + '/' + col + (rowEnd ? '/' + rowEnd + '/' + (colEnd || col + 1) : (colEnd ? '/' + (row + 1) + '/' + colEnd : ''));
    return '<div class="' + cls + '" role="cell" style="grid-area:' + area + '">' + inner + '</div>';
  }
  function rowHead(row, text, extra) {
    return '<div class="mxv-rowlabel' + (extra ? ' ' + extra : '') + '" role="rowheader" style="grid-area:' + row + '/1">' + esc(text) + '</div>';
  }
  function badgeButton(g, gi, key, cls, tag) {
    var name = hitName(g.id, g.name);
    var h = '<button type="button" class="mxv-badge mxv-badge--' + cls + '" data-mxv-g="' + gi + '" data-mxv-key="' + esc(key) + '" aria-label="' + esc(mt('badgeAria', { name: name })) + '">';
    if (cls !== 'twelve') h += '<span class="mxv-emo" aria-hidden="true">' + EMOJI[cls] + '</span>';
    h += '<span class="mxv-badge__name">' + esc(name) + '</span>';
    if (tag) h += '<span class="mxv-badge__tag">' + esc(tag) + '</span>';
    return h + '</button>';
  }
  function charBox(c, ch, type, pillar, gEl, ko, isDayStem) {
    var G = gan();
    var J = ji();
    var info = type === 'stem' ? G[ch] : J[ch];
    var yy = info && info.y === '+' ? 'yang' : 'yin';
    var yyText = mt('yyEl', { yy: mt('yy.' + yy), el: mt('el.' + (info ? info.e : 'wood')) });
    var aria = mt('charAria.' + type, { pillar: pillarLabel(c.key), char: ch });
    var h = '<div class="char-box bg-' + esc(info ? info.e : 'metal') + '" role="button" tabindex="0" data-manse-char="1" data-char="' + esc(ch) + '" data-char-type="' + type + '" data-gan="' + esc(pillar.g) + '" data-zhi="' + esc(pillar.j) + '" data-pos-label="' + esc(c.legacy) + '" data-is-day-stem="' + (isDayStem ? '1' : '0') + '" aria-label="' + esc(aria) + '">';
    h += '<span class="manse-char-glyph mxv-han mxv-glyph">' + esc(ch) + '</span>';
    if (ko) h += '<span class="mxv-kor">' + esc(readingOf(ch)) + '</span>';
    h += '<span class="mxv-yy">' + esc(yyText) + '</span></div>';
    return h;
  }

  function tableHtml(p, result, s, tu, ko) {
    var dayGan = p.d.g;
    var rows = [];
    var r = 1;
    var R = {};
    R.head = r++; R.stemgod = r++; R.stem = r++; R.branch = r++; R.branchgod = r++; R.hidden = r++; R.unseong = r++; R.nayin = r++;
    var showTwelve = catOn(s, 'twelve');
    var badgeCatsOn = BADGE_CATS.filter(function (c) { return catOn(s, c); });
    if (showTwelve) R.twelve = r++;
    if (badgeCatsOn.length) R.badges = r++;
    var lastNatal = r - 1;
    var natalRels = catOn(s, 'relation') ? (result.relations || []).filter(function (rel) {
      return rel && rel.pair && rel.pair.length && rel.pair.every(function (n) { return NATAL[n.pillar]; }) && relCols(rel).length > 1;
    }) : [];
    if (natalRels.length) R.relation = r++;

    var h = '<div class="mxv-table" role="table" aria-label="' + esc(mt('tableLabel')) + '">';
    h += '<div class="mxv-dayband" aria-hidden="true" style="grid-area:1/3/' + (lastNatal + 1) + '/4"></div>';

    // 머리 줄
    h += '<div class="mxv-row mxv-row--head" role="row"><div class="mxv-corner" role="columnheader" style="grid-area:1/1"><span class="mxv-vh">' + esc(mt('row.head')) + '</span></div>';
    COLS.forEach(function (c) {
      h += '<div class="mxv-col' + (c.key === 'day' ? ' mxv-col--day' : '') + '" role="columnheader" style="grid-area:1/' + c.col + '">';
      if (c.key === 'day') h += '<span class="mxv-daystar" role="img" aria-label="' + esc(mt('dayStarLabel')) + '">★</span>';
      h += '<span class="mxv-col__name">' + esc(colLabel(c.key)) + '</span><span class="mxv-han mxv-col__han" aria-hidden="true">' + c.han + '</span></div>';
    });
    h += '</div>';

    var visible = COLS.filter(function (c) { return !(tu && c.key === 'hour'); });
    function row(name, label, build, extraCls) {
      var out = '<div class="mxv-row mxv-row--' + name + '" role="row">' + rowHead(R[name], label, extraCls);
      if (name === 'stemgod' && tu) out += cellAt(R.stemgod, 2, 'mxv-cell mxv-cell--unknown', '<span>' + esc(mt('timeUnknown')) + '</span>', lastNatal + 1, 3);
      visible.forEach(function (c) { out += build(c); });
      return out + '</div>';
    }
    function dayCls(c) { return c.key === 'day' ? ' mxv-cell--day' : ''; }

    rows.push(row('stemgod', mt('row.tenGod'), function (c) {
      var t = c.key === 'day' ? mt('dayMaster') : tenGod(dayGan, p[c.p].g);
      return cellAt(R.stemgod, c.col, 'mxv-cell mxv-cell--god' + dayCls(c), '<span class="mxv-god' + (c.key === 'day' ? ' mxv-god--day' : '') + '">' + esc(t) + '</span>');
    }, 'mxv-rowlabel--minor'));
    rows.push(row('stem', mt('row.stem'), function (c) {
      return cellAt(R.stem, c.col, 'mxv-cell mxv-cell--char' + dayCls(c), charBox(c, p[c.p].g, 'stem', p[c.p], null, ko, c.key === 'day'));
    }));
    rows.push(row('branch', mt('row.branch'), function (c) {
      return cellAt(R.branch, c.col, 'mxv-cell mxv-cell--char' + dayCls(c), charBox(c, p[c.p].j, 'branch', p[c.p], null, ko, false));
    }));
    rows.push(row('branchgod', mt('row.tenGod'), function (c) {
      return cellAt(R.branchgod, c.col, 'mxv-cell mxv-cell--god' + dayCls(c), '<span class="mxv-god">' + esc(tenGod(dayGan, p[c.p].j)) + '</span>');
    }, 'mxv-rowlabel--minor'));
    rows.push(row('hidden', mt('row.hidden'), function (c) {
      var pil = (result.pillars && result.pillars[c.key]) || {};
      var hs = (pil.hiddenStems || []).map(function (ch) {
        return '<span class="mxv-hs"><span class="mxv-hs__ch"><span class="mxv-han">' + esc(ch) + '</span>' + (ko ? '<span class="mxv-alt">' + esc(readingOf(ch)) + '</span>' : '') + '</span><small class="mxv-hs__god">' + esc(tenGod(dayGan, ch)) + '</small></span>';
      }).join('');
      return cellAt(R.hidden, c.col, 'mxv-cell mxv-cell--hidden' + dayCls(c), hs || '<span class="mxv-dash">—</span>');
    }));
    rows.push(row('unseong', mt('row.unseong'), function (c) {
      var pil = (result.pillars && result.pillars[c.key]) || {};
      var u = pil.unseong ? String(pil.unseong.selected || '') : '';
      return cellAt(R.unseong, c.col, 'mxv-cell mxv-cell--text' + dayCls(c), esc(ko ? u : (UNSEONG_HAN[u] || u)) || '—');
    }));
    rows.push(row('nayin', mt('row.nayin'), function (c) {
      var pil = (result.pillars && result.pillars[c.key]) || {};
      var n = String(pil.nayin || '');
      return cellAt(R.nayin, c.col, 'mxv-cell mxv-cell--text' + dayCls(c), esc(ko ? n : (NAYIN_HAN[n] || n)) || '—');
    }));
    if (showTwelve) {
      rows.push(row('twelve', mt('row.twelve'), function (c) {
        var groups = groupHits(((result.perPillar && result.perPillar[c.key]) || []).filter(function (x) { return natalOnly(x) && x.category === 'twelve'; }));
        var inner = groups.map(function (g) {
          var seen = {};
          var tags = [];
          g.items.forEach(function (it) { var t = it.basisKey ? mt('basisKey.' + it.basisKey) : ''; if (t && !seen[t]) { seen[t] = 1; tags.push(t); } });
          return badgeButton(g, addGroup(g), 't:' + c.key + ':' + g.id, 'twelve', tags.join('·'));
        }).join('');
        return cellAt(R.twelve, c.col, 'mxv-cell mxv-cell--badges' + dayCls(c), inner || '<span class="mxv-dash">—</span>');
      }));
    }
    if (badgeCatsOn.length) {
      rows.push(row('badges', mt('row.badges'), function (c) {
        var groups = groupHits(((result.perPillar && result.perPillar[c.key]) || []).filter(function (x) { return natalOnly(x) && badgeCatsOn.indexOf(x.category) >= 0; }));
        groups.sort(function (a, b) { return BADGE_CATS.indexOf(a.category) - BADGE_CATS.indexOf(b.category); });
        var idx = groups.map(function (g) { return addGroup(g); });
        var inner = '';
        groups.slice(0, MAX_BADGES).forEach(function (g, i) { inner += badgeButton(g, idx[i], 'b:' + c.key + ':' + g.id, g.category, ''); });
        if (groups.length > MAX_BADGES) {
          var extra = groups.length - MAX_BADGES;
          var li = addGroup({ type: 'list', pillar: c.key, children: idx });
          inner += '<button type="button" class="mxv-more" data-mxv-g="' + li + '" data-mxv-key="m:' + c.key + '" aria-label="' + esc(mt('moreAria', { pillar: pillarLabel(c.key), n: extra })) + '">+' + extra + '</button>';
        }
        return cellAt(R.badges, c.col, 'mxv-cell mxv-cell--badges' + dayCls(c), inner || '<span class="mxv-dash">—</span>');
      }));
    }
    h += rows.join('');
    if (natalRels.length) {
      h += '<div class="mxv-row mxv-row--relation" role="row">' + rowHead(R.relation, mt('row.relation'));
      var chips = natalRels.map(function (rel, i) {
        var gi = addGroup({ type: 'rel', rel: rel });
        return '<button type="button" class="mxv-relchip mxv-rel--' + relKind(rel) + '" data-mxv-g="' + gi + '" data-mxv-key="l:' + i + '" aria-label="' + esc(mt('badgeAria', { name: hitName(rel.ruleId, rel.name) })) + '"><strong>' + esc(hitName(rel.ruleId, rel.name)) + '</strong><small>' + esc(relColsText(rel)) + '</small></button>';
      }).join('');
      h += cellAt(R.relation, 2, 'mxv-cell mxv-cell--relation', relSvg(natalRels, tu) + '<div class="mxv-relchips">' + chips + '</div>', R.relation + 1, 6);
      h += '</div>';
    }
    return h + '</div>';
  }

  function relSvg(rels) {
    var items = rels.map(function (rel) { var cols = relCols(rel); return { rel: rel, cols: cols, min: cols[0], max: cols[cols.length - 1], level: 0 }; });
    var order = items.slice().sort(function (a, b) { return (a.max - a.min) - (b.max - b.min) || a.min - b.min; });
    var levels = [];
    order.forEach(function (it) {
      var L = 0;
      while (levels[L] && levels[L].some(function (o) { return it.min <= o.max && o.min <= it.max; })) L++;
      if (!levels[L]) levels[L] = [];
      levels[L].push(it);
      it.level = L;
    });
    var y0 = 6;
    var step = 10;
    var H = y0 + 8 + Math.max(0, levels.length - 1) * step + 8;
    var paths = '';
    var dots = {};
    items.forEach(function (it) {
      var peak = y0 + 8 + it.level * step;
      var cy = 2 * peak - y0;
      for (var k = 0; k < it.cols.length - 1; k++) {
        var x1 = 12.5 + 25 * it.cols[k];
        var x2 = 12.5 + 25 * it.cols[k + 1];
        paths += '<path class="mxv-arc mxv-arc--' + relKind(it.rel) + '" d="M' + x1 + ' ' + y0 + 'Q' + ((x1 + x2) / 2) + ' ' + cy + ' ' + x2 + ' ' + y0 + '"/>';
      }
      it.cols.forEach(function (c) { dots[c] = 1; });
    });
    Object.keys(dots).forEach(function (c) {
      paths += '<path class="mxv-arc-dot" d="M' + (12.5 + 25 * Number(c)) + ' ' + y0 + 'h0"/>';
    });
    return '<svg class="mxv-arcs" viewBox="0 0 100 ' + H + '" preserveAspectRatio="none" style="height:' + H + 'px" aria-hidden="true" focusable="false">' + paths + '</svg>';
  }

  /* ── 오행 막대 ───────────────────────────────────────── */
  function barsHtml(p) {
    var c = core();
    var counts = null;
    try { counts = c && typeof c.surfaceElementCounts === 'function' ? (c.surfaceElementCounts(p) || {}).counts : null; } catch (e) { counts = null; }
    if (!counts) return '';
    var total = 0;
    ELEMENTS.forEach(function (e) { total += Number(counts[e]) || 0; });
    if (!total) return '';
    var h = '<div class="mxv-bars" aria-hidden="true">';
    ELEMENTS.forEach(function (e) {
      var n = Number(counts[e]) || 0;
      h += '<div class="mxv-bar mxv-bar--' + e + '"><span class="mxv-bar__name">' + esc(mt('el.' + e)) + '</span><span class="mxv-bar__track"><span class="mxv-bar__fill" style="width:' + Math.round(n / total * 100) + '%"></span></span><span class="mxv-bar__n">' + n + '</span></div>';
    });
    return h + '</div>';
  }

  /* ── 신살 요약 ───────────────────────────────────────── */
  /* 말하는 캐릭터. 사주 풀이와 같은 화자 얼굴(CdSajuSpeaker: 상반신 그림에서 얼굴만 잘라 둥근 48px 틀)을 쓰고,
     번들이 없을 때만 예전 160px 컷아웃을 48px 고정 틀에 담는다.
     #manseShinsalList 가 aria-live 라 얼굴은 장식(alt="")으로 두고 이름은 말풍선 글자로 읽힌다. */
  var SPEAKERS = {
    yeoni: { src: '/images/saju/yeoni-clue-160.webp', name: 'sum.yeoniName' },
    nyang: { src: '/images/saju/yeongnyangi-160.webp', name: 'sum.nyangName' }
  };
  function sayFace(who) {
    var kit = root.CdSajuSpeaker;
    if (kit && typeof kit.faceHtml === 'function') return kit.faceHtml({ who: who, size: 48 });
    return '<span class="mxv-say__face" aria-hidden="true"><img src="' + SPEAKERS[who].src + '" alt="" width="160" height="160" loading="eager" decoding="async"></span>';
  }
  function sayHtml(who, inner) {
    return '<div class="mxv-say mxv-say--' + who + '">' + sayFace(who) +
      '<div class="mxv-say__bubble"><strong class="mxv-say__who">' + esc(mt(SPEAKERS[who].name)) + '</strong>' + inner + '</div></div>';
  }
  function sayText(text) { return '<p class="mxv-say__text">' + esc(text) + '</p>'; }
  function summaryHtml(result, s) {
    var natalHits = (result.hits || []).filter(function (x) { return NATAL[x.pillar] && natalOnly(x) && catOn(s, x.category); });
    var groups = groupHits(natalHits);
    var rels = catOn(s, 'relation') ? (result.relations || []).filter(function (rel) {
      return rel && rel.pair && rel.pair.every(function (n) { return NATAL[n.pillar]; });
    }) : [];
    if (!groups.length && !rels.length) return '<p class="manse-shinsal__empty">' + esc(mt('sum.empty')) + '</p>';
    var byCat = {};
    groups.forEach(function (g) { (byCat[g.category] = byCat[g.category] || []).push(g); });
    var h = sayHtml('yeoni', sayText(mt('sum.yeoni', { n: groups.length + rels.length })));
    h += '<ul class="mxv-legend">';
    CATS.forEach(function (c) {
      var n = c === 'relation' ? rels.length : (byCat[c] || []).length;
      if (!catOn(s, c) || !n) return;
      h += '<li class="mxv-legend__item mxv-legend__item--' + c + '"><span aria-hidden="true">' + EMOJI[c] + '</span> ' + esc(catLabel(c)) + ' <strong>' + n + '</strong></li>';
    });
    h += '</ul>';
    var body = '';
    CATS.forEach(function (c) {
      if (!catOn(s, c)) return;
      var chips = '';
      if (c === 'relation') {
        rels.forEach(function (rel, i) {
          var gi = addGroup({ type: 'rel', rel: rel });
          state.lines.push(gi);
          chips += '<button type="button" class="mxv-chip mxv-chip--relation" data-mxv-g="' + gi + '" data-mxv-key="r:' + i + '"><strong>' + esc(hitName(rel.ruleId, rel.name)) + '</strong><small>' + esc(relColsText(rel)) + '</small></button>';
        });
      } else {
        (byCat[c] || []).forEach(function (g) {
          var gi = addGroup(g);
          state.lines.push(gi);
          chips += '<button type="button" class="mxv-chip mxv-chip--' + c + '" data-mxv-g="' + gi + '" data-mxv-key="s:' + esc(g.id) + '"><strong>' + esc(hitName(g.id, g.name)) + '</strong><small>' + esc(spotsText(g)) + '</small></button>';
        });
      }
      if (!chips) return;
      body += '<div class="mxv-group mxv-group--' + c + '"><h5 class="mxv-group__title"><span aria-hidden="true">' + EMOJI[c] + '</span> ' + esc(catLabel(c)) + '</h5><div class="mxv-chips">' + chips + '</div></div>';
    });
    if (state.lines.length) h += linesBlockHtml();
    h += body;
    h += sayHtml('nyang', sayText(mt('sum.nyang')));
    return h;
  }

  /* ── 한 줄 설명 펼쳐 보기 ─────────────────────────────── */
  /* 공유 이미지(#sajuCard 캡처)에는 넣지 않는다: 펼침 상태에 따라 이미지 길이가 달라지지 않게 한다. */
  function linesBlockHtml() {
    var open = !!state.expanded;
    var h = '<button type="button" class="mxv-tbtn mxv-expand" data-mxv-ctl="expand" aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="mxvShinsalLines" data-html2canvas-ignore="true">';
    h += '<span class="mxv-expand__label">' + esc(mt(open ? 'sum.collapse' : 'sum.expand')) + '</span><span class="mxv-expand__icon" aria-hidden="true"></span></button>';
    return h + '<div id="mxvShinsalLines" class="mxv-lines" aria-live="off" data-html2canvas-ignore="true"' + (open ? '' : ' hidden') + '>' + (open ? linesInner() : '') + '</div>';
  }
  /* 원국 자리의 뜻: 천간·지지 자리는 그 칸의 궁위(일간 = 나 자신, 일지 = 배우자·가까운 관계 …), 간지 전체는 기둥 뜻. */
  function posMeaning(pillar, pos) {
    var side = pos === 'stem' ? 'Stem' : pos === 'branch' ? 'Branch' : '';
    return mt('posMean.' + pillar + side);
  }
  /* 신살 한 개가 잡힌 자리들. 원국 기둥이면 자리의 뜻을 붙이고, 운 자리·관계는 뜻 없이 둔다. */
  function placesOf(items, position, withMeaning, withChar) {
    var seen = {};
    var out = [];
    items.forEach(function (it) {
      var nodes = it.pair && it.pair.length ? it.pair : [it];
      nodes.forEach(function (n) {
        var spot = spotOf(n, position || it.position) + (withChar && n.char ? ' ' + n.char : '');
        if (seen[spot]) return;
        seen[spot] = 1;
        out.push({ spot: spot, mean: withMeaning && NATAL[n.pillar] ? posMeaning(n.pillar, position || it.position || n.position || 'branch') : '' });
      });
    });
    return out;
  }
  function lineRow(g, ko, showHan) {
    if (!g) return '';
    var rel = g.type === 'rel' ? g.rel : null;
    var id = rel ? rel.ruleId : g.id;
    var cat = rel ? 'relation' : g.category;
    var c = ko ? copyFor(id) : null;
    var short = ko ? (c && c.short) || '' : mt('shinsal.' + id + '.short', null, '');
    var han = ko && showHan && c && c.hanja ? c.hanja : '';
    var h = '<li class="mxv-line mxv-line--' + esc(cat) + '"><p class="mxv-line__head"><strong class="mxv-line__name">' + esc(rel ? hitName(rel.ruleId, rel.name) : hitName(g.id, g.name)) + '</strong>';
    if (han) h += '<span class="mxv-han mxv-line__han">' + esc(han) + '</span>';
    h += '</p>';
    var places = rel ? placesOf([rel], rel.position, false, false) : placesOf(g.items, null, true, false);
    if (rel) {
      h += '<p class="mxv-line__where"><span class="mxv-line__place"><strong class="mxv-line__spot">' + esc(places.map(function (p) { return p.spot; }).join(' · ')) + '</strong></span></p>';
    } else {
      h += '<p class="mxv-line__where">' + places.map(function (p) {
        return '<span class="mxv-line__place"><strong class="mxv-line__spot">' + esc(p.spot) + '</strong>' + (p.mean ? ' <span class="mxv-line__mean">' + esc(p.mean) + '</span>' : '') + '</span>';
      }).join('') + '</p>';
    }
    if (short) h += '<p class="mxv-line__short">' + esc(short) + '</p>';
    return h + '</li>';
  }
  function linesInner() {
    var ko = isKo();
    var h = '';
    if (ko && !root.SajuShinsalCopy) {
      // 한국어 한 줄 설명은 처음 펼칠 때만 불러온다. 실패하면 이름과 자리만 남긴다.
      if (!state.linesFailed) ensureCopy().then(fillLines, function () { state.linesFailed = true; fillLines(); });
      h += '<p class="mxv-lines__note" role="status">' + esc(mt(state.linesFailed ? 'sum.linesFailed' : 'sum.linesLoading')) + '</p>';
    }
    var showHan = settings().showHanja;
    h += '<ul class="mxv-lines__list" aria-label="' + esc(mt('sum.linesLabel')) + '">';
    state.lines.forEach(function (gi) { h += lineRow(state.groups[gi], ko, showHan); });
    return h + '</ul>';
  }
  function fillLines() {
    var box = doc.getElementById('mxvShinsalLines');
    if (box && state.expanded) box.innerHTML = linesInner();
  }
  function toggleLines(btn) {
    state.expanded = !state.expanded;
    if (state.expanded) state.linesFailed = false;
    btn.setAttribute('aria-expanded', state.expanded ? 'true' : 'false');
    var label = btn.querySelector('.mxv-expand__label');
    if (label) label.textContent = mt(state.expanded ? 'sum.collapse' : 'sum.expand');
    var box = doc.getElementById('mxvShinsalLines');
    if (!box) return;
    if (state.expanded) { box.removeAttribute('hidden'); fillLines(); } else { box.setAttribute('hidden', ''); box.innerHTML = ''; }
  }

  /* ── 운 흐름 ─────────────────────────────────────────── */
  function luckHtml(result, luck, s, tu, allowed, ko) {
    var perLuck = (result.perPillar && result.perPillar.luck) || [];
    function itemsFor(scope) { return perLuck.filter(function (x) { return x && x.pillar === scope; }); }
    function relsFor(scope, index) {
      if (!catOn(s, 'relation')) return [];
      return (result.relations || []).filter(function (rel) {
        return rel && rel.pair && rel.pair.some(function (n) { return n.pillar === scope && n.luckIndex === index; });
      });
    }
    function ganjiHtml(gz) {
      return '<span class="mxv-han">' + esc(gz) + '</span>' + (ko ? '<span class="mxv-read">' + esc(readingOf(gz)) + '</span>' : '');
    }
    function strip(scope, rows, labelOf, isNow) {
      var items = itemsFor(scope);
      var out = '<ul class="mxv-strip">';
      rows.forEach(function (row, index) {
        var item = null;
        for (var i = 0; i < items.length; i++) if (items[i].index === index) { item = items[i]; break; }
        var gz = row.stem + row.branch;
        var hits = item ? (item.hits || []).filter(function (x) { return catOn(s, x.category); }) : [];
        var groups = groupHits(hits);
        var rels = relsFor(scope, index);
        var label = labelOf(row);
        var children = groups.map(function (g) { return addGroup(g); });
        var relChildren = rels.map(function (rel) { return addGroup({ type: 'rel', rel: rel }); });
        var gi = addGroup({ type: 'luck', label: label, ganji: gz, children: children, rels: relChildren });
        var now = isNow(row);
        out += '<li class="mxv-strip__li"><button type="button" class="mxv-luckitem' + (now ? ' mxv-now' : '') + '" data-mxv-g="' + gi + '" data-mxv-luck="' + scope + ':' + index + '"' + (now ? ' aria-current="true"' : '') + ' aria-label="' + esc(mt('luck.itemAria', { label: label, ganji: gz + (ko ? ' ' + readingOf(gz) : '') })) + '">';
        out += '<span class="mxv-luckitem__label">' + esc(label) + '</span><span class="mxv-luckitem__gz">' + ganjiHtml(gz) + '</span><span class="mxv-luckitem__count">' + esc(mt('luck.count', { n: groups.length + rels.length })) + '</span>';
        if (now) out += '<span class="mxv-luckitem__now">' + esc(mt('luck.now')) + '</span>';
        out += '</button></li>';
      });
      return out + '</ul>';
    }
    var yearNow = luck.now ? luck.now.now.y : new Date().getFullYear();
    var h = '<h4 class="mxv-luck__title" id="manseLuckTitle">' + esc(mt('luck.title')) + '</h4><p class="mxv-luck__hint">' + esc(mt('luck.hint')) + '</p>';
    h += '<div class="mxv-luck__group"><h5 class="mxv-luck__sub">' + esc(mt('luck.daewoon')) + '</h5>';
    if (tu) h += '<p class="mxv-luck__empty">' + esc(mt('luck.daewoonTimeUnknown')) + '</p>';
    else if (!allowed) h += '<p class="mxv-luck__empty">' + esc(mt('luck.daewoonLocked')) + '</p>';
    else if (!luck.daewoon.length) h += '<p class="mxv-luck__empty">' + esc(mt('luck.daewoonEmpty')) + '</p>';
    else h += strip('daewoon', luck.daewoon, function (r) { return mt('luck.age', { n: r.age }); }, function (r) { return r.startYear <= yearNow && yearNow <= r.endYear; });
    h += '</div>';
    h += '<div class="mxv-luck__group"><h5 class="mxv-luck__sub">' + esc(mt('luck.sewoon')) + '</h5>';
    h += strip('sewoon', luck.sewoon, function (r) { return mt('luck.year', { n: r.year }); }, function (r) { return luck.now && r.year === luck.now.year; });
    h += '</div>';
    if (luck.wolwoon.length) {
      h += '<div class="mxv-luck__group"><h5 class="mxv-luck__sub">' + esc(mt('luck.wolwoon')) + '</h5>';
      h += strip('wolwoon', luck.wolwoon, function (r) { return mt('luck.month', { term: termName(r.term.index), date: two(r.term.month) + '-' + two(r.term.day) }); }, function (r) { return luck.now && luck.now.monthIndex === r.month - 1; });
      h += '</div>';
    }
    return h + '<p class="mxv-luck__note">' + esc(mt('luck.note')) + '</p>';
  }
  function centerNow(container) {
    if (!container) return;
    var strips = container.querySelectorAll('.mxv-strip');
    for (var i = 0; i < strips.length; i++) {
      var cur = strips[i].querySelector('.mxv-now');
      if (!cur) continue;
      var li = cur.parentNode;
      try { strips[i].scrollLeft = Math.max(0, li.offsetLeft - (strips[i].clientWidth - li.offsetWidth) / 2); } catch (e) { /* 스크롤 실패는 무시 */ }
    }
  }

  /* ── 렌더 ─────────────────────────────────────────────── */
  function undo() {
    var g = gridEl();
    if (g) { g.classList.remove('mxv-host'); g.classList.remove('mxv-nohan'); }
    var list = doc.getElementById('manseShinsalList');
    if (list) list.classList.remove('mxv-sumhost');
    var luck = doc.getElementById('manseLuck');
    if (luck && luck.parentNode) luck.parentNode.removeChild(luck);
    closeSheet(false);
  }

  function render(p, opts) {
    try {
      var c = core();
      var G = gan();
      var J = ji();
      var grid = gridEl();
      if (!c || typeof c.computeShinsal !== 'function' || typeof root.getTenGod !== 'function' || !G || !J || !grid || !p) { undo(); return false; }
      var keys = ['y', 'm', 'd'];
      for (var i = 0; i < keys.length; i++) { var x = p[keys[i]]; if (!x || !G[x.g] || !J[x.j]) { undo(); return false; } }
      var tu = root.__cdSajuTimeUnknown === true || !p.h || !G[p.h.g] || !J[p.h.j];
      var s = settings();
      var ko = isKo();
      var allowed = daewoonAllowed();
      var luck = buildLuck(tu, allowed);
      var input = { y: { g: p.y.g, j: p.y.j }, m: { g: p.m.g, j: p.m.j }, d: { g: p.d.g, j: p.d.j }, h: tu ? { g: '', j: '' } : { g: p.h.g, j: p.h.j }, timeUnknown: tu, luckRows: luck.rows };
      var result = compute(c, input, engineOptions(s));
      if (!result || !result.valid) { undo(); return false; }

      closeSheet(false);
      state.groups = [];
      state.lines = [];
      var gridHtml = basisHtml(tu) + toolbarHtml(s, ko) + tableHtml(p, result, s, tu, ko);
      var sumHtml = summaryHtml(result, s);
      var lHtml = luckHtml(result, luck, s, tu, allowed, ko);
      var basisNote = mt('sum.basisNote', { basis: mt('settings.basis.' + s.twelveBasis) });
      var nohan = ko && !s.showHanja;

      state.lastP = p;
      state.allowed = allowed;
      grid.innerHTML = gridHtml;
      grid.classList.add('mxv-host');
      grid.classList.toggle('mxv-nohan', nohan);
      if (typeof root.bindManseCharTap === 'function') root.bindManseCharTap(grid);
      bind(grid);

      var slot = doc.querySelector('#sajuCard .saju-manse-slot');
      var sk = doc.getElementById('sajuManseSkeleton');
      if (slot) slot.classList.add('saju-manse-slot--ready');
      if (sk) sk.setAttribute('hidden', '');

      try { if (typeof root.renderManseEvidence === 'function') root.renderManseEvidence(p); } catch (e) { /* 근거 영역 실패는 표를 막지 않는다 */ }
      var countsEl = doc.querySelector('#manseEvidence .manse-evidence__counts');
      if (countsEl && countsEl.parentNode) {
        var old = countsEl.parentNode.querySelector('.mxv-bars');
        if (old) old.parentNode.removeChild(old);
        var bars = barsHtml(p);
        if (bars) countsEl.insertAdjacentHTML('afterend', bars);
      }

      var list = doc.getElementById('manseShinsalList');
      if (list) { list.innerHTML = sumHtml; list.classList.add('mxv-sumhost'); bind(list); }
      var basisEl = doc.getElementById('manseShinsalBasis');
      if (basisEl) basisEl.textContent = basisNote;

      var shinsalSec = doc.querySelector('#sajuCard .manse-shinsal');
      var luckEl = doc.getElementById('manseLuck');
      if (shinsalSec && shinsalSec.parentNode) {
        if (!luckEl) {
          luckEl = doc.createElement('section');
          luckEl.id = 'manseLuck';
          luckEl.className = 'mxv-luck';
          luckEl.setAttribute('aria-labelledby', 'manseLuckTitle');
        }
        if (luckEl.previousElementSibling !== shinsalSec) shinsalSec.parentNode.insertBefore(luckEl, shinsalSec.nextSibling);
        luckEl.innerHTML = lHtml;
        luckEl.classList.toggle('mxv-nohan', nohan);
        bind(luckEl);
        centerNow(luckEl);
      }
      return true;
    } catch (err) {
      try { undo(); } catch (e) { /* 되돌리기 실패도 기존 표에 맡긴다 */ }
      try { if (root.console && root.console.warn) root.console.warn('[manse-view] fallback to legacy table', err); } catch (e) { /* noop */ }
      return false;
    }
  }

  function rerender(focusSel) {
    if (!state.lastP) return;
    var grid = gridEl();
    if (!grid || !grid.classList.contains('mxv-host')) return;
    if (render(state.lastP) === false) {
      if (typeof root.renderManse === 'function') { try { root.renderManse(state.lastP); } catch (e) { /* noop */ } }
      return;
    }
    if (focusSel) {
      var n = doc.querySelector('#manseGrid ' + focusSel) || doc.querySelector('#manseLuck ' + focusSel) || doc.querySelector('#manseShinsalList ' + focusSel);
      if (n && n.focus) { try { n.focus(); } catch (e) { /* noop */ } }
    }
  }

  /* ── 이벤트 ───────────────────────────────────────────── */
  var KEY_ATTRS = ['data-mxv-key', 'data-mxv-luck', 'data-mxv-ctl', 'data-mxv-cat', 'data-mxv-rule', 'data-mxv-unseong'];
  function focusSelector(el) {
    if (!el || !el.getAttribute) return '';
    for (var i = 0; i < KEY_ATTRS.length; i++) {
      var v = el.getAttribute(KEY_ATTRS[i]);
      if (v != null) return '[' + KEY_ATTRS[i] + '="' + String(v).replace(/["\\]/g, '\\$&') + '"]';
    }
    return '';
  }
  function updateSettings(fn, el) {
    var s = sanitize(JSON.parse(JSON.stringify(settings())));
    fn(s);
    state.settings = sanitize(s);
    saveSettings(state.settings);
    rerender(focusSelector(el));
  }
  function setStatus(key) {
    var g = gridEl();
    var st = g && g.querySelector('.mxv-status');
    if (st) st.textContent = key ? mt(key) : '';
  }
  function onClick(e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    var ctl = t.closest('[data-mxv-ctl]');
    if (ctl && ctl.tagName === 'BUTTON') {
      var k = ctl.getAttribute('data-mxv-ctl');
      if (k === 'settings') {
        state.settingsOpen = !state.settingsOpen;
        ctl.setAttribute('aria-expanded', state.settingsOpen ? 'true' : 'false');
        var panel = doc.getElementById('mxvSettings');
        if (panel) { if (state.settingsOpen) panel.removeAttribute('hidden'); else panel.setAttribute('hidden', ''); }
      } else if (k === 'hanja') {
        updateSettings(function (s) { s.showHanja = !s.showHanja; }, ctl);
      } else if (k === 'reset') {
        updateSettings(function (s) { var d = sanitize(null); Object.keys(d).forEach(function (key) { s[key] = d[key]; }); }, ctl);
      } else if (k === 'save') {
        saveImage();
      } else if (k === 'expand') {
        toggleLines(ctl);
      }
      return;
    }
    var seg = t.closest('[data-mxv-unseong]');
    if (seg) {
      var mode = seg.getAttribute('data-mxv-unseong');
      updateSettings(function (s) { s.unseongMode = mode; }, seg);
      return;
    }
    var gb = t.closest('[data-mxv-g]');
    if (gb) {
      var gi = Number(gb.getAttribute('data-mxv-g'));
      if (state.groups[gi]) openSheet(gi, gb);
    }
  }
  function onChange(e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    var cat = t.getAttribute('data-mxv-cat');
    if (cat) { updateSettings(function (s) { s.cats[cat] = !!t.checked; }, t); return; }
    var rule = t.getAttribute('data-mxv-rule');
    if (rule) { updateSettings(function (s) { s.rules[rule] = !!t.checked; }, t); return; }
    var ctl = t.getAttribute('data-mxv-ctl');
    if (ctl === 'expert') updateSettings(function (s) { s.expertMode = !!t.checked; }, t);
    else if (ctl === 'twelveBasis') updateSettings(function (s) { s.twelveBasis = t.value; }, t);
  }
  function bind(el) {
    if (!el || el.__mxvBound) return;
    el.__mxvBound = true;
    el.addEventListener('click', onClick);
    el.addEventListener('change', onChange);
  }

  /* ── 스크립트 지연 로드 ──────────────────────────────── */
  function ensureScript(src, globalName) {
    if (root[globalName]) return Promise.resolve(root[globalName]);
    return new Promise(function (resolve, reject) {
      function done() { if (root[globalName]) resolve(root[globalName]); else reject(new Error('missing ' + globalName)); }
      try {
        if (typeof root.__cdLoadScriptOnce === 'function') {
          var pr = root.__cdLoadScriptOnce(src);
          if (pr && typeof pr.then === 'function') { pr.then(done, reject); return; }
        }
      } catch (e) { /* 아래 태그 주입으로 넘어간다 */ }
      var sc = doc.createElement('script');
      sc.src = src;
      sc.async = true;
      sc.onload = done;
      sc.onerror = function () { reject(new Error('load failed ' + src)); };
      (doc.head || doc.documentElement).appendChild(sc);
    });
  }
  var copyPromise = null;
  function ensureCopy() {
    if (root.SajuShinsalCopy) return Promise.resolve(root.SajuShinsalCopy);
    if (!copyPromise) {
      copyPromise = ensureScript(COPY_SRC, 'SajuShinsalCopy').then(null, function (e) { copyPromise = null; throw e; });
    }
    return copyPromise;
  }
  function copyFor(id) {
    var lib = root.SajuShinsalCopy;
    try { return lib && typeof lib.getShinsalCopy === 'function' ? lib.getShinsalCopy(id) : null; } catch (e) { return null; }
  }

  /* ── 이미지 저장 ─────────────────────────────────────── */
  function saveImage() {
    var g = gridEl();
    if (!g) return;
    setStatus('tool.saving');
    ensureScript(SHARE_SRC, 'cdRenderElementToPngBlob').then(function () {
      if (typeof root.cdRenderElementToPngBlob !== 'function' || typeof root.cdShareImageBlob !== 'function') { setStatus('tool.saveFailed'); return; }
      var de = doc.documentElement;
      g.classList.add('mxv-capturing');
      de.classList.add('mxv-capture-run');
      root.cdRenderElementToPngBlob(g, function (blob) {
        var bg = '';
        try { bg = root.getComputedStyle(g).backgroundColor; } catch (e) { /* noop */ }
        g.classList.remove('mxv-capturing');
        de.classList.remove('mxv-capture-run');
        if (!blob) { setStatus('tool.saveFailed'); return; }
        padPng(blob, bg, function (out) {
          try { root.cdShareImageBlob(out, { fileName: 'manse.png', title: mt('tool.shareTitle') }); setStatus('tool.ready'); } catch (e) { setStatus('tool.saveFailed'); }
        });
      });
    }, function () { setStatus('tool.saveFailed'); });
  }
  // 저장 이미지 둘레에 바탕색 여백(화면 16px, 2배율)을 붙인다. 실패하면 원본을 그대로 넘긴다.
  function padPng(blob, bg, cb) {
    var pad = 32;
    var url = '';
    var done = function (out) { if (url) { try { root.URL.revokeObjectURL(url); } catch (e) { /* noop */ } } cb(out || blob); };
    try {
      url = root.URL.createObjectURL(blob);
      var img = new root.Image();
      img.onload = function () {
        try {
          var c = doc.createElement('canvas');
          c.width = img.naturalWidth + pad * 2;
          c.height = img.naturalHeight + pad * 2;
          var ctx = c.getContext('2d');
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); }
          ctx.drawImage(img, pad, pad);
          c.toBlob(function (b) { done(b); }, 'image/png');
        } catch (e) { done(null); }
      };
      img.onerror = function () { done(null); };
      img.src = url;
    } catch (e) { done(null); }
  }

  /* ── 바텀시트 ─────────────────────────────────────────── */
  var sheet = null;
  function ensureSheet() {
    if (sheet && sheet.el.parentNode) return sheet;
    var el = doc.createElement('div');
    el.className = 'mxv-sheet';
    el.setAttribute('hidden', '');
    el.innerHTML = '<div class="mxv-sheet__backdrop" data-mxv-close="1"></div>' +
      '<div class="mxv-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="mxvSheetTitle" tabindex="-1">' +
      '<div class="mxv-sheet__head"><button type="button" class="mxv-sheet__back" data-mxv-back="1" hidden></button>' +
      '<h3 class="mxv-sheet__title" id="mxvSheetTitle"></h3>' +
      '<button type="button" class="mxv-sheet__close" data-mxv-close="1"></button></div>' +
      '<div class="mxv-sheet__body"></div></div>';
    doc.body.appendChild(el);
    sheet = {
      el: el,
      panel: el.querySelector('.mxv-sheet__panel'),
      title: el.querySelector('.mxv-sheet__title'),
      body: el.querySelector('.mxv-sheet__body'),
      back: el.querySelector('.mxv-sheet__back'),
      close: el.querySelector('.mxv-sheet__close'),
      stack: [],
      opener: null,
      openerKey: '',
      token: 0
    };
    el.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target : null;
      if (!t) return;
      if (t.closest('[data-mxv-close]')) { closeSheet(true); return; }
      if (t.closest('[data-mxv-back]')) { if (sheet.stack.length > 1) { sheet.stack.pop(); renderView(); } return; }
      var gb = t.closest('[data-mxv-g]');
      if (gb) {
        var gi = Number(gb.getAttribute('data-mxv-g'));
        if (state.groups[gi]) { sheet.stack.push(gi); renderView(); }
      }
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); closeSheet(true); return; }
      if (e.key !== 'Tab') return;
      var f = focusables(sheet.panel);
      if (!f.length) { e.preventDefault(); sheet.panel.focus(); return; }
      var first = f[0];
      var last = f[f.length - 1];
      var a = doc.activeElement;
      if (e.shiftKey && (a === first || a === sheet.panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
    });
    return sheet;
  }
  function focusables(panel) {
    var all = panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    var out = [];
    for (var i = 0; i < all.length; i++) {
      var n = all[i];
      if (n.disabled || n.hasAttribute('hidden') || n.offsetParent === null) continue;
      out.push(n);
    }
    return out;
  }
  function openSheet(gi, opener) {
    var sh = ensureSheet();
    sh.opener = opener || doc.activeElement;
    sh.openerKey = focusSelector(sh.opener);
    sh.stack = [gi];
    sh.el.classList.toggle('mxv-nohan', isKo() && !settings().showHanja);
    sh.el.removeAttribute('hidden');
    renderView();
    try { sh.panel.focus(); } catch (e) { /* noop */ }
  }
  function closeSheet(restore) {
    if (!sheet || sheet.el.hasAttribute('hidden')) return;
    sheet.el.setAttribute('hidden', '');
    sheet.stack = [];
    sheet.token++;
    if (restore === false) return;
    var t = sheet.opener;
    if (!t || !doc.body.contains(t)) t = sheet.openerKey ? doc.querySelector(sheet.openerKey) : null;
    if (t && t.focus) { try { t.focus(); } catch (e) { /* noop */ } }
  }
  function polChip(pol) {
    var p = pol === 'good' || pol === 'caution' ? pol : 'neutral';
    return '<span class="mxv-pol mxv-pol--' + p + '">' + esc(mt('polarity.' + p)) + '</span>';
  }
  function chipFor(gi) {
    var g = state.groups[gi];
    if (!g) return '';
    if (g.type === 'rel') {
      return '<button type="button" class="mxv-chip mxv-chip--relation" data-mxv-g="' + gi + '"><strong>' + esc(hitName(g.rel.ruleId, g.rel.name)) + '</strong><small>' + esc(relPairText(g.rel)) + '</small></button>';
    }
    return '<button type="button" class="mxv-chip mxv-chip--' + esc(g.category) + '" data-mxv-g="' + gi + '"><strong>' + esc(hitName(g.id, g.name)) + '</strong><small>' + esc(spotsText(g)) + '</small></button>';
  }
  function relPairText(rel) {
    return (rel.pair || []).map(function (n) { return spotOf(n, rel.position) + ' ' + (n.char || ''); }).join(' · ');
  }
  function copyBlock(id, token) {
    if (!isKo()) {
      var short = mt('shinsal.' + id + '.short', null, '');
      return short ? '<p class="mxv-sheet__short">' + esc(short) + '</p>' : '';
    }
    var c = copyFor(id);
    if (!c) {
      if (root.SajuShinsalCopy) return '';
      ensureCopy().then(function () {
        if (sheet && sheet.token === token && !sheet.el.hasAttribute('hidden')) renderView();
      }, function () {
        if (sheet && sheet.token === token && !sheet.el.hasAttribute('hidden')) {
          var slot = sheet.body.querySelector('.mxv-copy-slot');
          if (slot) slot.innerHTML = '<p class="mxv-sheet__note">' + esc(mt('sheet.loadFailed')) + '</p>';
        }
      });
      return '<div class="mxv-copy-slot"><p class="mxv-sheet__note">' + esc(mt('sheet.loading')) + '</p></div>';
    }
    var h = '';
    if (c.short) h += '<p class="mxv-sheet__short">' + esc(c.short) + '</p>';
    // 연이는 쉬운 풀이와 좋은 쪽을, 영냥이는 조심할 점과 활용 팁을 말한다. 설명문 자체는 정본 그대로 둔다.
    [['yeoni', [['easy', 'sheet.easy'], ['good', 'sheet.good']]], ['nyang', [['caution', 'sheet.caution'], ['tip', 'sheet.tip']]]].forEach(function (turn) {
      var inner = '';
      turn[1].forEach(function (pair) {
        if (c[pair[0]]) inner += '<section class="mxv-copy mxv-copy--' + pair[0] + '"><h4 class="mxv-copy__title">' + esc(mt(pair[1])) + '</h4><p>' + esc(c[pair[0]]) + '</p></section>';
      });
      if (inner) h += sayHtml(turn[0], inner);
    });
    return h;
  }
  /* 한국어 시트의 '어떻게 잡혔나요?' 자리 칸. 원국 자리에는 그 기둥이 비추는 영역을 함께 적는다. */
  function howPlacesHtml(it) {
    return placesOf([it], null, true, true).map(function (p) {
      return '<span class="mxv-how__place">' + esc(p.spot) + (p.mean ? '<span class="mxv-how__mean">' + esc(p.mean) + '</span>' : '') + '</span>';
    }).join('');
  }
  function hanjaOf(id, token) {
    // 일본어·중국어는 이름 자체가 한자라 겹쳐 쓰지 않는다. 그 밖의 언어는 한자를 함께 보인다.
    var l = lang();
    if (l.indexOf('ja') === 0 || l.indexOf('zh') === 0) return '';
    var c = copyFor(id);
    if (!c && !isKo() && !root.SajuShinsalCopy) {
      ensureCopy().then(function () {
        if (sheet && sheet.token === token && !sheet.el.hasAttribute('hidden')) renderView();
      }, function () { /* 한자 없이 그대로 둔다 */ });
    }
    return c && c.hanja ? '<span class="mxv-han mxv-sheet__han">' + esc(c.hanja) + '</span>' : '';
  }
  function renderView() {
    if (!sheet || !sheet.stack.length) return;
    sheet.token++;
    var token = sheet.token;
    var g = state.groups[sheet.stack[sheet.stack.length - 1]];
    if (!g) { closeSheet(true); return; }
    sheet.back.textContent = '‹ ' + mt('sheet.back');
    if (sheet.stack.length > 1) sheet.back.removeAttribute('hidden'); else sheet.back.setAttribute('hidden', '');
    sheet.close.innerHTML = '<span aria-hidden="true">✕</span><span class="mxv-vh">' + esc(mt('sheet.close')) + '</span>';
    var title = '';
    var h = '';
    if (g.type === 'hit') {
      title = hitName(g.id, g.name);
      h += '<div class="mxv-sheet__meta">' + polChip(g.polarity) + hanjaOf(g.id, token) + '<span class="mxv-sheet__cat"><span aria-hidden="true">' + (EMOJI[g.category] || '') + '</span> ' + esc(catLabel(g.category)) + '</span></div>';
      h += copyBlock(g.id, token);
      h += '<section class="mxv-how"><h4 class="mxv-how__title">' + esc(mt('sheet.how')) + '</h4><dl class="mxv-how__list">';
      var koSheet = isKo();
      g.items.forEach(function (it) {
        var where = koSheet ? howPlacesHtml(it) : esc(hitSpots(it, true).join(' · '));
        h += '<div class="mxv-how__row"><dt>' + esc(mt('sheet.where')) + '</dt><dd>' + where + '</dd><dt>' + esc(mt('sheet.basis')) + '</dt><dd>' + esc(basisText(it)) + '</dd></div>';
      });
      h += '</dl></section>';
    } else if (g.type === 'rel') {
      var rel = g.rel;
      title = hitName(rel.ruleId, rel.name);
      h += '<div class="mxv-sheet__meta">' + polChip('neutral') + hanjaOf(rel.ruleId, token) + '<span class="mxv-sheet__cat"><span aria-hidden="true">' + EMOJI.relation + '</span> ' + esc(catLabel('relation')) + '</span></div>';
      h += copyBlock(rel.ruleId, token);
      h += '<section class="mxv-how"><h4 class="mxv-how__title">' + esc(mt('sheet.how')) + '</h4><dl class="mxv-how__list"><div class="mxv-how__row">';
      h += '<dt>' + esc(mt('sheet.pair')) + '</dt><dd>' + esc(relPairText(rel)) + '</dd>';
      if (HAP_IDS[rel.ruleId] && rel.detail && ELEMENTS.indexOf(rel.detail) >= 0) h += '<dt>' + esc(mt('sheet.element')) + '</dt><dd>' + esc(mt('el.' + rel.detail)) + '</dd>';
      if (rel.ruleId === 'hyeong' && HYEONG_KIND[rel.detail]) h += '<dt>' + esc(mt('sheet.kind')) + '</dt><dd>' + esc(mt('rel.' + HYEONG_KIND[rel.detail])) + '</dd>';
      var bt = basisText(rel);
      if (bt) h += '<dt>' + esc(mt('sheet.basis')) + '</dt><dd>' + esc(bt) + '</dd>';
      h += '</div></dl></section>';
    } else if (g.type === 'list') {
      title = mt('sheet.listTitle', { pillar: pillarLabel(g.pillar), n: g.children.length });
      h += '<div class="mxv-chips mxv-chips--sheet">' + g.children.map(chipFor).join('') + '</div>';
    } else if (g.type === 'luck') {
      title = mt('sheet.luckTitle', { label: g.label, ganji: g.ganji + (isKo() ? ' ' + readingOf(g.ganji) : '') });
      if (!g.children.length && !g.rels.length) h += '<p class="mxv-sheet__note">' + esc(mt('sheet.luckEmpty')) + '</p>';
      if (g.children.length) h += '<h4 class="mxv-sheet__sub">' + esc(mt('sheet.luckHits')) + '</h4><div class="mxv-chips mxv-chips--sheet">' + g.children.map(chipFor).join('') + '</div>';
      if (g.rels.length) h += '<h4 class="mxv-sheet__sub">' + esc(mt('sheet.relWithNatal')) + '</h4><div class="mxv-chips mxv-chips--sheet">' + g.rels.map(chipFor).join('') + '</div>';
    }
    h += '<p class="mxv-sheet__foot">' + esc(mt('sheet.foot')) + '</p>';
    sheet.title.textContent = title;
    sheet.body.innerHTML = h;
    sheet.body.scrollTop = 0;
  }

  /* ── 외부 신호 ───────────────────────────────────────── */
  root.addEventListener('cd:locale-ready', function () { rerender(''); });
  function onGate() {
    if (!state.lastP) return;
    if (daewoonAllowed() !== state.allowed) rerender('');
  }
  root.addEventListener('cd:unlocks-changed', onGate);
  root.addEventListener('cd:tile-locks-updated', onGate);

  root.CdManseView = { render: render, strings: KO };

  // 체인 로드가 결과 화면보다 늦으면 기존 표를 새 화면으로 바꾼다.
  try {
    var g0 = gridEl();
    if (root.G_PILLARS && g0 && g0.children.length && !g0.classList.contains('mxv-host')) render(root.G_PILLARS);
  } catch (e) { /* 기존 표 유지 */ }
})(typeof window !== 'undefined' ? window : null);

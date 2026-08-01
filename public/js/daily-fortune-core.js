/* 오늘의 운세 결정론 코어 — 정적 셸(index.html)용 클래식 스크립트.
 *
 * 왜 사본인가: 정본 알고리즘·문구 풀은 lib/lock-screen-daily-fortune.ts 에 있지만 그건 TS 모듈이라
 * 셸의 클래식 <script> 에서 import 할 수 없다. 셸의 기존 일진 함수 getGanZhiForDate() 는
 * 사주 분석 시점에 지연 로드되므로 홈 첫 화면에는 없다. 그래서 이 프로젝트의 기존 관례
 * (AnalysisEngine.js 처럼 사본 + verify 가드)를 따라 사본을 두고
 * scripts/verify-daily-fortune-core-parity.mjs 가 두 파일의 문구 풀·상수 동일성을 강제한다.
 * → 잠금화면 문구를 고치는 사람은 두 곳을 함께 고쳐야 하며, CI 가 그걸 잡는다.
 *
 * 홈 허브는 실제 계산이 있는 3종(사주 일진·숙요 27수·베다 요일 지배성)만 쓴다.
 * 자미두수(명반 미사용 해시)·점성술(태양궁 고정)은 카드로 만들지 않고 심화 페이지 CTA 로 보낸다.
 *
 * 네트워크 0 · LLM 0 · 로그인 0. 어떤 경우에도 예외를 밖으로 던지지 않는다. */
(function (global) {
  'use strict';

  var KST_OFFSET_MS = 9 * 60 * 60 * 1000;

  function kstParts(now) {
    var kst = new Date(now.getTime() + KST_OFFSET_MS);
    return { y: kst.getUTCFullYear(), m: kst.getUTCMonth() + 1, d: kst.getUTCDate(), dow: kst.getUTCDay() };
  }

  function dateKeyOf(now) {
    var t = kstParts(now);
    return t.y + '-' + String(t.m).padStart(2, '0') + '-' + String(t.d).padStart(2, '0');
  }

  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  }

  function pickBy(pool, seed) {
    return pool[seed % pool.length];
  }

  // ── 60갑자 일진(사주) — worker/lib/daily-fortune-task.js 와 동일 알고리즘 ──
  var STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  var BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  var GANJI_LIST = (function () {
    var out = [];
    for (var i = 0; i < 60; i++) out.push(STEMS[i % 10] + BRANCHES[i % 12]);
    return out;
  })();
  var STEM_ELEMENT = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수']; // 갑을목 병정화 무기토 경신금 임계수

  function julianDay(year, month, day) {
    var y = year;
    var m = month;
    if (m <= 2) {
      y -= 1;
      m += 12;
    }
    var A = Math.floor(y / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
  }

  function ganjiIndex(y, m, d) {
    var jd = julianDay(y, m, d);
    return ((Math.floor(jd + 0.5) + 49) % 60 + 60) % 60;
  }

  function dayStemIndex(y, m, d) {
    return ganjiIndex(y, m, d) % 10; // 천간 인덱스
  }

  function dayGanji(y, m, d) {
    var idx = ganjiIndex(y, m, d);
    return { ganji: GANJI_LIST[idx], element: STEM_ELEMENT[idx % 10] };
  }

  function parseYmd(s) {
    if (!s) return null;
    var mt = String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!mt) return null;
    return { y: Number(mt[1]), m: Number(mt[2]), d: Number(mt[3]) };
  }

  // ── 오행 관계(일진 원소 → 원국 일간 원소) ──
  var ELEMENT_ORDER = ['목', '화', '토', '금', '수']; // 상생 순환

  function elementRelation(dayEl, natalEl) {
    if (dayEl === natalEl) return '비화';
    var di = ELEMENT_ORDER.indexOf(dayEl);
    var ni = ELEMENT_ORDER.indexOf(natalEl);
    if (di < 0 || ni < 0) return '비화';
    if ((di + 1) % 5 === ni) return '생'; // 오늘이 나를 생함(도움)
    if ((ni + 1) % 5 === di) return '설기'; // 내가 오늘을 생함(에너지 나감)
    if ((di + 2) % 5 === ni) return '극'; // 오늘이 나를 극함(압박)
    return '재'; // 내가 오늘을 극함(내가 다룸)
  }

  var ELEMENT_MOOD = {
    목: '새로 뻗어 나가고 시작하는',
    화: '밝게 드러나고 표현하는',
    토: '중심을 잡고 다지는',
    금: '정리하고 매듭짓는',
    수: '깊이 사색하고 흐르는'
  };

  var SAJU_RELATION_ADVICE = {
    생: '오늘의 기운이 당신을 밀어 줍니다. 미뤄 둔 일을 꺼내 한 걸음 나아가기 좋은 날입니다.',
    비화: '나와 결이 같은 기운이 함께합니다. 익숙한 방식이 오히려 힘을 냅니다. 무리한 변화보다 페이스를 지키세요.',
    설기: '표현하고 베풀기 좋은 날이지만 에너지가 빠져나가기 쉽습니다. 중요한 일부터 하고, 나를 위한 휴식도 남겨 두세요.',
    극: '오늘은 약간의 압박이 느껴질 수 있습니다. 정면 돌파보다 한 박자 늦추고, 급한 결정은 하루 재워 두세요.',
    재: '다룰 것이 많은 날입니다. 욕심을 조금 줄이고 하나에 집중하면 오히려 손에 잡히는 결과가 옵니다.'
  };

  var SAJU_GENERIC = [
    '오늘의 일진은 무리하기보다 결을 따라갈 때 순합니다. 작은 정리 하나가 큰 여유를 만듭니다.',
    '서두르지 않을수록 길이 선명해지는 하루입니다. 먼저 듣고 나중에 결정하세요.',
    '가진 것을 단단히 묶기 좋은 날입니다. 새로 벌이기보다 마무리에 힘을 실으세요.',
    '관계에서 온기가 도는 날입니다. 먼저 안부를 건네면 뜻밖의 도움이 돌아옵니다.',
    '몸을 돌보는 일이 곧 운을 돌보는 일입니다. 오늘은 컨디션을 우선하세요.'
  ];

  function buildSaju(input, now) {
    var t = kstParts(now);
    var today = dayGanji(t.y, t.m, t.d);
    var seed = hashStr(dateKeyOf(now) + 'saju');
    var birth = parseYmd(input.birthDate);
    var anchor = '오늘의 일진 · ' + today.ganji + '일 (' + today.element + ')';
    var headline = ELEMENT_MOOD[today.element] + ' 기운이 흐릅니다';
    if (birth) {
      var natalEl = STEM_ELEMENT[dayStemIndex(birth.y, birth.m, birth.d)];
      return {
        system: 'saju',
        label: '사주',
        emoji: '🎴',
        anchor: anchor,
        headline: headline,
        body: SAJU_RELATION_ADVICE[elementRelation(today.element, natalEl)],
        personalized: true
      };
    }
    return {
      system: 'saju',
      label: '사주',
      emoji: '🎴',
      anchor: anchor,
      headline: headline,
      body: pickBy(SAJU_GENERIC, seed),
      personalized: false
    };
  }

  // ── 베다점(요일 지배성 · Vāra) ──
  var VARA_RULER = ['태양', '달', '화성', '수성', '목성', '금성', '토성']; // 일~토
  var VARA_THEME = {
    태양: '자신감과 중심을 세우는',
    달: '마음을 돌보고 감정을 다스리는',
    화성: '결단과 추진의',
    수성: '소통과 배움의',
    목성: '확장과 지혜의',
    금성: '사랑과 조화의',
    토성: '인내와 정리의'
  };
  var VEDIC_DAILY = [
    '오늘의 지배성이 당신의 하루에 결을 더합니다. 그 결을 거스르지 말고 함께 흐르세요.',
    '카르마는 노력에 반응합니다. 결과를 재촉하기보다 지금 할 수 있는 정성을 다하세요.',
    '내려놓을 것과 붙들 것을 구분하기 좋은 날입니다. 집착을 조금 풀면 길이 열립니다.',
    '달의 기운이 마음을 살핍니다. 무리한 결정보다 호흡을 고르고 하루를 여세요.',
    '베풂이 곧 복이 되는 날입니다. 작은 친절 하나가 예상 밖의 흐름을 부릅니다.'
  ];

  function buildVedic(input, now) {
    var t = kstParts(now);
    var todayRuler = VARA_RULER[t.dow];
    var seed = hashStr(dateKeyOf(now) + 'vedic');
    var birth = parseYmd(input.birthDate);
    var anchor = '오늘의 지배성 · ' + todayRuler;
    var headline = VARA_THEME[todayRuler] + ' 하루';
    if (birth) {
      var birthRuler = VARA_RULER[new Date(Date.UTC(birth.y, birth.m - 1, birth.d)).getUTCDay()];
      var harmony = birthRuler === todayRuler
        ? '본래의 지배성과 오늘의 기운이 맞물립니다. 익숙한 힘이 특히 강해지는 날입니다.'
        : birthRuler + '의 기질에 ' + todayRuler + '의 결이 더해집니다. ' + VEDIC_DAILY[seed % VEDIC_DAILY.length];
      return { system: 'vedic', label: '베다점', emoji: '🕉️', anchor: anchor, headline: headline, body: harmony, personalized: true };
    }
    return { system: 'vedic', label: '베다점', emoji: '🕉️', anchor: anchor, headline: headline, body: pickBy(VEDIC_DAILY, seed), personalized: false };
  }

  // ── 숙요점(27수 기운) ──
  // 달이 머무는 별자리의 기운을 하루 단위로. 무거운 음력 엔진 없이 27일 주기로 결정론 순환한다.
  var SUKUYO_MANSION = [
    { name: '각(角)', theme: '첫 문을 여는' }, { name: '항(亢)', theme: '기준을 세우는' },
    { name: '저(氐)', theme: '뿌리를 다지는' }, { name: '방(房)', theme: '중심을 품는' },
    { name: '심(心)', theme: '마음을 읽는' }, { name: '미(尾)', theme: '끝까지 붙드는' },
    { name: '기(箕)', theme: '길을 넓히는' }, { name: '두(斗)', theme: '결단하는' },
    { name: '여(女)', theme: '섬세하게 돌보는' }, { name: '허(虛)', theme: '비우고 채우는' },
    { name: '위(危)', theme: '위기를 넘는' }, { name: '실(室)', theme: '터를 세우는' },
    { name: '벽(壁)', theme: '경계를 정리하는' }, { name: '규(奎)', theme: '지혜를 모으는' },
    { name: '루(婁)', theme: '불러 모으는' }, { name: '위(胃)', theme: '받아들이는' },
    { name: '묘(昴)', theme: '빛을 모으는' }, { name: '필(畢)', theme: '거두어들이는' },
    { name: '자(觜)', theme: '시작을 알리는' }, { name: '삼(參)', theme: '세 갈래를 아우르는' },
    { name: '정(井)', theme: '샘솟는' }, { name: '귀(鬼)', theme: '보이지 않는 것을 살피는' },
    { name: '류(柳)', theme: '부드럽게 흐르는' }, { name: '성(星)', theme: '빛나는' },
    { name: '장(張)', theme: '펼쳐 나가는' }, { name: '익(翼)', theme: '날개를 펴는' },
    { name: '진(軫)', theme: '매듭짓는' }
  ];
  var SUKUYO_DAILY = [
    '오늘의 별자리 기운은 서두르지 않는 쪽에 힘을 실어 줍니다. 한 걸음의 여유가 하루를 지킵니다.',
    '달의 자리가 마음을 다독입니다. 먼저 듣고 천천히 답하면 관계가 순해집니다.',
    '매듭짓기 좋은 흐름입니다. 미뤄 둔 일을 하나 정리하면 마음의 공간이 넓어집니다.',
    '새 인연·새 소식이 스치는 날입니다. 문을 조금 열어 두면 반가운 흐름이 들어옵니다.',
    '안으로 단단해지는 기운입니다. 확장보다 정비가 어울리니 나를 먼저 채우세요.',
    '정성이 통하는 날입니다. 작게라도 꾸준히 이어 온 일이 오늘 빛을 봅니다.'
  ];

  function buildSukuyo(input, now) {
    var t = kstParts(now);
    var jd = julianDay(t.y, t.m, t.d);
    var mansion = SUKUYO_MANSION[(Math.floor(jd + 0.5) % 27 + 27) % 27];
    var seed = hashStr(dateKeyOf(now) + 'sukuyo');
    return {
      system: 'sukuyo',
      label: '숙요점',
      emoji: '🌙',
      anchor: '오늘의 수(宿) · ' + mansion.name,
      headline: mansion.theme + ' 별이 하루를 이끕니다',
      body: pickBy(SUKUYO_DAILY, seed),
      personalized: Boolean(parseYmd(input.birthDate))
    };
  }

  var SYSTEMS = [
    { key: 'saju', label: '사주', emoji: '🎴' },
    { key: 'sukuyo', label: '숙요점', emoji: '🌙' },
    { key: 'vedic', label: '베다점', emoji: '🕉️' }
  ];

  var BUILDERS = { saju: buildSaju, sukuyo: buildSukuyo, vedic: buildVedic };

  function get(system, input, now) {
    var meta = null;
    for (var i = 0; i < SYSTEMS.length; i++) {
      if (SYSTEMS[i].key === system) { meta = SYSTEMS[i]; break; }
    }
    try {
      var build = BUILDERS[system] || buildSukuyo;
      return build(input || {}, now instanceof Date ? now : new Date());
    } catch (_) {
      // 첫 화면이라 어떤 경우에도 백지가 되면 안 된다.
      return {
        system: system,
        label: (meta && meta.label) || '오늘의 운세',
        emoji: (meta && meta.emoji) || '✨',
        anchor: '오늘의 운세',
        headline: '잔잔히 돕는 하루',
        body: '서두르지 않을수록 길이 선명해집니다. 작은 정리 하나가 큰 여유를 만듭니다.',
        personalized: false
      };
    }
  }

  global.CDDailyFortune = { SYSTEMS: SYSTEMS, get: get, dateKey: dateKeyOf };
})(typeof window !== 'undefined' ? window : this);

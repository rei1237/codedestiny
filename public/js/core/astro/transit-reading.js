/* Transit reading (ko, display only). AstroTransits.today() 결과 → "오늘의 별자리 운세" 카드 모델과 HTML.
 * 순수: DOM·전역·시계·요청 없음. 본문은 행성 이름과 쉬운 동사만 쓰고, 각 이름·도수·하우스 번호는
 * "왜 이렇게 봤나요" 접힘에만 둔다. 같은 입력이면 같은 문장·점수가 나온다(난수·해시 없음). */
(function (root) {
  'use strict';
  var SIGN = ['양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리', '천칭자리', '전갈자리', '사수자리', '염소자리', '물병자리', '물고기자리'];
  var NAME = { Sun: '태양', Moon: '달', Mercury: '수성', Venus: '금성', Mars: '화성', Jupiter: '목성', Saturn: '토성', Uranus: '천왕성', Neptune: '해왕성', Pluto: '명왕성', ASC: '첫인상', MC: '일과 평판' };
  var DOMAIN = { Sun: '자신감과 방향', Moon: '감정과 컨디션', ASC: '몸과 태도', MC: '일과 평판', Mercury: '말과 연락', Venus: '관계와 돈', Mars: '일의 속도와 체력', Jupiter: '기회와 여유', Saturn: '책임과 계획' };
  /* [받침 있을 때 조사, 없을 때 조사, 동사] — 돕다는 '을/를', 나머지는 '과/와'. */
  var VERB = { conjunction: ['과', '와', '겹쳐요'], sextile: ['을', '를', '살짝 도와요'], trine: ['을', '를', '편하게 도와요'], square: ['과', '와', '부딪혀요'], opposition: ['과', '와', '마주 서요'] };
  var ASPECT = { conjunction: '합(0°)', sextile: '육분(60°)', square: '사각(90°)', trine: '삼분(120°)', opposition: '대립(180°)' };
  var TONE = { flow: 0, tension: 1, neutral: 2 };
  /* [잘 맞을 때, 부딪힐 때, 겹칠 때] */
  var THEME = {
    Moon: ['마음이 편안하게 받쳐 줘요', '기분이 쉽게 출렁여요', '마음이 크게 움직여요'],
    Sun: ['자신감이 붙어요', '자존심 싸움이 생기기 쉬워요', '눈에 띄기 쉬워요'],
    Mercury: ['말과 연락이 술술 풀려요', '말실수나 오해가 생기기 쉬워요', '생각과 연락이 많아져요'],
    Venus: ['호감과 즐거움이 커져요', '서운함이나 충동구매가 생기기 쉬워요', '좋아하는 마음이 커져요'],
    Mars: ['추진력이 붙어요', '서두르다 다투기 쉬워요', '에너지가 확 올라와요'],
    Jupiter: ['기회와 도움이 들어와요', '욕심이 커져 무리하기 쉬워요', '일이 커지는 쪽으로 흘러요'],
    Saturn: ['꾸준히 해 온 것이 인정받아요', '책임과 압박이 무겁게 느껴져요', '현실을 꼼꼼히 따져 보게 돼요'],
    Uranus: ['새로운 시도가 잘 풀려요', '갑작스러운 변경이 생기기 쉬워요', '뜻밖의 일이 생겨요'],
    Neptune: ['직감과 상상력이 좋아져요', '착각하거나 흐려지기 쉬워요', '마음의 경계가 흐려져요'],
    Pluto: ['깊이 파고드는 힘이 생겨요', '통제하려는 마음이 세져요', '깊은 변화가 시작돼요']
  };
  var ACTION = {
    Moon: ['기분 좋은 김에 미뤄 둔 연락 하나를 하세요.', '감정이 올라오면 답장은 10분 뒤에 하세요.', '오늘 기분을 한 줄로 적어 두세요.'],
    Sun: ['하고 싶은 말이나 제안을 먼저 꺼내 보세요.', '이기려 하기보다 결론만 확인하세요.', '오늘 할 일 중 가장 중요한 하나를 먼저 끝내세요.'],
    Mercury: ['미뤄 둔 메시지나 서류를 오늘 처리하세요.', '중요한 메시지는 보내기 전에 한 번 더 읽으세요.', '떠오르는 생각을 바로 메모해 두세요.'],
    Venus: ['고마운 사람에게 작은 표현을 하세요.', '사고 싶은 것은 장바구니에 하루 묵혀 두세요.', '좋아하는 일에 30분을 쓰세요.'],
    Mars: ['미뤄 둔 일을 바로 시작하세요.', '운전과 운동은 평소보다 천천히 하세요.', '몸을 움직여 남는 힘을 쓰세요.'],
    Jupiter: ['도움을 청하거나 들어온 제안을 받아들여 보세요.', '약속과 지출은 평소의 80%만 하세요.', '배우고 싶은 것을 하나 정해 보세요.'],
    Saturn: ['장기 계획 하나를 날짜까지 정해 적어 두세요.', '지킬 수 있는 약속만 하고, 미뤄 둔 정리 하나를 끝내세요.', '할 일 목록을 중요한 순서로 줄이세요.'],
    Uranus: ['안 해 본 방법을 하나 시도해 보세요.', '일정 사이에 30분씩 여유를 두세요.', '바뀐 일정은 바로 주변에 알리세요.'],
    Neptune: ['떠오르는 아이디어를 기록해 두세요.', '계약과 약속은 글로 확인하세요.', '혼자 쉬는 시간을 따로 두세요.'],
    Pluto: ['정말 중요한 한 가지에만 힘을 모으세요.', '상대를 바꾸려 하기보다 내 선을 정하세요.', '오래 미뤄 둔 문제 하나를 들여다보세요.']
  };
  /* 이 기운이 대략 얼마나 이어지는지 — 빠른 별은 하루, 느린 별은 몇 주·몇 달. */
  var LASTS = { Moon: '오늘 하루', Sun: '이번 며칠', Mercury: '이번 며칠', Venus: '이번 며칠', Mars: '이번 주', Jupiter: '요즘 몇 주', Saturn: '요즘 몇 주', Uranus: '요즘 몇 달', Neptune: '요즘 몇 달', Pluto: '요즘 몇 달' };
  var MOON_SIGN = [
    '결정과 행동이 빨라지는 날이에요. 시작은 좋지만 서두름은 조심하세요.',
    '편안함과 안정을 찾게 돼요. 익숙한 일과 맛있는 식사가 힘이 돼요.',
    '연락과 대화가 늘어나요. 여러 일을 가볍게 처리하기 좋아요.',
    '집과 가까운 사람이 신경 쓰여요. 내 감정도 잘 챙겨 주세요.',
    '드러내고 인정받고 싶어져요. 즐거운 일 하나를 일정에 넣어 보세요.',
    '정리와 점검이 잘 되는 날이에요. 작은 일부터 끝내기 좋아요.',
    '사람 사이 균형을 맞추고 싶어져요. 약속과 협의에 좋아요.',
    '감정이 깊고 진지해져요. 한 가지에 깊이 집중하기 좋아요.',
    '멀리 보고 싶어져요. 배움과 새 계획에 좋아요.',
    '현실적으로 따져 보게 돼요. 해야 할 일을 차근차근 하기 좋아요.',
    '새로운 생각과 사람에게 끌려요. 평소와 다른 방식이 통해요.',
    '감수성이 커지고 쉬고 싶어져요. 무리하지 말고 마음을 돌보세요.'
  ];
  var MOON_MOOD = ['빠르고 적극적인', '차분하고 편안한', '가볍고 말이 많은', '다정하고 감성적인', '밝고 당당한', '꼼꼼하고 실용적인', '부드럽고 사교적인', '깊고 진지한', '자유롭고 낙천적인', '현실적이고 단단한', '새롭고 독특한', '여리고 몽글몽글한'];
  var PHASE = {
    'new': ['새달', '새로 시작할 일을 정하기 좋은 때예요'],
    'waxing-crescent': ['초승달', '작게 첫발을 떼기 좋은 때예요'],
    'first-quarter': ['상현달', '막힌 곳을 밀고 나가는 때예요'],
    'waxing-gibbous': ['차오르는 달', '다듬고 보완하기 좋은 때예요'],
    'full': ['보름달', '결과가 드러나고 감정이 커지는 때예요'],
    'waning-gibbous': ['기우는 달', '배운 것을 나누고 정리하기 좋은 때예요'],
    'last-quarter': ['하현달', '안 맞는 것을 내려놓기 좋은 때예요'],
    'waning-crescent': ['그믐달', '쉬고 비우기 좋은 때예요']
  };
  var AREA = ['나 자신과 몸', '돈과 소유', '연락과 가까운 이동', '집과 가족', '연애와 즐거움', '일과와 건강 관리', '파트너와 1:1 관계', '깊은 관계와 함께 쓰는 돈', '공부와 먼 곳', '일과 평판', '친구와 모임', '휴식과 혼자만의 시간'];
  var RETRO = {
    Mercury: '수성이 뒤로 가는 것처럼 보이는 기간(역행)이에요. 연락·계약·전자기기는 한 번 더 확인하세요.',
    Venus: '금성이 뒤로 가는 것처럼 보이는 기간(역행)이에요. 지난 인연이 떠오르기 쉽고, 큰 구매나 외모 변신은 미루는 게 좋아요.',
    Mars: '화성이 뒤로 가는 것처럼 보이는 기간(역행)이에요. 새 일을 벌이기보다 하던 일을 마무리하세요.'
  };
  var STATION_TOPIC = { Mercury: '연락과 일정', Venus: '관계와 돈', Mars: '일의 속도', Jupiter: '기회', Saturn: '책임과 계획', Uranus: '변화', Neptune: '감정', Pluto: '오래된 문제' };
  var CATS = [['love', '연애'], ['work', '일'], ['money', '돈'], ['people', '관계'], ['condition', '컨디션']];
  /* 점수 구간 [78+, 62–77, 48–61, 47 이하] */
  var BAND = {
    love: ['마음이 잘 통하는 날이에요. 먼저 다가가 보세요.', '호감이 무리 없이 전해지는 날이에요.', '잔잔한 날이에요. 기대보다 편안함을 챙기세요.', '서운함이 생기기 쉬워요. 말투를 부드럽게 하세요.'],
    work: ['일이 시원하게 풀려요. 중요한 일을 먼저 하세요.', '차근차근 진도가 나가는 날이에요.', '평소처럼 하면 돼요. 무리한 새 일은 미루세요.', '막히기 쉬워요. 마감과 확인을 두 번 하세요.'],
    money: ['돈 흐름이 좋아요. 미뤄 둔 정산이나 협상에 좋아요.', '무난하게 흘러가요. 계획한 지출은 괜찮아요.', '큰 지출은 하루 미뤄도 좋아요.', '새는 돈을 조심하세요. 충동구매는 피하세요.'],
    people: ['사람 운이 좋아요. 만남과 부탁이 잘 풀려요.', '대화가 부드럽게 이어지는 날이에요.', '말을 아끼면 편해요. 듣는 쪽에 서 보세요.', '오해가 생기기 쉬워요. 결론은 글로 남기세요.'],
    condition: ['몸과 마음이 가벼워요. 운동하기 좋아요.', '컨디션이 무난하게 받쳐 줘요.', '쉬는 시간을 일정에 넣어 두세요.', '쉽게 지쳐요. 잠과 식사를 먼저 챙기세요.']
  };
  var DAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

  /* 받침이 있으면 a, 없으면 b (이/가, 과/와). 한글이 아니면 b. */
  function josa(word, a, b) {
    var c = String(word).charCodeAt(String(word).length - 1);
    return word + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? a : b);
  }
  function clock(hhmm) {
    var p = String(hhmm).split(':'), h = +p[0], m = +p[1];
    if (h === 0 && m === 0) return '자정';
    if (h === 12 && m === 0) return '정오';
    if (h < 6) return '새벽 ' + h + '시' + (m ? ' ' + m + '분' : '');
    return (h < 12 ? '오전 ' : '오후 ') + (h % 12 || 12) + '시' + (m ? ' ' + m + '분' : '');
  }
  function dateLabel(day) {
    var p = day.split('-');
    return +p[1] + '월 ' + +p[2] + '일 ' + DAYS[new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay()];
  }
  function band(score) { return score >= 78 ? 0 : score >= 62 ? 1 : score >= 48 ? 2 : 3; }
  function minutes(a, b) { return Math.round((b.ms - a.ms) / 60000); }
  /* 같은 별·같은 출생점이 두 번 나오지 않게 고른다(문장 중복 방지). */
  function pickHits(hits, n) {
    var out = [], tUsed = {}, nUsed = {};
    for (var i = 0; i < hits.length && out.length < n; i++) {
      var h = hits[i];
      if (tUsed[h.transit] || nUsed[h.natal] || !THEME[h.transit] || !DOMAIN[h.natal]) continue;
      tUsed[h.transit] = nUsed[h.natal] = 1;
      out.push(h);
    }
    return out;
  }
  function hitSentence(h) {
    return josa(NAME[h.transit], '이', '가') + ' 당신의 ' + josa(NAME[h.natal], VERB[h.type][0], VERB[h.type][1]) + ' ' + VERB[h.type][2] + ' — ' + DOMAIN[h.natal] + ' 쪽에서 ' + THEME[h.transit][TONE[h.tone]] + '.';
  }
  function hitEvidence(h) {
    return NAME[h.transit] + ' ' + ASPECT[h.type] + ' 출생 ' + (h.natal === 'ASC' ? '상승점(ASC)' : h.natal === 'MC' ? '천정(MC)' : NAME[h.natal]) + ' · 오차 ' + h.orb.toFixed(1) + '° · ' + (h.applying ? '가까워지는 중' : '멀어지는 중');
  }
  function voidRange(v, day) {
    var whole = v.inDay.from.time === '00:00' && v.inDay.to.date !== day;
    if (whole) return '오늘 하루 종일';
    var from = v.from.date < day ? '하루 시작' : clock(v.inDay.from.time);
    var to = v.inDay.to.date !== day ? '자정' : clock(v.inDay.to.time);
    return from + '부터 ' + to + '까지';
  }

  function today(t, opts) {
    if (!t || !t.moon || !t.scores) throw new Error('AstroTransitReading.today: AstroTransits.today() result is required');
    opts = opts || {};
    var m = t.moon, ph = PHASE[m.phase], picked = pickHits(t.hits, 3);
    var moonLines = [
      '오늘 달은 ' + SIGN[m.signIdx] + '에 있어요. ' + MOON_SIGN[m.signIdx].split('. ')[1],
      ph[0] + '(밝기 ' + m.illumination + '%) — ' + ph[1] + '.'
    ];
    if (m.ingress) moonLines.push(clock(m.ingress.at.time) + '에 달이 ' + SIGN[m.ingress.signIdx] + '로 옮겨 가요. 그때부터 분위기가 ' + MOON_MOOD[m.ingress.signIdx] + ' 쪽으로 바뀌어요.');
    if (m.house) moonLines.push('달은 오늘 당신의 \'' + AREA[m.house - 1] + '\' 영역을 지나요. 이쪽 일에 마음이 쏠리기 쉬워요.');
    var voids = m.voids.filter(function (v) { return minutes(v.inDay.from, v.inDay.to) >= 15; }).map(function (v) {
      return voidRange(v, t.date) + ' 달이 다음 별자리로 넘어가기 전 쉬어 가요. 이 시간에는 새 계약·결제·중요한 첫 연락을 피하는 게 좋아요.';
    });
    var hits = picked.map(function (h) {
      return { key: h.transit + '-' + h.natal, lasts: LASTS[h.transit], text: hitSentence(h), action: ACTION[h.transit][TONE[h.tone]] };
    });
    var notes = [];
    var stationing = t.stationing || [], retro = t.retro || [];
    stationing.forEach(function (b) { if (STATION_TOPIC[b]) notes.push(josa(NAME[b], '이', '가') + ' 방향을 바꾸는 때라 ' + STATION_TOPIC[b] + ' 쪽 일정이 바뀌기 쉬워요.'); });
    ['Mercury', 'Venus', 'Mars'].forEach(function (b) { if (retro.indexOf(b) >= 0 && stationing.indexOf(b) < 0) notes.push(RETRO[b]); });
    var cats = CATS.map(function (c) { var s = t.scores[c[0]]; return { id: c[0], label: c[1], score: s, line: BAND[c[0]][band(s)] }; });
    var headline = MOON_SIGN[m.signIdx].split('. ')[0] + '.';
    var evidence = ['달: ' + SIGN[m.signIdx] + ' ' + (m.lon % 30).toFixed(1) + '° · ' + ph[0] + '(태양과 ' + m.elongation.toFixed(0) + '° 벌어짐)'];
    if (m.house) evidence.push('달이 지나는 영역: 출생 차트 ' + m.house + '번째 집(하우스)');
    picked.forEach(function (h) { evidence.push(hitEvidence(h)); });
    m.voids.forEach(function (v) {
      evidence.push('보이드 오브 코스(달이 다른 별과 각을 맺지 않는 시간): ' + v.from.date.slice(5) + ' ' + v.from.time + '~' + v.to.date.slice(5) + ' ' + v.to.time + (v.lastAspect ? ' · 마지막 각: 달–' + NAME[v.lastAspect.body] + ' ' + v.lastAspect.angle + '°' : ''));
    });
    if (retro.length) evidence.push('역행 중: ' + retro.map(function (b) { return NAME[b]; }).join(', '));
    evidence.push('분야 점수: 오늘 하늘의 별이 출생 차트에 만드는 각의 세기 합(정확할수록·가까워질수록 크게) + 달 위상·역행·보이드 보정. 같은 날은 같은 점수예요.');
    return {
      date: t.date,
      dateLabel: dateLabel(t.date),
      headline: headline,
      moon: moonLines,
      voids: voids,
      hits: hits,
      notes: notes,
      cats: cats,
      timeNote: t.timeKnown ? '' : '출생 시간을 넣으면 오늘 달이 지나는 생활 영역과 첫인상에 닿는 흐름까지 볼 수 있어요.',
      evidence: evidence
    };
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function renderToday(d) {
    var h = [];
    h.push('<section class="as-reading as-today" id="asToday" aria-labelledby="asTodayTitle">');
    h.push('<p class="as-cover-kicker">' + esc(d.dateLabel) + ' · 오늘의 별자리 운세</p>');
    h.push('<h3 class="as-h3" id="asTodayTitle">' + esc(d.headline) + '</h3>');
    h.push('<div class="as-today-moon"><span class="as-label">오늘의 달</span>' + d.moon.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') + '</div>');
    d.voids.forEach(function (v) { h.push('<p class="as-today-void" role="note"><span class="as-label">조심할 시간</span>' + esc(v) + '</p>'); });
    if (d.hits.length) {
      h.push('<ol class="as-today-hits">' + d.hits.map(function (x) {
        return '<li data-key="' + esc(x.key) + '"><p class="as-today-hit"><span class="as-today-lasts">' + esc(x.lasts) + '</span>' + esc(x.text) + '</p><p class="as-action"><span class="as-label">이렇게 하세요</span>' + esc(x.action) + '</p></li>';
      }).join('') + '</ol>');
    }
    if (d.notes.length) h.push('<ul class="as-bullets as-today-notes">' + d.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>');
    h.push('<dl class="as-today-cats">' + d.cats.map(function (c) {
      return '<div data-cat="' + c.id + '"><dt>' + esc(c.label) + '</dt><dd class="as-today-score">' + c.score + '<span class="as-today-unit">점</span></dd><dd class="as-today-line">' + esc(c.line) + '</dd></div>';
    }).join('') + '</dl>');
    if (d.timeNote) h.push('<p class="as-time-note" role="note">' + esc(d.timeNote) + '</p>');
    h.push('<details class="as-why"><summary>왜 이렇게 봤나요</summary><ul class="as-ev-list">' + d.evidence.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul></details>');
    h.push('</section>');
    return h.join('');
  }

  root.AstroTransitReading = { today: today, renderToday: renderToday, _text: { josa: josa, clock: clock, dateLabel: dateLabel } };
})(typeof window !== 'undefined' ? window : globalThis);

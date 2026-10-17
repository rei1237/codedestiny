/* Server-only 12-month transit prose (astro_yearly_transit, birth-scope unlock). Moved verbatim from
 * js/core/astro/transit-reading.js year()/renderYear(); the free head (yearPreview/renderYearSection) and today's card
 * stay in the public core, whose name tables and helpers this file shares. Positions come from server Swiss. */
'use strict';
const { SIGN, NAME, DOMAIN, VERB, ASPECT, TONE, THEME, ACTION, AREA, josa, esc, ymd, md, ym, span, inWin, peaksOf, monthKeys } = require('../../../js/core/astro/transit-reading.js').AstroTransitReading._shared;

  var FIELDS = [['work', '일'], ['love', '연애'], ['money', '돈'], ['people', '관계'], ['health', '건강']];
  var NATAL_FIELDS = { Sun: ['work', 'health'], Moon: ['people', 'health'], ASC: ['health'], MC: ['work'], Venus: ['love', 'money'], Mars: ['work', 'health'] };
  var FIELD_HOUSES = { work: [10, 6], love: [5, 7], money: [2, 8], people: [11, 3, 7], health: [1, 6, 12] };
  /* [잘 맞을 때, 부딪힐 때, 겹칠 때] — 그 분야 눈으로 본 시기 */
  var FIELD_TONE = {
    work: ['일에서 기회를 잡고 성과를 보이기 좋아요', '책임이 늘고 일정이 빡빡해지기 쉬워요', '일의 방향이 크게 바뀔 수 있어요'],
    love: ['마음을 표현하고 만남을 늘리기 좋아요', '관계가 시험받거나 거리가 생기기 쉬워요', '연애관이 달라지는 만남이 올 수 있어요'],
    money: ['수입을 늘리거나 협상하기 좋아요', '지출이 커지거나 돈 문제를 정리해야 할 수 있어요', '돈 쓰는 방식이 바뀌기 쉬워요'],
    people: ['도움을 주고받고 인맥을 넓히기 좋아요', '오해나 갈등이 생기기 쉬워요', '가까운 사람 구성이 바뀌기 쉬워요'],
    health: ['몸을 만들고 새 습관을 들이기 좋아요', '쉽게 지치니 잠과 휴식을 먼저 챙기세요', '생활 리듬이 바뀌기 쉬워요']
  };
  var RETRO_FIELD = {
    Mercury: { work: '계약·서류는 한 번 더 확인하세요', people: '말이 엇갈리기 쉬우니 중요한 얘기는 글로 남기세요' },
    Venus: { love: '지난 인연이 떠오르기 쉬워요. 새 고백보다 지금 관계를 돌보세요', money: '큰 구매나 투자는 이 기간 뒤로 미루세요' },
    Mars: { work: '새 일을 벌이기보다 하던 일을 마무리하세요', health: '무리한 운동보다 회복에 힘쓰세요' }
  };
  var RETRO_TIP = { Mercury: '연락·계약은 한 번 더 확인하세요', Venus: '큰 구매와 새 고백은 미루는 게 좋아요', Mars: '새 일보다 하던 일을 마무리하세요' };
  var VERB_ADN = { conjunction: '겹치는', sextile: '살짝 돕는', trine: '편하게 돕는', square: '부딪히는', opposition: '마주 서는' };
  var LORD_NAME = { Sun: '태양', Moon: '달', Mercury: '수성', Venus: '금성', Mars: '화성', Jupiter: '목성', Saturn: '토성', NorthNode: '북쪽 교점', SouthNode: '남쪽 교점' };
  var LORD_YEAR = {
    Sun: '내가 주인공이 되어 방향을 정하는 해예요', Moon: '생활과 마음의 안정을 다지는 해예요', Mercury: '배우고 말하고 사람을 잇는 일이 많아지는 해예요',
    Venus: '관계와 즐거움, 돈의 균형을 맞추는 해예요', Mars: '용기 내어 밀어붙이고 경쟁하는 해예요', Jupiter: '배움과 기회로 무대가 넓어지는 해예요', Saturn: '책임을 지고 기반을 단단히 쌓는 해예요'
  };
  var LORD_ERA = {
    Sun: '나다운 길과 사회적 자리를 찾는 시기', Moon: '집·가족·마음의 뿌리를 돌보는 시기', Mercury: '배우고 기술을 익히고 사람을 잇는 시기',
    Venus: '사랑·관계·즐거움이 삶의 중심이 되는 시기', Mars: '도전하고 경쟁하며 힘을 키우는 시기', Jupiter: '배움과 기회로 삶이 넓어지는 시기',
    Saturn: '책임을 지고 오래갈 기반을 쌓는 시기', NorthNode: '새로운 방향으로 한 걸음 나아가는 시기', SouthNode: '지난 것을 정리하고 내려놓는 시기'
  };
  var ECLIPSE = { solar: '일식', lunar: '월식' };
  var ECLIPSE_TYPE = { total: '개기', annular: '금환', partial: '부분', penumbral: '반영', hybrid: '혼성' };
  var RETRO_END = { Mercury: '미뤄 둔 계약·연락을 진행해도 좋아요', Venus: '미뤄 둔 구매·고백을 진행해도 좋아요', Mars: '멈춰 있던 일을 다시 밀어붙여도 좋아요' };
  var SIGN_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  var LEVEL = { top: '가장 큰 달', big: '큰 달', mid: '보통', calm: '잔잔한 달' };

  /* "'돈과 소유'예요" — 따옴표 뒤 서술격 조사는 따옴표 안 낱말의 받침을 본다. */
  function cop(word) { return josa(word, '이에요', '예요').slice(String(word).length); }
  function rangeOf(e) {
    if (e.startsBefore && e.endsAfter) return '앞으로 12개월 내내';
    if (e.startsBefore) return '지금 ~ ' + ymd(e.end.date);
    if (e.endsAfter) return ymd(e.start.date) + ' ~ 12개월 너머까지';
    return span(e.start.date, e.end.date);
  }
  function dates(list) { return list.map(function (d, i) { return i && d.slice(0, 4) === list[i - 1].slice(0, 4) ? md(d) : ymd(d); }).join(', '); }
  function eventSentence(e) {
    return josa(NAME[e.transit], '이', '가') + ' 당신의 ' + josa(NAME[e.natal], VERB[e.type][0], VERB[e.type][1]) + ' ' + VERB[e.type][2];
  }
  function eventPhrase(e) { return josa(NAME[e.transit], '이', '가') + ' 당신의 ' + josa(NAME[e.natal], VERB[e.type][0], VERB[e.type][1]) + ' ' + VERB_ADN[e.type]; }
  function addDays(day, n) {
    var t = new Date(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10) + n));
    return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' + String(t.getUTCDate()).padStart(2, '0');
  }

  function themeLines(p, periods, birth) {
    var out = [], pr = periods && periods.profection, f = periods && periods.firdaria;
    if (pr && LORD_YEAR[pr.lord] && birth && birth.month && birth.day) {
      var bm = String(birth.month).padStart(2, '0'), bd = String(birth.day).padStart(2, '0'), y = +p.from.slice(0, 4);
      if (p.from.slice(5) < bm + '-' + bd) y--;
      var start = y + '-' + bm + '-' + bd, end = addDays((y + 1) + '-' + bm + '-' + bd, -1), area = AREA[pr.house - 1];
      out.push(span(start, end) + ': 올해의 주제는 \'' + area + '\'' + cop(area) + '. 올해를 이끄는 별은 ' + LORD_NAME[pr.lord] + ' — ' + LORD_YEAR[pr.lord] + '.');
      /* 지금의 생일 해가 창 안에서 끝나면 다음 생일부터의 주제도 — 한 집 뒤, 그 별자리의 주인 별 */
      if (end < p.to) {
        var nHouse = pr.house % 12 + 1, nLord = SIGN_LORD[(pr.signIdx + 1) % 12], nArea = AREA[nHouse - 1];
        out.push(span(addDays(end, 1), addDays((y + 2) + '-' + bm + '-' + bd, -1)) + ': 다음 생일부터의 주제는 \'' + nArea + '\'' + cop(nArea) + '. ' + (nLord === pr.lord ? '이끄는 별은 이번에도 ' + josa(LORD_NAME[nLord], '이라', '라') + ', 지난 1년의 숙제를 한 해 더 이어 가요.' : '이끄는 별은 ' + LORD_NAME[nLord] + ' — ' + LORD_YEAR[nLord] + '.'));
      }
    }
    if (f && f.current && LORD_ERA[f.current.lord]) {
      var c = f.current, line = c.fromYear + '~' + c.toYear + '년은 인생 시기 지도에서 ' + LORD_NAME[c.lord] + '의 시기예요 — ' + LORD_ERA[c.lord] + '.';
      if (c.sub && LORD_NAME[c.sub.lord] && c.sub.lord !== c.lord) line += ' 그중 ' + c.sub.fromYear + '~' + c.sub.toYear + '년은 ' + LORD_NAME[c.sub.lord] + '의 결이 더해져요.';
      out.push(line);
    }
    return out;
  }

  function year(p, opts) {
    if (!p || !p.events || !p.from) throw new Error('AstroTransitReading.year: AstroTransits.period() result is required');
    opts = opts || {};
    var events = p.events.filter(function (e) { return THEME[e.transit] && DOMAIN[e.natal] && VERB[e.type]; })
      .sort(function (a, b) { return b.rank - a.rank || a.peak.ms - b.peak.ms; });
    var bigEvents = events.filter(function (e) { return peaksOf(p, e).length; }).slice(0, 4);
    var big = bigEvents.map(function (e) {
      var peaks = peaksOf(p, e);
      return {
        key: e.transit + '-' + e.natal + '-' + e.type,
        range: rangeOf(e),
        text: eventSentence(e) + ' — ' + DOMAIN[e.natal] + ' 쪽에서 ' + THEME[e.transit][TONE[e.tone]] + '.',
        peak: (peaks.length > 1 ? '가장 강한 날(별이 앞뒤로 오가며 ' + peaks.length + '번 닿아요): ' : '가장 강한 날: ') + dates(peaks),
        action: ACTION[e.transit][TONE[e.tone]]
      };
    });

    /* 달마다 1~3줄: 식 > 정확한 날 > 역행 시작 > 영향 시작 > 목성·토성 이동 > 역행 끝 > 영향 끝 > 새 달·보름달 */
    var keys = monthKeys(p.from), cand = {};
    keys.forEach(function (k) { cand[k] = []; });
    function add(day, pr, line) { var k = day.slice(0, 7); if (cand[k] && inWin(p, day)) cand[k].push({ day: day, pr: pr, line: line }); }
    (p.eclipses || []).forEach(function (x) {
      var hit = x.hits && x.hits[0], name = ECLIPSE[x.kind] || '식';
      add(x.at.date, 100, md(x.at.date) + ' ' + name + ': ' + (hit && DOMAIN[hit.natal]
        ? '당신의 ' + NAME[hit.natal] + '에 닿는 ' + name + '이라 ' + DOMAIN[hit.natal] + ' 쪽에 큰 전환점이 와요.'
        : (x.house ? '\'' + AREA[x.house - 1] + '\' 영역에서 ' : '') + '하나가 끝나고 새로 시작되는 신호예요.'));
    });
    events.forEach(function (e) {
      peaksOf(p, e).forEach(function (d) { add(d, 50 + e.rank, md(d) + ': ' + eventPhrase(e) + ' 흐름이 가장 강해져요.'); });
      if (!e.startsBefore) add(e.start.date, 30 + e.rank, md(e.start.date) + '부터: ' + eventPhrase(e) + ' 흐름이 시작돼요.');
      if (!e.endsAfter) add(e.end.date, 10 + e.rank, md(e.end.date) + ': ' + eventPhrase(e) + ' 흐름이 마무리돼요.');
    });
    (p.retroPeriods || []).forEach(function (r) {
      if (!RETRO_TIP[r.body]) return;
      var until = r.start.date.slice(0, 4) === r.end.date.slice(0, 4) ? md(r.end.date) : ymd(r.end.date);
      add(r.start.date, 40, md(r.start.date) + ': ' + NAME[r.body] + ' 역행이 시작돼요(' + until + '까지). ' + RETRO_TIP[r.body] + '.');
      add(r.end.date, 20, md(r.end.date) + ': ' + josa(NAME[r.body], '이', '가') + ' 다시 앞으로 가요. ' + RETRO_END[r.body] + '.');
    });
    (p.ingresses || []).forEach(function (g) {
      if (g.body === 'Jupiter') add(g.at.date, 25, md(g.at.date) + ': 목성이 ' + SIGN[g.signIdx] + '로 옮겨 가요 — 앞으로 1년, 운이 열리는 무대가 바뀌어요.');
      if (g.body === 'Saturn') add(g.at.date, 25, md(g.at.date) + ': 토성이 ' + SIGN[g.signIdx] + '로 옮겨 가요 — 앞으로 2~3년의 숙제가 바뀌어요.');
    });
    (p.lunations || []).forEach(function (l) {
      var where = l.house ? '\'' + AREA[l.house - 1] + '\' 영역에서 ' : '';
      if (l.kind === 'new') add(l.at.date, 5, md(l.at.date) + ' 새 달(' + SIGN[l.signIdx] + '): ' + where + '새로 시작할 일을 정하기 좋은 날이에요.');
      else add(l.at.date, 4, md(l.at.date) + ' 보름달(' + SIGN[l.signIdx] + '): ' + (l.house ? '\'' + AREA[l.house - 1] + '\' 쪽 ' : '') + '결과가 드러나고 감정이 커지는 날이에요.');
    });

    /* 달의 세기: 그 달에 걸친 큰 사건 rank 합 + 식 */
    var weight = {};
    keys.forEach(function (k) {
      var w = 0, m0 = k + '-01', m1 = k + '-31';
      events.forEach(function (e) { if (e.start.date <= m1 && e.end.date >= m0) w += e.rank * (peaksOf(p, e).some(function (d) { return d.slice(0, 7) === k; }) ? 2 : 1); });
      (p.eclipses || []).forEach(function (x) { if (x.at.date.slice(0, 7) === k) w += 6 + (x.hits ? x.hits.length * 4 : 0); });
      weight[k] = w;
    });
    var topKey = bigEvents.length ? peaksOf(p, bigEvents[0])[0].slice(0, 7) : null;
    if (!topKey) keys.forEach(function (k) { if (weight[k] > 0 && (!topKey || weight[k] > weight[topKey])) topKey = k; });
    var order = keys.filter(function (k) { return k !== topKey; }).sort(function (a, b) { return weight[b] - weight[a]; });
    var months = keys.map(function (k) {
      var items = cand[k].sort(function (a, b) { return b.pr - a.pr || (a.day < b.day ? -1 : 1); }).slice(0, 3)
        .sort(function (a, b) { return a.day < b.day ? -1 : a.day > b.day ? 1 : b.pr - a.pr; });
      var at = order.indexOf(k), level = k === topKey ? 'top' : at < 3 && weight[k] > 0 ? 'big' : at >= order.length - 3 || !weight[k] ? 'calm' : 'mid';
      return { key: k, label: ym(k + '-01'), level: level, levelLabel: LEVEL[level], items: items.length ? items.map(function (x) { return x.line; }) : ['큰 별의 움직임이 없는 조용한 달이에요. 하던 일을 꾸준히 이어 가세요.'] };
    });

    /* 분야별 언제: 좋은 때(잘 맞는 사건·그 분야 영역의 새 달), 조심할 때(부딪히는 사건·바뀌는 사건·역행) */
    var fields = FIELDS.map(function (f) {
      var id = f[0], label = f[1], good = [], caution = [], used = {};
      function tonePhrase(e, t) {
        var opts = [FIELD_TONE[id][t], THEME[e.transit][t]].filter(function (x) { return !used[x]; });
        if (opts[0]) used[opts[0]] = 1;
        return opts[0] ? ' — ' + opts[0] + '.' : '.';
      }
      events.slice().sort(function (a, b) { return b.rank - a.rank; }).forEach(function (e) {
        if (!NATAL_FIELDS[e.natal] || NATAL_FIELDS[e.natal].indexOf(id) < 0 || !(e.end.date >= p.from && e.start.date <= p.to)) return;
        var peaks = peaksOf(p, e), t = TONE[e.tone];
        var line = rangeOf(e) + ': ' + eventSentence(e) + tonePhrase(e, t) + (peaks.length ? ' 가장 강한 날은 ' + dates(peaks) + '이에요.' : '');
        (t === 0 ? good : caution).push({ day: e.start.date, rank: e.rank, line: line });
      });
      /* 같은 별의 역행이 한 해에 여러 번이면 한 줄로 묶는다(수성은 보통 3번). */
      Object.keys(RETRO_FIELD).forEach(function (body) {
        var rs = (p.retroPeriods || []).filter(function (r) { return r.body === body; });
        if (!rs.length || !RETRO_FIELD[body][id]) return;
        caution.push({ day: rs[0].start.date, rank: 2, line: rs.map(function (r) { return span(r.start.date, r.end.date); }).join(', ') + ': ' + NAME[body] + ' 역행 — ' + RETRO_FIELD[body][id] + '.' });
      });
      if (!good.length) {
        var nm = (p.lunations || []).filter(function (l) { return l.kind === 'new' && l.house && FIELD_HOUSES[id].indexOf(l.house) >= 0; })[0];
        if (nm) good.push({ day: nm.at.date, rank: 0, line: ymd(nm.at.date) + ' 새 달: ' + label + ' 쪽에서 새로 시작하기 좋은 날이에요.' });
      }
      function pick(list, n) { return list.sort(function (a, b) { return b.rank - a.rank; }).slice(0, n).sort(function (a, b) { return a.day < b.day ? -1 : 1; }).map(function (x) { return x.line; }); }
      return {
        id: id, label: label,
        good: good.length ? pick(good, 2) : [label + ' 쪽은 큰 별의 도움이 따로 오지 않아요. 지금 하던 대로 꾸준히 가면 돼요.'],
        caution: caution.length ? pick(caution, 3) : [label + ' 쪽은 크게 조심할 시기가 보이지 않아요.']
      };
    });

    var evidence = ['계산: 느린 별(목성·토성·천왕성·해왕성·명왕성)이 출생 ' + (p.timeKnown ? '태양·달·상승점(ASC)·천정(MC)' : '태양·달') + '·금성·화성과 3° 안으로 만나는 기간을 하루 단위로 훑고, 정확한 날은 시간 단위까지 좁혔어요.'];
    bigEvents.forEach(function (e) {
      evidence.push(NAME[e.transit] + ' ' + ASPECT[e.type] + ' 출생 ' + (e.natal === 'ASC' ? '상승점(ASC)' : e.natal === 'MC' ? '천정(MC)' : NAME[e.natal])
        + ' · 정확한 날 ' + (e.exacts.length ? e.exacts.map(function (x) { return x.date; }).join(', ') : '없음(가장 가까운 날 ' + e.peak.date + ', 오차 ' + e.closestOrb + '°)')
        + ' · 3° 안 ' + e.start.date + '~' + e.end.date + (e.house ? ' · 출생 차트 ' + e.house + '번째 집(하우스)' : ''));
    });
    (p.retroPeriods || []).forEach(function (r) { if (RETRO_TIP[r.body]) evidence.push(NAME[r.body] + ' 역행: ' + r.start.date + ' ' + r.start.time + ' ~ ' + r.end.date + ' ' + r.end.time); });
    (p.eclipses || []).forEach(function (x) { evidence.push((ECLIPSE[x.kind] || '식') + '(' + (ECLIPSE_TYPE[x.type] || x.type) + '): ' + x.at.date + ' ' + x.at.time + ' · ' + SIGN[x.signIdx] + ' ' + (x.lon % 30).toFixed(1) + '°' + (x.hits && x.hits.length ? ' · 출생 ' + x.hits.map(function (h) { return NAME[h.natal] + ' ' + ASPECT[h.type] + ' 오차 ' + h.orb + '°'; }).join(', ') : '')); });
    var pr = opts.periods && opts.periods.profection, fd = opts.periods && opts.periods.firdaria;
    if (pr) evidence.push('올해의 주제: 만 ' + pr.age + '세 → 상승점에서 ' + pr.house + '번째 집(' + SIGN[pr.signIdx] + '), 그 별자리의 주인 별 ' + LORD_NAME[pr.lord] + '(연주 프로펙션)');
    if (fd && fd.current) evidence.push('인생 시기 지도: ' + (fd.sect === 'day' ? '낮' : '밤') + ' 차트 순서의 피르다리아 · ' + (LORD_NAME[fd.current.lord] || fd.current.lord) + ' ' + fd.current.fromYear + '~' + fd.current.toYear + '년');
    evidence.push('시각은 기기 시간대 기준이에요.');

    var topMonth = topKey ? ym(topKey + '-01') : '';
    return {
      from: p.from, to: p.to,
      rangeLabel: span(p.from, p.to),
      preview: {
        month: topMonth,
        line: topMonth ? '앞으로 12개월 중 흐름이 가장 두드러지는 달은 ' + topMonth + '이에요.' : '앞으로 12개월에는 두드러진 주요 흐름이 계산되지 않았어요.',
        sub: '일·연애·돈·관계·건강에서 계획을 돌아볼 기간과 날짜를 살펴보세요.'
      },
      theme: themeLines(p, opts.periods, opts.birth),
      big: big,
      months: months,
      fields: fields,
      timeNote: p.timeKnown ? '' : '출생 시간을 넣으면 첫인상·일과 평판에 닿는 흐름과 올해의 주제까지 볼 수 있어요.',
      evidence: evidence
    };
  }

  function list(cls, items) { return '<ul class="' + cls + '">' + items.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>'; }
  function renderYear(y) {
    var h = ['<div class="as-year-body">'];
    if (y.theme.length) h.push('<h4 class="as-h4">올해의 주제</h4>' + list('as-bullets as-year-theme', y.theme));
    if (y.big.length) {
      h.push('<h4 class="as-h4">큰 사건</h4><ol class="as-year-big">' + y.big.map(function (b) {
        return '<li data-key="' + esc(b.key) + '"><p class="as-year-when">' + esc(b.range) + '</p><p class="as-year-text">' + esc(b.text) + '</p><p class="as-year-peak">' + esc(b.peak) + '</p>'
          + '<p class="as-action"><span class="as-label">이렇게 하세요</span>' + esc(b.action) + '</p></li>';
      }).join('') + '</ol>');
    }
    h.push('<h4 class="as-h4">달마다 볼 날</h4><ol class="as-year-months">' + y.months.map(function (m) {
      return '<li data-month="' + esc(m.key) + '" data-level="' + esc(m.level) + '"><p class="as-year-month"><strong>' + esc(m.label) + '</strong><span class="as-year-level">' + esc(m.levelLabel) + '</span></p>'
        + (m.items.length ? list('as-year-items', m.items) : '') + '</li>';
    }).join('') + '</ol>');
    h.push('<h4 class="as-h4">분야별 언제</h4><div class="as-year-fields">' + y.fields.map(function (f) {
      return '<section data-field="' + esc(f.id) + '"><h5 class="as-year-field">' + esc(f.label) + '</h5>'
        + '<p class="as-label">좋은 때</p>' + list('as-year-items', f.good)
        + '<p class="as-label">조심할 때</p>' + list('as-year-items', f.caution) + '</section>';
    }).join('') + '</div>');
    if (y.timeNote) h.push('<p class="as-time-note" role="note">' + esc(y.timeNote) + '</p>');
    h.push('<details class="as-why"><summary>왜 이렇게 봤나요</summary>' + list('as-ev-list', y.evidence) + '</details>');
    h.push('</div>');
    return h.join('');
  }

module.exports = { year, renderYear };

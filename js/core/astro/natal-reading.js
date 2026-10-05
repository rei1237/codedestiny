/* Free chart, short summary, glyphs and period calculations. Detailed prose lives only in worker/lib/astro-natal-reading.cjs. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AstroNatalReading = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var SIGN = ['양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리', '천칭자리', '전갈자리', '사수자리', '염소자리', '물병자리', '물고기자리'];

  var ELEMENTS = ['fire', 'earth', 'air', 'water'];

  var MODES = ['cardinal', 'fixed', 'mutable'];

  var EL_KO = { fire: '불', earth: '흙', air: '공기', water: '물' };

  var MODE_KO = { cardinal: '시작형', fixed: '유지형', mutable: '적응형' };

  var BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

  var CORE = BODIES.slice(0, 7);

  var PERSONAL = { Sun: 1, Moon: 1, Mercury: 1, Venus: 1, Mars: 1 };

  var SLOW = { Jupiter: 1, Saturn: 1, Uranus: 1, Neptune: 1, Pluto: 1 };

  var KO = { Sun: '태양', Moon: '달', Mercury: '수성', Venus: '금성', Mars: '화성', Jupiter: '목성', Saturn: '토성', Uranus: '천왕성', Neptune: '해왕성', Pluto: '명왕성', NorthNode: '북쪽 교점', SouthNode: '남쪽 교점', ASC: '첫인상 별자리', MC: '사회에서 보이는 모습' };

  var RULER = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];

  var EXALT = { Sun: 0, Moon: 1, Mercury: 5, Venus: 11, Mars: 9, Jupiter: 3, Saturn: 6 };

  var ORB = { Sun: 8, Moon: 8, Mercury: 6, Venus: 6, Mars: 6 };

  var ASPECTS = [['conjunction', 0], ['sextile', 60], ['square', 90], ['trine', 120], ['opposition', 180]];

  var WEIGHT = { Sun: 3, Moon: 3, ASC: 3, Mercury: 2, Venus: 2, Mars: 2, Jupiter: 1, Saturn: 1, Uranus: 0.5, Neptune: 0.5, Pluto: 0.5 };

  var FIRDARIA = {
    day: [['Sun', 10], ['Venus', 8], ['Mercury', 13], ['Moon', 9], ['Saturn', 11], ['Jupiter', 12], ['Mars', 7], ['NorthNode', 3], ['SouthNode', 2]],
    night: [['Moon', 9], ['Saturn', 11], ['Jupiter', 12], ['Mars', 7], ['Sun', 10], ['Venus', 8], ['Mercury', 13], ['NorthNode', 3], ['SouthNode', 2]]
  };

  var CHALDEAN = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];

  function norm(x) { x = x % 360; return x < 0 ? x + 360 : x; }

  function gap(a, b) { var d = Math.abs(norm(a) - norm(b)); return d > 180 ? 360 - d : d; }

  function round1(x) { return Math.round(x * 10) / 10; }

  function lonOf(p) { return p && isFinite(p.idx) && isFinite(p.deg) ? norm(Number(p.idx) * 30 + Number(p.deg)) : null; }

  function batchim(w) { var s = String(w), c = s.charCodeAt(s.length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; }

  function jo(w, pair) { var p = pair.split('/'); return w + (batchim(w) ? p[0] : p[1]); }

  function degText(deg) { var d = Math.floor(deg + 1e-9), m = Math.floor((deg - d) * 60 + 1e-9); return d + '°' + (m < 10 ? '0' : '') + m + '′'; }

  function parseDay(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? { year: +m[1], month: +m[2], day: +m[3] } : null; }

  function dayNum(d) { return Math.floor(Date.UTC(d.year, d.month - 1, d.day) / 86400000); }

  function dignity(body, s) {
    if (RULER[s] === body) return 5;
    if (EXALT[body] === s) return 4;
    if (RULER[(s + 6) % 12] === body) return -5;
    if (EXALT[body] != null && (EXALT[body] + 6) % 12 === s) return -4;
    return 0;
  }

  function houseOf(lon, cusps) {
    for (var i = 0; i < 12; i++) {
      if (norm(lon - cusps[i]) < norm(cusps[(i + 1) % 12] - cusps[i])) return i + 1;
    }
    return 1;
  }

  function cuspsOf(chart) {
    var c = chart && chart.houseCuspsLon;
    if (c && c.length === 12 && c.every(function (v) { return isFinite(v); })) return c.map(function (v) { return norm(Number(v)); });
    var asc = lonOf(chart && chart.asc);
    if (asc == null) return null;
    var start = Math.floor(asc / 30) * 30;
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (i) { return norm(start + 30 * i); });
  }

  function positions(chart, cusps) {
    var pos = {};
    BODIES.forEach(function (b) {
      var row = chart.planets && chart.planets[b];
      var lon = lonOf(b === 'Sun' ? chart.sun : b === 'Moon' ? chart.moon : row && row.sign);
      if (lon == null) return;
      pos[b] = { body: b, lon: lon, signIdx: Math.floor(lon / 30), deg: lon % 30, retro: !!(row && row.retro), dignity: dignity(b, Math.floor(lon / 30)) };
    });
    if (cusps) {
      var asc = lonOf(chart.asc), mc = lonOf(chart.mc);
      var angles = [asc, mc, norm(asc + 180), norm(mc + 180)];
      pos.ASC = { body: 'ASC', lon: asc, signIdx: Math.floor(asc / 30), deg: asc % 30, house: 1 };
      pos.MC = { body: 'MC', lon: mc, signIdx: Math.floor(mc / 30), deg: mc % 30, house: 10 };
      BODIES.forEach(function (b) {
        var p = pos[b];
        if (!p) return;
        p.house = houseOf(p.lon, cusps);
        p.wholeHouse = (p.signIdx - pos.ASC.signIdx + 12) % 12 + 1;
        p.angular = [1, 4, 7, 10].indexOf(p.house) >= 0 || angles.some(function (a) { return gap(p.lon, a) <= 8; });
      });
    }
    return pos;
  }

  function aspectsOf(pos, timeKnown) {
    var keys = BODIES.filter(function (b) { return pos[b]; });
    if (timeKnown) keys = keys.concat(['ASC', 'MC']);
    var list = [];
    for (var i = 0; i < keys.length; i++) {
      for (var j = i + 1; j < keys.length; j++) {
        var a = keys[i], b = keys[j];
        if (SLOW[a] && SLOW[b]) continue;
        if ((a === 'ASC' || a === 'MC') && (b === 'ASC' || b === 'MC')) continue;
        if (!timeKnown && (a === 'Moon' || b === 'Moon')) continue;
        var d = gap(pos[a].lon, pos[b].lon), allow = Math.max(ORB[a] || 5, ORB[b] || 5);
        for (var k = 0; k < ASPECTS.length; k++) {
          var off = Math.abs(d - ASPECTS[k][1]);
          if (off <= allow) list.push({ a: a, b: b, type: ASPECTS[k][0], orb: round1(off), exact: off <= 3 });
        }
      }
    }
    return list.sort(function (x, y) { return x.orb - y.orb || keys.indexOf(x.a) - keys.indexOf(y.a) || keys.indexOf(x.b) - keys.indexOf(y.b); });
  }

  function balanceOf(pos, moonSigns) {
    var el = { fire: 0, earth: 0, air: 0, water: 0 }, mode = { cardinal: 0, fixed: 0, mutable: 0 }, total = 0, present = {};
    function add(s, w) { el[ELEMENTS[s % 4]] += w; mode[MODES[s % 3]] += w; total += w; }
    BODIES.concat(['ASC']).forEach(function (b) {
      var p = pos[b];
      if (!p) return;
      if (b === 'Moon' && moonSigns) { add(moonSigns[0], 1.5); add(moonSigns[1], 1.5); }
      else add(p.signIdx, WEIGHT[b]);
      if (PERSONAL[b]) (b === 'Moon' && moonSigns ? moonSigns : [p.signIdx]).forEach(function (s) { present[ELEMENTS[s % 4]] = 1; });
    });
    function rows(obj, ko) {
      return Object.keys(obj).map(function (k) { return { key: k, ko: ko[k], weight: obj[k], share: total ? Math.round(100 * obj[k] / total) : 0 }; });
    }
    var elements = rows(el, EL_KO), modes = rows(mode, MODE_KO);
    var topEl = elements.slice().sort(function (a, b) { return b.weight - a.weight; })[0];
    var topMode = modes.slice().sort(function (a, b) { return b.weight - a.weight; })[0];
    return {
      elements: elements,
      modes: modes,
      dominant: topEl && topEl.share >= 40 ? topEl.key : null,
      leading: topEl ? topEl.key : null,
      mode: topMode ? topMode.key : null,
      empty: ELEMENTS.filter(function (k) { return !present[k]; })
    };
  }

  function stelliumOf(pos, moonSigns) {
    var best = null;
    function scan(kind, keyOf) {
      var groups = {};
      CORE.forEach(function (b) {
        var p = pos[b];
        if (!p || (b === 'Moon' && moonSigns && kind === 'sign')) return;
        var k = keyOf(p);
        if (k == null) return;
        (groups[k] = groups[k] || []).push(b);
      });
      Object.keys(groups).forEach(function (k) {
        if (groups[k].length >= 3 && (!best || groups[k].length > best.bodies.length)) best = { kind: kind, value: +k, bodies: groups[k] };
      });
    }
    scan('sign', function (p) { return p.signIdx; });
    scan('house', function (p) { return p.house || null; });
    return best;
  }

  function ageOf(birth, today) {
    var t = parseDay(today);
    if (!t || !birth || !birth.year || !birth.month || !birth.day) return null;
    var b = { year: +birth.year, month: +birth.month, day: +birth.day };
    var age = t.year - b.year - ((t.month < b.month || (t.month === b.month && t.day < b.day)) ? 1 : 0);
    if (age < 0) return null;
    var start = dayNum({ year: b.year, month: 1, day: 1 });
    return { age: age, years: (dayNum(t) - dayNum(b)) / 365.2425, birthYearFrac: b.year + (dayNum(b) - start) / 365.2425 };
  }

  function firdariaOf(sect, age) {
    var seq = FIRDARIA[sect], list = [], t = 0;
    seq.forEach(function (row) { list.push({ lord: row[0], fromAge: t, toAge: t + row[1] }); t += row[1]; });
    var cycle = age.years % 75, base = age.years - cycle;
    function yearAt(a) { return Math.floor(age.birthYearFrac + base + a); }
    list.forEach(function (p) { p.fromYear = yearAt(p.fromAge); p.toYear = yearAt(p.toAge); });
    var idx = 0;
    while (idx < list.length - 1 && cycle >= list[idx].toAge) idx++;
    var cur = list[idx], sub = null;
    if (CHALDEAN.indexOf(cur.lord) >= 0) {
      var len = (cur.toAge - cur.fromAge) / 7, k = Math.min(6, Math.floor((cycle - cur.fromAge) / len));
      sub = { lord: CHALDEAN[(CHALDEAN.indexOf(cur.lord) + k) % 7], fromYear: yearAt(cur.fromAge + k * len), toYear: yearAt(cur.fromAge + (k + 1) * len) };
    }
    var nx = list[(idx + 1) % list.length];
    return { sect: sect, list: list, current: { lord: cur.lord, fromYear: cur.fromYear, toYear: cur.toYear, sub: sub }, next: { lord: nx.lord, fromYear: idx + 1 < list.length ? nx.fromYear : yearAt(75) } };
  }

  var ROLE_OUTER = ['씩씩하고 거침없어 보이지만', '느긋하고 온화해 보이지만', '가볍고 재치 있어 보이지만', '다정하고 조심스러워 보이지만', '당당하고 환해 보이지만', '단정하고 꼼꼼해 보이지만',
    '부드럽게 맞춰 주는 듯하지만', '조용하고 속을 알 수 없어 보이지만', '밝고 자유로워 보이지만', '차분하고 어른스러워 보이지만', '쿨하고 독특해 보이지만', '몽글하고 여려 보이지만'];

  var ROLE_INNER = ['참지 못하고 곧장 반응하는', '익숙한 것에서 안정을 찾는', '궁금한 게 많아 쉬지 않는', '아끼는 사람을 품어야 마음이 놓이는', '인정받을 때 마음이 환해지는', '작은 것까지 챙겨야 안심하는',
    '갈등보다 조화를 바라는', '끝까지 파고들고 쉽게 잊지 않는', '답답하면 바로 떠나고 싶어지는', '감정까지 책임지려 애쓰는', '혼자만의 거리가 있어야 편한', '남의 감정까지 함께 느끼는'];

  var ROLE_CORE = ['먼저 부딪혀 길을 여는', '천천히 확실하게 쌓아 가는', '묻고 배우며 넓혀 가는', '곁의 사람을 지키며 크는', '자기 빛으로 주변을 데우는', '더 나은 방법을 찾아 다듬는',
    '관계 속에서 균형을 찾는', '한번 정하면 깊이 몰입하는', '더 넓은 세상을 향해 가는', '목표를 세우고 끝까지 오르는', '자기 방식으로 새 틀을 만드는', '느낌으로 세상을 이해하는'];

  var NEED = ['솔직한 표현', '변함없는 꾸준함', '통하는 대화', '따뜻한 돌봄', '진심 어린 인정', '세심한 배려', '서로 간의 존중', '흔들리지 않는 신뢰', '숨 쉴 자유', '믿을 수 있는 책임감', '각자의 공간', '말없이 통하는 공감'];

  var GIFT = ['밀어붙이는 추진력', '지치지 않는 끈기', '빠른 순발력', '사람을 품는 힘', '주변을 밝히는 자신감', '빈틈을 찾는 정확함', '사이를 잇는 조율 감각', '깊이 파고드는 집중력', '멀리 보는 낙관', '버텨 내는 인내', '틀을 깨는 독창성', '보이지 않는 걸 읽는 감수성'];

  var FACE = ['시원시원한 인상', '편안하고 믿음직한 인상', '말 붙이기 쉬운 인상', '따뜻하고 조심스러운 인상', '환하고 눈에 띄는 인상', '단정하고 깔끔한 인상', '호감 가는 세련된 인상', '묘하게 끌리는 인상',
    '밝고 솔직한 인상', '성숙하고 신중한 인상', '독특하고 쿨한 인상', '부드럽고 몽환적인 인상'];

  var TONE = ['솔직하고 뜨거운', '느긋하고 편안한', '가볍고 즐거운', '아늑하고 다정한', '화려하고 당당한', '차분하고 정돈된', '우아하고 균형 잡힌', '깊고 은밀한', '자유롭고 활기찬', '단단하고 진지한', '색다르고 자유로운', '몽글하고 낭만적인'];

  var TIME_NOTE = '태어난 시간을 몰라 첫인상·삶의 무대 해석은 뺐어요.';

  var JOSA = { '이': '이/가', '가': '이/가', '을': '을/를', '를': '을/를', '은': '은/는', '는': '은/는', '과': '과/와', '와': '과/와', '이나': '이나/나', '이에요': '이에요/예요', '이라': '이라/라' };

  function josa(w, j) {
    if (j === '으로' || j === '로') { var c = String(w).charCodeAt(w.length - 1) - 0xAC00, t = c >= 0 && c <= 11171 ? c % 28 : 0; return w + (t && t !== 8 ? '으로' : '로'); }
    return jo(w, JOSA[j] || j);
  }

  function fill(t, v) {
    return t.replace(/\{(\w+)(?::([^}]+))?\}/g, function (m, k, j) {
      if (v[k] == null) throw new Error('AstroNatalReading: no value for ' + k);
      return j ? josa(String(v[k]), j) : String(v[k]);
    });
  }

  function headlineOf(ctx) {
    var sun = ctx.pos.Sun.signIdx, moon = ctx.pos.Moon.signIdx;
    if (ctx.moonSigns) return ROLE_CORE[sun] + ' 사람이에요';
    if (ctx.timeKnown) {
      var asc = ctx.pos.ASC.signIdx;
      if (asc % 4 !== moon % 4) return '겉은 ' + ROLE_OUTER[asc] + ', 속은 ' + ROLE_INNER[moon] + ' 사람이에요';
      return ROLE_CORE[sun] + ' 사람이에요, 겉과 속이 한 방향으로 흘러요';
    }
    if (sun % 4 !== moon % 4) return ROLE_CORE[sun] + ' 사람이지만, 속에는 ' + ROLE_INNER[moon] + ' 마음이 있어요';
    return ROLE_CORE[sun] + ' 사람이에요, 뜻과 마음이 한 방향으로 흘러요';
  }

  function coverRows(ctx) {
    var sun = ctx.pos.Sun.signIdx, rows = [{ key: 'Sun', role: '의식하는 나', signIdx: sun, sign: SIGN[sun], phrase: GIFT[sun] }];
    if (ctx.moonSigns) rows.push({ key: 'Moon', role: '속마음', signIdx: ctx.pos.Moon.signIdx, signs: ctx.moonSigns, sign: SIGN[ctx.moonSigns[0]] + ' 또는 ' + SIGN[ctx.moonSigns[1]], phrase: NEED[ctx.moonSigns[0]] + ' 또는 ' + NEED[ctx.moonSigns[1]] });
    else rows.push({ key: 'Moon', role: '속마음', signIdx: ctx.pos.Moon.signIdx, signs: null, sign: SIGN[ctx.pos.Moon.signIdx], phrase: fill('{n:이} 있어야 편한 마음', { n: NEED[ctx.pos.Moon.signIdx] }) });
    if (ctx.timeKnown) rows.push({ key: 'ASC', role: '첫인상', signIdx: ctx.pos.ASC.signIdx, sign: SIGN[ctx.pos.ASC.signIdx], phrase: FACE[ctx.pos.ASC.signIdx] });
    return rows;
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function render(model) {
    var c = model.cover;
    return '<div class="as-reading as-story" id="asStory" data-astro-public-summary><header class="as-cover">'
      + '<h2 class="as-portrait">' + esc(model.portrait.headline) + '</h2><ul class="as-big3">'
      + c.big3.map(function (r) { return '<li class="as-big3-row"><span class="as-big3-role">' + esc(r.role) + '</span><span class="as-big3-sign">' + esc(r.sign) + '</span><span class="as-big3-phrase">' + esc(r.phrase) + '</span></li>'; }).join('')
      + '</ul>' + (model.notes.timeNote ? '<p class="as-time-note">' + esc(model.notes.timeNote) + '</p>' : '') + '</header></div>';
  }

  var SIGN_SHORT = ['양', '황소', '쌍둥이', '게', '사자', '처녀', '천칭', '전갈', '사수', '염소', '물병', '물고기'];

  var WHEEL_NAME = { Sun: '태양', Moon: '달', Mercury: '수성', Venus: '금성', Mars: '화성', Jupiter: '목성', Saturn: '토성', Uranus: '천왕', Neptune: '해왕', Pluto: '명왕' };

  var MEANS = { Sun: '나를 드러내는 방식', Moon: '마음이 편해지는 방식', Mercury: '생각하고 말하는 방식', Venus: '좋아하고 아끼는 방식', Mars: '밀어붙이는 방식',
    Jupiter: '기회를 넓히는 방식', Saturn: '책임을 지는 방식', Uranus: '변화를 맞는 방식', Neptune: '꿈꾸고 상상하는 방식', Pluto: '깊이 바뀌는 방식' };

  var HARD = { square: 1, opposition: 1 };

  function spread(lons, sep) {
    var idx = lons.map(function (t, i) { return i; }).sort(function (x, y) { return lons[x] - lons[y]; });
    var n = idx.length, cut = 0, widest = -1, seq = [], groups, out = [];
    for (var i = 0; i < n; i++) {
      var g = n === 1 ? 360 : norm(lons[idx[(i + 1) % n]] - lons[idx[i]]);
      if (g > widest) { widest = g; cut = (i + 1) % n; }
    }
    for (var k = 0; k < n; k++) {
      var j = idx[(cut + k) % n], t = lons[j];
      if (k && t < seq[k - 1].o) t += 360;
      seq.push({ j: j, o: t });
    }
    function place(gr) {
      var c = gr.reduce(function (s, x) { return s + x.o; }, 0) / gr.length;
      return gr.map(function (x, m) { return c + (m - (gr.length - 1) / 2) * sep; });
    }
    groups = seq.map(function (x) { return [x]; });
    for (var merged = true; merged;) {
      merged = false;
      for (var q = 0; q + 1 < groups.length; q++) {
        var A = place(groups[q]), B = place(groups[q + 1]);
        if (B[0] - A[A.length - 1] < sep) { groups.splice(q, 2, groups[q].concat(groups[q + 1])); merged = true; break; }
      }
    }
    groups.forEach(function (gr) { place(gr).forEach(function (t, m) { out[gr[m].j] = norm(t); }); });
    return out;
  }

  function wheelSvg(model) {
    var C = 160, R0 = 156, R1 = 128, RDOT = 118, RLAB = 92, RASP = 70;
    var a = model.angles, rot = a ? a.asc : 0, out = [];
    // ASC (0° Aries without a time) at 9 o'clock, zodiac counter-clockwise.
    function pt(lon, r) { var t = (180 + lon - rot) * Math.PI / 180; return [C + r * Math.cos(t), C - r * Math.sin(t)]; }
    function f(n) { return n.toFixed(1); }
    function line(cls, lon1, r1, lon2, r2) {
      var p = pt(lon1, r1), q = pt(lon2, r2);
      return '<line class="' + cls + '" x1="' + f(p[0]) + '" y1="' + f(p[1]) + '" x2="' + f(q[0]) + '" y2="' + f(q[1]) + '"/>';
    }
    out.push('<svg class="as-wheel-svg" viewBox="-4 -4 328 328" aria-hidden="true" focusable="false">');
    out.push('<circle class="as-wheel-ring" cx="160" cy="160" r="' + R0 + '"/><circle class="as-wheel-ring" cx="160" cy="160" r="' + R1 + '"/><circle class="as-wheel-ring is-faint" cx="160" cy="160" r="' + RASP + '"/>');
    for (var s = 0; s < 12; s++) {
      out.push(line('as-wheel-sector', s * 30, R1, s * 30, R0));
      // Sign names run along the ring (3-letter names are wider than the band), upright on the lower half.
      var tp = pt(s * 30 + 15, (R0 + R1) / 2), sa = norm(180 + s * 30 + 15 - rot), turn = sa > 180 ? 270 - sa : 90 - sa;
      out.push('<text class="as-wheel-sign" x="' + f(tp[0]) + '" y="' + f(tp[1]) + '" transform="rotate(' + f(turn) + ' ' + f(tp[0]) + ' ' + f(tp[1]) + ')" text-anchor="middle" dominant-baseline="central">' + SIGN_SHORT[s] + '</text>');
    }
    if (a) {
      a.cusps.forEach(function (c) { out.push(line('as-wheel-cusp', c, RASP, c, R1)); });
      out.push(line('as-wheel-axis', a.asc, R1, a.asc + 180, R1), line('as-wheel-axis', a.mc, R1, a.mc + 180, R1));
    }
    var byBody = {};
    model.planets.forEach(function (p) { byBody[p.body] = p; });
    model.aspects.filter(function (x) { return byBody[x.a] && byBody[x.b] && x.type !== 'conjunction'; }).slice(0, 5).forEach(function (x) {
      out.push(line('as-wheel-aspect' + (HARD[x.type] ? ' is-hard' : ''), byBody[x.a].lon, RASP, byBody[x.b].lon, RASP));
    });
    // Labels share one ring, pushed apart where planets crowd and tied to their dot by a leader.
    var at = spread(model.planets.map(function (p) { return p.lon; }), 21);
    var labs = model.planets.map(function (p, i) { return { p: p, t: at[i] }; });
    // Dots within 4° of the previous one step 6 inward (clear of the label ring) so a conjunction reads as two points.
    var prevLon = null, step = 0;
    labs.slice().sort(function (x, y) { return x.p.lon - y.p.lon; }).forEach(function (l) {
      step = prevLon != null && l.p.lon - prevLon < 4 ? (step + 1) % 2 : 0;
      l.r = RDOT - step * 6; prevLon = l.p.lon;
    });
    // Leaders and labels first, every dot last, so no label halo covers a dot.
    labs.forEach(function (l) {
      var p = l.p, lp = pt(l.t, RLAB);
      if (gap(p.lon, l.t) > 3 || l.r !== RDOT) out.push(line('as-wheel-leader', p.lon, l.r - 4, l.t, RLAB + 9));
      out.push('<text class="as-wheel-label" x="' + f(lp[0]) + '" y="' + f(lp[1]) + '" text-anchor="middle" dominant-baseline="central">' + WHEEL_NAME[p.body] + '</text>');
    });
    labs.forEach(function (l) {
      var p = l.p, key = p.body === 'Sun' || p.body === 'Moon', dot = pt(p.lon, l.r);
      out.push('<circle class="as-wheel-dot' + (key ? ' is-key' : '') + (p.uncertain ? ' is-open' : '') + '" cx="' + f(dot[0]) + '" cy="' + f(dot[1]) + '" r="' + (key ? 3.6 : 2.6) + '"/>');
    });
    out.push('</svg>');
    return out.join('');
  }

  var GLYPH = {
    sun: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>',
    moon: '<path d="M18 5A8 8 0 1 0 18 19A9 9 0 0 1 18 5z"/>',
    mercury: '<circle cx="12" cy="12" r="4.5"/><path d="M12 16.5V22M9.5 19.5h5M8 3a4.5 4.5 0 0 0 8 0"/>',
    venus: '<circle cx="12" cy="9" r="5.5"/><path d="M12 14.5V22M8.5 18.5h7"/>',
    mars: '<circle cx="10" cy="14" r="5.5"/><path d="M14 10l6-6M15 4h5v5"/>',
    jupiter: '<path d="M5 7.5c1.5-3 6-3.5 6 .5 0 3-3 6-6 8.5h14M15.5 3v18"/>',
    saturn: '<path d="M8 3v14M5 6h6M8 12c1.5-2.5 7-2.5 7 1.5 0 3-3 4.5-3 6.5 0 1.2 1 1.6 2 1"/>',
    uranus: '<path d="M6 4v9M18 4v9M6 8.5h12M12 4v11"/><circle cx="12" cy="18" r="2.5"/>',
    neptune: '<path d="M5 5v4a7 7 0 0 0 14 0V5M12 4v17M8 18h8"/>',
    pluto: '<path d="M6.5 7a5.5 5.5 0 0 0 11 0"/><circle cx="12" cy="7" r="2.4"/><path d="M12 12.5V22M8.5 18.5h7"/>',
    aries: '<path d="M12 21V10M12 10C12 5 9.5 3 7 3.5S3.5 7 5 9.5M12 10c0-5 2.5-7 5-6.5S20.5 7 19 9.5"/>',
    taurus: '<circle cx="12" cy="15" r="5.5"/><path d="M4 4c1 4 4 5.5 8 5.5s7-1.5 8-5.5"/>',
    gemini: '<path d="M5 4c4 1.5 10 1.5 14 0M5 20c4-1.5 10-1.5 14 0M9 5v14M15 5v14"/>',
    cancer: '<circle cx="7" cy="9.5" r="2.5"/><circle cx="17" cy="14.5" r="2.5"/><path d="M7 7c4-3 9-2.5 12.5 1M17 17c-4 3-9 2.5-12.5-1"/>',
    leo: '<circle cx="7" cy="15" r="3"/><path d="M10 15c0-5-1-11 4-11s5 4.5 3 8.5-2.5 6 0 7.5c1 .6 2 .3 3-.5"/>',
    virgo: '<path d="M4 6c1.5 0 2 1 2 2.5V18M6 8.5c0-3 4-3 4 0V18M10 8.5c0-3 4-3 4 0V15c0 3 2.5 4.5 5.5 3.5M14 11c3-1.5 6 0 5 3.5S15.5 20 13 21"/>',
    libra: '<path d="M4 20h16M4 16h5a3.5 3.5 0 1 1 6 0h5"/>',
    scorpio: '<path d="M3 6c1.5 0 2 1 2 2.5V18M5 8.5c0-3 4-3 4 0V18M9 8.5c0-3 4-3 4 0V18c0 1.5 1 2 2.5 2H20M17.5 17.5L20 20l-2.5 2.5"/>',
    sagittarius: '<path d="M5 19L19 5M12 5h7v7M7.5 11.5l5 5"/>',
    capricorn: '<path d="M3.5 6c1.5 0 2.5 1 3 3l2 7 2.5-10v9c0 3 2 5 5 5a2.8 2.8 0 1 0-2.6-3.8"/>',
    aquarius: '<path d="M3 10l3-3 3 3 3-3 3 3 3-3 3 3M3 16.5l3-3 3 3 3-3 3 3 3-3 3 3"/>',
    pisces: '<path d="M6 4c3.5 3 3.5 13 0 16M18 4c-3.5 3-3.5 13 0 16M5.5 12h13"/>',
    asc: '<path d="M12 20V5M7 10l5-5 5 5M5 20h14"/>',
    dsc: '<path d="M12 4v15M7 14l5 5 5-5M5 4h14"/>',
    mc: '<path d="M4 19V6l8 9 8-9v13"/>'
  };

  var SIGN_GLYPH = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];

  var BODY_GLYPH = { Sun: 'sun', Moon: 'moon', Mercury: 'mercury', Venus: 'venus', Mars: 'mars', Jupiter: 'jupiter', Saturn: 'saturn', Uranus: 'uranus', Neptune: 'neptune', Pluto: 'pluto', ASC: 'asc', DSC: 'dsc', MC: 'mc' };

  function glyphKey(k) { return typeof k === 'number' ? SIGN_GLYPH[((k % 12) + 12) % 12] : (BODY_GLYPH[k] || k); }

  function glyphSprite() {
    return '<svg class="as-glyph-sprite" id="asGlyphSprite" width="0" height="0" aria-hidden="true" focusable="false"><defs>' + Object.keys(GLYPH).map(function (k) {
      return '<symbol id="asg-' + k + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + GLYPH[k] + '</symbol>';
    }).join('') + '</defs></svg>';
  }

  function ensureGlyphSprite(doc) {
    doc = doc || (typeof document !== 'undefined' ? document : null);
    if (!doc || !doc.body || doc.getElementById('asGlyphSprite')) return;
    doc.body.insertAdjacentHTML('beforeend', glyphSprite());
  }

  function glyph(k, cls) {
    var key = glyphKey(k);
    if (!GLYPH[key]) return '';
    return '<svg class="as-glyph' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#asg-' + key + '"/></svg>';
  }

  function glyphUse(k, x, y, s, cls) {
    var key = glyphKey(k);
    if (!GLYPH[key]) return '';
    return '<use' + (cls ? ' class="' + cls + '"' : '') + ' href="#asg-' + key + '" x="' + (x - s / 2).toFixed(1) + '" y="' + (y - s / 2).toFixed(1) + '" width="' + s + '" height="' + s + '"/>';
  }

  function f1(n) { return n.toFixed(1); }

  function ringPt(C, rot) { return function (lon, r) { var t = (180 + lon - rot) * Math.PI / 180; return [C + r * Math.cos(t), C - r * Math.sin(t)]; }; }

  function zodiacRing(pt, C, R0, R1, gs, hi) {
    var out = ['<circle class="as-ill-ring" cx="' + C + '" cy="' + C + '" r="' + R0 + '"/><circle class="as-ill-ring" cx="' + C + '" cy="' + C + '" r="' + R1 + '"/>'];
    for (var s = 0; s < 12; s++) {
      var a = pt(s * 30, R1), b = pt(s * 30, R0), g = pt(s * 30 + 15, (R0 + R1) / 2);
      out.push('<line class="as-ill-tick" x1="' + f1(a[0]) + '" y1="' + f1(a[1]) + '" x2="' + f1(b[0]) + '" y2="' + f1(b[1]) + '"/>');
      out.push(glyphUse(s, g[0], g[1], gs, 'as-ill-sign' + (hi && hi.indexOf(s) >= 0 ? ' is-hi' : '')));
    }
    return out.join('');
  }

  function starMapSvg(opt) {
    var C = 120, R0 = 114, R1 = 94, RDOT = 84, RG = 66, rot = opt.asc != null ? opt.asc : 0, pt = ringPt(C, rot), out = [];
    var ps = (opt.planets || []).filter(function (p) { return isFinite(p.lon); }).slice().sort(function (a, b) { return a.lon - b.lon; });
    var dl = ps.length ? spread(ps.map(function (p) { return p.lon; }), 5) : [];
    out.push('<svg class="as-ill as-ill-starmap" viewBox="0 0 240 240" aria-hidden="true" focusable="false">');
    out.push(zodiacRing(pt, C, R0, R1, 13, ps.filter(function (p) { return p.body === 'Sun' || p.body === 'Moon'; }).map(function (p) { return Math.floor(p.lon / 30) % 12; })));
    if (opt.asc != null) {
      [opt.asc, opt.asc + 180].forEach(function (t) { var l = pt(t, R1), r = pt(t, RG + 14); out.push('<line class="as-ill-axis" x1="' + f1(l[0]) + '" y1="' + f1(l[1]) + '" x2="' + f1(r[0]) + '" y2="' + f1(r[1]) + '"/>'); });
    }
    if (ps.length > 1) {
      out.push('<polyline class="as-ill-link" points="' + ps.map(function (p, i) { var q = pt(dl[i], RDOT); return f1(q[0]) + ',' + f1(q[1]); }).join(' ') + '"/>');
    }
    var at = ps.length ? spread(ps.map(function (p) { return p.lon; }), 16) : [];
    ps.forEach(function (p, i) {
      var q = pt(at[i], RG);
      if (gap(dl[i], at[i]) > 3) { var d = pt(dl[i], RDOT - 4), e = pt(at[i], RG + 8); out.push('<line class="as-ill-leader" x1="' + f1(d[0]) + '" y1="' + f1(d[1]) + '" x2="' + f1(e[0]) + '" y2="' + f1(e[1]) + '"/>'); }
      out.push(glyphUse(p.body, q[0], q[1], 13, 'as-ill-body' + (p.body === 'Sun' || p.body === 'Moon' ? ' is-key' : '')));
    });
    ps.forEach(function (p, i) {
      var key = p.body === 'Sun' || p.body === 'Moon', q = pt(dl[i], RDOT);
      out.push('<circle class="as-ill-dot' + (key ? ' is-key' : '') + '" cx="' + f1(q[0]) + '" cy="' + f1(q[1]) + '" r="' + (key ? 3.4 : 2.4) + '"/>');
    });
    out.push('</svg>');
    return out.join('');
  }

  function jupiterArcSvg(opt) {
    var C = 100, R0 = 94, R1 = 76, RA = 62, s = ((opt.sign % 12) + 12) % 12, pt = ringPt(C, 0), out = [];
    function arc(cls, a0, a1) { var p = pt(a0, RA), q = pt(a1, RA); return '<path class="' + cls + '" d="M' + f1(p[0]) + ' ' + f1(p[1]) + 'A' + RA + ' ' + RA + ' 0 0 0 ' + f1(q[0]) + ' ' + f1(q[1]) + '"/>'; }
    out.push('<svg class="as-ill as-ill-jupiter" viewBox="0 0 200 200" aria-hidden="true" focusable="false">');
    out.push(zodiacRing(pt, C, R0, R1, 12, [s]));
    out.push('<circle class="as-ill-ring is-faint" cx="' + C + '" cy="' + C + '" r="' + RA + '"/>');
    out.push(arc('as-ill-path is-past', (s - 1) * 30, s * 30), arc('as-ill-path is-now', s * 30, s * 30 + 27));
    var tip = pt(s * 30 + 30, RA), a = pt(s * 30 + 25, RA + 5), b = pt(s * 30 + 25, RA - 5), j = pt(s * 30 + 15, RA);
    out.push('<path class="as-ill-arrow" d="M' + f1(a[0]) + ' ' + f1(a[1]) + 'L' + f1(tip[0]) + ' ' + f1(tip[1]) + 'L' + f1(b[0]) + ' ' + f1(b[1]) + '"/>');
    out.push('<circle class="as-ill-dot is-key" cx="' + f1(j[0]) + '" cy="' + f1(j[1]) + '" r="3.4"/>');
    out.push(glyphUse('jupiter', C, C - 14, 20, 'as-ill-body is-key'));
    if (opt.label) out.push('<text class="as-ill-label" x="' + C + '" y="' + (C + 18) + '" text-anchor="middle">' + esc(opt.label) + '</text>');
    out.push('</svg>');
    return out.join('');
  }

  function loveTriangleSvg(opt) {
    var C = 100, R0 = 94, R1 = 78, RP = 56, pt = ringPt(C, 0), out = [], pts = {};
    var marks = [['venus', opt.venus, '끌림'], ['mars', opt.mars, '행동'], ['dsc', opt.dsc, '짝']].filter(function (m) { return m[1] != null; });
    out.push('<svg class="as-ill as-ill-love" viewBox="0 0 200 200" aria-hidden="true" focusable="false">');
    out.push(zodiacRing(pt, C, R0, R1, 11, marks.map(function (m) { return m[1]; })));
    var at = marks.length ? spread(marks.map(function (m) { return m[1] * 30 + 15; }), 34) : [];
    marks.forEach(function (m, i) { pts[m[0]] = pt(at[i], RP); });
    // 선은 노드 테두리 밖(r 15 + 2)에서 끊어 기호를 가로지르지 않게 한다.
    function edge(a, b, cls) {
      if (!pts[a] || !pts[b]) return;
      var p = pts[a], q = pts[b], dx = q[0] - p[0], dy = q[1] - p[1], d = Math.sqrt(dx * dx + dy * dy), k = 17 / (d || 1);
      if (d <= 34) return;
      out.push('<line class="' + cls + '" x1="' + f1(p[0] + dx * k) + '" y1="' + f1(p[1] + dy * k) + '" x2="' + f1(q[0] - dx * k) + '" y2="' + f1(q[1] - dy * k) + '"/>');
    }
    edge('venus', 'dsc', 'as-ill-edge'); edge('mars', 'dsc', 'as-ill-edge');
    edge('venus', 'mars', 'as-ill-edge is-main' + (opt.tone === 'tense' ? ' is-tense' : opt.tone === 'harmony' ? '' : ' is-soft'));
    marks.forEach(function (m) {
      var p = pts[m[0]];
      out.push('<circle class="as-ill-node" cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="15"/>' + glyphUse(m[0], p[0], p[1], 20, 'as-ill-body is-key'));
    });
    out.push('</svg>');
    return out.join('');
  }

  function triadSvg(opt) {
    var P = { sun: [60, 16], moon: [22, 66], asc: [98, 66] }, out = [];
    out.push('<svg class="as-ill as-ill-triad" viewBox="0 0 120 84" aria-hidden="true" focusable="false">');
    // 선은 노드 테두리 밖(r 13 + 2)에서 끊어 기호를 가로지르지 않게 한다.
    [['sun', 'moon'], ['moon', 'asc'], ['asc', 'sun']].forEach(function (e) {
      var p = P[e[0]], q = P[e[1]], dx = q[0] - p[0], dy = q[1] - p[1], k = 15 / Math.sqrt(dx * dx + dy * dy);
      out.push('<line class="as-ill-edge' + (opt.ascKnown ? '' : ' is-soft') + '" x1="' + f1(p[0] + dx * k) + '" y1="' + f1(p[1] + dy * k) + '" x2="' + f1(q[0] - dx * k) + '" y2="' + f1(q[1] - dy * k) + '"/>');
    });
    ['sun', 'moon', 'asc'].forEach(function (k) {
      var p = P[k], open = k === 'asc' && !opt.ascKnown;
      out.push('<circle class="as-ill-node' + (open ? ' is-open' : '') + '" cx="' + p[0] + '" cy="' + p[1] + '" r="13"/>');
      if (!open) out.push(glyphUse(k, p[0], p[1], 15, 'as-ill-body is-key'));
    });
    out.push('</svg>');
    return out.join('');
  }

  function posRow(head, sign, house, mean) {
    return '<tr><th scope="row">' + head + '</th><td>' + sign + '</td>' + (house == null ? '' : '<td class="as-num">' + house + '</td>') + '<td class="as-mean">' + esc(mean) + '</td></tr>';
  }

  function renderChart(model) {
    var a = model.angles, h = [], moonSigns = model.notes.moonSigns;
    var cap = a ? '왼쪽 끝이 첫인상(ASC)이에요. 굵은 두 축은 첫인상과 사회적 얼굴(MC)을, 가운데 선은 서로 영향을 크게 주고받는 행성을 이어요.'
      : '태어난 시간을 몰라 집과 축은 그리지 않았어요. 왼쪽 끝이 양자리 0°예요.' + (moonSigns ? ' 달은 그날 별자리를 옮겨서 속이 빈 점으로 그렸어요.' : '');
    h.push('<figure class="as-wheel">' + wheelSvg(model) + '<figcaption class="as-wheel-cap">' + esc(cap) + '</figcaption></figure>');
    var rows = model.planets.map(function (p) {
      var sign = p.uncertain ? SIGN[moonSigns[0]] + ' 또는 ' + SIGN[moonSigns[1]] : '<span class="as-sign">' + p.sign + '</span> <span class="as-deg">' + p.degText + '</span>';
      var mean = p.uncertain ? '태어난 날 달이 별자리를 옮겨서 두 별자리의 결이 섞여 있어요.' : fill('{means:이} {tone} 편이에요.', { means: MEANS[p.body], tone: TONE[p.signIdx] });
      return posRow(esc(p.ko) + (p.retro ? ' <span class="as-rx">역행</span>' : ''), sign, a ? p.house : null, mean);
    });
    if (a) {
      rows.push(posRow('첫인상(ASC)', '<span class="as-sign">' + SIGN[a.ascSign] + '</span> <span class="as-deg">' + degText(a.asc % 30) + '</span>', 1, fill('처음 만난 사람에게 {face:으로} 보여요.', { face: FACE[a.ascSign] })));
      rows.push(posRow('사회적 얼굴(MC)', '<span class="as-sign">' + SIGN[a.mcSign] + '</span> <span class="as-deg">' + degText(a.mc % 30) + '</span>', 10, TONE[a.mcSign] + ' 모습으로 기억되고 싶어 해요.'));
    }
    var diff = a ? model.planets.filter(function (p) { return p.house !== p.wholeHouse; }) : [];
    var foot = diff.length ? '집은 플라시더스 방식으로 셌어요. 별자리 단위로 세면 ' + diff.map(function (p) { return josa(p.ko, '은') + ' ' + p.wholeHouse + '번째'; }).join(', ') + ' 집이에요.' : '';
    h.push('<details class="as-pos"><summary>행성 위치 표</summary><table class="as-pos-table"><thead><tr><th scope="col">행성</th><th scope="col">별자리</th>'
      + (a ? '<th scope="col" class="as-num">집</th>' : '') + '<th scope="col" class="as-mean">한 줄 의미</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>'
      + (foot ? '<p class="as-foot">' + esc(foot) + '</p>' : '') + '</details>');
    return '<div class="as-reading as-chart' + (a ? '' : ' is-timeless') + '" id="asChart">' + h.join('') + '</div>';
  }

  function context(chart, opts) {
    var timeKnown = opts.timeKnown !== false && !!(chart.asc && chart.mc);
    var cusps = timeKnown ? cuspsOf(chart) : null;
    var pos = positions(chart, cusps);
    var md = opts.moonDay;
    var ctx = {
      timeKnown: !!cusps,
      cusps: cusps,
      pos: pos,
      moonSigns: !cusps && md && md.length === 2 && isFinite(md[0]) && isFinite(md[1]) && md[0] !== md[1] ? [+md[0], +md[1]] : null,
      cuspSign: function (n) { return Math.floor(cusps[n - 1] / 30); }
    };
    ctx.aspects = aspectsOf(pos, ctx.timeKnown);
    ctx.balance = balanceOf(pos, ctx.moonSigns);
    ctx.stellium = stelliumOf(pos, ctx.moonSigns);
    ctx.sect = cusps ? (pos.Sun.house >= 7 ? 'day' : 'night') : null;
    ctx.age = ageOf(opts.birth, opts.today);
    ctx.profection = cusps && ctx.age ? (function () {
      var n = ctx.age.age % 12, s = (pos.ASC.signIdx + n) % 12;
      return { age: ctx.age.age, house: n + 1, signIdx: s, lord: RULER[s] };
    })() : null;
    ctx.firdaria = ctx.sect && ctx.age ? firdariaOf(ctx.sect, ctx.age) : null;
    return ctx;
  }

  function build(chart, opts) {
    opts = opts || {};
    if (!chart || !chart.sun || !chart.moon) throw new Error('AstroNatalReading.build: chart is missing the Sun or Moon');
    var ctx = context(chart, opts);
    var planets = BODIES.filter(function (b) { return ctx.pos[b]; }).map(function (b) {
      var p = ctx.pos[b];
      return { body: b, ko: KO[b], lon: round1(p.lon), uncertain: b === 'Moon' && !!ctx.moonSigns, signIdx: p.signIdx, sign: SIGN[p.signIdx], deg: round1(p.deg), degText: degText(p.deg), house: p.house || null, wholeHouse: p.wholeHouse || null, retro: p.retro, dignity: p.dignity, angular: !!p.angular };
    });
    var band = BODIES.filter(function (b) { return ctx.pos[b]; }).map(function (b) { return { body: b, lon: round1(ctx.pos[b].lon) }; });
    if (ctx.timeKnown) band.push({ body: 'ASC', lon: round1(ctx.pos.ASC.lon) });
    return {
      timeKnown: ctx.timeKnown,
      cover: {
        name: opts.name ? String(opts.name) : '',
        timeKnown: ctx.timeKnown,
        big3: coverRows(ctx),
        band: band
      },
      portrait: { headline: headlineOf(ctx) },
      planets: planets,
      angles: ctx.timeKnown ? { asc: round1(ctx.pos.ASC.lon), mc: round1(ctx.pos.MC.lon), ascSign: ctx.pos.ASC.signIdx, mcSign: ctx.pos.MC.signIdx, cusps: ctx.cusps.map(round1) } : null,
      aspects: ctx.aspects.slice(),
      periods: { age: ctx.age ? ctx.age.age : null, sect: ctx.sect, profection: ctx.profection, firdaria: ctx.firdaria },
      balance: ctx.balance,
      stellium: ctx.stellium,
      notes: { moonSigns: ctx.moonSigns, timeNote: ctx.timeKnown ? null : TIME_NOTE }
    };
  }

  function legacyPeriods(model) {
    var p = model && model.periods, f = p && p.firdaria, pr = p && p.profection, out = { firdaria: null, profection: null };
    if (f && CORE.indexOf(f.current.lord) >= 0) {
      out.firdaria = { main: KO[f.current.lord], sub: f.current.sub ? KO[f.current.sub.lord] : null, fromYear: f.current.fromYear, toYear: f.current.toYear, sect: f.sect };
    }
    if (pr) out.profection = { houseIdx: pr.house - 1, signIdx: pr.signIdx, lord: KO[pr.lord], age: pr.age };
    return out;
  }
  return { build: build, legacyPeriods: legacyPeriods, render: render, renderChart: renderChart, glyph: glyph, glyphUse: glyphUse, starMapSvg: starMapSvg, jupiterArcSvg: jupiterArcSvg, loveTriangleSvg: loveTriangleSvg, triadSvg: triadSvg, glyphSprite: glyphSprite, ensureGlyphSprite: ensureGlyphSprite,
    _shared: { renderChart, legacyPeriods, fill, SIGN, KO, RULER, dignity, houseOf, aspectsOf, degText, jo, context, BODIES, round1, coverRows, TIME_NOTE, esc, HARD, wheelSvg, MEANS, TONE, posRow, FACE, josa, CORE, EXALT, norm, SLOW, gap, ORB, ASPECTS, batchim, cuspsOf, positions, balanceOf, stelliumOf, ageOf, firdariaOf, NEED, GIFT, EL_KO, MODE_KO, PERSONAL, headlineOf, ELEMENTS, SIGN_SHORT, spread, WHEEL_NAME, JOSA, lonOf, MODES, WEIGHT, parseDay, dayNum, FIRDARIA, CHALDEAN, ROLE_CORE, ROLE_OUTER, ROLE_INNER }
  };
});

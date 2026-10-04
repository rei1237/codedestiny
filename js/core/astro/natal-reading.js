/* Natal astrology reading (display only). Chart in, plain-Korean reading model and HTML out.
 * Pure: no DOM, no page globals, no clock, no randomness, no requests — the date arrives as options.today.
 * Houses are Placidus from chart.houseCuspsLon (whole sign from the ASC only when the cusps are missing).
 * Rulers are traditional so the chart's lord stays personal instead of becoming a generational planet.
 * Without a birth time every house, ASC, MC, sect, profection and firdaria claim is left out. */
(function (root) {
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
  var OUTER = { Uranus: 1, Neptune: 1, Pluto: 1 };
  var KO = { Sun: '태양', Moon: '달', Mercury: '수성', Venus: '금성', Mars: '화성', Jupiter: '목성', Saturn: '토성', Uranus: '천왕성', Neptune: '해왕성', Pluto: '명왕성', NorthNode: '북쪽 교점', SouthNode: '남쪽 교점', ASC: '첫인상 별자리', MC: '사회에서 보이는 모습' };
  var RULER = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  var EXALT = { Sun: 0, Moon: 1, Mercury: 5, Venus: 11, Mars: 9, Jupiter: 3, Saturn: 6 };
  var ORB = { Sun: 8, Moon: 8, Mercury: 6, Venus: 6, Mars: 6 };
  var ASPECTS = [['conjunction', 0], ['sextile', 60], ['square', 90], ['trine', 120], ['opposition', 180]];
  var ASPECT_KO = { conjunction: '한자리에 모인 사이', sextile: '가볍게 돕는 사이', square: '부딪히며 키우는 사이', trine: '편하게 돕는 사이', opposition: '마주 보며 균형을 찾는 사이' };
  var WEIGHT = { Sun: 3, Moon: 3, ASC: 3, Mercury: 2, Venus: 2, Mars: 2, Jupiter: 1, Saturn: 1, Uranus: 0.5, Neptune: 0.5, Pluto: 0.5 };
  var FIRDARIA = {
    day: [['Sun', 10], ['Venus', 8], ['Mercury', 13], ['Moon', 9], ['Saturn', 11], ['Jupiter', 12], ['Mars', 7], ['NorthNode', 3], ['SouthNode', 2]],
    night: [['Moon', 9], ['Saturn', 11], ['Jupiter', 12], ['Mars', 7], ['Sun', 10], ['Venus', 8], ['Mercury', 13], ['NorthNode', 3], ['SouthNode', 2]]
  };
  var CHALDEAN = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];
  var CATS = [['love', '연애'], ['money', '재물'], ['people', '인간관계'], ['work', '일'], ['heal', '마음과 회복'], ['growth', '성장']];

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
  function aspectTone(a) {
    if (a.type === 'trine' || a.type === 'sextile') return 'flow';
    if (a.type === 'square' || a.type === 'opposition') return 'tension';
    var hard = { Saturn: 1, Mars: 1, Pluto: 1 }, soft = { Jupiter: 1, Venus: 1 };
    if (hard[a.a] || hard[a.b]) return 'tension';
    if (soft[a.a] || soft[a.b]) return 'flow';
    return 'neutral';
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

  /* ── evidence ── */
  function bodyLabel(ctx, body) {
    var p = ctx.pos[body], parts = [KO[body]];
    parts.push(body === 'Moon' && ctx.moonSigns ? SIGN[ctx.moonSigns[0]] + ' 또는 ' + SIGN[ctx.moonSigns[1]] : SIGN[p.signIdx]);
    if (p.house && body !== 'ASC' && body !== 'MC') parts.push(p.house + '번째 집');
    return parts.join(' · ');
  }
  function evBody(ctx, body, aspect) {
    var p = ctx.pos[body];
    if (!p) return null;
    var e = { body: body, signIdx: p.signIdx, label: bodyLabel(ctx, body) };
    if (p.house && body !== 'ASC' && body !== 'MC') e.house = p.house;
    if (aspect) {
      e.aspect = { with: aspect.with, type: aspect.type, orb: aspect.orb };
      e.label += ' · ' + jo(KO[aspect.with], '과/와') + ' ' + ASPECT_KO[aspect.type];
    }
    return e;
  }
  function evHouse(ctx, n) { var s = ctx.cuspSign(n); return { body: 'house', house: n, signIdx: s, label: n + '번째 집 · ' + SIGN[s] + '에서 시작' }; }

  /* ── category factors ── */
  function factor(key, kind, w, data, ev) { return { key: key, kind: kind, w: w, data: data, ev: ev.filter(Boolean) }; }
  function signF(ctx, body, w, anchor) {
    var p = ctx.pos[body];
    if (!p || (body === 'Moon' && ctx.moonSigns) || (OUTER[body] && !p.house)) return null;
    return factor(body, 'sign', w, { body: body, signIdx: p.signIdx, house: p.house || null, anchor: !!anchor }, [evBody(ctx, body)]);
  }
  function cuspF(ctx, n, w, anchor) {
    if (!ctx.cusps) return null;
    var s = ctx.cuspSign(n), ruler = RULER[s], r = ctx.pos[ruler];
    return factor('h' + n, 'cusp', w, { house: n, signIdx: s, ruler: ruler, rulerHouse: r.house, rulerSign: r.signIdx, anchor: !!anchor }, [evHouse(ctx, n), evBody(ctx, ruler)]);
  }
  function angleF(ctx, angle, w, anchor) {
    var p = ctx.pos[angle];
    if (!p) return null;
    var data = { angle: angle, signIdx: p.signIdx, anchor: !!anchor }, ev = [evBody(ctx, angle)];
    if (angle === 'MC') { data.ruler = RULER[p.signIdx]; data.rulerHouse = ctx.pos[data.ruler].house; ev.push(evBody(ctx, data.ruler)); }
    return factor(angle, 'angle', w, data, ev);
  }
  function occupantsF(ctx, n, w) {
    if (!ctx.cusps) return null;
    var bodies = BODIES.filter(function (b) { return ctx.pos[b] && ctx.pos[b].house === n; });
    if (!bodies.length) return null;
    var lead = bodies.slice().sort(function (a, b) { return (WEIGHT[b] - WEIGHT[a]) || BODIES.indexOf(a) - BODIES.indexOf(b); })[0];
    return factor('in' + n, 'occupants', w, { house: n, bodies: bodies, lead: lead }, bodies.map(function (b) { return evBody(ctx, b); }));
  }
  function aspectF(ctx, body, w) {
    var hit = ctx.aspects.filter(function (a) { return (a.a === body || a.b === body) && a.a !== 'ASC' && a.b !== 'ASC' && a.a !== 'MC' && a.b !== 'MC'; })[0];
    if (!hit) return null;
    var other = hit.a === body ? hit.b : hit.a;
    return factor('asp:' + hit.a + '-' + hit.b, 'aspect', w, { body: body, other: other, type: hit.type, orb: hit.orb, exact: hit.exact },
      [evBody(ctx, body, { with: other, type: hit.type, orb: hit.orb }), evBody(ctx, other)]);
  }
  function houseOfF(ctx, body, w) {
    var p = ctx.pos[body];
    if (!p || !p.house) return null;
    return factor(body, 'house-of', w, { body: body, house: p.house, signIdx: p.signIdx }, [evBody(ctx, body)]);
  }
  function emptyF(ctx, w) {
    var el = ctx.balance.empty[0];
    if (!el) return null;
    return factor('empty:' + el, 'empty', w, { element: el }, [{ body: 'balance', element: el, label: '원소 균형 · 개인 행성에 ' + EL_KO[el] + ' 기운 없음' }]);
  }
  function leadF(ctx, w) {
    var el = ctx.balance.leading, row = ctx.balance.elements.filter(function (r) { return r.key === el; })[0];
    if (!row) return null;
    return factor('lead:' + el, 'lead', w, { element: el, share: row.share }, [{ body: 'balance', element: el, label: '원소 균형 · ' + EL_KO[el] + ' 기운이 가장 많음 ' + row.share + '%' }]);
  }
  function profectionF(ctx, w, anchor) {
    var pr = ctx.profection;
    if (!pr) return null;
    return factor('profection', 'profection', w, { house: pr.house, signIdx: pr.signIdx, lord: pr.lord, lordHouse: ctx.pos[pr.lord].house, anchor: !!anchor },
      [{ body: 'profection', house: pr.house, signIdx: pr.signIdx, label: '올해의 주제 집 · ' + pr.house + '번째 집 · ' + SIGN[pr.signIdx] }, evBody(ctx, pr.lord)]);
  }
  function firdariaF(ctx, w) {
    var f = ctx.firdaria;
    if (!f) return null;
    var c = f.current;
    return factor('firdaria', 'firdaria', w, { lord: c.lord, fromYear: c.fromYear, toYear: c.toYear },
      [{ body: 'firdaria', lord: c.lord, label: '인생 시기 지도 · ' + KO[c.lord] + '의 시기 · ' + c.fromYear + '~' + c.toYear + '년' }].concat(ctx.pos[c.lord] ? [evBody(ctx, c.lord)] : []));
  }

  var BUILDERS = {
    love: function (c) {
      return [signF(c, 'Venus', 3, true), signF(c, 'Moon', 2), signF(c, 'Mars', 2), cuspF(c, 5, 2), cuspF(c, 7, 2), aspectF(c, 'Venus', 2), signF(c, 'Sun', 0.5)];
    },
    money: function (c) {
      var timed = !!c.cusps;
      return [timed ? cuspF(c, 2, 3, true) : signF(c, 'Venus', 3, true), occupantsF(c, 2, 2), signF(c, 'Jupiter', 2), timed ? signF(c, 'Venus', 1) : null,
        occupantsF(c, 8, 1) || cuspF(c, 8, 1), signF(c, 'Saturn', 1), signF(c, 'Mercury', 0.5)];
    },
    people: function (c) {
      return [signF(c, 'Mercury', 2, true), cuspF(c, 11, 2), cuspF(c, 7, 2), signF(c, 'Moon', 2), angleF(c, 'ASC', 2), cuspF(c, 3, 1), aspectF(c, 'Mercury', 1), signF(c, 'Venus', 0.5), signF(c, 'Jupiter', 0.5)];
    },
    work: function (c) {
      var timed = !!c.cusps;
      return [timed ? angleF(c, 'MC', 3, true) : signF(c, 'Sun', 3, true), occupantsF(c, 10, 2), cuspF(c, 6, 2), signF(c, 'Saturn', 2),
        timed ? houseOfF(c, 'Sun', 1) : null, signF(c, 'Mars', 1), signF(c, 'Mercury', 0.5)];
    },
    heal: function (c) {
      return [c.moonSigns ? factor('Moon', 'moon-pair', 3, { signs: c.moonSigns, anchor: true }, [evBody(c, 'Moon')]) : signF(c, 'Moon', 3, true),
        aspectF(c, 'Moon', 1.5), cuspF(c, 4, 2), cuspF(c, 12, 2), cuspF(c, 6, 1), houseOfF(c, 'Neptune', 1), emptyF(c, 1), leadF(c, 0.8), signF(c, 'Venus', 0.5)];
    },
    growth: function (c) {
      var timed = !!c.profection;
      return [timed ? profectionF(c, 3, true) : signF(c, 'Saturn', 2, true), firdariaF(c, 2), timed ? signF(c, 'Saturn', 2) : null, signF(c, 'Jupiter', 2), signF(c, 'Mars', 0.5)];
    }
  };

  function factorTone(ctx, f) {
    if (f.kind === 'aspect') return aspectTone({ a: f.data.body, b: f.data.other, type: f.data.type });
    var body = f.kind === 'sign' || f.kind === 'house-of' ? f.data.body : f.kind === 'cusp' || f.kind === 'angle' ? f.data.ruler : f.kind === 'profection' ? f.data.lord : null;
    var p = body && ctx.pos[body];
    if (p && p.dignity >= 4) return 'flow';
    if (p && p.dignity <= -4) return 'tension';
    return 'neutral';
  }
  function factorScore(ctx, f) {
    var m = 1, p;
    if (f.kind === 'sign' || f.kind === 'house-of') {
      p = ctx.pos[f.data.body];
      if (p.angular) m += 0.25;
      if (Math.abs(p.dignity) >= 4) m += 0.2;
    } else if (f.kind === 'cusp') {
      p = ctx.pos[f.data.ruler];
      if (p && p.angular) m += 0.15;
      if (BODIES.some(function (b) { return ctx.pos[b] && ctx.pos[b].house === f.data.house; })) m += 0.15;
    } else if (f.kind === 'occupants') {
      m += 0.1 * (f.data.bodies.length - 1);
    } else if (f.kind === 'aspect') {
      m += (3 - Math.min(3, f.data.orb)) / 6;
    }
    return f.w * m;
  }

  /* Anchor first (it carries the category's verdict), then the strongest other factors.
   * A factor already used as a bullet in an earlier category drops to 40%, and another category's anchor to 60%,
   * so the categories don't repeat each other. */
  function pickFactors(ctx, id, used, reserved) {
    var cands = BUILDERS[id](ctx).filter(Boolean), seen = {};
    cands = cands.filter(function (f) { if (seen[f.key]) return false; seen[f.key] = 1; return true; });
    cands.forEach(function (f, i) { f.order = i; f.tone = factorTone(ctx, f); f.score = Math.round(factorScore(ctx, f) * (used[f.key] ? 0.4 : reserved[f.key] && !f.data.anchor ? 0.6 : 1) * 100) / 100; });
    var anchor = cands.filter(function (f) { return f.data.anchor; })[0];
    var rest = cands.filter(function (f) { return f !== anchor; }).sort(function (a, b) { return b.score - a.score || a.order - b.order; });
    var top = (anchor ? [anchor] : []).concat(rest).slice(0, 3);
    top.forEach(function (f) { used[f.key] = 1; });
    return top;
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
    var ctx = context(chart, opts), used = {}, reserved = {};
    CATS.forEach(function (c) { BUILDERS[c[0]](ctx).forEach(function (f) { if (f && f.data.anchor) reserved[f.key] = 1; }); });
    var planets = BODIES.filter(function (b) { return ctx.pos[b]; }).map(function (b) {
      var p = ctx.pos[b];
      return { body: b, ko: KO[b], signIdx: p.signIdx, sign: SIGN[p.signIdx], deg: round1(p.deg), degText: degText(p.deg), house: p.house || null, wholeHouse: p.wholeHouse || null, retro: p.retro, dignity: p.dignity, angular: !!p.angular };
    });
    var categories = CATS.map(function (c) { return { id: c[0], title: c[1], factors: pickFactors(ctx, c[0], used, reserved) }; });
    return {
      timeKnown: ctx.timeKnown,
      cover: {
        name: opts.name ? String(opts.name) : '',
        timeKnown: ctx.timeKnown,
        big3: [
          { key: 'Sun', role: '의식하는 나', signIdx: ctx.pos.Sun.signIdx },
          { key: 'Moon', role: '속마음', signIdx: ctx.pos.Moon.signIdx, signs: ctx.moonSigns },
          ctx.timeKnown ? { key: 'ASC', role: '첫인상', signIdx: ctx.pos.ASC.signIdx } : null
        ].filter(Boolean),
        band: BODIES.filter(function (b) { return ctx.pos[b]; }).map(function (b) { return { body: b, lon: round1(ctx.pos[b].lon) }; })
      },
      portrait: null,
      categories: categories,
      planets: planets,
      aspects: ctx.aspects.slice(),
      periods: { age: ctx.age ? ctx.age.age : null, sect: ctx.sect, profection: ctx.profection, firdaria: ctx.firdaria },
      balance: ctx.balance,
      stellium: ctx.stellium,
      notes: { moonSigns: ctx.moonSigns }
    };
  }

  root.AstroNatalReading = {
    build: build,
    _calc: { SIGN: SIGN, KO: KO, RULER: RULER, dignity: dignity, houseOf: houseOf, aspectsOf: aspectsOf, degText: degText, jo: jo }
  };
})(typeof window !== 'undefined' ? window : globalThis);

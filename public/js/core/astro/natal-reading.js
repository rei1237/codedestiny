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

  /* ── copy: hand-written plain Korean (해요체). Sign tables are indexed 양자리 … 물고기자리. ── */
  var ROLE_OUTER = ['씩씩하고 거침없어 보이지만', '느긋하고 온화해 보이지만', '가볍고 재치 있어 보이지만', '다정하고 조심스러워 보이지만', '당당하고 환해 보이지만', '단정하고 꼼꼼해 보이지만',
    '부드럽게 맞춰 주는 듯하지만', '조용하고 속을 알 수 없어 보이지만', '밝고 자유로워 보이지만', '차분하고 어른스러워 보이지만', '쿨하고 독특해 보이지만', '몽글하고 여려 보이지만'];
  var ROLE_INNER = ['참지 못하고 곧장 반응하는', '익숙한 것에서 안정을 찾는', '궁금한 게 많아 쉬지 않는', '아끼는 사람을 품어야 마음이 놓이는', '인정받을 때 마음이 환해지는', '작은 것까지 챙겨야 안심하는',
    '갈등보다 조화를 바라는', '끝까지 파고들고 쉽게 잊지 않는', '답답하면 바로 떠나고 싶어지는', '감정까지 책임지려 애쓰는', '혼자만의 거리가 있어야 편한', '남의 감정까지 함께 느끼는'];
  var ROLE_CORE = ['먼저 부딪혀 길을 여는', '천천히 확실하게 쌓아 가는', '묻고 배우며 넓혀 가는', '곁의 사람을 지키며 크는', '자기 빛으로 주변을 데우는', '더 나은 방법을 찾아 다듬는',
    '관계 속에서 균형을 찾는', '한번 정하면 깊이 몰입하는', '더 넓은 세상을 향해 가는', '목표를 세우고 끝까지 오르는', '자기 방식으로 새 틀을 만드는', '느낌으로 세상을 이해하는'];
  var SUN_LINE = ['무언가를 시작할 때 가장 살아 있다고 느껴요.', '손에 잡히는 결과가 쌓일 때 스스로를 믿게 돼요.', '새로운 것을 알고 나눌 때 가장 당신다워져요.', '지킬 사람이 있을 때 힘이 가장 크게 나와요.',
    '진심을 다한 일이 드러날 때 가장 빛나요.', '엉킨 것을 하나씩 정리할 때 보람을 느껴요.', '서로 기분 좋은 답을 찾았을 때 만족해요.', '한 가지에 깊이 빠져들 때 진짜 힘이 나와요.',
    '의미 있는 목표를 향해 갈 때 생기가 돌아요.', '오래 걸려도 끝내 해낸 일이 자부심이 돼요.', '남과 다른 생각을 밀고 나갈 때 당신다워져요.', '누군가의 마음에 닿았다고 느낄 때 충만해져요.'];
  var MOON_LINE = ['속상한 일은 바로 털어내야 마음이 가벼워져요.', '익숙한 공간과 맛있는 한 끼가 마음을 달래 줘요.', '마음이 복잡하면 말로 꺼내 놓아야 정리돼요.', '믿는 사람 곁에 있을 때 비로소 긴장이 풀려요.',
    '누군가 내 마음을 알아봐 줄 때 힘이 나요.', '할 일이 정리되어 있어야 마음이 편안해져요.', '주변 분위기가 부드러워야 마음도 편해져요.', '감정을 쉽게 드러내지 않지만 한번 품으면 깊어요.',
    '무거운 분위기에 오래 있으면 쉽게 답답해져요.', '힘들어도 티 내지 않고 혼자 감당하려 해요.', '감정이 차오르면 한발 떨어져 바라보며 정리해요.', '주변의 감정에 쉽게 물들어 쉼이 꼭 필요해요.'];
  var ASC_LINE = ['처음 만난 사람도 당신을 시원시원한 사람으로 기억해요.', '사람들은 당신에게서 편안하고 믿음직한 느낌을 받아요.', '말을 붙이기 쉬운 사람이라는 인상을 줘요.', '처음엔 낯을 가려도 따뜻한 사람으로 보여요.',
    '어디서든 눈에 띄고 기억에 남는 인상이에요.', '깔끔하고 믿고 맡길 만한 사람으로 보여요.', '예의 바르고 호감 가는 인상을 먼저 남겨요.', '쉽게 다가가기 어렵지만 묘하게 끌리는 인상이에요.',
    '밝고 솔직해서 금방 친해질 것 같은 느낌을 줘요.', '나이보다 성숙하고 신중한 사람으로 보여요.', '남들과 다른 분위기로 첫눈에 구별되는 편이에요.', '부드럽고 꿈꾸는 듯한 분위기로 기억돼요.'];
  var MANNER = [['망설임 없이 곧장', '앞장서서'], ['천천히 확실하게', '서두르지 않고 꾸준히'], ['가볍고 재치 있게', '여러 갈래로 시도하며'], ['조심스럽고 다정하게', '마음을 살피며'],
    ['당당하고 따뜻하게', '아낌없이 드러내며'], ['세심하고 꼼꼼하게', '작은 것부터 챙기며'], ['부드럽고 세련되게', '균형을 맞춰 가며'], ['깊고 진지하게', '한번 정하면 끝까지'],
    ['솔직하고 시원하게', '넓게 열어 두고'], ['신중하고 책임감 있게', '계획을 세워 차근차근'], ['독특하고 자유롭게', '자기 방식대로'], ['다정하고 너그럽게', '느낌을 따라']];
  var NEED = ['솔직한 표현', '변함없는 꾸준함', '통하는 대화', '따뜻한 돌봄', '진심 어린 인정', '세심한 배려', '서로 간의 존중', '흔들리지 않는 신뢰', '숨 쉴 자유', '믿을 수 있는 책임감', '각자의 공간', '말없이 통하는 공감'];
  var GIFT = ['밀어붙이는 추진력', '지치지 않는 끈기', '빠른 순발력', '사람을 품는 힘', '주변을 밝히는 자신감', '빈틈을 찾는 정확함', '사이를 잇는 조율 감각', '깊이 파고드는 집중력', '멀리 보는 낙관', '버텨 내는 인내', '틀을 깨는 독창성', '보이지 않는 걸 읽는 감수성'];
  var SHADOW = ['성급하게 내리는 결론', '변화를 미루는 고집', '이것저것 벌여 두는 산만함', '서운함을 쌓아 두는 습관', '인정받고 싶은 조급함', '스스로를 몰아세우는 완벽주의', '싫은 말을 삼키는 버릇',
    '다 알기 전엔 믿지 않는 경계심', '약속을 가볍게 넘기는 버릇', '쉬는 것을 미루는 버릇', '마음을 닫고 머리로만 푸는 습관', '경계가 흐려져 지치는 일'];
  var FACE = ['시원시원한 인상', '편안하고 믿음직한 인상', '말 붙이기 쉬운 인상', '따뜻하고 조심스러운 인상', '환하고 눈에 띄는 인상', '단정하고 깔끔한 인상', '호감 가는 세련된 인상', '묘하게 끌리는 인상',
    '밝고 솔직한 인상', '성숙하고 신중한 인상', '독특하고 쿨한 인상', '부드럽고 몽환적인 인상'];
  var TONE = ['솔직하고 뜨거운', '느긋하고 편안한', '가볍고 즐거운', '아늑하고 다정한', '화려하고 당당한', '차분하고 정돈된', '우아하고 균형 잡힌', '깊고 은밀한', '자유롭고 활기찬', '단단하고 진지한', '색다르고 자유로운', '몽글하고 낭만적인'];
  /* Category verdicts [gist, line] keyed by the anchor's sign: love = Venus, money = 2nd cusp (Venus without a time), people = Mercury,
   * work = MC (Sun without a time), heal = Moon, growth = Saturn. Every gist must turn into a "…지만" clause (see contrast). */
  var SIGN_STYLE = {
    love: [
      ['좋으면 먼저 다가가는 직진형 사랑을 해요', '마음이 생기면 숨기기보다 표현하고, 밀고 당기기엔 금방 지쳐요.'],
      ['천천히 깊어지는 오래가는 사랑을 원해요', '함께 먹고 걷는 평범한 시간이 쌓일수록 마음이 단단해져요.'],
      ['말이 잘 통하는 사람에게 먼저 끌려요', '연락이 끊기지 않고 웃음이 오가야 설렘이 오래가요.'],
      ['챙겨 주고 챙김받을 때 사랑을 느껴요', '작은 기념일과 안부를 기억해 주는 사람에게 마음을 놓아요.'],
      ['마음을 아낌없이 표현하는 화끈한 사랑을 해요', '연인이 나를 자랑스러워할 때 가장 행복하고, 무심함에 쉽게 상처받아요.'],
      ['말보다 챙김으로 사랑을 보여 줘요', '상대의 불편을 먼저 알아채고 조용히 해결해 주는 편이에요.'],
      ['서로 존중하는 균형 잡힌 관계를 원해요', '분위기와 매너를 중요하게 여기고, 다툼이 길어지면 마음이 식어요.'],
      ['한번 마음을 주면 깊고 진하게 사랑해요', '가벼운 만남보다 서로의 비밀까지 나누는 관계에 끌려요.'],
      ['함께 웃고 떠날 수 있는 자유로운 사랑을 해요', '구속받는다고 느끼면 숨이 막히고, 같이 새로운 걸 해 볼 때 가까워져요.'],
      ['신중하게 고르고 책임감 있게 사랑해요', '처음엔 느리지만 한번 시작한 관계는 오래 지키려 해요.'],
      ['친구 같은 편안함에서 사랑이 시작돼요', '서로의 개성과 공간을 존중해 주는 사람 곁에 오래 머물러요.'],
      ['상대에게 깊이 스며드는 낭만적인 사랑을 해요', '말하지 않아도 알아주는 순간에 크게 설레고, 상처도 깊게 남아요.']
    ],
    money: [
      ['벌 때도 쓸 때도 빠르게 결정해요', '기회를 보면 바로 움직이는 힘이 있으니, 충동 지출만 한 번 걸러 보세요.'],
      ['꾸준히 모으며 손에 잡히는 안정을 쌓아요', '좋은 물건에는 아낌없이 쓰되, 오래 쓸 수 있는지를 먼저 따져요.'],
      ['정보와 말솜씨가 돈의 길을 열어요', '수입원이 여러 갈래일수록 편하고, 흐름을 자주 점검하면 새는 돈이 줄어요.'],
      ['가족과 미래를 생각하며 차곡차곡 저축해요', '마음이 불안할 때 지출이 늘 수 있어서, 비상금이 있으면 훨씬 든든해요.'],
      ['나다운 품격에 쓰는 돈은 아끼지 않아요', '자신을 드러내는 일에서 수입이 생기기 쉽고, 기분 지출만 다듬으면 돼요.'],
      ['작은 돈까지 꼼꼼히 관리하는 편이에요', '가계부나 예산표처럼 눈에 보이는 정리가 마음을 편하게 해 줘요.'],
      ['사람과 협력할 때 돈의 흐름이 좋아져요', '보기 좋은 것에 마음이 끌리니, 사기 전에 하루만 두고 보는 습관이 도움이 돼요.'],
      ['돈에 대해서는 말없이 깊게 계획해요', '남에게 쉽게 드러내지 않고, 목표가 정해지면 끝까지 모으는 집중력이 있어요.'],
      ['넓게 보고 크게 움직이는 편이에요', '배움과 여행에 쓰는 돈을 아끼지 않으니, 큰 지출 전엔 숫자를 한 번 더 확인해요.'],
      ['시간을 들여 단단한 기반을 만들어요', '당장보다 몇 년 뒤를 보고 결정하는 신중함이 가장 큰 자산이에요.'],
      ['남다른 방식으로 돈을 버는 데 강해요', '새로운 도구와 흐름을 먼저 알아보는 대신, 들쑥날쑥한 수입엔 완충이 필요해요.'],
      ['돈보다 의미와 마음을 먼저 따라가요', '도움을 청하는 사람에게 약한 편이니, 나를 위한 몫은 먼저 떼어 두면 좋아요.']
    ],
    people: [
      ['생각을 돌려 말하지 않고 바로 말해요', '시원한 말투가 믿음을 주니, 급할 땐 상대가 다 말할 때까지 한 박자만 기다려요.'],
      ['말은 느려도 한번 한 말은 지켜요', '가벼운 수다보다 생각이 담긴 대화를 좋아하고, 믿음이 쌓이면 오래가요.'],
      ['어디서든 말을 걸고 분위기를 살려요', '아는 사람이 많고 소식이 빠르지만, 깊은 대화는 몇 사람과만 나눠요.'],
      ['상대의 기분을 먼저 살피고 말을 건네요', '익숙한 사람과는 편하게 이야기하지만, 낯선 자리에서는 듣는 쪽이 돼요.'],
      ['따뜻하고 힘 있는 말로 사람들을 이끌어요', '칭찬을 아끼지 않아 주변이 밝아지고, 진심이 의심받을 때 크게 서운해해요.'],
      ['정확하고 쓸모 있는 말을 건네는 편이에요', '고민을 들으면 해결책부터 떠오르니, 가끔은 들어 주기만 해도 충분해요.'],
      ['누구와도 부드럽게 말을 맞춰요', '갈등을 풀어 주는 역할을 자주 맡는 만큼, 내 의견은 늦게 꺼내는 편이에요.'],
      ['말수는 적어도 핵심을 꿰뚫어 봐요', '사람을 쉽게 믿지 않지만, 한번 마음을 열면 끝까지 곁을 지켜요.'],
      ['솔직하고 유쾌한 말로 금방 친해져요', '다양한 사람과 어울리는 걸 좋아하고, 솔직함이 지나칠 땐 한 번 다듬으면 좋아요.'],
      ['예의와 신뢰를 바탕으로 관계를 쌓아요', '처음엔 거리를 두지만, 시간이 지날수록 믿음직한 사람으로 남아요.'],
      ['누구와도 대등한 친구처럼 지내요', '취향과 생각이 통하는 모임에서 힘이 나고, 감정 섞인 다툼은 피하고 싶어 해요.'],
      ['말보다 분위기로 마음을 나눠요', '상대의 기분을 금방 알아채는 대신, 거절을 어려워해 쉽게 지칠 수 있어요.']
    ],
    work: [
      ['앞장서서 새 일을 여는 자리에서 빛나요', '속도가 중요한 일에서 강하고, 시작한 일을 마무리할 동료가 있으면 더 좋아요.'],
      ['시간이 쌓일수록 실력이 드러나는 일이 맞아요', '눈에 보이는 결과물을 만드는 일에서 끈기가 큰 무기가 돼요.'],
      ['말과 정보를 다루는 일에서 강해요', '여러 일을 동시에 굴려도 지치지 않고, 새로운 걸 빨리 익혀요.'],
      ['사람을 돌보고 지키는 일에서 보람을 느껴요', '팀을 가족처럼 챙기는 편이라, 분위기가 따뜻한 곳에서 실력이 자라요.'],
      ['자기 이름을 걸고 드러나는 일이 잘 맞아요', '무대에 서거나 이끄는 역할을 맡으면 숨은 힘까지 나와요.'],
      ['정확함과 손끝 실력이 필요한 일에서 인정받아요', '흐트러진 것을 정리하고 고치는 일에서 남들이 못 보는 걸 봐요.'],
      ['사람 사이를 잇고 조율하는 일에서 빛을 봐요', '보기 좋은 결과와 공정한 과정을 함께 챙기는 감각이 강점이에요.'],
      ['깊이 파고드는 전문 분야에서 힘을 발휘해요', '남들이 꺼리는 어려운 문제일수록 오히려 집중력이 살아나요.'],
      ['넓은 세상과 배움을 잇는 일에서 신이 나요', '가르치거나 멀리 오가는 일, 큰 그림을 그리는 역할에서 생기가 돌아요.'],
      ['책임을 맡고 차근차근 올라가는 길이 맞아요', '시간이 걸려도 쌓아 올린 신뢰가 자리와 권한으로 이어지기 쉬워요.'],
      ['새로운 방식과 기술을 다루는 일에서 앞서가요', '정해진 틀보다 자율이 있는 환경에서 생각지 못한 아이디어가 나와요.'],
      ['상상력과 공감이 필요한 일에서 재능이 보여요', '예술, 돌봄, 상담처럼 마음을 쓰는 일에서 깊은 보람을 느껴요.']
    ],
    heal: [
      ['몸을 움직여 감정을 털어낼 때 회복돼요', '화가 나면 오래 담아 두지 못하니, 짧게라도 땀 흘리는 시간이 좋아요.'],
      ['익숙한 공간과 감각의 즐거움이 마음을 달래요', '좋은 음식, 포근한 이불, 느린 산책처럼 몸이 편한 것이 먼저예요.'],
      ['생각을 말이나 글로 꺼낼 때 마음이 가벼워져요', '머릿속이 시끄러울 땐 메모 한 줄이나 수다 한 번이 정리를 도와요.'],
      ['안전한 집 같은 공간에서 마음이 풀려요', '익숙한 사람과 나누는 따뜻한 밥 한 끼가 가장 큰 회복이에요.'],
      ['좋아하는 일로 나를 표현할 때 회복돼요', '칭찬 한마디가 생각보다 오래 힘이 되니, 스스로에게도 아낌없이 건네 봐요.'],
      ['몸의 리듬을 규칙적으로 지킬 때 마음도 안정돼요', '걱정이 많아질 땐 잘 자고 잘 먹는 기본부터 챙기는 게 가장 빨라요.'],
      ['아름다운 것과 다정한 대화가 마음을 회복시켜요', '음악, 전시, 정돈된 공간처럼 조화로운 것을 가까이 두면 편해져요.'],
      ['혼자 깊이 들여다볼 시간이 있어야 회복돼요', '감정을 끝까지 느껴 본 뒤에야 놓을 수 있으니, 서두르지 않아도 괜찮아요.'],
      ['새로운 곳과 넓은 풍경이 마음을 살려요', '짧은 여행이나 처음 가 보는 길 산책만으로도 기분이 금세 달라져요.'],
      ['스스로 정한 일을 해낼 때 마음이 단단해져요', '힘들수록 일에 묻히기 쉬우니, 쉬는 시간도 일정에 먼저 넣어 두세요.'],
      ['생각이 통하는 사람들과의 가벼운 교류가 힘이 돼요', '감정을 억지로 풀기보다, 산책하며 머리를 식히면 자연스럽게 정리돼요.'],
      ['음악과 물, 조용한 상상 속에서 마음이 쉬어요', '남의 감정까지 떠안기 쉬우니, 하루 한 번은 혼자 비워 내는 시간이 필요해요.']
    ],
    growth: [
      ['참고 기다리는 법을 배울수록 단단해져요', '급하게 이기려 할 때보다 끝까지 버틸 때 진짜 실력이 붙어요.'],
      ['가진 것을 잃을까 하는 불안을 넘어설 때 성장해요', '안정은 쌓아 둔 것보다 다시 만들 수 있다는 믿음에서 와요.'],
      ['한 가지를 깊이 배울 때 크게 자라요', '많이 아는 것보다 끝까지 익힌 것 하나가 당신의 무게가 돼요.'],
      ['감정의 경계를 세울수록 어른이 돼요', '모두를 품으려 하기보다 나를 먼저 챙길 때 관계도 오래가요.'],
      ['인정받지 않아도 나를 믿을 때 성장해요', '남의 박수보다 스스로 만족한 순간이 오래 남는다는 걸 배워 가요.'],
      ['완벽하지 않아도 내놓는 용기가 성장을 만들어요', '충분히 준비됐다는 느낌은 늦게 오니, 팔십 점에서 먼저 시작해 봐요.'],
      ['관계 안에서 내 몫의 책임을 정할 때 자라요', '모두에게 공정하려다 지치기 쉬우니, 내 기준을 말로 정해 두면 좋아요.'],
      ['통제하려는 마음을 내려놓을 때 깊어져요', '모든 걸 알지 못해도 괜찮다는 믿음이 오히려 힘을 키워 줘요.'],
      ['믿음을 행동으로 증명할 때 성장해요', '큰 이상을 작은 습관으로 옮길 때 말과 삶이 같은 방향을 봐요.'],
      ['책임을 혼자 지지 않을 때 더 멀리 가요', '타고난 성실함 위에 도움을 청하는 법을 더하면 훨씬 가벼워져요.'],
      ['나만의 방식을 꾸준함과 묶을 때 자라요', '새로운 생각도 매일 이어 갈 때 비로소 세상에 닿아요.'],
      ['막연한 불안을 구체적인 계획으로 바꿀 때 성장해요', '마음이 흐려질 땐 오늘 할 수 있는 작은 일 하나를 정하면 길이 보여요.']
    ]
  };
  /* Annual profection by house 1–12 (growth anchor with a birth time). */
  var PROF = [
    ['올해는 나 자신을 새로 세우는 해예요', '외모, 건강 습관, 첫인상처럼 나를 드러내는 방식을 다듬기 좋아요.'],
    ['올해는 돈과 내 힘의 바탕을 다지는 해예요', '버는 법과 쓰는 법을 점검하고, 스스로의 가치를 다시 매겨 보기 좋아요.'],
    ['올해는 배우고 말하는 일이 늘어나는 해예요', '짧은 공부, 글쓰기, 가까운 사람과의 대화가 길을 열어 줘요.'],
    ['올해는 집과 뿌리를 돌보는 해예요', '살 곳, 가족, 마음의 안식처를 정리하면 다음 해의 발판이 돼요.'],
    ['올해는 즐거움과 표현을 키우는 해예요', '연애, 취미, 창작처럼 마음이 설레는 일에 시간을 내 보세요.'],
    ['올해는 일상과 몸의 리듬을 다듬는 해예요', '작은 습관과 일하는 방식을 고치면 생각보다 큰 차이가 생겨요.'],
    ['올해는 일대일 관계가 앞에 서는 해예요', '연인, 동업자, 가까운 상대와의 약속과 균형을 다시 살펴보기 좋아요.'],
    ['올해는 깊이 나누고 정리하는 해예요', '함께 쓰는 돈과 오래된 감정을 정리할수록 마음이 가벼워져요.'],
    ['올해는 시야를 넓히는 해예요', '먼 곳으로의 이동, 공부, 새로운 생각과의 만남이 방향을 넓혀 줘요.'],
    ['올해는 일과 사회적 자리가 앞에 서는 해예요', '맡는 역할이 커지기 쉬우니, 어디까지 책임질지 먼저 정해 두세요.'],
    ['올해는 사람과 바라는 미래를 넓히는 해예요', '새로운 모임과 친구가 생각지 못한 기회를 데려오기 쉬워요.'],
    ['올해는 안으로 정리하고 쉬어 가는 해예요', '드러내기보다 마무리하고 비워 낼 때 다음 시작이 가벼워져요.']
  ];
  var LORD_TIP = { Sun: '자신 있게 앞에 설수록 길이 열려요', Moon: '생활과 마음의 리듬을 돌볼수록 편해져요', Mercury: '배우고 연결하는 일이 길을 열어요', Venus: '사람과 아름다운 것을 가까이할수록 부드러워져요',
    Mars: '미뤄 둔 일에 용기를 낼수록 움직여요', Jupiter: '배움과 넓은 시야가 기회를 데려와요', Saturn: '서두르지 않고 기초를 다질수록 단단해져요' };
  var FIRD_LINE = { Sun: '나를 드러내고 이름을 세우는 일이 중심에 와요.', Moon: '생활의 기반과 마음의 안정을 돌보는 일이 중심에 와요.', Mercury: '배움과 일의 기술을 넓히는 일이 중심에 와요.',
    Venus: '관계와 즐거움, 아름다운 것을 가꾸는 일이 중심에 와요.', Mars: '용기를 내고 부딪혀 길을 여는 일이 중심에 와요.', Jupiter: '시야를 넓히고 기회를 키우는 일이 중심에 와요.',
    Saturn: '책임을 지고 오래갈 기초를 쌓는 일이 중심에 와요.', NorthNode: '새로운 방향으로 한 걸음 내딛는 일이 중심에 와요.', SouthNode: '지난 것을 정리하고 내려놓는 일이 중심에 와요.' };
  var HOUSE_ARENA = ['나 자신', '돈과 소유', '말과 배움', '집과 가족', '즐거움과 연애', '일상과 몸의 리듬', '짝과 일대일 관계', '나눔과 깊은 신뢰', '먼 곳과 공부', '일과 사회적 자리', '친구와 모임', '혼자만의 시간'];
  var ARENA_AT = ['나를 드러내는 자리에서', '돈을 다루는 자리에서', '말하고 배우는 자리에서', '집과 가족 곁에서', '즐기고 사랑하는 자리에서', '매일의 일과 속에서', '일대일 관계에서', '깊이 나누는 관계에서',
    '먼 곳과 배움의 자리에서', '사회에서 일하는 자리에서', '친구와 모임 속에서', '혼자 있는 시간에'];
  var PLANET_FORCE = { Sun: '자기 이름을 거는 태도', Moon: '그때그때의 마음', Mercury: '정보와 말솜씨', Venus: '취향과 사람 복', Mars: '빠른 결단력', Jupiter: '넉넉하게 넓히는 힘', Saturn: '오래 쌓는 성실함',
    Uranus: '예상 밖의 변화', Neptune: '감과 이상', Pluto: '깊이 바꾸는 힘' };
  /* What a planet does inside a category; {sign} {manner} {need} {gift} {shadow} {tone} come from the planet's sign, {x:이} adds the particle. */
  var PLANET_ROLE = {
    love: { Moon: '연인에게서 {need:이} 느껴질 때 마음이 놓여요.', Mars: '끌리는 사람에게는 {manner} 다가가요.', Sun: '사랑할 때도 {gift:이} 그대로 드러나요.' },
    money: { Jupiter: '돈의 기회는 {tone} 흐름을 탈 때 넓어지기 쉬워요.', Venus: '마음에 드는 것에는 {manner} 지갑을 여는 편이에요.', Saturn: '아껴야 할 때는 {manner} 기준을 세워요.', Mercury: '계산과 비교는 {manner} 하는 편이에요.' },
    people: { Moon: '가까운 사이에서는 {need:을} 주고받을 때 정이 깊어져요.', Venus: '호감을 표현할 때는 {manner} 다가가는 편이에요.', Jupiter: '사람 복은 {tone} 자리에서 넓어지기 쉬워요.' },
    work: { Saturn: '책임이 무거운 일은 {manner} 풀어 가요.', Mars: '일을 밀어붙일 때는 {manner} 움직여요.', Mercury: '일에서 말과 글은 {manner} 다루는 편이에요.' },
    heal: { Venus: '{tone} 분위기 속에 있을 때 마음이 빨리 풀려요.' },
    growth: { Jupiter: '{tone} 경험을 할 때 시야가 넓어지고 기회도 눈에 들어와요.', Mars: '도전할 때는 {manner} 움직이는 게 당신에게 맞아요.' }
  };
  var ROLE_FALLBACK = '{body:이} {sign}에 있어 {manner} 힘을 써요.';
  var DIGNITY_LINE = {
    high: ['{body:이} 제 집처럼 편한 별자리라, 이 힘을 자연스럽게 잘 써요.', '{body}에게 잘 맞는 별자리라 이 힘이 막힘없이 흘러요.', '{body:이} 힘을 쓰기 좋은 자리라 기대만큼 해내요.'],
    low: ['{body}에게는 낯선 별자리라, 이 힘은 애써 다듬을수록 깊어져요.', '{body:이} 불편해하는 별자리라 처음엔 서툴러도 연습할수록 단단해져요.']
  };
  var HOUSE_EXTRA = ['특히 {at} 이런 모습이 잘 드러나요.', '{at} 이 힘이 자주 쓰여요.'];
  var HOUSE_FRAME = {
    'love:5': '설렘의 자리인 5번째 집이 {sign}에서 시작해, {tone} 데이트에 마음이 열려요.',
    'love:7': '짝의 자리인 7번째 집이 {sign}에서 시작해, {need:을} 주는 상대와 잘 맞아요.',
    'money:8': '함께 나누는 돈의 자리인 8번째 집이 {sign}에서 시작해, 공동의 돈은 {manner} 다루는 게 좋아요.',
    'people:11': '친구와 모임의 자리인 11번째 집이 {sign}에서 시작해, {tone} 모임에서 인연이 넓어져요.',
    'people:7': '일대일 관계의 자리인 7번째 집이 {sign}에서 시작해, 가까운 사이엔 {need:이} 중요해요.',
    'people:3': '말과 이웃의 자리인 3번째 집이 {sign}에서 시작해, 가까운 사람과는 {manner} 이야기해요.',
    'work:6': '매일의 일을 맡는 6번째 집이 {sign}에서 시작해, 일과는 {manner} 꾸리는 게 맞아요.',
    'heal:4': '집과 뿌리의 자리인 4번째 집이 {sign}에서 시작해, {tone} 공간에서 마음이 쉬어요.',
    'heal:12': '혼자만의 쉼을 뜻하는 12번째 집이 {sign}에서 시작해, 쉴 때는 {manner} 비워 내는 게 좋아요.',
    'heal:6': '몸의 리듬을 맡는 6번째 집이 {sign}에서 시작해, 생활 리듬은 {manner} 지키면 편해요.'
  };
  var RULER_LINE = {
    money: '돈의 자리 주인인 {ruler:이} {n}번째 집에 있어, {at} 돈의 흐름이 생기기 쉬워요.',
    work: '사회에서 보이는 모습의 주인인 {ruler:이} {n}번째 집에 있어, {at} 일의 실마리가 보여요.'
  };
  var OCC_FRAME = {
    'money:2': '돈의 자리에 {bodies:이} 있어, {force:이} 벌고 쓰는 방식에 묻어나요.',
    'money:8': '나눔의 자리에 {bodies:이} 있어, 함께 쓰는 돈에서 {force:이} 드러나요.',
    'work:10': '사회의 자리에 {bodies:이} 있어, 일에서 {force:이} 이름처럼 따라다녀요.'
  };
  var ASC_PEOPLE = '첫인상 별자리가 {sign:이라}, 새로운 사람과도 {manner} 관계를 시작해요.';
  var HOUSE_OF = {
    'work:Sun': ['태양이 {n}번째 집에 있어, {at} 가장 당신답게 빛나요.'],
    'heal:Neptune': ['해왕성이 {n}번째 집에 있어 {at} 마음이 쉽게 젖어 들어요.', '이 자리엔 부드러운 경계가 필요해요.']
  };
  /* Pairs of bodies (in BODIES order): [easy, hard] clause after "A와 B가 …사이라". */
  var PAIR = {
    'Sun-Moon': ['뜻과 마음이 같은 쪽을 향해 결정이 빨라요.', '하고 싶은 것과 필요한 것 사이에서 자주 고민해요.'],
    'Sun-Mercury': ['생각과 정체성이 붙어 있어 말에 확신이 실려요.'],
    'Sun-Venus': ['다정함과 매력이 자연스럽게 드러나요.'],
    'Sun-Mars': ['마음먹은 일을 바로 실행으로 옮기는 힘이 있어요.', '의욕이 넘쳐 부딪히기 쉬운 만큼 추진력도 커요.'],
    'Sun-Jupiter': ['자신감과 너그러움이 함께해 주변에 힘을 줘요.', '크게 바라는 만큼 무리하기 쉬워 속도 조절이 필요해요.'],
    'Sun-Saturn': ['꾸준함이 몸에 배어 있어 늦더라도 끝을 봐요.', '스스로에게 엄격해 인정받기 전까지 쉬지 못해요.'],
    'Sun-Uranus': ['남다른 길을 고르는 데 두려움이 적어요.', '틀에 묶이면 갑자기 방향을 바꾸고 싶어져요.'],
    'Sun-Neptune': ['상상력과 공감이 당신다움의 한가운데 있어요.', '이상과 현실 사이에서 방향이 흐려질 때가 있어요.'],
    'Sun-Pluto': ['위기에서 오히려 깊은 힘을 꺼내는 사람이에요.', '모든 걸 걸거나 아예 놓아 버리는 극단을 오가기 쉬워요.'],
    'Moon-Mercury': ['느낀 것을 말로 옮기는 게 자연스러워요.', '기분이 말투에 바로 묻어나 오해를 사기도 해요.'],
    'Moon-Venus': ['다정함이 몸에 배어 사람을 편하게 해 줘요.', '사랑받고 싶은 마음과 내 기분 사이에서 흔들리기 쉬워요.'],
    'Moon-Mars': ['감정을 행동으로 바로 옮기는 솔직함이 있어요.', '서운함이 화로 바뀌는 속도가 빠른 편이에요.'],
    'Moon-Jupiter': ['기분이 쉽게 회복되고 마음이 넉넉해요.', '기분 따라 약속이나 지출이 커지기 쉬워요.'],
    'Moon-Saturn': ['감정을 차분히 다루는 어른스러움이 있어요.', '외로움을 혼자 견디려 해 마음을 여는 데 시간이 걸려요.'],
    'Moon-Uranus': ['기분 전환이 빠르고 새로운 것에서 위로를 얻어요.', '감정이 예고 없이 바뀌어 스스로도 놀랄 때가 있어요.'],
    'Moon-Neptune': ['남의 마음을 말없이 알아채는 감수성이 커요.', '감정의 경계가 흐려 남의 기분까지 떠안기 쉬워요.'],
    'Moon-Pluto': ['감정의 깊이가 커서 사람을 진심으로 이해해요.', '한번 상처받으면 오래 붙잡고 있게 돼요.'],
    'Mercury-Venus': ['말에 다정함이 묻어나 대화가 부드러워요.', '좋은 말만 하려다 속마음을 늦게 꺼내요.'],
    'Mercury-Mars': ['생각을 빠르게 정리해 바로 말로 옮겨요.', '말이 빨라지고 날카로워질 때가 있어 한 박자가 필요해요.'],
    'Mercury-Jupiter': ['큰 그림을 쉽게 설명하는 말솜씨가 있어요.', '아는 게 많아 말이 길어지거나 약속이 커지기 쉬워요.'],
    'Mercury-Saturn': ['생각이 깊고 정확해서 말에 무게가 있어요.', '말하기 전에 너무 오래 고민해 기회를 놓치기도 해요.'],
    'Mercury-Uranus': ['번뜩이는 생각이 자주 떠오르는 머리를 가졌어요.', '생각이 앞서 나가 주변이 따라오기 버거워할 수 있어요.'],
    'Mercury-Neptune': ['말과 글에 상상력과 분위기가 담겨요.', '생각이 흐려지거나 말이 모호해질 때가 있어 확인이 필요해요.'],
    'Mercury-Pluto': ['핵심을 꿰뚫는 질문을 잘 던져요.', '한번 의심이 생기면 끝까지 파고들어야 마음이 놓여요.'],
    'Venus-Mars': ['끌림과 다가감이 잘 맞아 연애의 흐름이 자연스러워요.', '원하는 사랑과 끌리는 사람이 달라 마음이 엇갈리기 쉬워요.'],
    'Venus-Jupiter': ['너그럽고 다정해 사람이 잘 따라요.', '좋은 것을 넉넉히 누리려다 씀씀이가 커지기 쉬워요.'],
    'Venus-Saturn': ['사랑을 천천히 단단하게 키우는 사람이에요.', '깊고 오래가는 사랑을 원해 마음을 여는 데 시간이 걸려요.'],
    'Venus-Uranus': ['자유롭고 색다른 관계에서 설렘을 느껴요.', '가까워질수록 거리를 두고 싶어지는 마음이 들어요.'],
    'Venus-Neptune': ['낭만과 헌신이 깊어 사랑을 예술처럼 대해요.', '상대를 이상화하다 실망하기 쉬워 눈을 맞춰 보는 게 좋아요.'],
    'Venus-Pluto': ['한번 사랑하면 깊고 강렬하게 빠져들어요.', '사랑이 깊은 만큼 집착이나 질투로 번지기 쉬워요.'],
    'Mars-Jupiter': ['도전할 때 배짱과 낙관이 함께 붙어요.', '의욕이 커서 한 번에 너무 많이 벌이기 쉬워요.'],
    'Mars-Saturn': ['끈기 있게 밀고 가는 지구력이 있어요.', '가속과 제동이 동시에 걸려 답답함을 자주 느껴요.'],
    'Mars-Uranus': ['위기에서 빠르고 기발하게 움직여요.', '참았던 게 갑자기 터지듯 행동할 때가 있어요.'],
    'Mars-Neptune': ['믿는 가치를 위해 움직일 때 힘이 나요.', '의욕이 흐려지거나 방향을 잃을 때가 있어요.'],
    'Mars-Pluto': ['한번 마음먹으면 끝까지 해내는 집념이 있어요.', '지기 싫은 마음이 커서 힘겨루기가 되기 쉬워요.']
  };
  var ASPECT_CAT = {
    love: ['이 흐름 덕분에 사랑을 표현하는 일이 어렵지 않아요.', '이 긴장은 사랑을 깊게 만드는 숙제처럼 작용해요.'],
    people: ['대화할 때 이 흐름이 사람 사이를 부드럽게 이어 줘요.', '말이 엇갈릴 때는 이 긴장을 떠올리고 한 번 더 확인해 보세요.'],
    heal: ['마음이 지칠 때 이 흐름이 회복을 빠르게 도와요.', '감정이 출렁일 때 이 긴장이 원인일 수 있으니 천천히 다뤄 주세요.']
  };
  var ASPECT_TIP = { conjunction: '두 힘이 한 몸처럼 움직여서, 좋을 때도 힘들 때도 크게 드러나요.', sextile: '작은 계기만 있으면 두 힘이 서로를 살려 줘요.', square: '부딪힘은 약점이 아니라 힘을 키우는 마찰이에요.',
    trine: '애쓰지 않아도 흐르는 재능이라, 의식해서 쓰면 더 빛나요.', opposition: '둘 사이를 오가며 균형을 잡을수록 시야가 넓어져요.' };
  var EL_LINE = { fire: '생각보다 행동이 먼저 나가고 열정이 쉽게 불붙어요.', earth: '눈에 보이는 결과와 현실 감각을 믿어요.', air: '생각하고 연결하고 말하는 데서 힘이 나요.', water: '감정과 분위기를 누구보다 먼저 읽어요.' };
  var MODE_LINE = { cardinal: '기질은 시작형이 많아, 새 일을 여는 데 강하고 기다림엔 약한 편이에요.', fixed: '기질은 유지형이 많아, 한번 정한 것을 끝까지 지키는 힘이 있어요.', mutable: '기질은 적응형이 많아, 상황에 맞춰 방향을 바꾸는 데 능해요.' };
  var EMPTY_LINE = { fire: '가끔은 몸을 움직이고 일부러 신나는 일을 만들어야 기운이 차요.', earth: '규칙적인 식사와 잠처럼 몸의 기본을 챙길 때 마음이 붙어요.', air: '생각을 꺼내 말하고 바깥 공기를 쐬어야 머리가 맑아져요.', water: '감정을 느끼고 울어도 되는 시간을 일부러 만들어 주세요.' };
  var LEAD_LINE = { fire: '지칠 때도 뭔가를 해야 풀리는 편이라 짧고 굵은 활동이 잘 맞아요.', earth: '몸을 편하게 하는 단순한 일상이 가장 빠른 회복이에요.', air: '생각을 나눌 사람과의 대화가 가장 빠른 회복이에요.', water: '감정을 충분히 흘려보낼 조용한 시간이 가장 빠른 회복이에요.' };
  var TWIST = {
    love: ['한번 통하면 관계가 쉽게 깊어져요', '마음을 다 열기까지는 시간이 필요해요'],
    money: ['필요할 때 도움과 기회가 잘 붙는 편이에요', '들어오고 나가는 흐름엔 기준이 필요해요'],
    people: ['곁에 좋은 사람이 오래 남는 편이에요', '가까운 사이일수록 말에 신경이 쓰여요'],
    work: ['맞는 자리에서는 실력이 금방 드러나요', '인정받기까지는 꾸준함이 필요해요'],
    heal: ['기분을 되찾는 힘도 커요', '감정을 혼자 오래 붙잡기 쉬워요'],
    growth: ['배운 것이 빠르게 몸에 붙어요', '속도보다 방향을 지키는 게 중요해요']
  };
  var FIT = { love: '{need:을} 자연스럽게 건네는 사람과 잘 맞아요.', money: '{gift:을} 살릴 수 있는 돈 관리 방식이 잘 맞아요.', people: '{need:을} 아는 사람들 곁에서 관계가 오래가요.',
    work: '{gift:이} 결과로 보이는 자리가 잘 맞아요.', heal: '{need:이} 채워지는 시간이 회복을 도와요.', growth: '{gift:을} 꾸준히 쓰는 연습이 성장을 도와요.' };
  var CAUTION = { love: '연애에서는 {shadow:이} 앞서지 않게 살펴 주세요.', money: '돈 문제에서는 {shadow:을} 한 번 의심해 보세요.', people: '관계가 꼬일 땐 {shadow:이} 끼어들지 않았는지 살펴보세요.',
    work: '일이 막히면 {shadow:을} 먼저 점검해 보세요.', heal: '{shadow:이} 쌓이면 마음이 먼저 지쳐요.', growth: '{shadow:은} 성장을 늦추는 흔한 함정이에요.' };
  /* Scene and this week's step by category × element (fire, earth, air, water). */
  var SCENE = {
    love: ['예를 들면, 좋아하는 마음이 생기면 그날 바로 연락할 핑계를 찾아요.', '예를 들면, 화려한 이벤트보다 늘 가던 식당에서 보내는 저녁이 더 설레요.', '예를 들면, 밤새 이어진 대화 끝에 마음이 기울었다는 걸 알아채요.', '예를 들면, 상대의 짧은 답장 하나에도 하루의 기분이 오르내려요.'],
    money: ['예를 들면, 마음에 드는 물건을 보면 고민보다 결제가 먼저일 때가 있어요.', '예를 들면, 정해 둔 금액이 통장에 쌓이는 걸 볼 때 가장 마음이 놓여요.', '예를 들면, 같은 물건도 여러 곳을 비교한 뒤에야 사는 편이에요.', '예를 들면, 기분이 가라앉은 날 작은 선물로 스스로를 달래곤 해요.'],
    people: ['예를 들면, 어색한 자리에서 먼저 말을 꺼내 분위기를 바꾸는 쪽이에요.', '예를 들면, 오래된 친구 몇 명과의 정기 모임이 가장 편해요.', '예를 들면, 처음 만난 사람과도 공통 관심사를 금방 찾아내요.', '예를 들면, 친구의 표정만 보고도 무슨 일이 있었는지 먼저 알아채요.'],
    work: ['예를 들면, 아무도 손대지 않은 일을 먼저 맡아 판을 벌이곤 해요.', '예를 들면, 마감 전날보다 일주일 전에 이미 준비를 끝내 두는 편이에요.', '예를 들면, 회의에서 흩어진 의견을 한 문장으로 정리하는 역할을 맡아요.', '예를 들면, 동료가 지쳐 보이면 일보다 그 사람을 먼저 챙겨요.'],
    heal: ['예를 들면, 답답한 날 한바탕 걷거나 뛰고 나면 고민이 작아져 있어요.', '예를 들면, 따뜻한 차 한 잔과 정리된 방이 어떤 위로보다 빨라요.', '예를 들면, 친구에게 털어놓다 보면 말하는 중에 답이 보여요.', '예를 들면, 좋아하는 노래를 들으며 실컷 울고 나면 다시 힘이 나요.'],
    growth: ['예를 들면, 해 보지 않은 일에 손을 들 때 한 뼘씩 자라요.', '예를 들면, 매일 조금씩 쌓은 기록이 어느 날 실력이 되어 있어요.', '예를 들면, 생각이 다른 사람과의 대화가 굳은 생각을 풀어 줘요.', '예를 들면, 지난 감정을 정리하고 나면 비로소 다음 걸음이 가벼워져요.']
  };
  var ACTION = {
    love: ['마음에 드는 사람에게 먼저 짧은 안부를 보내 보세요.', '좋아하는 사람과 함께할 소박한 식사 약속을 하나 잡아 보세요.', '요즘 가장 궁금한 질문 하나를 상대에게 직접 물어보세요.', '고마웠던 순간 하나를 구체적으로 말로 전해 보세요.'],
    money: ['사고 싶은 것이 생기면 하루만 장바구니에 두고 다시 보세요.', '이번 달 고정 지출을 한 장에 적어 보세요.', '구독 중인 서비스를 모두 적고 하나를 정리해 보세요.', '기분이 지출로 이어진 날을 돌아보고 메모해 두세요.'],
    people: ['오래 연락 못 한 사람 한 명에게 먼저 연락해 보세요.', '가까운 사람과 정기적으로 만날 날을 하나 정해 보세요.', '새로운 모임이나 대화 자리에 한 번 나가 보세요.', '누군가의 이야기를 끝까지 들어 주는 시간을 가져 보세요.'],
    work: ['미뤄 둔 일 하나를 오늘 15분만 시작해 보세요.', '이번 주 할 일을 세 가지로 줄여 적어 보세요.', '일하며 떠오른 아이디어를 한 사람에게 설명해 보세요.', '함께 일하는 사람에게 고마운 점을 한 가지 전해 보세요.'],
    heal: ['하루 20분, 땀이 살짝 날 만큼 몸을 움직여 보세요.', '잠드는 시간을 사흘만 같은 시각에 맞춰 보세요.', '머릿속 걱정을 종이에 모두 적고 덮어 두세요.', '아무것도 하지 않는 30분을 일정에 넣어 보세요.'],
    growth: ['해 보고 싶던 일을 작게 쪼개 첫 단계를 해 보세요.', '매일 같은 시간에 10분씩 이어 갈 습관을 하나 정하세요.', '배우고 싶은 주제의 글이나 강의를 하나 골라 보세요.', '지난 한 달 동안 마음에 남은 일을 한 줄씩 적어 보세요.']
  };
  var TIME_NOTE = '태어난 시간을 몰라 첫인상·삶의 무대 해석은 뺐어요.';

  /* ── synthesis ── */
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
  /* "…해요" → "…하지만": the ending a gist may use is checked by the tests. Returns null when the ending isn't handled. */
  function contrast(s) {
    if (/이에요$/.test(s)) return s.replace(/이에요$/, '이지만');
    if (/예요$/.test(s)) return s.replace(/예요$/, '이지만');
    if (/해요$/.test(s)) return s.replace(/해요$/, '하지만');
    if (!/요$/.test(s) || s.length < 3) return null;
    var c = s.charCodeAt(s.length - 2) - 0xAC00, head = s.slice(0, -2);
    if (c < 0 || c > 11171 || c % 28) return null;
    var L = Math.floor(c / 588), V = Math.floor(c % 588 / 28), MAP = { 0: 0, 1: 1, 4: 4, 5: 5, 6: 20, 9: 8, 10: 11 };
    if (L === 11 && (V === 0 || V === 4)) return head + '지만';
    if (V === 14 && L !== 11) V = 13;
    else if (MAP[V] == null) return null;
    else V = MAP[V];
    return head + String.fromCharCode(0xAC00 + L * 588 + V * 28) + '지만';
  }
  function names(list) {
    var ko = list.map(function (b) { return KO[b]; });
    return ko.length === 2 ? jo(ko[0], '과/와') + ' ' + ko[1] : ko.join(', ');
  }
  /* One sentence is never said twice on a page: take() returns the first candidate not said yet. */
  function writer() {
    var said = {}, mannerUse = {}, turn = {}, done = {};
    return {
      once: function (key) { if (done[key]) return false; done[key] = 1; return true; },
      /* Rotate through phrasings so the same sentence frame isn't heard twice in a row. */
      rotate: function (key, list) { var n = turn[key] = (turn[key] || 0) + 1; return list.slice(n - 1).concat(list.slice(0, n - 1)); },
      take: function (list) {
        for (var i = 0; i < list.length; i++) if (list[i] && !said[list[i]]) { said[list[i]] = 1; return list[i]; }
        return null;
      },
      vars: function (s, extra) {
        var n = mannerUse[s] = (mannerUse[s] || 0) + 1, v = { sign: SIGN[s], manner: MANNER[s][(n - 1) % 2], need: NEED[s], gift: GIFT[s], shadow: SHADOW[s], tone: TONE[s], face: FACE[s] };
        for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) v[k] = extra[k];
        return v;
      }
    };
  }
  function anchorSign(f) { return f.kind === 'moon-pair' ? f.data.signs[0] : f.data.signIdx; }
  function pairKey(a, b) { return BODIES.indexOf(a) < BODIES.indexOf(b) ? a + '-' + b : b + '-' + a; }
  function aspectLines(ctx, cat, d, tone, W) {
    var key = pairKey(d.body, d.other), ab = key.split('-'), row = PAIR[key], hard = tone === 'tension' ? 1 : 0;
    var head = { a: KO[ab[0]], b: KO[ab[1]], asp: ASPECT_KO[d.type] };
    var one = row && W.take([fill('{a:과} {b:이} {asp:이라} ', head) + (row[hard] || row[0])]);
    if (one) return [one];
    return [W.take([fill('{a:과} {b:이} {asp:이에요}.', head)]), W.take([ASPECT_CAT[cat] ? ASPECT_CAT[cat][hard] : null])].filter(Boolean);
  }
  function extraLine(ctx, body, W) {
    var p = ctx.pos[body];
    var dig = p.dignity >= 4 ? 'high' : p.dignity <= -4 ? 'low' : null;
    if (dig && W.once('dignity:' + body)) return W.take(W.rotate(dig, DIGNITY_LINE[dig]).map(function (t) { return fill(t, { body: KO[body] }); }));
    if (p.house) return W.take(HOUSE_EXTRA.map(function (t) { return fill(t, { at: ARENA_AT[p.house - 1] }); }));
    return null;
  }
  function anchorLines(ctx, cat, f, W) {
    var d = f.data, out = [];
    if (f.kind === 'profection') {
      out.push(W.take([PROF[d.house - 1][1]]));
      out.push(W.take([fill('올해의 길잡이 행성은 {lord:이라}, ', { lord: KO[d.lord] }) + LORD_TIP[d.lord] + '.']));
    } else if (f.kind === 'moon-pair') {
      out.push(W.take([fill('태어난 날 달이 {a}에서 {b:으로} 옮겨 갔어요.', { a: SIGN[d.signs[0]], b: SIGN[d.signs[1]] })]));
      out.push(W.take(['둘 중 더 마음에 와닿는 쪽이 당신의 달일 가능성이 커요.']));
    } else {
      out.push(W.take([SIGN_STYLE[cat][d.signIdx][1]]));
      if (f.kind === 'cusp' && RULER_LINE[cat]) out.push(W.take([fill(RULER_LINE[cat], { ruler: KO[d.ruler], n: d.rulerHouse, at: ARENA_AT[d.rulerHouse - 1] })]));
      else if (f.kind === 'angle' && d.ruler && RULER_LINE[cat]) out.push(W.take([fill(RULER_LINE[cat], { ruler: KO[d.ruler], n: d.rulerHouse, at: ARENA_AT[d.rulerHouse - 1] })]));
      else if (f.kind === 'sign') out.push(extraLine(ctx, d.body, W));
    }
    return out.filter(Boolean);
  }
  function factorLines(ctx, cat, f, W) {
    var d = f.data;
    if (d.anchor) return anchorLines(ctx, cat, f, W);
    switch (f.kind) {
      case 'sign':
        if (cat === 'growth' && d.body === 'Saturn') return [W.take([SIGN_STYLE.growth[d.signIdx][0] + '.']), extraLine(ctx, d.body, W)].filter(Boolean);
        return [W.take([fill((PLANET_ROLE[cat] || {})[d.body] || ROLE_FALLBACK, W.vars(d.signIdx, { body: KO[d.body] }))]), extraLine(ctx, d.body, W)].filter(Boolean);
      case 'cusp':
        return [W.take([fill(HOUSE_FRAME[cat + ':' + d.house] || '{n}번째 집이 {sign}에서 시작해, 이 영역에서는 {manner} 움직여요.', W.vars(d.signIdx, { n: d.house }))])].filter(Boolean);
      case 'angle':
        return [W.take([fill(ASC_PEOPLE, W.vars(d.signIdx))])].filter(Boolean);
      case 'occupants':
        return [W.take([fill(OCC_FRAME[cat + ':' + d.house], { bodies: names(d.bodies), force: PLANET_FORCE[d.lead] })])].filter(Boolean);
      case 'aspect':
        return aspectLines(ctx, cat, d, f.tone, W);
      case 'house-of':
        return (HOUSE_OF[cat + ':' + d.body] || []).map(function (t) { return W.take([fill(t, { n: d.house, at: ARENA_AT[d.house - 1] })]); }).filter(Boolean);
      case 'empty':
        return [W.take(['개인 행성에 ' + EL_KO[d.element] + ' 기운이 없어서, ' + EMPTY_LINE[d.element]])].filter(Boolean);
      case 'lead':
        return [W.take([EL_KO[d.element] + ' 기운이 많은 사람답게, ' + LEAD_LINE[d.element]])].filter(Boolean);
      case 'firdaria':
        return [W.take([fill('인생 시기 지도로 보면 {from}~{to}년은 {lord}의 시기예요.', { from: d.fromYear, to: d.toYear, lord: KO[d.lord] })]), W.take([FIRD_LINE[d.lord]])].filter(Boolean);
    }
    return [];
  }
  function gistOf(cat, f) {
    if (f.kind === 'profection') return PROF[f.data.house - 1][0];
    if (f.kind === 'moon-pair') return fill('{a:이나} {b}에서 마음이 회복돼요', { a: NEED[f.data.signs[0]], b: NEED[f.data.signs[1]] });
    return SIGN_STYLE[cat][f.data.signIdx][0];
  }
  function conclusionOf(cat, factors, W) {
    var gist = gistOf(cat, factors[0]), a = factors[0].tone, b = factors[1] && factors[1].tone, out = gist;
    if (b && a !== b && a !== 'neutral' && b !== 'neutral') {
      var c = contrast(gist), joined = c && c + ', ' + TWIST[cat][b === 'tension' ? 1 : 0];
      if (joined && joined.length <= 64) out = joined;
    }
    return W.take([out]) || out;
  }
  function evidenceLabels(factors) {
    var seen = {}, out = [];
    factors.forEach(function (f) {
      f.ev.forEach(function (e) {
        var label = e.label + (e.aspect && e.aspect.orb <= 3 ? ' · 정확도 높음' : '');
        if (!seen[label]) { seen[label] = 1; out.push(label); }
      });
    });
    return out;
  }
  function writeCategory(ctx, cat, title, factors, W) {
    var pair = factors[0].kind === 'moon-pair' ? factors[0].data.signs : null;
    var s = pair ? ELEMENTS.indexOf(ctx.balance.leading) : anchorSign(factors[0]), second = factors[1] && factors[1].data && factors[1].data.signIdx;
    var bullets = factors.map(function (f) { return factorLines(ctx, cat, f, W).join(' '); }).filter(Boolean);
    var v = W.vars(s);
    return {
      id: cat,
      title: title,
      conclusion: conclusionOf(cat, factors, W),
      bullets: bullets,
      scene: W.take([SCENE[cat][s % 4]]),
      /* With two possible Moon signs, name both shadows and skip the single-sign fit line. */
      fit: pair ? null : W.take([fill(FIT[cat], v)]),
      caution: pair ? W.take([fill('{a:이나} {b:이} 쌓이면 마음이 먼저 지쳐요.', { a: SHADOW[pair[0]], b: SHADOW[pair[1]] })]) : W.take([fill(CAUTION[cat], v)]),
      action: W.take([ACTION[cat][(second != null ? second : s) % 4]]),
      evidence: evidenceLabels(factors),
      factors: factors
    };
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
  function portraitOf(ctx, W) {
    var sun = ctx.pos.Sun.signIdx, moon = ctx.pos.Moon.signIdx, paras = [];
    var face = [W.take(['태양이 ' + SIGN[sun] + '에 있어 ' + SUN_LINE[sun]])], faceEv = [bodyLabel(ctx, 'Sun'), bodyLabel(ctx, 'Moon')];
    if (ctx.moonSigns) face.push(W.take([fill('태어난 날의 달은 {a} 또는 {b:이에요}.', { a: SIGN[ctx.moonSigns[0]], b: SIGN[ctx.moonSigns[1]] })]));
    else face.push(W.take(['달이 ' + SIGN[moon] + '에 있어 ' + MOON_LINE[moon]]));
    if (ctx.timeKnown) { face.push(W.take([fill('첫인상 별자리가 {s:이라} ', { s: SIGN[ctx.pos.ASC.signIdx] }) + ASC_LINE[ctx.pos.ASC.signIdx]])); faceEv.push(bodyLabel(ctx, 'ASC')); }
    paras.push({ key: 'face', title: '겉과 속', text: face.filter(Boolean), evidence: faceEv });

    var b = ctx.balance, lead = b.elements.filter(function (r) { return r.key === b.leading; })[0], mode = b.modes.filter(function (r) { return r.key === b.mode; })[0];
    var energy = [W.take([EL_KO[lead.key] + ' 기운이 ' + lead.share + '%로 ' + (b.dominant ? '뚜렷하게 ' : '') + '가장 많아, ' + EL_LINE[lead.key]]), W.take([MODE_LINE[mode.key]])];
    var energyEv = ['원소 균형 · ' + EL_KO[lead.key] + ' ' + lead.share + '%', '기질 · ' + MODE_KO[mode.key] + ' ' + mode.share + '%'], st = ctx.stellium;
    if (st) {
      energy.push(W.take([st.kind === 'sign'
        ? fill('{bodies:이} 모두 {sign}에 모여 있어, 그 별자리의 색이 삶 전체에 짙게 배어 있어요.', { bodies: names(st.bodies), sign: SIGN[st.value] })
        : fill('{bodies:이} 모두 {n}번째 집에 모여 있어, {arena:이} 삶의 큰 무대가 돼요.', { bodies: names(st.bodies), n: st.value, arena: HOUSE_ARENA[st.value - 1] })]));
      energyEv.push('몰림 · ' + (st.kind === 'sign' ? SIGN[st.value] : st.value + '번째 집') + ' · ' + st.bodies.map(function (x) { return KO[x]; }).join('·'));
    }
    paras.push({ key: 'energy', title: '에너지의 결', text: energy.filter(Boolean), evidence: energyEv });

    var hit = ctx.aspects.filter(function (a) { return (PERSONAL[a.a] || PERSONAL[a.b]) && a.a !== 'ASC' && a.b !== 'ASC' && a.a !== 'MC' && a.b !== 'MC'; })
      .map(function (a) { return { a: a, rank: a.orb + (a.a === 'Sun' && (a.b === 'Mercury' || a.b === 'Venus') ? 3 : 0) }; })
      .sort(function (x, y) { return x.rank - y.rank; })[0];
    if (hit) {
      var a = hit.a, tone = aspectTone(a), lines = aspectLines(ctx, 'portrait', { body: a.a, other: a.b, type: a.type }, tone, W);
      lines.push(W.take([ASPECT_TIP[a.type]]));
      var e1 = evBody(ctx, a.a, { with: a.b, type: a.type, orb: a.orb });
      paras.push({ key: 'pair', title: tone === 'tension' ? '내 안의 긴장' : '내 안의 재능', text: lines.filter(Boolean),
        evidence: [e1.label + (a.exact ? ' · 정확도 높음' : ''), bodyLabel(ctx, a.b)] });
    }
    return { headline: W.take([headlineOf(ctx)]) || headlineOf(ctx), paragraphs: paras };
  }
  function coverRows(ctx) {
    var sun = ctx.pos.Sun.signIdx, rows = [{ key: 'Sun', role: '의식하는 나', signIdx: sun, sign: SIGN[sun], phrase: GIFT[sun] }];
    if (ctx.moonSigns) rows.push({ key: 'Moon', role: '속마음', signIdx: ctx.pos.Moon.signIdx, signs: ctx.moonSigns, sign: SIGN[ctx.moonSigns[0]] + ' 또는 ' + SIGN[ctx.moonSigns[1]], phrase: NEED[ctx.moonSigns[0]] + ' 또는 ' + NEED[ctx.moonSigns[1]] });
    else rows.push({ key: 'Moon', role: '속마음', signIdx: ctx.pos.Moon.signIdx, signs: null, sign: SIGN[ctx.pos.Moon.signIdx], phrase: fill('{n:이} 있어야 편한 마음', { n: NEED[ctx.pos.Moon.signIdx] }) });
    if (ctx.timeKnown) rows.push({ key: 'ASC', role: '첫인상', signIdx: ctx.pos.ASC.signIdx, sign: SIGN[ctx.pos.ASC.signIdx], phrase: FACE[ctx.pos.ASC.signIdx] });
    return rows;
  }

  /* ── HTML (ko). Every string from the model is escaped; no inline style, only classes and SVG attributes. ── */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var BAND_LABEL = { Sun: '태양', Moon: '달', ASC: '첫인상' };
  function bandSvg(band) {
    var out = ['<svg class="as-band" viewBox="0 0 360 62" aria-hidden="true" focusable="false">', '<line class="as-band-line" x1="0" y1="48" x2="360" y2="48"/>'];
    for (var i = 0; i <= 12; i++) out.push('<line class="as-band-tick" x1="' + i * 30 + '" y1="43" x2="' + i * 30 + '" y2="53"/>');
    // Key dots last so the gold ones sit on top of nearby grey ones.
    band.slice().sort(function (a, b) { return (BAND_LABEL[a.body] ? 1 : 0) - (BAND_LABEL[b.body] ? 1 : 0); }).forEach(function (p) { out.push('<circle class="as-band-dot' + (BAND_LABEL[p.body] ? ' is-key' : '') + '" cx="' + p.lon + '" cy="48" r="' + (BAND_LABEL[p.body] ? 3.6 : 2.4) + '"/>'); });
    var last = -99, row = 0;
    band.filter(function (p) { return BAND_LABEL[p.body]; }).sort(function (a, b) { return a.lon - b.lon; }).forEach(function (p) {
      row = p.lon - last < 46 ? 1 - row : 0; last = p.lon;
      var x = Math.min(338, Math.max(22, p.lon));
      out.push('<text class="as-band-label" x="' + x + '" y="' + (row ? 14 : 32) + '" text-anchor="middle">' + BAND_LABEL[p.body] + '</text>');
    });
    out.push('</svg>');
    return out.join('');
  }
  // A no-break space before ' · ' keeps the dot from starting a wrapped line.
  function evText(l) { return esc(l).replace(/ · /g, '&nbsp;· '); }
  function evList(cls, labels) { return '<ul class="' + cls + '">' + labels.map(function (l) { return '<li>' + evText(l) + '</li>'; }).join('') + '</ul>'; }
  // Chips are labels (13px), not reading text, so they are spans in a role=list rather than li.
  function evChips(labels) { return '<div class="as-ev-chips" role="list">' + labels.map(function (l) { return '<span role="listitem">' + evText(l) + '</span>'; }).join('') + '</div>'; }
  function renderStory(model) {
    var c = model.cover, h = [];
    h.push('<header class="as-cover">');
    h.push('<div class="as-cover-sky">' + bandSvg(c.band) + '</div>');
    if (c.name) h.push('<div class="as-cover-kicker">' + esc(c.name) + ' 님의 출생 차트</div>');
    h.push('<h2 class="as-portrait">' + esc(model.portrait.headline) + '</h2>');
    h.push('<ul class="as-big3">' + c.big3.map(function (r) {
      return '<li class="as-big3-row" data-key="' + r.key + '"><span class="as-big3-role">' + esc(r.role) + '</span><span class="as-big3-sign">' + esc(r.sign) + '</span><span class="as-big3-phrase">' + esc(r.phrase) + '</span></li>';
    }).join('') + '</ul>');
    if (model.notes.timeNote) h.push('<p class="as-time-note" role="note">' + esc(model.notes.timeNote) + '</p>');
    h.push('</header>');
    h.push('<section class="as-temperament" aria-labelledby="asTemperamentTitle"><h3 class="as-h3" id="asTemperamentTitle">타고난 성향</h3>');
    model.portrait.paragraphs.forEach(function (p) {
      h.push('<div class="as-para" data-key="' + p.key + '"><h4 class="as-h4">' + esc(p.title) + '</h4><p>' + esc(p.text.join(' ')) + '</p>' + evChips(p.evidence) + '</div>');
    });
    h.push('</section>');
    h.push('<section class="as-cats" aria-labelledby="asCatsTitle"><h3 class="as-h3" id="asCatsTitle">삶의 여섯 갈래</h3>');
    model.categories.forEach(function (k) {
      h.push('<details class="as-cat" data-cat="' + k.id + '"><summary><span class="as-cat-title">' + esc(k.title) + '</span><span class="as-cat-gist">' + esc(k.conclusion) + '</span></summary><div class="as-cat-body">');
      h.push('<div class="as-label">당신은 이래요</div><ul class="as-bullets">' + k.bullets.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>');
      if (k.scene) h.push('<p class="as-scene">' + esc(k.scene) + '</p>');
      h.push('<dl class="as-fit">' + (k.fit ? '<div><dt>잘 맞는 것</dt><dd>' + esc(k.fit) + '</dd></div>' : '') + (k.caution ? '<div><dt>조심할 것</dt><dd>' + esc(k.caution) + '</dd></div>' : '') + '</dl>');
      if (k.action) h.push('<p class="as-action"><span class="as-label">이번 주 해볼 한 가지</span>' + esc(k.action) + '</p>');
      h.push('<details class="as-why"><summary>왜 이렇게 읽었나요</summary>' + evList('as-ev-list', k.evidence) + '</details>');
      h.push('</div></details>');
    });
    h.push('</section>');
    return '<div class="as-reading as-story" id="asStory">' + h.join('') + '</div>';
  }
  function render(model) { return renderStory(model); }

  /* ── 출생 차트 층(#asChart): 휠 + 접힌 행성 위치 표. 같은 chart 로 만든 model 만 쓴다. ── */
  var SIGN_SHORT = ['양', '황소', '쌍둥이', '게', '사자', '처녀', '천칭', '전갈', '사수', '염소', '물병', '물고기'];
  var WHEEL_NAME = { Sun: '태양', Moon: '달', Mercury: '수성', Venus: '금성', Mars: '화성', Jupiter: '목성', Saturn: '토성', Uranus: '천왕', Neptune: '해왕', Pluto: '명왕' };
  /* Sign-neutral: the sign's colour comes from TONE. */
  var MEANS = { Sun: '나를 드러내는 방식', Moon: '마음이 편해지는 방식', Mercury: '생각하고 말하는 방식', Venus: '좋아하고 아끼는 방식', Mars: '밀어붙이는 방식',
    Jupiter: '기회를 넓히는 방식', Saturn: '책임을 지는 방식', Uranus: '변화를 맞는 방식', Neptune: '꿈꾸고 상상하는 방식', Pluto: '깊이 바뀌는 방식' };
  var HARD = { square: 1, opposition: 1 };
  /* Label angles for lons, at least sep° apart: cut the circle at its widest gap, then merge
   * neighbouring groups that crowd each other and space each group evenly about its mean. */
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

  /* ── Deep reading (#asDeep): every planet, the closest aspects, periods, balance and how it was computed.
     It is written with the same writer as the story, after it, so no sentence on the page is said twice. ── */
  var PLANET_LINE = {
    Sun: '{gift:으로} 자기 자리를 만들어 가요.',
    Moon: '{need:이} 채워질 때 마음이 가장 편안해요.',
    Mercury: '생각을 정리하고 말할 때는 {manner} 풀어 가요.',
    Venus: '{tone} 사람과 분위기에 마음이 먼저 끌려요.',
    Mars: '원하는 게 생기면 {manner} 움직이는 편이에요.',
    Jupiter: '{tone} 경험 쪽으로 운의 문이 넓게 열려요.',
    Saturn: '{shadow:을} 다스리는 법을 익힐수록 단단해져요.',
    Uranus: '같은 세대와 함께 {sign}의 결로 낡은 틀을 바꾸고 싶어 해요.',
    Neptune: '같은 세대와 함께 {tone} 꿈과 이상을 품고 자랐어요.',
    Pluto: '같은 세대와 함께 {sign}의 결로 깊은 변화를 겪으며 단단해져요.'
  };
  var PLANET_DOES = {
    Sun: '태양은 삶의 방향과 스스로를 드러내는 힘을 보여 줘요.',
    Moon: '달은 마음이 쉬는 방식과 감정의 리듬을 보여 줘요.',
    Mercury: '수성은 생각하고 배우고 말하는 방식을 보여 줘요.',
    Venus: '금성은 좋아하는 것과 사랑하는 방식, 즐기는 감각을 보여 줘요.',
    Mars: '화성은 원하는 것을 향해 움직이는 힘과 화를 내는 방식을 보여 줘요.',
    Jupiter: '목성은 운이 넓어지는 쪽과 믿음의 방향을 보여 줘요.',
    Saturn: '토성은 오래 걸려도 단단히 쌓아야 하는 숙제를 보여 줘요.',
    Uranus: '천왕성은 틀을 깨고 새로 바꾸려는 힘을 보여 줘요.',
    Neptune: '해왕성은 상상과 이상, 경계가 흐려지는 곳을 보여 줘요.',
    Pluto: '명왕성은 무너졌다 다시 서며 깊어지는 힘을 보여 줘요.'
  };
  var DEEP_MODE = {
    cardinal: '먼저 시작하는 {sign}에 놓인 {body:은} 앞장서서 길을 여는 쪽으로 힘을 써요.',
    fixed: '한번 정하면 지켜 내는 {sign}에 놓인 {body:은} 오래 꾸준히 버티는 쪽으로 힘을 써요.',
    mutable: '상황에 맞춰 바뀌는 {sign}에 놓인 {body:은} 그때그때 유연하게 힘을 써요.'
  };
  var DEEP_HOUSE = ['{n}번째 집({arena})에 있어서, {at} 이 힘이 가장 잘 드러나요.', '삶의 무대는 {n}번째 집({arena})이라, {at} 자주 쓰여요.', '{n}번째 집({arena})에 놓여 {at} 먼저 깨어나요.'];
  var DEEP_SPARE = ['잘 쓰면 {gift:이} 되고, 지나치면 {shadow:으로} 기울어요.', '이 자리에서는 {need:이} 있을 때 힘이 제대로 나와요.'];
  var RETRO_LINE = '태어날 때 역행 중이라, 이 힘을 밖으로 쓰기 전에 안으로 곱씹는 흐름이 있어요.';
  var ASPECT_TERM = { conjunction: '합', sextile: '육분', square: '사각', trine: '삼분', opposition: '대립' };
  var TALK_TIP = {
    conjunction: '두 힘이 늘 함께 움직여서, 한쪽을 쓰면 다른 쪽도 따라 깨어나요.',
    sextile: '조금만 손을 보태면 서로를 살려 주는 사이예요.',
    square: '부딪힐 때마다 조금씩 자라니, 답답함을 신호로 삼아 보세요.',
    trine: '애쓰지 않아도 잘 맞물려서, 의식해서 써야 재능이 돼요.',
    opposition: '한쪽으로 쏠리지 않게 둘 사이의 균형을 찾는 게 숙제예요.'
  };
  var PERIOD_NOTE = '시기 해석은 흐름을 읽는 지도예요. 정해진 일을 말하지는 않아요.';
  function closeness(orb) { return orb <= 1 ? '아주 정확해요' : orb <= 3 ? '정확한 편' : '느슨한 편'; }
  function pairText(a, W) {
    var key = pairKey(a.a, a.b), ab = key.split('-'), row = PAIR[key], hard = aspectTone(a) === 'tension' ? 1 : 0;
    var head = { a: KO[ab[0]], b: KO[ab[1]], asp: ASPECT_KO[a.type] };
    return row ? W.take([fill('{a:과} {b:이} {asp:이라} ', head) + (row[hard] || row[0])]) : null;
  }
  function deepPlanet(ctx, body, W) {
    var p = ctx.pos[body], pair = body === 'Moon' && ctx.moonSigns, v = W.vars(p.signIdx), s = [];
    var line = pair ? fill('{a:이나} {b:이} 채워질 때 마음이 가장 편안해요.', { a: NEED[pair[0]], b: NEED[pair[1]] }) : fill(PLANET_LINE[body], v);
    s.push(PLANET_DOES[body]);
    if (p.house) s.push(W.take(W.rotate('deep-house', DEEP_HOUSE).map(function (t) { return fill(t, { n: p.house, arena: HOUSE_ARENA[p.house - 1], at: ARENA_AT[p.house - 1] }); })));
    else if (pair) s.push(W.take([fill('태어난 날 달이 {a}에서 {b}로 넘어가, 두 별자리의 마음결을 함께 지녔어요.', { a: SIGN[pair[0]], b: SIGN[pair[1]] })]));
    else s.push(W.take([fill(DEEP_MODE[MODES[p.signIdx % 3]], W.vars(p.signIdx, { body: KO[body] }))]));
    var asp = ctx.aspects.filter(function (a) { return (a.a === body || a.b === body) && BODIES.indexOf(a.a) >= 0 && BODIES.indexOf(a.b) >= 0 && a.orb <= 4; })[0];
    var dig = p.dignity >= 4 ? 'high' : p.dignity <= -4 ? 'low' : null;
    var third = (asp && pairText(asp, W))
      || (dig && W.take(DIGNITY_LINE[dig].map(function (t) { return fill(t, { body: KO[body] }); })))
      || (p.retro && W.take([RETRO_LINE]))
      || (!pair && W.take(DEEP_SPARE.map(function (t) { return fill(t, v); })));
    if (third) s.push(third);
    return {
      body: body, ko: KO[body],
      where: (pair ? SIGN[pair[0]] + ' 또는 ' + SIGN[pair[1]] : SIGN[p.signIdx]) + (p.house ? ' · ' + p.house + '번째 집' : ''),
      retro: !!p.retro,
      line: W.take([line]) || line,
      text: s.filter(Boolean)
    };
  }
  function deepOf(ctx, W) {
    var planets = BODIES.filter(function (b) { return ctx.pos[b]; }).map(function (b) { return deepPlanet(ctx, b, W); });
    var talk = ctx.aspects.filter(function (a) { return BODIES.indexOf(a.a) >= 0 && BODIES.indexOf(a.b) >= 0; }).slice(0, 5).map(function (a) {
      var first = pairText(a, W) || W.take([fill('{a}의 {fa:과} {b}의 {fb:이} {asp:이에요}.', { a: KO[a.a], b: KO[a.b], fa: PLANET_FORCE[a.a], fb: PLANET_FORCE[a.b], asp: ASPECT_KO[a.type] })]);
      return { a: a.a, b: a.b, type: a.type, orb: a.orb, kind: ASPECT_KO[a.type] + '(' + ASPECT_TERM[a.type] + ')', closeness: closeness(a.orb), text: [first, W.take([TALK_TIP[a.type]])].filter(Boolean) };
    });
    var periods = null;
    if (ctx.age) {
      periods = { items: [], note: null };
      var f = ctx.firdaria, pr = ctx.profection;
      if (f) {
        var c = f.current, lines = [fill('지금은 {lord}의 시기예요. {from}년부터 {to}년까지 이어져요.', { lord: KO[c.lord], from: c.fromYear, to: c.toYear }), W.take([FIRD_LINE[c.lord]])];
        if (c.sub) lines.push(fill('그 안에서 {to}년까지는 {sub}의 결이 함께 섞여요.', { to: c.sub.toYear, sub: KO[c.sub.lord] }));
        lines.push(fill('{year}년부터는 {next}의 시기로 넘어가요.', { year: f.next.fromYear, next: KO[f.next.lord] }));
        periods.items.push({ key: 'firdaria', title: '인생 시기 지도', text: lines.filter(Boolean) });
      }
      if (pr) {
        periods.items.push({ key: 'profection', title: '올해의 주제 집', text: [
          fill('{age}세인 올해는 {n}번째 집, {arena}의 해예요.', { age: pr.age, n: pr.house, arena: HOUSE_ARENA[pr.house - 1] }),
          W.take([PROF[pr.house - 1][1]]),
          fill('이 해의 주인 행성은 {lord:이에요}.', { lord: KO[pr.lord] }) + (LORD_TIP[pr.lord] ? ' ' + LORD_TIP[pr.lord] + '.' : '')
        ].filter(Boolean) });
      }
      if (periods.items.length) periods.note = PERIOD_NOTE;
      else periods.timeless = '태어난 시간을 알면 낮과 밤 차트를 가려 인생 시기 지도와 올해의 주제 집까지 볼 수 있어요.';
    }
    var b = ctx.balance, lead = b.elements.filter(function (r) { return r.key === b.leading; })[0], mode = b.modes.filter(function (r) { return r.key === b.mode; })[0];
    var balanceText = [fill('{el} 기운이 {share}%로 가장 많고, {mode} 결이 가장 강해요.', { el: EL_KO[lead.key], share: lead.share, mode: MODE_KO[mode.key] })];
    if (b.empty.length) balanceText.push(fill('수성·금성·화성과 해·달에는 {els} 기운이 없어요.', { els: b.empty.map(function (k) { return EL_KO[k]; }).join('·') }));
    var calc = ['행성 위치는 스위스 천문력(Swiss Ephemeris)으로 계산한 회귀 황도 기준이에요.'];
    if (ctx.timeKnown) {
      calc.push('집은 플라시더스(Placidus) 방식으로 나눴어요. 태어난 시각과 장소를 그대로 반영해서, 몇 분 차이로도 집 경계가 움직일 수 있어요.');
      calc.push('별자리 하나를 집 하나로 보는 홀사인(Whole Sign) 방식은 큰 방향을 볼 때 써요. 두 방식이 다른 행성은 위치 표 아래에 따로 적었어요.');
    } else {
      calc.push('태어난 시간을 몰라 그날 정오의 하늘로 계산했고, 집과 축은 넣지 않았어요.');
      if (ctx.moonSigns) calc.push('달은 하루에 13도쯤 움직여서, 그날 별자리를 옮긴 달은 두 별자리를 함께 읽었어요.');
    }
    calc.push('행성끼리의 각은 해·달 8°, 수성·금성·화성 6°, 나머지는 5°까지 허용해서 셌어요.');
    calc.push(ctx.timeKnown ? '원소 균형은 해·달·상승점에 3, 수성·금성·화성에 2, 목성·토성에 1, 바깥 행성에 0.5를 주고 셌어요.' : '원소 균형은 해·달에 3, 수성·금성·화성에 2, 목성·토성에 1, 바깥 행성에 0.5를 주고 셌어요.');
    if (ctx.firdaria) calc.push('인생 시기 지도는 낮에 태어났는지 밤에 태어났는지에 따라 순서를 달리 쓰고, 75년을 한 바퀴로 봐요.');
    return {
      planets: planets,
      talk: talk,
      periods: periods,
      balance: { text: balanceText, elements: b.elements.map(function (r) { return { key: r.key, ko: r.ko, share: r.share }; }), modes: b.modes.map(function (r) { return { key: r.key, ko: r.ko, share: r.share }; }) },
      calc: calc
    };
  }
  function bars(rows, cls) {
    return '<div class="as-bars ' + cls + '" role="list">' + rows.map(function (r) {
      return '<div class="as-bar" role="listitem" data-key="' + r.key + '"><span class="as-bar-name">' + esc(r.ko) + '</span>'
        + '<svg class="as-bar-track" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect class="as-bar-bg" width="100" height="6"/><rect class="as-bar-fill" width="' + Math.max(0, Math.min(100, r.share)) + '" height="6"/></svg>'
        + '<span class="as-bar-val">' + r.share + '%</span></div>';
    }).join('') + '</div>';
  }
  // Prose only: keep dot-joined lists, a closing parenthesis and its particle, and "볼 수" on one line at 390px.
  function keep(t) { return esc(t).replace(/([가-힣])·(?=[가-힣])/g, '$1⁠·⁠').replace(/\)(?=[가-힣])/g, ')⁠').replace(/ 수 있/g, ' 수 있'); }
  function renderDeep(model) {
    var d = model.deep, h = [];
    h.push('<section class="as-deep-part" aria-labelledby="asDeepPlanets"><h3 class="as-h3" id="asDeepPlanets">행성 열 개</h3><div class="as-planets">');
    d.planets.forEach(function (p) {
      h.push('<details class="as-planet" data-body="' + p.body + '"><summary><span class="as-pl-name">' + esc(p.ko) + '</span><span class="as-pl-where">' + evText(p.where)
        + (p.retro ? ' <span class="as-rx">역행</span>' : '') + '</span><span class="as-pl-line">' + esc(p.line) + '</span></summary><p class="as-pl-body">' + keep(p.text.join(' ')) + '</p></details>');
    });
    h.push('</div></section>');
    if (d.talk.length) {
      h.push('<section class="as-deep-part" aria-labelledby="asDeepTalk"><h3 class="as-h3" id="asDeepTalk">행성끼리의 대화</h3><ol class="as-talk">');
      d.talk.forEach(function (t) {
        h.push('<li class="as-talk-item' + (HARD[t.type] ? ' is-hard' : '') + '"><div class="as-talk-head"><span class="as-talk-pair">' + esc(KO[t.a]) + '&nbsp;· ' + esc(KO[t.b]) + '</span>'
          + '<span class="as-talk-kind">' + esc(t.kind) + '</span><span class="as-talk-orb">' + esc(t.closeness) + '</span></div><p>' + keep(t.text.join(' ')) + '</p></li>');
      });
      h.push('</ol></section>');
    }
    if (d.periods) {
      h.push('<section class="as-deep-part" aria-labelledby="asDeepPeriods"><h3 class="as-h3" id="asDeepPeriods">인생 시기</h3>');
      d.periods.items.forEach(function (it) { h.push('<div class="as-period" data-key="' + it.key + '"><h4 class="as-h4">' + esc(it.title) + '</h4><p>' + keep(it.text.join(' ')) + '</p></div>'); });
      if (d.periods.timeless) h.push('<p class="as-period-none">' + keep(d.periods.timeless) + '</p>');
      if (d.periods.note) h.push('<p class="as-note">' + esc(d.periods.note) + '</p>');
      h.push('</section>');
    }
    h.push('<section class="as-deep-part" aria-labelledby="asDeepBalance"><h3 class="as-h3" id="asDeepBalance">원소와 기질의 균형</h3><p>' + keep(d.balance.text.join(' ')) + '</p>');
    h.push('<div class="as-balance"><div><h4 class="as-h4">원소</h4>' + bars(d.balance.elements, 'is-elements') + '</div><div><h4 class="as-h4">기질</h4>' + bars(d.balance.modes, 'is-modes') + '</div></div></section>');
    h.push('<details class="as-calc"><summary>어떻게 계산했나요</summary><ul>' + d.calc.map(function (c) { return '<li>' + keep(c) + '</li>'; }).join('') + '</ul></details>');
    return '<div class="as-reading as-deep" id="asDeep">' + h.join('') + '</div>';
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
      return { body: b, ko: KO[b], lon: round1(p.lon), uncertain: b === 'Moon' && !!ctx.moonSigns, signIdx: p.signIdx, sign: SIGN[p.signIdx], deg: round1(p.deg), degText: degText(p.deg), house: p.house || null, wholeHouse: p.wholeHouse || null, retro: p.retro, dignity: p.dignity, angular: !!p.angular };
    });
    var W = writer(), portrait = portraitOf(ctx, W);
    var categories = CATS.map(function (c) { return writeCategory(ctx, c[0], c[1], pickFactors(ctx, c[0], used, reserved), W); });
    var deep = deepOf(ctx, W);
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
      portrait: portrait,
      categories: categories,
      deep: deep,
      planets: planets,
      angles: ctx.timeKnown ? { asc: round1(ctx.pos.ASC.lon), mc: round1(ctx.pos.MC.lon), ascSign: ctx.pos.ASC.signIdx, mcSign: ctx.pos.MC.signIdx, cusps: ctx.cusps.map(round1) } : null,
      aspects: ctx.aspects.slice(),
      periods: { age: ctx.age ? ctx.age.age : null, sect: ctx.sect, profection: ctx.profection, firdaria: ctx.firdaria },
      balance: ctx.balance,
      stellium: ctx.stellium,
      notes: { moonSigns: ctx.moonSigns, timeNote: ctx.timeKnown ? null : TIME_NOTE }
    };
  }

  /* The older page block (saju-engine.js renderAstroInsightLegacyNeon) keys its firdaria and profection texts by Korean
   * planet name and house index; this hands it the sect- and birthday-aware values instead of its own year arithmetic.
   * A node firdaria (no planet text there) and an unknown birth time return null for that part. */
  function legacyPeriods(model) {
    var p = model && model.periods, f = p && p.firdaria, pr = p && p.profection, out = { firdaria: null, profection: null };
    if (f && CORE.indexOf(f.current.lord) >= 0) {
      out.firdaria = { main: KO[f.current.lord], sub: f.current.sub ? KO[f.current.sub.lord] : null, fromYear: f.current.fromYear, toYear: f.current.toYear, sect: f.sect };
    }
    if (pr) out.profection = { houseIdx: pr.house - 1, signIdx: pr.signIdx, lord: KO[pr.lord], age: pr.age };
    return out;
  }

  root.AstroNatalReading = {
    build: build,
    legacyPeriods: legacyPeriods,
    render: render,
    renderChart: renderChart,
    renderDeep: renderDeep,
    _calc: { SIGN: SIGN, KO: KO, RULER: RULER, dignity: dignity, houseOf: houseOf, aspectsOf: aspectsOf, degText: degText, jo: jo, contrast: contrast, fill: fill, SIGN_STYLE: SIGN_STYLE, PROF: PROF }
  };
})(typeof window !== 'undefined' ? window : globalThis);

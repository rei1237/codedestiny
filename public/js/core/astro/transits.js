/* Transits (display only). Natal points plus a position function in; today's sky and a dated 12-month timeline out.
 * Pure: no DOM, no page globals, no clock, no requests — the date arrives as opts.today ('YYYY-MM-DD' in opts.tz hours,
 * default 9 = KST) and positions come from opts.lonsAt(ms) → { Sun: lon°, …, Pluto: lon° } (geocentric, tropical, of date).
 * Aspects are the five Ptolemaic ones (natal-reading.js aspectsOf, worker swiss-ephemeris.js aspectBetween); the year
 * timeline uses the 3° transit orb of the premium report (astro-premium-generator.js transitAspectBetween).
 * Without a birth time the Moon, ASC, MC and houses are left out, as in natal-reading.js.
 * Eclipses come from a table generated with astronomy-engine (build-time only in this repo); the test regenerates it. */
(function (root) {
  'use strict';
  var BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  var MOVING = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  var INGRESS = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  var SLOW = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  var YEAR_TARGETS = ['Sun', 'Moon', 'ASC', 'MC', 'Venus', 'Mars'];
  var TODAY_TARGETS = ['Sun', 'Moon', 'ASC', 'MC', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
  var ASPECTS = [['conjunction', 0], ['sextile', 60], ['square', 90], ['trine', 120], ['opposition', 180]];
  var ORB = 3;
  var TODAY_ORB = { Moon: 6, Sun: 3, Mercury: 3, Venus: 3, Mars: 3, Jupiter: 2, Saturn: 2, Uranus: 1.5, Neptune: 1.5, Pluto: 1.5 };
  var T_WEIGHT = { Moon: 1, Sun: 1.2, Mercury: 1, Venus: 1.1, Mars: 1.3, Jupiter: 1.4, Saturn: 1.6, Uranus: 1.5, Neptune: 1.4, Pluto: 1.6 };
  var N_WEIGHT = { Sun: 3, Moon: 3, ASC: 3, MC: 2.5, Mercury: 2, Venus: 2, Mars: 2, Jupiter: 1, Saturn: 1 };
  var Y_WEIGHT = { Jupiter: 3, Saturn: 4, Uranus: 4, Neptune: 3.5, Pluto: 4.5 };
  var PHASES = ['new', 'waxing-crescent', 'first-quarter', 'waxing-gibbous', 'full', 'waning-gibbous', 'last-quarter', 'waning-crescent'];
  var CATS = ['love', 'work', 'money', 'people', 'condition'];
  var REL = {
    love: { Venus: 1, Mars: 0.6, Moon: 0.5, Sun: 0.3 },
    work: { MC: 1, Saturn: 0.8, Sun: 0.7, Mars: 0.6, Mercury: 0.5, Jupiter: 0.5 },
    money: { Jupiter: 1, Venus: 0.8, Saturn: 0.5, Mercury: 0.4 },
    people: { Mercury: 1, ASC: 0.8, Moon: 0.6, Venus: 0.5, Jupiter: 0.4 },
    condition: { Moon: 1, Sun: 0.8, Mars: 0.7, ASC: 0.6, Saturn: 0.5, Neptune: 0.4 }
  };
  var MINUTE = 60000, HOUR = 3600000, DAY = 86400000;
  /* [UTC peak, kind, type, longitude of the Sun (solar) or Moon (lunar) at peak] — astronomy-engine
   * SearchGlobalSolarEclipse / SearchLunarEclipse, 2024–2036. __tests__/ui/astro-transits.test.mjs recomputes it. */
  var ECLIPSES = [
    ['2024-03-25T07:12', 'lunar', 'penumbral', 185.22], ['2024-04-08T18:17', 'solar', 'total', 19.4],
    ['2024-09-18T02:44', 'lunar', 'partial', 355.78], ['2024-10-02T18:44', 'solar', 'annular', 190.06],
    ['2025-03-14T06:58', 'lunar', 'total', 173.98], ['2025-03-29T10:47', 'solar', 'partial', 8.99],
    ['2025-09-07T18:11', 'lunar', 'total', 345.4], ['2025-09-21T19:41', 'solar', 'partial', 179.08],
    ['2026-02-17T12:11', 'solar', 'annular', 328.84], ['2026-03-03T11:33', 'lunar', 'total', 162.86],
    ['2026-08-12T17:45', 'solar', 'total', 140.04], ['2026-08-28T04:12', 'lunar', 'partial', 334.85],
    ['2027-02-06T15:59', 'solar', 'annular', 317.63], ['2027-02-20T23:12', 'lunar', 'penumbral', 151.98],
    ['2027-07-18T16:02', 'lunar', 'penumbral', 295.96], ['2027-08-02T10:06', 'solar', 'total', 129.92],
    ['2027-08-17T07:13', 'lunar', 'penumbral', 324.07], ['2028-01-12T04:13', 'lunar', 'partial', 111.56],
    ['2028-01-26T15:07', 'solar', 'annular', 306.18], ['2028-07-06T18:19', 'lunar', 'partial', 285.26],
    ['2028-07-22T02:55', 'solar', 'total', 119.84], ['2028-12-31T16:51', 'lunar', 'total', 100.58],
    ['2029-01-14T17:12', 'solar', 'partial', 294.83], ['2029-06-12T04:04', 'solar', 'partial', 81.49],
    ['2029-06-26T03:22', 'lunar', 'total', 274.83], ['2029-07-11T15:36', 'solar', 'partial', 109.62],
    ['2029-12-05T15:02', 'solar', 'partial', 253.77], ['2029-12-20T22:41', 'lunar', 'total', 89.31],
    ['2030-06-01T06:27', 'solar', 'annular', 70.84], ['2030-06-15T18:33', 'lunar', 'partial', 264.64],
    ['2030-11-25T06:50', 'solar', 'total', 243.04], ['2030-12-09T22:27', 'lunar', 'penumbral', 77.8],
    ['2031-05-07T03:50', 'lunar', 'penumbral', 226.53], ['2031-05-21T07:14', 'solar', 'annular', 60.07],
    ['2031-06-05T11:44', 'lunar', 'penumbral', 254.51], ['2031-10-30T07:45', 'lunar', 'penumbral', 36.79],
    ['2031-11-14T21:06', 'solar', 'total', 232.29], ['2032-04-25T15:13', 'lunar', 'total', 216],
    ['2032-05-09T13:25', 'solar', 'annular', 49.48], ['2032-10-18T19:02', 'lunar', 'total', 25.99],
    ['2032-11-03T05:32', 'solar', 'partial', 221.35], ['2033-03-30T18:01', 'solar', 'total', 10.35],
    ['2033-04-14T19:12', 'lunar', 'total', 205.12], ['2033-09-23T13:53', 'solar', 'partial', 180.86],
    ['2033-10-08T10:55', 'lunar', 'total', 15.45], ['2034-03-20T10:17', 'solar', 'total', 359.88],
    ['2034-04-03T19:05', 'lunar', 'penumbral', 194], ['2034-09-12T16:18', 'solar', 'annular', 169.98],
    ['2034-09-28T02:46', 'lunar', 'partial', 4.97], ['2035-02-22T09:04', 'lunar', 'penumbral', 153.66],
    ['2035-03-09T23:04', 'solar', 'annular', 349.2], ['2035-08-19T01:10', 'lunar', 'partial', 326.01],
    ['2035-09-02T01:55', 'solar', 'total', 159.46], ['2036-02-11T22:11', 'lunar', 'total', 142.79],
    ['2036-02-27T04:45', 'solar', 'partial', 338.16], ['2036-07-23T10:30', 'solar', 'partial', 121.16],
    ['2036-08-07T02:51', 'lunar', 'total', 315.22], ['2036-08-21T17:24', 'solar', 'partial', 149.23]
  ];

  function norm(x) { x = x % 360; return x < 0 ? x + 360 : x; }
  function sdiff(a, b) { var d = norm(a - b); return d > 180 ? d - 360 : d; }
  function gap(a, b) { return Math.abs(sdiff(a, b)); }
  function round1(x) { return Math.round(x * 10) / 10; }
  function round2(x) { return Math.round(x * 100) / 100; }
  function lonOf(p) { return p && isFinite(p.idx) && isFinite(p.deg) ? norm(Number(p.idx) * 30 + Number(p.deg)) : null; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parseDay(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? { year: +m[1], month: +m[2], day: +m[3] } : null; }
  function tzOf(opts) { return opts && isFinite(opts.tz) ? Number(opts.tz) : 9; }
  function dayStart(d, tz, addMonths) { return Date.UTC(d.year, d.month - 1 + (addMonths || 0), d.day) - tz * HOUR; }
  function when(ms, tz) {
    var t = new Date(Math.round(ms / MINUTE) * MINUTE + tz * HOUR);
    return { ms: Math.round(ms), date: t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()), time: pad(t.getUTCHours()) + ':' + pad(t.getUTCMinutes()) };
  }
  function houseOf(lon, cusps) {
    if (!cusps) return null;
    for (var i = 0; i < 12; i++) {
      if (norm(lon - cusps[i]) < norm(cusps[(i + 1) % 12] - cusps[i])) return i + 1;
    }
    return 1;
  }
  function tone(transit, type) {
    if (type === 'trine' || type === 'sextile') return 'flow';
    if (type === 'square' || type === 'opposition') return 'tension';
    if (transit === 'Saturn' || transit === 'Mars' || transit === 'Pluto' || transit === 'Uranus') return 'tension';
    if (transit === 'Jupiter' || transit === 'Venus') return 'flow';
    return 'neutral';
  }
  /* Bisection: fn(a) and fn(b) have opposite signs; stops when the bracket is under tol ms. */
  function solve(fn, a, b, tol) {
    var fa = fn(a);
    for (var i = 0; i < 64 && b - a > tol; i++) {
      var m = (a + b) / 2, fm = fn(m);
      if ((fm < 0) === (fa < 0)) { a = m; fa = fm; } else b = m;
    }
    return (a + b) / 2;
  }
  function memo(lonsAt) {
    if (typeof lonsAt !== 'function') throw new Error('AstroTransits: opts.lonsAt(ms) is required');
    var seen = {};
    return function (ms) {
      var k = Math.round(ms);
      if (!seen[k]) {
        var raw = lonsAt(k), out = {};
        BODIES.forEach(function (b) {
          if (!isFinite(raw && raw[b])) throw new Error('AstroTransits: lonsAt returned no ' + b);
          out[b] = norm(Number(raw[b]));
        });
        seen[k] = out;
      }
      return seen[k];
    };
  }

  /* Chart (AstroEngine.calcAll / calcAstroSwissChartOrThrow shape) → natal points used for transits. */
  function natalOf(chart, timeKnown) {
    if (!chart || !chart.sun) throw new Error('AstroTransits.natalOf: chart is missing the Sun');
    var known = timeKnown !== false && !!(chart.asc && chart.mc), pts = {};
    BODIES.forEach(function (b) {
      var lon = lonOf(b === 'Sun' ? chart.sun : b === 'Moon' ? chart.moon : chart.planets && chart.planets[b] && chart.planets[b].sign);
      if (lon != null) pts[b] = lon;
    });
    var cusps = null;
    if (known) {
      pts.ASC = lonOf(chart.asc);
      pts.MC = lonOf(chart.mc);
      var c = chart.houseCuspsLon;
      cusps = c && c.length === 12 && c.every(function (v) { return isFinite(v); }) ? c.map(function (v) { return norm(Number(v)); })
        : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (i) { return norm(Math.floor(pts.ASC / 30) * 30 + 30 * i); });
    } else {
      delete pts.Moon;
    }
    return { timeKnown: known, points: pts, cusps: cusps };
  }
  /* Same chart shape → the lonsAt row, so the page can wrap its own calculator. */
  function lonsFromChart(chart) {
    var out = {};
    BODIES.forEach(function (b) { out[b] = lonOf(b === 'Sun' ? chart.sun : b === 'Moon' ? chart.moon : chart.planets && chart.planets[b] && chart.planets[b].sign); });
    return out;
  }

  /* ── today ── */
  function moonIngresses(at, a, b) {
    var out = [], step = 6 * HOUR, prev = Math.floor(at(a).Moon / 30);
    for (var t = a + step; t <= b; t += step) {
      var s = Math.floor(at(t).Moon / 30);
      if (s !== prev) {
        var edge = s * 30;
        out.push({ ms: solve(function (x) { return sdiff(at(x).Moon, edge); }, t - step, t, MINUTE / 2), signIdx: s });
        prev = s;
      }
    }
    return out;
  }
  /* Void of course: from the Moon's last exact Ptolemaic aspect to any planet until it leaves the sign. */
  function lastLunarAspect(at, a, b) {
    var step = 2 * HOUR, last = null, prev = at(a);
    for (var t = a + step; t <= b + step; t += step) {
      var x = Math.min(t, b), cur = at(x);
      BODIES.forEach(function (body) {
        if (body === 'Moon') return;
        [0, 60, -60, 90, -90, 120, -120, 180].forEach(function (ang) {
          var f0 = sdiff(prev.Moon, prev[body] + ang), f1 = sdiff(cur.Moon, cur[body] + ang);
          if (Math.abs(f0) < 30 && Math.abs(f1) < 30 && (f0 < 0) !== (f1 < 0)) {
            var hit = solve(function (y) { var p = at(y); return sdiff(p.Moon, p[body] + ang); }, x - step < a ? a : t - step, x, MINUTE / 2);
            if (hit < b && (!last || hit > last.ms)) last = { ms: hit, body: body, angle: Math.abs(ang) };
          }
        });
      });
      prev = cur;
      if (x === b) break;
    }
    return last;
  }
  function voidsOf(at, ingresses, start, end, tz) {
    var out = [];
    for (var i = 0; i + 1 < ingresses.length; i++) {
      var a = ingresses[i].ms, b = ingresses[i + 1].ms;
      if (b <= start || a >= end) continue;
      var last = lastLunarAspect(at, a, b), v0 = last ? last.ms : a;
      if (b <= start || v0 >= end) continue;
      out.push({ from: when(v0, tz), to: when(b, tz), inDay: { from: when(Math.max(v0, start), tz), to: when(Math.min(b, end), tz) }, nextSignIdx: ingresses[i + 1].signIdx, lastAspect: last ? { body: last.body, angle: last.angle } : null });
    }
    return out;
  }
  function todayHits(at, natal, noon) {
    var L = at(noon), L2 = at(noon + HOUR), out = [];
    BODIES.forEach(function (tb, ti) {
      TODAY_TARGETS.forEach(function (nb, ni) {
        var N = natal.points[nb];
        if (N == null) return;
        ASPECTS.forEach(function (asp) {
          var limit = TODAY_ORB[tb], off = Math.abs(gap(L[tb], N) - asp[1]);
          if (off > limit) return;
          var applying = Math.abs(gap(L2[tb], N) - asp[1]) < off;
          var strength = T_WEIGHT[tb] * N_WEIGHT[nb] * (1 - off / limit) * (applying ? 1.15 : 1);
          out.push({ transit: tb, natal: nb, type: asp[0], orb: round1(off), applying: applying, tone: tone(tb, asp[0]), strength: round2(strength), order: ti * 100 + ni });
        });
      });
    });
    return out.sort(function (x, y) { return y.strength - x.strength || x.order - y.order; }).map(function (h) { delete h.order; return h; });
  }
  function speedOf(at, body, ms) { return sdiff(at(ms + 12 * HOUR)[body], at(ms - 12 * HOUR)[body]); }
  function scoresOf(hits, ctx) {
    var sum = {};
    CATS.forEach(function (c) { sum[c] = 0; });
    hits.forEach(function (h) {
      var sign = h.tone === 'flow' ? 1 : h.tone === 'tension' ? -1 : 0.3;
      CATS.forEach(function (c) { sum[c] += h.strength * sign * Math.max(REL[c][h.transit] || 0, REL[c][h.natal] || 0); });
    });
    var mod = { love: 0, work: 0, money: 0, people: 0, condition: 0 };
    if (ctx.workVoidHours >= 3) { mod.work -= 5; mod.money -= 5; }
    if (ctx.phase === 'new') { mod.work += 2; mod.condition -= 2; }
    if (ctx.phase === 'full') { mod.people += 3; mod.condition -= 2; }
    if (ctx.phase === 'waxing-crescent' || ctx.phase === 'first-quarter' || ctx.phase === 'waxing-gibbous') mod.work += 2;
    if (ctx.moonSunElement) mod.condition += 3;
    if (ctx.retro.Mercury) { mod.people -= 3; mod.work -= 2; }
    if (ctx.retro.Venus) { mod.love -= 3; mod.money -= 2; }
    if (ctx.stationing.Mercury) mod.work -= 3;
    var out = {};
    /* tanh keeps a crowded sky from pinning a category to the floor or ceiling (linear scaling did so on ~1 day in 6). */
    CATS.forEach(function (c) { out[c] = Math.max(32, Math.min(95, Math.round(64 + 26 * Math.tanh(sum[c] / 4) + mod[c]))); });
    return out;
  }
  function today(natal, opts) {
    opts = opts || {};
    var tz = tzOf(opts), day = parseDay(opts.today);
    if (!day) throw new Error('AstroTransits.today: opts.today must be YYYY-MM-DD');
    var at = memo(opts.lonsAt), start = dayStart(day, tz), end = start + DAY, noon = start + 12 * HOUR, L = at(noon);
    var elong = norm(L.Moon - L.Sun), phase = PHASES[Math.floor(norm(elong + 22.5) / 45) % 8];
    var ingresses = moonIngresses(at, start - 3 * DAY, end + 3 * DAY);
    var inDay = ingresses.filter(function (i) { return i.ms >= start && i.ms < end; })[0];
    var voids = voidsOf(at, ingresses, start, end, tz);
    var workA = start + 9 * HOUR, workB = start + 18 * HOUR, workVoid = 0;
    voids.forEach(function (v) { workVoid += Math.max(0, Math.min(v.to.ms, workB) - Math.max(v.from.ms, workA)); });
    var retro = {}, stationing = {};
    MOVING.forEach(function (b) {
      if (speedOf(at, b, noon) < 0) retro[b] = 1;
      if ((speedOf(at, b, noon - 1.5 * DAY) < 0) !== (speedOf(at, b, noon + 1.5 * DAY) < 0)) stationing[b] = 1;
    });
    var hits = todayHits(at, natal, noon);
    var moonSign = Math.floor(L.Moon / 30), sunNatal = natal.points.Sun;
    var moon = {
      signIdx: moonSign, lon: round1(L.Moon), phase: phase, elongation: round1(elong), waxing: elong < 180,
      illumination: Math.round(50 * (1 - Math.cos(elong * Math.PI / 180))),
      house: houseOf(L.Moon, natal.cusps),
      ingress: inDay ? { at: when(inDay.ms, tz), signIdx: inDay.signIdx } : null,
      voids: voids
    };
    return {
      date: opts.today, tz: tz, timeKnown: natal.timeKnown,
      sun: { signIdx: Math.floor(L.Sun / 30), lon: round1(L.Sun) },
      moon: moon,
      hits: hits,
      top: hits.slice(0, 3),
      retro: MOVING.filter(function (b) { return retro[b]; }),
      stationing: MOVING.filter(function (b) { return stationing[b]; }),
      scores: scoresOf(hits, { workVoidHours: workVoid / HOUR, phase: phase, retro: retro, stationing: stationing, moonSunElement: sunNatal != null && moonSign % 4 === Math.floor(sunNatal / 30) % 4 })
    };
  }

  /* ── 12-month timeline ── */
  function sampleRange(at, a, b) {
    var ts = [], rows = [];
    for (var t = a; t <= b; t += DAY) { ts.push(t); rows.push(at(t)); }
    return { ts: ts, rows: rows };
  }
  function transitEvents(at, S, natal, w0, w1, tz) {
    var out = [];
    SLOW.forEach(function (tb, ti) {
      YEAR_TARGETS.forEach(function (nb, ni) {
        var N = natal.points[nb];
        if (N == null) return;
        ASPECTS.forEach(function (asp) {
          (asp[1] === 0 || asp[1] === 180 ? [asp[1]] : [asp[1], -asp[1]]).forEach(function (ang) {
            var P = norm(N + ang), f = function (ms) { return sdiff(at(ms)[tb], P); };
            var runs = [], exacts = [], run = null, n = S.ts.length;
            for (var i = 0; i < n; i++) {
              var t = S.ts[i], v = sdiff(S.rows[i][tb], P), inOrb = Math.abs(v) <= ORB;
              if (inOrb && !run) {
                run = { start: i === 0 ? t : solve(function (x) { return ORB - Math.abs(f(x)); }, S.ts[i - 1], t, HOUR), startsBefore: i === 0, min: Math.abs(v), minAt: t };
              } else if (!inOrb && run) {
                run.end = solve(function (x) { return Math.abs(f(x)) - ORB; }, S.ts[i - 1], t, HOUR);
                runs.push(run); run = null;
              }
              if (run && Math.abs(v) < run.min) { run.min = Math.abs(v); run.minAt = t; }
              if (i > 0) {
                var u = sdiff(S.rows[i - 1][tb], P);
                if (Math.abs(u) <= ORB + 1 && Math.abs(v) <= ORB + 1 && (u < 0) !== (v < 0)) exacts.push(solve(f, S.ts[i - 1], t, HOUR));
              }
            }
            if (run) { run.end = S.ts[n - 1]; run.endsAfter = true; runs.push(run); }
            /* A retrograde loop re-enters the orb within months; those passes are one event. */
            var groups = [];
            runs.forEach(function (r) {
              var g = groups[groups.length - 1];
              if (g && r.start - g.end < 200 * DAY) { g.end = r.end; g.endsAfter = r.endsAfter; if (r.min < g.min) { g.min = r.min; g.minAt = r.minAt; } }
              else groups.push({ start: r.start, end: r.end, startsBefore: r.startsBefore, endsAfter: r.endsAfter, min: r.min, minAt: r.minAt });
            });
            groups.forEach(function (g) {
              if (g.end < w0 || g.start >= w1) return;
              var ex = exacts.filter(function (x) { return x >= g.start - DAY && x <= g.end + DAY; });
              var inWin = ex.filter(function (x) { return x >= w0 && x < w1; });
              var peak = inWin.length ? inWin[0] : ex.length ? ex[0] : g.minAt;
              var rank = Y_WEIGHT[tb] * (N_WEIGHT[nb] >= 2.5 ? 3 : 2) * (inWin.length ? 1 : 0.6) * (asp[0] === 'conjunction' ? 1.2 : asp[0] === 'square' || asp[0] === 'opposition' ? 1.05 : 1);
              out.push({
                kind: 'transit', transit: tb, natal: nb, type: asp[0], tone: tone(tb, asp[0]),
                start: when(g.start, tz), end: when(g.end, tz), startsBefore: !!g.startsBefore, endsAfter: !!g.endsAfter,
                exacts: ex.map(function (x) { return when(x, tz); }), exactInWindow: inWin.length > 0,
                peak: when(peak, tz), closestOrb: round2(g.min),
                house: houseOf(at(peak)[tb], natal.cusps),
                rank: round2(rank), order: ti * 1000 + ni * 10 + ASPECTS.indexOf(asp)
              });
            });
          });
        });
      });
    });
    return out.sort(function (x, y) { return x.peak.ms - y.peak.ms || x.order - y.order; });
  }
  function stationsOf(at, S, tz) {
    var out = [];
    MOVING.forEach(function (b) {
      var v = function (ms) { return speedOf(at, b, ms); }, prev = null;
      for (var i = 0; i + 1 < S.ts.length; i++) {
        var m = S.ts[i] + 12 * HOUR, s = sdiff(S.rows[i + 1][b], S.rows[i][b]);
        if (prev && (prev.s < 0) !== (s < 0)) {
          var t = solve(v, prev.m, m, HOUR);
          out.push({ body: b, kind: s < 0 ? 'retrograde' : 'direct', at: when(t, tz), lon: round1(at(t)[b]), signIdx: Math.floor(at(t)[b] / 30) });
        }
        prev = { m: m, s: s };
      }
    });
    return out.sort(function (x, y) { return x.at.ms - y.at.ms; });
  }
  function ingressesOf(at, S, w0, w1, tz) {
    var out = [];
    INGRESS.forEach(function (b) {
      for (var i = 1; i < S.ts.length; i++) {
        if (S.ts[i] < w0 || S.ts[i - 1] >= w1) continue;
        var s0 = Math.floor(S.rows[i - 1][b] / 30), s1 = Math.floor(S.rows[i][b] / 30);
        if (s0 === s1) continue;
        var back = sdiff(S.rows[i][b], S.rows[i - 1][b]) < 0, edge = (back ? s0 : s1) * 30;
        var t = solve(function (x) { return sdiff(at(x)[b], edge); }, S.ts[i - 1], S.ts[i], HOUR);
        if (t >= w0 && t < w1) out.push({ body: b, at: when(t, tz), signIdx: s1, back: back });
      }
    });
    return out.sort(function (x, y) { return x.at.ms - y.at.ms; });
  }
  function lunationsOf(at, S, natal, w0, w1, tz) {
    var out = [];
    for (var i = 1; i < S.ts.length; i++) {
      if (S.ts[i] < w0 || S.ts[i - 1] >= w1) continue;
      var e0 = norm(S.rows[i - 1].Moon - S.rows[i - 1].Sun), e1 = norm(S.rows[i].Moon - S.rows[i].Sun), kind = null, off = 0;
      if (e0 > 300 && e1 < 60) kind = 'new';
      else if (e0 < 180 && e1 >= 180) { kind = 'full'; off = 180; }
      if (!kind) continue;
      var t = solve(function (x) { var p = at(x); return sdiff(p.Moon, p.Sun + off); }, S.ts[i - 1], S.ts[i], HOUR);
      if (t < w0 || t >= w1) continue;
      var lon = at(t).Moon;
      out.push({ kind: kind, at: when(t, tz), lon: round1(lon), signIdx: Math.floor(lon / 30), house: houseOf(lon, natal.cusps) });
    }
    return out;
  }
  function eclipsesOf(natal, w0, w1, tz) {
    return ECLIPSES.map(function (e) { return { ms: Date.parse(e[0] + ':00Z'), kind: e[1], type: e[2], lon: e[3] }; })
      .filter(function (e) { return e.ms >= w0 && e.ms < w1; })
      .map(function (e) {
        var hits = [];
        YEAR_TARGETS.forEach(function (nb) {
          var N = natal.points[nb];
          if (N == null) return;
          var d = gap(e.lon, N);
          if (d <= ORB) hits.push({ natal: nb, type: 'conjunction', orb: round1(d) });
          else if (180 - d <= ORB) hits.push({ natal: nb, type: 'opposition', orb: round1(180 - d) });
        });
        return { kind: e.kind, type: e.type, at: when(e.ms, tz), lon: e.lon, signIdx: Math.floor(e.lon / 30), house: houseOf(e.lon, natal.cusps), hits: hits };
      });
  }
  function retroPeriodsOf(stations, w0, w1) {
    var out = [];
    MOVING.forEach(function (b) {
      var list = stations.filter(function (s) { return s.body === b; });
      list.forEach(function (s, i) {
        if (s.kind !== 'retrograde') return;
        var d = list[i + 1];
        if (!d || d.at.ms < w0 || s.at.ms >= w1) return;
        out.push({ body: b, start: s.at, end: d.at, signIdx: s.signIdx, endSignIdx: d.signIdx });
      });
    });
    return out.sort(function (x, y) { return x.start.ms - y.start.ms; });
  }
  function period(natal, opts) {
    opts = opts || {};
    var tz = tzOf(opts), day = parseDay(opts.today), months = opts.months > 0 ? Math.floor(opts.months) : 12;
    if (!day) throw new Error('AstroTransits.period: opts.today must be YYYY-MM-DD');
    var at = memo(opts.lonsAt), w0 = dayStart(day, tz), w1 = dayStart(day, tz, months);
    var S = sampleRange(at, w0 - 400 * DAY, w1 + 400 * DAY);
    var stations = stationsOf(at, S, tz);
    var events = transitEvents(at, S, natal, w0, w1, tz);
    var top = events.slice().sort(function (x, y) { return y.rank - x.rank || x.peak.ms - y.peak.ms || x.order - y.order; });
    return {
      from: when(w0, tz).date, to: when(w1 - DAY, tz).date, tz: tz, timeKnown: natal.timeKnown,
      events: events.map(strip),
      top: top.slice(0, 5).map(strip),
      stations: stations.filter(function (s) { return s.at.ms >= w0 && s.at.ms < w1; }),
      retroPeriods: retroPeriodsOf(stations, w0, w1),
      ingresses: ingressesOf(at, S, w0, w1, tz),
      lunations: lunationsOf(at, S, natal, w0, w1, tz),
      eclipses: eclipsesOf(natal, w0, w1, tz)
    };
  }
  function strip(e) { var c = {}; Object.keys(e).forEach(function (k) { if (k !== 'order') c[k] = e[k]; }); return c; }

  root.AstroTransits = {
    natalOf: natalOf,
    lonsFromChart: lonsFromChart,
    today: today,
    period: period,
    _calc: { BODIES: BODIES, ECLIPSES: ECLIPSES, ORB: ORB, PHASES: PHASES, sdiff: sdiff, houseOf: houseOf, when: when, solve: solve }
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* 운명 구조도(Destiny Anatomy) 결정론 엔진 — 무료 사주 결과 안의 섹션.
 *
 * 🔴 계산하지 않고 읽는다. 사주 정본은 정적 셸 전역(G_PILLARS·G_POWER·G_JONG·G_JOHU·G_NATAL)과
 *    js/saju-engine.js 의 GAN·JI·CD_JANGGAN·CD_JANGGAN_WEIGHT·getTenGod 이다. 사본 테이블을 두지 않는다.
 *    휴먼 디자인·베다는 기존 워커 응답(/api/human-design/chart, /api/vedic-ai/basis)을 그대로 받는다.
 * 새로 만드는 값은 네 가지뿐이다: 5대 사고 엔진 가중 점수, 오행 레이어 정리, 차크라 상징 매핑, 융합 규칙.
 * 출력은 문장이 아니라 키다. 문장은 copy.js 가 로케일별로 채운다(compose).
 *
 * 브라우저: window.DestinyAnatomyEngine. 테스트: vm 컨텍스트에 셸 테이블을 먼저 올린 뒤 이 파일을 실행한다. */
(function (root) {
  'use strict';

  var VERSION = '1';
  // 켜고 끄는 플래그는 boot.js 가 정본이다 — 꺼진 호스트는 이 파일을 내려받지도 않는다.

  var AXES = ['selfDrive', 'expression', 'reality', 'structure', 'reflection'];
  var GOD_AXIS = {
    '비견': 'selfDrive', '겁재': 'selfDrive',
    '식신': 'expression', '상관': 'expression',
    '편재': 'reality', '정재': 'reality',
    '편관': 'structure', '정관': 'structure',
    '편인': 'reflection', '정인': 'reflection'
  };
  var GOD_HAN = {'비견':'比肩', '겁재':'劫財', '식신':'食神', '상관':'傷官', '편재':'偏財', '정재':'正財', '편관':'偏官', '정관':'正官', '편인':'偏印', '정인':'正印'};
  // 위치 가중 — 정본은 js/saju-engine.js renderSkillTree 의 위치 가중과 같은 값이다(일간 자리는 제외).
  var STEM_WEIGHT = {y: 0.7, m: 1.4, h: 1.0};
  var BRANCH_WEIGHT = {y: 0.8, m: 2.0, d: 1.1, h: 0.9};
  var ROOTED_BOOST = 1.2;   // 천간이 지지에 뿌리를 두었거나(통근) 지장간이 천간에 드러났을 때(투간)
  var SEASON_BOOST = 1.25;  // 월령 — 월지 정기와 같은 계열의 십성
  var BALANCED_MAX_SHARE = 0.26;
  var SECOND_MIN_SHARE = 0.12;
  var ELEMENTS = ['wood', 'fire', 'earth', 'metal', 'water'];

  // 베다 basis 응답 역매핑용. 정본: worker/lib/vedic-derived-calculations.js SIGNS·SIGNS_KO·NAKSHATRAS(테스트가 일치를 단언한다).
  var SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  var SIGNS_KO = ['양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리', '천칭자리', '전갈자리', '사수자리', '염소자리', '물병자리', '물고기자리'];
  var SIGN_ELEMENT = ['fire', 'earth', 'air', 'water'];
  var NAKSHATRA_LORD = {
    'Ashwini':'Ketu', 'Bharani':'Venus', 'Krittika':'Sun', 'Rohini':'Moon', 'Mrigashira':'Mars', 'Ardra':'Rahu', 'Punarvasu':'Jupiter',
    'Pushya':'Saturn', 'Ashlesha':'Mercury', 'Magha':'Ketu', 'Purva Phalguni':'Venus', 'Uttara Phalguni':'Sun', 'Hasta':'Moon',
    'Chitra':'Mars', 'Swati':'Rahu', 'Vishakha':'Jupiter', 'Anuradha':'Saturn', 'Jyeshtha':'Mercury', 'Mula':'Ketu',
    'Purva Ashadha':'Venus', 'Uttara Ashadha':'Sun', 'Shravana':'Moon', 'Dhanishta':'Mars', 'Shatabhisha':'Rahu',
    'Purva Bhadrapada':'Jupiter', 'Uttara Bhadrapada':'Saturn', 'Revati':'Mercury'
  };

  var HD_TYPES = ['TYPE_GENERATOR', 'TYPE_MANIFESTING_GENERATOR', 'TYPE_PROJECTOR', 'TYPE_MANIFESTOR', 'TYPE_REFLECTOR'];
  var HD_AUTHORITIES = ['AUTHORITY_EMOTIONAL', 'AUTHORITY_SACRAL', 'AUTHORITY_SPLENIC', 'AUTHORITY_EGO', 'AUTHORITY_SELF_PROJECTED', 'AUTHORITY_MENTAL', 'AUTHORITY_LUNAR'];
  var HD_CENTERS = ['HEAD', 'AJNA', 'THROAT', 'G', 'HEART', 'SOLAR_PLEXUS', 'SACRAL', 'SPLEEN', 'ROOT'];

  // 차크라 ↔ 사주 상징 매핑. HD 센터와 같은 것이 아니며, 건강 판정이 아니라 주제 연결이다.
  var CHAKRAS = [
    {id: 'crown', axis: 'structure', element: null},
    {id: 'thirdEye', axis: 'reflection', element: 'water'},
    {id: 'throat', axis: 'expression', element: 'metal'},
    {id: 'heart', axis: null, element: 'wood'},
    {id: 'solarPlexus', axis: 'selfDrive', element: 'fire'},
    {id: 'sacral', axis: 'expression', element: 'water'},
    {id: 'root', axis: 'reality', element: 'earth'}
  ];

  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function round(n) { return Math.round(n); }
  function round3(n) { return Math.round(n * 1000) / 1000; }

  function tablesFrom(scope) {
    var s = scope || root;
    if (!s || !s.GAN || !s.JI || !s.CD_JANGGAN || typeof s.getTenGod !== 'function') return null;
    return {GAN: s.GAN, JI: s.JI, JANGGAN: s.CD_JANGGAN, LAYER_WEIGHT: s.CD_JANGGAN_WEIGHT || {여기: 0.35, 중기: 0.65, 정기: 1.2}, tenGod: s.getTenGod};
  }

  /* 셸 전역 → 읽기 전용 정규화 스냅샷. 출생시간 미상이면 시주를 버린다(셸이 정오로 가정한 시주를 쓰지 않는다). */
  function adaptShellSnapshot(scope) {
    var s = scope || root;
    var p = s.G_PILLARS;
    if (!p || !p.d || !p.d.g || !p.m || !p.y) return null;
    var unknown = s.__cdSajuTimeUnknown === true;
    function pillar(x) { return x && x.g && x.j ? {g: x.g, j: x.j} : null; }
    var power = s.G_POWER || null, jong = s.G_JONG || null, johu = s.G_JOHU || null, natal = s.G_NATAL || null;
    return {
      pillars: {y: pillar(p.y), m: pillar(p.m), d: pillar(p.d), h: unknown ? null : pillar(p.h)},
      timeUnknown: unknown,
      power: power ? {
        isStrong: power.isStrong === true, score: Number(power.score) || 0,
        yongshin: (power.yongshin || []).slice(), kijishin: (power.kijishin || []).slice()
      } : null,
      jong: jong && jong.isJong ? {isJong: true, dominant: jong.dominant || null} : {isJong: false},
      johu: johu ? {type: johu.type || null} : null,
      natalRatios: natal && natal.ratios ? Object.assign({}, natal.ratios) : null,
      luck: readCurrentLuck(s, unknown)
    };
  }

  /* 지금 지나는 대운 1칸 — 셸이 무료로 보여 주는 "현재 대운"과 같은 값이다(전체 대운표는 유료라 읽지 않는다).
     칸은 renderDaewun 이 채운 G_DAEWUN, 길흉 점수는 셸 evalDaewun(조후·억부·충합 반영) 그대로. 출생시간 미상이면 셸도 대운을 비운다. */
  function readCurrentLuck(s, unknown) {
    if (unknown || !Array.isArray(s.G_DAEWUN) || typeof s.evalDaewun !== 'function') return null;
    var age = Number(s.CURRENT_AGE) || 0, cur = null;
    s.G_DAEWUN.forEach(function (row) {
      if (row && row.g && row.j && Number(row.age) <= age && (!cur || Number(row.age) >= Number(cur.age))) cur = row;
    });
    if (!cur) return null;
    var ev = s.evalDaewun(cur.g, cur.j);
    if (!ev || !isFinite(Number(ev.score))) return null;
    return {g: cur.g, j: cur.j, startYear: Number(cur.startYear) || null, endYear: Number(cur.endYear) || null,
      score: Number(ev.score), chungPenalty: ev.hasChungPenalty === true};
  }

  /* 오행 레이어. 셸 정본(calcNatalElement: 8글자 + 월지 1회 더) 비율을 그대로 쓴다.
     시간 미상일 때만 같은 규칙으로 시주를 뺀 비율을 다시 센다 — 정오 가정 시주가 섞이지 않게. */
  function computeElementLayer(snap, tables) {
    var ratios = null;
    if (!snap.timeUnknown && snap.natalRatios) ratios = snap.natalRatios;
    else {
      var T = tables, p = snap.pillars, cnt = {wood: 0, fire: 0, earth: 0, metal: 0, water: 0};
      ['y', 'm', 'd', 'h'].forEach(function (k) {
        if (!p[k]) return;
        var g = T.GAN[p[k].g], j = T.JI[p[k].j];
        if (g && g.e) cnt[g.e]++;
        if (j && j.e) cnt[j.e]++;
      });
      if (T.JI[p.m.j]) cnt[T.JI[p.m.j].e]++;
      var total = ELEMENTS.reduce(function (a, e) { return a + cnt[e]; }, 0) || 1;
      ratios = {};
      ELEMENTS.forEach(function (e) { ratios[e] = cnt[e] / total * 100; });
    }
    var out = {}, dominant = ELEMENTS[0], weakest = ELEMENTS[0];
    ELEMENTS.forEach(function (e) {
      out[e] = round(Number(ratios[e]) || 0);
      if (out[e] > out[dominant]) dominant = e;
      if (out[e] < out[weakest]) weakest = e;
    });
    return {ratios: out, dominant: dominant, weakest: weakest, missing: ELEMENTS.filter(function (e) { return out[e] === 0; })};
  }

  /* 사주 Brain — rawTenGodStrength 를 먼저 구하고 5대 축으로 정규화한다. 단순 개수가 아니다.
     천간: 위치 가중 × (통근이면 1.2). 지지: 위치 가중을 지장간 층 가중 비율로 나눠 싣고 × (투간이면 1.2).
     월령: 월지 정기와 같은 계열이면 × 1.25. 신강·신약과 용신은 점수를 바꾸지 않는다(과부하 패턴 선택에만 쓴다). */
  function computeSajuBrain(snap, tables) {
    var T = tables, p = snap.pillars, dg = p.d.g;
    var stems = [], branches = [];
    ['y', 'm', 'd', 'h'].forEach(function (k) {
      if (!p[k]) return;
      stems.push({pos: k, c: p[k].g});
      branches.push({pos: k, c: p[k].j});
    });
    var otherStems = stems.filter(function (s) { return s.pos !== 'd'; }).map(function (s) { return s.c; });
    var hiddenByBranch = branches.map(function (b) { return T.JANGGAN[b.c] || []; });
    var allHidden = [].concat.apply([], hiddenByBranch);
    var monthMain = (T.JANGGAN[p.m.j] || []).slice(-1)[0];
    var seasonAxis = monthMain ? GOD_AXIS[T.tenGod(dg, monthMain)] : null;

    var raw = {}, gods = {}, contributions = [];
    AXES.forEach(function (a) { raw[a] = 0; });
    function add(god, w, where) {
      var axis = GOD_AXIS[god];
      if (!axis) return;
      if (axis === seasonAxis) w *= SEASON_BOOST;
      raw[axis] += w;
      gods[god] = (gods[god] || 0) + w;
      contributions.push({god: god, axis: axis, where: where, weight: round3(w)});
    }

    stems.forEach(function (s) {
      if (s.pos === 'd') return;
      var el = T.GAN[s.c] && T.GAN[s.c].e;
      var rooted = allHidden.some(function (h) { return T.GAN[h] && T.GAN[h].e === el; });
      add(T.tenGod(dg, s.c), STEM_WEIGHT[s.pos] * (rooted ? ROOTED_BOOST : 1), s.pos + 'g');
    });
    branches.forEach(function (b, i) {
      var list = hiddenByBranch[i];
      if (!list.length) return;
      var layers = list.map(function (g, idx) {
        var layer = idx === list.length - 1 ? '정기' : (idx === 0 ? '여기' : '중기');
        return {g: g, w: T.LAYER_WEIGHT[layer] || 0.35, layer: layer};
      });
      var sum = layers.reduce(function (a, l) { return a + l.w; }, 0) || 1;
      layers.forEach(function (l) {
        var exposed = otherStems.indexOf(l.g) >= 0;
        add(T.tenGod(dg, l.g), BRANCH_WEIGHT[b.pos] * (l.w / sum) * (exposed ? ROOTED_BOOST : 1), b.pos + 'j:' + l.layer);
      });
    });

    var total = AXES.reduce(function (a, k) { return a + raw[k]; }, 0) || 1;
    var max = Math.max.apply(null, AXES.map(function (k) { return raw[k]; })) || 1;
    var ranked = AXES.slice().sort(function (a, b) { return (raw[b] - raw[a]) || (AXES.indexOf(a) - AXES.indexOf(b)); });
    var engines = {};
    AXES.forEach(function (k) {
      var share = raw[k] / total;
      engines[k] = {
        score: round(raw[k] / max * 100),
        share: round3(share),
        raw: round3(raw[k]),
        level: share >= 0.30 ? 'dominant' : share >= 0.22 ? 'strong' : share >= SECOND_MIN_SHARE ? 'moderate' : 'light',
        rank: ranked.indexOf(k) + 1,
        source: Object.keys(GOD_HAN).filter(function (g) { return GOD_AXIS[g] === k && gods[g] > 0; })
          .sort(function (a, b) { return gods[b] - gods[a]; }).map(function (g) { return GOD_HAN[g]; })
      };
    });
    var balanced = engines[ranked[0]].share < BALANCED_MAX_SHARE;
    var dominantEngines = balanced ? [] : ranked.slice(0, engines[ranked[1]].share >= SECOND_MIN_SHARE ? 2 : 1);
    var secondaryEngines = ranked.filter(function (k) {
      return dominantEngines.indexOf(k) < 0 && engines[k].share >= 0.15;
    }).slice(0, balanced ? 3 : 1);

    var strong = snap.power ? snap.power.isStrong : null;
    var over = [];
    AXES.forEach(function (k) {
      var sh = engines[k].share;
      var tilt = strong === true ? (k === 'selfDrive' || k === 'reflection') : strong === false ? (k === 'expression' || k === 'reality' || k === 'structure') : false;
      if (sh >= 0.30 || (tilt && sh >= 0.22)) over.push(k);
    });
    over.sort(function (a, b) { return engines[b].share - engines[a].share; });

    return {
      engines: engines,
      ranked: ranked,
      balanced: balanced,
      dominantEngines: dominantEngines,
      secondaryEngines: secondaryEngines,
      topThoughts: (dominantEngines.length ? dominantEngines.concat(secondaryEngines) : secondaryEngines).slice(0, 3),
      strengths: ranked.slice(0, 2),
      overloadPatterns: over.slice(0, 2),
      seasonAxis: seasonAxis,
      contributions: contributions
    };
  }

  /* 상위 2개 엔진 조합. 10쌍 모두 copy 에 있다. 원국 전체와 상충하면 톤을 바꾼다:
     신약인데 일간을 쓰는 축(식상·재성·관성)이 1위면 strained("재다신약" 등 — '만들어서 돈으로' 단정 금지),
     신강인데 일간을 돕는 축(비겁·인성)이 지배적이면 surplus. */
  function pickCombo(brain, snap) {
    if (brain.balanced) return {key: 'balanced', axes: brain.ranked.slice(0, 3), tone: 'base'};
    var a = brain.dominantEngines[0], b = brain.dominantEngines[1];
    var strong = snap && snap.power ? snap.power.isStrong : null;
    var topShare = brain.engines[a].share;
    var tone = 'base';
    if (strong === false && (a === 'expression' || a === 'reality' || a === 'structure') && topShare >= BALANCED_MAX_SHARE) tone = 'strained';
    else if (strong === true && (a === 'selfDrive' || a === 'reflection') && topShare >= 0.30) tone = 'surplus';
    if (!b) return {key: 'solo:' + a, axes: [a], tone: tone};
    var pair = [a, b].sort(function (x, y) { return AXES.indexOf(x) - AXES.indexOf(y); });
    return {key: pair.join('+'), axes: [a, b], tone: tone};
  }

  /* 차크라 — 상징 매핑. 축 점수(0-100)와 오행 비율(최대 대비 0-100)의 평균. HD 가 있으면 함께 보기용 센터 연결만 붙인다. */
  function computeChakra(brain, elements) {
    var maxEl = Math.max.apply(null, ELEMENTS.map(function (e) { return elements.ratios[e]; })) || 1;
    var items = CHAKRAS.map(function (c) {
      var parts = [], sources = [];
      if (c.axis) { parts.push(brain.engines[c.axis].score); sources.push('saju:' + c.axis); }
      if (c.element) { parts.push(elements.ratios[c.element] / maxEl * 100); sources.push('element:' + c.element); }
      var v = round(parts.reduce(function (a, x) { return a + x; }, 0) / parts.length);
      return {id: c.id, emphasis: v, level: v >= 70 ? 'bright' : v >= 40 ? 'steady' : 'quiet', sources: sources};
    });
    return {available: true, symbolic: true, items: items};
  }

  /* 휴먼 디자인 — 워커 HdChart 를 그대로 받아 정본 키만 고른다. 알 수 없는 키가 오면 그 값은 버린다(placeholder 금지). */
  function adaptHumanDesign(chart) {
    if (!chart || HD_TYPES.indexOf(chart.type) < 0 || HD_AUTHORITIES.indexOf(chart.authority) < 0) return {available: false};
    var defined = (chart.definedCenters || []).filter(function (c) { return HD_CENTERS.indexOf(c) >= 0; });
    return {
      available: true,
      type: chart.type,
      strategy: String(chart.strategy || ''),
      authority: chart.authority,
      profile: /^[1-6]\/[1-6]$/.test(String(chart.profile || '')) ? String(chart.profile) : '',
      definition: String(chart.definition || ''),
      definedCenters: defined,
      undefinedCenters: HD_CENTERS.filter(function (c) { return defined.indexOf(c) < 0; }),
      channels: (chart.channels || []).map(function (c) { return c && c.channelId; }).filter(Boolean),
      gates: (chart.activeGates || []).filter(function (g) { return Number.isInteger(g) && g >= 1 && g <= 64; })
    };
  }

  /* 베다 — /api/vedic-ai/basis 의 core 그룹 표시값을 정본 목록으로 역매핑한다. 못 읽으면 그 항목은 비운다. */
  function adaptVedicBasis(payload) {
    var groups = payload && Array.isArray(payload.groups) ? payload.groups : [];
    var core = groups.filter(function (g) { return g && g.key === 'core'; })[0];
    var items = core && Array.isArray(core.items) ? core.items : [];
    function valueOf(label) {
      var it = items.filter(function (x) { return x && x.label === label; })[0];
      return it ? String(it.value || '') : '';
    }
    function signFrom(text) {
      for (var i = 0; i < SIGNS_KO.length; i++) if (text.indexOf(SIGNS_KO[i]) === 0) return i;
      for (var j = 0; j < SIGNS.length; j++) if (text.indexOf(SIGNS[j]) >= 0) return j;
      return -1;
    }
    var lagna = signFrom(valueOf('라그나'));
    var moon = signFrom(valueOf('달의 라시'));
    var nakText = valueOf('나크샤트라').split(' · ')[0].trim();
    var nak = has(NAKSHATRA_LORD, nakText) ? nakText : '';
    if (moon < 0 && !nak) return {available: false};
    var traits = [];
    if (moon >= 0) traits.push({kind: 'emotion', key: SIGN_ELEMENT[moon % 4]});
    if (nak) traits.push({kind: 'instinct', key: NAKSHATRA_LORD[nak]});
    if (lagna >= 0) traits.push({kind: 'frame', key: SIGN_ELEMENT[lagna % 4]});
    return {
      available: true,
      lagna: lagna >= 0 ? SIGNS[lagna] : '',
      moonSign: moon >= 0 ? SIGNS[moon] : '',
      nakshatra: nak,
      traits: traits
    };
  }

  /* 융합 규칙 — 같은 체계처럼 섞지 않고 공통(common)·보완(complement)·긴장(tension)만 찾는다. 최대 3개.
     slot: thinking(생각의 기본 방식) · decision(결정 방식) · people(사람·일·돈). */
  var AUTHORITY_RULES = {
    AUTHORITY_EMOTIONAL: {tension: ['reality', 'expression', 'selfDrive'], common: ['reflection', 'structure']},
    AUTHORITY_SACRAL: {tension: ['reflection', 'structure'], common: ['expression', 'selfDrive', 'reality']},
    AUTHORITY_SPLENIC: {tension: ['reflection'], common: ['reality', 'expression']},
    AUTHORITY_EGO: {tension: ['reflection'], common: ['selfDrive', 'reality']},
    AUTHORITY_SELF_PROJECTED: {tension: ['structure'], common: ['selfDrive', 'expression']},
    AUTHORITY_MENTAL: {tension: ['selfDrive'], common: ['reflection', 'structure']},
    AUTHORITY_LUNAR: {tension: ['reality', 'selfDrive'], common: ['reflection']}
  };
  var TYPE_RULES = {
    TYPE_GENERATOR: {tension: ['selfDrive'], common: ['structure', 'reality']},
    TYPE_MANIFESTING_GENERATOR: {tension: ['reflection'], common: ['expression', 'selfDrive']},
    TYPE_PROJECTOR: {tension: ['selfDrive', 'reality'], common: ['reflection', 'structure']},
    TYPE_MANIFESTOR: {tension: ['structure'], common: ['selfDrive', 'expression']},
    TYPE_REFLECTOR: {tension: ['selfDrive', 'structure'], common: ['reflection']}
  };
  function relation(rule, axis) {
    if (!rule || !axis) return 'complement';
    if (rule.tension.indexOf(axis) >= 0) return 'tension';
    if (rule.common.indexOf(axis) >= 0) return 'common';
    return 'complement';
  }

  function computeFusion(brain, combo, hd, vedic) {
    var top = brain.balanced ? brain.ranked[0] : brain.dominantEngines[0];
    var second = brain.balanced ? brain.ranked[1] : (brain.dominantEngines[1] || brain.ranked[1]);
    var insights = [{slot: 'thinking', badge: 'saju', key: combo.key, tone: combo.tone}];
    var tensions = [], strengths = brain.strengths.slice();
    var decision, people;
    if (hd && hd.available) {
      var dRel = relation(AUTHORITY_RULES[hd.authority], top);
      decision = {slot: 'decision', badge: 'fusion', key: hd.authority + '|' + top, relation: dRel, authority: hd.authority, axis: top};
      var pRel = relation(TYPE_RULES[hd.type], top);
      people = {slot: 'people', badge: 'fusion', key: hd.type + '|' + top, relation: pRel, type: hd.type, axis: top};
      if (dRel === 'tension') tensions.push(decision.key);
      if (pRel === 'tension') tensions.push(people.key);
    } else {
      decision = {slot: 'decision', badge: 'saju', key: 'decision|' + top, axis: top};
      people = {slot: 'people', badge: 'saju', key: 'people|' + (second || top), axis: second || top};
    }
    insights.push(decision, people);
    var emotion = vedic && vedic.available ? vedic.traits.filter(function (t) { return t.kind === 'emotion'; })[0] : null;
    return {
      insights: insights.slice(0, 3),
      tensions: tensions,
      strengths: strengths,
      mindPattern: {thinking: top, second: second, decision: hd && hd.available ? hd.authority : null, energy: hd && hd.available ? hd.type : null, emotion: emotion ? emotion.key : null},
      decisionPattern: hd && hd.available ? hd.authority : 'saju:' + top,
      workPattern: 'work|' + top,
      moneyPattern: 'money|' + (brain.engines.reality.rank <= 2 ? 'reality' : top),
      relationshipPattern: 'relationship|' + (second || top)
    };
  }

  /* 지문 — 캐시 키 재료. 개인정보(이름·생년월일·시각·장소)는 넣지 않는다. 기둥 글자·시간 미상·HD/베다 결과 키·엔진 버전뿐. */
  /* 대운 오버레이 — 타고난 5대 엔진 점수는 바꾸지 않는다. 대운 천간·지지 정기의 십성이 켜는 회로와,
     셸 길흉 점수(evalDaewun: 60↑ 도움 / 40↓ 조절)를 순풍·고른·맞바람 세 갈래로만 옮긴다. */
  var LUCK_TAILWIND = 60, LUCK_HEADWIND = 40;
  function computeLuck(snap, tables, brain) {
    var l = snap.luck;
    if (!l) return {available: false};
    var T = tables, dg = snap.pillars.d.g;
    var stemAxis = GOD_AXIS[T.tenGod(dg, l.g)] || null;
    var main = (T.JANGGAN[l.j] || []).slice(-1)[0];
    var branchAxis = main ? GOD_AXIS[T.tenGod(dg, main)] || null : null;
    var axes = [stemAxis, branchAxis].filter(function (a, i, arr) { return a && arr.indexOf(a) === i; });
    if (!axes.length) return {available: false};
    var tone = l.score >= LUCK_TAILWIND ? 'tailwind' : l.score < LUCK_HEADWIND ? 'headwind' : 'steady';
    return {
      available: true, tone: tone, score: l.score, axes: axes, stemAxis: stemAxis, branchAxis: branchAxis,
      doubled: stemAxis && stemAxis === branchAxis,
      // 원래 과한 회로에 대운이 겹치면 순풍이어도 과열 쪽으로 읽는다.
      overheat: axes.filter(function (a) { return brain.overloadPatterns.indexOf(a) >= 0; }),
      ganzhi: l.g + l.j, startYear: l.startYear, endYear: l.endYear, chungPenalty: l.chungPenalty
    };
  }

  /* 밈 뇌구조 — 왼쪽을 보는 옆얼굴(viewBox 360×300) 안 두개골 자리에 모서리가 둥근 뇌 상자를 두고,
   * 그 상자를 엔진 비율대로 나눈다(squarified treemap). 칸 넓이 = 상자 넓이 × share(양수 비율 합으로 정규화) — 상자는
   * 깎이지 않으므로 넓이가 그대로 맞고, 둥근 모서리·칸 간격은 그림에서만 생긴다. 비율 0 엔진은 칸이 없다(빈칸·가짜 칸 금지).
   * 퍼센트는 최대 나머지 방식으로 합 100. 머리 윤곽은 자체 디자인(이마·코·입술·턱·목·뒷머리). */
  var MEME_VIEW = '0 0 360 300';
  var MEME_BOX = {x: 96, y: 54, w: 204, h: 142, r: 30};
  var MEME_HEAD = 'M128 300L126 262C104 258 78 252 66 240C58 232 60 222 62 216C54 214 50 208 54 202C48 198 48 192 54 188' +
    'C46 186 38 182 36 176C34 170 44 160 50 152C54 140 56 128 58 116C62 56 120 18 190 18C270 18 336 66 334 138' +
    'C332 190 306 222 290 236C282 256 280 280 282 300Z';
  var MEME_EAR = 'M226 224C222 210 232 200 244 204C256 208 254 228 244 234C238 238 232 236 230 230';
  var MEME_EYE = 'M68 150C73 156 81 156 86 150';
  var MEME_CHEEK = {cx: 86, cy: 208, r: 9};
  // 칸은 외곽선 안쪽 5 만큼 들어간 상자에 깐다 — 위·아래·옆 칸이 같은 여백을 갖고 외곽선에 묻히지 않는다.
  var MEME_PAD = 5;
  var MEME_INNER = {x: MEME_BOX.x + MEME_PAD, y: MEME_BOX.y + MEME_PAD, w: MEME_BOX.w - 2 * MEME_PAD, h: MEME_BOX.h - 2 * MEME_PAD, r: MEME_BOX.r - MEME_PAD};
  function percents(values) {
    var total = values.reduce(function (a, v) { return a + v; }, 0);
    if (!total) return values.map(function () { return 0; });
    var exact = values.map(function (v) { return v / total * 100; });
    var out = exact.map(Math.floor);
    var left = 100 - out.reduce(function (a, v) { return a + v; }, 0);
    exact.map(function (v, i) { return {i: i, r: v - Math.floor(v)}; })
      .sort(function (a, b) { return (b.r - a.r) || (a.i - b.i); })
      .slice(0, left).forEach(function (x) { out[x.i] += 1; });
    return out;
  }
  function squarify(areas, box) {
    var out = [], rect = {x: box.x, y: box.y, w: box.w, h: box.h}, row = [], rest = areas.slice();
    function worst(r, side) {
      var s = r.reduce(function (a, v) { return a + v; }, 0);
      return Math.max.apply(null, r.map(function (v) { return Math.max(side * side * v / (s * s), s * s / (side * side * v)); }));
    }
    function lay(r) {
      var s = r.reduce(function (a, v) { return a + v; }, 0);
      if (rect.w >= rect.h) {
        var cw = s / rect.h, y = rect.y;
        r.forEach(function (v) { out.push({x: rect.x, y: y, w: cw, h: v / cw}); y += v / cw; });
        rect.x += cw; rect.w -= cw;
      } else {
        var rh = s / rect.w, x = rect.x;
        r.forEach(function (v) { out.push({x: x, y: rect.y, w: v / rh, h: rh}); x += v / rh; });
        rect.y += rh; rect.h -= rh;
      }
    }
    while (rest.length) {
      var side = Math.min(rect.w, rect.h);
      if (!row.length || worst(row.concat(rest[0]), side) <= worst(row, side)) row.push(rest.shift());
      else { lay(row); row = []; }
    }
    if (row.length) lay(row);
    return out;
  }
  function memeBrain(brain) {
    var axes = brain.ranked.filter(function (k) { return brain.engines[k].share > 0; });
    var shares = axes.map(function (k) { return brain.engines[k].share; });
    var total = shares.reduce(function (a, v) { return a + v; }, 0);
    var pct = percents(shares);
    var area = MEME_INNER.w * MEME_INNER.h;
    var rects = total ? squarify(shares.map(function (v) { return v / total * area; }), MEME_INNER) : [];
    var r2 = function (n) { return Math.round(n * 100) / 100; };
    return {
      viewBox: MEME_VIEW, head: MEME_HEAD, ear: MEME_EAR, eye: MEME_EYE, cheek: MEME_CHEEK, box: MEME_BOX, inner: MEME_INNER,
      cells: axes.map(function (k, i) {
        var c = rects[i];
        // 처음 고르는 칸 글자 단계 — 화면에서는 실제 글자 넘침을 재서 한 단계씩 낮춘다(render.fitMeme).
        var tier = c.w >= 40 && c.h >= 40 ? 'full' : c.w >= 22 && c.h >= 22 ? 'mid' : 'dot';
        return {axis: k, share: shares[i] / total, pct: pct[i], x: r2(c.x), y: r2(c.y), w: r2(c.w), h: r2(c.h), tier: tier};
      })
    };
  }

  function fingerprint(snap, hd, vedic) {
    var p = snap.pillars;
    var parts = [VERSION, ['y', 'm', 'd', 'h'].map(function (k) { return p[k] ? p[k].g + p[k].j : '--'; }).join(''), snap.timeUnknown ? 'tu' : 'tk',
      snap.power ? (snap.power.isStrong ? 'S' : 'W') + snap.power.yongshin.join('') : '-', snap.jong && snap.jong.isJong ? 'J' : '-',
      hd && hd.available ? [hd.type, hd.authority, hd.profile, hd.definedCenters.join('.')].join(':') : 'nohd',
      vedic && vedic.available ? [vedic.lagna, vedic.moonSign, vedic.nakshatra].join(':') : 'nov',
      snap.luck ? snap.luck.g + snap.luck.j + ':' + snap.luck.score : 'nol'];
    var s = parts.join('|'), h1 = 0x811c9dc5, h2 = 0x01000193;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
      h2 = Math.imul(h2 ^ c, 2246822519) >>> 0;
    }
    return 'da' + VERSION + '-' + ('0000000' + h1.toString(16)).slice(-8) + ('0000000' + h2.toString(16)).slice(-8);
  }

  /* 요청서 §28 스키마. 문장 필드는 copy.compose(model, lang) 가 채운다 — copy 가 없으면 키 그대로 둔다. */
  function buildDestinyAnatomy(input) {
    var opts = input || {};
    var tables = opts.tables || tablesFrom(opts.scope);
    var snap = opts.snapshot || adaptShellSnapshot(opts.scope);
    if (!tables || !snap) return null;
    var brain = computeSajuBrain(snap, tables);
    var elements = computeElementLayer(snap, tables);
    var combo = pickCombo(brain, snap);
    var hd = snap.timeUnknown ? {available: false, reason: 'time-unknown'} : adaptHumanDesign(opts.hdChart);
    var vedic = adaptVedicBasis(opts.vedicBasis);
    var chakra = computeChakra(brain, elements);
    var luck = computeLuck(snap, tables, brain);
    var fusion = computeFusion(brain, combo, hd, vedic);
    var brainScores = {};
    AXES.forEach(function (k) { brainScores[k] = brain.engines[k].score; });
    var model = {
      version: VERSION,
      fingerprint: fingerprint(snap, hd, vedic),
      timeUnknown: snap.timeUnknown,
      strength: snap.power ? (snap.power.isStrong ? 'strong' : 'weak') : null,
      jong: !!(snap.jong && snap.jong.isJong),
      saju: {
        brain: brainScores,
        engines: brain.engines,
        ranked: brain.ranked,
        balanced: brain.balanced,
        dominantEngines: brain.dominantEngines,
        secondaryEngines: brain.secondaryEngines,
        topThoughts: brain.topThoughts,
        combo: combo,
        brainHeadline: '',
        brainDescription: '',
        strengths: brain.strengths,
        overloadPatterns: brain.overloadPatterns,
        meme: memeBrain(brain)
      },
      luck: luck,
      fiveElements: elements.ratios,
      elementLayer: elements,
      humanDesign: hd,
      vedic: vedic,
      chakra: chakra,
      fusion: {
        headline: '', summary: '',
        strengths: fusion.strengths, tensions: fusion.tensions, insights: fusion.insights,
        mindPattern: fusion.mindPattern,
        decisionPattern: fusion.decisionPattern, workPattern: fusion.workPattern,
        moneyPattern: fusion.moneyPattern, relationshipPattern: fusion.relationshipPattern
      },
      share: {headline: '', keywords: [], imageUrl: null}
    };
    var copy = opts.copy || root.DestinyAnatomyCopy;
    if (copy && typeof copy.compose === 'function') copy.compose(model, opts.lang);
    return model;
  }

  var api = {
    VERSION: VERSION,
    AXES: AXES,
    HD_CENTERS: HD_CENTERS,
    CHAKRA_IDS: CHAKRAS.map(function (c) { return c.id; }),
    tablesFrom: tablesFrom,
    adaptShellSnapshot: adaptShellSnapshot,
    computeSajuBrain: computeSajuBrain,
    computeElementLayer: computeElementLayer,
    pickCombo: pickCombo,
    computeChakra: computeChakra,
    adaptHumanDesign: adaptHumanDesign,
    adaptVedicBasis: adaptVedicBasis,
    computeFusion: computeFusion,
    computeLuck: computeLuck,
    memeBrain: memeBrain,
    percents: percents,
    fingerprint: fingerprint,
    buildDestinyAnatomy: buildDestinyAnatomy,
    _canon: {SIGNS: SIGNS, SIGNS_KO: SIGNS_KO, NAKSHATRA_LORD: NAKSHATRA_LORD}
  };
  root.DestinyAnatomyEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);

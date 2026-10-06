/* 운명 구조도(DESTINY ANATOMY) 화면 — engine+copy 가 만든 모델을 HTML 로 그린다. 순수 뷰다.
 *
 * 🔴 계산하지 않는다. model.text(문장)와 model.saju/elementLayer/chakra(숫자)만 읽는다.
 * 🔴 데이터가 없는 층은 그리지 않는다(placeholder 금지). HD 가 없으면 안내 문구만 둔다.
 * 섹션마다 따로 감싸서 한 섹션이 깨져도 그 자리만 "다시 불러오기"로 바뀐다. 클릭·계측은 boot.js 가 data-da-act 로 받는다.
 * 순서는 요청서 §31: Hero → Brain Map → Top Thoughts → 5 Engines → 오행 → Decision Core → Energy Body → Cross Insight → 한눈에 → 공유 → CTA. */
(function (root) {
  'use strict';

  var AXES = ['selfDrive', 'expression', 'reality', 'structure', 'reflection'];
  var GOD_HAN = {'비견':'比肩', '겁재':'劫財', '식신':'食神', '상관':'傷官', '편재':'偏財', '정재':'正財', '편관':'偏官', '정관':'正官', '편인':'偏印', '정인':'正印'};
  // Brain Map 좌표(viewBox 320×240). 앞쪽=표현·현실, 위=사고·책임, 가운데=주체.
  var NODE = {reflection: [112, 82], structure: [212, 80], selfDrive: [162, 122], expression: [98, 152], reality: [222, 152]};
  // 에너지 바디 좌표(viewBox 200×400). HD 센터는 바디그래프 배치를 몸에 얹은 근사다.
  var HD_POS = {HEAD: [100, 26, 'up'], AJNA: [100, 66, 'down'], THROAT: [100, 112, 'square'], G: [100, 168, 'diamond'], HEART: [130, 186, 'up'],
    SPLEEN: [66, 238, 'right'], SOLAR_PLEXUS: [134, 238, 'left'], SACRAL: [100, 262, 'square'], ROOT: [100, 308, 'square']};
  var CHAKRA_Y = {crown: 22, thirdEye: 66, throat: 112, heart: 172, solarPlexus: 220, sacral: 262, root: 306};

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c];
    });
  }
  function godName(g, locale) {
    if (locale === 'ko') return g;
    var intl = root.SajuReadingRichIntl && root.SajuReadingRichIntl.copy;
    var c = intl && (intl[locale] || null);
    return c && c.godName && c.godName[g] ? c.godName[g] : (GOD_HAN[g] || '');
  }

  /* 한 섹션을 그리다 실패하면 그 섹션만 오류 블록으로 바꾼다 — 사주 결과·다른 섹션으로 번지지 않는다. */
  function section(id, ui, fn) {
    try {
      return fn();
    } catch (e) {
      if (root.console && root.console.warn) root.console.warn('[destiny-anatomy] section failed', id, e);
      return '<div class="da-sec da-sec--error" data-da-sec="' + esc(id) + '"><p>' + esc(ui.error) + '</p>' +
        '<button type="button" class="da-btn da-btn--ghost" data-da-act="retry">' + esc(ui.retry) + '</button></div>';
    }
  }

  function heroHtml(t, variant) {
    var ui = t.ui;
    return '<header class="da-hero" data-da-sec="hero">' +
      '<div class="da-hero__meta"><span class="sec-tier-badge sec-tier-badge--free">' + esc(ui.free) + '</span>' +
      '<span class="da-eyebrow">' + esc(ui.subtitle) + '</span></div>' +
      '<h3 class="sec-title da-title" id="destinyAnatomyTitle">' + esc(ui.title) + '</h3>' +
      '<p class="da-hero__q">' + esc(t.hero[variant] || t.hero.A) + '</p>' +
      '<p class="da-hero__intro">' + esc(ui.intro) + '</p></header>';
  }

  function brainSvg(model, t) {
    var s = model.saju;
    var ranked = s.ranked;
    var lines = '';
    AXES.forEach(function (a, i) {
      AXES.slice(i + 1).forEach(function (b) {
        var w = (s.engines[a].score * s.engines[b].score) / 10000;
        var core = ranked.slice(0, 3).indexOf(a) >= 0 && ranked.slice(0, 3).indexOf(b) >= 0;
        lines += '<line class="da-brain__link' + (core ? ' is-core' : '') + '" x1="' + NODE[a][0] + '" y1="' + NODE[a][1] + '" x2="' + NODE[b][0] + '" y2="' + NODE[b][1] +
          '" stroke-width="' + (0.6 + w * 3.2).toFixed(2) + '"/>';
      });
    });
    // 대운 = 바깥에서 흘러드는 10년의 기운. 켠 회로에만 위에서 내려오는 흐름선을 긋는다(점수는 바꾸지 않는다).
    var luck = t.luck;
    var flows = '';
    if (luck) luck.axes.forEach(function (a) {
      var p = NODE[a];
      flows += '<path class="da-brain__flow da-tone-' + esc(luck.tone) + '" d="M160 2Q' + ((160 + p[0]) / 2).toFixed(1) + ' ' + (p[1] * 0.35).toFixed(1) + ' ' + p[0] + ' ' + p[1] + '"/>';
    });
    var nodes = '';
    t.engines.forEach(function (e) {
      var p = NODE[e.axis];
      var r = 9 + e.score * 0.17;
      var top = s.topThoughts.indexOf(e.axis) >= 0;
      nodes += '<g class="da-brain__node da-lv-' + esc(e.level) + (top ? ' is-top' : '') + (e.luck ? ' is-luck' : '') + '">' +
        (top ? '<circle class="da-brain__glow" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (r + 10).toFixed(1) + '"/>' : '') +
        (e.luck ? '<circle class="da-brain__orbit da-tone-' + esc(e.luck) + '" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (r + 6).toFixed(1) + '"/>' : '') +
        '<circle class="da-brain__core" cx="' + p[0] + '" cy="' + p[1] + '" r="' + r.toFixed(1) + '"/>' +
        '<text class="da-brain__label" x="' + p[0] + '" y="' + (p[1] + r + 14).toFixed(1) + '" text-anchor="middle">' + esc(e.name) + '</text></g>';
    });
    var label = s.brainHeadline + (luck ? ' · ' + luck.toneLabel + ': ' + luck.thoughts.map(function (x) { return x.name; }).join(', ') : '');
    return '<svg class="da-brain__svg" viewBox="0 0 320 240" role="img" aria-label="' + esc(label) + '">' +
      '<path class="da-brain__shell" d="M58 132C38 84 88 30 160 34C232 30 288 72 272 126C288 168 242 206 186 199C166 216 120 215 104 197C68 201 42 170 58 132Z"/>' +
      '<path class="da-brain__fold" d="M160 38C150 82 174 122 158 196M86 96C104 104 118 98 128 110M236 98C218 108 206 100 194 114M90 176C108 166 124 176 136 166M232 174C214 164 200 174 188 164"/>' +
      lines + flows + nodes + '</svg>';
  }

  function luckChip(ui, tone) {
    return tone ? '<span class="da-chip da-tone-' + esc(tone) + '">' + esc(ui.luckChip) + '</span>' : '';
  }

  /* 지금 대운이 켠 생각 — 셸이 무료로 보여 주는 현재 대운 1칸만 쓴다. 대운표 전체·연도별 흐름은 유료 영역이라 그리지 않는다. */
  function luckHtml(t) {
    var ui = t.ui, l = t.luck;
    if (!l) return '';
    return '<div class="da-luck da-tone-' + esc(l.tone) + '" data-da-luck="' + esc(l.tone) + '">' +
      '<div class="da-luck__head"><span class="da-luck__eyebrow">' + esc(ui.luckEyebrow) + '</span><span class="da-luck__period">' + esc(l.period) + '</span></div>' +
      '<p class="da-luck__title">' + esc(ui.luckTitle) + ' <span class="da-luck__tone">' + esc(l.toneLabel) + '</span></p>' +
      '<ul class="da-thoughts da-thoughts--luck">' + l.thoughts.map(function (x) {
        return '<li class="da-thought da-thought--luck"><span class="da-thought__line">“' + esc(x.line) + '”</span><span class="da-thought__name">' + esc(x.name) + '</span></li>';
      }).join('') + '</ul>' +
      '<p class="da-p">' + esc(l.lead) + '</p>' +
      (l.overheat ? '<p class="da-luck__heat">' + esc(l.overheat) + '</p>' : '') +
      '<p class="da-note">' + esc(ui.luckNote) + '</p></div>';
  }

  function brainHtml(model, t, state) {
    var ui = t.ui;
    var thoughts = t.thoughts.map(function (x) {
      return '<li class="da-thought' + (x.luck ? ' is-luck da-tone-' + esc(x.luck) : '') + '"><span class="da-thought__line">“' + esc(x.line) + '”</span><span class="da-thought__name">' + esc(x.name) + luckChip(ui, x.luck) + '</span></li>';
    }).join('');
    var rest = t.allThoughts.filter(function (x) { return !x.top; });
    var restHtml = rest.length ? '<ul class="da-thoughts da-thoughts--rest" id="daThoughtsRest"' + (state.thoughtsOpen ? '' : ' hidden') + '>' +
      rest.map(function (x) { return '<li class="da-thought da-thought--quiet' + (x.luck ? ' is-luck da-tone-' + esc(x.luck) : '') + '"><span class="da-thought__line">“' + esc(x.line) + '”</span><span class="da-thought__name">' + esc(x.name) + luckChip(ui, x.luck) + '</span></li>'; }).join('') + '</ul>' +
      '<button type="button" class="da-link" data-da-act="thoughts" aria-controls="daThoughtsRest" aria-expanded="' + (state.thoughtsOpen ? 'true' : 'false') + '">' +
      esc(state.thoughtsOpen ? ui.lessThoughts : ui.moreThoughts) + '</button>' : '';
    return '<section class="da-sec da-brain" data-da-sec="brain" aria-labelledby="daBrainTitle">' +
      '<h4 class="da-h" id="daBrainTitle">' + esc(ui.brainTitle) + '</h4>' +
      '<p class="da-lead">' + esc(model.saju.brainHeadline) + '</p>' +
      brainSvg(model, t) +
      (t.luck ? '<p class="da-brain__legend"><span class="da-key da-tone-' + esc(t.luck.tone) + '" aria-hidden="true"></span>' + esc(ui.luckLegend) + ' · ' + esc(t.luck.toneLabel) + '</p>' : '') +
      '<ul class="da-thoughts">' + thoughts + '</ul>' + restHtml + luckHtml(t) +
      (state.open ? '' : '<button type="button" class="da-btn da-btn--primary" data-da-act="explore" aria-controls="daBody" aria-expanded="false">' + esc(ui.explore) + '</button>') +
      '</section>';
  }

  function circuitHtml(model, t) {
    var ui = t.ui;
    return '<section class="da-sec da-circuit" data-da-sec="circuit" aria-labelledby="daCircuitTitle">' +
      '<h4 class="da-h" id="daCircuitTitle">' + esc(ui.circuitTitle) + '</h4>' +
      '<p class="da-combo">' + esc(t.comboTitle) + '</p>' +
      '<p class="da-p">' + esc(t.comboText) + (t.toneNote ? ' ' + esc(t.toneNote) : '') + '</p>' +
      '<p class="da-sequence">' + esc(t.sequence) + '</p>' +
      '<div class="da-nyang"><span class="da-nyang__label">' + esc(ui.nyangLabel) + '</span><p>' + esc(t.nyang) + '</p></div>' +
      '</section>';
  }

  function enginesHtml(model, t) {
    var ui = t.ui;
    var rows = t.engines.map(function (e) {
      var src = e.source.map(function (g) { return godName(g, model.locale); }).filter(Boolean).join(' · ');
      var list = function (arr) { return '<ul class="da-bullets">' + arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; };
      return '<details class="da-engine da-lv-' + esc(e.level) + '" data-da-engine="' + esc(e.axis) + '">' +
        '<summary class="da-engine__head"><span class="da-engine__name">' + esc(e.name) + '<small>' + esc(e.god) + '</small>' + luckChip(ui, e.luck) + '</span>' +
        '<span class="da-engine__level">' + esc(e.levelLabel) + '</span>' +
        '<span class="da-meter" aria-hidden="true"><span class="da-meter__fill" style="width:' + Math.max(4, Math.min(100, e.score)) + '%"></span></span></summary>' +
        '<div class="da-engine__body">' +
        '<p class="da-q"><span>' + esc(ui.question) + '</span> “' + esc(e.question) + '”</p>' +
        '<p class="da-tags">' + e.keywords.map(function (k) { return '<span class="da-tag">' + esc(k) + '</span>'; }).join('') + '</p>' +
        '<p class="da-sub">' + esc(ui.whenStrong) + '</p>' + list(e.strong) +
        '<p class="da-sub">' + esc(ui.whenOver) + '</p>' + list(e.over) +
        (src ? '<p class="da-source"><span>' + esc(ui.sourceGods) + '</span> ' + esc(src) + '</p>' : '') +
        '</div></details>';
    }).join('');
    return '<section class="da-sec" data-da-sec="engines" aria-labelledby="daEnginesTitle"><h4 class="da-h" id="daEnginesTitle">' + esc(ui.enginesTitle) + '</h4>' + rows + '</section>';
  }

  function elementsHtml(model, t) {
    var ui = t.ui, el = t.elements;
    var max = Math.max.apply(null, el.items.map(function (x) { return x.ratio || 0; })) || 1;
    var bars = el.items.map(function (x) {
      var pct = Math.round((x.ratio || 0) * 100);
      return '<li class="da-el' + (x.id === model.elementLayer.dominant ? ' is-dominant' : '') + (pct === 0 ? ' is-missing' : '') + '">' +
        '<span class="da-el__name">' + esc(x.name) + '</span><span class="da-meter"><span class="da-meter__fill" style="width:' + Math.round((x.ratio || 0) / max * 100) + '%"></span></span>' +
        '<span class="da-el__pct">' + pct + '%</span><span class="da-el__words">' + esc(x.words) + '</span></li>';
    }).join('');
    return '<section class="da-sec" data-da-sec="elements" aria-labelledby="daElementsTitle"><h4 class="da-h" id="daElementsTitle">' + esc(ui.elementsTitle) + '</h4>' +
      '<p class="da-note">' + esc(ui.elementsSub) + '</p><ul class="da-els">' + bars + '</ul>' +
      (el.dominant ? '<p class="da-p">' + esc(el.dominant) + '</p>' : '') +
      el.missing.map(function (m) { return '<p class="da-p da-p--quiet">' + esc(m) + '</p>'; }).join('') + '</section>';
  }

  function layerNotice(t, layer) {
    var ui = t.ui;
    if (layer === 'loading') return '<p class="da-notice da-notice--loading" role="status"><span class="da-spin" aria-hidden="true"></span>' + esc(ui.layerLoading) + '</p>';
    if (layer === 'failed') return '<p class="da-notice">' + esc(ui.layerFailed) + '</p>';
    if (layer === 'timeUnknown') return '<p class="da-notice">' + esc(ui.timeUnknown) + '</p>';
    if (layer === 'login') return '<div class="da-notice"><p>' + esc(ui.loginNeeded) + '</p><button type="button" class="da-btn da-btn--ghost" data-da-act="login">' + esc(ui.login) + '</button></div>';
    return '';
  }

  function decisionHtml(model, t, state) {
    var ui = t.ui, hd = t.hd;
    var head = '<section class="da-sec da-decision" data-da-sec="decision" aria-labelledby="daDecisionTitle">' +
      '<p class="da-bridge">' + esc(ui.hdBridge) + '</p><h4 class="da-h" id="daDecisionTitle">' + esc(ui.energyTitle) + '</h4>';
    if (!hd) return head + layerNotice(t, state.layer) + '</section>';
    return head +
      '<div class="da-hd-type"><p class="da-combo">' + esc(hd.typeName) + '</p><p class="da-p">' + esc(hd.typeSummary) + '</p>' +
      '<dl class="da-facts">' +
      (hd.strategy ? '<div><dt>' + esc(ui.strategy) + '</dt><dd>' + esc(hd.strategy) + '</dd></div>' : '') +
      (hd.profile ? '<div><dt>' + esc(ui.profile) + '</dt><dd>' + esc(hd.profile) + '</dd></div>' : '') +
      (hd.definitionName ? '<div><dt>' + esc(ui.definition) + '</dt><dd>' + esc(hd.definitionName) + '</dd></div>' : '') +
      '</dl></div>' +
      '<div class="da-core"><p class="da-sub">' + esc(ui.decisionTitle) + '</p><p class="da-combo">' + esc(hd.authorityName) + '</p>' +
      '<p class="da-p">' + esc(hd.authoritySummary) + '</p>' + (hd.authorityHow ? '<p class="da-p">' + esc(hd.authorityHow) + '</p>' : '') + '</div>' +
      '</section>';
  }

  function shape(kind, x, y, r) {
    var p;
    if (kind === 'up') p = [[x, y - r], [x + r, y + r * 0.8], [x - r, y + r * 0.8]];
    else if (kind === 'down') p = [[x - r, y - r * 0.8], [x + r, y - r * 0.8], [x, y + r]];
    else if (kind === 'left') p = [[x + r * 0.8, y - r], [x + r * 0.8, y + r], [x - r, y]];
    else if (kind === 'right') p = [[x - r * 0.8, y - r], [x - r * 0.8, y + r], [x + r, y]];
    else if (kind === 'diamond') p = [[x, y - r * 1.2], [x + r * 1.2, y], [x, y + r * 1.2], [x - r * 1.2, y]];
    else p = [[x - r, y - r], [x + r, y - r], [x + r, y + r], [x - r, y + r]];
    return p.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ');
  }

  function bodySvg(t, view) {
    var showHd = !!t.hd && view !== 'chakra';
    var showChakra = view !== 'hd' || !t.hd;
    var chakra = showChakra ? t.chakra.map(function (c) {
      var y = CHAKRA_Y[c.id];
      var r = 7 + c.emphasis * 0.09;
      return '<g class="da-chakra da-ck-' + esc(c.level) + '"><circle class="da-chakra__halo" cx="100" cy="' + y + '" r="' + (r + 7).toFixed(1) + '"/>' +
        '<circle class="da-chakra__dot" cx="100" cy="' + y + '" r="' + r.toFixed(1) + '"/></g>';
    }).join('') : '';
    var centers = showHd ? t.hd.centers.map(function (c) {
      var p = HD_POS[c.id];
      if (!p) return '';
      return '<polygon class="da-center' + (c.defined ? ' is-defined' : '') + '" points="' + shape(p[2], p[0], p[1], 11) + '"/>';
    }).join('') : '';
    return '<svg class="da-body__svg" viewBox="0 0 200 400" role="img" aria-hidden="true">' +
      '<path class="da-body__shape" d="M100 4C120 4 132 20 132 42C132 62 122 78 112 84L112 94C134 98 158 108 164 130L176 214C178 226 166 230 162 218L150 150L148 228C148 252 144 270 140 286L136 390C136 398 116 398 116 390L106 300L94 300L84 390C84 398 64 398 64 390L60 286C56 270 52 252 52 228L50 150L38 218C34 230 22 226 24 214L36 130C42 108 66 98 88 94L88 84C78 78 68 62 68 42C68 20 80 4 100 4Z"/>' +
      '<line class="da-body__spine" x1="100" y1="18" x2="100" y2="310"/>' + chakra + centers + '</svg>';
  }

  function bodyHtml(model, t, state) {
    var ui = t.ui;
    var view = t.hd ? state.view : 'chakra';
    var toggle = t.hd ? '<div class="da-toggle" role="group" aria-label="' + esc(ui.bodyTitle) + '">' + ['hd', 'chakra', 'both'].map(function (v) {
      return '<button type="button" class="da-toggle__btn" data-da-act="view" data-da-view="' + v + '" aria-pressed="' + (view === v ? 'true' : 'false') + '">' + esc(ui.toggle[v]) + '</button>';
    }).join('') + '</div>' : '';
    var list = '';
    if (t.hd && view !== 'chakra') {
      list += '<ul class="da-centers">' + t.hd.centers.map(function (c) {
        return '<li class="da-centers__item' + (c.defined ? ' is-defined' : '') + '"><span class="da-centers__name">' + esc(c.name) + '</span>' +
          '<span class="da-centers__state">' + esc(c.defined ? ui.centerDefined : ui.centerOpen) + '</span>' +
          (c.role ? '<span class="da-centers__role">' + esc(c.role) + '</span>' : '') + '</li>';
      }).join('') + '</ul>';
    }
    if (view !== 'hd') {
      list += '<ul class="da-chakras">' + t.chakra.map(function (c) {
        return '<li class="da-chakras__item da-ck-' + esc(c.level) + '"><span class="da-centers__name">' + esc(c.name) + '</span>' +
          '<span class="da-centers__state">' + esc(c.levelLabel) + '</span><span class="da-centers__role">' + esc(c.theme) + '</span></li>';
      }).join('') + '</ul><p class="da-note">' + esc(ui.chakraNote) + '</p>';
    }
    return '<section class="da-sec da-body" data-da-sec="body" aria-labelledby="daBodyTitle"><h4 class="da-h" id="daBodyTitle">' + esc(ui.bodyTitle) + '</h4>' +
      toggle + '<div class="da-body__grid">' + bodySvg(t, view) + '<div class="da-body__list">' + list + '</div></div></section>';
  }

  function vedicHtml(t) {
    if (!t.vedic.length) return '';
    return '<section class="da-sec" data-da-sec="vedic" aria-labelledby="daVedicTitle"><h4 class="da-h" id="daVedicTitle">' + esc(t.ui.vedicTitle) + '</h4>' +
      t.vedic.map(function (v) { return '<p class="da-sub">' + esc(v.title) + '</p><p class="da-p">' + esc(v.body) + '</p>'; }).join('') + '</section>';
  }

  function insightsHtml(t) {
    return '<section class="da-sec" data-da-sec="fusion" aria-labelledby="daCrossTitle"><h4 class="da-h" id="daCrossTitle">' + esc(t.ui.crossTitle) + '</h4>' +
      t.insights.map(function (i) {
        return '<article class="da-insight"><span class="da-badge da-badge--' + esc(i.badge) + '">' + esc(i.badgeLabel) + '</span>' +
          '<p class="da-sub">' + esc(i.title) + '</p><p class="da-p">' + esc(i.body) + '</p></article>';
      }).join('') + '</section>';
  }

  function summaryHtml(model, t) {
    var ui = t.ui;
    return '<section class="da-sec da-summary" data-da-sec="summary" aria-labelledby="daSummaryTitle"><h4 class="da-h" id="daSummaryTitle">' + esc(ui.summaryTitle) + '</h4>' +
      '<p class="da-mindline">' + esc(t.mindLine) + '</p>' +
      '<p class="da-core-engine"><span>' + esc(ui.coreEngine) + '</span> ' + esc(model.fusion.headline) + '</p>' +
      '<dl class="da-rows">' + t.summary.map(function (r) { return '<div><dt>' + esc(r.label) + '</dt><dd>' + esc(r.value) + '</dd></div>'; }).join('') + '</dl>' +
      '<p class="da-tags">' + model.share.keywords.map(function (k) { return '<span class="da-tag">#' + esc(k) + '</span>'; }).join('') + '</p></section>';
  }

  function shareHtml(t, state) {
    var ui = t.ui;
    return '<section class="da-sec da-share" data-da-sec="share" aria-labelledby="daShareTitle"><h4 class="da-h" id="daShareTitle">' + esc(ui.shareTitle) + '</h4>' +
      '<p class="da-note">' + esc(ui.shareSub) + '</p><div class="da-actions">' +
      '<button type="button" class="da-btn da-btn--primary" data-da-act="share">' + esc(ui.shareAction) + '</button>' +
      '<button type="button" class="da-btn da-btn--ghost" data-da-act="save">' + esc(ui.saveAction) + '</button>' +
      '<button type="button" class="da-btn da-btn--ghost" data-da-act="copy">' + esc(ui.copyAction) + '</button></div>' +
      '<p class="da-note da-share__status" role="status" aria-live="polite">' + (state.copied ? esc(ui.copied) : '') + '</p></section>';
  }

  /* 하단 CTA — 기존 유료 진입만 가리킨다(새 게이트·가격 없음). 결과 안 카드는 스크롤, 별도 서비스는 ?from=destiny_anatomy 링크. */
  var CTA_TARGET = {
    love: {href: '/love-secret-ai/?from=destiny_anatomy'},
    compat: {scroll: 'compatCard'},
    wealth: {scroll: 'summaryCard'},
    luck: {scroll: 'daewunCard'},
    hd: {href: '/human-design/?from=destiny_anatomy'}
  };
  function ctaHtml(t) {
    var items = t.cta.map(function (c) {
      var tg = CTA_TARGET[c.id];
      if (!tg) return '';
      var inner = '<span class="da-cta__q">' + esc(c.q) + '</span><span class="da-cta__label">' + esc(c.label) + '</span>';
      if (tg.href) return '<li><a class="da-cta" href="' + esc(tg.href) + '" data-da-act="cta" data-da-cta="' + esc(c.id) + '">' + inner + '</a></li>';
      if (!root.document || !root.document.getElementById(tg.scroll)) return '';
      return '<li><button type="button" class="da-cta" data-da-act="cta" data-da-cta="' + esc(c.id) + '" data-da-scroll="' + esc(tg.scroll) + '">' + inner + '</button></li>';
    }).join('');
    return '<section class="da-sec da-ctas" data-da-sec="cta" aria-labelledby="daCtaTitle"><h4 class="da-h" id="daCtaTitle">' + esc(t.ui.ctaTitle) + '</h4><ul class="da-cta-list">' + items + '</ul></section>';
  }

  function render(container, model, opts) {
    var state = opts || {};
    var t = model.text;
    var ui = t.ui;
    var variant = state.variant || 'A';
    var html = section('hero', ui, function () { return heroHtml(t, variant); }) +
      section('brain', ui, function () { return brainHtml(model, t, state); });
    if (state.open) {
      html += '<div class="da-body-wrap" id="daBody">' +
        section('circuit', ui, function () { return circuitHtml(model, t); }) +
        section('engines', ui, function () { return enginesHtml(model, t); }) +
        section('elements', ui, function () { return elementsHtml(model, t); }) +
        section('decision', ui, function () { return decisionHtml(model, t, state); }) +
        section('body', ui, function () { return bodyHtml(model, t, state); }) +
        section('vedic', ui, function () { return vedicHtml(t); }) +
        section('fusion', ui, function () { return insightsHtml(t); }) +
        section('summary', ui, function () { return summaryHtml(model, t); }) +
        section('share', ui, function () { return shareHtml(t, state); }) +
        section('cta', ui, function () { return ctaHtml(t); }) +
        '<p class="da-disclaimer">' + esc(ui.disclaimer) + '</p></div>';
    }
    container.innerHTML = html;
    container.setAttribute('data-da-locale', model.locale || '');
    container.setAttribute('data-da-variant', variant);
  }

  function renderSkeleton(container) {
    container.innerHTML = '<div class="da-skeleton" aria-busy="true" aria-hidden="true"><span class="da-skel da-skel--title"></span>' +
      '<span class="da-skel da-skel--line"></span><span class="da-skel da-skel--brain"></span><span class="da-skel da-skel--line"></span><span class="da-skel da-skel--line da-skel--short"></span></div>';
  }

  function renderError(container, ui) {
    container.innerHTML = '<div class="da-sec da-sec--error" role="alert"><p>' + esc(ui.error) + '</p>' +
      '<button type="button" class="da-btn da-btn--ghost" data-da-act="retry">' + esc(ui.retry) + '</button></div>';
  }

  var api = {render: render, renderSkeleton: renderSkeleton, renderError: renderError, CTA_TARGET: CTA_TARGET};
  root.DestinyAnatomyRender = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);

/* 운명 구조도(DESTINY ANATOMY) 화면 — engine+copy 가 만든 모델을 HTML 로 그린다. 순수 뷰다.
 *
 * 🔴 계산하지 않는다. model.text(문장)와 model.saju/elementLayer/chakra(숫자)만 읽는다.
 * 🔴 데이터가 없는 층은 그리지 않는다(placeholder 금지). HD 가 없으면 안내 문구만 둔다.
 * 섹션마다 따로 감싸서 한 섹션이 깨져도 그 자리만 "다시 불러오기"로 바뀐다. 클릭·계측은 boot.js 가 data-da-act 로 받는다.
 * 순서: 별명·뇌구조·공유 → 요약 → 생각/관계/회복 세 챕터 → AI 질문 → CTA.
 * 펼친 본문은 밝은 종이 보고서이며 native details 상태를 추가 데이터 수신 후에도 유지한다. */
(function (root) {
  'use strict';

  var AXES = ['selfDrive', 'expression', 'reality', 'structure', 'reflection'];
  var GOD_HAN = {'비견':'比肩', '겁재':'劫財', '식신':'食神', '상관':'傷官', '편재':'偏財', '정재':'正財', '편관':'偏官', '정관':'正官', '편인':'偏印', '정인':'正印'};
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

  // Editorial WEBP illustrations are decorative, never a substitute for calculated charts.
  function illustration(kind) {
    var src = '/images/destiny-anatomy/moonlit-' + kind + '-v1-';
    return '<img class="da-illustration da-illustration--' + kind + '" src="' + src + '384.webp" srcset="' + src + '384.webp 1x, ' + src + '768.webp 2x" width="128" height="144" alt="" aria-hidden="true" loading="lazy" decoding="async">';
  }

  function heroHtml(t, variant) {
    var ui = t.ui;
    return '<header class="da-hero" data-da-sec="hero">' + illustration('brain') +
      '<h3 class="da-title" id="daReportTitle">' + esc(ui.title) + '</h3>' +
      '<p class="da-hero__q">' + esc(t.comboTitle) + '</p>' +
      '<p class="da-hero__intro">' + esc(t.mindLine) + '</p>' +
      '' +
      '</header>';
  }

  /* 밈 뇌구조 — 옆얼굴 윤곽 안 둥근 뇌 상자를 엔진 비율대로 나눈 그림(engine.memeBrain). 칸 안엔 짧은 속마음과 %.
   * 축마다 색 + 무늬(색만으로 구분하지 않는다)를 주고, 범례 견본도 같은 무늬를 쓴다.
   * 그림은 장식(aria-hidden)이고 아래 범례 목록이 같은 내용을 글로 준다. 칸 글자가 넘치면 fitMeme 이 한 단계씩 낮춘다. */
  var MEME_GAP = 3;
  var MEME_PATTERNS = {
    selfDrive: '<pattern id="daPat-selfDrive" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line class="da-pat" x1="0" y1="0" x2="0" y2="7"/></pattern>',
    expression: '<pattern id="daPat-expression" width="7" height="7" patternUnits="userSpaceOnUse"><circle class="da-pat da-pat--dot" cx="3.5" cy="3.5" r="1.1"/></pattern>',
    reality: '<pattern id="daPat-reality" width="8" height="8" patternUnits="userSpaceOnUse"></pattern>',
    structure: '<pattern id="daPat-structure" width="8" height="8" patternUnits="userSpaceOnUse"><path class="da-pat" d="M0 0H8M0 0V8"/></pattern>',
    reflection: '<pattern id="daPat-reflection" width="6" height="6" patternUnits="userSpaceOnUse"><line class="da-pat" x1="0" y1="3" x2="6" y2="3"/></pattern>'
  };
  // 샤갈풍 밤하늘 장식(예화 금선) — 초승달·별·떠다니는 꽃가지·바이올린. 데이터가 아니라 장식이라 머리 바깥 여백에만 둔다.
  var MEME_ART = '<path class="da-meme__window" d="M20 282V154a160 142 0 0 1 320 0v128"/>' +
    '<path class="da-meme__moon" d="M44 22a20 20 0 1 0 22 30a16 16 0 1 1-22-30Z"/>';
  function memeSwatch(axis) {
    return '<svg class="da-meme__sw" viewBox="0 0 18 18" aria-hidden="true" focusable="false"><rect class="da-meme__fill da-ax-' + esc(axis) + '" x="1" y="1" width="16" height="16" rx="4"/>' + '</svg>';
  }
  function memeHtml(t) {
    var m = t.meme;
    if (!m || !m.cells.length) return '';
    var vb = m.viewBox.split(' ').map(Number), b = m.box, g = MEME_GAP / 2;
    var pc = function (v, base) { return (v / base * 100).toFixed(3) + '%'; };
    var rects = '', cells = '', pats = '';
    m.cells.forEach(function (c) {
      var cw = Math.max(0, c.w - MEME_GAP), ch = Math.max(0, c.h - MEME_GAP);
      var geo = 'x="' + (c.x + g) + '" y="' + (c.y + g) + '" width="' + cw + '" height="' + ch + '" rx="' + Math.min(10, cw / 3, ch / 3).toFixed(2) + '"';
      rects += '<rect class="da-meme__fill da-ax-' + esc(c.axis) + '" ' + geo + '/>';
      cells += '<div class="da-meme__cell da-ax-' + esc(c.axis) + ' is-' + esc(c.tier) + (c.luck ? ' is-luck da-tone-' + esc(c.luck) : '') +
        '" data-da-axis="' + esc(c.axis) + '" data-da-tier="' + esc(c.tier) + '" style="left:' + pc(c.x + g, vb[2]) + ';top:' + pc(c.y + g, vb[3]) +
        ';width:' + pc(c.w - MEME_GAP, vb[2]) + ';height:' + pc(c.h - MEME_GAP, vb[3]) + '">' +
        '<span class="da-meme__line">' + esc(c.tier === 'full' ? c.line : c.label) + '</span><b class="da-meme__pct">' + c.pct + '%</b></div>';
    });
    Object.keys(MEME_PATTERNS).forEach(function (k) { pats += MEME_PATTERNS[k]; });
    pats += '<linearGradient id="daGlass" x1="0" y1="0" x2="1" y2="1"><stop class="da-sheen-a" offset="0"/><stop class="da-sheen-b" offset=".55"/></linearGradient>';
    var tierOf = {};
    m.cells.forEach(function (c) { tierOf[c.axis] = c.tier; });
    var legend = m.legend.map(function (c) {
      return '<li class="da-meme__row da-ax-' + esc(c.axis) + (c.luck ? ' is-luck da-tone-' + esc(c.luck) : '') + '" data-da-axis="' + esc(c.axis) + '">' +
        memeSwatch(c.axis) + '<span class="da-meme__name">' + esc(c.label) + '</span>' +
        '<b class="da-meme__rowpct">' + c.pct + '%</b>' +
        '<span class="da-meme__rowline">“' + esc(c.line) + '”</span></li>';
    }).join('');
    var box = 'x="' + b.x + '" y="' + b.y + '" width="' + b.w + '" height="' + b.h + '" rx="' + b.r + '"';
    var n = m.inner || b, inner = 'x="' + n.x + '" y="' + n.y + '" width="' + n.w + '" height="' + n.h + '" rx="' + n.r + '"';
    return '<figure class="da-meme">' +
      '<div class="da-meme__stage" aria-hidden="true" style="aspect-ratio:' + vb[2] + ' / ' + vb[3] + '">' +
      '<svg class="da-meme__svg" viewBox="' + esc(m.viewBox) + '" focusable="false"><defs><clipPath id="daMemeClip"><rect ' + inner + '/></clipPath>' + pats + '</defs>' +
      MEME_ART + '<path class="da-meme__head" d="' + esc(m.head) + '"/><path class="da-meme__ear" d="' + esc(m.ear) + '"/>' +
      '<path class="da-meme__eye" d="' + esc(m.eye) + '"/><circle class="da-meme__cheek" cx="' + m.cheek.cx + '" cy="' + m.cheek.cy + '" r="' + m.cheek.r + '"/>' +
      '<rect class="da-meme__brain" ' + box + '/><g clip-path="url(#daMemeClip)">' + rects + '</g><rect class="da-meme__outline" ' + box + '/></svg>' +
      '<div class="da-meme__cells">' + cells + '</div></div>' +
      '<figcaption class="da-meme__caption">' + esc(m.caption) + '</figcaption>' +
      '<ol class="da-meme__legend">' + legend + '</ol>' +
      '</figure>';
  }

  /* 칸 글자 넘침 교정 — 실제 크기를 재서 full(문구+%) → mid(이모지+%) → dot(색만) 으로 낮춘다.
     낮춘 칸의 문구는 범례에서 보이게 한다. 매번 처음 단계부터 다시 재므로 화면이 넓어지면 되돌아간다. */
  // full → tight(글자 축소) → mid(속마음 숨김, 스티커·% 한 줄) → pct(%만) → dot(빈 칸). 범례 속마음은 칸에 문장이 보이면 숨긴다.
  // 칸 문장은 어절 중간에서 끊지 않는다(overflow-wrap 없음) — 넘치면 scrollWidth 로 잡혀 다음 단계로 내려간다.
  var TIERS = ['full', 'tight', 'mid', 'pct', 'dot'];
  function fitMeme(container) {
    var cells = container && container.querySelectorAll ? container.querySelectorAll('.da-meme__cell') : [];
    for (var i = 0; i < cells.length; i++) {
      var el = cells[i];
      var k = 0;
      var setTier = function (tier) {
        TIERS.forEach(function (x) { el.classList.toggle('is-' + x, x === tier); });
      };
      setTier(TIERS[k]);
      while (k < TIERS.length - 1 && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)) setTier(TIERS[++k]);
      var line = container.querySelector('.da-meme__row[data-da-axis="' + el.getAttribute('data-da-axis') + '"] .da-meme__rowline');
      if (line) line.classList.remove('da-sr');
    }
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
    return '<section class="da-sec da-brain" data-da-sec="brain" aria-labelledby="daBrainTitle">' +
      '<h4 class="da-h" id="daBrainTitle">' + esc(ui.brainTitle) + '</h4>' +
      '<p class="da-lead">' + esc(model.saju.brainHeadline) + '</p>' +
      memeHtml(t) +
      '</section>';
  }

  function circuitHtml(model, t) {
    var ui = t.ui;
    return '<section class="da-sec da-circuit" data-da-sec="circuit" aria-labelledby="daCircuitTitle">' +
      '<h4 class="da-h" id="daCircuitTitle">' + esc(ui.circuitTitle) + '</h4>' +
      '<p class="da-combo">' + esc(t.comboTitle) + '</p>' +
      '<p class="da-p">' + esc(t.comboText) + (t.toneNote ? ' ' + esc(t.toneNote) : '') + '</p>' +
      '<p class="da-sequence">' + esc(t.sequence) + '</p>' + luckHtml(t) +
      '</section>';
  }

  // 오행 글리프·십성 엠블럼 — 손으로 그린 인라인 path(중심 0,0, 글리프 ±12·엠블럼 ±10). 색은 CSS 토큰(--da-elc·--da-ax)이 정한다.
  var ELEMENT_GLYPH = {
    wood: '<path class="da-gl__s" d="M0 11V0"/><path class="da-gl__f" d="M0 4C-1 -2 -6 -5 -11 -3C-9 3 -4 5 0 4Z"/><path class="da-gl__f" d="M0 0C0 -6 5 -10 11 -9C10 -3 6 0 0 0Z"/><path class="da-gl__v" d="M-9 -2C-6 -1 -3 1 -1 3M9 -7C6 -5 3 -3 1 -1"/>',
    fire: '<path class="da-gl__f" d="M0 -11C1 -6 7 -3 7 3A7 7 0 0 1 -7 3C-7 -1 -5 -3 -3 -6C-3 -3 -2 -2 -1 -1C0 -4 -1 -8 0 -11Z"/><path class="da-gl__l" d="M0 9A3.2 3.2 0 0 1 -3.2 5.8C-3.2 3.5 -1 2 0 0C1 2 3.2 3.5 3.2 5.8A3.2 3.2 0 0 1 0 9Z"/>',
    earth: '<path class="da-gl__l" d="M-3 9L4 -7L11 9Z"/><path class="da-gl__f" d="M-11 9L-3 -4L5 9Z"/><path class="da-gl__v" d="M-5.4 0L-3 -4L-0.6 0"/><path class="da-gl__s" d="M-11 9.5H11"/>',
    metal: '<path class="da-gl__f" d="M-10 -3L-5 -9H5L10 -3L0 10Z"/><path class="da-gl__v" d="M-10 -3H10M-5 -9L-2 -3L0 10M5 -9L2 -3L0 10"/>',
    water: '<path class="da-gl__f" d="M0 -11C4 -5 8 -1 8 3.5A8 8 0 0 1 -8 3.5C-8 -1 -4 -5 0 -11Z"/><path class="da-gl__v" d="M-4.5 3.5A4.5 4.5 0 0 0 -1 8"/>'
  };
  var AXIS_EMBLEM = {
    // 비겁: 나침반 — 내 방향
    selfDrive: '<circle class="da-em__o" r="9"/><path class="da-em__t" d="M0 -9V-6.6M9 0H6.6M0 9V6.6M-9 0H-6.6"/><path class="da-em__f" d="M0 -6L2.6 0H-2.6Z"/><path class="da-em__g" d="M0 6L2.6 0H-2.6Z"/><circle class="da-em__p" r="1.3"/>',
    // 식상: 반짝이는 말풍선 — 표현
    expression: '<path class="da-em__f" d="M-9 -5.5A3.5 3.5 0 0 1 -5.5 -9H5.5A3.5 3.5 0 0 1 9 -5.5V1.5A3.5 3.5 0 0 1 5.5 5H-1L-6 9V5H-5.5A3.5 3.5 0 0 1 -9 1.5Z"/><path class="da-em__p" d="M0 -6.5L1.1 -3.1L4.5 -2L1.1 -0.9L0 2.5L-1.1 -0.9L-4.5 -2L-1.1 -3.1Z"/>',
    // 재성: 엽전 두 닢 — 현실의 결과
    reality: '<circle class="da-em__go" cx="3.6" cy="-3.6" r="5.4"/><circle class="da-em__f" cx="-2" cy="2" r="7.4"/><rect class="da-em__p" x="-4.7" y="-0.7" width="5.4" height="5.4" rx=".6"/>',
    // 관성: 방패와 기둥 — 규칙과 책임
    structure: '<path class="da-em__f" d="M0 -10L8 -7V0C8 5 4.5 8.5 0 10C-4.5 8.5 -8 5 -8 0V-7Z"/><path class="da-em__v da-em__v--bold" d="M-4 0.2L-1 3.4L4.4 -3"/>',
    // 인성: 펼친 책과 초승달 — 배움과 사색
    reflection: '<path class="da-em__g" d="M-1 -11A4 4 0 1 0 3 -5A3.2 3.2 0 1 1 -1 -11Z"/><g transform="translate(0 1.5)"><path class="da-em__f" d="M0 -1C-3 -3.5 -7 -3.5 -10 -2V8C-7 6.8 -3 6.8 0 9C3 6.8 7 6.8 10 8V-2C7 -3.5 3 -3.5 0 -1Z"/><path class="da-em__v" d="M0 -1V8.5"/></g>'
  };
  var SPARK = 'M0 -5L1.2 -1.2L5 0L1.2 1.2L0 5L-1.2 1.2L-5 0L-1.2 -1.2Z';

  function medalSvg(axis) {
    return '<svg class="da-medal" viewBox="-20 -20 40 40" width="40" height="40" aria-hidden="true" focusable="false">' +
      '<circle class="da-medal__rim" r="19"/><circle class="da-medal__ring" r="17.2"/><circle class="da-medal__face" r="15.6"/>' +
      '<g transform="scale(.92)">' + (AXIS_EMBLEM[axis] || '') + '</g></svg>';
  }

  // 상생 순서(화→토→금→수→목)로 화를 꼭대기에 두고 시계방향 배치. 바깥 호 = 상생, 안쪽 별 = 상극.
  var PENT_ORDER = ['fire', 'earth', 'metal', 'water', 'wood'];
  var PENT_LABEL = {fire: 'top', earth: 'right', metal: 'bottom', water: 'bottom', wood: 'left'};
  function pentagonSvg(el, ui, dominant) {
    var CX = 160, CY = 146, R = 80, TAU = Math.PI * 2;
    var f = function (n) { return Math.round(n * 10) / 10; };
    var by = {};
    el.items.forEach(function (x) { by[x.id] = x; });
    var max = Math.max.apply(null, el.items.map(function (x) { return x.ratio || 0; })) || 1;
    var nodes = PENT_ORDER.map(function (id, i) {
      var a = -Math.PI / 2 + TAU / 5 * i, x = by[id] || {name: id, ratio: 0}, pct = Math.round(x.ratio || 0);
      return {id: id, a: a, x: CX + R * Math.cos(a), y: CY + R * Math.sin(a), r: pct === 0 ? 15 : 15 + 15 * (x.ratio || 0) / max, pct: pct, name: x.name, dom: pct > 0 && dominant === id};
    });
    var flows = nodes.map(function (n, i) {
      var m = nodes[(i + 1) % 5], a1 = n.a + (n.r + 6) / R, a2 = n.a + TAU / 5 - (m.r + 9) / R;
      return '<path class="da-pent__flow" marker-end="url(#da-pent-arrow)" d="M' + f(CX + R * Math.cos(a1)) + ' ' + f(CY + R * Math.sin(a1)) +
        'A' + R + ' ' + R + ' 0 0 1 ' + f(CX + R * Math.cos(a2)) + ' ' + f(CY + R * Math.sin(a2)) + '"/>';
    }).join('');
    var checks = nodes.map(function (n, i) {
      var m = nodes[(i + 2) % 5], dx = m.x - n.x, dy = m.y - n.y, d = Math.sqrt(dx * dx + dy * dy);
      return '<path class="da-pent__check" d="M' + f(n.x + dx / d * (n.r + 5)) + ' ' + f(n.y + dy / d * (n.r + 5)) + 'L' + f(m.x - dx / d * (m.r + 5)) + ' ' + f(m.y - dy / d * (m.r + 5)) + '"/>';
    }).join('');
    var defs = '<defs><marker id="da-pent-arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path class="da-pent__arrow" d="M0 .8L7 4L0 7.2L1.8 4Z"/></marker>' +
      PENT_ORDER.map(function (id) {
        return '<radialGradient id="da-elg-' + id + '" class="da-elc da-elc-' + id + '" cx=".36" cy=".3" r=".78"><stop offset="0" class="da-elg__a"/><stop offset="1" class="da-elg__b"/></radialGradient>';
      }).join('') + '</defs>';
    var medals = nodes.map(function (n) {
      var pos = PENT_LABEL[n.id], lx = n.x, ly, anchor = 'middle', lbl, gap = n.dom ? 6 : 0;
      var nm = '<tspan class="da-pent__nm">' + esc(n.name) + '</tspan>', pc = '<tspan class="da-pent__pc">' + n.pct + '%</tspan>';
      if (pos === 'top') { ly = n.y - n.r - 9 - gap; lbl = nm + ' ' + pc; }
      else if (pos === 'bottom') { ly = n.y + n.r + 18 + gap; lbl = nm + ' ' + pc; }
      else {
        anchor = pos === 'right' ? 'start' : 'end';
        lx = n.x + (pos === 'right' ? 1 : -1) * (n.r + 9 + gap);
        ly = n.y - 3;
        lbl = nm + '<tspan class="da-pent__pc" x="' + f(lx) + '" dy="15">' + n.pct + '%</tspan>';
      }
      return '<g class="da-pent__node da-elc da-elc-' + n.id + (n.dom ? ' is-dominant' : '') + (n.pct === 0 ? ' is-missing' : '') + '" data-da-el-node="' + n.id + '">' +
        '<g transform="translate(' + f(n.x) + ' ' + f(n.y) + ')">' +
        (n.dom ? '<circle class="da-pent__halo" r="' + f(n.r + 6.5) + '"/>' : '') +
        '<circle class="da-pent__rim" r="' + f(n.r + 2.5) + '"/>' +
        '<circle class="da-pent__face" r="' + f(n.r) + '" fill="url(#da-elg-' + n.id + ')"/>' +
        '<g class="da-pent__glyph" transform="scale(' + Math.round(n.r / 18 * 100) / 100 + ')">' + ELEMENT_GLYPH[n.id] + '</g>' +
        (n.dom ? '<path class="da-pent__spark" transform="translate(' + f(-Math.cos(n.a) * (n.r + 17)) + ' ' + f(-Math.sin(n.a) * (n.r + 17)) + ') scale(1.6)" d="' + SPARK + '"/>' : '') +
        '</g><text class="da-pent__lbl" x="' + f(lx) + '" y="' + f(ly) + '" text-anchor="' + anchor + '">' + lbl + '</text></g>';
    }).join('');
    var label = nodes.map(function (n) { return n.name + ' ' + n.pct + '%'; }).join(', ');
    return '<div class="da-pent"><svg class="da-pent__svg" viewBox="0 0 320 268" role="img" aria-label="' + esc(label) + '" focusable="false">' + defs +
      '<g class="da-pent__core" transform="translate(' + CX + ' ' + CY + ')"><circle r="13"/><path d="' + SPARK + '" transform="scale(1.3)"/></g>' +
      checks + flows + medals + '</svg>' +
      '<p class="da-pent__key"><span class="da-pent__key-flow">' + esc(ui.elementsFlow) + '</span><span class="da-pent__key-check">' + esc(ui.elementsCheck) + '</span></p></div>';
  }

  function enginesHtml(model, t) {
    var ui = t.ui;
    var rows = t.engines.map(function (e) {
      var src = e.source.map(function (g) { return godName(g, model.locale); }).filter(Boolean).join(' · ');
      var list = function (arr) { return '<ul class="da-bullets">' + arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; };
      return '<details data-mobile-detail-keep-open class="da-engine da-ax-' + esc(e.axis) + ' da-lv-' + esc(e.level) + '" data-da-engine="' + esc(e.axis) + '">' +
        '<summary class="da-engine__head"><span class="da-engine__medal">' + medalSvg(e.axis) + '</span><span class="da-engine__name"><span class="da-engine__title">' + esc(e.name) + '</span><span class="da-engine__tags"><small>' + esc(e.god) + '</small>' + luckChip(ui, e.luck) + '</span></span>' +
        '<span class="da-engine__level">' + esc(e.levelLabel) + '</span>' +
        '<span class="da-meter" aria-hidden="true"><span class="da-meter__fill" style="width:' + Math.max(4, Math.min(100, e.score)) + '%"></span></span></summary>' +
        '<div class="da-engine__body"><p class="da-combo">' + esc(e.meme) + '</p>' +
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
      var pct = Math.round(x.ratio || 0);
      return '<li class="da-el da-elc da-elc-' + esc(x.id) + (x.id === model.elementLayer.dominant ? ' is-dominant' : '') + (pct === 0 ? ' is-missing' : '') + '">' +
        '<span class="da-el__name"><svg class="da-el__gl" viewBox="-12 -12 24 24" width="18" height="18" aria-hidden="true" focusable="false">' + (ELEMENT_GLYPH[x.id] || '') + '</svg>' + esc(x.name) + '</span><span class="da-meter"><span class="da-meter__fill" style="width:' + Math.round((x.ratio || 0) / max * 100) + '%"></span></span>' +
        '<span class="da-el__pct">' + pct + '%</span><span class="da-el__words">' + esc(x.words) + '</span></li>';
    }).join('');
    return '<section class="da-sec" data-da-sec="elements" aria-labelledby="daElementsTitle"><h4 class="da-h" id="daElementsTitle">' + esc(ui.elementsTitle) + '</h4>' +
      '<p class="da-note">' + esc(ui.elementsSub) + '</p>' + pentagonSvg(el, ui, model.elementLayer.dominant) + '<ul class="da-els">' + bars + '</ul>' +
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
    var guide = hd.guide;
    return head + (guide ? '<p class="da-combo">' + esc(guide.nickname) + '</p><p class="da-p">' + esc(guide.type.example) + '</p><p class="da-p">' + esc(guide.decision) + '</p>' : '') +
      '<div class="da-hd-type"><p class="da-combo">' + esc(hd.typeName) + '</p><p class="da-p">' + esc(hd.typeSummary) + '</p>' +
      '<dl class="da-facts">' +
      (hd.strategy ? '<div><dt>' + esc(ui.strategy) + '</dt><dd>' + esc(hd.strategy) + '</dd></div>' : '') +
      (hd.profile ? '<div><dt>' + esc(ui.profile) + '</dt><dd>' + esc(hd.profile) + '</dd></div>' : '') +
      (hd.definitionName ? '<div><dt>' + esc(ui.definition) + '</dt><dd>' + esc(hd.definitionName) + '</dd></div>' : '') +
      '</dl></div>' +
      '<div class="da-core"><p class="da-sub">' + esc(ui.decisionTitle) + '</p><p class="da-combo">' + esc(hd.authorityName) + '</p>' +
      '<p class="da-p">' + esc(hd.authoritySummary) + '</p>' + (hd.authorityHow ? '<p class="da-p">' + esc(hd.authorityHow) + '</p>' : '') + (guide ? '<p class="da-p">' + esc(guide.authority.action) + '</p><p class="da-sub">' + esc(guide.ui.profile) + '</p>' + guide.profileText.map(function(line) {return '<p class="da-p">' + esc(line) + '</p>';}).join('') + '<p class="da-p">' + esc(guide.profileBridge) + '</p><p class="da-p">' + esc(guide.profileQuestion) + '</p><p class="da-note">' + esc(guide.definitionText) + '</p>' : '') + '</div>' +
      '</section>';
  }

  function hdGraph(t) {
    var geo = root.DestinyAnatomyHdCopy.geometry, h = t.hd, active = h.gates;
    var point = function (p) { return p.x + ' ' + p.y; };
    var lines = geo.channels.map(function (c) {
      var full = h.channels.some(function (x) { return x.id === c.channelId; });
      return [[c.a, c.controlA, c.mid, c.gateA], [c.b, c.controlB, c.mid, c.gateB]].map(function (v) {
        var on = full || active.indexOf(v[3]) >= 0;
        return '<path class="da-hdg__wire' + (full ? ' is-complete' : on ? ' is-active' : '') + '" d="M' + point(v[0]) + (v[1] ? 'Q' + point(v[1]) + ' ' : 'L') + point(v[2]) + '"/>';
      }).join('');
    }).join('');
    var centers = geo.centers.map(function (c) {
      var defined = h.centers.some(function (x) { return x.id === c.center && x.defined; });
      return '<a href="#da-detail-hd-' + esc(c.center) + '" data-da-act="body-detail" data-da-target="hd-' + esc(c.center) + '" aria-label="' + esc(h.centers.filter(function(x){return x.id === c.center;})[0].name) + '"><polygon class="da-hdg__center' + (defined ? ' is-defined' : '') + '" points="' + c.polygon + '"/></a>';
    }).join('');
    var gates = geo.gates.filter(function (g) { return active.indexOf(g.gate) >= 0; }).map(function (g) {
      return '<g class="da-hdg__gate"><circle cx="' + g.x + '" cy="' + g.y + '" r="14"/><text x="' + g.x + '" y="' + (g.y + 5) + '">' + g.gate + '</text></g>';
    }).join('');
    return '<figure class="da-hdg"><figcaption class="da-sub">' + esc(t.charts.hd) + '</figcaption><svg viewBox="0 0 540 1000" role="group" aria-label="' + esc(t.charts.hd) + '">' + lines + centers + gates + '</svg><p class="da-note">' + esc(t.charts.legend) + '</p></figure>';
  }

  function hdConnections(t) {
    var h = t.hd, c = t.charts;
    return '<div class="da-connections"><h5 class="da-sub">' + esc(c.channels) + '</h5>' +
      (h.channels.length ? '<ul>' + h.channels.map(function (v) { return '<li><strong>' + esc(v.id) + '</strong> · ' + esc(v.label) + '</li>'; }).join('') + '</ul>' : '<p class="da-note">' + esc(c.none) + '</p>') +
      '<p class="da-p"><strong>' + esc(c.gates) + '</strong> · ' + esc(h.gates.join(' · ')) + '</p>' + mindBody(t.mbUi, '', c.action, '', '', c.check) + '</div>';
  }

  function vedicChartHtml(t) {
    var v = t.vedicChart, c = t.charts;
    if (!v) return '';
    return '<figure class="da-vchart"><figcaption class="da-sub">' + esc(c.vedic) + '</figcaption><details data-mobile-detail-keep-open data-da-entry="vedic-bhavas"><summary>' + esc(c.show) + '</summary><ol class="da-vchart__houses">' + v.houses.map(function (h) {
      return '<li class="' + (h.house === 1 || h.house === 6 ? 'is-key' : '') + '"><span>' + h.house + ' · ' + esc(c.house) + '</span><strong>' + esc(h.sign) + '</strong></li>';
    }).join('') + '</ol></details><p class="da-note">' + esc(c.vedicNote) + '</p><dl class="da-mb">' + [[c.lagna, v.lagna], [c.sixth, v.sixth], [c.ruler, v.ruler]].map(function (r) { return '<div class="da-mb__row"><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' + mindBody(t.mbUi, '', c.vedicAction, '', '', c.vedicCheck) + '</figure>';
  }

  function bodySvg(t, view) {
    if (t.hd && view !== 'chakra') return '<div class="da-body__diagrams">' + hdGraph(t) + (view === 'both' ? bodySvg(t, 'chakra') : '') + '</div>';
    var showChakra = view !== 'hd' || !t.hd;
    var chakra = showChakra ? t.chakra.map(function (c) {
      var y = CHAKRA_Y[c.id];
      var r = 7 + c.emphasis * 0.09;
      return '<a href="#da-detail-chakra-' + esc(c.id) + '" data-da-act="body-detail" data-da-target="chakra-' + esc(c.id) + '" aria-label="' + esc(c.name) + '"><g class="da-chakra da-ck-' + esc(c.level) + '"><circle class="da-chakra__halo" cx="100" cy="' + y + '" r="' + (r + 7).toFixed(1) + '"/>' +
        '<circle class="da-chakra__dot" cx="100" cy="' + y + '" r="' + r.toFixed(1) + '"/></g><circle class="da-body__hit" cx="100" cy="' + y + '" r="22"/></a>';
    }).join('') : '';
    return '<svg class="da-body__svg" viewBox="0 0 200 400" role="group" aria-label="' + esc(t.ui.bodyTitle) + '">' +
      '<path class="da-body__shape" d="M100 4C120 4 132 20 132 42C132 62 122 78 112 84L112 94C134 98 158 108 164 130L176 214C178 226 166 230 162 218L150 150L148 228C148 252 144 270 140 286L136 390C136 398 116 398 116 390L106 300L94 300L84 390C84 398 64 398 64 390L60 286C56 270 52 252 52 228L50 150L38 218C34 230 22 226 24 214L36 130C42 108 66 98 88 94L88 84C78 78 68 62 68 42C68 20 80 4 100 4Z"/>' +
      '<line class="da-body__spine" x1="100" y1="18" x2="100" y2="310"/>' + chakra + '</svg>';
  }

  function bodyHtml(model, t, state) {
    var ui = t.ui;
    var view = t.hd ? state.view : 'chakra';
    var toggle = t.hd ? '<div class="da-toggle" role="group" aria-label="' + esc(ui.bodyTitle) + '">' + ['hd', 'chakra', 'both'].map(function (v) {
      return '<button type="button" class="da-toggle__btn" data-da-act="view" data-da-view="' + v + '" aria-pressed="' + (view === v ? 'true' : 'false') + '">' + esc(ui.toggle[v]) + '</button>';
    }).join('') + '</div>' : '';
    var mbUi = t.mbUi;
    var list = '<p class="da-note">' + esc(view === 'hd' ? t.recovery.hdSource : t.recovery.chakraSource) + '</p>';
    if (t.hd && view !== 'chakra') {
      list += '<ul class="da-centers">' + t.hd.centers.map(function (c) {
        return '<li><details data-mobile-detail-keep-open id="da-detail-hd-' + esc(c.id) + '" data-da-entry="hd-' + esc(c.id) + '" class="da-centers__item' + (c.defined ? ' is-defined' : '') + '"><summary><span class="da-centers__name">' + esc(c.name) + '</span>' +
          '<span class="da-centers__state">' + esc(c.defined ? ui.centerDefined : ui.centerOpen) + '</span></summary>' +
          (c.guide ? '<p class="da-combo">' + esc(c.guide.meme) + '</p><p class="da-p">' + esc(c.guide.label + ' · ' + c.guide.summary) + '</p><p class="da-p">' + esc(c.guide.action) + '</p><p class="da-note">' + esc(c.guide.question) + '</p>' : '') +
          (c.role ? '<span class="da-centers__role">' + esc(c.role) + '</span>' : '') +
          mindBody(mbUi, c.mind, c.body, mbUi.organ, c.role, c.check) + '</details></li>';
      }).join('') + '</ul>' + hdConnections(t);
    }
    if (view !== 'hd') {
      list += '<ul class="da-chakras">' + t.chakra.map(function (c) {
        return '<li><details data-mobile-detail-keep-open id="da-detail-chakra-' + esc(c.id) + '" data-da-entry="chakra-' + esc(c.id) + '" class="da-chakras__item da-ck-' + esc(c.level) + '"><summary><span class="da-centers__name">' + esc(c.name) + '</span>' +
          '<span class="da-centers__state">' + esc(c.levelLabel) + '</span></summary><span class="da-centers__role">' + esc(c.theme) + '</span>' +
          mindBody(mbUi, c.mind, c.body, mbUi.region, c.theme, c.check) + '</details></li>';
      }).join('') + '</ul><p class="da-note">' + esc(ui.chakraNote) + '</p>';
    }
    return '<section class="da-sec da-body" data-da-sec="body" aria-labelledby="daBodyTitle">' + (t.hd ? illustration('hd') : '') + '<h4 class="da-h" id="daBodyTitle">' + esc(ui.bodyTitle) + '</h4>' +
      '<p class="da-note da-mb-lead">' + esc(mbUi.lead) + '</p>' +
      toggle + '<div class="da-body__grid">' + bodySvg(t, view) + '<div class="da-body__list">' + list + '</div></div>' +
      '<p class="da-note da-mb-note" role="note">' + esc(mbUi.note) + '</p></section>';
  }

  /* 정신·신체 두 줄 + 상징 연결(기관·부위). 값이 빈 줄은 그리지 않는다. */
  function mindBody(mbUi, mind, body, tagLabel, tag, check) {
    var rows = (mind ? '<div class="da-mb__row da-mb--mind"><dt>' + esc(mbUi.mind) + '</dt><dd>' + esc(mind) + '</dd></div>' : '') +
      (check ? '<div class="da-mb__row"><dt>' + esc(mbUi.check) + '</dt><dd>' + esc(check) + '</dd></div>' : '') +
      (body ? '<div class="da-mb__row da-mb--body"><dt>' + esc(mbUi.body) + '</dt><dd>' + esc(body) + '</dd></div>' : '');
    return (rows ? '<dl class="da-mb">' + rows + '</dl>' : '') +
      (tag ? '<p class="da-mb__tag"><span>' + esc(tagLabel) + '</span> ' + esc(tag) + '</p>' : '');
  }

  function vedicHtml(t) {
    if (!t.vedic.length) return '';
    var mbUi = t.mbUi;
    var group = function (g, label) {
      var rows = t.vedic.filter(function (v) { return (v.group || 'mind') === g; });
      if (!rows.length) return '';
      return '<div class="da-vgroup da-mb--' + g + '"><p class="da-vgroup__h">' + esc(label) + '</p>' + rows.map(function (v) {
        return '<div class="da-vrow"><p class="da-sub">' + esc(v.title) + '</p>' +
          (v.region ? '<p class="da-mb__tag"><span>' + esc(mbUi.region) + '</span> ' + esc(v.region) + '</p>' : '') +
          (v.check ? '<p class="da-p"><strong>' + esc(mbUi.check) + '</strong> ' + esc(v.check) + '</p>' : '') +
          '<p class="da-p">' + (v.check ? '<strong>' + esc(mbUi.body) + '</strong> ' : '') + esc(v.body) + '</p></div>';
      }).join('') + '</div>';
    };
    var hasBody = t.vedic.some(function (v) { return v.group === 'body'; });
    return '<section class="da-sec" data-da-sec="vedic" aria-labelledby="daVedicTitle">' + illustration('vedic') + '<h4 class="da-h" id="daVedicTitle">' + esc(t.ui.vedicTitle) + '</h4>' +
      '<p class="da-note">' + esc(t.recovery.vedicSource) + '</p>' +
      vedicChartHtml(t) + group('mind', mbUi.vedicMind) + group('body', mbUi.vedicBody) +
      (hasBody ? '<p class="da-note da-mb-note" role="note">' + esc(mbUi.note) + '</p>' : '') + '</section>';
  }

  function insightsHtml(t) {
    return '<section class="da-sec" data-da-sec="fusion" aria-labelledby="daCrossTitle"><h4 class="da-h" id="daCrossTitle">' + esc(t.ui.crossTitle) + '</h4>' +
      t.insights.map(function (i) {
        return '<article class="da-insight"><span class="da-badge da-badge--' + esc(i.badge) + '">' + esc(i.badgeLabel) + '</span>' +
          '<p class="da-sub">' + esc(i.title) + '</p><p class="da-p">' + esc(i.body) + '</p></article>';
      }).join('') + '</section>';
  }

  /* 연이의 한마디 — 리포트 첫 장의 편지. 연이 마크(/ggulggul/ 머리말과 같은 자산)를 금 테 인장 안에 둔다. */
  var YEONI_MARK = '/images/yeoni/welcome/yeoni-mark-v1-';
  function letterHtml(t) {
    var ui = t.ui;
    return '<div class="da-letter"><div class="da-letter__seal" aria-hidden="true">' +
      '<img src="' + YEONI_MARK + '96.webp" srcset="' + YEONI_MARK + '96.webp 1x, ' + YEONI_MARK + '192.webp 2x" width="56" height="56" alt="" loading="lazy" decoding="async">' +
      '<svg class="da-letter__ring" viewBox="0 0 72 72" aria-hidden="true" focusable="false"><circle cx="36" cy="36" r="34.5"/><circle class="da-letter__ring-in" cx="36" cy="36" r="31"/></svg></div>' +
      '<div class="da-letter__text"><p class="da-letter__label">' + esc(ui.nyangLabel) + '</p><p class="da-letter__msg">' + esc(t.nyang) + '</p>' +
      '<p class="da-letter__sign">' + esc(ui.nyangSign) + '</p></div></div>';
  }

  /* 챕터마다 꽃돼지 연이가 제목 아래에서 한두 문장으로 풀어 준다. 포즈는 차방 결과에서 쓰는 꽃돼지 안내 자산(renewal, 투명 배경)이고
   * 챕터별로 하나씩 고정한다. 그림은 장식이라 alt 를 비우고, 해설 문장이 내용을 맡는다. */
  var YEONI_POSE_DIR = '/images/fortune-tea-house/renewal/pig-';
  var YEONI_POSE = {circuit: 'thinking', engines: 'listening', elements: 'cheer', decision: 'advice', body: 'empathy', vedic: 'waiting', fusion: 'completed', ask: 'welcome'};
  var YEONI_PETAL = '<svg class="da-yeoni__petal" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="8" cy="4.2" r="2.6"/><circle cx="11.6" cy="6.8" r="2.6"/><circle cx="10.2" cy="11" r="2.6"/><circle cx="5.8" cy="11" r="2.6"/><circle cx="4.4" cy="6.8" r="2.6"/><circle class="da-yeoni__bloom" cx="8" cy="8" r="1.7"/></svg>';
  function yeoniNoteHtml(t, id) {
    var y = t.yeoni, line = y && y.short && y.short[id];
    if (!line || !YEONI_POSE[id]) return '';
    return '<aside class="da-yeoni" data-da-yeoni="' + esc(id) + '" aria-label="' + esc(y.label) + '">' +
      '<img class="da-yeoni__pig" src="' + YEONI_POSE_DIR + YEONI_POSE[id] + '.webp" width="72" height="96" alt="" loading="lazy" decoding="async">' +
      '<div class="da-yeoni__bubble"><p class="da-yeoni__msg">' + esc(line) + '</p></div></aside>';
  }
  function summaryHtml(model, t) {
    var ui = t.ui;
    return '<section class="da-sec da-summary" data-da-sec="summary" aria-labelledby="daSummaryTitle"><h4 class="da-h" id="daSummaryTitle">' + esc(ui.summaryTitle) + '</h4>' +
      letterHtml(t) +
      '<p class="da-mindline">' + esc(t.mindLine) + '</p>' +
      '<p class="da-core-engine"><span>' + esc(ui.coreEngine) + '</span> ' + esc(model.fusion.headline) + '</p>' +
      '<dl class="da-rows">' + t.summary.map(function (r) { return '<div><dt>' + esc(r.label) + '</dt><dd>' + esc(r.value) + '</dd></div>'; }).join('') + '</dl>' +
      '<p class="da-tags">' + model.share.keywords.map(function (k) { return '<span class="da-tag">#' + esc(k) + '</span>'; }).join('') + '</p></section>';
  }

  /* "나는 어떤 사람이야?" — 계산값만 담은 질문(copy.aiPrompt)을 복사하고 외부 AI 를 새 탭으로 연다. 자동 전송은 없다. */
  var AI_TARGETS = {
    chatgpt: {label: 'ChatGPT', url: 'https://chatgpt.com/'},
    gemini: {label: 'Gemini', url: 'https://gemini.google.com/app'},
    claude: {label: 'Claude', url: 'https://claude.ai/new'}
  };
  function askHtml(t, state) {
    var ui = t.ui;
    if (!t.aiPrompt) return '';
    var ais = Object.keys(AI_TARGETS).map(function (k) {
      return '<button type="button" class="da-btn da-btn--ghost da-ask__ai" data-da-act="ask" data-da-ai="' + k + '">' + esc(ui.askOpen.replace('{ai}', AI_TARGETS[k].label)) + '</button>';
    }).join('');
    return '<section class="da-sec da-ask" data-da-sec="ask" aria-labelledby="daAskTitle"><h4 class="da-h" id="daAskTitle">' + esc(ui.askTitle) + '</h4>' +
      '<p class="da-p">' + esc(ui.askLead) + '</p>' +
      '<div class="da-ask__actions"><button type="button" class="da-btn da-btn--primary" data-da-act="ask" data-da-ai="copy">' + esc(ui.askCopy) + '</button>' +
      '<div class="da-ask__ais" role="group" aria-label="' + esc(ui.askNav) + '">' + ais + '</div></div>' +
      '<p class="da-note da-ask__status" role="status" aria-live="polite">' + esc(state.askStatus || '') + '</p>' +
      '<details data-mobile-detail-keep-open class="da-ask__view"' + (state.askView ? ' open' : '') + '><summary>' + esc(ui.askView) + '</summary>' +
      '<pre class="da-ask__prompt" tabindex="0">' + esc(t.aiPrompt) + '</pre></details>' +
      '<p class="da-note">' + esc(ui.askPrivacy) + '</p></section>';
  }

  function shareHtml(t, state) {
    var ui = t.ui;
    return '<section class="da-sec da-share" data-da-sec="share" aria-labelledby="daShareTitle"><h4 class="da-h" id="daShareTitle">' + esc(ui.shareTitle) + '</h4>' +
      '<p class="da-p">' + esc(t.recovery.shareQuestion) + '</p>' +
      '<p class="da-note">' + esc(ui.shareSub) + '</p><div class="da-actions" role="group" aria-label="' + esc(ui.saveAction) + '">' + ['feed','story'].map(function(f) { return '<button type="button" class="da-btn da-btn--ghost" data-da-act="format" data-da-format="' + f + '" aria-pressed="' + ((state.shareFormat || 'feed') === f) + '">' + esc(t.shareFormats[f]) + (f === 'feed' ? ' 4:5' : ' 9:16') + '</button>'; }).join('') + '</div><div class="da-actions">' +
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
    var items = t.cta.filter(function (c) { return c.id !== 'hd'; }).map(function (c) {
      var tg = CTA_TARGET[c.id];
      if (!tg) return '';
      var inner = '<span class="da-cta__q">' + esc(c.q) + '</span><span class="da-cta__label">' + esc(c.label) + '</span>';
      if (tg.href) return '<li><a class="da-cta" href="' + esc(tg.href) + '" data-da-act="cta" data-da-cta="' + esc(c.id) + '">' + inner + '</a></li>';
      if (!root.document || !root.document.getElementById(tg.scroll)) return '';
      return '<li><button type="button" class="da-cta" data-da-act="cta" data-da-cta="' + esc(c.id) + '" data-da-scroll="' + esc(tg.scroll) + '">' + inner + '</button></li>';
    }).join('');
    return '<section class="da-sec da-ctas" data-da-sec="cta" aria-labelledby="daCtaTitle"><h4 class="da-h" id="daCtaTitle">' + esc(t.ui.ctaTitle) + '</h4><ul class="da-cta-list">' + items + '</ul></section>';
  }

  function habitsHtml(t) {
    var h = t.recovery;
    return '<section class="da-sec" data-da-sec="habits" aria-labelledby="daHabitsTitle"><h4 class="da-h" id="daHabitsTitle">' + esc(h.title) + '</h4>' +
      '<p class="da-note">' + esc(h.intro) + '</p>' + t.habits.map(function (r) {
        return '<article class="da-habit"><h5 class="da-sub">' + esc(r.title) + '</h5><dl class="da-mb">' +
          [[h.basis, r.basis], [h.pattern, r.pattern], [h.check, r.check], [h.action, r.action]].map(function (row) {
            return '<div class="da-mb__row"><dt>' + esc(row[0]) + '</dt><dd>' + esc(row[1]) + '</dd></div>';
          }).join('') + '</dl></article>';
      }).join('') + '</section>';
  }

  function entryHtml(ui) {
    var e = ui.entry;
    return '<summary class="da-entry" data-da-trigger><span class="da-entry__art">' + illustration('brain') + '</span>' +
      '<span class="da-entry__copy"><span class="da-entry__title" id="destinyAnatomyTitle">' + esc(e.title) + '</span><span class="da-entry__description">' + esc(e.description) + '</span>' +
      '<span class="da-entry__action"><span class="da-entry__open">' + esc(e.open) + '</span><span class="da-entry__close">' + esc(e.close) + '</span><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span></span></summary>';
  }

  function chartLinksHtml(ui) {
    var e = ui.entry;
    return '<nav class="da-chart-links" aria-label="' + esc(e.linksTitle) + '">' + ['hd', 'vedic'].map(function (id) {
      var href = id === 'hd' ? '/human-design/' : '/vedic/';
      return '<a class="da-chart-link" href="' + href + '?from=destiny_anatomy" data-da-act="cta" data-da-cta="' + id + '">' + illustration(id) +
        '<span><strong>' + esc(e[id + 'Title']) + '</strong><span class="da-chart-link__description">' + esc(e[id + 'Description']) + '</span><span class="da-chart-link__action">' + esc(e[id + 'Action']) + '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span></span></a>';
    }).join('') + '</nav>';
  }

  function render(container, model, opts) {
    var state = opts || {}, t = model.text, ui = t.ui, variant = state.variant || 'A';
    // Opt out of the shell first-paint collapse: this renderer owns disclosure state.
    // DOM is the source of truth for native disclosures, including async layer repaint.
    var open = [];
    container.querySelectorAll('details[open][data-da-chapter], details[open][data-da-entry]').forEach(function (d) {
      open.push([d.hasAttribute('data-da-chapter') ? 'data-da-chapter' : 'data-da-entry', d.getAttribute('data-da-chapter') || d.getAttribute('data-da-entry')]);
    });
    var html = section('hero', ui, function () { return heroHtml(t, variant); }) +
      section('brain', ui, function () { return brainHtml(model, t, state); }) +
      section('share', ui, function () { return shareHtml(t, state); });
    {
      var safe = function (id, fn) { return section(id, ui, fn); };
      var groups = [
        {guide: 'circuit', content: function () { return safe('circuit', function () { return circuitHtml(model, t); }) + safe('engines', function () { return enginesHtml(model, t); }) + safe('elements', function () { return elementsHtml(model, t); }); }},
        {guide: 'decision', content: function () { return safe('decision', function () { return decisionHtml(model, t, state); }) + '<p class="da-p">' + esc(t.recovery.relation) + '</p>' + safe('fusion', function () { return insightsHtml(t); }); }},
        {guide: 'body', content: function () { return safe('habits', function () { return habitsHtml(t); }) + safe('body', function () { return bodyHtml(model, t, state); }) + safe('vedic', function () { return vedicHtml(t); }); }}
      ];
      html += '<div class="da-body-wrap" id="daBody">' + safe('summary', function () { return summaryHtml(model, t); }) +
        groups.map(function (g, i) {
          var c = t.recovery.chapters[i];
          return '<details data-mobile-detail-keep-open class="da-chapter" data-da-chapter="' + esc(c.id) + '"><summary><span class="da-chapter__title">' + esc(c.title) + '</span><span class="da-chapter__hint">' + esc(c.hint) + '</span></summary>' +
            '<div class="da-chapter__content">' + yeoniNoteHtml(t, g.guide) + g.content() + '</div></details>';
        }).join('') + chartLinksHtml(ui) + safe('ask', function () { return askHtml(t, state); }) + safe('cta', function () { return ctaHtml(t); }) +
        '<p class="da-disclaimer">' + esc(ui.disclaimer) + '</p></div>';
    }
    container.innerHTML = '<details class="da-report" data-da-report data-mobile-detail-keep-open' + (state.open ? ' open' : '') + '>' + entryHtml(ui) + '<div class="da-report__content">' + html + '<button type="button" class="da-btn da-btn--ghost da-report__close" data-da-act="collapse">' + esc(ui.entry.close) + '</button></div></details>';
    open.forEach(function (entry) { var d = container.querySelector('details[' + entry[0] + '="' + entry[1] + '"]'); if (d) d.open = true; });
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

  var api = {render: render, renderSkeleton: renderSkeleton, renderError: renderError, fitMeme: fitMeme, CTA_TARGET: CTA_TARGET, AI_TARGETS: AI_TARGETS};
  root.DestinyAnatomyRender = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);

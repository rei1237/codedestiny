/* Rich Korean saju reading (display only). Facts + mode in, HTML out.
 * No calculation of new verdicts, no requests, no storage. Engine tables are read from the page globals
 * (or facts.lib in tests); the score breakdowns are re-derived for display and shown only when they add up
 * to the engine's own result (fail-closed). */
(function (root) {
  'use strict';
  var EL = {wood:'목(木)', fire:'화(火)', earth:'토(土)', metal:'금(金)', water:'수(水)'};
  var POS = [['y','g','년간'],['y','j','년지'],['m','g','월간'],['m','j','월지'],['d','g','일간'],['d','j','일지'],['h','g','시간'],['h','j','시지']];
  var SEASON = {'寅':'봄','卯':'봄','辰':'봄','巳':'여름','午':'여름','未':'여름','申':'가을','酉':'가을','戌':'가을','亥':'겨울','子':'겨울','丑':'겨울'};
  var BRANCH_TEMP = {'子':-4,'丑':-4,'寅':-1,'卯':1,'辰':2,'巳':3,'午':4,'未':4,'申':1,'酉':-1,'戌':-2,'亥':-3};
  var CHAR_TEMP = {fire:1.5, water:-1.5, wood:0.5, metal:-0.5, earth:0};

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (ch) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]; }); }
  function fmt(t, v) { return String(t).replace(/\{(\w+)\}/g, function (_, k) { return v[k] == null ? '' : v[k]; }); }
  function num(n) { var r = Math.round(n * 10) / 10; return (r > 0 ? '+' : r < 0 ? '−' : '') + String(Math.abs(r)); }
  function pct(v, min, max) { return Math.round(Math.max(0, Math.min(1, (v - min) / (max - min))) * 1000) / 10; }
  function lib(facts) { return (facts && facts.lib) || root; }
  function elOf(L, c) { return (L.GAN[c] && L.GAN[c].e) || (L.JI[c] && L.JI[c].e) || null; }
  function family(L, dayEl, el) {
    if (!el) return '';
    if (el === dayEl) return 'same';
    if (el === L.parentOf(dayEl)) return 'parent';
    if (el === L.SHENG[dayEl]) return 'drain';
    if (el === L.KE[dayEl]) return 'wealth';
    if (L.KE[el] === dayEl) return 'control';
    return '';
  }

  /* 억부 점수 구성 — 엔진 calcPower 와 같은 규칙. 합계가 엔진 점수와 다르면 쓰지 않는다. */
  var MONTH_DELTA = {same:40, parent:27, control:-27, drain:-10, wealth:0};
  var DAY_DELTA = {same:13, parent:13, control:-9, drain:0, wealth:0};
  var REST_DELTA = {same:7, parent:7, control:-7, drain:0, wealth:0};
  function powerParts(p, L) {
    L = L || root;
    var dayEl = p && p.d && L.GAN[p.d.g] && L.GAN[p.d.g].e;
    if (!dayEl) return null;
    var rows = [], total = 0;
    function add(k, s, label, table, group) {
      var c = p[k] && p[k][s], el = c ? elOf(L, c) : null;
      if (!el) return;
      var f = family(L, dayEl, el), d = table[f] || 0;
      rows.push({key:k, label:label, char:c, el:el, family:f, delta:d, group:group});
      total += d;
    }
    POS.forEach(function (pos) {
      if (pos[0] === 'd' && pos[1] === 'g') return;
      var group = pos[0] === 'm' && pos[1] === 'j' ? 'month' : pos[0] === 'd' ? 'day' : 'rest';
      add(pos[0], pos[1], pos[2], group === 'month' ? MONTH_DELTA : group === 'day' ? DAY_DELTA : REST_DELTA, group);
    });
    return {rows:rows, total:total, dayEl:dayEl};
  }
  /* 조후 구성 — 엔진 analyzeJohu 와 같은 규칙(월지별 기본 온도 + 글자별 온도, 습·조 개수). */
  function johuParts(p, L) {
    L = L || root;
    if (!p || !p.m || !p.m.j) return null;
    var season = SEASON[p.m.j] || '봄', base = p.m.j in BRANCH_TEMP ? BRANCH_TEMP[p.m.j] : 2, total = base, moist = 0, dry = 0, rows = [];
    POS.forEach(function (pos) {
      var c = p[pos[0]] && p[pos[0]][pos[1]], el = c ? elOf(L, c) : null;
      if (!c) return;
      var t = CHAR_TEMP[el] || 0, m = el === 'water' || el === 'wood' ? 1 : 0, d = el === 'fire' || el === 'metal' ? 1 : 0;
      if (L.JI[c]) { if (c === '辰' || c === '丑') m++; if (c === '戌' || c === '未') d++; }
      total += t; moist += m; dry += d;
      rows.push({key:pos[0], label:pos[2], char:c, el:el, temp:t, moist:m, dry:d});
    });
    return {season:season, seasonTemp:base, rows:rows, total:total, moist:moist, dry:dry};
  }
  function powerMatches(parts, power) { return !!(parts && power && parts.total === power.score); }
  function johuMatches(parts, johu) { return !!(parts && johu && Math.abs(parts.total - johu.score) < 1e-9 && parts.moist === johu.moistCnt && parts.dry === johu.dryCnt); }

  /* ── 공통 조각 ── */
  function section(title, body, cls) { return '<section class="saju-rich__block' + (cls ? ' ' + cls : '') + '"><h4>' + esc(title) + '</h4>' + body + '</section>'; }
  function para(text) { return '<p>' + esc(text) + '</p>'; }
  // 표시 전용 물상: 일간과 월지는 이미 계산된 글자를 그대로 사용한다.
  var STEM_ART = {
    '甲':['gap','wood','갑목 · 곧게 자라는 큰 나무'], '乙':['eul','wood','을목 · 유연하게 뻗는 풀과 꽃'],
    '丙':['byeong','fire','병화 · 넓게 비추는 태양'], '丁':['jeong','fire','정화 · 고요히 밝히는 등불'],
    '戊':['mu','earth','무토 · 중심을 지키는 산'], '己':['gi','earth','기토 · 생명을 품는 흙'],
    '庚':['gyeong','metal','경금 · 단단한 원석'], '辛':['sin','metal','신금 · 섬세하게 다듬은 보석'],
    '壬':['im','water','임수 · 넓고 깊은 바다'], '癸':['gye','water','계수 · 스며드는 비와 이슬']
  };
  var SEASON_ART = {'봄':['spring','wood'],'여름':['summer','fire'],'가을':['autumn','metal'],'겨울':['winter','water']};
  function natureFigure(id, element, title, note) {
    return '<figure class="saju-nature" data-el="'+element+'"><img src="/images/saju/nature/'+id+'-960.webp" srcset="/images/saju/nature/'+id+'-480.webp 480w, /images/saju/nature/'+id+'-960.webp 960w" sizes="(max-width:600px) 100vw, 760px" width="960" height="640" alt="'+esc(title)+'" loading="lazy" decoding="async"><figcaption><strong>'+esc(title)+'</strong><span>'+esc(note)+'</span></figcaption></figure>';
  }
  function stemArt(stem, label) {
    var a = STEM_ART[stem];
    return a ? natureFigure(a[0], a[1], a[2], (label || '일간의 물상')+' · '+EL[a[1]]+' · 성질을 이해하기 위한 자연의 비유') : '';
  }
  function stemThumb(stem) {
    var a = STEM_ART[stem];
    return a ? '<img class="saju-nature-thumb" src="/images/saju/nature/'+a[0]+'-480.webp" width="480" height="320" alt="'+esc(a[2])+'" loading="lazy" decoding="async">' : '';
  }
  function seasonArt(branch, label) {
    var season = SEASON[branch], a = SEASON_ART[season];
    return a ? natureFigure(a[0], a[1], season+'의 풍경', (label || '태어난 월지')+' '+branch+' · 절기 기준의 계절을 표현한 그림') : '';
  }
  function elementKey() {
    return '<ul class="saju-element-key" aria-label="오행 색상 안내">'+Object.keys(EL).map(function(e){return '<li data-el="'+e+'"><i aria-hidden="true"></i>'+EL[e]+'</li>';}).join('')+'</ul>';
  }
  // 권한 확인 후 전달된 본문에만 도판을 붙인다. 요청·권한·서버 본문은 변경하지 않는다.
  function decorateDelivered(host, row, pillars) {
    if (!host || host.querySelector('[data-cd-summary-fallback]')) return;
    var cycle = host.querySelector('.saju-cycle-guide');
    var stem = cycle ? cycle.getAttribute('data-cycle-gan') : row ? row.gan : pillars && pillars.d && pillars.d.g;
    if (!STEM_ART[stem]) return;
    host.classList.add('saju-nature-report');
    host.setAttribute('data-day-el', STEM_ART[stem][1]);
    var cover = document.createElement('div');
    cover.className = 'saju-nature-cover saju-reading';
    cover.innerHTML = stemArt(stem, cycle || row ? '선택한 대운 천간의 물상' : '일간의 물상')+elementKey();
    var previousCover = host.querySelector('.saju-nature-cover');
    if (previousCover) previousCover.replaceWith(cover);
    else host.prepend(cover);
    var report = host.querySelector('.saju-summary-report');
    if (report) {
      // Stable chapter IDs also work with saved reports. Pictures illustrate the
      // topic, never infer another element, verdict, or future event.
      report.querySelectorAll('[data-summary-art]').forEach(function(node){ node.remove(); });
      cover.remove(); // Each summary chapter owns its image; avoid a duplicate cover.
      var pictures = [
        ['chongpyeong', stemArt(stem)],
        ['johu', seasonArt(pillars && pillars.m && pillars.m.j)],
        ['eokbu', natureFigure('gyeong', 'metal', '힘을 받치고 다듬는 균형', '원석을 다듬듯 나를 돕는 힘과 부담을 함께 살펴보세요. 강약의 균형을 표현한 상징 이미지입니다.')],
        ['wollyeong', seasonArt(pillars && pillars.m && pillars.m.j, '월령의 계절')],
        ['ohaeng', natureFigure('spring', 'wood', '서로 다른 기운이 이루는 풍경', '나무와 물, 햇빛과 땅이 함께 풍경을 이루듯 오행의 분포를 읽습니다. 특정 오행의 우세를 뜻하지 않는 상징 이미지입니다.')],
        ['sipseong', natureFigure('summer', 'fire', '서로 연결되어 드러나는 역할', '숲의 가지들이 다른 자리를 채우듯 십성이 맡는 역할을 살펴보세요. 십성의 관계를 표현한 상징 이미지입니다.')],
        ['seonggyeok', natureFigure('im', 'water', '내면의 깊이와 마음의 흐름', '수면 아래의 깊이를 살피듯 반복되는 감정과 선택을 돌아보세요. 성격을 이해하기 위한 상징 이미지입니다.')],
        ['jinro', natureFigure('gap', 'wood', '나의 방향을 세우는 일', '곧게 자라는 나무처럼, 강점을 펼칠 환경을 살펴보세요. 진로를 이해하기 위한 상징 이미지입니다.')],
        ['yeonae', natureFigure('eul', 'wood', '서로의 속도를 존중하는 관계', '서로 다른 방향으로 피어나는 꽃처럼, 가까운 사이에도 각자의 리듬이 있습니다. 관계를 표현한 상징 이미지입니다.')],
        ['sinsal', natureFigure('jeong', 'fire', '특별한 신호를 차분히 읽는 빛', '등불로 한 부분을 비추듯 신살은 원국과 함께 읽는 보조 단서입니다. 길흉을 확정하는 그림이 아닙니다.')],
        ['geongang', natureFigure('gye', 'water', '쉬고 회복하는 일상의 리듬', '풀잎의 이슬처럼 작은 휴식과 생활 습관을 돌아보세요. 회복을 표현한 상징이며 건강 상태를 진단하지 않습니다.')],
        ['jaemul', natureFigure('gi', 'earth', '차곡차곡 가꾸는 삶의 기반', '흙을 돌보듯 수입과 지출의 습관을 살펴보세요. 재물의 축적을 표현한 상징 이미지입니다.')],
        ['guiin', natureFigure('gap', 'wood', '함께 기대고 자라는 관계', '나무 그늘처럼 서로의 힘이 되는 관계를 살펴보세요. 특정 인물의 등장을 예고하지 않는 상징 이미지입니다.')],
        ['gaeun', natureFigure('byeong', 'fire', '일상에 작은 변화를 비추는 빛', '햇살이 하루를 밝히듯 지금 바꿀 수 있는 습관부터 골라보세요. 운의 결과를 보장하지 않는 실천의 상징입니다.')],
        ['olhae', natureFigure('autumn', 'metal', '시기의 변화를 준비하는 풍경', '계절의 전환처럼 올해와 내년의 계산 근거를 비교합니다. 특정 계절의 길흉을 예고하는 그림이 아닙니다.')],
        ['jeollyak', natureFigure('mu', 'earth', '멀리 바라보고, 한 걸음씩', '산길을 걷듯 지금 실천할 수 있는 작은 선택부터 정리해 보세요. 삶의 방향을 표현한 상징 이미지입니다.')]
      ];
      pictures.forEach(function(item){
        var chapter = report.querySelector('#sajuSummaryChapter-'+item[0]);
        if (!chapter || !item[1]) return;
        var art = document.createElement('div');
        art.className = 'saju-reading saju-nature-insert saju-summary-art';
        art.setAttribute('data-summary-art', item[0]);
        art.innerHTML = item[1];
        var body = chapter.querySelector('.saju-summary-chapter__body');
        if (body) body.prepend(art);
      });
      report.querySelectorAll('.saju-summary-illustration').forEach(function(node){ node.remove(); });
      return;
    }
    host.querySelectorAll('.saju-summary-illustration').forEach(function(node,i){
      var branch = pillars && pillars.m && pillars.m.j;
      if (i === 0 && branch) node.outerHTML = '<div class="saju-reading saju-nature-insert">'+seasonArt(branch)+'</div>';
      else node.remove();
    });
  }
  function gauge(o) {
    var at = 0, i;
    for (i = 0; i < o.zones.length; i++) if (o.value >= o.zones[i]) at = i + 1;
    return '<figure class="saju-gauge saju-gauge--' + o.kind + '" role="img" aria-label="' + esc(o.aria) + '">' +
      '<div class="saju-gauge__bar">' + o.names.map(function (_, j) { return '<span' + (j === at ? ' data-on' : '') + '></span>'; }).join('') +
      (o.base != null ? '<i class="saju-gauge__base" style="--pos:' + pct(o.base, o.min, o.max) + '%" data-label="' + esc(o.baseLabel || '') + '"></i>' : '') +
      '<i class="saju-gauge__mark" style="--pos:' + pct(o.value, o.min, o.max) + '%"></i></div>' +
      '<div class="saju-gauge__ends" aria-hidden="true"><span>' + esc(o.ends[0]) + '</span><span>' + esc(o.ends[1]) + '</span></div>' +
      '<figcaption><strong>' + esc(o.names[at]) + '</strong> · ' + esc(o.caption) + '</figcaption></figure>';
  }
  // 표 칸은 기본 줄바꿈 없음(360px 에서 '금(金)'·'+13' 이 글자 중간에서 끊기던 문제). 긴 문장 칸만 줄바꿈을 허용하되 '수(水)' 같은 한글(한자) 묶음은 붙여 둔다.
  function cellHtml(cell, i, label) {
    var t = String(cell), long = t.length > 12, wrap = long ? ' class="saju-table__wrap"' : '';
    var body = long ? esc(t).replace(/([가-힣]+\([一-鿿]+\))/g, '<span class="saju-table__keep">$1</span>') : esc(t);
    return i === 0 ? '<th scope="row"' + (label === true ? ' role="rowheader"' : '') + wrap + '>' + body + '</th>' : '<td' + (label ? ' data-label="' + esc(label) + '" role="cell"' : '') + wrap + '>' + body + '</td>';
  }
  // 네 칸 이상인 표는 좁은 화면에서 행마다 카드로 쌓는다(칸 이름은 data-label). 360px 에서 오른쪽 칸이 잘리던 문제.
  // 쌓으면 display:block 이 표 의미를 벗기는 엔진이 있어 table 역할을 명시하고, 열 머리는 숨기지 않고 시각적으로만 감춘다(CSS).
  function table(caption, head, rows, foot) {
    var stack = head.length >= 4;
    var row = function (r) { return '<tr' + (stack ? ' role="row"' : '') + '>' + r.map(function (c, i) { return cellHtml(c, i, stack ? (i === 0 ? true : head[i]) : ''); }).join('') + '</tr>'; };
    var R = function (role) { return stack ? ' role="' + role + '"' : ''; };
    return '<div class="saju-table-wrap"><table class="saju-table' + (stack ? ' saju-table--stack' : '') + '"' + R('table') + '><caption>' + esc(caption) + '</caption><thead' + R('rowgroup') + '><tr' + R('row') + '>' + head.map(function (h) { return '<th scope="col"' + R('columnheader') + '>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody' + R('rowgroup') + '>' +
      rows.map(row).join('') + '</tbody>' + (foot ? '<tfoot' + R('rowgroup') + '>' + row(foot) + '</tfoot>' : '') + '</table></div>';
  }
  // 섹션 첫머리: 큰 제목 한 줄과 판정 배지. 첫 배지만 강조색(섹션당 지표 하나).
  function hero(title, badges, ganji) {
    var list = (badges || []).filter(Boolean);
    return '<div class="saju-hero' + (ganji ? ' saju-hero--ganji' : '') + '"><p class="saju-hero__title">' + esc(title) + '</p>' +
      (list.length ? '<ul class="saju-hero__badges">' + list.map(function (b, i) { return '<li' + (i === 0 ? ' data-primary' : '') + '>' + esc(b) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
  }
  // 두 칸 표(항목·추천)를 대신하는 카드. 셋째 값은 한자 인장.
  function tiles(items) { return '<ul class="saju-tiles saju-tiles--seal">' + items.map(function (x) { return '<li><b><i aria-hidden="true">' + esc(x[2]) + '</i>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></li>'; }).join('') + '</ul>'; }
  function chips(items, cls) { return '<ul class="saju-chips' + (cls ? ' ' + cls : '') + '">' + items.map(function (it) { return '<li class="saju-chip"' + (it.tone ? ' data-tone="' + it.tone + '"' : '') + (it.el ? ' data-el="' + it.el + '"' : '') + '>' + (it.tag ? '<b>' + esc(it.tag) + '</b>' : '') + esc(it.text) + (it.note ? '<small>' + esc(it.note) + '</small>' : '') + '</li>'; }).join('') + '</ul>'; }
  function more(summary, body) { return '<details class="saju-rich__more"><summary>' + esc(summary) + '</summary>' + body + '</details>'; }
  function wrap(mode, body, facts) {
    var a = facts.p && facts.p.d && STEM_ART[facts.p.d.g];
    return '<div class="saju-reading saju-rich"'+(a?' data-day-el="'+a[1]+'"':'')+' data-reading-mode="' + (mode === 'neo' ? 'neo' : 'pig') + '">' + body + (facts.unknown && facts.warning ? '<p class="saju-reading__uncertain">' + esc(facts.warning) + '</p>' : '') + '</div>';
  }
  function stage(score) { return score < -20 ? '극신약' : score < 10 ? '신약' : score < 30 ? '중화에 가까운 신약' : score < 50 ? '중화에 가까운 신강' : score < 70 ? '신강' : '극신강'; }
  var GOD_FAMILY = {'비견':'same', '겁재':'same', '식신':'drain', '상관':'drain', '편재':'wealth', '정재':'wealth', '편관':'control', '정관':'control', '편인':'parent', '정인':'parent'};
  var FAMILY_ORDER = ['same', 'drain', 'wealth', 'control', 'parent'];
  function godMap(p, L) {
    var dg = p && p.d && p.d.g;
    if (!dg || !L.getTenGod || !L.GAN[dg]) return null;
    var surface = {}, hidden = {}, where = {};
    POS.forEach(function (pos) {
      if (pos[0] === 'd' && pos[1] === 'g') return;
      var c = p[pos[0]] && p[pos[0]][pos[1]], g = c ? L.getTenGod(dg, c) : '';
      if (!g || g === '?') return;
      surface[g] = (surface[g] || 0) + 1;
      (where[g] = where[g] || []).push({key:pos[0], side:pos[1], label:pos[2], char:c});
      (pos[1] === 'j' && L.CD_JANGGAN && L.CD_JANGGAN[c] || []).forEach(function (h) { var hg = L.getTenGod(dg, h); if (hg && hg !== '?') hidden[hg] = (hidden[hg] || 0) + 1; });
    });
    return {surface:surface, hidden:hidden, where:where};
  }
  function familyEl(L, dayEl, f) { return ['wood', 'fire', 'earth', 'metal', 'water'].filter(function (e) { return family(L, dayEl, e) === f; })[0]; }
  function roleOf(facts, el) {
    var pw = facts.power || {};
    if (facts.jong && facts.jong.isJong) return '';
    var y = (pw.yongshin || []).indexOf(el), k = (pw.kijishin || []).indexOf(el);
    return y === 0 ? '용신' : y > 0 ? '희신' : k === 0 ? '기신' : k > 0 ? '구신' : '';
  }
  function hiddenText(L, j) {
    var list = (L.CD_JANGGAN && L.CD_JANGGAN[j]) || [];
    return list.map(function (h, i) { return h + (i === list.length - 1 ? '(정기)' : i === 0 ? '(여기)' : '(중기)'); }).join(' ');
  }

  /* ── 지금 내 시기 · 올해의 나 ── 엔진 evalDaewun 점수·요약·합충은 setFlow 행으로 받는다. */
  var FLOW_NAMES = ['조율이 많이 필요한 흐름', '조율이 필요한 흐름', '보통의 흐름', '순한 흐름', '아주 순한 흐름'];
  var FLOW_FAMILY = {
    same:['나와 같은 기운이 들어오는 시기라 스스로 정하고 독립하려는 마음이 커지기 쉬워요. 동료와 경쟁도 함께 늘 수 있으니 나눌 몫을 먼저 정해 두면 편안해요.', '비겁 운: 독립·경쟁 이슈가 늘어나. 같이 쓰는 자원은 몫과 규칙부터 정해 둬.'],
    drain:['내 안의 것을 밖으로 내보내는 시기라 표현하고 만들고 가르치는 일이 잘 풀리기 쉬워요. 기운이 많이 나가니 회복 시간을 함께 챙겨 주세요.', '식상 운: 표현·생산 활동이 늘어나. 만들어 내는 건 늘리되 지치지 않게 선을 정해 둬.'],
    wealth:['현실의 성과와 재물에 눈이 가는 시기예요. 일을 넓히기 좋은 만큼 감당할 범위를 숫자로 적어 두면 마음이 덜 흔들려요.', '재성 운: 성과·재무 이슈가 커져. 일을 넓힐 범위의 상한은 숫자로 정해 봐.'],
    control:['책임과 역할이 무거워지는 시기예요. 인정받을 기회가 함께 오지만 부담도 커지니, 맡을 일과 내려놓을 일을 나눠 보세요.', '관성 운: 책임·평가 압박이 커져. 받을 역할과 거절할 역할을 나눠 봐.'],
    parent:['배움과 도움이 들어오는 시기예요. 공부하고 자격을 갖추거나 좋은 조언자를 만나기 쉬우니, 받은 것을 작은 행동으로 옮겨 보세요.', '인성 운: 배움과 도움이 들어와. 받은 걸 실행으로 바꿀 일정을 잡아 봐.']
  };
  // 톤은 FLOW_NAMES 구간(at)을 따른다: 0~1 care, 2 even, 3~4 open. 문구에 정도 표현을 넣지 않아 구간 이름과 어긋나지 않게 한다.
  var FLOW_TONE = {
    open:['흐름이 순한 쪽으로 읽혀요. 준비해 온 일을 작은 범위에서 먼저 시험해 보세요. 점수는 비교를 돕는 참고값이고 결과를 약속하지는 않아요.', '평가상 수월한 구간이야. 준비해 둔 일을 작은 규모로 먼저 해 봐. 점수가 결과를 약속하는 건 아니야.'],
    even:['크게 밀거나 당기지 않는 보통의 흐름으로 읽혀요. 하던 일을 꾸준히 이어 가면서 중간중간 방향만 점검해 보세요. 점수는 비교를 돕는 참고값이고 결과를 약속하지는 않아요.', '평가상 중간 구간이야. 하던 일을 이어 가면서 방향만 점검해 봐. 점수가 결과를 약속하는 건 아니야.'],
    care:['조율이 필요한 쪽으로 읽혀요. 속도를 낮추고 역할과 일정을 정돈하면 같은 시기도 한결 편안해져요. 점수만으로 큰 결정을 내리지는 말아 주세요.', '평가상 조율 구간이야. 일정과 역할을 정돈하고 선택지를 남겨 둬. 점수만 보고 결론 내리진 마.']
  };
  var GAEUN_LABEL = [['love', '연애운'], ['wealth', '재물운'], ['relationship', '대인관계'], ['career', '커리어']];
  function plain(text) { return String(text || '').replace(/(?:[☀-➿]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDEFF]|\uD83E[\uDD00-\uDEFF]|️)/g, '').replace(/\s+/g, ' ').trim(); }
  function flow(facts, mode) {
    var p = facts && facts.p, L = lib(facts), rows = (facts && facts.flow) || [];
    if (!p || !p.d || !L.GAN || !L.GAN[p.d.g] || !L.getTenGod || !rows.length) return '';
    var neo = mode === 'neo', k = neo ? 1 : 0, dg = p.d.g, dayEl = L.GAN[dg].e, twelve = L.cdTwelveStage || function () { return ''; }, toned = {};
    var html = rows.map(function (r) {
      var gd = L.GAN[r.g], jd = L.JI[r.j];
      if (!gd || !jd || typeof r.score !== 'number') return '';
      var year = r.kind === 'year', good = r.score >= 60, sg = L.getTenGod(dg, r.g), bg = L.getTenGod(dg, r.j), stage = twelve(dg, r.j);
      var title = year ? (r.year ? r.year + '년 · ' : '') + '올해의 나 (세운) ' + r.g + r.j : '지금 내가 지나는 시기 (현재 대운) ' + r.g + r.j;
      var meta = gd.n + ' · ' + jd.a + (year ? '' : (r.age != null ? ' · ' + r.age + '~' + r.end + '세 (세는 나이)' : ''));
      var at = [20, 40, 60, 80].filter(function (z) { return r.score >= z; }).length;
      var body = hero(r.g + r.j, ['흐름 점수 ' + r.score + '점', FLOW_NAMES[at], year ? '세운 · 한 해' : '대운 · 10년'], true) + '<p class="saju-rich__note">' + esc(meta) + '</p>' +
        gauge({kind:'score', value:r.score, min:0, max:100, zones:[20, 40, 60, 80], names:FLOW_NAMES, ends:['조율 쪽', '순한 쪽'], caption:'흐름 점수 ' + r.score + '점', aria:(year ? '올해' : '현재 대운') + ' 흐름 점수 ' + r.score + '점'});
      // 엔진 요약의 [태그]는 근거 이름으로 풀고, 끝의 "대운" 꼬리말은 세운 행에서 틀리므로 뗀다.
      var summary = plain(r.summary).replace(/\[([^\]]+)\]\s*/g, '$1 · ').replace(/\s*(대운|세운)$/, '');
      if (summary) body += para(neo ? '평가 근거: ' + summary + '.' : '점수를 매길 때 살펴본 근거를 그대로 옮겨 둘게요: ' + summary + '.');
      body += table((year ? '세운' : '대운') + ' 간지와 내 일간', ['글자', '오행', '십성', '12운성', '억부에서'], [
        ['천간 ' + r.g, EL[gd.e] || '', sg, '—', roleOf(facts, gd.e) || '—'],
        ['지지 ' + r.j, EL[jd.e] || '', bg, stage || '—', roleOf(facts, jd.e) || '—']
      ]) + '<p class="saju-rich__note">' + esc('지지 ' + r.j + '의 지장간: ' + hiddenText(L, r.j)) + '</p>';
      var fam = GOD_FAMILY[sg];
      if (fam) body += para(FLOW_FAMILY[fam][k]);
      var rel = r.relations || [];
      body += rel.length ? chips(rel.map(function (x) { return {tag:x.type, text:x.src + ' – ' + x.partner, note:x.isChung ? '변화·이동의 자극' : x.transformed ? '합화 조건 충족' : '결속·협력의 계기', tone:x.isChung ? 'care' : 'good'}; })) :
        para(neo ? '원국과 직접 합·충하는 글자는 없어.' : '원국 글자와 직접 합하거나 충하는 자리는 없어요.');
      if (year && L.GAEUN_DB) {
        var db = (neo && L.NEO_GAEUN_DB && L.NEO_GAEUN_DB[gd.e]) ? L.NEO_GAEUN_DB : L.GAEUN_DB;
        var g = (db[gd.e] || db.earth || {})[good ? 'good' : 'bad'] || {};
        body += '<ul class="saju-tiles">' + GAEUN_LABEL.filter(function (x) { return g[x[0]]; }).map(function (x) { return '<li><b>' + esc(x[1]) + '</b><span>' + esc(g[x[0]]) + '</span></li>'; }).join('') + '</ul>';
      }
      if(root.SajuReadingDepth){
        var depth=root.SajuReadingDepth;
        var balanceFor=function(el){var role=roleOf(facts,el);return /용신|희신/.test(role)?'good':/기신|구신/.test(role)?'bad':'neutral';};
        var action=depth.cycleActions({stem:{char:r.g,god:sg,balance:balanceFor(gd.e)},branch:{char:r.j,god:bg,balance:balanceFor(jd.e)},power:facts.power,jong:facts.jong,month:p.m.j,depth:facts.depth||depth.buildDepthFacts(facts)},neo?'neo':undefined);
        if(action.length) body+=section(year?'올해 해볼 작은 실천':'지금 대운에서 먼저 해볼 일',action.map(function(item){return '<h4>'+esc(item.title.replace(/대운/g,year?'세운':'대운'))+'</h4>'+para(item.text.replace(/대운/g,year?'세운':'대운'));}).join(''));
      }
      // 대운·세운이 같은 톤이면 같은 문단이 두 번 나오므로 처음 한 번만 붙인다.
      var tone = at >= 3 ? 'open' : at === 2 ? 'even' : 'care';
      if (!toned[tone]) { toned[tone] = true; body += para(FLOW_TONE[tone][k]); }
      return stemArt(r.g,year?'올해 세운 천간의 물상':'현재 대운 천간의 물상')+section(title, body, 'saju-rich__lead saju-flow saju-flow--' + (year ? 'year' : 'period'));
    }).join('');
    if (!html) return '';
    return wrap(mode, '<p class="saju-rich__note">대운은 약 10년의 큰 배경, 세운은 그 안에서 해마다 달라지는 흐름이에요. 같은 시기라도 내 명식의 균형과 선택에 따라 체감은 달라질 수 있어요.</p>' + html + '<p class="saju-rich__note">' + esc('현재 대운과 올해의 흐름을 살펴봤다면, 아래 대운표에서 시기를 선택해 연도별 변화를 이어 읽어보세요. 내 고민을 질문하는 찻집 AI 상담은 별도 서비스예요.') + '</p>', facts);
  }

  /* ── 오늘 · 이달 ── 엔진 analyzeFortuneGZ 결과(setDaily)를 그린다. 옛 TSADVICE 를 명령조 없이 다시 썼다. [연이, 영냥이] */
  var DAY_GOD = {
    '비견':['스스로 판단하는 힘이 또렷해지는 때예요. 혼자 정해도 좋지만, 정한 이유를 한 줄로 적어 두면 나중에 흔들리지 않아요.', '혼자 판단하기 좋은 때야. 결정한 이유를 한 줄로 적어 둬.'],
    '겁재':['경쟁심과 추진력이 함께 올라오는 때예요. 충동적인 지출이나 내기 같은 선택은 하루 미뤄 두면 마음이 편해요.', '경쟁심이랑 충동이 커지는 때야. 즉흥 지출은 하루만 미뤄 봐.'],
    '식신':['즐거움과 아이디어가 샘솟는 때예요. 떠오른 생각 하나를 작게라도 바로 만들어 보세요.', '생산성이 오르는 때야. 아이디어 하나를 바로 해 볼 크기로 옮겨 봐.'],
    '상관':['말과 표현에 힘이 실리는 때예요. 발표나 창작에는 잘 맞고, 계약서나 공식 발언은 한 번 더 읽고 내보내면 좋아요.', '표현력이 세지는 때야. 공식 문서나 발언은 한 번 더 보고 내보내.'],
    '편재':['기회와 변동이 함께 커지는 때예요. 큰 판보다 확인된 작은 것부터 잡아 보세요.', '기회랑 변동이 같이 커지는 때야. 확인된 작은 것부터 잡아 봐.'],
    '정재':['꼼꼼한 실무가 빛나는 때예요. 수입과 지출을 한 번 정리해 두면 마음이 가벼워져요.', '정확도가 올라가는 때야. 수입·지출 내역을 한 번 정리해 봐.'],
    '편관':['압박이 느껴질 수 있는 때예요. 다 짊어지기보다 꼭 지킬 한 가지를 정해 버텨 보면 신뢰로 돌아와요.', '압박이 올 수도 있는 때야. 핵심 책임 하나에 집중하면 신뢰로 돌아오기 쉬워.'],
    '정관':['책임과 신뢰가 드러나는 때예요. 공식 서류나 절차를 처리하기에 잘 맞아요.', '공식 절차를 처리하기 좋은 때야. 책임 범위는 분명히 해 둬.'],
    '편인':['직관이 예민해지는 때예요. 떠오른 감은 메모해 두었다가 작게 확인해 보세요.', '직관이 앞서는 때야. 떠오른 감은 적어 두고 작게 확인해 봐.'],
    '정인':['배우고 정리하기 좋은 때예요. 믿을 만한 사람에게 조언을 구하면 생각이 또렷해져요.', '배우고 분석하기 좋은 때야. 믿을 만한 사람한테 의견을 물어봐.']
  };
  var DAY_TONE = {
    open:['기운이 비교적 힘 있게 들어오는 때예요. 해야 할 일 하나를 골라 먼저 끝내 보면 흐름을 잘 탈 수 있어요.', '에너지가 앞서는 구간이야. 우선순위 1건부터 먼저 끝내 봐.'],
    care:['마음 배터리를 먼저 챙기면 좋은 때예요. 속도를 조금 낮추면 실수가 줄고 관계도 한결 편안해져요.', '에너지를 아껴 쓸 구간이야. 속도를 낮추고 확인 단계를 하나 더 둬.']
  };
  function daily(row, index, facts, mode) {
    var p = facts && facts.p, L = lib(facts);
    if (!row || !row.gz || !p || !p.d || !L.GAN || !L.GAN[p.d.g] || typeof row.batteryPercent !== 'number') return '';
    var neo = mode === 'neo', k = neo ? 1 : 0, dg = p.d.g, month = index === 1, when = month ? '이달' : '오늘', twelve = L.cdTwelveStage || function () { return ''; };
    var g = row.gz.g, j = row.gz.j, gEl = row.gEl || (L.GAN[g] || {}).e, jEl = row.jEl || (L.JI[j] || {}).e, bp = row.batteryPercent, good = bp >= 60;
    var lb = row.lb || {}, lt = row.lt || {}, grade = plain(row.grade);
    var html = stemArt(g,month?'이달 월운 천간의 물상':'오늘 일진 천간의 물상')+section((month ? '이달의 월운 ' : '오늘의 일진 ') + g + j,
      hero(g + j, ['에너지 ' + bp + '%', grade, EL[gEl] && EL[jEl] ? EL[gEl] + ' · ' + EL[jEl] : ''], true) + gauge({kind:'energy', value:bp, min:0, max:100, zones:[40, 60, 80], names:['회복을 먼저', '고르게', '무난하게', '힘이 실리는'], ends:['쉬어 가기', '힘 실림'], caption:'에너지 게이지 ' + bp + '%' + (grade ? ' · ' + grade : ''), aria:when + ' 에너지 게이지 ' + bp + '%' + (grade ? ', ' + grade : '')}) +
      chips([
        {tag:'#', text:bp >= 80 ? '가속' : good ? '균형' : '쉼표'},
        {tag:'#', text:(EL[row.luckyEl] || '균형') + ' 보충'},
        {tag:'#', text:String(lt.action || lb.action || '루틴').split(',')[0].trim()}
      ], 'saju-chips--tags') +
      table(when + ' 들어오는 기운과 내 일간', ['글자', '오행', '십성', '12운성', '억부에서'], [
        ['천간 ' + g, EL[gEl] || '', row.gGod || '—', '—', roleOf(facts, gEl) || '—'],
        ['지지 ' + j, EL[jEl] || '', row.jGod || '—', twelve(dg, j) || '—', roleOf(facts, jEl) || '—']
      ]), 'saju-rich__lead');
    var advice = [row.gGod, row.jGod].filter(function (x, i, a) { return DAY_GOD[x] && a.indexOf(x) === i; }).map(function (x) { return {tag:x, text:DAY_GOD[x][k]}; });
    html += section(neo ? '십성 기준 판단' : '십성으로 읽은 ' + when + '의 결', advice.length ? chips(advice) : para(DAY_TONE[good ? 'open' : 'care'][k]));
    var items = (row.adviceItems || []).slice(0, 3).map(function (a) { return {tag:plain(a.title), text:plain(a.body), tone:a.type === 'warn' ? 'care' : a.type === 'good' ? 'good' : ''}; }).filter(function (a) { return a.text; });
    html += section(neo ? '체크 포인트' : '이건 꼭 챙겨 주세요', items.length ? chips(items) : para(neo ? '특이한 관계는 없어. 중요한 메시지는 보내기 전에 한 번 더 확인해 봐.' : '원국과 크게 부딪히는 관계는 없어요. 중요한 메시지는 보내기 전에 한 번 더 읽어 보면 좋아요.'));
    var boost = [['행운 컬러', lb.color, '色'], ['장소 · 방향', lt.action, '方'], [when + '의 한 끗', lb.item, '物'], ['무드 세팅', lb.material, '感']].filter(function (x) { return x[1]; });
    if (boost.length) html += section('행운의 부스터', tiles(boost) + '<p class="saju-rich__note">' + esc(neo ? '용신 오행을 채우는 생활 팁이야. 효과를 약속하진 않아.' : '부족한 기운을 생활에서 가볍게 더하는 팁이에요. 분위기를 바꾸는 정도로 즐겨 주세요.') + '</p>');
    html += section(neo ? '영냥이의 정리' : '연이의 한마디', para(DAY_TONE[good ? 'open' : 'care'][k]));
    return wrap(mode, html, facts);
  }

  root.SajuReadingRich = {stemThumb:stemThumb, stemArt:stemArt, seasonArt:seasonArt, decorateDelivered:decorateDelivered, daily:daily, flow:flow, powerParts:powerParts, johuParts:johuParts, powerMatches:powerMatches, johuMatches:johuMatches, stage:stage, godMap:godMap, escape:esc,
    // 비한국어 판(reading-rich-intl.js)이 같은 조각·계산 보조를 재사용한다. 문구는 들어 있지 않다.
    kit:{esc:esc, fmt:fmt, num:num, pct:pct, lib:lib, elOf:elOf, family:family, section:section, para:para, gauge:gauge, table:table, hero:hero, tiles:tiles, chips:chips, more:more, wrap:wrap, familyEl:familyEl, roleOf:roleOf, SEASON:SEASON, BRANCH_TEMP:BRANCH_TEMP, GOD_FAMILY:GOD_FAMILY, FAMILY_ORDER:FAMILY_ORDER}};
})(typeof window === 'undefined' ? globalThis : window);

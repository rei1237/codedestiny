/* Rich Korean saju reading (display only). Facts + mode in, HTML out.
 * No calculation of new verdicts, no requests, no storage. Engine tables are read from the page globals
 * (or facts.lib in tests); the score breakdowns are re-derived for display and shown only when they add up
 * to the engine's own result (fail-closed). */
(function (root) {
  'use strict';
  var EL = {wood:'목(木)', fire:'화(火)', earth:'토(土)', metal:'금(金)', water:'수(水)'};
  var FAMILY = {same:'비겁(比劫)', parent:'인성(印星)', drain:'식상(食傷)', wealth:'재성(財星)', control:'관성(官星)'};
  var FAMILY_MEANING = {same:'나와 같은 기운 · 동료와 자기 힘', parent:'나를 돕는 기운 · 배움과 후원', drain:'내가 내보내는 기운 · 표현과 재능', wealth:'내가 다스리는 기운 · 재물과 현실 성과', control:'나를 다스리는 기운 · 책임과 조직'};
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
  function hourMark(facts, k) { return k === 'h' && facts.unknown ? ' (정오 대입)' : ''; }

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
    return i === 0 ? '<th scope="row"' + wrap + '>' + body + '</th>' : '<td' + (label ? ' data-label="' + esc(label) + '"' : '') + wrap + '>' + body + '</td>';
  }
  // 네 칸 이상인 표는 좁은 화면에서 행마다 카드로 쌓는다(칸 이름은 data-label). 360px 에서 오른쪽 칸이 잘리던 문제.
  function table(caption, head, rows, foot) {
    var stack = head.length >= 4;
    var row = function (r) { return '<tr>' + r.map(function (c, i) { return cellHtml(c, i, stack ? head[i] : ''); }).join('') + '</tr>'; };
    return '<div class="saju-table-wrap"><table class="saju-table' + (stack ? ' saju-table--stack' : '') + '"><caption>' + esc(caption) + '</caption><thead><tr>' + head.map(function (h) { return '<th scope="col">' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(row).join('') + '</tbody>' + (foot ? '<tfoot>' + row(foot) + '</tfoot>' : '') + '</table></div>';
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
    return '<div class="saju-reading saju-rich" data-reading-mode="' + (mode === 'neo' ? 'neo' : 'pig') + '">' + body + (facts.unknown && facts.warning ? '<p class="saju-reading__uncertain">' + esc(facts.warning) + '</p>' : '') + '</div>';
  }

  /* ── 한난조습 ── */
  var TEMP_NAMES = ['차가운 쪽', '서늘한 쪽', '고른 온도', '따뜻한 쪽', '뜨거운 쪽'];
  var TEMP_INDEX = {cold:0, cool:1, neutral:2, warm:3, hot:4};
  var MOIST_NAMES = {dry:'건조한 편', balanced:'고른 편', wet:'습한 편'};
  var ENV = {
    colddry: {title:'정갈하고 고요한 겨울 산장',
      pig:'차분한 이성과 분명한 경계가 돋보이는 기후예요. 소음을 덜어낸 조용한 자리에서 집중력이 살아나는 편이에요. 일에서는 자료를 깊이 파고드는 분석·기획·연구처럼 혼자 몰입하는 역할과 잘 맞을 수 있고, 관계에서는 선을 지키는 담백한 배려가 신뢰로 이어지기 쉬워요. 마음을 꺼내는 데 시간이 걸린다는 것을 가까운 사람에게 먼저 알려 주면 오해가 줄어요.',
      neo:'환경 유형은 겨울 산장형입니다. 조용하고 정돈된 환경에서 집중력이 오릅니다. 맞는 역할은 분석·기획·연구처럼 깊이 파는 일입니다. 관계에서는 경계를 지키는 담백함이 신뢰가 됩니다. 감정 표현이 늦다는 점은 미리 공유하세요.'},
    coldwet: {title:'물안개 피어오르는 새벽 호수',
      pig:'겉은 고요하지만 안에서는 생각과 감정이 촘촘히 이어지는 기후예요. 사람의 속마음을 헤아리고 깊은 이야기를 나누는 자리에서 힘이 나는 편이에요. 일에서는 상담·심리·예술처럼 사람의 이면을 읽는 역할과 잘 어울리고, 관계에서는 천천히 스며드는 마음이 오래 가요. 생각이 깊어져 가라앉는 날에는 햇볕과 가벼운 움직임으로 온기를 더해 주세요.',
      neo:'환경 유형은 새벽 호수형입니다. 겉은 조용하지만 내부 처리량이 많습니다. 맞는 역할은 상담·심리·예술처럼 사람의 이면을 읽는 일입니다. 관계는 천천히 깊어지는 편입니다. 생각이 가라앉는 날에는 햇볕과 가벼운 움직임으로 리듬을 올리세요.'},
    hotdry: {title:'햇살이 내리쬐는 한낮의 사막',
      pig:'목표가 보이면 망설이지 않고 나아가는 기후예요. 결단이 빠르고 뒤끝이 적어서, 속도가 필요한 자리에서 성과를 내기 쉬운 편이에요. 일에서는 새 일을 여는 창업·영업·단기 프로젝트처럼 판단이 빠른 역할이 잘 맞고, 관계에서는 마음을 숨기지 않는 솔직함이 매력이에요. 열기가 오를수록 곁에 있는 사람의 속도도 한 번씩 살펴 주세요.',
      neo:'환경 유형은 한낮의 사막형입니다. 목표가 정해지면 직진하고 결단이 빠릅니다. 맞는 역할은 창업·영업·단기 프로젝트처럼 속도가 성과인 일입니다. 관계에서는 솔직함이 강점입니다. 속도를 올릴 때 상대의 속도도 확인하세요.'},
    hotwet: {title:'생명력 가득한 여름 숲',
      pig:'사람과 어울리며 함께 자라는 기후예요. 호기심과 친화력이 커서 여러 사람이 모이는 곳에서 에너지가 오가는 편이에요. 일에서는 교육·인사·마케팅·글쓰기처럼 소통이 중심인 역할과 잘 맞고, 관계에서는 감정을 풍부하게 나누며 함께 경험을 쌓아 가요. 일정이 빽빽해지기 쉬우니 혼자 숨 고를 시간을 따로 잡아 두세요.',
      neo:'환경 유형은 여름 숲형입니다. 사람 사이에서 에너지가 오가며 성장합니다. 맞는 역할은 교육·인사·마케팅·글쓰기처럼 소통이 중심인 일입니다. 관계에서는 감정 표현이 풍부합니다. 일정이 과밀해지기 쉬우니 혼자 쉬는 시간을 먼저 확보하세요.'}
  };
  var TEMP_RX = {
    hot:  {need:'수(水)·금(金)', color:'파란색·검은색·흰색', dir:'북쪽·서쪽', act:'물가 산책, 수영, 미지근한 족욕, 명상', less:'과격한 운동, 뜨거운 환경, 붉은색 과용'},
    warm: {need:'수(水)', color:'파란색·하늘색·민트', dir:'북쪽', act:'물 자주 마시기, 계곡·바다 나들이, 쿨다운 스트레칭', less:'과음·과식·늦은 야식'},
    neutral: {need:'계절에 맞춘 보완', color:'계절에 맞춰 바꾸기', dir:'고정하지 않음', act:'봄·가을엔 목·금, 여름엔 수, 겨울엔 화·목 기운의 활동', less:'한쪽으로 치우친 생활 리듬'},
    cool: {need:'화(火)·목(木)', color:'주황색·녹색·붉은 계열', dir:'남쪽·동쪽', act:'햇볕 쬐기, 반신욕, 스트레칭·요가', less:'찬 음식, 냉방에 오래 머물기'},
    cold: {need:'화(火)·목(木)', color:'빨간색·주황색·연두색', dir:'남쪽·동쪽', act:'따뜻한 음식, 온탕, 몸을 데우는 유산소 운동, 충분한 햇볕', less:'냉수욕, 과한 냉방, 어두운 색만 쓰기'}
  };
  var MOIST_RX = {
    dry: {need:'수(水)·목(木)', act:'물 자주 마시기, 가습, 숲·물가 산책, 식물 기르기'},
    wet: {need:'금(金)·화(火)', act:'자주 환기하기, 햇볕에 말린 침구, 흰색·금색 소품, 관계의 경계선 분명히 하기'},
    balanced: {need:'추가 보완 없음', act:'습조는 고른 편이라 온도 쪽 처방에 집중'}
  };
  var CLIMATE_COPY = {
    pig: {
      lead:'연이가 읽은 기후', env:'조후로 본 삶의 환경', parts:'글자별 온도·습도 기여', count:'온도를 움직이는 네 기운',
      verdict:'{season}의 월령에 태어난 원국이에요. 계절이 정한 기본 온도 {base}에 여덟 글자의 온기와 냉기를 더하면 온도 점수는 {score}, {type}으로 읽혀요. 습조는 습한 신호 {wet}개와 건조한 신호 {dry}개로 {moist}이에요.',
      versus:'조후 용신과 억부 용신', rx:'조후 밸런스 처방 · 생활 개선법',
      rxIntro:'명리에서 부족한 기운을 채우는 상징을 생활 언어로 옮겼어요. 마음에 드는 것 하나만 골라 일주일쯤 시도해 보세요.',
      moistRx:'습조 보완', notHealth:'생활 처방은 명리의 상징을 옮긴 것이며 건강·의료 조언이 아니에요. 몸에 불편이 있다면 전문가와 먼저 상의해 주세요.'
    },
    neo: {
      lead:'네오의 진단', env:'조후로 본 환경 유형', parts:'글자별 온도·습도 기여', count:'온도를 움직이는 네 기운',
      verdict:'판정은 {type}, 습조는 {moist}입니다. {season} 월령 기본값 {base}에 글자별 기여를 더한 온도 점수 {score}, 습 {wet} · 조 {dry}입니다.',
      versus:'조후 용신 대 억부 용신', rx:'조후 밸런스 처방 · 생활 개선법',
      rxIntro:'부족한 기운을 보완하는 생활 수단입니다. 하나를 골라 일주일 실행하고 컨디션 변화를 기록하세요.',
      moistRx:'습조 보완', notHealth:'생활 처방은 명리 상징의 번역이며 건강·의료 조언이 아닙니다. 몸이 불편하면 전문가 판단이 먼저입니다.'
    }
  };
  function johuNeed(type) { return type === 'cold' || type === 'cool' ? ['fire', 'wood'] : type === 'hot' || type === 'warm' ? ['water', 'metal'] : []; }
  function climateVersus(facts, neo) {
    var j = facts.johu, pw = facts.power, need = johuNeed(j.type), yong = (pw && pw.yongshin) || [];
    var jong = facts.jong && facts.jong.isJong;
    var needText = need.map(function (e) { return EL[e]; }).join('·');
    var yongText = yong.slice(0, 2).map(function (e) { return EL[e]; }).join('·');
    var extreme = j.type === 'cold' || j.type === 'hot';
    var same = need.some(function (e) { return yong.indexOf(e) >= 0; });
    var t = [];
    if (!need.length) t.push(neo ? '온도가 고른 편이라 조후상 급한 보완 기운은 없습니다. 억부 용신을 중심으로 판단합니다.' : '온도가 고른 편이라 조후로 급히 채울 기운은 따로 없어요. 그래서 억부에서 고른 용신을 중심으로 읽으면 충분해요.');
    else if (jong) t.push(neo ? '조후는 ' + needText + ' 기운을 원합니다. 다만 종격으로 검토된 원국이라 모인 기세를 따르는 판단이 먼저입니다.' : '조후로 보면 ' + needText + ' 기운이 반가운 원국이에요. 다만 종격으로 검토된 구조라서, 모인 기세를 따르는 판단을 먼저 두고 조후는 생활의 보완으로 살펴요.');
    else if (same) t.push(neo ? '조후 필요 기운(' + needText + ')과 억부 용신(' + yongText + ')이 겹칩니다. 같은 방향이므로 보완 우선순위가 분명합니다.' : '조후로 반가운 ' + needText + ' 기운과 억부로 고른 용신(' + yongText + ')이 서로 겹쳐요. 두 관점이 같은 쪽을 가리키니, 이 기운을 생활에서 꾸준히 곁에 두는 것이 가장 분명한 보완이에요.');
    else t.push(neo ? '조후는 ' + needText + ', 억부는 ' + yongText + ' 기운을 꼽습니다. 방향이 다릅니다. ' + (extreme ? '한난이 극단이므로 조후를 우선하고 억부를 보조로 둡니다.' : '한난이 극단은 아니므로 억부를 우선하고 조후를 보조로 둡니다.') : '조후로는 ' + needText + ' 기운이, 억부로는 ' + yongText + ' 기운이 먼저 꼽혀 방향이 조금 달라요. ' + (extreme ? '온도가 한쪽으로 크게 기운 원국에서는 계절의 균형을 먼저 맞추는 조후를 앞에 두고, 억부는 그다음으로 살펴요.' : '온도가 극단까지 기울지는 않았으니 억부의 용신을 중심에 두고, 조후는 계절이 바뀔 때 챙기는 보조로 살펴요.'));
    t.push(neo ? '조후는 계절의 한난조습, 억부는 일간 힘의 과부족을 보는 기준입니다. 둘 중 하나만 정답으로 두지 않습니다.' : '조후는 태어난 계절의 온도와 습도를, 억부는 일간이 감당하는 힘의 크고 작음을 보는 기준이에요. 어느 한쪽만 정답으로 두지 않고, 원국의 상황에 따라 앞뒤를 정해요.');
    return t.map(para).join('');
  }
  function climate(facts, mode) {
    var j = facts && facts.johu, p = facts && facts.p;
    if (!j || !p || typeof j.score !== 'number') return '';
    var neo = mode === 'neo', c = CLIMATE_COPY[neo ? 'neo' : 'pig'], L = lib(facts);
    var parts = johuParts(p, L), ok = johuMatches(parts, j);
    var diff = (j.moistCnt || 0) - (j.dryCnt || 0);
    var typeName = TEMP_NAMES[TEMP_INDEX[j.type] != null ? TEMP_INDEX[j.type] : 2], moistName = MOIST_NAMES[j.moistType] || MOIST_NAMES.balanced;
    var season = j.season || (parts && parts.season) || '';
    var env = ENV[(Math.max(-6, Math.min(6, j.score)) < 0 ? 'cold' : 'hot') + (diff < 0 ? 'dry' : 'wet')];
    var html = section(c.lead, hero(env.title, [typeName, '습조 ' + moistName, '온도 점수 ' + num(j.score)]) + para(fmt(c.verdict, {season:season, base:num(parts ? parts.seasonTemp : (BRANCH_TEMP[p.m.j] || 0)), score:num(j.score), type:typeName, wet:j.moistCnt || 0, dry:j.dryCnt || 0, moist:moistName})), 'saju-rich__lead');
    html += '<div class="saju-rich__gauges">' +
      gauge({kind:'temp', value:j.score, min:-9, max:9, zones:[-5, -2, 2, 5], names:TEMP_NAMES, ends:['차가움 寒', '뜨거움 暖'], caption:'온도 점수 ' + num(j.score), aria:'한난 게이지: 온도 점수 ' + num(j.score) + ', ' + typeName}) +
      gauge({kind:'humid', value:diff, min:-6, max:6, zones:[-2.5, 3], names:['건조한 편', '고른 편', '습한 편'], ends:['건조함 燥', '촉촉함 濕'], caption:'습 ' + (j.moistCnt || 0) + ' · 조 ' + (j.dryCnt || 0) + ' (편차 ' + num(diff) + ')', aria:'조습 게이지: 습한 신호 ' + (j.moistCnt || 0) + '개, 건조한 신호 ' + (j.dryCnt || 0) + '개, ' + moistName}) + '</div>';
    html += section(c.count, chips([{tag:'화(火)', text:' ' + (j.fc || 0), note:'온기 +1.5', el:'fire'}, {tag:'목(木)', text:' ' + (j.wdc || 0), note:'온기 +0.5', el:'wood'}, {tag:'금(金)', text:' ' + (j.mc || 0), note:'냉기 −0.5', el:'metal'}, {tag:'수(水)', text:' ' + (j.wc || 0), note:'냉기 −1.5', el:'water'}]) +
      (ok ? more(c.parts, table(c.parts, ['자리', '글자', '오행', '온도', '습·조'],
        [['월령 계절', season, '—', num(parts.seasonTemp), '—']].concat(parts.rows.map(function (r) { return [r.label + hourMark(facts, r.key), r.char, EL[r.el] || '—', r.temp ? num(r.temp) : '0', (r.moist ? '습' + (r.moist > 1 ? '×' + r.moist : '') : '') + (r.dry ? '조' + (r.dry > 1 ? '×' + r.dry : '') : '') || '—']; })),
        ['합계', '', '', num(parts.total), '습 ' + parts.moist + ' · 조 ' + parts.dry])) : ''));
    html += section(c.env, '<p class="saju-rich__title">' + esc(env.title) + '</p>' + para(neo ? env.neo : env.pig));
    html += section(c.versus, climateVersus(facts, neo));
    var rx = TEMP_RX[j.type] || TEMP_RX.neutral, mrx = MOIST_RX[j.moistType] || MOIST_RX.balanced;
    html += section(c.rx, para(c.rxIntro) + tiles([['채울 기운', rx.need, '氣'], ['색', rx.color, '色'], ['방향', rx.dir, '方'], ['활동', rx.act, '動'], ['줄일 것', rx.less, '減'], [c.moistRx + ' (' + mrx.need + ')', mrx.act, j.moistType === 'wet' ? '燥' : '濕']]) + '<p class="saju-rich__note">' + esc(c.notHealth) + '</p>', 'saju-rich__wide');
    html += more('한난조습이란 무엇인가요?', '<p>' + esc(neo ? '한난조습은 원국의 온도(차고 뜨거움)와 습도(건조하고 촉촉함)를 보는 조후의 기준입니다. 어떤 환경에서 힘이 잘 쓰이는지 판단하는 데 씁니다.' : '한난조습은 원국의 온도(차고 뜨거움)와 습도(건조하고 촉촉함)를 살피는 조후의 기준이에요. 자연에 계절과 날씨가 있듯 사람의 기질에도 기후가 있다고 보고, 어떤 환경에서 내가 편안하고 힘이 잘 쓰이는지 알아보는 데 써요.') + '</p>' +
      '<ul class="saju-tiles"><li><b>한(寒) · 차가움</b><span>겨울의 응축된 기운. 차분하고 신중하게 안으로 다지는 힘으로 읽어요.</span></li><li><b>난(暖) · 따뜻함</b><span>여름의 발산하는 기운. 열정과 표현, 밖으로 뻗는 힘으로 읽어요.</span></li><li><b>조(燥) · 건조함</b><span>가을의 단단한 기운. 맺고 끊음이 분명하고 군더더기 없는 결로 읽어요.</span></li><li><b>습(濕) · 촉촉함</b><span>봄의 얽히는 기운. 공감과 친화력, 함께 자라는 결로 읽어요.</span></li></ul>' +
      para('계산 방식: 태어난 달의 지지가 기본 온도를 정해요(子·丑 −4, 亥 −3, 戌 −2, 寅·酉 −1, 卯·申 +1, 辰 +2, 巳 +3, 午·未 +4). 寅월은 입춘 뒤에도 남은 추위를, 申월은 입추 뒤에도 남은 더위를 반영해요. 여기에 여덟 글자 가운데 화는 +1.5, 목은 +0.5, 금은 −0.5, 수는 −1.5를 더해요. 습은 수·목과 辰·丑, 조는 화·금과 戌·未를 세어 비교해요. 온도 점수 5 이상은 뜨거운 쪽, 2 이상은 따뜻한 쪽, −2 이상은 고른 온도, −5 이상은 서늘한 쪽, 그 아래는 차가운 쪽이에요.'));
    return wrap(mode, html, facts);
  }

  /* ── 억부 ── */
  var STEM_NOTE = {
    '甲':'하늘로 곧게 뻗는 큰 나무처럼 방향을 세우고 앞장서는 힘이 크고 자존심이 단단한 편',
    '乙':'바람에 휘어도 꺾이지 않는 화초와 덩굴처럼 부드럽지만 끈기 있고 생활력이 강한 편',
    '丙':'만물을 비추는 태양처럼 밝고 표현력이 크며 존재감이 뚜렷한 편',
    '丁':'어둠을 밝히는 등불처럼 섬세하고 따뜻하며 속이 깊은 편',
    '戊':'모든 것을 품는 큰 산처럼 듬직하고 신용을 중시하며 중심이 단단한 편',
    '己':'씨앗을 키우는 기름진 밭처럼 실속 있고 포용력이 크며 현실 감각이 좋은 편',
    '庚':'다듬어지기 전의 원석과 강철처럼 결단력과 의리가 강하고 승부욕이 있는 편',
    '辛':'세공된 보석처럼 감각이 예민하고 기준이 높으며 미적 감각이 뛰어난 편',
    '壬':'큰 강과 바다처럼 생각의 폭이 넓고 융통성과 포용력이 큰 편',
    '癸':'이슬과 옹달샘처럼 총명하고 감수성이 섬세하며 은근한 생명력이 있는 편'
  };
  var MONTH_REL = {
    same:{tag:'득령(得令)', pig:'태어난 달의 기운이 일간과 같은 오행이라 뿌리가 단단해요.', neo:'월지가 일간과 같은 오행입니다. 뿌리가 단단합니다.'},
    parent:{tag:'득령(得令)', pig:'태어난 달이 일간을 낳아 기르는 인성(印星)의 달이라 힘을 크게 받아요.', neo:'월지가 일간을 생하는 인성입니다. 힘을 크게 받습니다.'},
    control:{tag:'실령(失令)', pig:'태어난 달이 일간을 극하는 관살(官殺)의 달이라 기운이 눌리기 쉬워요.', neo:'월지가 일간을 극하는 관살입니다. 기운이 눌립니다.'},
    drain:{tag:'실령(失令)', pig:'일간이 달의 기운으로 힘을 내보내는 식상(食傷)의 달이라 에너지가 밖으로 흘러가요.', neo:'월지가 일간의 힘을 빼는 식상입니다. 에너지가 밖으로 나갑니다.'},
    wealth:{tag:'실령(失令)', pig:'일간이 달의 기운을 다스려야 하는 재성(財星)의 달이라 힘을 쓰는 자리에 서 있어요.', neo:'월지가 일간이 다스리는 재성입니다. 힘을 쓰는 자리입니다.'}
  };
  function stage(score) { return score < -20 ? '극신약' : score < 10 ? '신약' : score < 30 ? '중화에 가까운 신약' : score < 50 ? '중화에 가까운 신강' : score < 70 ? '신강' : '극신강'; }
  function jongKind(name) {
    var n = String(name || '');
    if (/곡직/.test(n)) return '목(木)이 가득한 종왕격(從旺格)으로, 곧게 뻗는 성장과 기획의 기운을 그대로 살릴 때 자연스러워요';
    if (/염상/.test(n)) return '화(火)가 가득한 종왕격(從旺格)으로, 밝게 타오르는 열정과 표현력을 살릴 때 자연스러워요';
    if (/가색/.test(n)) return '토(土)가 가득한 종왕격(從旺格)으로, 두텁게 쌓고 지키는 안정의 기운을 따를 때 자연스러워요';
    if (/종혁/.test(n)) return '금(金)이 가득한 종왕격(從旺格)으로, 결단하고 다듬는 단단함을 그대로 쓸 때 자연스러워요';
    if (/윤하/.test(n)) return '수(水)가 가득한 종왕격(從旺格)으로, 흐르듯 유연한 지혜를 살릴 때 자연스러워요';
    if (/종강/.test(n)) return '나를 낳는 인성(印星)이 압도적인 종강격(從强格)으로, 배움과 후원의 큰 흐름에 올라타는 구조예요';
    if (/종아/.test(n)) return '내가 낳는 식상(食傷)이 압도적인 종아격(從兒格)으로, 재능과 표현을 세상에 내보내는 흐름을 따르는 구조예요';
    if (/종재/.test(n)) return '내가 다스리는 재성(財星)이 압도적인 종재격(從財格)으로, 재물과 현실 성취의 흐름에 순응하는 구조예요';
    if (/종살|종관/.test(n)) return '나를 다스리는 관살(官殺)이 압도적인 종살격(從殺格)으로, 조직과 책임의 큰 흐름에 올라타는 구조예요';
    if (/화격|화기/.test(n)) return '천간이 합해 하나의 기운으로 변한 화격(化格)으로, 변화한 그 기운을 중심으로 읽는 구조예요';
    return '한 가지 기운이 원국을 이끄는 특수격으로, 그 기세를 따를 때 자연스러운 구조예요';
  }
  function godChips(L, dayEl, list, tags, tone) {
    return list.filter(Boolean).map(function (e, i) {
      var f = family(L, dayEl, e);
      return {tag:tags[Math.min(i, tags.length - 1)], text:' ' + EL[e] + (f ? ' · ' + FAMILY[f] : ''), note:f ? FAMILY_MEANING[f] : '', tone:tone, el:e};
    });
  }
  function strength(facts, mode) {
    var pw = facts && facts.power, p = facts && facts.p;
    if (!pw || !p || !p.d || typeof pw.score !== 'number') return '';
    var neo = mode === 'neo', L = lib(facts), jg = facts.jong, dg = p.d.g;
    var dayEl = pw.dayEl || (L.GAN[dg] && L.GAN[dg].e), dayName = (L.GAN[dg] && L.GAN[dg].n) || dg;
    var parts = powerParts(p, L), ok = powerMatches(parts, pw), strong = !!pw.isStrong, st = stage(pw.score);
    var html = '';
    var gaugeHtml = gauge({kind:'power', value:pw.score, min:-71, max:88, base:30, zones:[-20, 10, 30, 50, 70], names:['극신약', '신약', '중화에 가까운 신약', '중화에 가까운 신강', '신강', '극신강'], ends:['신약 쪽', '신강 쪽'], baseLabel:'기준 30', caption:'억부 점수 ' + pw.score + '점 (판정 기준 30점)', aria:'억부 게이지: 점수 ' + pw.score + '점, ' + st + ', 판정 기준 30점'});
    var verified = jg && jg.verifiedText ? '<p class="saju-rich__note">' + esc(jg.verifiedText) + '</p>' : '';
    if (jg && jg.isJong) {
      var dom = EL[jg.dominant] || '';
      html += section(neo ? '네오의 진단' : '연이가 읽은 힘의 모양', hero(jg.name || '종격', [dom + (jg.pct != null ? ' ' + jg.pct + '%' : ''), '억부 ' + pw.score + '점 (참고)']) + para(neo ? '판정: ' + (jg.name || '종격') + '. ' + dom + ' 기운이 ' + (jg.pct != null ? jg.pct + '%로 ' : '') + '원국을 이끕니다. 일반 신강·신약 공식을 적용하지 않습니다.' : '당신의 원국은 ' + dom + ' 기운이 ' + (jg.pct != null ? jg.pct + '%로 ' : '') + '크게 모인 ' + (jg.name || '종격') + '으로 검토됐어요. 이런 구조는 일반적인 신강·신약 잣대로 재지 않고, 모인 기세를 따르는 쪽으로 읽어요.'), 'saju-rich__lead');
      html += gaugeHtml;
      html += section('종격(從格)이란', para(neo ? '한 오행이 원국 전체를 압도하면 그 기세를 누르지 않고 따르는 것이 해법이라는 이론입니다. 그래서 억부 점수는 참고값으로만 둡니다.' : '한 가지 오행이 원국 전체를 압도할 만큼 강하면, 그 기세를 억지로 누르기보다 따르는 쪽이 자연스럽다고 보는 이론이에요. 그래서 위의 억부 점수는 참고로만 보고, 아래의 격 설명을 중심에 둬요.'));
      html += section(neo ? '격의 종류' : '당신의 격', para((jg.name || '종격') + ' — ' + jongKind(jg.name) + '.'));
      html += section('대운·세운의 방향', para(neo ? dom + ' 기운을 북돋는 운에서는 흐름이 순하게 이어지기 쉽고, 기세를 거스르는 운에서는 조율할 일이 늘 수 있습니다. 강점 하나에 집중하는 전략이 맞습니다.' : dom + ' 기운을 북돋는 운이 오면 흐름이 순하게 이어지기 쉽고, 그 기세를 거스르는 운에서는 조율할 일이 늘 수 있어요. 여러 갈래로 힘을 나누기보다 타고난 강점 하나를 깊게 가꾸는 쪽이 잘 맞는 구조예요.'));
      html += section(jg.isGaJong ? '가종격(假從格)' : '진종격(眞從格)에 가까움', para(jg.isGaJong ? (neo ? '일간을 돕는 약한 뿌리가 남아 있습니다. 대운에 따라 종격으로 굳거나 일반 격으로 돌아올 수 있으니 실제 지나온 흐름과 대조하세요.' : '일간을 돕는 약한 뿌리가 남아 있어서, 대운의 흐름에 따라 종격으로 굳어지기도 하고 일반 격(내격)으로 돌아오기도 해요. 지나온 시기의 경험과 견주어 보며 확인해 주세요.') : (neo ? '지배 오행을 따르는 흐름이 뚜렷합니다.' : '지배하는 오행을 따르는 흐름이 뚜렷한 편이에요.')) + verified);
    } else {
      var lead = neo ? '판정: ' + st + '(' + (strong ? '신강' : '신약') + '). 억부 점수 ' + pw.score + '점, 기준선 30점에서 ' + Math.abs(pw.score - 30) + '점 ' + (pw.score >= 30 ? '위' : '아래') + '입니다.' : '억부 점수는 ' + pw.score + '점으로 ' + st + '으로 읽혀요. 신강과 신약을 가르는 기준선은 30점이고, 당신의 ' + dayName + ' 일간은 그 기준선에서 ' + Math.abs(pw.score - 30) + '점 ' + (pw.score >= 30 ? '위' : '아래') + '에 있어요.';
      var tagline = strong ? (neo ? '유형: 스스로 밀고 나가는 주체형.' : '스스로 밀고 나가는 주체형에 가까워요.') : (neo ? '유형: 섬세하게 살피고 함께 가는 공감형.' : '섬세하게 살피고 함께 가는 공감형에 가까워요.');
      html += section(neo ? '네오의 진단' : '연이가 읽은 힘의 모양', hero(st, ['억부 ' + pw.score + '점', '기준 30점', strong ? '주체형' : '공감형']) + para(lead + ' ' + tagline), 'saju-rich__lead');
      html += gaugeHtml;
      var mRow = parts && parts.rows.filter(function (r) { return r.group === 'month'; })[0];
      if (ok) {
        var dRow = parts.rows.filter(function (r) { return r.group === 'day'; })[0];
        var rest = parts.rows.filter(function (r) { return r.group === 'rest'; }), restSum = rest.reduce(function (s, r) { return s + r.delta; }, 0);
        var three = [];
        if (mRow) three.push(['득령 · 월지', mRow.char + ' ' + EL[mRow.el], mRow.delta > 0 ? '득령' : mRow.delta < 0 ? '실령' : '평', num(mRow.delta)]);
        if (dRow) three.push(['득지 · 일지', dRow.char + ' ' + EL[dRow.el], dRow.delta > 0 ? '득지' : dRow.delta < 0 ? '실지' : '평', num(dRow.delta)]);
        three.push(['득세 · 나머지 다섯 글자', rest.map(function (r) { return r.char; }).join(' '), restSum > 0 ? '득세' : restSum < 0 ? '실세' : '평', num(restSum)]);
        html += section(neo ? '득령·득지·득세 판정' : '세 가지 힘의 근거', table('득령·득지·득세', ['요소', '근거 글자', '판정', '점수'], three, ['합계', '', st, String(pw.score)]) +
          more(neo ? '글자별 점수 구성' : '글자별 점수 구성 보기', table('글자별 억부 점수', ['자리', '글자', '오행', '일간과의 관계', '점수'], parts.rows.map(function (r) { return [r.label + hourMark(facts, r.key), r.char, EL[r.el], FAMILY[r.family] || '—', num(r.delta)]; }), ['합계', '', '', '', String(pw.score)])), 'saju-rich__wide');
      }
      var rel = mRow && MONTH_REL[mRow.family];
      html += section('왜 ' + (strong ? '신강' : '신약') + '인가', para((rel ? (neo ? rel.tag + ': ' + rel.neo + ' ' : '태어난 달의 기운(월령)을 보면 ' + rel.tag + '이에요. ' + rel.pig + ' ') : (neo ? '월령은 중립입니다. ' : '태어난 달과 일간의 관계는 중립적이에요. ')) +
        (neo ? '월령에 일지와 나머지 글자의 돕는 힘·누르는 힘을 더한 합계가 ' + pw.score + '점입니다.' : '여기에 일지와 나머지 글자가 일간을 돕거나 누르는 힘을 더해 저울질하면 ' + pw.score + '점이 나와요. ' + (strong ? '스스로 버틸 힘이 넉넉한 쪽이라 신강으로 읽어요.' : '바깥의 요구에 비해 자기 힘이 조금 모자란 쪽이라 신약으로 읽어요. 약점이 아니라 섬세함과 유연함의 바탕이에요.'))));
      var note = STEM_NOTE[dg] || '타고난 기질이 뚜렷한 편';
      html += section('일간 ' + dayName + '의 결', para(neo ? dayName + ' 일간: ' + note + '입니다. ' + (strong ? '힘이 남는 구조이므로 밖으로 써서 덜어낼 때 효율이 납니다. 성과를 나누고 책임 있는 역할을 맡으세요.' : '자원이 모자란 구조이므로 준비·배움·협력으로 뿌리부터 확보하세요. 무리한 선두는 비용이 큽니다.') : dayName + ' 일간은 ' + note + '이에요. ' + (strong ? '힘이 넉넉한 만큼, 그 힘을 밖으로 써서 덜어낼 때 더 빛나는 구조로 읽어요. 성과를 나누고, 사람을 돕고, 책임 있는 역할을 맡는 일이 균형을 잡아 줘요. 모든 것을 혼자 쥐고 있으면 오히려 답답해질 수 있어요.' : '나를 알아주는 사람과 환경 곁에서 실력을 쌓을 때 힘이 잘 쓰이는 구조예요. 무리해서 앞장서기보다 배움과 준비, 협력으로 뿌리를 먼저 다져 보세요.')));
      html += section(neo ? '용신·희신 / 기신·구신' : '나를 살리는 기운 · 조심할 기운', chips(godChips(L, dayEl, pw.yongshin || [], ['용신', '희신'], 'good').concat(godChips(L, dayEl, pw.kijishin || [], ['기신', '구신'], 'care'))) +
        para(neo ? '용신·희신 오행이 대운·세운으로 들어올 때 일이 풀리기 쉽고, 기신·구신이 강해지는 시기에는 확장 속도를 낮추는 편이 안전합니다.' : '용신·희신의 오행이 대운이나 세운으로 들어올 때 일이 수월하게 풀리고 도움을 만나기 쉬워요. 기신·구신이 강해지는 시기에는 한 템포 늦추고, 무리한 확장이나 큰 결정은 조금 더 살펴본 뒤에 해도 늦지 않아요.') +
        more('용신·희신·기신·구신·한신이란', para('용신(用神)은 원국의 균형을 잡는 데 가장 필요한 기운, 희신(喜神)은 용신을 돕는 기운이에요. 기신(忌神)은 용신을 해치는 기운, 구신(仇神)은 기신을 돕는 기운이고, 한신(閑神)은 어느 쪽에도 크게 기울지 않는 기운이에요. 이 원국의 계산은 다섯 오행을 돕는 쪽과 부담 쪽으로 모두 나누기 때문에 한신은 따로 두지 않아요.')));
      html += section('대운 방향 한눈에', para(strong ? (neo ? '식상·재성·관성 운, 즉 힘을 밖으로 쓰고 성과로 바꾸는 흐름이 유리합니다.' : '식상·재성·관성의 운, 즉 기운을 밖으로 쓰고 성취로 바꾸는 흐름에서 사회적인 결실이 맺히기 쉬워요.') : (neo ? '비겁·인성 운, 즉 나를 채우고 지지하는 흐름이 유리합니다.' : '비겁·인성의 운, 즉 나를 채우고 지지해 주는 흐름에서 자신감과 도움이 함께 찾아오기 쉬워요.')) + verified);
    }
    html += more('억부(抑扶)란 무엇인가요?', para('억부는 일간이 너무 강하면 누르고(抑) 약하면 돕는(扶) 쪽으로 균형을 찾는 명리의 기준이에요. 이 원국은 월지를 가장 무겁게 봐요(같은 오행 +40, 인성 +27, 관살 −27, 식상 −10). 일지는 같은 오행이나 인성이면 +13, 관살이면 −9이고, 나머지 다섯 글자는 같은 오행이나 인성이면 +7, 관살이면 −7이에요. 합계 30점 이상을 신강, 그 아래를 신약으로 판정하고, 단계 이름은 점수 구간을 읽기 쉽게 붙인 것이에요. 점수는 사람의 능력이나 가치를 매기는 등급이 아니에요.'));
    return wrap(mode, html, facts);
  }

  /* ── 십성 ── */
  var GODS = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
  var GOD_HANJA = {'비견':'比肩', '겁재':'劫財', '식신':'食神', '상관':'傷官', '편재':'偏財', '정재':'正財', '편관':'偏官', '정관':'正官', '편인':'偏印', '정인':'正印'};
  var GOD_FAMILY = {'비견':'same', '겁재':'same', '식신':'drain', '상관':'drain', '편재':'wealth', '정재':'wealth', '편관':'control', '정관':'control', '편인':'parent', '정인':'parent'};
  var FAMILY_ORDER = ['same', 'drain', 'wealth', 'control', 'parent'];
  /* 옛 TS_DEEP 4단(성격·직업·연애·조언)을 연이 존댓말로 다시 쓰고 네오의 진단·행동 기준을 더했다. [연이, 네오] */
  var GOD = {
    '비견': {line:['스스로 정하고 스스로 책임질 때 편안해지는 자기 기준의 기운이에요.', '자기 기준과 독립성. 내 이름을 거는 구조에서 효율이 납니다.'],
      nature:['비견(比肩)은 일간과 오행도 음양도 같은 글자, 말 그대로 어깨를 나란히 하는 또 하나의 나예요. 그래서 간섭받지 않고 내 방식대로 할 때 힘이 나고, 겉으로 조용해 보여도 속의 자존심과 주관이 단단한 편이에요. 동료를 아끼는 의리가 있어서 마음 맞는 사람과는 오래 함께 가요.', '비견은 일간과 같은 오행·같은 음양입니다. 핵심은 자립과 주관입니다. 지시받는 구조보다 내 이름을 거는 구조에서 성과가 납니다. 동료와의 의리가 강점입니다.'],
      career:'독립성이 보장되는 전문직·프리랜서·개인 사업, 또는 조직 안에서도 자기 영역이 분명한 역할과 잘 맞는 편입니다. 동업이라면 지분과 역할을 처음부터 문서로 나눠 두는 것이 좋습니다.',
      love:'구속보다 존중을 원하는 친구 같은 관계를 편안해합니다. 각자의 시간과 영역을 지켜 주는 상대와 오래 가는 경향이 있습니다.',
      advice:['주관은 당신의 큰 힘이지만, 고집으로 들릴 때가 있어요. 중요한 결정 하나에는 "내가 틀릴 수도 있다"는 자리를 남겨 두고 한 사람의 의견을 더 들어 보세요.', '혼자 정할 일과 함께 정할 일을 먼저 나누세요. 공동 결정에는 반대 의견 하나를 반드시 확인하세요.']},
    '겁재': {line:['함께 달리는 사람이 있을 때 더 힘이 나는 경쟁과 협력의 기운이에요.', '경쟁심과 결집력. 비교 대상이 있을 때 속도가 오릅니다.'],
      nature:['겁재(劫財)는 일간과 오행은 같고 음양이 다른 글자예요. 나와 닮았지만 다른 사람, 그래서 경쟁자이자 동료예요. 지고 나면 쉽게 잠들지 못할 만큼 승부욕이 있고, 사람을 모으고 판을 키우는 재주가 있는 편이에요. 겉으로는 웃어도 속으로는 다음 수를 헤아리는 전략가의 면도 있어요.', '겁재는 일간과 같은 오행·다른 음양입니다. 핵심은 승부욕과 결집력입니다. 경쟁 구도에서 성과가 나지만 자원이 함께 빠져나가기 쉬운 구조입니다.'],
      career:'영업·스포츠·엔터테인먼트·협상·정치처럼 경쟁과 네트워크가 성과로 이어지는 분야에서 두각을 나타내기 쉽습니다. 팀을 이끌 때 사람을 모으는 힘이 장점입니다.',
      love:'설렘과 열정이 있는 관계에 끌리는 편입니다. 자존심 싸움으로 번지지 않도록 이기는 것보다 맞추는 쪽을 연습하면 관계가 오래 갑니다.',
      advice:['들어오는 만큼 나가는 구멍도 커지기 쉬운 기운이에요. 수입이 생기면 일정 몫을 먼저 떼어 두는 자동 저축처럼, 내 기분과 상관없이 지켜지는 장치를 하나 만들어 두세요.', '경쟁에 들어가기 전에 비용 상한과 역할을 합의하세요. 무리한 투자와 보증은 피하세요.']},
    '식신': {line:['좋아하는 일을 꾸준히 다듬고 나누는 표현과 여유의 기운이에요.', '꾸준한 생산력. 좋아하는 일을 반복할 때 실력이 쌓입니다.'],
      nature:['식신(食神)은 일간이 낳는 글자 가운데 음양이 같은 것으로, 먹을 복과 손재주, 여유로운 표현을 뜻해요. 천성이 낙천적이고 베푸는 것을 좋아해서 곁에 있는 사람을 편안하게 만드는 편이에요. 한 가지를 깊이 파고 꾸준히 다듬는 장인의 기질도 있고, 명리에서는 거친 편관을 다스려 주는 복된 기운으로 봐요.', '식신은 일간이 생하는 같은 음양의 글자입니다. 핵심은 꾸준한 생산과 표현입니다. 좋아하는 일을 반복할 때 실력과 수입이 함께 쌓입니다. 편관을 제어하는 역할도 합니다.'],
      career:'요리·교육·디자인·연구·콘텐츠 제작처럼 손과 머리로 무언가를 만들어 내는 일과 잘 맞는 편입니다. 좋아하는 일을 할 때 능력이 가장 잘 나오는 타입입니다.',
      love:'챙겨 주고 함께 즐기는 다정한 관계를 만듭니다. 맛있는 것을 나누고 일상을 함께하는 데서 애정을 느끼는 경향이 있습니다.',
      advice:['마음이 넉넉한 만큼 아무에게나 퍼 주다 지칠 수 있어요. 편안함이 늘어짐으로 바뀌지 않도록 몸을 움직이는 작은 규칙 하나를 곁에 두세요.', '반복 가능한 분량으로 시작하고 결과물을 남기세요. 베푸는 범위에는 상한을 두세요.']},
    '상관': {line:['익숙한 틀에 질문을 던지고 더 나은 방법을 찾는 재치와 개선의 기운이에요.', '비판적 사고와 언변. 문제를 찾고 고치는 데 강합니다.'],
      nature:['상관(傷官)은 일간이 낳는 글자 가운데 음양이 다른 것으로, 빠른 머리 회전과 말재주, 틀을 깨는 창의력을 뜻해요. 부조리한 것을 그냥 넘기지 못하는 정의감이 있고, 모두가 당연하게 여기는 것에 "왜?"라고 묻는 사람이에요. 그 날카로움이 개선과 혁신이 되기도 하고, 때로는 윗사람과의 마찰이 되기도 해요.', '상관은 일간이 생하는 다른 음양의 글자입니다. 핵심은 비판적 사고와 표현력입니다. 정관(규칙·윗사람)과 부딪히기 쉬우므로 표현 방식이 성과를 가릅니다.'],
      career:'기획·마케팅·언론·법률·컨설팅·크리에이터처럼 새로운 시각과 말·글이 무기가 되는 분야에서 빛나기 쉽습니다. 규칙이 지나치게 촘촘한 조직에서는 답답함을 느낄 수 있습니다.',
      love:'대화가 잘 통하는 재치 있는 상대에게 끌리는 편입니다. 지루함을 잘 못 견디니 함께 새로운 것을 해 보는 관계가 잘 맞습니다.',
      advice:['한마디로 마음을 얻기도 하고 잃기도 하는 기운이에요. 마음이 뜨거워질 때는 세 번 숨을 고른 뒤, 문제를 짚는 말 끝에 대안 하나를 붙여 보세요.', '문제를 지적할 때 대안을 함께 내세요. 감정이 오른 상태에서는 결정을 미루세요.']},
    '편재': {line:['넓은 세상을 누비며 기회를 잡고 사람을 움직이는 활동과 융통의 기운이에요.', '기회 포착과 자원 운용. 큰 그림과 유통에 강합니다.'],
      nature:['편재(偏財)는 일간이 다스리는 글자 가운데 음양이 같은 것으로, 흐르는 재물과 넓은 활동 무대를 뜻해요. 작은 것에 매이지 않고 큰 흐름을 보는 눈이 있고, 유머와 사교성이 있어 주변에 사람이 모이는 편이에요. 돈을 쌓아 두기보다 돌리는 데 재능이 있는 타입이에요.', '편재는 일간이 극하는 같은 음양의 글자입니다. 핵심은 기회 포착과 자원 회전입니다. 수입과 지출의 폭이 함께 커지는 구조입니다.'],
      career:'무역·유통·영업·투자·해외 업무·사업 개발처럼 사람과 자원을 움직여 성과를 만드는 분야와 잘 맞는 편입니다.',
      love:'즐겁고 화끈한 관계를 좋아하고 상대를 즐겁게 해 주는 데 능합니다. 관심이 여러 곳으로 퍼지기 쉬우니 한 사람에게 쓰는 시간을 의식해서 지키면 좋습니다. 명리에서 남성에게 재성은 배우자의 별로도 읽습니다.',
      advice:['기회가 많이 보이는 만큼 계획 없는 지출도 생기기 쉬워요. 돈이 들어오면 일부는 쉽게 꺼내 쓰기 어려운 곳에 먼저 묶어 두세요.', '투자·지출 결정 전에 손실 한도를 정하세요. 수입의 일정 비율은 바로 묶어 두세요.']},
    '정재': {line:['차곡차곡 쌓고 꼼꼼히 지키는 성실함과 관리의 기운이에요.', '관리와 축적. 안정적인 구조에서 꾸준히 불립니다.'],
      nature:['정재(正財)는 일간이 다스리는 글자 가운데 음양이 다른 것으로, 성실하게 번 고정 수입과 알뜰한 관리를 뜻해요. 돌다리도 두드려 보고 건너는 신중함이 있고, 약속과 신용을 무겁게 여기는 편이에요. 한 번 맡은 일은 끝까지 챙겨서 주변에서 믿고 맡기기 좋아하는 사람이에요.', '정재는 일간이 극하는 다른 음양의 글자입니다. 핵심은 꼼꼼한 관리와 꾸준한 축적입니다. 큰 한 방보다 안정적인 반복에서 자산이 늘어나는 구조입니다.'],
      career:'회계·금융·행정·관리·약학처럼 정확성과 신뢰가 중요한 체계적인 분야에서 강점을 보이기 쉽습니다. 안정적인 급여 구조와 잘 맞는 편입니다.',
      love:'신뢰와 안정을 가장 중요하게 여깁니다. 가볍게 시작하기보다 진지하게 오래 가는 관계를 선호하고, 생활을 함께 꾸리는 데 강합니다. 명리에서 남성에게 정재는 배우자의 별로도 읽습니다.',
      advice:['꼼꼼함이 지나치면 스스로를 아끼느라 즐거움을 놓칠 수 있어요. 가끔은 계산 없이 마음 가는 곳에 작은 낭만 하나를 써 보세요.', '지출 기준을 정해 두되, 경험과 관계에 쓰는 예산도 따로 잡으세요.']},
    '편관': {line:['어려운 일을 버텨 내고 책임을 지는 카리스마와 극복의 기운이에요.', '압박 대응력. 위기에서 결단하고 버팁니다.'],
      nature:['편관(偏官)은 일간을 극하는 글자 가운데 음양이 같은 것으로, 칠살(七殺)이라고도 불러요. 강한 압박과 시련을 뜻하지만, 그것을 견뎌 내는 힘과 카리스마가 함께 따라와요. 자존심과 명예를 소중히 여기고 약한 사람을 지키려는 의협심이 있는 편이에요. 식신이나 인성이 곁에 있으면 이 거친 힘이 다듬어져 권위가 된다고 봐요.', '편관은 일간을 극하는 같은 음양의 글자입니다. 핵심은 압박 속 결단력입니다. 일간이 강하면 권위가 되고, 약하면 스트레스로 체감되기 쉽습니다.'],
      career:'군·경찰·법조·의료·안전·위기 관리처럼 긴장과 책임이 큰 현장에서 진가를 발휘하기 쉽습니다. 규율이 분명한 곳에서 리더십이 드러납니다.',
      love:'나를 인정하고 존중해 주는 상대를 원합니다. 한번 마음을 주면 끝까지 지키려는 책임감이 강한 편입니다. 명리에서 여성에게 관성은 배우자의 별로도 읽습니다.',
      advice:['힘든 것을 속으로 삼키는 편이라 마음이 먼저 지칠 수 있어요. 땀 흘리는 운동이나 몰입할 취미처럼 압박을 밖으로 내보내는 통로를 하나 꼭 만들어 두세요.', '책임 범위를 문서로 정하세요. 스트레스는 운동 같은 정기 루틴으로 해소하세요.']},
    '정관': {line:['바른 길을 지키고 신뢰를 쌓는 책임과 질서의 기운이에요.', '원칙과 신뢰. 체계 안에서 평판이 쌓입니다.'],
      nature:['정관(正官)은 일간을 극하는 글자 가운데 음양이 다른 것으로, 나를 바르게 다듬어 주는 규칙과 명예를 뜻해요. 원칙을 지키고 맡은 자리에서 성실하게 책임을 다해서, 어디서나 "믿을 수 있는 사람"이라는 말을 듣는 편이에요. 체면과 평판을 중요하게 여겨요.', '정관은 일간을 극하는 다른 음양의 글자입니다. 핵심은 원칙과 신뢰입니다. 체계 있는 조직에서 평가와 승진으로 보상받는 구조입니다.'],
      career:'공공기관·행정·교육·대기업·관리직처럼 체계와 절차가 분명한 조직에서 진가를 발휘하기 쉽습니다.',
      love:'예의 바르고 단정한 관계를 선호하고, 약속을 지키는 믿음직한 상대에게 끌립니다. 명리에서 여성에게 정관은 배우자의 별로도 읽습니다.',
      advice:['바른 기준이 때로는 스스로를 옭아매는 틀이 되기도 해요. 남의 시선보다 내 마음이 편한 쪽을 한 번쯤 먼저 골라 보세요.', '규칙을 지키되, 바꿀 수 있는 규칙과 지켜야 할 규칙을 구분하세요.']},
    '편인': {line:['남다른 시선으로 숨은 이치를 알아보는 직관과 통찰의 기운이에요.', '직관과 독자적 관점. 남이 못 보는 것을 봅니다.'],
      nature:['편인(偏印)은 일간을 낳는 글자 가운데 음양이 같은 것으로, 효신(梟神)이라고도 불러요. 직관과 영감이 뛰어나고 눈치가 빨라서 남들이 놓치는 이면을 먼저 알아채는 편이에요. 철학·심리·기술처럼 깊이 파고드는 분야에 끌리고, 혼자 생각하는 시간이 꼭 필요한 사람이에요.', '편인은 일간을 생하는 같은 음양의 글자입니다. 핵심은 직관과 독자적 해석입니다. 아이디어는 많고 실행이 늦어지기 쉬운 구조입니다.'],
      career:'연구·IT 개발·심리·상담·의료·예술처럼 비범한 통찰과 전문 지식이 필요한 분야와 잘 맞는 편입니다.',
      love:'조건보다 영혼이 통하는 느낌을 중요하게 여깁니다. 말하지 않아도 이해받는 관계를 원하는 경향이 있습니다.',
      advice:['생각이 깊은 만큼 머릿속에서만 맴돌다 때를 놓칠 수 있어요. 떠오른 아이디어 하나를 이번 주 안에 아주 작게라도 손으로 옮겨 보세요.', '아이디어마다 첫 실행 날짜를 정하세요. 검토는 기한을 두고 끝내세요.']},
    '정인': {line:['배우고 보살핌을 주고받으며 마음의 뿌리를 키우는 학문과 후원의 기운이에요.', '학습과 후원. 배움과 인정이 성장 동력입니다.'],
      nature:['정인(正印)은 일간을 낳는 글자 가운데 음양이 다른 것으로, 어머니의 품 같은 보살핌과 학문을 뜻해요. 마음이 따뜻하고 배우는 것을 좋아해서 지식과 자격을 차근차근 쌓는 편이에요. 윗사람의 도움과 인복이 따르기 쉽다고 봐요.', '정인은 일간을 생하는 다른 음양의 글자입니다. 핵심은 학습과 후원입니다. 자격·학위·멘토가 성과로 이어지는 구조입니다.'],
      career:'교육·학문·상담·출판·자격 기반 전문직처럼 배우고 가르치는 환경에서 좋은 성과를 내기 쉽습니다.',
      love:'다정하게 보살펴 주는 상대를 좋아하고, 정신적인 교감과 칭찬에 마음이 열리는 편입니다.',
      advice:['받는 사랑에 익숙해지면 스스로 정하는 일이 어려워질 수 있어요. 작은 결정부터 하나씩 직접 내려 보며 자립의 근육을 키워 보세요.', '결정권이 있는 일은 직접 정하세요. 학습은 실전 적용 일정과 묶으세요.']}
  };
  /* 계열 과다(겉 글자 3개 이상)·부재(0개). [연이, 네오]. weak/strong 은 억부 판정과 엮은 덧말. */
  var FAMILY_OVER = {
    same:{base:['비겁이 많아 주관과 자존심이 두드러지는 원국이에요. 혼자 해내는 힘은 크지만 몫을 두고 사람과 부딪히기 쉬워, 명리에서는 군겁쟁재(群劫爭財)를 조심하라고 해요. 돈이 얽힌 동업은 규칙부터 정해 두세요.', '비겁 과다: 주관이 강하고 경쟁이 잦습니다. 군겁쟁재(群劫爭財) 구조이므로 공동 자금과 동업은 규칙부터 정하세요.']},
    drain:{base:['식상이 많아 표현과 재능이 넘치는 원국이에요. 아이디어와 말이 풍성하지만 힘을 밖으로 많이 내보내 쉽게 지칠 수 있어요. 벌여 놓은 일을 마무리하는 습관이 재능을 결실로 바꿔요.', '식상 과다: 표현과 생산이 많고 기력 소모가 큽니다. 시작보다 마무리에 일정을 배정하세요.'],
      weak:['일간의 힘이 약한 편이라 명리에서는 설기(洩氣)가 과하다고 봐요. 쉬어 가는 시간과 배움(인성)이 기운을 다시 채워 줘요.', '신약과 겹쳐 설기 과다입니다. 휴식과 학습(인성)으로 보충하세요.']},
    wealth:{base:['재성이 많아 현실 감각과 재물 활동이 두드러지는 원국이에요. 해야 할 일과 챙길 사람이 많아 바쁘기 쉬워요.', '재성 과다: 현실 과제와 관리 대상이 많습니다.'],
      weak:['일간의 힘이 약한 편이라 명리에서는 재다신약(財多身弱)이라 불러요. 감당할 수 있는 만큼만 맡을 때 재물이 온전히 내 것이 돼요.', '신약과 겹쳐 재다신약(財多身弱)입니다. 맡는 범위를 감당 가능한 수준으로 제한하세요.']},
    control:{base:['관성이 많아 책임과 기대가 무겁게 느껴지기 쉬운 원국이에요. 맡은 역할이 많아질수록 기준을 분명히 하는 것이 힘이 돼요.', '관성 과다: 책임과 외부 기대가 큽니다. 역할의 경계를 먼저 정하세요.'],
      weak:['일간의 힘이 약한 편이라 압박이 스트레스로 체감되기 쉬워요(관살태과, 官殺太過). 인성, 곧 배움과 쉼과 믿을 만한 조언자가 그 압박을 힘으로 바꿔 주는 통로예요.', '신약과 겹쳐 관살태과(官殺太過)입니다. 인성(학습·휴식·조언자)을 통로로 쓰세요.']},
    parent:{base:['인성이 많아 생각과 배움이 깊은 원국이에요. 다만 받는 것에 익숙해지면 실행이 늦어질 수 있어요.', '인성 과다: 사고와 학습이 깊고 실행이 늦어지기 쉽습니다.'],
      strong:['일간도 이미 강한 편이라 명리에서는 재성으로 넘치는 인성을 덜어 내는 쪽을 권해요. 배운 것을 현실의 결과물로 바꾸는 일이 균형을 잡아 줘요.', '신강과 겹칩니다. 재성(현실 성과)으로 인성을 덜어 내세요.']}
  };
  var FAMILY_NONE = {
    same:['비겁이 겉으로 드러나지 않아, 혼자 버티는 힘보다 주변과 맞추는 힘이 앞서는 편이에요. 지칠 때 기댈 동료를 곁에 두세요.', '비겁 부재: 독자 추진력보다 조율에 강합니다. 협력자를 확보하세요.'],
    drain:['식상이 겉으로 드러나지 않아, 마음속 생각을 밖으로 꺼내는 길이 좁을 수 있어요. 글쓰기·기록처럼 표현 통로를 일부러 만들어 두면 좋아요.', '식상 부재: 표현 경로가 좁습니다. 기록·발표 같은 출력 루틴을 만드세요.'],
    wealth:['재성이 겉으로 드러나지 않아, 돈 자체보다 의미와 사람을 좇는 경향이 있어요. 재무 관리는 습관과 도구로 보완하면 충분해요.', '재성 부재: 재무 감각을 시스템으로 보완하세요.'],
    control:['관성이 겉으로 드러나지 않아, 틀에 매이지 않는 자유로움이 커요. 스스로 정한 마감과 규칙이 대신 중심을 잡아 줘요.', '관성 부재: 외부 규율이 약합니다. 스스로 마감과 규칙을 정하세요.'],
    parent:['인성이 겉으로 드러나지 않아, 남의 도움보다 직접 부딪혀 배우는 편이에요. 쉬어 가는 시간과 믿을 만한 조언자를 일부러 챙기세요.', '인성 부재: 후원보다 실전으로 배웁니다. 휴식과 조언자를 일정에 넣으세요.']
  };
  var COMBOS = [
    {name:'식상생재(食傷生財)', test:function (n) { return (n['식신'] || n['상관']) && (n['편재'] || n['정재']); },
      text:['식상과 재성이 함께 있어 재능이 수입으로 이어지는 흐름이 보여요. 좋아하는 일을 꾸준히 결과물로 만들면 그것이 재물로 연결되기 쉬운 구조예요.', '식상→재성 연결이 있습니다. 재능을 결과물로 만들면 수익화가 쉽습니다.']},
    {name:'관인상생(官印相生)', test:function (n) { return (n['편관'] || n['정관']) && (n['편인'] || n['정인']); },
      text:['관성과 인성이 함께 있어 책임이 배움으로, 배움이 다시 실력으로 이어지는 흐름이에요. 조직 안에서 자격과 평판이 함께 쌓이기 쉬워요.', '관성→인성→일간 연결이 있습니다. 조직 내 자격·평판 축적에 유리합니다.']},
    {name:'식신제살(食神制殺)', test:function (n) { return n['식신'] && n['편관']; },
      text:['식신이 편관을 다스리는 구조예요. 압박이 와도 실력과 기술로 풀어내는 힘이 있다고 봐요.', '식신이 편관을 제어합니다. 압박을 기술로 해결하는 구조입니다.']},
    {name:'상관견관(傷官見官)', test:function (n) { return n['상관'] && n['정관']; },
      text:['상관과 정관이 함께 있어 규칙과 내 생각이 부딪히는 순간이 생기기 쉬워요. 의견을 낼 때 절차를 존중하는 형식을 갖추면 날카로움이 설득력이 돼요.', '상관과 정관이 공존합니다. 규칙과 충돌하기 쉬우니 절차를 지켜 의견을 내세요.']},
    {name:'관살혼잡(官殺混雜)', test:function (n) { return n['편관'] && n['정관']; },
      text:['정관과 편관이 함께 있어 책임과 역할이 여러 갈래로 겹치기 쉬워요. 맡은 일의 우선순위를 분명히 하면 혼란이 줄어요.', '정관·편관이 함께 있습니다. 역할이 겹치기 쉬우니 우선순위를 고정하세요.']}
  ];
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
  function palaceOf(L, key) { return (L.CD_PALACE || []).filter(function (x) { return x.key === key; })[0]; }
  function tenOverview(facts, mode) {
    var p = facts && facts.p, L = lib(facts), m = p && godMap(p, L);
    if (!m) return '';
    var neo = mode === 'neo', k = neo ? 1 : 0, dayEl = L.GAN[p.d.g].e, strong = !!(facts.power && facts.power.isStrong), html = '';
    var fams = FAMILY_ORDER.map(function (f) {
      var gs = GODS.filter(function (g) { return GOD_FAMILY[g] === f; }), el = familyEl(L, dayEl, f);
      return {f:f, gods:gs, el:el, role:roleOf(facts, el),
        surface:gs.reduce(function (s, g) { return s + (m.surface[g] || 0); }, 0), hidden:gs.reduce(function (s, g) { return s + (m.hidden[g] || 0); }, 0)};
    });
    var max = Math.max.apply(null, fams.map(function (x) { return x.surface; }));
    var top = fams.filter(function (x) { return x.surface === max; }), none = fams.filter(function (x) { return x.surface === 0; });
    var names = function (list) { return list.map(function (x) { return FAMILY[x.f]; }).join(', '); };
    html += section(neo ? '네오의 진단' : '연이가 본 십성의 무게', hero(names(top), [(neo ? '우세 ' : '가장 많은 계열 ') + max + '개', none.length ? (neo ? '부재 ' : '비어 있음 ') + names(none) : (neo ? '부재 없음' : '다섯 계열 모두')]) + para(neo ?
      '판정: ' + names(top) + ' 우세(일간 제외 일곱 글자 중 ' + max + '개). ' + (none.length ? '부재: ' + names(none) + '.' : '다섯 계열이 모두 드러나 있습니다.') :
      '일간을 뺀 일곱 글자 가운데 가장 무게가 실린 것은 ' + names(top) + '이에요. ' + FAMILY_MEANING[top[0].f].split(' · ')[1] + '의 결이 생활 곳곳에서 드러나기 쉬워요. ' + (none.length ? '반면 ' + names(none) + '은 겉으로 드러나지 않았어요.' : '다섯 계열이 모두 겉으로 드러나 있어 쓸 수 있는 도구가 고른 편이에요.')), 'saju-rich__lead');
    html += section(neo ? '계열별 분포' : '다섯 계열의 분포',
      '<ul class="saju-bars">' + fams.map(function (x) { return '<li data-el="' + x.el + '"><span class="saju-bars__label">' + esc(FAMILY[x.f]) + '</span><span class="saju-bars__track" aria-hidden="true"><i style="--pos:' + pct(x.surface, 0, 7) + '%"></i></span><span class="saju-bars__value">' + x.surface + '</span></li>'; }).join('') + '</ul>' +
      table('십성 분포', ['계열', '겉 글자', '지장간', '세부 십성', '억부에서'], fams.map(function (x) {
        return [FAMILY[x.f] + ' · ' + EL[x.el], String(x.surface), String(x.hidden), x.gods.map(function (g) { return g + ' ' + (m.surface[g] || 0); }).join(' · '), x.role || '—'];
      })) + '<p class="saju-rich__note">' + esc(neo ? '겉 글자는 일간을 뺀 천간 3개와 지지 4개, 지장간은 지지 속 천간을 모두 센 값입니다. 개수는 순위나 성공 확률이 아닙니다.' : '겉 글자는 일간을 뺀 천간 3개와 지지 4개, 지장간은 지지 속에 숨은 천간까지 모두 센 값이에요. 개수가 많다고 더 좋거나 나쁜 것은 아니에요.') + (facts.unknown ? ' ' + esc(neo ? '시간·시지는 정오 대입값입니다.' : '시간·시지는 정오를 대입한 값이에요.') : '') + '</p>', 'saju-rich__wide');
    var notes = [];
    fams.forEach(function (x) {
      var o = FAMILY_OVER[x.f];
      if (x.surface >= 3) notes.push(o.base[k] + ((!strong && o.weak) ? ' ' + o.weak[k] : (strong && o.strong) ? ' ' + o.strong[k] : ''));
      else if (x.surface === 0) notes.push(x.hidden ? (neo ? FAMILY[x.f] + ': 겉에는 없고 지장간에 ' + x.hidden + '개 있습니다. 필요할 때 늦게 꺼내 쓰는 잠재력입니다.' : FAMILY[x.f] + '은 겉으로 드러나지 않았지만 지장간에 ' + x.hidden + '개 숨어 있어요. 필요할 때 천천히 꺼내 쓰는 잠재력으로 읽어요.') : FAMILY_NONE[x.f][k]);
    });
    html += section(neo ? '과다·부재 판정' : '많은 기운 · 비어 있는 기운', notes.length ? notes.map(para).join('') : para(neo ? '과다(3개 이상)·부재 계열이 없습니다. 도구가 고르게 분산된 구조입니다.' : '한쪽으로 크게 쏠리거나 비어 있는 계열이 없어요. 여러 도구를 상황에 맞게 꺼내 쓰기 좋은 고른 구조예요.'));
    var combos = COMBOS.filter(function (c) { return c.test(m.surface); });
    if (combos.length) html += section(neo ? '구조 조합' : '눈여겨볼 십성의 조합', chips(combos.map(function (c) { return {tag:c.name, text:'', note:c.text[k]}; })));
    html += more('십성(十星) 읽는 법', para('십성은 일간을 기준으로 나머지 글자가 어떤 관계인지 열 가지로 나눈 것이에요. 같은 오행은 비겁, 내가 낳는 오행은 식상, 내가 다스리는 오행은 재성, 나를 다스리는 오행은 관성, 나를 낳는 오행은 인성이고, 음양이 같으면 편(偏)·다르면 정(正)으로 갈라요(비견·겁재만 예외).') +
      para('천간은 겉으로 드러나는 모습, 지지는 생활의 바탕, 지장간은 아직 드러나지 않은 잠재력으로 읽어요. 지지 십성은 이 서비스의 기준대로 지지의 오행·음양으로 판정해요.'));
    return wrap(mode, html, facts);
  }
  function tenCards(facts, mode) {
    var p = facts && facts.p, L = lib(facts), m = p && godMap(p, L);
    if (!m) return '';
    var k = mode === 'neo' ? 1 : 0;
    return GODS.filter(function (g) { return m.surface[g]; }).map(function (g) {
      var at = m.where[g].map(function (w) { return w.label + hourMark(facts, w.key); }).join('·');
      var e = elOf(L, m.where[g][0].char);
      return '<button class="saju-ten-button" type="button" data-saju-god="' + esc(g) + '"' + (e ? ' data-el="' + e + '"' : '') + '><strong><i class="saju-ten-button__seal" aria-hidden="true">' + esc(GOD_HANJA[g].charAt(0)) + '</i>' + esc(g + ' · ' + GOD_HANJA[g]) + '</strong><span>' + esc(GOD[g].line[k]) + '</span><small>' + esc(at + ' · 자세히 보기') + '</small></button>';
    }).join('');
  }
  function godDetail(key, facts, mode) {
    var d = GOD[key], p = facts && facts.p, L = lib(facts), m = p && godMap(p, L);
    if (!d || !m) return '';
    var neo = mode === 'neo', k = neo ? 1 : 0, f = GOD_FAMILY[key], dayEl = L.GAN[p.d.g].e, role = roleOf(facts, familyEl(L, dayEl, f));
    var where = m.where[key] || [], html = '<h3>' + esc(key + '(' + GOD_HANJA[key] + ') · ' + FAMILY[f]) + '</h3>';
    html += section(neo ? '네오의 진단' : '연이가 읽은 성격과 기질', para(d.nature[k]));
    var rows = where.map(function (w) { var pal = palaceOf(L, w.key); return [w.label + hourMark(facts, w.key), w.char, pal ? pal.label + ' · ' + pal.palace : '—', (w.side === 'g' ? '겉으로 드러나는 모습' : '생활의 바탕') + (pal ? ' · ' + pal.domain : '')]; });
    html += section(neo ? '계산 근거' : '당신 원국에서의 자리', (rows.length ? table(key + '의 자리', ['자리', '글자', '궁위', '드러나는 영역'], rows) : '') +
      para((neo ? '겉 글자 ' + where.length + '곳, 지장간 ' + (m.hidden[key] || 0) + '곳. ' : '겉으로 ' + where.length + '곳, 지장간까지 보면 ' + (m.hidden[key] || 0) + '곳에 이 기운이 있어요. ') +
        (role ? (neo ? '억부 기준 이 계열은 ' + role + '입니다.' : '억부로 보면 이 계열은 당신에게 ' + role + '이에요. ' + (role === '용신' || role === '희신' ? '북돋울수록 균형이 잡히는 쪽이에요.' : '지나치지 않게 조절할 때 편안한 쪽이에요.')) : '')));
    html += section('일과 적성', para(d.career));
    html += section(neo ? '관계' : '관계의 모습', para(d.love));
    html += section(neo ? '행동 기준' : '연이의 조언', para(d.advice[k]));
    return wrap(mode, html, facts);
  }

  /* ── 일주 · 원국 네 기둥 ── */
  var STAGE12 = {
    '장생':'새로 태어나 자라기 시작하는 단계 · 배우고 시작하는 힘', '목욕':'처음 세상에 몸을 씻는 단계 · 호기심과 감수성, 변화가 많음',
    '관대':'옷을 갖춰 입고 사회로 나서는 단계 · 자신감과 의욕', '건록':'스스로 녹봉을 받는 단계 · 자립과 실무 능력',
    '제왕':'기운이 가장 왕성한 단계 · 주도성과 강한 자기 확신', '쇠':'정점을 지나 노련해지는 단계 · 경험과 신중함',
    '병':'기운이 잦아들며 섬세해지는 단계 · 공감과 배려', '사':'움직임을 멈추고 생각이 깊어지는 단계 · 집중과 탐구',
    '묘':'거두어 창고에 담는 단계 · 저장과 관리, 내실', '절':'이전 것과 끊고 새로 바뀌는 단계 · 전환과 결단',
    '태':'새 생명을 잉태하는 단계 · 구상과 가능성', '양':'품 안에서 길러지는 단계 · 준비와 보살핌'
  };
  var SPOUSE = {
    same:['일지에 비겁이 있어 배우자 자리에 나와 닮은 기운이 앉아 있어요. 친구처럼 대등한 관계가 편안하고, 서로의 영역을 존중할 때 오래 가요.', '일지 비겁: 대등한 동반자형 관계가 맞습니다. 각자의 영역을 존중하는 규칙이 핵심입니다.'],
    drain:['일지에 식상이 있어 배우자 자리에서 표현과 돌봄이 흘러나와요. 함께 즐기고 마음을 말로 표현하는 관계에서 행복을 느끼기 쉬워요.', '일지 식상: 표현과 돌봄이 많은 관계입니다. 감정 표현이 관계 유지의 핵심입니다.'],
    wealth:['일지에 재성이 있어 배우자 자리에 현실을 함께 꾸리는 기운이 있어요. 생활을 같이 설계하고 살뜰히 챙기는 관계가 잘 맞아요.', '일지 재성: 생활을 함께 설계하는 실무형 관계입니다. 재정·역할 분담을 명확히 하세요.'],
    control:['일지에 관성이 있어 배우자 자리에 책임과 질서의 기운이 있어요. 서로 믿고 기대는 단단한 관계를 원하고 약속을 무겁게 여겨요.', '일지 관성: 책임과 신뢰 중심의 관계입니다. 기대치를 말로 합의하세요.'],
    parent:['일지에 인성이 있어 배우자 자리에 보살핌과 이해의 기운이 있어요. 정서적으로 기대고 함께 배우는 관계에서 편안해져요.', '일지 인성: 정서적 지지 중심의 관계입니다. 의존이 한쪽으로 쏠리지 않게 하세요.']
  };
  var ILJU_WORD = {
    '甲':['곧게 자라는 나무는 한 번에 크지 않아요. 이번 주에는 큰 목표 하나를 오늘 할 수 있는 한 걸음으로 잘라 보세요.', '방향 설정이 강점입니다. 큰 목표를 이번 주 실행 단위로 쪼개세요.'],
    '乙':['덩굴은 기댈 곳을 찾아 멀리 뻗어요. 도움을 청하는 것도 당신의 힘이니, 이번 주에 한 사람에게 먼저 손을 내밀어 보세요.', '연결이 강점입니다. 이번 주에 협력자 한 명에게 먼저 요청하세요.'],
    '丙':['해는 스스로 빛나지만 쉬는 밤도 필요해요. 다른 사람을 비추느라 미뤄 둔 나만의 휴식을 오늘 한 칸 잡아 보세요.', '표현력이 강점입니다. 소모를 막도록 휴식 시간을 일정에 먼저 넣으세요.'],
    '丁':['등불은 가까운 곳을 오래 비출 때 가장 따뜻해요. 오늘 곁에 있는 한 사람에게 고마운 마음을 구체적으로 전해 보세요.', '집중력이 강점입니다. 범위를 좁혀 한 가지를 끝까지 하세요.'],
    '戊':['산은 움직이지 않아서 믿음을 줘요. 가끔은 바람이 지나갈 길도 내어 주세요. 이번 주 새 제안 하나에 "좋아요"라고 답해 보세요.', '안정감이 강점입니다. 이번 주에 새 제안 하나를 시험해 보세요.'],
    '己':['밭은 무엇을 심느냐에 따라 달라져요. 남을 위해 갈아 둔 마음밭에 오늘은 당신을 위한 씨앗 하나를 심어 보세요.', '실속이 강점입니다. 이번 주 자원 하나는 자신을 위한 투자로 배정하세요.'],
    '庚':['쇠는 불을 만나 쓸모 있는 연장이 돼요. 당신을 단련하는 어려움 하나를 오늘 피하지 말고 조금만 다뤄 보세요.', '결단력이 강점입니다. 미뤄 둔 어려운 과제 하나를 오늘 착수하세요.'],
    '辛':['보석은 스스로를 아낄 때 더 빛나요. 완벽하지 않아도 괜찮다는 말을 오늘 한 번 스스로에게 건네 보세요.', '기준이 높습니다. 80% 완성도에서 한 번 공유하는 연습을 하세요.'],
    '壬':['큰 물은 둑이 있어야 멀리 흘러요. 넓게 펼친 관심 가운데 이번 주에 붙잡을 한 가지를 정해 보세요.', '시야가 넓습니다. 이번 주 우선순위 하나를 고정하세요.'],
    '癸':['이슬은 작아도 꼭 필요한 곳을 적셔요. 오늘 느낀 직감 하나를 메모로 남겨 두면 나중에 길잡이가 돼요.', '직관이 강점입니다. 판단 근거를 메모로 남겨 검증하세요.']
  };
  function hiddenText(L, j) {
    var list = (L.CD_JANGGAN && L.CD_JANGGAN[j]) || [];
    return list.map(function (h, i) { return h + (i === list.length - 1 ? '(정기)' : i === 0 ? '(여기)' : '(중기)'); }).join(' ');
  }
  // 받침에 맞춘 조사: jo('쇠', '으로', '로') → '로'. ㄹ 받침은 '로'를 쓴다.
  function jo(word, withB, without) {
    var code = String(word).charCodeAt(String(word).length - 1) - 0xAC00, b = code >= 0 && code <= 11171 ? code % 28 : -1;
    if (b < 0) return withB + '(' + without + ')';
    return b === 0 || (b === 8 && without === '로') ? without : withB;
  }
  function ilju(facts, mode) {
    var p = facts && facts.p, L = lib(facts);
    if (!p || !p.d || !p.d.g || !p.d.j || !L.GAN[p.d.g] || !L.getTenGod) return '';
    var neo = mode === 'neo', k = neo ? 1 : 0, dg = p.d.g, dj = p.d.j, dayName = L.GAN[dg].n || dg, twelve = L.cdTwelveStage || function () { return ''; };
    var god = function (c) { var g = L.getTenGod(dg, c); return g && g !== '?' ? g : ''; };
    var html = '';
    var rows = (L.CD_PALACE || [{key:'y', label:'년주'}, {key:'m', label:'월주'}, {key:'d', label:'일주'}, {key:'h', label:'시주'}]).map(function (pal) {
      var col = p[pal.key] || {}, span = pal.palace ? pal.palace + ' · ' + pal.span : '';
      if (pal.key === 'h' && facts.unknown) return [pal.label + ' (미상)', '미상', '미상', '미상', '미상', span];
      return [pal.label, col.g + ' · ' + (pal.key === 'd' ? '일간(나)' : god(col.g)), col.j + ' · ' + god(col.j), hiddenText(L, col.j), twelve(dg, col.j) || '—', span];
    });
    var spouseGod = god(dj), spouseStage = twelve(dg, dj), spouseFam = GOD_FAMILY[spouseGod];
    html += section(neo ? '네오의 진단' : '연이가 펼쳐 본 네 기둥', hero(dg + dj, [dayName + ' 일간', spouseGod ? '일지 ' + spouseGod : '', spouseStage ? '12운성 ' + spouseStage : ''], true) + para(neo ?
      dayName + '(' + dg + ') 일간, 일지 ' + dj + '(' + (spouseGod || '—') + ' · ' + (spouseStage || '—') + '). 아래 표가 계산 근거입니다.' :
      '당신의 중심은 ' + dayName + '(' + dg + ') 일간이고, 바로 아래 일지 ' + dj + '에는 ' + (spouseGod || '—') + jo(spouseGod || '—', '이', '가') + ' ' + (spouseStage || '—') + '의 자리로 앉아 있어요. 네 기둥을 한눈에 펼쳐 보면 이렇게 읽혀요.') +
      table('원국 네 기둥', ['기둥', '천간 · 십성', '지지 · 십성', '지장간', '12운성', '궁위'], rows) +
      '<p class="saju-rich__note">' + esc(neo ? '12운성은 일간 기준, 음간은 역행(음생양사) 정본을 따릅니다. 궁위 나이는 전통적인 근묘화실 구분입니다.' : '12운성은 일간을 기준으로 지지마다 기운이 어느 단계인지 본 것이고, 음간은 거꾸로 도는 음생양사 정본을 따라요. 궁위의 나이는 전통적인 근묘화실 구분이에요.') + '</p>', 'saju-rich__lead saju-rich__wide');
    html += section('일간 ' + dayName + '의 물상', para(neo ? dayName + ' 일간: ' + (STEM_NOTE[dg] || '') + '입니다. 일간은 원국의 기준점이며, 나머지 일곱 글자는 모두 이 글자와의 관계로 읽습니다.' : '일간 ' + dayName + jo(dayName, '은', '는') + ' ' + (STEM_NOTE[dg] || '') + '이에요. 사주의 모든 글자는 이 일간과의 관계로 읽기 때문에, 일간의 결을 아는 것이 해석의 첫걸음이에요.'));
    html += section(neo ? '일지 · 배우자궁' : '일지 배우자궁에 앉은 기운', para(spouseFam ? SPOUSE[spouseFam][k] : '') +
      (spouseStage && STAGE12[spouseStage] ? para(neo ? '일지 12운성 ' + spouseStage + ': ' + STAGE12[spouseStage] + '.' : '일지의 12운성은 ' + spouseStage + jo(spouseStage, '으로', '로') + ', ' + STAGE12[spouseStage].split(' · ')[0] + '예요. 생활 속에서는 ' + STAGE12[spouseStage].split(' · ')[1] + jo(STAGE12[spouseStage].split(' · ')[1], '으로', '로') + ' 드러나기 쉬워요.') : ''));
    var stages = ['y', 'm', 'd', 'h'].filter(function (key) { return !(key === 'h' && facts.unknown) && p[key] && p[key].j && twelve(dg, p[key].j); }).map(function (key) {
      var pal = palaceOf(L, key), s = twelve(dg, p[key].j);
      return {tag:(pal ? pal.label : key) + ' · ' + s, text:'', note:(STAGE12[s] || '') + (pal ? ' (' + pal.domain + ')' : '')};
    });
    if (stages.length) html += section(neo ? '12운성 흐름' : '12운성으로 본 네 시기', chips(stages));
    var gm = L.cdGongMangBranches ? L.cdGongMangBranches(dg, dj) : [];
    if (gm.length) {
      var hit = ['y', 'm', 'h'].filter(function (key) { return !(key === 'h' && facts.unknown) && p[key] && gm.indexOf(p[key].j) >= 0; }).map(function (key) { var pal = palaceOf(L, key); return pal ? pal.label + '(' + pal.domain + ')' : key; });
      html += section('공망(空亡)', para(neo ?
        '공망 지지: ' + gm.join('·') + '. ' + (hit.length ? '원국 해당: ' + hit.join(', ') + '. 해당 영역은 기대치 대비 체감이 약할 수 있으니 실리보다 내실·학문 쪽으로 쓰는 편이 효율적입니다.' : '원국에 걸린 자리는 없습니다.') :
        '공망은 일주가 속한 순(旬)에서 짝을 얻지 못한 두 지지로, 그 자리의 기운이 비어 있는 듯 허전하게 느껴질 수 있다고 봐요. 당신의 공망은 ' + gm.join('·') + ' 두 지지예요. ' + (hit.length ? '원국에서는 ' + hit.join(', ') + ' 자리가 공망에 걸려 있어요. 그 영역은 기대만큼 채워지지 않는 느낌이 들 수 있지만, 정신적인 쪽이나 배움으로 쓰면 오히려 깊어진다고 읽어요.' : '원국의 다른 글자 가운데 공망에 걸린 자리는 없어요.')) +
        '<p class="saju-rich__note">' + esc(neo ? '공망 해석은 학파마다 비중이 다릅니다. 참고 지표로만 쓰세요.' : '공망은 학파마다 무게를 다르게 두는 지표라 참고로만 읽어 주세요.') + '</p>');
    }
    html += section(neo ? '네오의 한 줄 정리' : '연이의 한마디', para((ILJU_WORD[dg] || ['', ''])[k]));
    return wrap(mode, html, facts);
  }

  /* ── 지금 내 시기 · 올해의 나 ── 엔진 evalDaewun 점수·요약·합충은 setFlow 행으로 받는다. */
  var FLOW_NAMES = ['조율이 많이 필요한 흐름', '조율이 필요한 흐름', '보통의 흐름', '순한 흐름', '아주 순한 흐름'];
  var FLOW_FAMILY = {
    same:['나와 같은 기운이 들어오는 시기라 스스로 정하고 독립하려는 마음이 커지기 쉬워요. 동료와 경쟁도 함께 늘 수 있으니 나눌 몫을 먼저 정해 두면 편안해요.', '비겁 운: 독립·경쟁 이슈가 늘어납니다. 공동 자원의 몫과 규칙을 먼저 정하세요.'],
    drain:['내 안의 것을 밖으로 내보내는 시기라 표현하고 만들고 가르치는 일이 잘 풀리기 쉬워요. 기운이 많이 나가니 회복 시간을 함께 챙겨 주세요.', '식상 운: 표현·생산 활동이 늘어납니다. 산출을 늘리되 소모 관리 기준을 두세요.'],
    wealth:['현실의 성과와 재물에 눈이 가는 시기예요. 일을 넓히기 좋은 만큼 감당할 범위를 숫자로 적어 두면 마음이 덜 흔들려요.', '재성 운: 성과·재무 이슈가 커집니다. 확장 범위의 상한을 숫자로 정하세요.'],
    control:['책임과 역할이 무거워지는 시기예요. 인정받을 기회가 함께 오지만 부담도 커지니, 맡을 일과 내려놓을 일을 나눠 보세요.', '관성 운: 책임·평가 압력이 커집니다. 수용할 역할과 거절할 역할을 구분하세요.'],
    parent:['배움과 도움이 들어오는 시기예요. 공부하고 자격을 갖추거나 좋은 조언자를 만나기 쉬우니, 받은 것을 작은 행동으로 옮겨 보세요.', '인성 운: 학습·지원이 들어옵니다. 입력을 실행으로 바꾸는 일정을 잡으세요.']
  };
  // 톤은 FLOW_NAMES 구간(at)을 따른다: 0~1 care, 2 even, 3~4 open. 문구에 정도 표현을 넣지 않아 구간 이름과 어긋나지 않게 한다.
  var FLOW_TONE = {
    open:['흐름이 순한 쪽으로 읽혀요. 준비해 온 일을 작은 범위에서 먼저 시험해 보세요. 점수는 비교를 돕는 참고값이고 결과를 약속하지는 않아요.', '평가상 수월한 구간입니다. 준비된 일을 작은 규모로 실행하세요. 점수는 결과를 보장하지 않습니다.'],
    even:['크게 밀거나 당기지 않는 보통의 흐름으로 읽혀요. 하던 일을 꾸준히 이어 가면서 중간중간 방향만 점검해 보세요. 점수는 비교를 돕는 참고값이고 결과를 약속하지는 않아요.', '평가상 중간 구간입니다. 진행 중인 일을 유지하며 방향을 점검하세요. 점수는 결과를 보장하지 않습니다.'],
    care:['조율이 필요한 쪽으로 읽혀요. 속도를 낮추고 역할과 일정을 정돈하면 같은 시기도 한결 편안해져요. 점수만으로 큰 결정을 내리지는 말아 주세요.', '평가상 조율 구간입니다. 일정과 역할을 정돈하고 선택지를 남기세요. 점수만으로 결론 내리지 마세요.']
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
        para(neo ? '원국과 직접 합·충하는 글자는 없습니다.' : '원국 글자와 직접 합하거나 충하는 자리는 없어요.');
      if (year && L.GAEUN_DB) {
        var db = (neo && L.NEO_GAEUN_DB && L.NEO_GAEUN_DB[gd.e]) ? L.NEO_GAEUN_DB : L.GAEUN_DB;
        var g = (db[gd.e] || db.earth || {})[good ? 'good' : 'bad'] || {};
        body += '<ul class="saju-tiles">' + GAEUN_LABEL.filter(function (x) { return g[x[0]]; }).map(function (x) { return '<li><b>' + esc(x[1]) + '</b><span>' + esc(g[x[0]]) + '</span></li>'; }).join('') + '</ul>';
      }
      // 대운·세운이 같은 톤이면 같은 문단이 두 번 나오므로 처음 한 번만 붙인다.
      var tone = at >= 3 ? 'open' : at === 2 ? 'even' : 'care';
      if (!toned[tone]) { toned[tone] = true; body += para(FLOW_TONE[tone][k]); }
      return section(title, body, 'saju-rich__lead saju-flow saju-flow--' + (year ? 'year' : 'period'));
    }).join('');
    if (!html) return '';
    return wrap(mode, html + '<p class="saju-rich__note">' + esc('※ 여기까지는 무료입니다. 10년 대운의 전체 흐름·연도별 세운 상세·종합 풀이는 아래 프리미엄에서 이어집니다.') + '</p>', facts);
  }

  /* ── 오늘 · 이달 ── 엔진 analyzeFortuneGZ 결과(setDaily)를 그린다. 옛 TSADVICE 를 명령조 없이 다시 썼다. [연이, 네오] */
  var DAY_GOD = {
    '비견':['스스로 판단하는 힘이 또렷해지는 때예요. 혼자 정해도 좋지만, 정한 이유를 한 줄로 적어 두면 나중에 흔들리지 않아요.', '독자 판단이 유리합니다. 결정 근거를 한 줄로 기록하세요.'],
    '겁재':['경쟁심과 추진력이 함께 올라오는 때예요. 충동적인 지출이나 내기 같은 선택은 하루 미뤄 두면 마음이 편해요.', '경쟁·충동이 커집니다. 즉흥 지출은 하루 보류하세요.'],
    '식신':['즐거움과 아이디어가 샘솟는 때예요. 떠오른 생각 하나를 작게라도 바로 만들어 보세요.', '생산성이 오릅니다. 아이디어 하나를 바로 실행 단위로 옮기세요.'],
    '상관':['말과 표현에 힘이 실리는 때예요. 발표나 창작에는 잘 맞고, 계약서나 공식 발언은 한 번 더 읽고 내보내면 좋아요.', '표현력이 강해집니다. 공식 문서·발언은 재검토 후 내보내세요.'],
    '편재':['기회와 변동이 함께 커지는 때예요. 큰 판보다 확인된 작은 것부터 잡아 보세요.', '기회와 변동성이 함께 큽니다. 검증된 소규모부터 진행하세요.'],
    '정재':['꼼꼼한 실무가 빛나는 때예요. 수입과 지출을 한 번 정리해 두면 마음이 가벼워져요.', '정확도가 오릅니다. 수입·지출 내역을 정리하세요.'],
    '편관':['압박이 느껴질 수 있는 때예요. 다 짊어지기보다 꼭 지킬 한 가지를 정해 버텨 보면 신뢰로 돌아와요.', '압박이 옵니다. 핵심 책임 하나에 집중하면 신뢰로 돌아옵니다.'],
    '정관':['책임과 신뢰가 드러나는 때예요. 공식 서류나 절차를 처리하기에 잘 맞아요.', '공식 절차 처리에 적합합니다. 책임 범위를 명확히 하세요.'],
    '편인':['직관이 예민해지는 때예요. 떠오른 감은 메모해 두었다가 작게 확인해 보세요.', '직관이 앞섭니다. 감을 기록하고 작은 검증을 거치세요.'],
    '정인':['배우고 정리하기 좋은 때예요. 믿을 만한 사람에게 조언을 구하면 생각이 또렷해져요.', '학습·분석 효율이 높습니다. 신뢰할 조언자에게 의견을 구하세요.']
  };
  var DAY_TONE = {
    open:['기운이 비교적 힘 있게 들어오는 때예요. 해야 할 일 하나를 골라 먼저 끝내 보면 흐름을 잘 탈 수 있어요.', '에너지 우위 구간입니다. 우선순위 1건을 먼저 끝내세요.'],
    care:['마음 배터리를 먼저 챙기면 좋은 때예요. 속도를 조금 낮추면 실수가 줄고 관계도 한결 편안해져요.', '에너지 관리 구간입니다. 속도를 낮추고 확인 단계를 하나 더 두세요.']
  };
  function daily(row, index, facts, mode) {
    var p = facts && facts.p, L = lib(facts);
    if (!row || !row.gz || !p || !p.d || !L.GAN || !L.GAN[p.d.g] || typeof row.batteryPercent !== 'number') return '';
    var neo = mode === 'neo', k = neo ? 1 : 0, dg = p.d.g, month = index === 1, when = month ? '이달' : '오늘', twelve = L.cdTwelveStage || function () { return ''; };
    var g = row.gz.g, j = row.gz.j, gEl = row.gEl || (L.GAN[g] || {}).e, jEl = row.jEl || (L.JI[j] || {}).e, bp = row.batteryPercent, good = bp >= 60;
    var lb = row.lb || {}, lt = row.lt || {}, grade = plain(row.grade);
    var html = section((month ? '이달의 월운 ' : '오늘의 일진 ') + g + j,
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
    html += section(neo ? '체크 포인트' : '이건 꼭 챙겨 주세요', items.length ? chips(items) : para(neo ? '특이 관계 없음. 중요한 메시지는 발송 전 한 번 더 확인하세요.' : '원국과 크게 부딪히는 관계는 없어요. 중요한 메시지는 보내기 전에 한 번 더 읽어 보면 좋아요.'));
    var boost = [['행운 컬러', lb.color, '色'], ['장소 · 방향', lt.action, '方'], [when + '의 한 끗', lb.item, '物'], ['무드 세팅', lb.material, '感']].filter(function (x) { return x[1]; });
    if (boost.length) html += section('행운의 부스터', tiles(boost) + '<p class="saju-rich__note">' + esc(neo ? '용신 오행 보충용 생활 팁입니다. 효과를 보장하지 않습니다.' : '부족한 기운을 생활에서 가볍게 더하는 팁이에요. 분위기를 바꾸는 정도로 즐겨 주세요.') + '</p>');
    html += section(neo ? '네오의 정리' : '연이의 한마디', para(DAY_TONE[good ? 'open' : 'care'][k]));
    return wrap(mode, html, facts);
  }

  root.SajuReadingRich = {daily:daily, flow:flow, powerParts:powerParts, johuParts:johuParts, powerMatches:powerMatches, johuMatches:johuMatches, stage:stage, godMap:godMap, climate:climate, strength:strength, tenOverview:tenOverview, tenCards:tenCards, godDetail:godDetail, ilju:ilju, escape:esc};
})(typeof window === 'undefined' ? globalThis : window);

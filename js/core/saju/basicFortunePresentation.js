/* Presentation only. Existing engines, gates and event handlers own all results/actions. */
(function () {
  'use strict';
  if (window.BasicFortunePresentation) return;
  var styleVersion = document.currentScript ? new URL(document.currentScript.src, location.href).search : '';
  var copy = {
    ko: ['숙요점', '점성술', '자미두수', '핵심 해석', '차트', '자세히 읽기', '다음 이야기', '출생 프로필로 읽는 기본 분석', '나의 운명 기록', '먼저 읽어보세요', '전체 12궁과 명반', '나의 숙을 더 깊이 이해하기', '27숙 명반과 달력', '성향과 선택', '인간관계', '사랑', '일과 재능', '기억할 한 가지', '기본 분석', '명궁', '나의 성향을 읽는 중심', '신궁', '삶에서 힘을 쓰는 방향', '오행국', '명반의 흐름을 나누는 기준', '궁을 선택하면 아래에서 해석을 읽을 수 있어요.', '행성과 삶의 영역', '상담과 관계 탐색', '전체 해석과 참고 기록', '명궁', '재백궁', '관록궁', '부부궁', '복덕궁'],
    en: ['Sukuyo', 'Astrology', 'Ziwei', 'Key reading', 'Chart', 'Read more', 'Explore next', 'A basic reading based on your birth profile', 'My celestial record', 'Start here', 'All 12 palaces and chart', 'Understanding your mansion', '27 mansions and calendar', 'Temperament and choices', 'Relationships', 'Love', 'Work and talents', 'Keep in mind', 'Basic reading', 'Life palace', 'The centre of your temperament', 'Body palace', 'Where you direct your energy', 'Element bureau', 'The cycle used by this chart', 'Select a palace to read its interpretation below.', 'Planets and life areas', 'Consultation and relationships', 'Full reading and reference', 'Life palace', 'Wealth palace', 'Career palace', 'Spouse palace', 'Wellbeing palace'],
    ja: ['宿曜占', '西洋占星術', '紫微斗数', '基本の読み解き', '命盤', '詳しく読む', '次の物語へ', 'プロフィールの出生情報をもとにした基本分析', '私の星の記録', 'ここから読む', '全12宮と命盤', '本命宿を深く知る', '27宿の命盤と暦', '気質と選択', '人間関係', '恋愛', '仕事と才能', '心に留めたいこと', '基本分析', '命宮', '気質を読み解く中心', '身宮', '人生で力を注ぐ方向', '五行局', '命盤の流れを分ける基準', '宮を選ぶと下に解説が表示されます。', '惑星と人生の領域', '相談と相性を探る', '全体の解説と参考資料', '命宮', '財帛宮', '官禄宮', '夫妻宮', '福徳宮'],
    zh: ['宿曜占', '西洋占星', '紫微斗数', '核心解读', '星盘', '详细阅读', '继续探索', '根据个人出生资料解读的基础分析', '我的星辰记录', '从这里开始', '完整十二宫与命盘', '深入了解本命宿', '二十七宿与日历', '性情与选择', '人际关系', '爱情', '工作与才能', '值得记住的事', '基础分析', '命宫', '了解性情的核心', '身宫', '人生投入力量的方向', '五行局', '命盘周期的划分依据', '选择宫位后，可在下方阅读解读。', '行星与生活领域', '咨询与关系探索', '完整解读与参考资料', '命宫', '财帛宫', '官禄宫', '夫妻宫', '福德宫'],
    'zh-TW': ['宿曜占', '西洋占星', '紫微斗數', '核心解讀', '星盤', '詳細閱讀', '繼續探索', '根據個人出生資料解讀的基礎分析', '我的星辰記錄', '從這裡開始', '完整十二宮與命盤', '深入了解本命宿', '二十七宿與日曆', '性情與選擇', '人際關係', '愛情', '工作與才能', '值得記住的事', '基礎分析', '命宮', '了解性情的核心', '身宮', '人生投入力量的方向', '五行局', '命盤週期的劃分依據', '選擇宮位後，可在下方閱讀解讀。', '行星與生活領域', '諮詢與關係探索', '完整解讀與參考資料', '命宮', '財帛宮', '官祿宮', '夫妻宮', '福德宮']
  };
  var labelKeys = ["sukuyo","astro","ziwei","keyReading","chart","readMore","explore","profileBasis","myRecord","startHere","allPalaces","mansionDetails","mansionChart","temperament","relationships","love","work","advice","basicReading","lifePalace","lifeMeaning","bodyPalace","bodyMeaning","bureau","bureauMeaning","selectPalace","planets","consultation","fullReading","palaceLife","palaceWealth","palaceCareer","palaceSpouse","palaceWellbeing"];
  function t(key) {
    var index = typeof key === 'number' ? key : labelKeys.indexOf(key);
    var lang = document.documentElement.lang || 'ko';
    try { lang = localStorage.getItem('cd_lang') || lang; } catch (_) {}
    return (copy[lang] || copy[lang.split('-')[0]] || copy.ko)[index];
  }
  function node(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }
  function heading(text) { return node('h3', 'fr-heading', text); }
  function emblem(type) {
    var icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 80 80'); icon.setAttribute('class', 'fr-emblem'); icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = type === 'sukuyo'
      ? '<path d="M53 12a29 29 0 1 0 15 45A28 28 0 0 1 53 12Z"/><path d="M58 20v12m-6-6h12M39 8v6m-3-3h6"/>'
      : type === 'astro' ? '<circle cx="40" cy="40" r="27"/><ellipse cx="40" cy="40" rx="12" ry="32" transform="rotate(45 40 40)"/><circle cx="40" cy="40" r="3"/><path d="M40 3v7m0 60v7M3 40h7m60 0h7"/>'
      : '<path d="M14 22h52v40H14zM22 14v56m36-56v56M8 30h64M8 54h64"/><path d="m40 31 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"/>';
    return icon;
  }
  function fold(parent, label, elements, id) {
    var details = node('details', 'fr-disclosure');
    if (id) details.id = id;
    var summary = node('summary', '', label);
    summary.setAttribute('aria-expanded', 'false');
    details.appendChild(summary);
    var body = node('div', 'fr-disclosure-body');
    elements.filter(Boolean).forEach(function (el) { body.appendChild(el); });
    details.appendChild(body);
    details.addEventListener('toggle', function () {
      summary.setAttribute('aria-expanded', String(details.open));
      if (details.open) window.dispatchEvent(new Event('resize'));
    });
    parent.appendChild(details);
    return details;
  }
  function profileHeader(type) {
    var profile = typeof window.__cdGetCurrentDestinyProfile === 'function' ? window.__cdGetCurrentDestinyProfile() : null;
    var header = node('header', 'fr-profile');
    header.appendChild(node('span', 'fr-brand', 'CODE DESTINY / ' + t('basicReading')));
    header.appendChild(node('p', 'fr-profile-name', profile && profile.name ? profile.name + ' · ' + t(['sukuyo', 'astro', 'ziwei'].indexOf(type)) : t('myRecord')));
    header.appendChild(node('p', 'fr-caption', t('profileBasis')));
    if (profile && profile.birth && (profile.birth.hour == null || (type === 'astro' && (!profile.location || profile.location.lat == null || profile.location.lng == null)))) {
      var notice = node('p', 'fr-profile-notice', localized('missing'));
      notice.setAttribute('role', 'note'); header.appendChild(notice);
    }
    return header;
  }
  function localized(key) {
    var labels = {
      ko: { missing: '출생 정보가 일부 비어 있어요. 프로필에서 시간과 장소를 확인해 주세요.' },
      en: { missing: 'Some birth details are missing. Check the time and place in your profile.' },
      ja: { missing: '出生情報の一部が未入力です。プロフィールで時刻と場所をご確認ください。' },
      zh: { missing: '部分出生资料尚未填写。请在个人资料中确认时间和地点。' },
      'zh-TW': { missing: '部分出生資料尚未填寫。請在個人資料中確認時間和地點。' }
    };
    var lang = document.documentElement.lang || 'ko';
    try { lang = localStorage.getItem('cd_lang') || lang; } catch (_) {}
    return (labels[lang] || labels[lang.split('-')[0]] || labels.ko)[key];
  }
  function setUp(type, root) {
    if (!root || root.querySelector(':scope > .fr-profile')) return false;
    root.dataset.fortuneLibrary = type;
    root.classList.add('fr-report');
    root.prepend(profileHeader(type));
    // A deep-link CTA can target a node inside a disclosure. Open its ancestors first.
    if (!root.dataset.libraryBound) root.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-astro-jump],a[href^="#"]');
      if (!trigger) return;
      var id = trigger.getAttribute('data-astro-jump') || (trigger.getAttribute('href') || '').slice(1);
      var target = document.getElementById(id);
      if (!target || !root.contains(target)) return;
      for (var p = target.parentElement; p && p !== root; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true;
    }, true);
    root.dataset.libraryBound = 'true';
    return true;
  }
  function sukuyo(area, data) {
    var root = area.querySelector('#lunarNexusApp');
    if (!setUp('sukuyo', root) || !data) return;
    var oldHeading = root.querySelector('.sy-header');
    if (oldHeading) oldHeading.remove(); // Repeated service heading, not a result or action.
    var hero = root.querySelector('.sy-intro-card');
    if (hero) {
      hero.classList.add('fr-hero');
      hero.prepend(emblem('sukuyo'));
      var title = hero.querySelector('.sy-intro-title');
      if (title) title.textContent = data.mansion;
      var description = hero.querySelector('.sy-intro-archetype');
      if (description && data.traits && data.traits.desc) description.textContent = data.traits.desc;
      var badges = node('div', 'fr-tags');
      if (data.displayIndex) badges.appendChild(node('span', '', data.displayIndex + ' / 27'));
      if (data.guardian && data.guardian.name) badges.appendChild(node('span', '', data.guardian.name));
      hero.appendChild(badges);
    }
    var reading = node('section', 'fr-reading');
    reading.appendChild(heading(t('keyReading')));
    var traits = data.traits || {};
    [[13, 'core'], [14, 'social'], [15, 'love'], [16, 'work'], [17, 'advice']].forEach(function (item, index) {
      if (!traits[item[1]]) return;
      var article = node('article', 'fr-reading-item');
      article.appendChild(node('h4', '', t(item[0])));
      article.appendChild(node('p', '', traits[item[1]]));
      if (index < 2) reading.appendChild(article);
      else fold(reading, t(item[0]), [article]);
    });
    if (hero) hero.after(reading); else root.appendChild(reading);
    var chart = root.querySelector('#syWheelCardHost');
    var calendar = root.querySelector('.sy-basic-calendar');
    fold(root, t('mansionChart'), [chart, calendar], 'fr-sukuyo-chart');
    var canonical = root.querySelector('#syCanonicalDashboard');
    fold(root, t('mansionDetails'), [canonical, root.querySelector('.sy-guardian-card')]);
    var extras = Array.from(root.children).filter(function (el) {
      return !el.matches('.fr-profile,.fr-hero,.fr-reading,.fr-disclosure,.sy-lunar-rim');
    });
    if (extras.length) fold(root, t('explore'), extras, 'fr-sukuyo-explore');
  }
  function ziwei(area, data) {
    if (!setUp('ziwei', area) || !data) return;
    var hero = node('section', 'fr-hero');
    hero.appendChild(emblem('ziwei'));
    hero.appendChild(node('p', 'fr-brand', t('lifePalace')));
    hero.appendChild(node('h2', 'fr-title', data.meng || '—'));
    var facts = node('dl', 'fr-facts');
    [[19, data.meng, 20], [21, data.shen, 22], [23, data.juInfo, 24]].forEach(function (item) {
      if (!item[1]) return;
      var row = node('div', ''); row.appendChild(node('dt', '', t(item[0]))); row.appendChild(node('dd', '', item[1])); row.appendChild(node('p', 'fr-caption', t(item[2]))); facts.appendChild(row);
    });
    hero.appendChild(facts); area.querySelector('.fr-profile').after(hero);
    var reading = node('section', 'fr-reading fr-palace-reading');
    reading.appendChild(heading(t('startHere'))); reading.appendChild(node('p', 'fr-caption', t('selectPalace')));
    var choices = node('div', 'fr-palace-choices');
    var dashboard = area.querySelector('.zw-dashboard');
    var cells = Array.from(dashboard.querySelectorAll('.zw-cell[role="button"]'));
    [['명궁', 'palaceLife'], ['재백궁', 'palaceWealth'], ['관록궁', 'palaceCareer'], ['부부궁', 'palaceSpouse'], ['복덕궁', 'palaceWellbeing']].forEach(function (palace) {
      var cell = cells.find(function (el) { var label = el.querySelector('.zw-palace-name'); return label && label.textContent.trim() === palace[0]; });
      if (!cell) return;
      var button = node('button', 'fr-palace-choice'); button.type = 'button';
      button.dataset.palaceIndex = cell.className.match(/\bzw-cell-(\d+)\b/)[1];
      button.appendChild(node('strong', '', t(palace[1])));
      button.appendChild(node('span', '', cell.querySelector('.zw-branch-name').textContent));
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', function () {
        choices.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === button)); });
        var idx = Number(cell.className.match(/\bzw-cell-(\d+)\b/)[1]);
        var pd = window._currentZiweiData;
        cells.forEach(function (c) { c.classList.toggle('active', c === cell); });
        window._renderZwPanel(idx, pd.palacesByIndex[idx], pd.stars[idx], pd, { clickOnly: true, targetId: 'zwDetailPanel', showClose: true, showRadar: false, scroll: false });
      });
      choices.appendChild(button);
    });
    reading.appendChild(choices);
    dashboard.addEventListener('click', function (event) {
      var selected = event.target.closest('.zw-cell[role="button"]');
      var closing = event.target.closest('.zw-summary-close-btn');
      if (!selected && !closing) return;
      var index = selected ? selected.className.match(/\bzw-cell-(\d+)\b/)[1] : null;
      choices.querySelectorAll('button').forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.palaceIndex === index)); });
    });
    var panel = dashboard.querySelector('#zwDetailPanel');
    if (panel) { panel.setAttribute('aria-live', 'polite'); reading.appendChild(panel); }
    dashboard.prepend(reading);
    var chart = dashboard.querySelector('.zw-grid-wrap');
    var mapToggle = node('button', 'fr-map-toggle', t('chart'));
    mapToggle.type = 'button'; mapToggle.setAttribute('aria-pressed', 'false');
    mapToggle.addEventListener('click', function () {
      var active = chart.classList.toggle('fr-ziwei-map');
      mapToggle.setAttribute('aria-pressed', String(active));
      window.dispatchEvent(new Event('resize'));
    });
    chart.prepend(mapToggle);
    fold(dashboard, t('allPalaces'), [chart, dashboard.querySelector('.zw-fact-tables')], 'fr-ziwei-chart');
    var extra = Array.from(dashboard.children).filter(function (el) { return !el.matches('.fr-reading,.fr-disclosure'); });
    if (extra.length) fold(dashboard, t('explore'), extra, 'fr-ziwei-explore');
    var full = area.querySelector('#zwComprehensiveReport');
    if (full) fold(area, t('fullReading'), [full]);
  }
  function init() {
    if (!document.getElementById('basicFortuneLibraryStyle')) {
      var link = document.createElement('link'); link.id = 'basicFortuneLibraryStyle'; link.rel = 'stylesheet'; link.href = '/styles/basic-fortune-library.css' + styleVersion; document.head.appendChild(link);
    }
    ['sukuyo', 'ziwei'].forEach(function (type) {
      var overlay = document.getElementById(type + 'ModalOverlay');
      if (overlay) {
        overlay.classList.add('fr-overlay', 'fr-' + type);
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-label', t(['sukuyo', 'astro', 'ziwei'].indexOf(type)));
        overlay.setAttribute('aria-hidden', overlay.style.display === 'flex' ? 'false' : 'true');
      }
    });
  }
  window.BasicFortunePresentation = { sukuyo: sukuyo, ziwei: ziwei, init: init };
  init();
})();

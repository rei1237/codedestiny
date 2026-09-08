/* Presentation only. Existing engines, gates and event handlers own all results/actions. */
(function () {
  'use strict';
  if (window.BasicFortunePresentation) return;
  var styleVersion = document.currentScript ? new URL(document.currentScript.src, location.href).search : '';
  var copy = {
    ko: ['숙요점', '점성술', '자미두수', '핵심 해석', '차트', '자세히 읽기', '다음 이야기', '출생 프로필로 읽는 기본 분석', '나의 운명 기록', '먼저 읽어보세요', '전체 12궁과 명반', '나의 숙을 더 깊이 이해하기', '27숙 명반과 달력', '성향과 선택', '인간관계', '사랑', '일과 재능', '기억할 한 가지', '기본 분석', '명궁', '나의 성향을 읽는 중심', '신궁', '삶에서 힘을 쓰는 방향', '오행국', '명반의 흐름을 나누는 기준', '궁을 선택하면 아래에서 해석을 읽을 수 있어요.', '행성과 삶의 영역', '상담과 관계 탐색', '전체 해석과 참고 기록', '명궁', '재백궁', '관록궁', '부부궁', '복덕궁', '자미두수 읽을거리', '기본 명반에서 확인한 구조를 기존 인사이트 글로 이어서 읽어보세요.', '글 제목 찾기', '불러오는 중입니다.', '글 목록을 불러오지 못했어요. 다시 시도해 주세요.', '찾는 글이 없어요. 다른 검색어를 입력해 주세요.', '읽을거리 목록으로 돌아가기', '원문 페이지 보기', '전통 해석 체계를 바탕으로 한 참고용 읽을거리입니다.'],
    en: ['Sukuyo', 'Astrology', 'Ziwei', 'Key reading', 'Chart', 'Read more', 'Explore next', 'A basic reading based on your birth profile', 'My celestial record', 'Start here', 'All 12 palaces and chart', 'Understanding your mansion', '27 mansions and calendar', 'Temperament and choices', 'Relationships', 'Love', 'Work and talents', 'Keep in mind', 'Basic reading', 'Life palace', 'The centre of your temperament', 'Body palace', 'Where you direct your energy', 'Element bureau', 'The cycle used by this chart', 'Select a palace to read its interpretation below.', 'Planets and life areas', 'Consultation and relationships', 'Full reading and reference', 'Life palace', 'Wealth palace', 'Career palace', 'Spouse palace', 'Wellbeing palace', 'Ziwei reading room', 'Continue from the chart into existing Ziwei insights.', 'Find an article', 'Loading articles…', 'Unable to load articles. Please try again.', 'No matching articles.', 'Back to the reading list', 'Open original article', 'Reference reading based on traditional interpretive frameworks.'],
    ja: ['宿曜占', '西洋占星術', '紫微斗数', '基本の読み解き', '命盤', '詳しく読む', '次の物語へ', 'プロフィールの出生情報をもとにした基本分析', '私の星の記録', 'ここから読む', '全12宮と命盤', '本命宿を深く知る', '27宿の命盤と暦', '気質と選択', '人間関係', '恋愛', '仕事と才能', '心に留めたいこと', '基本分析', '命宮', '気質を読み解く中心', '身宮', '人生で力を注ぐ方向', '五行局', '命盤の流れを分ける基準', '宮を選ぶと下に解説が表示されます。', '惑星と人生の領域', '相談と相性を探る', '全体の解説と参考資料', '命宮', '財帛宮', '官禄宮', '夫妻宮', '福徳宮', '紫微斗数の読みもの', '命盤で確認した構造を、既存の紫微斗数インサイトへ続けて読めます。', '記事タイトルを検索', '読み込み中…', '記事を読み込めませんでした。もう一度お試しください。', '一致する記事がありません。', '読みもの一覧に戻る', '元の記事を開く', '伝統的な解釈体系にもとづく参考読みものです。'],
    zh: ['宿曜占', '西洋占星', '紫微斗数', '核心解读', '星盘', '详细阅读', '继续探索', '根据个人出生资料解读的基础分析', '我的星辰记录', '从这里开始', '完整十二宫与命盘', '深入了解本命宿', '二十七宿与日历', '性情与选择', '人际关系', '爱情', '工作与才能', '值得记住的事', '基础分析', '命宫', '了解性情的核心', '身宫', '人生投入力量的方向', '五行局', '命盘周期的划分依据', '选择宫位后，可在下方阅读解读。', '行星与生活领域', '咨询与关系探索', '完整解读与参考资料', '命宫', '财帛宫', '官禄宫', '夫妻宫', '福德宫', '紫微斗数阅读', '从命盘中确认的结构继续阅读现有的紫微斗数文章。', '搜索文章标题', '正在加载…', '无法加载文章，请重试。', '没有匹配的文章。', '返回阅读列表', '查看原文页面', '基于传统解读体系的参考读物。'],
    'zh-TW': ['宿曜占', '西洋占星', '紫微斗數', '核心解讀', '星盤', '詳細閱讀', '繼續探索', '根據個人出生資料解讀的基礎分析', '我的星辰記錄', '從這裡開始', '完整十二宮與命盤', '深入了解本命宿', '二十七宿與日曆', '性情與選擇', '人際關係', '愛情', '工作與才能', '值得記住的事', '基礎分析', '命宮', '了解性情的核心', '身宮', '人生投入力量的方向', '五行局', '命盤週期的劃分依據', '選擇宮位後，可在下方閱讀解讀。', '行星與生活領域', '諮詢與關係探索', '完整解讀與參考資料', '命宮', '財帛宮', '官祿宮', '夫妻宮', '福德宮', '紫微斗數閱讀', '從命盤中確認的結構繼續閱讀現有的紫微斗數文章。', '搜尋文章標題', '正在載入…', '無法載入文章，請重試。', '沒有符合的文章。', '返回閱讀列表', '查看原文頁面', '基於傳統解讀體系的參考讀物。']
  };
  var articleRetryLabels = { ko: '다시 시도', en: 'Retry', ja: '再試行', zh: '重试', 'zh-TW': '重試' };
  Object.keys(copy).forEach(function (lang) { copy[lang].splice(40, 0, articleRetryLabels[lang] || articleRetryLabels.en); });
  var labelKeys = ["sukuyo","astro","ziwei","keyReading","chart","readMore","explore","profileBasis","myRecord","startHere","allPalaces","mansionDetails","mansionChart","temperament","relationships","love","work","advice","basicReading","lifePalace","lifeMeaning","bodyPalace","bodyMeaning","bureau","bureauMeaning","selectPalace","planets","consultation","fullReading","palaceLife","palaceWealth","palaceCareer","palaceSpouse","palaceWellbeing","articleLibrary","articleLibraryDesc","articleSearch","articleLoading","articleError","articleRetry","articleEmpty","articleBack","articleOriginal","articleNote"];
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
      ko: { missing: '출생 정보가 일부 비어 있어요. 프로필에서 시간과 장소를 확인해 주세요.', flow:'인생 흐름', consult:'맞춤 상담' },
      en: { missing: 'Some birth details are missing. Check the time and place in your profile.', flow:'Life periods', consult:'Consultation' },
      ja: { missing: '出生情報の一部が未入力です。プロフィールで時刻と場所をご確認ください。', flow:'人生の流れ', consult:'個別相談' },
      zh: { missing: '部分出生资料尚未填写。请在个人资料中确认时间和地点。', flow:'人生周期', consult:'专属咨询' },
      'zh-TW': { missing: '部分出生資料尚未填寫。請在個人資料中確認時間和地點。', flow:'人生週期', consult:'專屬諮詢' }
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
    root.classList.add('sy-reading-house');
    var labels = syReadingLabels();
    var nav = node('nav', 'sy-house-nav'); nav.setAttribute('aria-label', labels[0]);
    [['syHouseNatal',1],['syHouseTools',2],['syHouseDirectory',3],['syHouseJournal',4]].forEach(function (item) {
      var button = node('button', '', labels[item[1]]); button.type = 'button';
      button.addEventListener('click', function () { syReadingJump(document.getElementById(item[0])); });
      nav.appendChild(button);
    });
    var banner = node('section', 'sy-house-banner');
    var art = node('img'); art.src = '/images/sukuyo/moon-garden.webp'; art.alt = ''; art.width = 1440; art.height = 960; art.decoding = 'async';
    var bannerCopy = node('div', 'sy-house-banner-copy');
    bannerCopy.appendChild(node('h2', '', labels[5])); bannerCopy.appendChild(node('p', '', labels[6]));
    var read = node('button', 'sy-house-primary', labels[7]); read.type = 'button'; read.addEventListener('click', function () { syReadingJump(document.getElementById('syHouseNatal')); });
    bannerCopy.appendChild(read); banner.append(art, bannerCopy); root.prepend(nav, banner);
    var hero = root.querySelector('.sy-intro-card');
    if (hero) {
      hero.classList.add('fr-hero');
      var title = hero.querySelector('.sy-intro-title');
      if (title) title.textContent = data.mansion;
      var badges = node('div', 'fr-tags');
      if (data.displayIndex) badges.appendChild(node('span', '', data.displayIndex + ' / 27'));
      if (data.guardian && data.guardian.name) badges.appendChild(node('span', '', data.guardian.name));
      hero.appendChild(badges);
    }
    var reading = syReadingBody(data.traits, labels); reading.id = 'syHouseNatal';
    if (hero) hero.after(reading); else root.appendChild(reading);
    // Move original nodes, never clone/rebuild controls or move them behind disclosures.
    var extras = Array.from(root.children).filter(function (el) {
      return !el.matches('.fr-profile,.fr-hero,.fr-reading,.sy-house-nav,.sy-house-banner,.sy-lunar-rim,style,script');
    });
    var toolsSection = node('section', 'sy-house-tools'); toolsSection.id = 'syHouseTools';
    toolsSection.appendChild(heading(labels[2])); extras.forEach(function (el) { toolsSection.appendChild(el); }); root.appendChild(toolsSection);
    root.appendChild(syMansionDirectory(data, labels));
    root.appendChild(syArticleLibrary(root, labels));
  }
  function syReadingLabels() {
    var lang = document.documentElement.lang || 'ko';
    try { lang = localStorage.getItem('cd_lang') || lang; } catch (_) {}
    var labels = {
      ko: ['숙요점 메뉴','나의 숙','명반·상세','27숙 도감','숙요 읽을거리','달이 머문 자리, 나를 읽는 시간','타고난 마음의 결에서 관계의 리듬까지. 당신의 숙을 천천히 펼쳐보세요.','나의 숙 해석 읽기','성격과 내면','강점의 이면에 있는 마음','연애와 관계','인연을 이어가는 방식','일과 재물','능력이 살아나는 자리','돈을 대하는 습관','오늘의 작은 실천','스물일곱 숙의 이야기','숙 이름 찾기','예: 각, 角, 위','도감 해설 · 나의 본명숙과는 별도입니다.','내 본명숙 해설로 돌아가기','숙요를 더 깊이 읽는 시간','기존 숙요 글을 이 화면에서 이어 읽어보세요.','글 목록으로 돌아가기','원문 페이지 보기','불러오는 중입니다.','불러오지 못했어요. 다시 시도해 주세요.','다시 불러오기','찾는 항목이 없어요. 다른 검색어를 입력해 주세요.','글 제목 찾기','숙요점은 전통적인 상징을 통해 자신을 돌아보는 해석입니다. 같은 숙이라도 경험과 선택에 따라 삶의 모습은 달라집니다.','한국어 원문','회복과 생활 리듬','흐름을 활용하는 방법'],
      en: ['Sukuyo navigation','My mansion','Chart & details','27 mansions','Reading room','Where the moon rests, a moment to understand yourself','Explore your temperament and the rhythms of your relationships.','Read my mansion','Temperament','The other side of a strength','Love & relationships','Building lasting connections','Work & money','Where your talents thrive','Money habits','A small step today','Stories of the 27 mansions','Find a mansion','Name or Chinese character','Reference reading — separate from your natal mansion.','Return to my natal reading','Read more about Sukuyo','Read existing Sukuyo articles here.','Back to articles','Open original article','Loading…','Unable to load. Please try again.','Retry','No matches. Try another search.','Find an article','A traditional symbolic reading for reflection. Experience and choices shape each person differently.','Korean original','Rest & daily rhythm','Working with your rhythm'],
      ja: ['宿曜メニュー','本命宿','命盤・詳細','27宿図鑑','読みもの','月が宿る場所から、自分を知る時間へ','生まれ持つ気質から人間関係のリズムまで、ゆっくり読み解きます。','本命宿を読む','性格と内面','強みの裏にある心','恋愛と人間関係','縁を育てる方法','仕事とお金','才能を生かす場所','お金との付き合い方','今日の小さな一歩','二十七宿の物語','宿を検索','宿名・漢字','図鑑の解説です。本命宿の結果とは別です。','自分の本命宿に戻る','宿曜を深く読む','宿曜の記事をこの画面で読み続けられます。','記事一覧に戻る','元の記事を開く','読み込み中…','読み込めませんでした。もう一度お試しください。','再読み込み','見つかりません。別の語で検索してください。','記事を検索','伝統的な象徴を通じて自分を振り返る解釈です。同じ宿でも経験や選択によって異なります。','韓国語原文','休息と生活リズム','リズムの生かし方'],
      zh: ['宿曜导航','我的本命宿','命盘与详情','二十七宿','宿曜阅读','月亮停留的地方，认识自己的时刻','从性情到关系节奏，慢慢读懂自己的本命宿。','阅读我的本命宿','性格与内心','优势背后的心情','恋爱与关系','维系关系的方式','工作与金钱','发挥才能的方向','金钱习惯','今天的小行动','二十七宿的故事','搜索宿名','宿名或汉字','图鉴解读，与您的本命宿结果分开。','返回我的本命宿','深入阅读宿曜','在这里继续阅读已有的宿曜文章。','返回文章列表','查看原文页面','正在加载…','加载失败，请重试。','重新加载','没有匹配项，请换个词搜索。','搜索文章标题','通过传统象征反思自身的解读。同一宿的人也会因经历和选择而不同。','韩语原文','休息与生活节奏','运用节奏的方法'],
      'zh-TW': ['宿曜導覽','我的本命宿','命盤與詳情','二十七宿','宿曜閱讀','月亮停留的地方，認識自己的時刻','從性情到關係節奏，慢慢讀懂自己的本命宿。','閱讀我的本命宿','性格與內心','優勢背後的心情','戀愛與關係','維繫關係的方式','工作與金錢','發揮才能的方向','金錢習慣','今天的小行動','二十七宿的故事','搜尋宿名','宿名或漢字','圖鑑解讀，與您的本命宿結果分開。','返回我的本命宿','深入閱讀宿曜','在這裡繼續閱讀已有的宿曜文章。','返回文章列表','查看原文頁面','正在載入…','載入失敗，請重試。','重新載入','沒有符合項目，請換個詞搜尋。','搜尋文章標題','透過傳統象徵反思自身的解讀。同一宿的人也會因經歷和選擇而不同。','韓語原文','休息與生活節奏','運用節奏的方法']
    };
    return labels[lang] || labels[lang.split('-')[0]] || labels.ko;
  }
  function syReadingJump(target) {
    if (!target) return;
    target.tabIndex = -1; target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function syReadingBody(traits, labels) {
    var body = node('article', 'fr-reading sy-house-reading');
    // Paid deep-dive fields (hidden/karma/mantra/health/timing) stay in their original gated renderer.
    [[8,'core'],[10,'love',11,'social'],[12,'work',14,'wealth'],[15,'advice']].forEach(function (entry) {
      if (!traits || !traits[entry[1]]) return;
      var section = node('section', 'fr-reading-item'); section.appendChild(heading(labels[entry[0]]));
      var text = node('p', '', traits[entry[1]]); text.lang = 'ko'; section.appendChild(text);
      if (entry[3] && traits[entry[3]]) { section.appendChild(node('h4','',labels[entry[2]])); var extra = node('p','',traits[entry[3]]); extra.lang='ko'; section.appendChild(extra); }
      body.appendChild(section);
    });
    body.appendChild(node('p','fr-caption',labels[30])); return body;
  }
  function syMansionDirectory(natal, labels) {
    var section = node('section','sy-house-directory'); section.id='syHouseDirectory'; section.appendChild(heading(labels[16]));
    var label = node('label','sy-house-search',labels[17]);
    var input = node('input'); input.type='search'; input.placeholder=labels[18]; label.appendChild(input); section.appendChild(label);
    var grid = node('div','sy-house-mansions'); grid.setAttribute('aria-label',labels[3]);
    var status=node('p','fr-caption'); status.setAttribute('role','status');
    var reader=node('div','sy-house-mansion-reader'); reader.hidden=true;
    var records = window.SukuyoMansionReadings || [];
    records.forEach(function (m) {
      var button=node('button'); button.type='button'; button.dataset.mansionIndex=String(m.index); button.setAttribute('aria-pressed','false');
      button.setAttribute('aria-label',m.name+'宿 '+m.han); button.append(node('span','sy-house-han',m.han),node('span','',m.name+'宿'));
      button.addEventListener('click',function () {
        grid.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed',String(b===button)); });
        reader.replaceChildren(node('p','sy-house-reference',labels[19]),heading(m.name+'宿 · '+m.han),syReadingBody(m.traits,labels));
        var back=node('button','',labels[20]); back.type='button'; back.addEventListener('click',function () { syReadingJump(document.getElementById('syHouseNatal')); }); reader.appendChild(back);
        reader.hidden=false; syReadingJump(reader);
      }); grid.appendChild(button);
    });
    input.addEventListener('input',function () { var query=input.value.trim().replace(/[숙宿]/g,''); var count=0;
      grid.querySelectorAll('button').forEach(function (b,i) { b.hidden=!(records[i].name.includes(query)||records[i].han.includes(query)); if(!b.hidden) count++; }); status.textContent=count?'':labels[28];
    }); section.append(grid,status,reader); return section;
  }
  function syArticleLibrary(root, labels) {
    var section=node('section','sy-house-journal'); section.id='syHouseJournal'; section.appendChild(heading(labels[21])); section.appendChild(node('p','fr-caption',labels[22]));
    var label=node('label','sy-house-search',labels[29]); var input=node('input'); input.type='search'; label.appendChild(input); section.appendChild(label);
    var list=node('div','sy-house-articles'); var status=node('p','fr-caption',labels[25]); status.setAttribute('role','status');
    var retry=node('button','',labels[27]); retry.type='button'; retry.hidden=true;
    var reader=node('article','sy-house-article-reader'); reader.hidden=true;
    section.append(list,status,retry,reader);
    var articles=[]; var activeRequest=0;
    function renderList() {
      list.replaceChildren(); var query=input.value.trim().toLocaleLowerCase();
      articles.filter(function (a) { return (a.title+' '+a.description).toLocaleLowerCase().includes(query); }).forEach(function (a) {
        var link=node('a','sy-house-story'); link.href=a.href; link.lang='ko'; link.append(node('h4','',a.title),node('p','',a.description));
        link.addEventListener('click',function (event) {
          if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey) return;
          event.preventDefault(); openArticle(a,link);
        }); list.appendChild(link);
      }); status.textContent=list.childElementCount?'':labels[28];
    }
    function openArticle(a, origin) {
      var request=++activeRequest; reader.hidden=false; reader.replaceChildren();
      var back=node('button','',labels[23]); back.type='button'; back.addEventListener('click',function () { activeRequest++; reader.hidden=true; if(origin.isConnected) origin.focus(); });
      var title=heading(a.title); title.lang='ko'; var original=node('a','sy-house-original',labels[24]); original.href=a.href;
      var content=node('div','sy-house-article-body',labels[25]); content.lang='ko'; content.setAttribute('aria-live','polite');
      reader.append(back,title,node('p','fr-caption',labels[31]),original,content); syReadingJump(reader);
      fetch('/data/sukuyo-reading/'+a.body).then(function (response) { if(!response.ok) throw new Error('Article unavailable'); return response.json(); }).then(function (payload) {
        if(request!==activeRequest||!root.isConnected) return;
        // Authored local content still uses a DOM allowlist; no script, embedded media or inline handlers.
        var parsed=new DOMParser().parseFromString(payload.contentHtml,'text/html');
        parsed.querySelectorAll('script,style,iframe,object,embed,form,input,button,link,meta,img,svg').forEach(function(el){el.remove();});
        parsed.body.querySelectorAll('*').forEach(function(el){
          var href=el.tagName==='A'?el.getAttribute('href'):null;
          Array.from(el.attributes).forEach(function(attr){el.removeAttribute(attr.name);});
          if(href&&/^\/(?!\/)/.test(href)) el.setAttribute('href',href);
        }); content.replaceChildren.apply(content,Array.from(parsed.body.childNodes));
      }).catch(function () { if(request===activeRequest&&root.isConnected) content.textContent=labels[26]; });
    }
    function load() {
      retry.hidden=true; status.textContent=labels[25];
      fetch('/data/sukuyo-reading/index.json',{cache:'no-store'}).then(function(response){if(!response.ok)throw new Error('Catalogue unavailable');return response.json();}).then(function(items){
        if(!root.isConnected) return;
        articles=items.filter(function(a){return /^[a-z0-9-]+$/.test(a.slug)&&a.href==='/insights/'+a.slug+'/'&&/^[a-z0-9-]+\.json$/.test(a.body);}); renderList();
      }).catch(function(){if(!root.isConnected)return;status.textContent=labels[26];retry.hidden=false;});
    }
    input.addEventListener('input',renderList); retry.addEventListener('click',load); load(); return section;
  }
  function ziweiArticleLibrary(root) {
    var section=node('section','zw-house-journal'); section.id='fr-ziwei-articles';
    section.appendChild(heading(t('articleLibrary')));
    section.appendChild(node('p','fr-caption',t('articleLibraryDesc')));
    var label=node('label','zw-house-search',t('articleSearch')); var input=node('input'); input.type='search'; input.placeholder=t('articleSearch'); label.appendChild(input); section.appendChild(label);
    var list=node('div','zw-house-articles'); var status=node('p','fr-caption',t('articleLoading')); status.setAttribute('role','status');
    var retry=node('button','',t('articleRetry')); retry.type='button'; retry.hidden=true;
    var reader=node('article','zw-house-article-reader'); reader.hidden=true;
    section.append(list,status,retry,reader);
    var articles=[]; var activeRequest=0;
    function renderList() {
      list.replaceChildren(); var query=input.value.trim().toLocaleLowerCase();
      articles.filter(function (article) { return (article.title+' '+article.description).toLocaleLowerCase().includes(query); }).forEach(function (article) {
        var link=node('a','zw-house-story'); link.href=article.href; link.lang='ko';
        link.append(node('h4','',article.title),node('p','',article.description));
        link.addEventListener('click',function (event) {
          if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey) return;
          event.preventDefault(); openArticle(article,link);
        });
        list.appendChild(link);
      });
      status.textContent=list.childElementCount?'':t('articleEmpty');
    }
    function openArticle(article, origin) {
      var request=++activeRequest; reader.hidden=false; reader.replaceChildren();
      var back=node('button','',t('articleBack')); back.type='button'; back.addEventListener('click',function () { activeRequest++; reader.hidden=true; if(origin.isConnected) origin.focus(); });
      var title=heading(article.title); title.lang='ko'; var original=node('a','zw-house-original',t('articleOriginal')); original.href=article.href;
      var content=node('div','zw-house-article-body',t('articleLoading')); content.lang='ko'; content.setAttribute('aria-live','polite');
      reader.append(back,title,node('p','fr-caption',t('articleNote')),original,content); syReadingJump(reader);
      fetch('/data/ziwei-reading/'+article.body).then(function (response) { if(!response.ok) throw new Error('Article unavailable'); return response.json(); }).then(function (payload) {
        if(request!==activeRequest||!root.isConnected) return;
        // Authored local content still uses a DOM allowlist; no script, embedded media or inline handlers.
        var parsed=new DOMParser().parseFromString(payload.contentHtml,'text/html');
        parsed.querySelectorAll('script,style,iframe,object,embed,form,input,button,link,meta,img,svg').forEach(function(el){el.remove();});
        parsed.body.querySelectorAll('*').forEach(function(el){
          var href=el.tagName==='A'?el.getAttribute('href'):null;
          Array.from(el.attributes).forEach(function(attr){el.removeAttribute(attr.name);});
          if(href&&/^\/(?!\/)/.test(href)) el.setAttribute('href',href);
        });
        content.replaceChildren.apply(content,Array.from(parsed.body.childNodes));
      }).catch(function () { if(request===activeRequest&&root.isConnected) content.textContent=t('articleError'); });
    }
    function load() {
      retry.hidden=true; status.textContent=t('articleLoading');
      fetch('/data/ziwei-reading/index.json',{cache:'no-store'}).then(function(response){if(!response.ok)throw new Error('Catalogue unavailable');return response.json();}).then(function(items){
        if(!root.isConnected) return;
        articles=items.filter(function(article){return /^[a-z0-9-]+$/.test(article.slug)&&article.href==='/insights/'+article.slug+'/'&&/^[a-z0-9-]+\.json$/.test(article.body);});
        renderList();
      }).catch(function(){if(!root.isConnected)return;status.textContent=t('articleError');retry.hidden=false;});
    }
    input.addEventListener('input',renderList); retry.addEventListener('click',load); load(); return section;
  }
  // Interpretive vocabulary, not a score or a prediction. Stars remain engine-owned.
  var ziweiStarGuides = {
    '자미': ['책임을 맡아 방향을 정하는 힘', '흩어진 의견을 정리하고 기준을 세우는 데 강점이 있습니다. 다만 혼자 책임지려 하면 도움을 청하기 어려워질 수 있습니다.', '결정할 일과 위임할 일을 먼저 나누어 보세요.'],
    '천기': ['변화를 읽고 방법을 찾는 힘', '여러 가능성을 비교하고 상황에 맞게 계획을 바꾸는 데 능숙한 편입니다. 생각이 많아지면 실행 전에 지칠 수 있습니다.', '선택 기준을 세 가지로 좁히고 작은 실험부터 시작해 보세요.'],
    '태양': ['먼저 나서서 기여하는 힘', '자신이 도움이 되는 역할에서 보람을 찾기 쉽습니다. 다른 사람의 기대를 모두 받아들이면 정작 자신의 필요는 뒤로 밀릴 수 있습니다.', '도울 수 있는 범위와 쉬어야 할 시간을 함께 정하세요.'],
    '무곡': ['결과를 만들고 자원을 관리하는 힘', '말보다 실행과 성과로 신뢰를 쌓는 쪽에 가깝습니다. 효율을 앞세우다 보면 관계에서도 답을 너무 빨리 제시할 수 있습니다.', '해결책을 말하기 전에 상대가 원하는 도움부터 물어보세요.'],
    '천동': ['편안한 관계와 여유를 만드는 힘', '긴장을 낮추고 서로 편안하게 지낼 방법을 찾는 데 강점이 있습니다. 갈등을 피하다 필요한 결정을 미룰 수도 있습니다.', '편안함을 지키기 위해서라도 작은 불편은 일찍 말해 보세요.'],
    '염정': ['원칙과 몰입으로 깊이를 만드는 힘', '중요하게 여기는 기준이 분명하고 관계나 일에 깊게 몰입하는 편입니다. 기준이 강해지면 작은 차이도 크게 느껴질 수 있습니다.', '지켜야 할 원칙과 조율할 취향을 구분해 보세요.'],
    '천부': ['기반을 지키고 안정적으로 운영하는 힘', '가진 자원과 사람을 살피며 오래 유지할 구조를 만드는 데 강점이 있습니다. 안정에 무게를 두다 변화의 시점을 놓칠 수 있습니다.', '지킬 기반은 남기고 새 시도에는 작은 예산과 기한을 정하세요.'],
    '태음': ['세밀하게 살피고 내실을 쌓는 힘', '눈에 잘 띄지 않는 감정과 세부를 알아차리는 편입니다. 혼자 충분히 생각하려다 자신의 뜻을 늦게 전할 수 있습니다.', '완전히 정리된 답이 아니어도 현재의 생각을 나누어 보세요.'],
    '탐랑': ['호기심으로 사람과 경험을 연결하는 힘', '새로운 자극과 만남에서 가능성을 발견하는 편입니다. 관심이 넓어질수록 에너지가 분산되기 쉽습니다.', '이번 달에 깊게 이어갈 한 가지를 골라 보세요.'],
    '거문': ['질문하고 표현하며 본질을 찾는 힘', '모호한 부분을 짚고 논리를 확인하는 데 강점이 있습니다. 설명이 길어지거나 표현이 날카로워지면 의도와 다르게 전달될 수 있습니다.', '반론보다 확인 질문을 먼저 건네 보세요.'],
    '천상': ['균형을 살피고 협력을 조율하는 힘', '상대의 입장과 공동의 기준을 함께 고려하는 편입니다. 모두를 배려하다 자신의 선택이 흐려질 수 있습니다.', '조율하기 전에 내가 지킬 조건 하나를 정해 보세요.'],
    '천량': ['경험과 원칙으로 보호하는 힘', '문제를 넓게 보고 누군가의 안전판이 되는 역할에 강점이 있습니다. 조언이 앞서면 상대에게 간섭처럼 느껴질 수 있습니다.', '도움이 필요한지 먼저 확인하고 조언의 범위를 맞추세요.'],
    '칠살': ['압박 속에서 결단하고 돌파하는 힘', '어려운 상황에서 판단을 내리고 책임지는 역할에 힘이 실리기 쉽습니다. 긴장이 길어지면 혼자 버티는 습관으로 이어질 수 있습니다.', '결정 전에 되돌릴 수 있는 범위와 도움받을 사람을 확인하세요.'],
    '파군': ['낡은 방식을 정리하고 새로 만드는 힘', '맞지 않는 구조를 발견하면 바꾸려는 동기가 강한 편입니다. 전환 속도가 빠르면 유지할 가치까지 함께 놓칠 수 있습니다.', '없앨 것과 남길 것을 나누고 전환 비용부터 확인하세요.']
  };
  var ziweiPalaceGuides = {
    '명궁': ['나를 움직이는 기준', '낯선 상황에서 무엇을 먼저 살피고 어떤 방식으로 결정하는지 읽습니다. 성격 전체를 고정하는 낙인이 아니라 익숙한 반응의 출발점입니다.', '중요한 결정을 앞두고 내가 지키려는 기준과 두려워하는 것을 따로 적어 보세요.'],
    '형제궁': ['가까운 동료와 나누는 힘', '형제자매와 가까운 동년배 사이에서 도움을 주고받는 방식, 친밀함 속의 경쟁과 거리감을 살펴봅니다. 실제 가족의 수나 인품을 단정하지 않습니다.', '가깝다는 이유로 기대를 생략하지 말고, 부탁의 범위와 역할을 분명히 해 보세요.'],
    '부부궁': ['친밀한 관계를 맺는 방식', '연인이나 배우자에게 기대하는 관계의 모습과 함께 생활할 때의 조율 방식을 읽습니다. 상대의 마음이나 결혼의 성패를 확정하는 자리는 아닙니다.', '연락 빈도, 돈, 혼자만의 시간 중 서로 기대가 다른 한 가지부터 대화해 보세요.'],
    '자녀궁': ['돌보고 길러내는 관계', '자녀와의 관계에서 나타날 돌봄과 기대, 다음 세대를 대하는 태도를 살펴봅니다. 자녀의 유무·수나 임신 가능성을 예측하지 않습니다.', '내가 원하는 성장과 상대가 원하는 성장을 구분하고 선택할 여지를 남겨 보세요.'],
    '재백궁': ['돈을 벌고 다루는 습관', '수입을 만드는 방식과 자원을 배분하는 태도를 읽습니다. 재산 규모나 투자 수익을 보장하지 않으며 일의 구조와 함께 살펴야 합니다.', '수입의 크기보다 반복되는 지출과 유지 가능한 수입 경로를 먼저 정리해 보세요.'],
    '질액궁': ['몸과 마음의 부담을 돌보는 방식', '긴장이 쌓일 때의 생활 리듬과 돌봄의 필요를 상징적으로 살펴봅니다. 병명·수명·질병 발생 여부를 판단하는 의학적 자료는 아닙니다.', '수면과 휴식의 변화를 기록해 보세요. 지속되는 증상은 명반 해석보다 의료진의 평가가 우선입니다.'],
    '천이궁': ['바깥세상에서 드러나는 나', '익숙한 환경을 벗어났을 때의 태도와 외부 사람·기회를 만나는 방식을 읽습니다. 이사나 해외 이동의 성공을 단정하지 않습니다.', '환경을 바꾸기 전에 실제 생활비, 지원망, 적응 기간을 함께 점검해 보세요.'],
    '노복궁': ['사람들과 함께 일하는 방식', '친구·동료·협력자와 맺는 관계에서 신뢰와 역할이 어떻게 형성되는지 살펴봅니다. 특정인이 배신한다고 판단하지 않습니다.', '신뢰와 별개로 업무 범위, 기한, 보상을 확인하면 관계도 더 편안해집니다.'],
    '관록궁': ['일에서 역량을 쓰는 방식', '직함보다 어떤 과제와 역할에서 힘을 발휘하는지, 책임과 성취를 다루는 방식을 읽습니다. 특정 직업이 유일한 정답이라는 뜻은 아닙니다.', '최근 잘 풀린 업무 하나를 골라 분석·조율·실행 중 무엇이 강점이었는지 찾아보세요.'],
    '전택궁': ['머무를 기반을 만드는 방식', '집과 생활 기반을 꾸리고 유지하는 태도, 사적인 공간에서 원하는 안정감을 읽습니다. 부동산 가격이나 상속 여부를 확정하지 않습니다.', '소유 여부보다 생활 동선, 유지 비용, 함께 사는 사람의 필요를 먼저 비교해 보세요.'],
    '복덕궁': ['마음이 쉬고 만족을 느끼는 방식', '겉으로 보이는 성취와 별개로 무엇에서 편안함과 의미를 느끼는지 살펴봅니다. 행복의 점수나 정신건강 진단은 아닙니다.', '성과와 상관없이 마음이 회복되는 활동을 찾아 일주일에 작은 시간을 남겨 보세요.'],
    '부모궁': ['보호와 권위를 대하는 방식', '부모·양육자 및 윗사람과의 관계에서 기대와 독립을 조율하는 태도를 살펴봅니다. 실제 가족의 성품이나 관계 전체를 판단하지 않습니다.', '받고 싶은 도움과 스스로 결정할 영역을 나누어 말해 보세요.']
  };
  function graphSvg(tag, attributes, text) {
    var element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attributes || {}).forEach(function(key) { element.setAttribute(key, attributes[key]); });
    if (text != null) element.textContent = text;
    return element;
  }
  function ziweiRadar(name, radar) {
    var figure = node('figure', 'fr-radar');
    figure.appendChild(node('figcaption', '', name + ' 에너지 스펙트럼'));
    if (!radar || radar.values.length !== 5 || radar.values.some(function(value) { return !Number.isFinite(value); })) {
      figure.appendChild(node('p', 'fr-caption', '스펙트럼 지표가 없습니다. 아래 궁별 설명을 참고해 주세요.')); return figure;
    }
    var svg = graphSvg('svg', { viewBox:'0 0 340 290', role:'img', 'aria-label':name + ' 에너지 스펙트럼 · 기존 해석기 보조지표' });
    svg.appendChild(graphSvg('desc', {}, radar.labels.map(function(label,i) { return label + ' ' + radar.values[i]; }).join(', ') + '. 성격 검사나 성공 확률이 아닙니다.'));
    function point(index, radius) { var angle = -Math.PI / 2 + index * Math.PI * 2 / 5; return [170 + Math.cos(angle) * radius, 146 + Math.sin(angle) * radius]; }
    [25,50,75,100].forEach(function(level) {
      svg.appendChild(graphSvg('polygon', {class:'fr-radar-grid', points:radar.labels.map(function(_,i) { return point(i,level).join(','); }).join(' ')}));
    });
    radar.labels.forEach(function(label,i) {
      var edge = point(i,100), labelPoint = point(i,128);
      svg.appendChild(graphSvg('line', {class:'fr-graph-axis', x1:170, y1:146, x2:edge[0], y2:edge[1]}));
      svg.appendChild(graphSvg('text', {class:'fr-radar-label', x:labelPoint[0], y:labelPoint[1], 'text-anchor':'middle'}, label));
    });
    svg.appendChild(graphSvg('polygon', {class:'fr-radar-value', points:radar.values.map(function(value,i) { return point(i,Math.max(0,Math.min(100,value))).join(','); }).join(' ')}));
    radar.values.forEach(function(value,i) { var position = point(i,value); svg.appendChild(graphSvg('circle',{class:'fr-radar-dot',cx:position[0],cy:position[1],r:4})); });
    figure.appendChild(svg);
    var values = node('dl', 'fr-radar-values');
    radar.labels.forEach(function(label,i) { var item = node('div',''); item.appendChild(node('dt','',label)); item.appendChild(node('dd','',String(radar.values[i]))); values.appendChild(item); });
    figure.appendChild(values);
    figure.appendChild(node('p','fr-caption','0–100의 기존 해석기 보조지표입니다. 별의 개수와 궁의 역할을 단순화한 값이며, 성격·건강을 측정한 결과나 성공 확률이 아닙니다. 긴장·마찰 지표는 높다고 유리한 뜻이 아닙니다.'));
    return figure;
  }
  function ziweiLifeGraph(periods, openPalace) {
    var section = node('section','fr-life-graph');
    section.appendChild(node('h4','', '인생 흐름 곡선'));
    section.appendChild(node('p','fr-caption','대한이 지나는 궁의 원국 배치를 비교합니다. 곡선은 구간 사이를 읽기 쉽게 연결한 것으로, 중간 나이의 운을 계산하거나 사건을 예측한 선이 아닙니다.'));
    if (!Array.isArray(periods) || !periods.length) { section.appendChild(node('p','', '대한 지표가 없어 곡선을 표시하지 않았습니다. 출생 정보를 확인해 주세요.')); return section; }
    var tabs = node('div','fr-flow-tabs'); tabs.setAttribute('role','group'); tabs.setAttribute('aria-label','인생 흐름 영역');
    var domains = [
      {key:'overall',label:'전체 흐름',series:[['overall','전체']]},
      {key:'work',label:'일과 재물',series:[['career','일'],['money','재물']]},
      {key:'love',label:'관계',series:[['love','관계']]},
      {key:'health',label:'회복',series:[['health','생활·회복']]}
    ];
    var chosen = domains[0], selected = 0;
    var legend = node('div','fr-graph-legend');
    var scroll = node('div','fr-graph-scroll');
    var plot = graphSvg('svg',{viewBox:'0 0 840 280',role:'group','aria-label':'대한별 원국 배치 지표. 점을 선택하면 구간 설명이 표시됩니다.'});
    var readout = node('div','fr-flow-readout'); readout.setAttribute('aria-live','polite'); readout.setAttribute('aria-atomic','true');
    var detailLink = node('button','fr-flow-palace-link','선택한 궁 상세 읽기'); detailLink.type = 'button';
    detailLink.addEventListener('click',function() { openPalace(periods[selected].idx); });
    function coordinates(index, value) { return [50 + index * 740 / Math.max(1,periods.length - 1), 220 - value * 1.8]; }
    function updateSelection() {
      var period = periods[selected];
      readout.replaceChildren(node('strong','', period.startAge + '–' + period.endAge + '세 · ' + period.name),node('p','',chosen.series.map(function(series) { return series[1] + ' 지표 ' + period.scores[series[0]]; }).join(' / ')),node('p','fr-caption','본궁 주성 ' + (period.main.join('·') || '없음(공궁)') + ' · 보조성 ' + period.aux.length + '개 · 주의성 ' + period.bad.length + '개'));
      detailLink.textContent = period.name + ' 상세 읽기';
      plot.querySelectorAll('[data-period]').forEach(function(point) { var active = Number(point.dataset.period) === selected; point.setAttribute('aria-pressed',String(active)); point.classList.toggle('is-selected',active); });
    }
    function draw() {
      plot.replaceChildren(); legend.replaceChildren();
      [0,25,50,75,100].forEach(function(value) {
        var y = coordinates(0,value)[1];
        plot.appendChild(graphSvg('line',{class:'fr-graph-axis',x1:50,x2:790,y1:y,y2:y}));
        plot.appendChild(graphSvg('text',{class:'fr-flow-scale',x:35,y:y+4,'text-anchor':'end'},value));
      });
      chosen.series.forEach(function(series,seriesIndex) {
        var colorClass = seriesIndex ? 'fr-series-secondary' : 'fr-series-primary';
        legend.appendChild(node('span',colorClass,series[1] + ' · 원국 배치 지표'));
        var positions = periods.map(function(period,index) { return coordinates(index,period.scores[series[0]]); });
        var path = 'M' + positions[0].join(',');
        for (var i=1;i<positions.length;i++) {
          var previous=positions[i-1], current=positions[i], middle=(previous[0]+current[0])/2;
          path += ' C' + middle + ',' + previous[1] + ' ' + middle + ',' + current[1] + ' ' + current.join(',');
        }
        plot.appendChild(graphSvg('path',{class:'fr-flow-curve '+colorClass,d:path}));
        positions.forEach(function(position) { plot.appendChild(graphSvg('circle',{class:'fr-flow-mark '+colorClass,cx:position[0],cy:position[1],r:4})); });
      });
      periods.forEach(function(period,index) {
        var position = coordinates(index,period.scores[chosen.series[0][0]]);
        var target = graphSvg('g',{class:'fr-flow-point','data-period':index,role:'button',tabindex:0,'aria-label':period.startAge+'–'+period.endAge+'세 '+period.name+', '+chosen.series.map(function(series) { return series[1]+' '+period.scores[series[0]]; }).join(', ')});
        target.appendChild(graphSvg('circle',{class:'fr-point-hit',cx:position[0],cy:position[1],r:25}));
        target.appendChild(graphSvg('circle',{class:'fr-point-ring',cx:position[0],cy:position[1],r:8}));
        target.addEventListener('click',function() { selected=index; updateSelection(); });
        target.addEventListener('keydown',function(event) {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selected=index; updateSelection(); }
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); selected=(index+(event.key==='ArrowRight'?1:periods.length-1))%periods.length; updateSelection(); plot.querySelector('[data-period="'+selected+'"]').focus(); }
        });
        plot.appendChild(target);
        plot.appendChild(graphSvg('text',{class:'fr-flow-age',x:position[0],y:249,'text-anchor':'middle'},period.startAge+'–'+period.endAge));
      });
      plot.appendChild(graphSvg('text',{class:'fr-flow-scale',x:790,y:270,'text-anchor':'end'},'나이(세)'));
      tabs.querySelectorAll('button').forEach(function(button) { button.setAttribute('aria-pressed',String(button.dataset.domain === chosen.key)); });
      updateSelection();
    }
    domains.forEach(function(domain) { var button=node('button','',domain.label); button.type='button'; button.dataset.domain=domain.key; button.addEventListener('click',function() { chosen=domain; draw(); }); tabs.appendChild(button); });
    section.appendChild(tabs); section.appendChild(legend); scroll.appendChild(plot); section.appendChild(scroll);
    section.appendChild(node('p','fr-caption fr-graph-hint','점을 눌러 시기를 선택하세요. 작은 화면에서는 그래프를 좌우로 넘길 수 있습니다.'));
    section.appendChild(readout); section.appendChild(detailLink);
    section.appendChild(node('p','fr-caption','기존 해석기의 가중 지표(0–100)이며 높낮이는 삶의 가치나 성취 등급이 아닙니다. 연도별 세운·대한 사화는 이 곡선에 반영하지 않으며, 회복 지표는 의학적 판단에 사용할 수 없습니다.'));
    draw(); return section;
  }
  function ziweiEnergy(data, idx, radar) {
    var section = node('section', 'fr-energy');
    var name = data.palacesByIndex[idx];
    var guideName = name === '교우궁' ? '노복궁' : name;
    var palaceGuide = ziweiPalaceGuides[guideName];
    section.appendChild(node('p', 'fr-brand', 'PALACE READING / ' + String(idx + 1).padStart(2, '0')));
    section.appendChild(node('h3', '', name + (palaceGuide ? ' · ' + palaceGuide[0] : ' 상세 해석')));
    if (palaceGuide) section.appendChild(node('p', 'fr-palace-intro', palaceGuide[1]));
    section.appendChild(node('p', 'fr-caption', '에너지는 운의 점수가 아니라, 이 영역에서 반복되기 쉬운 반응과 선택의 방향을 뜻합니다.'));
    section.appendChild(ziweiRadar(name, radar));
    var stars = data.stars[idx] || {};
    var main = stars.main || [];
    function rawText(raw) { return typeof raw === 'object' && raw ? String(raw.name || raw.star || '') : String(raw); }
    function borrowed(raw) { return !!(raw && typeof raw === 'object' && raw.borrowed) || rawText(raw).indexOf('차성') >= 0; }
    var directMain = main.filter(function (raw) { return !borrowed(raw); });
    if (!main.length) main = ((data.stars[(idx + 6) % 12] || {}).main || []).map(function (raw) { return { name:rawText(raw), borrowed:true }; });
    if (!directMain.length) section.appendChild(node('p', '', '주성이 없는 공궁입니다. 성향이 없거나 약하다는 뜻은 아닙니다. 아래 차성은 맞은편 궁에서 참고하는 별로, 내 궁에 직접 놓인 주성과 구분합니다. 삼합 궁과 보조성까지 함께 살펴야 합니다.'));
    main.forEach(function (raw) {
      var key = Object.keys(ziweiStarGuides).find(function (k) { return rawText(raw).indexOf(k) !== -1; });
      if (!key) return;
      var guide = ziweiStarGuides[key];
      var article = node('article', 'fr-energy-star');
      article.appendChild(node('h4', '', key + (borrowed(raw) ? ' (대궁에서 참고하는 차성)' : '') + ' · ' + guide[0]));
      article.appendChild(node('p', '', guide[1]));
      article.appendChild(node('p', 'fr-energy-action', '생활에서 활용하기 · ' + guide[2]));
      section.appendChild(article);
    });
    if (main.length > 1) section.appendChild(node('p', 'fr-caption', '두 주성은 성격을 반씩 나누는 것이 아닙니다. 같은 상황에서도 한 별의 추진 방식과 다른 별의 판단 기준이 함께 드러날 수 있어 조합으로 읽습니다.'));
    var spectrum = node('div', 'fr-energy-spectrum'); spectrum.setAttribute('aria-label', name + ' 별 구성');
    [['주성','main','기본 반응의 방향'],['보조성','aux','발휘를 돕는 조건'],['살성·주의성','bad','조율이 필요한 자극']].forEach(function (item) {
      var count = item[1] === 'main' ? directMain.length : (stars[item[1]] || []).length;
      var row = node('div', 'fr-spectrum-row');
      row.appendChild(node('strong', '', item[0] + ' ' + count + '개'));
      row.appendChild(node('span', '', item[2]));
      spectrum.appendChild(row);
    });
    section.appendChild(spectrum);
    if (main.length > directMain.length) section.appendChild(node('p', 'fr-caption', '차성 ' + (main.length - directMain.length) + '개는 본궁 주성 개수에 포함하지 않았습니다. 명반의 ↗ 표시는 차성을 뜻합니다.'));
    section.appendChild(node('p', 'fr-caption', '별 구성 스펙트럼은 실제 배치의 개수입니다. 많다고 길하거나 적다고 불리한 점수가 아닙니다. 묘·왕·득·함은 별이 놓인 자리에서의 발휘 조건이며, 사람의 우열을 뜻하지 않습니다.'));
    if (palaceGuide) { var action = node('aside', 'fr-palace-action'); action.appendChild(node('h4', '', '지금 생활에 적용하기')); action.appendChild(node('p', '', palaceGuide[2])); section.appendChild(action); }
    var linked = [4, 8, 6].map(function (offset) { return data.palacesByIndex[(idx + offset) % 12]; }).filter(Boolean);
    var detail = node('details', 'fr-energy-context'); detail.appendChild(node('summary', '', '함께 읽는 궁 · ' + linked.join(' · ')));
    detail.appendChild(node('p', '', '이 궁과 삼합으로 연결되는 두 궁, 맞은편 대궁을 함께 읽는 것이 삼방사정입니다. ' + linked.join('·') + '의 실제 별 배치를 함께 살펴야 ' + name + '의 강점이 어떤 환경에서 발휘되고 무엇을 조율해야 할지 더 구체적으로 이해할 수 있습니다.'));
    detail.appendChild(node('p', '', '화록은 자원이 모이는 경로, 화권은 주도권과 책임, 화과는 인정과 정리, 화기는 집착·마찰을 점검할 단서로 풀이합니다. 실제 별의 배치와 함께 읽으며, 화기 하나로 실패를 단정하지 않습니다. 타고난 구조와 시기의 변화인 대한·세운도 구분해야 합니다.'));
    section.appendChild(detail);
    return section;
  }
  function ziwei(area, data) {
    if (!setUp('ziwei', area) || !data) return;
    var hero = node('section', 'fr-hero');
    hero.appendChild(node('p', 'fr-brand', '紫微斗數 / MY STAR ATLAS'));
    hero.appendChild(node('h2', 'fr-title', t('myRecord')));
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
    var initialSelection = true;
    function selectCell(cell) {
      var idx = Number(cell.className.match(/\bzw-cell-(\d+)\b/)[1]);
      var pd = window._currentZiweiData;
      cells.forEach(function (c) { c.classList.toggle('active', c === cell); c.setAttribute('aria-pressed', String(c === cell)); });
      choices.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.palaceIndex) === idx)); });
      window._renderZwPanel(idx, pd.palacesByIndex[idx], pd.stars[idx], pd, { clickOnly: true, targetId: 'zwDetailPanel', showClose: true, showRadar: false, scroll: false });
      var old = reading.querySelector('.fr-energy'); if (old) old.remove();
      var detailPanel = reading.querySelector('#zwDetailPanel');
      reading.insertBefore(ziweiEnergy(pd, idx, detailPanel.__zwVisualMetrics && detailPanel.__zwVisualMetrics.radar), detailPanel);
      if (typeof window._zwDrawTriad === 'function') window._zwDrawTriad(idx);
      if (!initialSelection) reading.querySelector('.fr-energy').scrollIntoView({block:'start',behavior:'instant'});
    }
    cells.forEach(function (cell) {
      cell.removeAttribute('onclick');
      cell.onclick = function () { selectCell(cell); };
      cell.addEventListener('keydown', function (event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); selectCell(cell); } });
      var compact = node('div', 'fr-chart-stars');
      cell.querySelectorAll('.zw-star-main').forEach(function (star) {
        var text = star.firstChild && star.firstChild.textContent.trim();
        compact.appendChild(node('span', '', text + (star.textContent.indexOf('차성') >= 0 ? ' ↗' : '')));
      });
      if (!compact.children.length) compact.appendChild(node('span', '', '공궁'));
      cell.querySelector('.zw-stars-wrap').before(compact);
    });
    cells.map(function (cell) { var name = cell.querySelector('.zw-palace-name').textContent.trim(); return [name, { '명궁':'palaceLife','재백궁':'palaceWealth','관록궁':'palaceCareer','부부궁':'palaceSpouse','복덕궁':'palaceWellbeing' }[name]]; }).forEach(function (palace) {
      var cell = cells.find(function (el) { var label = el.querySelector('.zw-palace-name'); return label && label.textContent.trim() === palace[0]; });
      if (!cell) return;
      var button = node('button', 'fr-palace-choice'); button.type = 'button';
      button.dataset.palaceIndex = cell.className.match(/\bzw-cell-(\d+)\b/)[1];
      var extraNames = { '형제궁':['Siblings','兄弟宮','兄弟宫','兄弟宮'], '자녀궁':['Children','子女宮','子女宫','子女宮'], '질액궁':['Wellness','疾厄宮','疾厄宫','疾厄宮'], '천이궁':['Travel','遷移宮','迁移宫','遷移宮'], '노복궁':['Friends','交友宮','交友宫','交友宮'], '전택궁':['Home','田宅宮','田宅宫','田宅宮'], '부모궁':['Parents','父母宮','父母宫','父母宮'] };
      var lang = document.documentElement.lang || 'ko'; try { lang = localStorage.getItem('cd_lang') || lang; } catch (_) {}
      var translated = extraNames[palace[0]];
      button.appendChild(node('strong', '', palace[1] ? t(palace[1]) : translated && lang !== 'ko' ? translated[Math.max(0, ['en','ja','zh','zh-TW'].indexOf(lang))] : palace[0]));
      button.appendChild(node('span', '', cell.querySelector('.zw-branch-name').textContent));
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', function () {
        selectCell(cell);
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
      if (closing) { var energy = reading.querySelector('.fr-energy'); if (energy) energy.remove(); cells.forEach(function (cell) { cell.setAttribute('aria-pressed','false'); }); }
    });
    var panel = dashboard.querySelector('#zwDetailPanel');
    if (panel) { panel.setAttribute('aria-live', 'polite'); reading.appendChild(panel); }
    reading.id = 'fr-ziwei-reading';
    var chart = dashboard.querySelector('.zw-grid-wrap');
    var chartSection = node('section', 'fr-chart-section'); chartSection.id = 'fr-ziwei-chart';
    chartSection.appendChild(heading(t('allPalaces')));
    chartSection.appendChild(chart);
    dashboard.prepend(chartSection);
    chartSection.after(reading);
    var nav = node('nav', 'fr-ziwei-nav'); nav.setAttribute('aria-label', t('ziwei'));
    [['fr-ziwei-chart',t('chart')],['fr-ziwei-reading',t('keyReading')],['fr-ziwei-flow',localized('flow')],['zwDeepAiPromptPanel',localized('consult')],['fr-ziwei-articles',t('articleLibrary')]].forEach(function (item) {
      var link = node('a', '', item[1]); link.href = '#' + item[0]; nav.appendChild(link);
    });
    hero.after(nav);
    var consult = dashboard.querySelector('#zwDeepAiPromptPanel');
    var factsTable = dashboard.querySelector('.zw-fact-tables');
    if (factsTable) fold(dashboard, t('readMore'), [factsTable]);
    var extra = Array.from(dashboard.children).filter(function (el) { return !el.matches('.fr-reading,.fr-disclosure,.fr-chart-section,#zwDeepAiPromptPanel'); });
    if (extra.length) fold(dashboard, t('explore'), extra, 'fr-ziwei-explore');
    var full = area.querySelector('#zwComprehensiveReport');
    if (full) {
      var flow = node('section', 'fr-flow-section'); flow.id = 'fr-ziwei-flow';
      flow.appendChild(heading(localized('flow')));
      flow.appendChild(ziweiLifeGraph(full.__zwVisualMetrics && full.__zwVisualMetrics.periods, function(idx) {
        var cell=cells.find(function(item) { return Number(item.className.match(/\bzw-cell-(\d+)\b/)[1]) === idx; }); if(cell) selectCell(cell);
      }));
      flow.appendChild(node('h4', 'fr-flow-title', '인생 흐름표 · 대한의 흐름'));
      flow.appendChild(node('p', 'fr-caption', '대한은 약 10년 단위로 삶의 관심 영역을 살펴보는 틀입니다. 아래는 명반에서 계산된 나이 구간과 해당 궁이며, 좋고 나쁨을 매긴 점수표가 아닙니다.'));
      var timeline = node('ol', 'fr-life-timeline');
      (data.daHanList || []).slice().sort(function (a,b) { return a.startAge - b.startAge; }).forEach(function (period) {
        var item = node('li', '');
        var button = node('button', 'fr-period'); button.type = 'button';
        button.appendChild(node('span', '', period.startAge + '–' + period.endAge + '세'));
        button.appendChild(node('strong', '', period.palaceName));
        var guide = ziweiPalaceGuides[period.palaceName];
        if (guide) button.appendChild(node('small', '', guide[0]));
        button.addEventListener('click', function () { var cell = cells.find(function (c) { return Number(c.className.match(/\bzw-cell-(\d+)\b/)[1]) === Number(period.idx); }); if (cell) { selectCell(cell); reading.scrollIntoView({block:'start', behavior:'smooth'}); } });
        item.appendChild(button); timeline.appendChild(item);
      });
      if (timeline.children.length) flow.appendChild(timeline);
      else flow.appendChild(node('p', '', '대한 정보가 부족합니다. 출생 정보를 확인해 주세요.'));
      var preview = node('aside', 'fr-flow-preview');
      preview.appendChild(node('h4', '', '기본 흐름에서, 나의 선택으로'));
      preview.appendChild(node('p', '', '위 흐름표와 각 궁의 기본 해석은 지금 읽을 수 있습니다. 대한의 궁은 그 시기에 살펴볼 삶의 주제이지, 특정 사건이 일어난다는 뜻은 아닙니다.'));
      preview.appendChild(node('p', 'fr-caption', '연도별 기회와 주의점, 시기별 행동 해석은 아래 리포트의 「대한 10년운」에서 이어집니다. 잠긴 항목은 기존 이용권·결제 안내를 확인한 뒤 열 수 있습니다.'));
      var continueLink = node('a', 'fr-flow-link', '대한 10년운 상세 안내'); continueLink.href = '#ziweiDecadeLuckGate'; preview.appendChild(continueLink);
      flow.appendChild(preview);
      fold(flow, t('fullReading'), [full]);
      area.appendChild(flow);
    }
    if (consult) area.appendChild(consult);
    area.appendChild(ziweiArticleLibrary(area));
    // The atlas is the sole decorative artwork on this surface. Keep text/captions.
    area.querySelectorAll('img').forEach(function (img) { img.hidden = true; });
    cells.forEach(function (cell) {
      cell.setAttribute('aria-label', cell.querySelector('.zw-palace-name').textContent + ' · ' + cell.querySelector('.zw-branch-name').textContent);
    });
    var mingCell = cells.find(function (cell) { return cell.querySelector('.zw-palace-name').textContent.trim() === '명궁'; });
    var ming = mingCell && choices.querySelector('[data-palace-index="' + mingCell.className.match(/\bzw-cell-(\d+)\b/)[1] + '"]');
    if (ming) ming.click();
    initialSelection = false;
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

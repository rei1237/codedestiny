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

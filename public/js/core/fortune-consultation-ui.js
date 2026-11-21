(function (window, document) {
  'use strict';

  // Presentation only. Existing composers retain payment, request and recovery ownership.
  var services = {
    ziwei: {
      image: '/images/master-profiles/musung-ziwei-portrait.webp', master: '무성', avatar: 'musung', freeLead: '명궁과 열두 궁에서 지금 살펴볼 자리를 짚겠습니다. 별의 근거를 확인하고, 생활에서 풀어 갈 선택을 함께 읽어요.',
      name: '무성의 자미두수 궁성 상담', title: '열두 궁에 담긴,<br>나의 다음 선택',
      lead: '무성입니다. 명궁의 기질부터 일과 관계의 자리까지. 지금의 고민을 명반 위에 놓고, 나에게 맞는 선택의 방향을 함께 읽어요.',
      basis: '명궁 · 관록궁 · 재백궁과 주요 별의 배치',
      difference: '무료 명반에서 본 별의 배치를, 지금 고민하는 선택과 연결해 풀어드립니다.',
      topics: ['일과 나의 역할', '사람 사이의 거리', '변화 앞의 선택'],
      examples: ['지금 하는 일을 계속할지, 새로운 역할을 시도할지 고민이에요. 제 강점과 주의할 점을 함께 봐주세요.', '관계에서 제 뜻을 너무 앞세우는 것 같아요. 제 성향에 맞는 소통 방법이 궁금해요.'],
      alt: '먹색 학자 도포를 입고 금빛 깃털을 든 자미두수 마스터 무성'
    },
    sukuyo: {
      image: '/images/master-profiles/hanbi-sukuyo-reading.webp',
      master: '서한비', avatar: 'hanbi', freeLead: '본명숙에 담긴 강점과 마음이 지치는 순간을 함께 살펴보겠습니다. 상대의 마음을 단정하기보다, 당신에게 편안한 관계의 간격을 읽어 드릴게요.',
      name: '서한비의 숙요점 라이트 상담', title: '마음의 리듬을 읽고,<br>인연의 간격을 찾다',
      lead: '서한비입니다. 지금 마음에 남은 질문 하나를 들려주세요. 본명숙의 성향과 관계의 리듬을 짚고, 오늘 해 볼 수 있는 작은 행동을 함께 찾아드릴게요.',
      basis: '계산된 본명숙과 숙요 성향',
      difference: '무료 숙요 프로필의 성향 설명에서 한 걸음 더 나아가, 내가 겪는 상황에 맞춰 상담합니다.',
      topics: ['반복되는 마음', '관계의 속도', '나에게 맞는 선택'],
      examples: ['가까운 사람에게 마음을 쏟다가 지치는 일이 반복돼요. 제 성향과 편안한 관계의 간격을 봐주세요.', '새로운 일을 시작하려는데 마음이 자주 흔들려요. 제 강점을 살릴 방법을 알고 싶어요.'],
      alt: '달빛 아래 장부를 펼쳐 설명하는 숙요점 마스터 서한비'
    },
    astrology: {
      image: '/images/master-profiles/yun-astrology-portrait.webp', master: '윤달', avatar: 'yun', freeLead: '태양과 달, 상승궁이 서로 다른 자리에서 나를 비춰요. 계산된 행성과 하우스를 먼저 짚고, 지금의 선택과 연결해 볼게요.',
      name: '윤달의 서양 점성술 차트 상담', title: '별들의 배치에서,<br>나다운 방향을 찾다',
      lead: '윤달이에요. 태양과 달, 행성과 하우스가 보여주는 나의 여러 모습. 차트의 흐름을 지금의 질문과 연결해, 선택의 실마리를 읽어요.',
      basis: '출생 차트의 행성 · 하우스 · 주요 각도',
      difference: '무료 차트에서 확인한 배치가 일과 관계에서 어떻게 드러날 수 있는지, 질문을 중심으로 풀어드립니다.',
      topics: ['겉과 속의 성향', '일과 관계의 패턴', '선택의 실마리'],
      examples: ['하고 싶은 일과 주변의 기대가 달라 고민이에요. 제 차트에서 어떤 강점을 먼저 살려볼 수 있을까요?', '연애에서 자꾸 같은 갈등을 겪어요. 제 감정 표현과 관계 패턴을 함께 읽어주세요.'],
      alt: '별과 달을 배경으로 남색 옷을 입은 점성술 마스터 윤달'
    },
    vedic: {
      image: '/images/master-profiles/yun-astrology-portrait.webp', master: '윤달', avatar: 'yun', freeLead: '윤달이에요. 라시는 별자리의 기질, 나크샤트라는 달이 머문 자리의 성향, 다샤는 시기의 흐름을 보여줘요. 베다 점성술의 근거를 하나씩 짚고, 지금 준비할 일을 함께 살펴볼게요.',
      name: '윤달의 베다 점성술 상담', title: '타고난 별의 결,<br>지금의 시간을 읽다',
      lead: '윤달이에요. 베다 점성술의 라시와 나크샤트라가 비추는 기질, 다샤가 보여주는 긴 시간의 흐름. 지금의 고민에 맞춰 내 삶의 리듬을 살펴요.',
      basis: '라시 · 나크샤트라 · 계산된 다샤 흐름',
      difference: '무료 차트의 별자리와 시기 정보를 질문에 연결해, 준비할 일과 살펴볼 선택을 함께 정리합니다.',
      topics: ['나의 기본 기질', '시간의 큰 흐름', '지금의 준비'],
      examples: ['진로를 바꾸고 싶은데 준비가 충분한지 고민이에요. 지금의 다샤 흐름과 제 성향을 함께 봐주세요.', '관계에서 비슷한 감정이 반복돼요. 제 나크샤트라의 성향과 대화에서 살펴볼 점이 궁금해요.'],
      alt: '별과 달을 배경으로 남색 옷을 입은 베다점 마스터 윤달'
    }
  };

  function guide(service) {
    var item = services[service];
    if (!item || !item.master) return '';
    var face = {ziwei:'museong',sukuyo:'seohanbi',astrology:'yun',vedic:'yun'}[service];
    var labels = {ziwei:'자미두수',sukuyo:'숙요점',astrology:'서양 점성술',vedic:'베다점'};
    return '<section class="fc-master-reading" data-fc-master="'+item.avatar+'" aria-label="'+item.master+'의 '+labels[service]+' 해설">'
      + '<img class="fc-master-reading__portrait" src="/images/home/free-fortune-faces/'+face+'.webp" width="192" height="192" decoding="async" alt="">'
      + '<div class="fc-master-reading__copy"><h3>'+item.master+'의 '+labels[service]+' 해설</h3><p>'+item.freeLead+'</p><p class="fc-master-reading__basis">'+item.basis+'</p></div></section>';
  }

  // 기본 운세 결과의 마스터 말풍선(웹툰 컷, 2026-11-22). 고정 문구만 쓴다(LLM 아님).
  // 규칙은 lib/master-say/master-say.mjs 와 같다 — 60자·2문장 이하, 단정어·이모지·상대 마음 단정 금지(__tests__/ui/master-say-shell.test.mjs).
  // 표정 → 파일은 src/features/expert-characters/*.ts 와 같다. 윤달 pain 표정은 쓰지 않는다. 한국어 화면에서만 그린다.
  var cast = {
    musung: { name: '무성', dir: '/images/expert-characters/musung/', faces: { idle: 'gentle', greet: 'composed', thinking: 'thinking', reveal: 'verdict', caution: 'verdict', comfort: 'smile' } },
    hanbi: { name: '서한비', dir: '/images/expert-characters/hanbi/', faces: { idle: 'composed', greet: 'smile', thinking: 'thinking', reveal: 'resolve', caution: 'caution', comfort: 'comfort' } },
    yun: { name: '윤달', dir: '/images/novel/remaster/yun/', faces: { idle: 'base', greet: 'laugh', thinking: 'serious', reveal: 'surprise', caution: 'serious', comfort: 'sly' } }
  };
  // 서비스 → 장 키 → [표정, 첫 마디(굵게), 이어지는 말]. {mansion} 같은 자리는 결과 값으로 채운다(없으면 그 줄을 건너뛴다).
  var sayLines = {
    ziwei: {
      character: 'musung',
      reading: ['thinking', '궁 하나를 골라 주십시오.', '고른 자리의 별과 마주 보는 궁을 함께 읽어요.'],
      chart: ['idle', '열두 궁 전체 지도입니다.', '별이 모인 궁과 비어 있는 궁을 나란히 보세요.'],
      flow: ['reveal', '이제 시간의 흐름입니다.', '대한이 바뀌는 때 무게가 어디로 옮겨 가는지 봐요.'],
      articles: ['comfort', '오늘은 여기까지 짚었습니다.', '궁금한 별이 생기면 읽을거리에서 이어 보세요.']
    },
    sukuyo: {
      character: 'hanbi',
      core: ['reveal', '먼저 타고난 바탕이에요.', '이 결이 일과 관계에서 되풀이되는지 떠올려 보세요.'],
      love: ['thinking', '관계의 장부예요.', '가까워지는 속도와 편한 간격을 함께 적어 둘게요.'],
      work: ['idle', '일과 재물 쪽이에요.', '잘 쓰이는 자리와 새는 자리를 나눠 볼게요.'],
      advice: ['comfort', '오늘 해 볼 한 가지예요.', '작게 시작해도 장부에는 남아요.']
    },
    astrology: {
      character: 'yun',
      today: ['greet', '오늘의 하늘부터 볼게요.', '지나가는 행성이 내 차트 어디를 건드리는지 짚어요.'],
      year: ['thinking', '앞으로 열두 달의 흐름이에요.', '큰 행성이 머무는 집이 바뀌는 달을 눈여겨봐요.'],
      reading: ['reveal', '여기부터는 당신의 이야기예요.', '태양·달·상승궁이 서로 다른 얼굴을 보여 줘요.'],
      chart: ['idle', '출생 차트 원본이에요.', '각도 하나도 차트에 있는 것만 읽을게요.'],
      planets: ['caution', '행성 표는 근거 자료예요.', '생시가 흔들리면 하우스는 조심해서 읽어 주세요.']
    },
    vedic: {
      character: 'yun',
      greet: ['greet', '별의 계절을 읽을 거예요.', '달이 머문 나크샤트라가 첫 열쇠예요.'],
      rasi: ['reveal', '라시는 타고난 기질의 바탕이에요.', '달과 라그나가 어디에 앉았는지 먼저 봐요.'],
      nakshatra: ['thinking', '달이 머문 별자리 마을이에요.', '이 결을 어느 쪽으로 쓰는지가 관건이에요.'],
      dasha: ['reveal', '지금 흐르는 다샤의 계절이에요.', '이 시기를 어떻게 쓸지 같이 봐요.'],
      houses: ['idle', '라그나에서 집을 차례로 세어 볼게요.', '서두르지 않아도 돼요.'],
      relation: ['thinking', '관계의 별을 볼 차례예요.', '일곱째 집이 편하게 여기는 거리를 짚어 볼게요.'],
      moneywork: ['idle', '일과 재물의 자리예요.', '열째 집과 둘째 집의 주인을 함께 볼게요.'],
      energy: ['comfort', '몸과 마음의 리듬이에요.', '지친 날에는 이 결부터 돌봐 주세요.'],
      deep: ['reveal', '여기는 심화 장이에요.', '차트의 근거를 한 겹 더 펼쳐 볼게요.'],
      close: ['comfort', '별의 계절은 돌고 돌아요.', '다음 계절이 궁금해지면 다시 들러요.']
    }
  };

  function sayEsc(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function sayKorean() {
    var lang = document.documentElement.lang || 'ko';
    try { lang = localStorage.getItem('cd_lang') || lang; } catch (_) {}
    return String(lang).toLowerCase().indexOf('ko') === 0;
  }
  function sayFill(text, vars) {
    var missing = false;
    var out = String(text).replace(/\{(\w+)\}/g, function (_, key) {
      var value = vars && vars[key];
      if (value == null || value === '') { missing = true; return ''; }
      return String(value);
    });
    return missing ? null : out;
  }
  /**
   * 마스터 말풍선 한 컷의 HTML. 한국어가 아니거나 문구가 없으면 ''.
   * @param {string} service ziwei|sukuyo|astrology|vedic
   * @param {string} key 장 키(sayLines 참고)
   * @param {{vars?: Object, side?: 'left'|'right'}} [options]
   */
  function say(service, key, options) {
    var table = sayLines[service];
    var line = table && table[key];
    var who = table && cast[table.character];
    if (!line || !who || !sayKorean()) return '';
    var opts = options || {};
    var lead = sayFill(line[1], opts.vars);
    var rest = sayFill(line[2], opts.vars);
    if (lead == null || rest == null) return '';
    var face = who.faces[line[0]] || who.faces.idle;
    var side = opts.side === 'right' ? 'right' : 'left';
    return '<figure class="cd-say cd-say--' + table.character + ' cd-say--' + side + '" data-cd-say="' + service + ':' + key + '" data-cd-korean-only>'
      + '<span class="cd-say__cut"><img class="cd-say__face" src="' + who.dir + face + '.webp" alt="" width="72" height="72" loading="lazy" decoding="async"></span>'
      + '<figcaption class="cd-say__bubble"><span class="cd-say__name">' + who.name + '</span>'
      + '<span class="cd-say__text"><strong>' + sayEsc(lead) + '</strong> ' + sayEsc(rest) + '</span></figcaption>'
      + '</figure>';
  }

  function refreshPrices(service) {
    var store = window.CodeDestinyFeaturePricingStore;
    var targets = document.querySelectorAll('[data-fc-price="' + service + '"]');
    if (!targets.length) return;
    function paint(price) {
      targets.forEach(function (target) { target.textContent = price && price.displayPrice || '결제창에서 확인'; });
    }
    if (!store || typeof store.getOrLoad !== 'function') { paint(null); return; }
    store.getOrLoad(service + '_ai_prompt_generator').then(paint).catch(function () { paint(null); });
  }

  function entry(service, formId) {
    var item = services[service];
    if (!item) return '';
    // DOM is mounted by the existing renderer in this turn; the store owns catalog caching.
    // Modal scenes load on render; Safari can leave lazy images pending inside a previously hidden overlay.
    window.setTimeout(function () { refreshPrices(service); }, 0);
    return '<section class="fc-entry" aria-label="' + item.name + '">'
      + '<figure class="fc-entry__scene"><img src="' + item.image + '" width="1200" height="675" loading="eager" decoding="async" alt="' + item.alt + '"><figcaption>' + item.basis + '</figcaption></figure>'
      + '<div class="fc-entry__copy"><h3>' + item.title + '</h3><p class="fc-entry__name">' + item.name + '</p><p class="fc-entry__lead">' + item.lead + '</p>'
      + '<ul class="fc-entry__topics">' + item.topics.map(function (topic) { return '<li>' + topic + '</li>'; }).join('') + '</ul>'
      + '<p class="fc-entry__price">단건 결제 <strong data-fc-price="' + service + '">가격 확인 중</strong><span>이용권·월정석은 결제창에서 확인</span></p>'
      + '<button type="button" class="fc-primary" data-fc-open="' + formId + '" aria-controls="' + formId + '" aria-expanded="false">상담 내용 살펴보기</button>'
      + '<p class="fc-entry__note">차트의 흐름과 선택의 가능성을 읽는 AI 상담입니다.</p></div></section>';
  }

  function formIntro(service, questionId) {
    var item = services[service];
    return '<div class="fc-form__intro"><h4>내 질문으로 이어지는 상담</h4><p>' + item.difference + '</p>'
      + '<dl><div><dt>상담의 바탕</dt><dd>' + item.basis + '</dd></div><div><dt>출생정보 확인</dt><dd>위 운세를 계산한 출생정보를 사용합니다. 정보가 다르면 위 입력에서 수정한 뒤 다시 계산해 주세요.</dd></div></dl>'
      + '<p>상황과 고민하는 선택을 함께 적으면, 질문의 초점을 더 잘 잡을 수 있어요.</p></div>'
      + '<div class="fc-examples" aria-label="질문 예시">' + item.examples.map(function (question, index) {
        return '<button type="button" data-fc-example="' + service + ':' + index + '" data-fc-question="' + questionId + '">질문 예시 ' + (index + 1) + '</button>';
      }).join('') + '</div>';
  }

  document.addEventListener('click', function (event) {
    var opener = event.target.closest('[data-fc-open]');
    if (opener) {
      var form = document.getElementById(opener.getAttribute('data-fc-open'));
      if (!form) return;
      form.open = true;
      opener.setAttribute('aria-expanded', 'true');
      form.scrollIntoView({ block: 'start', behavior: 'instant' });
      var question = form.querySelector('textarea:not([readonly])');
      if (question) question.focus({ preventScroll: true });
    }
    var example = event.target.closest('[data-fc-example]');
    if (example) {
      var parts = example.getAttribute('data-fc-example').split(':');
      var input = document.getElementById(example.getAttribute('data-fc-question'));
      if (!input || !services[parts[0]]) return;
      input.value = services[parts[0]].examples[Number(parts[1])];
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    }
  });
  document.addEventListener('toggle', function (event) {
    var form = event.target;
    if (!form.matches || !form.matches('.fc-form')) return;
    document.querySelectorAll('[data-fc-open="' + form.id + '"]').forEach(function (opener) {
      opener.setAttribute('aria-expanded', String(form.open));
    });
  }, true);
  window.CodeDestinyConsultationUI = { entry: entry, formIntro: formIntro, guide: guide, say: say, sayLines: sayLines };
})(window, document);

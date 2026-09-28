(function (window, document) {
  'use strict';

  // Presentation only. Existing composers retain payment, request and recovery ownership.
  var services = {
    ziwei: {
      name: '자미두수 궁성 상담', title: '열두 궁에 담긴,<br>나의 다음 선택',
      lead: '명궁의 기질부터 일과 관계의 자리까지. 지금의 고민을 명반 위에 놓고, 나에게 맞는 선택의 방향을 함께 읽어요.',
      basis: '명궁 · 관록궁 · 재백궁과 주요 별의 배치',
      difference: '무료 명반에서 본 별의 배치를, 지금 고민하는 선택과 연결해 풀어드립니다.',
      topics: ['일과 나의 역할', '사람 사이의 거리', '변화 앞의 선택'],
      examples: ['지금 하는 일을 계속할지, 새로운 역할을 시도할지 고민이에요. 제 강점과 주의할 점을 함께 봐주세요.', '관계에서 제 뜻을 너무 앞세우는 것 같아요. 제 성향에 맞는 소통 방법이 궁금해요.'],
      alt: '열두 궁의 별 지도를 펼쳐 삶의 선택을 살피는 꽃돼지 연이'
    },
    sukuyo: {
      name: '숙요점 달빛 상담', title: '마음의 리듬을 읽고,<br>인연의 간격을 찾다',
      lead: '나의 본명숙이 비추는 성향과 관계의 리듬. 반복되는 마음의 패턴을 살피고, 지금 필요한 한 걸음을 찾아요.',
      basis: '계산된 본명숙과 숙요 성향',
      difference: '무료 숙요 프로필의 성향 설명에서 한 걸음 더 나아가, 내가 겪는 상황에 맞춰 상담합니다.',
      topics: ['반복되는 마음', '관계의 속도', '나에게 맞는 선택'],
      examples: ['가까운 사람에게 마음을 쏟다가 지치는 일이 반복돼요. 제 성향과 편안한 관계의 간격을 봐주세요.', '새로운 일을 시작하려는데 마음이 자주 흔들려요. 제 강점을 살릴 방법을 알고 싶어요.'],
      alt: '달빛 아래 인연의 실과 본명숙 두루마리를 살피는 꽃돼지 연이'
    },
    astrology: {
      name: '서양 점성술 차트 상담', title: '별들의 배치에서,<br>나다운 방향을 찾다',
      lead: '태양과 달, 행성과 하우스가 보여주는 나의 여러 모습. 차트의 흐름을 지금의 질문과 연결해, 선택의 실마리를 읽어요.',
      basis: '출생 차트의 행성 · 하우스 · 주요 각도',
      difference: '무료 차트에서 확인한 배치가 일과 관계에서 어떻게 드러날 수 있는지, 질문을 중심으로 풀어드립니다.',
      topics: ['겉과 속의 성향', '일과 관계의 패턴', '선택의 실마리'],
      examples: ['하고 싶은 일과 주변의 기대가 달라 고민이에요. 제 차트에서 어떤 강점을 먼저 살려볼 수 있을까요?', '연애에서 자꾸 같은 갈등을 겪어요. 제 감정 표현과 관계 패턴을 함께 읽어주세요.'],
      alt: '천체 차트와 황동 관측 기구를 살피는 꽃돼지 연이'
    },
    vedic: {
      name: '베다 점성술 별빛 상담', title: '타고난 별의 결,<br>지금의 시간을 읽다',
      lead: '라시와 나크샤트라가 비추는 기질, 다샤가 보여주는 긴 시간의 흐름. 지금의 고민에 맞춰 내 삶의 리듬을 살펴요.',
      basis: '라시 · 나크샤트라 · 계산된 다샤 흐름',
      difference: '무료 차트의 별자리와 시기 정보를 질문에 연결해, 준비할 일과 살펴볼 선택을 함께 정리합니다.',
      topics: ['나의 기본 기질', '시간의 큰 흐름', '지금의 준비'],
      examples: ['진로를 바꾸고 싶은데 준비가 충분한지 고민이에요. 지금의 다샤 흐름과 제 성향을 함께 봐주세요.', '관계에서 비슷한 감정이 반복돼요. 제 나크샤트라의 성향과 대화에서 살펴볼 점이 궁금해요.'],
      alt: '인도의 천문 관측 뜰에서 별 지도와 시간의 흐름을 읽는 꽃돼지 연이'
    }
  };

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
    window.setTimeout(function () { refreshPrices(service); }, 0);
    return '<section class="fc-entry" aria-label="' + item.name + '">'
      + '<picture class="fc-entry__scene"><source media="(max-width: 759px)" srcset="/images/consultation/' + service + '-yeoni-entry-v1-640.webp">'
      + '<img src="/images/consultation/' + service + '-yeoni-entry-v1-1280.webp" width="1280" height="853" loading="lazy" decoding="async" alt="' + item.alt + '"></picture>'
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
  window.CodeDestinyConsultationUI = { entry: entry, formIntro: formIntro };
})(window, document);

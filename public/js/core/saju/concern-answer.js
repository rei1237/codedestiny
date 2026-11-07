/* 무료 만세력 결과의 고민 답과 제안 순서.
   고른 고민의 짧은 답 → 그 고민의 단건 카드 → 사주 전체 풀이 묶음(#sajuBundleOffer) 순서로 놓는다.
   - resolveConcern(): 주소 ?concern= → sessionStorage 'cd:home-concern' 순. 허용 목록(생성 파일의 고민 5개) 밖이면 null.
   - buildAnswer(concern, {ygd, yEv, gaeun}): 올해 흐름 라벨 · 고민 분야 첫 문장 · 연결 문장 3줄. 고민이 없으면 lifestyle 기준 일반 답.
   - render(host, ctx): host 를 채우고 #sajuBundleOffer 를 맨 끝으로 옮긴다. 묶음 안내 내용은 bundle-offer.js 가 그린다.
   문구는 아래 COPY 가 기본값이고(정본 lib/cms/home-copy.mjs 의 concern-offer 와 테스트가 대조), 관리자 수정값은
   scripts/apply-home-copy.mjs 가 셸에 싣는 <script type="application/json" id="cdConcernCopy"> 로만 들어온다. {label} {stem} 은 런타임이 채운다.
   번역된 로케일은 번역을 우선한다. 가격·분야·환불 한 줄은 js/core/saju/concern-offers.generated.js(정본 lib/marketing/home-concerns.mjs,
   worker/lib/paid-feature-registry.js)에서만 읽는다. 단건 카드는 상세 페이지로 가는 링크일 뿐 결제를 직접 부르지 않는다. */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'cd:home-concern';
  var GENERAL_FIELD = 'lifestyle';
  var BUNDLE_HOST_ID = 'sajuBundleOffer';
  var COPY_SCRIPT_ID = 'cdConcernCopy';

  var COPY = {
    'flow-with-stem': "올해 들어오는 {stem} 기운을 내 사주와 맞춰 보면 '{label}' 쪽으로 읽혀요.",
    'flow': "올해 기운을 내 사주와 맞춰 보면 '{label}' 쪽으로 읽혀요.",
    'flow-plain': '올해 기운을 내 사주와 차분히 맞춰 봤어요.',
    'field-plain': '서두르기보다 지금 할 수 있는 작은 일부터 살펴보세요.',
    'bridge': '{label} 고민을 한 번 더 자세히 짚어 보고 싶다면 아래 풀이가 이어서 도와줄 수 있어요.',
    'bridge-plain': '더 궁금한 고민이 있다면 아래에서 이어서 읽어 볼 수 있어요.',
    'answer-title': '{label} 고민에 대한 짧은 답',
    'answer-title-plain': '올해 흐름에 대한 짧은 답',
    'offer-title': '{label} 고민만 자세히 보기',
    'offer-cta': '풀이 내용 먼저 보기'
  };

  // 관리자 수정값. COPY 에 없는 키·문자열이 아닌 값·빈 값은 버리고, JSON 이 깨지면 기본 문구를 쓴다.
  function readOverrides() {
    var out = {};
    try {
      var node = root.document && root.document.getElementById(COPY_SCRIPT_ID);
      var parsed = node ? JSON.parse(node.textContent || '{}') : null;
      if (parsed && typeof parsed === 'object') {
        Object.keys(parsed).forEach(function (key) {
          if (Object.prototype.hasOwnProperty.call(COPY, key) && typeof parsed[key] === 'string' && parsed[key].trim()) out[key] = parsed[key];
        });
      }
    } catch (_e) { /* 깨진 JSON: 기본 문구 */ }
    return out;
  }

  function copy(key, vars) {
    var overrides = readOverrides();
    var template = Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : COPY[key];
    return String(template).replace(/\{(label|stem)\}/g, function (_m, name) { return vars && vars[name] != null ? String(vars[name]) : ''; });
  }

  function t(key, fallback, vars) {
    try {
      if (typeof root.cdTranslate === 'function') {
        var value = root.cdTranslate(key, vars || {}, fallback);
        if (value && value !== key) return String(value);
      }
    } catch (_e) { /* 번역이 없으면 한국어 원문 */ }
    return fallback;
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function offers() {
    var data = root.CdConcernOffers;
    return data && data.concerns ? data : null;
  }

  function allowed(value) {
    var data = offers();
    if (!data || typeof value !== 'string') return null;
    var id = value.trim();
    return id && Object.prototype.hasOwnProperty.call(data.concerns, id) ? id : null;
  }

  function resolveConcern() {
    var fromUrl = null;
    try { fromUrl = new URLSearchParams(root.location.search || '').get('concern'); } catch (_e) { /* 주소를 못 읽으면 저장값으로 */ }
    var id = allowed(fromUrl);
    if (id) return id;
    var stored = null;
    try { stored = root.sessionStorage.getItem(STORAGE_KEY); } catch (_e) { /* 사생활 보호 모드: 일반 답 */ }
    return allowed(stored);
  }

  // 엔진 라벨(예: "🌟 최고의 운")에서 아이콘을 떼고 과장 표현을 부드럽게 바꾼다.
  function softLabel(label) {
    return String(label || '')
      .replace(/^[^0-9A-Za-zㄱ-ㆎ가-힣]+/, '')
      .replace(/최고의\s*운/g, '아주 좋은 운')
      .replace(/역경\s*운/g, '숨 고르는 운')
      .trim();
  }

  function firstSentence(text) {
    var value = String(text || '').trim();
    var match = value.match(/^[\s\S]*?[.!?。](?=\s|$)/);
    return (match ? match[0] : value).trim();
  }

  function buildAnswer(concern, ctx) {
    var data = offers();
    var id = allowed(concern);
    var item = id && data ? data.concerns[id] : null;
    var field = item && item.sajuField ? item.sajuField : GENERAL_FIELD;
    var context = ctx || {};
    var label = softLabel(context.yEv && context.yEv.label);
    var stem = context.ygd && context.ygd.n && context.ygd.n !== '?' ? String(context.ygd.n) : '';
    var first = label
      ? (stem
        ? t('saju.concernAnswer.flowWithStem', copy('flow-with-stem', { stem: stem, label: label }), { stem: stem, label: label })
        : t('saju.concernAnswer.flow', copy('flow', { label: label }), { label: label }))
      : t('saju.concernAnswer.flowPlain', copy('flow-plain'));
    var second = firstSentence(context.gaeun && context.gaeun[field]) || t('saju.concernAnswer.fieldPlain', copy('field-plain'));
    var third = item
      ? t('saju.concernAnswer.bridge', copy('bridge', { label: item.label }), { label: item.label })
      : t('saju.concernAnswer.bridgePlain', copy('bridge-plain'));
    return { lines: [first, second, third] };
  }

  var STYLE_ID = 'cdConcernAnswerStyle';
  function ensureStyle() {
    var doc = root.document;
    if (!doc || doc.getElementById(STYLE_ID) || !doc.head) return;
    var style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = '#sajuConcernAnswer{margin:14px 0 0}'
      + '.concern-answer{margin:0 0 12px;padding:14px;border-radius:14px;background:rgba(255,255,255,.72);color:#1f1b2d;border:1px solid rgba(187,163,113,.4)}'
      + '.concern-answer__title{margin:0 0 6px;font-size:.98rem}'
      + '.concern-answer__line{margin:0 0 6px;font-size:.88rem;line-height:1.65;word-break:keep-all}.concern-answer__line:last-child{margin:0}'
      + '.concern-offer{margin:0 0 12px;padding:14px;border-radius:14px;background:#fff;color:#1f1b2d;border:1px solid rgba(139,92,246,.35)}'
      + '.concern-offer__title{margin:0 0 4px;font-size:.98rem}'
      + '.concern-offer__price{margin:0 0 10px;font-size:.88rem}.concern-offer__price strong{font-size:1.05rem}'
      + '.concern-offer__cta{display:flex;align-items:center;justify-content:center;min-height:44px;border-radius:10px;font-weight:800;font-size:.9rem;text-decoration:none;background:linear-gradient(90deg,#c4b5fd,#8b5cf6);color:#fff}'
      + '.concern-offer__refund{margin:8px 0 0;font-size:.8rem;line-height:1.5;color:#4b4560;word-break:keep-all}.concern-offer__refund a{color:inherit}';
    doc.head.appendChild(style);
  }

  function answerHtml(concern, answer) {
    var data = offers();
    var item = concern && data ? data.concerns[concern] : null;
    var title = item
      ? t('saju.concernAnswer.title', copy('answer-title', { label: item.label }), { label: item.label })
      : t('saju.concernAnswer.titlePlain', copy('answer-title-plain'));
    return '<h3 class="concern-answer__title">' + esc(title) + '</h3>'
      + answer.lines.map(function (line) { return '<p class="concern-answer__line">' + esc(line) + '</p>'; }).join('');
  }

  function offerHtml(item, refund) {
    var price = item.priceLabel ? '<p class="concern-offer__price"><strong>' + esc(item.priceLabel) + '</strong> · ' + esc(t('saju.concernOffer.once', '한 번 결제')) + '</p>' : '';
    var refundHtml = refund && refund.line
      ? '<p class="concern-offer__refund">' + esc(t('saju.concernOffer.refund', refund.line))
        + (refund.href ? ' <a href="' + esc(refund.href) + '">' + esc(t('saju.concernOffer.refundLink', '환불 기준')) + '</a>' : '') + '</p>'
      : '';
    return '<h3 class="concern-offer__title">' + esc(t('saju.concernOffer.title', copy('offer-title', { label: item.label }), { label: item.label })) + '</h3>'
      + price
      + '<a class="concern-offer__cta" href="' + esc(item.href) + '">' + esc(t('saju.concernOffer.cta', copy('offer-cta'))) + '</a>'
      + refundHtml;
  }

  function render(host, ctx) {
    var doc = root.document;
    if (!host || !doc) return;
    ensureStyle();
    var concern = resolveConcern();
    var data = offers();
    var item = concern && data ? data.concerns[concern] : null;

    var answer = host.querySelector(':scope > .concern-answer') || doc.createElement('section');
    answer.className = 'concern-answer';
    answer.innerHTML = answerHtml(concern, buildAnswer(concern, ctx));
    host.insertBefore(answer, host.firstChild);

    var offer = host.querySelector(':scope > .concern-offer');
    if (item && item.href) {
      if (!offer) offer = doc.createElement('section');
      offer.className = 'concern-offer';
      offer.setAttribute('data-feature-key', item.featureKey);
      offer.setAttribute('data-concern', concern);
      offer.innerHTML = offerHtml(item, data.refund);
      host.insertBefore(offer, answer.nextSibling);
    } else if (offer && offer.parentNode) {
      offer.parentNode.removeChild(offer);
    }

    // 묶음 안내는 고민 답과 단건 다음이다. 자리만 옮기고 내용은 bundle-offer.js 가 그린다.
    var bundleHost = doc.getElementById(BUNDLE_HOST_ID);
    if (bundleHost) host.appendChild(bundleHost);
    host.hidden = false;
  }

  root.CdConcernAnswer = {
    resolveConcern: resolveConcern,
    buildAnswer: buildAnswer,
    render: render,
    COPY: COPY
  };
})(typeof window !== 'undefined' ? window : globalThis);

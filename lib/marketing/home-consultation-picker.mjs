import {HOME_CONCERN_GROUPS, concernServices} from './yehwa-home.mjs';
import {RECORD_SERVICES} from '../records/service-registry.js';
import {consultationStories} from '../brand/consultation-stories.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const questionPurposes = {love:['love'],reunion:['love'],marriage:['love','compatibility'],money:['money'],career:['career'],future:['life'],self:['self'],people:['love','compatibility']};
const canonical = href => new URL(href, 'https://code-destiny.com').pathname.replace(/\/$/, '');

// Display-only union of the two existing entry lists. Destination actions and
// price strings are supplied by the existing catalogue and pricing renderers.
export function renderHomeConsultationPicker({catalog, products, intros, categories}) {
  const cards = new Map();
  function add(item) {
    const key = item.featureKey || item.id || canonical(item.href);
    const existing = cards.get(key);
    if (existing) {
      existing.purposes = [...new Set([...existing.purposes, ...item.purposes])];
      existing.topics = [...new Set([...existing.topics, ...(item.topics || [])])];
      for (const question of item.questions || []) {
        if (!existing.questions.some(q => q.id === question.id)) existing.questions.push(question);
      }
    } else cards.set(key, {...item, topics:item.topics || [], questions:item.questions || []});
  }
  function registry(item) {
    return catalog.find(row => item.featureKey && row.featureKey === item.featureKey)
      || catalog.find(row => canonical(row.href || '/?action=' + row.action) === canonical(item.href) && canonical(item.href) !== '');
  }
  for (const item of intros) {
    const row = registry(item);
    add({...item, placement:'intro', action:row?.action, cta:item.action, name:item.title, desc:item.desc, price:item.priceLabel || row?.price || '', featureKey:item.featureKey || row?.featureKey,
      purposes:row?.purposes || ['love','money','career','self','life','family'], format:row?.resultFormat || ''});
  }
  for (const product of products) {
    const row = registry(product);
    add({...product, placement:'signature', name:product.title, desc:product.question, price:product.priceLabel,
      purposes:row?.purposes || [], format:product.resultFormat || row?.resultFormat || ''});
  }
  for (const category of categories) for (const question of category.questions) {
    const row = registry({...question,featureKey:question.key});
    add({id:row?.id || question.id, featureKey:question.key, href:question.href, name:question.b,
      desc:row?.desc || question.t, image:row?.image || category.img + '-400.webp',
      price:question.priceLabel, from:question.price.startsWith('from'), purposes:questionPurposes[category.id],
      format:row?.resultFormat || '', topics:[category.id], questions:[question]});
  }
  // Keep every item previously shown by the five broad concern groups too.
  for (const group of HOME_CONCERN_GROUPS) for (const row of concernServices(catalog, group)) {
    add({...row, placement:'catalog', href:row.href || '/?action=' + row.action, purposes:row.purposes || [], format:row.resultFormat || ''});
  }
  const values = [...cards.values()];
  const groupsFor = item => HOME_CONCERN_GROUPS.filter(group=>group.purposes.some(p=>item.purposes.includes(p))).map(group=>group.id);
  let firstVisible = 0;
  let pinnedMarkup = '';
  let fusionMarkup = '';
  const markup = values.map(item => {
    const story = RECORD_SERVICES.find(service=>service.href===item.href && consultationStories[service.id]);
    const groups = groupsFor(item), visible = groups.includes('love') && firstVisible++ < 3;
    const priceAttrs = item.featureKey ? ` data-cd-price-key="${escape(item.featureKey)}"${['signature','catalog'].includes(item.placement) ? ` data-feature-key="${escape(item.featureKey)}" ${item.id==='heukwol'?'':' data-pvw-paid="true"'}` : ''}` : item.price === '무료 시작' || item.price === '무료' ? ' data-cd-price-free="true"' : '';
    const questionMarkup = item.questions.map(question=>`<li><a href="${escape(question.href)}" data-cd-question="${question.id}"${question.key ? ` data-cd-price-key="${escape(question.key)}"` : ' data-cd-price-free="true"'}${question.price.startsWith('from') ? ' data-price-from="true"' : ''}><span data-cd-trans="home.concernPick.q.${question.id}.t">${escape(question.t)}</span><span aria-hidden="true">→</span></a>${question.alt ? `<a href="${escape(question.alt.href)}" data-cd-question="${question.id}" data-cd-question-alt data-cd-price-free><span data-cd-trans="home.concernPick.q.${question.id}.alt">${escape(question.alt.name)}</span><span aria-hidden="true">→</span></a>` : ''}</li>`).join('');
    const cardMarkup = `<article class="cd-picker-card" data-picker-card data-picker-groups="${groups.join(' ')}" data-picker-topics="${item.topics.join(' ')}"${visible?'':' hidden'}>
      <a class="cd-picker-main" href="${escape(item.href)}" data-picker-service-id="${escape(item.id)}"${item.placement==='signature' ? ` data-cd-service-id="${escape(item.id)}"` : item.placement==='intro' ? ` data-cd-signature-id="${escape(item.id)}"` : ''}${item.id==='yeongnyangi-question' ? ' data-cd-portal-placement="home_hero"' : ''}${priceAttrs}${item.action ? ` data-action="${escape(item.action)}"` : ''}${item.popupCopy ? ` data-cd-popup-copy="${escape(item.popupCopy)}"` : ''}>
        ${['intro','signature'].includes(item.placement) ? '<span class="cd-yehwa-seal" aria-hidden="true"></span>' : ''}${item.image ? `<img src="${escape(item.id==='fusion-fortune'?item.image.replace('-640.webp','-320.webp'):item.image)}" width="${item.id==='fusion-fortune'?320:640}" height="${item.id==='fusion-fortune'?213:item.id==='heukwol'?427:360}"${item.id==='heukwol'?' srcset="/images/service-introductions/heukwol-320.webp 320w, /images/service-introductions/heukwol-640.webp 640w" sizes="(max-width: 600px) 100vw, 40vw"':''} alt="" loading="lazy" decoding="async">` : ''}
        <div class="cd-picker-copy"><h3${item.id==='heukwol'?' data-cd-trans="home.moonlit.heukwolTitle"':''}>${escape(item.name)}</h3><p>${escape(item.desc)}</p>${item.format ? `<p class="cd-picker-format">${escape(item.format)}</p>` : ''}<div class="cd-picker-foot"><span class="cd-sig-card__price"${item.featureKey ? ` data-cd-play-price data-cd-play-feature="${escape(item.featureKey)}"` : ''}${item.priceSuffix || item.from ? ' data-cd-play-kind="from" data-price-from="true"' : ''}>${escape(item.price)}</span><span class="cd-picker-action"><span${item.id==='heukwol'?' data-cd-trans="home.moonlit.heukwolCta"':''}>${escape(item.cta || (item.action && !item.href.startsWith('/') ? item.action : '상담 살펴보기'))}</span> <span aria-hidden="true">→</span></span></div></div>
      </a>${story ? `<a class="cd-picker-story" href="/consultations/${story.id}/"><span>웹툰으로 알아보기</span><span aria-hidden="true">→</span></a>` : ''}${questionMarkup ? `<ul class="cd-picker-questions">${questionMarkup}</ul>` : ''}
    </article>`;
    if (item.id === 'fusion-fortune') {
      fusionMarkup = cardMarkup.replace(' hidden', '').replace('data-picker-card', 'data-picker-fusion-featured');
      return '';
    }
    if (item.id === 'heukwol') {
      pinnedMarkup = cardMarkup.replace(' hidden', '').replace('data-picker-card', 'data-picker-featured');
      return '';
    }
    return cardMarkup;
  }).join('');
  const letterProducts = products.filter(item => item.id !== 'heukwol');
  const letterMarkup = `<dialog class="cd-consult-letter cd-signature-popup" id="cdSignatureConsultPopup" data-signature-letter data-cd-no-trans data-cd-korean-only lang="ko" aria-labelledby="cdSignaturePopupTitle" aria-describedby="cdSignaturePopupIntro">
    <div class="cd-consult-letter__frame">
    <header class="cd-consult-letter__head"><img src="/images/home/mv/ornament-lotus-crest-160.webp" width="80" height="29" alt="" aria-hidden="true"><div><h2 id="cdSignaturePopupTitle">지금 마음에 닿을 상담</h2><p id="cdSignaturePopupIntro">달빛 아래 편지를 넘기듯, 한 편씩 천천히 살펴보세요.</p></div><button type="button" class="cd-consult-letter__close" data-signature-letter-close aria-label="상담 편지 닫기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
    <div class="cd-consult-letter__stage" data-signature-letter-stage tabindex="0" aria-live="polite">
      ${letterProducts.map((item, index) => `<article class="cd-consult-letter__slide" data-signature-letter-slide data-cd-service="${escape(item.id)}"${index ? ' hidden' : ''}>
        <div class="cd-consult-letter__visual"><div class="cd-consult-letter__portrait"><img src="${escape(item.image)}"${item.imageSrcset ? ` srcset="${escape(item.imageSrcset)}" sizes="(max-width: 699px) 220px, 300px"` : ''} width="640" height="427" alt="${escape(item.imageAlt || item.title)}" loading="lazy" decoding="async"></div><span>당신을 위한 달빛 상담</span></div>
        <div class="cd-consult-letter__copy"><h3>${escape(item.title)}</h3><p class="cd-consult-letter__description">${escape(item.popupCopy || item.question)}</p>
          <dl><dt>이런 마음에 잘 맞아요</dt><dd>${escape(item.question)}</dd></dl>
          <p class="cd-consult-letter__result"><span>받는 결과</span>${escape(item.resultFormat)}</p>
          <div class="cd-consult-letter__action"><span class="cd-consult-letter__price" data-cd-play-price data-cd-play-feature="${escape(item.featureKey)}">${escape(item.priceLabel)}</span><a href="${escape(item.href)}" data-feature-key="${escape(item.featureKey)}" data-cd-price-key="${escape(item.featureKey)}" data-pvw-paid="true" aria-label="${escape(item.title)} — ${escape(item.cta)}">${escape(item.cta)}<span aria-hidden="true">→</span></a></div>
        </div>
      </article>`).join('')}
    </div>
    <footer class="cd-consult-letter__footer"><nav class="cd-consult-letter__controls" aria-label="대표 상담 이동">
      <button type="button" data-signature-letter-prev aria-label="이전 상담"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg><span>이전 상담</span></button>
      <div class="cd-consult-letter__position"><span class="cd-consult-letter__dots">${letterProducts.map((item, index) => `<button type="button" data-signature-letter-dot="${index}" aria-label="${escape(item.title)} 보기" aria-pressed="${index === 0}"></button>`).join('')}</span><span data-signature-letter-position>1 / ${letterProducts.length}</span></div>
      <button type="button" data-signature-letter-next aria-label="다음 상담"><span>다음 상담</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button>
    </nav><button type="button" class="cd-consult-letter__today" data-signature-letter-today>오늘은 그만 보기<span>한국 시간 자정까지</span></button></footer>
    </div>
  </dialog>`;
  return `<section class="cd-sig cd-choice cd-choice--unified yh-find" id="cdSignatureConsult" aria-labelledby="cdSignatureTitle" data-cd-funnel-section="signature_consult">
    <img class="cd-choice__branch cd-choice__branch--left" src="/images/home/mv/ornament-lotus-branch-640.webp" width="320" height="280" alt="" loading="lazy"><img class="cd-choice__branch cd-choice__branch--right" src="/images/home/mv/ornament-lotus-branch-640.webp" width="320" height="280" alt="" loading="lazy">
    <header class="cd-sig__head"><img class="cd-choice__crest" src="/images/home/mv/ornament-lotus-crest-320.webp" width="160" height="58" alt="" loading="lazy"><h2 class="cd-sig__title" id="cdSignatureTitle">지금 마음에 필요한 상담을 한 편씩 만나보세요</h2><p class="cd-sig__sub" data-cd-trans="home.typographyPicker.lead">서두르지 말고, 각 상담이 어떤 고민을 다루고 무엇을 전해 주는지 읽어 본 뒤 선택해 보세요.</p><button type="button" class="cd-signature-open" data-signature-open data-cd-no-trans data-cd-korean-only aria-haspopup="dialog" aria-controls="cdSignatureConsultPopup"><span>달빛 상담 편지 열어보기</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5 12 13l8-5.5M5 5h14a1 1 0 0 1 1 1v12H4V6a1 1 0 0 1 1-1Z"/></svg></button></header>
    ${letterMarkup}
    <div class="cd-signature-featured">${pinnedMarkup}</div>
    <div id="homeConcerns" data-yh-target="0"><div id="cdConcernPick"><span id="yhConcernTitle" class="sr-only">고민으로 찾기</span><span id="cdhQuestionSlot"></span><span id="cdhOtherFortunesTitle"></span><div class="cd-picker-tabs" role="group" aria-labelledby="yhConcernTitle">${[...HOME_CONCERN_GROUPS,{id:'all',label:'전체 상담'}].map(group=>`<button type="button" data-yh-concern="${group.id}" aria-pressed="${group.id==='love'}" aria-controls="yhResults"${group.id==='all'?' data-cd-trans="home.typographyPicker.allConsultations"':''}>${group.label}</button>`).join('')}</div>
    <div class="cd-picker-topics" data-picker-topics role="group" aria-label="구체적인 고민" data-cd-trans-attr="aria-label:home.typographyPicker.specific"><button type="button" data-picker-topic="all" data-cd-trans="home.typographyPicker.all" aria-pressed="true" aria-controls="yhResults">모두</button>${categories.map(category=>{const group=HOME_CONCERN_GROUPS.find(row=>row.purposes.some(p=>questionPurposes[category.id].includes(p)))?.id;return `<span id="cdConcernPanel${category.id[0].toUpperCase()+category.id.slice(1)}" data-picker-fragment="${category.id}" data-picker-fragment-group="${group}" aria-hidden="true"></span><button type="button" data-picker-topic="${category.id}" data-cd-trans="home.concernPick.${category.id}" data-picker-topic-group="${group}" aria-pressed="false" aria-controls="yhResults"${group==='love'?'':' hidden'}>${escape(category.label)}</button>`;}).join('')}</div>
    <section id="yhResults" aria-labelledby="yhResultTitle" data-yh-target="1"><div class="cd-picker-heading"><h3 id="yhResultTitle" data-cd-trans="home.typographyPicker.compare">상담 비교하기</h3><span data-yh-selection role="status">연애·관계</span></div><div class="cd-picker-grid" id="cdSigGrid">${markup}</div>${fusionMarkup}<button class="cd-picker-more" type="button" data-picker-more data-cd-trans="home.typographyPicker.more" aria-expanded="false" aria-controls="cdSigGrid">관련 상담 더 보기</button></section></div></div>
    <div class="cd-picker-links"><a href="/consultation-samples/"><span data-cd-trans="home.guideCopy.signatureSamples">상담별 구성과 예시 보기</span><span aria-hidden="true">→</span></a><button type="button" class="yh-guide-open" data-yh-start><span data-cd-trans="home.yehwa.tour">연이와 함께 둘러보기</span><span aria-hidden="true">→</span></button></div>
  </section>`;
}

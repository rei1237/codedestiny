import {HOME_CONCERN_GROUPS, concernServices} from './yehwa-home.mjs';

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
  const markup = values.map(item => {
    const groups = groupsFor(item), visible = groups.includes('love') && firstVisible++ < 3;
    const priceAttrs = item.featureKey ? ` data-cd-price-key="${escape(item.featureKey)}"${['signature','catalog'].includes(item.placement) ? ` data-feature-key="${escape(item.featureKey)}" data-pvw-paid="true"` : ''}` : item.price === '무료 시작' || item.price === '무료' ? ' data-cd-price-free="true"' : '';
    const questionMarkup = item.questions.map(question=>`<li><a href="${escape(question.href)}" data-cd-question="${question.id}"${question.key ? ` data-cd-price-key="${escape(question.key)}"` : ' data-cd-price-free="true"'}${question.price.startsWith('from') ? ' data-price-from="true"' : ''}><span>${escape(question.t)}</span><span aria-hidden="true">→</span></a>${question.alt ? `<a href="${escape(question.alt.href)}" data-cd-question="${question.id}" data-cd-question-alt data-cd-price-free>${escape(question.alt.name)} →</a>` : ''}</li>`).join('');
    return `<article class="cd-picker-card" data-picker-card data-picker-groups="${groups.join(' ')}" data-picker-topics="${item.topics.join(' ')}"${visible?'':' hidden'}>
      <a class="cd-picker-main" href="${escape(item.href)}" data-picker-service-id="${escape(item.id)}"${item.placement==='signature' ? ` data-cd-service-id="${escape(item.id)}"` : item.placement==='intro' ? ` data-cd-signature-id="${escape(item.id)}"` : ''}${item.id==='yeongnyangi-question' ? ' data-cd-portal-placement="home_hero"' : ''}${priceAttrs}${item.action ? ` data-action="${escape(item.action)}"` : ''}${item.popupCopy ? ` data-cd-popup-copy="${escape(item.popupCopy)}"` : ''}>
        ${item.image ? `<img src="${escape(item.image)}" width="640" height="360" alt="" loading="lazy" decoding="async">` : ''}
        <div class="cd-picker-copy"><h3>${escape(item.name)}</h3><p>${escape(item.desc)}</p>${item.format ? `<p class="cd-picker-format">${escape(item.format)}</p>` : ''}<div class="cd-picker-foot"><span class="cd-sig-card__price"${item.featureKey ? ` data-cd-play-price data-cd-play-feature="${escape(item.featureKey)}"` : ''}${item.priceSuffix || item.from ? ' data-cd-play-kind="from" data-price-from="true"' : ''}>${escape(item.price)}</span><span class="cd-picker-action">${escape(item.cta || (item.action && !item.href.startsWith('/') ? item.action : '상담 살펴보기'))} <span aria-hidden="true">→</span></span></div></div>
      </a>${questionMarkup ? `<ul class="cd-picker-questions">${questionMarkup}</ul>` : ''}
    </article>`;
  }).join('');
  return `<section class="cd-sig cd-choice cd-choice--unified yh-find" id="cdSignatureConsult" aria-labelledby="cdSignatureTitle" data-cd-funnel-section="signature_consult">
    <img class="cd-choice__branch cd-choice__branch--left" src="/images/home/mv/ornament-lotus-branch-640.webp" width="320" height="280" alt="" loading="lazy"><img class="cd-choice__branch cd-choice__branch--right" src="/images/home/mv/ornament-lotus-branch-640.webp" width="320" height="280" alt="" loading="lazy">
    <header class="cd-sig__head"><img class="cd-choice__crest" src="/images/home/mv/ornament-lotus-crest-320.webp" width="160" height="58" alt="" loading="lazy"><h2 id="cdSignatureTitle">지금 필요한 상담을 골라보세요</h2><p class="cd-sig__sub">마음에 남은 고민을 고르고, 상담 방식과 받을 결과를 비교해 보세요.</p></header>
    <div id="homeConcerns" data-yh-target="0"><div id="cdConcernPick"><span id="yhConcernTitle" class="sr-only">고민으로 찾기</span><span id="cdhQuestionSlot"></span><span id="cdhOtherFortunesTitle"></span><div class="cd-picker-tabs" role="group" aria-labelledby="yhConcernTitle">${[...HOME_CONCERN_GROUPS,{id:'all',label:'전체 상담'}].map(group=>`<button type="button" data-yh-concern="${group.id}" aria-pressed="${group.id==='love'}" aria-controls="yhResults">${group.label}</button>`).join('')}</div>
    <div class="cd-picker-topics" data-picker-topics role="group" aria-label="구체적인 고민"><button type="button" data-picker-topic="all" aria-pressed="true" aria-controls="yhResults">모두</button>${categories.map(category=>{const group=HOME_CONCERN_GROUPS.find(row=>row.purposes.some(p=>questionPurposes[category.id].includes(p)))?.id;return `<span id="cdConcernPanel${category.id[0].toUpperCase()+category.id.slice(1)}" data-picker-fragment="${category.id}" data-picker-fragment-group="${group}" aria-hidden="true"></span><button type="button" data-picker-topic="${category.id}" data-picker-topic-group="${group}" aria-pressed="false" aria-controls="yhResults"${group==='love'?'':' hidden'}>${escape(category.label)}</button>`;}).join('')}</div>
    <section id="yhResults" aria-labelledby="yhResultTitle" data-yh-target="1"><div class="cd-picker-heading"><h3 id="yhResultTitle">상담 비교하기</h3><span data-yh-selection role="status">연애·관계</span></div><div class="cd-picker-grid" id="cdSigGrid">${markup}</div><button class="cd-picker-more" type="button" data-picker-more aria-expanded="false" aria-controls="cdSigGrid">관련 상담 더 보기</button></section></div></div>
    <div class="cd-picker-links"><a href="/consultation-samples/">상담별 구성과 예시 보기 →</a><button type="button" class="yh-guide-open" data-yh-start>연이와 함께 둘러보기 →</button></div>
  </section>`;
}

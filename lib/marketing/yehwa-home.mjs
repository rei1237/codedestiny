// Presentation groups only. The original registry retains every tag and entry.
export const HOME_CONCERN_GROUPS = [
  { id: 'love', label: '연애·관계', purposes: ['love', 'compatibility'] },
  { id: 'work', label: '돈·일', purposes: ['money', 'career'] },
  { id: 'self', label: '나의 성향', purposes: ['self'] },
  { id: 'flow', label: '앞으로의 흐름', purposes: ['today', 'life'] },
  { id: 'family', label: '가족·생활', purposes: ['family'] },
];
import { SAJU_BUNDLE_DECISION_FACTS } from './decision-facts.mjs';
import { trustRecordCopy } from './trust-record.mjs';
import { hc } from './home-card-copy.mjs';
import { FREE_PROMO_FEATURED, freePromoItemHref } from './free-promo.mjs';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function concernServices(catalog, group) {
  return catalog.filter(item => group.purposes.some(tag => item.purposes?.includes(tag))).slice(0, 3);
}
// 2026-11-16 상황형 첫 화면: 카드마다 질문 1·결과 1·버튼 1. 목적지·가격은 기존 카탈로그에서만 읽는다.
// 한국어 화면 전용이다(다른 언어는 바로 아래 무료 카드가 같은 진입을 번역해 보여 준다).
// 2026-11-18 카드 공통 규격: 아트(고정 비율)·상태 배지·제목·한 줄 설명·받는 결과·CTA. 문구는 home-card-copy.mjs.
// ① 지금 무료로 시작(무료 2장, 첫 장이 대표) → ② 더 깊이 보기(유료 흑월 + 아래 라이트 사주).
const SITUATIONS = [
  { promo: 'natal', block: 'free', featured: true },
  { promo: 'tarot', block: 'free' },
  { service: 'heukwol', block: 'paid' },
];
export function renderSituationCards(catalog) {
  const rows = SITUATIONS.map(row => {
    const id = row.promo || row.service;
    const copy = { title: hc(`homeCards.${id}.title`), desc: hc(`homeCards.${id}.desc`), cta: hc(`homeCards.${id}.cta`) };
    if (row.promo) {
      const item = FREE_PROMO_FEATURED.find(entry => entry.id === row.promo);
      if (!item?.action) throw new Error(`Missing free promo entry: ${row.promo}`);
      return { ...row, ...copy, result: hc(`homeCards.${id}.result`), href: freePromoItemHref(item), action: item.action, serviceId: item.serviceId, image: item.image, imgW: 160, imgH: 160 };
    }
    const item = catalog.find(entry => entry.id === row.service);
    if (!item?.href || !item.featureKey || !/^\d[\d,]*원$/.test(item.price || '') || !item.resultFormat) throw new Error(`Missing paid situation entry: ${row.service}`);
    return { ...row, ...copy, result: item.resultFormat, href: item.href, serviceId: item.id, image: item.image, imgW: 320, imgH: 213, featureKey: item.featureKey, price: item.price };
  });
  const card = (row, index) => `<li class="yh-situation ${row.price ? 'yh-situation--paid' : 'yh-situation--free'}${row.featured ? ' yh-situation--featured' : ''}"><div class="yh-situation__art-wrap"><img class="yh-situation__art" src="${escape(row.image)}" width="${row.imgW}" height="${row.imgH}" alt="" ${index === 0 ? '' : 'loading="lazy" '}decoding="async"><span class="yh-badge ${row.price ? 'yh-badge--paid' : 'yh-badge--free'}">${escape(hc(row.price ? 'homeCards.badge.paid' : 'homeCards.badge.free'))}</span>${row.featured ? `<span class="yh-badge yh-badge--pick">${escape(hc('homeCards.badge.pick'))}</span>` : ''}</div><div class="yh-situation__copy"><p class="yh-situation__q">${escape(row.title)}</p><p class="yh-situation__desc">${escape(row.desc)}</p><p class="yh-situation__result"><strong>${escape(hc('homeCards.result.label'))}</strong> ${escape(row.result)}</p></div><a class="cd-yehwa-button ${row.price ? 'cd-yehwa-button--secondary' : 'cd-yehwa-button--primary'} yh-situation__cta" href="${escape(row.href)}" data-cd-service-id="${escape(row.serviceId)}"${row.action ? ` data-action="${escape(row.action)}"` : ''}${row.featureKey ? ` data-cd-price-key="${escape(row.featureKey)}"` : ''}><span>${escape(row.cta)}</span>${row.price ? `<span class="yh-situation__price" data-cd-play-price data-cd-play-feature="${escape(row.featureKey)}">${escape(row.price)}</span>` : ''}</a></li>`;
  const list = block => `<ul class="yh-situations__list yh-situations__list--${block}">${rows.map((row, index) => row.block === block ? card(row, index) : '').join('')}</ul>`;
  return `<section class="yh-situations" aria-labelledby="yhSituationsTitle" data-cd-funnel-section="situation_pick" data-cd-no-trans data-cd-korean-only><h2 class="yh-block__title" id="yhSituationsTitle">${escape(hc('homeCards.blockFree.title'))}</h2>${list('free')}<h2 class="yh-block__title yh-block__title--paid">${escape(hc('homeCards.blockPaid.title'))}</h2>${list('paid')}</section>`;
}

// Supplemental discovery only. Keep the existing situation cards and free/paid policies intact.
export function renderLightSajuAndMasters() {
  const facts = SAJU_BUNDLE_DECISION_FACTS;
  if (!(facts.amountKRW > 0)) throw new Error('Missing Light Saju price');
  const masters = [['ziwei', '무성 · 자미두수 기본'], ['sukuyo', '서한비 · 숙요점 기본'], ['vedic', '윤달 · 베다점 기본'], ['astro', '윤달 · 서양점성술 기본']];
  const values = ['v1', 'v2', 'v3'].map(key => `<li>${escape(hc('homeCards.light.' + key))}</li>`).join('');
  const light = `<article class="yh-light-saju"><img class="yh-light-saju__art" src="/images/home/illustrated/method-saju-160.webp" width="160" height="160" alt="" loading="lazy" decoding="async"><div class="yh-light-saju__body"><h3 id="yhLightSajuTitle">${escape(hc('homeCards.light.title'))}</h3><p>${escape(hc('homeCards.light.lead'))}</p><ul class="yh-light-saju__facts">${values}</ul></div><div class="yh-light-saju__buy"><p class="yh-light-saju__price"><span class="yh-badge yh-badge--paid">${escape(hc('homeCards.badge.paid'))}</span> <strong data-cd-play-price data-cd-play-feature="${facts.featureKey}">${escape(facts.priceLabel)}</strong> <small>${escape(hc('homeCards.light.priceNote'))}</small></p><a class="cd-yehwa-button cd-yehwa-button--secondary" href="/ggulggul/?action=cdOneStepFreeSajuEntry&amp;section=summaryCard" data-cd-light-saju-details><span>${escape(hc('homeCards.light.cta'))}</span></a><p class="yh-light-saju__hint">${escape(hc('homeCards.light.ctaHint'))}</p></div></article>`;
  const engines = masters.map(([id, title]) => { const item = FREE_PROMO_FEATURED.find(entry => entry.id === id); if (!item?.action) throw new Error('Missing free master entry: ' + id); return `<li><a href="${escape(freePromoItemHref(item))}" data-action="${escape(item.action)}" data-cd-service-id="${escape(item.serviceId)}"><span class="yh-basic-masters__art-wrap"><img src="${escape(item.image)}" width="160" height="160" alt="" loading="lazy" decoding="async"><span class="yh-badge yh-badge--free">${escape(hc('homeCards.badge.free'))}</span></span><strong>${escape(title)}</strong><span class="yh-basic-masters__line"><b>${escape(hc('homeCards.look.label'))}</b> ${escape(hc('homeCards.' + id + '.look'))}</span><span class="yh-basic-masters__line"><b>${escape(hc('homeCards.get.label'))}</b> ${escape(hc('homeCards.' + id + '.get'))}</span><span class="yh-basic-masters__cta">${escape(item.cta)} <span aria-hidden="true">→</span></span></a></li>`; }).join('');
  return `<section class="yh-supplement" aria-labelledby="yhLightSajuTitle" data-cd-no-trans data-cd-korean-only>${light}<nav class="yh-basic-masters" aria-labelledby="yhMapTitle"><h2 class="yh-block__title" id="yhMapTitle">${escape(hc('homeCards.blockMap.title'))}</h2><p class="yh-basic-masters__note" role="note"><strong>${escape(hc('homeCards.billing.free'))}</strong> ${escape(hc('homeCards.billing.paid'))}</p><ul>${engines}</ul></nav></section>`;
}

export function renderYehwaHome(catalog, { passHtml = '', installHtml = '', quickHtml = '', consultationHtml = '', situationHtml = '' } = {}) {
  const freeSaju = catalog.find(item => item.id === 'saju' && item.price === '무료 시작');
  const freeHref = freeSaju?.quickHref || freeSaju?.href;
  return `<section class="yh-home" data-yh-home lang="ko" aria-labelledby="cdhTitle">
    <div class="yh-hero yh-entry-scene" data-home-hero>
      <div class="yh-greeting"><h1 id="cdhTitle"><span>오늘은 어떤 이야기가</span><br><span>궁금하세요?</span></h1><p><span>지금 마음에 걸리는 상황부터 골라 보세요.</span><br><span>결과를 먼저 보고, 더 깊게 볼지는 그다음에.</span></p>${freeHref ? `<a class="cd-yehwa-button cd-yehwa-button--primary yh-free-start" href="${escape(freeHref)}" data-action="${escape(freeSaju.action)}" data-cd-service-id="saju"><span class="yh-free-start__label" data-cd-trans="home.moonlit.manseStart">무료로 내 만세력 확인하기</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></a>` : ''}<p class="yh-trust" data-cd-no-trans data-cd-korean-only>${escape(trustRecordCopy.full)} <a href="${escape(trustRecordCopy.href)}">${escape(trustRecordCopy.link)} <span aria-hidden="true">›</span></a></p></div>
      <div class="yh-art" aria-hidden="true"><img id="honeypigLogo" data-character="yeoni" src="/images/home/illustrated/yeoni-character-480.webp" srcset="/images/home/illustrated/yeoni-character-320.webp 320w, /images/home/illustrated/yeoni-character-480.webp 480w, /images/home/illustrated/yeoni-character-800.webp 800w" sizes="(max-width:600px) 156px, 270px" width="800" height="800" fetchpriority="high" decoding="async" alt=""></div>
    </div>
    ${situationHtml}
    ${quickHtml}
    ${consultationHtml}
    <a class="yh-all" href="/?action=cdOpenAllFortunes" data-action="cdOpenAllFortunes"><span data-cd-trans="home.gardenCopy.allFortunes">모든 운세 보기</span><span aria-hidden="true">→</span></a>
    <nav class="yh-links" aria-labelledby="yhRecordsTitle" data-yh-target="2"><details><summary id="yhRecordsTitle">나의 상담 다시 보기</summary><a href="/records/">꿀꿀 운세 기록 <span aria-hidden="true">→</span></a><a href="/yeongnyangi/library/">영냥이 상담 기록 <span aria-hidden="true">→</span></a></details></nav>
    ${installHtml}
    ${passHtml}
    <span id="homeExplore" aria-hidden="true"></span><span id="homeServices" aria-hidden="true"></span>
    <a class="yh-webtoon-link" href="/#homeStoryTitle"><img src="/images/master-profiles/avatars/master.webp" width="52" height="52" loading="lazy" alt=""><span data-cd-trans="home.guideCopy.webtoonMore">다른 마스터의 상담 웹툰 보기</span> <span aria-hidden="true">→</span></a>
    <section class="yh-guide" data-yh-guide hidden aria-label="연이의 화면 안내" tabindex="-1"><div class="yh-portrait" aria-hidden="true"><img data-yh-portrait-src="/assets/yeoni/atelier/talking-pig.webp" width="1280" height="384" loading="lazy" decoding="async" alt=""></div><div class="yh-speech"><div class="yh-guide-head"><strong>꽃돼지 연이</strong><span data-yh-progress></span><button type="button" data-yh-close aria-label="안내 닫기">×</button></div><p data-yh-line aria-live="polite"></p><div class="yh-guide-actions"><button type="button" data-yh-skip>건너뛰기</button><button type="button" data-yh-prev>이전</button><button type="button" data-yh-next>다음</button></div></div></section>
  </section>`;
}

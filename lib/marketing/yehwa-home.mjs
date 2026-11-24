// Presentation groups only. The original registry retains every tag and entry.
export const HOME_CONCERN_GROUPS = [
  { id: 'love', label: '연애·관계', purposes: ['love', 'compatibility'] },
  { id: 'work', label: '돈·일', purposes: ['money', 'career'] },
  { id: 'self', label: '나의 성향', purposes: ['self'] },
  { id: 'flow', label: '앞으로의 흐름', purposes: ['today', 'life'] },
  { id: 'family', label: '가족·생활', purposes: ['family'] },
];
import { SAJU_BUNDLE_DECISION_FACTS } from './decision-facts.mjs';
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
// 2026-11-19: 무료 두 카드는 160px 컷아웃 대신 같은 달빛정원 시리즈의 3:2 일러스트(640×427)를 쓴다(레티나에서도 선명).
const FREE_CARD_ART = { natal: '/images/service-introductions/saju-640.webp', tarot: '/images/service-introductions/tarot-640.webp' };
const SITUATIONS = [
  { promo: 'natal', block: 'free', featured: true },
  { promo: 'tarot', block: 'free' },
];
const HEUKWOL_PREVIEW = [
  ['타고난 성향', '되풀이되는 선택과 관계 습관'],
  ['월별 흐름', '1~12월에 살펴볼 신호와 대응'],
  ['주제별 대응', '재물·연애·관계·일과 생활 점검'],
  ['다음 선택', '대안을 고르는 기준과 실천 목록'],
];
// Title-only presentation mirror of HEUKWOL_CHAPTERS. Editorial copy is tested against the report.
const HEUKWOL_CHAPTER_TITLES = [
  ["타고난 성향 · 위기가 반복되는 출발점","연애 성향 · 가까워질수록 생기는 매듭","재물 성향 · 돈이 새는 선택의 조건","관계 성향 · 책임과 신뢰의 경계","사고와 안전 · 서두름과 무리의 경고","건강과 회복 · 내 리듬을 놓치는 습관"],
  ["예고와 선택 사이","1월 · 흐름과 선택","2월 · 흐름과 선택","3월 · 흐름과 선택","4월 · 흐름과 선택","5월 · 흐름과 선택","6월 · 흐름과 선택","7월 · 흐름과 선택","8월 · 흐름과 선택","9월 · 흐름과 선택","10월 · 흐름과 선택","11월 · 흐름과 선택","12월 · 흐름과 선택"],
  ["돈과 약속의 경계","마음을 지키는 거리","책임을 나누는 대화","일의 판세를 바꾸는 조건","사고와 안전 · 상황별 예방 작전","건강과 회복 · 지속할 수 있는 대비"],
  ["다른 길을 고르는 기준","당신이 쓰는 다음 장"],
];
// Verbatim service introduction from the public /heukwol/ cover; no generated report content.
const HEUKWOL_PUBLIC_INTRO = '타고난 성향과 반복되는 선택부터 살펴봐요. 연애·재물·인간관계·안전·건강의 점검과 선택한 해의 열두 달 대응을 27장에 담아요.';
export const renderHeukwolPreview = () => `<details class="yh-chapter-preview"><summary class="yh-chapter-preview__toggle"><svg class="yh-chapter-preview__book" width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 5.5C8 4 5.5 3.7 3 4.5V15c2.5-.8 5-.5 7 1 2-1.5 4.5-1.8 7-1V4.5c-2.5-.8-5-.5-7 1Zm0 0V16" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/></svg><span class="yh-chapter-preview__show">챕터 자세히 보기</span><span class="yh-chapter-preview__hide">챕터 접기</span><small>4부 · 27개 챕터</small></summary><div class="yh-chapter-preview__panel" tabindex="0" role="region" aria-label="상담서 목차"><header class="yh-chapter-preview__front"><p class="yh-chapter-preview__kicker">흑월 상담서 · 목차 미리보기</p><p class="yh-chapter-preview__intro">${escape(HEUKWOL_PUBLIC_INTRO)}</p><p class="yh-chapter-preview__note">결제 없이 목차를 확인할 수 있어요.</p></header><ol class="yh-chapter-preview__parts" aria-label="상담서 목차">${HEUKWOL_PREVIEW.map(([title, desc], index) => `<li class="yh-chapter-preview__part${index === 1 ? ' yh-chapter-preview__part--months' : ''}"><div class="yh-chapter-preview__heading"><span class="yh-chapter-preview__number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><div><strong>${escape(title)}</strong><small>${escape(desc)}</small></div></div><ul class="yh-chapter-preview__titles">${HEUKWOL_CHAPTER_TITLES[index].map(chapter => `<li>${escape(chapter)}</li>`).join('')}</ul></li>`).join('')}</ol></div></details>`;
export function renderSituationCards(catalog) {
  const rows = SITUATIONS.map(row => {
    const id = row.promo || row.service;
    const copy = { title: hc(`homeCards.${id}.title`), desc: hc(`homeCards.${id}.desc`), cta: hc(`homeCards.${id}.cta`) };
    if (row.promo) {
      const item = FREE_PROMO_FEATURED.find(entry => entry.id === row.promo);
      if (!item?.action) throw new Error(`Missing free promo entry: ${row.promo}`);
      return { ...row, ...copy, result: hc(`homeCards.${id}.result`), href: freePromoItemHref(item), action: item.action, serviceId: item.serviceId, image: FREE_CARD_ART[id] || item.image, imgW: FREE_CARD_ART[id] ? 640 : 160, imgH: FREE_CARD_ART[id] ? 427 : 160 };
    }
    const item = catalog.find(entry => entry.id === row.service);
    if (!item?.href || !item.featureKey || !/^\d[\d,]*원$/.test(item.price || '') || !item.resultFormat) throw new Error(`Missing paid situation entry: ${row.service}`);
    return { ...row, ...copy, result: item.resultFormat, href: item.href, serviceId: item.id, image: item.image, imgW: 320, imgH: 213, featureKey: item.featureKey, price: item.price };
  });
  const card = row => `<li class="yh-situation ${row.price ? 'yh-situation--paid' : 'yh-situation--free'}${row.featured ? ' yh-situation--featured' : ''}"><div class="yh-situation__art-wrap"><img class="yh-situation__art" src="${escape(row.image)}" width="${row.imgW}" height="${row.imgH}" alt="" loading="lazy" decoding="async"><span class="yh-badge ${row.price ? 'yh-badge--paid' : 'yh-badge--free'}">${escape(hc(row.price ? 'homeCards.badge.paid' : 'homeCards.badge.free'))}</span>${row.featured ? `<span class="yh-badge yh-badge--pick">${escape(hc('homeCards.badge.pick'))}</span>` : ''}</div><div class="yh-situation__copy"><p class="yh-situation__q">${escape(row.title)}</p><p class="yh-situation__desc">${escape(row.desc)}</p><p class="yh-situation__result"><strong>${escape(hc('homeCards.result.label'))}</strong> ${escape(row.result)}</p>${row.service === 'heukwol' ? renderHeukwolPreview() : ''}</div><a class="cd-yehwa-button ${row.price ? 'cd-yehwa-button--secondary' : 'cd-yehwa-button--primary'} yh-situation__cta${row.service === 'heukwol' ? ' yh-chapter-cta' : ''}" href="${escape(row.href)}" data-cd-service-id="${escape(row.serviceId)}"${row.action ? ` data-action="${escape(row.action)}"` : ''}${row.featureKey ? ` data-cd-price-key="${escape(row.featureKey)}"` : ''}><span>${escape(row.cta)}</span>${row.price ? `<span class="yh-situation__price" data-cd-play-price data-cd-play-feature="${escape(row.featureKey)}">${escape(row.price)}</span>` : ''}</a></li>`;
  const list = block => `<ul class="yh-situations__list yh-situations__list--${block}">${rows.map((row, index) => row.block === block ? card(row, index) : '').join('')}</ul>`;
  return `<section class="yh-situations" aria-labelledby="yhSituationsTitle" data-cd-funnel-section="situation_pick" data-cd-no-trans data-cd-korean-only><h2 class="yh-block__title" id="yhSituationsTitle">${escape(hc('homeCards.blockFree.title'))}</h2>${list('free')}</section>`;
}

// Supplemental discovery only. Keep the existing situation cards and free/paid policies intact.
export function renderLightSajuAndMasters() {
  const facts = SAJU_BUNDLE_DECISION_FACTS;
  if (!(facts.amountKRW > 0)) throw new Error('Missing Light Saju price');
  const masters = [['ziwei', '무성 · 자미두수 기본'], ['sukuyo', '서한비 · 숙요점 기본'], ['vedic', '윤달 · 베다점 기본'], ['astro', '윤달 · 서양점성술 기본']];
  const values = ['v1', 'v2', 'v3'].map(key => `<li>${escape(hc('homeCards.light.' + key))}</li>`).join('');
  const light = `<article class="yh-light-saju"><img class="yh-light-saju__art" src="/images/home/illustrated/method-saju-160.webp" width="160" height="160" alt="" loading="lazy" decoding="async"><div class="yh-light-saju__body"><h3 id="yhLightSajuTitle">${escape(hc('homeCards.light.title'))}</h3><p>${escape(hc('homeCards.light.lead'))}</p><ul class="yh-light-saju__facts">${values}</ul></div><div class="yh-light-saju__buy"><p class="yh-light-saju__price"><span class="yh-badge yh-badge--paid">${escape(hc('homeCards.badge.paid'))}</span> <strong data-cd-play-price data-cd-play-feature="${facts.featureKey}">${escape(facts.priceLabel)}</strong> <small>${escape(hc('homeCards.light.priceNote'))}</small></p><a class="cd-yehwa-button cd-yehwa-button--secondary yh-chapter-cta" href="/ggulggul/?action=cdOneStepFreeSajuEntry&amp;section=summaryCard" data-cd-light-saju-details><span>${escape(hc('homeCards.light.cta'))}</span></a><p class="yh-light-saju__hint">${escape(hc('homeCards.light.ctaHint'))}</p></div></article>`;
  const engines = masters.map(([id, title]) => { const item = FREE_PROMO_FEATURED.find(entry => entry.id === id); if (!item?.action) throw new Error('Missing free master entry: ' + id); return `<li><a href="${escape(freePromoItemHref(item))}" data-action="${escape(item.action)}" data-cd-service-id="${escape(item.serviceId)}"><span class="yh-basic-masters__art-wrap"><img src="${escape(item.image)}" width="160" height="160" alt="" loading="lazy" decoding="async"><span class="yh-badge yh-badge--free">${escape(hc('homeCards.badge.free'))}</span></span><strong>${escape(title)}</strong><span class="yh-basic-masters__line"><b>${escape(hc('homeCards.look.label'))}</b> ${escape(hc('homeCards.' + id + '.look'))}</span><span class="yh-basic-masters__line"><b>${escape(hc('homeCards.get.label'))}</b> ${escape(hc('homeCards.' + id + '.get'))}</span><span class="yh-basic-masters__cta">${escape(item.cta)} <span aria-hidden="true">→</span></span></a></li>`; }).join('');
  return `<section class="yh-supplement" aria-labelledby="yhLightSajuTitle" data-cd-no-trans data-cd-korean-only>${light}<nav class="yh-basic-masters" aria-labelledby="yhMapTitle"><h2 class="yh-block__title" id="yhMapTitle">${escape(hc('homeCards.blockMap.title'))}</h2><p class="yh-basic-masters__note" role="note"><strong>${escape(hc('homeCards.billing.free'))}</strong> ${escape(hc('homeCards.billing.paid'))}</p><ul>${engines}</ul></nav></section>`;
}

export function renderYehwaHome(catalog, { passHtml = '', installHtml = '', consultationHtml = '' } = {}) {
  return `<section class="yh-home" data-yh-home lang="ko" aria-labelledby="cdhTitle">
    <div class="yh-hero yh-entry-scene" data-home-hero>
      <picture class="yh-garden-picture" aria-hidden="true">
        <source data-yh-garden-night="(max-width:600px)" media="not all" srcset="/images/home/illustrated/yeoni-moon-garden-night-640.webp">
        <source data-yh-garden-night="all" media="not all" srcset="/images/home/illustrated/yeoni-moon-garden-night-1280.webp">
        <source media="(max-width:600px)" srcset="/images/home/illustrated/yeoni-moon-garden-640.webp">
        <img src="/images/home/illustrated/yeoni-moon-garden-1280.webp" alt="" width="1280" height="853" data-lcp-candidate="1" loading="eager" fetchpriority="high">
      </picture>
      <div class="yh-greeting"><span class="yh-moon-rule" aria-hidden="true">☾</span><h1 id="cdhTitle"><span data-cd-trans="home.yehwa.titleA">오늘은 어떤 이야기가</span> <span data-cd-trans="home.yehwa.titleB">궁금하세요?</span></h1>
      <p>마음에 걸린 고민부터, 나를 알아가는 운세까지.</p>
      <a class="cd-yehwa-button cd-yehwa-button--primary yh-free-start yh-finder-cta" href="#homeFinder"><span>나에게 맞는 상담 찾기</span></a></div>
      <div class="yh-character"><div class="yh-portrait-stage"><button type="button" class="yh-character-art" data-home-yeoni aria-label="연이에게 인사하기">
        <script src="/js/core/home-yeoni-portrait.js?v=build-000000000000"></script>
        <noscript><img src="/images/home/illustrated/yeoni-character-480.webp" width="800" height="800" alt=""></noscript>
        <span data-face hidden></span><span class="yh-reaction-art" aria-hidden="true" hidden></span></button></div><button type="button" class="yh-character-caption" data-yeoni-greet aria-label="연이에게 인사하기"><span data-yeoni-speech aria-live="polite">연이에게 인사하기</span></button></div></div>
    <section class="yh-finder" aria-labelledby="homeFinder"><h2 id="homeFinder" tabindex="-1">상담 찾기</h2>
      <form data-home-search role="search" action="/ggulggul/"><input type="hidden" name="action" value="cdOpenAllFortunes"><label for="homeFinderQuery">어떤 고민이 있으세요?</label><div class="yh-search-field"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.8"/><path d="m16 16 5 5"/></svg><input type="search" id="homeFinderQuery" placeholder="이직, 재회, 올해의 흐름"><button type="submit">검색</button></div>
      <nav aria-label="고민으로 찾기"><button type="submit" name="purpose" value="love">연애·관계</button><button type="submit" name="purpose" value="money">재물</button><button type="submit" name="purpose" value="career">일·진로</button><button type="submit" name="purpose" value="life">앞으로의 흐름</button><button type="submit" name="purpose" value="self">나의 성향</button></nav>
      <a class="yh-filter-link" href="/ggulggul/?action=cdOpenAllFortunes" data-action="cdOpenAllFortunes"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 7h5m4 0h9M3 17h10m4 0h4"/><circle cx="10" cy="7" r="2"/><circle cx="15" cy="17" r="2"/></svg><span>방식·가격으로 찾기</span></a><p data-finder-error role="status" hidden></p></form></section>
    ${consultationHtml}
    ${installHtml}
    ${passHtml}
    <span id="homeExplore" aria-hidden="true"></span><span id="homeServices" aria-hidden="true"></span>
    <section class="yh-guide" data-yh-guide hidden aria-label="연이의 화면 안내" tabindex="-1"><div class="yh-portrait" aria-hidden="true"><img data-yh-portrait-src="/assets/yeoni/atelier/talking-pig.webp" width="1280" height="384" loading="lazy" decoding="async" alt=""></div><div class="yh-speech"><div class="yh-guide-head"><strong>꽃돼지 연이</strong><span data-yh-progress></span><button type="button" data-yh-close aria-label="안내 닫기">×</button></div><p data-yh-line aria-live="polite"></p><div class="yh-guide-actions"><button type="button" data-yh-skip>건너뛰기</button><button type="button" data-yh-prev>이전</button><button type="button" data-yh-my hidden data-cd-sheet-open="cdAccountSheet" aria-haspopup="dialog">마이 열기</button><button type="button" data-yh-next>다음</button></div></div></section>
  </section>`;
}

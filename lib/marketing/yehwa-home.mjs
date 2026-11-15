// Presentation groups only. The original registry retains every tag and entry.
export const HOME_CONCERN_GROUPS = [
  { id: 'love', label: '연애·관계', purposes: ['love', 'compatibility'] },
  { id: 'work', label: '돈·일', purposes: ['money', 'career'] },
  { id: 'self', label: '나의 성향', purposes: ['self'] },
  { id: 'flow', label: '앞으로의 흐름', purposes: ['today', 'life'] },
  { id: 'family', label: '가족·생활', purposes: ['family'] },
];
import { trustRecordCopy } from './trust-record.mjs';
import { FREE_PROMO_FEATURED, freePromoItemHref } from './free-promo.mjs';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function concernServices(catalog, group) {
  return catalog.filter(item => group.purposes.some(tag => item.purposes?.includes(tag))).slice(0, 3);
}
// 2026-11-16 상황형 첫 화면: 카드마다 질문 1·결과 1·버튼 1. 목적지·가격은 기존 카탈로그에서만 읽는다.
// 한국어 화면 전용이다(다른 언어는 바로 아래 무료 카드가 같은 진입을 번역해 보여 준다).
const SITUATIONS = [
  { promo: 'natal', question: '풀이를 고르기 전에, 내 명식부터 한눈에', result: '받는 결과 · 네 기둥 명식과 12신살 · 무료', cta: '무료 만세력 보기' },
  { promo: 'tarot', question: '같은 질문이 오늘도 마음에 걸린다면', result: '받는 결과 · 카드 세 장 리딩 · 무료', cta: '카드 세 장 뽑기' },
  { service: 'heukwol', question: '앞으로 어느 시기에 신경 써야 할지', cta: '주의할 시기 보기' },
];
export function renderSituationCards(catalog) {
  const rows = SITUATIONS.map(row => {
    if (row.promo) {
      const item = FREE_PROMO_FEATURED.find(entry => entry.id === row.promo);
      if (!item?.action) throw new Error(`Missing free promo entry: ${row.promo}`);
      return { ...row, href: freePromoItemHref(item), action: item.action, serviceId: item.serviceId, image: item.image };
    }
    const item = catalog.find(entry => entry.id === row.service);
    if (!item?.href || !item.featureKey || !/^\d[\d,]*원$/.test(item.price || '') || !item.resultFormat) throw new Error(`Missing paid situation entry: ${row.service}`);
    return { ...row, href: item.href, serviceId: item.id, image: item.image, featureKey: item.featureKey, price: item.price, result: '받는 결과 · ' + item.resultFormat + ' · 유료' };
  });
  return `<section class="yh-situations" aria-labelledby="yhSituationsTitle" data-cd-funnel-section="situation_pick" data-cd-no-trans data-cd-korean-only><h2 class="sr-only" id="yhSituationsTitle">상황으로 고르기</h2><ul class="yh-situations__list">${rows.map(row => `<li class="yh-situation"><img class="yh-situation__art" src="${escape(row.image)}" width="160" height="160" alt="" loading="lazy" decoding="async"><div class="yh-situation__copy"><p class="yh-situation__q">${escape(row.question)}</p><p class="yh-situation__result">${escape(row.result)}</p></div><a class="cd-yehwa-button ${row.price ? 'cd-yehwa-button--secondary' : 'cd-yehwa-button--primary'} yh-situation__cta" href="${escape(row.href)}" data-cd-service-id="${escape(row.serviceId)}"${row.action ? ` data-action="${escape(row.action)}"` : ''}${row.featureKey ? ` data-cd-price-key="${escape(row.featureKey)}"` : ''}><span>${escape(row.cta)}</span>${row.price ? `<span aria-hidden="true">·</span><span class="yh-situation__price" data-cd-play-price data-cd-play-feature="${escape(row.featureKey)}">${escape(row.price)}</span>` : ''}</a></li>`).join('')}</ul></section>`;
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

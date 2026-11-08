import { consultationStories, storyBenefits } from '../brand/consultation-stories.mjs';
import { RECORD_SERVICES } from '../records/service-registry.js';
// Presentation groups only. The original registry retains every tag and entry.
export const HOME_CONCERN_GROUPS = [
  { id: 'love', label: '연애·관계', purposes: ['love', 'compatibility'] },
  { id: 'work', label: '돈·일', purposes: ['money', 'career'] },
  { id: 'self', label: '나의 성향', purposes: ['self'] },
  { id: 'flow', label: '앞으로의 흐름', purposes: ['today', 'life'] },
  { id: 'family', label: '가족·생활', purposes: ['family'] },
];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function concernServices(catalog, group) {
  return catalog.filter(item => group.purposes.some(tag => item.purposes?.includes(tag))).slice(0, 3);
}
export function renderYehwaHome(catalog, { passHtml = '', installHtml = '' } = {}) {
  const freeSaju = catalog.find(item => item.id === 'saju' && item.price === '무료 시작');
  const freeHref = freeSaju?.quickHref || freeSaju?.href;
  const entryPoints = [
    ['saju', 'method-saju-160', 'home.nav.saju'],
    ['tarot', 'method-tarot-160', 'home.nav.tarot'],
    // 앱·모바일 첫 화면에서는 이 줄이 체계 선택지 전부다('무료로 먼저' 여섯 장은 700px 미만에서 숨겨 겹치지 않는다).
    ['ziwei', 'method-ziwei-160', 'home.fortunePick.ziwei'],
    ['sukuyo', 'method-sukuyo-160', 'home.fortunePick.sukuyo'],
    ['vedic', 'method-vedic-160', 'home.fortunePick.vedic'],
    ['astrology', 'method-astrology-160', 'home.fortunePick.astrology'],
    ['daily-fortune', 'method-zodiac-v1-160', 'home.todayHub.title'],
  ].map(([id, art, label]) => {
    const item = catalog.find(service => service.id === id);
    if (!item) throw new Error('Missing home entry: ' + id);
    const action = item.action ? ' data-action="' + escape(item.action) + '"' : '';
    return `<a class="yh-entry" data-cd-service-id="${id}" href="${escape(item.quickHref || item.href)}"${action}><img src="/images/home/illustrated/${art}.webp" alt="" width="72" height="72"><span data-cd-trans="${label}">${escape(item.name)}</span></a>`;
  }).join('');
  const card = item => {
    const href = item.href || '/?action=' + encodeURIComponent(item.action);
    const storyId = RECORD_SERVICES.find(service => service.href === href && consultationStories[service.id])?.id;
    const paid = /[\d,]+원/.test(item.price);
    const range = String(item.price).match(/^([\d,]+)원~([\d,]+)원$/);
    const price = range ? `<b data-cd-trans="home.yehwa.rangePrice" data-cd-vars="${escape(JSON.stringify({from:range[1],to:range[2]}))}">${escape(item.price)}</b>` : `<b>${escape(item.price)}</b>`;
    const direct = `<a class="yh-card" href="${escape(href)}" data-cd-service-id="${escape(item.id)}"${item.action ? ` data-action="${escape(item.action)}"` : ''}${paid && item.featureKey ? ` data-feature-key="${escape(item.featureKey)}" data-pvw-paid="1"` : ''}${item.price === '무료 시작' ? ' data-pvw-free="1"' : ''}>
      ${item.image ? `<img src="${escape(item.image)}" width="96" height="96" alt="" loading="lazy" decoding="async">` : ''}
      <span class="yh-card-copy"><strong data-pvw-title>${escape(item.name)}</strong><span>${escape(storyId ? consultationStories[storyId].lead : item.desc)}</span>${storyId ? `<span class="yh-result-format">${escape(storyBenefits[storyId].join(' · '))}</span>` : item.resultFormat ? `<span class="yh-result-format">받는 결과 · ${escape(item.resultFormat)}</span>` : ''}<span class="yh-card-foot"><span class="yh-price">${paid ? '<span>유료 · </span>' : ''}${price}</span><span><span>${storyId ? '상담 시작하기' : '상담 살펴보기'}</span> <span aria-hidden="true">→</span></span></span></span></a>`;
    return storyId ? `<div class="yh-story-option">${direct}<a class="yh-story-link" href="/consultations/${storyId}/" aria-label="${escape(item.name)} 웹툰으로 알아보기"><span>웹툰으로 알아보기</span> <span aria-hidden="true">→</span></a></div>` : direct;
  };
  return `<section class="yh-home" data-yh-home lang="ko" aria-labelledby="cdhTitle">
    <div class="yh-hero yh-entry-scene" data-home-hero>
      <div class="yh-greeting"><h1 id="yhDesktopTitle"><span>오늘은 어떤 이야기가</span><br><span>궁금하세요?</span></h1><p><span>사주·타로와 고민별 상담.</span><br><span>무료 만세력부터 시작해 보세요.</span></p>${freeHref ? `<a class="yh-free-start" href="${escape(freeHref)}" data-action="${escape(freeSaju.action)}" data-cd-service-id="saju">무료 만세력 시작하기 <span aria-hidden="true">→</span></a>` : ''}</div>
      <div class="yh-art" aria-hidden="true"><img id="honeypigLogo" data-character="yeoni" src="/images/home/illustrated/yeoni-character-480.webp" srcset="/images/home/illustrated/yeoni-character-320.webp 320w, /images/home/illustrated/yeoni-character-480.webp 480w, /images/home/illustrated/yeoni-character-800.webp 800w" sizes="(max-width:600px) 156px, 270px" width="800" height="800" fetchpriority="high" decoding="async" alt=""></div>
    </div>
    <h2 class="yh-entry-title" id="cdhTitle" data-cd-trans="home.gardenCopy.quickTitle">어떤 운세를 볼까요?</h2>
    <nav class="yh-entries" aria-labelledby="cdhTitle">${entryPoints}</nav>
    <details class="yh-find" id="homeConcerns"><summary><span data-cd-trans="home.mobileEntry.find">고민으로 찾기</span></summary>
    <section class="yh-concerns" aria-labelledby="yhConcernTitle" data-yh-target="0"><h2 id="yhConcernTitle">어떤 고민이 있나요?</h2><div class="yh-choices">${HOME_CONCERN_GROUPS.map(group => `<button type="button" data-yh-concern="${group.id}" aria-pressed="false" aria-controls="yhResults"><span class="yh-check" aria-hidden="true">✓</span><span>${group.label}</span></button>`).join('')}</div></section>
    <section class="yh-results" id="yhResults" hidden aria-labelledby="yhResultTitle" data-yh-target="1"><div class="yh-section-heading"><h2 id="yhResultTitle">마음을 살펴보는 상담</h2><span data-yh-selection role="status"></span></div>${HOME_CONCERN_GROUPS.map(group=>`<div class="yh-card-list" data-yh-group="${group.id}" hidden>${concernServices(catalog,group).map(card).join('') || '<p>전체 운세에서 더 많은 상담을 살펴보세요.</p>'}</div>`).join('')}</section>
      <button type="button" class="yh-guide-open" data-yh-start><span>연이와 함께 둘러보기</span> <span aria-hidden="true">→</span></button>
    </details>
    <a class="yh-all" href="/?action=cdOpenAllFortunes" data-action="cdOpenAllFortunes"><span data-cd-trans="home.gardenCopy.allFortunes">모든 운세 보기</span><span aria-hidden="true">→</span></a>
    <nav class="yh-links" aria-labelledby="yhRecordsTitle" data-yh-target="2"><details><summary id="yhRecordsTitle">나의 상담 다시 보기</summary><a href="/records/">꿀꿀 운세 기록 <span aria-hidden="true">→</span></a><a href="/yeongnyangi/library/">영냥이 상담 기록 <span aria-hidden="true">→</span></a></details></nav>
    ${installHtml}
    ${passHtml}
    <span id="homeExplore" aria-hidden="true"></span><span id="homeServices" aria-hidden="true"></span>
    <a class="yh-webtoon-link" href="/#homeStoryTitle"><img src="/images/master-profiles/avatars/master.webp" width="52" height="52" loading="lazy" alt=""><span data-cd-trans="home.guideCopy.webtoonMore">다른 마스터의 상담 웹툰 보기</span> <span aria-hidden="true">→</span></a>
    <section class="yh-guide" data-yh-guide hidden aria-label="연이의 화면 안내" tabindex="-1"><div class="yh-portrait" aria-hidden="true"><img data-yh-portrait-src="/assets/yeoni/atelier/talking-pig.webp" width="1280" height="384" loading="lazy" decoding="async" alt=""></div><div class="yh-speech"><div class="yh-guide-head"><strong>꽃돼지 연이</strong><span data-yh-progress></span><button type="button" data-yh-close aria-label="안내 닫기">×</button></div><p data-yh-line aria-live="polite"></p><div class="yh-guide-actions"><button type="button" data-yh-skip>건너뛰기</button><button type="button" data-yh-prev>이전</button><button type="button" data-yh-next>다음</button></div></div></section>
  </section>`;
}

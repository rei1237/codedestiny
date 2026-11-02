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
export function renderYehwaHome(catalog) {
  const card = item => {
    const href = item.href || '/?action=' + encodeURIComponent(item.action);
    const paid = /[\d,]+원/.test(item.price);
    const range = String(item.price).match(/^([\d,]+)원~([\d,]+)원$/);
    const price = range ? `<b data-cd-trans="home.yehwa.rangePrice" data-cd-vars="${escape(JSON.stringify({from:range[1],to:range[2]}))}">${escape(item.price)}</b>` : `<b>${escape(item.price)}</b>`;
    return `<a class="yh-card" href="${escape(href)}" data-cd-service-id="${escape(item.id)}"${item.action ? ` data-action="${escape(item.action)}"` : ''}${paid && item.featureKey ? ` data-feature-key="${escape(item.featureKey)}" data-pvw-paid="1"` : ''}${item.price === '무료 시작' ? ' data-pvw-free="1"' : ''}>
      ${item.image ? `<img src="${escape(item.image)}" width="96" height="96" alt="" loading="lazy" decoding="async">` : ''}
      <span class="yh-card-copy"><strong data-pvw-title>${escape(item.name)}</strong><span>${escape(item.desc)}</span><span class="yh-card-foot">${price}<span><span>상담 살펴보기</span> <span aria-hidden="true">→</span></span></span></span></a>`;
  };
  return `<section class="yh-home" data-yh-home lang="ko" aria-label="고민으로 상담 찾기">
    <div class="yh-hero" data-home-hero>
      <div class="yh-greeting"><h1 id="cdhTitle"><span>오늘은 어떤 이야기가</span><br><span>궁금하세요?</span></h1><p><span>마음에 남은 고민부터</span><br><span>천천히 골라보세요.</span></p><button type="button" class="yh-guide-open" data-yh-start><span>연이와 함께 둘러보기</span> <span aria-hidden="true">→</span></button></div>
      <div class="yh-art" aria-hidden="true"><span class="yh-moon"></span><img id="honeypigLogo" data-character="yeoni" src="/fuctionassets/%EC%97%B0%EC%9D%B4.webp" width="240" height="280" fetchpriority="high" decoding="async" alt=""></div>
    </div>
    <section class="yh-concerns" aria-labelledby="yhConcernTitle" data-yh-target="0"><h2 id="yhConcernTitle">어떤 고민이 있나요?</h2><div class="yh-choices">${HOME_CONCERN_GROUPS.map((group, index) => `<button type="button" data-yh-concern="${group.id}" aria-pressed="${index === 0}" aria-controls="yhResults"><span class="yh-check" aria-hidden="true">✓</span><span>${group.label}</span></button>`).join('')}</div></section>
    <section class="yh-results" id="yhResults" aria-labelledby="yhResultTitle" data-yh-target="1"><div class="yh-section-heading"><h2 id="yhResultTitle">마음을 살펴보는 상담</h2><span data-yh-selection role="status">연애·관계</span></div>${HOME_CONCERN_GROUPS.map((group,index)=>`<div class="yh-card-list" data-yh-group="${group.id}"${index ? ' hidden' : ''}>${concernServices(catalog,group).map(card).join('') || '<p>전체 운세에서 더 많은 상담을 살펴보세요.</p>'}</div>`).join('')}</section>
    <nav class="yh-links" aria-label="전체 운세와 상담 기록" data-yh-target="2"><a href="/?action=cdOpenAllFortunes" data-action="cdOpenAllFortunes"><span>전체 운세 보기</span> <span aria-hidden="true">→</span></a><details><summary>나의 상담 다시 보기</summary><a href="/records/">꿀꿀 운세 기록 <span aria-hidden="true">→</span></a><a href="/yeongnyangi/library/">영냥이 상담 기록 <span aria-hidden="true">→</span></a></details></nav>
    <section class="yh-guide" data-yh-guide hidden aria-label="연이의 화면 안내" tabindex="-1"><div class="yh-portrait" aria-hidden="true"><img src="/assets/yeoni/atelier/talking-pig.webp" width="1280" height="384" alt=""></div><div class="yh-speech"><div class="yh-guide-head"><strong>꽃돼지 연이</strong><span data-yh-progress></span><button type="button" data-yh-close aria-label="안내 닫기">×</button></div><p data-yh-line aria-live="polite"></p><div class="yh-guide-actions"><button type="button" data-yh-skip>건너뛰기</button><button type="button" data-yh-prev>이전</button><button type="button" data-yh-next>다음</button></div></div></section>
  </section>`;
}

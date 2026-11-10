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
export function renderYehwaHome(catalog, { passHtml = '', installHtml = '', quickHtml = '', consultationHtml = '' } = {}) {
  const freeSaju = catalog.find(item => item.id === 'saju' && item.price === '무료 시작');
  const freeHref = freeSaju?.quickHref || freeSaju?.href;
  return `<section class="yh-home" data-yh-home lang="ko" aria-labelledby="cdhTitle">
    <div class="yh-hero yh-entry-scene" data-home-hero>
      <div class="yh-greeting"><h1 id="cdhTitle"><span>오늘은 어떤 이야기가</span><br><span>궁금하세요?</span></h1><p><span>사주·타로와 고민별 상담.</span><br><span>무료 만세력부터 시작해 보세요.</span></p>${freeHref ? `<a class="cd-yehwa-button cd-yehwa-button--primary yh-free-start" href="${escape(freeHref)}" data-action="${escape(freeSaju.action)}" data-cd-service-id="saju"><span class="yh-free-start__label">무료 만세력 시작하기</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></a>` : ''}</div>
      <div class="yh-art" aria-hidden="true"><img id="honeypigLogo" data-character="yeoni" src="/images/home/illustrated/yeoni-character-480.webp" srcset="/images/home/illustrated/yeoni-character-320.webp 320w, /images/home/illustrated/yeoni-character-480.webp 480w, /images/home/illustrated/yeoni-character-800.webp 800w" sizes="(max-width:600px) 156px, 270px" width="800" height="800" fetchpriority="high" decoding="async" alt=""></div>
    </div>
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

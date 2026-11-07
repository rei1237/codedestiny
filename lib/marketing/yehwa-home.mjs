// 첫 화면 고민 칩은 lib/marketing/home-concerns.mjs 의 HOME_CONCERNS 하나에서 온다(가격은 생성기가 레지스트리에서 붙인다).
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/**
 * @param {Array<object>} catalog js/core/service-registry.js 의 서비스 목록
 * @param {{ installHtml?: string, hero: { concerns: Array<{id:string,label:string,priceLabel:string,href:string}>, ctaHref: string, careerLine: string, scholarName: string } }} options
 */
export function renderYehwaHome(catalog, { installHtml = '', hero } = {}) {
  if (!hero?.concerns?.length || !hero.ctaHref?.startsWith('/ggulggul/?action=cdOneStepFreeSajuEntry')) throw new Error('Home hero needs concerns and a free entry href');
  const chips = hero.concerns.map(concern => `<button type="button" class="yh-chip" data-concern="${escape(concern.id)}" data-concern-href="${escape(concern.href)}" aria-pressed="false"><span>${escape(concern.label)}</span><small>${escape(concern.priceLabel)}</small></button>`).join('');
  const entryPoints = [
    ['saju', 'method-saju-160', 'home.nav.saju'],
    ['tarot', 'method-tarot-160', 'home.nav.tarot'],
    ['daily-fortune', 'method-zodiac-v1-160', 'home.todayHub.title'],
  ].map(([id, art, label]) => {
    const item = catalog.find(service => service.id === id);
    if (!item) throw new Error('Missing home entry: ' + id);
    const action = item.action ? ' data-action="' + escape(item.action) + '"' : '';
    return `<a class="yh-entry" data-cd-service-id="${id}" href="${escape(item.quickHref || item.href)}"${action}><img src="/images/home/illustrated/${art}.webp" alt="" width="72" height="72"><span data-cd-trans="${label}">${escape(item.name)}</span></a>`;
  }).join('');
  return `<section class="yh-home" data-yh-home lang="ko" aria-labelledby="cdhTitle">
    <div class="yh-hero yh-entry-scene" data-home-hero>
      <div class="yh-greeting"><h1 id="yhDesktopTitle"><span>어떤 고민이 있나요?</span></h1>
        <div class="yh-concern-chips" id="homeConcerns" data-concern-picker role="group" aria-labelledby="yhDesktopTitle" data-yh-target="0">${chips}</div>
        <p class="yh-trust"><span>${escape(hero.careerLine)} · 무료 시작 가능</span></p>
        <a class="yh-free-start" href="${escape(hero.ctaHref)}" data-cdh-free data-concern-cta data-cd-service-id="saju"><span>무료 만세력 시작하기</span> <span aria-hidden="true">→</span></a>
        <p class="yh-paid-note">상담은 유료예요. 가격과 결과 예시는 먼저 확인할 수 있어요.</p>
        <a class="yh-neo-link" href="/about/#author"><span>명리학자 ${escape(hero.scholarName)}(네오) 소개</span> <span aria-hidden="true">→</span></a></div>
      <div class="yh-art" aria-hidden="true"><img id="honeypigLogo" data-character="yeoni" src="/images/home/illustrated/yeoni-character-480.webp" srcset="/images/home/illustrated/yeoni-character-320.webp 320w, /images/home/illustrated/yeoni-character-480.webp 480w, /images/home/illustrated/yeoni-character-800.webp 800w" sizes="(max-width:600px) 156px, 270px" width="800" height="800" fetchpriority="high" decoding="async" alt=""></div>
    </div>
    <h2 class="yh-entry-title" id="cdhTitle" data-cd-trans="home.gardenCopy.quickTitle">어떤 운세를 볼까요?</h2>
    <nav class="yh-entries" aria-labelledby="cdhTitle" data-yh-target="1">${entryPoints}</nav>
    <button type="button" class="yh-guide-open" data-yh-start><span>연이와 함께 둘러보기</span> <span aria-hidden="true">→</span></button>
    <a class="yh-all" href="/?action=cdOpenAllFortunes" data-action="cdOpenAllFortunes"><span data-cd-trans="home.gardenCopy.allFortunes">모든 운세 보기</span><span aria-hidden="true">→</span></a>
    <nav class="yh-links" aria-labelledby="yhRecordsTitle" data-yh-target="2"><details><summary id="yhRecordsTitle">나의 상담 다시 보기</summary><a href="/records/">꿀꿀 운세 기록 <span aria-hidden="true">→</span></a><a href="/yeongnyangi/library/">영냥이 상담 기록 <span aria-hidden="true">→</span></a></details></nav>
    ${installHtml}
    <span id="homeExplore" aria-hidden="true"></span><span id="homeServices" aria-hidden="true"></span>
    <a class="yh-guide-open" href="/#homeStoryTitle"><span data-cd-trans="home.guideCopy.webtoonMore">다른 마스터의 상담 웹툰 보기</span> <span aria-hidden="true">→</span></a>
    <section class="yh-guide" data-yh-guide hidden aria-label="연이의 화면 안내" tabindex="-1"><div class="yh-portrait" aria-hidden="true"><img data-yh-portrait-src="/assets/yeoni/atelier/talking-pig.webp" width="1280" height="384" loading="lazy" decoding="async" alt=""></div><div class="yh-speech"><div class="yh-guide-head"><strong>꽃돼지 연이</strong><span data-yh-progress></span><button type="button" data-yh-close aria-label="안내 닫기">×</button></div><p data-yh-line aria-live="polite"></p><div class="yh-guide-actions"><button type="button" data-yh-skip>건너뛰기</button><button type="button" data-yh-prev>이전</button><button type="button" data-yh-next>다음</button></div></div></section>
  </section>`;
}

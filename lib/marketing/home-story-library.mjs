import { PROLOGUE, prologuePage } from '../yeongnyangi/prologue.mjs';
import { homeStories } from '../brand/home-stories.mjs';

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const featured = ['new-year', 'love-secret', 'heukwol', 'life-book'];

function storyCard({ id, title, lead }) {
  const href = id === 'heukwol' ? '/heukwol/#heukwol-story' : `/consultations/${id}/#story`;
  return `<li><a class="yh-book" href="${href}"><span class="yh-book-cover"><img src="/images/consultation-webtoons/covers/mobile/${id}.webp" width="320" height="400" alt="" loading="lazy" decoding="async"><strong>${escape(title)}</strong></span><span class="yh-book-lead">${escape(lead)}</span></a></li>`;
}

export function renderStoryLibrary() {
  return `<section class="yh-library" aria-labelledby="homeStoryTitle" data-prologue-pages="${PROLOGUE.pages.length}">
    <header class="yh-shelf-head"><h2 id="homeStoryTitle" tabindex="-1">달빛 웹툰 서가</h2>
      <nav aria-label="웹툰 종류"><a href="#yhStorySeries">이야기 웹툰</a><a href="#yhStoryConsult">상담 웹툰</a><a href="#yhStoryGuide">이용 안내</a></nav></header>
    <article class="yh-serial" id="yhStorySeries"><a class="yh-serial-cover" href="${PROLOGUE.href}" aria-label="영냥이 프롤로그 첫 화 보기"><img src="${prologuePage(1)}-720.webp" width="720" height="900" alt="" loading="lazy"></a>
      <div><small>영냥이와 연이 · 시즌 1</small><h3>${escape(PROLOGUE.title)}</h3><p>${escape(PROLOGUE.logline)}</p>
      <nav aria-label="연재 웹툰 읽기"><a href="${PROLOGUE.href}">첫 화 보기</a><a data-serial-latest href="/yeongnyangi/season-1/">최신화 보기</a><a data-serial-resume hidden></a></nav><a class="yh-season-link" href="/yeongnyangi/season-1/"><span>전체 회차 보기</span> <span aria-hidden="true">→</span></a></div></article>
    <div class="yh-story-pair"><a href="/recipes/"><img src="/images/five-elements/recipe-entry-640.webp" width="640" height="427" alt="" loading="lazy"><span><strong>연이의 사주 요리법</strong><small>요리법 레시피 웹툰 보기</small></span></a>
    <a href="/moonlit-lotus/story/"><img src="/images/home/illustrated/yeoni-moon-garden-night-640.webp" width="640" height="427" alt="" loading="lazy"><span><strong>달빛 연화당</strong><small>연이의 이야기 읽기</small></span></a></div>
    <h3 id="yhStoryConsult">대표 상담을 웹툰으로</h3><ul class="yh-book-grid">${featured.map(id=>storyCard(homeStories.find(story=>story.id===id))).join('')}</ul>
    <details class="yh-shelf-more"><summary>웹툰 전체 보기</summary><ul class="yh-book-grid">${homeStories.filter(story=>!featured.includes(story.id)).map(storyCard).join('')}</ul></details>
    <a class="yh-shelf-guide" id="yhStoryGuide" href="/entry-webtoon/"><img src="/images/entry-webtoon/imagine-desk-720.webp" width="72" height="64" alt="" loading="lazy"><strong>꿀꿀운세 이용 안내 웹툰</strong><span aria-hidden="true">→</span></a>
  </section>`;
}

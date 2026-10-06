import { visibleReviews } from './customer-reviews.mjs';

// Career scope: founder.ts and about-copy.js; consultation/lecture experience:
// consented neo-1on1 and neo-lecture records in customer-reviews.mjs.
export const neoHomeIntroduction = Object.freeze({
  title: '명리학자 박병하, 네오',
  lead: '10년의 명리 공부와 상담을 바탕으로, 삶의 고민과 선택을 함께 읽습니다.',
  experience: [
    { title: '10년의 명리 공부와 상담' },
    { title: '직접 진행한 1:1 상담' },
    { title: '사주 강의와 공개 글' },
  ],
  reviewsTitle: '상담과 강의 후기',
  note: '직접 상담·강의의 후기 발췌입니다. AI 상담 후기와 구분되며, 같은 결과를 보장하지 않습니다.',
});

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function renderNeoHomeIntroduction() {
  const copy = neoHomeIntroduction;
  const reviews = visibleReviews();
  const excerpts = [
    { id: 'kakao-077', quote: reviews.find(review => review.id === 'kakao-077')?.highlight, source: '1:1 상담 이용자 · 카카오톡 후기 발췌' },
    { id: 'kakao-006', quote: reviews.find(review => review.id === 'kakao-006')?.bubbles[0], source: '사주 강의 수강생 · 카카오톡 후기 발췌' },
  ];
  if (excerpts.some(item => !item.quote)) throw new Error('Neo author introduction requires consented source reviews');
  return `<section class="cdh-author" aria-labelledby="cdhAuthorTitle">
    <div class="cdh-author__intro">
    <div class="cdh-author__portrait"><img src="/assets/yeongnyangi/original/hero-480.webp" width="480" height="480" loading="lazy" decoding="async" alt="서비스 캐릭터 영냥이"></div>
    <div class="cdh-author__copy">
      <h2 id="cdhAuthorTitle">${escapeHtml(copy.title)}</h2>
      <p class="cdh-author__lead">${escapeHtml(copy.lead)}</p>
    </div></div>
      <ul class="cdh-author__experience">${copy.experience.map(item => `<li>${escapeHtml(item.title)}</li>`).join('')}</ul>
      <div class="cdh-author__reviews"><h3>${escapeHtml(copy.reviewsTitle)}</h3><div>${excerpts.map(item => `<figure data-review-id="${item.id}"><blockquote lang="ko"><p>“${escapeHtml(item.quote)}”</p></blockquote><figcaption>${escapeHtml(item.source)}</figcaption></figure>`).join('')}</div></div>
      <p class="cdh-author__note">${escapeHtml(copy.note)}</p>
      <nav aria-label="네오 소개와 후기"><a href="/about/#author"><span data-cd-trans="home.overseasCopy.neoAbout">네오와 서비스 소개</span><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></a><a href="#cdhReviewsTitle">상담 후기 더 읽기</a></nav>
  </section>`;
}

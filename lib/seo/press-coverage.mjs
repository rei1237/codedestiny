// Verified against the publisher's original article on 2026-09-30.
// Keep the publisher's headline unchanged; the summary is our own wording.
export const PRESS_COVERAGE = Object.freeze({
  publisher: "스타트업데일리",
  datePublished: "2026-09-30",
  dateLabel: "2026. 9. 30.",
  url: "https://www.startupdaily.kr/news/articleView.html?idxno=10891",
  headline: "“운세보다 내 고민부터”… 코드 데스니티, 고양이 ‘영냥이’와 꽃돼지 ‘연이’로 운세 경험 넓혀",
  summary: "스타트업데일리가 꿀꿀 사주(당시 꿀꿀 운세)와 영냥이를 소개했습니다. 고민에서 출발하는 상담 방식과 두 캐릭터의 이야기를 기사에서 만나보세요.",
});

const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

export const PRESS_IMAGE = {
  src: "/images/press/yeongnyangi-yeoni-1200.webp",
  srcSet: "/images/press/yeongnyangi-yeoni-640.webp 640w, /images/press/yeongnyangi-yeoni-960.webp 960w, /images/press/yeongnyangi-yeoni-1200.webp 1200w",
  sizes: "(max-width: 700px) 100vw, 520px",
  alt: "달빛이 비치는 상담방에서 타로 카드를 함께 펼친 고양이 영냥이와 꽃돼지 연이",
  width: 1200,
  height: 800,
};

export function renderPressCoverageCopyHtml() {
  const article = PRESS_COVERAGE;
  return `<div class="cd-press__content">
    <div class="cd-press__intro">
      <h2 id="cdPressTitle">언론에 소개된 꿀꿀 사주</h2>
      <p>${escapeHtml(article.summary)}</p>
    </div>
    <article class="cd-press__article">
      <p class="cd-press__source">${escapeHtml(article.publisher)} · <time datetime="${article.datePublished}">${article.dateLabel}</time></p>
      <h3><a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer"><span lang="ko">${escapeHtml(article.headline)}</span><span class="cd-press__action">기사 원문 읽기 <span class="cd-press__window">(새 창)</span> <span aria-hidden="true">↗</span></span></a></h3>
    </article>
  </div>`;
}

// Shared copy for the generated static home and React information pages.
export function renderPressCoverageHtml() {
  return `<section class="cd-press" aria-labelledby="cdPressTitle">
    <img class="cd-press__image" src="${PRESS_IMAGE.src}" srcset="${PRESS_IMAGE.srcSet}" sizes="${PRESS_IMAGE.sizes}" alt="${escapeHtml(PRESS_IMAGE.alt)}" width="${PRESS_IMAGE.width}" height="${PRESS_IMAGE.height}" loading="lazy" decoding="async">
    ${renderPressCoverageCopyHtml()}
  </section>`;
}

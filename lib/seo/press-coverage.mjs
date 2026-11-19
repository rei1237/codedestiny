// Verified against the publisher's original article on 2026-09-30.
// Keep the publisher's headline unchanged; the summary is our own wording.
export const PRESS_COVERAGE = Object.freeze({
  publisher: "스타트업데일리",
  datePublished: "2026-09-30",
  dateLabel: "2026. 9. 30.",
  url: "https://www.startupdaily.kr/news/articleView.html?idxno=10891",
  headline: "“운세보다 내 고민부터”… 코드 데스니티, 고양이 ‘영냥이’와 꽃돼지 ‘연이’로 운세 경험 넓혀",
  summary: "스타트업데일리가 꿀꿀운세와 영냥이를 소개했습니다. 고민에서 출발하는 상담 방식과 두 캐릭터의 이야기를 기사에서 만나보세요.",
});

// Verified against the publisher's original article on 2026-11-19.
export const LATEST_PRESS_COVERAGE = Object.freeze({
  publisher: "스타트업데일리",
  datePublished: "2026-11-06",
  dateLabel: "2026. 11. 6.",
  url: "https://www.startupdaily.kr/news/articleView.html?idxno=11118",
  headline: "명리학자의 상담 경험, '꿀꿀운세'의 초융합 운세와 캐릭터 서사로 확장",
  summary: "박병하 대표의 명리 연구와 상담 경험, 여섯 가지 운세 체계를 비교하는 초융합 운세, 연이와 영냥이의 이야기를 소개합니다.",
});

export const PRESS_ARTICLES = Object.freeze([LATEST_PRESS_COVERAGE, PRESS_COVERAGE]);

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
  return `<div class="cd-press__content">
    <div class="cd-press__intro">
      <h2 id="cdPressTitle">언론에 소개된 꿀꿀운세</h2>
      <p>초융합 운세와 영냥이·연이의 이야기를 소개한 기사를 읽어보세요.</p>
    </div>
    ${PRESS_ARTICLES.map((article) => `<article class="cd-press__article">
      <p class="cd-press__source">${escapeHtml(article.publisher)} · <time datetime="${article.datePublished}">${article.dateLabel}</time></p>
      <h3><a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer"><span lang="ko">${escapeHtml(article.headline)}</span><span class="cd-press__action">기사 원문 읽기 <span class="cd-press__window">(새 창)</span> <span aria-hidden="true">↗</span></span></a></h3>
      <p>${escapeHtml(article.summary)}</p>
    </article>`).join("\n    ")}
  </div>`;
}

// Shared copy for the generated static home and React information pages.
export function renderPressCoverageHtml() {
  return `<section class="cd-press" aria-labelledby="cdPressTitle">
    <img class="cd-press__image" src="${PRESS_IMAGE.src}" srcset="${PRESS_IMAGE.srcSet}" sizes="${PRESS_IMAGE.sizes}" alt="${escapeHtml(PRESS_IMAGE.alt)}" width="${PRESS_IMAGE.width}" height="${PRESS_IMAGE.height}" loading="lazy" decoding="async">
    ${renderPressCoverageCopyHtml()}
  </section>`;
}

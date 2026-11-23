import newYear from '../../content/product-details/new-year-expert/manifest.json' with { type: 'json' };
import loveSecret from '../../content/product-details/love-secret/manifest.json' with { type: 'json' };
import lifeBook from '../../content/product-details/life-book/manifest.json' with { type: 'json' };
import { renderHeukwolPreview } from './yehwa-home.mjs';

const editions = new Map([newYear, loveSecret, lifeBook].map(edition => [edition.featureKey, edition]));
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const bookIcon = '<svg class="yh-chapter-preview__book" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.5C9.3 4.8 6.5 4.4 3 5v13c3.5-.6 6.3-.2 9 1.5 2.7-1.7 5.5-2.1 9-1.5V5c-3.5-.6-6.3-.2-9 1.5Zm0 0v13"/></svg>';
const panelsIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16m0-9h9"/></svg>';

function renderEditionPreview(edition) {
  const groups = new Map();
  for (const chapter of edition.chapters) {
    if (!groups.has(chapter.detail)) groups.set(chapter.detail, []);
    groups.get(chapter.detail).push(chapter);
  }
  const parts = Array.from(groups, ([part, chapters]) => `<li class="yh-chapter-preview__part"><div class="yh-chapter-preview__heading"><strong>${escape(part)}</strong></div><ul class="yh-chapter-preview__titles">${chapters.map(chapter => `<li>${escape(chapter.title)}</li>`).join('')}</ul></li>`).join('');
  return `<details class="yh-chapter-preview"><summary class="yh-chapter-preview__toggle">${bookIcon}<span class="yh-chapter-preview__show">챕터 자세히 보기</span><span class="yh-chapter-preview__hide">챕터 접기</span></summary>
    <div class="yh-chapter-preview__panel" tabindex="0" role="region" aria-label="상담서 목차"><header class="yh-chapter-preview__front"><p class="yh-chapter-preview__kicker">${escape(edition.chaptersLabel)}</p></header><ol class="yh-chapter-preview__parts" aria-label="상담서 목차">${parts}</ol></div></details>`;
}

export function renderFeaturedActions(item, story) {
  const isHeukwol = item.featureKey === 'heukwol-warning-consultation';
  const edition = editions.get(item.featureKey);
  if (!isHeukwol && (!edition || !story)) throw new Error(`Missing featured consultation preview for ${item.featureKey}`);
  const href = isHeukwol ? '/heukwol/#heukwol-story' : `/consultations/${story.id}/#story`;
  return `<div class="yh-featured-actions">${isHeukwol ? renderHeukwolPreview() : renderEditionPreview(edition)}
    <a class="yh-webtoon-action" href="${href}" aria-label="${escape(item.name)} 웹툰으로 알아보기"${isHeukwol ? ' data-cd-trans-attr="aria-label:home.shelf.webtoonFor" data-cd-vars=\'{"title":"@home.moonlit.heukwolTitle"}\'' : ''}>${panelsIcon}<span>웹툰으로 알아보기</span><span aria-hidden="true">→</span></a></div>`;
}

/** The static popup and React pages render the same escaped, display-only panels. */
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const safeImage = value => {
  const text = String(value || '');
  if (/^\/(?!\/)/.test(text)) return text;
  try { const url = new URL(text); return url.protocol === 'https:' && ['assets.code-destiny.com', 'code-destiny.com'].includes(url.hostname) ? url.href : ''; }
  catch { return ''; }
};
const themeNames = new Set(['rose', 'emerald', 'navy', 'violet', 'indigo', 'saffron', 'burgundy']);

function transcriptBody(panel) {
  const text = String(panel.text || '');
  const title = String(panel.title || '').replace(/\s/g, '');
  let length = 0;
  for (let index = 0; index < text.length && length < title.length; index++) {
    if (/\s/.test(text[index])) continue;
    if (text[index] !== title[length++]) return text;
    if (length === title.length) return text.slice(index + 1).trimStart();
  }
  return text;
}

const craftedPanels = detail => (detail?.panels || []).filter(panel => safeImage(panel.src) && panel.text);
const won = value => Number(value) > 0 ? `${Number(value).toLocaleString('ko-KR')}원` : '';
const chevron = '<svg class="craftedCardChevron" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** The real report contents, as text, ahead of the illustrated pages. */
function renderChapters(detail) {
  const chapters = (Array.isArray(detail.chapters) ? detail.chapters : []).filter(item => item?.title);
  if (!chapters.length) return '';
  return `<section class="craftedChapters"><p class="craftedChaptersTitle">${escape(detail.chaptersLabel || '받게 될 상담지 목차')}<span>${chapters.length}개</span></p><ol>${chapters.map(item => `<li><strong>${escape(item.title)}</strong>${item.detail ? `<span>${escape(item.detail)}</span>` : ''}</li>`).join('')}</ol></section>`;
}

/** Keep the full essay available as text, without duplicate image-alt narration. */
export function renderCraftedDetail(detail, { eager = true } = {}) {
  const panels = craftedPanels(detail);
  if (!panels.length) return '';
  return `<div class="craftedDetail">${renderChapters(detail)}<div aria-hidden="true">${panels.map((panel, index) => `<img src="${escape(safeImage(panel.src))}" alt="" width="${Number(panel.width) || 1080}" height="${Number(panel.height) || 1440}" loading="${index || !eager ? 'lazy' : 'eager'}" decoding="async"${index || !eager ? '' : ' fetchpriority="high" data-lcp-candidate="1"'}>`).join('')}</div><p class="craftedDetailNotice">${escape(detail.notice)}</p><details class="craftedDetailTranscript"><summary>상세 안내를 글로 읽기</summary>${panels.map(panel => `<section><h3>${escape(panel.title)}</h3><p>${escape(transcriptBody(panel))}</p></section>`).join('')}</details></div>`;
}

export function revealCraftedTranscript(event) {
  if (event.target?.tagName !== 'IMG') return;
  const transcript = event.target.closest('.craftedDetail')?.querySelector('.craftedDetailTranscript');
  if (transcript) transcript.open = true;
}

export async function loadInlineCraftedDetail(detail, fetcher = fetch) {
  if (!detail?.inlineAliases || !detail.craftedManifest) return detail;
  if (!/^\/feature-details\/crafted\/[a-z0-9-]+\/manifest\.json$/.test(detail.craftedManifest)) throw new Error('INVALID_CRAFTED_DETAIL');
  const response = await fetcher(detail.craftedManifest);
  if (!response.ok) throw new Error('CRAFTED_DETAIL_UNAVAILABLE');
  return { ...detail, crafted: [await response.json()] };
}

function renderStory(story, heading) {
  if (!story?.title || !story.text) return '';
  const art = safeImage(story.image);
  return `<section class="fortuneStory">${art ? `<img src="${escape(art)}" alt="${escape(story.alt)}" width="960" height="540" loading="lazy" decoding="async">` : ''}<div><${heading}>${escape(story.title)}</${heading}><p>${escape(story.text)}</p></div></section>`;
}

function renderFounder(founder, heading) {
  if (!founder?.credential || !founder.method) return '';
  return `<section class="featureDetailPanel fortuneFounder" data-purchase-stage="trust"><${heading}>${escape(founder.credential)}</${heading}><p class="fortuneFounderMethod">${escape(founder.method)}</p><a href="/yeongnyangi/#founder-records">네오 1:1 상담 실제 후기 보기</a><p class="fortuneSampleNote">사람에게 받은 1:1 상담·강의의 후기입니다. 이 상품의 AI 결과 이용 후기와는 구분해 읽어주세요.</p><a href="/about/#author">상담사 네오 소개</a></section>`;
}

function renderContents(detail, heading) {
  if (!detail.contents?.length) return '';
  return `<section class="featureDetailPanel fortuneContents" data-purchase-stage="consideration"><${heading}>당신이 받게 될 결과</${heading}><ol>${detail.contents.map((item, i) => `<li><span aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><div><strong>${escape(item.title)}</strong>${item.detail ? `<p>${escape(item.detail)}</p>` : ''}</div></li>`).join('')}</ol></section>`;
}

function renderSample(detail, heading) {
  const sample = detail.sample;
  if (!sample?.text) return '';
  return `<section class="featureDetailPanel fortuneSample" data-purchase-stage="interest"><${heading}>결과 미리보기</${heading}><p class="fortuneSampleNote">${escape(sample.note || '풀이 형식을 보여주는 예시입니다. 실제 내용은 입력한 정보에 따라 달라집니다.')}</p><div class="fortuneSamplePage"><p class="fortuneSampleTitle">${escape(sample.title)}</p>${sample.evidence?.length ? `<ul class="fortuneEvidence">${sample.evidence.map(item => `<li>${escape(item)}</li>`).join('')}</ul>` : ''}<p>${escape(sample.text)}</p>${sample.action ? `<div class="fortuneSampleAction"><strong>오늘의 작은 선택</strong><p>${escape(sample.action)}</p></div>` : ''}</div></section>`;
}

function craftedMeta(item) {
  return [item.chapters?.length ? `목차 ${item.chapters.length}개` : '', `그림 안내 ${craftedPanels(item).length}장`, won(item.priceKRW)].filter(Boolean).join(' · ');
}

/** One product card per edition; a single edition stays open because it is the whole page. */
function renderCraftedEditions(items, heading, sharedBadge) {
  if (items.length === 1) return `<section class="featureDetailPanel craftedEditions" data-purchase-stage="interest"><${heading}>상담 구성 한눈에 보기</${heading}><p class="craftedEditionsLead">${escape(craftedMeta(items[0]))}</p><div class="craftedEdition" data-crafted-card>${renderCraftedDetail(items[0], { eager: false })}</div></section>`;
  const prefix = items.every(item => String(item.title || '').includes(' · ')) ? String(items[0].title).split(' · ')[0] + ' · ' : '';
  const shared = prefix && items.every(item => item.title.startsWith(prefix));
  const cards = items.map(item => {
    const cover = craftedPanels(item)[0];
    const badge = item.badge && item.badge !== sharedBadge ? `<span class="craftedCardBadge">${escape(item.badge)}</span>` : '';
    return `<details class="craftedEdition" data-crafted-card><summary><img class="craftedCardCover" src="${escape(safeImage(cover.src))}" alt="" width="${Number(cover.width) || 1080}" height="${Number(cover.height) || 1440}" loading="lazy" decoding="async"><span class="craftedCardText"><strong>${escape(item.cardTitle || (shared ? item.title.slice(prefix.length) : item.title))}</strong><span class="craftedCardHook">${escape(item.hook || cover.title)}</span><span class="craftedCardMeta">${escape(craftedMeta(item))}</span>${badge}</span>${chevron}</summary><div class="craftedEditionBody">${renderCraftedDetail(item, { eager: false })}</div></details>`;
  }).join('');
  return `<section class="featureDetailPanel craftedEditions" data-purchase-stage="interest"><${heading}>${items.length}가지 상담 중에서 골라 보세요</${heading}><p class="craftedEditionsLead">상담을 펼치면 실제 목차와 그림 안내를 차례로 볼 수 있어요.</p>${cards}</section>`;
}

export function renderFeatureDetailPanels(detail, { headingLevel = 3, conversionPrompt = false, startPriceLabel } = {}) {
  if (!detail || detail.verification !== 'verified') return '';
  const heading = headingLevel === 2 ? 'h2' : 'h3';
  const hero = safeImage(detail.image);
  const variants = hero ? (detail.heroVariants || []).filter(item => safeImage(item.src) && Number(item.width) > 0) : [];
  const srcset = variants.map(item => `${escape(safeImage(item.src))} ${item.width}w`).join(', ');
  const journey = detail.journey || {};
  const questions = [...new Set((journey.questions || []).filter(Boolean))];
  const hook = detail.headline || questions[0];
  const prompt = conversionPrompt ? '<button type="button" class="featureDetailConversion" data-feature-conversion-request>가격·이용 방법 확인하기</button>' : '';
  const heroActionHtml = startPriceLabel !== undefined && /^\/(?!\/)/.test(detail.href || '') ? `<div class="fortuneAction"><p>${escape(startPriceLabel)}</p><a href="${escape(detail.href)}">${escape(detail.ctaLabel)}</a></div>` : '';
  const method = detail.method ? `<section class="featureDetailPanel fortuneMethod"><${heading}>${escape(detail.method.title)}</${heading}><p>${escape(detail.method.text)}</p>${detail.method.inputs?.length ? `<ul class="fortuneEvidence">${detail.method.inputs.map(value => `<li>${escape(value)}</li>`).join('')}</ul>` : ''}</section>` : '';
  const questionList = questions.length ? `<section class="featureDetailPanel fortuneQuestions"><${heading}>이런 고민을 하고 있다면</${heading}><ul class="featureDetailQuestions">${questions.slice(0, 3).map(question => `<li>${escape(question)}</li>`).join('')}</ul></section>` : '';
  const benefits = detail.benefits?.length ? `<section class="featureDetailPanel fortuneBenefits"><${heading}>이 운세에서 알 수 있어요</${heading}><ul>${detail.benefits.slice(0, 6).map(item => `<li>${escape(item)}</li>`).join('')}</ul></section>` : '';
  const theme = themeNames.has(detail.theme) ? detail.theme : 'navy';
  const material = ['book', 'letter'].includes(detail.material) ? detail.material : '';
  const portrait = material && hero ? `<figure class="fortuneObject" aria-label="${escape(detail.imageAlt)}"><img src="${escape(hero)}"${srcset ? ` srcset="${srcset}" sizes="(max-width: 699px) 190px, 280px"` : ''} width="${Number(detail.imageWidth) || 900}" height="${Number(detail.imageHeight) || 1200}" alt="" decoding="async" fetchpriority="high"><figcaption>${escape(detail.title)}</figcaption></figure>` : '';
  const related = detail.accessType !== 'free' && detail.related?.length ? `<section class="featureDetailPanel fortuneRelated"><${heading}>이 이야기가 궁금했다면</${heading}><div>${detail.related.slice(0, 4).filter(item => /^[a-z0-9-]+$/.test(item.slug)).map(item => `<a href="/features/${escape(item.slug)}/">${safeImage(item.image) ? `<img src="${escape(safeImage(item.image))}" alt="" width="320" height="180" loading="lazy" decoding="async">` : ''}<strong>${escape(item.title)}</strong><p>${escape(item.hook)}</p></a>`).join('')}</div></section>` : '';
  const trust = journey.trustNotes?.length ? `<section class="featureDetailPanel featureDetailBody" data-purchase-stage="trust"><${heading}>해석을 읽기 전에</${heading}><ul class="featureDetailItems">${journey.trustNotes.map(note => `<li>${escape(note)}</li>`).join('')}</ul></section>` : '';
  const share = conversionPrompt && !detail.inlineAliases ? `<section class="featureDetailPanel featureDetailBody" data-purchase-stage="advocacy" data-feature-share-section><${heading}>이 이야기가 떠오르는 사람이 있나요?</${heading}><p>함께 궁금했던 질문이라면 이 기능을 소개해 보세요. 개인 결과 대신, 지금 보고 있는 기능 소개가 전달됩니다.</p><div class="featureDetailShareActions"><button type="button" data-feature-share="native">이 기능 소개 공유하기</button><button type="button" data-feature-share="copy">소개 링크 복사</button><button type="button" data-feature-share="site">CODE DESTINY 소개하기</button></div><input hidden readonly aria-label="공유할 소개 링크"><p role="status" aria-live="polite"></p></section>` : '';
  const faq = journey.faq?.length ? `<section class="featureDetailPanel featureDetailBody" data-purchase-stage="consideration"><${heading}>시작 전에 궁금한 점</${heading}>${journey.faq.map(item => `<details class="featureDetailFaq"><summary>${escape(item.q)}</summary><p>${escape(item.a)}</p></details>`).join('')}</section>` : '';
  const crafted = (detail.crafted || []).filter(item => craftedPanels(item).length);
  if (crafted.length) {
    const sharedBadge = crafted.every(item => item.badge && item.badge === crafted[0].badge) ? crafted[0].badge : '';
    const art = portrait || (hero ? `<img class="craftedHeroArt" src="${escape(hero)}"${srcset ? ` srcset="${srcset}" sizes="(max-width: 699px) 100vw, 880px"` : ''} width="${Number(detail.imageWidth) || 960}" height="${Number(detail.imageHeight) || 540}" alt="${escape(detail.imageAlt || `${detail.title}의 이야기를 담은 일러스트`)}" loading="eager" decoding="async" fetchpriority="high" data-lcp-candidate="1">` : '');
    const badge = sharedBadge ? `<p class="craftedBadge"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M5 5h14v10H10l-4 4v-4H5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>${escape(sharedBadge)}</p>` : '';
    return `<article class="featureVisualDetail" data-fortune-theme="${theme}"${material ? ` data-fortune-material="${material}"` : ''} data-crafted-introduction><header class="featureDetailPanel featureDetailHero craftedHero" data-purchase-stage="awareness">${art}<div class="featureDetailBody">${material ? '' : `<p class="fortuneCategory">${escape(detail.category || detail.title)}</p>`}<${heading}>${escape(hook || detail.title)}</${heading}>${detail.description ? `<p>${escape(detail.description)}</p>` : ''}${detail.edition ? `<p class="fortuneEdition">${escape(detail.edition)}</p>` : ''}${badge}<div data-fortune-hero-action>${heroActionHtml || prompt}</div></div></header>${renderCraftedEditions(crafted, heading, sharedBadge)}${renderSample(detail, heading)}${benefits}${faq}${share}</article>`;
  }
  return `<article class="featureVisualDetail" data-fortune-theme="${theme}"${material ? ` data-fortune-material="${material}"` : ''}><header data-purchase-stage="awareness" class="featureDetailPanel featureDetailHero">${portrait || (hero ? `<img class="featureDetailArt" src="${escape(hero)}"${srcset ? ` srcset="${srcset}" sizes="(max-width: 699px) 100vw, 720px"` : ''} width="${Number(detail.imageWidth) || 960}" height="${Number(detail.imageHeight) || 540}" alt="${escape(detail.imageAlt || `${detail.title}의 이야기를 담은 일러스트`)}" loading="eager" decoding="async" fetchpriority="high">` : '')}<div class="featureDetailBody">${material ? '' : `<p class="fortuneCategory">${escape(detail.category || detail.title)}</p>`}<${heading}>${escape(hook)}</${heading}><p>${escape(detail.description)}</p>${detail.edition ? `<p class="fortuneEdition">${escape(detail.edition)}</p>` : ''}<div data-fortune-hero-action>${heroActionHtml || prompt}</div></div></header>${renderSample(detail, heading)}${benefits}${renderContents(detail, heading)}${renderFounder(detail.founder, heading)}${questionList}${method}${renderStory(detail.storySections?.[0], heading)}${renderStory(detail.storySections?.[1], heading)}${trust}${faq}${related}${share}</article>`;
}

let catalogPromise;
const pending = new Map();
export async function loadFeatureDetail(keys, fetcher = fetch) {
  if (!catalogPromise) catalogPromise = fetcher('/feature-details/catalog.json').then(response => {
    if (!response.ok) throw new Error('DETAIL_CATALOG_UNAVAILABLE');
    return response.json();
  }).catch(error => { catalogPromise = undefined; throw error; });
  const catalog = await catalogPromise;
  let entry;
  for (const key of keys.filter(Boolean)) {
    entry = catalog.find(item => item.slug === key || item.aliases.includes(key));
    if (entry) break;
  }
  if (!entry) return null;
  if (!/^[a-z0-9-]+$/.test(entry.slug)) throw new Error('INVALID_DETAIL');
  if (!pending.has(entry.slug)) pending.set(entry.slug, fetcher(`/feature-details/${entry.slug}.json`).then(response => {
    if (!response.ok) throw new Error('DETAIL_UNAVAILABLE');
    return response.json();
  }).then(detail => {
    if (detail.verification !== 'verified') throw new Error('DETAIL_NOT_VERIFIED');
    return detail;
  }).catch(error => { pending.delete(entry.slug); throw error; }));
  return pending.get(entry.slug);
}

// 상세 시트를 여는 순간에 catalog → detail 요청을 새로 시작하면 첫 화면이 한 번 더 비어 보인다.
// 호출부는 사용자의 pointerdown/focus에서만 이 함수를 써서, 목록을 훑는 동안 모든 상품을 받지 않는다.
export function preloadFeatureDetail(keys) {
  return loadFeatureDetail(keys).catch(() => null);
}

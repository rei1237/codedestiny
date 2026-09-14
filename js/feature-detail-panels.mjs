/** The static popup and React pages render the same escaped, display-only panels. */
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const safeImage = value => {
  const text = String(value || '');
  if (/^\/(?!\/)/.test(text)) return text;
  try { const url = new URL(text); return url.protocol === 'https:' && ['assets.code-destiny.com', 'code-destiny.com'].includes(url.hostname) ? url.href : ''; }
  catch { return ''; }
};
const themeNames = new Set(['rose', 'emerald', 'navy', 'violet', 'indigo', 'saffron', 'burgundy']);

function renderStory(story, heading) {
  if (!story || !safeImage(story.image)) return '';
  return `<section class="fortuneStory"><img src="${escape(safeImage(story.image))}" alt="${escape(story.alt)}" width="960" height="540" loading="lazy" decoding="async"><div><${heading}>${escape(story.title)}</${heading}><p>${escape(story.text)}</p></div></section>`;
}

function renderContents(detail, heading) {
  if (!detail.contents?.length) return '';
  return `<section class="featureDetailPanel fortuneContents" data-purchase-stage="consideration"><${heading}>당신이 받게 될 결과</${heading}><ol>${detail.contents.map((item, i) => `<li><span aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><div><strong>${escape(item.title)}</strong>${item.detail ? `<p>${escape(item.detail)}</p>` : ''}</div></li>`).join('')}</ol></section>`;
}

function renderSample(detail, heading) {
  const sample = detail.sample;
  if (!sample?.text) return '';
  return `<section class="featureDetailPanel fortuneSample" data-purchase-stage="interest"><${heading}>결과 미리보기</${heading}><div class="fortuneSamplePage"><p class="fortuneSampleTitle">${escape(sample.title)}</p>${sample.evidence?.length ? `<ul class="fortuneEvidence">${sample.evidence.map(item => `<li>${escape(item)}</li>`).join('')}</ul>` : ''}<p>${escape(sample.text)}</p>${sample.action ? `<div class="fortuneSampleAction"><strong>오늘의 작은 선택</strong><p>${escape(sample.action)}</p></div>` : ''}</div><p class="fortuneSampleNote">${escape(sample.note || '풀이 형식을 보여주는 예시입니다. 실제 내용은 입력한 정보에 따라 달라집니다.')}</p></section>`;
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
  const related = detail.accessType !== 'free' && detail.related?.length ? `<section class="featureDetailPanel fortuneRelated"><${heading}>이 이야기가 궁금했다면</${heading}><div>${detail.related.slice(0, 4).filter(item => /^[a-z0-9-]+$/.test(item.slug)).map(item => `<a href="/features/${escape(item.slug)}/">${safeImage(item.image) ? `<img src="${escape(safeImage(item.image))}" alt="" width="320" height="180" loading="lazy" decoding="async">` : ''}<strong>${escape(item.title)}</strong><p>${escape(item.hook)}</p></a>`).join('')}</div></section>` : '';
  const trust = journey.trustNotes?.length ? `<section class="featureDetailPanel featureDetailBody" data-purchase-stage="trust"><${heading}>해석을 읽기 전에</${heading}><ul class="featureDetailItems">${journey.trustNotes.map(note => `<li>${escape(note)}</li>`).join('')}</ul></section>` : '';
  const share = conversionPrompt ? `<section class="featureDetailPanel featureDetailBody" data-purchase-stage="advocacy" data-feature-share-section><${heading}>이 이야기가 떠오르는 사람이 있나요?</${heading}><p>함께 궁금했던 질문이라면 이 기능을 소개해 보세요. 개인 결과 대신, 지금 보고 있는 기능 소개가 전달됩니다.</p><div class="featureDetailShareActions"><button type="button" data-feature-share="native">이 기능 소개 공유하기</button><button type="button" data-feature-share="copy">소개 링크 복사</button><button type="button" data-feature-share="site">CODE DESTINY 소개하기</button></div><input hidden readonly aria-label="공유할 소개 링크"><p role="status" aria-live="polite"></p></section>` : '';
  const faq = journey.faq?.length ? `<section class="featureDetailPanel featureDetailBody" data-purchase-stage="consideration"><${heading}>시작 전에 궁금한 점</${heading}>${journey.faq.map(item => `<details class="featureDetailFaq"><summary>${escape(item.q)}</summary><p>${escape(item.a)}</p></details>`).join('')}</section>` : '';
  return `<article class="featureVisualDetail" data-fortune-theme="${theme}"><header data-purchase-stage="awareness" class="featureDetailPanel featureDetailHero">${hero ? `<img class="featureDetailArt" src="${escape(hero)}"${srcset ? ` srcset="${srcset}" sizes="(max-width: 699px) 100vw, 720px"` : ''} width="960" height="540" alt="${escape(detail.imageAlt || `${detail.title}의 이야기를 담은 일러스트`)}" loading="eager" decoding="async" fetchpriority="high">` : ''}<div class="featureDetailBody"><p class="fortuneCategory">${escape(detail.category || detail.title)}</p><${heading}>${escape(hook)}</${heading}><p>${escape(detail.description)}</p>${detail.edition ? `<p class="fortuneEdition">${escape(detail.edition)}</p>` : ''}<div data-fortune-hero-action>${heroActionHtml || prompt}</div></div></header>${benefits}${questionList}${renderStory(detail.storySections?.[0], heading)}${renderContents(detail, heading)}${renderSample(detail, heading)}${method}${renderStory(detail.storySections?.[1], heading)}${trust}${faq}${related}${share}</article>`;
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

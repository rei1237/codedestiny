/** The static popup and React pages render the same escaped, display-only panels. */
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const safeImage = value => {
  const text = String(value || '');
  if (/^\/(?!\/)/.test(text)) return text;
  try { const url = new URL(text); return url.protocol === 'https:' && ['assets.code-destiny.com', 'code-destiny.com'].includes(url.hostname) ? url.href : ''; }
  catch { return ''; }
};

function renderVisualPreview(kind) {
  if (kind === 'book') return `<div class="featureEditorial featureEditorialBook" aria-label="인생의 책에서 만나는 내용"><svg viewBox="0 0 400 200" aria-hidden="true" focusable="false"><path d="M200 171C158 147 100 140 38 153V36C96 22 158 34 200 59C242 34 304 22 362 36V153C300 140 242 147 200 171Z" fill="#eee2cc" stroke="#bba67d" stroke-width="2"/><path d="M200 59V171M38 153L29 162C93 148 153 159 200 182C247 159 307 148 371 162L362 153" fill="none" stroke="#bba67d" stroke-width="2"/><path d="M67 66Q121 57 169 82M67 86Q121 77 169 102M67 106Q121 97 149 112M230 80Q278 56 332 65M230 100Q278 76 332 85M230 120Q278 96 309 101" fill="none" stroke="#bcad91" stroke-width="2"/><path d="M289 28V89L280 81L271 88V30" fill="#716674"/></svg><div class="featureEditorialCopy"><p class="featureEditorialTitle">한 권에 담는<br>나라는 사람의 맥락</p><dl><div><dt>타고난 기질</dt><dd>나를 움직이는 바탕</dd></div><div><dt>삶의 흐름</dt><dd>시간과 함께 읽는 변화</dd></div><div><dt>장별 해석</dt><dd>차근차근 연결되는 이야기</dd></div></dl></div></div>`;
  if (kind === 'animal') return `<div class="featureEditorial featureEditorialAnimal" aria-label="운명의 동물 도감에서 만나는 내용"><svg viewBox="0 0 400 240" aria-hidden="true" focusable="false"><path d="M78 179Q49 155 63 125Q82 141 78 179M321 179Q348 151 337 121Q316 139 321 179" fill="#a7b398"/><path d="M64 193Q48 167 26 171Q33 193 64 193M335 193Q351 167 373 171Q366 193 335 193" fill="#c5c9b3"/><path d="M122 108C93 73 106 42 134 43C153 44 163 62 166 73M234 73C237 62 247 44 266 43C294 42 307 73 278 108" fill="#ceb595" stroke="#786656" stroke-width="3"/><path d="M112 149C105 100 141 72 200 72C259 72 295 100 288 149C304 195 264 219 200 218C136 219 96 195 112 149Z" fill="#decaad" stroke="#786656" stroke-width="3"/><path d="M139 164C138 139 161 133 177 148Q200 157 223 148C239 133 262 139 261 164C266 188 239 203 200 202C161 203 134 188 139 164Z" fill="#f7efe0"/><path d="M160 125V131M240 125V131" stroke="#544d46" stroke-width="6" stroke-linecap="round"/><path d="M192 148Q200 142 208 148L200 156Z" fill="#98766b"/><path d="M200 156V163M188 165Q194 171 200 163Q206 171 212 165" fill="none" stroke="#786656" stroke-width="2.5" stroke-linecap="round"/></svg><div class="featureEditorialCopy"><p class="featureEditorialTitle">상징에서 발견하는<br>나만의 성장 방향</p><dl><div><dt>나의 성향</dt><dd>동물로 만나는 나의 모습</dd></div><div><dt>오늘의 행동</dt><dd>일상에서 시작할 작은 변화</dd></div><div><dt>성장 미션</dt><dd>나의 리듬을 알아가는 한 걸음</dd></div></dl></div></div>`;
  return '';
}

export function renderFeatureDetailPanels(detail, { headingLevel = 3 } = {}) {
  if (!detail || detail.verification !== 'verified') return '';
  const heading = headingLevel === 2 ? 'h2' : 'h3';
  const hero = safeImage(detail.image);
  const variants = (detail.heroVariants || []).filter(item => safeImage(item.src) && Number.isInteger(item.width) && item.width > 0 && item.width <= 2048);
  const srcset = variants.map(item => `${escape(safeImage(item.src))} ${item.width}w`).join(', ');
  const panels = (detail.panels || []).map(panel => {
    const capture = panel.verifiedCapture;
    const illustration = renderVisualPreview(panel.visualPreview);
    const captureSrc = safeImage(capture?.src);
    return `<section class="featureDetailPanel featureDetailBody${captureSrc || illustration ? ' featureDetailPreview' : ''}"><div><${heading}>${escape(panel.title)}</${heading}>${panel.text ? `<p>${escape(panel.text)}</p>` : ''}${panel.items?.length ? `<ul class="featureDetailItems">${panel.items.map(item => `<li>${escape(item)}</li>`).join('')}</ul>` : ''}${panel.steps?.length ? `<ol class="featureDetailSteps">${panel.steps.map(step => `<li><strong>${escape(step.label)}</strong><p>${escape(step.detail)}</p></li>`).join('')}</ol>` : ''}</div>${illustration || (captureSrc ? `<figure><img src="${escape(captureSrc)}" alt="${escape(capture.alt)}" loading="lazy" decoding="async" width="${Number(capture.width) || 380}" height="${Number(capture.height) || 480}"><figcaption>${escape(capture.label)}</figcaption></figure>` : '')}</section>`;
  }).join('');
  return `<article class="featureVisualDetail"><header class="featureDetailPanel featureDetailHero">${hero ? `<img class="featureDetailArt" src="${escape(hero)}"${srcset ? ` srcset="${srcset}" sizes="(max-width: 699px) 100vw, 480px"` : ''} width="960" height="540" alt="${escape(detail.title)}" loading="eager" decoding="async">` : ''}<div class="featureDetailBody"><${heading}>${escape(detail.headline)}</${heading}><p>${escape(detail.description)}</p></div></header>${panels}</article>`;
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

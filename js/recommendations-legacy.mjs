export { adviceTopics } from './recommendations-context.mjs';
import { adviceTopics } from './recommendations-context.mjs';
import { RECOMMENDATIONS_RELEASED, RESULT_PRODUCT_LIMIT, normalizeContext, validateAffiliateUrl, validImageUrl, serviceRule, INTERESTS } from './recommendations-core.mjs';
import { affiliateCopy } from './affiliate-presentation.mjs';
const mounted = new WeakMap();
// 일주 조언 목록은 이제 묶음 구매 계정에게만 서버가 채운다. 추천 태그가 구매 여부·로딩 순서에 흔들리지 않도록
// 공개 일주 표(ILJU_DB)의 조언 문장에서 같은 규칙(태그 제거 후 앞 3문장)으로 목록을 만들어 넘긴다.
export function iljuAdviceLines(text, max = 3) {
  const clean = String(text || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  return clean.replace(/\.\s+/g, '.|').replace(/!\s+/g, '!|').replace(/\?\s+/g, '?|').split('|').map(s => s.trim()).filter(Boolean).slice(0, max);
}
export function mountSajuRecommendation(host, anchor, adviceLines) {
  // Only practical-advice sentences from the caller (free ilju table): no chart, birth data or rendered report text. 화면 목록은 읽지 않는다.
  const advice = Array.isArray(adviceLines) ? adviceLines : [];
  return mountRecommendation(host, { service: 'legacy-saju', practiceTags: adviceTopics(advice) }, anchor);
}
export async function mountRecommendation(host, input, anchor = null) {
  if (!RECOMMENDATIONS_RELEASED || !host?.isConnected || input?.source === 'article') return;
  mounted.get(host)?.();
  let cancelled = false;
  mounted.set(host, () => { cancelled = true; });
  const [{ recommendationCopy }, browser] = await Promise.all([import('./recommendations-copy.mjs'), import('./recommendations-browser.mjs')]);
  if (cancelled || !host.isConnected) return;
  const copy = recommendationCopy(document.documentElement.lang || 'ko');
  // The shell and React surfaces share their title and disclosure.
  const lang = document.documentElement.lang || 'ko', shelf = affiliateCopy(lang === 'zh' ? 'zh-CN' : lang);
  let context = normalizeContext({ ...input, selectionSeed: browser.createRecommendationSeed() }), closed = false, cleanupObserver = () => {}, lastKey = '';
  const seen = new Set();
  const section = document.createElement('section'), top = document.createElement('p');
  section.className = 'cd-recommendations'; section.dataset.recommendationBlock = 'true';
  section.dataset.affiliateBrand = 'ggulggul'; top.dataset.affiliateBrand = 'ggulggul';
  top.className = 'cd-recommendations-disclosure'; top.textContent = copy.disclosure;
  let current;
  const node = (tag, text, parent) => { const el = document.createElement(tag); if (text) el.textContent = text; if (parent) parent.append(el); return el; };
  const track = (event, id = '') => browser.trackRecommendation(event, context, context.source === 'footer' ? 'footer' : 'result', id, window.CODE_DESTINY_API_BASE_URL || '');
  async function render() {
    current?.abort(); current = new AbortController();
    try {
      const query = browser.recommendationQuery(context);
      const response = await fetch((window.CODE_DESTINY_API_BASE_URL || '') + '/api/recommendations?' + query, { signal: current.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
      if (!response.ok) throw new Error('Catalogue unavailable');
      const data = await response.json();
      if (cancelled) return;
      // 1분 갱신은 관리자 끄기 스위치를 반영하려는 것이다. 응답이 같으면 읽고 있는 카드를 다시 그리지 않는다.
      const key = query + JSON.stringify(data);
      if (key === lastKey && section.isConnected) return;
      lastKey = key;
      cleanupObserver();
      if (closed || !host.isConnected || !data.enabled) { section.remove(); top.remove(); return; }
      data.products = (data.products || []).filter(p => validImageUrl(p.imageUrl)).slice(0, RESULT_PRODUCT_LIMIT);
      const choose = serviceRule(context.service)?.explicitInterest || (context.service.startsWith('pet-') && !context.species);
      if (!data.products?.length && !choose) { section.remove(); top.remove(); return; }
      browser.ensureRecommendationFonts();
      const restoreShuffleFocus = document.activeElement?.classList.contains('cd-recommendations-shuffle');
      cleanupObserver(); section.replaceChildren();
      const disclosure = data.products.some(p => p.providerId === 'aliexpress') ? shelf.genericDisclosure + (data.products.some(p => !p.providerId || p.providerId === 'coupang') ? ' ' + copy.disclosure : '') : copy.disclosure;
      top.textContent = disclosure;
      const heading = node('div', '', section); heading.className = 'cd-recommendations-heading';
      const headingText = node('div', '', heading);
      node('h2', shelf.inlineTitle, headingText);
      node('p', context.practiceTags.length ? shelf.resultLead : shelf.inlineIntro, headingText).className = 'cd-recommendations-lead';
      const shuffle = node('button', '↻ ' + shelf.shuffle, heading); shuffle.type = 'button'; shuffle.className = 'cd-recommendations-shuffle';
      shuffle.addEventListener('click', () => { context = normalizeContext({ ...context, selectionSeed: browser.createRecommendationSeed() }); track('more'); void render(); });
      node('p', disclosure, section).className = 'cd-recommendations-disclosure';
      if (choose) {
        const label = node('label', context.service.startsWith('pet-') ? copy.species : copy.purpose, section);
        const select = node('select', '', label);
        const options = context.service.startsWith('pet-') ? [['cat', copy.cat], ['dog', copy.dog]] : ['meal-prep','hydration','rest'].map(k => [k, copy.interests[INTERESTS.indexOf(k)]]);
        const first = node('option', copy.purpose, select); first.value = '';
        options.forEach(([id, title]) => { const option = node('option', title, select); option.value = id; });
        select.value = context.species || context.interests[0] || '';
        select.addEventListener('change', () => { context = normalizeContext({ ...context, ...(context.service.startsWith('pet-') ? { species: select.value } : { interests: [select.value] }) }); track('filter'); void render(); });
      }
      const grid = node('div', '', section); grid.className = 'cd-recommendations-products';
      data.products.slice(0, RESULT_PRODUCT_LIMIT).forEach(p => {
        const merchantCopy = value => p.providerId === 'aliexpress' ? value.replace(/쿠팡|Coupang|coupang/g, 'AliExpress') : value;
        const article = node('article', '', grid);
        article.dataset.recommendationProduct = p.id; article.className = 'cd-recommendations-product';
        article.dataset.affiliateProvider = p.providerId || 'coupang';
        const photo = node('div', '', article); photo.className = 'cd-recommendations-image';
        if (validImageUrl(p.imageUrl)) { const image = node('img', '', photo); image.referrerPolicy = 'no-referrer'; image.loading = 'lazy'; image.alt = p.title; image.src = p.imageUrl; image.width = 96; image.height = 112; image.onerror = () => { article.remove(); if (!grid.children.length) { cleanupObserver(); section.remove(); top.remove(); } }; }
        const text = node('div', '', article); text.className = 'cd-recommendations-product-text';
        node('h3', p.title, text).title = p.title;
        node('p', (p.book?.author || (p.providerId === 'aliexpress' ? 'AliExpress' : 'Coupang')) + ' · ' + copy.ad, text).className = 'cd-recommendations-meta';
        node('p', p.reason, text).className = 'cd-recommendations-reason';
        if (validateAffiliateUrl(p.affiliateUrl, p.providerId)) {
          const link = node('a', p.linkType === 'search' ? copy.search : merchantCopy(copy.view), text);
          link.className = 'cd-recommendations-cta';
          link.href = p.affiliateUrl; link.target = '_blank'; link.rel = 'sponsored noopener'; link.referrerPolicy = 'no-referrer';
          link.addEventListener('click', () => track('click', p.id));
        }
      });
      const actions = node('div', '', section); actions.className = 'cd-recommendations-actions';
      const terms = node('p', '', actions); terms.className = 'cd-recommendations-terms';
      terms.append(document.createTextNode(shelf.inlineNote), document.createElement('br'), document.createTextNode(shelf.partnerTerms));
      const dismiss = node('button', shelf.dismiss, actions); dismiss.type = 'button';
      dismiss.addEventListener('click', () => { track('dismiss'); cleanup(); });
      if (context.source !== 'footer' && !top.isConnected) host.prepend(top);
      section.dataset.recommendationPlacement = context.source === 'footer' ? 'footer' : 'result';
      if (!section.isConnected) { if (anchor?.parentElement === host) anchor.after(section); else host.append(section); }
      if (restoreShuffleFocus) shuffle.focus({ preventScroll: true });
      cleanupObserver = browser.observeRecommendationProducts(section, seen, id => track('impression', id));
    } catch { cleanupObserver(); section.remove(); top.remove(); }
  }
  if (!document.querySelector('link[data-recommendation-styles]')) {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/styles/recommendations.css?v=build-631ce0647d7e'; css.dataset.recommendationStyles = 'true'; document.head.append(css);
  }
  const timer = setInterval(() => { if (!host.isConnected) cleanup(); else if (!document.hidden && !host.hidden) void render(); }, 60000);
  function cleanup() { closed = true; current?.abort(); clearInterval(timer); cleanupObserver(); section.remove(); top.remove(); mounted.delete(host); }
  mounted.set(host, () => { cancelled = true; cleanup(); });
  await render();
}

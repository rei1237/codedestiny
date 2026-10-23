export { adviceTopics } from './recommendations-context.mjs';
import { adviceTopics } from './recommendations-context.mjs';
import { RECOMMENDATIONS_RELEASED, RESULT_PRODUCT_LIMIT, normalizeContext, validateAffiliateUrl, validImageUrl, serviceRule, INTERESTS } from './recommendations-core.mjs';
import { affiliateCopy } from './affiliate-presentation.mjs';
import { bookPerspectiveLabel } from './recommendations-context.mjs';
const mounted = new WeakMap();
export function mountSajuRecommendation(host, anchor) {
  // Only the rendered practical-advice list: no chart, birth data or report text.
  const advice = Array.from(host?.querySelectorAll('#iljuAdviceList li') || []).map(el => el.textContent);
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
  // 이 어댑터는 꿀꿀 셸 화면에만 붙는다. 제목은 영냥이가 아니라 연이 서가로 부른다.
  const lang = document.documentElement.lang || 'ko', shelf = affiliateCopy(lang === 'zh' ? 'zh-CN' : lang);
  let context = normalizeContext(input), closed = false, impressed = false, cleanupObserver = () => {}, lastKey = '';
  const section = document.createElement('section'), top = document.createElement('p');
  section.className = 'cd-recommendations'; section.dataset.recommendationBlock = 'true';
  top.className = 'cd-recommendations-disclosure'; top.textContent = copy.disclosure;
  let current;
  const node = (tag, text, parent) => { const el = document.createElement(tag); if (text) el.textContent = text; if (parent) parent.append(el); return el; };
  const track = (event, id = '') => browser.trackRecommendation(event, context, 'result', id, window.CODE_DESTINY_API_BASE_URL || '');
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
      if (closed || !host.isConnected || !data.enabled) { section.remove(); top.remove(); return; }
      const choose = serviceRule(context.service)?.explicitInterest || (context.service.startsWith('pet-') && !context.species);
      if (!data.products?.length && !choose) { section.remove(); top.remove(); return; }
      cleanupObserver(); section.replaceChildren();
      const disclosure = data.products.some(p => p.providerId === 'aliexpress') ? shelf.genericDisclosure + (data.products.some(p => !p.providerId || p.providerId === 'coupang') ? ' ' + copy.disclosure : '') : copy.disclosure;
      top.textContent = disclosure;
      node('h2', shelf.yeoniTitle, section); node('p', copy.ad + ' · ' + disclosure, section);
      if (context.practiceTags.length) node('p', shelf.resultLead, section).className = 'cd-recommendations-lead';
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
        if (validImageUrl(p.imageUrl)) { const image = node('img', '', article); image.referrerPolicy = 'no-referrer'; image.loading = 'lazy'; image.alt = p.title; image.src = p.imageUrl; image.width = 240; image.height = 180; image.onerror = () => { image.remove(); node('p', copy.image, article); }; }
        node('h3', p.title, article); node('p', p.reason, article);
        if (p.book?.author) node('p', [p.book.author, p.book.publisher, p.book.edition, p.book.language, p.book.format].filter(Boolean).join(' · '), article);
        if (p.book?.perspective) node('p', bookPerspectiveLabel(p.book.perspective, lang), article);
        (p.attributes || []).forEach(a => node('p', a, article));
        if (p.price != null) node('p', new Intl.NumberFormat(undefined, { style: 'currency', currency: p.currency || 'KRW' }).format(p.price) + ' · ' + new Date(p.priceVerifiedAt).toLocaleString(), article);
        if (validateAffiliateUrl(p.affiliateUrl, p.providerId)) {
          // 가격을 확인하지 못한 상품은 가격 줄 대신 CTA 하나가 "현재 가격 확인"을 맡는다.
          const link = node('a', p.linkType === 'search' ? copy.search : merchantCopy(p.price == null ? copy.price + ' ↗' : copy.view), article);
          link.className = 'cd-recommendations-cta';
          link.href = p.affiliateUrl; link.target = '_blank'; link.rel = 'sponsored noopener'; link.referrerPolicy = 'no-referrer';
          link.addEventListener('click', () => track('click', p.id));
        }
      });
      const more = node('a', copy.more, section); more.href = '/recommendations/?brand=ggulggul';
      more.addEventListener('click', () => { browser.rememberRecommendationContext(context); track('more'); });
      const dismiss = node('button', copy.dismiss, section);
      dismiss.addEventListener('click', () => { track('dismiss'); cleanup(); });
      if (!top.isConnected) host.prepend(top);
      if (!section.isConnected) { if (anchor?.parentElement === host) anchor.after(section); else host.append(section); }
      cleanupObserver = browser.observeRecommendation(section, () => { if (!impressed) { impressed = true; track('impression'); } });
    } catch { section.remove(); top.remove(); }
  }
  if (!document.querySelector('link[data-recommendation-styles]')) {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/styles/recommendations.css'; css.dataset.recommendationStyles = 'true'; document.head.append(css);
  }
  const timer = setInterval(() => { if (!host.isConnected) cleanup(); else if (!document.hidden) void render(); }, 60000);
  function cleanup() { closed = true; current?.abort(); clearInterval(timer); cleanupObserver(); section.remove(); top.remove(); mounted.delete(host); }
  mounted.set(host, () => { cancelled = true; cleanup(); });
  await render();
}

import { RECOMMENDATIONS_RELEASED, normalizeContext, validateAffiliateUrl, validImageUrl, serviceRule, INTERESTS } from './recommendations-core.mjs';
const mounted = new WeakMap();
export async function mountRecommendation(host, input, anchor = null) {
  if (!RECOMMENDATIONS_RELEASED || !host?.isConnected) return;
  mounted.get(host)?.();
  let cancelled = false;
  mounted.set(host, () => { cancelled = true; });
  const [{ recommendationCopy }, browser] = await Promise.all([import('./recommendations-copy.mjs'), import('./recommendations-browser.mjs')]);
  if (cancelled || !host.isConnected) return;
  const copy = recommendationCopy(document.documentElement.lang || 'ko');
  let context = normalizeContext(input), closed = false, impressed = false, cleanupObserver = () => {};
  const section = document.createElement('section'), top = document.createElement('p');
  section.className = 'cd-recommendations'; section.dataset.recommendationBlock = 'true';
  top.className = 'cd-recommendations-disclosure'; top.textContent = copy.disclosure;
  let current;
  const node = (tag, text, parent) => { const el = document.createElement(tag); if (text) el.textContent = text; if (parent) parent.append(el); return el; };
  const track = (event, id = '') => browser.trackRecommendation(event, context, 'result', id, window.CODE_DESTINY_API_BASE_URL || '');
  async function render() {
    current?.abort(); current = new AbortController();
    try {
      const response = await fetch((window.CODE_DESTINY_API_BASE_URL || '') + '/api/recommendations?' + browser.recommendationQuery(context), { signal: current.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
      const data = await response.json();
      if (closed || !host.isConnected || !data.enabled) { section.remove(); top.remove(); return; }
      const choose = serviceRule(context.service)?.explicitInterest || (context.service.startsWith('pet-') && !context.species);
      if (!data.products?.length && !choose) { section.remove(); top.remove(); return; }
      cleanupObserver(); section.replaceChildren();
      node('h2', copy.title, section); node('p', copy.ad + ' · ' + copy.disclosure, section);
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
      data.products.slice(0, 3).forEach(p => {
        const article = node('article', '', grid);
        if (validImageUrl(p.imageUrl)) { const image = node('img', '', article); image.referrerPolicy = 'no-referrer'; image.loading = 'lazy'; image.alt = p.title; image.src = p.imageUrl; image.width = 240; image.height = 180; image.onerror = () => { image.remove(); node('p', copy.image, article); }; }
        node('h3', p.title, article); node('p', p.reason, article);
        (p.attributes || []).forEach(a => node('p', a, article));
        node('p', p.price == null ? copy.price : new Intl.NumberFormat(undefined, { style: 'currency', currency: 'KRW' }).format(p.price) + ' · ' + new Date(p.priceVerifiedAt).toLocaleString(), article);
        if (validateAffiliateUrl(p.affiliateUrl)) {
          const link = node('a', p.linkType === 'search' ? copy.search : copy.view, article);
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
  const timer = setInterval(() => { if (!host.isConnected) cleanup(); else void render(); }, 60000);
  function cleanup() { closed = true; current?.abort(); clearInterval(timer); cleanupObserver(); section.remove(); top.remove(); mounted.delete(host); }
  mounted.set(host, cleanup);
  await render();
}

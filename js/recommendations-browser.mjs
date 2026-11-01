import { RECOMMENDATIONS_RELEASED, normalizeContext, cleanEvent } from './recommendations-core.mjs';
export function analyticsAllowed() {
  try {
    const value = window.CodeDestinyCookiePolicy?.getConsent?.() || decodeURIComponent(document.cookie.match(/(?:^|;\s*)cd_cookie_consent=([^;]*)/)?.[1] || '');
    return value === 'accepted';
  } catch { return false; }
}
export function trackRecommendation(event, context, placement, productId = '', apiBase = '') {
  if (!RECOMMENDATIONS_RELEASED || !analyticsAllowed() || ['localhost', '127.0.0.1'].includes(location.hostname) || navigator.webdriver) return;
  const body = cleanEvent({ event, service: context.service, placement, productId, consent: true });
  if (!body) return;
  // No beacon: explicitly suppress Referer and cookies on this isolated transport.
  void fetch(apiBase + '/api/recommendations/events', { method: 'POST', body: JSON.stringify({ ...body, productId: productId || '', consent: true }), headers: { 'Content-Type': 'application/json' }, credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true }).catch(() => {});
}
export function observeRecommendation(node, onVisible) {
  if (!node || typeof IntersectionObserver === 'undefined') return () => {};
  let timer, counted = false, visible = false;
  const clear = () => { clearTimeout(timer); timer = undefined; };
  const schedule = () => {
    clear();
    if (!counted && visible && document.visibilityState === 'visible') timer = setTimeout(() => { counted = true; onVisible(); }, 1000);
  };
  const observer = new IntersectionObserver(entries => { visible = entries[0].intersectionRatio >= 0.5; schedule(); }, { threshold: [0, 0.5] });
  observer.observe(node);
  document.addEventListener('visibilitychange', schedule);
  return () => { clear(); observer.disconnect(); document.removeEventListener('visibilitychange', schedule); };
}
// The caller owns this Set for one displayed surface, including refreshes/filters.
export function observeRecommendationProducts(host, seen, onVisible) {
  const cleanups = Array.from(host?.querySelectorAll('[data-recommendation-product]') || []).map(node => {
    const id = node.dataset.recommendationProduct;
    if (seen.has(id)) return () => {};
    return observeRecommendation(node, () => {
      if (seen.has(id) || !node.isConnected) return;
      seen.add(id);
      onVisible(id);
    });
  });
  return () => cleanups.forEach(cleanup => cleanup());
}
export function recommendationQuery(context) {
  const c = normalizeContext(context), q = new URLSearchParams({ service: c.service, source: c.source, currency: c.currency });
  c.practiceTags.forEach(x => q.append('topic', x));
  for (const k of ['color','motif']) if(c[k]) q.set(k,c[k]);
  for (const k of ['category', 'species', 'maxPrice']) if (c[k]) q.set(k, String(c[k]));
  if (c.groupId) q.set('group', c.groupId);
  c.interests.forEach(x => q.append('interest', x));
  c.exclude.forEach(x => q.append('exclude', x));
  return q.toString();
}

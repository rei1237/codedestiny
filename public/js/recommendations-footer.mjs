import { mountRecommendation } from './recommendations-legacy.mjs';
// Only the Korean shell home owns this slot. Locales and result views keep their own surfaces.
export function mountHomeFooter(documentRoot = document) {
  if (location.pathname.replace(/\/$/, '') !== '/ggulggul') return () => {};
  const footer = documentRoot.getElementById('cdSiteFooter');
  const home = documentRoot.getElementById('inputPage');
  const result = documentRoot.getElementById('resultPage');
  if (!footer || !home || documentRoot.querySelector('[data-affiliate-home-slot]')) return () => {};
  const slot = documentRoot.createElement('div');
  slot.dataset.affiliateHomeSlot = 'true'; slot.className = 'cd-affiliate-footer';
  footer.before(slot);
  let dispose, pending = false, stopped = false;
  const update = async () => {
    const active = !home.hidden && getComputedStyle(home).display !== 'none' && (!result || result.hidden || getComputedStyle(result).display === 'none');
    slot.hidden = !active;
    if (!active || dispose || pending || stopped) return;
    pending = true;
    const cleanup = await mountRecommendation(slot, { service: 'recommendations', source: 'footer' });
    pending = false;
    if (stopped) cleanup?.(); else dispose = cleanup;
  };
  const observer = new MutationObserver(() => { void update(); });
  for (const el of [home, result].filter(Boolean)) observer.observe(el, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
  void update();
  return () => { stopped = true; observer.disconnect(); dispose?.(); slot.remove(); };
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mountHomeFooter(), { once: true });
  else mountHomeFooter();
}

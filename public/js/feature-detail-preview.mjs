import { loadFeatureDetail, renderFeatureDetailPanels } from './feature-detail-panels.mjs';
import { shareIntroductionFromButton } from './feature-introduction-share.mjs';
const revisions = new WeakMap();
let stylePromise;

function ensureFeatureDetailStyles() {
  if (stylePromise) return stylePromise;
  stylePromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('featureVisualDetailStyles');
    if (existing?.sheet) return resolve();
    const style = existing || document.createElement('link');
    style.id = 'featureVisualDetailStyles';
    style.rel = 'stylesheet';
    style.href = '/styles/feature-visual-detail.css';
    style.addEventListener('load', resolve, { once: true });
    style.addEventListener('error', () => {
      stylePromise = undefined;
      reject(new Error('DETAIL_STYLES_UNAVAILABLE'));
    }, { once: true });
    if (!existing) document.head.append(style);
  });
  return stylePromise;
}

export async function mountFeatureDetailPreview(overlay, keys) {
  const revision = (revisions.get(overlay) || 0) + 1;
  revisions.set(overlay, revision);
  overlay.classList.remove('pvw-visual');
  overlay.classList.remove('pvw-journey-trust');
  overlay.querySelector('[data-feature-visual-host]')?.remove();
  if (!/^ko\b/i.test(document.documentElement.lang || 'ko')) return;
  const title = overlay.querySelector('#tilePvwTitle');
  if (!title) return;
  const host = document.createElement('div');
  host.dataset.featureVisualHost = '';
  title.after(host);
  try {
    const detail = await loadFeatureDetail(keys);
    if (!detail || revisions.get(overlay) !== revision || !overlay.classList.contains('pvw-open')) return;
    await ensureFeatureDetailStyles();
    if (revisions.get(overlay) !== revision || !overlay.classList.contains('pvw-open')) return;
    host.innerHTML = renderFeatureDetailPanels(detail, { conversionPrompt: true });
    host.addEventListener('click', event => {
      const shareButton = event.target.closest('[data-feature-share]');
      if (shareButton) { void shareIntroductionFromButton(shareButton, detail); return; }
      if (!event.target.closest('[data-feature-conversion-request]')) return;
      const price = overlay.querySelector('#tilePvwPaywall');
      const cta = overlay.querySelector('#tilePvwCtaBtn');
      const destination = price && price.getClientRects().length ? price : cta;
      destination?.scrollIntoView({ block: 'nearest' });
      cta?.focus({ preventScroll: true });
    });
    overlay.classList.toggle('pvw-journey-trust', Boolean(detail.journey?.trustNotes?.length));
    overlay.classList.add('pvw-visual');
  } catch {
    if (revisions.get(overlay) !== revision || !overlay.classList.contains('pvw-open')) return;
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = '상세 내용 다시 불러오기';
    retry.style.minHeight = '44px';
    retry.addEventListener('click', () => void mountFeatureDetailPreview(overlay, keys), { once: true });
    host.append(retry);
  }
}

import { loadFeatureDetail, renderFeatureDetailPanels } from './feature-detail-panels.mjs';
import { shareIntroductionFromButton } from './feature-introduction-share.mjs';
const revisions = new WeakMap();
const actionCleanups = new WeakMap();
const legacyCleanups = new WeakMap();
let stylePromise;

function ensureFeatureDetailStyles() {
  if (stylePromise) return stylePromise;
  stylePromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('featureVisualDetailStyles');
    if (existing?.sheet) return resolve();
    const style = existing || document.createElement('link');
    style.id = 'featureVisualDetailStyles';
    style.rel = 'stylesheet';
    // /styles/*.css 는 1년 immutable 로 나간다(_headers). 무버전 URL 이면 9/14 전 옛 시트가 굳어
    // 새 상세창 버튼이 회색 네이티브 버튼으로 보였다. ?v= 는 sync:public 이 내용 해시로 다시 쓴다.
    style.href = '/styles/feature-visual-detail.css?v=build-bccf9de14876';
    style.addEventListener('load', resolve, { once: true });
    style.addEventListener('error', () => {
      stylePromise = undefined;
      reject(new Error('DETAIL_STYLES_UNAVAILABLE'));
    }, { once: true });
    if (!existing) document.head.append(style);
  });
  return stylePromise;
}

export async function mountFeatureDetailPreview(overlay, keys, inlineDetail) {
  actionCleanups.get(overlay)?.();
  legacyCleanups.get(overlay)?.();
  const revision = (revisions.get(overlay) || 0) + 1;
  revisions.set(overlay, revision);
  overlay.classList.remove('pvw-visual');
  overlay.classList.remove('pvw-journey-trust');
  overlay.querySelector('[data-feature-visual-host]')?.remove();
  if (!/^ko\b/i.test(document.documentElement.lang || 'ko')) return;
  const retired = [...overlay.querySelectorAll('#tilePvwTagline,#tilePvwDesc,#tilePvwFeats,#tilePvwQuestionsSec,#tilePvwStepsSec,#tilePvwRecommendedSec,#tilePvwTrustSec,#tilePvwFaqSec,#tilePvwReceiveSec,#tilePvwOutlineSec,#tilePvwCmpSec,#tilePvwReqSec,#tilePvwPremiumBlock,#tilePvwAudSec,#tilePvwQuestSec,#tilePvwScaleSec,#tilePvwPriceTitle')].map(node => ({ node, display: node.style.getPropertyValue('display'), priority: node.style.getPropertyPriority('display') }));
  retired.forEach(({node}) => node.style.setProperty('display', 'none', 'important'));
  legacyCleanups.set(overlay, () => retired.forEach(({node,display,priority}) => { if (display) node.style.setProperty('display', display, priority); else node.style.removeProperty('display'); }));
  const title = overlay.querySelector('#tilePvwTitle');
  if (!title) return;
  const host = document.createElement('div');
  host.dataset.featureVisualHost = '';
  host.setAttribute('aria-busy', 'true');
  host.textContent = '상품 이야기를 펼치고 있어요.';
  title.after(host);
  try {
    const detail = inlineDetail || await loadFeatureDetail(keys);
    if (revisions.get(overlay) !== revision || !overlay.classList.contains('pvw-open')) return;
    if (!detail) {
      // Non-product result tools keep their existing introduction; they are not
      // a failed network request and must not receive an endless retry screen.
      legacyCleanups.get(overlay)?.();
      overlay.setAttribute('data-editorial-locale', 'other');
      host.remove();
      return;
    }
    await ensureFeatureDetailStyles();
    if (revisions.get(overlay) !== revision || !overlay.classList.contains('pvw-open')) return;
    host.innerHTML = renderFeatureDetailPanels(detail, { conversionPrompt: true });
    host.removeAttribute('aria-busy');
    const source = overlay.querySelector('#tilePvwCtaBtn');
    const price = overlay.querySelector('#tilePvwCost');
    const status = overlay.querySelector('#tilePvwCtaMeta');
    const slot = host.querySelector('[data-fortune-hero-action]');
    if (source && slot) {
      const action = document.createElement('div'); action.className = 'fortuneAction';
      const label = document.createElement('p');
      const button = document.createElement('button'); button.type = 'button';
      button.addEventListener('click', () => source.click());
      const statusLabel = document.createElement('p'); statusLabel.className = 'fortuneSampleNote'; statusLabel.setAttribute('role', 'status');
      action.append(label, button, statusLabel); slot.replaceChildren(action);
      const footer = overlay.querySelector('.tile-pvw-cta-sticky');
      const root = overlay.querySelector('.tile-pvw-scroll');
      const visibility = typeof IntersectionObserver === 'function' && footer ? new IntersectionObserver(entries => { footer.classList.toggle('fortuneCtaAtTop', entries[0].boundingClientRect.bottom > (entries[0].rootBounds?.top ?? 0)); }, { root }) : null;
      visibility?.observe(action);
      const sync = () => { label.textContent = price?.textContent?.trim() || (detail.accessType === 'free' ? '무료' : '시작 화면에서 이용 조건 확인'); button.textContent = source.textContent.trim(); button.disabled = source.disabled || source.getAttribute('aria-disabled') === 'true'; statusLabel.textContent = status?.textContent?.trim() || ''; statusLabel.hidden = !statusLabel.textContent; };
      sync();
      const observer = new MutationObserver(sync);
      observer.observe(source, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled','aria-disabled'] });
      if (price) observer.observe(price, { childList: true, subtree: true, characterData: true });
      if (status) observer.observe(status, { childList: true, subtree: true, characterData: true });
      const closing = new MutationObserver(() => { if (!overlay.classList.contains('pvw-open')) { observer.disconnect(); closing.disconnect(); visibility?.disconnect(); footer?.classList.remove('fortuneCtaAtTop'); } });
      closing.observe(overlay, { attributes: true, attributeFilter: ['class'] });
      actionCleanups.set(overlay, () => { observer.disconnect(); closing.disconnect(); });
    }
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
    host.textContent = '';
    host.removeAttribute('aria-busy');
    retry.type = 'button';
    retry.textContent = '상세 내용 다시 불러오기';
    retry.style.minHeight = '44px';
    retry.addEventListener('click', () => void mountFeatureDetailPreview(overlay, keys, inlineDetail), { once: true });
    host.append(retry);
  }
}

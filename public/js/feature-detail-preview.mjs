import { loadFeatureDetail, preloadFeatureDetail, renderFeatureDetailPanels, loadInlineCraftedDetail, revealCraftedTranscript } from './feature-detail-panels.mjs';
import { shareIntroductionFromButton } from './feature-introduction-share.mjs';
import { observeConsultationSamples } from './consultation-sample-exposure.mjs';
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
    style.href = '/styles/feature-visual-detail.css?v=build-59014ab2d3d3';
    style.addEventListener('load', resolve, { once: true });
    style.addEventListener('error', () => {
      stylePromise = undefined;
      reject(new Error('DETAIL_STYLES_UNAVAILABLE'));
    }, { once: true });
    if (!existing) document.head.append(style);
  });
  return stylePromise;
}

// 첫 상세 진입의 CSS와 JSON은 서로 의존하지 않는다. 미리 시작해 두면 클릭 뒤 첫 화면은
// catalog → detail → stylesheet의 세 번 직렬 왕복이 아니라 가장 느린 한 요청만 기다린다.
export function preloadFeatureDetailPreview(keys) {
  return Promise.all([ensureFeatureDetailStyles(), preloadFeatureDetail(keys)])
    .then(([, detail]) => detail)
    .catch(() => null);
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
    const detailRequest = inlineDetail ? loadInlineCraftedDetail(inlineDetail) : loadFeatureDetail(keys);
    const [detail] = await Promise.all([detailRequest, ensureFeatureDetailStyles()]);
    if (revisions.get(overlay) !== revision || !overlay.classList.contains('pvw-open')) return;
    if (!detail) {
      // Non-product result tools keep their existing introduction; they are not
      // a failed network request and must not receive an endless retry screen.
      legacyCleanups.get(overlay)?.();
      overlay.setAttribute('data-editorial-locale', 'other');
      host.remove();
      return;
    }
    host.innerHTML = renderFeatureDetailPanels(detail, { conversionPrompt: true });
    host.dataset.consultationItem = detail.featureKey || detail.slug || '';
    const stopSamples = observeConsultationSamples(host.parentElement, (name, params) => window.cdTrack?.(name, params));
    host.addEventListener('error', revealCraftedTranscript, true);
    host.removeAttribute('aria-busy');
    const source = overlay.querySelector('#tilePvwCtaBtn');
    const price = overlay.querySelector('#tilePvwCost');
    const status = overlay.querySelector('#tilePvwCtaMeta');
    const slot = host.querySelector('[data-fortune-hero-action]');
    const footer = overlay.querySelector('.tile-pvw-cta-sticky');
    // 닫힘 감지와 가격·버튼 동기화를 옵저버 하나로 받고, 닫히거나 다시 열 때 IntersectionObserver 까지 함께 끊는다.
    // (예전에는 다시 열기 정리에서 IntersectionObserver 가 빠져 열 때마다 하나씩 쌓였다.)
    let sync = () => {};
    let visibility = null;
    const observer = new MutationObserver(() => { if (overlay.classList.contains('pvw-open')) sync(); else cleanup(); });
    const cleanup = () => { observer.disconnect(); visibility?.disconnect(); stopSamples(); footer?.classList.remove('fortuneCtaAtTop'); document.documentElement.classList.remove('cd-detail-open'); };
    observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
    actionCleanups.set(overlay, cleanup);
    if (source && slot) {
      const action = document.createElement('div'); action.className = 'fortuneAction';
      const label = document.createElement('p');
      const button = document.createElement('button'); button.type = 'button';
      button.addEventListener('click', () => source.click());
      const statusLabel = document.createElement('p'); statusLabel.className = 'fortuneSampleNote'; statusLabel.setAttribute('role', 'status');
      action.append(label, button, statusLabel); slot.replaceChildren(action);
      const root = overlay.querySelector('.tile-pvw-scroll');
      visibility = typeof IntersectionObserver === 'function' && footer ? new IntersectionObserver(entries => { footer.classList.toggle('fortuneCtaAtTop', entries[0].boundingClientRect.bottom > (entries[0].rootBounds?.top ?? 0)); }, { root }) : null;
      visibility?.observe(action);
      sync = () => { label.textContent = price?.textContent?.trim() || (detail.accessType === 'free' ? '무료' : '시작 화면에서 이용 조건 확인'); button.textContent = source.textContent.trim(); button.disabled = source.disabled || source.getAttribute('aria-disabled') === 'true'; statusLabel.textContent = status?.textContent?.trim() || ''; statusLabel.hidden = !statusLabel.textContent; };
      sync();
      observer.observe(source, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled','aria-disabled'] });
      if (price) observer.observe(price, { childList: true, subtree: true, characterData: true });
      if (status) observer.observe(status, { childList: true, subtree: true, characterData: true });
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
    // 문서 스크롤 잠금 — 전역 html:has(…) 대신 열린 동안만 클래스 하나를 둔다(닫힘은 위 cleanup 이 지운다).
    document.documentElement.classList.add('cd-detail-open');
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

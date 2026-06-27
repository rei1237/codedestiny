import { bindGlobalActions } from './uiBindings.js?v=20260627-astrology-ai';

function applyProgressiveContainment(doc) {
  if (!doc || !doc.documentElement || !('contentVisibility' in doc.documentElement.style)) return;

  const heavyBlocks = doc.querySelectorAll([
    '.fg-group',
    '.feat-collection',
    '.tarot-collection',
    '.service-cards-wrap',
    '.daily-fortune-wrap',
    '.dream-ledger-overlay-shell'
  ].join(','));

  heavyBlocks.forEach((el) => {
    if (!el || el.dataset.cvApplied === '1') return;
    el.style.contentVisibility = 'auto';
    el.style.containIntrinsicSize = '900px';
    el.dataset.cvApplied = '1';
  });
}

export function initAppShell() {
  // Preserve existing scroll behavior on mobile Safari by disabling auto restoration.
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  bindGlobalActions(document);

  // Let first paint happen, then apply containment hints for offscreen-heavy sections.
  const raf = window.requestAnimationFrame || function (cb) { return setTimeout(cb, 16); };
  raf(function () {
    applyProgressiveContainment(document);
  });
}

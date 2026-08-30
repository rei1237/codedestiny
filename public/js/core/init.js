import { bindGlobalActions } from './uiBindings.js?v=build-586f7512744d';

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
    // 'auto' 키워드가 핵심 — 한 번 렌더된 뒤에는 브라우저가 실제 크기를 기억해 추정치를
    // 대체한다. 예전에는 'auto' 없이 900px 만 줘서 영영 보정되지 않았고, 접힌 컬렉션의
    // 실제 높이가 약 332px 인데도 900px 을 예약해 데스크톱에서만 4,500px 넘는 유령
    // 스크롤이 생겼다(1440px 실측: 추정 18,369 vs 실제 13,749).
    // 360px 은 접힌 상태의 실측값에 맞춘 첫 추정치이고, 펼치면 'auto' 가 알아서 늘린다.
    el.style.containIntrinsicSize = 'auto 360px';
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

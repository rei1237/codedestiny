let obs = null;

function targetCards() {
  return [
    'skillTreeCard',
    'energyCoordCard',
    'healthReportCard',
    'lottoCard',
    'egyptCard',
    'hormone-vibe-section',
    'tTestCard'
  ].map((id) => document.getElementById(id)).filter(Boolean);
}

export function bindExtraFortuneLazy() {
  if (obs) return;

  obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const card = entry.target;
      if (!card || card.dataset.extraBound === '1') return;

      card.dataset.extraBound = '1';
      card.classList.add('fate-scroll-section-visible');
      obs.unobserve(card);
    });
  }, { rootMargin: '240px 0px', threshold: 0.01 });

  targetCards().forEach((card) => {
    if (getComputedStyle(card).display === 'none') return;
    card.classList.add('fate-scroll-section-hidden');
    obs.observe(card);
  });

  window.addEventListener('pagehide', () => {
    if (obs) {
      obs.disconnect();
      obs = null;
    }
  }, { once: true });
}

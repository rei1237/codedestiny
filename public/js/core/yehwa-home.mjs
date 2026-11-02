// UI-tour state is deliberately independent of profile onboarding and rewards.
export function mountYehwaHome(root) {
  if (!root || root.dataset.yhMounted) return () => {};
  root.dataset.yhMounted = 'true';
  const controller = new root.ownerDocument.defaultView.AbortController();
  const guide = root.querySelector('[data-yh-guide]');
  const start = root.querySelector('[data-yh-start]');
  let step = 0;
  const lines = [
    '오늘 마음에 남은 이야기부터 골라볼까요?',
    '상담 내용과 이용 조건을 살펴보세요. 마음에 맞는 상담을 고르면 자세한 안내로 이어져요.',
    '지난 상담은 서비스별 기록에서 찾아볼 수 있어요. 꿀꿀 운세와 영냥이 기록을 나누어 두었어요.',
  ];
  function close() {
    guide.hidden = true;
    root.querySelectorAll('[data-yh-highlight]').forEach(node => node.removeAttribute('data-yh-highlight'));
    start.focus({ preventScroll: true });
  }
  function show() {
    root.querySelectorAll('[data-yh-highlight]').forEach(node => node.removeAttribute('data-yh-highlight'));
    const target = step === 1 ? root.querySelector('.yh-card-list:not([hidden]) .yh-card') : root.querySelector(`[data-yh-target="${step}"]`);
    if (!target || target.hidden) { close(); return; }
    target.setAttribute('data-yh-highlight', '');
    target.after(guide);
    guide.hidden = false;
    guide.querySelector('[data-yh-line]').textContent = window.cdTranslate?.('home.yehwa.line' + (step + 1), null, lines[step]) || lines[step];
    guide.querySelector('[data-yh-progress]').textContent = `${step + 1} / ${lines.length}`;
    guide.querySelector('[data-yh-prev]').disabled = step === 0;
    const last = step === lines.length - 1;
    guide.querySelector('[data-yh-next]').textContent = window.cdTranslate?.('home.yehwa.' + (last ? 'done' : 'next'), null, last ? '안내 마치기' : '다음') || (last ? '안내 마치기' : '다음');
    const portrait = guide.querySelector('.yh-portrait');
    portrait.getAnimations?.().forEach(animation => animation.cancel());
    // Four original atelier cells: speaking 2, 3, 2, idle 0. Finite motion only.
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const image = portrait.querySelector('img');
      image.getAnimations?.().forEach(animation => animation.cancel());
      image.animate?.([{transform:'translateX(-50%)'},{transform:'translateX(-75%)'},{transform:'translateX(-50%)'},{transform:'translateX(0)'}], {duration:440,easing:'steps(1,end)'});
    }
    guide.focus({preventScroll:true});
    const rect = guide.getBoundingClientRect();
    const cookiePanel = document.querySelector('[aria-labelledby="analytics-consent-title"]');
    const availableBottom = cookiePanel ? Math.min(window.innerHeight - 80, cookiePanel.getBoundingClientRect().top) : window.innerHeight - 80;
    if (rect.bottom > availableBottom || rect.top < 0) guide.scrollIntoView({block:'start',behavior:'instant'});
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button.hasAttribute('data-yh-concern')) {
      const value = button.dataset.yhConcern;
      root.querySelectorAll('[data-yh-concern]').forEach(node=>node.setAttribute('aria-pressed', String(node === button)));
      root.querySelectorAll('[data-yh-group]').forEach(node=>{node.hidden=node.dataset.yhGroup !== value;});
      root.querySelector('[data-yh-selection]').textContent = button.textContent.replace('✓','').trim();
      if (!guide.hidden) show();
    } else if (button.hasAttribute('data-yh-start')) { step = 0; show(); }
    else if (button.hasAttribute('data-yh-prev')) { step = Math.max(0,step - 1); show(); }
    else if (button.hasAttribute('data-yh-next')) { if (++step === lines.length) close(); else show(); }
    else if (button.matches('[data-yh-close],[data-yh-skip]')) close();
  }, {signal:controller.signal});
  root.addEventListener('keydown', event=>{if(event.key==='Escape'&&!guide.hidden){event.preventDefault();close();}}, {signal:controller.signal});
  return () => { controller.abort(); delete root.dataset.yhMounted; };
}
if (typeof document !== 'undefined') {
  const boot = () => document.querySelectorAll('#cdHomeFunnel [data-yh-home]').forEach(mountYehwaHome);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
}

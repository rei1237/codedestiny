// UI-tour state is deliberately independent of profile onboarding and rewards.
export function mountYehwaHome(root) {
  if (!root || root.dataset.yhMounted) return () => {};
  root.dataset.yhMounted = 'true';
  const controller = new root.ownerDocument.defaultView.AbortController();
  const guide = root.querySelector('[data-yh-guide]');
  const start = root.querySelector('[data-yh-start]');
  const desktop = root.ownerDocument.defaultView.matchMedia('(min-width:700px)');
  const concerns = root.querySelector('.yh-find');
  const menu = root.closest('#cdHomeFunnel')?.querySelector('.yh-menu');
  const shell = root.closest('#cdHomeFunnel');
  const secondary = shell?.querySelectorAll('.yh-secondary') || [];
  function revealFragment() {
    const target = root.ownerDocument.getElementById(location.hash.slice(1));
    if (target?.dataset.pickerFragment) selectConcern(target.dataset.pickerFragmentGroup, false, target.dataset.pickerFragment);
    const fold = target?.closest('.yh-secondary,.yh-find');
    if (fold && !fold.open) {
      fold.open = true;
      target.scrollIntoView({block:'start'});
    }
  }
  function adaptLayout() {
    if (concerns instanceof HTMLDetailsElement) concerns.open = desktop.matches || location.hash === '#homeConcerns';
    secondary.forEach(fold => { fold.open = desktop.matches; });
    revealFragment();
    if (menu) menu.open = desktop.matches;

  }
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
    const target = step === 1 ? root.querySelector('[data-picker-card]:not([hidden]) .cd-picker-main') : root.querySelector(`[data-yh-target="${step}"]`);
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
    const sprite = portrait.querySelector('img');
    if (!sprite.hasAttribute('src')) sprite.src = sprite.dataset.yhPortraitSrc;
    portrait.getAnimations?.().forEach(animation => animation.cancel());
    // Four original atelier cells: speaking 2, 3, 2, idle 0. Finite motion only.
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sprite.getAnimations?.().forEach(animation => animation.cancel());
      sprite.animate?.([{transform:'translateX(-50%)'},{transform:'translateX(-75%)'},{transform:'translateX(-50%)'},{transform:'translateX(0)'}], {duration:440,easing:'steps(1,end)'});
    }
    guide.focus({preventScroll:true});
    const rect = guide.getBoundingClientRect();
    const cookiePanel = document.querySelector('[aria-labelledby="analytics-consent-title"]');
    const availableBottom = cookiePanel ? Math.min(window.innerHeight - 80, cookiePanel.getBoundingClientRect().top) : window.innerHeight - 80;
    if (rect.bottom > availableBottom || rect.top < 0) guide.scrollIntoView({block:'start',behavior:'instant'});
  }
  root.addEventListener('click', event => {
    const serviceLink = event.target.closest('a[data-cd-service-id],a[data-picker-service-id]');
    if (serviceLink && root.contains(serviceLink)) {
      root.ownerDocument.defaultView.cdTrackDiscovery?.('select_item', {
        itemId: serviceLink.dataset.cdServiceId || serviceLink.dataset.pickerServiceId, itemListId: 'home',
      });
    }
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button.hasAttribute('data-yh-concern')) {
      selectConcern(button.dataset.yhConcern);
      if (!guide.hidden) show();
    } else if (button.hasAttribute('data-picker-more')) {
      selectConcern(selectedConcern, button.getAttribute('aria-expanded') !== 'true', selectedTopic);
    } else if (button.hasAttribute('data-picker-topic')) {
      selectConcern(selectedConcern, false, button.dataset.pickerTopic);
    } else if (button.hasAttribute('data-yh-start')) {
      if (root.querySelector('#yhResults').hidden) root.querySelector('[data-yh-concern]').click();
      step = 0;
      show();
    }
    else if (button.hasAttribute('data-yh-prev')) { step = Math.max(0,step - 1); show(); }
    else if (button.hasAttribute('data-yh-next')) { if (++step === lines.length) close(); else show(); }
    else if (button.matches('[data-yh-close],[data-yh-skip]')) close();
  }, {signal:controller.signal});
  root.addEventListener('keydown', event=>{if(event.key==='Escape'&&!guide.hidden){event.preventDefault();close();}}, {signal:controller.signal});
  if (menu) {
    menu.addEventListener('click', event => {
      if (!desktop.matches && event.target.closest('a[href^="#"]')) menu.open = false;
    }, {signal:controller.signal});
    menu.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !desktop.matches && menu.open) {
        menu.open = false;
        menu.querySelector('summary').focus();
      }
    }, {signal:controller.signal});
  }
  let selectedConcern = 'love', selectedTopic = 'all';
  function selectConcern(value, expanded = false, topic = 'all') {
    selectedConcern = value;
    selectedTopic = topic;
    let matches = 0;
    root.querySelectorAll('[data-yh-concern]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.yhConcern === value)));
    root.querySelectorAll('[data-picker-card]').forEach(card => {
      const match = (value === 'all' || card.dataset.pickerGroups.split(' ').includes(value)) && (topic === 'all' || card.dataset.pickerTopics.split(' ').includes(topic));
      card.hidden = !match || (!expanded && matches >= 3);
      if (match) matches++;
    });
    const more = root.querySelector('[data-picker-more]');
    more.hidden = matches <= 3;
    more.setAttribute('aria-expanded', String(expanded));
    more.textContent = expanded ? '접기' : '관련 상담 더 보기';
    root.querySelectorAll('[data-picker-topic]').forEach(button=>{
      button.hidden = button.dataset.pickerTopic !== 'all' && value !== 'all' && button.dataset.pickerTopicGroup !== value;
      button.setAttribute('aria-pressed', String(button.dataset.pickerTopic === topic));
    });
    root.querySelector('[data-picker-topics]').hidden = ![...root.querySelectorAll('[data-picker-topic]:not([hidden])')].some(button=>button.dataset.pickerTopic !== 'all');
    root.querySelector('[data-yh-selection]').textContent = root.querySelector('[data-yh-concern="' + value + '"]').textContent;
  }
  root.querySelector('.cd-picker-tabs')?.addEventListener('keydown', event => {
    const buttons = [...root.querySelectorAll('[data-yh-concern]')], index = buttons.indexOf(event.target);
    const next = event.key === 'ArrowRight' ? (index + 1) % buttons.length : event.key === 'ArrowLeft' ? (index + buttons.length - 1) % buttons.length : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1;
    if (index < 0 || next < 0) return;
    event.preventDefault(); selectConcern(buttons[next].dataset.yhConcern); buttons[next].focus({preventScroll:true});
  }, {signal:controller.signal});
  selectConcern('love');
  adaptLayout();
  desktop.addEventListener('change', adaptLayout, {signal:controller.signal});
  root.ownerDocument.defaultView.addEventListener('hashchange', revealFragment, {signal:controller.signal});
  return () => { controller.abort(); delete root.dataset.yhMounted; };
}
if (typeof document !== 'undefined') {
  const boot = () => document.querySelectorAll('#cdHomeFunnel [data-yh-home]').forEach(mountYehwaHome);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
}

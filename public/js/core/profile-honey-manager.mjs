// Reuse the original wallet node and controller. A profile switch must return
// the live node before its previous game card is removed.
export function adoptHoneyManager(host, signal) {
  const widget = document.querySelector('[data-cd-honey-widget]');
  if (!widget || signal.aborted) return;
  const anchor = document.createComment('profile honey manager return point');
  const wasHidden = widget.hidden;
  widget.before(anchor);
  widget.classList.add('pg-honey-manager');
  widget.hidden = false;
  const details = widget.querySelector('.cdh-honey__details');
  if (details && !widget.dataset.petHoneyVisited) {
    details.open = true;
    widget.dataset.petHoneyVisited = 'true';
  }
  host.append(widget);
  window.CdHoney?.refresh(false);
  signal.addEventListener('abort', () => {
    if (anchor.parentNode) anchor.replaceWith(widget);
    widget.hidden = wasHidden;
    widget.classList.remove('pg-honey-manager');
  }, { once: true });
}

export function petBond(affection = 0, attended = false) {
  if (affection >= 70) return { label: '달빛 단짝', greeting: attended ? '오늘 출석도 완료했어요. 함께 쌓는 시간이 참 좋아요.' : '기다리고 있었어요. 오늘의 출석 도장도 함께 남겨요.', next: 100 };
  if (affection >= 30) return { label: '반가운 친구', greeting: attended ? '오늘 도장을 찍었어요. 내일도 반갑게 만나요.' : '또 만나서 반가워요. 꿀단지에 오늘의 도장을 찍어볼까요?', next: 70 };
  return { label: '처음 만난 사이', greeting: attended ? '오늘 출석을 완료했어요. 조금씩 서로를 알아가요.' : '첫 출석 도장부터, 천천히 우리만의 시간을 쌓아요.', next: 30 };
}

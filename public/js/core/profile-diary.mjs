// Reuse the existing diary app and its shared legacy store, in a persistent book.
// Keeping the frame alive when closed preserves drafts and the selected diary tab.
export function mountProfileDiary(host, { profileId, signal }) {
  const doc = host.ownerDocument;
  const notify = (frame, type) => {
    try {
      if (type === 'cd:diary-open') frame.contentWindow?.dispatchEvent(new frame.contentWindow.Event('cd:diary-open'));
      else frame.contentWindow?.dispatchEvent(new frame.contentWindow.Event('cd:diary-flush'));
    } catch { /* first load or an external frame destination */ }
  };
  host.className = 'pc-diary-entry';
  host.innerHTML = '<button type="button" class="pc-diary-open"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M7 5h17a3 3 0 0 1 3 3v19H9a4 4 0 0 1-4-4V7a2 2 0 0 1 2-2Z" fill="currentColor" fill-opacity=".12" stroke="currentColor" stroke-width="1.5"/><path d="M9 5v18m4-11h9m-9 5h6M5 23h22M19 4v5l2-1 2 1V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><span><strong>달빛 다이어리</strong><small>오늘의 마음 · 달력 · 나의 기록</small></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 18 18 6M7 6h11v11"/></svg></button>';
  const trigger = host.querySelector('button');
  let ownedDialog;
  trigger.addEventListener('click', () => {
    let book = doc.querySelector('[data-profile-diary-book]');
    if (!book) {
      book = doc.createElement('dialog');
      book.className = 'pc-diary-book';
      book.setAttribute('data-profile-diary-book', '');
      book.setAttribute('aria-labelledby', 'profileDiaryTitle');
      book.innerHTML = '<header><div><h2 id="profileDiaryTitle">나의 달빛 다이어리</h2><p data-diary-status role="status"></p></div><button type="button" data-diary-retry hidden>다시 열기</button><button type="button" data-diary-close aria-label="다이어리 닫기" autofocus><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><iframe title="달빛 다이어리 기록과 달력" data-profile-diary="true" referrerpolicy="same-origin"></iframe><a href="/diary/" target="_blank" rel="noopener">다이어리 전체 화면으로 열기</a>';
      doc.body.append(book);
      const frame = book.querySelector('iframe'), status = book.querySelector('[data-diary-status]'), retry = book.querySelector('[data-diary-retry]');
      let timer;
      const preparing = () => {
        doc.defaultView.clearTimeout(timer);
        book.dataset.state = 'loading'; status.textContent = '기록을 펼치고 있어요.'; retry.hidden = true;
        timer = doc.defaultView.setTimeout(() => {
          book.dataset.state = 'error'; status.textContent = '불러오지 못했어요. 다시 열거나 전체 화면에서 확인해 주세요.'; retry.hidden = false;
        }, 25000);
      };
      frame.addEventListener('diary:preparing', preparing);
      retry.addEventListener('click', () => { preparing(); frame.src = '/diary/?garden=1'; });
      doc.defaultView.addEventListener('message', event => {
        if (event.origin !== doc.location.origin || event.source !== frame.contentWindow) return;
        if (event.data?.type === 'cd:diary-close') { if (book.open) book.close(); return; }
        if (event.data?.type !== 'cd:diary-ready') return;
        doc.defaultView.clearTimeout(timer); book.dataset.state = 'ready'; status.textContent = ''; retry.hidden = true;
      });
      book.querySelector('[data-diary-close]').addEventListener('click', () => book.close());
      book.addEventListener('click', event => { if (event.target === book) book.close(); });
      book.addEventListener('close', () => {
        notify(book.querySelector('iframe'), 'cd:diary-flush');
        const activeTrigger = doc.querySelector('[data-pc-diary-host] .pc-diary-open');
        activeTrigger?.focus({ preventScroll: true });
      });
    }
    const frame = book.querySelector('iframe');
    if (!frame.src || frame.dataset.profileId !== String(profileId || '') || book.dataset.state === 'error') {
      // Flush the existing draft controller before changing the active birth context.
      notify(frame, 'cd:diary-flush');
      frame.dataset.profileId = String(profileId || '');
      frame.dispatchEvent(new doc.defaultView.Event('diary:preparing'));
      frame.src = '/diary/?garden=1';
    }
    ownedDialog = book;
    if (!book.open) book.showModal();
    notify(frame, 'cd:diary-open');
  }, { signal });
  signal.addEventListener('abort', () => { if (ownedDialog?.open) ownedDialog.close(); }, { once: true });
}

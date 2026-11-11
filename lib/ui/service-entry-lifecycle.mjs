/** Decorative entry is never a prerequisite for navigation, auth, payment or saved results. */
export const ENTRY_SKIP_KEY = 'cd:service-entry:skip';
export function isServiceEntryLocation(location, service) {
  if (location.hash) return false;
  const path = String(location.pathname || '').replace(/\/$/, '');
  if (path !== (service === 'yeongnyangi' ? '/yeongnyangi' : '/ggulggul')) return false;
  const params = new URLSearchParams(location.search || '');
  for (const key of params.keys()) if (!/^(lang|ref|utm_[a-z_]+|gclid|fbclid)$/.test(key)) return false;
  return true;
}
export function startServiceEntry(win, service, onShow, onClose) {
  if (!isServiceEntryLocation(win.location, service)) return () => {};
  const motion = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const nav = win.performance?.getEntriesByType?.('navigation')?.[0];
  const shownKey = 'cd:service-entry:shown:' + service;
  if (motion?.matches || nav?.type === 'back_forward' || win.document.readyState === 'complete') return () => {};
  try { if (win.localStorage.getItem(ENTRY_SKIP_KEY) === '1' || win.sessionStorage.getItem(shownKey) === '1') return () => {}; } catch {}
  let closed = false;
  let timer;
  let frame;
  const cleanups = [];
  const listen = (target, name, fn) => { target.addEventListener(name, fn); cleanups.push(() => target.removeEventListener(name, fn)); };
  const close = () => {
    if (closed) return;
    closed = true;
    win.clearTimeout(timer);
    if (frame) win.cancelAnimationFrame(frame);
    cleanups.forEach(fn => fn());
    onClose();
  };
  const ready = () => { frame = win.requestAnimationFrame(close); };
  listen(win, 'load', ready);
  listen(win, 'pagehide', close);
  listen(win, 'popstate', close);
  listen(win, 'pageshow', event => { if (event.persisted) close(); });
  if (motion?.addEventListener) listen(motion, 'change', event => { if (event.matches) close(); });
  // A missing image or failed load must never leave a full-screen cover behind.
  timer = win.setTimeout(close, 1800);
  try { win.sessionStorage.setItem(shownKey, '1'); } catch {}
  onShow();
  return close;
}

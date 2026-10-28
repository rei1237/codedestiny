(function () {
'use strict';
// The server HTML stays visible; no navigation, layout or input depends on motion.
const seen = new Set();
function attachHomeSurfaceMotion(root) {
  if (!root) return () => {};
  const win = root.ownerDocument.defaultView;
  const doc = root.ownerDocument;
  const reduce = win.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = win.matchMedia('(min-width: 1024px) and (hover: hover)');
  const key = 'cd:ggul-motion:v1';
  try { JSON.parse(win.sessionStorage.getItem(key) || '[]').forEach(id => seen.add(id)); } catch { /* Storage is optional. */ }
  const mark = id => {
    seen.add(id);
    try { win.sessionStorage.setItem(key, JSON.stringify([...seen])); } catch { /* Storage is optional. */ }
  };
  const targets = new Map();
  root.querySelectorAll('[data-home-reveal]').forEach(node => targets.set(node, node.dataset.homeReveal));
  root.querySelectorAll('[data-home-stagger]').forEach(group => {
    [...group.children].forEach((node, index) => targets.set(node, group.dataset.homeStagger + '-' + index));
  });
  let observer;
  let heroObserver;
  let frame = 0;
  const update = () => {
    frame = 0;
    root.style.setProperty('--hm-moon-offset', Math.min(6, Math.max(0, win.scrollY / 100)) + 'px');
  };
  const scroll = () => { if (!frame) frame = win.requestAnimationFrame(update); };
  const stopScroll = () => {
    win.removeEventListener('scroll', scroll);
    win.cancelAnimationFrame(frame);
    frame = 0;
    root.style.removeProperty('--hm-moon-offset');
  };
  const stop = () => {
    observer?.disconnect();
    heroObserver?.disconnect();
    stopScroll();
    root.querySelectorAll('[data-home-enter]').forEach(node => node.removeAttribute('data-home-enter'));
  };
  const start = () => {
    stop();
    if (reduce.matches || doc.hidden || !win.IntersectionObserver) return;
    try {
      observer = new win.IntersectionObserver(entries => {
        entries.filter(entry => entry.isIntersecting).forEach((entry, index) => {
          const node = entry.target;
          const id = targets.get(node);
          observer.unobserve(node);
          if (seen.has(id)) return;
          mark(id);
          node.style.setProperty('--hm-enter-delay', Math.min(index * 55, 220) + 'ms');
          node.dataset.homeEnter = '';
        });
      }, { threshold: 0.12 });
      targets.forEach((id, node) => {
        const rect = node.getBoundingClientRect();
        // Initial viewport content is immediate, including restored scroll positions.
        if (rect.top < win.innerHeight && rect.bottom > 0) mark(id);
        else if (!seen.has(id)) observer.observe(node);
      });
      const hero = root.querySelector('[data-home-hero]');
      if (desktop.matches && hero) {
        heroObserver = new win.IntersectionObserver(entries => {
          if (entries[0].isIntersecting) {
            win.addEventListener('scroll', scroll, { passive: true });
            scroll();
          } else stopScroll();
        });
        heroObserver.observe(hero);
      }
    } catch { stop(); } // Observer failure must leave all content usable.
  };
  const end = event => { if (targets.has(event.target)) event.target.removeAttribute('data-home-enter'); };
  root.addEventListener('animationend', end);
  reduce.addEventListener('change', start);
  desktop.addEventListener('change', start);
  doc.addEventListener('visibilitychange', start);
  win.addEventListener('pagehide', stop);
  win.addEventListener('pageshow', start);
  start();
  return () => {
    stop();
    root.removeEventListener('animationend', end);
    reduce.removeEventListener('change', start);
    desktop.removeEventListener('change', start);
    doc.removeEventListener('visibilitychange', start);
    win.removeEventListener('pagehide', stop);
    win.removeEventListener('pageshow', start);
  };
}

const root = document.getElementById('cdHomeFunnel');
attachHomeSurfaceMotion(root);
})();

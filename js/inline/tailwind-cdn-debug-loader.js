(function () {
  var enableTailwindCdn = false;
  try {
    var q = new URLSearchParams(location.search || '');
    enableTailwindCdn = q.get('tailwindcdn') === '1' || localStorage.getItem('debug.tailwindcdn') === '1';
  } catch (_e) {}
  if (!enableTailwindCdn) return;
  if (typeof window.__loadScriptOnce === 'function') {
    window.__loadScriptOnce('https://cdn.tailwindcss.com', { defer: true });
    return;
  }
  var s = document.createElement('script');
  s.src = 'https://cdn.tailwindcss.com';
  s.defer = true;
  document.head.appendChild(s);
})();

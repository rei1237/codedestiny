(function () {
  'use strict';

  var deferredInstallPrompt = null;
  var dialog = null;
  var dismissedKey = 'cd-pwa-install-prompt-dismissed-v1';

  function isNativeApp() {
    /* 🔴 판별 정본은 js/core/app-context.js 하나다(docs/app-audit/APP_UIUX_SPEC.md §2). */
    try {
      var ctx = window.__cdAppContext;
      if (ctx && typeof ctx.isApp === 'function') return ctx.isApp();
    } catch (_) {}
    /* 정본 미로딩 폴백 — 정본과 같은 신호만 본다. `!!window.Capacitor` 로 넓히지 말 것(과대판정). */
    try {
      if (window.__CODE_DESTINY_RUNTIME_TARGET === 'mobile-app') return true;
      if (document.documentElement
        && document.documentElement.getAttribute('data-runtime-target') === 'mobile-app') return true;
      var cap = window.Capacitor;
      return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
    } catch (_) {
      return false;
    }
  }

  function isStandalone() {
    try {
      return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
        || window.navigator.standalone === true;
    } catch (_) {
      return false;
    }
  }

  function canShow() {
    if (isNativeApp() || isStandalone()) return false;
    try { return window.sessionStorage.getItem(dismissedKey) !== '1'; } catch (_) { return true; }
  }

  function dismiss() {
    if (dialog) dialog.remove();
    dialog = null;
    try { window.sessionStorage.setItem(dismissedKey, '1'); } catch (_) {}
  }

  function createDialog() {
    if (dialog || !canShow()) return;

    dialog = document.createElement('section');
    dialog.id = 'cdPwaInstallPrompt';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'cdPwaInstallPromptTitle');
    dialog.innerHTML = ''
      + '<div class="cd-pwa-install-prompt__backdrop" data-cd-pwa-dismiss="1"></div>'
      + '<div class="cd-pwa-install-prompt__panel">'
      + '  <button class="cd-pwa-install-prompt__close" type="button" aria-label="닫기" data-cd-pwa-dismiss="1">×</button>'
      + '  <p class="cd-pwa-install-prompt__eyebrow">CODE DESTINY APP</p>'
      + '  <h2 id="cdPwaInstallPromptTitle">앱으로 더 편하게 만나볼까요?</h2>'
      + '  <p>홈 화면에 Code Destiny를 추가하면 앱처럼 빠르게 다시 열 수 있어요.</p>'
      + '  <div class="cd-pwa-install-prompt__actions">'
      + '    <button class="cd-pwa-install-prompt__install" type="button">앱으로 추가하기</button>'
      + '    <button class="cd-pwa-install-prompt__later" type="button" data-cd-pwa-dismiss="1">나중에</button>'
      + '  </div>'
      + '</div>';
    document.body.appendChild(dialog);

    dialog.addEventListener('click', function (event) {
      var target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-cd-pwa-dismiss="1"]')) {
        dismiss();
        return;
      }
      if (!target.closest('.cd-pwa-install-prompt__install') || !deferredInstallPrompt) return;

      var promptEvent = deferredInstallPrompt;
      deferredInstallPrompt = null;
      promptEvent.prompt();
      Promise.resolve(promptEvent.userChoice).then(function () {
        dismiss();
      }).catch(function () {
        dismiss();
      });
    });
  }

  function installStyles() {
    if (document.getElementById('cdPwaInstallPromptStyles')) return;
    var style = document.createElement('style');
    style.id = 'cdPwaInstallPromptStyles';
    style.textContent = ''
      + '#cdPwaInstallPrompt{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:end center;padding:18px;box-sizing:border-box;font-family:var(--font-body,system-ui,sans-serif)}'
      + '.cd-pwa-install-prompt__backdrop{position:absolute;inset:0;background:rgba(16,9,25,.48);backdrop-filter:blur(3px)}'
      + '.cd-pwa-install-prompt__panel{position:relative;width:min(100%,430px);box-sizing:border-box;padding:24px;border:1px solid rgba(255,255,255,.5);border-radius:24px;background:linear-gradient(145deg,#fffaf7,#f7edff);box-shadow:0 24px 60px rgba(19,9,33,.3);color:#2a1839}'
      + '.cd-pwa-install-prompt__close{position:absolute;top:11px;right:13px;width:34px;height:34px;border:0;border-radius:50%;background:rgba(58,37,76,.08);color:#503566;font-size:1.5rem;line-height:1;cursor:pointer}'
      + '.cd-pwa-install-prompt__eyebrow{margin:0 0 7px;color:#9b2d63;font-size:.7rem;font-weight:900;letter-spacing:.12em}'
      + '.cd-pwa-install-prompt__panel h2{margin:0;font-size:1.22rem;line-height:1.35;color:#321144}'
      + '.cd-pwa-install-prompt__panel p:not(.cd-pwa-install-prompt__eyebrow){margin:9px 0 0;color:#654d72;font-size:.9rem;line-height:1.55}'
      + '.cd-pwa-install-prompt__actions{display:flex;gap:9px;margin-top:18px}'
      + '.cd-pwa-install-prompt__actions button{min-height:44px;border-radius:12px;padding:0 15px;font:inherit;font-size:.88rem;font-weight:800;cursor:pointer}'
      + '.cd-pwa-install-prompt__install{flex:1;border:0;background:linear-gradient(135deg,#9d2e65,#633194);color:#fff;box-shadow:0 8px 18px rgba(113,44,116,.24)}'
      + '.cd-pwa-install-prompt__later{border:1px solid rgba(92,58,115,.18);background:rgba(255,255,255,.72);color:#694b78}'
      + '@media (min-width:769px){#cdPwaInstallPrompt{place-items:center}.cd-pwa-install-prompt__panel{padding:28px}}'
      + '@media (prefers-reduced-motion:reduce){.cd-pwa-install-prompt__panel{animation:none}}';
    document.head.appendChild(style);
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    if (!canShow()) return;
    event.preventDefault();
    deferredInstallPrompt = event;
    installStyles();
    createDialog();
  });

  window.addEventListener('appinstalled', function () {
    deferredInstallPrompt = null;
    dismiss();
  });
})();

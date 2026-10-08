(function (global) {
  'use strict';

  if (!global || global.__cdSignupBenefitExit) return;

  var ROOT_ID = 'cdSignupBenefitExit';
  var STYLE_ID = 'cdSignupBenefitExitStyles';
  var LOCK_KEY = 'signup-benefit-exit';
  var HIDE_UNTIL_KEY = 'cd_signup_benefit_exit_hide_until_v1';
  var shown = false;
  var exitAction = null;
  var stayAction = null;
  var previousFocus = null;

  function text(key, fallback) {
    try {
      if (typeof global.cdTranslate === 'function') return global.cdTranslate(key, {}, fallback);
    } catch (_) {}
    return fallback;
  }

  function isEligible() {
    if (shown) return false;
    try {
      var hideUntil = Number(global.localStorage.getItem(HIDE_UNTIL_KEY) || 0);
      if (hideUntil > Date.now()) return false;
    } catch (_) { /* 저장소 차단은 팝업 비노출 사유가 아니다 */ }
    try {
      return Boolean(document.querySelector('#authQuickLinks .auth-btn--signup'));
    } catch (_) {
      return false;
    }
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#' + ROOT_ID + '{--sbe-bg:#fff9f4;--sbe-surface:#fff;--sbe-ink:#402a38;--sbe-muted:#6b4d5e;--sbe-accent:#b53660;--sbe-gold:#7e6028;--sbe-gold-soft:#fff8dc;--sbe-line:rgba(126,96,40,.28);position:fixed;inset:0;z-index:2147482900;display:flex;align-items:flex-end;justify-content:center;padding:var(--cd-sp-md,16px);padding-bottom:calc(var(--cd-sp-md,16px) + env(safe-area-inset-bottom,0px));background:rgba(36,8,26,.66);font-family:var(--font-body,"Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif);color:var(--sbe-ink);overscroll-behavior:contain}',
      'html.neo-mode #' + ROOT_ID + ',body.neo-mode #' + ROOT_ID + '{--sbe-bg:#0a0818;--sbe-surface:#13102a;--sbe-ink:#f4eeff;--sbe-muted:#d7c8ee;--sbe-accent:#c4b5fd;--sbe-gold:#e8d5a3;--sbe-gold-soft:#211b38;--sbe-line:rgba(232,213,163,.32);background:rgba(3,2,12,.78)}',
      '#' + ROOT_ID + '[hidden]{display:none}',
      '#' + ROOT_ID + ' .cd-signup-exit__sheet{position:relative;width:min(100%,430px);max-height:min(680px,calc(100dvh - 32px));overflow:auto;border:1px solid var(--sbe-line);border-radius:var(--cd-r-section,26px);background:var(--sbe-surface);box-shadow:0 24px 64px rgba(58,14,40,.34);padding:28px 22px 20px;text-align:center;outline:none;animation:cd-signup-exit-in var(--cd-dur-emph,380ms) cubic-bezier(.22,1,.36,1)}',
      '#' + ROOT_ID + ' .cd-signup-exit__close{position:absolute;z-index:2;top:10px;right:10px;display:grid;place-items:center;width:44px;height:44px;padding:0;border:0;border-radius:var(--cd-r-pill,999px);background:transparent;color:var(--sbe-muted);cursor:pointer}',
      '#' + ROOT_ID + ' .cd-signup-exit__close svg{width:20px;height:20px}',
      '#' + ROOT_ID + ' .cd-signup-exit__close:hover{background:var(--sbe-bg)}',
      '#' + ROOT_ID + ' .cd-signup-exit__art{display:block;width:112px;height:116px;object-fit:contain;margin:-10px auto 2px;filter:drop-shadow(0 12px 18px rgba(143,47,87,.18))}',
      '#' + ROOT_ID + ' .cd-signup-exit__title{margin:0 auto;max-width:19ch;font-family:var(--font-serif,var(--font-display));font-size:var(--cd-t-display,clamp(1.5rem,3vw,2.05rem));font-weight:800;line-height:1.34;letter-spacing:-.025em;text-wrap:balance;color:var(--sbe-ink)}',
      '#' + ROOT_ID + ' .cd-signup-exit__title strong{display:block;color:var(--sbe-accent)}',
      '#' + ROOT_ID + ' .cd-signup-exit__copy{margin:12px auto 0;max-width:32ch;font-size:var(--cd-t-body,.9rem);font-weight:600;line-height:1.65;color:var(--sbe-muted);word-break:keep-all}',
      '#' + ROOT_ID + ' .cd-signup-exit__benefit{display:flex;align-items:center;justify-content:center;gap:9px;margin:18px 0 0;padding:11px 14px;border-radius:var(--cd-r-md,16px);background:var(--sbe-gold-soft);color:var(--sbe-gold);font-size:.8rem;font-weight:800;line-height:1.45}',
      '#' + ROOT_ID + ' .cd-signup-exit__moon{width:22px;height:22px;flex:none;color:currentColor}',
      '#' + ROOT_ID + ' .cd-signup-exit__actions{display:grid;gap:10px;margin-top:18px}',
      '#' + ROOT_ID + ' .cd-signup-exit__secondary{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
      '#' + ROOT_ID + ' .cd-signup-exit__primary,#' + ROOT_ID + ' .cd-signup-exit__leave{min-height:48px;border-radius:var(--cd-r-pill,999px);font:800 var(--cd-t-body,.9rem)/1.35 var(--font-body,"Pretendard",sans-serif);cursor:pointer}',
      '#' + ROOT_ID + ' .cd-signup-exit__primary{display:flex;align-items:center;justify-content:center;border:1px solid color-mix(in srgb,var(--sbe-accent) 74%,#000);background:var(--sbe-accent);color:#fff;text-decoration:none;box-shadow:0 12px 26px color-mix(in srgb,var(--sbe-accent) 24%,transparent)}',
      '#' + ROOT_ID + ' .cd-signup-exit__leave{border:1px solid var(--sbe-line);background:transparent;color:var(--sbe-muted)}',
      '#' + ROOT_ID + ' .cd-signup-exit__today{min-height:48px;border:0;background:transparent;color:var(--sbe-muted);font:700 .78rem/1.4 var(--font-body,"Pretendard",sans-serif);text-decoration:underline;text-underline-offset:4px;cursor:pointer}',
      '#' + ROOT_ID + ' :is(button,a):focus-visible{outline:3px solid var(--sbe-gold);outline-offset:3px}',
      '@keyframes cd-signup-exit-in{from{opacity:.72;transform:translateY(26px);clip-path:inset(18% 0 0 round var(--cd-r-section,26px))}to{opacity:1;transform:translateY(0);clip-path:inset(0 round var(--cd-r-section,26px))}}',
      '@media (min-width:640px){#' + ROOT_ID + '{align-items:center}#' + ROOT_ID + ' .cd-signup-exit__sheet{padding:32px 28px 24px}}',
      '@media (prefers-reduced-motion:reduce){#' + ROOT_ID + ' .cd-signup-exit__sheet{animation-duration:.01ms}}'
    ].join('');
    document.head.appendChild(style);
  }

  function build() {
    var root = document.getElementById(ROOT_ID);
    if (root) return root;
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.hidden = true;
    root.innerHTML = '' +
      '<section class="cd-signup-exit__sheet" role="dialog" aria-modal="true" aria-labelledby="cdSignupBenefitExitTitle" aria-describedby="cdSignupBenefitExitCopy" tabindex="-1">' +
        '<button type="button" class="cd-signup-exit__close" data-close aria-label="' + text('auth.exitBenefit.close', '혜택 안내 닫기') + '"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6L18 18M18 6L6 18"/></svg></button>' +
        '<img class="cd-signup-exit__art" src="/assets/mascot/yeoni-moonstone-reward-v1-160.webp" width="160" height="165" alt="' + text('auth.exitBenefit.artAlt', '월정석 선물을 건네는 꽃돼지 연이') + '">' +
        '<h2 class="cd-signup-exit__title" id="cdSignupBenefitExitTitle">' + text('auth.exitBenefit.title', '잠깐, 지금 닫으면 <strong>5,000원 상당 혜택</strong>을 놓치게 돼요') + '</h2>' +
        '<p class="cd-signup-exit__copy" id="cdSignupBenefitExitCopy">' + text('auth.exitBenefit.copy', '첫 가입을 마치면 월정석 500개가 바로 지급돼요. 유료 콘텐츠 결제에 30일 동안 사용할 수 있어요.') + '</p>' +
        '<p class="cd-signup-exit__benefit"><svg class="cd-signup-exit__moon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M17.5 15.7A7.7 7.7 0 0 1 8.3 6.5a7.7 7.7 0 1 0 9.2 9.2Z"/><path d="m17.8 5.2.45 1.25 1.25.45-1.25.45-.45 1.25-.45-1.25-1.25-.45 1.25-.45Z"/></svg><span>' + text('auth.exitBenefit.note', '현금 쿠폰이 아닌 첫 가입 이벤트 월정석이에요') + '</span></p>' +
        '<div class="cd-signup-exit__actions"><a class="cd-signup-exit__primary" href="/signup/?next=%2F">' + text('auth.exitBenefit.join', '혜택 받고 가입하기') + '</a><div class="cd-signup-exit__secondary"><button type="button" class="cd-signup-exit__leave">' + text('auth.exitBenefit.leave', '그냥 종료하기') + '</button><button type="button" class="cd-signup-exit__today">' + text('auth.exitBenefit.today', '오늘 하루 보지 않기') + '</button></div></div>' +
      '</section>';
    document.body.appendChild(root);

    root.querySelector('.cd-signup-exit__close').addEventListener('click', close);
    root.querySelector('.cd-signup-exit__leave').addEventListener('click', function () {
      var action = exitAction;
      close(false);
      if (typeof action === 'function') action();
    });
    root.querySelector('.cd-signup-exit__today').addEventListener('click', function () {
      try {
        var tomorrow = new Date();
        tomorrow.setHours(24, 0, 0, 0);
        global.localStorage.setItem(HIDE_UNTIL_KEY, String(tomorrow.getTime()));
      } catch (_) {}
      close();
    });
    root.addEventListener('click', function (event) {
      if (event.target === root) close();
    });
    root.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      var focusable = root.querySelectorAll('button:not([disabled]),a[href]');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    return root;
  }

  function open(onExit, onStay) {
    if (!isEligible()) return false;
    shown = true;
    exitAction = typeof onExit === 'function' ? onExit : null;
    stayAction = typeof onStay === 'function' ? onStay : null;
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ensureStyles();
    var root = build();
    root.hidden = false;
    if (typeof global.__cdLockBodyScroll === 'function') global.__cdLockBodyScroll(LOCK_KEY);
    var sheet = root.querySelector('.cd-signup-exit__sheet');
    if (sheet) global.requestAnimationFrame(function () { sheet.focus(); });
    return true;
  }

  function close(restoreFocus) {
    var root = document.getElementById(ROOT_ID);
    if (!root || root.hidden) return false;
    root.hidden = true;
    var resume = stayAction;
    exitAction = null;
    stayAction = null;
    if (typeof global.__cdUnlockBodyScroll === 'function') global.__cdUnlockBodyScroll(LOCK_KEY);
    if (restoreFocus !== false && previousFocus && document.contains(previousFocus)) previousFocus.focus();
    previousFocus = null;
    if (restoreFocus !== false && typeof resume === 'function') resume();
    return true;
  }

  global.__cdSignupBenefitExit = { open: open, close: close, isEligible: isEligible };
})(typeof window !== 'undefined' ? window : null);

// ==========================================
// Cosmic Google Translate Widget
// Stable Version - Essential Features Only
// ==========================================

(function() {
  'use strict';
  
  const widget = document.getElementById('google_translate_element');
  if (!widget) return;


  // 1. 언어 매핑 (구글 번역기 표준 코드)
  const langMap = {
    'ko': '🇰🇷 한국어',
    'en': '🇺🇸 English',
    'ja': '🇯🇵 日本語',
    'zh-CN': '🇨🇳 简体中文',
    'zh-TW': '🇹🇼 繁體中文',
    'fr': '🇫🇷 Français',
    'es': '🇪🇸 Español',
    'hi': '🇮🇳 हिन्दी',
    'de': '🇩🇪 Deutsch',
    'nl': '🇳🇱 Nederlands',
    'ms': '🇲🇾 Melayu'
  };

  const langDesc = {
    'ko': 'Korean',
    'en': 'English',
    'ja': 'Japanese',
    'zh-CN': 'Chinese (Simplified)',
    'zh-TW': 'Chinese (Traditional)',
    'fr': 'French',
    'es': 'Spanish',
    'de': 'German',
    'hi': 'Hindi',
    'nl': 'Dutch',
    'ms': 'Malay'
  };


  // 2. 우주 테마 CSS 스타일
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    /* 애니메이션 */
    @keyframes cosmicFloat {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-6px); }
      100% { transform: translateY(0px); }
    }

    @keyframes starGlow {
      0% { box-shadow: 0 0 10px #4c1d95, 0 0 20px #1e3a8a; }
      50% { box-shadow: 0 0 20px #7e22ce, 0 0 35px #3b82f6; }
      100% { box-shadow: 0 0 10px #4c1d95, 0 0 20px #1e3a8a; }
    }

    /* 접근성: 모션 감소 설정 존중 */
    @media (prefers-reduced-motion: reduce) {
      @keyframes cosmicFloat {
        0%, 100% { transform: translateY(0px); }
      }
      @keyframes starGlow {
        0%, 100% { box-shadow: 0 0 10px #4c1d95, 0 0 20px #1e3a8a; }
      }
    }

    /* 위젯 컨테이너 */
    #google_translate_element {
      position: fixed !important;
      bottom: max(30px, env(safe-area-inset-bottom));
      right: max(30px, env(safe-area-inset-right));
      z-index: 9999;
      transition: opacity 0.3s ease;
    }

    /* 모바일 landscape */
    @media (max-height: 500px) {
      #google_translate_element {
        bottom: max(15px, env(safe-area-inset-bottom));
        right: max(15px, env(safe-area-inset-right));
      }
    }

    /* Select 요소 스타일 */
    #google_translate_element select.goog-te-combo {
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background: linear-gradient(135deg, #0f172a 0%, #312e81 100%);
      color: #e0e7ff;
      font-weight: bold;
      font-size: 15px;
      padding: 12px 40px 12px 18px;
      border: 2px solid #6366f1;
      border-radius: 25px;
      cursor: pointer;
      outline: none;
      animation: starGlow 3s infinite alternate;
      text-shadow: 0 0 5px #c7d2fe;
      letter-spacing: 0.05em;
      box-sizing: border-box;
      min-height: 44px;
      min-width: 120px;
      -webkit-tap-highlight-color: transparent;
      -webkit-user-select: none;
      user-select: none;
    }

    #google_translate_element select.goog-te-combo:hover {
      background: linear-gradient(135deg, #1e1b4b 0%, #3730a3 100%);
      border-color: #818cf8;
    }

    #google_translate_element select.goog-te-combo:focus {
      border-color: #a855f7;
      box-shadow: 0 0 12px rgba(168, 85, 247, 0.4);
      outline: none;
    }

    #google_translate_element select.goog-te-combo:active {
      border-color: #7c3aed;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    /* 드롭다운 화살표를 이모지로 대체 */
    .cosmic-wrapper {
      position: relative;
      display: inline-block;
      animation: cosmicFloat 4s ease-in-out infinite;
    }

    .cosmic-wrapper::before {
      content: '🌐';
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      font-size: 18px;
      filter: drop-shadow(0 0 4px #fff);
    }

    .cosmic-wrapper::after {
      content: '▼';
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      font-size: 11px;
      filter: drop-shadow(0 0 4px #fff);
      color: #a855f7;
    }

    /* 툴팁 */
    .cosmic-tooltip {
      position: absolute;
      display: none;
      background: rgba(30, 30, 40, 0.95);
      color: #fff;
      font-size: 13px;
      font-weight: bold;
      padding: 8px 14px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
      bottom: 110%;
      left: 50%;
      transform: translateX(-50%);
    }

    .cosmic-tooltip.visible {
      display: block;
      opacity: 1;
    }

    /* 구글 번역 기본 요소 숨김 */
    .goog-logo-link,
    .goog-te-gadget span,
    .goog-te-gadget img {
      display: none !important;
    }

    .goog-te-gadget {
      color: transparent !important;
      font-size: 0;
    }

    .goog-te-gadget * {
      -webkit-touch-callout: none;
    }
  `;
  document.head.appendChild(styleSheet);


  // 3. Select 요소 감지 및 초기화
  let initAttempts = 0;
  const maxAttempts = 30; // 3초 (100ms * 30)

  function initWidget() {
    const selects = widget.querySelectorAll('select.goog-te-combo');
    
    if (selects.length === 0) {
      if (initAttempts < maxAttempts) {
        initAttempts++;
        setTimeout(initWidget, 100);
      }
      return;
    }

    const select = selects[0];

    // 기존 중복 select 제거
    for (let i = 1; i < selects.length; i++) {
      selects[i].remove();
    }

    // 이미 처리되었는지 확인
    if (select.dataset.cosmicInitialized === 'true') {
      return;
    }
    select.dataset.cosmicInitialized = 'true';

    // Select을 wrapper로 감싸기
    const parent = select.parentNode;
    if (parent && !parent.classList.contains('cosmic-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'cosmic-wrapper';
      parent.insertBefore(wrapper, select);
      wrapper.appendChild(select);
    }

    // 툴팁 생성
    let tooltip = widget.querySelector('.cosmic-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'cosmic-tooltip';
      select.parentNode.appendChild(tooltip);
    }

    // 언어 옵션 업데이트
    function updateOptions() {
      Array.from(select.options).forEach(option => {
        const code = option.value;
        if (langMap[code]) {
          option.textContent = langMap[code];
          option.dataset.desc = langDesc[code] || '';
        }
      });
    }

    updateOptions();

    // 이벤트 리스너
    select.addEventListener('change', function() {
      setTimeout(updateOptions, 50);
    }, { passive: true });

    select.addEventListener('mousemove', function() {
      const code = select.value;
      const desc = langDesc[code] || '';
      if (desc) {
        tooltip.textContent = code.toUpperCase() + ' — ' + desc;
        tooltip.classList.add('visible');
      }
    }, { passive: true });

    select.addEventListener('mouseleave', function() {
      tooltip.classList.remove('visible');
    }, { passive: true });

    select.addEventListener('focus', function() {
      tooltip.classList.remove('visible');
    }, { passive: true });

    // 30초 후 자동 숨김
    setTimeout(function() {
      widget.style.opacity = '0';
      widget.style.pointerEvents = 'none';
    }, 30000);
  }

  // 초기화 시작
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
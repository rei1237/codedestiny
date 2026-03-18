// ==========================================
// Cosmic Google Translate Widget UI/UX
// Theme: Space, Galaxy, Stars
// Features: Flag Emojis, Auto-hide (30s), Floating Animation
// ==========================================

(function() {
  const widget = document.getElementById('google_translate_element');
  if (!widget) return;

  // 1. 언어 및 국기 이모지 매핑 (구글 번역기 Value 기준)
  const cosmicLangMap = {
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

  // 2. 우주 테마 CSS 스타일 동적 주입
  const style = document.createElement('style');
  style.innerHTML = `
    /* 우주 공간의 부유하는 느낌을 주는 애니메이션 */
    @keyframes cosmicFloat {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-6px); }
      100% { transform: translateY(0px); }
    }
    /* 별빛이 뿜어져 나오는 네온 글로우 효과 */
    @keyframes starGlow {
      0% { box-shadow: 0 0 10px #4c1d95, 0 0 20px #1e3a8a; }
      50% { box-shadow: 0 0 20px #7e22ce, 0 0 35px #3b82f6; }
      100% { box-shadow: 0 0 10px #4c1d95, 0 0 20px #1e3a8a; }
    }

    /* 위젯 기본 컨테이너 설정 */
    #google_translate_element {
      position: fixed !important;
      bottom: 30px;
      right: 30px;
      z-index: 9999;
      transition: opacity 1.5s ease-in-out, transform 1.5s ease-in-out;
    }

    /* 구글 번역기 Select 박스 우주 테마 커스텀 */
    #google_translate_element select.goog-te-combo {
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background: linear-gradient(135deg, #0f172a 0%, #312e81 100%);
      color: #e0e7ff; /* 별빛 화이트/블루 */
      font-weight: bold;
      font-size: 15px;
      padding: 12px 40px 12px 20px;
      border: 1px solid #6366f1;
      border-radius: 30px;
      cursor: pointer;
      outline: none;
      animation: starGlow 3s infinite alternate;
      text-shadow: 0 0 5px #c7d2fe;
      letter-spacing: 0.05em;
    }

    #google_translate_element select.goog-te-combo:focus {
      border-color: #a855f7;
    }

    /* 별 모양 아이콘(✨)으로 드롭다운 화살표 대체 */
    .cosmic-wrapper {
      position: relative;
      display: inline-block;
      animation: cosmicFloat 4s ease-in-out infinite;
    }
    .cosmic-wrapper::after {
      content: '✨';
      position: absolute;
      right: 15px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      font-size: 16px;
      filter: drop-shadow(0 0 4px #fff);
    }

    /* 구글 기본 텍스트 및 로고 숨김 처리 (클린 UI) */
    .goog-logo-link, .goog-te-gadget span, .goog-te-gadget img {
      display: none !important;
    }
    .goog-te-gadget {
      color: transparent !important;
      font-size: 0;
    }
  `;
  document.head.appendChild(style);

  // 3. Select 요소 DOM 렌더링 감지 및 조작 (최대 3초 대기)
  let watchCount = 0;
  const maxWatch = 30; // 100ms * 30 = 3초

  function initCosmicWidget() {
    const select = widget.querySelector('select.goog-te-combo');
    if (!select) {
      if (++watchCount < maxWatch) setTimeout(initCosmicWidget, 100);
      return;
    }

    // Select 요소를 래퍼로 감싸서 우주 테마 UI 적용
    if (!select.parentNode.classList.contains('cosmic-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'cosmic-wrapper';
      select.parentNode.insertBefore(wrapper, select);
      wrapper.appendChild(select);
    }

    // 국기 + 모국어 텍스트로 옵션 업데이트
    function updateOptions() {
      Array.from(select.options).forEach(opt => {
        if (cosmicLangMap[opt.value]) {
          opt.textContent = cosmicLangMap[opt.value];
        }
      });
    }
    updateOptions();

    // 언어 전환 시 구글 스크립트가 텍스트를 덮어씌우는 것 방지
    select.addEventListener('change', () => {
      setTimeout(updateOptions, 50);
    });

    // 4. 30초 후 위젯이 우주 저 멀리 사라지는 애니메이션 (Fade out & Fly up)
    setTimeout(() => {
      widget.style.opacity = '0';
      widget.style.transform = 'translateY(-100px) scale(0.5)';
      widget.style.pointerEvents = 'none';
    }, 30000);
  }

  // 초기화 실행
  initCosmicWidget();
})();
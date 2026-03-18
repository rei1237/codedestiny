// Cosmic Google Translate Widget UI/UX enhancement
(function(){
  var widget = document.getElementById('google_translate_element');
  if (!widget) return;
  // Remove old custom label if exists
  var old = document.getElementById('planetLangLabel');
  if (old) old.remove();

  // Create floating cosmic label
  var label = document.createElement('div');
  label.id = 'planetLangLabel';
  label.innerHTML = '<span class="planet-emoji">🪐</span> <span class="planet-lang-text">LANG</span>';
  label.style.position = 'absolute';
  label.style.top = '8px';
  label.style.left = '50%';
  label.style.transform = 'translateX(-50%)';
  label.style.fontWeight = 'bold';
  label.style.fontSize = '13px';
  label.style.color = '#fff';
  label.style.textShadow = '0 2px 8px #e04567, 0 0 2px #fff';
  label.style.pointerEvents = 'none';
  label.style.zIndex = '2';
  widget.appendChild(label);

  // Animate planet emoji
  var emoji = label.querySelector('.planet-emoji');
  if (emoji) {
    emoji.style.display = 'inline-block';
    emoji.style.animation = 'planetSpin 3.5s linear infinite';
  }

  // Update select options to native names and style
  var select = widget.querySelector('select.goog-te-combo');
  if (select) {
    // 위젯 클릭 시 select에 포커스 (모바일/PC 모두 지원)
    widget.style.cursor = 'pointer';
    widget.addEventListener('click', function(e) {
      if (e.target === select) return; // select 직접 클릭은 무시
      select.focus();
      // 모바일: select를 강제로 클릭해 네이티브 드롭다운 오픈
      try { select.dispatchEvent(new MouseEvent('mousedown', {bubbles:true})); } catch(_) {}
      try { select.click(); } catch(_) {}
    });
    var langMap = {
      'ko': '한국어',
      'en': 'English',
      'ja': '日本語',
      'zh-CN': '简体中文',
      'zh-TW': '繁體中文',
      'fr': 'Français',
      'es': 'Español',
      'hi': 'हिन्दी',
      'de': 'Deutsch',
      'nl': 'Nederlands',
      'ms': 'Melayu'
    };
    // 옵션을 모국어로 재구성
    var opts = Array.from(select.options);
    opts.forEach(function(opt) {
      if (langMap[opt.value]) {
        opt.textContent = langMap[opt.value];
      }
    });
    // select 스타일 강화
    select.style.background = 'rgba(255,255,255,0.92)';
    select.style.border = '1.5px solid #e04567';
    select.style.color = '#e04567';
    select.style.fontWeight = 'bold';
    select.style.fontSize = '14px';
    select.style.boxShadow = '0 2px 10px rgba(224,69,103,0.10)';
    select.style.padding = '4px 10px';
    select.style.marginTop = '8px';
    select.style.textAlign = 'center';
    select.style.letterSpacing = '0.01em';
    select.style.cursor = 'pointer';
    select.style.transition = 'border 0.2s, box-shadow 0.2s';
    select.onfocus = function(){ select.style.border = '2px solid #ff8ba7'; };
    select.onblur = function(){ select.style.border = '1.5px solid #e04567'; };
    // 라벨도 네이티브로 동기화
    function updateLabel() {
      var v = select.value;
      label.querySelector('.planet-lang-text').textContent = langMap[v] || v.toUpperCase();
    }
    select.addEventListener('change', updateLabel);
    setTimeout(updateLabel, 100);

    // 위젯 클릭 시 select에 포커스 (모바일/데스크탑 모두)
    widget.style.cursor = 'pointer';
    widget.addEventListener('click', function(e) {
      if (e.target === select) return;
      select.focus();
      select.size = 12; // 드롭다운 확장
      setTimeout(function(){ select.size = 0; }, 2000); // 2초 후 원복
    });

    // 30초 후 위젯 자동 숨김
    setTimeout(function(){ widget.style.opacity = '0'; widget.style.pointerEvents = 'none'; }, 30000);
  }
})();

// Add cosmic floating animation & select custom style
var style = document.createElement('style');
style.innerHTML = `
@keyframes planetSpin {
  0% { transform: rotate(0deg) scale(1.08); }
  100% { transform: rotate(360deg) scale(1.08); }
}
#planetLangLabel .planet-emoji {
  filter: drop-shadow(0 0 6px #b7e6ff) drop-shadow(0 0 2px #fff);
}
#google_translate_element.planet-widget select.goog-te-combo {
  border-radius: 18px !important;
  min-width: 90px;
  max-width: 120px;
  outline: none;
  background: rgba(255,255,255,0.92);
  color: #e04567;
  font-weight: bold;
  font-size: 14px;
  box-shadow: 0 2px 10px rgba(224,69,103,0.10);
  padding: 4px 10px;
  margin-top: 8px;
  text-align: center;
  letter-spacing: 0.01em;
  border: 1.5px solid #e04567;
  transition: border 0.2s, box-shadow 0.2s;
  cursor: pointer;
}
#google_translate_element.planet-widget select.goog-te-combo:focus {
  border: 2px solid #ff8ba7;
}
`;
document.head.appendChild(style);
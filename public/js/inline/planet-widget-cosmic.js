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

  // Update label on language change
  var select = widget.querySelector('select.goog-te-combo');
  if (select) {
    var langMap = { 'ko': '한국어', 'en': 'English', 'ja': '日本語', 'zh-CN': '简体中文', 'fr': 'Français', 'es': 'Español', 'hi': 'हिन्दी', 'de': 'Deutsch', 'nl': 'Nederlands', 'ms': 'Melayu', 'zh-TW': '繁體中文' };
    function updateLabel() {
      var v = select.value;
      label.querySelector('.planet-lang-text').textContent = langMap[v] || v.toUpperCase();
    }
    select.addEventListener('change', updateLabel);
    setTimeout(updateLabel, 100);
  }
})();

// Add cosmic floating animation
var style = document.createElement('style');
style.innerHTML = `
@keyframes planetSpin {
  0% { transform: rotate(0deg) scale(1.08); }
  100% { transform: rotate(360deg) scale(1.08); }
}
#planetLangLabel .planet-emoji {
  filter: drop-shadow(0 0 6px #b7e6ff) drop-shadow(0 0 2px #fff);
}
`;
document.head.appendChild(style);
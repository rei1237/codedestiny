/* ─── 주역 전체화면 페이지 ─── */
function openJuyukModal() {
  var overlay = document.getElementById('juyukModalOverlay');
  if (!overlay) return;
  if (typeof tcReset === 'function') tcReset();
  overlay.style.display = 'block';
  setTimeout(function(){ overlay.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
  setTimeout(function() {
    var inp = document.getElementById('ichingQuestion');
    if (inp) inp.focus();
  }, 380);
}

function closeJuyukModal() {
  var overlay = document.getElementById('juyukModalOverlay');
  if (overlay) overlay.style.display = 'none';
  /* 홈(메인 화면)으로 돌아갈 때 거북점 섹션이 보이도록 부드럽게 스크롤 */
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ESC 키로 닫기 */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeJuyukModal();
});


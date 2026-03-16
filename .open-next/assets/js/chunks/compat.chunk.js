export function beforeCompatRender() {
  const box = document.getElementById('compatResult');
  if (!box) return;

  box.dataset.rendering = '1';
  box.innerHTML = '<div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div>';
}

export function afterCompatRender() {
  const box = document.getElementById('compatResult');
  if (!box) return;
  box.dataset.rendering = '0';

  const blocks = box.querySelectorAll('.compat-section,.compat-fact-box,.compat-advice-box');
  blocks.forEach((el) => {
    if (!el || el.dataset.compactCard === '1') return;
    el.dataset.compactCard = '1';
    el.style.contain = 'layout style';
  });
}

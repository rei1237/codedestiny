// Progressive enhancement shared by Next and the generated standalone FAQ.
// Without JavaScript, every question remains readable through native details.
export function attachFaqSearch(root) {
  if (!root || root.dataset.faqReady) return;
  const input = root.querySelector('[data-faq-input]');
  const clear = root.querySelector('[data-faq-clear]');
  const count = root.querySelector('[data-faq-count]');
  const empty = root.querySelector('[data-faq-empty]');
  const controls = root.querySelector('[data-faq-controls]');
  const questions = [...root.querySelectorAll('#faq-results > details')];
  const searchable = questions.map(item => item.textContent.toLocaleLowerCase('ko'));
  const update = () => {
    const terms = input.value.trim().toLocaleLowerCase('ko').split(/\s+/).filter(Boolean);
    let matches = 0;
    questions.forEach((item, index) => {
      item.hidden = !terms.every(term => searchable[index].includes(term));
      if (!item.hidden) matches += 1;
    });
    count.textContent = terms.length ? `검색 결과 ${matches}개` : `전체 질문 ${questions.length}개`;
    empty.hidden = matches > 0;
    clear.hidden = !input.value;
  };
  const reset = () => { input.value = ''; update(); input.focus(); };
  root.dataset.faqReady = 'true';
  controls.hidden = false;
  input.addEventListener('input', update);
  clear.addEventListener('click', reset);
  return () => {
    input.removeEventListener('input', update);
    clear.removeEventListener('click', reset);
    delete root.dataset.faqReady;
  };
}

// Only the standalone page loads this file directly. Next initializes in useEffect.
if (typeof document !== 'undefined' && document.querySelector('script[type="module"][src*="/js/faq-search.js"]')) {
  document.querySelectorAll('[data-faq-search]').forEach(attachFaqSearch);
}

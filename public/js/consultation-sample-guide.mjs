const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paragraphs = text => String(text || '').split(/\n\s*\n/).filter(Boolean).map(p => '<p>' + escape(p) + '</p>').join('');
const sourceLink = example => example.kind === 'result' && example.sourceUrl === 'https://claude.ai/artifact/PtPUfhaiHM37ebpxtr4nQV'
  ? '<a href="' + example.sourceUrl + '" target="_blank" rel="noopener noreferrer">발췌 출처: ' + escape(example.sourceLabel) + ' (새 창)</a>' : '';

/** Display-only shared guide: no profile, pricing, payment or generation state. */
export function renderConsultationSampleGuide(guide, {headingLevel = 3, title = '받게 될 내용과 예시'} = {}) {
  if (!guide?.outline?.length || !guide.examples?.length) return '';
  const level = Math.min(5, Math.max(2, Number(headingLevel) || 3));
  const heading = 'h' + level, sub = 'h' + (level + 1);
  const exampleHtml = example => '<section class="consultation-guide__example" data-example-kind="' + escape(example.kind) + '"><' + sub + '>' + escape(example.title) + '</' + sub + '><p class="consultation-guide__note">' +
    (example.kind === 'result' ? '가상 프로필의 입력·AI 결과 원문 발췌 · 실제 고객 후기 아님' : '이해를 돕기 위한 편집 예시 · 실제 생성 결과 아님') +
    '</p><blockquote>' + paragraphs(example.text) + '</blockquote>' + sourceLink(example) + '</section>';
  return '<section class="consultation-guide" aria-label="' + escape(title) + '"><' + heading + '>' + escape(title) + '</' + heading + '><p>' + escape(guide.audience) + '</p>' +
    '<div class="consultation-guide__reading">' + exampleHtml(guide.examples[0]) +
    (guide.examples.length > 1 ? '<details class="consultation-guide__more"><summary>예시 더 읽기 <span>해석과 행동까지</span></summary>' + guide.examples.slice(1).map(exampleHtml).join('') + '</details>' : '') +
    '</div><details class="consultation-guide__more"><summary>상담에 담기는 내용 펼쳐보기</summary><dl class="consultation-guide__outline">' + guide.outline.map(row => '<div><dt>' + escape(row.title) + '</dt><dd>' + escape(row.text) + '</dd></div>').join('') + '</dl></details>' +
    '<div class="consultation-guide__prepare"><' + sub + '>상담 전에 준비해 주세요</' + sub + '><p>' + escape(guide.preparation) + '</p></div>' +
    '<p class="consultation-guide__delivery">' + escape(guide.delivery) + '</p></section>';
}

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');

test('대표 상담은 첫 렌더부터 네 장 모두 직접 선택할 수 있다', () => {
  const dom = new JSDOM(fs.readFileSync('public/ggulggul/index.html', 'utf8'), {virtualConsole: new VirtualConsole()});
  try {
    const section = dom.window.document.getElementById('cdSignatureConsult');
    const cards = [...section.querySelectorAll('.yh-featured-grid > article')];
    assert.deepEqual(cards.map(card => card.querySelector('.cd-picker-main').dataset.featureKey), [
      'new-year-ai-consultation', 'love-secret-ai-consultation', 'heukwol-warning-consultation', 'life-book-ai-consultation',
    ]);
    const comics = [
      '/consultations/new-year/#story', '/consultations/love-secret/#story',
      '/heukwol/#heukwol-story', '/consultations/life-book/#story',
    ];
    for (const [index, card] of cards.entries()) {
      const preview = card.querySelector('details.yh-chapter-preview');
      assert.ok(preview && !preview.open);
      assert.match(preview.querySelector('summary').textContent, /챕터 자세히 보기/);
      assert.ok(preview.querySelector('.yh-chapter-preview__titles li'));
      const comic = card.querySelector('a.yh-webtoon-action');
      assert.equal(comic.getAttribute('href'), comics[index]);
      assert.match(comic.textContent, /웹툰으로 알아보기/);
      assert.equal(comic.parentElement.closest('a, button, summary'), null);
      assert.equal(card.closest('[hidden], [inert], details'), null);
      assert.ok(card.querySelector('a.cd-picker-main[href]'));
      assert.ok(card.querySelector('img[width][height]'));
    }
    assert.equal(section.querySelector('[data-sig-banner]'), null);
    assert.equal(section.querySelectorAll('a[data-feature-key="heukwol-warning-consultation"]').length, 1);
  } finally {
    dom.window.close();
  }
});

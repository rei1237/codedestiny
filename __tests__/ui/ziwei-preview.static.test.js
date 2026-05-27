const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

function read(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
}

function between(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);
  if (start === -1 || end === -1 || end <= start) {
    return '';
  }
  return source.slice(start, end);
}

test('ziwei preview structured renderer supports body/content and markdown html conversion', () => {
  const script = read('js/ziwei-book.js');
  const rendererSlice = between(
    script,
    'function _renderStructuredChapterBody(chapter, chapterJson) {',
    '/* ─────────────── 프로필/자미두수 데이터 수집 ─────────────── */'
  );

  assert.ok(rendererSlice.includes("String(row.body || row.content || '').trim()"));
  assert.ok(rendererSlice.includes('_md2html(body)'));
  assert.ok(rendererSlice.includes("return '<div class=\"lb-result-article__structured\">' + out.join('') + '</div>';"));
});

test('ziwei preview chapter rendering prefers structured body before plain markdown fallback', () => {
  const script = read('js/ziwei-book.js');
  const chapterSlice = between(
    script,
    'function _renderChapter(ch) {',
    'function _updateTocState() {'
  );

  assert.ok(chapterSlice.includes('var bodyHtml = _renderStructuredChapterBody(ch, structured);'));
  assert.ok(chapterSlice.includes('if (!bodyHtml && data) bodyHtml = _md2html(data);'));
  assert.ok(chapterSlice.includes('if (!bodyHtml && structured) bodyHtml = _md2html(_deriveTextFromChapterJson(structured));'));
});

test('public ziwei script keeps same structured preview contract as root source', () => {
  const rootScript = read('js/ziwei-book.js');
  const publicScript = read('public/js/ziwei-book.js');

  const rootSignature = [
    "String(row.body || row.content || '').trim()",
    'var bodyHtml = _renderStructuredChapterBody(ch, structured);',
    'if (!bodyHtml && data) bodyHtml = _md2html(data);',
    'if (!bodyHtml && structured) bodyHtml = _md2html(_deriveTextFromChapterJson(structured));',
  ];

  rootSignature.forEach((token) => {
    assert.ok(rootScript.includes(token));
    assert.ok(publicScript.includes(token));
  });
});

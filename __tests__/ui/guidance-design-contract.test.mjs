import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
import {JSDOM} from 'jsdom';

test('transparent character artwork never receives an opaque global image background', () => {
  for (const file of ['styles/fortune-ui.css','styles/fortune-ui-home.css','styles/core-ui.css']) {
    postcss.parse(readFileSync(file,'utf8')).walkRules(rule => {
      if (!rule.selectors?.some(selector => selector.trim() === 'img')) return;
      rule.walkDecls(/background/, declaration => {
        assert.match(declaration.value,/^(transparent|none|rgba\(0,\s*0,\s*0,\s*0\))$/,`${file}: ${rule.selector} must preserve image alpha`);
      });
    });
  }
  const html = readFileSync('index.html','utf8');
  for (const style of new JSDOM(html).window.document.querySelectorAll('style')) {
    postcss.parse(style.textContent).walkRules(rule => {
      if (!rule.selectors?.some(selector => selector.trim() === 'img')) return;
      rule.walkDecls(/background/, declaration => assert.match(declaration.value,/^(transparent|none)$/));
    });
  }
});

test('shared guidance rules are loaded and controls use the body font', () => {
  assert.match(readFileSync('index.html','utf8'),/href="\/styles\/guide-primitives\.css(?:\?[^"]*)?"/);
  const rules = postcss.parse(readFileSync('styles/theme-tokens.css','utf8'));
  let font;
  rules.walkRules('.cd-btn', rule => rule.walkDecls('font-family', declaration => {font=declaration.value;}));
  assert.equal(font,'var(--font-body)');
});

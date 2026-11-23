import test from 'node:test';
import assert from 'node:assert/strict';
import { initialStyles } from '../../scripts/optimize-next-home-styles.mjs';

test('critical home styles retain matching states, module interactions and Unicode font subsets', () => {
  const source = [
    '.home_page__123{color:navy}',
    '.home_dialog__456{color:plum}',
    '.md\\:grid:hover{display:grid}',
    ':where(.other,p){font-size:16px}',
    '.entirely-unused{color:red}',
    '@media(min-width:900px){.absent{display:none}}',
    '@font-face{font-family:display;src:url(ordinary.woff2);unicode-range:U+AC00-D7A3}',
    '@font-face{font-family:display;src:url(other.woff2);unicode-range:U+0400-04FF}',
    '@keyframes fade{from{opacity:0}to{opacity:1}}',
  ].join('');
  const output = initialStyles(source, new Set(['home_page__123','home_*','md:grid']), ['달'.codePointAt(0)]);
  assert.match(output, /home_dialog__456/);
  assert.ok(output.includes('.md\\:grid:hover'));
  assert.ok(output.includes(':where(.other,p)'));
  assert.match(output, /ordinary\.woff2/);
  assert.match(output, /@keyframes fade/);
  assert.doesNotMatch(output, /entirely-unused|\.absent|other\.woff2/);
});

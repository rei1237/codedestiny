import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertYehwaFirstPaint } from '../../scripts/lib/yehwa-firstpaint-contract.mjs';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('styles/yehwa-home.css', 'utf8');
const link = html.match(/<link[^>]*href="\/styles\/yehwa-home\.css[^>]*>/)[0];

test('approved desktop and mobile banner reserves geometry before its markup', () => {
  assert.doesNotThrow(() => assertYehwaFirstPaint(html, css));
});

const htmlMutations = [
  ['missing stylesheet', html.replace(link, '')],
  ['data attribute instead of stylesheet rel', html.replace(link, link.replace('rel=', 'data-rel='))],
  ['duplicate stylesheet', html.replace(link, link + link)],
  ['commented stylesheet', html.replace(link, `<!--${link}-->`)],
  ['late stylesheet', html.replace(link, '') + link],
  ['nonblocking preload', html.replace(link, link.replace('rel="stylesheet"', 'rel="preload"'))],
  ['conditional stylesheet', html.replace(link, link.replace('<link ', '<link media="print" '))],
  ['disabled stylesheet', html.replace(link, link.replace('<link ', '<link disabled '))],
  ['async stylesheet', html.replace(link, link.replace('<link ', '<link onload="this.media=\'all\'" '))],
  ['missing banner hook', html.replace('class="yh-hero yh-entry-scene"', 'class="yh-hero"')],
];
for (const [name, mutated] of htmlMutations) test(`first-paint guard rejects ${name}`, () => {
  assert.notEqual(mutated, html);
  assert.throws(() => assertYehwaFirstPaint(mutated, css), { name: 'AssertionError' });
});

const cssMutations = [
  ['legacy desktop columns', 'minmax(0,1.2fr) minmax(0,1fr)', '1.2fr 1fr'],
  ['missing desktop reservation', 'min-height:280px', 'min-height:0'],
  ['legacy mobile columns', '.yh-entry-scene{grid-template-columns:minmax(0,1fr)', '.yh-entry-scene{grid-template-columns:minmax(0,1.45fr) minmax(0,1fr)'],
  ['wrong mobile breakpoint', '@media(max-width:699px)', '@media(max-width:600px)'],
  ['fixed mobile height', 'gap:8px;min-height:0;padding:26px', 'gap:8px;height:280px;min-height:0;padding:26px'],
  ['clipped mobile copy', 'gap:8px;min-height:0;padding:26px', 'gap:8px;overflow:hidden;min-height:0;padding:26px'],
  ['unreserved mobile art', 'width:144px;max-width:100%', 'width:auto;max-width:100%'],
  ['distorted image ratio', 'height:auto;aspect-ratio:1;object-fit:contain', 'height:auto;aspect-ratio:2;object-fit:contain'],
];
for (const [name, before, after] of cssMutations) test(`first-paint guard rejects ${name}`, () => {
  const mutated = css.replace(before, after);
  assert.notEqual(mutated, css);
  assert.throws(() => assertYehwaFirstPaint(html, mutated), { name: 'AssertionError' });
});

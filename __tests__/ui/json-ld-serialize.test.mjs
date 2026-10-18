import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { serializeJsonLd } from '../../lib/seo/json-ld.mjs';

const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const LINE_SEPARATORS = String.fromCharCode(0x2028, 0x2029);

test('serializeJsonLd keeps the value but never closes the script element', () => {
  const data = { name: '</script><script>alert(1)</script>', note: 'a & b > c', lines: `x${LINE_SEPARATORS}y` };
  const html = serializeJsonLd(data);
  assert.doesNotMatch(html, new RegExp(`[<>&${LINE_SEPARATORS}]`));
  assert.deepEqual(JSON.parse(html), data);
  assert.throws(() => serializeJsonLd(undefined), TypeError);
});

test('brand pages serialize JSON-LD through the shared helper', () => {
  // yeongnyangi 는 '<' 를 '<' 로 바꾸는 무효 escape 였다.
  for (const file of ['app/layout.js', 'app/page.js', 'app/about/page.js', 'app/faq/page.js', 'app/yeongnyangi/page.tsx']) {
    const source = read(file);
    assert.match(source, /serializeJsonLd\(/, file);
    assert.doesNotMatch(source, /__html:\s*JSON\.stringify\(/, file);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { serializeJsonLd, toJsonLdDate } from '../../lib/seo/json-ld.mjs';

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
  for (const file of ['app/layout.js', 'app/page.js', 'app/about/page.js', 'app/faq/page.js', 'app/yeongnyangi/page.tsx', 'app/saju/monthly/[month]/page.tsx']) {
    const source = read(file);
    assert.match(source, /serializeJsonLd\(/, file);
    assert.doesNotMatch(source, /__html:\s*JSON\.stringify\(/, file);
  }
});

test('toJsonLdDate keeps a date-only source as a date and normalizes timestamps', () => {
  // 날짜만 있는 원본에 toISOString() 을 쓰면 "…T00:00:00.000Z"(09:00 KST)라는 없는 시각이 붙었다.
  assert.equal(toJsonLdDate('2026-08-30'), '2026-08-30');
  assert.equal(toJsonLdDate('2026-08-30T10:15:00+09:00'), '2026-08-30T01:15:00.000Z');
  assert.equal(toJsonLdDate(new Date(Date.UTC(2026, 7, 30, 1, 15))), '2026-08-30T01:15:00.000Z');
  for (const missing of [undefined, null, '', 'not a date', '2026-02-30']) assert.equal(toJsonLdDate(missing), undefined, String(missing));
});

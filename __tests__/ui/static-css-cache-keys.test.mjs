import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const UNVERSIONED_STYLE = /href="(\/styles\/[^"?]+\.css)"/g;
const unversionedStyles = (file) => [...readFileSync(file, 'utf8').matchAll(UNVERSIONED_STYLE)].map((match) => match[1]);

// public/_headers serves /styles/*.css as immutable for a year, so a ref without ?v= keeps old CSS at the edge.
test('deployed static HTML never references /styles/*.css without a cache key', () => {
  const offenders = readdirSync('public', { recursive: true })
    .filter((file) => String(file).endsWith('.html'))
    .flatMap((file) => unversionedStyles(join('public', String(file))).map((ref) => `${file}: ${ref}`));
  assert.deepEqual(offenders, []);
});

// sync:public matches the plain home-funnel link to inline it; every other root ref needs ?v= so sync can stamp it.
test('root shell keeps ?v= on every stylesheet except the inlined home-funnel link', () => {
  assert.deepEqual(unversionedStyles('index.html'), ['/styles/home-funnel.css']);
});

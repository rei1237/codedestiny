import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function verify(anchor) {
  const directory = mkdtempSync(join(tmpdir(), 'seo-content-links-'));
  try {
    mkdirSync(join(directory, 'insights'));
    writeFileSync(join(directory, 'sitemap.xml'), '<urlset><url><loc>https://code-destiny.com/</loc></url><url><loc>https://code-destiny.com/insights/</loc></url></urlset>');
    writeFileSync(join(directory, 'index.html'), `<h1>Home</h1>${anchor}`);
    writeFileSync(join(directory, 'insights', 'index.html'), '<h1>Insights</h1>');
    return spawnSync(process.execPath, ['scripts/verify-seo-heading-integrity.mjs'], {
      cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, SEO_HEADING_OUT_DIR: directory },
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('built HTML gate rejects versioned public links, including encoded query keys', () => {
  for (const href of ['/insights/?v=old', 'https://code-destiny.com/insights/?topic=tarot&amp;v=old', '/?%76=old']) {
    const result = verify(`<a href="${href}">Read</a>`);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /버전 쿼리/);
  }
});

test('built HTML gate allows content queries, external URLs and asset cache-busters', () => {
  const result = verify('<a href="/insights/?topic=tarot">Read</a><a href="/images/card.webp?v=hash">Image</a><a href="https://example.com/insights/?v=old">External</a><script>const old = \'<a href="/insights/?v=old">old</a>\';</script>');
  assert.equal(result.status, 0, result.stderr);
});

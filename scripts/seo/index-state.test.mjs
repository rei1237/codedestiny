import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { collectIndexState, diffIndexState } from './index-state.mjs';

const ORIGIN = 'https://code-destiny.com';

function page(path, metas) {
  const canonical = `<link rel="canonical" href="${ORIGIN}${path}">`;
  return `<!doctype html><html><head>${metas.map(([name, content]) => `<meta name="${name}" content="${content}">`).join('')}${canonical}</head><body>x</body></html>`;
}

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'index-state-'));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  return dir;
}

const BASE_FILES = {
  'index.html': page('/', [['robots', 'index, follow']]),
  'quiet/index.html': page('/quiet/', [['robots', 'noindex, follow']]),
  'bot/index.html': page('/bot/', [['robots', 'index, follow'], ['googlebot', 'noindex, follow, max-image-preview:large']]),
  'private/index.html': page('/private/', []),
  '_next/skip.html': page('/_next/skip.html', []),
  _headers: '/private*\n  X-Robots-Tag: Noindex, Nofollow\n/other\n  Cache-Control: no-store\n',
  'sitemap.xml': `<urlset><url><loc>${ORIGIN}/</loc></url><url><loc>${ORIGIN}/bot/</loc></url></urlset>`,
};

test('collectIndexState reads meta robots, googlebot, _headers and sitemap per dist page', () => {
  const dir = fixture(BASE_FILES);
  try {
    assert.deepEqual(collectIndexState(dir), [
      { path: '/', robots: ['index, follow'], indexable: true, follow: true, headerRobots: null, canonical: `${ORIGIN}/`, inSitemap: true },
      { path: '/bot/', robots: ['index, follow', 'noindex, follow, max-image-preview:large'], indexable: false, follow: true, headerRobots: null, canonical: `${ORIGIN}/bot/`, inSitemap: true },
      { path: '/private/', robots: [], indexable: false, follow: false, headerRobots: 'nofollow, noindex', canonical: `${ORIGIN}/private/`, inSitemap: false },
      { path: '/quiet/', robots: ['noindex, follow'], indexable: false, follow: true, headerRobots: null, canonical: `${ORIGIN}/quiet/`, inSitemap: false },
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('diffIndexState ignores robots order and case, and reports only decision changes', () => {
  const before = fixture(BASE_FILES);
  const reordered = fixture({
    ...BASE_FILES,
    'bot/index.html': page('/bot/', [['robots', 'FOLLOW, INDEX'], ['googlebot', 'max-image-preview:large, Follow, NoIndex']]),
    _headers: '/private*\n  X-Robots-Tag: nofollow, noindex\n',
  });
  const changed = fixture({
    ...BASE_FILES,
    'quiet/index.html': page('/quiet/', [['robots', 'index, follow']]),
    'bot/index.html': page('/bot/', [['robots', 'index, follow, max-image-preview:large']]),
  });
  try {
    const a = collectIndexState(before);
    assert.deepEqual(diffIndexState(a, collectIndexState(reordered)), []);
    assert.deepEqual(diffIndexState(a, collectIndexState(changed)), [
      '/bot/ indexable false→true',
      '/quiet/ indexable false→true',
    ]);
    assert.deepEqual(diffIndexState(a, a.filter((entry) => entry.path !== '/quiet/')), ['/quiet/ page present→missing']);
  } finally {
    for (const dir of [before, reordered, changed]) rmSync(dir, { recursive: true, force: true });
  }
});

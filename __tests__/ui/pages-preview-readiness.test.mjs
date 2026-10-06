import test from 'node:test';
import assert from 'node:assert/strict';
import { awaitPagesPreviewReady } from '../../scripts/lib/pages-preview-readiness.mjs';

const sha = 'a'.repeat(40);
function fixture({ transientPath, permanentPath, versionSha = sha } = {}) {
  let round = 0;
  const calls = [];
  return {
    calls,
    fetchImpl: async url => {
      const pathname = url.pathname;
      calls.push(pathname);
      if (pathname === '/version.json') round++;
      if (pathname === permanentPath || (round === 1 && pathname === transientPath)) return new Response('', { status: 404 });
      if (pathname === '/version.json') return Response.json({ gitSha: versionSha });
      return new Response(pathname === '/' ? '<script src="/_next/static/home.js"></script><link href="/_next/static/home.css" rel="stylesheet">' : 'ok');
    },
    sleep: async () => {},
    attempts: 2,
    log: () => {},
  };
}
for (const transientPath of ['/', '/app/store/', '/_next/static/home.css']) {
  test(`waits for transient ${transientPath} 404 before returning ready`, async () => {
    const mock = fixture({ transientPath });
    await awaitPagesPreviewReady('https://preview.pages.dev', sha, mock);
    assert.equal(mock.calls.filter(path => path === '/version.json').length, 2);
    assert(mock.calls.includes('/_next/static/home.js'));
    assert(mock.calls.includes('/lock-screen-fortune/'));
  });
}
test('permanent missing asset exhausts its budget and blocks', async () => {
  const mock = fixture({ permanentPath: '/_next/static/home.js' });
  await assert.rejects(awaitPagesPreviewReady('https://preview.pages.dev', sha, mock), /did not become ready.*HTTP 404/);
  assert.equal(mock.calls.filter(path => path === '/version.json').length, 2);
});
test('a different release SHA never becomes ready', async () => {
  const mock = fixture({ versionSha: 'b'.repeat(40) });
  await assert.rejects(awaitPagesPreviewReady('https://preview.pages.dev', sha, mock), /SHA does not match/);
  assert.equal(mock.calls.filter(path => path === '/').length, 0);
});

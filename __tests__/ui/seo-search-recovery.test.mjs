import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const root = process.cwd();
const read = p => readFileSync(resolve(root, p), 'utf8');
const legacy = read('js/share.js').match(/\(function removeCompletedVersionQuery\(\) \{[\s\S]*?\}\)\(\);/)[0];
const react = read('app/components/AppVersionGuard.tsx').split('// Keep the cache-busting request, but do not leave build URLs to be shared.')[1].split('    void retireLegacyServiceWorkersOnce();')[0];
for (const [name, source] of [['shell', legacy], ['React', react]]) {
  test(`${name}: completed refresh keeps action, payment resume, hash and history state`, () => {
    const state = { __NA: true, tree: ['existing router state'] };
    let replaced;
    const window = {
      location: { href: 'https://code-destiny.com/?v=abc123&action=openSukuyoModal&merchantUid=mock-order&lang=ja#result' },
      sessionStorage: { getItem: () => 'abc123' },
      history: { state, replaceState: (...args) => { replaced = args; } },
    };
    vm.runInNewContext(source, { window, URL, APP_VERSION_RELOAD_GUARD: 'guard', RELOAD_GUARD_KEY: 'guard' });
    assert.equal(replaced[0], state);
    assert.equal(replaced[2], 'https://code-destiny.com/?action=openSukuyoModal&merchantUid=mock-order&lang=ja#result');
  });
  test(`${name}: unknown v and inaccessible storage leave URL untouched`, () => {
    for (const getItem of [() => null, () => 'another-build', () => { throw Error('denied'); }]) {
      const window = { location: { href: 'https://code-destiny.com/?v=unrelated' }, sessionStorage: { getItem }, history: { replaceState: () => assert.fail('must preserve URL') } };
      vm.runInNewContext(source, { window, URL, APP_VERSION_RELOAD_GUARD: 'guard', RELOAD_GUARD_KEY: 'guard' });
    }
  });
}

test('first-screen translations render before JS; missing translations fail the build', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'cd-seo-locale-'));
  try {
    const html = read('templates/home-funnel.html');
    const hero = html.match(/<h1 id="cdhTitle">[\s\S]*?<\/h1>/)[0];
    for (const [locale, dictionary] of [['en','en'],['ja','ja'],['zh','zh-cn'],['zh-tw','zh-tw']]) {
      mkdirSync(join(fixture, 'dist', locale), { recursive: true });
      mkdirSync(join(fixture, 'public', 'i18n'), { recursive: true });
      writeFileSync(join(fixture, 'dist', locale, 'index.html'), hero);
      writeFileSync(join(fixture, 'public', 'i18n', `${dictionary}.json`), read(`public/i18n/${dictionary}.json`));
    }
    const run = () => spawnSync(process.execPath, [resolve(root, 'scripts/prerender-locale-shell-translations.mjs')], { cwd: fixture, encoding: 'utf8', windowsHide: true });
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    for (const locale of ['en','ja','zh','zh-tw']) {
      const output = readFileSync(join(fixture, 'dist', locale, 'index.html'), 'utf8');
      assert.doesNotMatch(output.replace(/<[^>]*>/g, ''), /[가-힣]/);
      assert.match(output, /data-cd-origin-text=/, 'runtime Korean restoration is preserved');
    }
    const bad = JSON.parse(read('public/i18n/ja.json'));
    delete bad.home.searchEntry.title;
    writeFileSync(join(fixture, 'public/i18n/ja.json'), JSON.stringify(bad));
    assert.notEqual(run().status, 0);
  } finally {
    assert.ok(resolve(fixture).startsWith(resolve(tmpdir(), 'cd-seo-locale-')));
    rmSync(fixture, { recursive: true, force: true });
  }
});

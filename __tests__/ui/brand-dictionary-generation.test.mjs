import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

test('brand refresh preserves core keys and still rejects untranslated Korean', () => {
  const root = mkdtempSync(join(tmpdir(), 'brand-dictionary-'));
  const locales = { ko: 'ko', en: 'en', ja: 'ja', 'zh-CN': 'zh-cn', 'zh-TW': 'zh-tw', vi: 'vi', hi: 'hi', es: 'es', fr: 'fr', de: 'de', nl: 'nl', ms: 'ms' };
  try {
    mkdirSync(join(root, 'i18n/authored'), { recursive: true });
    mkdirSync(join(root, 'public/i18n'), { recursive: true });
    for (const file of Object.values(locales)) writeFileSync(join(root, `public/i18n/${file}.json`), JSON.stringify({ brand: 'Old', kept: 'untouched' }));
    const translations = Object.fromEntries(Object.keys(locales).map(locale => [locale, '꿀꿀운세']));
    const authored = join(root, 'i18n/authored/brandSignals-01.json');
    const write = () => writeFileSync(authored, JSON.stringify({ brand: translations, unrelated: translations }));
    const run = () => spawnSync(process.execPath, [fileURLToPath(new URL('../../scripts/i18n-merge-authored.mjs', import.meta.url)), '--namespace', 'brandSignals', '--core', '--existing-only'], { cwd: root, encoding: 'utf8' });
    write();
    const valid = run();
    assert.equal(valid.status, 0, valid.stderr);
    for (const file of Object.values(locales)) assert.deepEqual(JSON.parse(readFileSync(join(root, `public/i18n/${file}.json`), 'utf8')), { brand: '꿀꿀운세', kept: 'untouched' });
    translations.en = '꿀꿀운세 번역 누락';
    write();
    const invalid = run();
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /한글 잔존 en/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

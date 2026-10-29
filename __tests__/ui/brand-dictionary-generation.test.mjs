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
  const featureMarketing = { reading: { title: 'Detailed reading' } };
  try {
    mkdirSync(join(root, 'i18n/authored'), { recursive: true });
    mkdirSync(join(root, 'public/i18n'), { recursive: true });
    for (const file of Object.values(locales)) writeFileSync(join(root, `public/i18n/${file}.json`), JSON.stringify({ brand: 'Old', kept: 'untouched', featureMarketing }));
    const translations = Object.fromEntries(Object.keys(locales).map(locale => [locale, '꿀꿀운세']));
    const authored = join(root, 'i18n/authored/brandSignals-01.json');
    const write = () => writeFileSync(authored, JSON.stringify({ brand: translations, unrelated: translations }));
    const run = () => spawnSync(process.execPath, [fileURLToPath(new URL('../../scripts/i18n-merge-authored.mjs', import.meta.url)), '--namespace', 'brandSignals', '--core', '--existing-only'], { cwd: root, encoding: 'utf8' });
    write();
    const valid = run();
    assert.equal(valid.status, 0, valid.stderr);
    for (const file of Object.values(locales)) assert.deepEqual(JSON.parse(readFileSync(join(root, `public/i18n/${file}.json`), 'utf8')), { brand: '꿀꿀운세', kept: 'untouched', featureMarketing });
    translations.en = '꿀꿀운세 번역 누락';
    write();
    const invalid = run();
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /한글 잔존 en/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('authoring creates arrays and repairs numeric maps without losing sibling copy', () => {
  const root = mkdtempSync(join(tmpdir(), 'authored-lists-'));
  const locales = { ko: 'ko', en: 'en', ja: 'ja', 'zh-CN': 'zh-cn', 'zh-TW': 'zh-tw', vi: 'vi', hi: 'hi', es: 'es', fr: 'fr', de: 'de', nl: 'nl', ms: 'ms' };
  try {
    mkdirSync(join(root, 'i18n/authored'), { recursive: true });
    mkdirSync(join(root, 'public/i18n'), { recursive: true });
    for (const file of Object.values(locales)) {
      const feats = file === 'ko' ? { 0: 'Old', 1: 'Keep sibling' } : ['Old', 'Keep sibling'];
      writeFileSync(join(root, `public/i18n/${file}.json`), JSON.stringify({ featureMarketing: { reading: { feats } } }));
    }
    const translations = Object.fromEntries(Object.keys(locales).map(locale => [locale, 'Reviewed copy']));
    writeFileSync(join(root, 'i18n/authored/lists-01.json'), JSON.stringify({
      'featureMarketing.reading.feats.0': translations,
      'featureMarketing.reading.answers.0': translations,
    }));
    const run = () => spawnSync(process.execPath, [fileURLToPath(new URL('../../scripts/i18n-merge-authored.mjs', import.meta.url)), '--namespace', 'lists', '--core'], { cwd: root, encoding: 'utf8' });
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    for (const file of Object.values(locales)) {
      const reading = JSON.parse(readFileSync(join(root, `public/i18n/${file}.json`), 'utf8')).featureMarketing.reading;
      assert.deepEqual(reading.feats, ['Reviewed copy', 'Keep sibling']);
      assert.deepEqual(reading.answers, ['Reviewed copy']);
    }
    const target = join(root, 'public/i18n/ko.json');
    const invalid = { featureMarketing: { reading: { feats: { 0: 'Keep', unexpected: 'Do not discard' } } } };
    writeFileSync(target, JSON.stringify(invalid));
    const rejected = run();
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /Invalid authored list/);
    assert.deepEqual(JSON.parse(readFileSync(target, 'utf8')), invalid);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

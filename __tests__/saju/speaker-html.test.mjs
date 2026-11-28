// 화자 말풍선(lib/saju/speaker) 계약 테스트: 그림 경로는 완전한 리터럴, 그림은 즉시 로딩·크기 고정, 이름표는 이스케이프.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { SPEAKER_ART, speakerHtml, faceHtml, speakerFor } from '../../lib/saju/speaker/index.mjs';

const SOURCE = readFileSync(new URL('../../lib/saju/speaker/index.mjs', import.meta.url), 'utf8');

test('every speaker image is a full string literal that exists under public/', () => {
  const literals = [...SOURCE.matchAll(/src:\s*(['"`])([^'"`]*)\1/g)];
  const moods = Object.values(SPEAKER_ART).flatMap((art) => Object.values(art.moods));
  assert.equal(literals.length, moods.length);
  for (const [, quote, path] of literals) {
    assert.equal(quote, "'", path);
    assert.match(path, /^\/images\/[\w/-]+\.webp$/);
  }
  for (const mood of moods) assert.ok(existsSync(new URL(`../../public${mood.src}`, import.meta.url)), mood.src);
});

test('a labelled bubble keeps the picture decorative, eager and fixed in size', () => {
  const html = speakerHtml({ who: 'nyang', label: '영냥이의 정리', html: '<p>본문</p>' });
  assert.match(html, /alt=""/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /loading="eager" decoding="async"/);
  assert.match(html, /width="270" height="360"/);
  assert.match(html, /width:56px;height:56px/);
  assert.match(html, /border-radius:20px 20px 20px 8px/);
  assert.ok(html.includes('/images/saju/yeongnyangi-read.webp'));
  assert.doesNotMatch(html, /color-mix|oklch|color\(/);
  assert.match(speakerHtml({ who: 'yeoni', html: '', size: 20 }), /width:44px;height:44px/);
  assert.match(speakerHtml({ who: 'yeoni', html: '', size: 200 }), /width:72px;height:72px/);
});

test('label is escaped, body html is trusted, and an unlabelled picture names the speaker', () => {
  const html = speakerHtml({ who: 'yeoni', mood: 'greet', label: '<b>"연이"</b>', html: '<p><em>그대로</em></p>' });
  assert.ok(html.includes('&lt;b&gt;&quot;연이&quot;&lt;/b&gt;'));
  assert.ok(html.includes('<p><em>그대로</em></p>'));
  assert.ok(html.includes('yeoni-greet.webp'));
  const bare = speakerHtml({ who: 'nyang', html: '<p>x</p>' });
  assert.match(bare, /alt="영냥이"/);
  assert.doesNotMatch(bare, /aria-hidden/);
  assert.ok(speakerHtml({ who: 'nobody', mood: 'nope', html: '' }).includes('yeoni-listen.webp'));
  assert.equal(speakerFor('neo'), 'nyang');
  assert.equal(speakerFor('pig'), 'yeoni');
  assert.match(faceHtml({ who: 'nyang', size: 48 }), /width:48px/);
});

test('the browser bundle exposes the same API as the global CdSajuSpeaker', () => {
  const bundle = readFileSync(new URL('../../js/core/saju/speaker.generated.js', import.meta.url), 'utf8');
  const sandbox = {};
  vm.runInNewContext(`${bundle};this.out=CdSajuSpeaker;`, sandbox);
  const html = { who: 'yeoni', label: '연이', html: '<p>안녕</p>' };
  assert.equal(sandbox.out.speakerHtml(html), speakerHtml(html));
});

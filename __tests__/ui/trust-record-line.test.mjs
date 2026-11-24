import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { TRUST_RECORD_SOURCES, trustRecordCopy } from '../../lib/marketing/trust-record.mjs';
import { PUBLIC_RECORD_PATH } from '../../lib/seo/public-record-copy.mjs';
import { renderYehwaHome } from '../../lib/marketing/yehwa-home.mjs';

// 2026-11-15 사용자 결정: 첫 화면 신뢰 띠는 원문 공개일로 증명되는 시점만 말한다.
test('trust line claims only what the dated 2024 originals support', () => {
  assert.equal(TRUST_RECORD_SOURCES.length, 2, '"두 대통령" needs exactly two 2024 originals');
  for (const record of TRUST_RECORD_SOURCES) {
    assert.match(record.url, /^https:\/\/blog\.naver\.com\/neosaju\/\d+$/);
    assert.match(record.quote + record.after, /2025년/);
  }
  for (const text of [trustRecordCopy.full, trustRecordCopy.short]) {
    assert.match(text, /^2024년 공개 글.*두 대통령의 2025년을 미리 짚은 명리학자/);
    assert.doesNotMatch(text, /적중|유일|방식까지|보장|정확도|맞힌|맞춘/);
  }
  assert.equal(trustRecordCopy.href, PUBLIC_RECORD_PATH);
  assert.equal(trustRecordCopy.link, '원문 날짜 확인하기', 'payment label is stable');
  assert.notEqual(trustRecordCopy.link, trustRecordCopy.publicLink, 'public and payment labels have separate consumers');
  assert.ok(existsSync('app/insights/public-record-article.js'), 'public record article must exist');
});

test('the public record is reachable in context and service selection stays uncluttered', () => {
  const root = readFileSync('app/page.js', 'utf8');
  assert.doesNotMatch(root, /<TrustRecordLine/);
  assert.match(readFileSync('app/yeongnyangi/_components/NightHero.tsx', 'utf8'), /<TrustRecordLine variant="short"/);
  const shell = renderYehwaHome([]);
  assert.ok(shell.includes('href="#homeFinder"'));
  assert.ok(!shell.includes(trustRecordCopy.full));
  assert.ok(readFileSync('app/components/conversion/TrustRecordLine.tsx', 'utf8').includes('trustRecordCopy.publicLink'));
});

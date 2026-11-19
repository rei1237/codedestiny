import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { publicRecordCopy, PUBLIC_RECORD_PATH } from '../../lib/seo/public-record-copy.mjs';
const c = publicRecordCopy.ko;
const article = readFileSync(new URL('../../app/insights/public-record-article.js', import.meta.url), 'utf8');
test('canonical evidence identifies the author without creating a second identity', () => {
  assert.equal(PUBLIC_RECORD_PATH, '/insights/presidential-saju-public-records/');
  for (const value of [c.title, c.heading, c.description, c.lead]) assert.match(value, /박병하/);
  assert.match(c.title, /네오 사주/);
  assert.match(c.lead, /꿀꿀운세.*영냥이/);
  assert.match(c.lead, /필명 네오/);
});
test('original links stay stable and official evidence directly supports the winner', () => {
  assert.deepEqual(c.rows.map(r => r.url), ['https://blog.naver.com/neosaju/222876455500','https://blog.naver.com/neosaju/223444062729','https://blog.naver.com/neosaju/223459696339']);
  assert.equal(new URL(c.rows[2].source).hostname, 'museum.nec.go.kr');
  assert.match(c.rows[2].event, /이재명 당선/);
  assert.match(c.rows[2].method, /불일치/);
  assert.match(article, /네이버 원문/);
  assert.match(article, /공식 기록/);
});
test('answer preserves limitations and publication history', () => {
  assert.match(c.provenance, /독립 웹 아카이브나 수정 이력은 확보하지 못/);
  assert.match(c.scope, /적중률이나 미래 예측 능력을 계산하지/);
  const answer = c.faqs.find(f => f.question.includes('어디까지 적중')).answer;
  for (const re of [/2025년 탄핵 가능성/, /당선 연도가 겹칩니다/, /정확한 날짜나 절차/, /조기 선거와 다릅니다/, /전체 적중률을 계산할 수 없습니다/]) assert.match(answer, re);
  assert.match(article, /publishedAt: '2026-10-05'/);
  assert.match(article, /updatedAt: '2026-11-19'/);
});

test('visible official source labels and Article citations use the same row data', () => {
  assert.deepEqual(c.rows.map(r => r.sourceLabel), ['헌법재판소', '헌법재판소', '중앙선거관리위원회']);
  assert.ok(article.includes('esc(r.sourceLabel)'));
  const route = readFileSync(new URL('../../app/insights/[slug]/page.js', import.meta.url), 'utf8');
  assert.match(route, /citation = publicRecordCopy.ko.rows.flatMap/);
  assert.match(route, /url: row.source/);
  assert.match(route, /url: row.url/);
  assert.match(c.description, /2025년 윤석열 탄핵 가능성/);
  assert.match(c.answer, /정확한 날짜를 예고한 기록은 아닙니다/);
});

test('webtoon links the two illustrated records to the canonical comparison once in server markup', async () => {
  const { entryCuts } = await import('../../lib/brand/entry-webtoon.mjs');
  assert.deepEqual(entryCuts().filter(cut => cut.kind === 'record').map(cut => cut.id), ['record-first', 'record-second']);
  const webtoon = readFileSync(new URL('../../app/_entry/EntryWebtoon.tsx', import.meta.url), 'utf8');
  assert.match(webtoon, /import \{ PUBLIC_RECORD_PATH \} from '@\/lib\/seo\/public-record-copy\.mjs'/);
  assert.equal(webtoon.split('href={PUBLIC_RECORD_PATH}').length - 1, 1);
  assert.match(webtoon, /case 'record':[\s\S]*?<RecordCard[\s\S]*?cut\.id === 'record-second' && <a [^>]*href=\{PUBLIC_RECORD_PATH\}>공개 원문과 실제 사건 비교 보기<\/a>/);
});

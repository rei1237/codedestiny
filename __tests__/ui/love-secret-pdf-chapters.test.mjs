import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const load = async (entry) => {
  const bundle = await build({entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', write: false, packages: 'external'});
  return import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
};
const {buildLoveSecretPdfChapters} = await load('app/love-secret-ai/result/love-secret-pdf-chapters.ts');
const {LOVE_SECRET_SECTION_TITLES} = await load('app/love-secret-ai/result/love-secret-sections.ts');
const {typesetConsultationBook} = await load('lib/pdf/export-consultation-book-pdf.ts');

const sections = LOVE_SECRET_SECTION_TITLES.map((title, index) => ({title, body: `${index + 1}번째 장의 본문입니다.\n둘째 줄도 그대로 남아요.`}));

test('PDF 장은 받은 30장을 순서·글자 그대로 담고, 부 이름과 화자를 붙인다', () => {
  const chapters = buildLoveSecretPdfChapters({sections});
  assert.deepEqual(chapters.map((chapter) => chapter.title), [...LOVE_SECRET_SECTION_TITLES]);
  assert.deepEqual(chapters.map((chapter) => chapter.body), sections.map((section) => section.body));
  assert.equal(chapters[0].kicker, '타고난 연애 기질');
  assert.equal(chapters[0].speaker, '연이');
  assert.equal(chapters.find((chapter) => chapter.title.startsWith('속궁합')).speaker, '서한비');
});

test('보관함처럼 messages 만 있으면 답변을 장 제목으로 되살리고, 제목이 없으면 통째로 한 장이 된다', () => {
  const answer = sections.map((section) => `${section.title}\n${section.body}`).join('\n\n');
  const fromMessages = buildLoveSecretPdfChapters({messages: [{role: 'user', content: '질문'}, {role: 'assistant', content: answer}]});
  assert.deepEqual(fromMessages.map((chapter) => [chapter.title, chapter.body]), sections.map((section) => [section.title, section.body]));
  const legacy = buildLoveSecretPdfChapters({messages: [{role: 'assistant', content: '제목 없는 예전 답변\n\n두 번째 문단'}]});
  assert.equal(legacy.length, 1);
  assert.equal(legacy[0].body, '제목 없는 예전 답변\n\n두 번째 문단');
});

test('조판은 30장 차례를 여러 쪽으로 잇고 장마다 차례 링크 쪽을 정한다', async () => {
  const {jsPDF} = await import('jspdf');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const chapters = buildLoveSecretPdfChapters({sections});
  const result = typesetConsultationBook(pdf, {title: 'helvetica', body: 'helvetica'}, {title: 'Love', productLabel: 'Love Secret', byline: 'Yeoni', fileName: 'x.pdf', chapters});
  assert.equal(result.chapters, 30);
  assert.ok(result.contentsPages >= 1);
  assert.equal(result.destinations[0], result.contentsPages + 2);
  for (let index = 1; index < result.destinations.length; index += 1) assert.ok(result.destinations[index] > result.destinations[index - 1]);
  assert.equal(pdf.getNumberOfPages(), result.destinations.at(-1));
});

import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';

const load = async (entry) => {
  const bundle = await build({entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', write: false, packages: 'external'});
  return import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
};
const {buildLifeBookPdfChapters, lifeBookChapterKicker} = await load('app/life-book-ai/result/life-book-pdf-chapters.ts');

const report = {
  title: '인생의 책',
  chapters: [
    {chapterNumber: 1, title: '타고난 사주의 원형', summary: '단단한 뿌리의 사람이에요.', content: '**뿌리의 뜻**\n일간이 **단단**하다는 건 버티는 힘이 크다는 뜻이에요.', advice: ['아침을 먼저 지켜요.']},
    {chapterNumber: 2, title: '성격과 내면의 작동 방식', summary: '', content: '마음은 천천히 데워져요.', advice: []},
  ],
  expertReadings: [{title: '일간과 월지가 여는 중심 기질', content: '일간과 월지가 만나는 자리예요.', guidance: ['쉬는 날을 정해요.']}],
  finalMessage: '다음 장은 같이 써 봐요.',
};

test('보관함(assistant JSON)과 결과 API(reportJson)는 같은 윤달 장 목록을 만든다: 장 → 깊은 판독 → 맺는 말', () => {
  const fromRecord = buildLifeBookPdfChapters({messages: [{role: 'user', content: '상담 주제'}, {role: 'assistant', content: JSON.stringify(report)}]});
  const fromApi = buildLifeBookPdfChapters({reportJson: report, messages: []});
  assert.deepEqual(fromRecord, fromApi);
  assert.deepEqual(fromRecord.map((chapter) => [chapter.kicker, chapter.title, chapter.speaker]), [
    ['타고난 결', '타고난 사주의 원형', '윤달'],
    ['마음의 결', '성격과 내면의 작동 방식', '윤달'],
    ['깊은 판독', '일간과 월지가 여는 중심 기질', '윤달'],
    ['맺는 말', '맺는 말', '윤달'],
  ]);
  assert.equal(fromRecord[0].body, '단단한 뿌리의 사람이에요.\n\n● 뿌리의 뜻\n일간이 단단하다는 건 버티는 힘이 크다는 뜻이에요.\n\n● 윤달의 조언\n- 아침을 먼저 지켜요.');
});

test('인생 총운 장 제목도 부 이름을 받고, 모르는 제목은 빈 부 이름이다', () => {
  assert.equal(lifeBookChapterKicker('타고난 명식의 중심'), '타고난 결');
  assert.equal(lifeBookChapterKicker('가까운 세운의 흐름'), '가까운 때');
  assert.equal(lifeBookChapterKicker('앞으로 열릴 선택'), '다음 장');
  assert.equal(lifeBookChapterKicker('Your Original Nature'), '');
});

test('JSON이 아닌 예전 답변은 통째로 한 장이 된다', () => {
  const chapters = buildLifeBookPdfChapters({messages: [{role: 'assistant', content: '## 예전 장\n예전 본문이에요.'}]});
  assert.deepEqual(chapters.map((chapter) => chapter.title), ['인생의 책']);
});

test('결과 화면과 보관함 버튼이 같은 빌더로 조판하고, 화면은 글꼴 실패에만 캡처로 되돌아간다', () => {
  const client = fs.readFileSync('app/life-book-ai/result/LifeBookAiResultClient.tsx', 'utf8');
  const saved = fs.readFileSync('app/records/view/SavedLifeBookPdfButton.tsx', 'utf8');
  const reading = fs.readFileSync('app/records/view/SavedServiceReading.tsx', 'utf8');
  for (const source of [client, saved]) {
    assert.match(source, /buildLifeBookPdfChapters/);
    assert.match(source, /exportConsultationBookPdf/);
  }
  assert.match(client, /PdfFontError[\s\S]*exportResultPdf/);
  assert.match(reading, /family==='book'[\s\S]*SavedLifeBookPdfButton/);
});

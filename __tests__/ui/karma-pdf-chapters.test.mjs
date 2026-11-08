import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';

const load = async (entry) => {
  const bundle = await build({entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', write: false, packages: 'external'});
  return import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
};
const {buildKarmaPdfChapters, karmaChapterKicker, karmaChapterSpeaker, KARMA_PDF_BYLINE} = await load('app/karma-destiny-ai/result/karma-pdf-chapters.ts');

const chapters = [
  {id: 'chapter-01', order: 2, title: '운명의 핵심 주제', content: '**질문에 대한 답**\n지금은 **준비**의 때입니다.', keyTakeaways: ['서두르지 않습니다.']},
  {id: 'chapter-00', order: 1, title: '타고난 기질과 마음의 결', content: '당신은 천천히 데워지는 사람입니다.', keyTakeaways: []},
  {id: 'chapter-06', order: 7, title: '사랑의 업', content: '사랑은 거리를 재는 일에서 시작합니다.'},
];

test('장 배열은 순서대로 부 이름·화자를 받고, 본문 글자는 그대로 조판된다', () => {
  const out = buildKarmaPdfChapters({chapters, messages: []});
  assert.deepEqual(out.map((chapter) => [chapter.kicker, chapter.title, chapter.speaker]), [
    ['타고난 결', '타고난 기질과 마음의 결', '네오'],
    ['이번 삶의 질문', '운명의 핵심 주제', '네오 · 서한비'],
    ['인연의 업', '사랑의 업', '서한비'],
  ]);
  assert.equal(out[1].body, '● 질문에 대한 답\n지금은 준비의 때입니다.\n\n● 이번 장의 핵심\n- 서두르지 않습니다.');
  assert.equal(KARMA_PDF_BYLINE, '네오 · 서한비');
});

test('장 배열이 없는 보관함 기록은 "## N장." 마크다운을 나눠 같은 부 이름·화자를 붙인다', () => {
  const markdown = '## 1장. 타고난 기질과 마음의 결\n\n당신은 천천히 데워지는 사람입니다.\n\n이번 장의 핵심\n- 하나\n\n## 6장. 인간관계의 업\n\n관계는 거리입니다.';
  const out = buildKarmaPdfChapters({messages: [{role: 'user', content: '질문'}, {role: 'assistant', content: markdown}]});
  assert.deepEqual(out.map((chapter) => [chapter.kicker, chapter.title, chapter.speaker]), [
    ['타고난 결', '타고난 기질과 마음의 결', '네오'],
    ['인연의 업', '인간관계의 업', '서한비'],
  ]);
  assert.match(out[0].body, /● 이번 장의 핵심\n- 하나/);
});

test('모르는 장은 빈 부 이름·두 마스터 화자이고, 장 머리가 없는 본문은 통째로 한 장이 된다', () => {
  assert.equal(karmaChapterKicker({id: 'chapter-99', title: '예전 장'}), '');
  assert.equal(karmaChapterSpeaker({id: 'chapter-99'}), '네오 · 서한비');
  assert.deepEqual(buildKarmaPdfChapters({messages: [{role: 'assistant', content: '예전 본문입니다.'}]}).map((chapter) => chapter.title), ['운명의 업']);
});

test('결과 화면과 보관함 버튼이 같은 빌더로 조판하고, 화면은 글꼴 실패에만 캡처로 되돌아간다', () => {
  const client = fs.readFileSync('app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx', 'utf8');
  const saved = fs.readFileSync('app/records/view/SavedKarmaPdfButton.tsx', 'utf8');
  const reading = fs.readFileSync('app/records/view/SavedServiceReading.tsx', 'utf8');
  for (const source of [client, saved]) {
    assert.match(source, /buildKarmaPdfChapters/);
    assert.match(source, /exportConsultationBookPdf/);
    assert.match(source, /coverTheme: ["']karma["']/);
  }
  assert.match(client, /PdfFontError[\s\S]*exportResultPdf/);
  assert.match(reading, /family==='karma'[\s\S]*SavedKarmaPdfButton/);
});

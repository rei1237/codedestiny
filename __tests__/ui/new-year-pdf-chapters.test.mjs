import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';

const load = async (entry) => {
  const bundle = await build({entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', write: false, packages: 'external'});
  return import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
};
const {buildNewYearPdfChapters} = await load('app/new-year-ai-consultation/_lib/new-year-pdf-chapters.ts');

const QUESTION = '올해 이직해도 괜찮을까요?';
// V2 조립본(보관함은 messages만 남는다). 열두 달 편지는 건강 장 앞에 온다.
const V2_ANSWER = [
  '**타고난 성향과 올해 너의 자리**\n일간이 단단하다는 건 버티는 힘이 크다는 뜻이다.',
  '**질문에 대한 답변**\n지금은 옮기지 말고 준비해라.',
  '**올해의 총운**\n올해는 판을 넓히기보다 다지는 해다.',
  '**재물과 수입**\n들어오는 길은 고정 수입이다.\n\n**재물·수입**\n3월에는 큰 지출을 미뤄라.',
  '**직업과 커리어**\n자리를 지키며 실력을 드러내라.',
  '**애정과 대인관계**\n귀인은 오래된 동료 쪽에 있다.',
  '2월 · 무인 · 준비\n2월에는 판을 살펴라.\n\n1월 · 정축 · 정리\n1월에는 정리부터 해라.',
  '**건강과 개운법**\n**잠**을 먼저 지켜라.',
].join('\n\n');
const messages = [{role: 'user', content: QUESTION}, {role: 'assistant', content: V2_ANSWER}];

test('V2 신년운세 PDF는 질문 답변 → 성향 → 총운 → 재물 → 직업 → 애정 → 열두 달 → 건강 순으로 네오 장을 만든다', () => {
  const chapters = buildNewYearPdfChapters({messages});
  assert.deepEqual(chapters.map((chapter) => chapter.title), [
    '질문에 대한 답변', '타고난 성향과 올해 너의 자리', '올해의 총운', '재물과 수입', '직업과 커리어', '애정과 대인관계', '1월~12월 월별 흐름', '건강과 개운법',
  ]);
  assert.ok(chapters.every((chapter) => chapter.speaker === '네오' && chapter.kicker));
  assert.ok(chapters[0].body.startsWith(`“${QUESTION}”`));
  assert.ok(!chapters[2].body.includes('준비해라'), '질문 답변은 총운 장에 다시 들어가지 않는다');
  assert.ok(chapters[3].body.includes('● 재물·수입\n3월에는 큰 지출을 미뤄라.'));
  assert.ok(chapters[6].body.indexOf('● 1월') < chapters[6].body.indexOf('● 2월'));
  assert.equal(chapters[7].body, '잠을 먼저 지켜라.');
  assert.ok(chapters.every((chapter) => !chapter.body.includes('**')));
});

test('V1 저장본은 예전 분야 장으로, 분야 마커가 없는 답변은 통째로 한 장이 된다', () => {
  const v1 = buildNewYearPdfChapters({messages: [{role: 'assistant', content: '**타고난 성향과 지금의 마음**\n성향 본문\n\n**재물과 직업**\n재물 본문\n\n**재물·수입**\n수입 문단'}]});
  assert.deepEqual(v1.map((chapter) => chapter.title), ['타고난 성향과 지금의 마음', '재물과 직업']);
  assert.ok(v1[1].body.includes('수입 문단'));
  const legacy = buildNewYearPdfChapters({messages: [{role: 'assistant', content: '마커 없는 예전 답변입니다.'}]});
  assert.deepEqual(legacy.map((chapter) => [chapter.title, chapter.body]), [['타고난 성향과 지금의 마음', '마커 없는 예전 답변입니다.']]);
});

test('결과 화면과 보관함은 같은 장 빌더로 조판 PDF를 만들고, 화면은 글꼴 실패에만 캡처로 되돌아간다', () => {
  const client = fs.readFileSync('app/new-year-ai-consultation/NewYearAiClient.tsx', 'utf8');
  assert.match(client, /buildNewYearPdfChapters\(\{ sections: serverSections, messages \}\)/);
  assert.match(client, /if \(!\(error instanceof PdfFontError\)\) throw error;/);
  const records = fs.readFileSync('app/records/view/SavedServiceReading.tsx', 'utf8');
  assert.match(records, /family==='year'\) return <div className=\{styles\.timeline\}><SavedNewYearPdfButton row=\{row\}/);
  assert.match(fs.readFileSync('app/records/view/SavedNewYearPdfButton.tsx', 'utf8'), /buildNewYearPdfChapters\(row/);
});

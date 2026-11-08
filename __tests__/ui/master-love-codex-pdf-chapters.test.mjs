import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';

const load = async (entry) => {
  const bundle = await build({entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', write: false, packages: 'external',
    alias: {'@': process.cwd()}, loader: {'.ts': 'ts', '.tsx': 'tsx'}});
  return import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
};
const {buildMasterLoveCodexPdfChapters, buildMasterLoveCodexPdfSummary, codexChapterKicker, MASTER_LOVE_CODEX_PDF_BYLINE} = await load('src/features/master-love-codex/_lib/codex-pdf-chapters.ts');

const chapters = [
  {id: 'temperament', order: 2, title: '제2장 · 사랑을 시작하는 태도', body: '## 첫 태도\n당신은 **천천히** 다가갑니다.',
    content: {narration: '연애 고수가 말합니다.', keySentence: '천천히 데워지는 사람', actions: ['먼저 안부를 묻는다'], evidence: [{label: '일간 병화', explanation: '따뜻한 불'}]}},
  {id: 'gate', order: 1, title: '타고난 기질', body: '당신은 혼자 있는 시간에 힘을 얻는 사람입니다.'},
  {id: 'empty', order: 3, title: '빈 장', body: ''},
  {id: 'letter', order: 20, title: '편지', body: '고마웠습니다.'},
];

test('장 순서대로 막 이름·화자를 붙이고, 빈 장은 넣지 않으며 문장은 고치지 않는다', () => {
  const out = buildMasterLoveCodexPdfChapters({chapters, mode: 'solo'});
  assert.deepEqual(out.map((chapter) => [chapter.kicker, chapter.title, chapter.speaker]), [
    ['타고난 결', '타고난 기질', '연애 고수'],
    ['타고난 결', '사랑을 시작하는 태도', '연애 고수'],
    [codexChapterKicker(20, 'solo'), '편지', '연애 고수'],
  ]);
  assert.equal(out[0].body, '당신은 혼자 있는 시간에 힘을 얻는 사람입니다.');
  assert.match(out[1].body, /^연애 고수가 말합니다\./);
  assert.match(out[1].body, /● 이 장의 근거\n일간 병화 — 따뜻한 불/);
  assert.match(out[1].body, /● 이번 장의 할 일\n- 먼저 안부를 묻는다/);
  assert.match(out[1].body, /● 첫 태도\n당신은 천천히 다가갑니다\./);
  assert.equal(MASTER_LOVE_CODEX_PDF_BYLINE, '연애 고수');
});

test('궁합판은 궁합 막 이름을 쓰고, 질문 답은 질문 문장을 소제목으로 싣는다', () => {
  const consultation = {referenceDate: '2026-11-08', questions: [{id: 'q1', text: '다시 연락해도 될까요?', chapterOrder: 1}], periods: [], years: []};
  const out = buildMasterLoveCodexPdfChapters({mode: 'compat', consultation, chapters: [{id: 'facing', order: 1, title: '마주 선 두 사람', body: '본문입니다.',
    content: {questionAnswers: [{questionId: 'q1', answer: '지금은 기다립니다.', reasoning: '흐름이 닫혀 있습니다.', outlook: '봄에 열립니다.', actions: ['한 줄 안부'], reassess: '3월에 다시 봅니다.'}]}}]});
  assert.equal(out[0].kicker, codexChapterKicker(1, 'compat'));
  assert.match(out[0].body, /^● 다시 연락해도 될까요\?\n지금은 기다립니다\./);
});

test('리더가 조판 PDF 를 먼저 쓰고 글꼴 실패에만 캡처로 되돌아가며, 보관함도 같은 리더를 쓴다', () => {
  const reader = fs.readFileSync('src/features/master-love-codex/components/CodexReader.tsx', 'utf8');
  const stored = fs.readFileSync('app/records/view/StoredReading.tsx', 'utf8');
  assert.match(reader, /buildMasterLoveCodexPdfChapters/);
  assert.match(reader, /summary: buildMasterLoveCodexPdfSummary\(\{ loveDna/);
  assert.match(reader, /exportConsultationBookPdf/);
  assert.match(reader, /coverTheme: "codex"/);
  assert.match(reader, /PdfFontError[\s\S]*exportResultPdf/);
  assert.match(stored, /CodexReader/);
  const chapter = fs.readFileSync('src/features/master-love-codex/components/CodexChapter.tsx', 'utf8');
  assert.match(chapter, /speakerChip/);
  assert.match(chapter, /open=\{forceVisible \|\| opening\}/);
});

test('요약 쪽은 유형 이름·요약과 연애 DNA 지표를 저장된 점수 그대로 따로 싣는다', () => {
  const loveDna = {typeName: '등불형', typeSummary: '천천히 켜집니다.', metrics: [{key: 'care', label: '돌봄', score: 82, basis: '정관'}, {key: 'jealousy', label: '질투', score: 41}]};
  const summary = buildMasterLoveCodexPdfSummary({loveDna, totalCharCount: 24800, chapterCount: 20});
  assert.equal(summary.title, '한눈에 보는 상담');
  assert.deepEqual([summary.figures[0].text, summary.figures[0].body, summary.figures[0].meta], ['등불형', '천천히 켜집니다.', ['20장', '24,800자']]);
  assert.deepEqual(summary.figures[1].rows, [{label: '돌봄', value: 82, note: '정관'}, {label: '질투', value: 41, note: ''}]);
  assert.equal(buildMasterLoveCodexPdfSummary({loveDna: null}), null);
});

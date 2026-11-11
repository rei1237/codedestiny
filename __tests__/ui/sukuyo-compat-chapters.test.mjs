import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const load = async (entry) => {
  const bundle = await build({entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', write: false, packages: 'external'});
  return import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
};
const {buildSukuyoCompatPdfChapters, buildSukuyoCompatPdfSummary, isSukuyoCompatChapterPlanV2, orderSukuyoCompatSections} = await load('lib/sukuyo/sukuyo-compat-chapters.ts');

const meta = {
  person_a: {name: '지우', sukuyo: '각숙'}, person_b: {name: '하린', sukuyo: '방숙'},
  relation: {type_a_to_b: '영친(親)', type_b_to_a: '영친(榮)', distance: 3, intensity: '중'},
  scores: {destiny: 18, harmony: 14, emotion: 16, growth: 15, stability: 12, total: 75},
  axes: {emotionBond: {score: 80}, conflictRisk: {score: 40, polarity: 'inverse'}},
};
const v2Sections = {
  twoStars: {title: '☽ 兩星 — 두 별의 본질', body: '**지우의 각숙**\n마음을 먼저 **읽는** 사람입니다.'},
  overview: {title: '☯ 總論 — 종합 궁합 총평', body: '서로를 키우는 인연입니다.'},
  attraction: {title: '✦ 引力 — 끌림의 구조', body: '눈빛이 먼저 닿습니다.'},
  caution: {title: '⚠ 禁忌 — 반드시 조심해야 할 패턴', body: ''},
  closingLetter: {title: '💌 一言 — 달빛이 전하는 한마디', body: '지우, 하린. 달은 늘 둘을 비춥니다.'},
};
const row = (sections, extra = {}) => ({...extra, messages: [{role: 'user', content: '우리 잘 맞을까요?'}, {role: 'assistant', content: JSON.stringify({meta, headline: '천천히 깊어지는 사이', insight: '**믿음**이 열쇠입니다.', scoreNotes: {emotionBond: '감정이 빨리 닿습니다'}, sections})}]});

test('판 2 궁합 PDF는 두 별의 본성 장부터 부 이름·서한비 표시를 달고 ** 와 빈 장을 걷는다', () => {
  const chapters = buildSukuyoCompatPdfChapters(row(v2Sections, {groupPlanVersion: 2}));
  assert.deepEqual(chapters.map((chapter) => chapter.title), ['두 별의 본질', '종합 궁합 총평', '끌림의 구조', '달빛이 전하는 한마디']);
  assert.equal(chapters[0].kicker, '1부 · 두 별의 본성');
  assert.equal(chapters[2].kicker, '2부 · 끌림과 마음의 방향');
  assert.equal(chapters[3].kicker, '5부 · 앞으로의 길');
  assert.ok(chapters.every((chapter) => chapter.speaker === '서한비' && !chapter.body.includes('**')));
  assert.equal(chapters[0].body, '● 지우의 각숙\n마음을 먼저 읽는 사람입니다.');
  // 보관함은 llmMeta를 걷으므로 판 2만 첫 장이 twoStars인 저장 순서로 판을 안다.
  assert.equal(buildSukuyoCompatPdfChapters(row(v2Sections))[0].kicker, '1부 · 두 별의 본성');
});

test('판 1 궁합은 저장 순서 그대로이고 부 이름이 없다(화면은 빈 장도 그대로)', () => {
  const v1 = {overview: v2Sections.overview, twoStars: v2Sections.twoStars, caution: v2Sections.caution};
  assert.equal(isSukuyoCompatChapterPlanV2(row(v1), v1), false);
  assert.equal(isSukuyoCompatChapterPlanV2({groupPlanVersion: 1}, v2Sections), false);
  assert.deepEqual(orderSukuyoCompatSections(v1, false).map((s) => [s.key, s.kicker]), [['overview', ''], ['twoStars', ''], ['caution', '']]);
  const chapters = buildSukuyoCompatPdfChapters(row(v1, {groupPlanVersion: 1}));
  assert.deepEqual(chapters.map((chapter) => chapter.title), ['종합 궁합 총평', '두 별의 본질']);
  assert.ok(chapters.every((chapter) => chapter.kicker === ''));
});

test('요약 쪽은 저장된 점수만 옮기고, 구조화되지 않은 답은 한 장·없으면 빈 목록', () => {
  const summary = buildSukuyoCompatPdfSummary(row(v2Sections));
  assert.deepEqual(summary.figures.map((figure) => figure.kind), ['lead', 'radar', 'bars']);
  assert.equal(summary.figures[0].text, '천천히 깊어지는 사이');
  assert.equal(summary.figures[0].body, '믿음이 열쇠입니다.');
  assert.deepEqual(summary.figures[1].axes.map((axis) => axis.score), [90, 70, 80, 75, 60]);
  assert.deepEqual(summary.figures[2].rows.map((r) => [r.value, r.note]), [[80, '감정이 빨리 닿습니다'], [40, undefined]]);
  assert.deepEqual(buildSukuyoCompatPdfChapters({messages: [{role: 'assistant', content: '각숙은 **곧은** 별입니다.'}]}).map((c) => [c.title, c.body]), [['숙요점 상담', '각숙은 곧은 별입니다.']]);
  assert.deepEqual(buildSukuyoCompatPdfChapters({messages: []}), []);
  assert.equal(buildSukuyoCompatPdfSummary({messages: []}), null);
});

test('조판 PDF는 글꼴에 없는 한자 풀이 괄호를 걷고 한글 읽기만 남긴다(본문·요약 모두)', async () => {
  const {typesetConsultationBook, stripPdfHanjaGloss} = await load('lib/pdf/export-consultation-book-pdf.ts');
  assert.equal(stripPdfHanjaGloss("'영(榮)'의 자리, 장숙 (張宿)과 상극(相剋)·영친(榮·親)"), "'영'의 자리, 장숙과 상극·영친");
  assert.equal(stripPdfHanjaGloss('(괄호 안 한글)은 그대로'), '(괄호 안 한글)은 그대로');
  const {jsPDF} = await import('jspdf');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const drawn = [];
  const text = pdf.text.bind(pdf);
  pdf.text = (value, ...rest) => { drawn.push([].concat(value).join('')); return text(value, ...rest); };
  const chapters = [{kicker: '1부', title: '두 별의 본질', body: "지우님은 '영(榮)'의 자리에 있습니다.", speaker: '서한비'}];
  typesetConsultationBook(pdf, {title: 'helvetica', body: 'helvetica'}, {title: 'T', productLabel: 'P', fileName: 'x.pdf', chapters, summary: buildSukuyoCompatPdfSummary(row(v2Sections))});
  const all = drawn.join('\n');
  assert.ok(!/[\u3400-\u9fff\uf900-\ufaff]/.test(all), all);
  assert.ok(!all.includes('()'));
});
